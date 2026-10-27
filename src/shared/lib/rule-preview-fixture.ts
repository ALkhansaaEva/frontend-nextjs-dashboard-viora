import type { GameplayEventEnvelope } from '@/types/rules';

type GameplayEventType = GameplayEventEnvelope['eventType'];

export interface RulePreviewFixtureNode {
  type: string;
  config?: Record<string, unknown>;
}

function setPath(target: Record<string, unknown>, path: string, value: unknown) {
  const parts = path.replace(/^payload\./, '').replace(/^event\./, '').split('.').filter(Boolean);
  let cursor = target;
  for (const part of parts.slice(0, -1)) {
    const existing = cursor[part];
    if (!existing || typeof existing !== 'object' || Array.isArray(existing)) cursor[part] = {};
    cursor = cursor[part] as Record<string, unknown>;
  }
  if (parts.length) cursor[parts.at(-1)!] = value;
}

function incrementDigits(value: string): string {
  const digits = value.split("");
  for (let index = digits.length - 1; index >= 0; index -= 1) {
    if (digits[index] !== "9") {
      digits[index] = String(Number(digits[index]) + 1);
      return digits.join("");
    }
    digits[index] = "0";
  }
  return `1${digits.join("")}`;
}

function decrementDigits(value: string): string {
  const digits = value.split("");
  for (let index = digits.length - 1; index >= 0; index -= 1) {
    if (digits[index] !== "0") {
      digits[index] = String(Number(digits[index]) - 1);
      break;
    }
    digits[index] = "9";
  }
  return digits.join("").replace(/^0+(?=\d)/, "");
}

function integerOffset(value: unknown, delta: 1 | -1): string {
  const source = String(value).trim();
  if (!/^-?\d+$/.test(source)) return delta > 0 ? "1" : "0";
  const negative = source.startsWith("-");
  const digits = source.replace(/^-/, "").replace(/^0+(?=\d)/, "");
  if (delta > 0) {
    if (!negative) return incrementDigits(digits);
    return digits === "1" ? "0" : `-${decrementDigits(digits)}`;
  }
  if (negative) return `-${incrementDigits(digits)}`;
  return digits === "0" ? "-1" : decrementDigits(digits);
}

function matchingOccurredAtForDay(value: unknown): string {
  const target = Number(value);
  const date = new Date();
  if (!Number.isInteger(target) || target < 0 || target > 6) return date.toISOString();
  date.setUTCDate(date.getUTCDate() + ((target - date.getUTCDay() + 7) % 7));
  return date.toISOString();
}

function matchingOccurredAtForWindow(startAt: unknown, endAt: unknown): string | undefined {
  const start = new Date(String(startAt)).getTime();
  const end = new Date(String(endAt)).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end) return undefined;
  return new Date(start + Math.max(1, Math.floor((end - start) / 2))).toISOString();
}

export function defaultPreviewFields(eventType: GameplayEventType): Record<string, unknown> {
  if (
    ['AGENT_TOPUP', 'AGENT_SALE_SETTLED', 'AGENT_CASHOUT_SETTLED', 'DISTRIBUTOR_ALLOCATION_SETTLED'].includes(
      eventType,
    )
  ) {
    return { amount: '10000' };
  }
  if (eventType === 'ROOM_CHAT_CHARACTER_COUNT') return { acceptedCharacterCount: 100 };
  return { gameType: 'ludo' };
}

export function buildMatchingRulePreviewFields(
  eventType: GameplayEventType,
  nodes: RulePreviewFixtureNode[],
): Record<string, unknown> {
  const fields = defaultPreviewFields(eventType);

  for (const node of nodes) {
    const config = node.config ?? {};
    const value = config.value;
    switch (node.type) {
      case 'GameTypeEquals':
        if (value != null) fields.gameType = value;
        break;
      case 'GameModeEquals':
        if (value != null) fields.gameMode = value;
        break;
      case 'MapEquals':
        if (value != null) fields.mapId = value;
        break;
      case 'AreaEquals':
        if (value != null) fields.areaId = value;
        break;
      case 'RoomEquals':
        if (value != null) fields.roomId = value;
        break;
      case 'RoomTypeEquals':
        if (value != null) fields.roomType = value;
        break;
      case 'OpponentTypeEquals':
        if (value != null) fields.opponentType = value;
        break;
      case 'CampaignEquals':
        if (value != null) fields.campaignId = value;
        break;
      case 'PlayerLevelAtLeast':
      case 'PlayerLevelAtMost':
        if (value != null) setPath(fields, 'userContext.playerLevel', value);
        break;
      case 'RankAtLeast':
        if (value != null) setPath(fields, 'userContext.rank', value);
        break;
      case 'RankInRange':
        if (config.minimum != null) setPath(fields, 'userContext.rank', config.minimum);
        break;
      case 'EventActive':
        fields.eventActive = true;
        break;
      case 'ValueEquals':
        if (typeof config.path === 'string') setPath(fields, config.path, value);
        break;
      case 'ValueNotEquals':
        if (typeof config.path === 'string') {
          setPath(
            fields,
            config.path,
            value === '__preview_non_matching_value__'
              ? '__preview_alternate_value__'
              : '__preview_non_matching_value__',
          );
        }
        break;
      case 'ValueGreaterThan':
        if (typeof config.path === 'string') setPath(fields, config.path, integerOffset(value, 1));
        break;
      case 'ValueGreaterOrEqual':
      case 'ValueLessOrEqual':
        if (typeof config.path === 'string') setPath(fields, config.path, value);
        break;
      case 'ValueLessThan':
        if (typeof config.path === 'string') setPath(fields, config.path, integerOffset(value, -1));
        break;
      case 'ValueBetween':
        if (typeof config.path === 'string') setPath(fields, config.path, config.minimum);
        break;
      case 'HasItem':
        if (value != null) setPath(fields, 'userContext.items', [value]);
        break;
      case 'HasAchievement':
        if (value != null) setPath(fields, 'userContext.achievements', [value]);
        break;
      case 'HasCompletedTask':
        if (value != null) setPath(fields, 'userContext.completedTasks', [value]);
        break;
      case 'HasRole':
        if (value != null) setPath(fields, 'userContext.roles', [value]);
        break;
      case 'CountryEquals':
        if (value != null) setPath(fields, 'userContext.countryCode', value);
        break;
      case 'UserEligible':
        setPath(fields, 'userContext.eligible', true);
        break;
      case 'LevelAtLeast':
        if (value != null) fields.level = value;
        break;
      case 'DayOfWeekEquals':
        fields.occurredAt = matchingOccurredAtForDay(value);
        break;
      case 'TimeWindowActive': {
        const occurredAt = matchingOccurredAtForWindow(config.startAt, config.endAt);
        if (occurredAt) fields.occurredAt = occurredAt;
        break;
      }
      case 'WalletBalanceAtLeast':
      case 'WalletBalanceAtMost':
        if (config.amount != null) setPath(fields, 'userContext.walletBalance', config.amount);
        break;
      case 'HasItemOfType':
        if (value != null) setPath(fields, 'userContext.itemDetails', [{ type: value }]);
        break;
      case 'HasItemInSlot':
        if (value != null) setPath(fields, 'userContext.itemDetails', [{ slot: value }]);
        break;
      case 'CountUniqueOpponents':
        setPath(
          fields,
          typeof config.path === 'string' ? config.path : 'payload.opponentId',
          'preview-opponent',
        );
        break;
      case 'SUM':
      case 'MIN':
      case 'MAX':
      case 'DISTINCT_COUNT':
        if (typeof config.path === 'string') {
          setPath(
            fields,
            config.path,
            node.type === 'DISTINCT_COUNT' ? 'preview-distinct-value' : '1',
          );
        }
        break;
    }
  }

  return fields;
}
