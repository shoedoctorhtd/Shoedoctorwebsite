import { requireAdminApi } from "@/lib/admin-auth";
import { hasProductAdminPermission } from "@/lib/product-permissions";
import { archiveProduct, getAdminProduct, isProductPriceChanged, updateProduct } from "@/lib/product-data";
import { parseProductInput } from "@/lib/product-validation";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi(request, { action: "PRODUCT_VIEW", productPermission: "view_products" });
  if (auth.response) return auth.response;
  const product = await getAdminProduct((await params).id);
  return product ? Response.json({ product }, { headers: { "Cache-Control": "private, no-store" } }) : Response.json({ message: "Product not found." }, { status: 404 });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id;
  const auth = await requireAdminApi(request, {
    action: "PRODUCT_UPDATED",
    mutation: true,
    entityType: "product",
    entityId: id,
    productPermission: "manage_products",
  });
  if (auth.response) return auth.response;
  try {
    const before = await getAdminProduct(id);
    if (!before) return Response.json({ message: "Product not found." }, { status: 404 });
    const input = parseProductInput(await request.json());
    if (isProductPriceChanged(before, input) && !(await hasProductAdminPermission(auth.user, "change_product_prices"))) {
      return Response.json({ message: "You do not have permission to change product prices." }, { status: 403 });
    }
    const result = await updateProduct(id, input, auth.user);
    if (result.kind === "not_found") return Response.json({ message: "Product not found." }, { status: 404 });
    if (result.kind === "conflict") return Response.json({ message: "This product changed. Refresh and try again.", product: result.product }, { status: 409 });
    return Response.json({ product: result.product, unchanged: result.kind === "unchanged" }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return Response.json({ message: error instanceof Error ? error.message : "Unable to update product." }, { status: 400 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id;
  const auth = await requireAdminApi(request, {
    action: "PRODUCT_ARCHIVED",
    mutation: true,
    entityType: "product",
    entityId: id,
    productPermission: "manage_products",
  });
  if (auth.response) return auth.response;
  try {
    const result = await archiveProduct(id, auth.user);
    if (result.kind === "not_found") return Response.json({ message: "Product not found." }, { status: 404 });
    return Response.json({ product: result.product }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return Response.json({ message: error instanceof Error ? error.message : "Unable to archive product." }, { status: 400 });
  }
}
