"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { mountCareCarousel, type CareCarouselState } from "@/lib/home-care-carousel";
import styles from "./HomeCareEssentials.module.css";

export default function HomeCareCarousel({ cards, action }: { cards: ReactNode[]; action: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const controller = useRef<ReturnType<typeof mountCareCarousel> | null>(null);
  const [state, setState] = useState<CareCarouselState>({ canScroll: false, autoplayEnabled: true, reducedMotion: false, position: 0 });

  useEffect(() => {
    if (!root.current || !viewport.current) return;
    const section = root.current.closest("section") ?? root.current;
    const carousel = mountCareCarousel(section, viewport.current, cards.length, setState);
    controller.current = carousel;
    return () => {
      carousel.destroy();
      controller.current = null;
    };
  }, [cards.length]);

  return (
    <div aria-label="Care essentials products" aria-roledescription="carousel" className={styles.carousel} ref={root} role="group">
      <div className={styles.controls} hidden={!state.canScroll}>
        <button aria-controls="care-essentials-products" aria-label="Previous product" onClick={() => controller.current?.previous()} type="button">
          <svg aria-hidden="true" viewBox="0 0 24 24"><path d="m14 6-6 6 6 6" /></svg>
        </button>
        <button aria-controls="care-essentials-products" aria-label="Next product" onClick={() => controller.current?.next()} type="button">
          <svg aria-hidden="true" viewBox="0 0 24 24"><path d="m10 6 6 6-6 6" /></svg>
        </button>
      </div>

      <div aria-label="Products; use left and right arrow keys to browse" className={styles.viewport} id="care-essentials-products" ref={viewport} role="group" tabIndex={state.canScroll ? 0 : -1}>
        {[0, 1, 2].map((copy) => cards.map((card, index) => (
          <div
            aria-hidden={copy !== 1 ? true : undefined}
            aria-label={`${index + 1} of ${cards.length}`}
            aria-roledescription="slide"
            className={styles.slide}
            hidden={copy !== 1}
            inert={copy !== 1}
            key={`${copy}-${index}`}
            role="group"
          >{card}</div>
        )))}
      </div>
      <p aria-atomic="true" aria-live={state.autoplayEnabled ? "off" : "polite"} className={styles.srOnly}>
        Product {state.position + 1} of {cards.length}
      </p>
      <div className={styles.actions}>{action}</div>
    </div>
  );
}
