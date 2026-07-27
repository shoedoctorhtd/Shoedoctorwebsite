import { getAdminUser } from "@/lib/admin-auth";
import { updateBookingStatus } from "@/lib/data";
import { parseBookingStatus } from "@/lib/validation";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  if (!(await getAdminUser())) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const body = (await request.json()) as Record<string, unknown>;
    const updated = await updateBookingStatus(
      id,
      parseBookingStatus(body.status),
    );
    return updated
      ? Response.json({ ok: true })
      : Response.json({ message: "Booking not found." }, { status: 404 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to update booking.";
    return Response.json({ message }, { status: 400 });
  }
}
