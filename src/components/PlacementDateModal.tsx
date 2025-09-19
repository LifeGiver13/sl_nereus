import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';

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
  const [selectedSlotId, setSelectedSlotId] = useState<number>(editingPlacement?.meta?.slotId || 1);
  const [startDate, setStartDate] = useState<string>(
    editingPlacement?.meta?.availability?.[0]?.startDate 
      ? new Date(editingPlacement.meta.availability[0].startDate).toISOString().split('T')[0]
      : jobStartDate.split('T')[0]
  );
  const [endDate, setEndDate] = useState<string>(
    editingPlacement?.meta?.availability?.[0]?.endDate 
      ? new Date(editingPlacement.meta.availability[0].endDate).toISOString().split('T')[0]
      : jobStartDate.split('T')[0]
  );
  const [singleDate, setSingleDate] = useState<boolean>(
    editingPlacement?.meta?.availability?.[0]
      ? new Date(editingPlacement.meta.availability[0].startDate).toDateString() === new Date(editingPlacement.meta.availability[0].endDate).toDateString()
      : true
  );
  const { toast } = useToast();

  const checkDateAvailability = (slotId: number, start: string, end: string): boolean => {
    const slot = slots.find(s => s.id === slotId);
    if (!slot) return false;

    const current = new Date(start);
    const endCheck = new Date(end);
    
    while (current <= endCheck) {
      const dateString = current.toISOString().split('T')[0];
      if (slot.occupiedDates.has(dateString)) {
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
        description: "Please select a date.",
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

    if (!singleDate && new Date(startDate) > new Date(finalEndDate)) {
      toast({
        title: "Invalid date range",
        description: "Start date must be before end date.",
        variant: "destructive",
      });
      return;
    }

    if (!checkDateAvailability(selectedSlotId, startDate, finalEndDate)) {
      toast({
        title: "Date conflict",
        description: "The selected dates conflict with existing placements in this slot.",
        variant: "destructive",
      });
      return;
    }

    const availability = [{
      startDate: new Date(startDate),
      endDate: new Date(finalEndDate)
    }];

    onConfirm(user, selectedSlotId, availability);
    onOpenChange(false);
  };

  const selectedSlot = slots.find(s => s.id === selectedSlotId);
  const finalEndDate = singleDate ? startDate : endDate;
  const isDateRangeAvailable = checkDateAvailability(selectedSlotId, startDate, finalEndDate);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
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
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    if (singleDate) {
                      setEndDate(e.target.value);
                    }
                  }}
                  min={jobStartDate.split('T')[0]}
                  max={jobEndDate.split('T')[0]}
                />
              </div>
              {!singleDate && (
                <div>
                  <Label htmlFor="end-date">End Date</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    min={startDate}
                    max={jobEndDate.split('T')[0]}
                  />
                </div>
              )}
            </div>
          </div>

          {selectedSlot && selectedSlot.occupiedDates.size > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">
                Slot {selectedSlotId} has {selectedSlot.occupiedDates.size} occupied days. 
                Make sure your selected dates don't overlap.
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