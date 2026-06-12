
import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { API_BASE_URL } from '../config/env';
import { AlertCircle } from 'lucide-react';

interface User {
  id: number;
  username: string;
}

interface UsernameChangeFormProps {
  user: User;
  onUserUpdated: () => void;
}

const UsernameChangeForm: React.FC<UsernameChangeFormProps> = ({ user, onUserUpdated }) => {
  const storageKey = `user-${user.id}-username-draft`;

  const [newUsername, setNewUsername] = useState(() => {
    return localStorage.getItem(storageKey) || user.username;
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    localStorage.setItem(storageKey, newUsername);
  }, [newUsername]);

  const discardChanges = () => {
    setNewUsername(user.username || '');
    localStorage.removeItem(storageKey);
    toast({
      title: 'Draft discarded',
      description: 'Unsaved changes have been removed',
    });
  };

  const hasUnsavedChanges = useMemo(() => {
    return JSON.stringify(newUsername) !== JSON.stringify(user.username || {});
  }, [newUsername, user.username]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newUsername === user.username) {
      toast({
        title: "No Changes",
        description: "Username is the same as current username",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/user/${user.id}/username`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: newUsername }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      toast({
        title: "Success",
        description: "Username updated successfully",

      });

      localStorage.removeItem(storageKey);



      onUserUpdated();
    } catch (error) {
      console.error('Error updating username:', error);
      toast({
        title: "Error",
        description: "Failed to update username",
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
          Change Username
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
            <label className="text-sm font-medium">Current Username</label>
            <Input value={user.username} disabled className="bg-gray-100" />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">New Username</label>
            <Input
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              required
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={discardChanges}
              disabled={!hasUnsavedChanges}
            >
              Discard Changes
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Updating...' : 'Update Username'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default UsernameChangeForm;
