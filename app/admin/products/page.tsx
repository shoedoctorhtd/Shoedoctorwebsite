import { redirect } from "next/navigation";
import ProductAdminDashboard from "@/app/components/ProductAdminDashboard";
import { requireAdminUser } from "@/lib/admin-auth";
import { requireProductPagePermission } from "@/lib/product-admin-page";
import { hasProductAdminPermission } from "@/lib/product-permissions";
import {
  getProductImageStorageSummary,
  listAdminProductPage,
  type ProductListPage,
} from "@/lib/product-data";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const user = await requireAdminUser("/admin/products");
  if (user.mustChangePassword) redirect("/admin/change-password");
  await requireProductPagePermission(user, "view_products", "/admin/products");
  const [canManage, canChangePrice, canManageImages, canAdjustInventory] = await Promise.all([
    hasProductAdminPermission(user, "manage_products"),
    hasProductAdminPermission(user, "change_product_prices"),
    hasProductAdminPermission(user, "manage_product_images"),
    hasProductAdminPermission(user, "adjust_inventory"),
  ]);
  let productPage: ProductListPage = { products: [], page: 1, pageSize: 50, hasMore: false };
  let storage = { imageCount: 0, bytesUsed: 0, byteLimit: 50 * 1024 * 1024 };
  try {
    [productPage, storage] = await Promise.all([
      listAdminProductPage({}, { page: 1, pageSize: 50 }),
      canManageImages ? getProductImageStorageSummary() : Promise.resolve(storage),
    ]);
  } catch {
    // Controlled UI starts empty until the product migrations are applied.
  }
  return <ProductAdminDashboard
    initialProducts={productPage.products}
    initialPage={productPage.page}
    initialPageSize={productPage.pageSize}
    initialHasMore={productPage.hasMore}
    initialStorage={storage}
    capabilities={{
    canManage,
    canChangePrice,
    canManageImages,
    canAdjustInventory,
    }}
  />;
}
