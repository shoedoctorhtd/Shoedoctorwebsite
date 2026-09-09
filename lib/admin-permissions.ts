import { getDatabase } from "./data";
import { buildAuditLogInsert, buildOwnerAlertEventInsert } from "./audit";
import type { AdminActor } from "./admin-types";
import { ADMIN_ACTION_MODULES, isAdminPermission, parseAdminPermissions, permissionLabel, type AdminPermission } from "./admin-permission-policy";

export async function listAdminPermissions(adminUserId: string): Promise<AdminPermission[]> {
  const db = await getDatabase();
  try {
    const rows = await db.prepare("SELECT permission_key FROM admin_permissions WHERE admin_user_id = ? ORDER BY permission_key").bind(adminUserId).all<{ permission_key: string }>();
    return rows.results.map((row) => row.permission_key).filter(isAdminPermission);
  } catch (error) {
    if (!isMissingPermissionsTable(error)) throw error;
    // A push may deploy before 0018. Preserve only the verified pre-migration
    // table's grants and the operations those accounts already had. Never fall
    // back after migration: its compatibility VIEW cannot satisfy this check.
    const legacy = await db.prepare("SELECT 1 AS present FROM sqlite_master WHERE type = 'table' AND name = 'admin_product_permissions'").first<{ present: number }>();
    if (!legacy?.present) throw error;
    const rows = await db.prepare("SELECT permission FROM admin_product_permissions WHERE admin_user_id = ?").bind(adminUserId).all<{ permission: string }>();
    const granted = new Set<AdminPermission>(["dashboard", "bookings", "counter_booking", "counter_inventory", "record_offline_sales", ...rows.results.map((row) => row.permission).filter(isAdminPermission)]);
    for (const key of [...granted]) {
      if (["manage_products", "change_product_prices", "manage_product_images", "adjust_inventory", "manage_product_orders", "cancel_product_orders", "verify_product_payments"].includes(key)) {
        for (const parentModule of ADMIN_ACTION_MODULES[key]?.slice(0, 1) ?? []) granted.add(parentModule);
      }
    }
    return [...granted].sort();
  }
}

export async function assertAdminPermissionSchema() {
  const db = await getDatabase();
  try { await db.prepare("SELECT 1 FROM admin_permissions LIMIT 1").first(); }
  catch (error) {
    if (isMissingPermissionsTable(error)) throw new Error("Apply D1 migration 0018 before creating administrators or saving access permissions.");
    throw error;
  }
}

function isMissingPermissionsTable(error: unknown) {
  return error instanceof Error && /no such table:\s*(?:main\.)?admin_permissions\b/iu.test(error.message);
}

/** Never trust a role or id supplied in JSON. The caller passes its verified session actor. */
export async function assertPermissionManager(actor: AdminActor) {
  const db = await getDatabase();
  const current = actor.role === "super_admin" && actor.sessionId
    ? await db.prepare(`SELECT 1 AS allowed FROM admin_users u JOIN admin_sessions s ON s.admin_user_id = u.id
        WHERE u.id = ? AND u.role = 'super_admin' AND u.active = 1 AND u.must_change_password = 0
          AND s.id = ? AND s.revoked_at IS NULL AND s.expires_at > ?`)
      .bind(actor.id, actor.sessionId, new Date().toISOString()).first<{ allowed: number }>() : null;
  if (!current?.allowed) throw new Error("Forbidden: only a verified Super Admin can change administrator access.");
}

export function permissionGrantStatements(db: Awaited<ReturnType<typeof getDatabase>>, id: string, permissions: readonly AdminPermission[], actorId: string, now: string, operationId?: string) {
  return permissions.map((key) => db.prepare(`INSERT INTO admin_permissions (admin_user_id, permission_key, granted_by_admin_id, created_at, updated_at)
    SELECT ?, ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM admin_users WHERE id = ? AND role = 'admin' ${operationId ? "AND last_mutation_id = ?" : ""})`)
    .bind(id, key, actorId, now, now, id, ...(operationId ? [operationId] : [])));
}

/** Optimistic account revision + grants + immutable audit + existing email outbox, one D1 transaction. */
export async function replaceAdminPermissions(id: string, input: unknown, actor: AdminActor, expectedUpdatedAt: unknown) {
  await assertPermissionManager(actor);
  await assertAdminPermissionSchema();
  const permissions = parseAdminPermissions(input);
  const db = await getDatabase();
  const target = await db.prepare("SELECT id, name, email, role, updated_at FROM admin_users WHERE id = ?").bind(id)
    .first<{ id: string; name: string; email: string; role: string; updated_at: string }>();
  if (!target) return { kind: "not_found" as const };
  if (target.role !== "admin") return { kind: "super_admin" as const };
  if (!expectedUpdatedAt || target.updated_at !== expectedUpdatedAt) return { kind: "conflict" as const };
  const before = await listAdminPermissions(id);
  const granted = permissions.filter((key) => !before.includes(key));
  const removed = before.filter((key) => !permissions.includes(key));
  if (!granted.length && !removed.length) return { kind: "unchanged" as const, permissions, updatedAt: target.updated_at };
  const now = new Date(Math.max(Date.now(), Date.parse(target.updated_at) + 1)).toISOString();
  const operationId = crypto.randomUUID();
  const auditId = crypto.randomUUID();
  const ownerAlertEventId = crypto.randomUUID();
  const conditionalOn = { sql: "EXISTS (SELECT 1 FROM admin_users WHERE id = ? AND role = 'admin' AND last_mutation_id = ?)", bindings: [id, operationId] };
  const result = await db.batch([
    db.prepare(`UPDATE admin_users SET updated_at = ?, last_mutation_id = ? WHERE id = ? AND role = 'admin' AND updated_at = ?
      AND EXISTS (SELECT 1 FROM admin_users a JOIN admin_sessions s ON s.admin_user_id = a.id
        WHERE a.id = ? AND a.role = 'super_admin' AND a.active = 1 AND a.must_change_password = 0
          AND s.id = ? AND s.revoked_at IS NULL AND s.expires_at > ?)`)
      .bind(now, operationId, id, target.updated_at, actor.id, actor.sessionId, now),
    ...removed.map((key) => db.prepare(`DELETE FROM admin_permissions WHERE admin_user_id = ? AND permission_key = ? AND ${conditionalOn.sql}`).bind(id, key, ...conditionalOn.bindings)),
    ...permissionGrantStatements(db, id, granted, actor.id, now, operationId),
    buildAuditLogInsert(db, { id: auditId, actor, action: "ADMIN_PERMISSIONS_UPDATED", entityType: "admin_user", entityId: id,
      previousValues: { permissions: before }, newValues: { adminName: target.name, adminEmail: target.email, permissions, granted: granted.map(permissionLabel), removed: removed.map(permissionLabel) },
      changedFields: ["permissions"], reason: `${actor.name} updated access for ${target.name}. Granted: ${granted.map(permissionLabel).join(", ") || "None"}. Removed: ${removed.map(permissionLabel).join(", ") || "None"}.`,
      createdAt: now, requestId: operationId, conditionalOn }),
    buildOwnerAlertEventInsert(db, { id: ownerAlertEventId, auditLogId: auditId, alertType: "ADMIN_PERMISSIONS_UPDATED", createdAt: now, conditionalOn }),
  ]);
  if (!result[0]?.meta.changes) return { kind: "conflict" as const };
  return { kind: "updated" as const, permissions, updatedAt: now, ownerAlertEventId };
}
