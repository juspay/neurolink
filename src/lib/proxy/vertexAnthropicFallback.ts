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
import type {
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

/** Strip what Vertex rejects and pin the API version it requires. */
export function buildVertexAnthropicPayload(
  body: Readonly<Record<string, unknown>>,
): Record<string, unknown> {
  const dropped = new Set<string>(UNSUPPORTED_FIELDS);
  const payload = Object.fromEntries(
    Object.entries(body).filter(([key]) => !dropped.has(key)),
  );
  if ("output_config" in payload) {
    const mapped = mapVertexOutputConfig(payload.output_config);
    if (mapped === undefined) {
      delete payload.output_config;
    } else {
      payload.output_config = mapped;
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

/**
 * Send one Anthropic-shaped request to Vertex and return the upstream response
 * untouched, so the caller can stream its bytes straight to the client.
 */
export async function dispatchVertexAnthropicPassthrough(
  request: VertexAnthropicPassthroughRequest,
): Promise<Response> {
  const token = await auth().getAccessToken();
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
