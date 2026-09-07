"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import AdminHeader from "@/app/components/AdminHeader";
import type { AdminRole } from "@/lib/admin-types";
import type { AuditLog } from "@/lib/audit";
import type {
  Booking,
  BookingOperationalNote,
  BookingStatus,
  BookingStatusHistory,
  Service,
} from "@/lib/data";
import { getPhysicalPairTag } from "@/lib/booking-reference";

const statuses: BookingStatus[] = [
  "new",
  "confirmed",
  "received",
  "in_progress",
  "completed",
  "ready",
  "cancelled",
];

type Props = {
  initialBooking: Booking;
  name: string;
  role: AdminRole;
  audit: AuditLog[];
  services: Service[];
};

function formatDate(value: string | null) {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? value
    : new Intl.DateTimeFormat("en-NP", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Kathmandu",
      }).format(parsed);
}

function actor(name: string | null, role: string | null = null) {
  return name
    ? `${name}${role ? ` (${role === "super_admin" ? "Super Admin" : "Admin"})` : ""}`
    : "Legacy/Unknown";
}

function creationSource(booking: Booking) {
  if (booking.createdSource === "customer" || booking.createdSource === "system") return "Customer/System";
  if (booking.createdSource === "admin") return "Admin";
  return "Legacy/Unknown";
}

function formatValues(value: Record<string, unknown> | null) {
  if (!value || !Object.keys(value).length) return "—";
  return Object.entries(value)
    .map(([key, item]) => `${key}: ${typeof item === "string" ? item : JSON.stringify(item)}`)
    .join(" · ");
}

function mergeById<T extends { id: string }>(current: T[], incoming: T[]) {
  const byId = new Map(current.map((item) => [item.id, item]));
  incoming.forEach((item) => byId.set(item.id, item));
  return [...byId.values()];
}

function mergeBooking(current: Booking, incoming: Booking): Booking {
  const statusHistory = mergeById<BookingStatusHistory>(current.statusHistory, incoming.statusHistory)
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  const operationalNotes = mergeById<BookingOperationalNote>(current.operationalNotes, incoming.operationalNotes)
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  return {
    ...current,
    ...incoming,
    items: incoming.items.length ? incoming.items : current.items,
    statusHistory,
    operationalNotes,
  };
}

export default function BookingDetailsDashboard({ initialBooking, name, role, audit, services }: Props) {
  const [booking, setBooking] = useState(initialBooking);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const superAdmin = role === "super_admin";
  const deleted = Boolean(booking.deletedAt);

  async function request(path: string, method: "POST" | "PATCH", body: Record<string, unknown>) {
    const response = await fetch(`/api/admin/bookings/${encodeURIComponent(booking.id)}${path}`, {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...body, recordVersion: booking.recordVersion }),
    });
    const result = (await response.json()) as { booking?: Booking; message?: string };
    if (!response.ok || !result.booking) throw new Error(result.message || "Unable to save the booking.");
    const next = mergeBooking(booking, result.booking);
    setBooking(next);
    return next;
  }

  async function changeStatus(status: BookingStatus) {
    setBusy("status");
    setMessage(null);
    try {
      await request("", "PATCH", { status });
      setMessage("Booking status saved with administrator attribution.");
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Unable to update status.");
    } finally {
      setBusy(null);
    }
  }

  async function changePair(pairId: string, status: BookingStatus) {
    setBusy(pairId);
    setMessage(null);
    try {
      await request(`/pairs/${encodeURIComponent(pairId)}`, "PATCH", { status });
      setMessage("Pair status saved with an immutable history entry.");
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Unable to update pair status.");
    } finally {
      setBusy(null);
    }
  }

  async function changePairService(pairId: string, serviceId: string) {
    setBusy(`service:${pairId}`);
    setMessage(null);
    try {
      await request(`/pairs/${encodeURIComponent(pairId)}/service`, "PATCH", { serviceId });
      setMessage("Pair service, price subtotal, and final total were updated with a Super Admin audit record.");
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Unable to update pair service.");
    } finally {
      setBusy(null);
    }
  }

  async function addNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const note = String(new FormData(event.currentTarget).get("note") ?? "");
    setBusy("note");
    setMessage(null);
    try {
      await request("/notes", "POST", { note });
      event.currentTarget.reset();
      setMessage("Operational note added. Notes are append-only.");
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Unable to add note.");
    } finally {
      setBusy(null);
    }
  }

  async function saveDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy("details");
    setMessage(null);
    try {
      await request("/details", "PATCH", {
        customerName: form.get("customerName"),
        phone: form.get("phone"),
        email: form.get("email"),
        preferredDate: form.get("preferredDate"),
        fulfillmentMethod: form.get("fulfillmentMethod"),
        pickupArea: form.get("pickupArea"),
        pickupAddress: form.get("pickupAddress"),
        locationUrl: form.get("locationUrl"),
        notes: form.get("notes"),
        totalAmount: form.get("totalAmount"),
        discountAmount: form.get("discountAmount"),
        paymentAmount: form.get("paymentAmount"),
        paymentStatus: form.get("paymentStatus"),
      });
      setMessage("Booking details saved and audited. An owner alert was queued for high-risk changes.");
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Unable to save booking details.");
    } finally {
      setBusy(null);
    }
  }

  async function deleteBooking() {
    const confirmationReference = window.prompt(
      `Type ${booking.publicReference ?? "the booking reference"} to confirm recoverable deletion.`,
    );
    if (confirmationReference === null) return;
    const reason = window.prompt("Enter the required deletion or void reason.");
    if (reason === null) return;
    setBusy("delete");
    setMessage(null);
    try {
      await request("/delete", "POST", { confirmationReference, reason });
      setMessage("Booking was soft-deleted. It remains stored and can be restored by a Super Admin.");
    } catch (reasonValue) {
      setMessage(reasonValue instanceof Error ? reasonValue.message : "Unable to delete booking.");
    } finally {
      setBusy(null);
    }
  }

  async function restoreBooking() {
    const reason = window.prompt("Enter the required restoration reason.");
    if (reason === null) return;
    setBusy("restore");
    setMessage(null);
    try {
      await request("/restore", "POST", { reason });
      setMessage("Booking restored to active operations.");
    } catch (reasonValue) {
      setMessage(reasonValue instanceof Error ? reasonValue.message : "Unable to restore booking.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <main id="main-content" className="admin-shell admin-management-shell">
      <AdminHeader name={name} role={role} backLabel="Bookings" />
      <section className="admin-welcome admin-welcome--compact">
        <div>
          <p className="section-kicker">Booking record</p>
          <h1>{booking.publicReference ?? "LEGACY"}<br />DETAILS.</h1>
          <p>{deleted ? "Deleted booking — Super Admin access only." : "Operational record with server-derived administrator attribution."}</p>
        </div>
      </section>
      {message ? <p className="admin-notice" role="status">{message}</p> : null}

      <section className="admin-panel admin-detail-grid">
        <article className="admin-detail-card">
          <p className="section-kicker">Attribution</p>
          <dl>
            <dt>Creation source</dt><dd>{creationSource(booking)}</dd>
            <dt>Entered by</dt><dd>{booking.createdSource === "admin" ? actor(booking.createdByAdminName) : creationSource(booking)}</dd>
            <dt>Last updated by</dt><dd>{actor(booking.updatedByAdminName)}</dd>
            <dt>Record version</dt><dd>{booking.recordVersion}</dd>
            {booking.deletedAt ? <><dt>Deleted by</dt><dd>{actor(booking.deletedByAdminName)}</dd><dt>Deletion reason</dt><dd>{booking.deletionReason ?? "—"}</dd><dt>Deleted</dt><dd>{formatDate(booking.deletedAt)}</dd></> : null}
            {booking.restoredAt ? <><dt>Restored by</dt><dd>{actor(booking.restoredByAdminName)}</dd><dt>Restoration reason</dt><dd>{booking.restorationReason ?? "—"}</dd></> : null}
          </dl>
        </article>
        <article className="admin-detail-card">
          <p className="section-kicker">Customer & booking</p>
          <dl>
            <dt>Customer</dt><dd>{booking.customerName}</dd>
            <dt>Phone</dt><dd>{booking.phone}</dd>
            <dt>Email</dt><dd>{booking.email ?? "—"}</dd>
            <dt>Collection</dt><dd>{booking.fulfillmentMethod === "pickup_delivery" ? "Pickup & delivery" : "Self drop-off"}</dd>
            <dt>Pairs</dt><dd>{booking.pairCount}</dd>
            <dt>Final price</dt><dd>{booking.totalAmount === null ? "Quote after review" : `Rs ${booking.totalAmount}`}</dd>
            <dt>Payment</dt><dd>{booking.paymentStatus ?? "Legacy/Unknown"}{booking.paymentAmount !== null ? ` · Rs ${booking.paymentAmount}` : ""}</dd>
          </dl>
        </article>
      </section>

      <section className="admin-panel">
        <div className="admin-panel-heading">
          <div><p className="section-kicker">{deleted ? "Preserved booking state" : "Operations"}</p><h2>{deleted ? "Every stored pair." : "Track every pair."}</h2></div>
        </div>
        <div className="admin-pair-status-list">
          {booking.items.map((item) => (
            <article className="admin-pair-status-row" key={item.id}>
              <div>
                <strong>{booking.publicReference ? getPhysicalPairTag(booking.publicReference, item.pairNumber) : `Pair ${item.pairNumber}`}</strong>
                <span>{item.serviceName} · {item.footwearType}{item.brand ? ` · ${item.brand}` : ""}</span>
                {item.specialRequest ? <small>Request: {item.specialRequest}</small> : null}
              </div>
              {deleted ? <span className="status-pill">{(item.status ?? booking.status).replaceAll("_", " ")}</span> : <label><span>Pair status</span><select value={item.status ?? booking.status} disabled={busy === item.id} onChange={(event) => void changePair(item.id, event.target.value as BookingStatus)}>{statuses.map((status) => <option value={status} key={status}>{status.replaceAll("_", " ")}</option>)}</select></label>}
              {!deleted && superAdmin ? <label><span>Pair service</span><select value={item.serviceId} disabled={busy === `service:${item.id}`} onChange={(event) => void changePairService(item.id, event.target.value)}>{services.map((service) => <option value={service.id} key={service.id}>{service.name} — {service.priceLabel}</option>)}</select></label> : null}
            </article>
          ))}
        </div>
        {!deleted ? <><div className="admin-operation-row"><label><span>Overall booking status</span><select value={booking.status} disabled={busy === "status"} onChange={(event) => void changeStatus(event.target.value as BookingStatus)}>{statuses.map((status) => <option value={status} key={status}>{status.replaceAll("_", " ")}</option>)}</select></label></div><form className="admin-note-form" onSubmit={addNote}><label><span>Add operational note</span><textarea name="note" rows={3} maxLength={800} required placeholder="Internal operational note. It cannot be edited or deleted." /></label><button className="admin-primary" type="submit" disabled={busy === "note"}>{busy === "note" ? "Saving…" : "Add note"}</button></form></> : null}
        {booking.operationalNotes.length ? <ol className="admin-note-list">{booking.operationalNotes.map((note) => <li key={note.id}><strong>{actor(note.administratorName, note.administratorRole)}</strong><time>{formatDate(note.createdAt)}</time><p>{note.note}</p></li>)}</ol> : <p className="admin-empty">No operational notes recorded.</p>}
      </section>

      {superAdmin && !deleted ? <section className="admin-panel"><div className="admin-panel-heading"><div><p className="section-kicker">Super Admin controls</p><h2>Correct booking details.</h2></div><button className="admin-danger" type="button" disabled={busy === "delete"} onClick={() => void deleteBooking()}>Soft-delete booking</button></div><form className="admin-form-grid" key={booking.recordVersion} onSubmit={saveDetails}><label><span>Customer name</span><input name="customerName" defaultValue={booking.customerName} required /></label><label><span>Phone</span><input name="phone" defaultValue={booking.phone} required /></label><label><span>Email</span><input name="email" type="email" defaultValue={booking.email ?? ""} /></label><label><span>Preferred date</span><input name="preferredDate" type="date" defaultValue={booking.preferredDate ?? ""} /></label><label><span>Collection method</span><select name="fulfillmentMethod" defaultValue={booking.fulfillmentMethod}><option value="self_dropoff">Self drop-off</option><option value="pickup_delivery">Pickup & delivery</option></select></label><label><span>Pickup area</span><select name="pickupArea" defaultValue={booking.pickupArea ?? ""}><option value="">Not applicable</option><option value="hetauda_city">Hetauda City</option><option value="other_city">Other city</option></select></label><label className="full-field"><span>Pickup address</span><input name="pickupAddress" defaultValue={booking.pickupAddress ?? ""} /></label><label className="full-field"><span>Map link</span><input name="locationUrl" defaultValue={booking.locationUrl ?? ""} /></label><label><span>Final price (Rs)</span><input name="totalAmount" type="number" min="0" defaultValue={booking.totalAmount ?? ""} /></label><label><span>Discount (Rs)</span><input name="discountAmount" type="number" min="0" defaultValue={booking.discountAmount ?? ""} /></label><label><span>Payment amount (Rs)</span><input name="paymentAmount" type="number" min="0" defaultValue={booking.paymentAmount ?? ""} /></label><label><span>Payment status</span><select name="paymentStatus" defaultValue={booking.paymentStatus ?? "unpaid"}><option value="unpaid">Unpaid</option><option value="partial">Partial</option><option value="paid">Paid</option><option value="refunded">Refunded</option></select></label><label className="full-field"><span>Booking notes</span><textarea name="notes" rows={3} defaultValue={booking.notes ?? ""} /></label><div className="modal-actions full-field"><button className="admin-primary" type="submit" disabled={busy === "details"}>{busy === "details" ? "Saving…" : "Save audited changes"}</button></div></form></section> : null}

      {superAdmin && deleted ? <section className="admin-panel"><div className="admin-panel-heading"><div><p className="section-kicker">Recoverable deletion</p><h2>This record is still stored.</h2></div><button className="admin-primary" type="button" disabled={busy === "restore"} onClick={() => void restoreBooking()}>{busy === "restore" ? "Restoring…" : "Restore booking"}</button></div></section> : null}

      <section className="admin-panel"><div className="admin-panel-heading"><div><p className="section-kicker">Immutable status history</p><h2>What changed.</h2></div></div><ol className="admin-audit-list">{booking.statusHistory.length ? booking.statusHistory.map((history) => <li key={history.id}><time>{formatDate(history.createdAt)}</time><div><strong>{history.pairReference ?? "Booking"}: {history.previousStatus} → {history.newStatus}</strong><span>{actor(history.administratorName ?? history.changedBy, history.administratorRole)}</span></div></li>) : <li><span>Legacy booking with no recorded status changes.</span></li>}</ol></section>

      {superAdmin ? <section className="admin-panel"><div className="admin-panel-heading"><div><p className="section-kicker">Complete allowed audit timeline</p><h2>Administrator activity.</h2></div><Link className="admin-secondary" href={`/admin/activity?bookingReference=${encodeURIComponent(booking.publicReference ?? "")}`}>Open activity</Link></div><ol className="admin-audit-list">{audit.length ? audit.map((entry) => <li key={entry.id}><time>{formatDate(entry.createdAt)}</time><div><strong>{actor(entry.administratorName, entry.administratorRole)} — {entry.action}</strong><span>{formatValues(entry.previousValues)} → {formatValues(entry.newValues)}</span>{entry.reason ? <em>Reason: {entry.reason}</em> : null}</div></li>) : <li><span>No current audit records for this booking.</span></li>}</ol></section> : null}
    </main>
  );
}
