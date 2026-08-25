import {
  BOOKING_STATUSES,
  FULFILLMENT_METHODS,
  SERVICE_CATEGORIES,
  SERVICE_TONES,
  type BookingStatus,
  type BookingInput,
  type BookingItemInput,
  type BookingDetailsUpdateInput,
  type ServiceInput,
} from "./data";
import { isPickupArea } from "./booking-pricing";
import { isEmailAddress } from "./email/address";

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

function bookingText(value: unknown, maxLength: number, fieldLabel: string) {
  if (typeof value !== "string") {
    if (value === null || value === undefined) return "";
    throw new Error(`${fieldLabel} must be text.`);
  }

  const cleaned = value.trim();
  if (cleaned.length > maxLength) {
    throw new Error(`${fieldLabel} is too long.`);
  }
  return cleaned;
}

function optionalBookingText(
  value: unknown,
  maxLength: number,
  fieldLabel: string,
) {
  return bookingText(value, maxLength, fieldLabel) || null;
}

const CLIENT_CALCULATED_FIELDS = [
  "servicePrice",
  "price",
  "serviceSubtotal",
  "subtotal",
  "deliveryFee",
  "expressFee",
  "total",
  "totalAmount",
  "pairCount",
  "pairNumber",
  "freeDeliveryApplied",
  "freeDeliveryReason",
];

function includesClientCalculatedField(input: Record<string, unknown>) {
  return CLIENT_CALCULATED_FIELDS.some((field) =>
    Object.prototype.hasOwnProperty.call(input, field),
  );
}

function parseBookingItem(value: unknown, pairNumber: number): BookingItemInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Pair ${pairNumber} must include a service and footwear type.`);
  }

  const input = value as Record<string, unknown>;
  if (includesClientCalculatedField(input)) {
    throw new Error(
      `Pair ${pairNumber} prices are calculated securely by Shoe Doctor.`,
    );
  }
  const serviceId = bookingText(input.serviceId, 80, `Pair ${pairNumber} service`);
  const footwearType = bookingText(
    input.footwearType,
    80,
    `Pair ${pairNumber} footwear type`,
  );
  if (!serviceId || !footwearType) {
    throw new Error(`Pair ${pairNumber} needs a service and footwear type.`);
  }

  return {
    serviceId,
    footwearType,
    brand: optionalBookingText(input.brand, 80, `Pair ${pairNumber} brand`),
    specialRequest: optionalBookingText(
      input.specialRequest,
      800,
      `Pair ${pairNumber} special request`,
    ),
  };
}

export function parsePublicBooking(value: unknown): BookingInput {
  const input = (value ?? {}) as Record<string, unknown>;
  const customerName = bookingText(input.customerName, 80, "Full name");
  const phone = bookingText(input.phone, 30, "Phone or WhatsApp number");
  const email = optionalBookingText(input.email, 120, "Email address");
  const preferredDate = optionalBookingText(
    input.preferredDate,
    20,
    "Preferred date",
  );
  const fulfillmentMethod = bookingText(
    input.fulfillmentMethod,
    30,
    "Collection method",
  );
  const pickupArea = bookingText(input.pickupArea, 30, "Pickup area");
  const pickupAddress = optionalBookingText(
    input.pickupAddress,
    300,
    "Pickup address",
  );
  const locationUrl = optionalBookingText(
    input.locationUrl,
    500,
    "Map location link",
  );
  const website = bookingText(input.website, 120, "Website");

  if (website) {
    throw new Error("Unable to submit this booking.");
  }
  if (includesClientCalculatedField(input)) {
    throw new Error("Booking totals are calculated securely by Shoe Doctor.");
  }
  if (customerName.length < 2) {
    throw new Error("Please enter your full name.");
  }
  const phoneDigits = phone.replace(/\D/g, "");
  if (phoneDigits.length < 7 || phoneDigits.length > 15) {
    throw new Error("Please enter a valid phone or WhatsApp number.");
  }
  if (email && !isEmailAddress(email)) {
    throw new Error("Please enter a valid email address.");
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
  if (fulfillmentMethod === "pickup_delivery" && !isPickupArea(pickupArea)) {
    throw new Error("Please choose Hetauda City or Other city for pickup.");
  }
  if (locationUrl && !/^https?:\/\//i.test(locationUrl)) {
    throw new Error("Please enter a valid map location link.");
  }
  if (
    input.expressRequested !== undefined &&
    typeof input.expressRequested !== "boolean"
  ) {
    throw new Error("Please choose a valid express service option.");
  }

  const hasItemArray = Object.prototype.hasOwnProperty.call(input, "items");
  let items: BookingItemInput[];
  let notes: string | null;
  if (hasItemArray) {
    if (!Array.isArray(input.items)) {
      throw new Error("Please add at least one pair to your booking.");
    }
    if (input.items.length < 1 || input.items.length > 20) {
      throw new Error("A booking can include between 1 and 20 pairs.");
    }
    items = input.items.map((item, index) => parseBookingItem(item, index + 1));
    notes = optionalBookingText(input.notes, 800, "Additional booking notes");
  } else {
    // Keep existing single-pair clients/API consumers working. Their previous
    // booking-level notes represented the pair's condition or request.
    items = [
      parseBookingItem(
        {
          brand: input.shoeBrand,
          footwearType: input.shoeType,
          serviceId: input.serviceId,
          specialRequest: input.notes,
        },
        1,
      ),
    ];
    notes = null;
  }

  return {
    customerName,
    phone,
    email,
    items,
    preferredDate,
    fulfillmentMethod: fulfillmentMethod as
      | "self_dropoff"
      | "pickup_delivery",
    pickupArea:
      fulfillmentMethod === "pickup_delivery" && isPickupArea(pickupArea)
        ? pickupArea
        : null,
    pickupAddress:
      fulfillmentMethod === "pickup_delivery" ? pickupAddress : null,
    locationUrl:
      fulfillmentMethod === "pickup_delivery" ? locationUrl : null,
    notes,
    expressRequested: input.expressRequested === true,
  };
}

export function parseAdminBookingDetails(value: unknown): BookingDetailsUpdateInput {
  const input = (value ?? {}) as Record<string, unknown>;
  const output: BookingDetailsUpdateInput = {};
  const has = (key: string) => Object.prototype.hasOwnProperty.call(input, key);
  if (has("customerName")) {
    const name = bookingText(input.customerName, 80, "Customer name");
    if (name.length < 2) throw new Error("Customer name must contain at least two characters.");
    output.customerName = name;
  }
  if (has("phone")) {
    const phone = bookingText(input.phone, 30, "Phone");
    const digits = phone.replace(/\D/gu, "");
    if (digits.length < 7 || digits.length > 15) throw new Error("Enter a valid phone number.");
    output.phone = phone;
  }
  if (has("email")) {
    const email = optionalBookingText(input.email, 120, "Email address");
    if (email && !isEmailAddress(email)) throw new Error("Enter a valid email address.");
    output.email = email;
  }
  if (has("preferredDate")) {
    const date = optionalBookingText(input.preferredDate, 20, "Preferred date");
    if (date && !/^\d{4}-\d{2}-\d{2}$/u.test(date)) throw new Error("Choose a valid preferred date.");
    output.preferredDate = date;
  }
  if (has("fulfillmentMethod")) {
    const method = bookingText(input.fulfillmentMethod, 30, "Collection method");
    if (!FULFILLMENT_METHODS.includes(method as BookingInput["fulfillmentMethod"])) {
      throw new Error("Choose a valid collection method.");
    }
    output.fulfillmentMethod = method as BookingInput["fulfillmentMethod"];
  }
  if (has("pickupArea")) {
    const area = optionalBookingText(input.pickupArea, 30, "Pickup area");
    if (area && !isPickupArea(area)) throw new Error("Choose a valid pickup area.");
    output.pickupArea = area as BookingDetailsUpdateInput["pickupArea"];
  }
  if (has("pickupAddress")) output.pickupAddress = optionalBookingText(input.pickupAddress, 300, "Pickup address");
  if (has("locationUrl")) {
    const url = optionalBookingText(input.locationUrl, 500, "Map location link");
    if (url && !/^https?:\/\//iu.test(url)) throw new Error("Enter a valid map location link.");
    output.locationUrl = url;
  }
  if (has("notes")) output.notes = optionalBookingText(input.notes, 800, "Booking notes");
  if (has("totalAmount")) output.totalAmount = parseNullableMoney(input.totalAmount, "Final price");
  if (has("discountAmount")) output.discountAmount = parseNullableMoney(input.discountAmount, "Discount");
  if (has("paymentAmount")) output.paymentAmount = parseNullableMoney(input.paymentAmount, "Payment amount");
  if (has("paymentStatus")) {
    const status = optionalBookingText(input.paymentStatus, 20, "Payment status");
    if (status && !["unpaid", "partial", "paid", "refunded"].includes(status)) {
      throw new Error("Choose a valid payment status.");
    }
    output.paymentStatus = status as BookingDetailsUpdateInput["paymentStatus"];
  }
  if (!Object.keys(output).length) throw new Error("Choose at least one permitted booking field to update.");
  return output;
}

export function parseAdminRecordVersion(value: unknown) {
  const version = Number(value);
  if (!Number.isSafeInteger(version) || version <= 0) {
    throw new Error("This booking is missing its current version. Refresh it before making changes.");
  }
  return version;
}

export function parseAdminUpdatedAt(value: unknown, label = "record") {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(value) || Number.isNaN(Date.parse(value))) {
    throw new Error(`This ${label} is missing its current version. Refresh it before making changes.`);
  }
  return value;
}

export function parseRequiredAdminReason(value: unknown, label = "Reason") {
  const reason = bookingText(value, 500, label).replace(/\s+/gu, " ");
  if (reason.length < 3) throw new Error(`${label} must contain at least three characters.`);
  return reason;
}

function parseNullableMoney(value: unknown, label: string) {
  if (value === null || value === "") return null;
  const amount = Number(value);
  if (!Number.isSafeInteger(amount) || amount < 0) {
    throw new Error(`${label} must be a non-negative whole rupee amount.`);
  }
  return amount;
}
