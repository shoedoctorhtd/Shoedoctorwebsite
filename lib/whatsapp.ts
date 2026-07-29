import type { Booking } from "./data";

const DEFAULT_BOOKING_RECIPIENT = "9779761716743";
const DEFAULT_TEMPLATE_NAME = "new_booking_alert";
const DEFAULT_TEMPLATE_LANGUAGE = "en_US";
const DEFAULT_API_VERSION = "v25.0";

type WhatsAppEnvironment = {
  WHATSAPP_ACCESS_TOKEN?: string;
  WHATSAPP_PHONE_NUMBER_ID?: string;
  WHATSAPP_BOOKING_RECIPIENT?: string;
  WHATSAPP_TEMPLATE_NAME?: string;
  WHATSAPP_TEMPLATE_LANGUAGE?: string;
  WHATSAPP_API_VERSION?: string;
};

type WhatsAppConfig = {
  accessToken: string;
  phoneNumberId: string;
  recipient: string;
  templateName: string;
  templateLanguage: string;
  apiVersion: string;
};

export type WhatsAppNotificationResult =
  | { status: "sent" }
  | { status: "not_configured" }
  | { status: "failed" };

/**
 * Sends the owner a template notification after a booking has been stored.
 * The booking is intentionally never rolled back when WhatsApp is unavailable.
 */
export async function sendBookingWhatsAppNotification(
  booking: Booking,
): Promise<WhatsAppNotificationResult> {
  const config = getWhatsAppConfig(await getRuntimeEnvironment());
  if (!config) return { status: "not_configured" };

  try {
    const response = await fetch(
      `https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${config.accessToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: config.recipient,
          type: "template",
          template: {
            name: config.templateName,
            language: { code: config.templateLanguage },
            components: [
              {
                type: "body",
                parameters: bookingTemplateParameters(booking),
              },
            ],
          },
        }),
      },
    );

    if (!response.ok) {
      console.error(
        `WhatsApp booking notification failed for ${booking.reference}: ${response.status}`,
      );
      return { status: "failed" };
    }

    return { status: "sent" };
  } catch (error) {
    console.error(
      `WhatsApp booking notification failed for ${booking.reference}:`,
      error,
    );
    return { status: "failed" };
  }
}

function bookingTemplateParameters(booking: Booking) {
  const fulfillment =
    booking.fulfillmentMethod === "pickup_delivery"
      ? "Pickup & drop-off"
      : "Self drop & pickup";

  return [
    booking.reference,
    booking.customerName,
    booking.phone,
    booking.serviceName,
    booking.shoeType,
    booking.shoeBrand ?? "Not provided",
    booking.preferredDate ?? "Not specified",
    fulfillment,
    booking.pickupAddress ?? "Not applicable",
    booking.locationUrl ?? "Not provided",
    booking.expressRequested ? "Yes" : "No",
    booking.notes ?? "None",
  ].map((text) => ({ type: "text", text }));
}

function getWhatsAppConfig(
  environment: WhatsAppEnvironment,
): WhatsAppConfig | null {
  const accessToken = environment.WHATSAPP_ACCESS_TOKEN?.trim();
  const phoneNumberId = environment.WHATSAPP_PHONE_NUMBER_ID?.trim();
  if (!accessToken || !phoneNumberId || !/^\d+$/u.test(phoneNumberId)) {
    return null;
  }

  const recipient = digitsOnly(
    environment.WHATSAPP_BOOKING_RECIPIENT ?? DEFAULT_BOOKING_RECIPIENT,
  );
  if (!recipient) return null;

  const suppliedVersion = environment.WHATSAPP_API_VERSION?.trim();
  const apiVersion = /^v\d+\.\d+$/u.test(suppliedVersion ?? "")
    ? suppliedVersion!
    : DEFAULT_API_VERSION;

  return {
    accessToken,
    phoneNumberId,
    recipient,
    templateName:
      environment.WHATSAPP_TEMPLATE_NAME?.trim() || DEFAULT_TEMPLATE_NAME,
    templateLanguage:
      environment.WHATSAPP_TEMPLATE_LANGUAGE?.trim() ||
      DEFAULT_TEMPLATE_LANGUAGE,
    apiVersion,
  };
}

function digitsOnly(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15 ? digits : "";
}

async function getRuntimeEnvironment(): Promise<WhatsAppEnvironment> {
  try {
    const workers = (await import("cloudflare:workers")) as {
      env?: WhatsAppEnvironment;
    };
    if (workers.env) return workers.env;
  } catch {
    // Local development can use environment variables instead.
  }

  return {
    WHATSAPP_ACCESS_TOKEN: process.env.WHATSAPP_ACCESS_TOKEN,
    WHATSAPP_PHONE_NUMBER_ID: process.env.WHATSAPP_PHONE_NUMBER_ID,
    WHATSAPP_BOOKING_RECIPIENT: process.env.WHATSAPP_BOOKING_RECIPIENT,
    WHATSAPP_TEMPLATE_NAME: process.env.WHATSAPP_TEMPLATE_NAME,
    WHATSAPP_TEMPLATE_LANGUAGE: process.env.WHATSAPP_TEMPLATE_LANGUAGE,
    WHATSAPP_API_VERSION: process.env.WHATSAPP_API_VERSION,
  };
}
