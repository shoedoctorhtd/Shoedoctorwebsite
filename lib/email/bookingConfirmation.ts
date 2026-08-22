import type { Booking } from "../data";
import { getBookingItems } from "../booking-items.js";

const QUOTE_AFTER_REVIEW = "Quote after review";

export type BookingConfirmationEmailContent = {
  html: string;
  subject: string;
  text: string;
};

export type BookingConfirmationEmailResult =
  | { status: "sent" }
  | {
      status: "skipped";
      reason: "customer_email_invalid" | "customer_email_missing";
    }
  | { status: "failed"; errorCode: string };

type BookingWithSummary = Booking & {
  expressFee?: number | null;
  freeDeliveryApplied?: boolean;
  freeDeliveryReason?: string | null;
  pairCount?: number;
  serviceSubtotal?: number | null;
  total?: number | null;
  totalAmount?: number | null;
};

type BookingEmailSummary = {
  deliveryFee: number;
  deliveryLabel: string;
  expressFee: number | null;
  freeDeliveryReason: string | null;
  pairCount: number;
  serviceSubtotal: number | null;
  total: number | null;
};

/**
 * Sends the customer a confirmation only after the booking has been saved.
 * Missing or malformed customer email addresses intentionally do not invoke
 * Gmail, so booking persistence never depends on customer notification setup.
 */
export async function sendBookingConfirmationEmail(
  booking: Booking,
): Promise<BookingConfirmationEmailResult> {
  const recipient = booking.email?.trim() ?? "";
  if (!recipient) {
    return { status: "skipped", reason: "customer_email_missing" };
  }
  if (!isEmailAddress(recipient)) {
    return { status: "skipped", reason: "customer_email_invalid" };
  }

  try {
    // Keep the confirmation on the same Gmail OAuth transport as status
    // emails. Loading it here lets the pure content builder stay testable in
    // Node without reaching Worker-only runtime modules.
    const { sendGmailStatusEmail } = await import("./gmail");
    return await sendGmailStatusEmail({
      content: buildBookingConfirmationEmail(booking),
      to: recipient,
    });
  } catch {
    return { status: "failed", errorCode: "booking_confirmation_unavailable" };
  }
}

export function buildBookingConfirmationEmail(
  booking: Booking,
): BookingConfirmationEmailContent {
  const items = getBookingItems(booking);
  const summary = getBookingEmailSummary(booking, items);
  const pairSections = items.map((item) => ({
    heading: "Pair " + item.pairNumber,
    fields: [
      { label: "Service", value: item.serviceName },
      { label: "Footwear", value: item.footwearType },
      { label: "Brand", value: item.brand ?? "Not provided" },
      { label: "Request", value: item.specialRequest ?? "None" },
      {
        label: "Estimated price",
        value: formatItemAmount(item.servicePrice, item.servicePriceLabel),
      },
    ],
  }));
  const sections = [
    {
      heading: "Booking",
      fields: [
        { label: "Reference", value: booking.reference },
        {
          label: "Pairs",
          value:
            summary.pairCount +
            (summary.pairCount === 1 ? " pair selected" : " pairs selected"),
        },
        {
          label: "Preferred service date",
          value: booking.preferredDate ?? "Not specified",
        },
      ],
    },
    ...pairSections,
    {
      heading: "Collection & estimate",
      fields: [
        { label: "Delivery method", value: summary.deliveryLabel },
        {
          label: "Pickup & return",
          value: formatDeliveryFee(summary.deliveryFee),
        },
        ...(summary.freeDeliveryReason
          ? [{ label: "Free delivery offer", value: summary.freeDeliveryReason }]
          : []),
        {
          label: "Services subtotal",
          value: formatAmount(summary.serviceSubtotal),
        },
        {
          label: "Express service",
          value: expressValue(booking.expressRequested, summary.expressFee),
        },
        { label: "Total estimated cost", value: formatAmount(summary.total) },
      ],
    },
  ];
  const text = [
    "SHOE DOCTOR BOOKING CONFIRMATION",
    "",
    "Hi " + (textValue(booking.customerName) || "there") + ",",
    "",
    "We received your booking request. We will review the footwear and confirm the final treatment, availability and quote with you.",
    "",
    ...sections.flatMap((section) => [
      section.heading.toUpperCase(),
      ...section.fields.map((field) => field.label + ": " + field.value),
      "",
    ]),
    "Shoe Doctor",
    "We Diagnose. We Clean. We Restore.",
    "9761716743",
    "shoedoctor.com.np",
  ].join("\n");
  const sectionHtml = sections
    .map(
      (section) =>
        '<section style="margin:24px 0 0;"><h2 style="color:#7b1738;font-size:13px;font-weight:700;letter-spacing:.1em;margin:0 0 8px;text-transform:uppercase;">' +
        escapeHtml(section.heading) +
        '</h2><table role="presentation" style="border-collapse:collapse;font-size:14px;line-height:1.5;width:100%;"><tbody>' +
        emailRows(section.fields) +
        "</tbody></table></section>",
    )
    .join("");

  return {
    subject:
      "\u{1F45F} Booking Confirmation \u2014 " +
      headerValue(booking.reference),
    text,
    html:
      '<!doctype html><html lang="en"><body style="margin:0;background:#f6f5f2;color:#151515;font-family:Arial,sans-serif;"><main style="box-sizing:border-box;margin:0 auto;max-width:600px;padding:28px 16px;"><section style="background:#ffffff;border:1px solid #dedbd4;border-radius:12px;overflow:hidden;"><div style="background:#7b1738;color:#ffffff;padding:24px 28px;"><p style="font-size:12px;font-weight:700;letter-spacing:.12em;margin:0 0 8px;text-transform:uppercase;">Shoe Doctor</p><h1 style="font-size:24px;line-height:1.25;margin:0;">We received your booking</h1></div><div style="padding:26px 28px;"><p style="font-size:16px;line-height:1.6;margin:0 0 16px;">Hi ' +
      escapeHtml(textValue(booking.customerName) || "there") +
      ',</p><p style="font-size:16px;line-height:1.6;margin:0;">We will review your footwear and confirm the treatment, availability and final quote with you.</p>' +
      sectionHtml +
      '</div><footer style="border-top:1px solid #e7e4de;color:#5e5a55;font-size:13px;line-height:1.6;padding:20px 28px;"><strong style="color:#151515;">Shoe Doctor</strong><br />We Diagnose. We Clean. We Restore.<br />9761716743<br />shoedoctor.com.np</footer></section></main></body></html>',
  };
}

function getBookingEmailSummary(
  booking: Booking,
  items: ReturnType<typeof getBookingItems>,
): BookingEmailSummary {
  const details = booking as BookingWithSummary;
  const itemSubtotal = items.every((item) => typeof item.servicePrice === "number")
    ? items.reduce((sum, item) => sum + (item.servicePrice ?? 0), 0)
    : null;
  const serviceSubtotal =
    details.serviceSubtotal === undefined
      ? itemSubtotal
      : details.serviceSubtotal;
  const expressFee =
    details.expressFee === undefined
      ? booking.expressRequested
        ? null
        : 0
      : details.expressFee;
  const totalSnapshot =
    details.total === undefined ? details.totalAmount : details.total;
  const total =
    totalSnapshot === undefined
      ? serviceSubtotal === null || expressFee === null
        ? null
        : serviceSubtotal + booking.deliveryFee + expressFee
      : totalSnapshot;
  const isFreeDeliveryOffer = details.freeDeliveryApplied === true;

  return {
    deliveryFee: booking.deliveryFee,
    deliveryLabel:
      booking.fulfillmentMethod === "pickup_delivery"
        ? "Pickup & Return Delivery"
        : "Self Drop & Pickup",
    expressFee,
    freeDeliveryReason: isFreeDeliveryOffer
      ? details.freeDeliveryReason?.trim() ||
        "4+ pairs within Hetauda qualify for free pickup & return."
      : null,
    pairCount: details.pairCount ?? items.length,
    serviceSubtotal,
    total,
  };
}

function expressValue(requested: boolean, fee: number | null) {
  if (!requested) return "Not selected";
  return fee === null ? "Requested — " + QUOTE_AFTER_REVIEW : formatAmount(fee);
}

function formatAmount(value: number | null) {
  return typeof value === "number" ? formatNpr(value) : QUOTE_AFTER_REVIEW;
}

function formatItemAmount(value: number | null, priceLabel: string) {
  return typeof value === "number"
    ? formatNpr(value)
    : priceLabel || QUOTE_AFTER_REVIEW;
}

function formatDeliveryFee(value: number) {
  return value === 0 ? "FREE" : formatNpr(value);
}

function formatNpr(value: number) {
  return (
    "Rs " +
    new Intl.NumberFormat("en-NP", {
      maximumFractionDigits: 0,
    }).format(value)
  );
}

function emailRows(fields: Array<{ label: string; value: string }>) {
  return fields
    .map(
      (field) =>
        '<tr><th scope="row" style="color:#5e5a55;font-size:12px;font-weight:700;padding:8px 0;text-align:left;vertical-align:top;width:42%;">' +
        escapeHtml(field.label) +
        '</th><td style="padding:8px 0;vertical-align:top;white-space:pre-wrap;">' +
        escapeHtml(field.value) +
        "</td></tr>",
    )
    .join("");
}

function headerValue(value: string) {
  return value.replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim();
}

function textValue(value: unknown) {
  return String(value ?? "").trim();
}

function isEmailAddress(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(value);
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
