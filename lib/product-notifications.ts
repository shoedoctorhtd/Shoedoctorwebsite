import { sendGmailEmail } from "./email/gmail";
import { getDatabase } from "./data";
import { buildProductCodOrderCustomerEmail, buildProductOrderCustomerEmail, buildProductOrderOwnerEmail } from "./product-order-email";
import { getProductOrder } from "./product-order-data";

type ProductNotification = {
  id: string;
  orderId: string;
  recipientKind: "owner" | "customer";
  recipientEmail: string | null;
  deliveryStatus: "pending" | "sending" | "sent" | "failed" | "skipped";
  leaseExpiresAt: string | null;
};

const PRODUCT_ORDER_OWNER_EMAIL = "shoedoctorhtd@gmail.com";
const PRODUCT_ORDER_ADMIN_ORIGIN = "https://shoedoctor.com.np";

type ProductNotificationStatement = {
  bind(...values: unknown[]): ProductNotificationStatement;
  run(): Promise<{ meta?: { changes?: number } }>;
  first<T>(): Promise<T | null>;
  all<T>(): Promise<{ results: T[] }>;
};

type ProductNotificationDatabase = {
  prepare(sql: string): ProductNotificationStatement;
};

export function buildProductOrderNotificationInsert(
  db: ProductNotificationDatabase,
  input: {
    id: string;
    orderId: string;
    recipientKind: "owner" | "customer";
    recipientEmail: string | null;
    eventKey: string;
    createdAt: string;
    operationId: string;
  },
) {
  return db.prepare(`
    INSERT INTO product_order_notifications (
      id, order_id, recipient_kind, recipient_email, notification_type, event_key,
      delivery_status, attempt_count, created_at, updated_at
    ) SELECT ?, ?, ?, ?, 'order_created', ?, 'pending', 0, ?, ?
    WHERE EXISTS (
      SELECT 1 FROM product_orders
      WHERE id = ? AND last_inventory_mutation_id = ?
    )
  `).bind(
    input.id, input.orderId, input.recipientKind, input.recipientEmail,
    input.eventKey, input.createdAt, input.createdAt, input.orderId, input.operationId,
  );
}

export async function deliverProductOrderNotifications(orderId: string) {
  const db = await getDatabase();
  const rows = await db
    .prepare("SELECT id FROM product_order_notifications WHERE order_id = ? AND delivery_status = 'pending' ORDER BY created_at ASC")
    .bind(orderId)
    .all<{ id: string }>();
  await Promise.allSettled(rows.results.map((row) => deliverProductOrderNotification(row.id)));
}

export async function deliverProductOrderNotification(id: string) {
  const db = await getDatabase();
  const notification = await findProductOrderNotification(id);
  if (!notification) return { kind: "not_found" as const };
  const now = new Date();
  const claimToken = crypto.randomUUID();
  const nowIso = now.toISOString();
  const expires = new Date(now.getTime() + 5 * 60 * 1000).toISOString();
  const claim = await db.prepare(`
    UPDATE product_order_notifications
    SET delivery_status = 'sending', lease_token = ?, lease_expires_at = ?,
        attempt_count = attempt_count + 1, updated_at = ?
    WHERE id = ? AND (
      delivery_status = 'pending'
      OR (delivery_status = 'sending' AND lease_expires_at IS NOT NULL AND lease_expires_at <= ?)
    )
  `).bind(claimToken, expires, nowIso, id, nowIso).run();
  if (!claim.meta.changes) return { kind: "not_pending" as const };

  const order = await getProductOrder(notification.orderId);
  if (!order) return finishProductOrderNotification(id, claimToken, "failed", "order_unavailable");
  let status: ProductNotification["deliveryStatus"] = "failed";
  let error: string | null = "delivery_failed";
  if (notification.recipientKind === "owner") {
    const result = await sendGmailEmail({
      to: PRODUCT_ORDER_OWNER_EMAIL,
      ...buildProductOrderOwnerEmail(order, {
        adminOrderUrl: `${PRODUCT_ORDER_ADMIN_ORIGIN}/admin/product-orders?search=${encodeURIComponent(order.publicReference)}`,
      }),
    });
    status = result.status === "sent" ? "sent" : "failed";
    error = result.status === "sent" ? null : result.errorCode;
  } else if (notification.recipientEmail) {
    const content = order.paymentMethod === "cod"
      ? buildProductCodOrderCustomerEmail(order)
      : buildProductOrderCustomerEmail(order);
    const result = await sendGmailEmail({ to: notification.recipientEmail, ...content });
    status = result.status === "sent" ? "sent" : "failed";
    error = result.status === "sent" ? null : result.errorCode;
  } else {
    status = "skipped";
    error = "customer_email_not_available";
  }
  return finishProductOrderNotification(id, claimToken, status, error);
}

async function findProductOrderNotification(id: string): Promise<ProductNotification | null> {
  const db = await getDatabase();
  const row = await db.prepare("SELECT * FROM product_order_notifications WHERE id = ?").bind(id).first<Record<string, unknown>>();
  if (!row) return null;
  return {
    id: String(row.id),
    orderId: String(row.order_id),
    recipientKind: row.recipient_kind === "customer" ? "customer" : "owner",
    recipientEmail: typeof row.recipient_email === "string" && row.recipient_email.trim() ? row.recipient_email.trim() : null,
    deliveryStatus: row.delivery_status === "sending" || row.delivery_status === "sent" || row.delivery_status === "failed" || row.delivery_status === "skipped" ? row.delivery_status : "pending",
    leaseExpiresAt: typeof row.lease_expires_at === "string" ? row.lease_expires_at : null,
  };
}

async function finishProductOrderNotification(
  id: string,
  leaseToken: string,
  status: ProductNotification["deliveryStatus"],
  error: string | null,
) {
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.prepare(`
    UPDATE product_order_notifications
    SET delivery_status = ?, error_summary = ?, sent_at = ?, lease_token = NULL,
        lease_expires_at = NULL, updated_at = ?
    WHERE id = ? AND delivery_status = 'sending' AND lease_token = ?
  `).bind(status, error, status === "sent" ? now : null, now, id, leaseToken).run();
  return { kind: status, id };
}
