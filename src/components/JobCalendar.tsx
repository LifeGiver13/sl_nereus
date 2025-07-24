import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { useJobCalendar } from '../hooks/useJobCalendar';
import { getDateRangeLabel } from '../utils/jobsCalendarUtils';
import CalendarNavigation from './JobsCalendar/CalendarNavigation';
import JobCalendarGrid from './JobCalendar/JobCalendarGrid';

interface JobCalendarProps {
  job: {
    id: number;
    title: string;
    startDate: string;
    endDate: string;
    body?: {
      includeWeekends?: boolean;
    };
  };
  placements: Array<{
    id: number;
    userId: number;
    user: {
      profile?: {
        Forename?: string;
        Surname?: string;
      };
      username?: string;
    };
    status: string;
    confirmed: boolean;
  }>;
}

const JobCalendar: React.FC<JobCalendarProps> = ({ job, placements }) => {
  const {
    currentDate,
    viewType,
    setViewType,
    rangeStart,
    rangeEnd,
    days,
    handleDateChange,
    handleTodayClick,
    getPlacementsForDay,
    isJobDay
  } = useJobCalendar({ job, placements });

  const startDate = new Date(job.startDate);
  const endDate = new Date(job.endDate);
  const includeWeekends = job.body?.includeWeekends !== false;
  
  // Calculate total working days
  const totalWorkingDays = days.filter(day => isJobDay(day)).length;
  const confirmedPlacements = placements.filter(p => p.confirmed);

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-[#000009]">Job Schedule</CardTitle>
            <p className="text-sm text-muted-foreground">
              {getDateRangeLabel(viewType, currentDate, rangeStart, rangeEnd)}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="text-xs">
              {format(startDate, 'MMM dd')} - {format(endDate, 'MMM dd, yyyy')}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {confirmedPlacements.length} placed
            </Badge>
            {!includeWeekends && (
              <Badge variant="outline" className="text-xs">
                Weekends excluded
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <CalendarNavigation
            viewType={viewType}
            onViewTypeChange={setViewType}
            onDateChange={handleDateChange}
            onTodayClick={handleTodayClick}
          />

          <JobCalendarGrid
            days={days}
            viewType={viewType}
            currentDate={currentDate}
            getPlacementsForDay={getPlacementsForDay}
            isJobDay={isJobDay}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default JobCalendar;