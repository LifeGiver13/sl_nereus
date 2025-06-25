
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useQuery } from '@tanstack/react-query';
import { API_BASE_URL } from '../config/env';
import { ExternalLink, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface JobSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobId: number | null;
}

const JobSummaryModal = ({ isOpen, onClose, jobId }: JobSummaryModalProps) => {
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

  const { data: placementsData } = useQuery({
    queryKey: ['placements-summary', jobId],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/placements/job/${jobId}`);
      if (!response.ok) {
        return { results: [] };
      }
      return response.json();
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

  const getClientName = () => {
    return job.client?.name || `Client ID: ${job.clientId}`;
  };

  const getDepartmentName = () => {
    return job.department?.name || `Department ID: ${job.departmentId}`;
  };

  const getShiftName = () => {
    return job.shift ? `${job.shift.name} (${job.shift.startTime} - ${job.shift.endTime})` : `Shift ID: ${job.shiftId}`;
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'open': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl text-[#000009]">{job.title}</DialogTitle>
            <Button onClick={handleViewFullDetails} variant="outline" size="sm">
              <ExternalLink className="h-4 w-4 mr-2" />
              View Full Details
            </Button>
          </div>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Job Summary */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <span className="text-sm font-medium text-gray-600">Client:</span>
              <p className="text-sm text-gray-900">{getClientName()}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-600">Department:</span>
              <p className="text-sm text-gray-900">{getDepartmentName()}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-600">Shift:</span>
              <p className="text-sm text-gray-900">{getShiftName()}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-600">Status:</span>
              <Badge className={getStatusColor(job.status)} variant="outline">
                {job.status}
              </Badge>
            </div>
          </div>

          {/* Placements */}
          {placements.length > 0 ? (
            <div>
              <h3 className="text-lg font-semibold text-[#000009] mb-3">Current Placements</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Candidate</TableHead>
                    <TableHead>Shift</TableHead>
                    <TableHead>Confirmed</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {placements.map((placement: any) => (
                    <TableRow key={placement.id}>
                      <TableCell>
                        {placement.user?.profile?.Forename && placement.user?.profile?.Surname 
                          ? `${placement.user.profile.Forename} ${placement.user.profile.Surname}`
                          : placement.user?.username || 'N/A'
                        }
                      </TableCell>
                      <TableCell>
                        {placement.shift 
                          ? `${placement.shift.name} (${placement.shift.startTime} - ${placement.shift.endTime})`
                          : 'N/A'
                        }
                      </TableCell>
                      <TableCell>
                        <Badge className={placement.confirmed ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'} variant="outline">
                          {placement.confirmed ? 'Yes' : 'No'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {placement.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-6 text-gray-500">
              <p>No placements found for this job</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default JobSummaryModal;
