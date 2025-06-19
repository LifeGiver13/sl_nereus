import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import CreateShiftModal from '../components/CreateShiftModal';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Save, X, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '../contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { API_BASE_URL } from '../config/env';

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

const JobCreate = () => {
  const navigate = useNavigate();
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
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    vacancies: '',
    status: 'open',
    departmentId: '',
    shiftId: ''
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

  // Transform shifts data to array if it's an object, otherwise use as-is
  const shifts = shiftsData ? (Array.isArray(shiftsData) ? shiftsData : Object.entries(shiftsData).map(([id, shiftData]: [string, any]) => ({
    id: parseInt(id),
    name: shiftData.name,
    startTime: shiftData.startTime,
    endTime: shiftData.endTime
  }))) : [];

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

  // Reset shift selection when client changes
  useEffect(() => {
    setFormData(prev => ({ ...prev, shiftId: '' }));
  }, [selectedClientId]);

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

  const handleShiftCreated = (newShift: Shift) => {
    refetchShifts();
    setFormData(prev => ({ ...prev, shiftId: newShift.id.toString() }));
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

    // Validate that end date is after start date
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
      const payload = {
        clientId: selectedClientId,
        postedBy: user?.id,
        departmentId: formData.departmentId ? parseInt(formData.departmentId) : null,
        title: formData.title,
        description: formData.description,
        startDate: formData.startDate,
        endDate: formData.endDate,
        shiftId: formData.shiftId ? parseInt(formData.shiftId) : null,
        vacancies: parseInt(formData.vacancies),
        status: formData.status,
        skills: selectedSkills.map(skill => skill.id),
        filled: false,
        assignees: []
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

  const handleInputChange = (field: string, value: string) => {
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
                  <label className="text-sm font-medium">Job Title *</label>
                  <Input
                    required
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    placeholder="Enter job title"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Description *</label>
                  <Textarea
                    required
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Enter job description"
                    rows={3}
                  />
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
                  <label className="text-sm font-medium">End Date *</label>
                  <Input
                    type="date"
                    required
                    value={formData.endDate}
                    onChange={(e) => handleInputChange('endDate', e.target.value)}
                    min={formData.startDate}
                  />
                  <p className="text-xs text-gray-500">Must be later than start date</p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Shift</label>
                  <div className="flex gap-2">
                    <Select 
                      value={formData.shiftId} 
                      onValueChange={(value) => handleInputChange('shiftId', value)}
                      disabled={!selectedClientId || !shifts?.length}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder={selectedClientId ? (shifts?.length ? "Select shift" : "No shifts available") : "Select client first"} />
                      </SelectTrigger>
                      <SelectContent>
                        {shifts?.map((shift) => (
                          <SelectItem key={shift.id} value={shift.id.toString()}>
                            {shift.name} ({shift.startTime} - {shift.endTime})
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

        {selectedClientId && (
          <CreateShiftModal
            isOpen={isShiftModalOpen}
            onClose={() => setIsShiftModalOpen(false)}
            clientId={selectedClientId}
            onShiftCreated={handleShiftCreated}
          />
        )}
      </div>
    </AdminLayout>
  );
};

export default JobCreate;
