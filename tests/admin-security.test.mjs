import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const {
  ADMIN_SESSION_COOKIE,
  adminSessionCookieValue: adminSessionCookie,
  clearAdminSessionCookieValue: clearAdminSessionCookie,
} = await import("../lib/admin-cookies.ts");
const {
  hasRequiredAdminRole,
  hasTrustedAdminMutationOrigin: hasTrustedMutationOrigin,
  normalizeAdminEmail: normalizeEmail,
  safeAdminReturnPath: safeReturnPath,
} = await import("../lib/admin-policy.ts");
const {
  hashAdminPassword: hashPassword,
  verifyAdminPassword: verifyPassword,
} = await import("../lib/admin-password.ts");
const { auditValueDiff, safeAuditSnapshot } = await import("../lib/audit.ts");
const { buildOwnerAlertEmail } = await import("../lib/owner-alert-content.ts");

test("normal admins cannot satisfy Super Admin route roles while booking operations can be explicitly permitted", () => {
  assert.equal(hasRequiredAdminRole("admin", ["super_admin"]), false);
  assert.equal(hasRequiredAdminRole("admin", ["admin", "super_admin"]), true);
  assert.equal(hasRequiredAdminRole("super_admin", ["super_admin"]), true);
  assert.equal(hasRequiredAdminRole("admin"), true);
});

test("mutating admin requests require the exact same origin", () => {
  assert.equal(hasTrustedMutationOrigin(new Request("https://shoe.example/api/admin/bookings", { method: "POST", headers: { origin: "https://shoe.example", "sec-fetch-site": "same-origin" } })), true);
  assert.equal(hasTrustedMutationOrigin(new Request("https://shoe.example/api/admin/bookings", { method: "POST", headers: { origin: "https://evil.example" } })), false);
  assert.equal(hasTrustedMutationOrigin(new Request("https://shoe.example/api/admin/bookings", { method: "POST" })), false);
});

test("individual administrator passwords use verifiable Workers-compatible PBKDF2 hashes", async () => {
  const password = "A unique admin password 2026!";
  const hash = await hashPassword(password);
  assert.match(hash, /^pbkdf2_sha256\$310000\$[^$]+\$[^$]+$/);
  assert.equal(await verifyPassword(password, hash), true);
  assert.equal(await verifyPassword("incorrect password", hash), false);
});

test("named-session cookies are host-only, secure, HTTP-only, and same-site", () => {
  const cookie = adminSessionCookie("opaque-token");
  assert.match(cookie, new RegExp(`^${ADMIN_SESSION_COOKIE}=opaque-token;`));
  assert.match(cookie, /; Path=\//);
  assert.match(cookie, /; HttpOnly/);
  assert.match(cookie, /; Secure/);
  assert.match(cookie, /; SameSite=Strict/);
  assert.doesNotMatch(cookie, /Domain=/i);
  assert.match(clearAdminSessionCookie(), /Max-Age=0$/);
});

test("audit snapshots record allowlisted before-and-after values without secrets", () => {
  const diff = auditValueDiff(
    { status: "received", totalAmount: 500, passwordHash: "old-secret", token: "old" },
    { status: "ready", totalAmount: 650, passwordHash: "new-secret", token: "new" },
  );
  assert.deepEqual(diff.changedFields.sort(), ["status", "totalAmount"].sort());
  assert.deepEqual(diff.previousValues, { status: "received", totalAmount: 500 });
  assert.deepEqual(diff.newValues, { status: "ready", totalAmount: 650 });
  assert.deepEqual(safeAuditSnapshot({ status: "ready", password: "no", email: "operator@example.test" }, ["status", "password", "email"]), { status: "ready", email: "operator@example.test" });
});

test("owner security alert content excludes credential fields and retains Nepal-time context", () => {
  const email = buildOwnerAlertEmail({
    id: "audit-1", actorType: "admin", adminUserId: "admin-1", administratorName: "Ram", administratorEmail: "ram@example.test", administratorRole: "admin",
    action: "BOOKING_SOFT_DELETED", entityType: "booking", entityId: "booking-1", bookingReference: "SD-260825-K7", pairReference: null,
    previousValues: { status: "received" }, newValues: { status: "received", deletionReason: "Duplicate record" }, changedFields: ["deletionReason"], reason: "Duplicate record", sessionId: null, requestId: null, createdAt: "2026-08-25T14:29:00.000Z",
  });
  assert.match(email.text, /Ram \(admin\)/);
  assert.match(email.text, /SD-260825-K7/);
  assert.match(email.text, /Nepal|NPT|2026|Aug/i);
  assert.doesNotMatch(email.text, /password|token|cookie/i);
});

test("input normalization blocks open redirects and normalizes admin identity", () => {
  assert.equal(normalizeEmail("  Admin@Example.TEST "), "admin@example.test");
  assert.equal(normalizeEmail("not an email"), "");
  assert.equal(safeReturnPath("/admin/activity?bookingReference=SD-260825-K7"), "/admin/activity?bookingReference=SD-260825-K7");
  assert.equal(safeReturnPath("//evil.example"), "/admin");
  assert.equal(safeReturnPath("https://evil.example"), "/admin");
});

test("migration protects audit/history immutability, soft deletion, and the final active Super Admin", async () => {
  const migration = await readFile(new URL("../migrations/0011_secure_admin_accounts_and_audit.sql", import.meta.url), "utf8");
  for (const required of [
    "CREATE TABLE IF NOT EXISTS admin_users",
    "CREATE TABLE IF NOT EXISTS admin_sessions",
    "CREATE TABLE IF NOT EXISTS audit_logs",
    "CREATE TABLE IF NOT EXISTS owner_alert_events",
    "audit_logs_prevent_update",
    "audit_logs_prevent_delete",
    "booking_status_history_prevent_update",
    "booking_status_history_prevent_delete",
    "admin_users_prevent_final_super_deactivation",
    "admin_users_prevent_final_super_demotion",
    "admin_users_prevent_final_super_delete",
    "deleted_at",
    "created_by_admin_id",
    "record_version",
  ]) assert.match(migration, new RegExp(required));
  assert.doesNotMatch(migration, /DELETE\s+FROM\s+bookings/i);
});

test("the bootstrap is local-only and cannot expose a public first-admin endpoint", async () => {
  const script = await readFile(new URL("../scripts/bootstrap-super-admin.mjs", import.meta.url), "utf8");
  assert.match(script, /--remote/);
  assert.match(script, /shared_login_disabled_at/);
  assert.match(script, /pbkdf2_sha256\$\$\{iterations\}/);
  assert.doesNotMatch(script, /app\/api\/admin\/bootstrap/i);
});

test("booking mutation routes derive the actor from the verified session and enforce role boundaries", async () => {
  const [statusRoute, noteRoute, deletionRoute, detailsRoute, restoreRoute, serviceRoute] = await Promise.all([
    readFile(new URL("../app/api/admin/bookings/[id]/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/admin/bookings/[id]/notes/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/admin/bookings/[id]/delete/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/admin/bookings/[id]/details/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/admin/bookings/[id]/restore/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/admin/services/[id]/route.ts", import.meta.url), "utf8"),
  ]);
  assert.match(statusRoute, /requireAdminApi\(request,[\s\S]*action: "BOOKING_STATUS_CHANGED"/);
  assert.doesNotMatch(statusRoute, /roles:\s*\["super_admin"\]/);
  assert.match(noteRoute, /auth\.user/);
  for (const route of [deletionRoute, detailsRoute, restoreRoute, serviceRoute]) {
    assert.match(route, /roles:\s*\["super_admin"\]/);
    assert.match(route, /requireAdminApi\(request/);
  }
  assert.match(deletionRoute, /confirmationReference/);
  assert.match(deletionRoute, /parseRequiredAdminReason/);
  assert.match(deletionRoute, /entityId: id/);
  assert.doesNotMatch(`${deletionRoute}\n${detailsRoute}\n${restoreRoute}`, /body\.(?:actor|role|adminUserId)/);
});

test("important booking writes use an atomic business, history/audit, and outbox batch", async () => {
  const data = await readFile(new URL("../lib/data.ts", import.meta.url), "utf8");
  for (const operation of [
    "updateBookingStatus",
    "updateBookingItemStatus",
    "updateBookingDetails",
    "softDeleteBooking",
    "restoreBooking",
  ]) {
    const start = data.indexOf(`export async function ${operation}`);
    assert.ok(start >= 0, `${operation} should exist`);
    const section = data.slice(start, start + 9000);
    assert.match(section, /db\.batch\(/, `${operation} should batch its persistence`);
    assert.match(section, /buildAuditLogInsert/, `${operation} should create an audit row`);
  }
  assert.match(data, /last_admin_mutation_id/);
  assert.match(data, /UPDATE booking_notifications[\s\S]{0,900}last_mutation_id/);
});

test("audit history and owner-alert outbox are append-only and idempotency-keyed", async () => {
  const migration = await readFile(new URL("../migrations/0011_secure_admin_accounts_and_audit.sql", import.meta.url), "utf8");
  const alerts = await readFile(new URL("../lib/owner-alerts.ts", import.meta.url), "utf8");
  assert.match(migration, /audit_log_id TEXT NOT NULL UNIQUE/);
  assert.match(migration, /event_key TEXT NOT NULL UNIQUE/);
  assert.match(migration, /booking_operational_notes_prevent_update/);
  assert.match(alerts, /delivery_status = 'pending'/);
  assert.match(alerts, /deliveryStatus !== "skipped"/);
  assert.match(alerts, /delivery_status = 'sending'/);
});

test("legacy and public booking attribution remain distinct and no audit secret field is retained", async () => {
  const data = await readFile(new URL("../lib/data.ts", import.meta.url), "utf8");
  assert.match(data, /createdSource === "admin" && !actor/);
  assert.match(data, /actor \?\? \{[\s\S]*actorType: createdSource === "customer" \? "customer" : "system"/);
  assert.match(data, /:\s*"legacy",\s*\n\s*createdByAdminId/);
  const deletionStart = data.indexOf("function bookingDeletionSnapshot");
  const deletionSnapshot = data.slice(deletionStart, deletionStart + 1800);
  assert.doesNotMatch(deletionSnapshot, /customerName|pickupAddress|\bphone\b|\bemail\b/);
});

test("CSR mutations carry an exact client record version and reject stale writes without a success audit", async () => {
  const [csrData, csrApi, dashboard, requestRoute, validation] = await Promise.all([
    readFile(new URL("../lib/csr-data.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/csr-api.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/components/CsrDonationsDashboard.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/admin/csr-donations/requests/[id]/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/csr-validation.ts", import.meta.url), "utf8"),
  ]);
  assert.match(validation, /parseCsrExpectedUpdatedAt/);
  assert.match(requestRoute, /parseCsrExpectedUpdatedAt\(body\.expectedUpdatedAt\)/);
  assert.match(dashboard, /expectedUpdatedAt: requestEditor\.updatedAt/);
  assert.match(dashboard, /body: JSON\.stringify\(\{ expectedUpdatedAt: target\.item\.updatedAt \}\)/);
  assert.match(csrData, /class CsrMutationConflictError/);
  assert.match(csrData, /WHERE id = \? AND updated_at = \?/);
  assert.match(csrData, /if \(!results\[1\]\?\.meta\.changes\) throw new CsrMutationConflictError\(\)/);
  assert.match(csrApi, /CsrMutationConflictError[\s\S]*?409/);
});
