import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Cermin Saku lockup: Kiel's Cermin "C-mirror" mark (kept as a sign of where
 * the engine comes from) + a typographic wordmark. No new pictorial logo.
 */
export function Logo({
  className,
  withWordmark = true,
  size = 28,
}: {
  className?: string;
  withWordmark?: boolean;
  size?: number;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <Image src="/logo.png" alt="" width={size} height={size} className="object-contain" />
      {withWordmark && (
        <span className="text-[17px] leading-none tracking-[-0.02em] text-ink">
          <span className="font-semibold">Cermin</span> <span className="font-extrabold text-tinta">Saku</span>
        </span>
      )}
    </span>
  );
}
