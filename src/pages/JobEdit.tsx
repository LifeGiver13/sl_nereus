
import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import CreateShiftModal from '../components/CreateShiftModal';
import CreatePositionModal from '../components/CreatePositionModal';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Save, X, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { API_BASE_URL } from '../config/env';

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

interface Job {
  id: number;
  clientId: number;
  postedBy: number;
  departmentId: number;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  shiftId: number;
  vacancies: number;
  status: string;
  skills: number[];
  filled: boolean;
  assignees: number[];
  client: {
    id: number;
    name: string;
  };
  body?: {
    includeWeekends?: boolean;
    positionId?: number;
  };
  meta?: {
    totalPlacements?: number;
    filledPlacements?: number;
  };
}

const JobEdit = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedSkills, setSelectedSkills] = useState<Skill[]>([]);
  const [skillSearchTerm, setSkillSearchTerm] = useState('');
  const [availableSkills, setAvailableSkills] = useState<Skill[]>([]);
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [isPositionModalOpen, setIsPositionModalOpen] = useState(false);
  const [selectedPositionId, setSelectedPositionId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    description: '',
    startDate: '',
    endDate: '',
    vacancies: '',
    status: 'open',
    departmentId: '',
    shiftId: '',
    includeWeekends: false
  });

  // Fetch existing job data
  const { data: job, isLoading: isLoadingJob } = useQuery({
    queryKey: ['job', id],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/job/${id}?expand=client,department,shift`);
      if (!response.ok) {
        throw new Error('Failed to fetch job details');
      }
      return response.json();
    }
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
  const { data: departments } = useQuery({
    queryKey: ['departments-list'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/utils/department-list`);
      if (!response.ok) {
        throw new Error('Failed to fetch departments');
      }
      return response.json();
    }
  });

  // Fetch shifts for the job's client
  const { data: shiftsData, refetch: refetchShifts } = useQuery({
    queryKey: ['client-shifts', job?.clientId],
    queryFn: async () => {
      if (!job?.clientId) return [];
      const response = await fetch(`${API_BASE_URL}/utils/client/${job.clientId}/shifts`);
      if (!response.ok) {
        throw new Error('Failed to fetch shifts');
      }
      return response.json();
    },
    enabled: !!job?.clientId
  });

  // Fetch positions for the job's client
  const { data: positionsData, refetch: refetchPositions } = useQuery({
    queryKey: ['client-positions-list', job?.clientId],
    queryFn: async () => {
      if (!job?.clientId) return {};
      const response = await fetch(`${API_BASE_URL}/utils/client/${job.clientId}/positions`);
      if (!response.ok) {
        throw new Error('Failed to fetch positions');
      }
      return response.json();
    },
    enabled: !!job?.clientId
  });

  // Fetch detailed position data when position is selected
  const { data: selectedPositionData } = useQuery({
    queryKey: ['position-detail', job?.clientId, selectedPositionId],
    queryFn: async () => {
      if (!job?.clientId || !selectedPositionId) return null;
      const response = await fetch(`${API_BASE_URL}/client/${job.clientId}/position/${selectedPositionId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch position details');
      }
      return response.json();
    },
    enabled: !!job?.clientId && !!selectedPositionId
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

  // Load job data into form when available - only when job first loads
  useEffect(() => {
    if (job) {
      setFormData({
        description: job.description || '',
        startDate: job.startDate ? job.startDate.split('T')[0] : '',
        endDate: job.endDate ? job.endDate.split('T')[0] : '',
        vacancies: job.vacancies?.toString() || '',
        status: job.status || 'open',
        departmentId: job.departmentId?.toString() || '',
        shiftId: job.shiftId?.toString() || '',
        includeWeekends: job.body?.includeWeekends || false
      });

      // Set position ID if available in job body
      if (job.body?.positionId) {
        setSelectedPositionId(job.body.positionId);
      }
    }
  }, [job]); // Only depend on job, not other data that can change

  // Ensure shift and position selections are maintained when data loads
  useEffect(() => {
    if (job && shiftsData && job.shiftId && !formData.shiftId) {
      setFormData(prev => ({ ...prev, shiftId: job.shiftId.toString() }));
    }
  }, [job, shiftsData, formData.shiftId]);

  useEffect(() => {
    if (job && positionsData && job.body?.positionId && !selectedPositionId) {
      setSelectedPositionId(job.body.positionId);
    }
  }, [job, positionsData, selectedPositionId]);

  // Auto-populate fields when position is selected
  useEffect(() => {
    if (selectedPositionData) {
      setFormData(prev => ({
        ...prev,
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

  // Load skills when data is available
  useEffect(() => {
    if (skillsData && job?.skills) {
      const allSkills: Skill[] = [];
      Object.values(skillsData).forEach((categorySkills: any) => {
        allSkills.push(...categorySkills);
      });
      setAvailableSkills(allSkills);

      // Set selected skills based on job data
      const jobSkills = allSkills.filter(skill => job.skills.includes(skill.id));
      setSelectedSkills(jobSkills);
    }
  }, [skillsData, job]);

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

  const handleShiftCreated = (newShift: Shift) => {
    refetchShifts();
    setFormData(prev => ({ ...prev, shiftId: newShift.id.toString() }));
    setIsShiftModalOpen(false);
  };

  const handlePositionCreated = (newPosition: Position) => {
    refetchPositions();
    setSelectedPositionId(newPosition.id);
    setIsPositionModalOpen(false);
  };

  const handlePositionSelect = (positionId: string) => {
    const id = parseInt(positionId);
    setSelectedPositionId(id);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.shiftId) {
      toast({
        title: "Error",
        description: "Please select a shift",
        variant: "destructive",
      });
      return;
    }

    // Validate that end date is after start date if provided
    if (formData.startDate && formData.endDate && formData.endDate <= formData.startDate) {
      toast({
        title: "Error",
        description: "End date must be later than start date",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const numberOfWorkingDays = calculateWorkingDays(
        formData.startDate, 
        formData.endDate, 
        formData.includeWeekends
      );
      const totalPlacements = numberOfWorkingDays * parseInt(formData.vacancies);

      const selectedPosition = positions.find(p => p.id === selectedPositionId);
      const payload = {
        clientId: job?.clientId,
        departmentId: formData.departmentId ? parseInt(formData.departmentId) : null,
        title: selectedPosition?.name || '',
        description: formData.description,
        startDate: formData.startDate,
        endDate: formData.endDate || null,
        shiftId: formData.shiftId ? parseInt(formData.shiftId) : null,
        vacancies: parseInt(formData.vacancies),
        status: formData.status,
        skills: selectedSkills.map(skill => skill.id),
        filled: job?.filled || false,
        assignees: job?.assignees || [],
        body: {
          includeWeekends: formData.includeWeekends,
          positionId: selectedPositionId
        },
        meta: {
          totalPlacements,
          filledPlacements: job?.meta?.filledPlacements || 0
        }
      };

      const response = await fetch(`${API_BASE_URL}/job/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to update job');
      }

      toast({
        title: "Success",
        description: "Job updated successfully",
      });

      navigate(`/job/${id}`);
    } catch (error) {
      console.error('Error updating job:', error);
      toast({
        title: "Error",
        description: "Failed to update job",
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
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (isLoadingJob) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading job details...</div>
        </div>
      </AdminLayout>
    );
  }

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
            <h1 className="text-3xl font-bold text-[#000009]">Edit Job</h1>
            <p className="text-gray-600 mt-1">Update job posting details</p>
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
                  <label className="text-sm font-medium">Client</label>
                  <Input
                    value={job?.client?.name || ''}
                    readOnly
                    className="bg-gray-50 cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-500">Client cannot be changed after job creation</p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Department</label>
                  <Select value={formData.departmentId} onValueChange={(value) => handleInputChange('departmentId', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments && Object.entries(departments).map(([departmentId, departmentName]) => (
                        <SelectItem key={departmentId} value={departmentId}>
                          {departmentName as string}
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
                      onValueChange={handlePositionSelect}
                      disabled={!job?.clientId}
                      required
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select position" />
                      </SelectTrigger>
                      <SelectContent>
                        {positions?.map((position) => (
                          <SelectItem key={position.id} value={position.id.toString()}>
                            {position.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {job?.clientId && (
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

                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-[#000009]">Job Details</CardTitle>
                <CardDescription>Dates and requirements</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Start Date *</label>
                  <Input
                    type="date"
                    required
                    value={formData.startDate}
                    onChange={(e) => handleInputChange('startDate', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">End Date</label>
                  <Input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => handleInputChange('endDate', e.target.value)}
                    min={formData.startDate}
                  />
                  <p className="text-xs text-gray-500">Leave blank for ongoing job. If set, must be later than start date</p>
                </div>

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
                  <label className="text-sm font-medium">Shift</label>
                  <div className="flex gap-2">
                    <Select
                      value={formData.shiftId}
                      onValueChange={(value) => handleInputChange('shiftId', value)}
                      disabled={!shifts?.length}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder={shifts?.length ? "Select shift" : "No shifts available"} />
                      </SelectTrigger>
                      <SelectContent>
                        {shifts?.map((shift) => (
                          <SelectItem key={shift.id} value={shift.id.toString()}>
                            {shift.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {job?.clientId && (
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
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                        {filteredSkills.slice(0, 10).map((skill) => (
                          <div
                            key={skill.id}
                            className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
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
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end space-x-4 mt-6">
            <Link to={`/job/${id}`}>
              <Button variant="outline">Cancel</Button>
            </Link>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-[#712B71] hover:bg-[#712B71]/90"
            >
              <Save className="h-4 w-4 mr-2" />
              {isSubmitting ? 'Updating...' : 'Update Job'}
            </Button>
          </div>
        </form>

        {job?.clientId && (
          <>
            <CreateShiftModal
              isOpen={isShiftModalOpen}
              onClose={() => setIsShiftModalOpen(false)}
              clientId={job.clientId}
              onShiftCreated={handleShiftCreated}
            />
            <CreatePositionModal
              isOpen={isPositionModalOpen}
              onClose={() => setIsPositionModalOpen(false)}
              clientId={job.clientId}
              onPositionCreated={handlePositionCreated}
            />
          </>
        )}
      </div>
    </AdminLayout>
  );
};

export default JobEdit;
