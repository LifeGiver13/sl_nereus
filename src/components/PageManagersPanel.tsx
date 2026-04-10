import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { IconActionButton } from "@/components/IconActionTooltip";
import { Pencil } from "lucide-react";
import {
  LANDING_PAGE_SLUG,
  buildDefaultLandingSections,
  landingSectionsNeedSeeding,
  normalizeLandingSections,
  type PageManagerSection,
} from "@/config/landingPageContent";
import {
  START_PAGE_SLUG,
  buildDefaultStartSections,
  normalizeStartSections,
  startPageSectionsNeedSeeding,
  type StartPageSection,
} from "@/config/startPageContent";

export type PageSection = {
  name: string;
  active: boolean;
  fields: unknown[];
  displayOrder: number;
};

export type PageManagerRecord = {
  id: number;
  name: string;
  sections: PageSection[];
  meta: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
};

/** Fixed site pages — always shown; created via API if missing. Slugs must match backend keys. */
export const FIXED_PAGE_MANAGERS = [
  { displayName: "Landing Page", slug: "landing-page" },
  { displayName: "Start Page", slug: "start-page" },
] as const;

const emptySectionsJson = "[]";
const emptyMetaJson = "{}";

function parseJsonField<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function fetchPageManagersList(): Promise<PageManagerRecord[]> {
  const res = await apiRequest("/utils/page-managers?limit=200&offset=0");
  if (!res.ok) {
    throw new Error(await res.text());
  }
  const data = (await res.json()) as PageManagerRecord[];
  return Array.isArray(data) ? data : [];
}

const PageManagersPanel: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [rows, setRows] = useState<PageManagerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<PageManagerRecord | null>(null);
  const [editingLabel, setEditingLabel] = useState("");
  const [editSectionsJson, setEditSectionsJson] = useState(emptySectionsJson);
  const [editMetaJson, setEditMetaJson] = useState(emptyMetaJson);

  const loadAndEnsureFixed = useCallback(async () => {
    setLoading(true);
    try {
      let list = await fetchPageManagersList();
      const bySlug = new Map(list.map((p) => [p.name, p]));
      let createdAny = false;

      for (const { slug } of FIXED_PAGE_MANAGERS) {
        if (bySlug.has(slug)) continue;
        const res = await apiRequest("/utils/page-manager", {
          method: "POST",
          body: JSON.stringify({
            name: slug,
            sections:
              slug === LANDING_PAGE_SLUG
                ? buildDefaultLandingSections()
                : slug === START_PAGE_SLUG
                  ? buildDefaultStartSections()
                  : [],
            meta: {},
          }),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          toast({
            title: "Could not create page",
            description: `${slug}: ${(body as { message?: string }).message || res.statusText}`,
            variant: "destructive",
          });
          continue;
        }
        bySlug.set(slug, body as PageManagerRecord);
        createdAny = true;
      }

      if (createdAny) {
        list = await fetchPageManagersList();
      }

      const landing = list.find((p) => p.name === LANDING_PAGE_SLUG);
      if (
        landing &&
        landingSectionsNeedSeeding(landing.sections as PageManagerSection[])
      ) {
        const normalized = normalizeLandingSections(
          landing.sections as PageManagerSection[]
        );
        const putRes = await apiRequest(`/utils/page-manager/${landing.id}`, {
          method: "PUT",
          body: JSON.stringify({
            name: LANDING_PAGE_SLUG,
            sections: normalized,
            meta: landing.meta ?? {},
          }),
        });
        if (putRes.ok) {
          list = await fetchPageManagersList();
        } else {
          const errBody = await putRes.json().catch(() => ({}));
          toast({
            title: "Could not normalise landing sections",
            description:
              (errBody as { message?: string }).message || putRes.statusText,
            variant: "destructive",
          });
        }
      }

      const startPage = list.find((p) => p.name === START_PAGE_SLUG);
      if (
        startPage &&
        startPageSectionsNeedSeeding(startPage.sections as StartPageSection[])
      ) {
        const normalized = normalizeStartSections(startPage.sections as StartPageSection[]);
        const putRes = await apiRequest(`/utils/page-manager/${startPage.id}`, {
          method: "PUT",
          body: JSON.stringify({
            name: START_PAGE_SLUG,
            sections: normalized,
            meta: startPage.meta ?? {},
          }),
        });
        if (putRes.ok) {
          list = await fetchPageManagersList();
        } else {
          const errBody = await putRes.json().catch(() => ({}));
          toast({
            title: "Could not normalise start page sections",
            description:
              (errBody as { message?: string }).message || putRes.statusText,
            variant: "destructive",
          });
        }
      }

      const ordered: PageManagerRecord[] = [];
      for (const { slug } of FIXED_PAGE_MANAGERS) {
        const row = list.find((p) => p.name === slug);
        if (row) ordered.push(row);
      }
      setRows(ordered);
    } catch {
      toast({
        title: "Error",
        description: "Could not load page managers.",
        variant: "destructive",
      });
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadAndEnsureFixed();
  }, [loadAndEnsureFixed]);

  const openEdit = (row: PageManagerRecord) => {
    if (row.name === LANDING_PAGE_SLUG) {
      navigate("/content/pages/landing-page");
      return;
    }
    if (row.name === START_PAGE_SLUG) {
      navigate("/content/pages/start-page");
      return;
    }
    const def = FIXED_PAGE_MANAGERS.find((f) => f.slug === row.name);
    setEditing(row);
    setEditingLabel(def?.displayName ?? row.name);
    setEditSectionsJson(JSON.stringify(row.sections ?? [], null, 2));
    setEditMetaJson(JSON.stringify(row.meta ?? {}, null, 2));
    setEditOpen(true);
  };

  const submitEdit = async () => {
    if (!editing) return;
    const name = editing.name;

    const sections = parseJsonField<PageSection[]>(editSectionsJson);
    if (sections === null) {
      toast({
        title: "Invalid JSON",
        description: "Sections must be valid JSON (array of section objects).",
        variant: "destructive",
      });
      return;
    }
    if (!Array.isArray(sections)) {
      toast({ title: "Sections must be an array", variant: "destructive" });
      return;
    }
    const meta = parseJsonField<Record<string, unknown>>(editMetaJson);
    if (meta === null) {
      toast({
        title: "Invalid JSON",
        description: "Meta must be valid JSON object.",
        variant: "destructive",
      });
      return;
    }
    if (typeof meta !== "object" || meta === null || Array.isArray(meta)) {
      toast({ title: "Meta must be a JSON object", variant: "destructive" });
      return;
    }
    try {
      const res = await apiRequest(`/utils/page-manager/${editing.id}`, {
        method: "PUT",
        body: JSON.stringify({ name, sections, meta }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({
          title: "Update failed",
          description: (body as { message?: string }).message || res.statusText,
          variant: "destructive",
        });
        return;
      }
      toast({ title: "Saved", description: editingLabel });
      setEditOpen(false);
      setEditing(null);
      await loadAndEnsureFixed();
    } catch {
      toast({ title: "Update failed", variant: "destructive" });
    }
  };

  const rowBySlug = (slug: string) => rows.find((r) => r.name === slug);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground max-w-2xl">
        These two pages are fixed entry points for the site.{" "}
        <strong>Landing page</strong> and <strong>Start page</strong> each open a dedicated editor. Keys{" "}
        <code className="text-xs bg-muted px-1 rounded">landing-page</code> and{" "}
        <code className="text-xs bg-muted px-1 rounded">start-page</code> are stored in{" "}
        <code className="text-xs bg-muted px-1 rounded">Nereus__Utilities__PageManagers</code>. Missing rows
        are created when you open this screen; the landing page is seeded with its section structure if needed.
      </p>

      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Page</TableHead>
              <TableHead className="w-24">Key</TableHead>
              <TableHead className="w-20">ID</TableHead>
              <TableHead className="w-24 text-right">Sections</TableHead>
              <TableHead className="w-20 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            ) : (
              FIXED_PAGE_MANAGERS.map(({ displayName, slug }) => {
                const row = rowBySlug(slug);
                return (
                  <TableRow key={slug}>
                    <TableCell className="font-medium">{displayName}</TableCell>
                    <TableCell className="text-muted-foreground text-sm font-mono">{slug}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {row?.id ?? "—"}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {row && Array.isArray(row.sections) ? row.sections.length : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {row ? (
                        <IconActionButton
                          label={`Edit ${displayName}`}
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => openEdit(row)}
                        >
                          <Pencil className="h-4 w-4" />
                        </IconActionButton>
                      ) : (
                        <span className="text-xs text-destructive">Unavailable</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) setEditing(null);
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit {editingLabel}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-md bg-muted/50 px-3 py-2 text-sm">
              <span className="text-muted-foreground">Page key (read-only): </span>
              <code className="font-mono text-xs">{editing?.name}</code>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pm-edit-sections">Sections (JSON array)</Label>
              <Textarea
                id="pm-edit-sections"
                className="font-mono text-sm min-h-[200px]"
                value={editSectionsJson}
                onChange={(e) => setEditSectionsJson(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pm-edit-meta">Meta (JSON object)</Label>
              <Textarea
                id="pm-edit-meta"
                className="font-mono text-sm min-h-[120px]"
                value={editMetaJson}
                onChange={(e) => setEditMetaJson(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              type="button"
              onClick={() => {
                setEditOpen(false);
                setEditing(null);
              }}
            >
              Cancel
            </Button>
            <Button type="button" onClick={submitEdit} className="bg-[#712B71] hover:bg-[#5a225c]">
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PageManagersPanel;
