export const CUSTOMER_SESSION_COOKIE = "__Host-shoe_doctor_customer_session";
export const CUSTOMER_SESSION_DURATION_SECONDS = 60 * 60 * 24 * 90;

/**
 * Keeps phone matching separate from booking snapshots. Nepal mobile formats
 * are unified, while unprefixed international values are retained as entered.
 */
export function normalizeCustomerPhone(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  const digits = trimmed.replace(/\D/gu, "");
  if (digits.length < 7 || digits.length > 15) return null;

  if (digits.length === 10 && digits.startsWith("9")) {
    return `+977${digits}`;
  }
  if (digits.length === 13 && digits.startsWith("977") && digits[3] === "9") {
    return `+${digits}`;
  }
  if (digits.startsWith("00") && digits.length > 2) {
    return `+${digits.slice(2)}`;
  }
  if (trimmed.startsWith("+")) return `+${digits}`;
  return digits;
}

export function customerSessionCookie(token: string) {
  return [
    `${CUSTOMER_SESSION_COOKIE}=${token}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    `Max-Age=${CUSTOMER_SESSION_DURATION_SECONDS}`,
  ].join("; ");
}

export function clearCustomerSessionCookie() {
  return [
    `${CUSTOMER_SESSION_COOKIE}=`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    "Max-Age=0",
  ].join("; ");
}
