import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Edit, UserPlus, X, Eye } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { API_BASE_URL } from '../config/env';
import PlacementDetailModal from '../components/PlacementDetailModal';
import PlacementEditModal from '../components/PlacementEditModal';
import JobCalendar from '../components/JobCalendar';

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
}

interface Skill {
  id: number;
  name: string;
}

const JobDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [selectedPlacement, setSelectedPlacement] = useState<any>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const { data: job, isLoading, error } = useQuery({
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

  const { data: placementsData, refetch: refetchPlacements } = useQuery({
    queryKey: ['placements', id],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/placements/job/${id}`);
      if (!response.ok) {
        return { results: [] };
      }
      return response.json();
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

  const handleSavePlacement = () => {
    refetchPlacements();
    setSelectedPlacement(null);
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

  const placements = placementsData?.results || [];

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
                    <TableHead>Department</TableHead>
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
                        {job.status}
                      </Badge>
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
                    <TableCell>{new Date(job.startDate).toLocaleDateString()}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableHead>End Date</TableHead>
                    <TableCell>{new Date(job.endDate).toLocaleDateString()}</TableCell>
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
                    <TableCell>{new Date(job.createdAt).toLocaleString()}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableHead>Updated</TableHead>
                    <TableCell>{new Date(job.updatedAt).toLocaleString()}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Job Calendar */}
        <JobCalendar job={job} placements={placements} />

        {placements.length > 0 && (
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-[#000009]">Current Placements</CardTitle>
              <CardDescription>People assigned to this job</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Placement ID</TableHead>
                    <TableHead>Candidate ID</TableHead>
                    <TableHead>Candidate Name</TableHead>
                    <TableHead>Shift</TableHead>
                    <TableHead>Confirmed</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {placements.map((placement: any) => (
                    <TableRow key={placement.id}>
                      <TableCell className="font-medium">#{placement.id}</TableCell>
                      <TableCell>{placement.userId}</TableCell>
                      <TableCell>
                        {placement.user?.profile?.Forename && placement.user?.profile?.Surname 
                          ? `${placement.user.profile.Forename} ${placement.user.profile.Surname}`
                          : placement.user?.username || 'N/A'
                        }
                      </TableCell>
                      <TableCell>
                        {placement.shift 
                          ? `${placement.shift.name} (${placement.shift.startTime} - ${placement.shift.endTime})`
                          : 'N/A'
                        }
                      </TableCell>
                      <TableCell>
                        <Badge className={placement.confirmed ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                          {placement.confirmed ? 'Yes' : 'No'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {placement.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleViewPlacement(placement)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleEditPlacement(placement)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

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
        slots={job?.vacancies ? Array.from({length: job.vacancies}, (_, i) => ({
          id: i + 1,
          placements: [],
          occupiedDates: new Set<string>()
        })) : [{id: 1, placements: [], occupiedDates: new Set<string>()}]}
        jobStartDate={job?.startDate}
        jobEndDate={job?.endDate}
      />
    </AdminLayout>
  );
};

export default JobDetail;
