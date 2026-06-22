import type { Metadata } from "next";
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
  description: "Voice and text care logging for dementia caregivers — Luma companion, coach flow, and clinician synopsis",
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
      </body>
    </html>
  );
}

