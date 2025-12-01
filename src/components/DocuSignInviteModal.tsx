import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { apiRequest } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface Application {
  id: number;
  userId: number;
  status: string;
  data: Record<string, unknown>;
  meta: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  user?: {
    username: string;
  };
}

interface DocuSignInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  application: Application;
  onSuccess: () => void;
}

// Envelopes are returned as string array from API

export const DocuSignInviteModal: React.FC<DocuSignInviteModalProps> = ({
  isOpen,
  onClose,
  application,
  onSuccess,
}) => {
  const [envelopes, setEnvelopes] = useState<string[]>([]);
  const [selectedEnvelope, setSelectedEnvelope] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      fetchEnvelopes();
    }
  }, [isOpen]);

  const fetchEnvelopes = async () => {
    setIsLoading(true);
    try {
      const response = await apiRequest('/docusign/envelopes');
      if (!response.ok) {
        throw new Error('Failed to fetch envelopes');
      }
      const data = await response.json();
      setEnvelopes(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load available envelopes',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendInvitation = async () => {
    if (!selectedEnvelope) {
      toast({
        title: 'Selection Required',
        description: 'Please select an envelope',
        variant: 'destructive',
      });
      return;
    }

    setIsSending(true);
    try {
      const response = await apiRequest('/docusign/send-invitation', {
        method: 'POST',
        body: JSON.stringify({
          userId: application.userId,
          envelopeName: selectedEnvelope,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send invitation');
      }

      const data = await response.json();

      // Update application with full object and merged meta
      await apiRequest(`/application/${application.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          ...application,
          meta: {
            ...application.meta,
            docusign: data.envelopesSummary,
          },
        }),
      });

      toast({
        title: 'Success',
        description: data.message,
      });

      onSuccess();
      onClose();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to send invitation',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send DocuSign Invitation</DialogTitle>
          <DialogDescription>
            Select an envelope template to send to the user for signing
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground">
            Loading envelopes...
          </div>
        ) : (
          <div className="space-y-4">
            <RadioGroup value={selectedEnvelope} onValueChange={setSelectedEnvelope}>
              {envelopes.map((envelope, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <RadioGroupItem value={envelope} id={`envelope-${index}`} />
                  <Label htmlFor={`envelope-${index}`} className="cursor-pointer">
                    {envelope}
                  </Label>
                </div>
              ))}
            </RadioGroup>

            {envelopes.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No envelopes available
              </p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSending}>
            Cancel
          </Button>
          <Button
            onClick={handleSendInvitation}
            disabled={!selectedEnvelope || isSending}
          >
            {isSending ? 'Sending...' : 'Send Invitation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
