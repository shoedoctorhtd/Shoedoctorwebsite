import { isEmailAddress } from "./email/address.ts";
import {
  PRODUCT_FULFILLMENT_METHODS,
  PRODUCT_PAYMENT_METHODS,
  PRODUCT_ORDER_STATUSES,
  PRODUCT_PAYMENT_STATUSES,
  PRODUCT_STATUSES,
  type OfflineSaleRequest,
  type ProductInput,
  type ProductOrderRequest,
  type ProductOrderRequestItem,
  type ProductPaymentMethod,
  type ProductOrderStatus,
  type ProductPaymentStatus,
  type ProductStatus,
} from "./product-types.ts";

const MAX_CART_ITEMS = 20;
const MAX_PER_PRODUCT_QUANTITY = 100;

function cleanText(value: unknown, maxLength: number, label: string) {
  if (value !== undefined && value !== null && typeof value !== "string") {
    throw new Error(`${label} must be text.`);
  }
  const text = String(value ?? "").trim().replace(/[\u0000-\u001f\u007f]/gu, " ");
  if (text.length > maxLength) throw new Error(`${label} is too long.`);
  return text;
}

function optionalText(value: unknown, maxLength: number, label: string) {
  return cleanText(value, maxLength, label) || null;
}

function wholeNumber(value: unknown, min: number, max: number, label: string) {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isSafeInteger(number) || number < min || number > max) {
    throw new Error(`${label} must be a whole number between ${min} and ${max}.`);
  }
  return number;
}

export function parseInitialStockQuantity(value: unknown) {
  return wholeNumber(value, 0, 100_000, "Initial stock");
}

export function normalizeProductSku(value: unknown) {
  const raw = cleanText(value, 64, "SKU").toUpperCase();
  if (!raw) return null;
  if (!/^[A-Z0-9][A-Z0-9_-]{1,63}$/u.test(raw)) {
    throw new Error("SKU may use letters, numbers, hyphens and underscores only.");
  }
  return raw;
}

export function normalizeProductSlug(value: unknown) {
  const raw = cleanText(value, 100, "Slug").toLowerCase();
  if (!raw) return null;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(raw)) {
    throw new Error("Slug must use lowercase letters, numbers and single hyphens only.");
  }
  return raw;
}

export function productSlugFromName(name: string) {
  const slug = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "")
    .slice(0, 100)
    .replace(/-+$/u, "");
  return slug || null;
}

export function getMissingProductPublicationFields(input: Pick<
  ProductInput,
  "name" | "sku" | "slug" | "shortDescription" | "priceNpr"
>) {
  const missing: string[] = [];
  if (input.name.trim().length < 2) missing.push("a product name");
  if (!isValidPublicationSku(input.sku)) missing.push("a valid SKU");
  if (!isValidPublicationSlug(input.slug)) missing.push("a valid slug");
  if (!input.shortDescription || input.shortDescription.trim().length < 2) missing.push("short description");
  if (!Number.isSafeInteger(input.priceNpr) || input.priceNpr < 1) missing.push("a positive whole-number NPR price");
  return missing;
}

function isValidPublicationSku(value: string | null) {
  try {
    return (normalizeProductSku(value)?.length ?? 0) >= 2;
  } catch {
    return false;
  }
}

function isValidPublicationSlug(value: string | null) {
  try {
    return (normalizeProductSlug(value)?.length ?? 0) >= 2;
  } catch {
    return false;
  }
}

function joinRequirements(requirements: string[]) {
  if (requirements.length < 2) return requirements[0] ?? "the required catalogue fields";
  if (requirements.length === 2) return `${requirements[0]} and ${requirements[1]}`;
  return `${requirements.slice(0, -1).join(", ")}, and ${requirements.at(-1)}`;
}

export function parseProductInput(value: unknown): ProductInput {
  const input = (value ?? {}) as Record<string, unknown>;
  const name = cleanText(input.name, 120, "Product name");
  const status = cleanText(input.status ?? "draft", 20, "Product status") as ProductStatus;
  if (!PRODUCT_STATUSES.includes(status)) throw new Error("Choose a valid product status.");
  const sku = normalizeProductSku(input.sku);
  const slug = normalizeProductSlug(input.slug) ?? (status === "published" && name.length >= 2 ? productSlugFromName(name) : null);
  const shortDescription = optionalText(input.shortDescription, 320, "Short description");
  const fullDescription = optionalText(input.fullDescription, 5000, "Full description");
  const rawPrice = input.priceNpr;
  const priceNpr = rawPrice === "" || rawPrice === null || rawPrice === undefined
    ? null
    : wholeNumber(rawPrice, 1, 10_000_000, "NPR price");
  const lowStockThreshold = input.lowStockThreshold === "" || input.lowStockThreshold === null || input.lowStockThreshold === undefined
    ? 0
    : wholeNumber(input.lowStockThreshold, 0, 100_000, "Low-stock threshold");
  if (typeof input.featured !== "undefined" && typeof input.featured !== "boolean") {
    throw new Error("Featured must be true or false.");
  }
  if (status === "published") {
    const missing = getMissingProductPublicationFields({ name, sku, slug, shortDescription, priceNpr });
    if (missing.length) {
      throw new Error(`Published products need ${joinRequirements(missing)}.`);
    }
  }
  return {
    name,
    sku,
    slug,
    shortDescription,
    fullDescription,
    priceNpr,
    lowStockThreshold,
    status,
    featured: input.featured === true,
  };
}

function parseIdempotencyToken(value: unknown, label = "Idempotency token") {
  const token = cleanText(value, 160, label);
  if (!/^[A-Za-z0-9_-]{16,160}$/u.test(token)) {
    throw new Error(`${label} is missing or invalid. Please retry from the current page.`);
  }
  return token;
}

/** A 32-byte base64url bearer generated with browser Web Crypto. The server
 * hashes it before persistence and never returns it from a stored order. */
export function parsePaymentAccessToken(value: unknown) {
  const token = cleanText(value, 64, "Payment access token");
  if (!/^[A-Za-z0-9_-]{43}$/u.test(token)) {
    throw new Error("The secure payment link is missing or invalid. Please place the order again.");
  }
  return token;
}

function parseCartItems(value: unknown): ProductOrderRequestItem[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > MAX_CART_ITEMS) {
    throw new Error(`Your cart must contain between 1 and ${MAX_CART_ITEMS} products.`);
  }
  const normalized = new Map<string, number>();
  value.forEach((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new Error(`Cart item ${index + 1} is invalid.`);
    }
    const record = item as Record<string, unknown>;
    const productSlug = normalizeProductSlug(record.productSlug);
    if (!productSlug) {
      throw new Error(`Cart item ${index + 1} product is invalid.`);
    }
    const quantity = wholeNumber(record.quantity, 1, MAX_PER_PRODUCT_QUANTITY, `Cart item ${index + 1} quantity`);
    const total = (normalized.get(productSlug) ?? 0) + quantity;
    if (total > MAX_PER_PRODUCT_QUANTITY) {
      throw new Error("A single product quantity is too high.");
    }
    normalized.set(productSlug, total);
  });
  return [...normalized.entries()].map(([productSlug, quantity]) => ({ productSlug, quantity }));
}

export function parseOnlineProductOrder(value: unknown): ProductOrderRequest {
  const input = (value ?? {}) as Record<string, unknown>;
  // Never accept any browser-calculated price or total, even if it is ignored.
  for (const forbidden of ["price", "unitPrice", "subtotal", "total", "deliveryCharge", "stock", "paymentAmount"]) {
    if (Object.prototype.hasOwnProperty.call(input, forbidden)) {
      throw new Error("Product prices and totals are calculated securely by Shoe Doctor.");
    }
  }
  const customerName = cleanText(input.customerName, 120, "Customer name");
  const phone = cleanText(input.phone, 32, "Phone number");
  const email = optionalText(input.email, 160, "Email address");
  const fulfillmentMethod = cleanText(input.fulfillmentMethod, 20, "Fulfilment method");
  const paymentMethod = cleanText(input.paymentMethod, 20, "Payment method") as ProductPaymentMethod;
  const deliveryAddress = optionalText(input.deliveryAddress, 500, "Delivery address");
  if (customerName.length < 2) throw new Error("Please enter your full name.");
  const phoneDigits = phone.replace(/\D/gu, "");
  if (phoneDigits.length < 7 || phoneDigits.length > 15) throw new Error("Please enter a valid phone number.");
  if (email && !isEmailAddress(email)) throw new Error("Please enter a valid email address.");
  if (!PRODUCT_FULFILLMENT_METHODS.includes(fulfillmentMethod as "delivery" | "collection")) {
    throw new Error("Choose delivery or shop collection.");
  }
  if (!PRODUCT_PAYMENT_METHODS.includes(paymentMethod)) {
    throw new Error("Choose QR online payment or cash on delivery.");
  }
  const paymentAccessToken = paymentMethod === "qr"
    ? parsePaymentAccessToken(input.paymentAccessToken)
    : null;
  if (paymentMethod === "cod" && input.paymentAccessToken !== undefined && input.paymentAccessToken !== null && String(input.paymentAccessToken).trim()) {
    throw new Error("Cash on Delivery does not use a payment access token.");
  }
  if (fulfillmentMethod === "delivery" && !deliveryAddress) {
    throw new Error("Please enter a delivery address.");
  }
  return {
    idempotencyToken: parseIdempotencyToken(input.idempotencyToken),
    customerName,
    phone,
    email,
    fulfillmentMethod: fulfillmentMethod as "delivery" | "collection",
    deliveryAddress: fulfillmentMethod === "delivery" ? deliveryAddress : null,
    customerNote: optionalText(input.customerNote, 1000, "Customer note"),
    paymentMethod,
    paymentAccessToken,
    items: parseCartItems(input.items),
  };
}

export function parsePaymentActionIdempotencyKey(value: unknown, label = "Payment action token") {
  return parseIdempotencyToken(value, label);
}

export function parsePaymentReceiptSubmission(value: unknown) {
  const input = (value ?? {}) as Record<string, unknown>;
  return {
    transactionReference: optionalText(input.transactionReference, 160, "Transaction/reference number"),
    idempotencyKey: parsePaymentActionIdempotencyKey(input.idempotencyKey, "Receipt submission token"),
  };
}

export function parsePaymentRejection(value: unknown) {
  const input = (value ?? {}) as Record<string, unknown>;
  const reason = cleanText(input.reason, 500, "Rejection reason").replace(/\s+/gu, " ");
  if (reason.length < 3) throw new Error("A payment-rejection reason is required.");
  return {
    reason,
    idempotencyKey: parsePaymentActionIdempotencyKey(input.idempotencyKey, "Payment rejection token"),
  };
}

export function parsePaymentApproval(value: unknown) {
  const input = (value ?? {}) as Record<string, unknown>;
  if (input.confirmation !== true) throw new Error("Confirm the payment approval before continuing.");
  return { idempotencyKey: parsePaymentActionIdempotencyKey(input.idempotencyKey, "Payment approval token") };
}

export function parseCodPaymentCollection(value: unknown) {
  const input = (value ?? {}) as Record<string, unknown>;
  if (input.confirmation !== true) throw new Error("Confirm the COD collection before continuing.");
  return {
    amountCollected: wholeNumber(input.amountCollected, 0, 10_000_000, "Amount collected"),
    idempotencyKey: parsePaymentActionIdempotencyKey(input.idempotencyKey, "COD collection token"),
  };
}

export function parseOfflineSale(value: unknown): OfflineSaleRequest {
  const input = (value ?? {}) as Record<string, unknown>;
  const customerName = optionalText(input.customerName, 120, "Customer name");
  const phone = optionalText(input.phone, 32, "Phone number");
  if (phone) {
    const phoneDigits = phone.replace(/\D/gu, "");
    if (phoneDigits.length < 7 || phoneDigits.length > 15) throw new Error("Enter a valid phone number.");
  }
  const paymentStatus = cleanText(input.paymentStatus ?? "pending", 20, "Payment status") as ProductPaymentStatus;
  if (!PRODUCT_PAYMENT_STATUSES.includes(paymentStatus)) throw new Error("Choose a valid payment status.");
  return {
    idempotencyToken: parseIdempotencyToken(input.idempotencyToken),
    customerName,
    phone,
    paymentStatus,
    items: parseCartItems(input.items),
    note: optionalText(input.note, 1000, "Sale note"),
  };
}

export function parseProductOrderStatus(value: unknown): ProductOrderStatus {
  const status = cleanText(value, 20, "Order status") as ProductOrderStatus;
  if (!PRODUCT_ORDER_STATUSES.includes(status)) throw new Error("Choose a valid order status.");
  return status;
}

export function parseProductPaymentStatus(value: unknown): ProductPaymentStatus {
  const status = cleanText(value, 20, "Payment status") as ProductPaymentStatus;
  if (!PRODUCT_PAYMENT_STATUSES.includes(status)) throw new Error("Choose a valid payment status.");
  return status;
}

export function parseInventoryAdjustment(value: unknown) {
  const input = (value ?? {}) as Record<string, unknown>;
  const movementType = cleanText(input.movementType, 40, "Movement type");
  if (!["restock", "damaged", "missing", "count_correction"].includes(movementType)) {
    throw new Error("Choose restock, damaged, missing, or counted-stock correction.");
  }
  const typedMovementType = movementType as "restock" | "damaged" | "missing" | "count_correction";
  const reason = cleanText(input.reason, 500, "Reason").replace(/\s+/gu, " ");
  if (reason.length < 3) throw new Error("Reason must contain at least three characters.");
  const idempotencyKey = parseIdempotencyToken(input.idempotencyKey, "Inventory action token");
  if (typedMovementType === "count_correction") {
    return {
      movementType: typedMovementType,
      count: wholeNumber(input.count, 0, 100_000, "Counted stock"),
      quantity: null,
      reason,
      idempotencyKey,
    } as const;
  }
  return {
    movementType: typedMovementType,
    quantity: wholeNumber(input.quantity, 1, 100_000, "Quantity"),
    count: null,
    reason,
    idempotencyKey,
  } as const;
}

export function parseInitialProductStock(value: unknown) {
  const input = (value ?? {}) as Record<string, unknown>;
  return {
    stockQuantity: parseInitialStockQuantity(input.initialStock),
    idempotencyKey: parseIdempotencyToken(input.idempotencyKey, "Initial-stock token"),
  } as const;
}

export function parseOrderCancellation(value: unknown) {
  const input = (value ?? {}) as Record<string, unknown>;
  const reason = cleanText(input.reason, 500, "Cancellation reason").replace(/\s+/gu, " ");
  if (reason.length < 3) throw new Error("Cancellation reason must contain at least three characters.");
  return { reason, idempotencyKey: parseIdempotencyToken(input.idempotencyKey, "Cancellation token") };
}

export function parseOrderReturn(value: unknown) {
  const input = (value ?? {}) as Record<string, unknown>;
  const productId = cleanText(input.productId, 160, "Returned product");
  if (!/^[A-Za-z0-9_-]{8,160}$/u.test(productId)) throw new Error("Returned product is invalid.");
  if (typeof input.restock !== "boolean") throw new Error("Choose whether the returned product can be restocked.");
  const reason = cleanText(input.reason, 500, "Return note").replace(/\s+/gu, " ");
  if (reason.length < 3) throw new Error("Return note must contain at least three characters.");
  return {
    productId,
    quantity: wholeNumber(input.quantity, 1, MAX_PER_PRODUCT_QUANTITY, "Return quantity"),
    restock: input.restock,
    reason,
    idempotencyKey: parseIdempotencyToken(input.idempotencyKey, "Return token"),
  };
}

export function parsePage(value: string | null, fallback = 1) {
  const parsed = Number(value ?? fallback);
  return Number.isSafeInteger(parsed) ? Math.max(1, Math.min(100_000, parsed)) : fallback;
}
