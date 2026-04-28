# 07 · Implementation Order & Milestones

## Step-by-step sequence

The order is chosen to validate each pattern at a low-complexity provider before tackling the harder ones.

### Milestone 0 · Foundation (one PR or one commit)

Apply ALL of `01-shared-changes.md` at once, BEFORE writing any provider class:

1. `src/lib/constants/enums.ts` — add 4 enum values + 4 model enums
2. `src/lib/types/providers.ts` — extend `NeurolinkCredentials`
3. `src/lib/utils/providerConfig.ts` — append 4 helpers
4. `src/lib/constants/contextWindows.ts` — add 4 sections
5. `src/lib/adapters/providerImageAdapter.ts` — add 4 entries to `VISION_CAPABILITIES`
6. `src/cli/factories/commandFactory.ts` — 3 spots
7. `.env.example` — append 4 sections

**Do NOT touch yet:**

- `src/lib/factories/providerRegistry.ts` (registrations rely on the provider classes existing)
- `src/lib/providers/index.ts` (same)

**Validation:**

```bash
pnpm run check && pnpm run lint
```

Should pass — adding enum values and types is non-breaking.

---

### Milestone 1 · DeepSeek (validates the cloud-provider pattern)

1. Create `src/lib/providers/deepseek.ts` per `02-deepseek.md`
2. Add registration in `src/lib/factories/providerRegistry.ts` per `01-shared-changes.md` §4
3. Add barrel export in `src/lib/providers/index.ts`
4. Validate:

   ```bash
   pnpm run check
   pnpm run lint
   pnpm run build
   pnpm run build:cli
   pnpm run cli generate "Hi" --provider deepseek
   ```

   (Set `DEEPSEEK_API_KEY` first.)

5. Run `pnpm run test:providers` — DeepSeek should now appear in the loop (passes if API key set, skips otherwise).

**Why first:** DeepSeek is the simplest cloud port. If this doesn't work end-to-end, nothing else will. Fix any pattern issues here.

---

### Milestone 2 · LM Studio (validates the local-server pattern)

1. Create `src/lib/providers/lmStudio.ts` per `04-lm-studio.md`
2. Add registration + barrel export
3. Validate:
   - Open LM Studio, load a model, start server
   - `pnpm run cli generate "Hi" --provider lm-studio`
   - Stop server, re-run — verify friendly error
   - `pnpm run test:providers` should show LM Studio passing or skipping cleanly

**Why second:** Local provider with auto-discovery — exercises a different code path than DeepSeek. Validates the Ollama-style error handling.

---

### Milestone 3 · llama.cpp (clone of LM Studio)

1. Create `src/lib/providers/llamaCpp.ts` per `05-llamacpp.md`
2. Add registration + barrel export
3. Validate:
   - Build llama.cpp, run `./llama-server -m model.gguf --port 8080`
   - `pnpm run cli generate "Hi" --provider llamacpp`
   - Stop server, re-run — verify friendly error

**Why third:** Near-clone of LM Studio. If LM Studio works, this should work with a small set of tweaks.

---

### Milestone 4 · NVIDIA NIM (the complex one)

Before starting, **verify the AI SDK supports `providerOptions.openai.body`** for arbitrary extras (the `ai-sdk-verifier` task). If yes, proceed. If no, switch to the fetch-interception fallback (see `03-nvidia-nim.md`).

1. Create `src/lib/providers/nvidiaNim.ts` per `03-nvidia-nim.md`
2. Add registration + barrel export
3. Validate base case:
   ```bash
   export NVIDIA_NIM_API_KEY="nvapi-..."
   pnpm run cli generate "Hi" --provider nvidia-nim
   ```
4. Validate retry-on-400:
   ```bash
   # Use a model that doesn't support reasoning_budget
   pnpm run cli generate "Hi" --provider nvidia-nim --model google/gemma-3-27b-it --thinking-level high
   # Should succeed (logs: "NIM rejected reasoning_budget; retrying without it")
   ```
5. Validate vision model:
   ```bash
   pnpm run cli generate "Describe" --provider nvidia-nim --model meta/llama-3.2-90b-vision-instruct --image ./test.jpg
   ```

**Why last:** NIM has the largest surface area (extra body params, retry, model catalog). All the simpler patterns must be validated first.

---

### Milestone 5 · Tests + Documentation

1. Add per-call credential tests for all 4 (`test/continuous-test-suite-credentials.ts`) per `06-testing.md`
2. Add NIM-specific retry test (`test/continuous-test-suite-providers.ts`)
3. Update `docs/getting-started/environment-variables.md` (add new env var sections)
4. Update `docs/features/` with a new `local-providers.md` mentioning LM Studio + llama.cpp
5. Optional: extend `src/cli/utils/interactiveSetup.ts` with wizard steps
6. Optional: README mention in the provider table

---

## Per-milestone gate (run before next milestone)

```bash
pnpm run check     # type check
pnpm run lint      # ESLint
pnpm run build     # full build
```

If any gate fails, fix before proceeding. Common failures:

| Failure                               | Fix                                                                                                      |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `no-interface`                        | Convert `interface X {}` to `type X = {}`                                                                |
| `unique-type-names`                   | Prefix exported types (`DeepSeekModelInfo` not `ModelInfo`)                                              |
| `barrel-type-imports`                 | Import types from `../types/index.js`                                                                    |
| `Cannot find name 'X'` after enum add | Re-import in `providerRegistry.ts`                                                                       |
| Circular import error                 | The provider class imported at module top — move to dynamic `await import()` inside the registry factory |

---

## Risk register

| Risk                                                                                 | Likelihood | Mitigation                                                            |
| ------------------------------------------------------------------------------------ | ---------- | --------------------------------------------------------------------- |
| `@ai-sdk/openai` doesn't support `providerOptions.openai.body`                       | Medium     | Fetch interception fallback (in `03-nvidia-nim.md`)                   |
| Vercel AI SDK v5 vs v6 stream API differences                                        | Low        | Already validated by reading mistral.ts which uses the current API    |
| LM Studio's `/v1/models` returns empty when no model loaded                          | High       | Fallback to `"local-model"` literal; user-facing error is clear       |
| llama.cpp doesn't expose `/health` on older builds                                   | Low        | Fallback to `/v1/models` for the health probe                         |
| NIM model catalog drift breaks our enum                                              | Low        | Enum is for autocomplete only; arbitrary IDs accepted via `--model`   |
| ESLint rules trip on a hidden type re-export                                         | Medium     | Always import from `../types/index.js`, never `../types/providers.js` |
| Backward-compat for existing `--provider` CLI flag                                   | Low        | We only ADD to choices array; existing values unchanged               |
| `NeurolinkCredentials` extension breaks consumers using `keyof NeurolinkCredentials` | Low        | All entries are optional `?:`; type is open by design                 |

---

## Total scope estimate

| Item                       | Effort                                           |
| -------------------------- | ------------------------------------------------ |
| Milestone 0 (foundation)   | 2-3 hours                                        |
| Milestone 1 (DeepSeek)     | 2 hours                                          |
| Milestone 2 (LM Studio)    | 3 hours (more error-case testing)                |
| Milestone 3 (llama.cpp)    | 1 hour (clone of LM Studio)                      |
| Milestone 4 (NVIDIA NIM)   | 5-6 hours (extras + retry + manual verification) |
| Milestone 5 (tests + docs) | 3 hours                                          |
| **Total**                  | **~16-18 hours**                                 |

| Code metric          | Value                                               |
| -------------------- | --------------------------------------------------- |
| New TypeScript files | 4                                                   |
| Lines of new TS      | ~1,000                                              |
| Lines of new docs    | ~3,500 (this folder + interactive setup + features) |
| Edited files         | 11 (some touched once for all 4 providers)          |

---

## Definition of done

- [ ] All 4 providers registered in `providerRegistry.ts`
- [ ] All 4 in `providers/index.ts` barrel
- [ ] `pnpm run check && pnpm run lint && pnpm run build` all pass
- [ ] `pnpm run test:providers` passes (with new providers either succeeding or skipping cleanly)
- [ ] `pnpm run cli generate "hi" --provider <each-of-4>` works manually with valid env
- [ ] Stopping LM Studio / llama.cpp servers produces user-friendly error
- [ ] NIM retry-on-400 verified manually with a model that rejects `reasoning_budget`
- [ ] `.env.example` documents new env vars
- [ ] At least one per-call credential test per provider in `continuous-test-suite-credentials.ts`
- [ ] Brief mention in main `README.md` provider table
