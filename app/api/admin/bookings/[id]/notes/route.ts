import { requireAdminApi } from "@/lib/admin-auth";
import { addBookingOperationalNote } from "@/lib/data";
import { parseAdminRecordVersion } from "@/lib/validation";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireAdminApi(request, {
    action: "BOOKING_OPERATIONAL_NOTE_ADDED", permission: "bookings",
    mutation: true,
    entityType: "booking_operational_note",
  });
  if (auth.response) return auth.response;
  try {
    const { id } = await context.params;
    const body = (await request.json()) as Record<string, unknown>;
    const result = await addBookingOperationalNote(
      id,
      typeof body.note === "string" ? body.note : "",
      auth.user,
      parseAdminRecordVersion(body.recordVersion),
    );
    if (result.kind === "not_found") return Response.json({ message: "Booking not found." }, { status: 404 });
    if (result.kind === "conflict") return Response.json({ booking: result.booking, message: "This booking changed. Refresh and try again." }, { status: 409 });
    return Response.json({ ok: true, booking: result.booking });
  } catch (error) {
    return Response.json({ message: error instanceof Error ? error.message : "Unable to add note." }, { status: 400 });
  }
}
