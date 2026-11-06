import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { API_BASE_URL } from '../config/env';
import { apiRequest } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, GripVertical } from 'lucide-react';
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

type TabItem = {
  value: string;
  label: string;
  type: 'profile' | 'system'
}

const UserEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [viewManager, setViewManager] = useState<ViewManager | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isViewLoading, setIsViewLoading] = useState(false);

  //for tab movement
  const [draggedTab, setDraggedTab] = useState<string | null>(null);
  const [tabOrder, setTabOrder] = useState<TabItem[]>([])
  const [initialized, setInitialized] = useState(false);

  const [hasLoadedOrder, setHasLoadedOrder] = useState(false);

  

  useEffect(() => {
    if (!viewManager || initialized) return;

    const saved = localStorage.getItem('user-edit-tab-order');

    if (saved) {
      const savedValues = JSON.parse(saved);

      const orderedTabs = savedValues
        .map((value: string) =>
          defaultTabs.find(t => t.value === value)
        )
        .filter(Boolean) as TabItem[];

      const missingTabs = defaultTabs.filter(
        t => !savedValues.includes(t.value)
      );

      setTabOrder([...orderedTabs, ...missingTabs]);
      setHasLoadedOrder(true)
    } else {
      setTabOrder(defaultTabs);
    }

    setInitialized(true);
  }, [viewManager]);


  useEffect(() => {
    if (!tabOrder.length) return;

    localStorage.setItem(
      'user-edit-tab-order',
      JSON.stringify(tabOrder.map(t => t.value))
    );
  }, [tabOrder]);

  // useEffect(() => {
  //   console.log('defaultTabs', defaultTabs);
  //   console.log('tabOrder', tabOrder);
  //   console.log(tabOrder.map(t => t.label));
  // }, [tabOrder]);

  const moveTab = (dragValue: string, dropValue: string) => {
    const updated = [...tabOrder];

    const dragIndex = updated.findIndex(
      t => t.value === dragValue
    );

    const dropIndex = updated.findIndex(
      t => t.value === dropValue
    )

    if (dragIndex === -1 || dropIndex === -1) return;

    const [dragged] = updated.splice(dragIndex, 1);

    updated.splice(dropIndex, 0, dragged);

    setTabOrder(updated)


  }



  useEffect(() => {
    const fetchUser = async () => {
      try {
        setIsLoading(true);
        const response = await apiRequest(`/user/${id}`, {
          method: 'GET',
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
      const response = await apiRequest(`/user/${id}`, {
        method: 'GET',
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
    { value: 'role', label: 'Role' },
    { value: 'status', label: 'Status' },
    { value: 'username', label: 'Username' },
    { value: 'password', label: 'Password' },
  ];


  const preferredProfileOrder = [
    'Basic Information',
    'Contact Information',
    'Address',
    'Admin Details',
  ];

  const profileTabs = viewManager
    ? preferredProfileOrder
      .filter(section => viewManager.sections[section])
      .map(section => ({
        value: section.toLowerCase().replace(/\s+/g, '-'),
        label: section,
      }))
    : [{ value: 'profile', label: 'Profile' }];


  const allTabs = [...profileTabs, ...systemTabs];

  const defaultTabs: TabItem[] = [
    ...profileTabs.map(tab => ({
      ...tab,
      type: 'profile' as const,
    })),
    ...systemTabs.map(tab => ({
      ...tab,
      type: 'system' as const,
    }))
  ];

  const defaultTabValue =
    defaultTabs[0]?.value || 'profile';

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
              <Tabs defaultValue={defaultTabValue} className="space-y-4">
                <div className="overflow-x-auto pb-2">
                  <TabsList className="inline-flex h-auto w-max min-w-full flex-nowrap gap-2">
                    <GripVertical className="h-3 w-3 mr-1" />
                    {tabOrder.map((tab) => (
                      <TabsTrigger
                        key={tab.value}
                        value={tab.value}
                        draggable
                        onDragStart={() => setDraggedTab(tab.value)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => {
                          if (draggedTab && draggedTab !== tab.value) {
                            moveTab(draggedTab, tab.value);
                          }
                        }}
                        className="whitespace-nowrap cursor-move   hover:bg-accent
"
                      >
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
