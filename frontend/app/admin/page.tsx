'use client';

/**
 * Admin Overview (`/admin`) — per architecture.md §5.3 view 2.
 *
 * Displays aggregate KB stats. Uses TanStack Query useQuery to fetch
 * GET /kb list and reduce to summary metrics. Layout reference Dify Image 4
 * dashboard pattern (no code copy per CLAUDE.md §7); EKP design tokens only.
 */

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { kbApi, type KbStatus } from '@/lib/api/kb';

export default function AdminOverviewPage() {
  const query = useQuery<KbStatus[]>({
    queryKey: ['kb', 'list'],
    queryFn: kbApi.list,
  });

  const totalKbs = query.data?.length ?? 0;
  const totalDocs =
    query.data?.reduce((acc, kb) => acc + (kb.total_documents ?? 0), 0) ?? 0;
  const totalChunks =
    query.data?.reduce((acc, kb) => acc + (kb.total_chunks ?? 0), 0) ?? 0;

  return (
    <div>
      <h1 className="text-2xl font-semibold">Overview</h1>
      <p className="mt-2 text-sm text-[oklch(0.45_0_0)]">
        Aggregate stats across all Knowledge Bases.
      </p>

      {query.isError && (
        <div className="mt-4 rounded border border-[oklch(0.57_0.22_25)] bg-[oklch(0.96_0.02_25)] p-3 text-sm">
          Failed to load — backend unreachable. R8 reactivation? Disconnect VPN +
          retry. Error: {String((query.error as Error)?.message ?? 'unknown')}
        </div>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Knowledge Bases" value={totalKbs} loading={query.isLoading} />
        <StatCard label="Documents" value={totalDocs} loading={query.isLoading} />
        <StatCard label="Chunks" value={totalChunks} loading={query.isLoading} />
      </div>

      <div className="mt-8">
        <Link
          href="/admin/kb"
          className="inline-block rounded bg-[oklch(0.42_0.04_260)] px-4 py-2 text-sm font-medium text-white hover:bg-[oklch(0.36_0.04_260)]"
        >
          Manage KBs →
        </Link>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  loading,
}: {
  label: string;
  value: number;
  loading: boolean;
}) {
  return (
    <div className="rounded border border-[oklch(0.92_0_0)] p-4">
      <div className="text-xs uppercase tracking-wide text-[oklch(0.45_0_0)]">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold">
        {loading ? '—' : value.toLocaleString()}
      </div>
    </div>
  );
}
