import { requireAdminApi } from "@/lib/admin-auth";
import { cancelProductOrder } from "@/lib/product-inventory";
import { parseOrderCancellation } from "@/lib/product-validation";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id;
  const auth = await requireAdminApi(request, {
    action: "PRODUCT_ORDER_CANCELLED",
    mutation: true,
    entityType: "product_order",
    entityId: id,
    productPermission: "cancel_product_orders",
    permission: "view_product_orders",
  });
  if (auth.response) return auth.response;
  try {
    const input = parseOrderCancellation(await request.json());
    const result = await cancelProductOrder(id, input.reason, auth.user, input.idempotencyKey);
    if (result.kind === "not_found") return Response.json({ message: "Order not found." }, { status: 404 });
    if (result.kind === "conflict") return Response.json({ message: result.message }, { status: 409 });
    return Response.json({ order: result.order, duplicate: result.kind === "already_cancelled" }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return Response.json({ message: error instanceof Error ? error.message : "Unable to cancel order." }, { status: 400 });
  }
}
