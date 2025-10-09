import React, { useState } from 'react';
import { format, eachDayOfInterval, isWeekend, startOfWeek, endOfWeek, addWeeks, subWeeks } from 'date-fns';
import { parseDate } from '@/config/timezone';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import CandidateSelectionModal from './CandidateSelectionModal';

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
    shiftDate?: string;
    vacancy?: number;
  };
}

interface Slot {
  id: number;
  placements: PlacementRow[];
  occupiedDates: Set<string>;
}

interface PlacementCalendarTableProps {
  job: {
    startDate: string;
    endDate: string;
    placements?: Array<{
      id: number;
      userId: number;
      jobId: number;
      departmentId: number;
      shiftId: number;
      shiftDate: Date;
      vacancy?: number;
      confirmed: boolean;
      status: string;
      meta: {
        notes?: string;
        instructions?: string;
        shiftDate?: string;
        vacancy?: number;
        remarks?: string;
      };
      user?: {
        id: number;
        username?: string;
        profile?: {
          Forename?: string;
          Surname?: string;
        };
      };
    }>;
    body?: {
      includeWeekends?: boolean;
    };
    id: number;
    skills: number[];
  };
  slots: Slot[];
  existingPlacements?: Array<any>; // Full placements from /placements/job/:id endpoint
  onAssignCandidate?: (userId: number, slotIndex: number, dates: Date[]) => void;
  onEditPlacement?: (placement: any) => void;
  statusFilter?: string;
}

const PlacementCalendarTable: React.FC<PlacementCalendarTableProps> = ({ 
  job, 
  slots,
  existingPlacements = [],
  onAssignCandidate, 
  onEditPlacement,
  statusFilter = 'active'
}) => {
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const jobStart = parseDate(job.startDate);
    jobStart.setHours(12, 0, 0, 0);
    return startOfWeek(jobStart, { weekStartsOn: 1 });
  });
  const [selectionModal, setSelectionModal] = useState<{ slotId: number; date: Date } | null>(null);

  const jobStart = parseDate(job.startDate);
  jobStart.setHours(12, 0, 0, 0);
  const jobEnd = parseDate(job.endDate);
  jobEnd.setHours(12, 0, 0, 0);
  const includeWeekends = job.body?.includeWeekends !== false;

  const currentWeekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });

  const weekDays = eachDayOfInterval({ 
    start: currentWeekStart,
    end: currentWeekEnd
  });

  const isDayApplicable = (day: Date) => {
    const comparisonDay = new Date(day);
    comparisonDay.setHours(12, 0, 0, 0);
    
    if (comparisonDay < jobStart || comparisonDay > jobEnd) return false;
    if (!includeWeekends && isWeekend(day)) return false;
    return true;
  };

  const goToPreviousWeek = () => {
    const newWeekStart = subWeeks(currentWeekStart, 1);
    if (newWeekStart >= startOfWeek(jobStart, { weekStartsOn: 1 })) {
      setCurrentWeekStart(newWeekStart);
    }
  };

  const goToNextWeek = () => {
    const newWeekStart = addWeeks(currentWeekStart, 1);
    if (newWeekStart <= startOfWeek(jobEnd, { weekStartsOn: 1 })) {
      setCurrentWeekStart(newWeekStart);
    }
  };

  const canGoToPrevious = startOfWeek(subWeeks(currentWeekStart, 1), { weekStartsOn: 1 }) >= startOfWeek(jobStart, { weekStartsOn: 1 });
  const canGoToNext = startOfWeek(addWeeks(currentWeekStart, 1), { weekStartsOn: 1 }) <= startOfWeek(jobEnd, { weekStartsOn: 1 });

  const getAssignmentForSlotAndDate = (slotId: number, date: Date): PlacementRow | null => {
    const dateString = format(date, 'yyyy-MM-dd');
    
    const placement = job.placements?.find(p => {
      const shiftDate = p.meta?.shiftDate || p.shiftDate;
      
      if (!shiftDate) {
        console.warn('Placement has no shiftDate:', p);
        return false;
      }
      
      const placementDate = new Date(shiftDate);
      
      if (isNaN(placementDate.getTime())) {
        console.error('Invalid placement date:', shiftDate);
        return false;
      }
      
      placementDate.setHours(12, 0, 0, 0);
      const placementDateString = format(placementDate, 'yyyy-MM-dd');
      
      const placementSlot = p.meta?.vacancy ?? p.vacancy ?? 1;
      
      // Check if date and slot match
      if (placementDateString !== dateString || placementSlot !== slotId) {
        return false;
      }
      
      // Apply status filter
      if (statusFilter === 'active') {
        return ['awaiting_confirmation', 'accepted', 'completed', 'cancelled', 'absent_explained', 'absent_unexplained'].includes(p.status);
      } else {
        return p.status === statusFilter;
      }
    });

    if (!placement || !placement.user) return null;

    const profile = placement.user.profile;
    const displayName = profile ? `${profile.Forename || ''} ${profile.Surname || ''}`.trim() : placement.user.username || 'Unknown User';

    return {
      id: placement.id,
      userId: placement.user.id,
      slotId: slotId,
      user: {
        id: placement.user.id,
        displayName: displayName
      },
      instructions: placement.meta.instructions || '',
      notes: placement.meta.notes || '',
      status: placement.status,
      confirmed: placement.confirmed || false,
      isPlaceholder: false,
      meta: placement.meta
    };
  };

  const handleCandidateSelect = (candidateId: number, slotId: number, dates: Date[]) => {
    console.log('🎯 Candidate selected:', { candidateId, slotId, dates: dates.map(d => d.toISOString()) });
    onAssignCandidate?.(candidateId, slotId, dates);
  };

  // Calculate conflicting dates for the current slot
  const getConflictingDatesForSlot = (slotId: number): Set<string> => {
    const conflicting = new Set<string>();
    const slot = slots.find(s => s.id === slotId);
    if (slot) {
      slot.occupiedDates.forEach(date => conflicting.add(date));
    }
    return conflicting;
  };

  const CalendarCell: React.FC<{
    slotId: number;
    date: Date;
    assignment: PlacementRow | null;
    isApplicable: boolean;
  }> = ({ slotId, date, assignment, isApplicable }) => {
    const isFilled = assignment && isApplicable;

    const handleClick = () => {
      if (!isApplicable) return;
      
      if (isFilled && onEditPlacement) {
        // Find the full placement data from existingPlacements (which has userId, jobId, etc.)
        const fullPlacement = existingPlacements.find(p => p.id === assignment.id);
        console.log('📋 PlacementCalendarTable: Passing placement to modal:', fullPlacement);
        console.log('📋 Placement has userId?', fullPlacement?.userId);
        console.log('📋 Placement has jobId?', fullPlacement?.jobId);
        if (fullPlacement) {
          onEditPlacement(fullPlacement);
        }
      } else {
        // Open assignment modal
        setSelectionModal({ slotId, date });
      }
    };

    const getStatusColor = (status: string) => {
      switch (status?.toLowerCase()) {
        case 'accepted': 
        case 'awaiting_confirmation': 
          return 'bg-green-100 dark:bg-green-900 hover:bg-green-200 dark:hover:bg-green-800 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200';
        case 'cancelled': 
          return 'bg-red-100 dark:bg-red-900 hover:bg-red-200 dark:hover:bg-red-800 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200';
        case 'absent_explained':
        case 'absent_unexplained':
          return 'bg-purple-100 dark:bg-purple-900 hover:bg-purple-200 dark:hover:bg-purple-800 border-purple-200 dark:border-purple-800 text-purple-800 dark:text-purple-200';
        case 'completed':
          return 'bg-blue-100 dark:bg-blue-900 hover:bg-blue-200 dark:hover:bg-blue-800 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200';
        default: 
          return 'bg-green-100 dark:bg-green-900 hover:bg-green-200 dark:hover:bg-green-800 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200';
      }
    };

    return (
      <div className="h-full">
        {isFilled ? (
          <div 
            className={`${getStatusColor(assignment.status)} rounded-md p-2 space-y-1 border cursor-pointer transition-colors`}
            onClick={handleClick}
          >
            <div className="text-xs font-semibold truncate" title={assignment.user.displayName}>
              {assignment.user.displayName.split(' ')[0]}
            </div>
            <div className="text-xs font-medium">
              {assignment.user.displayName.split(' ')[1]?.charAt(0)}.
            </div>
          </div>
        ) : isApplicable ? (
          <div 
            className="bg-amber-100 dark:bg-amber-900 hover:bg-amber-200 dark:hover:bg-amber-800 rounded-md p-2 border border-amber-200 dark:border-amber-800 cursor-pointer transition-colors"
            onClick={handleClick}
          >
            <div className="text-xs text-amber-800 dark:text-amber-200 font-medium">
              Click to assign
            </div>
          </div>
        ) : (
          <div className="text-xs text-muted-foreground py-4 opacity-40">
            -
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Placement Calendar</CardTitle>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={goToPreviousWeek}
                disabled={!canGoToPrevious}
                className="h-8"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous Week
              </Button>
              <div className="text-sm font-medium text-muted-foreground px-3">
                {format(currentWeekStart, 'MMM dd')} - {format(currentWeekEnd, 'MMM dd, yyyy')}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={goToNextWeek}
                disabled={!canGoToNext}
                className="h-8"
              >
                Next Week
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="sticky left-0 bg-muted/50 border-r w-32">
                    <div className="font-semibold">Slot</div>
                  </TableHead>
                  {weekDays.map((day, index) => {
                    const isApplicable = isDayApplicable(day);
                    return (
                      <TableHead 
                        key={index}
                        className={`text-center border-r last:border-r-0 ${!isApplicable ? 'bg-muted/30' : ''}`}
                      >
                        <div className="space-y-1">
                          <div className="font-semibold">{format(day, 'EEE')}</div>
                          <div className="text-xs font-normal">{format(day, 'MMM dd')}</div>
                        </div>
                      </TableHead>
                    );
                  })}
                </TableRow>
              </TableHeader>
              <TableBody>
                {slots.map((slot) => {
                  return (
                    <TableRow key={slot.id} className="hover:bg-muted/30">
                      <TableCell className="sticky left-0 bg-background border-r">
                        <div className="py-2">
                          <div className="font-semibold text-sm text-primary">Slot {slot.id}</div>
                        </div>
                      </TableCell>
                      {weekDays.map((day, dayIndex) => {
                        const assignment = getAssignmentForSlotAndDate(slot.id, day);
                        const isApplicable = isDayApplicable(day);

                        return (
                          <TableCell key={dayIndex} className={`text-center p-2 border-r last:border-r-0 ${!isApplicable ? 'bg-muted/30' : ''}`}>
                            <CalendarCell
                              slotId={slot.id}
                              date={day}
                              assignment={assignment}
                              isApplicable={isApplicable}
                            />
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {selectionModal && (
        <CandidateSelectionModal
          open={!!selectionModal}
          onOpenChange={(open) => !open && setSelectionModal(null)}
          jobId={job.id}
          skillIds={job.skills || []}
          slotId={selectionModal.slotId}
          date={selectionModal.date}
          job={job}
          conflictingDates={getConflictingDatesForSlot(selectionModal.slotId)}
          onCandidateSelect={handleCandidateSelect}
        />
      )}
    </>
  );
};

export default PlacementCalendarTable;
