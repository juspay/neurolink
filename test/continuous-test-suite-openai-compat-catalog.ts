#!/usr/bin/env tsx
import "dotenv/config";

/**
 * OpenAI-Compat Catalog — E2E contract + regression suite.
 *
 * Rewritten to comply with CLAUDE.md rule 15 ("tests are end-to-end only").
 * The previous version imported `resolveOpenAICompatConfig()` and
 * `ConfiguredOpenAICompatProvider` through deep `../dist/lib/...` paths and
 * drove them directly, including reaching past TypeScript to call the
 * protected `formatProviderError()` — none of that is a surface this
 * package ships. Every case below instead constructs `NeuroLink` (imported
 * only from `../dist/index.js`) and calls `generate()` against a
 * route-based mocked `fetch` (`test/utils/mockFetch.ts`), then asserts on
 * the error class + message a real caller actually receives.
 *
 * No determinism exception is taken anywhere in this file — every section,
 * including catalog-structure coverage, is driven through `generate()`.
 * A handful of pure data-shape invariants the original file checked by
 * reading `OPENAI_COMPAT_CATALOG` directly are genuinely not observable
 * from outside the package; those are named and dropped explicitly in the
 * final section's header comment rather than faked or silently lost.
 *
 * Key end-to-end fact this suite relies on throughout: NeuroLink's
 * provider-fallback wrapper (`directProviderGeneration` in neurolink.ts)
 * only lets a "non-retryable" error class (AuthenticationError,
 * InvalidModelError, and a few others — see
 * `isNonRetryableProviderError`) escape to the caller unwrapped. Anything
 * else — RateLimitError, NetworkError, a plain ProviderError from a
 * TimeoutError override — gets caught, the (single, explicitly-named)
 * provider is not retried further, and the loop still exits through
 * `throw new Error(\`Failed to generate text with all providers. Last
 * error: ${lastError.message}\`)`. So the *class* NeuroLink hands the
 * caller for a retryable case is always the generic `Error`, and the
 * per-provider text this suite pins verbatim shows up as a substring of
 * that wrapper's message, not as `error.message` on its own. That is
 * real, observable, public behavior — not a suite limitation — and it is
 * exactly what lets this suite tell Groq's TimeoutError override apart
 * from every other catalog entry's default (section 4): the wrapper class
 * is identical either way, but the embedded per-provider text differs.
 *
 * Run with: pnpm run test:openai-compat-catalog
 * (Runs against dist/ — `pnpm run build` first.)
 */

import {
  NeuroLink,
  AuthenticationError,
  InvalidModelError,
  ProviderError,
  RateLimitError,
  NetworkError,
} from "../dist/index.js";
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

// `dotenv/config` (above) loads this repo's `.env`, which on a developer
// machine may carry real GROQ_API_KEY / XAI_API_KEY values. Every case in
// this suite must be reachable with NO real provider credentials — env
// vars are always either set to a known fake value or deleted outright, so
// suite behavior never depends on what a given machine's `.env` contains.
// `restoreEnv()` in `main()`'s `finally` puts back whatever `.env` actually
// set, so this has no effect outside the suite's own run.
const CATALOG_ENV_VARS = [
  "GROQ_API_KEY",
  "GROQ_BASE_URL",
  "GROQ_MODEL",
  "XAI_API_KEY",
  "XAI_BASE_URL",
  "XAI_MODEL",
  "TOGETHER_API_KEY",
  "TOGETHER_BASE_URL",
  "TOGETHER_MODEL",
  "FIREWORKS_API_KEY",
  "FIREWORKS_BASE_URL",
  "FIREWORKS_MODEL",
  "PERPLEXITY_API_KEY",
  "PERPLEXITY_BASE_URL",
  "PERPLEXITY_MODEL",
  "MISTRAL_API_KEY",
  "MISTRAL_BASE_URL",
  "MISTRAL_MODEL",
  "CLOUDFLARE_API_KEY",
  "CLOUDFLARE_ACCOUNT_ID",
  "CLOUDFLARE_MODEL",
];

function neutralizeCatalogEnv(): void {
  for (const name of CATALOG_ENV_VARS) {
    setEnv(name, undefined);
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

function okResp(model: string): { status: number; json: unknown } {
  return { status: 200, json: openAIChatResponse("pong", model) };
}

function errResp(
  status: number,
  message: string,
  type: string,
): { status: number; json: unknown } {
  return { status, json: { error: { message, type } } };
}

/** A route whose response resolves after `delayMs` — used to provoke a
 *  client-side TimeoutError when paired with a short `timeout` option. */
function slowOkRoute(delayMs: number, model: string) {
  return async (): Promise<{ status: number; json: unknown }> => {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    return okResp(model);
  };
}

function newNL(): InstanceType<typeof NeuroLink> {
  return new NeuroLink({ conversationMemory: { enabled: false } });
}

async function runCase(name: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
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

// ───────────────────────────────────────────────────────────────────────
// Section 1: credential / baseURL precedence — static baseURL branch
// (groq: baseURLEnvVar + defaultBaseURL, no computedBaseURL)
//
// Exercised entirely through NeuroLink's public `credentials` option
// (see docs/features/per-request-credentials.md) plus assertions on the
// request URL / Authorization header the mock captured — never by calling
// resolveOpenAICompatConfig() directly.
// ───────────────────────────────────────────────────────────────────────

const GROQ_URL = "api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";
const GROQ_DEFAULT_URL = "https://api.groq.com/openai/v1/chat/completions";

async function testResolveConfigPrecedence(): Promise<void> {
  const section = "config precedence (groq, static baseURL)";

  await runCase(`${section}: credentials override wins over env`, async () => {
    setEnv("GROQ_API_KEY", "env-groq-key");
    setEnv("GROQ_BASE_URL", "https://env-groq-proxy.example.com/v1");
    await withMocks(
      [
        {
          method: "POST",
          url: "override-groq-proxy.example.com/v1/chat/completions",
          respond: okResp(GROQ_MODEL),
        },
      ],
      async ({ calls }) => {
        await newNL().generate({
          provider: "groq",
          model: GROQ_MODEL,
          input: { text: "ping" },
          disableTools: true,
          credentials: {
            groq: {
              apiKey: "override-key",
              baseURL: "https://override-groq-proxy.example.com/v1",
            },
          },
        });
        expect(calls.length > 0, "request captured");
        expect(
          new URL(calls[0].url).hostname === "override-groq-proxy.example.com",
          "request URL uses credentials.baseURL override, not the env var",
        );
        expect(
          (calls[0].headers["authorization"] ?? "").includes("override-key"),
          "Authorization header uses credentials.apiKey override, not the env var",
        );
      },
    );
  });

  await runCase(
    `${section}: env var wins over static default (apiKey + baseURL)`,
    async () => {
      setEnv("GROQ_API_KEY", "env-key-xyz");
      setEnv("GROQ_BASE_URL", "https://env-groq-proxy-2.example.com/v1");
      await withMocks(
        [
          {
            method: "POST",
            url: "env-groq-proxy-2.example.com/v1/chat/completions",
            respond: okResp(GROQ_MODEL),
          },
        ],
        async ({ calls }) => {
          await newNL().generate({
            provider: "groq",
            model: GROQ_MODEL,
            input: { text: "ping" },
            disableTools: true,
          });
          expect(
            new URL(calls[0].url).hostname === "env-groq-proxy-2.example.com",
            "request URL falls back to GROQ_BASE_URL over the static default",
          );
          expect(
            (calls[0].headers["authorization"] ?? "").includes("env-key-xyz"),
            "Authorization header falls back to GROQ_API_KEY",
          );
        },
      );
    },
  );

  await runCase(
    `${section}: static default wins with no credentials or env baseURL`,
    async () => {
      setEnv("GROQ_API_KEY", "env-key-xyz");
      setEnv("GROQ_BASE_URL", undefined);
      await withMocks(
        [{ method: "POST", url: GROQ_URL, respond: okResp(GROQ_MODEL) }],
        async ({ calls }) => {
          await newNL().generate({
            provider: "groq",
            model: GROQ_MODEL,
            input: { text: "ping" },
            disableTools: true,
          });
          expectEq(
            calls[0].url,
            GROQ_DEFAULT_URL,
            "request URL uses the catalog entry's static defaultBaseURL",
          );
        },
      );
    },
  );

  await runCase(
    `${section}: blank credentials override is ignored, falls back to env`,
    async () => {
      setEnv("GROQ_API_KEY", "env-key-abc");
      setEnv("GROQ_BASE_URL", undefined);
      await withMocks(
        [{ method: "POST", url: GROQ_URL, respond: okResp(GROQ_MODEL) }],
        async ({ calls }) => {
          await newNL().generate({
            provider: "groq",
            model: GROQ_MODEL,
            input: { text: "ping" },
            disableTools: true,
            credentials: { groq: { apiKey: "   ", baseURL: "   " } },
          });
          expect(
            (calls[0].headers["authorization"] ?? "").includes("env-key-abc"),
            "whitespace-only credentials.apiKey is ignored, env var used instead",
          );
          expectEq(
            calls[0].url,
            GROQ_DEFAULT_URL,
            "whitespace-only credentials.baseURL is ignored, static default used instead",
          );
        },
      );
    },
  );
}

// ───────────────────────────────────────────────────────────────────────
// Section 2: credential / baseURL precedence — computedBaseURL branch
// (cloudflare: apiKey + accountId, no baseURLEnvVar/defaultBaseURL)
// ───────────────────────────────────────────────────────────────────────

const CF_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
const CF_MISSING_ACCOUNT_ID_MESSAGE =
  "CLOUDFLARE_ACCOUNT_ID is required (or pass credentials.cloudflare.accountId). Get the account id from https://dash.cloudflare.com/";

function cfURL(accountId: string): string {
  return `api.cloudflare.com/client/v4/accounts/${accountId}/ai/v1/chat/completions`;
}

async function testResolveConfigComputedBaseURL(): Promise<void> {
  const section = "config precedence (cloudflare, computedBaseURL)";

  await runCase(
    `${section}: missing accountId throws the entry's exact message`,
    async () => {
      setEnv("CLOUDFLARE_API_KEY", undefined);
      setEnv("CLOUDFLARE_ACCOUNT_ID", undefined);
      let threw = false;
      try {
        await newNL().generate({
          provider: "cloudflare",
          model: CF_MODEL,
          input: { text: "ping" },
          disableTools: true,
          credentials: { cloudflare: { apiKey: "test-key" } },
        });
      } catch (err) {
        threw = true;
        const msg = err instanceof Error ? err.message : String(err);
        expect(
          msg.includes(CF_MISSING_ACCOUNT_ID_MESSAGE),
          "thrown message contains computedBaseURL.missingValueMessage verbatim",
        );
      }
      expect(threw, "missing accountId (no credentials, no env) throws");
    },
  );

  await runCase(
    `${section}: env var supplies accountId, baseURL is built from it`,
    async () => {
      setEnv("CLOUDFLARE_ACCOUNT_ID", "acct-env-123");
      await withMocks(
        [
          {
            method: "POST",
            url: cfURL("acct-env-123"),
            respond: okResp(CF_MODEL),
          },
        ],
        async ({ calls }) => {
          await newNL().generate({
            provider: "cloudflare",
            model: CF_MODEL,
            input: { text: "ping" },
            disableTools: true,
            credentials: { cloudflare: { apiKey: "test-key" } },
          });
          expect(
            calls[0].url.includes("accounts/acct-env-123/"),
            "computed baseURL built from CLOUDFLARE_ACCOUNT_ID env var",
          );
        },
      );
    },
  );

  await runCase(
    `${section}: credentials.accountId overrides the env var`,
    async () => {
      setEnv("CLOUDFLARE_ACCOUNT_ID", "acct-env-should-not-be-used");
      await withMocks(
        [
          {
            method: "POST",
            url: cfURL("acct-cred-999"),
            respond: okResp(CF_MODEL),
          },
        ],
        async ({ calls }) => {
          await newNL().generate({
            provider: "cloudflare",
            model: CF_MODEL,
            input: { text: "ping" },
            disableTools: true,
            credentials: {
              cloudflare: { apiKey: "test-key", accountId: "acct-cred-999" },
            },
          });
          expect(
            calls[0].url.includes("accounts/acct-cred-999/"),
            "computed baseURL built from credentials.accountId, not the env var",
          );
        },
      );
    },
  );

  await runCase(
    `${section}: explicit credentials.baseURL bypasses computedBaseURL.build`,
    async () => {
      setEnv("CLOUDFLARE_ACCOUNT_ID", undefined);
      await withMocks(
        [
          {
            method: "POST",
            url: "custom-cf-proxy.example.com/v1/chat/completions",
            respond: okResp(CF_MODEL),
          },
        ],
        async ({ calls }) => {
          await newNL().generate({
            provider: "cloudflare",
            model: CF_MODEL,
            input: { text: "ping" },
            disableTools: true,
            credentials: {
              cloudflare: {
                apiKey: "test-key",
                // accountId given too — baseURL must still win outright,
                // with no accountId needed (env is unset above).
                accountId: "acct-should-be-irrelevant",
                baseURL: "https://custom-cf-proxy.example.com/v1",
              },
            },
          });
          expectEq(
            calls[0].url,
            "https://custom-cf-proxy.example.com/v1/chat/completions",
            "explicit credentials.baseURL is used verbatim, computedBaseURL.build never runs",
          );
        },
      );
    },
  );
}

// ───────────────────────────────────────────────────────────────────────
// Section 3: error-classification rules + shared classifier fallback
// (together-ai: no timeoutErrorClass override — the six-of-seven default)
// ───────────────────────────────────────────────────────────────────────

const TG_URL = "api.together.xyz/v1/chat/completions";
const TG_MODEL = "meta-llama/Llama-3.3-70B-Instruct-Turbo";

async function testConfiguredProviderHookDelegation(): Promise<void> {
  const section = "ConfiguredOpenAICompatProvider (together-ai)";
  setEnv("TOGETHER_API_KEY", undefined);

  await runCase(
    `${section}: 401 maps to AuthenticationError, unwrapped`,
    async () => {
      await withMocks(
        [
          {
            method: "POST",
            url: TG_URL,
            respond: errResp(401, "invalid_api_key", "auth_error"),
          },
        ],
        async () => {
          let caught: unknown;
          try {
            await newNL().generate({
              provider: "together-ai",
              model: TG_MODEL,
              input: { text: "ping" },
              disableTools: true,
              credentials: { together: { apiKey: "test-key" } },
            });
          } catch (err) {
            caught = err;
          }
          expect(caught instanceof AuthenticationError, "error class");
          expectEq(
            (caught as Error).message,
            "[together-ai] Invalid Together AI API key. Get one at https://api.together.xyz/settings/api-keys",
            "together-ai's bespoke auth message, unwrapped (AuthenticationError is non-retryable)",
          );
        },
      );
    },
  );

  await runCase(
    `${section}: 404 model_not_found maps to InvalidModelError, unwrapped`,
    async () => {
      await withMocks(
        [
          {
            method: "POST",
            url: TG_URL,
            respond: errResp(
              404,
              "model_not_found: no such model",
              "invalid_request_error",
            ),
          },
        ],
        async () => {
          let caught: unknown;
          try {
            await newNL().generate({
              provider: "together-ai",
              model: "totally-fake-model",
              input: { text: "ping" },
              disableTools: true,
              credentials: { together: { apiKey: "test-key" } },
            });
          } catch (err) {
            caught = err;
          }
          expect(caught instanceof InvalidModelError, "error class");
          expectEq(
            (caught as Error).message,
            "[together-ai] together-ai model 'totally-fake-model' not found.",
            "DEFAULT_ERROR_RULES's generic model-not-found message, unwrapped",
          );
        },
      );
    },
  );

  await runCase(
    `${section}: unmatched error falls through to classifyProviderError's built-in fallback`,
    async () => {
      await withMocks(
        [
          {
            method: "POST",
            url: TG_URL,
            // 422 matches no DEFAULT_ERROR_RULES pattern (no digit-based
            // rule fires on this message) but IS a non-retryable HTTP
            // status, so the resulting ProviderError still escapes
            // unwrapped — see NON_RETRYABLE_HTTP_STATUS_CODES.
            respond: errResp(
              422,
              "unprocessable content: weird payload shape",
              "invalid_request_error",
            ),
          },
        ],
        async () => {
          let caught: unknown;
          try {
            await newNL().generate({
              provider: "together-ai",
              model: TG_MODEL,
              input: { text: "ping" },
              disableTools: true,
              credentials: { together: { apiKey: "test-key" } },
            });
          } catch (err) {
            caught = err;
          }
          expect(
            caught instanceof ProviderError &&
              !(caught instanceof AuthenticationError) &&
              !(caught instanceof RateLimitError) &&
              !(caught instanceof InvalidModelError) &&
              !(caught instanceof NetworkError),
            "error is exactly ProviderError, no rule's subclass",
          );
          expectEq(
            (caught as Error).message,
            "[together-ai] together-ai error: unprocessable content: weird payload shape",
            "classifyProviderError's own built-in fallback message, unwrapped",
          );
        },
      );
    },
  );

  await runCase(
    `${section}: 429 maps to RateLimitError, wrapped by the single-provider fallback loop`,
    async () => {
      await withMocks(
        [
          {
            method: "POST",
            url: TG_URL,
            respond: errResp(429, "rate limit exceeded", "rate_limit_error"),
          },
        ],
        async () => {
          let caught: unknown;
          try {
            await newNL().generate({
              provider: "together-ai",
              model: TG_MODEL,
              input: { text: "ping" },
              disableTools: true,
              credentials: { together: { apiKey: "test-key" } },
            });
          } catch (err) {
            caught = err;
          }
          // RateLimitError is not in isNonRetryableProviderError's list, so
          // directProviderGeneration's single-provider loop still exhausts
          // and wraps it into a generic Error — the real DEFAULT_ERROR_RULES
          // text survives as a substring of that wrapper's message.
          expect(
            !(caught instanceof RateLimitError) && caught instanceof Error,
            "top-level class is the generic fallback Error, not RateLimitError directly",
          );
          expect(
            (caught as Error).message.includes(
              "[together-ai] together-ai rate limit exceeded. Please try again later.",
            ),
            "DEFAULT_ERROR_RULES's rate-limit message survives verbatim inside the wrapper",
          );
        },
      );
    },
  );

  await runCase(
    `${section}: TimeoutError maps to the classifier's default NetworkError text (no override)`,
    async () => {
      await withMocks(
        [{ method: "POST", url: TG_URL, respond: slowOkRoute(500, TG_MODEL) }],
        async () => {
          let caught: unknown;
          try {
            await newNL().generate({
              provider: "together-ai",
              model: TG_MODEL,
              input: { text: "ping" },
              disableTools: true,
              timeout: 50,
              credentials: { together: { apiKey: "test-key" } },
            });
          } catch (err) {
            caught = err;
          }
          expect(
            !(caught instanceof NetworkError) && caught instanceof Error,
            "top-level class is the generic fallback Error, not NetworkError directly",
          );
          expect(
            (caught as Error).message.includes(
              "[together-ai] Request timed out: together-ai generate operation timed out after 50",
            ),
            "classifier's unmodified default timeout text survives inside the wrapper (no per-provider prefix)",
          );
        },
      );
    },
  );
}

// ───────────────────────────────────────────────────────────────────────
// Section 4: Groq's pre-migration quirks — timeout override, bespoke auth
// message, and model_decommissioned — verified end-to-end against the
// exact strings recovered from `git show origin/release:src/lib/providers/
// groq.ts` (byte-identical to this branch's HEAD before groq.ts was
// deleted). Contrasted against xai (which sets no timeoutErrorClass) to
// show the override really is Groq-only, not just a coincidence of one
// provider's mock.
// ───────────────────────────────────────────────────────────────────────

const XAI_URL = "api.x.ai/v1/chat/completions";
const XAI_MODEL = "grok-3";

async function testGroqTimeoutErrorClassOverride(): Promise<void> {
  const section = "Groq pre-migration quirks";
  setEnv("GROQ_API_KEY", undefined);
  setEnv("XAI_API_KEY", undefined);

  await runCase(
    `${section}: (a) TimeoutError -> Groq's bespoke ProviderError text, distinct from xai's default`,
    async () => {
      let groqCaught: unknown;
      await withMocks(
        [
          {
            method: "POST",
            url: GROQ_URL,
            respond: slowOkRoute(500, GROQ_MODEL),
          },
        ],
        async () => {
          try {
            await newNL().generate({
              provider: "groq",
              model: GROQ_MODEL,
              input: { text: "ping" },
              disableTools: true,
              timeout: 50,
              credentials: { groq: { apiKey: "test-key" } },
            });
          } catch (err) {
            groqCaught = err;
          }
        },
      );
      expect(groqCaught instanceof Error, "groq timeout still throws");
      expect(
        (groqCaught as Error).message.includes(
          "[groq] Groq request timed out: groq generate operation timed out after 50",
        ),
        "groq's bespoke 'Groq request timed out: ...' text (the timeoutErrorClass override) survives inside the wrapper",
      );

      let xaiCaught: unknown;
      await withMocks(
        [
          {
            method: "POST",
            url: XAI_URL,
            respond: slowOkRoute(500, XAI_MODEL),
          },
        ],
        async () => {
          try {
            await newNL().generate({
              provider: "xai",
              model: XAI_MODEL,
              input: { text: "ping" },
              disableTools: true,
              timeout: 50,
              credentials: { xai: { apiKey: "test-key" } },
            });
          } catch (err) {
            xaiCaught = err;
          }
        },
      );
      expect(xaiCaught instanceof Error, "xai timeout still throws");
      expect(
        (xaiCaught as Error).message.includes(
          "[xai] Request timed out: xai generate operation timed out after 50",
        ) && !(xaiCaught as Error).message.includes("Xai request timed out"),
        "xai gets the classifier's unmodified default text — no per-provider 'timed out' prefix, unlike groq",
      );
    },
  );

  await runCase(
    `${section}: (b) 401 -> Groq's own message, not DEFAULT_ERROR_RULES's generic one`,
    async () => {
      let caught: unknown;
      await withMocks(
        [
          {
            method: "POST",
            url: GROQ_URL,
            respond: errResp(401, "invalid_api_key", "auth_error"),
          },
        ],
        async () => {
          try {
            await newNL().generate({
              provider: "groq",
              model: GROQ_MODEL,
              input: { text: "ping" },
              disableTools: true,
              credentials: { groq: { apiKey: "test-key" } },
            });
          } catch (err) {
            caught = err;
          }
        },
      );
      expect(caught instanceof AuthenticationError, "error class");
      expectEq(
        (caught as Error).message,
        "[groq] Invalid Groq API key. Check GROQ_API_KEY. Get one at https://console.groq.com/keys",
        "groq's bespoke auth text, byte-identical to the deleted subclass",
      );
    },
  );

  await runCase(
    `${section}: (c) model_decommissioned -> InvalidModelError with the dynamic model-name message`,
    async () => {
      let caught: unknown;
      await withMocks(
        [
          {
            method: "POST",
            url: GROQ_URL,
            respond: errResp(
              404,
              "model_decommissioned",
              "invalid_request_error",
            ),
          },
        ],
        async () => {
          try {
            await newNL().generate({
              provider: "groq",
              model: GROQ_MODEL,
              input: { text: "ping" },
              disableTools: true,
              credentials: { groq: { apiKey: "test-key" } },
            });
          } catch (err) {
            caught = err;
          }
        },
      );
      expect(caught instanceof InvalidModelError, "error class");
      expectEq(
        (caught as Error).message,
        `[groq] Groq model '${GROQ_MODEL}' was decommissioned. Pick a current model from https://console.groq.com/docs/models.`,
        "groq's bespoke decommissioned text, byte-identical to the deleted subclass, model name interpolated",
      );
    },
  );

  await runCase(
    `${section}: generic model_not_found (not decommissioned) still uses the shared default, not swallowed by the decommissioned rule`,
    async () => {
      let caught: unknown;
      await withMocks(
        [
          {
            method: "POST",
            url: GROQ_URL,
            respond: errResp(
              404,
              "model_not_found: no such model",
              "invalid_request_error",
            ),
          },
        ],
        async () => {
          try {
            await newNL().generate({
              provider: "groq",
              model: GROQ_MODEL,
              input: { text: "ping" },
              disableTools: true,
              credentials: { groq: { apiKey: "test-key" } },
            });
          } catch (err) {
            caught = err;
          }
        },
      );
      expect(caught instanceof InvalidModelError, "error class");
      expectEq(
        (caught as Error).message,
        `[groq] groq model '${GROQ_MODEL}' not found.`,
        "DEFAULT_ERROR_RULES's generic not-found message — the decommissioned rule's narrower regex does not match this text",
      );
    },
  );
}

// ───────────────────────────────────────────────────────────────────────
// Section 5: catalog membership + alias routing.
//
// The original file asserted a handful of pure data-shape facts by
// reading OPENAI_COMPAT_CATALOG directly: exactly 7 entries, no duplicate
// providerName/alias across the whole array, every entry has exactly one
// of (baseURLEnvVar+defaultBaseURL) or computedBaseURL, apiKeyEnvVar
// equals configOptions.envVarName, errorRules is non-empty, and Mistral's
// lone registryDefaultModelChecksEnvVar=false quirk. None of that is
// reachable from outside the package — there is no public surface that
// enumerates the catalog array — so per rule 15 it cannot be re-asserted
// as-is without importing the module directly, which this file does not
// do anywhere. Rather than drop this section, it is converted to what
// *is* observable: every canonical provider name AND every alias in the
// catalog actually routes to the right host and succeeds end-to-end
// against a mock, using exactly the env var name the entry documents.
//
// This operationally subsumes two of the dropped invariants rather than
// merely approximating them:
//   - "apiKeyEnvVar matches configOptions.envVarName": if the two
//     diverged, the env var this suite sets (named after apiKeyEnvVar,
//     read from openaiCompatCatalog.ts) would not be the one
//     validateApiKey() actually reads, and construction would fail with
//     a missing-credential error instead of succeeding.
//   - "no alias collisions": every alias below asserts its own distinct
//     expected URL; a collision with another entry would route the
//     request to the wrong host and fail the assertion.
//
// What genuinely could not be carried forward, and why — see
// coverageDropped in this task's report, not silently reproduced here:
//   - Catalog cardinality is exactly 7 (this suite can prove no fewer
//     than these 7 names work, never that an 8th unexpected entry
//     doesn't also exist — there is no public "list the catalog" call).
//   - The XOR shape invariant on baseURLEnvVar/computedBaseURL, and
//     "errorRules is non-empty" — pure structural facts about the raw
//     entry object with no behavioral surface at all (every real entry
//     always spreads DEFAULT_ERROR_RULES, so errorRules is never
//     actually empty by construction; there is nothing a live call could
//     observe to tell an empty array apart from a correct one it happens
//     to fully override).
//   - Mistral's registryDefaultModelChecksEnvVar=false quirk: this flows
//     into ProviderFactory.registerProvider()'s defaultModel argument,
//     consumed by registry/model-listing code paths, not by
//     ConfiguredOpenAICompatProvider.getDefaultModel() (which always
//     re-derives from entry.modelEnvVar/defaultModel regardless). No
//     generate() call was found that observably differs based on this
//     field.
// ───────────────────────────────────────────────────────────────────────

type AliasCheck = {
  alias: string;
  envVar: string;
  extraEnv?: Record<string, string>;
  urlMatch: string;
  model: string;
};

const CATALOG_ALIAS_CHECKS: AliasCheck[] = [
  {
    alias: "groq",
    envVar: "GROQ_API_KEY",
    urlMatch: GROQ_URL,
    model: GROQ_MODEL,
  },
  { alias: "xai", envVar: "XAI_API_KEY", urlMatch: XAI_URL, model: XAI_MODEL },
  { alias: "grok", envVar: "XAI_API_KEY", urlMatch: XAI_URL, model: XAI_MODEL },
  {
    alias: "together-ai",
    envVar: "TOGETHER_API_KEY",
    urlMatch: TG_URL,
    model: TG_MODEL,
  },
  {
    alias: "together",
    envVar: "TOGETHER_API_KEY",
    urlMatch: TG_URL,
    model: TG_MODEL,
  },
  {
    alias: "fireworks",
    envVar: "FIREWORKS_API_KEY",
    urlMatch: "api.fireworks.ai/inference/v1/chat/completions",
    model: "accounts/fireworks/models/llama-v3p3-70b-instruct",
  },
  {
    alias: "perplexity",
    envVar: "PERPLEXITY_API_KEY",
    urlMatch: "api.perplexity.ai",
    model: "sonar",
  },
  {
    alias: "pplx",
    envVar: "PERPLEXITY_API_KEY",
    urlMatch: "api.perplexity.ai",
    model: "sonar",
  },
  {
    alias: "mistral",
    envVar: "MISTRAL_API_KEY",
    urlMatch: "api.mistral.ai/v1/chat/completions",
    model: "mistral-small-2506",
  },
  {
    alias: "cloudflare",
    envVar: "CLOUDFLARE_API_KEY",
    extraEnv: { CLOUDFLARE_ACCOUNT_ID: "acct-cf-primary" },
    urlMatch: cfURL("acct-cf-primary"),
    model: CF_MODEL,
  },
  {
    alias: "workers-ai",
    envVar: "CLOUDFLARE_API_KEY",
    extraEnv: { CLOUDFLARE_ACCOUNT_ID: "acct-cf-workers" },
    urlMatch: cfURL("acct-cf-workers"),
    model: CF_MODEL,
  },
  {
    alias: "cf-ai",
    envVar: "CLOUDFLARE_API_KEY",
    extraEnv: { CLOUDFLARE_ACCOUNT_ID: "acct-cf-cfai" },
    urlMatch: cfURL("acct-cf-cfai"),
    model: CF_MODEL,
  },
];

async function testCatalogStructuralInvariants(): Promise<void> {
  const section = "OPENAI_COMPAT_CATALOG membership + alias routing";

  for (const check of CATALOG_ALIAS_CHECKS) {
    await runCase(
      `${section}: '${check.alias}' routes to its own host and succeeds`,
      async () => {
        setEnv(check.envVar, `test-fake-${check.alias}-credential`);
        if (check.extraEnv) {
          for (const [k, v] of Object.entries(check.extraEnv)) {
            setEnv(k, v);
          }
        }
        await withMocks(
          [
            {
              method: "POST",
              url: check.urlMatch,
              respond: okResp(check.model),
            },
          ],
          async ({ calls }) => {
            const result = await newNL().generate({
              provider: check.alias,
              model: check.model,
              input: { text: "ping" },
              disableTools: true,
            });
            expect(calls.length > 0, "request captured");
            expect(
              calls[0].url.includes(check.urlMatch),
              `request URL matches this alias's expected host (got ${calls[0].url.split("?")[0]})`,
            );
            expect(
              (result.content ?? "").toLowerCase().includes("pong"),
              "response parses into GenerateResult.content",
            );
          },
        );
      },
    );
  }
}

// ───────────────────────────────────────────────────────────────────────
// Section: main
// ───────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log("=== OpenAI-Compat Catalog Suite (E2E) ===");
  neutralizeCatalogEnv();
  try {
    await testResolveConfigPrecedence();
    await testResolveConfigComputedBaseURL();
    await testConfiguredProviderHookDelegation();
    await testGroqTimeoutErrorClassOverride();
    await testCatalogStructuralInvariants();
  } finally {
    restoreEnv();
  }

  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${passed} passed · ${failed} failed (of ${results.length})`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("openai-compat-catalog suite crashed:", err);
  restoreEnv();
  process.exit(2);
});
