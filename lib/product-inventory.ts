import { buildAuditLogInsert } from "./audit";
import type { AdminActor } from "./admin-types";
import { getDatabase } from "./data";
import { orderExistsWithReference, getProductOrder, getProductOrderByCheckoutToken } from "./product-order-data";
import { generatePublicProductOrderReference, isProductOrderReferenceCollision } from "./product-order-reference";
import { canCancelProductOrderStatus } from "./product-order-status";
import { nullableInteger } from "./product-validation";
import { buildProductOrderNotificationInsert, deliverProductOrderNotifications } from "./product-notifications";
import { hashPaymentAccessToken } from "./product-payment-security";
import {
  prepareCheckoutItems,
  type CheckoutProduct,
  type NormalizedCheckoutItem,
} from "./product-checkout";
import {
  type InventoryMovement,
  type InventoryMovementType,
  type OfflineSaleRequest,
  type ProductOrder,
  type ProductOrderRequest,
} from "./product-types";

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

type ProductForCheckoutRow = {
  id: string;
  slug: string | null;
  sku: string | null;
  name: string;
  price_npr: number | null;
  stock_quantity: number | null;
  status: string;
  updated_at: string;
};

export type ProductOrderCreationResult =
  | { kind: "created"; order: ProductOrder }
  | { kind: "duplicate"; order: ProductOrder }
  | { kind: "stock_conflict"; message: string };

/**
 * This is the only module that mutates products.stock_quantity. Every sale,
 * adjustment, return, and cancellation creates an immutable movement in the
 * same D1 batch as the stock write.
 */
export async function createOnlineProductOrder(
  request: ProductOrderRequest,
): Promise<ProductOrderCreationResult> {
  const paymentAccessTokenHash = request.paymentMethod === "qr" && request.paymentAccessToken
    ? await hashPaymentAccessToken(request.paymentAccessToken)
    : null;
  return createProductOrder({
    channel: "online",
    idempotencyToken: request.idempotencyToken,
    customerName: request.customerName,
    customerPhone: request.phone,
    customerEmail: request.email,
    fulfillmentMethod: request.fulfillmentMethod,
    deliveryAddress: request.deliveryAddress,
    customerNote: request.customerNote,
    paymentMethod: request.paymentMethod,
    paymentStatus: request.paymentMethod === "qr" ? "unpaid" : "cod_pending",
    initialStatus: request.paymentMethod === "qr" ? "awaiting_payment" : "confirmed",
    paymentAccessTokenHash,
    items: request.items,
    actor: null,
  });
}

export async function recordOfflineProductSale(
  request: OfflineSaleRequest,
  actor: AdminActor,
): Promise<ProductOrderCreationResult> {
  return createProductOrder({
    channel: "offline",
    idempotencyToken: request.idempotencyToken,
    customerName: request.customerName,
    customerPhone: request.phone,
    customerEmail: null,
    fulfillmentMethod: "collection",
    deliveryAddress: null,
    customerNote: request.note,
    paymentMethod: null,
    paymentStatus: request.paymentStatus,
    initialStatus: "completed",
    paymentAccessTokenHash: null,
    items: request.items,
    actor,
  });
}

async function createProductOrder(input: {
  channel: "online" | "offline";
  idempotencyToken: string;
  customerName: string | null;
  customerPhone: string | null;
  customerEmail: string | null;
  fulfillmentMethod: "delivery" | "collection";
  deliveryAddress: string | null;
  customerNote: string | null;
  paymentMethod: "qr" | "cod" | null;
  paymentStatus: "pending" | "unpaid" | "submitted" | "rejected" | "cod_pending" | "partial" | "paid" | "refunded";
  initialStatus: "pending" | "awaiting_payment" | "payment_review" | "confirmed" | "processing" | "completed" | "cancelled";
  paymentAccessTokenHash: string | null;
  items: Array<{ productSlug: string; quantity: number }>;
  actor: AdminActor | null;
}): Promise<ProductOrderCreationResult> {
  const replay = await getProductOrderByCheckoutToken(input.idempotencyToken);
  if (replay) {
    // A client retry can also drain a pending durable outbox entry left by a
    // prior interrupted response; it never replays the stock transaction.
    void deliverProductOrderNotifications(replay.id).catch(() => undefined);
    return { kind: "duplicate", order: replay };
  }

  const products = await loadCheckoutProducts(input.items);
  const prepared = prepareCheckoutItems(products, input.items);
  if (prepared.kind === "stock_conflict") return prepared;

  for (let referenceAttempt = 0; referenceAttempt < 3; referenceAttempt += 1) {
    const publicReference = await generatePublicProductOrderReference({
      tryPersist: async (reference) => !(await orderExistsWithReference(reference)),
    });
    const attempted = await persistProductOrder({ ...input, publicReference, items: prepared.items });
    if (attempted.kind !== "reference_collision") return attempted;
  }
  throw new Error("Unable to allocate a product order reference. Please try again.");
}

async function persistProductOrder(input: {
  channel: "online" | "offline";
  idempotencyToken: string;
  customerName: string | null;
  customerPhone: string | null;
  customerEmail: string | null;
  fulfillmentMethod: "delivery" | "collection";
  deliveryAddress: string | null;
  customerNote: string | null;
  paymentMethod: "qr" | "cod" | null;
  paymentStatus: "pending" | "unpaid" | "submitted" | "rejected" | "cod_pending" | "partial" | "paid" | "refunded";
  initialStatus: "pending" | "awaiting_payment" | "payment_review" | "confirmed" | "processing" | "completed" | "cancelled";
  paymentAccessTokenHash: string | null;
  items: NormalizedCheckoutItem[];
  actor: AdminActor | null;
  publicReference: string;
}): Promise<ProductOrderCreationResult | { kind: "reference_collision" }> {
  const db = await getDatabase() as unknown as Database;
  const now = new Date().toISOString();
  const operationId = crypto.randomUUID();
  const orderId = crypto.randomUUID();
  const uniqueCount = input.items.length;
  const subtotal = input.items.reduce((sum, item) => sum + item.lineTotal, 0);
  const status = input.initialStatus;
  const stockUpdate = buildGuardedSaleUpdate(db, input.items, operationId, now, input.idempotencyToken);
  const marker = markerCondition(input.items, operationId);
  const ownerNotificationId = crypto.randomUUID();
  const customerNotificationId = input.customerEmail ? crypto.randomUUID() : null;

  try {
    const results = await db.batch([
      stockUpdate,
      db.prepare(`
        INSERT INTO product_orders (
          id, public_reference, channel, customer_name, customer_phone, customer_email,
          fulfillment_method, delivery_address, customer_note, subtotal, delivery_charge,
          total, status, payment_method, payment_status, payment_amount,
          payment_access_token_hash, checkout_idempotency_token, created_by_admin_id,
          stock_committed_at, stock_commit_operation_id, last_inventory_mutation_id,
          created_at, updated_at
        ) SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        WHERE ${marker.sql}
      `).bind(
        orderId, input.publicReference, input.channel, input.customerName,
        input.customerPhone, input.customerEmail, input.fulfillmentMethod,
        input.deliveryAddress, input.customerNote, subtotal, subtotal, status,
        input.paymentMethod, input.paymentStatus, subtotal, input.paymentAccessTokenHash,
        input.idempotencyToken, input.actor?.id ?? null, now, operationId,
        operationId, now, now, ...marker.bindings,
      ),
      ...input.items.map((item) => db.prepare(`
        INSERT INTO product_order_items (
          id, order_id, product_id, sku_snapshot, product_name_snapshot,
          unit_price_npr, quantity, line_total_npr, created_at
        ) SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?
        WHERE EXISTS (
          SELECT 1 FROM product_orders
          WHERE id = ? AND last_inventory_mutation_id = ?
        )
      `).bind(
        crypto.randomUUID(), orderId, item.id, item.sku!, item.name, item.priceNpr!,
        item.quantity, item.lineTotal, now, orderId, operationId,
      )),
      ...input.items.map((item) => db.prepare(`
        INSERT INTO inventory_movements (
          id, product_id, stock_change, previous_stock, resulting_stock,
          movement_type, related_order_id, source_id, admin_user_id, reason,
          idempotency_key, created_at
        ) SELECT ?, p.id, ?, p.stock_quantity + ?, p.stock_quantity, ?, ?, ?, ?, ?, ?, ?
        FROM products p
        WHERE p.id = ? AND p.last_inventory_mutation_id = ?
      `).bind(
        crypto.randomUUID(), -item.quantity, item.quantity,
        input.channel === "online" ? "online_sale" : "offline_sale",
        orderId, orderId, input.actor?.id ?? null,
        input.channel === "online" ? "Online product order" : "Offline shop sale",
        `sale:${orderId}:${item.id}`, now, item.id, operationId,
      )),
      buildAuditLogInsert(db as never, {
        actor: input.actor ?? { actorType: "customer", name: "Product customer" },
        action: input.channel === "online" ? "PRODUCT_ORDER_CREATED" : "PRODUCT_OFFLINE_SALE_RECORDED",
        entityType: "product_order",
        entityId: orderId,
        bookingReference: input.publicReference,
        newValues: {
          channel: input.channel,
          itemCount: input.items.reduce((sum, item) => sum + item.quantity, 0),
          subtotal,
          paymentMethod: input.paymentMethod,
          paymentStatus: input.paymentStatus,
          status,
        },
        changedFields: ["created"],
        requestId: input.idempotencyToken,
        createdAt: now,
        conditionalOn: {
          sql: "EXISTS (SELECT 1 FROM product_orders WHERE id = ? AND last_inventory_mutation_id = ?)",
          bindings: [orderId, operationId],
        },
      }),
      buildProductOrderNotificationInsert(db as never, {
        id: ownerNotificationId,
        orderId,
        recipientKind: "owner",
        recipientEmail: null,
        eventKey: `product-order:${orderId}:owner-created`,
        createdAt: now,
        operationId,
      }),
      ...(customerNotificationId && input.customerEmail
        ? [buildProductOrderNotificationInsert(db as never, {
            id: customerNotificationId,
            orderId,
            recipientKind: "customer",
            recipientEmail: input.customerEmail,
            eventKey: `product-order:${orderId}:customer-created`,
            createdAt: now,
            operationId,
          })]
        : []),
    ]);
    if (Number(results[0]?.meta?.changes ?? 0) !== uniqueCount || !results[1]?.meta?.changes) {
      const replay = await getProductOrderByCheckoutToken(input.idempotencyToken);
      if (replay) return { kind: "duplicate", order: replay };
      return { kind: "stock_conflict", message: "One or more products changed or sold out. Refresh your cart and try again." };
    }
  } catch (error) {
    if (isProductOrderReferenceCollision(error)) return { kind: "reference_collision" };
    const replay = await getProductOrderByCheckoutToken(input.idempotencyToken);
    if (replay) return { kind: "duplicate", order: replay };
    throw error;
  }

  const order = await getProductOrder(orderId);
  if (!order) throw new Error("Your order was saved but could not be loaded. Please contact Shoe Doctor with your order reference.");
  // Delivery is deliberately post-commit and best effort. It never changes
  // product stock or retries the checkout transaction.
  void deliverProductOrderNotifications(orderId).catch(() => undefined);
  return { kind: "created", order };
}

function buildGuardedSaleUpdate(
  db: Database,
  items: NormalizedCheckoutItem[],
  operationId: string,
  now: string,
  idempotencyToken: string,
) {
  const caseQty = items.map(() => "WHEN ? THEN ?").join(" ");
  const caseUpdated = items.map(() => "WHEN ? THEN ?").join(" ");
  const ids = items.map(() => "?").join(", ");
  const updateCaseQuantityBindings = items.flatMap((item) => [item.id, item.quantity]);
  const updateCaseUpdatedBindings = items.flatMap((item) => [item.id, item.updatedAt]);
  const subqueryQuantityBindings = items.flatMap((item) => [item.id, item.quantity]);
  const subqueryUpdatedBindings = items.flatMap((item) => [item.id, item.updatedAt]);
  return db.prepare(`
    UPDATE products
    SET stock_quantity = stock_quantity - CASE id ${caseQty} END,
        last_inventory_mutation_id = ?, updated_at = ?
    WHERE id IN (${ids})
      AND status = 'published'
      AND stock_quantity IS NOT NULL
      AND stock_quantity >= CASE id ${caseQty} END
      AND updated_at = CASE id ${caseUpdated} END
      AND NOT EXISTS (SELECT 1 FROM product_orders WHERE checkout_idempotency_token = ?)
      AND (
        SELECT COUNT(*) FROM products p
        WHERE p.id IN (${ids})
          AND p.status = 'published'
          AND p.stock_quantity IS NOT NULL
          AND p.stock_quantity >= CASE p.id ${caseQty} END
          AND p.updated_at = CASE p.id ${caseUpdated} END
      ) = ?
  `).bind(
    ...updateCaseQuantityBindings, operationId, now,
    ...items.map((item) => item.id),
    ...updateCaseQuantityBindings,
    ...updateCaseUpdatedBindings,
    idempotencyToken,
    ...items.map((item) => item.id),
    ...subqueryQuantityBindings,
    ...subqueryUpdatedBindings,
    items.length,
  );
}

function markerCondition(items: Array<{ id: string }>, operationId: string) {
  return {
    sql: `(SELECT COUNT(*) FROM products WHERE id IN (${items.map(() => "?").join(", ")}) AND last_inventory_mutation_id = ?) = ?`,
    bindings: [...items.map((item) => item.id), operationId, items.length],
  };
}

async function loadCheckoutProducts(items: Array<{ productSlug: string; quantity: number }>): Promise<CheckoutProduct[]> {
  const db = await getDatabase();
  const slugs = items.map((item) => item.productSlug);
  const rows = await db.prepare(`
    SELECT id, slug, sku, name, price_npr, stock_quantity, status, updated_at
    FROM products WHERE slug IN (${slugs.map(() => "?").join(", ")})
  `).bind(...slugs).all<ProductForCheckoutRow>();
  return rows.results.map((row) => ({
    id: String(row.id),
    slug: nullableText(row.slug),
    sku: nullableText(row.sku),
    name: String(row.name),
    priceNpr: nullableInteger(row.price_npr),
    stockQuantity: nullableInteger(row.stock_quantity),
    status: String(row.status),
    updatedAt: String(row.updated_at),
  }));
}

export async function adjustProductInventory(
  productId: string,
  input: {
    movementType: "restock" | "damaged" | "missing" | "count_correction";
    quantity: number | null;
    count: number | null;
    reason: string;
    idempotencyKey: string;
  },
  actor: AdminActor,
) {
  const existing = await findInventoryMovementByKey(input.idempotencyKey);
  if (existing) return { kind: "duplicate" as const, movement: existing };
  const db = await getDatabase() as unknown as Database;
  const product = await db.prepare("SELECT id, name, sku, stock_quantity, updated_at FROM products WHERE id = ?").bind(productId).first<Record<string, unknown>>() as Record<string, unknown> | null;
  if (!product) return { kind: "not_found" as const };
  const previous = nullableInteger(product.stock_quantity);
  if (previous === null) throw new Error("Set an initial stock quantity before adjusting this product.");
  const expectedUpdatedAt = String(product.updated_at ?? "");
  if (!expectedUpdatedAt) throw new Error("Unable to verify the current inventory version.");
  const delta = input.movementType === "restock"
    ? input.quantity!
    : input.movementType === "damaged" || input.movementType === "missing"
      ? -input.quantity!
      : input.count! - previous;
  if (delta === 0) throw new Error("The counted stock is already current; no correction was recorded.");
  const now = new Date().toISOString();
  const operationId = crypto.randomUUID();
  const movementId = crypto.randomUUID();
  const batch = await db.batch([
    db.prepare(`
      UPDATE products
      SET stock_quantity = stock_quantity + ?, last_inventory_mutation_id = ?, updated_at = ?
      WHERE id = ? AND updated_at = ? AND stock_quantity IS NOT NULL AND stock_quantity + ? >= 0
        AND NOT EXISTS (SELECT 1 FROM inventory_movements WHERE idempotency_key = ?)
    `).bind(delta, operationId, now, productId, expectedUpdatedAt, delta, input.idempotencyKey),
    db.prepare(`
      INSERT INTO inventory_movements (
        id, product_id, stock_change, previous_stock, resulting_stock, movement_type,
        related_order_id, source_id, admin_user_id, reason, idempotency_key, created_at
      ) SELECT ?, id, ?, stock_quantity - ?, stock_quantity, ?, NULL, NULL, ?, ?, ?, ?
      FROM products WHERE id = ? AND last_inventory_mutation_id = ?
    `).bind(
      movementId, delta, delta, input.movementType, actor.id, input.reason,
      input.idempotencyKey, now, productId, operationId,
    ),
    buildAuditLogInsert(db as never, {
      actor,
      action: inventoryAuditAction(input.movementType),
      entityType: "inventory_movement",
      entityId: movementId,
      previousValues: { stockQuantity: previous },
      newValues: { stockQuantity: previous + delta, stockChange: delta, movementType: input.movementType },
      changedFields: ["stockQuantity"],
      reason: input.reason,
      requestId: input.idempotencyKey,
      createdAt: now,
      conditionalOn: {
        sql: "EXISTS (SELECT 1 FROM inventory_movements WHERE id = ?)",
        bindings: [movementId],
      },
    }),
  ]);
  if (!batch[0]?.meta?.changes || !batch[1]?.meta?.changes) {
    const duplicate = await findInventoryMovementByKey(input.idempotencyKey);
    if (duplicate) return { kind: "duplicate" as const, movement: duplicate };
    return { kind: "conflict" as const, message: "Inventory changed or this adjustment would make stock negative. Refresh and try again." };
  }
  return { kind: "adjusted" as const, movement: (await findInventoryMovementByKey(input.idempotencyKey))! };
}

export async function setInitialProductStock(
  productId: string,
  stockQuantity: number,
  actor: AdminActor,
  idempotencyKey: string,
) {
  const db = await getDatabase() as unknown as Database;
  const product = await db.prepare("SELECT id, stock_quantity FROM products WHERE id = ?").bind(productId).first<{ id: string; stock_quantity: number | null }>();
  if (!product) return { kind: "not_found" as const };
  const duplicate = await db
    .prepare("SELECT id FROM audit_logs WHERE request_id = ? AND action = 'PRODUCT_INITIAL_STOCK_SET'")
    .bind(idempotencyKey)
    .first<{ id: string }>();
  if (duplicate) return { kind: "duplicate" as const };
  if (product.stock_quantity !== null) return { kind: "already_initialized" as const };
  const now = new Date().toISOString();
  const operationId = crypto.randomUUID();
  const movementId = crypto.randomUUID();
  const batch = await db.batch([
    db.prepare(`
      UPDATE products SET stock_quantity = ?, last_inventory_mutation_id = ?, updated_at = ?
      WHERE id = ? AND stock_quantity IS NULL
    `).bind(stockQuantity, operationId, now, productId),
    ...(stockQuantity > 0
      ? [db.prepare(`
          INSERT INTO inventory_movements (
            id, product_id, stock_change, previous_stock, resulting_stock, movement_type,
            related_order_id, source_id, admin_user_id, reason, idempotency_key, created_at
          ) SELECT ?, id, ?, 0, ?, 'initial_stock', NULL, NULL, ?, 'Initial product stock', ?, ?
          FROM products WHERE id = ? AND last_inventory_mutation_id = ?
        `).bind(
          movementId, stockQuantity, stockQuantity, actor.id, idempotencyKey, now, productId, operationId,
        )]
      : []),
    buildAuditLogInsert(db as never, {
      actor,
      action: "PRODUCT_INITIAL_STOCK_SET",
      entityType: "product",
      entityId: productId,
      newValues: { stockQuantity },
      changedFields: ["stockQuantity"],
      requestId: idempotencyKey,
      createdAt: now,
      conditionalOn: {
        sql: "EXISTS (SELECT 1 FROM products WHERE id = ? AND last_inventory_mutation_id = ?)",
        bindings: [productId, operationId],
      },
    }),
  ]);
  if (!batch[0]?.meta?.changes) {
    const replay = await db
      .prepare("SELECT id FROM audit_logs WHERE request_id = ? AND action = 'PRODUCT_INITIAL_STOCK_SET'")
      .bind(idempotencyKey)
      .first<{ id: string }>();
    return replay ? { kind: "duplicate" as const } : { kind: "already_initialized" as const };
  }
  return { kind: "initialized" as const };
}

export async function cancelProductOrder(
  orderId: string,
  reason: string,
  actor: AdminActor,
  idempotencyKey: string,
) {
  const order = await getProductOrder(orderId);
  if (!order) return { kind: "not_found" as const };
  if (order.status === "cancelled" || order.stockRestoredAt) return { kind: "already_cancelled" as const, order };
  if (!canCancelProductOrderStatus(order.status)) {
    throw new Error("Completed orders must be handled through customer returns; cancellation cannot restore the full sale safely.");
  }
  if (!order.items.length) throw new Error("This order has no items to restore.");
  const db = await getDatabase() as unknown as Database;
  const now = new Date().toISOString();
  const operationId = crypto.randomUUID();
  const items = order.items;
  const caseQty = items.map(() => "WHEN ? THEN ?").join(" ");
  const ids = items.map(() => "?").join(", ");
  const marker = markerCondition(items.map((item) => ({ id: item.productId })), operationId);
  const batch = await db.batch([
    db.prepare(`
      UPDATE products
      SET stock_quantity = stock_quantity + CASE id ${caseQty} END,
          last_inventory_mutation_id = ?, updated_at = ?
      WHERE id IN (${ids})
        AND stock_quantity IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM product_orders
          WHERE id = ? AND status <> 'cancelled' AND stock_restored_at IS NULL
        )
        AND (SELECT COUNT(*) FROM products WHERE id IN (${ids})) = ?
    `).bind(
      ...items.flatMap((item) => [item.productId, item.quantity]), operationId, now,
      ...items.map((item) => item.productId), orderId,
      ...items.map((item) => item.productId), items.length,
    ),
    db.prepare(`
      UPDATE product_orders
      SET status = 'cancelled', cancellation_reason = ?, cancelled_at = ?,
          cancelled_by_admin_id = ?, stock_restored_at = ?, stock_restored_by_admin_id = ?,
          last_inventory_mutation_id = ?, updated_at = ?
      WHERE id = ? AND status <> 'cancelled' AND stock_restored_at IS NULL
        AND ${marker.sql}
    `).bind(
      reason, now, actor.id, now, actor.id, operationId, now, orderId, ...marker.bindings,
    ),
    ...items.map((item) => db.prepare(`
      INSERT INTO inventory_movements (
        id, product_id, stock_change, previous_stock, resulting_stock, movement_type,
        related_order_id, source_id, admin_user_id, reason, idempotency_key, created_at
      ) SELECT ?, p.id, ?, p.stock_quantity - ?, p.stock_quantity,
               'order_cancellation_restore', ?, ?, ?, ?, ?, ?
      FROM products p
      WHERE p.id = ? AND p.last_inventory_mutation_id = ?
        AND EXISTS (SELECT 1 FROM product_orders WHERE id = ? AND stock_restored_at = ?)
    `).bind(
      crypto.randomUUID(), item.quantity, item.quantity, orderId, orderId, actor.id,
      reason, `cancel:${orderId}:${item.productId}`, now, item.productId,
      operationId, orderId, now,
    )),
    buildAuditLogInsert(db as never, {
      actor,
      action: "PRODUCT_ORDER_CANCELLED",
      entityType: "product_order",
      entityId: orderId,
      bookingReference: order.publicReference,
      previousValues: { status: order.status, stockRestoredAt: order.stockRestoredAt },
      newValues: { status: "cancelled", stockRestored: true },
      changedFields: ["status", "stockRestoredAt"],
      reason,
      requestId: idempotencyKey,
      createdAt: now,
      conditionalOn: {
        sql: "EXISTS (SELECT 1 FROM product_orders WHERE id = ? AND stock_restored_at = ?)",
        bindings: [orderId, now],
      },
    }),
    buildAuditLogInsert(db as never, {
      actor,
      action: "PRODUCT_STOCK_RESTORED",
      entityType: "product_order",
      entityId: orderId,
      bookingReference: order.publicReference,
      newValues: { productCount: items.length, stockRestored: true },
      changedFields: ["stockRestoredAt"],
      reason,
      requestId: `${idempotencyKey}:stock`,
      createdAt: now,
      conditionalOn: {
        sql: "EXISTS (SELECT 1 FROM product_orders WHERE id = ? AND stock_restored_at = ?)",
        bindings: [orderId, now],
      },
    }),
  ]);
  if (Number(batch[0]?.meta?.changes ?? 0) !== items.length || !batch[1]?.meta?.changes) {
    const latest = await getProductOrder(orderId);
    return latest?.status === "cancelled" || latest?.stockRestoredAt
      ? { kind: "already_cancelled" as const, order: latest }
      : { kind: "conflict" as const, message: "The order changed before it could be cancelled. Refresh and try again." };
  }
  return { kind: "cancelled" as const, order: (await getProductOrder(orderId))! };
}

export async function recordProductOrderReturn(
  orderId: string,
  input: { productId: string; quantity: number; restock: boolean; reason: string; idempotencyKey: string },
  actor: AdminActor,
) {
  const order = await getProductOrder(orderId);
  if (!order) return { kind: "not_found" as const };
  if (order.status !== "completed") throw new Error("Only completed orders can record customer returns.");
  const item = order.items.find((candidate) => candidate.productId === input.productId);
  if (!item) throw new Error("That product is not part of this order.");
  const db = await getDatabase() as unknown as Database;
  const duplicate = await db.prepare("SELECT id FROM product_order_returns WHERE idempotency_key = ?").bind(input.idempotencyKey).first<{ id: string }>();
  if (duplicate) return { kind: "duplicate" as const };
  const now = new Date().toISOString();
  const returnId = crypto.randomUUID();
  const movementId = crypto.randomUUID();
  const operationId = crypto.randomUUID();
  const eligibility = `
    EXISTS (SELECT 1 FROM product_orders WHERE id = ? AND status = 'completed')
    AND EXISTS (SELECT 1 FROM product_order_items WHERE order_id = ? AND product_id = ?)
    AND (SELECT COALESCE(SUM(quantity), 0) FROM product_order_returns WHERE order_id = ? AND product_id = ?) + ? <= ?
    AND NOT EXISTS (SELECT 1 FROM product_order_returns WHERE idempotency_key = ?)
  `;
  const eligibilityBindings = [orderId, orderId, input.productId, orderId, input.productId, input.quantity, item.quantity, input.idempotencyKey];
  const statements: Statement[] = [];
  if (input.restock) {
    statements.push(db.prepare(`
      UPDATE products SET stock_quantity = stock_quantity + ?, last_inventory_mutation_id = ?, updated_at = ?
      WHERE id = ? AND stock_quantity IS NOT NULL AND ${eligibility}
    `).bind(
      input.quantity, operationId, now, input.productId, ...eligibilityBindings,
    ));
  }
  statements.push(db.prepare(`
    INSERT INTO product_order_returns (
      id, order_id, product_id, quantity, restock, reason, admin_user_id, idempotency_key, created_at
    ) SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?
    WHERE ${input.restock
      ? "EXISTS (SELECT 1 FROM products WHERE id = ? AND last_inventory_mutation_id = ?)"
      : eligibility}
  `).bind(
    returnId, orderId, input.productId, input.quantity, input.restock ? 1 : 0,
    input.reason, actor.id, input.idempotencyKey, now,
    ...(input.restock ? [input.productId, operationId] : eligibilityBindings),
  ));
  statements.push(db.prepare(`
    INSERT INTO inventory_movements (
      id, product_id, stock_change, previous_stock, resulting_stock, movement_type,
      related_order_id, source_id, admin_user_id, reason, idempotency_key, created_at
    ) SELECT ?, p.id, ?, p.stock_quantity ${input.restock ? "- ?" : ""}, p.stock_quantity, ?, ?, ?, ?, ?, ?, ?
    FROM products p
    WHERE p.id = ? AND EXISTS (SELECT 1 FROM product_order_returns WHERE id = ?)
  `).bind(
    movementId, input.restock ? input.quantity : 0,
    ...(input.restock ? [input.quantity] : []),
    input.restock ? "customer_return_restock" : "customer_return_not_restock",
    orderId, returnId, actor.id, input.reason, `return:${returnId}`, now,
    input.productId, returnId,
  ));
  statements.push(buildAuditLogInsert(db as never, {
    actor,
    action: input.restock ? "PRODUCT_RETURN_RESTOCKED" : "PRODUCT_RETURN_NOT_RESTOCKED",
    entityType: "product_order",
    entityId: orderId,
    bookingReference: order.publicReference,
    newValues: { productId: input.productId, quantity: input.quantity, restock: input.restock },
    changedFields: ["return"],
    reason: input.reason,
    requestId: input.idempotencyKey,
    createdAt: now,
    conditionalOn: {
      sql: "EXISTS (SELECT 1 FROM product_order_returns WHERE id = ?)",
      bindings: [returnId],
    },
  }));
  const result = await db.batch(statements);
  const returnStatementIndex = input.restock ? 1 : 0;
  if (!result[returnStatementIndex]?.meta?.changes) {
    const replay = await db.prepare("SELECT id FROM product_order_returns WHERE idempotency_key = ?").bind(input.idempotencyKey).first<{ id: string }>();
    if (replay) return { kind: "duplicate" as const };
    throw new Error("The return quantity is no longer valid. Refresh the order and try again.");
  }
  return { kind: "recorded" as const };
}

export type InventoryMovementPage = {
  movements: InventoryMovement[];
  page: number;
  pageSize: number;
  total: number;
};

export async function listInventoryMovements(
  productId?: string,
  options: { page?: number; pageSize?: number } = {},
): Promise<InventoryMovementPage> {
  const db = await getDatabase();
  const page = Number.isSafeInteger(options.page) ? Math.max(1, Math.min(100_000, options.page!)) : 1;
  const pageSize = Number.isSafeInteger(options.pageSize) ? Math.max(10, Math.min(100, options.pageSize!)) : 50;
  const where = productId ? "WHERE m.product_id = ?" : "";
  const values = productId ? [productId] : [];
  const [rows, count] = await Promise.all([
    db.prepare(`
      SELECT m.*, p.name AS product_name, p.sku AS product_sku, o.public_reference AS order_reference,
             u.name AS admin_name
      FROM inventory_movements m
      INNER JOIN products p ON p.id = m.product_id
      LEFT JOIN product_orders o ON o.id = m.related_order_id
      LEFT JOIN admin_users u ON u.id = m.admin_user_id
      ${where}
      ORDER BY m.created_at DESC, m.id DESC
      LIMIT ? OFFSET ?
    `).bind(...values, pageSize, (page - 1) * pageSize).all<Record<string, unknown>>(),
    db.prepare(`SELECT COUNT(*) AS count FROM inventory_movements m ${where}`).bind(...values).first<{ count: number }>(),
  ]);
  return {
    movements: rows.results.map(parseInventoryMovement),
    page,
    pageSize,
    total: Number(count?.count ?? 0),
  };
}

async function findInventoryMovementByKey(idempotencyKey: string): Promise<InventoryMovement | null> {
  const db = await getDatabase();
  const row = await db.prepare(`
    SELECT m.*, p.name AS product_name, p.sku AS product_sku, o.public_reference AS order_reference,
           u.name AS admin_name
    FROM inventory_movements m
    INNER JOIN products p ON p.id = m.product_id
    LEFT JOIN product_orders o ON o.id = m.related_order_id
    LEFT JOIN admin_users u ON u.id = m.admin_user_id
    WHERE m.idempotency_key = ?
  `).bind(idempotencyKey).first<Record<string, unknown>>();
  return row ? parseInventoryMovement(row) : null;
}

function parseInventoryMovement(row: Record<string, unknown>): InventoryMovement {
  const movementType: InventoryMovementType = [
    "initial_stock", "restock", "damaged", "missing", "count_correction", "online_sale",
    "offline_sale", "order_cancellation_restore", "customer_return_restock", "customer_return_not_restock",
  ].includes(String(row.movement_type)) ? String(row.movement_type) as InventoryMovementType : "count_correction";
  return {
    id: String(row.id),
    productId: String(row.product_id),
    productName: String(row.product_name),
    productSku: nullableText(row.product_sku),
    stockChange: Number(row.stock_change),
    previousStock: Number(row.previous_stock),
    resultingStock: Number(row.resulting_stock),
    movementType,
    relatedOrderReference: nullableText(row.order_reference),
    sourceId: nullableText(row.source_id),
    adminName: nullableText(row.admin_name),
    reason: String(row.reason),
    createdAt: String(row.created_at),
  };
}

function inventoryAuditAction(type: string) {
  return type === "restock"
    ? "PRODUCT_RESTOCKED"
    : type === "damaged"
      ? "PRODUCT_DAMAGED_STOCK_RECORDED"
      : type === "missing"
        ? "PRODUCT_MISSING_STOCK_RECORDED"
        : "PRODUCT_STOCK_CORRECTED";
}

function nullableText(value: unknown) {
  const text = typeof value === "string" ? value.trim() : "";
  return text || null;
}
