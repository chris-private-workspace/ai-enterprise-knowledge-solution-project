/**
 * Toolchain sanity test — zod + react-hook-form + @hookform/resolvers
 * (W24b-wave-c2 F1.5).
 *
 * F1 installs the 3 form-validation deps that Wave C2 inline-edit depends on.
 * This test proves the 3 integrate before F2 builds the real
 * `lib/schemas/admin/` schemas on top of them — parse / safeParse field-error
 * surfacing / zodResolver bridge / useForm export.
 *
 * The inline `sampleSchema` mirrors two real Wave C1 constraints (Entra
 * tenant_id UUID + alert_threshold_pct 50-95) so the toolchain is exercised
 * against the actual shape it will validate, not a toy schema.
 */

import { describe, expect, it } from 'vitest';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const sampleSchema = z.object({
  tenant_id: z.string().uuid(),
  alert_threshold_pct: z.number().int().min(50).max(95),
});

describe('zod + react-hook-form toolchain (W24b F1.5)', () => {
  it('zod parses a valid payload', () => {
    const parsed = sampleSchema.parse({
      tenant_id: '00000000-0000-0000-0000-000000000000',
      alert_threshold_pct: 80,
    });
    expect(parsed.alert_threshold_pct).toBe(80);
  });

  it('zod safeParse surfaces field-level errors on an invalid payload', () => {
    const result = sampleSchema.safeParse({
      tenant_id: 'not-a-uuid',
      alert_threshold_pct: 200,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const fields = result.error.issues.map((issue) => issue.path[0]);
      expect(fields).toContain('tenant_id');
      expect(fields).toContain('alert_threshold_pct');
    }
  });

  it('zodResolver bridges a zod schema into a react-hook-form resolver', () => {
    expect(typeof zodResolver(sampleSchema)).toBe('function');
  });

  it('react-hook-form exposes the useForm hook', () => {
    expect(typeof useForm).toBe('function');
  });
});
