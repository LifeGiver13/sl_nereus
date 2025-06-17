
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Building, Mail, Phone, MapPin, User, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { API_BASE_URL } from '../config/env';

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
  const [isLoading, setIsLoading] = useState(true);
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

    if (id) {
      fetchClient();
    }
  }, [id, toast]);

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
            <Button asChild>
              <Link to={`/client/${client.id}/shifts`}>
                <Clock className="h-4 w-4 mr-2" />
                Manage Shifts
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Basic Information */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Company Name</label>
                <p className="text-lg font-semibold">{client.name}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Status</label>
                <div className="mt-1">
                  <Badge 
                    variant={client.status === 'active' ? 'default' : 'secondary'}
                    className={client.status === 'active' ? 'bg-green-100 text-green-800' : ''}
                  >
                    {client.status}
                  </Badge>
                </div>
              </div>

              {client.profile.address.branch && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Branch</label>
                  <p className="text-base">{client.profile.address.branch}</p>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-gray-500">Created</label>
                <p className="text-base">{new Date(client.createdAt).toLocaleDateString()}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">Last Updated</label>
                <p className="text-base">{new Date(client.updatedAt).toLocaleDateString()}</p>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Contact Name</label>
                <p className="text-base">{getContactName()}</p>
              </div>

              {client.profile.contact.role && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Role</label>
                  <p className="text-base">{client.profile.contact.role}</p>
                </div>
              )}

              {client.profile.contact.telephone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <div>
                    <label className="text-sm font-medium text-gray-500">Telephone</label>
                    <p className="text-base">{client.profile.contact.telephone}</p>
                  </div>
                </div>
              )}

              {client.profile.contact.mobile && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <div>
                    <label className="text-sm font-medium text-gray-500">Mobile</label>
                    <p className="text-base">{client.profile.contact.mobile}</p>
                  </div>
                </div>
              )}

              {client.profile.contact.fax && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Fax</label>
                  <p className="text-base">{client.profile.contact.fax}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Address Information */}
          <Card className="border-0 shadow-lg md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Address Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <label className="text-sm font-medium text-gray-500">Full Address</label>
                <p className="text-base mt-1">{formatAddress()}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};

export default ClientDetail;
