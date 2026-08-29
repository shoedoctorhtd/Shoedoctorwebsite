"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type CartLine = { productSlug: string; quantity: number };

type CartContextValue = {
  lines: CartLine[];
  hydrated: boolean;
  add: (productSlug: string, quantity: number, available: number) => void;
  setQuantity: (productSlug: string, quantity: number, available: number) => void;
  remove: (productSlug: string) => void;
  clear: () => void;
};

const STORAGE_KEY = "shoe-doctor-product-cart-v1";
const CartContext = createContext<CartContextValue | null>(null);

function readCart(): CartLine[] {
  try {
    const value = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]") as unknown;
    if (!Array.isArray(value)) return [];
    const lines = new Map<string, number>();
    value.forEach((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return;
      const record = item as Record<string, unknown>;
      const productSlug = typeof record.productSlug === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(record.productSlug)
        ? record.productSlug : null;
      const quantity = Number(record.quantity);
      if (!productSlug || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 100) return;
      lines.set(productSlug, Math.min(100, (lines.get(productSlug) ?? 0) + quantity));
    });
    return [...lines.entries()].map(([productSlug, quantity]) => ({ productSlug, quantity })).slice(0, 20);
  } catch {
    return [];
  }
}

function persistCart(lines: CartLine[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  window.dispatchEvent(new Event("sd-product-cart-changed"));
}

export function ProductCartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Defer hydration until after the initial server/client render agrees.
    // This keeps the cart local to the browser without a hydration mismatch.
    const frame = window.requestAnimationFrame(() => {
      setLines(readCart());
      setHydrated(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const write = useCallback((next: CartLine[]) => {
    setLines(next);
    persistCart(next);
  }, []);

  const value = useMemo<CartContextValue>(() => ({
    lines,
    hydrated,
    add(productSlug, quantity, available) {
      if (available < 1) return;
      const existing = lines.find((line) => line.productSlug === productSlug)?.quantity ?? 0;
      const nextQuantity = Math.max(1, Math.min(available, 100, existing + quantity));
      write([...lines.filter((line) => line.productSlug !== productSlug), { productSlug, quantity: nextQuantity }]);
    },
    setQuantity(productSlug, quantity, available) {
      if (quantity <= 0 || available <= 0) {
        write(lines.filter((line) => line.productSlug !== productSlug));
        return;
      }
      const nextQuantity = Math.max(1, Math.min(available, 100, quantity));
      write(lines.map((line) => line.productSlug === productSlug ? { ...line, quantity: nextQuantity } : line));
    },
    remove(productSlug) {
      write(lines.filter((line) => line.productSlug !== productSlug));
    },
    clear() {
      write([]);
    },
  }), [hydrated, lines, write]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useProductCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("ProductCartProvider is required for cart controls.");
  return context;
}

export function AddToCartButton({
  productSlug,
  stockQuantity,
  className,
}: {
  productSlug: string;
  stockQuantity: number | null;
  className?: string;
}) {
  const { add } = useProductCart();
  const [added, setAdded] = useState(false);
  const available = Math.max(0, stockQuantity ?? 0);
  return (
    <button
      type="button"
      className={className}
      disabled={available < 1}
      onClick={() => {
        add(productSlug, 1, available);
        setAdded(true);
        window.setTimeout(() => setAdded(false), 1600);
      }}
    >
      {available < 1 ? "Out of Stock" : added ? "Added to Cart" : "Add to Cart"}
    </button>
  );
}

/** Header remains usable on public pages that do not render a cart provider. */
export function CartHeaderLink() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const refresh = () => setCount(readCart().reduce((sum, line) => sum + line.quantity, 0));
    refresh();
    window.addEventListener("sd-product-cart-changed", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("sd-product-cart-changed", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  return (
    <a className="sd-header-cart" href="/cart" aria-label={`Shopping cart${count ? `, ${count} items` : ""}`}>
      Cart{count ? <span>{count}</span> : null}
    </a>
  );
}
