import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import type { BrainEngine } from '../core/engine.ts';
import { operations, OperationError } from '../core/operations.ts';
import { VERSION } from '../version.ts';
import { buildToolDefs } from './tool-defs.ts';
import { dispatchToolCall, validateParams, buildOperationContext } from './dispatch.ts';
import { getBrainHotMemoryMeta } from '../core/facts/meta-hook.ts';
import { loadConfig } from '../core/config.ts';
import { executeRawJsonb } from '../core/sql-query.ts';
import { serializeError } from '../core/errors.ts';
import {
  resolveSocketPath,
  startResolveIpcServer,
  cleanupStaleSocket,
} from '../core/context/resolve-ipc.ts';
import { resolveEntitiesToPointers, logDeliveredReflexPointers } from '../core/context/retrieval-reflex.ts';

export async function startMcpServer(engine: BrainEngine) {
  const server = new Server(
    { name: 'gbrain', version: VERSION },
    { capabilities: { tools: {} } },
  );

  // Generate tool definitions from operations. Extracted to buildToolDefs so
  // the subagent tool registry (v0.15+) can call the same mapper against a
  // filtered OPERATIONS subset instead of duplicating this shape.
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: buildToolDefs(operations),
  }));

  // Dispatch tool calls via shared dispatch.ts (parity with HTTP transport).
  // MCP stdio callers are remote/untrusted; dispatch defaults remote=true.
  // The MCP SDK's response type widened in 1.29 to allow a managed-task wrapper;
  // gbrain ops are synchronous, so we return the legacy `{ content, isError? }`
  // shape and cast through `any` (the SDK accepts it via the ServerResult union).
  server.setRequestHandler(CallToolRequestSchema, async (request: any): Promise<any> => {
    const startTime = Date.now();
    const { name, arguments: params } = request.params;
    const op = operations.find(o => o.name === name);
    let agentName = 'stdio';
    let tokenName = 'stdio';
    let agentIdParam: string | undefined = undefined;

    // Extract agent_id from params if present
    if (params && typeof params === 'object' && 'agent_id' in params) {
      agentIdParam = String(params.agent_id);
      // Use agent_id as agent_name for logging
      if (agentIdParam) {
        agentName = agentIdParam;
      }
    }

    // Check if operation is mutating and require agent_id
    if (op && op.mutating) {
      if (!agentIdParam) {
        // Throw an error if agent_id is missing for a mutating operation
        const latency = Date.now() - startTime;
        // Log the error attempt
        try {
          await executeRawJsonb(
            engine,
            `INSERT INTO mcp_request_log (token_name, agent_name, operation, latency_ms, status, error_message, params)
             VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
            [tokenName, agentName, name, latency, 'error', 'Missing required argument: agent_id', params ? [params] : [null]],
          );
        } catch { /* best effort */ }
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: 'missing_argument', message: 'Missing required argument: agent_id' }) }],
          isError: true,
        };
      }
    }

    let toolResult: Awaited<ReturnType<typeof dispatchToolCall>>;
    try {
      toolResult = await dispatchToolCall(engine, name, params as Record<string, unknown> | undefined, {
        remote: true,
        takesHoldersAllowList: ['world'],
        sourceId: process.env.GBRAIN_SOURCE || 'default',
        metaHook: getBrainHotMemoryMeta,
      });
    } catch (e) {
      // dispatchToolCall absorbs OperationError and returns isError:true; only unexpected throws land here.
      const latency = Date.now() - startTime;
      const errorPayload = serializeError(e);
      try {
        await executeRawJsonb(
          engine,
          `INSERT INTO mcp_request_log (token_name, agent_name, operation, latency_ms, status, error_message, params)
           VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
          [tokenName, agentName, name, latency, 'error', errorPayload.message, params ? [params] : [null]],
        );
      } catch { /* best effort */ }
      return { content: [{ type: 'text', text: JSON.stringify({ error: errorPayload }) }], isError: true };
    }

    const latency = Date.now() - startTime;
    if (toolResult.isError) {
      // Extract error message from toolResult
      let errMsg = 'unknown_error';
      try {
        const parsed = JSON.parse(toolResult.content[0]?.text ?? '{}');
        errMsg = parsed.error?.message ?? parsed.message ?? errMsg;
      } catch { /* ignore */ }
      try {
        await executeRawJsonb(
          engine,
          `INSERT INTO mcp_request_log (token_name, agent_name, operation, latency_ms, status, error_message, params)
           VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
          [tokenName, agentName, name, latency, 'error', errMsg, params ? [params] : [null]],
        );
      } catch { /* best effort */ }
      return toolResult;
    }

    // Successful tool call
    try {
      await executeRawJsonb(
        engine,
        `INSERT INTO mcp_request_log (token_name, agent_name, operation, latency_ms, status, params)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
        [tokenName, agentName, name, latency, 'success', params ? [params] : [null]],
      );
    } catch { /* best effort */ }
    return toolResult;
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Retrieval Reflex (#1981, D9=C): on a PGLite brain, serve owns the single
  // connection, so the context engine resolves salient entities THROUGH us over
  // a local unix socket rather than opening a second (impossible) connection.
  // Best-effort; failure to bind never blocks the MCP server.
  let resolveServer: import('node:net').Server | null = null;
  let resolveSocket: string | null = null;
  try {
    const cfg = loadConfig();
    if (cfg?.engine === 'pglite' && cfg.database_path) {
      resolveSocket = resolveSocketPath(cfg.database_path);
      const defaultSource = process.env.GBRAIN_SOURCE || 'default';
      resolveServer = await startResolveIpcServer(
        resolveSocket,
        (req) => {
          resolveEntitiesToPointers(
            engine,
            req.sourceId || defaultSource,
            req.candidates ?? [],
            {
              priorContextText: req.priorContextText,
              maxPointers: req.maxPointers,
              suppression: req.suppression,
            },
          );
        },
        // The IPC resolve path IS the ambient reflex channel. Logging happens
        // at DELIVERY (post-write), not inside the resolver — a block the
        // client's 250ms budget abandoned was never injected, and counting it
        // would corrupt the volunteered-vs-used precision stats (red-team).
        (block) => logDeliveredReflexPointers(engine, block.pointers),
      );
    }
  } catch {
    /* resolve IPC is best-effort; never block serve */
  }

  // Exit cleanly when MCP client disconnects (stdin EOF) or on signals.
  // Without this, orphaned serve processes accumulate and contend for the
  // PGLite write lock, causing ingest jobs (email-sync) to time out.
  let shuttingDown = false;
  const shutdown = (reason: string, code = 0) => {
    if (shuttingDown) return;
    shuttingDown = true;
    process.stderr.write(`[gbrain-serve] shutdown: ${reason}\\n`);
    try { resolveServer?.close(); } catch { /* noop */ };
    if (resolveSocket) cleanupStaleSocket(resolveSocket);
    Promise.resolve(engine.disconnect?.())
      .catch(() => {})
      .finally(() => process.exit(code));
  };
  // v0.34.1 (#870): when MCP_STDIO=1, the wrapping gateway (OpenClaw's
  // bundle-mcp layer, others) often pipes the JSON-RPC handshake then
  // closes its stdin half. Treating that as a permanent disconnect kills
  // the server before the first tool call arrives. Signal handlers and
  // transport.onclose still cover the legitimate shutdown paths.
  if (process.env.MCP_STDIO !== '1') {
    process.stdin.on('end', () => shutdown('stdin end'));
    process.stdin.on('close', () => shutdown('stdin close'));
  }
  // @ts-ignore — SDK exposes onclose on transport
  transport.onclose = () => shutdown('transport close');
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGHUP', () => shutdown('SIGHUP'));
}

// Backward compat: used by `gbrain call` command (trusted local path).
// v0.31.8 (D22): accept opts.sourceId so `gbrain call --source X <op> <json>`
// can scope the op handler to that source. resolveSourceId() in call.ts is
// the upstream resolver; this layer just passes the resolved id through.
export async function handleToolCall(
  engine: BrainEngine,
  tool: string,
  params: Record<string, unknown>,
  opts?: { sourceId?: string },
): Promise<unknown> {
  const op = operations.find(o => o.name === tool);
  if (!op) throw new Error(`Unknown tool: ${tool}`);

  const validationError = validateParams(op, params);
  if (validationError) throw new Error(validationError);

  const ctx = buildOperationContext(engine, params, {
    remote: false,
    logger: { info: console.log, warn: console.warn, error: console.error },
    ...(opts?.sourceId ? { sourceId: opts.sourceId } : {}),
  });

  return op.handler(ctx, params);
}