/** Payment access tokens are opaque, 32-byte browser-Web-Crypto values. Only
 * their SHA-256 digest ever reaches D1; raw tokens stay in the customer
 * browser/request and are never written to logs, audit entries, or emails to
 * Shoe Doctor. */
export async function hashPaymentAccessToken(token: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** Avoids an early-exit string comparison when checking a bearer token. */
export function equalPaymentTokenHashes(left: string | null | undefined, right: string) {
  if (!left || left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

export function createPaymentAccessToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/gu, "-").replace(/\//gu, "_").replace(/=+$/gu, "");
}
