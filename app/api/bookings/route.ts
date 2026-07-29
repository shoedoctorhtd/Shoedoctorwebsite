import { createBooking } from "@/lib/data";
import { parsePublicBooking } from "@/lib/validation";
import { sendBookingEmailNotification } from "@/lib/booking-email";
import { sendBookingWhatsAppNotification } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const booking = parsePublicBooking(await request.json());
    const created = await createBooking(booking);
    const [emailNotification, whatsappNotification] = await Promise.all([
      sendBookingEmailNotification(created),
      sendBookingWhatsAppNotification(created),
    ]);

    if (emailNotification.status === "not_configured") {
      console.warn(
        `Booking ${created.reference} was saved, but email is not configured.`,
      );
    }
    if (whatsappNotification.status === "not_configured") {
      console.warn(
        `Booking ${created.reference} was saved, but WhatsApp is not configured.`,
      );
    }

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
