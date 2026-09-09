import { notFound, redirect } from "next/navigation";
import { requireAdminUser } from "@/lib/admin-auth";
import { hasProductAdminPermission } from "@/lib/product-permissions";
import { getCounterSale } from "@/lib/counter-sales";
import CounterSaleDetails from "@/app/components/CounterSaleDetails";

export const dynamic = "force-dynamic";

export default async function CounterSalePage({ params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id;
  const user = await requireAdminUser(`/admin/counter-inventory/${encodeURIComponent(id)}`);
  if (user.mustChangePassword) redirect("/admin/change-password");
  const detail = await getCounterSale(id);
  if (!detail) notFound();
  return <CounterSaleDetails detail={detail} canReverse={await hasProductAdminPermission(user, "cancel_product_orders")} />;
}
