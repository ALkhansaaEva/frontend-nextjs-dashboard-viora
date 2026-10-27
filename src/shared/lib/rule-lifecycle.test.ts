import { describe, expect, it } from 'vitest';
import { getRuleAdminActions } from './rule-lifecycle';

describe('rule admin lifecycle', () => {
  it('matches the backend transition guards', () => {
    expect(getRuleAdminActions(null)).toEqual(['save', 'validate', 'preview']);
    expect(getRuleAdminActions('DRAFT')).toEqual(['save', 'validate', 'preview', 'archive']);
    expect(getRuleAdminActions('VALIDATED')).toEqual([
      'validate',
      'preview',
      'publish',
      'archive',
      'newVersion',
    ]);
    expect(getRuleAdminActions('PUBLISHED')).toEqual(['preview', 'disable', 'newVersion']);
    expect(getRuleAdminActions('DISABLED')).toEqual([
      'preview',
      'activate',
      'archive',
      'newVersion',
    ]);
    expect(getRuleAdminActions('ROLLED_BACK')).toEqual(['preview', 'archive', 'newVersion']);
    expect(getRuleAdminActions('ARCHIVED')).toEqual(['preview', 'newVersion']);
  });

  it('never exposes destructive hard deletion', () => {
    for (const state of [null, 'DRAFT', 'VALIDATED', 'PUBLISHED', 'DISABLED', 'ROLLED_BACK', 'ARCHIVED'] as const) {
      expect(getRuleAdminActions(state)).not.toContain('delete');
    }
  });
});
