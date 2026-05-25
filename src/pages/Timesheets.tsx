import React, { useCallback, useEffect, useMemo, useState } from "react";
import AdminLayout from "../components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { API_BASE_URL } from "../config/env";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import RejecteTimesheetModal from "@/components/RejectTimesheetModal";


type TimesheetStatus = "draft" | "pending" | "approved" | "rejected";

type TimesheetEntry = {
  date: string;
  startTime: string;
  endTime: string;
  break: number;
};

type TimesheetMeta = {
  signature?: string;
  signedAt?: string;
  signedBy?: string;
  signerName?: string;

  managerRole?: string;
  managerNote?: string;

  infoVerified?: boolean;
  certificationReason?: string;

  rejectionReason?: string;
  rejectedAt?: string;
};

type Timesheet = {
  id: number;
  userId: number;
  clientId: number;
  positionId: number;
  startDate: string;
  endDate: string;
  status: TimesheetStatus;
  entries: TimesheetEntry[];
  meta?: TimesheetMeta;
  user?: { id: number; username?: string; profile?: { firstName?: string; surname?: string } };
  client?: { id: number; name?: string };
  position?: { id: number; title?: string };
};

type AdminTimesheetListResponse = {
  total: number;
  limit: number;
  offset: number;
  results: Timesheet[];
};

const statusClasses: Record<TimesheetStatus, string> = {
  draft: "bg-gray-200 text-gray-800",
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

const dayFormatter = new Intl.DateTimeFormat(undefined, { weekday: "short" });

function formatDate(value: string) {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "-" : d.toLocaleDateString();
}

function getDisplayName(row: Timesheet) {
  const firstName = row.user?.profile?.firstName ?? "";
  const surname = row.user?.profile?.surname ?? "";
  const fullName = `${firstName} ${surname}`.trim();
  if (fullName) return fullName;
  return row.user?.username || `User #${row.userId}`;
}

function calculateEntryHours(entry: TimesheetEntry): number {
  if (!entry || typeof entry.startTime !== "string" || typeof entry.endTime !== "string") {
    return 0;
  }
  const [startHour, startMinute] = entry.startTime.split(":").map(Number);
  const [endHour, endMinute] = entry.endTime.split(":").map(Number);
  if ([startHour, startMinute, endHour, endMinute].some((v) => Number.isNaN(v))) return 0;
  const startMinutes = startHour * 60 + startMinute;
  const endMinutes = endHour * 60 + endMinute;
  const breakMinutes = typeof entry.break === "number" && !Number.isNaN(entry.break) ? entry.break : 0;
  const rawMinutes = endMinutes - startMinutes - breakMinutes;
  return Math.max(rawMinutes, 0) / 60;
}

function calculateTotalHours(timesheet: Timesheet): number {
  if (!Array.isArray(timesheet.entries)) return 0;
  return timesheet.entries.reduce((sum, entry) => sum + calculateEntryHours(entry as TimesheetEntry), 0);
}

function getSignerLabel(timesheet: Timesheet): string {
  if (timesheet.meta?.signerName) {
    const role = timesheet.meta.managerRole ? ` (${timesheet.meta.managerRole})` : "";
    return `${timesheet.meta.signerName}${role}`;
  }
  if (timesheet.meta?.signerName) {
    return `${timesheet.meta.signedBy} (self-certified)`;
  }
  return "Not provided";
}

const Timesheets = () => {
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [totalTimesheets, setTotalTimesheets] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [userFilter, setUserFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [sortBy, setSortBy] = useState<"period" | "client">("period");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [date, setDate] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [expandedTimesheetId, setExpandedTimesheetId] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkStatus, setBulkStatus] = useState<TimesheetStatus | "none">("none");
  const [signaturePreview, setSignaturePreview] = useState<{ url: string; label: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [rejectModalOpen, setRejectModalOpen] = useState(false)
  const [selectedRejectId, setSelectedRejectedId] = useState<number | null>(null)


  const { token } = useAuth();
  const { toast } = useToast();

  const authHeaders = useMemo(
    () => ({
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}`, "x-service-user": token } : {}),
    }),
    [token]
  );

  const fetchTimesheets = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        limit: String(pageSize),
        offset: String((page - 1) * pageSize),
        sortBy,
        sortDir,
        ...(statusFilter !== "all" ? { status: statusFilter } : {}),
      });
      const response = await fetch(`${API_BASE_URL}/admin/timesheets?${params.toString()}`, {
        method: "GET",
        headers: authHeaders,
      });

      if (!response.ok) {
        throw new Error("Failed to fetch timesheets");
      }

      const data = (await response.json()) as AdminTimesheetListResponse | Timesheet[] | { rows?: Timesheet[]; count?: number };
      const results = Array.isArray(data)
        ? data
        : Array.isArray((data as AdminTimesheetListResponse).results)
          ? (data as AdminTimesheetListResponse).results
          : Array.isArray((data as { rows?: Timesheet[] }).rows)
            ? (data as { rows?: Timesheet[] }).rows || []
            : [];
      const total = Array.isArray(data)
        ? data.length
        : typeof (data as AdminTimesheetListResponse).total === "number"
          ? (data as AdminTimesheetListResponse).total
          : typeof (data as { count?: number }).count === "number"
            ? (data as { count?: number }).count || 0
            : results.length;
      setTimesheets(results);
      setTotalTimesheets(total);
      setSelectedIds([]);
      setExpandedTimesheetId(null);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Could not load timesheets",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [authHeaders, toast, pageSize, page, sortBy, sortDir, statusFilter]);

  useEffect(() => {
    if (token) {
      fetchTimesheets();
    }
  }, [token, fetchTimesheets]);


  function parseLocalDate(dateStr: string) {
    const d = new Date(dateStr);

    return new Date(
      d.getFullYear(),
      d.getMonth(),
      d.getDate()
    );
  }

  const selectedWeek = useMemo(() => {
    if (!date) return null;

    const { monday, sunday } = getWeekRange(date);

    return {
      monday: monday.toLocaleDateString(),
      sunday: sunday.toLocaleDateString(),
    };
  }, [date]);



  const filtered = useMemo(() => {
    return timesheets.filter((row) => {
      const userTerm = userFilter.trim().toLowerCase();
      const matchesUser =
        !userTerm ||
        String(row.userId).includes(userTerm) ||
        getDisplayName(row).toLowerCase().includes(userTerm);

      let matchesWeek = true;

      if (date) {
        const { monday, sunday } = getWeekRange(date);

        const rowStart = parseLocalDate(row.startDate);
        const rowEnd = parseLocalDate(row.endDate);


        // normalize times
        monday.setHours(0, 0, 0, 0);
        sunday.setHours(23, 59, 59, 999);
        rowStart.setHours(0, 0, 0, 0);
        rowEnd.setHours(23, 59, 59, 999);

        // overlap check
        matchesWeek =
          rowStart <= sunday &&
          rowEnd >= monday;

        console.log({
          selected: date,
          monday,
          sunday,
          rowStart,
          rowEnd,
          matchesWeek,
        });
      }




      return matchesUser && matchesWeek;


    });
  }, [timesheets, userFilter, date]);

  const totalPages = Math.max(1, Math.ceil(totalTimesheets / pageSize));
  const allVisibleSelected = filtered.length > 0 && filtered.every((row) => selectedIds.includes(row.id));

  const updateStatus = async (timesheetId: number, status: TimesheetStatus, rejectionReason?: string) => {
    try {
      setIsSaving(true);
      const response = await fetch(`${API_BASE_URL}/admin/timesheets/${timesheetId}`, {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify({ status, rejectionReason }),
      });
      if (!response.ok) {
        throw new Error("Failed to update timesheet status");
      }
      await fetchTimesheets();
      toast({ title: "Updated", description: `Timesheet #${timesheetId} marked ${status}` });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Update failed",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const deleteTimesheet = async (timesheetId: number) => {
    const confirmed = window.confirm(`Delete timesheet #${timesheetId}?`);
    if (!confirmed) return;

    try {
      setIsSaving(true);
      const response = await fetch(`${API_BASE_URL}/admin/timesheets/${timesheetId}`, {
        method: "DELETE",
        headers: authHeaders,
      });
      if (!response.ok) {
        throw new Error("Failed to delete timesheet");
      }
      if (expandedTimesheetId === timesheetId) {
        setExpandedTimesheetId(null);
      }
      await fetchTimesheets();
      toast({ title: "Deleted", description: `Timesheet #${timesheetId} removed` });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Delete failed",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const toggleSelectRow = (id: number, checked: boolean) => {
    setSelectedIds((prev) => (checked ? Array.from(new Set([...prev, id])) : prev.filter((x) => x !== id)));
  };

  const toggleSelectAllVisible = (checked: boolean) => {
    if (!checked) {
      setSelectedIds((prev) => prev.filter((id) => !filtered.some((row) => row.id === id)));
      return;
    }
    setSelectedIds((prev) => Array.from(new Set([...prev, ...filtered.map((row) => row.id)])));
  };

  const runBulkStatusUpdate = async () => {
    if (bulkStatus === "none" || selectedIds.length === 0) return;
    try {
      setIsSaving(true);
      const response = await fetch(`${API_BASE_URL}/admin/timesheets/bulk-status`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ ids: selectedIds, status: bulkStatus }),
      });
      if (!response.ok) {
        throw new Error("Failed to bulk update timesheets");
      }
      toast({
        title: "Updated",
        description: `${selectedIds.length} timesheet(s) marked ${bulkStatus}`,
      });
      await fetchTimesheets();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Bulk update failed",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  function getWeekRange(selectedDate: string) {
    const current = parseLocalDate(selectedDate);
    // get day index
    // sunday = 0
    // monday = 1
    const day = current.getDay();

    // convert sunday handling
    const diffToMonday = day === 0 ? -6 : 1 - day;

    // monday
    const monday = new Date(current);
    monday.setDate(current.getDate() + diffToMonday);

    // sunday
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    return {
      monday,
      sunday,
    };
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-[#000009]">Timesheets</h1>
          <p className="text-gray-600 mt-1">View and manage candidate timesheets</p>
        </div>

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-[#000009]">Filters</CardTitle>
            <CardDescription>Refine by user name/id , date and status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <Input
                placeholder="Filter by user name or ID"
                value={userFilter}
                onChange={(e) => setUserFilter(e.target.value)}
              />
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={(v) => { setSortBy(v as "period" | "client"); setPage(1); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="period">Sort: Period</SelectItem>
                  <SelectItem value="client">Sort: Client</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortDir} onValueChange={(v) => { setSortDir(v as "asc" | "desc"); setPage(1); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Direction" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">Descending</SelectItem>
                  <SelectItem value="asc">Ascending</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex flex-col gap-1">
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => {
                    setDate(e.target.value);
                    setPage(1);
                  }}
                />

                {selectedWeek && (
                  <p className="text-xs text-gray-500">
                    Week: {selectedWeek.monday} → {selectedWeek.sunday}
                  </p>
                )}
              </div>

              <Button
                variant="outline"
                onClick={() => {
                  setUserFilter("");
                  setStatusFilter("pending");
                  setSortBy("period");
                  setSortDir("desc");
                  setPage(1);
                  setDate("")
                }}
              >
                Clear filters
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <Select value={bulkStatus} onValueChange={(v) => setBulkStatus(v as TimesheetStatus | "none")}>
                <SelectTrigger>
                  <SelectValue placeholder="Bulk status action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select status</SelectItem>
                  <SelectItem value="draft">Set Draft</SelectItem>
                  <SelectItem value="pending">Set Pending</SelectItem>
                  <SelectItem value="approved">Set Approved</SelectItem>
                  <SelectItem value="rejected">Set Rejected</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={runBulkStatusUpdate} disabled={bulkStatus === "none" || selectedIds.length === 0 || isSaving}>
                Apply to selected ({selectedIds.length})
              </Button>
              <Select
                value={String(pageSize)}
                onValueChange={(v) => {
                  setPageSize(Number(v));
                  setPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Rows per page" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="50">50 per page</SelectItem>
                  <SelectItem value="100">100 per page</SelectItem>
                  <SelectItem value="200">200 per page</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-[#000009]">Timesheet Records ({totalTimesheets})</CardTitle>
            <CardDescription>Approve, reject, inspect, or remove records</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-10 text-gray-500">Loading timesheets...</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-10 text-gray-500">No timesheets found</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={allVisibleSelected}
                        onCheckedChange={(checked) => toggleSelectAllVisible(Boolean(checked))}
                      />
                    </TableHead>
                    <TableHead>ID</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Hours</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((row) => {
                    const isExpanded = expandedTimesheetId === row.id;
                    const totalHours = calculateTotalHours(row);
                    const entryCount = Array.isArray(row.entries) ? row.entries.length : 0;
                    return (
                      <React.Fragment key={row.id}>
                        <TableRow className={isExpanded ? "text-sm bg-blue-50/60" : "text-sm"}>
                          <TableCell>
                            <Checkbox
                              checked={selectedIds.includes(row.id)}
                              onCheckedChange={(checked) => toggleSelectRow(row.id, Boolean(checked))}
                            />
                          </TableCell>
                          <TableCell className="font-medium">#{row.id}</TableCell>
                          <TableCell>{getDisplayName(row)}</TableCell>
                          <TableCell>{row.client?.name || `Client #${row.clientId}`}</TableCell>
                          <TableCell>{row.position?.title || `Position #${row.positionId}`}</TableCell>
                          <TableCell>
                            {formatDate(row.startDate)} - {formatDate(row.endDate)}
                          </TableCell>
                          <TableCell>{totalHours.toFixed(2)}h</TableCell>
                          <TableCell>
                            <Badge className={statusClasses[row.status]}>{row.status}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-end flex-wrap gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setExpandedTimesheetId(isExpanded ? null : row.id)}
                              >
                                {isExpanded ? <ChevronUp className="h-4 w-4 mr-1" /> : <ChevronDown className="h-4 w-4 mr-1" />}
                                {isExpanded ? "Hide" : "View"}
                              </Button>
                              {row.status !== "approved" && (
                                <Button
                                  size="sm"
                                  className="bg-green-700 hover:bg-green-800"
                                  onClick={() => updateStatus(row.id, "approved")}
                                  disabled={isSaving}
                                >
                                  Approve
                                </Button>
                              )}
                              {row.status !== "rejected" && (
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => {
                                    setSelectedRejectedId(row.id)
                                    setRejectModalOpen(true)
                                  }
                                  }
                                  disabled={isSaving}
                                >
                                  Reject
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 border-red-300 hover:bg-red-50"
                                onClick={() => deleteTimesheet(row.id)}
                                disabled={isSaving}
                              >
                                <Trash2 className="h-4 w-4 mr-1" />
                                Delete
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                        {isExpanded && (
                          <TableRow>
                            <TableCell colSpan={9} className="bg-blue-50/30 border-l-4 border-blue-300">
                              <div className="space-y-3 py-2">
                                <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-700">
                                  <span><strong>User:</strong> {getDisplayName(row)}</span>
                                  <span><strong>Client:</strong> {row.client?.name || `#${row.clientId}`}</span>
                                  <span><strong>Position:</strong> {row.position?.title || `#${row.positionId}`}</span>
                                  <span><strong>Entries:</strong> {entryCount}</span>
                                  <span><strong>Total:</strong> {totalHours.toFixed(2)}h</span>
                                </div>
                                <div className="grid gap-3 md:grid-cols-2">
                                  <div>
                                    {entryCount > 0 ? (
                                      <div className="rounded-md border bg-white w-full md:max-w-xl">
                                        <Table>
                                          <TableHeader>
                                            <TableRow>
                                              <TableHead className="h-8">Day / Date</TableHead>
                                              <TableHead className="h-8">Start</TableHead>
                                              <TableHead className="h-8">End</TableHead>
                                              <TableHead className="h-8">Break</TableHead>
                                              <TableHead className="h-8">Hours</TableHead>
                                            </TableRow>
                                          </TableHeader>
                                          <TableBody>
                                            {row.entries.map((entry, idx) => {
                                              const entryDate = new Date(entry.date);
                                              const day = Number.isNaN(entryDate.getTime()) ? "-" : dayFormatter.format(entryDate);
                                              const hours = calculateEntryHours(entry);
                                              return (
                                                <TableRow key={`${row.id}-entry-${idx}`} className="text-xs">
                                                  <TableCell className="py-1.5">{day}, {formatDate(entry.date)}</TableCell>
                                                  <TableCell className="py-1.5">{entry.startTime}</TableCell>
                                                  <TableCell className="py-1.5">{entry.endTime}</TableCell>
                                                  <TableCell className="py-1.5">{entry.break}m</TableCell>
                                                  <TableCell className="py-1.5">{hours.toFixed(2)}h</TableCell>
                                                </TableRow>
                                              );
                                            })}
                                          </TableBody>
                                        </Table>
                                      </div>
                                    ) : (
                                      <p className="text-xs text-gray-500">No entries added.</p>
                                    )}
                                  </div>
                                  <div className="rounded-md border bg-white p-3 text-xs space-y-2">
                                    <p className="font-semibold text-sm text-[#000009]">Signature Details</p>
                                    <p><strong>Signed by:</strong> {getSignerLabel(row)}</p>
                                    {row.meta?.signedAt && (
                                      <p><strong>Signed at:</strong> {new Date(row.meta.signedAt).toLocaleString()}</p>
                                    )}
                                    {typeof row.meta?.infoVerified === "boolean" && (
                                      <p>
                                        <strong>Info verified:</strong>{" "}
                                        {row.meta.infoVerified ? "Yes" : "No"}
                                      </p>
                                    )}

                                    {row.meta?.certificationReason && (
                                      <p>
                                        <strong>Certification reason:</strong>{" "}
                                        {row.meta.certificationReason}
                                      </p>
                                    )}

                                    {row.meta?.managerNote && (
                                      <p>
                                        <strong>Manager note:</strong>{" "}
                                        {row.meta.managerNote}
                                      </p>
                                    )}

                                    {row.meta?.rejectionReason && (
                                      <p className="text-red-600">
                                        <strong>Rejection reason:</strong>{" "}
                                        {row.meta.rejectionReason}
                                      </p>
                                    )}

                                    {row.meta?.rejectedAt && (
                                      <p className="text-red-500">
                                        <strong>Rejected at:</strong>{" "}
                                        {new Date(row.meta.rejectedAt).toLocaleString()}
                                      </p>
                                    )}
                                    {row.meta?.signature ? (
                                      <Button
                                        type="button"
                                        variant="link"
                                        className="h-auto p-0 text-blue-700"
                                        onClick={() =>
                                          setSignaturePreview({
                                            url: row.meta?.signature || "",
                                            label: `Timesheet #${row.id}`,
                                          })
                                        }
                                      >
                                        View signature
                                      </Button>
                                    ) : (
                                      <p><strong>Signature:</strong> Not uploaded</p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            )}
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-gray-600">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                  Previous
                </Button>
                <Button
                  variant="outline"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      <Dialog open={!!signaturePreview} onOpenChange={(open) => !open && setSignaturePreview(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Signature Preview {signaturePreview ? `- ${signaturePreview.label}` : ""}
            </DialogTitle>
          </DialogHeader>
          {signaturePreview && (
            <div className="rounded-md border bg-muted/20 p-2">
              <img
                src={signaturePreview.url}
                alt={`Signature for ${signaturePreview.label}`}
                className="mx-auto max-h-[70vh] w-auto rounded"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      <RejecteTimesheetModal
        open={rejectModalOpen}
        onClose={() => {
          setRejectModalOpen(false)
          setSelectedRejectedId(null)
        }}
        timesheetId={selectedRejectId}
        isLoading={isSaving}
        onConfirm={async (reason) => {
          if (!selectedRejectId) return;

          await updateStatus(
            selectedRejectId,
            'rejected',
            reason
          );
        }}


      />
    </AdminLayout>
  );
};

export default Timesheets;
