import { createDonationDrive, listDonationDrives } from "@/lib/csr-data";
import {
  csrAdminJson,
  csrApiError,
  requireCsrAdminApi,
  requireCsrAdminMutation,
} from "@/lib/csr-api";
import { parseDonationDriveInput } from "@/lib/csr-validation";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const unauthorized = await requireCsrAdminApi(request);
  if (unauthorized) return unauthorized;
  try {
    return csrAdminJson({ drives: await listDonationDrives() });
  } catch (error) {
    return csrApiError(error, "Unable to load donation drives.", 500);
  }
}

export async function POST(request: Request) {
  const auth = await requireCsrAdminMutation(request);
  if ("response" in auth) return auth.response;
  try {
    const drive = await createDonationDrive(
      parseDonationDriveInput(await request.json()),
      auth.user,
    );
    return csrAdminJson({ drive }, { status: 201 });
  } catch (error) {
    return csrApiError(error, "Unable to create donation drive.");
  }
}
