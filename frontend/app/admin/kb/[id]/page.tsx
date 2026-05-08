'use client';

/**
 * KB Detail (`/admin/kb/[id]`) — per architecture.md v6 §5.4 view 4.
 *
 * W12 D4 F4.7 tokens migration: hardcoded oklch → token classes;
 * Upload CTA + Save Settings upgraded to shadcn Button. Functional logic
 * intact (TanStack Query useQuery + useMutation patchSettings).
 *
 * Layout reference Dify Image 4 (no code copy per ADR-0010).
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
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
      <div className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm">
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
          <p className="mt-1 text-xs text-muted-foreground">{kb.kb_id}</p>
        </div>
        <Button asChild>
          <Link href={`/admin/kb/${kbId}/upload`}>Upload Document</Link>
        </Button>
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
            className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
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
            className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
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
            className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
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
            className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </Field>
        <Field label="Default rerank_k">
          <input
            type="number"
            value={formState.default_rerank_k}
            onChange={(e) =>
              setFormState({ ...formState, default_rerank_k: Number(e.target.value) })
            }
            className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </Field>

        <div className="flex items-center gap-3 pt-3">
          <Button type="submit" disabled={patchMutation.isPending}>
            {patchMutation.isPending ? 'Saving…' : 'Save Settings'}
          </Button>
          {patchMutation.isError && (
            <span className="text-sm text-destructive">Save failed</span>
          )}
          {patchMutation.isSuccess && (
            <span className="text-sm text-success">Saved.</span>
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
                className="rounded-md border border-border p-3"
              >
                <div className="font-mono text-xs text-muted-foreground">
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
    <div className="rounded-md border border-border bg-card p-3">
      <div className="text-xs uppercase text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
