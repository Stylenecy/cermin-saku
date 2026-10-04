import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Fraunces } from "next/font/google";
import "lenis/dist/lenis.css";
import "./globals.css";
import { Web3Provider } from "@/components/providers/Web3Provider";
import { SmoothScroll } from "@/components/providers/SmoothScroll";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  style: ["normal", "italic"],
  axes: ["opsz", "SOFT", "WONK"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Cermin — Your BNB stays whole.",
  description:
    "Self-driving BNB banking on BNB Chain. Deposit BNB once, receive a dollar allowance forever — without ever selling your BNB.",
  openGraph: {
    title: "Cermin",
    description: "Your BNB stays whole. The Shadow is what you live on.",
  },
};

export const viewport: Viewport = {
  themeColor: "#FAF6F0",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} text-ink antialiased font-sans`}
      >
        <Web3Provider>
          <SmoothScroll>{children}</SmoothScroll>
        </Web3Provider>
        <div aria-hidden className="grain" />
      </body>
    </html>
  );
}
