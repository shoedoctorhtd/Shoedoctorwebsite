import type { AdminRole } from "./admin-types";

export function normalizeAdminEmail(value: unknown) {
  const email = String(value ?? "").trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email) && email.length <= 160 ? email : "";
}

export function safeAdminReturnPath(value: string | null | undefined) {
  if (!value?.startsWith("/") || value.startsWith("//")) return "/admin";
  try {
    const url = new URL(value, "https://shoe-doctor.local");
    return url.origin === "https://shoe-doctor.local" ? `${url.pathname}${url.search}${url.hash}` : "/admin";
  } catch { return "/admin"; }
}

export function hasRequiredAdminRole(role: AdminRole, roles?: readonly AdminRole[]) {
  return !roles || roles.includes(role);
}

export function hasTrustedAdminMutationOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    if (origin !== new URL(request.url).origin) return false;
  } catch { return false; }
  const fetchSite = request.headers.get("sec-fetch-site");
  return !fetchSite || fetchSite === "same-origin";
}
