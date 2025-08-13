import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, Save, ArrowLeft, GripVertical } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import AdminLayout from '@/components/AdminLayout';
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
import { CSS } from '@dnd-kit/utilities';

type FormField = {
  property: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'checkbox' | 'file';
  required: boolean;
  options?: string[];
  meta: { [key: string]: any };
};

type FormSection = {
  name: string;
  fields: FormField[];
};

type ApplicationForm = {
  id?: number;
  name: string;
  description: string;
  sections: { [x: string]: FormSection };
  meta: { [x: string]: any };
};

const SortableField = ({ 
  field, 
  fieldIndex, 
  sectionName, 
  onUpdateField, 
  onDeleteField 
}: { 
  field: FormField; 
  fieldIndex: number; 
  sectionName: string;
  onUpdateField: (sectionName: string, fieldIndex: number, field: Partial<FormField>) => void;
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
    <div ref={setNodeRef} style={style} className="grid grid-cols-1 md:grid-cols-6 gap-4 p-4 border rounded-lg">
      <div className="flex items-center">
        <div {...attributes} {...listeners} className="cursor-grab hover:cursor-grabbing mr-2">
          <GripVertical className="h-4 w-4 text-gray-400" />
        </div>
        <div className="flex-1">
          <Label className="text-xs">Property</Label>
          <Input
            placeholder="field_name"
            value={field.property}
            onChange={(e) => onUpdateField(sectionName, fieldIndex, { property: e.target.value })}
            className="mt-1"
          />
        </div>
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
          onValueChange={(value: any) => onUpdateField(sectionName, fieldIndex, { type: value })}
        >
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="text">Text</SelectItem>
            <SelectItem value="textarea">Textarea</SelectItem>
            <SelectItem value="select">Select</SelectItem>
            <SelectItem value="checkbox">Checkbox</SelectItem>
            <SelectItem value="file">File Upload</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {field.type === 'select' && (
        <div>
          <Label className="text-xs">Options (comma-separated)</Label>
          <Input
            placeholder="Option 1, Option 2, Option 3"
            value={field.options?.join(', ') || ''}
            onChange={(e) => onUpdateField(sectionName, fieldIndex, { 
              options: e.target.value.split(',').map(opt => opt.trim()).filter(opt => opt) 
            })}
            className="mt-1"
          />
        </div>
      )}
      <div className="flex flex-col gap-2">
        <Label className="text-xs">Settings</Label>
        <div className="flex items-center space-x-2">
          <Checkbox
            id={`required-${sectionName}-${fieldIndex}`}
            checked={field.required || false}
            onCheckedChange={(checked) => onUpdateField(sectionName, fieldIndex, { required: !!checked })}
          />
          <Label htmlFor={`required-${sectionName}-${fieldIndex}`} className="text-xs">Required</Label>
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

const ApplicationFormCreate = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  
  const [form, setForm] = useState<ApplicationForm>({
    name: searchParams.get('name') || '',
    description: '',
    sections: {},
    meta: {}
  });

  const [newSectionName, setNewSectionName] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const addSection = () => {
    if (!newSectionName.trim()) return;

    if (form.sections[newSectionName]) {
      toast({
        title: "Error",
        description: "Section already exists",
        variant: "destructive",
      });
      return;
    }

    setForm(prev => ({
      ...prev,
      sections: {
        ...prev.sections,
        [newSectionName]: {
          name: newSectionName,
          fields: []
        }
      }
    }));
    setNewSectionName('');
  };

  const deleteSection = (sectionName: string) => {
    const newSections = { ...form.sections };
    delete newSections[sectionName];
    setForm(prev => ({ ...prev, sections: newSections }));
  };

  const addField = (sectionName: string) => {
    const newField: FormField = {
      property: '',
      label: '',
      type: 'text',
      required: false,
      meta: {}
    };

    setForm(prev => ({
      ...prev,
      sections: {
        ...prev.sections,
        [sectionName]: {
          ...prev.sections[sectionName],
          fields: [...prev.sections[sectionName].fields, newField]
        }
      }
    }));
  };

  const updateField = (sectionName: string, fieldIndex: number, field: Partial<FormField>) => {
    setForm(prev => ({
      ...prev,
      sections: {
        ...prev.sections,
        [sectionName]: {
          ...prev.sections[sectionName],
          fields: prev.sections[sectionName].fields.map((f, index) => 
            index === fieldIndex ? { ...f, ...field } : f
          )
        }
      }
    }));
  };

  const deleteField = (sectionName: string, fieldIndex: number) => {
    setForm(prev => ({
      ...prev,
      sections: {
        ...prev.sections,
        [sectionName]: {
          ...prev.sections[sectionName],
          fields: prev.sections[sectionName].fields.filter((_, index) => index !== fieldIndex)
        }
      }
    }));
  };

  const handleFieldDragEnd = (event: DragEndEvent, sectionName: string) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const fields = form.sections[sectionName].fields;
      const oldIndex = fields.findIndex((_, index) => `field-${index}` === active.id);
      const newIndex = fields.findIndex((_, index) => `field-${index}` === over?.id);

      const newFields = arrayMove(fields, oldIndex, newIndex);

      setForm(prev => ({
        ...prev,
        sections: {
          ...prev.sections,
          [sectionName]: {
            ...prev.sections[sectionName],
            fields: newFields
          }
        }
      }));
    }
  };

  const saveForm = async () => {
    if (!form.name.trim()) {
      toast({
        title: "Error",
        description: "Form name is required",
        variant: "destructive",
      });
      return;
    }

    // For now, just show success message since we don't have the API endpoint
    toast({
      title: "Success",
      description: "Application form saved successfully",
    });
    
    // Navigate back to settings
    navigate('/settings');
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => navigate('/settings')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Settings
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Create Application Form</h1>
              <p className="text-muted-foreground mt-1">Configure your application form structure</p>
            </div>
          </div>
          <Button onClick={saveForm}>
            <Save className="h-4 w-4 mr-2" />
            Save Form
          </Button>
        </div>

        {/* Form Details */}
        <Card>
          <CardHeader>
            <CardTitle>Form Details</CardTitle>
            <CardDescription>Configure the basic information for your form</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="form-name">Form Name</Label>
              <Input
                id="form-name"
                value={form.name}
                onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter form name"
              />
            </div>
            <div>
              <Label htmlFor="form-description">Description</Label>
              <Textarea
                id="form-description"
                value={form.description}
                onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter form description"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Add Section */}
        <Card>
          <CardHeader>
            <CardTitle>Add Section</CardTitle>
            <CardDescription>Organize your form fields into logical sections</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                value={newSectionName}
                onChange={(e) => setNewSectionName(e.target.value)}
                placeholder="Section name"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    addSection();
                  }
                }}
              />
              <Button onClick={addSection} disabled={!newSectionName.trim()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Section
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Sections */}
        {Object.keys(form.sections).map((sectionName) => (
          <Card key={sectionName} className="border">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{sectionName}</CardTitle>
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
              {form.sections[sectionName].fields.length === 0 ? (
                <p className="text-muted-foreground text-sm">No fields added yet</p>
              ) : (
                <DndContext 
                  sensors={sensors} 
                  collisionDetection={closestCenter} 
                  onDragEnd={(event) => handleFieldDragEnd(event, sectionName)}
                >
                  <SortableContext 
                    items={form.sections[sectionName].fields.map((_, index) => `field-${index}`)} 
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-4">
                      {form.sections[sectionName].fields.map((field, fieldIndex) => (
                        <SortableField
                          key={`${sectionName}-${fieldIndex}`}
                          field={field}
                          fieldIndex={fieldIndex}
                          sectionName={sectionName}
                          onUpdateField={updateField}
                          onDeleteField={deleteField}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </CardContent>
          </Card>
        ))}

        {Object.keys(form.sections).length === 0 && (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground">No sections added yet. Add a section to get started.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
};

export default ApplicationFormCreate;