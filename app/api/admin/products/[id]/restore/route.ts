import { requireAdminApi } from "@/lib/admin-auth";
import { restoreArchivedProduct } from "@/lib/product-data";
import { parseProductUpdatedAt } from "@/lib/product-validation";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id;
  const auth = await requireAdminApi(request, {
    action: "PRODUCT_RESTORED",
    mutation: true,
    entityType: "product",
    entityId: id,
    productPermission: "manage_products",
  });
  if (auth.response) return auth.response;

  try {
    const body = await request.json() as Record<string, unknown>;
    const result = await restoreArchivedProduct(id, auth.user, parseProductUpdatedAt(body.updatedAt));
    if (result.kind === "not_found") return Response.json({ message: "Product not found." }, { status: 404 });
    if (result.kind === "not_archived") return Response.json({ message: "Only archived products can be restored." }, { status: 409 });
    if (result.kind === "conflict") {
      return Response.json({ message: "This product changed. Refresh and try again.", product: result.product }, { status: 409 });
    }
    return Response.json({ product: result.product }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return Response.json({ message: error instanceof Error ? error.message : "Unable to restore product." }, { status: 400 });
  }
}
