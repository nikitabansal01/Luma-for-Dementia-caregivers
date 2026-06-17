import type { Metadata } from "next";
import { DM_Sans, Lora } from "next/font/google";
import "./globals.css";
import Link from "next/link";

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
  title: "Care Log — Behavior & care notes",
  description: "Simple behavior logging and reports for caregivers",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${dmSans.variable} ${lora.variable}`}>
      <body className="min-h-screen bg-care-cream font-sans text-care-bark antialiased">
        <nav className="sticky top-0 z-10 border-b border-care-sage bg-white/95 shadow-card backdrop-blur-sm">
          <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4 sm:px-6">
            <Link
              href="/"
              className="font-serif text-lg font-semibold text-care-forest no-underline hover:text-care-olive"
            >
              Care Log
            </Link>
            <div className="flex gap-1 sm:gap-2">
              <NavLink href="/">Today</NavLink>
              <NavLink href="/history">History</NavLink>
              <NavLink href="/report">Synopsis</NavLink>
              <NavLink href="/coach-rules">Coach</NavLink>
            </div>
          </div>
        </nav>
        <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">{children}</main>
      </body>
    </html>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-lg px-3 py-2 text-sm font-medium text-care-stone transition-colors hover:bg-care-sage hover:text-care-bark"
    >
      {children}
    </Link>
  );
}
