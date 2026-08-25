import {
  deleteDonationDrive,
  getDonationDrive,
  updateDonationDrive,
} from "@/lib/csr-data";
import {
  csrAdminJson,
  csrApiError,
  requireCsrAdminApi,
  requireCsrAdminMutation,
} from "@/lib/csr-api";
import {
  parseCsrExpectedUpdatedAt,
  parseCsrId,
  parseDonationDriveInput,
} from "@/lib/csr-validation";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const unauthorized = await requireCsrAdminApi(request);
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
  const auth = await requireCsrAdminMutation(request);
  if ("response" in auth) return auth.response;
  try {
    const { id: rawId } = await context.params;
    const id = parseCsrId(rawId, "drive");
    const body = await request.json();
    const drive = await updateDonationDrive(
      id,
      parseDonationDriveInput(body),
      parseCsrExpectedUpdatedAt(body.expectedUpdatedAt),
      auth.user,
    );
    return drive
      ? csrAdminJson({ drive })
      : csrAdminJson({ message: "Donation drive not found." }, { status: 404 });
  } catch (error) {
    return csrApiError(error, "Unable to update donation drive.");
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const auth = await requireCsrAdminMutation(request);
  if ("response" in auth) return auth.response;
  try {
    const { id: rawId } = await context.params;
    const id = parseCsrId(rawId, "drive");
    const body = await request.json();
    const deleted = await deleteDonationDrive(
      id,
      parseCsrExpectedUpdatedAt(body.expectedUpdatedAt),
      auth.user,
    );
    if (!deleted) {
      return csrAdminJson({ message: "Donation drive not found." }, { status: 404 });
    }
    return csrAdminJson({ ok: true });
  } catch (error) {
    return csrApiError(error, "Unable to delete donation drive.");
  }
}
