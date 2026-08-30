import { notFound, redirect } from "next/navigation";
import ProductOrderDetailsDashboard from "@/app/components/ProductOrderDetailsDashboard";
import { requireAdminUser } from "@/lib/admin-auth";
import { requireProductPagePermission } from "@/lib/product-admin-page";
import { hasProductAdminPermission } from "@/lib/product-permissions";
import { getProductOrder, listProductOrderAuditTrail, listProductPaymentReceipts } from "@/lib/product-order-data";

export const dynamic = "force-dynamic";

export default async function AdminProductOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdminUser("/admin/product-orders");
  if (user.mustChangePassword) redirect("/admin/change-password");
  await requireProductPagePermission(user, "view_product_orders", "/admin/product-orders");
  const order = await getProductOrder((await params).id);
  if (!order) notFound();
  const [receipts, auditTrail, canManage, canCancel, canVerifyPayments] = await Promise.all([
    listProductPaymentReceipts(order.id),
    listProductOrderAuditTrail(order.id),
    hasProductAdminPermission(user, "manage_product_orders"),
    hasProductAdminPermission(user, "cancel_product_orders"),
    hasProductAdminPermission(user, "verify_product_payments"),
  ]);
  return <ProductOrderDetailsDashboard
    initialOrder={order}
    receipts={receipts}
    auditTrail={auditTrail}
    canManage={canManage}
    canCancel={canCancel}
    canVerifyPayments={canVerifyPayments}
  />;
}
