
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { Plus, Edit, ArrowLeft, ChevronsUpDown, ChevronUp, ChevronDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/utils';
import { usePreferences } from '@/hooks/usePreferences';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


interface Shift {
  id: number;
  clientId: number;
  name: string;
  startTime: string;
  endTime: string;
  meta: any;
}

interface ShiftsResponse {
  results: Shift[];
  total: number;
}

interface Client {
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


const ShiftManagement = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [client, setClient] = useState<Client | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalShifts, setTotalShifts] = useState(0);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    startTime: '',
    endTime: ''
  });

  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  // const { preferences, updateTablePreferences } = usePreferences();

  const [pageSize, setPageSize] = useState(10);
  // Sorting
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortColumn(null);
        setSortDirection(null);
      }
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };




  const fetchClient = async () => {
    try {
      const response = await apiRequest(`/client/${clientId}`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: Client = await response.json();
      setClient(data);
    } catch (error) {
      console.error('Error fetching client:', error);
      toast({
        title: "Error",
        description: "Failed to fetch client details",
        variant: "destructive",
      });
    }
  };

  const fetchShifts = async () => {
    try {
      setIsLoading(true);
      const url = `/client/${clientId}/shifts?offset=0&limit=9999`;
      const response = await apiRequest(url, { method: 'GET' });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data: ShiftsResponse = await response.json();
      setShifts(data.results || []);
      setTotalShifts(data.total || 0);
    } catch (error) {
      toast({ title: "Error", description: "Failed to fetch shifts", variant: "destructive" });
      setShifts([]);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredShifts = useMemo(() => {
    if (!searchTerm.trim()) return shifts;
    return shifts.filter((shift) =>
      shift.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [shifts, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredShifts.length / pageSize));

  useEffect(() => {
    if (clientId) {
      fetchClient();
      fetchShifts();
    }
  }, [clientId]);

  const handleCreateShift = async () => {
    try {
      const response = await apiRequest(`/client/${clientId}/shift`, {
        method: 'POST',
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const result = await response.json()
        throw new Error(
          result?.message ||
          'Failed to create shift'
        );
      }

      toast({
        title: "Success",
        description: "Shift created successfully",
      });

      setIsCreateDialogOpen(false);
      setFormData({ name: '', startTime: '', endTime: '' });
      fetchShifts();
    } catch (error) {
      console.error('Error creating shift:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEditShift = async () => {
    if (!editingShift) return;

    try {
      const response = await apiRequest(`/client/${clientId}/shift/${editingShift.id}`, {
        method: 'PUT',
        body: JSON.stringify({ name: formData.name }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      toast({
        title: "Success",
        description: "Shift updated successfully",
      });

      setIsEditDialogOpen(false);
      setEditingShift(null);
      setFormData({ name: '', startTime: '', endTime: '' });
      fetchShifts();
    } catch (error) {
      console.error('Error updating shift:', error);
      toast({
        title: "Error",
        description: "Failed to update shift",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (shift: Shift) => {
    setEditingShift(shift);
    setFormData({
      name: shift.name,
      startTime: shift.startTime,
      endTime: shift.endTime
    });
    setIsEditDialogOpen(true);
  };
  const handleCreateDialogChange = (open: boolean) => {
    setIsCreateDialogOpen(open);

    if (!open) {
      setFormData({
        name: '',
        startTime: '',
        endTime: ''
      });
    }
  };

  useEffect(() => {
    if (isCreateDialogOpen) {
      setFormData({
        name: '',
        startTime: '',
        endTime: '',
      });
    }
  }, [isCreateDialogOpen]);

  const sortedShifts = useMemo(() => {
    if (!sortColumn || !sortDirection) return filteredShifts;

    return [...filteredShifts].sort((a, b) => {
      const dir = sortDirection === 'asc' ? 1 : -1;

      switch (sortColumn) {
        case 'id':
          return (a.id - b.id) * dir;
        case 'name':
          return (a.name || '').localeCompare(b.name || '') * dir;
        case 'startTime':
          return (a.startTime || '').localeCompare(b.startTime || '') * dir;
        case 'endTime':
          return (a.endTime || '').localeCompare(b.endTime || '') * dir;
        default:
          return 0;
      }
    });
  }, [filteredShifts, sortColumn, sortDirection]);

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pages = [];
    const maxVisiblePages = 5;
    const startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

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
      <Pagination className="mt-6">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              href="#"
              onClick={(e) => {
                e.preventDefault();
                if (currentPage > 1) setCurrentPage(currentPage - 1);
              }}
              className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
            />
          </PaginationItem>
          {pages}
          <PaginationItem>
            <PaginationNext
              href="#"
              onClick={(e) => {
                e.preventDefault();
                if (currentPage < totalPages) setCurrentPage(currentPage + 1);
              }}
              className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    );
  };

  const paginatedShifts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedShifts.slice(start, start + pageSize);
  }, [sortedShifts, currentPage, pageSize]);


  const SortableTh = ({ column, children }: { column: string; children: React.ReactNode }) => (
    <TableHead
      className="cursor-pointer select-none whitespace-nowrap"
      onClick={() => handleSort(column)}
    >
      {children}
      <SortIcon column={column} sortColumn={sortColumn} sortDirection={sortDirection} />
    </TableHead>
  );


  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" asChild>
            <Link to="/clients">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Clients
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-[#000009]">Shift Management</h1>
            <p className="text-gray-600 mt-1">
              Manage shifts for {client?.name || 'Client'}
            </p>
          </div>
        </div>

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-[#000009]">Shifts</CardTitle>
                <CardDescription>View and manage client shifts</CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <div className="relative w-full sm:w-72">
                  <Input
                    placeholder="Search shift names..."
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    className="pl-10"
                  />
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 text-gray-400 absolute left-3 top-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <Select value={String(pageSize)} onValueChange={(value) => {
                  setPageSize(Number(value));
                  setCurrentPage(1);
                }}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 per page</SelectItem>
                    <SelectItem value="20">20 per page</SelectItem>
                    <SelectItem value="50">50 per page</SelectItem>
                    <SelectItem value="100">100 per page</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Dialog
                open={isCreateDialogOpen}
                onOpenChange={handleCreateDialogChange}
              >
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Shift
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Shift</DialogTitle>
                    <DialogDescription>
                      Add a new shift for {client?.name}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="name" className="text-right pr-10">
                        Name
                      </Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="col-span-3"
                        placeholder="Enter a Shift Name"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="startTime" className="text-right pr-4">
                        Start Time
                      </Label>
                      <Input
                        id="startTime"
                        type="time"
                        value={formData.startTime}
                        onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                        className="col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4 ">
                      <Label htmlFor="endTime" className="text-right pr-6">
                        End Time
                      </Label>
                      <Input
                        id="endTime"
                        type="time"
                        value={formData.endTime}
                        onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                        className="col-span-3"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleCreateShift}>Create Shift</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {!isLoading && (
              <div className="mb-4 text-sm text-gray-600">
                Showing {paginatedShifts.length} of {filteredShifts.length} shifts
                {searchTerm && " (filtered)"}
              </div>
            )}

            {isLoading ? (
              <div className="text-center py-12">
                <p className="text-gray-500">Loading shifts...</p>
              </div>
            ) : shifts.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">No shifts found.</p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <SortableTh column="id">ID</SortableTh>
                      <SortableTh column="name">Name</SortableTh>
                      <SortableTh column="startTime">Start Time</SortableTh>
                      <SortableTh column="endTime">End Time</SortableTh>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedShifts.map((shift) => (
                      <TableRow key={shift.id}>
                        <TableCell className="font-medium">{shift.id}</TableCell>
                        <TableCell>{shift.name}</TableCell>
                        <TableCell>{shift.startTime}</TableCell>
                        <TableCell>{shift.endTime}</TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(shift)}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Edit Name
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {renderPagination()}
              </>
            )}
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Shift Name</DialogTitle>
              <DialogDescription>
                Update the name for this shift. Start and end times cannot be changed.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="editName" className="text-right">
                  Name
                </Label>
                <Input
                  id="editName"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="col-span-3"
                  placeholder="Shift name"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right text-muted-foreground">
                  Start Time
                </Label>
                <Input
                  value={formData.startTime}
                  className="col-span-3"
                  disabled
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right text-muted-foreground">
                  End Time
                </Label>
                <Input
                  value={formData.endTime}
                  className="col-span-3"
                  disabled
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleEditShift}>Update Shift</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default ShiftManagement;
