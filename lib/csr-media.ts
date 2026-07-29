import {
  createDonationMedia,
  deleteDonationMediaRecord,
  getDonationMedia,
  isDonationMediaReferenced,
  type DonationMedia,
} from "./csr-data";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

type R2ObjectLike = {
  body: ReadableStream;
  httpMetadata?: { contentType?: string; cacheControl?: string };
};

type R2BucketLike = {
  put(
    key: string,
    value: ArrayBuffer,
    options?: { httpMetadata?: { contentType?: string } },
  ): Promise<unknown>;
  get(key: string): Promise<R2ObjectLike | null>;
  delete(key: string): Promise<void>;
};

type CsrMediaEnvironment = {
  CSR_MEDIA?: R2BucketLike;
};

type UploadableFile = {
  name: string;
  type: string;
  size: number;
  arrayBuffer(): Promise<ArrayBuffer>;
};

export class CsrMediaConfigurationError extends Error {
  constructor() {
    super(
      "Image uploads are not configured. Add a private Cloudflare R2 bucket binding named CSR_MEDIA before uploading images.",
    );
    this.name = "CsrMediaConfigurationError";
  }
}

export class CsrMediaValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CsrMediaValidationError";
  }
}

async function getCsrMediaBucket() {
  try {
    const workers = (await import("cloudflare:workers")) as {
      env?: CsrMediaEnvironment;
    };
    if (workers.env?.CSR_MEDIA) return workers.env.CSR_MEDIA;
  } catch {
    // The local development runtime can use a Workers binding when available.
  }
  throw new CsrMediaConfigurationError();
}

function extensionForContentType(contentType: string) {
  switch (contentType) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    default:
      return "img";
  }
}

function hasExpectedImageSignature(contentType: string, bytes: Uint8Array) {
  if (contentType === "image/jpeg") {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (contentType === "image/png") {
    return (
      bytes.length >= 8 &&
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a
    );
  }
  if (contentType === "image/webp") {
    return (
      bytes.length >= 12 &&
      String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
      String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
    );
  }
  return false;
}

async function validateDonationImage(file: UploadableFile) {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new CsrMediaValidationError("Upload a JPEG, PNG, or WebP image.");
  }
  if (!file.size || file.size > MAX_IMAGE_BYTES) {
    throw new CsrMediaValidationError("Images must be no larger than 8 MB.");
  }
  const bytes = await file.arrayBuffer();
  if (!hasExpectedImageSignature(file.type, new Uint8Array(bytes))) {
    throw new CsrMediaValidationError("The uploaded file does not match its image type.");
  }
  return bytes;
}

/**
 * Saves a validated image under an unguessable private R2 object key, then
 * records only its metadata in D1. Browser previews should use Object URLs;
 * they do not need to expose an R2 key before this function succeeds.
 */
export async function uploadDonationImage(file: UploadableFile) {
  const [bucket, bytes] = await Promise.all([
    getCsrMediaBucket(),
    validateDonationImage(file),
  ]);
  const id = crypto.randomUUID();
  const objectKey = `csr-donations/${id}.${extensionForContentType(file.type)}`;

  await bucket.put(objectKey, bytes, {
    httpMetadata: { contentType: file.type },
  });

  try {
    return await createDonationMedia({
      id,
      objectKey,
      contentType: file.type,
      sizeBytes: file.size,
      originalFilename: file.name.slice(0, 180) || "upload",
    });
  } catch (error) {
    await bucket.delete(objectKey).catch(() => undefined);
    throw error;
  }
}

export async function readDonationImage(media: DonationMedia) {
  const bucket = await getCsrMediaBucket();
  return bucket.get(media.objectKey);
}

/** Removes only unattached media to avoid breaking published and draft content. */
export async function removeDonationImage(id: string) {
  const media = await getDonationMedia(id);
  if (!media) return { deleted: false as const, reason: "not_found" as const };
  if (await isDonationMediaReferenced(id)) {
    return { deleted: false as const, reason: "in_use" as const };
  }

  const bucket = await getCsrMediaBucket();
  await bucket.delete(media.objectKey);
  const deleted = await deleteDonationMediaRecord(id);
  return deleted
    ? { deleted: true as const }
    : { deleted: false as const, reason: "not_found" as const };
}

/**
 * A content deletion must not be rolled back just because a private R2 cleanup
 * has a transient failure. Re-check references for every id so shared media is
 * retained, and deliberately ignore individual cleanup failures.
 */
export async function removeUnreferencedDonationImagesBestEffort(
  ids: ReadonlyArray<string | null | undefined>,
) {
  const uniqueIds = [
    ...new Set(ids.filter((id): id is string => Boolean(id))),
  ];
  await Promise.all(
    uniqueIds.map((id) => removeDonationImage(id).catch(() => undefined)),
  );
}

export function imageResponseHeaders(
  media: DonationMedia,
  isPublic: boolean,
  source?: R2ObjectLike,
) {
  return {
    "content-type": source?.httpMetadata?.contentType || media.contentType,
    // Public access is conditional on a content record still being published.
    // Do not allow a CDN/browser to keep serving an image after it is
    // unpublished or removed.
    "cache-control": isPublic ? "no-store" : "private, no-store",
    "x-content-type-options": "nosniff",
  };
}
