import {
  BOOKING_STATUSES,
  FULFILLMENT_METHODS,
  SERVICE_CATEGORIES,
  SERVICE_TONES,
  type BookingStatus,
  type ServiceInput,
} from "./data";

function cleanText(value: unknown, maxLength: number) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function optionalText(value: unknown, maxLength: number) {
  const cleaned = cleanText(value, maxLength);
  return cleaned || null;
}

function getNepalCalendarDate() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Kathmandu",
    year: "numeric",
  }).formatToParts(new Date());
  const dateValues: Record<string, string> = {};
  parts.forEach((part) => {
    dateValues[part.type] = part.value;
  });

  return dateValues.year + "-" + dateValues.month + "-" + dateValues.day;
}

export function parseServiceInput(value: unknown): ServiceInput {
  const input = (value ?? {}) as Record<string, unknown>;
  const name = cleanText(input.name, 80);
  const category = cleanText(input.category, 30);
  const priceLabel = cleanText(input.priceLabel, 40);
  const turnaround = cleanText(input.turnaround, 40);
  const description = cleanText(input.description, 280);
  const tone = cleanText(input.tone, 20);
  const icon = cleanText(input.icon, 4) || "+";
  const rawFeatures = Array.isArray(input.features) ? input.features : [];
  const features = rawFeatures
    .map((feature) => cleanText(feature, 100))
    .filter(Boolean)
    .slice(0, 12);
  const sortOrderValue = Number(input.sortOrder);

  if (!name || !priceLabel || !turnaround || !description) {
    throw new Error("Name, price, turnaround and description are required.");
  }
  if (!SERVICE_CATEGORIES.includes(category as ServiceInput["category"])) {
    throw new Error("Choose a valid service category.");
  }
  if (!SERVICE_TONES.includes(tone as ServiceInput["tone"])) {
    throw new Error("Choose a valid card colour.");
  }

  return {
    name,
    category: category as ServiceInput["category"],
    priceLabel,
    specialPriceLabel: optionalText(input.specialPriceLabel, 60),
    turnaround,
    description,
    features,
    badge: optionalText(input.badge, 40),
    tone: tone as ServiceInput["tone"],
    icon,
    active: input.active !== false,
    sortOrder: Number.isFinite(sortOrderValue)
      ? Math.max(0, Math.min(9999, Math.round(sortOrderValue)))
      : 0,
  };
}

export function parseBookingStatus(value: unknown): BookingStatus {
  const status = cleanText(value, 30) as BookingStatus;
  if (!BOOKING_STATUSES.includes(status)) {
    throw new Error("Choose a valid booking status.");
  }
  return status;
}

export function parsePublicBooking(value: unknown) {
  const input = (value ?? {}) as Record<string, unknown>;
  const customerName = cleanText(input.customerName, 80);
  const phone = cleanText(input.phone, 30);
  const email = optionalText(input.email, 120);
  const serviceId = cleanText(input.serviceId, 80);
  const shoeType = cleanText(input.shoeType, 80);
  const shoeBrand = optionalText(input.shoeBrand, 80);
  const preferredDate = optionalText(input.preferredDate, 20);
  const fulfillmentMethod = cleanText(input.fulfillmentMethod, 30);
  const pickupAddress = optionalText(input.pickupAddress, 300);
  const locationUrl = optionalText(input.locationUrl, 500);
  const notes = optionalText(input.notes, 800);
  const website = cleanText(input.website, 120);

  if (website) {
    throw new Error("Unable to submit this booking.");
  }
  if (customerName.length < 2) {
    throw new Error("Please enter your full name.");
  }
  const phoneDigits = phone.replace(/\D/g, "");
  if (phoneDigits.length < 7 || phoneDigits.length > 15) {
    throw new Error("Please enter a valid phone or WhatsApp number.");
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Please enter a valid email address.");
  }
  if (!serviceId || !shoeType) {
    throw new Error("Please choose a service and enter the footwear type.");
  }
  if (preferredDate && !/^\d{4}-\d{2}-\d{2}$/.test(preferredDate)) {
    throw new Error("Please choose a valid preferred date.");
  }
  if (preferredDate && preferredDate < getNepalCalendarDate()) {
    throw new Error("Please choose a preferred date that is today or later.");
  }
  if (
    !FULFILLMENT_METHODS.includes(
      fulfillmentMethod as (typeof FULFILLMENT_METHODS)[number],
    )
  ) {
    throw new Error("Please choose self drop-off or pickup and delivery.");
  }
  if (fulfillmentMethod === "pickup_delivery" && !pickupAddress) {
    throw new Error("Please enter the pickup and drop-off address.");
  }
  if (locationUrl && !/^https?:\/\//i.test(locationUrl)) {
    throw new Error("Please enter a valid map location link.");
  }

  return {
    customerName,
    phone,
    email,
    serviceId,
    shoeType,
    shoeBrand,
    preferredDate,
    fulfillmentMethod: fulfillmentMethod as
      | "self_dropoff"
      | "pickup_delivery",
    pickupAddress:
      fulfillmentMethod === "pickup_delivery" ? pickupAddress : null,
    locationUrl:
      fulfillmentMethod === "pickup_delivery" ? locationUrl : null,
    notes,
    expressRequested: input.expressRequested === true,
  };
}
