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
}

const PlacementDateModal: React.FC<PlacementDateModalProps> = ({
  open,
  onOpenChange,
  user,
  slots,
  job,
  onConfirm
}) => {
  const [selectedSlotId, setSelectedSlotId] = useState<number>(slots[0]?.id || 1);
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
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
      
      // Check if this date is occupied by other placements
      if (selectedSlot.occupiedDates.has(dateStr)) {
        conflicts.add(dateStr);
      } else {
        available.add(dateStr);
      }
      
      current.setDate(current.getDate() + 1);
    }
    
    console.log(`Slot ${selectedSlotId} - Available dates:`, Array.from(available));
    console.log(`Slot ${selectedSlotId} - Conflicting dates:`, Array.from(conflicts));
    
    return { availableDates: available, conflictingDates: conflicts };
  }, [slots, selectedSlotId, job.startDate, job.endDate]);

  const checkDatesAvailability = (slotId: number, dates: Date[]): boolean => {
    const slot = slots.find(s => s.id === slotId);
    if (!slot) return false;
    
    // Check each selected date for conflicts
    for (const date of dates) {
      const dateString = date.toISOString().split('T')[0];
      if (slot.occupiedDates.has(dateString)) {
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

    // Check if user is already assigned to ANY slot on the same dates
    const conflictingDatesInOtherSlots: string[] = [];
    selectedDates.forEach(date => {
      const dateStr = date.toISOString().split('T')[0];
      // Check all slots except the currently selected one
      slots.forEach(slot => {
        if (slot.id !== selectedSlotId) {
          // Check if this user has a placement on this date in another slot
          const hasPlacementOnDate = slot.placements.some(p => {
            if (p.userId === user.id || p.user?.id === user.id) {
              const placementDate = p.meta?.shiftDate || p.shiftDate;
              if (placementDate) {
                const pDateStr = new Date(placementDate).toISOString().split('T')[0];
                return pDateStr === dateStr;
              }
            }
            return false;
          });
          if (hasPlacementOnDate) {
            conflictingDatesInOtherSlots.push(`${dateStr} (Slot ${slot.id})`);
          }
        }
      });
    });

    if (conflictingDatesInOtherSlots.length > 0) {
      toast({
        title: "Candidate already assigned",
        description: `This candidate is already assigned on: ${conflictingDatesInOtherSlots.join(', ')}`,
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
          <DialogTitle>Add Candidate to Job</DialogTitle>
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
            Add to Slot {selectedSlotId}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PlacementDateModal;