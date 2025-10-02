import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Search } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { API_BASE_URL } from '../config/env';

interface User {
  id: number;
  username: string;
  profile?: {
    Forename?: string;
    Surname?: string;
  };
}

interface CandidateSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobId: number;
  skillIds: number[];
  slotId: number;
  date: Date;
  onCandidateSelect: (candidateId: number, slotId: number, date: Date) => void;
}

const CandidateSelectionModal: React.FC<CandidateSelectionModalProps> = ({
  open,
  onOpenChange,
  jobId,
  skillIds,
  slotId,
  date,
  onCandidateSelect
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Fetch recently placed candidates
  const { data: recentlyPlaced, isLoading: isLoadingRecent } = useQuery({
    queryKey: ['recentlyPlaced', jobId],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/candidates/recently-placed/job/${jobId}`);
      if (!response.ok) return [];
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: open && !!jobId
  });

  // Fetch good fit candidates
  const { data: goodFitCandidates, isLoading: isLoadingGoodFit } = useQuery({
    queryKey: ['candidateMatches', skillIds],
    queryFn: async () => {
      if (!skillIds || skillIds.length === 0) return { results: [] };
      
      const searchParams = new URLSearchParams();
      searchParams.append('search', JSON.stringify({ skillId: { in: skillIds} }));
      
      const response = await fetch(`${API_BASE_URL}/candidates/match?${searchParams.toString()}`);
      if (!response.ok) return { results: [] };
      
      const data = await response.json();
      return {
        results: Array.isArray(data?.results) ? data.results : []
      };
    },
    enabled: open && skillIds && skillIds.length > 0
  });

  // Search for users using the same endpoint as UserSearchForm
  const searchUsers = async (term: string) => {
    if (!term.trim() || term.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`${API_BASE_URL}/utils/user-list/${encodeURIComponent(term)}`);
      if (response.ok) {
        const userData = await response.json();
        const userArray = Object.entries(userData).map(([id, name]) => {
          const nameParts = (name as string).split(' ');
          return {
            id: parseInt(id),
            username: name as string,
            profile: {
              Forename: nameParts[0] || '',
              Surname: nameParts.slice(1).join(' ') || ''
            }
          };
        });
        setSearchResults(userArray);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Error searching users:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleInputChange = (value: string) => {
    setSearchTerm(value);
    if (value.length >= 2) {
      searchUsers(value);
    } else {
      setSearchResults([]);
      setIsSearching(false);
    }
  };

  const handleSelect = (candidate: User) => {
    onCandidateSelect(candidate.id, slotId, date);
    onOpenChange(false);
    setSearchTerm('');
  };

  const renderCandidateList = (candidates: User[], isLoading: boolean, emptyMessage: string) => {
    if (isLoading) {
      return <div className="text-center py-4 text-sm text-muted-foreground">Loading...</div>;
    }

    const candidateArray = Array.isArray(candidates) ? candidates : [];

    if (candidateArray.length === 0) {
      return <div className="text-center py-4 text-sm text-muted-foreground">{emptyMessage}</div>;
    }

    return (
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {candidateArray.map((candidate) => {
          const firstName = candidate.profile?.Forename || 'Unknown';
          const lastName = candidate.profile?.Surname || 'User';
          const email = candidate.username || '';
          
          return (
            <div
              key={candidate.id}
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
            >
              <div>
                <p className="font-medium">{firstName} {lastName}</p>
                <p className="text-sm text-muted-foreground">{email}</p>
              </div>
              <Button
                size="sm"
                onClick={() => handleSelect(candidate)}
                variant="outline"
              >
                <Plus className="h-4 w-4 mr-1" />
                Assign
              </Button>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Select Candidate</DialogTitle>
          <DialogDescription>
            Choose a candidate for Slot {slotId} on {date.toLocaleDateString()}
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="recent" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="recent">Recently Placed</TabsTrigger>
            <TabsTrigger value="search">Search</TabsTrigger>
            <TabsTrigger value="good-fit">Good Fit</TabsTrigger>
          </TabsList>
          
          <TabsContent value="recent" className="flex-1 overflow-auto mt-4">
            {renderCandidateList(
              recentlyPlaced || [],
              isLoadingRecent,
              "No recently placed candidates found"
            )}
          </TabsContent>
          
          <TabsContent value="search" className="flex-1 overflow-auto mt-4">
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name..."
                  value={searchTerm}
                  onChange={(e) => handleInputChange(e.target.value)}
                  className="pl-9"
                />
              </div>
              {searchTerm.length < 2 ? (
                <div className="text-center py-4 text-sm text-muted-foreground">
                  Type at least 2 characters to search
                </div>
              ) : isSearching ? (
                <div className="text-center py-4 text-sm text-muted-foreground">Loading...</div>
              ) : searchResults.length === 0 ? (
                <div className="text-center py-4 text-sm text-muted-foreground">
                  No candidates found matching "{searchTerm}"
                </div>
              ) : (
                renderCandidateList(searchResults, false, "")
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="good-fit" className="flex-1 overflow-auto mt-4">
            {renderCandidateList(
              goodFitCandidates?.results || [],
              isLoadingGoodFit,
              skillIds && skillIds.length > 0 
                ? "No candidates found with matching skills"
                : "No skills specified for this job"
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default CandidateSelectionModal;
