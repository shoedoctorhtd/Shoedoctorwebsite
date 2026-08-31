export const MAX_PRODUCT_IMAGE_BYTES = 500 * 1024;
export const MAX_PRODUCT_IMAGE_DIMENSION = 1600;
export const MAX_PRODUCT_IMAGES_PER_PRODUCT = 3;
export const MAX_PRODUCT_IMAGE_STORAGE_BYTES = 50 * 1024 * 1024;
export const PRODUCT_IMAGE_STORAGE_LIMIT_MESSAGE = "Product image storage limit reached. Delete an unused image before uploading another.";

export type ProductImageContentType = "image/jpeg" | "image/png" | "image/webp";

export type ProductImageUpload = {
  name: string;
  size: number;
  type: string;
  arrayBuffer(): Promise<ArrayBuffer>;
};

export function assertProductImageUploadCapacity(imageCount: number, bytesUsed: number, nextByteSize: number) {
  if (imageCount >= MAX_PRODUCT_IMAGES_PER_PRODUCT) {
    throw new Error(`A product can have up to ${MAX_PRODUCT_IMAGES_PER_PRODUCT} images.`);
  }
  if (bytesUsed + nextByteSize > MAX_PRODUCT_IMAGE_STORAGE_BYTES) {
    throw new Error(PRODUCT_IMAGE_STORAGE_LIMIT_MESSAGE);
  }
}

type DetectedImageType = {
  contentType: ProductImageContentType;
  extension: "jpg" | "png" | "webp";
};

type ImageDimensions = { width: number; height: number };

/**
 * Browser-side compression is only a convenience. This server-side validator
 * remains the authority for byte, signature, structural, dimensional, and
 * digest checks before a D1 BLOB can be written.
 */
export async function validateProductImage(upload: ProductImageUpload) {
  if (!Number.isSafeInteger(upload.size) || upload.size < 1 || upload.size > MAX_PRODUCT_IMAGE_BYTES) {
    throw new Error("Product images must be JPEG, PNG, or WebP files no larger than 500 KB.");
  }
  const imageData = await upload.arrayBuffer();
  if (imageData.byteLength !== upload.size || imageData.byteLength > MAX_PRODUCT_IMAGE_BYTES) {
    throw new Error("The uploaded image size is invalid.");
  }
  const bytes = new Uint8Array(imageData);
  const detected = detectImageType(bytes);
  if (!detected) throw new Error("Only valid JPEG, PNG, and WebP image files can be uploaded.");
  if (String(upload.type).toLowerCase() !== detected.contentType) {
    throw new Error("The image MIME type does not match its file contents.");
  }
  const dimensions = readImageDimensions(bytes, detected.contentType);
  if (!dimensions) {
    throw new Error("The uploaded image is incomplete or not a valid JPEG, PNG, or WebP file.");
  }
  if (dimensions.width > MAX_PRODUCT_IMAGE_DIMENSION || dimensions.height > MAX_PRODUCT_IMAGE_DIMENSION) {
    throw new Error("Product images must be no larger than 1600 × 1600 pixels.");
  }
  const digest = await crypto.subtle.digest("SHA-256", imageData);
  return {
    imageData,
    byteSize: bytes.byteLength,
    sha256: hex(new Uint8Array(digest)),
    width: dimensions.width,
    height: dimensions.height,
    ...detected,
  };
}

export function detectImageType(bytes: Uint8Array): DetectedImageType | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { contentType: "image/jpeg", extension: "jpg" };
  }
  if (
    bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  ) {
    return { contentType: "image/png", extension: "png" };
  }
  if (
    bytes.length >= 12 && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) {
    return { contentType: "image/webp", extension: "webp" };
  }
  return null;
}

function readImageDimensions(bytes: Uint8Array, contentType: ProductImageContentType): ImageDimensions | null {
  if (contentType === "image/jpeg") return readJpegDimensions(bytes);
  if (contentType === "image/png") return readPngDimensions(bytes);
  return readWebpDimensions(bytes);
}

function readJpegDimensions(bytes: Uint8Array): ImageDimensions | null {
  if (bytes.length < 4 || bytes[bytes.length - 2] !== 0xff || bytes[bytes.length - 1] !== 0xd9) return null;
  let offset = 2;
  let dimensions: ImageDimensions | null = null;
  while (offset + 1 < bytes.length - 2) {
    if (bytes[offset] !== 0xff) return null;
    while (bytes[offset] === 0xff) offset += 1;
    const marker = bytes[offset++];
    if (marker === undefined || marker === 0xd9) break;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (offset + 1 >= bytes.length) return null;
    const segmentLength = (bytes[offset]! << 8) + bytes[offset + 1]!;
    if (segmentLength < 2 || offset + segmentLength > bytes.length) return null;
    if (marker === 0xda) {
      const scanStart = offset + segmentLength;
      return dimensions && scanStart < bytes.length - 2 ? dimensions : null;
    }
    if (isJpegStartOfFrame(marker)) {
      if (segmentLength < 8) return null;
      const height = (bytes[offset + 3]! << 8) + bytes[offset + 4]!;
      const width = (bytes[offset + 5]! << 8) + bytes[offset + 6]!;
      if (!width || !height) return null;
      dimensions = { width, height };
    }
    offset += segmentLength;
  }
  return null;
}

function isJpegStartOfFrame(marker: number) {
  return (
    (marker >= 0xc0 && marker <= 0xc3) ||
    (marker >= 0xc5 && marker <= 0xc7) ||
    (marker >= 0xc9 && marker <= 0xcb) ||
    (marker >= 0xcd && marker <= 0xcf)
  );
}

function readPngDimensions(bytes: Uint8Array): ImageDimensions | null {
  if (bytes.length < 45) return null;
  let offset = 8;
  let dimensions: ImageDimensions | null = null;
  let hasImageData = false;
  while (offset + 12 <= bytes.length) {
    const length = readUint32(bytes, offset);
    const type = ascii(bytes, offset + 4, 4);
    const dataStart = offset + 8;
    const next = dataStart + length + 4;
    if (next > bytes.length) return null;
    if (!dimensions) {
      if (type !== "IHDR" || length !== 13) return null;
      const width = readUint32(bytes, dataStart);
      const height = readUint32(bytes, dataStart + 4);
      if (!width || !height) return null;
      dimensions = { width, height };
    }
    if (type === "IDAT" && length > 0) hasImageData = true;
    if (type === "IEND") return dimensions && hasImageData && length === 0 && next === bytes.length ? dimensions : null;
    offset = next;
  }
  return null;
}

function readWebpDimensions(bytes: Uint8Array): ImageDimensions | null {
  if (bytes.length < 20 || readUint32Le(bytes, 4) + 8 !== bytes.length) return null;
  let offset = 12;
  let dimensions: ImageDimensions | null = null;
  let hasImagePayload = false;
  while (offset + 8 <= bytes.length) {
    const type = ascii(bytes, offset, 4);
    const length = readUint32Le(bytes, offset + 4);
    const dataStart = offset + 8;
    const next = dataStart + length + (length % 2);
    if (next > bytes.length) return null;
    if (type === "VP8X" && length >= 10) {
      dimensions = {
        width: readUint24Le(bytes, dataStart + 4) + 1,
        height: readUint24Le(bytes, dataStart + 7) + 1,
      };
    } else if (type === "VP8 " && length >= 11) {
      if (bytes[dataStart + 3] !== 0x9d || bytes[dataStart + 4] !== 0x01 || bytes[dataStart + 5] !== 0x2a) return null;
      dimensions = {
        width: (bytes[dataStart + 6]! | (bytes[dataStart + 7]! << 8)) & 0x3fff,
        height: (bytes[dataStart + 8]! | (bytes[dataStart + 9]! << 8)) & 0x3fff,
      };
      hasImagePayload = true;
    } else if (type === "VP8L" && length >= 6) {
      if (bytes[dataStart] !== 0x2f) return null;
      const a = bytes[dataStart + 1]!;
      const b = bytes[dataStart + 2]!;
      const c = bytes[dataStart + 3]!;
      const d = bytes[dataStart + 4]!;
      dimensions = {
        width: 1 + a + ((b & 0x3f) << 8),
        height: 1 + (b >> 6) + (c << 2) + ((d & 0x0f) << 10),
      };
      hasImagePayload = true;
    }
    offset = next;
  }
  return dimensions && hasImagePayload && dimensions.width > 0 && dimensions.height > 0 && offset === bytes.length ? dimensions : null;
}

function ascii(bytes: Uint8Array, offset: number, length: number) {
  return String.fromCharCode(...bytes.slice(offset, offset + length));
}

function readUint32(bytes: Uint8Array, offset: number) {
  return (bytes[offset]! * 0x1000000) + (bytes[offset + 1]! << 16) + (bytes[offset + 2]! << 8) + bytes[offset + 3]!;
}

function readUint32Le(bytes: Uint8Array, offset: number) {
  return bytes[offset]! + (bytes[offset + 1]! << 8) + (bytes[offset + 2]! << 16) + (bytes[offset + 3]! * 0x1000000);
}

function readUint24Le(bytes: Uint8Array, offset: number) {
  return bytes[offset]! + (bytes[offset + 1]! << 8) + (bytes[offset + 2]! << 16);
}

function hex(bytes: Uint8Array) {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
