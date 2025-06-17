
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API_BASE_URL } from '../config/env';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Edit, Check, X, Trash2 } from 'lucide-react';

interface Department {
  id: number;
  name: string;
  status: string;
}

interface DepartmentsResponse {
  total: number;
  results: Department[];
}

const DepartmentManagement = () => {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [newDepartmentName, setNewDepartmentName] = useState('');
  const [isAddingNew, setIsAddingNew] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/settings/departments`);
      if (!response.ok) {
        throw new Error('Failed to fetch departments');
      }
      return response.json() as Promise<DepartmentsResponse>;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await fetch(`${API_BASE_URL}/settings/department`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, status: 'active' }),
      });
      if (!response.ok) {
        throw new Error('Failed to create department');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      setNewDepartmentName('');
      setIsAddingNew(false);
      toast({
        title: "Success",
        description: "Department created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create department",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, name }: { id: number; name: string }) => {
      const response = await fetch(`${API_BASE_URL}/settings/department/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name }),
      });
      if (!response.ok) {
        throw new Error('Failed to update department');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      setEditingId(null);
      setEditName('');
      toast({
        title: "Success",
        description: "Department updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update department",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (department: Department) => {
    setEditingId(department.id);
    setEditName(department.name);
  };

  const handleSave = () => {
    if (editingId && editName.trim()) {
      updateMutation.mutate({ id: editingId, name: editName.trim() });
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditName('');
  };

  const handleCreate = () => {
    if (newDepartmentName.trim()) {
      createMutation.mutate(newDepartmentName.trim());
    }
  };

  const handleAddNew = () => {
    setIsAddingNew(true);
    setNewDepartmentName('');
  };

  const handleCancelAdd = () => {
    setIsAddingNew(false);
    setNewDepartmentName('');
  };

  if (isLoading) {
    return <div>Loading departments...</div>;
  }

  if (error) {
    return <div>Error loading departments</div>;
  }

  const departments = data?.results || [];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Departments</h3>
        {!isAddingNew && (
          <Button onClick={handleAddNew} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Department
          </Button>
        )}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isAddingNew && (
            <TableRow>
              <TableCell>-</TableCell>
              <TableCell>
                <Input
                  value={newDepartmentName}
                  onChange={(e) => setNewDepartmentName(e.target.value)}
                  placeholder="Department name"
                  className="w-full"
                />
              </TableCell>
              <TableCell>
                <Badge variant="secondary">Active</Badge>
              </TableCell>
              <TableCell>
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    onClick={handleCreate}
                    disabled={!newDepartmentName.trim() || createMutation.isPending}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCancelAdd}
                    disabled={createMutation.isPending}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          )}
          {departments.map((department) => (
            <TableRow key={department.id}>
              <TableCell>{department.id}</TableCell>
              <TableCell>
                {editingId === department.id ? (
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full"
                  />
                ) : (
                  <span>{department.name}</span>
                )}
              </TableCell>
              <TableCell>
                <Badge variant={department.status === 'active' ? 'default' : 'secondary'}>
                  {department.status}
                </Badge>
              </TableCell>
              <TableCell>
                {editingId === department.id ? (
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      onClick={handleSave}
                      disabled={!editName.trim() || updateMutation.isPending}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCancel}
                      disabled={updateMutation.isPending}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(department)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
          {departments.length === 0 && !isAddingNew && (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-gray-500">
                No departments found
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default DepartmentManagement;
