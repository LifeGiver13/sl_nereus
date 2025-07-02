
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import { API_BASE_URL } from '../config/env';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval, isSameDay, addDays, startOfMonth, endOfMonth, addMonths, subMonths, startOfDay, endOfDay, addDays as addDay, subDays, isSameMonth } from 'date-fns';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import JobSummaryModal from './JobSummaryModal';

interface Job {
  id: number;
  title: string;
  startDate: string;
  endDate: string;
  status: string;
  vacancies: number;
  clientId: number;
  clientName?: string;
  shiftId: number;
  shiftName?: string;
  body?: {
    includeWeekends?: boolean;
  };
}

type ViewType = 'daily' | 'weekly' | 'monthly';

const JobsCalendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewType, setViewType] = useState<ViewType>('weekly');
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();
  
  // Calculate date ranges based on view type
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
          start: monthStart, // Keep original month bounds for API query
          end: monthEnd,
          days: eachDayOfInterval({ start: calendarStart, end: calendarEnd })
        };
      default:
        return { start: new Date(), end: new Date(), days: [] };
    }
  };

  const { start: rangeStart, end: rangeEnd, days } = getDateRange();

  const { data: jobsData = { results: [], total: 0 }, isLoading } = useQuery({
    queryKey: ['jobs', format(rangeStart, 'yyyy-MM-dd'), format(rangeEnd, 'yyyy-MM-dd'), viewType],
    queryFn: async () => {
      const searchParams = {
        or: [
          {
            and: [
              { startDate: { lte: format(rangeEnd, 'yyyy-MM-dd') } },
              { endDate: { gte: format(rangeStart, 'yyyy-MM-dd') } }
            ]
          }
        ]
      };

      const response = await fetch(`${API_BASE_URL}/jobs?search=${encodeURIComponent(JSON.stringify(searchParams))}&expand=client,shift`);
      if (!response.ok) {
        throw new Error('Failed to fetch jobs');
      }
      return response.json();
    }
  });

  const jobs = jobsData.results || [];

  const handleDateChange = (direction: 'next' | 'prev') => {
    if (direction === 'next') {
      switch (viewType) {
        case 'daily':
          setCurrentDate(addDay(currentDate, 1));
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

  const getJobsForDay = (date: Date) => {
    const jobsForDay = [];
    
    jobs.forEach((job: Job) => {
      const jobStart = new Date(job.startDate);
      const jobEnd = new Date(job.endDate);
      const includeWeekends = job.body?.includeWeekends !== false;
      
      // Skip weekends if includeWeekends is false
      const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
      if (!includeWeekends && (dayOfWeek === 0 || dayOfWeek === 6)) {
        return;
      }
      
      // Create entries for each day the job spans
      let currentDay = jobStart;
      while (currentDay <= jobEnd) {
        if (isSameDay(currentDay, date)) {
          jobsForDay.push(job);
          break;
        }
        currentDay = addDays(currentDay, 1);
      }
    });
    
    return jobsForDay;
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'open': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  const handleAddJob = () => {
    navigate('/jobs/create');
  };

  const handleJobClick = (jobId: number) => {
    setSelectedJobId(jobId);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedJobId(null);
  };

  const getDateRangeLabel = () => {
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

  const getNavigationLabel = () => {
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

  const renderJobCard = (job: Job, day: Date) => (
    <div
      key={`${job.id}-${day.toISOString()}`}
      className="p-2 bg-gray-50 rounded border cursor-pointer hover:bg-gray-100 transition-colors"
      onClick={() => handleJobClick(job.id)}
    >
      <div className="text-xs font-medium text-gray-900 truncate mb-1">
        {job.clientName} - {job.title}
      </div>
      <div className="text-xs text-gray-600 truncate mb-1">
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

  const getGridColumns = () => {
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

  if (isLoading) {
    return (
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-[#000009]">Jobs Calendar</CardTitle>
          <CardDescription>Loading calendar...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-96">
            <div className="text-sm text-gray-500">Loading calendar...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-[#000009]">Jobs Calendar</CardTitle>
              <CardDescription>
                {getDateRangeLabel()}
              </CardDescription>
            </div>
            <Button onClick={handleAddJob} className="bg-[#712B71] hover:bg-[#712B71]/90">
              <Plus className="h-4 w-4 mr-2" />
              Add Job
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* View Type Tabs */}
            <Tabs value={viewType} onValueChange={(value) => setViewType(value as ViewType)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="daily">Daily</TabsTrigger>
                <TabsTrigger value="weekly">Weekly</TabsTrigger>
                <TabsTrigger value="monthly">Monthly</TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Navigation */}
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={() => handleDateChange('prev')}
                className="flex items-center"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                {getNavigationLabel().prev}
              </Button>
              <Button
                variant="outline"
                onClick={() => setCurrentDate(new Date())}
                className="text-sm"
              >
                Today
              </Button>
              <Button
                variant="outline"
                onClick={() => handleDateChange('next')}
                className="flex items-center"
              >
                {getNavigationLabel().next}
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>

            {/* Calendar Grid */}
            <div className={`grid ${getGridColumns()} gap-4`}>
              {days.map((day) => {
                const dayJobs = getJobsForDay(day);
                const isToday = isSameDay(day, new Date());
                const isCurrentMonth = viewType !== 'monthly' || isSameMonth(day, currentDate);
                
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
                      {isCurrentMonth && dayJobs.map((job: Job) => renderJobCard(job, day))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      <JobSummaryModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        jobId={selectedJobId}
      />
    </>
  );
};

export default JobsCalendar;
