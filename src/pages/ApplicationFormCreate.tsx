import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, Save, ArrowLeft, GripVertical, Loader2, Copy, ChevronDown, ChevronUp, X, Bold, List, Type } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import AdminLayout from '@/components/AdminLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useApplicationForms } from '@/hooks/useApplicationForms';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DeclarationEditor } from '@/components/DeclarationEditor';
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
  type: "text" | "email" | "tel" | "select" | "radio" | "boolean" | "file" | "textArea" | "password" | "checkbox" | "skillsSelector" | "countryList" | "employmentHistory" | "referees" | "hidden" | "declaration" | "warning" | "date" | "number" | "currency";
  label: string;
  required?: boolean;
  readOnly?: boolean;
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
    minLength?: number;
    maxLength?: number;
    capitalize?: boolean;
    toUppercase?: boolean;
    stripSpaces?: boolean;
    content?: string;
    title?: string;
    prefix?: string;
    suffix?: string;
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

// Helper function to generate URL-friendly slug from section name
const generateSectionUrl = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')           // Replace spaces with hyphens
    .replace(/[^a-z0-9-]/g, '')     // Remove special characters
    .replace(/-+/g, '-')            // Replace multiple hyphens with single
    .replace(/^-|-$/g, '');         // Trim leading/trailing hyphens
};

// Helper function to generate condition descriptions
const getConditionDescription = (condition: any) => {
  if (!condition) return '';

  switch (condition.operator) {
    case 'equals':
      return `equals "${condition.value || '[empty]'}"`;
    case 'not_equals':
      return `does not equal "${condition.value || '[empty]'}"`;
    case 'isSet':
      return 'is set (has any value)';
    case 'isNotSet':
      return 'is not set (is empty)';
    default:
      return `equals "${condition.value || '[empty]'}"`;
  }
};

// Pure field editor without any drag-drop functionality
const FieldEditor = ({
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
  const updateMeta = (key: string, value: string | number | boolean | '') => {
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
    <div className="space-y-4">
      {/* Main row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <Label className="text-xs">Name</Label>
          <Input
            placeholder="field_name"
            value={field.name}
            onChange={(e) => onUpdateField(sectionName, fieldIndex, { name: e.target.value })}
            className="mt-1"
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
              } else if (value === 'select' || value === 'radio') {
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
              } else if (value === 'declaration') {
                updates.options = undefined;
                updates.meta = {
                  content: ''
                };
                updates.required = false;
                updates.readOnly = true;
              } else if (value === 'warning') {
                updates.options = undefined;
                updates.meta = {
                  title: '',
                  content: ''
                };
                updates.required = false;
                updates.readOnly = true;
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
              <SelectItem value="number">Number</SelectItem>
              <SelectItem value="currency">Currency</SelectItem>
              <SelectItem value="date">Date</SelectItem>
              <SelectItem value="tel">Phone</SelectItem>
              <SelectItem value="password">Password</SelectItem>
              <SelectItem value="textArea">Text Area</SelectItem>
              <SelectItem value="select">Select</SelectItem>
              <SelectItem value="radio">Radio Button (radio)</SelectItem>
              <SelectItem value="checkbox">Checkbox</SelectItem>
              <SelectItem value="boolean">Boolean</SelectItem>
              <SelectItem value="file">File Upload</SelectItem>
              <SelectItem value="skillsSelector">Skills Selector</SelectItem>
              <SelectItem value="countryList">Country List</SelectItem>
              <SelectItem value="employmentHistory">Employment History</SelectItem>
              <SelectItem value="referees">Referees</SelectItem>
              <SelectItem value="hidden">Hidden</SelectItem>
              <SelectItem value="declaration">Declaration (Formatted Text Display)</SelectItem>
              <SelectItem value="warning">Warning (Title + Body, Read Only)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center justify-between">
          <div className="space-y-2">
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
                id={`readonly-${sectionName}-${fieldIndex}`}
                checked={field.readOnly || false}
                onCheckedChange={(checked) => onUpdateField(sectionName, fieldIndex, { readOnly: !!checked })}
              />
              <Label htmlFor={`readonly-${sectionName}-${fieldIndex}`} className="text-xs">Read Only</Label>
            </div>
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
          {/* Select / Radio field options (same settings) */}
          {(field.type === 'select' || field.type === 'radio') && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs">{field.type === 'radio' ? 'Radio options' : 'Dropdown Options'}</Label>
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

          {/* Declaration field options */}
          {field.type === 'declaration' && (
            <DeclarationEditor
              content={getDefaultMeta().content || ''}
              onChange={(content) => updateMeta('content', content)}
            />
          )}

          {/* Warning field options (title + body, read-only display) */}
          {field.type === 'warning' && (
            <div className="space-y-4">
              <div>
                <Label className="text-xs">Title</Label>
                <Input
                  placeholder="Warning title"
                  value={getDefaultMeta().title || ''}
                  onChange={(e) => updateMeta('title', e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Body</Label>
                <Textarea
                  placeholder="Warning body text (supports markdown)"
                  value={getDefaultMeta().content || ''}
                  onChange={(e) => updateMeta('content', e.target.value)}
                  className="mt-1 min-h-[120px]"
                />
              </div>
            </div>
          )}

          {/* Standard text-based fields (text, email, tel, password, textArea, checkbox) */}
          {['text', 'email', 'tel', 'password', 'textArea', 'checkbox', 'date', 'number', 'currency'].includes(field.type) && (
            <div className="space-y-4">
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

              {/* Prefix and Suffix - available for all field types */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Prefix</Label>
                  <Input
                    placeholder="Text to display before the field value"
                    value={getDefaultMeta().prefix || ''}
                    onChange={(e) => updateMeta('prefix', e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Suffix</Label>
                  <Input
                    placeholder="Text to display after the field value"
                    value={getDefaultMeta().suffix || ''}
                    onChange={(e) => updateMeta('suffix', e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Validation Rules - only for text input types */}
              {['text', 'email', 'tel', 'password', 'textArea'].includes(field.type) && (
                <div>
                  <Label className="text-xs font-semibold mb-2 block">Validation Rules</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs">Minimum Length</Label>
                      <Input
                        type="number"
                        placeholder="Min characters"
                        value={getDefaultMeta().minLength || ''}
                        onChange={(e) => updateMeta('minLength', e.target.value ? parseInt(e.target.value) : '')}
                        className="mt-1"
                        min="0"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Maximum Length</Label>
                      <Input
                        type="number"
                        placeholder="Max characters"
                        value={getDefaultMeta().maxLength || ''}
                        onChange={(e) => updateMeta('maxLength', e.target.value ? parseInt(e.target.value) : '')}
                        className="mt-1"
                        min="0"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Transformers - only for text input types */}
              {['text', 'email', 'tel', 'password', 'textArea'].includes(field.type) && (
                <div>
                  <Label className="text-xs font-semibold mb-2 block">Transformers</Label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`capitalize-${sectionName}-${fieldIndex}`}
                        checked={!!getDefaultMeta().capitalize}
                        onCheckedChange={(checked) => updateMeta('capitalize', !!checked)}
                      />
                      <Label htmlFor={`capitalize-${sectionName}-${fieldIndex}`} className="text-xs">
                        Capitalize (First letter of each word)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`uppercase-${sectionName}-${fieldIndex}`}
                        checked={!!getDefaultMeta().toUppercase}
                        onCheckedChange={(checked) => updateMeta('toUppercase', !!checked)}
                      />
                      <Label htmlFor={`uppercase-${sectionName}-${fieldIndex}`} className="text-xs">
                        To Uppercase (ALL CAPS)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`stripspaces-${sectionName}-${fieldIndex}`}
                        checked={!!getDefaultMeta().stripSpaces}
                        onCheckedChange={(checked) => updateMeta('stripSpaces', !!checked)}
                      />
                      <Label htmlFor={`stripspaces-${sectionName}-${fieldIndex}`} className="text-xs">
                        Strip Spaces (Remove all spaces)
                      </Label>
                    </div>
                  </div>
                </div>
              )}
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
                    <SelectItem value="isSet">Is set</SelectItem>
                    <SelectItem value="isNotSet">Is not set</SelectItem>
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
                  disabled={!field.condition?.field || ['isSet', 'isNotSet'].includes(field.condition?.operator)}
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
                    <SelectItem value="setValue">Set value</SelectItem>
                    <SelectItem value="clearValue">Clear value</SelectItem>
                    <SelectItem value="matchValue">Match value</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Show setValue input when action is setValue */}
            {field.condition?.field && field.condition?.action === 'setValue' && (
              <div>
                <Label className="text-xs">Value to Set</Label>
                <Input
                  placeholder="Value to set on this field"
                  value={field.condition?.setValue || ''}
                  onChange={(e) => onUpdateField(sectionName, fieldIndex, {
                    condition: { ...field.condition, setValue: e.target.value }
                  })}
                  className="mt-1"
                />
              </div>
            )}

            {field.condition?.field && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground">
                  {field.condition?.action === 'hide' && `This field will be hidden/disabled when the field "${allFields.find(f => f.name === field.condition?.field)?.label || field.condition?.field}" ${getConditionDescription(field.condition)}`}
                  {field.condition?.action === 'show' && `This field will be shown/enabled when the field "${allFields.find(f => f.name === field.condition?.field)?.label || field.condition?.field}" ${getConditionDescription(field.condition)}`}
                  {field.condition?.action === 'setValue' && `This field will be set to "${field.condition?.setValue || '[no value]'}" when the field "${allFields.find(f => f.name === field.condition?.field)?.label || field.condition?.field}" ${getConditionDescription(field.condition)}`}
                  {field.condition?.action === 'clearValue' && `This field will be cleared when the field "${allFields.find(f => f.name === field.condition?.field)?.label || field.condition?.field}" ${getConditionDescription(field.condition)}`}
                  {field.condition?.action === 'matchValue' && `This field will be set to match the value of "${allFields.find(f => f.name === field.condition?.field)?.label || field.condition?.field}" when it ${getConditionDescription(field.condition)}`}
                </p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Compact field card component with expand functionality
const CompactFieldCard = ({
  field,
  fieldIndex,
  sectionName,
  onExpand,
  isExpanded,
  onUpdateField,
  onDeleteField,
  allFields,
  onCollapse,
  onSave,
  loading
}: {
  field: Field;
  fieldIndex: number;
  sectionName: string;
  onExpand: () => void;
  isExpanded: boolean;
  onUpdateField: (sectionName: string, fieldIndex: number, field: Partial<Field>) => void;
  onDeleteField: (sectionName: string, fieldIndex: number) => void;
  allFields: Field[];
  onCollapse: () => void;
  onSave: () => void;
  loading: boolean;
}) => {
  if (isExpanded) {
    return (
      <div className="border rounded-lg p-4 space-y-4 bg-card">
        <FieldEditor
          field={field}
          fieldIndex={fieldIndex}
          sectionName={sectionName}
          onUpdateField={onUpdateField}
          onDeleteField={onDeleteField}
          allFields={allFields}
        />
        <div className="flex justify-between items-center pt-2 border-t">
          <Button
            size="sm"
            variant="outline"
            onClick={onCollapse}
          >
            Collapse
          </Button>
          <Button
            size="sm"
            onClick={onSave}
            disabled={loading}
          >
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="border rounded-lg p-3 bg-card hover:bg-muted/50 cursor-pointer transition-colors"
      onClick={onExpand}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1">
          <div>
            <div className="font-medium text-sm">{field.label || field.name}</div>
            <div className="text-xs text-muted-foreground">{field.name} • {field.type}</div>
          </div>
          <div className="flex items-center gap-2">
            {field.required && (
              <span className="text-xs px-2 py-0.5 bg-destructive/10 text-destructive rounded">Required</span>
            )}
            {field.readOnly && (
              <span className="text-xs px-2 py-0.5 bg-muted text-muted-foreground rounded">Read Only</span>
            )}
            {field.condition?.field && (
              <span className="text-xs px-2 py-0.5 bg-blue-500/10 text-blue-600 rounded">Conditional</span>
            )}
          </div>
        </div>
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </div>
    </div>
  );
};

// Simplified sortable field for sorting mode
const SortableFieldSimple = ({
  field,
  fieldIndex,
  sectionName
}: {
  field: Field;
  fieldIndex: number;
  sectionName: string;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: `field-${sectionName}-${fieldIndex}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="border rounded-lg p-3 bg-card">
      <div className="flex items-center gap-3">
        <div {...attributes} {...listeners} className="cursor-grab hover:cursor-grabbing">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex-1 flex items-center gap-4">
          <div>
            <div className="font-medium text-sm">{field.label || field.name}</div>
            <div className="text-xs text-muted-foreground">{field.name} • {field.type}</div>
          </div>
          {field.required && (
            <span className="text-xs px-2 py-0.5 bg-destructive/10 text-destructive rounded">Required</span>
          )}
        </div>
      </div>
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
  const [newSectionUrl, setNewSectionUrl] = useState('');
  const [cloneSectionDialog, setCloneSectionDialog] = useState({ open: false, sectionName: '', newName: '' });
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [isSortingSections, setIsSortingSections] = useState(false);
  const [sortingFieldsSection, setSortingFieldsSection] = useState<string | null>(null);
  const [expandedField, setExpandedField] = useState<{ section: string; index: number } | null>(null);
  const [editingSectionName, setEditingSectionName] = useState<{ sectionIndex: number; currentName: string; newName: string } | null>(null);
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
      // Use custom URL if provided, otherwise generate from name
      const sectionUrl = newSectionUrl.trim() || generateSectionUrl(newSectionName);
      setForm(prev => ({
        ...prev,
        sections: {
          ...prev.sections,
          [newSectionName]: {
            name: newSectionName,
            fields: [],
            displayOrder: existingSectionCount,
            meta: {
              url: sectionUrl
            }
          }
        }
      }));
      setNewSectionName('');
      setNewSectionUrl('');
    }
  };

  const updateSectionUrl = (sectionName: string, newUrl: string) => {
    setForm(prev => ({
      ...prev,
      sections: {
        ...prev.sections,
        [sectionName]: {
          ...prev.sections[sectionName],
          meta: {
            ...prev.sections[sectionName].meta,
            url: newUrl
          }
        }
      }
    }));
  };

  const deleteSection = (sectionName: string) => {
    const newSections = { ...form.sections };
    delete newSections[sectionName];
    setForm(prev => ({ ...prev, sections: newSections }));
    setCollapsedSections(prev => {
      const newSet = new Set(prev);
      newSet.delete(sectionName);
      return newSet;
    });
  };

  const updateSectionName = (sectionIndex: number, currentName: string, newName: string) => {
    if (!newName.trim() || newName === currentName) {
      setEditingSectionName(null);
      return;
    }

    // Check if new section name already exists
    if (form.sections[newName]) {
      toast({
        title: "Error",
        description: "A section with this name already exists",
        variant: "destructive",
      });
      return;
    }

    // Use index-based approach to ensure we update the correct section
    const sortedSections = getSortedSections();
    const [oldKey, section] = sortedSections[sectionIndex];

    if (oldKey !== currentName) {
      toast({
        title: "Error",
        description: "Section reference mismatch. Please try again.",
        variant: "destructive",
      });
      return;
    }

    const newSections = { ...form.sections };
    delete newSections[currentName];
    newSections[newName] = {
      ...section,
      name: newName,
      meta: {
        ...section.meta,
        url: generateSectionUrl(newName)
      }
    };

    setForm(prev => ({
      ...prev,
      sections: newSections
    }));

    // Update collapsed sections set
    if (collapsedSections.has(currentName)) {
      setCollapsedSections(prev => {
        const newSet = new Set(prev);
        newSet.delete(currentName);
        newSet.add(newName);
        return newSet;
      });
    }

    setEditingSectionName(null);
    toast({
      title: "Success",
      description: `Section renamed to "${newName}"`,
    });
  };

  const cloneSection = (sectionName: string, newName: string) => {
    const originalSection = form.sections[sectionName];
    if (!originalSection || !newName.trim()) return;

    // Check if section name already exists
    if (form.sections[newName]) {
      toast({
        title: "Error",
        description: "A section with this name already exists",
        variant: "destructive",
      });
      return;
    }

    const clonedSection = {
      ...originalSection,
      name: newName,
      displayOrder: Object.keys(form.sections).length,
      meta: {
        ...originalSection.meta,
        url: generateSectionUrl(newName)
      }
    };

    setForm(prev => ({
      ...prev,
      sections: {
        ...prev.sections,
        [newName]: clonedSection
      }
    }));

    toast({
      title: "Success",
      description: `Section "${newName}" cloned successfully`,
    });
  };

  const toggleSectionCollapse = (sectionName: string) => {
    setCollapsedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionName)) {
        newSet.delete(sectionName);
      } else {
        newSet.add(sectionName);
      }
      return newSet;
    });
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

    // Parse field IDs: format is "field-{sectionName}-{fieldIndex}"
    const activeIdParts = active.id.toString().split('-');
    const overIdParts = over.id.toString().split('-');

    // Extract section name and field index
    const activeSectionName = activeIdParts.slice(1, -1).join('-'); // Handle section names with hyphens
    const activeFieldIndex = parseInt(activeIdParts[activeIdParts.length - 1]);
    const overSectionName = overIdParts.slice(1, -1).join('-');
    const overFieldIndex = parseInt(overIdParts[overIdParts.length - 1]);

    // Only allow reordering within the same section
    if (activeSectionName !== overSectionName || activeFieldIndex === overFieldIndex) {
      return;
    }

    setForm(prev => ({
      ...prev,
      sections: {
        ...prev.sections,
        [activeSectionName]: {
          ...prev.sections[activeSectionName],
          fields: arrayMove(prev.sections[activeSectionName].fields, activeFieldIndex, overFieldIndex)
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

    if (isSortingSections) {
      // Collapsed view for sorting mode
      return (
        <Card key={sectionName} ref={setNodeRef} style={style} className="mb-4">
          <CardHeader className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div {...attributes} {...listeners} className="cursor-grab hover:cursor-grabbing">
                  <GripVertical className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <CardTitle className="text-base">{section.name}</CardTitle>
                  <CardDescription className="text-sm">
                    {section.fields.length} field{section.fields.length !== 1 ? 's' : ''}
                  </CardDescription>
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                Order: {section.displayOrder ?? 0}
              </div>
            </div>
          </CardHeader>
        </Card>
      );
    }

    // Full view for editing mode - never rendered in section sorting mode
    return null;
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

      // Stay on the edit screen instead of navigating away
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
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground">Section Name</Label>
                <Input
                  placeholder="Section name"
                  value={newSectionName}
                  onChange={(e) => setNewSectionName(e.target.value)}
                />
              </div>
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground">URL Slug (optional)</Label>
                <Input
                  placeholder={newSectionName ? generateSectionUrl(newSectionName) : 'auto-generated'}
                  value={newSectionUrl}
                  onChange={(e) => setNewSectionUrl(e.target.value)}
                />
              </div>
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
          getSortedSections().map(([sectionName, section], sectionIndex) => {
            const isCollapsed = collapsedSections.has(sectionName);
            const isEditingThisSection = editingSectionName?.sectionIndex === sectionIndex;

            return (
              <Collapsible key={sectionName} open={isCollapsed} onOpenChange={() => toggleSectionCollapse(sectionName)}>
                <Card className="mb-6">
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2" onClick={(e) => {
                          if (isEditingThisSection) {
                            e.stopPropagation();
                          }
                        }}>
                          {isEditingThisSection ? (
                            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                              <Input
                                value={editingSectionName.newName}
                                onChange={(e) => setEditingSectionName({ ...editingSectionName, newName: e.target.value })}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    updateSectionName(sectionIndex, editingSectionName.currentName, editingSectionName.newName);
                                  } else if (e.key === 'Escape') {
                                    setEditingSectionName(null);
                                  }
                                }}
                                className="text-lg font-semibold"
                                autoFocus
                              />
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => updateSectionName(sectionIndex, editingSectionName.currentName, editingSectionName.newName)}
                              >
                                <Save className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditingSectionName(null)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <>
                              <CardTitle
                                className="text-lg hover:text-primary transition-colors"
                                onDoubleClick={(e) => {
                                  e.stopPropagation();
                                  setEditingSectionName({ sectionIndex, currentName: sectionName, newName: sectionName });
                                }}
                              >
                                {section.name}
                              </CardTitle>
                              {!isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-4" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-2">
                            <Label className="text-xs text-muted-foreground whitespace-nowrap">URL:</Label>
                            <Input
                              value={section.meta?.url || ''}
                              onChange={(e) => updateSectionUrl(sectionName, e.target.value)}
                              placeholder={generateSectionUrl(sectionName)}
                              className="w-40 h-8 text-sm"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <Label className="text-sm font-medium whitespace-nowrap">Section Action:</Label>
                            <Select
                              value={section.meta?.action || 'none'}
                              onValueChange={(value) => {
                                setForm(prev => ({
                                  ...prev,
                                  sections: {
                                    ...prev.sections,
                                    [sectionName]: {
                                      ...prev.sections[sectionName],
                                      meta: {
                                        ...prev.sections[sectionName].meta,
                                        action: value === 'none' ? undefined : value
                                      }
                                    }
                                  }
                                }));
                              }}
                            >
                              <SelectTrigger className="w-48">
                                <SelectValue placeholder="Select action" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">No Action</SelectItem>
                                <SelectItem value="verifyEmailAddress">Send Verification Email</SelectItem>
                                <SelectItem value="preRegistration">Submit Pre-Registration</SelectItem>
                                <SelectItem value="submitApplication">Submit Complete Application</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setCloneSectionDialog({ open: true, sectionName, newName: `${section.name} Copy` })}
                          >
                            <Copy className="h-4 w-4" />
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
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="space-y-4">
                      {/* Toggle for field sorting */}
                      {section.fields.length > 1 && (
                        <div className="flex justify-end">
                          <Button
                            size="sm"
                            variant={sortingFieldsSection === sectionName ? "default" : "outline"}
                            onClick={() => {
                              setSortingFieldsSection(sortingFieldsSection === sectionName ? null : sectionName);
                              setExpandedField(null); // Collapse any expanded field when sorting
                            }}
                          >
                            <GripVertical className="h-4 w-4 mr-2" />
                            {sortingFieldsSection === sectionName ? "Done Sorting" : "Sort Fields"}
                          </Button>
                        </div>
                      )}

                      {sortingFieldsSection === sectionName ? (
                        <DndContext
                          sensors={sensors}
                          collisionDetection={closestCenter}
                          onDragEnd={handleFieldDragEnd}
                        >
                          <SortableContext
                            items={section.fields.map((_, index) => `field-${sectionName}-${index}`)}
                            strategy={verticalListSortingStrategy}
                          >
                            <div className="space-y-2">
                              {section.fields.map((field, fieldIndex) => (
                                <SortableFieldSimple
                                  key={`sort-${sectionName}-${fieldIndex}`}
                                  field={field}
                                  fieldIndex={fieldIndex}
                                  sectionName={sectionName}
                                />
                              ))}
                            </div>
                          </SortableContext>
                        </DndContext>
                      ) : (
                        <div className="space-y-2">
                          {section.fields.map((field, fieldIndex) => (
                            <CompactFieldCard
                              key={`${sectionName}-field-${fieldIndex}`}
                              field={field}
                              fieldIndex={fieldIndex}
                              sectionName={sectionName}
                              onExpand={() => setExpandedField({ section: sectionName, index: fieldIndex })}
                              isExpanded={expandedField?.section === sectionName && expandedField?.index === fieldIndex}
                              onUpdateField={updateField}
                              onDeleteField={deleteField}
                              allFields={allFields}
                              onCollapse={() => setExpandedField(null)}
                              onSave={saveForm}
                              loading={loading}
                            />
                          ))}
                        </div>
                      )}

                      <Button
                        onClick={() => addField(sectionName)}
                        variant="outline"
                        className="w-full"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Field
                      </Button>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })
        )}

        {Object.keys(form.sections).length === 0 && (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground">No sections added yet. Add a section to get started.</p>
            </CardContent>
          </Card>
        )}

        {/* Clone Section Dialog */}
        <Dialog open={cloneSectionDialog.open} onOpenChange={(open) => setCloneSectionDialog(prev => ({ ...prev, open }))}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Clone Section</DialogTitle>
              <DialogDescription>
                Enter a name for the cloned section. All fields and settings will be copied.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="clone-section-name">Section Name</Label>
                <Input
                  id="clone-section-name"
                  value={cloneSectionDialog.newName}
                  onChange={(e) => setCloneSectionDialog(prev => ({ ...prev, newName: e.target.value }))}
                  placeholder="Enter new section name"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCloneSectionDialog({ open: false, sectionName: '', newName: '' })}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  cloneSection(cloneSectionDialog.sectionName, cloneSectionDialog.newName);
                  setCloneSectionDialog({ open: false, sectionName: '', newName: '' });
                }}
                disabled={!cloneSectionDialog.newName.trim()}
              >
                Clone Section
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default ApplicationFormCreate;