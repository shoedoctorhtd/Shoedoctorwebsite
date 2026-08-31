"use client";

/* eslint-disable @next/next/no-img-element */

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import type { ProductImageStorageSummary } from "@/lib/product-data";
import type { Product, ProductImage, ProductInput } from "@/lib/product-types";
import {
  prepareProductImageForUpload,
  releasePreparedProductImage,
  type PreparedProductImage,
} from "./product-image-compression";
import styles from "./ProductAdmin.module.css";

type Capabilities = {
  canManage: boolean;
  canChangePrice: boolean;
  canManageImages: boolean;
  canAdjustInventory: boolean;
};

type PreparedUpload = PreparedProductImage & { replaceImageId: string | null };

type ProductListResponse = {
  products?: Product[];
  storage?: ProductImageStorageSummary;
  page?: number;
  pageSize?: number;
  hasMore?: boolean;
  message?: string;
};

type ProductImageMutationResponse = {
  image?: ProductImage;
  message?: string;
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

export default function ProductAdminDashboard({
  initialProducts,
  initialPage,
  initialPageSize,
  initialHasMore,
  initialStorage,
  capabilities,
}: {
  initialProducts: Product[];
  initialPage: number;
  initialPageSize: number;
  initialHasMore: boolean;
  initialStorage: ProductImageStorageSummary;
  capabilities: Capabilities;
}) {
  const [products, setProducts] = useState(initialProducts);
  const [nextPage, setNextPage] = useState(initialPage + 1);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [storage, setStorage] = useState(initialStorage);
  const [editing, setEditing] = useState<Product | null>(null);
  const [input, setInput] = useState<ProductInput>(emptyInput);
  const [initialStock, setInitialStock] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [preparingImage, setPreparingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [preparedUpload, setPreparedUpload] = useState<PreparedUpload | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => () => releasePreparedProductImage(preparedUpload), [preparedUpload]);

  const storagePercent = storage.byteLimit > 0
    ? Math.min(100, Math.round((storage.bytesUsed / storage.byteLimit) * 1000) / 10)
    : 0;

  function productPageUrl(page: number) {
    const params = new URLSearchParams({ page: String(page), pageSize: String(initialPageSize) });
    if (search.trim()) params.set("search", search.trim());
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (stockFilter !== "all") params.set("stock", stockFilter);
    return `/api/admin/products?${params.toString()}`;
  }

  function change<K extends keyof ProductInput>(key: K, value: ProductInput[K]) {
    setInput((current) => ({ ...current, [key]: value }));
  }

  async function reload() {
    const response = await fetch(productPageUrl(1));
    const result = await response.json() as ProductListResponse;
    if (!response.ok || !result.products) throw new Error(result.message ?? "Unable to refresh products.");
    setProducts(result.products);
    if (result.storage) setStorage(result.storage);
    setNextPage((result.page ?? 1) + 1);
    setHasMore(result.hasMore === true);
    return result.products;
  }

  async function loadMoreProducts() {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    setError(null);
    try {
      const response = await fetch(productPageUrl(nextPage));
      const result = await response.json() as ProductListResponse;
      if (!response.ok || !result.products) throw new Error(result.message ?? "Unable to load more products.");
      setProducts((current) => {
        const knownIds = new Set(current.map((product) => product.id));
        return [...current, ...result.products!.filter((product) => !knownIds.has(product.id))];
      });
      if (result.storage) setStorage(result.storage);
      setNextPage((result.page ?? nextPage) + 1);
      setHasMore(result.hasMore === true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to load more products.");
    } finally {
      setLoadingMore(false);
    }
  }

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void reload().catch((reason) => {
      setError(reason instanceof Error ? reason.message : "Unable to filter products.");
    });
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!capabilities.canManage) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const body = {
        ...input,
        sku: input.sku || null,
        slug: input.slug || null,
        shortDescription: input.shortDescription || null,
        fullDescription: input.fullDescription || null,
        initialStock: editing || !capabilities.canAdjustInventory ? undefined : initialStock,
      };
      const response = await fetch(
        editing ? `/api/admin/products/${encodeURIComponent(editing.id)}` : "/api/admin/products",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        },
      );
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
    } finally {
      setBusy(false);
    }
  }

  async function archive(product: Product) {
    if (!window.confirm(`Archive ${product.name}? It will remain in historical orders and cannot be publicly purchased.`)) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/products/${encodeURIComponent(product.id)}`, { method: "DELETE" });
      const result = await response.json() as { message?: string };
      if (!response.ok) throw new Error(result.message ?? "Unable to archive product.");
      await reload();
      if (editing?.id === product.id) {
        setEditing(null);
        setInput(emptyInput);
        setPreparedUpload(null);
      }
      setNotice("Product archived. Historical orders were preserved.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to archive product.");
    } finally {
      setBusy(false);
    }
  }

  async function prepareImage(event: ChangeEvent<HTMLInputElement>, replaceImageId: string | null) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !editing || !capabilities.canManageImages) return;
    setPreparingImage(true);
    setError(null);
    setNotice(null);
    try {
      const prepared = await prepareProductImageForUpload(file);
      setPreparedUpload({ ...prepared, replaceImageId });
      setNotice(replaceImageId ? "Replacement image is ready. Confirm the upload below." : "Compressed image is ready. Confirm the upload below.");
    } catch (reason) {
      setPreparedUpload(null);
      setError(reason instanceof Error ? reason.message : "Unable to prepare this image.");
    } finally {
      setPreparingImage(false);
    }
  }

  async function sendPreparedImage() {
    if (!editing || !preparedUpload || !capabilities.canManageImages) return;
    const prepared = preparedUpload;
    const productBeforeUpload = editing;
    setBusy(true);
    setUploadProgress(0);
    setError(null);
    try {
      const form = new FormData();
      form.set("image", prepared.file);
      let url = `/api/admin/products/${encodeURIComponent(editing.id)}/images`;
      let method = "POST";
      if (prepared.replaceImageId) {
        url += `/${encodeURIComponent(prepared.replaceImageId)}`;
        method = "PUT";
      } else {
        form.set("makePrimary", editing.images.length === 0 ? "true" : "false");
      }
      const result = await uploadImageWithProgress(url, method, form, setUploadProgress);
      if (!result.ok) throw new Error(result.message ?? "Unable to upload product image.");
      const fallback = result.image
        ? withProductImage(productBeforeUpload, result.image, prepared.replaceImageId)
        : productBeforeUpload;
      const updated = (await reload()).find((product) => product.id === productBeforeUpload.id) ?? fallback;
      setEditing(updated);
      if (updated) setInput(productToInput(updated));
      setPreparedUpload(null);
      setNotice(prepared.replaceImageId ? "Product image replaced." : "Product image uploaded.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to upload product image.");
    } finally {
      setUploadProgress(null);
      setBusy(false);
    }
  }

  async function updateImage(imageId: string, payload: Record<string, unknown>) {
    if (!editing) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/admin/products/${encodeURIComponent(editing.id)}/images/${encodeURIComponent(imageId)}`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const result = await response.json() as ProductImageMutationResponse;
      if (!response.ok) throw new Error(result.message ?? "Unable to update image.");
      const fallback = result.image ? withProductImage(editing, result.image) : editing;
      const updated = (await reload()).find((product) => product.id === editing.id) ?? fallback;
      setEditing(updated);
      if (updated) setInput(productToInput(updated));
      setNotice("Product image updated.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to update image.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteImage(imageId: string) {
    if (!editing || !window.confirm("Remove this product image?")) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/admin/products/${encodeURIComponent(editing.id)}/images/${encodeURIComponent(imageId)}`,
        { method: "DELETE" },
      );
      const result = await response.json() as { message?: string };
      if (!response.ok) throw new Error(result.message ?? "Unable to delete image.");
      const fallback = { ...editing, images: editing.images.filter((image) => image.id !== imageId) };
      const updated = (await reload()).find((product) => product.id === editing.id) ?? fallback;
      setEditing(updated);
      if (updated) setInput(productToInput(updated));
      setNotice("Product image removed.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to delete image.");
    } finally {
      setBusy(false);
    }
  }

  function editProduct(product: Product) {
    setEditing(product);
    setInput(productToInput(product));
    setInitialStock("");
    setPreparedUpload(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <main className={styles.shell}>
      <nav className={styles.nav} aria-label="Product administration">
        <Link href="/admin">Dashboard</Link>
        <Link href="/admin/product-orders">Product orders</Link>
        <Link href="/admin/inventory">Inventory</Link>
      </nav>

      <section className={styles.intro}>
        <p className="section-kicker">Shop management</p>
        <h1>PRODUCTS</h1>
        <p>Add drafts without invented data, then upload product images, set initial stock, and publish only when the catalogue record is complete.</p>
      </section>

      {notice ? <p className={styles.notice} role="status">{notice}</p> : null}
      {error ? <p className={`${styles.notice} ${styles.error}`} role="alert">{error}</p> : null}

      {capabilities.canManageImages ? (
        <section className={`${styles.panel} ${styles.storagePanel}`} aria-label="Product image storage">
          <div>
            <p className="section-kicker">D1 image storage</p>
            <h2>{storage.imageCount} stored image{storage.imageCount === 1 ? "" : "s"}</h2>
            <p>{formatBytes(storage.bytesUsed)} of the {formatBytes(storage.byteLimit)} application safeguard is in use.</p>
          </div>
          <div className={styles.storageMeter}>
            <div className={styles.storageTrack} aria-hidden="true"><span style={{ width: `${storagePercent}%` }} /></div>
            <strong>{storagePercent}% used</strong>
            <small>Each product can have up to three JPEG, PNG, or WebP images. Files are compressed to 500 KB or less before upload.</small>
          </div>
        </section>
      ) : null}

      {capabilities.canManage || capabilities.canManageImages ? (
        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <h2>{editing ? `Edit ${editing.name}` : capabilities.canManage ? "Add a product" : "Manage product images"}</h2>
            {editing && capabilities.canManage ? (
              <button className={styles.secondary} type="button" onClick={() => {
                setEditing(null);
                setInput(emptyInput);
                setInitialStock("");
                setPreparedUpload(null);
              }}>
                New product
              </button>
            ) : null}
          </div>
          {capabilities.canManage ? (
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
          ) : <p className={styles.full}>{editing ? "Use the controls below to manage this product's images." : "Choose a product below to manage its images."}</p>}

          {editing && capabilities.canManageImages ? (
            <section className={styles.imageManager}>
              <div className={styles.panelHead}>
                <div><h2>Product images</h2><p>JPEG, PNG, and WebP are resized and converted to WebP before the secure D1 upload.</p></div>
                {editing.images.length < 3 ? (
                  <label className={styles.secondary}>
                    {preparingImage ? "Preparing…" : "Choose image"}
                    <input hidden type="file" accept="image/jpeg,image/png,image/webp" disabled={busy || preparingImage} onChange={(event) => { void prepareImage(event, null); }} />
                  </label>
                ) : <span className={styles.limitNotice}>Maximum of 3 images reached. Replace or remove an image to continue.</span>}
              </div>

              {preparedUpload ? (
                <section className={styles.preparedImage} aria-label="Prepared product image">
                  <img src={preparedUpload.previewUrl} alt="Prepared product upload preview" />
                  <div>
                    <strong>{preparedUpload.replaceImageId ? "Replacement image ready" : "Image ready to upload"}</strong>
                    <p>WebP · {formatBytes(preparedUpload.byteSize)} · {preparedUpload.width} × {preparedUpload.height}px</p>
                    {uploadProgress !== null ? <progress max="100" value={uploadProgress}>{uploadProgress}%</progress> : null}
                    <div className={styles.imageActions}>
                      <button className={styles.primary} type="button" disabled={busy} onClick={() => void sendPreparedImage()}>{busy ? "Uploading…" : preparedUpload.replaceImageId ? "Replace image" : "Upload image"}</button>
                      <button className={styles.secondary} type="button" disabled={busy} onClick={() => setPreparedUpload(null)}>Discard</button>
                    </div>
                  </div>
                </section>
              ) : null}

              <div className={styles.images}>
                {editing.images.map((image) => (
                  <article className={styles.imageCard} key={image.id}>
                    <img src={image.url} alt={image.altText ?? `${editing.name} product`} />
                    <p>{image.isPrimary ? "Primary image" : "Gallery image"}</p>
                    <label>Alt text<input maxLength={240} defaultValue={image.altText ?? ""} placeholder={`${editing.name} product`} onBlur={(event) => {
                      const next = event.target.value.trim() || null;
                      if (next !== image.altText) void updateImage(image.id, { altText: next });
                    }} /></label>
                    <label>Order<input type="number" min="0" defaultValue={image.sortOrder} onBlur={(event) => {
                      const next = Number(event.target.value);
                      if (Number.isSafeInteger(next) && next !== image.sortOrder) void updateImage(image.id, { sortOrder: next });
                    }} /></label>
                    <div className={styles.imageActions}>
                      <button type="button" disabled={busy || image.isPrimary} onClick={() => void updateImage(image.id, { isPrimary: true })}>Make primary</button>
                      <label className={styles.inlineAction}>Replace<input hidden type="file" accept="image/jpeg,image/png,image/webp" disabled={busy || preparingImage} onChange={(event) => { void prepareImage(event, image.id); }} /></label>
                      <button type="button" disabled={busy} onClick={() => void deleteImage(image.id)}>Remove</button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : null}
        </section>
      ) : <section className={styles.panel}><p>You have view-only product access.</p></section>}

      <section className={styles.panel}>
        <div className={styles.panelHead}><h2>Catalogue products</h2><span>{products.length} loaded</span></div>
        <form className={styles.filters} onSubmit={applyFilters}>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, SKU, or slug" aria-label="Search products" />
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter by publication status"><option value="all">All states</option><option value="published">Published</option><option value="draft">Draft</option><option value="archived">Archived</option></select>
          <select value={stockFilter} onChange={(event) => setStockFilter(event.target.value)} aria-label="Filter by stock"><option value="all">All stock</option><option value="in_stock">In stock</option><option value="low_stock">Low stock</option><option value="out_of_stock">Out of stock</option></select>
          <button className={styles.secondary} type="submit" disabled={busy || loadingMore}>Apply filters</button>
        </form>
        <div className={styles.productList}>
          {products.map((product) => {
            const image = product.images.find((candidate) => candidate.isPrimary) ?? product.images[0];
            const low = product.stockQuantity !== null && product.stockQuantity > 0 && product.stockQuantity <= product.lowStockThreshold;
            return <article className={styles.productRow} key={product.id}>
              {image ? <img src={image.url} alt="" /> : <span className={styles.imagePlaceholder} aria-hidden="true" />}
              <div><strong>{product.name}</strong><small>{product.sku ?? "SKU pending"} · {product.slug ?? "slug pending"}</small></div>
              <strong>{product.priceNpr === null ? "Price pending" : `Rs ${product.priceNpr.toLocaleString("en-NP")}`}</strong>
              <span>{product.stockQuantity === null ? "Stock pending" : `${product.stockQuantity} in stock`}</span>
              <span className={`${styles.status} ${styles[product.status]}`}>{product.status}</span>
              <div className={styles.rowActions}>
                {low ? <span className={`${styles.status} ${styles.low}`}>Low stock</span> : product.stockQuantity === 0 ? <span className={`${styles.status} ${styles.out}`}>Out</span> : null}
                {capabilities.canManage || capabilities.canManageImages ? <button type="button" onClick={() => editProduct(product)}>{capabilities.canManage ? "Edit" : "Manage images"}</button> : null}
                <Link href={`/admin/inventory?product=${encodeURIComponent(product.id)}`}>Inventory</Link>
                {capabilities.canManage && product.status !== "archived" ? <button type="button" onClick={() => void archive(product)}>Archive</button> : null}
              </div>
            </article>;
          })}
        </div>
        {hasMore ? (
          <div className={styles.pageActions}>
            <button type="button" className={styles.secondary} disabled={loadingMore} onClick={() => void loadMoreProducts()}>
              {loadingMore ? "Loadingâ€¦" : "Load more products"}
            </button>
            <span>{products.length} loaded</span>
          </div>
        ) : null}
      </section>
    </main>
  );
}

async function uploadImageWithProgress(url: string, method: string, form: FormData, onProgress: (value: number) => void) {
  return new Promise<{ ok: boolean; image?: ProductImage; message?: string }>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open(method, url);
    request.responseType = "text";
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)));
    };
    request.onerror = () => reject(new Error("The image upload could not reach Shoe Doctor."));
    request.onload = () => {
      let body: ProductImageMutationResponse = {};
      try { body = JSON.parse(request.responseText || "{}") as ProductImageMutationResponse; } catch { /* status remains authoritative */ }
      resolve({ ok: request.status >= 200 && request.status < 300, image: body.image, message: body.message });
    };
    request.send(form);
  });
}

function withProductImage(product: Product, image: ProductImage, replacedImageId: string | null = null): Product {
  const images = [
    ...product.images.filter((current) => current.id !== image.id && current.id !== replacedImageId),
    image,
  ].sort((left, right) => Number(right.isPrimary) - Number(left.isPrimary) || left.sortOrder - right.sortOrder || left.createdAt.localeCompare(right.createdAt));
  return { ...product, images };
}

function formatBytes(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0 bytes";
  if (value < 1024) return `${Math.round(value)} bytes`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}
