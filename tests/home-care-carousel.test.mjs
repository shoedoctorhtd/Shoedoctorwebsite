import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import { mountCareCarousel } from "../lib/home-care-carousel.ts";
import * as productHome from "../lib/product-home.ts";
import * as money from "../lib/money.ts";

test("server-rendered cards preserve product URLs, prices, heading, CTA and empty-state filtering", () => {
  const require = createRequire(import.meta.url);
  // Render the real components and Next links; only CSS and the decorative icon are stubbed.
  const imports = {
    "./HomeCareEssentials.module.css": { __esModule: true, default: {} },
    "@/lib/home-care-carousel": { mountCareCarousel },
    "@/lib/product-home": productHome,
    "@/lib/money": money,
    "./SiteChrome": { ArrowUpRight: () => createElement("svg", { "aria-hidden": true }) },
  };
  function component(name) {
    const source = readFileSync(new URL(`../app/components/${name}.tsx`, import.meta.url), "utf8");
    const { outputText } = ts.transpileModule(source, { compilerOptions: {
      module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
    } });
    const compiledModule = { exports: {} };
    new Function("require", "module", "exports", outputText)(
      (id) => imports[id] ?? require(id), compiledModule, compiledModule.exports,
    );
    return compiledModule.exports;
  }
  imports["./HomeCareCarousel"] = component("HomeCareCarousel");
  const HomeCareEssentials = component("HomeCareEssentials").default;
  const products = Array.from({ length: 6 }, (_, index) => ({
    slug: `care-product-${index}`, name: `Care product ${index}`, priceNpr: 299 + index,
    stockQuantity: 3, primaryImage: { url: `/care-${index}.webp`, altText: `Care product ${index}` },
  }));
  products.push({ ...products[0], slug: "sold-out", stockQuantity: 0 });
  const html = renderToStaticMarkup(createElement(HomeCareEssentials, { products }));
  assert.match(html, /Shoe Doctor care essentials/);
  assert.match(html, /id="care-essentials-heading"/);
  assert.match(html, /id="care-essentials-products"/);
  assert.match(html, /href="\/products"[^>]*>View All Products/);
  assert.equal((html.match(/<article\b/g) ?? []).length, 18);
  for (let index = 0; index < 6; index++) {
    assert.equal((html.match(new RegExp(`href="/products/care-product-${index}"`, "g")) ?? []).length, 6);
    assert.ok(html.includes(money.formatNprOrPending(299 + index)));
  }
  assert.doesNotMatch(html, /sold-out/);
  assert.equal((html.match(/aria-hidden="true"[^>]*aria-roledescription="slide"/g) ?? []).length, 12);
  assert.equal(renderToStaticMarkup(createElement(HomeCareEssentials, { products: [] })), "");
});

// Exercise the production controller with deterministic browser events/geometry.
// These tests do not substitute for touch or visual verification in a browser.
function fixture(t, { count = 6, width = 1000, cardWidth = 238, gap = 16, reducedMotion = false, hovered = false } = {}) {
  let now = 0;
  let timerId = 0;
  const timers = new Map();
  const schedule = (fn, delay, repeat = false) => {
    const id = ++timerId;
    timers.set(id, { fn, at: now + delay, delay, repeat });
    return id;
  };
  function tick(ms) {
    const end = now + ms;
    while (true) {
      const next = [...timers].sort((a, b) => a[1].at - b[1].at)[0];
      if (!next || next[1].at > end) break;
      const [id, timer] = next;
      now = timer.at;
      if (timer.repeat) timer.at += timer.delay;
      else timers.delete(id);
      timer.fn();
    }
    now = end;
  }
  const event = (target, name, props = {}) => {
    const value = Object.assign(new Event(name, { cancelable: true }), props);
    target.dispatchEvent(value);
    return value;
  };
  class Element extends EventTarget {
    children = [];
    hidden = false;
    inert = false;
    attributes = {};
    scrollLeft = 0;
    contains(node) { return this === node || this.children.some((child) => child.contains(node)); }
    matches() { return hovered; }
    getBoundingClientRect() { return { width: cardWidth }; }
    setAttribute(name, value) { this.attributes[name] = value; }
    focus() { doc.activeElement = this; event(root, "focusin"); }
  }
  const doc = Object.assign(new EventTarget(), { hidden: false, activeElement: null });
  const root = new Element();
  const viewport = new Element();
  const control = new Element();
  root.children = [viewport, control];
  viewport.clientWidth = width;
  const moves = [];
  viewport.scrollTo = (options) => {
    moves.push(options);
    viewport.scrollLeft = options.left;
    event(viewport, "scroll");
  };
  viewport.children = Array.from({ length: count * 3 }, (_, index) => {
    const slide = new Element();
    slide.hidden = index < count || index >= count * 2;
    slide.logicalIndex = index % count;
    slide.children = [new Element()];
    return slide;
  });
  const motion = Object.assign(new EventTarget(), { matches: reducedMotion });
  let intersection;
  let resize;
  class Visibility {
    constructor(callback) { intersection = { callback }; }
    observe() {}
    disconnect() { intersection.disconnected = true; }
  }
  class Resize {
    constructor(callback) { resize = { callback }; }
    observe() {}
    disconnect() { resize.disconnected = true; }
  }
  const win = {
    matchMedia: () => motion,
    getComputedStyle: () => ({ columnGap: String(gap) }),
    setTimeout: (fn, delay) => schedule(fn, delay),
    clearTimeout: (id) => timers.delete(id),
    setInterval: (fn, delay) => schedule(fn, delay, true),
    clearInterval: (id) => timers.delete(id),
  };
  const globals = { window: win, document: doc, IntersectionObserver: Visibility, ResizeObserver: Resize };
  const originals = Object.fromEntries(Object.keys(globals).map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  let state;
  const carousel = mountCareCarousel(root, viewport, count, (value) => { state = value; });
  t.after(() => {
    carousel.destroy();
    for (const [key, descriptor] of Object.entries(originals)) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  });
  return {
    carousel, root, viewport, control, doc, motion, moves, tick, event, timers,
    get state() { return state; },
    visible: () => viewport.children.filter((slide) => !slide.inert).map((slide) => slide.logicalIndex),
    onscreen: (visible) => intersection.callback([{ isIntersecting: visible, intersectionRatio: Number(visible) }]),
    resize: (nextWidth, nextCardWidth, nextGap) => {
      viewport.clientWidth = nextWidth;
      cardWidth = nextCardWidth;
      gap = nextGap;
      resize.callback();
    },
    finish: () => event(viewport, "scrollend"),
    disconnected: () => intersection.disconnected && resize.disconnected,
  };
}

test("autoplay advances exactly one card every three seconds only when visible", (t) => {
  const h = fixture(t);
  const initial = h.viewport.scrollLeft;
  h.tick(9000);
  assert.equal(h.viewport.scrollLeft, initial);
  h.onscreen(true);
  h.tick(2999);
  assert.equal(h.viewport.scrollLeft, initial);
  h.tick(1);
  assert.deepEqual(h.moves.at(-1), { left: initial + 254, behavior: "smooth" });
  h.tick(3000);
  assert.equal(h.viewport.scrollLeft, initial + 508);
  h.onscreen(false);
  h.tick(9000);
  assert.equal(h.viewport.scrollLeft, initial + 508);
});

test("desktop, tablet, and mobile capacities respond to resize and never loop an underfilled row", (t) => {
  const h = fixture(t, { count: 4 });
  h.onscreen(true);
  assert.equal(h.state.canScroll, false);
  assert.deepEqual(h.visible(), [0, 1, 2, 3]);
  h.tick(9000);
  assert.equal(h.viewport.scrollLeft, 0);
  h.resize(700, 343, 14);
  assert.equal(h.state.canScroll, true);
  assert.deepEqual(h.visible(), [0, 1]);
  h.resize(350, 297.5, 10);
  assert.equal(h.state.canScroll, true);
  assert.deepEqual(h.visible(), [0, 1]); // The second mobile card is partially visible.
  h.resize(1000, 238, 16);
  assert.equal(h.state.canScroll, false);
  assert.equal(h.viewport.scrollLeft, 0);
  assert.equal(h.viewport.children.filter((slide) => !slide.hidden).length, 4);
});

test("one mobile product remains static with no duplicate accessible slides", (t) => {
  const h = fixture(t, { count: 1, width: 350, cardWidth: 297.5, gap: 10 });
  h.onscreen(true);
  h.tick(12000);
  h.carousel.next();
  assert.equal(h.state.canScroll, false);
  assert.deepEqual(h.visible(), [0]);
  assert.equal(h.viewport.scrollLeft, 0);
});

test("both loop boundaries rebase to identical content, including repeated keyboard navigation", (t) => {
  const h = fixture(t);
  h.viewport.focus();
  h.carousel.previous();
  h.finish();
  assert.equal(h.state.position, 5);
  assert.equal(h.viewport.scrollLeft, 11 * 254);
  assert.deepEqual(h.visible(), [5, 0, 1, 2]);
  for (let index = 0; index < 19; index++) {
    const event = h.event(h.viewport, "keydown", { key: "ArrowRight" });
    assert.equal(event.defaultPrevented, true);
    h.finish();
    assert.equal(h.state.position, index % 6);
    assert.equal(h.viewport.scrollLeft, (6 + index % 6) * 254);
  }
  assert.equal(h.doc.activeElement, h.viewport);
});

test("hover, focus, and a hidden document suspend autoplay without changing the play preference", (t) => {
  const h = fixture(t);
  h.onscreen(true);
  const initial = h.viewport.scrollLeft;
  h.event(h.root, "pointerenter", { pointerType: "mouse" });
  h.tick(6000);
  assert.equal(h.viewport.scrollLeft, initial);
  assert.equal(h.state.autoplayEnabled, true);
  h.event(h.root, "pointerleave", { pointerType: "mouse" });
  h.event(h.root, "focusin");
  h.tick(6000);
  assert.equal(h.viewport.scrollLeft, initial);
  h.event(h.root, "focusout", { relatedTarget: null });
  h.doc.hidden = true;
  h.event(h.doc, "visibilitychange");
  h.tick(6000);
  assert.equal(h.viewport.scrollLeft, initial);
  h.doc.hidden = false;
  h.event(h.doc, "visibilitychange");
  h.tick(3000);
  assert.equal(h.viewport.scrollLeft, initial + 254);
});

test("manual navigation stays stopped through hover, visibility and resize until explicitly played", (t) => {
  const h = fixture(t);
  h.onscreen(true);
  h.carousel.next();
  h.finish();
  assert.equal(h.state.autoplayEnabled, false);
  h.event(h.root, "pointerenter", { pointerType: "mouse" });
  h.event(h.root, "pointerleave", { pointerType: "mouse" });
  h.onscreen(false);
  h.onscreen(true);
  h.resize(1000, 238, 16);
  const manualPosition = h.viewport.scrollLeft;
  h.tick(9000);
  assert.equal(h.viewport.scrollLeft, manualPosition);
  h.carousel.toggleAutoplay();
  h.tick(3000);
  assert.equal(h.viewport.scrollLeft, manualPosition + 254);
  h.carousel.toggleAutoplay();
  h.tick(9000);
  assert.equal(h.viewport.scrollLeft, manualPosition + 254);
});

test("touch, wheel, and product activation stop autoplay without cancelling native scrolling or links", (t) => {
  const h = fixture(t, { width: 350, cardWidth: 297.5, gap: 10 });
  h.onscreen(true);
  for (const [type, properties] of [["pointerdown", { pointerType: "touch" }], ["wheel", { deltaY: 120 }], ["click", {}], ["keydown", { key: "Enter" }]]) {
    const event = h.event(h.viewport, type, properties);
    assert.equal(event.defaultPrevented, false, `${type} keeps its browser default`);
    assert.equal(h.state.autoplayEnabled, false);
    h.event(h.doc, "pointercancel");
    h.tick(180);
    h.carousel.toggleAutoplay();
  }
  h.event(h.viewport, "pointerdown", { pointerType: "touch" });
  h.viewport.scrollLeft += 307.5;
  h.event(h.viewport, "scroll");
  h.event(h.doc, "pointerup");
  h.tick(180);
  assert.equal(h.state.position, 1);
  assert.deepEqual(h.visible(), [1, 2]);
  h.tick(9000);
  assert.equal(h.state.position, 1);
});

test("reduced motion disables autoplay and uses instant manual navigation, including preference changes", (t) => {
  const h = fixture(t, { reducedMotion: true });
  h.onscreen(true);
  const initial = h.viewport.scrollLeft;
  h.carousel.toggleAutoplay();
  h.tick(9000);
  assert.equal(h.state.autoplayEnabled, false);
  assert.equal(h.viewport.scrollLeft, initial);
  h.carousel.next();
  assert.equal(h.moves.at(-1).behavior, "instant");
  h.finish();
  h.motion.matches = false;
  h.event(h.motion, "change");
  assert.equal(h.state.autoplayEnabled, false); // Manual stop survives preference changes.
  h.carousel.toggleAutoplay();
  h.motion.matches = true;
  h.event(h.motion, "change");
  const stopped = h.viewport.scrollLeft;
  h.tick(9000);
  assert.equal(h.viewport.scrollLeft, stopped);
});

test("focused clone links remain accessible until focus moves and cleanup removes timers and observers", (t) => {
  const h = fixture(t);
  const slide = h.viewport.children[12];
  h.doc.activeElement = slide.children[0];
  h.viewport.scrollLeft = 12 * 254;
  h.finish();
  assert.equal(slide.inert, false);
  assert.equal(h.viewport.scrollLeft, 12 * 254);
  h.doc.activeElement = h.control;
  h.event(h.root, "focusout", { relatedTarget: h.control });
  assert.equal(h.viewport.scrollLeft, 6 * 254);
  h.onscreen(true);
  h.carousel.destroy();
  assert.equal(h.timers.size, 0);
  assert.equal(h.disconnected(), true);
  h.event(h.viewport, "click");
  assert.equal(h.state.autoplayEnabled, true);
});
