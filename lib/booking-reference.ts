export const BOOKING_REFERENCE_TIME_ZONE = "Asia/Kathmandu";
export const BOOKING_REFERENCE_ALPHABET =
  "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const BOOKING_REFERENCE_PREFIX = "SD";
const DEFAULT_SUFFIX_LENGTH = 2;
const ATTEMPTS_PER_SUFFIX_LENGTH = 10;
const MAX_SUFFIX_LENGTH = 8;

export type BookingReferenceSearch = {
  publicReference: string;
  pairNumber: number | null;
};

export type BookingReferenceLike = {
  publicReference?: string | null;
  reference: string;
};

type GeneratePublicBookingReferenceOptions = {
  date?: Date;
  generateSuffix?: (length: number) => string;
  maxSuffixLength?: number;
  attemptsPerSuffixLength?: number;
  tryPersist: (publicReference: string) => Promise<boolean>;
};

/**
 * Formats a date using Nepal's calendar day, regardless of where the Worker
 * happened to execute. The public reference date is operational, not UTC.
 */
export function getNepalDateCode(date: Date = new Date()) {
  if (Number.isNaN(date.getTime())) {
    throw new Error("A valid booking creation date is required.");
  }

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BOOKING_REFERENCE_TIME_ZONE,
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
    numberingSystem: "latn",
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";
  const year = part("year");
  const month = part("month");
  const day = part("day");

  if (!/^\d{2}$/u.test(year) || !/^\d{2}$/u.test(month) || !/^\d{2}$/u.test(day)) {
    throw new Error("Unable to format the booking date for Nepal.");
  }

  return `${year}${month}${day}`;
}

/**
 * Uses Cloudflare's Web Crypto implementation. The alphabet is exactly 32
 * characters, so each byte can select a character without modulo bias.
 */
export function generateSecureReferenceSuffix(length = DEFAULT_SUFFIX_LENGTH) {
  if (!Number.isSafeInteger(length) || length < 1) {
    throw new Error("Booking reference suffix length must be a positive integer.");
  }

  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => BOOKING_REFERENCE_ALPHABET[byte & 31]).join("");
}

export function buildPublicBookingReference(dateCode: string, suffix: string) {
  if (!/^\d{6}$/u.test(dateCode) || !isReferenceSuffix(suffix)) {
    throw new Error("Invalid public booking reference components.");
  }
  return `${BOOKING_REFERENCE_PREFIX}-${dateCode}-${suffix}`;
}

/**
 * Starts every booking at two characters. `tryPersist` must make an atomic
 * database write and return false only when that complete reference is already
 * claimed, so a concurrent booking cannot win a SELECT-then-INSERT race.
 */
export async function generatePublicBookingReference({
  date = new Date(),
  generateSuffix = generateSecureReferenceSuffix,
  maxSuffixLength = MAX_SUFFIX_LENGTH,
  attemptsPerSuffixLength = ATTEMPTS_PER_SUFFIX_LENGTH,
  tryPersist,
}: GeneratePublicBookingReferenceOptions) {
  if (!Number.isSafeInteger(maxSuffixLength) || maxSuffixLength < DEFAULT_SUFFIX_LENGTH) {
    throw new Error("Maximum booking reference suffix length is invalid.");
  }
  if (!Number.isSafeInteger(attemptsPerSuffixLength) || attemptsPerSuffixLength < 1) {
    throw new Error("Booking reference attempt count is invalid.");
  }

  const dateCode = getNepalDateCode(date);
  for (
    let suffixLength = DEFAULT_SUFFIX_LENGTH;
    suffixLength <= maxSuffixLength;
    suffixLength += 1
  ) {
    for (let attempt = 0; attempt < attemptsPerSuffixLength; attempt += 1) {
      const suffix = generateSuffix(suffixLength).toUpperCase();
      if (!isReferenceSuffix(suffix) || suffix.length !== suffixLength) {
        throw new Error("Booking reference generator returned an invalid suffix.");
      }
      const candidate = buildPublicBookingReference(dateCode, suffix);
      if (await tryPersist(candidate)) return candidate;
    }
  }

  throw new Error("Unable to allocate a unique booking reference. Please try again.");
}

export function getPairReference(publicReference: string, pairNumber: number) {
  const parsed = normalizeBookingReferenceSearch(publicReference);
  if (!parsed || parsed.pairNumber !== null) {
    throw new Error("A valid public booking reference is required for a shoe tag.");
  }
  if (!Number.isSafeInteger(pairNumber) || pairNumber < 1) {
    throw new Error("Pair number must be a positive integer.");
  }
  return `${parsed.publicReference}-${pairNumber}`;
}

export function getPhysicalPairTag(publicReference: string, pairNumber: number) {
  return getPairReference(publicReference, pairNumber).replace(/^SD-/u, "");
}

/**
 * Normalizes the staff-entered booking reference without accepting it as an
 * authorization credential. It intentionally recognizes an optional `SD-`
 * prefix and a derived `-pairNumber` suffix.
 */
export function normalizeBookingReferenceSearch(
  value: string,
): BookingReferenceSearch | null {
  const normalized = value.trim().toUpperCase().replace(/\s+/gu, "");
  const match = /^(?:SD-)?(\d{6})-([ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{2,})(?:-([1-9]\d*))?$/u.exec(
    normalized,
  );
  if (!match) return null;

  const pairNumber = match[3] ? Number(match[3]) : null;
  if (pairNumber !== null && !Number.isSafeInteger(pairNumber)) return null;

  return {
    publicReference: `${BOOKING_REFERENCE_PREFIX}-${match[1]}-${match[2]}`,
    pairNumber,
  };
}

/**
 * Public display code always prefers the short operational reference. The
 * legacy value is a temporary fallback only for a partially migrated record.
 */
export function getBookingPublicReference(booking: BookingReferenceLike) {
  const publicReference = booking.publicReference?.trim();
  return publicReference || booking.reference;
}

export function isPublicReferenceCollision(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /unique constraint failed:\s*bookings\.public_reference\b/iu.test(
    message,
  );
}

function isReferenceSuffix(value: string) {
  return new RegExp(
    `^[${BOOKING_REFERENCE_ALPHABET}]+$`,
    "u",
  ).test(value);
}
