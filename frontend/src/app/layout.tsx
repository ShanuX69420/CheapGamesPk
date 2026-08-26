import type { Metadata } from "next";
import Link from "next/link";

import { CartIndicator } from "@/components/CartIndicator";
import { CartProvider } from "@/components/CartProvider";
import { FacebookPixel } from "@/components/FacebookPixel";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import { Logo } from "@/components/Logo";
import { MobileNav } from "@/components/MobileNav";
import { SearchIcon, WhatsAppIcon } from "@/components/icons";
import { OG_SITE, SITE_URL, WHATSAPP_CHANNEL_URL } from "@/lib/site";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  /* Keyword first, brand last — "cheap pc games pakistan" is the search
     being targeted, and the domain repeats the brand in the result anyway. */
  title: {
    default: "Cheap PC Games in Pakistan — Steam Accounts & Keys | cheapgames.pk",
    template: "%s — cheapgames.pk",
  },
  description:
    "Buy PC games at a fraction of store price — offline activations, Steam accounts and genuine keys. Fast delivery on WhatsApp, prices in PKR.",
  openGraph: {
    ...OG_SITE,
    /* The default link-preview card — WhatsApp shares live or die on this. */
    images: "/og.png",
  },
};

const CATALOG = [
  { href: "/?type=offline_account", label: "Offline" },
  { href: "/?type=online_account", label: "Online" },
  { href: "/?type=key", label: "Keys" },
];

/* Trust pages: all three in the footer, and the two that close sales —
   reviews and the FAQ — in the header too. */
const TRUST = [
  { href: "/reviews", label: "Reviews" },
  { href: "/faq", label: "FAQ" },
  { href: "/about", label: "About us" },
];

const NAV = [...CATALOG, ...TRUST.slice(0, 2)];

function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-ink-800 bg-ink-950/85 backdrop-blur">
      <div className="relative mx-auto max-w-[88rem] px-4 sm:px-6">
        <div className="flex items-center gap-3 py-3 sm:gap-5">
          <MobileNav items={NAV} />

          <Link href="/" aria-label="cheapgames.pk home" className="shrink-0">
            <Logo />
          </Link>

          <nav className="hidden items-center gap-4 md:flex">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm font-medium text-ink-200 transition-colors hover:text-ink-50"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Below md the search bar moves to its own row — three controls plus
              a text field do not fit on a phone. */}
          <div className="ml-auto hidden w-full max-w-sm md:block">
            <SearchField />
          </div>

          {/* On a phone the search bar is on its own row, so nothing above
              pushes these over — the channel button takes the free space. */}
          <a
            href={WHATSAPP_CHANNEL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto flex shrink-0 items-center gap-2 rounded-md bg-[#25D366] p-2 text-sm font-semibold text-ink-950 transition-opacity hover:opacity-90 sm:px-3 md:ml-0"
          >
            <WhatsAppIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Join channel</span>
          </a>

          <CartIndicator />
        </div>

        <div className="pb-3 md:hidden">
          <SearchField />
        </div>
      </div>
    </header>
  );
}

function SearchField() {
  return (
    <form action="/">
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
        <input
          type="search"
          name="search"
          placeholder="Search games…"
          aria-label="Search games"
          className="w-full rounded-md border border-ink-700 bg-ink-900 py-2 pl-9 pr-3 text-sm text-ink-50 outline-none transition-colors placeholder:text-ink-400 focus:border-ink-600"
        />
      </div>
    </form>
  );
}

function Footer() {
  return (
    <footer className="mt-16 border-t border-ink-800">
      <div className="mx-auto grid max-w-[88rem] gap-8 px-4 py-10 sm:grid-cols-3 sm:px-6">
        <div>
          <Logo className="h-7" />
          <p className="mt-2 max-w-xs text-sm leading-relaxed text-ink-400">
            Offline activations, online accounts and genuine keys for PC —
            delivered fast.
          </p>
          <a
            href={WHATSAPP_CHANNEL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-[#25D366] transition-opacity hover:opacity-80"
          >
            <WhatsAppIcon className="h-4 w-4" />
            Join our WhatsApp channel
          </a>
        </div>

        <div>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-400">
            Browse
          </h2>
          <ul className="mt-3 space-y-2 text-sm text-ink-200">
            {CATALOG.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="transition-colors hover:text-ink-50">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-400">
            Store
          </h2>
          <ul className="mt-3 space-y-2 text-sm text-ink-200">
            {TRUST.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="transition-colors hover:text-ink-50">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-ink-800">
        <div className="mx-auto max-w-[88rem] px-4 py-5 text-xs text-ink-400 sm:px-6">
          © {new Date().getFullYear()} cheapgames.pk
        </div>
      </div>
    </footer>
  );
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col antialiased">
        <FacebookPixel />
        <GoogleAnalytics />
        <CartProvider>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </CartProvider>
      </body>
    </html>
  );
}
