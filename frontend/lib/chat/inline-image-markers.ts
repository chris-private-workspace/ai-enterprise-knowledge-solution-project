/**
 * W70 (ADR-0055) — inline image marker strip for the answer display layer.
 *
 * When a KB has `enable_inline_image_markers` on, the synthesiser's answer text
 * carries `[IMG#<sha8>]` position markers (where a screenshot appears in the
 * source document). W70 ships the infrastructure only — the chat display strips
 * the markers so the rendered answer looks identical to today; the W71
 * interleaved render will consume them to place `InlineImageCard`s instead.
 *
 * Streaming: a marker can arrive split across SSE text-deltas, leaving the
 * accumulated content ending in a partial marker (`[IM`, `[IMG#a1b`, …). With
 * `streaming=true` a trailing partial marker is held back (not rendered) until
 * the next delta completes or disproves it — prevents marker fragments
 * flashing in the answer. A legitimate trailing `[` (e.g. a markdown link
 * being streamed) is held for at most one delta and reappears as soon as the
 * next characters rule the marker out.
 */

// Complete markers — lenient body match ([^\]\s]*) so a malformed marker the
// LLM invents still never reaches the user (W71 adds membership validation).
const COMPLETE_MARKER_PATTERN = /\[IMG#[^\]\s]*\]/g;

// A trailing prefix of an (incomplete) marker: "[", "[I", "[IM", "[IMG",
// "[IMG#", "[IMG#a1b…" (no closing bracket / whitespace yet).
const TRAILING_PARTIAL_PATTERN = /\[(?:I(?:M(?:G(?:#[^\]\s]*)?)?)?)?$/;

export function stripInlineImageMarkers(text: string, streaming = false): string {
  if (!text.includes('[')) return text;
  let out = text.replace(COMPLETE_MARKER_PATTERN, '');
  if (streaming) {
    out = out.replace(TRAILING_PARTIAL_PATTERN, '');
  }
  return out;
}
