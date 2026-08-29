export const MAX_PRODUCT_IMAGE_BYTES = 5 * 1024 * 1024;

export type ProductImageUpload = {
  name: string;
  size: number;
  type: string;
  arrayBuffer(): Promise<ArrayBuffer>;
};

export async function validateProductImage(upload: ProductImageUpload) {
  if (!Number.isSafeInteger(upload.size) || upload.size < 1 || upload.size > MAX_PRODUCT_IMAGE_BYTES) {
    throw new Error("Product images must be JPEG, PNG, or WebP files no larger than 5 MB.");
  }
  const bytes = await upload.arrayBuffer();
  if (bytes.byteLength !== upload.size || bytes.byteLength > MAX_PRODUCT_IMAGE_BYTES) {
    throw new Error("The uploaded image size is invalid.");
  }
  const detected = detectImageType(new Uint8Array(bytes));
  if (!detected) throw new Error("Only valid JPEG, PNG, and WebP image files can be uploaded.");
  if (upload.type !== detected.contentType) {
    throw new Error("The image MIME type does not match its file contents.");
  }
  if (!isStructurallyValidImage(new Uint8Array(bytes), detected.contentType)) {
    throw new Error("The uploaded image is incomplete or not a valid JPEG, PNG, or WebP file.");
  }
  return { bytes, ...detected };
}

export function detectImageType(bytes: Uint8Array): { contentType: "image/jpeg" | "image/png" | "image/webp"; extension: "jpg" | "png" | "webp" } | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return { contentType: "image/jpeg", extension: "jpg" };
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) return { contentType: "image/png", extension: "png" };
  if (bytes.length >= 12 && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return { contentType: "image/webp", extension: "webp" };
  return null;
}

/**
 * Magic bytes establish the claimed format; these bounded structural checks
 * reject truncated headers and malformed containers without decoding pixels in
 * the Worker. R2 only receives a complete JPEG, PNG, or WebP container.
 */
function isStructurallyValidImage(bytes: Uint8Array, contentType: "image/jpeg" | "image/png" | "image/webp") {
  if (contentType === "image/jpeg") {
    return bytes.length >= 4 && bytes[bytes.length - 2] === 0xff && bytes[bytes.length - 1] === 0xd9;
  }
  if (contentType === "image/png") return hasCompletePngChunks(bytes);
  return hasCompleteWebpChunks(bytes);
}

function hasCompletePngChunks(bytes: Uint8Array) {
  let offset = 8;
  let sawHeader = false;
  while (offset + 12 <= bytes.length) {
    const length = readUint32(bytes, offset);
    const type = String.fromCharCode(bytes[offset + 4]!, bytes[offset + 5]!, bytes[offset + 6]!, bytes[offset + 7]!);
    const dataStart = offset + 8;
    const next = dataStart + length + 4; // chunk data plus CRC
    if (next > bytes.length) return false;
    if (!sawHeader) {
      if (type !== "IHDR" || length !== 13 || readUint32(bytes, dataStart) === 0 || readUint32(bytes, dataStart + 4) === 0) return false;
      sawHeader = true;
    }
    if (type === "IEND") return sawHeader && length === 0 && next === bytes.length;
    offset = next;
  }
  return false;
}

function hasCompleteWebpChunks(bytes: Uint8Array) {
  if (bytes.length < 20 || readUint32Le(bytes, 4) + 8 !== bytes.length) return false;
  let offset = 12;
  let sawImageChunk = false;
  while (offset + 8 <= bytes.length) {
    const type = String.fromCharCode(bytes[offset]!, bytes[offset + 1]!, bytes[offset + 2]!, bytes[offset + 3]!);
    const length = readUint32Le(bytes, offset + 4);
    const next = offset + 8 + length + (length % 2);
    if (next > bytes.length) return false;
    if (type === "VP8 " || type === "VP8L" || type === "VP8X") sawImageChunk = true;
    offset = next;
  }
  return sawImageChunk && offset === bytes.length;
}

function readUint32(bytes: Uint8Array, offset: number) {
  return (bytes[offset]! * 0x1000000) + (bytes[offset + 1]! << 16) + (bytes[offset + 2]! << 8) + bytes[offset + 3]!;
}

function readUint32Le(bytes: Uint8Array, offset: number) {
  return bytes[offset]! + (bytes[offset + 1]! << 8) + (bytes[offset + 2]! << 16) + (bytes[offset + 3]! * 0x1000000);
}
