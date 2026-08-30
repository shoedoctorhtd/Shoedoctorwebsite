import { auditValueDiff, buildAuditLogInsert } from "./audit";
import type { AdminActor, AuthenticatedAdmin } from "./admin-types";
import { getDatabase } from "./data";

export const PRODUCT_ADMIN_PERMISSIONS = [
  "view_products",
  "manage_products",
  "change_product_prices",
  "manage_product_images",
  "view_inventory",
  "adjust_inventory",
  "record_offline_sales",
  "view_product_orders",
  "manage_product_orders",
  "cancel_product_orders",
  "verify_product_payments",
] as const;

export type ProductAdminPermission = (typeof PRODUCT_ADMIN_PERMISSIONS)[number];

export function isProductAdminPermission(value: unknown): value is ProductAdminPermission {
  return typeof value === "string" && (PRODUCT_ADMIN_PERMISSIONS as readonly string[]).includes(value);
}

/** Super Admin access is implicit and never depends on mutable grant rows. */
export async function hasProductAdminPermission(
  user: AuthenticatedAdmin,
  permission: ProductAdminPermission,
) {
  if (user.role === "super_admin") return true;
  if (user.legacy) return false;
  try {
    const db = await getDatabase();
    const row = await db
      .prepare(`
        SELECT 1 AS allowed
        FROM admin_product_permissions
        WHERE admin_user_id = ? AND permission = ?
      `)
      .bind(user.id, permission)
      .first<{ allowed: number }>();
    return Boolean(row?.allowed);
  } catch {
    // A missing migration must fail closed for normal admins.
    console.error("Unable to verify product administrator permission.");
    return false;
  }
}

export async function listProductAdminPermissions(adminUserId: string) {
  const db = await getDatabase();
  const rows = await db
    .prepare("SELECT permission FROM admin_product_permissions WHERE admin_user_id = ? ORDER BY permission ASC")
    .bind(adminUserId)
    .all<{ permission: string }>();
  return rows.results
    .map((row) => row.permission)
    .filter(isProductAdminPermission);
}

export async function replaceProductAdminPermissions(
  adminUserId: string,
  permissions: readonly ProductAdminPermission[],
  actor: AdminActor,
) {
  const db = await getDatabase();
  const target = await db
    .prepare("SELECT id, role FROM admin_users WHERE id = ?")
    .bind(adminUserId)
    .first<{ id: string; role: string }>();
  if (!target) throw new Error("Administrator not found.");
  if (target.role !== "admin") {
    throw new Error("Super Admins already inherit every product permission.");
  }
  const before = await listProductAdminPermissions(adminUserId);
  const deduped = [...new Set(permissions)].sort();
  const diff = auditValueDiff(
    { productPermissions: before },
    { productPermissions: deduped },
  );
  if (!diff.changedFields.length) return { before, permissions: before };
  const now = new Date().toISOString();
  const operationId = crypto.randomUUID();
  const result = await db.batch([
    db.prepare(`
      DELETE FROM admin_product_permissions
      WHERE admin_user_id = ?
        AND EXISTS (SELECT 1 FROM admin_users WHERE id = ? AND role = 'admin')
    `).bind(adminUserId, adminUserId),
    ...deduped.map((permission) => db
      .prepare(`
        INSERT INTO admin_product_permissions (admin_user_id, permission, granted_by_admin_id, created_at)
        SELECT ?, ?, ?, ?
        WHERE EXISTS (SELECT 1 FROM admin_users WHERE id = ? AND role = 'admin')
      `)
      .bind(adminUserId, permission, actor.id, now, adminUserId)),
    buildAuditLogInsert(db, {
      actor,
      action: "PRODUCT_PERMISSION_UPDATED",
      entityType: "admin_user",
      entityId: adminUserId,
      previousValues: diff.previousValues,
      newValues: diff.newValues,
      changedFields: diff.changedFields,
      requestId: operationId,
      createdAt: now,
      conditionalOn: {
        sql: "EXISTS (SELECT 1 FROM admin_users WHERE id = ? AND role = 'admin')",
        bindings: [adminUserId],
      },
    }),
  ]);
  if (!result.at(-1)?.meta.changes) throw new Error("Unable to record the permission change.");
  return { before, permissions: deduped };
}
