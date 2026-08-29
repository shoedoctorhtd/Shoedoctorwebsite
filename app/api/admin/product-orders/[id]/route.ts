import { requireAdminApi } from "@/lib/admin-auth";
import { getProductOrder, updateProductOrderDetails } from "@/lib/product-order-data";
import { parseProductOrderStatus, parseProductPaymentStatus } from "@/lib/product-validation";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi(request, { action: "PRODUCT_ORDER_VIEW", productPermission: "view_product_orders" });
  if (auth.response) return auth.response;
  const order = await getProductOrder((await params).id);
  return order
    ? Response.json({ order }, { headers: { "Cache-Control": "private, no-store" } })
    : Response.json({ message: "Order not found." }, { status: 404 });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id;
  const auth = await requireAdminApi(request, {
    action: "PRODUCT_ORDER_UPDATED",
    mutation: true,
    entityType: "product_order",
    entityId: id,
    productPermission: "manage_product_orders",
  });
  if (auth.response) return auth.response;
  try {
    const body = await request.json() as Record<string, unknown>;
    const result = await updateProductOrderDetails(id, {
      status: body.status === undefined ? undefined : parseProductOrderStatus(body.status),
      paymentStatus: body.paymentStatus === undefined ? undefined : parseProductPaymentStatus(body.paymentStatus),
    }, auth.user);
    if (result.kind === "not_found") return Response.json({ message: "Order not found." }, { status: 404 });
    if (result.kind === "conflict") return Response.json({ message: "This order changed. Refresh and try again.", order: result.order }, { status: 409 });
    return Response.json({ order: result.order, unchanged: result.kind === "unchanged" }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return Response.json({ message: error instanceof Error ? error.message : "Unable to update order." }, { status: 400 });
  }
}
