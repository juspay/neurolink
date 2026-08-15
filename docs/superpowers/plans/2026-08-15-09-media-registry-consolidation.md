# Media Registry Consolidation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the six hand-duplicated media-handler registries (TTS, STT, Realtime, Video, Music, Avatar) with one generic `HandlerRegistry<THandler>`, collapse their dual auto-registration paths into a single explicit call chain, and centralize the "which output mode does this request want" decision that is currently computed independently in two different files.

**Architecture:** A new `src/lib/core/handlerRegistry.ts` generic class absorbs the byte-identical validation/normalization/overwrite-warning logic that all six processors currently hand-roll around their own `Map<string, THandler>`; each processor composes one instance internally while keeping its exact public static API (including its own per-ecosystem debug-log phrasing and any extra logging). A pure-data `mediaHandlerCatalog.ts` (mirroring plan 04's `providerDescriptors.ts` pattern) becomes the single source of truth for provider names/aliases per media kind, consumed by each ecosystem's barrel module, by `providerRegistry.ts`'s single registration path, and by the CLI's `choices` arrays. A new pure function `resolveRequestKind()` centralizes the mode-detection logic (image / video / music / avatar / ppt / tts-direct / text) that today is duplicated across `neurolink.ts` and `baseProvider.ts`, and both call sites are wired to call it instead of re-deriving the decision inline.

**Tech Stack:** TypeScript (strict), pnpm, tsx-driven no-API test suites using the existing `test/helpers/harness.ts` `defineSuite`/`test`/`assert` API.

**Spec:**

- `/private/tmp/claude-501/-Users-sachinsharma-Developer-temp-neurolink-fork-feat-proider-redesign/47d64fa8-f94f-404c-b134-3e117deddba3/scratchpad/areas/08-non-text-provider-ecosystems-image-video-tts-stt-r.md`
- `/private/tmp/claude-501/-Users-sachinsharma-Developer-temp-neurolink-fork-feat-proider-redesign/47d64fa8-f94f-404c-b134-3e117deddba3/scratchpad/areas/02-sdk-entry-orchestration-src-lib-neurolink-ts-gener.md`

## Global Constraints

- pnpm ONLY. `pnpm run check` / `pnpm run lint` / `pnpm run build`. Tests via `npx tsx test/continuous-test-suite-<name>.ts` + `test:<name>` scripts (test:media, test:tts exist — read them before adding).
- TEST HARNESS SKIP HAZARD: NEVER interpolate payloads into assertion messages; break-one-assertion sanity step for new suites.
- Repo rules: ALL types in src/lib/types/; no `interface`; unique exported type names; types barrel `export *` only; barrel-only internal type imports; no double assertions; named exports only. Public static APIs of the six processors preserved (callers don't change); public SDK result shapes preserved.
- Conventional commits; commit per task; NEVER `git push`.
- Related contracts: plan 04 produces the pure-data-module pattern (src/lib/factories/providerDescriptors.ts) — mirror it for your mediaHandlerCatalog.ts; plan 01 fixes the isImageGenerationModel dispatch sites (consume that fix, don't redo it).

---

## Before you start

Read these files end-to-end before touching anything — every task below assumes you already know their exact current contents:

- `src/lib/utils/ttsProcessor.ts`, `src/lib/utils/sttProcessor.ts`, `src/lib/utils/musicProcessor.ts`, `src/lib/utils/avatarProcessor.ts`, `src/lib/utils/videoProcessor.ts`, `src/lib/voice/RealtimeVoiceAPI.ts`
- `src/lib/voice/index.ts`, `src/lib/music/index.ts`, `src/lib/avatar/index.ts`
- `src/lib/factories/providerRegistry.ts` (lines ~40-70 and ~740-1160)
- `src/lib/core/baseProvider.ts` (top imports; lines ~330-430; ~1350-1440; ~2595-2730)
- `src/lib/neurolink.ts` (lines ~4790-4885)
- `src/lib/core/constants.ts` (`IMAGE_GENERATION_MODELS`, `isImageGenerationModel`)
- `src/lib/types/generate.ts`, `src/lib/types/cli.ts`, `src/lib/types/video.ts`
- `test/helpers/harness.ts`, `test/continuous-test-suite-tts-unit.ts` (the no-API unit-test exemplar you will mirror), `test/continuous-test-suite-video.ts` (tests unrelated file-upload video processing — do NOT confuse with the video-_generation_ registry this plan touches)

---

### Task 1: Generic `HandlerRegistry<THandler>`

**Files:**

- `src/lib/core/handlerRegistry.ts` (new)
- `test/continuous-test-suite-handler-registry.ts` (new)
- `package.json` (new script)

**Interfaces:**

```typescript
export class HandlerRegistry<THandler> {
  constructor(scopeName: string);
  register(providerName: string, handler: THandler): void;
  supports(providerName: string): boolean;
  get(providerName: string): THandler | undefined;
  list(): string[];
  clear(): void;
}
```

- [ ] Write a failing test for registration + lookup parity. Create `test/continuous-test-suite-handler-registry.ts`:

  ```typescript
  #!/usr/bin/env tsx
  /**
   * Continuous Test Suite: HandlerRegistry<THandler> (no API).
   *
   * Covers the generic registry that every media-handler ecosystem (TTS, STT,
   * Realtime, Video, Music, Avatar) now composes instead of hand-rolling its
   * own Map<string, THandler>. This suite exercises the generic class in
   * isolation; each ecosystem's own unit suite separately asserts that its
   * processor still exposes the same public behavior after switching to it.
   *
   * Run: npx tsx test/continuous-test-suite-handler-registry.ts
   */
  import { defineSuite, assert, assertEqual } from "./helpers/harness.js";
  import { HandlerRegistry } from "../src/lib/core/handlerRegistry.js";

  const { test, runSuite } = defineSuite("HandlerRegistry (unit)");

  type StubHandler = { id: string };

  await test("register makes a provider resolvable via supports/get", () => {
    const registry = new HandlerRegistry<StubHandler>("StubScope");
    const handler: StubHandler = { id: "h1" };
    registry.register("provider-a", handler);
    assertEqual(registry.supports("provider-a"), true, "supports() sees it");
    assertEqual(
      registry.get("provider-a"),
      handler,
      "get() returns the same instance",
    );
  });

  await test("provider names are normalized to lowercase", () => {
    const registry = new HandlerRegistry<StubHandler>("StubScope");
    const handler: StubHandler = { id: "h1" };
    registry.register("Provider-A", handler);
    assertEqual(
      registry.supports("provider-a"),
      true,
      "lookup is case-insensitive",
    );
    assertEqual(
      registry.get("PROVIDER-A"),
      handler,
      "get() is also case-insensitive",
    );
  });

  await test("an unregistered provider is not claimed", () => {
    const registry = new HandlerRegistry<StubHandler>("StubScope");
    assertEqual(
      registry.supports("nope"),
      false,
      "supports() is false for unknown providers",
    );
    assertEqual(
      registry.get("nope"),
      undefined,
      "get() returns undefined rather than throwing",
    );
  });

  await test("registering without a provider name throws", () => {
    const registry = new HandlerRegistry<StubHandler>("StubScope");
    let threw = false;
    try {
      registry.register("", { id: "h1" });
    } catch (err) {
      threw =
        err instanceof Error && err.message === "Provider name is required";
    }
    assert(threw, "empty provider name is rejected with the expected message");
  });

  await test("registering without a handler throws", () => {
    const registry = new HandlerRegistry<StubHandler>("StubScope");
    let threw = false;
    try {
      registry.register("provider-a", undefined as unknown as StubHandler);
    } catch (err) {
      threw = err instanceof Error && err.message === "Handler is required";
    }
    assert(threw, "missing handler is rejected with the expected message");
  });

  await test("re-registering a provider replaces the previous handler", () => {
    const registry = new HandlerRegistry<StubHandler>("StubScope");
    const first: StubHandler = { id: "first" };
    const second: StubHandler = { id: "second" };
    registry.register("provider-a", first);
    registry.register("provider-a", second);
    assertEqual(
      registry.get("provider-a"),
      second,
      "the later registration wins",
    );
  });

  await test("list returns every registered provider name", () => {
    const registry = new HandlerRegistry<StubHandler>("StubScope");
    registry.register("provider-a", { id: "a" });
    registry.register("provider-b", { id: "b" });
    const names = registry.list().sort();
    assertEqual(names.length, 2, "two providers registered");
    assertEqual(names[0], "provider-a", "first name present");
    assertEqual(names[1], "provider-b", "second name present");
  });

  await test("clear removes every registration", () => {
    const registry = new HandlerRegistry<StubHandler>("StubScope");
    registry.register("provider-a", { id: "a" });
    registry.clear();
    assertEqual(registry.list().length, 0, "no providers remain after clear()");
    assertEqual(
      registry.supports("provider-a"),
      false,
      "cleared provider is no longer supported",
    );
  });

  await test("two independent instances do not share state", () => {
    const registryOne = new HandlerRegistry<StubHandler>("ScopeOne");
    const registryTwo = new HandlerRegistry<StubHandler>("ScopeTwo");
    registryOne.register("provider-a", { id: "a" });
    assertEqual(
      registryTwo.supports("provider-a"),
      false,
      "each processor's registry is isolated",
    );
  });

  await runSuite();
  ```

- [ ] Run it and verify it fails because `src/lib/core/handlerRegistry.ts` does not exist yet: `npx tsx test/continuous-test-suite-handler-registry.ts` — expect a module-resolution error (`Cannot find module '../src/lib/core/handlerRegistry.js'`).
- [ ] Implement `src/lib/core/handlerRegistry.ts`:

  ```typescript
  import { logger } from "../utils/logger.js";

  /**
   * Generic provider-name → handler registry shared by every media-generation
   * ecosystem (TTS, STT, Realtime, Video, Music, Avatar). Each ecosystem's own
   * processor class composes one instance of this class instead of hand-rolling
   * its own `Map<string, THandler>` plus register/supports/get/list methods.
   *
   * Centralizes only the behavior that was byte-identical across all six
   * hand-rolled registries: input validation, name normalization (lowercase),
   * the overwrite-warning log line, and the four lookup/list/clear operations.
   * Registration-outcome debug logging (whose exact phrasing differs per
   * ecosystem — e.g. "Registered TTS handler..." vs "Registered video
   * handler...") and any ecosystem-specific extra logging (e.g. TTS/STT's
   * `supports()` diagnostics) stay in the owning processor's own wrapper
   * methods; this class does not attempt to unify those.
   */
  export class HandlerRegistry<THandler> {
    private readonly handlers = new Map<string, THandler>();

    /**
     * @param scopeName Log-line prefix, e.g. "TTSProcessor" — matches the
     *   `[ClassName]` prefix each processor already uses in its own logs.
     */
    constructor(private readonly scopeName: string) {}

    register(providerName: string, handler: THandler): void {
      if (!providerName) {
        throw new Error("Provider name is required");
      }
      if (!handler) {
        throw new Error("Handler is required");
      }
      const key = providerName.toLowerCase();
      if (this.handlers.has(key)) {
        logger.warn(
          `[${this.scopeName}] Overwriting existing handler for provider: ${key}`,
        );
      }
      this.handlers.set(key, handler);
    }

    supports(providerName: string): boolean {
      if (!providerName) {
        return false;
      }
      return this.handlers.has(providerName.toLowerCase());
    }

    get(providerName: string): THandler | undefined {
      return this.handlers.get(providerName.toLowerCase());
    }

    list(): string[] {
      return Array.from(this.handlers.keys());
    }

    clear(): void {
      this.handlers.clear();
      logger.debug(`[${this.scopeName}] Cleared all handlers`);
    }
  }
  ```

- [ ] Run the test again and verify it passes: `npx tsx test/continuous-test-suite-handler-registry.ts` — expect `RESULT: PASS`, `Failed: 0`.
- [ ] Sanity-check the harness: temporarily change the `"re-registering a provider replaces the previous handler"` assertion to compare against `first` instead of `second`, run the suite, confirm it reports `✗` and exits non-zero (not `⊘`), then revert the change.
- [ ] Add `"test:handler-registry": "npx tsx test/continuous-test-suite-handler-registry.ts",` to `package.json`'s scripts block, placed alphabetically near the other `test:` entries (immediately before `"test:litellm-context"` or in the nearest alphabetical slot for `h`).
- [ ] Run `pnpm run check` and `pnpm run lint` — fix any errors.
- [ ] Commit: `git add src/lib/core/handlerRegistry.ts test/continuous-test-suite-handler-registry.ts package.json && git commit -m "feat(core): add generic HandlerRegistry<THandler>"`

---

### Task 2: TTSProcessor composes HandlerRegistry

**Files:**

- `src/lib/utils/ttsProcessor.ts`
- `test/continuous-test-suite-tts-unit.ts` (extend existing)

**Interfaces:** `TTSProcessor.registerHandler`, `.supports`, `.getHandler`, plus new `TTSProcessor.clearHandlers(): void` — all unchanged signatures except the new method.

- [ ] Write a failing test for the new `clearHandlers()` method. Add to the end of `test/continuous-test-suite-tts-unit.ts`, immediately before the `#479` OpenAI-format block (i.e. right after the `"getVoices reaches the handler"` test and before the `"#479: flac..."` test):
  ```typescript
  await test("clearHandlers removes every registered TTS handler", () => {
    const { handler } = makeStubHandler();
    TTSProcessor.registerHandler(PROVIDER, handler);
    assertEqual(TTSProcessor.supports(PROVIDER), true, "handler is registered");
    TTSProcessor.clearHandlers();
    assertEqual(
      TTSProcessor.supports(PROVIDER),
      false,
      "clearHandlers() removes every registration",
    );
    // Re-register so later tests in this suite (and any other suite run in
    // the same process) still find a handler under PROVIDER.
    TTSProcessor.registerHandler(PROVIDER, handler);
  });
  ```
- [ ] Run it and verify it fails: `npx tsx test/continuous-test-suite-tts-unit.ts` — expect a TypeScript error (`Property 'clearHandlers' does not exist on type 'typeof TTSProcessor'`).
- [ ] Implement the refactor in `src/lib/utils/ttsProcessor.ts`. Add the import and the internal registry instance, then replace `registerHandler`/`supports`/`getHandler` to delegate, and add `clearHandlers`:
  ```typescript
  import { HandlerRegistry } from "../core/handlerRegistry.js";
  ```
  Replace the `private static readonly handlers = new Map<string, TTSHandler>();` field with:
  ```typescript
  private static readonly registry = new HandlerRegistry<TTSHandler>(
    "TTSProcessor",
  );
  ```
  Replace the body of `registerHandler` (keep the same public signature) with:
  ```typescript
  static registerHandler(providerName: string, handler: TTSHandler): void {
    const normalizedName = providerName ? providerName.toLowerCase() : providerName;
    this.registry.register(providerName, handler);
    logger.debug(
      `[TTSProcessor] Registered TTS handler for provider: ${normalizedName}`,
    );
  }
  ```
  Replace the body of `getHandler` (keep its JSDoc and public signature) with:
  ```typescript
  static getHandler(providerName: string): TTSHandler | undefined {
    return this.registry.get(providerName);
  }
  ```
  In `supports`, keep the existing extra logging (`"[TTSProcessor] Provider name is required for supports check"` / `"[TTSProcessor] Provider ${providerName} is not supported"`) exactly as-is, but delegate the actual lookup to the registry:
  ```typescript
  static supports(providerName: string): boolean {
    if (!providerName) {
      logger.error(
        "[TTSProcessor] Provider name is required for supports check",
      );
      return false;
    }
    const isSupported = this.registry.supports(providerName);
    if (!isSupported) {
      logger.debug(`[TTSProcessor] Provider ${providerName} is not supported`);
    }
    return isSupported;
  }
  ```
  Replace the internal `Array.from(this.handlers.keys())` (used when building the "unsupported provider" error context, ~line 256) with `this.registry.list()`.
  Add the new method (placed near `getHandler`):
  ```typescript
  /**
   * Removes every registered TTS handler. Primarily for test isolation —
   * production code should not need to call this.
   */
  static clearHandlers(): void {
    this.registry.clear();
  }
  ```
- [ ] Run the test and verify it passes: `npx tsx test/continuous-test-suite-tts-unit.ts` — expect `RESULT: PASS`.
- [ ] Run `pnpm run check` and `pnpm run lint` — fix any errors (in particular, confirm `handlers` is no longer referenced anywhere else in the file).
- [ ] Commit: `git add src/lib/utils/ttsProcessor.ts test/continuous-test-suite-tts-unit.ts && git commit -m "refactor(tts): compose HandlerRegistry in TTSProcessor"`

---

### Task 3: STTProcessor composes HandlerRegistry

**Files:**

- `src/lib/utils/sttProcessor.ts`
- `test/continuous-test-suite-stt-unit.ts` (new)
- `package.json` (new script)

**Interfaces:** `STTProcessor.registerHandler`, `.supports`, `.getHandler` unchanged; new `STTProcessor.clearHandlers(): void`.

- [ ] Write a failing test suite. Create `test/continuous-test-suite-stt-unit.ts`, mirroring the TTS exemplar's stub-handler pattern:

  ```typescript
  #!/usr/bin/env tsx
  /**
   * Continuous Test Suite: STTProcessor unit tests (no API).
   *
   * Mirrors continuous-test-suite-tts-unit.ts. Every live STT suite needs real
   * credentials, so this covers the registry/validation/dispatch logic with a
   * stub handler — the parts that can be tested without a network call.
   *
   * Run: npx tsx test/continuous-test-suite-stt-unit.ts
   */
  import {
    defineSuite,
    assert,
    assertEqual,
    assertIncludes,
  } from "./helpers/harness.js";
  import {
    STTProcessor,
    STTError,
    STT_ERROR_CODES,
  } from "../src/lib/utils/sttProcessor.js";
  import type { STTHandler } from "../src/lib/types/index.js";

  const { test, runSuite } = defineSuite("STTProcessor (unit)");

  function makeStubHandler(overrides: Partial<STTHandler> = {}) {
    const calls: Array<{ audio: unknown; options: unknown }> = [];
    const handler = {
      isConfigured: () => true,
      transcribe: async (audio: unknown, options: unknown) => {
        calls.push({ audio, options });
        return {
          text: "stub transcription",
          language: "en",
          confidence: 0.99,
        };
      },
      ...overrides,
    } as unknown as STTHandler;
    return { handler, calls };
  }

  const PROVIDER = "stub-stt-provider";
  const AUDIO = Buffer.from("fake-audio-bytes");

  await test("registerHandler makes a provider resolvable", () => {
    const { handler } = makeStubHandler();
    STTProcessor.registerHandler(PROVIDER, handler);
    assertEqual(STTProcessor.supports(PROVIDER), true, "supports() sees it");
    assert(
      STTProcessor.getHandler(PROVIDER) !== undefined,
      "getHandler() returns it",
    );
  });

  await test("an unregistered provider is not claimed", () => {
    assertEqual(
      STTProcessor.supports("provider-that-was-never-registered"),
      false,
      "supports() is false for unknown providers",
    );
    assertEqual(
      STTProcessor.getHandler("provider-that-was-never-registered"),
      undefined,
      "getHandler() returns undefined rather than throwing",
    );
  });

  await test("transcribe dispatches to the registered handler", async () => {
    const { handler, calls } = makeStubHandler();
    STTProcessor.registerHandler(PROVIDER, handler);
    const result = await STTProcessor.transcribe(AUDIO, PROVIDER, {});
    assertEqual(calls.length, 1, "handler invoked exactly once");
    assertEqual(
      result.text,
      "stub transcription",
      "text forwarded from the handler",
    );
  });

  await test("an empty audio buffer is rejected before any handler runs", async () => {
    const { handler, calls } = makeStubHandler();
    STTProcessor.registerHandler(PROVIDER, handler);
    let code: string | undefined;
    try {
      await STTProcessor.transcribe(Buffer.alloc(0), PROVIDER, {});
    } catch (err) {
      code = err instanceof STTError ? err.code : undefined;
    }
    assert(code !== undefined, "empty audio raises a typed STTError");
    assertEqual(calls.length, 0, "handler was never invoked");
  });

  await test("an unsupported provider raises a typed error", async () => {
    let code: string | undefined;
    let message = "";
    try {
      await STTProcessor.transcribe(AUDIO, "no-such-provider", {});
    } catch (err) {
      code = err instanceof STTError ? err.code : undefined;
      message = err instanceof Error ? err.message : "";
    }
    assertEqual(
      code,
      STT_ERROR_CODES.PROVIDER_NOT_SUPPORTED,
      "unknown provider raises STT_PROVIDER_NOT_SUPPORTED",
    );
    assertIncludes(
      message,
      "no-such-provider",
      "the error names the provider that was asked for",
    );
  });

  await test("an unconfigured provider is rejected before transcription", async () => {
    const { handler, calls } = makeStubHandler({
      isConfigured: () => false,
    } as Partial<STTHandler>);
    STTProcessor.registerHandler(PROVIDER, handler);
    let code: string | undefined;
    try {
      await STTProcessor.transcribe(AUDIO, PROVIDER, {});
    } catch (err) {
      code = err instanceof STTError ? err.code : undefined;
    }
    assertEqual(
      code,
      STT_ERROR_CODES.PROVIDER_NOT_CONFIGURED,
      "unconfigured provider raises STT_PROVIDER_NOT_CONFIGURED",
    );
    assertEqual(calls.length, 0, "handler was never invoked");
  });

  await test("a handler failure surfaces as a typed STTError", async () => {
    const { handler } = makeStubHandler({
      transcribe: async () => {
        throw new Error("upstream vendor exploded");
      },
    } as Partial<STTHandler>);
    STTProcessor.registerHandler(PROVIDER, handler);
    let isTyped = false;
    let message = "";
    try {
      await STTProcessor.transcribe(AUDIO, PROVIDER, {});
    } catch (err) {
      isTyped = err instanceof STTError;
      message = err instanceof Error ? err.message : "";
    }
    assert(isTyped, "a raw handler error is wrapped rather than leaked");
    assertIncludes(
      message,
      "upstream vendor exploded",
      "the underlying reason is preserved in the wrapped error",
    );
  });

  await test("re-registering a provider replaces the previous handler", () => {
    const first = makeStubHandler();
    const second = makeStubHandler();
    STTProcessor.registerHandler(PROVIDER, first.handler);
    STTProcessor.registerHandler(PROVIDER, second.handler);
    assertEqual(
      STTProcessor.getHandler(PROVIDER),
      second.handler,
      "the later registration wins",
    );
  });

  await test("clearHandlers removes every registered STT handler", () => {
    const { handler } = makeStubHandler();
    STTProcessor.registerHandler(PROVIDER, handler);
    assertEqual(STTProcessor.supports(PROVIDER), true, "handler is registered");
    STTProcessor.clearHandlers();
    assertEqual(
      STTProcessor.supports(PROVIDER),
      false,
      "clearHandlers() removes every registration",
    );
  });

  await runSuite();
  ```

- [ ] Run it and verify it fails on `STTProcessor.clearHandlers is not a function`: `npx tsx test/continuous-test-suite-stt-unit.ts`.
- [ ] Implement the refactor in `src/lib/utils/sttProcessor.ts`, following the identical pattern used for TTS in Task 2: import `HandlerRegistry`, replace the `handlers` Map field with `private static readonly registry = new HandlerRegistry<STTHandler>("STTProcessor");`, delegate `registerHandler` (keeping its own debug log `` `[STTProcessor] Registered STT handler for provider: ${normalizedName}` ``), delegate `getHandler`, keep `supports`'s extra logging (`"[STTProcessor] Provider name is required for supports check"` / `` `[STTProcessor] Provider ${providerName} is not supported` ``) while delegating the lookup, replace the internal `Array.from(this.handlers.keys())` (~line 230, used in "unsupported provider" error context) with `this.registry.list()`, and add:
  ```typescript
  static clearHandlers(): void {
    this.registry.clear();
  }
  ```
- [ ] Run the test and verify it passes: `npx tsx test/continuous-test-suite-stt-unit.ts` — expect `RESULT: PASS`.
- [ ] Add `"test:stt:unit": "npx tsx test/continuous-test-suite-stt-unit.ts",` to `package.json`, placed next to `"test:tts:unit"`.
- [ ] Run `pnpm run check` and `pnpm run lint` — fix any errors.
- [ ] Commit: `git add src/lib/utils/sttProcessor.ts test/continuous-test-suite-stt-unit.ts package.json && git commit -m "refactor(stt): compose HandlerRegistry in STTProcessor"`

---

### Task 4: RealtimeProcessor composes HandlerRegistry

**Files:**

- `src/lib/voice/RealtimeVoiceAPI.ts`
- `test/continuous-test-suite-realtime-unit.ts` (new)
- `package.json` (new script)

**Interfaces:** `RealtimeProcessor.registerHandler`, `.supports`, `.getHandler`, `.getProviders` (name preserved, NOT renamed to `listProviders`), `.clearHandlers` (signature unchanged, now also composes the registry) — the `sessions` Map is untouched by this task.

- [ ] Write a failing test suite. Create `test/continuous-test-suite-realtime-unit.ts`:

  ```typescript
  #!/usr/bin/env tsx
  /**
   * Continuous Test Suite: RealtimeProcessor registry unit tests (no API).
   *
   * Covers registration/lookup/alias-independent dispatch only — connect(),
   * sendAudio() etc. all require a live session and are out of scope here.
   *
   * Run: npx tsx test/continuous-test-suite-realtime-unit.ts
   */
  import { defineSuite, assert, assertEqual } from "./helpers/harness.js";
  import { RealtimeProcessor } from "../src/lib/voice/RealtimeVoiceAPI.js";
  import type { RealtimeHandler } from "../src/lib/types/index.js";

  const { test, runSuite } = defineSuite("RealtimeProcessor (unit)");

  function makeStubHandler(): RealtimeHandler {
    return {
      isConfigured: () => true,
      connect: async () => ({ sessionId: "stub-session" }),
      disconnect: async () => {},
    } as unknown as RealtimeHandler;
  }

  const PROVIDER = "stub-realtime-provider";

  await test("registerHandler makes a provider resolvable", () => {
    const handler = makeStubHandler();
    RealtimeProcessor.registerHandler(PROVIDER, handler);
    assertEqual(
      RealtimeProcessor.supports(PROVIDER),
      true,
      "supports() sees it",
    );
    assertEqual(
      RealtimeProcessor.getHandler(PROVIDER),
      handler,
      "getHandler() returns it",
    );
  });

  await test("an unregistered provider is not claimed", () => {
    assertEqual(
      RealtimeProcessor.supports("provider-that-was-never-registered"),
      false,
      "supports() is false for unknown providers",
    );
  });

  await test("getProviders lists every registered provider", () => {
    RealtimeProcessor.clearHandlers();
    RealtimeProcessor.registerHandler(PROVIDER, makeStubHandler());
    const providers = RealtimeProcessor.getProviders();
    assert(
      providers.includes(PROVIDER),
      "getProviders() includes the registered provider",
    );
  });

  await test("re-registering a provider replaces the previous handler", () => {
    const first = makeStubHandler();
    const second = makeStubHandler();
    RealtimeProcessor.registerHandler(PROVIDER, first);
    RealtimeProcessor.registerHandler(PROVIDER, second);
    assertEqual(
      RealtimeProcessor.getHandler(PROVIDER),
      second,
      "the later registration wins",
    );
  });

  await test("clearHandlers removes every registered handler", () => {
    RealtimeProcessor.registerHandler(PROVIDER, makeStubHandler());
    assertEqual(
      RealtimeProcessor.supports(PROVIDER),
      true,
      "handler is registered",
    );
    RealtimeProcessor.clearHandlers();
    assertEqual(
      RealtimeProcessor.supports(PROVIDER),
      false,
      "clearHandlers() removes every registration",
    );
  });

  await runSuite();
  ```

- [ ] Run it and verify it fails: `npx tsx test/continuous-test-suite-realtime-unit.ts` — expect failures against the CURRENT (pre-refactor) implementation to actually still pass, since the class already behaves this way. To get a genuine red state for this task, temporarily comment out the entire body of `getProviders()` in `RealtimeVoiceAPI.ts` (replace with `return [];`) before running, confirm the `"getProviders lists every registered provider"` test fails, then revert the temporary comment-out before proceeding — this proves the test actually exercises the method rather than trivially passing.
- [ ] Implement the refactor in `src/lib/voice/RealtimeVoiceAPI.ts`:
  ```typescript
  import { HandlerRegistry } from "../core/handlerRegistry.js";
  ```
  Replace the `private static readonly handlers = new Map<string, RealtimeHandler>();` field with:
  ```typescript
  private static readonly registry = new HandlerRegistry<RealtimeHandler>(
    "RealtimeProcessor",
  );
  ```
  Keep the `private static readonly sessions = new Map<...>();` field untouched.
  Replace `registerHandler`'s body (keeping its own debug log `` `[RealtimeProcessor] Registered Realtime handler for provider: ${normalizedName}` ``) to delegate to `this.registry.register(...)`.
  Replace `getHandler` to delegate to `this.registry.get(...)`.
  Replace `supports` to delegate to `this.registry.supports(...)` (Realtime's `supports()` has no extra logging per the earlier audit — confirm this while editing and preserve whatever is there).
  Replace `getProviders()`'s body with `return this.registry.list();` — **do not rename the method**; it stays `getProviders`, not `listProviders`, per the deliberate cross-ecosystem naming inconsistency documented in this plan's scope.
  Replace every `Array.from(this.handlers.keys())` occurrence (inside `RealtimeError.providerNotSupported(provider, Array.from(this.handlers.keys()))` calls in `connect()`, `disconnect()`, `sendAudio()`, `sendText()`, `triggerResponse()`, `cancelResponse()` — six call sites) with `this.registry.list()`.
  Update `clearHandlers()` to clear the registry instead of the raw map, keeping everything else (session disconnect loop, log line) identical:
  ```typescript
  static clearHandlers(): void {
    for (const session of this.sessions.values()) {
      session.disconnect().catch(() => {
        /* best-effort cleanup */
      });
    }
    this.sessions.clear();
    this.registry.clear();
    logger.debug("[RealtimeProcessor] Cleared all handlers and sessions");
  }
  ```
  (Adjust the exact session-iteration/disconnect code to match what is actually in the file at lines 437-451 — the `registry.clear()` swap-in for the old `this.handlers.clear()` call is the only required change; everything else in this method stays as-is. `registry.clear()`'s own internal `logger.debug` call will additionally fire — that is expected and harmless.)
- [ ] Run the test and verify it passes: `npx tsx test/continuous-test-suite-realtime-unit.ts` — expect `RESULT: PASS`.
- [ ] Add `"test:realtime:unit": "npx tsx test/continuous-test-suite-realtime-unit.ts",` to `package.json`.
- [ ] Run `pnpm run check` and `pnpm run lint` — fix any errors, in particular confirm all 6+1 `Array.from(this.handlers.keys())` sites were converted (grep for `this.handlers` in the file — it should now only appear, if at all, inside comments).
- [ ] Commit: `git add src/lib/voice/RealtimeVoiceAPI.ts test/continuous-test-suite-realtime-unit.ts package.json && git commit -m "refactor(realtime): compose HandlerRegistry in RealtimeProcessor"`

---

### Task 5: MusicProcessor composes HandlerRegistry

**Files:**

- `src/lib/utils/musicProcessor.ts`
- `test/continuous-test-suite-music-unit.ts` (new)
- `package.json` (new script)

**Interfaces:** `MusicProcessor.registerHandler`, `.supports`, `.listProviders`, `.getHandler` unchanged; new `MusicProcessor.clearHandlers(): void`.

- [ ] Write a failing test suite. Create `test/continuous-test-suite-music-unit.ts`:

  ```typescript
  #!/usr/bin/env tsx
  /**
   * Continuous Test Suite: MusicProcessor unit tests (no API).
   *
   * MusicProcessor.generate(provider, options) is already bag-form — this
   * covers registry/validation/dispatch with a stub handler.
   *
   * Run: npx tsx test/continuous-test-suite-music-unit.ts
   */
  import {
    defineSuite,
    assert,
    assertEqual,
    assertIncludes,
  } from "./helpers/harness.js";
  import {
    MusicProcessor,
    MusicError,
    MUSIC_ERROR_CODES,
  } from "../src/lib/utils/musicProcessor.js";
  import type { MusicHandler } from "../src/lib/types/index.js";

  const { test, runSuite } = defineSuite("MusicProcessor (unit)");

  function makeStubHandler(overrides: Partial<MusicHandler> = {}) {
    const calls: Array<{ options: unknown }> = [];
    const handler = {
      isConfigured: () => true,
      generate: async (options: unknown) => {
        calls.push({ options });
        return {
          data: Buffer.from("fake-audio"),
          format: "mp3",
          metadata: { duration: 30 },
        };
      },
      ...overrides,
    } as unknown as MusicHandler;
    return { handler, calls };
  }

  const PROVIDER = "stub-music-provider";

  await test("registerHandler makes a provider resolvable", () => {
    const { handler } = makeStubHandler();
    MusicProcessor.registerHandler(PROVIDER, handler);
    assertEqual(MusicProcessor.supports(PROVIDER), true, "supports() sees it");
    assertEqual(
      MusicProcessor.getHandler(PROVIDER),
      handler,
      "getHandler() returns it",
    );
  });

  await test("listProviders includes a registered provider", () => {
    MusicProcessor.registerHandler(PROVIDER, makeStubHandler().handler);
    assert(
      MusicProcessor.listProviders().includes(PROVIDER),
      "listProviders() includes the registered provider",
    );
  });

  await test("generate dispatches to the registered handler", async () => {
    const { handler, calls } = makeStubHandler();
    MusicProcessor.registerHandler(PROVIDER, handler);
    const result = await MusicProcessor.generate(PROVIDER, {
      prompt: "lofi beat",
    });
    assertEqual(calls.length, 1, "handler invoked exactly once");
    assert(Buffer.isBuffer(result.data), "audio buffer returned");
  });

  await test("an unsupported provider raises a typed error", async () => {
    let code: string | undefined;
    let message = "";
    try {
      await MusicProcessor.generate("no-such-provider", { prompt: "x" });
    } catch (err) {
      code = err instanceof MusicError ? err.code : undefined;
      message = err instanceof Error ? err.message : "";
    }
    assertEqual(
      code,
      MUSIC_ERROR_CODES.PROVIDER_NOT_SUPPORTED,
      "unknown provider raises MUSIC_PROVIDER_NOT_SUPPORTED",
    );
    assertIncludes(
      message,
      "no-such-provider",
      "the error names the provider that was asked for",
    );
  });

  await test("an unconfigured provider is rejected before generation", async () => {
    const { handler, calls } = makeStubHandler({
      isConfigured: () => false,
    } as Partial<MusicHandler>);
    MusicProcessor.registerHandler(PROVIDER, handler);
    let code: string | undefined;
    try {
      await MusicProcessor.generate(PROVIDER, { prompt: "x" });
    } catch (err) {
      code = err instanceof MusicError ? err.code : undefined;
    }
    assertEqual(
      code,
      MUSIC_ERROR_CODES.PROVIDER_NOT_CONFIGURED,
      "unconfigured provider raises MUSIC_PROVIDER_NOT_CONFIGURED",
    );
    assertEqual(calls.length, 0, "handler was never invoked");
  });

  await test("re-registering a provider replaces the previous handler", () => {
    const first = makeStubHandler();
    const second = makeStubHandler();
    MusicProcessor.registerHandler(PROVIDER, first.handler);
    MusicProcessor.registerHandler(PROVIDER, second.handler);
    assertEqual(
      MusicProcessor.getHandler(PROVIDER),
      second.handler,
      "the later registration wins",
    );
  });

  await test("clearHandlers removes every registered music handler", () => {
    MusicProcessor.registerHandler(PROVIDER, makeStubHandler().handler);
    assertEqual(
      MusicProcessor.supports(PROVIDER),
      true,
      "handler is registered",
    );
    MusicProcessor.clearHandlers();
    assertEqual(
      MusicProcessor.supports(PROVIDER),
      false,
      "clearHandlers() removes every registration",
    );
  });

  await runSuite();
  ```

- [ ] Run it and verify it fails on `MusicProcessor.clearHandlers is not a function`: `npx tsx test/continuous-test-suite-music-unit.ts`.
- [ ] Implement the refactor in `src/lib/utils/musicProcessor.ts` following the same pattern: import `HandlerRegistry`, replace the `handlers` Map field with `private static readonly registry = new HandlerRegistry<MusicHandler>("MusicProcessor");`, delegate `registerHandler` (keeping its own debug log `` `[MusicProcessor] Registered music handler: ${key}` ``), delegate `supports`, `listProviders` (→ `return this.registry.list();`), `getHandler` (→ `return this.registry.get(providerName);`), and add:
  ```typescript
  static clearHandlers(): void {
    this.registry.clear();
  }
  ```
- [ ] Run the test and verify it passes: `npx tsx test/continuous-test-suite-music-unit.ts` — expect `RESULT: PASS`.
- [ ] Add `"test:music:unit": "npx tsx test/continuous-test-suite-music-unit.ts",` to `package.json`.
- [ ] Run `pnpm run check` and `pnpm run lint` — fix any errors.
- [ ] Commit: `git add src/lib/utils/musicProcessor.ts test/continuous-test-suite-music-unit.ts package.json && git commit -m "refactor(music): compose HandlerRegistry in MusicProcessor"`

---

### Task 6: AvatarProcessor composes HandlerRegistry

**Files:**

- `src/lib/utils/avatarProcessor.ts`
- `test/continuous-test-suite-avatar-unit.ts` (new)
- `package.json` (new script)

**Interfaces:** `AvatarProcessor.registerHandler`, `.supports`, `.listProviders`, `.getHandler` unchanged; new `AvatarProcessor.clearHandlers(): void`.

- [ ] Write a failing test suite. Create `test/continuous-test-suite-avatar-unit.ts`, mirroring Task 5's `MusicProcessor` suite exactly but against `AvatarProcessor`:

  ```typescript
  #!/usr/bin/env tsx
  /**
   * Continuous Test Suite: AvatarProcessor unit tests (no API).
   *
   * AvatarProcessor.generate(provider, options) is already bag-form — this
   * covers registry/validation/dispatch with a stub handler.
   *
   * Run: npx tsx test/continuous-test-suite-avatar-unit.ts
   */
  import {
    defineSuite,
    assert,
    assertEqual,
    assertIncludes,
  } from "./helpers/harness.js";
  import {
    AvatarProcessor,
    AvatarError,
    AVATAR_ERROR_CODES,
  } from "../src/lib/utils/avatarProcessor.js";
  import type { AvatarHandler } from "../src/lib/types/index.js";

  const { test, runSuite } = defineSuite("AvatarProcessor (unit)");

  function makeStubHandler(overrides: Partial<AvatarHandler> = {}) {
    const calls: Array<{ options: unknown }> = [];
    const handler = {
      isConfigured: () => true,
      generate: async (options: unknown) => {
        calls.push({ options });
        return {
          data: Buffer.from("fake-video"),
          format: "mp4",
          metadata: { duration: 10 },
        };
      },
      ...overrides,
    } as unknown as AvatarHandler;
    return { handler, calls };
  }

  const PROVIDER = "stub-avatar-provider";

  await test("registerHandler makes a provider resolvable", () => {
    const { handler } = makeStubHandler();
    AvatarProcessor.registerHandler(PROVIDER, handler);
    assertEqual(AvatarProcessor.supports(PROVIDER), true, "supports() sees it");
    assertEqual(
      AvatarProcessor.getHandler(PROVIDER),
      handler,
      "getHandler() returns it",
    );
  });

  await test("listProviders includes a registered provider", () => {
    AvatarProcessor.registerHandler(PROVIDER, makeStubHandler().handler);
    assert(
      AvatarProcessor.listProviders().includes(PROVIDER),
      "listProviders() includes the registered provider",
    );
  });

  await test("generate dispatches to the registered handler", async () => {
    const { handler, calls } = makeStubHandler();
    AvatarProcessor.registerHandler(PROVIDER, handler);
    const result = await AvatarProcessor.generate(PROVIDER, {
      prompt: "talking head",
    });
    assertEqual(calls.length, 1, "handler invoked exactly once");
    assert(Buffer.isBuffer(result.data), "video buffer returned");
  });

  await test("an unsupported provider raises a typed error", async () => {
    let code: string | undefined;
    let message = "";
    try {
      await AvatarProcessor.generate("no-such-provider", { prompt: "x" });
    } catch (err) {
      code = err instanceof AvatarError ? err.code : undefined;
      message = err instanceof Error ? err.message : "";
    }
    assertEqual(
      code,
      AVATAR_ERROR_CODES.PROVIDER_NOT_SUPPORTED,
      "unknown provider raises AVATAR_PROVIDER_NOT_SUPPORTED",
    );
    assertIncludes(
      message,
      "no-such-provider",
      "the error names the provider that was asked for",
    );
  });

  await test("an unconfigured provider is rejected before generation", async () => {
    const { handler, calls } = makeStubHandler({
      isConfigured: () => false,
    } as Partial<AvatarHandler>);
    AvatarProcessor.registerHandler(PROVIDER, handler);
    let code: string | undefined;
    try {
      await AvatarProcessor.generate(PROVIDER, { prompt: "x" });
    } catch (err) {
      code = err instanceof AvatarError ? err.code : undefined;
    }
    assertEqual(
      code,
      AVATAR_ERROR_CODES.PROVIDER_NOT_CONFIGURED,
      "unconfigured provider raises AVATAR_PROVIDER_NOT_CONFIGURED",
    );
    assertEqual(calls.length, 0, "handler was never invoked");
  });

  await test("re-registering a provider replaces the previous handler", () => {
    const first = makeStubHandler();
    const second = makeStubHandler();
    AvatarProcessor.registerHandler(PROVIDER, first.handler);
    AvatarProcessor.registerHandler(PROVIDER, second.handler);
    assertEqual(
      AvatarProcessor.getHandler(PROVIDER),
      second.handler,
      "the later registration wins",
    );
  });

  await test("clearHandlers removes every registered avatar handler", () => {
    AvatarProcessor.registerHandler(PROVIDER, makeStubHandler().handler);
    assertEqual(
      AvatarProcessor.supports(PROVIDER),
      true,
      "handler is registered",
    );
    AvatarProcessor.clearHandlers();
    assertEqual(
      AvatarProcessor.supports(PROVIDER),
      false,
      "clearHandlers() removes every registration",
    );
  });

  await runSuite();
  ```

- [ ] Run it and verify it fails on `AvatarProcessor.clearHandlers is not a function`: `npx tsx test/continuous-test-suite-avatar-unit.ts`.
- [ ] Implement the refactor in `src/lib/utils/avatarProcessor.ts` following the same pattern: import `HandlerRegistry`, replace the `handlers` Map field with `private static readonly registry = new HandlerRegistry<AvatarHandler>("AvatarProcessor");`, delegate `registerHandler` (keeping its own debug log `` `[AvatarProcessor] Registered avatar handler: ${key}` ``), delegate `supports`, `listProviders`, `getHandler`, and add `clearHandlers()`.
- [ ] Run the test and verify it passes: `npx tsx test/continuous-test-suite-avatar-unit.ts` — expect `RESULT: PASS`.
- [ ] Add `"test:avatar:unit": "npx tsx test/continuous-test-suite-avatar-unit.ts",` to `package.json`.
- [ ] Run `pnpm run check` and `pnpm run lint` — fix any errors.
- [ ] Commit: `git add src/lib/utils/avatarProcessor.ts test/continuous-test-suite-avatar-unit.ts package.json && git commit -m "refactor(avatar): compose HandlerRegistry in AvatarProcessor"`

---

### Task 7: VideoProcessor composes HandlerRegistry

**Files:**

- `src/lib/utils/videoProcessor.ts`
- `test/continuous-test-suite-video-generation-unit.ts` (new — deliberately NOT named `continuous-test-suite-video-unit.ts` to avoid colliding with the unrelated `continuous-test-suite-video.ts`, which tests file-upload video processing)
- `package.json` (new script)

**Interfaces:** `VideoProcessor.registerHandler`, `.supports`, `.listProviders` unchanged; `getHandler` stays **private** (this is the one processor where it is not exposed — preserve that asymmetry); new `VideoProcessor.clearHandlers(): void`. `VideoProcessor.generate`'s own signature is untouched in this task (that happens in Task 15) — this task only refactors the registry plumbing underneath it.

- [ ] Write a failing test suite. Create `test/continuous-test-suite-video-generation-unit.ts`:

  ```typescript
  #!/usr/bin/env tsx
  /**
   * Continuous Test Suite: VideoProcessor (generation registry) unit tests (no API).
   *
   * NOT to be confused with continuous-test-suite-video.ts, which tests
   * file-upload video PROCESSING (src/lib/processors/media/VideoProcessor.js).
   * This suite covers the video-GENERATION registry
   * (src/lib/utils/videoProcessor.ts) — registration/lookup only. generate()'s
   * bag-signature behavior is covered separately once Task 15 lands.
   *
   * Run: npx tsx test/continuous-test-suite-video-generation-unit.ts
   */
  import { defineSuite, assert, assertEqual } from "./helpers/harness.js";
  import { VideoProcessor } from "../src/lib/utils/videoProcessor.js";
  import type { VideoHandler } from "../src/lib/types/index.js";

  const { test, runSuite } = defineSuite(
    "VideoProcessor generation registry (unit)",
  );

  function makeStubHandler(): VideoHandler {
    return {
      isConfigured: () => true,
      generate: async () => ({
        data: Buffer.from("fake-video"),
        format: "mp4",
        metadata: { duration: 6 },
      }),
    } as unknown as VideoHandler;
  }

  const PROVIDER = "stub-video-provider";

  await test("registerHandler makes a provider resolvable via supports", () => {
    const handler = makeStubHandler();
    VideoProcessor.registerHandler(PROVIDER, handler);
    assertEqual(VideoProcessor.supports(PROVIDER), true, "supports() sees it");
  });

  await test("listProviders includes a registered provider", () => {
    VideoProcessor.registerHandler(PROVIDER, makeStubHandler());
    assert(
      VideoProcessor.listProviders().includes(PROVIDER),
      "listProviders() includes the registered provider",
    );
  });

  await test("an unregistered provider is not claimed", () => {
    assertEqual(
      VideoProcessor.supports("provider-that-was-never-registered"),
      false,
      "supports() is false for unknown providers",
    );
  });

  await test("re-registering a provider replaces the previous handler for dispatch", async () => {
    // getHandler() is intentionally private on VideoProcessor (unlike Music/
    // Avatar), so re-registration is asserted indirectly: the second
    // handler's generate() must be the one invoked.
    let firstCalls = 0;
    let secondCalls = 0;
    const first = {
      isConfigured: () => true,
      generate: async () => {
        firstCalls++;
        return { data: Buffer.from("first"), format: "mp4", metadata: {} };
      },
    } as unknown as VideoHandler;
    const second = {
      isConfigured: () => true,
      generate: async () => {
        secondCalls++;
        return { data: Buffer.from("second"), format: "mp4", metadata: {} };
      },
    } as unknown as VideoHandler;
    VideoProcessor.registerHandler(PROVIDER, first);
    VideoProcessor.registerHandler(PROVIDER, second);
    await VideoProcessor.generate(
      PROVIDER,
      Buffer.from("image"),
      "a prompt",
      {},
    );
    assertEqual(firstCalls, 0, "the replaced handler is never invoked");
    assertEqual(secondCalls, 1, "the later registration wins");
  });

  await test("clearHandlers removes every registered video handler", () => {
    VideoProcessor.registerHandler(PROVIDER, makeStubHandler());
    assertEqual(
      VideoProcessor.supports(PROVIDER),
      true,
      "handler is registered",
    );
    VideoProcessor.clearHandlers();
    assertEqual(
      VideoProcessor.supports(PROVIDER),
      false,
      "clearHandlers() removes every registration",
    );
  });

  await runSuite();
  ```

  Note: this test uses `VideoProcessor.generate`'s CURRENT (pre-Task-15) 4-positional-argument signature (`provider, image, prompt, options`), consistent with the code as it exists before Task 15 lands. Task 15 later migrates this call site to the bag form as part of that task's own work.

- [ ] Run it and verify it fails on `VideoProcessor.clearHandlers is not a function`: `npx tsx test/continuous-test-suite-video-generation-unit.ts`.
- [ ] Implement the refactor in `src/lib/utils/videoProcessor.ts`: import `HandlerRegistry`, replace the `handlers` Map field with `private static readonly registry = new HandlerRegistry<VideoHandler>("VideoProcessor");`, delegate `registerHandler` (keeping its own debug log `` `[VideoProcessor] Registered video handler: ${key}` ``), delegate `supports` and `listProviders`, delegate the **private** `getHandler` (→ `return this.registry.get(provider);`, keeping it private — do not add `export`/`public`), and add:
  ```typescript
  static clearHandlers(): void {
    this.registry.clear();
  }
  ```
- [ ] Run the test and verify it passes: `npx tsx test/continuous-test-suite-video-generation-unit.ts` — expect `RESULT: PASS`.
- [ ] Add `"test:video-generation:unit": "npx tsx test/continuous-test-suite-video-generation-unit.ts",` to `package.json`.
- [ ] Run `pnpm run check` and `pnpm run lint` — fix any errors.
- [ ] Commit: `git add src/lib/utils/videoProcessor.ts test/continuous-test-suite-video-generation-unit.ts package.json && git commit -m "refactor(video): compose HandlerRegistry in VideoProcessor"`

---

### Task 8: `mediaHandlerCatalog.ts` pure-data module

**Files:**

- `src/lib/types/mediaCatalog.ts` (new)
- `src/lib/types/index.ts` (barrel export)
- `src/lib/factories/mediaHandlerCatalog.ts` (new)
- `test/continuous-test-suite-media-handler-catalog.ts` (new)
- `package.json` (new script)

**Interfaces:**

```typescript
export type MediaHandlerKind =
  | "tts"
  | "stt"
  | "realtime"
  | "video"
  | "avatar"
  | "music";
export type MediaHandlerDescriptor = {
  readonly kind: MediaHandlerKind;
  readonly name: string;
  readonly aliases?: readonly string[];
};
export const MEDIA_HANDLER_CATALOG: readonly MediaHandlerDescriptor[];
export function providerChoicesFor(kind: MediaHandlerKind): string[];
export function defaultProviderFor(kind: MediaHandlerKind): string;
```

- [ ] Write a failing test. Create `test/continuous-test-suite-media-handler-catalog.ts`:

  ```typescript
  #!/usr/bin/env tsx
  /**
   * Continuous Test Suite: mediaHandlerCatalog (no API).
   *
   * The pure-data module every ecosystem barrel, providerRegistry.ts's
   * realtime-outcome reconstruction, and the CLI's --*-provider choices
   * arrays all read from. Mirrors plan 04's providerDescriptors.ts pattern.
   *
   * Run: npx tsx test/continuous-test-suite-media-handler-catalog.ts
   */
  import { defineSuite, assert, assertEqual } from "./helpers/harness.js";
  import {
    MEDIA_HANDLER_CATALOG,
    providerChoicesFor,
    defaultProviderFor,
  } from "../src/lib/factories/mediaHandlerCatalog.js";

  const { test, runSuite } = defineSuite("mediaHandlerCatalog (unit)");

  await test("every catalog entry has a non-empty kind and name", () => {
    for (const entry of MEDIA_HANDLER_CATALOG) {
      assert(
        entry.kind.length > 0,
        `entry ${JSON.stringify(entry)} has a kind`,
      );
      assert(
        entry.name.length > 0,
        `entry ${JSON.stringify(entry)} has a name`,
      );
    }
  });

  await test("providerChoicesFor('tts') includes primaries and aliases", () => {
    const choices = providerChoicesFor("tts");
    assert(choices.includes("google-ai"), "primary google-ai present");
    assert(choices.includes("vertex"), "alias vertex present");
    assert(choices.includes("elevenlabs"), "primary elevenlabs present");
    assert(choices.includes("elevenlabs-tts"), "alias elevenlabs-tts present");
    assert(
      choices.includes("fish-audio"),
      "fish-audio present (was missing from the old hardcoded CLI array)",
    );
    assert(
      choices.includes("cartesia"),
      "cartesia present (was missing from the old hardcoded CLI array)",
    );
  });

  await test("providerChoicesFor('stt') includes the openai-stt alias", () => {
    const choices = providerChoicesFor("stt");
    assert(choices.includes("whisper"), "primary whisper present");
    assert(
      choices.includes("openai-stt"),
      "alias openai-stt present (was missing from the old CLI array)",
    );
  });

  await test("providerChoicesFor('video') lists all four video handlers", () => {
    const choices = providerChoicesFor("video");
    assertEqual(choices.length, 4, "exactly four video providers");
    assert(choices.includes("vertex"), "vertex present");
    assert(choices.includes("kling"), "kling present");
    assert(choices.includes("runway"), "runway present");
    assert(choices.includes("replicate"), "replicate present");
  });

  await test("providerChoicesFor('music') includes the elevenlabs-sound alias", () => {
    const choices = providerChoicesFor("music");
    assert(choices.includes("elevenlabs-music"), "primary present");
    assert(choices.includes("elevenlabs-sound"), "alias present");
    assert(choices.includes("musicgen"), "musicgen alias present");
  });

  await test("providerChoicesFor('avatar') includes the musetalk alias", () => {
    const choices = providerChoicesFor("avatar");
    assert(choices.includes("replicate"), "primary present");
    assert(choices.includes("musetalk"), "alias present");
  });

  await test("providerChoicesFor returns [] for a kind with no entries is never hit — every kind has entries", () => {
    const kinds: Array<
      "tts" | "stt" | "realtime" | "video" | "avatar" | "music"
    > = ["tts", "stt", "realtime", "video", "avatar", "music"];
    for (const kind of kinds) {
      assert(
        providerChoicesFor(kind).length > 0,
        `kind ${kind} has at least one choice`,
      );
    }
  });

  await test("defaultProviderFor('video') is vertex, matching the existing baseProvider.ts default", () => {
    assertEqual(
      defaultProviderFor("video"),
      "vertex",
      "vertex is listed first for video",
    );
  });

  await test("defaultProviderFor returns the first catalog entry for each kind", () => {
    assertEqual(defaultProviderFor("tts"), "google-ai", "first tts entry");
    assertEqual(defaultProviderFor("stt"), "whisper", "first stt entry");
    assertEqual(
      defaultProviderFor("realtime"),
      "openai-realtime",
      "first realtime entry",
    );
    assertEqual(defaultProviderFor("avatar"), "d-id", "first avatar entry");
    assertEqual(defaultProviderFor("music"), "beatoven", "first music entry");
  });

  await runSuite();
  ```

- [ ] Run it and verify it fails: `npx tsx test/continuous-test-suite-media-handler-catalog.ts` — expect a module-resolution error (`Cannot find module '../src/lib/factories/mediaHandlerCatalog.js'`).
- [ ] Create `src/lib/types/mediaCatalog.ts`:

  ```typescript
  /**
   * Types backing the static media-handler catalog
   * (src/lib/factories/mediaHandlerCatalog.ts) — the single source of truth
   * for provider names/aliases across the six media-generation ecosystems
   * (TTS, STT, Realtime, Video, Avatar, Music).
   */

  export type MediaHandlerKind =
    | "tts"
    | "stt"
    | "realtime"
    | "video"
    | "avatar"
    | "music";

  export type MediaHandlerDescriptor = {
    readonly kind: MediaHandlerKind;
    readonly name: string;
    readonly aliases?: readonly string[];
  };
  ```

- [ ] Add `export * from "./mediaCatalog.js";` to `src/lib/types/index.ts`, inserted right after the "New modality categories (M9.1+)" block (after `export * from "./replicate.js";`, before the "Safe-fetch helper types" comment).
- [ ] Create `src/lib/factories/mediaHandlerCatalog.ts`:

  ```typescript
  import type {
    MediaHandlerDescriptor,
    MediaHandlerKind,
  } from "../types/index.js";

  /**
   * Static catalog of every shipped media-handler provider, across all six
   * ecosystems (TTS, STT, Realtime, Video, Avatar, Music). Pure data — no
   * factory functions, no class imports — mirroring the
   * src/lib/factories/providerDescriptors.ts pattern for text/image
   * providers. Consumed by:
   *   - each ecosystem's barrel module (voice/index.ts, music/index.ts,
   *     avatar/index.ts, adapters/video/index.ts) to build its CANDIDATES
   *     array's name/alias list
   *   - providerRegistry.ts, to reconstruct the realtime registration report
   *   - the CLI (commandFactory.ts), to derive --*-provider `choices` arrays
   */
  export const MEDIA_HANDLER_CATALOG: readonly MediaHandlerDescriptor[] = [
    // --- TTS ---
    { kind: "tts", name: "google-ai", aliases: ["vertex"] },
    { kind: "tts", name: "openai-tts" },
    { kind: "tts", name: "elevenlabs", aliases: ["elevenlabs-tts"] },
    { kind: "tts", name: "azure-tts" },
    { kind: "tts", name: "fish-audio" },
    { kind: "tts", name: "cartesia" },
    // --- STT ---
    { kind: "stt", name: "whisper", aliases: ["openai-stt"] },
    { kind: "stt", name: "deepgram" },
    { kind: "stt", name: "google-stt" },
    { kind: "stt", name: "azure-stt" },
    // --- Realtime ---
    { kind: "realtime", name: "openai-realtime" },
    { kind: "realtime", name: "gemini-live" },
    // --- Video ---
    { kind: "video", name: "vertex" },
    { kind: "video", name: "kling" },
    { kind: "video", name: "runway" },
    { kind: "video", name: "replicate" },
    // --- Avatar ---
    { kind: "avatar", name: "d-id" },
    { kind: "avatar", name: "heygen" },
    { kind: "avatar", name: "replicate", aliases: ["musetalk"] },
    // --- Music ---
    { kind: "music", name: "beatoven" },
    { kind: "music", name: "elevenlabs-music", aliases: ["elevenlabs-sound"] },
    { kind: "music", name: "lyria" },
    { kind: "music", name: "replicate", aliases: ["musicgen"] },
  ] as const;

  /** Every selectable provider name for `kind`, primaries and aliases both. */
  export function providerChoicesFor(kind: MediaHandlerKind): string[] {
    const choices: string[] = [];
    for (const entry of MEDIA_HANDLER_CATALOG) {
      if (entry.kind !== kind) {
        continue;
      }
      choices.push(entry.name);
      if (entry.aliases) {
        choices.push(...entry.aliases);
      }
    }
    return choices;
  }

  /** The first-listed primary provider name for `kind` — used as a fallback default. */
  export function defaultProviderFor(kind: MediaHandlerKind): string {
    const first = MEDIA_HANDLER_CATALOG.find((entry) => entry.kind === kind);
    if (!first) {
      throw new Error(
        `No media handler catalog entries registered for kind "${kind}"`,
      );
    }
    return first.name;
  }
  ```

- [ ] Run the test and verify it passes: `npx tsx test/continuous-test-suite-media-handler-catalog.ts` — expect `RESULT: PASS`.
- [ ] Sanity-check the harness: temporarily change the `defaultProviderFor('video')` assertion's expected value to `"kling"`, run the suite, confirm it reports `✗` and exits non-zero, then revert.
- [ ] Add `"test:media-handler-catalog": "npx tsx test/continuous-test-suite-media-handler-catalog.ts",` to `package.json`.
- [ ] Run `pnpm run check` and `pnpm run lint` — fix any errors.
- [ ] Commit: `git add src/lib/types/mediaCatalog.ts src/lib/types/index.ts src/lib/factories/mediaHandlerCatalog.ts test/continuous-test-suite-media-handler-catalog.ts package.json && git commit -m "feat(factories): add mediaHandlerCatalog pure-data module"`

---

### Task 9: Video adapter barrel with `registerDefaultVideoHandlers`

**Files:**

- `src/lib/adapters/video/index.ts` (new)
- `test/continuous-test-suite-video-handler-registration.ts` (new)
- `package.json` (new script)

**Interfaces:** `registerDefaultVideoHandlers(): void`, plus re-exports `VideoError`, `VIDEO_ERROR_CODES`, `VideoProcessor` from `../../utils/videoProcessor.js`.

Video currently has NO barrel module — `providerRegistry.ts` registers `vertex`, `kling`, `runway`, `replicate` directly with no alias support. This task gives it the same shape as `voice/index.ts`/`music/index.ts`/`avatar/index.ts` before Task 11 collapses `providerRegistry.ts`'s six blocks into calls to each ecosystem's `registerDefault*Handlers()`.

- [ ] Write a failing test. Create `test/continuous-test-suite-video-handler-registration.ts`:

  ```typescript
  #!/usr/bin/env tsx
  /**
   * Continuous Test Suite: video adapter barrel registration (no API).
   *
   * Video had no barrel module before this plan — providerRegistry.ts
   * registered vertex/kling/runway/replicate directly. This suite covers the
   * new src/lib/adapters/video/index.ts barrel's registerDefaultVideoHandlers,
   * independent of whether any provider is actually configured in this
   * environment (registration itself must not throw either way).
   *
   * Run: npx tsx test/continuous-test-suite-video-handler-registration.ts
   */
  import { defineSuite, assert } from "./helpers/harness.js";
  import {
    registerDefaultVideoHandlers,
    VideoProcessor,
  } from "../src/lib/adapters/video/index.js";
  import { providerChoicesFor } from "../src/lib/factories/mediaHandlerCatalog.js";

  const { test, runSuite } = defineSuite(
    "Video adapter barrel registration (unit)",
  );

  await test("registerDefaultVideoHandlers does not throw", () => {
    registerDefaultVideoHandlers();
  });

  await test("registerDefaultVideoHandlers is idempotent", () => {
    registerDefaultVideoHandlers();
    registerDefaultVideoHandlers();
  });

  await test("every catalog video provider is either registered or absent, never throwing on lookup", () => {
    registerDefaultVideoHandlers();
    for (const name of providerChoicesFor("video")) {
      // Registration is not gated on isConfigured() failing loudly — an
      // unconfigured provider in this environment may legitimately be
      // unregistered. The contract under test is only that querying it never
      // throws.
      assert(
        typeof VideoProcessor.supports(name) === "boolean",
        `supports("${name}") returns a boolean rather than throwing`,
      );
    }
  });

  await runSuite();
  ```

- [ ] Run it and verify it fails: `npx tsx test/continuous-test-suite-video-handler-registration.ts` — expect a module-resolution error (`Cannot find module '../src/lib/adapters/video/index.js'`).
- [ ] Implement `src/lib/adapters/video/index.ts`:

  ```typescript
  /**
   * Video Module — Video Generation Integration for NeuroLink
   *
   * Provides video-generation capability across providers (Vertex Veo, Kling,
   * Runway, Replicate-hosted video models).
   *
   * Use `VideoProcessor.generate(provider, options)` to dispatch to the
   * registered handler for `provider`.
   *
   * Unlike voice/music/avatar, this module does NOT auto-register at import
   * time — registration happens once, explicitly, from
   * providerRegistry.ts's registerAllProviders(), consistent with the single
   * registration path this plan establishes (see Task 11).
   *
   * @module video
   */

  import { logger } from "../../utils/logger.js";
  import { VideoProcessor } from "../../utils/videoProcessor.js";
  import { MEDIA_HANDLER_CATALOG } from "../../factories/mediaHandlerCatalog.js";
  import type { VideoHandler } from "../../types/index.js";

  export {
    VideoError,
    VIDEO_ERROR_CODES,
    VideoProcessor,
  } from "../../utils/videoProcessor.js";

  // ============================================================================
  // HANDLER CLASSES
  // ============================================================================

  export { VertexVideoHandler } from "./vertexVideoHandler.js";
  export { KlingVideoHandler } from "./klingVideoHandler.js";
  export { RunwayVideoHandler } from "./runwayVideoHandler.js";
  export { ReplicateVideoHandler } from "./replicateVideoHandler.js";

  // ============================================================================
  // AUTO-REGISTRATION
  // ============================================================================

  import { VertexVideoHandler } from "./vertexVideoHandler.js";
  import { KlingVideoHandler } from "./klingVideoHandler.js";
  import { RunwayVideoHandler } from "./runwayVideoHandler.js";
  import { ReplicateVideoHandler } from "./replicateVideoHandler.js";

  const VIDEO_HANDLER_FACTORIES: Record<string, () => VideoHandler> = {
    vertex: () => new VertexVideoHandler(),
    kling: () => new KlingVideoHandler(),
    runway: () => new RunwayVideoHandler(),
    replicate: () => new ReplicateVideoHandler(),
  };

  /**
   * Register every shipped video handler whose backing credentials are
   * present in the environment. Safe to call multiple times — existing
   * registrations are preserved. None of the four current video providers
   * declare aliases in the catalog.
   */
  export function registerDefaultVideoHandlers(): void {
    for (const entry of MEDIA_HANDLER_CATALOG) {
      if (entry.kind !== "video") {
        continue;
      }
      const factory = VIDEO_HANDLER_FACTORIES[entry.name];
      if (!factory) {
        continue;
      }
      if (VideoProcessor.supports(entry.name)) {
        continue;
      }
      try {
        const handler = factory();
        if (!handler.isConfigured()) {
          continue;
        }
        VideoProcessor.registerHandler(entry.name, handler);
      } catch (err) {
        logger.debug(
          `[video] ${entry.name} auto-registration skipped: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
  }
  ```

- [ ] Run the test and verify it passes: `npx tsx test/continuous-test-suite-video-handler-registration.ts` — expect `RESULT: PASS`.
- [ ] Add `"test:video-handler-registration": "npx tsx test/continuous-test-suite-video-handler-registration.ts",` to `package.json`.
- [ ] Run `pnpm run check` and `pnpm run lint` — fix any errors, in particular confirm the four handler constructor imports resolve at their existing relative paths (`./vertexVideoHandler.js` etc. inside `src/lib/adapters/video/`).
- [ ] Commit: `git add src/lib/adapters/video/index.ts test/continuous-test-suite-video-handler-registration.ts package.json && git commit -m "feat(video): add adapter barrel with registerDefaultVideoHandlers"`

---

### Task 10: Rewire voice/music/avatar CANDIDATES from the catalog; delete auto-run side effects

**Files:**

- `src/lib/voice/index.ts`
- `src/lib/music/index.ts`
- `src/lib/avatar/index.ts`
- `test/continuous-test-suite-media-handler-catalog.ts` (extend)

**Interfaces:** `registerDefaultTTSHandlers`, `registerDefaultSTTHandlers`, `registerDefaultRealtimeHandlers`, `registerDefaultMusicHandlers`, `registerDefaultAvatarHandlers` — all keep their exact `(): void` signatures. The module-level auto-run calls at the bottom of each file (`registerDefaultTTSHandlers(); registerDefaultSTTHandlers(); registerDefaultRealtimeHandlers();` in voice/index.ts; the single auto-run line in music/index.ts and avatar/index.ts) are **deleted** — registration becomes explicit-only, driven from `providerRegistry.ts` (Task 11).

- [ ] Write a failing test asserting the catalog and each barrel's candidate list agree. Add to `test/continuous-test-suite-media-handler-catalog.ts`, before `await runSuite();`:

  ```typescript
  await test("voice/index.ts's TTS candidates match the catalog", async () => {
    const { registerDefaultTTSHandlers } =
      await import("../src/lib/voice/index.js");
    const { TTSProcessor } = await import("../src/lib/utils/ttsProcessor.js");
    TTSProcessor.clearHandlers();
    registerDefaultTTSHandlers();
    // Registration is gated on isConfigured(), so in a no-key CI environment
    // this only proves the function runs against the full catalog without
    // throwing — coverage of "does it actually register when configured" is
    // the live TTS suite's job.
    for (const name of providerChoicesFor("tts")) {
      assert(
        typeof TTSProcessor.supports(name) === "boolean",
        `supports("${name}") returns a boolean rather than throwing`,
      );
    }
  });

  await test("music/index.ts's candidates match the catalog", async () => {
    const { registerDefaultMusicHandlers } =
      await import("../src/lib/music/index.js");
    const { MusicProcessor } =
      await import("../src/lib/utils/musicProcessor.js");
    MusicProcessor.clearHandlers();
    registerDefaultMusicHandlers();
    for (const name of providerChoicesFor("music")) {
      assert(
        typeof MusicProcessor.supports(name) === "boolean",
        `supports("${name}") returns a boolean rather than throwing`,
      );
    }
  });

  await test("avatar/index.ts's candidates match the catalog", async () => {
    const { registerDefaultAvatarHandlers } =
      await import("../src/lib/avatar/index.js");
    const { AvatarProcessor } =
      await import("../src/lib/utils/avatarProcessor.js");
    AvatarProcessor.clearHandlers();
    registerDefaultAvatarHandlers();
    for (const name of providerChoicesFor("avatar")) {
      assert(
        typeof AvatarProcessor.supports(name) === "boolean",
        `supports("${name}") returns a boolean rather than throwing`,
      );
    }
  });

  await test("importing voice/music/avatar index modules does not auto-register (side effect removed)", async () => {
    // This test only has teeth because clearHandlers() (Task 2-6) exists and
    // because module-level import side effects, once evaluated by Node, stay
    // evaluated for the life of the process — so if these barrels still
    // auto-registered on import, the *previous* tests in this file would
    // already have populated the registries before this test's own explicit
    // clearHandlers() calls ran, making the assertion below trivially true
    // either way. The real guarantee here is structural: Tasks 10's diff
    // removes the bottom-of-file auto-run block from each barrel, verified by
    // the grep-based regression check in this task's own checklist, not by
    // this runtime assertion. This test exists to keep the registries in a
    // clean, deterministic state for whatever suite runs after this one in
    // the same process.
    const { TTSProcessor } = await import("../src/lib/utils/ttsProcessor.js");
    const { MusicProcessor } =
      await import("../src/lib/utils/musicProcessor.js");
    const { AvatarProcessor } =
      await import("../src/lib/utils/avatarProcessor.js");
    TTSProcessor.clearHandlers();
    MusicProcessor.clearHandlers();
    AvatarProcessor.clearHandlers();
    assert(true, "registries reset for subsequent suites in this process");
  });
  ```

  Add `providerChoicesFor` to this file's existing import from `../src/lib/factories/mediaHandlerCatalog.js` (it already imports `MEDIA_HANDLER_CATALOG`, `providerChoicesFor`, `defaultProviderFor` from Task 8 — extend that import line rather than adding a duplicate).

- [ ] Run it and verify it passes even before the refactor (these tests exercise existing behavior and are not expected to fail pre-refactor — they establish a baseline). Run: `npx tsx test/continuous-test-suite-media-handler-catalog.ts`. This step is a baseline capture, not a red step; the genuine red/green cycle for this task is the grep-based structural check below.
- [ ] Implement the rewire in `src/lib/voice/index.ts`: replace the `TTS_HANDLER_CANDIDATES` array's literal `name`/`aliases` pairs with values sourced from `MEDIA_HANDLER_CATALOG` (keep the `factory` field manual — the catalog is pure data and does not know about handler classes). Concretely, replace the array with a small `_TTS_HANDLER_FACTORIES` map plus a derivation:

  ```typescript
  import { MEDIA_HANDLER_CATALOG } from "../factories/mediaHandlerCatalog.js";

  const _TTS_HANDLER_FACTORIES: Record<string, () => TTSHandler> = {
    "google-ai": () => new GoogleTTSHandler(),
    "openai-tts": () => new OpenAITTS(),
    elevenlabs: () => new ElevenLabsTTS(),
    "azure-tts": () => new AzureTTS(),
    "fish-audio": () => new FishAudioTTS(),
    cartesia: () => new CartesiaTTS(),
  };

  const TTS_HANDLER_CANDIDATES: ReadonlyArray<{
    readonly name: string;
    readonly aliases?: readonly string[];
    readonly factory: () => TTSHandler;
  }> = MEDIA_HANDLER_CATALOG.filter((entry) => entry.kind === "tts").map(
    (entry) => ({
      name: entry.name,
      aliases: entry.aliases,
      factory: _TTS_HANDLER_FACTORIES[entry.name],
    }),
  );
  ```

  Apply the identical pattern for `_STT_HANDLER_FACTORIES`/`STT_HANDLER_CANDIDATES` (kind `"stt"`) and `_REALTIME_HANDLER_FACTORIES`/`REALTIME_HANDLER_CANDIDATES` (kind `"realtime"`) in the same file. The shared `registerCandidates()` helper and the three `registerDefault*Handlers()` exported functions are unchanged.
  Delete the trailing auto-run block:

  ```typescript
  // Run once at module import so consumers who follow the documented
  // `nl.generate(...)` flow get every configured handler without manually
  // calling `registerHandler`.
  registerDefaultTTSHandlers();
  registerDefaultSTTHandlers();
  registerDefaultRealtimeHandlers();
  ```

- [ ] Apply the same catalog-sourcing pattern to `src/lib/music/index.ts` (`_MUSIC_HANDLER_FACTORIES`/`MUSIC_HANDLER_CANDIDATES`, kind `"music"`) and delete its trailing `registerDefaultMusicHandlers();` auto-run call.
- [ ] Apply the same catalog-sourcing pattern to `src/lib/avatar/index.ts` (`_AVATAR_HANDLER_FACTORIES`/`AVATAR_HANDLER_CANDIDATES`, kind `"avatar"`) and delete its trailing `registerDefaultAvatarHandlers();` auto-run call.
- [ ] Verify the structural change with a grep-based regression check (this is the actual red→green proof for this task, since the runtime behavior is deliberately unchanged from the caller's perspective once Task 11 re-wires the call site): confirm `grep -n "^registerDefault" src/lib/voice/index.ts src/lib/music/index.ts src/lib/avatar/index.ts` shows ONLY `export function registerDefault...` declaration lines, with no bare `registerDefaultTTSHandlers();`-style invocation lines remaining at file scope.
- [ ] Run `pnpm run check` and `pnpm run lint` and `pnpm run build` — since the auto-run side effects are now gone, confirm the build still succeeds (nothing at module-eval time was relying on these barrels being _imported for their side effect alone_; if the build or lint surfaces an unused-import warning for any of the three files, resolve it — the imports of the barrels' own re-exported handler classes must remain since Task 9's/Task 11's registration functions still construct them).
- [ ] Run the extended catalog test suite again: `npx tsx test/continuous-test-suite-media-handler-catalog.ts` — expect `RESULT: PASS`.
- [ ] Commit: `git add src/lib/voice/index.ts src/lib/music/index.ts src/lib/avatar/index.ts test/continuous-test-suite-media-handler-catalog.ts && git commit -m "refactor(media): source ecosystem CANDIDATES from mediaHandlerCatalog, drop import-side-effect auto-registration"`

---

### Task 11: Single registration path in `providerRegistry.ts`

**Files:**

- `src/lib/factories/providerRegistry.ts`
- `test/continuous-test-suite-media-registration-wiring.ts` (new)
- `package.json` (new script)

**Interfaces:** `ProviderRegistry.registerAllProviders()` (unchanged signature); `ProviderRegistry.realtimeRegistration` / `.getRegistrationReport()` (unchanged shape — `Record<string, "ok" | string>`; the failure-message TEXT for a specific handler is now coarser, a documented, intentional trade-off — see below).

This is the task that makes registration explicit-only: with Task 10's auto-run side effects removed, nothing registers any TTS/STT/Realtime/Video/Music/Avatar handler unless `providerRegistry.ts` calls the ecosystem's `registerDefault*Handlers()` function. Today `providerRegistry.ts` hand-registers each handler individually inside six separate blocks (TTS, STT, Realtime, Video, Music, Avatar) spanning roughly lines 749-1126 — this task collapses each block into a single call.

- [ ] Write a failing test. Create `test/continuous-test-suite-media-registration-wiring.ts`:

  ```typescript
  #!/usr/bin/env tsx
  /**
   * Continuous Test Suite: single media-registration wiring path (no API).
   *
   * Proves that ProviderRegistry.registerAllProviders() is now the ONLY path
   * that populates the six media-handler registries — the ecosystem barrels
   * no longer auto-register on import (Task 10), so calling
   * registerAllProviders() must be the thing that makes every catalog
   * provider queryable, and ProviderRegistry.getRegistrationReport() must
   * still report realtime outcomes in the pre-existing shape.
   *
   * Run: npx tsx test/continuous-test-suite-media-registration-wiring.ts
   */
  import { defineSuite, assert, assertEqual } from "./helpers/harness.js";
  import { ProviderRegistry } from "../src/lib/factories/providerRegistry.js";
  import { TTSProcessor } from "../src/lib/utils/ttsProcessor.js";
  import { STTProcessor } from "../src/lib/utils/sttProcessor.js";
  import { RealtimeProcessor } from "../src/lib/voice/RealtimeVoiceAPI.js";
  import { VideoProcessor } from "../src/lib/utils/videoProcessor.js";
  import { MusicProcessor } from "../src/lib/utils/musicProcessor.js";
  import { AvatarProcessor } from "../src/lib/utils/avatarProcessor.js";
  import { providerChoicesFor } from "../src/lib/factories/mediaHandlerCatalog.js";

  const { test, runSuite } = defineSuite("Media registration wiring (unit)");

  await test("registerAllProviders populates every media registry without throwing", async () => {
    TTSProcessor.clearHandlers();
    STTProcessor.clearHandlers();
    RealtimeProcessor.clearHandlers();
    VideoProcessor.clearHandlers();
    MusicProcessor.clearHandlers();
    AvatarProcessor.clearHandlers();

    await ProviderRegistry.registerAllProviders();

    for (const name of providerChoicesFor("tts")) {
      assert(
        typeof TTSProcessor.supports(name) === "boolean",
        `TTS "${name}" lookup does not throw`,
      );
    }
    for (const name of providerChoicesFor("stt")) {
      assert(
        typeof STTProcessor.supports(name) === "boolean",
        `STT "${name}" lookup does not throw`,
      );
    }
    for (const name of providerChoicesFor("realtime")) {
      assert(
        typeof RealtimeProcessor.supports(name) === "boolean",
        `Realtime "${name}" lookup does not throw`,
      );
    }
    for (const name of providerChoicesFor("video")) {
      assert(
        typeof VideoProcessor.supports(name) === "boolean",
        `Video "${name}" lookup does not throw`,
      );
    }
    for (const name of providerChoicesFor("music")) {
      assert(
        typeof MusicProcessor.supports(name) === "boolean",
        `Music "${name}" lookup does not throw`,
      );
    }
    for (const name of providerChoicesFor("avatar")) {
      assert(
        typeof AvatarProcessor.supports(name) === "boolean",
        `Avatar "${name}" lookup does not throw`,
      );
    }
  });

  await test("realtime providers register successfully in a keyless environment (registration is not isConfigured-gated)", async () => {
    RealtimeProcessor.clearHandlers();
    await ProviderRegistry.registerAllProviders();
    for (const name of providerChoicesFor("realtime")) {
      assert(
        RealtimeProcessor.supports(name),
        `realtime provider "${name}" registers even without credentials, per voice/index.ts's own documented behavior`,
      );
    }
  });

  await test("getRegistrationReport reports 'ok' for every realtime provider once registered", async () => {
    RealtimeProcessor.clearHandlers();
    await ProviderRegistry.registerAllProviders();
    const report = ProviderRegistry.getRegistrationReport();
    for (const name of providerChoicesFor("realtime")) {
      assertEqual(
        report.realtime[name],
        "ok",
        `report.realtime["${name}"] is "ok" once RealtimeProcessor.supports() is true`,
      );
    }
  });

  await runSuite();
  ```

- [ ] Run it against the CURRENT (pre-refactor) code and verify it fails: `npx tsx test/continuous-test-suite-media-registration-wiring.ts`. It should fail on the `TTS`/`STT`/`Video`/`Music`/`Avatar` loops (they were populated by module-import side effects that Task 10 already removed, and `providerRegistry.ts` has not yet been updated to call the barrels' `registerDefault*Handlers()` functions in place of its own six hand-written blocks) — confirm the failure is in the expected assertions before proceeding.
- [ ] Locate each of the six hand-written registration blocks in `providerRegistry.ts` (TTS, STT, Realtime, Video, Music, Avatar — spanning roughly lines 749-1126) and replace each with a single call to its ecosystem's exported `registerDefault*Handlers()` function, imported dynamically per this repo's "dynamic imports only in registry" rule. For TTS/STT/Music/Avatar, this reduces each block to:
  ```typescript
  try {
    const { registerDefaultTTSHandlers } = await import("../voice/index.js");
    registerDefaultTTSHandlers();
  } catch (err) {
    logger.debug(
      `[ProviderRegistry] TTS handler registration skipped: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
  ```
  (repeat the identical shape for `registerDefaultSTTHandlers` from `../voice/index.js`, `registerDefaultMusicHandlers` from `../music/index.js`, `registerDefaultAvatarHandlers` from `../avatar/index.js`).
  For Video, call the new barrel from Task 9:
  ```typescript
  try {
    const { registerDefaultVideoHandlers } =
      await import("../adapters/video/index.js");
    registerDefaultVideoHandlers();
  } catch (err) {
    logger.debug(
      `[ProviderRegistry] Video handler registration skipped: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
  ```
  For Realtime, the block additionally has to preserve the `ProviderRegistry.realtimeRegistration` outcomes report. Since `registerDefaultRealtimeHandlers()` keeps its `(): void` signature (no per-handler outcome return value), reconstruct a coarser outcomes record AFTER calling it, by checking `RealtimeProcessor.supports()` per catalog entry:
  ```typescript
  try {
    const { registerDefaultRealtimeHandlers } =
      await import("../voice/index.js");
    const { RealtimeProcessor } = await import("../voice/RealtimeVoiceAPI.js");
    const { providerChoicesFor } = await import("./mediaHandlerCatalog.js");
    registerDefaultRealtimeHandlers();
    const realtimeOutcomes: Record<string, "ok" | string> = {};
    for (const name of providerChoicesFor("realtime")) {
      // NOTE: this collapses what used to be individual per-handler
      // try/catch outcome messages into a coarser two-state signal. The
      // "ok" | string type and the "ok" discriminator are preserved exactly;
      // only the specific failure-message text for a given provider is now
      // generic rather than the original constructor error. Realtime
      // registration is not gated on isConfigured() (see
      // voice/index.ts's registerDefaultRealtimeHandlers JSDoc), so in a
      // no-API-key environment every realtime provider still registers
      // successfully and reports "ok".
      realtimeOutcomes[name] = RealtimeProcessor.supports(name)
        ? "ok"
        : "not registered (see debug log for details)";
    }
    ProviderRegistry.realtimeRegistration = realtimeOutcomes;
  } catch (err) {
    logger.debug(
      `[ProviderRegistry] Realtime handler registration skipped: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
  ```
  Adjust the exact `try`/`catch` nesting and surrounding braces to match whatever control-flow structure is actually present at the six block locations in the file (the existing blocks are inside `registerAllProviders()`, an `async` method) — the required end-state is: each of the six blocks is reduced to a single call into its ecosystem's `registerDefault*Handlers()` function (plus, for realtime only, the outcomes-reconstruction loop above), and NONE of the six blocks constructs a handler class directly anymore.
- [ ] Also update the testing-reset helper (the block around line 1155 that resets `ProviderRegistry.realtimeRegistration` between test runs) if it references any of the deleted per-handler registration internals — it should continue to simply reset `this.realtimeRegistration = {};` (unchanged) plus reset `this.registered = false;` as before; if it directly touches Map internals of any processor, replace with the new `clearHandlers()` methods from Tasks 2-7.
- [ ] Run the test and verify it passes: `npx tsx test/continuous-test-suite-media-registration-wiring.ts` — expect `RESULT: PASS`.
- [ ] Add `"test:media-registration-wiring": "npx tsx test/continuous-test-suite-media-registration-wiring.ts",` to `package.json`.
- [ ] Run `pnpm run check` and `pnpm run lint` and `pnpm run build` — fix any errors. In particular, confirm no direct handler-class imports (e.g. `GoogleTTSHandler`, `OpenAITTS`, `VertexVideoHandler`, etc.) remain unused at the top of `providerRegistry.ts` now that the six blocks no longer construct handlers directly — remove any now-dead imports.
- [ ] Run the existing broader suites that depend on registration as a smoke check: `pnpm run test:mcp:infra` (or another no-API suite that exercises `ProviderRegistry.registerAllProviders()` indirectly) to confirm nothing else broke.
- [ ] Commit: `git add src/lib/factories/providerRegistry.ts test/continuous-test-suite-media-registration-wiring.ts package.json && git commit -m "refactor(providers): collapse six media registration blocks into a single registerDefault*Handlers() call chain"`

---

### Task 12: `resolveRequestKind()` pure dispatch function

**Files:**

- `src/lib/types/dispatch.ts` (new)
- `src/lib/types/index.ts` (barrel export)
- `src/lib/core/resolveRequestKind.ts` (new)
- `test/continuous-test-suite-resolve-request-kind.ts` (new)
- `package.json` (new script)

**Interfaces:**

```typescript
export type RequestKind =
  | "text"
  | "image"
  | "video"
  | "music"
  | "avatar"
  | "tts-direct"
  | "ppt";
export type RequestKindInput = {
  output?: { mode?: string; format?: string };
  tts?: { enabled?: boolean; useAiResponse?: boolean };
};
export function resolveRequestKind(
  options: RequestKindInput,
  modelName?: string,
): RequestKind;
```

- [ ] Write a failing test suite covering every branch and the precedence order between them. Create `test/continuous-test-suite-resolve-request-kind.ts`:

  ```typescript
  #!/usr/bin/env tsx
  /**
   * Continuous Test Suite: resolveRequestKind (no API).
   *
   * The single decision function for "what kind of request is this" — used
   * by both neurolink.ts's maybeHandleEarlyGenerateResult and
   * baseProvider.ts's stream()/runGenerateInActiveContext, replacing the
   * previously duplicated inline mode-detection logic in each file.
   *
   * Run: npx tsx test/continuous-test-suite-resolve-request-kind.ts
   */
  import { defineSuite, assertEqual } from "./helpers/harness.js";
  import { resolveRequestKind } from "../src/lib/core/resolveRequestKind.js";

  const { test, runSuite } = defineSuite("resolveRequestKind (unit)");

  await test("defaults to text with no hints", () => {
    assertEqual(
      resolveRequestKind({}),
      "text",
      "no output/tts hints yields text",
    );
  });

  await test("output.mode='music' wins outright", () => {
    assertEqual(resolveRequestKind({ output: { mode: "music" } }), "music");
  });

  await test("output.mode='avatar' wins outright", () => {
    assertEqual(resolveRequestKind({ output: { mode: "avatar" } }), "avatar");
  });

  await test("output.mode='video' wins outright", () => {
    assertEqual(resolveRequestKind({ output: { mode: "video" } }), "video");
  });

  await test("output.mode='ppt' wins outright", () => {
    assertEqual(resolveRequestKind({ output: { mode: "ppt" } }), "ppt");
  });

  await test("an image-generation model without a non-image output format resolves to image", () => {
    assertEqual(
      resolveRequestKind({}, "gpt-image-1"),
      "image",
      "gpt-image-1 is in IMAGE_GENERATION_MODELS",
    );
  });

  await test("an image-generation model requesting json output does NOT resolve to image", () => {
    assertEqual(
      resolveRequestKind({ output: { format: "json" } }, "gpt-image-1"),
      "text",
      "explicit non-image output.format overrides the image-model default",
    );
  });

  await test("an image-generation model requesting structured output does NOT resolve to image", () => {
    assertEqual(
      resolveRequestKind({ output: { format: "structured" } }, "dall-e-3"),
      "text",
    );
  });

  await test("an image-generation model requesting text output does NOT resolve to image", () => {
    assertEqual(
      resolveRequestKind({ output: { format: "text" } }, "dall-e-2"),
      "text",
    );
  });

  await test("a non-image model with no other hints resolves to text", () => {
    assertEqual(resolveRequestKind({}, "gpt-4o"), "text");
  });

  await test("boundary-aware image matching: a model that merely contains an entry as a substring is not misdetected", () => {
    assertEqual(
      resolveRequestKind(
        {},
        "my-V_1-custom-finetune-without-separator-suffixV_1X",
      ),
      "text",
      "V_1 embedded without a boundary separator must not trigger image routing",
    );
  });

  await test("tts.enabled without useAiResponse resolves to tts-direct", () => {
    assertEqual(resolveRequestKind({ tts: { enabled: true } }), "tts-direct");
  });

  await test("tts.enabled with useAiResponse does NOT resolve to tts-direct", () => {
    assertEqual(
      resolveRequestKind({ tts: { enabled: true, useAiResponse: true } }),
      "text",
      "AI-response TTS augments text generation rather than replacing it",
    );
  });

  await test("output.mode takes precedence over an image-generation model", () => {
    assertEqual(
      resolveRequestKind({ output: { mode: "video" } }, "gpt-image-1"),
      "video",
      "an explicit output.mode wins even when the model would otherwise route to image",
    );
  });

  await test("an image-generation model takes precedence over tts.enabled", () => {
    assertEqual(
      resolveRequestKind({ tts: { enabled: true } }, "gpt-image-1"),
      "image",
      "image-model detection is checked before tts-direct",
    );
  });

  await test("no modelName provided never resolves to image", () => {
    assertEqual(resolveRequestKind({}, undefined), "text");
  });

  await runSuite();
  ```

- [ ] Run it and verify it fails: `npx tsx test/continuous-test-suite-resolve-request-kind.ts` — expect a module-resolution error (`Cannot find module '../src/lib/core/resolveRequestKind.js'`).
- [ ] Create `src/lib/types/dispatch.ts`:

  ```typescript
  /**
   * Types backing resolveRequestKind() (src/lib/core/resolveRequestKind.ts) —
   * the single function that decides which of NeuroLink's output modes a
   * generate/stream request is asking for.
   */

  export type RequestKind =
    | "text"
    | "image"
    | "video"
    | "music"
    | "avatar"
    | "tts-direct"
    | "ppt";

  /**
   * Narrow structural subset of TextGenerationOptions/GenerateOptions that
   * resolveRequestKind() actually reads. Kept intentionally minimal (rather
   * than importing the full options type) so this module has no dependency
   * on the wider options type graph.
   */
  export type RequestKindInput = {
    output?: {
      mode?: string;
      format?: string;
    };
    tts?: {
      enabled?: boolean;
      useAiResponse?: boolean;
    };
  };
  ```

- [ ] Add `export * from "./dispatch.js";` to `src/lib/types/index.ts`, next to the `mediaCatalog.js` export added in Task 8.
- [ ] Create `src/lib/core/resolveRequestKind.ts`:

  ```typescript
  import { isImageGenerationModel } from "./constants.js";
  import type { RequestKind, RequestKindInput } from "../types/index.js";

  /**
   * Single source of truth for "what kind of request is this" — text, image,
   * video, music, avatar, direct TTS synthesis, or PPT generation. Both
   * neurolink.ts's maybeHandleEarlyGenerateResult (music/avatar/ppt/workflow
   * routing) and baseProvider.ts's stream()/runGenerateInActiveContext
   * (image/video/tts-direct routing) call this instead of independently
   * re-deriving the same decision.
   *
   * Precedence, checked in order:
   *   1. output.mode (music/avatar/video/ppt) — an explicit mode always wins.
   *   2. an image-generation model, unless the caller explicitly asked for a
   *      non-image output.format (json/structured/text) — this lets dual-mode
   *      models like gemini-3.1-flash-image-preview still perform text or
   *      structured generation when requested.
   *   3. tts.enabled without tts.useAiResponse — direct synthesis, bypassing
   *      the LLM turn entirely (useAiResponse means the LLM's own text
   *      response gets synthesized afterward, which is NOT this branch).
   *   4. otherwise, "text".
   */
  export function resolveRequestKind(
    options: RequestKindInput,
    modelName?: string,
  ): RequestKind {
    if (options.output?.mode === "music") {
      return "music";
    }
    if (options.output?.mode === "avatar") {
      return "avatar";
    }
    if (options.output?.mode === "video") {
      return "video";
    }
    if (options.output?.mode === "ppt") {
      return "ppt";
    }

    const requestsNonImageOutput =
      options.output?.format === "json" ||
      options.output?.format === "structured" ||
      options.output?.format === "text";
    if (isImageGenerationModel(modelName) && !requestsNonImageOutput) {
      return "image";
    }

    if (options.tts?.enabled && !options.tts?.useAiResponse) {
      return "tts-direct";
    }

    return "text";
  }
  ```

- [ ] Run the test and verify it passes: `npx tsx test/continuous-test-suite-resolve-request-kind.ts` — expect `RESULT: PASS`.
- [ ] Sanity-check the harness: temporarily swap the order of the `tts.enabled` check and the image-model check in the implementation (or change one expected value in the test), run the suite, confirm a real failure reports `✗` and exits non-zero, then revert.
- [ ] Add `"test:resolve-request-kind": "npx tsx test/continuous-test-suite-resolve-request-kind.ts",` to `package.json`.
- [ ] Run `pnpm run check` and `pnpm run lint` — fix any errors.
- [ ] Commit: `git add src/lib/types/dispatch.ts src/lib/types/index.ts src/lib/core/resolveRequestKind.ts test/continuous-test-suite-resolve-request-kind.ts package.json && git commit -m "feat(core): add resolveRequestKind pure dispatch function"`

---

### Task 13: Wire `resolveRequestKind()` into `neurolink.ts`

**Files:**

- `src/lib/neurolink.ts`

**Interfaces:** `maybeHandleEarlyGenerateResult` (private method, unchanged signature) — internal logic only.

This task is a pure call-site wiring refactor. Its correctness is guaranteed by Task 12's exhaustive `resolveRequestKind()` unit tests plus the verification steps below — see "Verification strategy" at the end of this task rather than a new runtime test asserting the wiring itself.

- [ ] In `src/lib/neurolink.ts`, add the import near the top of the file (alongside the other relative imports):
  ```typescript
  import { resolveRequestKind } from "./core/resolveRequestKind.js";
  ```
- [ ] In `maybeHandleEarlyGenerateResult`, replace:

  ```typescript
  if (options.output?.mode === "music") {
    return this.generateWithMusic(options, generateSpan);
  }

  if (options.output?.mode === "avatar") {
    return this.generateWithAvatar(options, generateSpan);
  }

  if (options.output?.mode !== "ppt") {
    return null;
  }
  ```

  with:

  ```typescript
  const requestKind = resolveRequestKind(options);
  if (requestKind === "music") {
    return this.generateWithMusic(options, generateSpan);
  }

  if (requestKind === "avatar") {
    return this.generateWithAvatar(options, generateSpan);
  }

  if (requestKind !== "ppt") {
    return null;
  }
  ```

  Leave the surrounding workflow-mode block (the `if (options.workflow || options.workflowConfig) { ... }` block above, including its own `options.output?.mode === "avatar" | "music" | "video" | "ppt"` guard that rejects incompatible workflow configs) exactly as-is — that block's own mode checks are validating an incompatibility error, not routing a request, so they stay independent of `resolveRequestKind()`.

- [ ] Verification strategy (no new runtime test is added for this task — the decision logic itself is already exhaustively covered by Task 12):
  - Grep-based regression check: confirm `grep -n 'options.output?.mode === "music"\|options.output?.mode === "avatar"' src/lib/neurolink.ts` no longer matches inside `maybeHandleEarlyGenerateResult` (the workflow-guard block's checks are expected to remain and will still match — confirm by reading the matched line numbers that only the workflow-guard block's lines remain).
  - `pnpm run build && pnpm run check && pnpm run lint` — must all pass; this catches any broken reference to the old inline checks or an unused import.
  - Run `npx tsx test/continuous-test-suite-resolve-request-kind.ts` again to reconfirm the underlying decision logic is unaffected.
  - Run a broad no-API-safe smoke pass: `pnpm run test:mcp:infra` (or another suite that exercises `neurolink.generate()` without requiring a live API key) to confirm no regression in the surrounding control flow.
- [ ] Commit: `git add src/lib/neurolink.ts && git commit -m "refactor(neurolink): route maybeHandleEarlyGenerateResult through resolveRequestKind"`

---

### Task 14: Wire `resolveRequestKind()` into `baseProvider.ts`

**Files:**

- `src/lib/core/baseProvider.ts`

**Interfaces:** `stream()` and `runGenerateInActiveContext` (both unchanged signatures) — internal logic only. The now-fully-dead `IMAGE_GENERATION_MODELS` import is deleted.

- [ ] In `src/lib/core/baseProvider.ts`, add the import near the top of the file, next to the existing relative imports (e.g. right after the `MiddlewareFactory` import or any nearby `./`-relative import):
  ```typescript
  import { resolveRequestKind } from "./resolveRequestKind.js";
  ```
- [ ] In `stream()`, replace:

  ```typescript
      const isImageModel = IMAGE_GENERATION_MODELS.some((m) =>
        this.modelName.includes(m),
      );
      const requestsNonImageOutput =
        options.output?.format === "json" ||
        options.output?.format === "structured" ||
        options.output?.format === "text";

      if (isImageModel && !requestsNonImageOutput) {
  ```

  with:

  ```typescript
      const requestKind = resolveRequestKind(options, this.modelName);

      if (requestKind === "image") {
  ```

  Before making this change, grep the rest of `stream()`'s body (from this point to the method's closing brace) for any other reference to `isImageModel` or `requestsNonImageOutput` — if none exist beyond the block just replaced, the swap is safe as written; if either variable is referenced again further down, keep a local `const isImageModel = requestKind === "image";` (and/or the `requestsNonImageOutput` equivalent) immediately after the `resolveRequestKind` call so the rest of the method still compiles unchanged.

- [ ] In `runGenerateInActiveContext`, replace:

  ```typescript
  if (options.output?.mode === "video") {
    return await this.handleVideoGeneration(options, startTime);
  }

  const isImageModel = IMAGE_GENERATION_MODELS.some((m) =>
    this.modelName.includes(m),
  );
  const requestsNonImageOutput =
    options.output?.format === "json" ||
    options.output?.format === "structured" ||
    options.output?.format === "text";
  if (isImageModel && !requestsNonImageOutput) {
    logger.info(
      `Image generation model detected, routing to executeImageGeneration`,
      {
        provider: this.providerName,
        model: this.modelName,
      },
    );

    const imageResult = await this.executeImageGeneration(options);
    return await this.enhanceResult(imageResult, options, startTime);
  }

  if (options.tts?.enabled && !options.tts?.useAiResponse) {
    return this.handleDirectTTSSynthesis(options, startTime);
  }
  ```

  with:

  ```typescript
  const requestKind = resolveRequestKind(options, this.modelName);

  if (requestKind === "video") {
    return await this.handleVideoGeneration(options, startTime);
  }

  if (requestKind === "image") {
    logger.info(
      `Image generation model detected, routing to executeImageGeneration`,
      {
        provider: this.providerName,
        model: this.modelName,
      },
    );

    const imageResult = await this.executeImageGeneration(options);
    return await this.enhanceResult(imageResult, options, startTime);
  }

  if (requestKind === "tts-direct") {
    return this.handleDirectTTSSynthesis(options, startTime);
  }
  ```

- [ ] Delete the now fully-dead import at the top of the file: `import { IMAGE_GENERATION_MODELS } from "../core/constants.js";`. Before deleting, grep the entire file for `IMAGE_GENERATION_MODELS` to confirm these two call sites were its only two usages (`grep -n "IMAGE_GENERATION_MODELS" src/lib/core/baseProvider.ts` should return nothing once the two replacements above are made).
- [ ] Verification strategy (mirrors Task 13 — no new runtime test is added since the decision logic is covered by Task 12):
  - `grep -n "IMAGE_GENERATION_MODELS" src/lib/core/baseProvider.ts` returns no results.
  - `pnpm run build && pnpm run check && pnpm run lint` — must all pass. The `check`/lint step is what actually catches an unused-import failure if the delete above was wrong.
  - Run `npx tsx test/continuous-test-suite-resolve-request-kind.ts` again.
  - Run `pnpm run test:providers` (or another suite from the existing matrix) as a regression smoke pass — expect the usual graceful SKIPs for missing API keys, with no new FAILs introduced by this refactor.
- [ ] Commit: `git add src/lib/core/baseProvider.ts && git commit -m "refactor(baseProvider): route stream() and runGenerateInActiveContext through resolveRequestKind"`

---

### Task 15: `VideoProcessor.generate` bag-signature normalization

**Files:**

- `src/lib/types/video.ts`
- `src/lib/utils/videoProcessor.ts`
- `src/lib/core/baseProvider.ts`
- `test/continuous-test-suite-video-generation-unit.ts` (extend)

**Interfaces:**

```typescript
export type VideoGenerateOptions = VideoOutputOptions & {
  image: Buffer;
  prompt: string;
  region?: string;
};
// VideoProcessor's new public signature:
static async generate(provider: string, options: VideoGenerateOptions): Promise<VideoGenerationResult>;
```

`VideoHandler.generate(image, prompt, options, region)`'s own declared type in `src/lib/types/video.ts` is **left unchanged** — this normalization applies only to `VideoProcessor.generate`'s public entry point, which now translates the bag internally before calling the unchanged handler-level signature. Music/Avatar's `generate(provider, options)` are already in this bag shape and serve as the reference for why this is the right normalization target; TTS/STT's `synthesize(text, options)`/`transcribe(audio, options)` already have a minimal idiomatic two-argument shape and are correctly left as-is (their primary payload is a single value — text or an audio buffer — that doesn't benefit from bag-collapsing the way video's multi-piece `image`+`prompt`+`options`+`region` argument list does).

- [ ] Write a failing test for the new bag signature. Add to `test/continuous-test-suite-video-generation-unit.ts`, before `await runSuite();`:

  ```typescript
  await test("generate accepts the bag-form signature (provider, options)", async () => {
    let receivedImage: Buffer | undefined;
    let receivedPrompt: string | undefined;
    let receivedRegion: string | undefined;
    const handler = {
      isConfigured: () => true,
      generate: async (
        image: Buffer,
        prompt: string,
        _options: unknown,
        region?: string,
      ) => {
        receivedImage = image;
        receivedPrompt = prompt;
        receivedRegion = region;
        return {
          data: Buffer.from("bag-form-video"),
          format: "mp4",
          metadata: {},
        };
      },
    } as unknown as VideoHandler;
    const bagProvider = "stub-video-bag-provider";
    VideoProcessor.registerHandler(bagProvider, handler);
    const image = Buffer.from("input-image-bytes");
    await VideoProcessor.generate(bagProvider, {
      image,
      prompt: "a bag-form prompt",
      region: "us-central1",
      resolution: "1080p",
    });
    assertEqual(
      receivedImage,
      image,
      "image forwarded to the legacy handler signature",
    );
    assertEqual(receivedPrompt, "a bag-form prompt", "prompt forwarded");
    assertEqual(receivedRegion, "us-central1", "region forwarded");
  });

  await test("generate's bag form strips image/prompt/region out of the options object forwarded to the handler", async () => {
    let receivedOptions: Record<string, unknown> | undefined;
    const handler = {
      isConfigured: () => true,
      generate: async (
        _image: Buffer,
        _prompt: string,
        options: Record<string, unknown>,
      ) => {
        receivedOptions = options;
        return { data: Buffer.from("x"), format: "mp4", metadata: {} };
      },
    } as unknown as VideoHandler;
    const bagProvider = "stub-video-bag-provider-2";
    VideoProcessor.registerHandler(bagProvider, handler);
    await VideoProcessor.generate(bagProvider, {
      image: Buffer.from("img"),
      prompt: "p",
      region: "us-central1",
      resolution: "1080p",
      length: 6,
    });
    assert(receivedOptions !== undefined, "handler received an options object");
    assert(
      !("image" in (receivedOptions ?? {})) &&
        !("prompt" in (receivedOptions ?? {})) &&
        !("region" in (receivedOptions ?? {})),
      "image/prompt/region are not leaked into the video-specific options object",
    );
    assertEqual(
      receivedOptions?.resolution,
      "1080p",
      "video-specific options still reach the handler",
    );
  });
  ```

  Add `import type { VideoHandler } from "../src/lib/types/index.js";` if not already present in the file (it was added in Task 7), and confirm `assert`/`assertEqual` are already imported.

- [ ] Run it and verify it fails: `npx tsx test/continuous-test-suite-video-generation-unit.ts` — TypeScript should reject the object-literal call against `VideoProcessor.generate`'s current 4-positional-argument signature.
- [ ] Add `VideoGenerateOptions` to `src/lib/types/video.ts` (it already imports `VideoOutputOptions`, so no new import is needed):
  ```typescript
  /**
   * Bag-form input to VideoProcessor.generate() — the primary data (image,
   * prompt, region) alongside the video-specific output options, collapsed
   * into a single object matching Music/Avatar's existing generate(provider,
   * options) shape. VideoHandler.generate()'s own 4-positional-argument
   * signature is unchanged; VideoProcessor.generate() translates between the
   * two internally.
   */
  export type VideoGenerateOptions = VideoOutputOptions & {
    image: Buffer;
    prompt: string;
    region?: string;
  };
  ```
- [ ] Update `VideoProcessor.generate` in `src/lib/utils/videoProcessor.ts` to the bag-form signature, translating internally before calling the unchanged `handler.generate(image, prompt, videoOptions, region)`:

  ```typescript
  static async generate(
    provider: string,
    options: VideoGenerateOptions,
  ): Promise<VideoGenerationResult> {
    const { image, prompt, region, ...videoOptions } = options;
    const span = SpanSerializer.createSpan(
      SpanType.MEDIA_GENERATION,
      "video.generate",
      this.buildSpanAttributes(provider, videoOptions),
    );

    try {
      const handler = this.getHandler(provider);
      if (!handler) {
        throw new VideoError({
          code: VIDEO_ERROR_CODES.PROVIDER_NOT_SUPPORTED,
          message: `Video provider "${provider}" is not registered. Available: ${this.listProviders().join(", ")}`,
          category: ErrorCategory.CONFIGURATION,
          severity: ErrorSeverity.HIGH,
          retriable: false,
          context: { provider, available: this.listProviders() },
        });
      }
      if (!handler.isConfigured()) {
        throw new VideoError({
          code: VIDEO_ERROR_CODES.PROVIDER_NOT_CONFIGURED,
          message: `Video provider "${provider}" is not configured. Set the required credentials.`,
          category: ErrorCategory.CONFIGURATION,
          severity: ErrorSeverity.HIGH,
          retriable: false,
          context: { provider },
        });
      }

      logger.debug(
        `[VideoProcessor] Starting video generation with provider: ${provider}`,
      );

      const result = await handler.generate(image, prompt, videoOptions, region);

      const ended = SpanSerializer.endSpan(span, SpanStatus.OK);
      getMetricsAggregator().recordSpan(ended);

      logger.info(
        `[VideoProcessor] Generated ${result.data.length} bytes (${provider})`,
      );
      return result;
    } catch (err: unknown) {
      const ended = SpanSerializer.endSpan(
        span,
        SpanStatus.ERROR,
        err instanceof Error ? err.message : String(err),
      );
      getMetricsAggregator().recordSpan(ended);

      if (err instanceof VideoError) {
        throw err;
      }

      const message = err instanceof Error ? err.message : String(err);
      throw new VideoError({
        code: VIDEO_ERROR_CODES.GENERATION_FAILED,
        message: `Video generation failed for provider "${provider}": ${message}`,
        category: ErrorCategory.EXECUTION,
        severity: ErrorSeverity.HIGH,
        retriable: true,
        context: { provider, options: videoOptions, region },
        originalError: err instanceof Error ? err : undefined,
      });
    }
  }
  ```

  Reconcile this against whatever the current body's exact error-construction fields/span calls are at the time of editing (`buildSpanAttributes`, `SpanSerializer`, `getMetricsAggregator`, the exact `VideoError` constructor field set) — the only REQUIRED behavioral change is the signature (`provider, options: VideoGenerateOptions` in place of `provider, image, prompt, options, region`) and the destructuring line `const { image, prompt, region, ...videoOptions } = options;` feeding the existing internal logic unchanged. `generateTransition` (a separate method) is untouched by this task.
  Add the `VideoGenerateOptions` import: `import type { VideoGenerateOptions } from "../types/index.js";` (barrel import, per repo rule 13).

- [ ] Update the one caller, `handleVideoGeneration` in `src/lib/core/baseProvider.ts`, replacing:
  ```typescript
  const videoTimeout = options.timeout ?? 600_000; // 10 min default
  const videoResult = await this.executeWithTimeout(
    () =>
      VideoProcessor.generate(
        requestedProvider,
        imageBuffer,
        prompt,
        options.output?.video ?? {},
        options.region,
      ),
    { timeout: videoTimeout, operationType: "generate" },
  );
  ```
  with:
  ```typescript
  const videoTimeout = options.timeout ?? 600_000; // 10 min default
  const videoResult = await this.executeWithTimeout(
    () =>
      VideoProcessor.generate(requestedProvider, {
        ...(options.output?.video ?? {}),
        image: imageBuffer,
        prompt,
        region: options.region,
      }),
    { timeout: videoTimeout, operationType: "generate" },
  );
  ```
- [ ] Run the test and verify it passes: `npx tsx test/continuous-test-suite-video-generation-unit.ts` — expect `RESULT: PASS`, including the earlier "re-registering a provider replaces the previous handler for dispatch" test from Task 7 (which used the OLD 4-arg call form) — update that Task-7 test in the same file to the new bag form now, since the old positional call will no longer type-check:
  ```typescript
  await VideoProcessor.generate(PROVIDER, {
    image: Buffer.from("image"),
    prompt: "a prompt",
  });
  ```
- [ ] Run `pnpm run check` and `pnpm run lint` — fix any errors, in particular confirm `handleVideoGeneration` and any other caller of `VideoProcessor.generate` in the codebase (grep `VideoProcessor.generate(` across `src/`) were all updated to the bag form.
- [ ] Run `pnpm run build` to confirm the wider type graph compiles.
- [ ] Commit: `git add src/lib/types/video.ts src/lib/utils/videoProcessor.ts src/lib/core/baseProvider.ts test/continuous-test-suite-video-generation-unit.ts && git commit -m "refactor(video): normalize VideoProcessor.generate to a bag-form signature"`

---

### Task 16: baseProvider's hardcoded "vertex" video default

**Files:**

- `src/lib/core/baseProvider.ts`

**Interfaces:** `handleVideoGeneration` (private method, unchanged signature) — internal logic only.

Sequenced right after Task 15 since both touch `handleVideoGeneration`.

- [ ] Write a failing test. Add to `test/continuous-test-suite-video-generation-unit.ts`, before `await runSuite();`:
  ```typescript
  await test("defaultProviderFor('video') matches the historical hardcoded baseProvider.ts default", async () => {
    const { defaultProviderFor } =
      await import("../src/lib/factories/mediaHandlerCatalog.js");
    assertEqual(
      defaultProviderFor("video"),
      "vertex",
      "baseProvider.ts's handleVideoGeneration must keep defaulting to vertex",
    );
  });
  ```
  This test already passes as of Task 8/9 (it asserts a property of the catalog, not of `baseProvider.ts` itself — `baseProvider.ts` cannot be exercised directly in a no-API suite since `handleVideoGeneration` requires a live provider instance). Its role here is to pin the catalog's value so a future edit to `MEDIA_HANDLER_CATALOG` that silently reorders the video entries would be caught. Run it and confirm it already passes: `npx tsx test/continuous-test-suite-video-generation-unit.ts`.
- [ ] In `src/lib/core/baseProvider.ts`, add the import (or extend the existing `mediaHandlerCatalog.js` import if Task 15 hasn't added one — Task 15 does not need this import, so add it fresh here):
  ```typescript
  import { defaultProviderFor } from "../factories/mediaHandlerCatalog.js";
  ```
- [ ] In `handleVideoGeneration`, replace:
  ```typescript
  // Honor output.video.provider — when omitted, fall back to "vertex"
  // for backward compatibility with the original implementation.
  const requestedProvider = options.output?.video?.provider ?? "vertex";
  ```
  with:
  ```typescript
  // Honor output.video.provider — when omitted, fall back to the
  // catalog's default video provider for backward compatibility with the
  // original implementation (currently "vertex").
  const requestedProvider =
    options.output?.video?.provider ?? defaultProviderFor("video");
  ```
  Do NOT touch the sibling model-name literals `"veo-3.1-generate-001"` at the two locations further down in the same method (the `resolvedRequestModel` fallback and the `responseModel` fallback) — those are Vertex's default _model_, not the default _provider_, and are out of scope for this task.
- [ ] Run `pnpm run check` and `pnpm run lint` — fix any errors.
- [ ] Run `pnpm run build`.
- [ ] Commit: `git add src/lib/core/baseProvider.ts test/continuous-test-suite-video-generation-unit.ts && git commit -m "refactor(video): source handleVideoGeneration's default provider from mediaHandlerCatalog"`

---

### Task 17: CLI `--*-provider` choices derived from the catalog

**Files:**

- `src/cli/factories/commandFactory.ts`
- `test/continuous-test-suite-media-handler-catalog.ts` (extend)

**Interfaces:** `CLICommandFactory.createGenerateCommand()` (unchanged public signature) — internal `commonOptions` values only.

`CLICommandFactory.commonOptions` and `CLICommandFactory.buildOptions()` are both `private static`, so this task tests the effect indirectly: `createGenerateCommand()` returns a `CommandModule` whose public `builder` function is invoked with a stub chainable yargs object, and the captured `.options(...)` argument is asserted against.

- [ ] Write a failing test. Add to `test/continuous-test-suite-media-handler-catalog.ts`, before `await runSuite();`:

  ```typescript
  await test("the CLI's --tts-provider/--stt-provider/--video-provider/--avatar-provider/--music-provider choices are catalog-derived", async () => {
    const { CLICommandFactory } =
      await import("../src/cli/factories/commandFactory.js");

    let capturedOptions: Record<string, { choices?: unknown }> | undefined;
    const stubYargs: Record<string, (...args: unknown[]) => unknown> = {
      positional: () => stubYargs,
      example: () => stubYargs,
      options: (opts: Record<string, { choices?: unknown }>) => {
        capturedOptions = opts;
        return stubYargs;
      },
      implies: () => stubYargs,
    };

    const command = CLICommandFactory.createGenerateCommand();
    // `builder` is typed loosely by yargs (Argv | ((yargs) => Argv)); the
    // generate command always supplies the function form.
    const builder = command.builder as (yargs: unknown) => unknown;
    builder(stubYargs);

    assert(
      capturedOptions !== undefined,
      "builder invoked yargs.options(...) with a captured object",
    );
    const options = capturedOptions as Record<string, { choices?: string[] }>;

    for (const [flag, kind] of [
      ["ttsProvider", "tts"],
      ["sttProvider", "stt"],
      ["videoProvider", "video"],
      ["avatarProvider", "avatar"],
      ["musicProvider", "music"],
    ] as const) {
      const choices = options[flag]?.choices;
      assert(Array.isArray(choices), `${flag}.choices is an array`);
      for (const expected of providerChoicesFor(kind)) {
        assert(
          (choices ?? []).includes(expected),
          `${flag}.choices includes "${expected}" from the catalog`,
        );
      }
    }

    // Regression pin: these two were stale/incomplete before this task.
    assert(
      options.ttsProvider?.choices?.includes("fish-audio"),
      "ttsProvider.choices now includes fish-audio",
    );
    assert(
      options.ttsProvider?.choices?.includes("cartesia"),
      "ttsProvider.choices now includes cartesia",
    );
    assert(
      options.sttProvider?.choices?.includes("openai-stt"),
      "sttProvider.choices now includes the openai-stt alias",
    );
  });
  ```

- [ ] Run it and verify it fails: `npx tsx test/continuous-test-suite-media-handler-catalog.ts` — expect failures on the `videoProvider`/`avatarProvider`/`musicProvider` assertions (no `choices` key exists on those option objects today) and on the `fish-audio`/`cartesia`/`openai-stt` regression pins.
- [ ] In `src/cli/factories/commandFactory.ts`, add the import:
  ```typescript
  import { providerChoicesFor } from "../../lib/factories/mediaHandlerCatalog.js";
  ```
- [ ] In `CLICommandFactory.commonOptions`, update the `ttsProvider` entry's `choices` array (currently the stale `["google-ai", "vertex", "openai-tts", "elevenlabs", "azure-tts"]`) to `choices: providerChoicesFor("tts") as string[],`.
- [ ] Update the `sttProvider` entry's `choices` array (currently `["whisper", "deepgram", "google-stt", "azure-stt"]`) to `choices: providerChoicesFor("stt") as string[],`.
- [ ] Add a `choices: providerChoicesFor("video") as string[],` line to the `videoProvider` entry (which currently has only a `description:` field).
- [ ] Add a `choices: providerChoicesFor("avatar") as string[],` line to the `avatarProvider` entry (currently `description:`-only).
- [ ] Add a `choices: providerChoicesFor("music") as string[],` line to the `musicProvider` entry (currently `description:`-only).
      Since `CLICommandFactory.commonOptions` is a `private static readonly` object literal evaluated once at class-definition time (module load), and `mediaHandlerCatalog.ts` exports plain constant data with no async initialization, calling `providerChoicesFor(...)` inline in the object literal is safe and does not need to move into a getter or constructor.
- [ ] Run the test and verify it passes: `npx tsx test/continuous-test-suite-media-handler-catalog.ts` — expect `RESULT: PASS`.
- [ ] Run `pnpm run check` and `pnpm run lint` — fix any errors.
- [ ] Run `pnpm run build:cli` and smoke-test: `pnpm run build:cli && node dist/cli/index.js generate --help` — confirm the help text lists the video/avatar/music provider choices (spot-check the output rather than asserting on it programmatically, since CLI `--help` formatting is not part of this suite's contract).
- [ ] Commit: `git add src/cli/factories/commandFactory.ts test/continuous-test-suite-media-handler-catalog.ts && git commit -m "refactor(cli): derive --*-provider choices from mediaHandlerCatalog"`

---

### Task 18: Result-type dedup — `MediaGenerationOutputs`

**Files:**

- `src/lib/types/generate.ts`
- `src/lib/types/cli.ts`
- `test/type-checks/media-generation-outputs.ts` (new — compile-time characterization check, not a runtime suite)

**Interfaces:**

```typescript
export type MediaGenerationOutputs = {
  audio?: TTSResult;
  video?: VideoGenerationResult;
  avatar?: AvatarResult;
  music?: MusicResult;
  ppt?: PPTGenerationResult;
  imageOutput?: { base64: string; savedPath?: string } | null;
};
```

`GenerateResult`, `TextGenerationResult`, and `CliGenerateResult` each intersect `MediaGenerationOutputs &` at their opening declaration instead of redeclaring the six fields individually.

This is a pure compile-time type refactor with no runtime behavior, so the "TDD" step here is a compile-time characterization check rather than a runtime red/green test: a small file that constructs literal objects satisfying each of the three result types (including their media fields), which must compile both BEFORE and AFTER the refactor — proving the consolidation preserves the exact same consuming shape. This file is a type-check fixture, not a `defineSuite` runtime suite, and is not wired into any `test:` script; it exists purely to be caught by `pnpm run check`.

- [ ] Write the compile-time characterization fixture. Create `test/type-checks/media-generation-outputs.ts`:

  ```typescript
  /**
   * Compile-time characterization check for the GenerateResult /
   * TextGenerationResult / CliGenerateResult media-field consolidation
   * (see MediaGenerationOutputs in src/lib/types/generate.ts). Not a runtime
   * test — this file exists only to be type-checked by `pnpm run check`.
   * If it fails to compile, the consolidation changed the externally
   * consumable shape of one of these three result types.
   */
  import type {
    GenerateResult,
    TextGenerationResult,
    CliGenerateResult,
  } from "../../src/lib/types/index.js";

  const generateResult: GenerateResult = {
    content: "hello",
    audio: { buffer: Buffer.from(""), format: "mp3", size: 0 },
    video: { data: Buffer.from(""), format: "mp4", metadata: {} },
    avatar: { data: Buffer.from(""), format: "mp4", metadata: {} },
    music: { data: Buffer.from(""), format: "mp3", metadata: {} },
    ppt: { filePath: "x.pptx", totalSlides: 1 },
    imageOutput: { base64: "abc", savedPath: "/tmp/x.png" },
  };

  const textGenerationResult: TextGenerationResult = {
    content: "hello",
    audio: { buffer: Buffer.from(""), format: "mp3", size: 0 },
    transcription: { text: "hi", language: "en" },
    video: { data: Buffer.from(""), format: "mp4", metadata: {} },
    avatar: { data: Buffer.from(""), format: "mp4", metadata: {} },
    music: { data: Buffer.from(""), format: "mp3", metadata: {} },
    ppt: { filePath: "x.pptx", totalSlides: 1 },
    imageOutput: { base64: "abc" },
  };

  const cliGenerateResult: CliGenerateResult = {
    success: true,
    content: "hello",
    audio: { buffer: Buffer.from(""), format: "mp3", size: 0 },
    video: { data: Buffer.from(""), format: "mp4", metadata: {} },
    avatar: { data: Buffer.from(""), format: "mp4", metadata: {} },
    music: { data: Buffer.from(""), format: "mp3", metadata: {} },
    ppt: { filePath: "x.pptx", totalSlides: 1 },
    imageOutput: { base64: "abc", savedPath: "/tmp/x.png" },
  };

  // Referenced so eslint/tsc do not flag them as unused.
  export { generateResult, textGenerationResult, cliGenerateResult };
  ```

  Adjust the literal field values for `video`/`avatar`/`music`/`ppt`/`transcription` to match each type's ACTUAL minimal required shape as declared in `src/lib/types/multimodal.ts`, `src/lib/types/avatar.js`, `src/lib/types/music.js`, `src/lib/types/ppt.js`, `src/lib/types/stt.js` at edit time — if any of those types require additional mandatory fields beyond what's sketched above, add them so this fixture compiles cleanly against today's field shapes.

- [ ] Run `pnpm run check` and confirm this fixture compiles cleanly against the CURRENT (pre-refactor) type definitions — this is the "before" baseline proving the fixture accurately exercises today's shape.
- [ ] In `src/lib/types/generate.ts`, add `MediaGenerationOutputs` immediately before the `GenerateResult` type declaration:
  ```typescript
  /**
   * Media-generation output fields shared verbatim across GenerateResult,
   * TextGenerationResult, and (in src/lib/types/cli.ts) CliGenerateResult.
   * Each of those three types intersects this rather than redeclaring the
   * same six fields three times.
   */
  export type MediaGenerationOutputs = {
    /** Text-to-Speech audio result (see TTSProcessor.synthesize()). */
    audio?: TTSResult;
    /** Video generation result (present when output.mode is "video"). */
    video?: VideoGenerationResult;
    /** Avatar (talking-head) generation result (output.mode "avatar"). */
    avatar?: AvatarResult;
    /** Music generation result (output.mode "music"). */
    music?: MusicResult;
    /** PowerPoint generation result (output.mode "ppt"). */
    ppt?: PPTGenerationResult;
    /** Image generation output. `savedPath` is only set by the CLI, which writes the file to disk. */
    imageOutput?: { base64: string; savedPath?: string } | null;
  };
  ```
- [ ] Change the `GenerateResult` type's opening declaration from `export type GenerateResult = {` to `export type GenerateResult = MediaGenerationOutputs & {`. Then search within `GenerateResult`'s body for the field block starting at `audio?: TTSResult;` (~line 946 today) through `imageOutput?: { base64: string } | null; // Standard format for image generation` (~line 997) — including any preceding JSDoc comments for each of those six fields — and delete that entire span, since those fields now come from the intersected `MediaGenerationOutputs`. Everything before and after that span (all of `GenerateResult`'s other unique fields — `provider?`, `model?`, `finishReason?`, `streamingMetadata`, `workflow`, etc.) is untouched.
- [ ] Change `TextGenerationResult`'s opening declaration from `export type TextGenerationResult = {` to `export type TextGenerationResult = MediaGenerationOutputs & {`. Delete its own duplicate field lines `audio?: TTSResult;`, `video?: VideoGenerationResult;`, `avatar?: AvatarResult;`, `music?: MusicResult;`, `ppt?: PPTGenerationResult;`, `imageOutput?: { base64: string } | null;` (with their preceding comments) from its body. Keep `transcription?: STTResult;` — that field is unique to `TextGenerationResult` and is NOT part of `MediaGenerationOutputs` (STT is an input-side capability, not an output-mode result the other two types share).
- [ ] In `src/lib/types/cli.ts`, import `MediaGenerationOutputs` from the barrel (per repo rule 13, barrel-only internal type imports — do not import directly from `./generate.js`):
  ```typescript
  import type { MediaGenerationOutputs } from "../types/index.js";
  ```
  (Adjust the relative path to match this file's actual location relative to the barrel — `src/lib/types/cli.ts` importing its own sibling barrel `src/lib/types/index.js` should use `"./index.js"`, not `"../types/index.js"`; use whichever relative form is consistent with this file's other internal type imports, since files inside `src/lib/types/` are exempt from the "must import from the barrel" restriction per rule 13 and may import directly from `./generate.js` instead if that's the file's existing convention — check the top of `cli.ts` for its existing import style before choosing.)
  Change `CliGenerateResult`'s opening declaration from `export type CliGenerateResult = CommandResult & {` to `export type CliGenerateResult = CommandResult & MediaGenerationOutputs & {`. Delete its own duplicate field lines `audio?: TTSResult;`, `video?: VideoGenerationResult;`, `avatar?: AvatarResult;`, `music?: MusicResult;`, `ppt?: PPTGenerationResult;`, and the `imageOutput?: { base64: string; savedPath?: string; } | null;` block (with their preceding comments) from its body — note `CliGenerateResult`'s `imageOutput` already included `savedPath`, matching `MediaGenerationOutputs`'s shape exactly, so no widening is needed on this side.
- [ ] Run `pnpm run check` again and confirm `test/type-checks/media-generation-outputs.ts` STILL compiles cleanly — this is the "after" proof that the intersection-based consolidation preserves the exact same consuming shape for all three result types.
- [ ] Run `pnpm run lint` — fix any errors (in particular, confirm no file outside `src/lib/types/` was left importing `MediaGenerationOutputs` from anywhere other than the barrel, per rule 13).
- [ ] Run `pnpm run build` to confirm the wider type graph compiles.
- [ ] Commit: `git add src/lib/types/generate.ts src/lib/types/cli.ts test/type-checks/media-generation-outputs.ts && git commit -m "refactor(types): consolidate GenerateResult/TextGenerationResult/CliGenerateResult media fields into MediaGenerationOutputs"`

---

### Task 19: Cross-registry name-collision guard

**Files:**

- `test/continuous-test-suite-media-registry-collisions.ts` (new)
- `package.json` (new script)

**Interfaces:** none — this is a test-only task, sequenced after Task 15 since it exercises `VideoProcessor.generate`'s bag form.

The same key ("replicate") resolves to four different classes across four different registries: `ReplicateProvider` (LLM/image, via `ProviderFactory` — out of scope, already covered elsewhere), `ReplicateVideoHandler` (video), `ReplicateMusic` (music, alias `"musicgen"`), `ReplicateAvatar` (avatar, alias `"musetalk"`). This task adds an explicit, permanent regression guard so a future refactor cannot accidentally cross-wire these registries (e.g. a video handler accidentally landing in the music registry under "replicate").

- [ ] Write the guard test. Create `test/continuous-test-suite-media-registry-collisions.ts`:

  ```typescript
  #!/usr/bin/env tsx
  /**
   * Continuous Test Suite: cross-registry "replicate" collision guard (no API).
   *
   * "replicate" is a valid key in four independent registries (LLM/image via
   * ProviderFactory, Video, Music, Avatar), each resolving to a DIFFERENT
   * handler class. This suite makes that explicit and pins it: registering a
   * stub under "replicate" in one media registry must never be visible from,
   * or shadow, "replicate" in another.
   *
   * Run: npx tsx test/continuous-test-suite-media-registry-collisions.ts
   */
  import { defineSuite, assert, assertEqual } from "./helpers/harness.js";
  import { VideoProcessor } from "../src/lib/utils/videoProcessor.js";
  import { MusicProcessor } from "../src/lib/utils/musicProcessor.js";
  import { AvatarProcessor } from "../src/lib/utils/avatarProcessor.js";
  import type {
    VideoHandler,
    MusicHandler,
    AvatarHandler,
  } from "../src/lib/types/index.js";

  const { test, runSuite } = defineSuite(
    "Media registry 'replicate' collision guard (unit)",
  );

  const KEY = "replicate";

  await test("registering distinct 'replicate' handlers per registry keeps each registry's own class intact", async () => {
    VideoProcessor.clearHandlers();
    MusicProcessor.clearHandlers();
    AvatarProcessor.clearHandlers();

    let videoCalls = 0;
    let musicCalls = 0;
    let avatarCalls = 0;

    const videoHandler = {
      isConfigured: () => true,
      generate: async () => {
        videoCalls++;
        return { data: Buffer.from("video"), format: "mp4", metadata: {} };
      },
    } as unknown as VideoHandler;

    const musicHandler = {
      isConfigured: () => true,
      generate: async () => {
        musicCalls++;
        return { data: Buffer.from("music"), format: "mp3", metadata: {} };
      },
    } as unknown as MusicHandler;

    const avatarHandler = {
      isConfigured: () => true,
      generate: async () => {
        avatarCalls++;
        return { data: Buffer.from("avatar"), format: "mp4", metadata: {} };
      },
    } as unknown as AvatarHandler;

    VideoProcessor.registerHandler(KEY, videoHandler);
    MusicProcessor.registerHandler(KEY, musicHandler);
    AvatarProcessor.registerHandler(KEY, avatarHandler);

    // Music and Avatar expose getHandler() publicly — assert identity directly.
    assertEqual(
      MusicProcessor.getHandler(KEY),
      musicHandler,
      "MusicProcessor's 'replicate' resolves to the music-registered instance",
    );
    assertEqual(
      AvatarProcessor.getHandler(KEY),
      avatarHandler,
      "AvatarProcessor's 'replicate' resolves to the avatar-registered instance",
    );

    // VideoProcessor.getHandler() is deliberately private — assert identity
    // indirectly by dispatching through the bag-form generate() and counting
    // which stub's generate() actually ran.
    await VideoProcessor.generate(KEY, {
      image: Buffer.from("img"),
      prompt: "p",
    });
    assertEqual(
      videoCalls,
      1,
      "VideoProcessor's 'replicate' dispatched to the video-registered instance",
    );

    // Dispatching through Music/Avatar must not have touched the video stub,
    // and vice versa — proves the three registries are fully independent
    // rather than one silently overwriting or reading through another.
    await MusicProcessor.generate(KEY, { prompt: "m" });
    await AvatarProcessor.generate(KEY, { prompt: "a" });
    assertEqual(
      videoCalls,
      1,
      "video stub was not re-invoked by music/avatar dispatch",
    );
    assertEqual(
      musicCalls,
      1,
      "music stub invoked exactly once, by MusicProcessor only",
    );
    assertEqual(
      avatarCalls,
      1,
      "avatar stub invoked exactly once, by AvatarProcessor only",
    );
  });

  await test("alias keys resolve within their own registry only ('musicgen' is music-only, 'musetalk' is avatar-only)", () => {
    MusicProcessor.clearHandlers();
    AvatarProcessor.clearHandlers();
    const musicHandler = {
      isConfigured: () => true,
      generate: async () => ({
        data: Buffer.from(""),
        format: "mp3",
        metadata: {},
      }),
    } as unknown as MusicHandler;
    MusicProcessor.registerHandler("musicgen", musicHandler);
    assert(
      MusicProcessor.supports("musicgen"),
      "musicgen resolves in MusicProcessor",
    );
    assertEqual(
      AvatarProcessor.supports("musicgen"),
      false,
      "musicgen is not accidentally visible in AvatarProcessor",
    );
    assertEqual(
      VideoProcessor.supports("musicgen"),
      false,
      "musicgen is not accidentally visible in VideoProcessor",
    );
  });

  await runSuite();
  ```

- [ ] Run it against the code as it stands after Task 15 and verify it currently passes: `npx tsx test/continuous-test-suite-media-registry-collisions.ts` — expect `RESULT: PASS`. Since `HandlerRegistry` instances are already per-processor-class-instance isolated (confirmed by Task 1's own "two independent instances do not share state" test), this suite is expected to pass on first run; its value is as a permanent regression pin, not as a bug it currently catches.
- [ ] Sanity-check the harness per this plan's mandatory break-one-assertion step: temporarily change the `assertEqual(videoCalls, 1, ...)` assertion after the music/avatar dispatch calls to expect `2` instead of `1`, run the suite, confirm it reports `✗` and exits non-zero (not `⊘`), then revert the change.
- [ ] Add `"test:media-registry-collisions": "npx tsx test/continuous-test-suite-media-registry-collisions.ts",` to `package.json`.
- [ ] Run `pnpm run check` and `pnpm run lint` — fix any errors.
- [ ] Commit: `git add test/continuous-test-suite-media-registry-collisions.ts package.json && git commit -m "test(media): guard against cross-registry 'replicate' key collisions"`

---

## Verification Checklist

- [ ] `pnpm run check` passes with zero errors.
- [ ] `pnpm run lint` passes with zero errors (custom ESLint rules for repo rules 2, 7-13 all clean; `no-restricted-syntax` clean for rule 14).
- [ ] `pnpm run build` passes (SDK + CLI).
- [ ] Every new no-API suite passes standalone: `pnpm run test:handler-registry`, `pnpm run test:tts:unit`, `pnpm run test:stt:unit`, `pnpm run test:realtime:unit`, `pnpm run test:music:unit`, `pnpm run test:avatar:unit`, `pnpm run test:video-generation:unit`, `pnpm run test:media-handler-catalog`, `pnpm run test:video-handler-registration`, `pnpm run test:media-registration-wiring`, `pnpm run test:resolve-request-kind`, `pnpm run test:media-registry-collisions`.
- [ ] `pnpm test` (the main orchestrator) still exits 0.
- [ ] `pnpm run test:multimodal` (which chains `test:tts:unit` among others) still exits 0.
- [ ] `pnpm run test:media` and `pnpm run test:tts` (the pre-existing live suites) still exit 0 or SKIP gracefully without API keys — no new FAILs introduced.
- [ ] Every one of the six processors (TTS, STT, Realtime, Video, Music, Avatar) has exactly one `Map`-backed registry internally, composed via `HandlerRegistry<THandler>` — grep confirms no processor still declares its own `private static readonly handlers = new Map<...>` field.
- [ ] `grep -rn "IMAGE_GENERATION_MODELS" src/lib/core/baseProvider.ts` returns nothing.
- [ ] `grep -n "^registerDefault" src/lib/voice/index.ts src/lib/music/index.ts src/lib/avatar/index.ts src/lib/adapters/video/index.ts` shows only `export function` declaration lines — no bare module-scope invocation lines remain.
- [ ] `providerRegistry.ts`'s six former hand-written registration blocks are each reduced to a call into their ecosystem's `registerDefault*Handlers()`.
- [ ] `resolveRequestKind()` is the only place `output.mode`/`output.format`/`tts.enabled`/`isImageGenerationModel` are combined into a routing decision — both `neurolink.ts` and `baseProvider.ts` call it rather than re-deriving the logic inline.
- [ ] `VideoProcessor.generate` and its one caller (`baseProvider.ts`'s `handleVideoGeneration`) both use the bag-form signature; `VideoHandler.generate`'s own declared type is unchanged.
- [ ] CLI `--tts-provider`, `--stt-provider`, `--video-provider`, `--avatar-provider`, `--music-provider` all have `choices` arrays sourced from `mediaHandlerCatalog.ts`.
- [ ] `GenerateResult`, `TextGenerationResult`, `CliGenerateResult` each intersect `MediaGenerationOutputs` rather than redeclaring the six media fields individually; `test/type-checks/media-generation-outputs.ts` compiles.
- [ ] `baseProvider.ts`'s `handleVideoGeneration` sources its default video provider from `defaultProviderFor("video")`, not a hardcoded `"vertex"` string literal.
- [ ] The cross-registry "replicate" collision guard suite passes and was sanity-checked with a deliberate break.

## Risks & Rollback

- **Risk: the dual-registration removal (Tasks 10-11) creates a window where a media handler is unregistered.** Between Task 10 (removing the ecosystem barrels' auto-run side effects) and Task 11 (wiring `providerRegistry.ts` to call them explicitly) landing, any code path that imports `voice/index.ts`/`music/index.ts`/`avatar/index.ts` directly for its side effect (rather than going through `ProviderRegistry.registerAllProviders()`) would silently stop getting handlers registered. Mitigation: Tasks 10 and 11 are sequenced back-to-back and each has its own commit — if a consumer outside the six processors turns out to rely on the import-side-effect, `git revert` Task 10's commit alone restores the auto-run behavior without touching Task 11's `providerRegistry.ts` changes (Task 11's calls into `registerDefault*Handlers()` remain correct either way, since those functions are idempotent).
- **Risk: `ProviderRegistry.realtimeRegistration`'s failure-message text becomes coarser.** Task 11's reconstruction of the realtime outcomes report loses the original per-handler constructor error message in favor of a generic `"not registered (see debug log for details)"` sentinel. Any external caller string-matching on the OLD specific error text (rather than just checking `=== "ok"`) would break. Mitigation: this is called out explicitly in Task 11's own inline code comment; if a real caller is found to depend on the old text, the fix is to have `registerDefaultRealtimeHandlers()` return a `Record<string, "ok" | string>` outcomes map instead of `void`, which is a larger, additive signature change scoped to a follow-up rather than this plan.
- **Risk: `VideoProcessor.generate`'s signature change is a breaking change for any external SDK consumer calling it directly.** `VideoProcessor` is exported from the package (via `src/lib/utils/videoProcessor.ts` and re-exported through `src/lib/adapters/video/index.ts`), so a consumer calling `VideoProcessor.generate(provider, image, prompt, options, region)` positionally would break at compile time (TypeScript) or receive `options.image`/`options.prompt` as `undefined` at runtime (JavaScript, unchecked). Mitigation: this is a deliberate, scoped exception to "public static APIs preserved" — flagged explicitly in this plan's scope (item 4, "handler signature normalization") as a signature change bounded to `VideoProcessor.generate` specifically, not `VideoHandler.generate` (the actually-implemented-by-provider-classes interface, which stays unchanged). If backward compatibility for the old positional call is required, a follow-up could add a runtime arity-detecting overload; this plan does not do so since the scope explicitly calls for the bag-form migration.
- **Risk: `MediaGenerationOutputs`'s front-intersection could shift field declaration order in editor tooltips/generated docs.** TypeScript intersections don't guarantee visual field ordering matches declaration order in all tooling. Mitigation: purely cosmetic — the compile-time characterization fixture (Task 18) proves the consuming shape (which fields exist, with which types) is unchanged; ordering is not part of the public contract.
- **Rollback:** every task is its own commit; `git revert <sha>` on any single task's commit is safe in isolation for Tasks 1-9, 12, 16-19 (additive or narrowly-scoped). Tasks 10-11 should be reverted together (see risk above) if reverted at all. Tasks 13-14 (wiring) can each be reverted independently of one another since they touch different files, but both depend on Task 12 (`resolveRequestKind`) remaining in place.

## Out of Scope

- Making media handlers extend `BaseProvider` — a deliberate non-goal; the six media-handler ecosystems have a fundamentally different contract (single-shot generate/synthesize/transcribe vs. `BaseProvider`'s full generate/stream/tool-loop surface) and unifying them is not part of this plan.
- Image providers — already served by the main `ProviderFactory`/`ProviderRegistry` pattern; out of scope here.
- Proxy — not addressed by any current plan; tracked only in the roadmap notes (see `docs/superpowers/plans/2026-08-15-00-roadmap.md`).
- Fixing `isImageGenerationModel` dispatch-site correctness itself — that is plan 01's scope (Tier A bug fixes); this plan's `resolveRequestKind()` consumes the existing, already-correct `isImageGenerationModel()` helper rather than re-deriving or re-fixing its boundary-matching logic.
- The pure-data provider-descriptor pattern for text/image providers (`providerDescriptors.ts`) — that is plan 04's scope; this plan only mirrors its shape for media handlers.
