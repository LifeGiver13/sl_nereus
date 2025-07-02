
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { API_BASE_URL } from '../config/env';

type ViewField = {
  property: string;
  label: string;
  type: 'text' | 'image' | 'document';
  meta: { [key: string]: any };
};

interface User {
  id: number;
  username: string;
  status: string;
  role: string;
  lastLogin: string;
  createdAt: string;
  updatedAt: string;
  profile: { [key: string]: any };
  meta: { [key: string]: any };
}

interface ProfileEditFormProps {
  user: User;
  onUserUpdated: () => void;
  sectionName?: string;
  fields?: ViewField[];
}

const ProfileEditForm: React.FC<ProfileEditFormProps> = ({ user, onUserUpdated, sectionName, fields }) => {
  const [profile, setProfile] = useState(user.profile || {});
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // If fields are provided, filter profile data to only show those fields
  const displayProfile = fields ? 
    Object.fromEntries(
      fields.map(field => [field.property, profile[field.property] || ''])
    ) : profile;

  const handleInputChange = (key: string, value: any) => {
    setProfile(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const updatedUser = {
        ...user,
        profile
      };

      const response = await fetch(`${API_BASE_URL}/user/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedUser),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
      
      onUserUpdated();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderProfileField = (key: string, value: any, field?: ViewField) => {
    const label = field?.label || key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
    
    if (typeof value === 'object' && value !== null) {
      return (
        <div key={key} className="space-y-2">
          <label className="text-sm font-medium">{label}</label>
          <Textarea
            value={JSON.stringify(value, null, 2)}
            onChange={(e) => {
              try {
                const parsedValue = JSON.parse(e.target.value);
                handleInputChange(key, parsedValue);
              } catch {
                // Keep the string value for now
                handleInputChange(key, e.target.value);
              }
            }}
            rows={3}
          />
        </div>
      );
    }

    return (
      <div key={key} className="space-y-2">
        <label className="text-sm font-medium">{label}</label>
        <Input
          value={String(value || '')}
          onChange={(e) => handleInputChange(key, e.target.value)}
        />
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{sectionName || 'Profile Information'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {Object.entries(displayProfile).map(([key, value]) => {
            const field = fields?.find(f => f.property === key);
            return renderProfileField(key, value, field);
          })}
          
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Updating...' : 'Update Profile'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default ProfileEditForm;
