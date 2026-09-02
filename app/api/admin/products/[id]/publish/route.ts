import { requireAdminApi } from "@/lib/admin-auth";
import { publishProduct } from "@/lib/product-data";

export const dynamic = "force-dynamic";

/** Publishes the latest stored draft so stale browser values cannot alter its catalogue data. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id;
  const auth = await requireAdminApi(request, {
    action: "PRODUCT_PUBLISHED",
    mutation: true,
    entityType: "product",
    entityId: id,
    productPermission: "manage_products",
  });
  if (auth.response) return auth.response;

  try {
    const result = await publishProduct(id, auth.user);
    if (result.kind === "not_found") return Response.json({ message: "Product not found." }, { status: 404 });
    if (result.kind === "archived") return Response.json({ message: "Restore this product as a draft before publishing it." }, { status: 409 });
    if (result.kind === "conflict") {
      return Response.json({ message: "This product changed. Refresh and try again.", product: result.product }, { status: 409 });
    }
    return Response.json({ product: result.product, unchanged: result.kind === "unchanged" }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return Response.json({ message: error instanceof Error ? error.message : "Unable to publish product." }, { status: 400 });
  }
}
