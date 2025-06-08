
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { API_BASE_URL } from '../config/env';
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';

interface Job {
  id: number;
  title: string;
  startDate: string;
  endDate: string;
  status: string;
}

const JobsCalendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const startDate = startOfMonth(currentDate);
  const endDate = endOfMonth(currentDate);

  const { data: jobsData = { results: [], total: 0 }, isLoading } = useQuery({
    queryKey: ['calendar-jobs', format(startDate, 'yyyy-MM-dd'), format(endDate, 'yyyy-MM-dd')],
    queryFn: async () => {
      const searchParams = {
        startDate: {
          gte: format(startDate, 'yyyy-MM-dd')
        },
        endDate: {
          lte: format(endDate, 'yyyy-MM-dd')
        }
      };

      const response = await fetch(`${API_BASE_URL}/jobs?search=${encodeURIComponent(JSON.stringify(searchParams))}`);
      if (!response.ok) {
        throw new Error('Failed to fetch jobs');
      }
      return response.json();
    }
  });

  const jobs = jobsData.results || [];

  const handleMonthChange = (direction: 'next' | 'prev') => {
    if (direction === 'next') {
      setCurrentDate(addMonths(currentDate, 1));
    } else {
      setCurrentDate(subMonths(currentDate, 1));
    }
  };

  const getJobsForDate = (date: Date) => {
    return jobs.filter((job: Job) => {
      const jobStart = new Date(job.startDate);
      const jobEnd = new Date(job.endDate);
      return date >= jobStart && date <= jobEnd;
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'open': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  if (isLoading) {
    return (
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-[#000009]">Jobs Calendar</CardTitle>
          <CardDescription>View jobs by month</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48">
            <div className="text-sm text-gray-500">Loading calendar...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="text-[#000009]">Jobs Calendar</CardTitle>
        <CardDescription>View jobs scheduled for {format(currentDate, 'MMMM yyyy')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => handleMonthChange('prev')}
              className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
            >
              Previous
            </button>
            <h3 className="font-medium">{format(currentDate, 'MMMM yyyy')}</h3>
            <button
              onClick={() => handleMonthChange('next')}
              className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
            >
              Next
            </button>
          </div>

          <Calendar
            mode="single"
            selected={undefined}
            month={currentDate}
            onMonthChange={setCurrentDate}
            className="rounded-md border"
          />

          <div className="space-y-2">
            <h4 className="font-medium text-sm">Jobs in {format(currentDate, 'MMMM yyyy')}</h4>
            {jobs.length === 0 ? (
              <p className="text-sm text-gray-500">No jobs scheduled for this month.</p>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {jobs.map((job: Job) => (
                  <div key={job.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{job.title}</p>
                      <p className="text-xs text-gray-500">
                        {format(new Date(job.startDate), 'MMM dd')} - {format(new Date(job.endDate), 'MMM dd')}
                      </p>
                    </div>
                    <Badge className={getStatusColor(job.status)} variant="outline">
                      {job.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default JobsCalendar;
