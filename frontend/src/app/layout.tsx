import type { Metadata } from "next";
import Link from "next/link";

import { CartIndicator } from "@/components/CartIndicator";
import { CartProvider } from "@/components/CartProvider";
import { MobileNav } from "@/components/MobileNav";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "cheapgamespk — game accounts, activations & keys",
    template: "%s — cheapgamespk",
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
    <header className="sticky top-0 z-50 border-b border-ink-800 bg-ink-950/90 backdrop-blur-md">
      <div className="relative mx-auto max-w-[88rem] px-4 sm:px-6">
        <div className="flex items-center gap-3 py-3 sm:gap-5">
          <MobileNav items={NAV} />

          <Link
            href="/"
            className="shrink-0 text-lg font-black tracking-tight sm:text-xl"
          >
            cheap<span className="text-accent">games</span>
            <span className="text-ink-400">pk</span>
          </Link>

          <nav className="hidden items-center gap-4 md:flex">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm font-semibold text-ink-200 transition hover:text-accent-bright"
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
        <span
          aria-hidden
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"
        >
          &#9906;
        </span>
        <input
          type="search"
          name="search"
          placeholder="Search games…"
          aria-label="Search games"
          className="w-full rounded-lg bg-ink-800/80 py-2 pl-9 pr-3 text-sm text-ink-50 ring-1 ring-ink-700 outline-none transition placeholder:text-ink-400 focus:bg-ink-800 focus:ring-accent"
        />
      </div>
    </form>
  );
}

function Footer() {
  return (
    <footer className="mt-16 border-t border-ink-800 bg-ink-950">
      <div className="mx-auto grid max-w-[88rem] gap-8 px-4 py-10 sm:grid-cols-3 sm:px-6">
        <div>
          <p className="text-base font-black tracking-tight">
            cheap<span className="text-accent">games</span>
            <span className="text-ink-400">pk</span>
          </p>
          <p className="mt-2 max-w-xs text-sm leading-relaxed text-ink-400">
            Offline activations, online accounts and genuine keys for PC —
            delivered fast.
          </p>
        </div>

        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-ink-200">
            Browse
          </h2>
          <ul className="mt-3 space-y-2 text-sm text-ink-400">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="transition hover:text-accent-bright">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-ink-200">
            Support
          </h2>
          <ul className="mt-3 space-y-2 text-sm text-ink-400">
            <li>
              <Link
                href="/order/find"
                className="transition hover:text-accent-bright"
              >
                Find your order
              </Link>
            </li>
            <li>Fast delivery, 24/7</li>
            <li>Setup guide with every order</li>
            <li>Help with activation issues</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-ink-800/70">
        <div className="mx-auto max-w-[88rem] px-4 py-5 text-xs text-ink-400 sm:px-6">
          © {new Date().getFullYear()} cheapgamespk
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
        <CartProvider>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </CartProvider>
      </body>
    </html>
  );
}
