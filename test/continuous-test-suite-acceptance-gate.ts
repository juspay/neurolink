#!/usr/bin/env tsx
/**
 * Credential-free provider acceptance gate.
 *
 * Replaces the old 1,037-cell provider matrix, whose audit found 10 ways it
 * could report green without proving anything (tool cells that passed with
 * zero tool calls, no identity check, structured-output cells that checked
 * types instead of values, a harness that exited 0 on zero coverage, …).
 *
 * This gate runs at most 9 cells per (provider, pinned model), fail-fast,
 * cheapest first, against a LOCAL mock vendor server
 * (`test/helpers/acceptanceGateServer.ts`) — no real vendor calls, no real
 * API keys, ever. Every assertion is against an exact, falsifiable value the
 * mock exports, never a shape/type check. See
 * `docs/provider-integration/acceptance-gate.md` for the full write-up of
 * what each cell proves, coverage, and how to run this.
 *
 * Rule-15 compliance ("one module graph per suite"): everything below comes
 * from `../dist/*`, never `src/lib`. Catalog internals (which catalog
 * providers exist, their base-URL/api-key env var names, which one needs a
 * `computedBaseURL`) are NOT imported here directly — they come from
 * `test/helpers/providerMatrix.ts`, which already carries the Rule-15
 * exception (allow-listed in `eslint.config.js`) for that exact deep dist
 * import. `ProviderFactory` (cell 7) comes from the public `../dist/index.js`
 * barrel, which re-exports it — no deep import needed for that either.
 *
 * Credential-free by construction: `./helpers/credentialFreeEnv.js` is the
 * first import, so no `.env` is ever loaded, every credential-named
 * variable the shell exported is gone, and `HOME` is an empty temp directory
 * (no stored OAuth or cloud credential files) before the SDK initialises.
 * `main()` re-checks both after every import has run, and the CLI child in
 * cell 9 inherits the stripped environment.
 *
 * Run with: pnpm run test:acceptance-gate
 */
import {
  ISOLATED_HOME,
  credentialEnvNamesPresent,
} from "./helpers/credentialFreeEnv.js";
import { randomUUID } from "node:crypto";
import { homedir } from "node:os";
import { resolve } from "node:path";
import { z } from "zod";

import { NeuroLink, jsonSchema, ProviderFactory } from "../dist/index.js";
import type { GenerateResult, StreamResult } from "../dist/index.js";

import {
  PROVIDERS,
  CATALOG_BASE_URL_ROWS,
  CATALOG_COMPUTED_BASE_URL_IDS,
  CATALOG_PROVIDER_IDS,
  type ProviderEntry,
} from "./helpers/providerMatrix.js";
import {
  defineSuite,
  assert,
  assertEqual,
  assertIncludes,
  Skip,
  runCommand,
  tempDir,
  type ProcessResult,
  type SuiteHandle,
} from "./helpers/harness.js";
import { assertDistFresh } from "./helpers/distFreshness.js";
import {
  GATE_MARKERS,
  GATE_EXACT_VALUE,
  GATE_SERVER_MODEL_SUFFIX,
  GATE_STREAM_VALUE,
  GATE_STRUCTURED_VALUE,
  GATE_TOOL_NAME,
  GATE_TOOL_CONFIRM_PREFIX,
  GATE_THINKING_FULL,
  GATE_THINKING_ANSWER,
  GATE_EMBEDDING_VECTOR,
  startAcceptanceGateServer,
  type AcceptanceGateServer,
} from "./helpers/acceptanceGateServer.js";

// This suite drives the built CLI directly (cell 9), so a stale dist/cli
// bundle must fail loudly rather than silently test old code.
assertDistFresh({ entrypoints: ["dist/cli/index.js"] });

// Resolved once at import time (before cell 9 spawns the CLI with `cwd` set
// to a per-row temp $HOME) — a relative "dist/cli/index.js" arg would
// resolve against that temp cwd instead of the repo root and fail with
// MODULE_NOT_FOUND, which is exactly what an early run of this cell did.
const CLI_PATH = resolve("dist/cli/index.js");

// ---------------------------------------------------------------------------
// Row model
// ---------------------------------------------------------------------------

type GateProtocol = "openai" | "anthropic";

type GateRow = {
  provider: string;
  model: string;
  protocol: GateProtocol;
  capabilities: ProviderEntry;
  embeddingModel?: string;
  /**
   * Number of HTTP requests a single `nl.generate()` call makes against the
   * mock server for this row. Almost every provider makes exactly one; a
   * provider whose `ensureModelLimits()` performs its own network discovery
   * call before the real request (currently only `litellm`, via
   * `GET /model/info` — see `src/lib/providers/litellm/client.ts`) makes
   * more. litellm makes 3, not 2: NeuroLink constructs two separate
   * `LiteLLMProvider` instances per logical call, and each instance's
   * constructor independently fires its own discovery request; against this
   * fast local mock the two races are not deduped by the in-flight-promise
   * cache the way they would be against a slower real backend, so both land
   * on the wire, plus the one real chat-completions request. Cell 8 sizes
   * its dedicated ceiling off this so "the first call succeeds, the second
   * is rejected" stays true regardless of how many wire requests one
   * logical call needs — a ceiling smaller than this would reject a request
   * that is legitimately part of the FIRST call, not prove anything about
   * the second.
   */
  requestsPerCall: number;
  /** Env patch this row needs to redirect its provider at a mock server. */
  envFor: (server: AcceptanceGateServer) => Record<string, string>;
};

function buildRow(
  id: string,
  protocol: GateProtocol,
  envFor: (server: AcceptanceGateServer) => Record<string, string>,
  requestsPerCall = 1,
): GateRow {
  const capabilities = PROVIDERS[id];
  if (!capabilities) {
    throw new Error(
      `acceptance-gate: provider "${id}" is not present in providerMatrix.PROVIDERS`,
    );
  }
  return {
    provider: id,
    model: capabilities.defaultModel,
    protocol,
    capabilities,
    embeddingModel: capabilities.embeddingModel,
    requestsPerCall,
    envFor,
  };
}

const FAKE_KEY = "gate-fake-key-not-a-real-credential";

// Hand-written OpenAI-compatible providers whose base URL is redirectable
// through a documented env override. envVars confirmed against each
// provider's own client.ts (see docs/provider-integration/acceptance-gate.md
// "Coverage" section for the citations).
const HAND_OPENAI_ROWS: Array<{
  id: string;
  apiKeyEnvVar?: string;
  baseURLEnvVar: string;
  /** See `GateRow.requestsPerCall`. Omitted means the default of 1. */
  requestsPerCall?: number;
}> = [
  {
    id: "openai",
    apiKeyEnvVar: "OPENAI_API_KEY",
    baseURLEnvVar: "OPENAI_BASE_URL",
  },
  {
    id: "openai-compatible",
    apiKeyEnvVar: "OPENAI_COMPATIBLE_API_KEY",
    baseURLEnvVar: "OPENAI_COMPATIBLE_BASE_URL",
  },
  {
    id: "openrouter",
    apiKeyEnvVar: "OPENROUTER_API_KEY",
    baseURLEnvVar: "OPENROUTER_BASE_URL",
  },
  { id: "ollama", baseURLEnvVar: "OLLAMA_BASE_URL" },
  // litellm's generate() awaits ensureModelLimits() first, which issues its
  // own GET /model/info discovery request before the real chat-completions
  // call. NeuroLink additionally constructs two separate LiteLLMProvider
  // instances per logical nl.generate() call, and each instance's constructor
  // independently fires its own fire-and-forget ensureLiteLLMModelLimits()
  // call; against a real (slower) backend that second call's discovery
  // request would normally be deduped by the module-level in-flight-promise
  // cache, but against this fast local mock the first discovery request can
  // complete (and fail, since the mock has no /model/info handler) before the
  // second instance's call reuses it, so the dedup misses and a second
  // discovery request fires too — 3 wire requests per nl.generate(), not 1
  // (see GateRow.requestsPerCall).
  { id: "litellm", baseURLEnvVar: "LITELLM_BASE_URL", requestsPerCall: 3 },
  {
    id: "nvidia-nim",
    apiKeyEnvVar: "NVIDIA_NIM_API_KEY",
    baseURLEnvVar: "NVIDIA_NIM_BASE_URL",
  },
  { id: "lm-studio", baseURLEnvVar: "LM_STUDIO_BASE_URL" },
  { id: "llamacpp", baseURLEnvVar: "LLAMACPP_BASE_URL" },
  {
    id: "cohere",
    apiKeyEnvVar: "COHERE_API_KEY",
    baseURLEnvVar: "COHERE_BASE_URL",
  },
];

// Catalog providers whose baseURL is a plain env override — everything
// except cloudflare (computedBaseURL, see providerMatrix.ts), which is
// listed in PROVIDERS_NOT_COVERED instead.
const GATE_ROWS: GateRow[] = [
  ...HAND_OPENAI_ROWS.map((r) =>
    buildRow(
      r.id,
      "openai",
      (server) => ({
        ...(r.apiKeyEnvVar ? { [r.apiKeyEnvVar]: FAKE_KEY } : {}),
        [r.baseURLEnvVar]: server.openaiBaseURL,
      }),
      r.requestsPerCall,
    ),
  ),
  buildRow("azure", "openai", (server) => ({
    AZURE_OPENAI_API_KEY: FAKE_KEY,
    AZURE_OPENAI_ENDPOINT: server.origin,
    AZURE_OPENAI_MODEL: PROVIDERS.azure.defaultModel,
  })),
  buildRow("anthropic", "anthropic", (server) => ({
    ANTHROPIC_API_KEY: FAKE_KEY,
    ANTHROPIC_BASE_URL: server.anthropicBaseURL,
  })),
  ...CATALOG_BASE_URL_ROWS.map((r) =>
    buildRow(r.id, "openai", (server) => ({
      [r.apiKeyEnvVar]: FAKE_KEY,
      [r.baseURLEnvVar]: server.openaiBaseURL,
    })),
  ),
];

// Loud guard: a row referencing a provider id not actually in the built
// catalog would silently under-cover — same regression class providerMatrix
// already guards against for PROVIDERS itself.
for (const catalogId of CATALOG_PROVIDER_IDS) {
  if (CATALOG_COMPUTED_BASE_URL_IDS.includes(catalogId)) {
    continue;
  }
  if (!GATE_ROWS.some((row) => row.provider === catalogId)) {
    throw new Error(
      `acceptance-gate: catalog provider "${catalogId}" is not a computedBaseURL ` +
        `provider but is missing from GATE_ROWS — coverage regression`,
    );
  }
}

/**
 * Providers NOT covered by this gate, with the reason. No silent caps: every
 * provider in PROVIDERS not present in GATE_ROWS must be listed here, and
 * the guard below fails the suite if one is missing.
 */
const PROVIDERS_NOT_COVERED: Array<{ provider: string; reason: string }> = [
  {
    provider: "vertex",
    reason:
      "Google Cloud signed-request client (service account / ADC), not a plain bearer-token HTTP call — no documented base-URL override for the wire host, and its credentials cannot be faked with a static string.",
  },
  {
    provider: "google-ai",
    reason:
      "Speaks Google's Gemini wire protocol, a different request/response framing from both OpenAI-compatible chat completions and the Anthropic Messages API — not one of the two protocol families this gate's mock server implements.",
  },
  {
    provider: "bedrock",
    reason:
      "AWS SigV4-signed requests via the AWS SDK, not a plain bearer-token HTTP call — credentials cannot be faked with a static string and there is no base-URL override.",
  },
  {
    provider: "sagemaker",
    reason:
      "Same as bedrock: AWS SigV4-signed requests via the AWS SDK, not redirectable through a base-URL env override with fake credentials.",
  },
  {
    provider: "cloudflare",
    reason:
      "Catalog entry declares a baseURLTemplate with a hardcoded api.cloudflare.com host; only the {accountId} path segment is overridable via CLOUDFLARE_ACCOUNT_ID, not the host itself, so it cannot be redirected to a local mock.",
  },
  {
    provider: "voyage",
    reason:
      "Embeddings-only API (text: false) — no chat-completion endpoint for cells 1-3 (identity, exact-output, streaming) to exercise, and its embeddings wire shape is a custom protocol this gate's mock does not implement.",
  },
  {
    provider: "jina",
    reason:
      "Embeddings/reranking-only API (text: false) — same reasoning as voyage: no chat surface for cells 1-3, custom embeddings protocol not implemented by this mock.",
  },
  {
    provider: "stability",
    reason:
      "Image-generation-only API (text: false) — no chat-completion surface for cells 1-3, and image generation is out of scope for this gate.",
  },
  {
    provider: "ideogram",
    reason:
      "Image-generation-only API (text: false) — same reasoning as stability.",
  },
  {
    provider: "recraft",
    reason:
      "Image-generation-only API (text: false) — same reasoning as stability.",
  },
  {
    provider: "replicate",
    reason:
      "Predictions API (poll-based, streaming: false) is a custom protocol distinct from OpenAI-compatible chat completions and the Anthropic Messages API — not implemented by this gate's mock.",
  },
  {
    provider: "typesafe",
    reason:
      "Decide-only inference (SystemOneDecisionProvider) — every text/streaming/tool/structured-output capability is false; it emits no text at all, so none of cells 1-9 have a surface to exercise.",
  },
  {
    provider: "laya",
    reason:
      "Decide-only inference, like typesafe — no text-generation surface for any of cells 1-9.",
  },
  {
    provider: "xor",
    reason:
      "Decide-only inference (XorProvider extends SystemOneDecisionProvider, like typesafe and laya) — no text-generation surface for any of cells 1-9.",
  },
];

for (const providerId of Object.keys(PROVIDERS)) {
  const covered = GATE_ROWS.some((row) => row.provider === providerId);
  const explained = PROVIDERS_NOT_COVERED.some(
    (p) => p.provider === providerId,
  );
  if (!covered && !explained) {
    throw new Error(
      `acceptance-gate: provider "${providerId}" is neither covered by GATE_ROWS ` +
        `nor explained in PROVIDERS_NOT_COVERED — silent coverage gap`,
    );
  }
}

// ---------------------------------------------------------------------------
// Env scoping helper
// ---------------------------------------------------------------------------

async function withEnv<T>(
  patch: Record<string, string>,
  fn: () => Promise<T>,
): Promise<T> {
  const original: Record<string, string | undefined> = {};
  for (const key of Object.keys(patch)) {
    original[key] = process.env[key];
    process.env[key] = patch[key];
  }
  try {
    return await fn();
  } finally {
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Fail-fast-per-row cell wrapper
// ---------------------------------------------------------------------------

type RowState = { failed: boolean };

async function runCell(
  test: SuiteHandle["test"],
  state: RowState,
  name: string,
  fn: () => Promise<void>,
): Promise<void> {
  await test(name, async () => {
    if (state.failed) {
      throw new Skip("earlier cell in this row already failed — fail-fast");
    }
    try {
      await fn();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const isSkip = err instanceof Skip || msg.startsWith("SKIP:");
      if (!isSkip) {
        state.failed = true;
        // This gate's whole premise is "no real vendor calls, ever" (see
        // docs/provider-integration/acceptance-gate.md), so any non-Skip
        // error here is a hard bug — a broken mock redirection, a provider
        // ignoring the base-URL override, wrong env-var precedence, a typo
        // — never a live-network flake. The shared harness's test()
        // (test/helpers/harness.ts) independently re-classifies the
        // re-thrown error as SKIP whenever its message matches
        // isExpectedProviderError() (ECONNREFUSED, HTTP 401, "invalid api
        // key", …) — exactly the shape this call would produce if a broken
        // redirection let it reach a real vendor host with the fake key.
        // Re-throw under a fixed, fully-controlled message that never
        // embeds the raw (possibly vendor-shaped) text, so it can never
        // coincidentally match that live-suite heuristic. The raw error is
        // logged immediately below for triage.
        console.error(`[acceptance-gate] ${name} — raw error:`, msg);
        throw new Error(
          `ACCEPTANCE_GATE_FAIL: ${name} — non-Skip error in a mock-only suite that makes no live vendor calls; raw error logged above via console.error.`,
          { cause: err },
        );
      }
      throw err;
    }
  });
}

/**
 * The `model` field the SDK (or, for cell 9, the CLI subprocess) actually
 * put on the wire for the most recent request this server received —
 * ground truth for the identity assertions.
 *
 * Some providers legitimately normalize the model before the call: Ollama
 * defaults a bare tag to `:latest` (`llama3.2` -> `llama3.2:latest`),
 * Anthropic resolves a friendly alias to its dated snapshot (`claude-haiku-4-5`
 * -> `claude-haiku-4-5-20251001`) via `resolveProviderModelAlias`. Comparing
 * a result's `.model` against the raw human-typed `row.model` fails for
 * those rows even though nothing is wrong — the SDK is truthfully reporting
 * the model it actually used, which differs from what was typed by design.
 * Comparing against the wire request instead keeps the check an exact,
 * falsifiable equality (never "non-empty") while being correct for every
 * row, resolved or not — and it is a strictly *stronger* identity proof
 * than matching the typed string, since it still catches
 * `disableInternalFallback` silently rerouting to a different model.
 */
function lastRequestedModel(server: AcceptanceGateServer): string {
  const requests = server.getAllRequests();
  const last = requests[requests.length - 1];
  if (!last || typeof last.bodyJson !== "object" || last.bodyJson === null) {
    throw new Error(
      "acceptance-gate: no request with a JSON body was recorded on the mock server",
    );
  }
  const model = (last.bodyJson as { model?: unknown }).model;
  if (typeof model !== "string") {
    throw new Error(
      "acceptance-gate: the mock server's last request had no string model field",
    );
  }
  return model;
}

function accumulateStreamText(
  stream: StreamResult["stream"],
): Promise<{ content: string; reasoning: string }> {
  return (async () => {
    let content = "";
    let reasoning = "";
    for await (const chunk of stream) {
      if ("content" in chunk && typeof chunk.content === "string") {
        content += chunk.content;
      }
      if ("reasoning" in chunk && typeof chunk.reasoning === "string") {
        reasoning += chunk.reasoning;
      }
    }
    return { content, reasoning };
  })();
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const leakedCredentialNames = credentialEnvNamesPresent();
  if (leakedCredentialNames.length > 0) {
    throw new Error(
      `acceptance-gate: ${leakedCredentialNames.length} credential-named env var(s) survived the strip (${leakedCredentialNames.join(", ")}) — the gate is not credential-free`,
    );
  }
  if (homedir() !== ISOLATED_HOME) {
    throw new Error(
      "acceptance-gate: os.homedir() is not the isolated temp home, so stored credential files are reachable — the gate is not credential-free",
    );
  }

  const { test, runSuite } = defineSuite(
    "Credential-Free Provider Acceptance Gate",
  );

  // Generous ceiling: this shared server serves cells 1-7 and 9 across every
  // row, so it must never itself trip the budget-ceiling mechanism cell 8
  // exists to test — cell 8 always uses its own dedicated, low-ceiling
  // server (see below), never this one.
  const server = await startAcceptanceGateServer(1_000_000);
  const nl = new NeuroLink();

  await runSuite(async () => {
    try {
      for (const row of GATE_ROWS) {
        await withEnv(row.envFor(server), async () => {
          const state: RowState = { failed: false };
          const label = `[${row.provider}]`;

          // Cells 1+2 share one call: identity pin (provider/model echoed
          // back) and exact-output generate (equality, not "non-empty").
          await runCell(
            test,
            state,
            `${label} cell1+2: identity pin + exact-output generate`,
            async () => {
              const result: GenerateResult = await nl.generate({
                input: { text: GATE_MARKERS.EXACT },
                provider: row.provider,
                model: row.model,
                disableInternalFallback: true,
                disableTools: true,
              });
              assertEqual(
                result.provider,
                row.provider,
                `cell1 identity: result.provider did not match the requested provider`,
              );
              assertEqual(
                result.model,
                lastRequestedModel(server),
                `cell1 identity: result.model did not match the model actually sent on the wire`,
              );
              assertEqual(
                result.content.trim(),
                GATE_EXACT_VALUE,
                `cell2 exact-output: generate() content did not equal the exact expected value`,
              );
            },
          );

          // Cell 3: drained stream, identity asserted against what the
          // SERVER actually served (not just the request echoed back) for
          // openai-protocol rows — the defect this cell exists to catch.
          await runCell(
            test,
            state,
            `${label} cell3: drained stream, identity asserted`,
            async () => {
              const streamResult: StreamResult = await nl.stream({
                input: { text: GATE_MARKERS.STREAM },
                provider: row.provider,
                model: row.model,
                disableInternalFallback: true,
                disableTools: true,
              });
              const { content } = await accumulateStreamText(
                streamResult.stream,
              );
              assertEqual(
                content,
                GATE_STREAM_VALUE,
                `cell3 stream content did not equal the exact expected value`,
              );
              assertEqual(
                streamResult.provider,
                row.provider,
                `cell3 identity: StreamResult.provider did not match the requested provider`,
              );
              const requestedModel = lastRequestedModel(server);
              const expectedModel =
                row.protocol === "openai"
                  ? `${requestedModel}${GATE_SERVER_MODEL_SUFFIX}`
                  : requestedModel;
              assertEqual(
                streamResult.model,
                expectedModel,
                `cell3 identity: StreamResult.model did not report what the mock server actually served`,
              );
              // Analytics price the turn from this value, so it has to name the
              // served model too. Only providers that build their analytics from
              // the observed model are held to it; the rest report the requested
              // model and are not asserted here.
              if (row.protocol === "openai" && streamResult.analytics) {
                const analytics = await streamResult.analytics;
                assertEqual(
                  analytics.model,
                  expectedModel,
                  `cell3 identity: StreamResult.analytics.model did not report what the mock server actually served`,
                );
              }
            },
          );

          // Cell 4: tool-nonce proof, gated on the row's declared tools
          // capability.
          if (!row.capabilities.tools) {
            await test(`${label} cell4: tool-nonce proof`, async () => {
              throw new Skip(
                `${row.provider} does not declare the "tools" capability`,
              );
            });
          } else {
            await runCell(
              test,
              state,
              `${label} cell4: tool-nonce proof`,
              async () => {
                const nonce = randomUUID();
                const result: GenerateResult = await nl.generate({
                  input: { text: GATE_MARKERS.TOOL },
                  provider: row.provider,
                  model: row.model,
                  disableInternalFallback: true,
                  maxSteps: 3,
                  tools: {
                    [GATE_TOOL_NAME]: {
                      description:
                        "Returns an unguessable nonce; the acceptance gate proves a real tool call happened by finding it in the final answer.",
                      inputSchema: jsonSchema<Record<string, never>>({
                        type: "object",
                        properties: {},
                      }),
                      execute: async () => ({ nonce }),
                    },
                  },
                });
                assertIncludes(
                  result.content,
                  `${GATE_TOOL_CONFIRM_PREFIX}${nonce}`,
                  `cell4 tool-nonce: final answer did not confirm the exact nonce the tool returned`,
                );
              },
            );
          }

          // Cell 5: structured-exact, gated on the row's declared
          // structuredOutput capability. Equality on the parsed value, not a
          // type/shape check, and truncation must be surfaced.
          if (!row.capabilities.structuredOutput) {
            await test(`${label} cell5: structured-exact`, async () => {
              throw new Skip(
                `${row.provider} does not declare the "structuredOutput" capability`,
              );
            });
          } else {
            await runCell(
              test,
              state,
              `${label} cell5: structured-exact`,
              async () => {
                const schema = z.object({
                  status: z.string(),
                  count: z.number(),
                  tag: z.string(),
                });
                const result: GenerateResult = await nl.generate({
                  input: { text: GATE_MARKERS.STRUCTURED },
                  provider: row.provider,
                  model: row.model,
                  disableInternalFallback: true,
                  disableTools: true,
                  schema,
                });
                assert(
                  result.jsonTruncated !== true,
                  `cell5 structured-exact: structured output was truncated (jsonTruncated=true)`,
                );
                assertEqual(
                  JSON.stringify(result.structuredData),
                  JSON.stringify(GATE_STRUCTURED_VALUE),
                  `cell5 structured-exact: parsed structuredData did not equal the exact expected value`,
                );
              },
            );
          }

          // Cell 6: thinking proof, gated on the row's declared thinking
          // capability. Drives stream() with an explicit thinkingConfig —
          // the SDK path requires the full { enabled, budgetTokens } object;
          // a bare thinkingLevel field is a CLI-only convenience
          // (src/lib/utils/thinkingConfig.ts) that nothing on the SDK path
          // converts. Accumulates BOTH reasoning deltas so a consumer that
          // replaces rather than accumulates cannot pass.
          if (!row.capabilities.thinking) {
            await test(`${label} cell6: thinking proof`, async () => {
              throw new Skip(
                `${row.provider} does not declare the "thinking" capability`,
              );
            });
          } else {
            await runCell(
              test,
              state,
              `${label} cell6: thinking proof`,
              async () => {
                const streamResult: StreamResult = await nl.stream({
                  input: { text: GATE_MARKERS.THINKING },
                  provider: row.provider,
                  model: row.model,
                  disableInternalFallback: true,
                  disableTools: true,
                  thinkingConfig: { enabled: true, budgetTokens: 2048 },
                });
                const { content, reasoning } = await accumulateStreamText(
                  streamResult.stream,
                );
                assertEqual(
                  reasoning,
                  GATE_THINKING_FULL,
                  `cell6 thinking proof: accumulated reasoning did not equal the exact expected value`,
                );
                assertEqual(
                  content,
                  GATE_THINKING_ANSWER,
                  `cell6 thinking proof: post-thinking answer did not equal the exact expected value`,
                );
              },
            );
          }

          // Cell 7: embeddings proof, gated on the row's declared embeddings
          // capability. Goes through ProviderFactory directly (NeuroLink has
          // no embed() method) — equality on the exact vector, not
          // "non-empty array".
          if (!row.capabilities.embeddings) {
            await test(`${label} cell7: embeddings proof`, async () => {
              throw new Skip(
                `${row.provider} does not declare the "embeddings" capability`,
              );
            });
          } else {
            await runCell(
              test,
              state,
              `${label} cell7: embeddings proof`,
              async () => {
                const embeddingModel = row.embeddingModel ?? row.model;
                const provider = (await ProviderFactory.createProvider(
                  row.provider,
                  embeddingModel,
                )) as unknown as { embed: (text: string) => Promise<number[]> };
                const vector = await provider.embed("hello world");
                assertEqual(
                  JSON.stringify(vector),
                  JSON.stringify(GATE_EMBEDDING_VECTOR),
                  `cell7 embeddings proof: embed() vector did not equal the exact expected value`,
                );
              },
            );
          }

          // Cell 8: budget ceiling enforced, per run — a dedicated mock
          // server proves the ceiling mechanism itself is real and
          // falsifiable (a call past it must fail), independent of the
          // shared server every other cell uses. The ceiling is sized to
          // this row's requestsPerCall (almost always 1) so a provider that
          // legitimately makes more than one wire request per logical
          // nl.generate() call (litellm's /model/info discovery) still gets
          // "first call fully succeeds, second call is rejected" rather
          // than being tripped mid-way through its own first call.
          await runCell(
            test,
            state,
            `${label} cell8: budget ceiling enforced`,
            async () => {
              const ceiling = row.requestsPerCall;
              const ceilingServer = await startAcceptanceGateServer(ceiling);
              try {
                await withEnv(row.envFor(ceilingServer), async () => {
                  await nl.generate({
                    input: { text: GATE_MARKERS.EXACT },
                    provider: row.provider,
                    model: row.model,
                    disableInternalFallback: true,
                    disableTools: true,
                  });
                  let ceilingRejected = false;
                  try {
                    await nl.generate({
                      input: { text: GATE_MARKERS.EXACT },
                      provider: row.provider,
                      model: row.model,
                      disableInternalFallback: true,
                      disableTools: true,
                    });
                  } catch {
                    ceilingRejected = true;
                  }
                  assert(
                    ceilingRejected,
                    `cell8 budget ceiling: a call past the ceiling did not fail`,
                  );
                  assert(
                    ceilingServer.requestCount() >= ceiling + 1,
                    `cell8 budget ceiling: the dedicated server did not observe the second call's request`,
                  );
                });
              } finally {
                await ceilingServer.close();
              }
            },
          );

          // Cell 9: CLI parity — the same assertions through the built CLI
          // (node dist/cli/index.js), not a separate re-derivation. Gap:
          // the CLI's generate/stream commands have no flag that reaches
          // disableInternalFallback (commandFactory.ts's processOptions()
          // whitelist omits it; it exists only in the interactive REPL's
          // separate optionsSchema.ts) — documented in
          // docs/provider-integration/acceptance-gate.md. The child's
          // environment is the stripped one plus this row's fake key, so even
          // a fallback to another provider would hold no real credential.
          await runCell(test, state, `${label} cell9: CLI parity`, async () => {
            const home = tempDir("neurolink-acceptance-gate-");
            const cliResult: ProcessResult = await runCommand(
              "node",
              [
                CLI_PATH,
                "generate",
                GATE_MARKERS.EXACT,
                "--provider",
                row.provider,
                "--model",
                row.model,
                "--quiet",
                "--disableTools",
                "--format",
                "json",
              ],
              {
                cwd: home,
                env: {
                  ...process.env,
                  ...row.envFor(server),
                  HOME: home,
                  NEUROLINK_SKIP_MCP: "true",
                  NEUROLINK_DISABLE_BUILTIN_TOOLS: "true",
                } as NodeJS.ProcessEnv,
                timeoutMs: 60_000,
              },
            );
            assertEqual(
              cliResult.exitCode,
              0,
              `cell9 CLI parity: built CLI exited non-zero`,
            );
            let parsed: { provider?: string; model?: string; content?: string };
            try {
              parsed = JSON.parse(cliResult.stdout) as typeof parsed;
            } catch {
              throw new Error(
                `cell9 CLI parity: CLI stdout was not valid JSON`,
              );
            }
            assertEqual(
              parsed.provider,
              row.provider,
              `cell9 CLI parity: CLI-reported provider did not match the requested provider`,
            );
            assertEqual(
              parsed.model,
              lastRequestedModel(server),
              `cell9 CLI parity: CLI-reported model did not match the model actually sent on the wire`,
            );
            assertEqual(
              (parsed.content ?? "").trim(),
              GATE_EXACT_VALUE,
              `cell9 CLI parity: CLI content did not equal the exact expected value`,
            );
          });
        });
      }
    } finally {
      await server.close();
    }
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
