'use client';

/**
 * KB Detail (`/admin/kb/[id]`) — per architecture.md §5.4 view 4.
 *
 * Shows KB summary + KbConfig form (PATCH /kb/{id}/settings) + link to upload.
 * W2 baseline plain HTML form; shadcn Form upgrade W3 D5 F8 polish window.
 * Layout reference Dify Image 4 (code not copied per CLAUDE.md §7).
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { kbApi, type KbConfig, type KbStatus } from '@/lib/api/kb';

export default function KbDetailPage() {
  const params = useParams<{ id: string }>();
  const kbId = params.id;

  const queryClient = useQueryClient();

  const query = useQuery<KbStatus>({
    queryKey: ['kb', kbId],
    queryFn: () => kbApi.get(kbId),
    enabled: !!kbId,
  });

  const [formState, setFormState] = useState<KbConfig | null>(null);

  useEffect(() => {
    if (query.data?.config && !formState) {
      setFormState(query.data.config);
    }
  }, [query.data, formState]);

  const patchMutation = useMutation({
    mutationFn: (config: Partial<KbConfig>) => kbApi.patchSettings(kbId, config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kb', kbId] });
      queryClient.invalidateQueries({ queryKey: ['kb', 'list'] });
    },
  });

  if (query.isLoading) return <p>Loading…</p>;
  if (query.isError) {
    return (
      <div className="rounded border border-[oklch(0.57_0.22_25)] bg-[oklch(0.96_0.02_25)] p-3 text-sm">
        Failed to load KB {kbId}: {String((query.error as Error)?.message)}
      </div>
    );
  }
  if (!query.data || !formState) return <p>No data.</p>;

  const kb = query.data;

  return (
    <div className="max-w-2xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{kb.name || kb.kb_id}</h1>
          <p className="mt-1 text-xs text-[oklch(0.45_0_0)]">{kb.kb_id}</p>
        </div>
        <Link
          href={`/admin/kb/${kbId}/upload`}
          className="rounded bg-[oklch(0.42_0.04_260)] px-4 py-2 text-sm font-medium text-white hover:bg-[oklch(0.36_0.04_260)]"
        >
          Upload Document
        </Link>
      </div>

      <p className="mb-6 text-sm">{kb.description}</p>

      <div className="mb-8 grid grid-cols-3 gap-4">
        <Stat label="Documents" value={kb.total_documents} />
        <Stat label="Chunks" value={kb.total_chunks} />
        <Stat label="Storage MB" value={kb.storage_size_mb.toFixed(1)} />
      </div>

      <h2 className="mb-3 text-lg font-medium">Settings</h2>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          patchMutation.mutate(formState);
        }}
        className="space-y-3"
      >
        <Field label="Embedding Model">
          <input
            value={formState.embedding_model}
            onChange={(e) =>
              setFormState({ ...formState, embedding_model: e.target.value })
            }
            className="w-full rounded border border-[oklch(0.92_0_0)] px-3 py-1.5 text-sm"
          />
        </Field>
        <Field label="Embedding Dimension">
          <input
            type="number"
            value={formState.embedding_dimension}
            onChange={(e) =>
              setFormState({
                ...formState,
                embedding_dimension: Number(e.target.value),
              })
            }
            className="w-full rounded border border-[oklch(0.92_0_0)] px-3 py-1.5 text-sm"
          />
        </Field>
        <Field label="Chunk Strategy">
          <select
            value={formState.chunk_strategy}
            onChange={(e) =>
              setFormState({
                ...formState,
                chunk_strategy: e.target.value as KbConfig['chunk_strategy'],
              })
            }
            className="w-full rounded border border-[oklch(0.92_0_0)] px-3 py-1.5 text-sm"
          >
            <option value="auto">auto</option>
            <option value="layout_aware">layout_aware</option>
            <option value="heading_aware">heading_aware</option>
            <option value="slide_based">slide_based</option>
          </select>
        </Field>
        <Field label="Default top_k retrieval">
          <input
            type="number"
            value={formState.default_top_k}
            onChange={(e) =>
              setFormState({ ...formState, default_top_k: Number(e.target.value) })
            }
            className="w-full rounded border border-[oklch(0.92_0_0)] px-3 py-1.5 text-sm"
          />
        </Field>
        <Field label="Default rerank_k">
          <input
            type="number"
            value={formState.default_rerank_k}
            onChange={(e) =>
              setFormState({ ...formState, default_rerank_k: Number(e.target.value) })
            }
            className="w-full rounded border border-[oklch(0.92_0_0)] px-3 py-1.5 text-sm"
          />
        </Field>

        <div className="pt-3">
          <button
            type="submit"
            disabled={patchMutation.isPending}
            className="rounded bg-[oklch(0.42_0.04_260)] px-4 py-2 text-sm font-medium text-white hover:bg-[oklch(0.36_0.04_260)] disabled:opacity-50"
          >
            {patchMutation.isPending ? 'Saving…' : 'Save Settings'}
          </button>
          {patchMutation.isError && (
            <span className="ml-3 text-sm text-[oklch(0.57_0.22_25)]">
              Save failed
            </span>
          )}
          {patchMutation.isSuccess && (
            <span className="ml-3 text-sm text-[oklch(0.65_0.16_145)]">Saved.</span>
          )}
        </div>
      </form>

      {kb.failed_documents.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 text-lg font-medium">Failed Documents</h2>
          <ul className="space-y-2 text-sm">
            {kb.failed_documents.map((f) => (
              <li
                key={f.doc_id}
                className="rounded border border-[oklch(0.92_0_0)] p-3"
              >
                <div className="font-mono text-xs text-[oklch(0.45_0_0)]">
                  {f.doc_id} · stage={f.stage}
                </div>
                <div className="mt-1">{f.error}</div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded border border-[oklch(0.92_0_0)] p-3">
      <div className="text-xs uppercase text-[oklch(0.45_0_0)]">{label}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium uppercase tracking-wide text-[oklch(0.45_0_0)]">
        {label}
      </span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
