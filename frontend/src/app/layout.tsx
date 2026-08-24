import type { Metadata } from "next";
import Link from "next/link";

import { CartIndicator } from "@/components/CartIndicator";
import { CartProvider } from "@/components/CartProvider";
import { FacebookPixel } from "@/components/FacebookPixel";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import { Logo } from "@/components/Logo";
import { MobileNav } from "@/components/MobileNav";
import { SearchIcon } from "@/components/icons";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "cheapgames.pk — game accounts, activations & keys",
    template: "%s — cheapgames.pk",
  },
  description:
    "Offline activations, online accounts and genuine keys for PC games. Fast delivery, priced for Pakistan.",
};

const NAV = [
  { href: "/?type=offline_account", label: "Offline" },
  { href: "/?type=online_account", label: "Online" },
  { href: "/?type=key", label: "Keys" },
  { href: "/?on_sale=true", label: "Deals" },
];

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
              pushes the cart over — it takes the free space itself. */}
          <div className="ml-auto md:ml-0">
            <CartIndicator />
          </div>
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
          <Logo markClassName="h-7 w-7" wordClassName="text-base" />
          <p className="mt-2 max-w-xs text-sm leading-relaxed text-ink-400">
            Offline activations, online accounts and genuine keys for PC —
            delivered fast.
          </p>
        </div>

        <div>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-400">
            Browse
          </h2>
          <ul className="mt-3 space-y-2 text-sm text-ink-200">
            {NAV.map((item) => (
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
            Support
          </h2>
          <ul className="mt-3 space-y-2 text-sm text-ink-200">
            <li>Fast delivery, 24/7</li>
            <li>Setup guide with every order</li>
            <li>Help with activation issues</li>
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
