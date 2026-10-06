"use client";

import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "soft" | "danger";
export type ButtonSize = "sm" | "md" | "lg" | "xl";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: boolean;
}

export function buttonClasses({
  variant = "primary",
  size = "md",
  icon = false,
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: boolean;
  className?: string;
}): string {
  return cn(
    "relative inline-flex items-center justify-center gap-2 font-medium tracking-tight rounded-full select-none cursor-pointer",
    "transition-[transform,box-shadow,background-color,border-color,color] duration-200 ease-[cubic-bezier(0.2,0.8,0.2,1)] will-change-transform",
    "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:shadow-none",
    "focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-200/50",
    variant === "primary" &&
      "text-white bg-gradient-to-b from-shadow-700 to-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_8px_20px_-10px_rgba(31,27,23,0.55)] hover:from-shadow-500 hover:to-ink-2 hover:-translate-y-px hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_16px_30px_-12px_rgba(31,27,23,0.55)] active:translate-y-0 active:scale-[0.985]",
    variant === "secondary" &&
      "bg-surface text-ink border border-cream-300 shadow-sm hover:border-amber-200 hover:-translate-y-px hover:shadow-soft active:translate-y-0 active:scale-[0.985]",
    variant === "soft" &&
      "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200/50 hover:bg-amber-100 active:scale-[0.985]",
    variant === "ghost" && "text-ink hover:bg-surface-soft active:scale-[0.985]",
    variant === "danger" &&
      "text-cream-50 bg-gradient-to-b from-[#B85546] to-danger shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_8px_20px_-10px_rgba(168,74,58,0.5)] hover:-translate-y-px hover:shadow-[0_16px_30px_-12px_rgba(168,74,58,0.55)] active:translate-y-0 active:scale-[0.985]",
    icon && "rounded-full p-0",
    !icon && size === "sm" && "h-9 px-4 text-sm",
    !icon && size === "md" && "h-11 px-5 text-sm",
    !icon && size === "lg" && "h-12 px-6 text-base",
    !icon && size === "xl" && "h-14 px-7 text-base",
    icon && size === "sm" && "h-9 w-9",
    icon && size === "md" && "h-11 w-11",
    icon && size === "lg" && "h-12 w-12",
    icon && size === "xl" && "h-14 w-14",
    className,
  );
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = "primary", size = "md", loading, icon, children, disabled, ...props },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={buttonClasses({ variant, size, icon, className })}
        {...props}
      >
        {loading ? (
          <>
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            {children}
          </>
        ) : (
          children
        )}
      </button>
    );
  },
);
Button.displayName = "Button";
export { Button };
