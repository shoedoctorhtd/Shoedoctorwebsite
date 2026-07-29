import {
  deleteCommunityUpdate,
  getCommunityUpdate,
  updateCommunityUpdate,
} from "@/lib/csr-data";
import { csrAdminJson, csrApiError, requireCsrAdminApi } from "@/lib/csr-api";
import { removeUnreferencedDonationImagesBestEffort } from "@/lib/csr-media";
import { parseCommunityUpdateInput, parseCsrId } from "@/lib/csr-validation";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const unauthorized = await requireCsrAdminApi();
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
  const unauthorized = await requireCsrAdminApi();
  if (unauthorized) return unauthorized;
  try {
    const { id: rawId } = await context.params;
    const id = parseCsrId(rawId, "update");
    const existing = await getCommunityUpdate(id);
    const update = await updateCommunityUpdate(
      id,
      parseCommunityUpdateInput(await request.json()),
    );
    if (update && existing) {
      await removeUnreferencedDonationImagesBestEffort([
        existing.coverImageId,
        ...existing.galleryImageIds,
      ]);
    }
    return update
      ? csrAdminJson({ update })
      : csrAdminJson({ message: "Community update not found." }, { status: 404 });
  } catch (error) {
    return csrApiError(error, "Unable to update community update.");
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const unauthorized = await requireCsrAdminApi();
  if (unauthorized) return unauthorized;
  try {
    const { id: rawId } = await context.params;
    const id = parseCsrId(rawId, "update");
    const update = await getCommunityUpdate(id);
    if (!update) {
      return csrAdminJson({ message: "Community update not found." }, { status: 404 });
    }
    const deleted = await deleteCommunityUpdate(id);
    if (!deleted) {
      return csrAdminJson({ message: "Community update not found." }, { status: 404 });
    }
    await removeUnreferencedDonationImagesBestEffort([
      update.coverImageId,
      ...update.galleryImageIds,
    ]);
    return csrAdminJson({ ok: true });
  } catch (error) {
    return csrApiError(error, "Unable to delete community update.");
  }
}
