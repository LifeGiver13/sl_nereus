import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useJobsCalendar } from '../../hooks/useJobsCalendar';
import { getDateRangeLabel } from '../../utils/jobsCalendarUtils';
import CalendarNavigation from './CalendarNavigation';
import CalendarGrid from './CalendarGrid';
import JobSummaryModal from '../JobSummaryModal';

const JobsCalendar = () => {
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();
  
  const {
    currentDate,
    setCurrentDate,
    viewType,
    setViewType,
    rangeStart,
    rangeEnd,
    days,
    jobs,
    isLoading,
    handleDateChange
  } = useJobsCalendar();

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

  const handleTodayClick = () => {
    setCurrentDate(new Date());
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
                {getDateRangeLabel(viewType, currentDate, rangeStart, rangeEnd)}
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
            <CalendarNavigation
              viewType={viewType}
              onViewTypeChange={setViewType}
              onDateChange={handleDateChange}
              onTodayClick={handleTodayClick}
            />

            <CalendarGrid
              days={days}
              jobs={jobs}
              viewType={viewType}
              currentDate={currentDate}
              onJobClick={handleJobClick}
            />
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