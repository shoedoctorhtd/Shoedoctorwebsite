import { createRestorationStory, listRestorationStories } from "@/lib/csr-data";
import {
  csrAdminJson,
  csrApiError,
  requireCsrAdminApi,
  requireCsrAdminMutation,
} from "@/lib/csr-api";
import { parseRestorationStoryInput } from "@/lib/csr-validation";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const unauthorized = await requireCsrAdminApi(request);
  if (unauthorized) return unauthorized;
  try {
    return csrAdminJson({ stories: await listRestorationStories() });
  } catch (error) {
    return csrApiError(error, "Unable to load restoration stories.", 500);
  }
}

export async function POST(request: Request) {
  const auth = await requireCsrAdminMutation(request);
  if ("response" in auth) return auth.response;
  try {
    const story = await createRestorationStory(
      parseRestorationStoryInput(await request.json()),
      auth.user,
    );
    return csrAdminJson({ story }, { status: 201 });
  } catch (error) {
    return csrApiError(error, "Unable to create restoration story.");
  }
}
