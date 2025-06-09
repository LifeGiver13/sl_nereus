import React, { useState, useEffect } from 'react';
import AdminLayout from '../components/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { Search, Plus, Eye, Edit, UserPlus, X } from 'lucide-react';
import { Link } from 'react-router-dom';
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

const Jobs = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchFilters, setSearchFilters] = useState({
    clientId: '',
    postedBy: '',
    title: '',
    startDateFrom: '',
    startDateTo: '',
    endDateFrom: '',
    endDateTo: ''
  });

  const buildSearchQuery = () => {
    const searchObject: any = {};
    
    if (searchFilters.clientId) {
      searchObject.clientId = parseInt(searchFilters.clientId);
    }
    if (searchFilters.postedBy) {
      searchObject.postedBy = parseInt(searchFilters.postedBy);
    }
    if (searchFilters.title) {
      searchObject.title = { "like": `%${searchFilters.title}%` };
    }
    if (searchFilters.startDateFrom) {
      searchObject.startDate = { "gte": searchFilters.startDateFrom };
    }
    if (searchFilters.startDateTo) {
      if (searchObject.startDate) {
        searchObject.startDate.lte = searchFilters.startDateTo;
      } else {
        searchObject.startDate = { "lte": searchFilters.startDateTo };
      }
    }
    if (searchFilters.endDateFrom) {
      searchObject.endDate = { "gte": searchFilters.endDateFrom };
    }
    if (searchFilters.endDateTo) {
      if (searchObject.endDate) {
        searchObject.endDate.lte = searchFilters.endDateTo;
      } else {
        searchObject.endDate = { "lte": searchFilters.endDateTo };
      }
    }

    return Object.keys(searchObject).length > 0 ? `&search=${encodeURIComponent(JSON.stringify(searchObject))}` : '';
  };

  const { data: jobsData, isLoading, error } = useQuery({
    queryKey: ['jobs', currentPage, searchFilters],
    queryFn: async () => {
      const searchQuery = buildSearchQuery();
      const response = await fetch(`${API_BASE_URL}/jobs?limit=${pageSize}&offset=${(currentPage - 1) * pageSize}${searchQuery}`);
      if (!response.ok) {
        throw new Error('Failed to fetch jobs');
      }
      return response.json();
    }
  });

  const jobs = jobsData?.results || [];
  const totalPages = Math.ceil((jobsData?.total || 0) / 10);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-red-100 text-red-800';
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setSearchFilters({
      clientId: '',
      postedBy: '',
      title: '',
      startDateFrom: '',
      startDateTo: '',
      endDateFrom: '',
      endDateTo: ''
    });
    setCurrentPage(1);
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading jobs...</div>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-red-600">Error loading jobs</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-[#000009]">Jobs</h1>
            <p className="text-gray-600 mt-1">Manage job postings and opportunities</p>
          </div>
          <Link to="/jobs/create">
            <Button className="bg-[#712B71] hover:bg-[#712B71]/90">
              <Plus className="h-4 w-4 mr-2" />
              Create Job
            </Button>
          </Link>
        </div>

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-[#000009]">Filter Jobs</CardTitle>
            <CardDescription>Search and filter job postings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <Input
                placeholder="Client ID"
                type="number"
                value={searchFilters.clientId}
                onChange={(e) => setSearchFilters({ ...searchFilters, clientId: e.target.value })}
              />
              <Input
                placeholder="Posted By (User ID)"
                type="number"
                value={searchFilters.postedBy}
                onChange={(e) => setSearchFilters({ ...searchFilters, postedBy: e.target.value })}
              />
              <Input
                placeholder="Job Title"
                value={searchFilters.title}
                onChange={(e) => setSearchFilters({ ...searchFilters, title: e.target.value })}
              />
              <div className="flex gap-2">
                <Button onClick={handleSearch} className="bg-[#712B71] hover:bg-[#712B71]/90">
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </Button>
                <Button onClick={clearFilters} variant="outline">
                  <X className="h-4 w-4 mr-2" />
                  Clear
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Start Date From</label>
                <Input
                  type="date"
                  value={searchFilters.startDateFrom}
                  onChange={(e) => setSearchFilters({ ...searchFilters, startDateFrom: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Start Date To</label>
                <Input
                  type="date"
                  value={searchFilters.startDateTo}
                  onChange={(e) => setSearchFilters({ ...searchFilters, startDateTo: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">End Date From</label>
                <Input
                  type="date"
                  value={searchFilters.endDateFrom}
                  onChange={(e) => setSearchFilters({ ...searchFilters, endDateFrom: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">End Date To</label>
                <Input
                  type="date"
                  value={searchFilters.endDateTo}
                  onChange={(e) => setSearchFilters({ ...searchFilters, endDateTo: e.target.value })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-[#000009]">Jobs ({jobsData?.total || 0})</CardTitle>
            <CardDescription>All job postings in the system</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead>Vacancies</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Filled</TableHead>
                    <TableHead>Assigned</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell>{job.id}</TableCell>
                      <TableCell>{job.client.name}</TableCell>
                      <TableCell>{job.owner.username}</TableCell>
                      <TableCell className="font-medium">{job.title}</TableCell>
                      <TableCell>{new Date(job.startDate).toLocaleDateString()}</TableCell>
                      <TableCell>{new Date(job.endDate).toLocaleDateString()}</TableCell>
                      <TableCell>{job.vacancies}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(job.status)}>
                          {job.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={job.filled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                          {job.filled ? 'Yes' : 'No'}
                        </Badge>
                      </TableCell>
                      <TableCell>{job.assignees?.length || 0}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Link to={`/job/${job.id}`}>
                            <Button variant="ghost" size="sm">
                              View
                            </Button>
                          </Link>
                          <Link to={`/jobs/edit/${job.id}`}>
                            <Button variant="ghost" size="sm">
                              Edit
                            </Button>
                          </Link>
                          <Button variant="ghost" size="sm">
                            Fill
                          </Button>
                          <Button variant="ghost" size="sm">
                            Cancel
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {totalPages > 1 && (
              <div className="mt-4">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                      />
                    </PaginationItem>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const page = i + 1;
                      return (
                        <PaginationItem key={page}>
                          <PaginationLink
                            onClick={() => setCurrentPage(page)}
                            isActive={currentPage === page}
                            className="cursor-pointer"
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    })}
                    <PaginationItem>
                      <PaginationNext 
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default Jobs;
