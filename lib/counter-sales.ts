import { getDatabase } from "./data";
import { listAdminProductPage, type ProductListPage } from "./product-data";
import { getProductOrder, listProductOrders } from "./product-order-data";
import { parseAuditLog, type AuditLog } from "./audit";
import type { ProductOrder } from "./product-types";

type Statement = {
  bind(...values: unknown[]): Statement;
  first<T>(): Promise<T | null>;
  all<T>(): Promise<{ results: T[] }>;
};

type CounterDatabase = { prepare(sql: string): Statement };

export type CounterInventory = ProductListPage & {
  summary: { inStock: number; lowStock: number; outOfStock: number; salesToday: number };
};
export type CounterHistory = { orders: Array<ProductOrder & { recordedBy: string }>; page: number; pageSize: number; total: number };
export type CounterSaleDetail = {
  order: ProductOrder; audit: AuditLog[]; hasReturns: boolean;
  movements: Array<{ productName: string; previousStock: number; stockChange: number; resultingStock: number; movementType: string; createdAt: string }>;
};

export async function getCounterInventory(search = "", page = 1): Promise<CounterInventory> {
  const db = await getDatabase() as unknown as CounterDatabase;
  const [catalogue, summary] = await Promise.all([
    listAdminProductPage({ status: "published", search }, { page, pageSize: 30 }),
    db.prepare(`SELECT
      (SELECT COUNT(*) FROM products WHERE status = 'published' AND stock_quantity > 0) AS inStock,
      (SELECT COUNT(*) FROM products WHERE status = 'published' AND stock_quantity > 0 AND stock_quantity <= low_stock_threshold) AS lowStock,
      (SELECT COUNT(*) FROM products WHERE status = 'published' AND stock_quantity = 0) AS outOfStock,
      (SELECT COUNT(*) FROM product_orders WHERE channel = 'offline' AND status <> 'cancelled'
        AND date(created_at, '+5 hours', '+45 minutes') = date('now', '+5 hours', '+45 minutes')) AS salesToday`)
      .first<{ inStock: number; lowStock: number; outOfStock: number; salesToday: number }>(),
  ]);
  return {
    ...catalogue,
    // This catalogue contains published products only. Use their public image
    // URLs so counter-only staff do not need access to draft product management.
    products: catalogue.products.map((product) => ({ ...product, images: product.images.map((image) => ({
      ...image, url: `/api/products/images/${encodeURIComponent(image.id)}`,
    })) })),
    summary: summary ?? { inStock: 0, lowStock: 0, outOfStock: 0, salesToday: 0 },
  };
}

export async function listCounterSales(page = 1): Promise<CounterHistory> {
  const result = await listProductOrders({ channel: "offline", page, pageSize: 20 });
  const db = await getDatabase() as unknown as CounterDatabase;
  const ids = result.orders.map((order) => order.id);
  const records = ids.length ? await db.prepare(`SELECT entity_id, administrator_name_snapshot AS name
    FROM audit_logs WHERE entity_type = 'product_order'
      AND action IN ('COUNTER_SALE_CREATED', 'PRODUCT_OFFLINE_SALE_RECORDED')
      AND entity_id IN (${ids.map(() => "?").join(",")})`).bind(...ids).all<{ entity_id: string; name: string }>() : { results: [] };
  const actors = new Map<string, string>(records.results.map((row: { entity_id: string; name: string }) => [row.entity_id, row.name]));
  return { ...result, orders: result.orders.map((order) => ({ ...order, recordedBy: actors.get(order.id) ?? "Legacy / unknown" })) };
}

export async function getCounterSale(id: string): Promise<CounterSaleDetail | null> {
  const order = await getProductOrder(id);
  if (!order || order.channel !== "offline") return null;
  const db = await getDatabase() as unknown as CounterDatabase;
  const [audit, movements, returns] = await Promise.all([
    db.prepare(`SELECT a.*, o.delivery_status AS owner_alert_status, o.id AS owner_alert_id,
      o.lease_expires_at AS owner_alert_lease_expires_at FROM audit_logs a
      LEFT JOIN owner_alert_events o ON o.audit_log_id = a.id
      WHERE a.entity_type = 'product_order' AND a.entity_id = ? ORDER BY a.created_at, a.id`)
      .bind(id).all<Record<string, unknown>>(),
    db.prepare(`SELECT i.product_name_snapshot AS productName, m.previous_stock AS previousStock,
      m.stock_change AS stockChange, m.resulting_stock AS resultingStock, m.movement_type AS movementType,
      m.created_at AS createdAt FROM inventory_movements m JOIN product_order_items i
      ON i.order_id = m.related_order_id AND i.product_id = m.product_id
      WHERE m.related_order_id = ? ORDER BY m.created_at, m.id`).bind(id)
      .all<{ productName: string; previousStock: number; stockChange: number; resultingStock: number; movementType: string; createdAt: string }>(),
    db.prepare("SELECT COUNT(*) AS count FROM product_order_returns WHERE order_id = ?").bind(id).first<{ count: number }>(),
  ]);
  return { order, audit: audit.results.map(parseAuditLog), movements: movements.results, hasReturns: Number(returns?.count) > 0 };
}
