/** Shared, dependency-free catalogue for server guards and administrator UI. */
export const ADMIN_PERMISSION_GROUPS = [
  { label: "Bookings", permissions: [
    { key: "dashboard", label: "Dashboard", description: "Overview of your assigned modules." },
    { key: "bookings", label: "Booking Management", description: "Bookings, customer details, pair status and operational notes." },
    { key: "counter_booking", label: "Counter Booking", description: "Create walk-in and counter service bookings." },
  ] },
  { label: "Products", permissions: [
    { key: "counter_inventory", label: "Counter Product Inventory", description: "Counter catalogue, sales history and sale details." },
    { key: "record_offline_sales", label: "Record Counter Sales", description: "Sell products from shared stock at the counter." },
    { key: "view_products", label: "Product Management", description: "Open the product catalogue and view product details." },
    { key: "manage_products", label: "Create / Edit / Publish Products" },
    { key: "change_product_prices", label: "Change Product Prices" },
    { key: "manage_product_images", label: "Manage Product Images" },
    { key: "view_inventory", label: "Product Inventory / Stock Management", description: "View stock balances and inventory history." },
    { key: "adjust_inventory", label: "Adjust Product Stock" },
  ] },
  { label: "Business", permissions: [
    { key: "view_product_orders", label: "Orders", description: "View product orders and their customer details." },
    { key: "manage_product_orders", label: "Manage Orders / Returns" },
    { key: "cancel_product_orders", label: "Cancel Orders / Reverse Counter Sales" },
    { key: "verify_product_payments", label: "Verify Product Payments" },
    { key: "services", label: "Services & Pricing", description: "Manage the existing website service menu." },
    { key: "donations", label: "Donations & Community Content", description: "Donation requests, drives, impact statistics, restoration stories and website updates." },
  ] },
  { label: "Administration", permissions: [
    { key: "notifications", label: "Retry Notifications", description: "Retry delivery from assigned bookings, donations or activity screens." },
    { key: "audit_logs", label: "Admin Activity / Audit Logs", description: "View all administrator activity and its recorded business details." },
    { key: "admin_management", label: "Admin Management", description: "View administrator accounts. Only Super Admins may create accounts, change access or roles, and reset accounts." },
  ] },
] as const;

export type AdminPermission = (typeof ADMIN_PERMISSION_GROUPS)[number]["permissions"][number]["key"];
export const ADMIN_PERMISSIONS: readonly AdminPermission[] = ADMIN_PERMISSION_GROUPS.flatMap((group) => group.permissions.map((permission) => permission.key));
export const PRODUCT_ADMIN_PERMISSIONS = ["view_products", "manage_products", "change_product_prices", "manage_product_images", "view_inventory", "adjust_inventory", "record_offline_sales", "view_product_orders", "manage_product_orders", "cancel_product_orders", "verify_product_payments"] as const;
export type ProductAdminPermission = (typeof PRODUCT_ADMIN_PERMISSIONS)[number];

export function isAdminPermission(value: unknown): value is AdminPermission {
  return typeof value === "string" && (ADMIN_PERMISSIONS as readonly string[]).includes(value);
}

export function parseAdminPermissions(value: unknown): AdminPermission[] {
  if (!Array.isArray(value) || value.some((key) => !isAdminPermission(key))) {
    throw new Error("Choose only valid access permissions.");
  }
  return ADMIN_PERMISSIONS.filter((key) => value.includes(key));
}

export function permissionLabel(key: string) {
  return ADMIN_PERMISSION_GROUPS.flatMap((group) => [...group.permissions]).find((permission) => permission.key === key)?.label ?? key;
}

/** An action cannot bypass a revoked module by calling its endpoint directly. */
export const ADMIN_ACTION_MODULES: Partial<Record<AdminPermission, readonly AdminPermission[]>> = {
  manage_products: ["view_products"],
  change_product_prices: ["view_products"],
  manage_product_images: ["view_products"],
  adjust_inventory: ["view_inventory"],
  manage_product_orders: ["view_product_orders"],
  verify_product_payments: ["view_product_orders"],
  cancel_product_orders: ["view_product_orders", "counter_inventory"],
  record_offline_sales: ["counter_inventory", "view_product_orders"],
  notifications: ["bookings", "donations", "audit_logs"],
};

export function hasAdminPermission(user: { role: string; permissions?: readonly AdminPermission[] }, key: AdminPermission) {
  if (user.role === "super_admin") return true;
  const modules = ADMIN_ACTION_MODULES[key];
  return Boolean(user.permissions?.includes(key)) && (!modules || modules.some((module) => user.permissions?.includes(module)));
}

export function toggleAdminPermission(value: readonly AdminPermission[], key: AdminPermission, checked: boolean): AdminPermission[] {
  const selected = new Set(value);
  if (checked) {
    selected.add(key);
    const modules = ADMIN_ACTION_MODULES[key];
    // Notification access is useful only within an independently selected module.
    if (key !== "notifications" && modules && !modules.some((module) => selected.has(module))) selected.add(modules[0]);
  } else {
    selected.delete(key);
    for (const action of ADMIN_PERMISSIONS) {
      const modules = ADMIN_ACTION_MODULES[action];
      if (modules?.includes(key) && !modules.some((module) => selected.has(module))) selected.delete(action);
    }
  }
  return ADMIN_PERMISSIONS.filter((permission) => selected.has(permission));
}

/** null means an account-only screen; undefined is an unknown, denied route. */
export function adminPagePermission(href: string): AdminPermission | "super_admin" | null | undefined {
  const path = href.split(/[?#]/u)[0].replace(/\/+$/u, "");
  if (["/admin/login", "/admin/change-password", "/admin/access-denied"].includes(path)) return null;
  if (path === "/admin") return "dashboard";
  if (path === "/admin/bookings/new") return "counter_booking";
  if (path === "/admin/bookings" || path.startsWith("/admin/bookings/")) return "bookings";
  if (path === "/admin/services") return "services";
  if (path === "/admin/products" || path.startsWith("/admin/products/")) return "view_products";
  if (path === "/admin/inventory") return "view_inventory";
  if (path === "/admin/product-orders" || path.startsWith("/admin/product-orders/")) return "view_product_orders";
  if (path === "/admin/counter-inventory" || path.startsWith("/admin/counter-inventory/")) return "counter_inventory";
  if (path === "/admin/csr-donations") return "donations";
  if (path === "/admin/activity") return "audit_logs";
  if (path === "/admin/users") return "admin_management";
  if (path === "/admin/product-access" || path === "/admin/deleted-bookings") return "super_admin";
  return undefined;
}

export function canAccessAdminPath(user: { role: string; permissions?: readonly AdminPermission[] }, href: string) {
  const permission = adminPagePermission(href);
  if (permission === null || user.role === "super_admin") return true;
  return permission !== undefined && permission !== "super_admin" && hasAdminPermission(user, permission);
}

export const ADMIN_MODULE_LINKS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/bookings", label: "Bookings" },
  { href: "/admin/bookings/new", label: "Counter Booking" },
  { href: "/admin/counter-inventory", label: "Counter Product Inventory" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/inventory", label: "Product Inventory" },
  { href: "/admin/product-orders", label: "Orders" },
  { href: "/admin/services", label: "Services & Pricing" },
  { href: "/admin/csr-donations", label: "Donations & Community" },
  { href: "/admin/activity", label: "Admin Activity" },
  { href: "/admin/users", label: "Admin Management" },
  { href: "/admin/deleted-bookings", label: "Deleted Bookings" },
] as const;

export function adminLandingPath(user: { role: string; permissions?: readonly AdminPermission[] }) {
  return ADMIN_MODULE_LINKS.find((link) => canAccessAdminPath(user, link.href))?.href ?? "/admin/access-denied";
}
