import type { getDatabase } from "./data";
import type { AdminActor, AdminRole } from "./admin-types";

type Database = Awaited<ReturnType<typeof getDatabase>>;

export type AuditActorType = "admin" | "customer" | "system" | "legacy";

export type AuditActor =
  | (AdminActor & { actorType?: "admin" })
  | {
      actorType: Exclude<AuditActorType, "admin">;
      id?: null;
      name?: string | null;
      email?: string | null;
      role?: null;
      sessionId?: string | null;
    };

export type AuditLogInput = {
  id?: string;
  actor: AuditActor;
  action: string;
  entityType: string;
  entityId?: string | null;
  bookingReference?: string | null;
  pairReference?: string | null;
  previousValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  changedFields?: readonly string[];
  reason?: string | null;
  requestId?: string | null;
  createdAt?: string;
  conditionalOn?: { sql: string; bindings: readonly unknown[] };
};

export type AuditLog = {
  id: string;
  actorType: AuditActorType;
  adminUserId: string | null;
  administratorName: string | null;
  administratorEmail: string | null;
  administratorRole: AdminRole | null;
  action: string;
  entityType: string;
  entityId: string | null;
  bookingReference: string | null;
  pairReference: string | null;
  previousValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  changedFields: string[];
  reason: string | null;
  sessionId: string | null;
  requestId: string | null;
  createdAt: string;
  ownerAlertStatus?: "pending" | "sending" | "sent" | "failed" | "skipped" | null;
  ownerAlertId?: string | null;
  ownerAlertLeaseExpiresAt?: string | null;
};

export type AuditLogPage = {
  records: AuditLog[];
  total: number;
  page: number;
  pageSize: number;
};

export type AuditLogFilters = {
  action?: string | null;
  administrator?: string | null;
  bookingReference?: string | null;
  entityType?: string | null;
  from?: string | null;
  to?: string | null;
  page?: number;
  pageSize?: number;
};

const SENSITIVE_KEY = /(?:password|hash|token|cookie|authorization|secret|oauth|refresh)/iu;

/**
 * Produces one prepared D1 statement so callers can append an audit row to the
 * same D1 batch as the business mutation.  Values are aggressively redacted
 * here as a final defence; callers should still pass field allowlists only.
 */
export function buildAuditLogInsert(db: Database, input: AuditLogInput) {
  const id = input.id ?? crypto.randomUUID();
  const createdAt = input.createdAt ?? new Date().toISOString();
  const actor = normalizeActor(input.actor);
  const changedFields = [...new Set((input.changedFields ?? []).map(cleanField))]
    .filter(Boolean)
    .slice(0, 40);

  const values = [
    id,
    actor.actorType,
    actor.id,
    actor.name,
    actor.email,
    actor.role,
    cleanField(input.action),
    cleanField(input.entityType),
    cleanText(input.entityId, 160),
    cleanText(input.bookingReference, 80),
    cleanText(input.pairReference, 100),
    jsonValue(input.previousValues),
    jsonValue(input.newValues),
    JSON.stringify(changedFields),
    cleanText(input.reason, 800),
    cleanText(actor.sessionId, 160),
    cleanText(input.requestId, 160),
    createdAt,
  ];
  const insertValues = input.conditionalOn
    ? `SELECT ${values.map(() => "?").join(", ")} WHERE ${input.conditionalOn.sql}`
    : `VALUES (${values.map(() => "?").join(", ")})`;
  return db
    .prepare(`
      INSERT INTO audit_logs (
        id, actor_type, admin_user_id, administrator_name_snapshot,
        administrator_email_snapshot, administrator_role_snapshot, action,
        entity_type, entity_id, booking_reference, pair_reference,
        previous_values, new_values, changed_fields, reason, session_id,
        request_id, created_at
      ) ${insertValues}
    `)
    .bind(...values, ...(input.conditionalOn?.bindings ?? []));
}

export function buildOwnerAlertEventInsert(
  db: Database,
  input: {
    id?: string;
    auditLogId: string;
    alertType: string;
    eventKey?: string;
    createdAt?: string;
    ignoreDuplicate?: boolean;
    conditionalOn?: { sql: string; bindings: readonly unknown[] };
  },
) {
  const id = input.id ?? crypto.randomUUID();
  const now = input.createdAt ?? new Date().toISOString();
  const eventKey = input.eventKey ?? `audit:${input.auditLogId}`;
  const values = [id, input.auditLogId, eventKey, cleanField(input.alertType), now, now];
  const insertValues = input.conditionalOn
    ? `SELECT ?, ?, ?, ?, 'pending', 1, ?, ? WHERE ${input.conditionalOn.sql}`
    : "VALUES (?, ?, ?, ?, 'pending', 1, ?, ?)";
  return db
    .prepare(`
      INSERT ${input.ignoreDuplicate ? "OR IGNORE " : ""}INTO owner_alert_events (
        id, audit_log_id, event_key, alert_type, delivery_status, attempt_count,
        created_at, updated_at
      ) ${insertValues}
    `)
    .bind(...values, ...(input.conditionalOn?.bindings ?? []));
}

export async function appendAuditLog(input: AuditLogInput) {
  const { getDatabase } = await import("./data");
  const db = await getDatabase();
  await db.batch([buildAuditLogInsert(db, input)]);
}

export async function listAuditLogs(
  filters: AuditLogFilters = {},
): Promise<AuditLogPage> {
  const { getDatabase } = await import("./data");
  const db = await getDatabase();
  const pageSize = Math.max(10, Math.min(100, Math.round(filters.pageSize ?? 30)));
  const page = Math.max(1, Math.round(filters.page ?? 1));
  const where: string[] = [];
  const values: string[] = [];

  const administrator = cleanText(filters.administrator, 120);
  if (administrator) {
    where.push("(a.administrator_name_snapshot LIKE ? OR a.administrator_email_snapshot LIKE ?)");
    values.push(`%${administrator}%`, `%${administrator}%`);
  }
  const bookingReference = cleanText(filters.bookingReference, 80);
  if (bookingReference) {
    where.push("a.booking_reference = ?");
    values.push(bookingReference.toUpperCase());
  }
  const action = cleanText(filters.action, 100);
  if (action) {
    where.push("a.action = ?");
    values.push(action);
  }
  const entityType = cleanText(filters.entityType, 80);
  if (entityType) {
    where.push("a.entity_type = ?");
    values.push(entityType);
  }
  const from = cleanText(filters.from, 30);
  const fromBound = from && nepalCalendarDayUtc(from);
  if (fromBound) {
    where.push("a.created_at >= ?");
    values.push(fromBound);
  }
  const to = cleanText(filters.to, 30);
  const toBound = to && nepalCalendarDayUtc(to, 1);
  if (toBound) {
    where.push("a.created_at < ?");
    values.push(toBound);
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const [rows, count] = await Promise.all([
    db
      .prepare(`
        SELECT a.*, o.id AS owner_alert_id, o.delivery_status AS owner_alert_status,
               o.lease_expires_at AS owner_alert_lease_expires_at
        FROM audit_logs a
        LEFT JOIN owner_alert_events o ON o.audit_log_id = a.id
        ${whereSql}
        ORDER BY a.created_at DESC, a.id DESC
        LIMIT ? OFFSET ?
      `)
      .bind(...values, pageSize, (page - 1) * pageSize)
      .all<Record<string, unknown>>(),
    db
      .prepare(`SELECT COUNT(*) AS count FROM audit_logs a ${whereSql}`)
      .bind(...values)
      .first<{ count: number }>(),
  ]);

  return {
    records: rows.results.map(parseAuditLog),
    total: Number(count?.count ?? 0),
    page,
    pageSize,
  };
}

export async function listBookingAuditLogs(bookingId: string, bookingReference?: string | null) {
  const { getDatabase } = await import("./data");
  const db = await getDatabase();
  const rows = await db
    .prepare(`
      SELECT a.*, o.id AS owner_alert_id, o.delivery_status AS owner_alert_status,
             o.lease_expires_at AS owner_alert_lease_expires_at
      FROM audit_logs a
      LEFT JOIN owner_alert_events o ON o.audit_log_id = a.id
      WHERE a.entity_id = ?
         OR (a.entity_type = 'booking' AND a.entity_id = ?)
         OR (? IS NOT NULL AND a.booking_reference = ?)
      ORDER BY a.created_at ASC, a.id ASC
    `)
    .bind(bookingId, bookingId, bookingReference ?? null, bookingReference ?? null)
    .all<Record<string, unknown>>();
  return rows.results.map(parseAuditLog);
}

export function parseAuditLog(row: Record<string, unknown>): AuditLog {
  return {
    id: String(row.id),
    actorType: normalizeActorType(row.actor_type),
    adminUserId: nullableText(row.admin_user_id),
    administratorName: nullableText(row.administrator_name_snapshot),
    administratorEmail: nullableText(row.administrator_email_snapshot),
    administratorRole:
      row.administrator_role_snapshot === "super_admin" ||
      row.administrator_role_snapshot === "admin"
        ? row.administrator_role_snapshot
        : null,
    action: String(row.action),
    entityType: String(row.entity_type),
    entityId: nullableText(row.entity_id),
    bookingReference: nullableText(row.booking_reference),
    pairReference: nullableText(row.pair_reference),
    previousValues: parseJsonObject(row.previous_values),
    newValues: parseJsonObject(row.new_values),
    changedFields: parseStringArray(row.changed_fields),
    reason: nullableText(row.reason),
    sessionId: nullableText(row.session_id),
    requestId: nullableText(row.request_id),
    createdAt: String(row.created_at),
    ownerAlertStatus:
      row.owner_alert_status === "pending" ||
      row.owner_alert_status === "sending" ||
      row.owner_alert_status === "sent" ||
      row.owner_alert_status === "failed" ||
      row.owner_alert_status === "skipped"
        ? row.owner_alert_status
        : null,
    ownerAlertId: nullableText(row.owner_alert_id),
    ownerAlertLeaseExpiresAt: nullableText(row.owner_alert_lease_expires_at),
  };
}

/** Kathmandu has no daylight-saving change. Convert a displayed Nepal
 * calendar day to the corresponding UTC database boundary. */
function nepalCalendarDayUtc(value: string, offsetDays = 0) {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const localMidnight = Date.UTC(year, month - 1, day + offsetDays);
  const check = new Date(Date.UTC(year, month - 1, day));
  if (
    !Number.isFinite(localMidnight) ||
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day
  ) return null;
  return new Date(localMidnight - (5 * 60 + 45) * 60 * 1000).toISOString();
}

export function auditValueDiff(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
) {
  const previousValues: Record<string, unknown> = {};
  const newValues: Record<string, unknown> = {};
  const changedFields: string[] = [];
  const fields = new Set([...Object.keys(before), ...Object.keys(after)]);
  fields.forEach((field) => {
    if (SENSITIVE_KEY.test(field)) return;
    const previous = sanitizeValue(before[field]);
    const next = sanitizeValue(after[field]);
    if (JSON.stringify(previous) === JSON.stringify(next)) return;
    previousValues[field] = previous;
    newValues[field] = next;
    changedFields.push(field);
  });
  return { previousValues, newValues, changedFields };
}

export function safeAuditSnapshot(
  value: Record<string, unknown>,
  allow: readonly string[],
) {
  return allow.reduce<Record<string, unknown>>((snapshot, field) => {
    if (Object.prototype.hasOwnProperty.call(value, field) && !SENSITIVE_KEY.test(field)) {
      snapshot[field] = sanitizeValue(value[field]);
    }
    return snapshot;
  }, {});
}

function normalizeActor(actor: AuditActor) {
  if ("role" in actor && (actor.role === "admin" || actor.role === "super_admin")) {
    return {
      actorType: "admin" as const,
      id: cleanText(actor.id, 160),
      name: cleanText(actor.name, 160),
      email: cleanText(actor.email, 160),
      role: actor.role,
      sessionId: cleanText(actor.sessionId, 160),
    };
  }
  return {
    actorType: actor.actorType,
    id: null,
    name: cleanText(actor.name, 160),
    email: cleanText(actor.email, 160),
    role: null,
    sessionId: null,
  };
}

function normalizeActorType(value: unknown): AuditActorType {
  return value === "admin" || value === "customer" || value === "system" || value === "legacy"
    ? value
    : "legacy";
}

function jsonValue(value: Record<string, unknown> | null | undefined) {
  if (!value) return null;
  return JSON.stringify(sanitizeValue(value));
}

function sanitizeValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.slice(0, 40).map(sanitizeValue);
  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).reduce<Record<string, unknown>>(
      (result, [key, child]) => {
        if (!SENSITIVE_KEY.test(key)) result[key] = sanitizeValue(child);
        return result;
      },
      {},
    );
  }
  if (typeof value === "string") return value.slice(0, 800);
  if (typeof value === "number" || typeof value === "boolean" || value === null) return value;
  return String(value).slice(0, 800);
}

function parseJsonObject(value: unknown) {
  if (typeof value !== "string") return null;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? sanitizeValue(parsed) as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

function parseStringArray(value: unknown) {
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map((item) => cleanField(item)).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function nullableText(value: unknown) {
  const text = cleanText(value, 1000);
  return text || null;
}

function cleanField(value: unknown) {
  return String(value ?? "").trim().replace(/[^a-zA-Z0-9_.:-]/gu, "_").slice(0, 100);
}

function cleanText(value: unknown, maxLength: number) {
  const text = String(value ?? "").trim().replace(/[\u0000-\u001f\u007f]/gu, " ");
  return text ? text.slice(0, maxLength) : null;
}
