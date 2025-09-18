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
import { useToast } from '@/components/ui/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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

interface AvailabilityWindow {
  startDate: Date;
  endDate: Date;
}

interface PlacementRow {
  id?: number;
  userId: number;
  slotId: number;
  user: {
    id: number;
    displayName: string;
  };
  instructions: string;
  notes: string;
  status: string;
  confirmed: boolean;
  isPlaceholder: boolean;
  meta?: {
    availability?: AvailabilityWindow[];
    instructions?: string;
    notes?: string;
  };
}

interface Slot {
  id: number;
  placements: PlacementRow[];
  occupiedDates: Set<string>; // ISO date strings for dates already filled
}

const JobFill = () => {
  const { id } = useParams<{ id: string }>();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState<number>(1);
  const [showOverlapDialog, setShowOverlapDialog] = useState(false);
  const [pendingUser, setPendingUser] = useState<any>(null);
  const [pendingSource, setPendingSource] = useState<'search' | 'suggested' | null>(null);
  const [overlapDetails, setOverlapDetails] = useState<string>('');
  const { toast } = useToast();

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
      const response = await fetch(`${API_BASE_URL}/placements/job/${id}`);
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

  // Initialize slots when job data is available
  useEffect(() => {
    if (job && job.vacancies) {
      const initialSlots: Slot[] = [];
      for (let i = 1; i <= job.vacancies; i++) {
        initialSlots.push({
          id: i,
          placements: [],
          occupiedDates: new Set()
        });
      }
      setSlots(initialSlots);
      setSelectedSlotId(1);
    }
  }, [job]);

  // Calculate occupied dates for a slot based on its placements
  const calculateOccupiedDates = (placements: PlacementRow[]): Set<string> => {
    const dates = new Set<string>();
    placements.forEach(placement => {
      if (placement.meta?.availability) {
        placement.meta.availability.forEach(window => {
          const current = new Date(window.startDate);
          const end = new Date(window.endDate);
          while (current <= end) {
            dates.add(current.toISOString().split('T')[0]);
            current.setDate(current.getDate() + 1);
          }
        });
      }
    });
    return dates;
  };

  // Update slots when existing placements are loaded
  useEffect(() => {
    console.log('Existing placements data:', existingPlacements);
    
    if (existingPlacements?.results && Array.isArray(existingPlacements.results) && job && slots.length > 0) {
      const updatedSlots = slots.map(slot => ({ ...slot, placements: [] }));
      
      existingPlacements.results.forEach((placement: any) => {
        const firstName = placement.user?.profile?.Forename || 'Unknown';
        const lastName = placement.user?.profile?.Surname || 'User';
        const email = placement.user?.username || '';
        const displayName = `${firstName} ${lastName} (${email})`;
        
        // Assign to slot based on placement metadata or default to first available slot
        const assignedSlotId = placement.meta?.slotId || 1;
        const slotIndex = updatedSlots.findIndex(s => s.id === assignedSlotId);
        const targetSlotIndex = slotIndex >= 0 ? slotIndex : 0;
        
        const placementRow: PlacementRow = {
          id: placement.id,
          userId: placement.userId,
          slotId: assignedSlotId,
          user: {
            id: placement.user?.id || placement.userId,
            displayName: displayName
          },
          instructions: placement.meta?.instructions || '',
          notes: placement.meta?.notes || '',
          status: placement.status || 'awaiting_confirmation',
          confirmed: placement.confirmed || false,
          isPlaceholder: false,
          meta: {
            availability: placement.meta?.availability ? 
              placement.meta.availability
                .filter((window: any) => window && window.startDate && window.endDate)
                .map((window: any) => ({
                  startDate: new Date(window.startDate),
                  endDate: new Date(window.endDate)
                })) : [{
                  startDate: new Date(job.startDate),
                  endDate: new Date(job.endDate)
                }],
            instructions: placement.meta?.instructions || '',
            notes: placement.meta?.notes || ''
          }
        };
        
        updatedSlots[targetSlotIndex].placements.push(placementRow);
      });
      
      // Update occupied dates for each slot
      updatedSlots.forEach(slot => {
        slot.occupiedDates = calculateOccupiedDates(slot.placements);
      });
      
      setSlots(updatedSlots);
    }
  }, [existingPlacements, job]);

  const checkForOverlappingPlacements = (user: any) => {
    if (!user.placements || !Array.isArray(user.placements) || !job) {
      return null;
    }

    const jobStart = new Date(job.startDate);
    const jobEnd = new Date(job.endDate);

    const overlappingPlacements = user.placements.filter((placement: any) => {
      if (!placement.job) return false;
      
      const placementStart = new Date(placement.job.startDate);
      const placementEnd = new Date(placement.job.endDate);
      
      // Check for date overlap
      return (placementStart <= jobEnd && placementEnd >= jobStart);
    });

    return overlappingPlacements.length > 0 ? overlappingPlacements : null;
  };

  const checkSlotAvailability = (slotId: number, proposedAvailability: AvailabilityWindow[]): boolean => {
    const slot = slots.find(s => s.id === slotId);
    if (!slot) return false;
    
    // Check if any of the proposed dates overlap with existing placements in this slot
    for (const window of proposedAvailability) {
      const current = new Date(window.startDate);
      const end = new Date(window.endDate);
      while (current <= end) {
        const dateString = current.toISOString().split('T')[0];
        if (slot.occupiedDates.has(dateString)) {
          return false;
        }
        current.setDate(current.getDate() + 1);
      }
    }
    
    return true;
  };

  const handleAddUser = async (user: any, source: 'search' | 'suggested') => {
    // Check if user is already in any slot
    const existingPlacement = slots.some(slot => 
      slot.placements.some(p => p.userId === user.id)
    );
    
    if (existingPlacement) {
      toast({
        title: "User already added",
        description: "This user has already been added to this job.",
        variant: "destructive",
      });
      return;
    }

    // Fetch complete user object with placements
    try {
      const response = await fetch(`${API_BASE_URL}/user/${user.id}`, {
        headers: {
          'x-service-user': localStorage.getItem('session_token') || '',
        },
      });
      
      if (!response.ok) {
        toast({
          title: "Error",
          description: "Failed to fetch user details.",
          variant: "destructive",
        });
        return;
      }

      const completeUser = await response.json();

      // Check for overlapping placements using complete user data
      const overlappingPlacements = checkForOverlappingPlacements(completeUser);
      if (overlappingPlacements && overlappingPlacements.length > 0) {
        const overlapInfo = overlappingPlacements.map((placement: any) => 
          `${placement.job.title} (${new Date(placement.job.startDate).toLocaleDateString()} - ${new Date(placement.job.endDate).toLocaleDateString()})`
        ).join(', ');
        
        setOverlapDetails(overlapInfo);
        setPendingUser(user); // Keep original user for display purposes
        setPendingSource(source);
        setShowOverlapDialog(true);
        return;
      }

      // No overlaps, proceed with adding the user
      addUserToSlot(user, source, selectedSlotId);
    } catch (error) {
      console.error('Error fetching user details:', error);
      toast({
        title: "Error",
        description: "Failed to fetch user details.",
        variant: "destructive",
      });
    }
  };

  const addUserToSlot = (user: any, source: 'search' | 'suggested', slotId: number) => {
    if (!job) return;
    
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

    const defaultAvailability = [{
      startDate: new Date(job.startDate),
      endDate: new Date(job.endDate)
    }];

    // Check if the full job period is available in the selected slot
    if (!checkSlotAvailability(slotId, defaultAvailability)) {
      toast({
        title: "Slot unavailable",
        description: "The selected slot has conflicts for the full job period. Please select another slot or adjust dates later.",
        variant: "destructive",
      });
      return;
    }

    const newPlacement: PlacementRow = {
      userId: user.id,
      slotId: slotId,
      user: {
        id: user.id,
        displayName: displayName
      },
      instructions: '',
      notes: '',
      status: 'accepted',
      confirmed: true,
      isPlaceholder: true,
      meta: {
        availability: defaultAvailability,
        instructions: '',
        notes: ''
      }
    };

    // Update the specific slot
    setSlots(slots.map(slot => {
      if (slot.id === slotId) {
        const updatedPlacements = [...slot.placements, newPlacement];
        return {
          ...slot,
          placements: updatedPlacements,
          occupiedDates: calculateOccupiedDates(updatedPlacements)
        };
      }
      return slot;
    }));
  };

  const handleConfirmOverlap = () => {
    if (pendingUser && pendingSource) {
      addUserToSlot(pendingUser, pendingSource, selectedSlotId);
    }
    setShowOverlapDialog(false);
    setPendingUser(null);
    setPendingSource(null);
    setOverlapDetails('');
  };

  const handleCancelOverlap = () => {
    setShowOverlapDialog(false);
    setPendingUser(null);
    setPendingSource(null);
    setOverlapDetails('');
  };

  const handleRemoveUser = (userId: number) => {
    setSlots(slots.map(slot => ({
      ...slot,
      placements: slot.placements.filter(p => p.userId !== userId),
      occupiedDates: calculateOccupiedDates(slot.placements.filter(p => p.userId !== userId))
    })));
  };

  const handleUpdatePlacement = (userId: number, field: 'instructions' | 'notes' | 'status' | 'confirmed' | 'meta', value: string | boolean | any) => {
    setSlots(slots.map(slot => ({
      ...slot,
      placements: slot.placements.map(p => {
        if (p.userId === userId) {
          if (field === 'meta') {
            const updatedPlacement = { ...p, meta: { ...p.meta, ...value } };
            // Recalculate occupied dates if availability changed
            if (value.availability) {
              slot.occupiedDates = calculateOccupiedDates(slot.placements.map(placement => 
                placement.userId === userId ? updatedPlacement : placement
              ));
            }
            return updatedPlacement;
          }
          return { ...p, [field]: value };
        }
        return p;
      })
    })));
  };

  const handleConfirmPlacements = async () => {
    if (!job) return;

    try {
      const allPlaceholderPlacements = slots.flatMap(slot => 
        slot.placements.filter(p => p.isPlaceholder)
      );
      
      for (const placement of allPlaceholderPlacements) {
        const placementData = {
          userId: placement.userId,
          jobId: job.id,
          departmentId: job.departmentId,
          shiftId: job.shiftId,
          confirmed: placement.confirmed,
          status: placement.status,
          meta: {
            slotId: placement.slotId,
            instructions: placement.instructions,
            notes: placement.notes,
            availability: placement.meta?.availability?.map((window: any) => ({
              startDate: window.startDate.toISOString(),
              endDate: window.endDate.toISOString()
            })) || []
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

  // Calculate totals
  const allPlacements = slots.flatMap(slot => slot.placements);
  const placeholderPlacements = allPlacements.filter(p => p.isPlaceholder);
  const hasPlacements = allPlacements.length > 0;

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
                  <Badge variant="outline">{job.vacancies} slots</Badge>
                  <span className="text-sm text-gray-500">
                    ({allPlacements.length} assigned)
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Slot-based Placements */}
        {slots.map((slot) => (
          <Card key={slot.id} className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-[#000009]">
                Slot {slot.id}
                <Badge variant="secondary" className="ml-2">
                  {slot.placements.length} candidates
                </Badge>
              </CardTitle>
              <CardDescription>
                Placements for vacancy slot {slot.id}
                {slot.occupiedDates.size > 0 && (
                  <span className="text-sm text-amber-600 ml-2">
                    ({slot.occupiedDates.size} days occupied)
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {slot.placements.length > 0 ? (
                <PlacementsTable 
                  placements={slot.placements}
                  onRemoveUser={handleRemoveUser}
                  onUpdatePlacement={handleUpdatePlacement}
                  onRefresh={refetchPlacements}
                  jobStartDate={job.startDate}
                  jobEndDate={job.endDate}
                  showStatusControls={false}
                  showConfirmedControls={false}
                />
              ) : (
                <p className="text-gray-500 text-center py-4">No candidates assigned to this slot</p>
              )}
            </CardContent>
          </Card>
        ))}

        {/* Confirm Placements Button */}
        {placeholderPlacements.length > 0 && (
          <Card className="border-0 shadow-lg">
            <CardContent className="pt-6">
              <div className="flex justify-end">
                <Button 
                  onClick={handleConfirmPlacements}
                  disabled={placeholderPlacements.length === 0}
                  className="bg-[#712B71] hover:bg-[#712B71]/90"
                >
                  Confirm Placements ({placeholderPlacements.length})
                </Button>
              </div>
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
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Select Slot</label>
                <Select value={selectedSlotId.toString()} onValueChange={(value) => setSelectedSlotId(parseInt(value))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {slots.map((slot) => (
                      <SelectItem key={slot.id} value={slot.id.toString()}>
                        Slot {slot.id} ({slot.placements.length} candidates, {slot.occupiedDates.size} days occupied)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <UserSearchForm 
                onUserSelect={(user) => handleAddUser(user, 'search')}
                disabled={false}
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
                disabled={false}
              />
            </CardContent>
          </Card>
        </div>

        {/* Overlap Warning Dialog */}
        <AlertDialog open={showOverlapDialog} onOpenChange={setShowOverlapDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Potential Scheduling Conflict</AlertDialogTitle>
              <AlertDialogDescription>
                This candidate already has placements that overlap with this job's timeframe:
                <br /><br />
                <strong>{overlapDetails}</strong>
                <br /><br />
                Are you sure you want to add them to Slot {selectedSlotId}?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={handleCancelOverlap}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmOverlap}>
                Add to Slot {selectedSlotId}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

      </div>
    </AdminLayout>
  );
};

export default JobFill;