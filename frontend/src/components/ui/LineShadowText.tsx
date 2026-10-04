import type { CSSProperties, ElementType, HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface LineShadowTextProps extends HTMLAttributes<HTMLElement> {
  children: string;
  shadowColor?: string;
  as?: ElementType;
}

/* Animated diagonal "line shadow" trailing a word — a CSS-only effect: a
   ::after clone of the text (via attr(data-text)) is filled with a striped
   gradient clipped to the glyphs, offset slightly, and scrolled forever by the
   line-shadow keyframe. Adapted from the OwnaFarm landing. */
export function LineShadowText({
  children,
  shadowColor = "#C77A3A",
  className,
  as: Component = "span",
  ...props
}: LineShadowTextProps) {
  return (
    <Component
      style={{ "--shadow-color": shadowColor } as CSSProperties}
      data-text={children}
      className={cn(
        "relative z-0 inline-flex",
        "after:absolute after:top-[0.04em] after:left-[0.04em] after:content-[attr(data-text)]",
        "after:bg-[linear-gradient(45deg,transparent_45%,var(--shadow-color)_45%,var(--shadow-color)_55%,transparent_0)]",
        "after:[background-size:0.06em_0.06em] after:-z-10 after:bg-clip-text after:text-transparent",
        "after:animate-line-shadow",
        className,
      )}
      {...props}
    >
      {children}
    </Component>
  );
}
