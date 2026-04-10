import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import AdminLayout from "@/components/AdminLayout";
import { apiRequest, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, Upload } from "lucide-react";
import type { PageManagerRecord } from "@/components/PageManagersPanel";
import { urlForPublicFsObject } from "@/config/env";
import {
  START_INTRO_DEFAULT_BODY,
  START_INTRO_DEFAULT_CTA_LABEL,
  START_INTRO_DEFAULT_TITLE,
  START_PAGE_SECTION_BLUEPRINT,
  START_PAGE_SLUG,
  normalizeStartSections,
  parseStartIntroContent,
  serializeStartIntroContent,
  type StartIntroPayload,
  type StartPageSection,
} from "@/config/startPageContent";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function buildPublicAssetsImageKey(originalName: string): string {
  const extMatch = originalName.match(/(\.[a-zA-Z0-9]{1,8})$/);
  const ext = extMatch ? extMatch[1].toLowerCase() : "";
  const base =
    originalName
      .replace(/(\.[a-zA-Z0-9]{1,8})$/, "")
      .replace(/[^a-zA-Z0-9_-]+/g, "_")
      .slice(0, 80) || "image";
  const now = new Date();
  const suffix = `${now.getFullYear()}_${pad2(now.getMonth() + 1)}_${pad2(now.getDate())}_${pad2(now.getHours())}_${pad2(now.getMinutes())}_${pad2(now.getSeconds())}`;
  return `public_assets/${base}__${suffix}${ext}`;
}

function parsePublicAssetsKeyForDownload(
  s3Key: string
): { userBucket: string; objectKey: string } | null {
  if (!s3Key.startsWith("public_assets/")) return null;
  const objectKey = s3Key.slice("public_assets/".length);
  if (!objectKey || objectKey.includes("/")) return null;
  return { userBucket: "public_assets", objectKey };
}

async function uploadFileToFs(key: string, file: File): Promise<void> {
  const res = await apiRequest("/fs/upload-url", {
    method: "POST",
    body: JSON.stringify({ key, validity: 600 }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || res.statusText);
  }
  const data = (await res.json()) as { url?: string };
  if (!data.url) throw new Error("No upload URL returned");
  const put = await fetch(data.url, {
    method: "PUT",
    body: file,
    headers: file.type ? { "Content-Type": file.type } : {},
  });
  if (!put.ok) throw new Error("S3 upload failed");
}

function PublicAssetsImageThumb({ s3Key, className }: { s3Key: string; className?: string }) {
  const directUrl = urlForPublicFsObject(s3Key);
  const [src, setSrc] = useState<string | null>(() => directUrl);
  useEffect(() => {
    if (directUrl) {
      setSrc(directUrl);
      return;
    }
    let cancelled = false;
    const parsed = parsePublicAssetsKeyForDownload(s3Key);
    if (!parsed) return;
    (async () => {
      const res = await apiRequest(
        `/fs/download-url/${encodeURIComponent(parsed.userBucket)}/${encodeURIComponent(parsed.objectKey)}`
      );
      if (!res.ok || cancelled) return;
      const j = (await res.json()) as { url?: string };
      if (!cancelled && j.url) setSrc(j.url);
    })();
    return () => {
      cancelled = true;
    };
  }, [s3Key, directUrl]);
  if (!src) {
    return (
      <div
        className={cn("h-14 w-28 shrink-0 rounded border bg-muted animate-pulse", className)}
        aria-hidden
      />
    );
  }
  return (
    <img
      src={src}
      alt=""
      className={cn("h-14 w-28 shrink-0 rounded border object-contain bg-white", className)}
    />
  );
}

function StartIntroSectionFields({
  payload,
  onUpdate,
}: {
  payload: StartIntroPayload;
  onUpdate: (updater: (prev: StartIntroPayload) => StartIntroPayload) => void;
}) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Not an image",
        description: "Please choose an image file.",
        variant: "destructive",
      });
      return;
    }
    setUploading(true);
    try {
      const key = buildPublicAssetsImageKey(file.name);
      await uploadFileToFs(key, file);
      onUpdate((prev) => ({ ...prev, imageKey: key }));
      toast({ title: "Image uploaded" });
    } catch (err) {
      toast({
        title: "Upload failed",
        description: err instanceof Error ? err.message : "Could not upload file.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="space-y-2">
        <Label htmlFor="start-intro-title">Title</Label>
        <Input
          id="start-intro-title"
          value={payload.title}
          onChange={(e) => onUpdate((prev) => ({ ...prev, title: e.target.value }))}
          placeholder={START_INTRO_DEFAULT_TITLE}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="start-intro-body">Body</Label>
        <Textarea
          id="start-intro-body"
          value={payload.body}
          onChange={(e) => onUpdate((prev) => ({ ...prev, body: e.target.value }))}
          placeholder={START_INTRO_DEFAULT_BODY}
          rows={8}
          className="min-h-[160px] resize-y"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="start-intro-cta">Call to action</Label>
        <Input
          id="start-intro-cta"
          value={payload.ctaLabel}
          onChange={(e) => onUpdate((prev) => ({ ...prev, ctaLabel: e.target.value }))}
          placeholder={START_INTRO_DEFAULT_CTA_LABEL}
        />
      </div>
      <div className="space-y-2">
        <Label>Image</Label>
        <p className="text-xs text-muted-foreground">
          Replaces the default illustration on <code className="text-foreground">/register</code>. Stored
          under <code className="text-foreground">public_assets/</code>.
        </p>
        <div className="flex flex-wrap items-start gap-4">
          {payload.imageKey ? (
            <PublicAssetsImageThumb
              s3Key={payload.imageKey}
              className="h-40 w-full max-w-sm rounded-lg object-cover"
            />
          ) : (
            <div className="flex h-40 w-full max-w-sm items-center justify-center rounded-lg border border-dashed border-muted-foreground/30 bg-muted/30 px-4 text-center text-xs text-muted-foreground">
              No custom image — the site uses the bundled default (collaboration) photo.
            </div>
          )}
          <div className="flex flex-col gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {uploading ? "Uploading…" : payload.imageKey ? "Replace image" : "Upload image"}
            </Button>
            {payload.imageKey ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground"
                onClick={() => onUpdate((prev) => ({ ...prev, imageKey: "" }))}
              >
                Use default image
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

const StartPageEditor: React.FC = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [record, setRecord] = useState<PageManagerRecord | null>(null);
  const [sections, setSections] = useState<StartPageSection[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiRequest("/utils/page-managers?limit=200&offset=0");
      if (!res.ok) throw new Error(await res.text());
      const list = (await res.json()) as PageManagerRecord[];
      const row = list.find((p) => p.name === START_PAGE_SLUG);
      if (!row) {
        toast({
          title: "Start page not found",
          description: "Open Content → Pages once to create fixed pages, then try again.",
          variant: "destructive",
        });
        setRecord(null);
        setSections(normalizeStartSections(null));
        return;
      }
      setRecord(row);
      setSections(normalizeStartSections(row.sections as StartPageSection[]));
    } catch {
      toast({
        title: "Error",
        description: "Could not load start page.",
        variant: "destructive",
      });
      setRecord(null);
      setSections(normalizeStartSections(null));
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const updateIntro = useCallback(
    (index: number, updater: (prev: StartIntroPayload) => StartIntroPayload) => {
      setSections((prev) =>
        prev.map((s, i) => {
          if (i !== index || s.name !== "Intro") return s;
          const next = updater(parseStartIntroContent(s.fields));
          return { ...s, fields: serializeStartIntroContent(next) };
        })
      );
    },
    []
  );

  const save = async () => {
    if (!record) return;
    setSaving(true);
    try {
      const res = await apiRequest(`/utils/page-manager/${record.id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: START_PAGE_SLUG,
          sections: sections.map((s) => ({ ...s, active: true })),
          meta: record.meta ?? {},
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({
          title: "Save failed",
          description: (body as { message?: string }).message || res.statusText,
          variant: "destructive",
        });
        return;
      }
      const updated = body as PageManagerRecord;
      setRecord(updated);
      setSections(normalizeStartSections(updated.sections as StartPageSection[]));
      toast({ title: "Saved", description: "Start page updated." });
    } catch {
      toast({ title: "Save failed", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const introIndex = 0;
  const introSection = sections[introIndex];
  const introPayload =
    introSection?.name === "Intro" ? parseStartIntroContent(introSection.fields) : null;

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-4xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <Button variant="ghost" size="sm" className="mb-2 -ml-2 text-muted-foreground" asChild>
              <Link to="/content/pages">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to pages
              </Link>
            </Button>
            <h1 className="text-3xl font-bold text-[#000009]">Start page</h1>
            <p className="text-gray-600 text-sm max-w-xl">
              Content for <code className="text-xs bg-muted px-1 rounded">/register</code> before the
              registration form. This block is always shown when the page loads.
            </p>
          </div>
          <Button
            type="button"
            onClick={save}
            disabled={saving || loading || !record}
            className="bg-[#712B71] hover:bg-[#5a225c] text-white shrink-0"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving…
              </>
            ) : (
              "Save changes"
            )}
          </Button>
        </div>

        <Separator />

        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground py-12">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading start page…
          </div>
        ) : !record || !introSection || !introPayload ? (
          <p className="text-muted-foreground py-8">
            No start page record.{" "}
            <Link to="/content/pages" className="text-[#712B71] underline">
              Return to Pages
            </Link>{" "}
            to initialise fixed pages.
          </p>
        ) : (
          <Card className="shadow-md border-l-4 border-l-[#712B71]">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl text-[#000009]">
                {START_PAGE_SECTION_BLUEPRINT[0].name}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <StartIntroSectionFields
                payload={introPayload}
                onUpdate={(updater) => updateIntro(introIndex, updater)}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
};

export default StartPageEditor;
