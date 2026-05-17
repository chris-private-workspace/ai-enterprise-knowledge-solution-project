/**
 * Unit tests — <DisabledAffordance> (W20 F1.5 / F8.4).
 *
 * Verifies: p1-strict variant renders with `aria-disabled` + `title` + opacity
 * + pointer-events disabled; p3-preview variant renders the inline TIER 2
 * badge when `showBadge` set; aria-label exposes the `reason` (+ `tier2Trigger`
 * when supplied) so AT announces the affordance reason.
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { DisabledAffordance } from '../../components/ui/disabled-affordance';

describe('DisabledAffordance', () => {
  it('p1-strict renders aria-disabled wrapper + dims the children', () => {
    const { container } = render(
      <DisabledAffordance reason="Not implemented yet">
        <button disabled>Pinned action</button>
      </DisabledAffordance>,
    );
    const wrapper = container.querySelector('[aria-disabled="true"]');
    expect(wrapper).not.toBeNull();
    expect(wrapper).toHaveAttribute('title', 'Not implemented yet');
    expect(wrapper).toHaveAttribute('aria-label', 'Not implemented yet');
    expect(wrapper?.className).toContain('opacity-60');
    expect(wrapper?.className).toContain('pointer-events-none');
    expect(screen.getByRole('button', { name: 'Pinned action' })).toBeDisabled();
  });

  it('p3-preview renders the TIER 2 badge when showBadge is true', () => {
    render(
      <DisabledAffordance
        variant="p3-preview"
        reason="Preview only"
        tier2Trigger="custom roles"
        showBadge
      >
        <span>Power User</span>
      </DisabledAffordance>,
    );
    expect(screen.getByText('TIER 2')).toBeInTheDocument();
    // aria-label concatenates reason + tier2Trigger separator.
    expect(
      screen.getByLabelText('Preview only · custom roles'),
    ).toBeInTheDocument();
  });

  it('p3-preview omits the badge when showBadge is omitted', () => {
    render(
      <DisabledAffordance variant="p3-preview" reason="Quiet preview">
        <span>Quiet child</span>
      </DisabledAffordance>,
    );
    expect(screen.queryByText('TIER 2')).not.toBeInTheDocument();
  });
});
