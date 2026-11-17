import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import EditClientModal from '../components/EditClientModal';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Mail, Phone, Clock, Edit, Plus, FileText, Loader2, Download, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { API_BASE_URL } from '../config/env';
import { getNestedProperty, apiRequest } from '@/lib/utils';
import { useDocument } from '../contexts/DocumentContext';

type ViewField = {
  property: string;
  label: string;
  type: 'text' | 'image' | 'document';
  meta: { [key: string]: any };
};

type ViewSection = {
  [sectionName: string]: ViewField[];
};

interface ClientContact {
  id: number;
  clientId: number;
  firstName: string;
  lastName: string;
  position: string;
  email: string;
  phone: string;
}

interface ClientDocument {
  key: string;
  url?: string;
  lastModified?: string;
  size?: number;
}

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
      email: string;
    };
  };
  meta: any;
  createdAt: string;
  updatedAt: string;
}

const slugify = (value: string) => value.toLowerCase().replace(/\s+/g, '-');

function formatDate(value?: string): string {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';

  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

// "12/abc_2026-10-30T12-00-00-000Z.pdf" -> "abc.pdf"
function getDisplayName(key: string): string {
  const fileName = key.split('/').pop() || key;
  return fileName.replace(/_\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z(?=\.[^.]+$|$)/, '');
}

function formatSize(bytes?: number): string {
  if (bytes === undefined || bytes === null) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const ClientDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();

  // Documents are stored under clients/<clientId>/<fileName>_<timestamp>.<ext>
  // Upload puts the bucket in the request body, so the raw value is fine there.
  const clientBucket = id ? `clients/${id}` : '';
  // List/download put the bucket in the URL path, so the slash must be encoded
  // (clients%2F12) to stay a single :userBucket route param.
  const clientBucketParam = encodeURIComponent(clientBucket);

  const [client, setClient] = useState<Client | null>(null);
  const [viewManager, setViewManager] = useState<ViewManager | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isViewLoading, setIsViewLoading] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const [contacts, setContacts] = useState<ClientContact[]>([]);
  const [isContactsLoading, setIsContactsLoading] = useState(false);

  const [documents, setDocuments] = useState<ClientDocument[]>([]);
  const [isDocumentsLoading, setIsDocumentsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null);
  const [viewingKey, setViewingKey] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // The context functions are re-created on every provider render, so keep them in a ref
  // to avoid re-triggering effects / useCallbacks that depend on them.
  const documentApi = useDocument();
  const documentApiRef = useRef(documentApi);
  documentApiRef.current = documentApi;

  const [activeTab, setActiveTab] = useState('basic');

  const fetchClient = useCallback(async () => {
    if (!id) return;
    try {
      setIsLoading(true);
      const response = await apiRequest(`/client/${id}`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: Client = await response.json();
      setClient(data);
    } catch (error) {
      console.error('Error fetching client:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch client details',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [id, toast]);

  const fetchContacts = useCallback(async () => {
    if (!id) return;
    try {
      setIsContactsLoading(true);
      const response = await apiRequest(`/client-contacts/${id}`);
      if (response.ok) {
        const data = await response.json();
        setContacts(data.contacts || []);
      }
    } catch (error) {
      console.error('Error fetching client contacts:', error);
    } finally {
      setIsContactsLoading(false);
    }
  }, [id]);

  // Documents live in a bucket named after the client id
  const fetchDocuments = useCallback(async () => {
    if (!id) return;

    setIsDocumentsLoading(true);

    try {
      console.log('Client ID:', id);
      console.log('Client bucket:', clientBucket);

      const result = await documentApiRef.current.getDocumentsByBucket(clientBucket);

      console.log('Documents API response:', result);

      if (result.success) {
        console.table(result.documents || []);

        setDocuments(
          (result.documents || []).filter(
            (doc) => doc.size !== undefined && doc.size > 0
          )
        );
      } else {
        console.error('Error fetching client documents:', result.error);

        toast({
          title: 'Error',
          description: result.error || 'Failed to load documents',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Unexpected error fetching client documents:', error);
    } finally {
      setIsDocumentsLoading(false);
    }
  }, [id, clientBucket, toast]);



  const fetchViewManager = useCallback(async () => {
    try {
      setIsViewLoading(true);
      const searchParams = encodeURIComponent(JSON.stringify({ name: 'Client Profile - Admin View' }));
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
  }, [toast]);

  useEffect(() => {
    if (id) {
      fetchClient();
      fetchViewManager();
      fetchContacts();
      fetchDocuments();
    }
  }, [id, fetchClient, fetchViewManager, fetchContacts, fetchDocuments]);

  const handleEditClient = () => {
    setIsEditModalOpen(true);
  };

  const handleClientUpdated = () => {
    fetchClient();
    fetchContacts();

    toast({
      title: 'Success',
      description: 'Client updated successfully',
    });
  };

  // Opens the native file picker
  const handleAddDocument = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;

    setIsUploading(true);

    // keep the original file name (without extension) as the "fileType" part of the key
    const baseName = file.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9-_]/g, '_') || 'document';

    const result = await documentApiRef.current.uploadDocument({
      file,
      fileType: baseName,
      bucket: clientBucket,
    });

    if (result.success) {
      toast({ title: 'Success', description: 'Document added successfully' });
      fetchDocuments();
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Failed to add document',
        variant: 'destructive',
      });
    }

    setIsUploading(false);
    // allow selecting the same file again
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Opens the file in a new tab
  const handleViewDocument = async (doc: ClientDocument) => {
    if (!id) return;
    setViewingKey(doc.key);
    const result = await documentApiRef.current.getDocumentDownloadUrl(clientBucket, doc.key);
    setViewingKey(null);

    if (result.success && result.url) {
      window.open(result.url, '_blank', 'noopener,noreferrer');
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Failed to open document',
        variant: 'destructive',
      });
    }
  };

  // Saves the file to the device
  const handleDownloadDocument = async (doc: ClientDocument) => {
    if (!id) return;
    setDownloadingKey(doc.key);

    try {
      const result = await documentApiRef.current.getDocumentDownloadUrl(clientBucket, doc.key);
      if (!result.success || !result.url) {
        throw new Error(result.error || 'Failed to get download link');
      }

      const response = await fetch(result.url);
      if (!response.ok) {
        throw new Error('Failed to fetch file');
      }

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = getDisplayName(doc.key);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Error downloading document:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to download document',
        variant: 'destructive',
      });
    } finally {
      setDownloadingKey(null);
    }
  };

  const renderProfileTable = (profile: { [key: string]: any }) => {
    if (!profile || typeof profile !== 'object' || Object.keys(profile).length === 0) {
      return <div className="text-sm text-gray-500">No profile data available</div>;
    }

    return (
      <div className="space-y-2">
        {Object.entries(profile).map(([key, value]) => (
          <div
            key={key}
            className="grid grid-cols-1 md:grid-cols-3 gap-2 py-2 border-b border-gray-100 last:border-b-0"
          >
            <div className="font-medium text-gray-700 capitalize">
              {key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase())}
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

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Page header */}
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
            <Button onClick={handleEditClient} className="bg-[#712B71] hover:bg-[#712B71]/90">
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

        {/* Main tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">

            <TabsList className="grid h-auto w-full grid-cols-2 md:grid-cols-4 gap-0 rounded-none border-b border-gray-200 bg-gray-100 p-0">

              <TabsTrigger
                value="basic"
                className="rounded-none border-b-[3px] border-transparent px-4 py-4 text-base font-semibold text-gray-600 shadow-none transition-colors hover:bg-gray-50 hover:text-[#000009] data-[state=active]:-mb-px data-[state=active]:border-[#712B71] data-[state=active]:bg-white data-[state=active]:font-bold data-[state=active]:text-[#712B71]"
              >
                Basic Information
              </TabsTrigger>

              <TabsTrigger
                value="profile"
                className="rounded-none border-b-[3px] border-transparent px-4 py-4 text-base font-semibold text-gray-600 shadow-none transition-colors hover:bg-gray-50 hover:text-[#000009] data-[state=active]:-mb-px data-[state=active]:border-[#712B71] data-[state=active]:bg-white data-[state=active]:font-bold data-[state=active]:text-[#712B71]"
              >
                Profile Information
              </TabsTrigger>

              <TabsTrigger
                value="contacts"
                className="rounded-none border-b-[3px] border-transparent px-4 py-4 text-base font-semibold text-gray-600 shadow-none transition-colors hover:bg-gray-50 hover:text-[#000009] data-[state=active]:-mb-px data-[state=active]:border-[#712B71] data-[state=active]:bg-white data-[state=active]:font-bold data-[state=active]:text-[#712B71]"
              >
                Contacts
                {contacts.length > 0 && (
                  <span className="ml-2 text-xs opacity-80">({contacts.length})</span>
                )}
              </TabsTrigger>

              <TabsTrigger
                value="documents"
                className="rounded-none border-b-[3px] border-transparent px-4 py-4 text-base font-semibold text-gray-600 shadow-none transition-colors hover:bg-gray-50 hover:text-[#000009] data-[state=active]:-mb-px data-[state=active]:border-[#712B71] data-[state=active]:bg-white data-[state=active]:font-bold data-[state=active]:text-[#712B71]"
              >
                Documents
                {documents.length > 0 && (
                  <span className="ml-2 text-xs opacity-80">({documents.length})</span>
                )}
              </TabsTrigger>

            </TabsList>

            {/* 1. Basic Information */}
            <TabsContent value="basic">
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
                      <div className="md:col-span-2 text-gray-900">{formatDate(client.createdAt)}</div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 py-2">
                      <div className="font-medium text-gray-700">Updated At</div>
                      <div className="md:col-span-2 text-gray-900">{formatDate(client.updatedAt)}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 2. Profile Information */}
            <TabsContent value="profile">
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-[#000009]">Profile Information</CardTitle>
                  <CardDescription>Client profile details organized by sections</CardDescription>
                </CardHeader>
                <CardContent>
                  {!client.profile ? (
                    <div className="text-sm text-gray-500">No profile data available</div>
                  ) : isViewLoading ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500">Loading view configuration...</p>
                    </div>
                  ) : viewManager ? (
                    <Tabs
                      defaultValue={slugify(Object.keys(viewManager.sections)[0] ?? '')}
                      className="space-y-4"
                    >
                      <TabsList
                        className="grid w-full"
                        style={{
                          gridTemplateColumns: `repeat(${Object.keys(viewManager.sections).length}, 1fr)`,
                        }}
                      >
                        {Object.keys(viewManager.sections).map((sectionName) => (
                          <TabsTrigger key={sectionName} value={slugify(sectionName)}>
                            {sectionName}
                          </TabsTrigger>
                        ))}
                      </TabsList>

                      {Object.entries(viewManager.sections).map(([sectionName, fields]) => (
                        <TabsContent key={sectionName} value={slugify(sectionName)}>
                          <div className="space-y-2">
                            {fields.map((field) => {
                              const lookupSource = { ...client, ...client.profile };
                              const value = getNestedProperty(lookupSource, field.property);

                              if (value === undefined) {
                                console.warn(`ViewManager error: "${field.property}" does not exist`);
                              }

                              return (
                                <div
                                  key={field.property}
                                  className="grid grid-cols-1 md:grid-cols-3 gap-2 py-2 border-b border-gray-100 last:border-b-0"
                                >
                                  <div className="font-medium text-gray-700">{field.label}</div>
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
            </TabsContent>

            {/* 3. Contacts */}
            <TabsContent value="contacts">
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-[#000009]">Contacts</CardTitle>
                  <CardDescription>Additional contacts associated with this client</CardDescription>
                </CardHeader>
                <CardContent>
                  {isContactsLoading ? (
                    <p className="text-sm text-gray-500 py-4">Loading contacts...</p>
                  ) : contacts.length === 0 ? (
                    <p className="text-sm text-gray-500 py-4">No additional contacts.</p>
                  ) : (
                    <div className="space-y-3">
                      {contacts.map((contact) => (
                        <div
                          key={contact.id}
                          className="flex items-center justify-between border rounded-lg p-4"
                        >
                          <div>
                            <p className="font-medium text-gray-900">
                              {contact.firstName} {contact.lastName}
                            </p>
                            {contact.position && (
                              <p className="text-sm text-gray-500">{contact.position}</p>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-1 text-sm text-gray-600">
                            {contact.email && (
                              <span className="flex items-center gap-1">
                                <Mail className="h-3.5 w-3.5" /> {contact.email}
                              </span>
                            )}
                            {contact.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3.5 w-3.5" /> {contact.phone}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* 4. Documents */}
            <TabsContent value="documents">
              <Card className="border-0 shadow-lg">
                <CardHeader className="flex flex-row items-start justify-between space-y-0">
                  <div className="space-y-1.5">
                    <CardTitle className="text-[#000009]">Documents</CardTitle>
                    <CardDescription>Files and documents attached to this client</CardDescription>
                  </div>
                  <Button
                    onClick={handleAddDocument}
                    disabled={isUploading}
                    className="bg-[#712B71] hover:bg-[#712B71]/90"
                  >
                    {isUploading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4 mr-2" />
                    )}
                    {isUploading ? 'Uploading...' : 'Add Document'}
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleFileSelected}
                  />
                </CardHeader>
                <CardContent>
                  {isDocumentsLoading ? (
                    <p className="text-sm text-gray-500 py-4">Loading documents...</p>
                  ) : documents.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <FileText className="h-10 w-10 text-gray-300 mb-3" />
                      <p className="text-sm text-gray-500">No documents yet.</p>
                      <p className="text-sm text-gray-500">
                        Use “Add Document” to attach the first one.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {documents.map((doc) => (
                        <div
                          key={doc.key}
                          className="flex items-center justify-between border rounded-lg p-4"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <FileText className="h-5 w-5 text-[#712B71] shrink-0" />
                            <div className="min-w-0">
                              <p className="font-medium text-gray-900 truncate">
                                {getDisplayName(doc.key)}
                              </p>
                              <p className="text-sm text-gray-500">
                                Added {formatDate(doc.lastModified)}
                                {doc.size !== undefined && ` · ${formatSize(doc.size)}`}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewDocument(doc)}
                              disabled={viewingKey === doc.key}
                            >
                              {viewingKey === doc.key ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <Eye className="h-4 w-4 mr-2" />
                              )}
                              View
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleDownloadDocument(doc)}
                              disabled={downloadingKey === doc.key}
                              className="bg-[#712B71] hover:bg-[#712B71]/90"
                            >
                              {downloadingKey === doc.key ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <Download className="h-4 w-4 mr-2" />
                              )}
                              Download
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>

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