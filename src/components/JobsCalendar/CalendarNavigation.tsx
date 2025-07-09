import React from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ViewType } from '../../types/job';
import { getNavigationLabel } from '../../utils/jobsCalendarUtils';

interface CalendarNavigationProps {
  viewType: ViewType;
  onViewTypeChange: (viewType: ViewType) => void;
  onDateChange: (direction: 'next' | 'prev') => void;
  onTodayClick: () => void;
}

const CalendarNavigation: React.FC<CalendarNavigationProps> = ({
  viewType,
  onViewTypeChange,
  onDateChange,
  onTodayClick
}) => {
  const navigationLabels = getNavigationLabel(viewType);

  return (
    <div className="space-y-4">
      {/* View Type Tabs */}
      <Tabs value={viewType} onValueChange={(value) => onViewTypeChange(value as ViewType)}>
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
          onClick={() => onDateChange('prev')}
          className="flex items-center"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          {navigationLabels.prev}
        </Button>
        <Button
          variant="outline"
          onClick={onTodayClick}
          className="text-sm"
        >
          Today
        </Button>
        <Button
          variant="outline"
          onClick={() => onDateChange('next')}
          className="flex items-center"
        >
          {navigationLabels.next}
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
};

export default CalendarNavigation;