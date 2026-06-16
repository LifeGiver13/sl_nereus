import React, { useState, useMemo } from 'react';
import AdminLayout from '../components/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { Search, Plus, Eye, Edit, UserPlus, X, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { API_BASE_URL } from '../config/env';
import { PageSizeSelector } from '../components/ui/page-size-selector';
import { usePreferences } from '../hooks/usePreferences';
import { IconActionButton, IconActionTooltip } from '@/components/IconActionTooltip';
import { DateRangePicker } from '@/components/DateRangePicker';

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
  skills: any[];
  assignees: number[];
  createdAt: string;
  updatedAt: string;
  client?: { id: number; name: string };
  owner?: { id: number; username: string };
}

interface Client {
  id: number;
  name: string;
}

interface User {
  id: number;
  name: string;
}

type SortDirection = 'asc' | 'desc' | null;



const SortIcon = ({ column, sortColumn, sortDirection }: {
  column: string;
  sortColumn: string | null;
  sortDirection: SortDirection;
}) => {
  if (sortColumn !== column) return <ChevronsUpDown className="h-3.5 w-3.5 ml-1 text-gray-400 inline" />;
  if (sortDirection === 'asc') return <ChevronUp className="h-3.5 w-3.5 ml-1 inline" />;
  return <ChevronDown className="h-3.5 w-3.5 ml-1 inline" />;
};

const Jobs = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const { preferences, updateTablePreferences } = usePreferences();
  const pageSize = preferences.table.pageSize;

  // Filter state
  const [titleFilter, setTitleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [clientFilter, setClientFilter] = useState('');
  const [startDateRange, setStartDateRange] = useState({ from: '', to: '' });
  const [endDateRange, setEndDateRange] = useState({ from: '', to: '' });

  // Client typeahead
  const [clients, setClients] = useState<Client[]>([]);
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);

  // User typeahead
  const [users, setUsers] = useState<User[]>([]);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  // Sorting
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      if (sortDirection === 'asc') setSortDirection('desc');
      else if (sortDirection === 'desc') { setSortColumn(null); setSortDirection(null); }
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Skills
  const { data: skillsData } = useQuery({
    queryKey: ['skills'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/candidate/skills/indexed`);
      if (!response.ok) throw new Error('Failed to fetch skills');
      return response.json();
    }
  });

  // Fetch ALL jobs
  const { data: jobsData, isLoading, error } = useQuery({
    queryKey: ['jobs-all'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/jobs?limit=9999&offset=0`);
      if (!response.ok) throw new Error('Failed to fetch jobs');
      return response.json();
    }
  });

  const allJobs: Job[] = jobsData?.results || [];

  // Client & User search handlers (unchanged)
  const searchClients = async (term: string) => {
    if (term.length < 2) { setClients([]); return; }
    try {
      const res = await fetch(`${API_BASE_URL}/utils/client-list/${encodeURIComponent(term)}`);
      if (res.ok) {
        const data = await res.json();
        setClients(Object.entries(data).map(([id, name]) => ({ id: parseInt(id), name: name as string })));
      }
    } catch { /* ignore */ }
  };

  const handleClientSearch = (value: string) => {
    setClientSearchTerm(value);
    if (!value) { setSelectedClientId(null); setClientFilter(''); }
    searchClients(value);
  };

  const handleClientSelect = (client: Client) => {
    setSelectedClientId(client.id);
    setClientSearchTerm(client.name);
    setClientFilter(client.name.toLowerCase());
    setClients([]);
  };

  const searchUsers = async (term: string) => {
    if (term.length < 2) { setUsers([]); return; }
    const res = await fetch(`${API_BASE_URL}/utils/user-list/${encodeURIComponent(term)}`);
    if (res.ok) {
      const data = await res.json();
      setUsers(Object.entries(data).map(([id, name]) => ({ id: parseInt(id), name: name as string })));
    }
  };

  const handleUserSearch = (value: string) => {
    setUserSearchTerm(value);
    if (!value) setSelectedUserId(null);
    searchUsers(value);
  };

  const handleUserSelect = (user: User) => {
    setSelectedUserId(user.id);
    setUserSearchTerm(user.name);
    setUsers([]);
  };

  const filtered = useMemo(() => {
    return allJobs.filter((job) => {
      if (titleFilter && !job.title.toLowerCase().includes(titleFilter.toLowerCase())) return false;
      if (statusFilter && job.status.toLowerCase() !== statusFilter.toLowerCase()) return false;

      if (clientFilter) {
        const name = job.client?.name?.toLowerCase() ?? '';
        if (!name.includes(clientFilter)) return false;
      }

      if (selectedUserId && job.owner?.id !== selectedUserId) return false;


      if (startDateRange.from && job.startDate < startDateRange.from) return false;
      if (startDateRange.to && job.startDate > startDateRange.to) return false;

      if (endDateRange.from && job.endDate && job.endDate < endDateRange.from) return false;
      if (endDateRange.to && job.endDate && job.endDate > endDateRange.to) return false;
      return true;
    });
  }, [allJobs, titleFilter, statusFilter, clientFilter, startDateRange, endDateRange, selectedUserId]);

  // Sorting + Pagination (unchanged)
  const sorted = useMemo(() => {
    if (!sortColumn || !sortDirection) return filtered;
    return [...filtered].sort((a, b) => {
      const dir = sortDirection === 'asc' ? 1 : -1;
      switch (sortColumn) {
        case 'id': return (a.id - b.id) * dir;
        case 'client': return (a.client?.name ?? '').localeCompare(b.client?.name ?? '') * dir;
        case 'owner': return (a.owner?.username ?? '').localeCompare(b.owner?.username ?? '') * dir;
        case 'title': return a.title.localeCompare(b.title) * dir;
        case 'startDate': return a.startDate.localeCompare(b.startDate) * dir;
        case 'endDate': return (a.endDate ?? '').localeCompare(b.endDate ?? '') * dir;
        case 'vacancies': return (a.vacancies - b.vacancies) * dir;
        case 'status': return a.status.localeCompare(b.status) * dir;
        case 'filled': return (Number(a.filled) - Number(b.filled)) * dir;
        default: return 0;
      }
    });
  }, [filtered, sortColumn, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, currentPage, pageSize]);

  const clearFilters = () => {
    setTitleFilter('');
    setStatusFilter('');
    setClientFilter('');
    setStartDateRange({ from: '', to: '' });
    setEndDateRange({ from: '', to: '' });
    setSelectedClientId(null);
    setSelectedUserId(null);
    setClientSearchTerm('');
    setUserSearchTerm('');
    setCurrentPage(1);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-red-100 text-red-800';
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  const getSkillNames = (skillIds: number[]) => {
    if (!skillsData || !skillIds?.length) return [];
    const allSkills: any[] = [];
    Object.values(skillsData).forEach((cat: any) => allSkills.push(...cat));
    return skillIds.map(id => allSkills.find(s => s.id === id)?.name ?? `Skill ${id}`);
  };

  const SortableTh = ({ column, children }: { column: string; children: React.ReactNode }) => (
    <TableHead
      className="cursor-pointer select-none whitespace-nowrap"
      onClick={() => handleSort(column)}
    >
      {children}
      <SortIcon column={column} sortColumn={sortColumn} sortDirection={sortDirection} />
    </TableHead>
  );

  if (error) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-red-600">Error loading jobs</div>
        </div>
      </AdminLayout>
    );
  }

  const uniqueStatuses = Array.from(new Set(allJobs.map(j => j.status))).filter(Boolean);

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-full overflow-hidden">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[#000009]">Jobs</h1>
            <p className="text-gray-600 mt-1">Manage job postings and opportunities</p>
          </div>
          <Link to="/jobs/create">
            <Button className="bg-[#712B71] hover:bg-[#712B71]/90 w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Create Job
            </Button>
          </Link>
        </div>

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-[#000009]">Filter Jobs</CardTitle>
            <CardDescription>All filters apply to the current page data</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
              <div className="space-y-1">
                <label className="text-sm font-medium">Client</label>
                <div className="relative">
                  <Input
                    value={clientSearchTerm}
                    onChange={(e) => handleClientSearch(e.target.value)}
                    placeholder="Start typing client name..."
                  />
                  {clients.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                      {clients.map((client) => (
                        <div
                          key={client.id}
                          className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                          onClick={() => handleClientSelect(client)}
                        >
                          {client.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Posted By</label>
                <div className="relative">
                  <Input
                    value={userSearchTerm}
                    onChange={(e) => handleUserSearch(e.target.value)}
                    placeholder="Start typing user name..."
                  />
                  {users.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                      {users.map((user) => (
                        <div
                          key={user.id}
                          className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                          onClick={() => handleUserSelect(user)}
                        >
                          {user.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Job Title</label>
                <Input
                  placeholder="Filter by title..."
                  value={titleFilter}
                  onChange={(e) => { setTitleFilter(e.target.value); setCurrentPage(1); }}
                />
              </div>

              {/* Status */}
              <div className="space-y-1">
                <label className="text-sm font-medium">Status</label>
                <select
                  className="border rounded px-2 py-1.5 text-sm w-full"
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                >
                  <option value="">All statuses</option>
                  {uniqueStatuses.map(s => (
                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">
                  Start Date Range
                </label>

                <DateRangePicker
                  value={startDateRange}
                  onChange={(r) => {
                    setStartDateRange(r);
                    setCurrentPage(1);
                  }}
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">
                  End Date Range
                </label>

                <DateRangePicker
                  value={endDateRange}
                  onChange={(r) => {
                    setEndDateRange(r);
                    setCurrentPage(1);
                  }}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={clearFilters} variant="outline">
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-[#000009]">
                  Jobs ({sorted.length}{sorted.length !== allJobs.length ? ` of ${allJobs.length}` : ''})
                </CardTitle>
                <CardDescription>All job postings in the system</CardDescription>
              </div>
              <PageSizeSelector
                pageSize={pageSize}
                onPageSizeChange={(size) => {
                  updateTablePreferences({ pageSize: size });
                  setCurrentPage(1);
                }}
                totalItems={sorted.length}
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">

            <div className="overflow-x-auto max-w-full">
              {isLoading ? (
                <div className="text-center py-10 text-gray-500">Loading jobs...</div>
              ) : sorted.length === 0 ? (
                <div className="text-center py-10 text-gray-500">No jobs found</div>
              ) : (
                <Table className="min-w-full">
                  <TableHeader>
                    <TableRow>
                      <SortableTh column="id">ID</SortableTh>
                      <SortableTh column="client">Client</SortableTh>
                      <SortableTh column="owner">Owner</SortableTh>
                      <SortableTh column="title">Title</SortableTh>
                      <SortableTh column="startDate">Start Date</SortableTh>
                      <SortableTh column="endDate">End Date</SortableTh>
                      <SortableTh column="vacancies">Vacancies</SortableTh>
                      <SortableTh column="status">Status</SortableTh>
                      <SortableTh column="filled">Filled</SortableTh>
                      <TableHead>Skills</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginated.map((job) => (
                      <TableRow
                        key={job.id}
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => window.location.href = `/job/${job.id}`}
                      >
                        <TableCell>{job.id}</TableCell>
                        <TableCell>{job.client?.name ?? `Client #${job.clientId}`}</TableCell>
                        <TableCell>{job.owner?.username ?? `User #${job.postedBy}`}</TableCell>
                        <TableCell className="font-medium">{job.title}</TableCell>
                        <TableCell>{new Date(job.startDate).toLocaleDateString()}</TableCell>
                        <TableCell>{job.endDate ? new Date(job.endDate).toLocaleDateString() : 'Ongoing'}</TableCell>
                        <TableCell>{job.vacancies}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(job.status)}>
                            {job.status.charAt(0).toUpperCase() + job.status.slice(1) || 'NA'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={job.filled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                            {job.filled ? 'Yes' : 'No'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {getSkillNames(job.skills || []).map((skillName, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {skillName}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <IconActionTooltip label="View job">
                              <span className="inline-flex">
                                <Link to={`/job/${job.id}`}>
                                  <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </Link>
                              </span>
                            </IconActionTooltip>
                            <IconActionTooltip label="Edit job">
                              <span className="inline-flex">
                                <Link to={`/jobs/edit/${job.id}`}>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-9 w-9 p-0"
                                    aria-label="Edit job"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </Link>
                              </span>
                            </IconActionTooltip>
                            <IconActionTooltip label="Fill job placements">
                              <span className="inline-flex">
                                <Link to={`/job/${job.id}/fill`}>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-9 w-9 p-0"
                                    aria-label="Fill job placements"
                                  >
                                    <UserPlus className="h-4 w-4" />
                                  </Button>
                                </Link>
                              </span>
                            </IconActionTooltip>
                            <IconActionButton
                              label="Remove job (not available)"
                              variant="ghost"
                              size="sm"
                              className="h-9 w-9 p-0 opacity-40"
                              disabled
                            >
                              <X className="h-4 w-4" />
                            </IconActionButton>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>

            {totalPages > 1 && (
              <div className="mt-4 px-6 pb-6">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                      />
                    </PaginationItem>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const pg = i + 1;
                      return (
                        <PaginationItem key={pg}>
                          <PaginationLink
                            onClick={() => setCurrentPage(pg)}
                            isActive={currentPage === pg}
                            className="cursor-pointer"
                          >
                            {pg}
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