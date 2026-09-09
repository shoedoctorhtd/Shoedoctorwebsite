"use client";

import { useAdminAccess, AdminLink as Link } from "./AdminAccessProvider";
import { useState } from "react";
import AdminHeader from "@/app/components/AdminHeader";
import type { AdminRole } from "@/lib/admin-types";
import type { AuditLog, AuditLogFilters, AuditLogPage } from "@/lib/audit";

type Props = {
  initial: AuditLogPage;
  filters: Omit<AuditLogFilters, "page" | "pageSize">;
  name: string;
  role: AdminRole;
  error: string | null;
};

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-NP", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Kathmandu",
      }).format(date);
}

function formatValues(values: Record<string, unknown> | null) {
  if (!values || Object.keys(values).length === 0) return "None";
  return Object.entries(values)
    .map(([field, value]) => `${field}: ${typeof value === "string" ? value : JSON.stringify(value)}`)
    .join("; ");
}

function activityTarget(record: AuditLog) {
  return [record.bookingReference, record.pairReference].filter(Boolean).join(" / ")
    || [record.entityType, record.entityId].filter(Boolean).join(" / ");
}

function pageHref(filters: Props["filters"], page: number) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value) search.set(key, String(value));
  }
  search.set("page", String(page));
  return `/admin/activity?${search.toString()}`;
}

function retryable(record: AuditLog) {
  if (!record.ownerAlertId || !record.ownerAlertStatus) return false;
  if (["pending", "failed", "skipped"].includes(record.ownerAlertStatus)) return true;
  const leaseExpiresAt = record.ownerAlertLeaseExpiresAt;
  return record.ownerAlertStatus === "sending" && leaseExpiresAt !== null && leaseExpiresAt !== undefined
    && Date.parse(leaseExpiresAt) <= Date.now();
}

export default function AdminActivityDashboard({ initial, filters, name, role, error }: Props) {
  const { can } = useAdminAccess();
  const [records, setRecords] = useState(initial.records);
  const [notice, setNotice] = useState<string | null>(error);
  const [busy, setBusy] = useState<string | null>(null);

  async function retryAlert(record: AuditLog) {
    if (!record.ownerAlertId) return;
    setBusy(record.id);
    setNotice(null);
    try {
      const response = await fetch(`/api/admin/owner-alerts/${encodeURIComponent(record.ownerAlertId)}/retry`, {
        method: "POST",
      });
      const result = (await response.json()) as {
        event?: { deliveryStatus?: AuditLog["ownerAlertStatus"] };
        message?: string;
      };
      if (!response.ok) throw new Error(result.message || "Unable to retry the owner alert.");
      setRecords((current) => current.map((candidate) => candidate.id === record.id
        ? {
            ...candidate,
            ownerAlertStatus: result.event?.deliveryStatus ?? "pending",
            ownerAlertLeaseExpiresAt: null,
          }
        : candidate));
      setNotice(result.message || "Owner-alert retry queued. Refresh activity to see the final delivery state.");
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : "Unable to retry the owner alert.");
    } finally {
      setBusy(null);
    }
  }

  const first = (initial.page - 1) * initial.pageSize + 1;
  const last = Math.min(initial.total, initial.page * initial.pageSize);
  const hasPrevious = initial.page > 1;
  const hasNext = last < initial.total;

  return (
    <main id="main-content" className="admin-shell admin-management-shell">
      <AdminHeader name={name} role={role} />
      <section className="admin-welcome admin-welcome--compact">
        <div>
          <p className="section-kicker">Super Admin only</p>
          <h1>ADMIN<br />ACTIVITY.</h1>
          <p>Append-only security and operational records. Times are shown in Nepal time (Asia/Kathmandu).</p>
        </div>
      </section>
      {notice ? <p className={error ? "admin-notice admin-notice--error" : "admin-notice"} role="status">{notice}</p> : null}
      <section className="admin-panel">
        <div className="admin-panel-heading">
          <div><p className="section-kicker">Search and filters</p><h2>Find activity</h2></div>
        </div>
        <form className="admin-filter-form" action="/admin/activity">
          <label><span>Administrator</span><input name="administrator" defaultValue={filters.administrator ?? ""} placeholder="Name or email" /></label>
          <label><span>Booking reference</span><input name="bookingReference" defaultValue={filters.bookingReference ?? ""} placeholder="SD-YYMMDD-XX" /></label>
          <label><span>Action</span><input name="action" defaultValue={filters.action ?? ""} placeholder="BOOKING_DELETED" /></label>
          <label><span>Entity</span><input name="entityType" defaultValue={filters.entityType ?? ""} placeholder="booking, admin_user..." /></label>
          <label><span>From (Nepal date)</span><input type="date" name="from" defaultValue={filters.from ?? ""} /></label>
          <label><span>To (Nepal date)</span><input type="date" name="to" defaultValue={filters.to ?? ""} /></label>
          <div className="modal-actions"><button className="admin-primary" type="submit">Apply filters</button><Link className="admin-secondary" href="/admin/activity">Clear</Link></div>
        </form>
      </section>
      <section className="admin-panel">
        <div className="admin-panel-heading">
          <div><p className="section-kicker">Immutable audit log</p><h2>Activity records</h2></div>
          {initial.total ? <small>{first}-{last} of {initial.total}</small> : null}
        </div>
        {records.length ? <div className="admin-activity-list">
          {records.map((record) => <article className="admin-activity-row" key={record.id}>
            <time dateTime={record.createdAt}>{formatDate(record.createdAt)}</time>
            <div>
              <b>{record.action.replaceAll("_", " ")}</b>
              <strong>{record.administratorName ?? (record.actorType === "customer" ? "Customer/System" : "Legacy/Unknown")}{record.administratorRole ? ` (${record.administratorRole === "super_admin" ? "Super Admin" : "Admin"})` : ""}</strong>
              <span>{activityTarget(record)}</span>
              <p><em>Before:</em> {formatValues(record.previousValues)}</p>
              <p><em>After:</em> {formatValues(record.newValues)}</p>
              {record.reason ? <p><em>Reason:</em> {record.reason}</p> : null}
            </div>
            <aside>
              <span className="admin-role-pill">{record.actorType}</span>
              {record.ownerAlertStatus ? <span className={`admin-alert-status ${record.ownerAlertStatus}`}>Owner alert: {record.ownerAlertStatus}</span> : null}
              {can("notifications") && retryable(record) ? <button type="button" disabled={busy === record.id} onClick={() => void retryAlert(record)}>{busy === record.id ? "Retrying..." : "Retry alert"}</button> : null}
            </aside>
          </article>)}
        </div> : <div className="admin-empty"><strong>No activity matches these filters.</strong><p>New administrator and booking actions will appear here after migration 0011 is applied.</p></div>}
        {initial.total > initial.pageSize ? <nav className="admin-pagination" aria-label="Activity pages">
          {hasPrevious ? <Link className="admin-secondary" href={pageHref(filters, initial.page - 1)}>Previous</Link> : <span />}
          <span>Page {initial.page}</span>
          {hasNext ? <Link className="admin-secondary" href={pageHref(filters, initial.page + 1)}>Next</Link> : <span />}
        </nav> : null}
      </section>
    </main>
  );
}
