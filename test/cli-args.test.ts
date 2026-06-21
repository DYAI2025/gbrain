import { describe, expect, test } from 'bun:test';
import { parseOpArgs } from '../src/cli.ts';
import { operationsByName } from '../src/core/operations.ts';

describe('parseOpArgs', () => {
  test('--no-<boolean> maps to false without consuming the next flag', () => {
    const params = parseOpArgs(operationsByName.query, [
      'freshEmbedSourceScope code source',
      '--limit',
      '8',
      '--no-expand',
      '--source-id',
      'gstack-code-repo-0e4763c9',
    ]);

    expect(params).toEqual({
      query: 'freshEmbedSourceScope code source',
      limit: 8,
      expand: false,
      source_id: 'gstack-code-repo-0e4763c9',
    });
  });

  // Regression: --dry-run is a GLOBAL context flag (ctx.dryRun via makeContext),
  // honored by ~16 mutating ops, but declared as a param by none of them. Before
  // this fix the generic parser silently dropped --dry-run on put_page et al., so
  // `gbrain put <slug> --dry-run` executed a REAL write. See intake finding F-001.
  test('--dry-run sets params.dry_run on an op that does not declare it', () => {
    const params = parseOpArgs(operationsByName.put_page, ['my-slug', '--dry-run']);
    expect(params.dry_run).toBe(true);
    expect(params.slug).toBe('my-slug');
  });

  test('--dry-run is boolean and does not swallow the following token', () => {
    const params = parseOpArgs(operationsByName.put_page, [
      'my-slug',
      '--dry-run',
      '--source-kind',
      'capture-cli',
    ]);
    expect(params.dry_run).toBe(true);
    expect(params.source_kind).toBe('capture-cli');
  });
});

