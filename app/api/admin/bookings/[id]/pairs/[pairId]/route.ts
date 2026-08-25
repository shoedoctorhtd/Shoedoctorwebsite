import { requireAdminApi } from "@/lib/admin-auth";
import { updateBookingItemStatus } from "@/lib/data";
import { parseAdminRecordVersion, parseBookingStatus } from "@/lib/validation";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string; pairId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAdminApi(request, {
    action: "BOOKING_PAIR_STATUS_CHANGED",
    mutation: true,
    entityType: "booking_pair",
  });
  if (auth.response) return auth.response;
  try {
    const { id, pairId } = await context.params;
    const body = (await request.json()) as Record<string, unknown>;
    const result = await updateBookingItemStatus(
      id,
      pairId,
      parseBookingStatus(body.status),
      auth.user,
      parseAdminRecordVersion(body.recordVersion),
    );
    if (result.kind === "not_found") return Response.json({ message: "Booking not found." }, { status: 404 });
    if (result.kind === "pair_not_found") return Response.json({ message: "Pair not found." }, { status: 404 });
    if (result.kind === "conflict") return Response.json({ booking: result.booking, message: "This booking changed. Refresh and try again." }, { status: 409 });
    return Response.json({ ok: true, booking: result.booking, unchanged: result.kind === "unchanged" });
  } catch (error) {
    return Response.json({ message: error instanceof Error ? error.message : "Unable to update pair status." }, { status: 400 });
  }
}
