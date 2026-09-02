"use client";

import { useEffect } from "react";

/**
 * Enhances already-visible public content after hydration. It deliberately
 * never renders a loader, so a slow script, missing observer, or reduced
 * motion preference cannot hold the page behind a client-side gate.
 */
export default function SiteMotion() {
  useEffect(() => {
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const revealItems = Array.from(
      document.querySelectorAll<HTMLElement>("[data-reveal]"),
    );
    const revealObserver =
      !reducedMotion && typeof IntersectionObserver === "function"
        ? new IntersectionObserver(
            (entries, observer) => {
              entries.forEach((entry) => {
                if (entry.isIntersecting) {
                  entry.target.classList.add("is-revealed");
                  observer.unobserve(entry.target);
                }
              });
            },
            { threshold: 0.12, rootMargin: "0px 0px -40px" },
          )
        : null;

    if (revealObserver) {
      document.body.classList.add("motion-ready");
      revealItems.forEach((item) => revealObserver.observe(item));
    } else {
      revealItems.forEach((item) => item.classList.add("is-revealed"));
    }

    const revealFallback = revealObserver
      ? window.setTimeout(() => {
          revealItems.forEach((item) => item.classList.add("is-revealed"));
        }, 900)
      : null;

    const finePointer = window.matchMedia("(pointer: fine)").matches;
    const tiltItems = Array.from(
      document.querySelectorAll<HTMLElement>("[data-tilt]"),
    );

    function tiltVisual(event: PointerEvent) {
      const element = event.currentTarget as HTMLElement;
      const bounds = element.getBoundingClientRect();
      const x = (event.clientX - bounds.left) / bounds.width - 0.5;
      const y = (event.clientY - bounds.top) / bounds.height - 0.5;
      element.style.setProperty("--tilt-x", `${x * 12}deg`);
      element.style.setProperty("--tilt-y", `${y * -9}deg`);
      element.style.setProperty("--move-x", `${x * 16}px`);
      element.style.setProperty("--move-y", `${y * 12}px`);
    }

    function resetTilt(event: PointerEvent) {
      const element = event.currentTarget as HTMLElement;
      element.style.setProperty("--tilt-x", "0deg");
      element.style.setProperty("--tilt-y", "0deg");
      element.style.setProperty("--move-x", "0px");
      element.style.setProperty("--move-y", "0px");
    }

    if (finePointer && !reducedMotion) {
      tiltItems.forEach((item) => {
        item.addEventListener("pointermove", tiltVisual);
        item.addEventListener("pointerleave", resetTilt);
      });
    }

    return () => {
      if (revealFallback !== null) window.clearTimeout(revealFallback);
      revealObserver?.disconnect();
      tiltItems.forEach((item) => {
        item.removeEventListener("pointermove", tiltVisual);
        item.removeEventListener("pointerleave", resetTilt);
      });
      document.body.classList.remove("motion-ready");
    };
  }, []);

  return null;
}
