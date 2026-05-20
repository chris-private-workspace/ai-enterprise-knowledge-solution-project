/**
 * Unit tests — `<ErrorBoundary>` class component (W24b-wave-c2 F4).
 *
 * Verifies the boundary that scopes each `/settings` tab: healthy children
 * pass through, a thrown child shows the fallback, and `reset` re-mounts the
 * children so a transient error can recover.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ErrorBoundary } from '@/components/error/error-boundary';

function Boom(): never {
  throw new Error('boom');
}

let throwOnNextRender = true;
function MaybeBoom() {
  if (throwOnNextRender) throw new Error('transient boom');
  return <div>recovered child</div>;
}

describe('ErrorBoundary (W24b F4)', () => {
  it('renders children when nothing throws', () => {
    render(
      <ErrorBoundary fallback={() => <div>fallback</div>}>
        <div>healthy child</div>
      </ErrorBoundary>,
    );
    expect(screen.getByText('healthy child')).toBeInTheDocument();
    expect(screen.queryByText('fallback')).not.toBeInTheDocument();
  });

  it('renders the fallback when a child throws during render', () => {
    // React logs the caught error to console — silence it for a clean run.
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <ErrorBoundary fallback={() => <div>fallback shown</div>}>
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByText('fallback shown')).toBeInTheDocument();
    spy.mockRestore();
  });

  it('reset re-mounts children — recovers when the child stops throwing', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    throwOnNextRender = true;
    render(
      <ErrorBoundary
        fallback={(reset) => (
          <button type="button" onClick={reset}>
            retry
          </button>
        )}
      >
        <MaybeBoom />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();

    // Simulate the transient error clearing, then retry.
    throwOnNextRender = false;
    fireEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(screen.getByText('recovered child')).toBeInTheDocument();
    spy.mockRestore();
  });
});
