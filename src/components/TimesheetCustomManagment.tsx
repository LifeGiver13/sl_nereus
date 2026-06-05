import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { TimesheetCustomField, useTimesheetCustomFields } from '@/contexts/TimesheetContext';

const TimesheetCustomManagement = () => {
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [newField, setNewField] = useState({
        fieldName: "",
        fieldType: "text",
        isRequired: false,
        displayOrder: 0,
    });
    const [editingField, setEditingField] = useState<TimesheetCustomField | null>(null);
    const { toast } = useToast();
    const {
        customFields,
        loading,
        createCustomField,
        updateCustomField,
        deleteCustomField,
        fetchCustomFields,
    } = useTimesheetCustomFields();

    useEffect(() => {
        fetchCustomFields();
    }, []);

    const handleCreateField = async () => {
        try {
            await createCustomField({
                fieldName: newField.fieldName,
                fieldType: newField.fieldType,
                isRequired: newField.isRequired,
                displayOrder: newField.displayOrder,
            });
            toast({ title: "Success", description: "Custom field created successfully" });
            setNewField({ fieldName: "", fieldType: "text", isRequired: false, displayOrder: 0 });
            setIsCreateDialogOpen(false);
        } catch {
            toast({ title: "Error", description: "Failed to create custom field, Field Already exist", variant: "destructive" });
        }
    };

    const handleUpdateField = async () => {
        if (!editingField) return;
        try {
            await updateCustomField(editingField.id, {
                fieldName: editingField.fieldName,
                fieldType: editingField.fieldType,
                isRequired: editingField.isRequired,
                displayOrder: editingField.displayOrder,
            });
            toast({ title: "Success", description: "Custom field updated successfully" });
            setEditingField(null);
        } catch {
            toast({ title: "Error", description: "Failed to update custom field. Field Already Exist", variant: "destructive" });
        }
    };

    const handleDeleteField = async (id: number, fieldName: string) => {
        try {
            await deleteCustomField(id);
            toast({ title: "Success", description: `${fieldName} deleted successfully` });
        } catch {
            toast({ title: "Error", description: "Failed to delete custom field, Please check your internet connection", variant: "destructive" });
        }
    };

    return (
        <div className="space-y-4">

            {/*   Create button above the table */}
            <div className="flex justify-end">
                <Button onClick={() => setIsCreateDialogOpen((prev) => !prev)}>
                    {isCreateDialogOpen ? "Cancel" : "+ Add Custom Field"}
                </Button>
            </div>

            {/*   Create form - only shown when toggled open */}
            {isCreateDialogOpen && (
                <div className="border rounded-md p-4 space-y-3">
                    <h3 className="font-semibold text-sm">New Custom Field</h3>

                    <div className="space-y-1">
                        <label className="text-sm">Field Name</label>
                        <Input
                            placeholder="e.g. Project Code"
                            value={newField.fieldName}
                            onChange={(e) => setNewField((prev) => ({ ...prev, fieldName: e.target.value }))}
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm">Field Type</label>
                        <select
                            className="w-full border rounded-md px-3 py-2 text-sm"
                            value={newField.fieldType}
                            onChange={(e) => setNewField((prev) => ({ ...prev, fieldType: e.target.value }))}
                        >
                            <option value="text">Text</option>
                            <option value="number">Number</option>
                            <option value="date">Date</option>
                            <option value="email">Email</option>
                        </select>
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm">Display Order</label>
                        <Input
                            type="number"
                            value={newField.displayOrder}
                            onChange={(e) => setNewField((prev) => ({ ...prev, displayOrder: Number(e.target.value) }))}
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            id="isRequired"
                            type="checkbox"
                            checked={newField.isRequired}
                            onChange={(e) => setNewField((prev) => ({ ...prev, isRequired: e.target.checked }))}
                        />
                        <label htmlFor="isRequired" className="text-sm">Required field</label>
                    </div>

                    <Button onClick={handleCreateField} disabled={!newField.fieldName.trim()}>
                        Create Field
                    </Button>
                </div>
            )}

            {/*   Edit form - only shown when a field is being edited */}
            {editingField && (
                <div className="border rounded-md p-4 space-y-3 bg-muted/30">
                    <h3 className="font-semibold text-sm">Edit Field</h3>

                    <div className="space-y-1">
                        <label className="text-sm">Field Name</label>
                        <Input
                            value={editingField.fieldName}
                            onChange={(e) => setEditingField((prev) => prev ? { ...prev, fieldName: e.target.value } : null)}
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm">Field Type</label>
                        <select
                            className="w-full border rounded-md px-3 py-2 text-sm"
                            value={editingField.fieldType}
                            onChange={(e) => setEditingField((prev) => prev ? { ...prev, fieldType: e.target.value } : null)}
                        >
                            <option value="text">Text</option>
                            <option value="number">Number</option>
                            <option value="date">Date</option>
                            <option value="email">Email</option>
                        </select>
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm">Display Order</label>
                        <Input
                            type="number"
                            value={editingField.displayOrder}
                            onChange={(e) => setEditingField((prev) => prev ? { ...prev, displayOrder: Number(e.target.value) } : null)}
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            id="editIsRequired"
                            type="checkbox"
                            checked={editingField.isRequired}
                            onChange={(e) => setEditingField((prev) => prev ? { ...prev, isRequired: e.target.checked } : null)}
                        />
                        <label htmlFor="editIsRequired" className="text-sm">Required field</label>
                    </div>

                    <div className="flex gap-2">
                        <Button onClick={handleUpdateField}>Save Changes</Button>
                        <Button variant="outline" onClick={() => setEditingField(null)}>Cancel</Button>
                    </div>
                </div>
            )}

            {/* Table */}
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Required</TableHead>
                        <TableHead>Order</TableHead>
                        <TableHead>Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {loading ? (
                        <TableRow>
                            <TableCell colSpan={5} className="text-center text-muted-foreground">
                                Loading...
                            </TableCell>
                        </TableRow>
                    ) : customFields.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={5} className="text-center text-muted-foreground">
                                No custom fields yet.
                            </TableCell>
                        </TableRow>
                    ) : (
                        customFields.map((field) => (
                            <TableRow key={field.id}>
                                <TableCell>{field.fieldName}</TableCell>
                                <TableCell>{field.fieldType}</TableCell>
                                <TableCell>
                                    {/*   Badge styled by required status */}
                                    <Badge variant={field.isRequired ? "default" : "secondary"}>
                                        {field.isRequired ? "Required" : "Optional"}
                                    </Badge>
                                </TableCell>
                                <TableCell>{field.displayOrder}</TableCell>
                                <TableCell>
                                    <div className="flex gap-2">
                                        <Button size="sm" variant="outline" onClick={() => setEditingField(field)}>
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button size="sm" variant="outline" onClick={() => handleDeleteField(field.id, field.fieldName)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    );
};

export default TimesheetCustomManagement;