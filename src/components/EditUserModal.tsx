
import React, { useState } from 'react';
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
  if (!user) return null;

  const handleUserUpdated = () => {
    onUserUpdated();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit User: {user.username}</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="profile" className="space-y-4">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="username">Username</TabsTrigger>
            <TabsTrigger value="status">Status</TabsTrigger>
            <TabsTrigger value="role">Role</TabsTrigger>
          </TabsList>
          
          <TabsContent value="profile">
            <ProfileEditForm 
              user={user} 
              onUserUpdated={handleUserUpdated} 
            />
          </TabsContent>
          
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
      </DialogContent>
    </Dialog>
  );
};

export default EditUserModal;
