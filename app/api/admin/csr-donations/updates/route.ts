import { createCommunityUpdate, listCommunityUpdates } from "@/lib/csr-data";
import { csrAdminJson, csrApiError, requireCsrAdminApi } from "@/lib/csr-api";
import { parseCommunityUpdateInput } from "@/lib/csr-validation";

export const dynamic = "force-dynamic";

export async function GET() {
  const unauthorized = await requireCsrAdminApi();
  if (unauthorized) return unauthorized;
  try {
    return csrAdminJson({ updates: await listCommunityUpdates() });
  } catch (error) {
    return csrApiError(error, "Unable to load community updates.", 500);
  }
}

export async function POST(request: Request) {
  const unauthorized = await requireCsrAdminApi();
  if (unauthorized) return unauthorized;
  try {
    const update = await createCommunityUpdate(
      parseCommunityUpdateInput(await request.json()),
    );
    return csrAdminJson({ update }, { status: 201 });
  } catch (error) {
    return csrApiError(error, "Unable to create community update.");
  }
}
