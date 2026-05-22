import { useEffect, useState } from "react";

import { useDocument } from "../contexts/DocumentContext";
import { ActivityIcon } from "lucide-react";

type DocumentItem = {
    key: string;
    url?: string;
    lastModified?: string;
    size?: number;
};

type UserDocumentsProps = {
    bucket: string;
};

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
                    setDocuments(result.documents);
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


    return (
        <div className="space-y-3">

            {documents.length === 0 ? (
                <p>No documents found</p>
            ) : (
                documents.map((doc) => (
                    <div
                        key={doc.key}
                        className="border rounded-lg p-4 flex items-center justify-between"
                    >
                        <div>
                            <p className="font-medium">
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

                        <div className="flex gap-2">

                            <button
                                onClick={() => handleView(doc.key)}
                                disabled={viewingKey === doc.key}
                                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
                            >
                                {viewingKey === doc.key
                                    ? <ActivityIcon className="animate-spin" />
                                    : "View"}
                            </button>

                            <button
                                onClick={() => handleDownload(doc.key)}
                                disabled={downloadingKey === doc.key}
                                className="bg-black text-white px-4 py-2 rounded-md hover:bg-gray-800 disabled:opacity-50"
                            >
                                {downloadingKey === doc.key
                                    ? <ActivityIcon className="animate-spin" />
                                    : "Download"}
                            </button>

                        </div>
                    </div>
                ))
            )}
        </div>
    );
};

export default UserDocuments;