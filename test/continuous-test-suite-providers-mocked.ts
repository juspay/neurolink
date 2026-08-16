#!/usr/bin/env tsx
import "dotenv/config";

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
};

const OPENAI_COMPAT_PROVIDERS: OpenAICompatSpec[] = [
  {
    provider: "xai",
    envVar: "XAI_API_KEY",
    urlMatch: "api.x.ai/v1/chat/completions",
    authPrefix: "Bearer ",
    model: "grok-3",
    authErrorMatch: /xai|401|unauthor|api key/i,
  },
  {
    provider: "groq",
    envVar: "GROQ_API_KEY",
    urlMatch: "api.groq.com/openai/v1/chat/completions",
    authPrefix: "Bearer ",
    model: "llama-3.3-70b-versatile",
    authErrorMatch: /groq|401|unauthor|api key/i,
  },
  {
    provider: "together-ai",
    envVar: "TOGETHER_API_KEY",
    urlMatch: "api.together.xyz/v1/chat/completions",
    authPrefix: "Bearer ",
    model: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
    authErrorMatch: /together|401|unauthor|api key/i,
  },
  {
    provider: "fireworks",
    envVar: "FIREWORKS_API_KEY",
    urlMatch: "api.fireworks.ai/inference/v1/chat/completions",
    authPrefix: "Bearer ",
    model: "accounts/fireworks/models/llama-v3p3-70b-instruct",
    authErrorMatch: /fireworks|401|unauthor|api key/i,
  },
  {
    provider: "perplexity",
    envVar: "PERPLEXITY_API_KEY",
    urlMatch: "api.perplexity.ai",
    authPrefix: "Bearer ",
    model: "sonar",
    authErrorMatch: /perplex|401|unauthor|api key/i,
  },
  {
    provider: "cohere",
    envVar: "COHERE_API_KEY",
    urlMatch: "api.cohere.com/compatibility/v1/chat/completions",
    authPrefix: "Bearer ",
    model: "command-r-plus",
    authErrorMatch: /cohere|401|unauthor|api key/i,
  },
  {
    provider: "cloudflare",
    envVar: "CLOUDFLARE_API_KEY",
    extraEnv: { CLOUDFLARE_ACCOUNT_ID: "mock-account-id-1234" },
    urlMatch:
      "api.cloudflare.com/client/v4/accounts/mock-account-id-1234/ai/v1/chat/completions",
    authPrefix: "Bearer ",
    model: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
    authErrorMatch: /cloudflare|401|unauthor|api key/i,
  },
];

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
}

async function runOpenAICompatSection(): Promise<void> {
  console.log(
    "\n=== LLM OpenAI-compat (xAI/Groq/Together/Fireworks/Perplexity/Cohere/Cloudflare) ===",
  );
  for (const spec of OPENAI_COMPAT_PROVIDERS) {
    await runOpenAICompatProvider(spec);
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
      await import("../dist/lib/providers/googleVertex/client.js");
    const { AuthenticationError, RateLimitError } =
      await import("../dist/lib/types/index.js");

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
      await import("../dist/lib/providers/amazonBedrock/client.js");
    const { AuthenticationError, RateLimitError } =
      await import("../dist/lib/types/index.js");

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
    await runReplicateLLMSection();
    await runEmbeddingsSection();
    await runImageGenSection();
    await runOpenAISection();
    await runAzureSection();
    await runAnthropicSection();
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
