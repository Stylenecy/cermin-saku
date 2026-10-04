"use client";

import { animate, useInView, useReducedMotion } from "framer-motion";
import { useEffect, useRef } from "react";
import { EASE_OUT } from "@/lib/motion";

interface AnimatedNumberProps {
  value: number;
  format: (n: number) => string;
  className?: string;
  durationMs?: number;
}

/**
 * A financial figure that counts up to its value the first time it scrolls into
 * view, then tweens smoothly on live updates. Writes directly to the DOM node so
 * we don't re-render every frame. Reduced-motion users snap straight to value.
 */
export function AnimatedNumber({ value, format, className, durationMs = 1100 }: AnimatedNumberProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -10% 0px" });
  const reduce = useReducedMotion();
  const fromRef = useRef(0);
  const formatRef = useRef(format);
  formatRef.current = format;

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (reduce || !Number.isFinite(value)) {
      node.textContent = formatRef.current(value);
      fromRef.current = Number.isFinite(value) ? value : 0;
      return;
    }
    if (!inView) {
      // Below the fold: show the real value immediately so a live balance never
      // stays stuck at format(0). The count-up still plays the first time it
      // scrolls into view (fromRef resets there only if it was still 0).
      node.textContent = formatRef.current(value);
      fromRef.current = value;
      return;
    }
    const controls = animate(fromRef.current, value, {
      duration: durationMs / 1000,
      ease: EASE_OUT,
      onUpdate: (v) => {
        fromRef.current = v;
        if (ref.current) ref.current.textContent = formatRef.current(v);
      },
    });
    return () => controls.stop();
  }, [inView, value, reduce, durationMs]);

  return (
    <span ref={ref} className={className}>
      {format(reduce ? value : 0)}
    </span>
  );
}
