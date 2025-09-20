import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { MultiDaySelector } from './MultiDaySelector';

interface PlacementDateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: any;
  slots: Array<{
    id: number;
    placements: any[];
    occupiedDates: Set<string>;
  }>;
  job: any;
  onConfirm: (user: any, slotId: number, availability: Date[]) => void;
  editingPlacement?: any;
}

const PlacementDateModal: React.FC<PlacementDateModalProps> = ({
  open,
  onOpenChange,
  user,
  slots,
  job,
  onConfirm,
  editingPlacement
}) => {
  const [selectedSlotId, setSelectedSlotId] = useState<number>(editingPlacement?.meta?.slotId || slots[0]?.id || 1);
  const [selectedDates, setSelectedDates] = useState<Date[]>(
    editingPlacement?.meta?.availability?.map((date: string | Date) => new Date(date)) || []
  );
  const { toast } = useToast();

  // Get available and conflicting dates for highlighting using actual placement data
  const { availableDates, conflictingDates } = useMemo(() => {
    const available = new Set<string>();
    const conflicts = new Set<string>();
    
    if (!job) return { availableDates: available, conflictingDates: conflicts };
    
    // Use the slot's occupied dates directly from the slots data
    const selectedSlot = slots.find(s => s.id === selectedSlotId);
    if (!selectedSlot) return { availableDates: available, conflictingDates: conflicts };
    
    // Parse job dates and set to noon to avoid timezone issues
    const jobStart = new Date(job.startDate);
    jobStart.setHours(12, 0, 0, 0);
    const jobEnd = new Date(job.endDate);
    jobEnd.setHours(12, 0, 0, 0);
    
    // Generate all job dates
    const current = new Date(jobStart);
    
    while (current <= jobEnd) {
      const year = current.getFullYear();
      const month = String(current.getMonth() + 1).padStart(2, '0');
      const day = String(current.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      
      // Skip weekends if not included
      if (job.body?.includeWeekends === false) {
        const dayOfWeek = current.getDay(); // 0 = Sunday, 6 = Saturday
        if (dayOfWeek === 0 || dayOfWeek === 6) {
          current.setDate(current.getDate() + 1);
          continue;
        }
      }
      
      // If editing, include dates from current placement as available
      if (editingPlacement?.meta?.availability) {
        const isCurrentPlacementDate = editingPlacement.meta.availability.some((placementDate: string | Date) => {
          const placementDateStr = new Date(placementDate).toISOString().split('T')[0];
          return placementDateStr === dateStr;
        });
        
        if (isCurrentPlacementDate) {
          available.add(dateStr);
        } else if (selectedSlot.occupiedDates.has(dateStr)) {
          conflicts.add(dateStr);
        } else {
          available.add(dateStr);
        }
      } else {
        // For new placements, use the slot's occupied dates
        if (selectedSlot.occupiedDates.has(dateStr)) {
          conflicts.add(dateStr);
        } else {
          available.add(dateStr);
        }
      }
      
      current.setDate(current.getDate() + 1);
    }
    
    console.log(`Slot ${selectedSlotId} - Available dates:`, Array.from(available));
    console.log(`Slot ${selectedSlotId} - Conflicting dates:`, Array.from(conflicts));
    
    return { availableDates: available, conflictingDates: conflicts };
  }, [slots, selectedSlotId, job.startDate, job.endDate, editingPlacement]);

  const checkDatesAvailability = (slotId: number, dates: Date[]): boolean => {
    const slot = slots.find(s => s.id === slotId);
    if (!slot) return false;
    
    // Create a copy of occupied dates, excluding current placement's dates if editing
    const occupiedDates = new Set(slot.occupiedDates);
    
    if (editingPlacement?.meta?.availability) {
      // Remove current placement's dates from occupied dates
      editingPlacement.meta.availability.forEach((placementDate: string | Date) => {
        const dateString = new Date(placementDate).toISOString().split('T')[0];
        occupiedDates.delete(dateString);
      });
    }
    
    // Check each selected date for conflicts
    for (const date of dates) {
      const dateString = date.toISOString().split('T')[0];
      if (occupiedDates.has(dateString)) {
        return false;
      }
    }
    
    return true;
  };

  const handleConfirm = () => {
    if (selectedDates.length === 0) {
      toast({
        title: "No dates selected",
        description: "Please select at least one date.",
        variant: "destructive",
      });
      return;
    }

    if (!checkDatesAvailability(selectedSlotId, selectedDates)) {
      toast({
        title: "Date conflict",
        description: "Some of the selected dates conflict with existing placements in this slot.",
        variant: "destructive",
      });
      return;
    }

    onConfirm(user, selectedSlotId, selectedDates);
    onOpenChange(false);
  };

  const selectedSlot = slots.find(s => s.id === selectedSlotId);
  const areDatesAvailable = selectedDates.length > 0 ? checkDatesAvailability(selectedSlotId, selectedDates) : true;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editingPlacement ? 'Edit Assignment Dates' : 'Add Candidate to Job'}</DialogTitle>
          <DialogDescription>
            Select the slot and date range for {user?.profile?.Forename || user?.firstName} {user?.profile?.Surname || user?.lastName}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="slot-select">Slot</Label>
            <Select value={selectedSlotId.toString()} onValueChange={(value) => setSelectedSlotId(parseInt(value))}>
              <SelectTrigger className="bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-50 bg-background border border-border shadow-lg">
                {slots.map((slot) => (
                  <SelectItem key={slot.id} value={slot.id.toString()} className="hover:bg-accent">
                    Slot {slot.id} ({slot.placements.length} candidates, {slot.occupiedDates.size} days occupied)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Select Working Days</Label>
            <p className="text-sm text-muted-foreground mb-3">
              Click on individual days to select them. You can select multiple non-consecutive days.
            </p>
            <MultiDaySelector
              selectedDates={selectedDates}
              onDatesChange={setSelectedDates}
              availableDates={availableDates}
              conflictingDates={conflictingDates}
              job={job}
            />
          </div>

          {selectedSlot && selectedSlot.occupiedDates.size > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">
                Slot {selectedSlotId} has {selectedSlot.occupiedDates.size} occupied days. 
                Available dates are highlighted with a blue border, occupied dates are shown in red with strikethrough and cannot be selected.
              </p>
            </div>
          )}

          {!areDatesAvailable && selectedDates.length > 0 && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">
                Some of the selected dates conflict with existing placements in this slot.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={!areDatesAvailable || selectedDates.length === 0}
          >
            {editingPlacement ? 'Update Assignment' : `Add to Slot ${selectedSlotId}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PlacementDateModal;