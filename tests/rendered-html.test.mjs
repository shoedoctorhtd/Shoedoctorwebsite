import assert from "node:assert/strict";
import test from "node:test";

const developmentPreviewMeta =
  /<meta(?=[^>]*\bname=["']codex-preview["'])(?=[^>]*\bcontent=["']development["'])[^>]*>/i;

test("renders development preview metadata", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  const response = await worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );

  assert.equal(response.status, 200);
  assert.match(
    response.headers.get("content-type") ?? "",
    /^text\/html\b/i,
  );
  const html = await response.text();
  assert.match(html, developmentPreviewMeta);
  assert.match(html, /Skip to main content/i);
  assert.doesNotMatch(html, /class="site-loader"/i);
  assert.match(html, /How many pairs\?/i);
  assert.match(html, /Your shoes[\s\S]*?1 pair/i);
  assert.match(html, /Add condition \/ special request/i);
  assert.match(html, /Add another pair/i);
  assert.doesNotMatch(html, /Add each pair for this booking/i);
  assert.match(html, /Your Booking Summary/i);
  assert.match(
    html,
    /Remember my details on this device for faster booking next time/i,
  );
  assert.match(html, /autocomplete="name"/i);
  assert.match(html, /autocomplete="tel"/i);
  assert.match(html, /autocomplete="email"/i);
  assert.match(html, /autocomplete="street-address"/i);
});

test("renders donation confirmation and opt-in fields without public donor data", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `donation-${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  const response = await worker.fetch(
    new Request("http://localhost/shoe-donation", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );

  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Email[\s\S]{0,100}donation confirmation and impact updates/i);
  assert.match(
    html,
    /Send me updates about my donated shoes and their impact\./i,
  );
  assert.match(html, /name="emailUpdatesConsent"/i);
  assert.doesNotMatch(html, /GOOGLE_REFRESH_TOKEN|GOOGLE_CLIENT_SECRET/i);
});
