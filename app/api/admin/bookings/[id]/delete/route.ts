import { requireAdminApi } from "@/lib/admin-auth";
import { getBookingForAdmin, softDeleteBooking } from "@/lib/data";
import { parseAdminRecordVersion, parseRequiredAdminReason } from "@/lib/validation";
import { deliverOwnerAlertEvent } from "@/lib/owner-alerts";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const auth = await requireAdminApi(request, {
    action: "BOOKING_SOFT_DELETE",
    mutation: true,
    roles: ["super_admin"],
    entityType: "booking",
    entityId: id,
  });
  if (auth.response) return auth.response;
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const booking = await getBookingForAdmin(id, true);
    if (!booking) return Response.json({ message: "Booking not found." }, { status: 404 });
    const confirmation = String(body.confirmationReference ?? "").trim().toUpperCase();
    if (!booking.publicReference || confirmation !== booking.publicReference.toUpperCase()) {
      return Response.json({ message: "Confirm the exact booking reference before deleting." }, { status: 400 });
    }
    const result = await softDeleteBooking(
      id,
      parseRequiredAdminReason(body.reason, "Deletion reason"),
      auth.user,
      parseAdminRecordVersion(body.recordVersion),
    );
    if (result.kind === "not_found") return Response.json({ message: "Booking not found." }, { status: 404 });
    if (result.kind === "already_deleted") return Response.json({ booking: result.booking, message: "This booking is already deleted." }, { status: 409 });
    if (result.kind === "conflict") return Response.json({ booking: result.booking, message: "This booking changed. Refresh and try again." }, { status: 409 });
    await deliverOwnerAlertEvent(result.ownerAlertEventId);
    return Response.json({ ok: true, booking: result.booking });
  } catch (error) {
    return Response.json({ message: error instanceof Error ? error.message : "Unable to delete booking." }, { status: 400 });
  }
}
