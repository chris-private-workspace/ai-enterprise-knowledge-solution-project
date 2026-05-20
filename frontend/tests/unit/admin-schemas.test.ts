/**
 * Unit tests — admin settings zod schemas (W24b-wave-c2 F2).
 *
 * Verifies the runtime validation layer the Wave C2 inline-edit forms consume:
 * each schema accepts a backend-shaped valid payload and rejects the specific
 * malformed inputs a Beta operator could realistically type.
 */

import { describe, expect, it } from 'vitest';

import { alertThresholdSchema } from '@/lib/schemas/admin/api_keys';
import { providerPatchSchema } from '@/lib/schemas/admin/connections';
import {
  entraTenantConfigSchema,
  msalConfigSchema,
  signInPolicyConfigSchema,
} from '@/lib/schemas/admin/identity';

describe('entraTenantConfigSchema (W24b F2)', () => {
  it('accepts a valid Entra tenant config', () => {
    const result = entraTenantConfigSchema.safeParse({
      tenant_id: 'f8b1c2d3-0000-4000-8000-000000002056',
      tenant_domain: 'ricoh.onmicrosoft.com',
      cloud_instance: 'azure_public',
      authority_url: null,
    });
    expect(result.success).toBe(true);
  });

  it('rejects a non-GUID tenant_id', () => {
    const result = entraTenantConfigSchema.safeParse({
      tenant_id: 'not-a-guid',
      tenant_domain: 'ricoh.onmicrosoft.com',
      cloud_instance: 'azure_public',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path[0]).toBe('tenant_id');
    }
  });

  it('rejects an unknown cloud_instance enum member', () => {
    const result = entraTenantConfigSchema.safeParse({
      tenant_id: 'f8b1c2d3-0000-4000-8000-000000002056',
      tenant_domain: 'ricoh.onmicrosoft.com',
      cloud_instance: 'azure_mars',
    });
    expect(result.success).toBe(false);
  });
});

describe('alertThresholdSchema (W24b F2)', () => {
  it('accepts a threshold inside the 50-95 band', () => {
    expect(alertThresholdSchema.safeParse({ alert_threshold_pct: 80 }).success).toBe(
      true,
    );
  });

  it('rejects a threshold below 50', () => {
    const result = alertThresholdSchema.safeParse({ alert_threshold_pct: 30 });
    expect(result.success).toBe(false);
  });

  it('rejects a threshold above 95', () => {
    expect(
      alertThresholdSchema.safeParse({ alert_threshold_pct: 100 }).success,
    ).toBe(false);
  });

  it('rejects a non-integer threshold', () => {
    expect(
      alertThresholdSchema.safeParse({ alert_threshold_pct: 80.5 }).success,
    ).toBe(false);
  });
});

describe('signInPolicyConfigSchema (W24b F2)', () => {
  it('accepts well-formed allowed email domains', () => {
    const result = signInPolicyConfigSchema.safeParse({
      allowed_email_domains: ['@ricoh.com', '@ricoh.co.jp'],
      require_mfa_workspace_admin: true,
      require_mfa_all_roles_tier2: false,
      auto_disable_after_days: 90,
    });
    expect(result.success).toBe(true);
  });

  it("rejects an email domain missing the leading '@'", () => {
    const result = signInPolicyConfigSchema.safeParse({
      allowed_email_domains: ['ricoh.com'],
      require_mfa_workspace_admin: false,
      require_mfa_all_roles_tier2: false,
      auto_disable_after_days: 0,
    });
    expect(result.success).toBe(false);
  });

  it('rejects require_mfa_all_roles_tier2 set true (Tier 2 boundary)', () => {
    const result = signInPolicyConfigSchema.safeParse({
      allowed_email_domains: ['@ricoh.com'],
      require_mfa_workspace_admin: false,
      require_mfa_all_roles_tier2: true,
      auto_disable_after_days: 90,
    });
    expect(result.success).toBe(false);
  });
});

describe('msalConfigSchema (W24b F2)', () => {
  it('accepts duration-shaped rotation fields', () => {
    const result = msalConfigSchema.safeParse({
      token_cache_strategy: 'memory',
      session_ttl: '7d',
      refresh_token_rotation: '24h',
      csrf_token_rotation: '1h',
      cookie_settings_preview: 'Set-Cookie: ekp_session=…',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a free-text duration', () => {
    const result = msalConfigSchema.safeParse({
      token_cache_strategy: 'memory',
      session_ttl: 'one week',
      refresh_token_rotation: '24h',
      csrf_token_rotation: '1h',
      cookie_settings_preview: '',
    });
    expect(result.success).toBe(false);
  });
});

describe('providerPatchSchema (W24b F2)', () => {
  it('accepts a valid endpoint URL', () => {
    const result = providerPatchSchema.safeParse({
      endpoint_url: 'https://ekp.openai.azure.com',
      region: 'eastus2',
      display_name: 'Azure OpenAI',
    });
    expect(result.success).toBe(true);
  });

  it('accepts an empty endpoint_url (operator clearing the field)', () => {
    expect(providerPatchSchema.safeParse({ endpoint_url: '' }).success).toBe(true);
  });

  it('rejects a malformed endpoint URL', () => {
    expect(
      providerPatchSchema.safeParse({ endpoint_url: 'not a url' }).success,
    ).toBe(false);
  });

  it('rejects an empty display_name', () => {
    expect(
      providerPatchSchema.safeParse({ display_name: '' }).success,
    ).toBe(false);
  });
});
