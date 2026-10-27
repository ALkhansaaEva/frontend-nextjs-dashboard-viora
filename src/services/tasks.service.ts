import rulesService from './rules.service';
import type { RewardBundleV2, RuleDefinition, RuleDefinitionState, RuleGraph, RuleWindowType } from '@/types/rules';

/**
 * Tasks are NOT a standalone backend entity — verified by direct source read.
 * There is no `TaskDefinition` entity anywhere. Tasks = `RuleDefinition.kind='TASK'`,
 * served entirely by RuleAdminController (`/admin/rules`), exactly like Achievements.
 *
 * Also confirmed broken (direct source read of meta-game.controller.ts): it exposes
 * ONLY getUserRanking/getLeaderboard/getOtherUserRanking/getFriendsLeaderboard.
 * `/meta-game/tasks`, `/meta-game/task-definitions`, `/meta-game/daily-login`,
 * `/meta-game/daily-login/claim`, and the task-claim routes referenced by
 * `meta-game.service.ts` do NOT exist on the backend. Do not use metaGameService for
 * task data — this service is the real one.
 */

export interface TaskMetadata {
  titleI18n: Record<string, string>;
  descriptionI18n?: Record<string, string>;
  taskType?: string;
}

export interface CreateTaskRequest {
  code: string;
  version: number;
  metadata: TaskMetadata;
  graphDefinition: RuleGraph;
  targetCount: string;
  rewardBundle?: RewardBundleV2;
  mediaId?: string | null;
}

export const tasksService = {
  /** POST /admin/rules with kind='TASK'. */
  async createTask(data: CreateTaskRequest): Promise<RuleDefinition> {
    return rulesService.createRule({
      definitionKey: data.code,
      definitionVersion: data.version,
      kind: 'TASK',
      graphDefinition: data.graphDefinition,
      targetCount: data.targetCount,
      rewardDefinition: data.rewardBundle as unknown as Record<string, unknown> | undefined,
      metadata: data.metadata as unknown as Record<string, unknown>,
      mediaId: data.mediaId,
    });
  },

  /** GET /admin/rules?kind=TASK — durable, paginated, server-authoritative. */
  async listTasks(params?: { state?: RuleDefinitionState; definitionKey?: string; window?: RuleWindowType; limit?: number; offset?: number }) {
    return rulesService.listRules({ kind: 'TASK', ...params });
  },

  getTaskById: rulesService.getRuleById,
  validateTask: rulesService.validateRule,
  publishTask: rulesService.publishRule,
  disableTask: rulesService.disableRule,
  activateTask: rulesService.activateRule,
  rollbackTask: rulesService.rollbackRule,

  /** GET /progress?kind=TASK — self-service progress query (current user only). */
  async getMyProgress(params?: { limit?: number; offset?: number }): Promise<unknown> {
    return rulesService.getProgress('TASK', params);
  },
};

export default tasksService;
