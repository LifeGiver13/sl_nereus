
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Calendar } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { apiRequest } from '@/lib/utils';

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
  // Fetch job details
  const { data: job } = useQuery({
    queryKey: ['job', placement?.jobId],
    queryFn: async () => {
      const response = await apiRequest(`/job/${placement.jobId}`);
      if (!response.ok) throw new Error('Failed to fetch job');
      return response.json();
    },
    enabled: !!placement?.jobId && isOpen
  });

  // Fetch all placements for this candidate and job
  const { data: candidatePlacements = [] } = useQuery({
    queryKey: ['candidate-job-placements', placement?.userId, placement?.jobId],
    queryFn: async () => {
      const response = await apiRequest(`/placements/job/${placement.jobId}`);
      if (!response.ok) throw new Error('Failed to fetch placements');
      const allPlacements = await response.json();
      // Filter to only this candidate's placements
      return allPlacements.filter((p: any) => p.userId === placement.userId);
    },
    enabled: !!placement?.userId && !!placement?.jobId && isOpen
  });

  if (!placement) return null;

  const candidateName = placement.user?.profile?.Forename && placement.user?.profile?.Surname
    ? `${placement.user.profile.Forename} ${placement.user.profile.Surname}`
    : placement.user?.username || 'N/A';

  const currentDate = placement.meta?.shiftDate;

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'confirmed':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'awaiting_confirmation':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  function formatDate(value: string): string {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "-";

    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).replace(/\//g, '/');
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <DialogTitle>{candidateName}</DialogTitle>
              <Badge className={getStatusColor(placement.status)} variant="outline">
                {placement.status?.replace(/_/g, ' ')}
              </Badge>
            </div>
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Summary Details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Job</p>
              <p className="font-medium">{job?.title || 'Loading...'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Client</p>
              <p className="font-medium">{job?.client?.name || 'Loading...'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Shift</p>
              <p className="font-medium">{placement.shift?.name || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Assigned Agency Department</p>
              <p className="font-medium">{job?.department?.name || 'Loading...'}</p>
            </div>
          </div>

          {/* Current Placements */}
          <div>
            <p className="text-sm text-muted-foreground mb-3">Committed Dates for this Job</p>
            <div className="grid grid-cols-2 gap-2">
              {candidatePlacements.length > 0 ? (
                candidatePlacements.map((p: any) => {
                  const isCurrentDate = p.meta?.shiftDate === currentDate;
                  return (
                    <div
                      key={p.id}
                      className={`flex items-center justify-between p-3 rounded-md border ${isCurrentDate ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'border-border'
                        }`}
                    >
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">
                          {p.meta?.shiftDate ? (formatDate(p.meta.shiftDate), 'MMM dd, yyyy') : 'No date'}
                        </span>
                      </div>
                      <Badge className={getStatusColor(p.status)} variant="outline">
                        {p.status?.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-muted-foreground col-span-2">No committed dates</p>
              )}
            </div>
          </div>

          {/* Instructions */}
          {placement.meta?.instructions && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">Instructions</p>
              <div className="bg-muted p-3 rounded-md">
                <p className="text-sm">{placement.meta.instructions}</p>
              </div>
            </div>
          )}

          {/* Notes */}
          {placement.meta?.notes && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">Notes</p>
              <div className="bg-muted p-3 rounded-md">
                <p className="text-sm">{placement.meta.notes}</p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PlacementDetailModal;
