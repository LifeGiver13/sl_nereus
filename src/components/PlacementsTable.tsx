
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { X } from 'lucide-react';

interface PlacementRow {
  id?: number;
  userId: number;
  user: {
    id: number;
    username: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  instructions: string;
  notes: string;
  status: string;
  confirmed: boolean;
  isPlaceholder: boolean;
}

interface PlacementsTableProps {
  placements: PlacementRow[];
  onRemoveUser: (userId: number) => void;
  onUpdatePlacement: (userId: number, field: 'instructions' | 'notes' | 'status' | 'confirmed', value: string | boolean) => void;
  showStatusControls?: boolean;
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
  showStatusControls = true
}) => {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>User</TableHead>
          <TableHead>Instructions</TableHead>
          <TableHead>Notes</TableHead>
          {showStatusControls && <TableHead>Status</TableHead>}
          {showStatusControls && <TableHead>Confirmed</TableHead>}
          <TableHead className="w-12">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {placements.map((placement) => (
          <TableRow key={placement.userId}>
            <TableCell>
              <div>
                <p className="font-medium">
                  {placement.user.firstName} {placement.user.lastName}
                </p>
                <p className="text-sm text-gray-500">{placement.user.email}</p>
              </div>
            </TableCell>
            <TableCell>
              <Textarea
                placeholder="Instructions for worker..."
                value={placement.instructions}
                onChange={(e) => onUpdatePlacement(placement.userId, 'instructions', e.target.value)}
                className="min-h-[60px]"
              />
            </TableCell>
            <TableCell>
              <Textarea
                placeholder="Internal notes..."
                value={placement.notes}
                onChange={(e) => onUpdatePlacement(placement.userId, 'notes', e.target.value)}
                className="min-h-[60px]"
              />
            </TableCell>
            {showStatusControls && (
              <TableCell>
                <Select
                  value={placement.status}
                  onValueChange={(value) => onUpdatePlacement(placement.userId, 'status', value)}
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
              </TableCell>
            )}
            {showStatusControls && (
              <TableCell>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={placement.confirmed}
                    onCheckedChange={(checked) => onUpdatePlacement(placement.userId, 'confirmed', checked as boolean)}
                  />
                  <span className="text-sm">{placement.confirmed ? 'Yes' : 'No'}</span>
                </div>
              </TableCell>
            )}
            <TableCell>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRemoveUser(placement.userId)}
              >
                <X className="h-4 w-4" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default PlacementsTable;
