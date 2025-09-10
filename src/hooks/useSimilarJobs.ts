import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/utils';
import { Job } from '@/types/job';

interface SimilarJobsParams {
  clientId: number | null;
  departmentId: string;
  positionId: number | null;
  startDate: string;
  endDate: string;
}

export const useSimilarJobs = (params: SimilarJobsParams) => {
  const [shouldSearch, setShouldSearch] = useState(false);

  // Check if all required fields are present
  useEffect(() => {
    const hasRequiredFields = 
      params.clientId && 
      params.departmentId && 
      params.positionId && 
      params.startDate;
    
    setShouldSearch(!!hasRequiredFields);
  }, [params.clientId, params.departmentId, params.positionId, params.startDate]);

  const { data: similarJobs = [], isLoading } = useQuery({
    queryKey: ['similar-jobs', params.clientId, params.departmentId, params.positionId, params.startDate, params.endDate],
    queryFn: async () => {
      if (!shouldSearch) return [];

      // Build search criteria for jobs with same client, department, position
      const searchParams = {
        and: [
          { clientId: params.clientId },
          { departmentId: parseInt(params.departmentId) },
          { 'body.positionId': params.positionId },
          // Date overlap logic: job starts before our end date (or we have no end date)
          // and job ends after our start date (or job has no end date)
          {
            or: [
              {
                and: [
                  { startDate: { lte: params.endDate || '9999-12-31' } },
                  {
                    or: [
                      { endDate: { gte: params.startDate } },
                      { endDate: null }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      };

      const response = await apiRequest(`/jobs?search=${encodeURIComponent(JSON.stringify(searchParams))}&expand=client,shift`);
      if (!response.ok) {
        throw new Error('Failed to fetch similar jobs');
      }
      const data = await response.json();
      return data.results || [];
    },
    enabled: shouldSearch
  });

  return {
    similarJobs: similarJobs as Job[],
    isLoading,
    hasSimilarJobs: similarJobs.length > 0
  };
};