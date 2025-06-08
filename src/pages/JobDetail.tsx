
import React from 'react';
import { useParams, Link } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Edit, UserPlus, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { API_BASE_URL } from '../config/env';

interface Job {
  id: number;
  clientId: number;
  postedBy: number;
  title: string;
  description: string;
  body: any;
  meta: any;
  startDate: string;
  endDate: string;
  vacancies: number;
  status: string;
  filled: boolean;
  skills: number[];
  assignees: number[];
  createdAt: string;
  updatedAt: string;
}

interface Skill {
  id: number;
  name: string;
}

const JobDetail = () => {
  const { id } = useParams<{ id: string }>();

  const { data: job, isLoading, error } = useQuery({
    queryKey: ['job', id],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/job/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch job details');
      }
      return response.json();
    }
  });

  const { data: skillsData } = useQuery({
    queryKey: ['skills'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/candidate/skills/indexed`);
      if (!response.ok) {
        throw new Error('Failed to fetch skills');
      }
      return response.json();
    }
  });

  const getSkillNames = (skillIds: number[]) => {
    if (!skillsData || !skillIds) return [];
    
    const allSkills: Skill[] = [];
    Object.values(skillsData).forEach((categorySkills: any) => {
      allSkills.push(...categorySkills);
    });
    
    return skillIds.map(id => {
      const skill = allSkills.find(s => s.id === id);
      return skill ? skill.name : `Skill ID: ${id}`;
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'open': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading job details...</div>
        </div>
      </AdminLayout>
    );
  }

  if (error || !job) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-red-600">Error loading job details</div>
        </div>
      </AdminLayout>
    );
  }

  const skillNames = getSkillNames(job.skills || []);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link to="/jobs">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Jobs
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-[#000009]">Job Details</h1>
              <p className="text-gray-600 mt-1">Job ID: {job.id}</p>
            </div>
          </div>
          <div className="flex space-x-2">
            <Link to={`/jobs/edit/${job.id}`}>
              <Button variant="outline">
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </Link>
            <Button className="bg-[#712B71] hover:bg-[#712B71]/90">
              <UserPlus className="h-4 w-4 mr-2" />
              Fill
            </Button>
            <Button variant="destructive">
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-[#000009]">Basic Information</CardTitle>
              <CardDescription>Core job details</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableBody>
                  <TableRow>
                    <TableHead className="w-1/3">Title</TableHead>
                    <TableCell>{job.title}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableCell>{job.description}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableHead>Client ID</TableHead>
                    <TableCell>{job.clientId}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableHead>Posted By</TableHead>
                    <TableCell>{job.postedBy}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableCell>
                      <Badge className={getStatusColor(job.status)}>
                        {job.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableHead>Filled</TableHead>
                    <TableCell>
                      <Badge className={job.filled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                        {job.filled ? 'Yes' : 'No'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-[#000009]">Job Details</CardTitle>
              <CardDescription>Dates, vacancies, and assignments</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableBody>
                  <TableRow>
                    <TableHead className="w-1/3">Start Date</TableHead>
                    <TableCell>{new Date(job.startDate).toLocaleDateString()}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableHead>End Date</TableHead>
                    <TableCell>{new Date(job.endDate).toLocaleDateString()}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableHead>Vacancies</TableHead>
                    <TableCell>{job.vacancies}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableHead>Assigned Count</TableHead>
                    <TableCell>{job.assignees?.length || 0}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableHead>Skills Required</TableHead>
                    <TableCell>{job.skills?.length || 0} skills</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableHead>Created</TableHead>
                    <TableCell>{new Date(job.createdAt).toLocaleString()}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableHead>Updated</TableHead>
                    <TableCell>{new Date(job.updatedAt).toLocaleString()}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {job.body && (
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-[#000009]">Job Body</CardTitle>
              <CardDescription>Detailed job information</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="whitespace-pre-wrap">{JSON.stringify(job.body, null, 2)}</div>
            </CardContent>
          </Card>
        )}

        {job.assignees && job.assignees.length > 0 && (
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-[#000009]">Assignees</CardTitle>
              <CardDescription>People assigned to this job</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {job.assignees.map((assigneeId: number) => (
                  <Badge key={assigneeId} variant="outline">
                    User ID: {assigneeId}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {skillNames.length > 0 && (
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-[#000009]">Required Skills</CardTitle>
              <CardDescription>Skills needed for this job</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {skillNames.map((skillName, index) => (
                  <Badge key={index} variant="outline">
                    {skillName}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
};

export default JobDetail;
