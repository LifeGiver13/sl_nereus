import React, { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import AdminLayout from "../components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, MessageSquare, Check, FileSignature, ChevronUp, ChevronDown, ChevronsUpDown, UserRound } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { API_BASE_URL } from "../config/env";
import { PageSizeSelector } from "../components/ui/page-size-selector";
import { usePreferences } from "../hooks/usePreferences";
import { DocuSignInviteModal } from "../components/DocuSignInviteModal";
import { IconActionButton, IconActionTooltip } from "@/components/IconActionTooltip";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";



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
  status: "complete" | "incomplete";
  data: { [key: string]: any };
  meta: { [key: string]: any };
  user?: User;
  createdAt: string;
  updatedAt: string;
}

interface ApplicationsResponse {
  total: number;
  results: Application[];
}

// Label mappings for user-friendly display
const STAGE_LABELS: { [key: string]: string } = {
  "pre-registration": "Pre-Registration",
  "full-registration": "Full Registration",
  processed: "Processed",
};

const STATUS_LABELS: { [key: string]: string } = {
  pending: "In Progress",
  submitted: "Pending Review",
  complete: "Completed",
  approved: "Approved",
  rejected: "Rejected",
  incomplete: "Incomplete",
  processed: "NA",
};

const Applications = () => {
  const [allApplications, setAllApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const [docuSignModalOpen, setDocuSignModalOpen] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);

  const [newAppModalOpen, setNewAppModalOpen] = useState(false);
  const [newAppLoading, setNewAppLoading] = useState(false);

  const [formData, setFormData] = useState({
    title: "Mr",
    forename: "",
    middleName: "",
    surname: "",
    email: "",
    referralCode: "",
  });

  const { toast } = useToast();
  const TITLE_OPTIONS = ["Mr", "Miss", "Ms", "Mrs", "Madam", "Dr", "Prof"];
  const STAGE_OPTIONS = [
    { value: "full-registration", label: "Full Registration" },
    { value: "pre-registration", label: "Pre-Registration" },

  ];

  const [selectedStage, setSelectedStage] = useState("full-registration");

  const { token } = useAuth();
  const { preferences, updateTablePreferences } = usePreferences();
  const navigate = useNavigate();

  const pageSize = preferences.table.pageSize || 10;

  const [usernameFilter, setUsernameFilter] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const getStageFromMeta = (application: Application): string => {
    return application.meta?.stage || "pre-registration";
  };
  const getStatusFromMeta = (application: Application): string => {
    const stage = getStageFromMeta(application);
    let status: string;

    if (stage === "pre-registration") {
      status = application.meta?.pre_registration || "pending";
    } else if (stage === "full-registration") {
      status = application.meta?.full_registration || "pending";
    } else if (stage === "processed") {
      status = "processed";
    } else {
      status = application.status;
    }

    return status.toLowerCase().trim();
  };

  const fetchApplications = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE_URL}/applications?limit=9999&offset=0`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error("Failed to fetch applications");

      const data: ApplicationsResponse = await response.json();
      setAllApplications(data.results || []);
      setError(null);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchApplications();
    }
  }, [token]);

  // Client-side filtering
  const filteredApplications = useMemo(() => {
    return allApplications.filter((app) => {
      const matchesUsername = !usernameFilter.trim() ||
        (app.data?.['Basic Information']?.fields?.firstName?.toLowerCase() || "").includes(usernameFilter.toLowerCase()) || (app.data?.['Basic Information']?.fields?.title?.toLowerCase() || "").includes(usernameFilter.toLowerCase()) || (app.data?.['Basic Information']?.fields?.lastName?.toLowerCase() || "").includes(usernameFilter.toLowerCase());

      const matchesStage = !stageFilter || getStageFromMeta(app) === stageFilter;

      const matchesStatus = !statusFilter ||
        getStatusFromMeta(app).toLowerCase() === statusFilter.toLowerCase();

      return matchesUsername && matchesStage && matchesStatus;
    });
  }, [allApplications, usernameFilter, stageFilter, statusFilter]);

  const total = filteredApplications.length;
  const totalPages = Math.ceil(total / pageSize);

  // Current page data
  const paginatedApplications = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredApplications.slice(start, start + pageSize);
  }, [filteredApplications, currentPage, pageSize]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [usernameFilter, stageFilter, statusFilter]);

  function formatDate(value: string): string {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "-";

    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).replace(/\//g, '/'); // Ensures 18/06/2026
  }

  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortColumn(column)
      setSortDirection("asc")
    }
  }

  const isProcessed = (application: Application): boolean => {
    return getStageFromMeta(application) === "processed";
  };

  const getStatusBadge = (status: string) => {
    const normalizedStatus = status.toLocaleLowerCase().trim();

    const statusColors: { [key: string]: string } = {
      complete: "bg-green-500 hover:bg-green-600",
      submitted: "bg-blue-500 hover:bg-blue-600",
      pending: "bg-yellow-500 hover:bg-yellow-600",
      incomplete: "bg-orange-500 hover:bg-orange-600",
      rejected: "bg-red-500 hover:bg-red-600",
      processed: "bg-gray-400 hover:bg-gray-500",
    };

    const displayText = STATUS_LABELS[normalizedStatus] ||
      normalizedStatus.charAt(0).toUpperCase() + normalizedStatus.slice(1);

    return (
      <Badge variant="default" className={statusColors[normalizedStatus] || "bg-gray-500 hover:bg-gray-600"}>
        {displayText}
      </Badge>
    );
  };

  const canSendDocuSignInvite = (application: Application): boolean => {
    const stage = getStageFromMeta(application);
    const status = application.meta?.full_registration;
    return stage === "full-registration" && status === "complete";
  };

  const handleDocuSignInvite = (application: Application, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedApplication(application);
    setDocuSignModalOpen(true);
  };

  const handleDocuSignSuccess = () => {
    window.location.reload();
  };

  const hasUnresolvedRemarks = (application: Application): boolean => {
    const remarks = application.meta?.remarks || {};
    return Object.values(remarks).some((sectionRemarks: any) =>
      Object.values(sectionRemarks).some(
        (fieldRemarks: any) => Array.isArray(fieldRemarks) && fieldRemarks.some((remark: any) => !remark.resolved),
      ),
    );
  };

  const handleApplicationAction = async (applicationId: number, action: "approve" | "reject") => {
    const application = allApplications.find((app) => app.id === applicationId);
    if (!application) return;

    if (action === "approve" && hasUnresolvedRemarks(application)) {
      return;
    }

    const stage = getStageFromMeta(application);
    let decision: string = action;
    if (action === "approve") {
      decision = stage === "full-registration" ? "finalize" : "approve";
    }

    try {
      const response = await fetch(`${API_BASE_URL}/application/${applicationId}/${decision}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ application }),
      });

      if (!response.ok) throw new Error(`Failed to ${action} application`);

      window.location.reload();
    } catch (error) {
      console.error(`Error ${action}ing application:`, error);
    }
  };
  const handleCreateApplication = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.forename || !formData.surname || !formData.email) {
      toast({
        title: "Error",
        description: "Forename, Surname and Email are required",
        variant: "destructive"
      });
      return;
    }

    setNewAppLoading(true);

    try {
      const payload = {
        user: {
          username: formData.email,
          status: "inactive",
          data: {},
          meta: {
            title: formData.title,
            forename: formData.forename,
            middleName: formData.middleName,
            surname: formData.surname,
          }
        },
        application: {
          data: {
            "Basic Information": {
              fields: {
                title: formData.title,
                firstName: formData.forename,
                middleNames: formData.middleName,
                lastName: formData.surname,
                email: formData.email,
                referral_code: formData.referralCode || "",
              }
            }
          },
          meta: {
            stage: selectedStage,
            ...(selectedStage === "pre-registration" && {
              pre_registration: "pending",
            }),

            ...(selectedStage === "full-registration" && {
              pre_registration: "complete",
              full_registration: "pending",
            }),
          }
        }
      };

      const response = await fetch(`${API_BASE_URL}/applicant/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || result.error || "Failed to create application");
      }

      toast({
        title: "Success",
        description: "New application created successfully"
      });

      setNewAppModalOpen(false);

      // Reset form
      setFormData({
        title: "Mr",
        forename: "",
        middleName: "",
        surname: "",
        email: "",
        referralCode: "",
      });

      // Refresh the list
      fetchApplications();

    } catch (err: any) {
      console.error(err);
      toast({
        title: "Error",
        description: err.message || "Failed to create application",
        variant: "destructive"
      });
    } finally {
      setNewAppLoading(false);
    }
  };
  const sortedApplications = [...paginatedApplications].sort((a, b) => {
    if (!sortColumn) return 0;
    const dir = sortDirection === "asc" ? 1 : -1;

    switch (sortColumn) {
      case "id":
        return (a.id - b.id) * dir;

      case "username":
        return (a.data?.['Basic Information']?.fields?.firstName ?? "").localeCompare(b.data?.['Basic Information']?.fields?.firstName ?? "") * dir;

      case "createdAt":
        return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * dir;

      case "updatedAt":
        return (new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()) * dir;

      case "status":
        return (
          getStatusFromMeta(a).localeCompare(
            getStatusFromMeta(b)
          ) * dir
        );

      case "stage":
        return (
          getStageFromMeta(a).localeCompare(
            getStageFromMeta(b)
          ) * dir
        );

      default:
        return 0;
    }
  });


  const SortIcon = ({ column, sortColumn, sortDirection }: {
    column: string;
    sortColumn: string | null;
    sortDirection: 'asc' | 'desc';
  }) => {
    if (sortColumn !== column) return <ChevronsUpDown className="h-3.5 w-3.5 ml-1 text-gray-400 inline" />;
    if (sortDirection === 'asc') return <ChevronUp className="h-3.5 w-3.5 ml-1 inline" />;
    return <ChevronDown className="h-3.5 w-3.5 ml-1 inline" />;
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pages = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <PaginationItem key={i}>
          <PaginationLink
            href="#"
            isActive={i === currentPage}
            onClick={(e) => {
              e.preventDefault();
              setCurrentPage(i);
            }}
          >
            {i}
          </PaginationLink>
        </PaginationItem>
      );
    }

    return (
      <Pagination className="mt-6">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              href="#"
              onClick={(e) => {
                e.preventDefault();
                if (currentPage > 1) setCurrentPage(currentPage - 1);
              }}
              className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
            />
          </PaginationItem>
          {pages}
          <PaginationItem>
            <PaginationNext
              href="#"
              onClick={(e) => {
                e.preventDefault();
                if (currentPage < totalPages) setCurrentPage(currentPage + 1);
              }}
              className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#000009]">
              Applications
            </h1>
            <p className="text-gray-600 mt-1">
              Manage job applications and candidate submissions
            </p>
          </div>
{/* 
          <Link
            to="/people"
            className="text-[#712B71] hover:underline font-medium"
          >
            Go to People →
          </Link> */}
        </div>

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-[#000009]">Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div className="space-y-1">
                <label className="text-sm font-medium">Username</label>
                <input
                  className="border rounded px-2 py-1.5 text-sm w-full"
                  placeholder="Filter by username..."
                  value={usernameFilter}
                  onChange={(e) => setUsernameFilter(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Stage</label>
                <select
                  className="border rounded px-2 py-1.5 text-sm w-full"
                  value={stageFilter}
                  onChange={(e) => setStageFilter(e.target.value)}
                >
                  <option value="">All stages</option>
                  {Object.entries(STAGE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Status</label>
                <select
                  className="border rounded px-2 py-1.5 text-sm w-full"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="">All statuses</option>
                  {Object.entries(STATUS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <Button variant="outline" onClick={() => {
                setUsernameFilter('');
                setStageFilter('');
                setStatusFilter('');
              }}>
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-[#000009]">Application Management</CardTitle>
                <CardDescription>View and process candidate applications</CardDescription>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  className="bg-[#712B71] hover:bg-[#712B71]/90"
                  onClick={() => setNewAppModalOpen(true)}
                >
                  + New Application
                </Button>
                <PageSizeSelector
                  pageSize={pageSize}
                  onPageSizeChange={(size) => {
                    updateTablePreferences({ pageSize: size });
                  }}
                  totalItems={total}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-12">
                <p className="text-gray-500">Loading applications...</p>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <p className="text-red-500">Error: {error}</p>
              </div>
            ) : allApplications.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">No applications found</p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="cursor-pointer select-none" onClick={() => handleSort("id")}>
                        Application ID <SortIcon column="id" sortColumn={sortColumn} sortDirection={sortDirection} />
                      </TableHead>
                      <TableHead className="cursor-pointer select-none" onClick={() => handleSort("username")}>
                        Username <SortIcon column="username" sortColumn={sortColumn} sortDirection={sortDirection} />
                      </TableHead>
                      <TableHead className="cursor-pointer select-none" onClick={() => handleSort("stage")}>
                        Stage <SortIcon column="stage" sortColumn={sortColumn} sortDirection={sortDirection} />
                      </TableHead>
                      <TableHead className="cursor-pointer select-none" onClick={() => handleSort("status")}>
                        Status <SortIcon column="status" sortColumn={sortColumn} sortDirection={sortDirection} />
                      </TableHead>
                      <TableHead className="cursor-pointer select-none" onClick={() => handleSort("createdAt")}>
                        Date Created <SortIcon column="createdAt" sortColumn={sortColumn} sortDirection={sortDirection} />
                      </TableHead>
                      <TableHead className="cursor-pointer select-none" onClick={() => handleSort("updatedAt")}>
                        Last Update <SortIcon column="updatedAt" sortColumn={sortColumn} sortDirection={sortDirection} />
                      </TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedApplications.map((application) => (
                      <TableRow
                        key={application.id}
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => navigate(`/application/${application.id}`)}
                      >
                        <TableCell className="font-medium">#{application.id}</TableCell>
                        <TableCell>{`${application.data?.['Basic Information']?.fields?.firstName} ${application.data?.['Basic Information']?.fields?.lastName}` || application.user?.profile?.fullName || application.user?.username || "N/A"}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {STAGE_LABELS[getStageFromMeta(application)] || getStageFromMeta(application)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {getStatusBadge(getStatusFromMeta(application))}
                            {hasUnresolvedRemarks(application) && (
                              <div className="flex items-center space-x-1" title="Unresolved remarks">
                                <MessageSquare className="h-3 w-3 text-orange-500" />
                                <span className="text-xs text-orange-500">Remarks</span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{formatDate(application.createdAt)}</TableCell>
                        <TableCell>{formatDate(application.updatedAt)}</TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>

                          <div className="flex flex-wrap items-center gap-1.5">
                            <IconActionTooltip label="Review application">
                              <span className="inline-flex">
                                <Link to={`/application/${application.id}`}>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-9 w-9 p-0 hover:bg-[#712B71] hover:text-white"
                                    aria-label="Review application"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </Link>
                              </span>
                            </IconActionTooltip>

                            <IconActionButton
                              label="View user in People"
                              variant="ghost"
                              size="sm"
                              className="h-9 w-9 p-0 hover:bg-[#712B71] hover:text-white"
                              onClick={() => navigate(`/user/${application.userId}`)}
                            >
                              <UserRound className="h-4 w-4" />
                            </IconActionButton>

                            {!isProcessed(application) && (
                              <>
                                {hasUnresolvedRemarks(application) ? (
                                  <IconActionButton
                                    label="Cannot approve — unresolved remarks"
                                    variant="ghost"
                                    size="sm"
                                    className="h-9 w-9 p-0 text-gray-400 cursor-not-allowed"
                                    disabled
                                  >
                                    <Check className="h-4 w-4" />
                                  </IconActionButton>
                                ) : (
                                  <IconActionButton
                                    label="Approve application"
                                    variant="ghost"
                                    size="sm"
                                    className="h-9 w-9 p-0 hover:bg-green-600 hover:text-white"
                                    onClick={() => handleApplicationAction(application.id, "approve")}
                                  >
                                    <Check className="h-4 w-4" />
                                  </IconActionButton>
                                )}
                              </>
                            )}

                            {(canSendDocuSignInvite(application) || isProcessed(application)) && (
                              <IconActionButton
                                label="Send DocuSign invitation"
                                variant="ghost"
                                size="sm"
                                className="h-9 w-9 p-0 hover:bg-purple-600 hover:text-white"
                                onClick={(e) => handleDocuSignInvite(application, e)}
                              >
                                <FileSignature className="h-4 w-4" />
                              </IconActionButton>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>


                {renderPagination()}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* New Application Modal */}
      <Dialog open={newAppModalOpen} onOpenChange={setNewAppModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Application</DialogTitle>
            <DialogDescription>Enter basic candidate information</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateApplication} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Select
                  value={formData.title}
                  onValueChange={(value) => setFormData({ ...formData, title: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TITLE_OPTIONS.map(title => (
                      <SelectItem key={title} value={title}>{title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="forename">Forename *</Label>
                <Input
                  id="forename"
                  value={formData.forename}
                  onChange={(e) => setFormData({ ...formData, forename: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="middleName">Middle Name(s)</Label>
              <Input
                id="middleName"
                value={formData.middleName}
                onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="surname">Surname *</Label>
              <Input
                id="surname"
                value={formData.surname}
                onChange={(e) => setFormData({ ...formData, surname: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>


            <div className="space-y-2">
              <Label htmlFor="referralCode">Referral Code</Label>
              <Input
                id="referralCode"
                value={formData.referralCode}
                onChange={(e) => setFormData({ ...formData, referralCode: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Application Stage</Label>

              <div className="flex flex-col gap-2">
                {STAGE_OPTIONS.map((stage) => (
                  <label
                    key={stage.value}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="stage"
                      value={stage.value}
                      checked={selectedStage === stage.value}
                      onChange={(e) => setSelectedStage(e.target.value)}
                    />

                    <span>{stage.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setNewAppModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-[#712B71] hover:bg-[#712B71]/90" disabled={newAppLoading}>
                {newAppLoading ? "Creating..." : "Create Application"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {selectedApplication && (
        <DocuSignInviteModal
          isOpen={docuSignModalOpen}
          onClose={() => {
            setDocuSignModalOpen(false);
            setSelectedApplication(null);
          }}
          application={selectedApplication}
          onSuccess={handleDocuSignSuccess}
        />
      )}
    </AdminLayout>
  );
};

export default Applications;