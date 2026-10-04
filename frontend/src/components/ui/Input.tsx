"use client";

import { cn } from "@/lib/utils";
import { InputHTMLAttributes, forwardRef } from "react";

interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "prefix"> {
  variant?: "default" | "big" | "ghost";
  suffix?: React.ReactNode;
  prefix?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, variant = "default", suffix, prefix, ...props }, ref) => {
    return (
      <div className="relative w-full">
        {prefix && (
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted text-sm">
            {prefix}
          </span>
        )}
        <input
          ref={ref}
          className={cn(
            "w-full rounded-2xl bg-surface text-ink caret-amber-500 placeholder:text-muted-2 outline-none transition-all duration-200",
            "border border-cream-300 hover:border-cream-400 focus:border-amber-300 focus:shadow-ring",
            variant === "default" && "h-12 px-4 text-sm",
            variant === "big" &&
              "h-20 px-5 text-3xl font-semibold tabular-nums tracking-tight",
            variant === "ghost" &&
              "bg-surface-soft border-transparent h-11 px-4 text-sm",
            prefix && "pl-9",
            suffix && "pr-14",
            className
          )}
          {...props}
        />
        {suffix && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted text-sm font-medium pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";
export { Input };
