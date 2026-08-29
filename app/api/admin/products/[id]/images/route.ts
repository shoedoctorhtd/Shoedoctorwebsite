import { requireAdminApi } from "@/lib/admin-auth";
import { listImagesForAdminProduct } from "@/lib/product-data";
import { uploadProductImage } from "@/lib/product-images";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi(request, { action: "PRODUCT_IMAGE_LIST", productPermission: "manage_product_images" });
  if (auth.response) return auth.response;
  return Response.json({ images: await listImagesForAdminProduct((await params).id) }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id;
  const auth = await requireAdminApi(request, {
    action: "PRODUCT_IMAGE_UPLOADED",
    mutation: true,
    entityType: "product_image",
    entityId: id,
    productPermission: "manage_product_images",
  });
  if (auth.response) return auth.response;
  try {
    const form = await request.formData();
    const file = form.get("image");
    if (!file || typeof file === "string" || typeof file.arrayBuffer !== "function") {
      return Response.json({ message: "Choose an image file to upload." }, { status: 400 });
    }
    const result = await uploadProductImage(id, file, auth.user, {
      makePrimary: form.get("makePrimary") === "true",
      sortOrder: form.get("sortOrder") === null || form.get("sortOrder") === "" ? undefined : Number(form.get("sortOrder")),
    });
    if (result.kind === "not_found") return Response.json({ message: "Product not found." }, { status: 404 });
    return Response.json({ image: result.image }, { status: 201, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return Response.json({ message: error instanceof Error ? error.message : "Unable to upload image." }, { status: 400 });
  }
}
