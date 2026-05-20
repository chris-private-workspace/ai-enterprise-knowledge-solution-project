/**
 * Zod schema for the Connections settings tab (W24b-wave-c2 F2).
 *
 * Runtime mirror of backend `api/schemas/admin.py` `ProviderPatch` — the
 * non-secret PATCH-able fields (endpoint URL / region / display name). Secret
 * rotation has its own server-side endpoint and is never a client PATCH.
 *
 * `endpoint_url` accepts an empty string (operator clearing the field → backend
 * stores null) or a valid URL — nothing in between.
 */

import { z } from 'zod';

export const providerPatchSchema = z.object({
  endpoint_url: z
    .union([z.string().url('Must be a valid URL'), z.literal('')])
    .optional(),
  region: z.string().optional(),
  display_name: z.string().min(1, 'Display name cannot be empty').optional(),
});

export type ProviderPatchInput = z.infer<typeof providerPatchSchema>;
