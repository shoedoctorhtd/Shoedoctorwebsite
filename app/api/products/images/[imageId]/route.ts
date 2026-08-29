import { getPublicProductImageResponse } from "@/lib/product-images";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ imageId: string }> }) {
  return getPublicProductImageResponse((await params).imageId);
}
