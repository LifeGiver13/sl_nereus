import React, { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import AdminLayout from "../components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, MessageSquare, Check, FileSignature, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { API_BASE_URL } from "../config/env";
import { PageSizeSelector } from "../components/ui/page-size-selector";
import { usePreferences } from "../hooks/usePreferences";
import { DocuSignInviteModal } from "../components/DocuSignInviteModal";
import { IconActionButton, IconActionTooltip } from "@/components/IconActionTooltip";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';

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
  // Fetch ALL applications once (backend doesn't filter properly)
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
        (app.user?.username?.toLowerCase() || "").includes(usernameFilter.toLowerCase());

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };




  const isProcessed = (application: Application): boolean => {
    return getStageFromMeta(application) === "processed";
  };

  const getStatusBadge = (status: string) => {
    const normalizedStatus = status.toLocaleLowerCase();
    const statusColors: { [key: string]: string } = {
      complete: "bg-green-500 hover:bg-green-600",
      submitted: "bg-blue-500 hover:bg-blue-600",
      pending: "bg-yellow-500 hover:bg-yellow-600",
      incomplete: "bg-orange-500 hover:bg-orange-600",
      rejected: "bg-red-500 hover:bg-red-600",
      processed: "bg-gray-400 hover:bg-gray-500",
    };

    return (
      <Badge variant="default" className={statusColors[normalizedStatus] || "bg-gray-500 hover:bg-gray-600"}>
        {STATUS_LABELS[normalizedStatus] || status}
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
        <div>
          <h1 className="text-3xl font-bold text-[#000009]">Applications</h1>
          <p className="text-gray-600 mt-1">Manage job applications and candidate submissions</p>
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
                <Link to="/application/new">
                  <Button className="bg-[#712B71] hover:bg-[#712B71]/90">
                    + New Application
                  </Button>
                </Link>
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
                      <TableHead>Application ID</TableHead>
                      <TableHead>Username</TableHead>
                      <TableHead>Stage</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date Created</TableHead>
                      <TableHead>Last Update</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedApplications.map((application) => (
                      <TableRow
                        key={application.id}
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => navigate(`/application/${application.id}`)}
                      >
                        <TableCell className="font-medium">#{application.id}</TableCell>
                        <TableCell>{application.user?.username || "N/A"}</TableCell>
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