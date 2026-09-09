import type { AuthenticatedAdmin, AdminActor } from "./admin-types";
import { hasAdminPermission, PRODUCT_ADMIN_PERMISSIONS, type ProductAdminPermission } from "./admin-permission-policy";
import { listAdminPermissions, replaceAdminPermissions } from "./admin-permissions";
export { PRODUCT_ADMIN_PERMISSIONS, type ProductAdminPermission } from "./admin-permission-policy";

export function isProductAdminPermission(value: unknown): value is ProductAdminPermission {
  return typeof value === "string" && (PRODUCT_ADMIN_PERMISSIONS as readonly string[]).includes(value);
}

export async function hasProductAdminPermission(user: AuthenticatedAdmin, permission: ProductAdminPermission) {
  return hasAdminPermission(user, permission);
}

export async function listProductAdminPermissions(id: string) {
  return (await listAdminPermissions(id)).filter(isProductAdminPermission);
}

/** Compatibility adapter; the unified manager owns concurrency, audit and email. */
export async function replaceProductAdminPermissions(id: string, permissions: readonly ProductAdminPermission[], actor: AdminActor, updatedAt: unknown) {
  const existing = await listAdminPermissions(id);
  return replaceAdminPermissions(id, [...existing.filter((key) => !isProductAdminPermission(key)), ...permissions], actor, updatedAt);
}
