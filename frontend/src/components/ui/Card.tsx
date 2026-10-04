import { cn } from "@/lib/utils";

interface CardProps {
  className?: string;
  children: React.ReactNode;
  variant?: "white" | "soft" | "accent" | "ink";
  interactive?: boolean;
  glow?: boolean;
  onClick?: () => void;
}

export function Card({
  className,
  children,
  variant = "white",
  interactive,
  glow,
  onClick,
}: CardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "relative rounded-3xl p-5 overflow-hidden transition-[transform,box-shadow,border-color] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]",
        variant === "white" &&
          "bg-surface border border-cream-300/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_4px_12px_rgba(58,53,48,0.06)]",
        variant === "soft" && "bg-surface-soft border border-line",
        (variant === "accent" || variant === "ink") &&
          "bg-shadow-900 text-cream-100 shadow-[0_12px_32px_rgba(58,53,48,0.12),inset_0_1px_0_rgba(255,255,255,0.07),inset_0_55px_90px_-55px_rgba(199,122,58,0.22)]",
        glow && "ring-1 ring-amber-200/60 shadow-glow-amber",
        interactive &&
          "cursor-pointer hover:-translate-y-1 hover:shadow-lift active:translate-y-0 active:scale-[0.995]",
        onClick && "cursor-pointer",
        className
      )}
    >
      {children}
    </div>
  );
}
