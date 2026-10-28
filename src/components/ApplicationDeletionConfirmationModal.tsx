import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface DeleteApplicationModalProps {
    isOpen: boolean;
    onClose: () => void;
    applicationId: number;
    onSuccess: () => void;
    username: string;
}

export const DeleteApplicationModal: React.FC<DeleteApplicationModalProps> = ({
    isOpen,
    onClose,
    applicationId,
    onSuccess,
    username
}) => {
    const [isDeleting, setIsDeleting] = useState(false);
    const { toast } = useToast();

    const handleDeleteApplication = async () => {
        setIsDeleting(true);

        try {
            const response = await apiRequest(
                `/application/${applicationId}`,
                {
                    method: 'DELETE',
                }
            );

            if (!response.ok) {
                throw new Error('Failed to delete application');
            }

            toast({
                title: 'Success',
                description: 'Application and associated user account deleted successfully.',
            });

            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error deleting application:', error);

            toast({
                title: 'Error',
                description: 'Failed to delete application. Please try again.',
                variant: 'destructive',
            });

        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => {
            if (!open && !isDeleting) {
                onClose();
            }
        }}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Delete Application</DialogTitle>

                    <DialogDescription>
                        Deleting {username}'s application will also delete the their account from the
                        system. Do you want to proceed?
                    </DialogDescription>
                </DialogHeader>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={onClose}
                        disabled={isDeleting}
                    >
                        Cancel
                    </Button>

                    <Button
                        variant="destructive"
                        onClick={handleDeleteApplication}
                        disabled={isDeleting}
                    >
                        {isDeleting ? 'Deleting...' : 'Continue'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};