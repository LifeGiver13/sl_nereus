import { useEffect, useState } from "react";
import { API_BASE_URL } from "@/config/env";

type AuditEntry = {
  id: number;
  action: "created" | "updated" | "status_changed" | "deleted" | "signed" | "emailed";
  actorType: "admin" | "worker" | "system";
  actorName: string;
  fromStatus: string | null;
  toStatus: string | null;
  changes: Record<string, { from: unknown; to: unknown }> | null;
  note: string | null;
  createdAt: string;
};

const FIELD_LABELS: Record<string, string> = {
  userId: "worker",
  clientId: "client",
  positionId: "position",
  startDate: "start date",
  endDate: "end date",
  entries: "hours",
  custom: "custom fields",
};

const capitalise = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

function describe(entry: AuditEntry): string {
  switch (entry.action) {
    case "created":
      return `Created${entry.toStatus ? ` as ${entry.toStatus}` : ""}`;
    case "status_changed":
      return `${capitalise(entry.fromStatus ?? "unknown")} → ${capitalise(entry.toStatus ?? "unknown")}`;
    case "updated":
      return "Edited";
    case "deleted":
      return "Deleted";
    case "signed":
      return "Signed off";
    case "emailed":
      return "Emailed to client";
  }
}

interface TimesheetHistoryProps {
  timesheetId: number;
  authHeaders: Record<string, string>;
}

const TimesheetHistory = ({ timesheetId, authHeaders }: TimesheetHistoryProps) => {
  const [entries, setEntries] = useState<AuditEntry[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE_URL}/admin/timesheets/${timesheetId}/audit`, { headers: authHeaders })
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data) => !cancelled && setEntries(data.results ?? []))
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
  }, [timesheetId, authHeaders]);

  return (
    <div className="rounded-md border bg-white p-3 text-xs">
      <p className="font-semibold text-sm text-[#000009] mb-2">History</p>
      {error ? (
        <p className="text-red-600">Couldn't load the history for this timesheet.</p>
      ) : entries === null ? (
        <p className="text-gray-500">Loading history…</p>
      ) : entries.length === 0 ? (
        <p className="text-gray-500">No recorded changes yet. History is kept from when audit logging was switched on.</p>
      ) : (
        <ol className="space-y-2">
          {entries.map((entry) => {
            const changedFields = Object.keys(entry.changes ?? {})
              .map((field) => FIELD_LABELS[field] ?? field);
            return (
              <li key={entry.id} className="flex flex-col gap-0.5 border-l-2 border-blue-200 pl-3 sm:flex-row sm:gap-4">
                <span className="shrink-0 text-gray-500 sm:w-36">{new Date(entry.createdAt).toLocaleString()}</span>
                <span>
                  <strong>{describe(entry)}</strong>
                  {" by "}
                  {entry.actorName}
                  {entry.actorType === "worker" && " (worker)"}
                  {entry.action !== "deleted" && changedFields.length > 0 && (
                    <span className="text-gray-600"> · changed {changedFields.join(", ")}</span>
                  )}
                  {entry.note && <span className="block text-gray-600">{entry.note}</span>}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
};

export default TimesheetHistory;
