import { cn } from "@/lib/utils";

export type EnvelopeState = "paid" | "held" | "due" | "upcoming";

/**
 * One allowance = one envelope (amplop). A payment the contract refused gets
 * the DITAHAN stamp; a paid one a green seal. Decorative SVG, the state is
 * always also written in words next to it.
 */
export function Envelope({
  state,
  className,
  label,
  quiet = false,
}: {
  state: EnvelopeState;
  className?: string;
  label?: string;
  /** Small envelopes: a red seal instead of the text stamp (the parent draws one stamp). */
  quiet?: boolean;
}) {
  const faded = state === "upcoming";
  return (
    <div className={cn("relative inline-block", className)} aria-hidden>
      <svg viewBox="0 0 120 80" className={cn("w-full h-auto", faded && "opacity-45")}>
        <rect x="2" y="2" width="116" height="76" rx="6" className="fill-amplop stroke-amplop-deep" strokeWidth="2" />
        <path d="M4 6 L60 46 L116 6" fill="none" className="stroke-amplop-deep" strokeWidth="2" strokeLinejoin="round" />
        <path d="M4 76 L46 38 M116 76 L74 38" fill="none" className="stroke-amplop-deep" strokeWidth="1.5" opacity="0.6" />
        {state === "paid" && (
          <g>
            <circle cx="60" cy="47" r="13" className="fill-daun" />
            <path d="M53 47 l5 5 l9 -10" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        )}
        {state === "due" && <circle cx="60" cy="47" r="7" className="fill-tinta" />}
        {state === "held" && quiet && (
          <g>
            <circle cx="60" cy="47" r="13" className="fill-stempel" />
            <path d="M54 41 l12 12 M66 41 l-12 12" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
          </g>
        )}
      </svg>
      {state === "held" && !quiet && (
        <span className="stamp stamp-in absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-surface/85 text-stempel text-[10px] sm:text-xs">
          Ditahan
        </span>
      )}
      {label && (
        <span className="absolute -bottom-5 left-0 right-0 text-center font-mono text-[11px] text-muted tabular">{label}</span>
      )}
    </div>
  );
}
