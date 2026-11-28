#!/usr/bin/env tsx
/**
 * Continuous Test Suite — provider rules as JSON.
 *
 * Provider behaviour now lives in `src/lib/providers/rules/<id>.json`, read by
 * shared rule engines, instead of being hard-coded in each provider class.
 * This suite proves three things against the BUILT package:
 *
 *   1. Every rules file is valid (strict schema, regexes compile).
 *   2. The rules really drive behaviour: for every rule a real HTTP response
 *      can reach, a provider created through `AIProviderFactory` is pointed at
 *      a local stand-in that returns that response, and the error it throws
 *      must carry the class and the message written in that provider's JSON
 *      file (read from `dist/`, not copied into this file).
 *   3. No provider hand-codes error rules again (`match: (ctx) =>` tables).
 *   4. Finish reasons come from the `finishReasons` tables: a stand-in ends a
 *      completion with each wire value and generate() must report the value
 *      in the JSON table, and no provider or proxy file keeps its own switch.
 *   5. Token usage is read through the rules files: cache reads that OpenAI
 *      counts inside the prompt are split out of the input count, and no
 *      provider spells out OpenAI's usage field names by hand again.
 *   6. Context windows come from limits.json: every entry is what the
 *      shipped lookup returns, apart from a named list a model manifest
 *      overrides.
 *   7. Tool choices and tool names on the wire are what openai-chat.json
 *      says: a stand-in records the request body generate() sends.
 *   8. Vision model lists and image limits come from vision.json, and no
 *      file keeps its own list of model-family patterns.
 *
 * Rule 15 exception (listed in eslint.config.js): the schema and registry
 * are imported from `../dist/providers/rules/`, which no package entry point
 * exports, because whether a JSON file is well-formed cannot be seen through
 * generate(). The context-window lookup is imported from
 * `../dist/constants/contextWindows.js` for the same reason: generate() never
 * reports the window it budgeted against. `ProviderImageAdapter` is imported
 * from `../dist/adapters/providerImageAdapter.js` because its vision lists
 * and image limits are not reachable through any package export. Every
 * other behaviour check drives AIProviderFactory.
 *
 * ALL-DIST module graph (rule 15): `AIProviderFactory` comes from
 * `../dist/index.js`; the rules registry and schema are the shipped modules
 * under `../dist/providers/rules/`. Offline: every request goes to a stand-in
 * on 127.0.0.1, and `credentialFreeEnv` removes every real credential and
 * points HOME at an empty directory before anything loads.
 *
 * Run: pnpm run test:provider-rules
 */
import "./helpers/credentialFreeEnv.js";
import "./helpers/requireFreshDist.js";
import http from "node:http";
import http2 from "node:http2";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { AIProviderFactory, NeuroLink, tool } from "../dist/index.js";
import {
  getProviderRules,
  listProviderRules,
} from "../dist/providers/rules/registry.js";
import {
  getFinishReasonMap,
  translateFinishReason,
} from "../dist/providers/rules/finishReasons.js";
import { providerRulesFileSchema } from "../dist/providers/rules/schema.js";
import {
  compileToolNameRules,
  getToolChoiceMap,
  getToolNameRules,
  translateToolChoice,
} from "../dist/providers/rules/toolRules.js";
import { ProviderImageAdapter } from "../dist/adapters/providerImageAdapter.js";
import {
  getContextWindowSize,
  MODEL_CONTEXT_WINDOWS,
} from "../dist/constants/contextWindows.js";
import { assert, defineSuite, HardFail } from "./helpers/harness.js";

const { test, runSuite } = defineSuite("Provider rules as JSON", {
  offline: true,
  perTestTimeoutMs: 120_000,
});

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..");

// ---------------------------------------------------------------------------
// Stand-in servers: one HTTP/1.1 for every provider, one h2c for Bedrock
// (the AWS SDK speaks HTTP/2 to it). Each answers with the current scenario.
// ---------------------------------------------------------------------------

const body = (value: unknown) => JSON.stringify(value);
const SCENARIOS: Record<string, [number, string]> = {
  "401-invalid-key": [
    401,
    body({
      error: { message: "Invalid API key provided", type: "invalid_api_key" },
    }),
  ],
  "401-unauthorized": [401, "Unauthorized"],
  "403-auth-failed": [
    403,
    body({
      error: { message: "Authorization failed", type: "permission_error" },
    }),
  ],
  "403-quota": [
    403,
    body({ error: { message: "quota exceeded for this account" } }),
  ],
  "404-model": [
    404,
    body({
      error: {
        message: "The model `x` does not exist",
        code: "model_not_found",
      },
    }),
  ],
  "404-plain": [404, "Not Found"],
  "429-rate": [
    429,
    body({
      error: { message: "Rate limit reached", type: "rate_limit_error" },
    }),
  ],
  "429-quota": [
    429,
    body({
      error: {
        message: "You exceeded your current quota",
        type: "insufficient_quota",
      },
    }),
  ],
  "500-internal": [500, "Internal Server Error"],
  "400-tools": [
    400,
    body({ error: { message: "tools are not supported for this model" } }),
  ],
  "400-no-endpoints": [
    400,
    body({ error: { message: "No endpoints found for model x" } }),
  ],
  "402-credits": [402, body({ error: { message: "insufficient_credits" } })],
  "400-access-denied": [
    400,
    body({ message: "AccessDeniedException: not authorized" }),
  ],
  "400-invalid-argument": [
    400,
    body({
      error: {
        code: 400,
        message: "Request contains an invalid argument.",
        status: "INVALID_ARGUMENT",
      },
    }),
  ],
  // Bodies that carry one rule's own pattern words, for rules whose status
  // match an earlier rule would otherwise win.
  "400-ValidationException": [400, "ValidationException"],
  "400-rate-limit": [400, body({ error: { message: "rate limit" } })],
  "400-trial-limit": [400, body({ error: { message: "trial limit" } })],
  "400-RATE_LIMIT_EXCEEDED": [
    400,
    body({ error: { message: "RATE_LIMIT_EXCEEDED" } }),
  ],
  "400-QUOTA_EXCEEDED": [400, body({ error: { message: "QUOTA_EXCEEDED" } })],
  "400-ECONNRESET": [400, body({ error: { message: "ECONNRESET" } })],
  "400-ECONNREFUSED": [400, body({ error: { message: "ECONNREFUSED" } })],
  "400-500-in-message": [400, body({ error: { message: "500" } })],
  "400-server-error": [400, body({ error: { message: "server error" } })],
  "400-model-not-found": [400, body({ error: { message: "model not found" } })],
  "400-model_not_found": [400, body({ error: { message: "model_not_found" } })],
};
let current = "401-invalid-key";
let cachedUsage = false;
const requestBodies: string[] = [];

// A successful OpenAI chat completion ending with `finish_reason`, as JSON or
// as SSE depending on what the client asked for.
function finishResponse(
  res: http.ServerResponse,
  requestBody: string,
  finishReason: string,
): void {
  const streamed = /"stream"\s*:\s*true/.test(requestBody);
  const usage = cachedUsage
    ? {
        prompt_tokens: 10,
        completion_tokens: 2,
        total_tokens: 12,
        prompt_tokens_details: { cached_tokens: 4 },
      }
    : { prompt_tokens: 3, completion_tokens: 2, total_tokens: 5 };
  if (!streamed) {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(
      body({
        id: "c1",
        object: "chat.completion",
        created: 1,
        model: "m",
        choices: [
          {
            index: 0,
            message: { role: "assistant", content: "ok" },
            finish_reason: finishReason,
          },
        ],
        usage,
      }),
    );
    return;
  }
  res.writeHead(200, { "content-type": "text/event-stream" });
  const chunk = (choice: unknown, extra: object = {}) =>
    `data: ${body({ id: "c1", object: "chat.completion.chunk", created: 1, model: "m", choices: [choice], ...extra })}\n\n`;
  res.write(chunk({ index: 0, delta: { role: "assistant", content: "ok" } }));
  res.write(
    chunk({ index: 0, delta: {}, finish_reason: finishReason }, { usage }),
  );
  res.end("data: [DONE]\n\n");
}

const h1 = http.createServer((req, res) => {
  const parts: Buffer[] = [];
  req.on("data", (part: Buffer) => parts.push(part));
  req.on("end", () => {
    requestBodies.push(Buffer.concat(parts).toString("utf8"));
    if (current.startsWith("finish:")) {
      finishResponse(
        res,
        Buffer.concat(parts).toString("utf8"),
        current.slice("finish:".length),
      );
      return;
    }
    if (current === "hang") {
      return; // never answer: the caller's own timeout fires
    }
    const [status, payload] = SCENARIOS[current];
    res.writeHead(status, {
      "content-type": payload.startsWith("{")
        ? "application/json"
        : "text/plain",
      "retry-after": "0",
    });
    res.end(payload);
  });
});
const h2 = http2.createServer();
h2.on("stream", (stream) => {
  stream.resume();
  stream.on("end", () => {
    if (current === "hang") {
      return;
    }
    const [status, payload] = SCENARIOS[current];
    stream.respond({
      ":status": status,
      "content-type": "application/json",
      "retry-after": "0",
      "x-amzn-errortype":
        current === "400-access-denied"
          ? "AccessDeniedException"
          : status === 429
            ? "ThrottlingException"
            : "ValidationException",
    });
    stream.end(payload.startsWith("{") ? payload : body({ message: payload }));
  });
});
await new Promise<void>((resolve) => h1.listen(0, "127.0.0.1", resolve));
await new Promise<void>((resolve) => h2.listen(0, "127.0.0.1", resolve));
const portOf = (server: http.Server | http2.Http2Server) => {
  const address = server.address();
  return typeof address === "object" && address ? address.port : 0;
};
const base = `http://127.0.0.1:${portOf(h1)}`;
const h2base = `http://127.0.0.1:${portOf(h2)}`;
const CLOSED = "http://127.0.0.1:1";

// Placeholder credentials and the stand-in's address, per provider.
Object.assign(process.env, {
  OPENROUTER_API_KEY: "k",
  OPENROUTER_BASE_URL: `${base}/v1`,
  NVIDIA_NIM_API_KEY: "k",
  NVIDIA_NIM_BASE_URL: `${base}/v1`,
  LITELLM_API_KEY: "k",
  LITELLM_BASE_URL: `${base}/v1`,
  OPENAI_COMPATIBLE_API_KEY: "k",
  OPENAI_COMPATIBLE_BASE_URL: `${base}/v1`,
  OPENAI_COMPATIBLE_MODEL: "m",
  OPENAI_API_KEY: "k",
  OPENAI_BASE_URL: `${base}/v1`,
  COHERE_API_KEY: "k",
  COHERE_BASE_URL: `${base}/compatibility/v1`,
  ANTHROPIC_API_KEY: "k",
  ANTHROPIC_BASE_URL: base,
  OLLAMA_BASE_URL: base,
  LM_STUDIO_BASE_URL: `${base}/v1`,
  LLAMACPP_BASE_URL: `${base}/v1`,
  AZURE_OPENAI_API_KEY: "k",
  AZURE_OPENAI_ENDPOINT: base,
  AZURE_OPENAI_DEPLOYMENT: "d",
  GOOGLE_AI_API_KEY: "k",
  GOOGLE_AI_BASE_URL: base,
  GOOGLE_VERTEX_API_KEY: "k",
  GOOGLE_VERTEX_BASE_URL: base,
  AWS_ACCESS_KEY_ID: "AKIAEXAMPLE",
  AWS_SECRET_ACCESS_KEY: "placeholder",
  AWS_REGION: "us-east-1",
  AWS_ENDPOINT_URL_BEDROCK_RUNTIME: h2base,
  NEUROLINK_DISABLE_ANALYTICS: "1",
});

const PROVIDERS: Record<
  string,
  { model: string; baseEnv: string; unreachable: string }
> = {
  anthropic: {
    model: "claude-sonnet-4-6",
    baseEnv: "ANTHROPIC_BASE_URL",
    unreachable: CLOSED,
  },
  azure: {
    model: "gpt-4o-mini",
    baseEnv: "AZURE_OPENAI_ENDPOINT",
    unreachable: CLOSED,
  },
  bedrock: {
    model: "anthropic.claude-sonnet-4-6",
    baseEnv: "AWS_ENDPOINT_URL_BEDROCK_RUNTIME",
    unreachable: CLOSED,
  },
  cohere: {
    model: "command-r",
    baseEnv: "COHERE_BASE_URL",
    unreachable: `${CLOSED}/v1`,
  },
  "google-ai": {
    model: "gemini-2.5-flash",
    baseEnv: "GOOGLE_AI_BASE_URL",
    unreachable: CLOSED,
  },
  litellm: {
    model: "gpt-4o-mini",
    baseEnv: "LITELLM_BASE_URL",
    unreachable: `${CLOSED}/v1`,
  },
  llamacpp: {
    model: "loaded-model",
    baseEnv: "LLAMACPP_BASE_URL",
    unreachable: `${CLOSED}/v1`,
  },
  "lm-studio": {
    model: "local-model",
    baseEnv: "LM_STUDIO_BASE_URL",
    unreachable: `${CLOSED}/v1`,
  },
  "nvidia-nim": {
    model: "meta/llama-3.1-8b-instruct",
    baseEnv: "NVIDIA_NIM_BASE_URL",
    unreachable: `${CLOSED}/v1`,
  },
  ollama: {
    model: "llama3.2",
    baseEnv: "OLLAMA_BASE_URL",
    unreachable: CLOSED,
  },
  openai: {
    model: "gpt-4o-mini",
    baseEnv: "OPENAI_BASE_URL",
    unreachable: `${CLOSED}/v1`,
  },
  "openai-compatible": {
    model: "m",
    baseEnv: "OPENAI_COMPATIBLE_BASE_URL",
    unreachable: `${CLOSED}/v1`,
  },
  openrouter: {
    model: "openai/gpt-4o-mini",
    baseEnv: "OPENROUTER_BASE_URL",
    unreachable: `${CLOSED}/v1`,
  },
  vertex: {
    model: "gemini-2.5-flash",
    baseEnv: "GOOGLE_VERTEX_BASE_URL",
    unreachable: CLOSED,
  },
};

// Every (provider, response, rule) a real HTTP response reaches, found by
// driving every provider through every response and matching the thrown
// message against its rules ("hang" never answers, so the caller's own
// timeout fires). 60 of the 61 rules are reached. The exception is Vertex
// rule #0 (errorName TimeoutError): a Vertex timeout surfaces as a raw
// AbortError that no Vertex rule matches.
const CASES: Array<[provider: string, scenario: string, ruleIndex: number]> = [
  ["anthropic", "401-invalid-key", 0],
  ["anthropic", "429-rate", 1],
  ["anthropic", "unreachable", 2],
  ["anthropic", "500-internal", 3],
  ["anthropic", "403-auth-failed", 4],
  ["azure", "401-unauthorized", 0],
  ["bedrock", "400-access-denied", 0],
  ["bedrock", "429-rate", 1],
  ["bedrock", "400-ValidationException", 2],
  ["bedrock", "401-invalid-key", 3],
  ["cohere", "401-unauthorized", 0],
  ["cohere", "400-rate-limit", 1],
  ["cohere", "404-plain", 2],
  ["cohere", "400-trial-limit", 3],
  ["google-ai", "401-invalid-key", 0],
  ["google-ai", "400-RATE_LIMIT_EXCEEDED", 1],
  ["google-ai", "404-model", 2],
  ["google-ai", "400-ECONNRESET", 3],
  ["google-ai", "400-500-in-message", 4],
  ["google-ai", "403-auth-failed", 5],
  ["litellm", "hang", 0],
  ["litellm", "400-ECONNREFUSED", 1],
  ["litellm", "401-invalid-key", 2],
  ["litellm", "429-rate", 3],
  ["litellm", "400-model-not-found", 4],
  ["llamacpp", "unreachable", 0],
  ["llamacpp", "400-tools", 1],
  ["lm-studio", "unreachable", 0],
  ["lm-studio", "404-plain", 1],
  ["nvidia-nim", "401-invalid-key", 0],
  ["nvidia-nim", "400-rate-limit", 1],
  ["nvidia-nim", "403-auth-failed", 2],
  ["nvidia-nim", "404-model", 3],
  ["nvidia-nim", "403-quota", 4],
  ["ollama", "unreachable", 0],
  ["ollama", "404-model", 1],
  ["ollama", "404-plain", 2],
  ["openai", "401-unauthorized", 0],
  ["openai", "429-quota", 1],
  ["openai", "429-rate", 2],
  ["openai", "400-model_not_found", 3],
  ["openai-compatible", "hang", 0],
  ["openai-compatible", "400-ECONNREFUSED", 1],
  ["openai-compatible", "401-invalid-key", 2],
  ["openai-compatible", "404-model", 3],
  ["openrouter", "hang", 0],
  ["openrouter", "400-ECONNREFUSED", 1],
  ["openrouter", "401-invalid-key", 2],
  ["openrouter", "400-rate-limit", 3],
  ["openrouter", "400-model-not-found", 4],
  ["openrouter", "402-credits", 5],
  ["openrouter", "400-no-endpoints", 6],
  ["openrouter", "400-tools", 7],
  ["vertex", "401-invalid-key", 1],
  ["vertex", "404-model", 2],
  ["vertex", "400-QUOTA_EXCEEDED", 3],
  ["vertex", "400-ECONNRESET", 4],
  ["vertex", "400-server-error", 5],
  ["vertex", "400-invalid-argument", 6],
  ["vertex", "400-tools", 7],
];

// The fixed text of a message hook, for rules whose wording is built in code.
const HOOK_TEXT: Record<string, string> = {
  "vertex.modelUnavailable": "is not available in region",
  "vertex.rateLimit": "rate limit / shared-capacity exhausted",
};

const CLASS_NAME: Record<string, string> = {
  authentication: "AuthenticationError",
  "rate-limit": "RateLimitError",
  "invalid-model": "InvalidModelError",
  network: "NetworkError",
  provider: "ProviderError",
};

/** Throws the provider's error for one response, or fails if none is thrown. */
async function errorFor(provider: string, scenario: string): Promise<Error> {
  const spec = PROVIDERS[provider];
  const saved = process.env[spec.baseEnv];
  if (scenario === "unreachable") {
    process.env[spec.baseEnv] = spec.unreachable;
  } else {
    current = scenario;
  }
  try {
    const instance = await AIProviderFactory.createProvider(
      provider,
      spec.model,
      false,
    );
    await instance.generate({
      prompt: "hi",
      disableTools: true,
      timeout: scenario === "hang" ? 400 : 15_000,
      maxTokens: 16,
    });
  } catch (error) {
    return error instanceof Error ? error : new Error(String(error));
  } finally {
    process.env[spec.baseEnv] = saved;
  }
  throw new Error(
    `${provider} / ${scenario}: expected an error, but generate() succeeded`,
  );
}

await test("every rules file passes the strict schema", async () => {
  const files = listProviderRules();
  assert(
    files.length >= 14,
    `expected at least 14 rules files, found ${files.length}`,
  );
  for (const file of files) {
    const result = providerRulesFileSchema.safeParse(file);
    assert(
      result.success,
      `${file.id}.json is invalid: ${result.success ? "" : result.error.issues.map((issue) => `${issue.path.join(".")} ${issue.message}`).join("; ")}`,
    );
  }
});

await test("the schema rejects a malformed rule", async () => {
  const broken = structuredClone(listProviderRules()[0]);
  const rules = broken.errors?.rules ?? [];
  rules[0] = { ...rules[0], pattern: "([unclosed" };
  rules.push({ class: "provider" });
  const result = providerRulesFileSchema.safeParse({
    ...broken,
    unknownKey: 1,
  });
  assert(
    !result.success,
    "a file with a bad regex, a trigger-less rule and an unknown key was accepted",
  );
  const messages = result.success
    ? []
    : result.error.issues.map((issue) => issue.message);
  for (const expected of [
    "must compile as a regular expression",
    "rule has no trigger",
    "rule needs `message` or `messageHook`",
  ]) {
    assert(
      messages.some((message) => message.includes(expected)),
      `missing schema error: ${expected}`,
    );
  }
});

for (const [provider, scenario, ruleIndex] of CASES) {
  await test(`${provider}: ${scenario} classified by rule #${ruleIndex} of ${provider}.json`, async () => {
    const rule = getProviderRules(provider).errors?.rules[ruleIndex];
    if (rule === undefined) {
      throw new HardFail(`${provider}.json has no rule #${ruleIndex}`);
    }
    const error = await errorFor(provider, scenario);
    const expectedClass = CLASS_NAME[rule.class];
    assert(
      error.constructor.name === expectedClass,
      `${provider} / ${scenario}: expected ${expectedClass} from rule #${ruleIndex}, got ${error.constructor.name}`,
    );
    const template = rule.messageHook
      ? HOOK_TEXT[rule.messageHook]
      : rule.message;
    if (template === undefined) {
      throw new HardFail(`rule #${ruleIndex} has no message to check`);
    }
    const fixedParts = template
      .split(/\{[A-Za-z]+\}/)
      .filter((part) => part.trim().length > 0);
    for (const part of fixedParts) {
      assert(
        error.message.includes(part),
        `${provider} / ${scenario}: the message does not contain the text of rule #${ruleIndex} in ${provider}.json`,
      );
    }
  });
}

// Finish reasons: every wire value in openai-chat.json's table, plus one the
// table does not list, sent by the stand-in; generate() must report what the
// JSON table says. Changing a value in the JSON changes these results.
const CHAT_FINISH = getFinishReasonMap("openai-chat", "chatCompletions");
for (const wire of [...Object.keys(CHAT_FINISH.map), "stop", "brand_new"]) {
  if (wire === "error") {
    continue; // the SSE parser throws on a wire `error` finish by design
  }
  await test(`openai-compatible: finish_reason "${wire}" reported as openai-chat.json says`, async () => {
    current = `finish:${wire}`;
    const instance = await AIProviderFactory.createProvider(
      "openai-compatible",
      "m",
      false,
    );
    const result = await instance.generate({
      prompt: "hi",
      disableTools: true,
      timeout: 15_000,
      maxTokens: 16,
    });
    const expected = translateFinishReason(CHAT_FINISH, wire);
    assert(
      result?.finishReason === expected,
      `finish_reason "${wire}": expected "${expected}" from openai-chat.json, got "${result?.finishReason}"`,
    );
  });
}

// Usage: OpenAI reports cache reads inside prompt_tokens. openai-chat.json's
// `usage` block names that field, so the provider must move those 4 tokens
// out of the input count and report them as cache reads.
await test("openai-compatible: cached prompt tokens split out as openai-chat.json says", async () => {
  current = "finish:stop";
  cachedUsage = true;
  try {
    const instance = await AIProviderFactory.createProvider(
      "openai-compatible",
      "m",
      false,
    );
    const result = await instance.generate({
      prompt: "hi",
      disableTools: true,
      timeout: 15_000,
      maxTokens: 16,
    });
    const usage = result?.usage;
    assert(
      usage?.input === 6 && usage.cacheReadTokens === 4 && usage.output === 2,
      `expected input 6, cacheReadTokens 4, output 2; got ${JSON.stringify(usage)}`,
    );
  } finally {
    cachedUsage = false;
  }
});

await test("every finish-reason table is reachable by name", async () => {
  for (const file of listProviderRules()) {
    for (const name of Object.keys(file.finishReasons ?? {})) {
      assert(
        getFinishReasonMap(file.id, name) !== undefined,
        `${file.id}.json finishReasons.${name} is not loadable`,
      );
    }
  }
});

await test("no provider or proxy hand-codes a finish-reason switch", async () => {
  const offenders: string[] = [];
  const reasonCase =
    /case\s+"(?:max_tokens|MAX_TOKENS|content_filter|end_turn|stop_sequence)"\s*:/;
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (
        entry.name.endsWith(".ts") &&
        reasonCase.test(fs.readFileSync(full, "utf8"))
      ) {
        offenders.push(path.relative(root, full));
      }
    }
  };
  walk(path.join(root, "src", "lib", "providers"));
  walk(path.join(root, "src", "lib", "proxy"));
  assert(
    offenders.length === 0,
    `finish-reason tables belong in src/lib/providers/rules/<id>.json; switches found in: ${offenders.join(", ")}`,
  );
});

await test("no provider hand-codes OpenAI's cached-token split", async () => {
  const file = path.join(
    root,
    "src",
    "lib",
    "providers",
    "openaiChatCompletionsBase.ts",
  );
  assert(
    !/\w\??\.prompt_tokens_details\??\.cached_tokens/.test(
      fs.readFileSync(file, "utf8"),
    ),
    "openaiChatCompletionsBase.ts reads prompt_tokens_details.cached_tokens by hand; read it through readWireUsage and openai-chat.json",
  );
});

// Entries in limits.json that a model manifest overrides, so the lookup
// returns the manifest's value instead. Each must still disagree; when the
// two sources are reconciled, delete the entry here.
const MANIFEST_OVERRIDES: Record<string, number> = {};

await test("context windows come from limits.json", async () => {
  const windows = getProviderRules("limits").contextWindows ?? {};
  let checked = 0;
  for (const [provider, models] of Object.entries(windows)) {
    // A catalog provider with the same id replaces the whole entry.
    if (MODEL_CONTEXT_WINDOWS[provider] !== models) {
      continue;
    }
    for (const [model, size] of Object.entries(models)) {
      if (model === "_default") {
        continue;
      }
      const got = getContextWindowSize(provider, model);
      const override = MANIFEST_OVERRIDES[`${provider}/${model}`];
      if (override !== undefined) {
        assert(
          got === override && got !== size,
          `${provider}/${model} is listed as manifest-overridden but the lookup returned ${got}; update MANIFEST_OVERRIDES`,
        );
      } else {
        assert(
          got === size,
          `${provider}/${model}: limits.json says ${size}, the lookup returned ${got}`,
        );
      }
      checked++;
    }
  }
  assert(checked >= 150, `only ${checked} context-window entries checked`);
});

await test("no provider hand-codes an error-rule table", async () => {
  const providersDir = path.join(root, "src", "lib", "providers");
  const offenders: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (
        entry.name.endsWith(".ts") &&
        /match:\s*\(\s*ctx\s*\)\s*=>/.test(fs.readFileSync(full, "utf8"))
      ) {
        offenders.push(path.relative(root, full));
      }
    }
  };
  walk(providersDir);
  assert(
    offenders.length === 0,
    `error rules belong in src/lib/providers/rules/<id>.json; hand-written rule tables found in: ${offenders.join(", ")}`,
  );
});

// Tool choice and tool names: a tool whose name is outside the OpenAI wire
// alphabet, forced by name and by "required". The request body generate()
// sends must carry the name and the tool_choice that openai-chat.json gives.
const WIRE_NAMES = compileToolNameRules(getToolNameRules("openai-chat"));
const CHAT_TOOL_CHOICE = getToolChoiceMap("openai-chat", "neurolink");
const ODD_TOOL = "mcp:fs/read file";
for (const choice of [
  "required",
  { type: "tool", toolName: ODD_TOOL },
] as const) {
  await test(`openai-compatible: toolChoice ${JSON.stringify(choice)} sent as openai-chat.json says`, async () => {
    current = "finish:stop";
    requestBodies.length = 0;
    const instance = await AIProviderFactory.createProvider(
      "openai-compatible",
      "m",
      false,
    );
    await instance.generate({
      prompt: "hi",
      timeout: 15_000,
      maxTokens: 16,
      tools: {
        [ODD_TOOL]: tool({
          description: "read a file",
          inputSchema: z.object({ path: z.string() }),
          execute: async () => "contents",
        }),
      },
      toolChoice: choice as never,
    });
    const sent = JSON.parse(requestBodies[0] ?? "{}") as {
      tools?: Array<{ function?: { name?: string } }>;
      tool_choice?: unknown;
    };
    const wireName = WIRE_NAMES.sanitize(ODD_TOOL);
    const expected = translateToolChoice(
      CHAT_TOOL_CHOICE,
      choice,
      () => wireName,
    );
    const names = (sent.tools ?? []).map((t) => t.function?.name);
    assert(
      wireName !== ODD_TOOL &&
        names.includes(wireName) &&
        !names.includes(ODD_TOOL),
      `tool name: expected "${wireName}" from openai-chat.json toolNames among ${JSON.stringify(names)}`,
    );
    assert(
      JSON.stringify(sent.tool_choice) === JSON.stringify(expected),
      `tool_choice: expected ${JSON.stringify(expected)} from openai-chat.json, got ${JSON.stringify(sent.tool_choice)}`,
    );
  });
}

await test("vision model lists and image limits come from vision.json", async () => {
  const rules = getProviderRules("vision");
  let checked = 0;
  for (const [provider, models] of Object.entries(rules.visionModels ?? {})) {
    const got = ProviderImageAdapter.getSupportedModels(provider);
    assert(
      JSON.stringify(got) === JSON.stringify(models),
      `${provider}: vision.json lists ${models.length} vision models, the adapter returned ${got.length}`,
    );
    checked++;
  }
  for (const [provider, limit] of Object.entries(rules.imageLimits ?? {})) {
    if (typeof limit !== "number") {
      continue;
    }
    let threw = false;
    try {
      ProviderImageAdapter.validateImageCount(limit + 1, provider);
    } catch {
      threw = true;
    }
    ProviderImageAdapter.validateImageCount(limit, provider);
    assert(
      threw,
      `${provider}: ${limit + 1} images should exceed vision.json's limit of ${limit}`,
    );
    checked++;
  }
  assert(checked >= 30, `only ${checked} vision entries checked`);
});

await test("no file hand-codes a tool-choice switch or a model-family list", async () => {
  const offenders: string[] = [];
  const handCoded = [/case\s+"required"\s*:/, /:\s*RegExp\[\]\s*=\s*\[/];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.name.endsWith(".ts")) {
        const text = fs.readFileSync(full, "utf8");
        if (handCoded.some((re) => re.test(text))) {
          offenders.push(path.relative(root, full));
        }
      }
    }
  };
  for (const dir of ["providers", "models", "adapters"]) {
    walk(path.join(root, "src", "lib", dir));
  }
  assert(
    offenders.length === 0,
    `tool-choice maps and model families belong in src/lib/providers/rules/; found in: ${offenders.join(", ")}`,
  );
});

await test("the Claude thinking-budget clamps read anthropic.json thinkingLimits", async () => {
  // The limits must come from the rules file, not a literal: a hand-written
  // `maxTokens - 1024` or `< 1024` comparison in either Claude path fails.
  const handCoded = /maxTokens\s*-\s*\d{3,}|(?:budget|clamped)\s*<\s*\d{3,}/;
  const offenders = [
    "src/lib/providers/anthropic/client.ts",
    "src/lib/providers/googleVertex/client.ts",
  ].filter((file) =>
    handCoded.test(fs.readFileSync(path.join(root, file), "utf8")),
  );
  assert(
    offenders.length === 0,
    `thinking limits belong in anthropic.json thinkingLimits; found in: ${offenders.join(", ")}`,
  );
  const limits = (
    JSON.parse(
      fs.readFileSync(
        path.join(root, "src/lib/providers/rules/anthropic.json"),
        "utf8",
      ),
    ) as { thinkingLimits?: Record<string, unknown> }
  ).thinkingLimits;
  assert(
    typeof limits?.minBudgetTokens === "number" &&
      typeof limits?.answerReserveTokens === "number",
    "anthropic.json has no thinkingLimits block",
  );
});

await test("Ollama's default and fallback models come from ollama.json", async () => {
  const fallback = getProviderRules("ollama").fallbackModel;
  assert(
    typeof fallback === "string" && fallback.length > 0,
    "ollama.json has no fallbackModel",
  );
  const ollamaDir = path.join(root, "src", "lib", "providers", "ollama");
  const offenders = fs
    .readdirSync(ollamaDir)
    .filter((file) =>
      /(?:FALLBACK|DEFAULT)_OLLAMA_MODEL\s*=\s*(?:["'`]|OllamaModels\.)/.test(
        fs.readFileSync(path.join(ollamaDir, file), "utf8"),
      ),
    );
  assert(
    offenders.length === 0,
    `the Ollama default and fallback models belong in ollama.json; a literal is in: ${offenders.join(", ")}`,
  );
  assert(
    getProviderRules("ollama").defaultModel === fallback,
    "ollama.json's defaultModel and fallbackModel should both be the quickstart model",
  );
  // The model-not-found message names the fallback, so a live error shows
  // which value is in use.
  const error = await errorFor("ollama", "404-model");
  assert(
    error.message.includes(`'${fallback}'`),
    "the Ollama model-not-found message does not name ollama.json's fallbackModel",
  );
});

await test("a Vertex Gemini generate that hits its time limit returns its terminal result", async () => {
  // The turn clock aborts the request; generate() must end the turn with its
  // time-limit result. It used to re-await the failed drain and throw a bare
  // AbortError ("This operation was aborted") instead.
  current = "hang";
  const instance = await AIProviderFactory.createProvider(
    "vertex",
    PROVIDERS.vertex.model,
    false,
  );
  let result: { stopReason?: string; content?: string } | undefined;
  let thrown: unknown;
  try {
    result = (await instance.generate({
      prompt: "hi",
      disableTools: true,
      timeout: 400,
      maxTokens: 16,
    })) as { stopReason?: string; content?: string } | undefined;
  } catch (error) {
    thrown = error;
  }
  assert(
    thrown === undefined,
    `generate() threw ${thrown instanceof Error ? thrown.name : typeof thrown} instead of returning the time-limit result`,
  );
  assert(
    result?.stopReason === "time-limit",
    `expected stopReason "time-limit", got ${String(result?.stopReason)}`,
  );
  assert(
    typeof result?.content === "string" && result.content.length > 0,
    "the time-limit result has no message",
  );
});

await test("a Vertex Claude generate timeout gets vertex.json rule #0's message", async () => {
  // The Anthropic SDK reports a timeout as "Request timed out." with no
  // distinctive error name; rule #0 matches that text as well as TimeoutError.
  const ruleMessage = getProviderRules("vertex").errors?.rules[0]?.message;
  if (ruleMessage === undefined) {
    throw new HardFail("vertex.json has no rule #0 message");
  }
  current = "hang";
  const nl = new NeuroLink({ conversationMemory: { enabled: false } });
  let thrown: unknown;
  try {
    await nl.generate({
      provider: "vertex",
      model: "claude-sonnet-4-5",
      credentials: { vertex: { apiKey: "k", baseURL: base } },
      input: { text: "hi" },
      disableTools: true,
      timeout: 400,
      maxTokens: 16,
      disableInternalFallback: true,
    });
  } catch (error) {
    thrown = error;
  }
  if (!(thrown instanceof Error)) {
    throw new HardFail("the timed-out Vertex Claude call did not throw");
  }
  assert(
    thrown.message.includes(ruleMessage),
    "the Vertex Claude timeout does not carry vertex.json rule #0's message",
  );
});

await test("structured-output error signals and request defaults come from JSON", async () => {
  // A hand-written copy of a signal pattern or default value in code fails.
  const checks: Array<[string, RegExp]> = [
    [
      "src/lib/core/modules/structuredOutputPolicy.ts",
      /too many states|cannot be combined with|unsupported response/i,
    ],
    ["src/lib/providers/openaiChatCompletionsClient.ts", /\^\(o\\d\|gpt-5\)/],
    [
      "src/lib/providers/anthropic/client.ts",
      /max_tokens\s*>\s*\d{3,}|300_000/,
    ],
    ["src/lib/providers/amazonBedrock/client.ts", /temperature\s*\?\?\s*\d/],
  ];
  const offenders = checks
    .filter(([file, pattern]) =>
      pattern.test(
        fs
          .readFileSync(path.join(root, file), "utf8")
          .replace(/^\s*(\/\/|\*).*$/gm, ""),
      ),
    )
    .map(([file]) => file);
  assert(
    offenders.length === 0,
    `these values belong in the rules JSON; found in code: ${offenders.join(", ")}`,
  );
  const signals = getProviderRules("structured-output").errorSignals ?? {};
  for (const name of [
    "toolsSchemaConflict",
    "schemaComplexity",
    "responseFormatUnsupported",
  ]) {
    assert(
      (signals[name]?.length ?? 0) > 0,
      `structured-output.json has no errorSignals.${name}`,
    );
  }
  assert(
    getProviderRules("bedrock").requestDefaults?.temperature !== undefined &&
      getProviderRules("anthropic").requestDefaults
        ?.largeOutputThresholdTokens !== undefined,
    "bedrock.json or anthropic.json is missing requestDefaults",
  );
});

await test("the final_result tool's name, description and instructions come from structured-output.json", async () => {
  const tool = getProviderRules("structured-output").finalResultTool;
  if (tool === undefined) {
    throw new HardFail("structured-output.json has no finalResultTool");
  }
  // No provider may spell the tool's name, description or instructions again.
  const files = [
    "src/lib/providers/googleVertex/client.ts",
    "src/lib/providers/anthropic/structuredOutput.ts",
    "src/lib/providers/anthropic/client.ts",
    "src/lib/providers/googleNativeGemini3/utils.ts",
  ];
  const handCoded =
    /"final_result"|'final_result'|Return the final structured result|IMPORTANT: (?:You MUST call|When you have gathered)|call final_result\b/;
  const offenders = files.filter((file) =>
    handCoded.test(
      fs
        .readFileSync(path.join(root, file), "utf8")
        .replace(/^\s*(\/\/|\*).*$/gm, ""),
    ),
  );
  assert(
    offenders.length === 0,
    `final_result texts belong in structured-output.json; found in: ${offenders.join(", ")}`,
  );
  // End to end: a structured-output call to Claude on Vertex sends the JSON's
  // tool and instruction. (Direct Anthropic adds the tool only when the caller
  // passes tools of its own; Vertex Claude always does.)
  // Any scenario works: the request body is recorded before the stand-in answers.
  current = "401-invalid-key";
  const nl = new NeuroLink({ conversationMemory: { enabled: false } });
  requestBodies.length = 0;
  await nl
    .generate({
      provider: "vertex",
      model: "claude-sonnet-4-5",
      credentials: { vertex: { apiKey: "k", baseURL: base } },
      input: { text: "hi" },
      schema: z.object({ answer: z.string() }),
      maxTokens: 64,
      disableTools: true,
      disableInternalFallback: true,
    })
    .catch(() => undefined);
  const sent = requestBodies
    .map((raw) => {
      try {
        return JSON.parse(raw) as { tools?: unknown; system?: unknown };
      } catch {
        return undefined;
      }
    })
    .find((b) => Array.isArray(b?.tools));
  const sentTool = (
    sent?.tools as Array<{ name?: string; description?: string }> | undefined
  )?.find((t) => t.name === tool.name);
  if (sentTool === undefined) {
    throw new HardFail(
      "the Vertex Claude request carried no final_result tool",
    );
  }
  assert(
    sentTool.description === tool.description,
    "the tool description differs from structured-output.json",
  );
  const system = JSON.stringify(sent?.system ?? "");
  assert(
    system.includes(
      JSON.stringify(
        // The system block is sent trimmed, without the leading blank lines.
        tool.instructions.mustCall.replaceAll("{tool}", tool.name).trim(),
      ).slice(1, -1),
    ),
    "the system prompt lacks structured-output.json's mustCall instruction",
  );
});

await test("Anthropic Messages request fields, tool-result text and replay rules come from anthropic.json", async () => {
  const rules = getProviderRules("anthropic");
  const fields = rules.requestFields;
  if (fields === undefined || rules.toolResults === undefined) {
    throw new HardFail("anthropic.json has no requestFields or toolResults");
  }
  // No Anthropic Messages builder may write these wire keys or texts by hand.
  const files = [
    "src/lib/providers/anthropic/client.ts",
    "src/lib/providers/anthropic/loopAdapter.ts",
    "src/lib/providers/googleVertex/client.ts",
    "src/lib/context/anthropicLoopGuard.ts",
  ];
  const handCoded =
    /\b(?:max_tokens|top_p|stop_sequences|is_error)\s*:|\.(?:max_tokens|top_p)\b|"server_tool_use"|Error executing tool|Earlier tool exchanges were removed|=== "max_tokens"|\b600_000\b|\b4_000\b/;
  const offenders = files.filter((file) =>
    handCoded.test(
      fs
        .readFileSync(path.join(root, file), "utf8")
        .replace(/^\s*(\/\/|\*).*$/gm, "")
        .replace(/`[^`]*`/g, "``"),
    ),
  );
  assert(
    offenders.length === 0,
    `Anthropic Messages wire rules belong in anthropic.json; found in: ${offenders.join(", ")}`,
  );
  // End to end: a direct Anthropic generate() sends the JSON's field names.
  current = "401-invalid-key";
  const nl = new NeuroLink({ conversationMemory: { enabled: false } });
  requestBodies.length = 0;
  await nl
    .generate({
      provider: "anthropic",
      model: "claude-sonnet-4-5",
      input: { text: "hi" },
      maxTokens: 64,
      temperature: 0.2,
      disableTools: true,
      disableInternalFallback: true,
    })
    .catch(() => undefined);
  const sent = requestBodies
    .map((raw) => {
      try {
        return JSON.parse(raw) as Record<string, unknown>;
      } catch {
        return undefined;
      }
    })
    .find((body) => body !== undefined && "messages" in body);
  if (sent === undefined) {
    throw new HardFail("the stand-in recorded no Anthropic request");
  }
  assert(
    sent[fields.maxTokens] === 64 && sent[fields.temperature] === 0.2,
    "the Anthropic request does not carry anthropic.json's field names",
  );
});

/** The first recorded request body that has `messages`, parsed. */
function firstRequestBody(): Record<string, unknown> {
  for (const raw of requestBodies) {
    try {
      const body = JSON.parse(raw) as Record<string, unknown>;
      if ("messages" in body) {
        return body;
      }
    } catch {
      // not JSON; keep looking
    }
  }
  throw new HardFail("the stand-in recorded no request with messages");
}

for (const call of ["generate", "stream"] as const) {
  await test(`a caller's topP and stopSequences reach the wire on ${call}() (OpenAI and Anthropic)`, async () => {
    current = "401-invalid-key";
    const nl = new NeuroLink({ conversationMemory: { enabled: false } });
    for (const [provider, model, stopKey] of [
      ["openai", "gpt-4o-mini", "stop"],
      ["anthropic", "claude-sonnet-4-20250514", "stop_sequences"],
    ] as const) {
      requestBodies.length = 0;
      const options = {
        provider,
        model,
        input: { text: "hi" },
        maxTokens: 64,
        topP: 0.9,
        stopSequences: ["END"],
        disableTools: true,
        disableInternalFallback: true,
      };
      if (call === "generate") {
        await nl.generate(options).catch(() => undefined);
      } else {
        await nl
          .stream(options)
          .then(async (result) => {
            for await (const _chunk of result.stream) {
              // drain
            }
          })
          .catch(() => undefined);
      }
      const sent = firstRequestBody();
      assert(sent.top_p === 0.9, `${provider} ${call}(): top_p was not sent`);
      assert(
        JSON.stringify(sent[stopKey]) === JSON.stringify(["END"]),
        `${provider} ${call}(): stop sequences were not sent`,
      );
    }
  });
}

await test("Claude models that reject temperature with top_p get only temperature", async () => {
  current = "401-invalid-key";
  const nl = new NeuroLink({ conversationMemory: { enabled: false } });
  const sentFor = async (model: string) => {
    requestBodies.length = 0;
    await nl
      .generate({
        provider: "anthropic",
        model,
        input: { text: "hi" },
        maxTokens: 64,
        temperature: 0.3,
        topP: 0.9,
        disableTools: true,
        disableInternalFallback: true,
      })
      .catch(() => undefined);
    return firstRequestBody();
  };
  const exclusive = await sentFor("claude-sonnet-4-5");
  assert(
    exclusive.temperature === 0.3 && !("top_p" in exclusive),
    "claude-sonnet-4-5 should get temperature and no top_p",
  );
  const both = await sentFor("claude-sonnet-4-20250514");
  assert(
    both.temperature === 0.3 && both.top_p === 0.9,
    "claude-sonnet-4-20250514 accepts both and should get both",
  );
});

await test("a Claude-on-Vertex request with thinking on carries no temperature or top_p", async () => {
  current = "401-invalid-key";
  const nl = new NeuroLink({ conversationMemory: { enabled: false } });
  requestBodies.length = 0;
  await nl
    .generate({
      provider: "vertex",
      model: "claude-sonnet-4-20250514",
      credentials: { vertex: { apiKey: "k", baseURL: base } },
      input: { text: "hi" },
      maxTokens: 4096,
      temperature: 0.3,
      topP: 0.9,
      thinkingConfig: { enabled: true, budgetTokens: 2048 },
      disableTools: true,
      disableInternalFallback: true,
    })
    .catch(() => undefined);
  const sent = firstRequestBody();
  assert(
    typeof sent.thinking === "object" && sent.thinking !== null,
    "the Vertex Claude request did not enable thinking, so this measured nothing",
  );
  assert(
    !("temperature" in sent) && !("top_p" in sent),
    "a Vertex Claude thinking request still carries temperature or top_p",
  );
});

h1.close();
h2.close();
await runSuite();
