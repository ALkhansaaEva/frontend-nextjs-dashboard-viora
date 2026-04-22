import apiClient from '@/lib/api/api-client';
import { FeatureFlagSchema, type FeatureFlag, SystemConfigSchema, type SystemConfig } from '@/dto/configs/configs.dto';

export const configsService = {
  async getConfigs(): Promise<SystemConfig> {
    const response = await apiClient.get<SystemConfig>('/configs');
    return SystemConfigSchema.parse(response);
  },

  async getAllRawConfigs(): Promise<Record<string, unknown>> {
    return apiClient.get<Record<string, unknown>>('/configs/all');
  },

  async getFeatureFlags(): Promise<FeatureFlag[]> {
    const response = await apiClient.get<FeatureFlag[] | { data: FeatureFlag[] }>('/configs/flags');
    const flags = Array.isArray(response) ? response : (response as { data: FeatureFlag[] }).data || [];
    return flags.map(flag => FeatureFlagSchema.parse(flag));
  },

  async isFeatureEnabled(key: string): Promise<boolean> {
    return apiClient.get<boolean>(`/configs/flags/${key}/enabled`);
  },

  async setFeatureFlag(key: string, enabled: boolean, value?: string): Promise<void> {
    await apiClient.post('/configs/flags', { key, enabled, value });
  },

  async refreshConfigs(): Promise<void> {
    await apiClient.post('/configs/refresh');
  },
};

export default configsService;