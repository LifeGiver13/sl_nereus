import React, { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { API_BASE_URL } from "../config/env";
import { useTimesheetCustomFields } from "@/contexts/TimesheetContext";
import { ActivityIcon } from "lucide-react";

const LEGACY_KEYS = new Set(["rate", "srNumber", "srRate"]);

interface LocalField {
    key: string;
    label: string;
    value: string;
}

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

interface Props {
    timesheetId: number;
    authHeaders: Record<string, string>;
}

const CustomAddition: React.FC<Props> = ({ timesheetId, authHeaders }) => {
    const { toast } = useToast();
    const { customFields, fetchCustomFields } = useTimesheetCustomFields();

    const [fieldValues, setFieldValues] = useState<Record<number, string>>({});
    const [localFields, setLocalFields] = useState<LocalField[]>([]);
    const [newFieldName, setNewFieldName] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        fetchCustomFields();
    }, []);

    useEffect(() => {
        if (customFields.length === 0) return;
        fetchTimesheet();
    }, [customFields]);

    const fetchTimesheet = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/admin/timesheets/${timesheetId}`, {
                headers: authHeaders,
            });
            if (!response.ok) throw new Error("Failed to load timesheet");
            const data = await response.json();
            const savedCustom: Record<string, string> = data.custom || {};

            const populated: Record<number, string> = {};
            const knownNormalizedKeys = new Set<string>();

            for (const field of customFields) {
                const normalizedKey = normalizeFieldKey(field.fieldName);
                populated[field.id] = savedCustom[normalizedKey] ?? "";
                knownNormalizedKeys.add(normalizedKey);
            }

            setFieldValues(populated);

            const restored: LocalField[] = [];
            for (const [key, value] of Object.entries(savedCustom)) {
                if (!knownNormalizedKeys.has(key) && !LEGACY_KEYS.has(key)) {
                    restored.push({ key, label: key, value: String(value) });
                }
            }
            setLocalFields(restored);
            setIsLoaded(true);
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to load custom fields",
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

        setLocalFields((prev) => [...prev, { key, label: newFieldName, value: "" }]);
        setNewFieldName("");
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

            for (const field of customFields) {
                const value = fieldValues[field.id] ?? "";
                if (value.trim() || field.isRequired) {
                    customPayload[normalizeFieldKey(field.fieldName)] = value;
                }
            }
            for (const field of localFields) {
                if (field.value.trim()) {
                    customPayload[field.key] = field.value;
                }
            }

            const response = await fetch(`${API_BASE_URL}/admin/timesheets/${timesheetId}`, {
                method: "PUT",
                headers: authHeaders,
                body: JSON.stringify({ custom: customPayload }),
            });

            if (!response.ok) throw new Error("Failed to update");
            toast({ title: "Saved", description: "Custom fields updated" });
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

    if (!isLoaded) return (
        <div className="mt-2 rounded-md border bg-white p-3 text-xs text-gray-500 flex items-center gap-2">
            <ActivityIcon className="h-3 w-3 animate-spin" />
            Loading custom fields...
        </div>
    );

    if (customFields.length === 0 && localFields.length === 0) return null;

    return (
        <div className="mt-2 rounded-md border bg-white p-3 text-xs text-gray-700 space-y-2">
            <p className="font-semibold text-sm text-[#000009]">Custom Fields</p>

            {customFields
                .slice()
                .sort((a, b) => a.displayOrder - b.displayOrder)
                .map((field) => (
                    <div key={field.id} className="flex items-center gap-2">
                        <span className="w-40 font-medium shrink-0">
                            {field.fieldName}
                            {field.isRequired && <span className="text-red-500 ml-1">*</span>}
                        </span>
                        <Input
                            className="h-7 text-xs"
                            type={
                                field.fieldType === "number" ? "number"
                                    : field.fieldType === "date" ? "date"
                                        : "text"
                            }
                            value={fieldValues[field.id] ?? ""}
                            onChange={(e) =>
                                setFieldValues((prev) => ({ ...prev, [field.id]: e.target.value }))
                            }
                            placeholder={`${field.fieldName}${field.isRequired ? " (required)" : ""}`}
                        />
                    </div>
                ))}

            {localFields.map((field) => (
                <div key={field.key} className="flex items-center gap-2">
                    <span className="w-40 font-medium shrink-0">{field.label}</span>
                    <Input
                        className="h-7 text-xs"
                        value={field.value}
                        onChange={(e) =>
                            setLocalFields((prev) =>
                                prev.map((f) => (f.key === field.key ? { ...f, value: e.target.value } : f))
                            )
                        }
                        placeholder={`Enter ${field.label}`}
                    />
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 h-7 px-2 text-xs"
                        onClick={() => setLocalFields((prev) => prev.filter((f) => f.key !== field.key))}
                    >
                        Remove
                    </Button>
                </div>
            ))}

            {/* Add new local field */}
            <div className="flex gap-2 pt-1 border-t">
                <Input
                    className="h-7 text-xs"
                    value={newFieldName}
                    placeholder="New field name"
                    onChange={(e) => setNewFieldName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addLocalField()}
                />
                <Button
                    type="button"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={addLocalField}
                    disabled={!newFieldName.trim()}
                >
                    Add
                </Button>
            </div>

            <div className="pt-1">
                <Button
                    size="sm"
                    className="h-7 text-xs bg-[#712B71] hover:bg-[#712B71]/90"
                    onClick={saveCustomFields}
                    disabled={isSaving}
                >
                    {isSaving ? "Saving..." : "Save Custom Fields"}
                </Button>
            </div>
        </div>
    );
};

export default CustomAddition;