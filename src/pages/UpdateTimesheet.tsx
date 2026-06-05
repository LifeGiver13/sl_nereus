import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { API_BASE_URL } from '../config/env';
import { useAuth } from '@/contexts/AuthContext';
import { useTimesheetCustomFields } from '@/contexts/TimesheetContext';

//   Old hardcoded keys to ignore when restoring from saved data
const LEGACY_KEYS = new Set(["rate", "srNumber", "srRate"]);

interface LocalField {
    key: string;
    label: string;
    value: string;
}

// "SR Number" to "srNumber", "Site Visit Date" to "siteVisitDate"
function normalizeFieldKey(label: string): string {
    const words = label.trim().split(/\s+/);
    return words
        .map((word, index) =>
            index === 0
                ? word.toLowerCase()
                : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        )
        .join("");
}

const CustomAddition = () => {
    const { token } = useAuth();
    const { toast } = useToast();
    const { id } = useParams<{ id: string }>();

    const [fieldValues, setFieldValues] = useState<Record<number, string>>({});
    const [localFields, setLocalFields] = useState<LocalField[]>([]);
    const [newFieldName, setNewFieldName] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    const { customFields, fetchCustomFields } = useTimesheetCustomFields();

    const authHeaders = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}`, "x-service-user": token } : {}),
    };

    useEffect(() => {
        fetchCustomFields();
    }, []);

    useEffect(() => {
        if (!id || !token || customFields.length === 0) return;
        fetchTimesheet();
    }, [id, token, customFields]);

    const fetchTimesheet = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/admin/timesheets/${id}`, {
                headers: authHeaders,
            });

            if (!response.ok) throw new Error("Failed to load timesheet");

            const data = await response.json();
            const savedCustom: Record<string, string> = data.custom || {};

            // Populate API-defined fields
            //   Normalize each fieldName to match how it was saved
            const populated: Record<number, string> = {};
            const knownNormalizedKeys = new Set<string>();

            for (const field of customFields) {
                const normalizedKey = normalizeFieldKey(field.fieldName);
                populated[field.id] = savedCustom[normalizedKey] ?? "";
                knownNormalizedKeys.add(normalizedKey);
            }

            setFieldValues(populated);

            // Restore local fields - skip legacy keys and known API keys
            const restored: LocalField[] = [];
            for (const [key, value] of Object.entries(savedCustom)) {
                if (!knownNormalizedKeys.has(key) && !LEGACY_KEYS.has(key)) {
                    restored.push({ key, label: key, value: String(value) });
                }
            }
            setLocalFields(restored);

        } catch (error) {
            console.error("[fetchTimesheet]", error);
            toast({
                title: "Error",
                description: "Failed to load timesheet data",
                variant: "destructive",
            });
        }
    };

    const addLocalField = () => {
        const key = normalizeFieldKey(newFieldName);
        if (!key) return;

        const alreadyExists =
            customFields.some((f) => normalizeFieldKey(f.fieldName) === key) ||
            localFields.some((f) => f.key === key);

        if (alreadyExists) {
            toast({
                title: "Field already exists",
                description: `"${newFieldName}" already exists`,
                variant: "destructive",
            });
            return;
        }

        //   Store the normalized key but keep the original label for display
        setLocalFields((prev) => [...prev, { key, label: newFieldName, value: "" }]);
        setNewFieldName("");
    };

    const updateLocalField = (key: string, value: string) => {
        setLocalFields((prev) =>
            prev.map((f) => (f.key === key ? { ...f, value } : f))
        );
    };

    const removeLocalField = (key: string) => {
        setLocalFields((prev) => prev.filter((f) => f.key !== key));
    };

    const updateFieldValue = (fieldId: number, value: string) => {
        setFieldValues((prev) => ({ ...prev, [fieldId]: value }));
    };

    const saveCustomFields = async () => {
        const missingFields: string[] = [];

        for (const field of customFields) {
            const value = fieldValues[field.id] ?? "";
            if (field.isRequired && !value.trim()) {
                missingFields.push(field.fieldName);
            }
        }

        if (missingFields.length > 0) {
            toast({
                title: "Missing required fields",
                description: `Please fill in: ${missingFields.join(", ")}`,
                variant: "destructive",
            });
            return;
        }

        try {
            setIsSaving(true);

            const customPayload: Record<string, string> = {};

            // API-defined fields — normalize fieldName as the key
            for (const field of customFields) {
                const value = fieldValues[field.id] ?? "";
                if (value.trim() || field.isRequired) {
                    customPayload[normalizeFieldKey(field.fieldName)] = value;
                }
            }

            //  Local fields — key is already normalized from addLocalField
            for (const field of localFields) {
                if (field.value.trim()) {
                    customPayload[field.key] = field.value;
                }
            }

            const response = await fetch(`${API_BASE_URL}/admin/timesheets/${id}`, {
                method: "PUT",
                headers: authHeaders,
                body: JSON.stringify({ custom: customPayload }),
            });

            if (!response.ok) throw new Error("Failed to update, check your internet connection");

            toast({ title: "Success", description: "Custom fields updated successfully" });
        } catch (error) {
            toast({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to update",
                variant: "destructive",
            });
        } finally {
            setIsSaving(false);
        }
    };

    if (!id) return <div className="p-6">Invalid timesheet id</div>;

    return (
        <AdminLayout>
            <Card className="border-0 shadow-lg">
                <CardHeader>
                    <CardTitle className="text-[#000009]">Custom Fields</CardTitle>
                    <CardDescription>Manage timesheet custom fields</CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">

                    {/* API-defined fields */}
                    {customFields
                        .slice()
                        .sort((a, b) => a.displayOrder - b.displayOrder)
                        .map((field) => (
                            <div key={field.id} className="flex gap-2 items-center">
                                <div className="w-48 font-medium">
                                    {field.fieldName}
                                    {field.isRequired && <span className="text-red-500 ml-1">*</span>}
                                </div>
                                <Input
                                    type={
                                        field.fieldType === "number" ? "number"
                                        : field.fieldType === "date" ? "date"
                                        : "text"
                                    }
                                    value={fieldValues[field.id] ?? ""}
                                    onChange={(e) => updateFieldValue(field.id, e.target.value)}
                                    placeholder={`Enter ${field.fieldName}${field.isRequired ? " (required)" : ""}`}
                                />
                            </div>
                        ))}

                    {/* Manually added local fields */}
                    {localFields.map((field) => (
                        <div key={field.key} className="flex gap-2 items-center">
                            <div className="w-48 font-medium">{field.label}</div>
                            <Input
                                value={field.value}
                                onChange={(e) => updateLocalField(field.key, e.target.value)}
                                placeholder={`Enter ${field.label}`}
                            />
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => removeLocalField(field.key)}
                            >
                                Remove
                            </Button>
                        </div>
                    ))}

                    {customFields.length === 0 && localFields.length === 0 && (
                        <p className="text-sm text-muted-foreground">
                            No custom fields configured. Add some in Settings or below.
                        </p>
                    )}

                    {/* Add field section */}
                    <div className="border-t pt-4 mt-4 flex gap-2">
                        <Input
                            value={newFieldName}
                            placeholder="New field name"
                            onChange={(e) => setNewFieldName(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && addLocalField()}
                        />
                        <Button type="button" onClick={addLocalField} disabled={!newFieldName.trim()}>
                            Add Field
                        </Button>
                    </div>

                    <div className="pt-4">
                        <Button
                            onClick={saveCustomFields}
                            disabled={isSaving}
                            className="bg-[#712B71] hover:bg-[#712B71]/90"
                        >
                            {isSaving ? "Saving..." : "Save Changes"}
                        </Button>
                    </div>

                </CardContent>
            </Card>
        </AdminLayout>
    );
};

export default CustomAddition;