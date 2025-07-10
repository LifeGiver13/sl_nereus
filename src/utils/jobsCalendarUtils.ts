import { format, isSameDay, isSameMonth } from 'date-fns';
import { Job, ViewType } from '../types/job';

export const getJobsForDay = (jobs: Job[], date: Date) => {
  const jobsForDay = [];
  
  jobs.forEach((job: Job) => {
    const jobStart = new Date(job.startDate);
    const jobEnd = job.endDate ? new Date(job.endDate) : null;
    const includeWeekends = job.body?.includeWeekends !== false;
    
    // Skip weekends if includeWeekends is false
    const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
    if (!includeWeekends && (dayOfWeek === 0 || dayOfWeek === 6)) {
      return;
    }
    
    // Check if the date falls within the job's range
    // Job starts on or before this date AND (job has no end date OR job ends on or after this date)
    if (jobStart <= date && (!jobEnd || jobEnd >= date)) {
      jobsForDay.push(job);
    }
  });
  
  return jobsForDay;
};

export const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'open': return 'bg-green-100 text-green-800';
    case 'closed': return 'bg-red-100 text-red-800';
    case 'cancelled': return 'bg-gray-100 text-gray-800';
    default: return 'bg-blue-100 text-blue-800';
  }
};

export const getDateRangeLabel = (viewType: ViewType, currentDate: Date, rangeStart: Date, rangeEnd: Date) => {
  switch (viewType) {
    case 'daily':
      return format(currentDate, 'EEEE, MMMM dd, yyyy');
    case 'weekly':
      return `Week of ${format(rangeStart, 'MMM dd')} - ${format(rangeEnd, 'MMM dd, yyyy')}`;
    case 'monthly':
      return format(currentDate, 'MMMM yyyy');
    default:
      return '';
  }
};

export const getNavigationLabel = (viewType: ViewType) => {
  switch (viewType) {
    case 'daily':
      return { prev: 'Previous Day', next: 'Next Day' };
    case 'weekly':
      return { prev: 'Previous Week', next: 'Next Week' };
    case 'monthly':
      return { prev: 'Previous Month', next: 'Next Month' };
    default:
      return { prev: 'Previous', next: 'Next' };
  }
};

export const getGridColumns = (viewType: ViewType) => {
  switch (viewType) {
    case 'daily':
      return 'grid-cols-1';
    case 'weekly':
      return 'grid-cols-7';
    case 'monthly':
      return 'grid-cols-7';
    default:
      return 'grid-cols-7';
  }
};

export const isDayToday = (day: Date) => isSameDay(day, new Date());
export const isDayInCurrentMonth = (day: Date, currentDate: Date, viewType: ViewType) => 
  viewType !== 'monthly' || isSameMonth(day, currentDate);