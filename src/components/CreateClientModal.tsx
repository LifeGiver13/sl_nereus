import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { API_BASE_URL } from '../config/env';
import { setNestedProperty } from '@/lib/utils';

type ViewField = {
  property: string;
  label: string;
  type: 'text' | 'image' | 'document';
  meta: { [key: string]: any };
};

type ViewSection = {
  [sectionName: string]: ViewField[];
};

interface ViewManager {
  id: number;
  name: string;
  sections: ViewSection;
  meta: { [key: string]: any };
}

interface CreateClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClientCreated: () => void;
}

const CreateClientModal: React.FC<CreateClientModalProps> = ({
  isOpen,
  onClose,
  onClientCreated
}) => {
  const [viewManager, setViewManager] = useState<ViewManager | null>(null);
  const [formData, setFormData] = useState<any>({
    name: '',
    status: 'active',
    profile: {
      address: {
        town: '',
        line1: '',
        line2: '',
        line3: '',
        branch: '',
        county: '',
        postcode: ''
      },
      contact: {
        fax: '',
        role: '',
        mobile: '',
        lastName: '',
        firstName: '',
        telephone: '',
        salutation: ''
      }
    },
    meta: {}
  });
  const [isLoading, setIsLoading] = useState(false);
  const [viewLoading, setViewLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      fetchViewManager();
    }
  }, [isOpen]);

  const fetchViewManager = async () => {
    try {
      setViewLoading(true);
      const response = await fetch(`${API_BASE_URL}/utils/view-managers`);
      if (response.ok) {
        const viewManagers = await response.json();
        const clientViewManager = viewManagers.find((vm: ViewManager) => vm.name === 'Client Profile - Admin View');
        setViewManager(clientViewManager || null);
      }
    } catch (error) {
      console.error('Error fetching view manager:', error);
    } finally {
      setViewLoading(false);
    }
  };

  const handleInputChange = (path: string, value: string) => {
    setFormData((prev: any) => {
      const newData = { ...prev };
      setNestedProperty(newData, path, value);
      return newData;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Company name is required",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/client`, {
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
        description: "Client created successfully",
      });
      
      onClientCreated();
      onClose();
      
      // Reset form
      setFormData({
        name: '',
        status: 'active',
        profile: {
          address: {
            town: '',
            line1: '',
            line2: '',
            line3: '',
            branch: '',
            county: '',
            postcode: ''
          },
          contact: {
            fax: '',
            role: '',
            mobile: '',
            lastName: '',
            firstName: '',
            telephone: '',
            salutation: ''
          }
        },
        meta: {}
      });
    } catch (error) {
      console.error('Error creating client:', error);
      toast({
        title: "Error",
        description: "Failed to create client",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderField = (field: ViewField) => {
    const value = formData[field.property] || formData.profile?.[field.property] || '';
    
    // Handle nested properties
    let actualValue = value;
    if (field.property.includes('.')) {
      const keys = field.property.split('.');
      let current = formData;
      for (const key of keys) {
        current = current?.[key];
      }
      actualValue = current || '';
    }

    switch (field.type) {
      case 'text':
        return (
          <Input
            value={actualValue}
            onChange={(e) => handleInputChange(field.property, e.target.value)}
            placeholder={field.label}
          />
        );
      case 'document':
        return (
          <Textarea
            value={actualValue}
            onChange={(e) => handleInputChange(field.property, e.target.value)}
            placeholder={field.label}
            rows={3}
          />
        );
      default:
        return (
          <Input
            value={actualValue}
            onChange={(e) => handleInputChange(field.property, e.target.value)}
            placeholder={field.label}
          />
        );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Client</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Company Name *</label>
                <Input
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  required
                  placeholder="Enter company name"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => handleInputChange('status', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Dynamic View Manager Fields */}
          {viewLoading ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Loading form configuration...</p>
            </div>
          ) : viewManager ? (
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue={Object.keys(viewManager.sections)[0]?.toLowerCase().replace(/\s+/g, '-')} className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    {Object.keys(viewManager.sections).map((sectionName) => (
                      <TabsTrigger key={sectionName} value={sectionName.toLowerCase().replace(/\s+/g, '-')}>
                        {sectionName}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  
                  {Object.entries(viewManager.sections).map(([sectionName, fields]) => (
                    <TabsContent key={sectionName} value={sectionName.toLowerCase().replace(/\s+/g, '-')}>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {fields.map((field) => (
                          <div key={field.property} className="space-y-2">
                            <label className="text-sm font-medium">{field.label}</label>
                            {renderField(field)}
                          </div>
                        ))}
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
              </CardContent>
            </Card>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No view manager configured for client profiles.</p>
            </div>
          )}
          
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create Client'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateClientModal;