/**
 * Typed Eval API methods (per architecture.md §4.4 #15-16 + §4.5 EvalReport schema).
 *
 * W15 D1 F1: V5 Eval Console run/shootout client.
 * CH-002 F3 (2026-05-12): backend /eval/run + /eval/shootout are now real —
 * RAGAs 4-metric integration landed W16 F5.4 + W17 F3 (`POST /eval/run` → 200
 * `EvalReport`). The old 501-stub branch in the page's error handler is removed.
 *
 * Schema mirrors backend/api/schemas/eval.py + backend/api/routes/eval.py
 * (Pydantic). Field names track the W2-era 4-metric definition (recall_at_5 /
 * faithfulness / correctness / image_association) — design ref §2.5 wireframe
 * codes (R@5 / FFul / CRct / IAss) match this schema, NOT the W15 plan literal
 * "Context Relevancy / Answer Relevancy" (deviation logged W15 plan §7 (D1)).
 */

import { ApiClient } from '../api-client';

const client = new ApiClient();

export interface FailedQueryDetail {
  query_id: string;
  query: string;
  expected: string;
  got: string;
  metric_failed: string[];
}

export interface EvalReport {
  recall_at_5: number;
  faithfulness: number;
  correctness: number | null;
  image_association: number;
  p95_latency_ms: number;
  failed_queries: FailedQueryDetail[];
  crag_trigger_rate: number;
  avg_cost_per_query_usd: number;
}

export interface EvalRunRequest {
  eval_set_id: string;
  llm_model?: string;
  reranker?: string;
  enable_crag?: boolean;
  /** Cost / latency cap — cap the main-query count for a synchronous browser run. */
  max_main_queries?: number;
}

export const evalApi = {
  run: (payload: EvalRunRequest): Promise<EvalReport> =>
    client.post<EvalReport>('/eval/run', payload),

  shootout: (): Promise<unknown> => client.post<unknown>('/eval/shootout', {}),
};
