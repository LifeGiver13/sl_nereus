import React, { useState, useEffect } from 'react';
import { useParams, Link, useSearchParams, useNavigate } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Edit } from 'lucide-react';
import { toast, useToast } from '@/hooks/use-toast';
import { API_BASE_URL } from '../config/env';
import UserDocuments from '@/components/UserDocuments';
import UploadUserDocumentModal from '@/components/UploadUserDocumentModal';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';

const CustomAddition = () => {
    const { token } = useAuth();
    const { toast } = useToast();
    const { id } = useParams<{ id: string }>();
    const [customFields, setCustomFields] = useState<Record<string, string>>({
        rate: "",
        srNumber: "",
    });
    const authHeaders = {
        ...(token
            ? {
                Authorization: `Bearer ${token}`,
                "x-service-user": token,
            }
            : {}),
    };

    const navigate = useNavigate()

    const [newFieldName, setNewFieldName] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    const FIELD_LABELS: Record<string, string> = {
        rate: "Rate",
        srNumber: "SR Number",
    };

    function formatFieldLabel(key: string) {
        if (FIELD_LABELS[key]) {
            return FIELD_LABELS[key];
        }

        return key
            .replace(/([a-z])([A-Z])/g, "$1 $2")
            .replace(/_/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase());
    }
    const fetchTimesheet = async () => {
        try {
            if (!id) return;
            const response = await fetch(
                `${API_BASE_URL}/admin/timesheets/${id}`,
                {
                    headers: authHeaders,
                }
            );

            if (!response.ok) {
                throw new Error("Failed to load timesheet");
            }

            const data = await response.json();

            setCustomFields({
                rate: data.custom?.rate || "",
                srNumber: data.custom?.srNumber || "",
                ...(data.custom || {}),
            });
        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => {

        if (id && token) {
            fetchTimesheet();
        }
    }, [id, token]);

    if (!id) {
        return (
            <div className="p-6">
                Invalid timesheet id
            </div>
        );
    }
    const addCustomField = () => {
        const key = normalizeFieldKey(newFieldName);
        if (!key) return;

        if (customFields[key] !== undefined) {
            toast({
                title: "Field already exists",
                description: `${key} already exists`,
                variant: "destructive",
            });
            return;
        }

        setCustomFields((prev) => ({
            ...prev,
            [key]: "",
        }));

        setNewFieldName("");
    };

    const updateCustomField = (
        key: string,
        value: string
    ) => {
        setCustomFields((prev) => ({
            ...prev,
            [key]: value,
        }));
    };

    const removeCustomField = (
        key: string
    ) => {
        if (
            key === "rate" ||
            key === "srNumber"
        ) {
            return;
        }

        setCustomFields((prev) => {
            const copy = { ...prev };

            delete copy[key];

            return copy;
        });
    };
    function normalizeFieldKey(label: string) {
        const words = label.trim().split(/\s+/);

        return words
            .map((word, index) =>
                index === 0
                    ? word.toLowerCase()
                    : word.charAt(0).toUpperCase() +
                    word.slice(1).toLowerCase()
            )
            .join("");
    }
    const saveCustomFields = async () => {
        try {
            setIsSaving(true);

            const response = await fetch(
                `${API_BASE_URL}/admin/timesheets/${id}`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        ...authHeaders,
                    },
                    body: JSON.stringify({
                        custom: customFields,
                    }),
                }
            );

            if (!response.ok) {
                throw new Error(
                    "Failed to update timesheet"
                );
            }

            toast({
                title: "Success",
                description:
                    "Custom fields updated successfully",
            });
        } catch (error) {
            toast({
                title: "Error",
                description:
                    error instanceof Error
                        ? error.message
                        : "Failed to update",
                variant: "destructive",
            });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <AdminLayout>
            <Card className="border-0 shadow-lg">
                <CardHeader>
                    <CardTitle className="text-[#000009]">
                        Custom Fields
                    </CardTitle>

                    <CardDescription>
                        Manage timesheet custom fields
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">

                    {Object.entries(customFields).map(
                        ([key, value]) => (
                            <div
                                key={key}
                                className="flex gap-2 items-center"
                            >
                                <div className="w-48 font-medium">
                                    {formatFieldLabel(key)}
                                </div>

                                <Input
                                    value={value}
                                    onChange={(e) =>
                                        updateCustomField(
                                            key,
                                            e.target.value
                                        )
                                    }
                                    placeholder={`Enter ${key}`}
                                />

                                {key !== "rate" &&
                                    key !== "srRate" && (
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            onClick={() =>
                                                removeCustomField(key)
                                            }
                                        >
                                            Remove
                                        </Button>
                                    )}
                            </div>
                        )
                    )}

                    <div className="border-t pt-4 mt-4">
                        <div className="flex gap-2">

                            <Input
                                value={newFieldName}
                                placeholder="New field name"
                                onChange={(e) =>
                                    setNewFieldName(
                                        e.target.value
                                    )
                                }
                            />

                            <Button
                                type="button"
                                onClick={addCustomField}
                            >
                                Add Field
                            </Button>
                        </div>
                    </div>

                    <div className="pt-4">
                        <Button
                            onClick={saveCustomFields}
                            disabled={isSaving}
                            className="bg-[#712B71] hover:bg-[#712B71]/90"
                        >
                            {isSaving
                                ? "Saving..."
                                : "Save Changes"}
                        </Button>
                    </div>

                </CardContent>
            </Card>
        </AdminLayout>
    );

}

export default CustomAddition;