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
  assert.match(html, /class="site-loader"/i);
  assert.match(html, /WE DIAGNOSE · WE CLEAN · WE RESTORE/i);
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

  const desktopNav = html.match(
    /<nav\b[^>]*class="sd-desktop-nav"[^>]*>([\s\S]*?)<\/nav>/i,
  )?.[1];
  const mobileNav = html.match(
    /<nav\b[^>]*class="sd-mobile-nav"[^>]*>([\s\S]*?)<\/nav>/i,
  )?.[1];
  assert.ok(desktopNav);
  assert.ok(mobileNav);

  const linkHrefs = (markup) =>
    [...markup.matchAll(/<a\b[^>]*href="([^"]+)"/gi)].map((match) => match[1]);
  assert.deepEqual(linkHrefs(desktopNav), [
    "/",
    "/about",
    "/services",
    "/products",
    "/shoe-donation",
    "/blog",
    "/contact",
  ]);
  assert.deepEqual(linkHrefs(mobileNav), [
    "/",
    "/about",
    "/shoe-donation",
    "/services",
    "/products",
    "/blog",
    "/contact",
  ]);
  const mobileRows = [
    ...mobileNav.matchAll(
      /<div\b[^>]*class="sd-mobile-nav-row"[^>]*>([\s\S]*?)<\/div>/gi,
    ),
  ];
  assert.deepEqual(mobileRows.map((row) => linkHrefs(row[1]).length), [4, 3]);
  assert.doesNotMatch(desktopNav, /\/steam-cleaning|Steam Cleaning/i);
  assert.doesNotMatch(mobileNav, /\/steam-cleaning|Steam Cleaning/i);
  assert.equal((html.match(/href="\/steam-cleaning"/g) ?? []).length, 1);
  assert.match(html, /FIRST IN NEPAL/i);
  assert.match(html, /Steam-Assisted[\s\S]*Shoe Cleaning/i);
});

test("keeps all services bookable with primary cleaning, restoration and compact secondary treatments", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `steam-${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  const env = {
    ASSETS: {
      fetch: async () => new Response("Not found", { status: 404 }),
    },
  };
  const context = {
    waitUntil() {},
    passThroughOnException() {},
  };

  const [steamResponse, servicesResponse] = await Promise.all([
    worker.fetch(
      new Request("http://localhost/steam-cleaning", {
        headers: { accept: "text/html" },
      }),
      env,
      context,
    ),
    worker.fetch(
      new Request("http://localhost/services", {
        headers: { accept: "text/html" },
      }),
      env,
      context,
    ),
  ]);
  assert.equal(steamResponse.status, 200);
  assert.equal(servicesResponse.status, 200);

  const servicesHtml = await servicesResponse.text();
  assert.match(servicesHtml, /<main\b[^>]*class="[^"]*\bservices-refined\b/i);

  const primaryServiceIds = [
    "basic-clean",
    "deep-clean",
    "steam-assisted-deep-clean",
    "premium-care",
  ];
  const repairServiceIds = [
    "minor-stitching",
    "full-stitching",
    "half-regluing",
    "full-regluing",
    "half-repaint",
    "full-repaint",
  ];
  const addOnServiceIds = [
    "express-wash-dry",
    "repair-priority",
    "delicate-materials",
  ];
  const allServiceIds = [
    ...primaryServiceIds,
    "full-restoration",
    ...repairServiceIds,
    ...addOnServiceIds,
  ];

  for (const id of allServiceIds) {
    assert.equal(
      servicesHtml.split(`data-service-id="${id}"`).length - 1,
      1,
      `${id} remains available once in the treatment menu`,
    );
    assert.ok(
      servicesHtml.includes(`href="/?service=${encodeURIComponent(id)}#book"`),
      `${id} transfers the selected treatment into booking`,
    );
  }

  const primaryCards = [...servicesHtml.matchAll(
    /<article\b(?=[^>]*\bdata-service-card)(?=[^>]*\bdata-service-id="([^"]+)")[^>]*>([\s\S]*?)<\/article>/gi,
  )];
  assert.deepEqual(
    primaryCards.map((card) => card[1]).sort(),
    [...primaryServiceIds].sort(),
  );

  const cleanIndex = servicesHtml.indexOf("CLEAN. FRESH. READY.");
  const restorationIndex = servicesHtml.indexOf(
    'data-service-id="full-restoration"',
  );
  const repairIndex = servicesHtml.indexOf("FIX THE DAMAGE.");
  assert.ok(cleanIndex >= 0);
  for (const id of primaryServiceIds) {
    const index = servicesHtml.indexOf(`data-service-id="${id}"`);
    assert.ok(index > cleanIndex && index < restorationIndex);
  }
  assert.ok(repairIndex > restorationIndex);
  assert.match(servicesHtml, /BEYOND CLEANING\./i);

  for (const id of [...repairServiceIds, ...addOnServiceIds]) {
    const start = servicesHtml.indexOf(`data-service-id="${id}"`);
    const nextService = servicesHtml.indexOf("data-service-id=", start + 1);
    const row = servicesHtml.slice(start, nextService < 0 ? undefined : nextService);
    assert.match(row, /<details\b/i, `${id} has expandable treatment details`);
    assert.match(row, /<summary\b[\s\S]*?<\/summary>/i);
    assert.ok(start > repairIndex);
  }

  const steamCard = primaryCards.find((card) => card[1] === "steam-assisted-deep-clean")?.[2];
  assert.ok(steamCard);
  assert.match(steamCard, /menu-badge[^>]*>NEW</i);
  assert.match(
    steamCard,
    /<a\b[^>]*href="\/steam-cleaning"[^>]*>[\s\S]*?Learn More[\s\S]*?<\/a>/i,
  );
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
