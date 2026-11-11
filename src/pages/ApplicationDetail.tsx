import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, FileText, User, Mail, Phone, Calendar, Check, X, MessageSquare, AlertCircle, Eye, EyeOff } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import AdminLayout from "../components/AdminLayout";
import { useAuth } from "../contexts/AuthContext";
import { API_BASE_URL } from "../config/env";
import {
  RemarkSystem,
  AllRemarks,
  SectionRemarks,
  Remark,
  hasUnresolvedRemarks,
  getSectionRemarkCount,
} from "../components/RemarkSystem";
import ReactMarkdown from "react-markdown";
import { apiRequest } from "@/lib/utils";

const FileDownloadLink = ({ fileName }: { fileName: string }) => {
  const [downloadUrl, setDownloadUrl] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [timeLeft, setTimeLeft] = React.useState<number | null>(null);
  const [showPreview, setShowPreview] = React.useState(false);
  const { toast } = useToast();

  React.useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev ? prev - 1 : null));
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  const fetchDownloadUrl = async () => {
    setLoading(true);
    try {
      // Uploaded files are stored as "<userBucket>/<key>"; the backend route
      // needs those as two separate path segments, not one encoded blob.
      const slashIndex = fileName.indexOf("/");
      if (slashIndex === -1) {
        toast({
          title: "Error",
          description: "Malformed file reference — cannot determine document location",
          variant: "destructive",
        });
        return;
      }
      const userBucket = fileName.slice(0, slashIndex);
      const key = fileName.slice(slashIndex + 1);

      const response = await apiRequest(
        `/fs/download-url/${encodeURIComponent(userBucket)}/${encodeURIComponent(key)}`,
      );
      if (!response.ok) {
        toast({
          title: "Error",
          description: "Failed to generate download link",
          variant: "destructive",
        });
        return;
      }
      const data = await response.json();
      setDownloadUrl(data.url);
      setTimeLeft(data.expiresIn);
    } catch (error) {
      console.error("Error fetching download URL:", error);
      toast({
        title: "Error",
        description: "Failed to fetch download link",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (downloadUrl && timeLeft) {
    return (
      <>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPreview(true)}
              className="gap-2"
            >
              <FileText className="h-4 w-4" />
              Preview Document
            </Button>
            <a
              href={downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <FileText className="h-4 w-4" />
              Open in New Tab
            </a>
          </div>
          <span className="text-xs text-muted-foreground">Link expires in {formatTime(timeLeft)}</span>
        </div>

        {showPreview && (
          <Dialog open={showPreview} onOpenChange={setShowPreview}>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
              <DialogHeader>
                <DialogTitle>Document Preview: {fileName}</DialogTitle>
              </DialogHeader>
              <div className="mt-4 flex-1 min-h-0">
                <iframe
                  src={downloadUrl}
                  className="w-full h-full min-h-[70vh] border rounded"
                  title={`Preview of ${fileName}`}
                  sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                />
              </div>
            </DialogContent>
          </Dialog>
        )}
      </>
    );
  }

  return (
    <Button variant="outline" size="sm" onClick={fetchDownloadUrl} disabled={loading} className="gap-2">
      <FileText className="h-4 w-4" />
      {loading ? "Generating link..." : "Get Download Link"}
    </Button>
  );
};

const RevealablePassword = ({ value }: { value: any }) => {
  const [revealed, setRevealed] = React.useState(false);
  const password = typeof value === "object" && value !== null ? value.value : value;

  if (!password) {
    return <span className="text-muted-foreground">Not provided</span>;
  }

  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-sm">{revealed ? password : "••••••••"}</span>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-6 px-2 text-xs gap-1"
        onClick={() => setRevealed((r) => !r)}
      >
        {revealed ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
        {revealed ? "Hide" : "Reveal"}
      </Button>
    </div>
  );
};

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
  sections: FormSection[] | { [key: string]: FormSection };
  meta?: any;
}

interface Application {
  id: number;
  userId: number;
  formId?: number;
  status: "complete" | "incomplete";
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
  const [activeTab, setActiveTab] = useState("overview");
  const [remarks, setRemarks] = useState<AllRemarks>({});
  const [remarksSaving, setRemarksSaving] = useState(false);
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const fetchApplicationDetail = async () => {
      try {
        setIsLoading(true);

        // Fetch application data
        const response = await fetch(`${API_BASE_URL}/application/${id}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch application details");
        }

        const data = await response.json();
        console.log("=== APPLICATION DATA LOADED ===");
        console.log("Full application data:", data);
        console.log("Data structure keys:", Object.keys(data.data || {}));

        setApplication(data);

        // Determine form ID based on application stage
        let formIdToUse: number;
        const stage = data.meta?.stage;

        if (stage === "pre-registration" || stage === undefined) {
          formIdToUse = 1; // Pre-registration form
        } else if (stage === "full-registration" || stage === "processed") {
          formIdToUse = 2; // Full registration form
        } else {
          formIdToUse = data.formId || 2; // Fallback to formId or form 2
        }
        console.log("Application stage:", stage, "- Using form ID:", formIdToUse);

        const formResponse = await fetch(`${API_BASE_URL}/application-form/${formIdToUse}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (formResponse.ok) {
          const formData = await formResponse.json();
          console.log("Form structure loaded:", formData);
          console.log("Sections type:", Array.isArray(formData.sections) ? "array" : typeof formData.sections);
          console.log("Sections:", formData.sections);

          // Log section names whether it's an array or object
          if (Array.isArray(formData.sections)) {
            console.log(
              "Form sections:",
              formData.sections.map((s: any) => s.name),
            );
          } else if (formData.sections && typeof formData.sections === "object") {
            console.log(
              "Form sections:",
              Object.values(formData.sections).map((s: any) => s.name),
            );
          }

          setApplicationForm(formData);
        } else {
          console.error("Failed to load form structure:", formResponse.status);
          throw new Error("Failed to load form structure");
        }

        console.log("================================");
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
        console.error("Error fetching application:", err);
      } finally {
        setIsLoading(false);
      }
    };

    if (token && id) {
      fetchApplicationDetail();
    }
  }, [token, id]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusBadge = (status: string) => {
    return (
      <Badge
        variant={status === "complete" ? "default" : "secondary"}
        className={status === "complete" ? "bg-green-500 hover:bg-green-600" : "bg-yellow-500 hover:bg-yellow-600"}
      >
        {status}
      </Badge>
    );
  };

  const getSortedSections = (): FormSection[] => {
    if (!applicationForm?.sections) return [];

    // Handle both array and object formats
    const sectionsArray = Array.isArray(applicationForm.sections)
      ? applicationForm.sections
      : (Object.values(applicationForm.sections) as FormSection[]);

    return sectionsArray.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
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
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...application,
          meta: {
            ...application.meta,
            remarks: updatedRemarks,
          },
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save remarks");
      }

      setApplication((prev) =>
        prev
          ? {
            ...prev,
            meta: { ...prev.meta, remarks: updatedRemarks },
          }
          : null,
      );

      toast({
        title: "Remarks saved",
        description: "Successfully saved remarks to application",
      });
    } catch (error) {
      console.error("Error saving remarks:", error);
      toast({
        title: "Error saving remarks",
        description: "Failed to save remarks. Please try again.",
        variant: "destructive",
      });
    } finally {
      setRemarksSaving(false);
    }
  };

  const handleAddRemark = (sectionId: string, fieldName: string, comment: string) => {
    if (!user) return;

    const profile = application?.user?.profile || {};

    const firstName =
      profile["Basic Information"]?.fields?.firstName ||
      profile.Forename ||
      "";

    const lastName =
      profile["Basic Information"]?.fields?.lastName ||
      profile.Surname ||
      "";

    const userName =
      `${firstName} ${lastName}`.trim() ||
      user.username ||
      "Unknown User";

    const newRemark: Remark = {
      id: Date.now().toString(),
      comment,
      date: new Date().toISOString(),
      userId: user.id,
      userName,
      resolved: false,
    };

    const updatedRemarks = {
      ...remarks,
      [sectionId]: {
        ...remarks[sectionId],
        [fieldName]: [...(remarks[sectionId]?.[fieldName] || []), newRemark],
      },
    };

    setRemarks(updatedRemarks);
    saveRemarks(updatedRemarks);
  };

  const handleToggleResolve = (sectionId: string, fieldName: string, remarkId: string) => {
    const updatedRemarks = {
      ...remarks,
      [sectionId]: {
        ...remarks[sectionId],
        [fieldName]:
          remarks[sectionId]?.[fieldName]?.map((remark) =>
            remark.id === remarkId ? { ...remark, resolved: !remark.resolved } : remark,
          ) || [],
      },
    };

    setRemarks(updatedRemarks);
    saveRemarks(updatedRemarks);
  };

  const handleApplicationDecision = async (decision: "approve" | "reject" | "revise") => {
    if (!application || !token) return;

    try {
      // Determine the correct endpoint decision based on stage
      let endpointDecision: string = decision;

      if (decision === "approve") {
        const stage = application.meta?.stage;

        if (stage === "pre-registration" || stage === undefined) {
          endpointDecision = "approve";
        } else if (stage === "full-registration") {
          endpointDecision = "finalize";
        }
      }

      const response = await fetch(`${API_BASE_URL}/application/${id}/${endpointDecision}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to ${decision} application`);
      }

      toast({
        title: `Application ${decision === "revise" ? "sent for revision" : `${decision}d`}`,
        description: `Successfully ${decision === "revise" ? "requested revision for" : `${decision}d`} application #${application.id}`,
      });

      // Navigate back to applications list
      navigate("/applications");
    } catch (error) {
      console.error(`Error ${decision}ing application:`, error);
      toast({
        title: `Error ${decision === "revise" ? "requesting revision" : `${decision}ing application`}`,
        description: `Failed to ${decision} application. Please try again.`,
        variant: "destructive",
      });
    }
  };

  const checkHasUnresolvedRemarks = () => {
    return Object.values(remarks).some((sectionRemarks) => hasUnresolvedRemarks(sectionRemarks));
  };


  const renderReferees = (value: any) => {
    if (!value) {
      return <span className="text-muted-foreground">No referees provided</span>;
    }

    let referees: any[] = [];

    try {
      referees = typeof value === "string" ? JSON.parse(value) : value;
    } catch (error) {
      console.error("Failed to parse referees:", error);
      return (
        <span className="text-muted-foreground">
          Unable to display referee information
        </span>
      );
    }

    if (!Array.isArray(referees) || referees.length === 0) {
      return (
        <span className="text-muted-foreground">
          No referees provided
        </span>
      );
    }

    return (
      <div className="space-y-4">
        {referees.map((referee: any, refereeIndex: number) => {
          if (!Array.isArray(referee)) return null;

          const refereeData = referee.reduce(
            (acc: Record<string, any>, field: any) => {
              acc[field.name] = field.value;
              return acc;
            },
            {}
          );

          return (
            <div
              key={refereeIndex}
              className="border rounded-lg p-4 bg-muted/20"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">
                  Referee {refereeIndex + 1}
                </h3>

                <Badge variant="secondary">
                  {refereeData.type || "Referee"}
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {referee.map((field: any, fieldIndex: number) => {
                  let shouldRender = true;

                  if (field.condition) {
                    const conditionValue =
                      refereeData[field.condition.field];

                    const targetValue = field.condition.value;
                    const operator = field.condition.operator || "equals";
                    const action = field.condition.action || "show";

                    let conditionMet = false;

                    switch (operator) {
                      case "equals":
                        conditionMet = conditionValue === targetValue;
                        break;

                      case "not_equals":
                      case "does not equal":
                        conditionMet = conditionValue !== targetValue;
                        break;

                      case "is set":
                        conditionMet =
                          conditionValue !== undefined &&
                          conditionValue !== null &&
                          conditionValue !== "";
                        break;

                      case "is not set":
                        conditionMet =
                          conditionValue === undefined ||
                          conditionValue === null ||
                          conditionValue === "";
                        break;

                      default:
                        conditionMet = conditionValue === targetValue;
                    }

                    if (action === "show") {
                      shouldRender = conditionMet;
                    } else if (action === "hide") {
                      shouldRender = !conditionMet;
                    }
                  }

                  if (!shouldRender) return null;

                  return (
                    <div key={fieldIndex} className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">
                        {field.label}
                      </p>

                      <p className="text-sm font-medium break-words whitespace-pre-wrap">
                        {field.value || "Not provided"}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };


  const renderFieldValue = (field: Field, value: any) => {
    if (field.type === "referees") {
      return renderReferees(value);
    }
    if (field.type === "declaration") {
      const content = field.meta?.content || "No content provided";
      return (
        <div className="prose prose-sm max-w-none p-4 bg-muted/50 rounded-md border">
          <ReactMarkdown
            components={{
              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
              ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
              li: ({ children }) => <li className="ml-2">{children}</li>,
              a: ({ href, children }) => (
                <a
                  href={href}
                  className="text-primary underline hover:text-primary/80"
                  target="_blank"
                  rel="noopener noreferrer"
                >
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

    if (field.type === "boolean" || field.type === "checkbox") {
      // Handle both direct values and object values
      const boolValue = typeof value === "object" && value !== null ? value.value : value;

      const isTrue = boolValue === "true" || boolValue === true;

      return isTrue ? (
        <div className="flex items-center">
          <Check className="h-5 w-5 text-green-500 mr-1" /> Yes
        </div>
      ) : (
        <div className="flex items-center">
          <X className="h-5 w-5 text-red-500 mr-1" /> No
        </div>
      );
    }

    if (field.type === "file") {
      const fileValue = typeof value === "object" && value !== null ? value.value : value;

      if (!fileValue || fileValue === "") {
        return <span className="text-muted-foreground">Not uploaded</span>;
      }

      return <FileDownloadLink fileName={fileValue} />;
    }

    if (field.type === "textArea") {
      return <div className="whitespace-pre-wrap">{value || "Not provided"}</div>;
    }

    if (field.type === "select") {
      return value || "Not selected";
    }

    if (field.type === "password") {
      return <RevealablePassword value={value} />;
    }

    if (field.type === "agreement") {
      return value?.value === "true" || value === "true" ? "Agreed" : "Not agreed";
    }

    // Handle skills arrays (check both by type and by structure)
    if (field.type === "skillsSelector" || (Array.isArray(value) && value.length > 0 && value[0]?.name && value[0]?.category)) {
      if (!Array.isArray(value) || value.length === 0) {
        return <span className="text-muted-foreground">No skills selected</span>;
      }

      // Group skills by category
      const groupedSkills = value.reduce((acc: { [key: string]: string[] }, skill: any) => {
        const category = skill.category || "Other";
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(skill.name);
        return acc;
      }, {});

      return (
        <div className="space-y-3">
          {Object.entries(groupedSkills).map(([category, skills]) => (
            <div key={category} className="border rounded-md p-3 bg-muted/30">
              <h4 className="font-semibold text-sm mb-2 text-primary">{category}</h4>
              <div className="flex flex-wrap gap-2">
                {(skills as string[]).map((skill, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
      );
    }

    // Handle employment history arrays
    if (field.type === "employmentHistory" || (Array.isArray(value) && value.length > 0 && Array.isArray(value[0]))) {
      return renderEmploymentHistory(value);
    }

    // Safely handle arrays that might contain objects
    if (Array.isArray(value)) {
      return value.join(", ") || "Not provided";
    }

    return value || "Not provided";
  };

  const renderEmploymentHistory = (jobs: any) => {
    if (!Array.isArray(jobs) || jobs.length === 0) {
      return <span className="text-muted-foreground">No employment history provided</span>;
    }

    return (
      <div className="space-y-4">
        {jobs.map((job: any, jobIndex: number) => {
          if (!Array.isArray(job)) return null;

          return (
            <div key={jobIndex} className="border rounded-lg p-4 bg-muted/20">
              <div className="grid grid-cols-2 gap-3 mb-3">
                {job.map((field: any, fieldIndex: number) => {
                  // Skip description field, we'll render it separately
                  if (field.name === "jobDescription") return null;

                  return (
                    <div key={fieldIndex} className="space-y-1">
                      <span className="text-xs font-medium text-muted-foreground">
                        {field.label}
                      </span>
                      <p className="text-sm font-medium">
                        {field.value || (field.checkableExtraValue === "true" ? field.checkableExtraLabel : "Not provided")}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Render description separately if it exists */}
              {job.find((f: any) => f.name === "jobDescription")?.value && (
                <div className="mt-3 pt-3 border-t">
                  <span className="text-xs font-medium text-muted-foreground block mb-1">
                    Job Description
                  </span>
                  <p className="text-sm text-foreground/80 whitespace-pre-wrap">
                    {job.find((f: any) => f.name === "jobDescription").value}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };



  const renderSectionContent = (section: FormSection) => {
    const profile = application?.user?.profile;

    if (!profile) return null;

    // Read submitted values from the user's profile
    const sectionData = profile[section.name]?.fields || {};


    // console.log('=== Rendering Section ===');
    // console.log('Section name:', section.name);
    // console.log('Section has data?', !!application.data[section.name]);
    // console.log('Field count:', section.fields?.length || 0);
    // console.log('Data keys:', Object.keys(sectionData));
    // console.log('========================');

    if (!section.fields || section.fields.length === 0) {
      return <p className="text-muted-foreground">This section has no fields.</p>;
    }

    return (
      <div className="space-y-4">
        {section.fields.map((field) => {
          // For declaration fields, we don't need user input, just display content
          if (field.type === "declaration") {
            return (
              <div key={field.name} className="pb-3">
                <p className="text-sm font-medium mb-2">{field.label}</p>
                <div className="mt-1">{renderFieldValue(field, null)}</div>
              </div>
            );
          }

          const fieldValue = sectionData[field.name];

          console.log(`Field "${field.name}":`, fieldValue);

          const shouldRender =
            !field.condition ||
            (() => {
              const rawConditionValue = sectionData[field.condition.field];
              // Extract actual value from object if needed
              const conditionValue =
                typeof rawConditionValue === "object" && rawConditionValue !== null
                  ? rawConditionValue.value
                  : rawConditionValue;

              const targetValue = field.condition.value;
              const operator = field.condition.operator || "equals";
              const action = field.condition.action || "show";

              let conditionMet = false;

              switch (operator) {
                case "equals":
                  conditionMet = conditionValue === targetValue;
                  break;
                case "not_equals":
                case "does not equal":
                  conditionMet = conditionValue !== targetValue;
                  break;
                case "is set":
                  conditionMet = conditionValue !== undefined && conditionValue !== null && conditionValue !== "";
                  break;
                case "is not set":
                  conditionMet = conditionValue === undefined || conditionValue === null || conditionValue === "";
                  break;
                default:
                  conditionMet = conditionValue === targetValue;
              }

              // Handle different actions
              switch (action) {
                case "show":
                  return conditionMet;
                case "hide":
                  return !conditionMet;
                case "set value":
                case "clear value":
                case "match value":
                  // These actions don't affect visibility, just show the field
                  return true;
                default:
                  return conditionMet;
              }
            })();

          if (!shouldRender) return null;

          return (
            <div key={field.name} className="border-b pb-3 last:border-b-0">
              <div className="flex items-start justify-between gap-2 mb-1">
                <p className="text-sm font-medium text-foreground">{field.label}</p>
                {user && field.type !== "declaration" && (
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
              <div className="mt-1">{renderFieldValue(field, fieldValue)}</div>
            </div>
          );
        })}
      </div>
    );
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
          <p className="text-red-500 mb-4">Error: {error || "Application not found"}</p>
          <Button onClick={() => navigate("/applications")}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Applications
          </Button>
        </div>
      </AdminLayout>
    );
  }

  // Decisions can't be revisited once an application has been finalized
  const isApplicationProcessed = application.meta?.stage === "processed";

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Button variant="outline" onClick={() => navigate("/applications")} className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Applications
            </Button>
            <h1 className="text-3xl font-bold text-[#000009]">Application #{application.id}</h1>
            <div className="flex items-center mt-2">
              {getStatusBadge(application.status)}
              <span className="ml-3 text-gray-500">Submitted {formatDate(application.createdAt)}</span>
            </div>
          </div>
          <div className="flex space-x-2">
            {checkHasUnresolvedRemarks() ? (
              <Button
                variant="outline"
                className="border-orange-500 text-orange-500 hover:bg-orange-50"
                onClick={() => handleApplicationDecision("revise")}
                disabled={isApplicationProcessed}
              >
                <MessageSquare className="h-4 w-4 mr-2" /> Request Revision
              </Button>
            ) : (
              <Button
                variant="outline"
                className="border-green-500 text-green-500 hover:bg-green-50"
                onClick={() => handleApplicationDecision("approve")}
                disabled={isApplicationProcessed}
              >
                <Check className="h-4 w-4 mr-2" /> Approve
              </Button>
            )}
            <Button
              variant="outline"
              className="border-red-500 text-red-500 hover:bg-red-50"
              onClick={() => handleApplicationDecision("reject")}
              disabled={isApplicationProcessed}
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
                <Tabs orientation="vertical" value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="flex flex-col h-auto items-stretch mb-0 bg-transparent p-0 space-y-1">
                    <TabsTrigger value="overview" className="justify-start text-left w-full">
                      <div className="flex items-center justify-between w-full">
                        <span>Overview</span>
                      </div>
                    </TabsTrigger>
                    <Separator className="my-2" />

                    {getSortedSections().map((section) => {
                      const sectionRemarks = remarks[section.name] || {};
                      const hasRemarks = getSectionRemarkCount(sectionRemarks) > 0;
                      const hasUnresolved = hasUnresolvedRemarks(sectionRemarks);

                      return (
                        <TabsTrigger
                          key={section.name}
                          value={section.name}
                          className="justify-start text-left w-full whitespace-normal h-auto min-h-[2.5rem] py-2"
                        >
                          <div className="flex items-start justify-between w-full gap-2">
                            <span className="break-words flex-1 leading-snug">{section.name}</span>
                            {hasRemarks && (
                              <div className="flex items-center space-x-1 flex-shrink-0 mt-0.5">
                                <MessageSquare className="h-3 w-3 text-blue-500" />
                                {hasUnresolved && <AlertCircle className="h-3 w-3 text-red-500" />}
                              </div>
                            )}
                          </div>
                        </TabsTrigger>
                      );
                    })}
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
                                    <p className="text-sm text-muted-foreground">Username</p>
                                    <p className="font-medium">{application.user.username}</p>
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
                          <Badge variant={application.user?.status === "active" ? "default" : "secondary"}>
                            {application.user?.status || "Unknown"}
                          </Badge>
                        </div>
                      </div>

                      {applicationForm && (
                        <div className="mt-4">
                          <h3 className="text-md font-medium mb-2">Application Form</h3>
                          <p className="text-sm text-muted-foreground">{applicationForm.name}</p>
                          {applicationForm.description && (
                            <p className="text-sm text-muted-foreground mt-1">{applicationForm.description}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  {getSortedSections().map((section) => (
                    <TabsContent key={section.name} value={section.name} className="mt-0 p-0">
                      <div>
                        <h2 className="text-xl font-semibold mb-4">{section.name}</h2>
                        {renderSectionContent(section)}
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
