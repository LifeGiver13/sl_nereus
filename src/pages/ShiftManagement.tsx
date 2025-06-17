
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { Plus, Edit, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { API_BASE_URL } from '../config/env';

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

const ShiftManagement = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [client, setClient] = useState<Client | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalShifts, setTotalShifts] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    startTime: '',
    endTime: ''
  });
  const { toast } = useToast();

  const pageSize = 10;

  const fetchClient = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/client/${clientId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
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

  const fetchShifts = async (page = 1) => {
    try {
      setIsLoading(true);
      const offset = (page - 1) * pageSize;
      const url = `${API_BASE_URL}/client/${clientId}/shifts?offset=${offset}&limit=${pageSize}`;

      console.log('Fetching shifts from:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ShiftsResponse = await response.json();
      console.log('Shifts data received:', data);
      
      setShifts(data.results || []);
      setTotalShifts(data.total || 0);
      setTotalPages(Math.ceil((data.total || 0) / pageSize));
    } catch (error) {
      console.error('Error fetching shifts:', error);
      toast({
        title: "Error",
        description: "Failed to fetch shifts",
        variant: "destructive",
      });
      setShifts([]);
      setTotalShifts(0);
      setTotalPages(0);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (clientId) {
      fetchClient();
      fetchShifts(currentPage);
    }
  }, [clientId, currentPage]);

  const handleCreateShift = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/client/${clientId}/shift`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      toast({
        title: "Success",
        description: "Shift created successfully",
      });

      setIsCreateDialogOpen(false);
      setFormData({ name: '', startTime: '', endTime: '' });
      fetchShifts(currentPage);
    } catch (error) {
      console.error('Error creating shift:', error);
      toast({
        title: "Error",
        description: "Failed to create shift",
        variant: "destructive",
      });
    }
  };

  const handleEditShift = async () => {
    if (!editingShift) return;

    try {
      const response = await fetch(`${API_BASE_URL}/client/${clientId}/shift/${editingShift.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
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
      fetchShifts(currentPage);
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
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
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
                      <Label htmlFor="name" className="text-right">
                        Name
                      </Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="col-span-3"
                        placeholder="Shift name"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="startTime" className="text-right">
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
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="endTime" className="text-right">
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
                Showing {shifts.length} of {totalShifts} shifts
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
                      <TableHead>ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Start Time</TableHead>
                      <TableHead>End Time</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shifts.map((shift) => (
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
