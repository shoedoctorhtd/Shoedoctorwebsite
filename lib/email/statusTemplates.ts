export const CUSTOMER_EMAIL_STATUSES = [
  "confirmed",
  "received",
  "in_progress",
  "completed",
  "ready",
  "cancelled",
] as const;

export type CustomerEmailStatus = (typeof CUSTOMER_EMAIL_STATUSES)[number];

export type StatusEmailBooking = {
  bookingReference: string;
  customerName: string;
  fulfillmentMethod: "self_dropoff" | "pickup_delivery";
  serviceName: string;
};

export type StatusEmailContent = {
  html: string;
  subject: string;
  text: string;
};

type TemplateInput = StatusEmailBooking & {
  currentStatus: string;
  heading: string;
  paragraphs: string[];
  subject: string;
};

export function isCustomerEmailStatus(
  status: string,
): status is CustomerEmailStatus {
  return (CUSTOMER_EMAIL_STATUSES as readonly string[]).includes(status);
}

/**
 * Builds the only customer-facing status messages in one place. Dynamic booking
 * values are escaped before they enter the HTML alternative.
 */
export function buildStatusEmail(
  status: string,
  booking: StatusEmailBooking,
): StatusEmailContent | null {
  const customerName = textValue(booking.customerName) || "there";
  const bookingReference = textValue(booking.bookingReference) || "your booking";
  const serviceName = textValue(booking.serviceName) || "your selected service";

  switch (status) {
    case "confirmed":
      return createTemplate({
        bookingReference,
        customerName,
        currentStatus: "\u2705 Order Accepted",
        fulfillmentMethod: booking.fulfillmentMethod,
        heading: "Your booking has been accepted",
        paragraphs: [
          "Your Shoe Doctor booking has been accepted.",
          "We'll notify you again when your shoes reach our care team.",
        ],
        serviceName,
        subject: `\u{1F45F} Booking Accepted \u2014 ${bookingReference}`,
      });
    case "received":
      return createTemplate({
        bookingReference,
        customerName,
        currentStatus: "\u2705 Shoes Received",
        fulfillmentMethod: booking.fulfillmentMethod,
        heading: "Your shoes are safely with Shoe Doctor",
        paragraphs: [
          "Our team will begin the care process shortly.",
          "We'll keep you updated as your shoes move through the process.",
        ],
        serviceName,
        subject: `\u{1F45F} We've Received Your Shoes \u2014 ${bookingReference}`,
      });
    case "in_progress":
      return createTemplate({
        bookingReference,
        customerName,
        currentStatus: "\u{1F9FC} Cleaning in Progress",
        fulfillmentMethod: booking.fulfillmentMethod,
        heading: "Your shoes are being cleaned",
        paragraphs: [
          "Your shoes are currently being professionally cleaned by our Shoe Doctor team.",
          "We'll notify you when the care process is completed.",
        ],
        serviceName,
        subject: `\u{1F9FC} Your Shoes Are Being Cleaned \u2014 ${bookingReference}`,
      });
    case "completed":
      return createTemplate({
        bookingReference,
        customerName,
        currentStatus: "\u2705 Cleaning / Care Completed",
        fulfillmentMethod: booking.fulfillmentMethod,
        heading: "Your shoe care is complete",
        paragraphs: [
          "Good news \u2014 the care process for your shoes has been completed.",
          "We're now preparing your shoes for pickup or return.",
          "You'll receive another update when they are Ready to Go.",
        ],
        serviceName,
        subject: `\u2728 Your Shoe Care Is Complete \u2014 ${bookingReference}`,
      });
    case "ready": {
      const collectionMessage =
        booking.fulfillmentMethod === "pickup_delivery"
          ? "Your shoes are ready and will now be prepared for return delivery."
          : "Your shoes are ready for collection at Shoe Doctor.";
      return createTemplate({
        bookingReference,
        customerName,
        currentStatus: "\u{1F389} Ready to Go",
        fulfillmentMethod: booking.fulfillmentMethod,
        heading: "Your shoes are ready to go",
        paragraphs: ["Your shoes are ready to go!", collectionMessage],
        serviceName,
        subject: `\u{1F389} Your Shoes Are Ready \u2014 ${bookingReference}`,
      });
    }
    case "cancelled":
      return createTemplate({
        bookingReference,
        customerName,
        currentStatus: "Booking Cancelled",
        fulfillmentMethod: booking.fulfillmentMethod,
        heading: "Your booking has been cancelled",
        paragraphs: [
          "Your Shoe Doctor booking has been cancelled.",
          "Please contact Shoe Doctor if you have any questions about this update.",
        ],
        serviceName,
        subject: `Booking Update \u2014 ${bookingReference}`,
      });
    default:
      return null;
  }
}

function createTemplate(input: TemplateInput): StatusEmailContent {
  const details: Array<[string, string]> = [
    ["Booking", input.bookingReference],
    ["Service", input.serviceName],
    ["Current Status", input.currentStatus],
  ];
  const text = [
    `Hi ${input.customerName},`,
    "",
    ...input.paragraphs,
    "",
    ...details.map(([label, value]) => `${label}: ${value}`),
    "",
    "Shoe Doctor",
    "We Diagnose. We Clean. We Restore.",
    "9761716743",
    "shoedoctor.com.np",
  ].join("\n");
  const rows = details
    .map(
      ([label, value]) =>
        `<tr><th scope="row">${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`,
    )
    .join("");
  const paragraphs = input.paragraphs
    .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
    .join("");

  return {
    subject: input.subject,
    text,
    html: `<!doctype html>
<html lang="en">
  <body style="margin:0;background:#f6f5f2;color:#151515;font-family:Arial,sans-serif;">
    <main style="box-sizing:border-box;margin:0 auto;max-width:600px;padding:28px 16px;">
      <section style="background:#ffffff;border:1px solid #dedbd4;border-radius:12px;overflow:hidden;">
        <div style="background:#7b1738;color:#ffffff;padding:24px 28px;">
          <p style="font-size:12px;font-weight:700;letter-spacing:.12em;margin:0 0 8px;text-transform:uppercase;">Shoe Doctor</p>
          <h1 style="font-size:24px;line-height:1.25;margin:0;">${escapeHtml(input.heading)}</h1>
        </div>
        <div style="padding:26px 28px;">
          <p style="font-size:16px;line-height:1.6;margin:0 0 16px;">Hi ${escapeHtml(input.customerName)},</p>
          <div style="font-size:16px;line-height:1.6;">${paragraphs}</div>
          <table role="presentation" style="border-collapse:collapse;font-size:14px;line-height:1.45;margin:22px 0 0;width:100%;">
            <tbody>${rows}</tbody>
          </table>
        </div>
        <footer style="border-top:1px solid #e7e4de;color:#5e5a55;font-size:13px;line-height:1.6;padding:20px 28px;">
          <strong style="color:#151515;">Shoe Doctor</strong><br />
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

function textValue(value: unknown) {
  return String(value ?? "").trim();
}
