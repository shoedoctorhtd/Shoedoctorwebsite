import { requireAdminApi } from "@/lib/admin-auth";
import { recordProductOrderReturn } from "@/lib/product-inventory";
import { parseOrderReturn } from "@/lib/product-validation";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id;
  const auth = await requireAdminApi(request, {
    action: "PRODUCT_ORDER_RETURN_RECORDED",
    mutation: true,
    entityType: "product_order",
    entityId: id,
    productPermission: "manage_product_orders",
  });
  if (auth.response) return auth.response;
  try {
    const result = await recordProductOrderReturn(id, parseOrderReturn(await request.json()), auth.user);
    if (result.kind === "not_found") return Response.json({ message: "Order not found." }, { status: 404 });
    return Response.json({ ok: true, duplicate: result.kind === "duplicate" }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return Response.json({ message: error instanceof Error ? error.message : "Unable to record return." }, { status: 400 });
  }
}
