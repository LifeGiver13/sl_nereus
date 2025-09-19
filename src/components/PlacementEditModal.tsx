import React, { useState, useEffect, useMemo } from 'react';
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
import { useToast } from '@/hooks/use-toast';
import { API_BASE_URL } from '../config/env';
import { MultiDaySelector } from './MultiDaySelector';

interface PlacementEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  placement: any;
  job: any;
  existingPlacements?: any[]; // All placements for the job
  slots?: Array<{
    id: number;
    placements: any[];
    occupiedDates: Set<string>;
  }>;
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
  job,
  existingPlacements = [],
  slots = []
}) => {
  const [instructions, setInstructions] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('awaiting_confirmation');
  const [confirmed, setConfirmed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSlotId, setSelectedSlotId] = useState<number | null>(null);
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (placement) {
      setInstructions(placement.meta?.instructions || '');
      setNotes(placement.meta?.notes || '');
      setStatus(placement.status || 'awaiting_confirmation');
      setConfirmed(placement.confirmed || false);
      setSelectedSlotId(placement.meta?.slotId || 1);
      
      // Parse existing availability as individual dates
      const existingAvailability = placement.meta?.availability || [];
      if (Array.isArray(existingAvailability) && existingAvailability.length > 0) {
        const dates = existingAvailability
          .map((dateItem: any) => {
            if (typeof dateItem === 'string' || dateItem instanceof Date) {
              const date = new Date(dateItem);
              return !isNaN(date.getTime()) ? date : null;
            }
            return null;
          })
          .filter(Boolean);
        setSelectedDates(dates);
      } else {
        setSelectedDates([]);
      }
    }
  }, [placement]);

  // Get available and conflicting dates for the MultiDaySelector
  const { availableDates, conflictingDates } = useMemo(() => {
    const selectedSlot = slots.find(s => s.id === selectedSlotId);
    const available = new Set<string>();
    const conflicts = new Set<string>();
    
    if (!selectedSlot || !job) return { availableDates: available, conflictingDates: conflicts };
    
    // Get current placement's dates to exclude from conflicts
    const currentPlacementDates = new Set<string>();
    if (placement?.meta?.availability) {
      placement.meta.availability.forEach((placementDate: string | Date) => {
        try {
          const dateStr = new Date(placementDate).toISOString().split('T')[0];
          currentPlacementDates.add(dateStr);
        } catch (e) {
          console.warn('Invalid date in placement availability:', placementDate);
        }
      });
    }
    
    // Generate all job dates
    const jobStart = new Date(job.startDate + 'T00:00:00');
    const jobEnd = new Date(job.endDate + 'T00:00:00');
    const current = new Date(jobStart);
    
    while (current <= jobEnd) {
      const year = current.getFullYear();
      const month = String(current.getMonth() + 1).padStart(2, '0');
      const day = String(current.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      
      // Check if this date is occupied by OTHER placements (exclude current placement)
      const isOccupiedByOthers = selectedSlot.occupiedDates.has(dateStr) && !currentPlacementDates.has(dateStr);
      
      if (isOccupiedByOthers) {
        conflicts.add(dateStr);
      } else {
        available.add(dateStr);
      }
      
      current.setDate(current.getDate() + 1);
    }
    
    return { availableDates: available, conflictingDates: conflicts };
  }, [slots, selectedSlotId, job, placement]);

  const handleSave = async () => {
    if (!placement || selectedDates.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one date",
        variant: "destructive",
      });
      return;
    }

    if (!selectedSlotId) {
      toast({
        title: "Error",
        description: "Please select a slot",
        variant: "destructive",
      });
      return;
    }

    const saveData = {
      status,
      confirmed,
      meta: {
        instructions,
        notes,
        slotId: selectedSlotId,
        availability: selectedDates.map(date => {
          // Set time to 12pm to avoid timezone confusion
          const adjustedDate = new Date(date);
          adjustedDate.setHours(12, 0, 0, 0);
          return adjustedDate.toISOString();
        })
      }
    };

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/placement/${placement.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(saveData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to update placement: ${response.status} ${errorText}`);
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

              <div>
                <label className="text-sm font-medium">Instructions</label>
                <Textarea
                  placeholder="Special instructions for this placement..."
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  className="min-h-[80px]"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Notes</label>
                <Textarea
                  placeholder="Internal notes about this placement..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="min-h-[80px]"
                />
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

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="confirmed"
                  checked={confirmed}
                  onCheckedChange={(checked) => setConfirmed(checked === true)}
                />
                <label htmlFor="confirmed" className="text-sm font-medium">
                  Confirmed
                </label>
              </div>
            </div>

            {/* Right Column - Date Selection */}
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Working Days</label>
                <p className="text-sm text-muted-foreground mb-3">
                  Select the specific days when this candidate will work.
                </p>
                {job && (
                  <MultiDaySelector
                    selectedDates={selectedDates}
                    onDatesChange={setSelectedDates}
                    availableDates={availableDates}
                    conflictingDates={conflictingDates}
                    job={job}
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={isLoading || selectedDates.length === 0}
          >
            {isLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PlacementEditModal;