
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, User, Mail, Phone, Calendar, Check, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import AdminLayout from '../components/AdminLayout';
import { PreRegistrationWizard, PostRegistrationWizard, WizardFormConfig } from '../config/wizardConfig';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE_URL } from '../config/env';

interface User {
  id: number;
  username: string;
  password: string;
  status: string;
  lastLogin: Date;
  profile: { [key: string]: any };
  meta: { [key: string]: any };
}

interface Application {
  id: number;
  userId: number;
  status: 'complete' | 'incomplete';
  data: { [key: string]: any };
  meta: { [key: string]: any };
  user?: User;
  createdAt: string;
  updatedAt: string;
}

const ApplicationDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [application, setApplication] = useState<Application | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const { token } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchApplicationDetail = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`${API_BASE_URL}/applications/${id}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch application details');
        }

        const data = await response.json();
        setApplication(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        console.error('Error fetching application:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (token && id) {
      fetchApplicationDetail();
    }
  }, [token, id]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    return (
      <Badge 
        variant={status === 'complete' ? 'default' : 'secondary'}
        className={status === 'complete' ? 'bg-green-500 hover:bg-green-600' : 'bg-yellow-500 hover:bg-yellow-600'}
      >
        {status}
      </Badge>
    );
  };

  const getAllSections = () => {
    const preRegistrationSections = Object.keys(PreRegistrationWizard);
    const postRegistrationSections = Object.keys(PostRegistrationWizard);
    return [...preRegistrationSections, ...postRegistrationSections];
  };

  const getWizardConfig = (sectionId: string): WizardFormConfig => {
    if (Object.keys(PreRegistrationWizard).includes(sectionId)) {
      return PreRegistrationWizard;
    }
    return PostRegistrationWizard;
  };

  const renderFieldValue = (field: any, value: any) => {
    if (field.type === 'boolean') {
      const boolValue = value === 'true' || value?.booleanValue === 'true';
      return boolValue ? (
        <div className="flex items-center">
          <Check className="h-5 w-5 text-green-500 mr-1" /> Yes
        </div>
      ) : (
        <div className="flex items-center">
          <X className="h-5 w-5 text-red-500 mr-1" /> No
        </div>
      );
    }
    
    if (field.type === 'file') {
      return value?.fileKey ? (
        <a 
          href={`${API_BASE_URL}/files/${value.fileKey}`} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-blue-500 hover:underline flex items-center"
        >
          <FileText className="h-4 w-4 mr-1" /> 
          {value.fileName || value.fileKey.split('/').pop()}
        </a>
      ) : 'No file uploaded';
    }
    
    if (field.type === 'textArea') {
      return <div className="whitespace-pre-wrap">{value || 'Not provided'}</div>;
    }
    
    if (field.type === 'select') {
      return value || 'Not selected';
    }
    
    if (field.type === 'password') {
      return '••••••••';
    }

    if (field.type === 'agreement') {
      return value?.value === 'true' || value === 'true' ? 'Agreed' : 'Not agreed';
    }
    
    return value || 'Not provided';
  };

  const renderSectionContent = (sectionId: string) => {
    if (!application?.data) return null;
    
    const wizardConfig = getWizardConfig(sectionId);
    const sectionConfig = wizardConfig[sectionId];
    const sectionData = application.data[sectionId]?.fields || {};
    
    if (!sectionConfig) return <p>Section configuration not found.</p>;
    
    if (sectionConfig.fields) {
      return (
        <div className="space-y-4">
          {sectionConfig.fields.map((field) => {
            const fieldValue = sectionData[field.name];
            const shouldRender = !field.condition || (sectionData[field.condition.field] === field.condition.value);
            
            if (!shouldRender) return null;
            
            return (
              <div key={field.name} className="border-b pb-3 last:border-b-0">
                <p className="text-sm font-medium text-gray-700">{field.label}</p>
                <div className="mt-1">
                  {renderFieldValue(field, fieldValue)}
                </div>
              </div>
            );
          })}
        </div>
      );
    }
    
    if (sectionId === 'employment-information' && sectionConfig.history) {
      return (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium">Employment History</h3>
            <div className="mt-3 space-y-6">
              {(application.data[sectionId]?.history || []).map((history: any, index: number) => (
                <div key={index} className="border rounded-md p-4 bg-gray-50">
                  <h4 className="font-medium">Position {index + 1}</h4>
                  {sectionConfig.history && sectionConfig.history[0].map((field) => (
                    <div key={field.name} className="mt-2">
                      <p className="text-sm font-medium text-gray-700">{field.label}</p>
                      <div className="mt-1">
                        {renderFieldValue(field, history[field.name])}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
              {(!application.data[sectionId]?.history || application.data[sectionId]?.history.length === 0) && (
                <p className="text-gray-500">No employment history provided</p>
              )}
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-medium">References</h3>
            <div className="mt-3 space-y-6">
              {(application.data[sectionId]?.references || []).map((reference: any, index: number) => (
                <div key={index} className="border rounded-md p-4 bg-gray-50">
                  <h4 className="font-medium">Reference {index + 1}</h4>
                  {sectionConfig.references && sectionConfig.references[0].map((field) => (
                    <div key={field.name} className="mt-2">
                      <p className="text-sm font-medium text-gray-700">{field.label}</p>
                      <div className="mt-1">
                        {renderFieldValue(field, reference[field.name])}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
              {(!application.data[sectionId]?.references || application.data[sectionId]?.references.length === 0) && (
                <p className="text-gray-500">No references provided</p>
              )}
            </div>
          </div>
        </div>
      );
    }
    
    if (sectionId === 'skills-information') {
      return (
        <div>
          <h3 className="text-lg font-medium">Skills</h3>
          <div className="mt-3">
            {application.data[sectionId]?.skills?.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {application.data[sectionId].skills.map((skill: string, index: number) => (
                  <Badge key={index}>{skill}</Badge>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No skills provided</p>
            )}
          </div>
        </div>
      );
    }
    
    return <p>This section has no renderable content.</p>;
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center h-64">
          <p className="text-gray-500">Loading application details...</p>
        </div>
      </AdminLayout>
    );
  }

  if (error || !application) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center h-64">
          <p className="text-red-500 mb-4">Error: {error || 'Application not found'}</p>
          <Button onClick={() => navigate('/applications')}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Applications
          </Button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Button 
              variant="outline" 
              onClick={() => navigate('/applications')}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Applications
            </Button>
            <h1 className="text-3xl font-bold text-[#000009]">Application #{application.id}</h1>
            <div className="flex items-center mt-2">
              {getStatusBadge(application.status)}
              <span className="ml-3 text-gray-500">
                Submitted {formatDate(application.createdAt)}
              </span>
            </div>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" className="border-green-500 text-green-500 hover:bg-green-50">
              <Check className="h-4 w-4 mr-2" /> Approve
            </Button>
            <Button variant="outline" className="border-red-500 text-red-500 hover:bg-red-50">
              <X className="h-4 w-4 mr-2" /> Reject
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Sidebar */}
          <div className="col-span-12 md:col-span-3">
            <Card className="border-0 shadow-lg sticky top-6">
              <CardHeader>
                <CardTitle className="text-[#000009]">Application Sections</CardTitle>
                <CardDescription>Review all submission details</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs 
                  orientation="vertical" 
                  value={activeTab}
                  onValueChange={setActiveTab}
                  className="w-full"
                >
                  <TabsList className="flex flex-col h-auto items-stretch mb-0 bg-transparent p-0 space-y-1">
                    <TabsTrigger 
                      value="overview"
                      className="justify-start text-left w-full"
                    >
                      Overview
                    </TabsTrigger>
                    <Separator className="my-2" />
                    <p className="text-xs font-semibold text-gray-500 px-2 py-1">PRE-REGISTRATION</p>
                    {Object.keys(PreRegistrationWizard).map((sectionId) => (
                      <TabsTrigger 
                        key={sectionId}
                        value={sectionId}
                        className="justify-start text-left w-full"
                      >
                        {PreRegistrationWizard[sectionId].title}
                      </TabsTrigger>
                    ))}
                    <Separator className="my-2" />
                    <p className="text-xs font-semibold text-gray-500 px-2 py-1">POST-REGISTRATION</p>
                    {Object.keys(PostRegistrationWizard).map((sectionId) => (
                      <TabsTrigger 
                        key={sectionId}
                        value={sectionId}
                        className="justify-start text-left w-full"
                      >
                        {PostRegistrationWizard[sectionId].title}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Main content */}
          <div className="col-span-12 md:col-span-9">
            <Card className="border-0 shadow-lg">
              <CardContent className="p-6">
                <Tabs value={activeTab}>
                  <TabsContent value="overview" className="mt-0 p-0">
                    <div className="space-y-6">
                      <div>
                        <h2 className="text-xl font-semibold mb-4">Applicant Details</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {application.user && (
                            <>
                              <div className="space-y-2">
                                <div className="flex items-start">
                                  <User className="h-5 w-5 mr-2 text-gray-500 mt-0.5" />
                                  <div>
                                    <p className="text-sm text-gray-500">Name</p>
                                    <p className="font-medium">
                                      {application.data['personal-info']?.fields?.firstName || ''}{' '}
                                      {application.data['personal-info']?.fields?.lastName || ''}
                                    </p>
                                  </div>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <div className="flex items-start">
                                  <Mail className="h-5 w-5 mr-2 text-gray-500 mt-0.5" />
                                  <div>
                                    <p className="text-sm text-gray-500">Email</p>
                                    <p className="font-medium">{application.user.username}</p>
                                  </div>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <div className="flex items-start">
                                  <Phone className="h-5 w-5 mr-2 text-gray-500 mt-0.5" />
                                  <div>
                                    <p className="text-sm text-gray-500">Phone</p>
                                    <p className="font-medium">
                                      {application.data['personal-info']?.fields?.phoneNumber || 'Not provided'}
                                    </p>
                                  </div>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <div className="flex items-start">
                                  <Calendar className="h-5 w-5 mr-2 text-gray-500 mt-0.5" />
                                  <div>
                                    <p className="text-sm text-gray-500">Application Date</p>
                                    <p className="font-medium">{formatDate(application.createdAt)}</p>
                                  </div>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                      
                      <Separator />
                      
                      <div>
                        <h2 className="text-xl font-semibold mb-4">Application Summary</h2>
                        <div className="prose prose-sm max-w-none">
                          <p className="text-gray-700">
                            {application.data['contact-info']?.fields?.briefDescription || 'No description provided.'}
                          </p>
                          {application.data['contact-info']?.fields?.uploadCV && (
                            <div className="mt-4">
                              <p className="font-medium">Uploaded CV:</p>
                              <a 
                                href={`${API_BASE_URL}/files/${application.data['contact-info'].fields.uploadCV.fileKey}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-500 hover:underline flex items-center mt-1"
                              >
                                <FileText className="h-4 w-4 mr-1" /> 
                                View CV
                              </a>
                            </div>
                          )}
                        </div>
                      </div>

                      <Separator />

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <h3 className="text-md font-medium mb-2">Application Status</h3>
                          {getStatusBadge(application.status)}
                        </div>
                        <div>
                          <h3 className="text-md font-medium mb-2">Eligible to Work in UK</h3>
                          {application.data['contact-info']?.fields?.eligibleToWorkInUK?.booleanValue === 'true' ? (
                            <div className="flex items-center">
                              <Check className="h-5 w-5 text-green-500 mr-1" /> Yes
                            </div>
                          ) : (
                            <div className="flex items-center">
                              <X className="h-5 w-5 text-red-500 mr-1" /> No
                            </div>
                          )}
                        </div>
                        <div>
                          <h3 className="text-md font-medium mb-2">User Account Status</h3>
                          <Badge variant={application.user?.status === 'active' ? 'default' : 'secondary'}>
                            {application.user?.status || 'Unknown'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                  
                  {getAllSections().map((sectionId) => (
                    <TabsContent key={sectionId} value={sectionId} className="mt-0 p-0">
                      <div>
                        <h2 className="text-xl font-semibold mb-4">
                          {getWizardConfig(sectionId)[sectionId].title}
                        </h2>
                        <p className="text-gray-600 mb-6">
                          {getWizardConfig(sectionId)[sectionId].description}
                        </p>
                        {renderSectionContent(sectionId)}
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default ApplicationDetail;
