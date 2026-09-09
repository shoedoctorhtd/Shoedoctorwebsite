import {
  BOOKING_REFERENCE_ALPHABET,
  generateSecureReferenceSuffix,
  getNepalDateCode,
} from "./booking-reference.ts";

const PRODUCT_ORDER_PREFIX = "PO";
const DEFAULT_SUFFIX_LENGTH = 3;
const ATTEMPTS_PER_SUFFIX_LENGTH = 10;
const MAX_SUFFIX_LENGTH = 8;

type ProductOrderReferenceOptions = {
  channel?: "online" | "offline";
  date?: Date;
  generateSuffix?: (length: number) => string;
  maxSuffixLength?: number;
  attemptsPerSuffixLength?: number;
  tryPersist: (reference: string) => Promise<boolean>;
};

/** Product orders deliberately use PO rather than booking's SD prefix. */
export function buildPublicProductOrderReference(dateCode: string, suffix: string) {
  if (!/^\d{6}$/u.test(dateCode) || !isSuffix(suffix)) {
    throw new Error("Invalid product order reference components.");
  }
  return `${PRODUCT_ORDER_PREFIX}-${dateCode}-${suffix}`;
}

export async function generatePublicProductOrderReference({
  channel = "online",
  date = new Date(),
  generateSuffix = generateSecureReferenceSuffix,
  maxSuffixLength = MAX_SUFFIX_LENGTH,
  attemptsPerSuffixLength = ATTEMPTS_PER_SUFFIX_LENGTH,
  tryPersist,
}: ProductOrderReferenceOptions) {
  if (!Number.isSafeInteger(maxSuffixLength) || maxSuffixLength < DEFAULT_SUFFIX_LENGTH) {
    throw new Error("Maximum product order reference suffix length is invalid.");
  }
  if (!Number.isSafeInteger(attemptsPerSuffixLength) || attemptsPerSuffixLength < 1) {
    throw new Error("Product order reference attempt count is invalid.");
  }

  const dateCode = getNepalDateCode(date);
  for (let length = DEFAULT_SUFFIX_LENGTH; length <= maxSuffixLength; length += 1) {
    for (let attempt = 0; attempt < attemptsPerSuffixLength; attempt += 1) {
      const suffix = generateSuffix(length).toUpperCase();
      if (suffix.length !== length || !isSuffix(suffix)) {
        throw new Error("Product order reference generator returned an invalid suffix.");
      }
      const reference = channel === "offline"
        ? `CS-20${dateCode}-${suffix}`
        : buildPublicProductOrderReference(dateCode, suffix);
      if (await tryPersist(reference)) return reference;
    }
  }
  throw new Error("Unable to allocate a unique product order reference. Please try again.");
}

export function normalizeProductOrderReferenceSearch(value: unknown) {
  const normalized = String(value ?? "").trim().toUpperCase().replace(/\s+/gu, "");
  if (/^CS-\d{8}-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{3,8}$/u.test(normalized)) return normalized;
  const match = /^(?:PO-)?(\d{6})-([ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{3,})$/u.exec(normalized);
  return match ? `${PRODUCT_ORDER_PREFIX}-${match[1]}-${match[2]}` : null;
}

export function isProductOrderReferenceCollision(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /unique constraint failed:\s*product_orders\.public_reference\b/iu.test(message);
}

function isSuffix(value: string) {
  return new RegExp(`^[${BOOKING_REFERENCE_ALPHABET}]+$`, "u").test(value);
}
