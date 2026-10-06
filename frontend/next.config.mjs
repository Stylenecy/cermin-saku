/** @type {import('next').NextConfig} */
const nextConfig = {
  // The no-wallet proof page moved from /bukti to /demo; old links (README, video) keep working.
  async redirects() {
    return [{ source: "/bukti", destination: "/demo", permanent: false }];
  },
  webpack: (config) => {
    // Optional peer deps pulled in by WalletConnect / MetaMask SDK that we
    // never use in the browser. Externalizing them silences noisy
    // "Module not found" warnings during build.
    config.externals.push("pino-pretty", "lokijs", "encoding");
    config.resolve.fallback = {
      ...config.resolve.fallback,
      "@react-native-async-storage/async-storage": false,
    };
    // Privy's optional peers for features we don't use (Solana, Abstract and
    // Farcaster wallets, ERC-4337 smart wallets): stubbed out of the bundle.
    config.resolve.alias = {
      ...config.resolve.alias,
      "@abstract-foundation/agw-client": false,
      "@farcaster/mini-app-solana": false,
      "@solana-program/memo": false,
      permissionless: false,
    };
    return config;
  },
};

export default nextConfig;
