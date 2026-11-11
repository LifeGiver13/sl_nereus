import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, Upload, Loader2, FileText } from "lucide-react";

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

type FileDropZoneProps = {
    multiple: boolean;
    inputRef: React.RefObject<HTMLInputElement>;
    onFiles: (files: File[]) => void;
    label: string;
};

// Shared drag-and-drop target for both the single and bulk file pickers -
// the native input stays in the DOM (hidden) so "click to browse" keeps
// working, drop just feeds the same onFiles callback as a file picker would.
const FileDropZone = ({ multiple, inputRef, onFiles, label }: FileDropZoneProps) => {
    const [isDragging, setIsDragging] = useState(false);

    return (
        <div
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
            }}
            onDragLeave={(e) => {
                e.preventDefault();
                setIsDragging(false);
            }}
            onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                const dropped = Array.from(e.dataTransfer.files || []);
                if (dropped.length > 0) onFiles(dropped);
            }}
            className={`w-full border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                isDragging ? "border-[#712B71] bg-[#712B71]/5" : "border-gray-300 hover:border-gray-400"
            }`}
        >
            <input
                ref={inputRef}
                type="file"
                multiple={multiple}
                accept=".pdf,image/*"
                className="hidden"
                onChange={(e) => {
                    onFiles(Array.from(e.target.files || []));
                    // allow re-selecting the same file(s) after a reset
                    e.target.value = "";
                }}
            />
            <Upload className="h-6 w-6 mx-auto text-gray-400 mb-2" />
            <p className="text-sm text-gray-600">{label}</p>
        </div>
    );
};

const UploadUserDocumentModal = ({
    isOpen,
    onClose,
    user,
    onSuccess,
}: Props) => {

    const { toast } = useToast();

    const { uploadDocument } = useDocument();

    const singleFileInputRef = useRef<HTMLInputElement>(null);
    const bulkFileInputRef = useRef<HTMLInputElement>(null);

    const [uploadMode, setUploadMode] = useState<UploadMode>("single");

    // single-upload fields

    const [file, setFile] = useState<File | null>(null);

    const [documentType, setDocumentType] =
        useState("");

    const [expiryDate, setExpiryDate] =
        useState("");

    // bulk-upload fields

    const [bulkFiles, setBulkFiles] = useState<File[]>([]);

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
                    fileType: "general",
                });

                if (!uploadResult.success || !uploadResult.url) {
                    throw new Error(uploadResult.error || "Upload failed");
                }

                successfulPayloads.push({
                    documentType: "general",
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

                            <FileDropZone
                                multiple={false}
                                inputRef={singleFileInputRef}
                                onFiles={(files) => setFile(files[0] || null)}
                                label={
                                    file
                                        ? file.name
                                        : "Drag and drop a file here, or click to browse"
                                }
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
                        <p className="text-sm text-gray-500 mb-4">
                            Each file is saved as a "General / unspecified" document — use
                            Single Document above if you need to tag a specific type.
                        </p>

                        {/* files */}

                        <div className="space-y-2 mb-4">

                            <label className="font-medium">
                                Document Files
                            </label>

                            <FileDropZone
                                multiple
                                inputRef={bulkFileInputRef}
                                onFiles={(incoming) =>
                                    setBulkFiles((prev) => {
                                        const merged = [...prev];
                                        for (const f of incoming) {
                                            if (!merged.some((m) => m.name === f.name && m.size === f.size)) {
                                                merged.push(f);
                                            }
                                        }
                                        return merged;
                                    })
                                }
                                label="Drag and drop files here, or click to browse (adds to selection)"
                            />

                            {bulkFiles.length > 0 && (
                                <ul className="text-sm text-gray-600 space-y-1 max-h-32 overflow-y-auto">
                                    {bulkFiles.map((f, i) => (
                                        <li key={`${f.name}-${i}`} className="flex items-center justify-between gap-2">
                                            <span className="truncate flex items-center gap-1.5 min-w-0">
                                                <FileText className="h-3.5 w-3.5 shrink-0" />
                                                <span className="truncate">{f.name}</span>
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setBulkFiles((prev) => prev.filter((_, idx) => idx !== i))
                                                }
                                                className="text-gray-400 hover:text-gray-600 shrink-0"
                                                aria-label={`Remove ${f.name}`}
                                            >
                                                <X className="h-3.5 w-3.5" />
                                            </button>
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
