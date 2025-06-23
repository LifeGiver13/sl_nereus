
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { API_BASE_URL } from '../config/env';

interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
}

interface SuggestedCandidatesProps {
  skillIds: number[];
  onCandidateSelect: (user: User) => void;
  disabled?: boolean;
}

const SuggestedCandidates: React.FC<SuggestedCandidatesProps> = ({
  skillIds,
  onCandidateSelect,
  disabled
}) => {
  const { data: matchingCandidates, isLoading: isLoadingMatches } = useQuery({
    queryKey: ['candidateMatches', skillIds],
    queryFn: async () => {
      if (!skillIds || skillIds.length === 0) return { results: [] };
      
      const searchParams = new URLSearchParams();
      searchParams.append('search', JSON.stringify({ id: { in: skillIds} }));
      
      const response = await fetch(`${API_BASE_URL}/candidates/match?${searchParams.toString()}`);
      
      if (!response.ok) {
        console.log('Failed to fetch matching candidates, returning empty results');
        return { results: [] };
      }
      
      const data = await response.json();
      console.log('Matching candidates response:', data);
      
      // Ensure we always return an object with a results array
      return {
        results: Array.isArray(data?.results) ? data.results : []
      };
    },
    enabled: skillIds && skillIds.length > 0
  });

  const renderCandidateList = (candidates: User[], isLoading: boolean, emptyMessage: string) => {
    if (isLoading) {
      return <div className="text-center py-4 text-sm text-gray-500">Loading...</div>;
    }

    // Ensure candidates is always an array
    const candidateArray = Array.isArray(candidates) ? candidates : [];

    if (candidateArray.length === 0) {
      return <div className="text-center py-4 text-sm text-gray-500">{emptyMessage}</div>;
    }

    return (
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {candidateArray.map((candidate) => (
          <div
            key={candidate.id}
            className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
          >
            <div>
              <p className="font-medium">{candidate.firstName} {candidate.lastName}</p>
              <p className="text-sm text-gray-500">{candidate.email}</p>
            </div>
            <Button
              size="sm"
              onClick={() => onCandidateSelect(candidate)}
              disabled={disabled}
              variant="outline"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>
        ))}
      </div>
    );
  };

  // Ensure we always have an array for results
  const results = Array.isArray(matchingCandidates?.results) ? matchingCandidates.results : [];

  return (
    <Tabs defaultValue="skill-match" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="skill-match">Good Fit</TabsTrigger>
        <TabsTrigger value="recent">Recently Placed</TabsTrigger>
      </TabsList>
      
      <TabsContent value="skill-match" className="mt-4">
        {renderCandidateList(
          results,
          isLoadingMatches,
          skillIds && skillIds.length > 0 
            ? "No candidates found with matching skills"
            : "No skills specified for this job"
        )}
      </TabsContent>
      
      <TabsContent value="recent" className="mt-4">
        <div className="text-center py-4 text-sm text-gray-500">
          Recently placed candidates feature coming soon...
        </div>
      </TabsContent>
    </Tabs>
  );
};

export default SuggestedCandidates;
