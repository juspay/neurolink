# 06 · Testing Strategy

## Test runner facts

- All tests use `tsx` directly — there is no `vitest`/`jest` runner despite `vitest.config.ts` existing
- Each suite is a standalone `test/continuous-test-suite-<name>.ts` script; it logs pass/fail and exits with code 0/1
- The orchestrator is `test/continuous-test-suite.ts` (run via `pnpm test`)
- All tests read env vars; missing-credential is treated as **skip** (not fail) for provider tests

## Files to edit

### A. `test/continuous-test-suite-providers.ts`

This is the main provider suite. The relevant section is the `ALL_PROVIDERS` array (around line 73):

```diff
 const ALL_PROVIDERS = [
   "openai",
   "anthropic",
   "vertex",
   "google-ai",
   "openrouter",
   "bedrock",
   "azure",
   "mistral",
   "ollama",
   "litellm",
   "huggingface",
+  "deepseek",
+  "nvidia-nim",
+  "lm-studio",
+  "llamacpp",
 ] as const;
```

The all-provider loop at the bottom of this file iterates `ALL_PROVIDERS` and:

1. Calls `validateConfiguration()` on the provider
2. Skips with `[SKIP] env not configured` if it returns false
3. Otherwise runs `generate("Hi")` and `stream("Hi")`

For local providers (LM Studio, llama.cpp), the skip behavior already works because `validateConfiguration()` does an HTTP probe of `/v1/models` or `/health`. If the server isn't running, returns false → tests skip.

### B. `test/continuous-test-suite-credentials.ts`

For each new provider, add a per-call credential-override test block. Use the existing Mistral block as the template (search for `"mistral"` in the file):

```ts
// DeepSeek credential override
await runTest("deepseek per-call apiKey override", async () => {
  if (!process.env.DEEPSEEK_API_KEY) {
    console.log(
      `  ${colors.yellow}[SKIP]${colors.reset} DEEPSEEK_API_KEY not set`,
    );
    return null; // skipped scenarios MUST return null so the runner records SKIP
  }
  const nl = new NeuroLink();
  const result = await nl.generate({
    input: { text: "Reply with the word PONG and nothing else." },
    provider: "deepseek",
    credentials: { deepseek: { apiKey: process.env.DEEPSEEK_API_KEY } },
    maxTokens: 16,
  });
  assert(typeof result?.content === "string", "should return content");
});

// NVIDIA NIM credential override
await runTest("nvidia-nim per-call apiKey override", async () => {
  if (!process.env.NVIDIA_NIM_API_KEY) {
    console.log(
      `  ${colors.yellow}[SKIP]${colors.reset} NVIDIA_NIM_API_KEY not set`,
    );
    return null;
  }
  const nl = new NeuroLink();
  const result = await nl.generate({
    input: { text: "Reply with PONG only." },
    provider: "nvidia-nim",
    credentials: { nvidiaNim: { apiKey: process.env.NVIDIA_NIM_API_KEY } },
    maxTokens: 16,
  });
  assert(typeof result?.content === "string", "should return content");
});

// LM Studio credential override (baseURL only)
await runTest("lm-studio per-call baseURL override", async () => {
  const url = process.env.LM_STUDIO_BASE_URL || "http://localhost:1234/v1";
  // Skip if server not reachable
  try {
    const r = await fetch(`${url.replace(/\/$/, "")}/models`);
    if (!r.ok) throw new Error("not ok");
  } catch {
    console.log(
      `  ${colors.yellow}[SKIP]${colors.reset} LM Studio not running at ${url}`,
    );
    return null; // SKIP scenarios MUST return null so the runner records SKIP
  }
  const nl = new NeuroLink();
  const result = await nl.generate({
    input: { text: "Reply with PONG only." },
    provider: "lm-studio",
    credentials: { lmStudio: { baseURL: url } },
    maxTokens: 16,
  });
  assert(typeof result?.content === "string", "should return content");
});

// llama.cpp credential override
await runTest("llamacpp per-call baseURL override", async () => {
  const url = process.env.LLAMACPP_BASE_URL || "http://localhost:8080/v1";
  try {
    const r = await fetch(`${url.replace(/\/$/, "")}/models`);
    if (!r.ok) throw new Error("not ok");
  } catch {
    console.log(
      `  ${colors.yellow}[SKIP]${colors.reset} llama-server not running at ${url}`,
    );
    return null;
  }
  const nl = new NeuroLink();
  const result = await nl.generate({
    input: { text: "Reply with PONG only." },
    provider: "llamacpp",
    credentials: { llamacpp: { baseURL: url } },
    maxTokens: 16,
  });
  assert(typeof result?.content === "string", "should return content");
});
```

### C. `test/continuous-test-suite.ts` (orchestrator)

Likely no changes needed — it invokes per-domain suites which are already wired.

### D. `package.json`

The canonical entrypoint for the four new providers is **`pnpm run test:new-providers`**, which runs the dedicated suite `test/continuous-test-suite-new-providers.ts` (full feature surface per provider — generate, stream, tools, structured, reasoning, vision-where-supported, abort, timeout, per-call creds, telemetry, error formatting). The existing `test:providers` (`ALL_PROVIDERS` loop) and `test:credentials` are still useful for cross-provider checks but the new suite is the primary coverage for the integration.

## NVIDIA NIM-specific test (the only one that needs custom assertions)

NIM has unique behavior (extra-body params, retry-on-400). Add a focused test inside `test/continuous-test-suite-providers.ts`:

```ts
await runTest("nvidia-nim retry strips reasoning_budget on 400", async () => {
  if (!process.env.NVIDIA_NIM_API_KEY) {
    console.log(`  [SKIP] NIM not configured`);
    return;
  }
  const nl = new NeuroLink();
  // Use a model known NOT to support reasoning_budget — should still succeed via retry
  const result = await nl.generate({
    input: { text: "Hi" },
    provider: "nvidia-nim",
    model: "google/gemma-3-27b-it", // doesn't support reasoning_budget
    thinkingLevel: "high", // forces our code to add the field
    maxTokens: 32,
  });
  assert(typeof result?.text === "string", "should succeed via retry");
});
```

## Smoke test scripts

Add (optional) to `test/`:

```bash
# test/test-deepseek.sh
#!/usr/bin/env bash
set -euo pipefail
[ -z "${DEEPSEEK_API_KEY:-}" ] && { echo "DEEPSEEK_API_KEY not set"; exit 1; }
pnpm run cli generate "Reply: PONG" --provider deepseek

# test/test-nvidia-nim.sh
#!/usr/bin/env bash
set -euo pipefail
[ -z "${NVIDIA_NIM_API_KEY:-}" ] && { echo "NVIDIA_NIM_API_KEY not set"; exit 1; }
pnpm run cli generate "Reply: PONG" --provider nvidia-nim
pnpm run cli generate "Solve 17!" --provider nvidia-nim --model nvidia/llama-3.3-nemotron-super-49b-v1 --thinking-level high

# test/test-lm-studio.sh
#!/usr/bin/env bash
set -euo pipefail
echo "Make sure LM Studio is running with a model loaded"
pnpm run cli generate "Reply: PONG" --provider lm-studio

# test/test-llamacpp.sh
#!/usr/bin/env bash
set -euo pipefail
echo "Make sure ./llama-server is running on :8080"
pnpm run cli generate "Reply: PONG" --provider llamacpp
```

## Validation pipeline

After implementing each provider:

```bash
pnpm run check                     # type check
pnpm run lint                      # ESLint (rules 1-13)
pnpm run build                     # full build
pnpm run test:providers            # all-provider loop (skips unconfigured)
pnpm run test:credentials          # per-call credential overrides
```

For the all-provider loop to actually exercise the new provider (vs skip), set the relevant env vars in your local `.env`. Local providers (LM Studio, llama.cpp) need their servers running; cloud providers (DeepSeek, NVIDIA NIM) need API keys.

## CI considerations

Cloud-provider tests with real API calls cost money. Two options:

1. **Skip in CI by default** — current pattern. Tests only run if env vars are set; CI can set them as secrets for nightly runs.
2. **Mock the AI SDK** — adds complexity; not recommended for v1.

Local-provider tests are fine in CI ONLY if the runner has the local server installed and pre-loaded. For now, expect CI to skip LM Studio and llama.cpp tests.

## Manual matrix (run before merging)

| Provider   | Test                                                                                                                                                        |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DeepSeek   | `--provider deepseek` text gen, then `--model deepseek-reasoner` to verify reasoning                                                                        |
| NVIDIA NIM | `--provider nvidia-nim` default model, then `--thinking-level high` on a Nemotron model, then a model that does NOT support reasoning_budget (verify retry) |
| LM Studio  | Start server with a small Llama model, run text gen + tool gen ("write me a 3-line poem")                                                                   |
| LM Studio  | Stop server, run again — verify error message is the friendly "Open LM Studio app..." form                                                                  |
| llama.cpp  | Start server with `--jinja`, run text gen and tool gen                                                                                                      |
| llama.cpp  | Stop server, run again — verify error message instructs `./llama-server -m ...`                                                                             |
| All        | Run `pnpm run test:credentials` — all four per-call override tests should pass or skip cleanly                                                              |
