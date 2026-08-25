import { createBooking } from "@/lib/data";
import { getBookingPublicReference } from "@/lib/booking-reference";
import { parsePublicBooking } from "@/lib/validation";
import { sendBookingEmailNotification } from "@/lib/booking-email";
import {
  associateBookingWithCustomer,
  clearCustomerSessionCookie,
  customerSessionCookie,
  getCustomerSession,
  parseCustomerBookingPreferences,
} from "@/lib/customers";
import { sendBookingConfirmationEmail } from "@/lib/email/bookingConfirmation";
import { sendBookingWhatsAppNotification } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const booking = parsePublicBooking(body);
    const preferences = parseCustomerBookingPreferences(body);

    let customerSession: Awaited<ReturnType<typeof getCustomerSession>> | null = null;
    if (preferences.useCustomerSession && !preferences.useDifferentDetails) {
      try {
        customerSession = await getCustomerSession(request);
      } catch {
        // Customer convenience must never make a normal booking unavailable.
        console.error("Unable to validate the saved customer session for a booking.");
      }
    }

    const created = await createBooking(booking, { source: "customer" });
    const publicReference = getBookingPublicReference(created);
    const [emailNotification, whatsappNotification, confirmationNotification] =
      await Promise.all([
        sendBookingEmailNotification(created),
        sendBookingWhatsAppNotification(created),
        sendBookingConfirmationEmail(created),
      ]);

    let customerSessionToken: string | null = null;
    try {
      const customerAssociation = await associateBookingWithCustomer({
        bookingId: created.id,
        customerName: created.customerName,
        phone: created.phone,
        email: created.email,
        pickupAddress: created.pickupAddress,
        pickupArea: created.pickupArea,
        preferences,
        authenticatedCustomerId: customerSession?.customerId ?? null,
      });
      customerSessionToken = customerAssociation.sessionToken;
    } catch {
      // The booking and its original notifications are already safe. Do not
      // report profile details or turn a saved booking into an error.
      console.error("Booking was saved, but the returning-customer update failed.");
    }

    if (emailNotification.status === "not_configured") {
      console.warn(
        `Booking ${publicReference} was saved, but email is not configured.`,
      );
    }
    if (whatsappNotification.status === "not_configured") {
      console.warn(
        `Booking ${publicReference} was saved, but WhatsApp is not configured.`,
      );
    }
    if (confirmationNotification.status === "failed") {
      console.warn(
        `Booking ${publicReference} was saved, but customer confirmation email failed: ${confirmationNotification.errorCode}.`,
      );
    }

    const response = Response.json(
      {
        ok: true,
        // Keep the established public response key, but never expose the
        // legacy operational reference to the booking form.
        reference: publicReference,
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
    if (customerSessionToken) {
      response.headers.append(
        "Set-Cookie",
        customerSessionCookie(customerSessionToken),
      );
    } else if (customerSession?.shouldClearCookie) {
      response.headers.append("Set-Cookie", clearCustomerSessionCookie());
    }
    return response;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to create booking.";
    return Response.json({ ok: false, message }, { status: 400 });
  }
}
