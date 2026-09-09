import { requireAdminApi } from "@/lib/admin-auth";
import { getProductOrder } from "@/lib/product-order-data";
import { cancelProductOrder } from "@/lib/product-inventory";
import { parseOrderCancellation } from "@/lib/product-validation";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id;
  const auth = await requireAdminApi(request, { action: "COUNTER_SALE_REVERSED", mutation: true,
    entityType: "product_order", entityId: id, productPermission: "cancel_product_orders" });
  if (auth.response) return auth.response;
  try {
    const order = await getProductOrder(id);
    if (!order || order.channel !== "offline") return Response.json({ message: "Counter sale not found." }, { status: 404 });
    const body = await request.json() as Record<string, unknown>;
    const input = parseOrderCancellation({ ...body, reason: typeof body.reason === "string" && body.reason.trim() ? body.reason : "Counter sale reversed" });
    const result = await cancelProductOrder(id, input.reason, auth.user, input.idempotencyKey);
    if (result.kind === "not_found") return Response.json({ message: "Counter sale not found." }, { status: 404 });
    if (result.kind === "conflict") return Response.json({ message: "The sale changed or has prior returns. Refresh its history before reversing." }, { status: 409 });
    return Response.json({ order: result.order, duplicate: result.kind === "already_cancelled" }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return Response.json({ message: error instanceof Error ? error.message : "Unable to reverse counter sale." }, { status: 400 });
  }
}
