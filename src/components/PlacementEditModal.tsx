
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Plus, X } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { API_BASE_URL } from '../config/env';

interface PlacementEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  placement: any;
  slots?: Array<{
    id: number;
    placements: any[];
    occupiedDates: Set<string>;
  }>;
  jobStartDate?: string;
  jobEndDate?: string;
}

interface AvailabilityPeriod {
  startDate: Date;
  endDate: Date;
}

const statusOptions = [
  { value: 'awaiting_confirmation', label: 'Awaiting Confirmation' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'absent_explained', label: 'Absent (Explained)' },
  { value: 'absent_unexplained', label: 'Absent (Unexplained)' }
];

const PlacementEditModal: React.FC<PlacementEditModalProps> = ({
  isOpen,
  onClose,
  onSave,
  placement,
  slots = [],
  jobStartDate,
  jobEndDate
}) => {
  const [instructions, setInstructions] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('awaiting_confirmation');
  const [confirmed, setConfirmed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSlotId, setSelectedSlotId] = useState<number | null>(null);
  const [availabilityPeriods, setAvailabilityPeriods] = useState<AvailabilityPeriod[]>([]);
  const [existingPlacements, setExistingPlacements] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (placement) {
      setInstructions(placement.meta?.instructions || '');
      setNotes(placement.meta?.notes || '');
      setStatus(placement.status || 'awaiting_confirmation');
      setConfirmed(placement.confirmed || false);
      // Properly read slotId from placement.meta.slotId, default to 1 if not set
      setSelectedSlotId(placement.meta?.slotId || 1);
      
      // Parse existing availability periods from meta.availability or meta.availabilityPeriods
      const existingPeriods = placement.meta?.availability || placement.meta?.availabilityPeriods || [];
      if (existingPeriods.length > 0) {
        setAvailabilityPeriods(existingPeriods.map((period: any) => ({
          startDate: new Date(period.startDate),
          endDate: new Date(period.endDate)
        })));
      } else if (placement.startDate && placement.endDate) {
        // Convert single placement date range to availability period
        setAvailabilityPeriods([{
          startDate: new Date(placement.startDate),
          endDate: new Date(placement.endDate)
        }]);
      } else {
        // Initialize with one empty period if none exist
        const jobStart = jobStartDate ? new Date(jobStartDate) : new Date();
        setAvailabilityPeriods([{
          startDate: jobStart,
          endDate: jobStart
        }]);
      }
    }
  }, [placement, slots, jobStartDate]);

  // Fetch existing placements for the same slot to check for conflicts
  useEffect(() => {
    const fetchExistingPlacements = async () => {
      if (!placement?.jobId || !selectedSlotId) {
        console.log('Skipping fetch - missing data:', { jobId: placement?.jobId, selectedSlotId });
        return;
      }
      
      console.log('=== FETCHING EXISTING PLACEMENTS ===');
      console.log('Job ID:', placement.jobId);
      console.log('Current placement ID:', placement.id);
      console.log('Selected slot ID:', selectedSlotId);
      
      try {
        const response = await fetch(`${API_BASE_URL}/job/${placement.jobId}/placement`);
        if (response.ok) {
          const data = await response.json();
          console.log('Raw API response:', data);
          console.log('All placements count:', data.results?.length || 0);
          
          // Log each placement with its slot info
          data.results?.forEach((p: any, index: number) => {
            console.log(`Placement ${index + 1} (ID: ${p.id}):`, {
              slotId: p.meta?.slotId,
              isCurrentPlacement: p.id === placement.id,
              hasAvailability: p.meta?.availability?.length > 0,
              meta: p.meta
            });
          });
          
          // Filter placements for the same slot, excluding current placement
          const slotPlacements = data.results?.filter((p: any) => {
            const placementSlotId = p.meta?.slotId || 1; // Default to slot 1 if not set
            const isSameSlot = placementSlotId === selectedSlotId;
            const isNotCurrentPlacement = p.id !== placement.id;
            
            console.log(`Filtering placement ${p.id}:`, {
              placementSlotId,
              selectedSlotId,
              isSameSlot,
              isNotCurrentPlacement,
              included: isSameSlot && isNotCurrentPlacement
            });
            
            return isSameSlot && isNotCurrentPlacement;
          }) || [];
          
          console.log('Filtered placements for slot', selectedSlotId, ':', slotPlacements);
          console.log('Final existing placements count:', slotPlacements.length);
          setExistingPlacements(slotPlacements);
        } else {
          console.error('Failed to fetch placements:', response.status, response.statusText);
        }
      } catch (error) {
        console.error('Error fetching existing placements:', error);
      }
    };

    fetchExistingPlacements();
  }, [placement?.jobId, selectedSlotId, placement?.id]);

  const addAvailabilityPeriod = () => {
    const jobStart = jobStartDate ? new Date(jobStartDate) : new Date();
    setAvailabilityPeriods([...availabilityPeriods, {
      startDate: jobStart,
      endDate: jobStart
    }]);
  };

  const removeAvailabilityPeriod = (index: number) => {
    setAvailabilityPeriods(availabilityPeriods.filter((_, i) => i !== index));
  };

  // Check for date conflicts with existing placements in the same slot
  const checkDateConflicts = (newPeriods: AvailabilityPeriod[]) => {
    if (!selectedSlotId || existingPlacements.length === 0) {
      console.log('No conflicts to check - slot:', selectedSlotId, 'existing placements:', existingPlacements.length);
      return [];
    }

    const conflicts: string[] = [];
    
    console.log('=== CONFLICT DETECTION START ===');
    console.log('Checking conflicts for slot', selectedSlotId);
    console.log('Existing placements count:', existingPlacements.length);
    console.log('New periods to check:', newPeriods.map(p => ({
      start: p.startDate.toISOString().split('T')[0],
      end: p.endDate.toISOString().split('T')[0]
    })));
    
    for (let i = 0; i < newPeriods.length; i++) {
      const newPeriod = newPeriods[i];
      console.log(`\nChecking new period ${i + 1}:`, {
        start: newPeriod.startDate.toISOString().split('T')[0],
        end: newPeriod.endDate.toISOString().split('T')[0]
      });

      for (let j = 0; j < existingPlacements.length; j++) {
        const existingPlacement = existingPlacements[j];
        const existingPeriods = existingPlacement.meta?.availability || [];
        
        console.log(`  Against placement ${existingPlacement.id} (${existingPeriods.length} periods)`);
        
        for (let k = 0; k < existingPeriods.length; k++) {
          const existingPeriod = existingPeriods[k];
          const existingStart = new Date(existingPeriod.startDate + 'T00:00:00');
          const existingEnd = new Date(existingPeriod.endDate + 'T23:59:59');
          const newStart = new Date(newPeriod.startDate.toISOString().split('T')[0] + 'T00:00:00');
          const newEnd = new Date(newPeriod.endDate.toISOString().split('T')[0] + 'T23:59:59');
          
          console.log(`    Period ${k + 1}:`, {
            existing: `${existingPeriod.startDate} to ${existingPeriod.endDate}`,
            new: `${newStart.toISOString().split('T')[0]} to ${newEnd.toISOString().split('T')[0]}`
          });
          
          // Two periods overlap if: newStart <= existingEnd AND newEnd >= existingStart
          const periodsOverlap = newStart <= existingEnd && newEnd >= existingStart;
          
          console.log(`    Overlap check: ${newStart.toISOString()} <= ${existingEnd.toISOString()} (${newStart <= existingEnd}) AND ${newEnd.toISOString()} >= ${existingStart.toISOString()} (${newEnd >= existingStart}) = ${periodsOverlap}`);
          
          if (periodsOverlap) {
            const candidateName = existingPlacement.user?.profile?.Forename && existingPlacement.user?.profile?.Surname
              ? `${existingPlacement.user.profile.Forename} ${existingPlacement.user.profile.Surname}`
              : existingPlacement.user?.displayName?.split(' (')[0] || 
                existingPlacement.user?.username || 'Unknown';
            
            const conflictMessage = `${format(newPeriod.startDate, "MMM d")} - ${format(newPeriod.endDate, "MMM d")} conflicts with ${candidateName} (${format(existingStart, "MMM d")} - ${format(existingEnd, "MMM d")})`;
            conflicts.push(conflictMessage);
            
            console.log(`    *** CONFLICT DETECTED: ${conflictMessage}`);
          }
        }
      }
    }
    
    console.log('=== CONFLICT DETECTION END ===');
    console.log('Total conflicts found:', conflicts.length);
    console.log('Conflicts:', conflicts);
    return conflicts;
  };

  const updateAvailabilityPeriod = (index: number, field: 'startDate' | 'endDate', date: Date | undefined) => {
    if (!date) return;
    
    const updated = [...availabilityPeriods];
    updated[index] = { ...updated[index], [field]: date };
    
    // Auto-set end date to start date if not specified (for single date periods)
    if (field === 'startDate' && !updated[index].endDate) {
      updated[index].endDate = date;
    }
    
    setAvailabilityPeriods(updated);
  };

  const handleSave = async () => {
    if (!placement || availabilityPeriods.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one availability period",
        variant: "destructive",
      });
      return;
    }

    // Validate availability periods
    for (const period of availabilityPeriods) {
      if (period.startDate > period.endDate) {
        toast({
          title: "Error", 
          description: "Start date must be before end date",
          variant: "destructive",
        });
        return;
      }
    }

    // Check for date conflicts
    const conflicts = checkDateConflicts(availabilityPeriods);
    if (conflicts.length > 0) {
      toast({
        title: "Date Conflicts Detected",
        description: conflicts.join('; '),
        variant: "destructive",
      });
      return;
    }

    // Ensure slotId is set
    if (!selectedSlotId) {
      toast({
        title: "Error",
        description: "Please select a slot",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Update placement
      const response = await fetch(`${API_BASE_URL}/placement/${placement.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status,
          confirmed,
          startDate: availabilityPeriods[0].startDate.toISOString().split('T')[0],
          endDate: availabilityPeriods[availabilityPeriods.length - 1].endDate.toISOString().split('T')[0],
          meta: {
            instructions,
            notes,
            slotId: selectedSlotId,
            availability: availabilityPeriods.map(period => ({
              startDate: period.startDate.toISOString().split('T')[0],
              endDate: period.endDate.toISOString().split('T')[0]
            }))
          }
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update placement');
      }

      toast({
        title: "Success",
        description: "Placement updated successfully",
      });

      onSave();
      onClose();
    } catch (error) {
      console.error('Error updating placement:', error);
      toast({
        title: "Error",
        description: "Failed to update placement",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!placement) return null;

  // Extract candidate name from displayName (format: "Forename Surname (email)")
  const candidateName = placement.user?.displayName
    ? placement.user.displayName.split(' (')[0] // Get the name part before the email
    : placement.user?.username || 'N/A';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit Placement</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden">
          <div className="grid grid-cols-2 gap-6 h-full">
            {/* Left Column */}
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Candidate</p>
                <p className="font-medium">{candidateName}</p>
              </div>

              {/* Availability Periods */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium">Availability Periods</label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addAvailabilityPeriod}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Period
                  </Button>
                </div>
                
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {availabilityPeriods.map((period, index) => (
                    <div key={index} className="flex items-end space-x-2 p-3 border rounded-lg">
                      <div className="flex-1">
                        <label className="text-xs text-muted-foreground">Start Date</label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !period.startDate && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {period.startDate ? format(period.startDate, "MMM d") : "Pick date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={period.startDate}
                              onSelect={(date) => updateAvailabilityPeriod(index, 'startDate', date)}
                              disabled={(date) => {
                                if (jobStartDate && date < new Date(jobStartDate)) return true;
                                if (jobEndDate && date > new Date(jobEndDate)) return true;
                                return false;
                              }}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      
                      <div className="flex-1">
                        <label className="text-xs text-muted-foreground">End Date (optional)</label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !period.endDate && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {period.endDate ? format(period.endDate, "MMM d") : "Same day"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={period.endDate}
                              onSelect={(date) => updateAvailabilityPeriod(index, 'endDate', date)}
                              disabled={(date) => {
                                if (jobStartDate && date < new Date(jobStartDate)) return true;
                                if (jobEndDate && date > new Date(jobEndDate)) return true;
                                if (period.startDate && date < period.startDate) return true;
                                return false;
                              }}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      
                      {availabilityPeriods.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeAvailabilityPeriod(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Status</label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Slot Assignment</label>
                <Select value={selectedSlotId?.toString() || "1"} onValueChange={(value) => setSelectedSlotId(parseInt(value))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {slots && slots.length > 0 ? slots.map((slot) => (
                      <SelectItem key={slot.id} value={slot.id.toString()}>
                        Slot {slot.id}
                      </SelectItem>
                    )) : (
                      <SelectItem value="1">Slot 1</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

            </div>

            {/* Right Column */}
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Instructions</label>
                <Textarea
                  placeholder="Instructions for worker..."
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  className="min-h-32 resize-none"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Notes</label>
                <Textarea
                  placeholder="Internal notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="min-h-32 resize-none"
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={isLoading || availabilityPeriods.length === 0}
          >
            {isLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PlacementEditModal;
