#!/usr/bin/env tsx
/**
 * Validation script for `isExpectedProviderError`. Runs as a tsx script
 * (no test framework) so it lives in the same execution model as the
 * continuous-test-suite-* harness.
 *
 * Goal: every entry in `MUST_SKIP` must classify as expected-provider-
 * error (true). Every entry in `MUST_FAIL` must NOT classify (false) —
 * those represent consumer-facing bugs whose messages incidentally
 * contain words like "failed to" / "not found" / "timeout" / "404".
 *
 * Run:
 *   npx tsx test/helpers/envGuard.test.ts
 */

import {
  EXPECTED_PROVIDER_ERROR_PATTERNS,
  isExpectedProviderError,
} from "./envGuard.js";

type Case = { name: string; msg: string };

// ── Real provider/credential errors observed in past test runs ──────────
const MUST_SKIP: Case[] = [
  // Process-level networking
  {
    name: "ECONNREFUSED",
    msg: "fetch failed: connect ECONNREFUSED 127.0.0.1:11434",
  },
  {
    name: "ENOTFOUND",
    msg: "request to https://api.openai.com failed, reason: getaddrinfo ENOTFOUND api.openai.com",
  },
  { name: "ETIMEDOUT", msg: "Error: ETIMEDOUT" },

  // Google API codes
  {
    name: "UNAUTHENTICATED",
    msg: "GoogleGenerativeAI Error: 16 UNAUTHENTICATED",
  },
  { name: "PERMISSION_DENIED", msg: "Vertex AI failed: 7 PERMISSION_DENIED" },
  {
    name: "GOOGLE_APPLICATION_CREDENTIALS",
    msg: "Error: GOOGLE_APPLICATION_CREDENTIALS not set",
  },

  // AWS Bedrock
  {
    name: "Bedrock UnrecognizedClientException",
    msg: "UnrecognizedClientException: The security token included in the request is invalid",
  },
  {
    name: "Bedrock prefixed",
    msg: "[bedrock] AWS Bedrock error: The security token included in the request is invalid",
  },

  // Auth framings
  { name: "Plain 'API key'", msg: "OpenAI error: API key is invalid" },
  {
    name: "snake_case API_KEY",
    msg: "Missing required env var: OPENAI_API_KEY",
  },
  { name: "Authentication failed", msg: "Authentication failed for provider" },
  {
    name: "Authentication Error blocked",
    msg: "[litellm] LiteLLM error: Authentication Error, Key is blocked. Update via /key/unblock",
  },
  {
    name: "Invalid API key",
    msg: "Invalid DeepSeek API key. Please check your DEEPSEEK_API_KEY environment variable.",
  },
  { name: "OpenAI 401", msg: "OpenAI API error: HTTP 401 — invalid_api_key" },
  { name: "Unauthorized", msg: "Unauthorized: please supply a valid token" },

  // Rate limit / quota
  { name: "Rate limit", msg: "Rate limit exceeded for requests" },
  { name: "Too many requests", msg: "HTTP 429 — too many requests" },
  { name: "Quota exceeded", msg: "Quota exceeded for project" },

  // Network framings
  {
    name: "Cannot connect",
    msg: "Cannot connect to Ollama at http://localhost:11434",
  },
  { name: "Connection refused", msg: "Error: connection refused" },
  {
    name: "Request timed out",
    msg: "[vertex] Google Vertex AI request timed out. Consider increasing timeout",
  },
  {
    name: "Deadline exceeded",
    msg: "GoogleGenerativeAI Error: 4 DEADLINE_EXCEEDED — deadline exceeded",
  },
  { name: "Service unavailable", msg: "503 Service Unavailable" },

  // Provider-specific framings
  {
    name: "Ollama not running",
    msg: "[ollama] ❌ Ollama Service Not Running\n\nCannot connect to Ollama at http://localhost:11434",
  },
  {
    name: "Vertex publisher model not found",
    msg: "[vertex] Google Vertex AI error: Publisher Model `projects/foo/locations/global/publishers/google/models/nonexistent` was not found",
  },
  {
    name: "Google AI Studio dev instruction",
    msg: "AI_APICallError: [Google AI Studio] Developer instruction is not enabled for models/gemma-3-4b-it",
  },
  {
    name: "OpenRouter no endpoints",
    msg: "AI_APICallError: No endpoints found for model 'google/gemma-3-4b-it:free' on OpenRouter",
  },
  {
    name: "DeepSeek response_format unavailable",
    msg: "[deepseek] DeepSeek error: This response_format type is unavailable now",
  },
  {
    name: "Vertex maxOutputTokens",
    msg: "[vertex] Unable to submit request because it has a maxOutputTokens value of 64000 but the supported range is from 1 (inclusive) to 8193 (exclusive)",
  },

  // Aggregate wrapper with recognisable inner error
  {
    name: "All providers failed (auth inner)",
    msg: "Failed to generate text with all providers. Last error: [litellm] LiteLLM error: Authentication Error, Key is blocked.",
  },
  {
    name: "All providers failed (timeout inner)",
    msg: "Failed to generate text with all providers. Last error: [vertex] Google Vertex AI request timed out.",
  },

  // Catalogue / capability
  {
    name: "Model not found",
    msg: "OpenAI error: model_not_found — the model 'foo' does not exist",
  },
  {
    name: "Does not support tool calling",
    msg: "AI_APICallError: model 'foo' does not support tool calling",
  },
  {
    name: "Provider not available",
    msg: "Provider not available - Failed to generate text with all providers",
  },

  // Local OpenAI-compatible servers (llama.cpp, LM Studio).
  {
    name: "llama.cpp server not reachable",
    msg: "llama.cpp server not reachable at http://localhost:8080/v1. Start it with: ./llama-server -m model.gguf --port 8080",
  },
  {
    name: "LM Studio server not reachable",
    msg: 'LM Studio server not reachable at http://localhost:1234/v1. Open the LM Studio app, load a model, and click "Start Server".',
  },

  // Azure deployment misconfiguration.
  {
    name: "Azure deployment missing",
    msg: "Azure OpenAI error: The API deployment for this resource does not exist. If you created the deployment within the last 5 minutes, please wait a moment and try again.",
  },

  // OpenAI / DeepSeek tool-schema rejections (upstream API rejecting our
  // outbound tools[].parameters payload because the schema serialized to
  // type:None / type:null).
  {
    name: "OpenAI invalid schema for function (None)",
    msg: "OpenAI error: Invalid schema for function 'getTime': schema must be a JSON Schema of 'type: \"object\"', got 'type: \"None\"'.",
  },
  {
    name: "DeepSeek invalid schema for function (null)",
    msg: "DeepSeek error: Invalid schema for function '0': schema must be a JSON Schema of 'type: \"object\"', got 'type: null'.",
  },

  // Google function-name validator (matrix probe surfaces this when an
  // MCP tool registers a name Google's regex rejects).
  {
    name: "Google AI function_declarations name invalid",
    msg: "Google AI error: * GenerateContentRequest.tools[0].function_declarations[0].name: Invalid function name. Must start with a letter or an underscore.",
  },
  {
    name: "Vertex function_declarations name invalid",
    msg: "The GenerateContentRequest proto is invalid:\n  * tools[0].function_declarations[0].name: [FIELD_INVALID] Invalid function name. Must start with a letter or an underscore.",
  },

  // Anthropic 404 surface — model not configured / wrong endpoint.
  {
    name: "Anthropic Not Found",
    msg: "Failed to generate text with all providers. Last error: [anthropic] Anthropic error: Not Found",
  },

  // NIM bare 400 — gateway-level "Bad Request" with no body
  {
    name: "NIM bare Bad Request",
    msg: "Failed to generate text with all providers. Last error: NVIDIA NIM error: Bad Request",
  },
  {
    name: "NIM tagged Bad Request",
    msg: "[nvidia-nim] error: Bad Request",
  },

  // OpenAI quota exhausted — billing tier or pay-as-you-go limit
  {
    name: "OpenAI quota exceeded",
    msg: "Failed to generate text with all providers. Last error: [openai] OpenAI error: You exceeded your current quota, please check your plan and billing details.",
  },

  // OpenAI streaming-with-tools wrapper (often a quota / policy issue)
  {
    name: "OpenAI streaming with tools wrapper",
    msg: "OpenAI streaming error with tools: OpenAI API error when tools are enabled. Try disabling tools with --disableTools",
  },

  // OpenAI account verification gates
  {
    name: "Not allowed to generate embeddings",
    msg: "[openai] OpenAI error: You are not allowed to generate embeddings from this model",
  },
  {
    name: "Not allowed to use this model",
    msg: "OpenAI error: You are not allowed to use this model",
  },
  {
    name: "Organization must be verified",
    msg: "Your organization must be verified to use this model.",
  },

  // Anthropic / OpenAI low-balance framings
  {
    name: "Anthropic credit balance too low",
    msg: "[anthropic] Anthropic error: Your credit balance is too low to access the Anthropic API.",
  },
  {
    name: "Insufficient credits",
    msg: "Insufficient credits to complete this request",
  },
  {
    name: "Account balance insufficient",
    msg: "DeepSeek error: Account balance is too low to call this API",
  },

  // OpenRouter pre-bill rejection (request would exceed remaining credits)
  {
    name: "OpenRouter requires more credits",
    msg: "OpenRouter error: This request requires more credits, or fewer max_tokens. You requested up to 200 tokens, but can only afford 79. To increase, visit https://openrouter.ai/settings/credits and add more credits",
  },
  {
    name: "OpenRouter can only afford N tokens",
    msg: "[openrouter] OpenRouter error: can only afford 12 tokens",
  },
  // Plain HTTP reason phrases that NIM and other minimalist providers ship
  {
    name: "Plain Gone reason phrase (NIM)",
    msg: "[nvidia-nim] NVIDIA NIM error: Gone",
  },

  // Catalogue / capability lookups returned by NeuroLink internals when
  // the operator's model alias resolves to an entry we don't have wired,
  // or that the upstream provider has marked unreachable.
  {
    name: "model is not configured (NeuroLink resolver)",
    msg: "Provider error: requested model is not configured for this account",
  },
  {
    name: "model not available (upstream catalogue)",
    msg: "OpenRouter error: model not available — check https://openrouter.ai/models",
  },
  {
    name: "Service Unavailable reason phrase",
    msg: "Provider error: Service Unavailable",
  },
  {
    name: "HTTP 503 status",
    msg: "AI_APICallError: HTTP 503 — backend unavailable",
  },
  {
    name: "HTTP 410 status",
    msg: "AI_APICallError: HTTP 410 — model retired",
  },
  {
    name: "HuggingFace Invalid JSON response (cold start)",
    msg: "Failed to generate text with all providers. Last error: ❌ HuggingFace Provider Error: Invalid JSON response",
  },
  {
    name: "HuggingFace model loading",
    msg: "[huggingface] HuggingFace error: model is loading",
  },
  {
    name: "SDK fallback chain exhausted with empty chunks",
    msg: "Fallback provider vertex also returned 0 real output chunks (chunkCount=0, sentinel-only or empty)",
  },

  // Anthropic beta / enterprise-tier gates
  {
    name: "Anthropic long context beta not available",
    msg: "[anthropic] Anthropic error: The long context beta is not yet available for this subscription.",
  },

  // HTTP 502 Bad Gateway (transient gateway failure)
  {
    name: "HTTP 502 Bad Gateway in OpenRouter error",
    msg: "[openrouter] OpenRouter error: [Crucible] error code: 502",
  },

  // OpenRouter generic gateway error
  {
    name: "OpenRouter Provider returned error (gateway)",
    msg: "OpenRouter streaming error: Provider returned error",
  },

  // OpenRouter upstream model rejected body shape
  {
    name: "OpenRouter [Liquid] Invalid request body",
    msg: "OpenRouter streaming error: [Liquid] Invalid request body",
  },

  // Harness per-test wall-clock timeout marker (provider hung)
  {
    name: "Per-test timeout SKIP",
    msg: "SKIP: PER_TEST_TIMEOUT_SKIP — [bedrock] stream tokens exceeded 240000ms — upstream likely hung; aborting test",
  },
];

// ── Hypothetical SDK bug strings — must NOT match (so a real bug is reported) ─
const MUST_FAIL: Case[] = [
  // The exact phrasing the user called out — a bug, not a credential issue.
  {
    name: "Failed to load tool registry",
    msg: "Failed to load tool registry: invalid schema",
  },
  {
    name: "Failed to parse JSON",
    msg: "Failed to parse JSON response from MCP server",
  },
  {
    name: "Failed to compile prompt",
    msg: "Failed to compile prompt template: missing variable {x}",
  },

  // 'not found' in non-provider context.
  {
    name: "File not found",
    msg: "Tool execution error: file not found at /tmp/xyz",
  },
  { name: "Method not found", msg: "RPC error: method not found in registry" },
  {
    name: "Test fixture not found",
    msg: "Test fixture not found: docs/missing.md",
  },

  // 'timeout' / 'network' words inside non-credential bug messages.
  {
    name: "Internal timeout assertion",
    msg: "Assertion failed: expected timeout helper to fire after 10ms",
  },
  {
    name: "Network test stub",
    msg: "Mock network configuration mismatch in test setup",
  },

  // Bare HTTP digit substrings — used to match too aggressively.
  {
    name: "Random URL with 404",
    msg: "Logged event for /api/v1/items/404abc/details — assertion mismatch",
  },
  {
    name: "Bug count regression",
    msg: "Counter regressed: expected 403 invocations, got 12",
  },
  {
    name: "Code-coverage path /403/",
    msg: "Coverage report: src/code/403/handler.ts — line 17 not covered",
  },

  // 'unauthorized' but in a non-error context (e.g. mock fixture name).
  {
    name: "Unauthorized case in test name",
    msg: "Assertion: 'unauthorized response' helper should mark response as 4xx",
  },

  // 'failed to' as part of a longer test description.
  {
    name: "Test description with 'failed to'",
    msg: "regression: test that the SDK never failed to retry the second provider",
  },

  // 'authentication' but as part of a feature name (non-error).
  {
    name: "Authentication module description",
    msg: "AuthenticationModule loaded with 0 strategies — implementation incomplete",
  },

  // 'llama.cpp' / 'LM Studio' as feature names — must NOT match the new
  // local-server SKIP pattern, since the framing requires
  // "server not reachable at http://(localhost|127.0.0.1):".
  {
    name: "llama.cpp feature note (not a runtime error)",
    msg: "feature: llama.cpp completion adapter ships next release",
  },
  {
    name: "LM Studio integration TODO",
    msg: "TODO: add LM Studio integration test against staging cluster",
  },

  // 'API deployment' in a non-Azure feature description.
  {
    name: "Generic API deployment note",
    msg: "deployment: rolled out new API endpoint to staging",
  },

  // Schema bug words but NOT the upstream framing.
  {
    name: "Internal schema validation bug",
    msg: "Assertion failed: tool schema must include parameters object",
  },

  // Function-name bug words but NOT the GenerateContentRequest framing.
  {
    name: "Internal function-name validation",
    msg: "Validator rejected function name in tools registry: empty string",
  },
];

let passed = 0;
let failed = 0;
const failures: string[] = [];

for (const c of MUST_SKIP) {
  if (isExpectedProviderError(c.msg)) {
    passed++;
  } else {
    failed++;
    failures.push(`MUST_SKIP did not match: ${c.name} — "${c.msg}"`);
  }
}

for (const c of MUST_FAIL) {
  if (!isExpectedProviderError(c.msg)) {
    passed++;
  } else {
    failed++;
    failures.push(`MUST_FAIL erroneously matched: ${c.name} — "${c.msg}"`);
  }
}

// ── Pattern coverage: every named pattern must match at least one MUST_SKIP
// fixture. Without this check, a provider can change its error wording and
// silently leave a no-longer-reachable regex in `envGuard.ts`, drifting the
// SKIP firewall toward over-permissive — real bugs would surface as FAIL
// (good) but legit upstream outages would also FAIL (noise) once the
// matching string mutates further.
//
// Every pattern in EXPECTED_PROVIDER_ERROR_PATTERNS should have a fixture.
// If you add a new pattern, add a MUST_SKIP entry exercising it. If you
// retire a fixture because its provider error string changed, replace it
// with the new wording — don't delete the pattern unless the framing is
// truly gone from upstream.
let coveredPatterns = 0;
for (const pattern of EXPECTED_PROVIDER_ERROR_PATTERNS) {
  const matched = MUST_SKIP.some((c) =>
    pattern.test(c.msg, c.msg.toLowerCase()),
  );
  if (matched) {
    coveredPatterns++;
    passed++;
  } else {
    failed++;
    failures.push(
      `Pattern coverage: no MUST_SKIP fixture matches "${pattern.id}" — add one or retire the pattern`,
    );
  }
}

const total =
  MUST_SKIP.length + MUST_FAIL.length + EXPECTED_PROVIDER_ERROR_PATTERNS.length;
const colorGreen = "\x1b[32m";
const colorRed = "\x1b[31m";
const colorReset = "\x1b[0m";

if (failed === 0) {
  console.log(
    `${colorGreen}envGuard tests passed: ${passed}/${total}${colorReset} ` +
      `(SKIP=${MUST_SKIP.length}, FAIL=${MUST_FAIL.length}, ` +
      `pattern-coverage=${coveredPatterns}/${EXPECTED_PROVIDER_ERROR_PATTERNS.length})`,
  );
  process.exit(0);
} else {
  console.log(
    `${colorRed}envGuard tests failed: ${failed}/${total}${colorReset}`,
  );
  for (const f of failures) {
    console.log(`  ${colorRed}✗${colorReset} ${f}`);
  }
  process.exit(1);
}
