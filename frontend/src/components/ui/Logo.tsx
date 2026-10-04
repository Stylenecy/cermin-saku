import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Cermin brand lockup — the "C-mirror" mark (public/logo.png, transparent)
 * plus the serif wordmark. next/image serves an optimized/webp version.
 */
export function Logo({
  className,
  withWordmark = true,
  size = 32,
}: {
  className?: string;
  withWordmark?: boolean;
  size?: number;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <Image
        src="/logo.png"
        alt="Cermin"
        width={size}
        height={size}
        className="object-contain"
      />
      {withWordmark && (
        <span className="font-serif font-medium text-ink tracking-tight text-[17px] leading-none">
          Cermin
        </span>
      )}
    </span>
  );
}
