import { redirect } from "next/navigation";
import InventoryDashboard from "@/app/components/InventoryDashboard";
import { requireAdminUser } from "@/lib/admin-auth";
import { requireProductPagePermission } from "@/lib/product-admin-page";
import { hasProductAdminPermission } from "@/lib/product-permissions";
import { listAdminProducts } from "@/lib/product-data";
import { listInventoryMovements } from "@/lib/product-inventory";
import { listProductOrders } from "@/lib/product-order-data";
import { parsePage } from "@/lib/product-validation";

export const dynamic = "force-dynamic";

export default async function InventoryPage({ searchParams }: { searchParams: Promise<{ product?: string; page?: string }> }) {
  const user = await requireAdminUser("/admin/inventory");
  if (user.mustChangePassword) redirect("/admin/change-password");
  await requireProductPagePermission(user, "view_inventory", "/admin/inventory");
  const query = await searchParams;
  const productId = query.product;
  const page = parsePage(query.page ?? null);
  const [canAdjust, canReturn] = await Promise.all([
    hasProductAdminPermission(user, "adjust_inventory"),
    hasProductAdminPermission(user, "manage_product_orders"),
  ]);
  const [products, history, completed] = await Promise.all([
    listAdminProducts(),
    listInventoryMovements(productId, { page }),
    canReturn ? listProductOrders({ status: "completed", pageSize: 100 }) : Promise.resolve({ orders: [] }),
  ]);
  return <InventoryDashboard
    initialProducts={products}
    initialMovements={history.movements}
    initialHistoryPage={history.page}
    initialHistoryPageSize={history.pageSize}
    initialHistoryTotal={history.total}
    initialCompletedOrders={completed.orders}
    selectedProductId={productId}
    canAdjust={canAdjust}
    canReturn={canReturn}
  />;
}
