import React, { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { apiRequest, cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useNavigate } from "react-router-dom";
import { GripVertical, ListTree, Pencil, Plus, Trash2, ArrowUpDown, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { IconActionButton } from "@/components/IconActionTooltip";

export interface SkillCategory {
  id: number;
  name: string;
  displayOrder: number;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

function sortByDisplayOrder(cats: SkillCategory[]): SkillCategory[] {
  return [...cats].sort((a, b) => {
    if (a.displayOrder !== b.displayOrder) return a.displayOrder - b.displayOrder;
    return a.name.localeCompare(b.name);
  });
}

function SortableCategoryRow({ category }: { category: SkillCategory }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: String(category.id) });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-3 rounded-lg border border-[#712B71]/30 bg-white px-4 py-3 shadow-sm",
        isDragging && "z-10 opacity-80 shadow-md ring-2 ring-[#45f0df]"
      )}
    >
      <button
        type="button"
        className="touch-none text-muted-foreground hover:text-[#000009] cursor-grab active:cursor-grabbing p-1 rounded-md hover:bg-muted"
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-5 w-5" />
      </button>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-[#000009] truncate">{category.name}</p>
        <p className="text-xs text-muted-foreground">displayOrder: {category.displayOrder}</p>
      </div>
      <Badge variant={category.active ? "default" : "secondary"}>
        {category.active ? "Active" : "Inactive"}
      </Badge>
    </div>
  );
}

const SkillCategoriesManagement = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [sortMode, setSortMode] = useState(false);
  const [sortItems, setSortItems] = useState<SkillCategory[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [editCategory, setEditCategory] = useState<SkillCategory | null>(null);
  const [deleteCategory, setDeleteCategory] = useState<SkillCategory | null>(null);
  const [formName, setFormName] = useState("");
  const [formDisplayOrder, setFormDisplayOrder] = useState(0);
  const [formActive, setFormActive] = useState(true);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const { data, isLoading, error } = useQuery({
    queryKey: ["skill-categories"],
    queryFn: async () => {
      const response = await apiRequest("/candidate/skill-categories");
      if (!response.ok) {
        throw new Error("Failed to fetch skill categories");
      }
      return response.json() as Promise<SkillCategory[]>;
    },
  });

  const categories = useMemo(() => sortByDisplayOrder(data ?? []), [data]);

  const createMutation = useMutation({
    mutationFn: async (body: { name: string; displayOrder?: number; active?: boolean }) => {
      const response = await apiRequest("/candidate/skill-categories", {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error((err as { message?: string }).message || "Failed to create category");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["skill-categories"] });
      toast({ title: "Category created" });
      setCreateOpen(false);
      resetForm();
    },
    onError: (e: Error) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      body,
    }: {
      id: number;
      body: Partial<{ name: string; displayOrder: number; active: boolean }>;
    }) => {
      const response = await apiRequest(`/candidate/skill-categories/${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error((err as { message?: string }).message || "Failed to update category");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["skill-categories"] });
      toast({ title: "Category updated" });
      setEditCategory(null);
      resetForm();
    },
    onError: (e: Error) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest(`/candidate/skill-categories/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Failed to delete category");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["skill-categories"] });
      toast({ title: "Category deleted" });
      setDeleteCategory(null);
    },
    onError: (e: Error) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  const saveOrderMutation = useMutation({
    mutationFn: async (ordered: SkillCategory[]) => {
      const res = await apiRequest("/candidate/skill-categories/display-order", {
        method: "PUT",
        body: JSON.stringify({
          items: ordered.map((cat, displayOrder) => ({ id: cat.id, displayOrder })),
        }),
      });
      if (!res.ok) {
        let msg = `Could not save order (${res.status})`;
        try {
          const body = (await res.json()) as { message?: string };
          if (body?.message) msg = body.message;
        } catch {
          /* ignore */
        }
        throw new Error(msg);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["skill-categories"] });
      toast({ title: "Order saved" });
      setSortMode(false);
      setSortItems([]);
    },
    onError: (e: Error) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  function resetForm() {
    setFormName("");
    setFormDisplayOrder(categories.length ? Math.max(...categories.map((c) => c.displayOrder)) + 1 : 0);
    setFormActive(true);
  }

  function openCreate() {
    resetForm();
    if (categories.length) {
      setFormDisplayOrder(Math.max(...categories.map((c) => c.displayOrder), -1) + 1);
    }
    setCreateOpen(true);
  }

  function openEdit(cat: SkillCategory) {
    setFormName(cat.name);
    setFormDisplayOrder(cat.displayOrder);
    setFormActive(cat.active !== false);
    setEditCategory(cat);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setSortItems((items) => {
      const oldIndex = items.findIndex((i) => String(i.id) === active.id);
      const newIndex = items.findIndex((i) => String(i.id) === over.id);
      if (oldIndex < 0 || newIndex < 0) return items;
      return arrayMove(items, oldIndex, newIndex);
    });
  }

  function enterSortMode() {
    setSortItems(sortByDisplayOrder(categories));
    setSortMode(true);
  }

  function cancelSortMode() {
    setSortMode(false);
    setSortItems([]);
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full max-w-md" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-destructive">
        Error loading categories: {error instanceof Error ? error.message : "Unknown error"}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-[#000009] text-lg">Skill categories</CardTitle>
          <CardDescription>
            Manage category names and display order. Order controls how categories appear wherever
            skills are grouped by category.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2 items-center justify-between">
            <div className="flex flex-wrap gap-2">
              {!sortMode ? (
                <>
                  <Button
                    type="button"
                    onClick={openCreate}
                    className="bg-[#4eb93e] hover:bg-green-600 text-black"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    New category
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={enterSortMode}
                    className="border-[#712B71] text-[#000009]"
                  >
                    <ArrowUpDown className="h-4 w-4 mr-2" />
                    Reorder
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    type="button"
                    onClick={() => saveOrderMutation.mutate(sortItems)}
                    disabled={saveOrderMutation.isPending}
                    className="bg-[#4eb93e] hover:bg-green-600 text-black"
                  >
                    <Check className="h-4 w-4 mr-2" />
                    {saveOrderMutation.isPending ? "Saving…" : "Save order"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={cancelSortMode}
                    disabled={saveOrderMutation.isPending}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </>
              )}
            </div>
            {sortMode && (
              <p className="text-sm text-muted-foreground">
                Drag rows to set order. Saving assigns displayOrder 0, 1, 2… from top to bottom.
              </p>
            )}
          </div>

          {sortMode ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={sortItems.map((c) => String(c.id))}
                strategy={verticalListSortingStrategy}
              >
                <div className="flex flex-col gap-2">
                  {sortItems.map((cat) => (
                    <SortableCategoryRow key={cat.id} category={cat} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          ) : categories.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center">No categories yet. Create one to get started.</p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-24">Order</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right min-w-[12rem] w-[30%] whitespace-nowrap">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map((cat) => (
                    <TableRow
                      key={cat.id}
                      className={cn(!sortMode && "cursor-pointer hover:bg-muted/50")}
                      onClick={(e) => {
                        if (sortMode) return;
                        if ((e.target as HTMLElement).closest("button")) return;
                        navigate(`/skills/category/${cat.id}`);
                      }}
                    >
                      <TableCell className="font-mono text-sm">{cat.displayOrder}</TableCell>
                      <TableCell className="font-medium">{cat.name}</TableCell>
                      <TableCell>
                        <Badge variant={cat.active ? "default" : "secondary"}>
                          {cat.active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right align-middle p-2">
                        <div className="flex justify-end items-center gap-1.5 flex-nowrap">
                          <IconActionButton
                            label={`Skills in ${cat.name}`}
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 shrink-0 text-muted-foreground hover:text-[#000009]"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/skills/category/${cat.id}`);
                            }}
                          >
                            <ListTree className="h-4 w-4" />
                          </IconActionButton>
                          <IconActionButton
                            label={`Edit ${cat.name}`}
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 shrink-0 text-muted-foreground hover:text-[#000009]"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEdit(cat);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </IconActionButton>
                          <IconActionButton
                            label={`Delete ${cat.name}`}
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 shrink-0 text-destructive hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteCategory(cat);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </IconActionButton>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New skill category</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="sc-name">Name</Label>
              <Input
                id="sc-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Clinical"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sc-order">Display order</Label>
              <Input
                id="sc-order"
                type="number"
                value={formDisplayOrder}
                onChange={(e) => setFormDisplayOrder(Number(e.target.value) || 0)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="sc-active">Active</Label>
              <Switch id="sc-active" checked={formActive} onCheckedChange={setFormActive} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-[#4eb93e] hover:bg-green-600 text-black"
              disabled={!formName.trim() || createMutation.isPending}
              onClick={() =>
                createMutation.mutate({
                  name: formName.trim(),
                  displayOrder: formDisplayOrder,
                  active: formActive,
                })
              }
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editCategory} onOpenChange={(o) => !o && setEditCategory(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit skill category</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="se-name">Name</Label>
              <Input
                id="se-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="se-order">Display order</Label>
              <Input
                id="se-order"
                type="number"
                value={formDisplayOrder}
                onChange={(e) => setFormDisplayOrder(Number(e.target.value) || 0)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="se-active">Active</Label>
              <Switch id="se-active" checked={formActive} onCheckedChange={setFormActive} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditCategory(null)}>
              Cancel
            </Button>
            <Button
              className="bg-[#4eb93e] hover:bg-green-600 text-black"
              disabled={!editCategory || !formName.trim() || updateMutation.isPending}
              onClick={() => {
                if (!editCategory) return;
                updateMutation.mutate({
                  id: editCategory.id,
                  body: {
                    name: formName.trim(),
                    displayOrder: formDisplayOrder,
                    active: formActive,
                  },
                });
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteCategory} onOpenChange={(o) => !o && setDeleteCategory(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete category?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteCategory
                ? `Remove “${deleteCategory.name}” from the category list. Skills that still reference this name as a string will not be deleted.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteCategory && deleteMutation.mutate(deleteCategory.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SkillCategoriesManagement;
