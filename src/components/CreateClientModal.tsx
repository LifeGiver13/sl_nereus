import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { API_BASE_URL } from '../config/env';
import { getValueByViewPath, setValueByViewPath, apiRequest } from '@/lib/utils';
import { Plus, Trash2 } from 'lucide-react';

interface ViewManager { id: number; name: string; sections: any; meta: any; }

interface Contact {
  firstName: string;
  lastName: string;
  position: string;
  email: string;
  phone: string;
  meta?: any;
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
    referral_code: '',
    status: 'active',
    profile: {
      address: { town: '', line1: '', line2: '', line3: '', branch: '', county: '', postcode: '' },
      contact: {}
    },
    contacts: [] as Contact[],
    meta: {}
  });

  const [isLoading, setIsLoading] = useState(false);
  const [viewLoading, setViewLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      resetForm();
      fetchViewManager();
    }
  }, [isOpen]);

  const resetForm = () => {
    setFormData({
      name: '',
      referralCode: '',
      status: 'active',
      profile: {
        address: { town: '', line1: '', line2: '', line3: '', branch: '', county: '', postcode: '' },
        contact: {}
      },
      contacts: [{
        firstName: '',
        lastName: '',
        position: '',
        email: '',
        phone: ''
      }],
      meta: {}
    });
  };

  const fetchViewManager = async () => {
    try {
      setViewLoading(true);
      const res = await fetch(`${API_BASE_URL}/utils/view-managers`);
      if (res.ok) {
        const vms = await res.json();
        const clientVm = vms.find((vm: ViewManager) => vm.name === 'Client Profile - Admin View');
        setViewManager(clientVm || null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setViewLoading(false);
    }
  };

  const handleInputChange = (path: string, value: string) => {
    setFormData((prev: any) => {
      const newData = JSON.parse(JSON.stringify(prev));
      setValueByViewPath(newData, path, value);
      return newData;
    });
  };

  // Contact Handlers
  const updateContact = (index: number, field: keyof Contact, value: string) => {
    setFormData((prev: any) => {
      const contacts = [...prev.contacts];
      contacts[index] = { ...contacts[index], [field]: value };
      return { ...prev, contacts };
    });
  };

  const addContact = () => {
    setFormData((prev: any) => ({
      ...prev,
      contacts: [...prev.contacts, { firstName: '', lastName: '', position: '', email: '', phone: '' }]
    }));
  };

  const removeContact = (index: number) => {
    setFormData((prev: any) => ({
      ...prev,
      contacts: prev.contacts.filter((_: any, i: number) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast({ title: "Error", description: "Company name is required", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const payload = { ...formData };

      const response = await apiRequest(`/client`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error('Failed to create client');

      toast({ title: "Success", description: "Client created successfully" });
      onClientCreated();
      onClose();
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Failed to create client", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Client</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information + Referral Code */}
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
                />
              </div>

              {/* <div className="space-y-2">
                <label className="text-sm font-medium">Referral Code</label>
                <Input
                  value={formData.referralCode}
                  onChange={(e) => handleInputChange('referralCode', e.target.value)}
                  placeholder="e.g. REF-2025-XYZ"
                />
              </div> */}
            </CardContent>
          </Card>

          {/* Dynamic Profile Fields */}
          {viewManager && (
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue={Object.keys(viewManager.sections)[0]}>
                  <TabsList className="grid w-full grid-cols-4">
                    {Object.keys(viewManager.sections).map((name) => (
                      <TabsTrigger key={name} value={name}>
                        {name}
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  {Object.entries(viewManager.sections).map(([sectionName, fields]: [string, any]) => (
                    <TabsContent key={sectionName} value={sectionName}>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                        {fields.map((field: any) => (
                          <div key={field.property} className="space-y-2">
                            <label className="text-sm font-medium">{field.label}</label>
                            <Input
                              value={getValueByViewPath(formData, field.property) || ''}
                              onChange={(e) => handleInputChange(field.property, e.target.value)}
                              placeholder={field.label}
                            />
                          </div>
                        ))}
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
              </CardContent>
            </Card>
          )}

          {/* Additional Contacts */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Additional Contacts</CardTitle>
              <Button type="button" onClick={addContact} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Contact
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              {formData.contacts.map((contact: Contact, index: number) => (
                <div key={index} className="border rounded-lg p-4 space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium">Contact #{index + 1}</h4>
                    {formData.contacts.length > 1 && (
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => removeContact(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      placeholder="First Name"
                      value={contact.firstName}
                      onChange={(e) => updateContact(index, 'firstName', e.target.value)}
                    />
                    <Input
                      placeholder="Last Name"
                      value={contact.lastName}
                      onChange={(e) => updateContact(index, 'lastName', e.target.value)}
                    />
                    <Input
                      placeholder="Position / Role"
                      value={contact.position}
                      onChange={(e) => updateContact(index, 'position', e.target.value)}
                    />
                    <Input
                      placeholder="Phone"
                      value={contact.phone}
                      onChange={(e) => updateContact(index, 'phone', e.target.value)}
                    />
                    <Input
                      className="col-span-2"
                      placeholder="Email"
                      type="email"
                      value={contact.email}
                      onChange={(e) => updateContact(index, 'email', e.target.value)}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

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