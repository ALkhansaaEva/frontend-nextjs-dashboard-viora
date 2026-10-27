import { describe, expect, it } from 'vitest';
import { buildMatchingRulePreviewFields } from './rule-preview-fixture';

describe('matching rule preview fixtures', () => {
  it('matches configured game type instead of retaining the generic ludo sample', () => {
    expect(
      buildMatchingRulePreviewFields('MATCH_FINISHED', [
        { type: 'GameTypeEquals', config: { value: 'domino' } },
      ]),
    ).toEqual({ gameType: 'domino' });
  });

  it('keeps integer-safe topup amounts and derives bounded value conditions', () => {
    expect(
      buildMatchingRulePreviewFields('AGENT_TOPUP', [
        { type: 'ValueGreaterThan', config: { path: 'payload.amount', value: '49999' } },
      ]),
    ).toEqual({ amount: '50000' });
  });

  it('hydrates user-context conditions without asking for a user UUID', () => {
    expect(
      buildMatchingRulePreviewFields('LOGIN', [
        { type: 'CountryEquals', config: { value: 'IQ' } },
        { type: 'HasRole', config: { value: 'player' } },
        { type: 'UserEligible', config: {} },
      ]),
    ).toEqual({
      gameType: 'ludo',
      userContext: { countryCode: 'IQ', roles: ['player'], eligible: true },
    });
  });

  it('creates a timestamp inside configured time/day conditions', () => {
    const fields = buildMatchingRulePreviewFields('SCHEDULE_TRIGGERED', [
      {
        type: 'TimeWindowActive',
        config: { startAt: '2026-08-25T00:00:00.000Z', endAt: '2026-08-27T00:00:00.000Z' },
      },
    ]);
    expect(new Date(String(fields.occurredAt)).getTime()).toBeGreaterThan(
      new Date('2026-08-25T00:00:00.000Z').getTime(),
    );
    expect(new Date(String(fields.occurredAt)).getTime()).toBeLessThan(
      new Date('2026-08-27T00:00:00.000Z').getTime(),
    );
  });

  it('hydrates configured aggregation paths with executable values', () => {
    expect(
      buildMatchingRulePreviewFields('MATCH_FINISHED', [
        { type: 'SUM', config: { path: 'payload.score' } },
      ]),
    ).toEqual({ gameType: 'ludo', score: '1' });
  });

  it('uses the canonical opponent path for unique-opponent counters', () => {
    expect(
      buildMatchingRulePreviewFields('MATCH_FINISHED', [
        { type: 'CountUniqueOpponents', config: {} },
      ]),
    ).toEqual({ gameType: 'ludo', opponentId: 'preview-opponent' });
  });
});
