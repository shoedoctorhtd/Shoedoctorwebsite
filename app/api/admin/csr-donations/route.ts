import { getCsrAdminInitialData } from "@/lib/csr-data";
import { csrAdminJson, csrApiError, requireCsrAdminApi } from "@/lib/csr-api";

export const dynamic = "force-dynamic";

/** A single protected initial-data endpoint for a responsive CSR admin page. */
export async function GET() {
  const unauthorized = await requireCsrAdminApi();
  if (unauthorized) return unauthorized;
  try {
    return csrAdminJson({ data: await getCsrAdminInitialData() });
  } catch (error) {
    return csrApiError(error, "Unable to load CSR data.", 500);
  }
}
