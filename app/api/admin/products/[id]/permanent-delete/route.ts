import { requireAdminApi } from "@/lib/admin-auth";
import { deliverOwnerAlertEvent } from "@/lib/owner-alerts";
import { permanentlyDeleteUnusedProduct } from "@/lib/product-data";
import { parseProductUpdatedAt } from "@/lib/product-validation";

export const dynamic = "force-dynamic";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id;
  const auth = await requireAdminApi(request, {
    action: "PRODUCT_PERMANENTLY_DELETED",
    mutation: true,
    entityType: "product",
    entityId: id,
    roles: ["super_admin"],
    productPermission: "manage_products",
  });
  if (auth.response) return auth.response;

  try {
    const body = await request.json() as Record<string, unknown>;
    if (body.confirmation !== "DELETE") {
      return Response.json({ message: "Type DELETE to permanently remove this product." }, { status: 400 });
    }
    const result = await permanentlyDeleteUnusedProduct(id, auth.user, parseProductUpdatedAt(body.updatedAt));
    if (result.kind === "not_found") return Response.json({ message: "Product not found." }, { status: 404 });
    if (result.kind === "not_deletable_status") {
      return Response.json({ message: "Archive this product before permanently deleting it." }, { status: 409 });
    }
    if (result.kind === "has_business_history") {
      return Response.json({ message: "This product has order, return, or meaningful inventory history and cannot be permanently deleted. Archive it instead." }, { status: 409 });
    }
    if (result.kind === "conflict") {
      return Response.json({ message: "This product changed. Refresh and try again.", product: result.product }, { status: 409 });
    }
    await deliverOwnerAlertEvent(result.ownerAlertEventId);
    return Response.json({ ok: true }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return Response.json({ message: error instanceof Error ? error.message : "Unable to permanently delete product." }, { status: 400 });
  }
}
