import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import AdminLayout from "@/components/AdminLayout";
import { apiRequest, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowLeft, GripVertical, Loader2, Plus, Trash2, Upload } from "lucide-react";
import type { PageManagerRecord } from "@/components/PageManagersPanel";
import { urlForPublicFsObject } from "@/config/env";
import { SECTOR_BUILTIN_ICONS, getSectorBuiltinIconSrc } from "@/config/sectorBuiltinIcons";
import {
  ABOUT_US_DEFAULT_CTA,
  ABOUT_US_DEFAULT_TITLE,
  CONTACT_INFO_DEFAULT_CTA,
  HERO_CONTENT_DEFAULTS,
  LANDING_PAGE_SECTION_BLUEPRINT,
  LANDING_PAGE_SLUG,
  PROCESS_FLOW_DEFAULT_TITLE,
  SECTORS_SECTION_DEFAULT_TITLE,
  createEmptyProcessFlowStep,
  createEmptySectorEntry,
  normalizeLandingSections,
  parseAboutUsContent,
  parseContactInfoContent,
  parseHeroContent,
  parsePartnerLogosContent,
  parseProcessFlowContent,
  parseSectorsContent,
  serializeAboutUsContent,
  serializeContactInfoContent,
  serializeHeroContent,
  serializePartnerLogosContent,
  serializeProcessFlowContent,
  serializeSectorsContent,
  type AboutUsContentPayload,
  type ContactInfoContentPayload,
  type HeroContentPayload,
  type PageManagerSection,
  type PartnerLogosContentPayload,
  type ProcessFlowContentPayload,
  type ProcessFlowStep,
  type SectorEntry,
  type SectorsContentPayload,
} from "@/config/landingPageContent";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

/** S3 object key: `public_assets/<safeBase>__<timestamp>.<ext>` */
function buildPublicAssetsImageKey(originalName: string): string {
  const extMatch = originalName.match(/(\.[a-zA-Z0-9]{1,8})$/);
  const ext = extMatch ? extMatch[1].toLowerCase() : "";
  const base =
    originalName
      .replace(/(\.[a-zA-Z0-9]{1,8})$/, "")
      .replace(/[^a-zA-Z0-9_-]+/g, "_")
      .slice(0, 80) || "logo";
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

function SectorThumbnailPreview({ sector, className }: { sector: SectorEntry; className?: string }) {
  if (sector.thumbnailKey) {
    return <PublicAssetsImageThumb s3Key={sector.thumbnailKey} />;
  }
  const built = getSectorBuiltinIconSrc(sector.builtinIconId);
  if (built) {
    return (
      <img
        src={built}
        alt=""
        className={cn("h-14 w-14 shrink-0 rounded border object-contain bg-white", className)}
      />
    );
  }
  return (
    <div
      className={cn(
        "flex h-14 w-14 shrink-0 items-center justify-center rounded border border-dashed bg-muted/40 p-1 text-center text-[10px] text-muted-foreground",
        className
      )}
      aria-hidden
    >
      No image
    </div>
  );
}

function SortablePartnerLogoRow({
  logoKey,
  onRemove,
}: {
  logoKey: string;
  onRemove: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: logoKey });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-3 rounded-lg border border-[#712B71]/20 bg-white px-3 py-2 shadow-sm",
        isDragging && "z-10 opacity-90 shadow-md ring-2 ring-[#45f0df]"
      )}
    >
      <button
        type="button"
        className="touch-none text-muted-foreground hover:text-[#000009] cursor-grab active:cursor-grabbing p-1 rounded-md hover:bg-muted shrink-0"
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-5 w-5" />
      </button>
      <PublicAssetsImageThumb s3Key={logoKey} />
      <div className="flex-1 min-w-0" />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="shrink-0 text-destructive hover:text-destructive"
        aria-label="Remove logo"
        onClick={onRemove}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

type PartnerLogosSectionFieldsProps = {
  payload: PartnerLogosContentPayload;
  onUpdate: (updater: (prev: PartnerLogosContentPayload) => PartnerLogosContentPayload) => void;
};

function PartnerLogosSectionFields({ payload, onUpdate }: PartnerLogosSectionFieldsProps) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    onUpdate((prev) => {
      const oldIndex = prev.logos.findIndex((l) => l.key === active.id);
      const newIndex = prev.logos.findIndex((l) => l.key === over.id);
      if (oldIndex < 0 || newIndex < 0) return prev;
      return { ...prev, logos: arrayMove(prev.logos, oldIndex, newIndex) };
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files;
    if (!list?.length) return;
    setUploading(true);
    try {
      const newKeys: string[] = [];
      for (const file of Array.from(list)) {
        if (!file.type.startsWith("image/")) {
          toast({
            title: "Skipped non-image",
            description: `${file.name} is not an image.`,
            variant: "destructive",
          });
          continue;
        }
        const key = buildPublicAssetsImageKey(file.name);
        await uploadFileToFs(key, file);
        newKeys.push(key);
      }
      if (newKeys.length) {
        onUpdate((prev) => ({ ...prev, logos: [...prev.logos, ...newKeys.map((key) => ({ key }))] }));
        toast({ title: "Uploaded", description: `${newKeys.length} logo(s) added.` });
      }
    } catch (err) {
      toast({
        title: "Upload failed",
        description: err instanceof Error ? err.message : "Could not upload file.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6 max-w-xl">
      <div className="space-y-2">
        <Label htmlFor="partner-logos-title">Section title</Label>
        <Input
          id="partner-logos-title"
          value={payload.title}
          onChange={(e) => onUpdate((prev) => ({ ...prev, title: e.target.value }))}
          placeholder="e.g. Our partners"
        />
      </div>
      <div className="space-y-2">
        <Label>Logos</Label>
        <p className="text-xs text-muted-foreground">
          Images are stored under the <code className="text-foreground">public_assets/</code> prefix. Drag rows to
          change order.
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          id="partner-logos-upload"
          onChange={handleFileChange}
        />
        <Button
          type="button"
          variant="outline"
          className="gap-2"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          {uploading ? "Uploading…" : "Select images"}
        </Button>
      </div>
      {payload.logos.length > 0 ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext
            items={payload.logos.map((l) => l.key)}
            strategy={verticalListSortingStrategy}
          >
            <ul className="space-y-2 list-none p-0 m-0">
              {payload.logos.map((l) => (
                <li key={l.key}>
                  <SortablePartnerLogoRow
                    logoKey={l.key}
                    onRemove={() =>
                      onUpdate((prev) => ({
                        ...prev,
                        logos: prev.logos.filter((x) => x.key !== l.key),
                      }))
                    }
                  />
                </li>
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      ) : (
        <p className="text-sm text-muted-foreground border border-dashed rounded-lg px-4 py-6 text-center">
          No logos yet. Use <strong className="text-foreground">Select images</strong> to upload.
        </p>
      )}
    </div>
  );
}

function SortableProcessStepRow({
  step,
  uploadingThumb,
  onTitleChange,
  onRemove,
  onPickThumbnail,
}: {
  step: ProcessFlowStep;
  uploadingThumb: boolean;
  onTitleChange: (title: string) => void;
  onRemove: () => void;
  onPickThumbnail: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: step.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "rounded-lg border border-[#712B71]/20 bg-white p-3 shadow-sm",
        isDragging && "z-10 opacity-90 shadow-md ring-2 ring-[#45f0df]"
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <button
          type="button"
          className="touch-none text-muted-foreground hover:text-[#000009] cursor-grab active:cursor-grabbing p-1 rounded-md hover:bg-muted shrink-0 self-start sm:mt-2"
          aria-label="Drag to reorder"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-5 w-5" />
        </button>
        <div className="flex flex-col items-center gap-2 shrink-0">
          {step.thumbnailKey ? (
            <PublicAssetsImageThumb s3Key={step.thumbnailKey} />
          ) : (
            <div
              className="flex h-14 w-28 items-center justify-center rounded border border-dashed bg-muted/40 px-1 text-center text-xs text-muted-foreground"
              aria-hidden
            >
              No image
            </div>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 w-full text-xs"
            disabled={uploadingThumb}
            onClick={onPickThumbnail}
          >
            {uploadingThumb ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : step.thumbnailKey ? (
              "Change image"
            ) : (
              "Upload image"
            )}
          </Button>
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="space-y-1">
            <Label className="text-xs">Step title</Label>
            <Input
              value={step.title}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="e.g. Submit application"
            />
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0 self-start text-destructive hover:text-destructive sm:mt-6"
          aria-label="Remove step"
          onClick={onRemove}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

type ProcessFlowSectionFieldsProps = {
  payload: ProcessFlowContentPayload;
  onUpdate: (updater: (prev: ProcessFlowContentPayload) => ProcessFlowContentPayload) => void;
};

function ProcessFlowSectionFields({ payload, onUpdate }: ProcessFlowSectionFieldsProps) {
  const { toast } = useToast();
  const thumbInputRef = useRef<HTMLInputElement>(null);
  const pendingThumbStepIdRef = useRef<string | null>(null);
  const [uploadingStepId, setUploadingStepId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    onUpdate((prev) => {
      const oldIndex = prev.steps.findIndex((s) => s.id === active.id);
      const newIndex = prev.steps.findIndex((s) => s.id === over.id);
      if (oldIndex < 0 || newIndex < 0) return prev;
      return { ...prev, steps: arrayMove(prev.steps, oldIndex, newIndex) };
    });
  };

  const openThumbPicker = (stepId: string) => {
    pendingThumbStepIdRef.current = stepId;
    thumbInputRef.current?.click();
  };

  const handleThumbFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const stepId = pendingThumbStepIdRef.current;
    const file = e.target.files?.[0];
    pendingThumbStepIdRef.current = null;
    if (!stepId || !file) {
      if (thumbInputRef.current) thumbInputRef.current.value = "";
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Not an image",
        description: "Please choose an image file.",
        variant: "destructive",
      });
      if (thumbInputRef.current) thumbInputRef.current.value = "";
      return;
    }
    setUploadingStepId(stepId);
    try {
      const key = buildPublicAssetsImageKey(file.name);
      await uploadFileToFs(key, file);
      onUpdate((prev) => ({
        ...prev,
        steps: prev.steps.map((s) => (s.id === stepId ? { ...s, thumbnailKey: key } : s)),
      }));
      toast({ title: "Image uploaded" });
    } catch (err) {
      toast({
        title: "Upload failed",
        description: err instanceof Error ? err.message : "Could not upload file.",
        variant: "destructive",
      });
    } finally {
      setUploadingStepId(null);
      if (thumbInputRef.current) thumbInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="space-y-2">
        <Label htmlFor="process-flow-title">Section title</Label>
        <Input
          id="process-flow-title"
          value={payload.title}
          onChange={(e) => onUpdate((prev) => ({ ...prev, title: e.target.value }))}
          placeholder={PROCESS_FLOW_DEFAULT_TITLE}
        />
        <p className="text-xs text-muted-foreground">Shown above the process steps on the site.</p>
      </div>
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label>Steps</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={() =>
              onUpdate((prev) => ({
                ...prev,
                steps: [...prev.steps, createEmptyProcessFlowStep()],
              }))
            }
          >
            <Plus className="h-4 w-4" />
            Add step
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Each step has a title and thumbnail stored under{" "}
          <code className="text-foreground">public_assets/</code>. Drag the handle to reorder.
        </p>
        <input
          ref={thumbInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleThumbFile}
        />
      </div>
      {payload.steps.length > 0 ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={payload.steps.map((s) => s.id)} strategy={verticalListSortingStrategy}>
            <ul className="m-0 list-none space-y-3 p-0">
              {payload.steps.map((step) => (
                <li key={step.id}>
                  <SortableProcessStepRow
                    step={step}
                    uploadingThumb={uploadingStepId === step.id}
                    onTitleChange={(title) =>
                      onUpdate((prev) => ({
                        ...prev,
                        steps: prev.steps.map((s) => (s.id === step.id ? { ...s, title } : s)),
                      }))
                    }
                    onRemove={() =>
                      onUpdate((prev) => ({
                        ...prev,
                        steps: prev.steps.filter((s) => s.id !== step.id),
                      }))
                    }
                    onPickThumbnail={() => openThumbPicker(step.id)}
                  />
                </li>
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      ) : (
        <p className="text-sm text-muted-foreground border border-dashed rounded-lg px-4 py-6 text-center">
          No steps yet. Use <strong className="text-foreground">Add step</strong> to create one.
        </p>
      )}
    </div>
  );
}

const SECTOR_ICON_SELECT_NONE = "__none__";

function SortableSectorRow({
  sector,
  uploadingThumb,
  onTitleChange,
  onDescriptionChange,
  onBuiltinIconChange,
  onRemove,
  onPickThumbnail,
  onClearCustomThumbnail,
}: {
  sector: SectorEntry;
  uploadingThumb: boolean;
  onTitleChange: (title: string) => void;
  onDescriptionChange: (description: string) => void;
  onBuiltinIconChange: (builtinIconId: string) => void;
  onRemove: () => void;
  onPickThumbnail: () => void;
  onClearCustomThumbnail: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: sector.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "rounded-lg border border-[#712B71]/20 bg-white p-3 shadow-sm",
        isDragging && "z-10 opacity-90 shadow-md ring-2 ring-[#45f0df]"
      )}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <button
          type="button"
          className="touch-none shrink-0 self-start rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-[#000009] cursor-grab active:cursor-grabbing lg:mt-2"
          aria-label="Drag to reorder"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-5 w-5" />
        </button>
        <div className="flex shrink-0 flex-col items-center gap-2">
          <SectorThumbnailPreview sector={sector} />
          <div className="flex w-full max-w-[8.5rem] flex-col gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              disabled={uploadingThumb}
              onClick={onPickThumbnail}
            >
              {uploadingThumb ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : sector.thumbnailKey ? (
                "Change upload"
              ) : (
                "Upload image"
              )}
            </Button>
            {sector.thumbnailKey ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground"
                onClick={onClearCustomThumbnail}
              >
                Use built-in only
              </Button>
            ) : null}
          </div>
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Title</Label>
            <Input
              value={sector.title}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="Sector name"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Description</Label>
            <Textarea
              value={sector.description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              placeholder="Short paragraph"
              rows={3}
              className="min-h-[72px] resize-y"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Built-in icon</Label>
            <Select
              value={sector.builtinIconId || SECTOR_ICON_SELECT_NONE}
              onValueChange={(v) => onBuiltinIconChange(v === SECTOR_ICON_SELECT_NONE ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SECTOR_ICON_SELECT_NONE}>None</SelectItem>
                {SECTOR_BUILTIN_ICONS.map((opt) => (
                  <SelectItem key={opt.id} value={opt.id}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              A custom upload replaces the built-in icon until you choose “Use built-in only”.
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0 self-start text-destructive hover:text-destructive lg:mt-8"
          aria-label="Remove sector"
          onClick={onRemove}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function SectorsSectionFields({
  payload,
  onUpdate,
}: {
  payload: SectorsContentPayload;
  onUpdate: (updater: (prev: SectorsContentPayload) => SectorsContentPayload) => void;
}) {
  const { toast } = useToast();
  const thumbInputRef = useRef<HTMLInputElement>(null);
  const pendingThumbSectorIdRef = useRef<string | null>(null);
  const [uploadingSectorId, setUploadingSectorId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    onUpdate((prev) => {
      const oldIndex = prev.sectors.findIndex((s) => s.id === active.id);
      const newIndex = prev.sectors.findIndex((s) => s.id === over.id);
      if (oldIndex < 0 || newIndex < 0) return prev;
      return { ...prev, sectors: arrayMove(prev.sectors, oldIndex, newIndex) };
    });
  };

  const openThumbPicker = (sectorId: string) => {
    pendingThumbSectorIdRef.current = sectorId;
    thumbInputRef.current?.click();
  };

  const handleThumbFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const sectorId = pendingThumbSectorIdRef.current;
    const file = e.target.files?.[0];
    pendingThumbSectorIdRef.current = null;
    if (!sectorId || !file) {
      if (thumbInputRef.current) thumbInputRef.current.value = "";
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Not an image",
        description: "Please choose an image file.",
        variant: "destructive",
      });
      if (thumbInputRef.current) thumbInputRef.current.value = "";
      return;
    }
    setUploadingSectorId(sectorId);
    try {
      const key = buildPublicAssetsImageKey(file.name);
      await uploadFileToFs(key, file);
      onUpdate((prev) => ({
        ...prev,
        sectors: prev.sectors.map((s) => (s.id === sectorId ? { ...s, thumbnailKey: key } : s)),
      }));
      toast({ title: "Image uploaded" });
    } catch (err) {
      toast({
        title: "Upload failed",
        description: err instanceof Error ? err.message : "Could not upload file.",
        variant: "destructive",
      });
    } finally {
      setUploadingSectorId(null);
      if (thumbInputRef.current) thumbInputRef.current.value = "";
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div className="space-y-2">
        <Label htmlFor="sectors-section-title">Section title</Label>
        <Input
          id="sectors-section-title"
          value={payload.title}
          onChange={(e) => onUpdate((prev) => ({ ...prev, title: e.target.value }))}
          placeholder={SECTORS_SECTION_DEFAULT_TITLE}
        />
        <p className="text-xs text-muted-foreground">Shown above the sector cards on the site.</p>
      </div>
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label>Sectors</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={() =>
              onUpdate((prev) => ({
                ...prev,
                sectors: [...prev.sectors, createEmptySectorEntry()],
              }))
            }
          >
            <Plus className="h-4 w-4" />
            Add sector
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Each sector has a title, description, optional built-in icon from the marketing site, and an optional custom
          image in <code className="text-foreground">public_assets/</code>. Drag to reorder.
        </p>
        <input
          ref={thumbInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleThumbFile}
        />
      </div>
      {payload.sectors.length > 0 ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={payload.sectors.map((s) => s.id)} strategy={verticalListSortingStrategy}>
            <ul className="m-0 list-none space-y-3 p-0">
              {payload.sectors.map((sector) => (
                <li key={sector.id}>
                  <SortableSectorRow
                    sector={sector}
                    uploadingThumb={uploadingSectorId === sector.id}
                    onTitleChange={(title) =>
                      onUpdate((prev) => ({
                        ...prev,
                        sectors: prev.sectors.map((s) => (s.id === sector.id ? { ...s, title } : s)),
                      }))
                    }
                    onDescriptionChange={(description) =>
                      onUpdate((prev) => ({
                        ...prev,
                        sectors: prev.sectors.map((s) => (s.id === sector.id ? { ...s, description } : s)),
                      }))
                    }
                    onBuiltinIconChange={(builtinIconId) =>
                      onUpdate((prev) => ({
                        ...prev,
                        sectors: prev.sectors.map((s) => (s.id === sector.id ? { ...s, builtinIconId } : s)),
                      }))
                    }
                    onRemove={() =>
                      onUpdate((prev) => ({
                        ...prev,
                        sectors: prev.sectors.filter((s) => s.id !== sector.id),
                      }))
                    }
                    onPickThumbnail={() => openThumbPicker(sector.id)}
                    onClearCustomThumbnail={() =>
                      onUpdate((prev) => ({
                        ...prev,
                        sectors: prev.sectors.map((s) =>
                          s.id === sector.id ? { ...s, thumbnailKey: "" } : s
                        ),
                      }))
                    }
                  />
                </li>
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      ) : (
        <p className="text-sm text-muted-foreground border border-dashed rounded-lg px-4 py-6 text-center">
          No sectors yet. Use <strong className="text-foreground">Add sector</strong> to create one.
        </p>
      )}
    </div>
  );
}

function AboutUsSectionFields({
  payload,
  onUpdate,
}: {
  payload: AboutUsContentPayload;
  onUpdate: (updater: (prev: AboutUsContentPayload) => AboutUsContentPayload) => void;
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
        <Label htmlFor="about-us-title">Title</Label>
        <Input
          id="about-us-title"
          value={payload.title}
          onChange={(e) => onUpdate((prev) => ({ ...prev, title: e.target.value }))}
          placeholder={ABOUT_US_DEFAULT_TITLE}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="about-us-body">Body</Label>
        <Textarea
          id="about-us-body"
          value={payload.body}
          onChange={(e) => onUpdate((prev) => ({ ...prev, body: e.target.value }))}
          placeholder="Main paragraph"
          rows={8}
          className="min-h-[160px] resize-y"
        />
      </div>
      <div className="space-y-2">
        <Label>Image</Label>
        <p className="text-xs text-muted-foreground">
          Upload replaces the default collaboration image on the site. Stored under{" "}
          <code className="text-foreground">public_assets/</code>.
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
      <div className="space-y-2">
        <Label htmlFor="about-us-cta">Call to action</Label>
        <Input
          id="about-us-cta"
          value={payload.ctaLabel}
          onChange={(e) => onUpdate((prev) => ({ ...prev, ctaLabel: e.target.value }))}
          placeholder={ABOUT_US_DEFAULT_CTA}
        />
      </div>
    </div>
  );
}

function ContactInfoSectionFields({
  payload,
  onUpdate,
}: {
  payload: ContactInfoContentPayload;
  onUpdate: (updater: (prev: ContactInfoContentPayload) => ContactInfoContentPayload) => void;
}) {
  return (
    <div className="max-w-2xl space-y-6">
      <div className="space-y-2">
        <Label htmlFor="contact-info-title">Title</Label>
        <Input
          id="contact-info-title"
          value={payload.title}
          onChange={(e) => onUpdate((prev) => ({ ...prev, title: e.target.value }))}
          placeholder="e.g. Contact us"
        />
        <p className="text-xs text-muted-foreground">
          Shown as the main heading above the contact and footer area. Leave empty to hide.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="contact-info-description">Description</Label>
        <Textarea
          id="contact-info-description"
          value={payload.description}
          onChange={(e) => onUpdate((prev) => ({ ...prev, description: e.target.value }))}
          placeholder="Company introduction (use a blank line between paragraphs)"
          rows={8}
          className="min-h-[160px] resize-y"
        />
        <p className="text-xs text-muted-foreground">
          Shown next to the logo in the contact/footer area. Line breaks are preserved on the site.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="contact-info-cta">Call to action</Label>
        <Input
          id="contact-info-cta"
          value={payload.ctaLabel}
          onChange={(e) => onUpdate((prev) => ({ ...prev, ctaLabel: e.target.value }))}
          placeholder={CONTACT_INFO_DEFAULT_CTA}
        />
      </div>
    </div>
  );
}

const LandingPageEditor: React.FC = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [record, setRecord] = useState<PageManagerRecord | null>(null);
  const [sections, setSections] = useState<PageManagerSection[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiRequest("/utils/page-managers?limit=200&offset=0");
      if (!res.ok) throw new Error(await res.text());
      const list = (await res.json()) as PageManagerRecord[];
      const row = list.find((p) => p.name === LANDING_PAGE_SLUG);
      if (!row) {
        toast({
          title: "Landing page not found",
          description: "Open Content → Pages once to create fixed pages, then try again.",
          variant: "destructive",
        });
        setRecord(null);
        setSections(normalizeLandingSections(null));
        return;
      }
      setRecord(row);
      setSections(normalizeLandingSections(row.sections as PageManagerSection[]));
    } catch {
      toast({
        title: "Error",
        description: "Could not load landing page.",
        variant: "destructive",
      });
      setRecord(null);
      setSections(normalizeLandingSections(null));
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const updateSection = (index: number, patch: Partial<PageManagerSection>) => {
    setSections((prev) =>
      prev.map((s, i) => (i === index ? { ...s, ...patch } : s))
    );
  };

  const updateHero = (index: number, patch: Partial<HeroContentPayload>) => {
    setSections((prev) =>
      prev.map((s, i) => {
        if (i !== index || s.name !== "Hero") return s;
        const next = { ...parseHeroContent(s.fields), ...patch };
        return { ...s, fields: serializeHeroContent(next) };
      })
    );
  };

  const updatePartnerLogos = useCallback(
    (index: number, updater: (prev: PartnerLogosContentPayload) => PartnerLogosContentPayload) => {
      setSections((prev) =>
        prev.map((s, i) => {
          if (i !== index || s.name !== "Partner Logos") return s;
          const next = updater(parsePartnerLogosContent(s.fields));
          return { ...s, fields: serializePartnerLogosContent(next) };
        })
      );
    },
    []
  );

  const updateProcessFlow = useCallback(
    (index: number, updater: (prev: ProcessFlowContentPayload) => ProcessFlowContentPayload) => {
      setSections((prev) =>
        prev.map((s, i) => {
          if (i !== index || s.name !== "Process Flow") return s;
          const next = updater(parseProcessFlowContent(s.fields));
          return { ...s, fields: serializeProcessFlowContent(next) };
        })
      );
    },
    []
  );

  const updateSectors = useCallback(
    (index: number, updater: (prev: SectorsContentPayload) => SectorsContentPayload) => {
      setSections((prev) =>
        prev.map((s, i) => {
          if (i !== index || s.name !== "Sectors") return s;
          const next = updater(parseSectorsContent(s.fields));
          return { ...s, fields: serializeSectorsContent(next) };
        })
      );
    },
    []
  );

  const updateAboutUs = useCallback(
    (index: number, updater: (prev: AboutUsContentPayload) => AboutUsContentPayload) => {
      setSections((prev) =>
        prev.map((s, i) => {
          if (i !== index || s.name !== "About Us") return s;
          const next = updater(parseAboutUsContent(s.fields));
          return { ...s, fields: serializeAboutUsContent(next) };
        })
      );
    },
    []
  );

  const updateContactInfo = useCallback(
    (index: number, updater: (prev: ContactInfoContentPayload) => ContactInfoContentPayload) => {
      setSections((prev) =>
        prev.map((s, i) => {
          if (i !== index || s.name !== "Contact Info") return s;
          const next = updater(parseContactInfoContent(s.fields));
          return { ...s, fields: serializeContactInfoContent(next) };
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
          name: LANDING_PAGE_SLUG,
          sections,
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
      setSections(normalizeLandingSections(updated.sections as PageManagerSection[]));
      toast({ title: "Saved", description: "Landing page content updated." });
    } catch {
      toast({ title: "Save failed", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

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
            <h1 className="text-3xl font-bold text-[#000009]">Landing page</h1>
            <p className="text-gray-600 text-sm max-w-xl">
              Edit each section below. Use the switch to show or hide a section on the site.
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
            Loading landing page…
          </div>
        ) : !record ? (
          <p className="text-muted-foreground py-8">
            No landing page record.{" "}
            <Link to="/content/pages" className="text-[#712B71] underline">
              Return to Pages
            </Link>{" "}
            to initialise fixed pages.
          </p>
        ) : (
          <div className="space-y-6">
            {LANDING_PAGE_SECTION_BLUEPRINT.map((blueprint, index) => {
              const section = sections[index];
              if (!section || section.name !== blueprint.name) return null;
              const isHero = section.name === "Hero";
              const isPartnerLogos = section.name === "Partner Logos";
              const isProcessFlow = section.name === "Process Flow";
              const isSectors = section.name === "Sectors";
              const isAboutUs = section.name === "About Us";
              const isContactInfo = section.name === "Contact Info";
              const hero = isHero ? parseHeroContent(section.fields) : null;
              const partnerLogos = isPartnerLogos ? parsePartnerLogosContent(section.fields) : null;
              const processFlow = isProcessFlow ? parseProcessFlowContent(section.fields) : null;
              const sectors = isSectors ? parseSectorsContent(section.fields) : null;
              const aboutUs = isAboutUs ? parseAboutUsContent(section.fields) : null;
              const contactInfo = isContactInfo ? parseContactInfoContent(section.fields) : null;
              const fieldCount = Array.isArray(section.fields) ? section.fields.length : 0;

              return (
                <Card key={section.name} className="shadow-md border-l-4 border-l-[#712B71]">
                  <CardHeader className="flex flex-row items-start justify-between space-y-0 gap-4 pb-2">
                    <div>
                      <CardTitle className="text-xl text-[#000009]">{section.name}</CardTitle>
                      {/* <CardDescription>
                        Section {index + 1} of {LANDING_PAGE_SECTION_BLUEPRINT.length}
                        {isHero
                          ? " · Title, Sub Title, primary & secondary CTAs"
                          : isPartnerLogos
                            ? " · Section title, logo uploads, drag to sort"
                            : isProcessFlow
                              ? " · Optional steps: title + thumbnail, drag to sort"
                              : isSectors
                                ? " · Section title, sectors with icon or upload, drag to sort"
                                : fieldCount > 0
                              ? ` · ${fieldCount} field(s)`
                              : " · Fields to be configured"}
                      </CardDescription> */}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Label htmlFor={`section-active-${index}`} className="text-sm text-muted-foreground">
                        Active
                      </Label>
                      <Switch
                        id={`section-active-${index}`}
                        checked={section.active}
                        onCheckedChange={(checked) => updateSection(index, { active: checked })}
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="pt-2">
                    {isHero && hero ? (
                      <div className="space-y-6 max-w-xl">
                        <div className="space-y-2">
                          <Label htmlFor="hero-title">Title</Label>
                          <Input
                            id="hero-title"
                            value={hero.title}
                            onChange={(e) => updateHero(index, { title: e.target.value })}
                            placeholder="Main headline"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="hero-subtitle">Sub Title</Label>
                          <Input
                            id="hero-subtitle"
                            value={hero.subTitle}
                            onChange={(e) => updateHero(index, { subTitle: e.target.value })}
                            placeholder="Supporting line under the title"
                          />
                        </div>
                        <div className="grid gap-6 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="hero-cta-primary">Primary CTA label</Label>
                            <Input
                              id="hero-cta-primary"
                              value={hero.primaryCtaLabel}
                              onChange={(e) =>
                                updateHero(index, { primaryCtaLabel: e.target.value })
                              }
                              placeholder={HERO_CONTENT_DEFAULTS.primaryCtaLabel}
                            />
                            <p className="text-xs text-muted-foreground">
                              Default: {HERO_CONTENT_DEFAULTS.primaryCtaLabel}
                            </p>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="hero-cta-secondary">Secondary CTA label</Label>
                            <Input
                              id="hero-cta-secondary"
                              value={hero.secondaryCtaLabel}
                              onChange={(e) =>
                                updateHero(index, { secondaryCtaLabel: e.target.value })
                              }
                              placeholder={HERO_CONTENT_DEFAULTS.secondaryCtaLabel}
                            />
                            <p className="text-xs text-muted-foreground">
                              Default: {HERO_CONTENT_DEFAULTS.secondaryCtaLabel}
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : isPartnerLogos && partnerLogos ? (
                      <PartnerLogosSectionFields
                        payload={partnerLogos}
                        onUpdate={(updater) => updatePartnerLogos(index, updater)}
                      />
                    ) : isProcessFlow && processFlow ? (
                      <ProcessFlowSectionFields
                        payload={processFlow}
                        onUpdate={(updater) => updateProcessFlow(index, updater)}
                      />
                    ) : isSectors && sectors ? (
                      <SectorsSectionFields
                        payload={sectors}
                        onUpdate={(updater) => updateSectors(index, updater)}
                      />
                    ) : isAboutUs && aboutUs ? (
                      <AboutUsSectionFields
                        payload={aboutUs}
                        onUpdate={(updater) => updateAboutUs(index, updater)}
                      />
                    ) : isContactInfo && contactInfo ? (
                      <ContactInfoSectionFields
                        payload={contactInfo}
                        onUpdate={(updater) => updateContactInfo(index, updater)}
                      />
                    ) : (
                      <div className="rounded-lg border border-dashed border-muted-foreground/25 bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
                        Field editors for <strong className="text-foreground">{section.name}</strong> will
                        appear here in the next step.
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default LandingPageEditor;
