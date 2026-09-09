import { redirect } from "next/navigation";
import { requireAdminUser } from "@/lib/admin-auth";
import { getCounterInventory, listCounterSales } from "@/lib/counter-sales";
import CounterInventoryDashboard from "@/app/components/CounterInventoryDashboard";

export const dynamic = "force-dynamic";

export default async function CounterInventoryPage() {
  const user = await requireAdminUser("/admin/counter-inventory");
  if (user.mustChangePassword) redirect("/admin/change-password");
  const [inventory, history] = await Promise.all([getCounterInventory(), listCounterSales()]);
  return <CounterInventoryDashboard
    initialInventory={inventory}
    canRecord={!user.legacy}
    initialHistory={history}
  />;
}
