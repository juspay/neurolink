#!/usr/bin/env tsx
import "dotenv/config";
import { jsonSchema } from "../dist/index.js";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * Mocked Contract Test Suite for New Providers
 *
 * Verifies request shape + response parsing + error mapping for the 14
 * providers added in this branch — without burning real upstream credits.
 *
 * For each provider we:
 *   1. Intercept globalThis.fetch with route-based mocks.
 *   2. Set a fake API key so the provider constructs.
 *   3. Invoke the SDK entry point (nl.generate / nl.embed / etc.).
 *   4. Assert request URL + method + auth header + body shape.
 *   5. Assert response parses into the expected SDK result.
 *   6. Verify 401 → friendly auth error; 429 → retriable; 5xx → retriable.
 *
 * Coverage matrix:
 *
 *   LLM (OpenAI-compat):     xAI, Groq, Together AI, Fireworks, Perplexity
 *   LLM (custom shape):      Cohere, Cloudflare Workers AI, Replicate
 *   Embeddings:              Voyage AI, Jina AI
 *   Image-gen:               Stability, Ideogram, Recraft
 *   LLM (native, fetch-interceptable):    OpenAI, Azure, Anthropic
 *   LLM (native, construction-only —
 *        SDK bypasses globalThis.fetch):  Vertex, Bedrock
 *
 * Run with: pnpm run test:providers-mocked
 */

import {
  installMockFetch,
  record,
  expect,
  expectEq,
  type TestRecord,
} from "./utils/mockFetch.js";

const results: TestRecord[] = [];

// ───────────────────────────────────────────────────────────────────────
// Section: shared setup
// ───────────────────────────────────────────────────────────────────────

const ORIGINAL_ENV: Record<string, string | undefined> = {};

function setEnv(name: string, value: string | undefined): void {
  if (!(name in ORIGINAL_ENV)) {
    ORIGINAL_ENV[name] = process.env[name];
  }
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}

function restoreEnv(): void {
  for (const [name, value] of Object.entries(ORIGINAL_ENV)) {
    if (value === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = value;
    }
  }
}

async function withMocks<T>(
  routes: Parameters<typeof installMockFetch>[0],
  fn: (handle: ReturnType<typeof installMockFetch>) => Promise<T>,
): Promise<T> {
  const handle = installMockFetch(routes);
  try {
    return await fn(handle);
  } finally {
    handle.unset();
  }
}

function openAIChatResponse(content: string, model: string): unknown {
  return {
    id: "chatcmpl-mock",
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [
      {
        index: 0,
        message: { role: "assistant", content },
        finish_reason: "stop",
      },
    ],
    usage: { prompt_tokens: 5, completion_tokens: 5, total_tokens: 10 },
  };
}

function anthropicMessageResponse(text: string, model: string): unknown {
  return {
    id: "msg_mock",
    type: "message",
    role: "assistant",
    model,
    content: [{ type: "text", text }],
    stop_reason: "end_turn",
    stop_sequence: null,
    usage: { input_tokens: 5, output_tokens: 5 },
  };
}

// ───────────────────────────────────────────────────────────────────────
// Section: xAI / Groq / Together / Fireworks / Perplexity
// (All five wrap @ai-sdk/openai with their own baseURL.)
// ───────────────────────────────────────────────────────────────────────

type OpenAICompatSpec = {
  /** Provider key in the registry / nl.generate({provider}). */
  provider: string;
  /** Env var to set with a fake key so the constructor succeeds. */
  envVar: string;
  /** Additional env vars required at construction time (e.g. account id). */
  extraEnv?: Record<string, string>;
  /** Substring of the upstream URL the provider should hit. */
  urlMatch: string;
  /** Expected auth scheme on the Authorization header. */
  authPrefix: string;
  /** Model name to pass through. */
  model: string;
  /** Friendly auth-error substring expected in the 401 case. */
  authErrorMatch: RegExp;
  /** Optional: when set, runs a 429 case asserting this pattern against
   *  the surfaced error message. Providers ported off a hand-written
   *  subclass in this plan set this; pre-existing entries left it unset
   *  (no regression — the case is skipped, not failed, when absent). */
  rateLimitErrorMatch?: RegExp;
};

// ── Catalog-derived Tier-2 provider specs ──────────────────────────────
// Deliberately REIMPLEMENTS the loader's env-var/URL conventions instead
// of importing catalogEnvVar from dist/providers/catalog/loader.js. That
// function is also what the runtime provider construction path uses to
// read the very env var this suite sets — importing it here would make
// the derivation tautological: a bug in catalogEnvVar would compute the
// same (wrong) env var on both sides and every assertion below would
// still pass. Hand-deriving the convention independently means a real
// divergence between this file's understanding and the loader's actual
// behavior surfaces as a genuine failure (wrong env var -> provider
// never picks up the fake key -> URL/auth/401 assertions fail for real).
// See src/lib/providers/catalog/loader.ts for the authoritative version.
type CatalogWireEnvOverrides = {
  apiKey?: string;
  baseURL?: string;
  model?: string;
};
type CatalogJsonEntry = {
  id: string;
  wire: {
    baseURL?: string;
    baseURLTemplate?: string;
    extraCredentials?: string[];
    envOverrides?: CatalogWireEnvOverrides;
  };
  models: { default: string };
};

function derivedCatalogEnvVar(
  entry: CatalogJsonEntry,
  kind: "apiKey" | "baseURL" | "model",
): string {
  const override = entry.wire.envOverrides?.[kind];
  if (override) {
    return override;
  }
  const base = entry.id.toUpperCase().replace(/-/g, "_");
  const suffix =
    kind === "apiKey" ? "API_KEY" : kind === "baseURL" ? "BASE_URL" : "MODEL";
  return `${base}_${suffix}`;
}

// Computed-base-URL env var for template providers (Cloudflare's account
// id), mirroring the loader's `${ID}_${EXTRA_SNAKE_CASE}` convention.
function derivedComputedBaseURLEnvVar(entry: CatalogJsonEntry): string {
  const base = entry.id.toUpperCase().replace(/-/g, "_");
  const extra = entry.wire.extraCredentials?.[0] ?? "accountId";
  const extraSnake = extra.replace(/([A-Z])/g, "_$1").toUpperCase();
  return `${base}_${extraSnake}`;
}

// Resolves wire.baseURL (or wire.baseURLTemplate with a dummy value for
// its one placeholder) down to `host+path/chat/completions`, the shape
// every OpenAI-compat spec's urlMatch has always used. Cloudflare's
// baseURLTemplate resolves through the SAME branch here — its derived
// urlMatch is byte-identical to the suite's pre-catalog hand-written one
// (verified against "mock-account-id-1234"), so no bespoke handling is
// needed to preserve today's coverage.
function derivedChatCompletionsUrl(entry: CatalogJsonEntry): {
  urlMatch: string;
  extraEnv?: Record<string, string>;
} {
  if (entry.wire.baseURL) {
    const parsed = new URL(entry.wire.baseURL);
    const path = parsed.pathname.replace(/\/$/, "");
    return { urlMatch: `${parsed.host}${path}/chat/completions` };
  }
  const template = entry.wire.baseURLTemplate;
  const extraKey = entry.wire.extraCredentials?.[0];
  if (!template || !extraKey) {
    throw new Error(
      `catalog entry ${entry.id} must have wire.baseURL, or wire.baseURLTemplate with exactly one extraCredentials entry`,
    );
  }
  const dummyValue = "mock-account-id-1234";
  const resolved = new URL(template.replace(`{${extraKey}}`, dummyValue));
  const path = resolved.pathname.replace(/\/$/, "");
  return {
    urlMatch: `${resolved.host}${path}/chat/completions`,
    extraEnv: { [derivedComputedBaseURLEnvVar(entry)]: dummyValue },
  };
}

async function buildOpenAICompatProviders(): Promise<OpenAICompatSpec[]> {
  const { CATALOG_JSON_ENTRIES } =
    (await import("../dist/providers/catalog/index.generated.js")) as {
      CATALOG_JSON_ENTRIES: CatalogJsonEntry[];
    };

  const derived: OpenAICompatSpec[] = CATALOG_JSON_ENTRIES.map((entry) => {
    const { urlMatch, extraEnv } = derivedChatCompletionsUrl(entry);
    return {
      provider: entry.id,
      envVar: derivedCatalogEnvVar(entry, "apiKey"),
      ...(extraEnv ? { extraEnv } : {}),
      urlMatch,
      authPrefix: "Bearer ",
      model: entry.models.default,
      authErrorMatch: new RegExp(`${entry.id}|401|unauthor|api key`, "i"),
      rateLimitErrorMatch: new RegExp(`${entry.id}|rate.?limit|429`, "i"),
    };
  });

  return [
    ...derived,
    // Cohere is NOT a JSON-catalog provider (no src/lib/providers/catalog/
    // cohere.json) — it stays hand-written, appended after the derived rows.
    {
      provider: "cohere",
      envVar: "COHERE_API_KEY",
      urlMatch: "api.cohere.com/compatibility/v1/chat/completions",
      authPrefix: "Bearer ",
      model: "command-r-plus",
      authErrorMatch: /cohere|401|unauthor|api key/i,
    },
  ];
}

async function runOpenAICompatProvider(spec: OpenAICompatSpec): Promise<void> {
  const section = `LLM ${spec.provider}`;
  const fakeKey = `test-fake-${spec.provider}-credential`;
  setEnv(spec.envVar, fakeKey);
  if (spec.extraEnv) {
    for (const [k, v] of Object.entries(spec.extraEnv)) {
      setEnv(k, v);
    }
  }

  const { NeuroLink } = await import("../dist/index.js");

  // ── Happy path ──────────────────────────────────────────────────────
  try {
    await withMocks(
      [
        {
          method: "POST",
          url: spec.urlMatch,
          respond: {
            status: 200,
            json: openAIChatResponse("pong", spec.model),
          },
        },
      ],
      async ({ calls }) => {
        const nl = new NeuroLink({ conversationMemory: { enabled: false } });
        const result = await nl.generate({
          provider: spec.provider,
          model: spec.model,
          input: { text: "ping" },
          disableTools: true,
        });

        expect(calls.length > 0, "at least one fetch call captured");
        const call = calls[0];
        expect(
          call.url.includes(spec.urlMatch),
          `URL contains '${spec.urlMatch}' (got ${call.url})`,
        );
        expectEq(call.method, "POST", "request method");
        expect(
          (call.headers["authorization"] ?? "").startsWith(
            `${spec.authPrefix}${fakeKey}`,
          ),
          `Authorization header starts with '${spec.authPrefix}${fakeKey.slice(0, 12)}...'`,
        );
        const body = call.bodyJson as { model: string; messages: unknown[] };
        expect(typeof body === "object", "body is JSON object");
        expectEq(body.model, spec.model, "body.model");
        expect(Array.isArray(body.messages), "body.messages is array");
        // Strict backends (probed live on Cerebras 2026-08-27) reject
        // tool_choice with 400 wrong_api_format when tools are absent, so a
        // tools-less request must not carry it.
        expect(
          !("tool_choice" in (body as Record<string, unknown>)),
          "tool_choice must be absent when the request carries no tools",
        );

        expect(
          (result.content ?? "").toLowerCase().includes("pong"),
          `response content includes 'pong' (got ${JSON.stringify(result.content?.slice(0, 100))})`,
        );
        record(results, `${section}: happy-path generate()`, true);
      },
    );
  } catch (err) {
    record(
      results,
      `${section}: happy-path generate()`,
      false,
      err instanceof Error ? err.message : String(err),
    );
  }

  // ── 401 ─────────────────────────────────────────────────────────────
  try {
    await withMocks(
      [
        {
          method: "POST",
          url: spec.urlMatch,
          respond: {
            status: 401,
            json: { error: { message: "Invalid API key", type: "auth_error" } },
          },
        },
      ],
      async () => {
        const nl = new NeuroLink({ conversationMemory: { enabled: false } });
        try {
          await nl.generate({
            provider: spec.provider,
            model: spec.model,
            input: { text: "ping" },
            disableTools: true,
          });
          record(
            results,
            `${section}: 401 surfaces friendly error`,
            false,
            "no error thrown",
          );
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          record(
            results,
            `${section}: 401 surfaces friendly error`,
            spec.authErrorMatch.test(msg),
            `msg='${msg.slice(0, 120)}'`,
          );
        }
      },
    );
  } catch (err) {
    record(
      results,
      `${section}: 401 surfaces friendly error`,
      false,
      err instanceof Error ? err.message : String(err),
    );
  }

  // ── 429 (only for specs that opt in) ───────────────────────────────
  if (spec.rateLimitErrorMatch) {
    try {
      await withMocks(
        [
          {
            method: "POST",
            url: spec.urlMatch,
            respond: {
              status: 429,
              json: {
                error: {
                  message: "Rate limit exceeded",
                  type: "rate_limit_error",
                },
              },
            },
          },
        ],
        async () => {
          const nl = new NeuroLink({ conversationMemory: { enabled: false } });
          try {
            await nl.generate({
              provider: spec.provider,
              model: spec.model,
              input: { text: "ping" },
              disableTools: true,
            });
            record(
              results,
              `${section}: 429 surfaces friendly error`,
              false,
              "no error thrown",
            );
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            record(
              results,
              `${section}: 429 surfaces friendly error`,
              spec.rateLimitErrorMatch!.test(msg),
              `msg='${msg.slice(0, 120)}'`,
            );
          }
        },
      );
    } catch (err) {
      record(
        results,
        `${section}: 429 surfaces friendly error`,
        false,
        err instanceof Error ? err.message : String(err),
      );
    }
  }
}

async function runOpenAICompatSection(): Promise<void> {
  console.log(
    "\n=== LLM OpenAI-compat (xAI/Groq/Together/Fireworks/Perplexity/Cohere/Cloudflare) ===",
  );
  const specs = await buildOpenAICompatProviders();
  for (const spec of specs) {
    await runOpenAICompatProvider(spec);
  }
}

// ───────────────────────────────────────────────────────────────────────
// Section: LiteLLM generate() over the SSE wire
// (useStreamingWireForGenerate: doGenerate sends stream:true, aggregates
//  the SSE into the same complete result the JSON wire yields — the fix
//  for tunnel idle timeouts killing slow non-streaming completions.)
// ───────────────────────────────────────────────────────────────────────

function sseBody(chunks: unknown[]): string {
  return (
    chunks.map((c) => `data: ${JSON.stringify(c)}\n\n`).join("") +
    "data: [DONE]\n\n"
  );
}

async function runLiteLLMSSESection(): Promise<void> {
  console.log("\n=== LLM litellm (generate over SSE wire) ===");
  const section = "LLM litellm";

  setEnv("LITELLM_API_KEY", "test-fake-litellm-credential");
  // Non-default port so a real proxy on localhost:4000 can never absorb a
  // call the mock table should have caught.
  setEnv("LITELLM_BASE_URL", "http://127.0.0.1:4009");
  setEnv("NEUROLINK_LITELLM_SSE_GENERATE", undefined);

  const { NeuroLink } = await import("../dist/index.js");

  // ensureModelLimits fires GET /model/info before generation.
  const modelInfoRoute = {
    method: "GET",
    url: "127.0.0.1:4009/model/info",
    respond: { status: 200, json: { data: [] } },
  };

  // ── Happy path: stream:true on the wire, multi-chunk text aggregates ──
  try {
    await withMocks(
      [
        modelInfoRoute,
        {
          method: "POST",
          url: "127.0.0.1:4009/chat/completions",
          respond: {
            status: 200,
            contentType: "text/event-stream",
            text: sseBody([
              {
                id: "chatcmpl-sse-1",
                model: "qwen-mock",
                choices: [
                  {
                    index: 0,
                    delta: { role: "assistant", content: "po" },
                    finish_reason: null,
                  },
                ],
              },
              {
                choices: [
                  { index: 0, delta: { content: "ng" }, finish_reason: null },
                ],
              },
              { choices: [{ index: 0, delta: {}, finish_reason: "stop" }] },
              {
                choices: [],
                usage: {
                  prompt_tokens: 7,
                  completion_tokens: 2,
                  total_tokens: 9,
                },
              },
            ]),
          },
        },
      ],
      async ({ calls }) => {
        const nl = new NeuroLink({ conversationMemory: { enabled: false } });
        const result = await nl.generate({
          provider: "litellm",
          model: "qwen-mock",
          input: { text: "ping" },
          disableTools: true,
        });
        const chat = calls.find((c) => c.url.includes("/chat/completions"));
        expect(chat !== undefined, "chat/completions call captured");
        const body = (chat?.bodyJson ?? {}) as {
          stream?: boolean;
          stream_options?: { include_usage?: boolean };
        };
        expectEq(body.stream, true, "wire body stream flag");
        expectEq(
          body.stream_options?.include_usage,
          true,
          "stream_options.include_usage",
        );
        expectEq(result.content, "pong", "aggregated content");
        expectEq(result.usage?.input, 7, "usage input tokens");
        expectEq(result.usage?.output, 2, "usage output tokens");
      },
    );
    record(results, `${section}: generate() rides the SSE wire`, true);
  } catch (err) {
    record(
      results,
      `${section}: generate() rides the SSE wire`,
      false,
      String(err),
    );
  }

  // ── Schema-bound generate: structuredData coerced from streamed text ──
  try {
    await withMocks(
      [
        modelInfoRoute,
        {
          method: "POST",
          url: "127.0.0.1:4009/chat/completions",
          respond: {
            status: 200,
            contentType: "text/event-stream",
            text: sseBody([
              {
                choices: [
                  {
                    index: 0,
                    delta: { role: "assistant", content: '{"answer":' },
                    finish_reason: null,
                  },
                ],
              },
              {
                choices: [
                  {
                    index: 0,
                    delta: { content: '"42"}' },
                    finish_reason: null,
                  },
                ],
              },
              { choices: [{ index: 0, delta: {}, finish_reason: "stop" }] },
            ]),
          },
        },
      ],
      async () => {
        const { z } = await import("zod");
        const nl = new NeuroLink({ conversationMemory: { enabled: false } });
        const result = await nl.generate({
          provider: "litellm",
          model: "qwen-mock",
          input: { text: "answer in json" },
          schema: z.object({ answer: z.string() }),
          disableTools: true,
        });
        const structured = result.structuredData as
          | { answer?: string }
          | undefined;
        expectEq(structured?.answer, "42", "structuredData.answer");
      },
    );
    record(results, `${section}: schema-bound SSE yields structuredData`, true);
  } catch (err) {
    record(
      results,
      `${section}: schema-bound SSE yields structuredData`,
      false,
      String(err),
    );
  }

  // ── Backend that rejects streaming: one retry on the plain JSON wire ──
  try {
    await withMocks(
      [
        modelInfoRoute,
        {
          method: "POST",
          url: "127.0.0.1:4009/chat/completions",
          respond: (call) => {
            const body = call.bodyJson as { stream?: boolean };
            if (body.stream) {
              return {
                status: 400,
                json: {
                  error: { message: "stream is not supported for this model" },
                },
              };
            }
            return {
              status: 200,
              json: openAIChatResponse("pong", "qwen-mock"),
            };
          },
        },
      ],
      async ({ calls }) => {
        const nl = new NeuroLink({ conversationMemory: { enabled: false } });
        const result = await nl.generate({
          provider: "litellm",
          model: "qwen-mock",
          input: { text: "ping" },
          disableTools: true,
        });
        expectEq(result.content, "pong", "content after JSON-wire retry");
        const chatCalls = calls.filter((c) =>
          c.url.includes("/chat/completions"),
        );
        expectEq(chatCalls.length, 2, "streamed attempt + JSON-wire retry");
        const retryBody = (chatCalls[1]?.bodyJson ?? {}) as {
          stream?: boolean;
          stream_options?: unknown;
        };
        expectEq(retryBody.stream, undefined, "retry body has no stream flag");
        expectEq(
          retryBody.stream_options,
          undefined,
          "retry body has no stream_options",
        );
      },
    );
    record(results, `${section}: stream-rejecting backend falls back`, true);
  } catch (err) {
    record(
      results,
      `${section}: stream-rejecting backend falls back`,
      false,
      String(err),
    );
  }

  // ── Escape hatch: NEUROLINK_LITELLM_SSE_GENERATE=false → JSON wire ──
  try {
    setEnv("NEUROLINK_LITELLM_SSE_GENERATE", "false");
    await withMocks(
      [
        modelInfoRoute,
        {
          method: "POST",
          url: "127.0.0.1:4009/chat/completions",
          respond: {
            status: 200,
            json: openAIChatResponse("pong", "qwen-mock"),
          },
        },
      ],
      async ({ calls }) => {
        const nl = new NeuroLink({ conversationMemory: { enabled: false } });
        const result = await nl.generate({
          provider: "litellm",
          model: "qwen-mock",
          input: { text: "ping" },
          disableTools: true,
        });
        const chat = calls.find((c) => c.url.includes("/chat/completions"));
        const body = (chat?.bodyJson ?? {}) as { stream?: boolean };
        expectEq(body.stream, undefined, "escape hatch restores JSON wire");
        expectEq(result.content, "pong", "JSON-wire content");
      },
    );
    record(results, `${section}: SSE escape hatch restores JSON wire`, true);
  } catch (err) {
    record(
      results,
      `${section}: SSE escape hatch restores JSON wire`,
      false,
      String(err),
    );
  } finally {
    setEnv("NEUROLINK_LITELLM_SSE_GENERATE", undefined);
  }
}

// ───────────────────────────────────────────────────────────────────────
// Section: Replicate LLM (predict-then-poll via /v1/models/{model}/predictions)
// ───────────────────────────────────────────────────────────────────────

async function runReplicateLLMSection(): Promise<void> {
  console.log("\n=== LLM replicate (predict-then-poll) ===");
  const section = "LLM replicate";

  const fakeKey = "test-fake-replicate-credential";
  setEnv("REPLICATE_API_TOKEN", fakeKey);

  const { NeuroLink } = await import("../dist/index.js");

  // ── Happy path ──────────────────────────────────────────────────────
  try {
    await withMocks(
      [
        {
          method: "POST",
          url: "api.replicate.com/v1/models/meta/meta-llama-3-70b-instruct/predictions",
          respond: {
            status: 200,
            json: {
              id: "pred-mock-llm",
              status: "succeeded",
              output: ["pong"],
            },
          },
        },
      ],
      async ({ calls }) => {
        const nl = new NeuroLink({ conversationMemory: { enabled: false } });
        const result = await nl.stream({
          provider: "replicate",
          model: "meta/meta-llama-3-70b-instruct",
          input: { text: "ping" },
          disableTools: true,
        });
        let collected = "";
        for await (const chunk of result.stream) {
          if ("content" in chunk && chunk.content) {
            collected += chunk.content;
          }
        }

        expect(calls.length > 0, "at least one fetch call captured");
        const call = calls[0];
        expect(
          call.url.includes(
            "api.replicate.com/v1/models/meta/meta-llama-3-70b-instruct/predictions",
          ),
          `URL is /v1/models/{model}/predictions (got ${call.url})`,
        );
        expectEq(call.method, "POST", "request method");
        expectEq(
          call.headers["authorization"],
          `Token ${fakeKey}`,
          "Authorization header (Token, not Bearer)",
        );
        expectEq(call.headers["prefer"], "wait=60", "Prefer: wait=60 header");
        const body = call.bodyJson as { input: { prompt: string } };
        expect(typeof body.input === "object", "body.input is object");
        expect(
          typeof body.input.prompt === "string" &&
            body.input.prompt.includes("ping"),
          `body.input.prompt includes 'ping' (got ${body.input.prompt?.slice(0, 80)})`,
        );

        expect(
          collected.toLowerCase().includes("pong"),
          `streamed content includes 'pong' (got ${JSON.stringify(collected.slice(0, 100))})`,
        );
        record(
          results,
          `${section}: happy-path stream() (Prefer:wait=60 fast path)`,
          true,
        );
      },
    );
  } catch (err) {
    record(
      results,
      `${section}: happy-path stream() (Prefer:wait=60 fast path)`,
      false,
      err instanceof Error ? err.message : String(err),
    );
  }

  // ── 401 ─────────────────────────────────────────────────────────────
  try {
    await withMocks(
      [
        {
          method: "POST",
          url: "api.replicate.com/v1/models/meta/meta-llama-3-70b-instruct/predictions",
          respond: {
            status: 401,
            json: { detail: "Invalid API token" },
          },
        },
      ],
      async () => {
        const nl = new NeuroLink({ conversationMemory: { enabled: false } });
        try {
          const r = await nl.stream({
            provider: "replicate",
            model: "meta/meta-llama-3-70b-instruct",
            input: { text: "ping" },
            disableTools: true,
          });
          // The stream may need to be consumed before the error surfaces.
          for await (const _chunk of r.stream) {
            // ignore
          }
          record(
            results,
            `${section}: 401 surfaces friendly error`,
            false,
            "no error thrown",
          );
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          record(
            results,
            `${section}: 401 surfaces friendly error`,
            /replicate|401|unauthor|invalid.*token|api token/i.test(msg),
            `msg='${msg.slice(0, 140)}'`,
          );
        }
      },
    );
  } catch (err) {
    record(
      results,
      `${section}: 401 surfaces friendly error`,
      false,
      err instanceof Error ? err.message : String(err),
    );
  }

  // ── Poll path: initial status=starting, then succeeded ─────────────
  try {
    let pollCount = 0;
    await withMocks(
      [
        {
          method: "POST",
          url: "api.replicate.com/v1/models/meta/meta-llama-3-70b-instruct/predictions",
          respond: {
            status: 200,
            json: {
              id: "pred-mock-poll",
              status: "starting",
              urls: {
                get: "https://api.replicate.com/v1/predictions/pred-mock-poll",
              },
            },
          },
        },
        {
          method: "GET",
          url: "api.replicate.com/v1/predictions/pred-mock-poll",
          respond: () => {
            pollCount += 1;
            if (pollCount < 2) {
              return {
                status: 200,
                json: {
                  id: "pred-mock-poll",
                  status: "processing",
                },
              };
            }
            return {
              status: 200,
              json: {
                id: "pred-mock-poll",
                status: "succeeded",
                output: ["delayed-pong"],
              },
            };
          },
        },
      ],
      async () => {
        const nl = new NeuroLink({ conversationMemory: { enabled: false } });
        const r = await nl.stream({
          provider: "replicate",
          model: "meta/meta-llama-3-70b-instruct",
          input: { text: "ping" },
          disableTools: true,
        });
        let collected = "";
        for await (const chunk of r.stream) {
          if ("content" in chunk && chunk.content) {
            collected += chunk.content;
          }
        }
        record(
          results,
          `${section}: poll path completes after status transitions`,
          collected.includes("delayed-pong") && pollCount >= 2,
          `polls=${pollCount} content='${collected.slice(0, 80)}'`,
        );
      },
    );
  } catch (err) {
    record(
      results,
      `${section}: poll path completes after status transitions`,
      false,
      err instanceof Error ? err.message : String(err),
    );
  }
}

// ───────────────────────────────────────────────────────────────────────
// Section: Voyage + Jina (embedding-only)
// ───────────────────────────────────────────────────────────────────────

type EmbeddingSpec = {
  provider: string;
  envVar: string;
  urlMatch: string;
  model: string;
  vectorDimension: number;
  authErrorMatch: RegExp;
};

const EMBEDDING_PROVIDERS: EmbeddingSpec[] = [
  {
    provider: "voyage",
    envVar: "VOYAGE_API_KEY",
    urlMatch: "api.voyageai.com/v1/embeddings",
    model: "voyage-3.5",
    vectorDimension: 1024,
    authErrorMatch: /voyage|401|unauthor|api key/i,
  },
  {
    provider: "jina",
    envVar: "JINA_API_KEY",
    urlMatch: "api.jina.ai/v1/embeddings",
    model: "jina-embeddings-v3",
    vectorDimension: 1024,
    authErrorMatch: /jina|401|unauthor|api key/i,
  },
];

function fakeEmbeddingResponse(
  model: string,
  dim: number,
  count: number,
): unknown {
  const vector = Array.from({ length: dim }, (_, i) => (i % 5) * 0.01);
  return {
    object: "list",
    model,
    data: Array.from({ length: count }, (_, idx) => ({
      object: "embedding",
      index: idx,
      embedding: vector,
    })),
    usage: { prompt_tokens: 10, total_tokens: 10 },
  };
}

async function runEmbeddingProvider(spec: EmbeddingSpec): Promise<void> {
  const section = `EMBED ${spec.provider}`;
  const fakeKey = `test-fake-${spec.provider}-credential`;
  setEnv(spec.envVar, fakeKey);

  const { ProviderFactory } =
    await import("../dist/factories/providerFactory.js");

  // ── embed() happy path ──────────────────────────────────────────────
  try {
    await withMocks(
      [
        {
          method: "POST",
          url: spec.urlMatch,
          respond: {
            status: 200,
            json: fakeEmbeddingResponse(spec.model, spec.vectorDimension, 1),
          },
        },
      ],
      async ({ calls }) => {
        const provider = (await ProviderFactory.createProvider(
          spec.provider,
          spec.model,
        )) as unknown as { embed: (s: string) => Promise<number[]> };
        const vector = await provider.embed("hello world");

        expect(calls.length === 1, "exactly one POST captured");
        const call = calls[0];
        expectEq(call.method, "POST", "request method");
        expect(
          call.url.includes(spec.urlMatch),
          `URL contains '${spec.urlMatch}' (got ${call.url})`,
        );
        expect(
          (call.headers["authorization"] ?? "").startsWith(`Bearer ${fakeKey}`),
          `Authorization: Bearer ${fakeKey.slice(0, 16)}...`,
        );
        const body = call.bodyJson as { input: string[]; model: string };
        expectEq(body.model, spec.model, "body.model");
        expect(
          Array.isArray(body.input) && body.input[0] === "hello world",
          `body.input includes 'hello world' (got ${JSON.stringify(body.input)})`,
        );

        expect(Array.isArray(vector), "embed() returns array");
        expectEq(
          vector.length,
          spec.vectorDimension,
          `vector dimension = ${spec.vectorDimension}`,
        );
        record(results, `${section}: embed() happy path`, true);
      },
    );
  } catch (err) {
    record(
      results,
      `${section}: embed() happy path`,
      false,
      err instanceof Error ? err.message : String(err),
    );
  }

  // ── embedMany() batch ───────────────────────────────────────────────
  try {
    await withMocks(
      [
        {
          method: "POST",
          url: spec.urlMatch,
          respond: {
            status: 200,
            json: fakeEmbeddingResponse(spec.model, spec.vectorDimension, 3),
          },
        },
      ],
      async ({ calls }) => {
        const provider = (await ProviderFactory.createProvider(
          spec.provider,
          spec.model,
        )) as unknown as {
          embedMany: (texts: string[]) => Promise<number[][]>;
        };
        const vectors = await provider.embedMany(["a", "b", "c"]);

        const call = calls[0];
        const body = call.bodyJson as { input: string[] };
        expectEq(body.input.length, 3, "batched input length");

        expect(Array.isArray(vectors), "embedMany() returns array");
        expectEq(vectors.length, 3, "batched output length");
        expectEq(
          vectors[0].length,
          spec.vectorDimension,
          `vector dimension = ${spec.vectorDimension}`,
        );
        record(results, `${section}: embedMany() batch`, true);
      },
    );
  } catch (err) {
    record(
      results,
      `${section}: embedMany() batch`,
      false,
      err instanceof Error ? err.message : String(err),
    );
  }

  // ── 401 ─────────────────────────────────────────────────────────────
  try {
    await withMocks(
      [
        {
          method: "POST",
          url: spec.urlMatch,
          respond: {
            status: 401,
            json: { error: "Invalid API key" },
          },
        },
      ],
      async () => {
        const provider = (await ProviderFactory.createProvider(
          spec.provider,
          spec.model,
        )) as unknown as { embed: (s: string) => Promise<number[]> };
        try {
          await provider.embed("hi");
          record(
            results,
            `${section}: 401 surfaces friendly error`,
            false,
            "no error thrown",
          );
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          record(
            results,
            `${section}: 401 surfaces friendly error`,
            spec.authErrorMatch.test(msg),
            `msg='${msg.slice(0, 140)}'`,
          );
        }
      },
    );
  } catch (err) {
    record(
      results,
      `${section}: 401 surfaces friendly error`,
      false,
      err instanceof Error ? err.message : String(err),
    );
  }
}

async function runEmbeddingsSection(): Promise<void> {
  console.log("\n=== Embedding-only providers (Voyage / Jina) ===");
  for (const spec of EMBEDDING_PROVIDERS) {
    await runEmbeddingProvider(spec);
  }

  // ── Jina rerank — extra method beyond BaseProvider ──────────────────
  setEnv("JINA_API_KEY", "mock-jina-key-rerank-1234");
  try {
    await withMocks(
      [
        {
          method: "POST",
          url: "api.jina.ai/v1/rerank",
          respond: {
            status: 200,
            json: {
              model: "jina-reranker-v2-base-multilingual",
              usage: { total_tokens: 50 },
              results: [
                { index: 1, relevance_score: 0.92, document: { text: "doc2" } },
                { index: 0, relevance_score: 0.71, document: { text: "doc1" } },
                { index: 2, relevance_score: 0.33, document: { text: "doc3" } },
              ],
            },
          },
        },
      ],
      async ({ calls }) => {
        const { ProviderFactory } =
          await import("../dist/factories/providerFactory.js");
        const provider = (await ProviderFactory.createProvider(
          "jina",
          "jina-embeddings-v3",
        )) as unknown as {
          rerank: (
            query: string,
            docs: string[],
          ) => Promise<{ index: number; score: number; document: string }[]>;
        };
        const reranked = await provider.rerank("ping", [
          "doc1",
          "doc2",
          "doc3",
        ]);
        expect(calls.length === 1, "single POST to /rerank");
        const body = calls[0].bodyJson as {
          query: string;
          documents: string[];
        };
        expectEq(body.query, "ping", "rerank body.query");
        expectEq(body.documents.length, 3, "rerank body.documents.length");
        expect(Array.isArray(reranked), "rerank() returns array");
        expectEq(reranked.length, 3, "rerank result length");
        expect(
          reranked[0].score >= reranked[1].score,
          `rerank sorted desc by score (got [${reranked.map((r) => r.score).join(", ")}])`,
        );
        record(results, "EMBED jina: rerank() happy path + sort", true);
      },
    );
  } catch (err) {
    record(
      results,
      "EMBED jina: rerank() happy path + sort",
      false,
      err instanceof Error ? err.message : String(err),
    );
  }
}

// ───────────────────────────────────────────────────────────────────────
// Section: Stability / Ideogram / Recraft (image-gen-only)
// ───────────────────────────────────────────────────────────────────────

// A trivially-small 1×1 transparent PNG (89 50 4E 47 ... ftyp). Useful as
// the fake binary payload returned by Ideogram's CDN URL download step.
const FAKE_PNG_BYTES = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49,
  0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06,
  0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x44,
  0x41, 0x54, 0x78, 0x9c, 0x63, 0xf8, 0xcf, 0xc0, 0x00, 0x00, 0x00, 0x03, 0x00,
  0x01, 0x38, 0xd5, 0x0b, 0x50, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44,
  0xae, 0x42, 0x60, 0x82,
]);
const FAKE_PNG_BASE64 = Buffer.from(FAKE_PNG_BYTES).toString("base64");

async function runStabilityImageGen(): Promise<void> {
  const section = "IMG stability";
  const fakeKey = "test-fake-stability-credential";
  setEnv("STABILITY_API_KEY", fakeKey);

  const { NeuroLink } = await import("../dist/index.js");

  // ── happy path ──────────────────────────────────────────────────────
  try {
    await withMocks(
      [
        {
          method: "POST",
          url: "api.stability.ai/v2beta/stable-image/generate/core",
          respond: {
            status: 200,
            json: { image: FAKE_PNG_BASE64, finish_reason: "SUCCESS" },
          },
        },
      ],
      async ({ calls }) => {
        const nl = new NeuroLink({ conversationMemory: { enabled: false } });
        const result = await nl.generate({
          provider: "stability",
          model: "stable-image-core",
          input: { text: "A red panda eating bamboo" },
          disableTools: true,
        });
        expect(calls.length === 1, "single POST captured");
        const call = calls[0];
        expectEq(call.method, "POST", "method");
        // SDK maps `stable-image-core` → URL slug `core` (see stability.ts).
        expect(
          call.url.includes("/v2beta/stable-image/generate/core"),
          `URL is /v2beta/stable-image/generate/core (got ${call.url})`,
        );
        expect(
          (call.headers["authorization"] ?? "").startsWith(`Bearer ${fakeKey}`),
          "Authorization: Bearer ...",
        );
        expect(
          !!result.imageOutput?.base64,
          "result.imageOutput.base64 populated",
        );
        expectEq(
          result.imageOutput?.base64,
          FAKE_PNG_BASE64,
          "imageOutput.base64 matches mock",
        );
        record(
          results,
          `${section}: happy-path nl.generate() returns base64 PNG`,
          true,
        );
      },
    );
  } catch (err) {
    record(
      results,
      `${section}: happy-path nl.generate() returns base64 PNG`,
      false,
      err instanceof Error ? err.message : String(err),
    );
  }

  // ── 401 ─────────────────────────────────────────────────────────────
  try {
    await withMocks(
      [
        {
          method: "POST",
          url: "api.stability.ai/v2beta/stable-image/generate/core",
          respond: { status: 401, json: { errors: ["unauthorized"] } },
        },
      ],
      async () => {
        const nl = new NeuroLink({ conversationMemory: { enabled: false } });
        try {
          await nl.generate({
            provider: "stability",
            model: "stable-image-core",
            input: { text: "test" },
            disableTools: true,
          });
          record(
            results,
            `${section}: 401 surfaces friendly error`,
            false,
            "no error thrown",
          );
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          record(
            results,
            `${section}: 401 surfaces friendly error`,
            /stability|401|unauthor|api key/i.test(msg),
            `msg='${msg.slice(0, 140)}'`,
          );
        }
      },
    );
  } catch (err) {
    record(
      results,
      `${section}: 401 surfaces friendly error`,
      false,
      err instanceof Error ? err.message : String(err),
    );
  }
}

async function runIdeogramImageGen(): Promise<void> {
  const section = "IMG ideogram";
  const fakeKey = "test-fake-ideogram-credential";
  setEnv("IDEOGRAM_API_KEY", fakeKey);

  const { NeuroLink } = await import("../dist/index.js");

  // ── happy path ──────────────────────────────────────────────────────
  try {
    await withMocks(
      [
        {
          method: "POST",
          url: "api.ideogram.ai/v1/ideogram-v3/generate",
          respond: {
            status: 200,
            json: {
              data: [{ url: "https://mock-ideogram-cdn.test/image.png" }],
            },
          },
        },
        {
          method: "GET",
          url: "mock-ideogram-cdn.test/image.png",
          respond: {
            status: 200,
            bytes: FAKE_PNG_BYTES,
            contentType: "image/png",
          },
        },
      ],
      async ({ calls }) => {
        const nl = new NeuroLink({ conversationMemory: { enabled: false } });
        const result = await nl.generate({
          provider: "ideogram",
          model: "V_3",
          input: { text: "A vintage poster" },
          disableTools: true,
        });
        expect(calls.length >= 2, `POST + GET captured (got ${calls.length})`);
        const post = calls.find((c) => c.method === "POST");
        const get = calls.find((c) => c.method === "GET");
        expect(!!post, "POST call present");
        expect(!!get, "GET call (CDN download) present");
        expect(
          post?.url.includes("api.ideogram.ai/v1/ideogram-v3/generate") ===
            true,
          "POST URL is /api/v1/ideogram-v3/generate",
        );
        expectEq(
          post?.headers["api-key"],
          fakeKey,
          "Api-Key header (not Bearer)",
        );
        const body = post?.bodyJson as {
          prompt: string;
          model: string;
          magic_prompt: string;
        };
        expectEq(body.model, "V_3", "body.model");
        expect(typeof body.magic_prompt === "string", "body.magic_prompt set");
        expect(
          !!result.imageOutput?.base64,
          "result.imageOutput.base64 populated after CDN download",
        );
        expectEq(
          result.imageOutput?.base64,
          FAKE_PNG_BASE64,
          "imageOutput.base64 matches downloaded PNG",
        );
        record(results, `${section}: happy-path generate+CDN download`, true);
      },
    );
  } catch (err) {
    record(
      results,
      `${section}: happy-path generate+CDN download`,
      false,
      err instanceof Error ? err.message : String(err),
    );
  }

  // ── 401 ─────────────────────────────────────────────────────────────
  try {
    await withMocks(
      [
        {
          method: "POST",
          url: "api.ideogram.ai/v1/ideogram-v3/generate",
          respond: { status: 401, json: { error: "Invalid Api-Key" } },
        },
      ],
      async () => {
        const nl = new NeuroLink({ conversationMemory: { enabled: false } });
        try {
          await nl.generate({
            provider: "ideogram",
            model: "V_3",
            input: { text: "test" },
            disableTools: true,
          });
          record(
            results,
            `${section}: 401 surfaces friendly error`,
            false,
            "no error thrown",
          );
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          record(
            results,
            `${section}: 401 surfaces friendly error`,
            /ideogram|401|unauthor|api key/i.test(msg),
            `msg='${msg.slice(0, 140)}'`,
          );
        }
      },
    );
  } catch (err) {
    record(
      results,
      `${section}: 401 surfaces friendly error`,
      false,
      err instanceof Error ? err.message : String(err),
    );
  }
}

async function runRecraftImageGen(): Promise<void> {
  const section = "IMG recraft";
  const fakeKey = "test-fake-recraft-credential";
  setEnv("RECRAFT_API_KEY", fakeKey);

  const { NeuroLink } = await import("../dist/index.js");

  // ── happy path ──────────────────────────────────────────────────────
  try {
    await withMocks(
      [
        {
          method: "POST",
          url: "external.api.recraft.ai/v1/images/generations",
          respond: {
            status: 200,
            json: { data: [{ b64_json: FAKE_PNG_BASE64 }] },
          },
        },
      ],
      async ({ calls }) => {
        const nl = new NeuroLink({ conversationMemory: { enabled: false } });
        const result = await nl.generate({
          provider: "recraft",
          model: "recraftv3",
          input: { text: "An icon set in flat style" },
          disableTools: true,
        });
        expect(calls.length === 1, "single POST captured");
        const call = calls[0];
        expect(
          call.url.includes("external.api.recraft.ai/v1/images/generations"),
          `URL is /v1/images/generations (got ${call.url})`,
        );
        expect(
          (call.headers["authorization"] ?? "").startsWith(`Bearer ${fakeKey}`),
          "Authorization: Bearer ...",
        );
        const body = call.bodyJson as {
          model: string;
          prompt: string;
          response_format: string;
        };
        expectEq(body.model, "recraftv3", "body.model");
        expectEq(
          body.response_format,
          "b64_json",
          "body.response_format = b64_json",
        );
        expectEq(
          result.imageOutput?.base64,
          FAKE_PNG_BASE64,
          "imageOutput.base64 matches mock",
        );
        record(
          results,
          `${section}: happy-path nl.generate() returns base64 PNG`,
          true,
        );
      },
    );
  } catch (err) {
    record(
      results,
      `${section}: happy-path nl.generate() returns base64 PNG`,
      false,
      err instanceof Error ? err.message : String(err),
    );
  }

  // ── 401 ─────────────────────────────────────────────────────────────
  try {
    await withMocks(
      [
        {
          method: "POST",
          url: "external.api.recraft.ai/v1/images/generations",
          respond: { status: 401, json: { detail: "Unauthorized" } },
        },
      ],
      async () => {
        const nl = new NeuroLink({ conversationMemory: { enabled: false } });
        try {
          await nl.generate({
            provider: "recraft",
            model: "recraftv3",
            input: { text: "test" },
            disableTools: true,
          });
          record(
            results,
            `${section}: 401 surfaces friendly error`,
            false,
            "no error thrown",
          );
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          record(
            results,
            `${section}: 401 surfaces friendly error`,
            /recraft|401|unauthor|api key/i.test(msg),
            `msg='${msg.slice(0, 140)}'`,
          );
        }
      },
    );
  } catch (err) {
    record(
      results,
      `${section}: 401 surfaces friendly error`,
      false,
      err instanceof Error ? err.message : String(err),
    );
  }
}

async function runImageGenSection(): Promise<void> {
  console.log("\n=== Image-gen providers (Stability / Ideogram / Recraft) ===");
  await runStabilityImageGen();
  await runIdeogramImageGen();
  await runRecraftImageGen();
}

// ───────────────────────────────────────────────────────────────────────
// Section: OpenAI (native client — the base OpenAIChatCompletionsProvider
// whose defaults every OpenAI-compat provider above inherits, so it gets
// its own bespoke section rather than joining OPENAI_COMPAT_PROVIDERS)
// ───────────────────────────────────────────────────────────────────────

async function runOpenAISection(): Promise<void> {
  const section = "LLM openai";
  console.log(`\n=== ${section} ===`);
  const fakeKey = "test-fake-openai-credential";
  const model = "gpt-4o-mini";
  setEnv("OPENAI_API_KEY", fakeKey);
  // Pin every env var resolveOpenAIBaseURL() consults so an ambient
  // OPENAI_BASE_URL in the running shell/CI can't reroute this section away
  // from the api.openai.com mock and cause a "[mockFetch] No route matched".
  setEnv("OPENAI_BASE_URL", undefined);

  const { NeuroLink } = await import("../dist/index.js");

  // ── Happy path ──────────────────────────────────────────────────────
  try {
    await withMocks(
      [
        {
          method: "POST",
          url: "api.openai.com/v1/chat/completions",
          respond: { status: 200, json: openAIChatResponse("pong", model) },
        },
      ],
      async ({ calls }) => {
        const nl = new NeuroLink({ conversationMemory: { enabled: false } });
        const result = await nl.generate({
          provider: "openai",
          model,
          input: { text: "ping" },
          disableTools: true,
        });

        expect(calls.length > 0, "at least one fetch call captured");
        const call = calls[0];
        expect(
          call.url.includes("api.openai.com/v1/chat/completions"),
          `URL contains 'api.openai.com/v1/chat/completions' (got ${call.url})`,
        );
        expectEq(call.method, "POST", "request method");
        expect(
          (call.headers["authorization"] ?? "").startsWith(`Bearer ${fakeKey}`),
          `Authorization header starts with 'Bearer ${fakeKey.slice(0, 12)}...'`,
        );
        const body = call.bodyJson as { model: string; messages: unknown[] };
        expect(typeof body === "object", "body is JSON object");
        expectEq(body.model, model, "body.model");
        expect(Array.isArray(body.messages), "body.messages is array");

        expect(
          (result.content ?? "").toLowerCase().includes("pong"),
          `response content includes 'pong' (got ${JSON.stringify(result.content?.slice(0, 100))})`,
        );
        record(results, `${section}: happy-path generate()`, true);
      },
    );
  } catch (err) {
    record(
      results,
      `${section}: happy-path generate()`,
      false,
      err instanceof Error ? err.message : String(err),
    );
  }

  // ── 401 → AuthenticationError (buildAPIError always sets a numeric
  // statusCode, so this classifies via the statusCode branch alone) ──────
  try {
    await withMocks(
      [
        {
          method: "POST",
          url: "api.openai.com/v1/chat/completions",
          respond: {
            status: 401,
            json: {
              error: {
                message: "Invalid API key",
                type: "invalid_request_error",
              },
            },
          },
        },
      ],
      async () => {
        const nl = new NeuroLink({ conversationMemory: { enabled: false } });
        try {
          await nl.generate({
            provider: "openai",
            model,
            input: { text: "ping" },
            disableTools: true,
          });
          record(
            results,
            `${section}: 401 → AuthenticationError`,
            false,
            "no error thrown",
          );
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          record(
            results,
            `${section}: 401 → AuthenticationError`,
            /invalid openai api key|incorrect api key|invalid api key/i.test(
              msg,
            ),
            `msg='${msg.slice(0, 120)}'`,
          );
        }
      },
    );
  } catch (err) {
    record(
      results,
      `${section}: 401 → AuthenticationError`,
      false,
      err instanceof Error ? err.message : String(err),
    );
  }

  // ── 429 → RateLimitError. directProviderGeneration() wraps the final
  // thrown error once the single-provider retry budget is exhausted
  // ("Failed to generate text with all providers. Last error: ..."), so we
  // substring-match the classified inner message rather than the wrapper,
  // which is orchestration-layer text, not part of this provider's contract.
  // ─────────────────────────────────────────────────────────────────────
  try {
    await withMocks(
      [
        {
          method: "POST",
          url: "api.openai.com/v1/chat/completions",
          respond: {
            status: 429,
            json: {
              error: {
                message: "Rate limit reached",
                type: "rate_limit_error",
              },
            },
          },
        },
      ],
      async () => {
        const nl = new NeuroLink({ conversationMemory: { enabled: false } });
        try {
          await nl.generate({
            provider: "openai",
            model,
            input: { text: "ping" },
            disableTools: true,
          });
          record(
            results,
            `${section}: 429 → RateLimitError`,
            false,
            "no error thrown",
          );
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          record(
            results,
            `${section}: 429 → RateLimitError`,
            msg.includes("OpenAI rate limit exceeded. Please try again later."),
            `msg='${msg.slice(0, 120)}'`,
          );
        }
      },
    );
  } catch (err) {
    record(
      results,
      `${section}: 429 → RateLimitError`,
      false,
      err instanceof Error ? err.message : String(err),
    );
  }

  // ── 429 + insufficient_quota. OpenAI reuses 429 for a PERMANENT billing
  // state, so this must not be reported as a rate limit and must not be
  // retried. Two assertions, because the failures are independent: the advice
  // given to the caller, and the work done before giving it.
  // ─────────────────────────────────────────────────────────────────────
  try {
    await withMocks(
      [
        {
          method: "POST",
          url: "api.openai.com/v1/chat/completions",
          respond: {
            status: 429,
            json: {
              error: {
                message:
                  "You exceeded your current quota, please check your plan and billing details.",
                type: "insufficient_quota",
                code: "insufficient_quota",
              },
            },
          },
        },
      ],
      async ({ calls }) => {
        const nl = new NeuroLink({ conversationMemory: { enabled: false } });
        try {
          await nl.generate({
            provider: "openai",
            model,
            input: { text: "ping" },
            disableTools: true,
          });
          record(
            results,
            `${section}: insufficient_quota is not reported as a rate limit`,
            false,
            "no error thrown",
          );
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          record(
            results,
            `${section}: insufficient_quota is not reported as a rate limit`,
            msg.includes("OpenAI quota exhausted") &&
              !msg.includes("rate limit exceeded"),
            `msg='${msg.slice(0, 120)}'`,
          );
        }
        // A permanent condition must cost exactly one upstream call. Before
        // this fix the ladder ran 3 attempts with ~20s of backoff every time.
        record(
          results,
          `${section}: insufficient_quota is not retried`,
          calls.length === 1,
          `upstream attempts=${calls.length}`,
        );
      },
    );
  } catch (err) {
    record(
      results,
      `${section}: insufficient_quota is not reported as a rate limit`,
      false,
      err instanceof Error ? err.message : String(err),
    );
  }

  // ── Guard on the fix above. The quota check keys on the error TYPE, never
  // on the word "quota", because other providers use that word for ordinary
  // throttling — Google's 429 reads "Quota exceeded for quota metric ...".
  // A plain throttle whose MESSAGE mentions a quota must stay retryable; if
  // this regresses, throttling silently stops being retried.
  // ─────────────────────────────────────────────────────────────────────
  try {
    await withMocks(
      [
        {
          method: "POST",
          url: "api.openai.com/v1/chat/completions",
          respond: {
            status: 429,
            json: {
              error: {
                message:
                  "Quota exceeded for quota metric 'requests per minute'",
                type: "rate_limit_error",
              },
            },
          },
        },
      ],
      async ({ calls }) => {
        const nl = new NeuroLink({ conversationMemory: { enabled: false } });
        try {
          await nl.generate({
            provider: "openai",
            model,
            input: { text: "ping" },
            disableTools: true,
          });
        } catch {
          // The error is expected; only the retry count is under test here.
        }
        record(
          results,
          `${section}: a throttle whose text mentions quota is still retried`,
          calls.length > 1,
          `upstream attempts=${calls.length}`,
        );
      },
    );
  } catch (err) {
    record(
      results,
      `${section}: a throttle whose text mentions quota is still retried`,
      false,
      err instanceof Error ? err.message : String(err),
    );
  }

  // ── The streaming path has its OWN withProviderRetry call site
  // (openaiChatCompletionsBase.ts:1438), so a retry fix proven only on the
  // non-streaming path says nothing about it. This pins that it holds there.
  //
  // The classification assertion below used to be weaker, with a note claiming
  // the streaming path never classified anything. That note named the wrong
  // mechanism. What actually happened: BaseProvider.stream() awaits only the
  // CONSTRUCTION of the provider's stream, and a provider that discovers its
  // failure lazily throws on first pull instead — and
  // wrapStreamWithLifecycleCallbacks early-returned the provider's own generator
  // BY REFERENCE whenever no lifecycle callbacks were registered, so no layer
  // downstream ever held a catch it could classify in. That early return is gone
  // and this case now pins the classified message.
  // ─────────────────────────────────────────────────────────────────────
  try {
    await withMocks(
      [
        {
          method: "POST",
          url: "api.openai.com/v1/chat/completions",
          respond: {
            status: 429,
            json: {
              error: {
                message:
                  "You have no credits remaining. Add credits to continue using the API.",
                type: "insufficient_quota",
                code: "credit_balance_exhausted",
              },
            },
          },
        },
      ],
      async ({ calls }) => {
        const nl = new NeuroLink({ conversationMemory: { enabled: false } });
        // null means nothing was thrown, which is itself a failure for this
        // case — a 429 must not stream successfully. Keeping it distinct from
        // a message stops the assertion below passing vacuously on a
        // placeholder string.
        let msg: string | null = null;
        try {
          const r = await nl.stream({
            provider: "openai",
            model,
            input: { text: "ping" },
            disableTools: true,
          });
          // The rejection may surface on the call or on first iteration.
          for await (const chunk of r.stream) {
            void chunk;
          }
        } catch (err) {
          msg = err instanceof Error ? err.message : String(err);
        }
        // The same classified message the non-streaming path produces. This
        // fails against the raw upstream text streaming used to surface.
        record(
          results,
          `${section}: streaming quota error is classified like generate()`,
          msg !== null &&
            msg.includes("OpenAI quota exhausted") &&
            !/rate\s*limit/i.test(msg),
          msg === null ? "no error thrown" : `msg='${msg.slice(0, 120)}'`,
        );
        record(
          results,
          `${section}: streaming insufficient_quota is not retried`,
          calls.length === 1,
          `upstream attempts=${calls.length}`,
        );
      },
    );
  } catch (err) {
    record(
      results,
      `${section}: streaming quota error is classified like generate()`,
      false,
      err instanceof Error ? err.message : String(err),
    );
  }

  // ── Guard on the streaming classification above. Classifying stream errors
  // means running a provider's rule table over whatever escapes the iterator,
  // and classifyProviderError ends in an UNCONDITIONAL catch-all
  // (`if (!rule) return new ProviderError(...)`) that is not gated on the
  // error having come off the wire. Without a status check, an ordinary bug
  // is relabelled as a provider failure and hidden behind a plausible
  // message — measured, with the guard removed:
  //   TypeError "Cannot read properties of undefined (reading 'content')"
  //     became ProviderError "[openai] openai error: Cannot read properties..."
  // This case fails if that guard is ever dropped.
  // ─────────────────────────────────────────────────────────────────────
  try {
    const boom = () => {
      throw new TypeError(
        "Cannot read properties of undefined (reading 'content')",
      );
    };
    const realFetch = globalThis.fetch;
    globalThis.fetch = (async () => boom()) as typeof globalThis.fetch;
    try {
      const nl = new NeuroLink({ conversationMemory: { enabled: false } });
      let name: string | null = null;
      let msg: string | null = null;
      try {
        const r = await nl.stream({
          provider: "openai",
          model,
          input: { text: "ping" },
          disableTools: true,
        });
        for await (const chunk of r.stream) {
          void chunk;
        }
      } catch (err) {
        name = err instanceof Error ? err.constructor.name : typeof err;
        msg = err instanceof Error ? err.message : String(err);
      }
      record(
        results,
        `${section}: a bug with no HTTP status is not relabelled as a provider error`,
        name !== null &&
          name !== "ProviderError" &&
          !/^\[openai\]/.test(msg ?? ""),
        name === null ? "no error thrown" : `surfaced as ${name}`,
      );
    } finally {
      globalThis.fetch = realFetch;
    }
  } catch (err) {
    record(
      results,
      `${section}: a bug with no HTTP status is not relabelled as a provider error`,
      false,
      err instanceof Error ? err.message : String(err),
    );
  }
}

// ───────────────────────────────────────────────────────────────────────
// Section: Azure OpenAI (api-key header, not Bearer; deployment-scoped URL)
// ───────────────────────────────────────────────────────────────────────

async function runAzureSection(): Promise<void> {
  const section = "LLM azure";
  console.log(`\n=== ${section} ===`);
  const fakeKey = "test-fake-azure-credential";
  const deployment = "mock-deployment";
  const resourceOrigin = "https://mock-resource.openai.azure.com";
  setEnv("AZURE_OPENAI_API_KEY", fakeKey);
  setEnv("AZURE_OPENAI_ENDPOINT", resourceOrigin);
  // Pin every other env var the Azure constructor consults so ambient values
  // from the running shell/CI can't change the URL this section expects
  // (AZURE_API_VERSION feeds directly into expectedUrl below) or the
  // deployment fallback chain (harmless here since `model` is passed
  // explicitly, but pinned for defense-in-depth).
  setEnv("AZURE_API_VERSION", undefined);
  setEnv("AZURE_OPENAI_MODEL", undefined);
  setEnv("AZURE_OPENAI_DEPLOYMENT", undefined);
  setEnv("AZURE_OPENAI_DEPLOYMENT_ID", undefined);

  const { NeuroLink } = await import("../dist/index.js");
  const expectedUrl = `${resourceOrigin}/openai/deployments/${deployment}/chat/completions?api-version=2025-04-01-preview`;

  // ── Happy path ──────────────────────────────────────────────────────
  try {
    await withMocks(
      [
        {
          method: "POST",
          url: expectedUrl,
          respond: {
            status: 200,
            json: openAIChatResponse("pong", deployment),
          },
        },
      ],
      async ({ calls }) => {
        const nl = new NeuroLink({ conversationMemory: { enabled: false } });
        const result = await nl.generate({
          provider: "azure",
          model: deployment,
          input: { text: "ping" },
          disableTools: true,
        });

        expect(calls.length > 0, "at least one fetch call captured");
        const call = calls[0];
        expectEq(call.url, expectedUrl, "request URL");
        expectEq(call.method, "POST", "request method");
        expectEq(call.headers["api-key"], fakeKey, "api-key header");
        expect(
          !("authorization" in call.headers),
          "Authorization header must NOT be set (Azure uses api-key)",
        );
        const body = call.bodyJson as { messages: unknown[] };
        expect(Array.isArray(body.messages), "body.messages is array");

        expect(
          (result.content ?? "").toLowerCase().includes("pong"),
          `response content includes 'pong' (got ${JSON.stringify(result.content?.slice(0, 100))})`,
        );
        record(results, `${section}: happy-path generate()`, true);
      },
    );
  } catch (err) {
    record(
      results,
      `${section}: happy-path generate()`,
      false,
      err instanceof Error ? err.message : String(err),
    );
  }

  // ── 401 → AuthenticationError (message.includes("401") substring check).
  // ProviderError's base constructor always prepends "[azure] " to the
  // formatted message, so we substring-match the classification-specific
  // text rather than exact-matching the whole string. ─────────────────────
  try {
    await withMocks(
      [
        {
          method: "POST",
          url: expectedUrl,
          respond: {
            status: 401,
            json: { error: { message: "401 Unauthorized" } },
          },
        },
      ],
      async () => {
        const nl = new NeuroLink({ conversationMemory: { enabled: false } });
        try {
          await nl.generate({
            provider: "azure",
            model: deployment,
            input: { text: "ping" },
            disableTools: true,
          });
          record(
            results,
            `${section}: 401 → AuthenticationError`,
            false,
            "no error thrown",
          );
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          record(
            results,
            `${section}: 401 → AuthenticationError`,
            msg.includes("Invalid Azure OpenAI API key or endpoint."),
            `msg='${msg.slice(0, 120)}'`,
          );
        }
      },
    );
  } catch (err) {
    record(
      results,
      `${section}: 401 → AuthenticationError`,
      false,
      err instanceof Error ? err.message : String(err),
    );
  }

  // ── 429 → RateLimitError (Plan 07 / Task 3 fix). Azure's formatProviderError
  // previously special-cased only "401" and let everything else — including
  // 429 — fall through to one undifferentiated ProviderError. It now appends
  // DEFAULT_ERROR_RULES after its 401 override, so a 429 gets the shared
  // rate-limit classification like every other migrated provider. Also
  // retryable at the orchestration layer (not in NON_RETRYABLE_HTTP_STATUS
  // _CODES), so directProviderGeneration() wraps the final message once the
  // single-provider retry budget exhausts — substring-match the classified
  // inner text, not the wrapper. ────────────────────────────────────────
  try {
    await withMocks(
      [
        {
          method: "POST",
          url: expectedUrl,
          respond: {
            status: 429,
            json: { error: { message: "Rate limit exceeded" } },
          },
        },
      ],
      async () => {
        const nl = new NeuroLink({ conversationMemory: { enabled: false } });
        try {
          await nl.generate({
            provider: "azure",
            model: deployment,
            input: { text: "ping" },
            disableTools: true,
          });
          record(
            results,
            `${section}: 429 → RateLimitError`,
            false,
            "no error thrown",
          );
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          record(
            results,
            `${section}: 429 → RateLimitError`,
            msg.includes("rate limit exceeded"),
            `msg='${msg.slice(0, 120)}'`,
          );
        }
      },
    );
  } catch (err) {
    record(
      results,
      `${section}: 429 → RateLimitError`,
      false,
      err instanceof Error ? err.message : String(err),
    );
  }
}

// ───────────────────────────────────────────────────────────────────────
// Section: Anthropic (x-api-key + anthropic-version headers, not Bearer)
// ───────────────────────────────────────────────────────────────────────

async function runAnthropicSection(): Promise<void> {
  const section = "LLM anthropic";
  // .href, not pathToFileURL(.pathname): URL.pathname is already
  // percent-ENCODED, and pathToFileURL treats its argument as a literal
  // filesystem path and escapes the '%' again. A checkout under a directory
  // containing a space or a '%' therefore yields a URL the child process
  // cannot import — measured: "/Users/foo bar" -> file:///Users/foo%2520bar.
  const distUrl = new URL("../dist/index.js", import.meta.url).href;
  console.log(`\n=== ${section} ===`);
  const fakeKey = "test-fake-anthropic-credential";
  const model = "claude-sonnet-4-6";
  setEnv("ANTHROPIC_API_KEY", fakeKey);
  // Pin every env var the Anthropic client's routing/auth-method resolution
  // consults so ambient state in the running shell/CI can't hijack this
  // section away from the mock:
  //  - ANTHROPIC_BASE_URL: reroutes the SDK to a proxy host entirely (this
  //    exact confound was hit in one sandbox and produced a generic SDK
  //    "Connection error." that masked every assertion below).
  //  - ANTHROPIC_AUTH_METHOD: detectAuthMethod() prefers OAuth over API key
  //    whenever an OAuth token is present; forcing "api_key" here guarantees
  //    the x-api-key header path this section asserts, regardless of any
  //    ambient ANTHROPIC_OAUTH_TOKEN / CLAUDE_OAUTH_TOKEN.
  setEnv("ANTHROPIC_BASE_URL", undefined);
  setEnv("ANTHROPIC_AUTH_METHOD", "api_key");

  const { NeuroLink } = await import("../dist/index.js");

  // ── Happy path ──────────────────────────────────────────────────────
  try {
    await withMocks(
      [
        {
          method: "POST",
          url: "api.anthropic.com/v1/messages",
          respond: {
            status: 200,
            json: anthropicMessageResponse("pong", model),
          },
        },
      ],
      async ({ calls }) => {
        const nl = new NeuroLink({ conversationMemory: { enabled: false } });
        const result = await nl.generate({
          provider: "anthropic",
          model,
          input: { text: "ping" },
          disableTools: true,
        });

        expect(calls.length > 0, "at least one fetch call captured");
        const call = calls[0];
        expect(
          call.url.includes("api.anthropic.com/v1/messages"),
          `URL contains 'api.anthropic.com/v1/messages' (got ${call.url})`,
        );
        expectEq(call.method, "POST", "request method");
        expectEq(call.headers["x-api-key"], fakeKey, "x-api-key header");
        expectEq(
          call.headers["anthropic-version"],
          "2023-06-01",
          "anthropic-version header",
        );
        expect(
          !("authorization" in call.headers),
          "Authorization header must NOT be set (Anthropic uses x-api-key)",
        );
        const body = call.bodyJson as { model: string; messages: unknown[] };
        expectEq(body.model, model, "body.model");
        expect(Array.isArray(body.messages), "body.messages is array");

        expect(
          (result.content ?? "").toLowerCase().includes("pong"),
          `response content includes 'pong' (got ${JSON.stringify(result.content?.slice(0, 100))})`,
        );
        record(results, `${section}: happy-path generate()`, true);
      },
    );
  } catch (err) {
    record(
      results,
      `${section}: happy-path generate()`,
      false,
      err instanceof Error ? err.message : String(err),
    );
  }

  // ── 401 → AuthenticationError. Previously a documented gap: the auth
  // branch only matched "API_KEY_INVALID" / "Invalid API key" substrings,
  // and the SDK's real 401 message is "401 <body message>", which matches
  // neither — this test used to pin the resulting generic-ProviderError
  // misclassification. Task 4's classifyProviderError migration adds a
  // ctx.statusCode === 401 fallback that fixes it, so this now asserts the
  // corrected AuthenticationError-grade classification. 401 is non-retryable
  // at the orchestration layer, so (unlike the 429 case below) the message
  // surfaces WITHOUT the "Failed to generate text with all providers"
  // wrapper — verified against an actual mocked run. ProviderError's base
  // constructor still prepends "[anthropic] " to the formatted message, so
  // we substring-match the classification-specific text rather than
  // anchoring on the start of the string. ────────────────────────────────
  try {
    await withMocks(
      [
        {
          method: "POST",
          url: "api.anthropic.com/v1/messages",
          respond: {
            status: 401,
            json: {
              type: "error",
              error: {
                type: "authentication_error",
                message: "invalid x-api-key",
              },
            },
          },
        },
      ],
      async () => {
        const nl = new NeuroLink({ conversationMemory: { enabled: false } });
        try {
          await nl.generate({
            provider: "anthropic",
            model,
            input: { text: "ping" },
            disableTools: true,
          });
          record(
            results,
            `${section}: 401 → AuthenticationError`,
            false,
            "no error thrown",
          );
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          record(
            results,
            `${section}: 401 → AuthenticationError`,
            msg.includes(
              "Invalid Anthropic API key. Please check your ANTHROPIC_API_KEY environment variable.",
            ),
            `msg='${msg.slice(0, 120)}'`,
          );
        }
      },
    );
  } catch (err) {
    record(
      results,
      `${section}: 401 → AuthenticationError`,
      false,
      err instanceof Error ? err.message : String(err),
    );
  }

  // ── 429 → correctly classifies via the "429" substring match. Retryable
  // at the orchestration layer, so directProviderGeneration() wraps the
  // final message once the single-provider retry budget exhausts —
  // substring-match the classified inner text, not the wrapper. ─────────
  try {
    await withMocks(
      [
        {
          method: "POST",
          url: "api.anthropic.com/v1/messages",
          respond: {
            status: 429,
            json: {
              type: "error",
              error: { type: "rate_limit_error", message: "Rate limited" },
            },
          },
        },
      ],
      async () => {
        const nl = new NeuroLink({ conversationMemory: { enabled: false } });
        try {
          await nl.generate({
            provider: "anthropic",
            model,
            input: { text: "ping" },
            disableTools: true,
          });
          record(
            results,
            `${section}: 429 → RateLimitError`,
            false,
            "no error thrown",
          );
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          record(
            results,
            `${section}: 429 → RateLimitError`,
            msg.includes(
              "Anthropic rate limit exceeded. Please try again later.",
            ),
            `msg='${msg.slice(0, 120)}'`,
          );
        }
      },
    );
  } catch (err) {
    record(
      results,
      `${section}: 429 → RateLimitError`,
      false,
      err instanceof Error ? err.message : String(err),
    );
  }

  // ── A streaming failure must not take the caller's PROCESS down.
  //
  // The engine's channel is drained by a detached `pump` promise, and the only
  // `await pump` sits after `await resultPromise`. When the latter rejects the
  // former is never reached, so pump's rejection stayed unhandled — and an
  // unhandled rejection terminates the process. Measured before the fix: the
  // consumer's own try/catch fired correctly AND the process still died with
  // exit code 1, which no caller can defend against from outside.
  //
  // Asserted in a SUBPROCESS on purpose. An in-process unhandledRejection
  // counter would be polluted by any other case in this file that leaves a
  // stray rejection, so it could pass for the wrong reason; a child's exit
  // code cannot.
  // ─────────────────────────────────────────────────────────────────────
  try {
    const child = `
      process.env.ANTHROPIC_API_KEY = ${JSON.stringify(fakeKey)};
      process.env.NEUROLINK_SKIP_MCP = "true";
      globalThis.fetch = async () => new Response(
        JSON.stringify({ type: "error", error: { type: "rate_limit_error", message: "Rate limited" } }),
        { status: 429, headers: { "content-type": "application/json" } },
      );
      const { NeuroLink } = await import(${JSON.stringify(distUrl)});
      const nl = new NeuroLink({ conversationMemory: { enabled: false } });
      let caught;
      try {
        const r = await nl.stream({ provider: "anthropic", model: ${JSON.stringify(model)}, input: { text: "ping" }, disableTools: true });
        for await (const c of r.stream) { void c; }
      } catch (e) { caught = e; }
      await new Promise((r) => setTimeout(r, 600));
      if (caught === undefined) { console.log("NO_ERROR"); process.exit(3); }
      // Surviving is only meaningful if the run actually reached the failure
      // this test is about. Accepting ANY error made the case vacuous: a
      // pre-request or configuration failure never creates a detached-pump
      // rejection to survive, yet still landed in the catch. Demonstrated by
      // making fetch throw instead of returning the 429 — the child printed
      // SURVIVED off a NetworkError and the assertion passed having exercised
      // nothing. Pin the identity so only the real path can report success.
      const name = caught?.constructor?.name;
      const text = String(caught?.message ?? "");
      const tags = text.split("[anthropic]").length - 1;
      if (name !== "RateLimitError" || tags !== 1) {
        console.log("WRONG_ERROR", name, "tags=" + tags);
        process.exit(4);
      }
      console.log("SURVIVED");
    `;
    const res = spawnSync(
      process.execPath,
      ["--input-type=module", "-e", child],
      {
        encoding: "utf8",
        timeout: 60_000,
        killSignal: "SIGKILL",
      },
    );
    // Child exit codes: 0 = survived the real failure · 1 = the process was
    // killed by the unhandled rejection (the bug) · 3 = nothing threw at all
    // · 4 = something threw, but not the failure under test. Only 0 counts.
    // The detail below stays free of payload text on purpose — record()'s
    // skip classifier reads message content, so quoting a provider-ish string
    // into it can downgrade a genuine failure to a skip.
    const survived =
      res.status === 0 && (res.stdout ?? "").includes("SURVIVED");
    record(
      results,
      `${section}: a streaming error does not kill the caller's process`,
      survived,
      `exit=${res.status} signal=${res.signal ?? "none"}`,
    );
  } catch (err) {
    record(
      results,
      `${section}: a streaming error does not kill the caller's process`,
      false,
      err instanceof Error ? err.message : String(err),
    );
  }

  // ── The same 429, but STREAMED. The OpenAI section covers the path where a
  // provider throws the raw upstream error and BaseProvider classifies it;
  // Anthropic is the other shape, calling formatProviderError() ITSELF inside
  // its streaming catch (client.ts, `throw this.formatProviderError(error)`),
  // so what escapes the iterator is already a ProviderError. That shape had no
  // streaming coverage at all.
  //
  // THIS CASE CANNOT LIVE WITHOUT THE FIX IN THIS COMMIT. Driving a streaming
  // 429 through Anthropic is exactly what orphans the detached pump's raw SDK
  // rejection, and an unhandled rejection terminates the process — so on
  // unpatched code the suite dies mid-run with no failed assertion to point at:
  //   RateLimitError: 429 {"type":"error",...}
  //       at runLoop (dist/providers/anthropic/client.js:1741)
  //   -> node exits 1
  // It is a RACE, so it does not reproduce every time: the same commit reported
  // 65 passed / 0 failed and exit 0 locally while CI's provider-safety-net
  // exited 1. Controlled probe, same mock both sides:
  //   without the pump guard   consumer caught RateLimitError · unhandled = 1
  //   with the pump guard      consumer caught RateLimitError · unhandled = 0
  // The subprocess test above is the deterministic guard; this one is the
  // in-suite coverage of the second provider shape (Anthropic calls
  // formatProviderError ITSELF, so what escapes the iterator is already a
  // ProviderError), which had no streaming coverage at all.
  // ─────────────────────────────────────────────────────────────────────
  try {
    await withMocks(
      [
        {
          method: "POST",
          url: "api.anthropic.com/v1/messages",
          respond: {
            status: 429,
            json: {
              type: "error",
              error: { type: "rate_limit_error", message: "Rate limited" },
            },
          },
        },
      ],
      async () => {
        const nl = new NeuroLink({ conversationMemory: { enabled: false } });
        let name: string | null = null;
        let prefixes = -1;
        try {
          const r = await nl.stream({
            provider: "anthropic",
            model,
            input: { text: "ping" },
            disableTools: true,
          });
          for await (const chunk of r.stream) {
            void chunk;
          }
        } catch (err) {
          name = err instanceof Error ? err.constructor.name : typeof err;
          const m = err instanceof Error ? err.message : String(err);
          prefixes = m.split("[anthropic]").length - 1;
        }
        record(
          results,
          `${section}: streaming 429 is classified exactly once`,
          name === "RateLimitError" && prefixes === 1,
          name === null
            ? "no error thrown"
            : `surfaced as ${name} with ${prefixes} provider tags`,
        );
      },
    );
  } catch (err) {
    record(
      results,
      `${section}: streaming 429 is classified exactly once`,
      false,
      err instanceof Error ? err.message : String(err),
    );
  }
}

// ───────────────────────────────────────────────────────────────────────
// Section: Cloudflare message-content normalization (catalog quirk
// messageContentFormat: "string").
//
// Regression guard. Cloudflare's OpenAI-compatible endpoint accepts
// `messages[].content` ONLY as a plain string: it rejects both OpenAI's
// content-parts array and the `null` that OpenAI puts on an assistant
// message carrying tool_calls, with HTTP 400 "Type mismatch of
// '/messages/N/content'". The first turn of a conversation has string
// content already, so plain chat looked healthy while EVERY tool
// round-trip failed on the follow-up turn — which is why this asserts on
// the second request, not the first.
// ───────────────────────────────────────────────────────────────────────

async function runCloudflareContentFormatSection(): Promise<void> {
  const section = "LLM cloudflare (messageContentFormat)";
  console.log(`\n=== ${section} ===`);

  setEnv("CLOUDFLARE_API_KEY", "test-fake-cloudflare-credential");
  setEnv("CLOUDFLARE_ACCOUNT_ID", "test-account-id");

  const model = "@cf/meta/llama-3.1-8b-instruct-fast";
  const { NeuroLink } = await import("../dist/index.js");

  const toolCallResponse = {
    id: "chatcmpl-mock",
    object: "chat.completion",
    created: 0,
    model,
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content: null,
          tool_calls: [
            {
              id: "call_1",
              type: "function",
              function: {
                name: "multiply",
                arguments: JSON.stringify({ a: 17, b: 4 }),
              },
            },
          ],
        },
        finish_reason: "tool_calls",
      },
    ],
    usage: { prompt_tokens: 5, completion_tokens: 5, total_tokens: 10 },
  };

  try {
    let turn = 0;
    await withMocks(
      [
        {
          method: "POST",
          url: "api.cloudflare.com",
          respond: () => {
            turn += 1;
            return {
              status: 200,
              json:
                turn === 1 ? toolCallResponse : openAIChatResponse("68", model),
            };
          },
        },
      ],
      async ({ calls }) => {
        const nl = new NeuroLink({ conversationMemory: { enabled: false } });
        await nl.generate({
          provider: "cloudflare",
          model,
          input: { text: "What is 17 times 4? Use the multiply tool." },
          tools: {
            multiply: {
              description: "Multiply two numbers",
              inputSchema: jsonSchema<{ a: number; b: number }>({
                type: "object",
                properties: { a: { type: "number" }, b: { type: "number" } },
                required: ["a", "b"],
              }),
              execute: async ({ a, b }) => ({ result: a * b }),
            },
          },
        });

        expect(
          calls.length >= 2,
          `expected a follow-up turn after the tool call — saw ${calls.length} request(s)`,
        );

        // Every message of every turn must carry string content. The
        // follow-up turn is where the assistant tool_calls message (null
        // content) and the tool-result message appear.
        for (const [index, call] of calls.entries()) {
          const body = (call.bodyJson ?? {}) as {
            messages?: Array<{ role?: string; content?: unknown }>;
          };
          expect(
            Array.isArray(body.messages),
            `turn ${index + 1}: body.messages is an array`,
          );
          for (const [position, message] of (body.messages ?? []).entries()) {
            expectEq(
              typeof message.content,
              "string",
              `turn ${index + 1} message ${position} (role=${String(message.role)}) content type`,
            );
          }
        }

        // The assistant's tool_calls must survive normalization — only the
        // content encoding changes, never the tool wiring.
        const followUp = (calls[1]?.bodyJson ?? {}) as {
          messages?: Array<{ role?: string; tool_calls?: unknown[] }>;
        };
        const assistantWithCalls = (followUp.messages ?? []).find(
          (m) => m.role === "assistant" && Array.isArray(m.tool_calls),
        );
        expect(
          assistantWithCalls !== undefined,
          "follow-up turn preserves the assistant message's tool_calls",
        );
      },
    );
    record(results, `${section}: tool round-trip sends string content`, true);
  } catch (err) {
    record(
      results,
      `${section}: tool round-trip sends string content`,
      false,
      err instanceof Error ? err.message : String(err),
    );
  }
}

// ───────────────────────────────────────────────────────────────────────
// Section: invalid-model fallback (anti-rot "survive" layer).
//
// Vendors retire models without warning. An InvalidModelError is classified
// non-retryable — correctly, since switching PROVIDER cannot fix a bad model
// id — which meant the fallback chain stopped dead and the caller got an
// error while the same provider was still serving other models named in the
// catalog's own `fallbacks`. Groq shipped exactly that state: all seven
// catalogued ids retired upstream, default included.
// ───────────────────────────────────────────────────────────────────────

async function runInvalidModelFallbackSection(): Promise<void> {
  const section = "LLM groq (invalid-model fallback)";
  console.log(`\n=== ${section} ===`);

  setEnv("GROQ_API_KEY", "test-fake-groq-credential");
  const { NeuroLink } = await import("../dist/index.js");

  const deadModel = "llama-3.3-70b-versatile"; // retired upstream 2026-08
  try {
    const requested: string[] = [];
    await withMocks(
      [
        {
          method: "POST",
          url: "api.groq.com",
          respond: (req) => {
            const body = (req.bodyJson ?? {}) as { model?: string };
            const model = String(body.model ?? "");
            requested.push(model);
            if (model === deadModel) {
              return {
                status: 404,
                json: {
                  error: {
                    message: `The model \`${model}\` does not exist or you do not have access to it.`,
                    type: "invalid_request_error",
                    code: "model_not_found",
                  },
                },
              };
            }
            return { status: 200, json: openAIChatResponse("pong", model) };
          },
        },
      ],
      async () => {
        const nl = new NeuroLink({ conversationMemory: { enabled: false } });
        const result = await nl.generate({
          provider: "groq",
          model: deadModel,
          input: { text: "ping" },
          disableTools: true,
        });

        expect(
          requested.length >= 2,
          `expected a retry after the invalid-model rejection — saw ${requested.length} request(s)`,
        );
        expectEq(requested[0], deadModel, "first attempt uses the dead model");
        expect(
          requested[1] !== deadModel,
          "second attempt switches to a different model",
        );
        expect(
          (result.content ?? "").toLowerCase().includes("pong"),
          "caller still receives a completed generation",
        );
      },
    );
    record(results, `${section}: retired model falls back to a live one`, true);
  } catch (err) {
    record(
      results,
      `${section}: retired model falls back to a live one`,
      false,
      err instanceof Error ? err.message : String(err),
    );
  }

  // ── Streaming. OpenAI-compatible streams are lazy: the request only goes
  // out on the consumer's first pull, so a retired model fails deep inside
  // iteration rather than in stream()'s try/catch. The retry therefore sits
  // below the lifecycle wrapper, and is only legal while the stream has
  // emitted no real content.
  try {
    const requested: string[] = [];
    await withMocks(
      [
        {
          method: "POST",
          url: "api.groq.com",
          respond: (req) => {
            const body = (req.bodyJson ?? {}) as { model?: string };
            const model = String(body.model ?? "");
            requested.push(model);
            if (model === deadModel) {
              return {
                status: 404,
                json: {
                  error: {
                    message: `The model \`${model}\` does not exist or you do not have access to it.`,
                    type: "invalid_request_error",
                    code: "model_not_found",
                  },
                },
              };
            }
            return {
              status: 200,
              contentType: "text/event-stream",
              text: sseBody([
                {
                  id: "chatcmpl-mock",
                  object: "chat.completion.chunk",
                  created: 0,
                  model,
                  choices: [
                    {
                      index: 0,
                      delta: { content: "pong" },
                      finish_reason: null,
                    },
                  ],
                },
                {
                  id: "chatcmpl-mock",
                  object: "chat.completion.chunk",
                  created: 0,
                  model,
                  choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
                },
              ]),
            };
          },
        },
      ],
      async () => {
        const nl = new NeuroLink({ conversationMemory: { enabled: false } });
        const res = await nl.stream({
          provider: "groq",
          model: deadModel,
          input: { text: "ping" },
          disableTools: true,
        });
        let text = "";
        for await (const chunk of res.stream) {
          text +=
            typeof chunk === "string"
              ? chunk
              : ((chunk as { content?: string })?.content ?? "");
        }

        expect(
          requested.length >= 2,
          `expected a retry after the invalid-model rejection — saw ${requested.length} request(s)`,
        );
        expectEq(requested[0], deadModel, "first attempt uses the dead model");
        expect(
          requested[1] !== deadModel,
          "second attempt switches to a different model",
        );
        expect(
          text.includes("pong"),
          "consumer receives the fallback model's streamed content",
        );
      },
    );
    record(
      results,
      `${section}: retired model falls back when streaming`,
      true,
    );
  } catch (err) {
    record(
      results,
      `${section}: retired model falls back when streaming`,
      false,
      err instanceof Error ? err.message : String(err),
    );
  }

  // ── A caller that owns fallback order (the Claude proxy sets
  // disableInternalFallback on its stream calls) must get the invalid-model
  // error as-is: no silent switch to another model.
  try {
    const requested: string[] = [];
    await withMocks(
      [
        {
          method: "POST",
          url: "api.groq.com",
          respond: (req) => {
            const body = (req.bodyJson ?? {}) as { model?: string };
            requested.push(String(body.model ?? ""));
            return {
              status: 404,
              json: {
                error: {
                  message: `The model \`${String(body.model ?? "")}\` does not exist or you do not have access to it.`,
                  type: "invalid_request_error",
                  code: "model_not_found",
                },
              },
            };
          },
        },
      ],
      async () => {
        const nl = new NeuroLink({ conversationMemory: { enabled: false } });
        let streamThrew = false;
        try {
          const res = await nl.stream({
            provider: "groq",
            model: deadModel,
            input: { text: "ping" },
            disableTools: true,
            disableInternalFallback: true,
          });
          for await (const _chunk of res.stream) {
            // drain
          }
        } catch {
          streamThrew = true;
        }
        expect(streamThrew, "stream() surfaces the invalid-model error");
        expect(requested.length >= 1, "stream() reached the provider");
        expect(
          requested.every((m) => m === deadModel),
          "stream() never switched models — every request used the requested model",
        );
      },
    );
    record(
      results,
      `${section}: disableInternalFallback keeps the invalid-model error`,
      true,
    );
  } catch (err) {
    record(
      results,
      `${section}: disableInternalFallback keeps the invalid-model error`,
      false,
      err instanceof Error ? err.message : String(err),
    );
  }
}

// ───────────────────────────────────────────────────────────────────────
// Section: Vertex (construction + formatProviderError contract only —
// gaxios routes ADC token exchange through node-fetch, not globalThis.fetch,
// so installMockFetch() cannot intercept it. This section verifies
// provider construction plus the 403/429 branches of formatProviderError()
// directly instead of a full request/response round trip)
// ───────────────────────────────────────────────────────────────────────

async function runVertexSection(): Promise<void> {
  const section = "Vertex (construction + formatProviderError contract)";
  console.log(`\n=== ${section} ===`);
  console.log(
    "  NOTE: Vertex's ADC token exchange goes through gaxios -> the " +
      "node-fetch npm package directly, not globalThis.fetch, so " +
      "installMockFetch() cannot intercept it. This section verifies " +
      "provider construction plus the 403/429 branches of " +
      "formatProviderError() directly instead of a full request/response " +
      "round trip.",
  );

  setEnv(
    "GOOGLE_SERVICE_ACCOUNT_KEY",
    JSON.stringify({
      type: "service_account",
      project_id: "mock-project",
      private_key:
        "-----BEGIN PRIVATE KEY-----\nMOCK\n-----END PRIVATE KEY-----\n",
      client_email: "mock@mock-project.iam.gserviceaccount.com",
    }),
  );
  // GoogleVertexProvider's constructor writes GOOGLE_CLOUD_PROJECT /
  // GOOGLE_CLOUD_LOCATION back onto process.env directly whenever the
  // `credentials` param carries projectId/location (client.ts:830-836) —
  // a side effect the constructor performs itself, not something this test
  // sets. Snapshot both through setEnv() *before* constructing so
  // restoreEnv() still puts the ambient values (real ones, in a dev shell
  // with a .env) back afterward instead of leaking the mock ones.
  setEnv("GOOGLE_CLOUD_PROJECT", process.env.GOOGLE_CLOUD_PROJECT);
  setEnv("GOOGLE_CLOUD_LOCATION", process.env.GOOGLE_CLOUD_LOCATION);

  try {
    const { GoogleVertexProvider } =
      await import("../dist/providers/googleVertex/client.js");
    const { AuthenticationError, RateLimitError } =
      await import("../dist/types/index.js");

    const provider = new GoogleVertexProvider(
      "gemini-2.5-flash",
      "vertex",
      undefined,
      "us-central1",
      { projectId: "mock-project", location: "us-central1" },
    );
    record(results, `${section}: constructs without throwing`, true);

    const formatError = (
      provider as unknown as {
        formatProviderError(error: unknown): Error;
      }
    ).formatProviderError.bind(provider);

    const authErr = formatError({
      message: "403 PERMISSION_DENIED: caller does not have permission",
    });
    record(
      results,
      `${section}: 403 → AuthenticationError`,
      authErr instanceof AuthenticationError,
      `got ${authErr.constructor.name}`,
    );

    const rateErr = formatError({
      message: '429 RESOURCE_EXHAUSTED: {"retryDelay":"12s"}',
    });
    record(
      results,
      `${section}: 429 → RateLimitError`,
      rateErr instanceof RateLimitError,
      `got ${rateErr.constructor.name}`,
    );
  } catch (err) {
    record(
      results,
      `${section}: setup`,
      false,
      err instanceof Error ? err.message : String(err),
    );
  }

  // ── A single failure must be formatted ONCE. handleProviderError is not
  // idempotent — formatProviderError prepends the provider tag every time it
  // runs — and one Vertex failure reaches it FIVE times, so before the
  // already-formatted short-circuit the message came out doubled:
  //   "[vertex] Google Vertex AI error: [vertex] Google Vertex AI error: ..."
  // Measured on the real path: provider tags 2 -> 1.
  //
  // GOOGLE_APPLICATION_CREDENTIALS must point at a real FILE holding an
  // unparseable key, and that is the whole reason this case is shaped the way
  // it is. Setting only GOOGLE_SERVICE_ACCOUNT_KEY to a mock is NOT enough:
  // google-auth then falls through to Application Default Credentials, and on
  // a developer machine with a gcloud login that SUCCEEDS — an earlier draft of
  // this test came back with a real model completion ("Pong!"), i.e. it made a
  // live API call and asserted nothing. Pointing at a bad key file fails inside
  // the OpenSSL decoder before any network I/O, so this is hermetic everywhere
  // and never depends on ambient credentials.
  //
  // Counting the TAG rather than matching wording is deliberate: the doubling
  // is what regresses, and the decode message is OpenSSL's and free to change.
  // NON-VACUOUS: drop the short-circuit and this reads 2.
  // ─────────────────────────────────────────────────────────────────────
  try {
    const keyDir = mkdtempSync(join(tmpdir(), "neurolink-vertex-"));
    const keyPath = join(keyDir, "fake-service-account.json");
    writeFileSync(
      keyPath,
      JSON.stringify({
        type: "service_account",
        project_id: "mock-project",
        private_key_id: "mock",
        private_key:
          "-----BEGIN PRIVATE KEY-----\nMOCK\n-----END PRIVATE KEY-----\n",
        client_email: "mock@mock-project.iam.gserviceaccount.com",
        token_uri: "https://oauth2.googleapis.com/token",
      }),
    );
    setEnv("GOOGLE_APPLICATION_CREDENTIALS", keyPath);
    setEnv("GOOGLE_VERTEX_PROJECT", "mock-project");
    setEnv("GOOGLE_VERTEX_LOCATION", "us-central1");

    const { NeuroLink } = await import("../dist/index.js");
    const nl = new NeuroLink({ conversationMemory: { enabled: false } });
    let tags = -1;
    let threw = false;
    try {
      const r = await nl.stream({
        provider: "vertex",
        model: "gemini-2.5-flash",
        input: { text: "ping" },
        disableTools: true,
      });
      for await (const chunk of r.stream) {
        void chunk;
      }
    } catch (err) {
      threw = true;
      const m = err instanceof Error ? err.message : String(err);
      tags = m.split("[vertex]").length - 1;
    }
    record(
      results,
      `${section}: a single failure carries exactly one provider tag`,
      threw && tags === 1,
      threw ? `saw ${tags} provider tags` : "no error thrown",
    );
  } catch (err) {
    record(
      results,
      `${section}: a single failure carries exactly one provider tag`,
      false,
      err instanceof Error ? err.message : String(err),
    );
  }
}

// ───────────────────────────────────────────────────────────────────────
// Section: Bedrock (construction + formatProviderError contract only —
// AWS SDK v3's @smithy/node-http-handler uses native Node http(s), not
// globalThis.fetch, so installMockFetch() cannot intercept it)
// ───────────────────────────────────────────────────────────────────────

async function runBedrockSection(): Promise<void> {
  const section = "Bedrock (construction + formatProviderError contract)";
  console.log(`\n=== ${section} ===`);
  console.log(
    "  NOTE: AWS SDK v3's @smithy/node-http-handler uses native Node " +
      "http/http2/https, not globalThis.fetch, so installMockFetch() " +
      "cannot intercept it. This section verifies provider construction " +
      "plus the AccessDeniedException/ThrottlingException branches of " +
      "formatProviderError() directly instead of a full request/response " +
      "round trip.",
  );

  try {
    const { AmazonBedrockProvider } =
      await import("../dist/providers/amazonBedrock/client.js");
    const { AuthenticationError, RateLimitError } =
      await import("../dist/types/index.js");

    const provider = new AmazonBedrockProvider(
      "anthropic.claude-3-5-sonnet-20241022-v2:0",
      undefined,
      "us-east-1",
      { accessKeyId: "MOCKACCESSKEYID", secretAccessKey: "mock-secret" },
    );
    record(results, `${section}: constructs without throwing`, true);

    const formatError = (
      provider as unknown as {
        formatProviderError(error: unknown): Error;
      }
    ).formatProviderError.bind(provider);

    const authErr = formatError(
      new Error(
        "AccessDeniedException: User is not authorized to perform this action",
      ),
    );
    record(
      results,
      `${section}: AccessDeniedException → AuthenticationError`,
      authErr instanceof AuthenticationError,
      `got ${authErr.constructor.name}`,
    );

    const throttleErr = formatError(
      Object.assign(new Error("Rate exceeded"), {
        name: "ThrottlingException",
      }),
    );
    record(
      results,
      `${section}: ThrottlingException → RateLimitError`,
      throttleErr instanceof RateLimitError,
      `got ${throttleErr.constructor.name}`,
    );
  } catch (err) {
    record(
      results,
      `${section}: setup`,
      false,
      err instanceof Error ? err.message : String(err),
    );
  }
}

// ───────────────────────────────────────────────────────────────────────
// Section: main
// ───────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log("=== Mocked Contract Test Suite (New Providers) ===");

  // Register providers once so the registry knows about everything.
  const { ProviderRegistry } = await import("../dist/index.js");
  await ProviderRegistry.registerAllProviders();

  try {
    await runOpenAICompatSection();
    await runLiteLLMSSESection();
    await runReplicateLLMSection();
    await runEmbeddingsSection();
    await runImageGenSection();
    await runOpenAISection();
    await runAzureSection();
    await runAnthropicSection();
    await runCloudflareContentFormatSection();
    await runInvalidModelFallbackSection();
    await runVertexSection();
    await runBedrockSection();
  } finally {
    restoreEnv();
  }

  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${passed} passed · ${failed} failed (of ${results.length})`);

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Mocked-provider suite crashed:", err);
  restoreEnv();
  process.exit(2);
});
