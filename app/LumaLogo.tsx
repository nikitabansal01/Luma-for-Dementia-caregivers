import Link from "next/link";

export default function LumaLogo() {
  return (
    <Link href="/" className="site-logo">
      <svg
        className="site-logo__leaf"
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden
      >
        <path
          d="M12 2C8 6 4 8 4 13c0 3.5 2.5 6 5 7.5 1.2.6 2 .9 3 1.5 1-.6 1.8-.9 3-1.5 2.5-1.5 5-4 5-7.5 0-5-4-7-8-11z"
          fill="currentColor"
        />
        <path
          d="M12 22v-8"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
      <span className="site-logo__text">Luma</span>
    </Link>
  );
}
