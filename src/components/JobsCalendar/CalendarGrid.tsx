import React from 'react';
import { format } from 'date-fns';
import { Job, ViewType } from '../../types/job';
import { getJobsForDay, getGridColumns, isDayToday, isDayInCurrentMonth } from '../../utils/jobsCalendarUtils';
import JobCard from './JobCard';

interface CalendarGridProps {
  days: Date[];
  jobs: Job[];
  viewType: ViewType;
  currentDate: Date;
  onJobClick: (jobId: number) => void;
}

const CalendarGrid: React.FC<CalendarGridProps> = ({
  days,
  jobs,
  viewType,
  currentDate,
  onJobClick
}) => {
  return (
    <div className={`grid ${getGridColumns(viewType)} gap-4`}>
      {days.map((day) => {
        const dayJobs = getJobsForDay(jobs, day);
        const isToday = isDayToday(day);
        const isCurrentMonth = isDayInCurrentMonth(day, currentDate, viewType);
        
        return (
          <div
            key={day.toISOString()}
            className={`border rounded-lg p-3 ${
              viewType === 'daily' ? 'min-h-[400px]' : 'min-h-[150px]'
            } ${
              isToday ? 'bg-blue-50 border-blue-200' : 'bg-white'
            } ${
              !isCurrentMonth ? 'opacity-40' : ''
            }`}
          >
            <div className="font-medium text-sm mb-2">
              <div className={`${
                isToday ? 'text-blue-600' : 
                !isCurrentMonth ? 'text-gray-400' : 'text-gray-900'
              }`}>
                {viewType === 'daily' ? format(day, 'EEEE') : format(day, 'EEE')}
              </div>
              <div className={`text-lg ${
                isToday ? 'text-blue-600' : 
                !isCurrentMonth ? 'text-gray-400' : 'text-gray-900'
              }`}>
                {format(day, 'd')}
              </div>
            </div>
            
            <div className="space-y-2">
              {isCurrentMonth && dayJobs.map((job: Job) => (
                <JobCard
                  key={`${job.id}-${day.toISOString()}`}
                  job={job}
                  day={day}
                  onClick={onJobClick}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default CalendarGrid;