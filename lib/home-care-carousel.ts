export type CareCarouselState = {
  canScroll: boolean;
  autoplayEnabled: boolean;
  reducedMotion: boolean;
  position: number;
};

const AUTOPLAY_DELAY = 3000;
const SCROLL_IDLE_DELAY = 180;

/** Native scrolling owns gestures and links; only the resting loop position is rebased. */
export function mountCareCarousel(
  root: HTMLElement,
  viewport: HTMLElement,
  count: number,
  onChange: (state: CareCarouselState) => void,
) {
  const slides = Array.from(viewport.children) as HTMLElement[];
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let step = 0;
  let cardWidth = 0;
  let canScroll = false;
  let autoplayRequested = true;
  let hovered = root.matches(":hover");
  let focused = root.contains(document.activeElement);
  let onscreen = false;
  let scrolling = false;
  let pointerDown = false;
  let position = 0;
  let autoplayTimer: number | undefined;
  let idleTimer: number | undefined;
  let rebaseTarget: number | undefined;
  let lastState = "";
  const removers: (() => void)[] = [];
  const wrap = (index: number) => ((index % count) + count) % count;

  function publish() {
    const state = { canScroll, autoplayEnabled: autoplayRequested && !motion.matches, reducedMotion: motion.matches, position };
    const serialized = JSON.stringify(state);
    if (serialized !== lastState) {
      lastState = serialized;
      onChange(state);
    }
  }

  function syncAccessibility() {
    slides.forEach((slide, index) => {
      const left = (canScroll ? index : index - count) * step - viewport.scrollLeft;
      const visible = !slide.hidden && left + cardWidth > 1 && left < viewport.clientWidth - 1;
      // Never hide a focused link from assistive technology during a gesture.
      const accessible = visible || slide.contains(document.activeElement);
      slide.inert = !accessible;
      slide.setAttribute("aria-hidden", String(!accessible));
    });
  }

  function rebase(left: number) {
    rebaseTarget = left;
    viewport.scrollTo({ left, behavior: "instant" });
  }

  function settle() {
    window.clearTimeout(idleTimer);
    scrolling = false;
    if (!step) return;
    const physicalIndex = Math.round(viewport.scrollLeft / step);
    position = wrap(physicalIndex);
    const linkFocused = document.activeElement !== viewport && viewport.contains(document.activeElement);
    if (canScroll && !pointerDown && !linkFocused &&
        (physicalIndex < count || physicalIndex >= count * 2)) {
      // Both copies have identical geometry/content. An instant rebase is invisible.
      rebase((count + position) * step);
    }
    syncAccessibility();
    publish();
  }

  function move(direction: number) {
    if (!canScroll || !step || scrolling || pointerDown) return;
    const current = Math.round(viewport.scrollLeft / step);
    scrolling = true;
    viewport.scrollTo({ left: (current + direction) * step, behavior: motion.matches ? "instant" : "smooth" });
    // Also covers reduced motion and engines without the scrollend event.
    window.clearTimeout(idleTimer);
    idleTimer = window.setTimeout(settle, SCROLL_IDLE_DELAY);
  }

  function syncAutoplay() {
    window.clearInterval(autoplayTimer);
    autoplayTimer = undefined;
    if (canScroll && autoplayRequested && !motion.matches && onscreen && !document.hidden && !hovered && !focused) {
      autoplayTimer = window.setInterval(() => move(1), AUTOPLAY_DELAY);
    }
    publish();
  }

  function stopAutoplay() {
    autoplayRequested = false;
    syncAutoplay();
  }

  function measure() {
    if (!count) return;
    cardWidth = slides[count].getBoundingClientRect().width;
    const gap = Number.parseFloat(window.getComputedStyle(viewport).columnGap) || 0;
    step = cardWidth + gap;
    if (!cardWidth) return;
    const capacity = Math.max(1, Math.floor((viewport.clientWidth + gap + 1) / step));
    canScroll = count > capacity;
    slides.forEach((slide, index) => {
      slide.hidden = !canScroll && (index < count || index >= count * 2);
    });
    if (!canScroll) position = 0;
    rebase((canScroll ? count + position : 0) * step);
    scrolling = false;
    syncAccessibility();
    syncAutoplay();
  }

  function listen(target: EventTarget, type: string, listener: EventListener, options?: AddEventListenerOptions) {
    target.addEventListener(type, listener, options);
    removers.push(() => target.removeEventListener(type, listener, options));
  }

  listen(viewport, "scroll", () => {
    if (rebaseTarget !== undefined) {
      const rebased = Math.abs(viewport.scrollLeft - rebaseTarget) < 1;
      rebaseTarget = undefined;
      if (rebased) {
        scrolling = false;
        syncAccessibility();
        return;
      }
    }
    scrolling = true;
    syncAccessibility();
    window.clearTimeout(idleTimer);
    idleTimer = window.setTimeout(settle, SCROLL_IDLE_DELAY);
  }, { passive: true });
  listen(viewport, "scrollend", settle);
  listen(viewport, "pointerdown", () => {
    pointerDown = true;
    stopAutoplay();
  }, { passive: true });
  const releasePointer = () => {
    if (!pointerDown) return;
    pointerDown = false;
    window.clearTimeout(idleTimer);
    idleTimer = window.setTimeout(settle, SCROLL_IDLE_DELAY);
  };
  listen(document, "pointerup", releasePointer, { passive: true });
  listen(document, "pointercancel", releasePointer, { passive: true });
  listen(viewport, "wheel", stopAutoplay, { passive: true });
  listen(viewport, "click", stopAutoplay);
  listen(viewport, "keydown", (event) => {
    const key = event as KeyboardEvent;
    if (key.altKey || key.ctrlKey || key.metaKey || key.shiftKey || key.key === "Tab") return;
    stopAutoplay();
    if (key.key !== "ArrowLeft" && key.key !== "ArrowRight") return;
    if (!canScroll) return;
    key.preventDefault();
    // Keep keyboard focus stable while the visible set of product links changes.
    viewport.focus({ preventScroll: true });
    move(key.key === "ArrowLeft" ? -1 : 1);
  });
  listen(root, "pointerenter", (event) => {
    if ((event as PointerEvent).pointerType !== "mouse") return;
    hovered = true;
    syncAutoplay();
  });
  listen(root, "pointerleave", (event) => {
    if ((event as PointerEvent).pointerType !== "mouse") return;
    hovered = false;
    syncAutoplay();
  });
  listen(root, "focusin", () => {
    focused = true;
    syncAutoplay();
  });
  listen(root, "focusout", (event) => {
    focused = root.contains((event as FocusEvent).relatedTarget as Node | null);
    settle();
    syncAutoplay();
  });
  listen(document, "visibilitychange", syncAutoplay);
  listen(motion, "change", () => {
    if (motion.matches && step) {
      // Cancel a smooth scroll immediately when the system preference changes.
      viewport.scrollTo({ left: Math.round(viewport.scrollLeft / step) * step, behavior: "instant" });
      settle();
    }
    syncAutoplay();
  });

  const visibility = new IntersectionObserver(([entry]) => {
    onscreen = entry.isIntersecting && entry.intersectionRatio > 0;
    syncAutoplay();
  });
  const resize = new ResizeObserver(measure);
  visibility.observe(root);
  resize.observe(viewport);
  measure();

  return {
    previous() { stopAutoplay(); move(-1); },
    next() { stopAutoplay(); move(1); },
    toggleAutoplay() {
      if (motion.matches || !canScroll) return;
      autoplayRequested = !autoplayRequested;
      syncAutoplay();
    },
    destroy() {
      window.clearInterval(autoplayTimer);
      window.clearTimeout(idleTimer);
      visibility.disconnect();
      resize.disconnect();
      removers.forEach((remove) => remove());
    },
  };
}
