import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import EditClientModal from '../components/EditClientModal';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Building, Mail, Phone, MapPin, User, Clock, Edit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { API_BASE_URL } from '../config/env';
import { getNestedProperty } from '@/lib/utils';

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

interface Client {
  id: number;
  name: string;
  status: string;
  profile: {
    address: {
      town: string;
      line1: string;
      line2: string;
      line3: string;
      branch: string;
      county: string;
      postcode: string;
    };
    contact: {
      fax: string;
      role: string;
      mobile: string;
      lastName: string;
      firstName: string;
      telephone: string;
      salutation: string;
    };
  };
  meta: any;
  createdAt: string;
  updatedAt: string;
}

const ClientDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [client, setClient] = useState<Client | null>(null);
  const [viewManager, setViewManager] = useState<ViewManager | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isViewLoading, setIsViewLoading] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchClient = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`${API_BASE_URL}/client/${id}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: Client = await response.json();
        console.log('Client data received:', data);
        setClient(data);
      } catch (error) {
        console.error('Error fetching client:', error);
        toast({
          title: "Error",
          description: "Failed to fetch client details",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    const fetchViewManager = async () => {
      try {
        setIsViewLoading(true);
        const searchParams = encodeURIComponent(JSON.stringify({ name: "Client Profile - Admin View" }));
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
      fetchClient();
      fetchViewManager();
    }
  }, [id, toast]);

  const handleEditClient = () => {
    setIsEditModalOpen(true);
  };

  const handleClientUpdated = () => {
    // Refresh client data
    if (id) {
      const fetchClient = async () => {
        try {
          setIsLoading(true);
          const response = await fetch(`${API_BASE_URL}/client/${id}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const data: Client = await response.json();
          console.log('Client data received:', data);
          setClient(data);
        } catch (error) {
          console.error('Error fetching client:', error);
          toast({
            title: "Error",
            description: "Failed to fetch client details",
            variant: "destructive",
          });
        } finally {
          setIsLoading(false);
        }
      };

      fetchClient();
    }

    toast({
      title: "Success",
      description: "Client updated successfully",
    });
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

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-gray-500">Loading client details...</p>
        </div>
      </AdminLayout>
    );
  }

  if (!client) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="outline" asChild>
              <Link to="/clients">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Clients
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-[#000009]">Client Not Found</h1>
              <p className="text-gray-600 mt-1">The requested client could not be found.</p>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const formatAddress = () => {
    const { address } = client.profile;
    const parts = [
      address.line1,
      address.line2,
      address.line3,
      address.town,
      address.county,
      address.postcode
    ].filter(Boolean);

    return parts.length > 0 ? parts.join(', ') : 'No address provided';
  };

  const getContactName = () => {
    const { contact } = client.profile;
    const parts = [contact.salutation, contact.firstName, contact.lastName].filter(Boolean);
    return parts.length > 0 ? parts.join(' ') : 'No contact name';
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" asChild>
              <Link to="/clients">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Clients
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-[#000009]">{client.name}</h1>
              <p className="text-gray-600 mt-1">Client ID: {client.id}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleEditClient}
              className="bg-[#712B71] hover:bg-[#712B71]/90"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit Client
            </Button>
            <Button asChild>
              <Link to={`/client/${client.id}/shifts`}>
                <Clock className="h-4 w-4 mr-2" />
                Manage Shifts
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-6">
          {/* Basic Information */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-[#000009]">Basic Information</CardTitle>
              <CardDescription>Core client information</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 py-2 border-b border-gray-100">
                  <div className="font-medium text-gray-700">ID</div>
                  <div className="md:col-span-2 text-gray-900">{client.id}</div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 py-2 border-b border-gray-100">
                  <div className="font-medium text-gray-700">Company Name</div>
                  <div className="md:col-span-2 text-gray-900">{client.name}</div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 py-2 border-b border-gray-100">
                  <div className="font-medium text-gray-700">Status</div>
                  <div className="md:col-span-2">
                    <Badge
                      variant={client.status === 'active' ? 'default' : 'secondary'}
                      className={client.status === 'active' ? 'bg-green-100 text-green-800' : ''}
                    >
                      {client.status.charAt(0).toUpperCase() + client.status.slice(1)}
                    </Badge>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 py-2 border-b border-gray-100">
                  <div className="font-medium text-gray-700">Created At</div>
                  <div className="md:col-span-2 text-gray-900">{new Date(client.createdAt).toLocaleString()}</div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 py-2">
                  <div className="font-medium text-gray-700">Updated At</div>
                  <div className="md:col-span-2 text-gray-900">{new Date(client.updatedAt).toLocaleString()}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Profile Information */}
          {client.profile && (
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-[#000009]">Profile Information</CardTitle>
                <CardDescription>Client profile details organized by sections</CardDescription>
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
                            const value = getNestedProperty(client.profile, field.property);
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
                  renderProfileTable(client.profile)
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <EditClientModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          client={client}
          onClientUpdated={handleClientUpdated}
        />
      </div>
    </AdminLayout>
  );
};

export default ClientDetail;
