
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit } from 'lucide-react';

interface PlacementDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
  placement: any;
}

const PlacementDetailModal: React.FC<PlacementDetailModalProps> = ({
  isOpen,
  onClose,
  onEdit,
  placement
}) => {
  if (!placement) return null;

  const candidateName = placement.user?.profile?.Forename && placement.user?.profile?.Surname 
    ? `${placement.user.profile.Forename} ${placement.user.profile.Surname}`
    : placement.user?.username || 'N/A';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Placement Details</DialogTitle>
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </div>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Placement ID</p>
              <p className="font-medium">#{placement.id}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Candidate</p>
              <p className="font-medium">{candidateName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Status</p>
              <Badge variant="outline">{placement.status}</Badge>
            </div>
            <div>
              <p className="text-sm text-gray-500">Confirmed</p>
              <Badge className={placement.confirmed ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                {placement.confirmed ? 'Yes' : 'No'}
              </Badge>
            </div>
          </div>

          {/* Instructions */}
          <div>
            <p className="text-sm text-gray-500 mb-2">Instructions</p>
            <div className="bg-gray-50 p-3 rounded-md min-h-[60px]">
              {placement.meta?.instructions || 'No instructions provided'}
            </div>
          </div>

          {/* Notes */}
          <div>
            <p className="text-sm text-gray-500 mb-2">Notes</p>
            <div className="bg-gray-50 p-3 rounded-md min-h-[60px]">
              {placement.meta?.notes || 'No notes provided'}
            </div>
          </div>

          {/* Activity Log - Placeholder for future implementation */}
          <div>
            <p className="text-sm text-gray-500 mb-2">Activity Log</p>
            <div className="bg-gray-50 p-3 rounded-md text-sm text-gray-500">
              Activity log will be populated in the future
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PlacementDetailModal;
