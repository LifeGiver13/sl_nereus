import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { X, Save, Edit, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, parseISO, isAfter, isBefore, isEqual } from 'date-fns';
import { CalendarIcon, Plus, Trash2 } from 'lucide-react';

interface AvailabilityWindow {
  startDate: Date;
  endDate: Date;
}

interface PlacementRow {
  id?: number;
  userId: number;
  user: {
    id: number;
    displayName: string;
  };
  instructions: string;
  notes: string;
  status: string;
  confirmed: boolean;
  isPlaceholder: boolean;
  meta?: {
    availability?: AvailabilityWindow[];
    instructions?: string;
    notes?: string;
  };
}

interface PlacementsTableProps {
  placements: PlacementRow[];
  onRemoveUser: (userId: number) => void;
  onUpdatePlacement: (userId: number, field: 'instructions' | 'notes' | 'status' | 'confirmed' | 'meta', value: string | boolean | any) => void;
  onRefresh?: () => void;
  jobStartDate?: string;
  jobEndDate?: string;
  showStatusControls?: boolean;
  showConfirmedControls?: boolean;
}

const statusOptions = [
  { value: 'awaiting_confirmation', label: 'Awaiting Confirmation' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'absent_explained', label: 'Absent (Explained)' },
  { value: 'absent_unexplained', label: 'Absent (Unexplained)' }
];

const PlacementsTable: React.FC<PlacementsTableProps> = ({
  placements,
  onRemoveUser,
  onUpdatePlacement,
  onRefresh,
  jobStartDate = '',
  jobEndDate = '',
  showStatusControls = true,
  showConfirmedControls = true
}) => {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [placementChanges, setPlacementChanges] = useState<Map<number, Partial<PlacementRow>>>(new Map());
  const [savingPlacements, setSavingPlacements] = useState<Set<number>>(new Set());

  // Auto-expand new placements (isPlaceholder = true)
  useEffect(() => {
    const newPlaceholders = placements.filter(p => p.isPlaceholder && !expandedRows.has(p.userId));
    if (newPlaceholders.length > 0) {
      const newExpanded = new Set(expandedRows);
      newPlaceholders.forEach(p => newExpanded.add(p.userId));
      setExpandedRows(newExpanded);
    }
  }, [placements, expandedRows]);
  const { toast } = useToast();

  const toggleRowExpansion = (userId: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(userId)) {
      newExpanded.delete(userId);
    } else {
      newExpanded.add(userId);
    }
    setExpandedRows(newExpanded);
  };

  const handleFieldChange = (userId: number, field: string, value: any) => {
    const currentChanges = placementChanges.get(userId) || {};
    const updatedChanges = { ...currentChanges, [field]: value };
    
    const newChanges = new Map(placementChanges);
    newChanges.set(userId, updatedChanges);
    setPlacementChanges(newChanges);

    // Also update the parent component
    onUpdatePlacement(userId, field as any, value);
  };

  const handleMetaChange = (userId: number, metaField: string, value: any) => {
    console.log('handleMetaChange called:', { userId, metaField, value });
    
    const currentChanges = placementChanges.get(userId) || {};
    const currentMeta = currentChanges.meta || {};
    const updatedMeta = { ...currentMeta, [metaField]: value };
    const updatedChanges = { ...currentChanges, meta: updatedMeta };
    
    console.log('handleMetaChange updating:', { currentMeta, updatedMeta });
    
    const newChanges = new Map(placementChanges);
    newChanges.set(userId, updatedChanges);
    setPlacementChanges(newChanges);

    // Also update the main placement object for immediate UI updates
    onUpdatePlacement(userId, 'meta' as any, updatedMeta);
  };

  const savePlacementChanges = async (placement: PlacementRow) => {
    if (!placement.id || !placementChanges.has(placement.userId)) return;

    setSavingPlacements(new Set([...savingPlacements, placement.userId]));

    try {
      const changes = placementChanges.get(placement.userId) || {};
      const updateData = {
        status: changes.status || placement.status,
        confirmed: changes.confirmed !== undefined ? changes.confirmed : placement.confirmed,
        meta: {
          ...placement.meta,
          ...changes.meta,
          instructions: changes.instructions || placement.instructions,
          notes: changes.notes || placement.notes,
        }
      };

      const response = await apiRequest(`/placement/${placement.id}`, {
        method: 'PUT',
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        throw new Error('Failed to update placement');
      }

      toast({
        title: "Success",
        description: "Placement updated successfully",
      });

      // Clear changes for this placement
      const newChanges = new Map(placementChanges);
      newChanges.delete(placement.userId);
      setPlacementChanges(newChanges);

      // Refresh the data
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error('Error updating placement:', error);
      toast({
        title: "Error",
        description: "Failed to update placement",
        variant: "destructive",
      });
    } finally {
      setSavingPlacements(new Set([...savingPlacements].filter(id => id !== placement.userId)));
    }
  };

  const hasChanges = (userId: number) => {
    return placementChanges.has(userId) && Object.keys(placementChanges.get(userId) || {}).length > 0;
  };

  return (
    <div className="space-y-4">
      {placements.map((placement) => (
        <Card key={placement.userId} className="border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-4">
                <p className="font-medium">{placement.user.displayName}</p>
                
                {/* Status Dropdown */}
                <Select
                  value={placement.status}
                  onValueChange={(value) => handleFieldChange(placement.userId, 'status', value)}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {hasChanges(placement.userId) && (
                  <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800 border-amber-300">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Unsaved changes
                  </Badge>
                )}
              </div>
              <div className="flex items-center space-x-2">
                {!placement.isPlaceholder && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleRowExpansion(placement.userId)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                )}
                {hasChanges(placement.userId) && !placement.isPlaceholder && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => savePlacementChanges(placement)}
                    disabled={savingPlacements.has(placement.userId)}
                  >
                    <Save className="h-4 w-4 mr-1" />
                    {savingPlacements.has(placement.userId) ? 'Saving...' : 'Save'}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemoveUser(placement.userId)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Instructions</label>
                <Textarea
                  placeholder="Instructions for worker..."
                  value={placement.instructions}
                  onChange={(e) => handleFieldChange(placement.userId, 'instructions', e.target.value)}
                  className="min-h-[80px]"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Notes</label>
                <Textarea
                  placeholder="Internal notes..."
                  value={placement.notes}
                  onChange={(e) => handleFieldChange(placement.userId, 'notes', e.target.value)}
                  className="min-h-[80px]"
                />
              </div>
            </div>

            {showConfirmedControls && (
              <div className="mt-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={placement.confirmed}
                    onCheckedChange={(checked) => handleFieldChange(placement.userId, 'confirmed', checked as boolean)}
                  />
                  <span className="text-sm font-medium">Confirmed</span>
                </div>
              </div>
            )}

            {(expandedRows.has(placement.userId) || placement.isPlaceholder) && jobStartDate && jobEndDate && (
              <AvailabilitySection
                placement={placement}
                changes={placementChanges.get(placement.userId)}
                jobStartDate={jobStartDate}
                jobEndDate={jobEndDate}
                onMetaChange={handleMetaChange}
              />
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

// Simple Availability Section Component
const AvailabilitySection: React.FC<{
  placement: PlacementRow;
  changes: Partial<PlacementRow> | undefined;
  jobStartDate: string;
  jobEndDate: string;
  onMetaChange: (userId: number, metaField: string, value: any) => void;
}> = ({ placement, changes, jobStartDate, jobEndDate, onMetaChange }) => {
  const availability = changes?.meta?.availability || placement.meta?.availability || [];
  const jobStart = parseISO(jobStartDate);
  const jobEnd = parseISO(jobEndDate);

  // Check if we can add more windows (if current availability doesn't cover full job range)
  const canAddWindow = () => {
    if (availability.length === 0) return true;
    
    // Check if any window starts after job start or ends before job end
    const hasGaps = availability.some(window => 
      isAfter(window.startDate, jobStart) || isBefore(window.endDate, jobEnd)
    );
    
    return hasGaps;
  };

  const addAvailabilityWindow = () => {
    const newWindow = {
      startDate: jobStart,
      endDate: jobEnd
    };
    onMetaChange(placement.userId, 'availability', [...availability, newWindow]);
  };

  const updateAvailabilityWindow = (index: number, field: 'startDate' | 'endDate', date: Date) => {
    const updatedWindows = availability.map((window, i) => 
      i === index ? { ...window, [field]: date } : window
    );
    
    // Check for overlaps
    if (hasOverlaps(updatedWindows)) {
      return; // Don't update if there are overlaps
    }
    
    onMetaChange(placement.userId, 'availability', updatedWindows);
  };

  const removeAvailabilityWindow = (index: number) => {
    const updatedWindows = availability.filter((_, i) => i !== index);
    onMetaChange(placement.userId, 'availability', updatedWindows);
  };

  const hasOverlaps = (windows: AvailabilityWindow[]): boolean => {
    for (let i = 0; i < windows.length; i++) {
      for (let j = i + 1; j < windows.length; j++) {
        const window1 = windows[i];
        const window2 = windows[j];
        
        // Check if windows overlap
        if (
          (isAfter(window1.startDate, window2.startDate) || isEqual(window1.startDate, window2.startDate)) && (isBefore(window1.startDate, window2.endDate) || isEqual(window1.startDate, window2.endDate)) ||
          (isAfter(window1.endDate, window2.startDate) || isEqual(window1.endDate, window2.startDate)) && (isBefore(window1.endDate, window2.endDate) || isEqual(window1.endDate, window2.endDate)) ||
          (isBefore(window1.startDate, window2.startDate) || isEqual(window1.startDate, window2.startDate)) && (isAfter(window1.endDate, window2.endDate) || isEqual(window1.endDate, window2.endDate))
        ) {
          return true;
        }
      }
    }
    return false;
  };

  return (
    <div className="mt-4 p-4 border rounded-lg bg-muted/50">
      <div className="flex items-center justify-between mb-4">
        <div>
          <span className="text-sm font-medium">Availability</span>
          <div className="text-xs text-muted-foreground">
            Job: {format(jobStart, 'MMM dd')} - {format(jobEnd, 'MMM dd')}
          </div>
        </div>
        {canAddWindow() && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addAvailabilityWindow}
            className="h-8"
          >
            <Plus className="h-3 w-3 mr-1" />
            Add Period
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {availability.map((window, index) => (
          <div key={index} className="flex items-center space-x-2">
            <DatePickerButton
              date={window.startDate}
              onDateChange={(date) => date && updateAvailabilityWindow(index, 'startDate', date)}
              placeholder="Start date"
            />
            <span className="text-sm text-muted-foreground">to</span>
            <DatePickerButton
              date={window.endDate}
              onDateChange={(date) => date && updateAvailabilityWindow(index, 'endDate', date)}
              placeholder="End date"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => removeAvailabilityWindow(index)}
              className="h-8 w-8 p-0"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}

        {availability.length === 0 && (
          <p className="text-xs text-muted-foreground">
            No availability periods set.
          </p>
        )}
      </div>
    </div>
  );
};

// Date Picker Button Component
const DatePickerButton: React.FC<{
  date: Date;
  onDateChange: (date: Date | undefined) => void;
  placeholder: string;
}> = ({ date, onDateChange, placeholder }) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-40 justify-start text-left font-normal"
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, 'MMM dd, yyyy') : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={onDateChange}
          initialFocus
          className="p-3 pointer-events-auto"
        />
      </PopoverContent>
    </Popover>
  );
};

export default PlacementsTable;
