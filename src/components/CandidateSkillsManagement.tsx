import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Edit, Power, Search } from 'lucide-react';

interface Skill {
  id: number;
  name: string;
  category: string;
  subCategory?: string;
  meta?: {
    fortunaID: number;
  };
  createdAt: string;
  updatedAt: string;
}

const CandidateSkillsManagement = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const { data, isLoading, error } = useQuery({
    queryKey: ['candidate-skills'],
    queryFn: async () => {
      const response = await apiRequest('/candidate/skills');
      if (!response.ok) {
        throw new Error('Failed to fetch skills');
      }
      return response.json() as Promise<Skill[]>;
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

  // Sort and filter skills by category, then subcategory, then name
  const filteredAndSortedSkills = data?.slice()
    .filter((skill) => {
      const searchLower = searchTerm.toLowerCase();
      return (
        skill.name.toLowerCase().includes(searchLower) ||
        (skill.category || '').toLowerCase().includes(searchLower) ||
        (skill.subCategory || '').toLowerCase().includes(searchLower)
      );
    })
    .sort((a, b) => {
      const categoryA = a.category || 'Uncategorized';
      const categoryB = b.category || 'Uncategorized';
      const subcategoryA = a.subCategory || 'General';
      const subcategoryB = b.subCategory || 'General';
      
      if (categoryA !== categoryB) {
        return categoryA.localeCompare(categoryB);
      }
      if (subcategoryA !== subcategoryB) {
        return subcategoryA.localeCompare(subcategoryB);
      }
      return a.name.localeCompare(b.name);
    }) || [];

  const handleEdit = (skill: Skill) => {
    // TODO: Implement edit functionality
    console.log('Edit skill:', skill);
  };

  const handleToggleStatus = (skill: Skill) => {
    // TODO: Implement disable/enable functionality
    console.log('Toggle skill status:', skill);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Skills Overview</h3>
        <p className="text-sm text-muted-foreground">
          Manage candidate skills organized by category and subcategory
        </p>
      </div>

      <div className="flex items-center gap-4 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search skills, categories, or subcategories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="text-sm text-muted-foreground">
          {filteredAndSortedSkills.length} skill{filteredAndSortedSkills.length !== 1 ? 's' : ''}
        </div>
      </div>

      {filteredAndSortedSkills.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          {searchTerm ? 'No skills found matching your search' : 'No skills found'}
        </div>
      ) : (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Skill Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Subcategory</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedSkills.map((skill) => (
                  <TableRow key={skill.id}>
                    <TableCell className="font-medium">{skill.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {skill.category || 'Uncategorized'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {skill.subCategory || 'General'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(skill)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleStatus(skill)}
                          className="h-8 w-8 p-0"
                        >
                          <Power className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CandidateSkillsManagement;