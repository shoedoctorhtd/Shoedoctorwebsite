import { countDonationRequests, listDonationRequests } from "@/lib/csr-data";
import { csrAdminJson, csrApiError, requireCsrAdminApi } from "@/lib/csr-api";
import { parseDonationRequestListOptions } from "@/lib/csr-validation";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const unauthorized = await requireCsrAdminApi();
  if (unauthorized) return unauthorized;
  try {
    const options = parseDonationRequestListOptions(new URL(request.url));
    const [requests, total] = await Promise.all([
      listDonationRequests(options),
      countDonationRequests(options),
    ]);
    return csrAdminJson({ requests, total });
  } catch (error) {
    return csrApiError(error, "Unable to load donation requests.");
  }
}
