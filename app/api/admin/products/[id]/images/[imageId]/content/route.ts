import { requireAdminApi } from "@/lib/admin-auth";
import { getAdminProductImageResponse } from "@/lib/product-images";

export const dynamic = "force-dynamic";

/**
 * Draft image previews must never use the public image route: that route only
 * exposes images belonging to published products. This endpoint is deliberately
 * private and requires the same catalogue-view permission as the admin page.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; imageId: string }> },
) {
  const { id, imageId } = await params;
  const auth = await requireAdminApi(request, {
    action: "PRODUCT_IMAGE_VIEW",
    entityType: "product_image",
    entityId: imageId,
    productPermission: "view_products",
  });
  if (auth.response) return auth.response;
  return getAdminProductImageResponse(id, imageId);
}
