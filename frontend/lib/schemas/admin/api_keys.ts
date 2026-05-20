/**
 * Zod schema for the API Keys & Quotas settings tab (W24b-wave-c2 F2).
 *
 * Runtime mirror of backend `api/schemas/admin_api_keys.py` `AlertThresholdPatch`
 * — the only operator-editable knob on this tab. TPM / RPM caps are Azure-portal
 * authoritative (deferred Wave B+), so they have no schema here.
 */

import { z } from 'zod';

export const alertThresholdSchema = z.object({
  alert_threshold_pct: z
    .number({ invalid_type_error: 'Enter a number between 50 and 95' })
    .int('Must be a whole number')
    .min(50, 'Threshold must be at least 50%')
    .max(95, 'Threshold must be at most 95%'),
});

export type AlertThresholdInput = z.infer<typeof alertThresholdSchema>;
