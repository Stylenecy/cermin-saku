import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "amber" | "success" | "warning" | "danger" | "info" | "ink";
  className?: string;
}

export function Badge({
  children,
  variant = "default",
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium tracking-tight whitespace-nowrap",
        variant === "default" && "bg-surface-soft text-ink ring-1 ring-inset ring-line",
        variant === "amber" && "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200/60",
        variant === "success" && "bg-success/12 text-success ring-1 ring-inset ring-success/20",
        variant === "warning" && "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200/60",
        variant === "danger" && "bg-danger/10 text-danger ring-1 ring-inset ring-danger/20",
        variant === "info" && "bg-info/10 text-info ring-1 ring-inset ring-info/20",
        variant === "ink" && "bg-shadow-900 text-cream-100",
        className
      )}
    >
      {children}
    </span>
  );
}
