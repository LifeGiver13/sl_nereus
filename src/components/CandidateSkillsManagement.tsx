import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Edit, Power, Search, Plus, Trash2, ChevronDown, ChevronRight, Pencil } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import SkillFormModal from './SkillFormModal';

interface Skill {
  id: number;
  name: string;
  category: string;
  subCategory?: string;
  active?: boolean;
  meta?: {
    fortunaID: number;
    disabled?: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

type SkillFormData = {
  name: string;
  category: string;
  subCategory?: string;
};

const CandidateSkillsManagement = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [skillToDelete, setSkillToDelete] = useState<Skill | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [categoryToRename, setCategoryToRename] = useState<string | null>(null);
  const [renameCategoryNewName, setRenameCategoryNewName] = useState('');

  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // All hooks must be called at the top level, before any early returns
  const { data, isLoading, error } = useQuery({
    queryKey: ['candidate-skills'],
    queryFn: async () => {
      const response = await apiRequest('/candidate/skills');
      if (!response.ok) {
        throw new Error('Failed to fetch skills');
      }
      return response.json() as Promise<Skill[]>;
    }
  });

  // Create skill mutation
  const createSkillMutation = useMutation({
    mutationFn: async (skillData: SkillFormData) => {
      const response = await apiRequest('/candidate/skill', {
        method: 'POST',
        body: JSON.stringify(skillData),
      });
      if (!response.ok) {
        throw new Error('Failed to create skill');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidate-skills'] });
      toast({
        title: 'Success',
        description: 'Skill created successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create skill',
        variant: 'destructive',
      });
    },
  });

  // Update skill mutation
  const updateSkillMutation = useMutation({
    mutationFn: async ({ id, skillData }: { id: number; skillData: SkillFormData }) => {
      const response = await apiRequest(`/candidate/skill/${id}`, {
        method: 'PUT',
        body: JSON.stringify(skillData),
      });
      if (!response.ok) {
        throw new Error('Failed to update skill');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidate-skills'] });
      toast({
        title: 'Success',
        description: 'Skill updated successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update skill',
        variant: 'destructive',
      });
    },
  });

  // Toggle skill status mutation
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, action }: { id: number; action: 'enable' | 'disable' }) => {
      const response = await apiRequest(`/candidate/skill/${id}/${action}`, {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error(`Failed to ${action} skill`);
      }
      return response.json();
    },
    onSuccess: (_, { action }) => {
      queryClient.invalidateQueries({ queryKey: ['candidate-skills'] });
      toast({
        title: 'Success',
        description: `Skill ${action}d successfully`,
      });
    },
    onError: (error, { action }) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : `Failed to ${action} skill`,
        variant: 'destructive',
      });
    },
  });

  // Delete skill mutation
  const deleteSkillMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest(`/candidate/skill/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete skill');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidate-skills'] });
      toast({
        title: 'Success',
        description: 'Skill deleted successfully',
      });
      setIsDeleteDialogOpen(false);
      setSkillToDelete(null);
      setDeleteConfirmation('');
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete skill',
        variant: 'destructive',
      });
    },
  });

  const handleCreateSkill = async (skillData: SkillFormData) => {
    await createSkillMutation.mutateAsync(skillData);
  };

  const handleEditSkill = async (skillData: SkillFormData) => {
    if (selectedSkill) {
      await updateSkillMutation.mutateAsync({ 
        id: selectedSkill.id, 
        skillData 
      });
      setSelectedSkill(null);
    }
  };

  const handleEdit = (skill: Skill) => {
    setSelectedSkill(skill);
    setIsEditModalOpen(true);
  };

  const handleToggleStatus = (skill: Skill) => {
    const isActive = skill.active !== false;
    const action = isActive ? 'disable' : 'enable';
    toggleStatusMutation.mutate({ id: skill.id, action });
  };

  // Toggle entire category active state (uses category endpoints)
  const toggleCategoryMutation = useMutation({
    mutationFn: async ({ category, action }: { category: string; action: 'enable' | 'disable' }) => {
      const path = `/candidate/skill/category/${encodeURIComponent(category)}/${action}`;
      const response = await apiRequest(path, { method: 'POST' });
      if (!response.ok) throw new Error(`Failed to ${action} category`);
      return response.json();
    },
    onSuccess: (_, { action }) => {
      queryClient.invalidateQueries({ queryKey: ['candidate-skills'] });
      toast({
        title: 'Success',
        description: `Category ${action}d successfully`,
      });
    },
    onError: (error, { action }) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : `Failed to ${action} category`,
        variant: 'destructive',
      });
    },
  });

  // Rename category (uses category rename endpoint)
  const renameCategoryMutation = useMutation({
    mutationFn: async ({
      category,
      newCategoryName,
    }: {
      category: string;
      newCategoryName: string;
    }) => {
      const response = await apiRequest('/candidate/skill/category/rename', {
        method: 'POST',
        body: JSON.stringify({ category, newCategoryName }),
      });
      if (!response.ok) throw new Error('Failed to rename category');
      return response.json();
    },
    onSuccess: (_, { newCategoryName }) => {
      queryClient.invalidateQueries({ queryKey: ['candidate-skills'] });
      toast({
        title: 'Success',
        description: `Category renamed to "${newCategoryName}"`,
      });
      setCategoryToRename(null);
      setRenameCategoryNewName('');
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to rename category',
        variant: 'destructive',
      });
    },
  });

  const toggleCategoryExpanded = (category: string) => {
    setExpandedCategories((prev) => ({ ...prev, [category]: !prev[category] }));
  };
  // Default collapsed: only expanded when explicitly true (so first click expands, second collapses)
  const isCategoryExpanded = (category: string) => expandedCategories[category] === true;

  const handleDelete = (skill: Skill) => {
    setSkillToDelete(skill);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (skillToDelete && deleteConfirmation === skillToDelete.name) {
      deleteSkillMutation.mutate(skillToDelete.id);
    }
  };

  const isDeleteDisabled = !skillToDelete || deleteConfirmation !== skillToDelete.name;

  const skills = data ?? [];

  const filteredAndSortedSkills = useMemo(
    () =>
      skills
        .filter((skill) => {
          const searchLower = searchTerm.toLowerCase();
          return (
            skill.name.toLowerCase().includes(searchLower) ||
            (skill.category || '').toLowerCase().includes(searchLower) ||
            (skill.subCategory || '').toLowerCase().includes(searchLower)
          );
        })
        .sort((a, b) => {
          const categoryA = a.category || 'Uncategorized';
          const categoryB = b.category || 'Uncategorized';
          const subcategoryA = a.subCategory || 'General';
          const subcategoryB = b.subCategory || 'General';
          if (categoryA !== categoryB) return categoryA.localeCompare(categoryB);
          if (subcategoryA !== subcategoryB) return subcategoryA.localeCompare(subcategoryB);
          return a.name.localeCompare(b.name);
        }),
    [skills, searchTerm]
  );

  const skillsByCategory = useMemo(() => {
    const map: Record<string, Skill[]> = {};
    for (const skill of filteredAndSortedSkills) {
      const cat = skill.category || 'Uncategorized';
      if (!map[cat]) map[cat] = [];
      map[cat].push(skill);
    }
    return map;
  }, [filteredAndSortedSkills]);

  const categoryNames = useMemo(
    () => Object.keys(skillsByCategory).sort((a, b) => a.localeCompare(b)),
    [skillsByCategory]
  );

  // Early returns after all hooks have been called
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-destructive">
        Error loading skills: {error instanceof Error ? error.message : 'Unknown error'}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Skills Overview</h3>
        <p className="text-sm text-muted-foreground">
          Manage candidate skills organized by category and subcategory
        </p>
      </div>

      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search skills, categories, or subcategories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="text-sm text-muted-foreground">
            {filteredAndSortedSkills.length} skill{filteredAndSortedSkills.length !== 1 ? 's' : ''}
          </div>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          New Skill
        </Button>
      </div>

      {filteredAndSortedSkills.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          {searchTerm ? 'No skills found matching your search' : 'No skills found'}
        </div>
      ) : (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Skill Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Subcategory</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categoryNames.map((category) => {
                  const categorySkills = skillsByCategory[category];
                  const activeCount = categorySkills.filter((s) => s.active !== false).length;
                  const disabledCount = categorySkills.filter((s) => s.active === false).length;
                  const allActive = disabledCount === 0;
                  const allDisabled = activeCount === 0;
                  const isExpanded = isCategoryExpanded(category);
                  return (
                    <React.Fragment key={category}>
                      <TableRow className="bg-muted/40 hover:bg-muted/40">
                        <TableCell
                          className="cursor-pointer py-3 align-middle"
                          onClick={() => toggleCategoryExpanded(category)}
                        >
                          <button
                            type="button"
                            className="flex items-center gap-2 text-left font-medium"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleCategoryExpanded(category);
                            }}
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 shrink-0" />
                            ) : (
                              <ChevronRight className="h-4 w-4 shrink-0" />
                            )}
                            <span>{category}</span>
                            <Badge variant="secondary" className="text-xs font-normal">
                              {categorySkills.length} skill{categorySkills.length !== 1 ? 's' : ''}
                            </Badge>
                            {disabledCount > 0 && (
                              <span className="text-xs text-muted-foreground">
                                ({disabledCount} disabled)
                              </span>
                            )}
                          </button>
                        </TableCell>
                        <TableCell colSpan={2} />
                        <TableCell className="py-2 text-right align-middle" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs"
                            disabled={renameCategoryMutation.isPending}
                            onClick={(e) => {
                              e.stopPropagation();
                              setCategoryToRename(category);
                              setRenameCategoryNewName(category);
                            }}
                          >
                            <Pencil className="h-3 w-3 mr-1" />
                            Rename
                          </Button>
                          {!allActive && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs ml-2"
                              disabled={toggleCategoryMutation.isPending}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleCategoryMutation.mutate({ category, action: 'enable' });
                              }}
                            >
                              Enable all
                            </Button>
                          )}
                          {!allDisabled && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs ml-2"
                              disabled={toggleCategoryMutation.isPending}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleCategoryMutation.mutate({ category, action: 'disable' });
                              }}
                            >
                              Disable all
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                      {isExpanded && (
                        <>
                          {categorySkills.map((skill) => (
                            <TableRow key={skill.id}>
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
                              <TableCell>
                                <Badge variant="outline" className="text-xs">
                                  {skill.category || 'Uncategorized'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant="secondary" className="text-xs">
                                  {skill.subCategory || 'General'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEdit(skill)}
                                    className="h-8 w-8 p-0"
                                    disabled={updateSkillMutation.isPending}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleToggleStatus(skill)}
                                    className="h-8 w-8 p-0"
                                    disabled={toggleStatusMutation.isPending}
                                  >
                                    <Power
                                      className={`h-4 w-4 ${skill.active === false ? 'text-muted-foreground' : 'text-green-600'}`}
                                    />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDelete(skill)}
                                    className="h-8 w-8 p-0"
                                    disabled={deleteSkillMutation.isPending}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </>
                      )}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Create Skill Modal */}
      <SkillFormModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateSkill}
        isLoading={createSkillMutation.isPending}
      />

      {/* Edit Skill Modal */}
      <SkillFormModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedSkill(null);
        }}
        onSubmit={handleEditSkill}
        skill={selectedSkill}
        isLoading={updateSkillMutation.isPending}
      />

      {/* Rename Category Dialog */}
      <Dialog
        open={categoryToRename !== null}
        onOpenChange={(open) => {
          if (!open) {
            setCategoryToRename(null);
            setRenameCategoryNewName('');
          }
        }}
      >
        <DialogContent className="sm:max-w-md" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Rename category</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="rename-category" className="text-sm font-medium">
                New category name
              </label>
              <Input
                id="rename-category"
                value={renameCategoryNewName}
                onChange={(e) => setRenameCategoryNewName(e.target.value)}
                placeholder="Category name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCategoryToRename(null);
                setRenameCategoryNewName('');
              }}
            >
              Cancel
            </Button>
            <Button
              disabled={
                !renameCategoryNewName.trim() ||
                renameCategoryNewName.trim() === categoryToRename ||
                renameCategoryMutation.isPending
              }
              onClick={() => {
                if (!categoryToRename || !renameCategoryNewName.trim()) return;
                renameCategoryMutation.mutate({
                  category: categoryToRename,
                  newCategoryName: renameCategoryNewName.trim(),
                });
              }}
            >
              {renameCategoryMutation.isPending ? 'Renaming...' : 'Rename'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Skill</AlertDialogTitle>
            <AlertDialogDescription>
              This action is irreversible and will remove the skill assignment from any candidates who currently have it.
              {skillToDelete && (
                <div className="mt-4">
                  <p className="font-medium mb-2">
                    Type "{skillToDelete.name}" to confirm deletion:
                  </p>
                  <Input
                    value={deleteConfirmation}
                    onChange={(e) => setDeleteConfirmation(e.target.value)}
                    placeholder="Type skill name here"
                    className="mt-2"
                  />
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setIsDeleteDialogOpen(false);
              setSkillToDelete(null);
              setDeleteConfirmation('');
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleteDisabled || deleteSkillMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteSkillMutation.isPending ? 'Deleting...' : 'Delete Skill'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CandidateSkillsManagement;