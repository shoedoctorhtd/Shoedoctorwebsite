import { getAdminUser } from "@/lib/admin-auth";
import { normalizeBookingReferenceSearch } from "@/lib/booking-reference";
import {
  findBookingsByPublicReference,
  listBookings,
} from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!(await getAdminUser())) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  const reference = new URL(request.url).searchParams.get("reference");
  if (reference !== null) {
    const normalizedReference = normalizeBookingReferenceSearch(reference);
    if (!normalizedReference) {
      return Response.json({ bookings: [] });
    }

    return Response.json({
      bookings: await findBookingsByPublicReference(
        normalizedReference.publicReference,
      ),
    });
  }

  return Response.json({ bookings: await listBookings() });
}
