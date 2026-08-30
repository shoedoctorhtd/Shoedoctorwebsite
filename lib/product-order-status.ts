import type { ProductOrderStatus } from "./product-types";

/** Cancellation restores the original sale, so it is unsafe after completion. */
export function canCancelProductOrderStatus(status: ProductOrderStatus) {
  return status === "pending" || status === "awaiting_payment" || status === "payment_review" || status === "confirmed" || status === "processing";
}

export function canTransitionProductOrderStatus(
  from: ProductOrderStatus,
  to: ProductOrderStatus,
) {
  if (from === to) return true;
  return (
    (from === "pending" && (to === "confirmed" || to === "cancelled")) ||
    (from === "awaiting_payment" && (to === "payment_review" || to === "cancelled")) ||
    (from === "payment_review" && (to === "awaiting_payment" || to === "confirmed" || to === "cancelled")) ||
    (from === "confirmed" && (to === "processing" || to === "cancelled")) ||
    (from === "processing" && (to === "completed" || to === "cancelled"))
  );
}
