"use client";

import { useEffect, useRef } from "react";

type UseAutoScrollOptions = {
  enabled?: boolean;
  behavior?: ScrollBehavior;
};

/**
 * Scrolls a container to the bottom when dependencies change.
 * Respects prefers-reduced-motion via the behavior option from the caller.
 */
export function useAutoScroll<T extends HTMLElement>(
  dependency: unknown,
  options: UseAutoScrollOptions = {},
) {
  const { enabled = true, behavior = "smooth" } = options;
  const ref = useRef<T | null>(null);

  useEffect(() => {
    if (!enabled || !ref.current) return;

    const node = ref.current;
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    node.scrollTo({
      top: node.scrollHeight,
      behavior: prefersReduced ? "auto" : behavior,
    });
  }, [dependency, enabled, behavior]);

  return ref;
}
