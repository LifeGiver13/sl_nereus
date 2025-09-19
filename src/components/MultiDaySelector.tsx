import React, { useState, useMemo } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format, isSameDay } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';

interface MultiDaySelectorProps {
  selectedDates: Date[];
  onDatesChange: (dates: Date[]) => void;
  availableDates: Set<string>;
  conflictingDates: Set<string>;
  job: any;
  className?: string;
}

export const MultiDaySelector: React.FC<MultiDaySelectorProps> = ({
  selectedDates,
  onDatesChange,
  availableDates,
  conflictingDates,
  job,
  className
}) => {
  const removeDate = (dateToRemove: Date) => {
    onDatesChange(selectedDates.filter(date => !isSameDay(date, dateToRemove)));
  };

  const selectedDateStrings = useMemo(() => {
    return new Set(selectedDates.map(date => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }));
  }, [selectedDates]);

  return (
    <div className={cn("space-y-4", className)}>
      <div>
        <Calendar
          mode="multiple"
          selected={selectedDates}
          onSelect={(dates) => {
            if (dates) {
              // Filter out any conflicting dates from selection and set time to 12pm
              const validDates = (Array.isArray(dates) ? dates : [dates])
                .filter(date => {
                  const year = date.getFullYear();
                  const month = String(date.getMonth() + 1).padStart(2, '0');
                  const day = String(date.getDate()).padStart(2, '0');
                  const dateStr = `${year}-${month}-${day}`;
                  return !conflictingDates.has(dateStr);
                })
                .map(date => {
                  // Set time to 12pm to avoid timezone confusion
                  const adjustedDate = new Date(date);
                  adjustedDate.setHours(12, 0, 0, 0);
                  return adjustedDate;
                });
              onDatesChange(validDates);
            } else {
              onDatesChange([]);
            }
          }}
          defaultMonth={new Date(job.startDate)}
          disabled={(date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const dateStr = `${year}-${month}-${day}`;
            
            // Parse job dates correctly to avoid timezone issues
            const jobStart = new Date(job.startDate);
            const jobEnd = new Date(job.endDate);
            
            // Reset time to compare dates only
            const dateToCheck = new Date(date.getFullYear(), date.getMonth(), date.getDate());
            const startDate = new Date(jobStart.getFullYear(), jobStart.getMonth(), jobStart.getDate());
            const endDate = new Date(jobEnd.getFullYear(), jobEnd.getMonth(), jobEnd.getDate());
            
            // Check if date is outside job range
            if (dateToCheck < startDate || dateToCheck > endDate) return true;
            
            // Check if weekends are excluded
            if (job.body?.includeWeekends === false) {
              const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
              if (dayOfWeek === 0 || dayOfWeek === 6) return true;
            }
            
            // Disable conflicting dates (occupied by other placements in this slot)
            return conflictingDates.has(dateStr);
          }}
          modifiers={{
            available: (date) => {
              const year = date.getFullYear();
              const month = String(date.getMonth() + 1).padStart(2, '0');
              const day = String(date.getDate()).padStart(2, '0');
              const dateStr = `${year}-${month}-${day}`;
              return availableDates.has(dateStr) && !conflictingDates.has(dateStr);
            },
            occupied: (date) => {
              const year = date.getFullYear();
              const month = String(date.getMonth() + 1).padStart(2, '0');
              const day = String(date.getDate()).padStart(2, '0');
              const dateStr = `${year}-${month}-${day}`;
              return conflictingDates.has(dateStr);
            }
          }}
          modifiersStyles={{
            available: { 
              backgroundColor: 'hsl(var(--primary) / 0.1)', 
              color: 'hsl(var(--primary))',
              border: '1px solid hsl(var(--primary) / 0.3)'
            },
            occupied: { 
              backgroundColor: 'hsl(var(--destructive) / 0.1)', 
              color: 'hsl(var(--destructive))',
              border: '1px solid hsl(var(--destructive) / 0.3)',
              textDecoration: 'line-through'
            }
          }}
          className={cn("p-3 pointer-events-auto")}
        />
      </div>

      {selectedDates.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-2">Selected Days ({selectedDates.length})</h4>
          <div className="flex flex-wrap gap-2">
            {selectedDates
              .sort((a, b) => a.getTime() - b.getTime())
              .map((date, index) => (
                <Badge key={index} variant="secondary" className="flex items-center gap-1">
                  {format(date, "MMM d")}
                  <button
                    onClick={() => removeDate(date)}
                    className="ml-1 hover:bg-destructive/10 rounded-full p-0.5"
                    type="button"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};