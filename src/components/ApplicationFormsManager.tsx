
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Edit, Trash2, Save, X, Loader2, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { useApplicationForms } from '@/hooks/useApplicationForms';
import { format } from 'date-fns';

const ApplicationFormsManager = () => {
  const [newFormName, setNewFormName] = useState('');
  const [newFormDescription, setNewFormDescription] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingForm, setEditingForm] = useState<{ id: number; name: string; description: string } | null>(null);
  const [isCloneDialogOpen, setIsCloneDialogOpen] = useState(false);
  const [cloneFormName, setCloneFormName] = useState('');
  const [formToClone, setFormToClone] = useState<{ id: number; name: string } | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { forms, loading, createForm, updateForm, deleteForm, getForm } = useApplicationForms();

  const handleCreateForm = async () => {
    if (!newFormName.trim()) {
      toast({
        title: "Error",
        description: "Form name cannot be empty",
        variant: "destructive",
      });
      return;
    }

    try {
      await createForm({
        name: newFormName.trim(),
        description: newFormDescription.trim() || undefined,
        sections: {},
        meta: {}
      });
      
      toast({
        title: "Success",
        description: "Application form created successfully",
      });
      
      setIsCreateDialogOpen(false);
      setNewFormName('');
      setNewFormDescription('');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create application form",
        variant: "destructive",
      });
    }
  };

  const handleEditForm = async () => {
    if (!editingForm) return;

    try {
      await updateForm(editingForm.id, {
        name: editingForm.name.trim(),
        description: editingForm.description.trim() || undefined,
      });
      
      toast({
        title: "Success",
        description: "Application form updated successfully",
      });
      
      setEditingForm(null);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update application form",
        variant: "destructive",
      });
    }
  };

  const handleDeleteForm = async (id: number, name: string) => {
    try {
      await deleteForm(id);
      toast({
        title: "Success",
        description: `Application form "${name}" deleted successfully`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete application form",
        variant: "destructive",
      });
    }
  };

  const handleConfigureForm = (formId: number, formName: string) => {
    navigate(`/settings/application-forms/create?id=${formId}&name=${encodeURIComponent(formName)}`);
  };

  const handleCloneForm = (formId: number, formName: string) => {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    const defaultCloneName = `${formName} - Copy ${today}`;
    setFormToClone({ id: formId, name: formName });
    setCloneFormName(defaultCloneName);
    setIsCloneDialogOpen(true);
  };

  const handleConfirmClone = async () => {
    if (!formToClone || !cloneFormName.trim()) {
      toast({
        title: "Error",
        description: "Clone name cannot be empty",
        variant: "destructive",
      });
      return;
    }

    try {
      // Get the original form data
      const originalForm = await getForm(formToClone.id);
      if (!originalForm) {
        throw new Error('Failed to fetch original form');
      }

      // Create the cloned form
      const clonedForm = await createForm({
        name: cloneFormName.trim(),
        description: originalForm.description || '',
        sections: originalForm.sections || {},
        meta: originalForm.meta || {}
      });

      toast({
        title: "Success",
        description: `Application form "${cloneFormName}" cloned successfully`,
      });

      // Navigate to the edit page for the new form
      navigate(`/settings/application-forms/create?id=${clonedForm.id}&name=${encodeURIComponent(clonedForm.name)}`);
      
      setIsCloneDialogOpen(false);
      setCloneFormName('');
      setFormToClone(null);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to clone application form",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusColors = {
      active: 'bg-green-100 text-green-800',
      draft: 'bg-yellow-100 text-yellow-800',
      inactive: 'bg-gray-100 text-gray-800',
    };
    
    return (
      <Badge className={statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'}>
        {status}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle>Application Forms</CardTitle>
            <CardDescription>
              Manage application forms used by candidates
            </CardDescription>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add New Form
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Application Form</DialogTitle>
                <DialogDescription>
                  Create a new application form. You can configure the form fields after creation.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="form-name">Form Name</Label>
                  <Input
                    id="form-name"
                    value={newFormName}
                    onChange={(e) => setNewFormName(e.target.value)}
                    placeholder="Enter form name"
                  />
                </div>
                <div>
                  <Label htmlFor="form-description">Description (Optional)</Label>
                  <Textarea
                    id="form-description"
                    value={newFormDescription}
                    onChange={(e) => setNewFormDescription(e.target.value)}
                    placeholder="Enter form description"
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateForm} disabled={!newFormName.trim() || loading}>
                  {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Create Form
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {loading && (!forms || forms.length === 0) ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              Loading application forms...
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Fields</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!forms || forms.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No application forms found. Click "Add New Form" to create one.
                    </TableCell>
                  </TableRow>
                ) : (
                  (forms || []).map((form) => (
                    <TableRow key={form.id}>
                      <TableCell className="font-medium">
                        <button
                          onClick={() => handleConfigureForm(form.id, form.name)}
                          className="text-left hover:underline hover:text-primary transition-colors"
                        >
                          {form.name}
                        </button>
                      </TableCell>
                      <TableCell>{form.description || 'No description'}</TableCell>
                      <TableCell>
                        {form.sections 
                          ? Object.values(form.sections).reduce((total, section) => {
                              return total + (section?.fields?.length || 0);
                            }, 0)
                          : 0} fields
                      </TableCell>
                      <TableCell>{form.createdAt ? format(new Date(form.createdAt), 'MMM d, yyyy') : 'Unknown'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleConfigureForm(form.id, form.name)}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Configure
                          </Button>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCloneForm(form.id, form.name)}
                          >
                            <Copy className="h-4 w-4 mr-1" />
                            Clone
                          </Button>
                          
                          <Dialog open={editingForm?.id === form.id} onOpenChange={(open) => !open && setEditingForm(null)}>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setEditingForm({ id: form.id, name: form.name, description: form.description || '' })}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Edit Application Form</DialogTitle>
                                <DialogDescription>
                                  Update the form name and description.
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <Label htmlFor="edit-form-name">Form Name</Label>
                                  <Input
                                    id="edit-form-name"
                                    value={editingForm?.name || ''}
                                    onChange={(e) => setEditingForm(prev => prev ? { ...prev, name: e.target.value } : null)}
                                    placeholder="Enter form name"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="edit-form-description">Description</Label>
                                  <Textarea
                                    id="edit-form-description"
                                    value={editingForm?.description || ''}
                                    onChange={(e) => setEditingForm(prev => prev ? { ...prev, description: e.target.value } : null)}
                                    placeholder="Enter form description"
                                    rows={3}
                                  />
                                </div>
                              </div>
                              <DialogFooter>
                                <Button variant="outline" onClick={() => setEditingForm(null)}>
                                  Cancel
                                </Button>
                                <Button onClick={handleEditForm} disabled={!editingForm?.name.trim() || loading}>
                                  {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                  Update Form
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Application Form</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{form.name}"? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteForm(form.id, form.name)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Clone Form Dialog */}
      <Dialog open={isCloneDialogOpen} onOpenChange={setIsCloneDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clone Application Form</DialogTitle>
            <DialogDescription>
              Create a copy of "{formToClone?.name}". Enter a name for the cloned form.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="clone-form-name">Clone Name</Label>
              <Input
                id="clone-form-name"
                value={cloneFormName}
                onChange={(e) => setCloneFormName(e.target.value)}
                placeholder="Enter clone name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCloneDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmClone} disabled={!cloneFormName.trim() || loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Clone Form
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ApplicationFormsManager;
