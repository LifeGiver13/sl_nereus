
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, User, Mail, Phone, Calendar, Check, X, MessageSquare, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import AdminLayout from '../components/AdminLayout';
import { PreRegistrationWizard, PostRegistrationWizard, WizardFormConfig } from '../config/wizardConfig';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE_URL } from '../config/env';
import { RemarkSystem, AllRemarks, SectionRemarks, Remark, hasUnresolvedRemarks, getSectionRemarkCount } from '../components/RemarkSystem';
import ReactMarkdown from 'react-markdown';

interface User {
  id: number;
  username: string;
  password: string;
  status: string;
  lastLogin: Date;
  profile: { [key: string]: any };
  meta: { [key: string]: any };
}

interface Field {
  name: string;
  label: string;
  type: string;
  required?: boolean;
  options?: string[];
  condition?: any;
  meta?: {
    content?: string;
    [key: string]: any;
  };
}

interface FormSection {
  name: string;
  fields: Field[];
  displayOrder?: number;
  meta?: any;
}

interface ApplicationForm {
  id: number;
  name: string;
  description: string;
  sections: FormSection[];
  meta?: any;
}

interface Application {
  id: number;
  userId: number;
  formId?: number;
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
  const [applicationForm, setApplicationForm] = useState<ApplicationForm | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [remarks, setRemarks] = useState<AllRemarks>({});
  const [remarksSaving, setRemarksSaving] = useState(false);
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const fetchApplicationDetail = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`${API_BASE_URL}/application/${id}`, {
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
        console.log('=== APPLICATION DATA LOADED ===');
        console.log('Full application data:', data);
        console.log('Has formId?', data.formId);
        console.log('Data structure keys:', Object.keys(data.data || {}));
        console.log('================================');
        
        setApplication(data);

        // Fetch the application form if formId exists
        if (data.formId) {
          console.log('Fetching form for formId:', data.formId);
          const formResponse = await fetch(`${API_BASE_URL}/application-form/${data.formId}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
          });

          if (formResponse.ok) {
            const formData = await formResponse.json();
            console.log('Form data loaded:', formData);
            setApplicationForm(formData);
          } else {
            console.log('Form fetch failed:', formResponse.status);
          }
        } else {
          console.log('No formId found - will use legacy wizard rendering');
        }
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

  const isFormBasedApplication = () => {
    const result = application?.formId && applicationForm;
    console.log('isFormBasedApplication check:', { 
      hasFormId: !!application?.formId, 
      hasForm: !!applicationForm, 
      result 
    });
    return result;
  };

  const getSortedSections = () => {
    if (!applicationForm?.sections) return [];
    return [...applicationForm.sections].sort((a, b) => 
      (a.displayOrder || 0) - (b.displayOrder || 0)
    );
  };

  const getAllWizardSections = () => {
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

  // Load remarks when application is loaded
  useEffect(() => {
    if (application?.meta?.remarks) {
      setRemarks(application.meta.remarks);
    }
  }, [application]);

  // Save remarks to backend
  const saveRemarks = async (updatedRemarks: AllRemarks) => {
    if (!application || !token) return;

    setRemarksSaving(true);
    try {
      const response = await fetch(`${API_BASE_URL}/application/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...application,
          meta: {
            ...application.meta,
            remarks: updatedRemarks
          }
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save remarks');
      }

      setApplication(prev => prev ? {
        ...prev,
        meta: { ...prev.meta, remarks: updatedRemarks }
      } : null);

      toast({
        title: "Remarks saved",
        description: "Successfully saved remarks to application",
      });
    } catch (error) {
      console.error('Error saving remarks:', error);
      toast({
        title: "Error saving remarks",
        description: "Failed to save remarks. Please try again.",
        variant: "destructive"
      });
    } finally {
      setRemarksSaving(false);
    }
  };

  const handleAddRemark = (sectionId: string, fieldName: string, comment: string) => {
    if (!user) return;

    const firstName = application?.data['personal-info']?.fields?.firstName || '';
    const lastName = application?.data['personal-info']?.fields?.lastName || '';
    const userName = `${firstName} ${lastName}`.trim() || user.username || 'Unknown User';

    const newRemark: Remark = {
      id: Date.now().toString(),
      comment,
      date: new Date().toISOString(),
      userId: user.id,
      userName,
      resolved: false
    };

    const updatedRemarks = {
      ...remarks,
      [sectionId]: {
        ...remarks[sectionId],
        [fieldName]: [...(remarks[sectionId]?.[fieldName] || []), newRemark]
      }
    };

    setRemarks(updatedRemarks);
    saveRemarks(updatedRemarks);
  };

  const handleToggleResolve = (sectionId: string, fieldName: string, remarkId: string) => {
    const updatedRemarks = {
      ...remarks,
      [sectionId]: {
        ...remarks[sectionId],
        [fieldName]: remarks[sectionId]?.[fieldName]?.map(remark =>
          remark.id === remarkId ? { ...remark, resolved: !remark.resolved } : remark
        ) || []
      }
    };

    setRemarks(updatedRemarks);
    saveRemarks(updatedRemarks);
  };

  const handleApplicationDecision = async (decision: 'approve' | 'reject' | 'revise') => {
    if (!application || !token) return;

    try {
      const response = await fetch(`${API_BASE_URL}/application/${id}/${decision}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to ${decision} application`);
      }

      toast({
        title: `Application ${decision === 'revise' ? 'sent for revision' : `${decision}d`}`,
        description: `Successfully ${decision === 'revise' ? 'requested revision for' : `${decision}d`} application #${application.id}`,
      });

      // Navigate back to applications list
      navigate('/applications');
    } catch (error) {
      console.error(`Error ${decision}ing application:`, error);
      toast({
        title: `Error ${decision === 'revise' ? 'requesting revision' : `${decision}ing application`}`,
        description: `Failed to ${decision} application. Please try again.`,
        variant: "destructive"
      });
    }
  };

  const checkHasUnresolvedRemarks = () => {
    return Object.values(remarks).some(sectionRemarks => 
      hasUnresolvedRemarks(sectionRemarks)
    );
  };

  const renderFieldValue = (field: Field, value: any) => {
    if (field.type === 'declaration') {
      const content = field.meta?.content || 'No content provided';
      return (
        <div className="prose prose-sm max-w-none p-4 bg-muted/50 rounded-md border">
          <ReactMarkdown
            components={{
              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
              ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
              li: ({ children }) => <li className="ml-2">{children}</li>,
              a: ({ href, children }) => (
                <a href={href} className="text-primary underline hover:text-primary/80" target="_blank" rel="noopener noreferrer">
                  {children}
                </a>
              ),
              strong: ({ children }) => <strong className="font-bold">{children}</strong>,
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
      );
    }

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
          className="text-primary hover:underline flex items-center"
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

  const renderFormSectionContent = (section: FormSection) => {
    if (!application?.data) return null;
    
    const sectionData = application.data[section.name]?.fields || {};
    
    // Debug logging
    console.log('=== Section Debug ===');
    console.log('Section name:', section.name);
    console.log('Application data keys:', Object.keys(application.data));
    console.log('Section data:', sectionData);
    console.log('Section fields from form:', section.fields.map(f => f.name));
    console.log('====================');
    
    if (!section.fields || section.fields.length === 0) {
      return <p className="text-muted-foreground">This section has no fields.</p>;
    }
    
    return (
      <div className="space-y-4">
        {section.fields.map((field) => {
          // For declaration fields, we don't need user input, just display content
          if (field.type === 'declaration') {
            return (
              <div key={field.name} className="pb-3">
                <p className="text-sm font-medium mb-2">{field.label}</p>
                <div className="mt-1">
                  {renderFieldValue(field, null)}
                </div>
              </div>
            );
          }

          const fieldValue = sectionData[field.name];
          const shouldRender = !field.condition || (() => {
            const conditionValue = sectionData[field.condition.field];
            const targetValue = field.condition.value;
            const operator = field.condition.operator || 'equals';
            const action = field.condition.action || 'hide';
            
            let conditionMet = false;
            if (operator === 'equals') {
              conditionMet = conditionValue === targetValue;
            } else if (operator === 'not_equals') {
              conditionMet = conditionValue !== targetValue;
            }
            
            // If action is 'hide', we show when condition is NOT met
            // If action is 'show', we show when condition IS met
            return action === 'hide' ? !conditionMet : conditionMet;
          })();
          
          if (!shouldRender) return null;
          
          return (
            <div key={field.name} className="border-b pb-3 last:border-b-0">
              <p className="text-sm font-medium text-foreground">{field.label}</p>
              <div className="mt-1">
                {renderFieldValue(field, fieldValue)}
              </div>
              {user && field.type !== 'declaration' && (
                <RemarkSystem
                  sectionId={section.name}
                  fieldName={field.name}
                  remarks={remarks[section.name]?.[field.name] || []}
                  currentUserId={user.id}
                  onAddRemark={handleAddRemark}
                  onToggleResolve={handleToggleResolve}
                />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderWizardSectionContent = (sectionId: string) => {
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
            const shouldRender = !field.condition || (() => {
              const conditionValue = sectionData[field.condition.field];
              const targetValue = field.condition.value;
              const operator = field.condition.operator || 'equals';
              const action = field.condition.action || 'hide';
              
              let conditionMet = false;
              if (operator === 'equals') {
                conditionMet = conditionValue === targetValue;
              } else if (operator === 'not_equals') {
                conditionMet = conditionValue !== targetValue;
              }
              
              return action === 'hide' ? !conditionMet : conditionMet;
            })();
            
            if (!shouldRender) return null;
            
            return (
              <div key={field.name} className="border-b pb-3 last:border-b-0">
                <p className="text-sm font-medium text-foreground">{field.label}</p>
                <div className="mt-1">
                  {renderFieldValue(field, fieldValue)}
                </div>
                {user && (
                  <RemarkSystem
                    sectionId={sectionId}
                    fieldName={field.name}
                    remarks={remarks[sectionId]?.[field.name] || []}
                    currentUserId={user.id}
                    onAddRemark={handleAddRemark}
                    onToggleResolve={handleToggleResolve}
                  />
                )}
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
                <div key={index} className="border rounded-md p-4 bg-muted/50">
                  <h4 className="font-medium">Position {index + 1}</h4>
                  {sectionConfig.history && sectionConfig.history[0].map((field) => (
                    <div key={field.name} className="mt-2">
                      <p className="text-sm font-medium text-foreground">{field.label}</p>
                      <div className="mt-1">
                        {renderFieldValue(field, history[field.name])}
                      </div>
                      {user && (
                        <RemarkSystem
                          sectionId={sectionId}
                          fieldName={`history-${index}-${field.name}`}
                          remarks={remarks[sectionId]?.[`history-${index}-${field.name}`] || []}
                          currentUserId={user.id}
                          onAddRemark={handleAddRemark}
                          onToggleResolve={handleToggleResolve}
                        />
                      )}
                    </div>
                  ))}
                </div>
              ))}
              {(!application.data[sectionId]?.history || application.data[sectionId]?.history.length === 0) && (
                <p className="text-muted-foreground">No employment history provided</p>
              )}
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-medium">References</h3>
            <div className="mt-3 space-y-6">
              {(application.data[sectionId]?.references || []).map((reference: any, index: number) => (
                <div key={index} className="border rounded-md p-4 bg-muted/50">
                  <h4 className="font-medium">Reference {index + 1}</h4>
                  {sectionConfig.references && sectionConfig.references[0].map((field) => (
                    <div key={field.name} className="mt-2">
                      <p className="text-sm font-medium text-foreground">{field.label}</p>
                      <div className="mt-1">
                        {renderFieldValue(field, reference[field.name])}
                      </div>
                      {user && (
                        <RemarkSystem
                          sectionId={sectionId}
                          fieldName={`reference-${index}-${field.name}`}
                          remarks={remarks[sectionId]?.[`reference-${index}-${field.name}`] || []}
                          currentUserId={user.id}
                          onAddRemark={handleAddRemark}
                          onToggleResolve={handleToggleResolve}
                        />
                      )}
                    </div>
                  ))}
                </div>
              ))}
              {(!application.data[sectionId]?.references || application.data[sectionId]?.references.length === 0) && (
                <p className="text-muted-foreground">No references provided</p>
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
                {application.data[sectionId].skills.map((skill: any, index: number) => (
                  <Badge key={index}>{typeof skill === 'string' ? skill : skill.name}</Badge>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No skills provided</p>
            )}
          </div>
          {user && (
            <RemarkSystem
              sectionId={sectionId}
              fieldName="skills"
              remarks={remarks[sectionId]?.['skills'] || []}
              currentUserId={user.id}
              onAddRemark={handleAddRemark}
              onToggleResolve={handleToggleResolve}
            />
          )}
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
            {checkHasUnresolvedRemarks() ? (
              <Button 
                variant="outline" 
                className="border-orange-500 text-orange-500 hover:bg-orange-50"
                onClick={() => handleApplicationDecision('revise')}
              >
                <MessageSquare className="h-4 w-4 mr-2" /> Request Revision
              </Button>
            ) : (
              <Button 
                variant="outline" 
                className="border-green-500 text-green-500 hover:bg-green-50"
                onClick={() => handleApplicationDecision('approve')}
              >
                <Check className="h-4 w-4 mr-2" /> Approve
              </Button>
            )}
            <Button 
              variant="outline" 
              className="border-red-500 text-red-500 hover:bg-red-50"
              onClick={() => handleApplicationDecision('reject')}
            >
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
                      <div className="flex items-center justify-between w-full">
                        <span>Overview</span>
                      </div>
                    </TabsTrigger>
                    <Separator className="my-2" />
                    
                    {isFormBasedApplication() ? (
                      // New form-based application sections
                      getSortedSections().map((section) => {
                        const sectionRemarks = remarks[section.name] || {};
                        const hasRemarks = getSectionRemarkCount(sectionRemarks) > 0;
                        const hasUnresolved = hasUnresolvedRemarks(sectionRemarks);
                        
                        return (
                          <TabsTrigger 
                            key={section.name}
                            value={section.name}
                            className="justify-start text-left w-full"
                          >
                            <div className="flex items-center justify-between w-full">
                              <span>{section.name}</span>
                              {hasRemarks && (
                                <div className="flex items-center space-x-1">
                                  <MessageSquare className="h-3 w-3 text-blue-500" />
                                  {hasUnresolved && (
                                    <AlertCircle className="h-3 w-3 text-red-500" />
                                  )}
                                </div>
                              )}
                            </div>
                          </TabsTrigger>
                        );
                      })
                    ) : (
                      // Legacy wizard-based sections
                      <>
                        <p className="text-xs font-semibold text-muted-foreground px-2 py-1">PRE-REGISTRATION</p>
                        {Object.keys(PreRegistrationWizard).map((sectionId) => {
                          const sectionRemarks = remarks[sectionId] || {};
                          const hasRemarks = getSectionRemarkCount(sectionRemarks) > 0;
                          const hasUnresolved = hasUnresolvedRemarks(sectionRemarks);
                          
                          return (
                            <TabsTrigger 
                              key={sectionId}
                              value={sectionId}
                              className="justify-start text-left w-full"
                            >
                              <div className="flex items-center justify-between w-full">
                                <span>{PreRegistrationWizard[sectionId].title}</span>
                                {hasRemarks && (
                                  <div className="flex items-center space-x-1">
                                    <MessageSquare className="h-3 w-3 text-blue-500" />
                                    {hasUnresolved && (
                                      <AlertCircle className="h-3 w-3 text-red-500" />
                                    )}
                                  </div>
                                )}
                              </div>
                            </TabsTrigger>
                          );
                        })}
                        <Separator className="my-2" />
                        <p className="text-xs font-semibold text-muted-foreground px-2 py-1">POST-REGISTRATION</p>
                        {Object.keys(PostRegistrationWizard).map((sectionId) => {
                          const sectionRemarks = remarks[sectionId] || {};
                          const hasRemarks = getSectionRemarkCount(sectionRemarks) > 0;
                          const hasUnresolved = hasUnresolvedRemarks(sectionRemarks);
                          
                          return (
                            <TabsTrigger 
                              key={sectionId}
                              value={sectionId}
                              className="justify-start text-left w-full"
                            >
                              <div className="flex items-center justify-between w-full">
                                <span>{PostRegistrationWizard[sectionId].title}</span>
                                {hasRemarks && (
                                  <div className="flex items-center space-x-1">
                                    <MessageSquare className="h-3 w-3 text-blue-500" />
                                    {hasUnresolved && (
                                      <AlertCircle className="h-3 w-3 text-red-500" />
                                    )}
                                  </div>
                                )}
                              </div>
                            </TabsTrigger>
                          );
                        })}
                      </>
                    )}
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
                                  <User className="h-5 w-5 mr-2 text-muted-foreground mt-0.5" />
                                  <div>
                                    <p className="text-sm text-muted-foreground">Name</p>
                                    <p className="font-medium">
                                      {application.data['personal-info']?.fields?.firstName || 
                                       application.data['Personal Information']?.fields?.first_name || ''}{' '}
                                      {application.data['personal-info']?.fields?.lastName ||
                                       application.data['Personal Information']?.fields?.last_name || ''}
                                    </p>
                                  </div>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <div className="flex items-start">
                                  <Mail className="h-5 w-5 mr-2 text-muted-foreground mt-0.5" />
                                  <div>
                                    <p className="text-sm text-muted-foreground">Email</p>
                                    <p className="font-medium">{application.user.username}</p>
                                  </div>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <div className="flex items-start">
                                  <Phone className="h-5 w-5 mr-2 text-muted-foreground mt-0.5" />
                                  <div>
                                    <p className="text-sm text-muted-foreground">Phone</p>
                                    <p className="font-medium">
                                      {application.data['personal-info']?.fields?.phoneNumber ||
                                       application.data['Personal Information']?.fields?.phone_number || 'Not provided'}
                                    </p>
                                  </div>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <div className="flex items-start">
                                  <Calendar className="h-5 w-5 mr-2 text-muted-foreground mt-0.5" />
                                  <div>
                                    <p className="text-sm text-muted-foreground">Application Date</p>
                                    <p className="font-medium">{formatDate(application.createdAt)}</p>
                                  </div>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      <Separator />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h3 className="text-md font-medium mb-2">Application Status</h3>
                          {getStatusBadge(application.status)}
                        </div>
                        <div>
                          <h3 className="text-md font-medium mb-2">User Account Status</h3>
                          <Badge variant={application.user?.status === 'active' ? 'default' : 'secondary'}>
                            {application.user?.status || 'Unknown'}
                          </Badge>
                        </div>
                      </div>

                      {applicationForm && (
                        <div className="mt-4">
                          <h3 className="text-md font-medium mb-2">Form</h3>
                          <p className="text-sm text-muted-foreground">{applicationForm.name}</p>
                          {applicationForm.description && (
                            <p className="text-sm text-muted-foreground mt-1">{applicationForm.description}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </TabsContent>
                  
                  {isFormBasedApplication() ? (
                    // New form-based sections
                    getSortedSections().map((section) => (
                      <TabsContent key={section.name} value={section.name} className="mt-0 p-0">
                        <div>
                          <h2 className="text-xl font-semibold mb-4">
                            {section.name}
                          </h2>
                          {renderFormSectionContent(section)}
                        </div>
                      </TabsContent>
                    ))
                  ) : (
                    // Legacy wizard-based sections
                    getAllWizardSections().map((sectionId) => (
                      <TabsContent key={sectionId} value={sectionId} className="mt-0 p-0">
                        <div>
                          <h2 className="text-xl font-semibold mb-4">
                            {getWizardConfig(sectionId)[sectionId].title}
                          </h2>
                          <p className="text-muted-foreground mb-6">
                            {getWizardConfig(sectionId)[sectionId].description}
                          </p>
                          {renderWizardSectionContent(sectionId)}
                        </div>
                      </TabsContent>
                    ))
                  )}
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
