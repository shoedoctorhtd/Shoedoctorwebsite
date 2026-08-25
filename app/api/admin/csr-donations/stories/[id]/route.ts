import {
  deleteRestorationStory,
  getRestorationStory,
  updateRestorationStory,
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
  parseRestorationStoryInput,
} from "@/lib/csr-validation";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const unauthorized = await requireCsrAdminApi(request);
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
  const auth = await requireCsrAdminMutation(request);
  if ("response" in auth) return auth.response;
  try {
    const { id: rawId } = await context.params;
    const id = parseCsrId(rawId, "story");
    const body = await request.json();
    const story = await updateRestorationStory(
      id,
      parseRestorationStoryInput(body),
      parseCsrExpectedUpdatedAt(body.expectedUpdatedAt),
      auth.user,
    );
    return story
      ? csrAdminJson({ story })
      : csrAdminJson({ message: "Restoration story not found." }, { status: 404 });
  } catch (error) {
    return csrApiError(error, "Unable to update restoration story.");
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const auth = await requireCsrAdminMutation(request);
  if ("response" in auth) return auth.response;
  try {
    const { id: rawId } = await context.params;
    const id = parseCsrId(rawId, "story");
    const body = await request.json();
    const deleted = await deleteRestorationStory(
      id,
      parseCsrExpectedUpdatedAt(body.expectedUpdatedAt),
      auth.user,
    );
    if (!deleted) {
      return csrAdminJson({ message: "Restoration story not found." }, { status: 404 });
    }
    return csrAdminJson({ ok: true });
  } catch (error) {
    return csrApiError(error, "Unable to delete restoration story.");
  }
}
