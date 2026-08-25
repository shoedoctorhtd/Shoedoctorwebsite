import { buildAuditLogInsert, parseAuditLog, type AuditLog } from "./audit";
import { sendOwnerEmail } from "./booking-email";
import { getDatabase } from "./data";
import type { AdminActor } from "./admin-types";
import { buildOwnerAlertEmail as renderOwnerAlertEmail } from "./owner-alert-content";

export type OwnerAlertEvent = {
  id: string;
  auditLogId: string;
  alertType: string;
  deliveryStatus: "pending" | "sending" | "sent" | "failed" | "skipped";
  attemptCount: number;
  errorSummary: string | null;
  sentAt: string | null;
  leaseExpiresAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export async function deliverOwnerAlertEvent(id: string) {
  try {
    const db = await getDatabase();
    const event = await findOwnerAlertEvent(id);
    if (!event) return { kind: "not_found" as const };
    const now = new Date();
    const nowIso = now.toISOString();
    const claimToken = crypto.randomUUID();
    const leaseExpiresAt = new Date(now.getTime() + 5 * 60 * 1000).toISOString();
    const claim = await db
      .prepare(`
        UPDATE owner_alert_events
        SET delivery_status = 'sending', lease_token = ?, lease_expires_at = ?, updated_at = ?
        WHERE id = ? AND (
          delivery_status = 'pending'
          OR (delivery_status = 'sending' AND lease_expires_at IS NOT NULL AND lease_expires_at <= ?)
        )
      `)
      .bind(claimToken, leaseExpiresAt, nowIso, id, nowIso)
      .run();
    if (!claim.meta.changes) {
      return { kind: "not_pending" as const, event: (await findOwnerAlertEvent(id)) ?? event };
    }

    const row = await db
      .prepare(`
        SELECT a.*
        FROM audit_logs a
        INNER JOIN owner_alert_events o ON o.audit_log_id = a.id
        WHERE o.id = ?
      `)
      .bind(id)
      .first<Record<string, unknown>>();
    if (!row) {
      const failed = await recordOwnerAlertResult(id, claimToken, "failed", "audit_record_unavailable");
      return { kind: "failed" as const, event: failed };
    }

    const audit = parseAuditLog(row);
    const delivery = await sendOwnerEmail(buildOwnerAlertEmail(audit));
    const status = delivery.status === "sent" ? "sent" : delivery.status === "not_configured" ? "skipped" : "failed";
    const result = await recordOwnerAlertResult(
      id,
      claimToken,
      status,
      delivery.status === "sent" ? null : delivery.status === "not_configured" ? "owner_alert_not_configured" : "owner_alert_delivery_failed",
    );
    return {
      kind: delivery.status === "sent" ? ("sent" as const) : status === "skipped" ? ("skipped" as const) : ("failed" as const),
      event: result,
    };
  } catch (error) {
    console.error("Unable to deliver persisted owner alert.", error);
    return { kind: "delivery_error" as const };
  }
}

export async function retryOwnerAlertEvent(id: string, actor: AdminActor) {
  const db = await getDatabase();
  const row = await db
    .prepare(`
      SELECT o.*, a.booking_reference
      FROM owner_alert_events o
      INNER JOIN audit_logs a ON a.id = o.audit_log_id
      WHERE o.id = ?
    `)
    .bind(id)
    .first<Record<string, unknown>>();
  if (!row) return { kind: "not_found" as const };
  const event = parseOwnerAlertEvent(row);
  const now = new Date().toISOString();
  const expiredLease =
    event.deliveryStatus === "sending" &&
    Boolean(event.leaseExpiresAt) &&
    Date.parse(event.leaseExpiresAt!) <= Date.parse(now);
  if (event.deliveryStatus !== "pending" && event.deliveryStatus !== "failed" && event.deliveryStatus !== "skipped" && !expiredLease) {
    return { kind: "not_retryable" as const, event };
  }
  const auditId = crypto.randomUUID();
  const operationId = crypto.randomUUID();
  const claimed = await db.batch([
    db
      .prepare(`
        UPDATE owner_alert_events
        SET delivery_status = 'pending', attempt_count = attempt_count + 1,
            error_summary = NULL, lease_token = NULL, lease_expires_at = NULL,
            updated_at = ?, last_mutation_id = ?
        WHERE id = ? AND (
          delivery_status = 'pending'
          OR
          delivery_status = 'failed'
          OR delivery_status = 'skipped'
          OR (delivery_status = 'sending' AND lease_expires_at IS NOT NULL AND lease_expires_at <= ?)
        )
      `)
      .bind(now, operationId, id, now),
    buildAuditLogInsert(db, {
      id: auditId,
      actor,
      action: "OWNER_ALERT_RETRIED",
      entityType: "owner_alert",
      entityId: id,
      bookingReference: row.booking_reference ? String(row.booking_reference) : null,
      previousValues: { deliveryStatus: event.deliveryStatus, attemptCount: event.attemptCount },
      newValues: { deliveryStatus: "pending", attemptCount: event.attemptCount + 1 },
      changedFields: ["deliveryStatus", "attemptCount"],
      createdAt: now,
      conditionalOn: {
        sql: "EXISTS (SELECT 1 FROM owner_alert_events WHERE id = ? AND last_mutation_id = ?)",
        bindings: [id, operationId],
      },
    }),
  ]);
  if (!claimed[0]?.meta.changes || !claimed[1]?.meta.changes) {
    return { kind: "not_retryable" as const, event: (await findOwnerAlertEvent(id)) ?? event };
  }
  return deliverOwnerAlertEvent(id);
}

export async function findOwnerAlertEvent(id: string): Promise<OwnerAlertEvent | null> {
  const db = await getDatabase();
  const row = await db
    .prepare("SELECT * FROM owner_alert_events WHERE id = ?")
    .bind(id)
    .first<Record<string, unknown>>();
  return row ? parseOwnerAlertEvent(row) : null;
}

/** Recover durable alerts that were committed just before a Worker request
 * ended. Claiming remains lease-protected, so concurrent Super Admin logins
 * cannot send the same pending event twice. */
export async function deliverPendingOwnerAlerts(limit = 10) {
  const db = await getDatabase();
  const rows = await db
    .prepare(`
      SELECT id FROM owner_alert_events
      WHERE delivery_status = 'pending'
      ORDER BY created_at ASC
      LIMIT ?
    `)
    .bind(Math.max(1, Math.min(25, Math.trunc(limit))))
    .all<{ id: string }>();
  await Promise.allSettled(rows.results.map((row) => deliverOwnerAlertEvent(row.id)));
  return rows.results.length;
}

export function buildOwnerAlertEmail(audit: AuditLog) {
  return renderOwnerAlertEmail(audit);
}

async function recordOwnerAlertResult(
  id: string,
  claimToken: string,
  status: OwnerAlertEvent["deliveryStatus"],
  errorSummary: string | null,
) {
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db
    .prepare(`
      UPDATE owner_alert_events
      SET delivery_status = ?, error_summary = ?, sent_at = ?, lease_token = NULL,
          lease_expires_at = NULL, updated_at = ?
      WHERE id = ? AND delivery_status = 'sending' AND lease_token = ?
    `)
    .bind(status, errorSummary, status === "sent" ? now : null, now, id, claimToken)
    .run();
  return (await findOwnerAlertEvent(id))!;
}

function parseOwnerAlertEvent(row: Record<string, unknown>): OwnerAlertEvent {
  return {
    id: String(row.id),
    auditLogId: String(row.audit_log_id),
    alertType: String(row.alert_type),
    deliveryStatus:
      row.delivery_status === "sending" || row.delivery_status === "sent" || row.delivery_status === "failed" || row.delivery_status === "skipped"
        ? row.delivery_status
        : "pending",
    attemptCount: Number(row.attempt_count ?? 0),
    errorSummary: row.error_summary ? String(row.error_summary) : null,
    sentAt: row.sent_at ? String(row.sent_at) : null,
    leaseExpiresAt: row.lease_expires_at ? String(row.lease_expires_at) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}
