import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { DM_Sans, Lora } from "next/font/google";
import "./globals.css";
import LumaLogo from "./LumaLogo";
import NavLinks from "./NavLinks";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

const lora = Lora({
  subsets: ["latin"],
  variable: "--font-lora",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Luma for Dementia caregivers",
  description: "Shared clarity for dementia caregivers — reflect with Luma, guided check-ins, and patterns for your care team",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${dmSans.variable} ${lora.variable}`}>
      <body className="min-h-screen bg-care-cream font-sans text-care-bark antialiased">
        <header className="site-header">
          <div className="site-header__inner">
            <LumaLogo />
            <NavLinks />
          </div>
        </header>
        <main className="site-main">{children}</main>
        <Analytics />
      </body>
    </html>
  );
}

