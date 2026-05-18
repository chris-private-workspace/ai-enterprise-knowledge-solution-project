/**
 * Typed Traces List API methods (per architecture.md v6 §5.7 + ADR-0030 absorbed).
 *
 * W22 F7.4 (per W22 plan §2 + D9.g audit 2026-05-18):
 *   NEW typed client consuming W21 F2 backend `GET /traces` shipped `55f876b`
 *   (`backend/api/routes/debug.py:42` + `backend/api/schemas/observability.py:124-167`).
 *   Sibling to `debug.ts` (`GET /debug/trace/{id}` single-trace deep fetch).
 *
 * Schema mirrors backend `TraceSummary` + `TraceListResponse` exactly — backend
 * graceful-degrade matrix returns HTTP 200 always; `status` field carries the
 * Langfuse fetch outcome ("ok" | "no_client" | "sdk_method_missing" |
 * "fetch_failed"), so frontend branches on `status` rather than HTTP code
 * (mirrors `debug.ts` / `CostSummary.realtime_status` pattern).
 */

import { ApiClient } from '../api-client';

const client = new ApiClient();

/** One row in the `/traces` index list (backend `TraceSummary`). */
export interface TraceSummary {
  trace_id: string;
  timestamp: string; // ISO 8601
  duration_ms: number;
  status: 'ok' | 'error' | 'crag_triggered';
  kb_id: string | null;
  query_preview: string; // first 100 chars of input.query (or trace.name)
  total_tokens: number;
  cost_usd: number;
  crag_iterations: number | null; // null = not a CRAG trace
  stage_count: number;
}

/** `GET /traces` paginated response (backend `TraceListResponse`). */
export interface TraceListResponse {
  items: TraceSummary[];
  total: number;
  limit: number;
  offset: number;
  status: string; // "ok" | "no_client" | "sdk_method_missing" | "fetch_failed"
  note: string;
}

export interface TraceListParams {
  /** Status filter: "all" | "errors" | "crag_triggered" (URL alias of backend `status_filter`). */
  filter?: 'all' | 'errors' | 'crag_triggered';
  /** ISO 8601 lower-bound (inclusive). */
  since?: string;
  /** Optional KB scope filter. */
  kb_id?: string;
  /** Page size (1-500). */
  limit?: number;
  /** Page offset (≥0). */
  offset?: number;
}

function buildQuery(params: TraceListParams): string {
  const usp = new URLSearchParams();
  if (params.filter && params.filter !== 'all') usp.set('filter', params.filter);
  if (params.since) usp.set('since', params.since);
  if (params.kb_id) usp.set('kb_id', params.kb_id);
  if (params.limit != null) usp.set('limit', String(params.limit));
  if (params.offset != null) usp.set('offset', String(params.offset));
  const qs = usp.toString();
  return qs ? `?${qs}` : '';
}

export const tracesApi = {
  list: (params: TraceListParams = {}): Promise<TraceListResponse> =>
    client.get<TraceListResponse>(`/traces${buildQuery(params)}`),
};
