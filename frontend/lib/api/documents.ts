/**
 * Typed Documents API (per architecture.md §4.4 #9-#12 + §3.5).
 *
 * GET /kb/{kb_id}/documents — W16 F5.1.1 / CO_F3a: aggregates the kb_id-scoped
 * Azure AI Search index chunks by doc_id, returns doc-level metadata (no bulk
 * chunk_text — use /query for retrieved-chunk text). Empty index → empty list.
 * GET /kb/{kb_id}/documents/{doc_id}/chunks — W16 F5.1.2: per-chunk metadata
 * (chunk_id / section_path / index / flags), ordered by chunk_index ascending.
 * POST upload / DELETE doc / POST reindex — wired by CH-001 (2026-05-12); the
 * upload path uses `kbApi.uploadDoc` (multipart) directly, not this client.
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

/** Mirrors backend `api.schemas.listing.ChunkSummary` (Pydantic). */
export interface ChunkSummary {
  chunk_id: string;
  chunk_index: number;
  chunk_total: number;
  chunk_title: string;
  section_path: string[];
  enabled: boolean;
  low_value_flag: boolean;
}

export const documentsApi = {
  list: (kbId: string): Promise<DocumentSummary[]> =>
    client.get<DocumentSummary[]>(`/kb/${encodeURIComponent(kbId)}/documents`),

  listChunks: (kbId: string, docId: string): Promise<ChunkSummary[]> =>
    client.get<ChunkSummary[]>(
      `/kb/${encodeURIComponent(kbId)}/documents/${encodeURIComponent(docId)}/chunks`,
    ),
};
