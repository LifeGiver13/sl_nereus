import { useState, useEffect } from 'react';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval, addDays, startOfMonth, endOfMonth, addMonths, subMonths, startOfDay, endOfDay, subDays } from 'date-fns';
import { ViewType } from '../types/job';

interface JobCalendarHookProps {
  job: {
    id: number;
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

export const useJobCalendar = ({ job, placements }: JobCalendarHookProps) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewType, setViewType] = useState<ViewType>('weekly');
  
  // Initialize current date to job start date if it's in the future
  useEffect(() => {
    const jobStart = new Date(job.startDate);
    if (jobStart > new Date()) {
      setCurrentDate(jobStart);
    }
  }, [job.startDate]);

  const getDateRange = () => {
    switch (viewType) {
      case 'daily':
        return {
          start: startOfDay(currentDate),
          end: endOfDay(currentDate),
          days: [currentDate]
        };
      case 'weekly':
        const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
        return {
          start: weekStart,
          end: weekEnd,
          days: eachDayOfInterval({ start: weekStart, end: weekEnd })
        };
      case 'monthly':
        const monthStart = startOfMonth(currentDate);
        const monthEnd = endOfMonth(currentDate);
        const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
        const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
        return {
          start: monthStart,
          end: monthEnd,
          days: eachDayOfInterval({ start: calendarStart, end: calendarEnd })
        };
      default:
        return { start: new Date(), end: new Date(), days: [] };
    }
  };

  const { start: rangeStart, end: rangeEnd, days } = getDateRange();

  const handleDateChange = (direction: 'next' | 'prev') => {
    let newDate = currentDate;
    if (direction === 'next') {
      switch (viewType) {
        case 'daily':
          newDate = addDays(currentDate, 1);
          break;
        case 'weekly':
          newDate = addWeeks(currentDate, 1);
          break;
        case 'monthly':
          newDate = addMonths(currentDate, 1);
          break;
      }
    } else {
      switch (viewType) {
        case 'daily':
          newDate = subDays(currentDate, 1);
          break;
        case 'weekly':
          newDate = subWeeks(currentDate, 1);
          break;
        case 'monthly':
          newDate = subMonths(currentDate, 1);
          break;
      }
    }
    setCurrentDate(newDate);
  };

  const handleTodayClick = () => {
    setCurrentDate(new Date());
  };

  const getPlacementsForDay = (date: Date) => {
    const jobStart = new Date(job.startDate);
    const jobEnd = new Date(job.endDate);
    const includeWeekends = job.body?.includeWeekends !== false;
    
    // Skip weekends if includeWeekends is false
    const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
    if (!includeWeekends && (dayOfWeek === 0 || dayOfWeek === 6)) {
      return [];
    }
    
    // Only return placements if date is within job range
    if (date >= jobStart && date <= jobEnd) {
      return placements.filter(p => p.confirmed); // Only show confirmed placements
    }
    
    return [];
  };

  const isJobDay = (date: Date) => {
    const jobStart = new Date(job.startDate);
    const jobEnd = new Date(job.endDate);
    const includeWeekends = job.body?.includeWeekends !== false;
    
    // Skip weekends if includeWeekends is false
    const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
    if (!includeWeekends && (dayOfWeek === 0 || dayOfWeek === 6)) {
      return false;
    }
    
    return date >= jobStart && date <= jobEnd;
  };

  return {
    currentDate,
    setCurrentDate,
    viewType,
    setViewType,
    rangeStart,
    rangeEnd,
    days,
    handleDateChange,
    handleTodayClick,
    getPlacementsForDay,
    isJobDay
  };
};