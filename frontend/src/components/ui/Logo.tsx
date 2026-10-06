import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Cermin Saku lockup — Cermin's "C-mirror" mark (public/logo.png, transparent)
 * plus the serif wordmark, "Saku" set in italic lake blue.
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
        alt="Cermin Saku"
        width={size}
        height={size}
        className="object-contain"
      />
      {withWordmark && (
        <span className="font-serif font-medium text-ink tracking-tight text-[17px] leading-none">
          Cermin <em className="font-normal italic text-amber-600">Saku</em>
        </span>
      )}
    </span>
  );
}
