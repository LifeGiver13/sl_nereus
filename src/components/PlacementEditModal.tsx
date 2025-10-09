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
  { value: 'rejected', label: 'Rejected (Candidate)' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Client Cancelled' },
  { value: 'absent_explained', label: 'Absent (Explained)' },
  { value: 'absent_unexplained', label: 'Absent (Unexplained)' }
];

const statusesRequiringRemarks = ['cancelled', 'absent_explained', 'absent_unexplained'];

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
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSlotId, setSelectedSlotId] = useState<number | null>(null);
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [remarks, setRemarks] = useState('');
  const [updateFuturePlacements, setUpdateFuturePlacements] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    console.log('🔍 PlacementEditModal: Received placement prop:', placement);
    console.log('🔍 placement.userId:', placement?.userId);
    console.log('🔍 placement.jobId:', placement?.jobId);
    console.log('🔍 placement.meta:', placement?.meta);
    
    if (placement) {
      setInstructions(placement.meta?.instructions || '');
      setNotes(placement.meta?.notes || '');
      setStatus(placement.status || 'awaiting_confirmation');
      setSelectedSlotId(placement.meta?.vacancy || placement.vacancy || 1);
      setRemarks(placement.meta?.remarks || '');
      setUpdateFuturePlacements(false);
      
      // Set current placement date from meta.shiftDate
      const shiftDate = placement.meta?.shiftDate;
      if (shiftDate) {
        const date = new Date(shiftDate);
        if (!isNaN(date.getTime())) {
          setSelectedDates([date]);
        }
      }
    }
  }, [placement]);

  // Get available and conflicting dates for the MultiDaySelector
  const { availableDates, conflictingDates } = useMemo(() => {
    const selectedSlot = slots.find(s => s.id === selectedSlotId);
    const available = new Set<string>();
    const conflicts = new Set<string>();
    
    if (!selectedSlot || !job) return { availableDates: available, conflictingDates: conflicts };
    
    // Generate all job dates
    const jobStart = new Date(job.startDate + 'T00:00:00');
    const jobEnd = new Date(job.endDate + 'T00:00:00');
    const current = new Date(jobStart);
    
    while (current <= jobEnd) {
      const year = current.getFullYear();
      const month = String(current.getMonth() + 1).padStart(2, '0');
      const day = String(current.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      
      // Check if this date is occupied by OTHER placements
      const isOccupiedByOthers = selectedSlot.occupiedDates.has(dateStr);
      
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
    console.log('💾 handleSave called');
    console.log('updateFuturePlacements:', updateFuturePlacements);
    console.log('job:', job);
    console.log('existingPlacements:', existingPlacements);
    
    if (!placement) {
      return;
    }

    // Validate remarks if status requires them
    if (statusesRequiringRemarks.includes(status) && !remarks.trim()) {
      toast({
        title: "Error",
        description: "Please provide remarks for this status",
        variant: "destructive",
      });
      return;
    }

    const saveData = {
      status,
      confirmed: true,
      meta: {
        ...placement.meta,
        instructions,
        notes,
        remarks: statusesRequiringRemarks.includes(status) ? remarks : undefined
      }
    };

    // For future placements, we only want to update certain fields, NOT the shiftDate
    const futurePlacementSaveData = {
      status,
      confirmed: true,
      meta: {
        instructions,
        notes,
        remarks: statusesRequiringRemarks.includes(status) ? remarks : undefined
      }
    };

    setIsLoading(true);
    try {
      // Update current placement
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

      // Update future placements if checkbox is checked
      if (updateFuturePlacements && job) {
        console.log('🔍 ========================================');
        console.log('🔍 STARTING FUTURE PLACEMENTS UPDATE CHECK');
        console.log('🔍 ========================================');
        console.log('Current placement ID:', placement.id);
        console.log('Current placement userId:', placement.userId);
        console.log('Current placement jobId:', placement.jobId);
        console.log('Current placement meta.shiftDate:', placement.meta?.shiftDate);
        console.log('Total existing placements:', existingPlacements.length);
        
        // Get the placement date from meta.shiftDate
        const placementDate = new Date(placement.meta?.shiftDate);
        placementDate.setHours(0, 0, 0, 0);
        console.log('\n📅 Current placement date (normalized):', placementDate.toISOString());
        
        // First, find ALL placements for this user in this job
        const currentUserId = Number(placement.userId);
        const currentJobId = Number(placement.jobId);
        
        const userPlacements = existingPlacements.filter((p: any) => 
          Number(p.userId) === currentUserId && Number(p.jobId) === currentJobId
        );
        
        console.log('\n👤 ========================================');
        console.log(`👤 ALL PLACEMENTS FOR USER ${currentUserId} IN JOB ${currentJobId}:`);
        console.log('👤 ========================================');
        console.log(`Found ${userPlacements.length} total placements for this user in this job`);
        
        userPlacements.forEach((p: any, index: number) => {
          const pDate = p.meta?.shiftDate ? new Date(p.meta.shiftDate) : null;
          if (pDate) {
            pDate.setHours(0, 0, 0, 0);
          }
          const isCurrent = p.id === placement.id;
          const isFuture = pDate && pDate > placementDate;
          
          console.log(`\n  ${index + 1}. Placement ID ${p.id}:`);
          console.log(`     - User ID: ${p.userId}`);
          console.log(`     - Job ID: ${p.jobId}`);
          console.log(`     - Date: ${p.meta?.shiftDate || 'MISSING'}`);
          console.log(`     - Normalized: ${pDate ? pDate.toISOString() : 'INVALID'}`);
          console.log(`     - Is Current? ${isCurrent ? '✅ YES' : '❌ NO'}`);
          console.log(`     - Is Future? ${isFuture ? '✅ YES (WILL UPDATE)' : '❌ NO'}`);
          console.log(`     - Status: ${p.status}`);
        });
        
        // Find all future placements for this user in this job (after this placement's date)
        const futurePlacements = userPlacements.filter((p: any) => {
          if (p.id === placement.id) {
            return false; // Skip current placement
          }
          
          const pDate = p.meta?.shiftDate ? new Date(p.meta.shiftDate) : null;
          if (!pDate || isNaN(pDate.getTime())) {
            console.warn(`⚠️ Placement ${p.id} has invalid date:`, p.meta?.shiftDate);
            return false;
          }
          
          pDate.setHours(0, 0, 0, 0);
          return pDate > placementDate;
        });
        
        console.log('\n🎯 ========================================');
        console.log('🎯 FUTURE PLACEMENTS TO UPDATE:');
        console.log('🎯 ========================================');

        console.log('🎯 Found future placements to update:', futurePlacements.length);

        // Update each future placement - preserve their individual shiftDates
        await Promise.all(futurePlacements.map((fp: any) => {
          // Merge the new data with existing meta, preserving the shiftDate and vacancy
          const futureData = {
            ...futurePlacementSaveData,
            meta: {
              ...fp.meta, // Keep existing meta (including shiftDate and vacancy)
              ...futurePlacementSaveData.meta // Override with new instructions, notes, remarks
            }
          };
          
          console.log(`Updating placement ${fp.id} with shiftDate ${fp.meta?.shiftDate}`);
          
          return fetch(`${API_BASE_URL}/placement/${fp.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(futureData),
          });
        }));

        toast({
          title: "Success",
          description: `Updated current placement and ${futurePlacements.length} future placement(s)`,
        });
      } else {
        toast({
          title: "Success",
          description: "Placement updated successfully",
        });
      }

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

              {statusesRequiringRemarks.includes(status) && (
                <div>
                  <label className="text-sm font-medium">Remarks *</label>
                  <Textarea
                    placeholder="Please provide remarks for this status..."
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    className="min-h-[80px]"
                  />
                </div>
              )}

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="updateFuture"
                  checked={updateFuturePlacements}
                  onCheckedChange={(checked) => setUpdateFuturePlacements(checked === true)}
                />
                <label htmlFor="updateFuture" className="text-sm font-medium">
                  Update future placements for this candidate
                </label>
              </div>
            </div>

            {/* Right Column - Placement Info */}
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Placement Date</label>
                <p className="text-sm text-muted-foreground">
                  {placement.meta?.shiftDate ? new Date(placement.meta.shiftDate).toLocaleDateString() : 'N/A'}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium">Slot</label>
                <p className="text-sm text-muted-foreground">
                  Slot {selectedSlotId || 1}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium">Job</label>
                <p className="text-sm text-muted-foreground">
                  {job?.title || 'N/A'}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium">Date Range</label>
                <p className="text-sm text-muted-foreground">
                  {job?.startDate && job?.endDate ? 
                    `${new Date(job.startDate).toLocaleDateString()} - ${new Date(job.endDate).toLocaleDateString()}` : 
                    'N/A'}
                </p>
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