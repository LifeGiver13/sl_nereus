import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, Save, ArrowLeft, GripVertical, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import AdminLayout from '@/components/AdminLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useApplicationForms } from '@/hooks/useApplicationForms';
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
  type: "text" | "email" | "tel" | "select" | "boolean" | "file" | "textArea" | "password" | "checkbox" | "skillsSelector" | "countryList";
  label: string;
  required?: boolean;
  condition?: any;
  options?: string[] | {
    trueLabel: string;
    trueValue: string;
    falseLabel: string;
    falseValue: string;
  };
  meta?: {
    defaultValue?: string;
    placeHolder?: string;
    acceptedFormats?: string;
    maxFileSize?: string;
    fileName?: string;
  };
};

type FormSection = {
  name: string;
  fields: Field[];
  displayOrder?: number;
  meta?: {
    action?: string;
    [key: string]: any;
  };
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

  // Helper functions for select field options
  const addSelectOption = () => {
    const currentOptions = Array.isArray(field.options) ? field.options : [];
    onUpdateField(sectionName, fieldIndex, { options: [...currentOptions, ''] });
  };

  const updateSelectOption = (optionIndex: number, value: string) => {
    const currentOptions = Array.isArray(field.options) ? field.options : [];
    const newOptions = [...currentOptions];
    newOptions[optionIndex] = value;
    onUpdateField(sectionName, fieldIndex, { options: newOptions });
  };

  const removeSelectOption = (optionIndex: number) => {
    const currentOptions = Array.isArray(field.options) ? field.options : [];
    const newOptions = currentOptions.filter((_, index) => index !== optionIndex);
    onUpdateField(sectionName, fieldIndex, { options: newOptions });
  };

  // Helper functions for boolean field options
  const updateBooleanOptions = (key: 'trueLabel' | 'trueValue' | 'falseLabel' | 'falseValue', value: string) => {
    const currentOptions = !Array.isArray(field.options) && field.options ? field.options : {
      trueLabel: 'Yes',
      trueValue: 'true',
      falseLabel: 'No',
      falseValue: 'false'
    };
    onUpdateField(sectionName, fieldIndex, { 
      options: { ...currentOptions, [key]: value } 
    });
  };

  // Helper function to update meta properties
  const updateMeta = (key: string, value: string) => {
    const currentMeta = field.meta || {};
    onUpdateField(sectionName, fieldIndex, { 
      meta: { ...currentMeta, [key]: value } 
    });
  };

  // Get default meta values based on field type
  const getDefaultMeta = () => {
    if (!field.meta) return {};
    return field.meta;
  };

  return (
    <div ref={setNodeRef} style={style} className="border rounded-lg p-4 space-y-4">
      {/* Main row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
            onValueChange={(value: any) => {
              // Reset options and meta when changing field type
              const updates: Partial<Field> = { type: value };
              
              // Set default options for specific field types
              if (value === 'boolean') {
                updates.options = {
                  trueLabel: 'Yes',
                  trueValue: 'true',
                  falseLabel: 'No',
                  falseValue: 'false'
                };
                updates.meta = {
                  defaultValue: '',
                  placeHolder: ''
                };
              } else if (value === 'select') {
                updates.options = [];
                updates.meta = {
                  defaultValue: ''
                };
              } else if (value === 'file') {
                updates.options = undefined;
                updates.meta = {
                  acceptedFormats: '',
                  maxFileSize: '',
                  fileName: ''
                };
              } else {
                updates.options = undefined;
                updates.meta = {
                  defaultValue: '',
                  placeHolder: ''
                };
              }
              
              onUpdateField(sectionName, fieldIndex, updates);
            }}
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
              <SelectItem value="checkbox">Checkbox</SelectItem>
              <SelectItem value="boolean">Boolean</SelectItem>
              <SelectItem value="file">File Upload</SelectItem>
              <SelectItem value="skillsSelector">Skills Selector</SelectItem>
              <SelectItem value="countryList">Country List</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Checkbox
              id={`required-${sectionName}-${fieldIndex}`}
              checked={field.required || false}
              onCheckedChange={(checked) => onUpdateField(sectionName, fieldIndex, { required: !!checked })}
            />
            <Label htmlFor={`required-${sectionName}-${fieldIndex}`} className="text-xs">Required</Label>
          </div>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => onDeleteField(sectionName, fieldIndex)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Tabs for Options and Conditions */}
      <Tabs defaultValue="options" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="options">Options</TabsTrigger>
          <TabsTrigger value="conditions">Conditions</TabsTrigger>
        </TabsList>
        
        <TabsContent value="options" className="space-y-4">
          {/* Select field options */}
          {field.type === 'select' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs">Dropdown Options</Label>
                <Button size="sm" variant="outline" onClick={addSelectOption}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Option
                </Button>
              </div>
              <div className="space-y-2">
                {Array.isArray(field.options) && field.options.map((option, optionIndex) => (
                  <div key={optionIndex} className="flex gap-2">
                    <Input
                      placeholder="Option value"
                      value={option}
                      onChange={(e) => updateSelectOption(optionIndex, e.target.value)}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => removeSelectOption(optionIndex)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {(!Array.isArray(field.options) || field.options.length === 0) && (
                  <p className="text-xs text-muted-foreground">No options added yet</p>
                )}
              </div>
              <div className="mt-4">
                <Label className="text-xs">Default Value</Label>
                <Input
                  placeholder="Default selection"
                  value={getDefaultMeta().defaultValue || ''}
                  onChange={(e) => updateMeta('defaultValue', e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          )}

          {/* Boolean field options */}
          {field.type === 'boolean' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">True Label</Label>
                  <Input
                    placeholder="Yes"
                    value={!Array.isArray(field.options) && field.options ? field.options.trueLabel : 'Yes'}
                    onChange={(e) => updateBooleanOptions('trueLabel', e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">True Value</Label>
                  <Input
                    placeholder="true"
                    value={!Array.isArray(field.options) && field.options ? field.options.trueValue : 'true'}
                    onChange={(e) => updateBooleanOptions('trueValue', e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">False Label</Label>
                  <Input
                    placeholder="No"
                    value={!Array.isArray(field.options) && field.options ? field.options.falseLabel : 'No'}
                    onChange={(e) => updateBooleanOptions('falseLabel', e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">False Value</Label>
                  <Input
                    placeholder="false"
                    value={!Array.isArray(field.options) && field.options ? field.options.falseValue : 'false'}
                    onChange={(e) => updateBooleanOptions('falseValue', e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Default Value</Label>
                  <Input
                    placeholder="Default value"
                    value={getDefaultMeta().defaultValue || ''}
                    onChange={(e) => updateMeta('defaultValue', e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Placeholder</Label>
                  <Input
                    placeholder="Placeholder text"
                    value={getDefaultMeta().placeHolder || ''}
                    onChange={(e) => updateMeta('placeHolder', e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>
          )}

          {/* File field options */}
          {field.type === 'file' && (
            <div className="space-y-4">
              <div>
                <Label className="text-xs">Accepted Formats</Label>
                <Input
                  placeholder="e.g., .pdf,.doc,.docx"
                  value={getDefaultMeta().acceptedFormats || ''}
                  onChange={(e) => updateMeta('acceptedFormats', e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Max File Size</Label>
                <Input
                  placeholder="e.g., 5MB"
                  value={getDefaultMeta().maxFileSize || ''}
                  onChange={(e) => updateMeta('maxFileSize', e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">File Name</Label>
                <Input
                  placeholder="Default file name"
                  value={getDefaultMeta().fileName || ''}
                  onChange={(e) => updateMeta('fileName', e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          )}

          {/* Standard text-based fields (text, email, tel, password, textArea, checkbox) */}
          {['text', 'email', 'tel', 'password', 'textArea', 'checkbox'].includes(field.type) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Default Value</Label>
                <Input
                  placeholder="Default value"
                  value={getDefaultMeta().defaultValue || ''}
                  onChange={(e) => updateMeta('defaultValue', e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Placeholder</Label>
                <Input
                  placeholder="Placeholder text"
                  value={getDefaultMeta().placeHolder || ''}
                  onChange={(e) => updateMeta('placeHolder', e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="conditions" className="space-y-4">
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Label className="text-xs">Related Field</Label>
                <Select 
                  value={field.condition?.field || 'none'} 
                  onValueChange={(value) => onUpdateField(sectionName, fieldIndex, { 
                    condition: value === 'none' ? undefined : { 
                      field: value, 
                      operator: field.condition?.operator || 'equals', 
                      action: field.condition?.action || 'hide',
                      value: field.condition?.value || '',
                      validate: field.condition?.validate || false
                    } 
                  })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select field" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No condition</SelectItem>
                    {allFields.filter(f => f.name && f.name !== field.name && f.name.trim() !== '').map((f) => (
                      <SelectItem key={f.name} value={f.name}>{f.label || f.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Comparison</Label>
                <Select 
                  value={field.condition?.operator || 'equals'} 
                  onValueChange={(value) => onUpdateField(sectionName, fieldIndex, { 
                    condition: { ...field.condition, operator: value } 
                  })}
                  disabled={!field.condition?.field}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select comparison" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="equals">Equals</SelectItem>
                    <SelectItem value="not_equals">Not Equals</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Value</Label>
                <Input
                  placeholder="Value to compare"
                  value={field.condition?.value || ''}
                  onChange={(e) => onUpdateField(sectionName, fieldIndex, { 
                    condition: { ...field.condition, value: e.target.value } 
                  })}
                  className="mt-1"
                  disabled={!field.condition?.field}
                />
              </div>
              <div>
                <Label className="text-xs">Action</Label>
                <Select 
                  value={field.condition?.action || 'hide'} 
                  onValueChange={(value) => onUpdateField(sectionName, fieldIndex, { 
                    condition: { ...field.condition, action: value } 
                  })}
                  disabled={!field.condition?.field}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select action" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hide">Hide</SelectItem>
                    <SelectItem value="show">Show</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {field.condition?.field && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground">
                  This field will be <strong>{field.condition?.action === 'hide' ? 'hidden/disabled' : 'shown/enabled'}</strong> when 
                  the field "{allFields.find(f => f.name === field.condition?.field)?.label || field.condition?.field}" 
                  {field.condition?.operator === 'not_equals' ? ' does not equal ' : ' equals '}
                  "{field.condition?.value || '[empty]'}"
                </p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

const ApplicationFormCreate = () => {
  const [form, setForm] = useState<ApplicationForm>({
    name: '',
    description: '',
    sections: {},
    meta: {}
  });
  const [loading, setLoading] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');
  const [isSortingSections, setIsSortingSections] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { createForm, updateForm, getForm } = useApplicationForms();

  const formId = searchParams.get('id');
  const formName = searchParams.get('name');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Helper function to get sections sorted by displayOrder
  const getSortedSections = () => {
    return Object.entries(form.sections).sort(([, a], [, b]) => {
      const orderA = a.displayOrder ?? 0;
      const orderB = b.displayOrder ?? 0;
      return orderA - orderB;
    });
  };

  const addSection = () => {
    if (newSectionName.trim()) {
      const existingSectionCount = Object.keys(form.sections).length;
      setForm(prev => ({
        ...prev,
        sections: {
          ...prev.sections,
          [newSectionName]: {
            name: newSectionName,
            fields: [],
            displayOrder: existingSectionCount
          }
        }
      }));
      setNewSectionName('');
    }
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
      required: false,
      meta: {
        defaultValue: '',
        placeHolder: ''
      }
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

  const handleFieldDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || !active.id.toString().startsWith('field-') || !over.id.toString().startsWith('field-')) {
      return;
    }

    // Find the section containing these fields
    const activeFieldIndex = parseInt(active.id.toString().replace('field-', ''));
    const overFieldIndex = parseInt(over.id.toString().replace('field-', ''));

    // Find which section contains the active field
    const sectionName = Object.keys(form.sections).find(sectionName => {
      const section = form.sections[sectionName];
      return activeFieldIndex < section.fields.length;
    });

    if (!sectionName || activeFieldIndex === overFieldIndex) {
      return;
    }

    setForm(prev => ({
      ...prev,
      sections: {
        ...prev.sections,
        [sectionName]: {
          ...prev.sections[sectionName],
          fields: arrayMove(prev.sections[sectionName].fields, activeFieldIndex, overFieldIndex)
        }
      }
    }));
  };

  const handleSectionDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || !active.id.toString().startsWith('section-') || !over.id.toString().startsWith('section-')) {
      return;
    }

    const activeSectionName = active.id.toString().replace('section-', '');
    const overSectionName = over.id.toString().replace('section-', '');

    if (activeSectionName === overSectionName) {
      return;
    }

    const sectionEntries = getSortedSections();
    const activeIndex = sectionEntries.findIndex(([name]) => name === activeSectionName);
    const overIndex = sectionEntries.findIndex(([name]) => name === overSectionName);

    if (activeIndex === -1 || overIndex === -1) {
      return;
    }

    const reorderedSections = arrayMove(sectionEntries, activeIndex, overIndex);
    
    // Update displayOrder for all sections
    const updatedSections = { ...form.sections };
    reorderedSections.forEach(([sectionName], index) => {
      updatedSections[sectionName] = {
        ...updatedSections[sectionName],
        displayOrder: index
      };
    });

    setForm(prev => ({
      ...prev,
      sections: updatedSections
    }));
  };

  // Load existing form data if editing
  useEffect(() => {
    const loadForm = async () => {
      if (formId) {
        setLoading(true);
        try {
          const existingForm = await getForm(parseInt(formId));
          if (existingForm) {
            // Ensure sections have displayOrder, assign based on current order if missing
            const sectionsWithOrder = { ...existingForm.sections };
            Object.entries(sectionsWithOrder).forEach(([sectionName, section], index) => {
              if (section.displayOrder === undefined) {
                sectionsWithOrder[sectionName] = {
                  ...section,
                  displayOrder: index
                };
              }
            });

            setForm({
              id: existingForm.id,
              name: existingForm.name,
              description: existingForm.description || '',
              sections: sectionsWithOrder,
              meta: existingForm.meta || {}
            });
          }
        } catch (error) {
          toast({
            title: "Error",
            description: "Failed to load form data",
            variant: "destructive",
          });
        } finally {
          setLoading(false);
        }
      }
    };

    loadForm();
  }, [formId, getForm, toast]);

  // Initialize form name from URL params
  useEffect(() => {
    if (formName && !formId) {
      setForm(prev => ({ ...prev, name: formName }));
    }
  }, [formName, formId]);

  // Get all fields across all sections for condition setup
  const allFields = Object.values(form.sections).flatMap(section => section.fields);

  // Sortable Section Component
  const SortableSection = ({ sectionName, section }: { sectionName: string; section: FormSection }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
    } = useSortable({ id: `section-${sectionName}` });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
    };

    return (
      <Card key={sectionName} ref={setNodeRef} style={style} className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isSortingSections && (
                <div {...attributes} {...listeners} className="cursor-grab hover:cursor-grabbing">
                  <GripVertical className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
              <CardTitle className="text-lg">{section.name}</CardTitle>
            </div>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => deleteSection(sectionName)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleFieldDragEnd}
          >
            <SortableContext items={section.fields.map((_, index) => `field-${index}`)} strategy={verticalListSortingStrategy}>
              <div className="space-y-4">
                {section.fields.map((field, fieldIndex) => (
                  <SortableField
                    key={fieldIndex}
                    field={field}
                    fieldIndex={fieldIndex}
                    sectionName={sectionName}
                    onUpdateField={updateField}
                    onDeleteField={deleteField}
                    allFields={allFields}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
          
          <Button
            onClick={() => addField(sectionName)}
            variant="outline"
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Field
          </Button>
        </CardContent>
      </Card>
    );
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

    setLoading(true);
    try {
      const formData = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        sections: form.sections,
        meta: form.meta
      };

      if (formId) {
        await updateForm(parseInt(formId), formData);
      } else {
        await createForm(formData);
      }

      toast({
        title: "Success",
        description: `Application form ${formId ? 'updated' : 'created'} successfully`,
      });
      
      navigate('/settings');
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to ${formId ? 'update' : 'create'} application form`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading && formId) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin mr-2" />
          Loading form data...
        </div>
      </AdminLayout>
    );
  }

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
              <h1 className="text-3xl font-bold text-foreground">{formId ? 'Edit' : 'Create'} Application Form</h1>
              <p className="text-muted-foreground mt-1">
                {formId ? 'Update the form configuration' : 'Configure your application form structure'}
              </p>
            </div>
          </div>
          <Button onClick={saveForm} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Saving...' : 'Save Form'}
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

        {/* Section Management */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Form Sections</CardTitle>
                <CardDescription>Organize your form fields into logical sections</CardDescription>
              </div>
              
              {Object.keys(form.sections).length > 1 && (
                <Button
                  variant={isSortingSections ? "default" : "outline"}
                  onClick={() => setIsSortingSections(!isSortingSections)}
                >
                  <GripVertical className="h-4 w-4 mr-2" />
                  {isSortingSections ? "Done Sorting" : "Sort Sections"}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                placeholder="Section name"
                value={newSectionName}
                onChange={(e) => setNewSectionName(e.target.value)}
              />
              <Button onClick={addSection}>
                <Plus className="h-4 w-4 mr-2" />
                Add Section
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Sections */}
        {isSortingSections ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleSectionDragEnd}
          >
            <SortableContext items={getSortedSections().map(([name]) => `section-${name}`)} strategy={verticalListSortingStrategy}>
              <div className="space-y-6">
                {getSortedSections().map(([sectionName, section]) => (
                  <SortableSection key={sectionName} sectionName={sectionName} section={section} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        ) : (
          getSortedSections().map(([sectionName, section]) => (
            <Card key={sectionName} className="mb-6">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{section.name}</CardTitle>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => deleteSection(sectionName)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleFieldDragEnd}
                >
                  <SortableContext items={section.fields.map((_, index) => `field-${index}`)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-4">
                      {section.fields.map((field, fieldIndex) => (
                        <SortableField
                          key={fieldIndex}
                          field={field}
                          fieldIndex={fieldIndex}
                          sectionName={sectionName}
                          onUpdateField={updateField}
                          onDeleteField={deleteField}
                          allFields={allFields}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
                
                <Button
                  onClick={() => addField(sectionName)}
                  variant="outline"
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Field
                </Button>
              </CardContent>
            </Card>
          ))
        )}

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