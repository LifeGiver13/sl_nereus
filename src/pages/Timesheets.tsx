import React, { useCallback, useEffect, useMemo, useState } from "react";
import AdminLayout from "../components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { API_BASE_URL } from "../config/env";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { ChevronDown, ChevronUp, Trash2, Download, Edit } from "lucide-react";
import RejecteTimesheetModal from "@/components/RejectTimesheetModal";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { usePreferences } from "@/hooks/usePreferences";
import { object } from "zod";
import { useNavigate } from "react-router-dom";

type TimesheetStatus = "draft" | "pending" | "approved" | "rejected" | "processing";

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
  approvedAt?: string;
  entries: TimesheetEntry[];
  meta?: TimesheetMeta;

  custom?: Record<string, any>;


  user?: { id: number; username?: string; profile?: { firstName?: string; surname?: string; fullName?: string; } };
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
  processing: "bg-blue-100 text-blue-800",
};

const dayFormatter = new Intl.DateTimeFormat(undefined, { weekday: "short" });

function formatDate(value: string) {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "-" : d.toLocaleDateString();
}

function getDisplayName(row: Timesheet) {
  const firstName = row.user?.profile?.firstName ?? "";
  const surname = row.user?.profile?.surname ?? "";
  const fullName = row.user?.profile?.fullName || `${firstName} ${surname}`.trim();
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

type CategoryHours = {
  standard: number;
  evening: number;
  weekend: number;
};

function getEntryInterval(entry: TimesheetEntry): { start: Date; end: Date; rawMinutes: number } | null {
  if (!entry?.date || typeof entry.startTime !== "string" || typeof entry.endTime !== "string") return null;

  const start = new Date(entry.date);
  const end = new Date(entry.date);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;

  const [startHour, startMinute] = entry.startTime.split(":").map(Number);
  const [endHour, endMinute] = entry.endTime.split(":").map(Number);
  if ([startHour, startMinute, endHour, endMinute].some((v) => Number.isNaN(v))) return null;

  start.setHours(startHour, startMinute, 0, 0);
  end.setHours(endHour, endMinute, 0, 0);
  if (end <= start) {
    end.setDate(end.getDate() + 1);
  }

  const rawMinutes = Math.max(0, (end.getTime() - start.getTime()) / 60000);
  return { start, end, rawMinutes };
}

function getCategoryMinutesForInterval(start: Date, end: Date): CategoryHours {
  const categoryMinutes: CategoryHours = { standard: 0, evening: 0, weekend: 0 };
  let cursor = new Date(start);

  while (cursor < end) {
    const dayStart = new Date(cursor);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const segmentEnd = end < dayEnd ? end : dayEnd;
    const segmentMinutes = Math.max(0, (segmentEnd.getTime() - cursor.getTime()) / 60000);
    const dayOfWeek = cursor.getDay(); // Sun=0 ... Sat=6

    if (dayOfWeek === 0 || dayOfWeek === 6) {
      categoryMinutes.weekend += segmentMinutes;
    } else {
      const standardStart = new Date(dayStart);
      standardStart.setHours(6, 0, 0, 0);
      const standardEnd = new Date(dayStart);
      standardEnd.setHours(20, 0, 0, 0);

      const overlapStart = cursor > standardStart ? cursor : standardStart;
      const overlapEnd = segmentEnd < standardEnd ? segmentEnd : standardEnd;
      const standardMinutes = overlapEnd > overlapStart ? (overlapEnd.getTime() - overlapStart.getTime()) / 60000 : 0;

      categoryMinutes.standard += standardMinutes;
      categoryMinutes.evening += Math.max(0, segmentMinutes - standardMinutes);
    }

    cursor = segmentEnd;
  }

  return categoryMinutes;
}

function calculateCategoryHours(timesheet: Timesheet): CategoryHours {
  if (!Array.isArray(timesheet.entries)) return { standard: 0, evening: 0, weekend: 0 };

  return timesheet.entries.reduce(
    (totals, entry) => {
      const interval = getEntryInterval(entry as TimesheetEntry);
      if (!interval || interval.rawMinutes <= 0) return totals;

      const breakMinutes = typeof entry.break === "number" && !Number.isNaN(entry.break) ? Math.max(entry.break, 0) : 0;
      const workedMinutes = Math.max(interval.rawMinutes - breakMinutes, 0);
      const ratio = interval.rawMinutes > 0 ? workedMinutes / interval.rawMinutes : 0;

      const rawByCategory = getCategoryMinutesForInterval(interval.start, interval.end);
      totals.standard += (rawByCategory.standard / 60) * ratio;
      totals.evening += (rawByCategory.evening / 60) * ratio;
      totals.weekend += (rawByCategory.weekend / 60) * ratio;
      return totals;
    },
    { standard: 0, evening: 0, weekend: 0 } as CategoryHours
  );
}

function formatCategoryHoursForDisplay(categoryHours: CategoryHours, totalHours: number) {
  const roundedTotal = Number(totalHours.toFixed(2));
  const roundedStandard = Number(categoryHours.standard.toFixed(2));
  const roundedEvening = Number(categoryHours.evening.toFixed(2));
  const roundedWeekend = Number(categoryHours.weekend.toFixed(2));

  const currentSum = roundedStandard + roundedEvening + roundedWeekend;
  const difference = Number((roundedTotal - currentSum).toFixed(2));

  if (difference === 0) {
    return {
      standard: roundedStandard,
      evening: roundedEvening,
      weekend: roundedWeekend,
    };
  }

  const largestKey =
    roundedStandard >= roundedEvening && roundedStandard >= roundedWeekend
      ? "standard"
      : roundedEvening >= roundedWeekend
        ? "evening"
        : "weekend";

  return {
    standard: largestKey === "standard" ? Number((roundedStandard + difference).toFixed(2)) : roundedStandard,
    evening: largestKey === "evening" ? Number((roundedEvening + difference).toFixed(2)) : roundedEvening,
    weekend: largestKey === "weekend" ? Number((roundedWeekend + difference).toFixed(2)) : roundedWeekend,
  };
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
  const [expandedTimesheetId, setExpandedTimesheetId] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkStatus, setBulkStatus] = useState<TimesheetStatus | "none">("none");
  const [isSaving, setIsSaving] = useState(false);

  const [approvedDate, setApprovedDate] = useState("");

  const { preferences, updateTablePreferences } = usePreferences();
  const pageSize = preferences.table.pageSize || 10;

  const [rejectModalOpen, setRejectModalOpen] = useState(false)
  const [selectedRejectId, setSelectedRejectedId] = useState<number | null>(null)

  const [dateFilterType, setDateFilterType] = useState<"period" | "approved">("period")


  const { token } = useAuth();
  const { toast } = useToast();

  const authHeaders = useMemo(
    () => ({
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}`, "x-service-user": token } : {}),
    }),
    [token]

  );

  const navigate = useNavigate()


  const splitName = (timesheet: Timesheet) => {
    const profile = timesheet.user?.profile;

    if (profile?.firstName || profile?.surname) {
      return {
        firstName: profile.firstName || "",
        lastName: profile.surname || "",
      };
    }

    const fullName = profile?.fullName || "";

    const parts = fullName.trim().split(/\s+/);

    return {
      firstName: parts.slice(0, -1).join(" "),
      lastName: parts[parts.length - 1] || "",
    };
  };

  const getCustomFieldHeaders = (
    timesheets: Timesheet[]
  ): string[] => {
    const fields = new Set<string>();

    fields.add("Rate");
    fields.add("SR Number");

    timesheets.forEach((ts) => {
      if (!ts.custom) return;

      Object.keys(ts.custom).forEach((key) => {
        fields.add(key);
      });
    });

    return Array.from(fields);
  };


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

  const HEADER_OVERRIDES: Record<string, string> = {
    srNumber: "SR Number",
    sr_number: "SR Number",
    rate: "Rate",
  };

  function formatHeader(key: string) {
    return key
      .replace(/([a-z])([A-Z])/g, "$1 $2")   // camelCase → camel Case
      .replace(/_/g, " ")                   // snake_case → snake case
      .replace(/\b\w/g, (c) => c.toUpperCase()); // capitalize words
  }

  function buildExportRow(timesheet: Timesheet) {
    console.log("EXPORT TIMESHEET", timesheet);

    const NA = "N/A";

    const safe = (v: any) =>
      v === undefined || v === null || v === "" || Number.isNaN(v)
        ? NA
        : String(v);

    const formatDateOnly = (value?: string) => {
      if (!value) return NA;
      const d = new Date(value);
      return Number.isNaN(d.getTime()) ? NA : d.toLocaleDateString();
    };

    const totalHours = calculateTotalHours(timesheet);

    const categoryHours = calculateCategoryHours(timesheet);
    const displayCategoryHours = formatCategoryHoursForDisplay(categoryHours, totalHours);
    const dayHours: Record<string, number> = {
      Monday: 0,
      Tuesday: 0,
      Wednesday: 0,
      Thursday: 0,
      Friday: 0,
      Saturday: 0,
      Sunday: 0,
    };

    if (Array.isArray(timesheet.entries)) {
      timesheet.entries.forEach((entry) => {
        const date = new Date(entry.date);
        if (Number.isNaN(date.getTime())) return;

        const day = date.toLocaleDateString("en-US", {
          weekday: "long",
        }) as keyof typeof dayHours;

        if (dayHours[day] !== undefined) {
          dayHours[day] += calculateEntryHours(entry);
        }
      });
    }

    const custom = timesheet.custom || {};
    const splitName = (timesheet: Timesheet) => {
      const profile = timesheet.user?.profile;

      if (profile?.firstName || profile?.surname) {
        return {
          firstName: profile.firstName || "",
          lastName: profile.surname || "",
        };
      }

      const fullName = (profile?.fullName || "").trim();

      if (!fullName) {
        return {
          firstName: "",
          lastName: "",
        };
      }

      const parts = fullName.split(/\s+/);

      // Single-word name
      if (parts.length === 1) {
        return {
          firstName: parts[0],
          lastName: "",
        };
      }

      return {
        firstName: parts.slice(0, -1).join(" "),
        lastName: parts[parts.length - 1],
      };
    };

    const names = splitName(timesheet);

    const dayData: Record<
      string,
      {
        hours: number;
        startTime: string;
        endTime: string;
      }
    > = {
      Monday: { hours: 0, startTime: "", endTime: "" },
      Tuesday: { hours: 0, startTime: "", endTime: "" },
      Wednesday: { hours: 0, startTime: "", endTime: "" },
      Thursday: { hours: 0, startTime: "", endTime: "" },
      Friday: { hours: 0, startTime: "", endTime: "" },
      Saturday: { hours: 0, startTime: "", endTime: "" },
      Sunday: { hours: 0, startTime: "", endTime: "" },
    };

    timesheet.entries.forEach((entry) => {
      const date = new Date(entry.date);

      const day = date.toLocaleDateString("en-US", {
        weekday: "long",
      }) as keyof typeof dayData;

      if (dayData[day]) {
        dayData[day].hours += calculateEntryHours(entry);
        dayData[day].startTime = entry.startTime;
        dayData[day].endTime = entry.endTime;
      }
    });

    const baseRow: Record<string, any> = {
      // main feilds
      "Timesheet ID": timesheet.id,
      "F/N": names.firstName || "-",
      "L/N": names.lastName || '-',
      "Department": "-", // blank for now
      "Notes": "-",      // blank for now
      "Type": "-",

      // "User": getDisplayName(timesheet),
      "Worker ID": timesheet.userId,
      "Client": timesheet.client?.name || NA,
      "Position": timesheet.position?.title || NA,
      "Status": timesheet.status.toUpperCase(),

      "Start Date": formatDateOnly(timesheet.startDate),
      "End Date": formatDateOnly(timesheet.endDate),

      // approved at included if status approved
      "Approved At":
        timesheet.approvedAt
          ? new Date(timesheet.approvedAt).toLocaleString()
          : timesheet.status === "approved"
            ? "APPROVED (no timestamp)"
            : NA,

      "Signed By": timesheet.meta?.signerName || timesheet.meta?.signedBy || NA,

      //category type hours
      "Standard Hours": displayCategoryHours.standard.toFixed(2),
      "Evening Hours": displayCategoryHours.evening.toFixed(2),
      "Weekend Hours": displayCategoryHours.weekend.toFixed(2),

      // hours
      "Total Hours": totalHours.toFixed(2),
      "Monday Hours": `${dayData.Monday.hours.toFixed(2)} (${dayData.Monday.startTime}-${dayData.Monday.endTime})`,
      "Tuesday Hours": `${dayData.Tuesday.hours.toFixed(2)} (${dayData.Tuesday.startTime}-${dayData.Tuesday.endTime})`,
      "Wednesday Hours": `${dayData.Wednesday.hours.toFixed(2)} (${dayData.Wednesday.startTime}-${dayData.Wednesday.endTime})`,
      "Thursday Hours": `${dayData.Thursday.hours.toFixed(2)} (${dayData.Thursday.startTime}-${dayData.Thursday.endTime})`,
      "Friday Hours": `${dayData.Friday.hours.toFixed(2)} (${dayData.Friday.startTime}-${dayData.Friday.endTime})`,
      "Saturday Hours": `${dayData.Sunday.hours.toFixed(2)} (${dayData.Sunday.startTime}-${dayData.Sunday.endTime})`,

      //signature info
      "Signed At": timesheet.meta?.signedAt
        ? new Date(timesheet.meta.signedAt).toLocaleString()
        : NA,

      "Manager Role": timesheet.meta?.managerRole || NA,
      "Manager Note": timesheet.meta?.managerNote || NA,
      "Info Verified": typeof timesheet.meta?.infoVerified === "boolean"
        ? timesheet.meta.infoVerified
          ? "Yes"
          : "No"
        : NA,

      "Rejection Reason": timesheet.meta?.rejectionReason || NA,
      "Rejected At": timesheet.meta?.rejectedAt
        ? new Date(timesheet.meta.rejectedAt).toLocaleString()
        : NA,
    };

    //custom fields
    const customFields = Object.fromEntries(
      Object.entries(custom).map(([k, v]) => [
        HEADER_OVERRIDES[k] ?? formatHeader(k),
        v ?? NA,
      ])
    );

    return {
      ...baseRow,
      ...customFields,
    };
  }



  function getStableHeaders(rows: Record<string, any>[]) {
    const ordered: string[] = [];

    rows.forEach((row) => {
      Object.keys(row).forEach((key) => {
        if (!ordered.includes(key)) {
          ordered.push(key);
        }
      });
    });

    return ordered;
  }



  const exportTimesheetToCSV = (timesheet: Timesheet) => {
    try {


      const row = buildExportRow(timesheet);


      const headers = Object.keys(row)


      const values = Object.values(row).map((v) =>
        `"${String(v).replace(/"/g, '""')}"`
      );

      const csvContent = [
        headers.join(","),
        values.join(","),
      ].join("\n");

      const blob = new Blob(["\uFEFF" + csvContent], {
        type: "text/csv;charset=utf-8;",
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");

      const safeUserName = getDisplayName(timesheet)
        .replace(/[^a-z0-9]/gi, "_")
        .toLowerCase();

      link.href = url;
      link.setAttribute(
        "download",
        `timesheet_${timesheet.id}_${safeUserName}.csv`
      );

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Export Successful",
        description: `Timesheet #${timesheet.id} exported successfully`,
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Export Failed",
        description: "Something went wrong while exporting the CSV",
        variant: "destructive",
      });
    }
  };


  const exportSelectedTimesheetsToCSV = () => {
    try {
      if (selectedIds.length === 0) {
        toast({
          title: "No Selection",
          description: "Please select at least one timesheet",
          variant: "destructive",
        });
        return;
      }

      const selectedTimesheets = filtered.filter((t) =>
        selectedIds.includes(t.id)
      );

      const rows = selectedTimesheets.map(buildExportRow);

      const headers = getStableHeaders(rows);

      const csvRows: string[] = [];

      // header row
      csvRows.push(headers.join(","));

      // data rows
      rows.forEach((row) => {
        const values = headers.map((h) =>
          `"${String(row[h] ?? "").replace(/"/g, '""')}"`
        );
        csvRows.push(values.join(","));
      });

      const csvContent = csvRows.join("\n");

      const blob = new Blob(["\uFEFF" + csvContent], {
        type: "text/csv;charset=utf-8;",
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.setAttribute("download", `bulk_timesheets_${Date.now()}.csv`);

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Export Successful",
        description: `${selectedTimesheets.length} timesheets exported`,
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Export Failed",
        description: "Something went wrong while exporting",
        variant: "destructive",
      });
    }
  };
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

      let matchesDate = true;

      if (date) {
        const { monday, sunday } = getWeekRange(date);

        monday.setHours(0, 0, 0, 0);
        sunday.setHours(23, 59, 59, 999);

        if (dateFilterType === "period") {
          const rowStart = parseLocalDate(row.startDate);
          const rowEnd = parseLocalDate(row.endDate);

          rowStart.setHours(0, 0, 0, 0);
          rowEnd.setHours(23, 59, 59, 999);

          matchesDate =
            rowStart <= sunday &&
            rowEnd >= monday;
        }

        if (dateFilterType === "approved") {
          if (!row.approvedAt) {
            matchesDate = false;
          } else {
            const approved = parseLocalDate(row.approvedAt);

            approved.setHours(12, 0, 0, 0);

            matchesDate =
              approved >= monday &&
              approved <= sunday;
          }
        }
      }

      return matchesUser && matchesDate;

    });
  }, [timesheets, userFilter, date, dateFilterType]);

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



  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pages = [];
    const maxVisiblePages = 5;

    let startPage = Math.max(
      1,
      page - Math.floor(maxVisiblePages / 2)
    );

    let endPage = Math.min(
      totalPages,
      startPage + maxVisiblePages - 1
    );

    // Shift the window left if we're near the end
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(
        1,
        endPage - maxVisiblePages + 1
      );
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <PaginationItem key={i}>
          <PaginationLink
            href="#"
            isActive={i === page}
            onClick={(e) => {
              e.preventDefault();
              setPage(i);
            }}
          >
            {i}
          </PaginationLink>
        </PaginationItem>
      );
    }

    return (
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
        {/* <div className="text-sm text-muted-foreground">
          Showing page {page} of {totalPages} ({totalTimesheets} total records)
        </div> */}

        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e) => {
                  e.preventDefault();

                  if (page > 1) {
                    setPage(page - 1);
                  }
                }}
                className={
                  page === 1
                    ? "pointer-events-none opacity-50"
                    : ""
                }
              />
            </PaginationItem>

            {pages}

            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(e) => {
                  e.preventDefault();

                  if (page < totalPages) {
                    setPage(page + 1);
                  }
                }}
                className={
                  page === totalPages
                    ? "pointer-events-none opacity-50"
                    : ""
                }
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    );
  };



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
                  <SelectItem value="processing">Processing</SelectItem>
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
                <Select
                  value={dateFilterType}
                  onValueChange={(v) => {
                    setDateFilterType(v as "period" || "approved")
                  }}>
                  <SelectTrigger>
                    <SelectValue placeholder='Date Filter Type' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="period">
                      Timesheet Period
                    </SelectItem>
                    <SelectItem value="approved">
                      Approval Week
                    </SelectItem>

                  </SelectContent>
                </Select>
                <label className="text-xs text-gray-500">
                  {dateFilterType === 'period'
                    ? "Timesheet Week"
                    : "Approved Week"
                  }
                </label>
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
                  setDateFilterType("period")
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
              <Button
                variant="outline"
                onClick={exportSelectedTimesheetsToCSV}
                disabled={selectedIds.length === 0}
              >
                <Download className="h-4 w-4 mr-1" />
                Export Selected ({selectedIds.length})
              </Button>
              <Select
                value={String(pageSize)}
                onValueChange={(v) => {
                  updateTablePreferences({
                    pageSize: Number(v),
                  });

                  setPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Rows per page" />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="10">10 per page</SelectItem>
                  <SelectItem value="25">25 per page</SelectItem>
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
            <CardTitle className="text-[#000009]">Timesheet Records ({filtered.length} of {totalTimesheets})</CardTitle>
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
                    const categoryHours = calculateCategoryHours(row);
                    const displayCategoryHours = formatCategoryHoursForDisplay(categoryHours, totalHours);
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
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => exportTimesheetToCSV(row)}
                              >
                                <Download className="h-4 w-4 mr-1" />
                                Export
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  navigate(`/timesheets/${row.id}/edit`)
                                }
                              >
                                <Edit className="h-4 w-4 mr-1" />
                                Edit
                              </Button>
                              {row.status === "pending" && (
                                <Button
                                  size="sm"
                                  className="bg-blue-700 hover:bg-blue-800"
                                  onClick={() => updateStatus(row.id, "processing")}
                                  disabled={isSaving}
                                >
                                  Processing
                                </Button>
                              )}
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
                                      <>
                                        <div className="rounded-md border bg-white w-full">
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
                                        <div className="mt-2 rounded-md border bg-white p-2 text-xs text-gray-700">
                                          <div className="grid grid-cols-1 gap-1 sm:grid-cols-3">
                                            <p><strong>Standard:</strong> {displayCategoryHours.standard.toFixed(2)}h</p>
                                            <p><strong>Evening:</strong> {displayCategoryHours.evening.toFixed(2)}h</p>
                                            <p><strong>Weekend:</strong> {displayCategoryHours.weekend.toFixed(2)}h</p>
                                          </div>
                                        </div>
                                      </>
                                    ) : (
                                      <p className="text-xs text-gray-500">No entries added.</p>
                                    )}
                                  </div>
                                  <div className="rounded-md border bg-white p-3 text-xs">
                                    <p className="font-semibold text-sm text-[#000009] mb-3">Signature Details</p>
                                    <div className="grid gap-3 md:grid-cols-2">
                                      <div className="space-y-2">
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
                                      </div>
                                      <div className="rounded-md border bg-muted/20 p-2">
                                        {row.meta?.signature ? (
                                          <img
                                            src={row.meta.signature}
                                            alt={`Signature for timesheet #${row.id}`}
                                            className="mx-auto max-h-44 w-auto rounded"
                                          />
                                        ) : (
                                          <p className="text-gray-500"><strong>Signature:</strong> Not uploaded</p>
                                        )}
                                      </div>
                                    </div>
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
            {/* <div className="flex items-center justify-between mt-4">
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
            </div> */}

            {renderPagination()}
          </CardContent>
        </Card>
      </div>
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
