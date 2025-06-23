
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';

interface PlacementRow {
  id?: number;
  userId: number;
  user: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  };
  instructions: string;
  notes: string;
  isPlaceholder: boolean;
}

interface PlacementsTableProps {
  placements: PlacementRow[];
  onRemoveUser: (userId: number) => void;
  onUpdatePlacement: (userId: number, field: 'instructions' | 'notes', value: string) => void;
}

const PlacementsTable: React.FC<PlacementsTableProps> = ({
  placements,
  onRemoveUser,
  onUpdatePlacement
}) => {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>User</TableHead>
          <TableHead>Instructions</TableHead>
          <TableHead>Notes</TableHead>
          <TableHead>Status</TableHead>
          <TableHead width="50">Actions</TableHead>
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
            <TableCell>
              <Badge variant={placement.isPlaceholder ? "outline" : "default"}>
                {placement.isPlaceholder ? 'Pending' : 'Confirmed'}
              </Badge>
            </TableCell>
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
