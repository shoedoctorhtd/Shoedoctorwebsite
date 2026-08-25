import {
  getDonationImpactStats,
  updateDonationImpactStats,
} from "@/lib/csr-data";
import {
  csrAdminJson,
  csrApiError,
  requireCsrAdminApi,
  requireCsrAdminMutation,
} from "@/lib/csr-api";
import {
  parseCsrExpectedUpdatedAt,
  parseDonationImpactStatsInput,
} from "@/lib/csr-validation";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const unauthorized = await requireCsrAdminApi(request);
  if (unauthorized) return unauthorized;
  try {
    return csrAdminJson({ stats: await getDonationImpactStats() });
  } catch (error) {
    return csrApiError(error, "Unable to load impact statistics.", 500);
  }
}

async function saveStats(request: Request) {
  const auth = await requireCsrAdminMutation(request);
  if ("response" in auth) return auth.response;
  try {
    const body = await request.json();
    const stats = await updateDonationImpactStats(
      parseDonationImpactStatsInput(body),
      parseCsrExpectedUpdatedAt(body.expectedUpdatedAt),
      auth.user,
    );
    return csrAdminJson({ stats });
  } catch (error) {
    return csrApiError(error, "Unable to update impact statistics.");
  }
}

export async function PATCH(request: Request) {
  return saveStats(request);
}

// The admin form uses PUT for a complete replacement; PATCH remains available
// for API consumers that prefer partial-resource semantics.
export async function PUT(request: Request) {
  return saveStats(request);
}
