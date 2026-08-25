#!/usr/bin/env tsx
/**
 * Continuous Test Suite: resolveRequestKind (no API).
 *
 * The single decision function for "what kind of request is this" — used
 * by both neurolink.ts's maybeHandleEarlyGenerateResult and
 * baseProvider.ts's stream()/runGenerateInActiveContext, replacing the
 * previously duplicated inline mode-detection logic in each file.
 *
 * Rule-15 exception: `resolveRequestKind` is pure internal dispatch plumbing
 * — it is never exported from any package entry point (root, ./voice,
 * ./music, ./avatar, or any other subpath). `neurolink.ts` and
 * `baseProvider.ts` call it directly from `src/lib/core/`; there is no
 * shipped surface a live `generate()`/`stream()` call could isolate this
 * decision through without also depending on real provider behavior. This
 * file is listed in the `neurolink/e2e-tests-only` `allow` array in
 * eslint.config.js for that reason (same justification as
 * `continuous-test-suite-handler-registry.ts`: "no public surface at all").
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
  // NOTE: the plan's original fixture ("my-V_1-custom-finetune-without-
  // separator-suffixV_1X") contains an earlier, legitimately-bounded "V_1"
  // occurrence ("my-V_1-custom", hyphen-delimited on both sides), which
  // isImageGenerationModel's boundary-aware matcher correctly treats as a
  // real match — so that fixture actually resolves to "image", not "text".
  // Adjusted here to a fixture whose only "V_1" occurrence lacks a boundary
  // separator on either side, which is what this case is meant to exercise.
  assertEqual(
    resolveRequestKind({}, "my-custom-finetune-without-separator-suffixV_1X"),
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
