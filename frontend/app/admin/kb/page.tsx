'use client';

/**
 * KB List (`/admin/kb`) — per architecture.md v6 §5.4 view 3.
 *
 * W12 D4 F4.6 tokens migration: hardcoded oklch → token classes;
 * Create KB CTA + Upload link upgraded to shadcn Button (default + ghost link).
 * Functional logic intact (TanStack Query useQuery → GET /kb;table render).
 *
 * Layout reference Dify Image 4 documents-table pattern (no code copy per ADR-0010).
 */

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
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
        <Button asChild>
          <Link href="/admin/kb/new">+ Create KB</Link>
        </Button>
      </div>

      {query.isLoading && <p className="text-sm">Loading…</p>}
      {query.isError && (
        <div className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm">
          Failed to load KBs: {String((query.error as Error)?.message ?? 'unknown')}
        </div>
      )}

      {query.data && query.data.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No KBs yet. Create one to start ingesting documents.
        </p>
      )}

      {query.data && query.data.length > 0 && (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Documents</th>
              <th className="px-3 py-2 font-medium">Chunks</th>
              <th className="px-3 py-2 font-medium">Last Indexed</th>
              <th className="px-3 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {query.data.map((kb) => (
              <tr key={kb.kb_id} className="border-b border-muted">
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
                <td className="px-3 py-2 text-muted-foreground">
                  {kb.last_indexed_at?.slice(0, 10) ?? '—'}
                </td>
                <td className="px-3 py-2 text-right">
                  <Link
                    href={`/admin/kb/${kb.kb_id}/upload`}
                    className="text-xs text-accent hover:underline"
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
