import {
  countDonationRequests,
  listDonationRequests,
  type DonationRequest,
  type DonationRequestListOptions,
} from "@/lib/csr-data";
import { csrApiError, requireCsrAdminApi } from "@/lib/csr-api";
import { parseDonationRequestListOptions } from "@/lib/csr-validation";

export const dynamic = "force-dynamic";

function csvCell(value: unknown) {
  const text = String(value ?? "");
  const safe = /^[=+\-@]/u.test(text) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
}

export async function GET(request: Request) {
  const unauthorized = await requireCsrAdminApi();
  if (unauthorized) return unauthorized;
  try {
    const options = parseDonationRequestListOptions(new URL(request.url));
    const filters: DonationRequestListOptions = {
      search: options.search,
      status: options.status,
      dateFrom: options.dateFrom,
      dateTo: options.dateTo,
    };
    const total = await countDonationRequests(filters);
    const records: DonationRequest[] = [];
    for (let offset = 0; offset < total; offset += 500) {
      records.push(
        ...(await listDonationRequests({ ...filters, limit: 500, offset })),
      );
    }
    const header = [
      "Request ID",
      "Donor name",
      "Phone number",
      "Email",
      "Location",
      "Number of pairs",
      "Shoe type",
      "Shoe condition",
      "Donation method",
      "Preferred pickup date",
      "Status",
      "Donor notes",
      "Internal notes",
      "Submitted date",
    ];
    const rows = records.map((item) => [
      item.requestId,
      item.donorName,
      item.phone,
      item.email,
      item.location,
      item.numberOfPairs,
      item.shoeType,
      item.shoeCondition,
      item.donationMethod,
      item.preferredPickupDate,
      item.status,
      item.donorNotes,
      item.internalNotes,
      item.submittedAt,
    ]);
    const body = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
    return new Response(body, {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": "attachment; filename=shoe-doctor-donation-requests.csv",
        "cache-control": "private, no-store",
      },
    });
  } catch (error) {
    return csrApiError(error, "Unable to export donation requests.");
  }
}
