import { createCommunityUpdate, listCommunityUpdates } from "@/lib/csr-data";
import {
  csrAdminJson,
  csrApiError,
  requireCsrAdminApi,
  requireCsrAdminMutation,
} from "@/lib/csr-api";
import { parseCommunityUpdateInput } from "@/lib/csr-validation";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const unauthorized = await requireCsrAdminApi(request);
  if (unauthorized) return unauthorized;
  try {
    return csrAdminJson({ updates: await listCommunityUpdates() });
  } catch (error) {
    return csrApiError(error, "Unable to load community updates.", 500);
  }
}

export async function POST(request: Request) {
  const auth = await requireCsrAdminMutation(request);
  if ("response" in auth) return auth.response;
  try {
    const update = await createCommunityUpdate(
      parseCommunityUpdateInput(await request.json()),
      auth.user,
    );
    return csrAdminJson({ update }, { status: 201 });
  } catch (error) {
    return csrApiError(error, "Unable to create community update.");
  }
}
