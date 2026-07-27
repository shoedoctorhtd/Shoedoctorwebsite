import { createBooking } from "@/lib/data";
import { parsePublicBooking } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const booking = parsePublicBooking(await request.json());
    const created = await createBooking(booking);

    return Response.json(
      {
        ok: true,
        reference: created.reference,
        message:
          "Your booking request has been received. Shoe Doctor will contact you to confirm the service and final quote.",
      },
      { status: 201 },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to create booking.";
    return Response.json({ ok: false, message }, { status: 400 });
  }
}
