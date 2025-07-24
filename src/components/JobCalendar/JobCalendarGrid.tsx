import React from 'react';
import { format } from 'date-fns';
import { ViewType } from '../../types/job';
import { getGridColumns, isDayToday, isDayInCurrentMonth } from '../../utils/jobsCalendarUtils';
import PlacementCard from './PlacementCard';

interface JobCalendarGridProps {
  days: Date[];
  viewType: ViewType;
  currentDate: Date;
  getPlacementsForDay: (date: Date) => any[];
  isJobDay: (date: Date) => boolean;
}

const JobCalendarGrid: React.FC<JobCalendarGridProps> = ({
  days,
  viewType,
  currentDate,
  getPlacementsForDay,
  isJobDay
}) => {
  return (
    <div className={`grid ${getGridColumns(viewType)} gap-4`}>
      {days.map((day) => {
        const dayPlacements = getPlacementsForDay(day);
        const isToday = isDayToday(day);
        const isCurrentMonth = isDayInCurrentMonth(day, currentDate, viewType);
        const isWorkingDay = isJobDay(day);
        
        return (
          <div
            key={day.toISOString()}
            className={`border rounded-lg p-3 ${
              viewType === 'daily' ? 'min-h-[400px]' : 'min-h-[150px]'
            } ${
              isToday ? 'bg-blue-50 border-blue-200' : 
              isWorkingDay ? 'bg-green-50 border-green-200' : 'bg-white'
            } ${
              !isCurrentMonth ? 'opacity-40' : ''
            }`}
          >
            <div className="font-medium text-sm mb-2">
              <div className={`${
                isToday ? 'text-blue-600' : 
                isWorkingDay ? 'text-green-600' :
                !isCurrentMonth ? 'text-gray-400' : 'text-gray-900'
              }`}>
                {viewType === 'daily' ? format(day, 'EEEE') : format(day, 'EEE')}
              </div>
              <div className={`text-lg ${
                isToday ? 'text-blue-600' : 
                isWorkingDay ? 'text-green-600' :
                !isCurrentMonth ? 'text-gray-400' : 'text-gray-900'
              }`}>
                {format(day, 'd')}
              </div>
            </div>
            
            <div className="space-y-2">
              {isCurrentMonth && isWorkingDay && (
                <>
                  {dayPlacements.map((placement) => (
                    <PlacementCard
                      key={placement.id}
                      placement={placement}
                      day={day}
                    />
                  ))}
                  {dayPlacements.length === 0 && (
                    <div className="text-xs text-gray-500 italic">
                      No placements
                    </div>
                  )}
                </>
              )}
              {!isWorkingDay && isCurrentMonth && (
                <div className="text-xs text-gray-400 italic">
                  Non-working day
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default JobCalendarGrid;