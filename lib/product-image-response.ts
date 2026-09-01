/** Build a binary, cache-aware image response without serializing BLOB bytes. */
export function buildProductImageResponse(
  image: {
    id: string;
    image_data: ArrayBuffer | Uint8Array | number[];
    mime_type: string;
    sha256: string;
  },
  request: Request,
  cacheControl: string,
) {
  const body = imageBytes(image.image_data);
  const contentType = image.mime_type === "image/png" || image.mime_type === "image/webp"
    ? image.mime_type
    : image.mime_type === "image/jpeg" ? image.mime_type : null;
  const sha256 = /^[a-f0-9]{64}$/iu.test(image.sha256) ? image.sha256.toLowerCase() : null;
  if (!body || !body.byteLength || !contentType || !sha256) return notFound();
  const etag = `"${sha256}"`;
  const safeId = String(image.id).replace(/[^a-zA-Z0-9_-]/gu, "").slice(0, 64) || "image";
  const headers = new Headers({
    "Cache-Control": cacheControl,
    "Content-Disposition": `inline; filename="product-image-${safeId}.${extensionFor(contentType)}"`,
    "Content-Type": contentType,
    ETag: etag,
    "X-Content-Type-Options": "nosniff",
  });
  if (matchesEtag(request.headers.get("if-none-match"), etag)) return new Response(null, { status: 304, headers });
  return new Response(body, { headers });
}

function imageBytes(value: ArrayBuffer | Uint8Array | number[]) {
  if (value instanceof ArrayBuffer) return value.slice(0);
  if (ArrayBuffer.isView(value)) {
    return Uint8Array.from(new Uint8Array(value.buffer, value.byteOffset, value.byteLength)).buffer;
  }
  if (Array.isArray(value) && value.every((byte) => Number.isInteger(byte) && byte >= 0 && byte <= 0xff)) {
    return Uint8Array.from(value).buffer;
  }
  return null;
}

function matchesEtag(value: string | null, etag: string) {
  if (!value) return false;
  return value.split(",").some((candidate) => {
    const normalized = candidate.trim();
    return normalized === "*" || normalized === etag || normalized === `W/${etag}`;
  });
}

function extensionFor(contentType: "image/jpeg" | "image/png" | "image/webp") {
  return contentType === "image/jpeg" ? "jpg" : contentType === "image/png" ? "png" : "webp";
}

function notFound() {
  return new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
}
