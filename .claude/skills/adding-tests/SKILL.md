---
name: adding-tests
description: Use when adding tests for a new modality (vision/embeddings/TTS/STT/realtime/image-gen/video-gen), a new AI provider, or a new SDK feature. Picks the right per-domain suite, wires the right helpers, sets the right capability flag, and avoids the four traps that broke past contributions (loose error matchers, missing capability gate, monolithic test file, manual skip plumbing).
---

# Adding NeuroLink tests — modality, provider, or feature

> Goal: extend `test/continuous-test-suite-*.ts` without re-inventing harness code, without breaking the canonical patterns the May 2026 consolidation locked in, and without creating SKIP/FAIL confusion in CI.

---

## 0. Mental model in one paragraph

Tests are **plain `tsx` scripts** — no Jest/Vitest. Every suite is a single
`test/continuous-test-suite-<domain>.ts` file invoked via
`pnpm exec tsx <path>` or `pnpm run test:<domain>`. All shared logic lives in
`test/helpers/*.ts`. The harness defines a tri-state result:

- **PASS** — test fn returns/resolves normally
- **FAIL** — test fn throws an `Error` that doesn't look like a skip
- **SKIP** — test fn throws `new Skip(reason)`, OR a known provider error
  (`isExpectedProviderError`), OR an env-missing string starting with `"SKIP:"`

You never write a new suite directory, never add a runner config, never
introduce a new logger. You add code to an **existing per-domain file** OR
write **one new file** with the same canonical shape.

---

## 1. Decision tree — where does my test go?

```text
What are you adding?
│
├── New AI provider (e.g. "Together AI", "Cerebras")
│   → Edit test/helpers/providerMatrix.ts (add PROVIDERS entry)
│   → Edit test/continuous-test-suite-new-providers.ts (live smoke)
│   → pnpm run test:matrix picks it up automatically
│
├── New modality on an existing provider
│   ├── vision input          → test/continuous-test-suite-providers.ts
│   │                            (+ flip `vision: true` in providerMatrix)
│   ├── image generation      → test/continuous-test-suite-media-gen.ts
│   ├── video generation      → test/continuous-test-suite-media-gen.ts
│   ├── TTS                   → test/continuous-test-suite-tts.ts
│   ├── STT / realtime / voice→ test/continuous-test-suite-voice.ts
│   ├── embeddings            → test/continuous-test-suite-provider-matrix.ts
│   │                            (auto-discovered when `embeddings: true`)
│   └── thinking / reasoning  → test/continuous-test-suite-providers.ts
│
├── New file processor (e.g. .heic, .protobuf, .xlsx variant)
│   → test/continuous-test-suite-context.ts
│
├── New SDK feature
│   ├── tool / MCP            → test/continuous-test-suite-mcp-sdk.ts
│   ├── tool reliability      → test/continuous-test-suite-tool-reliability.ts
│   ├── memory / sessions     → test/continuous-test-suite-memory.ts
│   ├── RAG / chunking        → test/continuous-test-suite-rag.ts
│   ├── workflow              → test/continuous-test-suite-workflow.ts
│   ├── observability / OTEL  → test/continuous-test-suite-observability.ts
│   ├── HITL                  → test/continuous-test-suite-hitl.ts
│   ├── credentials surface   → test/continuous-test-suite-credentials.ts
│   ├── proxy / fallback      → test/continuous-test-suite-proxy.ts
│   ├── server (HTTP)         → test/continuous-test-suite-servers.ts
│   ├── evaluation / RAGAS    → test/continuous-test-suite-evaluation.ts
│   ├── autoresearch          → test/continuous-test-suite-autoresearch.ts
│   ├── middleware            → test/continuous-test-suite-middleware.ts
│   └── client SDK surface    → test/continuous-test-suite-client.ts
│
└── A whole new domain that doesn't fit above?
    → Create test/continuous-test-suite-<name>.ts (use § 2 template),
      add `test:<name>` script to package.json, add to test/README.md § 3.
```

**Hard rule:** Do **not** create `continuous-test-suite-issue-NN-*.ts` or
`continuous-test-suite-bug-NN-*.ts`. Ticket-numbered files were the
explicit anti-pattern the consolidation removed. Regressions live inside
the domain suite they belong to.

---

## 2. Canonical suite skeleton

Every suite — old or new — must look like this. Copy and adapt:

```typescript
#!/usr/bin/env tsx
import "dotenv/config";

/**
 * Continuous Test Suite — <Domain>
 *
 * <1-3 sentence description of what's covered>
 *
 * Run: pnpm run build && pnpm exec tsx test/continuous-test-suite-<name>.ts
 *      pnpm run test:<name>
 */

import { NeuroLink } from "../dist/index.js";
import {
  defineSuite,
  assert,
  assertEqual,
  isExpectedProviderError,
  Skip,
} from "./helpers/harness.js";
import {
  skipUnlessProviderHas,
  skipUnlessProviderAvailable,
} from "./helpers/skipIf.js";

const { test, runSuite, opts } = defineSuite("My Domain", {
  // Optional. Used only when neither --provider= nor TEST_PROVIDER is set.
  defaultProvider: "vertex",
  // Optional. Pause between tests (anti-rate-limit).
  interTestDelayMs: 0,
});

await runSuite(async () => {
  await test("does the thing", async () => {
    skipUnlessProviderHas(opts.provider!, "tools");

    const sdk = new NeuroLink();
    try {
      const result = await sdk.generate({
        provider: opts.provider,
        model: opts.model,
        input: { text: "..." },
        maxTokens: 200,
      } as never);
      assert(!!result.content && result.content.length > 0, "empty content");
    } catch (err) {
      // Promote known transient/credential errors to SKIP instead of FAIL.
      const msg = err instanceof Error ? err.message : String(err);
      if (isExpectedProviderError(msg)) {
        throw new Skip(`provider unavailable — ${msg.slice(0, 100)}`);
      }
      throw err;
    } finally {
      await sdk.shutdown?.().catch(() => {});
    }
  });
});
```

The script must end with `await runSuite(...)` — that's what prints the
summary and calls `process.exit`. Never call `process.exit` manually
inside a test fn; throw `Error` (FAIL) or `Skip` (SKIP) instead.

---

## 3. Adding a new provider — full checklist

The May 2026 consolidation made provider-onboarding mechanical. Touch
exactly these files:

### SDK side (src/)

1. `src/lib/constants/enums.ts` — add `AIProviderName.NEW_PROVIDER = "new-provider"`.
2. `src/lib/providers/newProvider.ts` — implement, extending `BaseProvider`.
3. `src/lib/models/newProvider.ts` — model name constants + default.
4. `src/lib/factories/providerRegistry.ts` — register via **dynamic import**
   inside the factory closure (CLAUDE.md rule 1 — static imports break the
   circular-dependency guard):
   ```typescript
   ProviderFactory.registerProvider(
     AIProviderName.NEW_PROVIDER,
     async (modelName?, _providerName?, sdk?, _region?, credentials?) => {
       const { NewProvider } = await import("../providers/newProvider.js");
       return new NewProvider(
         modelName,
         sdk as NeuroLink | undefined,
         credentials as NeurolinkCredentials["newProvider"],
       );
     },
     NewProviderModels.DEFAULT,
     ["alias1", "alias2"],
   );
   ```
5. If multimodal: add the model list to
   `src/lib/adapters/providerImageAdapter.ts` `VISION_CAPABILITIES`.
6. `src/cli/factories/commandFactory.ts` — add the provider to the CLI
   `--provider` choice list.

### Test side

7. **`test/helpers/providerMatrix.ts`** — add the `PROVIDERS["new-provider"]`
   entry. Set every capability flag explicitly (default to `false`; opt in
   per feature). Set `defaultModel`, optionally `embeddingModel`, and the
   exact `envVars[]` array used to detect "available".

   The matrix runner (`pnpm run test:matrix`) auto-picks the new entry —
   no other test wiring is required to get a basic gauntlet running.

8. `test/continuous-test-suite-new-providers.ts` — add a focused live
   smoke for any provider-specific quirk (e.g. DeepSeek's `json_object`
   prompt injection, NIM's bare-400 gateway, Bedrock cross-region profile,
   Ollama's local-subprocess concern).

9. `test/helpers/envGuard.ts` — **only** if the provider emits a unique
   transient-error framing that the existing 28 patterns don't cover.
   - Add a `{ id, test }` entry to `EXPECTED_PROVIDER_ERROR_PATTERNS`.
   - **Anchor it tightly.** Bare `"bad request"` / `"not found"` / `"403"`
     are forbidden — they swallow real bugs. Tag the framing with the
     provider name (`/\[my-provider\]\s+error:\s*…/`) or with the exact
     wording from the upstream SDK (`/specific framing/`).
   - There is no longer a coverage self-check for these patterns
     (`envGuard.test.ts` was removed with the unit suites), so read the
     warning at the top of `envGuard.ts` and verify the anchor by hand.

### Verify

```bash
pnpm run build
pnpm run test:matrix --provider=new-provider
pnpm run test:new-providers --provider=new-provider
```

---

## 4. Adding a new modality

A "modality" is a capability column in `providerMatrix.ts`:
`vision`, `embeddings`, `imageGeneration`, `videoGeneration`, `tts`,
`thinking`, `structuredOutput`, `structuredOutputWithTools`,
`toolsWithStreaming`. The pattern is identical for all of them.

### 4a. New modality on an EXISTING provider

1. Flip the flag in `providerMatrix.ts` for that provider entry. Be
   honest — `false` is a safe default. Document any sub-model constraint
   in a comment next to the flag (see `azure.embeddings: false` for the
   canonical example: tenant deployment topology means the SDK can't
   multiplex to a separate resource).
2. If the gate has a model-list nuance (e.g. only some Vertex models
   support vision), update `VISION_CAPABILITIES` or the equivalent
   constant.
3. Add a focused test to the appropriate domain suite (see decision
   tree). Open with a capability gate:
   ```typescript
   await test("vision: describe screenshot", async () => {
     skipUnlessProviderHas(opts.provider!, "vision");
     /* … */
   });
   ```
4. The matrix runner picks it up automatically — no separate
   registration. Run `pnpm run test:matrix` to confirm.

### 4b. A genuinely new modality column

This is rare. Examples that would qualify: speech-to-speech, in-stream
function bidirectional, document-understanding-with-OCR. Plain "new
provider supports vision" does NOT qualify — that's 4a.

1. Add the flag to the `Capabilities` type in `providerMatrix.ts`. Use
   `camelCase` matching the existing names.
2. Set the flag explicitly on **every** provider entry (default `false`).
   Don't leave any entry out — TypeScript will flag the omission, but
   "false" is a deliberate signal.
3. Add a `skipUnless<Modality>(p)` helper in `test/helpers/skipIf.ts`
   following the existing `skipUnlessTools` / `skipUnlessVision` shape.
4. Add a probe to `continuous-test-suite-provider-matrix.ts` inside the
   `for (const p of targets)` loop, gated on `if (p.<flag>)`. Match the
   structure of existing probes (text, streaming, tools, structuredOutput,
   thinking, embeddings).
5. If the modality has a dedicated domain suite (image-gen has
   `media-gen.ts`, TTS has `tts.ts`), wire that up too. Otherwise the
   matrix probe is sufficient.

### 4c. New file processor (multimodal input)

1. Place under the right category in `src/lib/processors/`:
   `archive/`, `code/`, `config/`, `data/`, `document/`, `markup/`, or
   `media/`.
2. Extend `BaseFileProcessor`; implement `canProcess()`, `process()`,
   `getInfo()`.
3. Register in `ProcessorRegistry` with a priority (lower = higher
   priority).
4. Add the MIME mapping in `src/lib/processors/config/mimeTypes.ts`.
5. Add tests to `test/continuous-test-suite-context.ts` — file-handling
   lives there (the issue-02 / issue-06 absorbtion folded `overflow-retry`
   and `no-output-context` into the context suite). Use a real fixture
   under `test/fixtures/` (no 1x1 placeholders — `new-providers C1`
   switched away from those for exactly this reason).

---

## 5. Adding a new SDK feature

1. Locate the right domain suite from § 1.
2. Append a test function inside that file. Follow the file's existing
   convention:
   - **`test()` form** (preferred — used by most suites including
     `provider-matrix`, `mcp-infra`'s newer Parts, `credentials`):
     ```typescript
     await test("description", async () => { ... });
     ```
   - **`recordTest()` form** (legacy — still used by `providers`,
     `mcp-cli`, `evaluation`): the suite has a flat array of
     `{ name, fn }` and a loop that calls `recordTest(name, passed,
skipped, error)`. Match the file you're editing — don't mix forms
     within one suite.
3. If the test cleans up an SDK instance, dispose in `finally`:
   ```typescript
   const sdk = new NeuroLink();
   try {
     /* … */
   } finally {
     await sdk.shutdown?.().catch(() => {});
   }
   ```
   For `mcp-infra`-style wired blocks, use the local `disposeQuietly(sdk)`
   helper pattern (see `mcp-infra.ts` line 77).
4. If the test races or needs a deadline, prefer the `withDeadline`
   factory pattern (`continuous-test-suite-context.ts`) with an
   `AbortController` wired into `sdk.generate({ abortSignal })`. Never
   `setTimeout(reject, …)` without also aborting the underlying work.
5. For long-running live tests, accept `signal?: AbortSignal` in the
   test function signature and thread it into every `sdk.generate` /
   `sdk.stream` call — `evaluation.ts` did this across 19 test fns in
   round 6.

---

## 6. Skip vs. Fail decision

| Situation                                               | Result    |
| ------------------------------------------------------- | --------- |
| Test reproduced the bug it was written for              | **FAIL**  |
| Provider returned auth/quota/rate-limit/billing         | **SKIP**  |
| Local LM (Ollama / LM Studio / llama.cpp) down          | **SKIP**  |
| Transient HTTP 410/500/502/503                          | **SKIP**  |
| Required env var missing                                | **SKIP**  |
| Tool/feature unsupported by current provider            | **SKIP**  |
| Test logic threw `TypeError`/`ReferenceError`           | **FAIL**  |
| Test expected non-empty content and got empty           | **FAIL**  |
| Provider returned 4xx because OUR request was malformed | **FAIL**  |
| Loose substring match (`"failed"`, `"error"`)           | **NEVER** |

**Forbidden helpers** — these used to live inside individual suites and
broke triage:

- `msg.includes("error")` — matches everything.
- `msg.includes("not found")` — matches missing files, missing models,
  missing tickets.
- `msg.includes("403")` — matches HTTP forbidden AND any other 403 in a
  log line; only use the anchored `\b403\b` form via `envGuard.ts`.

Always route through `isExpectedProviderError(msg)` from
`./helpers/harness.js`. If it doesn't catch your case, extend
`EXPECTED_PROVIDER_ERROR_PATTERNS` with an anchored regex. There is no
fixture suite to add to any more — anchor it tightly and check by hand.

---

## 7. Tier placement

After writing the test, decide its CI tier:

| Tier           | Cost          | Where to add the script alias                          |
| -------------- | ------------- | ------------------------------------------------------ |
| `test:unit`    | $0            | No live providers. Safe for every commit.              |
| `test:live`    | small / token | Real provider API calls. Skips cleanly without keys.   |
| `test:product` | metered       | Image-gen, video-gen, TTS, proxy. Run on release gate. |

Add the new `test:<name>` script alias to `package.json` and slot it
into the right pipeline string. Example for a new live suite:

```jsonc
"test:my-feature": "pnpm exec tsx test/continuous-test-suite-my-feature.ts",
"test:live": "pnpm run test:providers && ... && pnpm run test:my-feature"
```

---

## 8. Verification workflow

Before opening a PR:

```bash
pnpm run check         # type check
pnpm run lint          # ESLint (enforces 13 CLAUDE.md rules)
pnpm run envguard      # envGuard pattern coverage (80/80 must PASS)
pnpm run build         # CLI + SDK

# Direct invocation of the affected suite:
pnpm exec tsx test/continuous-test-suite-<name>.ts --provider=<p>

# If you added a provider:
pnpm run test:matrix
pnpm run test:new-providers

# If you added a modality:
pnpm run test:matrix
pnpm run test:<domain>
```

Add an entry to `test/README.md` § 3 if you created a new file.

---

## 9. Anti-patterns checklist

Reject your own code if it does any of these — the consolidation removed
them and they must not return:

- [ ] Created `continuous-test-suite-issue-NN-*.ts` or
      `continuous-test-suite-bug-NN-*.ts`. **Domains, not tickets.**
- [ ] Duplicated harness boilerplate (`function recordTest` /
      `function logSection` / colored output) in the new file. Import
      from `./helpers/harness.js`.
- [ ] Wrote a local `isExpectedProviderError` with `String.includes`
      substrings. Use the shared, anchored, test-covered version.
- [ ] Used `interface` (CLAUDE.md rule 7) or imported types from a
      `types/` folder anywhere outside `src/lib/types/` (rule 11).
- [ ] Imported a type from a specific file in `src/lib/types/` (rule 13)
      instead of the barrel.
- [ ] Re-exported a type from a non-types file (rule 12).
- [ ] Called `process.exit(1)` from inside a test fn. Throw `Error`.
- [ ] Used a static `import { Provider } from "../providers/..."` in
      `providerRegistry.ts` (rule 1). Dynamic-import inside the factory.
- [ ] Hard-coded `1x1` PNG placeholders for vision tests. Use real
      fixtures under `test/fixtures/`.
- [ ] Added a loose SKIP pattern to `envGuard.ts`. Nothing tests these any
      more, and an overmatching pattern turns real failures into silent skips.
- [ ] Mixed `test()` and `recordTest()` forms within one suite.
- [ ] Forgot the `finally { await sdk.shutdown?.()... }` cleanup. Leaked
      SDK instances starve subsequent tests of subprocess slots.

---

## 10. Canonical references

When in doubt, copy the existing canonical example:

| Pattern                              | Canonical file                                     |
| ------------------------------------ | -------------------------------------------------- |
| Capability matrix sweep              | `test/continuous-test-suite-provider-matrix.ts`    |
| `test()` form, finally cleanup       | `test/continuous-test-suite-credentials.ts`        |
| `recordTest()` form, catch loop      | `test/continuous-test-suite-mcp-cli.ts`            |
| Wired-integration + `disposeQuietly` | `test/continuous-test-suite-mcp-infra.ts`          |
| `AbortController` + `withDeadline`   | `test/continuous-test-suite-context.ts`            |
| Live half + e2e half in one suite    | `test/continuous-test-suite-autoresearch.ts`       |
| New-provider smoke shape             | `test/continuous-test-suite-new-providers.ts`      |
| Real fixture multimodal              | `test/continuous-test-suite-new-providers.ts` (C1) |
| Anchored skip pattern                | `test/helpers/envGuard.ts`                         |

For the full inventory of suites, tiers, and shared infrastructure,
read `test/README.md`. This skill summarises the **how**; that file
is the **what**.
