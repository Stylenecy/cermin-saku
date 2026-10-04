import { Logo } from "@/components/ui/Logo";

export function Footer() {
  return (
    <footer className="border-t border-line/60 bg-surface/50 py-10">
      <div className="mx-auto max-w-6xl px-5 sm:px-8 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-3">
          <Logo />
          <span className="text-xs text-muted">Self-driving BNB banking on BNB Chain</span>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted">
          <a
            href="https://docs.bnbchain.org/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-ink transition-colors"
          >
            BNB Chain docs ↗
          </a>
          <a
            href="https://testnet.bscscan.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-ink transition-colors"
          >
            BscScan ↗
          </a>
          <a
            href="https://www.bnbchain.org/en/testnet-faucet"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-ink transition-colors"
          >
            Testnet faucet ↗
          </a>
        </div>
      </div>
    </footer>
  );
}
