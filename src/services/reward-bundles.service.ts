import apiClient from '@/lib/api/api-client';
import type { RewardBundleV2 } from '@/types/rules';

interface RewardBundleValidationResult {
  valid: boolean;
  errors?: Array<{ componentId?: string; field?: string; message: string }>;
}

/** Wraps RewardBundleAdminController (`/admin/reward-bundles`) exactly. */
export const rewardBundlesService = {
  /** POST /admin/reward-bundles/validate — authoritative server-side validation. */
  async validate(bundle: RewardBundleV2): Promise<RewardBundleValidationResult> {
    return apiClient.post<RewardBundleValidationResult>('/admin/reward-bundles/validate', { bundle });
  },

  /** POST /admin/reward-bundles/dry-run — legacy -> V2 migration dry-run. */
  async dryRunMigration(payload: Record<string, unknown>): Promise<unknown> {
    return apiClient.post('/admin/reward-bundles/dry-run', payload);
  },

  /** POST /admin/reward-bundles/apply — execute legacy -> V2 migration. */
  async applyMigration(payload: Record<string, unknown>): Promise<unknown> {
    return apiClient.post('/admin/reward-bundles/apply', payload);
  },

  /** POST /admin/reward-bundles/resolve — resolve migration ambiguity with explicit bindings. */
  async resolveMigration(definitionKey: string, definitionVersion: number, bindings: Record<string, unknown>): Promise<unknown> {
    return apiClient.post('/admin/reward-bundles/resolve', { definitionKey, definitionVersion, bindings });
  },
};

export default rewardBundlesService;
