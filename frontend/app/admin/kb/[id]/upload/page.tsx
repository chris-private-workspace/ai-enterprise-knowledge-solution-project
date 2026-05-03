'use client';

/**
 * KB Upload (`/admin/kb/[id]/upload`) — per architecture.md §5.4 view 5.
 *
 * Multipart upload form to POST /kb/{id}/documents (C01 ingestion entry).
 * W2 baseline plain HTML form; W3 D5 F8 Pipeline wizard polish + drag-drop.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { kbApi } from '@/lib/api/kb';

export default function KbUploadPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [file, setFile] = useState<File | null>(null);

  const mutation = useMutation({
    mutationFn: (f: File) => kbApi.uploadDoc(params.id, f),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kb', params.id] });
      queryClient.invalidateQueries({ queryKey: ['kb', 'list'] });
      router.push(`/admin/kb/${params.id}`);
    },
  });

  return (
    <div className="max-w-xl">
      <Link href={`/admin/kb/${params.id}`} className="text-sm text-[oklch(0.42_0.04_260)] hover:underline">
        ← Back to KB
      </Link>
      <h1 className="mt-2 text-2xl font-semibold">Upload Document</h1>
      <p className="mt-1 text-sm text-[oklch(0.45_0_0)]">
        Accepts .docx, .pdf, .pptx (per architecture.md §3.3).
      </p>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (file) mutation.mutate(file);
        }}
        className="mt-6 space-y-4"
      >
        <input
          type="file"
          accept=".docx,.pdf,.pptx"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm"
        />

        <button
          type="submit"
          disabled={!file || mutation.isPending}
          className="rounded bg-[oklch(0.42_0.04_260)] px-4 py-2 text-sm font-medium text-white hover:bg-[oklch(0.36_0.04_260)] disabled:opacity-50"
        >
          {mutation.isPending ? 'Uploading…' : 'Upload + Ingest'}
        </button>

        {mutation.isError && (
          <div className="rounded border border-[oklch(0.57_0.22_25)] bg-[oklch(0.96_0.02_25)] p-3 text-sm">
            Upload failed: {String((mutation.error as Error)?.message)}
          </div>
        )}
      </form>
    </div>
  );
}
