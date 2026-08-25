import { retryDonationEmailEvent } from "@/lib/csr-data";
import {
  csrAdminJson,
  csrApiError,
  requireCsrAdminMutation,
} from "@/lib/csr-api";
import { parseCsrId } from "@/lib/csr-validation";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string; emailId: string }>;
};

/** Retries only a previously failed donor email; sent/pending events are never resent. */
export async function POST(request: Request, context: RouteContext) {
  const auth = await requireCsrAdminMutation(request);
  if ("response" in auth) return auth.response;
  try {
    const { id: rawId, emailId: rawEmailId } = await context.params;
    const result = await retryDonationEmailEvent(
      parseCsrId(rawId, "request"),
      parseCsrId(rawEmailId, "email event"),
      auth.user,
    );
    if (result.kind === "not_found") {
      return csrAdminJson({ message: "Donation email event not found." }, { status: 404 });
    }
    if (result.kind === "not_retryable") {
      return csrAdminJson(
        {
          event: result.event,
          message:
            result.event.deliveryStatus === "sent"
              ? "This donor email has already been sent."
              : "Only failed donor emails can be retried.",
        },
        { status: 409 },
      );
    }
    if (result.kind === "in_progress") {
      return csrAdminJson(
        { event: result.event, message: "A retry is already in progress." },
        { status: 409 },
      );
    }
    if (result.kind === "failed") {
      return csrAdminJson(
        { event: result.event, message: "The donor email could not be retried." },
        { status: 502 },
      );
    }
    return csrAdminJson({ request: result.donation, event: result.event });
  } catch (error) {
    return csrApiError(error, "Unable to retry donor email.");
  }
}
