"use client";

import { motion, type Variants } from "framer-motion";
import { type ReactNode } from "react";
import { EASE_OUT } from "@/lib/motion";

const TAGS = {
  div: motion.div,
  section: motion.section,
  span: motion.span,
  article: motion.article,
  header: motion.header,
  footer: motion.footer,
  ul: motion.ul,
  li: motion.li,
  p: motion.p,
  h2: motion.h2,
  h3: motion.h3,
  figure: motion.figure,
  nav: motion.nav,
} as const;

interface RevealProps {
  children: ReactNode;
  className?: string;
  /** Stagger offset in ms. */
  delay?: number;
  /** Element to render. Defaults to a div. */
  as?: keyof typeof TAGS;
  /** Re-hide when scrolled out of view. Defaults to one-shot. */
  once?: boolean;
  /** Intersection amount (0..1). */
  amount?: number;
  /** Vertical travel in px (defaults to 18). */
  y?: number;
  id?: string;
}

/**
 * Scroll reveal powered by Framer Motion. Settles in with a fade + lift when it
 * enters the viewport. Reduced-motion is handled globally by MotionConfig
 * (`reducedMotion="user"`), which strips the transform and keeps the fade.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  as = "div",
  once = true,
  amount = 0.18,
  y = 18,
  id,
}: RevealProps) {
  const Tag = TAGS[as] ?? motion.div;
  const variants: Variants = {
    hidden: { opacity: 0, y },
    show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE_OUT, delay: delay / 1000 } },
  };

  return (
    <Tag
      id={id}
      className={className}
      variants={variants}
      initial="hidden"
      whileInView="show"
      viewport={{ once, amount }}
    >
      {children}
    </Tag>
  );
}
