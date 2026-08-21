# ClientConfigurator Registry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the three hand-written proxy client config writers and their four duplicated call-site blocks with one registry, so onboarding a new AI coding CLI is one new file plus one registry line instead of eleven edits.

**Architecture:** Introduce a `ClientConfigurator` type — `{ id, displayName, detect(), apply(baseUrl), restore(baseUrl) }` — with one module per CLI under `src/cli/proxy-clients/`. A registry module exports the ordered list. The four call sites in `proxy.ts` collapse into two loops (`applyAll`, `restoreAll`). Behaviour is preserved exactly: same files written, same snapshot keys, same messages, same ordering (Claude → OpenCode → Codex).

**Tech Stack:** TypeScript (strict, `type` only — no `interface`), tsx test suites via `defineSuite`, yargs CLI, Prettier + ESLint with custom `neurolink/*` rules.

**Spec:** `docs/features/proxy-cli-onboarding.md` (§3 touch points, §5 "where it stops")

## Global Constraints

- **No `interface`.** Use `type X = { … }`; intersection (`&`) not `extends`. (CLAUDE.md rule 7, ESLint `neurolink/no-interface`.)
- **All types live in `src/lib/types/`.** No local type aliases in feature dirs. (rule 2, `neurolink/no-local-type-alias`.) Filenames must not contain "Type"/"Types" (rule 8).
- **Type names globally unique** across `src/lib/types/`; CLI types take the `Cli` prefix (rule 9).
- **Barrel-only type imports:** import from `../types/index.js`, never `../types/proxy.js` (rule 13).
- **No double assertions** (`x as unknown as T`) (rule 14).
- **`src/lib/types/index.ts` uses `export *` only** (rule 10).
- **Tests are end-to-end** unless the determinism exception applies, and then the file header must state what determinism buys (rule 15). `test/continuous-test-suite-proxy.ts` is already on the `allow` list in `eslint.config.js`.
- **Assertion messages must never quote a payload** — `defineSuite` downgrades a failure to SKIP when the message matches `isExpectedProviderError()`. Describe the discrepancy instead.
- **Never commit to `release`.** Branch `refactor/<kebab-description>`; conventional commits; no ticket prefix in this repo.
- **Behaviour must not change.** This is a pure refactor. Every file written, every snapshot key, every console string stays byte-identical.

---

## Why this refactor, in one paragraph

The three writers share no abstraction and disagree with each other in ways that have already shipped bugs. OpenCode targeted a directory OpenCode never reads and printed `✓` unconditionally (#1366, #1367 — both fixed); Claude still has **no installed-check at all** and creates `~/.claude/settings.json` even when Claude Code is absent; and the same operation reports failure at two different log levels depending on which command ran it (`logger.debug` at `proxy.ts:3499`'s block versus a visible yellow `⚠` at `:5416`'s). Four duplicated call-site blocks is what let those diverge. The registry removes the duplication that manufactures this class of bug.

---

## Current-state map (verified at commit `845c3692`)

**Writers, all in `src/cli/commands/proxy.ts`:**

| CLI      | Constants                                                                            | Apply                                               | Restore                                               | Snapshot mechanism                                      |
| -------- | ------------------------------------------------------------------------------------ | --------------------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------- |
| Claude   | `CLAUDE_SETTINGS_PATH:248`, `PROXY_MANAGED_KEYS:623`                                 | `setClaudeProxySettings:625` → `Promise<void>`      | `clearClaudeProxySettings:654` → `Promise<boolean>`   | `__proxy_original_env` key inside `settings.json`       |
| OpenCode | `getOpenCodeConfigDir:711`, `getOpenCodeConfigPath:724`, `OPENCODE_ORIGINAL_KEY:736` | `setOpenCodeProxySettings:738` → `Promise<boolean>` | `clearOpenCodeProxySettings:793` → `Promise<boolean>` | `__proxy_original_neurolink` key inside `opencode.json` |
| Codex    | `CODEX_CONFIG_PATH:878`, `CODEX_SNAPSHOT_PATH:879`                                   | `setCodexProxySettings:943` → `Promise<boolean>`    | `clearCodexProxySettings:1017` → `Promise<boolean>`   | sidecar `~/.neurolink/codex-proxy-snapshot.json`        |

**Call sites (12 calls across 4 blocks):**

| Block     | Lines                  | Context                            |
| --------- | ---------------------- | ---------------------------------- |
| Apply A   | `3499`, `3512`, `3526` | daemon start, inside `if (!isDev)` |
| Apply B   | `5416`, `5427`, `5438` | `proxy setup` wizard               |
| Restore A | `3202`, `3210`, `3215` | shutdown handler                   |
| Restore B | `5269`, `5271`, `5276` | `proxy guard` cleanup              |

**Three asymmetries the refactor MUST preserve:**

1. **Base URL differs per client.** Claude and Codex receive `url`; OpenCode receives `` `${url}/v1` ``. The configurator owns this suffix — callers pass the bare proxy URL.
2. **`clearClaudeProxySettings`'s return value is consumed** at `:5269` (`const cleared = await …`) and gates later logic in that block. `restoreAll` must return per-client results, not `void`.
3. **Apply B prints different strings from Apply A** (`✓ Claude Code configured` vs `✓ Auto-configured Claude Code settings`, plus Apply B's yellow `⚠` on failure). Keep both message sets; the loop takes them as parameters.

---

## File Structure

**Create:**

- `src/lib/types/proxyClient.ts` — the `CliProxyClientConfigurator` type and its result types. Types-folder rules forbid a `Types` suffix; `proxyClient.ts` is the canonical home.
- `src/cli/proxy-clients/claudeCode.ts` — Claude Code configurator.
- `src/cli/proxy-clients/openCode.ts` — OpenCode configurator.
- `src/cli/proxy-clients/codex.ts` — Codex configurator.
- `src/cli/proxy-clients/registry.ts` — ordered list + `applyAllClients` / `restoreAllClients`.

**Modify:**

- `src/lib/types/index.ts` — add `export * from "./proxyClient.js";`
- `src/cli/commands/proxy.ts` — delete the six writer functions and their constants; replace the four call-site blocks with loop calls.
- `test/continuous-test-suite-proxy.ts` — retarget the three OpenCode tests at the new module; add registry-level tests.
- `eslint.config.js` — no change expected; the proxy suite is already allow-listed.

**Why one file per client rather than one `configurators.ts`:** each client's snapshot mechanism is genuinely different (inline JSON key vs sidecar file vs TOML markers). Splitting by client keeps each file small enough to hold in context and means adding a fourth CLI touches no existing file except `registry.ts`.

---

### Task 1: Define the configurator type

**Files:**

- Create: `src/lib/types/proxyClient.ts`
- Modify: `src/lib/types/index.ts`
- Test: `test/continuous-test-suite-proxy.ts`

**Interfaces:**

- Consumes: nothing.
- Produces: `CliProxyClientConfigurator`, `CliProxyClientApplyResult`, `CliProxyClientRestoreResult` — used by every later task.

- [ ] **Step 1: Write the failing test**

Add near the other OpenCode cases in `test/continuous-test-suite-proxy.ts`:

Assert the _contract_, not the final roster — the roster is only complete after
Task 4, and every task must end with a green suite.

```typescript
async function testProxyClientRegistryShape(): Promise<boolean> {
  const { PROXY_CLIENT_CONFIGURATORS } =
    await import("../src/cli/proxy-clients/registry.js");
  if (!Array.isArray(PROXY_CLIENT_CONFIGURATORS)) {
    log("registry does not export an array of configurators", "red");
    return false;
  }
  const ids = new Set<string>();
  for (const configurator of PROXY_CLIENT_CONFIGURATORS) {
    if (ids.has(configurator.id)) {
      log("registry contains a duplicate configurator id", "red");
      return false;
    }
    ids.add(configurator.id);
    if (
      typeof configurator.displayName !== "string" ||
      typeof configurator.detect !== "function" ||
      typeof configurator.apply !== "function" ||
      typeof configurator.restore !== "function"
    ) {
      log(
        `configurator ${configurator.id} is missing a required member`,
        "red",
      );
      return false;
    }
  }
  return true;
}
```

Register it alongside the existing OpenCode entries:

```typescript
  {
    name: "Proxy clients: registry exposes the full configurator contract",
    fn: testProxyClientRegistryShape,
    category: "proxy-config",
  },
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx test/continuous-test-suite-proxy.ts 2>&1 | grep -i "registry"`
Expected: FAIL — the import throws `ERR_MODULE_NOT_FOUND` for `registry.js`.

- [ ] **Step 3: Write the type**

Create `src/lib/types/proxyClient.ts`:

```typescript
/**
 * One AI coding CLI the proxy can point at itself.
 *
 * Adding a CLI means adding one implementation of this type and one line in
 * `src/cli/proxy-clients/registry.ts`. Nothing else in the proxy should need
 * to know the client exists.
 */
export type CliProxyClientConfigurator = {
  /** Stable kebab-case identifier, e.g. "claude-code". */
  id: string;
  /** Human-readable name used in CLI output, e.g. "Claude Code". */
  displayName: string;
  /**
   * Whether this CLI appears to be installed. Configurators must not create
   * config files for a CLI the user never installed.
   */
  detect: () => Promise<boolean>;
  /**
   * Point the CLI at the proxy. `proxyBaseUrl` is the bare proxy origin
   * (e.g. "http://127.0.0.1:55669"); the configurator appends whatever path
   * suffix its CLI needs. Returns false when nothing was written, so callers
   * never print a success message for work that did not happen.
   */
  apply: (proxyBaseUrl: string) => Promise<boolean>;
  /**
   * Restore the user's previous configuration. `proxyBaseUrl` is the same bare
   * origin; a configurator that finds a different URL configured must leave it
   * alone and return false.
   */
  restore: (proxyBaseUrl: string) => Promise<boolean>;
};

/** Outcome of applying one configurator, for per-client CLI reporting. */
export type CliProxyClientApplyResult = {
  id: string;
  displayName: string;
  /** True only when the configurator actually wrote configuration. */
  applied: boolean;
  /** Present when the configurator threw; the caller decides how loud to be. */
  error?: Error;
};

/** Outcome of restoring one configurator. */
export type CliProxyClientRestoreResult = {
  id: string;
  displayName: string;
  /** True only when a previous configuration was actually restored. */
  restored: boolean;
  error?: Error;
};
```

Add to `src/lib/types/index.ts` (keep the file's alphabetical grouping, `export *` only):

```typescript
export * from "./proxyClient.js";
```

- [ ] **Step 4: Create a stub registry so the test can reach the contract**

Create `src/cli/proxy-clients/registry.ts`:

```typescript
import type { CliProxyClientConfigurator } from "../../lib/types/index.js";

/**
 * Every CLI the proxy auto-configures, in apply order.
 *
 * Order is behaviour: it is the order messages appear during `proxy start`.
 * Restore runs in the same order.
 */
export const PROXY_CLIENT_CONFIGURATORS: readonly CliProxyClientConfigurator[] =
  [];
```

- [ ] **Step 5: Run test to verify it now passes**

Run: `npx tsx test/continuous-test-suite-proxy.ts 2>&1 | grep -i "registry"`
Expected: PASS — the contract holds trivially over an empty registry. Each later
task adds a configurator and the same test keeps guarding the contract, so the
suite is green at every commit.

- [ ] **Step 6: Typecheck and commit the contract**

```bash
npx tsc --noEmit --strict
npx prettier --write src/lib/types/proxyClient.ts src/lib/types/index.ts src/cli/proxy-clients/registry.ts test/continuous-test-suite-proxy.ts
git add src/lib/types/proxyClient.ts src/lib/types/index.ts src/cli/proxy-clients/registry.ts test/continuous-test-suite-proxy.ts
git commit -m "refactor(proxy): define the client configurator contract"
```

---

### Task 2: Move the OpenCode writer behind the contract

Do OpenCode first: it is the only writer with existing regression tests, so it proves the contract against a covered client before the untested ones move.

**Files:**

- Create: `src/cli/proxy-clients/openCode.ts`
- Modify: `src/cli/proxy-clients/registry.ts`, `src/cli/commands/proxy.ts:711-843`, `test/continuous-test-suite-proxy.ts`
- Test: `test/continuous-test-suite-proxy.ts`

**Interfaces:**

- Consumes: `CliProxyClientConfigurator` from Task 1.
- Produces: `openCodeConfigurator`, and `__openCodeTestHooks` re-exported from the new module so existing tests keep a seam.

- [ ] **Step 1: Retarget the existing OpenCode tests at the new module**

In `test/continuous-test-suite-proxy.ts`, change all three OpenCode tests' import from

```typescript
const { __openCodeTestHooks } = await import("../src/cli/commands/proxy.js");
```

to

```typescript
const { __openCodeTestHooks } =
  await import("../src/cli/proxy-clients/openCode.js");
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx tsx test/continuous-test-suite-proxy.ts 2>&1 | grep -i "OpenCode"`
Expected: all three FAIL — `ERR_MODULE_NOT_FOUND` for `openCode.js`.

- [ ] **Step 3: Move the code**

Create `src/cli/proxy-clients/openCode.ts` containing, moved **verbatim** from `proxy.ts:711-843`: `getOpenCodeConfigDir`, `getOpenCodeConfigPath`, `OPENCODE_ORIGINAL_KEY`, `setOpenCodeProxySettings`, `clearOpenCodeProxySettings`, plus the `__openCodeTestHooks` export. Keep every comment — particularly the `systemManagedConfigDir()` note in `getOpenCodeConfigDir`, which exists to stop the darwin branch being re-added.

Add the configurator at the end of that file:

```typescript
import type { CliProxyClientConfigurator } from "../../lib/types/index.js";

export const openCodeConfigurator: CliProxyClientConfigurator = {
  id: "opencode",
  displayName: "OpenCode",
  detect: async () => {
    const fs = await import("fs");
    try {
      fs.accessSync(getOpenCodeConfigDir());
      return true;
    } catch {
      return false;
    }
  },
  // OpenCode talks OpenAI Chat Completions, so it points at the /v1 door
  // rather than the proxy root.
  apply: (proxyBaseUrl) => setOpenCodeProxySettings(`${proxyBaseUrl}/v1`),
  restore: (proxyBaseUrl) => clearOpenCodeProxySettings(`${proxyBaseUrl}/v1`),
};
```

Delete lines `711-843` from `proxy.ts` and its `__openCodeTestHooks` export. Import the two functions back into `proxy.ts` for now so the existing call sites still compile:

```typescript
import {
  setOpenCodeProxySettings,
  clearOpenCodeProxySettings,
} from "../proxy-clients/openCode.js";
```

Register it:

```typescript
import { openCodeConfigurator } from "./openCode.js";

export const PROXY_CLIENT_CONFIGURATORS: readonly CliProxyClientConfigurator[] =
  [openCodeConfigurator];
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx tsx test/continuous-test-suite-proxy.ts 2>&1 | grep -iE "OpenCode|registry"`
Expected: the three OpenCode tests PASS, and the registry-shape test still PASSES (it guards the contract, not the roster).

- [ ] **Step 5: Commit**

```bash
npx tsc --noEmit --strict
npx prettier --write src/cli/proxy-clients/openCode.ts src/cli/proxy-clients/registry.ts src/cli/commands/proxy.ts test/continuous-test-suite-proxy.ts
git add -A
git commit -m "refactor(proxy): move the OpenCode writer behind the configurator contract"
```

---

### Task 3: Move the Claude Code and Codex writers

**Files:**

- Create: `src/cli/proxy-clients/claudeCode.ts`, `src/cli/proxy-clients/codex.ts`
- Modify: `src/cli/proxy-clients/registry.ts`, `src/cli/commands/proxy.ts` (delete `:248`, `:623-709`, `:878-1087`)
- Test: `test/continuous-test-suite-proxy.ts`

**Interfaces:**

- Consumes: `CliProxyClientConfigurator`.
- Produces: `claudeCodeConfigurator`, `codexConfigurator`, and `__claudeCodeTestHooks` / `__codexClientTestHooks` seams mirroring `__openCodeTestHooks`.

- [ ] **Step 1: Write the failing test for the Claude installed-check**

This closes the remaining half of #1368 and fixes the one real behaviour gap: Claude is the only writer with no `detect()`.

```typescript
async function testClaudeConfiguratorDetectsInstall(): Promise<boolean> {
  const { claudeCodeConfigurator } =
    await import("../src/cli/proxy-clients/claudeCode.js");
  const prevHome = process.env.HOME;
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "neurolink-claude-"));
  try {
    process.env.HOME = path.join(root, "absent");
    if (await claudeCodeConfigurator.detect()) {
      log("Claude configurator reported installed with no ~/.claude", "red");
      return false;
    }
    const present = path.join(root, "present");
    fs.mkdirSync(path.join(present, ".claude"), { recursive: true });
    process.env.HOME = present;
    if (!(await claudeCodeConfigurator.detect())) {
      log("Claude configurator did not detect an existing ~/.claude", "red");
      return false;
    }
    return true;
  } finally {
    if (prevHome === undefined) {
      delete process.env.HOME;
    } else {
      process.env.HOME = prevHome;
    }
    fs.rmSync(root, { recursive: true, force: true });
  }
}
```

Register it:

```typescript
  {
    name: "Proxy clients: Claude configurator probes before writing",
    fn: testClaudeConfiguratorDetectsInstall,
    category: "proxy-config",
  },
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx test/continuous-test-suite-proxy.ts 2>&1 | grep -i "Claude configurator"`
Expected: FAIL — `ERR_MODULE_NOT_FOUND` for `claudeCode.js`.

- [ ] **Step 3: Move Claude**

Create `src/cli/proxy-clients/claudeCode.ts` with `CLAUDE_SETTINGS_PATH`, `PROXY_MANAGED_KEYS`, `setClaudeProxySettings`, `clearClaudeProxySettings` moved verbatim, then:

```typescript
import type { CliProxyClientConfigurator } from "../../lib/types/index.js";

/**
 * `CLAUDE_SETTINGS_PATH` is resolved per call rather than at module load so
 * that `detect()` and `apply()` agree when HOME changes (tests, and the
 * `--dev` isolation path).
 */
function getClaudeSettingsDir(): string {
  return join(homedir(), ".claude");
}

export const claudeCodeConfigurator: CliProxyClientConfigurator = {
  id: "claude-code",
  displayName: "Claude Code",
  // Previously absent: this writer created ~/.claude/settings.json even when
  // Claude Code had never been installed. Probe like the other two.
  detect: async () => {
    const fs = await import("fs");
    try {
      fs.accessSync(getClaudeSettingsDir());
      return true;
    } catch {
      return false;
    }
  },
  apply: async (proxyBaseUrl) => {
    await setClaudeProxySettings(proxyBaseUrl);
    return true;
  },
  restore: (proxyBaseUrl) => clearClaudeProxySettings(proxyBaseUrl),
};
```

Convert `CLAUDE_SETTINGS_PATH` from a module-level `const` into `getClaudeSettingsPath()` returning `join(getClaudeSettingsDir(), "settings.json")`, and update its three uses inside the moved functions — same change already made for OpenCode, and required for the test above to work.

- [ ] **Step 4: Move Codex**

Create `src/cli/proxy-clients/codex.ts` with `CODEX_CONFIG_PATH`, `CODEX_SNAPSHOT_PATH`, `CODEX_BLOCK_BEGIN`/`CODEX_BLOCK_END`, `CODEX_PROVIDER_LINE_RE`, `CODEX_MODEL_LINE_RE`, `stripCodexManagedConfig`, `editTomlPreamble`, `buildCodexProviderBlock`, `setCodexProxySettings`, `clearCodexProxySettings` moved verbatim, plus:

```typescript
import type { CliProxyClientConfigurator } from "../../lib/types/index.js";

export const codexConfigurator: CliProxyClientConfigurator = {
  id: "codex",
  displayName: "Codex",
  detect: async () => {
    const fs = await import("fs");
    return fs.existsSync(getCodexConfigPath());
  },
  // setCodexProxySettings appends "/backend-api/codex" itself, so it takes the
  // bare origin.
  apply: (proxyBaseUrl) => setCodexProxySettings(proxyBaseUrl),
  restore: (proxyBaseUrl) => clearCodexProxySettings(proxyBaseUrl),
};
```

Convert `CODEX_CONFIG_PATH` and `CODEX_SNAPSHOT_PATH` to `getCodexConfigPath()` / `getCodexSnapshotPath()` for the same HOME-resolution reason.

Delete all six functions and their constants from `proxy.ts`; import the ones the call sites still reference.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx tsx test/continuous-test-suite-proxy.ts 2>&1 | grep -iE "Claude configurator|OpenCode"`
Expected: PASS for all four.

- [ ] **Step 6: Commit**

```bash
npx tsc --noEmit --strict
npx prettier --write "src/cli/proxy-clients/*.ts" src/cli/commands/proxy.ts test/continuous-test-suite-proxy.ts
git add -A
git commit -m "refactor(proxy): move the Claude Code and Codex writers behind the contract

Claude Code gains the installed-check the other two already had; it no longer
creates ~/.claude/settings.json for a CLI that was never installed."
```

---

### Task 4: Collapse the four call sites into two loops

**Files:**

- Modify: `src/cli/proxy-clients/registry.ts`, `src/cli/commands/proxy.ts` (blocks at `3499-3538`, `5416-5450`, `3202-3218`, `5269-5279`)
- Test: `test/continuous-test-suite-proxy.ts`

**Interfaces:**

- Consumes: all three configurators.
- Produces: `applyAllClients(proxyBaseUrl)` → `Promise<CliProxyClientApplyResult[]>`, `restoreAllClients(proxyBaseUrl)` → `Promise<CliProxyClientRestoreResult[]>`.

- [ ] **Step 1: Write the failing test**

```typescript
async function testApplyAllReportsPerClient(): Promise<boolean> {
  const { applyAllClients, restoreAllClients } =
    await import("../src/cli/proxy-clients/registry.js");
  const prevHome = process.env.HOME;
  const prevXdg = process.env.XDG_CONFIG_HOME;
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "neurolink-clients-"));
  try {
    // Only OpenCode is "installed": its config dir exists, the other two do not.
    process.env.HOME = root;
    process.env.XDG_CONFIG_HOME = path.join(root, ".config");
    fs.mkdirSync(path.join(root, ".config", "opencode"), { recursive: true });

    const applied = await applyAllClients("http://127.0.0.1:55669");
    if (applied.map((r) => r.id).join(",") !== "claude-code,opencode,codex") {
      log("applyAllClients returned results out of registry order", "red");
      return false;
    }
    const byId = new Map(applied.map((r) => [r.id, r]));
    if (byId.get("opencode")?.applied !== true) {
      log("installed client was not reported as applied", "red");
      return false;
    }
    if (byId.get("codex")?.applied !== false) {
      log("absent client was reported as applied", "red");
      return false;
    }

    const restored = await restoreAllClients("http://127.0.0.1:55669");
    if (restored.length !== 3) {
      log("restoreAllClients did not report every client", "red");
      return false;
    }
    return true;
  } finally {
    if (prevHome === undefined) delete process.env.HOME;
    else process.env.HOME = prevHome;
    if (prevXdg === undefined) delete process.env.XDG_CONFIG_HOME;
    else process.env.XDG_CONFIG_HOME = prevXdg;
    fs.rmSync(root, { recursive: true, force: true });
  }
}
```

Register as `"Proxy clients: applyAll reports each client independently"`, category `proxy-config`.

Add the roster assertion here too — this is the first task at which the full
roster exists, so this is where pinning it is meaningful:

```typescript
async function testProxyClientRoster(): Promise<boolean> {
  const { PROXY_CLIENT_CONFIGURATORS } =
    await import("../src/cli/proxy-clients/registry.js");
  const ids = PROXY_CLIENT_CONFIGURATORS.map((c) => c.id).join(",");
  if (ids !== "claude-code,opencode,codex") {
    log(
      "configurator roster or order changed — apply order is behaviour",
      "red",
    );
    return false;
  }
  return true;
}
```

Register as `"Proxy clients: roster and apply order are pinned"`, category `proxy-config`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx test/continuous-test-suite-proxy.ts 2>&1 | grep -i "applyAll"`
Expected: FAIL — `applyAllClients is not a function`.

- [ ] **Step 3: Implement the loops**

Append to `src/cli/proxy-clients/registry.ts`:

```typescript
import type {
  CliProxyClientApplyResult,
  CliProxyClientRestoreResult,
} from "../../lib/types/index.js";

/**
 * Point every detected client at the proxy.
 *
 * One client failing must never stop the others, so each is wrapped
 * independently and its error is returned rather than thrown. Callers decide
 * how loudly to report — historically the daemon-start path logged failures at
 * debug level while the setup wizard printed a visible warning.
 */
export async function applyAllClients(
  proxyBaseUrl: string,
): Promise<CliProxyClientApplyResult[]> {
  const results: CliProxyClientApplyResult[] = [];
  for (const client of PROXY_CLIENT_CONFIGURATORS) {
    try {
      const applied = (await client.detect())
        ? await client.apply(proxyBaseUrl)
        : false;
      results.push({ id: client.id, displayName: client.displayName, applied });
    } catch (error) {
      results.push({
        id: client.id,
        displayName: client.displayName,
        applied: false,
        error: error instanceof Error ? error : new Error(String(error)),
      });
    }
  }
  return results;
}

/** Restore every client's previous configuration. See applyAllClients. */
export async function restoreAllClients(
  proxyBaseUrl: string,
): Promise<CliProxyClientRestoreResult[]> {
  const results: CliProxyClientRestoreResult[] = [];
  for (const client of PROXY_CLIENT_CONFIGURATORS) {
    try {
      results.push({
        id: client.id,
        displayName: client.displayName,
        restored: await client.restore(proxyBaseUrl),
      });
    } catch (error) {
      results.push({
        id: client.id,
        displayName: client.displayName,
        restored: false,
        error: error instanceof Error ? error : new Error(String(error)),
      });
    }
  }
  return results;
}
```

- [ ] **Step 4: Replace Apply block A** (`proxy.ts`, the `if (!isDev)` block containing lines `3499-3538`)

```typescript
for (const result of await applyAllClients(url)) {
  if (result.error) {
    logger.debug(
      `[proxy] Failed to auto-configure ${result.displayName}: ${result.error.message}`,
    );
    continue;
  }
  if (result.applied) {
    logger.always(
      chalk.green(`  ✓ Auto-configured ${result.displayName} settings`),
    );
    logger.always(
      chalk.dim(`    Restart ${result.displayName} to connect through proxy`),
    );
  }
}
```

- [ ] **Step 5: Replace Apply block B** (`proxy.ts`, lines `5416-5450`, the setup wizard)

```typescript
for (const result of await applyAllClients(url)) {
  if (result.error) {
    console.info(
      chalk.yellow(
        `  ⚠ Could not auto-configure ${result.displayName}: ${result.error.message}`,
      ),
    );
    continue;
  }
  if (result.applied) {
    console.info(chalk.green(`  ✓ ${result.displayName} configured`));
  }
}
```

Note: the wizard previously printed `Set manually: ANTHROPIC_BASE_URL=<url>` only on a Claude failure. Preserve it by checking `result.id === "claude-code"` inside the error branch.

- [ ] **Step 6: Replace Restore blocks A and B** (`proxy.ts` lines `3202-3218` and `5269-5279`)

```typescript
await restoreAllClients(shutdownBaseUrl);
```

For block B, `clearClaudeProxySettings`'s return value was consumed as `cleared`. Preserve it:

```typescript
const results = await restoreAllClients(expectedBaseUrl);
const cleared = results.find((r) => r.id === "claude-code")?.restored ?? false;
```

- [ ] **Step 7: Run the full proxy suite**

Run: `npx tsx test/continuous-test-suite-proxy.ts`
Expected: PASS, including the new roster test. Skips are acceptable only for the credential-gated cases.

- [ ] **Step 8: Verify the shipped CLI still configures clients**

```bash
pnpm run build:cli
HOME=$(mktemp -d) node -e '
const os=require("os"),fs=require("fs"),path=require("path");
fs.mkdirSync(path.join(process.env.HOME,".config","opencode"),{recursive:true});
process.env.XDG_CONFIG_HOME=path.join(process.env.HOME,".config");
import("./dist/cli/proxy-clients/registry.js").then(async (m)=>{
  const r=await m.applyAllClients("http://127.0.0.1:55669");
  console.log(r.map(x=>`${x.id}=${x.applied}`).join(" "));
});'
```

Expected: `claude-code=false opencode=true codex=false` — proving `detect()` gates writes in the built artifact.

- [ ] **Step 9: Commit**

```bash
npx tsc --noEmit --strict
NODE_OPTIONS='--max-old-space-size=8192' npx eslint src/cli/proxy-clients src/cli/commands/proxy.ts test/continuous-test-suite-proxy.ts
npx prettier --write "src/cli/proxy-clients/*.ts" src/cli/commands/proxy.ts
git add -A
git commit -m "refactor(proxy): collapse the four client config call sites into two loops"
```

---

### Task 5: Prove the refactor pays off — add Qwen Code

The registry is only worth having if a fourth client is cheap. This task is the proof, and it delivers real coverage (`docs/features/proxy-cli-onboarding.md` §1 lists Qwen as installed and OpenAI-compatible).

**Files:**

- Create: `src/cli/proxy-clients/qwenCode.ts`
- Modify: `src/cli/proxy-clients/registry.ts` (one line), `docs/features/proxy-cli-onboarding.md`
- Test: `test/continuous-test-suite-proxy.ts`

**Interfaces:**

- Consumes: `CliProxyClientConfigurator`.
- Produces: `qwenCodeConfigurator`.

- [ ] **Step 1: Write the failing test**

```typescript
async function testQwenConfiguratorRegistered(): Promise<boolean> {
  const { PROXY_CLIENT_CONFIGURATORS } =
    await import("../src/cli/proxy-clients/registry.js");
  const qwen = PROXY_CLIENT_CONFIGURATORS.find((c) => c.id === "qwen-code");
  if (!qwen) {
    log("qwen-code configurator is not registered", "red");
    return false;
  }
  if (qwen.displayName !== "Qwen Code") {
    log("qwen-code display name is not the user-facing product name", "red");
    return false;
  }
  return true;
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx test/continuous-test-suite-proxy.ts 2>&1 | grep -i "qwen"`
Expected: FAIL with "qwen-code configurator is not registered".

- [ ] **Step 3: Implement**

Qwen Code reads `OPENAI_BASE_URL` and `OPENAI_API_KEY` from its settings file — verified: `@qwen-code/qwen-code@0.17.0`'s `cli.js` contains 7 `OPENAI_BASE_URL` occurrences read via `process.env["OPENAI_BASE_URL"]`. Before implementing, confirm the on-disk settings shape by reading `~/.qwen/settings.json` on a machine with Qwen installed; if the file does not exist, implement the env-var path only and mark the configurator's doc comment `@unverified`, matching how `codexUsage.ts` handles an unconfirmed wire shape.

```typescript
import type { CliProxyClientConfigurator } from "../../lib/types/index.js";

export const qwenCodeConfigurator: CliProxyClientConfigurator = {
  id: "qwen-code",
  displayName: "Qwen Code",
  detect: async () => {
    const fs = await import("fs");
    const { homedir } = await import("os");
    const { join } = await import("path");
    try {
      fs.accessSync(join(homedir(), ".qwen"));
      return true;
    } catch {
      return false;
    }
  },
  // Qwen speaks OpenAI Chat Completions, so it points at the /v1 door.
  apply: async (proxyBaseUrl) => writeQwenSettings(`${proxyBaseUrl}/v1`),
  restore: async (proxyBaseUrl) => restoreQwenSettings(`${proxyBaseUrl}/v1`),
};
```

Implement `writeQwenSettings` / `restoreQwenSettings` mirroring `openCode.ts`'s snapshot pattern (`__proxy_original_*` key inside the same file, written only on first touch).

Register with one line in `registry.ts`.

This invalidates the roster test added in Task 4 — update it to
`"claude-code,opencode,codex,qwen-code"`. That the roster test is the _only_
existing test needing a change is the measurable payoff this task is proving.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx test/continuous-test-suite-proxy.ts 2>&1 | grep -i "qwen"`
Expected: PASS.

- [ ] **Step 5: Update the coverage doc**

In `docs/features/proxy-cli-onboarding.md`, move Qwen Code from "easy" to "live" in the §1 table, and replace §3's eleven-row touch-point table with the new two-step process (one file under `src/cli/proxy-clients/`, one line in `registry.ts`).

- [ ] **Step 6: Commit**

```bash
npx tsc --noEmit --strict
npx prettier --write "src/cli/proxy-clients/*.ts" test/continuous-test-suite-proxy.ts docs/features/proxy-cli-onboarding.md
git add -A
git commit -m "feat(proxy): auto-configure Qwen Code through the client registry"
```

---

## Final verification

- [ ] `npx tsc --noEmit --strict` — clean
- [ ] `NODE_OPTIONS='--max-old-space-size=8192' npx eslint .` — 0 errors
- [ ] `npx tsx test/continuous-test-suite-proxy.ts` — PASS, no unexpected skips
- [ ] `npx tsx test/continuous-test-suite-codex.ts` — PASS
- [ ] `pnpm run test:providers-mocked && pnpm run test:provider-structure && pnpm run test:error-classifier-contract` — the three CI gates
- [ ] `pnpm run build` — clean, publint "All good!"
- [ ] `pnpm run proxy:performance` — the `proxy-performance` CI gate; this refactor touches `proxy.ts`, which it benchmarks
- [ ] **Break one assertion on purpose** and confirm the suite reports `✗` and exits non-zero rather than `⊘` — the `isExpectedProviderError()` skip-masking hazard
- [ ] Manually confirm `proxy start` then `Ctrl+C` leaves `~/.claude/settings.json`, `~/.codex/config.toml` and `~/.config/opencode/opencode.json` byte-identical to before

## Risks

- **Behaviour drift in messages.** The two apply blocks print different strings. The loop parameterises them; a careless merge collapses them into one wording and changes user-visible output. The manual check above catches it.
- **HOME resolution timing.** Three module-level path constants become functions. If any moved function still closes over a stale constant, tests pass under the suite's isolated HOME but the real writer targets the wrong path — the exact shape of #1366. Grep for remaining `const .*_PATH = join(homedir()` after Task 3.
- **`proxy-performance` gate.** `proxy.ts` shrinks by roughly 400 lines; the benchmark job imports `proxyLifecycle.ts` and `proxyActivity.ts`, not the writers, so impact is unlikely — but it is an always-on CI gate, so run it before pushing.

---

## Post-review addenda

Two defects surfaced in review after the registry landed. Both are recorded here
because they are properties of the _lifecycle_ the registry now owns, not of any
one configurator.

### The snapshot must not outlive the value it describes

Each JSON writer persists the user's pre-existing value under a
`__proxy_original_*` key **inside the user's own config file**, so a restore
still works after a crash or from another process. Snapshotting only on first
touch stops a second `apply()` from recording the proxy's own block as the
"original".

That guard is presence-only, and the sentinel survives an unclean kill where no
restore ever ran. A user who then edits the block by hand — reasonably, since
the proxy is gone — hits this sequence:

1. `apply()` writes the proxy block; snapshot records "user had nothing".
2. `kill -9`. No restore. Sentinel stays in the file.
3. User replaces the block with their own provider config and API key.
4. Proxy restarts. `apply()` sees the sentinel, keeps the stale snapshot, and
   overwrites the user's block.
5. Clean shutdown. `restore()` reads "user had nothing" and **deletes** it.

For Qwen that final step destroys a live credential. Each writer therefore also
records what it wrote, under `__proxy_written_*`; `shouldCaptureSnapshot()` in
`snapshot.ts` re-snapshots whenever the value in the file is not the value we
put there. A file written before this change carries no `__proxy_written_*` key,
so the old behaviour is preserved for exactly one apply, then self-heals.

### `uninstall` is the only restore point a service ever reaches

`restoreAllClients()` runs from the shutdown path only under
`signal === "SIGINT"`. A launchd-managed service never receives one: `launchctl
unload`, `launchctl stop` and `proxy uninstall` all send SIGTERM, and the
supervisor's own shutdown closure never touched client configs at all. The
fail-open guard that would otherwise cover this is not spawned when
`managedByLaunchd`.

So the documented one-command install — `neurolink proxy setup` — left all five
CLIs pointing at a dead socket after uninstall, silently. `uninstall` now calls
`restoreClientsOnUninstall()` before `clearProxyState()`, deriving the URL from
the recorded host/port (`0.0.0.0` normalised to `localhost`, matching what the
clients were actually handed).

Widening the signal gate was considered and rejected: a service also receives
SIGTERM on reboot and on rolling restart, where restoring would be wrong.
`uninstall` is the one point where "going away for good" is unambiguous.

The regression test drives the built CLI rather than the helper, because the
defect _was_ the missing wiring — a test calling the helper directly would have
passed for as long as the bug existed.
