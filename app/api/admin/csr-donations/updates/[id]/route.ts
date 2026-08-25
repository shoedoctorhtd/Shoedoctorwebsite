import {
  deleteCommunityUpdate,
  getCommunityUpdate,
  updateCommunityUpdate,
} from "@/lib/csr-data";
import {
  csrAdminJson,
  csrApiError,
  requireCsrAdminApi,
  requireCsrAdminMutation,
} from "@/lib/csr-api";
import {
  parseCommunityUpdateInput,
  parseCsrExpectedUpdatedAt,
  parseCsrId,
} from "@/lib/csr-validation";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const unauthorized = await requireCsrAdminApi(request);
  if (unauthorized) return unauthorized;
  try {
    const { id: rawId } = await context.params;
    const update = await getCommunityUpdate(parseCsrId(rawId, "update"));
    return update
      ? csrAdminJson({ update })
      : csrAdminJson({ message: "Community update not found." }, { status: 404 });
  } catch (error) {
    return csrApiError(error, "Unable to load community update.");
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireCsrAdminMutation(request);
  if ("response" in auth) return auth.response;
  try {
    const { id: rawId } = await context.params;
    const id = parseCsrId(rawId, "update");
    const body = await request.json();
    const update = await updateCommunityUpdate(
      id,
      parseCommunityUpdateInput(body),
      parseCsrExpectedUpdatedAt(body.expectedUpdatedAt),
      auth.user,
    );
    return update
      ? csrAdminJson({ update })
      : csrAdminJson({ message: "Community update not found." }, { status: 404 });
  } catch (error) {
    return csrApiError(error, "Unable to update community update.");
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const auth = await requireCsrAdminMutation(request);
  if ("response" in auth) return auth.response;
  try {
    const { id: rawId } = await context.params;
    const id = parseCsrId(rawId, "update");
    const body = await request.json();
    const deleted = await deleteCommunityUpdate(
      id,
      parseCsrExpectedUpdatedAt(body.expectedUpdatedAt),
      auth.user,
    );
    if (!deleted) {
      return csrAdminJson({ message: "Community update not found." }, { status: 404 });
    }
    return csrAdminJson({ ok: true });
  } catch (error) {
    return csrApiError(error, "Unable to delete community update.");
  }
}
