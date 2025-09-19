import React from 'react';
import { format, eachDayOfInterval, isWeekend } from 'date-fns';
import { parseDate } from '@/config/timezone';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

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
    body?: {
      includeWeekends?: boolean;
    };
  };
  slots: Slot[];
}

const PlacementCalendarTable: React.FC<PlacementCalendarTableProps> = ({ job, slots }) => {
  // Generate all working days for the job duration
  const jobStart = parseDate(job.startDate);
  const jobEnd = parseDate(job.endDate);
  const includeWeekends = job.body?.includeWeekends !== false;
  
  const allDays = eachDayOfInterval({ start: jobStart, end: jobEnd }).filter(day => {
    if (!includeWeekends && isWeekend(day)) {
      return false;
    }
    return true;
  });

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

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'accepted': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'declined': return 'bg-red-100 text-red-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Placement Calendar</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-48 sticky left-0 bg-background">Slot / Candidates</TableHead>
                {allDays.map((day, index) => (
                  <TableHead key={index} className="text-center min-w-24">
                    <div className="text-xs">
                      {format(day, 'EEE')}
                    </div>
                    <div className="text-sm font-medium">
                      {format(day, 'dd')}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {format(day, 'MMM')}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {slots.map((slot) => {
                const candidates = getCandidatesForSlot(slot.id);
                return (
                  <TableRow key={slot.id}>
                    <TableCell className="sticky left-0 bg-background border-r">
                      <div className="space-y-1">
                        <div className="font-medium text-sm">Slot {slot.id}</div>
                        <div className="space-y-1">
                          {candidates.length > 0 ? (
                            candidates.map((candidate) => (
                              <div key={candidate.userId} className="text-xs">
                                <div className="truncate max-w-36" title={candidate.user.displayName}>
                                  {candidate.user.displayName.split(' ').slice(0, 2).join(' ')}
                                </div>
                                <Badge 
                                  variant="secondary" 
                                  className={`text-xs ${getStatusColor(candidate.status)}`}
                                >
                                  {candidate.status}
                                </Badge>
                              </div>
                            ))
                          ) : (
                            <div className="text-xs text-muted-foreground">No candidates</div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    {allDays.map((day, dayIndex) => {
                      const assignment = getAssignmentForSlotAndDate(slot.id, day);
                      return (
                        <TableCell key={dayIndex} className="text-center p-1">
                          {assignment ? (
                            <div className="space-y-1">
                              <div className="text-xs font-medium truncate" title={assignment.user.displayName}>
                                {assignment.user.displayName.split(' ')[0]}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {assignment.user.displayName.split(' ')[1]?.charAt(0)}.
                              </div>
                            </div>
                          ) : (
                            <div className="text-xs text-muted-foreground">-</div>
                          )}
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
  );
};

export default PlacementCalendarTable;