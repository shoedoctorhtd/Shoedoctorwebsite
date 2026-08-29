import { notFound, redirect } from "next/navigation";
import ProductOrderDetailsDashboard from "@/app/components/ProductOrderDetailsDashboard";
import { requireAdminUser } from "@/lib/admin-auth";
import { requireProductPagePermission } from "@/lib/product-admin-page";
import { hasProductAdminPermission } from "@/lib/product-permissions";
import { getProductOrder } from "@/lib/product-order-data";

export const dynamic = "force-dynamic";

export default async function AdminProductOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdminUser("/admin/product-orders");
  if (user.mustChangePassword) redirect("/admin/change-password");
  await requireProductPagePermission(user, "view_product_orders", "/admin/product-orders");
  const order = await getProductOrder((await params).id);
  if (!order) notFound();
  return <ProductOrderDetailsDashboard initialOrder={order} canManage={await hasProductAdminPermission(user, "manage_product_orders")} canCancel={await hasProductAdminPermission(user, "cancel_product_orders")} />;
}
