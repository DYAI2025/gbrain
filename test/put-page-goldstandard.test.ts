/**
 * T-101 (REQ-002) — source-scoped Goldstandard write gate.
 *
 * A source flagged `goldstandard: true` enforces required frontmatter
 * (slug/title/type; relations optional-but-shape-checked) on writes INTO it:
 * invalid metadata throws and NO page is persisted (AC-006). Non-goldstandard
 * sources are unaffected (the tolerant unknown-type flow stays intact).
 */
import { describe, test, expect, beforeAll, beforeEach, afterAll } from 'bun:test';
import { PGLiteEngine } from '../src/core/pglite-engine.ts';
import { operations } from '../src/core/operations.ts';
import type { OperationContext } from '../src/core/operations.ts';
import { configureGateway, resetGateway, __setEmbedTransportForTests } from '../src/core/ai/gateway.ts';

const putPageOp = operations.find((o) => o.name === 'put_page')!;
let engine: PGLiteEngine;

beforeAll(async () => {
  configureGateway({
    embedding_model: 'openai:text-embedding-3-large',
    embedding_dimensions: 1536,
    env: { ...process.env, OPENAI_API_KEY: process.env.OPENAI_API_KEY || 'sk-test-stub' },
  });
  __setEmbedTransportForTests(async ({ values }: any) => ({
    embeddings: values.map(() => new Array(1536).fill(0)),
    usage: { tokens: 0 },
  }) as any);
  engine = new PGLiteEngine();
  await engine.connect({});
  await engine.initSchema();
});

afterAll(async () => {
  await engine.disconnect();
  __setEmbedTransportForTests(null);
  resetGateway();
});

beforeEach(async () => {
  await engine.executeRaw('DELETE FROM pages', []);
  // A goldstandard-flagged source and a plain one. SQL literal for config
  // avoids the JSON.stringify-into-::jsonb double-encode trap.
  await engine.executeRaw(
    `INSERT INTO sources (id, name, config) VALUES ('gs-src', 'gs-src', '{"goldstandard":true}')
       ON CONFLICT (id) DO UPDATE SET config = EXCLUDED.config`,
    [],
  );
  await engine.executeRaw(
    `INSERT INTO sources (id, name, config) VALUES ('plain-src', 'plain-src', '{}')
       ON CONFLICT (id) DO UPDATE SET config = EXCLUDED.config`,
    [],
  );
});

function makeCtx(opts: Partial<OperationContext> = {}): OperationContext {
  return {
    engine,
    config: { engine: 'pglite' as const },
    logger: { info: () => {}, warn: () => {}, error: () => {} },
    dryRun: false,
    remote: false,
    sourceId: 'default',
    ...opts,
  };
}

const VALID = `---\nslug: gs/ok\ntitle: OK\ntype: note\n---\n\nbody`;
const INVALID = `---\nslug: gs/probe\ntitle: Probe\n---\n\nbody`; // missing type

async function pageCount(slug: string, sourceId: string): Promise<number> {
  const rows = await engine.executeRaw(
    `SELECT COUNT(*)::int AS n FROM pages WHERE slug = $1 AND source_id = $2`,
    [slug, sourceId],
  );
  return (rows?.[0]?.n as number) ?? 0;
}

describe('T-101 goldstandard write gate', () => {
  test('valid page writes into a goldstandard source', async () => {
    const ctx = makeCtx({ sourceId: 'gs-src' });
    await putPageOp.handler(ctx, { slug: 'gs/ok', content: VALID });
    expect(await pageCount('gs/ok', 'gs-src')).toBe(1);
  });

  test('invalid metadata BLOCKS the write into a goldstandard source (AC-006)', async () => {
    const ctx = makeCtx({ sourceId: 'gs-src' });
    let threw = false;
    try {
      await putPageOp.handler(ctx, { slug: 'gs/probe', content: INVALID });
    } catch (e) {
      threw = true;
      expect(String((e as Error).message)).toContain('Goldstandard');
    }
    expect(threw).toBe(true);
    expect(await pageCount('gs/probe', 'gs-src')).toBe(0); // nothing persisted
  });

  test('dry-run of invalid metadata surfaces the error (does not silently preview-ok)', async () => {
    const ctx = makeCtx({ sourceId: 'gs-src', dryRun: true });
    let threw = false;
    try {
      await putPageOp.handler(ctx, { slug: 'gs/probe', content: INVALID });
    } catch {
      threw = true;
    }
    expect(threw).toBe(true);
    expect(await pageCount('gs/probe', 'gs-src')).toBe(0);
  });

  test('non-goldstandard source is unaffected: missing type still writes (tolerant flow)', async () => {
    const ctx = makeCtx({ sourceId: 'plain-src' });
    await putPageOp.handler(ctx, { slug: 'gs/probe', content: INVALID });
    expect(await pageCount('gs/probe', 'plain-src')).toBe(1);
  });
});
