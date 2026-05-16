'use client';

/**
 * FeedbackBar — W20 F3.11 (per ADR-0031 advanced surfaces).
 *
 * Extends the W8 `<FeedbackBar>` thumbs-up / thumbs-down with an optional text
 * comment + a tag dropdown. The W8 `POST /feedback` endpoint already accepts
 * `comment: str | None` (no schema change needed); we prefix the chosen tag
 * into the comment as `[tag] text…` so the existing weekly signal report
 * surfaces tag distribution without a Pydantic migration (per Karpathy §1.2
 * simplicity).
 *
 * UX flow:
 *   1. The thumbs-down button reveals an inline disclosure with the tag
 *      `<select>` + textarea + "Send feedback" button. Thumbs-up is one-shot
 *      (writes immediately, no disclosure).
 *   2. After submit, both buttons collapse to a "Thanks for the feedback"
 *      acknowledgement (no double-write).
 */

import { ThumbsDown, ThumbsUp } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api-client';

const FEEDBACK_TAGS = [
  { value: 'inaccurate', label: 'Inaccurate' },
  { value: 'incomplete', label: 'Incomplete' },
  { value: 'off-topic', label: 'Off-topic' },
  { value: 'other', label: 'Other' },
] as const;

interface FeedbackBarProps {
  /** Trace id — empty string falls back to the SSE-fallback "n/a" placeholder. */
  traceId: string;
}

type Status = 'idle' | 'expanded' | 'submitting' | 'submitted' | 'error';

export function FeedbackBar({ traceId }: FeedbackBarProps) {
  const [status, setStatus] = useState<Status>('idle');
  const [tag, setTag] = useState<(typeof FEEDBACK_TAGS)[number]['value']>('inaccurate');
  const [comment, setComment] = useState('');

  async function submit(rating: 'thumbs_up' | 'thumbs_down', body: string | null) {
    setStatus('submitting');
    try {
      await apiClient.post('/feedback', {
        trace_id: traceId || 'n/a',
        rating,
        comment: body,
      });
      setStatus('submitted');
    } catch {
      setStatus('error');
    }
  }

  if (status === 'submitted') {
    return (
      <div className="mt-2 text-[11px] text-muted-foreground">
        Thanks for the feedback.
      </div>
    );
  }

  return (
    <div className="mt-2">
      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label="Helpful"
          onClick={() => submit('thumbs_up', null)}
          disabled={status === 'submitting'}
          className="rounded p-1 text-muted-foreground hover:bg-success/10 hover:text-success focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
        >
          <ThumbsUp className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          aria-label="Not helpful — open feedback form"
          aria-expanded={status === 'expanded'}
          onClick={() => setStatus(status === 'expanded' ? 'idle' : 'expanded')}
          disabled={status === 'submitting'}
          className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
        >
          <ThumbsDown className="h-3.5 w-3.5" />
        </button>
        {status === 'error' && (
          <span className="text-[11px] text-destructive">
            Couldn&apos;t send — try again.
          </span>
        )}
      </div>

      {status === 'expanded' && (
        <div className="mt-2 space-y-2 rounded-md border border-border bg-background p-2">
          <label className="block text-[11px] font-medium text-muted-foreground">
            Reason
            <select
              value={tag}
              onChange={(e) =>
                setTag(
                  e.target.value as (typeof FEEDBACK_TAGS)[number]['value'],
                )
              }
              className="mt-1 block w-full rounded-sm border border-input bg-background px-2 py-1 text-xs"
            >
              {FEEDBACK_TAGS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-[11px] font-medium text-muted-foreground">
            What went wrong? (optional)
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
              className="mt-1 block w-full resize-none rounded-sm border border-input bg-background px-2 py-1 text-xs"
              placeholder="Add details…"
            />
          </label>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => {
                setStatus('idle');
                setComment('');
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-7 text-xs"
              onClick={() =>
                submit(
                  'thumbs_down',
                  `[${tag}] ${comment.trim()}`.trim(),
                )
              }
            >
              Send feedback
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
