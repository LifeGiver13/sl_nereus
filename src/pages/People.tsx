import React, { useState, useEffect, useMemo } from 'react';
import AdminLayout from '../components/AdminLayout';
import CreateUserModal from '../components/CreateUserModal';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Eye, Edit, Briefcase, ChevronLeft, ChevronRight, Plus, ChevronsUpDown, ChevronUp, ChevronDown } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { API_BASE_URL } from '../config/env';
import { PageSizeSelector } from '../components/ui/page-size-selector';
import { usePreferences } from '../hooks/usePreferences';
import { IconActionButton, IconActionTooltip } from '@/components/IconActionTooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from '@/components/ui/select';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import PlatformBadges from '@/components/PlatformBadges';


interface User {
  id: number;
  username: string;
  status: string;
  role: string;
  lastLogin: string;
  createdAt: string;
  updatedAt: string;
  profile: { [key: string]: any };
  meta: { [key: string]: any };
}

interface UsersResponse {
  results: User[];
  total: number;
  page: number;
  limit: number;
}

type DateRangeOption = 'all' | 'today' | 'this_week' | 'this_month';
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

const getDateRangeBounds = (range: DateRangeOption): { from: string; to: string } | null => {
  if (range === 'all') return null;

  const now = new Date();
  let from: Date;
  let to: Date;

  if (range === 'today') {
    // Start of today in UTC
    from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
    to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
  }
  else if (range === 'this_week') {
    const day = now.getUTCDay(); // Use UTC day
    const diffToMonday = day === 0 ? -6 : 1 - day;

    from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + diffToMonday, 0, 0, 0, 0));

    to = new Date(from);
    to.setUTCDate(to.getUTCDate() + 6);
    to.setUTCHours(23, 59, 59, 999);
  }
  else if (range === 'this_month') {
    from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
    to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));
  }
  else {
    return null;
  }

  return {
    from: from.toISOString(),
    to: to.toISOString(),
  };
};

const People = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [selectedRole, setSelectedRole] = useState<string>('worker');
  const [selectedStatus, setSelectedStatus] = useState<string>('active');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { toast } = useToast();

  const { preferences, updateTablePreferences } = usePreferences();
  const itemsPerPage = preferences.table.pageSize || 10;
  const totalPages = Math.ceil(total / itemsPerPage);


  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);


  const [lastLoginRange, setLastLoginRange] = useState<DateRangeOption>('all');

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      if (sortDirection === 'asc') setSortDirection('desc');
      else if (sortDirection === 'desc') { setSortColumn(null); setSortDirection(null); }
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const fetchUsers = async () => {
    try {
      setIsLoading(true);

      let url = `${API_BASE_URL}/users?page=${currentPage}&limit=${itemsPerPage}&offset=${(currentPage - 1) * itemsPerPage}`;

      // Build search object
      const searchObj: any = {};

      const searchFeilds = ['username', 'profile.fullName', 'profile.firstName', 'profile.lastName', 'profile.middleNames', 'profile.MiddleNames','profile.middleName', 'profile.MiddleName', 'profile.ForeName', 'profile.Surename']; // fields to search in

      if (searchTerm.trim() !== '') {
        searchObj.or = searchFeilds.map((feild) => ({
          [feild]: { like: `%${searchTerm}%` }
        }
        )
        )

      }

      if (selectedRole && selectedRole !== 'all') {
        searchObj.role = selectedRole;
      }
      if (selectedStatus && selectedStatus !== 'all') {
        searchObj.status = selectedStatus;
      }

      const bounds = getDateRangeBounds(lastLoginRange);
      if (bounds) {
        searchObj.createdAt = {
          gte: bounds.from,
          lte: bounds.to,
        };
      }
      if (Object.keys(searchObj).length > 0) {
        url += `&search=${encodeURIComponent(JSON.stringify(searchObj))}`;
      }

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: UsersResponse = await response.json();
      console.log('Users data received:', data);
      setUsers(data.results);
      setTotal(data.total);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error",
        description: "Failed to fetch users",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  const clearFilters = () => {
    setSelectedRole('all');
    setSelectedStatus('all');
    setSearchTerm('');
    setLastLoginRange('all');
    setCurrentPage(1);
  };

  useEffect(() => {
    fetchUsers();
  }, [currentPage, searchTerm, selectedRole, selectedStatus, itemsPerPage, lastLoginRange]);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const getMatchingFields = () => {
    if (!searchTerm.trim()) return [];

    const term = searchTerm.toLowerCase(); //convert search term to lowercase for case-insensitive comparison

    const matchedCounts: Record<string, number> = {};

    users.forEach((user) => {
      const fieldsToCheck = [
        {
          label: 'Username',
          value: user.username,
        },
        {
          label: 'Full Name',
          value: user?.profile?.fullName
        },
        {
          label: 'First Name',
          value: user?.profile?.firstName
        },
        {
          label: 'Last Name',
          value: user?.profile?.lastName
        },
        {
          label: 'Middle Name(s)',
          value: user?.profile?.middleNames || user?.profile?.MiddleNames
        },
        {
          label: 'Fore Name',
          value: user?.profile?.ForeName
        },
        {
          label: 'Surename',
          value: user?.profile?.Surename
        },
      ]

      fieldsToCheck.forEach((field) => {
        if (
          typeof field.value === 'string' &&
          field.value.toLowerCase().includes(term)
        ) {
          matchedCounts[field.label] =
            (matchedCounts[field.label] || 0) + 1;
        }
      });

    });

    return matchedCounts;
  }



  const handleUserCreated = () => {
    fetchUsers(); // Refresh the user list
    toast({
      title: "Success",
      description: "User created successfully and list refreshed",
    });
  };



  const getStatusBadge = (status: string) => {
    const statusColors: { [key: string]: string } = {
      'active': 'bg-green-100 text-green-800',
      'inactive': 'bg-gray-100 text-gray-800',
      'pending': 'bg-yellow-100 text-yellow-800',
      'suspended': 'bg-red-100 text-red-800',
    };

    return (
      <Badge className={statusColors[status] || 'bg-gray-100 text-gray-800'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getRoleBadge = (role: string) => {
    const roleColors: { [key: string]: string } = {
      'applicant': 'bg-blue-100 text-blue-800',
      'worker': 'bg-green-100 text-green-800',
      'client': 'bg-purple-100 text-purple-800',
      'admin': 'bg-orange-100 text-orange-800',
      'super_admin': 'bg-red-100 text-red-800',
    };

    return (
      <Badge className={roleColors[role] || 'bg-gray-100 text-gray-800'}>
        {role.charAt(0).toUpperCase() + role.slice(1)}
      </Badge>
    );
  };


  function formatDate(value: string): string {
    if (!value) return "Never";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "-";

    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).replace(/\//g, '/');
  }

  const matchedFields = getMatchingFields();


  const sortedUsers = useMemo(() => {


    let list = [...users];
    if (!sortColumn || !sortDirection) return list;

    const dir = sortDirection === 'asc' ? 1 : -1;

    return list.sort((a, b) => {
      switch (sortColumn) {
        case 'id':
          return (a.id - b.id) * dir;

        case 'fullName': {
          const aName =
            a.profile?.fullName ||
            `${a.profile?.firstName || ''} ${a.profile?.lastName || ''}`.trim();

          const bName =
            b.profile?.fullName ||
            `${b.profile?.firstName || ''} ${b.profile?.lastName || ''}`.trim();

          return aName.localeCompare(bName) * dir;
        }

        case 'username':
          return a.username.localeCompare(b.username) * dir;

        case 'status':
          return a.status.localeCompare(b.status) * dir;

        case 'role':
          return a.role.localeCompare(b.role) * dir;

        case 'lastLogin':
          return (
            (new Date(a.lastLogin || 0).getTime() -
              new Date(b.lastLogin || 0).getTime()) *
            dir
          );

        case 'createdAt':
          return (
            (new Date(a.createdAt).getTime() -
              new Date(b.createdAt).getTime()) *
            dir
          );

        case 'updatedAt':
          return (
            (new Date(a.updatedAt).getTime() -
              new Date(b.updatedAt).getTime()) *
            dir
          );

        default:
          return 0;
      }
    });
  }, [users, sortColumn, sortDirection, lastLoginRange]);



  //pagination
  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pages = [];
    const maxVisiblePages = 5;

    let startPage = Math.max(
      1,
      currentPage - Math.floor(maxVisiblePages / 2)
    );

    let endPage = Math.min(
      totalPages,
      startPage + maxVisiblePages - 1
    );

    // Shift window left if near the end
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(
        1,
        endPage - maxVisiblePages + 1
      );
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <PaginationItem key={i}>
          <PaginationLink
            href="#"
            isActive={i === currentPage}
            onClick={(e) => {
              e.preventDefault();
              setCurrentPage(i);
            }}
          >
            {i}
          </PaginationLink>
        </PaginationItem>
      );
    }

    return (
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
        {/* <div className="text-sm text-muted-foreground">
          Showing {(currentPage - 1) * itemsPerPage + 1}
          {" - "}
          {Math.min(currentPage * itemsPerPage, total)}
          {" of "}
          {total} users
        </div> */}

        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e) => {
                  e.preventDefault();

                  if (currentPage > 1) {
                    setCurrentPage(currentPage - 1);
                  }
                }}
                className={
                  currentPage === 1
                    ? "pointer-events-none opacity-50"
                    : ""
                }
              />
            </PaginationItem>

            {pages}

            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(e) => {
                  e.preventDefault();

                  if (currentPage < totalPages) {
                    setCurrentPage(currentPage + 1);
                  }
                }}
                className={
                  currentPage === totalPages
                    ? "pointer-events-none opacity-50"
                    : ""
                }
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    );
  };


  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#000009]">People</h1>
            <p className="text-gray-600 mt-1">Manage user accounts and profiles</p>
          </div>
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-[#712B71] hover:bg-[#712B71]/90"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create User
          </Button>
        </div>

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-[#000009]">User Management</CardTitle>
                <CardDescription>Search and manage all users in the system</CardDescription>
              </div>
              <PageSizeSelector
                pageSize={itemsPerPage}
                onPageSizeChange={(size) => {
                  updateTablePreferences({ pageSize: size });
                  setCurrentPage(1);
                }}
                totalItems={total}
              />
            </div>
          </CardHeader>
          <CardContent>
            {/* Search and Filter Controls */}
            <div className="flex flex-col gap-4 mb-6">
              <div className="flex gap-4 items-center">
                <Input
                  placeholder="Search by Username, First Name, Last Name, or Middle Name(s)..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full max-w-xl"
                />
                <p className='text-sm text-muted-foreground  whitespace-nowrap'>
                  {searchTerm.trim()
                    ? `${total} match${total !== 1 ? 'es' : ""} 
                      found${Object.keys(matchedFields).length
                      ? ` in ${Object.entries(matchedFields)
                        .map(([field, count]) => `${field} (${count})`)
                        .join(", ")}`
                      : ""}`
                    : `${total} users found`
                  }
                </p>



              </div>



              <div className="flex gap-4 flex-wrap">
                {/* Role Filter */}
                <div className="flex flex-col gap-2 min-w-[220px]">
                  <label className="text-sm font-medium">Role Filter</label>

                  <Select
                    value={selectedRole}
                    onValueChange={(value) => {
                      setSelectedRole(value);
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>

                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      <SelectItem value="worker">Worker</SelectItem>
                      <SelectItem value="applicant">Applicant</SelectItem>
                      <SelectItem value="client">Client</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="super_admin">Super Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Status Filter */}
                <div className="flex flex-col gap-2 min-w-[220px]">
                  <label className="text-sm font-medium">Status Filter</label>

                  <Select
                    value={selectedStatus}
                    onValueChange={(value) => {
                      setSelectedStatus(value);
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>

                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-2 min-w-[220px]">
                  <label className="text-sm font-medium">Created</label>
                  <Select value={lastLoginRange} onValueChange={(value) => { setLastLoginRange(value as DateRangeOption); setCurrentPage(1); }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Time</SelectItem>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="this_week">This Week</SelectItem>
                      <SelectItem value="this_month">This Month</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="pt-7 flex gap-2">
                  <Button onClick={clearFilters} variant="outline">
                    Clear Filters
                  </Button>
                </div>
              </div>
            </div>


            {isLoading ? (
              <div className="text-center py-8">
                <p className="text-gray-500">Loading users...</p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead
                        className="cursor-pointer select-none"
                        onClick={() => handleSort('id')}>
                        ID
                        <SortIcon
                          column="id"
                          sortColumn={sortColumn}
                          sortDirection={sortDirection}
                        />
                      </TableHead>
                      <TableHead
                        className="cursor-pointer select-none"
                        onClick={() => handleSort('fullName')}>
                        Full Name
                        <SortIcon
                          column="fullName"
                          sortColumn={sortColumn}
                          sortDirection={sortDirection}
                        />
                      </TableHead>
                      <TableHead
                        className="cursor-pointer select-none"
                        onClick={() => handleSort('username')}>
                        Username
                        <SortIcon
                          column="username"
                          sortColumn={sortColumn}
                          sortDirection={sortDirection}
                        />
                      </TableHead>
                      <TableHead
                        className="cursor-pointer select-none"
                        onClick={() => handleSort('status')}>
                        Status
                        <SortIcon
                          column="status"
                          sortColumn={sortColumn}
                          sortDirection={sortDirection}
                        />
                      </TableHead>
                      <TableHead
                        className="cursor-pointer select-none"
                        onClick={() => handleSort('role')}>
                        Role
                        <SortIcon
                          column="role"
                          sortColumn={sortColumn}
                          sortDirection={sortDirection}
                        />

                      </TableHead>
                      <TableHead
                        className="cursor-pointer select-none"
                        onClick={() => handleSort('lastLogin')}>
                        Last Login
                        <SortIcon
                          column="lastLogin"
                          sortColumn={sortColumn}
                          sortDirection={sortDirection}
                        />

                      </TableHead>
                      <TableHead
                        className="cursor-pointer select-none"
                        onClick={() => handleSort('createdAt')}>
                        Created
                        <SortIcon
                          column="createdAt"
                          sortColumn={sortColumn}
                          sortDirection={sortDirection}
                        />
                      </TableHead>
                      <TableHead
                        className="cursor-pointer select-none"
                        onClick={() => handleSort('updatedAt')}>
                        Updated
                        <SortIcon
                          column="updatedAt"
                          sortColumn={sortColumn}
                          sortDirection={sortDirection}
                        />
                      </TableHead>
                      <TableHead>Platforms</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedUsers.map((user) => (
                      <TableRow key={user.id} className="cursor-pointer hover:bg-gray-50" onClick={() => window.location.href = `/user/${user.id}`}>
                        <TableCell>
                          {user.id}
                        </TableCell>
                        <TableCell className="font-medium">
                          {user?.profile?.fullName ||
                            (user?.profile?.firstName && user?.profile?.lastName
                              ? `${user.profile.firstName} ${user.profile.lastName}`
                              : `${user.profile.Forename || ''} ${user.profile.Surname || ''}` || "-")}

                          {/* {user?.profile?.fullName || user?.profile?.firstName || user?.profile?.lastName || "-"} */}
                        </TableCell>
                        <TableCell className="font-medium">
                          {user.username}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(user.status)}
                        </TableCell>
                        <TableCell>
                          {getRoleBadge(user.role)}
                        </TableCell>
                        <TableCell>{formatDate(user.lastLogin)}</TableCell>
                        <TableCell>{formatDate(user.createdAt)}</TableCell>
                        <TableCell>{formatDate(user.updatedAt)}</TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <PlatformBadges platform={user?.meta?.pushTokens} size="sm" />
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <IconActionTooltip label="View user">
                              <span className="inline-flex">
                                <Button variant="outline" size="sm" className="h-9 w-9 p-0" asChild>
                                  <Link to={`/user/${user.id}`} aria-label="View user">
                                    <Eye className="h-4 w-4" />
                                  </Link>
                                </Button>
                              </span>
                            </IconActionTooltip>
                            <IconActionButton
                              label="Edit user"
                              variant="outline"
                              size="sm"
                              className="h-9 w-9 p-0"
                              onClick={() => {
                                navigate(`/user/${user.id}/edit`);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </IconActionButton>
                            <IconActionButton
                              label="Placements"
                              variant="outline"
                              size="sm"
                              className="h-9 w-9 p-0"
                              disabled
                            >
                              <Briefcase className="h-4 w-4" />
                            </IconActionButton>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Pagination */}

                {renderPagination()}
                {/* <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-gray-500">
                    Showing {users.length} of {total} results
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <span className="text-sm text-gray-500 flex items-center px-2">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div> */}
              </>
            )}
          </CardContent>
        </Card>

        <CreateUserModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onUserCreated={handleUserCreated}
        />
      </div>
    </AdminLayout>
  );
};

export default People;
