// Sign-in with Privy (Google, email, or a wallet) when an app id is configured;
// otherwise the app falls back to RainbowKit's wallet-only connect.
// The app id is public (it ships in the browser bundle), like the contract addresses.
export const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID || "";
export const PRIVY_ENABLED = PRIVY_APP_ID.length > 0;
