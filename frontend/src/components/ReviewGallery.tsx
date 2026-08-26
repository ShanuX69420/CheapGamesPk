"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { Review } from "@/lib/reviews";

/*
 * The proof wall: real chat screenshots, shown small and opened big.
 *
 * Two layouts share one lightbox. "strip" is the homepage row — scroll-snapped,
 * swiped on a phone, nudged by arrow buttons on a desktop. "grid" is the
 * /reviews page showing everything at once. Every screenshot is the same
 * iPhone-shaped portrait, so both layouts can fix the aspect ratio and let the
 * browser reserve the space before the image arrives.
 */

function Arrow({ left = false, className = "" }: { left?: boolean; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      {left ? <path d="M15 5l-7 7 7 7" /> : <path d="M9 5l7 7-7 7" />}
    </svg>
  );
}

function Lightbox({
  reviews,
  index,
  onClose,
  onMove,
}: {
  reviews: Review[];
  index: number;
  onClose: () => void;
  onMove: (next: number) => void;
}) {
  const review = reviews[index];

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft" && index > 0) onMove(index - 1);
      if (event.key === "ArrowRight" && index < reviews.length - 1) onMove(index + 1);
    };
    const previousOverflow = document.body.style.overflow;

    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [index, reviews.length, onClose, onMove]);

  return (
    <div
      role="dialog"
      aria-modal
      aria-label="Review screenshot"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-ink-950/95 p-4"
      onClick={onClose}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={review.src}
        alt={review.alt}
        onClick={(event) => event.stopPropagation()}
        className="max-h-[92dvh] max-w-full rounded-lg ring-1 ring-ink-700"
      />

      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute right-3 top-3 rounded-md bg-ink-900/80 p-2 text-ink-200 transition-colors hover:text-ink-50"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          aria-hidden
          className="h-5 w-5"
        >
          <path d="M6 6l12 12" />
          <path d="M18 6L6 18" />
        </svg>
      </button>

      {index > 0 && (
        <button
          type="button"
          aria-label="Previous review"
          onClick={(event) => {
            event.stopPropagation();
            onMove(index - 1);
          }}
          className="absolute left-3 top-1/2 -translate-y-1/2 rounded-md bg-ink-900/80 p-2 text-ink-200 transition-colors hover:text-ink-50"
        >
          <Arrow left className="h-6 w-6" />
        </button>
      )}
      {index < reviews.length - 1 && (
        <button
          type="button"
          aria-label="Next review"
          onClick={(event) => {
            event.stopPropagation();
            onMove(index + 1);
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md bg-ink-900/80 p-2 text-ink-200 transition-colors hover:text-ink-50"
        >
          <Arrow className="h-6 w-6" />
        </button>
      )}
    </div>
  );
}

function Thumb({
  review,
  onOpen,
  className = "",
}: {
  review: Review;
  onOpen: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Enlarge: ${review.alt}`}
      className={`block overflow-hidden rounded-lg ring-1 ring-ink-700 transition-transform hover:scale-[1.02] ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={review.src}
        alt={review.alt}
        loading="lazy"
        width={560}
        height={1212}
        className="h-full w-full object-cover"
      />
    </button>
  );
}

export function ReviewGallery({
  reviews,
  layout,
}: {
  reviews: Review[];
  layout: "strip" | "grid";
}) {
  const [open, setOpen] = useState<number | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  const nudge = useCallback((direction: 1 | -1) => {
    scroller.current?.scrollBy({
      left: direction * scroller.current.clientWidth * 0.8,
      behavior: "smooth",
    });
  }, []);

  return (
    <>
      {layout === "grid" ? (
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {reviews.map((review, i) => (
            <Thumb
              key={review.src}
              review={review}
              onOpen={() => setOpen(i)}
              className="aspect-[1170/2532]"
            />
          ))}
        </div>
      ) : (
        <div className="group relative">
          <div
            ref={scroller}
            className="flex snap-x snap-mandatory gap-3.5 overflow-x-auto pb-2 [scrollbar-width:thin]"
          >
            {reviews.map((review, i) => (
              <Thumb
                key={review.src}
                review={review}
                onOpen={() => setOpen(i)}
                className="aspect-[1170/2532] w-40 shrink-0 snap-start sm:w-48"
              />
            ))}
          </div>

          {/* Nudge buttons are a pointer nicety — touch scrolls the strip
              itself, so they only render from sm up. */}
          <button
            type="button"
            aria-label="Scroll reviews left"
            onClick={() => nudge(-1)}
            className="absolute -left-3 top-1/2 hidden -translate-y-1/2 rounded-full border border-ink-700 bg-ink-900 p-2 text-ink-200 shadow-lg transition-colors hover:text-ink-50 sm:block"
          >
            <Arrow left className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label="Scroll reviews right"
            onClick={() => nudge(1)}
            className="absolute -right-3 top-1/2 hidden -translate-y-1/2 rounded-full border border-ink-700 bg-ink-900 p-2 text-ink-200 shadow-lg transition-colors hover:text-ink-50 sm:block"
          >
            <Arrow className="h-5 w-5" />
          </button>
        </div>
      )}

      {open !== null && (
        <Lightbox
          reviews={reviews}
          index={open}
          onClose={() => setOpen(null)}
          onMove={setOpen}
        />
      )}
    </>
  );
}
