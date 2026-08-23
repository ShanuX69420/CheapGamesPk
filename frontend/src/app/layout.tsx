import type { Metadata } from "next";
import Link from "next/link";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "cheapgamespk — game accounts, activations & keys",
    template: "%s — cheapgamespk",
  },
  description:
    "Offline activations, online accounts and genuine keys for PC games. Instant delivery, priced for Pakistan.",
};

function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-ink-800 bg-ink-950/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3.5">
        <Link href="/" className="shrink-0 text-lg font-black tracking-tight">
          cheap<span className="text-accent">games</span>
          <span className="text-ink-400">pk</span>
        </Link>

        <form action="/" className="ml-auto w-full max-w-md">
          <input
            type="search"
            name="search"
            placeholder="Search games…"
            aria-label="Search games"
            className="w-full rounded-lg bg-ink-800 px-3.5 py-2 text-sm text-ink-50 ring-1 ring-ink-700 outline-none transition placeholder:text-ink-400 focus:ring-accent"
          />
        </form>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="mt-20 border-t border-ink-800 bg-ink-950">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-8 text-sm text-ink-400 sm:flex-row sm:items-center sm:justify-between">
        <p>© {new Date().getFullYear()} cheapgamespk</p>
        <p>Instant delivery · Support on every order</p>
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
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
