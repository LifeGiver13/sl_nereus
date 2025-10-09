import React, { useState } from 'react';
import { format, eachDayOfInterval, isWeekend, startOfWeek, endOfWeek, addWeeks, subWeeks } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Job } from '@/types/job';
import { useNavigate } from 'react-router-dom';

interface JobsCalendarTableProps {
  jobs: Job[];
  currentDate: Date;
}

const JobsCalendarTable: React.FC<JobsCalendarTableProps> = ({ jobs, currentDate }) => {
  const navigate = useNavigate();
  const [currentWeekStart, setCurrentWeekStart] = useState(() => 
    startOfWeek(currentDate, { weekStartsOn: 1 })
  );

  const currentWeekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });

  const weekDays = eachDayOfInterval({ 
    start: currentWeekStart,
    end: currentWeekEnd
  });

  const goToPreviousWeek = () => {
    setCurrentWeekStart(subWeeks(currentWeekStart, 1));
  };

  const goToNextWeek = () => {
    setCurrentWeekStart(addWeeks(currentWeekStart, 1));
  };

  // Helper to check if a job is active on a given date
  const isJobActiveOnDate = (job: Job, date: Date): boolean => {
    const jobStart = new Date(job.startDate);
    jobStart.setHours(0, 0, 0, 0);
    const jobEnd = job.endDate ? new Date(job.endDate) : null;
    if (jobEnd) jobEnd.setHours(23, 59, 59, 999);
    
    const checkDate = new Date(date);
    checkDate.setHours(12, 0, 0, 0);
    
    const includeWeekends = job.body?.includeWeekends !== false;
    
    // Check if it's a weekend and weekends are excluded
    if (!includeWeekends && isWeekend(date)) {
      return false;
    }
    
    // Check if date is within job range
    return checkDate >= jobStart && (!jobEnd || checkDate <= jobEnd);
  };

  // Get placements for a specific job, vacancy, and date
  const getPlacementForVacancyAndDate = (job: Job, vacancy: number, date: Date) => {
    if (!job.placements || !isJobActiveOnDate(job, date)) return null;
    
    const dateString = format(date, 'yyyy-MM-dd');
    
    return job.placements.find(p => {
      const meta = p.meta as any;
      const shiftDate = meta?.shiftDate;
      if (!shiftDate) return false;
      
      const placementDate = new Date(shiftDate);
      placementDate.setHours(12, 0, 0, 0);
      const placementDateString = format(placementDate, 'yyyy-MM-dd');
      
      const placementVacancy = meta?.vacancy ?? 1;
      
      return placementDateString === dateString && placementVacancy === vacancy;
    });
  };

  const handleJobClick = (jobId: number) => {
    navigate(`/jobs/${jobId}`);
  };

  const VacancyCell: React.FC<{
    job: Job;
    vacancy: number;
    date: Date;
  }> = ({ job, vacancy, date }) => {
    const isActive = isJobActiveOnDate(job, date);
    const placement = getPlacementForVacancyAndDate(job, vacancy, date);
    
    if (!isActive) {
      return (
        <div className="text-xs text-muted-foreground py-4 opacity-40">
          -
        </div>
      );
    }

    if (placement && placement.user) {
      const user = placement.user as any;
      const profile = user.profile;
      const displayName = profile 
        ? `${profile.Forename || ''} ${profile.Surname || ''}`.trim() 
        : user.username || 'Unknown';

      return (
        <div 
          className="bg-green-100 dark:bg-green-900 hover:bg-green-200 dark:hover:bg-green-800 rounded-md p-2 space-y-1 border border-green-200 dark:border-green-800 cursor-pointer transition-colors"
          onClick={() => handleJobClick(job.id)}
        >
          <div className="text-xs font-semibold truncate text-green-800 dark:text-green-200" title={displayName}>
            {displayName.split(' ')[0]}
          </div>
          <div className="text-xs text-green-600 dark:text-green-400 font-medium">
            {displayName.split(' ')[1]?.charAt(0) || ''}.
          </div>
        </div>
      );
    }

    return (
      <div 
        className="bg-amber-100 dark:bg-amber-900 hover:bg-amber-200 dark:hover:bg-amber-800 rounded-md p-2 border border-amber-200 dark:border-amber-800 cursor-pointer transition-colors"
        onClick={() => handleJobClick(job.id)}
      >
        <div className="text-xs text-amber-800 dark:text-amber-200 font-medium">
          Vacant
        </div>
      </div>
    );
  };

  // Expand jobs into rows with one row per vacancy
  const jobRows = jobs.flatMap(job => {
    const vacancies = job.vacancies || 1;
    return Array.from({ length: vacancies }, (_, i) => ({
      job,
      vacancy: i + 1,
    }));
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={goToPreviousWeek}
          className="h-8"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous Week
        </Button>
        <div className="text-sm font-medium text-muted-foreground px-3">
          {format(currentWeekStart, 'MMM dd')} - {format(currentWeekEnd, 'MMM dd, yyyy')}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={goToNextWeek}
          className="h-8"
        >
          Next Week
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="sticky left-0 bg-muted/50 border-r min-w-[280px]">
                <div className="font-semibold">Job</div>
              </TableHead>
              {weekDays.map((day, index) => (
                <TableHead 
                  key={index}
                  className="text-center border-r last:border-r-0 min-w-[100px]"
                >
                  <div className="space-y-1">
                    <div className="font-semibold">{format(day, 'EEE')}</div>
                    <div className="text-xs font-normal">{format(day, 'MMM dd')}</div>
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {jobRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No jobs scheduled for this period
                </TableCell>
              </TableRow>
            ) : (
              jobRows.map((row, rowIndex) => {
                const { job, vacancy } = row;
                return (
                  <TableRow key={`${job.id}-${vacancy}`} className="hover:bg-muted/30">
                    <TableCell className="sticky left-0 bg-background border-r">
                      <div className="py-2 space-y-1">
                        <div className="font-semibold text-sm text-primary">
                          {job.clientName || 'Unknown Client'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {job.title}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {job.shiftName || 'Shift'} - Vacancy {vacancy}
                        </div>
                      </div>
                    </TableCell>
                    {weekDays.map((day, dayIndex) => (
                      <TableCell 
                        key={dayIndex} 
                        className="text-center p-2 border-r last:border-r-0"
                      >
                        <VacancyCell
                          job={job}
                          vacancy={vacancy}
                          date={day}
                        />
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default JobsCalendarTable;
