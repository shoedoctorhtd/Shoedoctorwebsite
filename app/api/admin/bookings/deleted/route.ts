import { requireAdminApi } from "@/lib/admin-auth";
import { listDeletedBookings } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireAdminApi(request, {
    action: "DELETED_BOOKINGS_LIST",
    roles: ["super_admin"],
    entityType: "booking",
  });
  if (auth.response) return auth.response;
  return Response.json(
    { bookings: await listDeletedBookings() },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
