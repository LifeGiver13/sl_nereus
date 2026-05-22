import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import EditUserModal from '../components/EditUserModal';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Edit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { API_BASE_URL } from '../config/env';
import UserDocuments from '@/components/UserDocuments';
import UploadUserDocumentModal from '@/components/UploadUserDocumentModal';


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

const UserDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [user, setUser] = useState<User | null>(null);
  const [viewManager, setViewManager] = useState<ViewManager | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isViewLoading, setIsViewLoading] = useState(false);
  const { toast } = useToast();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);



  useEffect(() => {
    const fetchUserDetail = async () => {
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
        console.log('User detail data received:', data);
        setUser(data);
      } catch (error) {
        console.error('Error fetching user details:', error);
        toast({
          title: "Error",
          description: "Failed to fetch user details",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    const fetchViewManager = async () => {
      try {
        setIsViewLoading(true);
        const searchParams = encodeURIComponent(JSON.stringify({ name: "User Profile - Admin View" }));
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
          title: "Error",
          description: "Failed to load view configuration",
          variant: "destructive",
        });
      } finally {
        setIsViewLoading(false);
      }
    };

    if (id) {
      fetchUserDetail();
      fetchViewManager();
    }
  }, [id, toast]);

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

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  const renderProfileTable = (profile: { [key: string]: any }) => {
    if (!profile || typeof profile !== 'object') {
      return (
        <div className="text-sm text-gray-500">
          No profile data available
        </div>
      );
    }

    const entries = Object.entries(profile);
    if (entries.length === 0) {
      return (
        <div className="text-sm text-gray-500">
          No profile data available
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {entries.map(([key, value]) => (
          <div key={key} className="grid grid-cols-1 md:grid-cols-3 gap-2 py-2 border-b border-gray-100 last:border-b-0">
            <div className="font-medium text-gray-700 capitalize">
              {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
            </div>
            <div className="md:col-span-2 text-gray-900">
              {typeof value === 'object' ? (
                <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                  {JSON.stringify(value, null, 2)}
                </pre>
              ) : (
                String(value || 'N/A')
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const handleEditUser = () => {
    setIsEditModalOpen(true);
  };

  const handleUserUpdated = () => {
    // Refresh user data
    if (id) {
      const fetchUserDetail = async () => {
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
          console.log('User detail data received:', data);
          setUser(data);
        } catch (error) {
          console.error('Error fetching user details:', error);
          toast({
            title: "Error",
            description: "Failed to fetch user details",
            variant: "destructive",
          });
        } finally {
          setIsLoading(false);
        }
      };

      fetchUserDetail();
    }

    toast({
      title: "Success",
      description: "User updated successfully",
    });
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" asChild>
              <Link to="/people">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to People
              </Link>
            </Button>
          </div>
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="text-center py-12">
                <p className="text-gray-500">Loading user details...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    );
  }

  if (!user) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" asChild>
              <Link to="/people">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to People
              </Link>
            </Button>
          </div>
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="text-center py-12">
                <p className="text-red-500">User not found</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" asChild>
            <Link to="/people">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to People
            </Link>
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-[#000009]">{user.username}</h1>
            <p className="text-gray-600 mt-1">User Details</p>
          </div>
          <Button
            onClick={handleEditUser}
            className="bg-[#712B71] hover:bg-[#712B71]/90"
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit User
          </Button>
        </div>

        <div className="grid gap-6">
          {/* Basic Information */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-[#000009]">Basic Information</CardTitle>
              <CardDescription>Core user information</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 py-2 border-b border-gray-100">
                  <div className="font-medium text-gray-700">ID</div>
                  <div className="md:col-span-2 text-gray-900">{user.id}</div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 py-2 border-b border-gray-100">
                  <div className="font-medium text-gray-700">Username</div>
                  <div className="md:col-span-2 text-gray-900">{user.username}</div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 py-2 border-b border-gray-100">
                  <div className="font-medium text-gray-700">Status</div>
                  <div className="md:col-span-2">{getStatusBadge(user.status)}</div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 py-2 border-b border-gray-100">
                  <div className="font-medium text-gray-700">Role</div>
                  <div className="md:col-span-2">{getRoleBadge(user.role)}</div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 py-2 border-b border-gray-100">
                  <div className="font-medium text-gray-700">Last Login</div>
                  <div className="md:col-span-2 text-gray-900">{formatDate(user.lastLogin)}</div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 py-2 border-b border-gray-100">
                  <div className="font-medium text-gray-700">Created At</div>
                  <div className="md:col-span-2 text-gray-900">{formatDate(user.createdAt)}</div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 py-2">
                  <div className="font-medium text-gray-700">Updated At</div>
                  <div className="md:col-span-2 text-gray-900">{formatDate(user.updatedAt)}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Profile Information */}
          {user.profile && (
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-[#000009]">Profile Information</CardTitle>
                <CardDescription>User profile details organized by sections</CardDescription>
              </CardHeader>
              <CardContent>
                {isViewLoading ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">Loading view configuration...</p>
                  </div>
                ) : viewManager ? (
                  <Tabs defaultValue={Object.keys(viewManager.sections)[0]?.toLowerCase().replace(/\s+/g, '-')} className="space-y-4">
                    <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${Object.keys(viewManager.sections).length}, 1fr)` }}>
                      {Object.keys(viewManager.sections).map(sectionName => (
                        <TabsTrigger key={sectionName} value={sectionName.toLowerCase().replace(/\s+/g, '-')}>
                          {sectionName}
                        </TabsTrigger>
                      ))}
                    </TabsList>

                    {Object.entries(viewManager.sections).map(([sectionName, fields]) => (
                      <TabsContent key={sectionName} value={sectionName.toLowerCase().replace(/\s+/g, '-')}>
                        <div className="space-y-2">
                          {fields.map((field) => {
                            const value = user.profile[field.property];
                            return (
                              <div key={field.property} className="grid grid-cols-1 md:grid-cols-3 gap-2 py-2 border-b border-gray-100 last:border-b-0">
                                <div className="font-medium text-gray-700">
                                  {field.label}
                                </div>
                                <div className="md:col-span-2 text-gray-900">
                                  {typeof value === 'object' ? (
                                    <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                                      {JSON.stringify(value, null, 2)}
                                    </pre>
                                  ) : (
                                    String(value || 'N/A')
                                  )}
                                </div>
                              </div>
                            );
                          })}
                          {fields.length === 0 && (
                            <div className="text-sm text-gray-500">
                              No fields configured for this section
                            </div>
                          )}
                        </div>
                      </TabsContent>
                    ))}
                  </Tabs>
                ) : (
                  renderProfileTable(user.profile)
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <Card className="border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-[#000009]">
                User Documents
              </CardTitle>

              <CardDescription>
                User uploaded compliance documents
              </CardDescription>
            </div>

            <Button
              onClick={() =>
                setIsUploadModalOpen(true)
              }
              className="bg-[#712B71] hover:bg-[#712B71]/90"
            >
              Upload Document
            </Button>
          </CardHeader>
          <CardContent>
            {user && (
              <UserDocuments
                bucket={user.meta?.userBucket || user.username}
              />
            )}
          </CardContent>
        </Card>

        <EditUserModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          user={user}
          onUserUpdated={handleUserUpdated}
        />

        {user && (
          <UploadUserDocumentModal
            isOpen={isUploadModalOpen}
            onClose={() =>
              setIsUploadModalOpen(false)
            }
            user={user}
            onSuccess={handleUserUpdated}
          />
        )}

      </div>
    </AdminLayout>
  );
};

export default UserDetail;
