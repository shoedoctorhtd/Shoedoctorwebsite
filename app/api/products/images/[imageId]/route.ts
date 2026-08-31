import { getPublicProductImageResponse } from "@/lib/product-images";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ imageId: string }> }) {
  return getPublicProductImageResponse(request, (await params).imageId);
}
