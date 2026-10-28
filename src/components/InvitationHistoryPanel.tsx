import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/utils';
import { Mail } from 'lucide-react';

interface InvitationRecord {
  id: number;
  type: 'onboarding' | 'password_reset';
  status: 'sent' | 'failed';
  error?: string | null;
  sentAt: string;
  invitedByUser?: { id: number; username: string } | null;
}

interface InvitationHistoryPanelProps {
  userId: number;
}

function formatDate(value?: string): string {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString('en-GB');
}

const typeLabel = (type: InvitationRecord['type']) =>
  type === 'onboarding' ? 'Onboarding invite' : 'Password reset';

const statusBadge = (status: InvitationRecord['status']) =>
  status === 'sent' ? (
    <Badge className="bg-green-100 text-green-800">Sent</Badge>
  ) : (
    <Badge variant="destructive">Failed</Badge>
  );

const InvitationHistoryPanel: React.FC<InvitationHistoryPanelProps> = ({ userId }) => {
  const [invitations, setInvitations] = useState<InvitationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

  const fetchInvitations = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiRequest(`/admin/user/${userId}/invitations`);
      if (res.ok) {
        const data = await res.json();
        setInvitations(data.results || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchInvitations();
  }, [fetchInvitations]);

  const handleSendInvite = async () => {
    setIsSending(true);
    try {
      const res = await apiRequest(`/admin/user/${userId}/invite`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to send invitation');
      toast({
        title: 'Invitation sent',
        description: 'A new temporary password has been emailed to the user.',
      });
      await fetchInvitations();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to send invitation', variant: 'destructive' });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Card className="rounded-none border-0 border-t shadow-none">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-[#000009]">Onboarding Invitations</CardTitle>
            <CardDescription>History of invite / password-reset emails sent to this user</CardDescription>
          </div>
          <Button
            onClick={handleSendInvite}
            disabled={isSending}
            className="bg-[#712B71] hover:bg-[#712B71]/90"
          >
            <Mail className="h-4 w-4 mr-2" />
            {isSending ? 'Sending...' : 'Send Invitation'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : invitations.length === 0 ? (
          <p className="text-sm text-muted-foreground">No invitations sent yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Invited By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invitations.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell>{formatDate(inv.sentAt)}</TableCell>
                  <TableCell>{typeLabel(inv.type)}</TableCell>
                  <TableCell>{statusBadge(inv.status)}</TableCell>
                  <TableCell>{inv.invitedByUser?.username || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default InvitationHistoryPanel;
