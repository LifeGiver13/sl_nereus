
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import EditClientModal from '../components/EditClientModal';
import CreateClientModal from '../components/CreateClientModal';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Eye, Edit, Briefcase, Trash2, Search, MoreVertical, Clock, Plus, MapPin } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { API_BASE_URL } from '../config/env';
import { PageSizeSelector } from '../components/ui/page-size-selector';
import { usePreferences } from '../hooks/usePreferences';
import { IconActionTooltip } from '@/components/IconActionTooltip';

interface Client {
  id: number;
  name: string;
  status: string;
  profile: any;
  meta: any;
  createdAt: string;
  updatedAt: string;
}

interface ClientsResponse {
  results: Client[];
  total: number;
}

const Clients = () => {
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalClients, setTotalClients] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const { toast } = useToast();

  const [pageSize, setPageSize] = useState(10);

  const fetchClients = async (page = 1, search = '') => {
    try {
      setIsLoading(true);
      let url = `${API_BASE_URL}/clients?offset=${(page - 1) * pageSize}&limit=${pageSize}`;
      
      if (search.trim()) {
        const searchObject = {
          name: { "like": `%${search}%` }
        };
        url += `&search=${encodeURIComponent(JSON.stringify(searchObject))}`;
      }

      console.log('Fetching clients from:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ClientsResponse = await response.json();
      console.log('Clients data received:', data);
      
      setClients(data.results || []);
      setTotalClients(data.total || 0);
      setTotalPages(Math.ceil((data.total || 0) / pageSize));
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast({
        title: "Error",
        description: "Failed to fetch clients",
        variant: "destructive",
      });
      setClients([]);
      setTotalClients(0);
      setTotalPages(0);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClients(currentPage, searchTerm);
  }, [currentPage, pageSize]);

  const handleSearch = () => {
    setCurrentPage(1);
    fetchClients(1, searchTerm);
  };

  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleEditClient = (client: Client) => {
    setSelectedClient(client);
    setIsEditModalOpen(true);
  };

  const handleClientUpdated = () => {
    fetchClients(currentPage, searchTerm);
    toast({
      title: "Success",
      description: "Client updated successfully and list refreshed",
    });
  };

  const handleClientCreated = () => {
    fetchClients(currentPage, searchTerm);
    toast({
      title: "Success",
      description: "Client created successfully",
    });
  };

  const handleDelete = async (clientId: number) => {
    if (window.confirm('Are you sure you want to delete this client?')) {
      try {
        const response = await fetch(`${API_BASE_URL}/client/${clientId}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        toast({
          title: "Success",
          description: "Client deleted successfully",
        });

        // Refresh the current page
        fetchClients(currentPage, searchTerm);
      } catch (error) {
        console.error('Error deleting client:', error);
        toast({
          title: "Error",
          description: "Failed to delete client",
          variant: "destructive",
        });
      }
    }
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
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-[#000009]">Clients</h1>
            <p className="text-gray-600 mt-1">Manage client companies and relationships</p>
          </div>
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Client
          </Button>
        </div>

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-[#000009]">Client Management</CardTitle>
                <CardDescription>View and manage your client portfolio</CardDescription>
              </div>
              <PageSizeSelector
                pageSize={pageSize}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setCurrentPage(1);
                }}
                totalItems={totalClients}
              />
            </div>
          </CardHeader>
          <CardContent>
            {/* Search Bar */}
            <div className="flex gap-2 mb-6">
              <div className="flex-1">
                <Input
                  placeholder="Search clients by name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={handleSearchKeyPress}
                />
              </div>
              <Button onClick={handleSearch} variant="outline">
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
            </div>

            {/* Results Summary */}
            {!isLoading && (
              <div className="mb-4 text-sm text-gray-600">
                Showing {clients.length} of {totalClients} clients
                {searchTerm && ` for "${searchTerm}"`}
              </div>
            )}

            {/* Clients Table */}
            {isLoading ? (
              <div className="text-center py-12">
                <p className="text-gray-500">Loading clients...</p>
              </div>
            ) : clients.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">
                  {searchTerm ? 'No clients found matching your search.' : 'No clients found.'}
                </p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clients.map((client) => (
                      <TableRow key={client.id} className="cursor-pointer hover:bg-gray-50" onClick={() => window.location.href = `/client/${client.id}`}>
                        <TableCell className="font-medium">{client.id}</TableCell>
                        <TableCell>{client.name}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            client.status === 'active' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {client.status}
                          </span>
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              asChild
                            >
                              <Link to={`/client/${client.id}`}>
                                <Eye className="h-4 w-4 mr-1" />
                                View Details
                              </Link>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditClient(client)}
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/jobs/create?clientId=${client.id}&clientName=${encodeURIComponent(client.name)}`)}
                            >
                              <Briefcase className="h-4 w-4 mr-1" />
                              Post Job
                            </Button>
                            <DropdownMenu>
                              <IconActionTooltip label="More actions">
                                <span className="inline-flex">
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-9 w-9 p-0"
                                      aria-label="More actions"
                                    >
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                </span>
                              </IconActionTooltip>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                  <Link to={`/client/${client.id}/shifts`}>
                                    <Clock className="h-4 w-4 mr-2" />
                                    Manage Shifts
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <Link to={`/client/${client.id}/positions`}>
                                    <MapPin className="h-4 w-4 mr-2" />
                                    Manage Positions
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleDelete(client.id)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Pagination */}
                {renderPagination()}
              </>
            )}
          </CardContent>
        </Card>

        <EditClientModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          client={selectedClient}
          onClientUpdated={handleClientUpdated}
        />
        
        <CreateClientModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onClientCreated={handleClientCreated}
        />
      </div>
    </AdminLayout>
  );
};

export default Clients;
