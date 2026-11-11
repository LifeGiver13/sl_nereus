import { useEffect, useState } from "react";
import { useDocument } from "../contexts/DocumentContext";
import { Download, Eye, Loader2 } from "lucide-react";
import { Button } from "./ui/button";

type DocumentItem = {
    key: string;
    url?: string;
    lastModified?: string;
    size?: number;
};

type UserDocumentsProps = {
    bucket: string;
};

// Shared button styles: icon + label sit on one line, fixed width so the
// button doesn't jump in size when the spinner replaces the icon.
const baseButtonClass =
    "inline-flex items-center justify-center gap-2 min-w-[120px] px-4 py-2 " +
    "rounded-md text-sm font-medium text-white transition-colors " +
    "disabled:opacity-50 disabled:cursor-not-allowed";

const iconClass = "h-4 w-4 shrink-0";

const UserDocuments = ({
    bucket,
}: UserDocumentsProps) => {

    const {
        getDocumentsByBucket,
        getDocumentDownloadUrl,
    } = useDocument();

    const [documents, setDocuments] = useState<DocumentItem[]>([]);
    const [downloadingKey, setDownloadingKey] =
        useState<string | null>(null);

    const [viewingKey, setViewingKey] =
        useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {

        const loadDocuments = async () => {

            try {

                setIsLoading(true);

                const result =
                    await getDocumentsByBucket(bucket);

                if (result.success && result.documents) {
                    const validDocs = result.documents.filter(doc => doc.size && doc.size > 0);
                    setDocuments(validDocs);
                }

            } catch (error) {
                console.log(error);

            } finally {
                setIsLoading(false);
            }
        };

        loadDocuments();

    }, [bucket]);


    const handleDownload = async (key: string) => {

        try {

            setDownloadingKey(key);

            const result =
                await getDocumentDownloadUrl(bucket, key);

            if (!result.success || !result.url) {
                return;
            }

            const response = await fetch(result.url);

            if (!response.ok) {
                throw new Error("Failed to fetch file");
            }

            const blob = await response.blob();

            const blobUrl =
                window.URL.createObjectURL(blob);

            const fileName =
                key.split("/").pop() || "document";

            const link =
                document.createElement("a");

            link.href = blobUrl;

            link.download = fileName;

            document.body.appendChild(link);

            link.click();

            document.body.removeChild(link);

            window.URL.revokeObjectURL(blobUrl);

        } catch (error) {

            console.log(error);

        } finally {

            setDownloadingKey(null);
        }
    };

    const handleView = async (key: string) => {

        try {

            setViewingKey(key);

            const result =
                await getDocumentDownloadUrl(bucket, key);

            if (!result.success || !result.url) {
                return;
            }

            window.open(result.url, "_blank");

        } catch (error) {

            console.log(error);

        } finally {

            setViewingKey(null);
        }
    };

    if (isLoading) {
        return <p>Loading documents...</p>;
    }

    if (documents.length === 0) {
        return <p>No documents found</p>;
    }

    return (
        <div className="space-y-3">

            {documents.map((doc) => (
                <div
                    key={doc.key}
                    className="border rounded-lg p-4 flex items-center justify-between gap-3"
                >
                    <div className="min-w-0 flex-1">
                        <p className="font-medium break-words">
                            {doc.key.charAt(0).toUpperCase() + doc.key.slice(1)}
                        </p>

                        {doc.lastModified && (
                            <p className="text-sm text-gray-500">
                                {new Date(
                                    doc.lastModified
                                ).toLocaleString()}
                            </p>
                        )}
                    </div>

                    <div className="flex gap-2 shrink-0">

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleView(doc.key)}
                            disabled={viewingKey === doc.key}
                        >
                            {viewingKey === doc.key ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                                <Eye className="h-4 w-4 mr-2" />
                            )}
                            View
                        </Button>

                        <Button
                            size="sm"
                            onClick={() => handleDownload(doc.key)}
                            disabled={downloadingKey === doc.key}
                            className="bg-[#712B71] hover:bg-[#712B71]/90"
                        >
                            {downloadingKey === doc.key ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                                <Download className="h-4 w-4 mr-2" />
                            )}
                            Download
                        </Button>

                    </div>
                </div>
            ))}
        </div>
    );
};

export default UserDocuments;