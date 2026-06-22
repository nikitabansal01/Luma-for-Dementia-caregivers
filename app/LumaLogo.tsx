import Link from "next/link";

const LOGO_HEIGHT = 44;
const LOGO_WIDTH = Math.round(LOGO_HEIGHT * (711 / 231));

export default function LumaLogo() {
  return (
    <Link href="/" className="site-logo" aria-label="Luma home">
      <img
        src="/images/luma-logo.png"
        alt=""
        className="site-logo__image"
        width={LOGO_WIDTH}
        height={LOGO_HEIGHT}
      />
    </Link>
  );
}
