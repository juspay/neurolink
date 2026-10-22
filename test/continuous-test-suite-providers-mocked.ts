#!/usr/bin/env tsx
import "dotenv/config";
import { jsonSchema } from "../dist/index.js";
import type {
  DecisionOptions,
  DecisionQuestionMap,
  DecisionRequest,
  DecisionState,
  NeurolinkCredentials,
} from "../dist/index.js";
import { AsyncLocalStorage } from "node:async_hooks";
import { spawnSync } from "node:child_process";
import dnsPromises from "node:dns/promises";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { syncBuiltinESMExports } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { ZodType } from "zod";
import type { JSONSchema7 } from "json-schema";
import {
  IDEOGRAM_FIXTURE_HOST,
  RECRAFT_FIXTURE_HOST,
  withImageDownloadProxy,
  withImageDownloadTransport,
  withRefusingProxy,
} from "./helpers/imageDownloadTransport.js";
import {
  loopCoverageProblem,
  runDecideProviderContract,
} from "./helpers/decideProviderContract.js";

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
 *   LLM (OpenAI-compat):     every src/lib/providers/catalog/*.json entry, plus Cohere
 *   LLM (custom shape):      Cohere, Cloudflare Workers AI, Replicate
 *   Embeddings:              Voyage AI, Jina AI, OpenAI, LiteLLM, Ollama (native embeddings)
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

delete process.env.LANGFUSE_PUBLIC_KEY;
delete process.env.LANGFUSE_SECRET_KEY;

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

// Model fetch's default redirect-follow behavior for the unsafe legacy
// download path. The local HTTPS fixture requests the raw response instead.
async function withRedirectFollowingMocks<T>(
  routes: Parameters<typeof installMockFetch>[0],
  fn: (handle: ReturnType<typeof installMockFetch>) => Promise<T>,
): Promise<T> {
  return withMocks(routes, async (handle) => {
    const routeFetch = globalThis.fetch;
    globalThis.fetch = async (input, init) => {
      const response = await routeFetch(input, init);
      const location = response.headers.get("location");
      if (
        init?.redirect !== "manual" &&
        response.status >= 300 &&
        response.status < 400 &&
        location
      ) {
        return routeFetch(location, init);
      }
      return response;
    };
    try {
      return await fn(handle);
    } finally {
      globalThis.fetch = routeFetch;
    }
  });
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
// (All five are OpenAI-wire-compatible endpoints on their own baseURL.)
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
  /** Expected auth scheme on the Authorization header. Unused when
   *  rawAuthHeader is set. */
  authPrefix: string;
  /** Mirrors the catalog's quirks.authHeaderStyle: when set, the provider
   *  sends the raw credential (no "Bearer " prefix) under this header name
   *  instead of Authorization, and must send no Authorization header at
   *  all. Currently only Reka (see getAuthHeaders() in
   *  configuredOpenAICompat.ts). */
  rawAuthHeader?: string;
  /** Model name to pass through. */
  model: string;
  /** Friendly auth-error substring expected in the 401 case. */
  authErrorMatch: RegExp;
  /** Optional: when set, runs a 429 case asserting this pattern against
   *  the surfaced error message. Providers ported off a hand-written
   *  subclass in this plan set this; pre-existing entries left it unset
   *  (no regression — the case is skipped, not failed, when absent). */
  rateLimitErrorMatch?: RegExp;
  /** Optional: when set, the 401 case also asserts the thrown error's
   *  `.provider` field equals this string exactly — characterizes
   *  BaseProvider.providerName feeding classifyProviderError directly
   *  instead of a second hand-copied literal. Left unset for specs this
   *  plan didn't touch (no regression — skipped, not failed, when absent). */
  expectedErrorProviderField?: string;
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
  quirks?: { authHeaderStyle?: string };
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
      ...(entry.quirks?.authHeaderStyle === "x-api-key"
        ? { rawAuthHeader: "x-api-key" }
        : {}),
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
      expectedErrorProviderField: "cohere",
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
        if (spec.rawAuthHeader) {
          expectEq(
            call.headers[spec.rawAuthHeader],
            fakeKey,
            `${spec.rawAuthHeader} header carries the configured credential`,
          );
          expect(
            !("authorization" in call.headers),
            "no Authorization header is sent when the provider's quirk-declared auth transport replaces it",
          );
        } else {
          expect(
            (call.headers["authorization"] ?? "").startsWith(
              `${spec.authPrefix}${fakeKey}`,
            ),
            `Authorization header starts with '${spec.authPrefix}${fakeKey.slice(0, 12)}...'`,
          );
        }
        if (spec.provider === "perplexity") {
          expectEq(
            call.headers["x-pplx-integration"],
            "neurolink",
            "Perplexity integration attribution",
          );
        }
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
          if (spec.expectedErrorProviderField) {
            const provider = (err as { provider?: unknown })?.provider;
            record(
              results,
              `${section}: thrown error's .provider identifies this provider`,
              provider === spec.expectedErrorProviderField,
              `error.provider did not identify ${spec.expectedErrorProviderField}`,
            );
          }
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
              // This matrix checks the exhausted friendly error, not wall time.
              // An explicit vendor hint retains real retries without the
              // production no-hint backoff floor for every catalog row.
              headers: { "Retry-After": "0" },
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
  console.log("\n=== LLM OpenAI-compat (every catalog provider + Cohere) ===");
  const specs = await buildOpenAICompatProviders();
  for (const spec of specs) {
    await runOpenAICompatProvider(spec);
  }
}

// ───────────────────────────────────────────────────────────────────────
// Section: per-model tool support from the catalog (issue #1875).
// Reka's docs say which of its models take tool definitions, and the answer
// differs per model. As of 2026-10-17 the Models table at
// https://docs.reka.ai/chat/models.md has Tools = Yes for reka-edge-2603 and
// Tools = No for reka-flash-3. reka-flash and reka-edge are no longer in that
// table; the earlier docs listed reka-edge as "reka-edge (or reka-edge-2603)",
// so the catalog treats it as the same model. Before the catalog
// carried a per-model flag, a "model-dependent" provider-level
// `capabilities.tools` left OpenAICompatCatalogEntry.supportsTools unset, which
// fell through to the model registry's "unknown model -> tools supported"
// default for every catalog provider. Now a model the catalog marks
// `tools: false` must not receive a `tools` array, and one marked `tools: true`
// must. reka-flash-3 is the case that keeps the withhold path covered.
// ───────────────────────────────────────────────────────────────────────

async function runCatalogPerModelToolsSection(): Promise<void> {
  const section = "LLM reka: per-model tool support";
  console.log(`\n=== ${section} ===`);
  setEnv("REKA_API_KEY", "test-fake-reka-credential");

  const { NeuroLink } = await import("../dist/index.js");
  const tools = {
    lookup: {
      description: "Look a value up",
      inputSchema: jsonSchema<{ q: string }>({
        type: "object",
        properties: { q: { type: "string" } },
        required: ["q"],
      }),
      execute: async () => ({ value: "x" }),
    },
  };

  for (const [model, expectTools] of [
    ["reka-flash", true],
    ["reka-edge", true],
    ["reka-edge-2603", true],
    ["reka-flash-3", false],
  ] as const) {
    const name = `${section}: ${model} ${expectTools ? "receives" : "never receives"} a tools array`;
    try {
      await withMocks(
        [
          {
            method: "POST",
            url: "api.reka.ai/v1/chat/completions",
            respond: { status: 200, json: openAIChatResponse("pong", model) },
          },
        ],
        async ({ calls }) => {
          const nl = new NeuroLink({ conversationMemory: { enabled: false } });
          await nl.generate({
            provider: "reka",
            model,
            input: { text: "ping" },
            tools,
            maxSteps: 1,
          });
          const body = calls[0]?.bodyJson as { tools?: unknown[] } | undefined;
          const sawTools = Array.isArray(body?.tools) && body.tools.length > 0;
          record(
            results,
            name,
            sawTools === expectTools,
            `body.tools ${sawTools ? "present" : "absent"}`,
          );
        },
      );
    } catch (err) {
      record(
        results,
        name,
        false,
        err instanceof Error ? err.message : String(err),
      );
    }
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

// ───────────────────────────────────────────────────────────────────────
// Section: reasoning replay on tool turns.
// DeepSeek documents that once tools are in play, each assistant turn's
// reasoning_content must go back on every later request, and answers 400
// without it. The catalog quirk replayReasoningContent turns that on for
// DeepSeek only; a provider without it must never send the field, because
// strict OpenAI-compatible backends reject unknown message keys.
// ───────────────────────────────────────────────────────────────────────

const REPLAY_REASONING = "Need the population tool first.";

type ReplayWireMessage = {
  role?: string;
  tool_calls?: unknown[];
  reasoning_content?: string;
};

function replayToolCallStep(stream: boolean): {
  json?: unknown;
  text?: string;
  contentType?: string;
} {
  const toolCall = {
    id: "call_replay_1",
    type: "function",
    function: { name: "get_population", arguments: '{"city":"Tokyo"}' },
  };
  if (!stream) {
    return {
      json: {
        id: "chatcmpl-replay-1",
        object: "chat.completion",
        created: 0,
        model: "mock",
        choices: [
          {
            index: 0,
            message: {
              role: "assistant",
              content: null,
              reasoning_content: REPLAY_REASONING,
              tool_calls: [toolCall],
            },
            finish_reason: "tool_calls",
          },
        ],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      },
    };
  }
  return {
    contentType: "text/event-stream",
    text: sseBody([
      {
        choices: [
          {
            index: 0,
            delta: { role: "assistant", reasoning_content: REPLAY_REASONING },
            finish_reason: null,
          },
        ],
      },
      {
        choices: [
          {
            index: 0,
            delta: { tool_calls: [{ index: 0, ...toolCall }] },
            finish_reason: null,
          },
        ],
      },
      { choices: [{ index: 0, delta: {}, finish_reason: "tool_calls" }] },
    ]),
  };
}

function replayAnswerStep(stream: boolean): {
  json?: unknown;
  text?: string;
  contentType?: string;
} {
  const answer = "Tokyo has about 14 million people.";
  if (!stream) {
    return {
      json: {
        id: "chatcmpl-replay-2",
        object: "chat.completion",
        created: 0,
        model: "mock",
        choices: [
          {
            index: 0,
            message: { role: "assistant", content: answer },
            finish_reason: "stop",
          },
        ],
        usage: { prompt_tokens: 20, completion_tokens: 8, total_tokens: 28 },
      },
    };
  }
  return {
    contentType: "text/event-stream",
    text: sseBody([
      {
        choices: [
          {
            index: 0,
            delta: { role: "assistant", content: answer },
            finish_reason: null,
          },
        ],
      },
      { choices: [{ index: 0, delta: {}, finish_reason: "stop" }] },
    ]),
  };
}

async function runReasoningReplaySection(): Promise<void> {
  const section = "LLM reasoning replay on tool turns";
  console.log(`\n=== ${section} ===`);
  setEnv("DEEPSEEK_API_KEY", "test-fake-deepseek-credential");
  setEnv("DEEPSEEK_BASE_URL", undefined);
  setEnv("GROQ_API_KEY", "test-fake-groq-credential");
  setEnv("GROQ_BASE_URL", undefined);

  const { NeuroLink } = await import("../dist/index.js");
  const tools = {
    get_population: {
      description: "Population of a city",
      inputSchema: jsonSchema<{ city: string }>({
        type: "object",
        properties: { city: { type: "string" } },
        required: ["city"],
      }),
      execute: async () => ({ population: 14000000 }),
    },
  };
  const cases = [
    { provider: "deepseek", host: "api.deepseek.com", expectReplay: true },
    { provider: "groq", host: "api.groq.com", expectReplay: false },
  ];

  for (const c of cases) {
    for (const mode of ["generate", "stream"] as const) {
      const name = `${section}: ${c.provider} ${mode} ${
        c.expectReplay ? "sends the reasoning back" : "never sends reasoning"
      }`;
      try {
        let step = 0;
        await withMocks(
          [
            {
              method: "POST",
              url: `${c.host}`,
              respond: (call) => {
                step += 1;
                const stream =
                  (call.bodyJson as { stream?: boolean } | undefined)
                    ?.stream === true;
                return {
                  status: 200,
                  ...(step === 1
                    ? replayToolCallStep(stream)
                    : replayAnswerStep(stream)),
                };
              },
            },
          ],
          async ({ calls }) => {
            const nl = new NeuroLink({
              conversationMemory: { enabled: false },
            });
            const request = {
              provider: c.provider,
              input: { text: "How many people live in Tokyo?" },
              tools,
              maxSteps: 3,
            };
            if (mode === "generate") {
              await nl.generate(request);
            } else {
              const result = await nl.stream(request);
              for await (const _chunk of result.stream) {
                // drain
              }
            }
            // The first request in a process also loads the dynamic model
            // registry, so pick the chat calls out by their body.
            const chatCalls = calls.filter((call) =>
              Array.isArray(
                (call.bodyJson as { messages?: unknown } | undefined)?.messages,
              ),
            );
            expect(
              chatCalls.length >= 2,
              `${c.provider} ${mode} made ${chatCalls.length} chat request(s), expected the tool step and the answer`,
            );
            const replayed = (
              (chatCalls[1].bodyJson as { messages?: ReplayWireMessage[] })
                ?.messages ?? []
            ).find(
              (message) =>
                message.role === "assistant" &&
                Array.isArray(message.tool_calls),
            );
            expect(
              replayed !== undefined,
              `${c.provider} ${mode} second request carried no assistant tool-call turn`,
            );
            if (c.expectReplay) {
              expectEq(
                replayed?.reasoning_content,
                REPLAY_REASONING,
                `${c.provider} ${mode} replayed reasoning_content`,
              );
            } else {
              expect(
                replayed !== undefined && !("reasoning_content" in replayed),
                `${c.provider} ${mode} put reasoning_content on the wire`,
              );
            }
          },
        );
        record(results, name, true);
      } catch (err) {
        record(
          results,
          name,
          false,
          err instanceof Error ? err.message : String(err),
        );
      }
    }
  }
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

  // ── embedMany() rejects an entry without an embedding ───────────────
  // A count-correct response whose second entry has no `embedding` array
  // must fail loudly instead of handing the caller an undefined vector.
  try {
    await withMocks(
      [
        {
          method: "POST",
          url: spec.urlMatch,
          respond: {
            status: 200,
            json: {
              object: "list",
              model: spec.model,
              data: [
                { object: "embedding", index: 0, embedding: [0.1, 0.2] },
                { object: "embedding", index: 1 },
              ],
            },
          },
        },
      ],
      async () => {
        const provider = (await ProviderFactory.createProvider(
          spec.provider,
          spec.model,
        )) as unknown as {
          embedMany: (s: string[]) => Promise<number[][]>;
        };
        let message = "";
        let returned: number[][] | undefined;
        try {
          returned = await provider.embedMany(["first", "second"]);
        } catch (err) {
          message = err instanceof Error ? err.message : String(err);
        }
        expect(
          returned === undefined,
          "embedMany() must not return a result containing a missing vector",
        );
        expect(
          /entry 1 is not an \{index, embedding/.test(message),
          "error names the malformed entry",
        );
        record(
          results,
          `${section}: embedMany() rejects an entry without an embedding`,
          true,
        );
      },
    );
  } catch (err) {
    record(
      results,
      `${section}: embedMany() rejects an entry without an embedding`,
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

  await runOpenAIEmbeddingRows();
  for (const spec of COMPAT_EMBEDDING_PROVIDERS) {
    await runCompatEmbeddingRows(spec);
  }
}

// ───────────────────────────────────────────────────────────────────────
// Section: OpenAI native embeddings — response rows against the inputs
// ───────────────────────────────────────────────────────────────────────

const OPENAI_EMBEDDING_MODEL = "text-embedding-3-small";

type OpenAIEmbeddingRow = {
  object: "embedding";
  index: number;
  embedding?: number[];
};

/**
 * Answers `POST /v1/embeddings` with one row per input, the first character's
 * code as its only value. `reshape` turns that healthy answer into the one a
 * case needs: a row with no `embedding`, an empty one, or fewer rows than
 * inputs.
 */
function openAIEmbeddingsRoute(
  reshape: (rows: OpenAIEmbeddingRow[]) => OpenAIEmbeddingRow[] = (rows) =>
    rows,
) {
  return {
    method: "POST",
    url: "api.openai.com/v1/embeddings",
    respond: (call: { bodyJson: unknown }) => {
      const input = (call.bodyJson as { input?: string | string[] }).input;
      const texts = Array.isArray(input) ? input : [input ?? ""];
      const rows = texts.map((text, index) => ({
        object: "embedding" as const,
        index,
        embedding: [text.charCodeAt(0)],
      }));
      return {
        status: 200,
        json: {
          object: "list",
          model: OPENAI_EMBEDDING_MODEL,
          data: reshape(rows),
          usage: { prompt_tokens: texts.length, total_tokens: texts.length },
        },
      };
    },
  };
}

function withoutEmbeddingAt(
  position: number,
  as: "missing" | "empty",
): (rows: OpenAIEmbeddingRow[]) => OpenAIEmbeddingRow[] {
  return (rows) =>
    rows.map((row, index) => {
      if (index !== position) {
        return row;
      }
      return as === "empty"
        ? { object: "embedding", index, embedding: [] }
        : { object: "embedding", index };
    });
}

async function runOpenAIEmbeddingRows(): Promise<void> {
  const section = "EMBED openai";
  console.log(`\n=== ${section} (native /v1/embeddings) ===`);
  setEnv("OPENAI_API_KEY", "test-fake-openai-credential");
  // Same pin as the chat section: an ambient OPENAI_BASE_URL must not reroute
  // the request away from the api.openai.com mock.
  setEnv("OPENAI_BASE_URL", undefined);

  const { ProviderFactory } =
    await import("../dist/factories/providerFactory.js");
  const provider = (await ProviderFactory.createProvider(
    "openai",
    "gpt-4o-mini",
  )) as unknown as {
    embed: (text: string, modelName?: string) => Promise<number[]>;
    embedMany: (texts: string[], modelName?: string) => Promise<number[][]>;
  };

  async function settle<T>(
    run: () => Promise<T>,
  ): Promise<{ value: T | undefined; message: string | undefined }> {
    try {
      return { value: await run(), message: undefined };
    } catch (err) {
      return {
        value: undefined,
        message: err instanceof Error ? err.message : String(err),
      };
    }
  }

  async function check(name: string, run: () => Promise<void>): Promise<void> {
    try {
      await run();
      record(results, `${section}: ${name}`, true);
    } catch (err) {
      record(
        results,
        `${section}: ${name}`,
        false,
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  await check("embed() returns the vector for a healthy response", () =>
    withMocks([openAIEmbeddingsRoute()], async ({ calls }) => {
      const { value } = await settle(() =>
        provider.embed("a", OPENAI_EMBEDDING_MODEL),
      );
      expect(calls.length === 1, "embed did not send exactly one request");
      expect(
        value !== undefined && value.length === 1 && value[0] === 97,
        "embed did not return the vector for a healthy response",
      );
    }),
  );

  await check("embedMany() returns one vector per text, in order", () =>
    withMocks([openAIEmbeddingsRoute()], async ({ calls }) => {
      const { value } = await settle(() =>
        provider.embedMany(["a", "b", "c"], OPENAI_EMBEDDING_MODEL),
      );
      const sent = (calls[0]?.bodyJson as { input?: unknown } | undefined)
        ?.input;
      expect(
        Array.isArray(sent) && sent.length === 3,
        "embedMany did not send the three texts as one batch",
      );
      expect(
        value !== undefined && value.map((v) => v[0]).join(",") === "97,98,99",
        "embedMany did not return one vector per text, in order",
      );
    }),
  );

  for (const shape of ["missing", "empty"] as const) {
    await check(
      `embedMany() rejects a ${shape} embedding and names its index`,
      () =>
        withMocks(
          [openAIEmbeddingsRoute(withoutEmbeddingAt(1, shape))],
          async () => {
            const { value, message } = await settle(() =>
              provider.embedMany(["a", "b", "c"], OPENAI_EMBEDDING_MODEL),
            );
            expect(
              value === undefined,
              "embedMany returned vectors although one embedding had no values",
            );
            expect(
              message !== undefined,
              "embedMany did not reject an embedding without values",
            );
            expect(
              /\bindex 1\b/.test(message ?? ""),
              "the rejection did not name the index of the embedding without values",
            );
            expect(
              (message ?? "").includes("openai"),
              "the rejection did not name the provider",
            );
          },
        ),
    );
  }

  await check(
    "embedMany() rejects a response with fewer vectors than texts and names the counts",
    () =>
      withMocks(
        [openAIEmbeddingsRoute((rows) => rows.slice(0, -1))],
        async () => {
          const { value, message } = await settle(() =>
            provider.embedMany(["a", "b", "c"], OPENAI_EMBEDDING_MODEL),
          );
          expect(
            value === undefined,
            "embedMany returned vectors although the response held fewer than one per text",
          );
          expect(
            message !== undefined,
            "embedMany did not reject a response with fewer vectors than texts",
          );
          expect(
            /\b2 vectors for 3 texts\b/.test(message ?? ""),
            "the rejection did not name the number of vectors and texts",
          );
        },
      ),
  );

  await check(
    "embedMany() keeps the real index in the rejection for an index that looks like a status code",
    () =>
      withMocks(
        [openAIEmbeddingsRoute(withoutEmbeddingAt(429, "empty"))],
        async () => {
          const texts = Array.from({ length: 430 }, (_, i) => `t${i}`);
          const { value, message } = await settle(() =>
            provider.embedMany(texts, OPENAI_EMBEDDING_MODEL),
          );
          expect(
            value === undefined && message !== undefined,
            "embedMany did not reject an embedding without values in a large batch",
          );
          expect(
            /\bindex 429\b/.test(message ?? ""),
            "the rejection lost the index when it resembled a status code",
          );
          expect(
            !/rate limit/i.test(message ?? ""),
            "the rejection was reworded as a rate-limit error",
          );
        },
      ),
  );

  await check("embed() rejects an empty embedding", () =>
    withMocks(
      [openAIEmbeddingsRoute(withoutEmbeddingAt(0, "empty"))],
      async () => {
        const { value, message } = await settle(() =>
          provider.embed("a", OPENAI_EMBEDDING_MODEL),
        );
        expect(
          value === undefined,
          "embed returned a vector although the embedding had no values",
        );
        expect(
          message !== undefined,
          "embed did not reject an embedding without values",
        );
      },
    ),
  );

  // These two were already refused (every surviving row was dropped, leaving
  // none), so they pin that behaviour rather than prove a change.
  await check(
    "embed() rejects a response whose only row has no embedding",
    () =>
      withMocks(
        [openAIEmbeddingsRoute(withoutEmbeddingAt(0, "missing"))],
        async () => {
          const { value, message } = await settle(() =>
            provider.embed("a", OPENAI_EMBEDDING_MODEL),
          );
          expect(
            value === undefined && message !== undefined,
            "embed did not reject a response whose only row had no embedding",
          );
        },
      ),
  );

  await check(
    "embedMany() rejects a response whose rows all lack an embedding",
    () =>
      withMocks(
        [
          openAIEmbeddingsRoute((rows) =>
            rows.map((row) => ({ object: row.object, index: row.index })),
          ),
        ],
        async () => {
          const { value, message } = await settle(() =>
            provider.embedMany(["a", "b"], OPENAI_EMBEDDING_MODEL),
          );
          expect(
            value === undefined && message !== undefined,
            "embedMany did not reject a response whose rows all lacked an embedding",
          );
        },
      ),
  );
}

// ───────────────────────────────────────────────────────────────────────
// Section: LiteLLM and Ollama native embeddings — response rows against the
// inputs. Both answer the OpenAI-shaped POST /embeddings, so the rows are the
// ones the OpenAI section builds.
// ───────────────────────────────────────────────────────────────────────

type CompatEmbeddingSpec = {
  provider: "litellm" | "ollama";
  /** Only builds the provider: every call below names the embedding model. */
  chatModel: string;
  embeddingModel: string;
  /** Substring of the URL the client POSTs the texts to. */
  embeddingsUrl: string;
  env: Record<string, string | undefined>;
  /** Requests the client makes besides the embeddings POST. */
  sideRoutes: Parameters<typeof installMockFetch>[0];
};

type CompatEmbeddingProvider = {
  embed: (text: string, modelName?: string) => Promise<number[]>;
  embedMany: (texts: string[], modelName?: string) => Promise<number[][]>;
};

// Non-default ports, so a real LiteLLM or Ollama on its usual port can never
// answer a call the mock table should have caught.
const COMPAT_EMBEDDING_PROVIDERS: CompatEmbeddingSpec[] = [
  {
    provider: "litellm",
    chatModel: "openai/gpt-4o-mini",
    embeddingModel: "mock-embedding-model",
    embeddingsUrl: "127.0.0.1:4010/embeddings",
    env: {
      LITELLM_API_KEY: "test-fake-litellm-credential",
      LITELLM_BASE_URL: "http://127.0.0.1:4010",
      LITELLM_EMBEDDING_MODEL: undefined,
    },
    // LiteLLM asks for the model limits as soon as the provider is built.
    sideRoutes: [
      {
        method: "GET",
        url: "127.0.0.1:4010/model/info",
        respond: { status: 200, json: { data: [] } },
      },
    ],
  },
  {
    provider: "ollama",
    chatModel: "llama3.1:8b",
    embeddingModel: "mock-embedding-model",
    embeddingsUrl: "127.0.0.1:11439/v1/embeddings",
    env: {
      OLLAMA_BASE_URL: "http://127.0.0.1:11439",
      OLLAMA_API_KEY: undefined,
      OLLAMA_EMBEDDING_MODEL: undefined,
    },
    sideRoutes: [],
  },
];

/**
 * Answers the embeddings POST with one row per input, the first character's
 * code as its only value; `reshape` turns that healthy answer into the one a
 * case needs.
 */
function compatEmbeddingsRoute(
  spec: CompatEmbeddingSpec,
  reshape: (rows: OpenAIEmbeddingRow[]) => OpenAIEmbeddingRow[] = (rows) =>
    rows,
) {
  return {
    method: "POST",
    url: spec.embeddingsUrl,
    respond: (call: { bodyJson: unknown }) => {
      const input = (call.bodyJson as { input?: string | string[] }).input;
      const texts = Array.isArray(input) ? input : [input ?? ""];
      const rows = texts.map((text, index) => ({
        object: "embedding" as const,
        index,
        embedding: [text.charCodeAt(0)],
      }));
      return {
        status: 200,
        json: {
          object: "list",
          model: spec.embeddingModel,
          data: reshape(rows),
          usage: { prompt_tokens: texts.length, total_tokens: texts.length },
        },
      };
    },
  };
}

async function runCompatEmbeddingRows(
  spec: CompatEmbeddingSpec,
): Promise<void> {
  console.log(`\n=== EMBED ${spec.provider} (native /embeddings) ===`);
  // Put the variables back as this section found them: the full run goes on
  // to later sections with whatever is left in process.env.
  const before = Object.keys(spec.env).map(
    (name) => [name, process.env[name]] as const,
  );
  for (const [name, value] of Object.entries(spec.env)) {
    setEnv(name, value);
  }
  try {
    await checkCompatEmbeddingRows(spec);
  } finally {
    for (const [name, value] of before) {
      setEnv(name, value);
    }
  }
}

async function checkCompatEmbeddingRows(
  spec: CompatEmbeddingSpec,
): Promise<void> {
  const section = `EMBED ${spec.provider}`;
  const { ProviderFactory } = await import("../dist/index.js");

  async function withEmbeddingMock<T>(
    reshape: Parameters<typeof compatEmbeddingsRoute>[1],
    run: (
      provider: CompatEmbeddingProvider,
      posted: () => ReturnType<typeof installMockFetch>["calls"],
    ) => Promise<T>,
  ): Promise<T> {
    return withMocks(
      [compatEmbeddingsRoute(spec, reshape), ...spec.sideRoutes],
      async ({ calls }) => {
        // Built inside the mock, which is what answers LiteLLM's model
        // limits request.
        const provider = (await ProviderFactory.createProvider(
          spec.provider,
          spec.chatModel,
        )) as unknown as CompatEmbeddingProvider;
        return run(provider, () =>
          calls.filter((call) => call.url.includes(spec.embeddingsUrl)),
        );
      },
    );
  }

  async function settle<T>(
    run: () => Promise<T>,
  ): Promise<{ value: T | undefined; message: string | undefined }> {
    try {
      return { value: await run(), message: undefined };
    } catch (err) {
      return {
        value: undefined,
        message: err instanceof Error ? err.message : String(err),
      };
    }
  }

  async function check(name: string, run: () => Promise<void>): Promise<void> {
    try {
      await run();
      record(results, `${section}: ${name}`, true);
    } catch (err) {
      record(
        results,
        `${section}: ${name}`,
        false,
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  // A ProviderError puts the provider tag in front of its message once; the
  // same error wrapped in a second one would carry the tag twice.
  const isSingleProviderError = (message: string | undefined): boolean =>
    (message ?? "").split(`[${spec.provider}]`).length === 2;

  await check("embed() returns the vector for a healthy response", () =>
    withEmbeddingMock(undefined, async (provider, posted) => {
      const { value } = await settle(() =>
        provider.embed("a", spec.embeddingModel),
      );
      const sent = posted();
      expect(sent.length === 1, "embed did not send exactly one request");
      const body = sent[0]?.bodyJson as
        | { model?: string; input?: unknown }
        | undefined;
      expect(
        body?.model === spec.embeddingModel && body.input === "a",
        "embed did not send the model and the text",
      );
      expect(
        value !== undefined && value.length === 1 && value[0] === 97,
        "embed did not return the vector for a healthy response",
      );
    }),
  );

  await check("embedMany() returns one vector per text, in order", () =>
    withEmbeddingMock(undefined, async (provider, posted) => {
      const { value } = await settle(() =>
        provider.embedMany(["a", "b", "c"], spec.embeddingModel),
      );
      const sent = (posted()[0]?.bodyJson as { input?: unknown } | undefined)
        ?.input;
      expect(
        Array.isArray(sent) && sent.length === 3,
        "embedMany did not send the three texts as one batch",
      );
      expect(
        value !== undefined && value.map((v) => v[0]).join(",") === "97,98,99",
        "embedMany did not return one vector per text, in order",
      );
    }),
  );

  for (const shape of ["missing", "empty"] as const) {
    await check(
      `embedMany() rejects an embedding that is ${shape} and names its index`,
      async () => {
        const { value, message } = await withEmbeddingMock(
          withoutEmbeddingAt(1, shape),
          (provider) =>
            settle(() =>
              provider.embedMany(["a", "b", "c"], spec.embeddingModel),
            ),
        );
        expect(
          value === undefined,
          "embedMany returned vectors although one embedding had no values",
        );
        expect(
          message !== undefined,
          "embedMany did not reject an embedding without values",
        );
        expect(
          /\bindex 1\b/.test(message ?? ""),
          "the rejection did not name the index of the embedding without values",
        );
        expect(
          isSingleProviderError(message),
          "the rejection did not carry the provider tag exactly once",
        );
      },
    );
  }

  await check(
    "embedMany() rejects a response with fewer vectors than texts and names the counts",
    async () => {
      const { value, message } = await withEmbeddingMock(
        (rows) => rows.slice(0, -1),
        (provider) =>
          settle(() =>
            provider.embedMany(["a", "b", "c"], spec.embeddingModel),
          ),
      );
      expect(
        value === undefined,
        "embedMany returned vectors although the response held fewer than one per text",
      );
      expect(
        message !== undefined,
        "embedMany did not reject a response with fewer vectors than texts",
      );
      expect(
        /\b2 vectors for 3 texts\b/.test(message ?? ""),
        "the rejection did not name the number of vectors and texts",
      );
      expect(
        isSingleProviderError(message),
        "the rejection did not carry the provider tag exactly once",
      );
    },
  );

  await check(
    "embedMany() rejects a response with more vectors than texts and names the counts",
    async () => {
      const { value, message } = await withEmbeddingMock(
        (rows) => [
          ...rows,
          { object: "embedding", index: rows.length, embedding: [1] },
        ],
        (provider) =>
          settle(() =>
            provider.embedMany(["a", "b", "c"], spec.embeddingModel),
          ),
      );
      expect(
        value === undefined,
        "embedMany returned vectors although the response held more than one per text",
      );
      expect(
        message !== undefined,
        "embedMany did not reject a response with more vectors than texts",
      );
      expect(
        /\b4 vectors for 3 texts\b/.test(message ?? ""),
        "the rejection did not name the number of vectors and texts",
      );
    },
  );

  await check(
    "embedMany() keeps the real index in the rejection for an index that looks like a status code",
    async () => {
      const texts = Array.from({ length: 430 }, (_, i) => `t${i}`);
      const { value, message } = await withEmbeddingMock(
        withoutEmbeddingAt(429, "empty"),
        (provider) =>
          settle(() => provider.embedMany(texts, spec.embeddingModel)),
      );
      expect(
        value === undefined && message !== undefined,
        "embedMany did not reject an embedding without values in a large batch",
      );
      expect(
        /\bindex 429\b/.test(message ?? ""),
        "the rejection lost the index when it resembled a status code",
      );
      expect(
        !/rate limit/i.test(message ?? ""),
        "the rejection was reworded as a rate-limit error",
      );
    },
  );

  await check("embed() rejects an empty embedding", async () => {
    const { value, message } = await withEmbeddingMock(
      withoutEmbeddingAt(0, "empty"),
      (provider) => settle(() => provider.embed("a", spec.embeddingModel)),
    );
    expect(
      value === undefined,
      "embed returned a vector although the embedding had no values",
    );
    expect(
      message !== undefined,
      "embed did not reject an embedding without values",
    );
    expect(
      /\bindex 0\b/.test(message ?? ""),
      "the rejection did not name the index of the embedding without values",
    );
  });

  await check(
    "embed() rejects a response with more than one vector for the text",
    async () => {
      const { value, message } = await withEmbeddingMock(
        (rows) => [
          ...rows,
          { object: "embedding", index: rows.length, embedding: [1] },
        ],
        (provider) => settle(() => provider.embed("a", spec.embeddingModel)),
      );
      expect(
        value === undefined,
        "embed returned a vector although the response held more than one",
      );
      expect(
        message !== undefined,
        "embed did not reject a response with more than one vector",
      );
      expect(
        /\b2 vectors for 1 texts\b/.test(message ?? ""),
        "the rejection did not name the number of vectors and texts",
      );
    },
  );

  // These two were already refused (every surviving row was dropped, leaving
  // none), so they pin that behaviour rather than prove a change.
  await check(
    "embed() rejects a response whose only row has no embedding",
    async () => {
      const { value, message } = await withEmbeddingMock(
        withoutEmbeddingAt(0, "missing"),
        (provider) => settle(() => provider.embed("a", spec.embeddingModel)),
      );
      expect(
        value === undefined && message !== undefined,
        "embed did not reject a response whose only row had no embedding",
      );
    },
  );

  await check(
    "embedMany() rejects a response whose rows all lack an embedding",
    async () => {
      const { value, message } = await withEmbeddingMock(
        (rows) => rows.map((row) => ({ object: row.object, index: row.index })),
        (provider) =>
          settle(() => provider.embedMany(["a", "b"], spec.embeddingModel)),
      );
      expect(
        value === undefined && message !== undefined,
        "embedMany did not reject a response whose rows all lacked an embedding",
      );
    },
  );
}

// ───────────────────────────────────────────────────────────────────────
// Section: TypeSafe (decide-only)
// ───────────────────────────────────────────────────────────────────────

/**
 * TypeSafe serves the `decide` inference type, not text. The contract worth
 * pinning is the wire translation in both directions — our provider-neutral
 * `boolean` primitive becomes TypeSafe's `noul` on the way out and its
 * `noul` answer becomes `probability` on the way back — plus the two
 * distinct error envelopes the real API returns.
 */
const TYPESAFE_DECIDE_SPEC = {
  provider: "typesafe",
  envVar: "TYPESAFE_API_KEY",
  urlMatch: "api.typesafe.ai/v1/systemone",
  model: "jev-latest",
};

async function runTypeSafeDecide(): Promise<void> {
  setEnv(TYPESAFE_DECIDE_SPEC.envVar, "test-fake-typesafe-credential");

  // ── happy path: all three primitives, and the boolean↔noul mapping ──
  try {
    await withMocks(
      [
        {
          method: "POST",
          url: TYPESAFE_DECIDE_SPEC.urlMatch,
          respond: {
            status: 200,
            json: {
              model: "jev-1.13.0",
              answers: {
                urgent: { type: "noul", noul: 0.97 },
                team: {
                  type: "choice",
                  choice: "billing",
                  confidence: 0.81,
                  probabilities: { billing: 0.87, technical: 0.13, sales: 0 },
                },
                mood: {
                  type: "score",
                  score: 2.4,
                  confidence: 0.78,
                  legend: { "0": "calm", "1": "annoyed", "2": "angry" },
                  probabilities: { "0": 0.05, "1": 0.3, "2": 0.65 },
                },
              },
              usage: { input_tokens: 312, output_tokens: 48 },
            },
          },
        },
      ],
      async ({ calls }) => {
        const { ProviderFactory } =
          await import("../dist/factories/providerFactory.js");
        const provider = await ProviderFactory.createProvider(
          TYPESAFE_DECIDE_SPEC.provider,
          TYPESAFE_DECIDE_SPEC.model,
        );
        const result = await provider.decide!({
          state: "payouts have failed for three days",
          questions: {
            urgent: { type: "boolean", instructions: "Is this urgent?" },
            team: {
              type: "choice",
              instructions: "Which team?",
              criteria: {
                billing: "money",
                technical: "bugs",
                sales: "pricing",
              },
            },
            mood: {
              type: "score",
              instructions: "How angry?",
              criteria: ["calm", "annoyed", "angry"],
            },
          },
        });

        expect(calls.length === 1, "single POST to /v1/systemone");
        const body = calls[0].bodyJson as {
          model: string;
          questions: Record<string, { type: string }>;
        };
        expectEq(body.model, TYPESAFE_DECIDE_SPEC.model, "decide body.model");
        // The translation that matters: our `boolean` must leave as `noul`.
        expectEq(body.questions.urgent.type, "noul", "boolean sent as noul");
        expectEq(body.questions.team.type, "choice", "choice sent unchanged");
        expectEq(body.questions.mood.type, "score", "score sent unchanged");

        // …and TypeSafe's `noul` answer must arrive as `probability`.
        const urgent = result.answers.urgent;
        expectEq(urgent.type, "boolean", "noul answer typed as boolean");
        expectEq(
          urgent.type === "boolean" ? urgent.probability : -1,
          0.97,
          "noul mapped to probability",
        );
        expectEq(result.model, "jev-1.13.0", "resolved model reported");
        expectEq(result.usage.inputTokens, 312, "usage.input_tokens mapped");
        record(results, "DECIDE typesafe: wire translation both ways", true);
      },
    );
  } catch (err) {
    record(
      results,
      "DECIDE typesafe: wire translation both ways",
      false,
      err instanceof Error ? err.message : String(err),
    );
  }

  // ── error envelope A: application error, `detail` is an OBJECT ───────
  try {
    await withMocks(
      [
        {
          method: "POST",
          url: TYPESAFE_DECIDE_SPEC.urlMatch,
          respond: {
            status: 400,
            json: { detail: { error_type: "max_tokens_exceeded" } },
          },
        },
      ],
      async () => {
        const { ProviderFactory } =
          await import("../dist/factories/providerFactory.js");
        const provider = await ProviderFactory.createProvider(
          TYPESAFE_DECIDE_SPEC.provider,
        );
        let kind: string | undefined;
        let message = "";
        try {
          await provider.decide!({
            state: "x",
            questions: { q: { type: "boolean", instructions: "?" } },
          });
        } catch (error) {
          kind = (error as { cause?: { kind?: string } }).cause?.kind;
          message = error instanceof Error ? error.message : "";
        }
        expectEq(kind, "max_tokens_exceeded", "object envelope classified");
        // The real API sends this one with no `message` at all, so the
        // provider must supply a sentence rather than leaving it undefined.
        expect(message.length > 20, "size error carries a real message");
        record(results, "DECIDE typesafe: object error envelope", true);
      },
    );
  } catch (err) {
    record(
      results,
      "DECIDE typesafe: object error envelope",
      false,
      err instanceof Error ? err.message : String(err),
    );
  }

  // ── error envelope B: schema validation, `detail` is an ARRAY ────────
  try {
    await withMocks(
      [
        {
          method: "POST",
          url: TYPESAFE_DECIDE_SPEC.urlMatch,
          respond: {
            status: 422,
            json: {
              detail: [
                {
                  type: "missing",
                  loc: ["body", "questions", "q", "choice", "criteria"],
                  msg: "Field required",
                  input: { secret: "state text must never be logged" },
                },
              ],
            },
          },
        },
      ],
      async () => {
        const { ProviderFactory } =
          await import("../dist/factories/providerFactory.js");
        const provider = await ProviderFactory.createProvider(
          TYPESAFE_DECIDE_SPEC.provider,
        );
        let kind: string | undefined;
        let message = "";
        try {
          await provider.decide!({
            state: "x",
            questions: { q: { type: "boolean", instructions: "?" } },
          });
        } catch (error) {
          kind = (error as { cause?: { kind?: string } }).cause?.kind;
          message = error instanceof Error ? error.message : "";
        }
        expectEq(kind, "invalid_request", "array envelope classified");
        expect(message.includes("criteria"), "names the offending field");
        // The validation envelope echoes the caller's input back; it must
        // never reach a log or an error message.
        expect(!message.includes("secret"), "echoed input is not surfaced");
        record(results, "DECIDE typesafe: array error envelope", true);
      },
    );
  } catch (err) {
    record(
      results,
      "DECIDE typesafe: array error envelope",
      false,
      err instanceof Error ? err.message : String(err),
    );
  }

  await runTypeSafeGatewayDecide();
  await runTypeSafeGatewayUrlOverride();
}

/**
 * The gateway route is configurable like every other endpoint:
 * `credentials.typesafe.gatewayURL` first, then `TYPESAFE_GATEWAY_URL`, then
 * Vercel's route.
 */
async function runTypeSafeGatewayUrlOverride(): Promise<void> {
  const gatewayBody = {
    answers: { urgent: { type: "boolean", probability: 0.9 } },
    usage: { inputTokens: 10, outputTokens: 2 },
  };
  const questions = {
    urgent: { type: "boolean", instructions: "Is this urgent?" },
  } as const;

  {
    const name = "DECIDE typesafe gateway: TYPESAFE_GATEWAY_URL sets the route";
    try {
      setEnv("TYPESAFE_API_KEY", undefined);
      setEnv("AI_GATEWAY_API_KEY", "test-fake-gateway-credential");
      setEnv(
        "TYPESAFE_GATEWAY_URL",
        "https://gateway.internal.example/v4/ai/evaluation-model/",
      );
      await withMocks(
        [
          {
            method: "POST",
            url: "evaluation-model",
            respond: { status: 200, json: gatewayBody },
          },
        ],
        async ({ calls }) => {
          const { ProviderFactory } =
            await import("../dist/factories/providerFactory.js");
          const provider = await ProviderFactory.createProvider("typesafe");
          await provider.decide!({ state: "payouts failed", questions });
          expectEq(
            calls[0]?.url,
            "https://gateway.internal.example/v4/ai/evaluation-model",
            "the configured route, trailing slash trimmed",
          );
          record(results, name, true);
        },
      );
    } catch (err) {
      record(
        results,
        name,
        false,
        err instanceof Error ? err.message : String(err),
      );
    } finally {
      setEnv("TYPESAFE_GATEWAY_URL", undefined);
      setEnv("AI_GATEWAY_API_KEY", undefined);
    }
  }

  {
    const name =
      "DECIDE typesafe gateway: credentials.typesafe.gatewayURL wins over the env";
    try {
      setEnv("TYPESAFE_API_KEY", undefined);
      setEnv("AI_GATEWAY_API_KEY", undefined);
      setEnv("TYPESAFE_GATEWAY_URL", "https://env-gateway.example/route");
      await withMocks(
        [
          {
            method: "POST",
            url: "gateway.example/route",
            respond: { status: 200, json: gatewayBody },
          },
        ],
        async ({ calls }) => {
          const { NeuroLink } = await import("../dist/index.js");
          const nl = new NeuroLink({
            credentials: {
              typesafe: {
                transport: "gateway",
                gatewayApiKey: "test-fake-config-gateway-credential",
                gatewayURL: "https://config-gateway.example/route",
              },
            },
          });
          await nl.decide({
            provider: "typesafe",
            state: "payouts failed",
            questions,
          });
          // A NeuroLink instance may also fetch its model config in the
          // background; only the decision is a POST.
          const post = calls.find((c) => c.method === "POST");
          expectEq(
            post?.url,
            "https://config-gateway.example/route",
            "SDK config wins over TYPESAFE_GATEWAY_URL",
          );
          record(results, name, true);
        },
      );
    } catch (err) {
      record(
        results,
        name,
        false,
        err instanceof Error ? err.message : String(err),
      );
    } finally {
      setEnv("TYPESAFE_GATEWAY_URL", undefined);
    }
  }
}

/**
 * The Vercel AI Gateway transport.
 *
 * It reaches the same model over a different wire, and every difference is
 * load-bearing: the model is named in a header rather than the body (sending
 * it in the body is rejected), `ai-gateway-protocol-version` omitted fails the
 * request outright rather than defaulting, the question vocabulary is already
 * the neutral one so `boolean` must NOT be renamed to `noul`, and answers
 * carry no `confidence` at all — it has to be derived from the distribution.
 *
 * This is a mocked contract rather than a live test because it pins a wire
 * format, and a live call would only prove that one account's key works.
 */
async function runTypeSafeGatewayDecide(): Promise<void> {
  const section = "DECIDE typesafe gateway";
  // Only a gateway key: this is also the assertion that transport resolution
  // activates on the gateway key ALONE, with no TypeSafe key present.
  setEnv("TYPESAFE_API_KEY", undefined);
  setEnv("AI_GATEWAY_API_KEY", "test-fake-gateway-credential");

  try {
    await withMocks(
      [
        {
          method: "POST",
          url: "ai-gateway.vercel.sh/v4/ai/evaluation-model",
          respond: {
            status: 200,
            json: {
              answers: {
                urgent: { type: "boolean", probability: 0.94 },
                team: {
                  type: "choice",
                  choice: "billing",
                  // No `confidence` — the gateway never sends one.
                  probabilities: { billing: 0.72, technical: 0.2, sales: 0.08 },
                },
              },
              // The real gateway spells usage in camelCase and relocates
              // confidence to providerMetadata — both measured live.
              usage: { inputTokens: 210, outputTokens: 51 },
              providerMetadata: {
                typesafe: { confidence: { team: 0.1 } },
              },
            },
          },
        },
      ],
      async ({ calls }) => {
        const { ProviderFactory } =
          await import("../dist/factories/providerFactory.js");
        const provider = await ProviderFactory.createProvider("typesafe");
        const result = await provider.decide!({
          state: "payouts have failed for three days",
          questions: {
            urgent: { type: "boolean", instructions: "Is this urgent?" },
            team: {
              type: "choice",
              instructions: "Which team?",
              criteria: { billing: "money", technical: "bugs", sales: "price" },
            },
          },
        });

        expect(calls.length === 1, "single POST to the gateway route");
        const call = calls[0];
        const headers = call.headers as Record<string, string>;
        const headerOf = (name: string): string | undefined =>
          headers[name] ?? headers[name.toLowerCase()];

        expectEq(
          headerOf("ai-model-id"),
          "typesafe-ai/jev",
          "gateway model id header",
        );
        expectEq(
          headerOf("ai-gateway-protocol-version"),
          "0.0.1",
          "gateway protocol version header",
        );
        expectEq(
          headerOf("ai-gateway-auth-method"),
          "api-key",
          "gateway auth method header",
        );
        expectEq(
          headerOf("ai-evaluation-model-specification-version"),
          "4",
          "gateway evaluation spec version header",
        );

        const body = call.bodyJson as {
          model?: unknown;
          questions: Record<string, { type: string }>;
        };
        // The gateway rejects a body carrying a model.
        expect(body.model === undefined, "gateway body omits model");
        // …and it already uses the neutral name, so no rename must happen.
        expectEq(
          body.questions.urgent.type,
          "boolean",
          "boolean NOT renamed to noul on the gateway",
        );

        const urgent = result.answers.urgent;
        expectEq(urgent.type, "boolean", "gateway probability typed boolean");
        expectEq(
          urgent.type === "boolean" ? urgent.probability : -1,
          0.94,
          "gateway probability field read",
        );
        const team = result.answers.team;
        // The gateway relocates confidence rather than omitting it. Taking the
        // distribution peak (0.72) instead of the reported 0.1 overstated it
        // sevenfold — and 0.72 clears every routing bar that 0.1 fails, so the
        // router acted on near-random picks as if they were confident ones.
        expectEq(
          team.type === "choice" ? team.confidence : -1,
          0.1,
          "vendor confidence from providerMetadata beats the derived peak",
        );
        // Usage is camelCase on the gateway. Reading only snake_case reported
        // zero tokens, and decisions are priced on input alone — so every
        // gateway decision was costed at exactly $0 without anything failing.
        expectEq(
          result.usage?.inputTokens,
          210,
          "gateway camelCase usage read",
        );
        expectEq(
          result.usage?.outputTokens,
          51,
          "gateway camelCase output usage read",
        );
        record(results, `${section}: wire contract`, true);
      },
    );
  } catch (err) {
    record(
      results,
      `${section}: wire contract`,
      false,
      err instanceof Error ? err.message : String(err),
    );
  }

  // An explicit transport choice must win over key-presence inference.
  try {
    setEnv("TYPESAFE_API_KEY", "test-fake-typesafe-credential");
    setEnv("TYPESAFE_TRANSPORT", "gateway");
    await withMocks(
      [
        {
          method: "POST",
          url: "ai-gateway.vercel.sh/v4/ai/evaluation-model",
          respond: {
            status: 200,
            json: {
              answers: { q: { type: "boolean", probability: 0.1 } },
              usage: { input_tokens: 10, output_tokens: 0 },
            },
          },
        },
      ],
      async ({ calls }) => {
        const { ProviderFactory } =
          await import("../dist/factories/providerFactory.js");
        const provider = await ProviderFactory.createProvider("typesafe");
        await provider.decide!({
          state: "x",
          questions: { q: { type: "boolean", instructions: "?" } },
        });
        expect(
          calls.length === 1,
          "explicit gateway transport used despite a direct key being present",
        );
        record(results, `${section}: explicit transport wins`, true);
      },
    );
  } catch (err) {
    record(
      results,
      `${section}: explicit transport wins`,
      false,
      err instanceof Error ? err.message : String(err),
    );
  } finally {
    setEnv("TYPESAFE_TRANSPORT", undefined);
    setEnv("AI_GATEWAY_API_KEY", undefined);
  }

  // …and the derived peak must remain the fallback for a response that
  // reports no confidence anywhere. Both paths have to keep working: the
  // relocation was discovered late, and a gateway build that stops sending
  // providerMetadata must degrade to the old behaviour rather than to zero.
  try {
    setEnv("TYPESAFE_API_KEY", undefined);
    setEnv("AI_GATEWAY_API_KEY", "test-fake-gateway-credential");
    await withMocks(
      [
        {
          method: "POST",
          url: "ai-gateway.vercel.sh/v4/ai/evaluation-model",
          respond: {
            status: 200,
            json: {
              answers: {
                team: {
                  type: "choice",
                  choice: "billing",
                  probabilities: { billing: 0.72, technical: 0.2, sales: 0.08 },
                },
              },
              usage: { inputTokens: 10, outputTokens: 0 },
            },
          },
        },
      ],
      async () => {
        const { ProviderFactory } =
          await import("../dist/factories/providerFactory.js");
        const provider = await ProviderFactory.createProvider("typesafe");
        const result = await provider.decide!({
          state: "x",
          questions: {
            team: {
              type: "choice",
              instructions: "Which team?",
              criteria: { billing: "money", technical: "bugs", sales: "price" },
            },
          },
        });
        const team = result.answers.team;
        expectEq(
          team.type === "choice" ? team.confidence : -1,
          0.72,
          "derived peak still used when nothing reports a confidence",
        );
        record(results, `${section}: derivation remains the fallback`, true);
      },
    );
  } catch (err) {
    record(
      results,
      `${section}: derivation remains the fallback`,
      false,
      err instanceof Error ? err.message : String(err),
    );
  } finally {
    setEnv("AI_GATEWAY_API_KEY", undefined);
  }

  await runTypeSafeGatewayErrors();
}

/**
 * The gateway's error envelope.
 *
 * `{"error":{"message","type"}}` is a third shape, unrelated to TypeSafe's own
 * `{"detail":…}`, and it was reached only when the gateway was first exercised
 * against a real account. Until then every gateway failure was reported as a
 * bare `HTTP <status>` with the cause discarded, and a 403 for an account with
 * no card on file — a valid key — tripped the auth circuit breaker under the
 * message "API key rejected".
 *
 * Both cases below were observed live before being pinned here.
 */
async function runTypeSafeGatewayErrors(): Promise<void> {
  const section = "DECIDE typesafe gateway errors";
  setEnv("TYPESAFE_API_KEY", undefined);
  setEnv("AI_GATEWAY_API_KEY", "test-fake-gateway-credential");

  // The live 403: a valid key on an account with no card on file.
  try {
    await withMocks(
      [
        {
          method: "POST",
          url: "ai-gateway.vercel.sh/v4/ai/evaluation-model",
          respond: {
            status: 403,
            json: {
              error: {
                message:
                  "AI Gateway requires a valid credit card on file to service requests.",
                type: "customer_verification_required",
              },
            },
          },
        },
      ],
      async () => {
        const { ProviderFactory } =
          await import("../dist/factories/providerFactory.js");
        const provider = await ProviderFactory.createProvider("typesafe");
        let thrown: unknown;
        try {
          await provider.decide!({
            state: "x",
            questions: { q: { type: "boolean", instructions: "?" } },
          });
        } catch (err) {
          thrown = err;
        }
        expect(thrown !== undefined, "gateway 403 throws");
        const cause = (
          thrown as { cause?: { kind?: string; message?: string } }
        ).cause;
        expectEq(cause?.kind, "authentication", "billing 403 kind");
        // The whole point: the gateway's own sentence survives to the caller
        // instead of being flattened to "HTTP 403".
        expect(
          (cause?.message ?? "").includes("credit card on file"),
          "gateway error message reaches the caller",
        );
        record(results, `${section}: billing 403 surfaces its cause`, true);
      },
    );
  } catch (err) {
    record(
      results,
      `${section}: billing 403 surfaces its cause`,
      false,
      err instanceof Error ? err.message : String(err),
    );
  }

  // `type` must beat `status`: a 403 carrying `invalid_request_error` is a bad
  // request, not a bad credential, so the breaker must NOT trip and the same
  // provider instance must still serve the next call.
  try {
    const { ProviderFactory } =
      await import("../dist/factories/providerFactory.js");
    const provider = await ProviderFactory.createProvider("typesafe");

    await withMocks(
      [
        {
          method: "POST",
          url: "ai-gateway.vercel.sh/v4/ai/evaluation-model",
          respond: {
            status: 403,
            json: {
              error: { message: "bad question", type: "invalid_request_error" },
            },
          },
        },
      ],
      async () => {
        let cause: { kind?: string } | undefined;
        try {
          await provider.decide!({
            state: "x",
            questions: { q: { type: "boolean", instructions: "?" } },
          });
        } catch (err) {
          cause = (err as { cause?: { kind?: string } }).cause;
        }
        expectEq(
          cause?.kind,
          "invalid_request",
          "gateway error type beats HTTP status",
        );
      },
    );

    await withMocks(
      [
        {
          method: "POST",
          url: "ai-gateway.vercel.sh/v4/ai/evaluation-model",
          respond: {
            status: 200,
            json: {
              answers: { q: { type: "boolean", probability: 0.4 } },
              usage: { input_tokens: 10, output_tokens: 0 },
            },
          },
        },
      ],
      async ({ calls }) => {
        const again = await provider.decide!({
          state: "x",
          questions: { q: { type: "boolean", instructions: "?" } },
        });
        expect(calls.length === 1, "provider instance still reaches the wire");
        expectEq(
          again.answers.q.type === "boolean" ? again.answers.q.probability : -1,
          0.4,
          "same instance serves the next call",
        );
        record(
          results,
          `${section}: non-auth 403 does not trip the breaker`,
          true,
        );
      },
    );
  } catch (err) {
    record(
      results,
      `${section}: non-auth 403 does not trip the breaker`,
      false,
      err instanceof Error ? err.message : String(err),
    );
  } finally {
    setEnv("AI_GATEWAY_API_KEY", undefined);
  }

  // ── a TYPESAFE_BASE_URL's credentials never reach the debug log, with a scheme or without ──
  {
    const name =
      "DECIDE typesafe: base URL credentials stay out of the debug log";
    const { logger } = await import("../dist/index.js");
    const originalDebug = console.debug;
    const priorDebugFlag = process.env.NEUROLINK_DEBUG;
    const priorBaseURL = process.env.TYPESAFE_BASE_URL;
    // The logger has no level getter; it takes NEUROLINK_LOG_LEVEL at load, else info.
    const loadLevel = process.env.NEUROLINK_LOG_LEVEL?.toLowerCase();
    const priorLogLevel =
      loadLevel === "debug" || loadLevel === "warn" || loadLevel === "error"
        ? loadLevel
        : "info";
    const lines: string[] = [];
    try {
      setEnv("NEUROLINK_DEBUG", "true");
      logger.setLogLevel("debug");
      console.debug = (...args: unknown[]) => {
        lines.push(
          args
            .map((a) => (typeof a === "string" ? a : JSON.stringify(a)))
            .join(" "),
        );
      };
      const { ProviderFactory } =
        await import("../dist/factories/providerFactory.js");
      const logged = async (base: string): Promise<string> => {
        lines.length = 0;
        setEnv("TYPESAFE_BASE_URL", base);
        await ProviderFactory.createProvider(
          TYPESAFE_DECIDE_SPEC.provider,
          TYPESAFE_DECIDE_SPEC.model,
        );
        return lines
          .filter((l) => l.includes("TypeSafe Provider initialized"))
          .join("\n");
      };
      const withScheme = await logged(
        "https://ops:hunter2-basic@typesafe.internal.test/ts?token=hunter2-query",
      );
      expect(withScheme.length > 0, "the construction log line is captured");
      expect(
        !withScheme.includes("hunter2"),
        "no credential from the base URL is logged",
      );
      expect(
        withScheme.includes("typesafe.internal.test/ts"),
        "the host and path stay in the log for diagnostics",
      );
      // A value with no `//` parses as the scheme `user:` with an opaque path,
      // which a redactor that rebuilds the URL from scheme and path hands back.
      // A file URL and a Windows drive path keep their `@`: it is not a credential.
      const bare = await logged(
        "user:hunter2-basic@typesafe.internal.test:8080",
      );
      expect(bare.length > 0, "a scheme-less value: the log line is captured");
      expect(
        !bare.includes("hunter2"),
        "no password from a scheme-less user:pass@host is logged",
      );
      expect(
        (await logged("file:///srv/node_modules/@scope/typesafe")).includes(
          "@scope/typesafe",
        ),
        "a file URL keeps its @",
      );
      expect(
        (await logged("C:\\srv\\ops@corp\\typesafe")).includes("ops@corp"),
        "a Windows drive path keeps its @",
      );
      record(results, name, true);
    } catch (err) {
      record(
        results,
        name,
        false,
        err instanceof Error ? err.message : String(err),
      );
    } finally {
      console.debug = originalDebug;
      logger.setLogLevel(priorLogLevel);
      setEnv("NEUROLINK_DEBUG", priorDebugFlag);
      setEnv("TYPESAFE_BASE_URL", priorBaseURL);
    }
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

// assertSafeUrl() resolves the download host with node:dns/promises before
// the (mocked) fetch runs. Answering that lookup with a fixed public address
// keeps the suite offline; the fixture host is under .invalid, which never
// resolves for real, so a download test passes only while this stub holds.

async function withPublicDns<T>(
  fn: (probe: { pinnedLookups: number }) => Promise<T>,
  rebind = false,
): Promise<T> {
  const original = dnsPromises.lookup;
  const lookupCounts = new Map<number, number>();
  const fixedLookup = async (
    _host: string,
    options?: { family?: number; all?: boolean },
  ) => {
    const family = options?.family ?? 4;
    const count = (lookupCounts.get(family) ?? 0) + 1;
    lookupCounts.set(family, count);
    const answer = {
      address: rebind && count > 1 ? "169.254.169.254" : "93.184.215.14",
      family: 4,
    };
    if (options?.all) {
      return options.family === 6 ? [] : [answer];
    }
    return answer;
  };
  dnsPromises.lookup = fixedLookup as typeof dnsPromises.lookup;
  syncBuiltinESMExports();
  try {
    return await withImageDownloadTransport(fn);
  } finally {
    dnsPromises.lookup = original;
    syncBuiltinESMExports();
  }
}

async function runIdeogramImageGen(): Promise<void> {
  await withPublicDns(runIdeogramImageGenCases);
}

async function runIdeogramImageGenCases(probe: {
  pinnedLookups: number;
}): Promise<void> {
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
              data: [{ url: `https://${IDEOGRAM_FIXTURE_HOST}/image.png` }],
            },
          },
        },
        {
          method: "GET",
          url: `${IDEOGRAM_FIXTURE_HOST}/image.png`,
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
          probe.pinnedLookups > 0,
          "CDN connection used the validated DNS lookup",
        );
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

  // ── oversized CDN download is cancelled at the size cap ─────────────
  // No Content-Length and a body far larger than the 25 MiB image cap: the
  // download must stop at the cap and cancel the stream rather than buffer
  // everything first.
  const MiB = 1024 * 1024;
  const streamLimit = 64 * MiB;
  const observed = { produced: 0, cancelled: false };
  try {
    await withMocks(
      [
        {
          method: "POST",
          url: "api.ideogram.ai/v1/ideogram-v3/generate",
          respond: {
            status: 200,
            json: {
              data: [{ url: `https://${IDEOGRAM_FIXTURE_HOST}/huge.png` }],
            },
          },
        },
        {
          method: "GET",
          url: `${IDEOGRAM_FIXTURE_HOST}/huge.png`,
          respond: {
            status: 200,
            contentType: "image/png",
            stream: () =>
              new ReadableStream<Uint8Array>({
                pull(controller) {
                  if (observed.produced >= streamLimit) {
                    controller.close();
                    return;
                  }
                  observed.produced += MiB;
                  controller.enqueue(new Uint8Array(MiB));
                },
                cancel() {
                  observed.cancelled = true;
                },
              }),
          },
        },
      ],
      async () => {
        const nl = new NeuroLink({ conversationMemory: { enabled: false } });
        let message = "";
        try {
          await nl.generate({
            provider: "ideogram",
            model: "V_3",
            input: { text: "A very large poster" },
            disableTools: true,
          });
        } catch (err) {
          message = err instanceof Error ? err.message : String(err);
        }
        expect(/size cap/i.test(message), "oversized download is rejected");
        // The socket close reaches the HTTPS fixture asynchronously.
        const deadline = Date.now() + 2_000;
        while (!observed.cancelled && Date.now() < deadline) {
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
        expect(observed.cancelled, "download stream was cancelled");
        expect(
          observed.produced < streamLimit,
          `download stopped early (${observed.produced / MiB} of ${streamLimit / MiB} MiB produced)`,
        );
        record(
          results,
          `${section}: oversized CDN download is cancelled at the size cap`,
          true,
        );
      },
    );
  } catch (err) {
    record(
      results,
      `${section}: oversized CDN download is cancelled at the size cap`,
      false,
      err instanceof Error ? err.message : String(err),
    );
  }

  // ── CDN download answers with a redirect ────────────────────────────
  // assertSafeUrl vets only the URL the API returned. A public host that
  // answers 302 to an internal address passes it, and a fetch that follows
  // redirects then reaches that address anyway. The download must ask for
  // redirect:"manual" and refuse a 3xx instead of following it.
  try {
    await withRedirectFollowingMocks(
      [
        {
          method: "POST",
          url: "api.ideogram.ai/v1/ideogram-v3/generate",
          respond: {
            status: 200,
            json: {
              data: [{ url: `https://${IDEOGRAM_FIXTURE_HOST}/moved.png` }],
            },
          },
        },
        {
          method: "GET",
          url: `${IDEOGRAM_FIXTURE_HOST}/moved.png`,
          respond: {
            status: 302,
            text: "",
            headers: { location: "https://169.254.169.254/latest/meta-data/" },
          },
        },
      ],
      async ({ calls }) => {
        const nl = new NeuroLink({ conversationMemory: { enabled: false } });
        let message = "";
        try {
          await nl.generate({
            provider: "ideogram",
            model: "V_3",
            input: { text: "A poster behind a redirect" },
            disableTools: true,
          });
        } catch (err) {
          message = err instanceof Error ? err.message : String(err);
        }
        const download = calls.find((c) => c.method === "GET");
        expect(!!download, "CDN download was attempted");
        expect(
          !calls.some((call) => call.url.includes("169.254.169.254")),
          "redirect target was never requested",
        );
        expect(/redirect/i.test(message), "a redirected download is refused");
        record(
          results,
          `${section}: CDN redirect is refused, not followed`,
          true,
        );
      },
    );
  } catch (err) {
    record(
      results,
      `${section}: CDN redirect is refused, not followed`,
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

  // ── url fallback download answers with a redirect ───────────────────
  // Same hole as Ideogram's CDN download: the guard vets the returned URL
  // only, so the follow-up fetch must not chase a 3xx to somewhere else.
  try {
    await withPublicDns(async () => {
      await withRedirectFollowingMocks(
        [
          {
            method: "POST",
            url: "external.api.recraft.ai/v1/images/generations",
            respond: {
              status: 200,
              json: {
                data: [{ url: `https://${RECRAFT_FIXTURE_HOST}/moved.webp` }],
              },
            },
          },
          {
            method: "GET",
            url: `${RECRAFT_FIXTURE_HOST}/moved.webp`,
            respond: {
              status: 302,
              text: "",
              headers: {
                location: "https://169.254.169.254/latest/meta-data/",
              },
            },
          },
        ],
        async ({ calls }) => {
          const nl = new NeuroLink({ conversationMemory: { enabled: false } });
          let message = "";
          try {
            await nl.generate({
              provider: "recraft",
              model: "recraftv3",
              input: { text: "An icon behind a redirect" },
              disableTools: true,
            });
          } catch (err) {
            message = err instanceof Error ? err.message : String(err);
          }
          const download = calls.find((c) => c.method === "GET");
          expect(!!download, "url download was attempted");
          expect(
            !calls.some((call) => call.url.includes("169.254.169.254")),
            "redirect target was never requested",
          );
          expect(/redirect/i.test(message), "a redirected download is refused");
        },
      );
    });
    record(
      results,
      `${section}: url-fallback redirect is refused, not followed`,
      true,
    );
  } catch (err) {
    record(
      results,
      `${section}: url-fallback redirect is refused, not followed`,
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

async function runImageDnsRebindingSection(): Promise<void> {
  const { NeuroLink } = await import("../dist/index.js");
  for (const fixture of [
    {
      provider: "ideogram",
      model: "V_3",
      host: IDEOGRAM_FIXTURE_HOST,
      endpoint: "api.ideogram.ai/v1/ideogram-v3/generate",
    },
    {
      provider: "recraft",
      model: "recraftv3",
      host: RECRAFT_FIXTURE_HOST,
      endpoint: "external.api.recraft.ai/v1/images/generations",
    },
  ]) {
    const label = `IMG ${fixture.provider}: download pins the public DNS answer despite rebinding`;
    try {
      await withPublicDns(async (probe) => {
        await withMocks(
          [
            {
              method: "POST",
              url: fixture.endpoint,
              respond: {
                status: 200,
                json: {
                  data: [{ url: `https://${fixture.host}/rebound.png` }],
                },
              },
            },
            {
              method: "GET",
              url: `${fixture.host}/rebound.png`,
              respond: {
                status: 200,
                bytes: FAKE_PNG_BYTES,
                contentType: "image/png",
              },
            },
          ],
          async ({ calls }) => {
            const nl = new NeuroLink({
              conversationMemory: { enabled: false },
            });
            const result = await nl.generate({
              provider: fixture.provider,
              model: fixture.model,
              input: { text: "An image from a rebinding host" },
              disableTools: true,
            });
            expectEq(
              result.imageOutput?.base64,
              FAKE_PNG_BASE64,
              "image bytes from the pinned connection",
            );
            expect(
              calls.some((c) => c.method === "GET"),
              "image download reached the fixture",
            );
            const rebound = await dnsPromises.lookup(fixture.host, {
              family: 4,
              all: true,
            });
            expectEq(
              rebound[0]?.address,
              "169.254.169.254",
              "subsequent DNS answer is private",
            );
            expect(
              probe.pinnedLookups > 0,
              "actual image connector used the validated public DNS answer",
            );
          },
        );
      }, true);
      record(results, label, true);
    } catch (err) {
      record(
        results,
        label,
        false,
        err instanceof Error ? err.message : String(err),
      );
    }
  }
}

// ───────────────────────────────────────────────────────────────────────
// Section: Laya (decide-only)
// ───────────────────────────────────────────────────────────────────────

/**
 * Laya answers on the same System One wire as TypeSafe's direct API, so the
 * `boolean`↔`noul` translation is shared. What this section pins is what is
 * Laya's own: the route (`<LAYA_BASE_URL>/predict`, no built-in endpoint), the
 * checkpoint reported under `routing.model`, the `auto` body rule, and the two
 * envelopes a failure can arrive in — LiteLLM's `{"error":{...}}` for anything
 * the proxy rejects, and FastAPI's `{"detail": ...}` for anything Laya's own
 * server rejects. The fixtures are the bodies a live deployment returned when
 * probed live.
 */
// Laya has no built-in endpoint: the base URL always comes from config, so the
// section sets LAYA_BASE_URL itself.
const LAYA_DECIDE_SPEC = {
  provider: "laya",
  envVar: "LAYA_API_KEY",
  baseURL: "https://laya.test.example/base",
  urlMatch: "laya.test.example/base/predict",
  model: "typed-decisions",
};

const LAYA_QUESTIONS = {
  urgent: { type: "boolean", instructions: "Is this urgent?" },
  team: {
    type: "choice",
    instructions: "Which team?",
    criteria: { billing: "money", technical: "bugs", sales: "pricing" },
  },
  mood: {
    type: "score",
    instructions: "How angry?",
    criteria: ["calm", "annoyed", "angry"],
  },
} satisfies DecisionQuestionMap;

/**
 * A success body in the shape Laya's servers return. A LiteLLM-proxied one puts the
 * checkpoint at the top level too; Laya's own laya-serve puts its agent class
 * there (`laya-rl-agent`), so only `routing.model` is reliable.
 */
function layaSuccessBody(
  checkpoint: string,
  topLevelModel: string = checkpoint,
): unknown {
  return {
    model: topLevelModel,
    answers: {
      urgent: {
        type: "noul",
        noul: 0.91,
        confidence: 0.91,
        action: { act_probability: 0.5 },
      },
      team: {
        type: "choice",
        choice: "billing",
        probabilities: { billing: 0.84, technical: 0.1, sales: 0.06 },
        confidence: 0.79,
        action: { act_probability: 0.5 },
      },
      mood: {
        type: "score",
        score: 1.7,
        legend: { "0": "calm", "1": "annoyed", "2": "angry" },
        probabilities: { "0": 0.1, "1": 0.1, "2": 0.8 },
        confidence: 0.7,
        action: { act_probability: 0.5 },
      },
    },
    usage: { input_tokens: 96, output_tokens: 0 },
    routing: {
      model: checkpoint,
      reason: `explicit model='${checkpoint}'`,
    },
  };
}

/** Run one decision expected to fail; return how it was classified. */
async function captureDecisionFailure(
  run: () => Promise<unknown>,
): Promise<{ kind: string | undefined; message: string }> {
  try {
    await run();
  } catch (error) {
    return {
      kind: (error as { cause?: { kind?: string } }).cause?.kind,
      message: error instanceof Error ? error.message : "",
    };
  }
  return { kind: undefined, message: "" };
}

async function createLaya(model?: string) {
  const { ProviderFactory } =
    await import("../dist/factories/providerFactory.js");
  return ProviderFactory.createProvider(LAYA_DECIDE_SPEC.provider, model);
}

async function runLayaDecide(): Promise<void> {
  setEnv("LAYA_BASE_URL", LAYA_DECIDE_SPEC.baseURL);

  // ── L0: no key — refused as authentication, and nothing is sent ──
  {
    const name = "DECIDE laya: no key, no request";
    try {
      setEnv(LAYA_DECIDE_SPEC.envVar, undefined);
      await withMocks(
        [
          {
            method: "POST",
            url: LAYA_DECIDE_SPEC.urlMatch,
            respond: { status: 200, json: layaSuccessBody("typed-decisions") },
          },
        ],
        async ({ calls }) => {
          const provider = await createLaya();
          const failure = await captureDecisionFailure(() =>
            provider.decide!({
              state: "x",
              questions: { q: LAYA_QUESTIONS.urgent },
            }),
          );
          expectEq(failure.kind, "authentication", "missing key classified");
          expect(
            failure.message.includes("LAYA_API_KEY"),
            "names the variable to set",
          );
          expectEq(calls.length, 0, "no network call without a key");
          record(results, name, true);
        },
      );
    } catch (err) {
      record(
        results,
        name,
        false,
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  setEnv(LAYA_DECIDE_SPEC.envVar, "test-fake-laya-credential");

  // ── L1: happy path — route, bearer, body, answers, checkpoint, request id ──
  {
    const name = "DECIDE laya: wire, answers and checkpoint";
    try {
      await withMocks(
        [
          {
            method: "POST",
            url: LAYA_DECIDE_SPEC.urlMatch,
            respond: {
              status: 200,
              json: layaSuccessBody("typed-decisions"),
              headers: { "x-litellm-call-id": "call-laya-1" },
            },
          },
        ],
        async ({ calls }) => {
          const provider = await createLaya();
          const result = await provider.decide!({
            state: "payouts have failed for three days",
            questions: LAYA_QUESTIONS,
          });
          expect(calls.length === 1, "single POST to /laya/predict");
          expectEq(
            calls[0].url,
            `${LAYA_DECIDE_SPEC.baseURL}/predict`,
            "endpoint from LAYA_BASE_URL",
          );
          const headers = calls[0].headers as Record<string, string>;
          expectEq(
            headers.Authorization ?? headers.authorization,
            "Bearer test-fake-laya-credential",
            "bearer credential",
          );
          const body = calls[0].bodyJson as {
            model?: string;
            questions: Record<string, { type: string }>;
          };
          expectEq(
            body.model,
            LAYA_DECIDE_SPEC.model,
            "default checkpoint sent",
          );
          expectEq(body.questions.urgent.type, "noul", "boolean sent as noul");
          const urgent = result.answers.urgent;
          expectEq(
            urgent.type === "boolean" ? urgent.probability : -1,
            0.91,
            "noul mapped to probability",
          );
          const team = result.answers.team;
          expectEq(
            team.type === "choice" ? team.choice : "",
            "billing",
            "choice",
          );
          expectEq(
            team.type === "choice" ? team.confidence : -1,
            0.79,
            "vendor confidence kept",
          );
          const mood = result.answers.mood;
          expectEq(mood.type === "score" ? mood.score : -1, 1.7, "score");
          expectEq(
            result.model,
            "typed-decisions",
            "checkpoint from routing.model",
          );
          expectEq(result.provider, "laya", "provider name");
          expectEq(result.usage.inputTokens, 96, "usage.input_tokens mapped");
          expectEq(result.requestId, "call-laya-1", "LiteLLM call id kept");
          record(results, name, true);
        },
      );
    } catch (err) {
      record(
        results,
        name,
        false,
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  // ── L2: `auto` sends no model, so Laya's own router picks ──
  {
    const name = "DECIDE laya: auto leaves the checkpoint to Laya";
    try {
      await withMocks(
        [
          {
            method: "POST",
            url: LAYA_DECIDE_SPEC.urlMatch,
            respond: {
              status: 200,
              json: layaSuccessBody("english", "laya-rl-agent"),
            },
          },
        ],
        async ({ calls }) => {
          const provider = await createLaya("auto");
          const result = await provider.decide!({
            state: "short",
            questions: { urgent: LAYA_QUESTIONS.urgent },
          });
          const body = calls[0].bodyJson as Record<string, unknown>;
          expect(!("model" in body), "auto must not send a model field");
          expectEq(
            result.model,
            "english",
            "the checkpoint Laya chose is reported",
          );
          record(results, name, true);
        },
      );
    } catch (err) {
      record(
        results,
        name,
        false,
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  // ── L3: LAYA_BASE_URL override, trailing slash trimmed ──
  {
    const name = "DECIDE laya: LAYA_BASE_URL override";
    try {
      setEnv("LAYA_BASE_URL", "https://laya.internal.example/");
      await withMocks(
        [
          {
            method: "POST",
            url: "laya.internal.example/predict",
            respond: { status: 200, json: layaSuccessBody("typed-decisions") },
          },
        ],
        async ({ calls }) => {
          const provider = await createLaya();
          await provider.decide!({
            state: "short",
            questions: { urgent: LAYA_QUESTIONS.urgent },
          });
          expectEq(
            calls[0]?.url,
            "https://laya.internal.example/predict",
            "self-hosted endpoint, no doubled slash",
          );
          record(results, name, true);
        },
      );
    } catch (err) {
      record(
        results,
        name,
        false,
        err instanceof Error ? err.message : String(err),
      );
    } finally {
      setEnv("LAYA_BASE_URL", LAYA_DECIDE_SPEC.baseURL);
    }
  }

  // ── L3b: no base URL — unset or blank — is refused before any request ──
  {
    const name = "DECIDE laya: no base URL, no request";
    try {
      for (const unset of [undefined, "   "]) {
        setEnv("LAYA_BASE_URL", unset);
        await withMocks(
          [
            {
              method: "POST",
              url: "/predict",
              respond: {
                status: 200,
                json: layaSuccessBody("typed-decisions"),
              },
            },
          ],
          async ({ calls }) => {
            const provider = await createLaya();
            const failure = await captureDecisionFailure(() =>
              provider.decide!({
                state: "short",
                questions: { urgent: LAYA_QUESTIONS.urgent },
              }),
            );
            expectEq(
              failure.kind,
              "invalid_request",
              "missing base URL classified",
            );
            expect(
              failure.message.includes("LAYA_BASE_URL") &&
                failure.message.includes("credentials.laya.baseURL"),
              "names both ways to set it",
            );
            expectEq(calls.length, 0, "no network call without a base URL");
          },
        );
      }
      record(results, name, true);
    } catch (err) {
      record(
        results,
        name,
        false,
        err instanceof Error ? err.message : String(err),
      );
    } finally {
      setEnv("LAYA_BASE_URL", LAYA_DECIDE_SPEC.baseURL);
    }
  }

  // ── L3c: a LAYA_BASE_URL's credentials never reach the debug log ──
  {
    const name = "DECIDE laya: base URL credentials stay out of the debug log";
    const { logger } = await import("../dist/index.js");
    const originalDebug = console.debug;
    const priorDebugFlag = process.env.NEUROLINK_DEBUG;
    // The logger has no level getter; it takes NEUROLINK_LOG_LEVEL at load, else info.
    const loadLevel = process.env.NEUROLINK_LOG_LEVEL?.toLowerCase();
    const priorLogLevel =
      loadLevel === "debug" || loadLevel === "warn" || loadLevel === "error"
        ? loadLevel
        : "info";
    const lines: string[] = [];
    try {
      setEnv(
        "LAYA_BASE_URL",
        "https://ops:hunter2-basic@laya.internal.test/laya?token=hunter2-query",
      );
      setEnv("NEUROLINK_DEBUG", "true");
      logger.setLogLevel("debug");
      console.debug = (...args: unknown[]) => {
        lines.push(
          args
            .map((a) => (typeof a === "string" ? a : JSON.stringify(a)))
            .join(" "),
        );
      };
      await createLaya();
      const init = lines.filter((l) => l.includes("Laya Provider initialized"));
      expect(init.length > 0, "the construction log line is captured");
      expect(
        !init.some((l) => l.includes("hunter2")),
        "no credential from the base URL is logged",
      );
      expect(
        init.some((l) => l.includes("laya.internal.test/laya")),
        "the host and path stay in the log for diagnostics",
      );
      // A value with no `//` parses as the scheme `user:` with an opaque path,
      // which a redactor that rebuilds the URL from scheme and path hands back.
      // A file URL and a Windows drive path keep their `@`: it is not a credential.
      const logged = async (base: string): Promise<string> => {
        lines.length = 0;
        setEnv("LAYA_BASE_URL", base);
        await createLaya();
        return lines
          .filter((l) => l.includes("Laya Provider initialized"))
          .join("\n");
      };
      const bare = await logged("user:hunter2-basic@laya.internal.test:8080");
      expect(bare.length > 0, "a scheme-less value: the log line is captured");
      expect(
        !bare.includes("hunter2"),
        "no password from a scheme-less user:pass@host is logged",
      );
      expect(
        (await logged("file:///srv/node_modules/@scope/laya")).includes(
          "@scope/laya",
        ),
        "a file URL keeps its @",
      );
      expect(
        (await logged("C:\\srv\\ops@corp\\laya")).includes("ops@corp"),
        "a Windows drive path keeps its @",
      );
      record(results, name, true);
    } catch (err) {
      record(
        results,
        name,
        false,
        err instanceof Error ? err.message : String(err),
      );
    } finally {
      console.debug = originalDebug;
      logger.setLogLevel(priorLogLevel);
      setEnv("NEUROLINK_DEBUG", priorDebugFlag);
      setEnv("LAYA_BASE_URL", LAYA_DECIDE_SPEC.baseURL);
    }
  }

  // The next three run with no decision provider in the environment at all,
  // so anything they reach came from the config passed to the SDK.
  const decisionEnv = [
    "TYPESAFE_API_KEY",
    "AI_GATEWAY_API_KEY",
    "LAYA_API_KEY",
    "LAYA_BASE_URL",
    "XOR_API_KEY",
    "XOR_BASE_URL",
    "PERPLEXITY_API_KEY",
    "PERPLEXITY_DECIDER_BASE_URL",
    "PERPLEXITY_DECIDER_MODEL",
    "SUBQ_API_KEY",
    "SUBQ_BASE_URL",
    "SUBQ_MODEL",
    "OPENAI_API_KEY",
    "OPENAI_DECISIONS_BASE_URL",
    "OPENAI_DECISIONS_MODEL",
    "SCALEDOWN_API_KEY",
    "SCALEDOWN_BASE_URL",
    "SCALEDOWN_MODEL",
  ];
  const priorDecisionEnv = decisionEnv.map((v) => process.env[v]);
  const clearDecisionEnv = () => {
    for (const v of decisionEnv) {
      setEnv(v, undefined);
    }
  };
  const restoreDecisionEnv = () => {
    decisionEnv.forEach((v, i) => setEnv(v, priorDecisionEnv[i]));
  };
  const configuredLaya = {
    laya: {
      apiKey: "test-fake-config-credential",
      baseURL: "https://laya.config.example/proxy/",
    },
  };

  // ── L3d: SDK credentials alone reach the configured server ──
  {
    const name = "DECIDE laya: SDK credentials alone set the key and endpoint";
    try {
      clearDecisionEnv();
      await withMocks(
        [
          {
            method: "POST",
            url: "laya.config.example/proxy/predict",
            respond: { status: 200, json: layaSuccessBody("typed-decisions") },
          },
        ],
        async ({ calls }) => {
          const { NeuroLink } = await import("../dist/index.js");
          const nl = new NeuroLink({ credentials: configuredLaya });
          await nl.decide({
            provider: "laya",
            state: "short",
            questions: { urgent: LAYA_QUESTIONS.urgent },
          });
          // A NeuroLink instance may also fetch its model config in the
          // background; only the decision is a POST.
          const post = calls.find((c) => c.method === "POST");
          expectEq(
            post?.url,
            "https://laya.config.example/proxy/predict",
            "endpoint from credentials.laya.baseURL",
          );
          const headers = (post?.headers ?? {}) as Record<string, string>;
          expectEq(
            headers.Authorization ?? headers.authorization,
            "Bearer test-fake-config-credential",
            "key from credentials.laya.apiKey",
          );
          record(results, name, true);
        },
      );
    } catch (err) {
      record(
        results,
        name,
        false,
        err instanceof Error ? err.message : String(err),
      );
    } finally {
      restoreDecisionEnv();
    }
  }

  // ── L3e: SDK credentials alone make laya the default decision provider ──
  {
    const name = "DECIDE laya: SDK credentials alone make laya the default";
    try {
      clearDecisionEnv();
      await withMocks(
        [
          {
            method: "POST",
            url: "laya.config.example/proxy/predict",
            respond: { status: 200, json: layaSuccessBody("typed-decisions") },
          },
        ],
        async ({ calls }) => {
          const { NeuroLink } = await import("../dist/index.js");
          const nl = new NeuroLink({ credentials: configuredLaya });
          const result = await nl.tryDecide({
            state: "short",
            questions: { urgent: LAYA_QUESTIONS.urgent },
          });
          expect(result !== null, "a bare decide() runs on the SDK config");
          expectEq(result?.provider, "laya", "laya chosen from SDK config");
          expectEq(
            calls.filter((c) => c.method === "POST").length,
            1,
            "one decision request, to the configured server",
          );
          record(results, name, true);
        },
      );
    } catch (err) {
      record(
        results,
        name,
        false,
        err instanceof Error ? err.message : String(err),
      );
    } finally {
      restoreDecisionEnv();
    }
  }

  // ── L3f: a key without a base URL does not count as configured ──
  {
    const name = "DECIDE laya: a key without a base URL is not configured";
    try {
      const { resolveDefaultDecisionProvider } =
        await import("../dist/index.js");
      clearDecisionEnv();
      setEnv("LAYA_API_KEY", "test-fake-laya-credential");
      expectEq(
        resolveDefaultDecisionProvider(),
        undefined,
        "LAYA_API_KEY alone selects nothing",
      );
      setEnv("LAYA_BASE_URL", LAYA_DECIDE_SPEC.baseURL);
      expectEq(
        resolveDefaultDecisionProvider(),
        "laya",
        "LAYA_API_KEY with LAYA_BASE_URL selects laya",
      );
      clearDecisionEnv();
      expectEq(
        resolveDefaultDecisionProvider({
          laya: { apiKey: "test-fake-config-credential" },
        }),
        undefined,
        "credentials.laya.apiKey alone selects nothing",
      );
      expectEq(
        resolveDefaultDecisionProvider(configuredLaya),
        "laya",
        "credentials.laya with both fields selects laya",
      );
      record(results, name, true);
    } catch (err) {
      record(
        results,
        name,
        false,
        err instanceof Error ? err.message : String(err),
      );
    } finally {
      restoreDecisionEnv();
    }
  }

  // ── L4: LiteLLM 401 — classified, redacted, and the breaker trips ──
  {
    const name = "DECIDE laya: proxy 401 trips the breaker, key echo dropped";
    try {
      await withMocks(
        [
          {
            method: "POST",
            url: LAYA_DECIDE_SPEC.urlMatch,
            respond: {
              status: 401,
              json: {
                error: {
                  message:
                    "Authentication Error, Invalid proxy server token passed. Received API Key = sk-...cred, Key Hash (Token) =9f2c0e41d3a7b8c6e5f40112233445566778899aabbccddeeff00112233445566. Unable to find token in cache or `LiteLLM_VerificationTokenTable`",
                  type: "token_not_found_in_db",
                  param: "key",
                  code: "401",
                },
              },
            },
          },
        ],
        async ({ calls }) => {
          const provider = await createLaya();
          const first = await captureDecisionFailure(() =>
            provider.decide!({
              state: "x",
              questions: { q: LAYA_QUESTIONS.urgent },
            }),
          );
          expectEq(first.kind, "authentication", "401 classified");
          expect(
            first.message.includes("Invalid proxy server token"),
            "reason kept",
          );
          expect(
            !first.message.includes("Received API Key"),
            "masked key echo dropped",
          );
          expect(!first.message.includes("9f2c0e41"), "key hash dropped");
          const second = await captureDecisionFailure(() =>
            provider.decide!({
              state: "x",
              questions: { q: LAYA_QUESTIONS.urgent },
            }),
          );
          expectEq(second.kind, "authentication", "breaker refuses the retry");
          expectEq(calls.length, 1, "no second round trip after a rejection");
          record(results, name, true);
        },
      );
    } catch (err) {
      record(
        results,
        name,
        false,
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  // ── L4b: LiteLLM's other key echo — the whole key, unmasked ──
  {
    const name = "DECIDE laya: an unmasked key echo is never surfaced";
    try {
      await withMocks(
        [
          {
            method: "POST",
            url: LAYA_DECIDE_SPEC.urlMatch,
            respond: {
              status: 401,
              json: {
                error: {
                  message:
                    "LiteLLM Virtual Key expected. Received=test-fake-laya-credential, expected to start with 'sk-'.",
                  type: "auth_error",
                  param: "None",
                  code: "401",
                },
              },
            },
          },
        ],
        async () => {
          const provider = await createLaya();
          const failure = await captureDecisionFailure(() =>
            provider.decide!({
              state: "x",
              questions: { q: LAYA_QUESTIONS.urgent },
            }),
          );
          expectEq(failure.kind, "authentication", "401 classified");
          expect(
            failure.message.includes("Virtual Key expected"),
            "the explanation is kept",
          );
          expect(
            !failure.message.includes("test-fake-laya-credential"),
            "the configured key never appears in the message",
          );
          record(results, name, true);
        },
      );
    } catch (err) {
      record(
        results,
        name,
        false,
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  // ── L4c: a key hash in a rate-limit reply is dropped too ──
  {
    const name = "DECIDE laya: a key hash in a 429 is never surfaced";
    try {
      await withMocks(
        [
          {
            method: "POST",
            url: LAYA_DECIDE_SPEC.urlMatch,
            respond: {
              status: 429,
              json: {
                error: {
                  message:
                    "Max parallel request limit reached. Hashed API key: 9f2c0e41d3a7b8c6e5f40112233445566778899aabbccddeeff00112233445566. Try again later.",
                  type: "rate_limit_error",
                  code: "429",
                },
              },
            },
          },
        ],
        async () => {
          const provider = await createLaya();
          const failure = await captureDecisionFailure(() =>
            provider.decide!({
              state: "x",
              questions: { q: LAYA_QUESTIONS.urgent },
            }),
          );
          expectEq(failure.kind, "rate_limit", "429 classified");
          expect(
            failure.message.includes("parallel request limit"),
            "the explanation is kept",
          );
          expect(!failure.message.includes("9f2c0e41"), "key hash dropped");
          record(results, name, true);
        },
      );
    } catch (err) {
      record(
        results,
        name,
        false,
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  // ── L5: Laya's own string `detail` (its server returns validation as 400) ──
  {
    const name = "DECIDE laya: server detail string kept";
    try {
      await withMocks(
        [
          {
            method: "POST",
            url: LAYA_DECIDE_SPEC.urlMatch,
            respond: {
              status: 400,
              json: {
                detail:
                  "question 'q': type must be one of ['choice', 'noul', 'score']",
              },
            },
          },
        ],
        async () => {
          const provider = await createLaya();
          const failure = await captureDecisionFailure(() =>
            provider.decide!({
              state: "x",
              questions: { q: LAYA_QUESTIONS.urgent },
            }),
          );
          expectEq(
            failure.kind,
            "invalid_request",
            "400 string detail classified",
          );
          expect(
            failure.message.includes("type must be one of"),
            "Laya's reason kept",
          );
          record(results, name, true);
        },
      );
    } catch (err) {
      record(
        results,
        name,
        false,
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  // ── L6: FastAPI validation array — fields named, echoed input never ──
  {
    const name = "DECIDE laya: validation array envelope";
    try {
      await withMocks(
        [
          {
            method: "POST",
            url: LAYA_DECIDE_SPEC.urlMatch,
            respond: {
              status: 422,
              json: {
                detail: [
                  {
                    type: "value_error",
                    loc: ["body", "questions", "team"],
                    msg: "Value error, 'choice' questions require non-empty `criteria`",
                    input: { secret: "state text must never be logged" },
                  },
                ],
              },
            },
          },
        ],
        async () => {
          const provider = await createLaya();
          const failure = await captureDecisionFailure(() =>
            provider.decide!({
              state: "x",
              questions: { team: LAYA_QUESTIONS.team },
            }),
          );
          expectEq(
            failure.kind,
            "invalid_request",
            "array envelope classified",
          );
          expect(failure.message.includes("questions.team"), "names the field");
          expect(
            !failure.message.includes("secret"),
            "echoed input is not surfaced",
          );
          record(results, name, true);
        },
      );
    } catch (err) {
      record(
        results,
        name,
        false,
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  // ── L7: 413 from a self-hosted Laya server's size limits ──
  {
    const name = "DECIDE laya: 413 is a size error";
    try {
      await withMocks(
        [
          {
            method: "POST",
            url: LAYA_DECIDE_SPEC.urlMatch,
            respond: {
              status: 413,
              json: { detail: "state too large (50001 > 50000 chars)" },
            },
          },
        ],
        async () => {
          const provider = await createLaya();
          const failure = await captureDecisionFailure(() =>
            provider.decide!({
              state: "x",
              questions: { q: LAYA_QUESTIONS.urgent },
            }),
          );
          expectEq(failure.kind, "max_tokens_exceeded", "413 classified");
          record(results, name, true);
        },
      );
    } catch (err) {
      record(
        results,
        name,
        false,
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  // ── L8: a 503 is retried once, and a recovered retry succeeds ──
  {
    const name = "DECIDE laya: 503 retried then recovered";
    try {
      let attempts = 0;
      await withMocks(
        [
          {
            method: "POST",
            url: LAYA_DECIDE_SPEC.urlMatch,
            respond: () => {
              attempts += 1;
              return attempts === 1
                ? { status: 503, json: { detail: "upstream unavailable" } }
                : { status: 200, json: layaSuccessBody("typed-decisions") };
            },
          },
        ],
        async ({ calls }) => {
          const provider = await createLaya();
          const result = await provider.decide!({
            state: "x",
            questions: { urgent: LAYA_QUESTIONS.urgent },
          });
          expectEq(calls.length, 2, "one retry");
          expectEq(
            result.answers.urgent?.type,
            "boolean",
            "retry answer parsed",
          );
          record(results, name, true);
        },
      );
    } catch (err) {
      record(
        results,
        name,
        false,
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  // ── L9: a 503 that persists is reported as overloaded ──
  {
    const name = "DECIDE laya: persistent 503 is overloaded";
    try {
      await withMocks(
        [
          {
            method: "POST",
            url: LAYA_DECIDE_SPEC.urlMatch,
            respond: { status: 503, json: { detail: "upstream unavailable" } },
          },
        ],
        async ({ calls }) => {
          const provider = await createLaya();
          const failure = await captureDecisionFailure(() =>
            provider.decide!({
              state: "x",
              questions: { q: LAYA_QUESTIONS.urgent },
            }),
          );
          expectEq(failure.kind, "overloaded", "503 classified");
          expectEq(calls.length, 2, "retried exactly once");
          record(results, name, true);
        },
      );
    } catch (err) {
      record(
        results,
        name,
        false,
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  // ── M1–M6: decisionLimits — refused before any network call ──
  // Token arithmetic follows estimateTokens(): ceil(ceil(chars / 4) × 1.05).
  const refusedLocally = async (
    name: string,
    model: string | undefined,
    state: DecisionState,
    questionCount: number,
    mentions: string,
  ): Promise<void> => {
    try {
      await withMocks(
        [
          {
            method: "POST",
            url: LAYA_DECIDE_SPEC.urlMatch,
            respond: { status: 200, json: layaSuccessBody("typed-decisions") },
          },
        ],
        async ({ calls }) => {
          const provider = await createLaya(model);
          const questions = Object.fromEntries(
            Array.from({ length: questionCount }, (_, i) => [
              `q${i}`,
              LAYA_QUESTIONS.urgent,
            ]),
          );
          const failure = await captureDecisionFailure(() =>
            provider.decide!({ state, questions }),
          );
          expectEq(failure.kind, "max_tokens_exceeded", "refused as too large");
          expect(failure.message.includes(mentions), "the limit is named");
          expectEq(calls.length, 0, "no network call for a refused request");
          record(results, name, true);
        },
      );
    } catch (err) {
      record(
        results,
        name,
        false,
        err instanceof Error ? err.message : String(err),
      );
    }
  };

  const sentUpstream = async (
    name: string,
    model: string | undefined,
    state: string,
  ): Promise<void> => {
    try {
      await withMocks(
        [
          {
            method: "POST",
            url: LAYA_DECIDE_SPEC.urlMatch,
            respond: { status: 200, json: layaSuccessBody("typed-decisions") },
          },
        ],
        async ({ calls }) => {
          const provider = await createLaya(model);
          await provider.decide!({
            state,
            questions: { q: LAYA_QUESTIONS.urgent },
          });
          expectEq(calls.length, 1, "a request within the limit is sent");
          record(results, name, true);
        },
      );
    } catch (err) {
      record(
        results,
        name,
        false,
        err instanceof Error ? err.message : String(err),
      );
    }
  };

  // 2,925 chars → ceil(732 × 1.05) = 769 tokens, one over 768.
  await refusedLocally(
    "DECIDE laya: M1 oversized state refused locally",
    undefined,
    "a".repeat(2925),
    1,
    "768",
  );
  // 2,924 chars → ceil(731 × 1.05) = 768 tokens, exactly at the limit.
  await sentUpstream(
    "DECIDE laya: M2 state at the limit is sent",
    undefined,
    "a".repeat(2924),
  );
  // 1,300 chars → 342 tokens: over english's 320, under typed-decisions' 768.
  await refusedLocally(
    "DECIDE laya: M3a english has the smaller window",
    "english",
    "a".repeat(1300),
    1,
    "320",
  );
  await refusedLocally(
    "DECIDE laya: M3b auto assumes the smaller window",
    "auto",
    "a".repeat(1300),
    1,
    "320",
  );
  await sentUpstream(
    "DECIDE laya: M3c the same state fits typed-decisions",
    "typed-decisions",
    "a".repeat(1300),
  );
  // An object state is measured serialized, not skipped.
  await refusedLocally(
    "DECIDE laya: M4 object state measured serialized",
    undefined,
    { notes: "a".repeat(3000) },
    1,
    "768",
  );
  await refusedLocally(
    "DECIDE laya: M5 more than 64 questions refused",
    undefined,
    "short",
    65,
    "64",
  );

  // Non-Latin text tokenizes far finer than English. Measured live: Chinese
  // is ~1.4 tokens per character on typed-decisions and ~0.56 on multilingual.
  const chinese = "付款再次失败客户今天就要求退款请尽快处理这个问题"
    .repeat(30)
    .slice(0, 600);
  // 600 CJK characters × 1.5 = 900 estimated tokens > 768.
  await refusedLocally(
    "DECIDE laya: M7a non-Latin state measured per character",
    undefined,
    chinese,
    1,
    "768",
  );
  // The same state is 600 × 0.6 = 360 tokens on the multilingual checkpoint.
  await sentUpstream(
    "DECIDE laya: M7b multilingual reads more non-Latin text",
    "multilingual",
    chinese,
  );
  // A name Laya accepts but the descriptor does not list (Laya's `en` alias
  // for the 512-token English checkpoint) gets the tightest window, not 768.
  await refusedLocally(
    "DECIDE laya: M8 an unlisted model name gets the tightest window",
    "en",
    "a".repeat(1300),
    1,
    "320",
  );

  // ── M6: TypeSafe declares no limits, so a large state still goes out ──
  {
    const name = "DECIDE typesafe: no client-side limit";
    try {
      setEnv(TYPESAFE_DECIDE_SPEC.envVar, "test-fake-typesafe-credential");
      await withMocks(
        [
          {
            method: "POST",
            url: TYPESAFE_DECIDE_SPEC.urlMatch,
            respond: {
              status: 200,
              json: {
                model: "jev-1.13.0",
                answers: { q: { type: "noul", noul: 0.5 } },
                usage: { input_tokens: 50_000, output_tokens: 0 },
              },
            },
          },
        ],
        async ({ calls }) => {
          const { ProviderFactory } =
            await import("../dist/factories/providerFactory.js");
          const provider = await ProviderFactory.createProvider("typesafe");
          await provider.decide!({
            state: "a".repeat(200_000),
            questions: { q: { type: "boolean", instructions: "?" } },
          });
          expectEq(
            calls.length,
            1,
            "typesafe leaves the size check to its server",
          );
          record(results, name, true);
        },
      );
    } catch (err) {
      record(
        results,
        name,
        false,
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  // ── M9: tryDecide splits a question map at the provider's cap ──
  // Built-in consumers ask about up to 300 messages or 200 servers in one
  // request, and decide() refuses what a provider's cap does not take, so past
  // the cap a consumer used to lose its whole decision. tryDecide is the one door
  // they all use; decide() itself stays strict.
  const booleans = (count: number) =>
    Object.fromEntries(
      Array.from({ length: count }, (_, i) => [
        `q${i}`,
        { type: "boolean" as const, instructions: `Is statement ${i} true?` },
      ]),
    );
  const idsSent = (body: unknown): string[] =>
    Object.keys(
      (body as { questions?: Record<string, unknown> }).questions ?? {},
    );
  /** A Laya that answers each question it is sent, and refuses the batch that holds `refuse`. */
  const layaAnswering = (
    refuse?: string,
  ): Parameters<typeof installMockFetch>[0][number] => ({
    method: "POST",
    url: LAYA_DECIDE_SPEC.urlMatch,
    respond: (call) => {
      const ids = idsSent(call.bodyJson);
      if (refuse !== undefined && ids.includes(refuse)) {
        return { status: 400, json: { detail: "bad request" } };
      }
      return {
        status: 200,
        json: {
          model: "typed-decisions",
          answers: Object.fromEntries(
            ids.map((id) => [id, { type: "noul", noul: 0.5, confidence: 0.5 }]),
          ),
          usage: { input_tokens: 10, output_tokens: 0 },
          routing: { model: "typed-decisions", reason: "explicit" },
        },
      };
    },
  });
  const batchCase = async (name: string, body: () => Promise<void>) => {
    try {
      await body();
      record(results, name, true);
    } catch (err) {
      record(
        results,
        name,
        false,
        err instanceof Error ? err.message : String(err),
      );
    }
  };

  await batchCase(
    "DECIDE laya: M9a tryDecide splits more than 64 questions and joins the answers",
    async () => {
      const { NeuroLink } = await import("../dist/index.js");
      await withMocks([layaAnswering()], async ({ calls }) => {
        const result = await new NeuroLink().tryDecide({
          provider: "laya",
          state: "short",
          questions: booleans(150),
        });
        const sizes = calls
          .map((c) => idsSent(c.bodyJson).length)
          .sort((a, b) => b - a);
        expectEq(sizes.join(","), "64,64,22", "three requests, none over 64");
        expectEq(
          Object.keys(result?.answers ?? {}).length,
          150,
          "every question was answered",
        );
        expectEq(result?.usage.inputTokens, 30, "usage is summed");
        expectEq(result?.provider, "laya", "the provider is reported once");
      });
    },
  );

  await batchCase(
    "DECIDE laya: M9b a batch that fails costs only its own answers",
    async () => {
      const { NeuroLink } = await import("../dist/index.js");
      // q64 is the first question of the second batch.
      await withMocks([layaAnswering("q64")], async ({ calls }) => {
        const result = await new NeuroLink().tryDecide({
          provider: "laya",
          state: "short",
          questions: booleans(150),
        });
        expectEq(calls.length, 3, "all three batches were tried");
        expect(result !== null, "the answers that did come back are kept");
        const answers = result?.answers ?? {};
        expectEq(Object.keys(answers).length, 86, "the other two batches");
        expect(
          "q0" in answers && "q128" in answers && !("q64" in answers),
          "exactly the failed batch's questions are missing",
        );
      });
      await withMocks(
        [
          {
            method: "POST",
            url: LAYA_DECIDE_SPEC.urlMatch,
            respond: { status: 400, json: { detail: "bad request" } },
          },
        ],
        async () => {
          const none = await new NeuroLink().tryDecide({
            provider: "laya",
            state: "short",
            questions: booleans(150),
          });
          expectEq(none, null, "every batch failing is still fail-open");
        },
      );
    },
  );

  await batchCase(
    "DECIDE laya: M9c decide() still refuses an over-cap request, and 64 is one request",
    async () => {
      const { NeuroLink } = await import("../dist/index.js");
      await withMocks([layaAnswering()], async ({ calls }) => {
        const nl = new NeuroLink();
        let refusal = "";
        try {
          await nl.decide({
            provider: "laya",
            state: "short",
            questions: booleans(65),
          });
        } catch (err) {
          refusal = err instanceof Error ? err.message : String(err);
        }
        expect(
          refusal.includes("at most 64 questions"),
          "decide() names the cap",
        );
        expectEq(calls.length, 0, "and sends nothing");
        const atCap = await nl.tryDecide({
          provider: "laya",
          state: "short",
          questions: booleans(64),
        });
        expectEq(calls.length, 1, "64 questions go out as one request");
        expectEq(
          Object.keys(atCap?.answers ?? {}).length,
          64,
          "and all are answered",
        );
      });
    },
  );

  await batchCase(
    "DECIDE typesafe: M9d a provider with no question cap gets one request",
    async () => {
      const { NeuroLink } = await import("../dist/index.js");
      const prior = process.env[TYPESAFE_DECIDE_SPEC.envVar];
      try {
        setEnv(TYPESAFE_DECIDE_SPEC.envVar, "test-fake-typesafe-credential");
        await withMocks(
          [
            {
              method: "POST",
              url: TYPESAFE_DECIDE_SPEC.urlMatch,
              respond: (call) => ({
                status: 200,
                json: {
                  model: "jev-1.13.0",
                  answers: Object.fromEntries(
                    idsSent(call.bodyJson).map((id) => [
                      id,
                      { type: "noul", noul: 0.5 },
                    ]),
                  ),
                  usage: { input_tokens: 10, output_tokens: 0 },
                },
              }),
            },
          ],
          async ({ calls }) => {
            const result = await new NeuroLink().tryDecide({
              provider: "typesafe",
              state: "short",
              questions: booleans(300),
            });
            expectEq(calls.length, 1, "300 questions, one request");
            expectEq(
              Object.keys(result?.answers ?? {}).length,
              300,
              "all answered",
            );
          },
        );
      } finally {
        setEnv(TYPESAFE_DECIDE_SPEC.envVar, prior);
      }
    },
  );
}

// ───────────────────────────────────────────────────────────────────────
// Section: XOR (decide-only)
// ───────────────────────────────────────────────────────────────────────

/**
 * XOR answers on the same System One wire as TypeSafe's direct API, so the
 * `boolean`↔`noul` translation is shared. What this section pins is XOR's own:
 * the route (`<XOR_BASE_URL>/v1/decisions`, no built-in endpoint), the `model`
 * field that is always sent, the request id headers, the error envelopes, the
 * limits and the image and video input.
 */
// XOR has no built-in endpoint: the base URL always comes from config, so the
// section sets XOR_BASE_URL itself.
const XOR_DECIDE_SPEC = {
  provider: "xor",
  envVar: "XOR_API_KEY",
  baseURL: "https://xor.test.example/proxy",
  urlMatch: "xor.test.example/proxy/v1/decisions",
  endpoint: "https://xor.test.example/proxy/v1/decisions",
  model: "xor-latest",
};

const XOR_QUESTIONS = {
  urgent: { type: "boolean", instructions: "Is this urgent?" },
  team: {
    type: "choice",
    instructions: "Which team?",
    criteria: { billing: "money", technical: "bugs", sales: "pricing" },
  },
  mood: {
    type: "score",
    instructions: "How angry?",
    criteria: ["calm", "annoyed", "angry"],
  },
} satisfies DecisionQuestionMap;

/** A success body in the shape XOR's own server returns. */
function xorSuccessBody(model: string = XOR_DECIDE_SPEC.model): unknown {
  return {
    model,
    answers: {
      urgent: { type: "noul", noul: 0.91 },
      team: {
        type: "choice",
        choice: "billing",
        probabilities: { billing: 0.84, technical: 0.1, sales: 0.06 },
        confidence: 0.79,
      },
      mood: {
        type: "score",
        score: 1.7,
        legend: { "0": "calm", "1": "annoyed", "2": "angry" },
        probabilities: { "0": 0.1, "1": 0.1, "2": 0.8 },
        confidence: 0.7,
      },
    },
    // XOR reports one output token per question.
    usage: { input_tokens: 96, output_tokens: 3 },
  };
}

const xorOkRoute = {
  method: "POST",
  url: XOR_DECIDE_SPEC.urlMatch,
  respond: { status: 200, json: xorSuccessBody() },
};

async function createXor(model?: string) {
  const { ProviderFactory } =
    await import("../dist/factories/providerFactory.js");
  return ProviderFactory.createProvider(XOR_DECIDE_SPEC.provider, model);
}

async function xorCase(name: string, body: () => Promise<void>): Promise<void> {
  try {
    await body();
    record(results, name, true);
  } catch (err) {
    record(
      results,
      name,
      false,
      err instanceof Error ? err.message : String(err),
    );
  }
}

/** One decision on a single question, for tests that only care what was sent. */
async function decideOne(
  provider: Awaited<ReturnType<typeof createXor>>,
  overrides: Partial<DecisionRequest> = {},
) {
  return provider.decide!({
    state: "short",
    questions: { urgent: XOR_QUESTIONS.urgent },
    ...overrides,
  });
}

/** Run one decision against a canned reply; report how it was classified. */
async function xorFailure(
  respond:
    | { status: number; json: unknown }
    | (() => { status: number; json: unknown }),
) {
  return withMocks(
    [{ method: "POST", url: XOR_DECIDE_SPEC.urlMatch, respond }],
    async ({ calls }) => {
      const failure = await captureDecisionFailure(async () =>
        decideOne(await createXor()),
      );
      return { ...failure, calls: calls.length };
    },
  );
}

async function runXorDecide(): Promise<void> {
  setEnv("XOR_BASE_URL", XOR_DECIDE_SPEC.baseURL);

  // ── X0: no key — refused as authentication, and nothing is sent ──
  await xorCase("DECIDE xor: no key, no request", async () => {
    setEnv(XOR_DECIDE_SPEC.envVar, undefined);
    await withMocks([xorOkRoute], async ({ calls }) => {
      const provider = await createXor();
      const failure = await captureDecisionFailure(() => decideOne(provider));
      expectEq(failure.kind, "authentication", "missing key classified");
      expect(
        failure.message.includes("XOR_API_KEY"),
        "names the variable to set",
      );
      expectEq(calls.length, 0, "no network call without a key");
    });
  });

  setEnv(XOR_DECIDE_SPEC.envVar, "test-fake-xor-credential");

  // ── X1: happy path — route, bearer, body, answers, model, usage, request id ──
  await xorCase("DECIDE xor: wire, answers and model", async () => {
    await withMocks(
      [
        {
          ...xorOkRoute,
          respond: {
            status: 200,
            json: xorSuccessBody(),
            headers: { "x-request-id": "req-xor-1" },
          },
        },
      ],
      async ({ calls }) => {
        const provider = await createXor();
        const result = await provider.decide!({
          state: "payouts have failed for three days",
          questions: XOR_QUESTIONS,
        });
        expectEq(calls.length, 1, "single POST");
        expectEq(calls[0].url, XOR_DECIDE_SPEC.endpoint, "route from config");
        const headers = calls[0].headers as Record<string, string>;
        expectEq(
          headers.Authorization ?? headers.authorization,
          "Bearer test-fake-xor-credential",
          "bearer credential",
        );
        const body = calls[0].bodyJson as {
          model?: string;
          questions: Record<string, { type: string }>;
        };
        expectEq(body.model, XOR_DECIDE_SPEC.model, "default model sent");
        expectEq(body.questions.urgent.type, "noul", "boolean sent as noul");
        const urgent = result.answers.urgent;
        expectEq(
          urgent.type === "boolean" ? urgent.probability : -1,
          0.91,
          "noul mapped to probability",
        );
        const team = result.answers.team;
        expectEq(
          team.type === "choice" ? team.choice : "",
          "billing",
          "choice",
        );
        const mood = result.answers.mood;
        expectEq(mood.type === "score" ? mood.score : -1, 1.7, "score");
        expectEq(result.model, XOR_DECIDE_SPEC.model, "model from response");
        expectEq(result.provider, "xor", "provider name");
        expectEq(result.usage.inputTokens, 96, "usage.input_tokens mapped");
        expectEq(result.usage.outputTokens, 3, "usage.output_tokens mapped");
        expectEq(result.requestId, "req-xor-1", "request id kept");
      },
    );
  });

  // ── X1b: whichever id header survives the proxy is the request id ──
  await xorCase(
    "DECIDE xor: request id from whichever header survives",
    async () => {
      const cases: Array<[Record<string, string>, string | undefined]> = [
        [
          {
            "x-request-id": "req-1",
            "x-typesafe-request-id": "ts-1",
            "x-litellm-call-id": "ll-1",
          },
          "req-1",
        ],
        [
          { "x-typesafe-request-id": "ts-2", "x-litellm-call-id": "ll-2" },
          "ts-2",
        ],
        [{ "x-litellm-call-id": "ll-3" }, "ll-3"],
        [{}, undefined],
      ];
      for (const [headers, expected] of cases) {
        await withMocks(
          [
            {
              ...xorOkRoute,
              respond: { status: 200, json: xorSuccessBody(), headers },
            },
          ],
          async () => {
            const result = await decideOne(await createXor());
            expectEq(
              result.requestId,
              expected,
              "request id header precedence",
            );
          },
        );
      }
    },
  );

  // ── X2: `model` is always sent: default, construction, per call ──
  await xorCase("DECIDE xor: the model field is always sent", async () => {
    await withMocks([xorOkRoute], async ({ calls }) => {
      await decideOne(await createXor());
      await decideOne(await createXor("xor-custom"));
      await decideOne(await createXor("xor-custom"), {
        model: "xor-per-call",
      });
      await decideOne(await createXor("xor-omni"));
      // A model name from before the aliases is the caller's to send: it is
      // not checked against the catalog, whichever way it is given.
      await decideOne(await createXor("xor-1.1"));
      await decideOne(await createXor(), { model: "xor-1.1" });
      const sent = calls.map((c) => (c.bodyJson as { model?: string }).model);
      expectEq(sent[0], "xor-latest", "default model");
      expectEq(sent[1], "xor-custom", "model pinned at construction");
      expectEq(sent[2], "xor-per-call", "per-call model wins");
      expectEq(sent[3], "xor-omni", "the multimodal alias is sent as given");
      expectEq(sent[4], "xor-1.1", "a legacy name pinned at construction");
      expectEq(sent[5], "xor-1.1", "a legacy name given per call");
    });
  });

  // ── X3: every spelling of the base URL reaches the same endpoint ──
  await xorCase("DECIDE xor: base URL spellings", async () => {
    try {
      for (const base of [
        "https://xor.test.example/proxy",
        "https://xor.test.example/proxy/",
        "https://xor.test.example/proxy/v1",
        "https://xor.test.example/proxy/v1/",
      ]) {
        setEnv("XOR_BASE_URL", base);
        await withMocks([xorOkRoute], async ({ calls }) => {
          await decideOne(await createXor());
          expectEq(calls[0]?.url, XOR_DECIDE_SPEC.endpoint, "one endpoint");
        });
      }
    } finally {
      setEnv("XOR_BASE_URL", XOR_DECIDE_SPEC.baseURL);
    }
  });

  // ── X4: no base URL — unset or blank — is refused before any request ──
  await xorCase("DECIDE xor: no base URL, no request", async () => {
    try {
      for (const unset of [undefined, "   "]) {
        setEnv("XOR_BASE_URL", unset);
        await withMocks(
          [{ ...xorOkRoute, url: "/v1/decisions" }],
          async ({ calls }) => {
            const failure = await captureDecisionFailure(async () =>
              decideOne(await createXor()),
            );
            expectEq(
              failure.kind,
              "invalid_request",
              "missing base URL classified",
            );
            expect(
              failure.message.includes("XOR_BASE_URL") &&
                failure.message.includes("credentials.xor.baseURL"),
              "names both ways to set it",
            );
            expectEq(calls.length, 0, "no network call without a base URL");
          },
        );
      }
    } finally {
      setEnv("XOR_BASE_URL", XOR_DECIDE_SPEC.baseURL);
    }
  });

  // ── X5: a base URL's credentials never reach the debug log ──
  await xorCase(
    "DECIDE xor: base URL credentials stay out of the debug log",
    async () => {
      const { logger } = await import("../dist/index.js");
      const originalDebug = console.debug;
      const priorDebugFlag = process.env.NEUROLINK_DEBUG;
      // The logger has no level getter; it takes NEUROLINK_LOG_LEVEL at load, else info.
      const loadLevel = process.env.NEUROLINK_LOG_LEVEL?.toLowerCase();
      const priorLogLevel =
        loadLevel === "debug" || loadLevel === "warn" || loadLevel === "error"
          ? loadLevel
          : "info";
      const lines: string[] = [];
      try {
        setEnv(
          "XOR_BASE_URL",
          "https://ops:hunter2-basic@xor.internal.test/proxy?token=hunter2-query",
        );
        setEnv("NEUROLINK_DEBUG", "true");
        logger.setLogLevel("debug");
        console.debug = (...args: unknown[]) => {
          lines.push(
            args
              .map((a) => (typeof a === "string" ? a : JSON.stringify(a)))
              .join(" "),
          );
        };
        await createXor();
        const init = lines.filter((l) =>
          l.includes("XOR Provider initialized"),
        );
        expect(init.length > 0, "the construction log line is captured");
        expect(
          !init.some((l) => l.includes("hunter2")),
          "no credential from the base URL is logged",
        );
        expect(
          init.some((l) => l.includes("xor.internal.test/proxy")),
          "the host and path stay in the log for diagnostics",
        );
        // A value with no `//` parses as the scheme `user:` with an opaque path,
        // which a redactor that rebuilds the URL from scheme and path hands back.
        // A file URL and a Windows drive path keep their `@`: it is not a credential.
        const logged = async (base: string): Promise<string> => {
          lines.length = 0;
          setEnv("XOR_BASE_URL", base);
          await createXor();
          return lines
            .filter((l) => l.includes("XOR Provider initialized"))
            .join("\n");
        };
        const bare = await logged("user:hunter2-basic@xor.internal.test:8080");
        expect(
          bare.length > 0,
          "a scheme-less value: the log line is captured",
        );
        expect(
          !bare.includes("hunter2"),
          "no password from a scheme-less user:pass@host is logged",
        );
        expect(
          (await logged("file:///srv/node_modules/@scope/xor")).includes(
            "@scope/xor",
          ),
          "a file URL keeps its @",
        );
        expect(
          (await logged("C:\\srv\\ops@corp\\xor")).includes("ops@corp"),
          "a Windows drive path keeps its @",
        );
      } finally {
        console.debug = originalDebug;
        logger.setLogLevel(priorLogLevel);
        setEnv("NEUROLINK_DEBUG", priorDebugFlag);
        setEnv("XOR_BASE_URL", XOR_DECIDE_SPEC.baseURL);
      }
    },
  );

  // The next three run with no decision provider in the environment at all,
  // so anything they reach came from the config passed to the SDK.
  const decisionEnv = [
    "TYPESAFE_API_KEY",
    "AI_GATEWAY_API_KEY",
    "LAYA_API_KEY",
    "LAYA_BASE_URL",
    "XOR_API_KEY",
    "XOR_BASE_URL",
    "PERPLEXITY_API_KEY",
    "PERPLEXITY_DECIDER_BASE_URL",
    "PERPLEXITY_DECIDER_MODEL",
    "SUBQ_API_KEY",
    "SUBQ_BASE_URL",
    "SUBQ_MODEL",
    "OPENAI_API_KEY",
    "OPENAI_DECISIONS_BASE_URL",
    "OPENAI_DECISIONS_MODEL",
    "SCALEDOWN_API_KEY",
    "SCALEDOWN_BASE_URL",
    "SCALEDOWN_MODEL",
  ];
  const priorDecisionEnv = decisionEnv.map((v) => process.env[v]);
  const clearDecisionEnv = () => {
    for (const v of decisionEnv) {
      setEnv(v, undefined);
    }
  };
  const restoreDecisionEnv = () => {
    decisionEnv.forEach((v, i) => setEnv(v, priorDecisionEnv[i]));
  };
  const configuredXor = {
    xor: {
      apiKey: "test-fake-config-credential",
      baseURL: "https://xor.config.example/proxy/",
    },
  };

  // ── X6a: SDK credentials alone reach the configured server ──
  await xorCase(
    "DECIDE xor: SDK credentials alone set the key and endpoint",
    async () => {
      try {
        clearDecisionEnv();
        await withMocks(
          [{ ...xorOkRoute, url: "xor.config.example/proxy/v1/decisions" }],
          async ({ calls }) => {
            const { NeuroLink } = await import("../dist/index.js");
            const nl = new NeuroLink({ credentials: configuredXor });
            await nl.decide({
              provider: "xor",
              state: "short",
              questions: { urgent: XOR_QUESTIONS.urgent },
            });
            // A NeuroLink instance may also fetch its model config in the
            // background; only the decision is a POST.
            const post = calls.find((c) => c.method === "POST");
            expectEq(
              post?.url,
              "https://xor.config.example/proxy/v1/decisions",
              "endpoint from credentials.xor.baseURL",
            );
            const headers = (post?.headers ?? {}) as Record<string, string>;
            expectEq(
              headers.Authorization ?? headers.authorization,
              "Bearer test-fake-config-credential",
              "key from credentials.xor.apiKey",
            );
          },
        );
      } finally {
        restoreDecisionEnv();
      }
    },
  );

  // ── X6b: SDK credentials alone make xor the default decision provider ──
  await xorCase(
    "DECIDE xor: SDK credentials alone make xor the default",
    async () => {
      try {
        clearDecisionEnv();
        await withMocks(
          [{ ...xorOkRoute, url: "xor.config.example/proxy/v1/decisions" }],
          async ({ calls }) => {
            const { NeuroLink } = await import("../dist/index.js");
            const nl = new NeuroLink({ credentials: configuredXor });
            const result = await nl.tryDecide({
              state: "short",
              questions: { urgent: XOR_QUESTIONS.urgent },
            });
            expectEq(result?.provider, "xor", "xor chosen from SDK config");
            expectEq(
              calls.filter((c) => c.method === "POST").length,
              1,
              "one decision request, to the configured server",
            );
          },
        );
      } finally {
        restoreDecisionEnv();
      }
    },
  );

  // ── X6c: a key without a base URL does not count as configured ──
  await xorCase(
    "DECIDE xor: a key without a base URL is not configured",
    async () => {
      try {
        const { resolveDefaultDecisionProvider } =
          await import("../dist/index.js");
        clearDecisionEnv();
        setEnv("XOR_API_KEY", "test-fake-xor-credential");
        expectEq(
          resolveDefaultDecisionProvider(),
          undefined,
          "key alone selects nothing",
        );
        setEnv("XOR_BASE_URL", XOR_DECIDE_SPEC.baseURL);
        expectEq(
          resolveDefaultDecisionProvider(),
          "xor",
          "key with base URL selects xor",
        );
        clearDecisionEnv();
        expectEq(
          resolveDefaultDecisionProvider({
            xor: { apiKey: "test-fake-config-credential" },
          }),
          undefined,
          "credentials.xor.apiKey alone selects nothing",
        );
        expectEq(
          resolveDefaultDecisionProvider(configuredXor),
          "xor",
          "credentials.xor with both fields selects xor",
        );
      } finally {
        restoreDecisionEnv();
      }
    },
  );

  // ── X7: each envelope is flattened, classified, and retried only when it should be ──
  await xorCase(
    "DECIDE xor: envelopes are flattened and classified",
    async () => {
      const table: Array<{
        label: string;
        status: number;
        json: unknown;
        kind: string;
        calls: number;
        includes?: string;
      }> = [
        {
          label: "LiteLLM 403 team_model_access_denied",
          status: 403,
          json: {
            error: {
              message: "team not allowed to access model=xor-latest",
              type: "team_model_access_denied",
              code: "403",
            },
          },
          kind: "invalid_request",
          calls: 1,
          includes: "team not allowed",
        },
        {
          label: "LiteLLM 402 budget_exceeded",
          status: 402,
          json: {
            error: {
              message: "Budget has been exceeded",
              type: "budget_exceeded",
              code: "402",
            },
          },
          kind: "invalid_request",
          calls: 1,
          includes: "Budget has been exceeded",
        },
        {
          label: "XOR 422 option count, flat string",
          status: 422,
          json: { error: "q: 2..64 options, got 65" },
          kind: "invalid_request",
          calls: 1,
          includes: "2..64 options, got 65",
        },
        {
          label: "XOR 422 option count, wrapped by LiteLLM",
          status: 422,
          json: {
            error: {
              message:
                'litellm.UnprocessableEntityError: Decisions upstream returned HTTP 422: {"error": "q: 2..64 options, got 65"}. Received Model Group=xor-latest\nAvailable Model Group Fallbacks=[\'xor-omni\']',
              type: null,
              code: "422",
            },
          },
          kind: "invalid_request",
          calls: 1,
          includes: "2..64 options, got 65",
        },
        {
          label: "XOR 422 question type the model lacks",
          status: 422,
          json: {
            error:
              "question type 'value' is not enabled (advertised: noul,choice,score)",
          },
          kind: "invalid_request",
          calls: 1,
          includes: "is not enabled",
        },
        {
          label: "XOR 404 flat string",
          status: 404,
          json: { error: "not found" },
          kind: "invalid_request",
          calls: 1,
          includes: "not found",
        },
        {
          label: "413 body too large",
          status: 413,
          json: { error: "request body exceeds 8MB" },
          kind: "max_tokens_exceeded",
          calls: 1,
        },
        {
          label: "XOR 500 flat string",
          status: 500,
          json: { error: "engine failure" },
          kind: "server",
          calls: 2,
          includes: "engine failure",
        },
        {
          label: "503 overloaded",
          status: 503,
          json: { error: { message: "overloaded", type: "x", code: "503" } },
          kind: "overloaded",
          calls: 2,
        },
        {
          label: "non-JSON 502",
          status: 502,
          json: null,
          kind: "server",
          calls: 2,
          includes: "HTTP 502",
        },
        {
          label: "FastAPI detail string",
          status: 422,
          json: { detail: "questions must be a non-empty map" },
          kind: "invalid_request",
          calls: 1,
          includes: "non-empty map",
        },
      ];
      for (const row of table) {
        const outcome = await xorFailure({
          status: row.status,
          json: row.json,
        });
        expectEq(outcome.kind, row.kind, `${row.label}: kind`);
        expectEq(outcome.calls, row.calls, `${row.label}: attempts`);
        if (row.includes) {
          expect(
            outcome.message.includes(row.includes),
            `${row.label}: message`,
          );
        }
      }
    },
  );

  // ── X7b: a 429 is retried, and the key hash LiteLLM echoes is dropped ──
  await xorCase(
    "DECIDE xor: rate limit retried, key hash dropped",
    async () => {
      const hash =
        "9f2c0e41d3a7b8c6e5f40112233445566778899aabbccddeeff00112233445566";
      const outcome = await xorFailure({
        status: 429,
        json: {
          error: {
            message: `Rate limit reached for key hash ${hash}`,
            type: "throttling_error",
            code: "429",
          },
        },
      });
      expectEq(outcome.kind, "rate_limit", "429 classified");
      expectEq(outcome.calls, 2, "retried once");
      expect(!outcome.message.includes(hash), "hash removed");
      expect(
        outcome.message.includes("Rate limit reached"),
        "the proxy's own text is kept, so the redaction ran on it",
      );
    },
  );

  // ── X7c: a 500 that says the context was exceeded is not retried ──
  // The wording is a stand-in: the real text is unknown until a live probe
  // returns one, so this pins the classification, not XOR's phrasing.
  await xorCase(
    "DECIDE xor: a context-length 500 is not retried (wording unverified live)",
    async () => {
      const outcome = await xorFailure({
        status: 500,
        json: {
          error: "Input length exceeds the maximum context length of the model",
        },
      });
      expectEq(
        outcome.kind,
        "max_tokens_exceeded",
        "context-length 500 classified",
      );
      expectEq(outcome.calls, 1, "the oversized body is not sent twice");
    },
  );

  // ── X8: a LiteLLM 401 — classified, redacted, and the breaker trips ──
  await xorCase(
    "DECIDE xor: proxy 401 trips the breaker, key echo dropped",
    async () => {
      await withMocks(
        [
          {
            method: "POST",
            url: XOR_DECIDE_SPEC.urlMatch,
            respond: {
              status: 401,
              json: {
                error: {
                  message:
                    "Authentication Error, Invalid proxy server token passed. Received API Key = sk-...cred, Key Hash (Token) =9f2c0e41d3a7b8c6e5f40112233445566778899aabbccddeeff00112233445566. The key test-fake-xor-credential was not found",
                  type: "token_not_found_in_db",
                  code: "401",
                },
              },
            },
          },
        ],
        async ({ calls }) => {
          const provider = await createXor();
          const first = await captureDecisionFailure(() => decideOne(provider));
          expectEq(first.kind, "authentication", "401 classified");
          expect(
            !/sk-|test-fake-xor-credential|[0-9a-f]{32}/i.test(first.message),
            "key echo removed",
          );
          expect(
            first.message.includes("Authentication Error"),
            "the proxy's own text is kept, so the redaction ran on it",
          );
          const second = await captureDecisionFailure(() =>
            decideOne(provider),
          );
          expectEq(
            second.kind,
            "authentication",
            "breaker keeps the classification",
          );
          expect(
            second.message.includes("rejected this API key earlier"),
            "breaker message",
          );
          expectEq(calls.length, 1, "no second request after a rejected key");
        },
      );
    },
  );

  // ── X9: a 403 is a fixable access gap — the SAME instance works once it is fixed ──
  await xorCase("DECIDE xor: a 403 does not trip the breaker", async () => {
    let sent = 0;
    await withMocks(
      [
        {
          method: "POST",
          url: XOR_DECIDE_SPEC.urlMatch,
          respond: () =>
            sent++ === 0
              ? {
                  status: 403,
                  json: {
                    error: {
                      message: "team not allowed to access model=xor-latest",
                      type: "team_model_access_denied",
                      code: "403",
                    },
                  },
                }
              : { status: 200, json: xorSuccessBody() },
        },
      ],
      async ({ calls }) => {
        const provider = await createXor();
        const first = await captureDecisionFailure(() => decideOne(provider));
        expectEq(
          first.kind,
          "invalid_request",
          "a 403 is a fixable access gap",
        );
        const second = await decideOne(provider);
        expectEq(
          second.provider,
          "xor",
          "the same instance works once access is granted",
        );
        expectEq(calls.length, 2, "the second request was really sent");
      },
    );
  });

  // ── X10: the state window — refused locally past it, sent within it ──
  await xorCase(
    "DECIDE xor: a state past the window is refused locally",
    async () => {
      await withMocks([xorOkRoute], async ({ calls }) => {
        const provider = await createXor();
        const failure = await captureDecisionFailure(() =>
          decideOne(provider, { state: "a".repeat(2_000_000) }),
        );
        expectEq(
          failure.kind,
          "max_tokens_exceeded",
          "over-window state classified",
        );
        expect(failure.message.includes("xor-latest"), "names the model");
        expectEq(calls.length, 0, "refused before any request");
      });
    },
  );

  await xorCase(
    "DECIDE xor: a state well inside the window still goes out",
    async () => {
      await withMocks([xorOkRoute], async ({ calls }) => {
        await decideOne(await createXor(), { state: "a".repeat(100_000) });
        expectEq(calls.length, 1, "25k tokens is not refused");
      });
    },
  );

  // ── X10b: other scripts are charged per character, not at four per token ──
  await xorCase(
    "DECIDE xor: non-ASCII text is charged at its own rate",
    async () => {
      await withMocks([xorOkRoute], async ({ calls }) => {
        const failure = await captureDecisionFailure(async () =>
          decideOne(await createXor(), { state: "你好".repeat(300_000) }),
        );
        expectEq(
          failure.kind,
          "max_tokens_exceeded",
          "600k Chinese characters refused",
        );
        expectEq(calls.length, 0, "refused before any request");
      });
    },
  );

  // ── X10c: the gateway's 128-question cap: 128 go out, 129 are refused ──
  await xorCase(
    "DECIDE xor: 128 questions go out in one request, and 129 are refused before any",
    async () => {
      const questionsOf = (n: number) =>
        Object.fromEntries(
          Array.from({ length: n }, (_, i) => [
            `q${i}`,
            {
              type: "boolean" as const,
              instructions: `Is statement ${i} true?`,
            },
          ]),
        );
      await withMocks([xorOkRoute], async ({ calls }) => {
        await decideOne(await createXor(), { questions: questionsOf(128) });
        expectEq(calls.length, 1, "128 questions in one request");
      });
      await withMocks([xorOkRoute], async ({ calls }) => {
        const failure = await captureDecisionFailure(async () =>
          decideOne(await createXor(), { questions: questionsOf(129) }),
        );
        expectEq(failure.kind, "max_tokens_exceeded", "129 refused");
        expect(failure.message.includes("at most 128"), "names the cap");
        expectEq(calls.length, 0, "refused before any request");
      });
    },
  );

  const XOR_FIXTURES = fileURLToPath(
    new URL("./fixtures/decide/xor/", import.meta.url),
  );
  const fixturePath = (name: string): string => join(XOR_FIXTURES, name);
  const fixtureBytes = (name: string): Buffer =>
    readFileSync(fixturePath(name));
  const asDataUrl = (mime: string, bytes: Buffer): string =>
    `data:${mime};base64,${bytes.toString("base64")}`;
  type XorSentBody = {
    model?: string;
    state?: unknown;
    images?: string[];
    video?: string;
    audio?: { data?: string; format?: string };
  };
  // One second of 8-bit mono PCM: the header gives an exact length.
  const wavOf = (seconds: number): Buffer => {
    const rate = 8000;
    const dataBytes = Math.round(seconds * rate);
    const wav = Buffer.alloc(44 + dataBytes, 0x80);
    wav.write("RIFF", 0, "latin1");
    wav.writeUInt32LE(36 + dataBytes, 4);
    wav.write("WAVEfmt ", 8, "latin1");
    wav.writeUInt32LE(16, 16);
    wav.writeUInt16LE(1, 20);
    wav.writeUInt16LE(1, 22);
    wav.writeUInt32LE(rate, 24);
    wav.writeUInt32LE(rate, 28);
    wav.writeUInt16LE(1, 32);
    wav.writeUInt16LE(8, 34);
    wav.write("data", 36, "latin1");
    wav.writeUInt32LE(dataBytes, 40);
    return wav;
  };

  // ── X11: one image goes out as a data URL, whichever form it came in ──
  await xorCase(
    "DECIDE xor: an image from a Buffer, a path and a data URL",
    async () => {
      const png = fixtureBytes("red.png");
      const expected = asDataUrl("image/png", png);
      for (const image of [png, fixturePath("red.png"), expected]) {
        await withMocks([xorOkRoute], async ({ calls }) => {
          const result = await decideOne(await createXor(), {
            images: [image],
          });
          const body = calls[0].bodyJson as XorSentBody;
          expectEq(body.images?.length, 1, "one image sent");
          expectEq(body.images?.[0], expected, "every form encodes the same");
          expect(!("video" in body), "no video field");
          expect(!("audio" in body), "no audio field when none was given");
          expectEq(result.mediaBytes, expected.length, "media bytes reported");
        });
      }
    },
  );

  // XOR's gateway drops a video and the model answers without it, so the
  // request is refused rather than answered blind.
  await xorCase(
    "DECIDE xor: a video from a Buffer or a path is refused before any request",
    async () => {
      for (const video of [fixtureBytes("red.mp4"), fixturePath("red.mp4")]) {
        await withMocks([xorOkRoute], async ({ calls }) => {
          const failure = await captureDecisionFailure(async () =>
            decideOne(await createXor(), { video }),
          );
          expectEq(failure.kind, "invalid_request", "video refused");
          expect(failure.message.includes("does not accept video"), "says why");
          expectEq(calls.length, 0, "no request");
        });
      }
    },
  );

  await xorCase(
    "DECIDE xor: an image and an audio clip go out together, the clip as { data, format }",
    async () => {
      const wav = wavOf(1);
      await withMocks([xorOkRoute], async ({ calls }) => {
        const result = await decideOne(await createXor(), {
          state: "",
          images: [fixtureBytes("red.png")],
          audio: wav,
        });
        const body = calls[0].bodyJson as XorSentBody;
        expectEq(body.images?.length, 1, "the image is sent");
        expectEq(body.audio?.format, "wav", "the clip's format");
        expectEq(
          body.audio?.data,
          wav.toString("base64"),
          "the clip's bytes, as base64 and not a data URL",
        );
        expectEq(body.state, "", "an empty state is kept");
        expectEq(
          result.mediaBytes,
          asDataUrl("image/png", fixtureBytes("red.png")).length +
            wav.toString("base64").length,
          "media bytes count the image and the clip",
        );
      });
    },
  );

  // ── X12: hostile inputs are refused before any request ──
  await xorCase(
    "DECIDE xor: unusable media is refused, with no request",
    async () => {
      const png = fixtureBytes("red.png");
      const dir = mkdtempSync(join(tmpdir(), "xor-media-"));
      const big = join(dir, "big.png");
      writeFileSync(
        big,
        Buffer.concat([png.subarray(0, 8), Buffer.alloc(26 * 1024 * 1024)]),
      );
      const rows: Array<{
        label: string;
        request: Partial<DecisionRequest>;
        includes: string;
      }> = [
        {
          label: "two images",
          request: { images: [png, png] },
          includes: "at most 1",
        },
        {
          label: "a remote URL in any case",
          request: { images: ["HTTPS://example.test/a.png"] },
          includes: "remote URL",
        },
        {
          label: "a text data URL",
          request: { images: ["data:text/plain;base64,AAAA"] },
          includes: "not base64 image",
        },
        {
          label: "non-image bytes",
          request: { images: [Buffer.from("not an image at all")] },
          includes: "not a recognised image",
        },
        {
          label: "a video of any kind",
          request: { video: png },
          includes: "does not accept video",
        },
        {
          label: "an M4A clip",
          request: {
            audio: Buffer.concat([
              Buffer.from([0, 0, 0, 0x20]),
              Buffer.from("ftypM4A ", "latin1"),
              Buffer.alloc(24),
            ]),
          },
          includes: "AAC or M4A",
        },
        {
          label: "a WAV clip over 30 seconds",
          request: { audio: wavOf(31) },
          includes: "the model hears at most 30",
        },
        {
          label: "bytes that are not audio",
          request: { audio: Buffer.from("not audio at all") },
          includes: "not a recognised audio format",
        },
        {
          label: "an image data URL as audio",
          request: { audio: "data:image/png;base64,AAAA" },
          includes: "not base64 audio",
        },
        {
          label: "an empty Buffer",
          request: { images: [Buffer.alloc(0)] },
          includes: "empty Buffer",
        },
        {
          label: "an empty string",
          request: { images: [""] },
          includes: "empty string",
        },
        {
          label: "a missing file",
          request: { images: [join(dir, "no-such-file.png")] },
          includes: "Could not read Image 1",
        },
        {
          label: "a directory",
          request: { images: [dir] },
          includes: "not a file",
        },
        {
          label: "a file over the body limit",
          request: { images: [big] },
          includes: "at most 25000000",
        },
        {
          label: "a body over the limit",
          request: {
            images: [`data:image/png;base64,${"A".repeat(26 * 1024 * 1024)}`],
          },
          includes: "The request is",
        },
      ];
      for (const row of rows) {
        await withMocks([xorOkRoute], async ({ calls }) => {
          const failure = await captureDecisionFailure(async () =>
            decideOne(await createXor(), row.request),
          );
          expectEq(failure.kind, "invalid_request", `${row.label}: kind`);
          expect(
            failure.message.includes(row.includes),
            `${row.label}: message`,
          );
          expectEq(calls.length, 0, `${row.label}: no request`);
        });
      }
    },
  );

  // ── X13: providers that declare no media capability refuse it, and name the fix ──
  await xorCase(
    "DECIDE xor: typesafe and laya refuse media before any request",
    async () => {
      setEnv(TYPESAFE_DECIDE_SPEC.envVar, "test-fake-typesafe-credential");
      setEnv("LAYA_API_KEY", "test-fake-laya-credential");
      setEnv("LAYA_BASE_URL", LAYA_DECIDE_SPEC.baseURL);
      const { ProviderFactory } =
        await import("../dist/factories/providerFactory.js");
      await withMocks(
        [
          {
            method: "POST",
            url: TYPESAFE_DECIDE_SPEC.urlMatch,
            respond: { status: 200, json: {} },
          },
          {
            method: "POST",
            url: LAYA_DECIDE_SPEC.urlMatch,
            respond: { status: 200, json: {} },
          },
        ],
        async ({ calls }) => {
          for (const name of ["typesafe", "laya"]) {
            const provider = await ProviderFactory.createProvider(name);
            const failure = await captureDecisionFailure(() =>
              provider.decide!({
                state: "short",
                questions: { q: XOR_QUESTIONS.urgent },
                images: [fixtureBytes("red.png")],
              }),
            );
            expectEq(failure.kind, "invalid_request", `${name}: kind`);
            expect(
              failure.message.includes("does not accept images or video") &&
                failure.message.includes("xor") &&
                failure.message.includes("perplexity-decider"),
              `${name}: names every provider that reads images`,
            );
            // No provider reads video, so a video refusal points nowhere; XOR
            // alone reads audio, so an audio refusal points at XOR alone.
            const withVideo = await captureDecisionFailure(() =>
              provider.decide!({
                state: "short",
                questions: { q: XOR_QUESTIONS.urgent },
                video: fixtureBytes("blue.mp4"),
              }),
            );
            expectEq(withVideo.kind, "invalid_request", `${name}: video kind`);
            expect(
              !withVideo.message.includes("xor") &&
                !withVideo.message.includes("perplexity-decider"),
              `${name}: a video refusal names no provider, since none reads video`,
            );
            const withAudio = await captureDecisionFailure(() =>
              provider.decide!({
                state: "short",
                questions: { q: XOR_QUESTIONS.urgent },
                audio: wavOf(1),
              }),
            );
            expectEq(withAudio.kind, "invalid_request", `${name}: audio kind`);
            expect(
              withAudio.message.includes("does not accept audio") &&
                withAudio.message.includes("xor") &&
                !withAudio.message.includes("perplexity-decider"),
              `${name}: an audio refusal names only the provider that reads audio`,
            );
          }
          expectEq(calls.length, 0, "no request from either");
        },
      );
    },
  );

  // ── X14: no base64 in logs, spans or errors; spans carry counts and sizes ──
  await xorCase(
    "DECIDE xor: media stays out of logs, spans and errors",
    async () => {
      const png = fixtureBytes("red.png");
      const marker = png.toString("base64").slice(40, 120);
      const seen: string[] = [];
      const originals = {
        debug: console.debug,
        info: console.info,
        log: console.log,
        warn: console.warn,
        error: console.error,
      };
      const capture = (...args: unknown[]) => {
        seen.push(
          args
            .map((a) => (typeof a === "string" ? a : JSON.stringify(a)))
            .join(" "),
        );
      };
      const { NeuroLink, logger } = await import("../dist/index.js");
      try {
        setEnv("NEUROLINK_DEBUG", "true");
        logger.setLogLevel("debug");
        Object.assign(console, {
          debug: capture,
          info: capture,
          log: capture,
          warn: capture,
          error: capture,
        });
        await withMocks(
          [
            xorOkRoute,
            // A proxy that echoes the data URL back inside an error message.
            {
              method: "POST",
              url: "xor.echo.example/v1/decisions",
              respond: {
                status: 422,
                json: {
                  error: `bad image data:image/png;base64,${png.toString("base64")}`,
                },
              },
            },
          ],
          async () => {
            const nl = new NeuroLink({
              credentials: {
                xor: {
                  apiKey: "test-fake-xor-credential",
                  baseURL: XOR_DECIDE_SPEC.baseURL,
                },
              },
            });
            await nl.decide({
              provider: "xor",
              state: "short",
              questions: { urgent: XOR_QUESTIONS.urgent },
              images: [png],
            });
            const span = nl.getSpans().find((s) => s.type === "model.decision");
            const attrs = (span?.attributes ?? {}) as Record<string, unknown>;
            expectEq(
              attrs["decision.images.count"],
              1,
              "image count on the span",
            );
            expectEq(
              attrs["decision.media.bytes"],
              asDataUrl("image/png", png).length,
              "media bytes on the span",
            );
            expect(
              !JSON.stringify(nl.getSpans()).includes(marker),
              "no base64 in spans",
            );

            const echo = new NeuroLink({
              credentials: {
                xor: {
                  apiKey: "test-fake-xor-credential",
                  baseURL: "https://xor.echo.example",
                },
              },
            });
            const failure = await captureDecisionFailure(() =>
              echo.decide({
                provider: "xor",
                state: "short",
                questions: { urgent: XOR_QUESTIONS.urgent },
                images: [png],
              }),
            );
            expect(
              !failure.message.includes(marker),
              "no base64 in an echoed error",
            );
          },
        );
        expect(
          !seen.some((line) => line.includes(marker)),
          "no base64 in any log line",
        );
      } finally {
        Object.assign(console, originals);
        logger.setLogLevel("info");
        setEnv("NEUROLINK_DEBUG", undefined);
      }
    },
  );

  // ── X12b: a string that is neither a path, a URL nor a data: URL is refused, never echoed ──
  await xorCase(
    "DECIDE xor: a stray string is refused without being echoed",
    async () => {
      const bareBase64 = fixtureBytes("red.png").toString("base64");
      const marker = bareBase64.slice(40, 120);
      const rows: Array<{ label: string; value: string; includes: string }> = [
        {
          label: "bare base64",
          value: bareBase64,
          includes: `${bareBase64.length}-character string`,
        },
        {
          label: "a very long string",
          value: "A".repeat(100_000),
          includes: "100000-character string",
        },
        {
          label: "another URL scheme",
          value: "s3://bucket/key.png",
          includes: "unsupported URL scheme",
        },
        {
          label: "a file: URL",
          value: "file:///tmp/xor-no-such-file.png",
          includes: "unsupported URL scheme",
        },
      ];
      for (const row of rows) {
        await withMocks([xorOkRoute], async ({ calls }) => {
          const failure = await captureDecisionFailure(async () =>
            decideOne(await createXor(), { images: [row.value] }),
          );
          expectEq(failure.kind, "invalid_request", `${row.label}: kind`);
          expect(
            failure.message.includes(row.includes),
            `${row.label}: message`,
          );
          expect(
            !failure.message.includes(row.value.slice(0, 60)) &&
              !failure.message.includes(marker),
            `${row.label}: the value is not echoed`,
          );
          expect(
            failure.message.length < 600,
            `${row.label}: message is short`,
          );
          expectEq(calls.length, 0, `${row.label}: no request`);
        });
      }
    },
  );

  // ── X15: a base URL that cannot work, or carries a credential, is refused and never echoed ──
  await xorCase(
    "DECIDE xor: a base URL that carries credentials is refused, never echoed",
    async () => {
      try {
        for (const [label, base] of [
          ["userinfo", "https://ops:hunter2-basic@xor.internal.test/proxy"],
          [
            "query token",
            "https://xor.internal.test/proxy?token=hunter2-query",
          ],
          ["fragment", "https://xor.internal.test/proxy#hunter2-fragment"],
          ["not a URL", "not a url hunter2-raw"],
          ["no scheme", "xor.internal:8080 hunter2-noscheme"],
          ["scheme-less userinfo", "user:hunter2-basic@host.example:8080"],
          ["file scheme", "file:///tmp/hunter2-file"],
          ["ftp scheme", "ftp://host.example/hunter2-ftp"],
        ]) {
          setEnv("XOR_BASE_URL", base);
          await withMocks(
            [{ ...xorOkRoute, url: "/v1/decisions" }],
            async ({ calls }) => {
              const failure = await captureDecisionFailure(async () =>
                decideOne(await createXor()),
              );
              expectEq(failure.kind, "invalid_request", `${label}: kind`);
              expect(
                failure.message.includes("XOR_BASE_URL") &&
                  failure.message.includes("credentials.xor.baseURL"),
                `${label}: names both ways to set it`,
              );
              expect(
                !failure.message.includes("hunter2"),
                `${label}: nothing from the value is echoed`,
              );
              expectEq(calls.length, 0, `${label}: no request`);
            },
          );
        }
      } finally {
        setEnv("XOR_BASE_URL", XOR_DECIDE_SPEC.baseURL);
      }
    },
  );

  // ── X16: a transport error that names a URL with credentials is redacted ──
  await xorCase(
    "DECIDE xor: a network error naming a URL with credentials is redacted",
    async () => {
      await withMocks(
        [
          {
            method: "POST",
            url: XOR_DECIDE_SPEC.urlMatch,
            respond: () => {
              throw new TypeError(
                "Request cannot be constructed from a URL that includes credentials: https://ops:hunter2-basic@xor.internal.test/proxy/v1/decisions?token=hunter2-query",
              );
            },
          },
        ],
        async () => {
          const failure = await captureDecisionFailure(async () =>
            decideOne(await createXor()),
          );
          expectEq(
            failure.kind,
            "network",
            "a transport failure is a network error",
          );
          expect(
            !failure.message.includes("hunter2"),
            "no credential from the URL reaches the message",
          );
          expect(
            failure.message.includes("xor.internal.test"),
            "the host stays for diagnostics",
          );
        },
      );
    },
  );

  // ── X16b: a network error that repeats the configured key or a key-shaped token is scrubbed ──
  await xorCase(
    "DECIDE xor: a network error repeating the key is scrubbed",
    async () => {
      await withMocks(
        [
          {
            method: "POST",
            url: XOR_DECIDE_SPEC.urlMatch,
            respond: () => {
              throw new TypeError(
                "upstream refused test-fake-xor-credential and sk-ambient1234567890abcdef at https://xor.internal.test/proxy",
              );
            },
          },
        ],
        async () => {
          const failure = await captureDecisionFailure(async () =>
            decideOne(await createXor()),
          );
          expectEq(
            failure.kind,
            "network",
            "a transport failure is a network error",
          );
          expect(
            !failure.message.includes("test-fake-xor-credential") &&
              !failure.message.includes("sk-ambient"),
            "neither the configured key nor a key-shaped token reaches the message",
          );
          expect(
            failure.message.includes("xor.internal.test"),
            "the host stays for diagnostics",
          );
        },
      );
    },
  );
}

// ───────────────────────────────────────────────────────────────────────
// Section: Perplexity Decisions (decide-only)
// ───────────────────────────────────────────────────────────────────────

/**
 * The Decisions API answers the same typed `noul` / `choice` / `score`
 * questions as the other decision providers, so the `boolean`↔`noul`
 * translation and the answer parser are shared. What this section pins is
 * Perplexity's own: a public endpoint that needs only a key (the
 * `PERPLEXITY_API_KEY` the Sonar text provider reads too), the `model` field
 * that is always sent, images that travel inside `state`, the three error
 * envelopes, `Retry-After`, and the limits.
 *
 * The 200 body is the API reference's own example, which a live probe
 * reproduced number for number. The error bodies are the shapes that probe saw.
 * A case that rests on a stand-in (a status or a field no live call returned)
 * says so where it is.
 */
const PERPLEXITY_DECIDE_SPEC = {
  provider: "perplexity-decider",
  envVar: "PERPLEXITY_API_KEY",
  baseURLEnvVar: "PERPLEXITY_DECIDER_BASE_URL",
  key: "test-fake-perplexity-decider-credential",
  urlMatch: "api.perplexity.ai/v1/decisions",
  endpoint: "https://api.perplexity.ai/v1/decisions",
  model: "pplx-decider-v1-27b",
};

/** The API reference's example `x-request-id`. */
const PERPLEXITY_REQUEST_ID = "7a1504a6-a884-48e6-af6e-0c3140aeb6db";

const PERPLEXITY_REVIEW = {
  title: "Battery died after two weeks",
  review:
    "The headphones sound great, but the battery stopped charging after two weeks.",
};

// The API reference's request in the SDK's own spelling: `boolean` is the SDK's
// name for the wire's `noul`.
const PERPLEXITY_QUESTIONS = {
  defect: {
    type: "boolean",
    instructions: "Does the review report a product defect?",
  },
  sentiment: {
    type: "choice",
    instructions: "What is the overall sentiment of the review?",
    criteria: {
      positive: "Mostly satisfied",
      mixed: "Praise and complaints in one review",
      negative: "Mostly dissatisfied",
    },
  },
  severity: {
    type: "score",
    instructions: "How severe is the reported problem?",
    criteria: ["Cosmetic", "Inconvenient", "Product unusable"],
  },
} satisfies DecisionQuestionMap;

const PERPLEXITY_ONE_QUESTION = {
  urgent: { type: "boolean", instructions: "Is this urgent?" },
} satisfies DecisionQuestionMap;

/** What PERPLEXITY_QUESTIONS must look like on the wire: only `boolean` is renamed. */
const PERPLEXITY_WIRE_REQUEST = {
  model: "pplx-decider-v1-27b",
  state: {
    title: "Battery died after two weeks",
    review:
      "The headphones sound great, but the battery stopped charging after two weeks.",
  },
  questions: {
    defect: {
      type: "noul",
      instructions: "Does the review report a product defect?",
    },
    sentiment: {
      type: "choice",
      instructions: "What is the overall sentiment of the review?",
      criteria: {
        positive: "Mostly satisfied",
        mixed: "Praise and complaints in one review",
        negative: "Mostly dissatisfied",
      },
    },
    severity: {
      type: "score",
      instructions: "How severe is the reported problem?",
      criteria: ["Cosmetic", "Inconvenient", "Product unusable"],
    },
  },
};

type PerplexityLiveBody = {
  model: string;
  answers: Record<string, Record<string, unknown>>;
  usage: { input_tokens: number; output_tokens: number };
};

/** The API reference's example response, which the live API returned unchanged. */
function perplexityLiveBody(
  model: string = PERPLEXITY_DECIDE_SPEC.model,
): PerplexityLiveBody {
  return {
    model,
    answers: {
      defect: { type: "noul", noul: 0.9424522889347015 },
      sentiment: {
        type: "choice",
        choice: "mixed",
        confidence: 0.9255246944002182,
        probabilities: {
          positive: 0.020649883775315993,
          mixed: 0.9503497962668123,
          negative: 0.02900031995787183,
        },
      },
      severity: {
        type: "score",
        score: 1.7838686319784252,
        confidence: 0.7838686319784252,
        legend: {
          "0": "Cosmetic",
          "1": "Inconvenient",
          "2": "Product unusable",
        },
        probabilities: {
          "0": 0.008423954913615923,
          "1": 0.199283458194343,
          "2": 0.7922925868920411,
        },
      },
    },
    usage: { input_tokens: 367, output_tokens: 3 },
  };
}

// The error envelopes a live probe saw, all `{"error": {...}}`, except
// `tooLarge`, the 413 Perplexity documents and that was never provoked. Which
// layer answered decides the shape: `code` is a number, null or a string, so
// only the HTTP status is reliable.
const PERPLEXITY_ERRORS = {
  // 401: the key is checked before the body, and `code` is a number here.
  invalidKey: {
    error: {
      message:
        "Invalid API key provided. Ensure your API key is correct and active.",
      type: "invalid_api_key",
      code: 401,
    },
  },
  // 400 from the gateway layer: `code` and `param` are null.
  gatewayBadRequest: {
    error: {
      code: null,
      message:
        "The request body is not valid JSON for the Decisions API, or has an unknown or mistyped field.",
      param: null,
      type: "invalid_request_error",
    },
  },
  // 400 from the model server: `code` is a string.
  modelServerBadRequest: {
    error: {
      message: "Noul question must have criteria or instructions",
      type: "invalid_request",
      code: "400",
    },
  },
  // The model server's refusal of an input past its context window.
  overLength: {
    error: {
      message:
        "Input length (262144) exceeds or equals model's maximum context length (262144)",
      type: "invalid_request",
      code: "400",
    },
  },
  // The same refusal when images are part of the input; the wording differs.
  // Measured live on 2026-10-03: 250,676 text tokens plus eight 2,048-tile
  // images.
  overLengthWithImages: {
    error: {
      message:
        "Total input tokens (250676 text + 16384 vision = 267060) exceeds maximum context length (262144)",
      type: "invalid_request",
      code: "400",
    },
  },
  tooLarge: {
    error: {
      code: null,
      message:
        "request body exceeds the maximum allowed size of 33554432 bytes",
      param: null,
      type: "invalid_request_error",
    },
  },
  rateLimited: {
    error: {
      code: null,
      message: "Request rate limit exceeded, please try again later.",
      param: null,
      type: "too_many_requests",
    },
  },
};

/** An HTML page of the kind the gateway answers a 504 with, after about a minute. */
const PERPLEXITY_GATEWAY_PAGE =
  "<html><head><title>504 Gateway Time-out</title></head><body><center><h1>504 Gateway Time-out</h1></center><p>gateway-page-marker</p></body></html>";

type PerplexityReply = {
  status: number;
  json?: unknown;
  text?: string;
  contentType?: string;
  headers?: Record<string, string>;
};
type PerplexityRespond = PerplexityReply | (() => PerplexityReply);

function perplexityRoute(
  respond: PerplexityRespond = { status: 200, json: perplexityLiveBody() },
) {
  return { method: "POST", url: PERPLEXITY_DECIDE_SPEC.urlMatch, respond };
}

/**
 * Replies in order, the last one repeating, noting when each request arrived.
 * `onRequest` runs inside the request, right after it is noted, so a case can
 * act while the call is in flight.
 */
function perplexityScript(
  replies: readonly PerplexityReply[],
  onRequest?: (index: number) => void,
) {
  const stamps: number[] = [];
  const route = perplexityRoute(() => {
    stamps.push(Date.now());
    onRequest?.(stamps.length - 1);
    return replies[Math.min(stamps.length - 1, replies.length - 1)];
  });
  return { route, stamps };
}

const perplexityPause = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

async function createPerplexity(model?: string) {
  const { ProviderFactory } = await import("../dist/index.js");
  return ProviderFactory.createProvider(PERPLEXITY_DECIDE_SPEC.provider, model);
}

/** One decision on a single question, for tests that only care what was sent. */
async function perplexityDecideOne(
  provider: Awaited<ReturnType<typeof createPerplexity>>,
  overrides: Partial<DecisionRequest> = {},
) {
  return provider.decide!({
    state: "short",
    questions: PERPLEXITY_ONE_QUESTION,
    ...overrides,
  });
}

type PerplexityBody = {
  model?: string;
  state?: unknown;
  questions?: Record<string, unknown>;
};

function perplexityBodyOf(call: { bodyJson: unknown } | undefined) {
  return (call?.bodyJson ?? {}) as PerplexityBody;
}

type PerplexityFailure = {
  threw: boolean;
  kind: string | undefined;
  message: string;
  status: number | undefined;
  requestId: string | undefined;
  retryable: boolean | undefined;
};

/** Run one decision expected to fail, and report everything the error carries. */
async function capturePerplexityFailure(
  run: () => Promise<unknown>,
): Promise<PerplexityFailure> {
  try {
    await run();
  } catch (error) {
    const cause = (
      error as {
        cause?: {
          kind?: string;
          status?: number;
          requestId?: string;
          retryable?: boolean;
        };
      }
    ).cause;
    return {
      threw: true,
      kind: cause?.kind,
      message: error instanceof Error ? error.message : "",
      status: cause?.status,
      requestId: cause?.requestId,
      retryable: cause?.retryable,
    };
  }
  return {
    threw: false,
    kind: undefined,
    message: "",
    status: undefined,
    requestId: undefined,
    retryable: undefined,
  };
}

/** Run one decision against a canned reply; report how it was classified. */
async function perplexityOutcome(
  respond: PerplexityRespond,
  request: Partial<DecisionRequest> = {},
) {
  return withMocks([perplexityRoute(respond)], async ({ calls }) => {
    const failure = await capturePerplexityFailure(async () =>
      perplexityDecideOne(await createPerplexity(), request),
    );
    return { ...failure, calls: calls.length };
  });
}

async function perplexityCase(
  name: string,
  body: () => Promise<void>,
): Promise<void> {
  try {
    await body();
    record(results, name, true);
  } catch (err) {
    record(
      results,
      name,
      false,
      err instanceof Error ? err.message : String(err),
    );
  }
}

/** Key order is not part of a JSON contract, so bodies are compared with keys sorted. */
function stableJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableJson).join(",")}]`;
  }
  if (typeof value === "object" && value !== null) {
    return `{${Object.entries(value)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([k, v]) => `${JSON.stringify(k)}:${stableJson(v)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

const sameJson = (actual: unknown, expected: unknown): boolean =>
  stableJson(actual) === stableJson(expected);

const dataUrl = (mime: string, bytes: Buffer): string =>
  `data:${mime};base64,${bytes.toString("base64")}`;

const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

function syntheticPng(width: number, height: number): Buffer {
  const ihdr = Buffer.alloc(25);
  ihdr.writeUInt32BE(13, 0);
  ihdr.write("IHDR", 4, "ascii");
  ihdr.writeUInt32BE(width, 8);
  ihdr.writeUInt32BE(height, 12);
  // 8-bit RGB; the CRC after it is left zero, since the size reader skips it.
  ihdr.set([8, 2, 0, 0, 0], 16);
  return Buffer.concat([PNG_SIGNATURE, ihdr]);
}

function syntheticWebp(chunk: string): Buffer {
  const bytes = Buffer.alloc(30);
  bytes.write("RIFF", 0, "ascii");
  bytes.writeUInt32LE(22, 4);
  bytes.write("WEBP", 8, "ascii");
  bytes.write(chunk, 12, "ascii");
  bytes.writeUInt32LE(10, 16);
  return bytes;
}

type SyntheticImageLayout = {
  label: string;
  mime: string;
  build: (width: number, height: number) => Buffer;
};

/**
 * Bytes that carry only what the provider reads: a format signature and the
 * picture's size. They do not decode, which is the point: the size check can be
 * driven at any dimensions without a megabyte fixture, and none of it reaches a
 * real server. Each layout is a different place the size lives: PNG's IHDR, a
 * JPEG's first frame header, and the three WebP flavours.
 */
const SYNTHETIC_IMAGE_LAYOUTS: readonly SyntheticImageLayout[] = [
  { label: "PNG", mime: "image/png", build: syntheticPng },
  {
    label: "JPEG",
    mime: "image/jpeg",
    build: (width, height) =>
      Buffer.from([
        0xff,
        0xd8,
        0xff,
        0xc0,
        0x00,
        0x11,
        0x08,
        height >> 8,
        height & 0xff,
        width >> 8,
        width & 0xff,
        0x03,
        0x01,
        0x22,
        0x00,
        0x02,
        0x11,
        0x01,
        0x03,
        0x11,
        0x01,
        0xff,
        0xd9,
      ]),
  },
  {
    // What an encoder writes: the frame header is not first, so the reader has
    // to step over a JFIF segment and a quantisation table to reach it, and it
    // is the progressive one (SOF2).
    label: "JPEG (progressive, after APP0 and DQT)",
    mime: "image/jpeg",
    build: (width, height) =>
      Buffer.concat([
        Buffer.from([0xff, 0xd8]),
        Buffer.from([
          0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01,
          0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00,
        ]),
        Buffer.from([0xff, 0xdb, 0x00, 0x43, 0x00]),
        Buffer.alloc(64, 1),
        Buffer.from([
          0xff,
          0xc2,
          0x00,
          0x11,
          0x08,
          height >> 8,
          height & 0xff,
          width >> 8,
          width & 0xff,
          0x03,
          0x01,
          0x22,
          0x00,
          0x02,
          0x11,
          0x01,
          0x03,
          0x11,
          0x01,
        ]),
        Buffer.from([0xff, 0xd9]),
      ]),
  },
  {
    label: "WebP (VP8X)",
    mime: "image/webp",
    build: (width, height) => {
      const bytes = syntheticWebp("VP8X");
      bytes.writeUIntLE(width - 1, 24, 3);
      bytes.writeUIntLE(height - 1, 27, 3);
      return bytes;
    },
  },
  {
    label: "WebP (VP8L)",
    mime: "image/webp",
    build: (width, height) => {
      const bytes = syntheticWebp("VP8L");
      bytes[20] = 0x2f;
      bytes.writeUInt32LE(
        ((width - 1) & 0x3fff) | (((height - 1) & 0x3fff) << 14),
        21,
      );
      return bytes;
    },
  },
  {
    label: "WebP (VP8)",
    mime: "image/webp",
    build: (width, height) => {
      const bytes = syntheticWebp("VP8 ");
      bytes.set([0x9d, 0x01, 0x2a], 23);
      bytes.writeUInt16LE(width, 26);
      bytes.writeUInt16LE(height, 28);
      return bytes;
    },
  },
];

/** Every variable that can make a decision provider the default one. */
const PERPLEXITY_DECISION_ENV = [
  "TYPESAFE_API_KEY",
  "AI_GATEWAY_API_KEY",
  "LAYA_API_KEY",
  "LAYA_BASE_URL",
  "XOR_API_KEY",
  "XOR_BASE_URL",
  "PERPLEXITY_API_KEY",
  "PERPLEXITY_DECIDER_BASE_URL",
  "PERPLEXITY_DECIDER_MODEL",
  "SUBQ_API_KEY",
  "SUBQ_BASE_URL",
  "SUBQ_MODEL",
  "OPENAI_API_KEY",
  "OPENAI_DECISIONS_BASE_URL",
  "OPENAI_DECISIONS_MODEL",
  "SCALEDOWN_API_KEY",
  "SCALEDOWN_BASE_URL",
  "SCALEDOWN_MODEL",
];

/** No decision provider configured at all. */
function clearPerplexityEnv(): void {
  for (const name of PERPLEXITY_DECISION_ENV) {
    setEnv(name, undefined);
  }
}

/** Only the Perplexity key set: no other decision provider is configured. */
function resetPerplexityEnv(): void {
  clearPerplexityEnv();
  setEnv(PERPLEXITY_DECIDE_SPEC.envVar, PERPLEXITY_DECIDE_SPEC.key);
}

/**
 * Base URLs that cannot work. Each carries the marker `hunter2`, which must
 * reach neither an error message nor a log line. The scheme-less userinfo row is
 * the one `new URL()` reads as the scheme `user:`, which a redactor that rebuilds
 * a URL from its scheme and host hands straight back.
 */
const PERPLEXITY_BAD_BASE_URLS: readonly (readonly [string, string])[] = [
  ["userinfo", "https://ops:hunter2-basic@pplx.internal.test/proxy"],
  // Each half of the userinfo alone, so the guard cannot lose one of its terms
  // unnoticed.
  ["username only", "https://hunter2-user@pplx.internal.test/proxy"],
  ["password only", "https://:hunter2-pass@pplx.internal.test/proxy"],
  ["query token", "https://pplx.internal.test/proxy?token=hunter2-query"],
  [
    "userinfo and query token",
    "https://ops:hunter2-basic@pplx.internal.test/proxy?token=hunter2-query",
  ],
  ["fragment", "https://pplx.internal.test/proxy#hunter2-fragment"],
  ["not a URL", "not a url hunter2-raw"],
  ["no scheme", "pplx.internal:8080 hunter2-noscheme"],
  ["no host", "pplx.internal.test/hunter2-nohost"],
  ["scheme-less userinfo", "user:hunter2-basic@host.example:8080"],
  ["file scheme", "file:///tmp/hunter2-file"],
  ["ftp scheme", "ftp://host.example/hunter2-ftp"],
];

async function runPerplexityWire(): Promise<void> {
  const { envVar, baseURLEnvVar, key, endpoint } = PERPLEXITY_DECIDE_SPEC;

  // ── P0: no key — refused as authentication, and nothing is sent ──
  await perplexityCase(
    "DECIDE perplexity-decider: no key, no request",
    async () => {
      try {
        for (const blank of [undefined, "   "]) {
          setEnv(envVar, blank);
          await withMocks([perplexityRoute()], async ({ calls }) => {
            const failure = await capturePerplexityFailure(async () =>
              perplexityDecideOne(await createPerplexity()),
            );
            expectEq(failure.kind, "authentication", "missing key classified");
            expect(
              failure.message.includes("PERPLEXITY_API_KEY") &&
                failure.message.includes(
                  "credentials.perplexityDecider.apiKey",
                ),
              "names both ways to set it",
            );
            expect(failure.retryable === false, "a missing key is not retried");
            expectEq(calls.length, 0, "no network call without a key");
          });
        }
      } finally {
        setEnv(envVar, key);
      }
    },
  );

  // ── P1: the wire — route, method, credential, content type, three body keys ──
  await perplexityCase("DECIDE perplexity-decider: wire contract", async () => {
    await withMocks([perplexityRoute()], async ({ calls }) => {
      await (
        await createPerplexity()
      ).decide!({
        state: PERPLEXITY_REVIEW,
        questions: PERPLEXITY_QUESTIONS,
      });
      expectEq(calls.length, 1, "single POST");
      const call = calls[0];
      expectEq(call.method, "POST", "method");
      expectEq(call.url, endpoint, "route");
      expectEq(
        call.headers.authorization,
        `Bearer ${key}`,
        "bearer credential",
      );
      expect(
        (call.headers["content-type"] ?? "").includes("application/json"),
        "JSON content type",
      );
      expect(
        !("x-api-key" in call.headers),
        "the key travels only as a bearer token",
      );
      expectEq(
        call.headers["x-pplx-integration"],
        "neurolink",
        "Perplexity's integration attribution on its own API host",
      );
      const body = call.bodyJson as Record<string, unknown>;
      expectEq(
        Object.keys(body).sort().join(","),
        "model,questions,state",
        "exactly the three documented body keys",
      );
      expect(
        sameJson(body, PERPLEXITY_WIRE_REQUEST),
        "the body is the API reference's request",
      );
    });
  });

  await perplexityCase(
    "DECIDE perplexity-decider: a boolean keeps its criteria as a noul",
    async () => {
      const criteria = {
        true: "Something is broken or not working.",
        false: "Normal wear or personal preference.",
      };
      await withMocks([perplexityRoute()], async ({ calls }) => {
        await perplexityDecideOne(await createPerplexity(), {
          questions: {
            broken: {
              type: "boolean",
              instructions: "Does the review report a product defect?",
              criteria,
            },
          },
        });
        expect(
          sameJson(perplexityBodyOf(calls[0]).questions, {
            broken: {
              type: "noul",
              instructions: "Does the review report a product defect?",
              criteria,
            },
          }),
          "type renamed, instructions and criteria untouched",
        );
      });
    },
  );

  // ── P2: `model` is always sent: default, construction, per call ──
  await perplexityCase(
    "DECIDE perplexity-decider: the model field is always sent",
    async () => {
      await withMocks([perplexityRoute()], async ({ calls }) => {
        await perplexityDecideOne(await createPerplexity());
        await perplexityDecideOne(await createPerplexity("pplx-custom"));
        await perplexityDecideOne(await createPerplexity("pplx-custom"), {
          model: "pplx-per-call",
        });
        const sent = calls.map((c) => perplexityBodyOf(c).model);
        expectEq(sent[0], PERPLEXITY_DECIDE_SPEC.model, "default model");
        expectEq(sent[1], "pplx-custom", "model pinned at construction");
        expectEq(sent[2], "pplx-per-call", "per-call model wins");
      });
    },
  );

  // The registry reads PERPLEXITY_DECIDER_MODEL once, when providers register, so
  // a value set after that point changes nothing. A fresh process is the only
  // way to give it a value before registration, and so the only place a Sonar
  // variable can be shown not to reach the model either: set in-process, a
  // PERPLEXITY_MODEL arrives after the default was captured and proves nothing.
  await perplexityCase(
    "DECIDE perplexity-decider: PERPLEXITY_DECIDER_MODEL names the model, and the Sonar variables do not",
    async () => {
      const distUrl = new URL("../dist/index.js", import.meta.url).href;
      const child = `
        const sent = [];
        const urls = [];
        globalThis.fetch = async (input, init) => {
          const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
          if (!url.includes("/v1/decisions")) {
            throw new Error("no route for a request this test does not expect");
          }
          const body = JSON.parse(String(init.body));
          sent.push(body.model);
          urls.push(url);
          return new Response(
            JSON.stringify({ model: body.model, answers: { urgent: { type: "noul", noul: 0.5 } }, usage: { input_tokens: 1, output_tokens: 1 } }),
            { status: 200, headers: { "content-type": "application/json" } },
          );
        };
        const { NeuroLink } = await import(${JSON.stringify(distUrl)});
        const nl = new NeuroLink({ conversationMemory: { enabled: false } });
        const questions = { urgent: { type: "boolean", instructions: "Is this urgent?" } };
        const named = await nl.decide({ provider: "perplexity-decider", state: "short", questions });
        const perCall = await nl.decide({ provider: "perplexity-decider", model: "pplx-per-call", state: "short", questions });
        console.log("RESULT:" + JSON.stringify({ sent, urls, named: named.model, perCall: perCall.model }));
        process.exit(0);
      `;
      /** One fresh process, with the Sonar provider's own variables set from the start. */
      const runChild = (decider: Record<string, string>) => {
        const res = spawnSync(
          process.execPath,
          ["--input-type=module", "-e", child],
          {
            encoding: "utf8",
            timeout: 60_000,
            killSignal: "SIGKILL",
            env: {
              ...Object.fromEntries(
                Object.entries(process.env).filter(
                  ([name]) => !PERPLEXITY_DECISION_ENV.includes(name),
                ),
              ),
              PERPLEXITY_API_KEY: key,
              ...decider,
              PERPLEXITY_MODEL: "sonar-pro",
              PERPLEXITY_BASE_URL: "https://sonar.text.example/v1",
            },
          },
        );
        // The detail stays free of the child's output: only its status is quoted.
        expectEq(
          res.status,
          0,
          `the child exited cleanly (signal ${res.signal})`,
        );
        const line = (res.stdout ?? "")
          .split("\n")
          .find((l) => l.startsWith("RESULT:"));
        expect(line !== undefined, "the child reported its requests");
        return JSON.parse((line ?? "RESULT:{}").slice("RESULT:".length)) as {
          sent?: string[];
          urls?: string[];
          named?: string;
          perCall?: string;
        };
      };

      const withVariable = runChild({
        PERPLEXITY_DECIDER_MODEL: "pplx-env-model",
      });
      expect(
        sameJson(withVariable.sent, ["pplx-env-model", "pplx-per-call"]),
        "the variable named the model on the wire, and a per-call model still won",
      );
      expect(
        sameJson(withVariable.urls, [endpoint, endpoint]),
        "the Sonar base URL did not move the route",
      );
      expectEq(
        withVariable.named,
        "pplx-env-model",
        "the result echoes that model",
      );
      expectEq(
        withVariable.perCall,
        "pplx-per-call",
        "the per-call model is echoed",
      );

      // With the decider's own variable unset, the only model that may be used is
      // the default. A fallback to PERPLEXITY_MODEL would send "sonar-pro", which
      // the run above cannot show because there the decider's variable wins.
      const withoutVariable = runChild({});
      expect(
        sameJson(withoutVariable.sent, [
          PERPLEXITY_DECIDE_SPEC.model,
          "pplx-per-call",
        ]),
        "with no PERPLEXITY_DECIDER_MODEL the default model is sent, not PERPLEXITY_MODEL",
      );
      expect(
        sameJson(withoutVariable.urls, [endpoint, endpoint]),
        "the Sonar base URL did not move the route without the decider's model variable either",
      );
      expectEq(
        withoutVariable.named,
        PERPLEXITY_DECIDE_SPEC.model,
        "the result echoes the default model",
      );
    },
  );

  // The Sonar provider reads PERPLEXITY_BASE_URL; decide must not. The base URL
  // is read when a provider is constructed, so setting it here does reach the
  // code under test. PERPLEXITY_MODEL does not: it is checked in the fresh
  // process above, where it exists before the default model is captured.
  await perplexityCase(
    "DECIDE perplexity-decider: the Sonar provider's base URL variable is ignored",
    async () => {
      const prior = process.env.PERPLEXITY_BASE_URL;
      try {
        setEnv("PERPLEXITY_BASE_URL", "https://sonar.text.example/v1");
        await withMocks([perplexityRoute()], async ({ calls }) => {
          await perplexityDecideOne(await createPerplexity());
          expectEq(calls[0]?.url, endpoint, "route unaffected");
        });
      } finally {
        setEnv("PERPLEXITY_BASE_URL", prior);
      }
    },
  );

  // ── P3: every spelling of the base URL reaches the same endpoint ──
  await perplexityCase(
    "DECIDE perplexity-decider: base URL spellings",
    async () => {
      const proxied = "https://pplx.test.example/proxy/v1/decisions";
      const rows: Array<[string, string]> = [
        ["https://pplx.test.example/proxy", proxied],
        ["https://pplx.test.example/proxy/", proxied],
        ["https://pplx.test.example/proxy/v1", proxied],
        ["https://pplx.test.example/proxy/v1/", proxied],
        // The documented server spelling, and a blank override, both mean the
        // public endpoint.
        ["https://api.perplexity.ai/v1", endpoint],
        ["   ", endpoint],
      ];
      try {
        for (const [base, expected] of rows) {
          setEnv(baseURLEnvVar, base);
          await withMocks(
            [{ ...perplexityRoute(), url: "/v1/decisions" }],
            async ({ calls }) => {
              await perplexityDecideOne(await createPerplexity());
              expectEq(calls[0]?.url, expected, "endpoint for this spelling");
              // Attribution goes to Perplexity's own host and to no other.
              expectEq(
                calls[0]?.headers["x-pplx-integration"],
                expected === endpoint ? "neurolink" : undefined,
                "attribution header for this endpoint",
              );
            },
          );
        }
      } finally {
        setEnv(baseURLEnvVar, undefined);
      }
    },
  );

  // ── P4: a base URL that cannot work, or carries a credential, is refused and never echoed ──
  await perplexityCase(
    "DECIDE perplexity-decider: a base URL that cannot work is refused, never echoed",
    async () => {
      try {
        for (const [label, base] of PERPLEXITY_BAD_BASE_URLS) {
          setEnv(baseURLEnvVar, base);
          await withMocks(
            [{ ...perplexityRoute(), url: "/v1/decisions" }],
            async ({ calls }) => {
              const failure = await capturePerplexityFailure(async () =>
                perplexityDecideOne(await createPerplexity()),
              );
              expectEq(failure.kind, "invalid_request", `${label}: kind`);
              expect(
                failure.message.includes("PERPLEXITY_DECIDER_BASE_URL") &&
                  failure.message.includes(
                    "credentials.perplexityDecider.baseURL",
                  ),
                `${label}: names both ways to set it`,
              );
              expect(
                !failure.message.includes("hunter2"),
                `${label}: nothing from the value is echoed`,
              );
              expectEq(calls.length, 0, `${label}: no request`);
            },
          );
        }
      } finally {
        setEnv(baseURLEnvVar, undefined);
      }
    },
  );

  await perplexityCase(
    "DECIDE perplexity-decider: credentials.perplexityDecider.baseURL is checked the same way",
    async () => {
      await withMocks([perplexityRoute()], async ({ calls }) => {
        const { NeuroLink } = await import("../dist/index.js");
        const nl = new NeuroLink({
          credentials: {
            perplexityDecider: {
              apiKey: "test-fake-config-credential",
              baseURL: "https://ops:hunter2-basic@pplx.internal.test/proxy",
            },
          },
        });
        const failure = await capturePerplexityFailure(async () =>
          nl.decide({
            provider: PERPLEXITY_DECIDE_SPEC.provider,
            state: "short",
            questions: PERPLEXITY_ONE_QUESTION,
          }),
        );
        expectEq(failure.kind, "invalid_request", "kind");
        expect(!failure.message.includes("hunter2"), "nothing echoed");
        expectEq(
          calls.filter((c) => c.method === "POST").length,
          0,
          "no decision request",
        );
      });
    },
  );

  // ── P5: a base URL's credentials never reach the debug log ──
  await perplexityCase(
    "DECIDE perplexity-decider: base URL credentials stay out of the debug log",
    async () => {
      const { logger } = await import("../dist/index.js");
      const originalDebug = console.debug;
      const priorDebugFlag = process.env.NEUROLINK_DEBUG;
      // The logger has no level getter; it takes NEUROLINK_LOG_LEVEL at load, else info.
      const loadLevel = process.env.NEUROLINK_LOG_LEVEL?.toLowerCase();
      const priorLogLevel =
        loadLevel === "debug" || loadLevel === "warn" || loadLevel === "error"
          ? loadLevel
          : "info";
      const lines: string[] = [];
      const constructionLines = async (base: string): Promise<string[]> => {
        lines.length = 0;
        setEnv(baseURLEnvVar, base);
        await createPerplexity();
        return lines.filter((l) =>
          l.includes("Perplexity decision provider initialized"),
        );
      };
      try {
        setEnv("NEUROLINK_DEBUG", "true");
        logger.setLogLevel("debug");
        console.debug = (...args: unknown[]) => {
          lines.push(
            args
              .map((a) => (typeof a === "string" ? a : JSON.stringify(a)))
              .join(" "),
          );
        };
        // Every row is tried before anything is asserted, so a failure names all
        // of the rows that leak, not only the first.
        const silent: string[] = [];
        const leaked: string[] = [];
        for (const [label, base] of PERPLEXITY_BAD_BASE_URLS) {
          const init = await constructionLines(base);
          if (init.length === 0) {
            silent.push(label);
          }
          if (init.some((l) => l.includes("hunter2"))) {
            leaked.push(label);
          }
        }
        expect(
          silent.length === 0,
          `the construction log line is missing for: ${silent.join(", ")}`,
        );
        expect(
          leaked.length === 0,
          `a base URL reached the debug log: ${leaked.join(", ")}`,
        );
        const init = await constructionLines(
          "https://pplx.internal.test/proxy",
        );
        expect(
          init.some((l) => l.includes("pplx.internal.test/proxy")),
          "a usable base URL keeps its host and path in the log for diagnostics",
        );
      } finally {
        console.debug = originalDebug;
        logger.setLogLevel(priorLogLevel);
        setEnv("NEUROLINK_DEBUG", priorDebugFlag);
        setEnv(baseURLEnvVar, undefined);
      }
    },
  );
}

async function runPerplexityAnswers(): Promise<void> {
  const { key } = PERPLEXITY_DECIDE_SPEC;

  // ── P6: the live response, parsed ──
  await perplexityCase(
    "DECIDE perplexity-decider: the live response is parsed",
    async () => {
      await withMocks(
        [
          perplexityRoute({
            status: 200,
            json: perplexityLiveBody(),
            headers: { "x-request-id": PERPLEXITY_REQUEST_ID },
          }),
        ],
        async () => {
          const result = await (
            await createPerplexity()
          ).decide!({
            state: PERPLEXITY_REVIEW,
            questions: PERPLEXITY_QUESTIONS,
          });
          const defect = result.answers.defect;
          expectEq(defect.type, "boolean", "a noul answer is a boolean");
          expectEq(
            defect.type === "boolean" ? defect.probability : -1,
            0.9424522889347015,
            "noul mapped to probability",
          );
          expect(
            !("confidence" in defect),
            "a boolean answer carries no confidence of its own",
          );
          const sentiment = result.answers.sentiment;
          expectEq(
            sentiment.type === "choice" ? sentiment.choice : "",
            "mixed",
            "choice",
          );
          expectEq(
            sentiment.type === "choice" ? sentiment.confidence : -1,
            0.9255246944002182,
            "the reported confidence, not the top probability",
          );
          expect(
            sentiment.type === "choice" &&
              sameJson(sentiment.probabilities, {
                positive: 0.020649883775315993,
                mixed: 0.9503497962668123,
                negative: 0.02900031995787183,
              }),
            "the whole distribution is kept",
          );
          const severity = result.answers.severity;
          expectEq(
            severity.type === "score" ? severity.score : -1,
            1.7838686319784252,
            "score",
          );
          expectEq(
            severity.type === "score" ? severity.confidence : -1,
            0.7838686319784252,
            "the reported confidence",
          );
          expect(
            severity.type === "score" &&
              sameJson(severity.legend, {
                "0": "Cosmetic",
                "1": "Inconvenient",
                "2": "Product unusable",
              }),
            "the legend is kept",
          );
          expect(
            severity.type === "score" &&
              sameJson(severity.probabilities, {
                "0": 0.008423954913615923,
                "1": 0.199283458194343,
                "2": 0.7922925868920411,
              }),
            "the level probabilities are kept",
          );
          expectEq(
            Object.keys(result.answers).length,
            3,
            "one answer per question",
          );
          expectEq(
            result.model,
            PERPLEXITY_DECIDE_SPEC.model,
            "model echoed by the API",
          );
          expectEq(
            result.provider,
            PERPLEXITY_DECIDE_SPEC.provider,
            "provider name",
          );
          expectEq(result.usage.inputTokens, 367, "usage.input_tokens mapped");
          expectEq(result.usage.outputTokens, 3, "usage.output_tokens mapped");
          expectEq(result.requestId, PERPLEXITY_REQUEST_ID, "request id kept");
          expect(
            !("mediaBytes" in result),
            "a text-only request reports no media bytes",
          );
        },
      );
    },
  );

  // ── P6b: a choice or score with no reported confidence falls back to its peak ──
  await perplexityCase(
    "DECIDE perplexity-decider: confidence falls back to the peak probability",
    async () => {
      const body = perplexityLiveBody();
      delete body.answers.sentiment.confidence;
      delete body.answers.severity.confidence;
      await withMocks(
        [perplexityRoute({ status: 200, json: body })],
        async () => {
          const result = await (
            await createPerplexity()
          ).decide!({
            state: PERPLEXITY_REVIEW,
            questions: PERPLEXITY_QUESTIONS,
          });
          const sentiment = result.answers.sentiment;
          const severity = result.answers.severity;
          expectEq(
            sentiment.type === "choice" ? sentiment.confidence : -1,
            0.9503497962668123,
            "choice: the top probability",
          );
          expectEq(
            severity.type === "score" ? severity.confidence : -1,
            0.7922925868920411,
            "score: the top probability",
          );
        },
      );
    },
  );

  // ── P6c: only `x-request-id` is the request id ──
  await perplexityCase(
    "DECIDE perplexity-decider: the request id is x-request-id",
    async () => {
      const rows: Array<[Record<string, string>, string | undefined]> = [
        [{ "x-request-id": PERPLEXITY_REQUEST_ID }, PERPLEXITY_REQUEST_ID],
        [
          { "x-typesafe-request-id": "ts-1", "x-litellm-call-id": "ll-1" },
          undefined,
        ],
        [{}, undefined],
      ];
      for (const [headers, expected] of rows) {
        await withMocks(
          [
            perplexityRoute({
              status: 200,
              json: perplexityLiveBody(),
              headers,
            }),
          ],
          async () => {
            const result = await perplexityDecideOne(await createPerplexity());
            expectEq(result.requestId, expected, "request id header");
          },
        );
      }
    },
  );

  // ── P6d: the model a response names is the one reported ──
  // The API echoes the name it was sent, so a request and its response normally
  // agree; they are made to differ here so the source of the answer shows.
  await perplexityCase(
    "DECIDE perplexity-decider: the response's model is reported, the requested one fills a gap",
    async () => {
      const named = perplexityLiveBody();
      const rows: Array<[string, unknown, string]> = [
        [
          "a response that names its model",
          named,
          PERPLEXITY_DECIDE_SPEC.model,
        ],
        [
          "a response that omits it",
          { answers: named.answers, usage: named.usage },
          "pplx-per-call",
        ],
      ];
      for (const [label, json, expected] of rows) {
        await withMocks([perplexityRoute({ status: 200, json })], async () => {
          const result = await perplexityDecideOne(await createPerplexity(), {
            model: "pplx-per-call",
          });
          expectEq(result.model, expected, `${label}: reported model`);
        });
      }
    },
  );

  // ── P7: state may be a string, an object, an array, a number or a boolean ──
  await perplexityCase("DECIDE perplexity-decider: state forms", async () => {
    const rows: Array<[string, DecisionState, unknown]> = [
      [
        "a string",
        "payouts have failed for three days",
        "payouts have failed for three days",
      ],
      ["an object", PERPLEXITY_REVIEW, PERPLEXITY_REVIEW],
      ["an array", ["first", { second: true }], ["first", { second: true }]],
      [
        "nested values",
        { log: ["a", "b"], meta: { attempts: 3 } },
        { log: ["a", "b"], meta: { attempts: 3 } },
      ],
      ["a number", 42, "42"],
      ["zero", 0, "0"],
      ["true", true, "true"],
      ["false", false, "false"],
      ["an empty string", "", ""],
    ];
    await withMocks([perplexityRoute()], async ({ calls }) => {
      for (const [label, state, wire] of rows) {
        const before = calls.length;
        await perplexityDecideOne(await createPerplexity(), { state });
        expectEq(calls.length, before + 1, `${label}: one request`);
        const body = calls[before].bodyJson as Record<string, unknown>;
        expect(sameJson(body.state, wire), `${label}: state as sent`);
        expectEq(
          Object.keys(body).sort().join(","),
          "model,questions,state",
          `${label}: still three body keys`,
        );
      }
    });
  });

  // A key with stray whitespace is trimmed, and a whitespace-only one is no key.
  await perplexityCase(
    "DECIDE perplexity-decider: the key is trimmed",
    async () => {
      try {
        setEnv(PERPLEXITY_DECIDE_SPEC.envVar, `  ${key}  `);
        await withMocks([perplexityRoute()], async ({ calls }) => {
          await perplexityDecideOne(await createPerplexity());
          expectEq(
            calls[0]?.headers.authorization,
            `Bearer ${key}`,
            "bearer credential without the padding",
          );
        });
      } finally {
        setEnv(PERPLEXITY_DECIDE_SPEC.envVar, key);
      }
    },
  );
}

async function runPerplexityMedia(): Promise<void> {
  const pixel = syntheticPng(64, 64);
  const pixelUrl = dataUrl("image/png", pixel);
  const imagePart = (url: string) => ({
    type: "image_url",
    image_url: { url },
  });

  // ── P8: every supported format goes inside state, after the caller's state ──
  await perplexityCase(
    "DECIDE perplexity-decider: PNG, JPEG and WebP go inside state",
    async () => {
      await withMocks([perplexityRoute()], async ({ calls }) => {
        for (const layout of SYNTHETIC_IMAGE_LAYOUTS) {
          const image = layout.build(64, 64);
          const url = dataUrl(layout.mime, image);
          const result = await perplexityDecideOne(await createPerplexity(), {
            state: "Which colour is the square?",
            images: [image],
          });
          const body = perplexityBodyOf(calls[calls.length - 1]);
          expect(
            sameJson(body.state, [
              "Which colour is the square?",
              imagePart(url),
            ]),
            `${layout.label}: the caller's state, then the image as an image_url part`,
          );
          expectEq(
            Object.keys(body).sort().join(","),
            "model,questions,state",
            `${layout.label}: no separate media field`,
          );
          expectEq(
            result.mediaBytes,
            url.length,
            `${layout.label}: media bytes reported`,
          );
        }
      });
    },
  );

  await perplexityCase(
    "DECIDE perplexity-decider: images from a Buffer, a path and a data URL",
    async () => {
      const dir = mkdtempSync(join(tmpdir(), "pplx-media-"));
      try {
        const path = join(dir, "pixel.png");
        writeFileSync(path, pixel);
        await withMocks([perplexityRoute()], async ({ calls }) => {
          const result = await perplexityDecideOne(await createPerplexity(), {
            images: [pixel, path, pixelUrl],
          });
          const state = perplexityBodyOf(calls[0]).state;
          expect(
            Array.isArray(state) && state.length === 4,
            "the caller's state and three images",
          );
          expect(
            Array.isArray(state) &&
              state
                .slice(1)
                .every((part) => sameJson(part, imagePart(pixelUrl))),
            "every form encodes identically",
          );
          expectEq(
            result.mediaBytes,
            pixelUrl.length * 3,
            "media bytes reported",
          );
        });
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    },
  );

  await perplexityCase(
    "DECIDE perplexity-decider: the caller's state leads the images",
    async () => {
      const rows: Array<[string, DecisionState, unknown[]]> = [
        ["a string", "Which colour?", ["Which colour?"]],
        ["an object", PERPLEXITY_REVIEW, [PERPLEXITY_REVIEW]],
        ["an array", ["first", { second: true }], ["first", { second: true }]],
        ["a number", 42, ["42"]],
        // Nothing to say beside the pictures: only the images are sent.
        ["an empty string", "", []],
        ["an empty array", [], []],
      ];
      await withMocks([perplexityRoute()], async ({ calls }) => {
        for (const [label, state, leading] of rows) {
          await perplexityDecideOne(await createPerplexity(), {
            state,
            images: [pixel],
          });
          expect(
            sameJson(perplexityBodyOf(calls[calls.length - 1]).state, [
              ...leading,
              imagePart(pixelUrl),
            ]),
            `${label}: state array`,
          );
        }
      });
    },
  );

  await perplexityCase(
    "DECIDE perplexity-decider: eight images go out together",
    async () => {
      await withMocks([perplexityRoute()], async ({ calls }) => {
        const result = await perplexityDecideOne(await createPerplexity(), {
          images: Array.from({ length: 8 }, () => pixel),
        });
        const state = perplexityBodyOf(calls[0]).state;
        expect(
          Array.isArray(state) && state.length === 9,
          "the caller's state and eight images",
        );
        expectEq(
          result.mediaBytes,
          pixelUrl.length * 8,
          "media bytes reported",
        );
      });
    },
  );

  // ── P9: what the API would refuse, or stall on, is refused before any request ──
  await perplexityCase(
    "DECIDE perplexity-decider: unusable images are refused, with no request",
    async () => {
      const gif = Buffer.from([
        0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x00, 0x00,
        0x00, 0x3b,
      ]);
      const mp4 = Buffer.concat([
        Buffer.from([0x00, 0x00, 0x00, 0x18]),
        Buffer.from("ftypmp42", "ascii"),
        Buffer.alloc(12),
      ]);
      const notPng = "is not a PNG, JPEG or WebP image";
      const rows: Array<{
        label: string;
        request: Partial<DecisionRequest>;
        includes: string;
      }> = [
        { label: "a GIF", request: { images: [gif] }, includes: notPng },
        {
          label: "a GIF data URL",
          request: { images: ["data:image/gif;base64,R0lGODlhAQABAAAAACw="] },
          includes: notPng,
        },
        {
          label: "a data URL that declares image/jpg",
          request: {
            images: [`data:image/jpg;base64,${pixel.toString("base64")}`],
          },
          includes: notPng,
        },
        {
          label: "an SVG data URL",
          request: { images: ["data:image/svg+xml;base64,PHN2Zy8+"] },
          includes: notPng,
        },
        {
          label: "an https URL",
          request: { images: ["https://example.test/a.png"] },
          includes: "remote URL",
        },
        {
          label: "an http URL, in any case",
          request: { images: ["HTTP://example.test/a.png"] },
          includes: "remote URL",
        },
        {
          label: "a video",
          request: { video: mp4 },
          includes: "does not accept video",
        },
        {
          label: "nine images",
          request: { images: Array.from({ length: 9 }, () => pixel) },
          includes: "at most 8 images",
        },
      ];
      await withMocks([perplexityRoute()], async ({ calls }) => {
        for (const row of rows) {
          const failure = await capturePerplexityFailure(async () =>
            perplexityDecideOne(await createPerplexity(), row.request),
          );
          expectEq(failure.kind, "invalid_request", `${row.label}: kind`);
          expect(
            failure.message.includes(row.includes),
            `${row.label}: message`,
          );
          expect(failure.retryable === false, `${row.label}: not retried`);
          expectEq(calls.length, 0, `${row.label}: no request`);
        }
        // The same mock does answer an image the provider lets through, so the
        // silence above is the provider's, not the mock's.
        await perplexityDecideOne(await createPerplexity(), {
          images: [pixel],
        });
        expectEq(calls.length, 1, "an allowed image does reach the mock");
      });
    },
  );

  // ── P10: the tile cap — 2,048 tiles of 32x32 pixels, rounded to the nearest tile ──
  // The API does not refuse a larger image: it holds the request for about a
  // minute and answers an HTML 504. Every header layout the size is read from
  // is driven at the sizes the API documents on each side of the cap. 1450 and
  // 1470 are not multiples of 32: they round to 45 and 46 tiles a side, so the
  // first fits (2,025 tiles) where counting any partial tile would refuse it,
  // and the second does not (2,116) where dropping a partial tile would send it.
  await perplexityCase(
    "DECIDE perplexity-decider: the tile cap, in every format",
    async () => {
      await withMocks([perplexityRoute()], async ({ calls }) => {
        for (const layout of SYNTHETIC_IMAGE_LAYOUTS) {
          for (const [width, height] of [
            [1440, 1440],
            [1450, 1450],
            [2048, 1024],
          ]) {
            const before = calls.length;
            await perplexityDecideOne(await createPerplexity(), {
              images: [layout.build(width, height)],
            });
            expectEq(
              calls.length,
              before + 1,
              `${layout.label} ${width}x${height}: sent`,
            );
          }
          for (const [width, height] of [
            [1470, 1470],
            [1600, 1310],
            [2048, 2048],
          ]) {
            const before = calls.length;
            const failure = await capturePerplexityFailure(async () =>
              perplexityDecideOne(await createPerplexity(), {
                images: [layout.build(width, height)],
              }),
            );
            expectEq(
              failure.kind,
              "invalid_request",
              `${layout.label} ${width}x${height}: kind`,
            );
            expect(
              failure.message.includes(`${width}x${height}`) &&
                failure.message.includes("2048 tiles"),
              `${layout.label} ${width}x${height}: names the size and the cap`,
            );
            expectEq(
              calls.length,
              before,
              `${layout.label} ${width}x${height}: refused locally`,
            );
          }
        }
      });
    },
  );

  await perplexityCase(
    "DECIDE perplexity-decider: the offending image is numbered",
    async () => {
      await withMocks([perplexityRoute()], async ({ calls }) => {
        const failure = await capturePerplexityFailure(async () =>
          perplexityDecideOne(await createPerplexity(), {
            images: [pixel, syntheticPng(2048, 2048)],
          }),
        );
        expectEq(failure.kind, "invalid_request", "kind");
        expect(failure.message.includes("Image 2 is 2048x2048"), "image 2");
        expectEq(calls.length, 0, "refused before any request");
      });
    },
  );

  // An image whose size cannot be read is not guessed at: it is sent as is.
  await perplexityCase(
    "DECIDE perplexity-decider: an image whose size cannot be read is sent as is",
    async () => {
      const rows: Array<[string, Buffer]> = [
        ["a bare PNG signature", PNG_SIGNATURE],
        [
          "a PNG cut off inside IHDR",
          Buffer.concat([
            PNG_SIGNATURE,
            Buffer.from([0x00, 0x00, 0x00, 0x0d]),
            Buffer.from("IHDR", "ascii"),
          ]),
        ],
        [
          "a JPEG with no frame header",
          Buffer.from([
            0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00,
            0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xff, 0xd9,
          ]),
        ],
      ];
      await withMocks([perplexityRoute()], async ({ calls }) => {
        for (const [label, image] of rows) {
          const before = calls.length;
          await perplexityDecideOne(await createPerplexity(), {
            images: [image],
          });
          expectEq(calls.length, before + 1, `${label}: sent`);
        }
      });
    },
  );

  // ── P11: the 32 MiB body cap, not the 8 MiB the XOR deployment has ──
  await perplexityCase(
    "DECIDE perplexity-decider: the 32 MiB body cap",
    async () => {
      // A data URL whose size the reader cannot read, so only the byte cap decides.
      const sized = (mib: number) =>
        `data:image/png;base64,${"A".repeat(mib * 1024 * 1024)}`;
      await withMocks([perplexityRoute()], async ({ calls }) => {
        await perplexityDecideOne(await createPerplexity(), {
          images: [sized(31)],
        });
        expectEq(calls.length, 1, "31 MiB is inside the cap");
        const failure = await capturePerplexityFailure(async () =>
          perplexityDecideOne(await createPerplexity(), {
            images: [sized(33)],
          }),
        );
        expectEq(failure.kind, "invalid_request", "33 MiB: kind");
        expect(
          failure.message.includes("accepts at most 33554432"),
          "33 MiB: names the cap",
        );
        expectEq(calls.length, 1, "33 MiB: refused before any request");
      });
    },
  );
}

async function runPerplexityErrors(): Promise<void> {
  type ErrorRow = {
    label: string;
    reply: PerplexityReply;
    kind: string;
    calls: number;
    includes?: string;
    excludes?: string;
    requestId?: string;
  };
  const rid = { "x-request-id": PERPLEXITY_REQUEST_ID };

  // ── P12: each envelope is flattened, classified, and retried only when it should be ──
  await perplexityCase(
    "DECIDE perplexity-decider: envelopes are flattened and classified",
    async () => {
      const rows: ErrorRow[] = [
        {
          label: "401 invalid key (code is a number)",
          reply: { status: 401, json: PERPLEXITY_ERRORS.invalidKey },
          kind: "authentication",
          calls: 1,
          includes: "Invalid API key provided",
        },
        {
          label: "400 from the gateway (code null)",
          reply: {
            status: 400,
            json: PERPLEXITY_ERRORS.gatewayBadRequest,
            headers: rid,
          },
          kind: "invalid_request",
          calls: 1,
          includes: "unknown or mistyped field",
          requestId: PERPLEXITY_REQUEST_ID,
        },
        {
          label: "400 from the model server (code a string)",
          reply: { status: 400, json: PERPLEXITY_ERRORS.modelServerBadRequest },
          kind: "invalid_request",
          calls: 1,
          includes: "Noul question must have criteria or instructions",
          excludes: "(field:",
        },
        // The next two rest on a stand-in: no live 400 was seen carrying a
        // `param`, so they pin how the provider formats one, not what the API
        // sends.
        {
          label: "400 naming a field its message does not",
          reply: {
            status: 400,
            json: {
              error: {
                ...PERPLEXITY_ERRORS.modelServerBadRequest.error,
                param: "questions.defect",
              },
            },
          },
          kind: "invalid_request",
          calls: 1,
          includes: "(field: questions.defect)",
        },
        {
          label: "400 naming a field its message already names",
          reply: {
            status: 400,
            json: {
              error: {
                message: "Each request needs between 1 and 128 questions",
                type: "invalid_request",
                code: "400",
                param: "questions",
              },
            },
          },
          kind: "invalid_request",
          calls: 1,
          includes: "between 1 and 128 questions",
          excludes: "(field:",
        },
        {
          label: "400 over the model's context length",
          reply: { status: 400, json: PERPLEXITY_ERRORS.overLength },
          kind: "max_tokens_exceeded",
          calls: 1,
          includes: "maximum context length",
        },
        {
          label: "400 over the context length, with images in the input",
          reply: { status: 400, json: PERPLEXITY_ERRORS.overLengthWithImages },
          kind: "max_tokens_exceeded",
          calls: 1,
          includes: "16384 vision",
        },
        {
          // A control with invented wording: it names the maximum context
          // length but does not exceed it, so only the `exceeds` in the pattern
          // can tell it from a real over-length refusal.
          label:
            "400 that names the maximum context length without exceeding it",
          reply: {
            status: 400,
            json: {
              error: {
                message: "The maximum context length is fixed for this model",
                type: "invalid_request",
                code: "400",
              },
            },
          },
          kind: "invalid_request",
          calls: 1,
          includes: "fixed for this model",
        },
        {
          label: "413 body over the cap",
          reply: {
            status: 413,
            json: PERPLEXITY_ERRORS.tooLarge,
            headers: rid,
          },
          kind: "max_tokens_exceeded",
          calls: 1,
          includes: "33554432",
          requestId: PERPLEXITY_REQUEST_ID,
        },
        {
          label: "404 with an empty body",
          reply: { status: 404 },
          kind: "invalid_request",
          calls: 1,
          includes: "HTTP 404",
        },
        {
          label: "405 with an empty body",
          reply: { status: 405, text: "", headers: { allow: "POST", ...rid } },
          kind: "invalid_request",
          calls: 1,
          includes: "HTTP 405",
          requestId: PERPLEXITY_REQUEST_ID,
        },
        // Statuses and wording the API was not seen to return. They pin the
        // classification: every other 4xx is a request the caller fixes, so it
        // is not retried, and its body is read only in the envelope above.
        {
          label: "403, which the API does not document",
          reply: {
            status: 403,
            json: {
              error: {
                message: "Forbidden by policy",
                type: "forbidden",
                code: 403,
              },
            },
          },
          kind: "invalid_request",
          calls: 1,
          includes: "Forbidden by policy",
        },
        {
          label: "422 with a FastAPI detail",
          reply: {
            status: 422,
            json: { detail: "questions must be a non-empty map" },
          },
          kind: "invalid_request",
          calls: 1,
          includes: "HTTP 422",
          excludes: "non-empty map",
        },
        {
          label: "400 with a flat string error",
          reply: { status: 400, json: { error: "plain failure text" } },
          kind: "invalid_request",
          calls: 1,
          includes: "HTTP 400",
          excludes: "plain failure text",
        },
        {
          label: "429 rate limited",
          reply: { status: 429, json: PERPLEXITY_ERRORS.rateLimited },
          kind: "rate_limit",
          calls: 2,
          includes: "Request rate limit exceeded",
        },
        {
          label: "500 with an empty body",
          reply: { status: 500 },
          kind: "server",
          calls: 2,
          includes: "HTTP 500",
        },
        {
          label: "502 with an HTML body",
          reply: {
            status: 502,
            text: "<html><body>bad gateway</body></html>",
            contentType: "text/html",
          },
          kind: "server",
          calls: 2,
          includes: "HTTP 502",
          excludes: "<html",
        },
        {
          label: "503 unavailable",
          reply: {
            status: 503,
            json: {
              error: {
                message: "The model service is temporarily unavailable",
                type: "service_unavailable",
                code: null,
              },
            },
          },
          kind: "overloaded",
          calls: 2,
          includes: "temporarily unavailable",
        },
      ];
      for (const row of rows) {
        const outcome = await perplexityOutcome(row.reply);
        expectEq(outcome.kind, row.kind, `${row.label}: kind`);
        expectEq(outcome.status, row.reply.status, `${row.label}: status kept`);
        expectEq(outcome.calls, row.calls, `${row.label}: attempts`);
        expect(
          outcome.retryable === row.calls > 1,
          `${row.label}: retryable matches the attempts`,
        );
        expectEq(outcome.requestId, row.requestId, `${row.label}: request id`);
        if (row.includes) {
          expect(
            outcome.message.includes(row.includes),
            `${row.label}: message`,
          );
        }
        if (row.excludes) {
          expect(
            !outcome.message.includes(row.excludes),
            `${row.label}: message leaves this out`,
          );
        }
      }
    },
  );

  // ── P12b: a 504's HTML page is retried, and never echoed ──
  await perplexityCase(
    "DECIDE perplexity-decider: an HTML 504 is retried and never echoed",
    async () => {
      const outcome = await perplexityOutcome({
        status: 504,
        text: PERPLEXITY_GATEWAY_PAGE,
        contentType: "text/html; charset=UTF-8",
      });
      expectEq(outcome.kind, "server", "classified as a server failure");
      expectEq(outcome.status, 504, "status kept");
      expect(outcome.retryable === true, "retryable");
      expectEq(outcome.calls, 2, "retried up to the maximum");
      expect(
        outcome.message.endsWith("Perplexity request failed with HTTP 504"),
        "the short fallback message",
      );
      expect(
        !/<[a-z]/i.test(outcome.message) &&
          !outcome.message.includes("gateway-page-marker"),
        "no HTML reaches the message",
      );
      expectEq(outcome.requestId, undefined, "a 504 carries no request id");
    },
  );

  // A 200 that is not an answer map is a changed format: a failure, not a retry.
  await perplexityCase(
    "DECIDE perplexity-decider: a 200 without an answers map fails",
    async () => {
      const outcome = await perplexityOutcome({
        status: 200,
        json: {
          model: PERPLEXITY_DECIDE_SPEC.model,
          usage: { input_tokens: 1 },
        },
      });
      expectEq(outcome.kind, "server", "classified as a server failure");
      expect(outcome.retryable === false, "not retried");
      expectEq(outcome.calls, 1, "one request");
      expect(
        outcome.message.includes("without an answers map"),
        "says what is missing",
      );
    },
  );

  // ── P13: a 401 disables that instance, as the shared base does for every key ──
  await perplexityCase(
    "DECIDE perplexity-decider: a 401 trips the breaker",
    async () => {
      await withMocks(
        [perplexityRoute({ status: 401, json: PERPLEXITY_ERRORS.invalidKey })],
        async ({ calls }) => {
          const provider = await createPerplexity();
          const first = await capturePerplexityFailure(async () =>
            perplexityDecideOne(provider),
          );
          expectEq(first.kind, "authentication", "401 classified");
          expect(
            first.message.includes("Invalid API key provided"),
            "the API's own text is kept",
          );
          const second = await capturePerplexityFailure(async () =>
            perplexityDecideOne(provider),
          );
          expectEq(
            second.kind,
            "authentication",
            "breaker keeps the classification",
          );
          expect(
            second.message.includes("rejected this API key earlier"),
            "breaker message",
          );
          expectEq(calls.length, 1, "no second request after a rejected key");
          await capturePerplexityFailure(async () =>
            perplexityDecideOne(await createPerplexity()),
          );
          expectEq(calls.length, 2, "a new instance asks again");
        },
      );
    },
  );

  // ── P13b: any other 4xx is the caller's to fix, and the SAME instance keeps working ──
  await perplexityCase(
    "DECIDE perplexity-decider: other 4xx do not disable the provider",
    async () => {
      const script = perplexityScript([
        { status: 400, json: PERPLEXITY_ERRORS.modelServerBadRequest },
        {
          status: 403,
          json: {
            error: {
              message: "Forbidden by policy",
              type: "forbidden",
              code: 403,
            },
          },
        },
        { status: 200, json: perplexityLiveBody() },
      ]);
      await withMocks([script.route], async ({ calls }) => {
        const provider = await createPerplexity();
        const first = await capturePerplexityFailure(async () =>
          perplexityDecideOne(provider),
        );
        expectEq(first.kind, "invalid_request", "a 400 is a request to fix");
        const second = await capturePerplexityFailure(async () =>
          perplexityDecideOne(provider),
        );
        expectEq(second.kind, "invalid_request", "so is a 403");
        const third = await perplexityDecideOne(provider);
        expectEq(
          third.provider,
          PERPLEXITY_DECIDE_SPEC.provider,
          "the same instance works once the cause is gone",
        );
        expectEq(calls.length, 3, "every call was really sent");
      });
    },
  );

  // ── P14: keys are redacted from every message, but the model name stays readable ──
  await perplexityCase(
    "DECIDE perplexity-decider: keys are redacted, the model name is not",
    async () => {
      const { key } = PERPLEXITY_DECIDE_SPEC;
      // Keys carry `_` and `-`, so the stand-ins do too.
      const shaped = "pplx-AbCdEfGhIj_KlMnOpQrSt-UvWxYz0123456789_AbCdEf";
      const thirty = `pplx-${"Ab_1-".repeat(6)}`;
      const bad = (message: string): PerplexityReply => ({
        status: 400,
        json: { error: { message, type: "invalid_request", code: "400" } },
      });
      const rows: Array<{
        label: string;
        reply: PerplexityReply;
        gone: string[];
        kept?: string;
      }> = [
        {
          label: "the configured key, echoed on a 401",
          reply: {
            status: 401,
            json: {
              error: {
                message: `Invalid API key ${key} provided`,
                type: "invalid_api_key",
                code: 401,
              },
            },
          },
          gone: [key],
          kept: "Invalid API key",
        },
        {
          label: "a key-shaped token",
          reply: bad(`Unknown credential ${shaped} in the request`),
          gone: [shaped],
          kept: "Unknown credential",
        },
        {
          label: "a token of exactly 30 characters after the prefix",
          reply: bad(`Unknown credential ${thirty} in the request`),
          gone: [thirty],
          kept: "Unknown credential",
        },
        {
          label: "a key beside the model's name",
          reply: bad(
            `Invalid model 'pplx-decider-v1-27b' for key ${shaped} and key ${key}`,
          ),
          gone: [shaped, key],
          kept: "'pplx-decider-v1-27b'",
        },
        {
          label: "a model name whose suffix runs past twenty characters",
          reply: bad("Invalid model 'pplx-decider-v1-27b-latest'"),
          gone: [],
          kept: "'pplx-decider-v1-27b-latest'",
        },
      ];
      for (const row of rows) {
        const outcome = await perplexityOutcome(row.reply);
        expect(outcome.threw, `${row.label}: the call failed`);
        expect(
          row.gone.every((secret) => !outcome.message.includes(secret)),
          `${row.label}: the secret is gone`,
        );
        // The marker appears exactly when something was removed, so a row that
        // must stay readable also proves nothing was redacted from it.
        expect(
          outcome.message.includes("[redacted]") === row.gone.length > 0,
          `${row.label}: the marker matches what was removed`,
        );
        // 30 is the provider's floor; a model name's suffix stays under it.
        expect(
          !/pplx-[A-Za-z0-9_-]{30,}/.test(outcome.message),
          `${row.label}: nothing key-shaped is left`,
        );
        if (row.kept) {
          expect(
            outcome.message.includes(row.kept),
            `${row.label}: the readable part stays`,
          );
        }
      }
    },
  );
}

async function runPerplexityRetries(): Promise<void> {
  const rateLimited = (headers: Record<string, string>): PerplexityReply => ({
    status: 429,
    json: PERPLEXITY_ERRORS.rateLimited,
    headers,
  });
  const answered: PerplexityReply = {
    status: 200,
    json: perplexityLiveBody(),
    headers: { "x-request-id": PERPLEXITY_REQUEST_ID },
  };

  const callUnderTest = new AsyncLocalStorage<symbol>();

  /**
   * Every setTimeout of 100 ms or more that the call inside `run` schedules,
   * with the time each was set: the wait a retry asked for, which does not
   * depend on how busy the machine is. A window on the measured gap cannot tell
   * "1 s from a lenient parse" from "a quarter second of backoff" once it has to
   * be loose enough for a loaded runner; the scheduled value can.
   *
   * setTimeout is global, so on a loaded machine a leftover from an earlier case
   * or a library's housekeeping can schedule one while the call is in flight,
   * and counting it failed "exactly one wait" for a reason the provider had no
   * part in. A timer keeps the async context it was created in, so only the
   * timers made by code running inside `run` carry the mark.
   */
  const withScheduledWaits = async <T>(run: () => Promise<T>) => {
    const nativeSetTimeout = globalThis.setTimeout;
    const mark = Symbol("call under test");
    const waits: number[] = [];
    const scheduledAt: number[] = [];
    globalThis.setTimeout = ((...args: Parameters<typeof setTimeout>) => {
      const ms = args[1];
      if (
        callUnderTest.getStore() === mark &&
        typeof ms === "number" &&
        ms >= 100
      ) {
        waits.push(ms);
        scheduledAt.push(Date.now());
      }
      return Reflect.apply(nativeSetTimeout, globalThis, args);
    }) as typeof setTimeout;
    try {
      return {
        result: await callUnderTest.run(mark, run),
        waits,
        scheduledAt,
      };
    } finally {
      globalThis.setTimeout = nativeSetTimeout;
    }
  };

  /** A 429 carrying `headers`, then a 200: how the one retry was spaced. */
  const retried = async (
    headers: Record<string, string>,
    request: Partial<DecisionRequest> = {},
    onRequest?: (index: number) => void,
  ) => {
    const script = perplexityScript(
      [rateLimited(headers), answered],
      onRequest,
    );
    return withMocks([script.route], async ({ calls }) => {
      const provider = await createPerplexity();
      const startedAt = Date.now();
      const {
        result: outcome,
        waits,
        scheduledAt,
      } = await withScheduledWaits(() =>
        capturePerplexityFailure(async () =>
          perplexityDecideOne(provider, request),
        ),
      );
      return {
        outcome,
        waits,
        scheduledAt,
        firstRequestAt: script.stamps[0],
        calls: calls.length,
        elapsed: Date.now() - startedAt,
        gap:
          script.stamps.length > 1
            ? script.stamps[1] - script.stamps[0]
            : undefined,
        sameBody: calls.length > 1 && calls[0].bodyText === calls[1].bodyText,
      };
    });
  };

  /**
   * A timer scheduled while the call is in flight by code the call did not
   * start, which is what a leftover from an earlier case, or a library's own
   * housekeeping, does on a loaded machine. It is a continuation created before
   * the call and released from inside the first request, so its setTimeout runs
   * in the context of whoever created it, not of the call.
   */
  const strangerTimer = (ms: number) => {
    const gate = Promise.withResolvers<void>();
    const timers: ReturnType<typeof setTimeout>[] = [];
    gate.promise.then(() => {
      timers.push(setTimeout(() => undefined, ms));
    });
    return {
      release: () => gate.resolve(),
      scheduled: () => timers.length,
      clear: () => timers.forEach((timer) => clearTimeout(timer)),
    };
  };

  /** Holds the event loop the way a starved process is held. */
  const stallFor = (ms: number): void => {
    const until = Date.now() + ms;
    while (Date.now() < until) {
      // spin
    }
  };

  /** Waits for the last tenth of a second, where the whole-second cut costs most. */
  const untilLateInSecond = async (): Promise<void> => {
    while (Date.now() % 1000 < 900) {
      await perplexityPause(20);
    }
  };

  /**
   * The provider turns a Retry-After date into a wait by subtracting the moment
   * it read the header. That moment lies between the first reply being built and
   * the timer being set, and both are recorded, so the wait is held to a range
   * computed from the header itself instead of a guess at how long the machine
   * took. The default backoff (under 500 ms) falls below the range whenever the
   * timer was set within half a second of the date being issued.
   */
  const dateWaitInRange = (
    run: Awaited<ReturnType<typeof retried>>,
    dueAt: number,
  ): boolean =>
    run.waits.length === 1 &&
    run.firstRequestAt !== undefined &&
    run.waits[0] >= dueAt - run.scheduledAt[0] &&
    run.waits[0] <= dueAt - run.firstRequestAt;

  // ── P15: a 429's Retry-After is the wait before the one retry ──
  await perplexityCase(
    "DECIDE perplexity-decider: a 429 with Retry-After is retried once, after that wait",
    async () => {
      const run = await retried({
        "retry-after": "1",
        "x-request-id": PERPLEXITY_REQUEST_ID,
      });
      expect(!run.outcome.threw, "the retry succeeded");
      expectEq(run.calls, 2, "exactly one retry");
      expectEq(
        run.waits.join(","),
        "1000",
        "the one second the header asked for was scheduled, and nothing else",
      );
      // A timer cannot fire early, so the measured gap only has a floor.
      expect(
        run.gap !== undefined && run.gap >= 950,
        `the retry did wait that second (waited ${run.gap} ms)`,
      );
      expect(run.sameBody, "the retry resends the same body");
    },
  );

  await perplexityCase(
    "DECIDE perplexity-decider: a Retry-After longer than the timeout is not waited out",
    async () => {
      const run = await retried({ "retry-after": "30" }, { timeoutMs: 1000 });
      expectEq(run.outcome.kind, "rate_limit", "the 429 is thrown");
      expect(run.outcome.retryable === true, "still classified as retryable");
      expectEq(run.calls, 1, "one request, no retry");
      expectEq(run.waits.length, 0, "no wait was scheduled");
      expect(
        run.elapsed < 6000,
        `thrown at once, far below the 30 seconds asked for (took ${run.elapsed} ms)`,
      );
      expect(
        run.outcome.message.includes("Request rate limit exceeded"),
        "the API's own text is kept",
      );
    },
  );

  await perplexityCase(
    "DECIDE perplexity-decider: no usable Retry-After means the default backoff",
    async () => {
      // `Number()` reads "0x10" as 16 and "1e3" as 1,000 seconds, and a zero or a
      // date already past would retry at once, so only whole seconds above zero
      // and a future HTTP date are waited on.
      for (const [label, headers] of [
        ["no header", {}],
        ["an unreadable value", { "retry-after": "soon" }],
        ["a hex number", { "retry-after": "0x10" }],
        ["an exponent", { "retry-after": "1e3" }],
        ["a negative number", { "retry-after": "-5" }],
        ["zero seconds", { "retry-after": "0" }],
        ["a blank value", { "retry-after": "" }],
        [
          "a date already past",
          { "retry-after": new Date(Date.now() - 60_000).toUTCString() },
        ],
      ] as const) {
        const run = await retried({ ...headers });
        expect(!run.outcome.threw, `${label}: the retry succeeded`);
        expectEq(run.calls, 2, `${label}: exactly one retry`);
        // The default backoff is 250 ms plus up to 250 ms of jitter. What was
        // scheduled is checked, not how long the machine took: a header read
        // leniently as one second would sit inside any window loose enough for
        // a loaded runner.
        expect(
          run.waits.length === 1 && run.waits[0] >= 250 && run.waits[0] < 500,
          `${label}: scheduled the default backoff of a quarter to a half second`,
        );
        expect(
          run.gap !== undefined && run.gap >= 200,
          `${label}: and waited it (waited ${run.gap} ms)`,
        );
      }
    },
  );

  await perplexityCase(
    "DECIDE perplexity-decider: a timer another party schedules during a retry is not counted as its wait",
    async () => {
      const sources: ReadonlyArray<{
        label: string;
        headers: () => Record<string, string>;
        counted: (waits: readonly number[]) => boolean;
      }> = [
        {
          label: "whole seconds",
          headers: () => ({ "retry-after": "1" }),
          counted: (waits) => waits.join(",") === "1000",
        },
        {
          label: "an HTTP date",
          headers: () => ({
            "retry-after": new Date(Date.now() + 2000).toUTCString(),
          }),
          counted: (waits) => waits.length === 1 && waits[0] <= 2000,
        },
        {
          label: "no header",
          headers: () => ({}),
          counted: (waits) =>
            waits.length === 1 && waits[0] >= 250 && waits[0] < 500,
        },
      ];
      for (const source of sources) {
        const stranger = strangerTimer(400);
        try {
          const run = await retried(source.headers(), {}, (index) => {
            if (index === 0) {
              stranger.release();
            }
          });
          expect(!run.outcome.threw, `${source.label}: the retry succeeded`);
          expectEq(run.calls, 2, `${source.label}: exactly one retry`);
          expectEq(
            stranger.scheduled(),
            1,
            `${source.label}: the other party's timer was scheduled during the call`,
          );
          expect(
            source.counted(run.waits),
            `${source.label}: only the call's own wait was counted (got ${run.waits.join(",")})`,
          );
        } finally {
          stranger.clear();
        }
      }
    },
  );

  // Retry-After may be an HTTP date as well as seconds.
  await perplexityCase(
    "DECIDE perplexity-decider: Retry-After as an HTTP date",
    async () => {
      // HTTP dates have whole-second resolution, so the date 2 s ahead is cut
      // back to a whole second; the header itself says where it was cut.
      const header = new Date(Date.now() + 2000).toUTCString();
      const dueAt = Date.parse(header);
      const near = await retried({ "retry-after": header });
      expect(!near.outcome.threw, "a near date: the retry succeeded");
      expectEq(near.calls, 2, "a near date: one retry");
      expect(
        dateWaitInRange(near, dueAt),
        `a near date is scheduled as the time left until it (waits ${near.waits.join(",")} for a date due at ${dueAt}, first reply at ${near.firstRequestAt}, timer set at ${near.scheduledAt.join(",")})`,
      );
      const far = await retried(
        { "retry-after": new Date(Date.now() + 60_000).toUTCString() },
        { timeoutMs: 1000 },
      );
      expectEq(far.outcome.kind, "rate_limit", "a distant date: thrown");
      expectEq(far.calls, 1, "a distant date: not waited out");
    },
  );

  await perplexityCase(
    "DECIDE perplexity-decider: an HTTP date read late is still scheduled inside the range the header allows",
    async () => {
      await untilLateInSecond();
      const header = new Date(Date.now() + 2000).toUTCString();
      const dueAt = Date.parse(header);
      const run = await retried({ "retry-after": header }, {}, (index) => {
        if (index === 0) {
          stallFor(400);
        }
      });
      expect(!run.outcome.threw, "the retry succeeded");
      expectEq(run.calls, 2, "one retry");
      expect(
        dateWaitInRange(run, dueAt),
        `the wait is the time left until the date (waits ${run.waits.join(",")} for a date due at ${dueAt}, first reply at ${run.firstRequestAt}, timer set at ${run.scheduledAt.join(",")})`,
      );
    },
  );

  await perplexityCase(
    "DECIDE perplexity-decider: an abort ends a Retry-After wait at once",
    async () => {
      const script = perplexityScript([
        rateLimited({ "retry-after": "9" }),
        answered,
      ]);
      await withMocks([script.route], async ({ calls }) => {
        const controller = new AbortController();
        const startedAt = Date.now();
        const pending = capturePerplexityFailure(async () =>
          perplexityDecideOne(await createPerplexity(), {
            signal: controller.signal,
          }),
        );
        await perplexityPause(300);
        controller.abort();
        const failure = await pending;
        const elapsed = Date.now() - startedAt;
        expectEq(
          failure.kind,
          "network",
          "an abort is reported as a network error",
        );
        expect(failure.retryable === false, "not retried");
        expectEq(calls.length, 1, "no second request after the abort");
        expect(
          elapsed < 6000,
          `ended long before the nine seconds asked for (took ${elapsed} ms)`,
        );
      });
    },
  );

  await perplexityCase(
    "DECIDE perplexity-decider: a Retry-After that does not fit what is left of the timeout is thrown",
    async () => {
      // The 429 takes 700 ms of a 1.5 s budget, so the second it asks for does
      // not fit, although it is shorter than the whole timeout.
      await withMocks(
        [
          {
            method: "POST",
            url: PERPLEXITY_DECIDE_SPEC.urlMatch,
            respond: async () => {
              await perplexityPause(700);
              return rateLimited({ "retry-after": "1" });
            },
          },
        ],
        async ({ calls }) => {
          const failure = await capturePerplexityFailure(async () =>
            perplexityDecideOne(await createPerplexity(), { timeoutMs: 1500 }),
          );
          expectEq(failure.kind, "rate_limit", "the 429 is thrown");
          expectEq(calls.length, 1, "no retry");
        },
      );
    },
  );

  // ── P16: transport failures — a network error and a timeout are retried, an abort is not ──
  await perplexityCase(
    "DECIDE perplexity-decider: a network error is retried, and its message is scrubbed",
    async () => {
      const { key } = PERPLEXITY_DECIDE_SPEC;
      await withMocks(
        [
          {
            method: "POST",
            url: PERPLEXITY_DECIDE_SPEC.urlMatch,
            respond: () => {
              throw new TypeError(
                `fetch failed at https://ops:hunter2-basic@api.perplexity.ai/v1/decisions?token=hunter2-query: upstream refused ${key} and sk-ambient1234567890abcdef`,
              );
            },
          },
        ],
        async ({ calls }) => {
          const failure = await capturePerplexityFailure(async () =>
            perplexityDecideOne(await createPerplexity()),
          );
          expectEq(failure.kind, "network", "a transport failure");
          expect(failure.retryable === true, "retryable");
          expectEq(calls.length, 2, "retried once");
          expect(
            !failure.message.includes("hunter2") &&
              !failure.message.includes(key) &&
              !failure.message.includes("sk-ambient"),
            "no credential from the URL or the key reaches the message",
          );
          expect(
            failure.message.includes("api.perplexity.ai"),
            "the host stays for diagnostics",
          );
        },
      );
    },
  );

  await perplexityCase(
    "DECIDE perplexity-decider: a call past its timeout is a retried timeout",
    async () => {
      await withMocks(
        [
          {
            method: "POST",
            url: PERPLEXITY_DECIDE_SPEC.urlMatch,
            respond: async () => {
              await perplexityPause(400);
              return { status: 200, json: perplexityLiveBody() };
            },
          },
        ],
        async ({ calls }) => {
          const failure = await capturePerplexityFailure(async () =>
            perplexityDecideOne(await createPerplexity(), { timeoutMs: 100 }),
          );
          expectEq(failure.kind, "timeout", "classified as a timeout");
          expect(failure.retryable === true, "retryable");
          expectEq(calls.length, 2, "retried once");
        },
      );
    },
  );

  await perplexityCase(
    "DECIDE perplexity-decider: a caller's abort is not retried",
    async () => {
      const controller = new AbortController();
      controller.abort();
      await withMocks([perplexityRoute()], async ({ calls }) => {
        const failure = await capturePerplexityFailure(async () =>
          perplexityDecideOne(await createPerplexity(), {
            signal: controller.signal,
          }),
        );
        expectEq(
          failure.kind,
          "network",
          "an abort is reported as a network error",
        );
        expect(failure.retryable === false, "not retryable");
        // An already-aborted signal is refused by fetch before anything is
        // sent, so the mock records no request.
        expectEq(calls.length, 0, "no request sent for an aborted caller");
      });
    },
  );
}

async function runPerplexityLimits(): Promise<void> {
  const { provider, model } = PERPLEXITY_DECIDE_SPEC;
  const questionsOf = (count: number): DecisionQuestionMap =>
    Object.fromEntries(
      Array.from({ length: count }, (_, i) => [
        `q${i}`,
        { type: "boolean" as const, instructions: `Is statement ${i} true?` },
      ]),
    );

  // ── P17: 128 questions go out, 129 are refused locally ──
  await perplexityCase(
    "DECIDE perplexity-decider: 128 questions go out, 129 are refused locally",
    async () => {
      await withMocks([perplexityRoute()], async ({ calls }) => {
        await perplexityDecideOne(await createPerplexity(), {
          questions: questionsOf(128),
        });
        expectEq(calls.length, 1, "128 questions in one request");
        expectEq(
          Object.keys(perplexityBodyOf(calls[0]).questions ?? {}).length,
          128,
          "all 128 were sent",
        );
        const failure = await capturePerplexityFailure(async () =>
          perplexityDecideOne(await createPerplexity(), {
            questions: questionsOf(129),
          }),
        );
        expectEq(
          failure.kind,
          "max_tokens_exceeded",
          "129 questions classified",
        );
        expect(
          failure.message.includes("at most 128 questions") &&
            failure.message.includes("has 129"),
          "names the cap and the count",
        );
        expect(failure.retryable === false, "not retried");
        expectEq(calls.length, 1, "refused before any request");
      });
    },
  );

  // The case the batching exists for: relevance compaction asks about up to 300
  // messages, and Perplexity takes 128. decide() refuses that (above); tryDecide
  // is what every built-in consumer calls, and splits it.
  await perplexityCase(
    "DECIDE perplexity-decider: tryDecide splits 300 questions into 128, 128 and 44",
    async () => {
      let served = 0;
      await withMocks(
        [
          {
            method: "POST",
            url: PERPLEXITY_DECIDE_SPEC.urlMatch,
            respond: (call) => {
              served += 1;
              const ids = Object.keys(
                (call.bodyJson as { questions?: Record<string, unknown> })
                  .questions ?? {},
              );
              return {
                status: 200,
                headers: { "x-request-id": `req-${served}` },
                json: {
                  model: PERPLEXITY_DECIDE_SPEC.model,
                  answers: Object.fromEntries(
                    ids.map((id) => [id, { type: "noul", noul: 0.5 }]),
                  ),
                  usage: { input_tokens: 100, output_tokens: 0 },
                },
              };
            },
          },
        ],
        async ({ calls }) => {
          const { NeuroLink } = await import("../dist/index.js");
          const result = await new NeuroLink().tryDecide({
            provider: PERPLEXITY_DECIDE_SPEC.provider,
            state: "short",
            questions: questionsOf(300),
          });
          const sizes = calls
            .map((c) => Object.keys(perplexityBodyOf(c).questions ?? {}).length)
            .sort((a, b) => b - a);
          expectEq(
            sizes.join(","),
            "128,128,44",
            "three requests, none over 128",
          );
          expectEq(
            Object.keys(result?.answers ?? {}).length,
            300,
            "every question was answered",
          );
          expectEq(result?.usage.inputTokens, 300, "usage is summed");
          expectEq(
            (result?.requestId ?? "").split(",").length,
            3,
            "every batch's request id is listed",
          );
          expect(
            sameJson(
              Object.keys(result?.answers ?? {}),
              Object.keys(questionsOf(300)),
            ),
            "the answers come back in the order the questions were asked",
          );
        },
      );
    },
  );

  // The timeout reaches the platform as `AbortSignal.timeout(ms)`, so recording
  // that argument shows what a request was given without waiting for it.
  await perplexityCase(
    "DECIDE perplexity-decider: the default timeout grows with the question count",
    async () => {
      const nativeTimeout = AbortSignal.timeout;
      const asked: number[] = [];
      AbortSignal.timeout = (ms: number) => {
        asked.push(ms);
        return nativeTimeout.call(AbortSignal, ms);
      };
      try {
        await withMocks([perplexityRoute()], async () => {
          const provider = await createPerplexity();
          const timeoutOf = async (
            request: Partial<DecisionRequest>,
          ): Promise<string> => {
            asked.length = 0;
            await perplexityDecideOne(provider, request);
            return asked.join(",");
          };
          expectEq(
            await timeoutOf({}),
            "10100",
            "one question: the 10 s allowance and 100 ms",
          );
          expectEq(
            await timeoutOf({ questions: questionsOf(128) }),
            "22800",
            "128 questions: the allowance and 12.8 s",
          );
          expectEq(
            await timeoutOf({ timeoutMs: 1234 }),
            "1234",
            "a caller's own timeout is used as given",
          );
        });
      } finally {
        AbortSignal.timeout = nativeTimeout;
      }
    },
  );

  // ── P18: the state window is 100,000 estimated tokens ──
  // The shared estimator charges ceil(characters / 4) tokens plus a 5% margin
  // for ASCII, so the window closes at 380,952 characters.
  await perplexityCase(
    "DECIDE perplexity-decider: the ASCII state window",
    async () => {
      await withMocks([perplexityRoute()], async ({ calls }) => {
        await perplexityDecideOne(await createPerplexity(), {
          state: "a".repeat(380_952),
        });
        expectEq(calls.length, 1, "the last size that fits goes out");
        const failure = await capturePerplexityFailure(async () =>
          perplexityDecideOne(await createPerplexity(), {
            state: "a".repeat(380_953),
          }),
        );
        expectEq(failure.kind, "max_tokens_exceeded", "one character more");
        expect(
          failure.message.includes("~100001 tokens") &&
            failure.message.includes("reads at most 100000") &&
            failure.message.includes(model),
          "names the estimate, the window and the model",
        );
        expectEq(calls.length, 1, "refused before any request");
      });
    },
  );

  // Non-ASCII text is charged ceil(characters x 0.5), the rate measured for CJK.
  await perplexityCase(
    "DECIDE perplexity-decider: non-ASCII text is charged at half a token per character",
    async () => {
      await withMocks([perplexityRoute()], async ({ calls }) => {
        for (const characters of [190_000, 200_000]) {
          await perplexityDecideOne(await createPerplexity(), {
            state: "你".repeat(characters),
          });
        }
        expectEq(calls.length, 2, "up to 100,000 tokens goes out");
        for (const characters of [200_001, 210_000]) {
          const failure = await capturePerplexityFailure(async () =>
            perplexityDecideOne(await createPerplexity(), {
              state: "你".repeat(characters),
            }),
          );
          expectEq(
            failure.kind,
            "max_tokens_exceeded",
            `${characters} characters: refused`,
          );
          expect(
            failure.message.includes(`~${Math.ceil(characters * 0.5)} tokens`),
            `${characters} characters: charged ceil(characters x 0.5)`,
          );
          expect(
            failure.message.includes("reads at most 100000"),
            `${characters} characters: names the window`,
          );
        }
        expectEq(calls.length, 2, "refused before any request");
      });
    },
  );

  await perplexityCase(
    "DECIDE perplexity-decider: an object state is measured too",
    async () => {
      await withMocks([perplexityRoute()], async ({ calls }) => {
        await perplexityDecideOne(await createPerplexity(), {
          state: { log: "a".repeat(300_000) },
        });
        expectEq(calls.length, 1, "300,000 characters in a field goes out");
        const failure = await capturePerplexityFailure(async () =>
          perplexityDecideOne(await createPerplexity(), {
            state: { log: "a".repeat(400_000) },
          }),
        );
        expectEq(failure.kind, "max_tokens_exceeded", "400,000 is refused");
        expectEq(calls.length, 1, "refused before any request");
      });
    },
  );

  // ── P19: a decision model generates no text ──
  await perplexityCase(
    "DECIDE perplexity-decider: generate and stream refuse, and send nothing",
    async () => {
      const { NeuroLink } = await import("../dist/index.js");
      await withMocks([perplexityRoute()], async ({ calls }) => {
        const nl = new NeuroLink({ conversationMemory: { enabled: false } });
        const generate = await captureDecisionFailure(() =>
          nl.generate({
            provider,
            input: { text: "ping" },
            disableTools: true,
          }),
        );
        expect(
          generate.message.includes("decision-only provider") &&
            generate.message.includes("decide()"),
          "generate() says the provider is decision-only, and what to use",
        );
        const stream = await captureDecisionFailure(async () => {
          const result = await nl.stream({
            provider,
            input: { text: "ping" },
            disableTools: true,
          });
          for await (const chunk of result.stream) {
            void chunk;
          }
        });
        expect(
          stream.message.includes("decision-only provider") &&
            stream.message.includes("streaming is not available"),
          "stream() says streaming is not available",
        );
        // A NeuroLink instance may also fetch its model config in the
        // background; only a decision is a POST.
        expectEq(
          calls.filter((c) => c.method === "POST").length,
          0,
          "no request was sent for either",
        );
      });
    },
  );
}

async function runPerplexityCredentials(): Promise<void> {
  const { provider, envVar, baseURLEnvVar, key, endpoint } =
    PERPLEXITY_DECIDE_SPEC;
  const { NeuroLink, resolveDefaultDecisionProvider } =
    await import("../dist/index.js");
  const decideOnSdk = (nl: InstanceType<typeof NeuroLink>) =>
    nl.decide({
      provider,
      state: "short",
      questions: PERPLEXITY_ONE_QUESTION,
    });

  // ── P20: SDK credentials beat the environment, key and base URL alike ──
  await perplexityCase(
    "DECIDE perplexity-decider: SDK credentials beat the environment",
    async () => {
      try {
        setEnv(envVar, "test-fake-env-credential");
        setEnv(baseURLEnvVar, "https://pplx.env.example/other");
        await withMocks(
          [{ ...perplexityRoute(), url: "/v1/decisions" }],
          async ({ calls }) => {
            const nl = new NeuroLink({
              credentials: {
                perplexityDecider: {
                  apiKey: "test-fake-config-credential",
                  baseURL: "https://pplx.config.example/gw/v1/",
                },
              },
            });
            await decideOnSdk(nl);
            // A NeuroLink instance may also fetch its model config in the
            // background; only the decision is a POST.
            const post = calls.find((c) => c.method === "POST");
            expectEq(
              post?.url,
              "https://pplx.config.example/gw/v1/decisions",
              "endpoint from credentials.perplexityDecider.baseURL",
            );
            expectEq(
              post?.headers.authorization,
              "Bearer test-fake-config-credential",
              "key from credentials.perplexityDecider.apiKey",
            );
          },
        );
      } finally {
        resetPerplexityEnv();
      }
    },
  );

  // ── P21: the Sonar provider's credentials are not this provider's ──
  await perplexityCase(
    "DECIDE perplexity-decider: credentials.perplexity does not configure decide",
    async () => {
      const textSlice = { perplexity: { apiKey: "test-fake-text-credential" } };
      try {
        clearPerplexityEnv();
        expectEq(
          resolveDefaultDecisionProvider(textSlice),
          undefined,
          "the text provider's slice selects nothing",
        );
        await withMocks([perplexityRoute()], async ({ calls }) => {
          const nl = new NeuroLink({ credentials: textSlice });
          const named = await capturePerplexityFailure(async () =>
            decideOnSdk(nl),
          );
          expectEq(named.kind, "authentication", "naming the provider fails");
          expect(
            named.message.includes("PERPLEXITY_API_KEY"),
            "the message names PERPLEXITY_API_KEY",
          );
          const unnamed = await capturePerplexityFailure(async () =>
            nl.decide({
              state: "short",
              questions: PERPLEXITY_ONE_QUESTION,
            }),
          );
          expect(
            unnamed.threw && unnamed.message.includes("No decision provider"),
            "a bare decide() finds no provider to use",
          );
          expectEq(
            calls.filter((c) => c.method === "POST").length,
            0,
            "no decision request",
          );
        });
        // With the environment key set, it is that key, not the text slice's,
        // that is sent.
        setEnv(envVar, key);
        await withMocks([perplexityRoute()], async ({ calls }) => {
          await decideOnSdk(new NeuroLink({ credentials: textSlice }));
          const post = calls.find((c) => c.method === "POST");
          expectEq(
            post?.headers.authorization,
            `Bearer ${key}`,
            "the environment key",
          );
        });
      } finally {
        resetPerplexityEnv();
      }
    },
  );

  // ── P22: PERPLEXITY_API_KEY alone makes it the default decision provider ──
  await perplexityCase(
    "DECIDE perplexity-decider: PERPLEXITY_API_KEY alone makes it the default",
    async () => {
      try {
        resetPerplexityEnv();
        expectEq(
          resolveDefaultDecisionProvider(),
          provider,
          "the key alone selects it",
        );
        await withMocks([perplexityRoute()], async ({ calls }) => {
          const nl = new NeuroLink({ conversationMemory: { enabled: false } });
          const result = await nl.tryDecide({
            state: "short",
            questions: PERPLEXITY_ONE_QUESTION,
          });
          expectEq(result?.provider, provider, "chosen without being named");
          const posts = calls.filter((c) => c.method === "POST");
          expectEq(posts.length, 1, "one decision request");
          expectEq(posts[0]?.url, endpoint, "to the public endpoint");
          expectEq(
            posts[0]?.headers.authorization,
            `Bearer ${key}`,
            "with the environment key",
          );
        });
      } finally {
        resetPerplexityEnv();
      }
    },
  );

  // ── P22b: the providers ahead of it keep precedence, and a blank key is no key ──
  await perplexityCase(
    "DECIDE perplexity-decider: the other decision providers keep precedence",
    async () => {
      try {
        resetPerplexityEnv();
        setEnv("XOR_API_KEY", "test-fake-xor-credential");
        setEnv("XOR_BASE_URL", "https://xor.test.example/proxy");
        expectEq(resolveDefaultDecisionProvider(), "xor", "xor wins");
        setEnv("LAYA_API_KEY", "test-fake-laya-credential");
        setEnv("LAYA_BASE_URL", "https://laya.test.example/base");
        expectEq(
          resolveDefaultDecisionProvider(),
          "laya",
          "laya wins over xor",
        );
        setEnv("TYPESAFE_API_KEY", "test-fake-typesafe-credential");
        expectEq(
          resolveDefaultDecisionProvider(),
          "typesafe",
          "typesafe wins over both",
        );
        resetPerplexityEnv();
        setEnv(envVar, "   ");
        expectEq(
          resolveDefaultDecisionProvider(),
          undefined,
          "a blank key selects nothing",
        );
        setEnv(envVar, undefined);
        expectEq(
          resolveDefaultDecisionProvider({
            perplexityDecider: { apiKey: "test-fake-config-credential" },
          }),
          provider,
          "credentials.perplexityDecider.apiKey alone selects it",
        );
      } finally {
        resetPerplexityEnv();
      }
    },
  );
}

async function runPerplexityDecide(): Promise<void> {
  // Sections before this one leave their own fake keys behind, and a developer's
  // .env can hold a real one. Everything is cleared first and put back after.
  const prior = PERPLEXITY_DECISION_ENV.map((name) => process.env[name]);
  try {
    resetPerplexityEnv();
    await runPerplexityWire();
    await runPerplexityAnswers();
    await runPerplexityMedia();
    await runPerplexityErrors();
    await runPerplexityRetries();
    await runPerplexityLimits();
    await runPerplexityCredentials();
  } finally {
    PERPLEXITY_DECISION_ENV.forEach((name, i) => setEnv(name, prior[i]));
  }
}

// ───────────────────────────────────────────────────────────────────────
// Section: Cloudflare Clef (decide-only)
// ───────────────────────────────────────────────────────────────────────

/**
 * Clef follows the System One wire, so the `boolean`↔`noul` translation and the
 * answer parser are shared. What this section pins is Cloudflare's own: the
 * account-scoped route with the model in the path, the `{ result, success,
 * errors }` envelope around every answer, the separate `images` array, the error
 * codes Workers AI uses, and the local limits for a state longer than the
 * endpoint reads (it ignores text past about 2,048 tokens without saying so).
 *
 * The 200 body has the shape a live probe saw on 2026-10-03 (the probe used
 * `clef-flash`; the model name and the figures are spliced for `clef`). The 401,
 * 400, 413, 422 and 429 bodies are ones that probe provoked. A 403, a 500, a 503
 * and an HTML 504 were never seen from Cloudflare: those rows are stand-ins for
 * the status classes, and each says so where it is.
 */
const CLEF_SPEC = {
  provider: "cloudflare-clef",
  keyEnv: "CLOUDFLARE_API_KEY",
  accountEnv: "CLOUDFLARE_ACCOUNT_ID",
  baseURLEnvVar: "CLOUDFLARE_CLEF_BASE_URL",
  key: "test-fake-cloudflare-clef-credential",
  account: "0123456789abcdef0123456789abcdef",
  base: "https://api.cloudflare.com/client/v4",
  urlMatch: "/ai/run/@cf/cloudflare/",
  model: "clef",
};

const clefEndpoint = (
  model: string = CLEF_SPEC.model,
  base: string = CLEF_SPEC.base,
  account: string = CLEF_SPEC.account,
): string => `${base}/accounts/${account}/ai/run/@cf/cloudflare/${model}`;

const CLEF_REQUEST_ID = "bffacf9d-fa14-4008-a450-756c441d91fa";
const CLEF_TICKET =
  "Checkout has been failing for every customer for the last hour.";

// Cloudflare's own example request, in the SDK's spelling: `boolean` is the
// SDK's name for the wire's `noul`.
const CLEF_QUESTIONS = {
  urgent: {
    type: "boolean",
    instructions: "Is this support request urgent?",
  },
  team: {
    type: "choice",
    instructions: "Which team should handle this request?",
    criteria: {
      billing: "Payments, invoices, and refunds",
      technical: "Outages, errors, and configuration",
      sales: "Plans and upgrades",
    },
  },
  severity: {
    type: "score",
    instructions: "How severe is the customer impact?",
    criteria: ["No impact", "Minor", "Major", "Critical"],
  },
} satisfies DecisionQuestionMap;

const CLEF_ONE_QUESTION = {
  urgent: { type: "boolean", instructions: "Is this urgent?" },
} satisfies DecisionQuestionMap;

/** What CLEF_QUESTIONS must look like on the wire: only `boolean` is renamed. */
const CLEF_WIRE_REQUEST = {
  model: "clef",
  state: CLEF_TICKET,
  questions: {
    urgent: { type: "noul", instructions: "Is this support request urgent?" },
    team: CLEF_QUESTIONS.team,
    severity: CLEF_QUESTIONS.severity,
  },
};

/** The 200 body of the documented example, as a live probe returned it. */
function clefLiveBody(model: string = CLEF_SPEC.model) {
  return {
    result: {
      model,
      answers: {
        urgent: { type: "noul", noul: 0.9551 },
        team: {
          type: "choice",
          choice: "technical",
          probabilities: { billing: 0.0505, technical: 0.9355, sales: 0.014 },
          confidence: 0.817,
        },
        severity: {
          type: "score",
          score: 2.7182,
          legend: {
            "0": "No impact",
            "1": "Minor",
            "2": "Major",
            "3": "Critical",
          },
          probabilities: { "0": 0.0151, "1": 0.0144, "2": 0.2077, "3": 0.7628 },
          confidence: 0.5005,
        },
      },
      usage: { input_tokens: 346, output_tokens: 0 },
    },
    success: true,
    errors: [],
    messages: [],
  };
}

const clefEnvelope = (code: number, message: string) => ({
  success: false,
  errors: [{ code, message }],
  messages: [],
  result: {},
});

// The error envelopes a live probe provoked. Which layer answered decides the
// shape: Cloudflare's edge answers with a bare message, the model server nests
// a second envelope inside `message` with a trailing request id.
const CLEF_ERRORS = {
  // 401, seen with a deliberately wrong token.
  authentication: {
    result: null,
    success: false,
    errors: [{ code: 10000, message: "Authentication error" }],
    messages: [],
  },
  // 400, seen with a model path that does not exist.
  noRoute: {
    success: false,
    errors: [{ code: 7000, message: "No route for that URI" }],
    messages: [],
    result: null,
  },
  // 400, seen with a body that is not JSON.
  notJson: clefEnvelope(6003, "Request body is not valid json"),
  // 400, seen with zero questions and with an unknown question type.
  badInput: clefEnvelope(
    5006,
    "AiError: Bad input: Error: required properties at '/' are 'model,state,questions' (13e20fc4-ca60-4532-a069-9cc39aa7225a)",
  ),
  // 422, seen with 65 questions.
  validation: clefEnvelope(
    5012,
    'AiError: AiError: {"error":{"type":"invalid_request","message":"Request body failed validation","details":{"formErrors":[],"fieldErrors":{"questions":["Dictionary should have at most 64 items after validation, not 65"]}}}} (89a2b860-f03c-4fd3-9af2-9413f199f0d1)',
  ),
  // 422, seen with a 17.6-megapixel image (probe I11).
  imageDimensions: clefEnvelope(
    5012,
    'AiError: AiError: {"error":{"type":"invalid_request","message":"Request body failed validation","details":{"formErrors":[],"fieldErrors":{"images":["image dimensions are too large"]}}}} (dc5f2387-6df1-411b-a84f-497e3450dddd)',
  ),
  // 413, seen with a 450,000-character state.
  overLength: clefEnvelope(
    5021,
    "AiError: Ai: The estimated number of input and maximum output tokens (112556) exceeded this model context window limit (65536). (17060c92-1b60-48d5-b8ab-016882863c15)",
  ),
  // 429, seen with 4 of 60 requests sent at once; no Retry-After came with it.
  capacity: clefEnvelope(
    3040,
    "AiError: AiError: Capacity temporarily exceeded, please try again.",
  ),
  // 529, seen once on 2026-10-07: `clef`, a 190,153-token digit array, after 15 s.
  // The message nests an error object as text, as every AiError here does.
  inferenceFailed: clefEnvelope(
    5012,
    'AiError: AiError: {"error":{"type":"inference_error","message":"Clef inference failed"}}',
  ),
  // 429, seen 2026-10-05 once the account had used its free daily allocation;
  // no Retry-After came with it.
  dailyAllocation: clefEnvelope(
    4006,
    "AiError: AiError: you have used up your daily free allocation of 10,000 neurons, please upgrade to Cloudflare's Workers Paid plan if you would like to continue usage.",
  ),
};

/** An HTML page of the kind an edge answers a timeout with. */
const CLEF_GATEWAY_PAGE =
  "<html><head><title>504 Gateway Time-out</title></head><body><h1>504 Gateway Time-out</h1><p>edge-page-marker</p></body></html>";

type ClefReply = {
  status: number;
  json?: unknown;
  text?: string;
  contentType?: string;
  headers?: Record<string, string>;
};
type ClefRespond = ClefReply | ((call: { bodyJson: unknown }) => ClefReply);

function clefRoute(
  respond: ClefRespond = { status: 200, json: clefLiveBody() },
) {
  return { method: "POST", url: CLEF_SPEC.urlMatch, respond };
}

async function createClef(model?: string) {
  const { ProviderFactory } = await import("../dist/index.js");
  return ProviderFactory.createProvider(CLEF_SPEC.provider, model);
}

/** One decision on a single question, for tests that only care what was sent. */
async function clefDecideOne(
  provider: Awaited<ReturnType<typeof createClef>>,
  overrides: Partial<DecisionRequest> = {},
) {
  return provider.decide!({
    state: "short",
    questions: CLEF_ONE_QUESTION,
    ...overrides,
  });
}

type ClefBody = {
  model?: string;
  state?: unknown;
  questions?: Record<string, unknown>;
  images?: string[];
};

const clefBodyOf = (call: { bodyJson: unknown } | undefined): ClefBody =>
  (call?.bodyJson ?? {}) as ClefBody;

/** The failure shape is the same for every decision provider. */
const captureClefFailure = capturePerplexityFailure;
const clefCase = perplexityCase;

/** Run one decision against a canned reply; report how it was classified. */
async function clefOutcome(
  respond: ClefRespond,
  request: Partial<DecisionRequest> = {},
) {
  return withMocks([clefRoute(respond)], async ({ calls }) => {
    const failure = await captureClefFailure(async () =>
      clefDecideOne(await createClef(), request),
    );
    return { ...failure, calls: calls.length };
  });
}

/** Every variable that can make a decision provider the default one. */
const CLEF_DECISION_ENV = [
  "TYPESAFE_API_KEY",
  "AI_GATEWAY_API_KEY",
  "LAYA_API_KEY",
  "LAYA_BASE_URL",
  "XOR_API_KEY",
  "XOR_BASE_URL",
  "PERPLEXITY_API_KEY",
  "PERPLEXITY_DECIDER_BASE_URL",
  "PERPLEXITY_DECIDER_MODEL",
  "CLOUDFLARE_API_KEY",
  "CLOUDFLARE_ACCOUNT_ID",
  "CLOUDFLARE_CLEF_BASE_URL",
  "CLOUDFLARE_CLEF_MODEL",
  "SUBQ_API_KEY",
  "SUBQ_BASE_URL",
  "SUBQ_MODEL",
  "OPENAI_API_KEY",
  "OPENAI_DECISIONS_BASE_URL",
  "OPENAI_DECISIONS_MODEL",
  "SCALEDOWN_API_KEY",
  "SCALEDOWN_BASE_URL",
  "SCALEDOWN_MODEL",
];

/** No decision provider configured at all. */
function clearClefEnv(): void {
  for (const name of CLEF_DECISION_ENV) {
    setEnv(name, undefined);
  }
}

/** Only the Clef token and account set: no other decision provider is configured. */
function resetClefEnv(): void {
  clearClefEnv();
  setEnv(CLEF_SPEC.keyEnv, CLEF_SPEC.key);
  setEnv(CLEF_SPEC.accountEnv, CLEF_SPEC.account);
}

const clefQuestionsOf = (count: number): DecisionQuestionMap =>
  Object.fromEntries(
    Array.from({ length: count }, (_, i) => [
      `q${i}`,
      { type: "boolean", instructions: `Question ${i}?` } as const,
    ]),
  );

async function runClefWire(): Promise<void> {
  const { keyEnv, accountEnv, key } = CLEF_SPEC;

  await clefCase("DECIDE cloudflare-clef: no key, no request", async () => {
    try {
      for (const blank of [undefined, "   "]) {
        setEnv(keyEnv, blank);
        await withMocks([clefRoute()], async ({ calls }) => {
          const failure = await captureClefFailure(async () =>
            clefDecideOne(await createClef()),
          );
          expectEq(failure.kind, "authentication", "missing key classified");
          expect(
            failure.message.includes("CLOUDFLARE_API_KEY") &&
              failure.message.includes("credentials.cloudflareClef.apiKey"),
            "names both ways to set it",
          );
          expect(failure.retryable === false, "a missing key is not retried");
          expectEq(calls.length, 0, "no network call without a key");
        });
      }
    } finally {
      setEnv(keyEnv, key);
    }
  });

  await clefCase(
    "DECIDE cloudflare-clef: no account id, or a malformed one, no request",
    async () => {
      const rows: Array<[string, string | undefined]> = [
        ["unset", undefined],
        ["blank", "   "],
        ["a path", "../other"],
        ["a query", "abc?x=1"],
        ["a space", "ab cd"],
      ];
      try {
        for (const [label, value] of rows) {
          setEnv(accountEnv, value);
          await withMocks([clefRoute()], async ({ calls }) => {
            const failure = await captureClefFailure(async () =>
              clefDecideOne(await createClef()),
            );
            expectEq(
              failure.kind,
              "invalid_request",
              `${label}: refused as a request problem`,
            );
            expectEq(calls.length, 0, `${label}: nothing is sent`);
            const missing = value === undefined || value.trim() === "";
            expect(
              missing
                ? failure.message.includes("CLOUDFLARE_ACCOUNT_ID") &&
                    failure.message.includes(
                      "credentials.cloudflareClef.accountId",
                    )
                : failure.message.includes("letters, digits"),
              `${label}: the message says what to fix`,
            );
          });
        }
      } finally {
        setEnv(accountEnv, CLEF_SPEC.account);
      }
    },
  );

  await clefCase("DECIDE cloudflare-clef: wire contract", async () => {
    await withMocks([clefRoute()], async ({ calls }) => {
      await (
        await createClef()
      ).decide!({ state: CLEF_TICKET, questions: CLEF_QUESTIONS });
      expectEq(calls.length, 1, "single POST");
      const call = calls[0];
      expectEq(call.method, "POST", "method");
      expectEq(
        call.url,
        clefEndpoint(),
        "route: the account and the model are in the path",
      );
      expectEq(
        call.headers.authorization,
        `Bearer ${key}`,
        "bearer credential",
      );
      expect(
        (call.headers["content-type"] ?? "").includes("application/json"),
        "JSON content type",
      );
      expect(
        !("x-api-key" in call.headers),
        "the token travels only as a bearer token",
      );
      const body = call.bodyJson as Record<string, unknown>;
      expectEq(
        Object.keys(body).sort().join(","),
        "model,questions,state",
        "exactly three body keys when no image is sent",
      );
      expect(
        sameJson(body, CLEF_WIRE_REQUEST),
        "the body is the documented request, with boolean spelled noul",
      );
    });
  });

  await clefCase(
    "DECIDE cloudflare-clef: the model is in the path and the body, in either spelling",
    async () => {
      await withMocks([clefRoute()], async ({ calls }) => {
        await clefDecideOne(await createClef());
        await clefDecideOne(await createClef("clef-flash"));
        await clefDecideOne(await createClef("@cf/cloudflare/clef-flash"));
        await clefDecideOne(await createClef("clef-flash"), { model: "clef" });
        await clefDecideOne(await createClef(), {
          model: "@cf/cloudflare/clef-flash",
        });
        expect(
          sameJson(
            calls.map((c) => [c.url, clefBodyOf(c).model]),
            [
              [clefEndpoint("clef"), "clef"],
              [clefEndpoint("clef-flash"), "clef-flash"],
              [clefEndpoint("clef-flash"), "clef-flash"],
              [clefEndpoint("clef"), "clef"],
              [clefEndpoint("clef-flash"), "clef-flash"],
            ],
          ),
          "default, construction, prefixed and per-call models all reach path and body alike",
        );
      });
    },
  );

  await clefCase(
    "DECIDE cloudflare-clef: a model name that could reach another route is refused",
    async () => {
      const rows: Array<[string, string]> = [
        ["a path", "clef/../other"],
        ["a query", "clef?x=1"],
        ["another vendor's prefix", "@cf/meta/llama-3"],
        ["blank", "   "],
      ];
      await withMocks([clefRoute()], async ({ calls }) => {
        for (const [label, model] of rows) {
          const failure = await captureClefFailure(async () =>
            clefDecideOne(await createClef(), { model }),
          );
          expectEq(
            failure.kind,
            "invalid_request",
            `${label}: refused as a request problem`,
          );
          expect(
            failure.message.includes('"clef" or "clef-flash"'),
            `${label}: the message names the two models`,
          );
        }
        expectEq(calls.length, 0, "nothing was sent for any of them");
      });
    },
  );

  await clefCase(
    "DECIDE cloudflare-clef: a boolean keeps its criteria as a noul",
    async () => {
      const criteria = {
        true: "Customers are blocked.",
        false: "Nobody is blocked.",
      };
      await withMocks([clefRoute()], async ({ calls }) => {
        await clefDecideOne(await createClef(), {
          questions: {
            urgent: {
              type: "boolean",
              instructions: "Is this support request urgent?",
              criteria,
            },
          },
        });
        expect(
          sameJson(clefBodyOf(calls[0]).questions, {
            urgent: {
              type: "noul",
              instructions: "Is this support request urgent?",
              criteria,
            },
          }),
          "type renamed, instructions and criteria untouched",
        );
      });
    },
  );
}

async function runClefAnswers(): Promise<void> {
  await clefCase(
    "DECIDE cloudflare-clef: the answers come out of the result envelope",
    async () => {
      await withMocks(
        [
          clefRoute({
            status: 200,
            json: clefLiveBody("clef-flash"),
            headers: {
              "cf-ai-req-id": CLEF_REQUEST_ID,
              "cf-ray": "a44ae20419e54454-BOM",
            },
          }),
        ],
        async () => {
          const result = await (
            await createClef()
          ).decide!({ state: CLEF_TICKET, questions: CLEF_QUESTIONS });
          const urgent = result.answers.urgent;
          expectEq(urgent.type, "boolean", "a noul answer is a boolean");
          expectEq(
            urgent.type === "boolean" ? urgent.probability : -1,
            0.9551,
            "noul mapped to probability",
          );
          const team = result.answers.team;
          expectEq(
            team.type === "choice" ? team.choice : "",
            "technical",
            "choice",
          );
          expectEq(
            team.type === "choice" ? team.confidence : -1,
            0.817,
            "the reported confidence",
          );
          expect(
            team.type === "choice" &&
              sameJson(team.probabilities, {
                billing: 0.0505,
                technical: 0.9355,
                sales: 0.014,
              }),
            "the whole distribution is kept",
          );
          const severity = result.answers.severity;
          expectEq(
            severity.type === "score" ? severity.score : -1,
            2.7182,
            "score",
          );
          expect(
            severity.type === "score" &&
              sameJson(severity.legend, {
                "0": "No impact",
                "1": "Minor",
                "2": "Major",
                "3": "Critical",
              }),
            "the legend is kept",
          );
          expectEq(Object.keys(result.answers).length, 3, "one answer each");
          expectEq(
            result.model,
            "clef-flash",
            "API echo differs from the clef request",
          );
          expectEq(result.provider, CLEF_SPEC.provider, "provider name");
          expectEq(result.usage.inputTokens, 346, "usage.input_tokens mapped");
          expectEq(result.usage.outputTokens, 0, "usage.output_tokens mapped");
          expectEq(
            result.requestId,
            CLEF_REQUEST_ID,
            "the request id is cf-ai-req-id, not the edge's cf-ray",
          );
          expect(
            !("mediaBytes" in result),
            "a text-only request reports no media bytes",
          );
        },
      );
    },
  );

  await clefCase(
    "DECIDE cloudflare-clef: the request id falls back to cf-ray",
    async () => {
      await withMocks(
        [
          clefRoute({
            status: 200,
            json: clefLiveBody(),
            headers: { "cf-ray": "a44ae20419e54454-BOM" },
          }),
        ],
        async () => {
          const result = await clefDecideOne(await createClef());
          expectEq(result.requestId, "a44ae20419e54454-BOM", "cf-ray");
        },
      );
    },
  );

  await clefCase(
    "DECIDE cloudflare-clef: a 200 without the envelope is still read",
    async () => {
      await withMocks(
        [clefRoute({ status: 200, json: clefLiveBody().result })],
        async () => {
          const result = await (
            await createClef()
          ).decide!({ state: CLEF_TICKET, questions: CLEF_QUESTIONS });
          expectEq(Object.keys(result.answers).length, 3, "answers read");
          expectEq(result.usage.inputTokens, 346, "usage read");
        },
      );
    },
  );
}

async function runClefMedia(): Promise<void> {
  const pixel = syntheticPng(64, 64);
  const pixelUrl = dataUrl("image/png", pixel);

  await clefCase(
    "DECIDE cloudflare-clef: PNG, JPEG and WebP go in the images array",
    async () => {
      await withMocks([clefRoute()], async ({ calls }) => {
        for (const layout of SYNTHETIC_IMAGE_LAYOUTS) {
          const image = layout.build(64, 64);
          const url = dataUrl(layout.mime, image);
          const result = await clefDecideOne(await createClef(), {
            state: "Which colour is the square?",
            images: [image],
          });
          const body = clefBodyOf(calls[calls.length - 1]);
          expect(
            sameJson(body.images, [url]),
            `${layout.label}: one data URL in images`,
          );
          expectEq(
            body.state,
            "Which colour is the square?",
            `${layout.label}: the caller's state is left alone`,
          );
          expectEq(
            Object.keys(body).sort().join(","),
            "images,model,questions,state",
            `${layout.label}: a separate images field`,
          );
          expectEq(
            result.mediaBytes,
            url.length,
            `${layout.label}: media bytes reported`,
          );
        }
      });
    },
  );

  await clefCase(
    "DECIDE cloudflare-clef: images from a Buffer, a path and a data URL",
    async () => {
      const dir = mkdtempSync(join(tmpdir(), "clef-media-"));
      try {
        const path = join(dir, "pixel.png");
        writeFileSync(path, pixel);
        await withMocks([clefRoute()], async ({ calls }) => {
          await clefDecideOne(await createClef(), {
            state: "",
            images: [pixel, path, pixelUrl],
          });
          const body = clefBodyOf(calls[0]);
          expect(
            sameJson(body.images, [pixelUrl, pixelUrl, pixelUrl]),
            "every form encodes identically",
          );
          expectEq(body.state, "", "an empty state is sent as it is");
        });
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    },
  );

  await clefCase(
    "DECIDE cloudflare-clef: four images are sent, five and a video are refused",
    async () => {
      await withMocks([clefRoute()], async ({ calls }) => {
        await clefDecideOne(await createClef(), {
          images: [pixel, pixel, pixel, pixel],
        });
        expectEq(calls.length, 1, "four images go out");
        expectEq(
          clefBodyOf(calls[0]).images?.length,
          4,
          "all four are in the body",
        );
        const five = await captureClefFailure(async () =>
          clefDecideOne(await createClef(), {
            images: [pixel, pixel, pixel, pixel, pixel],
          }),
        );
        expectEq(five.kind, "invalid_request", "a fifth image is refused");
        const video = await captureClefFailure(async () =>
          clefDecideOne(await createClef(), { video: pixel }),
        );
        expectEq(video.kind, "invalid_request", "a video is refused");
        expectEq(calls.length, 1, "neither refusal reached the network");
      });
    },
  );

  await clefCase(
    "DECIDE cloudflare-clef: a format Cloudflare does not read is refused",
    async () => {
      const gif = dataUrl(
        "image/gif",
        Buffer.from("GIF89a\u0001\u0000\u0001\u0000"),
      );
      await withMocks([clefRoute()], async ({ calls }) => {
        const failure = await captureClefFailure(async () =>
          clefDecideOne(await createClef(), { images: [gif] }),
        );
        expectEq(failure.kind, "invalid_request", "refused");
        expectEq(calls.length, 0, "nothing is sent");
      });
    },
  );
}

async function runClefErrors(): Promise<void> {
  const edgeHeaders = { "cf-ray": "a44ae21b18bb45ed-BOM" };
  const modelHeaders = { ...edgeHeaders, "cf-ai-req-id": CLEF_REQUEST_ID };

  type Row = {
    label: string;
    reply: ClefReply;
    kind: string;
    retryable: boolean;
    includes?: string[];
    excludes?: string[];
    requestId?: string;
  };
  const rows: Row[] = [
    {
      label: "401 a token Cloudflare does not know",
      reply: {
        status: 401,
        json: CLEF_ERRORS.authentication,
        headers: edgeHeaders,
      },
      kind: "authentication",
      retryable: false,
      includes: ["Authentication error"],
      requestId: "a44ae21b18bb45ed-BOM",
    },
    {
      // Never seen: no token without Workers AI permission was available. The
      // body is the 401's, as a stand-in. A 403 is deliberately NOT
      // `authentication` (see `cloudflareErrorKind`): that would latch the
      // instance for the life of the process even after the permission is fixed.
      label: "403 stand-in: not authentication, so it never latches",
      reply: {
        status: 403,
        json: CLEF_ERRORS.authentication,
        headers: edgeHeaders,
      },
      kind: "invalid_request",
      retryable: false,
      includes: ["Authentication error"],
    },
    {
      label: "400 bad input, with the request id inside the message",
      reply: { status: 400, json: CLEF_ERRORS.badInput },
      kind: "invalid_request",
      retryable: false,
      includes: ["required properties"],
      excludes: ["AiError", "13e20fc4"],
      requestId: "13e20fc4-ca60-4532-a069-9cc39aa7225a",
    },
    {
      label: "400 no route: the hint names the two models",
      reply: { status: 400, json: CLEF_ERRORS.noRoute, headers: edgeHeaders },
      kind: "invalid_request",
      retryable: false,
      includes: [
        "No route for that URI",
        '"clef" and "clef-flash"',
        "/client/v4",
      ],
    },
    {
      label: "400 a body that is not JSON",
      reply: { status: 400, json: CLEF_ERRORS.notJson, headers: edgeHeaders },
      kind: "invalid_request",
      retryable: false,
      includes: ["not valid json"],
    },
    {
      label: "422 validation: the nested envelope is flattened",
      reply: {
        status: 422,
        json: CLEF_ERRORS.validation,
        headers: { "cf-ai-req-id": "89a2b860-f03c-4fd3-9af2-9413f199f0d1" },
      },
      kind: "invalid_request",
      retryable: false,
      includes: [
        "Request body failed validation",
        "questions: Dictionary should have at most 64 items",
      ],
      excludes: ["AiError", "{", "89a2b860"],
      // Real 422s carry the same uuid in the header and in the message.
      requestId: "89a2b860-f03c-4fd3-9af2-9413f199f0d1",
    },
    {
      // The 422 a 17.6-megapixel image drew (probe I11): the field is `images`.
      label: "422 an image over 16 megapixels",
      reply: {
        status: 422,
        json: CLEF_ERRORS.imageDimensions,
        headers: { "cf-ai-req-id": "dc5f2387-6df1-411b-a84f-497e3450dddd" },
      },
      kind: "invalid_request",
      retryable: false,
      includes: ["images: image dimensions are too large"],
      excludes: ["AiError", "{"],
      requestId: "dc5f2387-6df1-411b-a84f-497e3450dddd",
    },
    {
      label: "413 past the context window: the hint explains the count",
      reply: {
        status: 413,
        json: CLEF_ERRORS.overLength,
        headers: { "cf-ai-req-id": "17060c92-1b60-48d5-b8ab-016882863c15" },
      },
      kind: "max_tokens_exceeded",
      retryable: false,
      includes: [
        "estimated number of input and maximum output tokens (112556)",
        "about four characters per token",
      ],
    },
    {
      label: "429 capacity exceeded",
      reply: { status: 429, json: CLEF_ERRORS.capacity, headers: modelHeaders },
      kind: "rate_limit",
      retryable: true,
      includes: ["Capacity temporarily exceeded"],
    },
    {
      label: "429 daily free allocation used up is not retried",
      reply: {
        status: 429,
        json: CLEF_ERRORS.dailyAllocation,
        headers: modelHeaders,
      },
      kind: "rate_limit",
      retryable: false,
      includes: ["daily free allocation"],
    },
    {
      // A stand-in: Cloudflare never answered a 5xx during the probe.
      label: "500 stand-in",
      reply: {
        status: 500,
        json: clefEnvelope(5000, "AiError: boom"),
        headers: modelHeaders,
      },
      kind: "server",
      retryable: true,
    },
    {
      // The one 5xx ever observed from Cloudflare.
      label:
        "529 inference failed (seen once, 2026-10-07) is a retried server error",
      reply: {
        status: 529,
        json: CLEF_ERRORS.inferenceFailed,
        headers: modelHeaders,
      },
      kind: "server",
      retryable: true,
      includes: ["Clef inference failed"],
    },
    {
      // Never observed from Cloudflare: HTTP classification stand-in.
      label: "502 stand-in: Bad Gateway is a retried server error",
      reply: { status: 502, json: clefEnvelope(5000, "Bad Gateway stand-in") },
      kind: "server",
      retryable: true,
      includes: ["Bad Gateway stand-in"],
    },
    {
      // A stand-in, as above.
      label: "503 stand-in",
      reply: {
        status: 503,
        json: clefEnvelope(5000, "AiError: down"),
        headers: modelHeaders,
      },
      kind: "overloaded",
      retryable: true,
    },
    {
      // A stand-in. The HTML page is the kind an edge answers a timeout with,
      // seen from Perplexity's gateway; Cloudflare was never seen to send one.
      label: "504 stand-in: an HTML page, not an envelope",
      reply: { status: 504, text: CLEF_GATEWAY_PAGE, contentType: "text/html" },
      kind: "server",
      retryable: true,
      includes: ["Cloudflare request failed with HTTP 504"],
      excludes: ["edge-page-marker", "<html"],
    },
  ];

  await clefCase(
    "DECIDE cloudflare-clef: every error Workers AI answers with is classified",
    async () => {
      for (const row of rows) {
        const outcome = await clefOutcome(row.reply);
        expectEq(outcome.kind, row.kind, `${row.label}: kind`);
        expect(
          outcome.retryable === row.retryable,
          `${row.label}: retryable is ${row.retryable}`,
        );
        expectEq(
          outcome.status,
          row.reply.status,
          `${row.label}: the status is kept`,
        );
        for (const text of row.includes ?? []) {
          expect(
            outcome.message.includes(text),
            `${row.label}: the message keeps "${text}" (got: ${outcome.message})`,
          );
        }
        for (const text of row.excludes ?? []) {
          expect(
            !outcome.message.includes(text),
            `${row.label}: the message drops "${text}"`,
          );
        }
        if (row.requestId) {
          expectEq(
            outcome.requestId,
            row.requestId,
            `${row.label}: request id`,
          );
        }
        const attempts = row.retryable
          ? outcome.calls > 1
          : outcome.calls === 1;
        expect(
          attempts,
          `${row.label}: ${row.retryable ? "retried" : "sent once"} (${outcome.calls} calls)`,
        );
      }
    },
  );

  await clefCase(
    "DECIDE cloudflare-clef: a rejected token disables the instance",
    async () => {
      await withMocks(
        [
          clefRoute({
            status: 401,
            json: CLEF_ERRORS.authentication,
            headers: edgeHeaders,
          }),
        ],
        async ({ calls }) => {
          const provider = await createClef();
          const first = await captureClefFailure(async () =>
            clefDecideOne(provider),
          );
          expectEq(first.kind, "authentication", "the 401 is classified");
          expectEq(calls.length, 1, "one request reached the network");
          const second = await captureClefFailure(async () =>
            clefDecideOne(provider),
          );
          expectEq(second.kind, "authentication", "the next call is refused");
          expectEq(calls.length, 1, "without sending anything");
        },
      );
    },
  );

  await clefCase(
    "DECIDE cloudflare-clef: a 403 does not disable the instance, so a fixed permission works at once",
    async () => {
      let status = 403;
      await withMocks(
        [
          clefRoute(() =>
            status === 403
              ? {
                  status: 403,
                  json: CLEF_ERRORS.authentication,
                  headers: edgeHeaders,
                }
              : { status: 200, json: clefLiveBody(), headers: modelHeaders },
          ),
        ],
        async ({ calls }) => {
          const provider = await createClef();
          const first = await captureClefFailure(async () =>
            clefDecideOne(provider),
          );
          expectEq(first.kind, "invalid_request", "the 403 is not latching");
          expectEq(calls.length, 1, "sent once, not retried");
          // The permission is granted in the dashboard; nothing is rebuilt.
          status = 200;
          const second = await clefDecideOne(provider);
          expectEq(
            second.provider,
            CLEF_SPEC.provider,
            "the same instance works",
          );
          expectEq(calls.length, 2, "and reaches the network again");
        },
      );
    },
  );

  await clefCase(
    "DECIDE cloudflare-clef: a hostile error body is parsed in bounded time",
    async () => {
      const spaces = " ".repeat(200_000);
      const startedAt = Date.now();
      const outcome = await clefOutcome({
        status: 400,
        json: clefEnvelope(5012, `AiError: bad input${spaces}(not-a-uuid)`),
      });
      const elapsed = Date.now() - startedAt;
      expectEq(outcome.kind, "invalid_request", "still classified");
      expect(
        elapsed < 2_000,
        `a 200,000-space message did not hold the event loop (${elapsed} ms)`,
      );
      expect(
        outcome.message.length <= 500,
        `the message is capped (${outcome.message.length} chars)`,
      );
    },
  );

  await clefCase(
    "DECIDE cloudflare-clef: an error that echoes the token is redacted",
    async () => {
      const echoed = clefEnvelope(
        5012,
        `AiError: bad credential ${CLEF_SPEC.key} supplied`,
      );
      const outcome = await clefOutcome({ status: 400, json: echoed });
      expect(
        !outcome.message.includes(CLEF_SPEC.key),
        "the configured token does not reach the message",
      );
    },
  );

  await clefCase(
    "DECIDE cloudflare-clef: a 429 with no Retry-After is retried after the default backoff",
    async () => {
      const stamps: number[] = [];
      const replies: ClefReply[] = [
        { status: 429, json: CLEF_ERRORS.capacity, headers: modelHeaders },
        { status: 200, json: clefLiveBody(), headers: modelHeaders },
      ];
      await withMocks(
        [
          clefRoute(() => {
            stamps.push(Date.now());
            return replies[Math.min(stamps.length - 1, replies.length - 1)];
          }),
        ],
        async ({ calls }) => {
          const outcome = await captureClefFailure(async () =>
            clefDecideOne(await createClef()),
          );
          expect(!outcome.threw, "the retry succeeded");
          expectEq(calls.length, 2, "exactly one retry");
          expect(
            stamps.length === 2 && stamps[1] - stamps[0] >= 240,
            `the retry waited the default backoff (${stamps[1] - stamps[0]} ms)`,
          );
          expect(
            calls[0].bodyText === calls[1].bodyText,
            "the retry resends the same body",
          );
        },
      );
    },
  );
}

async function runClefLimits(): Promise<void> {
  // The descriptor's state limit is 16,000 estimated tokens. The sizes below are
  // chosen against it, so the first case pins the number: a changed limit must
  // fail here, not silently move every other case.
  const refusedLocally = async (request: Partial<DecisionRequest>) =>
    withMocks([clefRoute()], async ({ calls }) => {
      const failure = await captureClefFailure(async () =>
        clefDecideOne(await createClef(), request),
      );
      return { failure, calls: calls.length };
    });

  await clefCase(
    "DECIDE cloudflare-clef: a state over the window is refused before it is sent",
    async () => {
      // 89,600 letters estimate at 23,520 tokens, well clear of the limit, so the
      // case does not hinge on the global 5% safety margin of the estimate.
      const over = await refusedLocally({ state: "a".repeat(89_600) });
      expectEq(over.failure.kind, "max_tokens_exceeded", "refused");
      expect(
        over.failure.message.includes("reads at most 16000"),
        `the message gives the limit (got: ${over.failure.message})`,
      );
      expectEq(over.calls, 0, "nothing was sent");
      // 56,000 letters estimate at 14,700 tokens, inside it.
      const under = await refusedLocally({ state: "a".repeat(56_000) });
      expect(!under.failure.threw, "a state inside the window is sent");
      expectEq(under.calls, 1, "and reaches the network");
    },
  );

  await clefCase(
    "DECIDE cloudflare-clef: digits are charged a token each, because the tokenizer reads them one by one",
    async () => {
      // The same length: letters are cheap, digits are not.
      const letters = await refusedLocally({ state: "a".repeat(17_600) });
      expect(!letters.failure.threw, "17,600 letters are inside the window");
      const digits = await refusedLocally({ state: "7".repeat(17_600) });
      expectEq(
        digits.failure.kind,
        "max_tokens_exceeded",
        "17,600 digits are not",
      );
      expectEq(digits.calls, 0, "refused before it was sent");
      const fewer = await refusedLocally({ state: "7".repeat(14_400) });
      expect(!fewer.failure.threw, "14,400 digits still fit");
      const object = await refusedLocally({
        state: { amounts: Array.from({ length: 4_100 }, (_, i) => 1000 + i) },
      });
      expectEq(
        object.failure.kind,
        "max_tokens_exceeded",
        "a number-heavy object is counted the same way",
      );
    },
  );

  // Measured on 2026-10-03 (probe 5) and again on 2026-10-07: a JSON array of
  // single digits costs one token per character, commas included. A digit rate
  // alone would count it 14% short, so the estimate charges punctuation too.
  await clefCase(
    "DECIDE cloudflare-clef: punctuation is charged too, so a JSON array of digits is not let through",
    async () => {
      const array = (n: number) =>
        `[${Array.from({ length: n }, (_, i) => String(i % 10)).join(",")}]`;
      const over = await refusedLocally({ state: array(10_000) });
      expectEq(
        over.failure.kind,
        "max_tokens_exceeded",
        "10,000 digits (20,001 characters, about 17,500 estimated tokens) are refused",
      );
      expectEq(over.calls, 0, "refused before it was sent");
      const fits = await refusedLocally({ state: array(6_900) });
      expect(!fits.failure.threw, "6,900 digits (13,801 characters) still fit");
      // Pretty-printed JSON costs about twice as much per record as compact JSON.
      const pretty = JSON.stringify(
        Array.from({ length: 500 }, (_, i) => ({
          id: i,
          name: `item-${i}`,
          status: i % 3 === 0 ? "ok" : "pending",
          qty: (i * 13) % 97,
        })),
        null,
        2,
      );
      const prettyOutcome = await refusedLocally({ state: pretty });
      expectEq(
        prettyOutcome.failure.kind,
        "max_tokens_exceeded",
        "500 pretty-printed records (about 19,500 estimated tokens) are refused",
      );
    },
  );

  await clefCase(
    "DECIDE cloudflare-clef: emoji are charged 3 tokens each, so a state of emoji is not let through",
    async () => {
      const emoji = (n: number) =>
        Array.from({ length: n }, (_, i) =>
          String.fromCodePoint(0x1f300 + ((i * 37) % 700)),
        ).join("");
      // Measured 2026-10-03: 2.9 real tokens each.
      const over = await refusedLocally({ state: emoji(5_600) });
      expectEq(
        over.failure.kind,
        "max_tokens_exceeded",
        "5,600 emoji (about 16,800 estimated tokens) are refused",
      );
      const fits = await refusedLocally({ state: emoji(3_000) });
      expect(!fits.failure.threw, "3,000 emoji still fit");
    },
  );

  await clefCase(
    "DECIDE cloudflare-clef: non-ASCII text is charged 1.5 tokens a character",
    async () => {
      const fits = await refusedLocally({ state: "漢".repeat(9_500) });
      expect(!fits.failure.threw, "9,500 CJK characters fit");
      const over = await refusedLocally({ state: "漢".repeat(11_700) });
      expectEq(over.failure.kind, "max_tokens_exceeded", "11,700 do not");
      expectEq(over.calls, 0, "refused before it was sent");
    },
  );

  // The timeout reaches the platform as `AbortSignal.timeout(ms)`, so recording
  // that argument shows what a request was given without waiting for it.
  await clefCase(
    "DECIDE cloudflare-clef: the default timeout grows with the size of the state",
    async () => {
      const nativeTimeout = AbortSignal.timeout;
      const asked: number[] = [];
      AbortSignal.timeout = (ms: number) => {
        asked.push(ms);
        return nativeTimeout.call(AbortSignal, ms);
      };
      try {
        await withMocks([clefRoute()], async () => {
          const provider = await createClef();
          const timeoutOf = async (
            request: Partial<DecisionRequest>,
          ): Promise<string> => {
            asked.length = 0;
            await clefDecideOne(provider, request);
            return asked.join(",");
          };
          expectEq(
            await timeoutOf({}),
            "5000",
            "a short state: the 5 s allowance alone",
          );
          expectEq(
            await timeoutOf({ state: "a".repeat(40_000) }),
            "7500",
            "10,500 estimated tokens: the allowance and 2.5 s",
          );
          expectEq(
            await timeoutOf({ state: "a".repeat(60_000) }),
            "8750",
            "15,750 estimated tokens: the allowance and 3.75 s",
          );
          expectEq(
            await timeoutOf({ timeoutMs: 1234 }),
            "1234",
            "a caller's own timeout is used as given",
          );
        });
      } finally {
        AbortSignal.timeout = nativeTimeout;
      }
    },
  );

  await clefCase(
    "DECIDE cloudflare-clef: 64 questions are sent, 65 are refused",
    async () => {
      const ok = await refusedLocally({ questions: clefQuestionsOf(64) });
      expect(!ok.failure.threw, "64 are sent");
      const over = await refusedLocally({ questions: clefQuestionsOf(65) });
      expectEq(over.failure.kind, "max_tokens_exceeded", "65 are refused");
      expect(
        over.failure.message.includes("at most 64 questions"),
        "the message gives the cap",
      );
      expectEq(over.calls, 0, "nothing was sent");
    },
  );

  await clefCase(
    "DECIDE cloudflare-clef: a request past 256,000 bytes is refused, base64 image data included",
    async () => {
      const png = (extra: number) =>
        Buffer.concat([syntheticPng(10, 10), Buffer.alloc(extra, 7)]);
      // The client caps the full encoded body at 256,000 bytes. The live
      // 195/202 KB PNG boundary is historical (2026-10-03, clef-flash);
      // the service threshold changed on 2026-10-04 and is not this local cap.
      const ok = await refusedLocally({ state: "", images: [png(150_000)] });
      expect(!ok.failure.threw, "a 150 KB image is sent");
      const over = await refusedLocally({ state: "", images: [png(200_000)] });
      expectEq(over.failure.kind, "invalid_request", "a 200 KB image is not");
      expect(
        over.failure.message.includes("at most 256000"),
        `the message gives the limit (got: ${over.failure.message})`,
      );
      expectEq(over.calls, 0, "nothing was sent");
    },
  );

  // The case batching exists for: relevance compaction asks about up to 300
  // messages, and Clef takes 64. decide() refuses that (above); tryDecide is what
  // every built-in consumer calls, and splits it.
  await clefCase(
    "DECIDE cloudflare-clef: tryDecide splits 150 questions into 64, 64 and 22",
    async () => {
      let served = 0;
      await withMocks(
        [
          {
            method: "POST",
            url: CLEF_SPEC.urlMatch,
            respond: (call) => {
              served += 1;
              const ids = Object.keys(clefBodyOf(call).questions ?? {});
              return {
                status: 200,
                headers: { "cf-ai-req-id": `req-${served}` },
                json: {
                  result: {
                    model: "clef",
                    answers: Object.fromEntries(
                      ids.map((id) => [id, { type: "noul", noul: 0.5 }]),
                    ),
                    usage: { input_tokens: 100, output_tokens: 0 },
                  },
                  success: true,
                  errors: [],
                  messages: [],
                },
              };
            },
          },
        ],
        async ({ calls }) => {
          const { NeuroLink } = await import("../dist/index.js");
          const result = await new NeuroLink().tryDecide({
            provider: CLEF_SPEC.provider,
            state: "short",
            questions: clefQuestionsOf(150),
          });
          const sizes = calls
            .filter((c) => c.method === "POST")
            .map((c) => Object.keys(clefBodyOf(c).questions ?? {}).length)
            .sort((a, b) => b - a);
          expectEq(sizes.join(","), "64,64,22", "three requests, none over 64");
          expectEq(
            Object.keys(result?.answers ?? {}).length,
            150,
            "every question was answered",
          );
          expectEq(result?.usage.inputTokens, 300, "usage is summed");
          expectEq(
            (result?.requestId ?? "").split(",").length,
            3,
            "every batch's request id is listed",
          );
        },
      );
    },
  );
}

async function runClefCredentials(): Promise<void> {
  const { provider, keyEnv, accountEnv, baseURLEnvVar, key, account } =
    CLEF_SPEC;
  const { NeuroLink, resolveDefaultDecisionProvider } =
    await import("../dist/index.js");
  const decideOnSdk = (nl: InstanceType<typeof NeuroLink>) =>
    nl.decide({ provider, state: "short", questions: CLEF_ONE_QUESTION });

  await clefCase(
    "DECIDE cloudflare-clef: SDK credentials beat the environment",
    async () => {
      try {
        setEnv(keyEnv, "test-fake-env-credential");
        setEnv(accountEnv, "00000000000000000000000000000000");
        setEnv(baseURLEnvVar, "https://cf.env.example/other");
        await withMocks([clefRoute()], async ({ calls }) => {
          const nl = new NeuroLink({
            credentials: {
              cloudflareClef: {
                apiKey: "test-fake-config-credential",
                accountId: "fedcba98765432100123456789abcdef",
                baseURL: "https://cf.config.example/gw/v4/",
              },
            },
          });
          await decideOnSdk(nl);
          // A NeuroLink instance may also fetch its model config in the
          // background; only the decision is a POST.
          const post = calls.find((c) => c.method === "POST");
          expectEq(
            post?.url,
            clefEndpoint(
              "clef",
              "https://cf.config.example/gw/v4",
              "fedcba98765432100123456789abcdef",
            ),
            "endpoint from credentials.cloudflareClef",
          );
          expectEq(
            post?.headers.authorization,
            "Bearer test-fake-config-credential",
            "token from credentials.cloudflareClef.apiKey",
          );
        });
      } finally {
        resetClefEnv();
      }
    },
  );

  await clefCase(
    "DECIDE cloudflare-clef: CLOUDFLARE_CLEF_BASE_URL replaces the origin, and a trailing slash is dropped",
    async () => {
      try {
        setEnv(baseURLEnvVar, "https://cf.proxy.example/v4/");
        await withMocks([clefRoute()], async ({ calls }) => {
          await clefDecideOne(await createClef());
          expectEq(
            calls[0].url,
            clefEndpoint("clef", "https://cf.proxy.example/v4"),
            "the override carries the route",
          );
        });
      } finally {
        resetClefEnv();
      }
    },
  );

  await clefCase(
    "DECIDE cloudflare-clef: a base URL that cannot work is refused and never repeated",
    async () => {
      const rows: Array<[string, string]> = [
        ["userinfo", "https://ops:hunter2-basic@cf.internal.test/proxy"],
        ["query token", "https://cf.internal.test/proxy?token=hunter2-query"],
        // Empty to `new URL()`, but the route would still land after the `?`
        // or the `#`.
        ["bare question mark", "https://cf.internal.test/proxy?"],
        ["bare hash", "https://cf.internal.test/proxy#"],
        ["no scheme", "cf.internal:8080 hunter2-noscheme"],
        ["file scheme", "file:///tmp/hunter2-file"],
      ];
      try {
        for (const [label, url] of rows) {
          setEnv(baseURLEnvVar, url);
          await withMocks([clefRoute()], async ({ calls }) => {
            const failure = await captureClefFailure(async () =>
              clefDecideOne(await createClef()),
            );
            expectEq(failure.kind, "invalid_request", `${label}: refused`);
            expectEq(calls.length, 0, `${label}: nothing is sent`);
            expect(
              !failure.message.includes("hunter2"),
              `${label}: the URL's text stays out of the message`,
            );
          });
        }
      } finally {
        resetClefEnv();
      }
    },
  );

  await clefCase(
    "DECIDE cloudflare-clef: a slice with its own base URL never borrows the shared token",
    async () => {
      // CLOUDFLARE_API_KEY also runs the host's Workers AI text provider; it
      // must not be sent as a bearer token to an endpoint a caller chose.
      await withMocks([clefRoute()], async ({ calls }) => {
        const nl = new NeuroLink({
          credentials: {
            cloudflareClef: { baseURL: "https://cf.caller-chosen.example/v4" },
          },
        });
        const failure = await captureClefFailure(async () => decideOnSdk(nl));
        expectEq(failure.kind, "authentication", "refused for want of a token");
        expect(
          failure.message.includes("credentials.cloudflareClef.apiKey"),
          "the message names where to put it",
        );
        expectEq(
          calls.filter((c) => c.method === "POST").length,
          0,
          "nothing, and so no token, was sent to that host",
        );
      });
      // With its own token the same slice works, and only that token is sent.
      await withMocks([clefRoute()], async ({ calls }) => {
        const nl = new NeuroLink({
          credentials: {
            cloudflareClef: {
              apiKey: "test-fake-own-credential",
              baseURL: "https://cf.caller-chosen.example/v4",
            },
          },
        });
        await decideOnSdk(nl);
        const post = calls.find((c) => c.method === "POST");
        expectEq(
          post?.headers.authorization,
          "Bearer test-fake-own-credential",
          "only the slice's own token goes out",
        );
        expect(
          post?.url.startsWith(
            "https://cf.caller-chosen.example/v4/accounts/",
          ) === true,
          "to the endpoint it named",
        );
      });
    },
  );

  await clefCase(
    "DECIDE cloudflare-clef: CLOUDFLARE_CLEF_MODEL names the default model",
    async () => {
      // The registry reads the variable once, when providers register, and main()
      // clears it first, so only the instance's own read of it can be shown here:
      // a provider built with no model argument and none in the registry default.
      const { CloudflareClefProvider } =
        await import("../dist/providers/cloudflareClef.js");
      try {
        setEnv("CLOUDFLARE_CLEF_MODEL", "clef-flash");
        await withMocks([clefRoute()], async ({ calls }) => {
          await clefDecideOne(new CloudflareClefProvider());
          expectEq(
            calls[0].url,
            clefEndpoint("clef-flash"),
            "the variable picks the model in the path",
          );
          expectEq(clefBodyOf(calls[0]).model, "clef-flash", "and in the body");
        });
      } finally {
        setEnv("CLOUDFLARE_CLEF_MODEL", undefined);
      }
    },
  );

  await clefCase(
    "DECIDE cloudflare-clef: credentials.cloudflare does not configure decide",
    async () => {
      const textSlice = {
        cloudflare: { apiKey: "test-fake-text-credential", accountId: account },
      };
      try {
        clearClefEnv();
        expectEq(
          resolveDefaultDecisionProvider(textSlice),
          undefined,
          "the Workers AI text provider's slice selects nothing",
        );
      } finally {
        resetClefEnv();
      }
    },
  );

  await clefCase(
    "DECIDE cloudflare-clef: it needs both the token and the account id to count as configured",
    async () => {
      try {
        clearClefEnv();
        expectEq(
          resolveDefaultDecisionProvider({ cloudflareClef: { apiKey: key } }),
          undefined,
          "a token alone is not configured",
        );
        expectEq(
          resolveDefaultDecisionProvider({
            cloudflareClef: { accountId: account },
          }),
          undefined,
          "an account id alone is not configured",
        );
        expectEq(
          resolveDefaultDecisionProvider({
            cloudflareClef: { apiKey: key, accountId: account },
          }),
          provider,
          "SDK credentials with both make it the default",
        );
        setEnv(keyEnv, key);
        expectEq(
          resolveDefaultDecisionProvider(),
          undefined,
          "an environment token without an account id is not configured",
        );
        setEnv(accountEnv, account);
        expectEq(
          resolveDefaultDecisionProvider(),
          provider,
          "both in the environment make it the default",
        );
        setEnv("TYPESAFE_API_KEY", "test-fake-typesafe-credential");
        expectEq(
          resolveDefaultDecisionProvider(),
          "typesafe",
          "TypeSafe, Laya, XOR and Perplexity all outrank it",
        );
        setEnv("TYPESAFE_API_KEY", undefined);
        setEnv("PERPLEXITY_API_KEY", "test-fake-perplexity-credential");
        expectEq(
          resolveDefaultDecisionProvider(),
          "perplexity-decider",
          "and Perplexity outranks it",
        );
      } finally {
        resetClefEnv();
      }
    },
  );

  await clefCase(
    "DECIDE cloudflare-clef: SDK credentials alone make it the default for decide()",
    async () => {
      try {
        clearClefEnv();
        await withMocks([clefRoute()], async ({ calls }) => {
          const nl = new NeuroLink({
            credentials: {
              cloudflareClef: { apiKey: key, accountId: account },
            },
          });
          const result = await nl.decide({
            state: "short",
            questions: CLEF_ONE_QUESTION,
          });
          expectEq(result.provider, provider, "routed to Clef");
          const post = calls.find((c) => c.method === "POST");
          expectEq(post?.url, clefEndpoint(), "to the account's route");
        });
      } finally {
        resetClefEnv();
      }
    },
  );
}

async function runClefMediaHints(): Promise<void> {
  const { PROVIDER_DESCRIPTORS_BY_NAME } =
    await import("../dist/factories/providerDescriptors.js");
  const { ProviderFactory } = await import("../dist/index.js");
  const descriptors = [...PROVIDER_DESCRIPTORS_BY_NAME.values()].filter(
    (d) => d.inferenceKinds?.includes("decide") && d.decisionLimits?.media,
  );
  const coveredVideo = new Set<boolean>();
  const coveredAudio = new Set<boolean>();
  for (const descriptor of descriptors) {
    const limits = descriptor.decisionLimits!;
    const media = limits.media!;
    coveredVideo.add(media.video);
    coveredAudio.add(media.audio !== undefined);
    await clefCase(
      "DECIDE media limits: request byte hint respects video for " +
        descriptor.name,
      async () => {
        setEnv("PERPLEXITY_API_KEY", "test-fake-perplexity-credential");
        setEnv("XOR_API_KEY", "test-fake-xor-credential");
        setEnv("XOR_BASE_URL", "https://xor.internal.test");
        setEnv("OPENAI_API_KEY", "test-fake-openai-credential");
        // A catalog-built descriptor is deep-frozen, so the case swaps the
        // registered row for a copy with a small cap instead of assigning to
        // it, and puts the original back. The map is a Map built at load; only
        // its declared type is read-only.
        const registered = PROVIDER_DESCRIPTORS_BY_NAME as Map<
          typeof descriptor.name,
          typeof descriptor
        >;
        try {
          registered.set(descriptor.name, {
            ...descriptor,
            decisionLimits: {
              ...limits,
              media: { ...media, maxRequestBytes: 1_000 },
            },
          });
          await withMocks([clefRoute()], async ({ calls }) => {
            const provider = await ProviderFactory.createProvider(
              descriptor.name,
            );
            const failure = await captureClefFailure(() =>
              provider.decide!({
                state: "short",
                questions: {
                  urgent: {
                    type: "boolean",
                    instructions: "question ".repeat(300),
                  },
                },
              }),
            );
            expectEq(failure.kind, "invalid_request", "request bytes refused");
            expectEq(
              failure.message.includes("a shorter video"),
              media.video,
              "hint follows media.video",
            );
            expectEq(
              failure.message.includes("a shorter audio clip"),
              media.audio !== undefined,
              "hint follows media.audio",
            );
            expect(
              failure.message.includes("Send fewer or smaller images"),
              "image hint retained",
            );
            expectEq(calls.length, 0, "refused locally");
          });
        } finally {
          registered.set(descriptor.name, descriptor);
          resetClefEnv();
        }
      },
    );
  }
  await clefCase(
    "DECIDE media limits: byte hints cover image-only providers and one that also takes audio",
    async () => {
      // No shipped provider reads video, so its hint is covered by none here.
      expect(!coveredVideo.has(true), "a provider declares video again");
      expect(coveredVideo.has(false), "loop covered an image-only provider");
      expect(coveredAudio.has(true), "loop covered an audio provider");
      expect(coveredAudio.has(false), "loop covered a provider without audio");
    },
  );
  await clefCase(
    "DECIDE cloudflare-clef: image/jpg is normalized to image/jpeg",
    async () => {
      const jpeg = readFileSync(
        fileURLToPath(
          new URL(
            "./fixtures/decide/perplexity-decider/red.jpg",
            import.meta.url,
          ),
        ),
      );
      const url = dataUrl("image/jpg", jpeg);
      await withMocks([clefRoute()], async ({ calls }) => {
        const result = await clefDecideOne(await createClef(), {
          images: [url],
        });
        expectEq(
          clefBodyOf(calls.find((c) => c.method === "POST")).images?.[0],
          url.replace("image/jpg", "image/jpeg"),
          "alias normalized without changing payload",
        );
        expectEq(
          result.mediaBytes,
          Buffer.byteLength(url.replace("image/jpg", "image/jpeg")),
          "mediaBytes counts the normalized MIME prefix",
        );
      });
    },
  );
  await clefCase(
    "DECIDE cloudflare-clef: uppercase JPG data URL is normalized to image/jpeg",
    async () => {
      const jpeg = readFileSync(
        fileURLToPath(
          new URL(
            "./fixtures/decide/perplexity-decider/red.jpg",
            import.meta.url,
          ),
        ),
      );
      const canonical = dataUrl("image/jpeg", jpeg);
      const uppercase = `DATA:IMAGE/JPG;BASE64,${jpeg.toString("base64")}`;
      await withMocks([clefRoute()], async ({ calls }) => {
        const result = await clefDecideOne(await createClef(), {
          images: [uppercase],
        });
        expectEq(
          clefBodyOf(calls.find((c) => c.method === "POST")).images?.[0],
          canonical,
          "uppercase prefix canonicalized without changing payload",
        );
        expectEq(
          result.mediaBytes,
          Buffer.byteLength(canonical),
          "uppercase alias bytes match wire data",
        );
      });
    },
  );
  await clefCase(
    "DECIDE cloudflare-clef: mixed PNG and JPG images report the normalized byte sum",
    async () => {
      const jpeg = readFileSync(
        fileURLToPath(
          new URL(
            "./fixtures/decide/perplexity-decider/red.jpg",
            import.meta.url,
          ),
        ),
      );
      const png = readFileSync(
        fileURLToPath(
          new URL(
            "./fixtures/decide/perplexity-decider/red.png",
            import.meta.url,
          ),
        ),
      );
      const images = [dataUrl("image/png", png), dataUrl("image/jpg", jpeg)];
      const expected = [images[0], dataUrl("image/jpeg", jpeg)];
      await withMocks([clefRoute()], async ({ calls }) => {
        const result = await clefDecideOne(await createClef(), { images });
        expectEq(
          JSON.stringify(
            clefBodyOf(calls.find((c) => c.method === "POST")).images,
          ),
          JSON.stringify(expected),
          "both images retain order and payload",
        );
        expectEq(
          result.mediaBytes,
          expected.reduce((sum, image) => sum + Buffer.byteLength(image), 0),
          "mediaBytes sums both canonical images",
        );
      });
    },
  );
}

async function runClefHardening(): Promise<void> {
  const { NeuroLink, resolveDefaultDecisionProvider, logger } =
    await import("../dist/index.js");
  const { PROVIDER_DESCRIPTORS_BY_NAME } =
    await import("../dist/factories/providerDescriptors.js");
  await clefCase(
    "DECIDE cloudflare-clef: default timeout is 5000ms",
    async () => {
      expectEq(
        [...PROVIDER_DESCRIPTORS_BY_NAME.values()].find(
          (d) => d.name === CLEF_SPEC.provider,
        )?.timeouts?.decideMs,
        5_000,
        "default timeout",
      );
    },
  );
  await clefCase(
    "DECIDE cloudflare-clef: Laya and XOR outrank Clef",
    async () => {
      try {
        resetClefEnv();
        setEnv("LAYA_API_KEY", "test-fake-laya-credential");
        setEnv("LAYA_BASE_URL", "https://laya.internal.test");
        expectEq(
          resolveDefaultDecisionProvider(),
          "laya",
          "Laya outranks Clef",
        );
        setEnv("LAYA_API_KEY", undefined);
        setEnv("LAYA_BASE_URL", undefined);
        setEnv("XOR_API_KEY", "test-fake-xor-credential");
        setEnv("XOR_BASE_URL", "https://xor.internal.test");
        expectEq(resolveDefaultDecisionProvider(), "xor", "XOR outranks Clef");
      } finally {
        resetClefEnv();
      }
    },
  );
  await clefCase(
    "DECIDE cloudflare-clef: SDK and environment credentials can be mixed",
    async () => {
      try {
        for (const fromSdk of ["key", "account"]) {
          clearClefEnv();
          const credentials =
            fromSdk === "key"
              ? { apiKey: "test-fake-sdk-clef-credential" }
              : { accountId: "test-fake-sdk-account" };
          setEnv(
            fromSdk === "key" ? CLEF_SPEC.accountEnv : CLEF_SPEC.keyEnv,
            fromSdk === "key" ? CLEF_SPEC.account : CLEF_SPEC.key,
          );
          expectEq(
            resolveDefaultDecisionProvider({ cloudflareClef: credentials }),
            CLEF_SPEC.provider,
            "mixed sources configure Clef",
          );
          await withMocks([clefRoute()], async ({ calls }) => {
            const result = await new NeuroLink({
              credentials: { cloudflareClef: credentials },
            }).decide({
              state: "short",
              questions: CLEF_ONE_QUESTION,
            });
            expectEq(
              result.provider,
              CLEF_SPEC.provider,
              "resolved default provider",
            );
            const post = calls.find((c) => c.method === "POST");
            expectEq(
              post?.headers.authorization,
              "Bearer " +
                (fromSdk === "key" ? credentials.apiKey : CLEF_SPEC.key),
              "token source",
            );
            expectEq(
              post?.url,
              clefEndpoint(
                "clef",
                CLEF_SPEC.base,
                fromSdk === "account"
                  ? credentials.accountId
                  : CLEF_SPEC.account,
              ),
              "account source",
            );
          });
        }
      } finally {
        resetClefEnv();
      }
    },
  );
  await clefCase(
    "DECIDE cloudflare-clef: base URL credentials stay out of the debug log",
    async () => {
      const priorDebug = console.debug;
      const priorFlag = process.env.NEUROLINK_DEBUG;
      const loadLevel = process.env.NEUROLINK_LOG_LEVEL?.toLowerCase();
      const priorLevel =
        loadLevel === "debug" || loadLevel === "warn" || loadLevel === "error"
          ? loadLevel
          : "info";
      const lines: string[] = [];
      try {
        setEnv("NEUROLINK_DEBUG", "true");
        logger.setLogLevel("debug");
        console.debug = (...args: unknown[]) => {
          lines.push(
            args
              .map((a) => (typeof a === "string" ? a : JSON.stringify(a)))
              .join(" "),
          );
        };
        for (const base of [
          "https://ops:hunter2-basic@cf.internal.test/proxy",
          "https://cf.internal.test/proxy?token=hunter2-query",
        ]) {
          lines.length = 0;
          setEnv(CLEF_SPEC.baseURLEnvVar, base);
          await createClef();
          expect(
            lines.some((l) =>
              l.includes("Cloudflare Clef decision provider initialized"),
            ),
            "construction log observed",
          );
          expect(
            !lines.some((l) => l.includes("hunter2") || l.includes("ops:")),
            "userinfo and query secrets absent",
          );
        }
      } finally {
        console.debug = priorDebug;
        logger.setLogLevel(priorLevel);
        setEnv("NEUROLINK_DEBUG", priorFlag);
        resetClefEnv();
      }
    },
  );
  await clefCase(
    "DECIDE cloudflare-clef: uppercase CLEF is lower-cased in path and body",
    async () => {
      await withMocks([clefRoute()], async ({ calls }) => {
        await clefDecideOne(await createClef("CLEF"));
        const post = calls.find((c) => c.method === "POST");
        expectEq(post?.url, clefEndpoint(), "lower-case path");
        expectEq(clefBodyOf(post).model, "clef", "lower-case body");
      });
    },
  );
  await clefCase(
    "DECIDE cloudflare-clef: a GIF Buffer is refused locally",
    async () => {
      const gif = Buffer.concat([
        Buffer.from("GIF89a", "ascii"),
        Buffer.from([1, 0, 1, 0, 0, 0, 0]),
      ]);
      await withMocks([clefRoute()], async ({ calls }) => {
        const failure = await captureClefFailure(async () =>
          clefDecideOne(await createClef(), { images: [gif] }),
        );
        expectEq(failure.kind, "invalid_request", "GIF refused");
        expect(
          failure.message.includes("PNG, JPEG or WebP"),
          "accepted types named",
        );
        expectEq(calls.length, 0, "no network request");
      });
    },
  );
  await clefCase(
    "DECIDE cloudflare-clef: tryDecide preserves answers when one batch fails",
    async () => {
      await withMocks(
        [
          clefRoute((call) => {
            const ids = Object.keys(clefBodyOf(call).questions ?? {});
            return ids.includes("q64")
              ? { status: 422, json: CLEF_ERRORS.validation }
              : {
                  status: 200,
                  json: {
                    result: {
                      model: "clef",
                      answers: Object.fromEntries(
                        ids.map((id) => [id, { type: "noul", noul: 0.5 }]),
                      ),
                      usage: { input_tokens: 100, output_tokens: 0 },
                    },
                    success: true,
                  },
                };
          }),
        ],
        async ({ calls }) => {
          const result = await new NeuroLink().tryDecide({
            provider: CLEF_SPEC.provider,
            state: "short",
            questions: clefQuestionsOf(150),
          });
          expectEq(
            calls.filter((c) => c.method === "POST").length,
            3,
            "all batches attempted",
          );
          expectEq(
            Object.keys(result?.answers ?? {}).length,
            86,
            "64 plus 22 surviving answers",
          );
          expect(
            result?.answers.q0 !== undefined &&
              result.answers.q149 !== undefined,
            "first and last batches retained",
          );
          expect(
            result?.answers.q64 === undefined &&
              result?.answers.q127 === undefined,
            "failed batch absent",
          );
          expectEq(
            result?.usage.inputTokens,
            200,
            "only successful usage counted",
          );
        },
      );
    },
  );
  await clefCase(
    "DECIDE cloudflare-clef: a 32-hex id in an error message is redacted",
    async () => {
      const outcome = await clefOutcome({
        status: 400,
        json: clefEnvelope(5006, "Rejected account " + CLEF_SPEC.account),
      });
      expectEq(outcome.kind, "invalid_request", "classification unchanged");
      expect(!outcome.message.includes(CLEF_SPEC.account), "account id absent");
      expect(
        outcome.message.includes("[redacted]"),
        "redaction marker present",
      );
    },
  );
}

async function runCloudflareClefDecide(): Promise<void> {
  // Sections before this one leave their own fake keys behind, and a developer's
  // .env can hold real ones, Cloudflare's included. Everything is cleared first
  // and put back after.
  const prior = CLEF_DECISION_ENV.map((name) => process.env[name]);
  try {
    resetClefEnv();
    await runClefWire();
    await runClefAnswers();
    await runClefMedia();
    await runClefErrors();
    await runClefLimits();
    await runClefCredentials();
    await runClefMediaHints();
    await runClefHardening();
  } finally {
    CLEF_DECISION_ENV.forEach((name, i) => setEnv(name, prior[i]));
  }
}

/**
 * SubQ Snap is described entirely by src/lib/providers/catalog/subq.json, so the
 * generic loop (runDecideCatalogSection) already covers its error rules, answers
 * and limits against test/fixtures/decide/subq/contract.json. What that loop
 * cannot show is anything that depends on the built-in endpoint: it points every
 * entry at a fake .test host through SUBQ_BASE_URL before it asks. These cases
 * fetch-mock every request, so none reaches api.subq.ai; they read the URL the
 * mock saw. They show where a request goes with no base URL set
 * (https://api.subq.ai/v1/systemone), what replaces it, and where the entry sits
 * in the decision precedence. The fixture's 200 body is the one captured on
 * 2026-10-13, and so is its over-length 400; its other error bodies are
 * stand-ins written from SubQ's documentation.
 */
const SUBQ_SPEC = {
  provider: "subq",
  keyEnv: "SUBQ_API_KEY",
  baseURLEnvVar: "SUBQ_BASE_URL",
  key: "test-fake-subq-credential",
  endpoint: "https://api.subq.ai/v1/systemone",
  model: "subq-snap-preview",
};

const SUBQ_ONE_QUESTION = {
  urgent: { type: "boolean", instructions: "Is this urgent?" },
} satisfies DecisionQuestionMap;

function subqRoute() {
  return {
    method: "POST",
    url: "/v1/systemone",
    respond: {
      status: 200,
      json: {
        model: SUBQ_SPEC.model,
        answers: { urgent: { type: "noul", noul: 0.75 } },
        usage: { input_tokens: 3, output_tokens: 0 },
      },
    },
  };
}

/** Only the SubQ key set: no other decision provider is configured. */
function resetSubqEnv(): void {
  for (const name of CLEF_DECISION_ENV) {
    setEnv(name, undefined);
  }
  setEnv(SUBQ_SPEC.keyEnv, SUBQ_SPEC.key);
}

const subqCase = perplexityCase;

async function runSubqDecide(): Promise<void> {
  const { provider, keyEnv, baseURLEnvVar, key, endpoint, model } = SUBQ_SPEC;
  const { NeuroLink, resolveDefaultDecisionProvider } =
    await import("../dist/index.js");
  const prior = CLEF_DECISION_ENV.map((name) => process.env[name]);
  // A NeuroLink instance may also fetch its model config in the background;
  // only the decision is a POST.
  const posts = (calls: ReturnType<typeof installMockFetch>["calls"]) =>
    calls.filter((c) => c.method === "POST");
  const ask = (nl: InstanceType<typeof NeuroLink>, named?: string) =>
    nl.decide({
      ...(named === undefined ? {} : { provider: named }),
      state: "short",
      questions: SUBQ_ONE_QUESTION,
    });

  try {
    await subqCase(
      "DECIDE subq: SUBQ_API_KEY alone makes it the default, and a request with no base URL goes to the built-in endpoint",
      async () => {
        resetSubqEnv();
        expectEq(
          resolveDefaultDecisionProvider(),
          provider,
          "the key alone selects it",
        );
        await withMocks([subqRoute()], async ({ calls }) => {
          const nl = new NeuroLink({ conversationMemory: { enabled: false } });
          const result = await nl.tryDecide({
            state: "short",
            questions: SUBQ_ONE_QUESTION,
          });
          expectEq(result?.provider, provider, "chosen without being named");
          const sent = posts(calls);
          expectEq(sent.length, 1, "one decision request");
          expectEq(sent[0]?.url, endpoint, "to the built-in endpoint");
          expectEq(
            sent[0]?.headers.authorization,
            `Bearer ${key}`,
            "with the environment key",
          );
          expectEq(
            (sent[0]?.bodyJson as { model?: string } | undefined)?.model,
            model,
            "naming the default model",
          );
        });
      },
    );

    await subqCase(
      "DECIDE subq: SUBQ_BASE_URL replaces the origin, a trailing slash is dropped, and a blank value is no override",
      async () => {
        resetSubqEnv();
        const routes = [subqRoute()];
        setEnv(baseURLEnvVar, "https://subq.proxy.example/gw//");
        await withMocks(routes, async ({ calls }) => {
          await ask(new NeuroLink(), provider);
          expectEq(
            posts(calls)[0]?.url,
            "https://subq.proxy.example/gw/v1/systemone",
            "the override carries the route",
          );
        });
        setEnv(baseURLEnvVar, "   ");
        await withMocks(routes, async ({ calls }) => {
          await ask(new NeuroLink(), provider);
          expectEq(
            posts(calls)[0]?.url,
            endpoint,
            "a blank override leaves the built-in endpoint",
          );
        });
      },
    );

    await subqCase(
      "DECIDE subq: SDK credentials beat the environment, key and base URL alike",
      async () => {
        resetSubqEnv();
        setEnv(baseURLEnvVar, "https://subq.env.example");
        await withMocks([subqRoute()], async ({ calls }) => {
          const nl = new NeuroLink({
            credentials: {
              subq: {
                apiKey: "test-fake-config-credential",
                baseURL: "https://subq.config.example/",
              },
            },
          });
          await ask(nl, provider);
          const sent = posts(calls)[0];
          expectEq(
            sent?.url,
            "https://subq.config.example/v1/systemone",
            "endpoint from credentials.subq.baseURL",
          );
          expectEq(
            sent?.headers.authorization,
            "Bearer test-fake-config-credential",
            "key from credentials.subq.apiKey",
          );
        });
        setEnv(baseURLEnvVar, undefined);
        setEnv(keyEnv, undefined);
        expectEq(
          resolveDefaultDecisionProvider({
            subq: { apiKey: "test-fake-config-credential" },
          }),
          provider,
          "credentials.subq.apiKey alone selects it",
        );
      },
    );

    await subqCase(
      "DECIDE subq: both aliases name it, and the result says subq",
      async () => {
        resetSubqEnv();
        for (const alias of ["subquadratic", "subq-snap"]) {
          await withMocks([subqRoute()], async ({ calls }) => {
            const result = await ask(new NeuroLink(), alias);
            expectEq(result.provider, provider, `${alias} resolves to subq`);
            expectEq(posts(calls)[0]?.url, endpoint, `${alias} endpoint`);
          });
        }
      },
    );

    await subqCase(
      "DECIDE subq: it outranks the shared-key providers but not TypeSafe, Laya or XOR, and a blank key is no key",
      async () => {
        resetSubqEnv();
        expectEq(resolveDefaultDecisionProvider(), provider, "alone");
        // Perplexity and Clef share their keys with text providers, so a key set
        // for those must never displace a SubQ key a host set on purpose.
        setEnv("CLOUDFLARE_API_KEY", "test-fake-cloudflare-credential");
        setEnv("CLOUDFLARE_ACCOUNT_ID", "0123456789abcdef0123456789abcdef");
        expectEq(
          resolveDefaultDecisionProvider(),
          provider,
          "subq wins over clef",
        );
        setEnv("PERPLEXITY_API_KEY", "test-fake-perplexity-credential");
        expectEq(
          resolveDefaultDecisionProvider(),
          provider,
          "subq wins over perplexity",
        );
        setEnv(keyEnv, undefined);
        expectEq(
          resolveDefaultDecisionProvider(),
          "perplexity-decider",
          "without subq, perplexity still wins over clef",
        );
        setEnv(keyEnv, key);
        setEnv("XOR_API_KEY", "test-fake-xor-credential");
        setEnv("XOR_BASE_URL", "https://xor.test.example/proxy");
        expectEq(resolveDefaultDecisionProvider(), "xor", "xor wins");
        setEnv("LAYA_API_KEY", "test-fake-laya-credential");
        setEnv("LAYA_BASE_URL", "https://laya.test.example/base");
        expectEq(resolveDefaultDecisionProvider(), "laya", "laya wins");
        setEnv("TYPESAFE_API_KEY", "test-fake-typesafe-credential");
        expectEq(resolveDefaultDecisionProvider(), "typesafe", "typesafe wins");
        resetSubqEnv();
        setEnv(keyEnv, "   ");
        expectEq(
          resolveDefaultDecisionProvider(),
          undefined,
          "a blank key selects nothing",
        );
      },
    );

    await subqCase(
      "DECIDE subq: its state limit is reported and left to the server, with no question cap",
      async () => {
        resetSubqEnv();
        const reading = new NeuroLink().decisionLimits({ provider });
        expectEq(reading?.maxStateTokens, 376000, "the declared state window");
        expectEq(reading?.enforcedLocally, false, "advisory, not enforced");
        expect(
          reading !== null && !("maxQuestions" in reading),
          "no question cap is declared, so none is reported",
        );
        expect(
          reading !== null && !("media" in reading),
          "no media is declared",
        );
      },
    );
  } finally {
    CLEF_DECISION_ENV.forEach((name, i) => setEnv(name, prior[i]));
  }
}

type DialectUnderTest = ReturnType<
  (typeof import("../dist/providers/decide/dialects/index.js"))["getDecisionDialect"]
>;

async function runDecideDialect(): Promise<void> {
  console.log("\n--- Decide dialect: system-one ---");
  const registry = await import("../dist/providers/decide/dialects/index.js");
  const direct = await import("../dist/providers/decide/dialects/systemOne.js");
  const dialect = registry.getDecisionDialect("system-one");
  const same = (actual: unknown, expected: unknown, label: string): void =>
    expectEq(JSON.stringify(actual), JSON.stringify(expected), label);
  const confidenceOf = (
    reading: ReturnType<DialectUnderTest["readAnswers"]>,
    id: string,
  ): unknown =>
    (reading?.answers[id] as { confidence?: unknown } | undefined)?.confidence;
  const choice = (confidence?: number) => ({
    type: "choice",
    choice: "billing",
    probabilities: { billing: 0.7, sales: 0.3 },
    ...(confidence === undefined ? {} : { confidence }),
  });

  const cases: Array<[string, () => void]> = [
    [
      "DECIDE dialect system-one: the registry returns the shared dialect object",
      () => {
        expectEq(dialect, direct.systemOneDialect, "registry and module agree");
        expectEq(dialect.name, "system-one", "dialect name");
      },
    ],
    [
      "DECIDE dialect system-one: a boolean question is sent as noul, criteria only when present",
      () => {
        same(
          dialect.encodeQuestion({
            type: "boolean",
            instructions: "Is this urgent?",
          }),
          { type: "noul", instructions: "Is this urgent?" },
          "no criteria",
        );
        same(
          dialect.encodeQuestion({
            type: "boolean",
            instructions: "Is this urgent?",
            criteria: { true: "urgent", false: "routine" },
          }),
          {
            type: "noul",
            instructions: "Is this urgent?",
            criteria: { true: "urgent", false: "routine" },
          },
          "criteria kept",
        );
      },
    ],
    [
      "DECIDE dialect system-one: choice and score questions pass through unchanged",
      () => {
        const question = {
          type: "choice" as const,
          instructions: "Which team?",
          criteria: { billing: "money" },
        };
        expectEq(
          dialect.encodeQuestion(question),
          question,
          "the same object comes back",
        );
      },
    ],
    [
      "DECIDE dialect system-one: noul and boolean answers both read, noul field first",
      () => {
        const reading = dialect.readAnswers(
          {
            answers: {
              a: { type: "noul", noul: 0.9 },
              b: { type: "boolean", probability: 0.2 },
            },
          },
          {},
          {},
        );
        same(
          reading,
          {
            answers: {
              a: { type: "boolean", probability: 0.9 },
              b: { type: "boolean", probability: 0.2 },
            },
            dropped: [],
          },
          "both spellings",
        );
      },
    ],
    [
      "DECIDE dialect system-one: choice confidence is its own, then the reported one, then the peak probability",
      () => {
        expectEq(
          confidenceOf(
            dialect.readAnswers(
              { answers: { q: choice(0.55) } },
              { q: 0.9 },
              {},
            ),
            "q",
          ),
          0.55,
          "own wins",
        );
        expectEq(
          confidenceOf(
            dialect.readAnswers({ answers: { q: choice() } }, { q: 0.9 }, {}),
            "q",
          ),
          0.9,
          "reported next",
        );
        expectEq(
          confidenceOf(
            dialect.readAnswers({ answers: { q: choice() } }, {}, {}),
            "q",
          ),
          0.7,
          "peak last",
        );
      },
    ],
    [
      "DECIDE dialect system-one: an unparseable answer is dropped and named, the others are kept",
      () => {
        const score = {
          type: "score",
          score: 1.4,
          legend: { "0": "low", "1": "high" },
          probabilities: { "0": 0.2, "1": 0.8 },
        };
        const reading = dialect.readAnswers(
          {
            answers: {
              s: score,
              noLegend: { ...score, legend: undefined },
              x: { type: "mystery" },
            },
          },
          {},
          {},
        );
        same(
          Object.keys(reading?.answers ?? {}),
          ["s"],
          "only the good answer",
        );
        same(
          reading?.dropped,
          ["noLegend", "x"],
          "both bad ones named, in order",
        );
        expectEq(
          confidenceOf(reading, "s"),
          0.8,
          "score confidence is the peak",
        );
      },
    ],
    [
      "DECIDE dialect system-one: no answers record means no reading",
      () => {
        expectEq(dialect.readAnswers({}, {}, {}), undefined, "missing");
        expectEq(
          dialect.readAnswers({ answers: [] }, {}, {}),
          undefined,
          "array",
        );
        expectEq(
          dialect.readAnswers({ answers: "no" }, {}, {}),
          undefined,
          "string",
        );
      },
    ],
  ];

  for (const [name, run] of cases) {
    try {
      run();
      record(results, name, true);
    } catch (err) {
      record(
        results,
        name,
        false,
        err instanceof Error ? err.message : String(err),
      );
    }
  }
}

// Positive control for the loop below: an empty DECIDE_CATALOG_JSON_ENTRIES (a
// broken codegen, a deleted laya.json, xor.json, subq.json,
// openai-decisions.json or scaledown.json, a generated list that lost its decide entries) fails
// this section instead of passing it trivially. Raise it when another decide
// entry joins the catalog; never lower it.
const MIN_DECIDE_CATALOG_ENTRIES = 5;

async function runDecideCatalogSection(): Promise<void> {
  const { DECIDE_CATALOG_JSON_ENTRIES } =
    await import("../dist/providers/catalog/index.generated.js");
  let planned = 0;
  let ran = 0;
  for (const entry of DECIDE_CATALOG_JSON_ENTRIES) {
    const run = await runDecideProviderContract(entry, { results });
    planned += run.planned;
    ran += run.recorded.length;
  }
  const problem = loopCoverageProblem({
    entries: DECIDE_CATALOG_JSON_ENTRIES.length,
    minEntries: MIN_DECIDE_CATALOG_ENTRIES,
    planned,
    ran,
  });
  record(
    results,
    `DECIDE catalog: loop covered ${DECIDE_CATALOG_JSON_ENTRIES.length} entries and ${ran} cases`,
    problem === undefined,
    problem,
  );
}

// ───────────────────────────────────────────────────────────────────────
// Section: OpenAI Decisions (decide-only; its key is the openai chat provider's)
// ───────────────────────────────────────────────────────────────────────

/**
 * `openai-decisions` reads OPENAI_API_KEY, the key the `openai` chat provider
 * reads, so an ambient key makes it the default decision provider: a last
 * resort, after every provider whose key is its own except ScaleDown, which the
 * owner placed after it (order 8). This section pins that
 * choice and how a host can still name it, configure it and point it
 * elsewhere. The answers in the 200 body are invented stand-ins for the shape,
 * not anything OpenAI's endpoint was seen to return.
 */
const OPENAI_DECISIONS_SPEC = {
  provider: "openai-decisions",
  envVar: "OPENAI_API_KEY",
  baseURLEnvVar: "OPENAI_DECISIONS_BASE_URL",
  modelEnvVar: "OPENAI_DECISIONS_MODEL",
  key: "test-fake-openai-decisions-credential",
  endpoint: "https://api.openai.com/v1/decisions",
};

/** Every variable that can make a decision provider the default one. */
const OPENAI_DECISIONS_ENV = [
  ...new Set([
    ...PERPLEXITY_DECISION_ENV,
    "CLOUDFLARE_API_KEY",
    "CLOUDFLARE_ACCOUNT_ID",
    "CLOUDFLARE_CLEF_BASE_URL",
    "CLOUDFLARE_CLEF_MODEL",
    OPENAI_DECISIONS_SPEC.envVar,
    OPENAI_DECISIONS_SPEC.baseURLEnvVar,
    OPENAI_DECISIONS_SPEC.modelEnvVar,
    // The chat provider's own base URLs: the ambient-key guard reads them.
    "OPENAI_BASE_URL",
    "OPENAI_API_BASE",
  ]),
];

/** Only the OpenAI key set: no other decision provider is configured. */
function resetOpenAIDecisionsEnv(): void {
  for (const name of OPENAI_DECISIONS_ENV) {
    setEnv(name, undefined);
  }
  setEnv(OPENAI_DECISIONS_SPEC.envVar, OPENAI_DECISIONS_SPEC.key);
}

const OPENAI_DECISIONS_ONE_QUESTION = {
  urgent: { type: "boolean", instructions: "Is this urgent?" },
} satisfies DecisionQuestionMap;

function openaiDecisionsRoute(url: string = OPENAI_DECISIONS_SPEC.endpoint) {
  return {
    method: "POST",
    url,
    respond: {
      status: 200,
      headers: { "x-request-id": "req-openai-decisions-stand-in" },
      json: {
        model: "gpt-6-luna",
        answers: [{ type: "predicate", name: "urgent", probability: 0.9 }],
        usage: { input_tokens: 12, output_tokens: 1 },
      },
    },
  };
}

async function openaiDecisionsCase(
  name: string,
  body: () => Promise<void>,
): Promise<void> {
  try {
    await body();
    record(results, name, true);
  } catch (err) {
    record(
      results,
      name,
      false,
      err instanceof Error ? err.message : String(err),
    );
  }
}

async function runOpenAIDecisionsDecide(): Promise<void> {
  const { provider, envVar, baseURLEnvVar, key, endpoint } =
    OPENAI_DECISIONS_SPEC;
  const { NeuroLink, DECISION_PROVIDERS, resolveDefaultDecisionProvider } =
    await import("../dist/index.js");
  const prior = OPENAI_DECISIONS_ENV.map((name) => process.env[name]);
  const decideOne = (nl: InstanceType<typeof NeuroLink>) =>
    nl.decide({
      provider,
      state: "short",
      questions: OPENAI_DECISIONS_ONE_QUESTION,
    });
  try {
    await openaiDecisionsCase(
      "DECIDE openai-decisions: OPENAI_API_KEY alone makes it the default decision provider",
      async () => {
        resetOpenAIDecisionsEnv();
        expectEq(
          resolveDefaultDecisionProvider(),
          provider,
          "the shared key alone selects it",
        );
        await withMocks([openaiDecisionsRoute()], async ({ calls }) => {
          const nl = new NeuroLink({ conversationMemory: { enabled: false } });
          const result = await nl.tryDecide({
            state: "short",
            questions: OPENAI_DECISIONS_ONE_QUESTION,
          });
          expectEq(result?.provider, provider, "chosen without being named");
          const posts = calls.filter((c) => c.method === "POST");
          expectEq(posts.length, 1, "one decision request");
          expectEq(posts[0]?.url, endpoint, "to the public endpoint");
          expectEq(
            posts[0]?.headers.authorization,
            `Bearer ${key}`,
            "with the environment key",
          );
        });
      },
    );

    await openaiDecisionsCase(
      "DECIDE openai-decisions: a key for any provider ahead of it wins",
      async () => {
        const ahead: ReadonlyArray<readonly [string, Record<string, string>]> =
          [
            ["typesafe", { TYPESAFE_API_KEY: "test-fake-typesafe-credential" }],
            [
              "laya",
              {
                LAYA_API_KEY: "test-fake-laya-credential",
                LAYA_BASE_URL: "https://laya.test.example/base",
              },
            ],
            [
              "xor",
              {
                XOR_API_KEY: "test-fake-xor-credential",
                XOR_BASE_URL: "https://xor.test.example/proxy",
              },
            ],
            ["perplexity-decider", { PERPLEXITY_API_KEY: "test-fake-pplx" }],
            [
              "cloudflare-clef",
              {
                CLOUDFLARE_API_KEY: "test-fake-cloudflare-credential",
                CLOUDFLARE_ACCOUNT_ID: "test-account-id",
              },
            ],
          ];
        for (const [expected, vars] of ahead) {
          resetOpenAIDecisionsEnv();
          for (const [name, value] of Object.entries(vars)) {
            setEnv(name, value);
          }
          expectEq(
            resolveDefaultDecisionProvider(),
            expected,
            `${expected} keeps precedence over the shared key`,
          );
        }
        // And the shared key is what remains once those are gone.
        resetOpenAIDecisionsEnv();
        expectEq(
          resolveDefaultDecisionProvider(),
          provider,
          "the shared key alone selects it",
        );
      },
    );

    await openaiDecisionsCase(
      "DECIDE openai-decisions: it is the seventh decision provider, by decideOrder, and only ScaleDown (8) comes after it",
      async () => {
        const index = DECISION_PROVIDERS.findIndex((d) => d.name === provider);
        expectEq(
          index,
          DECISION_PROVIDERS.length - 2,
          "the next to last entry",
        );
        expectEq(
          DECISION_PROVIDERS[DECISION_PROVIDERS.length - 1]?.name,
          "scaledown",
          "scaledown is the entry after it",
        );
        expectEq(DECISION_PROVIDERS[index]?.decideOrder, 7, "order 7");
        expectEq(
          DECISION_PROVIDERS.filter((d) => d.decideOrder === 7).length,
          1,
          "no other provider holds 7",
        );
      },
    );

    await openaiDecisionsCase(
      "DECIDE openai-decisions: the nothing-configured message offers OPENAI_API_KEY",
      async () => {
        for (const name of OPENAI_DECISIONS_ENV) {
          setEnv(name, undefined);
        }
        expectEq(
          resolveDefaultDecisionProvider(),
          undefined,
          "nothing is configured",
        );
        await withMocks([openaiDecisionsRoute()], async ({ calls }) => {
          const nl = new NeuroLink({ conversationMemory: { enabled: false } });
          const failure = await captureDecisionFailure(async () =>
            nl.decide({
              state: "short",
              questions: OPENAI_DECISIONS_ONE_QUESTION,
            }),
          );
          expect(
            failure.message.includes("No decision provider"),
            "a bare decide() finds no provider",
          );
          expect(
            failure.message.includes("OPENAI_API_KEY for openai-decisions"),
            "the message lists the shared key for openai-decisions",
          );
          expectEq(
            calls.filter((c) => c.method === "POST").length,
            0,
            "no request",
          );
        });
      },
    );

    await openaiDecisionsCase(
      "DECIDE openai-decisions: credentials.openai does not configure it, credentials.openaiDecisions does",
      async () => {
        for (const name of OPENAI_DECISIONS_ENV) {
          setEnv(name, undefined);
        }
        expectEq(
          resolveDefaultDecisionProvider({
            openai: { apiKey: "test-fake-chat-credential" },
          }),
          undefined,
          "the chat provider's slice selects nothing",
        );
        expectEq(
          resolveDefaultDecisionProvider({
            openaiDecisions: { apiKey: "test-fake-config-credential" },
          }),
          provider,
          "credentials.openaiDecisions.apiKey alone selects it",
        );
        expectEq(
          resolveDefaultDecisionProvider({
            openaiDecisions: { apiKey: "   " },
          }),
          undefined,
          "a blank key is no key",
        );
        await withMocks([openaiDecisionsRoute()], async ({ calls }) => {
          const nl = new NeuroLink({
            conversationMemory: { enabled: false },
            credentials: { openai: { apiKey: "test-fake-chat-credential" } },
          });
          const named = await captureDecisionFailure(async () => decideOne(nl));
          expectEq(named.kind, "authentication", "naming it still fails");
          expect(
            named.message.includes("OPENAI_API_KEY"),
            "the message names OPENAI_API_KEY",
          );
          expectEq(
            calls.filter((c) => c.method === "POST").length,
            0,
            "no request left the process",
          );
        });
      },
    );

    await openaiDecisionsCase(
      "DECIDE openai-decisions: naming it posts to the public endpoint with the Bearer key",
      async () => {
        resetOpenAIDecisionsEnv();
        setEnv("TYPESAFE_API_KEY", "test-fake-typesafe-credential");
        await withMocks([openaiDecisionsRoute()], async ({ calls }) => {
          const nl = new NeuroLink({ conversationMemory: { enabled: false } });
          const result = await decideOne(nl);
          expectEq(result.provider, provider, "answered by the named provider");
          const posts = calls.filter((c) => c.method === "POST");
          expectEq(posts.length, 1, "one decision request");
          expectEq(posts[0]?.url, endpoint, "default endpoint");
          expectEq(
            posts[0]?.headers.authorization,
            `Bearer ${key}`,
            "Bearer header",
          );
          const body = posts[0]?.bodyJson as {
            model?: string;
            input?: unknown;
            questions?: Array<{ name?: string; type?: string }>;
          };
          expectEq(body.model, "gpt-6-luna", "the default model");
          expectEq(body.input, "short", "the state as the input");
          expectEq(body.questions?.[0]?.name, "urgent", "the question name");
          expectEq(body.questions?.[0]?.type, "predicate", "a predicate");
        });
      },
    );

    await openaiDecisionsCase(
      "DECIDE openai-decisions: the base URL from the environment and from credentials, a trailing /v1/ removed",
      async () => {
        resetOpenAIDecisionsEnv();
        setEnv(baseURLEnvVar, "https://openai.env.example/gw/v1/");
        await withMocks(
          [openaiDecisionsRoute("https://openai.env.example/gw/v1/decisions")],
          async ({ calls }) => {
            await decideOne(
              new NeuroLink({ conversationMemory: { enabled: false } }),
            );
            expectEq(
              calls.find((c) => c.method === "POST")?.url,
              "https://openai.env.example/gw/v1/decisions",
              "endpoint from OPENAI_DECISIONS_BASE_URL, /v1/ removed once",
            );
          },
        );
        await withMocks(
          [
            openaiDecisionsRoute(
              "https://openai.config.example/proxy/v1/decisions",
            ),
          ],
          async ({ calls }) => {
            const nl = new NeuroLink({
              conversationMemory: { enabled: false },
              credentials: {
                openaiDecisions: {
                  apiKey: "test-fake-config-credential",
                  baseURL: "https://openai.config.example/proxy/v1/",
                },
              },
            });
            await decideOne(nl);
            const post = calls.find((c) => c.method === "POST");
            expectEq(
              post?.url,
              "https://openai.config.example/proxy/v1/decisions",
              "endpoint from credentials.openaiDecisions.baseURL",
            );
            expectEq(
              post?.headers.authorization,
              "Bearer test-fake-config-credential",
              "key from credentials.openaiDecisions.apiKey",
            );
          },
        );
      },
    );

    await openaiDecisionsCase(
      "DECIDE openai-decisions: priced on input tokens only, at the rate in the pricing table",
      async () => {
        const { calculateCost } = await import("../dist/index.js");
        const cost = (input: number, output: number): number =>
          calculateCost(provider, "gpt-6-luna", {
            input,
            output,
            total: input + output,
          });
        expect(
          Math.abs(cost(1_000_000, 0) - 0.1) < 1e-12,
          "one million input tokens cost 0.10",
        );
        expectEq(
          cost(1_000_000, 0),
          cost(1_000_000, 500_000),
          "output tokens are not billed",
        );
        expectEq(cost(0, 1_000), 0, "output alone costs nothing");
        expectEq(
          calculateCost(provider, "a-model-the-table-does-not-name", {
            input: 1_000_000,
            output: 0,
            total: 1_000_000,
          }),
          cost(1_000_000, 0),
          "a model the table does not name is priced at the same rate",
        );
      },
    );

    await openaiDecisionsCase(
      "DECIDE openai-decisions: a proxy's price search by model name does not find the Decisions rate",
      async () => {
        // LiteLLM, OpenRouter and openai-compatible search every provider's
        // table by model name, so a table key that is also a chat model name
        // would price that chat model at the Decisions rate, as an exact quote.
        const { calculateCost, hasPricing } = await import("../dist/index.js");
        const usage = { input: 1_000_000, output: 1_000_000, total: 2_000_000 };
        for (const proxy of ["litellm", "openrouter", "openai-compatible"]) {
          expectEq(
            hasPricing(proxy, "gpt-6-luna"),
            false,
            `${proxy}: gpt-6-luna is not priced from the Decisions table`,
          );
          expectEq(
            calculateCost(proxy, "gpt-6-luna", usage),
            0,
            `${proxy}: gpt-6-luna costs nothing to report`,
          );
        }
        expectEq(
          hasPricing("litellm", "gpt-6"),
          false,
          "litellm: gpt-6 does not inherit the Decisions rate by prefix",
        );
        // Positive control: the same proxies do search the tables by name, so
        // the checks above would see a named row if there were one.
        expectEq(
          hasPricing("litellm", "pplx-decider-v1-27b"),
          true,
          "litellm: a model named in another decide table is found",
        );
      },
    );
  } finally {
    OPENAI_DECISIONS_ENV.forEach((name, i) => setEnv(name, prior[i]));
  }
}

// ───────────────────────────────────────────────────────────────────────
// Section: OpenAI Decisions through the public surface
// ───────────────────────────────────────────────────────────────────────

/**
 * Every call here goes through `neurolink.decide()` / `tryDecide()` (or a
 * provider the factory built) against `installMockFetch`. The questions and the
 * answers are the examples on OpenAI's Decisions guide
 * (https://developers.openai.com/api/docs/guides/decisions, saved 2026-10-07),
 * so each can be read against that page. Every reply is a fixture this file
 * builds: nothing here records what the endpoint returned for a real request,
 * and the error bodies are stand-ins for their status classes.
 */
const OD_DAMAGE_TEXT =
  "Does the product have visible damage, such as a crack, tear, or dent? Ignore shadows and damage to the packaging.";
const OD_DEPARTMENT_TEXT = "Which department should handle this complaint?";
const OD_SEVERITY_TEXT = "How severe is this issue?";
const OD_RUBRIC = {
  billing: "Payments, invoices, and refunds.",
  technical: "Problems using the product.",
  shipping: "Delivery and tracking.",
  other: "Requests outside these categories.",
} as const;
const OD_LEVELS = [
  "Appearance only; no lost functionality.",
  "A task fails, but another way works.",
  "A task fails with no workaround.",
] as const;

const OD_QUESTIONS = {
  visible_damage: { type: "boolean", instructions: OD_DAMAGE_TEXT },
  department: {
    type: "choice",
    instructions: OD_DEPARTMENT_TEXT,
    criteria: OD_RUBRIC,
  },
  severity: {
    type: "score",
    instructions: OD_SEVERITY_TEXT,
    criteria: OD_LEVELS,
  },
} satisfies DecisionQuestionMap;

/** The three guide questions as the wire must carry them. */
const OD_WIRE_QUESTIONS = {
  visible_damage: {
    type: "predicate",
    name: "visible_damage",
    instructions: OD_DAMAGE_TEXT,
  },
  department: {
    type: "choice",
    name: "department",
    instructions: OD_DEPARTMENT_TEXT,
    choices: Object.entries(OD_RUBRIC).map(([value, description]) => ({
      value,
      description,
    })),
  },
  severity: {
    type: "score",
    name: "severity",
    instructions: OD_SEVERITY_TEXT,
    levels: OD_LEVELS.map((description, index) => ({
      label: String(index),
      description,
    })),
  },
};

const OD_PREDICATE_ANSWER = {
  type: "predicate",
  name: "visible_damage",
  probability: 0.92,
};
const OD_CHOICE_ANSWER = {
  type: "choice",
  name: "department",
  choice: "billing",
  probabilities: [
    { value: "billing", probability: 0.95 },
    { value: "technical", probability: 0.02 },
    { value: "shipping", probability: 0.01 },
    { value: "other", probability: 0.02 },
  ],
  confidence: 0.93,
};
const OD_SCORE_ANSWER = {
  type: "score",
  name: "severity",
  score: 1.1,
  probabilities: [
    { value: 0, label: "Cosmetic", probability: 0.1 },
    { value: 1, label: "Workaround available", probability: 0.7 },
    { value: 2, label: "Fully blocked", probability: 0.2 },
  ],
  confidence: 0.55,
};

/** What each guide answer must read back as. */
const OD_EXPECTED = {
  visible_damage: { type: "boolean", probability: 0.92 },
  department: {
    type: "choice",
    choice: "billing",
    confidence: 0.93,
    probabilities: {
      billing: 0.95,
      technical: 0.02,
      shipping: 0.01,
      other: 0.02,
    },
  },
  severity: {
    type: "score",
    score: 1.1,
    confidence: 0.55,
    legend: { "0": OD_LEVELS[0], "1": OD_LEVELS[1], "2": OD_LEVELS[2] },
    probabilities: { "0": 0.1, "1": 0.7, "2": 0.2 },
  },
};

type OdSentBody = {
  model?: string;
  input?: unknown;
  questions?: Array<Record<string, unknown>>;
};

const odBodyOf = (call: { bodyJson: unknown } | undefined): OdSentBody =>
  (call?.bodyJson ?? {}) as OdSentBody;

type OdReplyOptions = {
  /** `null` leaves `model` out of the body. */
  model?: string | null;
  usage?: unknown;
  headers?: Record<string, string>;
  url?: string;
};

/** A 200 in the shape of the guide's responses, answering with `answers`. */
function odReply(answers: unknown, options: OdReplyOptions = {}) {
  return {
    method: "POST",
    url: options.url ?? OPENAI_DECISIONS_SPEC.endpoint,
    respond: {
      status: 200,
      headers: options.headers ?? {
        "x-request-id": "req-openai-decisions-stand-in",
      },
      json: {
        ...(options.model === null
          ? {}
          : { model: options.model ?? "gpt-6-luna" }),
        answers,
        usage: options.usage ?? {
          input_tokens: 31,
          output_tokens: 0,
          total_tokens: 31,
        },
      },
    },
  };
}

type OdFailure = {
  kind: string | undefined;
  status: number | undefined;
  retryable: boolean | undefined;
  message: string;
};

/** Run a call expected to fail; return how the engine classified it. */
async function odFailureOf(run: () => Promise<unknown>): Promise<OdFailure> {
  try {
    await run();
  } catch (error) {
    const cause = (
      error as {
        cause?: { kind?: string; status?: number; retryable?: boolean };
      }
    ).cause;
    return {
      kind: cause?.kind,
      status: cause?.status,
      retryable: cause?.retryable,
      message: error instanceof Error ? error.message : "",
    };
  }
  return {
    kind: undefined,
    status: undefined,
    retryable: undefined,
    message: "",
  };
}

const OD_OPTION_COUNTS = [77, 151] as const;

/** Option names that cannot be read as integers, so insertion order is kept. */
const odOptions = (count: number): string[] =>
  Array.from(
    { length: count },
    (_, i) => `option-${String(i).padStart(3, "0")}`,
  );

/** `count` yes/no questions, named so insertion order is kept. */
const odManyQuestions = (count: number): DecisionQuestionMap =>
  Object.fromEntries(
    Array.from(
      { length: count },
      (_, i): [string, DecisionQuestionMap[string]] => [
        `q-${String(i).padStart(3, "0")}`,
        { type: "boolean", instructions: `Is item ${i} urgent?` },
      ],
    ),
  );

/** The ids a sent request names, in the order it carries them. */
const odSentNames = (call: { bodyJson: unknown } | undefined): string[] =>
  (odBodyOf(call).questions ?? []).map((question) => String(question.name));

/**
 * Answers every question the request carries, so each batch of a split request
 * is judged by what it was sent. A request for which `refuse` is true gets a
 * 400 in the shape of the stand-in errors above.
 */
function odAnswerWhatIsAsked(refuse?: (names: string[]) => boolean) {
  return {
    method: "POST",
    url: OPENAI_DECISIONS_SPEC.endpoint,
    respond: (call: { bodyJson: unknown }) => {
      const names = odSentNames(call);
      if (refuse?.(names)) {
        return {
          status: 400,
          json: {
            error: {
              message: "stand-in: too many questions",
              type: "invalid_request_error",
              code: null,
            },
          },
        };
      }
      return {
        status: 200,
        headers: { "x-request-id": `req-${names[0]}` },
        json: {
          model: "gpt-6-luna",
          answers: names.map((name) => ({
            type: "predicate",
            name,
            probability: 0.8,
          })),
          usage: { input_tokens: 10, output_tokens: 0, total_tokens: 10 },
        },
      };
    },
  };
}

async function runOpenAIDecisionsSurface(): Promise<void> {
  const { provider, key, endpoint } = OPENAI_DECISIONS_SPEC;
  const { NeuroLink, AIProviderFactory, calculateCost, logger } =
    await import("../dist/index.js");
  const prior = OPENAI_DECISIONS_ENV.map((name) => process.env[name]);
  const fresh = () => new NeuroLink({ conversationMemory: { enabled: false } });
  const oneQuestion = { visible_damage: OD_QUESTIONS.visible_damage };

  /** Warnings the engine logs, read from the logger the package itself uses. */
  const withWarnings = async (run: () => Promise<void>): Promise<string[]> => {
    const priorDebug = process.env.NEUROLINK_DEBUG;
    const priorWarn = console.warn;
    // The logger has no level getter; it takes NEUROLINK_LOG_LEVEL at load, else info.
    const loadLevel = process.env.NEUROLINK_LOG_LEVEL?.toLowerCase();
    const priorLevel =
      loadLevel === "debug" || loadLevel === "warn" || loadLevel === "error"
        ? loadLevel
        : "info";
    try {
      setEnv("NEUROLINK_DEBUG", "true");
      logger.setLogLevel("warn");
      logger.clearLogs();
      console.warn = () => undefined;
      await run();
      return logger.getLogs("warn").map((entry) => entry.message);
    } finally {
      console.warn = priorWarn;
      logger.setLogLevel(priorLevel);
      logger.clearLogs();
      setEnv("NEUROLINK_DEBUG", priorDebug);
    }
  };

  try {
    // ── The guide's three examples, one question each ──
    const guideRows = [
      {
        label: "yes/no",
        name: "visible_damage",
        answer: OD_PREDICATE_ANSWER,
        expected: OD_EXPECTED.visible_damage,
      },
      {
        label: "choice",
        name: "department",
        answer: OD_CHOICE_ANSWER,
        expected: OD_EXPECTED.department,
      },
      {
        label: "score",
        name: "severity",
        answer: OD_SCORE_ANSWER,
        expected: OD_EXPECTED.severity,
      },
    ] as const;
    for (const row of guideRows) {
      await openaiDecisionsCase(
        `DECIDE openai-decisions: the guide's ${row.label} example is sent and read back exactly`,
        async () => {
          resetOpenAIDecisionsEnv();
          await withMocks([odReply([row.answer])], async ({ calls }) => {
            const result = await fresh().decide({
              provider,
              state: "I was charged twice for my order.",
              questions: { [row.name]: OD_QUESTIONS[row.name] },
            });
            expectEq(
              calls.filter((c) => c.method === "POST").length,
              1,
              "one request",
            );
            const body = odBodyOf(calls.find((c) => c.method === "POST"));
            expect(
              sameJson(Object.keys(body).sort(), [
                "input",
                "model",
                "questions",
              ]),
              "the body holds the model, the input and the questions, nothing else",
            );
            expectEq(body.model, "gpt-6-luna", "the default model");
            expectEq(
              body.input,
              "I was charged twice for my order.",
              "the state is the input",
            );
            expect(
              sameJson(body.questions, [OD_WIRE_QUESTIONS[row.name]]),
              "the question reached the wire as the guide writes it, named",
            );
            expectEq(result.provider, provider, "the provider that answered");
            expect(
              sameJson(Object.keys(result.answers), [row.name]),
              "one answer, under the question's name",
            );
            expect(
              sameJson(result.answers[row.name], row.expected),
              "the answer reads back as the guide's numbers",
            );
          });
        },
      );
    }

    await openaiDecisionsCase(
      "DECIDE openai-decisions: three questions in one request, answered in another order, are read by name; tryDecide agrees",
      async () => {
        resetOpenAIDecisionsEnv();
        await withMocks(
          [odReply([OD_SCORE_ANSWER, OD_PREDICATE_ANSWER, OD_CHOICE_ANSWER])],
          async ({ calls }) => {
            const nl = fresh();
            const request = {
              state: "I was charged twice for my order.",
              questions: OD_QUESTIONS,
            };
            const result = await nl.decide({ provider, ...request });
            const body = odBodyOf(calls.find((c) => c.method === "POST"));
            expect(
              sameJson(body.questions, [
                OD_WIRE_QUESTIONS.visible_damage,
                OD_WIRE_QUESTIONS.department,
                OD_WIRE_QUESTIONS.severity,
              ]),
              "the questions went out in the order they were asked",
            );
            expect(
              sameJson(result.answers, OD_EXPECTED),
              "each answer is under its own question, whatever order the server used",
            );
            const viaTry = await nl.tryDecide({ provider, ...request });
            expect(viaTry !== null, "tryDecide answered");
            expect(
              sameJson(viaTry?.answers, OD_EXPECTED),
              "tryDecide reads the same answers",
            );
            expectEq(viaTry?.provider, provider, "from the same provider");
          },
        );
      },
    );

    // ── Many options: the request carries every one, in order ──
    for (const count of OD_OPTION_COUNTS) {
      await openaiDecisionsCase(
        `DECIDE openai-decisions: a ${count}-option choice is sent in full and in order, and read back complete`,
        async () => {
          resetOpenAIDecisionsEnv();
          const options = odOptions(count);
          const peak = Math.floor(count * 0.6);
          const rest = 0.5 / (count - 1);
          const expectedProbabilities = Object.fromEntries(
            options.map((option, i) => [option, i === peak ? 0.5 : rest]),
          );
          // The server's list is in the opposite order to the request.
          const served = [...options].reverse().map((value) => ({
            value,
            probability: expectedProbabilities[value],
          }));
          await withMocks(
            [
              odReply([
                {
                  type: "choice",
                  name: "pick",
                  choice: options[peak],
                  probabilities: served,
                  confidence: 0.62,
                },
              ]),
            ],
            async ({ calls }) => {
              const result = await fresh().decide({
                provider,
                state: "A long list of possible categories.",
                questions: {
                  pick: {
                    type: "choice",
                    instructions: "Which category fits?",
                    criteria: Object.fromEntries(
                      options.map((option) => [
                        option,
                        `Applies to ${option}.`,
                      ]),
                    ),
                  },
                },
              });
              const sent = odBodyOf(calls.find((c) => c.method === "POST"))
                .questions?.[0] as
                | { choices?: Array<{ value?: string; description?: string }> }
                | undefined;
              expectEq(
                sent?.choices?.length,
                count,
                "every option is on the wire",
              );
              expect(
                sameJson(
                  sent?.choices?.map((c) => c.value),
                  options,
                ),
                "the option values are in the order they were given",
              );
              expect(
                sameJson(
                  sent?.choices?.map((c) => c.description),
                  options.map((option) => `Applies to ${option}.`),
                ),
                "each description stays with its own option",
              );
              const answer = result.answers.pick;
              expectEq(answer?.type, "choice", "a choice answer");
              if (answer?.type !== "choice") {
                return;
              }
              expectEq(answer.choice, options[peak], "the chosen option");
              expectEq(answer.confidence, 0.62, "the reported confidence");
              expect(
                sameJson(Object.keys(answer.probabilities), options),
                "the distribution comes back complete and in the order asked",
              );
              expect(
                sameJson(answer.probabilities, expectedProbabilities),
                "every probability is the one the server gave that option",
              );
            },
          );
        },
      );
    }

    // ── An image ──
    await openaiDecisionsCase(
      "DECIDE openai-decisions: one image arrives as an input_image part with a data URL beside the text",
      async () => {
        resetOpenAIDecisionsEnv();
        const png = readFileSync(
          fileURLToPath(
            new URL(
              "./fixtures/decide/perplexity-decider/blue.png",
              import.meta.url,
            ),
          ),
        );
        const url = `data:image/png;base64,${png.toString("base64")}`;
        await withMocks([odReply([OD_PREDICATE_ANSWER])], async ({ calls }) => {
          const result = await fresh().decide({
            provider,
            state: "Inspect the product in this photo.",
            questions: oneQuestion,
            images: [png],
          });
          const body = odBodyOf(calls.find((c) => c.method === "POST"));
          expect(
            sameJson(body.input, [
              {
                role: "user",
                content: [
                  {
                    type: "input_text",
                    text: "Inspect the product in this photo.",
                  },
                  { type: "input_image", image_url: url },
                ],
              },
            ]),
            "one user message: the text part, then the image part with no extra field",
          );
          expect(
            sameJson(Object.keys(body).sort(), ["input", "model", "questions"]),
            "the image rides in the input, not in a field of its own",
          );
          expect(
            sameJson(result.answers.visible_damage, OD_EXPECTED.visible_damage),
            "the answer reads back",
          );
          expectEq(
            result.mediaBytes,
            url.length,
            "the media bytes are the data URL's length",
          );
        });
      },
    );

    // ── Answers the engine refuses to repair ──
    await openaiDecisionsCase(
      "DECIDE openai-decisions: a refusal comes back as an absent answer and a logged warning, the others arrive",
      async () => {
        resetOpenAIDecisionsEnv();
        await withMocks(
          [
            odReply([
              OD_PREDICATE_ANSWER,
              { type: "refusal", name: "department" },
              OD_SCORE_ANSWER,
            ]),
          ],
          async () => {
            let answers: Record<string, unknown> = {};
            const warnings = await withWarnings(async () => {
              answers = (
                await fresh().decide({
                  provider,
                  state: "I was charged twice for my order.",
                  questions: OD_QUESTIONS,
                })
              ).answers;
            });
            expect(
              sameJson(Object.keys(answers).sort(), [
                "severity",
                "visible_damage",
              ]),
              "the refused question has no answer; the other two are present",
            );
            expect(
              !("department" in answers),
              "no placeholder for the refusal",
            );
            expect(
              sameJson(answers.visible_damage, OD_EXPECTED.visible_damage) &&
                sameJson(answers.severity, OD_EXPECTED.severity),
              "the answers that arrived are the guide's",
            );
            expect(
              warnings.includes(
                'OpenAI Decisions: the model declined to answer "department"',
              ),
              "the refusal is logged by question name",
            );
            expect(
              !warnings.some((line) => line.includes("dropped unparseable")),
              "a refusal is not reported as an unparseable answer",
            );
          },
        );
      },
    );

    await openaiDecisionsCase(
      "DECIDE openai-decisions: a missing answer and a distribution that does not sum to 1 are absent, the rest survive, the bad one is warned about",
      async () => {
        resetOpenAIDecisionsEnv();
        const underweight = {
          ...OD_CHOICE_ANSWER,
          probabilities: [
            { value: "billing", probability: 0.85 },
            { value: "technical", probability: 0.02 },
            { value: "shipping", probability: 0.01 },
            { value: "other", probability: 0.02 },
          ],
        };
        // `severity` is not answered at all, and `department` sums to 0.9.
        await withMocks(
          [odReply([OD_PREDICATE_ANSWER, underweight])],
          async () => {
            let answers: Record<string, unknown> = {};
            const warnings = await withWarnings(async () => {
              answers = (
                await fresh().decide({
                  provider,
                  state: "I was charged twice for my order.",
                  questions: OD_QUESTIONS,
                })
              ).answers;
            });
            expect(
              sameJson(Object.keys(answers), ["visible_damage"]),
              "only the sound answer is returned",
            );
            expect(
              sameJson(answers.visible_damage, OD_EXPECTED.visible_damage),
              "and it is the guide's",
            );
            expect(
              warnings.includes(
                'OpenAI Decisions: dropped unparseable answer "department"',
              ),
              "the distribution that does not sum to 1 is named in a warning",
            );
            expect(
              !warnings.some((line) => line.includes('"severity"')),
              "an answer the server never sent is not reported as a dropped one",
            );
          },
        );
      },
    );

    // ── Model, usage, request id, price ──
    await openaiDecisionsCase(
      "DECIDE openai-decisions: the model sent, a per-call model, and the model, usage and request id read back",
      async () => {
        resetOpenAIDecisionsEnv();
        await withMocks(
          [
            odReply([OD_PREDICATE_ANSWER], {
              model: "stand-in-reported-model",
              usage: {
                input_tokens: 250_000,
                output_tokens: 7,
                total_tokens: 250_007,
              },
              headers: { "x-request-id": "req-surface-1" },
            }),
          ],
          async ({ calls }) => {
            const nl = fresh();
            const result = await nl.decide({
              provider,
              state: "short",
              questions: oneQuestion,
            });
            expectEq(
              odBodyOf(calls[calls.length - 1]).model,
              "gpt-6-luna",
              "the default model is sent",
            );
            expectEq(
              result.model,
              "stand-in-reported-model",
              "the model the reply names",
            );
            expectEq(result.usage.inputTokens, 250_000, "input tokens");
            expectEq(result.usage.outputTokens, 7, "output tokens");
            expectEq(
              result.requestId,
              "req-surface-1",
              "the x-request-id header",
            );
            // The price of that decision, as decide() computes it.
            const cost = calculateCost(result.provider, result.model, {
              input: result.usage.inputTokens,
              output: result.usage.outputTokens,
              total: result.usage.inputTokens + result.usage.outputTokens,
            });
            expect(
              Math.abs(cost - (250_000 * 0.1) / 1_000_000) < 1e-12,
              "250,000 input tokens cost 250,000 x 0.10 / 1e6 and the 7 output tokens nothing",
            );
            await nl.decide({
              provider,
              model: "stand-in-per-call-model",
              state: "short",
              questions: oneQuestion,
            });
            expectEq(
              odBodyOf(calls[calls.length - 1]).model,
              "stand-in-per-call-model",
              "a per-call model is the one sent",
            );
          },
        );
        // No `model` in the reply: the model asked for is the one reported.
        await withMocks(
          [odReply([OD_PREDICATE_ANSWER], { model: null })],
          async () => {
            const result = await fresh().decide({
              provider,
              model: "stand-in-per-call-model",
              state: "short",
              questions: oneQuestion,
            });
            expectEq(
              result.model,
              "stand-in-per-call-model",
              "with no model in the reply the requested one is reported",
            );
          },
        );
      },
    );

    await openaiDecisionsCase(
      "DECIDE openai-decisions: OPENAI_DECISIONS_MODEL names the model, and the chat provider's variables do not",
      async () => {
        // The registry reads OPENAI_DECISIONS_MODEL once, when providers register,
        // so a value set in this process arrives too late. A fresh process is the
        // only way to give it one first, and the only way to show that the chat
        // provider's OPENAI_MODEL and OPENAI_BASE_URL reach neither the model nor
        // the route.
        const distUrl = new URL("../dist/index.js", import.meta.url).href;
        const child = `
          const sent = [];
          const urls = [];
          globalThis.fetch = async (input, init) => {
            const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
            if (!url.includes("/v1/decisions")) {
              throw new Error("no route for a request this test does not expect");
            }
            const body = JSON.parse(String(init.body));
            sent.push(body.model);
            urls.push(url);
            return new Response(
              JSON.stringify({ answers: [{ type: "predicate", name: "urgent", probability: 0.5 }], usage: { input_tokens: 1, output_tokens: 0 } }),
              { status: 200, headers: { "content-type": "application/json" } },
            );
          };
          const { NeuroLink } = await import(${JSON.stringify(distUrl)});
          const nl = new NeuroLink({ conversationMemory: { enabled: false } });
          const questions = { urgent: { type: "boolean", instructions: "Is this urgent?" } };
          const named = await nl.decide({ provider: "openai-decisions", state: "short", questions });
          const perCall = await nl.decide({ provider: "openai-decisions", model: "stand-in-per-call-model", state: "short", questions });
          console.log("RESULT:" + JSON.stringify({ sent, urls, named: named.model, perCall: perCall.model }));
          process.exit(0);
        `;
        /** One fresh process, with the chat provider's own variables set from the start. */
        const runChild = (decisions: Record<string, string>) => {
          const res = spawnSync(
            process.execPath,
            ["--input-type=module", "-e", child],
            {
              encoding: "utf8",
              timeout: 60_000,
              killSignal: "SIGKILL",
              env: {
                ...Object.fromEntries(
                  Object.entries(process.env).filter(
                    ([name]) => !OPENAI_DECISIONS_ENV.includes(name),
                  ),
                ),
                OPENAI_API_KEY: key,
                ...decisions,
                OPENAI_MODEL: "stand-in-chat-model",
                OPENAI_BASE_URL: "https://chat.text.example/v1",
              },
            },
          );
          // The detail stays free of the child's output: only its status is quoted.
          expectEq(
            res.status,
            0,
            `the child exited cleanly (signal ${res.signal})`,
          );
          const line = (res.stdout ?? "")
            .split("\n")
            .find((l) => l.startsWith("RESULT:"));
          expect(line !== undefined, "the child reported its requests");
          return JSON.parse((line ?? "RESULT:{}").slice("RESULT:".length)) as {
            sent?: string[];
            urls?: string[];
            named?: string;
            perCall?: string;
          };
        };

        const withVariable = runChild({
          OPENAI_DECISIONS_MODEL: "stand-in-env-model",
        });
        expect(
          sameJson(withVariable.sent, [
            "stand-in-env-model",
            "stand-in-per-call-model",
          ]),
          "the variable named the model on the wire, and a per-call model still won",
        );
        expect(
          sameJson(withVariable.urls, [endpoint, endpoint]),
          "OPENAI_BASE_URL did not move the route",
        );
        expectEq(
          withVariable.named,
          "stand-in-env-model",
          "the result carries that model",
        );
        expectEq(
          withVariable.perCall,
          "stand-in-per-call-model",
          "and the per-call one",
        );

        const withoutVariable = runChild({});
        expect(
          sameJson(withoutVariable.sent, [
            "gpt-6-luna",
            "stand-in-per-call-model",
          ]),
          "with no OPENAI_DECISIONS_MODEL the default is sent, not OPENAI_MODEL",
        );
        expect(
          sameJson(withoutVariable.urls, [endpoint, endpoint]),
          "OPENAI_BASE_URL did not move the route without the model variable either",
        );
      },
    );

    // ── Credentials: per call over the instance over the environment ──
    await openaiDecisionsCase(
      "DECIDE openai-decisions: a per-call key beats the instance's, which beats OPENAI_API_KEY; a per-call openai slice changes nothing",
      async () => {
        resetOpenAIDecisionsEnv();
        const instanceKey = "test-fake-instance-credential";
        const callKey = "test-fake-per-call-credential";
        await withMocks(
          [
            odReply([OD_PREDICATE_ANSWER], {
              url: "https://openai.per-call.example/gw/v1/decisions",
            }),
            odReply([OD_PREDICATE_ANSWER]),
          ],
          async ({ calls }) => {
            const bearerOf = (): string | undefined =>
              calls[calls.length - 1]?.headers.authorization;
            const ask = (
              nl: InstanceType<typeof NeuroLink>,
              credentials?: NeurolinkCredentials,
            ) =>
              nl.decide({
                provider,
                state: "short",
                questions: oneQuestion,
                credentials,
              });

            await ask(fresh());
            expectEq(bearerOf(), `Bearer ${key}`, "the environment key alone");

            const withInstance = new NeuroLink({
              conversationMemory: { enabled: false },
              credentials: { openaiDecisions: { apiKey: instanceKey } },
            });
            await ask(withInstance);
            expectEq(
              bearerOf(),
              `Bearer ${instanceKey}`,
              "the instance beats the environment",
            );

            await ask(withInstance, { openaiDecisions: { apiKey: callKey } });
            expectEq(
              bearerOf(),
              `Bearer ${callKey}`,
              "the call beats the instance",
            );
            expectEq(
              calls[calls.length - 1]?.url,
              endpoint,
              "to the default route",
            );

            await ask(withInstance, {
              openaiDecisions: {
                apiKey: callKey,
                baseURL: "https://openai.per-call.example/gw/v1/",
              },
            });
            expectEq(
              calls[calls.length - 1]?.url,
              "https://openai.per-call.example/gw/v1/decisions",
              "a per-call base URL moves the route, /v1/ removed once",
            );

            await ask(withInstance, {
              openai: { apiKey: "test-fake-chat-credential" },
            });
            expectEq(
              bearerOf(),
              `Bearer ${instanceKey}`,
              "the chat provider's slice reaches nothing here",
            );
          },
        );
      },
    );

    // ── Errors, classified as the entry says ──
    const errorRows = [
      {
        status: 400,
        kind: "invalid_request",
        requests: 1,
        retryAfter: "0",
        body: {
          error: {
            message: "stand-in: a parameter is missing",
            type: "invalid_request_error",
            param: "questions",
            code: null,
          },
        },
      },
      {
        status: 401,
        kind: "authentication",
        requests: 1,
        retryAfter: "0",
        body: {
          error: {
            message: "stand-in: the key was not accepted",
            type: "invalid_request_error",
            code: "invalid_api_key",
          },
        },
      },
      {
        status: 403,
        kind: "invalid_request",
        requests: 1,
        retryAfter: "0",
        body: {
          error: {
            message: "stand-in: not available here",
            type: "invalid_request_error",
            code: null,
          },
        },
      },
      {
        status: 429,
        kind: "rate_limit",
        requests: 1,
        retryAfter: "1",
        body: {
          error: {
            message: "stand-in: slow down",
            type: "requests",
            code: "rate_limit_exceeded",
          },
        },
      },
      {
        status: 500,
        kind: "server",
        requests: 2,
        retryAfter: "0",
        body: {
          error: {
            message: "stand-in: the server failed",
            type: "server_error",
            code: null,
          },
        },
      },
    ] as const;
    for (const row of errorRows) {
      await openaiDecisionsCase(
        `DECIDE openai-decisions: HTTP ${row.status} is ${row.kind}, sent ${row.requests === 1 ? "once" : `${row.requests} times`}, and its own message is kept`,
        async () => {
          resetOpenAIDecisionsEnv();
          await withMocks(
            [
              {
                method: "POST",
                url: endpoint,
                respond: {
                  status: row.status,
                  headers: {
                    "retry-after": row.retryAfter,
                    "x-request-id": "req-error-stand-in",
                  },
                  json: row.body,
                },
              },
            ],
            async ({ calls }) => {
              const failure = await odFailureOf(() =>
                fresh().decide({
                  provider,
                  state: "short",
                  questions: oneQuestion,
                }),
              );
              expectEq(failure.kind, row.kind, "the classification");
              expectEq(failure.status, row.status, "the status is kept");
              expectEq(
                calls.filter((c) => c.method === "POST").length,
                row.requests,
                "how often it was sent",
              );
              expect(
                failure.message.includes(row.body.error.message),
                "the server's own message is in the failure",
              );
              expect(
                !failure.message.includes(key),
                "the key is never in the failure",
              );
            },
          );
        },
      );
    }

    await openaiDecisionsCase(
      "DECIDE openai-decisions: a 401 latches the provider instance, a 403 does not",
      async () => {
        resetOpenAIDecisionsEnv();
        const ask = (
          instance: Awaited<
            ReturnType<typeof AIProviderFactory.createProvider>
          >,
        ) =>
          instance.decide!({
            state: "short",
            questions: oneQuestion,
          });
        const reply = (status: number, message: string) => ({
          method: "POST",
          url: endpoint,
          respond: {
            status,
            json: {
              error: { message, type: "invalid_request_error", code: null },
            },
          },
        });

        await withMocks(
          [reply(401, "stand-in: the key was not accepted")],
          async ({ calls }) => {
            const instance = await AIProviderFactory.createProvider(
              provider,
              undefined,
              false,
            );
            const first = await odFailureOf(() => ask(instance));
            expectEq(first.kind, "authentication", "the 401");
            const second = await odFailureOf(() => ask(instance));
            expectEq(
              second.kind,
              "authentication",
              "the instance refuses the next call",
            );
            expectEq(
              calls.filter((c) => c.method === "POST").length,
              1,
              "and sends nothing for it",
            );
          },
        );

        let status = 403;
        await withMocks(
          [
            {
              method: "POST",
              url: endpoint,
              respond: (): {
                status: number;
                json: unknown;
              } =>
                status === 403
                  ? {
                      status,
                      json: {
                        error: {
                          message: "stand-in: not available here",
                          type: "invalid_request_error",
                          code: null,
                        },
                      },
                    }
                  : {
                      status,
                      json: {
                        model: "gpt-6-luna",
                        answers: [OD_PREDICATE_ANSWER],
                        usage: { input_tokens: 1, output_tokens: 0 },
                      },
                    },
            },
          ],
          async ({ calls }) => {
            const instance = await AIProviderFactory.createProvider(
              provider,
              undefined,
              false,
            );
            const first = await odFailureOf(() => ask(instance));
            expectEq(
              first.kind,
              "invalid_request",
              "the 403 is not an authentication failure",
            );
            status = 200;
            const second = await ask(instance);
            expect(
              sameJson(
                second.answers.visible_damage,
                OD_EXPECTED.visible_damage,
              ),
              "the same instance answers the next call",
            );
            expectEq(
              calls.filter((c) => c.method === "POST").length,
              2,
              "both calls reached the wire",
            );
          },
        );
      },
    );

    // ── The 200-question cap: split by tryDecide, left to the server by decide ──
    // 200 is the figure in OpenAI's Python SDK (Ask 1–200 questions about the
    // input), read from documentation. Nothing here, and no live request, shows
    // what the endpoint does with 201: the stand-in answers whatever it is sent.
    await openaiDecisionsCase(
      "DECIDE openai-decisions: the question cap is reported as 200, and advisory",
      async () => {
        resetOpenAIDecisionsEnv();
        const reading = fresh().decisionLimits({ provider });
        expectEq(reading?.maxQuestions, 200, "the documented question cap");
        expectEq(reading?.enforcedLocally, false, "advisory, not enforced");
        expectEq(
          reading?.maxStateTokens,
          922000,
          "the state window is as it was",
        );
      },
    );

    for (const [count, sizes] of [
      [200, [200]],
      [201, [200, 1]],
      [250, [200, 50]],
      [450, [200, 200, 50]],
    ] as const) {
      await openaiDecisionsCase(
        `DECIDE openai-decisions: tryDecide with ${count} questions sends ${sizes.length} request(s) of ${sizes.join(" + ")}, in order, and joins the answers`,
        async () => {
          resetOpenAIDecisionsEnv();
          const questions = odManyQuestions(count);
          const names = Object.keys(questions);
          await withMocks([odAnswerWhatIsAsked()], async ({ calls }) => {
            const result = await fresh().tryDecide({
              provider,
              state: "A long conversation.",
              questions,
            });
            const sent = calls.filter((c) => c.method === "POST");
            expectEq(sent.length, sizes.length, "requests sent");
            // Batches run side by side, so judge each by its first question
            // and not by the order the calls reached the wire.
            const ordered = [...sent].sort((a, b) =>
              odSentNames(a)[0].localeCompare(odSentNames(b)[0]),
            );
            expect(
              sameJson(
                ordered.map((c) => odSentNames(c).length),
                sizes,
              ),
              `the batch sizes are ${sizes.join(", ")}`,
            );
            expect(
              sameJson(ordered.flatMap(odSentNames), names),
              "every question is sent once, in the order given",
            );
            for (const call of ordered) {
              expectEq(
                odBodyOf(call).input,
                "A long conversation.",
                "the state travels with every batch",
              );
            }
            expect(result !== null, "the joined result is not null");
            expect(
              sameJson(Object.keys(result?.answers ?? {}), names),
              "every question has an answer, in the order given",
            );
            expectEq(
              result?.usage.inputTokens,
              10 * sizes.length,
              "usage is summed over the batches",
            );
            expectEq(
              result?.requestId,
              ordered.map((c) => `req-${odSentNames(c)[0]}`).join(","),
              "the request ids of the batches are listed",
            );
          });
        },
      );
    }

    await openaiDecisionsCase(
      "DECIDE openai-decisions: a batch the endpoint refuses loses only its own questions",
      async () => {
        resetOpenAIDecisionsEnv();
        const questions = odManyQuestions(250);
        const names = Object.keys(questions);
        await withMocks(
          [odAnswerWhatIsAsked((asked) => asked.length < 200)],
          async ({ calls }) => {
            const result = await fresh().tryDecide({
              provider,
              state: "A long conversation.",
              questions,
            });
            expectEq(
              calls.filter((c) => c.method === "POST").length,
              2,
              "both batches were sent, the refused one once",
            );
            expect(
              sameJson(Object.keys(result?.answers ?? {}), names.slice(0, 200)),
              "the first 200 answers survive; the last 50 have none",
            );
          },
        );
      },
    );

    await openaiDecisionsCase(
      "DECIDE openai-decisions: a direct decide() with 201 questions is not refused locally, the server is left to answer it",
      async () => {
        resetOpenAIDecisionsEnv();
        const questions = odManyQuestions(201);
        await withMocks([odAnswerWhatIsAsked()], async ({ calls }) => {
          const result = await fresh().decide({
            provider,
            state: "A long conversation.",
            questions,
          });
          const sent = calls.filter((c) => c.method === "POST");
          expectEq(sent.length, 1, "one request, not split");
          expectEq(odSentNames(sent[0]).length, 201, "all 201 questions sent");
          expectEq(Object.keys(result.answers).length, 201, "all 201 answered");
        });
      },
    );
  } finally {
    OPENAI_DECISIONS_ENV.forEach((name, i) => setEnv(name, prior[i]));
  }
}

/**
 * `OPENAI_API_KEY` is also the key of every OpenAI-compatible gateway, so the
 * ambient fallback must not hand a gateway's key and the decision state to
 * api.openai.com. The entry's `ambientKeyGuard` skips the key from the
 * ENVIRONMENT while OPENAI_BASE_URL or OPENAI_API_BASE names another host.
 * It does not apply once the host routed this provider on purpose
 * (OPENAI_DECISIONS_BASE_URL, credentials.openaiDecisions) and it never applies
 * to a call that names the provider. The answer in the 200 body is a stand-in
 * for the shape.
 */
async function runOpenAIDecisionsAmbientGuard(): Promise<void> {
  const { provider, key, endpoint } = OPENAI_DECISIONS_SPEC;
  const { NeuroLink, resolveDefaultDecisionProvider } =
    await import("../dist/index.js");
  const prior = OPENAI_DECISIONS_ENV.map((name) => process.env[name]);
  const GATEWAY = "https://gateway.invalid/v1";
  const fresh = () => new NeuroLink({ conversationMemory: { enabled: false } });
  const posts = <T extends { method: string }>(calls: readonly T[]): T[] =>
    calls.filter((c) => c.method === "POST");
  /** The shared key alone, plus whatever else this case sets. */
  const resolveWith = (
    vars: Record<string, string | undefined>,
    credentials?: Parameters<typeof resolveDefaultDecisionProvider>[0],
  ): string | undefined => {
    resetOpenAIDecisionsEnv();
    for (const [name, value] of Object.entries(vars)) {
      setEnv(name, value);
    }
    return resolveDefaultDecisionProvider(credentials);
  };
  const BASE_VARS = ["OPENAI_BASE_URL", "OPENAI_API_BASE"] as const;
  try {
    await openaiDecisionsCase(
      "DECIDE openai-decisions: a gateway base URL keeps the ambient key from being the default; tryDecide is null and nothing is sent",
      async () => {
        for (const name of BASE_VARS) {
          // Precondition: the same setup without the variable does send one request.
          resetOpenAIDecisionsEnv();
          await withMocks([openaiDecisionsRoute()], async ({ calls }) => {
            const result = await fresh().tryDecide({
              state: "short",
              questions: OPENAI_DECISIONS_ONE_QUESTION,
            });
            expectEq(result?.provider, provider, `${name} unset: it answers`);
            expectEq(posts(calls).length, 1, `${name} unset: one request`);
          });
          setEnv(name, GATEWAY);
          expectEq(
            resolveDefaultDecisionProvider(),
            undefined,
            `${name} naming another host selects nothing`,
          );
          await withMocks(
            [
              openaiDecisionsRoute(),
              openaiDecisionsRoute(`${GATEWAY}/decisions`),
            ],
            async ({ calls }) => {
              const result = await fresh().tryDecide({
                state: "short",
                questions: OPENAI_DECISIONS_ONE_QUESTION,
              });
              expectEq(result, null, `${name}: tryDecide fails open`);
              expectEq(posts(calls).length, 0, `${name}: no request at all`);
            },
          );
        }
      },
    );

    await openaiDecisionsCase(
      "DECIDE openai-decisions: a base URL on api.openai.com, in any spelling of the same origin, still leaves it the default",
      async () => {
        for (const name of BASE_VARS) {
          for (const value of [
            "https://api.openai.com",
            "https://api.openai.com/",
            "https://api.openai.com/v1",
            "https://api.openai.com/v1/",
            "https://API.openai.com/",
            "HTTPS://Api.OpenAI.com/v1",
            "https://api.openai.com:443/v1",
            "  https://api.openai.com/v1  ",
          ]) {
            expectEq(
              resolveWith({ [name]: value }),
              provider,
              `${name}=${value.trim()} is OpenAI's own host`,
            );
          }
          // Blank is unset.
          for (const blank of ["", "   "]) {
            expectEq(
              resolveWith({ [name]: blank }),
              provider,
              `${name} blank is no base URL`,
            );
          }
        }
        // One listed variable on OpenAI and the other elsewhere is still elsewhere.
        expectEq(
          resolveWith({
            OPENAI_BASE_URL: "https://api.openai.com/v1",
            OPENAI_API_BASE: GATEWAY,
          }),
          undefined,
          "any listed variable naming another host skips the key",
        );
      },
    );

    await openaiDecisionsCase(
      "DECIDE openai-decisions: a base URL that is not plainly OpenAI's is untrusted, however it is spelled",
      async () => {
        for (const value of [
          "http://127.0.0.1:4000/v1",
          "http://localhost:11434",
          "https://gateway.example/v1",
          "https://eu.api.openai.com/v1",
          "https://api.openai.com.evil.test/v1",
          "https://api.openai.com@evil.test/v1",
          "https://evil.test/https://api.openai.com",
          "https://notapi.openai.com",
          "https://api.openai.com:8443/v1",
          "http://api.openai.com/v1",
          "ftp://api.openai.com",
          // A blob: URL carries the origin of the URL inside it.
          "blob:https://api.openai.com/00000000-0000-4000-8000-000000000000",
          "api.openai.com/v1",
          "not a url",
          "/v1",
          "https://",
          "javascript:void(0)",
        ]) {
          expectEq(
            resolveWith({ OPENAI_BASE_URL: value }),
            undefined,
            `OPENAI_BASE_URL=${value} is not OpenAI's host`,
          );
        }
      },
    );

    await openaiDecisionsCase(
      "DECIDE openai-decisions: OPENAI_DECISIONS_BASE_URL is intent: it selects the provider despite a gateway, and the request goes there",
      async () => {
        for (const value of [
          "https://decisions.example/gw",
          "https://gateway.invalid/v1",
          "http://127.0.0.1:4000",
        ]) {
          expectEq(
            resolveWith({
              OPENAI_BASE_URL: GATEWAY,
              OPENAI_DECISIONS_BASE_URL: value,
            }),
            provider,
            `OPENAI_DECISIONS_BASE_URL=${value} routes it on purpose`,
          );
        }
        expectEq(
          resolveWith({
            OPENAI_BASE_URL: GATEWAY,
            OPENAI_DECISIONS_BASE_URL: "   ",
          }),
          undefined,
          "a blank OPENAI_DECISIONS_BASE_URL routes nothing",
        );
        resetOpenAIDecisionsEnv();
        setEnv("OPENAI_BASE_URL", GATEWAY);
        setEnv("OPENAI_DECISIONS_BASE_URL", "https://decisions.example/gw/v1/");
        await withMocks(
          [openaiDecisionsRoute("https://decisions.example/gw/v1/decisions")],
          async ({ calls }) => {
            const result = await fresh().tryDecide({
              state: "short",
              questions: OPENAI_DECISIONS_ONE_QUESTION,
            });
            expectEq(result?.provider, provider, "tryDecide answers");
            const sent = posts(calls);
            expectEq(sent.length, 1, "one request");
            expectEq(
              sent[0]?.url,
              "https://decisions.example/gw/v1/decisions",
              "to the decisions base URL, never to the chat host",
            );
          },
        );
      },
    );

    await openaiDecisionsCase(
      "DECIDE openai-decisions: credentials.openaiDecisions selects it despite a gateway, with a key or with a base URL; credentials.openai does not",
      async () => {
        expectEq(
          resolveWith(
            { OPENAI_API_KEY: undefined, OPENAI_BASE_URL: GATEWAY },
            { openaiDecisions: { apiKey: "test-fake-config-credential" } },
          ),
          provider,
          "a credentials key alone, with the environment on a gateway",
        );
        expectEq(
          resolveWith(
            { OPENAI_BASE_URL: GATEWAY },
            { openaiDecisions: { apiKey: "test-fake-config-credential" } },
          ),
          provider,
          "a credentials key beside the environment's",
        );
        expectEq(
          resolveWith(
            { OPENAI_BASE_URL: GATEWAY },
            { openaiDecisions: { baseURL: "https://decisions.example/gw" } },
          ),
          provider,
          "a credentials base URL routes the environment key on purpose",
        );
        expectEq(
          resolveWith(
            { OPENAI_BASE_URL: GATEWAY },
            { openaiDecisions: { apiKey: "   ", baseURL: "  " } },
          ),
          undefined,
          "blank credentials change nothing",
        );
        expectEq(
          resolveWith(
            { OPENAI_BASE_URL: GATEWAY },
            { openai: { apiKey: "test-fake-chat-credential" } },
          ),
          undefined,
          "the chat provider's slice is not this provider's",
        );
        resetOpenAIDecisionsEnv();
        setEnv("OPENAI_BASE_URL", GATEWAY);
        await withMocks([openaiDecisionsRoute()], async ({ calls }) => {
          const result = await fresh().tryDecide({
            state: "short",
            questions: OPENAI_DECISIONS_ONE_QUESTION,
            credentials: {
              openaiDecisions: { apiKey: "test-fake-per-call-credential" },
            },
          });
          expectEq(result?.provider, provider, "a per-call key answers");
          const sent = posts(calls);
          expectEq(sent.length, 1, "one request");
          expectEq(
            sent[0]?.headers.authorization,
            "Bearer test-fake-per-call-credential",
            "with that key, not the gateway's",
          );
        });
      },
    );

    await openaiDecisionsCase(
      "DECIDE openai-decisions: every provider ahead of it, and every one with no guard, resolves as before under a gateway",
      async () => {
        const others: ReadonlyArray<readonly [string, Record<string, string>]> =
          [
            ["typesafe", { TYPESAFE_API_KEY: "test-fake-typesafe-credential" }],
            [
              "laya",
              {
                LAYA_API_KEY: "test-fake-laya-credential",
                LAYA_BASE_URL: "https://laya.test.example/base",
              },
            ],
            [
              "xor",
              {
                XOR_API_KEY: "test-fake-xor-credential",
                XOR_BASE_URL: "https://xor.test.example/proxy",
              },
            ],
            ["perplexity-decider", { PERPLEXITY_API_KEY: "test-fake-pplx" }],
            [
              "cloudflare-clef",
              {
                CLOUDFLARE_API_KEY: "test-fake-cloudflare-credential",
                CLOUDFLARE_ACCOUNT_ID: "test-account-id",
              },
            ],
          ];
        for (const [expected, vars] of others) {
          expectEq(
            resolveWith({ ...vars, OPENAI_BASE_URL: GATEWAY }),
            expected,
            `${expected} still wins under a gateway`,
          );
          // Without the shared key at all, the guard has nothing to guard.
          expectEq(
            resolveWith({
              ...vars,
              OPENAI_API_KEY: undefined,
              OPENAI_BASE_URL: GATEWAY,
            }),
            expected,
            `${expected} is unchanged without the shared key`,
          );
        }
      },
    );

    await openaiDecisionsCase(
      "DECIDE openai-decisions: a gateway in credentials.openai.baseURL keeps the ambient key from being the default, on the instance and per call; nothing is sent",
      async () => {
        const gatewaySlice = { openai: { baseURL: GATEWAY } };
        // Precondition: the same environment, with a credentials slice that
        // does not move the chat provider, answers with one request.
        resetOpenAIDecisionsEnv();
        await withMocks([openaiDecisionsRoute()], async ({ calls }) => {
          const result = await new NeuroLink({
            conversationMemory: { enabled: false },
            credentials: { openai: { apiKey: "test-fake-chat-credential" } },
          }).tryDecide({
            state: "short",
            questions: OPENAI_DECISIONS_ONE_QUESTION,
          });
          expectEq(result?.provider, provider, "no baseURL: it answers");
          expectEq(posts(calls).length, 1, "no baseURL: one request");
        });
        expectEq(
          resolveWith({}, gatewaySlice),
          undefined,
          "the resolver skips the key beside a credentials gateway",
        );
        // On the instance.
        await withMocks(
          [
            openaiDecisionsRoute(),
            openaiDecisionsRoute(`${GATEWAY}/decisions`),
          ],
          async ({ calls }) => {
            resetOpenAIDecisionsEnv();
            const result = await new NeuroLink({
              conversationMemory: { enabled: false },
              credentials: gatewaySlice,
            }).tryDecide({
              state: "short",
              questions: OPENAI_DECISIONS_ONE_QUESTION,
            });
            expectEq(result, null, "instance credentials: fails open");
            expectEq(
              posts(calls).length,
              0,
              "instance credentials: no request",
            );
          },
        );
        // Per call, on an instance that holds no credentials.
        await withMocks(
          [
            openaiDecisionsRoute(),
            openaiDecisionsRoute(`${GATEWAY}/decisions`),
          ],
          async ({ calls }) => {
            resetOpenAIDecisionsEnv();
            const result = await fresh().tryDecide({
              state: "short",
              questions: OPENAI_DECISIONS_ONE_QUESTION,
              credentials: gatewaySlice,
            });
            expectEq(result, null, "per-call credentials: fails open");
            expectEq(
              posts(calls).length,
              0,
              "per-call credentials: no request",
            );
          },
        );
        // The per-call slice is merged over the instance's, field by field.
        await withMocks([openaiDecisionsRoute()], async ({ calls }) => {
          resetOpenAIDecisionsEnv();
          const result = await new NeuroLink({
            conversationMemory: { enabled: false },
            credentials: gatewaySlice,
          }).tryDecide({
            state: "short",
            questions: OPENAI_DECISIONS_ONE_QUESTION,
            credentials: { openai: { baseURL: "https://api.openai.com/v1" } },
          });
          expectEq(
            result?.provider,
            provider,
            "a per-call OpenAI base URL replaces the instance's gateway",
          );
          expectEq(posts(calls).length, 1, "and one request goes out");
        });
        await withMocks(
          [
            openaiDecisionsRoute(),
            openaiDecisionsRoute(`${GATEWAY}/decisions`),
          ],
          async ({ calls }) => {
            resetOpenAIDecisionsEnv();
            const result = await new NeuroLink({
              conversationMemory: { enabled: false },
              credentials: { openai: { baseURL: "https://api.openai.com/v1" } },
            }).tryDecide({
              state: "short",
              questions: OPENAI_DECISIONS_ONE_QUESTION,
              credentials: gatewaySlice,
            });
            expectEq(
              result,
              null,
              "a per-call gateway replaces the instance's",
            );
            expectEq(posts(calls).length, 0, "and nothing is sent");
          },
        );
      },
    );

    await openaiDecisionsCase(
      "DECIDE openai-decisions: credentials.openai.baseURL on OpenAI's own host, blank or absent leaves it the default; anything else skips it",
      async () => {
        for (const value of [
          "https://api.openai.com",
          "https://api.openai.com/v1",
          "https://api.openai.com/v1/",
          "https://API.openai.com/",
          "HTTPS://Api.OpenAI.com/v1",
          "https://api.openai.com:443/v1",
          "  https://api.openai.com/v1  ",
          "",
          "   ",
        ]) {
          expectEq(
            resolveWith({}, { openai: { baseURL: value } }),
            provider,
            `credentials.openai.baseURL=${JSON.stringify(value)} is OpenAI's own host or unset`,
          );
        }
        expectEq(
          resolveWith({}, { openai: { apiKey: "test-fake-chat-credential" } }),
          provider,
          "a chat slice with no base URL changes nothing",
        );
        expectEq(
          resolveWith({}, { openai: {} }),
          provider,
          "an empty chat slice changes nothing",
        );
        for (const value of [
          "http://127.0.0.1:4000/v1",
          "https://gateway.example/v1",
          "https://eu.api.openai.com/v1",
          "https://api.openai.com.evil.test/v1",
          "https://api.openai.com@evil.test/v1",
          "https://api.openai.com:8443/v1",
          "http://api.openai.com/v1",
          "blob:https://api.openai.com/00000000-0000-4000-8000-000000000000",
          "api.openai.com/v1",
          "not a url",
        ]) {
          expectEq(
            resolveWith({}, { openai: { baseURL: value } }),
            undefined,
            `credentials.openai.baseURL=${value} is not OpenAI's host`,
          );
        }
        // A value that is not text cannot be read as a URL: untrusted.
        for (const value of [5, true, {}, ["https://api.openai.com"]]) {
          expectEq(
            resolveWith({}, {
              openai: { baseURL: value },
            } as unknown as Parameters<
              typeof resolveDefaultDecisionProvider
            >[0]),
            undefined,
            `a ${typeof value} base URL is untrusted`,
          );
        }
        // The environment and the credentials are both read: either one
        // naming another host is enough.
        expectEq(
          resolveWith(
            { OPENAI_BASE_URL: "https://api.openai.com/v1" },
            { openai: { baseURL: GATEWAY } },
          ),
          undefined,
          "OpenAI in the environment, a gateway in credentials",
        );
        expectEq(
          resolveWith(
            { OPENAI_BASE_URL: GATEWAY },
            { openai: { baseURL: "https://api.openai.com/v1" } },
          ),
          undefined,
          "a gateway in the environment, OpenAI in credentials: still skipped, the guard is conservative",
        );
      },
    );

    await openaiDecisionsCase(
      "DECIDE openai-decisions: routing it on purpose lifts the credentials guard too; a named call and the other providers are unaffected",
      async () => {
        const gatewaySlice = { openai: { baseURL: GATEWAY } };
        expectEq(
          resolveWith(
            { OPENAI_DECISIONS_BASE_URL: "https://decisions.example/gw" },
            gatewaySlice,
          ),
          provider,
          "OPENAI_DECISIONS_BASE_URL lifts it",
        );
        expectEq(
          resolveWith(
            {},
            {
              ...gatewaySlice,
              openaiDecisions: { baseURL: "https://decisions.example/gw" },
            },
          ),
          provider,
          "credentials.openaiDecisions.baseURL lifts it",
        );
        expectEq(
          resolveWith(
            {},
            {
              ...gatewaySlice,
              openaiDecisions: { apiKey: "test-fake-config-credential" },
            },
          ),
          provider,
          "credentials.openaiDecisions.apiKey lifts it",
        );
        expectEq(
          resolveWith(
            { OPENAI_API_KEY: undefined },
            {
              ...gatewaySlice,
              openaiDecisions: { apiKey: "test-fake-config-credential" },
            },
          ),
          provider,
          "and so does a credentials key with no environment key",
        );
        expectEq(
          resolveWith({ OPENAI_API_KEY: undefined }, gatewaySlice),
          undefined,
          "no key anywhere: nothing, with or without the gateway",
        );
        // The providers ahead of it resolve as before whatever the slice says.
        expectEq(
          resolveWith(
            { TYPESAFE_API_KEY: "test-fake-typesafe-credential" },
            gatewaySlice,
          ),
          "typesafe",
          "TypeSafe still wins",
        );
        expectEq(
          resolveWith({ PERPLEXITY_API_KEY: "test-fake-pplx" }, gatewaySlice),
          "perplexity-decider",
          "Perplexity still wins",
        );
        // A named call is never checked: the environment key goes to the
        // default endpoint whatever the credentials say.
        resetOpenAIDecisionsEnv();
        await withMocks([openaiDecisionsRoute()], async ({ calls }) => {
          const result = await fresh().decide({
            provider,
            state: "short",
            questions: OPENAI_DECISIONS_ONE_QUESTION,
            credentials: gatewaySlice,
          });
          expectEq(result.provider, provider, "the named call answers");
          const sent = posts(calls);
          expectEq(sent.length, 1, "one request");
          expectEq(sent[0]?.url, endpoint, "to the default endpoint");
          expectEq(
            sent[0]?.headers.authorization,
            `Bearer ${key}`,
            "with the environment key",
          );
        });
      },
    );

    await openaiDecisionsCase(
      "DECIDE openai-decisions: naming it is intent: the environment key is used under a gateway, and the request goes to api.openai.com",
      async () => {
        resetOpenAIDecisionsEnv();
        setEnv("OPENAI_BASE_URL", GATEWAY);
        expectEq(
          resolveDefaultDecisionProvider(),
          undefined,
          "precondition: the default skips it",
        );
        await withMocks([openaiDecisionsRoute()], async ({ calls }) => {
          const result = await fresh().decide({
            provider,
            state: "short",
            questions: OPENAI_DECISIONS_ONE_QUESTION,
          });
          expectEq(result.provider, provider, "the named call answers");
          const sent = posts(calls);
          expectEq(sent.length, 1, "one request");
          expectEq(sent[0]?.url, endpoint, "to the default endpoint");
          expectEq(
            sent[0]?.headers.authorization,
            `Bearer ${key}`,
            "with the environment key",
          );
        });
      },
    );

    await openaiDecisionsCase(
      "DECIDE openai-decisions: the nothing-configured message says when the shared key is ignored",
      async () => {
        resetOpenAIDecisionsEnv();
        setEnv("OPENAI_BASE_URL", GATEWAY);
        await withMocks([openaiDecisionsRoute()], async ({ calls }) => {
          const failure = await captureDecisionFailure(async () =>
            fresh().decide({
              state: "short",
              questions: OPENAI_DECISIONS_ONE_QUESTION,
            }),
          );
          expect(
            failure.message.includes("No decision provider is configured"),
            "a bare decide() finds no provider",
          );
          expect(
            failure.message.includes(
              "OPENAI_API_KEY for openai-decisions (ignored while OPENAI_BASE_URL, OPENAI_API_BASE or credentials.openai.baseURL names a host outside https://api.openai.com, unless OPENAI_DECISIONS_BASE_URL is set)",
            ),
            "the message names the variables, the trusted host and the exception",
          );
          expectEq(posts(calls).length, 0, "no request");
        });
      },
    );
  } finally {
    OPENAI_DECISIONS_ENV.forEach((name, i) => setEnv(name, prior[i]));
  }
}

// ───────────────────────────────────────────────────────────────────────
// Section: ScaleDown (decide-only; its own key, an x-api-key header, a text state)
// ───────────────────────────────────────────────────────────────────────

/**
 * `scaledown` is one catalog entry (src/lib/providers/catalog/scaledown.json)
 * on the system-one dialect. Two fields of its `decide` block change what the
 * engine sends: `authHeader: "x-api-key"` (the key travels in `x-api-key` and
 * `Authorization` is absent) and `stateEncoding: "text"` (the state goes out as
 * one string, and a blank string is refused before any request). Every request
 * here is fetch-mocked, so none reaches api.scaledown.xyz: the section reads
 * what the mock saw. The 200 bodies are invented stand-ins for the shape. The
 * error texts (key header required, state text required, queue full, Decision
 * failed, endpoint timed out) are the ones the marketing session reported on
 * 15 Oct 2026, not probed by this project. No request was made to ScaleDown in
 * this change, and nothing here says what its endpoint returns.
 */
const SCALEDOWN_SPEC = {
  provider: "scaledown",
  keyEnv: "SCALEDOWN_API_KEY",
  baseURLEnvVar: "SCALEDOWN_BASE_URL",
  modelEnvVar: "SCALEDOWN_MODEL",
  key: "test-fake-scaledown-credential",
  endpoint: "https://api.scaledown.xyz/v1/scaledown",
  model: "classify-1",
};

/** Every variable that can make a decision provider the default one. */
const SCALEDOWN_ENV = [
  ...new Set([
    ...CLEF_DECISION_ENV,
    SCALEDOWN_SPEC.keyEnv,
    SCALEDOWN_SPEC.baseURLEnvVar,
    SCALEDOWN_SPEC.modelEnvVar,
    // The chat provider's own base URLs: the OpenAI Decisions guard reads them.
    "OPENAI_BASE_URL",
    "OPENAI_API_BASE",
  ]),
];

/** Only the ScaleDown key set: no other decision provider is configured. */
function resetScaleDownEnv(): void {
  for (const name of SCALEDOWN_ENV) {
    setEnv(name, undefined);
  }
  setEnv(SCALEDOWN_SPEC.keyEnv, SCALEDOWN_SPEC.key);
}

const SCALEDOWN_ONE_QUESTION = {
  urgent: { type: "boolean", instructions: "Is this urgent?" },
} satisfies DecisionQuestionMap;

const SCALEDOWN_QUESTIONS = {
  urgent: { type: "boolean", instructions: "Is this urgent?" },
  team: {
    type: "choice",
    instructions: "Which team?",
    criteria: { billing: "money", technical: "bugs" },
  },
  mood: {
    type: "score",
    instructions: "How angry?",
    criteria: ["calm", "annoyed", "angry"],
  },
} satisfies DecisionQuestionMap;

// What the engine puts on the wire for them: only the yes/no question is
// renamed (to noul), the other two go through as the caller wrote them.
const SCALEDOWN_WIRE_QUESTIONS = {
  urgent: { type: "noul", instructions: "Is this urgent?" },
  team: SCALEDOWN_QUESTIONS.team,
  mood: SCALEDOWN_QUESTIONS.mood,
};

const SCALEDOWN_REPLY = {
  model: "classify-1",
  answers: {
    urgent: { type: "noul", noul: 0.75 },
    team: {
      type: "choice",
      choice: "billing",
      probabilities: { billing: 0.8, technical: 0.2 },
      confidence: 0.7,
    },
    mood: {
      type: "score",
      score: 1.5,
      legend: { "0": "calm", "1": "annoyed", "2": "angry" },
      probabilities: { "0": 0.1, "1": 0.6, "2": 0.3 },
    },
  },
  usage: { input_tokens: 120, output_tokens: 4, cost: 0.000006 },
};

// Written out by hand from the reply above, not read back from the engine.
const SCALEDOWN_EXPECTED_ANSWERS = {
  urgent: { type: "boolean", probability: 0.75 },
  team: {
    type: "choice",
    choice: "billing",
    confidence: 0.7,
    probabilities: { billing: 0.8, technical: 0.2 },
  },
  mood: {
    type: "score",
    score: 1.5,
    confidence: 0.6,
    legend: { "0": "calm", "1": "annoyed", "2": "angry" },
    probabilities: { "0": 0.1, "1": 0.6, "2": 0.3 },
  },
};

type ScaleDownRespond = Parameters<
  typeof installMockFetch
>[0][number]["respond"];

function scaledownRoute(
  respond: ScaleDownRespond = { status: 200, json: SCALEDOWN_REPLY },
) {
  return { method: "POST", url: /\/v1\/scaledown$/, respond };
}

type ScaleDownBody = {
  model?: string;
  state?: unknown;
  questions?: unknown;
};

const scaledownBodyOf = (
  call: { bodyJson: unknown } | undefined,
): ScaleDownBody => (call?.bodyJson ?? {}) as ScaleDownBody;

async function createScaleDown(model?: string) {
  const { ProviderFactory } = await import("../dist/index.js");
  return ProviderFactory.createProvider(SCALEDOWN_SPEC.provider, model);
}

const scaledownCase = perplexityCase;

async function runScaleDownDecide(): Promise<void> {
  const { provider, keyEnv, baseURLEnvVar, key, endpoint, model } =
    SCALEDOWN_SPEC;
  const { NeuroLink, DECISION_PROVIDERS, resolveDefaultDecisionProvider } =
    await import("../dist/index.js");
  const prior = SCALEDOWN_ENV.map((name) => process.env[name]);
  const fresh = () => new NeuroLink({ conversationMemory: { enabled: false } });
  const posts = (calls: ReturnType<typeof installMockFetch>["calls"]) =>
    calls.filter((c) => c.method === "POST");
  const ask = (
    nl: InstanceType<typeof NeuroLink>,
    over: Partial<DecisionOptions> = {},
  ) =>
    nl.decide({
      provider,
      state: "short",
      questions: SCALEDOWN_ONE_QUESTION,
      ...over,
    });

  try {
    await scaledownCase(
      "DECIDE scaledown: SCALEDOWN_API_KEY alone makes it the default, and the request carries x-api-key and no Authorization",
      async () => {
        resetScaleDownEnv();
        expectEq(
          resolveDefaultDecisionProvider(),
          provider,
          "the key alone selects it",
        );
        await withMocks([scaledownRoute()], async ({ calls }) => {
          const result = await fresh().tryDecide({
            state: "short",
            questions: SCALEDOWN_QUESTIONS,
          });
          expectEq(result?.provider, provider, "chosen without being named");
          const sent = posts(calls);
          expectEq(sent.length, 1, "one decision request");
          const request = sent[0];
          expectEq(request?.url, endpoint, "to the built-in endpoint");
          expectEq(
            request?.headers["x-api-key"],
            key,
            "the key travels in x-api-key",
          );
          expectEq(
            request?.headers.authorization,
            undefined,
            "no Authorization header at all",
          );
          expect(
            !Object.values(request?.headers ?? {}).some((value) =>
              /bearer/i.test(value),
            ),
            "no header value carries a Bearer token",
          );
          expectEq(
            request?.headers["content-type"],
            "application/json",
            "a JSON body",
          );
          const body = scaledownBodyOf(request);
          expectEq(
            Object.keys(body).sort().join(","),
            "model,questions,state",
            "the body holds the model, the questions and the state, nothing else",
          );
          expectEq(body.model, model, "naming the default model");
          expectEq(body.state, "short", "the state as given");
          expect(
            sameJson(body.questions, SCALEDOWN_WIRE_QUESTIONS),
            "boolean as noul, choice and score unchanged",
          );
        });
      },
    );

    await scaledownCase(
      "DECIDE scaledown: boolean, choice and score answers read back exactly, with the model and the usage the reply names",
      async () => {
        resetScaleDownEnv();
        await withMocks([scaledownRoute()], async ({ calls }) => {
          // Asking for "classify" while the reply names "classify-1" shows the
          // model is read from the reply, not echoed from the request.
          const result = await ask(fresh(), {
            questions: SCALEDOWN_QUESTIONS,
            model: "classify",
          });
          expectEq(
            scaledownBodyOf(posts(calls)[0]).model,
            "classify",
            "the per-call model is sent",
          );
          expectEq(result.model, "classify-1", "the model the reply names");
          expectEq(result.provider, provider, "the provider that answered");
          expect(
            sameJson(result.answers, SCALEDOWN_EXPECTED_ANSWERS),
            "the three answers read back as written",
          );
          expectEq(result.usage.inputTokens, 120, "input tokens from usage");
          expectEq(result.usage.outputTokens, 4, "output tokens from usage");
        });
      },
    );

    // SCALEDOWN_MODEL is read once, when the registry registers the provider
    // (the CLI suite covers it in a fresh process), so what a running instance
    // can show is the default and a per-call model.
    await scaledownCase(
      "DECIDE scaledown: the model is classify-1 by default, and a per-call model replaces it for that call only",
      async () => {
        resetScaleDownEnv();
        await withMocks([scaledownRoute()], async ({ calls }) => {
          const nl = fresh();
          await ask(nl);
          await ask(nl, { model: "classify" });
          await ask(nl);
          expect(
            sameJson(
              posts(calls).map((call) => scaledownBodyOf(call).model),
              ["classify-1", "classify", "classify-1"],
            ),
            "default, per-call, default again",
          );
        });
      },
    );

    await scaledownCase(
      "DECIDE scaledown: an object, array, number or boolean state goes out as one JSON string, a string state unchanged, and {} and [] as their JSON text",
      async () => {
        resetScaleDownEnv();
        const rows: ReadonlyArray<readonly [DecisionState, string]> = [
          ["payouts have failed", "payouts have failed"],
          ["  keep  these\n", "  keep  these\n"],
          [`{"a":1}`, `{"a":1}`],
          [{ a: 1, b: ["x", true] }, `{"a":1,"b":["x",true]}`],
          [[1, "two"], `[1,"two"]`],
          [42, "42"],
          [true, "true"],
          [{}, "{}"],
          [[], "[]"],
        ];
        await withMocks([scaledownRoute()], async ({ calls }) => {
          const nl = fresh();
          for (const [state] of rows) {
            await ask(nl, { state });
          }
          const sent = posts(calls);
          expectEq(sent.length, rows.length, "one request per state");
          rows.forEach(([, text], index) => {
            const body = scaledownBodyOf(sent[index]);
            expectEq(typeof body.state, "string", `state ${index} is a string`);
            expectEq(body.state, text, `state ${index} as its text`);
          });
        });
      },
    );

    await scaledownCase(
      "DECIDE scaledown: a blank string state sends nothing, tryDecide returns null, decide rejects as invalid_request, and a real state still goes out",
      async () => {
        resetScaleDownEnv();
        await withMocks([scaledownRoute()], async ({ calls }) => {
          const nl = fresh();
          for (const state of ["", "   ", "\t\n"]) {
            const result = await nl.tryDecide({
              provider,
              state,
              questions: SCALEDOWN_ONE_QUESTION,
            });
            expectEq(result, null, "tryDecide fails open on a blank state");
            const failure = await captureDecisionFailure(async () =>
              ask(nl, { state }),
            );
            expectEq(failure.kind, "invalid_request", "decide rejects it");
            expect(
              failure.message.includes("needs non-blank state text"),
              "the message names the rule",
            );
          }
          expectEq(posts(calls).length, 0, "no request left the process");
          // Positive control: the same instance and mock send a real state.
          await ask(nl, { state: "real" });
          expectEq(posts(calls).length, 1, "a real state reaches the mock");
        });
      },
    );

    await scaledownCase(
      "DECIDE scaledown: SCALEDOWN_BASE_URL replaces the origin, trailing slashes are dropped, a blank value is no override, and credentials.scaledown.baseURL beats it",
      async () => {
        resetScaleDownEnv();
        setEnv(baseURLEnvVar, "https://scaledown.proxy.invalid/gw//");
        await withMocks([scaledownRoute()], async ({ calls }) => {
          await ask(fresh());
          expectEq(
            posts(calls)[0]?.url,
            "https://scaledown.proxy.invalid/gw/v1/scaledown",
            "the override carries the route",
          );
        });
        setEnv(baseURLEnvVar, "   ");
        await withMocks([scaledownRoute()], async ({ calls }) => {
          await ask(fresh());
          expectEq(
            posts(calls)[0]?.url,
            endpoint,
            "a blank override leaves the built-in endpoint",
          );
        });
        setEnv(baseURLEnvVar, "https://scaledown.env.invalid");
        await withMocks([scaledownRoute()], async ({ calls }) => {
          const nl = new NeuroLink({
            conversationMemory: { enabled: false },
            credentials: {
              scaledown: {
                apiKey: "test-fake-config-credential",
                baseURL: "https://scaledown.config.invalid/",
              },
            },
          });
          await ask(nl);
          const sent = posts(calls)[0];
          expectEq(
            sent?.url,
            "https://scaledown.config.invalid/v1/scaledown",
            "endpoint from credentials.scaledown.baseURL",
          );
          expectEq(
            sent?.headers["x-api-key"],
            "test-fake-config-credential",
            "key from credentials.scaledown.apiKey",
          );
        });
        setEnv(baseURLEnvVar, undefined);
        setEnv(keyEnv, undefined);
        expectEq(
          resolveDefaultDecisionProvider({
            scaledown: { apiKey: "test-fake-config-credential" },
          }),
          provider,
          "credentials.scaledown.apiKey alone selects it",
        );
        expectEq(
          resolveDefaultDecisionProvider({ scaledown: { apiKey: "   " } }),
          undefined,
          "a blank credentials key selects nothing",
        );
      },
    );

    await scaledownCase(
      "DECIDE scaledown: a per-call credentials.scaledown.apiKey beats the instance's, which beats the environment's, and always travels as x-api-key",
      async () => {
        resetScaleDownEnv();
        const instanceKey = "test-fake-instance-credential";
        const callKey = "test-fake-call-credential";
        await withMocks([scaledownRoute()], async ({ calls }) => {
          const keyOfLast = (): string | undefined =>
            calls[calls.length - 1]?.headers["x-api-key"];
          await ask(fresh());
          expectEq(keyOfLast(), key, "the environment key alone");
          const withInstance = new NeuroLink({
            conversationMemory: { enabled: false },
            credentials: { scaledown: { apiKey: instanceKey } },
          });
          await ask(withInstance);
          expectEq(
            keyOfLast(),
            instanceKey,
            "the instance beats the environment",
          );
          await ask(withInstance, {
            credentials: { scaledown: { apiKey: callKey } },
          });
          expectEq(keyOfLast(), callKey, "the call beats the instance");
          expect(
            posts(calls).every(
              (call) => call.headers.authorization === undefined,
            ),
            "no call sent an Authorization header",
          );
        });
      },
    );

    await scaledownCase(
      "DECIDE scaledown: the alias scaledown-classify names it, the result says scaledown, and the decision is priced at the same rate as the id",
      async () => {
        resetScaleDownEnv();
        const spanCost = (nl: InstanceType<typeof NeuroLink>): unknown =>
          nl.getSpans().find((s) => s.type === "model.decision")?.attributes[
            "ai.cost.total"
          ];
        await withMocks([scaledownRoute()], async ({ calls }) => {
          const aliasHost = fresh();
          const result = await ask(aliasHost, {
            provider: "scaledown-classify",
          });
          expectEq(
            result.provider,
            provider,
            "scaledown-classify resolves to scaledown",
          );
          expectEq(posts(calls)[0]?.url, endpoint, "the same endpoint");

          // The pricing table is keyed by the canonical id and reads only the
          // chat catalog, so runDecide has to resolve the alias itself.
          const byAlias = spanCost(aliasHost);
          const idHost = fresh();
          await ask(idHost, { provider });
          const byId = spanCost(idHost);
          expect(
            typeof byId === "number" &&
              Math.abs(byId - (120 * 0.05) / 1_000_000) < 1e-15,
            "positive control: 120 input tokens by id cost 120 x 0.05 / 1e6",
          );
          expectEq(byAlias, byId, "the alias is priced like the id, not at 0");
        });
      },
    );

    await scaledownCase(
      "DECIDE aliases: an alias of any priced decision provider is priced like its id, not at 0",
      async () => {
        const { hasPricing } = await import("../dist/index.js");
        const priced = DECISION_PROVIDERS.filter(
          (d) =>
            d.aliases.length > 0 && hasPricing(String(d.name), d.defaultModel),
        );
        // Positive controls: the loop reaches a hand-written descriptor (its
        // aliases come from the descriptor) and a catalog entry (from its JSON).
        expect(
          ["typesafe", "scaledown"].every((name) =>
            priced.some((d) => String(d.name) === name),
          ),
          "the loop covers typesafe (jev, typesafe-ai) and scaledown (scaledown-classify)",
        );
        const spanCost = (nl: InstanceType<typeof NeuroLink>): unknown =>
          nl.getSpans().find((s) => s.type === "model.decision")?.attributes[
            "ai.cost.total"
          ];
        const decideAs = async (name: string): Promise<unknown> => {
          const nl = fresh();
          await ask(nl, { provider: name });
          return spanCost(nl);
        };
        for (const descriptor of priced) {
          const id = String(descriptor.name);
          const keyEnv = descriptor.envVars.apiKey;
          if (keyEnv === undefined) {
            throw new Error(`${id} declares no API key env var to set`);
          }
          resetScaleDownEnv();
          setEnv(SCALEDOWN_SPEC.keyEnv, undefined);
          setEnv("TYPESAFE_TRANSPORT", undefined);
          setEnv(keyEnv, "test-fake-alias-credential");
          const reply = {
            model: descriptor.defaultModel,
            answers: { urgent: { type: "noul", noul: 0.75 } },
            usage: { input_tokens: 120, output_tokens: 4 },
          };
          await withMocks(
            [
              {
                method: "POST",
                url: /./,
                respond: { status: 200, json: reply },
              },
            ],
            async () => {
              const byId = await decideAs(id);
              expect(
                typeof byId === "number" && byId > 0,
                `positive control: ${id} by id costs more than 0`,
              );
              for (const alias of descriptor.aliases) {
                expectEq(
                  await decideAs(alias),
                  byId,
                  `${id}: the alias ${alias} is priced like the id, not at 0`,
                );
              }
            },
          );
        }
      },
    );

    await scaledownCase(
      "DECIDE scaledown: it is the eighth and last decision provider, so every earlier provider's key outranks its own",
      async () => {
        expectEq(
          DECISION_PROVIDERS.map(
            (d) => `${d.decideOrder}:${String(d.name)}`,
          ).join(","),
          "1:typesafe,2:laya,3:xor,4:subq,5:perplexity-decider,6:cloudflare-clef,7:openai-decisions,8:scaledown",
          "the precedence order",
        );
        const ahead: ReadonlyArray<readonly [string, Record<string, string>]> =
          [
            ["typesafe", { TYPESAFE_API_KEY: "test-fake-typesafe-credential" }],
            [
              "laya",
              {
                LAYA_API_KEY: "test-fake-laya-credential",
                LAYA_BASE_URL: "https://laya.test.invalid/base",
              },
            ],
            [
              "xor",
              {
                XOR_API_KEY: "test-fake-xor-credential",
                XOR_BASE_URL: "https://xor.test.invalid/proxy",
              },
            ],
            ["subq", { SUBQ_API_KEY: "test-fake-subq-credential" }],
            ["perplexity-decider", { PERPLEXITY_API_KEY: "test-fake-pplx" }],
            [
              "cloudflare-clef",
              {
                CLOUDFLARE_API_KEY: "test-fake-cloudflare-credential",
                CLOUDFLARE_ACCOUNT_ID: "test-account-id",
              },
            ],
            [
              "openai-decisions",
              { OPENAI_API_KEY: "test-fake-openai-credential" },
            ],
          ];
        for (const [expected, vars] of ahead) {
          resetScaleDownEnv();
          for (const [name, value] of Object.entries(vars)) {
            setEnv(name, value);
          }
          expectEq(
            resolveDefaultDecisionProvider(),
            expected,
            `${expected} keeps precedence over the ScaleDown key`,
          );
        }
        resetScaleDownEnv();
        expectEq(
          resolveDefaultDecisionProvider(),
          provider,
          "alone, it is the default",
        );
        setEnv(keyEnv, "   ");
        expectEq(
          resolveDefaultDecisionProvider(),
          undefined,
          "a blank key selects nothing",
        );
      },
    );

    await scaledownCase(
      "DECIDE scaledown: the nothing-configured message offers SCALEDOWN_API_KEY, and a named call without a key fails before any request",
      async () => {
        for (const name of SCALEDOWN_ENV) {
          setEnv(name, undefined);
        }
        await withMocks([scaledownRoute()], async ({ calls }) => {
          const nl = fresh();
          const bare = await captureDecisionFailure(async () =>
            nl.decide({ state: "short", questions: SCALEDOWN_ONE_QUESTION }),
          );
          expect(
            bare.message.includes("No decision provider") &&
              bare.message.includes("SCALEDOWN_API_KEY for scaledown"),
            "a bare decide() finds no provider and offers the ScaleDown key",
          );
          const named = await captureDecisionFailure(async () => ask(nl));
          expectEq(
            named.kind,
            "authentication",
            "naming it without a key fails",
          );
          expect(
            named.message.includes("SCALEDOWN_API_KEY"),
            "the message names the variable",
          );
          expectEq(posts(calls).length, 0, "no request left the process");
        });
      },
    );

    await scaledownCase(
      "DECIDE scaledown: no state window is declared, so decisionLimits() reports none and a very long state is sent, not refused",
      async () => {
        resetScaleDownEnv();
        expectEq(
          new NeuroLink().decisionLimits({ provider }),
          null,
          "no limits are declared",
        );
        const long = "word ".repeat(40_000);
        await withMocks([scaledownRoute()], async ({ calls }) => {
          await ask(fresh(), { state: long });
          expectEq(
            scaledownBodyOf(posts(calls)[0]).state,
            long,
            "the whole state reached the wire",
          );
        });
      },
    );

    await scaledownCase(
      "DECIDE scaledown: priced on input tokens only, at the list price in the table, for any model name",
      async () => {
        const { calculateCost, hasPricing } = await import("../dist/index.js");
        const cost = (name: string, input: number, output: number): number =>
          calculateCost(provider, name, {
            input,
            output,
            total: input + output,
          });
        expect(
          Math.abs(cost(model, 1_000_000, 0) - 0.05) < 1e-12,
          "one million input tokens cost 0.05",
        );
        expect(
          Math.abs(cost(model, 120, 4) - (120 * 0.05) / 1_000_000) < 1e-15,
          "120 input tokens cost 120 x 0.05 / 1e6",
        );
        expectEq(
          cost(model, 1_000_000, 0),
          cost(model, 1_000_000, 500_000),
          "output tokens are not billed",
        );
        expectEq(cost(model, 0, 1_000), 0, "output alone costs nothing");
        expectEq(
          cost("a-model-the-table-does-not-name", 1_000_000, 0),
          cost(model, 1_000_000, 0),
          "a model the table does not name is priced at the same rate",
        );
        // LiteLLM, OpenRouter and openai-compatible search every provider's
        // table by model name, so a model-name row here would price an
        // unrelated chat model at this rate.
        for (const proxy of ["litellm", "openrouter", "openai-compatible"]) {
          for (const name of ["classify", "classify-1"]) {
            expectEq(
              hasPricing(proxy, name),
              false,
              `${proxy}: ${name} is not priced from the ScaleDown table`,
            );
          }
        }
        // Positive control: the same proxies do search the tables by name.
        expectEq(
          hasPricing("litellm", "pplx-decider-v1-27b"),
          true,
          "litellm: a model named in another decide table is found",
        );
      },
    );

    await scaledownCase(
      "DECIDE scaledown: an image or a video is refused locally before any request",
      async () => {
        resetScaleDownEnv();
        await withMocks([scaledownRoute()], async ({ calls }) => {
          const nl = fresh();
          for (const extra of [
            { images: [syntheticPng(64, 64)] },
            { video: Buffer.from("not really a video") },
          ]) {
            const failure = await captureDecisionFailure(async () =>
              ask(nl, extra),
            );
            expectEq(failure.kind, "invalid_request", "refused as invalid");
            expect(
              failure.message.includes("does not accept images or video"),
              "the media refusal, not another",
            );
          }
          expectEq(posts(calls).length, 0, "nothing was sent");
        });
      },
    );

    // ── Errors, classified as the entry says. Every body echoes the key, to
    // show it never reaches a message. ──
    const errorRows = [
      {
        status: 401,
        detail: "x-api-key header is required",
        kind: "authentication",
        requests: 1,
      },
      {
        status: 402,
        detail: "Insufficient credits",
        kind: "invalid_request",
        requests: 1,
      },
      {
        status: 422,
        detail: "'state.text' or 'state.document' must be provided",
        kind: "invalid_request",
        requests: 1,
      },
      {
        status: 429,
        detail: "Max queue length has been reached",
        kind: "rate_limit",
        requests: 2,
      },
      { status: 502, detail: "Decision failed", kind: "server", requests: 2 },
      {
        status: 504,
        detail: "Endpoint request timed out",
        kind: "timeout",
        requests: 1,
      },
      { status: 500, detail: "Internal error", kind: "server", requests: 2 },
    ] as const;
    for (const row of errorRows) {
      await scaledownCase(
        `DECIDE scaledown: HTTP ${row.status} is ${row.kind}, sent ${row.requests === 1 ? "once" : "twice"}, and the key stays out of the message`,
        async () => {
          resetScaleDownEnv();
          await withMocks(
            [
              scaledownRoute({
                status: row.status,
                json: { detail: `${row.detail} (sent ${key})` },
              }),
            ],
            async ({ calls }) => {
              const failure = await capturePerplexityFailure(async () =>
                ask(fresh()),
              );
              expectEq(failure.kind, row.kind, "the kind");
              expectEq(failure.status, row.status, "the status is kept");
              expectEq(
                failure.retryable,
                row.requests > 1,
                "the retry flag is the kind's default",
              );
              expect(
                failure.message.includes(row.detail),
                "the server's own text is kept",
              );
              expect(
                !failure.message.includes(key),
                "the key is not in the message",
              );
              expectEq(posts(calls).length, row.requests, "requests sent");
            },
          );
        },
      );
    }

    await scaledownCase(
      "DECIDE scaledown: a 402 keeps its kind and its text, and adds that ScaleDown also answers 402 for a key it does not recognise, naming the variable",
      async () => {
        resetScaleDownEnv();
        await withMocks(
          [
            scaledownRoute({
              status: 402,
              json: { detail: `Insufficient credits (sent ${key})` },
            }),
          ],
          async ({ calls }) => {
            const failure = await capturePerplexityFailure(async () =>
              ask(fresh()),
            );
            expectEq(failure.kind, "invalid_request", "the kind is kept");
            expectEq(failure.status, 402, "the status is kept");
            expectEq(failure.retryable, false, "not retried");
            expect(
              failure.message.includes("Insufficient credits"),
              "ScaleDown's own text comes first",
            );
            expect(
              failure.message.includes("does not recognise the API key"),
              "a 402 can also mean an unrecognised key",
            );
            expect(
              failure.message.includes(keyEnv),
              "the variable to check is named",
            );
            expect(!failure.message.includes(key), "the key is not repeated");
            expectEq(posts(calls).length, 1, "requests sent");
          },
        );
        for (const status of [401, 422, 429, 502]) {
          await withMocks(
            [scaledownRoute({ status, json: { detail: "stand-in" } })],
            async () => {
              const failure = await capturePerplexityFailure(async () =>
                ask(fresh()),
              );
              expect(
                !failure.message.includes(keyEnv) &&
                  !failure.message.includes("does not recognise"),
                `HTTP ${status} carries no 402 note`,
              );
            },
          );
        }
      },
    );

    // ScaleDown's own 422 bodies, recorded in a live test on 20 Oct 2026: the
    // reason is in `detail` as a list, and each item echoes the request.
    const recordedUnknownModel = {
      detail: [
        {
          type: "value_error",
          loc: ["body"],
          msg: "Value error, Unsupported model 'classify-2'. Supported: classify, classify-1.",
          input: {
            model: "classify-2",
            state: "We were billed twice for March. Please refund it today.",
            questions: {
              team: { type: "choice", instructions: "Which team?" },
            },
          },
          ctx: { error: {} },
        },
      ],
    };
    const elevenLevels = Array.from({ length: 11 }, (_, i) => `level ${i + 1}`);
    const recordedElevenLevels = {
      detail: [
        {
          type: "literal_error",
          loc: ["body", "questions", "sev", "ChoiceQuestion", "type"],
          msg: "Input should be 'choice'",
          input: "score",
          ctx: { expected: "'choice'" },
        },
        {
          type: "dict_type",
          loc: ["body", "questions", "sev", "ChoiceQuestion", "criteria"],
          msg: "Input should be a valid dictionary",
          input: elevenLevels,
        },
        {
          type: "literal_error",
          loc: ["body", "questions", "sev", "NoulQuestion", "type"],
          msg: "Input should be 'noul'",
          input: "score",
          ctx: { expected: "'noul'" },
        },
        {
          type: "value_error",
          loc: [
            "body",
            "questions",
            "sev",
            "function-after[require_criteria_range(), ScoreQuestion]",
          ],
          msg: "Value error, 'criteria' must have between 2 and 10 levels, got 11",
          input: {
            type: "score",
            instructions: "How severe?",
            criteria: elevenLevels,
          },
          ctx: { error: {} },
        },
      ],
    };
    for (const row of [
      {
        name: "an unknown model",
        body: recordedUnknownModel,
        reason:
          "Unsupported model 'classify-2'. Supported: classify, classify-1.",
        echoed: ["We were billed twice", "Which team?"],
      },
      {
        name: "a score question with 11 levels",
        body: recordedElevenLevels,
        reason: "'criteria' must have between 2 and 10 levels, got 11",
        echoed: ["level 1", "level 11", "How severe?"],
      },
    ]) {
      await scaledownCase(
        `DECIDE scaledown: a 422 for ${row.name} shows ScaleDown's reason from the detail list and none of the request it echoes`,
        async () => {
          resetScaleDownEnv();
          await withMocks(
            [scaledownRoute({ status: 422, json: row.body })],
            async ({ calls }) => {
              const failure = await capturePerplexityFailure(async () =>
                ask(fresh()),
              );
              expectEq(failure.kind, "invalid_request", "the kind is kept");
              expectEq(failure.status, 422, "the status is kept");
              expectEq(failure.retryable, false, "not retried");
              expect(
                failure.message.includes(row.reason),
                `the reason is in the message: ${failure.message}`,
              );
              for (const echoed of row.echoed) {
                expect(
                  !failure.message.includes(echoed),
                  `the echoed request text "${echoed}" is not repeated`,
                );
              }
              expectEq(posts(calls).length, 1, "requests sent");
            },
          );
        },
      );
    }

    await scaledownCase(
      "DECIDE scaledown: the entry declares its own 30,000 ms decide timeout",
      async () => {
        const { PROVIDER_DESCRIPTORS_BY_NAME } =
          await import("../dist/factories/providerDescriptors.js");
        expectEq(
          [...PROVIDER_DESCRIPTORS_BY_NAME.values()].find(
            (d) => d.name === provider,
          )?.timeouts?.decideMs,
          30_000,
          "the declared decide timeout",
        );
      },
    );

    await scaledownCase(
      "DECIDE scaledown: a 502 or a 429 followed by a good reply is retried into an answer, with the same x-api-key",
      async () => {
        for (const status of [502, 429]) {
          resetScaleDownEnv();
          let served = 0;
          await withMocks(
            [
              scaledownRoute(() => {
                served += 1;
                return served === 1
                  ? { status, json: { detail: "try again" } }
                  : { status: 200, json: SCALEDOWN_REPLY };
              }),
            ],
            async ({ calls }) => {
              const result = await ask(fresh());
              expectEq(result.provider, provider, "answered after the retry");
              expectEq(posts(calls).length, 2, "one retry");
              expect(
                posts(calls).every((call) => call.headers["x-api-key"] === key),
                "both attempts carried the key",
              );
            },
          );
        }
      },
    );

    await scaledownCase(
      "DECIDE scaledown: a 401 trips the instance's breaker, a 402 or 422 does not, and tryDecide fails open on both",
      async () => {
        resetScaleDownEnv();
        await withMocks(
          [
            scaledownRoute({
              status: 401,
              json: { detail: "x-api-key header is required" },
            }),
          ],
          async ({ calls }) => {
            const instance = await createScaleDown();
            const decideOne = () =>
              instance.decide!({
                state: "short",
                questions: SCALEDOWN_ONE_QUESTION,
              });
            const first = await capturePerplexityFailure(decideOne);
            expectEq(first.kind, "authentication", "401 classified");
            const second = await capturePerplexityFailure(decideOne);
            expectEq(
              second.kind,
              "authentication",
              "the breaker keeps the kind",
            );
            expect(
              second.message.includes("rejected this API key earlier"),
              "the breaker message",
            );
            expectEq(calls.length, 1, "no second request after a rejected key");
            await capturePerplexityFailure(async () =>
              (await createScaleDown()).decide!({
                state: "short",
                questions: SCALEDOWN_ONE_QUESTION,
              }),
            );
            expectEq(calls.length, 2, "a new instance asks again");
          },
        );
        let served = 0;
        await withMocks(
          [
            scaledownRoute(() => {
              served += 1;
              if (served === 1) {
                return {
                  status: 402,
                  json: { detail: "Insufficient credits" },
                };
              }
              if (served === 2) {
                return { status: 422, json: { detail: "invalid" } };
              }
              return { status: 200, json: SCALEDOWN_REPLY };
            }),
          ],
          async ({ calls }) => {
            const instance = await createScaleDown();
            const decideOne = () =>
              instance.decide!({
                state: "short",
                questions: SCALEDOWN_ONE_QUESTION,
              });
            expectEq(
              (await capturePerplexityFailure(decideOne)).kind,
              "invalid_request",
              "402",
            );
            expectEq(
              (await capturePerplexityFailure(decideOne)).kind,
              "invalid_request",
              "422",
            );
            expectEq(
              (await decideOne()).provider,
              provider,
              "the same instance answers once the cause is gone",
            );
            expectEq(calls.length, 3, "every call was really sent");
          },
        );
        await withMocks(
          [scaledownRoute({ status: 422, json: { detail: "invalid" } })],
          async ({ calls }) => {
            expectEq(
              await fresh().tryDecide({
                provider,
                state: "short",
                questions: SCALEDOWN_ONE_QUESTION,
              }),
              null,
              "tryDecide returns null on a refused request",
            );
            expectEq(posts(calls).length, 1, "the request was made once");
          },
        );
      },
    );
  } finally {
    SCALEDOWN_ENV.forEach((name, i) => setEnv(name, prior[i]));
  }
}

// ───────────────────────────────────────────────────────────────────────
// Section: a decision does not load the model registry
// ───────────────────────────────────────────────────────────────────────

/**
 * For a provider created with no model named, the factory loads a model
 * registry to look up a default: http://localhost:3001, then
 * raw.githubusercontent.com, then ./config/models.json. The registry lists
 * chat providers only, and a decision-only provider reads its own model
 * setting, so a decision has no use for it. Every `decide()` call that named
 * no model nevertheless made a HEAD and a GET to the local port and a GET to
 * GitHub before it reached the provider. Every request here is fetch-mocked.
 */
const MODEL_REGISTRY_HOSTS = ["localhost:3001", "raw.githubusercontent.com"];

const registryRequests = (
  calls: ReturnType<typeof installMockFetch>["calls"],
) =>
  calls.filter((call) => MODEL_REGISTRY_HOSTS.includes(new URL(call.url).host));

/**
 * The registry is not asked for again for five minutes once it has loaded, and
 * an earlier section may have loaded it from ./config/models.json, the last of
 * its sources. Rewinding the clock makes the next factory call due, as the
 * first call of a fresh process is.
 */
async function makeModelRegistryDue(): Promise<void> {
  const { dynamicModelProvider } = await import("../dist/index.js");
  (dynamicModelProvider as unknown as { lastFetch: number }).lastFetch = 0;
  expect(
    dynamicModelProvider.needsRefresh(),
    "the registry is due for a refresh",
  );
}

async function runDecideRegistryLookups(): Promise<void> {
  const { NeuroLink, AIProviderFactory, DECISION_PROVIDERS } =
    await import("../dist/index.js");
  const registryCase = perplexityCase;
  const ambient = [
    "MODEL_CONFIG_URL",
    "MODEL_CONFIG_GITHUB_REPO",
    "MODEL_CONFIG_GITHUB_BRANCH",
    "OPENAI_MODEL",
  ].map((name) => [name, process.env[name]] as const);
  // The registry's sources are read from the first three when it loads: the
  // hosts below are the defaults. OPENAI_MODEL names the chat provider's model
  // before the registry is consulted, so a developer's .env would hide the
  // positive control's request.
  ambient.forEach(([name]) => setEnv(name, undefined));

  try {
    await registryCase(
      "DECIDE registry: a decision that names no model makes no request but the decision itself, answers as before and is priced as before",
      async () => {
        resetScaleDownEnv();
        await makeModelRegistryDue();
        await withMocks([scaledownRoute()], async ({ calls }) => {
          const nl = new NeuroLink({ conversationMemory: { enabled: false } });
          const result = await nl.decide({
            provider: SCALEDOWN_SPEC.provider,
            state: "short",
            questions: SCALEDOWN_QUESTIONS,
          });
          expectEq(
            registryRequests(calls).length,
            0,
            `requests to ${MODEL_REGISTRY_HOSTS.join(" or ")}`,
          );
          expectEq(
            calls.map((call) => call.url).join(","),
            SCALEDOWN_SPEC.endpoint,
            "the only request is the decision",
          );
          expectEq(result.model, SCALEDOWN_SPEC.model, "the model");
          expect(
            sameJson(result.answers, SCALEDOWN_EXPECTED_ANSWERS),
            "the answers are the reply's",
          );
          const cost = nl
            .getSpans()
            .find((span) => span.type === "model.decision")?.attributes[
            "ai.cost.total"
          ];
          expect(
            typeof cost === "number" &&
              Math.abs(cost - (120 * 0.05) / 1_000_000) < 1e-15,
            `120 input tokens cost 120 x 0.05 / 1e6, got ${String(cost)}`,
          );
        });
      },
    );

    await registryCase(
      "DECIDE registry: no decision provider, by id or by alias, asks for the registry when the factory creates it with no model",
      async () => {
        resetScaleDownEnv();
        const names = DECISION_PROVIDERS.flatMap((descriptor) => [
          String(descriptor.name),
          ...descriptor.aliases,
        ]);
        // Positive control for the loop: the eight providers and their aliases
        // (jev, scaledown-classify, ...), so an emptied list fails here.
        expect(
          names.length >= 8 &&
            ["typesafe", "jev", "scaledown", "scaledown-classify"].every(
              (name) => names.includes(name),
            ),
          `the loop covers every decision provider and alias, got ${names.join(",")}`,
        );
        for (const name of names) {
          await makeModelRegistryDue();
          await withMocks([], async ({ calls }) => {
            // Most are not configured here, so creation may fail; the registry
            // is asked for, if at all, before that.
            await AIProviderFactory.createProvider(
              name,
              undefined,
              false,
            ).catch(() => undefined);
            expectEq(
              registryRequests(calls).length,
              0,
              `${name}: requests to ${MODEL_REGISTRY_HOSTS.join(" or ")}`,
            );
          });
        }
      },
    );

    await registryCase(
      "DECIDE registry: positive control, a chat provider created with no model still asks for the registry, the local port first and GitHub next",
      async () => {
        setEnv("OPENAI_API_KEY", "test-fake-openai-credential");
        await makeModelRegistryDue();
        await withMocks([], async ({ calls }) => {
          await AIProviderFactory.createProvider(
            "openai",
            undefined,
            false,
          ).catch(() => undefined);
          expectEq(
            registryRequests(calls)
              .map((call) => `${call.method} ${call.url}`)
              .join(","),
            "HEAD http://localhost:3001/health,GET http://localhost:3001/api/v1/models,GET https://raw.githubusercontent.com/juspay/neurolink/release/config/models.json",
            "the registry requests of a chat provider",
          );
        });
        await makeModelRegistryDue();
        await withMocks([], async ({ calls }) => {
          await AIProviderFactory.createProvider(
            "openai",
            "gpt-4o-mini",
            false,
          ).catch(() => undefined);
          expectEq(
            registryRequests(calls).length,
            0,
            "a chat provider with a named model asks for nothing",
          );
        });
      },
    );
  } finally {
    ambient.forEach(([name, value]) => setEnv(name, value));
    setEnv("OPENAI_API_KEY", undefined);
  }
}

async function runDecideSection(): Promise<void> {
  console.log(
    "\n=== Decision providers (TypeSafe, Laya, XOR, SubQ, Perplexity, Cloudflare Clef, OpenAI Decisions, ScaleDown) ===",
  );
  // A developer's .env can hold a real Cloudflare token and account id, a SubQ
  // or ScaleDown key, or an OPENAI_API_KEY the openai chat provider reads, which
  // would make Clef, SubQ, OpenAI Decisions or ScaleDown the default decision
  // provider in every section above it that expects none. They are cleared for
  // the whole section and put back after; the Clef, SubQ, OpenAI Decisions and
  // ScaleDown sections set what they need themselves.
  const sharedKeyEnv = [
    "CLOUDFLARE_API_KEY",
    "CLOUDFLARE_ACCOUNT_ID",
    "CLOUDFLARE_CLEF_BASE_URL",
    "CLOUDFLARE_CLEF_MODEL",
    "SUBQ_API_KEY",
    "SUBQ_BASE_URL",
    "SUBQ_MODEL",
    "OPENAI_API_KEY",
    "OPENAI_BASE_URL",
    "OPENAI_API_BASE",
    "OPENAI_DECISIONS_BASE_URL",
    "OPENAI_DECISIONS_MODEL",
    "SCALEDOWN_API_KEY",
    "SCALEDOWN_BASE_URL",
    "SCALEDOWN_MODEL",
  ];
  const ambient = sharedKeyEnv.map((name) => process.env[name]);
  try {
    sharedKeyEnv.forEach((name) => setEnv(name, undefined));
    await runDecideDialect();
    await runTypeSafeDecide();
    await runLayaDecide();
    await runXorDecide();
    await runPerplexityDecide();
    await runCloudflareClefDecide();
    await runSubqDecide();
    await runOpenAIDecisionsDecide();
    await runOpenAIDecisionsSurface();
    await runOpenAIDecisionsAmbientGuard();
    await runScaleDownDecide();
    await runDecideRegistryLookups();
    await runDecideCatalogSection();
  } finally {
    sharedKeyEnv.forEach((name, i) => setEnv(name, ambient[i]));
  }
}

// A provider-returned image URL is downloaded through the proxy the
// environment configures, with no fallback to a direct connection. Ideogram is
// the vehicle (its API call is routed around the proxy with NO_PROXY so the
// suite's fetch mocks still answer it); Recraft and the other safeDownload
// callers share the same download helper.
const PROXY_ENV = [
  "HTTPS_PROXY",
  "https_proxy",
  "HTTP_PROXY",
  "http_proxy",
  "ALL_PROXY",
  "all_proxy",
  "SOCKS_PROXY",
  "socks_proxy",
  "NO_PROXY",
  "no_proxy",
] as const;

function setProxyEnv(proxyUrl: string, noProxy: string): void {
  for (const name of PROXY_ENV) {
    setEnv(name, undefined);
  }
  setEnv("HTTPS_PROXY", proxyUrl);
  setEnv("NO_PROXY", noProxy);
}

// With a proxy the proxy resolves the name, so the SDK must not: answer any
// local lookup with a failure and keep the names it was asked for.
async function withRecordedDns<T>(
  fn: (lookups: string[]) => Promise<T>,
): Promise<T> {
  const original = dnsPromises.lookup;
  const lookups: string[] = [];
  dnsPromises.lookup = (async (host: string) => {
    lookups.push(host);
    throw Object.assign(new Error("lookup refused by the test"), {
      code: "ENOTFOUND",
    });
  }) as unknown as typeof dnsPromises.lookup;
  syncBuiltinESMExports();
  try {
    return await fn(lookups);
  } finally {
    dnsPromises.lookup = original;
    syncBuiltinESMExports();
  }
}

async function runImageDownloadProxy(): Promise<void> {
  const section = "IMG download via proxy";
  setEnv("IDEOGRAM_API_KEY", "test-fake-ideogram-credential");
  const ambient = Object.fromEntries(
    PROXY_ENV.map((name) => [name, process.env[name]]),
  );
  const { NeuroLink } = await import("../dist/index.js");
  const apiRoute = (imageUrl: string) => ({
    method: "POST",
    url: "api.ideogram.ai/v1/ideogram-v3/generate",
    respond: { status: 200, json: { data: [{ url: imageUrl }] } },
  });
  const imageRoute = {
    method: "GET",
    url: `${IDEOGRAM_FIXTURE_HOST}/image.png`,
    respond: {
      status: 200,
      bytes: FAKE_PNG_BYTES,
      contentType: "image/png",
    },
  };
  const generate = () =>
    new NeuroLink({ conversationMemory: { enabled: false } }).generate({
      provider: "ideogram",
      model: "V_3",
      input: { text: "A proxied poster" },
      disableTools: true,
    });
  const failureOf = async (): Promise<string> => {
    try {
      await generate();
    } catch (err) {
      return err instanceof Error ? err.message : String(err);
    }
    return "";
  };

  // ── the download goes through the proxy ─────────────────────────────
  try {
    await withRecordedDns((lookups) =>
      withImageDownloadProxy(async (proxy) => {
        setProxyEnv(proxy.url, "api.ideogram.ai");
        await withMocks(
          [apiRoute(`https://${IDEOGRAM_FIXTURE_HOST}/image.png`), imageRoute],
          async () => {
            const result = await generate();
            expectEq(
              result.imageOutput?.base64,
              FAKE_PNG_BASE64,
              "imageOutput.base64 is the PNG that came through the proxy",
            );
            expectEq(
              proxy.connects.join(","),
              `${IDEOGRAM_FIXTURE_HOST}:443`,
              "the proxy was asked for exactly one tunnel, to the CDN host",
            );
            expect(
              !lookups.includes(IDEOGRAM_FIXTURE_HOST),
              "the SDK did not resolve the CDN host itself",
            );
          },
        );
      }),
    );
    record(
      results,
      `${section}: download is tunnelled through HTTPS_PROXY`,
      true,
    );
  } catch (err) {
    record(
      results,
      `${section}: download is tunnelled through HTTPS_PROXY`,
      false,
      err instanceof Error ? err.message : String(err),
    );
  }

  // ── a proxy that refuses is not bypassed ────────────────────────────
  try {
    await withPublicDns((probe) =>
      withRefusingProxy(async (proxy) => {
        setProxyEnv(proxy.url, "api.ideogram.ai");
        await withMocks(
          [apiRoute(`https://${IDEOGRAM_FIXTURE_HOST}/image.png`), imageRoute],
          async () => {
            const message = await failureOf();
            expect(message.length > 0, "the download failed");
            expectEq(
              proxy.connects.length,
              1,
              "the proxy was asked for the download",
            );
            expectEq(
              probe.pinnedLookups,
              0,
              "no direct connection was made after the proxy refused",
            );
          },
        );
      }),
    );
    record(
      results,
      `${section}: a refusing proxy fails the download, with no direct fallback`,
      true,
    );
  } catch (err) {
    record(
      results,
      `${section}: a refusing proxy fails the download, with no direct fallback`,
      false,
      err instanceof Error ? err.message : String(err),
    );
  }

  // ── NO_PROXY keeps the pinned direct path ───────────────────────────
  try {
    await withPublicDns((probe) =>
      withRefusingProxy(async (proxy) => {
        setProxyEnv(proxy.url, `api.ideogram.ai,${IDEOGRAM_FIXTURE_HOST}`);
        await withMocks(
          [apiRoute(`https://${IDEOGRAM_FIXTURE_HOST}/image.png`), imageRoute],
          async () => {
            const result = await generate();
            expectEq(
              result.imageOutput?.base64,
              FAKE_PNG_BASE64,
              "imageOutput.base64 is the PNG downloaded directly",
            );
            expectEq(
              proxy.connects.length,
              0,
              "a NO_PROXY host is not sent through the proxy",
            );
            expect(
              probe.pinnedLookups > 0,
              "the direct download used the validated DNS lookup",
            );
          },
        );
      }),
    );
    record(
      results,
      `${section}: NO_PROXY keeps the pinned direct download`,
      true,
    );
  } catch (err) {
    record(
      results,
      `${section}: NO_PROXY keeps the pinned direct download`,
      false,
      err instanceof Error ? err.message : String(err),
    );
  }

  // ── names that can only be internal are refused before the proxy ────
  for (const target of [
    "intranet",
    "printer.local",
    "metadata.internal",
    "localhost",
    "169.254.169.254",
  ]) {
    const label = `${section}: an internal download target is refused before any tunnel (${target})`;
    try {
      await withRefusingProxy(async (proxy) => {
        setProxyEnv(proxy.url, "api.ideogram.ai");
        await withMocks([apiRoute(`https://${target}/image.png`)], async () => {
          const message = await failureOf();
          expect(
            /rejected|single-label|internal|blocked/i.test(message),
            "the target was refused by the URL guard",
          );
          expectEq(proxy.connects.length, 0, "no tunnel was requested");
        });
      });
      record(results, label, true);
    } catch (err) {
      record(
        results,
        label,
        false,
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  for (const name of PROXY_ENV) {
    setEnv(name, ambient[name]);
  }
}

async function runImageGenSection(): Promise<void> {
  console.log("\n=== Image-gen providers (Stability / Ideogram / Recraft) ===");
  await runStabilityImageGen();
  await runIdeogramImageGen();
  await runRecraftImageGen();
  await runImageDownloadProxy();
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
          // BaseProvider.providerName now feeds formatProviderError directly
          // instead of a second hand-copied "azure" literal — characterize
          // that the thrown error's .provider still identifies this provider.
          const provider = (err as { provider?: unknown })?.provider;
          record(
            results,
            `${section}: thrown error's .provider identifies this provider`,
            provider === "azure",
            "error.provider did not identify azure",
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
      let fetchCalls = 0;
      globalThis.fetch = async () => {
        fetchCalls += 1;
        return new Response(
          JSON.stringify({ type: "error", error: { type: "rate_limit_error", message: "Rate limited" } }),
          { status: 429, headers: { "content-type": "application/json" } },
        );
      };
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
      // The right error class is not proof the 429 came from the wire.
      if (fetchCalls < 1) {
        console.log("NO_REQUEST");
        process.exit(5);
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
    // · 4 = something threw, but not the failure under test · 5 = the right
    // error, but no request ever reached fetch. Only 0 counts.
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

  // ── Claude 5.5 / 5.1 answer a forced tool_choice with a 400 (probed live
  // on Vertex 2026-09-29), so a caller's "required" and the schema path's
  // pinned json tool go out as auto for them, and unchanged for Sonnet 5. ──
  const { z } = await import("zod");
  const lookupTools = {
    lookup: {
      description: "Look a value up",
      inputSchema: jsonSchema<{ q: string }>({
        type: "object",
        properties: { q: { type: "string" } },
        required: ["q"],
      }),
      execute: async () => ({ value: "x" }),
    },
  };
  for (const [shapeModel, expected] of [
    ["claude-sonnet-5-5", "auto"],
    ["claude-sonnet-5", "any"],
  ] as const) {
    const name = `${section}: toolChoice "required" goes out as ${expected} for ${shapeModel}`;
    try {
      await withMocks(
        [
          {
            method: "POST",
            url: "api.anthropic.com/v1/messages",
            respond: {
              status: 200,
              json: anthropicMessageResponse("done", shapeModel),
            },
          },
        ],
        async ({ calls }) => {
          const nl = new NeuroLink({ conversationMemory: { enabled: false } });
          await nl.generate({
            provider: "anthropic",
            model: shapeModel,
            input: { text: "ping" },
            toolChoice: "required",
            maxSteps: 1,
            tools: lookupTools,
          });
          const body = calls[0]?.bodyJson as
            | { tool_choice?: { type?: string } }
            | undefined;
          record(
            results,
            name,
            calls.length > 0 && body?.tool_choice?.type === expected,
            `first request carried tool_choice ${body?.tool_choice?.type ?? "none"}`,
          );
        },
      );
    } catch (err) {
      record(
        results,
        name,
        false,
        err instanceof Error ? err.message : String(err),
      );
    }
  }
  for (const [shapeModel, forced] of [
    ["claude-sonnet-5-5", false],
    ["claude-sonnet-5", true],
  ] as const) {
    const name = `${section}: a schema call ${forced ? "pins" : "does not pin"} its json tool for ${shapeModel}`;
    try {
      await withMocks(
        [
          {
            method: "POST",
            url: "api.anthropic.com/v1/messages",
            respond: {
              status: 200,
              json: anthropicMessageResponse('{"answer":"x"}', shapeModel),
            },
          },
        ],
        async ({ calls }) => {
          const nl = new NeuroLink({ conversationMemory: { enabled: false } });
          await nl.generate({
            provider: "anthropic",
            model: shapeModel,
            input: { text: "ping" },
            schema: z.object({ answer: z.string() }),
            disableTools: true,
          });
          const body = calls[0]?.bodyJson as
            | { tool_choice?: { type?: string }; system?: unknown }
            | undefined;
          const instructed = JSON.stringify(body?.system ?? "").includes(
            "IMPORTANT: You MUST call the",
          );
          const ok = forced
            ? body?.tool_choice?.type === "tool"
            : calls.length > 0 && body?.tool_choice === undefined && instructed;
          record(
            results,
            name,
            ok,
            `tool_choice ${body?.tool_choice?.type ?? "none"}, instruction ${instructed ? "present" : "absent"}`,
          );
        },
      );
    } catch (err) {
      record(
        results,
        name,
        false,
        err instanceof Error ? err.message : String(err),
      );
    }
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
// Section: tool-free structured-output re-ask billing.
// Every upstream request is billed, including the ones whose ANSWER this
// provider discards. The rejection path is the one that hides: the re-ask
// runs, the vendor charges for it, and the answer is thrown away because it
// still is not the object — so a turn that made four requests must not
// report the cost of two.
// ───────────────────────────────────────────────────────────────────────

const REASK_PROMPT_TOKENS = 10;
const REASK_COMPLETION_TOKENS = 1;

function billedChatReply(
  model: string,
  message: Record<string, unknown>,
  finishReason: string,
): unknown {
  return {
    id: "chatcmpl-mock",
    object: "chat.completion",
    created: 0,
    model,
    choices: [{ index: 0, message, finish_reason: finishReason }],
    usage: {
      prompt_tokens: REASK_PROMPT_TOKENS,
      completion_tokens: REASK_COMPLETION_TOKENS,
      total_tokens: REASK_PROMPT_TOKENS + REASK_COMPLETION_TOKENS,
    },
  };
}

async function runStructuredReaskBillingSection(): Promise<void> {
  const section = "LLM deepseek (structured re-ask billing)";
  console.log(`\n=== ${section} ===`);

  // DeepSeek, not OpenAI: the re-ask only exists on providers that suppress
  // response_format while tools ride along. OpenAI and Azure override
  // suppressResponseFormatWithTools() to false and send the schema with the
  // tools, so this whole branch is unreachable there — a test driven through
  // them would assert nothing.
  const model = "deepseek-chat";
  setEnv("DEEPSEEK_API_KEY", "test-fake-deepseek-credential");
  setEnv("DEEPSEEK_BASE_URL", undefined);

  const { NeuroLink } = await import("../dist/index.js");
  const { z } = await import("zod");

  // Four scripted turns, each billed identically, driving the path where the
  // re-ask is REJECTED rather than accepted:
  //   1. tools ride along, so response_format is suppressed → tool call
  //   2. the tool result comes back as prose — not the object
  //   3. the tools-free re-ask answers JSON of a shape it invented, so the
  //      schema never reached the model (the DeepSeek shape)
  //   4. the schema-in-the-prompt retry still answers prose
  // Turn 4 fails the acceptance check, the prose answer from turn 2 is kept,
  // and all four requests have been paid for.
  const turns: Array<{ message: Record<string, unknown>; finish: string }> = [
    {
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
      finish: "tool_calls",
    },
    { message: { role: "assistant", content: "It is 68." }, finish: "stop" },
    {
      message: {
        role: "assistant",
        content: JSON.stringify({ type: "json_object" }),
      },
      finish: "stop",
    },
    {
      message: { role: "assistant", content: "Still 68, in words." },
      finish: "stop",
    },
  ];

  try {
    let turn = 0;
    await withMocks(
      [
        {
          method: "POST",
          url: "api.deepseek.com",
          respond: () => {
            const scripted = turns[Math.min(turn, turns.length - 1)];
            turn += 1;
            return {
              status: 200,
              json: billedChatReply(model, scripted.message, scripted.finish),
            };
          },
        },
      ],
      async ({ calls }) => {
        const nl = new NeuroLink({ conversationMemory: { enabled: false } });
        const result = await nl.generate({
          provider: "deepseek",
          model,
          input: { text: "What is 17 times 4? Use the multiply tool." },
          schema: z.object({ answer: z.string() }),
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

        // Precondition: without this the usage assertion below is vacuous —
        // a run where the re-ask never fired would satisfy it trivially.
        expect(
          calls.length > 2,
          `expected the tool-free re-ask to run — saw ${calls.length} upstream request(s)`,
        );

        // Every scripted reply bills the same, so the reported total is a
        // request count in disguise. That is the whole assertion: a discarded
        // answer is still a paid request.
        expectEq(
          result.usage?.input,
          REASK_PROMPT_TOKENS * calls.length,
          `reported input tokens across ${calls.length} upstream request(s)`,
        );
        expectEq(
          result.usage?.output,
          REASK_COMPLETION_TOKENS * calls.length,
          `reported output tokens across ${calls.length} upstream request(s)`,
        );
      },
    );
    record(results, `${section}: a rejected re-ask is still billed`, true);
  } catch (err) {
    record(
      results,
      `${section}: a rejected re-ask is still billed`,
      false,
      err instanceof Error ? err.message : String(err),
    );
  }
}

// ───────────────────────────────────────────────────────────────────────
// Section: DeepSeek image input follows the catalog's per-model vision flag.
// deepseek-flash reads images (live-probed 2026-09-24); deepseek-v4-pro
// answers 200 to an image but describes a scene that isn't there, so the SDK
// must refuse to send it one rather than let the model make something up.
// ───────────────────────────────────────────────────────────────────────

async function runDeepSeekImageInputSection(): Promise<void> {
  const section = "LLM deepseek (image input)";
  console.log(`\n=== ${section} ===`);
  setEnv("DEEPSEEK_API_KEY", "test-fake-deepseek-credential");
  setEnv("DEEPSEEK_BASE_URL", undefined);

  const { NeuroLink } = await import("../dist/index.js");
  const png = readFileSync(
    join(import.meta.dirname, "fixtures", "sample-screenshot.png"),
  );
  const routes = [
    {
      method: "POST",
      url: "api.deepseek.com",
      respond: {
        status: 200,
        json: billedChatReply(
          "deepseek-flash",
          { role: "assistant", content: "Blue." },
          "stop",
        ),
      },
    },
  ];
  const sentAnImage = (bodyJson: unknown): boolean =>
    JSON.stringify(bodyJson ?? null).includes('"image_url"');

  try {
    await withMocks(routes, async ({ calls }) => {
      const nl = new NeuroLink({ conversationMemory: { enabled: false } });
      await nl.generate({
        provider: "deepseek",
        model: "deepseek-flash",
        input: { text: "What colour is this?", images: [png] },
      });
      expect(calls.length > 0, "deepseek-flash made no upstream request");
      expect(
        sentAnImage(calls[0].bodyJson),
        "deepseek-flash request carried no image_url part",
      );
    });
    record(results, `${section}: deepseek-flash sends the image`, true);
  } catch (err) {
    record(
      results,
      `${section}: deepseek-flash sends the image`,
      false,
      err instanceof Error ? err.message : String(err),
    );
  }

  try {
    await withMocks(routes, async ({ calls }) => {
      const nl = new NeuroLink({ conversationMemory: { enabled: false } });
      const threw = await nl
        .generate({
          provider: "deepseek",
          model: "deepseek-v4-pro",
          input: { text: "What colour is this?", images: [png] },
        })
        .then(
          () => false,
          () => true,
        );
      expect(
        !calls.some((call) => sentAnImage(call.bodyJson)),
        "an image reached deepseek-v4-pro",
      );
      expect(threw, "generate() accepted an image for deepseek-v4-pro");
    });
    record(results, `${section}: deepseek-v4-pro refuses the image`, true);
  } catch (err) {
    record(
      results,
      `${section}: deepseek-v4-pro refuses the image`,
      false,
      err instanceof Error ? err.message : String(err),
    );
  }
}

// ───────────────────────────────────────────────────────────────────────
// Section: the schema-in-the-prompt retry is billed on top of the turn.
//
// The sibling of the section above, on the branch taken by the providers
// that do NOT suppress response_format — OpenAI and Azure. There the schema
// rides along with the tools, so there is no tool-free re-ask; the recovery
// is a single retry with the schema spelled into the prompt, fired when the
// answer comes back off-schema. That retry REPLACED the turn's result, and
// with it the tool phase's token counts: a three-request turn reported one
// request's usage. The tool phase's call had already returned successfully,
// so its usage was in hand at the moment it was dropped.
// ───────────────────────────────────────────────────────────────────────

async function runSchemaRetryBillingSection(): Promise<void> {
  const section = "LLM openai (schema-retry billing)";
  console.log(`\n=== ${section} ===`);

  const model = "gpt-4o-mini";
  setEnv("OPENAI_API_KEY", "test-fake-openai-credential");
  setEnv("OPENAI_BASE_URL", undefined);

  const { NeuroLink } = await import("../dist/index.js");
  const { z } = await import("zod");

  // 1. response_format rides along with the tools → tool call
  // 2. the tool result comes back as prose, not the object → outcome retry
  // 3. the schema-in-the-prompt retry answers prose as well
  // The turn keeps turn 3's answer and has paid for all three requests.
  const turns: Array<{ message: Record<string, unknown>; finish: string }> = [
    {
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
      finish: "tool_calls",
    },
    { message: { role: "assistant", content: "It is 68." }, finish: "stop" },
    {
      message: { role: "assistant", content: "Still 68, in words." },
      finish: "stop",
    },
  ];

  try {
    let turn = 0;
    await withMocks(
      [
        {
          method: "POST",
          url: "api.openai.com/v1/chat/completions",
          respond: () => {
            const scripted = turns[Math.min(turn, turns.length - 1)];
            turn += 1;
            return {
              status: 200,
              json: billedChatReply(model, scripted.message, scripted.finish),
            };
          },
        },
      ],
      async ({ calls }) => {
        const nl = new NeuroLink({ conversationMemory: { enabled: false } });
        const result = await nl.generate({
          provider: "openai",
          model,
          input: { text: "What is 17 times 4? Use the multiply tool." },
          schema: z.object({ answer: z.string() }),
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

        // Precondition: the tool phase alone is two requests. Without a third
        // the retry never fired and the assertion below proves nothing.
        expect(
          calls.length > 2,
          `expected the schema-in-the-prompt retry to run — saw ${calls.length} upstream request(s)`,
        );

        expectEq(
          result.usage?.input,
          REASK_PROMPT_TOKENS * calls.length,
          `reported input tokens across ${calls.length} upstream request(s)`,
        );
        expectEq(
          result.usage?.output,
          REASK_COMPLETION_TOKENS * calls.length,
          `reported output tokens across ${calls.length} upstream request(s)`,
        );
      },
    );
    record(results, `${section}: the retry is billed on top of the turn`, true);
  } catch (err) {
    record(
      results,
      `${section}: the retry is billed on top of the turn`,
      false,
      err instanceof Error ? err.message : String(err),
    );
  }
}

// ───────────────────────────────────────────────────────────────────────
// Section: OpenAI strict structured-output gate.
//
// `response_format.json_schema.strict` may be true only for a schema OpenAI's
// strict mode accepts. The costs are lopsided: a false positive fails the
// request at the vendor (the caller only recovers through the schema-in-the-
// prompt retry), a false negative merely forgoes constrained decoding. So the
// gate has to say no to every construct strict mode refuses — a oneOf union,
// a root that is not a plain object, and the keywords it lists as unsupported
// — while still saying yes to a schema it does accept (nested anyOf included).
// ───────────────────────────────────────────────────────────────────────

async function runOpenAIStrictGateSection(): Promise<void> {
  const section = "LLM openai (strict schema gate)";
  console.log(`\n=== ${section} ===`);

  const model = "gpt-4o-mini";
  setEnv("OPENAI_API_KEY", "test-fake-openai-credential");
  setEnv("OPENAI_BASE_URL", undefined);

  const { NeuroLink } = await import("../dist/index.js");
  const { z } = await import("zod");

  // A strict-legal object: closed, every property required.
  const closed = (
    properties: Record<string, unknown>,
  ): Record<string, unknown> => ({
    type: "object",
    properties,
    required: Object.keys(properties),
    additionalProperties: false,
  });
  // Wraps one offending node inside an otherwise strict-legal root, so the
  // keyword under test is the only reason the gate could say no.
  const nested = (node: Record<string, unknown>) =>
    jsonSchema<unknown>(closed({ value: node }));
  const unchangedOneOf: JSONSchema7 = {
    type: "object",
    properties: { value: { oneOf: [{ type: "string" }, { type: "number" }] } },
    required: ["value"],
  };
  const unchangedRootAnyOf: JSONSchema7 = {
    type: "object",
    anyOf: [
      {
        type: "object",
        properties: { a: { type: "string" } },
        required: ["a"],
      },
      {
        type: "object",
        properties: { b: { type: "string" } },
        required: ["b"],
      },
    ],
  };

  const containsKey = (value: unknown, key: string): boolean => {
    if (Array.isArray(value)) {
      return value.some((entry) => containsKey(entry, key));
    }
    if (!value || typeof value !== "object") {
      return false;
    }
    const record = value as Record<string, unknown>;
    return (
      key in record ||
      Object.values(record).some((entry) => containsKey(entry, key))
    );
  };

  const cases: Array<{
    name: string;
    schema: ZodType | ReturnType<typeof jsonSchema<unknown>>;
    strict: boolean;
    expectedSchema?: JSONSchema7;
    expectKeyword?: string;
  }> = [
    {
      name: "a closed all-required object stays strict",
      schema: jsonSchema<unknown>(closed({ city: { type: "string" } })),
      strict: true,
    },
    {
      name: "a nested anyOf union stays strict",
      schema: z.object({ value: z.union([z.string(), z.number()]) }),
      strict: true,
    },
    {
      name: "string length constraints stay strict on base models",
      schema: z.object({ value: z.string().min(2).max(10) }),
      strict: true,
    },
    {
      name: "a local non-recursive reference stays strict",
      schema: jsonSchema<unknown>({
        ...closed({ value: { $ref: "#/$defs/value" } }),
        $defs: { value: closed({ city: { type: "string" } }) },
      }),
      strict: true,
    },
    {
      name: "a nested discriminated union (oneOf) is not strict",
      schema: z.object({
        shape: z.discriminatedUnion("kind", [
          z.object({ kind: z.literal("a"), x: z.string() }),
          z.object({ kind: z.literal("b"), y: z.number() }),
        ]),
      }),
      strict: false,
      expectKeyword: "oneOf",
    },
    {
      name: "a non-strict oneOf schema is sent without closing its objects",
      schema: jsonSchema<unknown>(unchangedOneOf),
      strict: false,
      expectedSchema: unchangedOneOf,
    },
    {
      name: "a root object carrying anyOf is sent unchanged and non-strict",
      schema: jsonSchema<unknown>(unchangedRootAnyOf),
      strict: false,
      expectedSchema: unchangedRootAnyOf,
    },
    {
      name: "a root discriminated union (oneOf) is not strict",
      schema: z.discriminatedUnion("kind", [
        z.object({ kind: z.literal("a") }),
        z.object({ kind: z.literal("b") }),
      ]),
      strict: false,
      expectKeyword: "oneOf",
    },
    {
      name: "a root union (anyOf) is not strict",
      schema: z.union([
        z.object({ a: z.string() }),
        z.object({ b: z.string() }),
      ]),
      strict: false,
      expectKeyword: "anyOf",
    },
    {
      name: "a root array is not strict",
      schema: z.array(z.string()),
      strict: false,
    },
    {
      name: "a root string is not strict",
      schema: z.string(),
      strict: false,
    },
    {
      name: "a tuple (draft-07 items array) is not strict",
      schema: z.object({ pair: z.tuple([z.string(), z.number()]) }),
      strict: false,
    },
    {
      name: "a literal draft-07 items array is not strict",
      schema: jsonSchema<unknown>(
        closed({
          pair: {
            type: "array",
            items: [{ type: "string" }, { type: "number" }],
          },
        }),
      ),
      strict: false,
    },
    {
      name: "dependentRequired is not strict",
      schema: nested({
        type: "object",
        properties: { a: { type: "string" }, b: { type: "string" } },
        required: ["a", "b"],
        additionalProperties: false,
        dependentRequired: { a: ["b"] },
      }),
      strict: false,
    },
    {
      name: "dependentSchemas is not strict",
      schema: nested({
        type: "object",
        properties: { a: { type: "string" } },
        required: ["a"],
        additionalProperties: false,
        dependentSchemas: { a: { required: ["a"] } },
      }),
      strict: false,
    },
    {
      name: "patternProperties is not strict",
      schema: nested({
        type: "object",
        properties: {},
        required: [],
        additionalProperties: false,
        patternProperties: { "^x-": { type: "string" } },
      }),
      strict: false,
    },
    {
      name: "uniqueItems is not strict",
      schema: nested({
        type: "array",
        items: { type: "string" },
        uniqueItems: true,
      }),
      strict: false,
    },
    {
      name: "prefixItems is not strict",
      schema: nested({
        type: "array",
        prefixItems: [{ type: "string" }, { type: "number" }],
      }),
      strict: false,
    },
  ];

  for (const c of cases) {
    const label = `${section}: ${c.name}`;
    try {
      await withMocks(
        [
          {
            method: "POST",
            url: "api.openai.com/v1/chat/completions",
            respond: {
              status: 200,
              json: openAIChatResponse(JSON.stringify({}), model),
            },
          },
        ],
        async ({ calls }) => {
          const nl = new NeuroLink({ conversationMemory: { enabled: false } });
          // The mocked answer is not guaranteed to satisfy every schema above,
          // and a schema-invalid answer only triggers the prompt-side retry —
          // the gate is read off the FIRST request, so the outcome is moot.
          await nl
            .generate({
              provider: "openai",
              model,
              input: { text: "answer in the declared shape" },
              schema: c.schema,
              disableTools: true,
            })
            .catch(() => undefined);

          expect(calls.length > 0, "a chat request was captured");
          const body = calls[0].bodyJson as {
            response_format?: {
              type?: string;
              json_schema?: { strict?: boolean; schema?: unknown };
            };
          };
          expectEq(
            body.response_format?.type,
            "json_schema",
            "first request carries a json_schema response_format",
          );
          if (c.expectKeyword) {
            expect(
              containsKey(
                body.response_format?.json_schema?.schema,
                c.expectKeyword,
              ),
              "wire schema lacks the construct under test",
            );
          }
          expectEq(
            body.response_format?.json_schema?.strict,
            c.strict,
            "response_format.json_schema.strict",
          );
          if (c.expectedSchema) {
            expectEq(
              JSON.stringify(body.response_format?.json_schema?.schema),
              JSON.stringify(c.expectedSchema),
              "non-strict schema stays unchanged",
            );
          }
        },
      );
      record(results, label, true);
    } catch (err) {
      record(
        results,
        label,
        false,
        err instanceof Error ? err.message : String(err),
      );
    }
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
// Section: invalid-model fallback for a request that carries an image.
//
// A catalog orders `fallbacks` for text. When Fireworks stopped serving its
// vision default, the nightly matrix's image request fell back to the
// text-only gpt-oss-120b, the vision guard rejected it, and the caller got
// that guard error — naming the fallback, not the retired model. An image
// request must only move to a vision-capable fallback, and with none left
// must surface the original invalid-model error.
// ───────────────────────────────────────────────────────────────────────

async function runVisionModelFallbackSection(): Promise<void> {
  const section = "LLM fireworks (vision invalid-model fallback)";
  console.log(`\n=== ${section} ===`);

  setEnv("FIREWORKS_API_KEY", "test-fake-fireworks-credential");
  setEnv("FIREWORKS_BASE_URL", undefined);
  const { NeuroLink } = await import("../dist/index.js");
  const png = readFileSync(
    join(import.meta.dirname, "fixtures", "sample-screenshot.png"),
  );
  const fw = (id: string) => `accounts/fireworks/models/${id}`;
  const textOnly = [fw("gpt-oss-120b"), fw("glm-5p3")];
  const notDeployed = {
    status: 404,
    json: {
      error: {
        object: "error",
        type: "invalid_request_error",
        code: "NOT_FOUND",
        message: "Model not found, inaccessible, and/or not deployed",
      },
    },
  };
  const fireworksRoute = (dead: string[], requested: string[]) => ({
    method: "POST",
    url: "api.fireworks.ai",
    respond: (req: { bodyJson?: unknown }) => {
      const model = String((req.bodyJson as { model?: string })?.model ?? "");
      requested.push(model);
      return dead.includes(model)
        ? notDeployed
        : { status: 200, json: openAIChatResponse("blue", model) };
    },
  });

  try {
    const requested: string[] = [];
    await withMocks([fireworksRoute([fw("kimi-k3")], requested)], async () => {
      const nl = new NeuroLink({ conversationMemory: { enabled: false } });
      const result = await nl.generate({
        provider: "fireworks",
        model: fw("kimi-k3"),
        input: { text: "What colour is this?", images: [png] },
        disableTools: true,
      });
      expectEq(requested[0], fw("kimi-k3"), "first attempt uses kimi-k3");
      expect(
        requested.includes(fw("qwen3p8-max")),
        "the retry moved to the vision-capable qwen3p8-max",
      );
      expect(
        requested.every((model) => !textOnly.includes(model)),
        "no request went to a text-only fallback",
      );
      expect(
        (result.content ?? "").toLowerCase().includes("blue"),
        "caller receives the vision fallback's answer",
      );
    });
    record(
      results,
      `${section}: image request skips text-only fallbacks`,
      true,
    );
  } catch (err) {
    record(
      results,
      `${section}: image request skips text-only fallbacks`,
      false,
      err instanceof Error ? err.message : String(err),
    );
  }

  try {
    const requested: string[] = [];
    await withMocks(
      [fireworksRoute([fw("kimi-k3"), fw("qwen3p8-max")], requested)],
      async () => {
        const nl = new NeuroLink({ conversationMemory: { enabled: false } });
        let message = "";
        try {
          await nl.generate({
            provider: "fireworks",
            model: fw("kimi-k3"),
            input: { text: "What colour is this?", images: [png] },
            disableTools: true,
          });
        } catch (error) {
          message = error instanceof Error ? error.message : String(error);
        }
        expect(
          message !== "",
          "generate() rejects when no vision model is left",
        );
        expect(
          !/does not support vision/i.test(message),
          "the error is the invalid-model error, not the vision guard",
        );
        expect(
          requested.every((model) => !textOnly.includes(model)),
          "no request went to a text-only fallback",
        );
      },
    );
    record(
      results,
      `${section}: no vision fallback left surfaces the invalid-model error`,
      true,
    );
  } catch (err) {
    record(
      results,
      `${section}: no vision fallback left surfaces the invalid-model error`,
      false,
      err instanceof Error ? err.message : String(err),
    );
  }

  try {
    const requested: string[] = [];
    await withMocks(
      [
        {
          method: "POST",
          url: "api.fireworks.ai",
          respond: (req: { bodyJson?: unknown }) => {
            const model = String(
              (req.bodyJson as { model?: string })?.model ?? "",
            );
            requested.push(model);
            if (model === fw("kimi-k3")) {
              return notDeployed;
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
                      delta: { content: "blue" },
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
          provider: "fireworks",
          model: fw("kimi-k3"),
          input: { text: "What colour is this?", images: [png] },
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
          requested.includes(fw("qwen3p8-max")),
          "the stream retry moved to the vision-capable qwen3p8-max",
        );
        expect(
          requested.every((model) => !textOnly.includes(model)),
          "no stream request went to a text-only fallback",
        );
        expect(text.includes("blue"), "consumer receives the streamed answer");
      },
    );
    record(results, `${section}: image stream skips text-only fallbacks`, true);
  } catch (err) {
    record(
      results,
      `${section}: image stream skips text-only fallbacks`,
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
// Section: classifier-provider-name — ProviderError#provider identity for
// providers built on the shared OpenAIChatCompletionsProvider base
// (deepseek, huggingface, llamacpp, lm-studio, nvidia-nim, ollama,
// openrouter, openai-compatible). BaseProvider.providerName now feeds
// classifyProviderError() directly instead of duplicating each provider's
// canonical name as a second hand-copied literal; every constructor still
// passes that literal to super(), so a name drifting between the two
// would previously have gone unnoticed. Uses per-call `credentials`
// overrides (not env vars) so each case is fully isolated and doesn't
// depend on a provider's own env-var-derivation conventions.
// ───────────────────────────────────────────────────────────────────────

type ProviderErrorFieldSpec = {
  /** Canonical AIProviderName string expected on the thrown error's `.provider`. */
  provider: string;
  /** Key into NeurolinkCredentials for a per-call override. */
  credentialsKey: string;
  model: string;
};

const PROVIDER_ERROR_FIELD_SPECS: ProviderErrorFieldSpec[] = [
  { provider: "deepseek", credentialsKey: "deepseek", model: "deepseek-chat" },
  {
    provider: "huggingface",
    credentialsKey: "huggingFace",
    model: "meta-llama/Llama-3.1-8B-Instruct",
  },
  { provider: "llamacpp", credentialsKey: "llamacpp", model: "local-model" },
  { provider: "lm-studio", credentialsKey: "lmStudio", model: "local-model" },
  {
    provider: "nvidia-nim",
    credentialsKey: "nvidiaNim",
    model: "meta/llama-3.1-8b-instruct",
  },
  { provider: "ollama", credentialsKey: "ollama", model: "llama3" },
  {
    provider: "openrouter",
    credentialsKey: "openrouter",
    model: "openai/gpt-4o-mini",
  },
  {
    provider: "openai-compatible",
    credentialsKey: "openaiCompatible",
    model: "gpt-4o-mini",
  },
];

async function runProviderErrorFieldSection(): Promise<void> {
  console.log(
    "\n=== LLM error identity (.provider field) — deepseek/huggingface/llamacpp/lm-studio/nvidia-nim/ollama/openrouter/openai-compatible ===",
  );
  const { NeuroLink } = await import("../dist/index.js");

  for (const spec of PROVIDER_ERROR_FIELD_SPECS) {
    const section = `LLM ${spec.provider}`;
    const title = `${section}: thrown error's .provider identifies this provider`;
    const baseURL = `https://mock-${spec.provider}.test/v1`;
    try {
      await withMocks(
        [
          {
            method: "POST",
            url: `mock-${spec.provider}.test`,
            respond: {
              status: 401,
              json: {
                error: { message: "Invalid API key", type: "auth_error" },
              },
            },
          },
        ],
        async () => {
          const nl = new NeuroLink({ conversationMemory: { enabled: false } });
          const credentials = {
            [spec.credentialsKey]: {
              apiKey: `test-fake-${spec.provider}-credential`,
              baseURL,
            },
          } as NeurolinkCredentials;
          try {
            await nl.generate({
              provider: spec.provider,
              model: spec.model,
              input: { text: "ping" },
              disableTools: true,
              credentials,
            });
            record(results, title, false, "no error thrown");
          } catch (err) {
            const provider = (err as { provider?: unknown })?.provider;
            record(
              results,
              title,
              provider === spec.provider,
              `error.provider did not identify ${spec.provider}`,
            );
          }
        },
      );
    } catch (err) {
      record(
        results,
        title,
        false,
        err instanceof Error ? err.message : String(err),
      );
    }
  }
}

// ───────────────────────────────────────────────────────────────────────
// Section: wrapper-message — single-provider failure is reported by name,
// not as a generic "all providers" failure. directProviderGeneration()'s
// post-loop epilogue used to throw the same
// "Failed to generate text with all providers. Last error: ..." wording
// unconditionally, even when providersToTry had exactly one entry (an
// explicit provider, or disableInternalFallback). It now branches on
// providersToTry.length === 1 and names the single provider instead. The
// multi-provider wording is deliberately left unchanged (so existing
// message-matching suites keep passing) — there is nothing new to
// characterize on that side of the branch.
// ───────────────────────────────────────────────────────────────────────

async function runSingleProviderWrapperMessageSection(): Promise<void> {
  const section = "wrapper-message";
  console.log(`\n=== ${section} ===`);
  const { NeuroLink } = await import("../dist/index.js");
  const model = "gpt-4o-mini";

  // A 429 is retryable at the orchestration layer, so (unlike a 401, which
  // is non-retryable and propagates immediately) it reaches the post-loop
  // epilogue where the single-vs-multi-provider wording branches.
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
            disableInternalFallback: true,
          });
          record(
            results,
            `${section}: a single explicit provider's failure names that provider`,
            false,
            "no error thrown",
          );
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          const namesTheProvider = /\bProvider openai failed:/.test(msg);
          const doesNotClaimAllProviders = !/all providers/i.test(msg);
          record(
            results,
            `${section}: a single explicit provider's failure names that provider`,
            namesTheProvider && doesNotClaimAllProviders,
            `msg='${msg.slice(0, 160)}'`,
          );
        }
      },
    );
  } catch (err) {
    record(
      results,
      `${section}: a single explicit provider's failure names that provider`,
      false,
      err instanceof Error ? err.message : String(err),
    );
  }
}

// ───────────────────────────────────────────────────────────────────────
// Section: dist-instanceof — classifyProviderError's output classes
// (AuthenticationError, RateLimitError, ...) are now re-exported at
// src/lib/index.ts alongside the pre-existing client/errors.ts family, so
// a consumer importing only from the built package entry can
// `instanceof`-check a thrown error. The prior all-src contract suite
// (continuous-test-suite-error-classifier-contract.ts) proved the
// classifier's internal behavior but could not prove the class survives
// the dist bundling boundary — this proves that specifically.
// ───────────────────────────────────────────────────────────────────────

async function runDistErrorClassInstanceofSection(): Promise<void> {
  const section = "dist-instanceof";
  console.log(`\n=== ${section} ===`);
  // Deliberately from the root barrel, not "../dist/types/index.js" (which
  // the Vertex/Bedrock sections above already use, and which always
  // exported these classes) — the fix under test is specifically that
  // AuthenticationError/RateLimitError are now re-exported from the
  // package's main entry. If that re-export were removed, this import
  // itself would fail to typecheck under `pnpm run check`, independent of
  // the runtime instanceof assertions below.
  const { NeuroLink, AuthenticationError, RateLimitError } =
    await import("../dist/index.js");
  const model = "gpt-4o-mini";

  try {
    await withMocks(
      [
        {
          method: "POST",
          url: "api.openai.com/v1/chat/completions",
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
            provider: "openai",
            model,
            input: { text: "ping" },
            disableTools: true,
          });
          record(
            results,
            `${section}: a 401 through dist/index.js's own AuthenticationError passes instanceof`,
            false,
            "no error thrown",
          );
        } catch (err) {
          record(
            results,
            `${section}: a 401 through dist/index.js's own AuthenticationError passes instanceof`,
            err instanceof AuthenticationError,
            `error constructor was ${err instanceof Error ? err.constructor.name : typeof err}`,
          );
        }
      },
    );
  } catch (err) {
    record(
      results,
      `${section}: a 401 through dist/index.js's own AuthenticationError passes instanceof`,
      false,
      err instanceof Error ? err.message : String(err),
    );
  }

  // A 429 cannot be driven through generate() the way the 401 case above
  // is: RateLimitError is retryable, so directProviderGeneration's
  // post-loop epilogue (neurolink.ts, the same one wrapper-message
  // touches) always rewraps it into a brand-new generic `Error` once
  // retries are exhausted — that rewrap is pre-existing, unrelated
  // behavior (see continuous-test-suite-openai-compat-catalog.ts's header
  // comment, which documents and relies on it elsewhere), not something
  // this item changes.
  //
  // Correction from an earlier draft: `classifyProviderError` is NOT a
  // single function re-exported once from the root barrel — there are two
  // unrelated functions of that same name. `src/lib/index.ts`'s root
  // export (line ~1109) re-exports the one-arg `modelPool.ts` variant,
  // which returns a coarse `ProviderErrorClass` *string* (e.g.
  // "rate_limit"), never an Error instance — asserting `instanceof
  // RateLimitError` against it fails structurally, not because of a
  // regression. The rules-based classifier this item is actually about
  // lives in `errorClassifier.ts` and is not re-exported from the root
  // barrel at all, so — per the same "sibling dist file" precedent used
  // for `getCatalogJsonEntries` below — it's imported from its own
  // compiled module. Checking its output `instanceof RateLimitError`
  // against the class imported from the root `dist/index.js` barrel is
  // exactly the cross-module-graph check this item's fix is about: it
  // fails if errorClassifier.ts's `RateLimitError` and the root barrel's
  // `RateLimitError` were ever two different compiled copies (the
  // dist/lib-duplicate class of bug this same section's header discusses).
  //
  // Must use errorClassifier.ts's own DEFAULT_ERROR_RULES here, not a rule
  // built locally with the root-barrel RateLimitError as its errorClass —
  // handing classifyProviderError a rule whose errorClass already IS the
  // class under test makes `new rule.errorClass(...) instanceof
  // RateLimitError` true by construction, regardless of whether
  // errorClassifier.ts's compiled module actually shares that class. Using
  // the classifier's real built-in rule set is what makes this assertion
  // capable of failing when the two copies diverge.
  try {
    const { classifyProviderError, DEFAULT_ERROR_RULES } =
      await import("../dist/utils/errorClassifier.js");
    const classified = classifyProviderError(
      Object.assign(new Error("Rate limit reached"), { statusCode: 429 }),
      DEFAULT_ERROR_RULES,
      "openai",
      model,
    );
    record(
      results,
      `${section}: a 429 through dist/index.js's own RateLimitError passes instanceof`,
      classified instanceof RateLimitError,
      `classifyProviderError's output constructor was ${classified.constructor.name}`,
    );
  } catch (err) {
    record(
      results,
      `${section}: a 429 through dist/index.js's own RateLimitError passes instanceof`,
      false,
      err instanceof Error ? err.message : String(err),
    );
  }
}

// ───────────────────────────────────────────────────────────────────────
// Section: catalog-mutable-array — getCatalogJsonEntries() returns a
// frozen shallow copy instead of the module-singleton array by reference,
// so a caller mutating the returned array (push/sort/index-assignment)
// can no longer corrupt catalog state for the rest of the process.
//
// getCatalogJsonEntries is not re-exported from src/lib/index.ts (dist/
// index.js), so there is no root-barrel public-SDK surface to drive this
// through generate()/stream()/the CLI. This imports the loader directly
// from its own compiled module under dist/ — the same "sibling dist file,
// not dist/index.js" precedent this suite already uses for
// CATALOG_JSON_ENTRIES (see buildOpenAICompatProviders above) — rather
// than skipping outright, since the file is a genuine build artifact and
// the property is otherwise meaningful and easy to regress silently.
// ───────────────────────────────────────────────────────────────────────

// Fuller nested shape than the file-wide `CatalogJsonEntry` mirror above —
// only needed here, to exercise deep-freeze on `aliases` and
// `models.fallbacks`, which the mirror type above doesn't declare.
type CatalogJsonEntryWithNested = CatalogJsonEntry & {
  aliases: string[];
  models: { default: string; fallbacks: string[] };
};

async function runCatalogMutableArraySection(): Promise<void> {
  const section = "catalog-mutable-array";
  console.log(`\n=== ${section} ===`);
  try {
    const { getCatalogJsonEntries } =
      (await import("../dist/providers/catalog/loader.js")) as {
        getCatalogJsonEntries: () => readonly CatalogJsonEntryWithNested[];
      };

    const first = getCatalogJsonEntries();
    const second = getCatalogJsonEntries();

    record(
      results,
      `${section}: two calls return distinct array references`,
      first !== second,
      "both calls returned the identical array reference",
    );
    record(
      results,
      `${section}: two calls' entries are deep-equal`,
      JSON.stringify(first) === JSON.stringify(second),
      "entry content diverged between calls",
    );
    record(
      results,
      `${section}: the returned array is frozen`,
      Object.isFrozen(first),
      "Object.isFrozen(getCatalogJsonEntries()) was false",
    );

    let pushThrew = false;
    try {
      // Double assertion: `first` is `readonly CatalogJsonEntryWithNested[]`
      // (widened locally to exercise the nested-freeze checks below), whose
      // extra required fields don't sufficiently overlap with the plain
      // `CatalogJsonEntry[]` this push() targets, and dropping `readonly`
      // on top of that narrows further. Test file — exempt from the
      // no-double-type-assertion rule (see CLAUDE.md rule 14).
      const mutable = first as unknown as CatalogJsonEntry[];
      mutable.push({
        id: "injected",
        wire: {},
        models: { default: "x" },
      });
    } catch {
      pushThrew = true;
    }
    record(
      results,
      `${section}: mutating the returned array (.push) throws`,
      pushThrew,
      "push() onto the returned array did not throw",
    );

    // A third call proves the earlier (failed or no-op) push left the
    // module-level singleton uncorrupted for the rest of the process.
    const third = getCatalogJsonEntries();
    record(
      results,
      `${section}: a later call is unaffected by a prior mutation attempt`,
      third.length === second.length,
      `entry count changed: ${second.length} -> ${third.length}`,
    );

    // Nested-mutation regression: Object.freeze() only freezes the
    // outermost level, so freezing just the returned array left
    // entry.aliases, entry.models.fallbacks etc. shared, mutable objects —
    // a caller mutating one result could corrupt what every later
    // getCatalogJsonEntries() call sees. Pick an entry that actually
    // carries a non-empty `aliases` array to exercise this.
    const nestedTarget = first.find((e) => e.aliases.length > 0);
    if (nestedTarget === undefined) {
      record(
        results,
        `${section}: nested aliases array is frozen`,
        false,
        "no catalog entry with a non-empty aliases[] was found to test",
      );
    } else {
      record(
        results,
        `${section}: nested aliases array is frozen`,
        Object.isFrozen(nestedTarget.aliases),
        "Object.isFrozen(entry.aliases) was false",
      );
      record(
        results,
        `${section}: nested models object is frozen`,
        Object.isFrozen(nestedTarget.models),
        "Object.isFrozen(entry.models) was false",
      );

      let nestedPushThrew = false;
      try {
        nestedTarget.aliases.push("injected-alias");
      } catch {
        nestedPushThrew = true;
      }
      record(
        results,
        `${section}: mutating a nested array (entry.aliases.push) throws`,
        nestedPushThrew,
        "push() onto entry.aliases did not throw",
      );

      let nestedAssignThrew = false;
      try {
        nestedTarget.models.default = "mutated";
      } catch {
        nestedAssignThrew = true;
      }
      record(
        results,
        `${section}: mutating a nested field (entry.models.default) throws`,
        nestedAssignThrew,
        "assigning to entry.models.default did not throw",
      );

      // A later call proves the earlier (failed or no-op) nested mutation
      // attempts left the module-level singleton's nested data
      // uncorrupted for the rest of the process.
      const fourth = getCatalogJsonEntries();
      const fourthTarget = fourth.find((e) => e.id === nestedTarget.id);
      record(
        results,
        `${section}: a later call's nested aliases are unaffected by a prior mutation attempt`,
        fourthTarget !== undefined &&
          fourthTarget.aliases.length === nestedTarget.aliases.length,
        `nested aliases length changed for entry "${nestedTarget.id}"`,
      );
    }
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

  // A developer's .env may set LAYA_MODEL / LAYA_BASE_URL /
  // TYPESAFE_GATEWAY_URL, or a real PERPLEXITY_API_KEY. The registry captures
  // each provider's default model when it registers, so they are cleared first;
  // each section sets whatever it needs itself.
  setEnv("LAYA_MODEL", undefined);
  setEnv("LAYA_BASE_URL", undefined);
  setEnv("XOR_MODEL", undefined);
  setEnv("XOR_API_KEY", undefined);
  setEnv("XOR_BASE_URL", undefined);
  setEnv("PERPLEXITY_API_KEY", undefined);
  setEnv("PERPLEXITY_DECIDER_BASE_URL", undefined);
  setEnv("PERPLEXITY_DECIDER_MODEL", undefined);
  setEnv("CLOUDFLARE_CLEF_MODEL", undefined);
  setEnv("SUBQ_API_KEY", undefined);
  setEnv("SUBQ_BASE_URL", undefined);
  setEnv("SUBQ_MODEL", undefined);
  setEnv("OPENAI_DECISIONS_BASE_URL", undefined);
  setEnv("OPENAI_DECISIONS_MODEL", undefined);
  setEnv("SCALEDOWN_API_KEY", undefined);
  setEnv("SCALEDOWN_BASE_URL", undefined);
  setEnv("SCALEDOWN_MODEL", undefined);
  setEnv("TYPESAFE_GATEWAY_URL", undefined);

  // Register providers once so the registry knows about everything.
  const { ProviderRegistry } = await import("../dist/index.js");
  await ProviderRegistry.registerAllProviders();

  // Focused modes keep source-reversal proofs bounded; the default still
  // runs the complete provider contract suite.
  const FOCUSED_RUNS: Record<string, Array<() => Promise<void>>> = {
    "--image-downloads-only": [runImageGenSection, runImageDnsRebindingSection],
    "--openai-strict-gate-only": [runOpenAIStrictGateSection],
    "--embeddings-only": [runEmbeddingsSection],
    "--catalog-per-model-tools-only": [runCatalogPerModelToolsSection],
    "--decide-only": [runDecideSection],
  };
  for (const [flag, sections] of Object.entries(FOCUSED_RUNS)) {
    if (!process.argv.includes(flag)) {
      continue;
    }
    try {
      for (const runSection of sections) {
        await runSection();
      }
    } finally {
      restoreEnv();
    }
    const failed = results.filter((r) => !r.ok).length;
    console.log(
      `\n${results.length - failed} passed · ${failed} failed (of ${results.length})`,
    );
    process.exit(failed > 0 ? 1 : 0);
  }

  try {
    await runOpenAICompatSection();
    await runCatalogPerModelToolsSection();
    await runLiteLLMSSESection();
    await runReplicateLLMSection();
    await runEmbeddingsSection();
    await runImageGenSection();
    await runImageDnsRebindingSection();
    await runDecideSection();
    await runOpenAISection();
    await runAzureSection();
    await runAnthropicSection();
    await runCloudflareContentFormatSection();
    await runStructuredReaskBillingSection();
    await runReasoningReplaySection();
    await runDeepSeekImageInputSection();
    await runSchemaRetryBillingSection();
    await runOpenAIStrictGateSection();
    await runInvalidModelFallbackSection();
    await runVisionModelFallbackSection();
    await runVertexSection();
    await runBedrockSection();
    await runProviderErrorFieldSection();
    await runSingleProviderWrapperMessageSection();
    await runDistErrorClassInstanceofSection();
    await runCatalogMutableArraySection();
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
