import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { API_BASE_URL } from '../config/env';
import { apiRequest } from '@/lib/utils';

interface Contact {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  position?: string;
}

interface EmailTimesheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  timesheetIds: number[];
  clientId: number | null;
  authHeaders: Record<string, string>;
}

const EmailTimesheetModal: React.FC<EmailTimesheetModalProps> = ({
  isOpen,
  onClose,
  timesheetIds,
  clientId,
  authHeaders,
}) => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selection, setSelection] = useState<string>(''); // contact id as string, or 'override'
  const [overrideEmail, setOverrideEmail] = useState('');
  const [overrideName, setOverrideName] = useState('');
  const [message, setMessage] = useState('');
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchContacts = async () => {
      if (!clientId) return;
      try {
        setIsLoadingContacts(true);
        const res = await apiRequest(`/client-contacts/${clientId}`);
        if (res.ok) {
          const data = await res.json();
          setContacts(data.contacts || []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoadingContacts(false);
      }
    };

    if (isOpen && clientId) {
      fetchContacts();
      setSelection('');
      setOverrideEmail('');
      setOverrideName('');
      setMessage('');
    }
  }, [isOpen, clientId]);

  const handleSend = async () => {
    if (!timesheetIds) return;

    if (timesheetIds.length > 25) {
      toast({ title: 'Too many timesheets', description: 'You can email at most 50 at once.', variant: 'destructive' });
      return;
    }

    const isOverride = selection === 'override';
    if (isOverride && !overrideEmail.trim()) {
      toast({ title: 'Error', description: 'Enter an email address', variant: 'destructive' });
      return;
    }
    if (!isOverride && !selection) {
      toast({ title: 'Error', description: 'Select a recipient', variant: 'destructive' });
      return;
    }

    setIsSending(true);
    try {
      const payload = {
        ...(isOverride
          ? { overrideEmail: overrideEmail.trim(), overrideName: overrideName.trim() }
          : { contactId: parseInt(selection) }),
        ...(message.trim() ? { message: message.trim() } : {}),
      };

      const isBulk = timesheetIds.length > 1;
      const url = isBulk
        ? `${API_BASE_URL}/admin/timesheets/email`                      // bulk route
        : `${API_BASE_URL}/admin/timesheets/${timesheetIds[0]}/email`;  // existing single route

      const res = await fetch(url, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          ...(isBulk ? { ids: timesheetIds } : {}),
          ...payload,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.message || 'Failed to send');
      }

      const data = await res.json();

      if (data.method === 'link') {
        const links: { timesheetId: number; shareUrl: string }[] =
          data.shareLinks ?? (data.shareUrl ? [{ timesheetId: timesheetIds[0], shareUrl: data.shareUrl }] : []);
        toast({
          title: 'Email failed — links generated instead',
          description: links.map((l) => `#${l.timesheetId}: ${l.shareUrl}`).join('\n'),
        });
      } else {
        toast({
          title: 'Sent',
          description: isBulk ? `${timesheetIds.length} timesheets emailed successfully` : 'Timesheet emailed successfully',
        });
      }

      onClose();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to email timesheet',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {timesheetIds.length > 1 ? `Email ${timesheetIds.length} Timesheets` : 'Email Timesheet'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="timesheet-message">Message (optional)</Label>
            <Textarea
              id="timesheet-message"
              placeholder="Add a note to include at the top of the email..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
            />
          </div>

          {isLoadingContacts ? (
            <p className="text-sm text-muted-foreground">Loading contacts...</p>
          ) : (
            <RadioGroup value={selection} onValueChange={setSelection} className="space-y-2">
              {contacts.map((c) => (
                <div key={c.id} className="flex items-center space-x-2 border rounded-md p-3">
                  <RadioGroupItem value={c.id.toString()} id={`contact-${c.id}`} />
                  <Label htmlFor={`contact-${c.id}`} className="flex-1 cursor-pointer">
                    <div className="font-medium">{c.firstName} {c.lastName}</div>
                    <div className="text-xs text-muted-foreground">{c.email}{c.position ? ` • ${c.position}` : ''}</div>
                  </Label>
                </div>
              ))}

              <div className="flex items-center space-x-2 border rounded-md p-3">
                <RadioGroupItem value="override" id="contact-override" />
                <Label htmlFor="contact-override" className="flex-1 cursor-pointer">
                  Other recipient
                </Label>
              </div>
            </RadioGroup>
          )}

          {selection === 'override' && (
            <div className="space-y-2 pl-1">
              <Input
                placeholder="Recipient name (optional)"
                value={overrideName}
                onChange={(e) => setOverrideName(e.target.value)}
              />
              <Input
                type="email"
                placeholder="Recipient email"
                value={overrideEmail}
                onChange={(e) => setOverrideEmail(e.target.value)}
              />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSend} disabled={isSending}>
            {isSending ? 'Sending...' : 'Send Email'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EmailTimesheetModal;