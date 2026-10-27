import type { RuleDefinition } from '@/types/rules';

export type RuleAdminAction =
  | 'save'
  | 'validate'
  | 'preview'
  | 'publish'
  | 'disable'
  | 'activate'
  | 'archive'
  | 'newVersion';

/** Mirrors RuleDefinitionService's transition guards. `null` is an unsaved
 * canvas: preview/validate first persist it as a DRAFT. */
export function getRuleAdminActions(
  state: RuleDefinition['state'] | null,
): RuleAdminAction[] {
  switch (state) {
    case null:
      return ['save', 'validate', 'preview'];
    case 'DRAFT':
      return ['save', 'validate', 'preview', 'archive'];
    case 'VALIDATED':
      return ['validate', 'preview', 'publish', 'archive', 'newVersion'];
    case 'PUBLISHED':
      return ['preview', 'disable', 'newVersion'];
    case 'DISABLED':
      return ['preview', 'activate', 'archive', 'newVersion'];
    case 'ROLLED_BACK':
      return ['preview', 'archive', 'newVersion'];
    case 'ARCHIVED':
      return ['preview', 'newVersion'];
  }
}
