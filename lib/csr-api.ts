import {
  requireAdminApi,
  type AdminApiAuthResult,
} from "./admin-auth";
import { appendAuditLog, type AuditLogInput } from "./audit";

/**
 * JSON responses from the CSR admin API can contain donor details and draft
 * programme content. Keep them out of browser, intermediary, and CDN caches.
 */
export function csrAdminJson(data: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("cache-control", "private, no-store");
  return Response.json(data, { ...init, headers });
}

function requireCsrAdmin(
  request: Request,
  mutation: boolean,
): Promise<AdminApiAuthResult> {
  return requireAdminApi(request, {
    action: `CSR_${request.method}`,
    mutation,
    permissions: request.url.includes("/emails/") ? ["donations", "notifications"] : ["donations"],
    entityType: "csr",
  });
}

/** Use this for read-only CSR routes that only need a response guard. */
export async function requireCsrAdminApi(request: Request) {
  const auth = await requireCsrAdmin(request, false);
  return auth.response ?? null;
}

/**
 * Mutation routes must use this guard so the data layer receives the exact
 * administrator proven by the server-side session, rather than any client
 * supplied identity.
 */
export function requireCsrAdminMutation(
  request: Request,
): Promise<AdminApiAuthResult> {
  return requireCsrAdmin(request, true);
}

/** Read routes with a durable security/activity event can use this actor. */
export function requireCsrAdminActor(request: Request): Promise<AdminApiAuthResult> {
  return requireCsrAdmin(request, false);
}

export function csrApiError(error: unknown, fallback: string, status = 400) {
  const message = error instanceof Error ? error.message : fallback;
  const responseStatus =
    error instanceof Error && error.name === "CsrMutationConflictError"
      ? 409
      : status;
  return csrAdminJson({ message }, { status: responseStatus });
}

/**
 * Exporting is read-only with respect to CSR records, so it has no business
 * statement to batch with. Its activity audit remains a distinct append-only
 * event, and still receives the actor from the verified role gate.
 */
export async function appendCsrActivityAudit(
  actor: AuditLogInput["actor"],
  input: Omit<AuditLogInput, "actor">,
) {
  await appendAuditLog({ actor, ...input });
}
