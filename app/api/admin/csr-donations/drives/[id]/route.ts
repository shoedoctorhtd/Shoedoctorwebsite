import {
  deleteDonationDrive,
  getDonationDrive,
  updateDonationDrive,
} from "@/lib/csr-data";
import { csrAdminJson, csrApiError, requireCsrAdminApi } from "@/lib/csr-api";
import { removeUnreferencedDonationImagesBestEffort } from "@/lib/csr-media";
import { parseCsrId, parseDonationDriveInput } from "@/lib/csr-validation";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const unauthorized = await requireCsrAdminApi();
  if (unauthorized) return unauthorized;
  try {
    const { id: rawId } = await context.params;
    const drive = await getDonationDrive(parseCsrId(rawId, "drive"));
    return drive
      ? csrAdminJson({ drive })
      : csrAdminJson({ message: "Donation drive not found." }, { status: 404 });
  } catch (error) {
    return csrApiError(error, "Unable to load donation drive.");
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const unauthorized = await requireCsrAdminApi();
  if (unauthorized) return unauthorized;
  try {
    const { id: rawId } = await context.params;
    const id = parseCsrId(rawId, "drive");
    const existing = await getDonationDrive(id);
    const drive = await updateDonationDrive(
      id,
      parseDonationDriveInput(await request.json()),
    );
    if (drive && existing) {
      await removeUnreferencedDonationImagesBestEffort([existing.coverImageId]);
    }
    return drive
      ? csrAdminJson({ drive })
      : csrAdminJson({ message: "Donation drive not found." }, { status: 404 });
  } catch (error) {
    return csrApiError(error, "Unable to update donation drive.");
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const unauthorized = await requireCsrAdminApi();
  if (unauthorized) return unauthorized;
  try {
    const { id: rawId } = await context.params;
    const id = parseCsrId(rawId, "drive");
    const drive = await getDonationDrive(id);
    if (!drive) {
      return csrAdminJson({ message: "Donation drive not found." }, { status: 404 });
    }
    const deleted = await deleteDonationDrive(id);
    if (!deleted) {
      return csrAdminJson({ message: "Donation drive not found." }, { status: 404 });
    }
    await removeUnreferencedDonationImagesBestEffort([drive.coverImageId]);
    return csrAdminJson({ ok: true });
  } catch (error) {
    return csrApiError(error, "Unable to delete donation drive.");
  }
}
