#!/usr/bin/env tsx

/**
 * Continuous Test Suite — native-audio model-awareness on Vertex.
 *
 * Pins `supportsNativeAudio(provider, model)` (adapters/audioFormatSupport.ts)
 * and the three `messageBuilder.ts` call sites that gate on it. Before this
 * fix, `supportsNativeAudio` decided purely from the provider NAME, so
 * "vertex" always answered `true` — even for a Claude model, which Vertex
 * routes to `@anthropic-ai/vertex-sdk` (a transport that never reads an audio
 * part; see `executeNativeAnthropicStream`/`executeNativeAnthropicGenerate` in
 * `googleVertex/client.ts`, which build their user-content parts straight off
 * `options.input` and never mention `nativeAudioFiles`/`audioFiles` at all).
 *
 * ## Determinism exception (CLAUDE.md rule 15)
 *
 * `messageBuilder.ts`'s exports are internal — `supportsNativeAudio` and
 * `buildMultimodalMessagesArray` are not part of the public `NeuroLink`
 * surface and are not re-exported from `src/lib/index.ts` — so there is no
 * live call that can observe this gate directly.
 *
 * It gets sharper than "internal": for the real Vertex provider, this gate's
 * output is not even wired to the wire request. `GoogleVertexProvider`
 * overrides both `generate()` and `executeStream()` and never calls
 * `super.generate()`/reaches `BaseProvider`'s default message-building for
 * `generate()`; `stream()` calls `super.stream()`, whose early
 * multimodal-detection step (`BaseProvider.stream()`, "EARLY MULTIMODAL
 * DETECTION") does call `buildMessagesForStream()` → `buildMultimodalMessagesArray()`
 * — but only to check `hasVideoFrames(messages)` before routing to
 * `this.executeStream()`, which is Vertex's own override and rebuilds the
 * request from `options.input` directly, ignoring what was just built. So on
 * `release` today this gate's practical, verified effect for Vertex is:
 * avoiding a wasted `toProviderCompatibleAudio` transcode attempt (and a
 * misleading "added to content (native audio)" log line) during that
 * discarded pre-computation for a Claude model — not a change to what Claude
 * or Gemini actually receive, which Vertex's native SDK routing controls
 * independently of this file. See the PR description for the full trace.
 *
 * None of that is observable through a live provider response either way, so
 * this suite asserts directly on `supportsNativeAudio`'s return value and on
 * the shape of `buildMultimodalMessagesArray`'s output (presence/absence of a
 * `{ type: "file", mediaType: "audio/…" }` part) — the layer where the fix's
 * effect is unambiguous. `test/continuous-test-suite-bugfixes.ts` sets the
 * precedent for exactly this ("MessageBuilder #284: audioFiles/videoFiles
 * content actually reaches the built message").
 *
 * Run with: npx tsx test/continuous-test-suite-native-audio-model-aware.ts
 */

import type { MultimodalAudioEntry } from "../src/lib/types/index.js";
import { supportsNativeAudio } from "../src/lib/adapters/audioFormatSupport.js";
import { buildMultimodalMessagesArray } from "../src/lib/utils/messageBuilder.js";
import { assert, defineSuite } from "./helpers/harness.js";

const { test, runSuite } = defineSuite("Native audio: Vertex model-awareness", {
  offline: true,
});

const CLAUDE_ON_VERTEX_MODEL = "claude-3-5-sonnet-v2@20241022";
const GEMINI_ON_VERTEX_MODEL = "gemini-2.0-flash";

/** Minimal, valid RIFF/WAVE header — `audio/wav` is natively accepted, so no ffmpeg transcode is triggered. */
const riffWaveBuffer = (): Buffer =>
  Buffer.concat([
    Buffer.from("RIFF"),
    Buffer.from([0, 0, 0, 0]),
    Buffer.from("WAVE"),
    Buffer.alloc(16),
  ]);

const audioEntry = (): MultimodalAudioEntry => ({
  buffer: riffWaveBuffer(),
  filename: "recording.wav",
  mimeType: "audio/wav",
});

const hasAudioFilePart = (messages: unknown): boolean => {
  const serialized = JSON.stringify(messages);
  return (
    serialized.includes('"type":"file"') &&
    /"mediaType":"audio\//.test(serialized)
  );
};

// ---------------------------------------------------------------------------
// supportsNativeAudio: pure decision function
// ---------------------------------------------------------------------------

await test("vertex + no model keeps today's behaviour (treated as Gemini)", async () => {
  assert(
    supportsNativeAudio("vertex") === true,
    "a caller that omits `model` on Vertex must still get native audio, matching pre-fix behaviour",
  );
});

await test("vertex + a Claude model does not get native audio", async () => {
  assert(
    supportsNativeAudio("vertex", CLAUDE_ON_VERTEX_MODEL) === false,
    `supportsNativeAudio("vertex", "${CLAUDE_ON_VERTEX_MODEL}") must be false — Claude-on-Vertex is routed to @anthropic-ai/vertex-sdk, which never reads an audio part`,
  );
});

await test("vertex + a Gemini model still gets native audio", async () => {
  assert(
    supportsNativeAudio("vertex", GEMINI_ON_VERTEX_MODEL) === true,
    `supportsNativeAudio("vertex", "${GEMINI_ON_VERTEX_MODEL}") must stay true — Gemini-on-Vertex accepts inline audio`,
  );
});

await test("the google-vertex / googlevertex aliases get the same Claude gate", async () => {
  assert(
    supportsNativeAudio("google-vertex", CLAUDE_ON_VERTEX_MODEL) === false,
    "google-vertex alias must gate a Claude model the same as vertex",
  );
  assert(
    supportsNativeAudio("googlevertex", CLAUDE_ON_VERTEX_MODEL) === false,
    "googlevertex alias must gate a Claude model the same as vertex",
  );
});

await test("vertex gates every id GoogleVertexProvider routes to Claude, not only `claude-` prefixes", async () => {
  // GoogleVertexProvider's isAnthropicModel is case-insensitive and matches
  // anywhere in the id. A stricter prefix test (startsWith("claude-")) called
  // these Gemini while Vertex sent them to Claude.
  for (const routedToClaude of [
    "Claude-Sonnet-4-5@20250929",
    "publishers/anthropic/models/claude-sonnet-4-5",
    "anthropic.claude-3-haiku",
  ]) {
    assert(
      supportsNativeAudio("vertex", routedToClaude) === false,
      `supportsNativeAudio("vertex", "${routedToClaude}") must be false — Vertex routes this id to Claude`,
    );
  }
});

await test("AI Studio / bare gemini aliases are unaffected by the Vertex gate", async () => {
  // AI Studio never serves Claude, so it must stay true regardless of the
  // model string — this proves the gate is scoped to the Vertex aliases
  // only, not to "any provider name that could theoretically front Claude".
  assert(
    supportsNativeAudio("google-ai-studio", CLAUDE_ON_VERTEX_MODEL) === true,
    "google-ai-studio must remain unaffected by the Vertex-specific gate",
  );
  assert(
    supportsNativeAudio("gemini", CLAUDE_ON_VERTEX_MODEL) === true,
    "the bare gemini alias must remain unaffected by the Vertex-specific gate",
  );
});

await test("an unrelated provider stays false, unchanged control", async () => {
  assert(
    supportsNativeAudio("openai", GEMINI_ON_VERTEX_MODEL) === false,
    "openai was never in NATIVE_AUDIO_PROVIDERS and must stay false",
  );
});

// ---------------------------------------------------------------------------
// buildMultimodalMessagesArray: the built message shape actually changes
// ---------------------------------------------------------------------------

await test("vertex + Claude model: an attached audio file produces no native audio part", async () => {
  const messages = await buildMultimodalMessagesArray(
    {
      input: {
        text: "what does this recording say?",
        nativeAudioFiles: [audioEntry()],
      },
    } as unknown as Parameters<typeof buildMultimodalMessagesArray>[0],
    "vertex",
    CLAUDE_ON_VERTEX_MODEL,
  );
  assert(
    !hasAudioFilePart(messages),
    "vertex+Claude must not carry a native audio part — before this fix it would have",
  );
});

await test("vertex + Gemini model: an attached audio file still produces a native audio part", async () => {
  const messages = await buildMultimodalMessagesArray(
    {
      input: {
        text: "what does this recording say?",
        nativeAudioFiles: [audioEntry()],
      },
    } as unknown as Parameters<typeof buildMultimodalMessagesArray>[0],
    "vertex",
    GEMINI_ON_VERTEX_MODEL,
  );
  assert(
    hasAudioFilePart(messages),
    "vertex+Gemini must keep delivering native audio, unchanged by this fix",
  );
});

await test("google-ai-studio: an attached audio file still produces a native audio part (unchanged)", async () => {
  const messages = await buildMultimodalMessagesArray(
    {
      input: {
        text: "what does this recording say?",
        nativeAudioFiles: [audioEntry()],
      },
    } as unknown as Parameters<typeof buildMultimodalMessagesArray>[0],
    "google-ai-studio",
    "gemini-2.0-flash",
  );
  assert(
    hasAudioFilePart(messages),
    "google-ai-studio must be unaffected by the Vertex-specific gate",
  );
});

await test("google-ai alias: an attached audio file still produces a native audio part (unchanged)", async () => {
  // Not "gemini": that alias is recognised by `supportsNativeAudio` (see
  // the pure-function test above) but is not a provider name
  // `ProviderImageAdapter.supportsVision` knows about, so it fails
  // `buildMultimodalMessagesArray`'s vision gate for a reason unrelated to
  // this fix — "google-ai" is the canonical name for the same family and
  // is fully supported end to end.
  const messages = await buildMultimodalMessagesArray(
    {
      input: {
        text: "what does this recording say?",
        nativeAudioFiles: [audioEntry()],
      },
    } as unknown as Parameters<typeof buildMultimodalMessagesArray>[0],
    "google-ai",
    "gemini-2.0-flash",
  );
  assert(
    hasAudioFilePart(messages),
    "the google-ai alias must be unaffected by the Vertex-specific gate",
  );
});

await runSuite();
