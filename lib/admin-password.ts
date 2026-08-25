/** Workers Web Crypto password primitives kept independent from Next request
 * modules so they can be tested directly in Node and reused by bootstrap docs. */
export async function hashAdminPassword(password: string) {
  if (typeof password !== "string" || password.length < 12 || password.length > 256) {
    throw new Error("Administrator passwords must be between 12 and 256 characters.");
  }
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iterations = 310_000;
  const derived = await pbkdf2(password, salt, iterations);
  return `pbkdf2_sha256$${iterations}$${base64UrlEncode(salt)}$${base64UrlEncode(derived)}`;
}

export async function verifyAdminPassword(password: string, stored: string) {
  const [algorithm, rawIterations, rawSalt, rawHash, extra] = stored.split("$");
  const iterations = Number(rawIterations);
  if (algorithm !== "pbkdf2_sha256" || !rawSalt || !rawHash || extra || !Number.isSafeInteger(iterations) || iterations < 100_000 || iterations > 1_000_000) {
    await performDummyAdminPasswordWork(password, "invalid-password-hash");
    return false;
  }
  try {
    const expected = base64UrlDecode(rawHash);
    const actual = await pbkdf2(password, base64UrlDecode(rawSalt), iterations);
    return constantTimeEqualBytes(actual, expected);
  } catch {
    await performDummyAdminPasswordWork(password, "invalid-password-hash");
    return false;
  }
}

export async function performDummyAdminPasswordWork(password: string, key: string) {
  const salt = new TextEncoder().encode(`shoe-doctor:${key}`).slice(0, 32);
  await pbkdf2(password, salt, 310_000);
  return false;
}

async function pbkdf2(password: string, salt: Uint8Array, iterations: number) {
  const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: salt as unknown as BufferSource, iterations }, material, 256);
  return new Uint8Array(bits);
}

function constantTimeEqualBytes(left: Uint8Array, right: Uint8Array) {
  let difference = left.length ^ right.length;
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) difference |= (left[index % Math.max(left.length, 1)] ?? 0) ^ (right[index % Math.max(right.length, 1)] ?? 0);
  return difference === 0;
}

function base64UrlEncode(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}

function base64UrlDecode(value: string) {
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
  const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}
