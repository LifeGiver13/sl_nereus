
import React, { useState, useEffect } from 'react';
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
    displayName: string;
  };
  instructions: string;
  notes: string;
  status: string;
  confirmed: boolean;
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
  const { data: existingPlacements, refetch: refetchPlacements } = useQuery({
    queryKey: ['placements', id],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/job/${id}/placements`);
      if (!response.ok) {
        return { results: [] };
      }
      const data = await response.json();
      console.log('Existing placements response:', data);
      
      return {
        results: Array.isArray(data?.results) ? data.results : []
      };
    },
    enabled: !!id
  });

  // Update placements state when existing placements are loaded
  useEffect(() => {
    console.log('Existing placements data:', existingPlacements);
    
    if (existingPlacements?.results && Array.isArray(existingPlacements.results)) {
      const existingPlacementRows = existingPlacements.results.map((placement: any) => {
        const firstName = placement.user?.profile?.Forename || 'Unknown';
        const lastName = placement.user?.profile?.Surname || 'User';
        const email = placement.user?.username || '';
        const displayName = `${firstName} ${lastName} (${email})`;
        
        return {
          id: placement.id,
          userId: placement.userId,
          user: {
            id: placement.user?.id || placement.userId,
            displayName: displayName
          },
          instructions: placement.meta?.instructions || '',
          notes: placement.meta?.notes || '',
          status: placement.status || 'awaiting_confirmation',
          confirmed: placement.confirmed || false,
          isPlaceholder: false
        };
      });
      setPlacements(existingPlacementRows);
    } else {
      setPlacements([]);
    }
  }, [existingPlacements]);

  const handleAddUser = (user: any, source: 'search' | 'suggested') => {
    const totalPlacements = placements.length;
    if (totalPlacements >= (job?.vacancies || 0)) {
      return;
    }

    const existingPlacement = placements.find(p => p.userId === user.id);
    if (existingPlacement) {
      return;
    }

    let displayName: string;
    
    if (source === 'search') {
      // For search results, use the name as provided
      displayName = `${user.firstName} ${user.lastName}`;
    } else {
      // For suggested candidates, use profile data with email
      const firstName = user.profile?.Forename || 'Unknown';
      const lastName = user.profile?.Surname || 'User';
      const email = user.username || '';
      displayName = `${firstName} ${lastName} (${email})`;
    }

    const newPlacement: PlacementRow = {
      userId: user.id,
      user: {
        id: user.id,
        displayName: displayName
      },
      instructions: '',
      notes: '',
      status: 'awaiting_confirmation',
      confirmed: false,
      isPlaceholder: true
    };

    setPlacements([...placements, newPlacement]);
  };

  const handleRemoveUser = (userId: number) => {
    setPlacements(placements.filter(p => p.userId !== userId));
  };

  const handleUpdatePlacement = (userId: number, field: 'instructions' | 'notes' | 'status' | 'confirmed', value: string | boolean) => {
    setPlacements(placements.map(p => 
      p.userId === userId ? { ...p, [field]: value } : p
    ));
  };

  const handleConfirmPlacements = async () => {
    if (!job) return;

    try {
      const placeholderPlacements = placements.filter(p => p.isPlaceholder);
      
      for (const placement of placeholderPlacements) {
        const placementData = {
          userId: placement.userId,
          jobId: job.id,
          departmentId: job.departmentId,
          shiftId: job.shiftId,
          confirmed: placement.confirmed,
          status: placement.status,
          meta: {
            instructions: placement.instructions,
            notes: placement.notes
          }
        };

        await fetch(`${API_BASE_URL}/placement`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(placementData)
        });
      }

      // Refresh placements to show confirmed ones
      await refetchPlacements();
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

  // Ensure placements is always an array
  const placementsArray = Array.isArray(placements) ? placements : [];
  const placeholderPlacements = placementsArray.filter(p => p.isPlaceholder);
  const existingPlacementsCount = placementsArray.filter(p => !p.isPlaceholder).length;
  const remainingVacancies = job?.vacancies - placementsArray.length || 0;
  const hasExistingPlacements = existingPlacementsCount > 0;

  // Ensure job.skills is always an array
  const jobSkills = Array.isArray(job.skills) ? job.skills : [];

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
            disabled={placeholderPlacements.length === 0}
            className="bg-[#712B71] hover:bg-[#712B71]/90"
          >
            Confirm Placements ({placeholderPlacements.length})
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
                  <Badge variant="outline">{placementsArray.length}/{job.vacancies}</Badge>
                  <span className="text-sm text-gray-500">
                    ({remainingVacancies} remaining)
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Existing Placements */}
        {hasExistingPlacements && (
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-[#000009]">Current Placements</CardTitle>
              <CardDescription>Existing placements for this job</CardDescription>
            </CardHeader>
            <CardContent>
              <PlacementsTable 
                placements={placementsArray.filter(p => !p.isPlaceholder)}
                onRemoveUser={handleRemoveUser}
                onUpdatePlacement={handleUpdatePlacement}
                showStatusControls={false}
              />
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* User Search */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-[#000009]">Search Users</CardTitle>
              <CardDescription>Find and add users to fill this job</CardDescription>
            </CardHeader>
            <CardContent>
              <UserSearchForm 
                onUserSelect={(user) => handleAddUser(user, 'search')}
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
                skillIds={jobSkills}
                onCandidateSelect={(user) => handleAddUser(user, 'suggested')}
                disabled={remainingVacancies <= 0}
              />
            </CardContent>
          </Card>
        </div>

        {/* New Placements Table */}
        {placeholderPlacements.length > 0 && (
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-[#000009]">New Placements</CardTitle>
              <CardDescription>Review and configure new placements before confirming</CardDescription>
            </CardHeader>
            <CardContent>
              <PlacementsTable 
                placements={placeholderPlacements}
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
