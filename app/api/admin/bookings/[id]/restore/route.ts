import { requireAdminApi } from "@/lib/admin-auth";
import { restoreBooking } from "@/lib/data";
import { parseAdminRecordVersion, parseRequiredAdminReason } from "@/lib/validation";
import { deliverOwnerAlertEvent } from "@/lib/owner-alerts";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const auth = await requireAdminApi(request, {
    action: "BOOKING_RESTORE",
    mutation: true,
    roles: ["super_admin"],
    entityType: "booking",
    entityId: id,
  });
  if (auth.response) return auth.response;
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const result = await restoreBooking(
      id,
      parseRequiredAdminReason(body.reason, "Restoration reason"),
      auth.user,
      parseAdminRecordVersion(body.recordVersion),
    );
    if (result.kind === "not_found") return Response.json({ message: "Booking not found." }, { status: 404 });
    if (result.kind === "not_deleted") return Response.json({ booking: result.booking, message: "This booking is already active." }, { status: 409 });
    if (result.kind === "conflict") return Response.json({ booking: result.booking, message: "This booking changed. Refresh and try again." }, { status: 409 });
    await deliverOwnerAlertEvent(result.ownerAlertEventId);
    return Response.json({ ok: true, booking: result.booking });
  } catch (error) {
    return Response.json({ message: error instanceof Error ? error.message : "Unable to restore booking." }, { status: 400 });
  }
}
