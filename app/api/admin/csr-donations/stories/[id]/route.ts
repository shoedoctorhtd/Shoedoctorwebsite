import {
  deleteRestorationStory,
  getRestorationStory,
  updateRestorationStory,
} from "@/lib/csr-data";
import { csrAdminJson, csrApiError, requireCsrAdminApi } from "@/lib/csr-api";
import { removeUnreferencedDonationImagesBestEffort } from "@/lib/csr-media";
import { parseCsrId, parseRestorationStoryInput } from "@/lib/csr-validation";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const unauthorized = await requireCsrAdminApi();
  if (unauthorized) return unauthorized;
  try {
    const { id: rawId } = await context.params;
    const story = await getRestorationStory(parseCsrId(rawId, "story"));
    return story
      ? csrAdminJson({ story })
      : csrAdminJson({ message: "Restoration story not found." }, { status: 404 });
  } catch (error) {
    return csrApiError(error, "Unable to load restoration story.");
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const unauthorized = await requireCsrAdminApi();
  if (unauthorized) return unauthorized;
  try {
    const { id: rawId } = await context.params;
    const id = parseCsrId(rawId, "story");
    const existing = await getRestorationStory(id);
    const story = await updateRestorationStory(
      id,
      parseRestorationStoryInput(await request.json()),
    );
    if (story && existing) {
      await removeUnreferencedDonationImagesBestEffort([
        existing.beforeImageId,
        existing.afterImageId,
      ]);
    }
    return story
      ? csrAdminJson({ story })
      : csrAdminJson({ message: "Restoration story not found." }, { status: 404 });
  } catch (error) {
    return csrApiError(error, "Unable to update restoration story.");
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const unauthorized = await requireCsrAdminApi();
  if (unauthorized) return unauthorized;
  try {
    const { id: rawId } = await context.params;
    const id = parseCsrId(rawId, "story");
    const story = await getRestorationStory(id);
    if (!story) {
      return csrAdminJson({ message: "Restoration story not found." }, { status: 404 });
    }
    const deleted = await deleteRestorationStory(id);
    if (!deleted) {
      return csrAdminJson({ message: "Restoration story not found." }, { status: 404 });
    }
    await removeUnreferencedDonationImagesBestEffort([
      story.beforeImageId,
      story.afterImageId,
    ]);
    return csrAdminJson({ ok: true });
  } catch (error) {
    return csrApiError(error, "Unable to delete restoration story.");
  }
}
