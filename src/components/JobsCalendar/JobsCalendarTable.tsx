// Jobs Calendar Table Component - Updated with view toggle
import React, { useState } from 'react';
import { format, eachDayOfInterval, isWeekend, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { ChevronLeft, ChevronRight, CalendarDays, Calendar } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Job, ViewType } from '@/types/job';
import { useNavigate } from 'react-router-dom';
import JobSummaryModal from '../JobSummaryModal';

interface JobsCalendarTableProps {
  jobs: Job[];
  currentDate: Date;
  viewType: ViewType;
  setViewType: (newViewType: ViewType) => void;
  handleDateChange: (direction: 'next' | 'prev') => void;
}

const JobsCalendarTable: React.FC<JobsCalendarTableProps> = ({ 
  jobs, 
  currentDate, 
  viewType,
  setViewType,
  handleDateChange 
}) => {
  const navigate = useNavigate();
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [selectedPlacement, setSelectedPlacement] = useState<any>(null);
  
  // Calculate date range based on view type
  const rangeStart = viewType === 'weekly' 
    ? startOfWeek(currentDate, { weekStartsOn: 1 })
    : startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 });
    
  const rangeEnd = viewType === 'weekly'
    ? endOfWeek(currentDate, { weekStartsOn: 1 })
    : endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 });

  const displayDays = eachDayOfInterval({ 
    start: rangeStart,
    end: rangeEnd
  });

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
      
      // Filter out declined placements - position needs to be refilled
      const isDeclined = p.status === 'declined';
      
      return placementDateString === dateString && 
             placementVacancy === vacancy && 
             !isDeclined;
    });
  };

  const handleJobCellClick = (jobId: number) => {
    setSelectedJobId(jobId);
    setSelectedPlacement(null);
  };

  const handlePlacementClick = (jobId: number, placement: any, date: Date) => {
    setSelectedJobId(jobId);
    setSelectedPlacement({ ...placement, clickedDate: date });
  };

  const handleVacantClick = (jobId: number) => {
    navigate(`/job/${jobId}`);
  };

  const VacancyCell: React.FC<{
    job: Job;
    vacancies: number[];
    date: Date;
  }> = ({ job, vacancies, date }) => {
    const isActive = isJobActiveOnDate(job, date);
    
    if (!isActive) {
      return (
        <div className="text-xs text-muted-foreground py-4 opacity-40">
          -
        </div>
      );
    }

    // Get placements for all vacancies on this date
    const placementsForDate = vacancies.map(vacancy => ({
      vacancy,
      placement: getPlacementForVacancyAndDate(job, vacancy, date)
    }));

    // Separate filled and vacant slots
    const filledSlots = placementsForDate.filter(p => p.placement && p.placement.user);
    const vacantSlots = placementsForDate.filter(p => !p.placement || !p.placement.user);

    // Helper function to get status color
    const getStatusColor = (status: string) => {
      switch (status?.toLowerCase()) {
        case 'accepted': 
        case 'awaiting_confirmation': 
          return 'bg-green-100 dark:bg-green-900 hover:bg-green-200 dark:hover:bg-green-800 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200';
        case 'cancelled': 
          return 'bg-red-100 dark:bg-red-900 hover:bg-red-200 dark:hover:bg-red-800 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200';
        case 'absent_explained':
        case 'absent_unexplained':
          return 'bg-purple-100 dark:bg-purple-900 hover:bg-purple-200 dark:hover:bg-purple-800 border-purple-200 dark:border-purple-800 text-purple-800 dark:text-purple-200';
        case 'completed':
          return 'bg-blue-100 dark:bg-blue-900 hover:bg-blue-200 dark:hover:bg-blue-800 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200';
        default: 
          return 'bg-green-100 dark:bg-green-900 hover:bg-green-200 dark:hover:bg-green-800 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200';
      }
    };

    return (
      <div className="space-y-1">
        {filledSlots.map(({ placement }) => {
          const user = placement!.user as any;
          const profile = user.profile;
          const displayName = profile 
            ? `${profile.Forename || ''} ${profile.Surname || ''}`.trim() 
            : user.username || 'Unknown';
          
          const statusColorClass = getStatusColor(placement!.status);

          return (
            <div 
              key={`${placement!.id}`}
              className={`${statusColorClass} rounded-md p-1.5 border cursor-pointer transition-colors`}
              onClick={(e) => {
                e.stopPropagation();
                handlePlacementClick(job.id, placement, date);
              }}
            >
              <div className="text-xs font-semibold truncate" title={displayName}>
                {displayName.split(' ')[0]} {displayName.split(' ')[1]?.charAt(0) || ''}.
              </div>
            </div>
          );
        })}
        {vacantSlots.map(({ vacancy }) => (
          <div 
            key={`vacant-${vacancy}`}
            className="bg-amber-100 dark:bg-amber-900 hover:bg-amber-200 dark:hover:bg-amber-800 rounded-md p-1.5 border border-amber-200 dark:border-amber-800 cursor-pointer transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              handleVacantClick(job.id);
            }}
          >
            <div className="text-xs text-amber-800 dark:text-amber-200 font-medium">
              Vacant
            </div>
          </div>
        ))}
      </div>
    );
  };

  const selectedJob = selectedJobId ? jobs.find(j => j.id === selectedJobId) : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <ToggleGroup type="single" value={viewType} onValueChange={(value) => value && setViewType(value as ViewType)}>
          <ToggleGroupItem value="weekly" aria-label="Week view">
            <CalendarDays className="h-4 w-4 mr-2" />
            Week
          </ToggleGroupItem>
          <ToggleGroupItem value="monthly" aria-label="Month view">
            <Calendar className="h-4 w-4 mr-2" />
            Month
          </ToggleGroupItem>
        </ToggleGroup>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDateChange('prev')}
            className="h-8"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous {viewType === 'weekly' ? 'Week' : 'Month'}
          </Button>
          <div className="text-sm font-medium text-muted-foreground px-3 min-w-[200px] text-center">
            {format(rangeStart, 'MMM dd')} - {format(rangeEnd, 'MMM dd, yyyy')}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDateChange('next')}
            className="h-8"
          >
            Next {viewType === 'weekly' ? 'Week' : 'Month'}
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="w-32" /> {/* Spacer for alignment */}
      </div>

      <div className="rounded-md border">
        <div className="overflow-x-auto" style={{ maxWidth: 'calc(100vw - 18rem)' }}>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="sticky left-0 bg-muted/50 border-r min-w-[280px] z-20">
                <div className="font-semibold">Job</div>
              </TableHead>
              {displayDays.map((day, index) => (
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
            {jobs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={displayDays.length + 1} className="text-center py-8 text-muted-foreground">
                  No jobs scheduled for this period
                </TableCell>
              </TableRow>
            ) : (
              jobs.map((job) => {
                const vacancyCount = job.vacancies || 1;
                const vacancies = Array.from({ length: vacancyCount }, (_, i) => i + 1);
                
                return (
                  <TableRow key={job.id} className="hover:bg-muted/30">
                    <TableCell 
                      className="sticky left-0 bg-background border-r cursor-pointer z-10"
                      onClick={() => handleJobCellClick(job.id)}
                    >
                      <div className="py-2 space-y-1 min-w-[250px]">
                        <div className="font-semibold text-sm text-primary">
                          {job.clientName || 'Unknown Client'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {job.title}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="text-xs text-muted-foreground">
                            {job.shiftName || 'Shift'} ({vacancyCount} {vacancyCount === 1 ? 'vacancy' : 'vacancies'})
                          </div>
                          {job.departmentName && (
                            <Badge variant="outline" className="text-xs">
                              {job.departmentName}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    {displayDays.map((day, dayIndex) => (
                      <TableCell 
                        key={dayIndex} 
                        className="text-center p-2 border-r last:border-r-0 align-top"
                      >
                        <VacancyCell
                          job={job}
                          vacancies={vacancies}
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

      <JobSummaryModal
        jobId={selectedJobId}
        placement={selectedPlacement}
        isOpen={!!selectedJobId}
        onClose={() => {
          setSelectedJobId(null);
          setSelectedPlacement(null);
        }}
      />
    </div>
  );
};

export default JobsCalendarTable;
