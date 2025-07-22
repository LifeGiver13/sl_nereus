import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Job } from '../../types/job';
import { getStatusColor } from '../../utils/jobsCalendarUtils';

interface JobCardProps {
  job: Job;
  day: Date;
  onClick: (jobId: number) => void;
}

const JobCard: React.FC<JobCardProps> = ({ job, day, onClick }) => {
  return (
    <div
      key={`${job.id}-${day.toISOString()}`}
      className="p-2 bg-gray-50 rounded border cursor-pointer hover:bg-gray-100 transition-colors"
      onClick={() => onClick(job.id)}
    >
      <div className="text-xs font-medium text-gray-900 truncate mb-1">
        {job.clientName} - {job.title}
      </div>
      <div className="text-xs text-gray-600 truncate mb-1">
        {job.departmentName}
      </div>
      <div className="text-xs text-gray-500 truncate mb-1">
        {job.shiftName}
      </div>
      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-500">
          Filled: 0/{job.vacancies}
        </div>
        <Badge className={`${getStatusColor(job.status)} text-xs`} variant="outline">
          {job.status}
        </Badge>
      </div>
    </div>
  );
};

export default JobCard;