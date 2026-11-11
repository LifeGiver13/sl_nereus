import { useState } from "react";
import { createPortal } from "react-dom";
import { X, Upload, Loader2 } from "lucide-react";

import { apiRequest } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useDocument } from "../contexts/DocumentContext";

type Props = {
    isOpen: boolean;
    onClose: () => void;
    user: any;
    onSuccess?: () => void;
};

const documentTypes = [
    { label: "Passport", value: "passport" },
    { label: "Proof of National Insurance", value: "proofOfNationalInsurance" },
    { label: "Proof of Bank Account", value: "proofOfBankAccount" },
    { label: "Proof of Address", value: "proofOfAddress" },
    { label: "Full Birth Certificate", value: "fullBirthCertificate" },
    { label: "Driver's Licence", value: "driversLicence" },
    { label: "CV", value: "CV" },
    { label: "DBS Certificate", value: "DBSCertificate" },
];

type UploadMode = "single" | "multiple";

const UploadUserDocumentModal = ({
    isOpen,
    onClose,
    user,
    onSuccess,
}: Props) => {

    const { toast } = useToast();

    const { uploadDocument } = useDocument();

    const [uploadMode, setUploadMode] = useState<UploadMode>("single");

    // single-upload fields

    const [file, setFile] = useState<File | null>(null);

    const [documentType, setDocumentType] =
        useState("");

    const [expiryDate, setExpiryDate] =
        useState("");

    // bulk-upload fields

    const [bulkFiles, setBulkFiles] = useState<File[]>([]);

    const [bulkDocumentType, setBulkDocumentType] = useState("");

    const [uploadProgress, setUploadProgress] =
        useState<{ done: number; total: number } | null>(null);

    const [isUploading, setIsUploading] =
        useState(false);

    if (!isOpen) return null;

    const resetState = () => {
        setFile(null);
        setDocumentType("");
        setExpiryDate("");
        setBulkFiles([]);
        setBulkDocumentType("");
        setUploadProgress(null);
    };

    const handleClose = () => {
        resetState();
        onClose();
    };

    const saveDocuments = async (newDocuments: any[]) => {
        const existingDocuments =
            Array.isArray(user?.meta?.documents)
                ? user.meta.documents
                : [];

        const response = await apiRequest(
            `/user/${user.id}`,
            {
                method: "PUT",
                body: JSON.stringify({
                    meta: {
                        ...user.meta,
                        documents: [...existingDocuments, ...newDocuments],
                    },
                    profile: {
                        ...user.profile,
                    },
                }),
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.message ||
                "Failed to update user"
            );
        }
    };

    const handleUpload = async () => {

        try {

            if (!file) {
                toast({
                    title: "Error",
                    description: "Please select a file",
                    variant: "destructive",
                });

                return;
            }

            if (!documentType) {
                toast({
                    title: "Error",
                    description: "Please select a document type",
                    variant: "destructive",
                });

                return;
            }

            setIsUploading(true);

            // upload file to storage

            const uploadResult =
                await uploadDocument({
                    file,
                    fileType: documentType,
                });

            if (
                !uploadResult.success ||
                !uploadResult.url
            ) {
                throw new Error(
                    uploadResult.error ||
                    "Upload failed"
                );
            }

            // create document payload

            const payload = {
                documentType,
                documentUrl: uploadResult.url,
                ...(expiryDate && {
                    expiryDate,
                }),
            };

            await saveDocuments([payload]);

            toast({
                title: "Success",
                description:
                    "Document uploaded successfully",
            });

            onSuccess?.();

            handleClose();

        } catch (error) {

            console.log(error);

            toast({
                title: "Error",
                description:
                    error instanceof Error
                        ? error.message
                        : "Upload failed",
                variant: "destructive",
            });

        } finally {

            setIsUploading(false);
        }
    };

    const handleBulkUpload = async () => {

        if (bulkFiles.length === 0) {
            toast({
                title: "Error",
                description: "Please select at least one file",
                variant: "destructive",
            });

            return;
        }

        setIsUploading(true);
        setUploadProgress({ done: 0, total: bulkFiles.length });

        const successfulPayloads: any[] = [];
        const failedFiles: string[] = [];

        for (const f of bulkFiles) {
            try {
                const uploadResult = await uploadDocument({
                    file: f,
                    fileType: bulkDocumentType || "general",
                });

                if (!uploadResult.success || !uploadResult.url) {
                    throw new Error(uploadResult.error || "Upload failed");
                }

                successfulPayloads.push({
                    documentType: bulkDocumentType || "general",
                    documentUrl: uploadResult.url,
                    fileName: f.name,
                });
            } catch (error) {
                console.log(error);
                failedFiles.push(f.name);
            } finally {
                setUploadProgress((p) => (p ? { ...p, done: p.done + 1 } : p));
            }
        }

        try {
            if (successfulPayloads.length > 0) {
                await saveDocuments(successfulPayloads);
            }

            if (failedFiles.length === 0) {
                toast({
                    title: "Success",
                    description: `${successfulPayloads.length} document(s) uploaded successfully`,
                });
            } else {
                toast({
                    title: successfulPayloads.length > 0 ? "Partially uploaded" : "Upload failed",
                    description:
                        `${successfulPayloads.length} of ${bulkFiles.length} uploaded. ` +
                        `Failed: ${failedFiles.join(", ")}`,
                    variant: "destructive",
                });
            }

            if (successfulPayloads.length > 0) {
                onSuccess?.();
            }

            handleClose();

        } catch (error) {

            toast({
                title: "Error",
                description:
                    error instanceof Error
                        ? error.message
                        : "Failed to save uploaded documents",
                variant: "destructive",
            });

        } finally {
            setIsUploading(false);
            setUploadProgress(null);
        }
    };

    return createPortal(
        <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center">

            <div className="bg-white rounded-2xl w-full max-w-lg p-6 relative max-h-[90vh] overflow-y-auto">

                <button
                    onClick={handleClose}
                    className="absolute top-4 right-4"
                >
                    <X className="h-5 w-5" />
                </button>

                <h2 className="text-2xl font-bold">
                    Upload Document
                </h2>

                <p className="text-gray-500 mt-1 mb-6">
                    Upload a compliance document
                    for this user
                </p>

                {/* mode tabs */}

                <div className="flex gap-2 mb-6 border rounded-lg p-1 bg-gray-50">
                    <button
                        type="button"
                        onClick={() => setUploadMode("single")}
                        className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
                            uploadMode === "single"
                                ? "bg-white shadow text-[#712B71]"
                                : "text-gray-500"
                        }`}
                    >
                        Single Document
                    </button>
                    <button
                        type="button"
                        onClick={() => setUploadMode("multiple")}
                        className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
                            uploadMode === "multiple"
                                ? "bg-white shadow text-[#712B71]"
                                : "text-gray-500"
                        }`}
                    >
                        Multiple Documents
                    </button>
                </div>

                {uploadMode === "single" ? (
                    <>
                        {/* document type */}

                        <div className="space-y-2 mb-4">

                            <label className="font-medium">
                                Document Type
                            </label>

                            <select
                                value={documentType}
                                onChange={(e) =>
                                    setDocumentType(
                                        e.target.value
                                    )
                                }
                                className="w-full border rounded-lg p-3"
                            >
                                <option value="">
                                    Select document type
                                </option>

                                {documentTypes.map((doc) => (
                                    <option
                                        key={doc.value}
                                        value={doc.value}
                                    >
                                        {doc.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* file */}

                        <div className="space-y-2 mb-4">

                            <label className="font-medium">
                                Document File
                            </label>

                            <input
                                type="file"
                                accept=".pdf,image/*"
                                onChange={(e) =>
                                    setFile(
                                        e.target.files?.[0] ||
                                        null
                                    )
                                }
                                className="w-full border rounded-lg p-3"
                            />
                        </div>

                        {/* expiry date */}

                        <div className="space-y-2 mb-6">

                            <label className="font-medium">
                                Expiry Date
                                (optional)
                            </label>

                            <input
                                type="date"
                                value={expiryDate}
                                onChange={(e) =>
                                    setExpiryDate(
                                        e.target.value
                                    )
                                }
                                className="w-full border rounded-lg p-3"
                            />
                        </div>

                        <button
                            onClick={handleUpload}
                            disabled={isUploading}
                            className="w-full bg-[#712B71] text-white rounded-lg p-3 flex items-center justify-center gap-2 disabled:opacity-60"
                        >

                            {isUploading ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Uploading...
                                </>
                            ) : (
                                <>
                                    <Upload className="h-4 w-4" />
                                    Upload Document
                                </>
                            )}

                        </button>
                    </>
                ) : (
                    <>
                        {/* bulk document type (optional, applies to all files) */}

                        <div className="space-y-2 mb-4">

                            <label className="font-medium">
                                Document Type (optional, applied to all files)
                            </label>

                            <select
                                value={bulkDocumentType}
                                onChange={(e) =>
                                    setBulkDocumentType(e.target.value)
                                }
                                className="w-full border rounded-lg p-3"
                            >
                                <option value="">
                                    General / unspecified
                                </option>

                                {documentTypes.map((doc) => (
                                    <option
                                        key={doc.value}
                                        value={doc.value}
                                    >
                                        {doc.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* files */}

                        <div className="space-y-2 mb-4">

                            <label className="font-medium">
                                Document Files
                            </label>

                            <input
                                type="file"
                                multiple
                                accept=".pdf,image/*"
                                onChange={(e) =>
                                    setBulkFiles(
                                        Array.from(e.target.files || [])
                                    )
                                }
                                className="w-full border rounded-lg p-3"
                            />

                            {bulkFiles.length > 0 && (
                                <ul className="text-sm text-gray-600 space-y-1 max-h-32 overflow-y-auto">
                                    {bulkFiles.map((f, i) => (
                                        <li key={`${f.name}-${i}`} className="truncate">
                                            {f.name}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        <button
                            onClick={handleBulkUpload}
                            disabled={isUploading}
                            className="w-full bg-[#712B71] text-white rounded-lg p-3 flex items-center justify-center gap-2 disabled:opacity-60"
                        >

                            {isUploading ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    {uploadProgress
                                        ? `Uploading ${uploadProgress.done}/${uploadProgress.total}...`
                                        : "Uploading..."}
                                </>
                            ) : (
                                <>
                                    <Upload className="h-4 w-4" />
                                    {bulkFiles.length > 0
                                        ? `Upload ${bulkFiles.length} Document${bulkFiles.length === 1 ? "" : "s"}`
                                        : "Upload Documents"}
                                </>
                            )}

                        </button>
                    </>
                )}
            </div>
        </div>,
        document.body
    );
};

export default UploadUserDocumentModal;
