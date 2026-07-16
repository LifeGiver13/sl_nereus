import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";


interface CloseJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}


const CloseJobModal = ({
  isOpen,
  onClose,
  onConfirm
}: CloseJobModalProps) => {

  const [reason, setReason] = useState("");
  const { toast } = useToast();


  const handleConfirm = () => {

    if (!reason.trim()) {
      toast({
        title: "Reason required",
        description: "Please provide a reason for closing this job.",
        variant: "destructive"
      });

      return;
    }


    onConfirm(reason);

    setReason("");
  };


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>

        <DialogHeader>
          <DialogTitle>
            Close Job
          </DialogTitle>

          <DialogDescription>
            This will close and archive the job.
            Please provide a reason before continuing.
          </DialogDescription>

        </DialogHeader>


        <div className="space-y-3">

          <label className="text-sm font-medium">
            Closure reason *
          </label>

          <Textarea
            value={reason}
            onChange={(e)=>setReason(e.target.value)}
            placeholder="Example: Client cancelled the request..."
            rows={4}
          />

        </div>


        <DialogFooter>

          <Button
            variant="outline"
            onClick={onClose}
          >
            Cancel
          </Button>


          <Button
            className="bg-red-600 hover:bg-red-700"
            onClick={handleConfirm}
          >
            Close & Archive Job
          </Button>

        </DialogFooter>


      </DialogContent>
    </Dialog>
  );
};


export default CloseJobModal;