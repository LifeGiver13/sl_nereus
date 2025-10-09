import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useJobsCalendar } from '../../hooks/useJobsCalendar';
import { useDepartments } from '../../hooks/useDepartments';
import JobsCalendarTable from './JobsCalendarTable';

const JobsCalendar = () => {
  const navigate = useNavigate();
  
  const {
    currentDate,
    viewType,
    setViewType,
    handleDateChange,
    jobs,
    isLoading,
    selectedDepartmentId,
    setSelectedDepartmentId
  } = useJobsCalendar();
  
  const { departments } = useDepartments();

  const handleAddJob = () => {
    navigate('/jobs/create');
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
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-[#000009]">Jobs Calendar</CardTitle>
            <CardDescription>
              Weekly view of all active jobs and placements
            </CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <Select
              value={selectedDepartmentId?.toString() || "all"}
              onValueChange={(value) => setSelectedDepartmentId(value === "all" ? null : parseInt(value))}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((department) => (
                  <SelectItem key={department.id} value={department.id.toString()}>
                    {department.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleAddJob} className="bg-[#712B71] hover:bg-[#712B71]/90">
              <Plus className="h-4 w-4 mr-2" />
              Add Job
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <JobsCalendarTable
          jobs={jobs || []}
          currentDate={currentDate}
          viewType={viewType}
          setViewType={setViewType}
          handleDateChange={handleDateChange}
        />
      </CardContent>
    </Card>
  );
};

export default JobsCalendar;