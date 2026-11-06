
import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/utils';
import { AlertCircle } from 'lucide-react';

interface User {
  id: number;
  role: string;
}

interface RoleChangeFormProps {
  user: User;
  onUserUpdated: () => void;
}

const RoleChangeForm: React.FC<RoleChangeFormProps> = ({ user, onUserUpdated }) => {
  const storageKey = `user-${user.id}-role-draft`;

  const [newRole, setNewRole] = useState(() => {
    const saved = localStorage.getItem(storageKey);
    return saved ? JSON.parse(saved) : user.role;
  });

  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(newRole));
  }, [newRole]);

  const hasUnsavedChanges = newRole !== user.role;

  const discardChanges = () => {
    setNewRole(user.role);
    localStorage.removeItem(storageKey);

    toast({
      title: 'Changes discarded',
      description: 'Role reset to original value',
    });
  };
  const roleOptions = [
    { value: 'applicant', label: 'Applicant' },
    { value: 'worker', label: 'Worker' },
    { value: 'client', label: 'Client' },
    { value: 'admin', label: 'Admin' },
    { value: 'super_admin', label: 'Super Admin' },
  ];

  const getRoleBadge = (role: string) => {
    const roleColors: { [key: string]: string } = {
      'applicant': 'bg-blue-100 text-blue-800',
      'worker': 'bg-green-100 text-green-800',
      'client': 'bg-purple-100 text-purple-800',
      'admin': 'bg-orange-100 text-orange-800',
      'super_admin': 'bg-red-100 text-red-800',
    };

    return (
      <Badge className={roleColors[role] || 'bg-gray-100 text-gray-800'}>
        {role}
      </Badge>
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newRole === user.role) {
      toast({
        title: "No Changes",
        description: "Role is the same as current role",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await apiRequest(`/admin/user/${user.id}/role`, {
        method: 'PUT',
        body: JSON.stringify({ role: newRole }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      toast({
        title: "Success",
        description: "Role updated successfully",
      });

      onUserUpdated();
    } catch (error) {
      console.error('Error updating role:', error);
      toast({
        title: "Error",
        description: "Failed to update role",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Change Role
          {hasUnsavedChanges && (
            <span className="text-sm text-red-600 flex items-center gap-1 font-medium">
              <AlertCircle className="h-4 w-4" />
              Unsaved changes
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Current Role</label>
            <div>{getRoleBadge(user.role)}</div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">New Role</label>
            <Select value={newRole} onValueChange={setNewRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {roleOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={discardChanges}
              disabled={!hasUnsavedChanges}
            >
              Discard
            </Button>

            <Button type="submit" disabled={isLoading || !hasUnsavedChanges}>
              {isLoading ? 'Updating...' : 'Update Role'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default RoleChangeForm;
