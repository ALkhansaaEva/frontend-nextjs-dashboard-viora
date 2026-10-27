import { describe, expect, it } from 'vitest';
import type { RuleProgressItem } from '@/types/rules';
import { calculateRuleProgressPercent } from './RuleProgressPanel';

function progressItem(overrides: Partial<RuleProgressItem> = {}): RuleProgressItem {
  return {
    id: 'rule',
    definitionKey: 'task_progress',
    definitionVersion: 1,
    kind: 'TASK',
    targetCount: '4',
    metadata: {},
    completed: false,
    completedAt: null,
    progress: { mode: 'COUNT', value: '2', target: '4', windowIdentity: 'lifetime' },
    stages: [],
    reward: { automatic: true, components: [], delivery: [] },
    ...overrides,
  };
}

describe('calculateRuleProgressPercent', () => {
  it('shows count progress without unsafe Number conversion', () => {
    expect(calculateRuleProgressPercent(progressItem())).toBe(50);
    expect(calculateRuleProgressPercent(progressItem({
      progress: {
        mode: 'COUNT',
        value: '900719925474099300000',
        target: '1801439850948198600000',
        windowIdentity: 'lifetime',
      },
    }))).toBe(50);
  });

  it('combines completed and partial stages instead of showing only 0/1', () => {
    expect(calculateRuleProgressPercent(progressItem({
      progress: { mode: 'STAGES', value: '1', target: '2', windowIdentity: 'day:2026-08-24' },
      stages: [
        { id: 's1', key: 'first', order: 1, eventType: 'MATCH_WON', value: '3', target: '3', completedAt: '2026-08-24T00:00:00Z', windowIdentity: 'day:2026-08-24' },
        { id: 's2', key: 'second', order: 2, eventType: 'GIFT_SENT', value: '1', target: '2', completedAt: null, windowIdentity: 'day:2026-08-24' },
      ],
    }))).toBe(75);
  });
});
