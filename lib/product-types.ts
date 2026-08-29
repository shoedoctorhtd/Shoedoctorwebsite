export const PRODUCT_STATUSES = ["draft", "published", "archived"] as const;
export const PRODUCT_ORDER_STATUSES = [
  "pending",
  "confirmed",
  "processing",
  "completed",
  "cancelled",
] as const;
export const PRODUCT_PAYMENT_STATUSES = [
  "pending",
  "unpaid",
  "partial",
  "paid",
  "refunded",
] as const;
export const PRODUCT_ORDER_CHANNELS = ["online", "offline"] as const;
export const PRODUCT_FULFILLMENT_METHODS = ["delivery", "collection"] as const;

export type ProductStatus = (typeof PRODUCT_STATUSES)[number];
export type ProductOrderStatus = (typeof PRODUCT_ORDER_STATUSES)[number];
export type ProductPaymentStatus = (typeof PRODUCT_PAYMENT_STATUSES)[number];
export type ProductOrderChannel = (typeof PRODUCT_ORDER_CHANNELS)[number];
export type ProductFulfillmentMethod = (typeof PRODUCT_FULFILLMENT_METHODS)[number];

export type ProductImage = {
  id: string;
  productId: string;
  url: string;
  contentType: "image/jpeg" | "image/png" | "image/webp";
  isPrimary: boolean;
  sortOrder: number;
  createdAt: string;
};

export type Product = {
  id: string;
  sku: string | null;
  slug: string | null;
  name: string;
  shortDescription: string | null;
  fullDescription: string | null;
  priceNpr: number | null;
  stockQuantity: number | null;
  lowStockThreshold: number;
  status: ProductStatus;
  featured: boolean;
  createdAt: string;
  updatedAt: string;
  images: ProductImage[];
};

export type ProductCard = Pick<
  Product,
  "slug" | "name" | "shortDescription" | "priceNpr" | "stockQuantity" | "lowStockThreshold"
> & {
  primaryImage: ProductImage | null;
  isLowStock: boolean;
  isOutOfStock: boolean;
};

export type ProductInput = {
  name: string;
  sku: string | null;
  slug: string | null;
  shortDescription: string | null;
  fullDescription: string | null;
  priceNpr: number | null;
  lowStockThreshold: number;
  status: ProductStatus;
  featured: boolean;
};

export type ProductOrderItem = {
  id: string;
  productId: string;
  sku: string;
  productName: string;
  unitPriceNpr: number;
  quantity: number;
  lineTotalNpr: number;
};

export type ProductOrder = {
  id: string;
  publicReference: string;
  channel: ProductOrderChannel;
  customerName: string | null;
  customerPhone: string | null;
  customerEmail: string | null;
  fulfillmentMethod: ProductFulfillmentMethod;
  deliveryAddress: string | null;
  customerNote: string | null;
  subtotal: number;
  deliveryCharge: number;
  total: number;
  status: ProductOrderStatus;
  paymentStatus: ProductPaymentStatus;
  cancellationReason: string | null;
  cancelledAt: string | null;
  stockRestoredAt: string | null;
  createdByAdminId: string | null;
  createdAt: string;
  updatedAt: string;
  items: ProductOrderItem[];
};

export type InventoryMovementType =
  | "initial_stock"
  | "restock"
  | "damaged"
  | "missing"
  | "count_correction"
  | "online_sale"
  | "offline_sale"
  | "order_cancellation_restore"
  | "customer_return_restock"
  | "customer_return_not_restock";

export type InventoryMovement = {
  id: string;
  productId: string;
  productName: string;
  productSku: string | null;
  stockChange: number;
  previousStock: number;
  resultingStock: number;
  movementType: InventoryMovementType;
  relatedOrderReference: string | null;
  sourceId: string | null;
  adminName: string | null;
  reason: string;
  createdAt: string;
};

/** Public checkout references a public slug, never an internal D1 id. */
export type ProductOrderRequestItem = { productSlug: string; quantity: number };

export type ProductOrderRequest = {
  idempotencyToken: string;
  customerName: string;
  phone: string;
  email: string | null;
  fulfillmentMethod: ProductFulfillmentMethod;
  deliveryAddress: string | null;
  customerNote: string | null;
  items: ProductOrderRequestItem[];
};

export type OfflineSaleRequest = {
  idempotencyToken: string;
  customerName: string | null;
  phone: string | null;
  paymentStatus: ProductPaymentStatus;
  items: ProductOrderRequestItem[];
  note: string | null;
};

export type ProductListFilters = {
  search?: string | null;
  status?: ProductStatus | null;
  stock?: "in_stock" | "low_stock" | "out_of_stock" | null;
};
