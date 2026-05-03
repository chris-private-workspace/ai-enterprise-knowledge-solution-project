'use client';

/**
 * KB List (`/admin/kb`) — per architecture.md §5.4 view 3.
 *
 * Plain-table version (W2 baseline; shadcn DataTable upgrade W3 D5 F8).
 * TanStack Query useQuery wired to GET /kb. Layout reference Dify Image 4
 * documents-table pattern (code not copied per CLAUDE.md §7).
 */

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { kbApi, type KbStatus } from '@/lib/api/kb';

export default function KbListPage() {
  const query = useQuery<KbStatus[]>({
    queryKey: ['kb', 'list'],
    queryFn: kbApi.list,
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Knowledge Bases</h1>
        <Link
          href="/admin/kb/new"
          className="rounded bg-[oklch(0.42_0.04_260)] px-4 py-2 text-sm font-medium text-white hover:bg-[oklch(0.36_0.04_260)]"
        >
          + Create KB
        </Link>
      </div>

      {query.isLoading && <p className="text-sm">Loading…</p>}
      {query.isError && (
        <div className="rounded border border-[oklch(0.57_0.22_25)] bg-[oklch(0.96_0.02_25)] p-3 text-sm">
          Failed to load KBs: {String((query.error as Error)?.message ?? 'unknown')}
        </div>
      )}

      {query.data && query.data.length === 0 && (
        <p className="text-sm text-[oklch(0.45_0_0)]">
          No KBs yet. Create one to start ingesting documents.
        </p>
      )}

      {query.data && query.data.length > 0 && (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-[oklch(0.92_0_0)] text-left">
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Documents</th>
              <th className="px-3 py-2 font-medium">Chunks</th>
              <th className="px-3 py-2 font-medium">Last Indexed</th>
              <th className="px-3 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {query.data.map((kb) => (
              <tr key={kb.kb_id} className="border-b border-[oklch(0.96_0_0)]">
                <td className="px-3 py-2">
                  <Link
                    href={`/admin/kb/${kb.kb_id}`}
                    className="font-medium hover:underline"
                  >
                    {kb.name || kb.kb_id}
                  </Link>
                </td>
                <td className="px-3 py-2">{kb.total_documents ?? 0}</td>
                <td className="px-3 py-2">{kb.total_chunks ?? 0}</td>
                <td className="px-3 py-2 text-[oklch(0.45_0_0)]">
                  {kb.last_indexed_at?.slice(0, 10) ?? '—'}
                </td>
                <td className="px-3 py-2 text-right">
                  <Link
                    href={`/admin/kb/${kb.kb_id}/upload`}
                    className="text-xs text-[oklch(0.42_0.04_260)] hover:underline"
                  >
                    Upload
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
