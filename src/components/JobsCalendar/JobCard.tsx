import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Job } from '../../types/job';
import { getStatusColor } from '../../utils/jobsCalendarUtils';
import { Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface JobCardProps {
  job: Job;
  day: Date;
  onClick: (jobId: number) => void;
}

const JobCard: React.FC<JobCardProps> = ({ job, day, onClick }) => {
  const navigate = useNavigate();

  const handleFillVacancies = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the card click
    navigate(`/job/${job.id}/fill`);
  };

  return (
    <div
      className="p-2 bg-white rounded border hover:bg-gray-50 transition-colors"
    >
      <div 
        className="cursor-pointer flex-1"
        onClick={() => onClick(job.id)}
      >
        <div className="text-xs font-medium text-gray-900 truncate mb-1">
          {job.clientName} - {job.title} (ID: {job.id})
        </div>
        <div className="text-xs text-gray-600 truncate mb-1">
          {job.departmentName}
        </div>
        <div className="text-xs text-gray-500 truncate mb-1">
          {job.shiftName}
        </div>
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs text-gray-500">
            Filled: 0/{job.vacancies}
          </div>
          <Badge className={`${getStatusColor(job.status)} text-xs`} variant="outline">
            {job.status}
          </Badge>
        </div>
      </div>
      
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={handleFillVacancies}
              size="sm"
              variant="outline"
              className="w-full h-6 px-2"
            >
              <Users className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Manage Vacancies</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};

export default JobCard;