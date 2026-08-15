# CI Safety Net Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give NeuroLink's provider layer a CI safety net that runs on every PR with zero API keys — structural registry checks plus mocked request/response/error-mapping contracts for the five highest-traffic providers — and wire it into branch protection, pre-push, and a separate nightly live-credential sweep, so a broken provider integration fails CI instead of shipping silently.

**Architecture:** Two zero-API structural checks are extracted from the live-credential `continuous-test-suite-providers.ts` into a standalone suite so they can run without secrets; a new required CI job runs build freshness + that suite + the existing mocked-contract suite; the mocked-contract suite gains five new provider sections (OpenAI, Azure, Anthropic via real `fetch` interception; Vertex, Bedrock via construction + `formatProviderError` contract, since their SDKs bypass `globalThis.fetch`); branch protection, the `pre-push` hook, and a scheduled `live-matrix.yml` workflow are updated to match; stale docs/comments are corrected in place.

**Tech Stack:** TypeScript, tsx (no vitest runner), pnpm, GitHub Actions, Husky v9, `test/helpers/harness.ts` (`defineSuite`/`test`/`assert`), `test/utils/mockFetch.ts` (`installMockFetch`/`record`/`expect`/`expectEq`).

**Spec:** Verified architecture-audit reports for NeuroLink's provider-scaling initiative (CI/testing-coverage gap analysis), treated as spec; this plan additionally re-verifies every referenced line of source/config against the current `feat/proider-redesign` worktree as of 2026-08-15 (see inline file/line citations in each task).

## Global Constraints

- pnpm ONLY. Build: `pnpm run build`. Typecheck: `pnpm run check`. Lint: `pnpm run lint`.
- Tests run via tsx, NOT vitest: `npx tsx test/continuous-test-suite-<name>.ts`; new suites need a matching `test:<name>` script in `package.json`.
- **TEST HARNESS SKIP HAZARD:** `defineSuite`'s `test()` classifies a thrown error as SKIP (not FAIL) when the message starts with `SKIP:`, is a `Skip` instance, or matches `isExpectedProviderError()` from `test/helpers/envGuard.ts`. **Never interpolate raw payloads/error text into `assert()` messages** — describe the mismatch abstractly (e.g. `` `${failures.length} registry/filesystem mismatch(es) found` ``, not the raw diff). `test/utils/mockFetch.ts`'s `record()`/`expect()`/`expectEq()` helpers do **not** do SKIP classification (confirmed by reading the full 232-line file: `record()` just pushes `{name, ok, reason}`) — so this hazard applies to Task 1's new suite (uses `defineSuite`/`assert()`) but not to Tasks 5-9 (extend the `record()`/`expect()`-based mocked suite, which has no skip concept at all).
- Repo rules (from `CLAUDE.md`): dynamic imports only in `providerRegistry.ts`; all types in `src/lib/types/`; no `interface` (always `type`); unique type names across `src/lib/types/`; barrel `export *` only; barrel-only type imports outside `src/lib/types/`; no double type assertions (`x as unknown as T`) in `src/` — **except test files, which are explicitly exempt under rule 14**, used here in Tasks 8-9 to invoke `protected` `formatProviderError`.
- Conventional commits; one commit per task; **NEVER `git push`**.
- **Plan-specific constraint:** every new/modified mocked-provider test section must assert on values already confirmed against the live `formatProviderError`/constructor source in this plan's task bodies — no guessed error-classifier behavior.

---

### Task 1: Extract zero-API provider-structure checks into a standalone suite

**Files:**

- Create: `test/continuous-test-suite-provider-structure.ts`
- Modify: `test/continuous-test-suite-providers.ts` (remove the two extracted functions + their `tests` array entries + the now-dead `path` import)
- Modify: `package.json` (add `test:provider-structure` script)

**Interfaces:**

- Consumes: `defineSuite`, `assert` from `./helpers/harness.js`; `assertDistFresh` from `./helpers/distFreshness.js`; `../dist/index.js` (`AIProviderName`), `../dist/lib/factories/providerRegistry.js` (`ProviderRegistry`), `../dist/lib/factories/providerFactory.js` (`ProviderFactory`), `../dist/lib/constants/enums.js` (`AIProviderName`).
- Produces: new script `test/continuous-test-suite-provider-structure.ts` runnable via `pnpm run test:provider-structure`; two named checks — `"Model Registry Completeness"`, `"Provider Registration Completeness"`.

**Why extract (justification for keep-or-remove):** `testModelRegistryCompleteness` (`test/continuous-test-suite-providers.ts:2057-2178`) and `testProviderRegistrationCompleteness` (`:2195-2366`) make zero live API calls — they only inspect `dist/` artifacts and the filesystem — but they currently live in a suite (`test:providers`) that also runs ~30 other tests requiring real provider credentials, so nothing exercises them on a plain PR from a contributor without keys. Extracting (not duplicating) into a standalone suite lets Task 2 gate every PR on them without also requiring secrets. The functions are **removed** from the original file (not kept in both places) to avoid double maintenance — the original file's `"Provider Base Class Inheritance"` test (`checkProviderBaseClasses`, immediately following in the `tests` array) stays untouched since it is unrelated in scope and this plan doesn't touch it.

Steps:

- [ ] 1.1 Verify current state before editing — confirm the two functions and their `tests` array entries are exactly where expected:

  ```bash
  grep -n "^async function testModelRegistryCompleteness\|^async function testProviderRegistrationCompleteness\|^async function testProviderBaseClassInheritance" test/continuous-test-suite-providers.ts
  ```

  Expected output (line numbers as of this plan; re-anchor on the function names if they've drifted):

  ```
  2057:async function testModelRegistryCompleteness(): Promise<boolean | null> {
  2195:async function testProviderRegistrationCompleteness(): Promise<boolean | null> {
  2369:async function testProviderBaseClassInheritance(): Promise<boolean | null> {
  ```

- [ ] 1.2 Create `test/continuous-test-suite-provider-structure.ts` with the full converted suite (legacy `logTest`-based functions rewritten as modern `test()`/`assert()` blocks, per the `test/continuous-test-suite-agent-delegation.ts` exemplar pattern — `defineSuite(name)` → top-level `await test(name, fn)` calls → bare `await runSuite();` as the last line):

  ```typescript
  #!/usr/bin/env tsx
  import "dotenv/config";

  /**
   * Continuous Test Suite — Provider Structure
   *
   * Zero-API structural checks that verify the provider registry stays
   * internally consistent as new providers are added: every value in the
   * canonical AIProviderName enum resolves via ProviderFactory, and every
   * concrete provider module under src/lib/providers/ has exactly one
   * dynamic import in providerRegistry.ts — no orphaned imports left behind
   * when a provider file is renamed or removed, no provider added to the
   * enum without also being wired into the registry.
   *
   * Split out of continuous-test-suite-providers.ts (which needs live API
   * keys for its other ~30 tests) so these two checks can run on every
   * commit with zero credentials, zero network calls, and a fast (<5s)
   * runtime — see docs/superpowers/plans/2026-08-15-02-ci-safety-net.md
   * Task 1.
   *
   * Run: npx tsx test/continuous-test-suite-provider-structure.ts
   *      pnpm run test:provider-structure
   */

  import * as fs from "fs";
  import * as path from "path";
  import { assert, defineSuite } from "./helpers/harness.js";
  import { assertDistFresh } from "./helpers/distFreshness.js";

  // Fail loudly rather than silently testing a stale build.
  assertDistFresh();

  const { test, runSuite } = defineSuite("Provider Structure");

  /**
   * Modules under src/lib/providers/ that are not ProviderRegistry entries
   * (barrel, shared helpers, legacy alternate). Keep in sync with any new
   * non-provider file added directly under src/lib/providers/.
   */
  const PROVIDER_REGISTRATION_EXCLUSIONS = new Set([
    "index",
    "providerTypeUtils",
    "anthropicBaseProvider",
    "googleNativeGemini3",
  ]);

  const DYNAMIC_PROVIDER_IMPORT_RE =
    /import\s*\(\s*["']\.\.\/providers\/([A-Za-z][\w-]*)\.js["']\s*\)/g;

  await test("Model Registry Completeness", async () => {
    const distModule = await import("../dist/index.js");

    const expectedProviders = [
      "openai",
      "anthropic",
      "vertex",
      "google-ai",
      "bedrock",
      "azure",
      "ollama",
      "mistral",
      "litellm",
      "huggingface",
      "openrouter",
      "openai-compatible",
      "sagemaker",
      "deepseek",
      "nvidia-nim",
      "lm-studio",
      "llamacpp",
      "xai",
      "groq",
      "cohere",
      "together-ai",
      "fireworks",
      "perplexity",
      "cloudflare",
      "voyage",
      "jina",
      "stability",
      "ideogram",
      "recraft",
      "replicate",
    ];

    const aiProviderName = distModule.AIProviderName as
      | Record<string, unknown>
      | undefined;
    assert(!!aiProviderName, "AIProviderName enum not exported from dist");

    const providerValues = Object.values(
      aiProviderName as Record<string, unknown>,
    ).filter((v) => typeof v === "string") as string[];

    const missingProviders = expectedProviders.filter(
      (p) => !providerValues.includes(p),
    );
    assert(
      missingProviders.length === 0,
      `enum missing ${missingProviders.length} expected provider id(s)`,
    );

    const modelEnums = [
      "OpenAIModels",
      "AnthropicModels",
      "VertexModels",
      "GoogleAIModels",
      "BedrockModels",
      "MistralModels",
      "OllamaModels",
    ];
    const requiredEnums = ["OpenAIModels", "VertexModels", "BedrockModels"];

    const presentEnums = modelEnums.filter(
      (enumName) => !!(distModule as Record<string, unknown>)[enumName],
    );
    const missingRequired = requiredEnums.filter(
      (e) => !presentEnums.includes(e),
    );
    assert(
      missingRequired.length === 0,
      `dist is missing ${missingRequired.length} required model enum(s)`,
    );
  });

  await test("Provider Registration Completeness", async () => {
    const providersDir = path.join(process.cwd(), "src", "lib", "providers");
    const registryPath = path.join(
      process.cwd(),
      "src",
      "lib",
      "factories",
      "providerRegistry.ts",
    );

    assert(
      fs.existsSync(providersDir) && fs.existsSync(registryPath),
      "providers/ or providerRegistry.ts not found (run from repo root)",
    );

    const registrySource = fs.readFileSync(registryPath, "utf8");
    const concreteProviders = fs
      .readdirSync(providersDir)
      .filter((name) => name.endsWith(".ts"))
      .map((name) => name.replace(/\.ts$/, ""))
      .filter((base) => !PROVIDER_REGISTRATION_EXCLUSIONS.has(base))
      .sort();

    const importCounts = new Map<string, number>();
    for (const match of registrySource.matchAll(DYNAMIC_PROVIDER_IMPORT_RE)) {
      const base = match[1];
      importCounts.set(base, (importCounts.get(base) ?? 0) + 1);
    }

    const failures: string[] = [];

    for (const base of concreteProviders) {
      const count = importCounts.get(base) ?? 0;
      if (count === 0) {
        failures.push(`missing dynamic import: ${base}`);
      } else if (count > 1) {
        failures.push(`duplicate dynamic import: ${base} (${count}x)`);
      }

      const source = fs.readFileSync(
        path.join(providersDir, `${base}.ts`),
        "utf8",
      );
      if (!/export\s+class\s+\w+/.test(source)) {
        failures.push(`no exported class in ${base}.ts`);
      }
    }

    for (const [base, count] of [...importCounts.entries()].sort()) {
      if (!fs.existsSync(path.join(providersDir, `${base}.ts`))) {
        failures.push(
          `stale dynamic import: ${base}.js (${count}x, file missing)`,
        );
      }
    }

    assert(
      failures.length === 0,
      `${failures.length} registry/filesystem mismatch(es) found`,
    );

    const { ProviderRegistry } =
      await import("../dist/lib/factories/providerRegistry.js");
    const { ProviderFactory } =
      await import("../dist/lib/factories/providerFactory.js");
    const { AIProviderName } = await import("../dist/lib/constants/enums.js");

    ProviderRegistry.clearRegistrations();
    await ProviderRegistry.registerAllProviders();

    const canonicalIds = Object.values(AIProviderName)
      .filter(
        (v): v is string => typeof v === "string" && v !== AIProviderName.AUTO,
      )
      .sort();

    assert(
      new Set(canonicalIds).size === canonicalIds.length,
      "duplicate AIProviderName values detected",
    );

    const unresolved = canonicalIds.filter(
      (id) => !ProviderFactory.hasProvider(id),
    );
    assert(
      unresolved.length === 0,
      `${unresolved.length} canonical id(s) not resolvable via ProviderFactory`,
    );

    assert(
      !ProviderFactory.hasProvider(AIProviderName.AUTO),
      "AUTO must not be registered as a concrete provider",
    );

    const claimedKeys = new Map<string, string>();
    const keyCollisions: string[] = [];
    for (const id of canonicalIds) {
      const info = ProviderFactory.getProviderInfo(id);
      if (!info) {
        keyCollisions.push(`${id}: missing registration info`);
        continue;
      }
      const keys = [
        id.toLowerCase(),
        ...(info.aliases ?? []).map((a) => a.toLowerCase()),
      ];
      for (const key of keys) {
        const owner = claimedKeys.get(key);
        if (owner && owner !== id) {
          keyCollisions.push(`key "${key}" claimed by ${owner} and ${id}`);
        } else {
          claimedKeys.set(key, id);
        }
      }
      for (const alias of info.aliases ?? []) {
        if (ProviderFactory.getProviderInfo(alias) !== info) {
          keyCollisions.push(
            `alias "${alias}" does not resolve to primary "${id}"`,
          );
        }
      }
    }

    assert(
      keyCollisions.length === 0,
      `${keyCollisions.length} alias/key collision(s) found`,
    );
  });

  await runSuite();
  ```

- [ ] 1.3 Add the npm script — edit `package.json`, insert immediately after the `test:providers-mocked` line (`package.json:105`):

  ```diff
       "test:providers-mocked": "npx tsx test/continuous-test-suite-providers-mocked.ts",
  +    "test:provider-structure": "npx tsx test/continuous-test-suite-provider-structure.ts",
       "test:provider-fallback": "npx tsx test/continuous-test-suite-provider-fallback.ts",
  ```

- [ ] 1.4 Build and run the new suite standalone to confirm it passes against the current registry before touching the source file:

  ```bash
  pnpm run build && pnpm run test:provider-structure
  ```

  Expected output ends with:

  ```
  ✓ Model Registry Completeness
  ✓ Provider Registration Completeness
  ...
  ```

  and exits 0.

- [ ] 1.5 Commit the new suite on its own before removing anything from the original file, so the extraction is reviewable as "add" then "remove":

  ```bash
  git add test/continuous-test-suite-provider-structure.ts package.json
  git commit -m "test: extract zero-API provider structure checks into standalone suite"
  ```

- [ ] 1.6 Remove the now-duplicated logic from `test/continuous-test-suite-providers.ts`. Delete the full block spanning from the `testModelRegistryCompleteness` function declaration through the end of `testProviderRegistrationCompleteness` (inclusive of `PROVIDER_REGISTRATION_EXCLUSIONS` and `DYNAMIC_PROVIDER_IMPORT_RE`, which are used only by the removed function) — lines 2057-2366 as of this plan. Use the exact start/end anchors to delete precisely regardless of minor line drift:

  ```bash
  START=$(grep -n "^async function testModelRegistryCompleteness" test/continuous-test-suite-providers.ts | cut -d: -f1)
  END=$(grep -n "^async function testProviderBaseClassInheritance" test/continuous-test-suite-providers.ts | head -1 | cut -d: -f1)
  END=$((END - 2))
  sed -i '' "${START},${END}d" test/continuous-test-suite-providers.ts
  ```

  (`END - 2` drops the trailing blank line and section-comment line immediately preceding `testProviderBaseClassInheritance`, leaving exactly one blank line before it — verify with step 1.7.)

- [ ] 1.7 Remove the two now-dead entries from the `tests` array (the `"Model Registry Completeness"` and `"Provider Registration Completeness"` blocks, originally at lines 3755-3763), leaving the immediately-following `"Provider Base Class Inheritance"` entry untouched:

  ```diff
       {
  -      name: "Model Registry Completeness",
  -      fn: testModelRegistryCompleteness,
  -    },
  -    {
  -      name: "Provider Registration Completeness",
  -      fn: testProviderRegistrationCompleteness,
  -    },
  -    {
         name: "Provider Base Class Inheritance",
         fn: testProviderBaseClassInheritance,
       },
  ```

- [ ] 1.8 Remove the now-dead `path` import (`import * as path from "path";`, originally line 26) — `fs` stays, it's still used elsewhere in the file:

  ```bash
  grep -n '^import \* as path from "path";$' test/continuous-test-suite-providers.ts
  ```

  Confirm exactly one match, then delete that line. Confirm `fs` is still referenced afterward:

  ```bash
  grep -c 'fs\.' test/continuous-test-suite-providers.ts
  ```

  Expected: a positive count (fs is used at multiple other locations in the file, outside the removed functions).

- [ ] 1.9 Typecheck and confirm no dangling references to the removed functions/constants remain:

  ```bash
  pnpm run check
  grep -n "testModelRegistryCompleteness\|testProviderRegistrationCompleteness\|PROVIDER_REGISTRATION_EXCLUSIONS\|DYNAMIC_PROVIDER_IMPORT_RE" test/continuous-test-suite-providers.ts
  ```

  Expected: `pnpm run check` exits 0; the `grep` finds zero matches.

- [ ] 1.10 Rebuild and run both the original suite (minus its structural tests, still needs live keys for the rest — acceptable to run locally with whatever keys are configured, or skip if none) and the new standalone suite, to confirm nothing regressed structurally:

  ```bash
  pnpm run build && pnpm run test:provider-structure
  ```

  Expected: same `✓ Model Registry Completeness` / `✓ Provider Registration Completeness` output as step 1.4, confirming the extraction preserved identical behavior.

- [ ] 1.11 Commit the removal:

  ```bash
  git add test/continuous-test-suite-providers.ts
  git commit -m "refactor(test): remove structural checks now covered by continuous-test-suite-provider-structure"
  ```

---

### Task 2: Add a required `provider-safety-net` CI job

**Files:**

- Modify: `.github/workflows/ci.yml` (add new job after `test:`, lines 10-84; replace the no-op step in `quality-gate`, lines 301-305)

**Interfaces:**

- Consumes: `pnpm run build`, `pnpm run test:providers-mocked`, `pnpm run test:provider-structure` (script added in Task 1).
- Produces: new required GitHub Actions job `provider-safety-net`, whose check-run name (no `name:`/`strategy:` set) is literally `provider-safety-net` — the exact context string used in Task 3's branch-protection fix.

Steps:

- [ ] 2.1 Verify the current job list and the no-op step before editing:

  ```bash
  grep -n "^  [a-z].*:$" .github/workflows/ci.yml
  sed -n '295,310p' .github/workflows/ci.yml
  ```

  Expected job list: `test:`, `build-check:`, `proxy-performance:`, `quality-gate:`, `semantic-release-validation:` (plus a commented-out `# action-smoke-test:` block). Expected `sed` output includes:

  ```yaml
  - name: 🎯 Test Suite Validation
    run: |
      echo "🎯 Comprehensive test validation would run here"
      echo "Skipping automated test execution in CI for now"
    continue-on-error: true
  ```

- [ ] 2.2 Insert the new job immediately after the `test:` job's closing (right before the commented `# action-smoke-test:` block that starts at line 86):

  ```yaml
  provider-safety-net:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup PNPM
        uses: pnpm/action-setup@v4
        with:
          version: 10.15.1

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "22"
          cache: "pnpm"

      - name: Install dependencies
        run: pnpm install

      - name: 🔄 SvelteKit Sync
        run: |
          echo "🔄 Running SvelteKit sync to generate TypeScript configs..."
          pnpm exec svelte-kit sync

      - name: Build package
        run: pnpm run build

      - name: Mocked provider contract tests (no API keys required)
        run: pnpm run test:providers-mocked

      - name: Provider structure tests (registry ↔ filesystem, no API keys required)
        run: pnpm run test:provider-structure
  ```

- [ ] 2.3 Replace the no-op `quality-gate` step (lines 301-305 as of this plan) — remove it entirely, since real validation now runs in the dedicated `provider-safety-net` job instead of being faked here:

  ```diff
  -      - name: 🎯 Test Suite Validation
  -        run: |
  -          echo "🎯 Comprehensive test validation would run here"
  -          echo "Skipping automated test execution in CI for now"
  -        continue-on-error: true
  -
  ```

- [ ] 2.4 Validate the YAML parses (GitHub Actions has no local `act`-free linter in this repo, so use a YAML syntax check):

  ```bash
  npx -y js-yaml .github/workflows/ci.yml > /dev/null && echo "YAML OK"
  ```

  Expected: `YAML OK`.

- [ ] 2.5 Confirm the referenced scripts actually exist and pass locally (this is what CI will run):

  ```bash
  pnpm run build && pnpm run test:providers-mocked && pnpm run test:provider-structure
  ```

  Expected: all three commands exit 0.

- [ ] 2.6 Commit:

  ```bash
  git add .github/workflows/ci.yml
  git commit -m "ci: add required provider-safety-net job, remove no-op test-validation step"
  ```

---

### Task 3: Fix branch-protection contexts and the `test` job matrix mismatch

**Files:**

- Modify: `.github/settings.yml` (two duplicate `branches: - name: release` protection blocks, lines 173-192 and 193-210)
- Modify: `.github/workflows/ci.yml` (`test:` job's `strategy: matrix:` block, lines 10-28)

**Interfaces:**

- Produces: `.github/settings.yml` required-context list `["test", "build-check", "provider-safety-net", "Yama PR Review"]`, all four of which now match real, unmatrixed job/check-run names in `ci.yml`.

**Decision — drop the matrix, don't update the context string:** `ci.yml`'s `test:` job currently reports as `test (20)` because of a single-entry `node-version: [20]` matrix (`.github/workflows/ci.yml:12-14`), while `.github/settings.yml` requires the literal context `"test"`. Two fixes are possible: (a) change `settings.yml` to require `"test (20)"`, or (b) drop the single-entry matrix so the job reports as plain `"test"`. Choosing (b): a matrix with exactly one entry provides no coverage benefit (it doesn't test multiple Node versions), and the suffixed context name is themselves fragile — any future change to the matrix values (e.g. adding Node 22) silently changes the required-check string and re-breaks branch protection the same way "build" broke. A flat job name has no such failure mode.

Steps:

- [ ] 3.1 Verify current mismatch before editing:

  ```bash
  sed -n '10,28p' .github/workflows/ci.yml
  grep -n 'contexts:\|"test"\|"build"\|"Yama PR Review"' .github/settings.yml
  ```

  Expected: `ci.yml` shows `strategy: matrix: node-version: [20]` and `${{ matrix.node-version }}` used at two points; `settings.yml` shows the string `"build"` appearing twice (once per duplicated block) with no job in `ci.yml` named `build` (the real job is `build-check`).

- [ ] 3.2 Drop the matrix in `ci.yml`'s `test:` job, hardcoding Node 20:

  ```diff
     test:
       runs-on: ubuntu-latest
  -    strategy:
  -      matrix:
  -        node-version: [20]
       steps:
         - name: Checkout code
           uses: actions/checkout@v4

         - name: Setup PNPM
           uses: pnpm/action-setup@v4
           with:
             version: 10.15.1

  -      - name: Setup Node.js ${{ matrix.node-version }}
  +      - name: Setup Node.js 20
           uses: actions/setup-node@v4
           with:
  -          node-version: ${{ matrix.node-version }}
  +          node-version: "20"
             cache: "pnpm"
  ```

- [ ] 3.3 Fix both duplicate `contexts:` blocks in `.github/settings.yml` in one pass (the two blocks are byte-identical, so a single `replace_all` edit covers both):

  ```diff
           contexts:
             - "test"
  -          - "build"
  +          - "build-check"
  +          - "provider-safety-net"
             # AI code review — fails only on a Yama BLOCKED verdict (see
             # .github/workflows/yama-review.yml + yama.config.yaml).
             - "Yama PR Review"
  ```

- [ ] 3.4 Confirm both blocks now match by re-grepping:

  ```bash
  grep -n '"test"\|"build-check"\|"provider-safety-net"\|"build"$' .github/settings.yml
  ```

  Expected: `"test"`, `"build-check"`, `"provider-safety-net"` each appear exactly twice (once per duplicated protection block); zero remaining bare `"build"` matches.

- [ ] 3.5 Validate both YAML files parse:

  ```bash
  npx -y js-yaml .github/workflows/ci.yml > /dev/null && echo "ci.yml OK"
  npx -y js-yaml .github/settings.yml > /dev/null && echo "settings.yml OK"
  ```

  Expected: both print `OK`.

- [ ] 3.6 Confirm the `test` job still runs correctly without the matrix:

  ```bash
  pnpm run build
  ```

  Expected: exits 0 (this is a stand-in for the job's actual CI steps, which are unchanged besides the matrix removal).

- [ ] 3.7 Commit:

  ```bash
  git add .github/workflows/ci.yml .github/settings.yml
  git commit -m "ci: fix required-context drift — build-check/provider-safety-net, drop single-entry test matrix"
  ```

---

### Task 4: Wire `pre-push` to a real Husky hook running the cheap no-API tier

**Files:**

- Modify: `package.json` (`pre-push` script, line 226)
- Create: `.husky/pre-push`

**Interfaces:**

- Consumes: `pnpm run build`, `pnpm run test:providers-mocked`, `pnpm run test:provider-structure` (same three commands as the CI job in Task 2, so a local push fails exactly what CI would fail, before it's pushed).

Steps:

- [ ] 4.1 Verify current state — `pre-push` script exists but no `.husky/pre-push` hook file wires it up:

  ```bash
  grep -n '"pre-push"' package.json
  ls -la .husky/
  ```

  Expected: `package.json` shows `"pre-push": "pnpm run validate:commit && pnpm run validate:env && pnpm run validate && pnpm run test:ci"`; `.husky/` contains only `commit-msg`, `pre-commit`, and `_` (no `pre-push` file).

- [ ] 4.2 Redefine the `pre-push` script to the cheap no-API tier — edit `package.json:226`:

  ```diff
  -    "pre-push": "pnpm run validate:commit && pnpm run validate:env && pnpm run validate && pnpm run test:ci",
  +    "pre-push": "pnpm run build && pnpm run test:providers-mocked && pnpm run test:provider-structure",
  ```

- [ ] 4.3 Create `.husky/pre-push`, matching the shebang + sourcing style of the existing `.husky/commit-msg`:

  ```sh
  #!/usr/bin/env sh
  . "$(dirname -- "$0")/_/husky.sh"

  # Cheap no-API tier: build freshness + mocked provider contracts + registry
  # structure. Keeps local pushes fast; live-credential suites run in the
  # separate nightly live-matrix.yml workflow, not on every push.
  pnpm run pre-push
  ```

- [ ] 4.4 Make it executable, matching the other hooks:

  ```bash
  chmod +x .husky/pre-push
  ls -la .husky/pre-push
  ```

  Expected: permissions show `-rwxr-xr-x` (or equivalent executable bit set).

- [ ] 4.5 Run the hook's own command manually to confirm it passes before relying on the git hook to catch failures:

  ```bash
  pnpm run pre-push
  ```

  Expected: build, mocked-contract suite, and structure suite all run and the command exits 0.

- [ ] 4.6 Commit:

  ```bash
  git add package.json .husky/pre-push
  git commit -m "chore(husky): wire pre-push to the cheap no-API provider safety-net tier"
  ```

---

### Task 5: OpenAI mocked contract section

**Files:**

- Modify: `test/continuous-test-suite-providers-mocked.ts` (new `runOpenAISection()` function + wiring into `main()`)

**Interfaces:**

- Consumes: `installMockFetch`, `record`, `expect`, `expectEq` from `./utils/mockFetch.js`; `withMocks`, `setEnv`, `openAIChatResponse`, `results` (module-level helpers already in the file); `NeuroLink` via `await import("../dist/index.js")`.
- Produces: three new `TestRecord` entries in `results`: `"LLM openai: happy-path generate()"`, `"LLM openai: 401 → AuthenticationError"`, `"LLM openai: 429 → RateLimitError"`.

**Verified request contract** (`src/lib/providers/openaiChatCompletionsBase.ts:383-399`, unoverridden by OpenAI's provider class): default `getChatCompletionsURL()` returns `` `${baseURL}/chat/completions` `` with `baseURL = "https://api.openai.com/v1"` (`OPENAI_DEFAULT_BASE_URL`) → full URL `https://api.openai.com/v1/chat/completions`; default `getAuthHeaders()` returns ``{ Authorization: `Bearer ${apiKey}` }``.

**Verified error contract** (`src/lib/providers/openAI/client.ts:135-199`, full body read verbatim): `buildAPIError` always sets a numeric `statusCode`, so classification is reliable via the statusCode branches alone — `statusCode === 401` → `AuthenticationError`; `statusCode === 429` → `RateLimitError` with the **exact literal message** `"OpenAI rate limit exceeded. Please try again later."` (line 185).

Steps:

- [ ] 5.1 Verify the suite's tail structure before inserting (confirms exact insertion points):

  ```bash
  sed -n '1165,1206p' test/continuous-test-suite-providers-mocked.ts
  ```

  Expected: shows `runImageGenSection()` ending at line ~1172, the `// Section: main` comment, then `async function main()` with a `try { await runOpenAICompatSection(); await runReplicateLLMSection(); await runEmbeddingsSection(); await runImageGenSection(); } finally { restoreEnv(); }` block.

- [ ] 5.2 Insert the new section function immediately before the `// Section: main` comment (i.e. right after `runImageGenSection()`'s closing brace):

  ```typescript
  // ───────────────────────────────────────────────────────────────────────
  // Section: OpenAI (native client — the base OpenAIChatCompletionsProvider
  // whose defaults every OpenAI-compat provider above inherits, so it gets
  // its own bespoke section rather than joining OPENAI_COMPAT_PROVIDERS)
  // ───────────────────────────────────────────────────────────────────────

  async function runOpenAISection(): Promise<void> {
    const section = "LLM openai";
    console.log(`\n=== ${section} ===`);
    const fakeKey = "sk-mock-openai-1234567890abcdef";
    const model = "gpt-4o-mini";
    setEnv("OPENAI_API_KEY", fakeKey);

    const { NeuroLink } = await import("../dist/index.js");

    // ── Happy path ──────────────────────────────────────────────────────
    try {
      await withMocks(
        [
          {
            method: "POST",
            url: "api.openai.com/v1/chat/completions",
            respond: { status: 200, json: openAIChatResponse("pong", model) },
          },
        ],
        async ({ calls }) => {
          const nl = new NeuroLink({ conversationMemory: { enabled: false } });
          const result = await nl.generate({
            provider: "openai",
            model,
            input: { text: "ping" },
            disableTools: true,
          });

          expect(calls.length > 0, "at least one fetch call captured");
          const call = calls[0];
          expect(
            call.url.includes("api.openai.com/v1/chat/completions"),
            `URL contains 'api.openai.com/v1/chat/completions' (got ${call.url})`,
          );
          expectEq(call.method, "POST", "request method");
          expect(
            (call.headers["authorization"] ?? "").startsWith(
              `Bearer ${fakeKey}`,
            ),
            `Authorization header starts with 'Bearer ${fakeKey.slice(0, 12)}...'`,
          );
          const body = call.bodyJson as { model: string; messages: unknown[] };
          expect(typeof body === "object", "body is JSON object");
          expectEq(body.model, model, "body.model");
          expect(Array.isArray(body.messages), "body.messages is array");

          expect(
            (result.content ?? "").toLowerCase().includes("pong"),
            `response content includes 'pong' (got ${JSON.stringify(result.content?.slice(0, 100))})`,
          );
          record(results, `${section}: happy-path generate()`, true);
        },
      );
    } catch (err) {
      record(
        results,
        `${section}: happy-path generate()`,
        false,
        err instanceof Error ? err.message : String(err),
      );
    }

    // ── 401 → AuthenticationError (buildAPIError always sets a numeric
    // statusCode, so this classifies via the statusCode branch alone) ──────
    try {
      await withMocks(
        [
          {
            method: "POST",
            url: "api.openai.com/v1/chat/completions",
            respond: {
              status: 401,
              json: {
                error: {
                  message: "Invalid API key",
                  type: "invalid_request_error",
                },
              },
            },
          },
        ],
        async () => {
          const nl = new NeuroLink({ conversationMemory: { enabled: false } });
          try {
            await nl.generate({
              provider: "openai",
              model,
              input: { text: "ping" },
              disableTools: true,
            });
            record(
              results,
              `${section}: 401 → AuthenticationError`,
              false,
              "no error thrown",
            );
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            record(
              results,
              `${section}: 401 → AuthenticationError`,
              /invalid openai api key|incorrect api key|invalid api key/i.test(
                msg,
              ),
              `msg='${msg.slice(0, 120)}'`,
            );
          }
        },
      );
    } catch (err) {
      record(
        results,
        `${section}: 401 → AuthenticationError`,
        false,
        err instanceof Error ? err.message : String(err),
      );
    }

    // ── 429 → RateLimitError with the exact literal message OpenAI's
    // formatProviderError hardcodes (client.ts:185) ─────────────────────
    try {
      await withMocks(
        [
          {
            method: "POST",
            url: "api.openai.com/v1/chat/completions",
            respond: {
              status: 429,
              json: {
                error: {
                  message: "Rate limit reached",
                  type: "rate_limit_error",
                },
              },
            },
          },
        ],
        async () => {
          const nl = new NeuroLink({ conversationMemory: { enabled: false } });
          try {
            await nl.generate({
              provider: "openai",
              model,
              input: { text: "ping" },
              disableTools: true,
            });
            record(
              results,
              `${section}: 429 → RateLimitError`,
              false,
              "no error thrown",
            );
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            record(
              results,
              `${section}: 429 → RateLimitError`,
              msg === "OpenAI rate limit exceeded. Please try again later.",
              `msg='${msg.slice(0, 120)}'`,
            );
          }
        },
      );
    } catch (err) {
      record(
        results,
        `${section}: 429 → RateLimitError`,
        false,
        err instanceof Error ? err.message : String(err),
      );
    }
  }
  ```

- [ ] 5.3 Wire the call into `main()`:

  ```diff
       await runOpenAICompatSection();
       await runReplicateLLMSection();
       await runEmbeddingsSection();
       await runImageGenSection();
  +    await runOpenAISection();
  ```

- [ ] 5.4 Typecheck and run:

  ```bash
  pnpm run check && pnpm run build && pnpm run test:providers-mocked
  ```

  Expected: last lines include `✓ LLM openai: happy-path generate()`, `✓ LLM openai: 401 → AuthenticationError`, `✓ LLM openai: 429 → RateLimitError`, and the script exits 0.

- [ ] 5.5 Sanity-check the SKIP/FAIL distinction is real for this section by temporarily breaking one assertion (per the Global Constraints break-one-assertion check), confirming a genuine failure reports `✗` and a non-zero exit — then revert:

  ```bash
  sed -i '' 's/msg === "OpenAI rate limit exceeded. Please try again later."/msg === "this will never match"/' test/continuous-test-suite-providers-mocked.ts
  pnpm run test:providers-mocked; echo "exit code: $?"
  git checkout -- test/continuous-test-suite-providers-mocked.ts
  ```

  Expected: `✗ LLM openai: 429 → RateLimitError` printed, `exit code: 1` (or a value shown by the suite's own `passed/failed` summary followed by `process.exit(failed > 0 ? 1 : 0)`), confirming the assertion is load-bearing, then the file is restored.

- [ ] 5.6 Re-run to confirm the revert restored a clean pass, then commit:

  ```bash
  pnpm run test:providers-mocked
  git add test/continuous-test-suite-providers-mocked.ts
  git commit -m "test(providers-mocked): add OpenAI contract section (request shape + 401/429 mapping)"
  ```

---

### Task 6: Azure mocked contract section

**Files:**

- Modify: `test/continuous-test-suite-providers-mocked.ts` (new `runAzureSection()` function + wiring into `main()`)

**Interfaces:**

- Produces: `TestRecord` entries `"LLM azure: happy-path generate()"`, `"LLM azure: 401 → AuthenticationError"`, `"LLM azure: 429 → generic ProviderError (documented gap)"`.

**Verified request contract** (`src/lib/providers/azureOpenai.ts`, full 292-line file read twice verbatim): `getChatCompletionsURL()` builds `` `${azureResourceOrigin}${prefix}/deployments/${deployment}/chat/completions?api-version=${azureApiVersion}` `` where `prefix = azureDeploymentPathPrefix.replace(/\/+$/, "")` = `"/openai"` for a classic `*.openai.azure.com` host; `deployment = credentials?.deploymentName || modelName || process.env.AZURE_OPENAI_MODEL || process.env.AZURE_OPENAI_DEPLOYMENT || process.env.AZURE_OPENAI_DEPLOYMENT_ID || "gpt-4o"` — passing `model: "mock-deployment"` directly to `nl.generate()` sets it with no extra env var; `azureApiVersion` defaults to `APIVersions.AZURE_LATEST = "2025-04-01-preview"` (`src/lib/constants/enums.ts:978`); `getAuthHeaders()` returns `{"api-key": apiKey}` — **not** `Authorization: Bearer`.

**Verified error contract** (`formatProviderError`, `src/lib/providers/azureOpenai.ts`, read verbatim this session): 401 works via `errorObj.message.includes("401")` → `AuthenticationError("Invalid Azure OpenAI API key or endpoint.", "azure")` (an exact, fixed message regardless of upstream body). **429 has no dedicated branch at all** — falls through to the generic ``ProviderError(`Azure OpenAI error: ${message}`, "azure")``. This is a real, confirmed classification gap; the test documents it rather than asserting incorrect `RateLimitError` behavior.

Steps:

- [ ] 6.1 Verify the exact endpoint-building and auth-header logic one more time immediately before writing the mock (guards against drift since the constructor was last read):

  ```bash
  sed -n '244,262p' src/lib/providers/azureOpenai.ts
  ```

  Expected: shows `getChatCompletionsURL(modelId)` building the URL with the `/openai/deployments/.../chat/completions?api-version=...` pattern, and `getAuthHeaders()` returning `{"api-key": this.config.apiKey}`.

- [ ] 6.2 Insert the new section function after `runOpenAISection()` (added in Task 5):

  ```typescript
  // ───────────────────────────────────────────────────────────────────────
  // Section: Azure OpenAI (api-key header, not Bearer; deployment-scoped URL)
  // ───────────────────────────────────────────────────────────────────────

  async function runAzureSection(): Promise<void> {
    const section = "LLM azure";
    console.log(`\n=== ${section} ===`);
    const fakeKey = "mock-azure-key-abcdef1234567890";
    const deployment = "mock-deployment";
    const resourceOrigin = "https://mock-resource.openai.azure.com";
    setEnv("AZURE_OPENAI_API_KEY", fakeKey);
    setEnv("AZURE_OPENAI_ENDPOINT", resourceOrigin);

    const { NeuroLink } = await import("../dist/index.js");
    const expectedUrl = `${resourceOrigin}/openai/deployments/${deployment}/chat/completions?api-version=2025-04-01-preview`;

    // ── Happy path ──────────────────────────────────────────────────────
    try {
      await withMocks(
        [
          {
            method: "POST",
            url: expectedUrl,
            respond: {
              status: 200,
              json: openAIChatResponse("pong", deployment),
            },
          },
        ],
        async ({ calls }) => {
          const nl = new NeuroLink({ conversationMemory: { enabled: false } });
          const result = await nl.generate({
            provider: "azure",
            model: deployment,
            input: { text: "ping" },
            disableTools: true,
          });

          expect(calls.length > 0, "at least one fetch call captured");
          const call = calls[0];
          expectEq(call.url, expectedUrl, "request URL");
          expectEq(call.method, "POST", "request method");
          expectEq(call.headers["api-key"], fakeKey, "api-key header");
          expect(
            !("authorization" in call.headers),
            "Authorization header must NOT be set (Azure uses api-key)",
          );
          const body = call.bodyJson as { messages: unknown[] };
          expect(Array.isArray(body.messages), "body.messages is array");

          expect(
            (result.content ?? "").toLowerCase().includes("pong"),
            `response content includes 'pong' (got ${JSON.stringify(result.content?.slice(0, 100))})`,
          );
          record(results, `${section}: happy-path generate()`, true);
        },
      );
    } catch (err) {
      record(
        results,
        `${section}: happy-path generate()`,
        false,
        err instanceof Error ? err.message : String(err),
      );
    }

    // ── 401 → AuthenticationError (message.includes("401") substring check) ─
    try {
      await withMocks(
        [
          {
            method: "POST",
            url: expectedUrl,
            respond: {
              status: 401,
              json: { error: { message: "401 Unauthorized" } },
            },
          },
        ],
        async () => {
          const nl = new NeuroLink({ conversationMemory: { enabled: false } });
          try {
            await nl.generate({
              provider: "azure",
              model: deployment,
              input: { text: "ping" },
              disableTools: true,
            });
            record(
              results,
              `${section}: 401 → AuthenticationError`,
              false,
              "no error thrown",
            );
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            record(
              results,
              `${section}: 401 → AuthenticationError`,
              msg === "Invalid Azure OpenAI API key or endpoint.",
              `msg='${msg.slice(0, 120)}'`,
            );
          }
        },
      );
    } catch (err) {
      record(
        results,
        `${section}: 401 → AuthenticationError`,
        false,
        err instanceof Error ? err.message : String(err),
      );
    }

    // ── 429 → NO dedicated branch in Azure's formatProviderError; falls
    // through to a generic ProviderError. This test documents that gap by
    // asserting the actual (imperfect) behavior, not RateLimitError. ──────
    try {
      await withMocks(
        [
          {
            method: "POST",
            url: expectedUrl,
            respond: {
              status: 429,
              json: { error: { message: "Rate limit exceeded" } },
            },
          },
        ],
        async () => {
          const nl = new NeuroLink({ conversationMemory: { enabled: false } });
          try {
            await nl.generate({
              provider: "azure",
              model: deployment,
              input: { text: "ping" },
              disableTools: true,
            });
            record(
              results,
              `${section}: 429 → generic ProviderError (documented gap)`,
              false,
              "no error thrown",
            );
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            record(
              results,
              `${section}: 429 → generic ProviderError (documented gap)`,
              msg.startsWith("Azure OpenAI error: "),
              `msg='${msg.slice(0, 120)}'`,
            );
          }
        },
      );
    } catch (err) {
      record(
        results,
        `${section}: 429 → generic ProviderError (documented gap)`,
        false,
        err instanceof Error ? err.message : String(err),
      );
    }
  }
  ```

- [ ] 6.3 Wire the call into `main()`:

  ```diff
       await runOpenAISection();
  +    await runAzureSection();
  ```

- [ ] 6.4 Typecheck and run:

  ```bash
  pnpm run check && pnpm run build && pnpm run test:providers-mocked
  ```

  Expected: `✓ LLM azure: happy-path generate()`, `✓ LLM azure: 401 → AuthenticationError`, `✓ LLM azure: 429 → generic ProviderError (documented gap)`, exit 0.

- [ ] 6.5 Break-one-assertion sanity check (URL construction, since that's the most fragile part of this section), then revert:

  ```bash
  sed -i '' 's/api-version=2025-04-01-preview/api-version=WRONG/' test/continuous-test-suite-providers-mocked.ts
  pnpm run test:providers-mocked; echo "exit code: $?"
  git checkout -- test/continuous-test-suite-providers-mocked.ts
  ```

  Expected: `✗ LLM azure: happy-path generate()` (route match fails, throws `[mockFetch] No route matched`), `exit code: 1`, then the file is restored.

- [ ] 6.6 Re-run to confirm clean pass, then commit:

  ```bash
  pnpm run test:providers-mocked
  git add test/continuous-test-suite-providers-mocked.ts
  git commit -m "test(providers-mocked): add Azure contract section, document 429 classifier gap"
  ```

---

### Task 7: Anthropic mocked contract section

**Files:**

- Modify: `test/continuous-test-suite-providers-mocked.ts` (new `anthropicMessageResponse()` helper + `runAnthropicSection()` function + wiring into `main()`)

**Interfaces:**

- Produces: `TestRecord` entries `"LLM anthropic: happy-path generate()"`, `"LLM anthropic: 401 → generic ProviderError (documented gap)"`, `"LLM anthropic: 429 → RateLimitError"`.

**Verified request contract** (`@anthropic-ai/sdk` v0.102.0 source in `node_modules`, read verbatim this session): default header `anthropic-version: '2023-06-01'` (`client.js:799`); `apiKeyAuth()` returns `{'X-Api-Key': apiKey}` (`client.js:353-357`) — **not** `Authorization: Bearer`; endpoint `POST /v1/messages` relative to `baseURL="https://api.anthropic.com"` (`resources/messages/messages.js:35`) → full URL `https://api.anthropic.com/v1/messages`. Interceptable via `installMockFetch()` because `fetchWithRetry()` calls the bare `fetch()` identifier, resolved dynamically from `globalThis.fetch` (confirmed no local shadow).

**Verified error contract** (`formatProviderError`, `src/lib/providers/anthropic/client.ts:1668-1727`, read verbatim this session): auth branch matches only `message.includes("API_KEY_INVALID") || message.includes("Invalid API key")` — the SDK's actual 401 message format is `${status} ${msg}` (`node_modules/@anthropic-ai/sdk/core/error.js:11,18-26`), e.g. `"401 invalid x-api-key"`, which contains neither literal substring, so a real 401 **misclassifies** and falls through to the generic ``ProviderError(`Anthropic error: ${message}`, ...)``— a confirmed gap, documented rather than worked around. 429 correctly matches`message.includes("429")`(the SDK's 429 message is`"429 " + rawMessage`) → `RateLimitError`with the exact literal message`"Anthropic rate limit exceeded. Please try again later."` (line 1698).

Steps:

- [ ] 7.1 Verify the SDK's exact 401 message format one more time immediately before writing the mock (guards against a version bump changing the format):

  ```bash
  sed -n '9,27p' node_modules/@anthropic-ai/sdk/core/error.js
  ```

  Expected: shows `APIError.makeMessage(status, error, message)` returning `` `${status} ${msg}` `` when both are present, and `static generate()` routing `status === 401` to `AuthenticationError` (the SDK's own class, unrelated to NeuroLink's `AuthenticationError` — the SDK throws its own typed error, NeuroLink's `formatProviderError` re-classifies it from `.message`).

- [ ] 7.2 Add a response-builder helper next to `openAIChatResponse()` (near the top of the file, after the existing helper):

  ```typescript
  function anthropicMessageResponse(text: string, model: string): unknown {
    return {
      id: "msg_mock",
      type: "message",
      role: "assistant",
      model,
      content: [{ type: "text", text }],
      stop_reason: "end_turn",
      stop_sequence: null,
      usage: { input_tokens: 5, output_tokens: 5 },
    };
  }
  ```

- [ ] 7.3 Insert the new section function after `runAzureSection()` (added in Task 6):

  ```typescript
  // ───────────────────────────────────────────────────────────────────────
  // Section: Anthropic (x-api-key + anthropic-version headers, not Bearer)
  // ───────────────────────────────────────────────────────────────────────

  async function runAnthropicSection(): Promise<void> {
    const section = "LLM anthropic";
    console.log(`\n=== ${section} ===`);
    const fakeKey = "sk-ant-mock-1234567890abcdef";
    const model = "claude-sonnet-4-6";
    setEnv("ANTHROPIC_API_KEY", fakeKey);

    const { NeuroLink } = await import("../dist/index.js");

    // ── Happy path ──────────────────────────────────────────────────────
    try {
      await withMocks(
        [
          {
            method: "POST",
            url: "api.anthropic.com/v1/messages",
            respond: {
              status: 200,
              json: anthropicMessageResponse("pong", model),
            },
          },
        ],
        async ({ calls }) => {
          const nl = new NeuroLink({ conversationMemory: { enabled: false } });
          const result = await nl.generate({
            provider: "anthropic",
            model,
            input: { text: "ping" },
            disableTools: true,
          });

          expect(calls.length > 0, "at least one fetch call captured");
          const call = calls[0];
          expect(
            call.url.includes("api.anthropic.com/v1/messages"),
            `URL contains 'api.anthropic.com/v1/messages' (got ${call.url})`,
          );
          expectEq(call.method, "POST", "request method");
          expectEq(call.headers["x-api-key"], fakeKey, "x-api-key header");
          expectEq(
            call.headers["anthropic-version"],
            "2023-06-01",
            "anthropic-version header",
          );
          expect(
            !("authorization" in call.headers),
            "Authorization header must NOT be set (Anthropic uses x-api-key)",
          );
          const body = call.bodyJson as { model: string; messages: unknown[] };
          expectEq(body.model, model, "body.model");
          expect(Array.isArray(body.messages), "body.messages is array");

          expect(
            (result.content ?? "").toLowerCase().includes("pong"),
            `response content includes 'pong' (got ${JSON.stringify(result.content?.slice(0, 100))})`,
          );
          record(results, `${section}: happy-path generate()`, true);
        },
      );
    } catch (err) {
      record(
        results,
        `${section}: happy-path generate()`,
        false,
        err instanceof Error ? err.message : String(err),
      );
    }

    // ── 401 → misclassifies to generic ProviderError. The auth branch only
    // matches "API_KEY_INVALID" / "Invalid API key" substrings; the SDK's
    // real 401 message is "401 <body message>", which matches neither.
    // This test documents that gap rather than asserting AuthenticationError. ─
    try {
      await withMocks(
        [
          {
            method: "POST",
            url: "api.anthropic.com/v1/messages",
            respond: {
              status: 401,
              json: {
                type: "error",
                error: {
                  type: "authentication_error",
                  message: "invalid x-api-key",
                },
              },
            },
          },
        ],
        async () => {
          const nl = new NeuroLink({ conversationMemory: { enabled: false } });
          try {
            await nl.generate({
              provider: "anthropic",
              model,
              input: { text: "ping" },
              disableTools: true,
            });
            record(
              results,
              `${section}: 401 → generic ProviderError (documented gap)`,
              false,
              "no error thrown",
            );
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            record(
              results,
              `${section}: 401 → generic ProviderError (documented gap)`,
              msg.startsWith("Anthropic error: 401"),
              `msg='${msg.slice(0, 120)}'`,
            );
          }
        },
      );
    } catch (err) {
      record(
        results,
        `${section}: 401 → generic ProviderError (documented gap)`,
        false,
        err instanceof Error ? err.message : String(err),
      );
    }

    // ── 429 → correctly classifies via the "429" substring match ──────────
    try {
      await withMocks(
        [
          {
            method: "POST",
            url: "api.anthropic.com/v1/messages",
            respond: {
              status: 429,
              json: {
                type: "error",
                error: { type: "rate_limit_error", message: "Rate limited" },
              },
            },
          },
        ],
        async () => {
          const nl = new NeuroLink({ conversationMemory: { enabled: false } });
          try {
            await nl.generate({
              provider: "anthropic",
              model,
              input: { text: "ping" },
              disableTools: true,
            });
            record(
              results,
              `${section}: 429 → RateLimitError`,
              false,
              "no error thrown",
            );
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            record(
              results,
              `${section}: 429 → RateLimitError`,
              msg === "Anthropic rate limit exceeded. Please try again later.",
              `msg='${msg.slice(0, 120)}'`,
            );
          }
        },
      );
    } catch (err) {
      record(
        results,
        `${section}: 429 → RateLimitError`,
        false,
        err instanceof Error ? err.message : String(err),
      );
    }
  }
  ```

- [ ] 7.4 Wire the call into `main()`:

  ```diff
       await runAzureSection();
  +    await runAnthropicSection();
  ```

- [ ] 7.5 Typecheck and run:

  ```bash
  pnpm run check && pnpm run build && pnpm run test:providers-mocked
  ```

  Expected: `✓ LLM anthropic: happy-path generate()`, `✓ LLM anthropic: 401 → generic ProviderError (documented gap)`, `✓ LLM anthropic: 429 → RateLimitError`, exit 0.

- [ ] 7.6 Break-one-assertion sanity check (the 429 literal message), then revert:

  ```bash
  sed -i '' 's/msg === "Anthropic rate limit exceeded. Please try again later."/msg === "this will never match"/' test/continuous-test-suite-providers-mocked.ts
  pnpm run test:providers-mocked; echo "exit code: $?"
  git checkout -- test/continuous-test-suite-providers-mocked.ts
  ```

  Expected: `✗ LLM anthropic: 429 → RateLimitError`, `exit code: 1`, then the file is restored.

- [ ] 7.7 Re-run to confirm clean pass, then commit:

  ```bash
  pnpm run test:providers-mocked
  git add test/continuous-test-suite-providers-mocked.ts
  git commit -m "test(providers-mocked): add Anthropic contract section, document 401 classifier gap"
  ```

---

### Task 8: Vertex construction + `formatProviderError` contract section

**Files:**

- Modify: `test/continuous-test-suite-providers-mocked.ts` (new `runVertexSection()` function + wiring into `main()`)

**Interfaces:**

- Consumes: `GoogleVertexProvider` from `"../dist/lib/providers/googleVertex/client.js"` (not re-exported from `dist/index.js` — dynamic-import-only per repo rule 1, confirmed by grep); `AuthenticationError`, `RateLimitError` from `"../dist/lib/types/index.js"`.
- Produces: `TestRecord` entries `"Vertex (construction + formatProviderError contract): constructs without throwing"`, `"...: 403 → AuthenticationError"`, `"...: 429 → RateLimitError"`.

**Why construction-only, not fetch interception:** Vertex's `@google/genai` client routes its ADC (Application Default Credentials) token exchange through `gaxios`, which imports the `node-fetch` npm package directly rather than calling `globalThis.fetch` — confirmed by inspecting `gaxios`'s dependency graph in `node_modules`. `installMockFetch()` only replaces `globalThis.fetch`, so it cannot intercept this path. The substitute contract test constructs the real `GoogleVertexProvider` class (safe — its constructor makes no network call, it only builds a client object) and invokes its `formatProviderError()` directly with synthetic error objects, verifying the classifier logic in isolation.

**Verified classifier** (`formatProviderError`, `src/lib/providers/googleVertex/client.ts:8465-8622`, read verbatim this session): 401/403/`PERMISSION_DENIED`/`UNAUTHENTICATED`/statusCode 401 or 403 → `AuthenticationError`; `QUOTA_EXCEEDED`/`RATE_LIMIT_EXCEEDED`/`"rate limit"`/`"429"`/statusCode 429 or 529/`/overloaded/i` → `RateLimitError` (with `retryDelay` scraped via `/["']?retryDelay["']?\s*[:=]\s*["']?(\d+(?:\.\d+)?s)/`). `formatProviderError` is declared `protected` (line 8465) — invoked here via a test-only double assertion (`provider as unknown as {formatProviderError(...): Error}`), which is banned in `src/` under project rule 14 but **explicitly exempt for test files**.

**Verified construction requirements:** `GoogleVertexProvider` constructor signature is `(modelName?, _providerName?, sdk?, region?, credentials?)` — note the different param order vs. the other 4 providers. Construction guard `hasGoogleCredentials()` checks **only environment variables**, not the constructor's `credentials` param, so the test must `setEnv("GOOGLE_SERVICE_ACCOUNT_KEY", <fake JSON>)` before constructing or the constructor throws.

Steps:

- [ ] 8.1 Verify `GoogleVertexProvider` is not exported from the main barrel (confirms the deep-import necessity) and confirm the deep-import precedent already used elsewhere in this test suite family:

  ```bash
  grep -c "GoogleVertexProvider" dist/index.js
  grep -n "export class GoogleVertexProvider" dist/lib/providers/googleVertex/client.js
  grep -n "from \"../dist/lib/providers/" test/continuous-test-suite-token-usage.ts
  ```

  Expected: first command returns `0`; second confirms the named export exists in the deep path; third shows the existing precedent (`test/continuous-test-suite-token-usage.ts:30-31` imports `mergeUsage` and `parseUsageFromResponseBody` from equivalent deep dist paths).

- [ ] 8.2 Insert the new section function after `runAnthropicSection()` (added in Task 7):

  ```typescript
  // ───────────────────────────────────────────────────────────────────────
  // Section: Vertex (construction + formatProviderError contract only —
  // gaxios routes ADC token exchange through node-fetch, not globalThis.fetch,
  // so installMockFetch() cannot intercept a full request/response round trip)
  // ───────────────────────────────────────────────────────────────────────

  async function runVertexSection(): Promise<void> {
    const section = "Vertex (construction + formatProviderError contract)";
    console.log(`\n=== ${section} ===`);
    console.log(
      "  NOTE: Vertex's ADC token exchange goes through gaxios -> the " +
        "node-fetch npm package directly, not globalThis.fetch, so " +
        "installMockFetch() cannot intercept it. This section verifies " +
        "provider construction plus the 403/429 branches of " +
        "formatProviderError() directly instead of a full request/response " +
        "round trip.",
    );

    setEnv(
      "GOOGLE_SERVICE_ACCOUNT_KEY",
      JSON.stringify({
        type: "service_account",
        project_id: "mock-project",
        private_key:
          "-----BEGIN PRIVATE KEY-----\nMOCK\n-----END PRIVATE KEY-----\n",
        client_email: "mock@mock-project.iam.gserviceaccount.com",
      }),
    );

    try {
      const { GoogleVertexProvider } =
        await import("../dist/lib/providers/googleVertex/client.js");
      const { AuthenticationError, RateLimitError } =
        await import("../dist/lib/types/index.js");

      const provider = new GoogleVertexProvider(
        "gemini-2.5-flash",
        "vertex",
        undefined,
        "us-central1",
        { projectId: "mock-project", location: "us-central1" },
      );
      record(results, `${section}: constructs without throwing`, true);

      const formatError = (
        provider as unknown as {
          formatProviderError(error: unknown): Error;
        }
      ).formatProviderError.bind(provider);

      const authErr = formatError({
        message: "403 PERMISSION_DENIED: caller does not have permission",
      });
      record(
        results,
        `${section}: 403 → AuthenticationError`,
        authErr instanceof AuthenticationError,
        `got ${authErr.constructor.name}`,
      );

      const rateErr = formatError({
        message: '429 RESOURCE_EXHAUSTED: {"retryDelay":"12s"}',
      });
      record(
        results,
        `${section}: 429 → RateLimitError`,
        rateErr instanceof RateLimitError,
        `got ${rateErr.constructor.name}`,
      );
    } catch (err) {
      record(
        results,
        `${section}: setup`,
        false,
        err instanceof Error ? err.message : String(err),
      );
    }
  }
  ```

- [ ] 8.3 Wire the call into `main()`:

  ```diff
       await runAnthropicSection();
  +    await runVertexSection();
  ```

- [ ] 8.4 Typecheck and run:

  ```bash
  pnpm run check && pnpm run build && pnpm run test:providers-mocked
  ```

  Expected: `✓ Vertex (construction + formatProviderError contract): constructs without throwing`, `✓ ...: 403 → AuthenticationError`, `✓ ...: 429 → RateLimitError`, exit 0.

- [ ] 8.5 Break-one-assertion sanity check (swap the expected class in the 429 case), then revert:

  ```bash
  sed -i '' 's/rateErr instanceof RateLimitError,/rateErr instanceof AuthenticationError,/' test/continuous-test-suite-providers-mocked.ts
  pnpm run test:providers-mocked; echo "exit code: $?"
  git checkout -- test/continuous-test-suite-providers-mocked.ts
  ```

  Expected: `✗ Vertex (construction + formatProviderError contract): 429 → RateLimitError`, `exit code: 1`, then the file is restored.

- [ ] 8.6 Re-run to confirm clean pass, then commit:

  ```bash
  pnpm run test:providers-mocked
  git add test/continuous-test-suite-providers-mocked.ts
  git commit -m "test(providers-mocked): add Vertex construction + formatProviderError contract section"
  ```

---

### Task 9: Bedrock construction + `formatProviderError` contract section

**Files:**

- Modify: `test/continuous-test-suite-providers-mocked.ts` (new `runBedrockSection()` function + wiring into `main()`)

**Interfaces:**

- Consumes: `AmazonBedrockProvider` from `"../dist/lib/providers/amazonBedrock/client.js"`; `AuthenticationError`, `RateLimitError` from `"../dist/lib/types/index.js"`.
- Produces: `TestRecord` entries `"Bedrock (construction + formatProviderError contract): constructs without throwing"`, `"...: AccessDeniedException → AuthenticationError"`, `"...: ThrottlingException → RateLimitError"`.

**Why construction-only, not fetch interception:** the AWS SDK v3's `@smithy/node-http-handler` uses Node's native `http`/`http2`/`https` modules directly, not `globalThis.fetch` — `installMockFetch()` cannot intercept it. Substitute: construct the real `AmazonBedrockProvider` (confirmed safe — its constructor, `src/lib/providers/amazonBedrock/client.ts:81-156`, only builds a `BedrockRuntimeClient` object and never calls `performInitialHealthCheck()`, a separate method that is never invoked during construction) and invoke `formatProviderError()` directly with synthetic AWS SDK-shaped errors.

**Verified classifier** (`formatProviderError`, `src/lib/providers/amazonBedrock/client.ts:2406-2441`, read verbatim this session): `message.includes("AccessDeniedException")` (checked via `error instanceof Error ? error.message : String(error)` — **must pass a real `Error` instance**, a plain object stringifies to `"[object Object]"` and never matches) → `AuthenticationError("AWS Bedrock access denied. Check your credentials and permissions.", providerName)`; throttling is checked via `(error as {name?}).name === "ThrottlingException" || (error as {code?}).code === "ThrottlingException"` (**property check, not a message substring**) → `RateLimitError(...)`.

Steps:

- [ ] 9.1 Verify the constructor doesn't perform a health check, and confirm the deep-import path, immediately before writing the test:

  ```bash
  grep -n "performInitialHealthCheck" src/lib/providers/amazonBedrock/client.ts
  grep -c "AmazonBedrockProvider" dist/index.js
  grep -n "export class AmazonBedrockProvider" dist/lib/providers/amazonBedrock/client.js
  ```

  Expected: `performInitialHealthCheck` appears as a `private async` method declaration and its later `catch` block, but is not called from inside the `constructor(...)` body (only from other, unrelated code paths); `dist/index.js` grep returns `0`; the class export is confirmed in the deep dist path.

- [ ] 9.2 Insert the new section function after `runVertexSection()` (added in Task 8):

  ```typescript
  // ───────────────────────────────────────────────────────────────────────
  // Section: Bedrock (construction + formatProviderError contract only —
  // AWS SDK v3's @smithy/node-http-handler uses native Node http(s), not
  // globalThis.fetch, so installMockFetch() cannot intercept it)
  // ───────────────────────────────────────────────────────────────────────

  async function runBedrockSection(): Promise<void> {
    const section = "Bedrock (construction + formatProviderError contract)";
    console.log(`\n=== ${section} ===`);
    console.log(
      "  NOTE: AWS SDK v3's @smithy/node-http-handler uses native Node " +
        "http/http2/https, not globalThis.fetch, so installMockFetch() " +
        "cannot intercept it. This section verifies provider construction " +
        "plus the AccessDeniedException/ThrottlingException branches of " +
        "formatProviderError() directly instead of a full request/response " +
        "round trip.",
    );

    try {
      const { AmazonBedrockProvider } =
        await import("../dist/lib/providers/amazonBedrock/client.js");
      const { AuthenticationError, RateLimitError } =
        await import("../dist/lib/types/index.js");

      const provider = new AmazonBedrockProvider(
        "anthropic.claude-3-5-sonnet-20241022-v2:0",
        undefined,
        "us-east-1",
        { accessKeyId: "MOCKACCESSKEYID", secretAccessKey: "mock-secret" },
      );
      record(results, `${section}: constructs without throwing`, true);

      const formatError = (
        provider as unknown as {
          formatProviderError(error: unknown): Error;
        }
      ).formatProviderError.bind(provider);

      const authErr = formatError(
        new Error(
          "AccessDeniedException: User is not authorized to perform this action",
        ),
      );
      record(
        results,
        `${section}: AccessDeniedException → AuthenticationError`,
        authErr instanceof AuthenticationError,
        `got ${authErr.constructor.name}`,
      );

      const throttleErr = formatError(
        Object.assign(new Error("Rate exceeded"), {
          name: "ThrottlingException",
        }),
      );
      record(
        results,
        `${section}: ThrottlingException → RateLimitError`,
        throttleErr instanceof RateLimitError,
        `got ${throttleErr.constructor.name}`,
      );
    } catch (err) {
      record(
        results,
        `${section}: setup`,
        false,
        err instanceof Error ? err.message : String(err),
      );
    }
  }
  ```

- [ ] 9.3 Wire the call into `main()` and update the module docstring's coverage matrix to reflect all five new sections:

  ```diff
       await runVertexSection();
  +    await runBedrockSection();
  ```

  ```diff
    * Coverage matrix:
    *
    *   LLM (OpenAI-compat):     xAI, Groq, Together AI, Fireworks, Perplexity
    *   LLM (custom shape):      Cohere, Cloudflare Workers AI, Replicate
    *   Embeddings:              Voyage AI, Jina AI
    *   Image-gen:               Stability, Ideogram, Recraft
  + *   LLM (native, fetch-interceptable):    OpenAI, Azure, Anthropic
  + *   LLM (native, construction-only —
  + *        SDK bypasses globalThis.fetch):  Vertex, Bedrock
  ```

- [ ] 9.4 Typecheck and run the full mocked suite (all five new sections together):

  ```bash
  pnpm run check && pnpm run build && pnpm run test:providers-mocked
  ```

  Expected: all prior sections plus `✓ Bedrock (construction + formatProviderError contract): constructs without throwing`, `✓ ...: AccessDeniedException → AuthenticationError`, `✓ ...: ThrottlingException → RateLimitError`; final summary line shows `0 failed`; exit 0.

- [ ] 9.5 Break-one-assertion sanity check (drop the `.name` assignment so the throttle branch can't match), then revert:

  ```bash
  sed -i '' 's/name: "ThrottlingException",/name: "SomethingElse",/' test/continuous-test-suite-providers-mocked.ts
  pnpm run test:providers-mocked; echo "exit code: $?"
  git checkout -- test/continuous-test-suite-providers-mocked.ts
  ```

  Expected: `✗ Bedrock (construction + formatProviderError contract): ThrottlingException → RateLimitError`, `exit code: 1`, then the file is restored.

- [ ] 9.6 Re-run to confirm clean pass, then commit:

  ```bash
  pnpm run test:providers-mocked
  git add test/continuous-test-suite-providers-mocked.ts
  git commit -m "test(providers-mocked): add Bedrock construction + formatProviderError contract section"
  ```

---

### Task 10: Scheduled nightly `live-matrix.yml` (not a PR gate)

**Files:**

- Create: `.github/workflows/live-matrix.yml`

**Interfaces:**

- Consumes: `pnpm run test:matrix` (`test/continuous-test-suite-provider-matrix.ts`, self-gates via `hasProviderEnv()` per-provider filtering — confirmed it exits 0 cleanly with zero targets when no keys are present).
- Produces: a new, non-required GitHub Actions workflow triggered by `schedule` (cron) and `workflow_dispatch`, entirely separate from `ci.yml`'s PR-triggered jobs — never added to `.github/settings.yml`'s required contexts.

Steps:

- [ ] 10.1 Verify `test:matrix`'s self-gating behavior by running it locally with no provider keys set, to confirm the "clean skip" claim before building a workflow around it:

  ```bash
  env -i PATH="$PATH" HOME="$HOME" npx tsx test/continuous-test-suite-provider-matrix.ts; echo "exit code: $?"
  ```

  Expected: the suite logs that zero providers have credentials configured and exits `0` (not a hang, not a crash) — confirming it's safe to run unconditionally in a scheduled workflow without pre-filtering secrets in the YAML.

- [ ] 10.2 Create `.github/workflows/live-matrix.yml`:

  ```yaml
  name: Live Provider Matrix (Nightly)

  on:
    schedule:
      # 03:00 UTC daily — off-peak, avoids colliding with PR CI load.
      - cron: "0 3 * * *"
    workflow_dispatch: {}

  permissions:
    contents: read

  jobs:
    live-matrix:
      name: 🌐 Live Provider Matrix Sweep
      runs-on: ubuntu-latest
      # Not a required check — this workflow never appears in
      # .github/settings.yml's branch-protection contexts. It exercises real
      # provider credentials against real APIs and must not block merges on
      # transient upstream outages or missing repo secrets.
      steps:
        - name: Checkout code
          uses: actions/checkout@v4

        - name: Setup PNPM
          uses: pnpm/action-setup@v4
          with:
            version: 10.15.1

        - name: Setup Node.js
          uses: actions/setup-node@v4
          with:
            node-version: "22"
            cache: "pnpm"

        - name: Install dependencies
          run: pnpm install

        - name: 🔄 SvelteKit Sync
          run: pnpm exec svelte-kit sync

        - name: Build package
          run: pnpm run build

        - name: Live provider matrix sweep (self-gates cleanly when keys are absent)
          run: pnpm run test:matrix
          env:
            OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
            ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
            GOOGLE_AI_API_KEY: ${{ secrets.GOOGLE_AI_API_KEY }}
            GOOGLE_SERVICE_ACCOUNT_KEY: ${{ secrets.GOOGLE_SERVICE_ACCOUNT_KEY }}
            AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
            AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
            AZURE_OPENAI_API_KEY: ${{ secrets.AZURE_OPENAI_API_KEY }}
            AZURE_OPENAI_ENDPOINT: ${{ secrets.AZURE_OPENAI_ENDPOINT }}
            MISTRAL_API_KEY: ${{ secrets.MISTRAL_API_KEY }}
            HUGGINGFACE_API_KEY: ${{ secrets.HUGGINGFACE_API_KEY }}
            OPENROUTER_API_KEY: ${{ secrets.OPENROUTER_API_KEY }}
            DEEPSEEK_API_KEY: ${{ secrets.DEEPSEEK_API_KEY }}
            GROQ_API_KEY: ${{ secrets.GROQ_API_KEY }}
            COHERE_API_KEY: ${{ secrets.COHERE_API_KEY }}
            FIREWORKS_API_KEY: ${{ secrets.FIREWORKS_API_KEY }}
            PERPLEXITY_API_KEY: ${{ secrets.PERPLEXITY_API_KEY }}
            XAI_API_KEY: ${{ secrets.XAI_API_KEY }}
            TOGETHER_API_KEY: ${{ secrets.TOGETHER_API_KEY }}
            CLOUDFLARE_API_KEY: ${{ secrets.CLOUDFLARE_API_KEY }}
            VOYAGE_API_KEY: ${{ secrets.VOYAGE_API_KEY }}
            JINA_API_KEY: ${{ secrets.JINA_API_KEY }}
            STABILITY_API_KEY: ${{ secrets.STABILITY_API_KEY }}
            IDEOGRAM_API_KEY: ${{ secrets.IDEOGRAM_API_KEY }}
            RECRAFT_API_KEY: ${{ secrets.RECRAFT_API_KEY }}
            REPLICATE_API_TOKEN: ${{ secrets.REPLICATE_API_TOKEN }}
  ```

- [ ] 10.3 Validate the YAML parses:

  ```bash
  npx -y js-yaml .github/workflows/live-matrix.yml > /dev/null && echo "YAML OK"
  ```

  Expected: `YAML OK`.

- [ ] 10.4 Confirm this workflow file is **not** referenced anywhere in `.github/settings.yml`'s required contexts (it must never block a PR):

  ```bash
  grep -n "live-matrix\|Live Provider Matrix" .github/settings.yml
  ```

  Expected: no matches.

- [ ] 10.5 Trigger a manual dry run locally to prove the command it invokes behaves as expected without keys (already done in 10.1) — no further local step needed since `workflow_dispatch` triggers are validated on GitHub, not locally.

- [ ] 10.6 Commit:

  ```bash
  git add .github/workflows/live-matrix.yml
  git commit -m "ci: add nightly live-matrix workflow (schedule + workflow_dispatch, not a PR gate)"
  ```

---

### Task 11: Documentation and comment truth fixes

**Files:**

- Modify: `test/helpers/providerMatrix.ts` (header docstring, lines 1-4)
- Modify: `docs/provider-integration/06-testing.md` (Section A, lines 12-42; Section D, line 137)
- Modify: `package.json` (three `"// CI tier"` comment keys, lines 160, 167, 169)

**Interfaces:** none (comment/doc-only changes; no runtime symbols produced or consumed).

**Provider count verified at 30:** the assignment specified fixing `providerMatrix.ts`'s docstring from "13 providers" to "30 providers" (matching the full `AIProviderName` enum). Counting the actual keys in the file's `PROVIDERS` object (`test/helpers/providerMatrix.ts:64`) confirms **30** entries — an exact match against every non-`AUTO` value in the `AIProviderName` enum (`src/lib/constants/enums.ts:8-39`), with zero gaps. (An earlier pass at this count used a grep pattern anchored on `^  [a-z]`, which silently skips the five quoted kebab-case keys — `"google-ai"`, `"openai-compatible"`, `"nvidia-nim"`, `"lm-studio"`, `"together-ai"` — undercounting to 25; the corrected pattern below matches both bare and quoted keys and confirms 30.)

Steps:

- [ ] 11.1 Re-verify the provider count immediately before editing (guards against the object having changed since this plan was written; the pattern matches both bare identifier keys like `openai:` and quoted kebab-case keys like `"google-ai":`):

  ```bash
  awk '/^export const PROVIDERS/,/^};/' test/helpers/providerMatrix.ts | grep -cE '^  "?[a-zA-Z][a-zA-Z0-9_-]*"?: \{'
  ```

  Expected: `30`.

- [ ] 11.2 Fix `test/helpers/providerMatrix.ts`'s header docstring:

  ```diff
   /**
  - * Provider capability matrix — the single source of truth for what each of
  - * NeuroLink's 13 providers supports. Used by the matrix test runner and any
  - * suite that needs to skip a test based on provider capability.
  + * Provider capability matrix — the single source of truth for what each of
  + * NeuroLink's 30 providers supports. Used by the matrix test runner and any
  + * suite that needs to skip a test based on provider capability.
    *
    * Adding a new provider:
  ```

- [ ] 11.3 Fix `docs/provider-integration/06-testing.md` Section A — the current text describes an `ALL_PROVIDERS` array that no longer exists in `continuous-test-suite-providers.ts` (removed, per the "ALL_PROVIDERS list removed" comment near the top of that file):

  ````diff
   ### A. `test/continuous-test-suite-providers.ts`
  -
  -This is the main provider suite. The relevant section is the `ALL_PROVIDERS` array (around line 73):
  -
  -```diff
  - const ALL_PROVIDERS = [
  -   "openai",
  -   "anthropic",
  -   "vertex",
  -   "google-ai",
  -   "openrouter",
  -   "bedrock",
  -   "azure",
  -   "mistral",
  -   "ollama",
  -   "litellm",
  -   "huggingface",
  -+  "deepseek",
  -+  "nvidia-nim",
  -+  "lm-studio",
  -+  "llamacpp",
  - ] as const;
  -```
  -
  -The all-provider loop at the bottom of this file iterates `ALL_PROVIDERS` and:
  -
  -1. Calls `validateConfiguration()` on the provider
  -2. Skips with `[SKIP] env not configured` if it returns false
  -3. Otherwise runs `generate("Hi")` and `stream("Hi")`
  -
  -For local providers (LM Studio, llama.cpp), the skip behavior already works because `validateConfiguration()` does an HTTP probe of `/v1/models` or `/health`. If the server isn't running, returns false → tests skip.
  +
  +**Updated 2026-08-15:** the `ALL_PROVIDERS` array described below no longer
  +exists — `continuous-test-suite-providers.ts` deleted it once provider
  +coverage moved to two more targeted places:
  +
  +1. **Structural completeness** (zero API keys, runs in CI on every commit):
  +   `test/continuous-test-suite-provider-structure.ts`
  +   (`pnpm run test:provider-structure`) asserts every value in the
  +   canonical `AIProviderName` enum resolves via `ProviderFactory`, and every
  +   `src/lib/providers/*.ts` module has exactly one dynamic import in
  +   `providerRegistry.ts`.
  +2. **Live per-provider generate/stream sweep** (needs API keys, runs
  +   nightly via `.github/workflows/live-matrix.yml`, not a PR gate):
  +   `test/continuous-test-suite-provider-matrix.ts` (`pnpm run test:matrix`)
  +   iterates `test/helpers/providerMatrix.ts`'s `PROVIDERS` map — see that
  +   file's header comment for the current provider count and coverage gaps.
  +
  +If you're adding a new provider, add it to `providerMatrix.ts`'s
  +`PROVIDERS` map so `test:matrix` picks it up automatically;
  +`test:provider-structure` needs no edits — it derives its expectations from
  +the `AIProviderName` enum and the filesystem, not a hand-maintained list.
  ````

- [ ] 11.4 Fix Section D's dead phrase (line 137, references the same deleted loop):

  ```diff
  -The canonical entrypoint for the four new providers is **`pnpm run test:new-providers`**, which runs the dedicated suite `test/continuous-test-suite-new-providers.ts` (full feature surface per provider — generate, stream, tools, structured, reasoning, vision-where-supported, abort, timeout, per-call creds, telemetry, error formatting). The existing `test:providers` (`ALL_PROVIDERS` loop) and `test:credentials` are still useful for cross-provider checks but the new suite is the primary coverage for the integration.
  +The canonical entrypoint for the four new providers is **`pnpm run test:new-providers`**, which runs the dedicated suite `test/continuous-test-suite-new-providers.ts` (full feature surface per provider — generate, stream, tools, structured, reasoning, vision-where-supported, abort, timeout, per-call creds, telemetry, error formatting). The existing `test:providers` and `test:credentials` are still useful for cross-provider checks but the new suite is the primary coverage for the integration.
  ```

- [ ] 11.5 Update `package.json`'s three `"// CI tier"` comment keys to reflect the now-real CI automation added in Task 2 (previously these comments described an aspirational tier structure with zero actual CI wiring):

  ```diff
  -    "// CI tier — fast, no live AI calls, safe for every commit": "",
  +    "// CI tier — fast, no live AI calls, safe for every commit (test:unit; also see the separate provider-safety-net CI job, which runs build + test:providers-mocked + test:provider-structure on every PR)": "",
  ```

  ```diff
  -    "// CI tier — live providers, runs only when API keys are present (test:credentials and test:dynamic make real provider calls when keys are set, so they live here, not in test:unit)": "",
  +    "// CI tier — live providers, runs only when API keys are present (test:credentials and test:dynamic make real provider calls when keys are set, so they live here, not in test:unit; test:providers itself now runs nightly via .github/workflows/live-matrix.yml, not on every PR)": "",
  ```

  ```diff
  -    "// CI tier — product output (image/video/TTS/PPT) — costs $$ per run": "",
  +    "// CI tier — product output (image/video/TTS/PPT) — costs $$ per run (not wired into any GitHub Actions workflow as of this comment; run manually or add to live-matrix.yml if nightly coverage is needed)": "",
  ```

- [ ] 11.6 Verify `package.json` is still valid JSON after the comment-key edits:

  ```bash
  node -e "JSON.parse(require('fs').readFileSync('package.json', 'utf8')); console.log('valid JSON')"
  ```

  Expected: `valid JSON`.

- [ ] 11.7 Confirm the doc changes render sensibly (no broken markdown fences from the diff removal) by checking the file's fence balance:

  ````bash
  grep -c '^```' docs/provider-integration/06-testing.md
  ````

  Expected: an even number (each opening fence has a matching close).

- [ ] 11.8 Commit:

  ```bash
  git add test/helpers/providerMatrix.ts docs/provider-integration/06-testing.md package.json
  git commit -m "docs: fix stale provider counts and dead ALL_PROVIDERS references"
  ```

---

### Task 12: Fix hardcoded `/9` denominator in `environmentManager.ts`

**Files:**

- Modify: `tools/automation/environmentManager.ts` (`reportValidation()` lines 316-353, `calculateScore()` lines 355-369)

**Interfaces:** none new (internal refactor of an existing class method's arithmetic — no exported symbol's signature changes).

**Verified current state** (full 461-line file read verbatim this session): `validateEnvironment()` builds `validation.providers` as a 9-key object (`openai, anthropic, "google-ai", vertex, bedrock, azure, huggingface, ollama, mistral` — `tools/automation/environmentManager.ts:252-266`). `reportValidation()` prints `` `✅ Configured providers: ${validation.configured.length}/9` `` and `` `⚠️  Missing providers: ${validation.missing.length}/9` `` (lines 319-320) — hardcoded literals, not derived from the object. `calculateScore()` computes `(validation.configured.length / 9) * configuredWeight` (line 361) — same hardcoded `9`. This plan's scope is limited to deriving the denominator from the object's own key count (stopping the lie that it's always exactly 9); a full descriptor-driven rewrite covering all 30 providers is explicitly out of scope (owned by a separate plan covering `environmentManager.ts`'s full provider-descriptor derivation).

Steps:

- [ ] 12.1 Verify the current hardcoded values one more time immediately before editing:

  ```bash
  grep -n "/9\|9)" tools/automation/environmentManager.ts
  ```

  Expected: three matches — `reportValidation()`'s two template-literal `/9` usages (lines 319-320) and `calculateScore()`'s `/ 9` division (line 361).

- [ ] 12.2 Fix `reportValidation()` to derive the denominator from `validation.providers`:

  ```diff
     reportValidation(validation: any) {
       console.log("\n📊 ENVIRONMENT VALIDATION RESULTS");
       console.log("=".repeat(50));
  -    console.log(`✅ Configured providers: ${validation.configured.length}/9`);
  -    console.log(`⚠️  Missing providers: ${validation.missing.length}/9`);
  +    const totalProviders = Object.keys(validation.providers).length;
  +    console.log(
  +      `✅ Configured providers: ${validation.configured.length}/${totalProviders}`,
  +    );
  +    console.log(
  +      `⚠️  Missing providers: ${validation.missing.length}/${totalProviders}`,
  +    );
  ```

- [ ] 12.3 Fix `calculateScore()` to derive the same denominator independently (it's a separate method receiving the same `validation` object, so it must compute its own `totalProviders` rather than relying on a value set in `reportValidation()`):

  ```diff
     calculateScore(validation: any) {
       const configuredWeight = 70; // 70% for having providers configured
       const diversityWeight = 20; // 20% for provider diversity
       const bestPracticeWeight = 10; // 10% for following best practices

  +    const totalProviders = Object.keys(validation.providers).length;
       const configuredScore =
  -      (validation.configured.length / 9) * configuredWeight;
  +      (validation.configured.length / totalProviders) * configuredWeight;
       const diversityScore =
         Math.min(validation.configured.length / 3, 1) * diversityWeight;
  ```

- [ ] 12.4 Typecheck (this file is TypeScript run via `tsx`, not part of the compiled `src/` build, so `pnpm run check` may or may not cover it — verify directly with `tsc --noEmit` scoped to this file's syntax via a dry run):

  ```bash
  npx tsx --test-only tools/automation/environmentManager.ts --validate 2>&1 | head -20 || npx tsx tools/automation/environmentManager.ts --validate
  ```

  Expected: the script runs (prints the `🔍 Validating environment configuration...` banner and a final `📈 Environment Score:` line) without a TypeScript syntax error; the two provider-count lines now show `/9` only if `validation.providers` still happens to have 9 keys (it does, since this task doesn't change `validateEnvironment()`'s key list) — confirming the derived value matches the previous hardcoded one exactly for today's 9-provider set, while no longer being a lie if that set ever changes.

- [ ] 12.5 Confirm no other hardcoded `9` reference to provider count remains in the file:

  ```bash
  grep -n "/ 9\|/9\b" tools/automation/environmentManager.ts
  ```

  Expected: no matches.

- [ ] 12.6 Commit:

  ```bash
  git add tools/automation/environmentManager.ts
  git commit -m "fix(tools): derive environmentManager provider-count denominator instead of hardcoding /9"
  ```

---

## Verification Checklist

- [ ] `pnpm run build` succeeds cleanly from a fresh `dist/`.
- [ ] `pnpm run check` (typecheck) passes with zero errors.
- [ ] `pnpm run lint` passes with zero errors.
- [ ] `pnpm run test:provider-structure` passes (Task 1) — both `Model Registry Completeness` and `Provider Registration Completeness` report `✓`.
- [ ] `pnpm run test:providers-mocked` passes with all ten sections (5 pre-existing + 5 new from Tasks 5-9) reporting `✓`, final summary `0 failed`.
- [ ] `test/continuous-test-suite-providers.ts` no longer references `testModelRegistryCompleteness`, `testProviderRegistrationCompleteness`, `PROVIDER_REGISTRATION_EXCLUSIONS`, or `DYNAMIC_PROVIDER_IMPORT_RE`, and no longer imports `path`.
- [ ] `.github/workflows/ci.yml` contains a `provider-safety-net` job with no `strategy:`/`name:` overriding its check-run name; the `test:` job's `strategy: matrix:` block is gone; `quality-gate`'s no-op "🎯 Test Suite Validation" step is gone.
- [ ] `.github/settings.yml`'s two `branches: - name: release` blocks both list `["test", "build-check", "provider-safety-net", "Yama PR Review"]` as required contexts.
- [ ] `.husky/pre-push` exists, is executable, and its `package.json` `pre-push` script runs exactly `pnpm run build && pnpm run test:providers-mocked && pnpm run test:provider-structure`.
- [ ] `.github/workflows/live-matrix.yml` exists, is triggered by `schedule` + `workflow_dispatch` only, and is **not** listed in `.github/settings.yml`'s required contexts.
- [ ] `test/helpers/providerMatrix.ts`'s header docstring says 30, not 13.
- [ ] `docs/provider-integration/06-testing.md` no longer references a deleted `ALL_PROVIDERS` array.
- [ ] `tools/automation/environmentManager.ts` has zero remaining hardcoded `/9` (or `/ 9`) provider-count literals.
- [ ] Every new/modified `assert()`/`expect()`/`expectEq()` message in this plan's tasks was sanity-checked via the break-one-assertion method (Tasks 5.5, 6.5, 7.6, 8.5, 9.5) and confirmed to produce a real, non-zero-exit failure — not a silent skip.

## Risks & Rollback

- **Risk:** dropping the `test:` job's `node-version` matrix (Task 3) reduces Node-version coverage to a single version (20) if a future contributor assumed multi-version testing was happening. **Mitigation:** it was already a single-entry matrix providing zero actual multi-version coverage; this is a naming fix, not a coverage reduction. **Rollback:** re-add `strategy: matrix: node-version: [20, 22]` and update `.github/settings.yml`'s contexts to `"test (20)"` / `"test (22)"` if broader version coverage is later desired.
- **Risk:** the new `provider-safety-net` CI job becomes a required check (via Task 3's `settings.yml` update) before it has been proven stable on `release`, potentially blocking legitimate PRs on a flaky new test. **Mitigation:** Tasks 5-9 each include a build → test → break-one-assertion → revert → re-test cycle before committing, so every new assertion is proven to both pass on real code and genuinely fail on broken code before it becomes a required gate. **Rollback:** remove `"provider-safety-net"` from `.github/settings.yml`'s `contexts:` list (GitHub Settings app re-syncs on the next push to a config-changing PR merged to the default branch) without touching the CI job itself, decoupling "job exists" from "job blocks merges."
- **Risk:** Task 12's `environmentManager.ts` fix changes the displayed score/ratio if `validation.providers`' key count ever diverges from 9 in the future (e.g., if a later plan expands `validateEnvironment()`'s provider list) — anyone with a saved/cached "score out of 100 assuming 9 providers" expectation would see different numbers. **Mitigation:** this is the entire point of the fix (stop the lie); the displayed ratio becomes more accurate, not less. **Rollback:** revert the single commit from Task 12; no other task depends on this change.
- **Risk:** Tasks 8-9's `formatProviderError` invocation via `provider as unknown as {formatProviderError(...): Error}` is a double type assertion — normally banned under project rule 14. **Mitigation:** rule 14 explicitly exempts test files; both usages are confined to `test/continuous-test-suite-providers-mocked.ts`, never `src/`. **Rollback:** none needed; this is compliant as written.
- **General rollback for any single task:** every task ends in its own commit with a Conventional Commits message; `git revert <sha>` cleanly undoes any one task without affecting the others, since no task's committed state depends on a later task's uncommitted changes (each task's validation step runs against the fully-committed state of all prior tasks).

## Out of Scope

- Extending the mocked-contract pattern to the remaining ~20 providers beyond OpenAI/Azure/Anthropic/Vertex/Bedrock (this plan's 5 targets) — covered by a per-provider onboarding requirement in the plan governing new-provider PR checklists, and by the plan covering providers ported/migrated in this redesign.
- Full `environmentManager.ts` provider-descriptor rewrite (deriving the entire validation matrix, not just the denominator, from a shared descriptor source covering all 30 canonical providers) — this plan's Task 12 only stops the hardcoded `/9` lie; the full derivation is owned by the plan covering `tools/automation/` provider-descriptor consolidation.
- Any `src/lib/` refactor of provider classes themselves (error-classifier gaps documented in Tasks 6-7 — Azure's missing 429 branch, Anthropic's 401 substring-match gap — are intentionally left as-is and merely asserted-as-documented; fixing the classifiers is a `src/` behavior change outside a CI-safety-net plan's scope).
- Wiring `test:ci`/`test:unit`/`test:live`/`test:product` into any GitHub Actions workflow beyond what Tasks 2 and 10 add — the pre-existing gap where most `test:*` npm scripts are invoked by no CI workflow or git hook at all remains, apart from the specific scripts this plan wires into `provider-safety-net`, `pre-push`, and `live-matrix.yml`.
