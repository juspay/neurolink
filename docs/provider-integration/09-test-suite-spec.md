# 09 · Test Suite Specification

This document specifies how the four new providers integrate into Neurolink's continuous test suite system.

## 1. Test framework facts

Neurolink does **not** use Vitest, Jest, Mocha, or any test runner — every suite is a standalone tsx script:

```
test/continuous-test-suite.ts                # main orchestrator (run via `pnpm test`)
test/continuous-test-suite-<domain>.ts       # per-domain suites (one per `pnpm run test:<domain>` script)
test/fixtures/                               # CSVs, PDFs, PNG, JSON used by suites
test/types/                                  # local types for tests
```

Each suite:

- Starts with `#!/usr/bin/env tsx`
- Imports from `dist/` (so `pnpm run build` must run first)
- Defines test functions returning `Promise<boolean | null>` where `true=PASS`, `false=FAIL`, `null=SKIP`
- Logs via `logTest(name, "PASS" | "FAIL" | "SKIP" | "TESTING", details?)`
- Treats provider-unavailable errors as SKIP (via `isExpectedProviderError`)
- Exits 0 if all pass-or-skip; exits 1 if any fail

## 2. Env var conventions

There are **two** env-var families:

### 2a. Runtime env vars (read by providers themselves)

Set these to make a provider work in production AND in tests via the standard env-var path:

| Var                                                               | Provider             |
| ----------------------------------------------------------------- | -------------------- |
| `OPENAI_API_KEY`                                                  | OpenAI               |
| `ANTHROPIC_API_KEY`                                               | Anthropic            |
| `MISTRAL_API_KEY`                                                 | Mistral              |
| `GOOGLE_VERTEX_PROJECT` (+ auth)                                  | Vertex               |
| `OLLAMA_BASE_URL` (defaults to `http://localhost:11434`)          | Ollama               |
| **`DEEPSEEK_API_KEY`**                                            | **DeepSeek (NEW)**   |
| **`DEEPSEEK_MODEL`** (optional)                                   | **DeepSeek (NEW)**   |
| **`DEEPSEEK_BASE_URL`** (optional override)                       | **DeepSeek (NEW)**   |
| **`NVIDIA_NIM_API_KEY`**                                          | **NVIDIA NIM (NEW)** |
| **`NVIDIA_NIM_MODEL`** (optional)                                 | **NVIDIA NIM (NEW)** |
| **`NVIDIA_NIM_BASE_URL`** (optional, for self-hosted)             | **NVIDIA NIM (NEW)** |
| **`LM_STUDIO_BASE_URL`** (defaults to `http://localhost:1234/v1`) | **LM Studio (NEW)**  |
| **`LM_STUDIO_MODEL`** (optional, blank = auto-discover)           | **LM Studio (NEW)**  |
| **`LLAMACPP_BASE_URL`** (defaults to `http://localhost:8080/v1`)  | **llama.cpp (NEW)**  |
| **`LLAMACPP_MODEL`** (optional)                                   | **llama.cpp (NEW)**  |

### 2b. Test-only env vars (consumed by test suites)

These are used by per-call/per-instance credential override tests. They are intentionally separate so a developer can run tests with different keys than production:

| Var                           | Used by                                                                            |
| ----------------------------- | ---------------------------------------------------------------------------------- |
| `TEST_PROVIDER`               | Most suites — overrides default test provider                                      |
| `TEST_MODEL`                  | Most suites — overrides default test model                                         |
| `TEST_OPENAI_API_KEY`         | `continuous-test-suite-credentials.ts`                                             |
| `TEST_ANTHROPIC_API_KEY`      | `continuous-test-suite-credentials.ts`                                             |
| **`TEST_DEEPSEEK_API_KEY`**   | **`continuous-test-suite-new-providers.ts`**                                       |
| **`TEST_NVIDIA_NIM_API_KEY`** | **`continuous-test-suite-new-providers.ts`**                                       |
| **`TEST_LM_STUDIO_BASE_URL`** | **`continuous-test-suite-new-providers.ts`**                                       |
| **`TEST_LLAMACPP_BASE_URL`**  | **`continuous-test-suite-new-providers.ts`**                                       |
| **`TEST_LM_STUDIO_API_KEY`**  | **`continuous-test-suite-new-providers.ts`** (probe auth for proxied LM Studio)    |
| **`TEST_LLAMACPP_API_KEY`**   | **`continuous-test-suite-new-providers.ts`** (probe auth for proxied llama-server) |
| `LM_STUDIO_API_KEY`           | runtime — `LMStudioProvider` (auth bearer for reverse-proxied deployments)         |
| `LLAMACPP_API_KEY`            | runtime — `LlamaCppProvider` (auth bearer for reverse-proxied deployments)         |

If a test-only var is unset, the test falls back to the runtime var. If both are unset, the test SKIPs.

### 2c. New `.env.example` additions

Append at end of `.env.example`:

```bash
# =============================================================================
# DEEPSEEK CONFIGURATION
# =============================================================================
DEEPSEEK_API_KEY=
# Optional: override default model
DEEPSEEK_MODEL=deepseek-chat
# Optional: override default base URL
# DEEPSEEK_BASE_URL=https://api.deepseek.com

# =============================================================================
# NVIDIA NIM CONFIGURATION
# =============================================================================
NVIDIA_NIM_API_KEY=
NVIDIA_NIM_MODEL=meta/llama-3.3-70b-instruct
# Optional: override default base URL (use for self-hosted NIM)
# NVIDIA_NIM_BASE_URL=https://integrate.api.nvidia.com/v1

# Optional NIM extras (rarely needed)
# NVIDIA_NIM_TOP_K=
# NVIDIA_NIM_MIN_P=
# NVIDIA_NIM_REPETITION_PENALTY=
# NVIDIA_NIM_MIN_TOKENS=
# NVIDIA_NIM_CHAT_TEMPLATE=

# =============================================================================
# LM STUDIO CONFIGURATION (local provider; API key only for proxied deployments)
# =============================================================================
LM_STUDIO_BASE_URL=http://localhost:1234/v1
# Optional: explicit model id (blank = auto-discover from /v1/models)
LM_STUDIO_MODEL=
# Optional: bearer token for reverse-proxied LM Studio (forwarded as Authorization)
LM_STUDIO_API_KEY=

# =============================================================================
# LLAMA.CPP CONFIGURATION (local provider; API key only for proxied deployments)
# =============================================================================
LLAMACPP_BASE_URL=http://localhost:8080/v1
# Optional: explicit model id (blank = use whatever model llama-server has loaded)
LLAMACPP_MODEL=
# Optional: bearer token for reverse-proxied llama-server (forwarded as Authorization)
LLAMACPP_API_KEY=

# =============================================================================
# TEST-ONLY CREDENTIALS (used by test/continuous-test-suite-credentials.ts and
# test/continuous-test-suite-new-providers.ts to verify per-call overrides
# without depending on the runtime env vars above)
# =============================================================================
# TEST_DEEPSEEK_API_KEY=
# TEST_NVIDIA_NIM_API_KEY=
# TEST_LM_STUDIO_BASE_URL=
# TEST_LLAMACPP_BASE_URL=
# TEST_LM_STUDIO_API_KEY=
# TEST_LLAMACPP_API_KEY=
```

## 3. New test suite file — `test/continuous-test-suite-new-providers.ts`

This is the consolidated suite for the four new providers. It runs every relevant feature against each provider that's available in the environment.

### 3a. Top-level structure

```ts
#!/usr/bin/env tsx
import "dotenv/config";

/**
 * Continuous Test Suite: New Providers (DeepSeek, NVIDIA NIM, LM Studio, llama.cpp)
 *
 * Verifies that the four providers ported from free-claude-code work end-to-end
 * across Neurolink's full feature surface (generate, stream, tools, structured
 * output, reasoning, vision where supported, abort, timeout, per-call creds).
 *
 * Each provider's tests SKIP cleanly when its env var is missing so this suite
 * runs green in CI without credentials.
 *
 * Run with: npx tsx test/continuous-test-suite-new-providers.ts
 */

import { NeuroLink } from "../dist/index.js";
// ... colors, logSection, logTest, isExpectedProviderError ... (copy from continuous-test-suite-providers.ts)

// Per-provider availability gates
const HAS_DEEPSEEK = Boolean(
  process.env.DEEPSEEK_API_KEY || process.env.TEST_DEEPSEEK_API_KEY,
);
const HAS_NIM = Boolean(
  process.env.NVIDIA_NIM_API_KEY || process.env.TEST_NVIDIA_NIM_API_KEY,
);
const HAS_LM_STUDIO = await probeLocalServer(
  process.env.TEST_LM_STUDIO_BASE_URL ??
    process.env.LM_STUDIO_BASE_URL ??
    "http://localhost:1234/v1",
);
const HAS_LLAMACPP = await probeLocalServer(
  process.env.TEST_LLAMACPP_BASE_URL ??
    process.env.LLAMACPP_BASE_URL ??
    "http://localhost:8080/v1",
);

const LM_STUDIO_KEY =
  process.env.TEST_LM_STUDIO_API_KEY ?? process.env.LM_STUDIO_API_KEY ?? "";
const LLAMACPP_KEY =
  process.env.TEST_LLAMACPP_API_KEY ?? process.env.LLAMACPP_API_KEY ?? "";

// probeLocalServer returns { available, loadedModel? } — we forward the
// loadedModel onto each provider entry so the C1 vision-skip predicate can
// inspect the actual loaded model id instead of guessing.
const LM_STUDIO_PROBE = await probeLocalServer(LM_STUDIO_URL, LM_STUDIO_KEY);
const LLAMACPP_PROBE = await probeLocalServer(LLAMACPP_URL, LLAMACPP_KEY);

const PROVIDERS_UNDER_TEST = [
  { name: "deepseek", available: HAS_DEEPSEEK },
  { name: "nvidia-nim", available: HAS_NIM },
  {
    name: "lm-studio",
    available: LM_STUDIO_PROBE.available,
    loadedModel: LM_STUDIO_PROBE.loadedModel,
  },
  {
    name: "llamacpp",
    available: LLAMACPP_PROBE.available,
    loadedModel: LLAMACPP_PROBE.loadedModel,
  },
] as const;
```

### 3b. Test grouping

Each test group iterates `PROVIDERS_UNDER_TEST`. Per-provider per-test SKIP if `available === false` (or, for self-contained negative tests like K1/K2, opt out via `runProviderTest(..., { requireAvailability: false })`).

The shipped suite covers this subset of the matrix below. Other ID slots (B3, B5, C2-C4, D2-D3, E3, H2, I2-I3, K3, K4, K6, L2-L3) are reserved in the matrix for future expansion; they are not currently exercised:

```
SECTION 1: Core (A1-A5)
  A1 generate.basic, A2 generate.maxTokens, A3 generate.temperature,
  A4 stream.basic, A5 stream.completes
SECTION 2: Tools
  B1 tools.generate.custom, B2 tools.stream.custom, B4 tools.disable
SECTION 3: Multimodal
  C1 image.basic
SECTION 4: Structured output
  D1 structured.zod.simple
SECTION 5: Reasoning
  E1 thinking.high, E2 thinking.minimal
SECTION 6: Conversation memory
  H1 memory.multiturn
SECTION 7: Per-call credentials
  I1 creds.percall
SECTION 8: Abort/timeout
  J1 abort.stream, J2 timeout.percall
SECTION 9: Error handling
  K1 error.invalidKey, K2 error.unreachable, K5 error.nim.retry.budget
SECTION 10: Telemetry
  L1 telemetry.span.generation
```

(Sections F = embeddings and G = RAG are out-of-scope for the new providers in v1.)

### 3c. Standard test function signature

```ts
async function testFeature(
  providerName: string,
  available: boolean,
): Promise<boolean | null> {
  const testLabel = `[${providerName}] feature.name`;
  if (!available) {
    logTest(testLabel, "SKIP", `${providerName} env not configured`);
    return null;
  }

  logTest(testLabel, "TESTING");
  try {
    const sdk = new NeuroLink();
    const result = await sdk.generate({
      input: { text: "Reply with PONG only." },
      provider: providerName,
      maxTokens: 32,
    });
    if (!result?.content?.toUpperCase().includes("PONG")) {
      logTest(
        testLabel,
        "FAIL",
        `unexpected response: ${result?.content?.slice(0, 80)}`,
      );
      return false;
    }
    logTest(testLabel, "PASS");
    return true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (isExpectedProviderError(msg)) {
      logTest(testLabel, "SKIP", msg.slice(0, 80));
      return null;
    }
    logTest(testLabel, "FAIL", msg.slice(0, 120));
    return false;
  }
}
```

### 3d. Inter-test pacing

After each per-provider test invoke `await sleep(1500)` to avoid rate-limit thrash on the cloud providers. Local providers can skip the sleep.

### 3e. Final summary

At the end, print a table:

```
════════════════════════════════════════════════════════════════════
  RESULTS                                              new-providers
════════════════════════════════════════════════════════════════════
  deepseek      : 12 PASS, 0 FAIL, 5 SKIP (vision unsupported)
  nvidia-nim    : 17 PASS, 0 FAIL, 0 SKIP
  lm-studio     : 0  PASS, 0 FAIL, 17 SKIP (server not running)
  llamacpp      :  9 PASS, 1 FAIL, 7 SKIP (--jinja missing)
────────────────────────────────────────────────────────────────────
  TOTAL: 38 PASS, 1 FAIL, 29 SKIP
```

Exit code: 0 if no FAILs, 1 if any FAIL.

## 4. Updates to existing suites

### 4a. `test/continuous-test-suite-providers.ts:73`

```diff
 const ALL_PROVIDERS = [
   "openai", "anthropic", "vertex", "google-ai", "openrouter",
   "bedrock", "azure", "mistral", "ollama", "litellm", "huggingface",
+  "deepseek", "nvidia-nim", "lm-studio", "llamacpp",
 ] as const;
```

This automatically extends `testAllProviderGenerate` (line 1630) and `testAllProviderStream` (line 1723) to exercise the new providers. The existing skip-on-error logic handles unconfigured providers cleanly.

### 4b. `test/continuous-test-suite-credentials.ts`

Add 4 new test blocks in Section 3 (provider-scoped credential slicing). Each follows the OpenAI/Anthropic pattern at line 380-410:

```ts
// 3.X DeepSeek per-call credentials
await test("3.X deepseek per-call apiKey override", async () => {
  if (!HAS_DEEPSEEK_KEY) throw new Error("SKIP: TEST_DEEPSEEK_API_KEY not set");
  const sdk = new NeuroLink();
  const result = await sdk.generate({
    input: { text: "Reply: PONG" },
    provider: "deepseek",
    credentials: { deepseek: { apiKey: process.env.TEST_DEEPSEEK_API_KEY! } },
    maxTokens: 16,
  });
  assertNotNull(result?.content, "should return content");
});

// (Repeat for nvidia-nim, lm-studio, llamacpp)
```

### 4c. `package.json` — add `test:new-providers`

```diff
   "test:providers": "npx tsx test/continuous-test-suite-providers.ts",
+  "test:new-providers": "npx tsx test/continuous-test-suite-new-providers.ts",
   "test:rag": "npx tsx test/continuous-test-suite-rag.ts",
```

Optional: extend `test:ci`:

```diff
-  "test:ci": "pnpm run test && pnpm run test:client",
+  "test:ci": "pnpm run test && pnpm run test:client && pnpm run test:new-providers",
```

(Tests skip cleanly when env vars are absent, so adding to CI is safe.)

## 5. Smoke vs. full-suite distinction

Smoke tests = single-feature CLI invocations (in `06-testing.md` §smoke scripts).
Full suite = `continuous-test-suite-new-providers.ts` covering A-L sections.

Run smoke after each milestone for fast feedback. Run the full suite before merging.

## 6. Result-recording workflow

After running the full suite:

1. Open `08-feature-matrix.md`
2. For each `[providerName] feature.name` PASS, tick ☐ → ☒
3. For each FAIL or unexpected SKIP, add a footnote explaining why
4. Commit the updated matrix as part of the test PR — it becomes the project's living "what works" document

## 7. CI considerations

- Cloud-provider tests (DeepSeek, NIM) cost money. Default CI: env vars unset → suite skips clean.
- Nightly: GitHub secrets provide TEST_DEEPSEEK_API_KEY, TEST_NVIDIA_NIM_API_KEY for full coverage.
- Local provider tests (LM Studio, llama.cpp): only run if those servers are running — typical CI runners won't have them. Provide opt-in flag `RUN_LOCAL_PROVIDERS=1` if you want to enforce them on a self-hosted runner.

## 8. What this suite does NOT cover (out of scope for v1)

| Out of scope                | Reason                                          | Future task                        |
| --------------------------- | ----------------------------------------------- | ---------------------------------- |
| Embeddings (F1, F2)         | Not implemented in any of the 4 providers in v1 | Add when `embed` is wired up       |
| Multi-region failover       | Not provider-specific                           | covered by existing failover tests |
| Cost-budget enforcement     | Not provider-specific                           | exists in `evaluation` suite       |
| Image _generation_ (output) | None of the 4 providers generate images         | n/a                                |
| Audio I/O                   | None of the 4 do TTS/STT                        | n/a                                |
| Workflow engine integration | Provider-agnostic; covered by `test:workflow`   | exists                             |

## 9. Cross-references

- Provider × feature matrix: `08-feature-matrix.md`
- Per-provider test specs: `06-testing.md`
- Implementation order (test milestones): `07-implementation-order.md`
- Test code: `test/continuous-test-suite-new-providers.ts` (created in §3)
