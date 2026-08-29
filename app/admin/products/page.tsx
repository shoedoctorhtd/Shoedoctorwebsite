import { redirect } from "next/navigation";
import ProductAdminDashboard from "@/app/components/ProductAdminDashboard";
import { requireAdminUser } from "@/lib/admin-auth";
import { requireProductPagePermission } from "@/lib/product-admin-page";
import { hasProductAdminPermission } from "@/lib/product-permissions";
import { listAdminProducts } from "@/lib/product-data";
import type { Product } from "@/lib/product-types";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const user = await requireAdminUser("/admin/products");
  if (user.mustChangePassword) redirect("/admin/change-password");
  await requireProductPagePermission(user, "view_products", "/admin/products");
  let products: Product[] = [];
  try { products = await listAdminProducts(); } catch { /* controlled UI starts empty until migration is applied */ }
  return <ProductAdminDashboard initialProducts={products} capabilities={{
    canManage: await hasProductAdminPermission(user, "manage_products"),
    canChangePrice: await hasProductAdminPermission(user, "change_product_prices"),
    canManageImages: await hasProductAdminPermission(user, "manage_product_images"),
    canAdjustInventory: await hasProductAdminPermission(user, "adjust_inventory"),
  }} />;
}
