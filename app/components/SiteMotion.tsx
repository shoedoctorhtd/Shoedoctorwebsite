"use client";

import { useEffect } from "react";

/**
 * Enhances already-visible public content after paint. There is deliberately
 * no blocking loader: direct links and no-JavaScript visits render the same
 * readable document immediately.
 */
export default function SiteMotion() {
  useEffect(() => {
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const revealItems = Array.from(
      document.querySelectorAll<HTMLElement>("[data-reveal]"),
    );
    const revealAll = () => {
      revealItems.forEach((item) => item.classList.add("is-revealed"));
    };

    if (reducedMotion || !("IntersectionObserver" in window)) {
      revealAll();
      return;
    }

    document.body.classList.add("motion-ready");
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-revealed");
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px" },
    );
    revealItems.forEach((item) => revealObserver.observe(item));

    const finePointer = window.matchMedia("(pointer: fine)").matches;
    const tiltItems = Array.from(
      document.querySelectorAll<HTMLElement>("[data-tilt]"),
    );
    const revealFallback = window.setTimeout(revealAll, 700);

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

    if (finePointer) {
      tiltItems.forEach((item) => {
        item.addEventListener("pointermove", tiltVisual);
        item.addEventListener("pointerleave", resetTilt);
      });
    }

    return () => {
      window.clearTimeout(revealFallback);
      revealObserver.disconnect();
      tiltItems.forEach((item) => {
        item.removeEventListener("pointermove", tiltVisual);
        item.removeEventListener("pointerleave", resetTilt);
      });
      document.body.classList.remove("motion-ready");
    };
  }, []);

  return null;
}
