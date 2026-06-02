import React, { useState, useEffect } from 'react';
import AdminLayout from '../components/AdminLayout';
import CreateUserModal from '../components/CreateUserModal';
import EditUserModal from '../components/EditUserModal';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Eye, Edit, Briefcase, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { API_BASE_URL } from '../config/env';
import { PageSizeSelector } from '../components/ui/page-size-selector';
import { usePreferences } from '../hooks/usePreferences';
import { IconActionButton, IconActionTooltip } from '@/components/IconActionTooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from '@/components/ui/select';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';


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

const People = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [selectedRole, setSelectedRole] = useState<string>('worker');
  const [selectedStatus, setSelectedStatus] = useState<string>('active');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const { toast } = useToast();

  const { preferences, updateTablePreferences } = usePreferences();
  const itemsPerPage = preferences.table.pageSize;
  const totalPages = Math.ceil(total / itemsPerPage);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);

      let url = `${API_BASE_URL}/users?page=${currentPage}&limit=${itemsPerPage}`;

      // Build search object
      const searchObj: any = {};

      const searchFeilds = ['username', 'profile.fullName', 'profile.firstName', 'profile.lastName', 'profile.middleNames', 'profile.MiddleNames', 'profile.ForeName', 'profile.Surename']; // fields to search in

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

  useEffect(() => {
    fetchUsers();
  }, [currentPage, searchTerm, selectedRole, selectedStatus, itemsPerPage]);

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

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setIsEditModalOpen(true);
  };

  const handleUserUpdated = () => {
    fetchUsers(); // Refresh the user list
    toast({
      title: "Success",
      description: "User updated successfully and list refreshed",
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
        {status}
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
        {role}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString();
  };

  const matchedFields = getMatchingFields();


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
                      <TableHead>ID</TableHead>
                      <TableHead>Full Name</TableHead>
                      <TableHead>Username</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Last Login</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Updated</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id} className="cursor-pointer hover:bg-gray-50" onClick={() => window.location.href = `/user/${user.id}`}>
                        <TableCell>{user.id}</TableCell>
                        <TableCell className="font-medium">{user?.profile?.fullName || user?.profile?.firstName || user?.profile?.lastName || "-"}</TableCell>
                        <TableCell className="font-medium"> {user.username}</TableCell>
                        <TableCell>{getStatusBadge(user.status)}</TableCell>
                        <TableCell>{getRoleBadge(user.role)}</TableCell>
                        <TableCell>{formatDate(user.lastLogin)}</TableCell>
                        <TableCell>{formatDate(user.createdAt)}</TableCell>
                        <TableCell>{formatDate(user.updatedAt)}</TableCell>
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
                              onClick={() => handleEditUser(user)}
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

        <EditUserModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          user={selectedUser}
          onUserUpdated={handleUserUpdated}
        />
      </div>
    </AdminLayout>
  );
};

export default People;
