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
import { useToast } from '@/hooks/use-toast';
import { API_BASE_URL } from '../config/env';
import { getValueByViewPath, setValueByViewPath } from '@/lib/utils';
import { Plus, Edit2, Trash2 } from 'lucide-react';

interface Client {
  id: number;
  name: string;
  status: string;
  referral_code?: string;
  profile: {
    address: {
      town: string;
      line1: string;
      line2: string;
      line3: string;
      branch: string;
      county: string;
      postcode: string;
    };
    contact: {
      fax: string;
      role: string;
      mobile: string;
      lastName: string;
      firstName: string;
      telephone: string;
      salutation: string;
      email: string;
    };
    [key: string]: any;
  };
  meta: any;
  createdAt: string;
  updatedAt: string;
}

interface ClientContact {
  id: number;
  clientId: number;
  firstName: string;
  lastName: string;
  position: string;
  email: string;
  phone: string;
  meta?: any;
  createdAt?: string;
  updatedAt?: string;
}

interface EditClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client | null;
  onClientUpdated: () => void;
}

const EditClientModal: React.FC<EditClientModalProps> = ({
  isOpen,
  onClose,
  client,
  onClientUpdated
}) => {
  const [formData, setFormData] = useState<Client | null>(null);
  const [contacts, setContacts] = useState<ClientContact[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingContact, setEditingContact] = useState<ClientContact | null>(null);
  const [newContact, setNewContact] = useState<Partial<ClientContact>>({
    firstName: '',
    lastName: '',
    position: '',
    email: '',
    phone: '',
  });
  const { toast } = useToast();

  // Load client data
  useEffect(() => {
    if (client) {
      const normalized = {
        ...client,
        referral_code: client.referral_code ?? '',
        profile: {
          address: {},
          contact: {},
          ...client.profile
        }
      };
      setFormData(normalized);
    }
  }, [client]);

  // Fetch contacts when client changes
  useEffect(() => {
    const fetchContacts = async () => {
      if (!client?.id) return;
      try {
        const response = await fetch(`${API_BASE_URL}/client-contacts/${client.id}`);
        if (response.ok) {
          const data = await response.json();
          setContacts(data.contacts || []);
        }
      } catch (error) {
        console.error('Failed to fetch contacts:', error);
        toast({ title: "Error", description: "Failed to load contacts", variant: "destructive" });
      }
    };

    if (isOpen && client?.id) {
      fetchContacts();
    } else {
      setContacts([]);
    }
  }, [isOpen, client?.id, toast]);

  if (!formData) return null;

  const handleInputChange = (viewPath: string, value: string) => {
    setFormData(prev => {
      if (!prev) return null;
      const newData = JSON.parse(JSON.stringify(prev));
      setValueByViewPath(newData, viewPath, value);
      return newData;
    });
  };

  const handleSubmitClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData) return;
    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/client/${formData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      toast({ title: "Success", description: "Client updated successfully" });
      onClientUpdated();
      onClose();
    } catch (error) {
      console.error('Error updating client:', error);
      toast({ title: "Error", description: "Failed to update client", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Contact Handlers
  const handleSaveContact = async () => {
    if (!client?.id) return;

    const payload = {
      clientId: client.id,
      ...editingContact ? {} : newContact,
      ...(editingContact ? editingContact : newContact)
    };

    setIsLoading(true);
    try {
      let response;
      if (editingContact) {
        response = await fetch(`${API_BASE_URL}/client-contact/${editingContact.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        response = await fetch(`${API_BASE_URL}/client-contact`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      if (!response.ok) throw new Error('Failed to save contact');

      toast({
        title: "Success",
        description: editingContact ? "Contact updated" : "Contact added"
      });

      // Refresh contacts
      const refreshRes = await fetch(`${API_BASE_URL}/client-contacts/${client.id}`);
      if (refreshRes.ok) {
        const data = await refreshRes.json();
        setContacts(data.contacts || []);
      }

      // Reset form
      setNewContact({ firstName: '', lastName: '', position: '', email: '', phone: '' });
      setEditingContact(null);
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Failed to save contact", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditContact = (contact: ClientContact) => {
    setEditingContact(contact);
    setNewContact({ ...contact });
  };

  const handleDeleteContact = async (id: number) => {
    if (!confirm("Delete this contact?")) return;

    try {
      const response = await fetch(`${API_BASE_URL}/client-contact/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete');

      setContacts(prev => prev.filter(c => c.id !== id));
      toast({ title: "Success", description: "Contact deleted" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete contact", variant: "destructive" });
    }
  };

  const cancelContactEdit = () => {
    setEditingContact(null);
    setNewContact({ firstName: '', lastName: '', position: '', email: '', phone: '' });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Client: {formData.name}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmitClient} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Company Name</label>
                <Input
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  required
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
              <div className="space-y-2">
                <label className="text-sm font-medium">Branch</label>
                <Input
                  value={getValueByViewPath(formData, 'address.branch') || ''}
                  onChange={(e) => handleInputChange('address.branch', e.target.value)}
                />
              </div>
              {/* Admin Details / Referral Code */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Referral Code</label>
                <Input
                  value={getValueByViewPath(formData, 'referral_code') || ''}
                  onChange={(e) => handleInputChange('referral_code', e.target.value)}
                  placeholder="e.g. REF-ABC123"
                />
              </div>
            </CardContent>
          </Card>

          {/* Primary Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle>Primary Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Salutation</label>
                <Input
                  value={getValueByViewPath(formData, 'contact.salutation') || ''}
                  onChange={(e) => handleInputChange('contact.salutation', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">First Name</label>
                <Input
                  value={getValueByViewPath(formData, 'contact.firstName') || ''}
                  onChange={(e) => handleInputChange('contact.firstName', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Last Name</label>
                <Input
                  value={getValueByViewPath(formData, 'contact.lastName') || ''}
                  onChange={(e) => handleInputChange('contact.lastName', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Role</label>
                <Input
                  value={getValueByViewPath(formData, 'contact.role') || ''}
                  onChange={(e) => handleInputChange('contact.role', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Telephone</label>
                <Input
                  value={getValueByViewPath(formData, 'contact.telephone') || ''}
                  onChange={(e) => handleInputChange('contact.telephone', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Mobile</label>
                <Input
                  value={getValueByViewPath(formData, 'contact.mobile') || ''}
                  onChange={(e) => handleInputChange('contact.mobile', e.target.value)}
                />
              </div>
              <div className="space-y-2 col-span-2">
                <label className="text-sm font-medium">Email</label>
                <Input
                  value={getValueByViewPath(formData, 'contact.email') || ''}
                  onChange={(e) => handleInputChange('contact.email', e.target.value)}
                />
              </div>
              <div className="space-y-2 col-span-2">
                <label className="text-sm font-medium">Fax</label>
                <Input
                  value={getValueByViewPath(formData, 'contact.fax') || ''}
                  onChange={(e) => handleInputChange('contact.fax', e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Address Information */}
          <Card>
            <CardHeader>
              <CardTitle>Address Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Address Line 1</label>
                <Input
                  value={getValueByViewPath(formData, 'address.line1') || ''}
                  onChange={(e) => handleInputChange('address.line1', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Address Line 2</label>
                <Input
                  value={getValueByViewPath(formData, 'address.line2') || ''}
                  onChange={(e) => handleInputChange('address.line2', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Address Line 3</label>
                <Input
                  value={getValueByViewPath(formData, 'address.line3') || ''}
                  onChange={(e) => handleInputChange('address.line3', e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Town</label>
                  <Input
                    value={getValueByViewPath(formData, 'address.town') || ''}
                    onChange={(e) => handleInputChange('address.town', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">County</label>
                  <Input
                    value={getValueByViewPath(formData, 'address.county') || ''}
                    onChange={(e) => handleInputChange('address.county', e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Postcode</label>
                <Input
                  value={getValueByViewPath(formData, 'address.postcode') || ''}
                  onChange={(e) => handleInputChange('address.postcode', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Branch</label>
                <Input
                  value={getValueByViewPath(formData, 'address.branch') || ''}
                  onChange={(e) => handleInputChange('address.branch', e.target.value)}
                />
              </div>

            </CardContent>
          </Card>

          {/* Additional Contacts Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Additional Contacts</CardTitle>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    setEditingContact(null);
                    setNewContact({ firstName: '', lastName: '', position: '', email: '', phone: '' });
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Contact
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Contact Form (Add/Edit) */}
              <div className="border rounded-lg p-4 bg-muted/50">
                <h4 className="font-medium mb-3">
                  {editingContact ? 'Edit Contact' : 'New Contact'}
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">First Name</label>
                    <Input
                      value={newContact.firstName || ''}
                      onChange={(e) => setNewContact(prev => ({ ...prev, firstName: e.target.value }))}
                      placeholder="First name"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Last Name</label>
                    <Input
                      value={newContact.lastName || ''}
                      onChange={(e) => setNewContact(prev => ({ ...prev, lastName: e.target.value }))}
                      placeholder="Last name"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Position / Role</label>
                    <Input
                      value={newContact.position || ''}
                      onChange={(e) => setNewContact(prev => ({ ...prev, position: e.target.value }))}
                      placeholder="e.g. Sales Manager"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Phone</label>
                    <Input
                      value={newContact.phone || ''}
                      onChange={(e) => setNewContact(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="Phone number"
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <label className="text-sm font-medium">Email</label>
                    <Input
                      value={newContact.email || ''}
                      onChange={(e) => setNewContact(prev => ({ ...prev, email: e.target.value }))}
                      type="email"
                      placeholder="email@example.com"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-4">
                  {editingContact && (
                    <Button type="button" variant="outline" onClick={cancelContactEdit}>
                      Cancel
                    </Button>
                  )}
                  <Button
                    type="button"
                    onClick={handleSaveContact}
                    disabled={isLoading || !newContact.firstName || !newContact.lastName}
                  >
                    {isLoading ? 'Saving...' : editingContact ? 'Update Contact' : 'Add Contact'}
                  </Button>
                </div>
              </div>

              {/* Contacts List */}
              <div className="space-y-3">
                {contacts.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    No additional contacts yet.
                  </p>
                ) : (
                  contacts.map((contact) => (
                    <div key={contact.id} className="flex items-center justify-between border rounded-lg p-4">
                      <div>
                        <p className="font-medium">
                          {contact.firstName} {contact.lastName}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {contact.position && `${contact.position} • `}
                          {contact.email}
                          {contact.phone && ` • ${contact.phone}`}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditContact(contact)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteContact(contact.id)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Updating...' : 'Update Client'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditClientModal;