import { requireAdminApi } from "@/lib/admin-auth";
import { normalizeBookingReferenceSearch } from "@/lib/booking-reference";
import {
  createBooking,
  findBookingsByPublicReference,
  listBookings,
} from "@/lib/data";
import { parsePublicBooking } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireAdminApi(request, { action: "BOOKING_LIST", permission: "bookings" });
  if (auth.response) return auth.response;

  const reference = new URL(request.url).searchParams.get("reference");
  if (reference !== null) {
    const normalizedReference = normalizeBookingReferenceSearch(reference);
    if (!normalizedReference) {
      return Response.json({ bookings: [] }, { headers: { "Cache-Control": "private, no-store" } });
    }
    return Response.json(
      { bookings: await findBookingsByPublicReference(normalizedReference.publicReference) },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  }

  return Response.json(
    { bookings: await listBookings() },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

/** Counter and walk-in bookings intentionally reuse the public server-side
 * pricing and multi-pair validation, but their actor/source come only from the
 * verified administrator session. */
export async function POST(request: Request) {
  const auth = await requireAdminApi(request, {
    action: "BOOKING_COUNTER_CREATED", permission: "counter_booking",
    mutation: true,
    entityType: "booking",
  });
  if (auth.response) return auth.response;
  try {
    const booking = await createBooking(parsePublicBooking(await request.json()), {
      source: "admin",
      actor: auth.user,
    });
    return Response.json(
      { ok: true, booking },
      { status: 201, headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create the counter booking.";
    return Response.json({ message }, { status: 400 });
  }
}
