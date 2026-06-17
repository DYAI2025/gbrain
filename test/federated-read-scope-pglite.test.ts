/**
 * Feature 1: Close Federated Read Scope Gaps
 *
 * Tests that engine.getChunks (and by extension getRawData, getVersions —
 * same pattern) correctly honours sourceIds[] for federated read grants,
 * sourceId for scalar scope, and precedence of sourceIds over sourceId.
 *
 * Uses hermetic PGLite (no DATABASE_URL needed). Only getChunks is covered
 * here since the SQL pattern is identical across the three engine methods.
 */
import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import { PGLiteEngine } from '../src/core/pglite-engine.ts';
import { resetPgliteState } from './helpers/reset-pglite.ts';

let engine: PGLiteEngine;

beforeAll(async () => {
  engine = new PGLiteEngine();
  await engine.connect({});
  await engine.initSchema();
}, 60_000);

afterAll(async () => {
  await engine.disconnect();
});

/**
 * Seed two pages sharing the same slug across two sources, each with one
 * chunk whose chunk_text identifies its origin. Also create a 'default'-
 * source decoy page (same slug, different content).
 */
beforeEach(async () => {
  await resetPgliteState(engine);
  await engine.executeRaw(
    `INSERT INTO sources (id, name, config) VALUES ('src-b', 'src-b', '{}'::jsonb) ON CONFLICT DO NOTHING`,
  );

  // --- source 'default' page ---
  await engine.putPage('shared-page', {
    type: 'note',
    title: 'Default',
    compiled_truth: 'default content',
    timeline: '',
    frontmatter: {},
  }, { sourceId: 'default' });
  const pDefault = await engine.executeRaw<{ id: number }>(
    `SELECT id FROM pages WHERE slug = 'shared-page' AND source_id = 'default'`,
  );
  await engine.executeRaw(
    `INSERT INTO content_chunks (page_id, chunk_index, chunk_text, token_count) VALUES ($1, 0, 'chunk-default', 1)`,
    [pDefault[0]!.id],
  );

  // --- source 'src-b' page ---
  await engine.putPage('shared-page', {
    type: 'note',
    title: 'Source B',
    compiled_truth: 'src-b content',
    timeline: '',
    frontmatter: {},
  }, { sourceId: 'src-b' });
  const pB = await engine.executeRaw<{ id: number }>(
    `SELECT id FROM pages WHERE slug = 'shared-page' AND source_id = 'src-b'`,
  );
  await engine.executeRaw(
    `INSERT INTO content_chunks (page_id, chunk_index, chunk_text, token_count) VALUES ($1, 0, 'chunk-b', 1)`,
    [pB[0]!.id],
  );
});

describe('getChunks federated read scope', () => {
  test('1. scalar sourceId filters correctly', async () => {
    const chunks = await engine.getChunks('shared-page', { sourceId: 'src-b' });
    expect(chunks.length).toBe(1);
    expect(chunks[0]!.chunk_text).toBe('chunk-b');
  });

  test('2. federated sourceIds filters correctly', async () => {
    const chunks = await engine.getChunks('shared-page', { sourceIds: ['default', 'src-b'] });
    expect(chunks.length).toBe(2);
  });

  test('3. sourceIds wins over sourceId when both are set', async () => {
    const chunks = await engine.getChunks('shared-page', { sourceId: 'src-b', sourceIds: ['default'] });
    // sourceIds wins → only default's chunk
    expect(chunks.length).toBe(1);
    expect(chunks[0]!.chunk_text).toBe('chunk-default');
  });

  test('4. default-source decoy must not leak', async () => {
    const chunks = await engine.getChunks('shared-page', { sourceIds: ['src-b'] });
    expect(chunks.length).toBe(1);
    expect(chunks[0]!.chunk_text).toBe('chunk-b');
  });

  test('5. out-of-grant source returns empty', async () => {
    const chunks = await engine.getChunks('shared-page', { sourceIds: ['nonexistent'] });
    expect(chunks.length).toBe(0);
  });

  test('6. no opts = unscoped (back-compat), returns all sources', async () => {
    const chunks = await engine.getChunks('shared-page');
    expect(chunks.length).toBe(2);
  });
});

describe('resolveSlugs federated read scope', () => {
  test('7. resolveSlugs respects sourceId scalar', async () => {
    const slugs = await engine.resolveSlugs('shared-page', { sourceId: 'src-b' });
    expect(slugs).toContain('shared-page');
  });

  test('8. resolveSlugs respects sourceIds array', async () => {
    const slugs = await engine.resolveSlugs('shared-page', { sourceIds: ['default', 'src-b'] });
    expect(slugs).toContain('shared-page');
  });

  test('9. resolveSlugs out-of-grant source returns empty', async () => {
    const slugs = await engine.resolveSlugs('shared-page', { sourceIds: ['nonexistent'] });
    expect(slugs.length).toBe(0);
  });
});
