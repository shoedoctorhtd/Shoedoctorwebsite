import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const SESSION_COOKIE = "shoe_doctor_admin_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 12;
const DEFAULT_ADMIN_EMAIL = "shoedoctorhtd@gmail.com";

type AuthEnvironment = {
  ADMIN_EMAIL?: string;
  ADMIN_PASSWORD?: string;
  SESSION_SECRET?: string;
};

type SessionPayload = {
  email: string;
  exp: number;
};

export type AdminUser = {
  displayName: string;
  email: string;
};

export async function getAdminUser(): Promise<AdminUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const config = await getAuthConfig();
  if (!config) return null;

  const payload = await verifySessionToken(token, config.sessionSecret);
  if (!payload || payload.email !== config.adminEmail) return null;

  return {
    displayName: "Shoe Doctor",
    email: payload.email,
  };
}

export async function requireAdminUser(returnTo = "/admin") {
  const user = await getAdminUser();
  if (user) return user;

  redirect(`/admin/login?next=${encodeURIComponent(safeReturnPath(returnTo))}`);
}

export async function verifyAdminCredentials(email: string, password: string) {
  const config = await getAuthConfig();
  if (!config) {
    return { ok: false as const, reason: "configuration" as const };
  }

  const emailMatches = await constantTimeEqual(
    email.trim().toLowerCase(),
    config.adminEmail,
  );
  const passwordMatches = await constantTimeEqual(
    password,
    config.adminPassword,
  );

  if (!emailMatches || !passwordMatches) {
    return { ok: false as const, reason: "credentials" as const };
  }

  return {
    ok: true as const,
    email: config.adminEmail,
    sessionSecret: config.sessionSecret,
  };
}

export async function createAdminSessionToken(
  email: string,
  sessionSecret: string,
) {
  const payload: SessionPayload = {
    email,
    exp: Math.floor(Date.now() / 1000) + SESSION_DURATION_SECONDS,
  };
  const encodedPayload = base64UrlEncode(
    new TextEncoder().encode(JSON.stringify(payload)),
  );
  const signature = await sign(encodedPayload, sessionSecret);
  return `${encodedPayload}.${signature}`;
}

export function adminSessionCookie(token: string) {
  return [
    `${SESSION_COOKIE}=${token}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Strict",
    `Max-Age=${SESSION_DURATION_SECONDS}`,
  ].join("; ");
}

export function clearAdminSessionCookie() {
  return [
    `${SESSION_COOKIE}=`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Strict",
    "Max-Age=0",
  ].join("; ");
}

export function safeReturnPath(value: string | null | undefined) {
  if (!value?.startsWith("/") || value.startsWith("//")) return "/admin";
  try {
    const url = new URL(value, "https://shoe-doctor.local");
    return url.origin === "https://shoe-doctor.local"
      ? `${url.pathname}${url.search}${url.hash}`
      : "/admin";
  } catch {
    return "/admin";
  }
}

async function getAuthConfig() {
  const runtime = await getRuntimeEnvironment();
  const adminEmail = String(
    runtime.ADMIN_EMAIL ?? DEFAULT_ADMIN_EMAIL,
  )
    .trim()
    .toLowerCase();
  const adminPassword = String(runtime.ADMIN_PASSWORD ?? "");
  const sessionSecret = String(runtime.SESSION_SECRET ?? "");

  if (!adminEmail || !adminPassword || sessionSecret.length < 32) {
    return null;
  }

  return { adminEmail, adminPassword, sessionSecret };
}

async function getRuntimeEnvironment(): Promise<AuthEnvironment> {
  try {
    const workers = (await import("cloudflare:workers")) as {
      env?: AuthEnvironment;
    };
    if (workers.env) return workers.env;
  } catch {
    // Local tooling can use environment variables instead.
  }

  const runtimeEnv = {
    ADMIN_EMAIL: process.env.ADMIN_EMAIL,
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
    SESSION_SECRET: process.env.SESSION_SECRET,
  };

  if (runtimeEnv.ADMIN_PASSWORD || runtimeEnv.SESSION_SECRET) {
    return runtimeEnv;
  }

  return {
    ...runtimeEnv,
    ...(await loadLocalDevEnvironment()),
  };
}

async function loadLocalDevEnvironment(): Promise<AuthEnvironment> {
  try {
    const { readFile } = await import("node:fs/promises");
    const file = new URL("../.dev.vars", import.meta.url);
    const contents = await readFile(file, "utf8");
    return parseLocalVars(contents);
  } catch {
    return {};
  }
}

function parseLocalVars(contents: string): AuthEnvironment {
  return contents.split(/\r?\n/u).reduce((env, line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return env;
    const [key, ...rest] = trimmed.split("=");
    if (!key) return env;
    env[key] = rest.join("=");
    return env;
  }, {} as AuthEnvironment);
}

async function verifySessionToken(token: string, secret: string) {
  const [encodedPayload, suppliedSignature, extra] = token.split(".");
  if (!encodedPayload || !suppliedSignature || extra) return null;

  const expectedSignature = await sign(encodedPayload, secret);
  if (!(await constantTimeEqual(suppliedSignature, expectedSignature))) {
    return null;
  }

  try {
    const payload = JSON.parse(
      new TextDecoder().decode(base64UrlDecode(encodedPayload)),
    ) as Partial<SessionPayload>;
    if (
      typeof payload.email !== "string" ||
      typeof payload.exp !== "number" ||
      payload.exp <= Math.floor(Date.now() / 1000)
    ) {
      return null;
    }
    return payload as SessionPayload;
  } catch {
    return null;
  }
}

async function sign(value: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(value),
  );
  return base64UrlEncode(new Uint8Array(signature));
}

async function constantTimeEqual(left: string, right: string) {
  const [leftDigest, rightDigest] = await Promise.all([
    crypto.subtle.digest("SHA-256", new TextEncoder().encode(left)),
    crypto.subtle.digest("SHA-256", new TextEncoder().encode(right)),
  ]);
  const leftBytes = new Uint8Array(leftDigest);
  const rightBytes = new Uint8Array(rightDigest);
  let difference = leftBytes.length ^ rightBytes.length;
  for (let index = 0; index < leftBytes.length; index += 1) {
    difference |= leftBytes[index] ^ rightBytes[index];
  }
  return difference === 0;
}

function base64UrlEncode(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/u, "");
}

function base64UrlDecode(value: string) {
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}
