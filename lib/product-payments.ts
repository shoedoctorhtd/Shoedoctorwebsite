import { appendAuditLog, buildAuditLogInsert } from "./audit";
import type { AdminActor } from "./admin-types";
import { getDatabase } from "./data";
import { sendGmailEmail } from "./email/gmail";
import { safePaymentReceiptAttachmentFilename, validatePaymentReceipt } from "./payment-receipt-validation";
import {
  getProductOrder,
  getProductOrderByPublicReference,
  listProductPaymentReceipts,
} from "./product-order-data";
import {
  buildProductPaymentApprovedCustomerEmail,
  buildProductPaymentReceiptOwnerEmail,
  buildProductPaymentReceiptSubmittedCustomerEmail,
  buildProductPaymentRejectedCustomerEmail,
} from "./product-order-email";
import { equalPaymentTokenHashes, hashPaymentAccessToken } from "./product-payment-security";
import { normalizeProductOrderReferenceSearch } from "./product-order-reference";
import type { ProductOrder, ProductPaymentReceipt } from "./product-types";

const OWNER_PAYMENT_EMAIL = "shoedoctorhtd@gmail.com";

type Statement = {
  bind(...values: unknown[]): Statement;
  run(): Promise<{ meta?: { changes?: number } }>;
  first<T>(): Promise<T | null>;
  all<T>(): Promise<{ results: T[] }>;
};

type Database = {
  prepare(sql: string): Statement;
  batch(statements: Statement[]): Promise<Array<{ meta?: { changes?: number } }>>;
};

type PaymentOrderAccessRow = {
  id: string;
  payment_access_token_hash: string | null;
  payment_method: string | null;
  payment_status: string;
  status: string;
};

type ReceiptRow = {
  id: string;
  order_id: string;
  sha256_checksum: string;
  email_delivery_status: string;
  submission_idempotency_key: string;
};

type ReceiptFile = {
  name: string;
  type: string;
  size: number;
  arrayBuffer(): Promise<ArrayBuffer>;
};

export type PublicPaymentOrder = {
  publicReference: string;
  customerName: string | null;
  fulfillmentMethod: ProductOrder["fulfillmentMethod"];
  deliveryAddress: string | null;
  total: number;
  paymentAmount: number;
  paymentMethod: "qr";
  paymentStatus: ProductOrder["paymentStatus"];
  status: ProductOrder["status"];
  items: Array<{
    productName: string;
    sku: string;
    quantity: number;
    unitPriceNpr: number;
    lineTotalNpr: number;
  }>;
  receipt: PublicPaymentReceipt | null;
  receiptSubmittedAt: string | null;
  canUploadReceipt: boolean;
};

export type PublicPaymentReceipt = {
  originalDisplayFilename: string;
  contentType: string;
  byteSize: number;
  emailDeliveryStatus: ProductPaymentReceipt["emailDeliveryStatus"];
  submittedAt: string | null;
};

export async function getPublicQrPaymentOrder(reference: string, accessToken: string) {
  const access = await resolveQrPaymentAccess(reference, accessToken);
  if (!access) return null;
  const receipts = await listProductPaymentReceipts(access.order.id);
  return toPublicPaymentOrder(access.order, receipts[0] ?? null);
}

export async function submitProductPaymentReceipt(input: {
  reference: string;
  accessToken: string;
  idempotencyKey: string;
  transactionReference: string | null;
  file: ReceiptFile;
  adminOrderUrl?: string | null;
}) {
  const access = await resolveQrPaymentAccess(input.reference, input.accessToken);
  if (!access) return { kind: "not_found" as const };
  if (!canUpload(access.order)) return { kind: "not_uploadable" as const, order: access.order };

  const receipt = await validatePaymentReceipt(input.file);
  const db = await getDatabase() as unknown as Database;
  const byIdempotency = await db
    .prepare("SELECT id, order_id, sha256_checksum, email_delivery_status, submission_idempotency_key FROM product_payment_receipts WHERE submission_idempotency_key = ?")
    .bind(input.idempotencyKey)
    .first<ReceiptRow>();
  if (byIdempotency && byIdempotency.order_id !== access.order.id) {
    return { kind: "invalid_submission" as const };
  }
  if (byIdempotency && byIdempotency.sha256_checksum !== receipt.sha256Checksum) {
    return { kind: "invalid_submission" as const };
  }

  const byChecksum = byIdempotency ?? await db
    .prepare("SELECT id, order_id, sha256_checksum, email_delivery_status, submission_idempotency_key FROM product_payment_receipts WHERE order_id = ? AND sha256_checksum = ?")
    .bind(access.order.id, receipt.sha256Checksum)
    .first<ReceiptRow>();
  if (byChecksum && isReceiptSuccessful(byChecksum.email_delivery_status)) {
    return { kind: "duplicate" as const, order: access.order, receipt: await getPaymentReceipt(byChecksum.id) };
  }
  if (byChecksum?.email_delivery_status === "sending") {
    return { kind: "in_progress" as const };
  }

  const now = new Date().toISOString();
  const safeAttachmentFilename = safePaymentReceiptAttachmentFilename(access.order.publicReference, receipt.extension);
  const receiptId = byChecksum?.id ?? crypto.randomUUID();
  const started = byChecksum
    ? await retryFailedReceipt({
        db,
        receiptId,
        order: access.order,
        receipt,
        transactionReference: input.transactionReference,
        safeAttachmentFilename,
        now,
        requestId: input.idempotencyKey,
      })
    : await createSendingReceipt({
        db,
        receiptId,
        order: access.order,
        receipt,
        transactionReference: input.transactionReference,
        safeAttachmentFilename,
        now,
        requestId: input.idempotencyKey,
      });
  if (!started) {
    const current = await getPaymentReceipt(receiptId);
    return current && isReceiptSuccessful(current.emailDeliveryStatus)
      ? { kind: "duplicate" as const, order: access.order, receipt: current }
      : { kind: "not_uploadable" as const, order: access.order };
  }

  const ownerContent = buildProductPaymentReceiptOwnerEmail(access.order, {
    mimeType: receipt.contentType,
    safeAttachmentFilename,
    sha256: receipt.sha256Checksum,
    sizeBytes: receipt.byteSize,
    submittedAt: now,
    transactionReference: input.transactionReference,
  }, { adminOrderUrl: input.adminOrderUrl ?? null });
  const delivery = await sendGmailEmail({
    to: OWNER_PAYMENT_EMAIL,
    ...ownerContent,
    attachments: [{
      contentType: receipt.contentType,
      filename: safeAttachmentFilename,
      data: receipt.bytes,
    }],
  });

  if (delivery.status !== "sent") {
    await finishReceiptEmailFailure({
      db,
      receiptId,
      order: access.order,
      errorCode: delivery.errorCode,
      now: new Date().toISOString(),
      requestId: input.idempotencyKey,
    });
    return { kind: "email_failed" as const, message: "We could not send your receipt to Shoe Doctor. Please try uploading it again." };
  }

  const finalized = await finishReceiptEmailSuccess({
    db,
    receiptId,
    order: access.order,
    messageId: delivery.messageId ?? null,
    now: new Date().toISOString(),
    requestId: input.idempotencyKey,
  });
  if (!finalized) {
    return { kind: "not_uploadable" as const, order: await getProductOrder(access.order.id) ?? access.order };
  }
  const order = (await getProductOrder(access.order.id))!;
  const storedReceipt = (await getPaymentReceipt(receiptId))!;
  void sendCustomerPaymentEmail(order, "submitted").catch(() => undefined);
  return { kind: "submitted" as const, order, receipt: storedReceipt };
}

export async function approveProductQrPayment(orderId: string, actor: AdminActor, idempotencyKey: string) {
  const order = await getProductOrder(orderId);
  if (!order) return { kind: "not_found" as const };
  if (order.paymentMethod !== "qr") throw new Error("This order is not a QR payment order.");
  if (order.paymentStatus === "paid") return { kind: "duplicate" as const, order };
  if (order.paymentStatus !== "submitted" || order.status !== "payment_review") {
    throw new Error("A submitted payment receipt is required before approval.");
  }
  const db = await getDatabase() as unknown as Database;
  const now = new Date().toISOString();
  const batch = await db.batch([
    db.prepare(`
      UPDATE product_payment_receipts
      SET email_delivery_status = 'verified', verified_at = ?, verifying_admin_id = ?, updated_at = ?
      WHERE id = (
        SELECT id FROM product_payment_receipts
        WHERE order_id = ? AND email_delivery_status = 'emailed'
        ORDER BY created_at DESC, id DESC LIMIT 1
      )
      AND EXISTS (
        SELECT 1 FROM product_orders
        WHERE id = ? AND status = 'payment_review' AND payment_status = 'submitted'
      )
    `).bind(now, actor.id, now, orderId, orderId),
    db.prepare(`
      UPDATE product_orders
      SET payment_status = 'paid', status = 'confirmed', payment_verified_at = ?,
          payment_verified_by_admin_id = ?, payment_rejection_reason = NULL, updated_at = ?
      WHERE id = ? AND status = 'payment_review' AND payment_status = 'submitted'
        AND EXISTS (SELECT 1 FROM product_payment_receipts WHERE order_id = ? AND email_delivery_status = 'verified' AND verified_at = ?)
    `).bind(now, actor.id, now, orderId, orderId, now),
    buildAuditLogInsert(db as never, {
      actor,
      action: "PRODUCT_QR_PAYMENT_APPROVED",
      entityType: "product_order",
      entityId: orderId,
      bookingReference: order.publicReference,
      previousValues: { paymentStatus: order.paymentStatus, status: order.status },
      newValues: { paymentStatus: "paid", status: "confirmed", paymentAmount: order.paymentAmount },
      changedFields: ["paymentStatus", "status", "paymentVerifiedAt"],
      requestId: idempotencyKey,
      createdAt: now,
      conditionalOn: {
        sql: "EXISTS (SELECT 1 FROM product_orders WHERE id = ? AND payment_status = 'paid' AND payment_verified_at = ?)",
        bindings: [orderId, now],
      },
    }),
  ]);
  if (!batch[1]?.meta?.changes) {
    const current = await getProductOrder(orderId);
    return current?.paymentStatus === "paid" ? { kind: "duplicate" as const, order: current } : { kind: "conflict" as const, order: current ?? order };
  }
  const updated = (await getProductOrder(orderId))!;
  void sendCustomerPaymentEmail(updated, "approved", actor).catch(() => undefined);
  return { kind: "approved" as const, order: updated };
}

export async function rejectProductQrPayment(orderId: string, reason: string, actor: AdminActor, idempotencyKey: string) {
  const order = await getProductOrder(orderId);
  if (!order) return { kind: "not_found" as const };
  if (order.paymentMethod !== "qr") throw new Error("This order is not a QR payment order.");
  if (order.paymentStatus === "rejected") return { kind: "duplicate" as const, order };
  if (order.paymentStatus !== "submitted" || order.status !== "payment_review") {
    throw new Error("Only a submitted QR receipt can be rejected.");
  }
  const db = await getDatabase() as unknown as Database;
  const now = new Date().toISOString();
  const batch = await db.batch([
    db.prepare(`
      UPDATE product_payment_receipts
      SET email_delivery_status = 'rejected', rejection_reason = ?, verified_at = ?, verifying_admin_id = ?, updated_at = ?
      WHERE id = (
        SELECT id FROM product_payment_receipts
        WHERE order_id = ? AND email_delivery_status = 'emailed'
        ORDER BY created_at DESC, id DESC LIMIT 1
      )
      AND EXISTS (
        SELECT 1 FROM product_orders
        WHERE id = ? AND status = 'payment_review' AND payment_status = 'submitted'
      )
    `).bind(reason, now, actor.id, now, orderId, orderId),
    db.prepare(`
      UPDATE product_orders
      SET payment_status = 'rejected', status = 'awaiting_payment', payment_rejection_reason = ?, updated_at = ?
      WHERE id = ? AND status = 'payment_review' AND payment_status = 'submitted'
        AND EXISTS (SELECT 1 FROM product_payment_receipts WHERE order_id = ? AND email_delivery_status = 'rejected' AND rejection_reason = ?)
    `).bind(reason, now, orderId, orderId, reason),
    buildAuditLogInsert(db as never, {
      actor,
      action: "PRODUCT_QR_PAYMENT_REJECTED",
      entityType: "product_order",
      entityId: orderId,
      bookingReference: order.publicReference,
      previousValues: { paymentStatus: order.paymentStatus, status: order.status },
      newValues: { paymentStatus: "rejected", status: "awaiting_payment" },
      changedFields: ["paymentStatus", "status", "paymentRejectionReason"],
      reason,
      requestId: idempotencyKey,
      createdAt: now,
      conditionalOn: {
        sql: "EXISTS (SELECT 1 FROM product_orders WHERE id = ? AND payment_status = 'rejected' AND payment_rejection_reason = ?)",
        bindings: [orderId, reason],
      },
    }),
  ]);
  if (!batch[1]?.meta?.changes) {
    const current = await getProductOrder(orderId);
    return current?.paymentStatus === "rejected" ? { kind: "duplicate" as const, order: current } : { kind: "conflict" as const, order: current ?? order };
  }
  const updated = (await getProductOrder(orderId))!;
  void sendCustomerPaymentEmail(updated, "rejected", actor, reason).catch(() => undefined);
  return { kind: "rejected" as const, order: updated };
}

export async function collectCodProductPayment(orderId: string, amountCollected: number, actor: AdminActor, idempotencyKey: string) {
  const order = await getProductOrder(orderId);
  if (!order) return { kind: "not_found" as const };
  if (order.paymentMethod !== "cod") throw new Error("This order is not Cash on Delivery.");
  if (amountCollected !== order.paymentAmount) {
    throw new Error("The collected amount must match the server-calculated payable amount.");
  }
  if (order.paymentStatus === "paid") return { kind: "duplicate" as const, order };
  if (order.status === "cancelled" || order.paymentStatus !== "cod_pending") {
    throw new Error("This COD payment can no longer be collected.");
  }
  const db = await getDatabase() as unknown as Database;
  const now = new Date().toISOString();
  const batch = await db.batch([
    db.prepare(`
      UPDATE product_orders
      SET payment_status = 'paid', cod_collected_at = ?, cod_collected_by_admin_id = ?, updated_at = ?
      WHERE id = ? AND payment_method = 'cod' AND payment_status = 'cod_pending' AND status <> 'cancelled'
    `).bind(now, actor.id, now, orderId),
    buildAuditLogInsert(db as never, {
      actor,
      action: "PRODUCT_COD_PAYMENT_COLLECTED",
      entityType: "product_order",
      entityId: orderId,
      bookingReference: order.publicReference,
      previousValues: { paymentStatus: order.paymentStatus },
      newValues: { paymentStatus: "paid", amountCollected },
      changedFields: ["paymentStatus", "codCollectedAt"],
      requestId: idempotencyKey,
      createdAt: now,
      conditionalOn: {
        sql: "EXISTS (SELECT 1 FROM product_orders WHERE id = ? AND payment_status = 'paid' AND cod_collected_at = ?)",
        bindings: [orderId, now],
      },
    }),
  ]);
  if (!batch[0]?.meta?.changes) {
    const current = await getProductOrder(orderId);
    return current?.paymentStatus === "paid" ? { kind: "duplicate" as const, order: current } : { kind: "conflict" as const, order: current ?? order };
  }
  return { kind: "collected" as const, order: (await getProductOrder(orderId))! };
}

async function resolveQrPaymentAccess(reference: string, accessToken: string) {
  const normalizedReference = normalizeProductOrderReferenceSearch(reference);
  if (!normalizedReference) return null;
  const [order, raw] = await Promise.all([
    getProductOrderByPublicReference(normalizedReference),
    findPaymentAccessRow(normalizedReference),
  ]);
  if (!order || !raw || raw.id !== order.id || raw.payment_method !== "qr") return null;
  const suppliedHash = await hashPaymentAccessToken(accessToken);
  return equalPaymentTokenHashes(raw.payment_access_token_hash, suppliedHash) ? { order, raw } : null;
}

async function findPaymentAccessRow(reference: string) {
  const db = await getDatabase();
  return db.prepare(`
    SELECT id, payment_access_token_hash, payment_method, payment_status, status
    FROM product_orders WHERE public_reference = ?
  `).bind(reference).first<PaymentOrderAccessRow>();
}

function canUpload(order: ProductOrder) {
  return order.paymentMethod === "qr" && order.status === "awaiting_payment" && (order.paymentStatus === "unpaid" || order.paymentStatus === "rejected");
}

function toPublicPaymentOrder(order: ProductOrder, receipt: ProductPaymentReceipt | null): PublicPaymentOrder {
  return {
    publicReference: order.publicReference,
    customerName: order.customerName,
    fulfillmentMethod: order.fulfillmentMethod,
    deliveryAddress: order.deliveryAddress,
    total: order.total,
    paymentAmount: order.paymentAmount,
    paymentMethod: "qr",
    paymentStatus: order.paymentStatus,
    status: order.status,
    items: order.items.map((item) => ({
      productName: item.productName,
      sku: item.sku,
      quantity: item.quantity,
      unitPriceNpr: item.unitPriceNpr,
      lineTotalNpr: item.lineTotalNpr,
    })),
    receipt: receipt ? {
      originalDisplayFilename: receipt.originalDisplayFilename,
      contentType: receipt.contentType,
      byteSize: receipt.byteSize,
      emailDeliveryStatus: receipt.emailDeliveryStatus,
      submittedAt: receipt.submittedAt,
    } : null,
    receiptSubmittedAt: order.paymentSubmittedAt ?? receipt?.submittedAt ?? null,
    canUploadReceipt: canUpload(order),
  };
}

function isReceiptSuccessful(status: string) {
  return status === "emailed" || status === "verified" || status === "rejected";
}

async function createSendingReceipt(input: {
  db: Database;
  receiptId: string;
  order: ProductOrder;
  receipt: Awaited<ReturnType<typeof validatePaymentReceipt>>;
  transactionReference: string | null;
  safeAttachmentFilename: string;
  now: string;
  requestId: string;
}) {
  const batch = await input.db.batch([
    input.db.prepare(`
      INSERT INTO product_payment_receipts (
        id, order_id, original_display_filename, attachment_filename, content_type,
        byte_size, sha256_checksum, transaction_reference, email_delivery_status,
        submission_idempotency_key, created_at, updated_at
      ) SELECT ?, ?, ?, ?, ?, ?, ?, ?, 'sending', ?, ?, ?
      WHERE EXISTS (
        SELECT 1 FROM product_orders
        WHERE id = ? AND payment_method = 'qr' AND status = 'awaiting_payment'
          AND payment_status IN ('unpaid', 'rejected')
      )
    `).bind(
      input.receiptId, input.order.id, input.receipt.originalDisplayFilename,
      input.safeAttachmentFilename, input.receipt.contentType, input.receipt.byteSize,
      input.receipt.sha256Checksum, input.transactionReference, input.requestId,
      input.now, input.now, input.order.id,
    ),
    buildAuditLogInsert(input.db as never, {
      actor: { actorType: "customer", name: input.order.customerName },
      action: "PRODUCT_PAYMENT_RECEIPT_SENDING",
      entityType: "product_order",
      entityId: input.order.id,
      bookingReference: input.order.publicReference,
      newValues: { deliveryStatus: "sending", contentType: input.receipt.contentType, byteSize: input.receipt.byteSize },
      changedFields: ["receiptSubmission"],
      requestId: input.requestId,
      createdAt: input.now,
      conditionalOn: {
        sql: "EXISTS (SELECT 1 FROM product_payment_receipts WHERE id = ? AND email_delivery_status = 'sending')",
        bindings: [input.receiptId],
      },
    }),
  ]);
  return Boolean(batch[0]?.meta?.changes);
}

async function retryFailedReceipt(input: {
  db: Database;
  receiptId: string;
  order: ProductOrder;
  receipt: Awaited<ReturnType<typeof validatePaymentReceipt>>;
  transactionReference: string | null;
  safeAttachmentFilename: string;
  now: string;
  requestId: string;
}) {
  const batch = await input.db.batch([
    input.db.prepare(`
      UPDATE product_payment_receipts
      SET original_display_filename = ?, attachment_filename = ?, content_type = ?, byte_size = ?,
          transaction_reference = ?, email_delivery_status = 'sending', gmail_message_id = NULL, updated_at = ?
      WHERE id = ? AND order_id = ? AND email_delivery_status = 'email_failed'
        AND EXISTS (
          SELECT 1 FROM product_orders
          WHERE id = ? AND payment_method = 'qr' AND status = 'awaiting_payment'
            AND payment_status IN ('unpaid', 'rejected')
        )
    `).bind(
      input.receipt.originalDisplayFilename, input.safeAttachmentFilename, input.receipt.contentType,
      input.receipt.byteSize, input.transactionReference, input.now, input.receiptId,
      input.order.id, input.order.id,
    ),
    buildAuditLogInsert(input.db as never, {
      actor: { actorType: "customer", name: input.order.customerName },
      action: "PRODUCT_PAYMENT_RECEIPT_RETRYING",
      entityType: "product_order",
      entityId: input.order.id,
      bookingReference: input.order.publicReference,
      newValues: { deliveryStatus: "sending" },
      changedFields: ["receiptSubmission"],
      requestId: input.requestId,
      createdAt: input.now,
      conditionalOn: {
        sql: "EXISTS (SELECT 1 FROM product_payment_receipts WHERE id = ? AND email_delivery_status = 'sending')",
        bindings: [input.receiptId],
      },
    }),
  ]);
  return Boolean(batch[0]?.meta?.changes);
}

async function finishReceiptEmailFailure(input: {
  db: Database;
  receiptId: string;
  order: ProductOrder;
  errorCode: string;
  now: string;
  requestId: string;
}) {
  await input.db.batch([
    input.db.prepare(`
      UPDATE product_payment_receipts
      SET email_delivery_status = 'email_failed', updated_at = ?
      WHERE id = ? AND order_id = ? AND email_delivery_status = 'sending'
    `).bind(input.now, input.receiptId, input.order.id),
    buildAuditLogInsert(input.db as never, {
      actor: { actorType: "system", name: "Gmail receipt delivery" },
      action: "PRODUCT_PAYMENT_RECEIPT_EMAIL_FAILED",
      entityType: "product_order",
      entityId: input.order.id,
      bookingReference: input.order.publicReference,
      newValues: { deliveryStatus: "email_failed", errorCode: input.errorCode },
      changedFields: ["receiptDeliveryStatus"],
      reason: input.errorCode,
      requestId: `${input.requestId}:email-failed`,
      createdAt: input.now,
      conditionalOn: {
        sql: "EXISTS (SELECT 1 FROM product_payment_receipts WHERE id = ? AND email_delivery_status = 'email_failed')",
        bindings: [input.receiptId],
      },
    }),
  ]);
}

async function finishReceiptEmailSuccess(input: {
  db: Database;
  receiptId: string;
  order: ProductOrder;
  messageId: string | null;
  now: string;
  requestId: string;
}) {
  const batch = await input.db.batch([
    input.db.prepare(`
      UPDATE product_payment_receipts
      SET email_delivery_status = 'emailed', gmail_message_id = ?, submitted_at = ?, updated_at = ?
      WHERE id = ? AND order_id = ? AND email_delivery_status = 'sending'
    `).bind(input.messageId, input.now, input.now, input.receiptId, input.order.id),
    input.db.prepare(`
      UPDATE product_orders
      SET payment_status = 'submitted', status = 'payment_review', payment_submitted_at = ?, updated_at = ?
      WHERE id = ? AND payment_method = 'qr' AND status = 'awaiting_payment'
        AND payment_status IN ('unpaid', 'rejected')
        AND EXISTS (SELECT 1 FROM product_payment_receipts WHERE id = ? AND email_delivery_status = 'emailed')
    `).bind(input.now, input.now, input.order.id, input.receiptId),
    buildAuditLogInsert(input.db as never, {
      actor: { actorType: "customer", name: input.order.customerName },
      action: "PRODUCT_PAYMENT_RECEIPT_EMAILED",
      entityType: "product_order",
      entityId: input.order.id,
      bookingReference: input.order.publicReference,
      newValues: { deliveryStatus: "emailed", paymentStatus: "submitted", status: "payment_review" },
      changedFields: ["receiptDeliveryStatus", "paymentStatus", "status"],
      requestId: `${input.requestId}:email-sent`,
      createdAt: input.now,
      conditionalOn: {
        sql: "EXISTS (SELECT 1 FROM product_orders WHERE id = ? AND payment_status = 'submitted' AND payment_submitted_at = ?)",
        bindings: [input.order.id, input.now],
      },
    }),
  ]);
  return Boolean(batch[1]?.meta?.changes);
}

async function getPaymentReceipt(id: string) {
  const db = await getDatabase();
  const row = await db.prepare("SELECT order_id FROM product_payment_receipts WHERE id = ?").bind(id).first<{ order_id: string }>();
  if (!row) return null;
  const receipts = await listProductPaymentReceipts(row.order_id);
  return receipts.find((receipt) => receipt.id === id) ?? null;
}

async function sendCustomerPaymentEmail(
  order: ProductOrder,
  kind: "submitted" | "approved" | "rejected",
  actor?: AdminActor,
  rejectionReason?: string,
) {
  if (!order.customerEmail) return;
  const content = kind === "submitted"
    ? buildProductPaymentReceiptSubmittedCustomerEmail(order)
    : kind === "approved"
      ? buildProductPaymentApprovedCustomerEmail(order)
      : buildProductPaymentRejectedCustomerEmail(order, { rejectionReason });
  const delivery = await sendGmailEmail({ to: order.customerEmail, ...content });
  await appendAuditLog({
    actor: actor ?? { actorType: "system", name: "Product payment email" },
    action: delivery.status === "sent" ? "PRODUCT_PAYMENT_CUSTOMER_EMAIL_SENT" : "PRODUCT_PAYMENT_CUSTOMER_EMAIL_FAILED",
    entityType: "product_order",
    entityId: order.id,
    bookingReference: order.publicReference,
    newValues: { kind, deliveryStatus: delivery.status },
    reason: delivery.status === "sent" ? null : delivery.errorCode,
    requestId: crypto.randomUUID(),
  });
}
