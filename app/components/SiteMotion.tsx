"use client";

import { useEffect } from "react";

export default function SiteMotion({
  showLoader = true,
}: {
  showLoader?: boolean;
}) {
  useEffect(() => {
    document.body.classList.add("motion-ready");
    const revealItems = Array.from(
      document.querySelectorAll<HTMLElement>("[data-reveal]"),
    );
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
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
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
      revealObserver.disconnect();
      tiltItems.forEach((item) => {
        item.removeEventListener("pointermove", tiltVisual);
        item.removeEventListener("pointerleave", resetTilt);
      });
      document.body.classList.remove("motion-ready");
    };
  }, []);

  return (
    <>
      {showLoader && (
        <div className="site-loader" aria-hidden="true">
          <div className="loader-branding">
            <div className="loader-diagnosis-art">
              <i />
            </div>
            <div className="loader-branding-copy">
              <strong>
                <span>SH</span>
                <span className="loader-brand-plus">
                  <span>+</span>
                </span>
                <span>E DOCTOR</span>
              </strong>
              <span className="loader-branding-tagline">
                WE DIAGNOSE · WE CLEAN · WE RESTORE
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
