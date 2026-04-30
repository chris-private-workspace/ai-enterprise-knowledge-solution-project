/**
 * KB Detail (`/admin/kb/[id]`) — per architecture.md §5.5.
 *
 * Sub-tabs (W2-W3 deliverable per §5.5.1–§5.5.5):
 * - Documents tab (Dify Image 4 layout reference)
 * - Pipeline tab (Dify Image 1 + 6 wizard reference)
 * - Retrieval Testing tab (Dify Image 2 reference)
 * - Settings tab
 *
 * H3 reminder: layout pattern reference only, NEVER copy Dify code.
 */

export default function KbDetailPage({ params }: { params: { id: string } }) {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold">KB: {params.id}</h1>
      <p className="mt-2 text-muted-foreground">
        W1 skeleton. Documents / Pipeline / Retrieval Testing / Settings tabs (W2 per §5.5).
      </p>
    </main>
  );
}
