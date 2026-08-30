const MAX_RECEIPT_BYTES = 3 * 1024 * 1024;

export type ValidatedPaymentReceipt = {
  originalDisplayFilename: string;
  contentType: "image/jpeg" | "image/png" | "image/webp" | "application/pdf";
  extension: "jpg" | "png" | "webp" | "pdf";
  byteSize: number;
  bytes: Uint8Array;
  sha256Checksum: string;
};

type ReceiptFile = {
  name: string;
  type: string;
  size: number;
  arrayBuffer(): Promise<ArrayBuffer>;
};

/** Validates the declared MIME type and the on-disk signature while receipt
 * bytes are still only in the current Worker request. */
export async function validatePaymentReceipt(file: ReceiptFile): Promise<ValidatedPaymentReceipt> {
  if (!file || typeof file.arrayBuffer !== "function") {
    throw new Error("Choose a payment receipt to upload.");
  }
  if (!Number.isSafeInteger(file.size) || file.size < 1 || file.size > MAX_RECEIPT_BYTES) {
    throw new Error("Payment receipts must be no larger than 3 MB.");
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.byteLength !== file.size) {
    throw new Error("The uploaded receipt could not be read safely. Please choose it again.");
  }
  const detected = detectPaymentReceiptType(bytes);
  if (!detected) {
    throw new Error("Upload a JPEG, PNG, WebP, or PDF payment receipt.");
  }
  if (file.type !== detected.contentType) {
    throw new Error("The receipt file type does not match its contents.");
  }
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return {
    originalDisplayFilename: sanitizeReceiptFilename(file.name, detected.extension),
    contentType: detected.contentType,
    extension: detected.extension,
    byteSize: bytes.byteLength,
    bytes,
    sha256Checksum: hex(new Uint8Array(digest)),
  };
}

export function detectPaymentReceiptType(bytes: Uint8Array) {
  const starts = (...signature: number[]) => signature.every((value, index) => bytes[index] === value);
  if (bytes.length >= 4 && starts(0xff, 0xd8, 0xff)) {
    return { contentType: "image/jpeg" as const, extension: "jpg" as const };
  }
  if (bytes.length >= 8 && starts(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) {
    return { contentType: "image/png" as const, extension: "png" as const };
  }
  if (
    bytes.length >= 12 && starts(0x52, 0x49, 0x46, 0x46) &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) {
    return { contentType: "image/webp" as const, extension: "webp" as const };
  }
  if (bytes.length >= 8 && starts(0x25, 0x50, 0x44, 0x46, 0x2d) && includesAscii(bytes, "%%EOF")) {
    return { contentType: "application/pdf" as const, extension: "pdf" as const };
  }
  return null;
}

export function safePaymentReceiptAttachmentFilename(reference: string, extension: ValidatedPaymentReceipt["extension"]) {
  const safeReference = reference.replace(/[^A-Za-z0-9-]/gu, "").slice(0, 80);
  return `payment-receipt-${safeReference}.${extension}`;
}

function sanitizeReceiptFilename(value: unknown, extension: string) {
  const raw = String(value ?? "receipt")
    .replace(/[\\/\u0000-\u001f\u007f]/gu, "-")
    .replace(/[^A-Za-z0-9 ._()-]/gu, "-")
    .replace(/\s+/gu, " ")
    .trim()
    .slice(0, 120);
  const withoutTrailingDots = raw.replace(/[. ]+$/gu, "") || "payment-receipt";
  return /\.[A-Za-z0-9]{1,8}$/u.test(withoutTrailingDots)
    ? withoutTrailingDots
    : `${withoutTrailingDots}.${extension}`;
}

function includesAscii(bytes: Uint8Array, value: string) {
  const target = new TextEncoder().encode(value);
  for (let index = Math.max(0, bytes.length - 1024); index <= bytes.length - target.length; index += 1) {
    if (target.every((byte, offset) => bytes[index + offset] === byte)) return true;
  }
  return false;
}

function hex(bytes: Uint8Array) {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
