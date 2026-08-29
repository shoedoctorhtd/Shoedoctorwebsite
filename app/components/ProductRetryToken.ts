/**
 * Browser-only retry tokens for write operations that may finish after a
 * navigation or refresh. The stored fingerprint is a SHA-256 digest of the
 * request context; no cart, pricing, or customer values are persisted.
 */
const STORAGE_PREFIX = "shoe-doctor-product-retry-token-v1";
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{16,160}$/u;
const FINGERPRINT_PATTERN = /^[a-f0-9]{64}$/u;

type StoredRetryToken = { token: string; fingerprint: string };
const inMemoryTokens = new Map<string, StoredRetryToken>();

function storageKey(scope: string) {
  if (!/^[a-z0-9-]{3,80}$/u.test(scope)) {
    throw new Error("Retry token scope is invalid.");
  }
  return `${STORAGE_PREFIX}:${scope}`;
}

function getSessionStorage() {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function readStoredRetryToken(key: string): StoredRetryToken | null {
  const storage = getSessionStorage();
  if (!storage) return null;
  try {
    const value = JSON.parse(storage.getItem(key) ?? "null") as unknown;
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const record = value as Record<string, unknown>;
    if (typeof record.token !== "string" || typeof record.fingerprint !== "string") return null;
    if (!TOKEN_PATTERN.test(record.token) || !FINGERPRINT_PATTERN.test(record.fingerprint)) return null;
    return { token: record.token, fingerprint: record.fingerprint };
  } catch {
    return null;
  }
}

function stableSerialize(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("Retry token context must use finite numbers.");
    return String(value);
  }
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(",")}]`;
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableSerialize(record[key])}`).join(",")}}`;
  }
  throw new Error("Retry token context contains an unsupported value.");
}

async function fingerprintRetryContext(context: unknown) {
  const bytes = new TextEncoder().encode(stableSerialize(context));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * Reuses a token only for the same logical request in this browser tab.
 * `context` may contain sensitive values; it is hashed before any storage.
 */
export async function getSessionRetryToken(scope: string, context: unknown) {
  const key = storageKey(scope);
  const fingerprint = await fingerprintRetryContext(context);
  const existing = inMemoryTokens.get(key) ?? readStoredRetryToken(key);
  if (existing?.fingerprint === fingerprint) return existing.token;

  const token = crypto.randomUUID();
  inMemoryTokens.set(key, { token, fingerprint });
  const storage = getSessionStorage();
  try {
    storage?.setItem(key, JSON.stringify({ token, fingerprint }));
  } catch {
    // The request remains safe within this page even when browser storage is disabled.
  }
  return token;
}

/** Clear a completed retry token without erasing a newer in-progress request. */
export function clearSessionRetryToken(scope: string, completedToken?: string) {
  const key = storageKey(scope);
  const inMemory = inMemoryTokens.get(key);
  if (completedToken && inMemory && inMemory.token !== completedToken) return;
  const storage = getSessionStorage();
  const existing = readStoredRetryToken(key);
  if (completedToken && existing?.token !== completedToken) return;
  inMemoryTokens.delete(key);
  if (!storage) return;
  try {
    storage.removeItem(key);
  } catch {
    // A later retry can still use the in-memory result flow.
  }
}
