import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format, eachDayOfInterval, isWeekend } from 'date-fns';

interface JobCalendarProps {
  job: {
    id: number;
    title: string;
    startDate: string;
    endDate: string;
    body?: {
      includeWeekends?: boolean;
    };
  };
  placements: Array<{
    id: number;
    userId: number;
    user: {
      profile?: {
        Forename?: string;
        Surname?: string;
      };
      username?: string;
    };
    status: string;
    confirmed: boolean;
  }>;
}

const JobCalendar: React.FC<JobCalendarProps> = ({ job, placements }) => {
  const startDate = new Date(job.startDate);
  const endDate = new Date(job.endDate);
  const includeWeekends = job.body?.includeWeekends || false;
  
  // Generate all days in the job range
  const allDays = eachDayOfInterval({ start: startDate, end: endDate });
  
  // Filter out weekends if not included
  const jobDays = includeWeekends ? allDays : allDays.filter(day => !isWeekend(day));
  
  // Get candidate name from placement
  const getCandidateName = (placement: any) => {
    const profile = placement.user?.profile;
    if (profile?.Forename && profile?.Surname) {
      return `${profile.Forename} ${profile.Surname}`;
    }
    return placement.user?.username || `User ${placement.userId}`;
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'accepted': return 'bg-green-100 text-green-800 border-green-300';
      case 'awaiting_confirmation': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-300';
      case 'completed': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'cancelled': return 'bg-gray-100 text-gray-800 border-gray-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  // Group days by weeks for better display
  const groupDaysByWeek = (days: Date[]) => {
    const weeks: Date[][] = [];
    let currentWeek: Date[] = [];
    
    days.forEach((day, index) => {
      const dayOfWeek = day.getDay();
      
      // Start new week on Monday (1) or if it's the first day
      if (dayOfWeek === 1 || index === 0) {
        if (currentWeek.length > 0) {
          weeks.push(currentWeek);
        }
        currentWeek = [];
      }
      
      currentWeek.push(day);
    });
    
    if (currentWeek.length > 0) {
      weeks.push(currentWeek);
    }
    
    return weeks;
  };

  const weeks = groupDaysByWeek(jobDays);

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="text-[#000009]">Job Schedule</CardTitle>
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {format(startDate, 'PPP')} - {format(endDate, 'PPP')}
          </p>
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="text-xs">
              {jobDays.length} working days
            </Badge>
            {!includeWeekends && (
              <Badge variant="outline" className="text-xs">
                Weekends excluded
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="grid grid-cols-7 gap-2">
              {week.map((day) => {
                const dayString = format(day, 'yyyy-MM-dd');
                const isToday = format(new Date(), 'yyyy-MM-dd') === dayString;
                const dayPlacements = placements.filter(p => p.confirmed); // For now, show all confirmed placements
                
                return (
                  <div
                    key={dayString}
                    className={`
                      min-h-[80px] border rounded-lg p-2 
                      ${isToday ? 'border-primary bg-primary/5' : 'border-border'} 
                      ${isWeekend(day) ? 'bg-muted/50' : 'bg-background'}
                    `}
                  >
                    <div className="text-sm font-medium mb-1">
                      {format(day, 'EEE')}
                    </div>
                    <div className="text-xs text-muted-foreground mb-2">
                      {format(day, 'd')}
                    </div>
                    
                    {/* For now, show all placements on each day - this will be improved later */}
                    <div className="space-y-1">
                      {dayPlacements.slice(0, 2).map((placement) => (
                        <div
                          key={placement.id}
                          className={`
                            text-xs px-1 py-0.5 rounded border
                            ${getStatusColor(placement.status)}
                          `}
                        >
                          {getCandidateName(placement)}
                        </div>
                      ))}
                      {dayPlacements.length > 2 && (
                        <div className="text-xs text-muted-foreground">
                          +{dayPlacements.length - 2} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        
        {placements.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No placements found for this job.
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default JobCalendar;