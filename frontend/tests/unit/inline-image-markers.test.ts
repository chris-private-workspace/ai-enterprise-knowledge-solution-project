/**
 * Unit tests — W70 (ADR-0055) — inline image marker strip for the answer
 * display layer (`lib/chat/inline-image-markers.ts`).
 *
 * The chat strips `[IMG#<sha8>]` position markers before markdown render
 * (W71 interleaved render will consume them instead). While streaming, a
 * trailing PARTIAL marker is held back so fragments never flash.
 */

import { describe, expect, it } from 'vitest';

import { stripInlineImageMarkers } from '@/lib/chat/inline-image-markers';

describe('W70 — stripInlineImageMarkers (complete markers)', () => {
  it('strips a single inline marker', () => {
    expect(stripInlineImageMarkers('Click Save. [IMG#a1b2c3d4] Then close.')).toBe(
      'Click Save.  Then close.',
    );
  });

  it('strips multiple markers including paragraph-standalone ones', () => {
    const text = 'Step 1. [IMG#a1b2c3d4]\n\n[IMG#b2c3d4e5]\n\nStep 2. [IMG#c3d4e5f6]';
    const out = stripInlineImageMarkers(text);
    expect(out).not.toContain('[IMG#');
    expect(out).toContain('Step 1.');
    expect(out).toContain('Step 2.');
  });

  it('strips malformed marker bodies too (defensive — W71 adds validation)', () => {
    expect(stripInlineImageMarkers('x [IMG#zz-not-hex!] y')).toBe('x  y');
  });

  it('leaves citation markers and ordinary brackets untouched', () => {
    const text = 'Fact one. [chunk-kb-a_doc-b_chunk-0001] See [the docs](url).';
    expect(stripInlineImageMarkers(text)).toBe(text);
  });

  it('returns marker-less text unchanged (fast path)', () => {
    expect(stripInlineImageMarkers('no markers here')).toBe('no markers here');
  });
});

describe('W70 — streaming partial-marker hold-back', () => {
  it.each(['[', '[I', '[IM', '[IMG', '[IMG#', '[IMG#a1b'])(
    'holds back trailing partial %j while streaming',
    (partial) => {
      expect(stripInlineImageMarkers(`Click Save. ${partial}`, true)).toBe('Click Save. ');
    },
  );

  it('still strips complete markers while streaming', () => {
    expect(stripInlineImageMarkers('Done. [IMG#a1b2c3d4] Next [IMG#b2c', true)).toBe(
      'Done.  Next ',
    );
  });

  it('does NOT hold back a trailing partial when not streaming (final render)', () => {
    // A final answer ending in "[IMG#abc" is malformed-but-final; without the
    // streaming flag the partial is literal text (W71 validation territory).
    expect(stripInlineImageMarkers('tail [IMG#a1b')).toBe('tail [IMG#a1b');
  });

  it('releases a held "[" once the next delta disproves the marker', () => {
    // delta 1: trailing "[" held; delta 2 arrives → "[link]" is not a marker.
    expect(stripInlineImageMarkers('See [', true)).toBe('See ');
    expect(stripInlineImageMarkers('See [the docs](url)', true)).toBe('See [the docs](url)');
  });
});
