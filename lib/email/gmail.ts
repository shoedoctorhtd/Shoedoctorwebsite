import { isEmailAddress } from "./address";
import { buildRawGmailMessage } from "./mime";
import type { StatusEmailContent } from "./statusTemplates";

export { buildRawGmailMessage } from "./mime";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GMAIL_SEND_URL = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send";
const DEFAULT_FROM_EMAIL = "shoedoctorhtd@gmail.com";
const REQUEST_TIMEOUT_MS = 7_000;

type GmailEnvironment = {
  GMAIL_FROM_EMAIL?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GOOGLE_REFRESH_TOKEN?: string;
};

export type GmailEmailResult =
  | { status: "sent" }
  | { status: "failed"; errorCode: string };

export type GmailStatusEmailResult = GmailEmailResult;

export type GmailEmailInput = {
  html: string;
  subject: string;
  text: string;
  to: string;
};

export type GmailStatusEmailInput = {
  content: StatusEmailContent;
  to: string;
};

/**
 * Exchanges the Worker-held refresh token and sends a Gmail REST message. No
 * OAuth credential is ever sent to, or read from, browser code.
 */
export async function sendGmailEmail(
  input: GmailEmailInput,
): Promise<GmailEmailResult> {
  if (!isEmailAddress(input.to)) {
    return { status: "failed", errorCode: "customer_email_invalid" };
  }

  const environment = await getRuntimeEnvironment();
  const clientId = environment.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = environment.GOOGLE_CLIENT_SECRET?.trim();
  const refreshToken = environment.GOOGLE_REFRESH_TOKEN?.trim();
  const from = environment.GMAIL_FROM_EMAIL?.trim() || DEFAULT_FROM_EMAIL;

  if (!clientId || !clientSecret || !refreshToken || !isEmailAddress(from)) {
    return { status: "failed", errorCode: "gmail_not_configured" };
  }

  try {
    const accessToken = await getGoogleAccessToken({
      clientId,
      clientSecret,
      refreshToken,
    });
    if (!accessToken.ok) return accessToken;

    const raw = buildRawGmailMessage({
      from,
      to: input.to.trim(),
      subject: input.subject,
      text: input.text,
      html: input.html,
    });
    const response = await fetchWithTimeout(GMAIL_SEND_URL, {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessToken.accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ raw }),
    });

    if (!response.ok) {
      return {
        status: "failed",
        errorCode: gmailHttpErrorCode("gmail_send", response.status),
      };
    }
    return { status: "sent" };
  } catch (error) {
    return { status: "failed", errorCode: networkErrorCode(error) };
  }
}

/**
 * Backwards-compatible status-email entry point. Customer status messages use
 * the shared generic transport, while retaining the existing call signature.
 */
export async function sendGmailStatusEmail(
  input: GmailStatusEmailInput,
): Promise<GmailStatusEmailResult> {
  return sendGmailEmail({
    to: input.to,
    subject: input.content.subject,
    text: input.content.text,
    html: input.content.html,
  });
}

async function getGoogleAccessToken(credentials: {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}): Promise<
  | { ok: true; accessToken: string }
  | { ok: false; status: "failed"; errorCode: string }
> {
  const response = await fetchWithTimeout(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
      refresh_token: credentials.refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!response.ok) {
    return {
      ok: false,
      status: "failed",
      errorCode: gmailHttpErrorCode("gmail_oauth", response.status),
    };
  }

  const body = (await response.json()) as { access_token?: unknown };
  const accessToken =
    typeof body.access_token === "string" ? body.access_token.trim() : "";
  return accessToken
    ? { ok: true, accessToken }
    : { ok: false, status: "failed", errorCode: "gmail_oauth_invalid_response" };
}

async function fetchWithTimeout(url: string, init: RequestInit) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function gmailHttpErrorCode(prefix: string, status: number) {
  if (status === 401 || status === 403) return `${prefix}_unauthorized`;
  if (status === 429) return `${prefix}_rate_limited`;
  return `${prefix}_http_${status}`;
}

function networkErrorCode(error: unknown) {
  if (error instanceof Error && error.name === "AbortError") {
    return "gmail_request_timed_out";
  }
  return "gmail_network_error";
}

async function getRuntimeEnvironment(): Promise<GmailEnvironment> {
  try {
    const workers = (await import(/* @vite-ignore */ "cloudflare:workers")) as {
      env?: GmailEnvironment;
    };
    if (workers.env) return workers.env;
  } catch {
    // Local tests and local development can use uncommitted environment values.
  }

  return {
    GMAIL_FROM_EMAIL: process.env.GMAIL_FROM_EMAIL,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    GOOGLE_REFRESH_TOKEN: process.env.GOOGLE_REFRESH_TOKEN,
  };
}
