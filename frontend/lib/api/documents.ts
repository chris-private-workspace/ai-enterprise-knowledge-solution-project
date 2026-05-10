/**
 * Typed Documents API (per architecture.md §4.4 #9 + §3.5 — KB document listing).
 *
 * GET /kb/{kb_id}/documents — implemented backend-side (W16 F5.1.1 / CO_F3a):
 * aggregates the kb_id-scoped Azure AI Search index chunks by doc_id and returns
 * doc-level metadata (no bulk chunk_text — use /query for text). Empty index →
 * empty list (kb exists but no chunks ingested yet).
 *
 * Per-doc upload / reindex / delete endpoints remain 501 stubs (W2 multi-format
 * ingestion + Track A — out of W17 scope).
 */

import { ApiClient } from '../api-client';

const client = new ApiClient();

export interface DocumentSummary {
  doc_id: string;
  doc_title: string;
  doc_format: string;
  total_chunks: number;
  /** ISO datetime — max(ingested_at) across the observed chunks. */
  last_indexed_at: string;
  source_url: string | null;
  tags: string[];
}

export const documentsApi = {
  list: (kbId: string): Promise<DocumentSummary[]> =>
    client.get<DocumentSummary[]>(`/kb/${encodeURIComponent(kbId)}/documents`),
};
