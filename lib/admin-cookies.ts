export const ADMIN_SESSION_COOKIE = "__Host-shoe_doctor_admin_session";
export const ADMIN_SESSION_DURATION_SECONDS = 60 * 60 * 12;

export function adminSessionCookieValue(token: string) {
  return [`${ADMIN_SESSION_COOKIE}=${token}`, "Path=/", "HttpOnly", "Secure", "SameSite=Strict", `Max-Age=${ADMIN_SESSION_DURATION_SECONDS}`].join("; ");
}

export function clearAdminSessionCookieValue() {
  return [`${ADMIN_SESSION_COOKIE}=`, "Path=/", "HttpOnly", "Secure", "SameSite=Strict", "Max-Age=0"].join("; ");
}
