
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useQuery } from '@tanstack/react-query';
import { API_BASE_URL } from '../config/env';
import { ExternalLink, Eye, Calendar as CalendarIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

interface JobSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobId: number | null;
  placement?: any;
}

const JobSummaryModal = ({ isOpen, onClose, jobId, placement }: JobSummaryModalProps) => {
  const navigate = useNavigate();

  const { data: job, isLoading } = useQuery({
    queryKey: ['job-summary', jobId],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/job/${jobId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch job details');
      }
      return response.json();
    },
    enabled: !!jobId && isOpen
  });

  // If placement is provided, fetch all placements for this specific user and job
  const { data: placementsData } = useQuery({
    queryKey: placement ? ['candidate-job-placements', placement.userId, jobId] : ['placements-summary', jobId],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/placements/job/${jobId}`);
      if (!response.ok) {
        return { results: [] };
      }
      const data = await response.json();
      // If we have a placement (clicked on candidate), filter to only that candidate
      if (placement) {
        return { results: data.results.filter((p: any) => p.userId === placement.userId) };
      }
      return data;
    },
    enabled: !!jobId && isOpen
  });

  const handleViewFullDetails = () => {
    navigate(`/job/${jobId}`);
    onClose();
  };

  if (!isOpen || !jobId) return null;

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Loading Job Details...</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <div className="text-sm text-gray-500">Loading...</div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!job) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Error</DialogTitle>
          </DialogHeader>
          <div className="text-red-600">Failed to load job details</div>
        </DialogContent>
      </Dialog>
    );
  }

  const placements = placementsData?.results || [];

  const candidateName = placement?.user?.profile?.Forename && placement?.user?.profile?.Surname 
    ? `${placement.user.profile.Forename} ${placement.user.profile.Surname}`
    : placement?.user?.username || null;

  const currentDate = placement?.meta?.shiftDate || placement?.clickedDate;

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'accepted':
      case 'awaiting_confirmation':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'absent_explained':
      case 'absent_unexplained':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'completed':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <DialogTitle className="text-xl text-[#000009]">
                {placement && candidateName ? candidateName : job.title}
              </DialogTitle>
              {placement && (
                <Badge className={getStatusColor(placement.status)} variant="outline">
                  {placement.status?.replace(/_/g, ' ')}
                </Badge>
              )}
            </div>
            <Button onClick={handleViewFullDetails} variant="outline" size="sm">
              <ExternalLink className="h-4 w-4 mr-2" />
              View Full Details
            </Button>
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto min-h-0 space-y-4 pr-2">
          {/* Job Summary */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
            {placement && (
              <>
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Job:</span>
                  <p className="text-sm font-medium">{job.title}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Client:</span>
                  <p className="text-sm font-medium">{job.client?.name || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Assigned Agency Department:</span>
                  <p className="text-sm font-medium">{job.department?.name || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Shift:</span>
                  <p className="text-sm font-medium">
                    {job.shift ? `${job.shift.name} (${job.shift.startTime} - ${job.shift.endTime})` : 'N/A'}
                  </p>
                </div>
              </>
            )}
            {!placement && (
              <>
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Client:</span>
                  <p className="text-sm font-medium">{job.client?.name || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Assigned Agency Department:</span>
                  <p className="text-sm font-medium">{job.department?.name || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Shift:</span>
                  <p className="text-sm font-medium">
                    {job.shift ? `${job.shift.name} (${job.shift.startTime} - ${job.shift.endTime})` : 'N/A'}
                  </p>
                </div>
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Status:</span>
                  <Badge className={getStatusColor(job.status)} variant="outline">
                    {job.status}
                  </Badge>
                </div>
              </>
            )}
          </div>

          {/* Placements - only show for job view, not candidate view */}
          {!placement && placements.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-[#000009] mb-3">Current Placements</h3>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Candidate</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {placements.map((p: any) => (
                      <TableRow key={p.id}>
                        <TableCell>
                          {p.user?.profile?.Forename && p.user?.profile?.Surname 
                            ? `${p.user.profile.Forename} ${p.user.profile.Surname}`
                            : p.user?.username || 'N/A'
                          }
                        </TableCell>
                        <TableCell>
                          {p.meta?.shiftDate ? format(new Date(p.meta.shiftDate), 'MMM dd, yyyy') : 'N/A'}
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(p.status)} variant="outline">
                            {p.status?.replace(/_/g, ' ')}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
          {!placement && placements.length === 0 && (
            <div className="text-center py-6 text-muted-foreground">
              <p>No placements found for this job</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default JobSummaryModal;
