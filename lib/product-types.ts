export const PRODUCT_STATUSES = ["draft", "published", "archived"] as const;
export const PRODUCT_CATEGORIES = [
  "quick_clean",
  "cleaning_kits",
  "suede_nubuck",
  "protection",
  "storage",
  "restoration",
  "accessories",
] as const;
export const PRODUCT_BADGES = ["doctors_pick"] as const;
export const PRODUCT_ORDER_STATUSES = [
  "pending",
  "awaiting_payment",
  "payment_review",
  "confirmed",
  "processing",
  "completed",
  "cancelled",
] as const;
export const PRODUCT_PAYMENT_STATUSES = [
  "pending",
  "unpaid",
  "submitted",
  "rejected",
  "cod_pending",
  "partial",
  "paid",
  "refunded",
] as const;
export const PRODUCT_PAYMENT_METHODS = ["qr", "cod"] as const;
export const PRODUCT_ORDER_CHANNELS = ["online", "offline"] as const;
export const PRODUCT_FULFILLMENT_METHODS = ["delivery", "collection"] as const;

export type ProductStatus = (typeof PRODUCT_STATUSES)[number];
export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];
export type ProductBadge = (typeof PRODUCT_BADGES)[number];
export type ProductOrderStatus = (typeof PRODUCT_ORDER_STATUSES)[number];
export type ProductPaymentStatus = (typeof PRODUCT_PAYMENT_STATUSES)[number];
export type ProductPaymentMethod = (typeof PRODUCT_PAYMENT_METHODS)[number];
export type ProductOrderChannel = (typeof PRODUCT_ORDER_CHANNELS)[number];
export type ProductFulfillmentMethod = (typeof PRODUCT_FULFILLMENT_METHODS)[number];

export type ProductImage = {
  id: string;
  productId: string;
  url: string;
  contentType: "image/jpeg" | "image/png" | "image/webp";
  altText: string | null;
  isPrimary: boolean;
  sortOrder: number;
  createdAt: string;
};

/**
 * Optional, admin-authored product facts. Public components must omit empty
 * values rather than infer material, safety, or SEO claims.
 */
export type ProductDetails = {
  valueProposition: string | null;
  keyBenefits: string[];
  bestFor: string[];
  suitableMaterials: string[];
  materialsToAvoid: string[];
  howToUse: string[];
  warnings: string[];
  packSize: string | null;
  brand: string | null;
  careInstructions: string[];
  /** Undefined means an older client did not submit this newer optional field. */
  doctorsAdvice?: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
};

export function emptyProductDetails(): ProductDetails {
  return {
    valueProposition: null,
    keyBenefits: [],
    bestFor: [],
    suitableMaterials: [],
    materialsToAvoid: [],
    howToUse: [],
    warnings: [],
    packSize: null,
    brand: null,
    careInstructions: [],
    doctorsAdvice: null,
    seoTitle: null,
    seoDescription: null,
  };
}

export type Product = {
  id: string;
  sku: string | null;
  slug: string | null;
  name: string;
  shortDescription: string | null;
  fullDescription: string | null;
  category: ProductCategory | null;
  priceNpr: number | null;
  compareAtPriceNpr: number | null;
  stockQuantity: number | null;
  lowStockThreshold: number;
  status: ProductStatus;
  featured: boolean;
  badge: ProductBadge | null;
  details: ProductDetails;
  createdAt: string;
  updatedAt: string;
  images: ProductImage[];
};

export type ProductCard = Pick<
  Product,
  "slug" | "name" | "shortDescription" | "category" | "priceNpr" | "compareAtPriceNpr" | "stockQuantity" | "lowStockThreshold" | "badge"
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
  /** Undefined preserves values for a stale admin form during a rolling deploy. */
  category?: ProductCategory | null;
  priceNpr: number | null;
  /** Undefined preserves values for a stale admin form during a rolling deploy. */
  compareAtPriceNpr?: number | null;
  lowStockThreshold: number;
  status: ProductStatus;
  featured: boolean;
  /** Undefined preserves values for a stale admin form during a rolling deploy. */
  badge?: ProductBadge | null;
  /** Undefined preserves values for a stale admin form during a rolling deploy. */
  details?: ProductDetails;
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
  paymentMethod: ProductPaymentMethod | null;
  paymentStatus: ProductPaymentStatus;
  paymentAmount: number;
  paymentSubmittedAt: string | null;
  paymentVerifiedAt: string | null;
  paymentVerifiedByAdminId: string | null;
  paymentRejectionReason: string | null;
  codCollectedAt: string | null;
  codCollectedByAdminId: string | null;
  cancellationReason: string | null;
  cancelledAt: string | null;
  stockRestoredAt: string | null;
  createdByAdminId: string | null;
  stockCommittedAt: string | null;
  createdAt: string;
  updatedAt: string;
  items: ProductOrderItem[];
};

export type ProductPaymentReceiptDeliveryStatus =
  | "sending"
  | "email_failed"
  | "emailed"
  | "verified"
  | "rejected";

export type ProductPaymentReceipt = {
  id: string;
  orderId: string;
  originalDisplayFilename: string;
  attachmentFilename: string;
  contentType: "image/jpeg" | "image/png" | "image/webp" | "application/pdf";
  byteSize: number;
  sha256Checksum: string;
  transactionReference: string | null;
  emailDeliveryStatus: ProductPaymentReceiptDeliveryStatus;
  gmailMessageId: string | null;
  submittedAt: string | null;
  verifiedAt: string | null;
  verifyingAdminId: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
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
  paymentMethod: ProductPaymentMethod;
  /** The browser creates this 256-bit bearer token and the server only stores its hash. */
  paymentAccessToken: string | null;
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
