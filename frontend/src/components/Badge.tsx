import type { ReactNode } from "react";

/* Tinted text on one shared dark chip. Solid colour blocks fight the cover
   art for attention, and there are several of them on a listing. */
const TONES = {
  neutral: "text-ink-200",
  accent: "text-accent-bright",
  deal: "text-deal",
  good: "text-good",
  muted: "text-ink-400",
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
      className={`inline-flex items-center rounded border border-ink-700 bg-ink-800 px-2 py-0.5 text-[11px] font-semibold tracking-wide uppercase ${TONES[tone]}`}
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
