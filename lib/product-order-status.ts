type ProductOrderLifecycleStatus = "pending" | "confirmed" | "processing" | "completed" | "cancelled";

/** Cancellation restores the original sale, so it is unsafe after completion. */
export function canCancelProductOrderStatus(status: ProductOrderLifecycleStatus) {
  return status === "pending" || status === "confirmed" || status === "processing";
}

export function canTransitionProductOrderStatus(
  from: ProductOrderLifecycleStatus,
  to: ProductOrderLifecycleStatus,
) {
  if (from === to) return true;
  return (
    (from === "pending" && (to === "confirmed" || to === "cancelled")) ||
    (from === "confirmed" && (to === "processing" || to === "cancelled")) ||
    (from === "processing" && (to === "completed" || to === "cancelled"))
  );
}
