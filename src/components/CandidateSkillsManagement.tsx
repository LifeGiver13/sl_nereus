import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface Skill {
  id: number;
  name: string;
  category: string;
  subcategory?: string;
}

interface SkillsResponse {
  skills: Skill[];
}

const CandidateSkillsManagement = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['candidate-skills'],
    queryFn: async () => {
      const response = await apiRequest('/candidate/skills');
      if (!response.ok) {
        throw new Error('Failed to fetch skills');
      }
      return response.json() as Promise<SkillsResponse>;
    }
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-destructive">
        Error loading skills: {error instanceof Error ? error.message : 'Unknown error'}
      </div>
    );
  }

  // Group skills by category, then by subcategory
  const groupedSkills = data?.skills?.reduce((acc, skill) => {
    const category = skill.category || 'Uncategorized';
    const subcategory = skill.subcategory || 'General';
    
    if (!acc[category]) {
      acc[category] = {};
    }
    if (!acc[category][subcategory]) {
      acc[category][subcategory] = [];
    }
    
    acc[category][subcategory].push(skill);
    return acc;
  }, {} as Record<string, Record<string, Skill[]>>) || {};

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Skills Overview</h3>
        <p className="text-sm text-muted-foreground">
          Manage candidate skills organized by category and subcategory
        </p>
      </div>

      {Object.keys(groupedSkills).length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No skills found
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedSkills).map(([category, subcategories]) => (
            <Card key={category} className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-primary">
                  {category}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(subcategories).map(([subcategory, skills]) => (
                  <div key={subcategory} className="space-y-2">
                    <h4 className="text-sm font-medium text-muted-foreground">
                      {subcategory}
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {skills.map((skill) => (
                        <Badge
                          key={skill.id}
                          variant="secondary"
                          className="text-xs"
                        >
                          {skill.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default CandidateSkillsManagement;