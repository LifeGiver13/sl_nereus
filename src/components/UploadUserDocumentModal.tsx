import { useState } from "react";
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

const UploadUserDocumentModal = ({
    isOpen,
    onClose,
    user,
    onSuccess,
}: Props) => {

    const { toast } = useToast();

    const { uploadDocument } = useDocument();

    const [file, setFile] = useState<File | null>(null);

    const [documentType, setDocumentType] =
        useState("");

    const [expiryDate, setExpiryDate] =
        useState("");

    const [isUploading, setIsUploading] =
        useState(false);

    if (!isOpen) return null;

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

            // existing documents

            const existingDocuments =
                Array.isArray(user?.meta?.documents)
                    ? user.meta.documents
                    : [];

            // updated documents array

            const updatedDocuments = [
                ...existingDocuments,
                payload,
            ];

            // update user meta

            const response = await apiRequest(
                `/user/${user.id}`,
                {
                    method: "PUT",
                    body: JSON.stringify({
                        meta: {
                            ...user.meta,
                            documents:
                                updatedDocuments,
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

            toast({
                title: "Success",
                description:
                    "Document uploaded successfully",
            });

            onSuccess?.();

            onClose();

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

    return (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">

            <div className="bg-white rounded-2xl w-full max-w-lg p-6 relative">

                <button
                    onClick={onClose}
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
                    className="w-full bg-[#712B71] text-white rounded-lg p-3 flex items-center justify-center gap-2"
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
            </div>
        </div>
    );
};

export default UploadUserDocumentModal;