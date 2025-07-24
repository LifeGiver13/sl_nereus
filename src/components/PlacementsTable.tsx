
import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { X, Save, Edit } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import AvailabilityManager from './AvailabilityManager';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/utils';

interface AvailabilityWindow {
  startDate: string;
  endDate: string;
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
    full_placement?: boolean;
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
    const currentChanges = placementChanges.get(userId) || {};
    const currentMeta = currentChanges.meta || {};
    const updatedMeta = { ...currentMeta, [metaField]: value };
    const updatedChanges = { ...currentChanges, meta: updatedMeta };
    
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
                {placement.status && (
                  <Badge variant="outline" className="text-xs">
                    {placement.status.replace('_', ' ')}
                  </Badge>
                )}
                {hasChanges(placement.userId) && (
                  <Badge variant="secondary" className="text-xs">
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

            {showStatusControls && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Status</label>
                  <Select
                    value={placement.status}
                    onValueChange={(value) => handleFieldChange(placement.userId, 'status', value)}
                  >
                    <SelectTrigger>
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
                </div>
                {showConfirmedControls && (
                  <div>
                    <label className="text-sm font-medium mb-2 block">Confirmed</label>
                    <div className="flex items-center space-x-2 pt-2">
                      <Checkbox
                        checked={placement.confirmed}
                        onCheckedChange={(checked) => handleFieldChange(placement.userId, 'confirmed', checked as boolean)}
                      />
                      <span className="text-sm">{placement.confirmed ? 'Yes' : 'No'}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {expandedRows.has(placement.userId) && jobStartDate && jobEndDate && (
              <AvailabilityManager
                fullPlacement={
                  placementChanges.get(placement.userId)?.meta?.full_placement !== undefined 
                    ? placementChanges.get(placement.userId)?.meta?.full_placement 
                    : placement.meta?.full_placement !== false
                }
                availability={
                  placementChanges.get(placement.userId)?.meta?.availability || 
                  placement.meta?.availability || []
                }
                jobStartDate={jobStartDate}
                jobEndDate={jobEndDate}
                onFullPlacementChange={(checked) => handleMetaChange(placement.userId, 'full_placement', checked)}
                onAvailabilityChange={(availability) => handleMetaChange(placement.userId, 'availability', availability)}
              />
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default PlacementsTable;
