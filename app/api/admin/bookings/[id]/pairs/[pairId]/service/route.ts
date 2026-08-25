import { requireAdminApi } from "@/lib/admin-auth";
import { updateBookingItemService } from "@/lib/data";
import { parseAdminRecordVersion } from "@/lib/validation";
import { deliverOwnerAlertEvent } from "@/lib/owner-alerts";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string; pairId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAdminApi(request, {
    action: "BOOKING_PAIR_SERVICE_CHANGED",
    mutation: true,
    roles: ["super_admin"],
    entityType: "booking_pair",
  });
  if (auth.response) return auth.response;
  try {
    const { id, pairId } = await context.params;
    const body = (await request.json()) as Record<string, unknown>;
    const serviceId = typeof body.serviceId === "string" ? body.serviceId.trim() : "";
    if (!serviceId) return Response.json({ message: "Choose a valid service." }, { status: 400 });
    const result = await updateBookingItemService(id, pairId, serviceId, auth.user, parseAdminRecordVersion(body.recordVersion));
    if (result.kind === "not_found") return Response.json({ message: "Booking not found." }, { status: 404 });
    if (result.kind === "pair_not_found") return Response.json({ message: "Pair not found." }, { status: 404 });
    if (result.kind === "service_not_found") return Response.json({ message: "Service not found." }, { status: 404 });
    if (result.kind === "conflict") return Response.json({ booking: result.booking, message: "This booking changed. Refresh and try again." }, { status: 409 });
    if (result.kind === "unchanged") return Response.json({ ok: true, booking: result.booking, unchanged: true });
    await deliverOwnerAlertEvent(result.ownerAlertEventId);
    return Response.json({ ok: true, booking: result.booking });
  } catch (error) {
    return Response.json({ message: error instanceof Error ? error.message : "Unable to update pair service." }, { status: 400 });
  }
}
