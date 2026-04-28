#!/usr/bin/env tsx
import "dotenv/config";

/**
 * Continuous Test Suite: New Providers (DeepSeek, NVIDIA NIM, LM Studio, llama.cpp)
 *
 * Verifies that the four providers ported from free-claude-code work end-to-end
 * across Neurolink's full feature surface (generate, stream, tools, structured
 * output, reasoning, vision-where-supported, abort, timeout, per-call creds,
 * telemetry, error formatting).
 *
 * Each provider's tests SKIP cleanly when its env var (or local server) is
 * missing so this suite runs green in CI without credentials.
 *
 * Env vars consulted:
 *   DEEPSEEK_API_KEY        / TEST_DEEPSEEK_API_KEY
 *   NVIDIA_NIM_API_KEY      / TEST_NVIDIA_NIM_API_KEY
 *   LM_STUDIO_BASE_URL      / TEST_LM_STUDIO_BASE_URL  (default http://localhost:1234/v1)
 *   LLAMACPP_BASE_URL       / TEST_LLAMACPP_BASE_URL   (default http://localhost:8080/v1)
 *
 * Run with: npx tsx test/continuous-test-suite-new-providers.ts
 *
 * Targets the matrix in docs/provider-integration/08-feature-matrix.md.
 * Test IDs (A1, B2, etc.) match that doc one-to-one for traceability.
 */

import { NeuroLink } from "../dist/index.js";

// ============================================================
// LOGGING / RUNNER INFRASTRUCTURE
// (Mirrors the convention used across continuous-test-suite-*.ts)
// ============================================================

const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
} as const;
type ColorName = keyof typeof colors;

function log(message: string, color: ColorName = "reset"): void {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title: string): void {
  console.log(`\n${colors.cyan}${"=".repeat(70)}${colors.reset}`);
  log(`  ${title}`, "cyan");
  console.log(`${colors.cyan}${"=".repeat(70)}${colors.reset}\n`);
}

function logTest(
  name: string,
  status: "PASS" | "FAIL" | "SKIP" | "TESTING",
  detail?: string,
): void {
  const icons = {
    PASS: "✅",
    FAIL: "❌",
    SKIP: "⏭️",
    TESTING: "⚠️",
  };
  const statusColors: Record<string, ColorName> = {
    PASS: "green",
    FAIL: "red",
    SKIP: "yellow",
    TESTING: "blue",
  };
  log(`${icons[status]} ${name}`, statusColors[status]);
  if (detail) {
    log(`   ${detail}`, "dim");
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Provider-availability gate already SKIPs unconfigured providers up front, so
// for tests that *do* run we only want to downgrade transport-level / missing-
// configuration errors to SKIP — NOT auth/billing failures. A configured
// provider that suddenly returns 401/403/billing should FAIL the suite, not
// be silently skipped, otherwise CI can stay green over a broken integration.
const TRANSPORT_SKIP_PHRASES = [
  "cannot connect",
  "not configured",
  "econnrefused",
  "enotfound",
  "could not resolve",
  "no providers",
  "failed to fetch",
  "fetch failed",
  "server not reachable",
  "deepseek_api_key",
  "nvidia_nim_api_key",
  // LM Studio / llama.cpp connectivity phrases only —
  // bare "lm studio" was too broad and would mask real regressions.
  "lm studio server not reachable",
  "lm studio connection refused",
  "llama.cpp server not",
  "llama.cpp connection refused",
  "no model loaded",
  "model_not_found",
];
const AUTH_OR_BILLING_PHRASES = [
  "api key",
  "api_key",
  "authentication",
  "rate limit",
  "quota",
  "credentials",
  "permission denied",
  "billing",
  "unauthorized",
  "403",
  "429",
  "lm studio api key",
  "lm studio unauthorized",
];

function isExpectedProviderError(
  msg: string,
  provider?: ProviderUnderTest,
): boolean {
  const lower = msg.toLowerCase();
  if (TRANSPORT_SKIP_PHRASES.some((p) => lower.includes(p))) {
    return true;
  }
  // Auth/billing errors only count as expected when the provider isn't
  // marked available (i.e. we never expected it to authenticate). Once a
  // provider is marked available, an auth failure is a real regression.
  if (
    provider !== undefined &&
    !provider.available &&
    AUTH_OR_BILLING_PHRASES.some((p) => lower.includes(p))
  ) {
    return true;
  }
  return false;
}

// ============================================================
// PROVIDER AVAILABILITY GATES
// ============================================================

const DEEPSEEK_KEY =
  process.env.TEST_DEEPSEEK_API_KEY || process.env.DEEPSEEK_API_KEY || "";
const NIM_KEY =
  process.env.TEST_NVIDIA_NIM_API_KEY || process.env.NVIDIA_NIM_API_KEY || "";
const LM_STUDIO_URL =
  process.env.TEST_LM_STUDIO_BASE_URL ||
  process.env.LM_STUDIO_BASE_URL ||
  "http://localhost:1234/v1";
const LLAMACPP_URL =
  process.env.TEST_LLAMACPP_BASE_URL ||
  process.env.LLAMACPP_BASE_URL ||
  "http://localhost:8080/v1";
const LM_STUDIO_KEY =
  process.env.TEST_LM_STUDIO_API_KEY || process.env.LM_STUDIO_API_KEY || "";
const LLAMACPP_KEY =
  process.env.TEST_LLAMACPP_API_KEY || process.env.LLAMACPP_API_KEY || "";

type LocalServerProbe = { available: boolean; loadedModel?: string };

async function probeLocalServer(
  url: string,
  apiKey?: string,
): Promise<LocalServerProbe> {
  try {
    const target = `${url.replace(/\/$/, "")}/models`;
    const resp = await fetch(target, {
      headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : undefined,
      signal: AbortSignal.timeout(2000),
    });
    if (!resp.ok) {
      return { available: false };
    }
    const body = (await resp.json().catch(() => null)) as {
      data?: Array<{ id?: string }>;
    } | null;
    const loadedModel = body?.data?.find((m) => typeof m?.id === "string")?.id;
    return { available: true, loadedModel };
  } catch {
    return { available: false };
  }
}

const HAS_DEEPSEEK = Boolean(DEEPSEEK_KEY);
const HAS_NIM = Boolean(NIM_KEY);
const LM_STUDIO_PROBE = await probeLocalServer(LM_STUDIO_URL, LM_STUDIO_KEY);
const LLAMACPP_PROBE = await probeLocalServer(LLAMACPP_URL, LLAMACPP_KEY);

type ProviderUnderTest = {
  name: "deepseek" | "nvidia-nim" | "lm-studio" | "llamacpp";
  available: boolean;
  unavailableReason: string;
  // hint: which model has reasoning support
  reasoningModel?: string;
  // hint: which model has vision support
  visionModel?: string;
  // discovered model id reported by a local /v1/models probe
  loadedModel?: string;
  // hint: which model is fastest for smoke
  fastModel?: string;
};

const PROVIDERS: readonly ProviderUnderTest[] = [
  {
    name: "deepseek",
    available: HAS_DEEPSEEK,
    unavailableReason: "DEEPSEEK_API_KEY not set",
    reasoningModel: "deepseek-reasoner",
    fastModel: "deepseek-chat",
  },
  {
    name: "nvidia-nim",
    available: HAS_NIM,
    unavailableReason: "NVIDIA_NIM_API_KEY not set",
    reasoningModel: "nvidia/llama-3.3-nemotron-super-49b-v1",
    visionModel: "meta/llama-3.2-90b-vision-instruct",
    fastModel: "meta/llama-3.3-70b-instruct",
  },
  {
    name: "lm-studio",
    available: LM_STUDIO_PROBE.available,
    unavailableReason: `LM Studio server not reachable at ${LM_STUDIO_URL}`,
    loadedModel: LM_STUDIO_PROBE.loadedModel,
  },
  {
    name: "llamacpp",
    available: LLAMACPP_PROBE.available,
    unavailableReason: `llama-server not reachable at ${LLAMACPP_URL}`,
    loadedModel: LLAMACPP_PROBE.loadedModel,
  },
] as const;

const COOL_DOWN_MS = 1500;
const PER_TEST_TIMEOUT_MS = 60_000;

// ============================================================
// TEST RESULTS BOOKKEEPING
// ============================================================

type ProviderTotals = { pass: number; fail: number; skip: number };
const totals: Record<string, ProviderTotals> = {
  deepseek: { pass: 0, fail: 0, skip: 0 },
  "nvidia-nim": { pass: 0, fail: 0, skip: 0 },
  "lm-studio": { pass: 0, fail: 0, skip: 0 },
  llamacpp: { pass: 0, fail: 0, skip: 0 },
};

function record(
  provider: ProviderUnderTest["name"],
  result: boolean | null,
): void {
  if (result === true) {
    totals[provider].pass++;
  } else if (result === false) {
    totals[provider].fail++;
  } else {
    totals[provider].skip++;
  }
}

const failures: Array<{ provider: string; test: string; error: string }> = [];

async function runProviderTest(
  testId: string,
  provider: ProviderUnderTest,
  fn: (signal: AbortSignal) => Promise<boolean>,
  options: { requireAvailability?: boolean } = {},
): Promise<boolean | null> {
  const label = `[${provider.name}] ${testId}`;
  // Self-contained tests (e.g. K1 invalidKey, K2 unreachable) inject their
  // own credentials/baseURL, so they MUST run even when env-driven probe
  // marks the provider unavailable. Pass requireAvailability:false to opt in.
  if (options.requireAvailability !== false && !provider.available) {
    logTest(label, "SKIP", provider.unavailableReason);
    record(provider.name, null);
    return null;
  }
  logTest(label, "TESTING");
  // Drive the per-test timeout via AbortController so provider SDK calls
  // actually cancel when we give up — otherwise a slow generate()/stream()
  // keeps running in the background after the race is decided, burning
  // provider quota and interfering with later cases. Tests that compose
  // their own signals should pair `signal` with theirs via composeAbortSignals
  // (or just pass `signal` through as `abortSignal` on the SDK call).
  const ac = new AbortController();
  const timer = setTimeout(
    () => ac.abort(new Error(`timeout after ${PER_TEST_TIMEOUT_MS}ms`)),
    PER_TEST_TIMEOUT_MS,
  );
  try {
    const passed = await fn(ac.signal);
    if (passed) {
      logTest(label, "PASS");
      record(provider.name, true);
      return true;
    }
    logTest(label, "FAIL", "assertion returned false");
    record(provider.name, false);
    failures.push({
      provider: provider.name,
      test: testId,
      error: "assertion returned false",
    });
    return false;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (isExpectedProviderError(msg, provider)) {
      logTest(label, "SKIP", msg.slice(0, 100));
      record(provider.name, null);
      return null;
    }
    logTest(label, "FAIL", msg.slice(0, 160));
    record(provider.name, false);
    failures.push({ provider: provider.name, test: testId, error: msg });
    return false;
  } finally {
    clearTimeout(timer);
    if (provider.name === "deepseek" || provider.name === "nvidia-nim") {
      await sleep(COOL_DOWN_MS);
    }
  }
}

// ============================================================
// SHARED FIXTURES
// ============================================================

function makeSdk(): NeuroLink {
  return new NeuroLink();
}

const TINY_PROMPT = "Reply with the single word PONG and nothing else.";
const SHORT_PROMPT = "Say hi in 5 words.";

// Tiny 1x1 PNG used for vision tests when no real image is supplied
const TINY_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

// ============================================================
// SECTION 1 — CORE TEXT GENERATION (A1-A5)
// ============================================================

async function section1Core(): Promise<void> {
  logSection("SECTION 1 — Core (generate, stream, options)");

  for (const p of PROVIDERS) {
    // A1: generate basic
    await runProviderTest("A1 generate.basic", p, async (signal) => {
      const sdk = makeSdk();
      const res = await sdk.generate({
        input: { text: TINY_PROMPT },
        provider: p.name,
        abortSignal: signal,
        maxTokens: 16,
      });
      return Boolean(res?.content && res.content.length > 0);
    });

    // A2: maxTokens honored
    await runProviderTest("A2 generate.maxTokens", p, async (signal) => {
      const sdk = makeSdk();
      const res = await sdk.generate({
        input: { text: "Count slowly from 1 to 100." },
        provider: p.name,
        abortSignal: signal,
        maxTokens: 8,
      });
      // crude: should be short
      return Boolean(res?.content && res.content.length < 200);
    });

    // A3: temperature honored (smoke — just verifies request doesn't error)
    await runProviderTest("A3 generate.temperature", p, async (signal) => {
      const sdk = makeSdk();
      const res = await sdk.generate({
        input: { text: SHORT_PROMPT },
        provider: p.name,
        abortSignal: signal,
        temperature: 0.0,
        maxTokens: 24,
      });
      return Boolean(res?.content);
    });

    // A4: stream basic
    await runProviderTest("A4 stream.basic", p, async (signal) => {
      const sdk = makeSdk();
      const sr = await sdk.stream({
        input: { text: SHORT_PROMPT },
        provider: p.name,
        abortSignal: signal,
        maxTokens: 32,
      });
      const chunks: string[] = [];
      for await (const chunk of sr.stream) {
        if ("content" in chunk && chunk.content) {
          chunks.push(chunk.content);
        }
        if (chunks.length >= 30) {
          break;
        }
      }
      return chunks.length > 0;
    });

    // A5: stream completes within timeout
    await runProviderTest("A5 stream.completes", p, async (signal) => {
      const sdk = makeSdk();
      const sr = await sdk.stream({
        input: { text: TINY_PROMPT },
        provider: p.name,
        abortSignal: signal,
        maxTokens: 16,
        timeout: 30_000,
      });
      let total = "";
      for await (const chunk of sr.stream) {
        if ("content" in chunk && chunk.content) {
          total += chunk.content;
        }
      }
      return total.length > 0;
    });
  }
}

// ============================================================
// SECTION 2 — TOOLS (B1-B5)
// ============================================================

async function section2Tools(): Promise<void> {
  logSection("SECTION 2 — Tool calling (custom + MCP + disable)");

  // Lazily import zod so the suite degrades to SKIP if not installed.
  // Only B1 / B2 actually need zod (custom tools with Zod schemas);
  // B4 (tools.disable) just exercises the disableTools flag and works
  // without zod, so we DON'T early-return here — let B4 still run.
  let zodMod: typeof import("zod") | null = null;
  try {
    zodMod = await import("zod");
  } catch {
    log("   (zod not installed — B1/B2 will SKIP, B4 still runs)", "yellow");
  }

  for (const p of PROVIDERS) {
    if (zodMod === null) {
      logTest(`[${p.name}] B1 tools.generate.custom`, "SKIP", "zod missing");
      record(p.name, null);
      logTest(`[${p.name}] B2 tools.stream.custom`, "SKIP", "zod missing");
      record(p.name, null);
    }
  }

  if (zodMod !== null) {
    for (const p of PROVIDERS) {
      // B1: generate with custom tool
      await runProviderTest("B1 tools.generate.custom", p, async (signal) => {
        const sdk = makeSdk();
        let invoked = false;
        const tools = {
          get_weather: {
            description: "Returns weather for a city",
            inputSchema: zodMod!.z.object({ city: zodMod!.z.string() }),
            execute: async ({ city }: { city: string }) => {
              invoked = true;
              return { city, temperatureC: 22, conditions: "sunny" };
            },
          },
        };
        const res = await sdk.generate({
          input: {
            text: "What's the weather in Bangalore? Use the get_weather tool.",
          },
          provider: p.name,
          abortSignal: signal,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          tools: tools as any,
          maxTokens: 256,
        });
        // Prove the tool actually fired. Bare content alone passes a model
        // that ignored the tool definitions, masking a broken tool-calling
        // integration. Either tool execution or a tool-call surfaced via the
        // result counts.
        const toolCalls = (res as { toolCalls?: unknown[] })?.toolCalls;
        const toolsUsed = (res as { toolsUsed?: unknown[] })?.toolsUsed;
        return (
          invoked ||
          (Array.isArray(toolCalls) && toolCalls.length > 0) ||
          (Array.isArray(toolsUsed) && toolsUsed.length > 0)
        );
      });

      // B2: stream with custom tool
      await runProviderTest("B2 tools.stream.custom", p, async (signal) => {
        const sdk = makeSdk();
        let invoked = false;
        const tools = {
          get_time: {
            description: "Returns current ISO time",
            inputSchema: zodMod!.z.object({}),
            execute: async () => {
              invoked = true;
              return { iso: new Date().toISOString() };
            },
          },
        };
        const sr = await sdk.stream({
          input: { text: "Use get_time and tell me the hour." },
          provider: p.name,
          abortSignal: signal,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          tools: tools as any,
          maxTokens: 256,
        });
        for await (const _ of sr.stream) {
          /* drain */
        }
        // Wait briefly for the analytics promise (where toolCalls land) to
        // settle, then assert the tool was actually invoked. Returning true
        // unconditionally would mask a broken tool-calling integration.
        await new Promise((r) => setTimeout(r, 500));
        const analytics = await Promise.resolve(
          (sr as { analytics?: Promise<unknown> }).analytics,
        ).catch(() => undefined);
        const calls =
          (analytics as { toolCalls?: unknown[] })?.toolCalls ??
          (sr as { toolCalls?: unknown[] }).toolCalls;
        return invoked || (Array.isArray(calls) && calls.length > 0);
      });
    }
  }

  // B4 doesn't depend on zod (no custom Zod schema), so run it unconditionally
  // — even if zod is missing, the disableTools negative-test still has value.
  for (const p of PROVIDERS) {
    await runProviderTest("B4 tools.disable", p, async (signal) => {
      const sdk = makeSdk();
      const res = await sdk.generate({
        input: { text: TINY_PROMPT },
        provider: p.name,
        abortSignal: signal,
        disableTools: true,
        maxTokens: 16,
      });
      return Boolean(res?.content);
    });
  }
}

// ============================================================
// SECTION 3 — MULTIMODAL (C1-C4)
// (Image only on providers + models that support it)
// ============================================================

async function section3Multimodal(): Promise<void> {
  logSection("SECTION 3 — Multimodal (image input)");

  // Common substrings of vision-capable local model identifiers. If the
  // currently-loaded LM Studio / llama.cpp model id doesn't contain any of
  // these, we skip rather than asserting against a text-only model.
  const VISION_HINTS = [
    "vl",
    "vision",
    "llava",
    "qwen2-vl",
    "qwen2.5-vl",
    "phi-3-vision",
    "llama-3.2-11b",
    "llama-3.2-90b",
  ];
  const looksLikeVisionModel = (model: string | undefined): boolean => {
    if (!model) {
      return false;
    }
    const m = model.toLowerCase();
    return VISION_HINTS.some((h) => m.includes(h));
  };

  for (const p of PROVIDERS) {
    const isLocal = p.name === "lm-studio" || p.name === "llamacpp";
    if (!p.visionModel && !isLocal) {
      logTest(
        `[${p.name}] C1 image.basic`,
        "SKIP",
        "no vision model defined for this provider",
      );
      record(p.name, null);
      continue;
    }
    if (isLocal && !looksLikeVisionModel(p.visionModel ?? p.loadedModel)) {
      logTest(
        `[${p.name}] C1 image.basic`,
        "SKIP",
        "loaded local model does not look multimodal",
      );
      record(p.name, null);
      continue;
    }
    await runProviderTest("C1 image.basic", p, async (signal) => {
      const sdk = makeSdk();
      const res = await sdk.generate({
        input: {
          text: "Describe this image in 1 sentence.",
          files: [
            {
              data: Buffer.from(TINY_PNG_BASE64, "base64"),
              mimeType: "image/png",
              name: "tiny.png",
            },
          ],
        },
        provider: p.name,
        abortSignal: signal,
        model: p.visionModel,
        maxTokens: 64,
      });
      return Boolean(res?.content);
    });
  }
}

// ============================================================
// SECTION 4 — STRUCTURED OUTPUT (D1-D2)
// ============================================================

async function section4Structured(): Promise<void> {
  logSection("SECTION 4 — Structured output (Zod)");

  let zodMod: typeof import("zod") | null;
  try {
    zodMod = await import("zod");
  } catch {
    log("   (zod not installed — skipping section 4)", "yellow");
    for (const p of PROVIDERS) {
      logTest(`[${p.name}] D1 structured.zod.simple`, "SKIP", "zod missing");
      record(p.name, null);
    }
    return;
  }

  const schema = zodMod.z.object({
    city: zodMod.z.string(),
    population: zodMod.z.number(),
  });

  for (const p of PROVIDERS) {
    await runProviderTest("D1 structured.zod.simple", p, async (signal) => {
      const sdk = makeSdk();
      const res = await sdk.generate({
        input: {
          text: "Return an object with city='Bangalore' and population=14000000.",
        },
        provider: p.name,
        abortSignal: signal,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        schema: schema as any,
        maxTokens: 256,
      });
      const parsed = schema.safeParse(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (res as any)?.object ?? null,
      );
      return parsed.success;
    });
  }
}

// ============================================================
// SECTION 5 — REASONING / THINKING (E1-E3)
// ============================================================

async function section5Reasoning(): Promise<void> {
  logSection("SECTION 5 — Reasoning (thinkingLevel)");

  for (const p of PROVIDERS) {
    if (!p.reasoningModel) {
      logTest(
        `[${p.name}] E1 thinking.high`,
        "SKIP",
        "no reasoning model defined",
      );
      record(p.name, null);
      continue;
    }
    await runProviderTest("E1 thinking.high", p, async (signal) => {
      const sdk = makeSdk();
      const res = await sdk.generate({
        input: { text: "What is 17 * 23? Show your reasoning." },
        provider: p.name,
        abortSignal: signal,
        model: p.reasoningModel,
        thinkingLevel: "high",
        maxTokens: 512,
      });
      // Require an actual reasoning signal — `res?.content` alone passed even
      // when the provider ignored thinkingLevel, masking real regressions.
      // Accept either a populated `reasoning` field or the SDK's
      // `analytics.reasoning` (some providers route reasoning through analytics).
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const r = res as any;
      const reasoning =
        (typeof r?.reasoning === "string" && r.reasoning.length > 0) ||
        (typeof r?.analytics?.reasoning === "string" &&
          r.analytics.reasoning.length > 0) ||
        (Array.isArray(r?.reasoning) && r.reasoning.length > 0);
      return Boolean(reasoning);
    });

    // Use the chat-tier model (or reasoner only as a last resort) for E2 —
    // some providers (DeepSeek's `deepseek-reasoner`) emit reasoning
    // unconditionally and would turn a valid minimal-thinking response into a
    // false failure. `fastModel` is the explicit chat-tier when defined; fall
    // back to reasoningModel only if no fastModel is set.
    const minimalModel = p.fastModel ?? p.reasoningModel;
    await runProviderTest("E2 thinking.minimal", p, async (signal) => {
      const sdk = makeSdk();
      const res = await sdk.generate({
        input: { text: "What is 2+2?" },
        provider: p.name,
        abortSignal: signal,
        model: minimalModel,
        thinkingLevel: "minimal",
        maxTokens: 64,
      });
      // Require normal content while reasoning is empty/absent — proves
      // `thinkingLevel: "minimal"` is honored, not silently treated as "high".
      // Mirror E1: also inspect `analytics.reasoning` so providers that route
      // reasoning through analytics can't pass the minimal test by leaving
      // `res.reasoning` empty.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const r = res as any;
      const isReasoningEmpty = (val: unknown): boolean =>
        !val ||
        (typeof val === "string" && val.length === 0) ||
        (Array.isArray(val) && val.length === 0);
      const reasoningEmpty =
        isReasoningEmpty(r?.reasoning) &&
        isReasoningEmpty(r?.analytics?.reasoning);
      return Boolean(res?.content) && reasoningEmpty;
    });
  }
}

// ============================================================
// SECTION 6 — CONVERSATION MEMORY (H1)
// ============================================================

async function section6Memory(): Promise<void> {
  logSection("SECTION 6 — Conversation memory");

  for (const p of PROVIDERS) {
    await runProviderTest("H1 memory.multiturn", p, async (signal) => {
      const sdk = makeSdk();
      const sessionId = `test-${p.name}-${Date.now()}`;
      const r1 = await sdk.generate({
        input: { text: "My favorite color is mauve. Remember it." },
        provider: p.name,
        abortSignal: signal,
        sessionId,
        maxTokens: 64,
      });
      if (!r1?.content) {
        return false;
      }
      const r2 = await sdk.generate({
        input: { text: "What is my favorite color? Reply with one word." },
        provider: p.name,
        abortSignal: signal,
        sessionId,
        maxTokens: 32,
      });
      return Boolean(r2?.content?.toLowerCase().includes("mauve"));
    });
  }
}

// ============================================================
// SECTION 7 — PER-CALL CREDENTIALS (I1-I3)
// ============================================================

async function section7Credentials(): Promise<void> {
  logSection("SECTION 7 — Per-call credentials");

  for (const p of PROVIDERS) {
    await runProviderTest("I1 creds.percall", p, async (signal) => {
      const sdk = makeSdk();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const credentials: any =
        p.name === "deepseek"
          ? { deepseek: { apiKey: DEEPSEEK_KEY } }
          : p.name === "nvidia-nim"
            ? { nvidiaNim: { apiKey: NIM_KEY } }
            : p.name === "lm-studio"
              ? {
                  lmStudio: {
                    baseURL: LM_STUDIO_URL,
                    // Cover the per-call apiKey path for proxied LM Studio
                    // when it's set in the env, otherwise omit so the test
                    // still PASSes against vanilla local LM Studio.
                    ...(LM_STUDIO_KEY ? { apiKey: LM_STUDIO_KEY } : {}),
                  },
                }
              : {
                  llamacpp: {
                    baseURL: LLAMACPP_URL,
                    ...(LLAMACPP_KEY ? { apiKey: LLAMACPP_KEY } : {}),
                  },
                };
      const res = await sdk.generate({
        input: { text: TINY_PROMPT },
        provider: p.name,
        abortSignal: signal,
        credentials,
        maxTokens: 16,
      });
      return Boolean(res?.content);
    });
  }
}

// ============================================================
// SECTION 8 — ABORT / TIMEOUT (J1-J2)
// ============================================================

async function section8AbortTimeout(): Promise<void> {
  logSection("SECTION 8 — Abort / timeout");

  for (const p of PROVIDERS) {
    await runProviderTest("J1 abort.stream", p, async (signal) => {
      const sdk = makeSdk();
      const ac = new AbortController();
      const sr = await sdk.stream({
        input: { text: "Recite the alphabet very slowly." },
        provider: p.name,
        // Compose the per-test timeout signal with the test-specific abort
        // controller — first abort wins.
        abortSignal: AbortSignal.any([signal, ac.signal]),
        maxTokens: 1024,
      });
      const start = Date.now();
      let chunks = 0;
      const drain = (async () => {
        try {
          for await (const _ of sr.stream) {
            chunks++;
            if (chunks >= 2) {
              ac.abort();
            }
          }
        } catch {
          /* expected */
        }
      })();
      await drain;
      const elapsed = Date.now() - start;
      return elapsed < 30_000;
    });

    await runProviderTest("J2 timeout.percall", p, async (signal) => {
      const sdk = makeSdk();
      try {
        await sdk.generate({
          input: { text: "Write a 10000-word essay." },
          provider: p.name,
          abortSignal: signal,
          timeout: 1_000, // very short
          maxTokens: 4096,
        });
        return false; // should have thrown
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return /timeout|timed out|aborted/i.test(msg);
      }
    });
  }
}

// ============================================================
// SECTION 9 — ERROR HANDLING (K2 — server unreachable)
// ============================================================

async function section9Errors(): Promise<void> {
  logSection("SECTION 9 — Error handling (unreachable / friendly errors)");

  // Force-unreachable tests for local providers — even when the real server is up,
  // we exercise the bad-URL path via per-call credential override.
  const fakeUrl = "http://127.0.0.1:9";

  for (const p of PROVIDERS) {
    if (p.name === "deepseek" || p.name === "nvidia-nim") {
      logTest(
        `[${p.name}] K2 error.unreachable`,
        "SKIP",
        "cloud provider — covered by K1 (invalidKey)",
      );
      record(p.name, null);
      continue;
    }
    await runProviderTest(
      "K2 error.unreachable",
      p,
      async (signal) => {
        const sdk = makeSdk();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const credentials: any =
          p.name === "lm-studio"
            ? { lmStudio: { baseURL: fakeUrl } }
            : { llamacpp: { baseURL: fakeUrl } };
        try {
          await sdk.generate({
            input: { text: TINY_PROMPT },
            provider: p.name,
            credentials,
            abortSignal: signal,
            maxTokens: 16,
          });
          return false; // should have thrown
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          return /not reachable|ECONNREFUSED|fetch failed|Failed to fetch|bad port|Cannot connect/i.test(
            msg,
          );
        }
      },
      { requireAvailability: false },
    );
  }

  // K1: invalid API key — only for cloud providers
  for (const p of PROVIDERS) {
    if (p.name === "lm-studio" || p.name === "llamacpp") {
      continue;
    }
    await runProviderTest(
      "K1 error.invalidKey",
      p,
      async (signal) => {
        const sdk = makeSdk();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const credentials: any =
          p.name === "deepseek"
            ? { deepseek: { apiKey: "sk-deliberately-invalid-key-1234" } }
            : { nvidiaNim: { apiKey: "nvapi-deliberately-invalid-key-1234" } };
        try {
          await sdk.generate({
            input: { text: TINY_PROMPT },
            provider: p.name,
            credentials,
            abortSignal: signal,
            maxTokens: 16,
            disableTools: true,
          });
          return false; // should have thrown
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          return /invalid|unauthorized|401|403|forbidden|api key|authentication|access/i.test(
            msg,
          );
        }
      },
      { requireAvailability: false },
    );
  }

  // NIM-specific K5: retry-on-400 strips reasoning_budget
  // Disable tools so we don't trip NIM's tool-choice config error on certain
  // model servers (which is a server config issue, not what this test verifies).
  if (HAS_NIM) {
    await runProviderTest(
      "K5 error.nim.retry.budget",
      PROVIDERS[1], // nvidia-nim
      async (signal) => {
        const sdk = makeSdk();
        const res = await sdk.generate({
          input: { text: TINY_PROMPT },
          provider: "nvidia-nim",
          model: "google/gemma-3-27b-it", // typically doesn't support reasoning_budget
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          thinkingConfig: { thinkingLevel: "high" } as any,
          abortSignal: signal,
          disableTools: true,
          maxTokens: 32,
        });
        return Boolean(res?.content); // should succeed via retry
      },
    );
  }
}

// ============================================================
// SECTION 10 — TELEMETRY (L1, L2)
// (Lightweight: just verify a generate completes and analytics is produced)
// ============================================================

async function section10Telemetry(): Promise<void> {
  logSection("SECTION 10 — Telemetry (analytics presence)");

  for (const p of PROVIDERS) {
    await runProviderTest("L1 telemetry.span.generation", p, async (signal) => {
      const sdk = makeSdk();
      const sr = await sdk.stream({
        input: { text: TINY_PROMPT },
        provider: p.name,
        abortSignal: signal,
        maxTokens: 16,
      });
      for await (const _ of sr.stream) {
        /* drain */
      }
      // analytics promise should resolve to something truthy
      const analytics = await sr.analytics;
      return analytics !== undefined && analytics !== null;
    });
  }
}

// ============================================================
// MAIN
// ============================================================

async function main(): Promise<void> {
  log(`${colors.bright}New-Providers Test Suite${colors.reset}`, "cyan");
  log("DeepSeek · NVIDIA NIM · LM Studio · llama.cpp", "cyan");
  log("");
  log(`Provider availability:`, "bright");
  for (const p of PROVIDERS) {
    log(
      `  ${p.available ? "✅" : "⏭️ "} ${p.name}: ${p.available ? "ready" : p.unavailableReason}`,
      p.available ? "green" : "yellow",
    );
  }

  await section1Core();
  await section2Tools();
  await section3Multimodal();
  await section4Structured();
  await section5Reasoning();
  await section6Memory();
  await section7Credentials();
  await section8AbortTimeout();
  await section9Errors();
  await section10Telemetry();

  // Final summary
  console.log(`\n${colors.cyan}${"=".repeat(70)}${colors.reset}`);
  log("  RESULTS", "cyan");
  console.log(`${colors.cyan}${"=".repeat(70)}${colors.reset}`);
  let totalPass = 0;
  let totalFail = 0;
  let totalSkip = 0;
  for (const p of PROVIDERS) {
    const t = totals[p.name];
    totalPass += t.pass;
    totalFail += t.fail;
    totalSkip += t.skip;
    log(
      `  ${p.name.padEnd(12)} : ${String(t.pass).padStart(2)} PASS, ${String(t.fail).padStart(2)} FAIL, ${String(t.skip).padStart(2)} SKIP`,
      t.fail > 0 ? "red" : t.pass > 0 ? "green" : "yellow",
    );
  }
  console.log(`${colors.cyan}${"-".repeat(70)}${colors.reset}`);
  log(
    `  TOTAL: ${totalPass} PASS, ${totalFail} FAIL, ${totalSkip} SKIP`,
    totalFail > 0 ? "red" : "green",
  );

  if (failures.length > 0) {
    console.log(`\n${colors.red}Failures:${colors.reset}`);
    for (const f of failures) {
      log(`  [${f.provider}] ${f.test}: ${f.error.slice(0, 200)}`, "red");
    }
  }

  process.exit(totalFail > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Fatal error in test suite:", err);
  process.exit(2);
});
