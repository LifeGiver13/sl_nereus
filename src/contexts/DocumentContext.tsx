import React, {
    createContext,
    useContext,
    ReactNode,
} from "react";

import { apiRequest } from "../lib/utils";
import { useAuth } from "../contexts/AuthContext";


//types

type UploadDocumentParams = {
    file: File;
    fileType?: string;
    bucket?: string;
};

type UploadResponse = {
    success: boolean;
    url?: string;
    error?: string;
};

type DocumentItem = {
    key: string;
    url?: string;
    lastModified?: string;
    size?: number;
};

type GetDocumentsResponse = {
    success: boolean;
    documents?: DocumentItem[];
    error?: string;
};

type DownloadUrlResponse = {
    success: boolean;
    url?: string;
    error?: string;
};

type GetDocumentFoldersResponse = {
    success: boolean;
    folders?: string[];
    error?: string;
};

type DocumentContextType = {
    uploadDocument: (
        params: UploadDocumentParams
    ) => Promise<UploadResponse>;

    getDocumentsByBucket: (
        bucket: string
    ) => Promise<GetDocumentsResponse>;

    getDocumentDownloadUrl: (
        bucket: string,
        key: string
    ) => Promise<DownloadUrlResponse>;

    getDocumentFolders: () => Promise<GetDocumentFoldersResponse>;
};


//context

const DocumentContext =
    createContext<DocumentContextType | null>(null);


//useDocument hook

export const useDocument = () => {
    const context = useContext(DocumentContext);

    if (!context) {
        throw new Error(
            "useDocument must be used inside DocumentProvider"
        );
    }

    return context;
};


// provider

type DocumentProviderProps = {
    children: ReactNode;
};

export const DocumentProvider = ({
    children,
}: DocumentProviderProps) => {

    const { user } = useAuth();


    // get user bucker name

    const getUserBucket = () => {
        return user?.meta?.userBucket || user?.username || "user";
    };


    // upload document and return its url

    const uploadDocument = async ({
        file,
        fileType,
        bucket,
    }: UploadDocumentParams): Promise<UploadResponse> => {

        try {

            const date = new Date();

            const safeDate = date
                .toISOString()
                .replace(/[:.]/g, "-");

            const rawName = bucket || getUserBucket();

            const extension =
                file.name.split(".").pop() || "bin";

            const finalFileType = fileType || "general";

            const key = `${rawName}/${finalFileType}_${safeDate}.${extension}`;

            // request presigned upload URL from backend

            const uploadUrlResponse = await apiRequest(
                `/fs/upload-url`,
                {
                    method: "POST",
                    body: JSON.stringify({
                        key,
                    }),
                }
            );

            const uploadUrlData =
                await uploadUrlResponse.json();

            if (!uploadUrlResponse.ok) {
                throw new Error(
                    uploadUrlData.message ||
                    "Failed to get upload URL"
                );
            }

            const { url, fileUrl } = uploadUrlData;


            // upload file to storage using presigned URL

            const uploadResponse = await fetch(url, {
                method: "PUT",
                body: file,
                headers: {
                    "Content-Type":
                        file.type || "application/octet-stream",
                },
            });

            if (!uploadResponse.ok) {
                throw new Error("File upload failed");
            }

            return {
                success: true,
                url: fileUrl || url.split("?")[0],
            };

        } catch (error) {

            return {
                success: false,
                error:
                    error instanceof Error
                        ? error.message
                        : "Upload failed",
            };
        }
    };


    // get documents by bucket (e.g. "user", "invoices", etc.)

    const getDocumentsByBucket = async (
        bucket: string
    ): Promise<GetDocumentsResponse> => {

        try {

            const response = await apiRequest(
                `/list/${encodeURIComponent(bucket)}`,
                { method: "GET" }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message ||
                    "Failed to fetch documents"
                );
            }

            return {
                success: true,
                documents: data.documents || [],
            };

        } catch (error) {

            return {
                success: false,
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to fetch documents",
            };
        }
    };



    const getDocumentDownloadUrl = async (
        bucket: string,
        key: string
    ): Promise<DownloadUrlResponse> => {

        try {

            const relativeKey = key.startsWith(`${bucket}/`)
                ? key.replace(`${bucket}/`, "")
                : key;

            const response = await apiRequest(
                `/fs/download-url/${encodeURIComponent(bucket)}/${encodeURIComponent(relativeKey)}`,
                { method: "GET" }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message ||
                    "Failed to get download URL"
                );
            }

            return {
                success: true,
                url: data.url,
            };

        } catch (error) {

            return {
                success: false,
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to get download URL",
            };
        }
    };



    // which document folders (userBucket values) actually contain files -
    // one call for the whole People list, instead of one per row

    const getDocumentFolders = async (): Promise<GetDocumentFoldersResponse> => {

        try {

            const response = await apiRequest(
                `/admin/documents/folders`,
                { method: "GET" }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message ||
                    "Failed to fetch document folders"
                );
            }

            return {
                success: true,
                folders: data.folders || [],
            };

        } catch (error) {

            return {
                success: false,
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to fetch document folders",
            };
        }
    };



    return (
        <DocumentContext.Provider
            value={{
                uploadDocument,
                getDocumentsByBucket,
                getDocumentDownloadUrl,
                getDocumentFolders,
            }}
        >
            {children}
        </DocumentContext.Provider>
    );
};