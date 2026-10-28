import React, { useState } from 'react';
import AdminLayout from '../components/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/utils';
import { UserPlus } from 'lucide-react';

interface OnboardResult {
  email: string;
  outcome: 'created' | 'existing' | 'failed' | 'skipped';
  error?: string;
}

function parseEmails(raw: string): string[] {
  const parts = raw.split(/[\n,]/).map((e) => e.trim()).filter(Boolean);
  return Array.from(new Set(parts));
}

const outcomeBadge = (outcome: OnboardResult['outcome']) => {
  if (outcome === 'created') return <Badge className="bg-green-100 text-green-800">Created</Badge>;
  if (outcome === 'existing') return <Badge className="bg-blue-100 text-blue-800">Existing user</Badge>;
  if (outcome === 'skipped') return <Badge variant="outline">Skipped</Badge>;
  return <Badge variant="destructive">Failed</Badge>;
};

const Onboarding: React.FC = () => {
  const [emailsInput, setEmailsInput] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [results, setResults] = useState<OnboardResult[] | null>(null);
  const [pendingNewEmails, setPendingNewEmails] = useState<string[] | null>(null);
  const { toast } = useToast();

  const emails = parseEmails(emailsInput);

  const sendBatch = async (batch: string[]): Promise<OnboardResult[]> => {
    const res = await apiRequest('/admin/users/onboard', {
      method: 'POST',
      body: JSON.stringify({ emails: batch, emailSubject, emailBody }),
    });
    if (!res.ok) throw new Error('Failed to send invitations');
    const data = await res.json();
    return data.results || [];
  };

  const summarizeAndToast = (batchResults: OnboardResult[]) => {
    const failedCount = batchResults.filter((r) => r.outcome === 'failed').length;
    if (failedCount > 0) {
      toast({
        title: 'Completed with errors',
        description: `${batchResults.length} processed, ${failedCount} failed`,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Invitations sent',
        description: `${batchResults.length} invitation${batchResults.length === 1 ? '' : 's'} sent`,
      });
    }
  };

  const handleSubmit = async () => {
    if (emails.length === 0) {
      toast({ title: 'Error', description: 'Enter at least one email address', variant: 'destructive' });
      return;
    }

    setIsSending(true);
    setResults(null);
    try {
      const checkRes = await apiRequest('/admin/users/onboard/check', {
        method: 'POST',
        body: JSON.stringify({ emails }),
      });
      if (!checkRes.ok) throw new Error('Failed to check emails');
      const { existing, new: newEmails } = await checkRes.json();

      let combinedResults: OnboardResult[] = [];

      if (existing.length > 0) {
        const existingResults = await sendBatch(existing);
        combinedResults = [...combinedResults, ...existingResults];
        setResults([...combinedResults]);
        summarizeAndToast(existingResults);
      }

      if (newEmails.length > 0) {
        setPendingNewEmails(newEmails);
      }

      if (existing.length === 0 && newEmails.length === 0) {
        // Shouldn't happen since emails.length > 0, but keep state consistent.
        setResults([]);
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to onboard users', variant: 'destructive' });
    } finally {
      setIsSending(false);
    }
  };

  const handleConfirmNewUsers = async () => {
    if (!pendingNewEmails) return;
    setIsConfirming(true);
    try {
      const newResults = await sendBatch(pendingNewEmails);
      setResults((prev) => [...(prev || []), ...newResults]);
      summarizeAndToast(newResults);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to onboard new users', variant: 'destructive' });
    } finally {
      setIsConfirming(false);
      setPendingNewEmails(null);
    }
  };

  const handleCancelNewUsers = () => {
    if (!pendingNewEmails) return;
    setResults((prev) => [
      ...(prev || []),
      ...pendingNewEmails.map((email): OnboardResult => ({ email, outcome: 'skipped' })),
    ]);
    setPendingNewEmails(null);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-[#000009]">Onboarding</h1>
          <p className="text-gray-600 mt-1">Invite users onto the platform by email</p>
        </div>

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-[#000009]">Invite Users</CardTitle>
            <CardDescription>
              Enter one email address per line (or comma-separated). Users who don't already have
              an account will be created, given a temporary password, and emailed login details.
              Use <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">{'{{name}}'}</code> in
              the subject or message to insert the recipient's name (falls back to a generic
              greeting if their name isn't known yet).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="onboarding-emails">
                Email addresses{emails.length > 0 && ` (${emails.length})`}
              </Label>
              <Textarea
                id="onboarding-emails"
                placeholder={'jane@example.com\njohn@example.com'}
                value={emailsInput}
                onChange={(e) => setEmailsInput(e.target.value)}
                rows={8}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="onboarding-subject">Email subject</Label>
              <Input
                id="onboarding-subject"
                placeholder="You're invited to Nereus"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="onboarding-body">Email message</Label>
              <Textarea
                id="onboarding-body"
                placeholder="Hi {{name}}, you've been invited to join Nereus. Download the app below and log in with the credentials provided to get started."
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                rows={4}
              />
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleSubmit}
                disabled={isSending || emails.length === 0}
                className="bg-[#712B71] hover:bg-[#712B71]/90"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                {isSending
                  ? 'Sending invitations...'
                  : `Send Invitations${emails.length > 0 ? ` (${emails.length})` : ''}`}
              </Button>
            </div>
          </CardContent>
        </Card>

        {results && (
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-[#000009]">Results</CardTitle>
              <CardDescription>
                {results.length} email{results.length === 1 ? '' : 's'} processed
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Outcome</TableHead>
                    <TableHead>Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((r) => (
                    <TableRow key={r.email}>
                      <TableCell>{r.email}</TableCell>
                      <TableCell>{outcomeBadge(r.outcome)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{r.error || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        <AlertDialog open={!!pendingNewEmails} onOpenChange={(open) => !open && handleCancelNewUsers()}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Create {pendingNewEmails?.length ?? 0} new account{(pendingNewEmails?.length ?? 0) === 1 ? '' : 's'}?</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div>
                  <p>
                    The following email{(pendingNewEmails?.length ?? 0) === 1 ? ' does' : 's do'} not have an
                    existing account. Continuing will create new accounts and send them login details:
                  </p>
                  <ul className="mt-3 max-h-48 overflow-y-auto space-y-1 text-sm">
                    {pendingNewEmails?.map((email) => (
                      <li key={email} className="font-medium text-gray-900">{email}</li>
                    ))}
                  </ul>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={handleCancelNewUsers}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmNewUsers} disabled={isConfirming}>
                {isConfirming ? 'Sending...' : 'Create & Send'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
};

export default Onboarding;
