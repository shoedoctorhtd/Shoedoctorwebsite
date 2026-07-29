import {
  deleteDonationRequest,
  getDonationRequest,
  updateDonationRequest,
} from "@/lib/csr-data";
import { csrAdminJson, csrApiError, requireCsrAdminApi } from "@/lib/csr-api";
import { parseCsrId, parseDonationRequestUpdate } from "@/lib/csr-validation";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const unauthorized = await requireCsrAdminApi();
  if (unauthorized) return unauthorized;
  try {
    const { id: rawId } = await context.params;
    const request = await getDonationRequest(parseCsrId(rawId, "request"));
    return request
      ? csrAdminJson({ request })
      : csrAdminJson({ message: "Donation request not found." }, { status: 404 });
  } catch (error) {
    return csrApiError(error, "Unable to load donation request.");
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const unauthorized = await requireCsrAdminApi();
  if (unauthorized) return unauthorized;
  try {
    const { id: rawId } = await context.params;
    const updated = await updateDonationRequest(
      parseCsrId(rawId, "request"),
      parseDonationRequestUpdate(await request.json()),
    );
    return updated
      ? csrAdminJson({ request: updated })
      : csrAdminJson({ message: "Donation request not found." }, { status: 404 });
  } catch (error) {
    return csrApiError(error, "Unable to update donation request.");
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const unauthorized = await requireCsrAdminApi();
  if (unauthorized) return unauthorized;
  try {
    const { id: rawId } = await context.params;
    const deleted = await deleteDonationRequest(parseCsrId(rawId, "request"));
    return deleted
      ? csrAdminJson({ ok: true })
      : csrAdminJson({ message: "Donation request not found." }, { status: 404 });
  } catch (error) {
    return csrApiError(error, "Unable to delete donation request.");
  }
}
