import React, { useState } from 'react';
import { format, eachDayOfInterval, isWeekend, startOfWeek, endOfWeek, addWeeks, subWeeks, isSameWeek } from 'date-fns';
import { parseDate } from '@/config/timezone';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, useDraggable, useDroppable } from '@dnd-kit/core';

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
  occupiedDates: Set<string>;
}

interface PlacementCalendarTableProps {
  job: {
    startDate: string;
    endDate: string;
    assignees?: Array<{
      userId: number;
      assignedBy: number;
      assignmentDate: Date;
      status: string;
      slot: number;
    }>;
    body?: {
      includeWeekends?: boolean;
    };
  };
  slots: Slot[];
  onAssignCandidate?: (userId: number, slotIndex: number, date: Date) => void;
}

const PlacementCalendarTable: React.FC<PlacementCalendarTableProps> = ({ job, slots, onAssignCandidate }) => {
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    // Start with the first week of the job
    const jobStart = parseDate(job.startDate);
    return startOfWeek(jobStart, { weekStartsOn: 1 }); // Monday start
  });
  const [editingCell, setEditingCell] = useState<{ slotId: number; date: Date } | null>(null);
  const [draggedCandidate, setDraggedCandidate] = useState<PlacementRow | null>(null);
  const { toast } = useToast();

  // Get all candidates from all slots
  const candidates = slots.flatMap(slot => slot.placements);

  const jobStart = parseDate(job.startDate);
  const jobEnd = parseDate(job.endDate);
  const includeWeekends = job.body?.includeWeekends !== false;

  // Calculate the current week's end
  const currentWeekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });

  // Get all days for the current week (always show full week)
  const weekDays = eachDayOfInterval({ 
    start: currentWeekStart,
    end: currentWeekEnd
  });

  // Helper function to check if a day is applicable (within job range and not excluded weekend)
  const isDayApplicable = (day: Date) => {
    if (day < jobStart || day > jobEnd) return false;
    if (!includeWeekends && isWeekend(day)) return false;
    return true;
  };

  // Navigation functions
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

  // Check if navigation buttons should be disabled
  const canGoToPrevious = startOfWeek(subWeeks(currentWeekStart, 1), { weekStartsOn: 1 }) >= startOfWeek(jobStart, { weekStartsOn: 1 });
  const canGoToNext = startOfWeek(addWeeks(currentWeekStart, 1), { weekStartsOn: 1 }) <= startOfWeek(jobEnd, { weekStartsOn: 1 });

  // Create a mapping of slot + date -> candidate
  const getAssignmentForSlotAndDate = (slotId: number, date: Date): PlacementRow | null => {
    const slot = slots.find(s => s.id === slotId);
    if (!slot) return null;

    const dateString = format(date, 'yyyy-MM-dd');
    
    // Find placement that has this date in their availability
    return slot.placements.find(placement => {
      if (!placement.meta?.availability) return false;
      
      // Check if the availability is in the new format (array of date strings) or old format (AvailabilityWindow[])
      return placement.meta.availability.some(availItem => {
        if (typeof availItem === 'string' || availItem instanceof Date) {
          // Individual date format
          const availDateParsed = parseDate(availItem);
          return format(availDateParsed, 'yyyy-MM-dd') === dateString;
        } else if (availItem && typeof availItem === 'object' && 'startDate' in availItem) {
          // AvailabilityWindow format - check if date falls within the range
          const startDate = new Date(availItem.startDate);
          const endDate = new Date(availItem.endDate);
          return date >= startDate && date <= endDate;
        }
        return false;
      });
    }) || null;
  };

  // Get candidates for a slot
  const getCandidatesForSlot = (slotId: number): PlacementRow[] => {
    const slot = slots.find(s => s.id === slotId);
    return slot?.placements || [];
  };

  // Check for conflicts when assigning a candidate to a date
  const checkForConflicts = (candidateId: number, slotId: number, date: Date): boolean => {
    const dateString = format(date, 'yyyy-MM-dd');
    
    // Check if this candidate is already assigned to another slot on this date
    for (const slot of slots) {
      if (slot.id === slotId) continue; // Skip the target slot
      
      for (const placement of slot.placements) {
        if (placement.userId === candidateId && placement.meta?.availability) {
          const hasConflict = placement.meta.availability.some(availItem => {
            if (typeof availItem === 'string' || availItem instanceof Date) {
              const availDateParsed = parseDate(availItem);
              return format(availDateParsed, 'yyyy-MM-dd') === dateString;
            } else if (availItem && typeof availItem === 'object' && 'startDate' in availItem) {
              const startDate = new Date(availItem.startDate);
              const endDate = new Date(availItem.endDate);
              return date >= startDate && date <= endDate;
            }
            return false;
          });
          
          if (hasConflict) return true;
        }
      }
    }
    
    return false;
  };

  // Handle assignment of candidate to specific date
  const handleAssignCandidate = (slotId: number, candidateId: number, date: Date) => {
    console.log('🎯 PlacementCalendarTable: handleAssignCandidate called', {
      slotId,
      candidateId,
      date: date.toISOString(),
      onAssignCandidate: !!onAssignCandidate
    });

    // Remove conflict checking - candidates can now work different slots on different days
    console.log('✅ Calling onAssignCandidate with slot index');
    onAssignCandidate?.(candidateId, slotId, date); // Pass candidateId first, then slotId
    setEditingCell(null);
    
    toast({
      title: "Assignment Successful",
      description: "Candidate has been assigned to this date.",
    });
  };

  // Drag and drop handlers
  const handleDragStart = (event: DragStartEvent) => {
    console.log('🔄 Drag started:', event.active.id);
    const { active } = event;
    const [slotId, candidateId] = active.id.toString().split('-');
    const slot = slots.find(s => s.id === parseInt(slotId));
    const candidate = slot?.placements.find(p => p.userId === parseInt(candidateId));
    console.log('🔄 Dragged candidate:', { slotId, candidateId, candidate: candidate?.user.displayName });
    setDraggedCandidate(candidate || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    console.log('🔄 Drag ended:', { active: event.active.id, over: event.over?.id });
    const { active, over } = event;
    setDraggedCandidate(null);

    if (!over) {
      console.log('❌ No drop target');
      return;
    }

    const [, candidateId] = active.id.toString().split('-');
    const [targetSlotId, dateString] = over.id.toString().split('-');
    const targetDate = new Date(dateString);

    console.log('🔄 Processing drag assignment:', {
      candidateId: parseInt(candidateId),
      targetSlotId: parseInt(targetSlotId),
      targetDate: targetDate.toISOString()
    });

    handleAssignCandidate(parseInt(targetSlotId), parseInt(candidateId), targetDate);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'accepted': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'declined': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    }
  };

  // Draggable candidate component
  const DraggableCandidate: React.FC<{ candidate: PlacementRow; slotId: number }> = ({ candidate, slotId }) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
      id: `${slotId}-${candidate.userId}`,
    });

    const style = transform ? {
      transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    } : undefined;

    return (
      <div
        ref={setNodeRef}
        style={style}
        {...listeners}
        {...attributes}
        className={`text-xs font-medium truncate max-w-40 cursor-grab active:cursor-grabbing ${
          isDragging ? 'opacity-50' : ''
        }`}
        title={candidate.user.displayName}
      >
        {candidate.user.displayName.split(' ').slice(0, 2).join(' ')}
      </div>
    );
  };

  // Droppable calendar cell component
  const DroppableCalendarCell: React.FC<{
    slotId: number;
    date: Date;
    assignment: PlacementRow | null;
    isApplicable: boolean;
    candidates: PlacementRow[];
  }> = ({ slotId, date, assignment, isApplicable, candidates }) => {
    const { isOver, setNodeRef } = useDroppable({
      id: `${slotId}-${date.toISOString()}`,
      disabled: !isApplicable || !!assignment || candidates.length === 0,
    });

    const isFilled = assignment && isApplicable;
    const canBeAssigned = !assignment && isApplicable && candidates.length > 0;
    const isEditing = editingCell?.slotId === slotId && editingCell?.date.getTime() === date.getTime();

    return (
      <div
        ref={setNodeRef}
        className={`h-full ${isOver && canBeAssigned ? 'bg-amber-200 dark:bg-amber-700' : ''}`}
      >
        {isFilled ? (
          // Filled day - green background
          <div className="bg-green-100 dark:bg-green-900 rounded-md p-2 space-y-1 border border-green-200 dark:border-green-800">
            <div className="text-xs font-semibold truncate text-green-800 dark:text-green-200" title={assignment.user.displayName}>
              {assignment.user.displayName.split(' ')[0]}
            </div>
            <div className="text-xs text-green-600 dark:text-green-400 font-medium">
              {assignment.user.displayName.split(' ')[1]?.charAt(0)}.
            </div>
          </div>
        ) : canBeAssigned ? (
          // Unfilled but assignable day - amber background, clickable
          isEditing ? (
            (() => {
              console.log('💡 Dropdown should be open:', { isEditing, candidates: candidates.length });
              return (
                <div className="bg-amber-100 dark:bg-amber-900 rounded-md p-2 border border-amber-200 dark:border-amber-800">
                  <Select 
                    open={true}
                    onValueChange={(value) => {
                      console.log('📋 Dropdown selection made:', { slotId, candidateId: value, date: date.toISOString() });
                      handleAssignCandidate(parseInt(value), slotId, date);
                    }}
                    onOpenChange={(open) => {
                      console.log('📋 Dropdown open state changed:', open);
                      // Only close if explicitly set to false, not on initial mount
                      if (open === false) {
                        setTimeout(() => setEditingCell(null), 100);
                      }
                    }}
                  >
                    <SelectTrigger className="h-6 text-xs border-0 bg-transparent" onClick={(e) => e.preventDefault()}>
                      <SelectValue placeholder="Select candidate..." />
                    </SelectTrigger>
                    <SelectContent className="z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600">
                      {candidates.map((candidate) => {
                        console.log('📋 Rendering candidate option:', candidate.user.displayName);
                        return (
                          <SelectItem 
                            key={candidate.userId} 
                            value={candidate.userId.toString()}
                            className="hover:bg-gray-100 dark:hover:bg-gray-700"
                          >
                            <span className="text-xs">{candidate.user.displayName}</span>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              );
            })()
          ) : (
            <div 
              className="bg-amber-100 dark:bg-amber-900 hover:bg-amber-200 dark:hover:bg-amber-800 rounded-md p-2 border border-amber-200 dark:border-amber-800 cursor-pointer transition-colors"
              onClick={() => {
                console.log('📱 Click to assign triggered:', { 
                  slotId, 
                  date: date.toISOString(),
                  candidates: candidates.length,
                  candidateNames: candidates.map(c => c.user.displayName)
                });
                setEditingCell({ slotId, date });
              }}
            >
              <div className="text-xs text-amber-800 dark:text-amber-200 font-medium">
                Click to assign
              </div>
            </div>
          )
        ) : (
          // Not applicable or no candidates
          <div className={`text-xs text-muted-foreground py-4 ${!isApplicable ? 'opacity-40' : ''}`}>
            {!isApplicable ? '-' : candidates.length === 0 ? 'No candidates' : '-'}
          </div>
        )}
      </div>
    );
  };

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
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
                <TableHead className="w-48 sticky left-0 bg-muted/50 border-r font-semibold">
                  Slot / Candidates
                </TableHead>
                {weekDays.map((day, index) => {
                  const isApplicable = isDayApplicable(day);
                  return (
                    <TableHead key={index} className="text-center min-w-28 border-r last:border-r-0">
                      <div className={`space-y-1 py-2 ${!isApplicable ? 'opacity-40' : ''}`}>
                        <div className="text-xs font-medium text-muted-foreground">
                          {format(day, 'EEE')}
                        </div>
                        <div className="text-lg font-bold">
                          {format(day, 'dd')}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(day, 'MMM')}
                        </div>
                      </div>
                    </TableHead>
                  );
                })}
              </TableRow>
            </TableHeader>
            <TableBody>
              {slots.map((slot) => {
                const candidates = getCandidatesForSlot(slot.id);
                return (
                  <TableRow key={slot.id} className="hover:bg-muted/30">
                    <TableCell className="sticky left-0 bg-background border-r">
                      <div className="space-y-3 py-2">
                        <div className="font-semibold text-sm text-primary">Slot {slot.id}</div>
                        <div className="space-y-1">
                          {candidates.length > 0 ? (
                            candidates.map((candidate) => (
                              <DraggableCandidate 
                                key={candidate.userId} 
                                candidate={candidate} 
                                slotId={slot.id}
                              />
                            ))
                          ) : (
                            <div className="text-xs text-muted-foreground italic">No candidates</div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    {weekDays.map((day, dayIndex) => {
                      const assignment = getAssignmentForSlotAndDate(slot.id, day);
                      const isApplicable = isDayApplicable(day);
                      const candidates = getCandidatesForSlot(slot.id);

                      return (
                        <TableCell key={dayIndex} className={`text-center p-2 border-r last:border-r-0 ${!isApplicable ? 'bg-muted/30' : ''}`}>
                          <DroppableCalendarCell
                            slotId={slot.id}
                            date={day}
                            assignment={assignment}
                            isApplicable={isApplicable}
                            candidates={candidates}
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
      <DragOverlay>
        {draggedCandidate ? (
          <div className="bg-background border rounded-md p-2 shadow-lg">
            <div className="text-xs font-medium">
              {draggedCandidate.user.displayName}
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </Card>
    </DndContext>
  );
};

export default PlacementCalendarTable;