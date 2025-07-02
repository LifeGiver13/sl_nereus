
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ProfileEditForm from './ProfileEditForm';
import UsernameChangeForm from './UsernameChangeForm';
import StatusChangeForm from './StatusChangeForm';
import RoleChangeForm from './RoleChangeForm';
import { useToast } from '@/hooks/use-toast';
import { API_BASE_URL } from '../config/env';

type ViewField = {
  property: string;
  label: string;
  type: 'text' | 'image' | 'document';
  meta: { [key: string]: any };
};

type ViewSection = {
  [sectionName: string]: ViewField[];
};

interface ViewManager {
  id?: number;
  name: string;
  sections: ViewSection;
  meta: { [key: string]: any };
}

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

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onUserUpdated: () => void;
}

const EditUserModal: React.FC<EditUserModalProps> = ({
  isOpen,
  onClose,
  user,
  onUserUpdated
}) => {
  const [viewManager, setViewManager] = useState<ViewManager | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchViewManager = async () => {
      try {
        setLoading(true);
        const searchParams = encodeURIComponent(JSON.stringify({ name: "User Profile - Admin View" }));
        const response = await fetch(`${API_BASE_URL}/utils/view-managers?search=${searchParams}`);
        if (response.ok) {
          const data = await response.json();
          if (data.length > 0) {
            setViewManager(data[0]);
          }
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to load view configuration",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    if (isOpen && user) {
      fetchViewManager();
    }
  }, [isOpen, user, toast]);

  if (!user) return null;

  const handleUserUpdated = () => {
    onUserUpdated();
  };

  // Generate tabs from view manager sections plus system tabs
  const systemTabs = [
    { value: "username", label: "Username" },
    { value: "status", label: "Status" },
    { value: "role", label: "Role" }
  ];

  const profileTabs = viewManager ? Object.keys(viewManager.sections).map(sectionName => ({
    value: sectionName.toLowerCase().replace(/\s+/g, '-'),
    label: sectionName
  })) : [{ value: "profile", label: "Profile" }];

  const allTabs = [...profileTabs, ...systemTabs];
  const defaultTab = profileTabs[0]?.value || "profile";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit User: {user.username}</DialogTitle>
        </DialogHeader>
        
        {loading ? (
          <div className="text-center py-8">
            <p className="text-gray-500">Loading view configuration...</p>
          </div>
        ) : (
          <Tabs defaultValue={defaultTab} className="space-y-4">
            <TabsList className={`grid w-full`} style={{ gridTemplateColumns: `repeat(${allTabs.length}, 1fr)` }}>
              {allTabs.map(tab => (
                <TabsTrigger key={tab.value} value={tab.value}>
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
            
            {/* Profile section tabs */}
            {viewManager && Object.entries(viewManager.sections).map(([sectionName, fields]) => (
              <TabsContent key={sectionName.toLowerCase().replace(/\s+/g, '-')} value={sectionName.toLowerCase().replace(/\s+/g, '-')}>
                <ProfileEditForm 
                  user={user} 
                  onUserUpdated={handleUserUpdated}
                  sectionName={sectionName}
                  fields={fields}
                />
              </TabsContent>
            ))}
            
            {/* Fallback for when no view manager is loaded */}
            {!viewManager && (
              <TabsContent value="profile">
                <ProfileEditForm 
                  user={user} 
                  onUserUpdated={handleUserUpdated} 
                />
              </TabsContent>
            )}
            
            <TabsContent value="username">
              <UsernameChangeForm 
                user={user} 
                onUserUpdated={handleUserUpdated} 
              />
            </TabsContent>
            
            <TabsContent value="status">
              <StatusChangeForm 
                user={user} 
                onUserUpdated={handleUserUpdated} 
              />
            </TabsContent>
            
            <TabsContent value="role">
              <RoleChangeForm 
                user={user} 
                onUserUpdated={handleUserUpdated} 
              />
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default EditUserModal;
