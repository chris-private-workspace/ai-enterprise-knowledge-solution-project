/**
 * Typed Debug Trace API methods (per architecture.md §4.4 #17 + §5.7 V6 Debug View).
 *
 * W15 D2 F2: V6 Debug View trace fetcher.
 *
 * NOTE: Backend GET /debug/trace/{trace_id} currently returns 501 NOT_IMPLEMENTED
 * (W3+ implementation per Langfuse correlation). Frontend handles 501 via
 * ApiError envelope branching → fall through to stub mitigation UI (placeholder
 * stage scaffold + Langfuse link still works using traceId from URL).
 *
 * Schema is forward-looking — backend can match this contract when Langfuse
 * trace correlation lands W3+ / Beta hardening. 6 stages per architecture.md
 * v6 §3.5 + design ref §2.6 wireframe (Query Preprocessor / Hybrid Retrieval
 * / Reranker / CRAG Confidence Judge / LLM Synthesis / Final Response).
 */

import { ApiClient } from '../api-client';

const client = new ApiClient();

export interface PipelineStageMetric {
  duration_ms: number;
  cost_usd?: number | null;
  input_preview?: string | null;
  output_preview?: string | null;
  details?: Record<string, unknown> | null;
}

export interface TraceData {
  trace_id: string;
  query: string;
  kb_id?: string | null;
  total_ms: number;
  total_cost_usd: number;
  // Stages keyed by stage id (e.g., "1", "2", ...) for stable lookup
  // when backend lands. Per design ref §2.6 wireframe 6-stage layout.
  stages: Record<string, PipelineStageMetric>;
}

export const debugApi = {
  getTrace: (traceId: string): Promise<TraceData> =>
    client.get<TraceData>(`/debug/trace/${encodeURIComponent(traceId)}`),
};
