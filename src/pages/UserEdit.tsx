import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { API_BASE_URL } from '../config/env';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft } from 'lucide-react';
import ProfileEditForm from '@/components/ProfileEditForm';
import UsernameChangeForm from '@/components/UsernameChangeForm';
import StatusChangeForm from '@/components/StatusChangeForm';
import RoleChangeForm from '@/components/RoleChangeForm';
import PasswordChangeForm from '@/components/PasswordChangeForm';

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

const UserEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [viewManager, setViewManager] = useState<ViewManager | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isViewLoading, setIsViewLoading] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`${API_BASE_URL}/user/${id}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: User = await response.json();
        setUser(data);
      } catch (error) {
        console.error('Error fetching user:', error);
        toast({
          title: 'Error',
          description: 'Failed to fetch user details',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    const fetchViewManager = async () => {
      try {
        setIsViewLoading(true);
        const searchParams = encodeURIComponent(JSON.stringify({ name: 'User Profile - Admin View' }));
        const response = await fetch(`${API_BASE_URL}/utils/view-managers?search=${searchParams}`);
        if (response.ok) {
          const data = await response.json();
          if (data.length > 0) {
            setViewManager(data[0]);
          }
        }
      } catch (error) {
        console.error('Error fetching view manager:', error);
        toast({
          title: 'Error',
          description: 'Failed to load view configuration',
          variant: 'destructive',
        });
      } finally {
        setIsViewLoading(false);
      }
    };

    if (id) {
      fetchUser();
      fetchViewManager();
    }
  }, [id, toast]);

  const handleUserUpdated = async () => {
    if (!id) return;

    try {
      const response = await fetch(`${API_BASE_URL}/user/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        const data: User = await response.json();
        setUser(data);
      }
    } catch (error) {
      console.error('Error refreshing user details:', error);
    }

    toast({
      title: 'Success',
      description: 'User updated successfully',
    });
  };

  const systemTabs = [
    { value: 'username', label: 'Username' },
    { value: 'status', label: 'Status' },
    { value: 'role', label: 'Role' },
    { value: 'password', label: 'Password' },
  ];

  const profileTabs = viewManager
    ? Object.keys(viewManager.sections).map((sectionName) => ({
        value: sectionName.toLowerCase().replace(/\s+/g, '-'),
        label: sectionName,
      }))
    : [{ value: 'profile', label: 'Profile' }];

  const allTabs = [...profileTabs, ...systemTabs];
  const defaultTab = profileTabs[0]?.value || 'profile';

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" asChild>
              <Link to={id ? `/user/${id}` : '/people'}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-[#000009]">Edit User</h1>
              <p className="text-gray-600 mt-1">{user ? user.username : 'Loading user...'}</p>
            </div>
          </div>
          {id && (
            <Button variant="outline" onClick={() => navigate(`/user/${id}`)}>
              View User
            </Button>
          )}
        </div>

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-[#000009]">User Settings</CardTitle>
            <CardDescription>Update profile and account configuration</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading || !user ? (
              <div className="text-center py-12 text-gray-500">Loading user details...</div>
            ) : (
              <Tabs defaultValue={defaultTab} className="space-y-4">
                <div className="overflow-x-auto pb-2">
                  <TabsList className="inline-flex h-auto w-max min-w-full flex-nowrap gap-2">
                    {allTabs.map((tab) => (
                      <TabsTrigger key={tab.value} value={tab.value} className="whitespace-nowrap">
                        {tab.label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </div>

                {isViewLoading ? (
                  <div className="text-center py-8 text-gray-500">Loading view configuration...</div>
                ) : (
                  <>
                    {viewManager &&
                      Object.entries(viewManager.sections).map(([sectionName, fields]) => (
                        <TabsContent key={sectionName.toLowerCase().replace(/\s+/g, '-')} value={sectionName.toLowerCase().replace(/\s+/g, '-')}>
                          <ProfileEditForm
                            user={user}
                            onUserUpdated={handleUserUpdated}
                            sectionName={sectionName}
                            fields={fields}
                          />
                        </TabsContent>
                      ))}

                    {!viewManager && (
                      <TabsContent value="profile">
                        <ProfileEditForm user={user} onUserUpdated={handleUserUpdated} />
                      </TabsContent>
                    )}

                    <TabsContent value="username">
                      <UsernameChangeForm user={user} onUserUpdated={handleUserUpdated} />
                    </TabsContent>

                    <TabsContent value="status">
                      <StatusChangeForm user={user} onUserUpdated={handleUserUpdated} />
                    </TabsContent>

                    <TabsContent value="role">
                      <RoleChangeForm user={user} onUserUpdated={handleUserUpdated} />
                    </TabsContent>

                    <TabsContent value="password">
                      <PasswordChangeForm user={user} onUserUpdated={handleUserUpdated} />
                    </TabsContent>
                  </>
                )}
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default UserEdit;
