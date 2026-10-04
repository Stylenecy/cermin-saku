export function TrustStrip() {
  const items = [
    "CDP Trove · BNB collateral",
    "MUSD · 1% APR fixed borrow",
    "sMUSD · ~5% native yield",
    "PriceFeed · on-chain oracle",
    "Self-driving · no custody",
    "Liquidation-defended",
  ];
  return (
    <section className="border-y border-line/70 bg-surface/50 overflow-hidden">
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-20 bg-gradient-to-r from-canvas to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-20 bg-gradient-to-l from-canvas to-transparent" />
        <div className="flex animate-marquee whitespace-nowrap">
          {[...items, ...items].map((it, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-3 px-6 py-4 text-sm text-muted font-mono"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              {it}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
