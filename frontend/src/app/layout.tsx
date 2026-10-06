import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Plus_Jakarta_Sans } from "next/font/google";
import "lenis/dist/lenis.css";
import "./globals.css";
import { Web3Provider } from "@/components/providers/Web3Provider";
import { SmoothScroll } from "@/components/providers/SmoothScroll";
import { LangProvider } from "@/lib/i18n";

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});
// Plus Jakarta Sans — by Tokotype (Indonesia), made for Jakarta's city identity. OFL.
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://cermin-saku.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Cermin Saku — uang saku dari BNB, yang tahu kapan harus menahan diri",
  description:
    "Scheduled allowances paid from a BNB vault on BNB Chain, refused on-chain when the vault is not safe. Built on Cermin by Kiel (MIT). Testnet demo.",
  openGraph: {
    title: "Cermin Saku",
    description:
      "Uang saku terjadwal dari vault BNB. Kontrak menahan pembayaran kalau posisi tidak aman. BNB tidak pernah dijual.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#F3F6FA",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // The font variables sit on <html> so the @theme tokens (--font-sans/--font-mono, defined on :root) can resolve them.
    <html lang="id" className={`${jakarta.variable} ${geistMono.variable}`}>
      <body className="text-ink antialiased font-sans">
        <LangProvider>
          <Web3Provider>
            <SmoothScroll>{children}</SmoothScroll>
          </Web3Provider>
        </LangProvider>
      </body>
    </html>
  );
}
