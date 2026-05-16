'use client';

/**
 * Aggregated image gallery — W20 F3.9 (per ADR-0031 advanced surfaces).
 *
 * Collects every `citation.embedded_images[0]` thumbnail across the
 * conversation and lays them out as a 3-column grid below the message stream.
 * Click → page-level screenshot modal (same lift used by `<InlineImageCard>`
 * — single source of truth for full-image overlay + ESC handler at the page).
 *
 * The OCR text overlay (per plan F3.9 literal: "modal preview with OCR text
 * overlay") is owned by the page-level modal — the gallery's job is the grid +
 * thumbnail click; the modal already shows alt_text below the image, which
 * carries the screenshot OCR snippet on Tier 1 (per `ImageRef.alt_text` from
 * the W2 F3 screenshot pipeline).
 */

import type { ImageRef } from '@/lib/api/query';

interface ImageGalleryProps {
  images: ImageRef[];
  onSelect: (image: ImageRef) => void;
}

export function ImageGallery({ images, onSelect }: ImageGalleryProps) {
  if (images.length === 0) return null;
  return (
    <section
      aria-label="Cited screenshots"
      className="mt-6 border-t border-border pt-4"
    >
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Cited screenshots ({images.length})
      </h3>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {images.map((img) => (
          <button
            key={img.checksum_sha256 || img.blob_url}
            type="button"
            onClick={() => onSelect(img)}
            className="overflow-hidden rounded-sm border border-border transition-colors hover:border-accent"
            aria-label={img.alt_text || 'View screenshot'}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img.blob_url}
              alt={img.alt_text || 'screenshot'}
              className="h-24 w-full object-cover"
            />
          </button>
        ))}
      </div>
    </section>
  );
}
