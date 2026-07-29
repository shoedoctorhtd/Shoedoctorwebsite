import { getAdminUser } from "./admin-auth";

/**
 * JSON responses from the CSR admin API can contain donor details and draft
 * programme content. Keep them out of browser, intermediary, and CDN caches.
 */
export function csrAdminJson(data: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("cache-control", "private, no-store");
  return Response.json(data, { ...init, headers });
}

export async function requireCsrAdminApi() {
  if (await getAdminUser()) return null;
  return csrAdminJson({ message: "Unauthorized" }, { status: 401 });
}

export function csrApiError(error: unknown, fallback: string, status = 400) {
  const message = error instanceof Error ? error.message : fallback;
  return csrAdminJson({ message }, { status });
}
