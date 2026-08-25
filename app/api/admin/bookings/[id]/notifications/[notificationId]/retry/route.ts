import { requireAdminApi } from "@/lib/admin-auth";
import { retryBookingStatusNotification } from "@/lib/data";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string; notificationId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireAdminApi(request, {
    action: "BOOKING_NOTIFICATION_RETRY",
    mutation: true,
    roles: ["super_admin"],
    entityType: "booking_notification",
  });
  if (auth.response) return auth.response;

  try {
    const { id, notificationId } = await context.params;
    const result = await retryBookingStatusNotification(id, notificationId, auth.user);
    if (result.kind === "not_found") {
      return Response.json({ message: "Notification not found." }, { status: 404 });
    }
    if (result.kind === "not_retryable") {
      return Response.json(
        {
          notification: result.notification,
          message:
            result.notification.status === "sent"
              ? "This customer email has already been sent."
              : "Only failed customer emails can be retried.",
        },
        { status: 409 },
      );
    }
    if (result.kind === "in_progress") {
      return Response.json(
        {
          notification: result.notification,
          message: "A customer email attempt is already in progress.",
        },
        { status: 409 },
      );
    }
    if (result.kind === "failed") {
      return Response.json(
        {
          notification: result.notification,
          message: "The notification could not be retried because its booking history is unavailable.",
        },
        { status: 409 },
      );
    }

    return Response.json({
      ok: true,
      booking: result.booking,
      notification: result.notification,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to retry customer email.";
    return Response.json({ message }, { status: 400 });
  }
}
