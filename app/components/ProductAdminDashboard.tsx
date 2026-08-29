"use client";

/* eslint-disable @next/next/no-img-element */

import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import type { Product, ProductInput } from "@/lib/product-types";
import styles from "./ProductAdmin.module.css";

type Capabilities = {
  canManage: boolean;
  canChangePrice: boolean;
  canManageImages: boolean;
  canAdjustInventory: boolean;
};

const emptyInput: ProductInput = {
  name: "",
  sku: null,
  slug: null,
  shortDescription: null,
  fullDescription: null,
  priceNpr: null,
  lowStockThreshold: 0,
  status: "draft",
  featured: false,
};

function productToInput(product: Product): ProductInput {
  return {
    name: product.name,
    sku: product.sku,
    slug: product.slug,
    shortDescription: product.shortDescription,
    fullDescription: product.fullDescription,
    priceNpr: product.priceNpr,
    lowStockThreshold: product.lowStockThreshold,
    status: product.status,
    featured: product.featured,
  };
}

export default function ProductAdminDashboard({ initialProducts, capabilities }: { initialProducts: Product[]; capabilities: Capabilities }) {
  const [products, setProducts] = useState(initialProducts);
  const [editing, setEditing] = useState<Product | null>(null);
  const [input, setInput] = useState<ProductInput>(emptyInput);
  const [initialStock, setInitialStock] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => products.filter((product) => {
    const needle = search.trim().toLowerCase();
    if (needle && ![product.name, product.sku ?? "", product.slug ?? ""].some((value) => value.toLowerCase().includes(needle))) return false;
    if (statusFilter !== "all" && product.status !== statusFilter) return false;
    if (stockFilter === "in_stock" && !(product.stockQuantity !== null && product.stockQuantity > product.lowStockThreshold)) return false;
    if (stockFilter === "low_stock" && !(product.stockQuantity !== null && product.stockQuantity > 0 && product.stockQuantity <= product.lowStockThreshold)) return false;
    if (stockFilter === "out_of_stock" && product.stockQuantity !== 0) return false;
    return true;
  }), [products, search, statusFilter, stockFilter]);

  function change<K extends keyof ProductInput>(key: K, value: ProductInput[K]) {
    setInput((current) => ({ ...current, [key]: value }));
  }

  async function reload() {
    const response = await fetch("/api/admin/products");
    const result = await response.json() as { products?: Product[]; message?: string };
    if (!response.ok || !result.products) throw new Error(result.message ?? "Unable to refresh products.");
    setProducts(result.products);
    return result.products;
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!capabilities.canManage) return;
    setBusy(true); setError(null); setNotice(null);
    try {
      const body = {
        ...input,
        sku: input.sku || null,
        slug: input.slug || null,
        shortDescription: input.shortDescription || null,
        fullDescription: input.fullDescription || null,
        initialStock: editing || !capabilities.canAdjustInventory ? undefined : initialStock,
      };
      const response = await fetch(editing ? `/api/admin/products/${encodeURIComponent(editing.id)}` : "/api/admin/products", {
        method: editing ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json() as { product?: Product; message?: string };
      if (!response.ok || !result.product) throw new Error(result.message ?? "Unable to save product.");
      const updatedProducts = await reload();
      const updated = updatedProducts.find((product) => product.id === result.product!.id) ?? result.product;
      setEditing(updated);
      setInput(productToInput(updated));
      setInitialStock("");
      setNotice(editing ? "Product updated." : "Draft product created. Upload an image and complete the required fields before publishing.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to save product.");
    } finally { setBusy(false); }
  }

  async function archive(product: Product) {
    if (!window.confirm(`Archive ${product.name}? It will remain in historical orders and cannot be publicly purchased.`)) return;
    setBusy(true); setError(null);
    try {
      const response = await fetch(`/api/admin/products/${encodeURIComponent(product.id)}`, { method: "DELETE" });
      const result = await response.json() as { message?: string };
      if (!response.ok) throw new Error(result.message ?? "Unable to archive product.");
      await reload();
      if (editing?.id === product.id) { setEditing(null); setInput(emptyInput); }
      setNotice("Product archived. Historical orders were preserved.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to archive product."); }
    finally { setBusy(false); }
  }

  async function uploadImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !editing || !capabilities.canManageImages) return;
    setBusy(true); setError(null);
    try {
      const form = new FormData();
      form.set("image", file);
      form.set("makePrimary", editing.images.length === 0 ? "true" : "false");
      const response = await fetch(`/api/admin/products/${encodeURIComponent(editing.id)}/images`, { method: "POST", body: form });
      const result = await response.json() as { message?: string };
      if (!response.ok) throw new Error(result.message ?? "Unable to upload image.");
      const updated = (await reload()).find((product) => product.id === editing.id) ?? null;
      setEditing(updated);
      if (updated) setInput(productToInput(updated));
      setNotice("Product image uploaded.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to upload image."); }
    finally { event.target.value = ""; setBusy(false); }
  }

  async function updateImage(imageId: string, payload: Record<string, unknown>) {
    if (!editing) return;
    setBusy(true); setError(null);
    try {
      const response = await fetch(`/api/admin/products/${encodeURIComponent(editing.id)}/images/${encodeURIComponent(imageId)}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json() as { message?: string };
      if (!response.ok) throw new Error(result.message ?? "Unable to update image.");
      const updated = (await reload()).find((product) => product.id === editing.id) ?? null;
      setEditing(updated); if (updated) setInput(productToInput(updated));
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to update image."); }
    finally { setBusy(false); }
  }

  async function deleteImage(imageId: string) {
    if (!editing || !window.confirm("Remove this product image?")) return;
    setBusy(true); setError(null);
    try {
      const response = await fetch(`/api/admin/products/${encodeURIComponent(editing.id)}/images/${encodeURIComponent(imageId)}`, { method: "DELETE" });
      const result = await response.json() as { message?: string };
      if (!response.ok) throw new Error(result.message ?? "Unable to delete image.");
      const updated = (await reload()).find((product) => product.id === editing.id) ?? null;
      setEditing(updated); if (updated) setInput(productToInput(updated));
      setNotice("Product image removed.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to delete image."); }
    finally { setBusy(false); }
  }

  return <main className={styles.shell}>
    <nav className={styles.nav} aria-label="Product administration"><Link href="/admin">Dashboard</Link><Link href="/admin/product-orders">Product orders</Link><Link href="/admin/inventory">Inventory</Link></nav>
    <section className={styles.intro}><p className="section-kicker">Shop management</p><h1>PRODUCTS</h1><p>Add drafts without invented data, then upload product images, set initial stock, and publish only when the catalogue record is complete.</p></section>
    {notice ? <p className={styles.notice} role="status">{notice}</p> : null}
    {error ? <p className={`${styles.notice} ${styles.error}`} role="alert">{error}</p> : null}
    {capabilities.canManage ? <section className={styles.panel}>
      <div className={styles.panelHead}><h2>{editing ? `Edit ${editing.name}` : "Add a product"}</h2>{editing ? <button className={styles.secondary} type="button" onClick={() => { setEditing(null); setInput(emptyInput); setInitialStock(""); }}>New product</button> : null}</div>
      <form className={styles.form} onSubmit={save}>
        <label>Product name<input required minLength={2} maxLength={120} value={input.name} onChange={(event) => change("name", event.target.value)} /></label>
        <label>SKU<input maxLength={64} value={input.sku ?? ""} onChange={(event) => change("sku", event.target.value || null)} placeholder="Unique product SKU" /></label>
        <label>Slug<input maxLength={100} value={input.slug ?? ""} onChange={(event) => change("slug", event.target.value || null)} placeholder="unique-product-slug" /></label>
        <label>NPR price<input type="number" min="1" step="1" disabled={!capabilities.canChangePrice} value={input.priceNpr ?? ""} onChange={(event) => change("priceNpr", event.target.value === "" ? null : Number(event.target.value))} /></label>
        {!editing ? capabilities.canAdjustInventory ? <label>Initial stock <small>(optional for a draft)</small><input type="number" min="0" max="100000" step="1" value={initialStock} onChange={(event) => setInitialStock(event.target.value)} /></label> : <p className={styles.full}>Initial stock can be set later by an administrator with inventory-adjustment access.</p> : <label>Current stock<input value={editing.stockQuantity ?? "Not set"} disabled /></label>}
        <label>Low-stock threshold<input type="number" min="0" max="100000" step="1" value={input.lowStockThreshold} onChange={(event) => change("lowStockThreshold", Number(event.target.value))} /></label>
        <label>Publication state<select value={input.status} onChange={(event) => change("status", event.target.value as ProductInput["status"])}><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></label>
        <label className={styles.check}><input type="checkbox" checked={input.featured} onChange={(event) => change("featured", event.target.checked)} />Featured product</label>
        <label className={styles.full}>Short description<textarea required={input.status === "published"} maxLength={320} value={input.shortDescription ?? ""} onChange={(event) => change("shortDescription", event.target.value || null)} /></label>
        <label className={styles.full}>Full description<textarea maxLength={5000} value={input.fullDescription ?? ""} onChange={(event) => change("fullDescription", event.target.value || null)} /></label>
        <div className={styles.full}><button className={styles.primary} type="submit" disabled={busy}>{busy ? "Saving…" : editing ? "Save product" : "Create draft"}</button></div>
      </form>
      {editing && capabilities.canManageImages ? <section><div className={styles.panelHead}><h2>Product images</h2><label className={styles.secondary}>Upload JPEG, PNG, or WebP<input hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadImage} /></label></div><div className={styles.images}>{editing.images.map((image) => <article className={styles.imageCard} key={image.id}><img src={image.url} alt={`${editing.name} product`} /><p>{image.isPrimary ? "Primary image" : "Gallery image"}</p><label>Order<input type="number" min="0" defaultValue={image.sortOrder} onBlur={(event) => { const next = Number(event.target.value); if (Number.isSafeInteger(next) && next !== image.sortOrder) void updateImage(image.id, { sortOrder: next }); }} /></label><div><button type="button" disabled={busy || image.isPrimary} onClick={() => void updateImage(image.id, { isPrimary: true })}>Make primary</button><button type="button" disabled={busy} onClick={() => void deleteImage(image.id)}>Remove</button></div></article>)}</div></section> : null}
    </section> : <section className={styles.panel}><p>You have view-only product access.</p></section>}
    <section className={styles.panel}><div className={styles.panelHead}><h2>Catalogue products</h2><span>{filtered.length} shown</span></div><div className={styles.filters}><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, SKU, or slug" aria-label="Search products" /><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter by publication status"><option value="all">All states</option><option value="published">Published</option><option value="draft">Draft</option><option value="archived">Archived</option></select><select value={stockFilter} onChange={(event) => setStockFilter(event.target.value)} aria-label="Filter by stock"><option value="all">All stock</option><option value="in_stock">In stock</option><option value="low_stock">Low stock</option><option value="out_of_stock">Out of stock</option></select></div><div className={styles.productList}>{filtered.map((product) => { const image = product.images.find((candidate) => candidate.isPrimary) ?? product.images[0]; const low = product.stockQuantity !== null && product.stockQuantity > 0 && product.stockQuantity <= product.lowStockThreshold; return <article className={styles.productRow} key={product.id}>{image ? <img src={image.url} alt="" /> : <span className={styles.imagePlaceholder} aria-hidden="true" />}<div><strong>{product.name}</strong><small>{product.sku ?? "SKU pending"} · {product.slug ?? "slug pending"}</small></div><strong>{product.priceNpr === null ? "Price pending" : `Rs ${product.priceNpr.toLocaleString("en-NP")}`}</strong><span>{product.stockQuantity === null ? "Stock pending" : `${product.stockQuantity} in stock`}</span><span className={`${styles.status} ${styles[product.status]}`}>{product.status}</span><div className={styles.rowActions}>{low ? <span className={`${styles.status} ${styles.low}`}>Low stock</span> : product.stockQuantity === 0 ? <span className={`${styles.status} ${styles.out}`}>Out</span> : null}{capabilities.canManage ? <button type="button" onClick={() => { setEditing(product); setInput(productToInput(product)); setInitialStock(""); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Edit</button> : null}<Link href={`/admin/inventory?product=${encodeURIComponent(product.id)}`}>Inventory</Link>{capabilities.canManage && product.status !== "archived" ? <button type="button" onClick={() => void archive(product)}>Archive</button> : null}</div></article>; })}</div></section>
  </main>;
}
