import type { ReactNode } from "react";

const TONES = {
  neutral: "bg-ink-700/70 text-ink-200 ring-ink-600",
  accent: "bg-accent/15 text-accent-bright ring-accent/30",
  deal: "bg-deal/15 text-deal ring-deal/30",
  good: "bg-good/15 text-good ring-good/30",
  muted: "bg-ink-800 text-ink-400 ring-ink-700",
} as const;

export type BadgeTone = keyof typeof TONES;

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: BadgeTone;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold tracking-wide uppercase ring-1 ring-inset ${TONES[tone]}`}
    >
      {children}
    </span>
  );
}

/** Offline vs online accounts carry very different expectations — colour-code them. */
export function ProductTypeBadge({
  type,
  label,
}: {
  type: string;
  label: string;
}) {
  const tone: BadgeTone =
    type === "offline_account"
      ? "accent"
      : type === "online_account"
        ? "good"
        : "neutral";
  return <Badge tone={tone}>{label}</Badge>;
}
