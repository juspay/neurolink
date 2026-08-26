#!/usr/bin/env tsx
/**
 * Continuous Test Suite: AvatarProcessor, driven through the public
 * generate() surface (Rule 15 — tests are end-to-end only).
 *
 * generate({ output: { mode: "avatar", avatar: { provider, image, audio|text } } })
 * dispatches straight into AvatarProcessor.generate() from
 * generateWithAvatar() in neurolink.ts — BEFORE any provider/LLM is
 * constructed. No API key, no network call, no fetch mocking is needed:
 * every test below is a real call to `new NeuroLink().generate(...)`.
 *
 * AvatarProcessor.registerHandler() / clearHandlers() appear ONLY as test
 * setup/teardown, to install a synthetic in-process handler under a
 * synthetic provider name and to restore the registry afterward. Every
 * assertion is against the GenerateResult generate() returns, or the error
 * it throws — never against AvatarProcessor's registry state directly.
 *
 * The previous version of this suite claimed "generate() has no
 * options-surface hook to inject a stub" and called AvatarProcessor's
 * registry statics (supports/getHandler/listProviders/generate) directly as
 * the test subject. That claim was wrong: registerHandler() + a synthetic
 * provider name IS the injection hook — passing that same name as
 * `output.avatar.provider` routes the public call straight into the stub.
 *
 * Coverage carried over from the old suite, now observed through generate():
 *  - dispatch: the registered handler runs, and GenerateResult carries
 *    result.avatar / result.content / result.provider / result.model
 *  - validation: missing image / missing audio+text / missing
 *    output.avatar.provider are all rejected before any handler runs
 *  - an unregistered provider raises a typed error naming the provider
 *  - an unconfigured provider is rejected before generation
 *  - a handler failure is wrapped as a typed AvatarError, not leaked raw
 *  - provider-name lookup is case-insensitive
 *  - re-registering a provider replaces the previous handler (the later
 *    handler's output is what generate() returns)
 *  - clearHandlers() wiping the registry is observable as the same
 *    provider now raising PROVIDER_NOT_SUPPORTED, and restoring the
 *    registration makes generate() dispatch again
 *
 * Two behaviours from the old suite have no public-surface equivalent and
 * are intentionally NOT carried over (coverage gap, not an oversight):
 *  - registerHandler()'s own input validation (throws on an empty provider
 *    name / undefined handler). registerHandler() is called only by
 *    provider factories at startup with fixed, known-good arguments — a
 *    generate() caller can never reach this code path, so there is no
 *    public call that exercises it.
 *  - listProviders() enumeration. No field on GenerateResult surfaces the
 *    full list of registered avatar providers; the closest public
 *    equivalent — whether a given provider is usable — is already covered
 *    by the dispatch / unregistered-provider tests above.
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
  NeuroLink,
  AvatarProcessor,
  AvatarError,
  AVATAR_ERROR_CODES,
} from "../dist/index.js";
import type {
  AvatarHandler,
  AvatarResult,
  GenerateOptions,
} from "../dist/index.js";

const { test, runSuite } = defineSuite("AvatarProcessor (via generate())", {
  offline: true,
});

const IMAGE = Buffer.from("fake-portrait-bytes");
const AUDIO = Buffer.from("fake-audio-bytes");

function makeStubHandler(
  handlerOverrides: Partial<AvatarHandler> = {},
  resultOverrides: Partial<AvatarResult> = {},
): {
  handler: AvatarHandler;
  calls: Array<{ options: unknown }>;
} {
  const calls: Array<{ options: unknown }> = [];
  const handler: AvatarHandler = {
    isConfigured: () => true,
    generate: async (options): Promise<AvatarResult> => {
      calls.push({ options });
      return {
        buffer: Buffer.from("fake-video"),
        format: "mp4",
        size: 10,
        duration: 10,
        ...resultOverrides,
      };
    },
    ...handlerOverrides,
  };
  return { handler, calls };
}

const nl = new NeuroLink();

/** Drive the same public path a real caller uses: generate() with output.mode="avatar". */
function generateAvatar(provider: string, avatar: Record<string, unknown>) {
  return nl.generate({
    output: { mode: "avatar", avatar: { provider, ...avatar } },
  } as unknown as GenerateOptions);
}

await runSuite(async () => {
  // Snapshot whatever was registered before this suite ran (normally
  // nothing, in this suite's own process) so teardown can restore it
  // exactly, rather than leaving the process-wide registry in whatever
  // state our own tests (including the clearHandlers() test) left it in.
  const registrySnapshot = AvatarProcessor.listProviders().map(
    (name) => [name, AvatarProcessor.getHandler(name)!] as const,
  );

  try {
    await test("generate() dispatches to the registered handler and returns an avatar GenerateResult", async () => {
      const provider = "avatar-unit-dispatch";
      const { handler, calls } = makeStubHandler();
      AvatarProcessor.registerHandler(provider, handler);

      const result = await generateAvatar(provider, {
        image: IMAGE,
        audio: AUDIO,
      });

      assertEqual(calls.length, 1, "handler invoked exactly once");
      assert(
        Buffer.isBuffer(result.avatar?.buffer),
        "result.avatar carries the video buffer",
      );
      assertEqual(
        result.avatar?.size,
        10,
        "result.avatar.size is forwarded from the handler",
      );
      assertIncludes(
        result.content,
        "Avatar generated",
        "result.content summarizes the avatar generation",
      );
      assertEqual(
        result.provider,
        provider,
        "result.provider is the avatar provider",
      );
      assertEqual(
        result.model,
        provider,
        "result.model falls back to the provider name",
      );
    });

    await test("a missing image is rejected before any handler runs", async () => {
      const provider = "avatar-unit-no-image";
      const { handler, calls } = makeStubHandler();
      AvatarProcessor.registerHandler(provider, handler);

      let code: string | undefined;
      try {
        await generateAvatar(provider, { audio: AUDIO });
      } catch (err) {
        code = err instanceof AvatarError ? err.code : undefined;
      }
      assertEqual(
        code,
        AVATAR_ERROR_CODES.IMAGE_REQUIRED,
        "a missing image raises AVATAR_IMAGE_REQUIRED",
      );
      assertEqual(calls.length, 0, "handler was never invoked");
    });

    await test("missing both audio and text is rejected before any handler runs", async () => {
      const provider = "avatar-unit-no-audio-or-text";
      const { handler, calls } = makeStubHandler();
      AvatarProcessor.registerHandler(provider, handler);

      let code: string | undefined;
      try {
        await generateAvatar(provider, { image: IMAGE });
      } catch (err) {
        code = err instanceof AvatarError ? err.code : undefined;
      }
      assertEqual(
        code,
        AVATAR_ERROR_CODES.INVALID_INPUT,
        "missing audio and text raises AVATAR_INVALID_INPUT",
      );
      assertEqual(calls.length, 0, "handler was never invoked");
    });

    await test("text without audio is accepted (TTS is handled upstream)", async () => {
      const provider = "avatar-unit-text-only";
      const { handler, calls } = makeStubHandler();
      AvatarProcessor.registerHandler(provider, handler);

      const result = await generateAvatar(provider, {
        image: IMAGE,
        text: "hello there",
      });
      assertEqual(calls.length, 1, "handler invoked once for text-only input");
      assert(
        Buffer.isBuffer(result.avatar?.buffer),
        "an avatar result is still returned",
      );
    });

    await test("output.avatar.provider is required", async () => {
      let threw = false;
      let message = "";
      try {
        await nl.generate({
          output: {
            mode: "avatar",
            avatar: { image: IMAGE, audio: AUDIO },
          },
        } as unknown as GenerateOptions);
      } catch (err) {
        threw = true;
        message = err instanceof Error ? err.message : "";
      }
      assert(threw, "a missing provider is rejected");
      assertIncludes(
        message,
        "output.avatar.provider",
        "the error names the missing field",
      );
    });

    await test("an unsupported provider raises a typed error naming the provider", async () => {
      const provider = "avatar-unit-unregistered";
      let code: string | undefined;
      let message = "";
      try {
        await generateAvatar(provider, { image: IMAGE, audio: AUDIO });
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
        provider,
        "the error names the provider that was asked for",
      );
    });

    await test("an unconfigured provider is rejected before generation", async () => {
      const provider = "avatar-unit-not-configured";
      const { handler, calls } = makeStubHandler({
        isConfigured: () => false,
      });
      AvatarProcessor.registerHandler(provider, handler);

      let code: string | undefined;
      try {
        await generateAvatar(provider, { image: IMAGE, audio: AUDIO });
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

    await test("a handler failure surfaces as a typed AvatarError, not a leaked raw error", async () => {
      const provider = "avatar-unit-failing-handler";
      const { handler } = makeStubHandler({
        generate: async () => {
          throw new Error("upstream vendor exploded");
        },
      });
      AvatarProcessor.registerHandler(provider, handler);

      let isTyped = false;
      let message = "";
      try {
        await generateAvatar(provider, { image: IMAGE, audio: AUDIO });
      } catch (err) {
        isTyped = err instanceof AvatarError;
        message = err instanceof Error ? err.message : "";
      }
      assert(isTyped, "a raw handler error is wrapped rather than leaked");
      assertIncludes(
        message,
        "upstream vendor exploded",
        "the underlying reason is preserved in the wrapped error",
      );
    });

    await test("provider-name lookup is case-insensitive", async () => {
      const mixedCase = "Avatar-Unit-Mixed-Case";
      const { handler, calls } = makeStubHandler();
      AvatarProcessor.registerHandler(mixedCase, handler);

      const result = await generateAvatar(mixedCase.toUpperCase(), {
        image: IMAGE,
        audio: AUDIO,
      });
      assertEqual(
        calls.length,
        1,
        "an uppercase provider name resolves to the lowercase-registered handler",
      );
      assert(
        Buffer.isBuffer(result.avatar?.buffer),
        "dispatch succeeded despite the case mismatch",
      );
    });

    await test("re-registering a provider replaces the previous handler", async () => {
      const provider = "avatar-unit-overwrite";
      const { handler: first } = makeStubHandler(
        {},
        { format: "webm", size: 111 },
      );
      const { handler: second } = makeStubHandler(
        {},
        { format: "mov", size: 222 },
      );
      AvatarProcessor.registerHandler(provider, first);
      AvatarProcessor.registerHandler(provider, second);

      const result = await generateAvatar(provider, {
        image: IMAGE,
        audio: AUDIO,
      });
      assertEqual(
        result.avatar?.size,
        222,
        "the later registration's handler ran, not the first",
      );
      assertEqual(
        result.avatar?.format,
        "mov",
        "the later registration's output is what generate() returned",
      );
    });

    await test("clearHandlers() makes a provider unreachable via generate(), and restoring it makes it dispatch again", async () => {
      const provider = "avatar-unit-clear-restore";
      const { handler } = makeStubHandler();
      AvatarProcessor.registerHandler(provider, handler);

      const before = await generateAvatar(provider, {
        image: IMAGE,
        audio: AUDIO,
      });
      assert(
        Buffer.isBuffer(before.avatar?.buffer),
        "sanity: dispatch works before clearing",
      );

      AvatarProcessor.clearHandlers();
      let codeAfterClear: string | undefined;
      try {
        await generateAvatar(provider, { image: IMAGE, audio: AUDIO });
      } catch (err) {
        codeAfterClear = err instanceof AvatarError ? err.code : undefined;
      }
      assertEqual(
        codeAfterClear,
        AVATAR_ERROR_CODES.PROVIDER_NOT_SUPPORTED,
        "clearHandlers() wiped the registration — the provider is no longer reachable",
      );

      AvatarProcessor.registerHandler(provider, handler);
      const after = await generateAvatar(provider, {
        image: IMAGE,
        audio: AUDIO,
      });
      assert(
        Buffer.isBuffer(after.avatar?.buffer),
        "restoring the registration makes generate() dispatch again",
      );
    });
  } finally {
    // clearHandlers() above wipes the whole process-wide registry, not just
    // this suite's own providers — restore exactly what was there when the
    // suite started so nothing real (or belonging to another suite sharing
    // this process) is left disturbed.
    AvatarProcessor.clearHandlers();
    for (const [name, handler] of registrySnapshot) {
      AvatarProcessor.registerHandler(name, handler);
    }
  }
});
