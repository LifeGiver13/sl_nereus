import React, { useState } from 'react';
import { MessageSquare, Check, X, Plus, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';

export interface Remark {
  id: string;
  comment: string;
  date: string;
  userId: string;
  resolved: boolean;
}

export interface SectionRemarks {
  [fieldName: string]: Remark[];
}

export interface AllRemarks {
  [sectionName: string]: SectionRemarks;
}

interface RemarkSystemProps {
  sectionId: string;
  fieldName: string;
  remarks: Remark[];
  currentUserId: string;
  onAddRemark: (sectionId: string, fieldName: string, comment: string) => void;
  onToggleResolve: (sectionId: string, fieldName: string, remarkId: string) => void;
}

export const RemarkSystem: React.FC<RemarkSystemProps> = ({
  sectionId,
  fieldName,
  remarks,
  currentUserId,
  onAddRemark,
  onToggleResolve,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const unresolvedCount = remarks.filter(r => !r.resolved).length;

  const handleAddRemark = () => {
    if (newComment.trim()) {
      onAddRemark(sectionId, fieldName, newComment.trim());
      setNewComment('');
      setIsAdding(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="ml-4 mt-2">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 p-1 text-xs"
          >
            <MessageSquare className="h-3 w-3 mr-1" />
            {remarks.length > 0 && (
              <>
                {remarks.length} remark{remarks.length !== 1 ? 's' : ''}
                {unresolvedCount > 0 && (
                  <Badge variant="destructive" className="ml-1 h-4 text-xs">
                    {unresolvedCount} unresolved
                  </Badge>
                )}
              </>
            )}
            {remarks.length === 0 && 'Add remark'}
          </Button>
        </CollapsibleTrigger>
        
        <CollapsibleContent className="mt-2">
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Field Remarks</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {remarks.length > 0 && (
                <div className="space-y-3">
                  {remarks.map((remark) => (
                    <div
                      key={remark.id}
                      className={`p-3 rounded-md border ${
                        remark.resolved ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm text-gray-800 mb-2">{remark.comment}</p>
                          <div className="flex items-center text-xs text-gray-500">
                            <Clock className="h-3 w-3 mr-1" />
                            {formatDate(remark.date)} • User {remark.userId}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 ml-2">
                          <Badge variant={remark.resolved ? 'default' : 'secondary'}>
                            {remark.resolved ? 'Resolved' : 'Open'}
                          </Badge>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onToggleResolve(sectionId, fieldName, remark.id)}
                          >
                            {remark.resolved ? (
                              <X className="h-3 w-3" />
                            ) : (
                              <Check className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {remarks.length > 0 && <Separator />}
              
              {isAdding ? (
                <div className="space-y-2">
                  <Textarea
                    placeholder="Enter your remark..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="min-h-[80px]"
                  />
                  <div className="flex space-x-2">
                    <Button size="sm" onClick={handleAddRemark}>
                      Add Remark
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setIsAdding(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsAdding(true)}
                  className="w-full"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add New Remark
                </Button>
              )}
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

export const hasUnresolvedRemarks = (sectionRemarks: SectionRemarks): boolean => {
  return Object.values(sectionRemarks).some(fieldRemarks =>
    fieldRemarks.some(remark => !remark.resolved)
  );
};

export const getSectionRemarkCount = (sectionRemarks: SectionRemarks): number => {
  return Object.values(sectionRemarks).reduce((total, fieldRemarks) => total + fieldRemarks.length, 0);
};