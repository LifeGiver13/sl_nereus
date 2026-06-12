import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import CreateShiftModal from '../components/CreateShiftModal';
import CreatePositionModal from '../components/CreatePositionModal';
import SimilarJobsPanel from '../components/SimilarJobsPanel';
import { useSimilarJobs } from '../hooks/useSimilarJobs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ArrowLeft, Save, X, Plus, CalendarIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '../contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { API_BASE_URL } from '../config/env';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface Client {
  id: number;
  name: string;
}

interface Skill {
  id: number;
  name: string;
}

interface Department {
  id: number;
  name: string;
}

interface Shift {
  id: number;
  name: string;
  startTime: string;
  endTime: string;
}

interface Position {
  id: number;
  title: string;
  description: string;
  skills: number[];
}

const JobCreate = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [selectedSkills, setSelectedSkills] = useState<Skill[]>([]);
  const [skillSearchTerm, setSkillSearchTerm] = useState('');
  const [availableSkills, setAvailableSkills] = useState<Skill[]>([]);
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [isPositionModalOpen, setIsPositionModalOpen] = useState(false);
  const [selectedPositionId, setSelectedPositionId] = useState<number | null>(null);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    vacancies: '',
    departmentId: '',
    shiftId: '',
    includeWeekends: false
  });

  // Check for similar jobs
  const { similarJobs, isLoading: isLoadingSimilarJobs, hasSimilarJobs } = useSimilarJobs({
    clientId: selectedClientId,
    departmentId: formData.departmentId,
    positionId: selectedPositionId,
    startDate: startDate ? format(startDate, 'yyyy-MM-dd') : '',
    endDate: endDate ? format(endDate, 'yyyy-MM-dd') : ''
  });

  // Fetch skills data
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

  // Fetch departments
  const { data: departmentsData } = useQuery({
    queryKey: ['departments-list'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/utils/department-list`);
      if (!response.ok) {
        throw new Error('Failed to fetch departments');
      }
      return response.json();
    }
  });

  // Transform departments object to array
  const departments = departmentsData ? Object.entries(departmentsData).map(([id, name]) => ({
    id: parseInt(id),
    name: name as string
  })) : [];

  // Fetch shifts for selected client
  const { data: shiftsData, refetch: refetchShifts } = useQuery({
    queryKey: ['client-shifts', selectedClientId],
    queryFn: async () => {
      if (!selectedClientId) return [];
      const response = await fetch(`${API_BASE_URL}/utils/client/${selectedClientId}/shifts`);
      if (!response.ok) {
        throw new Error('Failed to fetch shifts');
      }
      return response.json();
    },
    enabled: !!selectedClientId
  });

  // Fetch positions for selected client
  const { data: positionsData, refetch: refetchPositions } = useQuery({
    queryKey: ['client-positions-list', selectedClientId],
    queryFn: async () => {
      if (!selectedClientId) return {};
      const response = await fetch(`${API_BASE_URL}/utils/client/${selectedClientId}/positions`);
      if (!response.ok) {
        throw new Error('Failed to fetch positions');
      }
      return response.json();
    },
    enabled: !!selectedClientId
  });

  // Fetch detailed position data when position is selected
  const { data: selectedPositionData } = useQuery({
    queryKey: ['position-detail', selectedClientId, selectedPositionId],
    queryFn: async () => {
      if (!selectedClientId || !selectedPositionId) return null;
      const response = await fetch(`${API_BASE_URL}/client/${selectedClientId}/position/${selectedPositionId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch position details');
      }
      return response.json();
    },
    enabled: !!selectedClientId && !!selectedPositionId
  });

  // Transform shifts data to array if it's an object, otherwise use as-is
  const shifts = shiftsData ? (Array.isArray(shiftsData) ? shiftsData : Object.entries(shiftsData).map(([id, shiftData]: [string, any]) => ({
    id: parseInt(id),
    name: shiftData,
  }))) : [];

  // Transform positions data to array
  const positions = positionsData ? Object.entries(positionsData).map(([id, name]) => ({
    id: parseInt(id),
    name: name as string
  })) : [];

  // Load skills when data is available
  useEffect(() => {
    if (skillsData) {
      const allSkills: Skill[] = [];
      Object.values(skillsData).forEach((categorySkills: any) => {
        allSkills.push(...categorySkills);
      });
      setAvailableSkills(allSkills);
    }
  }, [skillsData]);

  // Handle pre-selected client from URL params
  useEffect(() => {
    const clientIdParam = searchParams.get('clientId');
    const clientNameParam = searchParams.get('clientName');
    
    if (clientIdParam && clientNameParam) {
      setSelectedClientId(parseInt(clientIdParam));
      setClientSearchTerm(decodeURIComponent(clientNameParam));
    }
  }, [searchParams]);


  // Reset shift and position selection when client changes
  useEffect(() => {
    setFormData(prev => ({ ...prev, shiftId: '', title: '', description: '' }));
    setSelectedPositionId(null);
    setSelectedSkills([]);
  }, [selectedClientId]);

  // Auto-populate fields when position is selected
  useEffect(() => {
    if (selectedPositionData) {
      setFormData(prev => ({
        ...prev,
        title: selectedPositionData.title || '',
        description: selectedPositionData.description || ''
      }));

      // Auto-populate skills
      if (selectedPositionData.skills && availableSkills.length > 0) {
        const positionSkills = availableSkills.filter(skill =>
          selectedPositionData.skills.includes(skill.id)
        );
        setSelectedSkills(positionSkills);
      }
    }
  }, [selectedPositionData, availableSkills]);

  const searchClients = async (searchTerm: string) => {
    if (searchTerm.length < 2) {
      setClients([]);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/utils/client-list/${encodeURIComponent(searchTerm)}`);
      if (response.ok) {
        const clientData = await response.json();
        const clientArray = Object.entries(clientData).map(([id, name]) => ({
          id: parseInt(id),
          name: name as string
        }));
        setClients(clientArray);
      }
    } catch (error) {
      console.error('Error searching clients:', error);
    }
  };

  const handleClientSearch = (value: string) => {
    setClientSearchTerm(value);
    searchClients(value);
  };

  const handleClientSelect = (client: Client) => {
    setSelectedClientId(client.id);
    setClientSearchTerm(client.name);
    setClients([]);
  };

  const filteredSkills = availableSkills.filter(skill =>
    skill.name.toLowerCase().includes(skillSearchTerm.toLowerCase()) &&
    !selectedSkills.some(selected => selected.id === skill.id)
  );

  const handleSkillSelect = (skill: Skill) => {
    setSelectedSkills([...selectedSkills, skill]);
    setSkillSearchTerm('');
  };

  const handleSkillRemove = (skillToRemove: Skill) => {
    setSelectedSkills(selectedSkills.filter(skill => skill.id !== skillToRemove.id));
  };

  const handleShiftCreated = async (newShift: Shift) => {
    console.log('=== SHIFT CREATED ===');
    console.log('New shift received:', newShift);
    console.log('New shift ID:', newShift.id);
    
    // Wait for refetch to complete
    await refetchShifts();
    console.log('Shifts refetched');
    
    const shiftIdString = newShift.id.toString();
    console.log('Setting shift ID to:', shiftIdString);
    
    setFormData(prev => {
      const updated = { ...prev, shiftId: shiftIdString };
      console.log('Updated formData after shift creation:', updated);
      return updated;
    });
    console.log('=== END SHIFT CREATED ===');
  };

  const handlePositionCreated = async (newPosition: Position) => {
    console.log('=== POSITION CREATED ===');
    console.log('New position received:', newPosition);
    console.log('New position ID:', newPosition.id);
    
    // Wait for refetch to complete
    await refetchPositions();
    console.log('Positions refetched');
    
    console.log('Setting position ID to:', newPosition.id);
    setSelectedPositionId(newPosition.id);
    console.log('Selected position ID set to:', newPosition.id);
    console.log('=== END POSITION CREATED ===');
  };

  const handlePositionSelect = (positionId: string) => {
    const id = parseInt(positionId);
    setSelectedPositionId(id);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedClientId) {
      toast({
        title: "Error",
        description: "Please select a client",
        variant: "destructive",
      });
      return;
    }

    if (!selectedPositionId) {
      toast({
        title: "Error",
        description: "Please select a position",
        variant: "destructive",
      });
      return;
    }

    if (!formData.shiftId) {
      toast({
        title: "Error",
        description: "Please select a shift",
        variant: "destructive",
      });
      return;
    }

    // Validate that end date is after start date if provided
    if (startDate && endDate && endDate <= startDate) {
      toast({
        title: "Error",
        description: "End date must be later than start date",
        variant: "destructive",
      });
      return;
    }

    if (!startDate) {
      toast({
        title: "Error",
        description: "Please select a start date",
        variant: "destructive",
      });
      return;
    }

    // Check for similar jobs and show confirmation if any exist
    if (hasSimilarJobs && !showDuplicateModal) {
      setShowDuplicateModal(true);
      return;
    }

    setIsSubmitting(true);

    try {
      const startDateStr = startDate ? format(startDate, 'yyyy-MM-dd') : '';
      const endDateStr = endDate ? format(endDate, 'yyyy-MM-dd') : '';
      
      const numberOfWorkingDays = calculateWorkingDays(
        startDateStr, 
        endDateStr, 
        formData.includeWeekends
      );
      const totalPlacements = numberOfWorkingDays * parseInt(formData.vacancies);

      const payload = {
        clientId: selectedClientId,
        postedBy: user?.id,
        departmentId: formData.departmentId ? parseInt(formData.departmentId) : null,
        title: formData.title,
        description: formData.description,
        startDate: startDateStr,
        endDate: endDateStr || null,
        shiftId: formData.shiftId ? parseInt(formData.shiftId) : null,
        vacancies: parseInt(formData.vacancies),
        status: 'open',
        skills: selectedSkills.map(skill => skill.id),
        filled: false,
        assignees: [],
        body: {
          includeWeekends: formData.includeWeekends,
          positionId: selectedPositionId
        },
        meta: {
          totalPlacements,
          filledPlacements: 0
        }
      };

      const response = await fetch(`${API_BASE_URL}/job`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to create job');
      }

      const newJob = await response.json();

      toast({
        title: "Success",
        description: "Job created successfully",
      });

      navigate(`/job/${newJob.id}`);
    } catch (error) {
      console.error('Error creating job:', error);
      toast({
        title: "Error",
        description: "Failed to create job",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculateWorkingDays = (startDate: string, endDate: string | null, includeWeekends: boolean): number => {
    if (!startDate) return 0;
    
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : start;
    let workingDays = 0;
    
    const currentDate = new Date(start);
    while (currentDate <= end) {
      const dayOfWeek = currentDate.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      
      if (includeWeekends || !isWeekend) {
        workingDays++;
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return workingDays;
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData({ ...formData, [field]: value });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Link to="/jobs">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Jobs
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-[#000009]">Create Job</h1>
            <p className="text-gray-600 mt-1">Create a new job posting</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-[#000009]">Basic Information</CardTitle>
                <CardDescription>Core job details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Client *</label>
                  <div className="relative">
                    <Input
                      required
                      value={clientSearchTerm}
                      onChange={(e) => handleClientSearch(e.target.value)}
                      placeholder="Start typing client name..."
                    />
                    {clients.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                        {clients.map((client) => (
                          <div
                            key={client.id}
                            className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                            onClick={() => handleClientSelect(client)}
                          >
                            {client.name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Department</label>
                  <Select value={formData.departmentId} onValueChange={(value) => handleInputChange('departmentId', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((department) => (
                        <SelectItem key={department.id} value={department.id.toString()}>
                          {department.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Position *</label>
                  <div className="flex gap-2">
                    <Select
                      value={selectedPositionId?.toString() || ''}
                      onValueChange={(value) => {
                        if (value === 'create-new') {
                          setIsPositionModalOpen(true);
                        } else {
                          handlePositionSelect(value);
                        }
                      }}
                      disabled={!selectedClientId}
                      required
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder={selectedClientId ? "Select position" : "Select client first"} />
                      </SelectTrigger>
                      <SelectContent>
                        {positions?.length === 0 && selectedClientId && (
                          <SelectItem value="create-new" className="text-primary font-medium">
                            + Create new position
                          </SelectItem>
                        )}
                        {positions?.map((position) => (
                          <SelectItem key={position.id} value={position.id.toString()}>
                            {position.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedClientId && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setIsPositionModalOpen(true)}
                        title="Create new position"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  {selectedPositionId && (
                    <p className="text-xs text-muted-foreground">Selected: {positions.find(p => p.id === selectedPositionId)?.name}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Description</label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Enter job description"
                    rows={3}
                  />
                  {selectedPositionId && (
                    <p className="text-xs text-muted-foreground">Pre-filled from template: {positions.find(p => p.id === selectedPositionId)?.name}</p>
                  )}
                </div>

              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-[#000009]">Job Details</CardTitle>
                <CardDescription>Dates and requirements</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="include-weekends"
                    checked={formData.includeWeekends}
                    onCheckedChange={(checked) => handleInputChange('includeWeekends', checked)}
                  />
                  <label htmlFor="include-weekends" className="text-sm font-medium cursor-pointer">
                    Include weekends
                  </label>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Start Date *</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !startDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={setStartDate}
                        disabled={(date) => {
                          if (!formData.includeWeekends) {
                            const dayOfWeek = date.getDay();
                            return dayOfWeek === 0 || dayOfWeek === 6;
                          }
                          return false;
                        }}
                        weekStartsOn={1}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  {!formData.includeWeekends && (
                    <p className="text-xs text-muted-foreground">Only weekdays can be selected</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">End Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !endDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, "PPP") : <span>Pick a date (optional)</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={setEndDate}
                        disabled={(date) => {
                          if (startDate && date < startDate) {
                            return true;
                          }
                          if (!formData.includeWeekends) {
                            const dayOfWeek = date.getDay();
                            return dayOfWeek === 0 || dayOfWeek === 6;
                          }
                          return false;
                        }}
                        weekStartsOn={1}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  <p className="text-xs text-gray-500">Leave blank for ongoing job. If set, must be later than start date</p>
                  {!formData.includeWeekends && (
                    <p className="text-xs text-muted-foreground">Only weekdays can be selected</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Shift</label>
                  <div className="flex gap-2">
                    <Select
                      value={formData.shiftId}
                      onValueChange={(value) => {
                        if (value === 'create-new') {
                          setIsShiftModalOpen(true);
                        } else {
                          handleInputChange('shiftId', value);
                        }
                      }}
                      disabled={!selectedClientId}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder={selectedClientId ? "Select shift" : "Select client first"} />
                      </SelectTrigger>
                      <SelectContent>
                        {shifts?.length === 0 && selectedClientId && (
                          <SelectItem value="create-new" className="text-primary font-medium">
                            + Create new shift
                          </SelectItem>
                        )}
                        {shifts?.map((shift) => (
                          <SelectItem key={shift.id} value={shift.id.toString()}>
                            {shift.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedClientId && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setIsShiftModalOpen(true)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Vacancies *</label>
                  <Input
                    type="number"
                    required
                    min="1"
                    value={formData.vacancies}
                    onChange={(e) => handleInputChange('vacancies', e.target.value)}
                    placeholder="Number of positions"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Skills</label>
                  <div className="relative">
                    <Input
                      value={skillSearchTerm}
                      onChange={(e) => setSkillSearchTerm(e.target.value)}
                      placeholder="Search and select skills..."
                    />
                    {skillSearchTerm && filteredSkills.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-60 overflow-auto">
                        {filteredSkills.slice(0, 10).map((skill) => (
                          <div
                            key={skill.id}
                            className="px-3 py-2 hover:bg-accent cursor-pointer"
                            onClick={() => handleSkillSelect(skill)}
                          >
                            {skill.name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {selectedSkills.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedSkills.map((skill) => (
                        <Badge key={skill.id} variant="outline" className="flex items-center gap-1">
                          {skill.name}
                          <X
                            className="h-3 w-3 cursor-pointer"
                            onClick={() => handleSkillRemove(skill)}
                          />
                        </Badge>
                      ))}
                    </div>
                  )}
                  {selectedPositionId && (
                    <p className="text-xs text-muted-foreground">Pre-filled from template: {positions.find(p => p.id === selectedPositionId)?.name}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Similar Jobs Panel */}
          {(hasSimilarJobs || isLoadingSimilarJobs) && (
            <div className="mt-6">
              <SimilarJobsPanel 
                jobs={similarJobs} 
                isLoading={isLoadingSimilarJobs}
              />
            </div>
          )}

          <div className="flex justify-end space-x-4 mt-6">
            <Link to="/jobs">
              <Button variant="outline">Cancel</Button>
            </Link>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-[#712B71] hover:bg-[#712B71]/90"
            >
              <Save className="h-4 w-4 mr-2" />
              {isSubmitting ? 'Creating...' : 'Create Job'}
            </Button>
          </div>
        </form>

        {/* Duplicate Job Confirmation Modal */}
        {showDuplicateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">Potential Duplicate Job</h3>
              <p className="text-gray-600 mb-6">
                Similar jobs were found. Are you sure you want to create this job and it's not a duplicate?
              </p>
              <div className="flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={() => setShowDuplicateModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    setShowDuplicateModal(false);
                    handleSubmit({ preventDefault: () => {} } as React.FormEvent);
                  }}
                  className="bg-[#712B71] hover:bg-[#712B71]/90"
                >
                  Create Anyway
                </Button>
              </div>
            </div>
          </div>
        )}

        {selectedClientId && (
          <>
            <CreateShiftModal
              isOpen={isShiftModalOpen}
              onClose={() => setIsShiftModalOpen(false)}
              clientId={selectedClientId}
              onShiftCreated={handleShiftCreated}
            />
            <CreatePositionModal
              isOpen={isPositionModalOpen}
              onClose={() => setIsPositionModalOpen(false)}
              clientId={selectedClientId}
              onPositionCreated={handlePositionCreated}
            />
          </>
        )}
      </div>
    </AdminLayout>
  );
};

export default JobCreate;
