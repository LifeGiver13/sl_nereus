import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Search } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { API_BASE_URL } from '../config/env';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { MultiDaySelector } from './MultiDaySelector';
import { formatDateString } from '@/config/timezone';

interface User {
  id: number;
  username: string;
  profile?: {
    Forename?: string;
    Surname?: string;
  };
  placements?: Array<{
    id: number;
    status?: string;
    meta?: {
      shiftDate?: string;
    };
  }>;
}

interface CandidateSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobId: number;
  skillIds: number[];
  slotId: number;
  date: Date;
  job: any;
  conflictingDates: Set<string>;
  onCandidateSelect: (candidateId: number, slotId: number, dates: Date[]) => void;
}

const CandidateSelectionModal: React.FC<CandidateSelectionModalProps> = ({
  open,
  onOpenChange,
  jobId,
  skillIds,
  slotId,
  date,
  job,
  conflictingDates,
  onCandidateSelect
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [multiDateMode, setMultiDateMode] = useState(false);
  const [selectedDates, setSelectedDates] = useState<Date[]>([date]);

  // Fetch recently placed candidates with full placement data
  const { data: recentlyPlaced, isLoading: isLoadingRecent } = useQuery({
    queryKey: ['recentlyPlaced', jobId],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/candidates/recently-placed/job/${jobId}`);
      if (!response.ok) return [];
      const data = await response.json();
      const candidates = Array.isArray(data) ? data : [];
      
      // Fetch full user data with placements for each candidate
      const candidatesWithPlacements = await Promise.all(
        candidates.map(async (candidate) => {
          try {
            const userResponse = await fetch(`${API_BASE_URL}/user/${candidate.id}`, {
              headers: {
                'x-service-user': localStorage.getItem('session_token') || '',
              },
            });
            if (userResponse.ok) {
              return await userResponse.json();
            }
          } catch (error) {
            console.error(`Failed to fetch placements for user ${candidate.id}:`, error);
          }
          return candidate;
        })
      );
      
      return candidatesWithPlacements;
    },
    enabled: open && !!jobId
  });

  // Fetch good fit candidates with full placement data
  const { data: goodFitCandidates, isLoading: isLoadingGoodFit } = useQuery({
    queryKey: ['candidateMatches', skillIds],
    queryFn: async () => {
      if (!skillIds || skillIds.length === 0) return { results: [] };
      
      const searchParams = new URLSearchParams();
      searchParams.append('search', JSON.stringify({ skillId: { in: skillIds} }));
      
      const response = await fetch(`${API_BASE_URL}/candidates/match?${searchParams.toString()}`);
      if (!response.ok) return { results: [] };
      
      const data = await response.json();
      const candidates = Array.isArray(data?.results) ? data.results : [];
      
      // Fetch full user data with placements for each candidate
      const candidatesWithPlacements = await Promise.all(
        candidates.map(async (candidate) => {
          try {
            const userResponse = await fetch(`${API_BASE_URL}/user/${candidate.id}`, {
              headers: {
                'x-service-user': localStorage.getItem('session_token') || '',
              },
            });
            if (userResponse.ok) {
              return await userResponse.json();
            }
          } catch (error) {
            console.error(`Failed to fetch placements for user ${candidate.id}:`, error);
          }
          return candidate;
        })
      );
      
      return {
        results: candidatesWithPlacements
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
        
        // Fetch full user data with placements for each search result
        const usersWithPlacements = await Promise.all(
          userArray.map(async (user) => {
            try {
              const userResponse = await fetch(`${API_BASE_URL}/user/${user.id}`, {
                headers: {
                  'x-service-user': localStorage.getItem('session_token') || '',
                },
              });
              if (userResponse.ok) {
                return await userResponse.json();
              }
            } catch (error) {
              console.error(`Failed to fetch placements for user ${user.id}:`, error);
            }
            return user;
          })
        );
        
        setSearchResults(usersWithPlacements);
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

  // Calculate available dates (all job dates minus conflicting ones)
  const availableDates = useMemo(() => {
    if (!job) return new Set<string>();
    
    const jobStart = new Date(job.startDate);
    const jobEnd = new Date(job.endDate);
    const dates = new Set<string>();
    
    for (let d = new Date(jobStart); d <= jobEnd; d.setDate(d.getDate() + 1)) {
      const dateStr = formatDateString(d);
      if (!conflictingDates.has(dateStr)) {
        // Check weekends if excluded
        if (job.body?.includeWeekends === false) {
          const dayOfWeek = d.getDay();
          if (dayOfWeek === 0 || dayOfWeek === 6) continue;
        }
        dates.add(dateStr);
      }
    }
    
    return dates;
  }, [job, conflictingDates]);

  // Check if candidate has placements on any of the selected dates
  const isCandidateUnavailable = (candidate: User, datesToCheck: Date[]): boolean => {
    if (!candidate.placements || candidate.placements.length === 0) {
      return false;
    }

    return datesToCheck.some(selectedDate => {
      const selectedDateStr = selectedDate.toISOString().split('T')[0];
      return candidate.placements!.some(placement => {
        if (placement.meta?.shiftDate) {
          const placementDateStr = new Date(placement.meta.shiftDate).toISOString().split('T')[0];
          const isDateMatch = placementDateStr === selectedDateStr;
          const isBlockingStatus = placement.status !== 'awaiting_confirmation' && placement.status !== 'accepted';
          return isDateMatch && isBlockingStatus;
        }
        return false;
      });
    });
  };

  const handleSelect = (candidate: User) => {
    const datesToAssign = multiDateMode ? selectedDates : [date];
    onCandidateSelect(candidate.id, slotId, datesToAssign);
    onOpenChange(false);
    setSearchTerm('');
    setMultiDateMode(false);
    setSelectedDates([date]);
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
          const datesToCheck = multiDateMode ? selectedDates : [date];
          const isUnavailable = isCandidateUnavailable(candidate, datesToCheck);
          
          return (
            <div
              key={candidate.id}
              className={`flex items-center justify-between p-3 border rounded-lg transition-colors ${
                isUnavailable 
                  ? 'opacity-50 bg-muted cursor-not-allowed' 
                  : 'hover:bg-accent/50'
              }`}
            >
              <div className="flex-1">
                <p className="font-medium">{firstName} {lastName}</p>
                <p className="text-sm text-muted-foreground">{email}</p>
                {isUnavailable && (
                  <p className="text-xs text-destructive mt-1">
                    Already assigned on selected date(s)
                  </p>
                )}
              </div>
              <Button
                size="sm"
                onClick={() => handleSelect(candidate)}
                variant="outline"
                disabled={isUnavailable}
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
            Choose a candidate for Slot {slotId}
            {multiDateMode ? ` for ${selectedDates.length} date(s)` : ` on ${date.toLocaleDateString()}`}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center space-x-2 pb-4 border-b">
          <Switch
            id="multi-date-mode"
            checked={multiDateMode}
            onCheckedChange={setMultiDateMode}
          />
          <Label htmlFor="multi-date-mode" className="cursor-pointer">
            Assign to multiple dates
          </Label>
        </div>

        {multiDateMode && (
          <div className="border-b pb-4">
            <MultiDaySelector
              selectedDates={selectedDates}
              onDatesChange={setSelectedDates}
              availableDates={availableDates}
              conflictingDates={conflictingDates}
              job={job}
            />
          </div>
        )}
        
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
