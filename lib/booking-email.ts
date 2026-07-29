import type { Booking } from "./data";

const BOOKING_RECIPIENT = "shoedoctorhtd@gmail.com";

type EmailBinding = {
  send(message: {
    from: string;
    to?: string;
    subject: string;
    text: string;
    html: string;
  }): Promise<unknown>;
};

type EmailEnvironment = {
  BOOKING_EMAIL?: EmailBinding;
  BOOKING_NOTIFICATION_FROM?: string;
};

export type EmailNotificationResult =
  | { status: "sent" }
  | { status: "not_configured" }
  | { status: "failed" };

/**
 * Sends the owner a booking email through Cloudflare Email Service.
 * A booking remains in the admin portal even if email delivery is unavailable.
 */
export async function sendBookingEmailNotification(
  booking: Booking,
): Promise<EmailNotificationResult> {
  const environment = await getRuntimeEnvironment();
  const from = environment.BOOKING_NOTIFICATION_FROM?.trim();
  if (!environment.BOOKING_EMAIL || !isEmailAddress(from)) {
    return { status: "not_configured" };
  }

  const content = bookingEmailContent(booking);
  try {
    await environment.BOOKING_EMAIL.send({
      from,
      subject: `New booking ${booking.reference} — ${booking.serviceName}`,
      text: content.text,
      html: content.html,
    });
    return { status: "sent" };
  } catch (error) {
    console.error(
      `Email booking notification failed for ${booking.reference}:`,
      error,
    );
    return { status: "failed" };
  }
}

function bookingEmailContent(booking: Booking) {
  const fulfillment =
    booking.fulfillmentMethod === "pickup_delivery"
      ? "Pickup & drop-off"
      : "Self drop & pickup";
  const fields: Array<[string, string]> = [
    ["Reference", booking.reference],
    ["Customer", booking.customerName],
    ["Phone / WhatsApp", booking.phone],
    ["Email", booking.email ?? "Not provided"],
    ["Service", booking.serviceName],
    ["Footwear", booking.shoeType],
    ["Brand", booking.shoeBrand ?? "Not provided"],
    ["Preferred date", booking.preferredDate ?? "Not specified"],
    ["Collection", fulfillment],
    ["Address", booking.pickupAddress ?? "Not applicable"],
    ["Map location", booking.locationUrl ?? "Not provided"],
    ["Express service", booking.expressRequested ? "Yes" : "No"],
    ["Special request", booking.notes ?? "None"],
  ];
  const text = [
    "New Shoe Doctor booking",
    "",
    ...fields.map(([label, value]) => `${label}: ${value}`),
  ].join("\n");
  const rows = fields
    .map(
      ([label, value]) =>
        `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`,
    )
    .join("");

  return {
    text,
    html: `<h1>New Shoe Doctor booking</h1><table>${rows}</table>`,
  };
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;",
    };
    return entities[character];
  });
}

function isEmailAddress(value: string | undefined): value is string {
  return Boolean(value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(value));
}

async function getRuntimeEnvironment(): Promise<EmailEnvironment> {
  try {
    const workers = (await import("cloudflare:workers")) as {
      env?: EmailEnvironment;
    };
    if (workers.env) return workers.env;
  } catch {
    // Local development can use environment variables instead.
  }

  return {
    BOOKING_NOTIFICATION_FROM: process.env.BOOKING_NOTIFICATION_FROM,
  };
}
