import { requireAdminApi } from "@/lib/admin-auth";
import { recordOfflineProductSale } from "@/lib/product-inventory";
import { listProductOrders } from "@/lib/product-order-data";
import { parseOfflineSale, parsePage } from "@/lib/product-validation";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireAdminApi(request, { action: "PRODUCT_ORDER_LIST", productPermission: "view_product_orders" });
  if (auth.response) return auth.response;
  const query = new URL(request.url).searchParams;
  const channel = query.get("channel");
  const status = query.get("status");
  const paymentStatus = query.get("paymentStatus");
  return Response.json(await listProductOrders({
    search: query.get("search") ?? undefined,
    channel: channel === "online" || channel === "offline" ? channel : undefined,
    status: status === "pending" || status === "confirmed" || status === "processing" || status === "completed" || status === "cancelled" ? status : undefined,
    paymentStatus: paymentStatus === "pending" || paymentStatus === "unpaid" || paymentStatus === "partial" || paymentStatus === "paid" || paymentStatus === "refunded" ? paymentStatus : undefined,
    date: query.get("date") ?? undefined,
    page: parsePage(query.get("page")),
  }), { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request) {
  const auth = await requireAdminApi(request, {
    action: "PRODUCT_OFFLINE_SALE_RECORDED",
    mutation: true,
    entityType: "product_order",
    productPermission: "record_offline_sales",
  });
  if (auth.response) return auth.response;
  try {
    const result = await recordOfflineProductSale(parseOfflineSale(await request.json()), auth.user);
    if (result.kind === "stock_conflict") return Response.json({ message: result.message }, { status: 409 });
    return Response.json({ order: result.order, duplicate: result.kind === "duplicate" }, { status: result.kind === "created" ? 201 : 200, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return Response.json({ message: error instanceof Error ? error.message : "Unable to record offline sale." }, { status: 400 });
  }
}
