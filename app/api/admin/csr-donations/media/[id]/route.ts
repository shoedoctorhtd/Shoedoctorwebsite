import { getDonationMedia } from "@/lib/csr-data";
import { csrAdminJson, csrApiError, requireCsrAdminApi } from "@/lib/csr-api";
import {
  CsrMediaConfigurationError,
  imageResponseHeaders,
  readDonationImage,
  removeDonationImage,
} from "@/lib/csr-media";
import { parseCsrId } from "@/lib/csr-validation";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

/** Protected draft-image preview. */
export async function GET(_request: Request, context: RouteContext) {
  const unauthorized = await requireCsrAdminApi();
  if (unauthorized) return unauthorized;
  try {
    const { id: rawId } = await context.params;
    const media = await getDonationMedia(parseCsrId(rawId, "image"));
    if (!media) return csrAdminJson({ message: "Image not found." }, { status: 404 });
    const image = await readDonationImage(media);
    if (!image) return csrAdminJson({ message: "Image not found." }, { status: 404 });
    return new Response(image.body, {
      headers: imageResponseHeaders(media, false, image),
    });
  } catch (error) {
    if (error instanceof CsrMediaConfigurationError) {
      return csrApiError(error, "Image storage is not configured.", 503);
    }
    return csrApiError(error, "Unable to load image.");
  }
}

/** Deletes only a media record that is not attached to CSR content. */
export async function DELETE(_request: Request, context: RouteContext) {
  const unauthorized = await requireCsrAdminApi();
  if (unauthorized) return unauthorized;
  try {
    const { id: rawId } = await context.params;
    const result = await removeDonationImage(parseCsrId(rawId, "image"));
    if (result.deleted) return csrAdminJson({ ok: true });
    return csrAdminJson(
      {
        message:
          result.reason === "in_use"
            ? "This image is still used by CSR content and cannot be deleted."
            : "Image not found.",
      },
      { status: result.reason === "in_use" ? 409 : 404 },
    );
  } catch (error) {
    if (error instanceof CsrMediaConfigurationError) {
      return csrApiError(error, "Image storage is not configured.", 503);
    }
    return csrApiError(error, "Unable to delete image.");
  }
}
