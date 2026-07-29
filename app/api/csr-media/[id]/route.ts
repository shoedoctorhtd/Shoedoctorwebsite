import { getPublicDonationMedia } from "@/lib/csr-data";
import {
  CsrMediaConfigurationError,
  imageResponseHeaders,
  readDonationImage,
} from "@/lib/csr-media";
import { parseCsrId } from "@/lib/csr-validation";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

function imageNotFoundResponse() {
  return Response.json(
    { message: "Image not found." },
    { status: 404, headers: { "cache-control": "no-store" } },
  );
}

/**
 * Published pages can only read images attached to published CSR content.
 * Draft previewing is deliberately served from the protected admin endpoint.
 */
export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id: rawId } = await context.params;
    const id = parseCsrId(rawId, "image");
    const media = await getPublicDonationMedia(id);
    if (!media) return imageNotFoundResponse();

    const image = await readDonationImage(media);
    if (!image) return imageNotFoundResponse();
    return new Response(image.body, {
      headers: imageResponseHeaders(media, true, image),
    });
  } catch (error) {
    const unavailable = error instanceof CsrMediaConfigurationError;
    if (!unavailable) return imageNotFoundResponse();
    return Response.json(
      { message: "Images are temporarily unavailable." },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  }
}
