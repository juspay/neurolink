/**
 * Native Claude-to-Vertex passthrough.
 *
 * Claude on Vertex speaks the Anthropic Messages API, so a fallback to it needs
 * no translation at all — the client's body goes upstream essentially verbatim
 * and the SSE comes back in the shape the client already expects.
 *
 * This exists because the SDK/translation path cannot carry an agentic turn:
 * it runs its own tool loop, and a request whose tools have no executor (every
 * proxied request, since the caller executes them) ends with the pending tool
 * call discarded and a step-cap apology returned as assistant text. Tools,
 * `tool_use`, `tool_result`, `cache_control` and thinking blocks all survive
 * here because nothing reshapes them.
 */

import { GoogleAuth } from "google-auth-library";
import { logger } from "../utils/logger.js";
import { isTransientNetworkError } from "./proxyFetch.js";
import type {
  VertexAccessTokenProvider,
  UsageContext,
  VertexPassthroughTerminal,
  VertexAnthropicPassthroughRequest,
  VertexAnthropicPassthroughTarget,
} from "../types/index.js";

/** Vertex pins the Anthropic API version in the body, not a header. */
const VERTEX_ANTHROPIC_VERSION = "vertex-2023-10-16";

const CLOUD_PLATFORM_SCOPE = "https://www.googleapis.com/auth/cloud-platform";

/**
 * Fields the Anthropic first-party API accepts that Vertex's publisher endpoint
 * does not.
 *
 * Deliberately short. `model` moves into the URL, and `context_management` is
 * refused outright ("context_management: Extra inputs are not permitted").
 * Everything else the client sends is carried, including `metadata` and
 * `thinking`, both of which Vertex accepts — dropping them would silently
 * discard caller intent.
 */
const UNSUPPORTED_FIELDS = ["model", "context_management"] as const;

/**
 * Reasoning effort levels Vertex's Claude models accept, and how a level they
 * do not accept maps onto one they do.
 *
 * Claude Code sends `xhigh` for the Claude 5 family; `claude-opus-4-6` refuses
 * it by name ("Supported levels: high, low, max, medium"). Mapping it to the
 * top supported level preserves the caller's intent — run this turn as hard as
 * the model allows — where dropping the field would quietly downgrade it.
 */
const VERTEX_EFFORT_BY_LEVEL: Readonly<Record<string, string>> = {
  low: "low",
  medium: "medium",
  high: "high",
  max: "max",
  xhigh: "max",
};

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * Translate `output_config` for Vertex.
 *
 * An effort level Vertex knows passes through; one it does not is mapped onto
 * the nearest level it does. A level with no mapping at all loses only the
 * `effort` key, never the sibling settings beside it.
 */
export function mapVertexOutputConfig(
  value: unknown,
): Record<string, unknown> | undefined {
  if (!record(value)) {
    return undefined;
  }
  const effort = value.effort;
  if (typeof effort !== "string") {
    return value;
  }
  const mapped = VERTEX_EFFORT_BY_LEVEL[effort.toLowerCase()];
  if (mapped !== undefined) {
    return { ...value, effort: mapped };
  }
  const { effort: _unsupported, ...rest } = value;
  return Object.keys(rest).length > 0 ? rest : undefined;
}

/**
 * Vertex's message schema is exactly `{ role, content }`. Claude Code 2.1.x
 * also puts `output_config` on its system "directive" turn, which the
 * first-party API accepts and Vertex refuses: "messages.1.output_config:
 * Extra inputs are not permitted".
 */
const VERTEX_MESSAGE_KEYS: ReadonlySet<string> = new Set(["role", "content"]);

/**
 * Claude Code stamps its version into a system block as
 * `x-anthropic-billing-header: cc_version=…`. That is first-party billing
 * plumbing; on Vertex it only triggers a client-version check against the
 * fallback model, which the client never asked for ("Claude Code 2.1.278 does
 * not support this model"). It also sits first in `system` and varies with the
 * client build, entrypoint and subagent flag, so identical conversations from
 * different builds could never share a Vertex prompt cache while it stayed.
 *
 * Matched as a prefix, not anywhere in the text: the generator
 * (`buildStableClaudeCodeBillingHeader`) always emits it first, and a looser
 * match would delete a caller's own block that merely mentions the header.
 */
const BILLING_HEADER_MARKER = "x-anthropic-billing-header";

/**
 * How each mid-conversation tool change reads once it is plain text: the prefix
 * when the tool is named, and a sentence for a reference with no usable name.
 */
const TOOL_CHANGE_TEXT: Readonly<
  Record<string, { named: string; unnamed: string }>
> = {
  tool_addition: {
    named: "Tool now available: ",
    unnamed: "A tool became available.",
  },
  tool_removal: {
    named: "Tool no longer available: ",
    unnamed: "A tool was withdrawn.",
  },
};

/**
 * A change references a tool rather than defining one: `tool_reference` and
 * `mcp_tool_reference` carry a `name`, and an MCP toolset reference carries
 * only its `server_name`.
 */
function toolChangeText(type: string, tool: unknown): string {
  const wording = TOOL_CHANGE_TEXT[type];
  const label = !record(tool)
    ? ""
    : typeof tool.name === "string" && tool.name.trim()
      ? tool.name.trim()
      : typeof tool.server_name === "string"
        ? tool.server_name.trim()
        : "";
  return label ? `${wording.named}${label}` : wording.unnamed;
}

/**
 * Vertex rejects the `tool_addition` and `tool_removal` tags that offer or
 * withdraw a tool mid-conversation. Each one becomes a text block in the same
 * position, so the notice survives and the array never empties. Only the
 * message's own content array is touched: nested `tool_result` content stays
 * exactly as sent.
 */
function rewriteToolChanges(content: unknown): unknown {
  if (!Array.isArray(content)) {
    return content;
  }
  let changed = false;
  const mapped = content.map((block) => {
    if (
      !record(block) ||
      typeof block.type !== "string" ||
      !Object.hasOwn(TOOL_CHANGE_TEXT, block.type)
    ) {
      return block;
    }
    changed = true;
    return {
      type: "text",
      text: toolChangeText(block.type, block.tool),
      ...(block.cache_control !== undefined
        ? { cache_control: block.cache_control }
        : {}),
    };
  });
  return changed ? mapped : content;
}

function isEmptyContent(content: unknown): boolean {
  return (
    content === undefined ||
    content === "" ||
    (Array.isArray(content) && content.length === 0)
  );
}

/**
 * Move a `cache_control` set on the message itself onto its last content
 * block, which caches the same prefix, since Vertex accepts only `role` and
 * `content` on a message. String content becomes one text block to carry it.
 * A breakpoint with no block to land on, or whose block already has one, is
 * reported rather than dropped silently.
 */
function carryMessageBreakpoint(content: unknown, marker: unknown): unknown {
  if (marker === undefined) {
    return content;
  }
  if (typeof content === "string" && content !== "") {
    return [{ type: "text", text: content, cache_control: marker }];
  }
  const last = Array.isArray(content) ? content.at(-1) : undefined;
  if (
    Array.isArray(content) &&
    record(last) &&
    last.cache_control === undefined
  ) {
    return [...content.slice(0, -1), { ...last, cache_control: marker }];
  }
  warnDroppedBreakpoint("a message-level cache_control");
  return content;
}

/**
 * Vertex refuses `role: "system"` messages outright — "role 'system' is not
 * supported on this model" — where the first-party Messages API accepts them
 * anywhere except index 0.
 *
 * Claude Code interleaves them as positional notices: a file changed on disk
 * since it was last read, a tool became available, an MCP server dropped. Their
 * meaning depends on where they sit, so hoisting them into the top-level
 * `system` parameter would strip exactly what makes them useful, and dropping
 * them would silently lose context the turn depends on. They become user turns
 * instead, which keeps both the text and the position. Consecutive same-role
 * turns are accepted, so this never produces an invalid sequence.
 */
function normalizeVertexMessage(message: unknown): unknown {
  if (!record(message)) {
    return message;
  }
  const role = message.role === "system" ? "user" : message.role;
  const content = carryMessageBreakpoint(
    rewriteToolChanges(message.content),
    message.cache_control,
  );
  const onlyKnownKeys = Object.keys(message).every((key) =>
    VERTEX_MESSAGE_KEYS.has(key),
  );
  if (onlyKnownKeys && role === message.role && content === message.content) {
    return message;
  }
  return { role, ...("content" in message ? { content } : {}) };
}

/** Index of the last `role: "user"` message, or -1 when there is none. */
function lastUserIndex(messages: readonly unknown[]): number {
  return messages.findLastIndex(
    (message) => record(message) && message.role === "user",
  );
}

/**
 * A turn-scoped system message (`clear_at: "next_user_message"`) renders only
 * while no user message comes after it — one carrying only `tool_result`
 * counts — and renders nothing once one does. Sent to Vertex as a user turn it
 * would keep speaking after it should have gone quiet.
 */
function isClearedTurnScopedMessage(
  message: unknown,
  index: number,
  lastUser: number,
): boolean {
  return (
    record(message) &&
    message.role === "system" &&
    message.clear_at === "next_user_message" &&
    index < lastUser
  );
}

/**
 * A system turn left with no content carries nothing once its extra keys are
 * gone — the directive-only form is `content: []` plus `output_config`, whose
 * effort is resolved at the top level — so it is dropped rather than sent as
 * an empty user turn. So is a turn-scoped message that has already cleared.
 */
function normalizeVertexMessages(messages: unknown): unknown {
  if (!Array.isArray(messages)) {
    return messages;
  }
  const lastUser = lastUserIndex(messages);
  let changed = false;
  const normalized = messages.flatMap((message, index) => {
    if (isClearedTurnScopedMessage(message, index, lastUser)) {
      changed = true;
      return [];
    }
    const next = normalizeVertexMessage(message);
    if (next !== message) {
      changed = true;
    }
    if (
      record(message) &&
      message.role === "system" &&
      record(next) &&
      isEmptyContent(next.content)
    ) {
      return [];
    }
    return [next];
  });
  return changed ? normalized : messages;
}

/**
 * The effort in force for the turn being answered. A per-message directive
 * "takes effect from the next user turn and holds until a later message changes
 * it", so the governing one is the last directive before the final user
 * message; one after it belongs to a turn not yet taken. It overrides only the
 * settings it names. Vertex has no per-message effort, so this becomes the
 * request's top-level `output_config`.
 */
function resolveOutputConfig(topLevel: unknown, messages: unknown): unknown {
  if (!Array.isArray(messages)) {
    return topLevel;
  }
  const lastUser = lastUserIndex(messages);
  const directive = messages
    .slice(0, Math.max(lastUser, 0))
    .findLast(
      (message) =>
        record(message) &&
        message.role === "system" &&
        record(message.output_config),
    );
  if (!record(directive) || !record(directive.output_config)) {
    return topLevel;
  }
  return {
    ...(record(topLevel) ? topLevel : {}),
    ...directive.output_config,
  };
}

function isBillingBlock(block: unknown): boolean {
  return (
    record(block) &&
    typeof block.text === "string" &&
    block.text.trimStart().startsWith(BILLING_HEADER_MARKER)
  );
}

function warnDroppedBreakpoint(source: string): void {
  logger.warn(
    `[proxy] Vertex fallback could not keep the cache_control breakpoint on ${source}`,
  );
}

/**
 * Remove the billing block without losing a cache breakpoint it carried: the
 * marker moves onto the block that takes its place. When there is no such
 * block, or that block already has its own marker, the loss is reported rather
 * than passed over, because this path bills in real currency.
 */
function stripBillingBlock(system: unknown): unknown {
  if (!Array.isArray(system) || !system.some(isBillingBlock)) {
    return system;
  }
  const kept: unknown[] = [];
  let carried: unknown;
  for (const block of system) {
    if (isBillingBlock(block)) {
      if (record(block) && block.cache_control !== undefined) {
        if (carried !== undefined) {
          warnDroppedBreakpoint("the Claude Code billing block");
        }
        carried = block.cache_control;
      }
      continue;
    }
    if (carried !== undefined && record(block)) {
      if (block.cache_control === undefined) {
        kept.push({ ...block, cache_control: carried });
      } else {
        warnDroppedBreakpoint("the Claude Code billing block");
        kept.push(block);
      }
      carried = undefined;
      continue;
    }
    kept.push(block);
  }
  if (carried !== undefined) {
    warnDroppedBreakpoint("the Claude Code billing block");
  }
  return kept.length > 0 ? kept : undefined;
}

/**
 * Strip what Vertex rejects and pin the API version it requires.
 *
 * Prompt caching constrains every rewrite here. Anthropic caches only up to an
 * explicit `cache_control` marker, at most four per request, over a prefix
 * rendered `tools → system → messages`; anything removed or inserted before a
 * marker invalidates it and everything after. So: never drop a marker, never
 * reorder `system`, and keep each rewrite deterministic so consecutive turns
 * share a prefix. Vertex holds its own cache, apart from the first-party one,
 * so nothing here can disturb first-party hits.
 */
export function buildVertexAnthropicPayload(
  body: Readonly<Record<string, unknown>>,
): Record<string, unknown> {
  const dropped = new Set<string>(UNSUPPORTED_FIELDS);
  const payload = Object.fromEntries(
    Object.entries(body).filter(([key]) => !dropped.has(key)),
  );
  const outputConfig = resolveOutputConfig(
    payload.output_config,
    payload.messages,
  );
  if (outputConfig !== undefined) {
    const mapped = mapVertexOutputConfig(outputConfig);
    if (mapped === undefined) {
      delete payload.output_config;
    } else {
      payload.output_config = mapped;
    }
  }
  if ("messages" in payload) {
    payload.messages = normalizeVertexMessages(payload.messages);
  }
  if ("system" in payload) {
    const system = stripBillingBlock(payload.system);
    if (system === undefined) {
      delete payload.system;
    } else {
      payload.system = system;
    }
  }
  return { ...payload, anthropic_version: VERTEX_ANTHROPIC_VERSION };
}

/**
 * Publisher endpoint for a Claude model on Vertex.
 *
 * Streaming and non-streaming are different verbs on the same resource, so the
 * caller's `stream` flag selects the verb rather than changing the body.
 */
export function buildVertexAnthropicUrl(
  target: VertexAnthropicPassthroughTarget,
): string {
  const verb = target.stream ? "streamRawPredict" : "rawPredict";
  // The global endpoint is not a region: it drops the host prefix entirely,
  // while the path still carries `locations/global`. Prefixing it yields
  // `global-aiplatform.googleapis.com`, which does not resolve to an API.
  const host =
    target.location === "global"
      ? "aiplatform.googleapis.com"
      : `${target.location}-aiplatform.googleapis.com`;
  return (
    `https://${host}/v1/projects/${target.projectId}/locations/` +
    `${target.location}/publishers/anthropic/models/${target.model}:${verb}`
  );
}

let cachedAuth: GoogleAuth | undefined;

function auth(): GoogleAuth {
  cachedAuth ??= new GoogleAuth({ scopes: [CLOUD_PLATFORM_SCOPE] });
  return cachedAuth;
}

let accessTokenProviderForTests: VertexAccessTokenProvider | undefined;

async function vertexAccessToken(): Promise<string | null | undefined> {
  return accessTokenProviderForTests
    ? accessTokenProviderForTests()
    : auth().getAccessToken();
}

/**
 * Replace the Google credential lookup, for tests only.
 *
 * Without this seam the two-leg fallback chain cannot be driven end to end.
 * The rest of the hop is reachable — `dispatchVertexAnthropicPassthrough`
 * calls the global `fetch`, which a test can replace — but the credential
 * lookup goes through gaxios, and gaxios resolves its transport to
 * `(await import("node-fetch")).default` rather than `globalThis.fetch`. A
 * test that swaps the global therefore cannot intercept the token exchange,
 * and on a machine with no Application Default Credentials the leg throws
 * before it ever reaches the model. That left the one path that bills in real
 * currency with no end-to-end coverage at all.
 *
 * Pass `undefined` to restore the real credential lookup.
 */
export function setVertexAccessTokenProviderForTests(
  provider: VertexAccessTokenProvider | undefined,
): void {
  accessTokenProviderForTests = provider;
}

const DNS_FAILURE_CODES: ReadonlySet<string> = new Set([
  "ENOTFOUND",
  "EAI_AGAIN",
]);
const DNS_FAILURE_MESSAGE = /\bgetaddrinfo (ENOTFOUND|EAI_AGAIN)\b/;
const TOKEN_RETRY_DELAY_MS = 250;

/**
 * A resolver failure while reaching Google's token endpoint. The shared proxy
 * classifier leaves DNS codes out, since elsewhere one can mean a mistyped
 * host, but this endpoint is fixed and its failures on 2026-09-23 were blips
 * reported only in the message text ("getaddrinfo ENOTFOUND
 * oauth2.googleapis.com").
 */
function isDnsFailure(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; depth < 5 && record(current); depth++) {
    if (
      (typeof current.code === "string" &&
        DNS_FAILURE_CODES.has(current.code)) ||
      (typeof current.message === "string" &&
        DNS_FAILURE_MESSAGE.test(current.message))
    ) {
      return true;
    }
    current = current.cause;
  }
  return false;
}

/**
 * Run once more after a short pause when the first attempt hit a transient
 * network failure: anything the shared proxy classifier retries, plus a DNS
 * blip. One retry absorbs a blip without hiding a real outage: a second
 * failure, or any other error, surfaces unchanged.
 */
export async function withTransientNetworkRetry<T>(
  run: () => Promise<T>,
  delayMs: number = TOKEN_RETRY_DELAY_MS,
): Promise<T> {
  try {
    return await run();
  } catch (error) {
    if (!isTransientNetworkError(error) && !isDnsFailure(error)) {
      throw error;
    }
    await new Promise<void>((resolve) => setTimeout(resolve, delayMs));
    return run();
  }
}

/**
 * Send one Anthropic-shaped request to Vertex and return the upstream response
 * untouched, so the caller can stream its bytes straight to the client.
 */
export async function dispatchVertexAnthropicPassthrough(
  request: VertexAnthropicPassthroughRequest,
): Promise<Response> {
  const token = await withTransientNetworkRetry(() => vertexAccessToken());
  if (!token) {
    throw new Error(
      "Vertex passthrough could not obtain a Google access token; " +
        "check Application Default Credentials for this project",
    );
  }
  const stream = request.body.stream === true;
  const url = buildVertexAnthropicUrl({
    projectId: request.projectId,
    location: request.location,
    model: request.model,
    stream,
  });
  return fetch(url, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      accept: stream ? "text/event-stream" : "application/json",
    },
    body: JSON.stringify(buildVertexAnthropicPayload(request.body)),
    ...(request.signal ? { signal: request.signal } : {}),
  });
}

/** Claude models are the only publisher models this passthrough addresses. */
export function isVertexAnthropicModel(model: string): boolean {
  return model.toLowerCase().startsWith("claude");
}

/**
 * Resolve where Vertex traffic is addressed, using the same environment the
 * Vertex provider reads so a fallback lands on the project and region the rest
 * of the process already uses.
 */
export function resolveVertexTarget():
  | { projectId: string; location: string }
  | undefined {
  const projectId =
    process.env.GOOGLE_CLOUD_PROJECT ??
    process.env.VERTEX_PROJECT_ID ??
    process.env.GOOGLE_VERTEX_PROJECT ??
    process.env.GOOGLE_CLOUD_PROJECT_ID;
  if (!projectId?.trim()) {
    return undefined;
  }
  const location =
    process.env.GOOGLE_CLOUD_LOCATION ??
    process.env.VERTEX_LOCATION ??
    process.env.GOOGLE_VERTEX_LOCATION ??
    "us-central1";
  return { projectId: projectId.trim(), location };
}

/**
 * Run one Claude-on-Vertex fallback attempt and hand back a response the route
 * can serve directly.
 *
 * A non-2xx upstream throws so the caller's attempt loop records the failure
 * and moves to the next hop, exactly as the other providers behave.
 */
export async function executeVertexAnthropicFallback(args: {
  body: Readonly<Record<string, unknown>>;
  model: string;
  signal?: AbortSignal;
  /** Fires exactly once on every exit, so the hop is finalized like any other. */
  onTerminal?: (terminal: VertexPassthroughTerminal) => void;
}): Promise<Response> {
  const target = resolveVertexTarget();
  if (!target) {
    throw new Error(
      "Vertex fallback needs a Google Cloud project; set GOOGLE_CLOUD_PROJECT",
    );
  }
  const upstream = await dispatchVertexAnthropicPassthrough({
    body: args.body,
    projectId: target.projectId,
    location: target.location,
    model: args.model,
    ...(args.signal ? { signal: args.signal } : {}),
  });
  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => "");
    throw new Error(
      `Vertex ${args.model} responded ${upstream.status}: ${detail.slice(0, 300)}`,
    );
  }
  // A non-streaming reply is one JSON object with no `data:` lines, so the SSE
  // observer would read nothing from it and report all-zero usage as if it were
  // real. Parse that shape directly instead, and still hand the client the exact
  // bytes Vertex sent.
  if (args.onTerminal && args.body.stream !== true) {
    const text = await upstream.text();
    args.onTerminal({ usage: readJsonUsage(text), status: upstream.status });
    return new Response(text, {
      status: upstream.status,
      headers: {
        "content-type":
          upstream.headers.get("content-type") ?? "application/json",
      },
    });
  }
  // The body is already Anthropic-shaped, so it is forwarded untouched rather
  // than parsed and re-serialized. Usage is read from a copy of each chunk so
  // this hop is metered like every other one instead of going dark.
  const body =
    upstream.body && args.onTerminal
      ? observeVertexUsage(upstream.body, args.onTerminal)
      : upstream.body;
  return new Response(body, {
    status: upstream.status,
    headers: {
      "content-type":
        upstream.headers.get("content-type") ??
        (args.body.stream === true ? "text/event-stream" : "application/json"),
    },
  });
}

/**
 * Read token usage out of an Anthropic SSE stream.
 *
 * `message_start` carries the input side and the cache breakdown;
 * `message_delta` carries the running output count, the last of which is the
 * turn's total. Both are accumulated so a passthrough hop reports the same
 * usage as any other, rather than going unmetered.
 */
function readUsageEvent(
  event: Record<string, unknown>,
  into: UsageContext,
): void {
  const message = event.message;
  const usage = (
    event.type === "message_start" && record(message)
      ? message.usage
      : event.usage
  ) as Record<string, unknown> | undefined;
  if (!record(usage)) {
    return;
  }
  const num = (value: unknown): number =>
    typeof value === "number" && Number.isFinite(value) ? value : 0;
  if (event.type === "message_start") {
    into.inputTokens = num(usage.input_tokens);
    into.cacheCreationTokens = num(usage.cache_creation_input_tokens);
    into.cacheReadTokens = num(usage.cache_read_input_tokens);
  }
  // Every message_delta restates the running total, so the last one wins.
  const output = num(usage.output_tokens);
  if (output > 0) {
    into.outputTokens = output;
  }
}

/**
 * Read usage out of a non-streaming Anthropic reply.
 *
 * `rawPredict` returns a single `{"type":"message","usage":{...}}` object, which
 * carries the whole turn's counts at once rather than splitting them across
 * `message_start` and `message_delta`.
 */
export function readJsonUsage(text: string): UsageContext {
  const usage: UsageContext = {
    inputTokens: 0,
    outputTokens: 0,
    cacheCreationTokens: 0,
    cacheReadTokens: 0,
  };
  try {
    const parsed = JSON.parse(text) as Record<string, unknown>;
    readUsageEvent(
      { ...parsed, type: "message_start", message: parsed },
      usage,
    );
    // A single object states the final output count directly.
    const raw = record(parsed.usage) ? parsed.usage.output_tokens : undefined;
    if (typeof raw === "number" && Number.isFinite(raw)) {
      usage.outputTokens = raw;
    }
  } catch {
    // An unparseable body is reported as zero rather than guessed at.
  }
  return usage;
}
/**
 * Forward a stream unchanged while observing its usage events.
 *
 * The bytes are passed through untouched — parsing happens on a copy of each
 * chunk — so the client sees exactly what Vertex sent.
 *
 * A transform's `flush` only runs on a clean end, which would leave a stream
 * error or a client disconnect with no terminal record at all. An explicit
 * reader loop is used instead, so `onTerminal` fires exactly once on every
 * exit: normal end, upstream failure, and cancellation.
 */
export function observeVertexUsage(
  body: ReadableStream<Uint8Array>,
  onTerminal: (terminal: VertexPassthroughTerminal) => void,
): ReadableStream<Uint8Array> {
  const usage: UsageContext = {
    inputTokens: 0,
    outputTokens: 0,
    cacheCreationTokens: 0,
    cacheReadTokens: 0,
  };
  const decoder = new TextDecoder();
  const reader = body.getReader();
  let pending = "";
  let reported = false;
  const report = (status: number, errorMessage?: string): void => {
    if (reported) {
      return;
    }
    reported = true;
    onTerminal({ usage, status, ...(errorMessage ? { errorMessage } : {}) });
  };
  const consume = (chunk: Uint8Array): void => {
    pending += decoder.decode(chunk, { stream: true });
    const lines = pending.split("\n");
    // Keep the trailing fragment; it completes on a later chunk.
    pending = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data:")) {
        continue;
      }
      const raw = line.slice(5).trim();
      if (!raw || raw === "[DONE]") {
        continue;
      }
      try {
        readUsageEvent(JSON.parse(raw) as Record<string, unknown>, usage);
      } catch {
        // A partial or non-JSON payload is never fatal to the passthrough.
      }
    }
  };
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const { done, value } = await reader.read();
        if (done) {
          report(200);
          controller.close();
          return;
        }
        consume(value);
        controller.enqueue(value);
      } catch (error) {
        report(502, error instanceof Error ? error.message : String(error));
        controller.error(error);
      }
    },
    cancel(reason) {
      // The client went away mid-stream; tokens already spent still count.
      report(499, reason === undefined ? undefined : String(reason));
      return reader.cancel(reason);
    },
  });
}
