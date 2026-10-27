import { describe, expect, it } from 'vitest';
import { humanizeToken, ruleTitle, userDisplayName } from './labels';

describe('humanizeToken', () => {
  it('turns snake and camel keys into readable words', () => {
    expect(humanizeToken('task_daily_room_messages')).toBe('Task Daily Room Messages');
    expect(humanizeToken('PUBLISHED')).toBe('Published');
    expect(humanizeToken(null)).toBe('—');
  });
});

describe('ruleTitle', () => {
  it('prefers the authored English title', () => {
    expect(
      ruleTitle({
        definitionKey: 'task_daily_room_messages',
        metadata: { titleI18n: { en: 'Daily Room Messages' } },
      }),
    ).toBe('Daily Room Messages');
  });

  it('falls back to the humanized key, never the raw key', () => {
    expect(ruleTitle({ definitionKey: 'task_daily_room_messages' })).toBe(
      'Task Daily Room Messages',
    );
  });
});

describe('userDisplayName', () => {
  it('prefers username, then the public id, then a short uuid', () => {
    expect(userDisplayName({ username: 'ahmed', immutableUserId: '00042' })).toBe('ahmed');
    expect(userDisplayName({ username: null, immutableUserId: '00042' })).toBe('#00042');
    expect(userDisplayName({ userId: '12345678-aaaa-bbbb-cccc-ddddeeeeffff' })).toBe('12345678…');
    expect(userDisplayName(null)).toBe('—');
  });
});
