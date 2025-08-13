import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Save, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/utils';

interface ApplicationForm {
  id: number;
  name: string;
  description?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface ApplicationFormsResponse {
  total: number;
  results: ApplicationForm[];
}

const ApplicationFormsManager = () => {
  const [editingForm, setEditingForm] = useState<ApplicationForm | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newFormName, setNewFormName] = useState('');
  const [newFormDescription, setNewFormDescription] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch application forms
  const { data: formsData, isLoading, error } = useQuery<ApplicationFormsResponse>({
    queryKey: ['application-forms'],
    queryFn: async () => {
      const response = await apiRequest('/settings/application-forms');
      if (!response.ok) {
        throw new Error('Failed to fetch application forms');
      }
      return response.json();
    },
  });

  // Create new form mutation
  const createMutation = useMutation({
    mutationFn: async ({ name, description }: { name: string; description: string }) => {
      const response = await apiRequest('/settings/application-forms', {
        method: 'POST',
        body: JSON.stringify({ name, description }),
      });
      if (!response.ok) {
        throw new Error('Failed to create application form');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['application-forms'] });
      toast({
        title: "Success",
        description: "Application form created successfully",
      });
      setIsAddingNew(false);
      setNewFormName('');
      setNewFormDescription('');
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create application form",
        variant: "destructive",
      });
    },
  });

  // Update form mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, name, description }: { id: number; name: string; description: string }) => {
      const response = await apiRequest(`/settings/application-forms/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ name, description }),
      });
      if (!response.ok) {
        throw new Error('Failed to update application form');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['application-forms'] });
      toast({
        title: "Success",
        description: "Application form updated successfully",
      });
      setEditingForm(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update application form",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (form: ApplicationForm) => {
    setEditingForm(form);
    setEditName(form.name);
    setEditDescription(form.description || '');
  };

  const handleSave = () => {
    if (editingForm && editName.trim()) {
      updateMutation.mutate({
        id: editingForm.id,
        name: editName.trim(),
        description: editDescription.trim(),
      });
    }
  };

  const handleCancel = () => {
    setEditingForm(null);
    setEditName('');
    setEditDescription('');
  };

  const handleCreate = () => {
    if (newFormName.trim()) {
      createMutation.mutate({
        name: newFormName.trim(),
        description: newFormDescription.trim(),
      });
    }
  };

  const handleAddNew = () => {
    setIsAddingNew(true);
  };

  const handleCancelAdd = () => {
    setIsAddingNew(false);
    setNewFormName('');
    setNewFormDescription('');
  };

  if (isLoading) {
    return <div>Loading application forms...</div>;
  }

  if (error) {
    return <div>Error loading application forms</div>;
  }

  const forms = formsData?.results || [];

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
          <Button onClick={handleAddNew} disabled={isAddingNew}>
            <Plus className="h-4 w-4 mr-2" />
            Add New Form
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isAddingNew && (
                <TableRow>
                  <TableCell>
                    <Input
                      value={newFormName}
                      onChange={(e) => setNewFormName(e.target.value)}
                      placeholder="Form name"
                      autoFocus
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={newFormDescription}
                      onChange={(e) => setNewFormDescription(e.target.value)}
                      placeholder="Form description"
                    />
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">New</Badge>
                  </TableCell>
                  <TableCell>-</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        onClick={handleCreate}
                        disabled={!newFormName.trim() || createMutation.isPending}
                      >
                        <Save className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCancelAdd}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
              {forms.map((form) => (
                <TableRow key={form.id}>
                  <TableCell>
                    {editingForm?.id === form.id ? (
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        autoFocus
                      />
                    ) : (
                      form.name
                    )}
                  </TableCell>
                  <TableCell>
                    {editingForm?.id === form.id ? (
                      <Input
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        placeholder="Form description"
                      />
                    ) : (
                      form.description || '-'
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={form.status === 'active' ? 'default' : 'secondary'}>
                      {form.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(form.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {editingForm?.id === form.id ? (
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          onClick={handleSave}
                          disabled={!editName.trim() || updateMutation.isPending}
                        >
                          <Save className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleCancel}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(form)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {forms.length === 0 && !isAddingNew && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No application forms found. Click "Add New Form" to create one.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default ApplicationFormsManager;