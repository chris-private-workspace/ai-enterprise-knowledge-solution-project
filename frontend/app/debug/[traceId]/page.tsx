/**
 * Debug View (`/debug/[traceId]`) — per architecture.md §5.7.
 * Vertical timeline of 9 pipeline stages. W3+ deliverable (when Langfuse traces exist).
 */

export default function DebugTracePage({ params }: { params: { traceId: string } }) {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold">Trace: {params.traceId}</h1>
      <p className="mt-2 text-muted-foreground">
        W1 skeleton. 9-stage timeline (W3+ per §5.7).
      </p>
    </main>
  );
}
