/**
 * The lockup is artwork: the mark and the wordmark are one transparent PNG,
 * which is the only way the bevel and gloss survive. `src/app/icon.png` is
 * the mark cut out of the same file — recut it whenever this one changes.
 *
 * The intrinsic size is declared so the sticky header doesn't jump while the
 * image loads; the height class scales it and `w-auto` holds the ratio.
 */
export function Logo({ className = "h-6 sm:h-8" }: { className?: string }) {
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src="/logo.png"
      alt="cheapgames.pk"
      width={692}
      height={128}
      className={`w-auto ${className}`}
    />
  );
}
