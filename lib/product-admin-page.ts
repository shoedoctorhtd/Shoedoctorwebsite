import { redirect } from "next/navigation";
import type { AuthenticatedAdmin } from "./admin-types";
import { hasProductAdminPermission, type ProductAdminPermission } from "./product-permissions";

/** Server-page counterpart to requireAdminApi: server-rendered admin pages
 * fail closed before exposing product, order, or inventory data. */
export async function requireProductPagePermission(
  user: AuthenticatedAdmin,
  permission: ProductAdminPermission,
  returnTo: string,
) {
  if (await hasProductAdminPermission(user, permission)) return;
  redirect(`/admin/access-denied?from=${encodeURIComponent(returnTo)}`);
}
