import { createBooking } from "@/lib/data";
import { parsePublicBooking } from "@/lib/validation";
import { sendBookingEmailNotification } from "@/lib/booking-email";
import { sendBookingConfirmationEmail } from "@/lib/email/bookingConfirmation";
import { sendBookingWhatsAppNotification } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const booking = parsePublicBooking(await request.json());
    const created = await createBooking(booking);
    const [emailNotification, whatsappNotification, confirmationNotification] =
      await Promise.all([
        sendBookingEmailNotification(created),
        sendBookingWhatsAppNotification(created),
        sendBookingConfirmationEmail(created),
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
    if (confirmationNotification.status === "failed") {
      console.warn(
        `Booking ${created.reference} was saved, but customer confirmation email failed: ${confirmationNotification.errorCode}.`,
      );
    }

    return Response.json(
      {
        ok: true,
        reference: created.reference,
        pairCount: created.pairCount,
        items: created.items.map((item) => ({
          pairNumber: item.pairNumber,
          serviceId: item.serviceId,
          serviceName: item.serviceName,
          servicePriceLabel: item.servicePriceLabel,
          servicePrice: item.servicePrice,
          footwearType: item.footwearType,
          brand: item.brand,
          specialRequest: item.specialRequest,
        })),
        serviceSubtotal: created.serviceSubtotal,
        deliveryFee: created.deliveryFee,
        freeDeliveryApplied: created.freeDeliveryApplied,
        expressFee: created.expressFee,
        total: created.totalAmount,
        message:
          "Your booking request has been received. Shoe Doctor will contact you about the service details.",
      },
      { status: 201 },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to create booking.";
    return Response.json({ ok: false, message }, { status: 400 });
  }
}
