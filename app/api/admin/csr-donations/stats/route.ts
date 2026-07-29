import {
  getDonationImpactStats,
  updateDonationImpactStats,
} from "@/lib/csr-data";
import { csrAdminJson, csrApiError, requireCsrAdminApi } from "@/lib/csr-api";
import { parseDonationImpactStatsInput } from "@/lib/csr-validation";

export const dynamic = "force-dynamic";

export async function GET() {
  const unauthorized = await requireCsrAdminApi();
  if (unauthorized) return unauthorized;
  try {
    return csrAdminJson({ stats: await getDonationImpactStats() });
  } catch (error) {
    return csrApiError(error, "Unable to load impact statistics.", 500);
  }
}

async function saveStats(request: Request) {
  const unauthorized = await requireCsrAdminApi();
  if (unauthorized) return unauthorized;
  try {
    const stats = await updateDonationImpactStats(
      parseDonationImpactStatsInput(await request.json()),
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
