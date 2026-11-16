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
import { ChevronDown, ChevronUp, Trash2, Download, Edit, ChevronsUpDown, Mail } from "lucide-react";
import RejecteTimesheetModal from "@/components/RejectTimesheetModal";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { usePreferences } from "@/hooks/usePreferences";
import { object } from "zod";
import { useNavigate } from "react-router-dom";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Check } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import CustomAddition from "./UpdateTimesheet";
import EmailTimesheetModal from "@/components/EmailTimesheetModal";
import TimesheetHistory from "@/components/TimesheetHistory";


type TimesheetStatus = "draft" | "pending" | "approved" | "rejected" | "processing";

type TimesheetEntry = {
  date: string;
  startTime: string;
  endTime: string;
  break: number;
};

type SignatureRecord = {
  signature?: string;
  signedAt?: string;
  signedBy?: string;
  signerName?: string;
  managerRole?: string;
  managerNote?: string;
  infoVerified?: boolean;
  certificationReason?: string;
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
  processingAt?: string;

  signatureHistory?: SignatureRecord[];

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
  createdAt?: string;

  // Who made the most recent status change, from the audit log
  actionedBy?: {
    actorId: number | null;
    actorType: "admin" | "worker" | "system";
    actorName: string;
    toStatus: string | null;
    at: string;
  } | null;

};

type AdminTimesheetListResponse = {
  total: number;
  limit: number;
  offset: number;
  results: Timesheet[];
};

type SortDirection = 'asc' | 'desc' | null;



const SortIcon = ({ column, sortColumn, sortDirection }: {
  column: string;
  sortColumn: string | null;
  sortDirection: SortDirection;
}) => {
  if (sortColumn !== column) return <ChevronsUpDown className="h-3.5 w-3.5 ml-1 text-gray-400 inline" />;
  if (sortDirection === 'asc') return <ChevronUp className="h-3.5 w-3.5 ml-1 inline" />;
  return <ChevronDown className="h-3.5 w-3.5 ml-1 inline" />;
};


const statusClasses: Record<TimesheetStatus, string> = {
  draft: "bg-gray-200 text-gray-800",
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  processing: "bg-blue-100 text-blue-800",
};

const dayFormatter = new Intl.DateTimeFormat(undefined, { weekday: "short" });

function formatDate(value: string): string {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";

  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).replace(/\//g, '/');
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
  let endMinutes = endHour * 60 + endMinute;
  if (endMinutes <= startMinutes) {
    // overnight shift (e.g. 22:00 greater thab 06:00) - mirrors the day-rollover logic in getEntryInterval
    endMinutes += 24 * 60;
  }
  const breakMinutes = typeof entry.break === "number" && !Number.isNaN(entry.break) ? Math.max(entry.break, 0) : 0;
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

function getSignerLabel(sig: SignatureRecord): string {
  if (sig.signerName) {
    const role = sig.managerRole ? ` (${sig.managerRole})` : "";
    return `${sig.signerName}${role}`;
  }
  if (sig.signedBy) return `${sig.signedBy} (self-certified)`;
  return "Not provided";
}

/** All signatures, oldest first: archived history, then the current one. Same order as the email. */
function getSignatures(meta?: TimesheetMeta): SignatureRecord[] {
  if (!meta) return [];
  const list: SignatureRecord[] = Array.isArray(meta.signatureHistory) ? [...meta.signatureHistory] : [];
  if (meta.signedAt || meta.signature) {
    list.push({
      signature: meta.signature,
      signedAt: meta.signedAt,
      signedBy: meta.signedBy,
      signerName: meta.signerName,
      managerRole: meta.managerRole,
      managerNote: meta.managerNote,
      infoVerified: meta.infoVerified,
      certificationReason: meta.certificationReason,
    });
  }
  return list;
}

function getSignatureLabel(index: number, total: number): string {
  if (total === 1) return "Signature";
  if (index === 0) return "Original signature";
  if (index === total - 1) return "Latest signature";
  return "Previous signature";
}


const Timesheets = () => {
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [totalTimesheets, setTotalTimesheets] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [userFilter, setUserFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [actionedByFilter, setActionedByFilter] = useState<string>("all");
  const [clientFilter, setClientFilter] = useState<number | null>(null);
  const [clientPickerOpen, setClientPickerOpen] = useState(false);
  const [admins, setAdmins] = useState<{ id: number; name: string }[]>([]);
  const [sortBy, setSortBy] = useState<"period" | "client">("period");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [date, setDate] = useState("");
  const [page, setPage] = useState(1);
  const [expandedTimesheetId, setExpandedTimesheetId] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkStatus, setBulkStatus] = useState<TimesheetStatus | "none">("none");
  const [isSaving, setIsSaving] = useState(false);
  // Sorting
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [emailModal, setEmailModal] = useState<{ ids: number[]; clientId: number } | null>(null);


  const [approvedDate, setApprovedDate] = useState("");

  const { preferences, updateTablePreferences } = usePreferences();
  const pageSize = preferences.table.pageSize || 10;

  const [rejectModalOpen, setRejectModalOpen] = useState(false)
  const [selectedRejectId, setSelectedRejectedId] = useState<number | null>(null)

  const [dateFilterType, setDateFilterType] = useState<"period" | "approved" | "created">("period")
  // const [weekAnchor, setWeekAnchor] = useState<"commencing" | "ending">("commencing");



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

  //sorthandler
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortColumn(null);
        setSortDirection(null);
      }
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  function getSortedEntries(entries: TimesheetEntry[]): TimesheetEntry[] {
    if (!Array.isArray(entries)) return [];
    return [...entries].sort((a, b) => {
      const aTime = new Date(`${a.date}T${a.startTime || "00:00"}`).getTime();
      const bTime = new Date(`${b.date}T${b.startTime || "00:00"}`).getTime();
      // Push invalid dates to the end
      if (Number.isNaN(aTime)) return 1;
      if (Number.isNaN(bTime)) return -1;
      return aTime - bTime;
    });
  }

  const SortableTh = ({ column, children }: { column: string; children: React.ReactNode }) => (
    <TableHead
      className="cursor-pointer select-none whitespace-nowrap"
      onClick={() => handleSort(column)}
    >
      {children}
      <SortIcon column={column} sortColumn={sortColumn} sortDirection={sortDirection} />
    </TableHead>
  );

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
        limit: "9999",
        offset: "0",
        sortBy,
        sortDir,
        ...(statusFilter !== "all" ? { status: statusFilter } : {}),
        ...(actionedByFilter !== "all" ? { actionedBy: actionedByFilter } : {}),
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
  }, [authHeaders, toast, sortBy, sortDir, statusFilter, actionedByFilter]);

  useEffect(() => {
    if (token) {
      fetchTimesheets();
    }
  }, [token, fetchTimesheets]);

  // Admin names for the "Actioned By" filter
  useEffect(() => {
    if (!token) return;
    const search = encodeURIComponent(JSON.stringify({ role: { in: ["admin", "super_admin"] } }));
    fetch(`${API_BASE_URL}/users?limit=200&offset=0&search=${search}`, { headers: authHeaders })
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data: { results?: { id: number; username: string; profile?: Record<string, string> }[] }) => {
        const names = (data.results ?? []).map((u) => ({
          id: u.id,
          name:
            u.profile?.fullName?.trim() ||
            [u.profile?.Forename, u.profile?.Surname].filter(Boolean).join(" ").trim() ||
            u.username,
        }));
        setAdmins(names.sort((a, b) => a.name.localeCompare(b.name)));
      })
      .catch(() => setAdmins([]));
  }, [token, authHeaders]);

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
      "Actioned By": timesheet.actionedBy?.actorName || NA,

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
      "Saturday Hours": `${dayData.Saturday.hours.toFixed(2)} (${dayData.Saturday.startTime}-${dayData.Saturday.endTime})`,
      "Sunday Hours": `${dayData.Sunday.hours.toFixed(2)} (${dayData.Sunday.startTime}-${dayData.Sunday.endTime})`,

      //signature info
      "Signed At": timesheet.meta?.signedAt
        ? new Date(timesheet.meta.signedAt).toLocaleString()
        : NA,

      "Manager Role": timesheet.meta?.managerRole || NA,
      "Manager Note": timesheet.meta?.managerNote || NA,
      "Info Verified": typeof timesheet.meta?.infoVerified === "boolean"
        ? timesheet.meta.infoVerified
          ? "No"
          : "Yes"
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

  function getStatusLabel(row: Timesheet): string {
    const status =
      row.status.charAt(0).toUpperCase() +
      row.status.slice(1);

    if (row.status === "approved" && row.approvedAt) {
      return `${status} (${new Date(row.approvedAt).toLocaleString()})`;
    }

    if (row.status === "processing" && row.meta?.processingAt) {
      return `${status} (${new Date(row.meta.processingAt).toLocaleString()})`;
    }

    return status;
  }
  ///export
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
    const { start, end } = getWeekRange(date);
    return { start: start.toLocaleDateString(), end: end.toLocaleDateString() };
  }, [date]);

  // Clients that appear in the loaded timesheets, for the client filter
  const clientOptions = useMemo(() => {
    const byId = new Map<number, { id: number; name: string; count: number }>();
    for (const row of timesheets) {
      const existing = byId.get(row.clientId);
      if (existing) existing.count += 1;
      else byId.set(row.clientId, { id: row.clientId, name: row.client?.name || `Client #${row.clientId}`, count: 1 });
    }
    return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [timesheets]);

  const selectedClientName =
    clientFilter === null
      ? null
      : clientOptions.find((c) => c.id === clientFilter)?.name ?? `Client #${clientFilter}`;

  const filtered = useMemo(() => {
    return timesheets.filter((row) => {
      if (clientFilter !== null && row.clientId !== clientFilter) return false;

      const userTerm = userFilter.trim().toLowerCase();
      const matchesUser =
        !userTerm ||
        String(row.userId).includes(userTerm) ||
        getDisplayName(row).toLowerCase().includes(userTerm);

      let matchesDate = true;

      if (date) {
        const { start, end } = getWeekRange(date);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);

        if (dateFilterType === "period") {
          const rowStart = parseLocalDate(row.startDate);
          const rowEnd = parseLocalDate(row.endDate);
          rowStart.setHours(0, 0, 0, 0);
          rowEnd.setHours(23, 59, 59, 999);
          matchesDate = rowStart <= end && rowEnd >= start;
        }

        if (dateFilterType === "approved") {
          if (!row.approvedAt) {
            matchesDate = false;
          } else {
            const approved = parseLocalDate(row.approvedAt);
            approved.setHours(12, 0, 0, 0);
            matchesDate = approved >= start && approved <= end;
          }
        }

        if (dateFilterType === "created") {
          if (!row.createdAt) {
            matchesDate = false;
          } else {
            const created = parseLocalDate(row.createdAt);
            created.setHours(12, 0, 0, 0);
            matchesDate = created >= start && created <= end;
          }
        }
      }

      return matchesUser && matchesDate;
    });
  }, [timesheets, userFilter, date, dateFilterType, clientFilter]);

  const selectedTimesheets = useMemo(
    () => filtered.filter((t) => selectedIds.includes(t.id)),
    [filtered, selectedIds]
  );

  const MAX_BULK_EMAIL = 25;

  const selectedClientIds = new Set(selectedTimesheets.map((t) => t.clientId));
  const overBulkLimit = selectedTimesheets.length > MAX_BULK_EMAIL;
  const canBulkEmail =
    selectedTimesheets.length > 0 && selectedClientIds.size === 1 && !overBulkLimit;


  const sortedTimesheets = useMemo(() => {
    if (!sortColumn || !sortDirection) return filtered;

    return [...filtered].sort((a, b) => {
      const dir = sortDirection === 'asc' ? 1 : -1;

      switch (sortColumn) {
        case 'id':
          return (a.id - b.id) * dir;
        case 'user':
          return getDisplayName(a).localeCompare(getDisplayName(b)) * dir;
        case 'client':
          return (a.client?.name || '').localeCompare(b.client?.name || '') * dir;
        case 'position':
          return (a.position?.title || '').localeCompare(b.position?.title || '') * dir;
        case 'period':
          return a.startDate.localeCompare(b.startDate) * dir;
        case 'hours':
          return (calculateTotalHours(a) - calculateTotalHours(b)) * dir;
        case 'status':
          return a.status.localeCompare(b.status) * dir;
        case 'created':
          return (
            new Date(a.createdAt || 0).getTime() -
            new Date(b.createdAt || 0).getTime()
          ) * dir;
        default:
          return 0;
      }
    });
  }, [filtered, sortColumn, sortDirection]);


  const paginatedFiltered = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedTimesheets.slice(start, start + pageSize);
  }, [sortedTimesheets, page, pageSize]);

  const totalPages = Math.max(
    1,
    Math.ceil(filtered.length / pageSize)
  );
  const allVisibleSelected =
    paginatedFiltered.length > 0 &&
    paginatedFiltered.every((row) => selectedIds.includes(row.id));
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
    const pageIds = paginatedFiltered.map((row) => row.id);

    if (!checked) {
      setSelectedIds((prev) => prev.filter((id) => !pageIds.includes(id)));
      return;
    }

    setSelectedIds((prev) => Array.from(new Set([...prev, ...pageIds])));
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
    const day = current.getDay(); // Sun=0 ... Sat=6

    // Always resolves to the Monday–Sunday week that contains the selected date
    const diffToMonday = day === 0 ? -6 : 1 - day;

    const start = new Date(current);
    start.setDate(start.getDate() + diffToMonday);

    const end = new Date(start);
    end.setDate(end.getDate() + 6);

    return { start, end };
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
            <CardDescription>Refine by username, client, date, status and who actioned it</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Main Filters Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4">
                {/* User Filter — narrow */}
                <div className="lg:col-span-2 space-y-1">
                  <label className="text-sm font-medium text-gray-700">Filter by Username</label>
                  <Input
                    placeholder="Username"
                    value={userFilter}
                    onChange={(e) => { setUserFilter(e.target.value); setPage(1); }}
                  />
                </div>

                {/* Status Filter — narrow */}
                <div className="lg:col-span-2 space-y-1">
                  <label className="text-sm font-medium text-gray-700">Status</label>
                  <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                    <SelectTrigger>
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="processing">Processing</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Actioned By Filter */}
                <div className="lg:col-span-3 space-y-1">
                  <label className="text-sm font-medium text-gray-700">Actioned By</label>
                  <Select value={actionedByFilter} onValueChange={(v) => { setActionedByFilter(v); setPage(1); }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Anyone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Anyone</SelectItem>
                      {admins.map((admin) => (
                        <SelectItem key={admin.id} value={String(admin.id)}>{admin.name}</SelectItem>
                      ))}
                      <SelectItem value="system">System (automatic)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Date Filter — wide, holds 3 controls */}
                <div className="lg:col-span-5 space-y-1">
                  <label className="text-sm font-medium text-gray-700">Date Filter</label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Select
                      value={dateFilterType}
                      onValueChange={(v) => { setDateFilterType(v as "period" | "approved" | "created"); setPage(1); }}
                    >
                      <SelectTrigger className="w-full sm:w-auto sm:min-w-[9rem]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="period">Timesheet Period</SelectItem>
                        <SelectItem value="approved">Approval Week</SelectItem>
                        <SelectItem value="created">Date Created</SelectItem>
                      </SelectContent>
                    </Select>
                    {/* <Select
                      value={weekAnchor}
                      onValueChange={(v) => { setWeekAnchor(v as "commencing" | "ending"); setPage(1); }}
                    >
                      <SelectTrigger className="w-full sm:w-auto sm:min-w-[10rem]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="commencing">Week Commencing</SelectItem>
                        <SelectItem value="ending">Week Ending</SelectItem>
                      </SelectContent>
                    </Select> */}
                    <Input
                      type="date"
                      value={date}
                      onChange={(e) => { setDate(e.target.value); setPage(1); }}
                      className="w-full sm:flex-1"
                    />

                  </div>
                  {selectedWeek && (
                    <p className="text-xs text-gray-500 pt-1">
                      Filtering week: <span className="font-medium text-gray-700">{formatDate(selectedWeek.start)} – {formatDate(selectedWeek.end)}</span>
                    </p>
                  )}
                  {/* {dateFilterType === "approved" && statusFilter === "pending" && (
                    <p className="text-xs text-amber-600 pt-1">
                      Pending timesheets have no approval date yet — switch Status to "All" or "Approved" to see results.
                    </p>
                  )} */}
                  {dateFilterType === "created" && statusFilter === "pending" && (
                    <p className="text-xs text-gray-500 pt-1">
                      Tip: switch Status to "All" if you want to see created-date results across every status.
                    </p>
                  )}
                </div>

                {/* Client Filter — searchable, lists clients in the loaded timesheets */}
                <div className="lg:col-span-3 space-y-1">
                  <label className="text-sm font-medium text-gray-700">Client</label>
                  <Popover open={clientPickerOpen} onOpenChange={setClientPickerOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" role="combobox" aria-expanded={clientPickerOpen} className="w-full justify-between font-normal">
                        <span className="truncate">{selectedClientName ?? "All clients"}</span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] min-w-[16rem] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search clients..." />
                        <CommandList>
                          <CommandEmpty>No clients found.</CommandEmpty>
                          <CommandGroup>
                            <CommandItem value="All clients" onSelect={() => { setClientFilter(null); setPage(1); setClientPickerOpen(false); }}>
                              <Check className={`mr-2 h-4 w-4 ${clientFilter === null ? "opacity-100" : "opacity-0"}`} />
                              All clients
                            </CommandItem>
                            {clientOptions.map((client) => (
                              <CommandItem
                                key={client.id}
                                value={`${client.name} ${client.id}`}
                                onSelect={() => { setClientFilter(client.id); setPage(1); setClientPickerOpen(false); }}
                              >
                                <Check className={`mr-2 h-4 w-4 ${clientFilter === client.id ? "opacity-100" : "opacity-0"}`} />
                                <span className="flex-1 truncate">{client.name}</span>
                                <span className="ml-2 text-xs text-muted-foreground">{client.count}</span>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Sort Options — medium */}
                <div className="lg:col-span-3 space-y-1">
                  <label className="text-sm font-medium text-gray-700">Sort</label>
                  <div className="flex gap-2">
                    <Select value={sortBy} onValueChange={(v) => { setSortBy(v as "period" | "client"); setPage(1); }}>
                      <SelectTrigger className="flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="period">Period</SelectItem>
                        <SelectItem value="client">Client</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={sortDir} onValueChange={(v) => { setSortDir(v as "asc" | "desc"); setPage(1); }}>
                      <SelectTrigger className="w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="desc">Newest</SelectItem>
                        <SelectItem value="asc">Oldest</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              {/* Action Buttons Row */}
              <div className="flex flex-wrap gap-3 pt-2 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    setUserFilter("");
                    setStatusFilter("pending");
                    setActionedByFilter("all");
                    setClientFilter(null);
                    setSortBy("period");
                    setSortDir("desc");
                    setPage(1);
                    setDate("");
                    setDateFilterType("period");
                    // setWeekAnchor("commencing")
                  }}
                >
                  Clear Filters
                </Button>

                <Button
                  variant="outline"
                  onClick={exportSelectedTimesheetsToCSV}
                  disabled={selectedIds.length === 0}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export Selected ({selectedIds.length})
                </Button>

                <Button
                  variant="outline"
                  onClick={() => {
                    if (!canBulkEmail) return;
                    setEmailModal({
                      ids: selectedTimesheets.map((t) => t.id), clientId: selectedTimesheets[0].clientId
                    })
                  }
                  }
                  disabled={!canBulkEmail}
                  title={
                    selectedClientIds.size > 1
                      ? "Select timesheets from one client only"
                      : overBulkLimit
                        ? `Select at most ${MAX_BULK_EMAIL} timesheets`
                        : undefined
                  }                >

                  <Mail className="h-4 w-4 mr-2" />
                  Email Selected to Client ({selectedTimesheets.length})

                </Button>
                {selectedClientIds.size > 1 && (
                  <p className="text-xs text-amber-600 self-center">Selected timesheets belong to different clients.</p>
                )}
                {overBulkLimit && (
                  <p className="text-xs text-amber-600 self-center">
                    You can email at most {MAX_BULK_EMAIL} timesheets at once. You selected {selectedTimesheets.length}.
                    Deselect some, or narrow by week or status and in groups of 25.
                  </p>
                )}
                {selectedClientIds.size > 1 && (
                  <p className="text-xs text-amber-600 self-center">Selected timesheets belong to different clients.</p>
                )}
              </div>

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
            <CardTitle className="text-[#000009]">
              Timesheet Records ({filtered.length})
            </CardTitle>
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
                    <SortableTh column="id">ID</SortableTh>
                    <SortableTh column="user">User</SortableTh>
                    <SortableTh column="client">Client</SortableTh>
                    <SortableTh column="position">Position</SortableTh>
                    <SortableTh column="period">Period</SortableTh>
                    <SortableTh column="created">Created</SortableTh>
                    <SortableTh column="hours">Hours</SortableTh>
                    <TableHead>Status</TableHead>
                    <TableHead>Actioned By</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedFiltered.map((row) => {
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
                          <TableCell>
                            {row.createdAt ? formatDate(row.createdAt) : "-"}
                          </TableCell>
                          <TableCell>{totalHours.toFixed(2)}h</TableCell>
                          <TableCell>
                            <Badge className={statusClasses[row.status]}>
                              {getStatusLabel(row)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {row.actionedBy ? (
                              <span title={new Date(row.actionedBy.at).toLocaleString()}>{row.actionedBy.actorName}</span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-end items-center gap-2">

                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setExpandedTimesheetId(isExpanded ? null : row.id)}
                              >
                                {isExpanded
                                  ? <ChevronUp className="h-4 w-4 mr-1" />
                                  : <ChevronDown className="h-4 w-4 mr-1" />
                                }
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


                              {/* <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigate(`/timesheets/${row.id}/edit`)}
                              >
                                <Edit className="h-4 w-4 mr-1" />
                                Edit
                              </Button> */}

                              <DropdownMenu>

                                <DropdownMenuTrigger asChild>
                                  <Button variant="outline" size="sm">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>

                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel className="text-xs text-muted-foreground">
                                    Update Status
                                  </DropdownMenuLabel>
                                  <DropdownMenuSeparator />

                                  {row.status === "pending" && (
                                    <DropdownMenuItem
                                      className="text-blue-700"
                                      onClick={() => updateStatus(row.id, "processing")}
                                      disabled={isSaving}
                                    >
                                      Set Processing
                                    </DropdownMenuItem>
                                  )}

                                  {row.status !== "approved" && (
                                    <DropdownMenuItem
                                      className="text-green-700"
                                      onClick={() => updateStatus(row.id, "approved")}
                                      disabled={isSaving}
                                    >
                                      Approve
                                    </DropdownMenuItem>
                                  )}

                                  {row.status !== "rejected" && (
                                    <DropdownMenuItem
                                      className="text-red-600"
                                      onClick={() => {
                                        setSelectedRejectedId(row.id);
                                        setRejectModalOpen(true);
                                      }}
                                      disabled={isSaving}
                                    >
                                      Reject
                                    </DropdownMenuItem>
                                  )}

                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => setEmailModal({ ids: [row.id], clientId: row.clientId })}
                                  >
                                    <Mail className="h-4 w-4 mr-2" />
                                    Email to Client
                                  </DropdownMenuItem>

                                  <DropdownMenuSeparator />

                                  <DropdownMenuItem
                                    className="text-red-600"
                                    onClick={() => deleteTimesheet(row.id)}
                                    disabled={isSaving}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>

                                </DropdownMenuContent>
                              </DropdownMenu>

                            </div>
                          </TableCell>
                        </TableRow>
                        {isExpanded && (
                          <TableRow>
                            <TableCell colSpan={11} className="bg-blue-50/30 border-l-4 border-blue-300">
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
                                              {getSortedEntries(row.entries).map((entry, idx) => {
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

                                        <CustomAddition timesheetId={row.id} authHeaders={authHeaders} />
                                      </>
                                    ) : (
                                      <p className="text-xs text-gray-500">No entries added.</p>
                                    )}
                                  </div>
                                  <div className="rounded-md border bg-white p-3 text-xs">
                                    <p className="font-semibold text-sm text-[#000009] mb-3">
                                      {getSignatures(row.meta).length > 1 ? "Signature History" : "Signature Details"}
                                    </p>

                                    {(() => {
                                      const signatures = getSignatures(row.meta);
                                      if (signatures.length === 0) {
                                        return <p className="text-gray-500"><strong>Signature:</strong> Not uploaded</p>;
                                      }
                                      return (
                                        <div className="grid gap-3 sm:grid-cols-2">
                                          {signatures.map((sig, i) => (
                                            <div
                                              key={`${row.id}-sig-${i}`}
                                              className={`rounded-md border p-2 space-y-2 ${i === signatures.length - 1 && signatures.length > 1 ? "border-blue-300 bg-blue-50/30" : "bg-muted/20"}`}
                                            >
                                              <p className="text-[10px] font-bold uppercase text-gray-500">
                                                {getSignatureLabel(i, signatures.length)}
                                              </p>
                                              {sig.signature ? (
                                                <img
                                                  src={sig.signature}
                                                  alt={`${getSignatureLabel(i, signatures.length)} for timesheet #${row.id}`}
                                                  className="mx-auto max-h-32 w-auto rounded bg-white"
                                                />
                                              ) : (
                                                <p className="text-gray-500">No signature image</p>
                                              )}
                                              <div className="space-y-1">
                                                <p><strong>Signed by:</strong> {getSignerLabel(sig)}</p>
                                                {sig.signedAt && (
                                                  <p><strong>Signed at:</strong> {new Date(sig.signedAt).toLocaleString()}</p>
                                                )}
                                                {typeof sig.infoVerified === "boolean" && (
                                                  <p><strong>Info verified:</strong> {sig.infoVerified ? "No" : "Yes"}</p>
                                                )}
                                                {sig.certificationReason && (
                                                  <p><strong>Certification reason:</strong> {sig.certificationReason}</p>
                                                )}
                                                {sig.managerNote && sig.managerNote !== "None" && (
                                                  <p><strong>Manager note:</strong> {sig.managerNote}</p>
                                                )}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      );
                                    })()}

                                    {(row.meta?.rejectionReason || row.meta?.rejectedAt) && (
                                      <div className="mt-3 border-t pt-2 space-y-1">
                                        {row.meta?.rejectionReason && (
                                          <p className="text-red-600"><strong>Rejection reason:</strong> {row.meta.rejectionReason}</p>
                                        )}
                                        {row.meta?.rejectedAt && (
                                          <p className="text-red-500">
                                            <strong>Rejected at:</strong> {new Date(row.meta.rejectedAt).toLocaleString()}
                                          </p>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <TimesheetHistory timesheetId={row.id} authHeaders={authHeaders} />
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

      <EmailTimesheetModal
        isOpen={!!emailModal}
        onClose={() => setEmailModal(null)}
        timesheetIds={emailModal?.ids ?? []}
        clientId={emailModal?.clientId ?? null}
        authHeaders={authHeaders}
      />

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
