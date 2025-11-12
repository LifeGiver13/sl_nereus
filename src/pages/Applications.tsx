
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, MessageSquare, Check, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE_URL } from '../config/env';
import { PageSizeSelector } from '../components/ui/page-size-selector';
import { usePreferences } from '../hooks/usePreferences';

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

interface ApplicationsResponse {
  total: number;
  results: Application[];
}

const Applications = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);
  const { token } = useAuth();
  const { preferences, updateTablePreferences } = usePreferences();
  const navigate = useNavigate();
  const pageSize = preferences.table.pageSize;

  useEffect(() => {
    const fetchApplications = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/applications?limit=${pageSize}&offset=${(currentPage - 1) * pageSize}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch applications');
        }

        const data: ApplicationsResponse = await response.json();
        setApplications(data.results);
        setTotal(data.total);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    if (token) {
      fetchApplications();
    }
  }, [token, currentPage, pageSize]);

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

  const hasUnresolvedRemarks = (application: Application): boolean => {
    const remarks = application.meta?.remarks || {};
    return Object.values(remarks).some((sectionRemarks: any) => 
      Object.values(sectionRemarks).some((fieldRemarks: any) => 
        Array.isArray(fieldRemarks) && fieldRemarks.some((remark: any) => !remark.resolved)
      )
    );
  };

  const handleApplicationAction = async (applicationId: number, action: 'approve' | 'reject') => {
    const application = applications.find(app => app.id === applicationId);
    if (!application) return;

    // Prevent approval if there are unresolved remarks
    if (action === 'approve' && hasUnresolvedRemarks(application)) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/application/${applicationId}/${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to ${action} application`);
      }

      // Refresh applications list
      window.location.reload();
    } catch (error) {
      console.error(`Error ${action}ing application:`, error);
    }
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
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-[#000009]">Application Management</CardTitle>
                <CardDescription>View and process candidate applications</CardDescription>
              </div>
              <PageSizeSelector
                pageSize={pageSize}
                onPageSizeChange={(size) => {
                  updateTablePreferences({ pageSize: size });
                  setCurrentPage(1);
                }}
                totalItems={total}
              />
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
            ) : applications.length === 0 ? (
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
                      <TableHead>Status</TableHead>
                      <TableHead>Date Created</TableHead>
                      <TableHead>Last Update</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {applications.map((application) => (
                      <TableRow key={application.id} className="cursor-pointer hover:bg-gray-50" onClick={() => navigate(`/application/${application.id}`)}>
                        <TableCell className="font-medium">#{application.id}</TableCell>
                        <TableCell>{application.user?.username || 'N/A'}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {getStatusBadge(application.status)}
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
                          <div className="flex space-x-2">
                            <Link to={`/application/${application.id}`}>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 hover:bg-[#712B71] hover:text-white"
                                title="Review"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 hover:bg-[#712B71] hover:text-white"
                              title="Comment"
                            >
                              <MessageSquare className="h-4 w-4" />
                            </Button>
                            {hasUnresolvedRemarks(application) ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-gray-400 cursor-not-allowed"
                                title="Cannot approve - unresolved remarks"
                                disabled
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 hover:bg-green-600 hover:text-white"
                                title="Approve"
                                onClick={() => handleApplicationAction(application.id, 'approve')}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 hover:bg-red-600 hover:text-white"
                              title="Reject"
                              onClick={() => handleApplicationAction(application.id, 'reject')}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                
                {/* Pagination */}
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {applications.length} of {total} results
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <span className="text-sm text-muted-foreground flex items-center px-2">
                      Page {currentPage} of {Math.ceil(total / pageSize)}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.min(Math.ceil(total / pageSize), currentPage + 1))}
                      disabled={currentPage === Math.ceil(total / pageSize)}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default Applications;
