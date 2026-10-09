/**
 * Local, loopback-only mock vendor server for the credential-free provider
 * acceptance gate (`continuous-test-suite-acceptance-gate.ts`).
 *
 * Speaks the two wire protocol families the redirectable shipped providers
 * use:
 *   - OpenAI-compatible chat completions (`POST .../chat/completions`),
 *     including SSE streaming, tool calls, `response_format`, reasoning
 *     deltas, `/embeddings`, and a permissive `/models`. Covers OpenAI,
 *     Azure (deployment-path routing, `api-key` header), OpenRouter,
 *     LiteLLM, Ollama, NVIDIA NIM, LM Studio, llama.cpp,
 *     openai-compatible, and every non-cloudflare catalog provider.
 *   - The Anthropic Messages API (`POST .../messages`), non-streaming and
 *     SSE, including `message_start`/`content_block_*`/`message_delta`/
 *     `message_stop` framing the official `@anthropic-ai/sdk` client parses.
 *
 * This is a genuine HTTP server on 127.0.0.1 (not a `fetch` patch), so it
 * exercises the real request-serialisation path for both the SDK and the
 * built CLI (same server, same port, for cell 9 — CLI parity).
 *
 * Every response is driven by a MARKER embedded in the prompt text, not by a
 * request counter or call order — the marker travels inside the actual
 * message content the provider serialises, so it survives whatever
 * per-provider system-prompt / tool-schema injection happens before the
 * wire call. Each cell's assertion is against an EXACT, unguessable-where-it-
 * matters value this module exports, never a shape/type check — see the
 * per-marker doc comments below for what makes each one falsifiable.
 */
import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";

// `createServer`'s request-listener overload gives `(req, res) => void`, but
// deriving `res`'s type from `Parameters<Parameters<typeof createServer>[0]>[1]`
// is fragile: overload resolution on `typeof createServer` can land on the
// `(options: ServerOptions, listener?) => Server` overload instead under a
// different tsconfig (target/module/lib), collapsing the derived type to
// `never`. Name the real type instead.
type GateServerResponse = ServerResponse<IncomingMessage>;
import { randomUUID } from "node:crypto";

// ---------------------------------------------------------------------------
// Shared, exact, falsifiable constants — the suite imports these directly so
// the assertions and the mock's responses can never drift apart.
// ---------------------------------------------------------------------------

/** Markers embedded in the outbound prompt text to select mock behavior. */
export const GATE_MARKERS = {
  /** Cell 2 (exact-output generate) and the default/cell-1 identity ping. */
  EXACT: "___NEUROLINK_GATE_EXACT___",
  /** Cell 3 (drained stream, identity asserted). */
  STREAM: "___NEUROLINK_GATE_STREAM___",
  /** Cell 4 (tool-nonce proof). */
  TOOL: "___NEUROLINK_GATE_TOOL___",
  /** Cell 5 (structured-exact). */
  STRUCTURED: "___NEUROLINK_GATE_STRUCTURED___",
  /** Public schema-repair/truncation proof (a deliberately incomplete object). */
  TRUNCATED: "___NEUROLINK_GATE_TRUNCATED___",
  /** Cell 6 (thinking proof). */
  THINKING: "___NEUROLINK_GATE_THINKING___",
} as const;

/** Cell 2's expected exact content — asserted with `===`, not "non-empty". */
export const GATE_EXACT_VALUE = "NEUROLINK_ACCEPTANCE_GATE_EXACT_7f3a9c2e";

/**
 * Appended to the REQUESTED model id to build the model the mock server
 * echoes back on the wire for a streamed cell-3 call. Deliberately
 * different from what was requested — a gateway/router rewriting an alias
 * to a concrete served model is the real-world case cell 3 exists to catch
 * — so the assertion can tell "reports the request" from "reports what the
 * server actually served" apart. See the cell-3 identity fix in
 * `openaiChatCompletionsBase.ts` / `anthropic/client.ts`.
 */
export const GATE_SERVER_MODEL_SUFFIX = "::mock-server-resolved";

/** Cell 3's fixed stream content (identity is the point, not the text). */
export const GATE_STREAM_VALUE = "ACCEPTANCE_GATE_STREAM_OK";

/** Cell 5's expected exact structured value — equality, not type-checking. */
export const GATE_STRUCTURED_VALUE = {
  status: "ok",
  count: 42,
  tag: "acceptance-gate",
} as const;

export const GATE_TRUNCATED_TEXT = '{"status":"ok","count":42,"tag":"';
export const GATE_TRUNCATED_VALUE = {
  status: "ok",
  count: 42,
  tag: "",
} as const;

/** Tool name the mock asks the model to call for cell 4. */
export const GATE_TOOL_NAME = "acceptance_gate_get_nonce";

/** Prefix the mock's final answer carries once it has seen a real tool result. */
export const GATE_TOOL_CONFIRM_PREFIX = "ACCEPTANCE_GATE_TOOL_CONFIRMED:";

/**
 * Cell 6's reasoning text, split across TWO deltas on the wire — a single
 * delta would still pass a consumer that replaces rather than accumulates
 * reasoning (see `mockChatServer.ts`'s identical anti-cheat rationale).
 * The suite asserts the ACCUMULATED string, not either half alone.
 */
export const GATE_THINKING_PARTS = [
  "acceptance-gate-thinking-part-A-",
  "part-B-done",
] as const;
export const GATE_THINKING_FULL = GATE_THINKING_PARTS.join("");

/** Cell 6's post-thinking answer text (proves the turn still completes). */
export const GATE_THINKING_ANSWER = "ACCEPTANCE_GATE_THINKING_OK";

/** Cell 7's exact embedding vector — equality, not "non-empty array". */
export const GATE_EMBEDDING_VECTOR = [0.11, 0.22, 0.33, 0.44] as const;

/**
 * Error body/status the mock returns once a run's request count exceeds its
 * ceiling (cell 8). 400 rather than 429: `withProviderRetry` does not retry
 * 400s, so a ceiling breach fails FAST and deterministically instead of
 * burning through the SDK's retry/backoff budget first.
 */
export const GATE_BUDGET_EXCEEDED_MESSAGE =
  "ACCEPTANCE_GATE_BUDGET_CEILING_EXCEEDED";

/**
 * Error body/status the mock returns when the outbound request carried none
 * of `GATE_MARKERS` (`findMarker()` returned `undefined`). This must never
 * be confused with the deliberate `GATE_MARKERS.EXACT` case: cells 1, 2 and
 * 9 assert against `GATE_EXACT_VALUE` and need "the marker truly arrived on
 * the wire" to be distinguishable from "the request body was empty, garbled,
 * or otherwise dropped the marker" — see docs/provider-integration/
 * acceptance-gate.md. 400 (not a silent EXACT-shaped reply) so a
 * content-dropping bug in the outgoing message pipeline fails loudly.
 */
export const GATE_NO_MARKER_MESSAGE = "ACCEPTANCE_GATE_NO_MARKER_FOUND";

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

export type CapturedGateRequest = {
  path: string;
  protocol: "openai" | "anthropic" | "other";
  bodyJson: unknown;
  /** Only synthetic fixture labels are recorded; unknown authorization is never retained. */
  fixtureAuthLabel?: string;
  /** Model identity recorded when the fixture actually emits a response. */
  responseModel?: string;
};

export type AcceptanceGateServer = {
  /** Base URL for OpenAI-compatible `*_BASE_URL` env vars (includes `/v1`). */
  readonly openaiBaseURL: string;
  /** Base URL for `ANTHROPIC_BASE_URL` (the SDK appends `/v1/messages`). */
  readonly anthropicBaseURL: string;
  /** Base origin, no path — for `AZURE_OPENAI_ENDPOINT`, which builds its own path. */
  readonly origin: string;
  /** Every request this server has handled so far, oldest first. */
  getAllRequests(): CapturedGateRequest[];
  /** Total requests handled, including any rejected for exceeding the ceiling. */
  requestCount(): number;
  /**
   * The requests answered with `GATE_BUDGET_EXCEEDED_MESSAGE`. Cell 8 reads
   * this so a call that failed for some unrelated reason (network, timeout,
   * provider validation) cannot pass as "the ceiling rejected it".
   */
  budgetRejections(): CapturedGateRequest[];
  /** The ceiling this instance enforces. */
  readonly ceiling: number;
  close(): Promise<void>;
};

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
  });
}

function sseLine(payload: unknown, event?: string): string {
  return `${event ? `event: ${event}\n` : ""}data: ${JSON.stringify(payload)}\n\n`;
}

type OpenAICompatBody = {
  model?: string;
  stream?: boolean;
  messages?: Array<{ role?: string; content?: unknown }>;
};

type AnthropicBody = {
  model?: string;
  stream?: boolean;
  messages?: Array<{ role?: string; content?: unknown }>;
};

/**
 * Extracts the nonce a tool's own `execute()` echoed back on the wire.
 *
 * The haystack is `JSON.stringify(messages)` of the *parsed* request body —
 * a tool-result message's `content` is itself a JSON string (e.g.
 * `{"nonce":"..."}`), so re-stringifying the outer array escapes its
 * embedded quotes (`\"nonce\":\"...\"`). A naive `/"nonce"\s*:\s*"([^"]+)"/`
 * never matches that escaped form and silently falls back to
 * "MISSING_NONCE" for every provider — this broke cell 4 uniformly across
 * every tool-capable row. Tolerate any number of backslash-escapes around
 * each quote (one level for OpenAI's `role:"tool"` content string, more if
 * a protocol nests it further) instead of assuming exactly zero.
 */
function extractNonce(haystack: string): string | undefined {
  const match = /\\*"nonce\\*"\s*:\s*\\*"([^"\\]*)\\*"/.exec(haystack);
  return match?.[1];
}

function findMarker(haystack: string): string | undefined {
  for (const marker of Object.values(GATE_MARKERS)) {
    if (haystack.includes(marker)) {
      return marker;
    }
  }
  return undefined;
}

function handleOpenAIChat(
  bodyStr: string,
  res: GateServerResponse,
  recordModel: (model: string) => void,
): void {
  let body: OpenAICompatBody = {};
  try {
    body = JSON.parse(bodyStr) as OpenAICompatBody;
  } catch {
    // Malformed JSON: fall through to the default exact-value reply so the
    // caller's assertion (not this server) is what reports the problem.
  }
  const messages = body.messages ?? [];
  const haystack = JSON.stringify(messages);
  const marker = findMarker(haystack);
  const requestedModel = body.model ?? "unknown-model";
  const hasToolResult = messages.some((m) => m.role === "tool");
  const streaming = body.stream === true;

  const chunkId = `gate-${randomUUID()}`;
  const created = Math.floor(Date.now() / 1000);

  const writeJson = (payload: Record<string, unknown>): void => {
    if (typeof payload.model === "string") {
      recordModel(payload.model);
    }
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(payload));
  };

  const writeStream = (
    deltas: Array<{
      content?: string;
      reasoning_content?: string;
      tool_calls?: unknown[];
      finish_reason?: string | null;
      model?: string;
    }>,
  ): void => {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
    for (const d of deltas) {
      const { finish_reason, model, ...delta } = d;
      recordModel(model ?? requestedModel);
      res.write(
        sseLine({
          id: chunkId,
          object: "chat.completion.chunk",
          created,
          model: model ?? requestedModel,
          choices: [
            {
              index: 0,
              delta,
              finish_reason: finish_reason ?? null,
            },
          ],
        }),
      );
    }
    res.write("data: [DONE]\n\n");
    res.end();
  };

  const finishReasonJson = (
    message: Record<string, unknown>,
    finishReason: string,
  ) =>
    writeJson({
      id: chunkId,
      object: "chat.completion",
      created,
      model: requestedModel,
      choices: [{ index: 0, message, finish_reason: finishReason }],
      usage: { prompt_tokens: 5, completion_tokens: 5, total_tokens: 10 },
    });

  if (marker === GATE_MARKERS.TOOL) {
    if (!hasToolResult) {
      if (streaming) {
        writeStream([
          {
            tool_calls: [
              {
                index: 0,
                id: "gate_call_1",
                type: "function",
                function: { name: GATE_TOOL_NAME, arguments: "{}" },
              },
            ],
          },
          { finish_reason: "tool_calls" },
        ]);
        return;
      }
      finishReasonJson(
        {
          role: "assistant",
          content: null,
          tool_calls: [
            {
              id: "gate_call_1",
              type: "function",
              function: { name: GATE_TOOL_NAME, arguments: "{}" },
            },
          ],
        },
        "tool_calls",
      );
      return;
    }
    const nonce = extractNonce(haystack) ?? "MISSING_NONCE";
    const content = `${GATE_TOOL_CONFIRM_PREFIX}${nonce}`;
    if (streaming) {
      writeStream([{ content }, { finish_reason: "stop" }]);
      return;
    }
    finishReasonJson({ role: "assistant", content }, "stop");
    return;
  }

  if (marker === GATE_MARKERS.STRUCTURED) {
    const content = JSON.stringify(GATE_STRUCTURED_VALUE);
    if (streaming) {
      writeStream([{ content }, { finish_reason: "stop" }]);
      return;
    }
    finishReasonJson({ role: "assistant", content }, "stop");
    return;
  }

  if (marker === GATE_MARKERS.TRUNCATED) {
    finishReasonJson(
      { role: "assistant", content: GATE_TRUNCATED_TEXT },
      "length",
    );
    return;
  }

  if (marker === GATE_MARKERS.THINKING) {
    // Reasoning is inherently a streaming concept here; a non-streaming
    // call with this marker still gets a sensible answer (no reasoning
    // field to split), so the suite always drives this cell via stream().
    writeStream([
      { reasoning_content: GATE_THINKING_PARTS[0] },
      { reasoning_content: GATE_THINKING_PARTS[1] },
      { content: GATE_THINKING_ANSWER },
      { finish_reason: "stop" },
    ]);
    return;
  }

  if (marker === GATE_MARKERS.STREAM) {
    const resolvedModel = `${requestedModel}${GATE_SERVER_MODEL_SUFFIX}`;
    writeStream([
      { content: GATE_STREAM_VALUE, model: resolvedModel },
      { finish_reason: "stop", model: resolvedModel },
    ]);
    return;
  }

  if (marker === GATE_MARKERS.EXACT) {
    // Cell-1 identity ping + cell 2 (exact-output generate): echo the
    // requested model verbatim (generate()'s `.model` reports the pre-call
    // resolved model, not a server-echoed one — see docs/provider-
    // integration/acceptance-gate.md), with the exact cell-2 content.
    if (streaming) {
      writeStream([{ content: GATE_EXACT_VALUE }, { finish_reason: "stop" }]);
      return;
    }
    finishReasonJson({ role: "assistant", content: GATE_EXACT_VALUE }, "stop");
    return;
  }

  // No recognized marker anywhere in the outbound request: distinct from
  // GATE_MARKERS.EXACT above, never silently answered as if it had been
  // sent (see GATE_NO_MARKER_MESSAGE doc comment).
  res.writeHead(400, { "Content-Type": "application/json" });
  res.end(
    JSON.stringify({
      error: { message: GATE_NO_MARKER_MESSAGE, type: "invalid_request_error" },
    }),
  );
}

function handleEmbeddings(bodyStr: string, res: GateServerResponse): void {
  let model = "unknown-model";
  try {
    model = (JSON.parse(bodyStr) as { model?: string }).model ?? model;
  } catch {
    // fall through with the default model label
  }
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(
    JSON.stringify({
      object: "list",
      data: [
        {
          object: "embedding",
          index: 0,
          embedding: [...GATE_EMBEDDING_VECTOR],
        },
      ],
      model,
      usage: { prompt_tokens: 1, total_tokens: 1 },
    }),
  );
}

/**
 * Cohere's native embed endpoint (`POST /v2/embed`) — distinct from the
 * OpenAI-compatible `/embeddings` path above. `CohereProvider.embedMany()`
 * (`src/lib/providers/cohere.ts`) bypasses the shared `/compatibility/v1`
 * chat surface entirely for embeddings and posts `{ model, texts, ... }`
 * directly to this native route, expecting back
 * `{ embeddings: { float: number[][] } }` with one vector per input text.
 */
function handleCohereEmbed(bodyStr: string, res: GateServerResponse): void {
  let textCount = 1;
  try {
    const parsed = JSON.parse(bodyStr) as { texts?: unknown };
    if (Array.isArray(parsed.texts) && parsed.texts.length > 0) {
      textCount = parsed.texts.length;
    }
  } catch {
    // fall through with a single vector
  }
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(
    JSON.stringify({
      id: "gate-cohere-embed",
      embeddings: {
        float: Array.from({ length: textCount }, () => [
          ...GATE_EMBEDDING_VECTOR,
        ]),
      },
      texts: [],
    }),
  );
}

function handleModels(res: GateServerResponse): void {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(
    JSON.stringify({
      object: "list",
      data: [{ id: "gate-mock-model", object: "model" }],
    }),
  );
}

function handleAnthropicMessages(
  bodyStr: string,
  res: GateServerResponse,
  recordModel: (model: string) => void,
): void {
  let body: AnthropicBody = {};
  try {
    body = JSON.parse(bodyStr) as AnthropicBody;
  } catch {
    // fall through to the default exact-value reply
  }
  const messages = body.messages ?? [];
  const haystack = JSON.stringify(messages);
  const marker = findMarker(haystack);
  const requestedModel = body.model ?? "unknown-model";
  const hasToolResult = haystack.includes('"type":"tool_result"');
  const streaming = body.stream === true;
  const msgId = `gate_msg_${randomUUID()}`;

  const writeJson = (
    content: Array<Record<string, unknown>>,
    stopReason: string,
  ): void => {
    recordModel(requestedModel);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        id: msgId,
        type: "message",
        role: "assistant",
        model: requestedModel,
        content,
        stop_reason: stopReason,
        stop_sequence: null,
        usage: { input_tokens: 5, output_tokens: 5 },
      }),
    );
  };

  // Streaming: named SSE events, per the official Anthropic Messages
  // protocol the `@anthropic-ai/sdk` client parses (message_start →
  // content_block_start/delta/stop (repeated per block) → message_delta →
  // message_stop).
  const writeStream = (
    blocks: Array<{
      type: "text" | "thinking" | "tool_use";
      deltas: Array<{ type: string; [k: string]: unknown }>;
      startExtra?: Record<string, unknown>;
    }>,
    stopReason: string,
  ): void => {
    recordModel(requestedModel);
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
    res.write(
      sseLine(
        {
          type: "message_start",
          message: {
            id: msgId,
            type: "message",
            role: "assistant",
            content: [],
            model: requestedModel,
            stop_reason: null,
            stop_sequence: null,
            usage: { input_tokens: 5, output_tokens: 0 },
          },
        },
        "message_start",
      ),
    );
    blocks.forEach((block, index) => {
      res.write(
        sseLine(
          {
            type: "content_block_start",
            index,
            content_block: {
              type: block.type,
              ...(block.type === "text" ? { text: "" } : {}),
              ...(block.type === "thinking" ? { thinking: "" } : {}),
              ...(block.type === "tool_use"
                ? { id: "gate_toolu_1", name: GATE_TOOL_NAME, input: {} }
                : {}),
              ...block.startExtra,
            },
          },
          "content_block_start",
        ),
      );
      for (const delta of block.deltas) {
        res.write(
          sseLine(
            { type: "content_block_delta", index, delta },
            "content_block_delta",
          ),
        );
      }
      res.write(
        sseLine({ type: "content_block_stop", index }, "content_block_stop"),
      );
    });
    res.write(
      sseLine(
        {
          type: "message_delta",
          delta: { stop_reason: stopReason },
          usage: { output_tokens: 5 },
        },
        "message_delta",
      ),
    );
    res.write(sseLine({ type: "message_stop" }, "message_stop"));
    res.end();
  };

  if (marker === GATE_MARKERS.TOOL) {
    if (!hasToolResult) {
      if (streaming) {
        writeStream(
          [
            {
              type: "tool_use",
              deltas: [{ type: "input_json_delta", partial_json: "{}" }],
            },
          ],
          "tool_use",
        );
        return;
      }
      writeJson(
        [
          {
            type: "tool_use",
            id: "gate_toolu_1",
            name: GATE_TOOL_NAME,
            input: {},
          },
        ],
        "tool_use",
      );
      return;
    }
    const nonce = extractNonce(haystack) ?? "MISSING_NONCE";
    const text = `${GATE_TOOL_CONFIRM_PREFIX}${nonce}`;
    if (streaming) {
      writeStream(
        [{ type: "text", deltas: [{ type: "text_delta", text }] }],
        "end_turn",
      );
      return;
    }
    writeJson([{ type: "text", text }], "end_turn");
    return;
  }

  if (marker === GATE_MARKERS.STRUCTURED) {
    const text = JSON.stringify(GATE_STRUCTURED_VALUE);
    if (streaming) {
      writeStream(
        [{ type: "text", deltas: [{ type: "text_delta", text }] }],
        "end_turn",
      );
      return;
    }
    writeJson([{ type: "text", text }], "end_turn");
    return;
  }

  if (marker === GATE_MARKERS.TRUNCATED) {
    writeJson([{ type: "text", text: GATE_TRUNCATED_TEXT }], "max_tokens");
    return;
  }

  if (marker === GATE_MARKERS.THINKING) {
    writeStream(
      [
        {
          type: "thinking",
          deltas: [
            { type: "thinking_delta", thinking: GATE_THINKING_PARTS[0] },
            { type: "thinking_delta", thinking: GATE_THINKING_PARTS[1] },
            { type: "signature_delta", signature: "gate-sig" },
          ],
        },
        {
          type: "text",
          deltas: [{ type: "text_delta", text: GATE_THINKING_ANSWER }],
        },
      ],
      "end_turn",
    );
    return;
  }

  if (marker === GATE_MARKERS.STREAM) {
    writeStream(
      [
        {
          type: "text",
          deltas: [{ type: "text_delta", text: GATE_STREAM_VALUE }],
        },
      ],
      "end_turn",
    );
    return;
  }

  if (marker === GATE_MARKERS.EXACT) {
    if (streaming) {
      writeStream(
        [
          {
            type: "text",
            deltas: [{ type: "text_delta", text: GATE_EXACT_VALUE }],
          },
        ],
        "end_turn",
      );
      return;
    }
    writeJson([{ type: "text", text: GATE_EXACT_VALUE }], "end_turn");
    return;
  }

  // No recognized marker anywhere in the outbound request: distinct from
  // GATE_MARKERS.EXACT above, never silently answered as if it had been
  // sent (see GATE_NO_MARKER_MESSAGE doc comment).
  res.writeHead(400, { "Content-Type": "application/json" });
  res.end(
    JSON.stringify({
      error: {
        type: "invalid_request_error",
        message: GATE_NO_MARKER_MESSAGE,
      },
    }),
  );
}

/**
 * Start the shared mock vendor server.
 *
 * @param ceiling Hard request-count ceiling this instance enforces (cell 8).
 *   Requests past it get a non-retryable 400 carrying
 *   `GATE_BUDGET_EXCEEDED_MESSAGE`, counted like any other request.
 */
export function startAcceptanceGateServer(
  ceiling: number,
): Promise<AcceptanceGateServer> {
  const requests: CapturedGateRequest[] = [];
  const rejections: CapturedGateRequest[] = [];

  const server: Server = createServer((req, res) => {
    readBody(req)
      .then((bodyStr) => {
        const url = (req.url ?? "").split("?")[0];
        const protocol: CapturedGateRequest["protocol"] = url.endsWith(
          "/messages",
        )
          ? "anthropic"
          : url.endsWith("/chat/completions") ||
              url.endsWith("/embeddings") ||
              url.endsWith("/models")
            ? "openai"
            : "other";
        let bodyJson: unknown;
        try {
          bodyJson = bodyStr ? JSON.parse(bodyStr) : undefined;
        } catch {
          bodyJson = undefined;
        }
        const auth = req.headers.authorization ?? req.headers["x-api-key"];
        const fixtureAuthLabel =
          typeof auth === "string"
            ? /(?:Bearer )?(pilot-fixture-(?:env|instance|call))$/.exec(
                auth,
              )?.[1]
            : undefined;
        const captured: CapturedGateRequest = {
          path: url,
          protocol,
          bodyJson,
          ...(fixtureAuthLabel ? { fixtureAuthLabel } : {}),
        };
        requests.push(captured);

        if (requests.length > ceiling) {
          rejections.push(captured);
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              error: {
                message: GATE_BUDGET_EXCEEDED_MESSAGE,
                type: "invalid_request_error",
              },
            }),
          );
          return;
        }

        if (url.endsWith("/messages")) {
          handleAnthropicMessages(bodyStr, res, (model) => {
            captured.responseModel = model;
          });
          return;
        }
        if (url.endsWith("/embeddings")) {
          handleEmbeddings(bodyStr, res);
          return;
        }
        if (url.endsWith("/v2/embed")) {
          handleCohereEmbed(bodyStr, res);
          return;
        }
        if (url.endsWith("/models")) {
          handleModels(res);
          return;
        }
        if (url.endsWith("/chat/completions")) {
          handleOpenAIChat(bodyStr, res, (model) => {
            captured.responseModel = model;
          });
          return;
        }
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: { message: "not found" } }));
      })
      .catch(() => {
        res.writeHead(500);
        res.end();
      });
  });

  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      const origin = `http://127.0.0.1:${port}`;
      resolve({
        openaiBaseURL: `${origin}/v1`,
        anthropicBaseURL: origin,
        origin,
        getAllRequests: () => [...requests],
        requestCount: () => requests.length,
        budgetRejections: () => [...rejections],
        ceiling,
        close: () => new Promise((r) => server.close(() => r())),
      });
    });
  });
}
