import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PlacementDateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: any;
  slots: Array<{
    id: number;
    placements: any[];
    occupiedDates: Set<string>;
  }>;
  jobStartDate: string;
  jobEndDate: string;
  onConfirm: (user: any, slotId: number, availability: Array<{ startDate: Date; endDate: Date }>) => void;
  editingPlacement?: any;
}

const PlacementDateModal: React.FC<PlacementDateModalProps> = ({
  open,
  onOpenChange,
  user,
  slots,
  jobStartDate,
  jobEndDate,
  onConfirm,
  editingPlacement
}) => {
  const [selectedSlotId, setSelectedSlotId] = useState<number>(editingPlacement?.meta?.slotId || slots[0]?.id || 1);
  const [startDate, setStartDate] = useState<Date | undefined>(
    editingPlacement?.meta?.availability?.[0]?.startDate 
      ? new Date(editingPlacement.meta.availability[0].startDate)
      : undefined
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    editingPlacement?.meta?.availability?.[0]?.endDate 
      ? new Date(editingPlacement.meta.availability[0].endDate)
      : undefined
  );
  const [singleDate, setSingleDate] = useState<boolean>(
    editingPlacement?.meta?.availability?.[0]
      ? new Date(editingPlacement.meta.availability[0].startDate).toDateString() === new Date(editingPlacement.meta.availability[0].endDate).toDateString()
      : false // Default to date range mode for new placements
  );
  const { toast } = useToast();

  // Get available and conflicting dates for highlighting
  const { availableDates, conflictingDates } = useMemo(() => {
    const selectedSlot = slots.find(s => s.id === selectedSlotId);
    const available = new Set<string>();
    const conflicts = new Set<string>();
    
    if (!selectedSlot) return { availableDates: available, conflictingDates: conflicts };
    
    // Parse dates more reliably by creating Date objects in local timezone
    const jobStart = new Date(jobStartDate + 'T00:00:00');
    const jobEnd = new Date(jobEndDate + 'T00:00:00');
    
    // Generate all job dates using local date strings to avoid timezone issues
    const current = new Date(jobStart);
    
    while (current <= jobEnd) {
      // Use local date formatting instead of UTC to avoid timezone shifts
      const year = current.getFullYear();
      const month = String(current.getMonth() + 1).padStart(2, '0');
      const day = String(current.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      
      // If editing, include dates from current placement as available
      if (editingPlacement?.meta?.availability) {
        const isCurrentPlacementDate = editingPlacement.meta.availability.some((window: any) => {
          const start = new Date(window.startDate + 'T00:00:00');
          const end = new Date(window.endDate + 'T00:00:00');
          const checkDate = new Date(current);
          return checkDate >= start && checkDate <= end;
        });
        
        if (isCurrentPlacementDate) {
          available.add(dateStr);
        } else if (selectedSlot.occupiedDates.has(dateStr)) {
          conflicts.add(dateStr);
        } else {
          available.add(dateStr);
        }
      } else {
        // For new placements, exclude occupied dates
        if (selectedSlot.occupiedDates.has(dateStr)) {
          conflicts.add(dateStr);
        } else {
          available.add(dateStr);
        }
      }
      
      current.setDate(current.getDate() + 1);
    }
    
    return { availableDates: available, conflictingDates: conflicts };
  }, [slots, selectedSlotId, jobStartDate, jobEndDate, editingPlacement]);

  const checkDateAvailability = (slotId: number, start: Date, end: Date): boolean => {
    const slot = slots.find(s => s.id === slotId);
    if (!slot) return false;

    const current = new Date(start);
    const endCheck = new Date(end);
    
    // Create a copy of occupied dates, excluding current placement's dates if editing
    const occupiedDates = new Set(slot.occupiedDates);
    
    if (editingPlacement?.meta?.availability) {
      // Remove current placement's dates from occupied dates
      editingPlacement.meta.availability.forEach((window: any) => {
        const editingStart = new Date(window.startDate);
        const editingEnd = new Date(window.endDate);
        const editingCurrent = new Date(editingStart);
        
        while (editingCurrent <= editingEnd) {
          const dateString = editingCurrent.toISOString().split('T')[0];
          occupiedDates.delete(dateString);
          editingCurrent.setDate(editingCurrent.getDate() + 1);
        }
      });
    }
    
    while (current <= endCheck) {
      const dateString = current.toISOString().split('T')[0];
      if (occupiedDates.has(dateString)) {
        return false;
      }
      current.setDate(current.getDate() + 1);
    }
    
    return true;
  };

  const handleConfirm = () => {
    if (!startDate) {
      toast({
        title: "Invalid date",
        description: "Please select a start date.",
        variant: "destructive",
      });
      return;
    }

    const finalEndDate = singleDate ? startDate : endDate;
    
    if (!singleDate && !endDate) {
      toast({
        title: "Invalid dates",
        description: "Please select an end date.",
        variant: "destructive",
      });
      return;
    }

    if (!singleDate && startDate > finalEndDate!) {
      toast({
        title: "Invalid date range",
        description: "Start date must be before end date.",
        variant: "destructive",
      });
      return;
    }

    if (!checkDateAvailability(selectedSlotId, startDate, finalEndDate!)) {
      toast({
        title: "Date conflict",
        description: "The selected dates conflict with existing placements in this slot.",
        variant: "destructive",
      });
      return;
    }

    const availability = [{
      startDate: startDate,
      endDate: finalEndDate!
    }];

    onConfirm(user, selectedSlotId, availability);
    onOpenChange(false);
  };

  const selectedSlot = slots.find(s => s.id === selectedSlotId);
  const finalEndDate = singleDate ? startDate : endDate;
  const isDateRangeAvailable = startDate && finalEndDate ? checkDateAvailability(selectedSlotId, startDate, finalEndDate) : true;

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

          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="single-date"
                checked={singleDate}
                onChange={(e) => {
                  setSingleDate(e.target.checked);
                  if (e.target.checked) {
                    setEndDate(startDate);
                  }
                }}
                className="rounded border-gray-300"
              />
              <Label htmlFor="single-date">Single date assignment</Label>
            </div>
            
            <div className={singleDate ? "grid grid-cols-1 gap-4" : "grid grid-cols-2 gap-4"}>
              <div>
                <Label htmlFor="start-date">{singleDate ? "Date" : "Start Date"}</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={(date) => {
                        setStartDate(date);
                        if (singleDate) {
                          setEndDate(date);
                        }
                      }}
                       disabled={(date) => {
                         const year = date.getFullYear();
                         const month = String(date.getMonth() + 1).padStart(2, '0');
                         const day = String(date.getDate()).padStart(2, '0');
                         const dateStr = `${year}-${month}-${day}`;
                         const jobStart = new Date(jobStartDate + 'T00:00:00');
                         const jobEnd = new Date(jobEndDate + 'T00:00:00');
                         return date < jobStart || 
                                date > jobEnd ||
                                conflictingDates.has(dateStr);
                       }}
                       modifiers={{
                         available: (date) => {
                           const year = date.getFullYear();
                           const month = String(date.getMonth() + 1).padStart(2, '0');
                           const day = String(date.getDate()).padStart(2, '0');
                           const dateStr = `${year}-${month}-${day}`;
                           return availableDates.has(dateStr);
                         },
                         conflicting: (date) => {
                           const year = date.getFullYear();
                           const month = String(date.getMonth() + 1).padStart(2, '0');
                           const day = String(date.getDate()).padStart(2, '0');
                           const dateStr = `${year}-${month}-${day}`;
                           return conflictingDates.has(dateStr);
                         }
                       }}
                      modifiersStyles={{
                        available: { backgroundColor: 'hsl(var(--primary) / 0.2)', color: 'hsl(var(--primary))' },
                        conflicting: { backgroundColor: 'hsl(var(--destructive) / 0.2)', color: 'hsl(var(--destructive))' }
                      }}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              {!singleDate && (
                <div>
                  <Label htmlFor="end-date">End Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !endDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={setEndDate}
                       disabled={(date) => {
                         const year = date.getFullYear();
                         const month = String(date.getMonth() + 1).padStart(2, '0');
                         const day = String(date.getDate()).padStart(2, '0');
                         const dateStr = `${year}-${month}-${day}`;
                         const jobStart = new Date(jobStartDate + 'T00:00:00');
                         const jobEnd = new Date(jobEndDate + 'T00:00:00');
                         return date < (startDate || jobStart) || 
                                date > jobEnd ||
                                conflictingDates.has(dateStr);
                       }}
                         modifiers={{
                           available: (date) => {
                             const year = date.getFullYear();
                             const month = String(date.getMonth() + 1).padStart(2, '0');
                             const day = String(date.getDate()).padStart(2, '0');
                             const dateStr = `${year}-${month}-${day}`;
                             return availableDates.has(dateStr);
                           },
                           conflicting: (date) => {
                             const year = date.getFullYear();
                             const month = String(date.getMonth() + 1).padStart(2, '0');
                             const day = String(date.getDate()).padStart(2, '0');
                             const dateStr = `${year}-${month}-${day}`;
                             return conflictingDates.has(dateStr);
                           }
                         }}
                        modifiersStyles={{
                          available: { backgroundColor: 'hsl(var(--primary) / 0.2)', color: 'hsl(var(--primary))' },
                          conflicting: { backgroundColor: 'hsl(var(--destructive) / 0.2)', color: 'hsl(var(--destructive))' }
                        }}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}
            </div>
          </div>

          {selectedSlot && selectedSlot.occupiedDates.size > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">
                Slot {selectedSlotId} has {selectedSlot.occupiedDates.size} occupied days. 
                Available dates are highlighted in blue, conflicting dates in red.
              </p>
            </div>
          )}

          {!isDateRangeAvailable && startDate && (singleDate || endDate) && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">
                The selected {singleDate ? "date" : "date range"} conflicts with existing placements in this slot.
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
            disabled={!isDateRangeAvailable || !startDate || (!singleDate && !endDate)}
          >
            Add to Slot {selectedSlotId}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PlacementDateModal;