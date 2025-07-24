import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DateRangePicker } from '@/components/DateRangePicker';
import { Trash2, Plus } from 'lucide-react';
import { format, isAfter, isBefore, isEqual, parseISO } from 'date-fns';

interface AvailabilityWindow {
  startDate: string;
  endDate: string;
}

interface AvailabilityManagerProps {
  fullPlacement: boolean;
  availability: AvailabilityWindow[];
  jobStartDate: string;
  jobEndDate: string;
  onFullPlacementChange: (checked: boolean) => void;
  onAvailabilityChange: (availability: AvailabilityWindow[]) => void;
}

const AvailabilityManager: React.FC<AvailabilityManagerProps> = ({
  fullPlacement,
  availability,
  jobStartDate,
  jobEndDate,
  onFullPlacementChange,
  onAvailabilityChange
}) => {
  const [availabilityWindows, setAvailabilityWindows] = useState<AvailabilityWindow[]>(availability);

  useEffect(() => {
    setAvailabilityWindows(availability);
  }, [availability]);

  const handleFullPlacementChange = (checked: boolean) => {
    onFullPlacementChange(checked);
    
    if (checked) {
      // Set availability to full job duration
      const fullJobWindow = [{
        startDate: jobStartDate,
        endDate: jobEndDate
      }];
      setAvailabilityWindows(fullJobWindow);
      onAvailabilityChange(fullJobWindow);
    } else {
      // Clear availability when unchecking full placement
      setAvailabilityWindows([]);
      onAvailabilityChange([]);
    }
  };

  const addAvailabilityWindow = () => {
    const newWindow = {
      startDate: jobStartDate,
      endDate: jobEndDate
    };
    const updatedWindows = [...availabilityWindows, newWindow];
    setAvailabilityWindows(updatedWindows);
    onAvailabilityChange(updatedWindows);
  };

  const updateAvailabilityWindow = (index: number, range: { from: string; to: string }) => {
    const updatedWindows = availabilityWindows.map((window, i) => 
      i === index ? { startDate: range.from, endDate: range.to } : window
    );
    
    // Check for overlaps
    if (hasOverlaps(updatedWindows)) {
      // Don't update if there are overlaps - could show an error message
      return;
    }
    
    setAvailabilityWindows(updatedWindows);
    onAvailabilityChange(updatedWindows);
  };

  const removeAvailabilityWindow = (index: number) => {
    const updatedWindows = availabilityWindows.filter((_, i) => i !== index);
    setAvailabilityWindows(updatedWindows);
    onAvailabilityChange(updatedWindows);
  };

  const hasOverlaps = (windows: AvailabilityWindow[]): boolean => {
    for (let i = 0; i < windows.length; i++) {
      for (let j = i + 1; j < windows.length; j++) {
        const window1 = windows[i];
        const window2 = windows[j];
        
        const start1 = parseISO(window1.startDate);
        const end1 = parseISO(window1.endDate);
        const start2 = parseISO(window2.startDate);
        const end2 = parseISO(window2.endDate);
        
        // Check if windows overlap
        if (
          (isAfter(start1, start2) || isEqual(start1, start2)) && (isBefore(start1, end2) || isEqual(start1, end2)) ||
          (isAfter(end1, start2) || isEqual(end1, start2)) && (isBefore(end1, end2) || isEqual(end1, end2)) ||
          (isBefore(start1, start2) || isEqual(start1, start2)) && (isAfter(end1, end2) || isEqual(end1, end2))
        ) {
          return true;
        }
      }
    }
    return false;
  };

  return (
    <Card className="mt-2">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Availability</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-2">
          <Checkbox
            checked={fullPlacement}
            onCheckedChange={handleFullPlacementChange}
          />
          <label className="text-sm font-medium">Book whole job</label>
          <span className="text-xs text-muted-foreground">
            ({format(parseISO(jobStartDate), 'MMM dd')} - {format(parseISO(jobEndDate), 'MMM dd')})
          </span>
        </div>

        {!fullPlacement && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Custom Availability</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addAvailabilityWindow}
                className="h-8"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Window
              </Button>
            </div>

            {availabilityWindows.map((window, index) => (
              <div key={index} className="flex items-center space-x-2">
                <DateRangePicker
                  value={{ from: window.startDate, to: window.endDate }}
                  onChange={(range) => updateAvailabilityWindow(index, range)}
                  placeholder="Select availability window"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeAvailabilityWindow(index)}
                  className="h-8 w-8 p-0"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}

            {availabilityWindows.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No availability windows set. Click "Add Window" to specify when this candidate is available.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AvailabilityManager;