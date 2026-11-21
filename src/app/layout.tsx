import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", display: "swap", weight: ["500", "600", "700", "800"] });

const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(site),
  title: {
    default: "SPYNUS Physiotherapy & Wellness Centre | Physiotherapy in Chikkanagamangala, Bengaluru",
    template: "%s | SPYNUS Physiotherapy & Wellness Centre",
  },
  description:
    "Personalized physiotherapy and wellness care at SPYNUS Physiotherapy & Wellness Centre, Rayasandra Main Road, Chikkanagamangala, Bengaluru. Book your appointment online.",
  applicationName: "SPYNUS Physiotherapy",
  openGraph: { type: "website", locale: "en_IN", siteName: "SPYNUS Physiotherapy & Wellness Centre" },
  formatDetection: { telephone: true },
};

export const viewport: Viewport = { themeColor: "#fbfaf6", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className={`${inter.variable} ${jakarta.variable}`}>
      <body>{children}</body>
    </html>
  );
}
