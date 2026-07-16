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
import PlacementCalendarTable from '../components/PlacementCalendarTable';
import SuggestedCandidates from '../components/SuggestedCandidates';
import PlacementDateModal from '../components/PlacementDateModal';
import PlacementDetailModal from '../components/PlacementDetailModal';
import PlacementEditModal from '../components/PlacementEditModal';
import { useToast } from '@/components/ui/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Placement } from '../types/job';
import { useAuth } from '../contexts/AuthContext';

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
  console.log('JobFill component: URL param id =', id);
  console.log('JobFill component: Current pathname =', window.location.pathname);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState<number>(1);
  const [showOverlapDialog, setShowOverlapDialog] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);
  const [pendingUser, setPendingUser] = useState<any>(null);
  const [pendingSource, setPendingSource] = useState<'search' | 'suggested' | null>(null);
  const [overlapDetails, setOverlapDetails] = useState<string>('');

  const [showPlacementDetail, setShowPlacementDetail] = useState(false);
  const [showPlacementEdit, setShowPlacementEdit] = useState(false);
  const [selectedPlacement, setSelectedPlacement] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [viewMode, setViewMode] = useState<'weekly' | 'monthly'>('weekly');
  const { toast } = useToast();
  const { user: currentUser } = useAuth();

  const { data: job, isLoading, error, refetch: refetchJob } = useQuery({
    queryKey: ['job', id],
    queryFn: async () => {
      console.log('JobFill: Fetching job with ID:', id);
      console.log('JobFill: Current URL params:', window.location.pathname);
      const response = await fetch(`${API_BASE_URL}/job/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch job details');
      }
      return response.json();
    },
    enabled: !!id
  });

  // Fetch existing placements for this job
  const { data: existingPlacements, refetch: refetchPlacements } = useQuery({
    queryKey: ['placements', id],
    queryFn: async () => {
      console.log('JobFill: Fetching placements for job ID:', id);
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

  // Fetch recently placed candidates for this job
  const { data: recentlyPlacedCandidates } = useQuery({
    queryKey: ['recentlyPlaced', id],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/candidates/recently-placed/job/${id}`);
      if (!response.ok) {
        return [];
      }
      const data = await response.json();
      return Array.isArray(data) ? data : [];
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
  const calculateOccupiedDates = (slotId: number, allPlacements: any[]): Set<string> => {
    const dates = new Set<string>();

    // Filter placements for this specific slot (vacancy)
    // Check meta.vacancy first, then top-level vacancy, then default to slot 1
    const slotPlacements = allPlacements.filter(p => (p.meta?.vacancy ?? p.vacancy ?? 1) === slotId);

    slotPlacements.forEach(placement => {
      // Each placement represents one date stored in meta.shiftDate
      if (!placement.meta?.shiftDate) {
        console.warn('Placement missing shiftDate:', placement);
        return;
      }

      const placementDate = new Date(placement.meta.shiftDate);

      // Validate date
      if (isNaN(placementDate.getTime())) {
        console.error('Invalid placement shiftDate:', placement.meta.shiftDate);
        return;
      }

      placementDate.setHours(12, 0, 0, 0); // Set to noon for consistency
      const dateString = placementDate.toISOString().split('T')[0];
      dates.add(dateString);
    });

    console.log(`Slot ${slotId} occupied dates:`, Array.from(dates));
    return dates;
  };

  // Update slots when existing placements are loaded - now using new placement structure
  useEffect(() => {
    console.log('Existing placements data:', existingPlacements);

    if (existingPlacements?.results && Array.isArray(existingPlacements.results) && job && slots.length > 0) {
      const updatedSlots = slots.map(slot => ({
        ...slot,
        placements: [],
        occupiedDates: calculateOccupiedDates(slot.id, existingPlacements.results)
      }));

      // Group placements by user to create consolidated placement rows
      const placementsByUser = new Map<number, any[]>();

      existingPlacements.results.forEach((placement: any) => {
        const userId = placement.userId;
        if (!placementsByUser.has(userId)) {
          placementsByUser.set(userId, []);
        }
        placementsByUser.get(userId)!.push(placement);
      });

      // Create placement rows for each user, grouping their dates
      placementsByUser.forEach((userPlacements, userId) => {
        const firstPlacement = userPlacements[0];
        const firstName = firstPlacement.user?.profile?.Forename || 'Unknown';
        const lastName = firstPlacement.user?.profile?.Surname || 'User';
        const email = firstPlacement.user?.username || '';
        const displayName = `${firstName} ${lastName} (${email})`;

        // Get the vacancy number from the first placement (they should all be the same for this user)
        // Check meta.vacancy first, then top-level vacancy, then default to slot 1
        const assignedSlotId = firstPlacement.meta?.vacancy ?? firstPlacement.vacancy ?? 1;
        const slotIndex = updatedSlots.findIndex(s => s.id === assignedSlotId);
        const targetSlotIndex = slotIndex >= 0 ? slotIndex : 0;

        // Collect all dates for this user's placements, filtering out invalid dates
        const availability = userPlacements
          .map(p => p.meta?.shiftDate || p.shiftDate)
          .filter(date => {
            if (!date) return false;
            const testDate = new Date(date);
            return !isNaN(testDate.getTime());
          });

        const placementRow: PlacementRow = {
          id: firstPlacement.id,
          userId: userId,
          slotId: assignedSlotId,
          user: {
            id: userId,
            displayName: displayName
          },
          instructions: firstPlacement.meta?.instructions || '',
          notes: firstPlacement.meta?.notes || '',
          status: firstPlacement.status || 'awaiting_confirmation',
          confirmed: firstPlacement.confirmed || false,
          isPlaceholder: false,
          meta: {
            availability: availability,
            instructions: firstPlacement.meta?.instructions || '',
            notes: firstPlacement.meta?.notes || ''
          }
        };

        updatedSlots[targetSlotIndex].placements.push(placementRow);
      });

      console.log('Updated slots with placement data:', updatedSlots);
      setSlots(updatedSlots);
    }
  }, [existingPlacements, job]);

  const checkForOverlappingPlacements = (user: any, selectedDates: string[]) => {
    if (!user.placements || !Array.isArray(user.placements)) {
      console.log('🔍 No placements found for user:', user.id);
      return null;
    }

    console.log('🔍 Checking overlaps for user:', user.id);
    console.log('🔍 Selected dates to check:', selectedDates);
    console.log('🔍 User has', user.placements.length, 'total placements');

    // Check if user has any placements on the specific dates we're trying to assign
    const overlappingPlacements = user.placements.filter((placement: any) => {
      const placementDate = placement.meta?.shiftDate;
      if (!placementDate) {
        console.log('🔍 Placement', placement.id, 'has no shiftDate in meta');
        return false;
      }

      const dateStr = new Date(placementDate).toISOString().split('T')[0];
      const hasOverlap = selectedDates.includes(dateStr);

      if (hasOverlap) {
        console.log('🔍 OVERLAP FOUND: Placement', placement.id, 'on date', dateStr, 'conflicts with selected dates');
      }

      return hasOverlap;
    });

    console.log('🔍 Found', overlappingPlacements.length, 'overlapping placements');
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
    // Allow adding users to different slots or additional dates
    // No need to check if user already exists - they can work different slots/dates
    // Overlap checking will happen in handleAddCandidate when specific dates are selected

    setPendingUser(user);
    setPendingSource(source);
    setShowDateModal(true);
  };

  const updateJobRemainingAvailability = async (slotId: number, usedDates: string[]) => {
    if (!job) return;

    // Update job meta with remaining availability
    const updatedMeta = { ...job.meta };
    if (!updatedMeta.slotAvailability) {
      updatedMeta.slotAvailability = {};
    }

    // Calculate remaining availability for this slot
    const jobStart = new Date(job.startDate);
    const jobEnd = new Date(job.endDate);
    const allDates = [];

    for (let d = new Date(jobStart); d <= jobEnd; d.setDate(d.getDate() + 1)) {
      allDates.push(d.toISOString().split('T')[0]);
    }

    const remainingDates = allDates.filter(date => !usedDates.includes(date));
    updatedMeta.slotAvailability[slotId] = remainingDates;

    try {
      await fetch(`${API_BASE_URL}/job/${job.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          meta: updatedMeta
        }),
      });
    } catch (error) {
      console.error('Failed to update job availability:', error);
    }
  };

  // Handle direct assignment from calendar - assign candidate to specific slot/date(s)
  const handleAssignCandidate = async (candidateId: number, slotId: number, dates: Date[]) => {
    console.log('🎯 Assignment request:', { candidateId, slotId, dates });

    if (!job) return;

    // Fetch complete user data with placements to validate
    try {
      const userResponse = await fetch(`${API_BASE_URL}/user/${candidateId}`, {
        headers: {
          'x-service-user': localStorage.getItem('session_token') || '',
        },
      });

      if (!userResponse.ok) {
        throw new Error('Failed to fetch candidate details');
      }

      const candidateData = await userResponse.json();
      console.log('🔍 Candidate data fetched:', candidateData.id, candidateData.username);
      console.log('🔍 Candidate has', candidateData.placements?.length || 0, 'placements');

      // Check if candidate has any existing placements on the selected dates
      if (candidateData.placements && candidateData.placements.length > 0) {
        const conflictingDates: string[] = [];

        dates.forEach(date => {
          const dateStr = date.toISOString().split('T')[0];
          console.log('🔍 Checking date:', dateStr);

          const hasExistingPlacement = candidateData.placements.some((placement: any) => {
            const placementDate = placement.meta?.shiftDate;
            if (placementDate) {
              const placementDateStr = new Date(placementDate).toISOString().split('T')[0];
              console.log('  📅 Comparing with placement date:', placementDateStr, '- Match:', placementDateStr === dateStr);
              return placementDateStr === dateStr;
            }
            return false;
          });

          console.log('  ✅ Has existing placement on', dateStr, ':', hasExistingPlacement);
          if (hasExistingPlacement) {
            conflictingDates.push(dateStr);
          }
        });

        console.log('🔍 Total conflicting dates:', conflictingDates);
        if (conflictingDates.length > 0) {
          toast({
            title: "Candidate already assigned",
            description: `This candidate is already assigned on: ${conflictingDates.join(', ')}`,
            variant: "destructive",
          });
          return;
        }
      } else {
        console.log('✅ Candidate has no existing placements, can assign freely');
      }
    } catch (error) {
      console.error('Error validating candidate availability:', error);
      toast({
        title: "Error",
        description: "Failed to validate candidate availability.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Create placements for all selected dates
      const placementPromises = dates.map(date => {
        const placementDate = new Date(date);
        placementDate.setHours(12, 0, 0, 0);

        const newPlacement = {
          userId: candidateId,
          jobId: job.id,
          departmentId: job.departmentId,
          shiftId: job.shiftId,
          vacancy: slotId,
          confirmed: true,
          status: 'accepted',
          meta: {
            shiftDate: placementDate.toISOString(),
            vacancy: slotId
          }
        };

        return fetch(`${API_BASE_URL}/placement`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-service-user': localStorage.getItem('session_token') || '',
          },
          body: JSON.stringify(newPlacement),
        });
      });

      console.log(`📊 Creating ${placementPromises.length} placements...`);
      const responses = await Promise.all(placementPromises);

      const failedPlacements = responses.filter(r => !r.ok);
      if (failedPlacements.length > 0) {
        throw new Error(`Failed to create ${failedPlacements.length} placement(s)`);
      }

      console.log('✅ All placements created successfully');
      toast({
        title: "Success",
        description: `Candidate assigned to ${dates.length} date(s) successfully.`,
      });

      // Refresh both job and placements data
      await Promise.all([refetchJob(), refetchPlacements()]);

    } catch (error) {
      console.error('❌ Error creating placements:', error);
      toast({
        title: "Error",
        description: "Failed to assign candidate.",
        variant: "destructive",
      });
    }
  };

  const handleAddCandidate = async (user: any, slotId: number, availability: Date[]) => {
    try {
      // Fetch complete user data with placements to check for overlaps
      const userResponse = await fetch(`${API_BASE_URL}/user/${user.id}`, {
        headers: {
          'x-service-user': localStorage.getItem('session_token') || '',
        },
      });

      if (!userResponse.ok) {
        throw new Error('Failed to fetch user details');
      }

      const completeUser = await userResponse.json();

      // Check for overlaps on the specific dates being assigned
      const selectedDateStrings = availability.map(date => date.toISOString().split('T')[0]);
      const overlappingPlacements = checkForOverlappingPlacements(completeUser, selectedDateStrings);


      if (overlappingPlacements && overlappingPlacements.length > 0) {
        const conflictDates = overlappingPlacements.map((p: any) => {
          const d = new Date(p);
          if (Number.isNaN(d.getTime())) return "-";

          return d.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          }).replace(/\//g, '/');
        }).join(', ');

        toast({
          title: "User already assigned",
          description: `${user.profile?.Forename || user.firstName} ${user.profile?.Surname || user.lastName} is already assigned on: ${conflictDates}`,
          variant: "destructive",
        });
        return;
      }

      // Create a separate placement for each selected date
      const placementPromises = availability.map(date => {
        // Set date to noon to avoid timezone issues
        const placementDate = new Date(date);
        placementDate.setHours(12, 0, 0, 0);

        return fetch(`${API_BASE_URL}/placement`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-service-user': localStorage.getItem('session_token') || '',
          },
          body: JSON.stringify({
            userId: user.id,
            jobId: job?.id,
            departmentId: job?.departmentId,
            shiftId: job?.shiftId,
            vacancy: slotId, // Use the slot number directly
            confirmed: true,
            status: 'accepted',
            meta: {
              shiftDate: placementDate.toISOString(),
              vacancy: slotId,
              instructions: '',
              notes: ''
            }
          }),
        })
      });

      const responses = await Promise.all(placementPromises);

      // Check if all requests were successful
      const failedResponses = responses.filter(response => !response.ok);
      if (failedResponses.length > 0) {
        throw new Error(`Failed to create ${failedResponses.length} placement(s)`);
      }

      toast({
        title: "Success",
        description: `${user.profile?.Forename || user.firstName} ${user.profile?.Surname || user.lastName} has been added to the job for ${availability.length} date(s).`,
      });

      // Refresh both job and placements data
      await Promise.all([refetchJob(), refetchPlacements()]);

      // Clear pending state
      setPendingUser(null);
      setPendingSource(null);
      setShowDateModal(false);
    } catch (error) {
      console.error('Error adding candidate:', error);
      toast({
        title: "Error",
        description: "Failed to add candidate to the job.",
        variant: "destructive",
      });
    }
  };

  // Removed handleEditPlacement - editing is now handled by PlacementEditModal which updates individual placements

  const handleConfirmOverlap = () => {
    if (pendingUser && pendingSource) {
      setShowOverlapDialog(false);
      setOverlapDetails('');
      setShowDateModal(true);
    }
  };

  const handleCancelOverlap = () => {
    setShowOverlapDialog(false);
    setPendingUser(null);
    setPendingSource(null);
    setOverlapDetails('');
  };

  const handleRemoveUser = (userId: number) => {
    setSlots(slots.map(slot => {
      const updatedPlacements = slot.placements.filter(p => p.userId !== userId);
      return {
        ...slot,
        placements: updatedPlacements,
        occupiedDates: calculateOccupiedDates(slot.id, existingPlacements?.results || [])
      };
    }));
  };

  const handleUpdatePlacement = (userId: number, field: 'instructions' | 'notes' | 'status' | 'confirmed' | 'meta', value: string | boolean | any) => {
    setSlots(slots.map(slot => ({
      ...slot,
      placements: slot.placements.map(p => {
        if (p.userId === userId) {
          if (field === 'meta') {
            const updatedPlacement = { ...p, meta: { ...p.meta, ...value } };
            return updatedPlacement;
          }
          return { ...p, [field]: value };
        }
        return p;
      }),
      // Recalculate occupied dates from actual placement data
      occupiedDates: calculateOccupiedDates(slot.id, existingPlacements?.results || [])
    })));
  };

  // Removed handleConfirmPlacements - placements are now created immediately as individual records

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
                <p className="text-sm text-gray-500">Job Duration</p>
                <p className="font-medium">
                  {new Date(job.startDate).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                  }).replace(/\//g, '/')
                  }
                  -
                  {new Date(job.endDate).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                  }).replace(/\//g, '/')
                  }
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Vacancies</p>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline">{job.vacancies} Vacancy</Badge>
                  <span className="text-sm text-gray-500">
                    ({allPlacements.length} assigned)
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* View Controls */}
        <Card className="border-0 shadow-lg">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">Status Filter:</label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active (All)</SelectItem>
                      <SelectItem value="awaiting_confirmation">Awaiting Confirmation</SelectItem>
                      <SelectItem value="accepted">Accepted</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                      <SelectItem value="absent_explained">Absent (Explained)</SelectItem>
                      <SelectItem value="absent_unexplained">Absent (Unexplained)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant={viewMode === 'weekly' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('weekly')}
                >
                  Weekly
                </Button>
                <Button
                  variant={viewMode === 'monthly' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('monthly')}
                >
                  Monthly
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Calendar Table View */}
        <PlacementCalendarTable
          job={job}
          slots={slots}
          existingPlacements={existingPlacements?.results || []}
          onAssignCandidate={handleAssignCandidate}
          onEditPlacement={(placement) => {
            setSelectedPlacement(placement);
            setShowPlacementEdit(true);
          }}
          statusFilter={statusFilter}
        />


        {/* Date Selection Modal */}
        {showDateModal && pendingUser && job && (
          <PlacementDateModal
            open={showDateModal}
            onOpenChange={(open) => {
              setShowDateModal(open);
            }}
            user={pendingUser}
            slots={slots}
            job={job}
            onConfirm={handleAddCandidate}
          />
        )}

        {/* Placement Detail Modal */}
        {selectedPlacement && (
          <PlacementDetailModal
            isOpen={showPlacementDetail}
            onClose={() => {
              setShowPlacementDetail(false);
              setSelectedPlacement(null);
            }}
            onEdit={() => {
              setShowPlacementDetail(false);
              setShowPlacementEdit(true);
            }}
            placement={selectedPlacement}
          />
        )}

        {/* Placement Edit Modal */}
        {selectedPlacement && (
          <PlacementEditModal
            isOpen={showPlacementEdit}
            onClose={() => {
              setShowPlacementEdit(false);
              setSelectedPlacement(null);
            }}
            onSave={async () => {
              setShowPlacementEdit(false);
              setSelectedPlacement(null);
              await Promise.all([refetchJob(), refetchPlacements()]);
            }}
            placement={selectedPlacement}
            job={job}
            existingPlacements={existingPlacements?.results || []}
            slots={slots}
          />
        )}

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
                Do you still want to proceed with adding them?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={handleCancelOverlap}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmOverlap}>
                Continue
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

      </div>
    </AdminLayout>
  );
};

export default JobFill;