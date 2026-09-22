#!/usr/bin/env tsx
/**
 * Codex Responses SSE bisection listener (Phase 1, Task 4 of the
 * reverse-fallback plan).
 *
 * WHAT THIS IS
 * ------------
 * A local HTTP server that speaks just enough of the Codex CLI's Responses
 * wire protocol (`POST .../responses`, `stream: true`) to answer a real,
 * unmodified `codex` binary with a *scripted* SSE event sequence instead of
 * the real ChatGPT backend. The goal is to find the minimal event set the
 * CLI actually requires before it treats a turn as finished — i.e. bisect
 * away events the real backend sends that the CLI doesn't structurally
 * depend on — and separately, whether a `toolu_`-prefixed tool-call id
 * (Anthropic's id convention, relevant to the Vertex/Claude -> Codex
 * fallback path this plan is about) survives an echo round-trip unmodified.
 *
 * This is a replay/bisection *tool*, not a test suite: it is meant to be
 * pointed at by a real `codex` process and read interactively/by log. No
 * Codex account or quota is needed — the CLI builds and POSTs a Responses
 * request regardless of whether the account behind it is entitled to
 * anything, because entitlement is an upstream-side concern this listener
 * never reaches.
 *
 * WHERE THE CANDIDATE EVENT LIST COMES FROM
 * ------------------------------------------
 * `docs/reverse-fallback-plan.md` (section "The event table transfers,
 * inverted") does not exist in this worktree/branch — verified with
 * `git log --all` and a full tree search, see
 * test/fixtures/sse-bisection-findings.md for how that was confirmed. The
 * candidate list below is instead reconstructed from the two things that DO
 * exist and describe the real wire shape:
 *
 *   1. `src/lib/proxy/codexUsage.ts` (`inspectEvidence`), which is written
 *      against captured real traffic and enumerates every event type the
 *      proxy has ever had to recognise:
 *        response.created, response.in_progress (implied — usage stays
 *        null until completion), response.output_item.added/.done,
 *        response.content_part.added/.done, response.output_text.delta/
 *        .done, response.refusal.delta/.done,
 *        response.function_call_arguments.delta/.done,
 *        response.custom_tool_call_input.delta/.done, response.completed,
 *        error, response.failed, response.incomplete.
 *   2. `test/fixtures/codex-response-usage.sse`, a captured real
 *      `response.completed` frame, and the doc comment above
 *      `extractCodexUsage` noting `response.created` arrives first with
 *      `usage: null`.
 *
 * `test/fixtures/codex-request-*.json` supplies the *request* shapes this
 * listener validates against (interactive vs exec mode, resumed session,
 * and a turn that replays a prior function_call/function_call_output pair)
 * — see `readFixtureRequestShapes()` below.
 *
 * HOW TO POINT A REAL CODEX CLI AT THIS LISTENER
 * ------------------------------------------------
 * Never touch a real `~/.codex` — isolate with `CODEX_HOME`:
 *
 *   pnpm exec tsx scripts/codex-replay-listener.ts --port 41045 --script full
 *
 * then in another shell:
 *
 *   export CODEX_HOME=$(mktemp -d)
 *   cat > "$CODEX_HOME/config.toml" <<'EOF'
 *   model_provider = "replay"
 *   [model_providers.replay]
 *   name = "Local replay listener"
 *   base_url = "http://127.0.0.1:41045/backend-api/codex"
 *   wire_api = "responses"
 *   requires_openai_auth = true
 *   EOF
 *   cat > "$CODEX_HOME/auth.json" <<'EOF'
 *   {"OPENAI_API_KEY": null, "tokens": {"access_token": "replay-dummy",
 *    "account_id": "replay", "id_token": ""}, "last_refresh":
 *    "2026-01-01T00:00:00Z"}
 *   EOF
 *   codex exec "say hello"
 *
 * This mirrors the managed block `neurolink proxy start` writes into
 * `~/.codex/config.toml` (see docs/features/codex-proxy-support.md section
 * 3), just pointed at this listener instead of the real proxy, and scoped
 * to a throwaway `CODEX_HOME` so it can never touch a real account.
 *
 * BISECTION SCRIPTS
 * ------------------
 * `--script <name>` selects which event subset this listener sends back.
 * Run the CLI once per script and compare: did it print the assistant text
 * / run the tool / exit cleanly, or did it hang past a reasonable timeout /
 * error? See test/fixtures/sse-bisection-findings.md for the write-up of
 * what each script tests and (if run) what was observed.
 *
 *   full               response.created -> response.in_progress ->
 *                       response.output_item.added -> response.content_part.added ->
 *                       response.output_text.delta (x2) -> response.output_text.done ->
 *                       response.content_part.done -> response.output_item.done ->
 *                       response.completed
 *   no-created          `full` minus response.created
 *   no-in-progress       `full` minus response.in_progress
 *   no-output-item-added `full` minus response.output_item.added (and its
 *                        matching .done, since a .done for an item that was
 *                        never .added is not a real-world shape)
 *   terminal-only        response.completed alone, nothing before it
 *   tool-call            a function_call turn instead of a text turn, whose
 *                        item id AND call_id are `toolu_`-prefixed, to test
 *                        whether the CLI treats that as opaque or rejects/
 *                        rewrites it. Only used when the incoming request
 *                        does not already carry a function_call_output
 *                        (i.e. this is the tool-call-issuing turn, not the
 *                        turn answering one).
 *
 * SAFETY
 * ------
 * This never talks to the real chatgpt.com backend. It answers every
 * request itself. `x-codex-beta-features` / `x-openai-internal-codex-*`
 * headers and the `authorization` bearer are logged (redacted) but not
 * validated — this listener does not gate on auth, because verifying the
 * CLI's *request* shape and the client's tolerance of a *response* shape is
 * the whole point, not access control.
 */

import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFileSync, appendFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..");
const FIXTURES_DIR = join(REPO_ROOT, "test", "fixtures");

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

type Args = {
  port: number;
  script: ScriptName;
  requests: number;
  delayMs: number;
  logFile: string | null;
  toolIdPrefix: string;
};

const SCRIPT_NAMES = [
  "full",
  "no-created",
  "no-in-progress",
  "no-output-item-added",
  "terminal-only",
  "tool-call",
] as const;
type ScriptName = (typeof SCRIPT_NAMES)[number];

function isScriptName(value: string): value is ScriptName {
  return (SCRIPT_NAMES as readonly string[]).includes(value);
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    port: 41045,
    script: "full",
    requests: 0, // 0 = unbounded, listener runs until Ctrl-C
    delayMs: 15,
    // Off by default so a casual run never writes a scratch artifact into
    // the repo; pass --log-file to capture a JSONL trace for a real session
    // (every request/response is always echoed to the console regardless).
    logFile: null,
    toolIdPrefix: "toolu_",
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = (): string => {
      i++;
      const value = argv[i];
      if (value === undefined) {
        throw new Error(`${arg} requires a value`);
      }
      return value;
    };
    switch (arg) {
      case "--port":
        args.port = Number(next());
        break;
      case "--script": {
        const value = next();
        if (!isScriptName(value)) {
          throw new Error(
            `--script must be one of: ${SCRIPT_NAMES.join(", ")} (got "${value}")`,
          );
        }
        args.script = value;
        break;
      }
      case "--requests":
        args.requests = Number(next());
        break;
      case "--delay-ms":
        args.delayMs = Number(next());
        break;
      case "--log-file":
        args.logFile = next();
        break;
      case "--no-log":
        args.logFile = null;
        break;
      case "--tool-id-prefix":
        args.toolIdPrefix = next();
        break;
      case "--help":
        printHelp();
        process.exit(0);
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return args;
}

function printHelp(): void {
  console.log(`Usage: pnpm exec tsx scripts/codex-replay-listener.ts [options]

Options:
  --port <n>            Listen port (default 41045)
  --script <name>        SSE event script: ${SCRIPT_NAMES.join(", ")} (default full)
  --requests <n>          Exit after n requests (default 0 = unbounded)
  --delay-ms <n>          Delay between each SSE event (default 15)
  --log-file <path>       Also write a JSONL request/response log to this path (default: console only)
  --no-log                No-op alias; logging to a file is already off by default
  --tool-id-prefix <str>  Prefix used for the "tool-call" script's synthetic id (default toolu_)
  --help                  Show this help
`);
}

// ---------------------------------------------------------------------------
// Fixture request shapes — used only to sanity-check the CLI's real request
// against what the corpus says to expect, never to gate the response.
// ---------------------------------------------------------------------------

type FixtureShape = {
  file: string;
  variation: string;
  mode: string;
  hasSessionId: boolean;
  hasFunctionCallOutput: boolean;
};

function readFixtureRequestShapes(): FixtureShape[] {
  const files = [
    "codex-request-interactive-mode.json",
    "codex-request-exec-mode.json",
    "codex-request-resumed-session.json",
    "codex-request-tool-result-turn.json",
  ];
  return files.map((file) => {
    const raw = JSON.parse(readFileSync(join(FIXTURES_DIR, file), "utf8")) as {
      _fixtureMeta: { variation: string; mode: string };
      body: { session_id?: string; input: Array<{ type: string }> };
    };
    return {
      file,
      variation: raw._fixtureMeta.variation,
      mode: raw._fixtureMeta.mode,
      hasSessionId: raw.body.session_id !== undefined,
      hasFunctionCallOutput: raw.body.input.some(
        (item) => item.type === "function_call_output",
      ),
    };
  });
}

/**
 * Classify an incoming request body against the fixture corpus's shape
 * vocabulary. Never throws — an unrecognised shape is still served, just
 * logged as "unclassified" so the bisection isn't blocked by a shape the
 * corpus didn't anticipate (e.g. a real CLI version sends one more
 * developer message than the synthetic fixtures do).
 */
function classifyRequestBody(body: unknown): {
  looksLikeCodexRequest: boolean;
  hasSessionId: boolean;
  hasFunctionCallOutput: boolean;
  inputItemCount: number;
} {
  if (!body || typeof body !== "object") {
    return {
      looksLikeCodexRequest: false,
      hasSessionId: false,
      hasFunctionCallOutput: false,
      inputItemCount: 0,
    };
  }
  const record = body as Record<string, unknown>;
  const input = Array.isArray(record.input) ? record.input : [];
  const hasFunctionCallOutput = input.some(
    (item) =>
      item && typeof item === "object" && (item as { type?: unknown }).type === "function_call_output",
  );
  return {
    looksLikeCodexRequest:
      typeof record.model === "string" && record.stream === true && input.length > 0,
    hasSessionId: typeof record.session_id === "string",
    hasFunctionCallOutput,
    inputItemCount: input.length,
  };
}

// ---------------------------------------------------------------------------
// SSE event builders — shapes drawn from codexUsage.ts's inspectEvidence()
// and the captured test/fixtures/codex-response-usage.sse frame.
// ---------------------------------------------------------------------------

type SSEEvent = { event: string; data: unknown };

function frame(event: SSEEvent): string {
  return `event: ${event.event}\ndata: ${JSON.stringify(event.data)}\n\n`;
}

const RESPONSE_ID = "resp_replay_0001";
const ITEM_ID = "item_replay_0001";

function textTurnEvents(): SSEEvent[] {
  return [
    {
      event: "response.created",
      data: { type: "response.created", response: { id: RESPONSE_ID, usage: null } },
    },
    {
      event: "response.in_progress",
      data: { type: "response.in_progress", response: { id: RESPONSE_ID, usage: null } },
    },
    {
      event: "response.output_item.added",
      data: {
        type: "response.output_item.added",
        output_index: 0,
        item: { id: ITEM_ID, type: "message", role: "assistant", status: "in_progress", content: [] },
      },
    },
    {
      event: "response.content_part.added",
      data: {
        type: "response.content_part.added",
        item_id: ITEM_ID,
        output_index: 0,
        content_index: 0,
        part: { type: "output_text", text: "" },
      },
    },
    {
      event: "response.output_text.delta",
      data: { type: "response.output_text.delta", item_id: ITEM_ID, output_index: 0, content_index: 0, delta: "Hello from " },
    },
    {
      event: "response.output_text.delta",
      data: { type: "response.output_text.delta", item_id: ITEM_ID, output_index: 0, content_index: 0, delta: "the replay listener." },
    },
    {
      event: "response.output_text.done",
      data: { type: "response.output_text.done", item_id: ITEM_ID, output_index: 0, content_index: 0, text: "Hello from the replay listener." },
    },
    {
      event: "response.content_part.done",
      data: {
        type: "response.content_part.done",
        item_id: ITEM_ID,
        output_index: 0,
        content_index: 0,
        part: { type: "output_text", text: "Hello from the replay listener." },
      },
    },
    {
      event: "response.output_item.done",
      data: {
        type: "response.output_item.done",
        output_index: 0,
        item: {
          id: ITEM_ID,
          type: "message",
          role: "assistant",
          status: "completed",
          content: [{ type: "output_text", text: "Hello from the replay listener." }],
        },
      },
    },
    {
      event: "response.completed",
      data: {
        type: "response.completed",
        response: {
          id: RESPONSE_ID,
          output: [
            {
              id: ITEM_ID,
              type: "message",
              role: "assistant",
              status: "completed",
              content: [{ type: "output_text", text: "Hello from the replay listener." }],
            },
          ],
          usage: {
            input_tokens: 42,
            input_tokens_details: { cache_write_tokens: 0, cached_tokens: 0 },
            output_tokens: 6,
            output_tokens_details: { reasoning_tokens: 0 },
            total_tokens: 48,
          },
        },
      },
    },
  ];
}

/**
 * A function_call turn whose item id AND call_id are `toolu_`-prefixed —
 * Anthropic's tool-use id convention, not OpenAI's `call_...` convention —
 * to test whether the CLI passes an unfamiliar-but-well-formed id straight
 * through as an opaque string (expected, since the Responses API treats
 * ids as bearer tokens for correlation, not as validated formats) or
 * chokes/rewrites it. This is the direct relevance to the reverse-fallback
 * plan: a Vertex/Claude-originated tool_use id relayed through a Codex
 * fallback keeps its `toolu_` shape end to end.
 */
function toolCallTurnEvents(toolCallId: string): SSEEvent[] {
  return [
    {
      event: "response.created",
      data: { type: "response.created", response: { id: RESPONSE_ID, usage: null } },
    },
    {
      event: "response.output_item.added",
      data: {
        type: "response.output_item.added",
        output_index: 0,
        item: { id: toolCallId, type: "function_call", name: "exec", call_id: toolCallId, arguments: "" },
      },
    },
    {
      event: "response.function_call_arguments.delta",
      data: { type: "response.function_call_arguments.delta", item_id: toolCallId, output_index: 0, delta: "ls -" },
    },
    {
      event: "response.function_call_arguments.delta",
      data: { type: "response.function_call_arguments.delta", item_id: toolCallId, output_index: 0, delta: "la" },
    },
    {
      event: "response.function_call_arguments.done",
      data: { type: "response.function_call_arguments.done", item_id: toolCallId, output_index: 0, arguments: "ls -la" },
    },
    {
      event: "response.output_item.done",
      data: {
        type: "response.output_item.done",
        output_index: 0,
        item: { id: toolCallId, type: "function_call", name: "exec", call_id: toolCallId, arguments: "ls -la", status: "completed" },
      },
    },
    {
      event: "response.completed",
      data: {
        type: "response.completed",
        response: {
          id: RESPONSE_ID,
          output: [{ id: toolCallId, type: "function_call", name: "exec", call_id: toolCallId, arguments: "ls -la", status: "completed" }],
          usage: {
            input_tokens: 51,
            input_tokens_details: { cache_write_tokens: 0, cached_tokens: 0 },
            output_tokens: 9,
            output_tokens_details: { reasoning_tokens: 0 },
            total_tokens: 60,
          },
        },
      },
    },
  ];
}

/** Filter a full event list down to a named bisection variant. */
function buildScript(name: ScriptName, toolIdPrefix: string, hasFunctionCallOutput: boolean): SSEEvent[] {
  if (name === "tool-call" && !hasFunctionCallOutput) {
    return toolCallTurnEvents(`${toolIdPrefix}replay0000000000000000`);
  }
  const events = textTurnEvents();
  switch (name) {
    case "full":
    case "tool-call": // tool-call falls back to a text turn on a tool-result-answering request
      return events;
    case "no-created":
      return events.filter((e) => e.event !== "response.created");
    case "no-in-progress":
      return events.filter((e) => e.event !== "response.in_progress");
    case "no-output-item-added":
      return events.filter(
        (e) => e.event !== "response.output_item.added" && e.event !== "response.output_item.done",
      );
    case "terminal-only":
      return events.filter((e) => e.event === "response.completed");
    default:
      return events;
  }
}

// ---------------------------------------------------------------------------
// Logging
// ---------------------------------------------------------------------------

function redactHeaders(headers: IncomingMessage["headers"]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (value === undefined) {
      continue;
    }
    const flat = Array.isArray(value) ? value.join(", ") : value;
    out[key] = key.toLowerCase() === "authorization" ? "Bearer [REDACTED]" : flat;
  }
  return out;
}

function makeLogger(logFile: string | null) {
  if (logFile) {
    mkdirSync(dirname(logFile), { recursive: true });
  }
  return (entry: Record<string, unknown>): void => {
    const line = JSON.stringify({ ts: new Date().toISOString(), ...entry });
    console.log(line);
    if (logFile) {
      appendFileSync(logFile, line + "\n");
    }
  };
}

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks).toString("utf8");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function handleRequest(
  req: IncomingMessage,
  res: ServerResponse,
  args: Args,
  log: (entry: Record<string, unknown>) => void,
  requestCount: { n: number },
): Promise<void> {
  const raw = await readBody(req);
  let parsedBody: unknown = null;
  let parseError: string | null = null;
  try {
    parsedBody = raw ? JSON.parse(raw) : null;
  } catch (err) {
    parseError = err instanceof Error ? err.message : String(err);
  }
  const classification = classifyRequestBody(parsedBody);
  requestCount.n++;

  log({
    kind: "request",
    seq: requestCount.n,
    method: req.method,
    url: req.url,
    headers: redactHeaders(req.headers),
    bodyBytes: raw.length,
    parseError,
    classification,
  });

  if (req.method !== "POST" || !req.url?.endsWith("/responses")) {
    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: { message: "not found on replay listener" } }));
    log({ kind: "response", seq: requestCount.n, status: 404 });
    return;
  }

  const events = buildScript(args.script, args.toolIdPrefix, classification.hasFunctionCallOutput);

  res.writeHead(200, {
    "content-type": "text/event-stream",
    "cache-control": "no-cache",
    connection: "keep-alive",
  });

  const sentEventTypes: string[] = [];
  for (const event of events) {
    res.write(frame(event));
    sentEventTypes.push(event.event);
    if (args.delayMs > 0) {
      // Deliberate: replays the drip-feed shape of a real stream, one event at a time.
      await sleep(args.delayMs);
    }
  }
  res.end();

  log({
    kind: "response",
    seq: requestCount.n,
    status: 200,
    script: args.script,
    sentEventTypes,
    emittedCompleted: sentEventTypes.includes("response.completed"),
  });
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const log = makeLogger(args.logFile);
  const fixtureShapes = readFixtureRequestShapes();

  console.log("Codex replay SSE bisection listener");
  console.log(`  port:    ${args.port}`);
  console.log(`  script:  ${args.script}`);
  console.log(`  requests limit: ${args.requests || "unbounded"}`);
  console.log(`  log file: ${args.logFile ?? "(disabled)"}`);
  console.log("Known fixture request shapes (from test/fixtures/codex-request-*.json):");
  for (const shape of fixtureShapes) {
    console.log(
      `  - ${shape.file}: mode=${shape.mode} session=${shape.hasSessionId} toolResult=${shape.hasFunctionCallOutput} — ${shape.variation}`,
    );
  }
  console.log(
    "Point a real codex CLI at this listener via an isolated CODEX_HOME — see the header comment in this file for the exact config.toml/auth.json snippet.",
  );

  const requestCount = { n: 0 };
  const server = createServer((req, res) => {
    handleRequest(req, res, args, log, requestCount)
      .then(() => {
        if (args.requests > 0 && requestCount.n >= args.requests) {
          console.log(`Reached --requests limit (${args.requests}); shutting down.`);
          server.close();
        }
      })
      .catch((err) => {
        log({ kind: "error", message: err instanceof Error ? err.message : String(err) });
        if (!res.headersSent) {
          res.writeHead(500, { "content-type": "application/json" });
        }
        res.end(JSON.stringify({ error: { message: "replay listener internal error" } }));
      });
  });

  server.listen(args.port, "127.0.0.1", () => {
    console.log(`Listening on http://127.0.0.1:${args.port}/backend-api/codex/responses`);
  });
}

const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);
if (isMainModule) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

export {
  buildScript,
  classifyRequestBody,
  readFixtureRequestShapes,
  textTurnEvents,
  toolCallTurnEvents,
  type ScriptName,
  type Args,
};
