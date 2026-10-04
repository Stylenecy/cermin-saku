"use client";

import { ReactLenis } from "lenis/react";
import { MotionConfig, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

/**
 * Wraps the app in Lenis smooth scroll + a global MotionConfig.
 *
 * Reduced-motion users get native scroll (no Lenis) and Framer auto-strips
 * transforms via `reducedMotion="user"`. This sits INSIDE Web3Provider, so the
 * rare reduced-motion remount never tears down the wallet connection.
 */
export function SmoothScroll({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();

  return (
    <MotionConfig reducedMotion="user">
      {/* Always render the same ReactLenis wrapper so the tree shape stays stable
          across the reduced-motion hydration flip — a conditional wrapper would
          remount the whole subtree and reset in-progress UI (e.g. the wizard).
          Reduced-motion users get effectively instant scroll (lerp 1, no wheel
          smoothing) without tearing down the tree. */}
      <ReactLenis
        root
        options={{
          lerp: reduce ? 1 : 0.085,
          smoothWheel: !reduce,
          wheelMultiplier: 1,
          touchMultiplier: 1.4,
        }}
      >
        {children}
      </ReactLenis>
    </MotionConfig>
  );
}
