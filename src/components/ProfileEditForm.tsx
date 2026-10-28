import React, { useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { API_BASE_URL } from '../config/env';
import { AlertCircle } from 'lucide-react';

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

const ProfileEditForm: React.FC<ProfileEditFormProps> = ({
  user,
  onUserUpdated,
  sectionName,
  fields,
}) => {
  const storageKey = `user-${user.id}-${sectionName || 'profile'}-draft`;
  const { toast } = useToast();

  // Initialize with draft if exists, otherwise use user.profile
  const [profile, setProfile] = useState<{ [key: string]: any }>(() => {
    const savedDraft = localStorage.getItem(storageKey);
    if (savedDraft) {
      try {
        return JSON.parse(savedDraft);
      } catch (e) {
        console.error('Failed to parse draft', e);
      }
    }
    return user.profile || {};
  });

  const [isLoading, setIsLoading] = useState(false);

  // Check if there are unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    return JSON.stringify(profile) !== JSON.stringify(user.profile || {});
  }, [profile, user.profile]);

  // Sync with latest user data when it changes 
  useEffect(() => {
    const savedDraft = localStorage.getItem(storageKey);
    if (!savedDraft) {
      setProfile(user.profile || {});
    }
  }, [user.profile, storageKey]);

  // Persist draft to localStorage whenever profile changes
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(profile));
  }, [profile, storageKey]);

  const handleInputChange = (key: string, value: any) => {
    setProfile((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const profileToSave = fields
        ? Object.fromEntries(
          fields.map((field) => [
            field.property,
            profile[field.property] ?? '',
          ])
        )
        : Object.fromEntries(
          Object.entries(profile).filter(([key, value]) =>
            JSON.stringify(value) !== JSON.stringify(user.profile?.[key])
          )
        );

      const response = await fetch(`${API_BASE_URL}/user/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile: profileToSave }),
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      toast({ title: "Success", description: "Profile updated successfully" });

      // Clear draft after successful save
      localStorage.removeItem(storageKey);
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

  const discardChanges = () => {
    setProfile(user.profile || {});
    localStorage.removeItem(storageKey);
    toast({
      title: 'Draft discarded',
      description: 'Unsaved changes have been removed',
    });
  };

  const displayProfile = fields
    ? Object.fromEntries(
      fields.map((field) => [field.property, profile[field.property] ?? ''])
    )
    : profile;

  const renderProfileField = (key: string, value: any, field?: ViewField) => {
    const label =
      field?.label ||
      key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase());

    if (typeof value === 'object' && value !== null) {
      return (
        <div key={key} className="space-y-2">
          <label className="text-sm font-medium">{label}</label>
          <Textarea
            value={JSON.stringify(value, null, 2)}
            onChange={(e) => {
              try {
                handleInputChange(key, JSON.parse(e.target.value));
              } catch {
                handleInputChange(key, e.target.value);
              }
            }}
            rows={4}
          />
        </div>
      );
    }

    return (
      <div key={key} className="space-y-2">
        <label className="text-sm font-medium">{label}</label>
        <Input
          value={String(value ?? '')}
          onChange={(e) => handleInputChange(key, e.target.value)}
        />
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          {sectionName || 'Profile Information'}
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
          {Object.entries(displayProfile).map(([key, value]) => {
            const field = fields?.find((f) => f.property === key);
            return renderProfileField(key, value, field);
          })}

          <div className="flex justify-end gap-3 pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={discardChanges}
              disabled={!hasUnsavedChanges}
            >
              Discard Changes
            </Button>
            <Button type="submit" disabled={isLoading || !hasUnsavedChanges}>
              {isLoading ? 'Updating...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default ProfileEditForm;