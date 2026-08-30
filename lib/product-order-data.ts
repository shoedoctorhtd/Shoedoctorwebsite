import { auditValueDiff, buildAuditLogInsert } from "./audit";
import type { AdminActor } from "./admin-types";
import { getDatabase } from "./data";
import { normalizeProductOrderReferenceSearch } from "./product-order-reference";
import { canTransitionProductOrderStatus } from "./product-order-status";
import {
  type ProductOrder,
  type ProductOrderItem,
  type ProductPaymentReceipt,
  type ProductPaymentReceiptDeliveryStatus,
  type ProductOrderStatus,
  type ProductPaymentStatus,
} from "./product-types";

type OrderRow = Record<string, unknown>;
type ItemRow = Record<string, unknown>;

export type ProductOrderListFilters = {
  search?: string;
  channel?: "online" | "offline";
  status?: ProductOrderStatus;
  paymentStatus?: ProductPaymentStatus;
  date?: string;
  page?: number;
  pageSize?: number;
};

export async function getProductOrder(id: string): Promise<ProductOrder | null> {
  const db = await getDatabase();
  const row = await db.prepare("SELECT * FROM product_orders WHERE id = ?").bind(id).first<OrderRow>();
  if (!row) return null;
  return hydrateOrders([parseOrder(row)]).then((orders) => orders[0] ?? null);
}

export async function getProductOrderByCheckoutToken(token: string) {
  const db = await getDatabase();
  const row = await db
    .prepare("SELECT * FROM product_orders WHERE checkout_idempotency_token = ?")
    .bind(token)
    .first<OrderRow>();
  if (!row) return null;
  return hydrateOrders([parseOrder(row)]).then((orders) => orders[0] ?? null);
}

export async function getProductOrderByPublicReference(reference: string) {
  const normalized = normalizeProductOrderReferenceSearch(reference);
  if (!normalized) return null;
  const db = await getDatabase();
  const row = await db
    .prepare("SELECT * FROM product_orders WHERE public_reference = ?")
    .bind(normalized)
    .first<OrderRow>();
  if (!row) return null;
  return hydrateOrders([parseOrder(row)]).then((orders) => orders[0] ?? null);
}

export async function listProductPaymentReceipts(orderId: string): Promise<ProductPaymentReceipt[]> {
  const db = await getDatabase();
  const rows = await db
    .prepare("SELECT * FROM product_payment_receipts WHERE order_id = ? ORDER BY created_at DESC, id DESC")
    .bind(orderId)
    .all<Record<string, unknown>>();
  return rows.results.map(parsePaymentReceipt);
}

export async function listProductOrderAuditTrail(orderId: string) {
  const db = await getDatabase();
  const rows = await db
    .prepare(`
      SELECT action, administrator_name_snapshot AS administrator_name, actor_type,
             previous_values, new_values, reason, created_at
      FROM audit_logs
      WHERE entity_type = 'product_order' AND entity_id = ?
      ORDER BY created_at ASC, id ASC
    `)
    .bind(orderId)
    .all<Record<string, unknown>>();
  return rows.results.map((row) => ({
    action: String(row.action),
    administratorName: nullableText(row.administrator_name),
    actorType: String(row.actor_type),
    reason: nullableText(row.reason),
    createdAt: String(row.created_at),
  }));
}

export async function listProductOrders(filters: ProductOrderListFilters = {}) {
  const db = await getDatabase();
  const where: string[] = [];
  const values: unknown[] = [];
  const search = String(filters.search ?? "").trim().slice(0, 160);
  if (search) {
    const reference = normalizeProductOrderReferenceSearch(search);
    if (reference) {
      where.push("public_reference = ?");
      values.push(reference);
    } else {
      where.push("(customer_name LIKE ? OR customer_phone LIKE ?)");
      values.push(`%${search}%`, `%${search}%`);
    }
  }
  if (filters.channel) {
    where.push("channel = ?");
    values.push(filters.channel);
  }
  if (filters.status) {
    where.push("status = ?");
    values.push(filters.status);
  }
  if (filters.paymentStatus) {
    where.push("payment_status = ?");
    values.push(filters.paymentStatus);
  }
  if (filters.date && /^\d{4}-\d{2}-\d{2}$/u.test(filters.date)) {
    where.push("substr(created_at, 1, 10) = ?");
    values.push(filters.date);
  }
  const pageSize = Math.max(10, Math.min(100, Math.trunc(filters.pageSize ?? 30)));
  const page = Math.max(1, Math.trunc(filters.page ?? 1));
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const [rows, count] = await Promise.all([
    db
      .prepare(`SELECT * FROM product_orders ${whereSql} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`)
      .bind(...values, pageSize, (page - 1) * pageSize)
      .all<OrderRow>(),
    db.prepare(`SELECT COUNT(*) AS count FROM product_orders ${whereSql}`).bind(...values).first<{ count: number }>(),
  ]);
  return {
    orders: await hydrateOrders(rows.results.map(parseOrder)),
    page,
    pageSize,
    total: Number(count?.count ?? 0),
  };
}

export { canTransitionProductOrderStatus } from "./product-order-status";

export async function updateProductOrderDetails(
  id: string,
  input: { status?: ProductOrderStatus; paymentStatus?: ProductPaymentStatus },
  actor: AdminActor,
) {
  const before = await getProductOrder(id);
  if (!before) return { kind: "not_found" as const };
  if (input.status === "cancelled") {
    throw new Error("Use the cancellation action so stock can be restored safely.");
  }
  if (before.paymentMethod && input.paymentStatus !== undefined) {
    throw new Error("Use the dedicated payment verification controls for this order.");
  }
  if (before.paymentMethod === "qr" && before.paymentStatus !== "paid" && input.status && input.status !== before.status) {
    throw new Error("Verify the QR payment before advancing this order.");
  }
  if (input.status && !canTransitionProductOrderStatus(before.status, input.status)) {
    throw new Error("That order-status transition is not allowed.");
  }
  const status = input.status ?? before.status;
  const paymentStatus = input.paymentStatus ?? before.paymentStatus;
  if (status === before.status && paymentStatus === before.paymentStatus) {
    return { kind: "unchanged" as const, order: before };
  }
  const now = new Date().toISOString();
  const db = await getDatabase();
  const diff = auditValueDiff(
    { status: before.status, paymentStatus: before.paymentStatus },
    { status, paymentStatus },
  );
  const action = input.status && input.status !== before.status
    ? "PRODUCT_ORDER_STATUS_CHANGED"
    : "PRODUCT_ORDER_PAYMENT_STATUS_CHANGED";
  const operationId = crypto.randomUUID();
  const batch = await db.batch([
    db
      .prepare(`
        UPDATE product_orders SET status = ?, payment_status = ?, updated_at = ?
        WHERE id = ? AND updated_at = ? AND status <> 'cancelled'
      `)
      .bind(status, paymentStatus, now, id, before.updatedAt),
    buildAuditLogInsert(db, {
      actor,
      action,
      entityType: "product_order",
      entityId: id,
      bookingReference: before.publicReference,
      previousValues: diff.previousValues,
      newValues: diff.newValues,
      changedFields: diff.changedFields,
      requestId: operationId,
      createdAt: now,
      conditionalOn: {
        sql: "EXISTS (SELECT 1 FROM product_orders WHERE id = ? AND updated_at = ?)",
        bindings: [id, now],
      },
    }),
  ]);
  if (!batch[0]?.meta.changes) {
    return { kind: "conflict" as const, order: (await getProductOrder(id)) ?? before };
  }
  return { kind: "updated" as const, order: (await getProductOrder(id))! };
}

export async function orderExistsWithReference(reference: string) {
  const db = await getDatabase();
  const row = await db
    .prepare("SELECT 1 AS found FROM product_orders WHERE public_reference = ?")
    .bind(reference)
    .first<{ found: number }>();
  return Boolean(row?.found);
}

async function hydrateOrders(orders: ProductOrder[]) {
  if (!orders.length) return orders;
  const db = await getDatabase();
  const ids = orders.map((order) => order.id);
  const rows = await db
    .prepare(`SELECT * FROM product_order_items WHERE order_id IN (${ids.map(() => "?").join(", ")}) ORDER BY created_at ASC, id ASC`)
    .bind(...ids)
    .all<ItemRow>();
  const itemsByOrder = new Map<string, ProductOrderItem[]>();
  rows.results.map(parseOrderItem).forEach((item) => {
    const list = itemsByOrder.get(item.orderId) ?? [];
    list.push(item.item);
    itemsByOrder.set(item.orderId, list);
  });
  return orders.map((order) => ({ ...order, items: itemsByOrder.get(order.id) ?? [] }));
}

function parseOrder(row: OrderRow): ProductOrder {
  return {
    id: String(row.id),
    publicReference: String(row.public_reference),
    channel: row.channel === "offline" ? "offline" : "online",
    customerName: nullableText(row.customer_name),
    customerPhone: nullableText(row.customer_phone),
    customerEmail: nullableText(row.customer_email),
    fulfillmentMethod: row.fulfillment_method === "delivery" ? "delivery" : "collection",
    deliveryAddress: nullableText(row.delivery_address),
    customerNote: nullableText(row.customer_note),
    subtotal: integer(row.subtotal),
    deliveryCharge: integer(row.delivery_charge),
    total: integer(row.total),
    status: parseStatus(row.status),
    paymentMethod: parsePaymentMethod(row.payment_method),
    paymentStatus: parsePaymentStatus(row.payment_status),
    paymentAmount: integer(row.payment_amount),
    paymentSubmittedAt: nullableText(row.payment_submitted_at),
    paymentVerifiedAt: nullableText(row.payment_verified_at),
    paymentVerifiedByAdminId: nullableText(row.payment_verified_by_admin_id),
    paymentRejectionReason: nullableText(row.payment_rejection_reason),
    codCollectedAt: nullableText(row.cod_collected_at),
    codCollectedByAdminId: nullableText(row.cod_collected_by_admin_id),
    cancellationReason: nullableText(row.cancellation_reason),
    cancelledAt: nullableText(row.cancelled_at),
    stockRestoredAt: nullableText(row.stock_restored_at),
    createdByAdminId: nullableText(row.created_by_admin_id),
    stockCommittedAt: nullableText(row.stock_committed_at),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    items: [],
  };
}

function parseOrderItem(row: ItemRow) {
  return {
    orderId: String(row.order_id),
    item: {
      id: String(row.id),
      productId: String(row.product_id),
      sku: String(row.sku_snapshot),
      productName: String(row.product_name_snapshot),
      unitPriceNpr: integer(row.unit_price_npr),
      quantity: integer(row.quantity),
      lineTotalNpr: integer(row.line_total_npr),
    },
  };
}

function parseStatus(value: unknown): ProductOrderStatus {
  return value === "awaiting_payment" || value === "payment_review" || value === "confirmed" || value === "processing" || value === "completed" || value === "cancelled"
    ? value
    : "pending";
}

function parsePaymentMethod(value: unknown) {
  return value === "qr" || value === "cod" ? value : null;
}

function parsePaymentStatus(value: unknown): ProductPaymentStatus {
  return value === "unpaid" || value === "submitted" || value === "rejected" || value === "cod_pending" || value === "partial" || value === "paid" || value === "refunded"
    ? value
    : "pending";
}

function parsePaymentReceipt(row: Record<string, unknown>): ProductPaymentReceipt {
  const contentType = row.content_type === "image/jpeg" || row.content_type === "image/png" || row.content_type === "image/webp" || row.content_type === "application/pdf"
    ? row.content_type
    : "application/pdf";
  return {
    id: String(row.id),
    orderId: String(row.order_id),
    originalDisplayFilename: String(row.original_display_filename),
    attachmentFilename: String(row.attachment_filename),
    contentType,
    byteSize: integer(row.byte_size),
    sha256Checksum: String(row.sha256_checksum),
    transactionReference: nullableText(row.transaction_reference),
    emailDeliveryStatus: parseReceiptDeliveryStatus(row.email_delivery_status),
    gmailMessageId: nullableText(row.gmail_message_id),
    submittedAt: nullableText(row.submitted_at),
    verifiedAt: nullableText(row.verified_at),
    verifyingAdminId: nullableText(row.verifying_admin_id),
    rejectionReason: nullableText(row.rejection_reason),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function parseReceiptDeliveryStatus(value: unknown): ProductPaymentReceiptDeliveryStatus {
  return value === "sending" || value === "email_failed" || value === "emailed" || value === "verified" || value === "rejected"
    ? value
    : "email_failed";
}

function nullableText(value: unknown) {
  const text = typeof value === "string" ? value.trim() : "";
  return text || null;
}

function integer(value: unknown) {
  const number = Number(value);
  return Number.isSafeInteger(number) ? number : 0;
}
