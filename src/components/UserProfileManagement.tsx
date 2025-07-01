
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Trash2, Plus, Edit2, Save, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ProfileField {
  property: string;
  label: string;
  type: 'text' | 'image' | 'document';
  userCanEdit: boolean;
  adminCanEdit: boolean;
}

interface ProfileSection {
  [sectionName: string]: ProfileField[];
}

const UserProfileManagement = () => {
  const [profileConfig, setProfileConfig] = useState<ProfileSection>({});
  const [newSectionName, setNewSectionName] = useState('');
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editingSectionName, setEditingSectionName] = useState('');
  const { toast } = useToast();

  const addSection = () => {
    if (!newSectionName.trim()) {
      toast({
        title: "Error",
        description: "Section name cannot be empty",
        variant: "destructive",
      });
      return;
    }

    if (profileConfig[newSectionName]) {
      toast({
        title: "Error",
        description: "Section already exists",
        variant: "destructive",
      });
      return;
    }

    setProfileConfig(prev => ({
      ...prev,
      [newSectionName]: []
    }));
    setNewSectionName('');
    
    toast({
      title: "Success",
      description: "Section added successfully",
    });
  };

  const deleteSection = (sectionName: string) => {
    const newConfig = { ...profileConfig };
    delete newConfig[sectionName];
    setProfileConfig(newConfig);
    
    toast({
      title: "Success",
      description: "Section deleted successfully",
    });
  };

  const startEditingSection = (sectionName: string) => {
    setEditingSection(sectionName);
    setEditingSectionName(sectionName);
  };

  const saveEditingSection = () => {
    if (!editingSectionName.trim() || !editingSection) return;
    
    if (editingSectionName !== editingSection && profileConfig[editingSectionName]) {
      toast({
        title: "Error",
        description: "Section name already exists",
        variant: "destructive",
      });
      return;
    }

    const newConfig = { ...profileConfig };
    if (editingSectionName !== editingSection) {
      newConfig[editingSectionName] = newConfig[editingSection];
      delete newConfig[editingSection];
    }
    
    setProfileConfig(newConfig);
    setEditingSection(null);
    setEditingSectionName('');
    
    toast({
      title: "Success",
      description: "Section renamed successfully",
    });
  };

  const cancelEditingSection = () => {
    setEditingSection(null);
    setEditingSectionName('');
  };

  const addField = (sectionName: string) => {
    const newField: ProfileField = {
      property: '',
      label: '',
      type: 'text',
      userCanEdit: false,
      adminCanEdit: true
    };

    setProfileConfig(prev => ({
      ...prev,
      [sectionName]: [...prev[sectionName], newField]
    }));
  };

  const updateField = (sectionName: string, fieldIndex: number, field: Partial<ProfileField>) => {
    setProfileConfig(prev => ({
      ...prev,
      [sectionName]: prev[sectionName].map((f, index) => 
        index === fieldIndex ? { ...f, ...field } : f
      )
    }));
  };

  const deleteField = (sectionName: string, fieldIndex: number) => {
    setProfileConfig(prev => ({
      ...prev,
      [sectionName]: prev[sectionName].filter((_, index) => index !== fieldIndex)
    }));
  };

  const exportConfig = () => {
    const configJson = JSON.stringify(profileConfig, null, 2);
    console.log('Profile Configuration:', configJson);
    
    // Create a downloadable file
    const blob = new Blob([configJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'profile-config.json';
    a.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: "Success",
      description: "Configuration exported successfully",
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-[#000009]">User Profile Management</CardTitle>
          <CardDescription>
            Configure how user profile information is organized and displayed
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Add New Section */}
          <div className="flex gap-2">
            <Input
              placeholder="Section name (e.g., Personal Information)"
              value={newSectionName}
              onChange={(e) => setNewSectionName(e.target.value)}
              className="flex-1"
            />
            <Button onClick={addSection}>
              <Plus className="h-4 w-4 mr-2" />
              Add Section
            </Button>
          </div>

          {/* Sections */}
          <div className="space-y-4">
            {Object.entries(profileConfig).map(([sectionName, fields]) => (
              <Card key={sectionName} className="border-2">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    {editingSection === sectionName ? (
                      <div className="flex items-center gap-2 flex-1">
                        <Input
                          value={editingSectionName}
                          onChange={(e) => setEditingSectionName(e.target.value)}
                          className="flex-1"
                        />
                        <Button size="sm" onClick={saveEditingSection}>
                          <Save className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={cancelEditingSection}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <CardTitle className="text-lg">{sectionName}</CardTitle>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => startEditingSection(sectionName)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => addField(sectionName)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteSection(sectionName)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {fields.length === 0 ? (
                    <p className="text-gray-500 text-sm">No fields added yet</p>
                  ) : (
                    <div className="space-y-4">
                      {fields.map((field, fieldIndex) => (
                        <div key={fieldIndex} className="grid grid-cols-1 md:grid-cols-6 gap-4 p-4 border rounded-lg">
                          <div>
                            <Label className="text-xs">Property</Label>
                            <Input
                              placeholder="fieldName"
                              value={field.property}
                              onChange={(e) => updateField(sectionName, fieldIndex, { property: e.target.value })}
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Label</Label>
                            <Input
                              placeholder="Display Name"
                              value={field.label}
                              onChange={(e) => updateField(sectionName, fieldIndex, { label: e.target.value })}
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Type</Label>
                            <Select 
                              value={field.type} 
                              onValueChange={(value: 'text' | 'image' | 'document') => 
                                updateField(sectionName, fieldIndex, { type: value })
                              }
                            >
                              <SelectTrigger className="mt-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="text">Text</SelectItem>
                                <SelectItem value="image">Image</SelectItem>
                                <SelectItem value="document">Document</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex flex-col gap-2">
                            <Label className="text-xs">Permissions</Label>
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id={`user-${fieldIndex}`}
                                checked={field.userCanEdit}
                                onCheckedChange={(checked) => 
                                  updateField(sectionName, fieldIndex, { userCanEdit: !!checked })
                                }
                              />
                              <Label htmlFor={`user-${fieldIndex}`} className="text-xs">User Edit</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id={`admin-${fieldIndex}`}
                                checked={field.adminCanEdit}
                                onCheckedChange={(checked) => 
                                  updateField(sectionName, fieldIndex, { adminCanEdit: !!checked })
                                }
                              />
                              <Label htmlFor={`admin-${fieldIndex}`} className="text-xs">Admin Edit</Label>
                            </div>
                          </div>
                          <div className="flex items-end">
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => deleteField(sectionName, fieldIndex)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Export Configuration */}
          {Object.keys(profileConfig).length > 0 && (
            <div className="pt-4 border-t">
              <Button onClick={exportConfig} className="w-full">
                Export Configuration
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default UserProfileManagement;
