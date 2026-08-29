import { redirect } from "next/navigation";
import ProductOrdersDashboard from "@/app/components/ProductOrdersDashboard";
import { requireAdminUser } from "@/lib/admin-auth";
import { requireProductPagePermission } from "@/lib/product-admin-page";
import { hasProductAdminPermission } from "@/lib/product-permissions";
import { listAdminProducts } from "@/lib/product-data";
import { listProductOrders, type ProductOrderListFilters } from "@/lib/product-order-data";
import { parsePage } from "@/lib/product-validation";

export const dynamic = "force-dynamic";

export default async function AdminProductOrdersPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireAdminUser("/admin/product-orders");
  if (user.mustChangePassword) redirect("/admin/change-password");
  await requireProductPagePermission(user, "view_product_orders", "/admin/product-orders");
  const query = await searchParams;
  const filter: ProductOrderListFilters = {
    search: query.search,
    channel: query.channel === "online" || query.channel === "offline" ? query.channel : undefined,
    status: query.status === "pending" || query.status === "confirmed" || query.status === "processing" || query.status === "completed" || query.status === "cancelled" ? query.status : undefined,
    paymentStatus: query.paymentStatus === "pending" || query.paymentStatus === "unpaid" || query.paymentStatus === "partial" || query.paymentStatus === "paid" || query.paymentStatus === "refunded" ? query.paymentStatus : undefined,
    date: query.date,
    page: parsePage(query.page ?? null),
  };
  const [result, products] = await Promise.all([listProductOrders(filter), listAdminProducts()]);
  return <ProductOrdersDashboard initialOrders={result.orders} products={products} filters={filter} page={result.page} pageSize={result.pageSize} total={result.total} canRecordOffline={await hasProductAdminPermission(user, "record_offline_sales")} canManage={await hasProductAdminPermission(user, "manage_product_orders")} canCancel={await hasProductAdminPermission(user, "cancel_product_orders")} />;
}
