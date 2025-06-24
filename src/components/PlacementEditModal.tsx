
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
import { useToast } from '@/hooks/use-toast';
import { API_BASE_URL } from '../config/env';

interface PlacementEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  placement: any;
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
  placement
}) => {
  const [instructions, setInstructions] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('awaiting_confirmation');
  const [confirmed, setConfirmed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (placement) {
      setInstructions(placement.meta?.instructions || '');
      setNotes(placement.meta?.notes || '');
      setStatus(placement.status || 'awaiting_confirmation');
      setConfirmed(placement.confirmed || false);
    }
  }, [placement]);

  const handleSave = async () => {
    if (!placement) return;

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/placement/${placement.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status,
          confirmed,
          meta: {
            instructions,
            notes
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

  const candidateName = placement.user?.profile?.Forename && placement.user?.profile?.Surname 
    ? `${placement.user.profile.Forename} ${placement.user.profile.Surname}`
    : placement.user?.username || 'N/A';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Placement</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-500">Candidate</p>
            <p className="font-medium">{candidateName}</p>
          </div>

          <div>
            <label className="text-sm font-medium">Instructions</label>
            <Textarea
              placeholder="Instructions for worker..."
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              className="min-h-[80px]"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Notes</label>
            <Textarea
              placeholder="Internal notes..."
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

          <div className="flex items-center space-x-2">
            <Checkbox
              checked={confirmed}
              onCheckedChange={(checked) => setConfirmed(checked as boolean)}
            />
            <label className="text-sm font-medium">Confirmed</label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PlacementEditModal;
