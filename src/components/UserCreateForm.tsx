import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { API_BASE_URL } from '../config/env';

interface UserCreateFormProps {
  onUserCreated: () => void;
  onCancel: () => void;
}

const UserCreateForm: React.FC<UserCreateFormProps> = ({ onUserCreated, onCancel }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    username: '',
    forename: '',
    lastname: '',
    middlename: '',
    role: '',
    status: 'active'
  });

  const roleOptions = [
    { value: 'applicant', label: 'Job Applicant' },
    { value: 'worker', label: 'Worker' },
    { value: 'client', label: 'Client' },
    { value: 'admin', label: 'Administrator' },
    { value: 'super_admin', label: 'Super Administrator' }
  ];

  const handleInputChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsSubmitting(true);

    try {
      const payload = {
        username: formData.username,
        role: formData.role,
        status: formData.status,
        profile: {
          forename: formData.forename,
          lastname: formData.lastname,
          ...(formData.middlename ? { middlename: formData.middlename } : {})
        }
      };

      console.log('Sending user creation request to:', `${API_BASE_URL}/user`);
      console.log('Payload:', payload);

      const response = await fetch(`${API_BASE_URL}/user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message ||
          data?.error ||
          'Failed to create user'
        );
      }

      toast({
        title: "Success",
        description: "User created successfully",
      });

      onUserCreated();
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create user",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="text-[#000009]">Create New User</CardTitle>
        <CardDescription>  Add a new user to the system. Login details will be sent by email. </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Username (Email) *</label>
            <Input
              type="email"
              required
              value={formData.username}
              onChange={(e) => handleInputChange('username', e.target.value)}
              placeholder="Enter email address"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Forename *</label>
            <Input
              type="text"
              required
              value={formData.forename}
              onChange={(e) => handleInputChange('forename', e.target.value)}
              placeholder="First name"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Middle Name</label>
            <Input
              type="text"
              value={formData.middlename}
              onChange={(e) => handleInputChange('middlename', e.target.value)}
              placeholder="Middle name (optional)"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Last Name *</label>
            <Input
              type="text"
              required
              value={formData.lastname}
              onChange={(e) => handleInputChange('lastname', e.target.value)}
              placeholder="Last name"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Role *</label>
            <Select value={formData.role} onValueChange={(value) => handleInputChange('role', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select user role" />
              </SelectTrigger>
              <SelectContent>
                {roleOptions.map((role) => (
                  <SelectItem key={role.value} value={role.value}>
                    {role.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Status</label>
            <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end space-x-4 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !formData.username || !formData.role || !formData.forename || !formData.lastname}
              className="bg-[#712B71] hover:bg-[#712B71]/90"
            >
              {isSubmitting ? 'Creating...' : 'Create User'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default UserCreateForm;