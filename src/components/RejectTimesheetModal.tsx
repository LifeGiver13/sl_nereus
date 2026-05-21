import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from "@/components/ui/button";
import { Textarea } from "./ui/textarea";

type RejectTimesheetProps = {
    open: boolean;
    onClose: () => void;
    onConfirm: (reason: string) => Promise<void>;
    isLoading?: boolean;
    timesheetId?: number | null;
}

const RejecteTimesheetModal = ({
    open,
    onClose,
    onConfirm,
    isLoading = false,
    timesheetId
}: RejectTimesheetProps) => {
    const [reason, setReason] = useState("");

    const handleConfirm = async () => {
        if (!reason.trim()) return;
        await onConfirm(reason);
        setReason("");
        onClose();
    }

    const handleClose = () => {
        setReason("");
        onClose();
    }
    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Reject Timesheet #{timesheetId}</DialogTitle>
                    <DialogDescription>
                        Please provide a reason for rejecting this timesheet.
                    </DialogDescription>
                </DialogHeader>
                <Textarea
                    placeholder="Enter a rejection Reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="min-h-[120px]"
                />
                <DialogFooter>
                    <Button variant="outline" onClick={handleClose} disabled={isLoading}>
                        Cancel
                    </Button>
                    <Button variant="destructive" onClick={handleConfirm} disabled={isLoading || !reason.trim()}>
                        {isLoading ? "Rejecting..." : "Reject"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
export default RejecteTimesheetModal;

