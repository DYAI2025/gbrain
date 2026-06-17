# Voice + Memory Stack Integration Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Wire the standalone voice, graph, and freshness modules into gbrain's real config system, CLI, MCP ops, and database — making them runnable inside a real gbrain instance.

**Architecture:** Three-layer integration: (1) config plane — `GBrainConfig` gets a `voice?` section + env var support + known config keys; (2) operation plane — 6 new operations in the `operations[]` array auto-expose via CLI + MCP; (3) data plane — `PostgresGraphAdapter` bridges our `GraphRepository` interface to gbrain's real `BrainEngine` methods. All layers are testable independently and follow existing gbrain patterns (cf. `sync`, `embed`, `eval`).

**Tech Stack:** TypeScript, Bun, gbrain BrainEngine, Postgres (via engine.traverseGraph / putPage), MCP protocol

---

### Task 1: Config — Add `voice` section to GBrainConfig

**Files:**
- Modify: `src/core/config.ts:35-345`
- No test (config is tested via integration)
- No new files

**Context for the engineer:** The `GBrainConfig` interface at line 35 is the single source of truth for all config. New subsystems follow the pattern of `eval?: {...}`, `autopilot?: {...}`, `content_sanity?: {...}`. Add a `voice?` block with `stt_provider`, `tts_provider`, `deepgram_api_key`, `supertonic_base_url`, `page_title_prefix`.

**Step 1: Add voice config section to GBrainConfig**

Insert after the `eval` block (~line 128) — before the `self_upgrade` comment block at line 130:

```typescript
  /**
   * Voice module config (STT/TTS providers + keys).
   * stt_provider: 'mock' | 'deepgram' (default: 'mock')
   * tts_provider: 'mock' | 'supertonic' (default: 'mock')
   * deepgram_api_key: for Deepgram STT
   * supertonic_base_url: for Supertonic TTS API endpoint
   * page_title_prefix: prefix for auto-generated voice session pages
   */
  voice?: {
    stt_provider?: string;
    tts_provider?: string;
    deepgram_api_key?: string;
    supertonic_base_url?: string;
    page_title_prefix?: string;
  };
```

**Step 2: Add env var merging**

In `loadConfig()` at line 520-558, add after the `GBRAIN_REMOTE_CLIENT_SECRET` block (~line 558):

```typescript
    // Voice env overrides
    ...(process.env.DEEPGRAM_API_KEY || process.env.SUPERTONIC_BASE_URL || process.env.GBRAIN_VOICE_STT_PROVIDER || process.env.GBRAIN_VOICE_TTS_PROVIDER
      ? {
          voice: {
            ...((fileConfig as GBrainConfig | null)?.voice ?? {}),
            ...(process.env.DEEPGRAM_API_KEY ? { deepgram_api_key: process.env.DEEPGRAM_API_KEY } : {}),
            ...(process.env.SUPERTONIC_BASE_URL ? { supertonic_base_url: process.env.SUPERTONIC_BASE_URL } : {}),
            ...(process.env.GBRAIN_VOICE_STT_PROVIDER ? { stt_provider: process.env.GBRAIN_VOICE_STT_PROVIDER } : {}),
            ...(process.env.GBRAIN_VOICE_TTS_PROVIDER ? { tts_provider: process.env.GBRAIN_VOICE_TTS_PROVIDER } : {}),
          },
        }
      : {}),
```

**Step 3: Add known config keys**

In `KNOWN_CONFIG_KEYS` array at ~line 811-923, add before the final `];`:

```typescript
  // Voice module (STT/TTS)
  'voice',
  'voice.stt_provider',
  'voice.tts_provider',
  'voice.deepgram_api_key',
  'voice.supertonic_base_url',
  'voice.page_title_prefix',
```

Also add `'voice.'` to `KNOWN_CONFIG_KEY_PREFIXES` at ~line 930-941:

```typescript
  'voice.',            // voice.stt_provider, voice.tts_provider, ...
```

**Step 4: Verify the build**

Run: `bun run typecheck` (or `npx tsc --noEmit`)
Expected: No type errors

**Step 5: Commit**

```bash
git add src/core/config.ts
git commit -m "feat(config): add voice section to GBrainConfig with env var merging"
```

---

### Task 2: Freshness barrel export

**Files:**
- Create: `src/core/freshness/index.ts`

**Context:** The freshness module has no barrel export, so other modules can't import from it cleanly. Follow the pattern from `src/core/voice/index.ts` and `src/core/graph/index.ts`.

**Step 1: Create barrel export**

```typescript
export type { DecayClass, FreshnessMeta, FreshnessStatus, ReconciliationReport, ReconcileIssue } from './types.ts';
export { computeFreshness, getDecayClassForType, getDefaultStaleDays, getSourcePrecision } from './freshness.ts';
export { generateDigest, digestToMarkdown } from './digest.ts';
export { runReconcileCheck } from './reconcile.ts';
```

**Step 2: Verify it resolves**

Run: `bun test src/core/freshness/ --timeout 10000`
Expected: ~33 tests pass (same as before)

**Step 3: Commit**

```bash
git add src/core/freshness/index.ts
git commit -m "feat(freshness): add barrel export index.ts"
```

---

### Task 3: PostgresGraphAdapter — Bridge GraphRepository to real DB

**Files:**
- Create: `src/core/graph/pg-adapter.ts`
- Create: `src/core/graph/pg-adapter.test.ts`
- Reference: `src/core/graph/types.ts` (GraphRepository interface)
- Reference: `src/core/domain.ts` (MemoryNode, Relation types)

**Context for the engineer:** The existing `InMemoryGraphAdapter` is test-only. We need a real adapter that uses gbrain's `BrainEngine` to read/write pages, links, and tags from the actual database. The `BrainEngine` already has `putPage()`, `getPage()`, `getRelatedEntities()`, `traverseGraph()` methods — we wrap those.

Read the engine interface first to see available methods:
- `src/core/engine.ts` — find `getRelatedEntities`, `traverseGraph`, `putPage`, `getPage` signatures

**Step 1: Read engine interface**

Run: `grep -n "getRelatedEntities\|traverseGraph\|putPage\|getPage" src/core/engine.ts | head -20`

This shows the engine methods we bridge to.

**Step 2: Write the failing test**

Create `src/core/graph/pg-adapter.test.ts`:

```typescript
import { describe, it, expect, mock } from 'bun:test';
import type { BrainEngine } from '../engine.ts';
import { PostgresGraphAdapter } from './pg-adapter.ts';
import type { MemoryNode, Relation } from '../domain.ts';

function createMockEngine(): BrainEngine {
  const pages = new Map<string, any>();
  const links: Array<{ from: string; to: string; type: string }> = [];

  return {
    getPage: mock(async (slug: string) => pages.get(slug) ?? null),
    putPage: mock(async (slug: string, page: any) => { pages.set(slug, page); }),
    getRelatedEntities: mock(async (slug: string) => {
      const outgoing = links.filter(l => l.from === slug).map(l => ({ slug: l.to, relation_type: l.type, direction: 'outgoing' as const }));
      const incoming = links.filter(l => l.to === slug).map(l => ({ slug: l.from, relation_type: l.type, direction: 'incoming' as const }));
      return [...outgoing, ...incoming];
    }),
    traverseGraph: mock(async (slug: string, depth?: number) => {
      const root = pages.get(slug);
      if (!root) return { root: null, nodes: [], edges: [] };
      return {
        root: { slug: root.slug, title: root.title, type: root.type },
        nodes: [],
        edges: [],
      };
    }),
    deletePage: mock(async (slug: string) => { pages.delete(slug); }),
  } as unknown as BrainEngine;
}

describe('PostgresGraphAdapter', () => {
  it('creates an entity as a page', async () => {
    const engine = createMockEngine();
    const adapter = new PostgresGraphAdapter(engine);
    const node: MemoryNode = {
      id: 'test-1', slug: 'test-1', type: 'concept', title: 'Test',
      summary: 'A test node', source: 'test', confidence: 0.8, consent: true,
      tags: [], created_at: new Date().toISOString(), last_verified_at: new Date().toISOString(),
    };
    await adapter.createEntity(node);
    expect(engine.putPage).toHaveBeenCalled();
  });

  it('returns related entities via engine', async () => {
    const engine = createMockEngine();
    const adapter = new PostgresGraphAdapter(engine);
    // Set up test data through engine directly
    await adapter.createEntity({ id: 'a', slug: 'a', type: 'concept', title: 'A', summary: '', source: 'test', confidence: 0.8, consent: true, tags: [], created_at: '2024-01-01', last_verified_at: '2024-01-01' });
    await adapter.createEntity({ id: 'b', slug: 'b', type: 'concept', title: 'B', summary: '', source: 'test', confidence: 0.8, consent: true, tags: [], created_at: '2024-01-01', last_verified_at: '2024-01-01' });
    await adapter.createRelation({ from: 'a', to: 'b', relation_type: 'related_to', metadata: {}, source: 'test', confidence: 0.8, consent: true, created_at: '2024-01-01' });

    const related = await adapter.getRelatedEntities('a');
    expect(related.length).toBeGreaterThan(0);
    expect(related.some(r => r.slug === 'b')).toBe(true);
  });

  it('traverses the graph', async () => {
    const engine = createMockEngine();
    const adapter = new PostgresGraphAdapter(engine);
    await adapter.createEntity({ id: 'root', slug: 'root', type: 'concept', title: 'Root', summary: '', source: 'test', confidence: 0.8, consent: true, tags: [], created_at: '2024-01-01', last_verified_at: '2024-01-01' });
    const result = await adapter.traverseGraph('root', 1);
    expect(result.root.slug).toBe('root');
  });
});
```

**Step 3: Run the test to verify it fails**

Run: `bun test src/core/graph/pg-adapter.test.ts --timeout 10000`
Expected: FAIL with "Cannot find module './pg-adapter.ts'" or similar

**Step 4: Write minimal implementation**

```typescript
import type { BrainEngine } from '../engine.ts';
import type { GraphRepository, GraphTraversalResult } from './types.ts';
import type { MemoryNode, Relation } from '../domain.ts';
import { VALID_MEMORY_TYPES } from '../domain.ts';

export class PostgresGraphAdapter implements GraphRepository {
  constructor(private engine: BrainEngine) {}

  async createEntity(node: MemoryNode): Promise<void> {
    await this.engine.putPage(node.slug, {
      title: node.title,
      type: VALID_MEMORY_TYPES.has(node.type) ? node.type : 'concept',
      content: node.summary,
      tags: node.tags,
      metadata: {
        source: node.source,
        confidence: node.confidence,
        consent: node.consent,
        memoryId: node.id,
        created_at: node.created_at,
        last_verified_at: node.last_verified_at,
        ...node.metadata,
      },
    });
  }

  async createRelation(relation: Relation): Promise<void> {
    // gbrain stores links as page metadata; we add a link via the engine's page content.
    // The actual link-creation API depends on engine.addLink or putPage with link metadata.
    // Fallback: call engine.putPage or engine method for link creation.
    // For MVP, we store relation info in the source page's metadata.
    const source = await this.engine.getPage(relation.from);
    if (!source) throw new Error(`Source page ${relation.from} not found`);

    const existingLinks = (source as any)?.links ?? [];
    await this.engine.putPage(relation.from, {
      ...source,
      links: [...existingLinks, { target: relation.to, type: relation.relation_type, metadata: relation.metadata }],
    });
  }

  async getRelatedEntities(slug: string): Promise<Array<{ slug: string; relation_type: string; direction: 'outgoing' | 'incoming' }>> {
    return this.engine.getRelatedEntities(slug);
  }

  async traverseGraph(slug: string, depth: number = 1): Promise<GraphTraversalResult> {
    const page = await this.engine.getPage(slug);
    if (!page) {
      return { root: { slug: '', title: '', type: '' }, nodes: [], edges: [] };
    }

    const traversalResult = await this.engine.traverseGraph(slug, depth);

    return {
      root: { slug, title: (page as any)?.title ?? slug, type: (page as any)?.type ?? 'unknown' },
      nodes: (traversalResult as any)?.nodes ?? [],
      edges: (traversalResult as any)?.edges ?? [],
    };
  }

  async deleteEntity(slug: string): Promise<void> {
    await this.engine.deletePage(slug);
  }

  async deleteRelation(from: string, to: string, relation_type: string): Promise<void> {
    // gbrain doesn't have a direct deleteRelation — for MVP we skip.
    // In production, this would call engine.removeLink or similar.
    throw new Error('deleteRelation not implemented for PostgresGraphAdapter');
  }
}
```

**Step 5: Run the test to verify it passes**

Run: `bun test src/core/graph/pg-adapter.test.ts --timeout 10000`
Expected: PASS (all 3 tests)

**Step 6: Commit**

```bash
git add src/core/graph/pg-adapter.ts src/core/graph/pg-adapter.test.ts
git commit -m "feat(graph): add PostgresGraphAdapter bridging GraphRepository to BrainEngine"
```

---

### Task 4: Define Voice + Freshness Operations

**Files:**
- Modify: `src/core/operations.ts` (before line 4900, add 6 operation definitions + register in array)
- No test (operations are implicitly tested via CLI/MCP dispatch)

**Context:** Each operation needs: a `const` definition (name, description, params, handler, scope, cliHints), then add it to the `operations[]` array at line 4902. Follow the exact pattern of the existing ops.

**Step 1: Read an existing operation for pattern reference**

See line 600 (`get_page`) and line 4936 (`submit_job`) for exact patterns. Key things:
- `description` is a string constant (often defined separately, but inline is fine for new ops)
- `params` use `{ type: 'string', required?: boolean, description: string }`
- `scope` is `'read' | 'write' | 'admin'`
- `handler` receives `(ctx: OperationContext, params: Record<string, unknown>)`
- `cliHints` has `{ name: string, positional?: string[] }` for CLI dispatch

**Step 2: Add operation definitions**

Add after the last operation definition before the `operations[]` array (around line 4900):

```typescript
// --- Voice operations ---

const voice_transcribe: Operation = {
  name: 'voice_transcribe',
  description: 'Transcribe audio to text using the configured STT provider. Accepts base64-encoded audio bytes. Returns transcript with confidence.',
  scope: 'write',
  params: {
    audio_base64: { type: 'string', required: true, description: 'Base64-encoded audio data' },
    mime_type: { type: 'string', description: 'MIME type of audio (e.g. audio/webm, audio/wav). Default: audio/webm' },
  },
  handler: async (ctx, p) => {
    const { transcribe } = await import('./voice/stt.ts');
    const { loadConfig } = await import('./config.ts');
    const config = ctx.config ?? loadConfig();
    // For MVP: decode base64 → ArrayBuffer → MockSTTAdapter
    const { MockSTTAdapter } = await import('./voice/stt.ts');
    const stt = new MockSTTAdapter();
    const audio = { buffer: Buffer.from(p.audio_base64 as string, 'base64'), mimeType: (p.mime_type as string) ?? 'audio/webm' };
    const result = await stt.transcribe(audio);
    return result;
  },
  cliHints: { name: 'voice', positional: ['transcribe'] },
};

const voice_synthesize: Operation = {
  name: 'voice_synthesize',
  description: 'Synthesize text to speech using the configured TTS provider. Returns base64-encoded audio.',
  scope: 'write',
  params: {
    text: { type: 'string', required: true, description: 'Text to synthesize' },
  },
  handler: async (ctx, p) => {
    const { MockTTSAdapter } = await import('./voice/tts.ts');
    const tts = new MockTTSAdapter();
    const audio = await tts.synthesize(p.text as string);
    return { audio_base64: Buffer.from(audio).toString('base64'), format: 'audio/wav' };
  },
  cliHints: { name: 'voice', positional: ['synthesize'] },
};

const voice_process: Operation = {
  name: 'voice_process',
  description: 'Full voice session: transcribe audio, summarize, synthesize response, persist as voice_session page. Returns session result with transcript, summary, and audio.',
  scope: 'write',
  params: {
    audio_base64: { type: 'string', required: true, description: 'Base64-encoded audio data' },
    title: { type: 'string', description: 'Optional title for the voice session page' },
    tags: { type: 'string', description: 'Comma-separated tags' },
  },
  handler: async (ctx, p) => {
    const { VoiceSessionService } = await import('./voice/session-service.ts');
    const { MockSTTAdapter } = await import('./voice/stt.ts');
    const { MockTTSAdapter } = await import('./voice/tts.ts');
    const { loadConfig } = await import('./config.ts');
    const config = ctx.config ?? loadConfig();
    const voiceConfig = (config as any)?.voice ?? {};

    // MVP uses Mock adapters. Production: switch on voiceConfig.stt_provider
    const stt = new MockSTTAdapter();
    const tts = new MockTTSAdapter();

    // onSave callback persists as a page
    const onSave = async (session: { slug: string; content: string }) => {
      const engine = ctx.engine;
      if (!engine) throw new Error('Engine required for voice_process');
      await engine.putPage(session.slug, {
        title: session.slug,
        type: 'voice_session',
        content: session.content,
        tags: ['voice'],
      });
    };

    if (!ctx.engine) throw new Error('Engine required for voice_process');

    const service = new VoiceSessionService({ stt, tts, onSave });
    const audio = { buffer: Buffer.from(p.audio_base64 as string, 'base64'), mimeType: 'audio/webm' };
    const result = await service.processAudio(audio, {
      title: (p.title as string) ?? undefined,
      tags: (p.tags as string)?.split(',').map(s => s.trim()).filter(Boolean) ?? [],
    });
    return result;
  },
  cliHints: { name: 'voice', positional: ['process'] },
  mutating: true,
};

// --- Freshness operations ---

const freshness_digest: Operation = {
  name: 'freshness_digest',
  description: 'Generate a freshness digest for the brain: scan pages, compute staleness by type, return markdown summary.',
  scope: 'read',
  params: {
    limit: { type: 'number', description: 'Max pages to scan (default: 100)' },
    format: { type: 'string', description: 'Output format: "json" or "markdown" (default: "json")' },
  },
  handler: async (ctx, p) => {
    const { generateDigest, digestToMarkdown } = await import('./freshness/index.ts');
    // For MVP: scan recent pages from engine
    const engine = ctx.engine;
    if (!engine) throw new Error('Engine required for freshness_digest');
    const listResult = await engine.listPages({ limit: (p.limit as number) ?? 100 });
    const pages = (listResult as any)?.pages ?? listResult ?? [];
    const pageMetas = pages.map((page: any) => ({
      slug: page.slug,
      type: (page as any)?.type ?? 'unknown',
      title: (page as any)?.title ?? page.slug,
      source: (page as any)?.metadata?.source ?? 'unknown',
      last_verified_at: (page as any)?.updated_at ?? (page as any)?.created_at ?? new Date().toISOString(),
    }));

    const digest = generateDigest(pageMetas);
    if ((p.format as string) === 'markdown') {
      return { digest: digestToMarkdown(digest) };
    }
    return digest;
  },
  cliHints: { name: 'freshness', positional: ['digest'] },
};

const freshness_reconcile: Operation = {
  name: 'freshness_reconcile',
  description: 'Run a reconciliation check: find orphaned pages, dangling links, duplicates. Returns a report with issues grouped by category.',
  scope: 'read',
  params: {
    limit: { type: 'number', description: 'Max pages to scan (default: 100)' },
  },
  handler: async (ctx, p) => {
    const { runReconcileCheck } = await import('./freshness/index.ts');
    const engine = ctx.engine;
    if (!engine) throw new Error('Engine required for freshness_reconcile');
    const listResult = await engine.listPages({ limit: (p.limit as number) ?? 100 });
    const pages = (listResult as any)?.pages ?? listResult ?? [];
    const pageMetas = pages.map((page: any) => ({
      slug: page.slug,
      type: (page as any)?.type ?? 'unknown',
      title: (page as any)?.title ?? page.slug,
      source: (page as any)?.metadata?.source ?? 'unknown',
      last_verified_at: (page as any)?.updated_at ?? (page as any)?.created_at ?? new Date().toISOString(),
    }));

    const report = runReconcileCheck(pageMetas);
    return report;
  },
  cliHints: { name: 'freshness', positional: ['reconcile'] },
};

// --- Graph operation ---

const graph_traverse: Operation = {
  name: 'graph_traverse',
  description: 'Traverse the memory graph from a seed slug, returning related nodes and edges at specified depth.',
  scope: 'read',
  params: {
    slug: { type: 'string', required: true, description: 'Seed page slug' },
    depth: { type: 'number', description: 'Traversal depth (default: 1, max: 5)' },
  },
  handler: async (ctx, p) => {
    const { PostgresGraphAdapter } = await import('./graph/pg-adapter.ts');
    const engine = ctx.engine;
    if (!engine) throw new Error('Engine required for graph_traverse');
    const adapter = new PostgresGraphAdapter(engine);
    const result = await adapter.traverseGraph(p.slug as string, (p.depth as number) ?? 1);
    return result;
  },
  cliHints: { name: 'graph', positional: ['traverse'] },
};
```

**Step 3: Register in operations array**

Add to the `operations[]` array (at line 4982, before the closing `];`):

```typescript
  // Voice operations
  voice_transcribe, voice_synthesize, voice_process,
  // Freshness operations
  freshness_digest, freshness_reconcile,
  // Graph operations
  graph_traverse,
```

**Step 4: Add to CLI_ONLY and dispatch in cli.ts**

Also add `'voice'`, `'freshness'`, and `'graph'` to the `CLI_ONLY` set at line 47:

```typescript
'voice', 'freshness', 'graph',
```

And add the CLI dispatch cases around line 1629 (after `jobs`):

```typescript
      case 'voice': {
        const { runVoice } = await import('./commands/voice.ts');
        await runVoice(engine, args);
        break;
      }
      case 'freshness': {
        const { runFreshness } = await import('./commands/freshness.ts');
        await runFreshness(engine, args);
        break;
      }
```

**Step 5: Verify build**

Run: `bun run typecheck`
Expected: No type errors

**Step 6: Commit**

```bash
git add src/core/operations.ts src/cli.ts
git commit -m "feat(ops): add voice, freshness, graph operations with CLI dispatch"
```

---

### Task 5: CLI Command Handlers

**Files:**
- Create: `src/commands/voice.ts`
- Create: `src/commands/freshness.ts`
- Reference: `src/commands/sync.ts` (pattern)

**Context:** CLI command handlers follow a pattern: export a function like `runVoice(engine: BrainEngine, args: string[])` that parses subcommands/flags, calls operations or engine methods directly, and prints results. They live in `src/commands/`.

Read `src/commands/sync.ts` for the exact pattern.

**Step 1: Read sync command handler pattern**

Run: `head -80 src/commands/sync.ts`

**Step 2: Write voice command handler**

Create `src/commands/voice.ts`:

```typescript
import type { BrainEngine } from '../core/engine.ts';
import { MockSTTAdapter } from '../core/voice/stt.ts';
import { MockTTSAdapter } from '../core/voice/tts.ts';
import { VoiceSessionService } from '../core/voice/session-service.ts';
import { consolidateVoiceSession } from '../core/voice/consolidation.ts';

const HELP = `Usage: gbrain voice <subcommand> [options]

Subcommands:
  transcribe <file>    Transcribe audio file to text
  synthesize <text>    Synthesize text to speech
  process <file>       Full session: transcribe → summarize → respond → persist
  consolidate          Consolidate pending voice sessions into memory
  help                 Show this help
`;

export async function runVoice(engine: BrainEngine, args: string[]): Promise<void> {
  const subcommand = args[0] ?? 'help';

  switch (subcommand) {
    case 'transcribe': {
      const filePath = args[1];
      if (!filePath) { console.error('Usage: gbrain voice transcribe <file>'); process.exit(1); }
      const { readFileSync } = await import('fs');
      const audioBuffer = readFileSync(filePath);
      const stt = new MockSTTAdapter();
      const result = await stt.transcribe({ buffer: audioBuffer, mimeType: 'audio/webm' });
      console.log(JSON.stringify(result, null, 2));
      break;
    }
    case 'synthesize': {
      const text = args.slice(1).join(' ');
      if (!text) { console.error('Usage: gbrain voice synthesize <text>'); process.exit(1); }
      const tts = new MockTTSAdapter();
      const audio = await tts.synthesize(text);
      // Write to stdout as base64
      process.stdout.write(Buffer.from(audio));
      break;
    }
    case 'process': {
      const filePath = args[1];
      if (!filePath) { console.error('Usage: gbrain voice process <file>'); process.exit(1); }
      const { readFileSync } = await import('fs');
      const audioBuffer = readFileSync(filePath);

      const onSave = async (session: { slug: string; content: string }) => {
        await engine.putPage(session.slug, {
          title: session.slug,
          type: 'voice_session',
          content: session.content,
          tags: ['voice'],
        });
      };

      const service = new VoiceSessionService({
        stt: new MockSTTAdapter(),
        tts: new MockTTSAdapter(),
        onSave,
      });
      const result = await service.processAudio(
        { buffer: audioBuffer, mimeType: 'audio/webm' },
        { title: filePath },
      );
      console.log(JSON.stringify({ sessionId: result.sessionId, transcript: result.transcript, summary: result.summary }, null, 2));
      break;
    }
    case 'consolidate': {
      // Scan for voice_session pages and consolidate them
      const listResult = await engine.listPages({ limit: 50 });
      const pages = ((listResult as any)?.pages ?? listResult ?? []) as any[];
      const voicePages = pages.filter((p: any) => (p.type ?? p.page_type) === 'voice_session');

      let consolidated = 0;
      for (const page of voicePages) {
        const pageContent = await engine.getPage(page.slug);
        if (pageContent) {
          // Extract transcript from content — simple heuristic
          const content = (pageContent as any)?.content ?? '';
          const transcriptMatch = content.match(/## Transcript\n\n([\s\S]*?)\n\n##/);
          const tagsMatch = content.match(/tags:\s*\[([^\]]*)\]/);
          const transcript = transcriptMatch ? transcriptMatch[1].trim() : '';
          const tags = tagsMatch
            ? tagsMatch[1].split(',').map(t => t.trim().replace(/"/g, ''))
            : ['voice'];

          const memoryPage = consolidateVoiceSession({
            slug: page.slug,
            transcript,
            tags,
            summary: transcript.slice(0, 200),
          });
          // Save the consolidated memory page
          await engine.putPage(memoryPage.slug, {
            title: memoryPage.title,
            type: memoryPage.type,
            content: memoryPage.content,
            tags: memoryPage.tags,
          });
          consolidated++;
        }
      }
      console.log(`Consolidated ${consolidated} voice sessions into memory pages.`);
      break;
    }
    default:
      console.log(HELP);
  }
}
```

**Step 3: Write freshness command handler**

Create `src/commands/freshness.ts`:

```typescript
import type { BrainEngine } from '../core/engine.ts';
import { generateDigest, digestToMarkdown } from '../core/freshness/index.ts';
import { runReconcileCheck } from '../core/freshness/index.ts';

const HELP = `Usage: gbrain freshness <subcommand> [options]

Subcommands:
  digest [--limit N]    Generate freshness digest (JSON)
  digest-markdown       Generate freshness digest (markdown)
  reconcile [--limit N] Run reconciliation check
  help                  Show this help
`;

export async function runFreshness(engine: BrainEngine, args: string[]): Promise<void> {
  const subcommand = args[0] ?? 'help';

  switch (subcommand) {
    case 'digest': {
      const limitIdx = args.indexOf('--limit');
      const limit = limitIdx >= 0 ? parseInt(args[limitIdx + 1], 10) : 100;
      const listResult = await engine.listPages({ limit });
      const pages = ((listResult as any)?.pages ?? listResult ?? []) as any[];
      const pageMetas = pages.map((page: any) => ({
        slug: page.slug,
        type: page.type ?? 'unknown',
        title: page.title ?? page.slug,
        source: page.metadata?.source ?? 'unknown',
        last_verified_at: page.updated_at ?? page.created_at ?? new Date().toISOString(),
      }));
      const digest = generateDigest(pageMetas);
      console.log(JSON.stringify(digest, null, 2));
      break;
    }
    case 'digest-markdown': {
      const limitIdx = args.indexOf('--limit');
      const limit = limitIdx >= 0 ? parseInt(args[limitIdx + 1], 10) : 100;
      const listResult = await engine.listPages({ limit });
      const pages = ((listResult as any)?.pages ?? listResult ?? []) as any[];
      const pageMetas = pages.map((page: any) => ({
        slug: page.slug,
        type: page.type ?? 'unknown',
        title: page.title ?? page.slug,
        source: page.metadata?.source ?? 'unknown',
        last_verified_at: page.updated_at ?? page.created_at ?? new Date().toISOString(),
      }));
      const digest = generateDigest(pageMetas);
      console.log(digestToMarkdown(digest));
      break;
    }
    case 'reconcile': {
      const limitIdx = args.indexOf('--limit');
      const limit = limitIdx >= 0 ? parseInt(args[limitIdx + 1], 10) : 100;
      const listResult = await engine.listPages({ limit });
      const pages = ((listResult as any)?.pages ?? listResult ?? []) as any[];
      const pageMetas = pages.map((page: any) => ({
        slug: page.slug,
        type: page.type ?? 'unknown',
        title: page.title ?? page.slug,
        source: page.metadata?.source ?? 'unknown',
        last_verified_at: page.updated_at ?? page.created_at ?? new Date().toISOString(),
      }));
      const report = runReconcileCheck(pageMetas);
      console.log(JSON.stringify(report, null, 2));
      break;
    }
    default:
      console.log(HELP);
  }
}
```

**Step 4: Verify build**

Run: `bun run typecheck`
Expected: No type errors

**Step 5: Commit**

```bash
git add src/commands/voice.ts src/commands/freshness.ts
git commit -m "feat(cli): add voice and freshness CLI command handlers"
```

---

### Task 6: Verify — Run unit tests for all touched modules

**Step 1: Run full unit suite for our modules**

```bash
bun test src/core/graph/ src/core/voice/ src/core/freshness/ --timeout 30000
```

Expected: ALL tests pass (no failures)

**Step 2: Run typecheck**

```bash
bun run typecheck
```

Expected: No type errors

**Step 3: Commit any remaining fixes**

```bash
git add -A
git commit -m "chore: finalize integration — fix type errors and test alignment"
```

---

### Task 7: Push to remote

```bash
git push origin feature/gbrain-memory-voice-stack
```

Expected: Push succeeds, all 6+ commits on remote.

---

### Summary of files created/modified

| File | Action |
|------|--------|
| `src/core/config.ts` | MODIFY — add voice config section, env vars, known keys |
| `src/core/freshness/index.ts` | CREATE — barrel export |
| `src/core/graph/pg-adapter.ts` | CREATE — PostgresGraphAdapter |
| `src/core/graph/pg-adapter.test.ts` | CREATE — test for PostgresGraphAdapter |
| `src/core/operations.ts` | MODIFY — 6 new operation definitions + register in array |
| `src/cli.ts` | MODIFY — add CLI_ONLY entries + switch cases |
| `src/commands/voice.ts` | CREATE — voice CLI handler |
| `src/commands/freshness.ts` | CREATE — freshness CLI handler |
