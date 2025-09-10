import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Calendar, Users, MapPin } from 'lucide-react';
import { Job } from '@/types/job';
import { format } from 'date-fns';

interface SimilarJobsPanelProps {
  jobs: Job[];
  isLoading: boolean;
}

const SimilarJobsPanel: React.FC<SimilarJobsPanelProps> = ({ jobs, isLoading }) => {
  if (isLoading) {
    return (
      <Card className="border-warning/20 bg-warning/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-warning">
            <AlertTriangle className="h-5 w-5" />
            Checking for Similar Jobs...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (jobs.length === 0) {
    return null;
  }

  return (
    <Card className="border-warning/20 bg-warning/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-warning">
          <AlertTriangle className="h-5 w-5" />
          Similar Jobs Found
        </CardTitle>
        <CardDescription>
          {jobs.length} existing job{jobs.length > 1 ? 's' : ''} with overlapping details were found. 
          Please review to avoid duplication.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {jobs.map((job) => (
            <div
              key={job.id}
              className="p-3 bg-background border border-border rounded-lg space-y-2"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <h4 className="font-medium text-sm">{job.title}</h4>
                  <p className="text-xs text-muted-foreground">{job.clientName}</p>
                </div>
                <Badge variant={job.status === 'open' ? 'default' : 'secondary'} className="text-xs">
                  {job.status}
                </Badge>
              </div>

              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>
                    {format(new Date(job.startDate), 'MMM d, yyyy')}
                    {job.endDate && ` - ${format(new Date(job.endDate), 'MMM d, yyyy')}`}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  <span>{job.vacancies} {job.vacancies === 1 ? 'vacancy' : 'vacancies'}</span>
                </div>
                {job.departmentName && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    <span>{job.departmentName}</span>
                  </div>
                )}
              </div>

            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default SimilarJobsPanel;