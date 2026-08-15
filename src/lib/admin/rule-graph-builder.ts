import type { RuleGraph, RuleNode, RewardBundleV2, NodeRegistryResponse } from '@/types/rules';
import { REWARD_ACTION_TYPES } from '@/types/rules';

/**
 * Auto-wires a common linear Trigger -> Conditions(AND) -> Counter -> Window -> Actions
 * pipeline into a valid RuleGraph. This covers the documented common patterns (single
 * trigger; trigger+condition; trigger+counter; multiple AND-combined conditions;
 * windowed counter; action chain; multiple rewards) but NOT arbitrary nested OR/NOT
 * trees — that requires a full node-and-edge canvas editor, a follow-up beyond this
 * first version. Every id is namespaced per role so collisions can't occur.
 *
 * Reward Bundle -> Action node binding follows rule-definition.service.ts exactly:
 * one action node per reward component, `type` = REWARD_ACTION_TYPES[component.type],
 * and `config.rewardComponentId` always set explicitly (safe even when not strictly
 * required, per assertBundleActionAuthorization).
 */
export interface RuleStageSelection {
  trigger: { type: string; config: Record<string, unknown> } | null;
  conditions: Array<{ type: string; config: Record<string, unknown> }>;
  counter: { type: string; config: Record<string, unknown> } | null;
  window: { type: string; config: Record<string, unknown> } | null;
}

function findLogicAndType(registry: NodeRegistryResponse): string {
  const match = Object.entries(registry).find(
    ([type, d]) => d.category === 'LOGIC' && /^and$/i.test(type),
  );
  return match ? match[0] : 'AND';
}

export function buildRuleGraph(
  stages: RuleStageSelection,
  rewardBundle: RewardBundleV2,
  registry: NodeRegistryResponse,
): RuleGraph {
  const nodes: RuleNode[] = [];
  const edges: Array<{ from: string; to: string }> = [];

  if (!stages.trigger) return { nodes, edges };

  const triggerId = 'trigger_1';
  nodes.push({ id: triggerId, type: stages.trigger.type, config: stages.trigger.config });

  let upstream: string[] = [triggerId];

  if (stages.conditions.length > 0) {
    const conditionIds = stages.conditions.map((c, i) => {
      const id = `condition_${i + 1}`;
      nodes.push({ id, type: c.type, config: c.config });
      edges.push({ from: triggerId, to: id });
      return id;
    });

    if (conditionIds.length === 1) {
      upstream = conditionIds;
    } else {
      const andId = 'logic_and';
      nodes.push({ id: andId, type: findLogicAndType(registry), config: {} });
      conditionIds.forEach((id) => edges.push({ from: id, to: andId }));
      upstream = [andId];
    }
  }

  if (stages.counter) {
    const id = 'counter_1';
    nodes.push({ id, type: stages.counter.type, config: stages.counter.config });
    upstream.forEach((u) => edges.push({ from: u, to: id }));
    upstream = [id];
  }

  if (stages.window) {
    const id = 'window_1';
    nodes.push({ id, type: stages.window.type, config: stages.window.config });
    upstream.forEach((u) => edges.push({ from: u, to: id }));
    upstream = [id];
  }

  rewardBundle.components.forEach((component, i) => {
    const actionType = REWARD_ACTION_TYPES[component.type];
    const id = `action_${i + 1}`;
    nodes.push({ id, type: actionType, config: { rewardComponentId: component.id } });
    upstream.forEach((u) => edges.push({ from: u, to: id }));
  });

  return { nodes, edges };
}
