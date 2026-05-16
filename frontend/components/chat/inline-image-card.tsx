'use client';

/**
 * Inline image card — W20 F3.8 (per ADR-0031 advanced surfaces; consumes the
 * W17 image schema `ImageRef` from `lib/api/query.ts`).
 *
 * Renders the FIRST `citation.embedded_images[0]` thumbnail inline within an
 * assistant message bubble (when the citation carries an image). Click hands
 * the full image up to the page-level modal (the existing W3 D5 screenshot
 * modal continues to own the lightbox + ESC handler — no duplicate machinery).
 *
 * Per Karpathy §1.2 simplicity: this is a thin presentational wrapper around
 * the existing `<button><img></button>` pattern from the W3 chat-page code,
 * extracted so the `inline` citation mode can reuse it and so future modes can
 * mount it independently. No new state, no new dependencies.
 */

import type { ImageRef } from '@/lib/api/query';

interface InlineImageCardProps {
  image: ImageRef;
  onClick: (image: ImageRef) => void;
}

export function InlineImageCard({ image, onClick }: InlineImageCardProps) {
  if (!image.blob_url) return null;
  return (
    <button
      type="button"
      onClick={() => onClick(image)}
      className="mt-2 block w-full overflow-hidden rounded-sm border border-border transition-colors hover:border-accent"
      aria-label={image.alt_text || 'View screenshot'}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={image.blob_url}
        alt={image.alt_text || 'screenshot thumbnail'}
        className="h-24 w-full object-cover"
      />
    </button>
  );
}
