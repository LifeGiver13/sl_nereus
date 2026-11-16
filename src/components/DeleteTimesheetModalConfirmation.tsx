
import React, { useEffect, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle } from "lucide-react";

type DeleteTimesheetModalProps = {
    open: boolean;
    onClose: () => void;
    timesheetId: number | null;
    isLoading: boolean;
    onConfirm: (reason: string) => Promise<void>;
};

const DeleteTimesheetModal: React.FC<DeleteTimesheetModalProps> = ({
    open,
    onClose,
    timesheetId,
    isLoading,
    onConfirm,
}) => {
    const [reason, setReason] = useState("");

    useEffect(() => {
        if (open) {
            setReason("");
        }
    }, [open, timesheetId]);

    const trimmedReason = reason.trim();
    const isValid = trimmedReason.length > 0 && trimmedReason.length <= 500;

    const handleConfirm = async () => {
        if (!isValid || isLoading) return;
        await onConfirm(trimmedReason);
    };

    return (
        <Dialog
            open={open}
            onOpenChange={(nextOpen) => {
                if (!nextOpen && !isLoading) {
                    onClose();
                }
            }}
        >
            <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                    <div className="flex items-center gap-2 text-red-600">
                        <AlertTriangle className="h-5 w-5" />
                        <DialogTitle>Delete Timesheet</DialogTitle>
                    </div>

                    <DialogDescription>
                        You are about to mark timesheet #{timesheetId} as deleted.
                        This will not permanently remove the record. The action will
                        be recorded in the timesheet audit history.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-2">
                    <label
                        htmlFor="deletion-reason"
                        className="text-sm font-medium"
                    >
                        Reason for deletion <span className="text-red-600">*</span>
                    </label>

                    <Textarea
                        id="deletion-reason"
                        placeholder="Enter the reason for deleting this timesheet..."
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        maxLength={500}
                        rows={4}
                        disabled={isLoading}
                    />

                    <div className="flex justify-between text-xs text-muted-foreground">
                        <span>
                            {trimmedReason.length === 0
                                ? "A deletion reason is required."
                                : trimmedReason.length > 500
                                    ? "Maximum 500 characters allowed."
                                    : ""}
                        </span>
                        <span>{reason.length}/500</span>
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onClose}
                        disabled={isLoading}
                    >
                        Cancel
                    </Button>

                    <Button
                        type="button"
                        variant="destructive"
                        onClick={handleConfirm}
                        disabled={!isValid || isLoading}
                    >
                        {isLoading ? "Deleting..." : "Confirm Delete"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default DeleteTimesheetModal;
