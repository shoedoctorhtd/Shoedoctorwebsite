import { requireAdminApi } from "@/lib/admin-auth";
import { approveProductQrPayment } from "@/lib/product-payments";
import { parsePaymentApproval } from "@/lib/product-validation";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id;
  const auth = await requireAdminApi(request, {
    action: "PRODUCT_QR_PAYMENT_APPROVE",
    mutation: true,
    entityType: "product_order",
    entityId: id,
    productPermission: "verify_product_payments",
  });
  if (auth.response) return auth.response;
  try {
    const input = parsePaymentApproval(await request.json());
    const result = await approveProductQrPayment(id, auth.user, input.idempotencyKey);
    if (result.kind === "not_found") return Response.json({ message: "Order not found." }, { status: 404 });
    if (result.kind === "conflict") return Response.json({ message: "The payment changed. Refresh and try again.", order: result.order }, { status: 409 });
    return Response.json({ order: result.order, duplicate: result.kind === "duplicate" }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return Response.json({ message: error instanceof Error ? error.message : "Unable to approve payment." }, { status: 400 });
  }
}
