import {
  deleteDonationRequest,
  getDonationRequest,
  updateDonationRequest,
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
  parseDonationRequestUpdate,
} from "@/lib/csr-validation";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const unauthorized = await requireCsrAdminApi(request);
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
  const auth = await requireCsrAdminMutation(request);
  if ("response" in auth) return auth.response;
  try {
    const { id: rawId } = await context.params;
    const id = parseCsrId(rawId, "request");
    const body = await request.json();
    const updated = await updateDonationRequest(
      id,
      parseDonationRequestUpdate(body),
      parseCsrExpectedUpdatedAt(body.expectedUpdatedAt),
      auth.user,
    );
    return updated
      ? csrAdminJson({
          request: updated.request,
          statusChanged: updated.statusChanged,
          notification: updated.notification,
        })
      : csrAdminJson({ message: "Donation request not found." }, { status: 404 });
  } catch (error) {
    return csrApiError(error, "Unable to update donation request.");
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const auth = await requireCsrAdminMutation(request);
  if ("response" in auth) return auth.response;
  try {
    const { id: rawId } = await context.params;
    const id = parseCsrId(rawId, "request");
    const body = await request.json();
    const deleted = await deleteDonationRequest(
      id,
      parseCsrExpectedUpdatedAt(body.expectedUpdatedAt),
      auth.user,
    );
    return deleted
      ? csrAdminJson({ ok: true })
      : csrAdminJson({ message: "Donation request not found." }, { status: 404 });
  } catch (error) {
    return csrApiError(error, "Unable to delete donation request.");
  }
}
