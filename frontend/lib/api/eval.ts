/**
 * Typed Eval API methods (per architecture.md §4.4 #15-16 + §4.5 EvalReport schema).
 *
 * W15 D1 F1: V5 Eval Console run/shootout client.
 *
 * NOTE: Backend /eval/run + /eval/shootout currently return 501 NOT_IMPLEMENTED
 * (W4 implementation per docs/eval-methodology.md). Frontend handles 501 via
 * ApiError envelope branching → toast.info pending-W4-backend hint.
 *
 * Schema mirrors backend/api/schemas/eval.py (Pydantic). Field names track the
 * W2-era 4-metric definition (recall_at_5 / faithfulness / correctness /
 * image_association) — design ref §2.5 wireframe codes (R@5 / FFul / CRct /
 * IAss) match this schema, NOT the W15 plan literal "Context Relevancy /
 * Answer Relevancy" (deviation logged W15 plan §7 changelog (D1)).
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
}

export const evalApi = {
  run: (payload: EvalRunRequest): Promise<EvalReport> =>
    client.post<EvalReport>('/eval/run', payload),

  shootout: (): Promise<unknown> => client.post<unknown>('/eval/shootout', {}),
};
