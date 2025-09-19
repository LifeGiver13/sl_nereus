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
  jobStartDate: string;
  jobEndDate: string;
  includeWeekends?: boolean;
  className?: string;
}

export const MultiDaySelector: React.FC<MultiDaySelectorProps> = ({
  selectedDates,
  onDatesChange,
  availableDates,
  conflictingDates,
  jobStartDate,
  jobEndDate,
  includeWeekends = true,
  className
}) => {
  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    // Don't allow selection of conflicting dates
    if (conflictingDates.has(dateStr)) return;

    // Check if date is already selected
    const isSelected = selectedDates.some(selectedDate => isSameDay(selectedDate, date));
    
    if (isSelected) {
      // Remove the date
      onDatesChange(selectedDates.filter(selectedDate => !isSameDay(selectedDate, date)));
    } else {
      // Add the date
      onDatesChange([...selectedDates, date]);
    }
  };

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
          mode="single"
          selected={undefined}
          onSelect={handleDateSelect}
          disabled={(date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const dateStr = `${year}-${month}-${day}`;
            const jobStart = new Date(jobStartDate + 'T00:00:00');
            const jobEnd = new Date(jobEndDate + 'T00:00:00');
            
            // Check if date is outside job range
            if (date < jobStart || date > jobEnd) return true;
            
            // Check if weekends are excluded
            if (!includeWeekends) {
              const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
              if (dayOfWeek === 0 || dayOfWeek === 6) return true;
            }
            
            // Check for conflicting dates
            return conflictingDates.has(dateStr);
          }}
          modifiers={{
            available: (date) => {
              const year = date.getFullYear();
              const month = String(date.getMonth() + 1).padStart(2, '0');
              const day = String(date.getDate()).padStart(2, '0');
              const dateStr = `${year}-${month}-${day}`;
              return availableDates.has(dateStr);
            },
            conflicting: (date) => {
              const year = date.getFullYear();
              const month = String(date.getMonth() + 1).padStart(2, '0');
              const day = String(date.getDate()).padStart(2, '0');
              const dateStr = `${year}-${month}-${day}`;
              return conflictingDates.has(dateStr);
            },
            selected: (date) => {
              const year = date.getFullYear();
              const month = String(date.getMonth() + 1).padStart(2, '0');
              const day = String(date.getDate()).padStart(2, '0');
              const dateStr = `${year}-${month}-${day}`;
              return selectedDateStrings.has(dateStr);
            }
          }}
          modifiersStyles={{
            available: { backgroundColor: 'hsl(var(--primary) / 0.2)', color: 'hsl(var(--primary))' },
            conflicting: { backgroundColor: 'hsl(var(--destructive) / 0.2)', color: 'hsl(var(--destructive))' },
            selected: { backgroundColor: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }
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