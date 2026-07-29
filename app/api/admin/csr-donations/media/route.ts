import { csrAdminJson, csrApiError, requireCsrAdminApi } from "@/lib/csr-api";
import { CsrMediaConfigurationError, uploadDonationImage } from "@/lib/csr-media";

export const dynamic = "force-dynamic";

/** Uploads a private image and returns its opaque D1 media id. */
export async function POST(request: Request) {
  const unauthorized = await requireCsrAdminApi();
  if (unauthorized) return unauthorized;
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!file || typeof file === "string") {
      return csrAdminJson(
        { message: "Choose an image file to upload." },
        { status: 400 },
      );
    }
    const media = await uploadDonationImage(file);
    // Object keys are private implementation details. The browser only needs
    // this safe metadata plus the opaque media id for its protected preview.
    return csrAdminJson(
      {
        media: {
          id: media.id,
          contentType: media.contentType,
          size: media.sizeBytes,
          originalFilename: media.originalFilename,
          createdAt: media.createdAt,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof CsrMediaConfigurationError) {
      return csrApiError(error, "Image uploads are not configured.", 503);
    }
    return csrApiError(error, "Unable to upload image.");
  }
}
