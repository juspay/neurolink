#!/usr/bin/env tsx
import "dotenv/config";

/**
 * Continuous Test Suite — error-classifier CONTRACT tests (Plan 07 /
 * error & retry unification, rule 15 determinism exception).
 *
 * ALL-SRC module graph (rule 15): every import below resolves to
 * `../src/...`. This is the deliberate, documented exception to rule 15's
 * "one module graph per suite, end-to-end tests only" mandate — the tests
 * in this file assert facts that no live or mocked `generate()` call can
 * deterministically produce, because they exercise the classifier's
 * internal contract rather than any HTTP response shape:
 *
 *   - Synthetic rule arrays and rule-ordering pins (first-match-wins
 *     precedence; the deliberately self-contradictory bedrock
 *     name-vs-message ThrottlingException-checked-before-ValidationException
 *     ordering test) — these assert on hand-built `ProviderErrorRule[]`
 *     tables that don't exist in any real provider's classification path.
 *   - Bare `TimeoutError` instances and duck-typed `.name`/`.code` shapes —
 *     e.g. a plain object with `{ name: "TimeoutError" }` or
 *     `{ code: "ThrottlingException" }` and no other AWS-SDK-shaped fields
 *     — that no real or mocked HTTP response body ever produces. (Verified
 *     against the installed `@aws-sdk/client-bedrock-runtime`: every
 *     generated exception class sets only `.name`, never `.code`, so a
 *     live/mocked Bedrock response can never populate `errorCode` the way
 *     the `.code`-based test requires.)
 *   - `buildErrorContext` field-threading — confirming a function-valued
 *     rule `message` callback receives the full `ProviderErrorContext`
 *     (provider, errorCode, errorName, ...), independent of any specific
 *     provider's real error shape.
 *   - Module-export-shape checks — `server/errors.ts`'s renamed
 *     `ServerTimeoutError` not colliding with `utils/timeout.ts`'s
 *     `TimeoutError` — a static property-existence check on the module
 *     object itself, not something `generate()` can exercise at all.
 *
 * Every test below was ported VERBATIM (same inputs, same assertions, same
 * assert messages) from the three retired src-importing suites
 * (`continuous-test-suite-error-classifier.ts`,
 * `-error-classifier-openai-compat.ts`, `-error-classifier-native.ts`) plus
 * 2 direct-predicate tests replicated (not moved) from
 * `continuous-test-suite-gemini-tools-schema-policy.ts`. That file's other
 * two tests (source-greps of googleAiStudio/client.ts) were later
 * superseded by real end-to-end probes in
 * `continuous-test-suite-error-classification-e2e.ts` and the file itself
 * was deleted (rework batch I) — the 2 predicate tests below are unaffected,
 * they were already fully ported here. Every other test from those three retired
 * files was ported to the all-dist
 * `continuous-test-suite-error-classification-e2e.ts` suite instead — see
 * that file's header and inline comments for the full accounting. Two
 * cases (old File2 Part B #7, old File3 #15) turned out NOT to be
 * e2e-reproducible despite the original triage marking them reachable, and
 * were demoted here instead of silently dropped — see the report for the
 * full reasoning behind each.
 *
 * No API keys, no network, no LLM.
 *
 * Run: npx tsx test/continuous-test-suite-error-classifier-contract.ts
 *      pnpm run test:error-classifier-contract
 */

import {
  classifyProviderError,
  DEFAULT_ERROR_RULES,
} from "../src/lib/utils/errorClassifier.js";
import {
  AuthenticationError,
  RateLimitError,
  InvalidModelError,
  NetworkError,
  ProviderError,
} from "../src/lib/types/index.js";
import type {
  ProviderErrorRule,
  OpenAICompatCatalogEntry,
} from "../src/lib/types/index.js";
import { TimeoutError } from "../src/lib/utils/timeout.js";
import { AIProviderName } from "../src/lib/constants/enums.js";
import { ConfiguredOpenAICompatProvider } from "../src/lib/providers/configuredOpenAICompat.js";
import { OPENAI_COMPAT_CATALOG } from "../src/lib/providers/openaiCompatCatalog.js";
import { OpenAICompatibleProvider } from "../src/lib/providers/openaiCompatible/client.js";
import { OpenAIProvider } from "../src/lib/providers/openAI/client.js";
import { DeepSeekProvider } from "../src/lib/providers/deepseek.js";
import { AzureOpenAIProvider } from "../src/lib/providers/azureOpenai.js";
import { LiteLLMProvider } from "../src/lib/providers/litellm/client.js";
import { NvidiaNimProvider } from "../src/lib/providers/nvidiaNim/client.js";
import { OpenRouterProvider } from "../src/lib/providers/openRouter/client.js";
import { OllamaProvider } from "../src/lib/providers/ollama/client.js";
import { HuggingFaceProvider } from "../src/lib/providers/huggingFace/client.js";
import { LlamaCppProvider } from "../src/lib/providers/llamaCpp.js";
import { LMStudioProvider } from "../src/lib/providers/lmStudio.js";
import { CohereProvider } from "../src/lib/providers/cohere.js";
import { AnthropicProvider } from "../src/lib/providers/anthropic/client.js";
import { AmazonBedrockProvider } from "../src/lib/providers/amazonBedrock/client.js";
import { isToolsSchemaExclusionInForce } from "../src/lib/core/modules/structuredOutputPolicy.js";
import { defineSuite, assert } from "./helpers/harness.js";

const { test, runSuite, section } = defineSuite(
  "Error classifier contract (Plan 07, rule 15 determinism exception)",
);

/**
 * Several providers below are constructed bare, and their constructors throw
 * when their credential env var is absent. On a developer machine a .env
 * supplies those, so the suite passed locally while failing anywhere without
 * them — which is exactly what happened the first time it ran in CI.
 *
 * These are pinned rather than merely defaulted: reading a real key from the
 * environment would make the suite's behaviour depend on which machine runs
 * it, and nothing here performs a request, so a fixed placeholder is both
 * safe and more honest than whatever happens to be configured.
 */
const FAKE_PROVIDER_CREDENTIALS: Record<string, string> = {
  OPENAI_API_KEY: "test-fake-openai-credential",
  DEEPSEEK_API_KEY: "test-fake-deepseek-credential",
  AZURE_OPENAI_API_KEY: "test-fake-azure-credential",
  AZURE_OPENAI_ENDPOINT: "https://test-fake.openai.azure.com",
  LITELLM_API_KEY: "test-fake-litellm-credential",
  NVIDIA_NIM_API_KEY: "test-fake-nvidia-credential",
  OPENROUTER_API_KEY: "test-fake-openrouter-credential",
  HUGGINGFACE_API_KEY: "test-fake-huggingface-credential",
  HF_TOKEN: "test-fake-huggingface-credential",
  COHERE_API_KEY: "test-fake-cohere-credential",
  // The native trio further down the file. Anthropic accepts an API key or one
  // of three OAuth tokens; pinning the auth method as well keeps an ambient
  // token from selecting a different code path than the one under test.
  ANTHROPIC_API_KEY: "test-fake-anthropic-credential",
  ANTHROPIC_AUTH_METHOD: "api_key",
  AWS_ACCESS_KEY_ID: "test-fake-aws-key-id",
  AWS_SECRET_ACCESS_KEY: "test-fake-aws-secret",
  AWS_REGION: "us-east-1",
};

/** Neutralised so an ambient token cannot pick a different auth path. */
const CLEARED_CREDENTIAL_ENV = [
  "ANTHROPIC_OAUTH_TOKEN",
  "CLAUDE_OAUTH_TOKEN",
  "ANTHROPIC_OAUTH_ACCESS_TOKEN",
];

const ORIGINAL_CREDENTIAL_ENV: Record<string, string | undefined> = {};
for (const [name, value] of Object.entries(FAKE_PROVIDER_CREDENTIALS)) {
  ORIGINAL_CREDENTIAL_ENV[name] = process.env[name];
  process.env[name] = value;
}
for (const name of CLEARED_CREDENTIAL_ENV) {
  ORIGINAL_CREDENTIAL_ENV[name] = process.env[name];
  delete process.env[name];
}

function restoreCredentialEnv(): void {
  for (const [name, value] of Object.entries(ORIGINAL_CREDENTIAL_ENV)) {
    if (value === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = value;
    }
  }
}

process.on("exit", restoreCredentialEnv);

void runSuite(async () => {
  // ===========================================================================
  // Ported from continuous-test-suite-error-classifier.ts (old File1)
  // ===========================================================================

  section("File1 #1 — TimeoutError fast path");

  await test("TimeoutError is classified as NetworkError regardless of rules", () => {
    const err = new TimeoutError("op timed out", 5000, "acme", "generate");
    const result = classifyProviderError(err, [], "acme");
    assert(
      result instanceof NetworkError,
      "TimeoutError did not classify to NetworkError",
    );
    assert(!(result instanceof AuthenticationError), "wrong subclass");
  });

  section("File1 #9-#10 — Rule precedence and provider-specific overrides");

  await test("first matching rule wins over later-matching rules", () => {
    const rules: ProviderErrorRule[] = [
      {
        match: () => true,
        errorClass: AuthenticationError,
        message: "first",
      },
      { match: () => true, errorClass: RateLimitError, message: "second" },
    ];
    const result = classifyProviderError(new Error("x"), rules, "acme");
    assert(result instanceof AuthenticationError, "first rule did not win");
    assert(result.message.includes("first"), "wrong message won");
  });

  await test("provider-specific rule overrides DEFAULT_ERROR_RULES via prepend", () => {
    const rules: ProviderErrorRule[] = [
      {
        match: (ctx) => /invalid api key/i.test(ctx.message),
        errorClass: AuthenticationError,
        message: "Invalid Acme API key. Check ACME_API_KEY.",
      },
      ...DEFAULT_ERROR_RULES,
    ];
    const result = classifyProviderError(
      new Error("Invalid API key supplied"),
      rules,
      "acme",
    );
    assert(
      result instanceof AuthenticationError,
      "expected AuthenticationError",
    );
    assert(
      result.message.includes("ACME_API_KEY"),
      "provider-specific env-var message was not used",
    );
  });

  section("File1 #11 — Function-valued messages and context fields");

  await test("function-valued message receives full context", () => {
    const rules: ProviderErrorRule[] = [
      {
        match: (ctx) => ctx.errorCode === "ThrottlingException",
        errorClass: RateLimitError,
        message: (ctx) =>
          `${ctx.provider} throttled (code=${ctx.errorCode}, name=${ctx.errorName})`,
      },
    ];
    const err = Object.assign(new Error("slow down"), {
      code: "ThrottlingException",
      name: "ThrottlingException",
    });
    const result = classifyProviderError(err, rules, "bedrock");
    assert(
      result.message.includes("code=ThrottlingException"),
      "errorCode was not threaded into the context",
    );
    assert(
      result.message.includes("bedrock"),
      "provider was not threaded into the context",
    );
  });

  section("File1 #13 — No cross-module TimeoutError naming collision");

  await test("server/errors.ts's timeout class is named ServerTimeoutError, not TimeoutError", async () => {
    const serverErrorsModule = await import("../src/lib/server/errors.js");
    assert(
      "ServerTimeoutError" in serverErrorsModule,
      "server/errors.ts should export ServerTimeoutError after the rename",
    );
    assert(
      !("TimeoutError" in serverErrorsModule),
      "server/errors.ts still exports a TimeoutError that shadows utils/timeout.ts's canonical TimeoutError",
    );
  });

  section("Batch J Task 1 — buildErrorContext's bounded .cause chain walk");

  await test("buildErrorContext walks a nested .cause (two levels deep) so a transient errorCode still classifies as NetworkError", () => {
    // Mirrors undici's real shape for a closed-port fetch: the outer
    // TypeError carries no code, an intermediate wrapper carries no code
    // either, and the actionable code lives on the innermost cause.
    const innermost = Object.assign(new Error("refused by peer"), {
      code: "ECONNREFUSED",
    });
    const middle = new Error("socket layer failure", { cause: innermost });
    const outer = new TypeError("fetch failed", { cause: middle });
    const result = classifyProviderError(outer, DEFAULT_ERROR_RULES, "acme");
    assert(
      result instanceof NetworkError,
      "a transient code two levels down the cause chain was not surfaced to the rule table",
    );
  });

  await test("a signed URL in a nested cause is redacted out of the composed message", () => {
    // undici puts the full request URL in the cause's message, so composing
    // it in raw would carry a presigned token into a client-facing error.
    const innermost = new Error(
      "request to https://storage.example.com/bucket/key?X-Amz-Signature=deadbeefsecret&X-Amz-Expires=900 failed",
    );
    const outer = new TypeError("fetch failed", { cause: innermost });
    const result = classifyProviderError(outer, DEFAULT_ERROR_RULES, "acme");
    assert(
      !result.message.includes("deadbeefsecret"),
      "the signature value from a nested cause reached the classified message",
    );
    assert(
      !result.message.includes("X-Amz-Signature"),
      "the signed query string from a nested cause reached the classified message",
    );
    // Compare the surviving host exactly rather than by substring: a
    // substring check would also pass for an attacker-controlled host like
    // storage.example.com.evil.test, and asserts nothing about what was
    // actually kept.
    const survivingUrl = result.message.match(/https?:\/\/[^\s]+/)?.[0];
    assert(
      survivingUrl !== undefined &&
        new URL(survivingUrl).host === "storage.example.com",
      "redaction did not leave the bare host, so nothing diagnostic survived",
    );
  });

  await test("a cyclic .cause chain terminates classification instead of hanging", () => {
    const a: Error & { cause?: unknown } = new Error("outer link");
    const b: Error & { cause?: unknown } = Object.assign(
      new Error("inner link"),
      { code: "ETIMEDOUT" },
    );
    a.cause = b;
    b.cause = a; // deliberate cycle
    const start = Date.now();
    const result = classifyProviderError(a, DEFAULT_ERROR_RULES, "acme");
    const elapsedMs = Date.now() - start;
    assert(
      elapsedMs < 2000,
      "classification of a cyclic cause chain took too long to return",
    );
    assert(
      result instanceof NetworkError,
      "a cyclic cause chain carrying a transient code was not classified before the walk was bounded off",
    );
  });

  section("Batch J Task 3 — tightened rule-5 (5xx) message matching");

  await test("rule 5 does NOT match an unrelated 3-digit number in message text (max_tokens limit)", () => {
    const err = new Error("max_tokens (500) exceeds model limit");
    const result = classifyProviderError(err, DEFAULT_ERROR_RULES, "acme");
    assert(
      result instanceof ProviderError,
      "expected the generic no-match fallback (still ProviderError, per R4's class-invariance)",
    );
    assert(
      !result.message.includes("server error"),
      "the loose old regex would have misfired on the bare digits in '(500)' — tightened rule 5 must not label this a server error",
    );
  });

  await test("rule 5 still matches a real textual 5xx message with no statusCode set (502 Bad Gateway)", () => {
    const err = new Error("502 Bad Gateway");
    const result = classifyProviderError(err, DEFAULT_ERROR_RULES, "acme");
    assert(
      result instanceof ProviderError,
      "a real 502-shaped message should still classify as ProviderError",
    );
    assert(
      result.message.includes("acme server error:"),
      "a real 502-shaped message should still be labeled via rule 5's server-error message, not fall through to the generic no-match message",
    );
  });

  await test("rule 5 still matches a real 5xx message wrapped by a generic HTTP client (status code phrasing)", () => {
    const err = new Error("Request failed with status code 500");
    const result = classifyProviderError(err, DEFAULT_ERROR_RULES, "acme");
    assert(
      result.message.includes("acme server error:"),
      "a common HTTP-client wrapper phrase ('status code 5xx') should still trigger rule 5",
    );
  });

  await test("rule 5's tightening does not change the classified CLASS even where it changes the message (a bare 3-digit number with no qualifying context)", () => {
    const withoutContext = classifyProviderError(
      new Error("value must be under 500"),
      DEFAULT_ERROR_RULES,
      "acme",
    );
    const withStatusCode = classifyProviderError(
      Object.assign(new Error("value must be under 500"), {
        status: 500,
      }),
      DEFAULT_ERROR_RULES,
      "acme",
    );
    assert(
      withoutContext instanceof ProviderError &&
        withStatusCode instanceof ProviderError,
      "R4: whether or not the message-only regex matches, the class must stay ProviderError — the no-match fallback and rule 5 share the same class",
    );
  });

  // ===========================================================================
  // Ported from continuous-test-suite-error-classifier-openai-compat.ts
  // (old File2) — Part A test-a (TimeoutError) x19 providers
  // ===========================================================================

  type ProviderCase = {
    name: string;
    instance: { formatProviderError(error: unknown): Error };
    timeoutErrorClass: typeof NetworkError | typeof ProviderError;
  };

  // The 7 OpenAI-compat providers migrated onto ConfiguredOpenAICompatProvider
  // (plan 05) no longer have a concrete subclass to import — each is now a
  // data row in OPENAI_COMPAT_CATALOG. Constructing through the same generic
  // class + catalog entry the registry itself uses keeps this suite testing
  // the real code path instead of a class that no longer exists.
  function getCatalogEntry(name: AIProviderName): OpenAICompatCatalogEntry {
    const entry = OPENAI_COMPAT_CATALOG.find((e) => e.providerName === name);
    if (!entry) {
      throw new Error(`No OPENAI_COMPAT_CATALOG entry found for "${name}"`);
    }
    return entry;
  }

  // Explicit fake credentials on every catalog-driven case below:
  // ConfiguredOpenAICompatProvider's constructor calls resolveOpenAICompatConfig
  // -> validateApiKey, which throws when neither an override nor the env var
  // is present. These run at suite-build time outside any test(), so a throw
  // would abort the whole file on a machine without the real key configured.
  const providers: ProviderCase[] = [
    {
      name: "mistral",
      instance: new ConfiguredOpenAICompatProvider(
        getCatalogEntry(AIProviderName.MISTRAL),
        undefined,
        undefined,
        { apiKey: "test-key-not-used" },
      ),
      timeoutErrorClass: NetworkError,
    },
    {
      name: "groq",
      instance: new ConfiguredOpenAICompatProvider(
        getCatalogEntry(AIProviderName.GROQ),
        undefined,
        undefined,
        { apiKey: "test-key-not-used" },
      ),
      // Groq alone preserves its pre-migration subclass's own TimeoutError
      // interception (-> ProviderError) via the catalog's timeoutErrorClass
      // field; every other entry falls through to the classifier's default
      // TimeoutError -> NetworkError mapping.
      timeoutErrorClass: ProviderError,
    },
    {
      name: "xai",
      instance: new ConfiguredOpenAICompatProvider(
        getCatalogEntry(AIProviderName.XAI),
        undefined,
        undefined,
        { apiKey: "test-key-not-used" },
      ),
      timeoutErrorClass: NetworkError,
    },
    {
      name: "together-ai",
      instance: new ConfiguredOpenAICompatProvider(
        getCatalogEntry(AIProviderName.TOGETHER_AI),
        undefined,
        undefined,
        { apiKey: "test-key-not-used" },
      ),
      timeoutErrorClass: NetworkError,
    },
    {
      name: "fireworks",
      instance: new ConfiguredOpenAICompatProvider(
        getCatalogEntry(AIProviderName.FIREWORKS),
        undefined,
        undefined,
        { apiKey: "test-key-not-used" },
      ),
      timeoutErrorClass: NetworkError,
    },
    {
      name: "perplexity",
      instance: new ConfiguredOpenAICompatProvider(
        getCatalogEntry(AIProviderName.PERPLEXITY),
        undefined,
        undefined,
        { apiKey: "test-key-not-used" },
      ),
      timeoutErrorClass: NetworkError,
    },
    {
      name: "cloudflare",
      instance: new ConfiguredOpenAICompatProvider(
        getCatalogEntry(AIProviderName.CLOUDFLARE),
        undefined,
        undefined,
        {
          apiKey: "test-key-not-used",
          accountId: "test-account-for-suite-only",
        },
      ),
      timeoutErrorClass: NetworkError,
    },
    {
      name: "openai-compatible",
      instance: new OpenAICompatibleProvider(undefined, undefined, undefined, {
        apiKey: "test-key-not-used",
        baseURL: "http://localhost:0/v1",
      }),
      timeoutErrorClass: NetworkError,
    },
    {
      name: "openai",
      instance: new OpenAIProvider(),
      timeoutErrorClass: NetworkError,
    },
    {
      name: "deepseek",
      instance: new DeepSeekProvider(),
      timeoutErrorClass: NetworkError,
    },
    {
      name: "azure",
      instance: new AzureOpenAIProvider(),
      timeoutErrorClass: NetworkError,
    },
    {
      name: "litellm",
      instance: new LiteLLMProvider(),
      timeoutErrorClass: NetworkError,
    },
    {
      name: "nvidia-nim",
      instance: new NvidiaNimProvider(),
      timeoutErrorClass: NetworkError,
    },
    {
      name: "openrouter",
      instance: new OpenRouterProvider(),
      timeoutErrorClass: NetworkError,
    },
    {
      name: "ollama",
      instance: new OllamaProvider(),
      timeoutErrorClass: NetworkError,
    },
    {
      name: "huggingface",
      instance: new HuggingFaceProvider(),
      timeoutErrorClass: NetworkError,
    },
    {
      name: "llamacpp",
      instance: new LlamaCppProvider(),
      timeoutErrorClass: NetworkError,
    },
    {
      name: "lm-studio",
      instance: new LMStudioProvider(),
      timeoutErrorClass: NetworkError,
    },
    {
      name: "cohere",
      instance: new CohereProvider(),
      timeoutErrorClass: NetworkError,
    },
  ];

  section("File2 Part A test-a x19 — bare TimeoutError instance per provider");

  for (const { name, instance, timeoutErrorClass } of providers) {
    await test(`${name}: TimeoutError -> ${timeoutErrorClass.name}`, () => {
      const err = new TimeoutError("timed out", 3000, name, "generate");
      const result = instance.formatProviderError(err);
      // Exact class, not `instanceof`: NetworkError/AuthenticationError/
      // RateLimitError all extend ProviderError, so an instanceof check
      // against ProviderError (Groq's expected class) would silently accept
      // a NetworkError result too — exactly the regression this case exists
      // to catch, since Groq's whole reason for a distinct expectation is
      // that it does NOT get the classifier's default TimeoutError ->
      // NetworkError mapping like everyone else.
      assert(
        result.constructor === timeoutErrorClass,
        `${name} did not map TimeoutError to the expected error class`,
      );
    });
  }

  section("File2 Part B #4 — openai-compatible duck-typed timeout shape");
  {
    const compat = new OpenAICompatibleProvider(
      undefined,
      undefined,
      undefined,
      {
        apiKey: "test-key-not-used",
        baseURL: "http://localhost:0/v1",
      },
    );

    await test("openai-compatible: duck-typed timeout (name only, not instanceof) -> NetworkError", () => {
      const duckTimeout = Object.assign(new Error("the operation timed out"), {
        name: "TimeoutError",
      });
      const result = compat.formatProviderError(duckTimeout);
      assert(
        result instanceof NetworkError,
        "openai-compatible's duck-typed timeout check (name === TimeoutError) no longer maps to NetworkError",
      );
    });
  }

  section(
    "File2 Part B #7 — openai credential-type marker (.type field a real HTTP response never attaches)",
  );
  {
    const openai = new OpenAIProvider();

    // DEMOTED here: openAI/client.ts's auth rule OR-branches on
    // `errorType === "invalid_api_key"`, reading `.type` directly off the
    // raw caught error. NeuroLink's own OpenAI-compat HTTP client
    // (buildAPIError() in openaiChatCompletionsClient.ts) never attaches a
    // `.type` field to the error it builds from a real fetch() response
    // (only .message/.statusCode/.responseHeaders/.url/.requestBody/
    // .responseBody) — so a real or mocked HTTP call can never populate
    // errorType, making this rule branch unreachable via any live/mocked
    // generate() call with the current implementation. See
    // continuous-test-suite-error-classification-e2e.ts's inline comment at
    // the same call site for the full reasoning.
    await test("openai: credential-type marker without echoable wording -> names its own env var", () => {
      const err = Object.assign(
        new Error("upstream rejected the supplied credential"),
        { type: "invalid_api_key" },
      );
      const result = openai.formatProviderError(err);
      assert(
        result instanceof AuthenticationError,
        "openai's credential-type marker no longer maps to AuthenticationError",
      );
      assert(
        result.message.includes("OPENAI_API_KEY"),
        "openai's env-var-naming auth branch lost its distinguishing variable name",
      );
    });
  }

  section("File2 Part B #13 — litellm duck-typed timeout shape");
  {
    const litellm = new LiteLLMProvider("glm-restricted");

    await test("litellm: duck-typed timeout (name only, not instanceof) -> NetworkError", () => {
      const duckTimeout = Object.assign(
        new Error("the proxy took too long to respond"),
        { name: "TimeoutError" },
      );
      const result = litellm.formatProviderError(duckTimeout);
      assert(
        result instanceof NetworkError,
        "litellm's duck-typed timeout check no longer maps to NetworkError",
      );
    });
  }

  section("File2 Part B #20 — ollama bare TimeoutError instance, own wording");
  {
    const ollama = new OllamaProvider();

    await test("ollama: TimeoutError -> NetworkError with its own wording (not the classifier default)", () => {
      const err = new TimeoutError("timed out", 3000, "ollama", "generate");
      const result = ollama.formatProviderError(err);
      assert(
        result instanceof NetworkError,
        "ollama's TimeoutError intercept no longer maps to NetworkError",
      );
      assert(
        result.message.includes("model may be loading"),
        "ollama's TimeoutError intercept lost its own wording (fell back to the classifier default)",
      );
    });
  }

  // ===========================================================================
  // Ported from continuous-test-suite-error-classifier-native.ts (old File3)
  // ===========================================================================

  section("File3 #1 — anthropic bare TimeoutError instance");
  {
    const anthropic = new AnthropicProvider();

    await test("anthropic: TimeoutError -> NetworkError", () => {
      const result = anthropic.formatProviderError(
        new TimeoutError("timed out", 3000, "anthropic", "stream"),
      );
      assert(result instanceof NetworkError, "expected NetworkError");
    });
  }

  section(
    "File3 #15-#16 — bedrock duck-typed .code shape + self-contradictory name-vs-message ordering",
  );
  {
    const bedrock = new AmazonBedrockProvider();

    // DEMOTED here (not in scout-1's original CONTRACT-ONLY list): verified
    // against the installed @aws-sdk/client-bedrock-runtime that every
    // generated exception class (including ThrottlingException) sets only
    // `.name`, never `.code`, in its constructor — so this duck-typed `.code`
    // shape can never be produced by a real or mocked AWS response with the
    // currently installed SDK. See
    // continuous-test-suite-error-classification-e2e.ts's inline comment at
    // the same call site for the full reasoning.
    await test("bedrock: ThrottlingException by .code (not just .name) -> RateLimitError", () => {
      const err = Object.assign(new Error("throttled"), {
        code: "ThrottlingException",
      });
      const result = bedrock.formatProviderError(err);
      assert(
        result instanceof RateLimitError,
        "bedrock's code-based ThrottlingException match was lost",
      );
    });

    await test("bedrock: ThrottlingException checked BEFORE the ValidationException generic path", () => {
      // A validation-shaped message that ALSO carries the throttling name must
      // still classify as RateLimitError — order matters, this pins it.
      const err = Object.assign(
        new Error("ValidationException-shaped but actually throttled"),
        { name: "ThrottlingException" },
      );
      const result = bedrock.formatProviderError(err);
      assert(
        result instanceof RateLimitError,
        "throttling-by-name lost precedence over message text",
      );
    });
  }

  // ===========================================================================
  // Replicated (not moved) from continuous-test-suite-gemini-tools-schema-
  // policy.ts, which remains untouched and still owns its own suite.
  // ===========================================================================

  section(
    "Gemini tools-vs-schema — shared predicate sanity (replicated from continuous-test-suite-gemini-tools-schema-policy.ts)",
  );

  await test("google-ai + tools + schema -> exclusion in force", () => {
    assert(
      isToolsSchemaExclusionInForce("google-ai", "gemini-2.5-pro", true, 2),
      "expected the shared predicate to report exclusion in force",
    );
  });

  await test("google-ai + tools + zero tool count -> exclusion NOT in force", () => {
    assert(
      !isToolsSchemaExclusionInForce("google-ai", "gemini-2.5-pro", true, 0),
      "zero active tools should never trigger the exclusion",
    );
  });
});
