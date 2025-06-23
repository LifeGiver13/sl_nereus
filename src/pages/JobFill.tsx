import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { API_BASE_URL } from '../config/env';
import UserSearchForm from '../components/UserSearchForm';
import PlacementsTable from '../components/PlacementsTable';
import SuggestedCandidates from '../components/SuggestedCandidates';

interface Job {
  id: number;
  clientId: number;
  client?: {
    id: number;
    name: string;
  };
  departmentId: number;
  department?: {
    id: number;
    name: string;
  };
  title: string;
  description: string;
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
  skills: number[];
  assignees: number[];
}

interface PlacementRow {
  id?: number;
  userId: number;
  user: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  };
  instructions: string;
  notes: string;
  isPlaceholder: boolean;
}

const JobFill = () => {
  const { id } = useParams<{ id: string }>();
  const [placements, setPlacements] = useState<PlacementRow[]>([]);

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

  // Fetch existing placements for this job
  const { data: existingPlacements } = useQuery({
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

  const handleAddUser = (user: any) => {
    if (placements.length >= (job?.vacancies || 0)) {
      return;
    }

    const existingPlacement = placements.find(p => p.userId === user.id);
    if (existingPlacement) {
      return;
    }

    const newPlacement: PlacementRow = {
      userId: user.id,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email
      },
      instructions: '',
      notes: '',
      isPlaceholder: true
    };

    setPlacements([...placements, newPlacement]);
  };

  const handleRemoveUser = (userId: number) => {
    setPlacements(placements.filter(p => p.userId !== userId));
  };

  const handleUpdatePlacement = (userId: number, field: 'instructions' | 'notes', value: string) => {
    setPlacements(placements.map(p => 
      p.userId === userId ? { ...p, [field]: value } : p
    ));
  };

  const handleConfirmPlacements = async () => {
    if (!job) return;

    try {
      for (const placement of placements) {
        if (placement.isPlaceholder) {
          const placementData = {
            userId: placement.userId,
            jobId: job.id,
            departmentId: job.departmentId,
            shiftId: job.shiftId,
            confirmed: false,
            status: 'pending',
            meta: {
              instructions: placement.instructions,
              notes: placement.notes
            }
          };

          await fetch(`${API_BASE_URL}/placements`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(placementData)
          });
        }
      }

      // Refresh placements to show confirmed ones
      window.location.reload();
    } catch (error) {
      console.error('Error creating placements:', error);
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

  const remainingVacancies = job.vacancies - placements.length - (existingPlacements?.results?.length || 0);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link to={`/job/${job.id}`}>
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Job Details
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-[#000009]">Fill Job</h1>
              <p className="text-gray-600 mt-1">Job ID: {job.id}</p>
            </div>
          </div>
          <Button 
            onClick={handleConfirmPlacements}
            disabled={placements.length === 0}
            className="bg-[#712B71] hover:bg-[#712B71]/90"
          >
            Confirm Placements ({placements.length})
          </Button>
        </div>

        {/* Job Summary Card */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-[#000009]">{job.title}</CardTitle>
            <CardDescription>{job.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-500">Client</p>
                <p className="font-medium">{job.client?.name || `Client ID: ${job.clientId}`}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Department</p>
                <p className="font-medium">{job.department?.name || `Department ID: ${job.departmentId}`}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Shift</p>
                <p className="font-medium">
                  {job.shift ? `${job.shift.name} (${job.shift.startTime} - ${job.shift.endTime})` : `Shift ID: ${job.shiftId}`}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Vacancies</p>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline">{placements.length}/{job.vacancies}</Badge>
                  <span className="text-sm text-gray-500">
                    ({remainingVacancies} remaining)
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* User Search */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-[#000009]">Search Users</CardTitle>
              <CardDescription>Find and add users to fill this job</CardDescription>
            </CardHeader>
            <CardContent>
              <UserSearchForm 
                onUserSelect={handleAddUser}
                disabled={remainingVacancies <= 0}
              />
            </CardContent>
          </Card>

          {/* Suggested Candidates */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-[#000009]">Suggested Candidates</CardTitle>
              <CardDescription>Candidates that might be a good fit</CardDescription>
            </CardHeader>
            <CardContent>
              <SuggestedCandidates 
                skillIds={job.skills}
                onCandidateSelect={handleAddUser}
                disabled={remainingVacancies <= 0}
              />
            </CardContent>
          </Card>
        </div>

        {/* Placements Table */}
        {placements.length > 0 && (
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-[#000009]">Selected Placements</CardTitle>
              <CardDescription>Review and add instructions for selected users</CardDescription>
            </CardHeader>
            <CardContent>
              <PlacementsTable 
                placements={placements}
                onRemoveUser={handleRemoveUser}
                onUpdatePlacement={handleUpdatePlacement}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
};

export default JobFill;
