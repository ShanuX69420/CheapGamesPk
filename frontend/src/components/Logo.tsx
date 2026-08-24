/**
 * The mark: a controller face — d-pad and two buttons — on a solid tile.
 * A full gamepad silhouette turns to mush at favicon size; the face reads
 * at 16px. `public/icon.svg` is the same drawing, so keep the two in step.
 *
 * Flat fill, no gradient: a gradient tile is the first thing that dates a
 * logo, and it muddies the glyph at small sizes.
 */
export function LogoMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={className}>
      <rect width="32" height="32" rx="7" fill="#2f6fed" />
      <g fill="#fff">
        <rect x="7.3" y="14.3" width="9" height="3.4" rx="1.7" />
        <rect x="10.1" y="11.5" width="3.4" height="9" rx="1.7" />
        <circle cx="23.6" cy="13.2" r="2.2" />
        <circle cx="20.4" cy="19.4" r="2.2" />
      </g>
    </svg>
  );
}

/**
 * The lockup. `.pk` is the domain, not part of the name, so it sits apart in
 * a muted grey instead of running on as "cheapgamespk" — quieter than the
 * accent, which is reserved for things you can click.
 */
export function Logo({
  className = "",
  // A phone header is tight — the mark and the word both step up at sm.
  markClassName = "h-7 w-7 sm:h-8 sm:w-8",
  wordClassName = "text-base sm:text-lg",
}: {
  className?: string;
  markClassName?: string;
  wordClassName?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark className={markClassName} />
      <span className={`font-semibold leading-none tracking-tight ${wordClassName}`}>
        cheapgames<span className="text-ink-400">.pk</span>
      </span>
    </span>
  );
}
