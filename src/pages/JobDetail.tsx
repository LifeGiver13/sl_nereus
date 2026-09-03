import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Edit, UserPlus, X } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useQuery } from '@tanstack/react-query';
import { API_BASE_URL } from '../config/env';
import PlacementDetailModal from '../components/PlacementDetailModal';
import PlacementEditModal from '../components/PlacementEditModal';
import PlacementCalendarTable from '../components/PlacementCalendarTable';

interface Job {
  id: number;
  clientId: number;
  client?: {
    id: number;
    name: string;
  };
  postedBy: number;
  departmentId: number;
  department?: {
    id: number;
    name: string;
  };
  title: string;
  description: string;
  body: any;
  meta: any;
  startDate: string;
  endDate: string;
  shiftId: number;
  shift?: {
    id: number;
    name: string;
    startTime: string;
    endTime: string;
  };
  vacancies: number;
  status: string;
  filled: boolean;
  skills: number[];
  assignees: number[];
  createdAt: string;
  updatedAt: string;
  contact?: { id: number; firstName: string; lastName: string; email: string; phone: string; position: string }; // ← added

}

interface Skill {
  id: number;
  name: string;
}

const JobDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedPlacement, setSelectedPlacement] = useState<any>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const { data: job, isLoading, error, refetch: refetchJob } = useQuery({
    queryKey: ['job', id],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/job/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch job details');
      }
      return response.json();
    }
  });

  const { data: skillsData } = useQuery({
    queryKey: ['skills'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/candidate/skills/indexed`);
      if (!response.ok) {
        throw new Error('Failed to fetch skills');
      }
      return response.json();
    }
  });

  const { data: existingPlacements, refetch: refetchPlacements } = useQuery({
    queryKey: ['placements', id],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/placements/job/${id}`);
      if (!response.ok) {
        return { results: [] };
      }
      const data = await response.json();
      return {
        results: Array.isArray(data?.results) ? data.results : []
      };
    },
    enabled: !!id
  });

  const getSkillNames = (skillIds: number[]) => {
    if (!skillsData || !skillIds) return [];

    const allSkills: Skill[] = [];
    Object.values(skillsData).forEach((categorySkills: any) => {
      allSkills.push(...categorySkills);
    });

    return skillIds.map(id => {
      const skill = allSkills.find(s => s.id === id);
      return skill ? skill.name : `Skill ID: ${id}`;
    });
  };

  const getDepartmentName = (departmentId: number, department?: { id: number; name: string }) => {
    if (department) {
      return department.name;
    }
    return `Department ID: ${departmentId}`;
  };

  const getClientName = (clientId: number, client?: { id: number; name: string }) => {
    if (client) {
      return client.name;
    }
    return `Client ID: ${clientId}`;
  };

  const getShiftName = (shiftId: number, shift?: { id: number; name: string; startTime: string; endTime: string }) => {
    if (shift) {
      return `${shift.name} (${shift.startTime} - ${shift.endTime})`;
    }
    return `Shift ID: ${shiftId}`;
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'open': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  const handleViewPlacement = (placement: any) => {
    setSelectedPlacement(placement);
    setIsDetailModalOpen(true);
  };

  const handleEditFromDetail = () => {
    setIsDetailModalOpen(false);
    setIsEditModalOpen(true);
  };

  const handleEditPlacement = (placement: any) => {
    setSelectedPlacement(placement);
    setIsEditModalOpen(true);
  };

  const handleSavePlacement = async () => {
    await refetchPlacements();
    await refetchJob();
    setSelectedPlacement(null);
  };

  function formatDate(value: string): string {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "-";

    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).replace(/\//g, '/');
  }

  const handleAssignCandidate = async (userId: number, slotId: number, dates: Date[]) => {
    try {
      for (const date of dates) {
        const placementData = {
          userId,
          jobId: job.id,
          departmentId: job.departmentId,
          shiftId: job.shiftId,
          confirmed: true,
          status: 'awaiting_confirmation',
          shiftDate: date.toISOString(),
          meta: {
            vacancy: slotId,
            shiftDate: date.toISOString(),
          }
        };

        const response = await fetch(`${API_BASE_URL}/placement`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(placementData)
        });

        if (!response.ok) {
          throw new Error('Failed to create placement');
        }
      }

      await refetchPlacements();
      await refetchJob();
      toast({
        title: 'Success',
        description: `Candidate assigned successfully`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to assign candidate',
        variant: 'destructive',
      });
    }
  };

  const handleCancel = () => {
    // Check if user came from a specific route, otherwise default to /jobs
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/jobs');
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading job details...</div>
        </div>
      </AdminLayout>
    );
  }

  if (error || !job) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-red-600">Error loading job details</div>
        </div>
      </AdminLayout>
    );
  }

  const skillNames = getSkillNames(job.skills || []);

  const placements = existingPlacements?.results || [];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link to="/jobs">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Jobs
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-[#000009]">Job Details</h1>
              <p className="text-gray-600 mt-1">Job ID: {job.id}</p>
            </div>
          </div>
          <div className="flex space-x-2">
            <Link to={`/jobs/edit/${job.id}`}>
              <Button variant="outline">
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </Link>
            <Link to={`/job/${job.id}/fill`}>
              <Button className="bg-[#712B71] hover:bg-[#712B71]/90">
                <UserPlus className="h-4 w-4 mr-2" />
                Fill
              </Button>
            </Link>
            <Button variant="destructive" onClick={handleCancel}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-[#000009]">Basic Information</CardTitle>
              <CardDescription>Core job details</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableBody>
                  <TableRow>
                    <TableHead className="w-1/3">Title</TableHead>
                    <TableCell>{job.title}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableCell>{job.description}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableCell>{getClientName(job.clientId, job.client)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableHead>Assigned Agency Department</TableHead>
                    <TableCell>{getDepartmentName(job.departmentId, job.department)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableHead>Posted By</TableHead>
                    <TableCell>{job.postedBy}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableCell>
                      <Badge className={getStatusColor(job.status)}>
                        {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableHead>Contact</TableHead>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      {job.contact ? (
                        <div className="text-sm">
                          <div className="font-medium">{job.contact.firstName} {job.contact.lastName}</div>
                          {job.contact.email && <div className="text-xs text-muted-foreground">{job.contact.email}</div>}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400"> - </span>
                      )}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableHead>Filled</TableHead>
                    <TableCell>
                      <Badge className={job.filled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                        {job.filled ? 'Yes' : 'No'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-[#000009]">Job Details</CardTitle>
              <CardDescription>Dates, vacancies, and assignments</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableBody>
                  <TableRow>
                    <TableHead className="w-1/3">Start Date</TableHead>
                    <TableCell>{formatDate(job.startDate)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableHead>End Date</TableHead>
                    <TableCell>{formatDate(job.endDate)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableHead>Shift</TableHead>
                    <TableCell>{getShiftName(job.shiftId, job.shift)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableHead>Vacancies</TableHead>
                    <TableCell>{job.vacancies}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableHead>Assigned Count</TableHead>
                    <TableCell>{job.assignees?.length || 0}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableHead>Skills Required</TableHead>
                    <TableCell>{skillNames.join(', ') || 'None'}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableHead>Created</TableHead>
                    <TableCell>{formatDate(job.createdAt)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableHead>Updated</TableHead>
                    <TableCell>{formatDate(job.updatedAt)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Job Schedule */}
        <PlacementCalendarTable
          job={job}
          existingPlacements={existingPlacements?.results || []}
          onAssignCandidate={handleAssignCandidate}
          onEditPlacement={handleEditPlacement}
          slots={job?.vacancies ? Array.from({ length: job.vacancies }, (_, i) => ({
            id: i + 1,
            placements: [],
            occupiedDates: new Set<string>()
          })) : [{ id: 1, placements: [], occupiedDates: new Set<string>() }]}
        />


        {job.assignees && job.assignees.length > 0 && (
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-[#000009]">Assignees</CardTitle>
              <CardDescription>People assigned to this job</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {job.assignees.map((assigneeId: number) => (
                  <Badge key={assigneeId} variant="outline">
                    User ID: {assigneeId}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <PlacementDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        onEdit={handleEditFromDetail}
        placement={selectedPlacement}
      />

      <PlacementEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleSavePlacement}
        placement={selectedPlacement}
        job={job}
        existingPlacements={existingPlacements?.results || []}
        slots={job?.vacancies ? Array.from({ length: job.vacancies }, (_, i) => ({
          id: i + 1,
          placements: [],
          occupiedDates: new Set<string>()
        })) : [{ id: 1, placements: [], occupiedDates: new Set<string>() }]}
      />
    </AdminLayout>
  );
};

export default JobDetail;
