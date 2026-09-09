import { redirect } from "next/navigation";
import { requireAdminUser } from "@/lib/admin-auth";
import { requireProductPagePermission } from "@/lib/product-admin-page";
import { hasProductAdminPermission } from "@/lib/product-permissions";
import { getCounterInventory, listCounterSales } from "@/lib/counter-sales";
import CounterInventoryDashboard from "@/app/components/CounterInventoryDashboard";

export const dynamic = "force-dynamic";

export default async function CounterInventoryPage() {
  const user = await requireAdminUser("/admin/counter-inventory");
  if (user.mustChangePassword) redirect("/admin/change-password");
  await requireProductPagePermission(user, "view_inventory", "/admin/counter-inventory");
  const [canRecord, canViewHistory, inventory] = await Promise.all([
    hasProductAdminPermission(user, "record_offline_sales"),
    hasProductAdminPermission(user, "view_product_orders"),
    getCounterInventory(),
  ]);
  return <CounterInventoryDashboard initialInventory={inventory} canRecord={canRecord}
    initialHistory={canViewHistory ? await listCounterSales() : null} />;
}
