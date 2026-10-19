import React, { useState } from 'react';
import AdminLayout from '../components/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/utils';
import { UserPlus } from 'lucide-react';

interface OnboardResult {
  email: string;
  outcome: 'created' | 'existing' | 'failed';
  error?: string;
}

function parseEmails(raw: string): string[] {
  const parts = raw.split(/[\n,]/).map((e) => e.trim()).filter(Boolean);
  return Array.from(new Set(parts));
}

const outcomeBadge = (outcome: OnboardResult['outcome']) => {
  if (outcome === 'created') return <Badge className="bg-green-100 text-green-800">Created</Badge>;
  if (outcome === 'existing') return <Badge className="bg-blue-100 text-blue-800">Existing user</Badge>;
  return <Badge variant="destructive">Failed</Badge>;
};

const Onboarding: React.FC = () => {
  const [emailsInput, setEmailsInput] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [results, setResults] = useState<OnboardResult[] | null>(null);
  const { toast } = useToast();

  const emails = parseEmails(emailsInput);

  const handleSubmit = async () => {
    if (emails.length === 0) {
      toast({ title: 'Error', description: 'Enter at least one email address', variant: 'destructive' });
      return;
    }

    setIsSending(true);
    setResults(null);
    try {
      const res = await apiRequest('/admin/users/onboard', {
        method: 'POST',
        body: JSON.stringify({ emails, emailBody }),
      });

      if (!res.ok) throw new Error('Failed to onboard users');

      const data = await res.json();
      const onboardResults: OnboardResult[] = data.results || [];
      setResults(onboardResults);

      const failedCount = onboardResults.filter((r) => r.outcome === 'failed').length;
      if (failedCount > 0) {
        toast({
          title: 'Completed with errors',
          description: `${onboardResults.length} processed, ${failedCount} failed`,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Onboarding complete',
          description: `${onboardResults.length} invitation${onboardResults.length === 1 ? '' : 's'} sent`,
        });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to onboard users', variant: 'destructive' });
    } finally {
      setIsSending(false);
    }
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
              Enter one email address per line (or comma-separated). Each will be created if they
              don't already have an account, given a temporary password, and emailed login details.
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
              <Label htmlFor="onboarding-body">Email message</Label>
              <Textarea
                id="onboarding-body"
                placeholder="You've been invited to join Nereus. Download the app below and log in with the credentials provided to get started."
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
      </div>
    </AdminLayout>
  );
};

export default Onboarding;
