import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval, addDays, startOfMonth, endOfMonth, addMonths, subMonths, startOfDay, endOfDay, subDays } from 'date-fns';
import { apiRequest } from '@/lib/utils';
import { ViewType } from '../types/job';
import { useDepartments } from './useDepartments';

export const useJobsCalendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewType, setViewType] = useState<ViewType>('weekly');
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<number | null>(null);
  
  const { getDepartmentName, isLoading: isDepartmentsLoading } = useDepartments();

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

  const { data: jobsData = { results: [], total: 0 }, isLoading } = useQuery({
    queryKey: ['jobs', format(rangeStart, 'yyyy-MM-dd'), format(rangeEnd, 'yyyy-MM-dd'), viewType, selectedDepartmentId],
    queryFn: async () => {
      const searchParams = {
        or: [
          {
            and: [
              { startDate: { lte: format(rangeEnd, 'yyyy-MM-dd') } },
              {
                or: [
                  { endDate: { gte: format(rangeStart, 'yyyy-MM-dd') } },
                  { endDate: null }
                ]
              },
              ...(selectedDepartmentId ? [{ departmentId: selectedDepartmentId }] : [])
            ]
          }
        ]
      };

      const response = await apiRequest(`/jobs?search=${encodeURIComponent(JSON.stringify(searchParams))}&expand=client,shift`);
      if (!response.ok) {
        throw new Error('Failed to fetch jobs');
      }
      return response.json();
    }
  });
  
  // Add department names to jobs - only if departments are loaded
  const jobsWithDepartments = jobsData.results?.map(job => ({
    ...job,
    clientName: job.client?.name,
    shiftName: job.shift?.name,
    departmentName: !isDepartmentsLoading ? getDepartmentName(job.departmentId) : 'Loading...'
  })) || [];

  const handleDateChange = (direction: 'next' | 'prev') => {
    if (direction === 'next') {
      switch (viewType) {
        case 'daily':
          setCurrentDate(addDays(currentDate, 1));
          break;
        case 'weekly':
          setCurrentDate(addWeeks(currentDate, 1));
          break;
        case 'monthly':
          setCurrentDate(addMonths(currentDate, 1));
          break;
      }
    } else {
      switch (viewType) {
        case 'daily':
          setCurrentDate(subDays(currentDate, 1));
          break;
        case 'weekly':
          setCurrentDate(subWeeks(currentDate, 1));
          break;
        case 'monthly':
          setCurrentDate(subMonths(currentDate, 1));
          break;
      }
    }
  };

  return {
    currentDate,
    setCurrentDate,
    viewType,
    setViewType,
    rangeStart,
    rangeEnd,
    days,
    jobs: jobsWithDepartments,
    isLoading: isLoading || isDepartmentsLoading,
    handleDateChange,
    selectedDepartmentId,
    setSelectedDepartmentId
  };
};