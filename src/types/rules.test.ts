import { describe, expect, it } from 'vitest';
import {
  emptyRewardBundle,
  validateRewardBundleClientSide,
  isRewardBundleV2Shape,
  ACTION_REWARD_TYPES,
  REWARD_ACTION_TYPES,
  REWARD_COMPONENT_TYPES,
  normalizeDefinitionKeyInput,
  RULE_IDENTITY,
  extractRulePreviewEvaluation,
  type RewardBundleV2,
} from '@/types/rules';

describe('Rule definition identity contract', () => {
  it('matches the backend lowercase definition-key policy', () => {
    expect(normalizeDefinitionKeyInput('Test')).toBe('test');
    expect(normalizeDefinitionKeyInput('TASK.Daily-Wins')).toBe('task.daily-wins');
    expect(RULE_IDENTITY.keyPattern.test('test')).toBe(true);
    expect(RULE_IDENTITY.keyPattern.test('Test')).toBe(false);
    expect(RULE_IDENTITY.keyPattern.test('_test')).toBe(false);
  });
});

describe('Rule preview response contract', () => {
  it('unwraps the backend evaluation envelope instead of rendering empty top-level fields', () => {
    const evaluation = {
      matched: true,
      windowIdentity: 'daily:2026-08-24',
      accumulator: { mode: 'increment' as const, value: '1' },
      actionTypes: ['CompleteTask'],
      executedSteps: 3,
    };
    expect(
      extractRulePreviewEvaluation({
        ruleId: 'rule-id',
        definitionKey: 'task_test',
        definitionVersion: 1,
        compiledHash: 'hash',
        evaluation,
        persisted: false,
      }),
    ).toBe(evaluation);
  });
});

describe('RewardBundleV2 client contract', () => {
  it('empty bundle is valid', () => {
    expect(validateRewardBundleClientSide(emptyRewardBundle())).toHaveLength(0);
  });

  it('accepts a canonical GAME_CURRENCY component with exact string amount', () => {
    const bundle: RewardBundleV2 = {
      version: 2,
      components: [{ id: 'qa_ludo_three_wins_game_currency', type: 'GAME_CURRENCY', amount: '123456789012345678901234' }],
    };
    expect(validateRewardBundleClientSide(bundle)).toHaveLength(0);
    expect((bundle.components[0] as { type: 'GAME_CURRENCY'; amount: string }).amount).toBe('123456789012345678901234');
  });

  it('rejects non-positive-integer GAME_CURRENCY amounts', () => {
    const bundle: RewardBundleV2 = {
      version: 2,
      components: [{ id: 'c1', type: 'GAME_CURRENCY', amount: '-1' }],
    };
    expect(validateRewardBundleClientSide(bundle).length).toBeGreaterThan(0);
  });

  it('rejects duplicate component ids', () => {
    const bundle: RewardBundleV2 = {
      version: 2,
      components: [
        { id: 'dup', type: 'XP', amount: 10 },
        { id: 'dup', type: 'XP', amount: 20 },
      ],
    };
    expect(validateRewardBundleClientSide(bundle).some((m) => /duplicated/.test(m))).toBe(true);
  });

  it('rejects more than the backend component cap', () => {
    const bundle: RewardBundleV2 = {
      version: 2,
      components: Array.from({ length: 21 }, (_, i) => ({ id: `c${i}`, type: 'XP' as const, amount: 1 })),
    };
    expect(validateRewardBundleClientSide(bundle).length).toBeGreaterThan(0);
  });

  it('shape guard accepts persisted jsonb bundles and rejects others', () => {
    expect(isRewardBundleV2Shape({ version: 2, components: [] })).toBe(true);
    expect(isRewardBundleV2Shape({ version: 1, components: [] })).toBe(false);
    expect(isRewardBundleV2Shape({ xp: 10 })).toBe(false);
    expect(isRewardBundleV2Shape(null)).toBe(false);
  });

  it('matches the backend GrantBundle and GrantVoucher component contract', () => {
    expect(REWARD_COMPONENT_TYPES).toEqual(
      expect.arrayContaining(['BUNDLE', 'VOUCHER']),
    );
    expect(REWARD_ACTION_TYPES.BUNDLE).toBe('GrantBundle');
    expect(REWARD_ACTION_TYPES.VOUCHER).toBe('GrantVoucher');
    expect(ACTION_REWARD_TYPES.GrantBundle).toBe('BUNDLE');
    expect(ACTION_REWARD_TYPES.GrantVoucher).toBe('VOUCHER');
  });

  it('validates canonical bundle and voucher components', () => {
    expect(
      validateRewardBundleClientSide({
        version: 2,
        components: [
          { id: 'bundle_reward', type: 'BUNDLE', bundleId: 'starter_pack' },
          {
            id: 'voucher_reward',
            type: 'VOUCHER',
            definitionKey: 'WELCOME_VOUCHER',
            quantity: 2,
          },
        ],
      } as RewardBundleV2),
    ).toEqual([]);
  });
});
