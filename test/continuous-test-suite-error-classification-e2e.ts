#!/usr/bin/env tsx
import "dotenv/config";
import http from "node:http";
import http2 from "node:http2";
import type { AddressInfo } from "node:net";
import { z } from "zod";
import { tool } from "ai";

/**
 * Continuous Test Suite — end-to-end provider error classification.
 *
 * ALL-DIST module graph (rule 15): every import below resolves to
 * `../dist/...`. This suite replaces the src-importing
 * `continuous-test-suite-error-classifier*.ts` trio, which called
 * `formatProviderError()` directly on `src/`-constructed provider
 * instances with hand-built synthetic `Error` objects — a shape no real
 * HTTP response ever produces. Here, a real local `node:http` mock server
 * (127.0.0.1, ephemeral port) is driven by `new NeuroLink().generate()`
 * from the BUILT package, redirected per-provider via the same env-var /
 * `credentials` hooks a real deployment would use. This is a real
 * server, not `globalThis.fetch` patching, so Bedrock's native-SDK HTTP
 * path (which bypasses `fetch` entirely) is covered too.
 *
 * Where a case could not be reproduced this way despite being expected to
 * be — because the current implementation never threads the triggering
 * field through a real transport — it was demoted to
 * `continuous-test-suite-error-classifier-contract.ts` instead of being
 * silently dropped; each demotion is called out in a comment at its
 * original call site below.
 *
 * Run: npx tsx test/continuous-test-suite-error-classification-e2e.ts
 *      pnpm run test:error-classification-e2e
 */

// ---------------------------------------------------------------------------
// Mock server — one real node:http server for the whole suite. Every test
// re-points its handler via setHandler() immediately before driving a
// generate() call. All handlers are STATELESS (same response regardless of
// hit count) so the mandatory "must tolerate being hit 3 times" requirement
// (provider-side retries: withProviderRetry for the ai-package path, the AWS
// SDK's own StandardRetryStrategy for Bedrock) is satisfied unconditionally.
// ---------------------------------------------------------------------------

type MockResponseSpec = {
  status: number;
  headers?: Record<string, string>;
  body: string;
};
type MockHandler = () => MockResponseSpec | Promise<MockResponseSpec>;

let currentHandler: MockHandler | null = null;
let destroySocketOnRequest = false;
let hitCount = 0;
// Raw UTF-8 body of the most recent request the mock server received —
// populated unconditionally on every hit (cheap: a single Buffer.concat),
// read only by the Gemini tools-vs-schema section below to assert on the
// real outbound wire body rather than just the parsed response.
let lastRequestBody = "";

// Shared by both mock servers below — request/response shapes are
// compatible across node:http and node:http2's server APIs for the
// subset used here (on("data")/on("end")/writeHead/end/socket.destroy).
function handleMockRequest(
  req: {
    on(ev: string, cb: (...a: never[]) => void): void;
    socket?: { destroy(): void };
  },
  res: {
    writeHead(status: number, headers: Record<string, string>): void;
    end(callback?: () => void): void;
    end(body: string, callback?: () => void): void;
  },
): void {
  hitCount++;
  if (destroySocketOnRequest) {
    // Abort the connection mid-flight instead of responding. NOT a real
    // ECONNRESET, contrary to what this comment used to claim: undici's
    // native fetch() surfaces this as `TypeError: fetch failed` wrapping a
    // `SocketError` with message "other side closed" and code
    // `UND_ERR_SOCKET` on `.cause` — confirmed by live repro through the
    // actual `createProxyFetch()` path. Never the literal "ECONNRESET"
    // text or code.
    req.socket?.destroy();
    return;
  }
  const chunks: Buffer[] = [];
  req.on("data", (c: Buffer) => chunks.push(c));
  req.on("end", () => {
    void (async () => {
      lastRequestBody = Buffer.concat(chunks).toString("utf8");
      if (!currentHandler) {
        res.writeHead(500, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: { message: "no mock handler set" } }));
        return;
      }
      try {
        const spec = await currentHandler();
        res.writeHead(spec.status, {
          "content-type": "application/json",
          ...spec.headers,
        });
        res.end(spec.body);
      } catch (err) {
        res.writeHead(500, { "content-type": "application/json" });
        res.end(
          JSON.stringify({
            error: { message: `mock handler threw: ${String(err)}` },
          }),
        );
      }
    })();
  });
}

const mockServer = http.createServer((req, res) => handleMockRequest(req, res));

// Amazon Bedrock's SDK hardcodes NodeHttp2Handler as its default request
// handler (@aws-sdk/client-bedrock-runtime's runtimeConfig.js) regardless of
// operation — confirmed by direct reproduction: pointing it at the plain
// HTTP/1.1 mockServer above raises a client-side `NghttpError: Protocol
// error` (ERR_HTTP2_ERROR) before the mocked response body is ever read, so
// Bedrock needs its own h2c (cleartext HTTP/2, prior-knowledge) server.
const bedrockMockServer = http2.createServer((req, res) =>
  handleMockRequest(req, res),
);

function setHandler(h: MockHandler): void {
  currentHandler = h;
  destroySocketOnRequest = false;
  hitCount = 0;
}

function setSocketDestroyHandler(): void {
  currentHandler = null;
  destroySocketOnRequest = true;
  hitCount = 0;
}

/** Standard `{"error":{"message":...}}` JSON body. 429/5xx always carry
 * retry-after:0 so withProviderRetry / the AWS SDK's own retry strategy
 * never wait out a real backoff — mandatory for the suite's ~3min budget. */
function jsonError(
  status: number,
  message: string,
  extraHeaders?: Record<string, string>,
): MockHandler {
  return () => {
    const headers: Record<string, string> = { ...extraHeaders };
    if (status === 429 || status >= 500) {
      headers["retry-after"] = "0";
    }
    return { status, headers, body: JSON.stringify({ error: { message } }) };
  };
}

/** AWS restJson1-shaped error: exception identity comes from the
 * x-amzn-errortype header (or __type body field — header wins), NOT from
 * message text. Verified against @aws-sdk/core's loadRestJsonErrorCode(). */
function bedrockError(
  status: number,
  errorType: string,
  message: string,
): MockHandler {
  return () => {
    const headers: Record<string, string> = { "x-amzn-errortype": errorType };
    if (status === 429 || status >= 500) {
      headers["retry-after"] = "0";
    }
    return {
      status,
      headers,
      body: JSON.stringify({ __type: errorType, message }),
    };
  };
}

/** A single-chunk `text/event-stream` body shaped like a real
 * `@google/genai` `streamGenerateContent?alt=sse` response — verified
 * against the installed SDK's `dist/node/index.cjs`
 * (`generateContentResponseFromMldev`/`candidateFromMldev` pass `candidates`,
 * `content`, and `usageMetadata` through field-for-field) so
 * `client.models.generateContentStream()` parses it without error on both
 * the generate() and stream() native paths, which both consume this same
 * call under the hood. */
function geminiSSEHandler(text: string): MockHandler {
  return () => {
    const payload = {
      candidates: [
        {
          content: { role: "model", parts: [{ text }] },
          finishReason: "STOP",
        },
      ],
      usageMetadata: {
        promptTokenCount: 3,
        candidatesTokenCount: 3,
        totalTokenCount: 6,
      },
    };
    return {
      status: 200,
      headers: { "content-type": "text/event-stream" },
      body: `data: ${JSON.stringify(payload)}\n\n`,
    };
  };
}

async function startMockServer(
  server: http.Server | http2.Http2Server,
): Promise<string> {
  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });
  const { port } = server.address() as AddressInfo;
  return `http://127.0.0.1:${port}`;
}

// A port nothing listens on: connecting here raises a real ECONNREFUSED
// without needing to bind+close a real server (avoids a reuse race).
// Deliberately NOT port 1 — undici's Fetch-spec "bad ports" blocklist
// rejects port 1 (plus a handful of other low ports) before attempting any
// connection, yielding `.cause = Error("bad port")` with no `.code` at all,
// which is a client-side misconfiguration, not a transient transport
// failure — confirmed by live repro through the real `createProxyFetch()`
// path. 65533 is outside that blocklist and produces a genuine
// `.cause = Error("connect ECONNREFUSED ...")` with `code: "ECONNREFUSED"`.
const CLOSED_PORT_ORIGIN = "http://127.0.0.1:65533";

// ---------------------------------------------------------------------------
// Env var snapshot/restore — cloned from providers-mocked.ts's pattern.
// ---------------------------------------------------------------------------

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
  for (const [key, value] of Object.entries(ORIGINAL_ENV)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

// ---------------------------------------------------------------------------
// Results harness — boolean-based record()/exit, immune to the
// isExpectedProviderError() SKIP-hazard (this suite doesn't use defineSuite).
// ---------------------------------------------------------------------------

type TestRecord = { name: string; ok: boolean; reason?: string };
const results: TestRecord[] = [];

function record(name: string, ok: boolean, reason?: string): void {
  results.push({ name, ok, reason });
  console.log(`${ok ? "✓" : "✗"} ${name}${reason ? ` — ${reason}` : ""}`);
}

// ---------------------------------------------------------------------------
// Generic "drive generate(), catch, assert on the classified error" runner.
// ---------------------------------------------------------------------------

type ErrorCtor = new (...args: never[]) => Error;

async function expectGenerateError(opts: {
  name: string;
  run: () => Promise<unknown>;
  expectClass?: ErrorCtor;
  notClasses?: ErrorCtor[];
  messageIncludes?: string[];
}): Promise<void> {
  try {
    await opts.run();
    record(opts.name, false, "generate() resolved without throwing");
  } catch (err) {
    const e = err instanceof Error ? err : new Error(String(err));
    // Captured before any instanceof narrowing — TS's structural instanceof
    // narrowing collapses `e` to `never` on the negative branch when the
    // constructor's declared instance type is exactly `Error`.
    const eCtorName = e.constructor.name;
    const eMessage = e.message;
    const problems: string[] = [];
    const matchesExpected = !opts.expectClass || e instanceof opts.expectClass;
    if (!matchesExpected) {
      problems.push(
        `expected instanceof ${opts.expectClass!.name}, got ${eCtorName}: ${eMessage}`,
      );
    }
    for (const NotCls of opts.notClasses ?? []) {
      if (e instanceof NotCls) {
        problems.push(`unexpectedly instanceof ${NotCls.name}`);
      }
    }
    for (const frag of opts.messageIncludes ?? []) {
      if (!e.message.includes(frag)) {
        problems.push(`message did not include "${frag}"`);
      }
    }
    record(opts.name, problems.length === 0, problems.join("; ") || undefined);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const mockOrigin = await startMockServer(mockServer);
  const bedrockMockOrigin = await startMockServer(bedrockMockServer);

  // Anthropic hermeticity pins — force the x-api-key path, never OAuth.
  setEnv("ANTHROPIC_AUTH_METHOD", "api_key");
  setEnv("ANTHROPIC_OAUTH_TOKEN", undefined);
  setEnv("CLAUDE_OAUTH_TOKEN", undefined);

  try {
    const { NeuroLink, ProviderRegistry } = await import("../dist/index.js");
    await ProviderRegistry.registerAllProviders();
    // NOTE: deliberately NOT `../dist/index.js` and NOT `../dist/lib/...`.
    // `dist/index.js`'s root barrel used to re-export `AuthenticationError`,
    // `AuthorizationError` and `RateLimitError` a SECOND time from
    // `./server/index.js` (the server-adapter's own same-named-but-unrelated
    // classes, extending `ServerAdapterError` rather than `ProviderError`) —
    // an explicit named export placed after an earlier
    // `export * from "./types/index.js"` always wins per ESM semantics, so
    // `dist/index.js`'s public `AuthenticationError`/`AuthorizationError`/
    // `RateLimitError` were silently the WRONG classes. That has since been
    // fixed the same way as `TimeoutError`/`ServerTimeoutError` below: the
    // three server-side exports are now `Server*`-prefixed at both barrels,
    // so the provider-error classes win the bare names on the public surface
    // (see the identity + end-to-end regression sections below main's try
    // block). This suite still imports directly from `dist/types/index.js`
    // here rather than `dist/index.js`, though — not to route around the bug
    // any more, but because that's what actually matches the classes
    // `generate()` throws: providers themselves import error classes via
    // `../types/index.js` relative to their own file
    // (`dist/providers/<x>.js` -> `dist/types/index.js`), confirmed by direct
    // instanceof testing against a provider constructed through this same
    // dist tree.
    const {
      AuthenticationError,
      RateLimitError,
      InvalidModelError,
      NetworkError,
      ProviderError,
      ModelAccessDeniedError,
    } = await import("../dist/types/index.js");
    const { GoogleVertexProvider } =
      await import("../dist/providers/googleVertex/client.js");

    function nl() {
      return new NeuroLink({ conversationMemory: { enabled: false } });
    }

    async function gen(opts: {
      provider: string;
      model?: string;
      credentials?: Record<string, unknown>;
    }) {
      return nl().generate({
        provider: opts.provider,
        model: opts.model,
        input: { text: "ping" },
        disableTools: true,
        credentials: opts.credentials,
      } as Parameters<InstanceType<typeof NeuroLink>["generate"]>[0]);
    }

    // =========================================================================
    // SECTION: DEFAULT_ERROR_RULES via a real provider (old File1 #2-8,#12)
    // -------------------------------------------------------------------------
    // File1 tested classifyProviderError()+DEFAULT_ERROR_RULES directly with a
    // synthetic "acme" provider name. Every real OpenAI-compat-family provider
    // spreads ...DEFAULT_ERROR_RULES as its fallback, so mistral (one bespoke
    // auth-override rule + DEFAULT) exercises the exact same table end-to-end.
    // =========================================================================
    {
      setEnv("MISTRAL_API_KEY", "test-fake-mistral-credential");
      setEnv("MISTRAL_BASE_URL", mockOrigin);

      // File1 #2: 401 statusCode -> AuthenticationError
      setHandler(jsonError(401, "denied"));
      await expectGenerateError({
        name: "DEFAULT_ERROR_RULES via mistral: 401 statusCode -> AuthenticationError",
        run: () => gen({ provider: "mistral", model: "mistral-large-latest" }),
        expectClass: AuthenticationError,
      });

      // File1 #3: 429 statusCode -> RateLimitError. A 429/5xx status is
      // retryable by isNonRetryableProviderError()'s own status-code table,
      // so directProviderGeneration()'s single-provider fallback loop
      // exhausts its (one-element) provider list and rethrows a plain
      // `Error("Failed to generate text with all providers. Last error:
      // ...")` — the classified RateLimitError's message text survives
      // verbatim inside it, but its `instanceof` identity does not. Asserted
      // via message content instead, matching providers-mocked.ts's
      // documented precedent for this exact wrapping behavior.
      setHandler(jsonError(429, "slow down"));
      await expectGenerateError({
        name: "DEFAULT_ERROR_RULES via mistral: 429 statusCode -> RateLimitError",
        run: () => gen({ provider: "mistral", model: "mistral-large-latest" }),
        messageIncludes: ["mistral rate limit exceeded"],
      });

      // File1 #4: 404 statusCode -> InvalidModelError (with model interpolation)
      setHandler(jsonError(404, "nope"));
      await expectGenerateError({
        name: "DEFAULT_ERROR_RULES via mistral: 404 statusCode -> InvalidModelError naming the model",
        run: () => gen({ provider: "mistral", model: "mistral-ghost-model" }),
        expectClass: InvalidModelError,
        messageIncludes: ["mistral-ghost-model"],
      });

      // File1 #5: 5xx statusCode -> generic ProviderError (not a subclass).
      // 5xx is retryable by status -> wrapped, same as the 429 case above.
      setHandler(jsonError(503, "boom"));
      await expectGenerateError({
        name: "DEFAULT_ERROR_RULES via mistral: 503 statusCode -> generic ProviderError, not a subclass",
        run: () => gen({ provider: "mistral", model: "mistral-large-latest" }),
        messageIncludes: ["mistral server error: boom"],
      });

      // File1 #6: rate-limit substring alone (no 429 statusCode) still matches
      setHandler(
        jsonError(400, "upstream said: rate limit exceeded, slow down"),
      );
      await expectGenerateError({
        name: "DEFAULT_ERROR_RULES via mistral: rate-limit substring without statusCode 429 still matches",
        run: () => gen({ provider: "mistral", model: "mistral-large-latest" }),
        expectClass: RateLimitError,
      });

      // File1 #7: real socket death (not a synthetic message string) via
      // req.socket.destroy(). Node's native fetch (undici) surfaces this as
      // `TypeError: fetch failed` wrapping a `SocketError` with message
      // "other side closed" and code `UND_ERR_SOCKET` on `.cause` — NOT the
      // literal "ECONNRESET" text or code (confirmed by live repro through
      // the real `createProxyFetch()` path). buildErrorContext() now walks
      // that `.cause` chain (bounded, cycle-guarded) and composes the
      // deepest cause's message in, and DEFAULT_ERROR_RULES' NetworkError
      // rule matches `ctx.errorCode` against a shared transient-code set
      // (TRANSIENT_NETWORK_CODES, also used by proxyFetch.ts's own retry
      // gate) in addition to its message regex — so this now correctly
      // classifies as NetworkError instead of falling through to the
      // generic fallback. No status code either -> still wrapped by the
      // provider-fallback loop, so instanceof identity doesn't survive;
      // asserted via the rule's "Connection error" message text instead,
      // matching the existing precedent for this exact wrapping behavior.
      setSocketDestroyHandler();
      await expectGenerateError({
        name: "DEFAULT_ERROR_RULES via mistral: real socket death (UND_ERR_SOCKET) -> NetworkError",
        run: () => gen({ provider: "mistral", model: "mistral-large-latest" }),
        messageIncludes: ["Connection error"],
      });

      // File1 #8: unmatched -> generic ProviderError
      setHandler(jsonError(400, "totally unrecognized upstream failure"));
      await expectGenerateError({
        name: "DEFAULT_ERROR_RULES via mistral: unmatched error -> generic ProviderError",
        run: () => gen({ provider: "mistral", model: "mistral-large-latest" }),
        notClasses: [AuthenticationError, RateLimitError, InvalidModelError],
      });

      // File1 #12: provider bracket prefix. Asserted via .includes (not
      // .startsWith) because directProviderGeneration() may add wrapper text
      // around the classified message once the retry budget exhausts — same
      // adaptation providers-mocked.ts documents for this exact reason.
      setHandler(jsonError(401, "denied"));
      await expectGenerateError({
        name: "DEFAULT_ERROR_RULES via mistral: classified message carries the [mistral] provider bracket",
        run: () => gen({ provider: "mistral", model: "mistral-large-latest" }),
        messageIncludes: ["[mistral]"],
      });
    }

    // =========================================================================
    // SECTION: OpenAI-compat family shared loop (old File2 Part A, tests b-e)
    // -------------------------------------------------------------------------
    // Test 'a' (TimeoutError) is client-side-timeout-triggered and not cheaply
    // reproducible via real HTTP within the suite's time budget — demoted to
    // the contract suite for all 19 providers.
    // =========================================================================
    type CompatCase = {
      name: string;
      model: string;
      apiKeyEnv?: string;
      apiKeyValue?: string;
      baseUrlEnv?: string;
      extraEnv?: Record<string, string | undefined>;
      authMarker: string;
      // Defaults to "<name> rate limit exceeded" (DEFAULT_ERROR_RULES'
      // lowercase-echo template); a handful of providers have their own
      // bespoke rate-limit rule with a differently-branded/capitalized name
      // and override it here.
      rateLimitMarker?: string;
      credentials?: (origin: string) => Record<string, unknown>;
    };

    const compatProviders: CompatCase[] = [
      {
        name: "mistral",
        model: "mistral-large-latest",
        apiKeyEnv: "MISTRAL_API_KEY",
        apiKeyValue: "test-fake-mistral-credential",
        baseUrlEnv: "MISTRAL_BASE_URL",
        authMarker: "MISTRAL_API_KEY",
      },
      {
        name: "groq",
        model: "llama-3.3-70b-versatile",
        apiKeyEnv: "GROQ_API_KEY",
        apiKeyValue: "test-fake-groq-credential",
        baseUrlEnv: "GROQ_BASE_URL",
        authMarker: "GROQ_API_KEY",
      },
      {
        name: "xai",
        model: "grok-3",
        apiKeyEnv: "XAI_API_KEY",
        apiKeyValue: "test-fake-xai-credential",
        baseUrlEnv: "XAI_BASE_URL",
        authMarker: "XAI_API_KEY",
      },
      {
        name: "together-ai",
        model: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
        apiKeyEnv: "TOGETHER_API_KEY",
        apiKeyValue: "test-fake-together-ai-credential",
        baseUrlEnv: "TOGETHER_BASE_URL",
        authMarker: "api.together.xyz/settings/api-keys",
      },
      {
        name: "fireworks",
        model: "accounts/fireworks/models/llama-v3p3-70b-instruct",
        apiKeyEnv: "FIREWORKS_API_KEY",
        apiKeyValue: "test-fake-fireworks-credential",
        baseUrlEnv: "FIREWORKS_BASE_URL",
        authMarker: "fireworks.ai/account/api-keys",
      },
      {
        name: "perplexity",
        model: "sonar",
        apiKeyEnv: "PERPLEXITY_API_KEY",
        apiKeyValue: "test-fake-perplexity-credential",
        baseUrlEnv: "PERPLEXITY_BASE_URL",
        authMarker: "perplexity.ai/settings/api",
      },
      {
        name: "cloudflare",
        model: "@cf/meta/llama-3.1-8b-instruct",
        // No CLOUDFLARE_BASE_URL env exists — redirect via per-call credentials.
        credentials: (origin) => ({
          cloudflare: {
            apiKey: "test-fake-cloudflare-credential",
            accountId: "mock-account-id-1234",
            baseURL: origin,
          },
        }),
        authMarker: "dash.cloudflare.com/profile/api-tokens",
      },
      {
        name: "openai-compatible",
        model: "gpt-4o-mini",
        apiKeyEnv: "OPENAI_COMPATIBLE_API_KEY",
        apiKeyValue: "test-fake-openai-compatible-credential",
        baseUrlEnv: "OPENAI_COMPATIBLE_BASE_URL",
        authMarker: "OPENAI_COMPATIBLE_API_KEY",
      },
      {
        name: "openai",
        model: "gpt-4o-mini",
        apiKeyEnv: "OPENAI_API_KEY",
        apiKeyValue: "test-fake-openai-credential",
        baseUrlEnv: "OPENAI_BASE_URL",
        // The shared loop's "Invalid API key" input hits openai's own
        // echo-ternary branch (message matches /Invalid API key/i), so the
        // classified message literally IS "Invalid API key".
        authMarker: "Invalid API key",
        rateLimitMarker: "OpenAI rate limit exceeded",
      },
      {
        name: "deepseek",
        model: "deepseek-chat",
        apiKeyEnv: "DEEPSEEK_API_KEY",
        apiKeyValue: "test-fake-deepseek-credential",
        baseUrlEnv: "DEEPSEEK_BASE_URL",
        authMarker: "DEEPSEEK_API_KEY",
      },
      {
        name: "azure",
        model: "gpt-4o",
        apiKeyEnv: "AZURE_OPENAI_API_KEY",
        apiKeyValue: "test-fake-azure-credential",
        baseUrlEnv: "AZURE_OPENAI_ENDPOINT",
        extraEnv: {
          AZURE_API_VERSION: undefined,
          AZURE_OPENAI_MODEL: undefined,
          AZURE_OPENAI_DEPLOYMENT: undefined,
          AZURE_OPENAI_DEPLOYMENT_ID: undefined,
        },
        // Azure's own rule only matches a literal "401" substring, not
        // "Invalid API key" — falls through to DEFAULT_ERROR_RULES, whose
        // auth message is a template ("Invalid <provider> API key...") using
        // the provider name, not an echo of the upstream body text.
        authMarker: "Invalid azure API key",
      },
      {
        name: "litellm",
        model: "gpt-4o-mini",
        apiKeyEnv: "LITELLM_API_KEY",
        apiKeyValue: "test-fake-litellm-credential",
        baseUrlEnv: "LITELLM_BASE_URL",
        authMarker: "LITELLM_API_KEY",
        rateLimitMarker: "LiteLLM rate limit exceeded",
      },
      {
        name: "nvidia-nim",
        model: "meta/llama-3.1-8b-instruct",
        apiKeyEnv: "NVIDIA_NIM_API_KEY",
        apiKeyValue: "test-fake-nvidia-nim-credential",
        baseUrlEnv: "NVIDIA_NIM_BASE_URL",
        authMarker: "build.nvidia.com/settings/api-keys",
        rateLimitMarker: "NVIDIA NIM rate limit exceeded",
      },
      {
        name: "openrouter",
        model: "openai/gpt-4o-mini",
        apiKeyEnv: "OPENROUTER_API_KEY",
        apiKeyValue: "test-fake-openrouter-credential",
        baseUrlEnv: "OPENROUTER_BASE_URL",
        authMarker: "OPENROUTER_API_KEY",
        rateLimitMarker: "OpenRouter rate limit exceeded",
      },
      {
        name: "ollama",
        model: "llama3.1",
        baseUrlEnv: "OLLAMA_BASE_URL",
        // Ollama has no own auth rule at all -> falls through to DEFAULT,
        // whose auth message is a "Invalid <provider> API key..." template.
        authMarker: "Invalid ollama API key",
      },
      {
        name: "huggingface",
        model: "meta-llama/Llama-3.1-8B-Instruct",
        apiKeyEnv: "HUGGINGFACE_API_KEY",
        apiKeyValue: "test-fake-huggingface-credential",
        baseUrlEnv: "HUGGINGFACE_BASE_URL",
        // Own rule needs "API_TOKEN_INVALID"/"Invalid token" -> falls to
        // DEFAULT's "Invalid <provider> API key..." template.
        authMarker: "Invalid huggingface API key",
        rateLimitMarker: "HuggingFace rate limit exceeded",
      },
      {
        name: "llamacpp",
        model: "local-model",
        baseUrlEnv: "LLAMACPP_BASE_URL",
        // No own auth rule -> DEFAULT's template message.
        authMarker: "Invalid llamacpp API key",
      },
      {
        name: "lm-studio",
        model: "local-model",
        baseUrlEnv: "LM_STUDIO_BASE_URL",
        // No own auth rule -> DEFAULT's template message.
        authMarker: "Invalid lm-studio API key",
      },
      {
        name: "cohere",
        model: "command-r-plus",
        apiKeyEnv: "COHERE_API_KEY",
        apiKeyValue: "test-fake-cohere-credential",
        baseUrlEnv: "COHERE_BASE_URL",
        // Own rule is case-sensitive lowercase -> DEFAULT's template message.
        authMarker: "Invalid cohere API key",
        rateLimitMarker: "Cohere rate limit exceeded",
      },
    ];

    for (const c of compatProviders) {
      if (c.apiKeyEnv) {
        setEnv(c.apiKeyEnv, c.apiKeyValue);
      }
      if (c.baseUrlEnv) {
        setEnv(c.baseUrlEnv, mockOrigin);
      }
      for (const [k, v] of Object.entries(c.extraEnv ?? {})) {
        setEnv(k, v);
      }
      const credentials = c.credentials?.(mockOrigin);

      // b: 401/invalid key -> AuthenticationError naming its credential source
      setHandler(jsonError(401, "Invalid API key"));
      await expectGenerateError({
        name: `${c.name}: 401 'Invalid API key' -> AuthenticationError naming its credential source`,
        run: () => gen({ provider: c.name, model: c.model, credentials }),
        expectClass: AuthenticationError,
        messageIncludes: [c.authMarker],
      });

      // c: rate limit -> RateLimitError. 429 is retryable by status, so the
      // single-provider fallback loop always exhausts and wraps it in a
      // plain Error — asserted via message content, not instanceof (see the
      // DEFAULT_ERROR_RULES mistral 429 case above for the full rationale).
      setHandler(jsonError(429, "rate limit exceeded, try later"));
      await expectGenerateError({
        name: `${c.name}: 429 rate-limit body -> RateLimitError`,
        run: () => gen({ provider: c.name, model: c.model, credentials }),
        messageIncludes: [c.rateLimitMarker ?? `${c.name} rate limit exceeded`],
      });

      // d: model_not_found -> InvalidModelError
      setHandler(jsonError(404, "model_not_found: no such model"));
      await expectGenerateError({
        name: `${c.name}: 404 model_not_found -> InvalidModelError`,
        run: () => gen({ provider: c.name, model: c.model, credentials }),
        expectClass: InvalidModelError,
      });

      // e: unrecognized -> generic ProviderError (not misclassified)
      setHandler(jsonError(400, "totally unrecognized upstream failure"));
      await expectGenerateError({
        name: `${c.name}: unrecognized error -> generic ProviderError, not misclassified`,
        run: () => gen({ provider: c.name, model: c.model, credentials }),
        notClasses: [AuthenticationError, RateLimitError, InvalidModelError],
      });
    }

    // =========================================================================
    // SECTION: OpenAI-compat family dedicated quirks (old File2 Part B)
    // =========================================================================

    // -- xai: insufficient_quota extra branch ---------------------------------
    setEnv("XAI_API_KEY", "test-fake-xai-credential");
    setEnv("XAI_BASE_URL", mockOrigin);
    setHandler(jsonError(403, "insufficient_quota: account limit reached"));
    await expectGenerateError({
      name: "xai: insufficient_quota -> generic ProviderError with top-up URL",
      run: () => gen({ provider: "xai", model: "grok-3" }),
      notClasses: [AuthenticationError, RateLimitError, InvalidModelError],
      messageIncludes: ["console.x.ai"],
    });

    // -- groq: model_decommissioned extra branch -------------------------------
    setEnv("GROQ_API_KEY", "test-fake-groq-credential");
    setEnv("GROQ_BASE_URL", mockOrigin);
    setHandler(jsonError(404, "model_decommissioned: this model is retired"));
    await expectGenerateError({
      name: "groq: model_decommissioned -> InvalidModelError with catalog URL",
      run: () => gen({ provider: "groq", model: "llama-3.3-70b-versatile" }),
      expectClass: InvalidModelError,
      messageIncludes: ["console.groq.com/docs/models"],
    });

    // -- openai-compatible: ECONNREFUSED + 'does not exist' phrasing ----------
    setEnv(
      "OPENAI_COMPATIBLE_API_KEY",
      "test-fake-openai-compatible-credential",
    );
    setEnv("OPENAI_COMPATIBLE_BASE_URL", CLOSED_PORT_ORIGIN);
    // CLOSED_PORT_ORIGIN now points at port 65533 (outside undici's Fetch-spec
    // "bad ports" blocklist — see that constant's own comment), so this is a
    // genuine closed-port connection attempt: Node's native fetch surfaces it
    // as `TypeError: fetch failed` wrapping a real `Error("connect ECONNREFUSED
    // ...")` with code `ECONNREFUSED` on `.cause` — confirmed by live repro
    // through the real `createProxyFetch()` path. This provider never reaches
    // DEFAULT_ERROR_RULES' generic NetworkError rule for this case: its own
    // formatProviderError() (openaiCompatible/client.ts) checks a bespoke
    // `/ECONNREFUSED|Failed to fetch/i` rule against ctx.message FIRST, naming
    // the configured base URL. That rule already existed in wave 2, but never
    // fired for this test because port 1's "bad port" cause carries no
    // ECONNREFUSED text at all. buildErrorContext()'s new cause-walk now
    // composes the deepest cause's message (which does contain "ECONNREFUSED")
    // into ctx.message, so the provider's own rule matches and this correctly
    // classifies as NetworkError. Still no status code, so the
    // provider-fallback loop still wraps it and instanceof identity doesn't
    // survive — asserted via the provider's bespoke message text (and the
    // base URL it names) rather than "Connection error", which is
    // DEFAULT_ERROR_RULES' generic rule 4 format and not what fires here.
    await expectGenerateError({
      name: "openai-compatible: real ECONNREFUSED (closed port) -> NetworkError naming the base URL",
      run: () => gen({ provider: "openai-compatible", model: "gpt-4o-mini" }),
      messageIncludes: ["OpenAI Compatible endpoint not available", "65533"],
    });

    setEnv("OPENAI_COMPATIBLE_BASE_URL", mockOrigin);
    // DEMOTED to contract suite: "duck-typed timeout (name only, not
    // instanceof) -> NetworkError" (old Part B #4). buildAPIError() (the
    // hand-rolled OpenAI-compat HTTP client's error constructor) always
    // builds a plain `new Error(...)`, never assigning `.name`, so a real
    // HTTP response can never produce the `.name === "TimeoutError"` duck
    // type this rule branch checks for.

    setHandler(jsonError(404, "The model provided does not exist"));
    await expectGenerateError({
      name: "openai-compatible: 'does not exist' model phrasing -> InvalidModelError",
      run: () => gen({ provider: "openai-compatible", model: "gpt-4o-mini" }),
      expectClass: InvalidModelError,
    });

    setHandler(() => ({
      status: 400,
      body: JSON.stringify({
        error: {
          message: [{ msg: "Model not found in Pydantic validation." }],
        },
      }),
    }));
    await expectGenerateError({
      name: "openai-compatible: Pydantic error.message array preserves invalid-model text",
      run: () => gen({ provider: "openai-compatible", model: "gpt-4o-mini" }),
      expectClass: InvalidModelError,
      messageIncludes: ["gpt-4o-mini"],
    });

    setHandler(() => ({
      status: 400,
      body: JSON.stringify({ detail: "Model not found in top-level detail." }),
    }));
    await expectGenerateError({
      name: "openai-compatible: top-level detail preserves invalid-model text",
      run: () => gen({ provider: "openai-compatible", model: "gpt-4o-mini" }),
      expectClass: InvalidModelError,
      messageIncludes: ["gpt-4o-mini"],
    });

    // -- openai: bad-request precision + missing-model echo -------------------
    setEnv("OPENAI_API_KEY", "test-fake-openai-credential");
    setEnv("OPENAI_BASE_URL", mockOrigin);

    setHandler(jsonError(400, "Missing required parameter: 'model'"));
    await expectGenerateError({
      name: "openai: bad-request type alone -> NOT AuthenticationError (Reviewer Finding #4)",
      run: () => gen({ provider: "openai", model: "gpt-4o-mini" }),
      notClasses: [AuthenticationError],
    });

    // DEMOTED to contract suite: "credential-type marker without echoable
    // wording -> names its own env var" (old Part B #7). openAI/client.ts's
    // auth rule OR-branches on `errorType === "invalid_api_key"`, reading
    // `.type` directly off the raw caught error. But NeuroLink's own
    // OpenAI-compat HTTP client (buildAPIError() in
    // openaiChatCompletionsClient.ts) never attaches a `.type` field to the
    // error it builds from a real fetch() response — confirmed by reading
    // its full body (sets only .message/.statusCode/.responseHeaders/.url/
    // .requestBody/.responseBody). A real or mocked HTTP call therefore can
    // never populate `errorType`, so this specific rule branch is
    // unreachable via any live/mocked generate() call with the current
    // implementation — a genuine e2e-reproducibility gap, not a mocking
    // limitation. Ported verbatim to the contract suite instead.

    setHandler(jsonError(404, "model_not_found: no such model"));
    await expectGenerateError({
      name: "openai: missing-model trigger -> InvalidModelError echoing the requested model name",
      run: () => gen({ provider: "openai", model: "gpt-9-ghost" }),
      expectClass: InvalidModelError,
      messageIncludes: ["gpt-9-ghost"],
    });

    // -- deepseek: account-balance extra branch --------------------------------
    setEnv("DEEPSEEK_API_KEY", "test-fake-deepseek-credential");
    setEnv("DEEPSEEK_BASE_URL", mockOrigin);
    setHandler(jsonError(402, "Insufficient Balance: account has run dry"));
    await expectGenerateError({
      name: "deepseek: balance-exhausted trigger -> generic ProviderError with top-up URL",
      run: () => gen({ provider: "deepseek", model: "deepseek-chat" }),
      notClasses: [AuthenticationError, RateLimitError, InvalidModelError],
      messageIncludes: ["platform.deepseek.com/usage"],
    });

    // -- azure: 401 preserved + 429 fix ----------------------------------------
    setEnv("AZURE_OPENAI_API_KEY", "test-fake-azure-credential");
    setEnv("AZURE_OPENAI_ENDPOINT", mockOrigin);
    setEnv("AZURE_API_VERSION", undefined);
    setEnv("AZURE_OPENAI_MODEL", undefined);
    setEnv("AZURE_OPENAI_DEPLOYMENT", undefined);
    setEnv("AZURE_OPENAI_DEPLOYMENT_ID", undefined);

    setHandler(jsonError(401, "Request failed with status code 401"));
    await expectGenerateError({
      name: "azure: 401 substring -> AuthenticationError naming the endpoint (unchanged)",
      run: () => gen({ provider: "azure", model: "gpt-4o" }),
      expectClass: AuthenticationError,
      messageIncludes: ["Azure OpenAI"],
    });

    setHandler(jsonError(429, "Rate limit exceeded"));
    await expectGenerateError({
      name: "azure: 429 body text -> RateLimitError (RULING 1 fix; previously a generic ProviderError)",
      run: () => gen({ provider: "azure", model: "gpt-4o" }),
      messageIncludes: ["azure rate limit exceeded"],
    });

    // -- litellm: ModelAccessDeniedError pre-classifier intercept -------------
    setEnv("LITELLM_API_KEY", "test-fake-litellm-credential");
    setEnv("LITELLM_BASE_URL", mockOrigin);
    setHandler(
      jsonError(
        403,
        "team not allowed to access model. This team can only access models=['glm-latest', 'kimi-latest', 'open-large']",
      ),
    );
    await expectGenerateError({
      name: "litellm: team-whitelist denial -> ModelAccessDeniedError with a parsed allow-list",
      run: () => gen({ provider: "litellm", model: "glm-restricted" }),
      expectClass: ModelAccessDeniedError,
      messageIncludes: ["glm-latest", "kimi-latest", "open-large"],
    });
    // DEMOTED to contract suite: "duck-typed timeout (name only, not
    // instanceof) -> NetworkError" (old Part B #13) — same buildAPIError()
    // gap as openai-compatible's #4 above.

    // -- nvidia-nim: bare-400 precision + usage-ceiling ------------------------
    setEnv("NVIDIA_NIM_API_KEY", "test-fake-nvidia-nim-credential");
    setEnv("NVIDIA_NIM_BASE_URL", mockOrigin);

    setHandler(jsonError(400, "400 Bad Request"));
    await expectGenerateError({
      name: "nvidia-nim: bare malformed-request trigger -> NOT AuthenticationError (deliberate precision)",
      run: () =>
        gen({ provider: "nvidia-nim", model: "meta/llama-3.1-8b-instruct" }),
      notClasses: [AuthenticationError],
    });

    setHandler(jsonError(403, "403 account has hit its usage ceiling"));
    await expectGenerateError({
      name: "nvidia-nim: usage-ceiling trigger -> generic ProviderError",
      run: () =>
        gen({ provider: "nvidia-nim", model: "meta/llama-3.1-8b-instruct" }),
      notClasses: [AuthenticationError, RateLimitError, InvalidModelError],
    });

    // -- openrouter: multi-branch quirks ---------------------------------------
    setEnv("OPENROUTER_API_KEY", "test-fake-openrouter-credential");
    setEnv("OPENROUTER_BASE_URL", mockOrigin);

    setHandler(jsonError(400, "Timeout while awaiting upstream provider"));
    await expectGenerateError({
      name: "openrouter: case-sensitive duck-typed timeout ('Timeout' substring) -> NetworkError",
      run: () => gen({ provider: "openrouter", model: "openai/gpt-4o-mini" }),
      expectClass: NetworkError,
    });

    setHandler(jsonError(400, "insufficient_credits: balance exhausted"));
    await expectGenerateError({
      name: "openrouter: credit-exhaustion trigger -> generic ProviderError with a top-up URL",
      run: () => gen({ provider: "openrouter", model: "openai/gpt-4o-mini" }),
      notClasses: [AuthenticationError, RateLimitError, InvalidModelError],
      messageIncludes: ["openrouter.ai/credits"],
    });

    setHandler(jsonError(400, "No endpoints found for this request"));
    await expectGenerateError({
      name: "openrouter: no-capacity-model trigger -> InvalidModelError echoing the model",
      run: () => gen({ provider: "openrouter", model: "some/ghost-model" }),
      expectClass: InvalidModelError,
      messageIncludes: ["some/ghost-model"],
    });

    setHandler(jsonError(400, "tools are not supported for this model"));
    await expectGenerateError({
      name: "openrouter: tool-support trigger -> ProviderError with capable-model suggestions",
      run: () => gen({ provider: "openrouter", model: "openai/gpt-4o-mini" }),
      notClasses: [AuthenticationError, RateLimitError, InvalidModelError],
      messageIncludes: ["openrouter.ai/models?supported_parameters=tools"],
    });

    // -- ollama: local-runtime quirks -------------------------------------------
    setEnv("OLLAMA_BASE_URL", CLOSED_PORT_ORIGIN);
    await expectGenerateError({
      name: "ollama: real ECONNREFUSED (closed port) -> NetworkError naming the base URL",
      run: () => gen({ provider: "ollama", model: "llama3.1" }),
      messageIncludes: ["Cannot connect to Ollama"],
    });
    // DEMOTED to contract suite: "TimeoutError -> NetworkError with its own
    // wording (not the classifier default)" (old Part B #20) — client-side
    // timeout, not cheaply reproducible via real HTTP within budget.

    setEnv("OLLAMA_BASE_URL", mockOrigin);
    setHandler(
      jsonError(400, "the requested MODEL was Not Found on this host"),
    );
    await expectGenerateError({
      name: "ollama: missing-model haystack (message text) -> InvalidModelError",
      run: () => gen({ provider: "ollama", model: "llama3.1" }),
      expectClass: InvalidModelError,
    });

    setHandler(jsonError(404, "upstream returned status 404"));
    await expectGenerateError({
      name: "ollama: bare endpoint-mismatch 404 -> generic ProviderError distinct from missing-model",
      run: () => gen({ provider: "ollama", model: "llama3.1" }),
      notClasses: [AuthenticationError, RateLimitError, InvalidModelError],
    });

    // -- huggingface: real auth trigger + tool-calling -------------------------
    setEnv("HUGGINGFACE_API_KEY", "test-fake-huggingface-credential");
    setEnv("HUGGINGFACE_BASE_URL", mockOrigin);

    setHandler(jsonError(401, "Invalid token"));
    await expectGenerateError({
      name: "huggingface: credential-token trigger -> AuthenticationError naming its env var",
      run: () =>
        gen({
          provider: "huggingface",
          model: "meta-llama/Llama-3.1-8B-Instruct",
        }),
      expectClass: AuthenticationError,
      messageIncludes: ["HUGGINGFACE_API_KEY"],
    });

    setHandler(
      jsonError(400, "this function/tool call could not be processed"),
    );
    await expectGenerateError({
      name: "huggingface: tool-calling trigger -> ProviderError with capable-model suggestions",
      run: () =>
        gen({
          provider: "huggingface",
          model: "meta-llama/Llama-3.1-8B-Instruct",
        }),
      notClasses: [AuthenticationError, RateLimitError, InvalidModelError],
      messageIncludes: ["Hermes"],
    });

    // -- llamacpp: local-runtime quirks ------------------------------------------
    setEnv("LLAMACPP_BASE_URL", CLOSED_PORT_ORIGIN);
    await expectGenerateError({
      name: "llamacpp: real ECONNREFUSED (closed port) -> NetworkError with a launch hint",
      run: () => gen({ provider: "llamacpp", model: "local-model" }),
      messageIncludes: ["llama-server"],
    });

    setEnv("LLAMACPP_BASE_URL", mockOrigin);
    setHandler(jsonError(400, "400 rejected"));
    await expectGenerateError({
      name: "llamacpp: bare malformed-request trigger -> ProviderError with a tool-support hint",
      run: () => gen({ provider: "llamacpp", model: "local-model" }),
      notClasses: [AuthenticationError, RateLimitError, InvalidModelError],
      messageIncludes: ["--jinja"],
    });

    // -- lm-studio: local-runtime quirks -----------------------------------------
    setEnv("LM_STUDIO_BASE_URL", CLOSED_PORT_ORIGIN);
    await expectGenerateError({
      name: "lm-studio: real ECONNREFUSED (closed port) -> NetworkError with a launch hint",
      run: () => gen({ provider: "lm-studio", model: "local-model" }),
      messageIncludes: ["Start Server"],
    });

    setEnv("LM_STUDIO_BASE_URL", mockOrigin);
    setHandler(jsonError(404, "model_not_found: no such model loaded"));
    await expectGenerateError({
      name: "lm-studio: missing-model trigger -> InvalidModelError with a load hint",
      run: () => gen({ provider: "lm-studio", model: "local-model" }),
      expectClass: InvalidModelError,
      messageIncludes: ["is not loaded"],
    });

    // -- cohere: real lowercase auth trigger + trial-limit ----------------------
    setEnv("COHERE_API_KEY", "test-fake-cohere-credential");
    setEnv("COHERE_BASE_URL", mockOrigin);

    setHandler(jsonError(401, "invalid api token"));
    await expectGenerateError({
      name: "cohere: lowercase credential trigger -> AuthenticationError (case-sensitive, not normalized)",
      run: () => gen({ provider: "cohere", model: "command-r-plus" }),
      expectClass: AuthenticationError,
      messageIncludes: ["COHERE_API_KEY"],
    });

    setHandler(jsonError(400, "trial limit exceeded for this key"));
    await expectGenerateError({
      name: "cohere: trial-usage trigger -> generic ProviderError with an upgrade URL",
      run: () => gen({ provider: "cohere", model: "command-r-plus" }),
      notClasses: [AuthenticationError, RateLimitError, InvalidModelError],
      messageIncludes: ["dashboard.cohere.com/billing"],
    });

    // =========================================================================
    // SECTION: Anthropic (old File3 anthropic tests #2-7; #1 TimeoutError
    // demoted to contract — client-side timeout, not cheaply e2e-reproducible)
    // =========================================================================
    setEnv("ANTHROPIC_API_KEY", "test-fake-anthropic-credential");
    setEnv("ANTHROPIC_BASE_URL", mockOrigin);

    setHandler(jsonError(401, "API_KEY_INVALID"));
    await expectGenerateError({
      name: "anthropic: API_KEY_INVALID -> AuthenticationError",
      run: () =>
        gen({ provider: "anthropic", model: "claude-3-5-sonnet-20241022" }),
      expectClass: AuthenticationError,
    });

    setHandler(
      jsonError(
        401,
        '{"type":"authentication_error","message":"invalid x-api-key"}',
      ),
    );
    await expectGenerateError({
      name: "anthropic: SDK-style 401 body (no API_KEY_INVALID text) -> AuthenticationError via statusCode",
      run: () =>
        gen({ provider: "anthropic", model: "claude-3-5-sonnet-20241022" }),
      expectClass: AuthenticationError,
    });

    // 429/5xx/network-transport failures are retryable by status, so
    // directProviderGeneration()'s single-provider fallback loop always
    // wraps them in a plain Error (see the DEFAULT_ERROR_RULES mistral 429
    // case above) — asserted via message content, not instanceof.
    setHandler(jsonError(429, "too_many_requests"));
    await expectGenerateError({
      name: "anthropic: 429/too_many_requests -> RateLimitError",
      run: () =>
        gen({ provider: "anthropic", model: "claude-3-5-sonnet-20241022" }),
      messageIncludes: ["Anthropic rate limit exceeded"],
    });

    setHandler(jsonError(429, "too many requests"));
    await expectGenerateError({
      name: "anthropic: SDK-style statusCode 429 (no rate-limit text) -> RateLimitError",
      run: () =>
        gen({ provider: "anthropic", model: "claude-3-5-sonnet-20241022" }),
      messageIncludes: ["Anthropic rate limit exceeded"],
    });

    // Real socket death (not a synthetic message string) via
    // req.socket.destroy(). Node's native fetch (undici) surfaces this as
    // `TypeError: fetch failed` wrapping a `SocketError` with message
    // "other side closed" and code `UND_ERR_SOCKET` on `.cause` — NOT the
    // literal "ECONNRESET" text or code, matching the mistral case above.
    // Assertion is correct (buildErrorContext walks `.cause` and the
    // NetworkError rule matches the transient errorCode set), only the old
    // name lied about the mechanism.
    setSocketDestroyHandler();
    await expectGenerateError({
      name: "anthropic: real socket death (UND_ERR_SOCKET) -> NetworkError",
      run: () =>
        gen({ provider: "anthropic", model: "claude-3-5-sonnet-20241022" }),
      messageIncludes: ["Connection error"],
    });

    setHandler(jsonError(502, "bad gateway"));
    await expectGenerateError({
      name: "anthropic: 5xx -> generic ProviderError, not NetworkError",
      run: () =>
        gen({ provider: "anthropic", model: "claude-3-5-sonnet-20241022" }),
      messageIncludes: ["Server error: 502"],
    });

    // =========================================================================
    // SECTION: Google Vertex (old File3 #8-11) — VERTEX EXCEPTION
    // -------------------------------------------------------------------------
    // Real ADC OAuth makes true e2e impossible for Vertex (scout-2 #21): a
    // fake service-account key fails signature verification at Google's real
    // token endpoint before any request reaches a local mock — no env var or
    // config hook in NeuroLink or the underlying google-auth-library lets
    // this be redirected. Ported as direct formatProviderError() calls on a
    // GoogleVertexProvider instance imported from dist instead (same pattern
    // providers-mocked.ts already uses for this exact reason).
    // =========================================================================
    {
      const vertex = new GoogleVertexProvider() as unknown as {
        formatProviderError(error: unknown): Error;
      };

      const permissionDenied = vertex.formatProviderError(
        new Error("PERMISSION_DENIED: no access"),
      );
      record(
        "vertex: PERMISSION_DENIED -> AuthenticationError",
        permissionDenied instanceof AuthenticationError,
        permissionDenied instanceof AuthenticationError
          ? undefined
          : `got ${permissionDenied.constructor.name}`,
      );

      const notFound = vertex.formatProviderError(
        new Error("NOT_FOUND: model not found"),
      );
      record(
        "vertex: NOT_FOUND -> InvalidModelError with model suggestions",
        notFound instanceof InvalidModelError,
        notFound instanceof InvalidModelError
          ? undefined
          : `got ${notFound.constructor.name}`,
      );

      const resourceExhausted = vertex.formatProviderError(
        new Error('429 RESOURCE_EXHAUSTED {"retryDelay":"12s"}'),
      );
      const resourceExhaustedOk =
        resourceExhausted instanceof RateLimitError &&
        resourceExhausted.message.includes("12s");
      record(
        "vertex: 429 RESOURCE_EXHAUSTED with retryDelay -> RateLimitError mentioning the delay",
        resourceExhaustedOk,
        resourceExhaustedOk
          ? undefined
          : `got ${resourceExhausted.constructor.name}: ${resourceExhausted.message}`,
      );

      const overloaded = vertex.formatProviderError(
        new Error("model is overloaded, try again"),
      );
      record(
        "vertex: overloaded -> RateLimitError (regex-detected, not substring)",
        overloaded instanceof RateLimitError,
        overloaded instanceof RateLimitError
          ? undefined
          : `got ${overloaded.constructor.name}`,
      );
    }

    // =========================================================================
    // SECTION: Amazon Bedrock (old File3 #12-14; #15 by-.code and #16
    // ordering demoted to contract — see reasons below)
    // -------------------------------------------------------------------------
    // SigV4 is pure local HMAC, no real AWS round-trip needed to validate
    // credentials (scout-2 #22) — redirect via AWS_ENDPOINT_URL_BEDROCK_RUNTIME,
    // which @smithy/middleware-endpoint reads automatically.
    // =========================================================================
    setEnv("AWS_ENDPOINT_URL_BEDROCK_RUNTIME", bedrockMockOrigin);
    setEnv("AWS_ACCESS_KEY_ID", "test-fake-bedrock-access-key");
    setEnv("AWS_SECRET_ACCESS_KEY", "test-fake-bedrock-secret-key");
    setEnv("AWS_REGION", "us-east-1");

    setHandler(
      bedrockError(
        403,
        "AccessDeniedException",
        "AccessDeniedException: denied",
      ),
    );
    await expectGenerateError({
      name: "bedrock: AccessDeniedException -> AuthenticationError",
      run: () =>
        gen({
          provider: "bedrock",
          model: "anthropic.claude-3-5-sonnet-20241022-v2:0",
        }),
      expectClass: AuthenticationError,
    });

    // Unlike the OpenAI-compat family (buildAPIError stamps `.statusCode =
    // res.status` on the raw error), the AWS SDK's ServiceException base
    // class (@smithy/smithy-client) never sets a flat `.status`/`.statusCode`
    // — only `$metadata.httpStatusCode`, which nothing in the classification
    // path duck-types onto the thrown error. So `isNonRetryableProviderError`'s
    // numeric-status bypass never fires for Bedrock, regardless of the
    // original HTTP status: wrapping is governed solely by the class-bypass
    // check (AuthenticationError et al.) and message-pattern matching, and
    // neither "Validation error: ValidationException: bad input" nor "Bedrock
    // rate limit (throttled): throttled" matches any non-retryable message
    // pattern — both get wrapped by directProviderGeneration()'s fallback
    // exhaustion, same as every other non-bypassed classified error in this
    // suite. Asserted via message content instead of instanceof.
    setHandler(
      bedrockError(
        400,
        "ValidationException",
        "ValidationException: bad input",
      ),
    );
    await expectGenerateError({
      name: "bedrock: ValidationException -> generic ProviderError, not RateLimitError",
      run: () =>
        gen({
          provider: "bedrock",
          model: "anthropic.claude-3-5-sonnet-20241022-v2:0",
        }),
      messageIncludes: ["Validation error: ValidationException: bad input"],
    });

    setHandler(bedrockError(429, "ThrottlingException", "throttled"));
    await expectGenerateError({
      name: "bedrock: ThrottlingException by .name -> RateLimitError",
      run: () =>
        gen({
          provider: "bedrock",
          model: "anthropic.claude-3-5-sonnet-20241022-v2:0",
        }),
      messageIncludes: ["Bedrock rate limit (throttled): throttled"],
    });
    // DEMOTED to contract suite: "ThrottlingException by .code (not just
    // .name) -> RateLimitError" (old File3 #15). Verified against the
    // installed @aws-sdk/client-bedrock-runtime's generated exception
    // classes (dist-cjs/index.js): every recognized exception (including
    // ThrottlingException) sets only `name` as an own field in its
    // constructor — never `code`. A real Bedrock error response deserialized
    // by this SDK version can therefore never populate `ctx.errorCode`; this
    // rule branch is a defensive duck-typed fallback no live/mocked AWS
    // response produces with the currently installed SDK.
    // DEMOTED to contract suite: "ThrottlingException checked BEFORE the
    // ValidationException generic path" (old File3 #16, already flagged by
    // the task brief as a "self-contradictory bedrock name-vs-message" rule-
    // ordering pin — kept as a determinism-exception case as directed).

    // =========================================================================
    // SECTION: public dist surface — TimeoutError/ServerTimeoutError identity
    // (old File1 #14 — Task-5 public-surface test, moved here per the brief)
    // =========================================================================
    {
      const publicModule = await import("../dist/index.js");
      const hasServerTimeoutError = "ServerTimeoutError" in publicModule;
      const hasTimeoutError = "TimeoutError" in publicModule;
      const sameIdentity =
        hasServerTimeoutError &&
        hasTimeoutError &&
        (publicModule as { TimeoutError: unknown }).TimeoutError ===
          (publicModule as { ServerTimeoutError: unknown }).ServerTimeoutError;
      record(
        "dist public surface: exports both TimeoutError and ServerTimeoutError with === identity",
        sameIdentity,
        sameIdentity
          ? undefined
          : `hasServerTimeoutError=${hasServerTimeoutError} hasTimeoutError=${hasTimeoutError}`,
      );
    }

    // =========================================================================
    // SECTION: public dist surface — AuthenticationError/AuthorizationError/
    // RateLimitError identity. Same shadowing bug as TimeoutError above, just
    // fixed later: `dist/index.js` does `export * from "./types/index.js"`
    // and then a LATER explicit named re-export block from `./server/index.js`
    // whose same-named AuthenticationError/AuthorizationError/RateLimitError
    // classes (extending ServerAdapterError) used to silently win over the
    // provider-error classes of the same name (extending ProviderError) — an
    // explicit named export placed after an earlier `export *` always wins
    // per ESM semantics. Fixed by Server*-prefixing the three server-side
    // exports at both barrels (src/lib/server/index.ts, src/lib/index.ts),
    // mirroring the ValidationError/RateLimitError ->
    // ServerValidationError/ServerRateLimitError pattern already in place and
    // the TimeoutError -> ServerTimeoutError fix pinned just above. The
    // `dist/types/index.js` import this suite's `main()` uses throughout
    // (see the comment at its top) sidesteps the bug entirely by never going
    // through `dist/index.js` for these classes — this section is what
    // actually exercises the public surface itself.
    // =========================================================================
    {
      const publicModule = (await import("../dist/index.js")) as Record<
        string,
        unknown
      >;
      const typesModule = (await import("../dist/types/index.js")) as Record<
        string,
        unknown
      >;
      const pairs: [bare: string, serverAliased: string][] = [
        ["AuthenticationError", "ServerAuthenticationError"],
        ["AuthorizationError", "ServerAuthorizationError"],
        ["RateLimitError", "ServerRateLimitError"],
      ];
      for (const [bare, serverAliased] of pairs) {
        const publicClass = publicModule[bare];
        const typesClass = typesModule[bare];
        const serverClass = publicModule[serverAliased];

        const wonByProviderClass =
          typeof publicClass === "function" &&
          typeof typesClass === "function" &&
          publicClass === typesClass;
        record(
          `dist public surface: ${bare} === types/index.js's ${bare} (provider class won, not the server class)`,
          wonByProviderClass,
          wonByProviderClass
            ? undefined
            : `hasPublic=${typeof publicClass === "function"} hasTypes=${typeof typesClass === "function"} identical=${publicClass === typesClass}`,
        );

        const distinctFromServerClass =
          typeof serverClass === "function" && publicClass !== serverClass;
        record(
          `dist public surface: ${serverAliased} is exported and distinct from ${bare}`,
          distinctFromServerClass,
          distinctFromServerClass
            ? undefined
            : `hasServerClass=${typeof serverClass === "function"} identicalToBare=${publicClass === serverClass}`,
        );
      }
    }

    // =========================================================================
    // SECTION: public dist surface — end-to-end regression for the
    // AuthenticationError shadowing fix. Drives a real 401 through
    // NeuroLink().generate() (reusing the mistral DEFAULT_ERROR_RULES 401
    // case above) and asserts the caught error is `instanceof` an
    // AuthenticationError imported from `../dist/index.js` — the public
    // `@juspay/neurolink` entry point, deliberately NOT `../dist/types/
    // index.js` like every other test in this suite. Before the fix,
    // `dist/index.js`'s `AuthenticationError` was the server-adapter class
    // (extends ServerAdapterError), so this `instanceof` check failed even
    // though `generate()` legitimately threw a provider AuthenticationError;
    // after the fix the two classes are identical (see the identity section
    // above) so this passes.
    // =========================================================================
    {
      const { AuthenticationError: PublicAuthenticationError } =
        (await import("../dist/index.js")) as {
          AuthenticationError: ErrorCtor;
        };
      setEnv("MISTRAL_API_KEY", "test-fake-mistral-credential");
      setEnv("MISTRAL_BASE_URL", mockOrigin);
      setHandler(jsonError(401, "denied"));
      await expectGenerateError({
        name: "public surface regression: real 401 (mistral) is instanceof AuthenticationError imported from dist/index.js",
        run: () => gen({ provider: "mistral", model: "mistral-large-latest" }),
        expectClass: PublicAuthenticationError,
      });
    }

    // =========================================================================
    // SECTION: Google AI Studio — Gemini tools-vs-schema mutual exclusion,
    // end-to-end (rework batch I, task 1b). Supersedes the two source-grep
    // tests formerly in continuous-test-suite-gemini-tools-schema-policy.ts
    // (deleted; that file's other two tests were predicate-level checks of
    // isToolsSchemaExclusionInForce() already ported verbatim into
    // continuous-test-suite-error-classifier-contract.ts by batch G — NOT
    // re-ported here).
    //
    // Both generate() and stream() on GoogleAIStudioProvider route through
    // @google/genai's `client.models.generateContentStream()` under the hood
    // (confirmed by reading googleAiStudio/client.ts directly — generate()
    // collects the stream via collectStreamChunks, stream() consumes it
    // incrementally), so a single mock response shape serves both. Both
    // paths are pointed at a mock server via GOOGLE_AI_BASE_URL (wired in
    // this same commit — see getBaseURL() in googleAiStudio/client.ts) and
    // asked for BOTH tools and a JSON schema simultaneously. This asserts on
    // the CAPTURED OUTBOUND REQUEST BODY (module-level `lastRequestBody`,
    // populated by handleMockRequest on every hit) — not just that the call
    // completes — that the shared isToolsSchemaExclusionInForce predicate
    // actually fired over the wire: no `tools` key in the JSON body, and
    // `generationConfig.responseSchema` present (schema wins, tools
    // dropped). Verified against the installed @google/genai SDK source
    // (generateContentParametersToMldev / generateContentConfigToMldev)
    // that `tools` sits at the top level of the body while
    // responseSchema/responseMimeType live under `generationConfig`.
    // =========================================================================
    {
      setEnv("GOOGLE_AI_API_KEY", "test-fake-google-ai-credential");
      setEnv("GOOGLE_AI_BASE_URL", mockOrigin);

      // Harmless — never actually invoked, since the mock's SSE response
      // never contains a functionCall part. Its only job is to make
      // Object.keys(tools).length > 0 so the exclusion predicate sees an
      // active tool set, mirroring continuous-test-suite-json-e2e.ts's
      // pingTool.
      const pingTool = {
        ping: tool({
          description:
            "Health check. Returns 'pong'. Do not call unless explicitly asked.",
          inputSchema: z.object({ value: z.string().describe("anything") }),
          execute: async () => "pong",
        }),
      };
      const schema = z.object({ answer: z.string() });

      type OutboundBody = {
        tools?: unknown;
        generationConfig?: {
          responseSchema?: unknown;
          responseMimeType?: unknown;
        };
      };

      // --- generate() ---------------------------------------------------
      setHandler(geminiSSEHandler('{"answer":"ok"}'));
      try {
        await nl().generate({
          provider: "google-ai",
          model: "gemini-2.5-flash",
          input: { text: "What is the weather in Paris?" },
          tools: pingTool,
          schema,
        } as Parameters<InstanceType<typeof NeuroLink>["generate"]>[0]);
        const body = JSON.parse(lastRequestBody) as OutboundBody;
        const toolsAbsent =
          body.tools === undefined ||
          (Array.isArray(body.tools) && body.tools.length === 0);
        const schemaPresent =
          body.generationConfig?.responseSchema !== undefined;
        record(
          "Gemini tools-vs-schema e2e (generate): outbound body has no tools and a responseSchema",
          toolsAbsent && schemaPresent,
          toolsAbsent && schemaPresent
            ? undefined
            : `toolsAbsent=${toolsAbsent} schemaPresent=${schemaPresent} tools=${JSON.stringify(body.tools)} generationConfig=${JSON.stringify(body.generationConfig)}`,
        );
      } catch (err) {
        record(
          "Gemini tools-vs-schema e2e (generate): outbound body has no tools and a responseSchema",
          false,
          `generate() threw unexpectedly: ${err instanceof Error ? err.message : String(err)}`,
        );
      }

      // --- stream() -------------------------------------------------------
      setHandler(geminiSSEHandler('{"answer":"ok"}'));
      try {
        const streamResult = await nl().stream({
          provider: "google-ai",
          model: "gemini-2.5-flash",
          input: { text: "What is the weather in Paris?" },
          tools: pingTool,
          schema,
        } as Parameters<InstanceType<typeof NeuroLink>["stream"]>[0]);
        for await (const _chunk of streamResult.stream) {
          // Drain to completion — the assertion is on the captured request
          // body, not the streamed content.
        }
        const body = JSON.parse(lastRequestBody) as OutboundBody;
        const toolsAbsent =
          body.tools === undefined ||
          (Array.isArray(body.tools) && body.tools.length === 0);
        const schemaPresent =
          body.generationConfig?.responseSchema !== undefined;
        record(
          "Gemini tools-vs-schema e2e (stream): outbound body has no tools and a responseSchema",
          toolsAbsent && schemaPresent,
          toolsAbsent && schemaPresent
            ? undefined
            : `toolsAbsent=${toolsAbsent} schemaPresent=${schemaPresent} tools=${JSON.stringify(body.tools)} generationConfig=${JSON.stringify(body.generationConfig)}`,
        );
      } catch (err) {
        record(
          "Gemini tools-vs-schema e2e (stream): outbound body has no tools and a responseSchema",
          false,
          `stream() threw unexpectedly: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
    // =========================================================================
    // SECTION: structured-output recovery over the wire (openai-compatible)
    // -------------------------------------------------------------------------
    // Two vendor behaviours met live while onboarding the catalog providers,
    // reproduced against the mock server and asserted on the CAPTURED
    // OUTBOUND BODIES, not just the final result:
    //   1. A vendor that ignores `response_format` (GMI Cloud's MiniMax
    //      endpoint) answers a strict json_schema request in prose. The
    //      structured-output fallback must re-ask with the schema spelled out
    //      in the prompt, and the coercion path must recover the object.
    //   2. A vendor whose tool-call parser swallows a JSON-shaped answer
    //      (io.net's Llama endpoint) ends the step after a tool result with
    //      `finish_reason: tool_calls`, no tool_calls and null content. The
    //      loop must re-ask exactly once with `tool_choice: "none"`, carrying
    //      the tool result, and keep the executed tool in the result.
    // Handlers key on request CONTENT, never on hit count, so provider-side
    // retries can replay any request and get the same answer.
    // =========================================================================
    {
      setEnv(
        "OPENAI_COMPATIBLE_API_KEY",
        "test-fake-openai-compatible-credential",
      );
      setEnv("OPENAI_COMPATIBLE_BASE_URL", mockOrigin);
      type ChatRequestBody = {
        messages?: Array<{ role: string; content?: unknown }>;
        response_format?: unknown;
        tool_choice?: unknown;
      };
      const completion = (
        message: Record<string, unknown>,
        finishReason: string,
      ): MockResponseSpec => ({
        status: 200,
        body: JSON.stringify({
          id: "chatcmpl-mock",
          object: "chat.completion",
          created: 0,
          model: "gpt-4o-mini",
          choices: [{ index: 0, message, finish_reason: finishReason }],
          usage: { prompt_tokens: 5, completion_tokens: 5, total_tokens: 10 },
        }),
      });
      const parseBody = (raw: string): ChatRequestBody => {
        try {
          return JSON.parse(raw) as ChatRequestBody;
        } catch {
          return {};
        }
      };
      const carriesJsonInstruction = (body: ChatRequestBody): boolean =>
        JSON.stringify(body.messages ?? []).includes("JSON Schema");

      // --- 1. response_format ignored -> prompt-side JSON instruction -------
      {
        const seen: ChatRequestBody[] = [];
        setHandler(() => {
          const body = parseBody(lastRequestBody);
          seen.push(body);
          return completion(
            {
              role: "assistant",
              content: carriesJsonInstruction(body)
                ? '{"city":"Tokyo","country":"Japan","population_millions":14}'
                : "Tokyo is the capital of Japan, home to roughly 14 million people in the city proper.",
            },
            "stop",
          );
        });
        const citySchema = z.object({
          city: z.string(),
          country: z.string(),
          population_millions: z.number(),
        });
        const name =
          "openai-compatible: vendor ignores response_format -> fallback re-asks with the schema in the prompt and recovers structuredData";
        try {
          const r = await nl().generate({
            provider: "openai-compatible",
            model: "gpt-4o-mini",
            input: {
              text: "Return the city Tokyo, its country, and its approximate population in millions.",
            },
            systemPrompt: "You are a terse geography assistant.",
            schema: citySchema,
            disableTools: true,
          } as Parameters<InstanceType<typeof NeuroLink>["generate"]>[0]);
          const parsed = citySchema.safeParse(r.structuredData);
          const first = seen[0];
          const last = seen[seen.length - 1];
          const lastSystem = (last?.messages ?? []).filter(
            (m) => m.role === "system",
          );
          const singleMergedSystem =
            lastSystem.length === 1 &&
            typeof lastSystem[0]?.content === "string" &&
            lastSystem[0].content.includes("terse geography assistant") &&
            lastSystem[0].content.includes("JSON Schema");
          const firstNative =
            first !== undefined &&
            first.response_format !== undefined &&
            !carriesJsonInstruction(first);
          const lastPromptSide =
            last !== undefined &&
            last.response_format === undefined &&
            carriesJsonInstruction(last);
          const problems: string[] = [];
          if (!parsed.success) {
            problems.push("structuredData did not satisfy the schema");
          }
          if (seen.length < 2) {
            problems.push(
              `expected a fallback request, saw ${seen.length} request(s)`,
            );
          }
          if (!firstNative) {
            problems.push(
              "first request did not carry response_format without a prompt instruction",
            );
          }
          if (!lastPromptSide) {
            problems.push(
              "fallback request did not carry the JSON instruction with response_format removed",
            );
          }
          if (!singleMergedSystem) {
            problems.push(
              "fallback request did not merge the instruction into the caller's single system message",
            );
          }
          record(name, problems.length === 0, problems.join("; ") || undefined);
        } catch (err) {
          record(
            name,
            false,
            `generate() threw unexpectedly: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }

      // --- 2. empty tool_calls finish -> one tool_choice:none re-ask --------
      {
        const seen: ChatRequestBody[] = [];
        setHandler(() => {
          const body = parseBody(lastRequestBody);
          seen.push(body);
          const hasToolResult = (body.messages ?? []).some(
            (m) => m.role === "tool",
          );
          if (body.tool_choice === "none") {
            return completion(
              {
                role: "assistant",
                content: '{"code":"ZQ-TEST","source":"tool"}',
              },
              "stop",
            );
          }
          if (hasToolResult) {
            return completion(
              { role: "assistant", content: null, refusal: null },
              "tool_calls",
            );
          }
          return completion(
            {
              role: "assistant",
              content: null,
              tool_calls: [
                {
                  id: "call_1",
                  type: "function",
                  function: { name: "getSecretCode", arguments: "{}" },
                },
              ],
            },
            "tool_calls",
          );
        });
        const codeTool = {
          getSecretCode: tool({
            description: "Returns the secret code. Takes no arguments.",
            inputSchema: z.object({}),
            execute: async () => ({ code: "ZQ-TEST" }),
          }),
        };
        const codeSchema = z.object({ code: z.string(), source: z.string() });
        const name =
          "openai-compatible: empty tool_calls finish after a tool result -> one tool_choice:none re-ask recovers the answer";
        try {
          const r = (await nl().generate({
            provider: "openai-compatible",
            model: "gpt-4o-mini",
            input: {
              text: "Call getSecretCode, then answer as JSON with the code and source.",
            },
            tools: codeTool,
            schema: codeSchema,
            maxSteps: 4,
          } as Parameters<InstanceType<typeof NeuroLink>["generate"]>[0])) as {
            structuredData?: unknown;
            toolsUsed?: string[];
            toolExecutions?: unknown[];
          };
          const parsed = codeSchema.safeParse(r.structuredData);
          const reasks = seen.filter((b) => b.tool_choice === "none");
          const reaskCarriesToolResult =
            reasks.length === 1 &&
            (reasks[0]?.messages ?? []).some((m) => m.role === "tool");
          const toolKept =
            (Array.isArray(r.toolsUsed) &&
              r.toolsUsed.includes("getSecretCode")) ||
            (Array.isArray(r.toolExecutions) && r.toolExecutions.length > 0);
          const problems: string[] = [];
          if (!parsed.success || parsed.data.code !== "ZQ-TEST") {
            problems.push("structuredData did not carry the tool's code");
          }
          if (reasks.length !== 1) {
            problems.push(
              `expected exactly one tool_choice none request, saw ${reasks.length}`,
            );
          }
          if (!reaskCarriesToolResult) {
            problems.push("re-ask did not carry the tool result message");
          }
          if (!toolKept) {
            problems.push(
              "executed tool missing from toolsUsed/toolExecutions",
            );
          }
          record(name, problems.length === 0, problems.join("; ") || undefined);
        } catch (err) {
          record(
            name,
            false,
            `generate() threw unexpectedly: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }

      // --- 3. re-ask fails -> original result is kept, never thrown -------
      {
        setHandler(() => {
          const body = parseBody(lastRequestBody);
          const hasToolResult = (body.messages ?? []).some(
            (m) => m.role === "tool",
          );
          if (body.tool_choice === "none") {
            return {
              status: 500,
              headers: { "retry-after": "0" },
              body: JSON.stringify({ error: { message: "upstream hiccup" } }),
            };
          }
          if (hasToolResult) {
            return completion(
              { role: "assistant", content: null, refusal: null },
              "tool_calls",
            );
          }
          return completion(
            {
              role: "assistant",
              content: null,
              tool_calls: [
                {
                  id: "call_1",
                  type: "function",
                  function: { name: "getSecretCode", arguments: "{}" },
                },
              ],
            },
            "tool_calls",
          );
        });
        const codeTool = {
          getSecretCode: tool({
            description: "Returns the secret code. Takes no arguments.",
            inputSchema: z.object({}),
            execute: async () => ({ code: "ZQ-TEST" }),
          }),
        };
        const name =
          "openai-compatible: a failing tool_choice:none re-ask degrades to the original result instead of throwing";
        try {
          const r = (await nl().generate({
            provider: "openai-compatible",
            model: "gpt-4o-mini",
            input: { text: "Call getSecretCode, then answer." },
            tools: codeTool,
            maxSteps: 4,
          } as Parameters<InstanceType<typeof NeuroLink>["generate"]>[0])) as {
            content?: string;
            toolsUsed?: string[];
            toolExecutions?: unknown[];
          };
          const toolKept =
            (Array.isArray(r.toolsUsed) &&
              r.toolsUsed.includes("getSecretCode")) ||
            (Array.isArray(r.toolExecutions) && r.toolExecutions.length > 0);
          const problems: string[] = [];
          if (!toolKept) {
            problems.push("executed tool missing from the degraded result");
          }
          if ((r.content ?? "").trim().length !== 0) {
            problems.push("degraded result unexpectedly carried text");
          }
          record(name, problems.length === 0, problems.join("; ") || undefined);
        } catch (err) {
          record(
            name,
            false,
            `generate() threw instead of degrading: ${err instanceof Error ? err.constructor.name : "non-Error"}`,
          );
        }
      }

      // --- 4. no step budget left -> no re-ask, honest step-cap ------------
      {
        const seen: ChatRequestBody[] = [];
        setHandler(() => {
          const body = parseBody(lastRequestBody);
          seen.push(body);
          const hasToolResult = (body.messages ?? []).some(
            (m) => m.role === "tool",
          );
          if (body.tool_choice === "none") {
            return completion(
              {
                role: "assistant",
                content: '{"code":"ZQ-TEST","source":"tool"}',
              },
              "stop",
            );
          }
          if (hasToolResult) {
            return completion(
              { role: "assistant", content: null, refusal: null },
              "tool_calls",
            );
          }
          return completion(
            {
              role: "assistant",
              content: null,
              tool_calls: [
                {
                  id: "call_1",
                  type: "function",
                  function: { name: "getSecretCode", arguments: "{}" },
                },
              ],
            },
            "tool_calls",
          );
        });
        const codeTool = {
          getSecretCode: tool({
            description: "Returns the secret code. Takes no arguments.",
            inputSchema: z.object({}),
            execute: async () => ({ code: "ZQ-TEST" }),
          }),
        };
        const name =
          "openai-compatible: empty tool_calls finish on the last budgeted step -> no re-ask, stopReason step-cap, stepsUsed within maxSteps";
        try {
          const r = (await nl().generate({
            provider: "openai-compatible",
            model: "gpt-4o-mini",
            input: { text: "Call getSecretCode, then answer." },
            tools: codeTool,
            maxSteps: 2,
          } as Parameters<InstanceType<typeof NeuroLink>["generate"]>[0])) as {
            stopReason?: string;
            stepsUsed?: number;
          };
          const reasks = seen.filter((b) => b.tool_choice === "none").length;
          const problems: string[] = [];
          if (reasks !== 0) {
            problems.push(
              `expected no re-ask with the budget spent, saw ${reasks}`,
            );
          }
          if (r.stopReason !== "step-cap") {
            problems.push("stopReason was not step-cap");
          }
          if (typeof r.stepsUsed !== "number" || r.stepsUsed > 2) {
            problems.push("stepsUsed exceeded maxSteps");
          }
          record(name, problems.length === 0, problems.join("; ") || undefined);
        } catch (err) {
          record(
            name,
            false,
            `generate() threw unexpectedly: ${err instanceof Error ? err.constructor.name : "non-Error"}`,
          );
        }
      }

      // --- 5. catalog tools:false keeps native tools off the wire ----------
      // Mancer declares capabilities.tools: false (its free model answers 400
      // BAD_PARAMETERS to any tool list). buildCatalogEntries() surfaces that
      // as OpenAICompatCatalogEntry.supportsTools, and the provider's
      // supportsTools() override honours it, so a caller who registers a tool
      // still gets an answer and the outbound body carries no `tools` key.
      {
        setEnv("MANCER_API_KEY", "mcr_testfakecredential00");
        setEnv("MANCER_BASE_URL", mockOrigin);
        const seen: ChatRequestBody[] = [];
        setHandler(() => {
          seen.push(parseBody(lastRequestBody));
          return completion(
            { role: "assistant", content: "Yes, I am ready." },
            "stop",
          );
        });
        const codeTool = {
          getSecretCode: tool({
            description: "Returns the secret code. Takes no arguments.",
            inputSchema: z.object({}),
            execute: async () => ({ code: "ZQ-TEST" }),
          }),
        };
        const name =
          "mancer (catalog tools:false): a registered tool never reaches the wire and generate() still answers";
        try {
          const r = (await nl().generate({
            provider: "mancer",
            model: "mytholite",
            input: { text: "Use the tool if you can, then say ready." },
            tools: codeTool,
            maxSteps: 3,
          } as Parameters<InstanceType<typeof NeuroLink>["generate"]>[0])) as {
            content?: string;
          };
          const bodiesWithTools = seen.filter(
            (b) =>
              (b as { tools?: unknown }).tools !== undefined ||
              b.tool_choice !== undefined,
          );
          const problems: string[] = [];
          if (seen.length === 0) {
            problems.push("no request reached the mock");
          }
          if (bodiesWithTools.length !== 0) {
            problems.push(
              `${bodiesWithTools.length} request(s) carried tools or tool_choice`,
            );
          }
          if (!/ready/i.test(r.content ?? "")) {
            problems.push("answer did not come back");
          }
          record(name, problems.length === 0, problems.join("; ") || undefined);
        } catch (err) {
          record(
            name,
            false,
            `generate() threw: ${err instanceof Error ? err.constructor.name : "non-Error"}`,
          );
        }
      }
    }
  } finally {
    restoreEnv();
    await new Promise<void>((resolve) => mockServer.close(() => resolve()));
    await new Promise<void>((resolve) =>
      bedrockMockServer.close(() => resolve()),
    );
  }

  const failed = results.filter((r) => !r.ok);
  console.log("\n" + "=".repeat(70));
  console.log(
    `Error classification e2e suite: ${results.length - failed.length}/${results.length} passed`,
  );
  if (failed.length > 0) {
    console.log(`\nFailed (${failed.length}):`);
    for (const f of failed) {
      console.log(`  ✗ ${f.name}${f.reason ? ` — ${f.reason}` : ""}`);
    }
  }
  console.log("=".repeat(70));
  process.exit(failed.length > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Fatal error running error-classification-e2e suite:", err);
  process.exit(1);
});
