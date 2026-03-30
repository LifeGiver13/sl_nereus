import React, { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
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
import AdminLayout from "../components/AdminLayout";
import SkillFormModal from "../components/SkillFormModal";
import { apiRequest, cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
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
import { ArrowLeft, ArrowUpDown, Check, Edit, GripVertical, Plus, Power, Trash2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { SkillCategory } from "../components/SkillCategoriesManagement";
import { IconActionButton } from "@/components/IconActionTooltip";

interface Skill {
  id: number;
  name: string;
  category: string;
  subCategory?: string;
  displayOrder?: number;
  active?: boolean;
  meta?: { fortunaID?: number; disabled?: boolean };
  createdAt: string;
  updatedAt: string;
}

type SkillFormData = {
  name: string;
  category: string;
  subCategory?: string;
};

function sortSkillsInCategory(list: Skill[]): Skill[] {
  return [...list].sort((a, b) => {
    const oa = a.displayOrder ?? 0;
    const ob = b.displayOrder ?? 0;
    if (oa !== ob) return oa - ob;
    return a.name.localeCompare(b.name);
  });
}

function SortableSkillRow({ skill }: { skill: Skill }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: String(skill.id) });

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
        <p className="font-medium text-[#000009] truncate">{skill.name}</p>
        {skill.subCategory ? (
          <p className="text-xs text-muted-foreground truncate">{skill.subCategory}</p>
        ) : null}
      </div>
      <Badge variant={skill.active !== false ? "default" : "secondary"}>
        {skill.active !== false ? "Active" : "Inactive"}
      </Badge>
    </div>
  );
}

const CategorySkillsPage = () => {
  const { categoryId } = useParams<{ categoryId: string }>();
  const idNum = categoryId ? Number.parseInt(categoryId, 10) : NaN;
  const validId = Number.isFinite(idNum) && idNum > 0;

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [sortMode, setSortMode] = useState(false);
  const [sortItems, setSortItems] = useState<Skill[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [skillToDelete, setSkillToDelete] = useState<Skill | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const {
    data: category,
    isLoading: categoryLoading,
    error: categoryError,
  } = useQuery({
    queryKey: ["skill-category", idNum],
    queryFn: async () => {
      const response = await apiRequest(`/candidate/skill-categories/${idNum}`);
      if (!response.ok) {
        throw new Error("Category not found");
      }
      return response.json() as Promise<SkillCategory>;
    },
    enabled: validId,
  });

  const { data: allSkills, isLoading: skillsLoading, error: skillsError } = useQuery({
    queryKey: ["candidate-skills"],
    queryFn: async () => {
      const response = await apiRequest("/candidate/skills");
      if (!response.ok) throw new Error("Failed to fetch skills");
      return response.json() as Promise<Skill[]>;
    },
    enabled: validId && !!category?.name,
  });

  const categorySkills = useMemo(() => {
    if (!category?.name || !allSkills) return [];
    const name = category.name;
    return sortSkillsInCategory(allSkills.filter((s) => s.category === name));
  }, [allSkills, category?.name]);

  const nextDisplayOrder = useMemo(() => {
    if (!categorySkills.length) return 0;
    return Math.max(...categorySkills.map((s) => s.displayOrder ?? 0), -1) + 1;
  }, [categorySkills]);

  const createSkillMutation = useMutation({
    mutationFn: async (skillData: SkillFormData & { displayOrder?: number }) => {
      const response = await apiRequest("/candidate/skill", {
        method: "POST",
        body: JSON.stringify(skillData),
      });
      if (!response.ok) throw new Error("Failed to create skill");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["candidate-skills"] });
      toast({ title: "Success", description: "Skill created successfully" });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateSkillMutation = useMutation({
    mutationFn: async ({ id, skillData }: { id: number; skillData: SkillFormData }) => {
      const response = await apiRequest(`/candidate/skill/${id}`, {
        method: "PUT",
        body: JSON.stringify(skillData),
      });
      if (!response.ok) throw new Error("Failed to update skill");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["candidate-skills"] });
      toast({ title: "Success", description: "Skill updated successfully" });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, action }: { id: number; action: "enable" | "disable" }) => {
      const response = await apiRequest(`/candidate/skill/${id}/${action}`, {
        method: "POST",
      });
      if (!response.ok) throw new Error(`Failed to ${action} skill`);
      return response.json();
    },
    onSuccess: (_, { action }) => {
      queryClient.invalidateQueries({ queryKey: ["candidate-skills"] });
      toast({ title: "Success", description: `Skill ${action}d successfully` });
    },
    onError: (error: Error, { action }) => {
      toast({
        title: "Error",
        description: error.message || `Failed to ${action} skill`,
        variant: "destructive",
      });
    },
  });

  const deleteSkillMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest(`/candidate/skill/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete skill");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["candidate-skills"] });
      toast({ title: "Success", description: "Skill deleted successfully" });
      setIsDeleteDialogOpen(false);
      setSkillToDelete(null);
      setDeleteConfirmation("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const saveOrderMutation = useMutation({
    mutationFn: async (ordered: Skill[]) => {
      const items = ordered.map((skill, displayOrder) => {
        const id = skill.id;
        if (id === undefined || id === null || Number.isNaN(Number(id))) {
          throw new Error("Skill is missing a valid id; reload the page and try again.");
        }
        return { id: Number(id), displayOrder };
      });
      const res = await apiRequest("/candidate/skills/display-order", {
        method: "PUT",
        body: JSON.stringify({ items }),
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
      queryClient.invalidateQueries({ queryKey: ["candidate-skills"] });
      toast({ title: "Order saved" });
      setSortMode(false);
      setSortItems([]);
    },
    onError: (e: Error) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  function enterSortMode() {
    setSortItems(sortSkillsInCategory(categorySkills));
    setSortMode(true);
  }

  function cancelSortMode() {
    setSortMode(false);
    setSortItems([]);
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

  const handleCreateSkill = async (skillData: SkillFormData) => {
    await createSkillMutation.mutateAsync({
      ...skillData,
      displayOrder: nextDisplayOrder,
    });
  };

  const handleEditSkill = async (skillData: SkillFormData) => {
    if (!selectedSkill) return;
    await updateSkillMutation.mutateAsync({ id: selectedSkill.id, skillData });
    setSelectedSkill(null);
  };

  const isDeleteDisabled = !skillToDelete || deleteConfirmation !== skillToDelete.name;

  if (!validId) {
    return (
      <AdminLayout>
        <p className="text-destructive">Invalid category.</p>
        <Button asChild variant="link" className="mt-2 p-0 h-auto">
          <Link to="/skills?tab=categories">Back to skills</Link>
        </Button>
      </AdminLayout>
    );
  }

  if (categoryLoading) {
    return (
      <AdminLayout>
        <Skeleton className="h-10 w-64 mb-4" />
        <Skeleton className="h-48 w-full" />
      </AdminLayout>
    );
  }

  if (categoryError || !category) {
    return (
      <AdminLayout>
        <p className="text-destructive">
          {categoryError instanceof Error ? categoryError.message : "Category not found"}
        </p>
        <Button asChild variant="link" className="mt-2 p-0 h-auto">
          <Link to="/skills?tab=categories">Back to skills</Link>
        </Button>
      </AdminLayout>
    );
  }

  const categoryName = category.name;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start gap-4 justify-between">
          <div>
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="mb-2 -ml-2 text-muted-foreground hover:text-[#000009]"
            >
              <Link to="/skills?tab=categories" className="inline-flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Categories
              </Link>
            </Button>
            <h1 className="text-3xl font-bold text-[#000009]">Category skills</h1>
            <p className="text-gray-600 mt-1">
              Edit and reorder skills in <span className="font-medium text-[#000009]">{categoryName}</span>.
            </p>
          </div>
        </div>

        <Card className="border-0 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-[#000009] text-lg">Skills in this category</CardTitle>
            <CardDescription>
              Skills are matched to this category by name. Reorder updates display order for this category only.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {skillsError ? (
              <p className="text-destructive text-sm">
                {skillsError instanceof Error ? skillsError.message : "Failed to load skills"}
              </p>
            ) : null}

            <div className="flex flex-wrap gap-2 items-center justify-between">
              <div className="flex flex-wrap gap-2">
                {!sortMode ? (
                  <>
                    <Button
                      type="button"
                      onClick={() => setIsCreateModalOpen(true)}
                      className="bg-[#4eb93e] hover:bg-green-600 text-black"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      New skill
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={enterSortMode}
                      disabled={categorySkills.length === 0}
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
                  Drag to reorder. Saving assigns displayOrder 0, 1, 2… for skills in this category.
                </p>
              )}
            </div>

            {skillsLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : sortMode ? (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={sortItems.map((s) => String(s.id))}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="flex flex-col gap-2">
                    {sortItems.map((skill) => (
                      <SortableSkillRow key={skill.id} skill={skill} />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            ) : categorySkills.length === 0 ? (
              <p className="text-muted-foreground py-8 text-center">
                No skills in this category yet. Create one or assign skills this category name from the full skills
                list.
              </p>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-24">Order</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Subcategory</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right min-w-[11rem] whitespace-nowrap">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categorySkills.map((skill) => (
                      <TableRow key={skill.id}>
                        <TableCell className="font-mono text-sm">{skill.displayOrder ?? 0}</TableCell>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {skill.name}
                            {skill.active === false && (
                              <Badge variant="secondary" className="text-xs">
                                Disabled
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {skill.subCategory || "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={skill.active !== false ? "default" : "secondary"}>
                            {skill.active !== false ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right align-middle p-2">
                          <div className="flex justify-end items-center gap-1.5 flex-nowrap">
                            <IconActionButton
                              label={`Edit ${skill.name}`}
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 shrink-0"
                              disabled={updateSkillMutation.isPending}
                              onClick={() => {
                                setSelectedSkill(skill);
                                setIsEditModalOpen(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </IconActionButton>
                            <IconActionButton
                              label={skill.active === false ? `Enable ${skill.name}` : `Disable ${skill.name}`}
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 shrink-0"
                              disabled={toggleStatusMutation.isPending}
                              onClick={() =>
                                toggleStatusMutation.mutate({
                                  id: skill.id,
                                  action: skill.active === false ? "enable" : "disable",
                                })
                              }
                            >
                              <Power
                                className={cn(
                                  "h-4 w-4",
                                  skill.active === false ? "text-muted-foreground" : "text-green-600"
                                )}
                              />
                            </IconActionButton>
                            <IconActionButton
                              label={`Delete ${skill.name}`}
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 shrink-0 text-destructive hover:text-destructive"
                              disabled={deleteSkillMutation.isPending}
                              onClick={() => {
                                setSkillToDelete(skill);
                                setIsDeleteDialogOpen(true);
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

        <SkillFormModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSubmit={handleCreateSkill}
          isLoading={createSkillMutation.isPending}
          fixedCategory={categoryName}
        />

        <SkillFormModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedSkill(null);
          }}
          onSubmit={handleEditSkill}
          skill={selectedSkill}
          isLoading={updateSkillMutation.isPending}
          fixedCategory={categoryName}
        />

        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete skill</AlertDialogTitle>
              <AlertDialogDescription>
                This action is irreversible and will remove the skill from candidates who have it.
                {skillToDelete && (
                  <div className="mt-4">
                    <p className="font-medium mb-2">Type &quot;{skillToDelete.name}&quot; to confirm:</p>
                    <Input
                      value={deleteConfirmation}
                      onChange={(e) => setDeleteConfirmation(e.target.value)}
                      placeholder="Skill name"
                      className="mt-2"
                    />
                  </div>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                onClick={() => {
                  setSkillToDelete(null);
                  setDeleteConfirmation("");
                }}
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => skillToDelete && deleteSkillMutation.mutate(skillToDelete.id)}
                disabled={isDeleteDisabled || deleteSkillMutation.isPending}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteSkillMutation.isPending ? "Deleting…" : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
};

export default CategorySkillsPage;
