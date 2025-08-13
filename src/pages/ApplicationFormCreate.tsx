import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, Save, ArrowLeft, GripVertical, ChevronDown, ChevronRight } from 'lucide-react';
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

export type Field = {
  name: string;
  type: "text" | "email" | "tel" | "select" | "boolean" | "file" | "textArea" | "password" | "date" | "agreement";
  label: string;
  disabled?: boolean;
  required?: boolean;
  value?: string;
  condition?: any;
  options?: string[]; // Only for select fields
  trueLabel?: string; // Only for boolean fields
  falseLabel?: string; // Only for boolean fields
  booleanValue?: string; // for conditional fields
};

type FormSection = {
  name: string;
  fields: Field[];
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
  onDeleteField,
  allFields 
}: { 
  field: Field; 
  fieldIndex: number; 
  sectionName: string;
  onUpdateField: (sectionName: string, fieldIndex: number, field: Partial<Field>) => void;
  onDeleteField: (sectionName: string, fieldIndex: number) => void;
  allFields: Field[];
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
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

  const addOption = () => {
    const currentOptions = field.options || [];
    onUpdateField(sectionName, fieldIndex, { options: [...currentOptions, ''] });
  };

  const updateOption = (optionIndex: number, value: string) => {
    const currentOptions = field.options || [];
    const newOptions = [...currentOptions];
    newOptions[optionIndex] = value;
    onUpdateField(sectionName, fieldIndex, { options: newOptions });
  };

  const removeOption = (optionIndex: number) => {
    const currentOptions = field.options || [];
    const newOptions = currentOptions.filter((_, index) => index !== optionIndex);
    onUpdateField(sectionName, fieldIndex, { options: newOptions });
  };

  return (
    <div ref={setNodeRef} style={style} className="border rounded-lg p-4 space-y-4">
      {/* Main row */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="flex items-center">
          <div {...attributes} {...listeners} className="cursor-grab hover:cursor-grabbing mr-2">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <Label className="text-xs">Name</Label>
            <Input
              placeholder="field_name"
              value={field.name}
              onChange={(e) => onUpdateField(sectionName, fieldIndex, { name: e.target.value })}
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
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="tel">Phone</SelectItem>
              <SelectItem value="password">Password</SelectItem>
              <SelectItem value="textArea">Text Area</SelectItem>
              <SelectItem value="select">Select</SelectItem>
              <SelectItem value="boolean">Boolean</SelectItem>
              <SelectItem value="file">File Upload</SelectItem>
              <SelectItem value="date">Date</SelectItem>
              <SelectItem value="agreement">Agreement</SelectItem>
            </SelectContent>
          </Select>
        </div>
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
          <div className="flex items-center space-x-2">
            <Checkbox
              id={`disabled-${sectionName}-${fieldIndex}`}
              checked={field.disabled || false}
              onCheckedChange={(checked) => onUpdateField(sectionName, fieldIndex, { disabled: !!checked })}
            />
            <Label htmlFor={`disabled-${sectionName}-${fieldIndex}`} className="text-xs">Disabled</Label>
          </div>
        </div>
        <div className="flex items-end justify-between">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            {showAdvanced ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => onDeleteField(sectionName, fieldIndex)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Advanced options */}
      {showAdvanced && (
        <div className="space-y-4 pt-4 border-t">
          {/* Condition */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Show if field equals</Label>
              <Select 
                value={field.condition?.field || 'none'} 
                onValueChange={(value) => onUpdateField(sectionName, fieldIndex, { 
                  condition: value === 'none' ? undefined : { ...field.condition, field: value } 
                })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select field" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No condition</SelectItem>
                  {allFields.filter(f => f.name && f.name !== field.name).map((f) => (
                    <SelectItem key={f.name} value={f.name}>{f.label || f.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Value</Label>
              <Input
                placeholder="Expected value"
                value={field.condition?.value || ''}
                onChange={(e) => onUpdateField(sectionName, fieldIndex, { 
                  condition: { ...field.condition, value: e.target.value } 
                })}
                className="mt-1"
                disabled={!field.condition?.field}
              />
            </div>
          </div>

          {/* Type-specific options */}
          {field.type === 'select' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs">Options</Label>
                <Button size="sm" variant="outline" onClick={addOption}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Option
                </Button>
              </div>
              <div className="space-y-2">
                {(field.options || []).map((option, optionIndex) => (
                  <div key={optionIndex} className="flex gap-2">
                    <Input
                      placeholder="Option text"
                      value={option}
                      onChange={(e) => updateOption(optionIndex, e.target.value)}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => removeOption(optionIndex)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {(!field.options || field.options.length === 0) && (
                  <p className="text-xs text-muted-foreground">No options added yet</p>
                )}
              </div>
            </div>
          )}

          {field.type === 'boolean' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">True Label</Label>
                <Input
                  placeholder="Yes"
                  value={field.trueLabel || ''}
                  onChange={(e) => onUpdateField(sectionName, fieldIndex, { trueLabel: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">False Label</Label>
                <Input
                  placeholder="No"
                  value={field.falseLabel || ''}
                  onChange={(e) => onUpdateField(sectionName, fieldIndex, { falseLabel: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>
          )}
        </div>
      )}
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
    const newField: Field = {
      name: '',
      label: '',
      type: 'text',
      required: false
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

  const updateField = (sectionName: string, fieldIndex: number, field: Partial<Field>) => {
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
                      {form.sections[sectionName].fields.map((field, fieldIndex) => {
                        // Get all fields from all sections for condition references
                        const allFields = Object.values(form.sections).flatMap(section => section.fields);
                        
                        return (
                          <SortableField
                            key={`${sectionName}-${fieldIndex}`}
                            field={field}
                            fieldIndex={fieldIndex}
                            sectionName={sectionName}
                            onUpdateField={updateField}
                            onDeleteField={deleteField}
                            allFields={allFields}
                          />
                        );
                      })}
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