
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
  slots?: any[];
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
      setSelectedSlotId(placement.slotId || placement.meta?.slotId || null);
      
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
      if (!placement?.jobId || !selectedSlotId) return;
      
      try {
        const response = await fetch(`${API_BASE_URL}/job/${placement.jobId}/placement`);
        if (response.ok) {
          const data = await response.json();
          // Filter placements for the same slot, excluding current placement
          const slotPlacements = data.results?.filter((p: any) => 
            (p.meta?.slotId === selectedSlotId || p.slotId === selectedSlotId) && 
            p.id !== placement.id
          ) || [];
          setExistingPlacements(slotPlacements);
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
    const conflicts: string[] = [];
    
    for (const newPeriod of newPeriods) {
      for (const existingPlacement of existingPlacements) {
        const existingPeriods = existingPlacement.meta?.availability || [];
        
        for (const existingPeriod of existingPeriods) {
          const existingStart = new Date(existingPeriod.startDate);
          const existingEnd = new Date(existingPeriod.endDate);
          
          // Check if periods overlap
          if (newPeriod.startDate <= existingEnd && newPeriod.endDate >= existingStart) {
            const candidateName = existingPlacement.user?.displayName?.split(' (')[0] || 
                                 existingPlacement.user?.username || 'Unknown';
            conflicts.push(`${format(newPeriod.startDate, "MMM d")} - ${format(newPeriod.endDate, "MMM d")} conflicts with ${candidateName}`);
          }
        }
      }
    }
    
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
