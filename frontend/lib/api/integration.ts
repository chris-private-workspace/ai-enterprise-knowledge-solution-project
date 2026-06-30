/**
 * Typed source-integration API methods (C17 / ADR-0070 階段 1b, W101 F3).
 *
 * Mirrors the backend `integration/sharepoint` route (W100 F1): resolve a site,
 * browse the container tree, list documents, import the picked ones. Types mirror
 * the backend Out/In schema in `api/routes/integration.py`.
 */

import { ApiClient } from '../api-client';

const client = new ApiClient();

/** A browsable container in the source tree (SharePoint: site / library / folder). */
export interface SourceContainer {
  id: string;
  name: string;
  type: string; // 'site' | 'library' | 'folder'
  parent_id: string | null;
}

/** A listable document + change-detection metadata (②③). */
export interface SourceDocumentRef {
  id: string;
  name: string;
  path: string;
  container_id: string;
  etag?: string | null;
  version?: string | null;
  last_modified?: string | null; // ISO-8601 (backend serialises the datetime)
  size?: number | null;
}

export interface DocImportResult {
  doc_id: string;
  name: string;
  status: string; // 'success' | 'failed'
  error: string | null;
}

/** Per-doc import outcome (§8.2) — not all-or-nothing. */
export interface ImportSummary {
  total: number;
  succeeded: number;
  failed: number;
  results: DocImportResult[];
}

interface BrowseResponse {
  containers: SourceContainer[];
}

interface DocumentsResponse {
  documents: SourceDocumentRef[];
}

export const integrationApi = {
  // POST /integration/sharepoint/resolve-site — site URL → site container (wizard
  // step 1 "Test connection" + step 2 tree root). 5xx on connect/auth/403-no-grant.
  resolveSite: (siteUrl: string): Promise<SourceContainer> =>
    client.post<SourceContainer>('/integration/sharepoint/resolve-site', {
      site_url: siteUrl,
    }),

  // GET /integration/sharepoint/browse — child containers (site → library → folder).
  // `containerId` omitted = top level (sites). (②)
  browse: (containerId?: string): Promise<SourceContainer[]> => {
    const qs = containerId
      ? `?container_id=${encodeURIComponent(containerId)}`
      : '';
    return client
      .get<BrowseResponse>(`/integration/sharepoint/browse${qs}`)
      .then((r) => r.containers);
  },

  // GET /integration/sharepoint/documents — file documents in a drive / folder. (②③)
  listDocuments: (containerId: string): Promise<SourceDocumentRef[]> =>
    client
      .get<DocumentsResponse>(
        `/integration/sharepoint/documents?container_id=${encodeURIComponent(containerId)}`,
      )
      .then((r) => r.documents),

  // POST /integration/sharepoint/import — import individually-picked documents
  // (#1 / D-3). Per-doc failures are recorded in the summary, not thrown.
  importSelected: (
    kbId: string,
    refs: SourceDocumentRef[],
  ): Promise<ImportSummary> =>
    client.post<ImportSummary>('/integration/sharepoint/import', {
      kb_id: kbId,
      documents: refs,
    }),
};
