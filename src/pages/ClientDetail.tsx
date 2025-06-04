
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { API_BASE_URL } from '../config/env';

interface Client {
  id: number;
  name: string;
  status: string;
  profile: any;
  meta: any;
}

const ClientDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [client, setClient] = useState<Client | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchClientDetail = async () => {
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
        console.log('Client detail data received:', data);
        setClient(data);
      } catch (error) {
        console.error('Error fetching client details:', error);
        toast({
          title: "Error",
          description: "Failed to fetch client details",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchClientDetail();
    }
  }, [id, toast]);

  const renderObjectAsTable = (obj: any, title: string) => {
    if (!obj || typeof obj !== 'object') {
      return (
        <div className="text-sm text-gray-500">
          No {title.toLowerCase()} data available
        </div>
      );
    }

    const entries = Object.entries(obj);
    if (entries.length === 0) {
      return (
        <div className="text-sm text-gray-500">
          No {title.toLowerCase()} data available
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
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" asChild>
              <Link to="/clients">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Clients
              </Link>
            </Button>
          </div>
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="text-center py-12">
                <p className="text-gray-500">Loading client details...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    );
  }

  if (!client) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" asChild>
              <Link to="/clients">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Clients
              </Link>
            </Button>
          </div>
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="text-center py-12">
                <p className="text-red-500">Client not found</p>
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
            <Link to="/clients">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Clients
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-[#000009]">{client.name}</h1>
            <p className="text-gray-600 mt-1">Client Details</p>
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
                  <div className="font-medium text-gray-700">Name</div>
                  <div className="md:col-span-2 text-gray-900">{client.name}</div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 py-2">
                  <div className="font-medium text-gray-700">Status</div>
                  <div className="md:col-span-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      client.status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {client.status}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Profile Information */}
          {client.profile && (
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-[#000009]">Profile Information</CardTitle>
                <CardDescription>Client profile details</CardDescription>
              </CardHeader>
              <CardContent>
                {renderObjectAsTable(client.profile, 'Profile')}
              </CardContent>
            </Card>
          )}

          {/* Meta Information */}
          {client.meta && (
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-[#000009]">Meta Information</CardTitle>
                <CardDescription>Additional client metadata</CardDescription>
              </CardHeader>
              <CardContent>
                {renderObjectAsTable(client.meta, 'Meta')}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default ClientDetail;
