"use client";

import { useState } from "react";
import Link from "next/link";
import AdminHeader from "@/app/components/AdminHeader";
import type { AdminRole } from "@/lib/admin-types";
import type { Booking } from "@/lib/data";

type Props = { initialBookings: Booking[]; name: string; role: AdminRole };

function formatDate(value: string | null) {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : new Intl.DateTimeFormat("en-NP", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kathmandu" }).format(parsed);
}

export default function DeletedBookingsDashboard({ initialBookings, name, role }: Props) {
  const [bookings, setBookings] = useState(initialBookings);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function restore(booking: Booking) {
    const reason = window.prompt(`Enter the required restoration reason for ${booking.publicReference ?? "this booking"}.`);
    if (reason === null) return;
    setBusy(booking.id); setNotice(null);
    try {
      const response = await fetch(`/api/admin/bookings/${encodeURIComponent(booking.id)}/restore`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ reason, recordVersion: booking.recordVersion }) });
      const result = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(result.message || "Unable to restore booking.");
      setBookings((current) => current.filter((item) => item.id !== booking.id));
      setNotice(`${booking.publicReference ?? "Booking"} was restored to active operations.`);
    } catch (reasonValue) { setNotice(reasonValue instanceof Error ? reasonValue.message : "Unable to restore booking."); }
    finally { setBusy(null); }
  }

  return <main id="main-content" className="admin-shell admin-management-shell">
    <AdminHeader name={name} role={role} />
    <section className="admin-welcome admin-welcome--compact"><div><p className="section-kicker">Super Admin only</p><h1>DELETED<br />BOOKINGS.</h1><p>These records have been removed from active operations but remain stored, auditable, and recoverable.</p></div></section>
    {notice ? <p className="admin-notice" role="status">{notice}</p> : null}
    <section className="admin-panel"><div className="admin-panel-heading"><div><p className="section-kicker">Recoverable records</p><h2>Deletion is never permanent here.</h2></div></div>{bookings.length ? <div className="admin-deleted-list">{bookings.map((booking) => <article className="admin-deleted-row" key={booking.id}><div><strong>{booking.publicReference ?? "Legacy/Unknown"}</strong><span>{booking.customerName} · {booking.pairCount} {booking.pairCount === 1 ? "pair" : "pairs"}</span><small>Deleted by {booking.deletedByAdminName ?? "Legacy/Unknown"} on {formatDate(booking.deletedAt)}</small><p>Reason: {booking.deletionReason ?? "Not recorded"}</p></div><div><Link className="admin-secondary" href={`/admin/bookings/${encodeURIComponent(booking.id)}`}>View details</Link><button className="admin-primary" type="button" disabled={busy === booking.id} onClick={() => void restore(booking)}>{busy === booking.id ? "Restoring…" : "Restore"}</button></div></article>)}</div> : <div className="admin-empty"><strong>No deleted bookings.</strong><p>Soft-deleted records will appear here for Super Admin recovery.</p></div>}</section>
  </main>;
}
