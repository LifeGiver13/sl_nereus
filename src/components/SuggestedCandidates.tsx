
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  showSlotSelection?: boolean;
  selectedSlotId?: number;
  onSlotChange?: (slotId: number) => void;
  slots?: Array<{
    id: number;
    placements: any[];
    occupiedDates: Set<string>;
  }>;
}

const SuggestedCandidates: React.FC<SuggestedCandidatesProps> = ({
  skillIds,
  onCandidateSelect,
  disabled,
  showSlotSelection = false,
  selectedSlotId,
  onSlotChange,
  slots = []
}) => {
  const { data: matchingCandidates, isLoading: isLoadingMatches } = useQuery({
    queryKey: ['candidateMatches', skillIds],
    queryFn: async () => {
      if (!skillIds || skillIds.length === 0) return { results: [] };
      
      const searchParams = new URLSearchParams();
      searchParams.append('search', JSON.stringify({ skillId: { in: skillIds} }));
      
      const response = await fetch(`${API_BASE_URL}/candidates/match?${searchParams.toString()}`);
      
      if (!response.ok) {
        console.log('Failed to fetch matching candidates, returning empty results');
        return { results: [] };
      }
      
      const data = await response.json();
      console.log('Matching candidates response:', data);
      
      return {
        results: Array.isArray(data?.results) ? data.results : []
      };
    },
    enabled: skillIds && skillIds.length > 0
  });

  const renderCandidateList = (candidates: any[], isLoading: boolean, emptyMessage: string) => {
    if (isLoading) {
      return <div className="text-center py-4 text-sm text-gray-500">Loading...</div>;
    }

    const candidateArray = Array.isArray(candidates) ? candidates : [];

    if (candidateArray.length === 0) {
      return <div className="text-center py-4 text-sm text-gray-500">{emptyMessage}</div>;
    }

    return (
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {candidateArray.map((candidate) => {
          const firstName = candidate.profile?.Forename || 'Unknown';
          const lastName = candidate.profile?.Surname || 'User';
          const email = candidate.username || '';
          
          return (
            <div
              key={candidate.id}
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
            >
              <div>
                <p className="font-medium">{firstName} {lastName} ({email})</p>
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
          );
        })}
      </div>
    );
  };

  const results = Array.isArray(matchingCandidates?.results) ? matchingCandidates.results : [];

  return (
    <div className="space-y-4">
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
    </div>
  );
};

export default SuggestedCandidates;
