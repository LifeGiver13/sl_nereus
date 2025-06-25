import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { API_BASE_URL } from '../config/env';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval, isSameDay, addDays } from 'date-fns';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Job {
  id: number;
  title: string;
  startDate: string;
  endDate: string;
  status: string;
}

const JobsCalendar = () => {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const navigate = useNavigate();
  
  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 }); // Start week on Monday
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const { data: jobsData = { results: [], total: 0 }, isLoading } = useQuery({
    queryKey: ['weekly-jobs', format(weekStart, 'yyyy-MM-dd'), format(weekEnd, 'yyyy-MM-dd')],
    queryFn: async () => {
      // Search for jobs that overlap with the current week
      // A job overlaps if: startDate <= weekEnd AND endDate >= weekStart
      const searchParams = {
        or: [
          {
            and: [
              { startDate: { lte: format(weekEnd, 'yyyy-MM-dd') } },
              { endDate: { gte: format(weekStart, 'yyyy-MM-dd') } }
            ]
          }
        ]
      };

      console.log('Search parameters:', searchParams);
      console.log('Week range:', format(weekStart, 'yyyy-MM-dd'), 'to', format(weekEnd, 'yyyy-MM-dd'));

      const response = await fetch(`${API_BASE_URL}/jobs?search=${encodeURIComponent(JSON.stringify(searchParams))}`);
      if (!response.ok) {
        throw new Error('Failed to fetch jobs');
      }
      return response.json();
    }
  });

  const jobs = jobsData.results || [];

  const handleWeekChange = (direction: 'next' | 'prev') => {
    if (direction === 'next') {
      setCurrentWeek(addWeeks(currentWeek, 1));
    } else {
      setCurrentWeek(subWeeks(currentWeek, 1));
    }
  };

  const getJobsForDay = (date: Date) => {
    const jobsForDay = [];
    
    jobs.forEach((job: Job) => {
      const jobStart = new Date(job.startDate);
      const jobEnd = new Date(job.endDate);
      
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

  if (isLoading) {
    return (
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-[#000009]">Weekly Jobs Calendar</CardTitle>
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
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-[#000009]">Weekly Jobs Calendar</CardTitle>
            <CardDescription>
              Week of {format(weekStart, 'MMM dd')} - {format(weekEnd, 'MMM dd, yyyy')}
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
          {/* Week Navigation */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => handleWeekChange('prev')}
              className="flex items-center"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous Week
            </Button>
            <Button
              variant="outline"
              onClick={() => setCurrentWeek(new Date())}
              className="text-sm"
            >
              Today
            </Button>
            <Button
              variant="outline"
              onClick={() => handleWeekChange('next')}
              className="flex items-center"
            >
              Next Week
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>

          {/* Weekly Grid */}
          <div className="grid grid-cols-7 gap-4">
            {weekDays.map((day) => {
              const dayJobs = getJobsForDay(day);
              const isToday = isSameDay(day, new Date());
              
              return (
                <div
                  key={day.toISOString()}
                  className={`border rounded-lg p-3 min-h-[200px] ${
                    isToday ? 'bg-blue-50 border-blue-200' : 'bg-white'
                  }`}
                >
                  <div className="font-medium text-sm mb-2">
                    <div className={`${isToday ? 'text-blue-600' : 'text-gray-900'}`}>
                      {format(day, 'EEE')}
                    </div>
                    <div className={`text-lg ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>
                      {format(day, 'd')}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    {dayJobs.map((job: Job) => (
                      <div
                        key={`${job.id}-${day.toISOString()}`}
                        className="p-2 bg-gray-50 rounded border cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => navigate(`/job/${job.id}`)}
                      >
                        <div className="text-xs font-medium text-gray-900 truncate">
                          {job.title}
                        </div>
                        <Badge className={`${getStatusColor(job.status)} text-xs`} variant="outline">
                          {job.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default JobsCalendar;
