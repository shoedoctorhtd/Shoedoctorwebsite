const MAX_GMAIL_ATTACHMENTS = 4;
export const MAX_GMAIL_ATTACHMENT_BYTES = 3 * 1024 * 1024;

const ATTACHMENT_CONTENT_TYPES = {
  "application/pdf": ["pdf"],
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/webp": ["webp"],
} as const;

export type GmailAttachmentContentType = keyof typeof ATTACHMENT_CONTENT_TYPES;

/**
 * Binary attachment data stays in the request only. Callers must validate the
 * actual file signature before constructing this value; this module limits
 * attachment headers to the payment-receipt formats we can safely represent.
 */
export type GmailAttachment = {
  contentType: GmailAttachmentContentType;
  data: ArrayBuffer | Uint8Array;
  filename: string;
};

export class GmailMimeAttachmentError extends Error {
  readonly code = "gmail_attachment_invalid";

  constructor() {
    super("Invalid Gmail attachment.");
    this.name = "GmailMimeAttachmentError";
  }
}

type NormalizedAttachment = {
  contentType: GmailAttachmentContentType;
  data: Uint8Array;
  filename: string;
};

export function buildRawGmailMessage(input: {
  attachments?: readonly GmailAttachment[];
  from: string;
  html: string;
  subject: string;
  text: string;
  to: string;
}) {
  const attachments = normalizeAttachments(input.attachments);
  const alternativeBoundary = createBoundary();
  const alternative = buildAlternativeBody(input, alternativeBoundary);
  const mime = attachments.length
    ? buildMixedMessage(input, attachments, alternativeBoundary, alternative)
    : [
      `From: Shoe Doctor <${input.from}>`,
      `To: ${input.to}`,
      `Subject: ${encodeHeader(input.subject)}`,
      "MIME-Version: 1.0",
      `Content-Type: multipart/alternative; boundary=\"${alternativeBoundary}\"`,
      "",
      alternative,
      "",
    ].join("\r\n");

  return toBase64(mime)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function buildMixedMessage(
  input: { from: string; html: string; subject: string; text: string; to: string },
  attachments: readonly NormalizedAttachment[],
  alternativeBoundary: string,
  alternative: string,
) {
  const mixedBoundary = createBoundary();
  return [
    `From: Shoe Doctor <${input.from}>`,
    `To: ${input.to}`,
    `Subject: ${encodeHeader(input.subject)}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/mixed; boundary=\"${mixedBoundary}\"`,
    "",
    `--${mixedBoundary}`,
    `Content-Type: multipart/alternative; boundary=\"${alternativeBoundary}\"`,
    "",
    alternative,
    "",
    ...attachments.flatMap((attachment) => [
      `--${mixedBoundary}`,
      `Content-Type: ${attachment.contentType}; name=\"${attachment.filename}\"`,
      "Content-Transfer-Encoding: base64",
      `Content-Disposition: attachment; filename=\"${attachment.filename}\"`,
      "",
      wrapBase64(toBase64Bytes(attachment.data)),
      "",
    ]),
    `--${mixedBoundary}--`,
    "",
  ].join("\r\n");
}

function buildAlternativeBody(
  input: { html: string; text: string },
  boundary: string,
) {
  return [
    `--${boundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    wrapBase64(toBase64(input.text)),
    "",
    `--${boundary}`,
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    wrapBase64(toBase64(input.html)),
    "",
    `--${boundary}--`,
  ].join("\r\n");
}

function normalizeAttachments(attachments: readonly GmailAttachment[] | undefined) {
  if (!attachments?.length) return [];
  if (attachments.length > MAX_GMAIL_ATTACHMENTS) throw new GmailMimeAttachmentError();

  let totalBytes = 0;
  return attachments.map((attachment) => {
    if (!isAttachmentContentType(attachment.contentType)) throw new GmailMimeAttachmentError();
    const filename = normalizeAttachmentFilename(attachment.filename, attachment.contentType);
    const data = normalizeAttachmentData(attachment.data);
    if (!data.byteLength) throw new GmailMimeAttachmentError();
    totalBytes += data.byteLength;
    if (totalBytes > MAX_GMAIL_ATTACHMENT_BYTES) throw new GmailMimeAttachmentError();
    return { contentType: attachment.contentType, data, filename };
  });
}

function isAttachmentContentType(value: unknown): value is GmailAttachmentContentType {
  return typeof value === "string" && Object.hasOwn(ATTACHMENT_CONTENT_TYPES, value);
}

function normalizeAttachmentFilename(
  value: unknown,
  contentType: GmailAttachmentContentType,
) {
  if (typeof value !== "string") throw new GmailMimeAttachmentError();
  const filename = value.trim();
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,159}$/u.test(filename)) {
    throw new GmailMimeAttachmentError();
  }
  const extension = filename.split(".").at(-1)?.toLowerCase();
  if (!extension || !ATTACHMENT_CONTENT_TYPES[contentType].includes(extension as never)) {
    throw new GmailMimeAttachmentError();
  }
  return filename;
}

function normalizeAttachmentData(value: ArrayBuffer | Uint8Array) {
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  throw new GmailMimeAttachmentError();
}

function createBoundary() {
  return `shoe-doctor-${crypto.randomUUID().replace(/-/g, "")}`;
}

function encodeHeader(value: string) {
  return `=?UTF-8?B?${toBase64(value)}?=`;
}

function toBase64(value: string) {
  return toBase64Bytes(new TextEncoder().encode(value));
}

function toBase64Bytes(bytes: Uint8Array) {
  const chunks: string[] = [];
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    let binary = "";
    const end = Math.min(offset + chunkSize, bytes.length);
    for (let index = offset; index < end; index += 1) {
      binary += String.fromCharCode(bytes[index]!);
    }
    chunks.push(binary);
  }
  return btoa(chunks.join(""));
}

function wrapBase64(value: string) {
  return value.match(/.{1,76}/g)?.join("\r\n") ?? "";
}
