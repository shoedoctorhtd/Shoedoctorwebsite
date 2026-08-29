import { requireAdminApi } from "@/lib/admin-auth";
import { deleteProductImage, updateProductImage } from "@/lib/product-images";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; imageId: string }> }) {
  const { id, imageId } = await params;
  const auth = await requireAdminApi(request, {
    action: "PRODUCT_IMAGE_UPDATED",
    mutation: true,
    entityType: "product_image",
    entityId: imageId,
    productPermission: "manage_product_images",
  });
  if (auth.response) return auth.response;
  try {
    const body = await request.json() as Record<string, unknown>;
    const sortOrder = body.sortOrder === undefined ? undefined : Number(body.sortOrder);
    if (sortOrder !== undefined && (!Number.isSafeInteger(sortOrder) || sortOrder < 0 || sortOrder > 100_000)) {
      return Response.json({ message: "Image order is invalid." }, { status: 400 });
    }
    if (body.isPrimary !== undefined && typeof body.isPrimary !== "boolean") {
      return Response.json({ message: "Primary image state is invalid." }, { status: 400 });
    }
    const result = await updateProductImage(id, imageId, { isPrimary: body.isPrimary as boolean | undefined, sortOrder }, auth.user);
    return result.kind === "not_found"
      ? Response.json({ message: "Image not found." }, { status: 404 })
      : Response.json({ image: result.image }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return Response.json({ message: error instanceof Error ? error.message : "Unable to update image." }, { status: 400 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string; imageId: string }> }) {
  const { id, imageId } = await params;
  const auth = await requireAdminApi(request, {
    action: "PRODUCT_IMAGE_DELETED",
    mutation: true,
    entityType: "product_image",
    entityId: imageId,
    productPermission: "manage_product_images",
  });
  if (auth.response) return auth.response;
  try {
    const result = await deleteProductImage(id, imageId, auth.user);
    return result.kind === "not_found"
      ? Response.json({ message: "Image not found." }, { status: 404 })
      : Response.json({ ok: true }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return Response.json({ message: error instanceof Error ? error.message : "Unable to delete image." }, { status: 400 });
  }
}
