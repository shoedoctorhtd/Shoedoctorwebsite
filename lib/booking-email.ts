import type { Booking } from "./data";
import { getBookingItems } from "./booking-items.js";
import { getBookingPublicReference } from "./booking-reference.ts";

type EmailBinding = {
  send(message: {
    from: string;
    to: string;
    subject: string;
    text: string;
    html: string;
  }): Promise<unknown>;
};

export type EmailEnvironment = {
  BOOKING_EMAIL?: EmailBinding;
  BOOKING_NOTIFICATION_FROM?: string;
  ADMIN_EMAIL?: string;
  OWNER_ALERT_EMAIL?: string;
};

export type EmailNotificationResult =
  | { status: "sent" }
  | { status: "not_configured" }
  | { status: "failed" };

type EmailAction = {
  href: string;
  label: string;
};

type EmailField = {
  label: string;
  value: string;
  action?: EmailAction;
};

type EmailSection = {
  heading: string;
  fields: EmailField[];
};

/**
 * Sends the owner one notification after a new booking has been persisted.
 * The fixed recipient must match the BOOKING_EMAIL binding's destination.
 * A delivery failure is intentionally isolated from the completed D1 booking.
 */
export async function sendBookingEmailNotification(
  booking: Booking,
  environment?: EmailEnvironment,
): Promise<EmailNotificationResult> {
  const content = bookingEmailContent(booking);
  return sendOwnerEmail(content, environment);
}

/**
 * The existing BOOKING_EMAIL binding remains the single owner-alert transport.
 * Its recipient is supplied by deployment configuration, never embedded in a
 * booking, audit record, migration, or application source file.
 */
export async function sendOwnerEmail(
  content: { subject: string; text: string; html: string },
  environment?: EmailEnvironment,
): Promise<EmailNotificationResult> {
  try {
    const runtime = environment ?? (await getRuntimeEnvironment());
    const from = runtime.BOOKING_NOTIFICATION_FROM?.trim();
    const recipient = (runtime.OWNER_ALERT_EMAIL ?? runtime.ADMIN_EMAIL)?.trim();
    if (!runtime.BOOKING_EMAIL || !isEmailAddress(from) || !isEmailAddress(recipient)) {
      return { status: "not_configured" };
    }

    await runtime.BOOKING_EMAIL.send({
      from,
      to: recipient,
      subject: content.subject,
      text: content.text,
      html: content.html,
    });
    return { status: "sent" };
  } catch (error) {
    console.error("A persisted owner alert could not be delivered:", error);
    return { status: "failed" };
  }
}

function bookingEmailContent(booking: Booking) {
  const publicReference = getBookingPublicReference(booking);
  const fulfillment =
    booking.fulfillmentMethod === "pickup_delivery"
      ? "Pickup & return delivery"
      : "Self drop-off & pickup";
  const pickupArea = booking.pickupArea
    ? booking.pickupArea === "hetauda_city"
      ? "Hetauda City"
      : "Other city"
    : "Not applicable";
  const items = getBookingItems(booking);
  const pairCount = booking.pairCount || items.length;
  const deliveryFee = booking.deliveryFee ? formatNpr(booking.deliveryFee) : "FREE";
  const freeDeliveryReason = booking.freeDeliveryApplied
    ? booking.freeDeliveryReason?.trim() ||
      "4+ pairs within Hetauda qualify for free pickup & return."
    : null;
  const serviceSubtotal = formatAmount(booking.serviceSubtotal);
  const expressFee = booking.expressRequested
    ? booking.expressFee === null
      ? "Requested — Quote after review"
      : formatNpr(booking.expressFee)
    : "No";
  const totalAmount = formatAmount(booking.totalAmount);
  const whatsappUrl = whatsappUrlFor(booking.phone);
  const mapUrl = safeHttpUrl(booking.locationUrl);
  const pairSections: EmailSection[] = items.map((item) => ({
    heading: "Pair " + item.pairNumber,
    fields: [
      { label: "Service", value: item.serviceName },
      { label: "Footwear type", value: item.footwearType },
      { label: "Brand", value: item.brand ?? "Not provided" },
      { label: "Request", value: item.specialRequest ?? "None" },
      {
        label: "Price",
        value: formatItemAmount(item.servicePrice, item.servicePriceLabel),
      },
    ],
  }));
  const sections: EmailSection[] = [
    {
      heading: "Booking",
      fields: [
        { label: "Booking Reference", value: publicReference },
        { label: "Created", value: formatBookingDateTime(booking.createdAt) },
        {
          label: "Preferred service date",
          value: booking.preferredDate ?? "Not specified",
        },
        {
          label: "Status",
          value: booking.status === "new" ? "New" : booking.status,
        },
        {
          label: "Total pairs",
          value: pairCount + (pairCount === 1 ? " pair" : " pairs"),
        },
      ],
    },
    {
      heading: "Customer",
      fields: [
        { label: "Customer name", value: booking.customerName },
        {
          label: "Phone / WhatsApp",
          value: booking.phone,
          action: whatsappUrl
            ? { href: whatsappUrl, label: "Open WhatsApp" }
            : undefined,
        },
        { label: "Email", value: booking.email ?? "Not provided" },
      ],
    },
    ...pairSections,
    {
      heading: "Collection & delivery",
      fields: [
        { label: "Collection method", value: fulfillment },
        { label: "Pickup area", value: pickupArea },
        { label: "Pickup & return fee", value: deliveryFee },
        ...(freeDeliveryReason
          ? [{ label: "Free delivery offer", value: freeDeliveryReason }]
          : []),
        {
          label: "Pickup address",
          value: booking.pickupAddress ?? "Not applicable",
        },
        {
          label: "Map location",
          value: booking.locationUrl ?? "Not provided",
          action: mapUrl ? { href: mapUrl, label: "Open map" } : undefined,
        },
      ],
    },
    {
      heading: "Order summary",
      fields: [
        { label: "Services subtotal", value: serviceSubtotal },
        { label: "Express", value: expressFee },
        { label: "Total", value: totalAmount },
      ],
    },
    {
      heading: "Customer requirements",
      fields: [
        { label: "Special request", value: booking.notes ?? "None" },
      ],
    },
  ];
  const highlights: EmailField[] = [
    { label: "Booking Reference", value: publicReference },
    { label: "Customer name", value: booking.customerName },
    { label: "Phone / WhatsApp", value: booking.phone },
    {
      label: "Pairs",
      value: pairCount + (pairCount === 1 ? " pair" : " pairs"),
    },
    { label: "Collection method", value: fulfillment },
    { label: "Total estimate", value: totalAmount },
  ];
  const text = [
    "NEW BOOKING",
    "Shoe Doctor",
    "",
    ...sections.flatMap((section) => [
      section.heading.toUpperCase(),
      ...section.fields.flatMap((field) => [
        `${field.label}: ${field.value}`,
        ...(field.action ? [`${field.action.label}: ${field.action.href}`] : []),
      ]),
      "",
    ]),
    "Shoe Doctor",
    "We Diagnose. We Clean. We Restore.",
    "9761716743",
    "shoedoctor.com.np",
  ].join("\n");
  const highlightRows = emailRows(highlights, true);
  const sectionHtml = sections
    .map(
      (section) => `
        <section style="margin:24px 0 0;">
          <h2 style="color:#7b1738;font-size:13px;font-weight:700;letter-spacing:.1em;margin:0 0 8px;text-transform:uppercase;">${escapeHtml(section.heading)}</h2>
          <table role="presentation" style="border-collapse:collapse;font-size:14px;line-height:1.5;width:100%;">
            <tbody>${emailRows(section.fields)}</tbody>
          </table>
        </section>`,
    )
    .join("");

  return {
    subject: `\u{1F534} New Shoe Doctor Booking \u2014 ${headerValue(publicReference)} \u2014 ${headerValue(booking.customerName)}`,
    text,
    html: `<!doctype html>
<html lang="en">
  <body style="margin:0;background:#f6f5f2;color:#171412;font-family:Arial,sans-serif;">
    <main style="box-sizing:border-box;margin:0 auto;max-width:640px;padding:28px 16px;">
      <section style="background:#ffffff;border:1px solid #dedbd4;border-radius:12px;overflow:hidden;">
        <header style="background:#7b1738;color:#ffffff;padding:25px 28px;">
          <p style="font-size:12px;font-weight:700;letter-spacing:.14em;margin:0 0 9px;text-transform:uppercase;">New booking</p>
          <h1 style="font-size:25px;line-height:1.25;margin:0;">A new Shoe Doctor booking has arrived</h1>
        </header>
        <div style="padding:26px 28px;">
          <p style="color:#7b1738;font-size:12px;font-weight:700;letter-spacing:.12em;margin:0 0 10px;text-transform:uppercase;">New booking</p>
          <p style="font-size:16px;line-height:1.6;margin:0;">Review the saved booking details below and contact the customer to confirm the treatment and final quote.</p>
          <table role="presentation" style="border-collapse:collapse;font-size:14px;line-height:1.45;margin:22px 0 0;width:100%;">
            <tbody>${highlightRows}</tbody>
          </table>${sectionHtml}
        </div>
        <footer style="border-top:1px solid #e7e4de;color:#5e5a55;font-size:13px;line-height:1.6;padding:20px 28px;">
          <strong style="color:#171412;">Shoe Doctor</strong><br />
          We Diagnose. We Clean. We Restore.<br />
          9761716743<br />
          shoedoctor.com.np
        </footer>
      </section>
    </main>
  </body>
</html>`,
  };
}

function emailRows(fields: EmailField[], highlight = false) {
  return fields
    .map((field) => {
      const action = field.action
        ? `<br /><a href="${escapeHtml(field.action.href)}" style="color:#7b1738;font-weight:700;text-decoration:underline;">${escapeHtml(field.action.label)}</a>`
        : "";
      return `<tr>
        <th scope="row" style="border:${highlight ? "1px solid #e7d5dc" : "0"};background:${highlight ? "#fbf5f7" : "transparent"};color:#5e5a55;font-size:12px;font-weight:700;padding:${highlight ? "11px 12px" : "8px 0"};text-align:left;vertical-align:top;width:42%;">${escapeHtml(field.label)}</th>
        <td style="border:${highlight ? "1px solid #e7d5dc" : "0"};font-weight:${highlight ? "700" : "400"};padding:${highlight ? "11px 12px" : "8px 0"};vertical-align:top;white-space:pre-wrap;">${escapeHtml(field.value)}${action}</td>
      </tr>`;
    })
    .join("");
}

function formatBookingDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return `${new Intl.DateTimeFormat("en-NP", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kathmandu",
  }).format(date)} NPT`;
}

function formatNpr(value: number) {
  return `Rs ${new Intl.NumberFormat("en-NP", {
    maximumFractionDigits: 0,
  }).format(value)}`;
}

function formatAmount(value: number | null) {
  return value === null ? "Quote after review" : formatNpr(value);
}

function formatItemAmount(value: number | null, priceLabel: string) {
  return value === null ? priceLabel || "Quote after review" : formatNpr(value);
}

function headerValue(value: string) {
  return value.replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim();
}

function safeHttpUrl(value: string | null) {
  if (!value) return null;

  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.href
      : null;
  } catch {
    return null;
  }
}

function whatsappUrlFor(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return /^977\d{10}$/u.test(digits) ? `https://wa.me/${digits}` : null;
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
    const workers = (await import(/* @vite-ignore */ "cloudflare:workers")) as {
      env?: EmailEnvironment;
    };
    if (workers.env) return workers.env;
  } catch {
    // Local development can use environment variables instead.
  }

  return {
    BOOKING_NOTIFICATION_FROM: process.env.BOOKING_NOTIFICATION_FROM,
    ADMIN_EMAIL: process.env.ADMIN_EMAIL,
    OWNER_ALERT_EMAIL: process.env.OWNER_ALERT_EMAIL,
  };
}
