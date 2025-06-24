
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { API_BASE_URL } from '../config/env';

interface User {
  id: number;
  status: string;
}

interface StatusChangeFormProps {
  user: User;
  onUserUpdated: () => void;
}

const StatusChangeForm: React.FC<StatusChangeFormProps> = ({ user, onUserUpdated }) => {
  const [newStatus, setNewStatus] = useState(user.status);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const statusOptions = [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'pending', label: 'Pending' },
    { value: 'suspended', label: 'Suspended' },
  ];

  const getStatusBadge = (status: string) => {
    const statusColors: { [key: string]: string } = {
      'active': 'bg-green-100 text-green-800',
      'inactive': 'bg-gray-100 text-gray-800',
      'pending': 'bg-yellow-100 text-yellow-800',
      'suspended': 'bg-red-100 text-red-800',
    };
    
    return (
      <Badge className={statusColors[status] || 'bg-gray-100 text-gray-800'}>
        {status}
      </Badge>
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newStatus === user.status) {
      toast({
        title: "No Changes",
        description: "Status is the same as current status",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/admin/user/${user.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      toast({
        title: "Success",
        description: "Status updated successfully",
      });
      
      onUserUpdated();
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Change Status</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Current Status</label>
            <div>{getStatusBadge(user.status)}</div>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">New Status</label>
            <Select value={newStatus} onValueChange={setNewStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Updating...' : 'Update Status'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default StatusChangeForm;
