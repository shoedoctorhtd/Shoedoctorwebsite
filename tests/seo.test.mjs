import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { registerHooks } from "node:module";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { canonicalUrl, homeStructuredData, preferredHostRedirect, productStructuredData, reliableModifiedDate, serializeJsonLd } from "../lib/seo.ts";
import { listPublishedBlogPosts } from "../lib/blog-data.ts";

test("canonical hosts and redirects retain paths and query strings without affecting previews", () => {
  assert.equal(canonicalUrl("/services?service=deep#book"), "https://www.shoedoctor.com.np/services");
  for (const path of ["//preview.example/path", "https://localhost/path", "/\\preview.example/path"]) assert.throws(() => canonicalUrl(path));
  for (const origin of ["http://shoedoctor.com.np", "http://www.shoedoctor.com.np", "https://shoedoctor.com.np"]) {
    assert.equal(preferredHostRedirect(`${origin}/services?service=deep`), "https://www.shoedoctor.com.np/services?service=deep");
  }
  for (const origin of ["https://www.shoedoctor.com.np", "http://localhost:3000", "https://preview.example"]) assert.equal(preferredHostRedirect(`${origin}/services`), null);
});

test("business facts, stock uncertainty and JSON script escaping remain truthful", () => {
  const business = homeStructuredData["@graph"][0];
  assert.equal(business.name, "Shoe Doctor");
  assert.match(business.address.streetAddress, /Huprachaur/);
  assert.deepEqual(business.openingHoursSpecification.map((hours) => [hours.opens, hours.closes]), [["08:00", "19:00"], ["14:00", "19:00"]]);
  assert.equal(business.sameAs, undefined);
  const product = { status: "published", slug: "real-shoe-kit", name: "Cleaning Kit", sku: "KIT-1", priceNpr: 675, stockQuantity: 2, shortDescription: "Foam and brushes", fullDescription: null, details: {}, images: [{ url: "/api/products/images/kit", altText: "Cleaning Kit" }] };
  for (const status of ["draft", "archived", "deleted"]) assert.equal(productStructuredData({ ...product, status }), null);
  for (const slug of [null, "", " "]) assert.equal(productStructuredData({ ...product, slug }), null);
  const schema = productStructuredData(product)[0];
  assert.equal(schema.offers.price, "675");
  assert.equal(schema.offers.priceCurrency, "NPR");
  assert.equal(schema.offers.availability, "https://schema.org/InStock");
  assert.equal(productStructuredData({ ...product, stockQuantity: 0 })[0].offers.availability, "https://schema.org/OutOfStock");
  assert.equal(productStructuredData({ ...product, stockQuantity: null })[0].offers.availability, undefined);
  const payload = { name: "</script><script>alert(1)</script>" };
  assert.doesNotMatch(serializeJsonLd(payload), /</);
  assert.deepEqual(JSON.parse(serializeJsonLd(payload)), payload);
  for (const value of [null, "", "yesterday", "2026-02-30", "2026-09-15 12:00:00"]) assert.equal(reliableModifiedDate(value), undefined);
  assert.equal(reliableModifiedDate("2026-09-15T08:00:00Z"), "2026-09-15T08:00:00Z");
});

const db = new DatabaseSync(":memory:");
db.exec("PRAGMA foreign_keys = ON; CREATE TABLE admin_users (id TEXT PRIMARY KEY);");
for (const migration of ["0012_product_catalogue_inventory.sql", "0013_product_order_payments.sql", "0014_product_image_blobs.sql", "0015_product_content_fields.sql", "0016_product_lifecycle_deletion.sql"]) {
  db.exec(await readFile(new URL(`../migrations/${migration}`, import.meta.url), "utf8"));
}
const timestamp = "2026-09-01T07:00:00.000Z";
for (const [id, status, stock] of [["available-kit", "published", 4], ["sold-out-kit", "published", 0], ["draft-kit", "draft", 2], ["archived-kit", "archived", 1]]) {
  db.prepare("INSERT INTO products (id, sku, slug, name, short_description, price_npr, stock_quantity, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 675, ?, 'draft', ?, ?)")
    .run(id, `SKU-${id}`, id, `Shoe Care ${id}`, `Description for ${id}`, stock, timestamp, timestamp);
  db.prepare("INSERT INTO product_images (id, product_id, image_data, mime_type, byte_size, sha256, alt_text, is_primary, created_at) VALUES (?, ?, ?, 'image/png', 1, ?, ?, 1, ?)")
    .run(`image-${id}`, id, new Uint8Array([1]), "0".repeat(64), `Shoe Care ${id}`, timestamp);
  db.prepare("UPDATE products SET status = ? WHERE id = ?").run(status, id);
}
const d1 = {
  prepare(sql) {
    let bindings = [];
    return {
      bind(...values) { bindings = values; return this; },
      async all() { return { results: db.prepare(sql).all(...bindings), success: true }; },
      async first(column) { const row = db.prepare(sql).get(...bindings) ?? null; return column ? row?.[column] ?? null : row; },
      async run() { const result = db.prepare(sql).run(...bindings); return { success: true, meta: { changes: result.changes } }; },
    };
  },
  async batch(statements) { return Promise.all(statements.map((statement) => statement.run())); },
};
globalThis.__seoTestEnv = { DB: d1 };
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "cloudflare:workers") return { url: "data:text/javascript,export const env = globalThis.__seoTestEnv;", shortCircuit: true };
    return nextResolve(specifier, context);
  },
});
const { default: worker } = await import("../dist/server/index.js");
const env = { DB: d1, ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } };
const context = { waitUntil() {}, passThroughOnException() {} };
const fetchPage = (path) => worker.fetch(new Request(`http://localhost${path}`, { headers: { accept: "text/html" } }), env, context);
const jsonLd = (html) => [...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].flatMap((match) => JSON.parse(match[1]));
const tags = (html, type) => [...html.matchAll(new RegExp(`<${type}\\b[^>]*>`, "g"))].map((match) => match[0]);

test("public pages serve one H1, unique metadata, www canonicals and social tags in initial HTML", async () => {
  const titles = new Set();
  const descriptions = new Set();
  const paths = ["/", "/about", "/services", "/steam-cleaning", "/products", "/blog", "/contact", "/shoe-donation", "/privacy-policy", "/shipping-delivery", "/returns-refunds", "/terms", ...listPublishedBlogPosts().map((post) => `/blog/${post.slug}`)];
  for (const path of paths) {
    const response = await fetchPage(path);
    assert.equal(response.status, 200, path);
    const html = await response.text();
    assert.equal((html.match(/<h1\b/g) ?? []).length, 1, path);
    const title = html.match(/<title>(.*?)<\/title>/)?.[1];
    assert.ok(title && !titles.has(title), `unique title for ${path}`);
    titles.add(title);
    const meta = tags(html, "meta");
    const description = meta.find((tag) => tag.includes('name="description"'));
    assert.ok(description && !descriptions.has(description), `unique description for ${path}`);
    descriptions.add(description);
    const canonicals = tags(html, "link").filter((tag) => tag.includes('rel="canonical"'));
    assert.equal(canonicals.length, 1, path);
    assert.ok(canonicals[0].includes(`href="https://www.shoedoctor.com.np${path}"`), path);
    assert.ok(!meta.some((tag) => /name="robots"/.test(tag) && /noindex/.test(tag)), path);
    for (const property of ["og:title", "og:description", "og:url", "og:image", "og:type"]) assert.ok(meta.some((tag) => tag.includes(`property="${property}"`)), `${path}: ${property}`);
    assert.ok(meta.some((tag) => tag.includes('name="twitter:card"')));
    const schemas = jsonLd(html);
    if (path === "/") {
      const business = schemas.flatMap((schema) => schema["@graph"] ?? []).filter((schema) => schema["@type"] === "LocalBusiness");
      assert.equal(business.length, 1);
      assert.match(html, /Professional shoe cleaning, repair and restoration in Hetauda, Nepal/);
    }
    if (path.startsWith("/blog/")) {
      const article = schemas.find((schema) => schema["@type"] === "BlogPosting");
      assert.equal(article.url, canonicalUrl(path));
      assert.equal(article.datePublished, undefined, "unknown publication date must not be invented");
      assert.equal(article.dateModified, undefined);
    }
  }
});

test("product HTML and sitemap use published database records and current stock", async () => {
  for (const [slug, availability] of [["available-kit", "InStock"], ["sold-out-kit", "OutOfStock"]]) {
    const response = await fetchPage(`/products/${slug}`);
    assert.equal(response.status, 200);
    const html = await response.text();
    const product = jsonLd(html).find((schema) => schema["@type"] === "Product");
    assert.equal(product.name, `Shoe Care ${slug}`);
    assert.equal(product.sku, `SKU-${slug}`);
    assert.equal(product.offers.price, "675");
    assert.equal(product.offers.availability, `https://schema.org/${availability}`);
    assert.equal(product.url, canonicalUrl(`/products/${slug}`));
    assert.deepEqual(product.image, [canonicalUrl(`/api/products/images/image-${slug}`)]);
    assert.equal(product.aggregateRating, undefined);
    assert.equal(product.review, undefined);
    assert.equal((html.match(/<h1\b/g) ?? []).length, 1);
  }
  for (const slug of ["draft-kit", "archived-kit", "deleted-kit"]) {
    const response = await fetchPage(`/products/${slug}`);
    assert.equal(response.status, 404, slug);
    assert.ok(!jsonLd(await response.text()).some((schema) => schema["@type"] === "Product"));
  }
  const response = await fetchPage("/sitemap.xml");
  assert.equal(response.status, 200);
  const xml = await response.text();
  assert.match(xml, /<\?xml version="1.0" encoding="UTF-8"\?>/);
  assert.match(xml, /<urlset xmlns="http:\/\/www.sitemaps.org\/schemas\/sitemap\/0.9"/);
  const locations = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]);
  assert.ok(locations.length >= 18);
  assert.equal(new Set(locations).size, locations.length);
  for (const url of locations) assert.match(url, /^https:\/\/www\.shoedoctor\.com\.np\//);
  for (const slug of ["available-kit", "sold-out-kit"]) assert.ok(locations.includes(canonicalUrl(`/products/${slug}`)));
  assert.doesNotMatch(xml, /draft-kit|archived-kit|deleted-kit|\/admin|\/checkout|\/api\/|<loc>\s*<\/loc>/);
  assert.match(xml, /<lastmod>2026-09-01T07:00:00.000Z<\/lastmod>/);
  for (const post of listPublishedBlogPosts()) assert.ok(locations.includes(canonicalUrl(`/blog/${post.slug}`)));
});

test("robots keeps public images crawlable and internal pages noindex", async () => {
  const robots = await (await fetchPage("/robots.txt")).text();
  assert.match(robots, /User-agent: \*/i);
  assert.match(robots, /Allow: \//);
  assert.match(robots, /Sitemap: https:\/\/www\.shoedoctor\.com\.np\/sitemap.xml/);
  assert.doesNotMatch(robots, /Disallow: \/api\s|Disallow: \/api\/products/);
  for (const path of ["/admin/login", "/admin/access-denied", "/cart", "/checkout", "/order-confirmation", "/orders/PO-260915-ABC/payment"]) {
    const response = await fetchPage(path);
    assert.equal(response.headers.get("x-robots-tag"), "noindex, nofollow", path);
    const html = await response.text();
    if (response.status === 200) {
      assert.ok(tags(html, "meta").some((tag) => /name="robots"/.test(tag) && /noindex, nofollow/.test(tag)), path);
    } else {
      assert.ok([302, 303, 307, 308].includes(response.status), `${path}: redirect to authenticated access`);
    }
    assert.ok(!tags(html, "link").some((tag) => tag.includes('rel="canonical"')), path);
  }
  const invalidPayment = await fetchPage("/orders/test/payment");
  assert.equal(invalidPayment.status, 404);
  assert.equal(invalidPayment.headers.get("x-robots-tag"), "noindex, nofollow");
  const missingPost = await fetchPage("/blog/unpublished-guide");
  assert.equal(missingPost.status, 404);
  assert.ok(!jsonLd(await missingPost.text()).some((schema) => schema["@type"] === "BlogPosting"));
  const redirect = await worker.fetch(new Request("http://shoedoctor.com.np/services?service=deep"), env, context);
  assert.equal(redirect.status, 308);
  assert.equal(redirect.headers.get("location"), "https://www.shoedoctor.com.np/services?service=deep");
});

test.after(() => { hooks.deregister(); db.close(); delete globalThis.__seoTestEnv; });
