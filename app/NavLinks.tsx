"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Today", match: (path: string) => path === "/" },
  { href: "/history", label: "History", match: (path: string) => path.startsWith("/history") },
  { href: "/report", label: "Synopsis", match: (path: string) => path.startsWith("/report") },
  { href: "/profile", label: "Profile", match: (path: string) => path.startsWith("/profile") },
];

export default function NavLinks() {
  const pathname = usePathname();

  return (
    <div className="flex items-center gap-6 sm:gap-8">
      {links.map(({ href, label, match }) => {
        const active = match(pathname);
        return (
          <Link
            key={href}
            href={href}
            className={`site-nav-link${active ? " site-nav-link--active" : ""}`}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}
