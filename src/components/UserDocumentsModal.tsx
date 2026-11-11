import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import UserDocuments from "./UserDocuments";
import UploadUserDocumentModal from "./UploadUserDocumentModal";

type Props = {
    user: any;
    isOpen: boolean;
    onClose: () => void;
    onUploaded?: () => void;
};

const UserDocumentsModal = ({ user, isOpen, onClose, onUploaded }: Props) => {
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);

    const handleUploadSuccess = () => {
        setRefreshKey((key) => key + 1);
        onUploaded?.();
    };

    if (!user) return null;

    const bucket = user.meta?.userBucket || user.username;
    const name =
        user?.profile?.fullName ||
        `${user?.profile?.Forename || ''} ${user?.profile?.Surname || ''}`.trim() ||
        user.username;

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto overflow-x-hidden">
                    <DialogHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pr-6">
                        <div className="min-w-0">
                            <DialogTitle className="truncate">Documents — {name}</DialogTitle>
                            <DialogDescription>User uploaded compliance documents</DialogDescription>
                        </div>
                        <Button
                            onClick={() => setIsUploadModalOpen(true)}
                            className="bg-[#712B71] hover:bg-[#712B71]/90 shrink-0"
                        >
                            Upload Document
                        </Button>
                    </DialogHeader>

                    <UserDocuments key={refreshKey} bucket={bucket} />
                </DialogContent>
            </Dialog>

            <UploadUserDocumentModal
                isOpen={isUploadModalOpen}
                onClose={() => setIsUploadModalOpen(false)}
                user={user}
                onSuccess={handleUploadSuccess}
            />
        </>
    );
};

export default UserDocumentsModal;
