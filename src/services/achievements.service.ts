import rulesService from './rules.service';
import type { RewardBundleV2, RuleDefinition, RuleDefinitionState, RuleGraph } from '@/types/rules';

/**
 * Achievements are NOT a standalone backend CRUD domain — verified by direct source
 * read: `src/modules/achievements/` is empty (no controller/entity/DTO at all), and a
 * repo-wide search for `@Controller('achievements'` returns zero matches anywhere in
 * the backend. There is no `/admin/achievements` and no `/achievements*` route of any
 * kind — admin OR self-service.
 *
 * Achievement authoring is `RuleDefinition.kind = 'ACHIEVEMENT'`, served entirely by
 * `RuleAdminController` (`/admin/rules`). This service is a thin, honestly-named
 * wrapper over rules.service.ts — it does not call any achievements-prefixed route.
 */

export interface AchievementMetadata {
  titleI18n: Record<string, string>;
  descriptionI18n?: Record<string, string>;
  rarity?: 'common' | 'rare' | 'epic' | 'legendary';
  /**
   * BACKEND-AUTHORITATIVE key: rule-progress-query.service.ts filters
   * `metadata->>'hidden'` — a hidden achievement is invisible to the player
   * until completed. Do NOT write `isHidden`; that key has no backend consumer.
   */
  hidden?: boolean;
  /** @deprecated legacy key with no backend consumer — read-tolerated only. */
  isHidden?: boolean;
}

export interface CreateAchievementRequest {
  code: string;
  version: number;
  metadata: AchievementMetadata;
  graphDefinition: RuleGraph;
  targetCount: string;
  rewardBundle?: RewardBundleV2;
  mediaId?: string | null;
}

export const achievementsService = {
  /** POST /admin/rules with kind='ACHIEVEMENT'. */
  async createAchievement(data: CreateAchievementRequest): Promise<RuleDefinition> {
    return rulesService.createRule({
      definitionKey: data.code,
      definitionVersion: data.version,
      kind: 'ACHIEVEMENT',
      graphDefinition: data.graphDefinition,
      targetCount: data.targetCount,
      rewardDefinition: data.rewardBundle as unknown as Record<string, unknown> | undefined,
      metadata: data.metadata as unknown as Record<string, unknown>,
      mediaId: data.mediaId,
    });
  },

  /** GET /admin/rules?kind=ACHIEVEMENT — durable, paginated, server-authoritative. */
  async listAchievements(params?: { state?: RuleDefinitionState; definitionKey?: string; limit?: number; offset?: number }) {
    return rulesService.listRules({ kind: 'ACHIEVEMENT', ...params });
  },

  getAchievementById: rulesService.getRuleById,
  validateAchievement: rulesService.validateRule,
  publishAchievement: rulesService.publishRule,
  disableAchievement: rulesService.disableRule,
  activateAchievement: rulesService.activateRule,
  rollbackAchievement: rulesService.rollbackRule,

  /**
   * GET /progress?kind=ACHIEVEMENT — the only real read surface for achievement
   * progress, and it is self-service (current user only), not an admin listing.
   */
  async getMyProgress(params?: { limit?: number; offset?: number }): Promise<unknown> {
    return rulesService.getProgress('ACHIEVEMENT', params);
  },
};

export default achievementsService;
