import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Trash2, Plus, Edit2, Save, X, Eye, GripVertical } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { API_BASE_URL } from '../config/env';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import {
  CSS,
} from '@dnd-kit/utilities';

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
  id?: number;
  name: string;
  sections: ViewSection;
  meta: { [key: string]: any };
}

const ViewManagement = () => {
  const [viewManagers, setViewManagers] = useState<ViewManager[]>([]);
  const [selectedViewManager, setSelectedViewManager] = useState<ViewManager | null>(null);
  const [newViewManagerName, setNewViewManagerName] = useState('');
  const [newSectionName, setNewSectionName] = useState('');
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editingSectionName, setEditingSectionName] = useState('');
  const [loading, setLoading] = useState(false);
  const [sortingMode, setSortingMode] = useState(false);
  const { toast } = useToast();

  // Fetch all view managers
  useEffect(() => {
    fetchViewManagers();
  }, []);

  const fetchViewManagers = async () => {
    try {
      setLoading(true);
      const response = await fetch(API_BASE_URL + '/utils/view-managers');
      if (response.ok) {
        const data = await response.json();
        setViewManagers(data);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch view managers",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createViewManager = async () => {
    if (!newViewManagerName.trim()) {
      toast({
        title: "Error",
        description: "View manager name cannot be empty",
        variant: "destructive",
      });
      return;
    }

    try {
      const newViewManager: ViewManager = {
        name: newViewManagerName,
        sections: {},
        meta: {}
      };

      const response = await fetch(API_BASE_URL + '/utils/view-manager', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newViewManager)
      });

      if (response.ok) {
        const created = await response.json();
        setViewManagers(prev => [...prev, created]);
        setNewViewManagerName('');
        toast({
          title: "Success",
          description: "View manager created successfully",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create view manager",
        variant: "destructive",
      });
    }
  };

  const updateViewManager = async () => {
    if (!selectedViewManager?.id) return;

    try {
      const response = await fetch( API_BASE_URL + `/utils/view-manager/${selectedViewManager.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(selectedViewManager)
      });

      if (response.ok) {
        const updated = await response.json();
        setViewManagers(prev => prev.map(vm => vm.id === updated.id ? updated : vm));
        toast({
          title: "Success",
          description: "View manager updated successfully",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update view manager",
        variant: "destructive",
      });
    }
  };

  const addSection = () => {
    if (!newSectionName.trim() || !selectedViewManager) return;

    if (selectedViewManager.sections[newSectionName]) {
      toast({
        title: "Error",
        description: "Section already exists",
        variant: "destructive",
      });
      return;
    }

    setSelectedViewManager(prev => prev ? {
      ...prev,
      sections: {
        ...prev.sections,
        [newSectionName]: []
      }
    } : null);
    setNewSectionName('');
  };

  const deleteSection = (sectionName: string) => {
    if (!selectedViewManager) return;

    const newSections = { ...selectedViewManager.sections };
    delete newSections[sectionName];
    
    setSelectedViewManager(prev => prev ? {
      ...prev,
      sections: newSections
    } : null);
  };

  const addField = (sectionName: string) => {
    if (!selectedViewManager) return;

    const newField: ViewField = {
      property: '',
      label: '',
      type: 'text',
      meta: {
        userCanEdit: false,
        adminCanEdit: true
      }
    };

    setSelectedViewManager(prev => prev ? {
      ...prev,
      sections: {
        ...prev.sections,
        [sectionName]: [...prev.sections[sectionName], newField]
      }
    } : null);
  };

  const updateField = (sectionName: string, fieldIndex: number, field: Partial<ViewField>) => {
    if (!selectedViewManager) return;

    const updatedFields = selectedViewManager.sections[sectionName].map((f, index) => 
      index === fieldIndex ? { ...f, ...field } : f
    );

    setSelectedViewManager(prev => prev ? {
      ...prev,
      sections: {
        ...prev.sections,
        [sectionName]: updatedFields
      }
    } : null);
  };

  const updateFieldMeta = (sectionName: string, fieldIndex: number, metaKey: string, value: any) => {
    if (!selectedViewManager) return;

    const field = selectedViewManager.sections[sectionName][fieldIndex];
    updateField(sectionName, fieldIndex, {
      meta: { ...field.meta, [metaKey]: value }
    });
  };

  const deleteField = (sectionName: string, fieldIndex: number) => {
    if (!selectedViewManager) return;

    const updatedFields = selectedViewManager.sections[sectionName].filter((_, index) => index !== fieldIndex);
    
    setSelectedViewManager(prev => prev ? {
      ...prev,
      sections: {
        ...prev.sections,
        [sectionName]: updatedFields
      }
    } : null);
  };

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleSectionDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id && selectedViewManager) {
      const sectionNames = Object.keys(selectedViewManager.sections);
      const oldIndex = sectionNames.indexOf(active.id as string);
      const newIndex = sectionNames.indexOf(over?.id as string);

      const newSectionNames = arrayMove(sectionNames, oldIndex, newIndex);
      const newSections: ViewSection = {};
      
      newSectionNames.forEach(name => {
        newSections[name] = selectedViewManager.sections[name];
      });

      setSelectedViewManager(prev => prev ? {
        ...prev,
        sections: newSections
      } : null);
    }
  };

  const handleFieldDragEnd = (event: DragEndEvent, sectionName: string) => {
    const { active, over } = event;

    if (active.id !== over?.id && selectedViewManager) {
      const fields = selectedViewManager.sections[sectionName];
      const oldIndex = fields.findIndex((_, index) => `field-${index}` === active.id);
      const newIndex = fields.findIndex((_, index) => `field-${index}` === over?.id);

      const newFields = arrayMove(fields, oldIndex, newIndex);

      setSelectedViewManager(prev => prev ? {
        ...prev,
        sections: {
          ...prev.sections,
          [sectionName]: newFields
        }
      } : null);
    }
  };

  // Editable Section Component (no drag and drop)
  const EditableSection = ({ sectionName, fields }: { sectionName: string; fields: ViewField[] }) => {
    return (
      <Card className="border">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">{sectionName}</CardTitle>
            </div>
            <div className="flex gap-2">
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
          </div>
        </CardHeader>
        <CardContent>
          {fields.length === 0 ? (
            <p className="text-gray-500 text-sm">No fields added yet</p>
          ) : (
            <div className="space-y-4">
               {fields.map((field, fieldIndex) => (
                 <EditableField
                   key={`${sectionName}-${fieldIndex}`}
                   field={field}
                   fieldIndex={fieldIndex}
                   sectionName={sectionName}
                 />
               ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // Editable Field Component (no drag and drop)
  const EditableField = ({ 
    field, 
    fieldIndex, 
    sectionName 
  }: { 
    field: ViewField; 
    fieldIndex: number; 
    sectionName: string; 
  }) => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 p-4 border rounded-lg">
        <div>
          <Label className="text-xs">Property</Label>
          <Input
            placeholder="fieldName or nested.property"
            value={field.property}
            onChange={(e) => updateField(sectionName, fieldIndex, { property: e.target.value })}
            className="mt-1"
            title="Use dot notation for nested properties (e.g., address.branch, contact.firstName)"
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
              id={`user-${sectionName}-${fieldIndex}`}
              checked={field.meta?.userCanEdit || false}
              onCheckedChange={(checked) => 
                updateFieldMeta(sectionName, fieldIndex, 'userCanEdit', !!checked)
              }
            />
            <Label htmlFor={`user-${sectionName}-${fieldIndex}`} className="text-xs">User Edit</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id={`admin-${sectionName}-${fieldIndex}`}
              checked={field.meta?.adminCanEdit || false}
              onCheckedChange={(checked) => 
                updateFieldMeta(sectionName, fieldIndex, 'adminCanEdit', !!checked)
              }
            />
            <Label htmlFor={`admin-${sectionName}-${fieldIndex}`} className="text-xs">Admin Edit</Label>
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
    );
  };

  // Sortable Section Component
  const SortableSection = ({ sectionName, fields }: { sectionName: string; fields: ViewField[] }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
    } = useSortable({ id: sectionName });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
    };

    return (
      <Card ref={setNodeRef} style={style} className="border">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div {...attributes} {...listeners} className="cursor-grab hover:cursor-grabbing">
                <GripVertical className="h-4 w-4 text-gray-400" />
              </div>
              <CardTitle className="text-lg">{sectionName}</CardTitle>
            </div>
            <div className="flex gap-2">
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
          </div>
        </CardHeader>
        <CardContent>
          {fields.length === 0 ? (
            <p className="text-gray-500 text-sm">No fields added yet</p>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(event) => handleFieldDragEnd(event, sectionName)}>
              <SortableContext items={fields.map((_, index) => `field-${index}`)} strategy={verticalListSortingStrategy}>
                <div className="space-y-4">
                   {fields.map((field, fieldIndex) => (
                     <SortableField
                       key={`${sectionName}-${fieldIndex}`}
                       field={field}
                       fieldIndex={fieldIndex}
                       sectionName={sectionName}
                       onUpdateField={memoizedUpdateField}
                       onUpdateFieldMeta={memoizedUpdateFieldMeta}
                       onDeleteField={memoizedDeleteField}
                     />
                   ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </CardContent>
      </Card>
    );
  };

  // Memoize handlers to prevent unnecessary re-renders
  const memoizedUpdateField = useCallback((sectionName: string, fieldIndex: number, field: Partial<ViewField>) => {
    updateField(sectionName, fieldIndex, field);
  }, []);

  const memoizedUpdateFieldMeta = useCallback((sectionName: string, fieldIndex: number, metaKey: string, value: any) => {
    updateFieldMeta(sectionName, fieldIndex, metaKey, value);
  }, []);

  const memoizedDeleteField = useCallback((sectionName: string, fieldIndex: number) => {
    deleteField(sectionName, fieldIndex);
  }, []);

  // Sortable Field Component
  const SortableField = ({ 
    field, 
    fieldIndex, 
    sectionName, 
    onUpdateField, 
    onUpdateFieldMeta, 
    onDeleteField 
  }: { 
    field: ViewField; 
    fieldIndex: number; 
    sectionName: string; 
    onUpdateField: (sectionName: string, fieldIndex: number, field: Partial<ViewField>) => void;
    onUpdateFieldMeta: (sectionName: string, fieldIndex: number, metaKey: string, value: any) => void;
    onDeleteField: (sectionName: string, fieldIndex: number) => void;
  }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
    } = useSortable({ id: `field-${fieldIndex}` });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
    };

    return (
      <div ref={setNodeRef} style={style} className="grid grid-cols-1 md:grid-cols-7 gap-4 p-4 border rounded-lg">
        <div className="flex items-center">
          <div {...attributes} {...listeners} className="cursor-grab hover:cursor-grabbing">
            <GripVertical className="h-4 w-4 text-gray-400" />
          </div>
        </div>
        <div>
          <Label className="text-xs">Property</Label>
          <Input
            placeholder="fieldName or nested.property"
            value={field.property}
            onChange={(e) => onUpdateField(sectionName, fieldIndex, { property: e.target.value })}
            className="mt-1"
            title="Use dot notation for nested properties (e.g., address.branch, contact.firstName)"
          />
        </div>
        <div>
          <Label className="text-xs">Label</Label>
          <Input
            placeholder="Display Name"
            value={field.label}
            onChange={(e) => onUpdateField(sectionName, fieldIndex, { label: e.target.value })}
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-xs">Type</Label>
          <Select 
            value={field.type} 
            onValueChange={(value: 'text' | 'image' | 'document') => 
              onUpdateField(sectionName, fieldIndex, { type: value })
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
              id={`user-${sectionName}-${fieldIndex}`}
              checked={field.meta?.userCanEdit || false}
              onCheckedChange={(checked) => 
                onUpdateFieldMeta(sectionName, fieldIndex, 'userCanEdit', !!checked)
              }
            />
            <Label htmlFor={`user-${sectionName}-${fieldIndex}`} className="text-xs">User Edit</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id={`admin-${sectionName}-${fieldIndex}`}
              checked={field.meta?.adminCanEdit || false}
              onCheckedChange={(checked) => 
                onUpdateFieldMeta(sectionName, fieldIndex, 'adminCanEdit', !!checked)
              }
            />
            <Label htmlFor={`admin-${sectionName}-${fieldIndex}`} className="text-xs">Admin Edit</Label>
          </div>
        </div>
        <div className="flex items-end">
          <Button
            size="sm"
            variant="destructive"
            onClick={() => onDeleteField(sectionName, fieldIndex)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-[#000009]">View Management</CardTitle>
          <CardDescription>
            Manage view configurations for organizing profile information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Create New View Manager */}
          <div className="flex gap-2">
            <Input
              placeholder="View manager name"
              value={newViewManagerName}
              onChange={(e) => setNewViewManagerName(e.target.value)}
              className="flex-1"
            />
            <Button onClick={createViewManager}>
              <Plus className="h-4 w-4 mr-2" />
              Create View Manager
            </Button>
          </div>

          {/* View Managers List */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {viewManagers.map((viewManager) => (
              <Card 
                key={viewManager.id} 
                className={`cursor-pointer transition-colors ${
                  selectedViewManager?.id === viewManager.id ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => setSelectedViewManager(viewManager)}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{viewManager.name}</CardTitle>
                  <CardDescription className="text-xs">
                    {Object.keys(viewManager.sections).length} sections
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedViewManager(viewManager);
                    }}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Selected View Manager Editor */}
          {selectedViewManager && (
            <Card className="border-2">
              <CardHeader>
                <CardTitle>Editing: {selectedViewManager.name}</CardTitle>
                <div className="flex gap-2">
                  <Button 
                    variant={sortingMode ? "default" : "outline"}
                    onClick={() => setSortingMode(!sortingMode)}
                  >
                    <GripVertical className="h-4 w-4 mr-2" />
                    {sortingMode ? "Exit Sort Mode" : "Sort Mode"}
                  </Button>
                  <Button onClick={updateViewManager}>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </Button>
                </div>
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
                  {sortingMode ? (
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleSectionDragEnd}>
                      <SortableContext items={Object.keys(selectedViewManager.sections)} strategy={verticalListSortingStrategy}>
                        {Object.entries(selectedViewManager.sections).map(([sectionName, fields]) => (
                          <SortableSection key={sectionName} sectionName={sectionName} fields={fields} />
                        ))}
                      </SortableContext>
                    </DndContext>
                  ) : (
                    Object.entries(selectedViewManager.sections).map(([sectionName, fields]) => (
                      <EditableSection key={sectionName} sectionName={sectionName} fields={fields} />
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ViewManagement;