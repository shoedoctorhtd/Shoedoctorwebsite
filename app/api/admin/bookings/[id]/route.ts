import { requireAdminApi } from "@/lib/admin-auth";
import { updateBookingStatus } from "@/lib/data";
import { parseAdminRecordVersion, parseBookingStatus } from "@/lib/validation";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAdminApi(request, {
    action: "BOOKING_STATUS_CHANGED", permission: "bookings",
    mutation: true,
    entityType: "booking",
  });
  if (auth.response) return auth.response;

  try {
    const { id } = await context.params;
    const body = (await request.json()) as Record<string, unknown>;
    const result = await updateBookingStatus(
      id,
      parseBookingStatus(body.status),
      auth.user,
      parseAdminRecordVersion(body.recordVersion),
    );
    if (result.kind === "not_found") {
      return Response.json({ message: "Booking not found." }, { status: 404 });
    }
    if (result.kind === "conflict") {
      return Response.json(
        {
          booking: result.booking,
          message: "This booking changed before the update could be saved. Refresh and try again.",
        },
        { status: 409 },
      );
    }
    if (result.kind === "unchanged") {
      return Response.json({
        ok: true,
        booking: result.booking,
        unchanged: true,
        message: "Booking status is already up to date.",
      });
    }
    return Response.json({
      ok: true,
      booking: result.booking,
      history: result.history,
      notification: result.notification,
      unchanged: false,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update booking.";
    return Response.json({ message }, { status: 400 });
  }
}
