/**
 * Readable labels for enum/identifier values that have no server-provided
 * display text. Keep the raw value next to the label in detail views; this is
 * presentation only and never changes what the API stores or receives.
 */

const ACRONYMS = new Set(['id', 'xp', 'url', 'sku', 'os', 'api', 'uuid', 'sql']);

/** `chat_contribution_level` / `CHAT_CONTRIBUTION_LEVEL` → `Chat Contribution Level`. */
export function humanizeToken(value: string | null | undefined): string {
  if (!value) return '—';
  const words = value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .split(/[_\-\s.]+/)
    .filter(Boolean);
  if (words.length === 0) return '—';
  return words
    .map((word) => {
      const lower = word.toLowerCase();
      if (ACRONYMS.has(lower)) return lower.toUpperCase();
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(' ');
}

/** Booleans render as Yes/No instead of the raw `true`/`false`. */
export function yesNo(value: boolean | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return value ? 'Yes' : 'No';
}

/**
 * Rule definitions carry their human title in authoring metadata
 * (`metadata.titleI18n`). The definition key is an internal identifier and is
 * only a fallback, never the primary label.
 */
export function ruleTitle(rule: {
  definitionKey: string;
  metadata?: Record<string, unknown> | null;
}): string {
  const titles = rule.metadata?.titleI18n as Record<string, string> | undefined;
  return titles?.en || titles?.ar || humanizeToken(rule.definitionKey);
}

/**
 * Room moderation rows carry a DB `userId` plus the joined `username` and
 * public `immutableUserId`. Show the human identity; the truncated UUID is the
 * last resort only, never the primary label.
 */
export function userDisplayName(
  user:
    | {
        username?: string | null;
        immutableUserId?: string | null;
        userId?: string | null;
      }
    | null
    | undefined,
): string {
  if (!user) return '—';
  if (user.username) return user.username;
  if (user.immutableUserId) return `#${user.immutableUserId}`;
  if (user.userId) return `${user.userId.slice(0, 8)}…`;
  return '—';
}
