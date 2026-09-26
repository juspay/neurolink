#!/usr/bin/env tsx
/**
 * Continuous Test Suite: native video delivery.
 *
 * Covers VIDEO-007 (#421), VIDEO-013 (#439), VIDEO-014 (#444) and
 * VIDEO-019 (#463).
 *
 * ## Why this is not folded into continuous-test-suite-multimodal-sdk.ts
 *
 * Two reasons, and both matter.
 *
 * First, that suite builds its clip with `makeVideoFile`, which shells out to
 * ffmpeg and skips the whole group when ffmpeg is absent. Native delivery
 * exists precisely for the case where ffmpeg is absent — no binary, no
 * keyframes, and the video itself is the only visual content in the request —
 * so a suite that cannot run without ffmpeg cannot test it. Everything here
 * uses a committed 14 KB fixture instead and runs anywhere.
 *
 * Second, that suite's video assertions ask the model for the clip's pixel
 * resolution. That question is answered by the metadata summary
 * (`1920x1080 | avc | 30 fps`) that detection folds into the prompt text, so
 * it passes with zero frames and zero video attached — the exact trap
 * `adapters/audioFormatSupport.ts` documents for audio. The assertions here
 * are built the other way round: the fixture carries a spoken word, and
 * nothing in the metadata block or in a JPEG keyframe can convey it.
 *
 * ## The fixture
 *
 * `test/fixtures/media/sample-clip.mp4` — 3.6s, 160x120, H.264 + AAC. Three
 * solid colour segments (red, blue, green) and a voice saying "the secret
 * word is flamingo". The colours are readable from keyframes; the word is
 * readable only from the video's audio track. Asking for both in one prompt
 * makes a partial answer diagnostic rather than ambiguous.
 *
 * Live tests SKIP without credentials.
 *
 * Run: npx tsx test/continuous-test-suite-video-native.ts
 */

// See the multimodal-sdk suite for why: the tracked .mcp-config.json starts a
// filesystem server every NeuroLink instance would wait 60s on.
process.env.NEUROLINK_SKIP_MCP = "true";

import "dotenv/config";
import { existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import {
  assert,
  assertEqual,
  defineSuite,
  runCLI,
  Skip,
} from "./helpers/harness.js";
import {
  canDeliverVideoNatively,
  estimateVideoTokens,
  getVideoProviderConfig,
  isNativeVideoMimeType,
  NeuroLink,
  supportsNativeVideo,
  VIDEO_PROVIDER_CONFIGS,
} from "../dist/index.js";

const { test, runSuite } = defineSuite("Native video delivery");

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CLIP = path.join(HERE, "fixtures", "media", "sample-clip.mp4");

/** Gemini front end used for the live half. */
const NATIVE_PROVIDER = process.env.VIDEO_NATIVE_PROVIDER ?? "google-ai";
/** Frame-extraction provider used as the negative control. */
const FRAME_PROVIDER = process.env.VIDEO_FRAME_PROVIDER ?? "openai";

function hasGoogleKey(): boolean {
  return !!(process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY);
}

// ---------------------------------------------------------------------------
// The capability table, through the package's own exports
// ---------------------------------------------------------------------------

await test("the fixture is present and small enough to travel inline", () => {
  assert(existsSync(CLIP), "the committed video fixture must exist");
  const sizeMB = statSync(CLIP).size / (1024 * 1024);
  assert(
    sizeMB < 1,
    `the fixture must stay small enough to commit — measured ${sizeMB.toFixed(3)}MB`,
  );
});

await test("VIDEO_PROVIDER_CONFIGS describes both delivery modes", () => {
  const rows = Object.values(VIDEO_PROVIDER_CONFIGS);
  assert(rows.length > 0, "the capability table must not be empty");

  for (const [name, row] of Object.entries(VIDEO_PROVIDER_CONFIGS)) {
    // Every field the table promises, on every row — a partially-filled row
    // is how a caller ends up with `undefined` where it expected a ceiling.
    assertEqual(
      typeof row.supportsNativeVideo,
      "boolean",
      `supportsNativeVideo must be a boolean for ${name}`,
    );
    assertEqual(
      typeof row.maxSizeMB,
      "number",
      `maxSizeMB must be a number for ${name}`,
    );
    assertEqual(
      typeof row.maxDurationSec,
      "number",
      `maxDurationSec must be a number for ${name}`,
    );
    assertEqual(
      typeof row.supportsAudio,
      "boolean",
      `supportsAudio must be a boolean for ${name}`,
    );
    assert(
      row.recommendedFrameCount > 0,
      `recommendedFrameCount must be positive for ${name}`,
    );
    assert(
      row.apiType === "inline" || row.apiType === "frame-extraction",
      `apiType must name an implemented mechanism for ${name}`,
    );
    // The two must agree. A row claiming native video on the frame path (or
    // the reverse) would send the message builder and the cost estimator in
    // opposite directions.
    assertEqual(
      row.apiType === "inline",
      row.supportsNativeVideo,
      `apiType and supportsNativeVideo must agree for ${name}`,
    );
    // A ceiling on a provider that never receives bytes reads like a real
    // limit somebody could raise. It is 0 deliberately.
    if (!row.supportsNativeVideo) {
      assertEqual(
        row.maxSizeMB,
        0,
        `a frame-only provider must not advertise a size ceiling — ${name}`,
      );
    } else {
      assert(
        row.maxSizeMB > 0,
        `a native provider must advertise a size ceiling — ${name}`,
      );
    }
  }

  assert(
    rows.some((r) => r.supportsNativeVideo),
    "at least one provider must be on the native path",
  );
  assert(
    rows.some((r) => !r.supportsNativeVideo),
    "at least one provider must be on the frame path",
  );
});

await test("the getters answer for known and unknown providers", () => {
  assert(
    supportsNativeVideo("google-ai"),
    "Gemini AI Studio must be on the native path",
  );
  assert(supportsNativeVideo("vertex"), "Vertex must be on the native path");
  assert(
    !supportsNativeVideo("openai"),
    "OpenAI must not be on the native path",
  );

  // Case and surrounding whitespace are normalised: the provider string
  // reaching this table comes from a CLI flag as often as from code.
  assert(
    supportsNativeVideo("  GOOGLE-AI  "),
    "the lookup must normalise case and whitespace",
  );

  assert(
    getVideoProviderConfig("not-a-real-provider") === null,
    "an unlisted provider must return null rather than a default row",
  );
  assert(
    !supportsNativeVideo("not-a-real-provider"),
    "an unlisted provider must read as no native video",
  );
});

await test("Claude-on-Vertex is not reported as taking native video, despite sharing Vertex's provider alias", () => {
  // GoogleVertexProvider routes any model whose id contains "claude"
  // (case-insensitive) to the native Anthropic SDK, which never sees the
  // video part — see `isAnthropicModel` in
  // src/lib/providers/googleVertex/client.ts. The capability table is keyed
  // by provider name alone, so without the `model` parameter every one of
  // these reads exactly like a real Gemini-on-Vertex request.
  const claudeModel = "claude-sonnet-4-5@20250929";

  assert(
    !supportsNativeVideo("vertex", claudeModel),
    "Claude-on-Vertex must not be reported as taking native video",
  );
  // Mixed case, matching what a caller actually passes as a model id — the
  // underlying predicate must fold case the same way isAnthropicModel does.
  assert(
    !supportsNativeVideo("vertex", "Claude-Sonnet-4-5@20250929"),
    "the Claude check must be case-insensitive",
  );
  assert(
    !supportsNativeVideo("google-vertex", claudeModel),
    "every Vertex alias, not just the bare one, must resolve the same way",
  );

  const claudeConfig = getVideoProviderConfig("vertex", claudeModel);
  if (claudeConfig === null) {
    throw new Error(
      "Claude-on-Vertex must still resolve to a row (the frame-extraction one)",
    );
  }
  assertEqual(
    claudeConfig.apiType,
    "frame-extraction",
    "Claude-on-Vertex must resolve to the frame-extraction row, not Gemini's inline row",
  );

  // Unaffected traffic must not regress: a real Gemini-on-Vertex call (no
  // model, or an explicit Gemini model id) keeps the native row, and a
  // provider Vertex never proxies to Claude through is untouched by the
  // Claude check entirely.
  assert(
    supportsNativeVideo("vertex"),
    "omitting model must keep the prior, provider-only behaviour",
  );
  assert(
    supportsNativeVideo("vertex", "gemini-2.0-flash"),
    "a real Gemini-on-Vertex request must still be reported as native-video-capable",
  );
  assert(
    supportsNativeVideo("google-ai", claudeModel),
    "the Claude override is scoped to Vertex aliases only — AI Studio never proxies Claude models",
  );

  const clip = {
    buffer: Buffer.alloc(1024),
    filename: "clip.mp4",
    mimeType: "video/mp4",
  };
  const claudeDecision = canDeliverVideoNatively(
    "vertex",
    clip,
    0,
    claudeModel,
  );
  assertEqual(
    claudeDecision.deliver,
    false,
    "canDeliverVideoNatively must refuse a clip bound for Claude-on-Vertex",
  );
  assert(
    !!claudeDecision.reason,
    "the refusal must carry a reason the caller can log",
  );
  assertEqual(
    canDeliverVideoNatively("vertex", clip, 0, "gemini-2.0-flash").deliver,
    true,
    "the same clip must still be deliverable to a real Gemini-on-Vertex request",
  );
});

await test("estimateVideoTokens prices the two paths differently", () => {
  const seconds = 60;
  const native = estimateVideoTokens({
    provider: "google-ai",
    durationSec: seconds,
  });
  const frames = estimateVideoTokens({
    provider: "openai",
    durationSec: seconds,
    frameCount: 8,
  });

  assert(native > 0, "a native estimate must be positive");
  assert(frames > 0, "a frame estimate must be positive");
  // Not an arbitrary threshold: a minute of inline video is billed per
  // second, eight stills are billed per still. If these ever come out close,
  // one of the two formulas has stopped being applied.
  assert(
    native > frames * 2,
    "a minute of inline video must cost materially more than eight stills",
  );

  // Duration drives the native price; frames do not.
  assertEqual(
    estimateVideoTokens({
      provider: "google-ai",
      durationSec: seconds,
      frameCount: 99,
    }),
    native,
    "frameCount must not move a native estimate",
  );

  // A transcript adds to the frame price and is already included natively.
  assert(
    estimateVideoTokens({
      provider: "openai",
      durationSec: seconds,
      frameCount: 8,
      hasTranscription: true,
    }) > frames,
    "a transcript must add to a frame-path estimate",
  );

  assertEqual(
    estimateVideoTokens({ provider: "openai", durationSec: 0, frameCount: 0 }),
    0,
    "an empty request must cost nothing",
  );
});

await test("the delivery gate refuses for distinguishable reasons", () => {
  const small = {
    buffer: Buffer.alloc(1024),
    filename: "clip.mp4",
    mimeType: "video/mp4",
  };

  const ok = canDeliverVideoNatively("google-ai", small);
  assertEqual(ok.deliver, true, "a small mp4 must be deliverable to Gemini");

  const wrongProvider = canDeliverVideoNatively("openai", small);
  assertEqual(
    wrongProvider.deliver,
    false,
    "a frame-only provider must refuse the bytes",
  );
  assert(
    !!wrongProvider.reason,
    "a refusal must carry a reason the caller can log",
  );

  // `throw` rather than `assert(...)`: the harness's assert is a plain
  // function, not a TypeScript assertion signature, so it does not narrow
  // `config` for the uses below. `pnpm run check` does not cover test/, but
  // the `types` CI shard typechecks it and catches exactly this.
  const config = getVideoProviderConfig("google-ai");
  if (config === null) {
    throw new Error("the Gemini row must exist");
  }
  const oversized = canDeliverVideoNatively("google-ai", {
    ...small,
    buffer: Buffer.alloc((config.maxSizeMB + 1) * 1024 * 1024),
  });
  assertEqual(
    oversized.deliver,
    false,
    "a clip over the inline ceiling must be refused",
  );

  const wrongContainer = canDeliverVideoNatively("google-ai", {
    ...small,
    mimeType: "video/x-matroska",
  });
  assertEqual(
    wrongContainer.deliver,
    false,
    "an unsupported container must be refused",
  );
  assert(
    !isNativeVideoMimeType("video/x-matroska"),
    "the container check must agree with the gate",
  );

  // Every refusal above must be distinguishable. Identical wording is how
  // "shorten the clip" and "switch provider" become the same log line.
  const reasons = [
    wrongProvider.reason,
    oversized.reason,
    wrongContainer.reason,
  ];
  assertEqual(
    new Set(reasons).size,
    reasons.length,
    "each refusal must explain itself differently",
  );

  // An unmeasured duration must not by itself disqualify a clip — probing
  // fails exactly where the frames are missing too.
  assertEqual(
    canDeliverVideoNatively("google-ai", { ...small, durationSec: undefined })
      .deliver,
    true,
    "an unknown duration must not block delivery",
  );
  assertEqual(
    canDeliverVideoNatively("google-ai", {
      ...small,
      durationSec: config.maxDurationSec + 1,
    }).deliver,
    false,
    "a clip over the duration ceiling must be refused",
  );
});

await test("an unmeasured native clip is not priced as free", () => {
  const config = getVideoProviderConfig("google-ai");
  if (config === null) {
    throw new Error("the Gemini row must exist");
  }

  // Precondition: an unmeasured duration is not itself a refusal (pinned
  // above), so a clip landing here with durationSec 0 can really be the one
  // that reaches Gemini as bytes — pricing it at 0 would misbudget exactly
  // that clip, not some hypothetical one.
  const deliverable = canDeliverVideoNatively("google-ai", {
    buffer: Buffer.alloc(1024),
    filename: "clip.mp4",
    mimeType: "video/mp4",
    durationSec: undefined,
  });
  assertEqual(
    deliverable.deliver,
    true,
    "precondition: an unmeasured clip must still be natively deliverable",
  );

  const unmeasured = estimateVideoTokens({
    provider: "google-ai",
    durationSec: 0,
  });
  assert(
    unmeasured > 0,
    "a natively-delivered clip with an unknown duration must not be estimated as free",
  );

  // The floor must stay a floor, not a stand-in for a real clip: a known
  // long duration must still cost materially more than an unmeasured one.
  const longKnown = estimateVideoTokens({
    provider: "google-ai",
    durationSec: config.maxDurationSec,
  });
  assert(
    unmeasured < longKnown,
    "the unmeasured floor must not overshoot a genuinely long clip's cost",
  );
});

await test("canDeliverVideoNatively charges a clip against what earlier clips in the same request already committed", () => {
  const config = getVideoProviderConfig("google-ai");
  if (config === null) {
    throw new Error("the Gemini row must exist");
  }

  // Each clip alone is comfortably under the per-clip ceiling...
  const eachBytes = Math.floor(config.maxSizeMB * 0.6 * 1024 * 1024);
  const first = {
    buffer: Buffer.alloc(eachBytes, 1),
    filename: "first.mp4",
    mimeType: "video/mp4",
  };
  const second = {
    buffer: Buffer.alloc(eachBytes, 2),
    filename: "second.mp4",
    mimeType: "video/mp4",
  };

  const firstAlone = canDeliverVideoNatively("google-ai", first);
  assertEqual(
    firstAlone.deliver,
    true,
    "precondition: the first clip alone must be deliverable",
  );
  const secondAlone = canDeliverVideoNatively("google-ai", second);
  assertEqual(
    secondAlone.deliver,
    true,
    "precondition: the second clip alone must also be deliverable — only the pair together conflicts",
  );

  // ...but together they exceed the request-wide ceiling. Charging the
  // second against what the first already committed must refuse it, even
  // though it just passed in isolation above.
  const secondAfterFirst = canDeliverVideoNatively(
    "google-ai",
    second,
    first.buffer.length,
  );
  assertEqual(
    secondAfterFirst.deliver,
    false,
    "a clip that individually fits must still be refused once it would push the request's total over the ceiling",
  );
  assert(
    !!secondAfterFirst.reason,
    "the aggregate refusal must carry a reason the caller can log",
  );

  // The default (omitted) parameter must reproduce the original, per-clip-only
  // behaviour exactly — existing single-clip callers must not regress.
  assertEqual(
    canDeliverVideoNatively("google-ai", second).deliver,
    true,
    "omitting priorNativeVideoBytes must behave exactly like passing 0",
  );
});

// ---------------------------------------------------------------------------
// Wiring: the request-wide ceiling as enforced across a real request
// ---------------------------------------------------------------------------
//
// The pure-function test above proves canDeliverVideoNatively's own logic.
// It says nothing about whether either Gemini assembly path
// (messageBuilder.ts's convertMultimodalToProviderFormat, or
// googleNativeGemini3/utils.ts's appendNativeVideoParts, shared by both
// googleAiStudio/client.ts and googleVertex/client.ts) actually threads a
// running total through the loop rather than resetting it per clip. Neither
// function is exported, so per rule 15 this drives the real
// NeuroLink().generate() surface against a local stand-in for the AI Studio
// endpoint and inspects the outgoing request body — the same pattern as
// continuous-test-suite-aistudio-loop-characterization.ts.
//
// The fixtures are synthetic filled buffers, not the committed clip: the
// video-attach loop only needs each clip's byte length and its mimetype hint
// (FileWithMetadata.mimetype short-circuits FileDetector's detection at 95%
// confidence — src/lib/utils/mimeTypeHints.ts — so garbage content never
// needs to parse as a real container, and no ffmpeg is required).

const GEMINI_CONFIG = getVideoProviderConfig("google-ai");
if (GEMINI_CONFIG === null) {
  throw new Error("the Gemini row must exist");
}
/** 60% of the per-clip ceiling: safe alone, ~120% combined with a sibling. */
const NEAR_CEILING_MB = GEMINI_CONFIG.maxSizeMB * 0.6;

type StandInCall = { body: Record<string, unknown> };
type StandIn = {
  calls: StandInCall[];
  port: number;
  close: () => Promise<void>;
};

async function startStandIn(reply: string): Promise<StandIn> {
  const calls: StandInCall[] = [];
  const server = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => chunks.push(c));
    req.on("end", () => {
      let body: Record<string, unknown>;
      try {
        body = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
      } catch {
        body = {};
      }
      calls.push({ body });
      res.writeHead(200, { "content-type": "text/event-stream" });
      res.write(reply);
      res.end();
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  return {
    calls,
    port: typeof address === "object" && address ? address.port : 0,
    close: () =>
      new Promise<void>((resolve) => {
        server.close(() => resolve());
      }),
  };
}

function sseTextTurn(text: string): string {
  const payload = {
    candidates: [
      {
        content: { parts: [{ text }], role: "model" },
        finishReason: "STOP",
        index: 0,
      },
    ],
    usageMetadata: {
      promptTokenCount: 5,
      candidatesTokenCount: 4,
      totalTokenCount: 9,
    },
  };
  return `data: ${JSON.stringify(payload)}\r\n\r\n`;
}

/** Count of inline video parts the request body actually carries. */
function nativeVideoPartCount(call: StandInCall | undefined): number {
  const contents = (call?.body?.contents ?? []) as Array<{
    parts?: Array<{ inlineData?: { mimeType?: string } }>;
  }>;
  return contents
    .flatMap((c) => c.parts ?? [])
    .filter(
      (p) =>
        typeof p.inlineData?.mimeType === "string" &&
        p.inlineData.mimeType.startsWith("video/"),
    ).length;
}

const MOCK_MODEL = "gemini-2.0-flash";

function syntheticClip(sizeMB: number, fill: number, filename: string) {
  return {
    buffer: Buffer.alloc(Math.ceil(sizeMB * 1024 * 1024), fill),
    filename,
    mimetype: "video/mp4",
  };
}

const TOUCHED_ENV_VARS = [
  "GOOGLE_AI_API_KEY",
  "GEMINI_API_KEY",
  "GOOGLE_GENERATIVE_AI_API_KEY",
  "GOOGLE_AI_BASE_URL",
] as const;

/** Mirrors withAiStudioEnv() in the loop-characterization suite. */
function withAiStudioEnv(): () => void {
  const saved: Record<string, string | undefined> = {};
  for (const key of TOUCHED_ENV_VARS) {
    saved[key] = process.env[key];
  }
  process.env.GOOGLE_AI_API_KEY = "test-key";
  delete process.env.GOOGLE_AI_BASE_URL;
  return () => {
    for (const key of TOUCHED_ENV_VARS) {
      const prior = saved[key];
      if (prior === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = prior;
      }
    }
  };
}

await test("two clips that individually fit but together overflow: only the first ships natively", async () => {
  const server = await startStandIn(sseTextTurn("noted"));
  const restore = withAiStudioEnv();
  try {
    const nl = new NeuroLink();
    await nl.generate({
      input: {
        text: "Describe the videos.",
        files: [
          syntheticClip(NEAR_CEILING_MB, 0xaa, "first.mp4"),
          syntheticClip(NEAR_CEILING_MB, 0xbb, "second.mp4"),
        ],
      },
      provider: "google-ai",
      model: MOCK_MODEL,
      disableInternalFallback: true,
      credentials: {
        googleAiStudio: {
          apiKey: "test-key",
          baseURL: `http://127.0.0.1:${server.port}`,
        },
      },
    });

    // Precondition: the request must actually have reached the stand-in, or
    // a part count of 0 or 1 below would prove nothing about the guard.
    assert(
      server.calls.length > 0,
      "precondition: the request must have reached the mock endpoint",
    );
    assertEqual(
      nativeVideoPartCount(server.calls[0]),
      1,
      "only the clip that fits the request's shared inline ceiling may ship natively",
    );
  } finally {
    restore();
    await server.close();
  }
});

await test("two small clips that together stay under the ceiling both ship natively", async () => {
  const server = await startStandIn(sseTextTurn("noted"));
  const restore = withAiStudioEnv();
  try {
    const nl = new NeuroLink();
    await nl.generate({
      input: {
        text: "Describe the videos.",
        files: [
          syntheticClip(1, 0xaa, "first.mp4"),
          syntheticClip(1, 0xbb, "second.mp4"),
        ],
      },
      provider: "google-ai",
      model: MOCK_MODEL,
      disableInternalFallback: true,
      credentials: {
        googleAiStudio: {
          apiKey: "test-key",
          baseURL: `http://127.0.0.1:${server.port}`,
        },
      },
    });

    assert(
      server.calls.length > 0,
      "precondition: the request must have reached the mock endpoint",
    );
    assertEqual(
      nativeVideoPartCount(server.calls[0]),
      2,
      "two clips that together stay under the ceiling must both ship natively — the guard must not over-trigger",
    );
  } finally {
    restore();
    await server.close();
  }
});

// The two tests above drive generate(), which is GoogleAIStudioProvider's own
// override (executeNativeGemini3Generate). stream() is a *separate* override
// (executeNativeGemini3Stream) that reaches the same shared
// appendNativeVideoParts through its own call to buildUserPartsWithMultimodal
// — nothing here proves that call site is still wired up. That is not a
// hypothetical: #1258 was exactly this shape, a provider whose generate()
// attached files correctly while its independent stream() override silently
// dropped them (see continuous-test-suite-multimodal-sdk.ts). A ceiling that
// only generate() enforces would let an oversized pair of clips through on
// stream() and get the request rejected upstream instead of falling back.
async function drainStream(
  stream: Awaited<ReturnType<NeuroLink["stream"]>>["stream"],
): Promise<void> {
  for await (const _chunk of stream) {
    // The assertions below only need the request the stand-in captured, not
    // the streamed reply text — draining is solely to let the request land.
  }
}

await test("two clips that individually fit but together overflow via stream(): only the first ships natively", async () => {
  const server = await startStandIn(sseTextTurn("noted"));
  const restore = withAiStudioEnv();
  try {
    const nl = new NeuroLink();
    const result = await nl.stream({
      input: {
        text: "Describe the videos.",
        files: [
          syntheticClip(NEAR_CEILING_MB, 0xaa, "first.mp4"),
          syntheticClip(NEAR_CEILING_MB, 0xbb, "second.mp4"),
        ],
      },
      provider: "google-ai",
      model: MOCK_MODEL,
      disableInternalFallback: true,
      credentials: {
        googleAiStudio: {
          apiKey: "test-key",
          baseURL: `http://127.0.0.1:${server.port}`,
        },
      },
    });
    await drainStream(result.stream);

    // Precondition: the request must actually have reached the stand-in, or
    // a part count of 0 or 1 below would prove nothing about the guard.
    assert(
      server.calls.length > 0,
      "precondition: the request must have reached the mock endpoint",
    );
    assertEqual(
      nativeVideoPartCount(server.calls[0]),
      1,
      "only the clip that fits the request's shared inline ceiling may ship natively over stream()",
    );
  } finally {
    restore();
    await server.close();
  }
});

await test("two small clips that together stay under the ceiling both ship natively via stream()", async () => {
  const server = await startStandIn(sseTextTurn("noted"));
  const restore = withAiStudioEnv();
  try {
    const nl = new NeuroLink();
    const result = await nl.stream({
      input: {
        text: "Describe the videos.",
        files: [
          syntheticClip(1, 0xaa, "first.mp4"),
          syntheticClip(1, 0xbb, "second.mp4"),
        ],
      },
      provider: "google-ai",
      model: MOCK_MODEL,
      disableInternalFallback: true,
      credentials: {
        googleAiStudio: {
          apiKey: "test-key",
          baseURL: `http://127.0.0.1:${server.port}`,
        },
      },
    });
    await drainStream(result.stream);

    assert(
      server.calls.length > 0,
      "precondition: the request must have reached the mock endpoint",
    );
    assertEqual(
      nativeVideoPartCount(server.calls[0]),
      2,
      "two clips that together stay under the ceiling must both ship natively over stream() — the guard must not over-trigger",
    );
  } finally {
    restore();
    await server.close();
  }
});

// ---------------------------------------------------------------------------
// The request-wide ceiling must also charge non-video inline parts
// ---------------------------------------------------------------------------
//
// The four pairs above only ever mix video with video. `committedVideoBytes`
// (the running total `canDeliverVideoNatively` charges each clip against)
// started at 0 on every assembly path, so an inline PDF, image or audio part
// already queued ahead of the video in the same request was invisible to it:
// a clip that individually fits could still combine with those to exceed
// Gemini's real 20MB request-wide limit, and the whole call would fail with
// an opaque HTTP 400 instead of the graceful keyframe fallback this module
// exists to provide. The pair below proves the seed now accounts for an
// inline image already queued ahead of the video.
//
// A data: URI handed to `input.images` directly (rather than through
// `input.files`) reaches `buildUserPartsWithMultimodal` without going through
// `FileDetector`/`ImageProcessor`'s real image validation — exactly like
// `syntheticClip` below skips real container validation for video. Only the
// declared MIME type and the byte count matter to the code under test.
function syntheticImageDataUri(sizeMB: number, fill: number): string {
  // A real JPEG SOI marker, so anything that does sniff magic bytes upstream
  // still recognises this as `image/jpeg` rather than falling back to the
  // `application/octet-stream` sentinel and being rejected outright.
  const jpegHeader = Buffer.from([0xff, 0xd8, 0xff]);
  const filler = Buffer.alloc(Math.ceil(sizeMB * 1024 * 1024), fill);
  return `data:image/jpeg;base64,${Buffer.concat([jpegHeader, filler]).toString("base64")}`;
}

/** Count of inline image parts the request body actually carries. */
function nativeImagePartCount(call: StandInCall | undefined): number {
  const contents = (call?.body?.contents ?? []) as Array<{
    parts?: Array<{ inlineData?: { mimeType?: string } }>;
  }>;
  return contents
    .flatMap((c) => c.parts ?? [])
    .filter(
      (p) =>
        typeof p.inlineData?.mimeType === "string" &&
        p.inlineData.mimeType.startsWith("image/"),
    ).length;
}

await test("a clip under the ceiling falls back once an inline image sharing the request would overflow it", async () => {
  const server = await startStandIn(sseTextTurn("noted"));
  const restore = withAiStudioEnv();
  try {
    const nl = new NeuroLink();
    await nl.generate({
      input: {
        text: "Describe the video and the image.",
        images: [syntheticImageDataUri(NEAR_CEILING_MB, 0xcc)],
        files: [syntheticClip(NEAR_CEILING_MB, 0xaa, "clip.mp4")],
      },
      provider: "google-ai",
      model: MOCK_MODEL,
      disableInternalFallback: true,
      credentials: {
        googleAiStudio: {
          apiKey: "test-key",
          baseURL: `http://127.0.0.1:${server.port}`,
        },
      },
    });

    assert(
      server.calls.length > 0,
      "precondition: the request must have reached the mock endpoint",
    );
    assertEqual(
      nativeImagePartCount(server.calls[0]),
      1,
      "precondition: the image must have shipped inline, or the aggregate scenario below proves nothing",
    );
    assertEqual(
      nativeVideoPartCount(server.calls[0]),
      0,
      "a clip that fits the ceiling alone must still fall back to keyframes once an inline image already queued in the same request would push the total over it",
    );
  } finally {
    restore();
    await server.close();
  }
});

await test("a clip under the ceiling falls back via stream() once an inline image sharing the request would overflow it", async () => {
  const server = await startStandIn(sseTextTurn("noted"));
  const restore = withAiStudioEnv();
  try {
    const nl = new NeuroLink();
    const result = await nl.stream({
      input: {
        text: "Describe the video and the image.",
        images: [syntheticImageDataUri(NEAR_CEILING_MB, 0xcc)],
        files: [syntheticClip(NEAR_CEILING_MB, 0xaa, "clip.mp4")],
      },
      provider: "google-ai",
      model: MOCK_MODEL,
      disableInternalFallback: true,
      credentials: {
        googleAiStudio: {
          apiKey: "test-key",
          baseURL: `http://127.0.0.1:${server.port}`,
        },
      },
    });
    await drainStream(result.stream);

    assert(
      server.calls.length > 0,
      "precondition: the request must have reached the mock endpoint",
    );
    assertEqual(
      nativeImagePartCount(server.calls[0]),
      1,
      "precondition: the image must have shipped inline, or the aggregate scenario below proves nothing",
    );
    assertEqual(
      nativeVideoPartCount(server.calls[0]),
      0,
      "a clip that fits the ceiling alone must still fall back to keyframes over stream() once an inline image already queued in the same request would push the total over it",
    );
  } finally {
    restore();
    await server.close();
  }
});

// ---------------------------------------------------------------------------
// Through the built CLI: which parts actually go on the wire
// ---------------------------------------------------------------------------

const NATIVE_PART_LOG = /Added native video part/;
const VIDEO_PROCESSED_LOG = /Video processed:/;

await test("the CLI attaches the clip itself on a native provider", async () => {
  if (!hasGoogleKey()) {
    throw new Skip("no Google AI credentials");
  }
  const res = await runCLI(
    [
      "generate",
      "Reply with the single word OK.",
      "--file",
      CLIP,
      "--provider",
      NATIVE_PROVIDER,
      "--debug",
    ],
    { env: { NEUROLINK_LOG_LEVEL: "debug" }, timeoutMs: 240_000 },
  );
  const combined = `${res.stdout}${res.stderr}`;

  // Precondition first: an assertion about a part being added is meaningless
  // if the video never reached the processor at all.
  assert(
    VIDEO_PROCESSED_LOG.test(combined),
    "precondition: the video must have been processed before any claim about its parts",
  );
  assert(
    NATIVE_PART_LOG.test(combined),
    "a native provider must receive the clip as a video part",
  );
});

await test("the CLI sends only frames on a frame-extraction provider", async () => {
  if (!process.env.OPENAI_API_KEY) {
    throw new Skip("no OpenAI credentials");
  }
  const res = await runCLI(
    [
      "generate",
      "Reply with the single word OK.",
      "--file",
      CLIP,
      "--provider",
      FRAME_PROVIDER,
      "--debug",
    ],
    { env: { NEUROLINK_LOG_LEVEL: "debug" }, timeoutMs: 240_000 },
  );
  const combined = `${res.stdout}${res.stderr}`;

  // The precondition carries the whole weight of the negative below: without
  // it, "no native video part" is equally true of a run where the file was
  // never opened, and the assertion would pass for the wrong reason.
  assert(
    VIDEO_PROCESSED_LOG.test(combined),
    "precondition: the video must have been processed before any claim about its parts",
  );
  assert(
    !NATIVE_PART_LOG.test(combined),
    "a frame-extraction provider must not receive a video part",
  );
});

// ---------------------------------------------------------------------------
// Live: the discriminating question
// ---------------------------------------------------------------------------

await test("Gemini hears the clip's audio track (live)", async () => {
  if (!hasGoogleKey()) {
    throw new Skip("no Google AI credentials");
  }
  const nl = new NeuroLink();
  const result = await nl.generate({
    input: {
      text:
        "A short video is attached. Answer both parts on one line. " +
        "(1) Say the secret word spoken aloud in it. " +
        "(2) List the colours shown. " +
        "If you received no audio at all, reply exactly: NO_AUDIO_RECEIVED",
      files: [CLIP],
    },
    provider: NATIVE_PROVIDER,
  });

  const answer = result.content.toLowerCase();
  assert(answer.length > 0, "the model must return an answer");
  assert(
    !answer.includes("no_audio_received"),
    "the model must have received the clip's audio track",
  );
  // The word is spoken, never shown. No keyframe and no line of the metadata
  // summary contains it, so this passes only if the video itself travelled.
  assert(
    answer.includes("flamingo"),
    "the model must report the spoken word, which only the video carries",
  );
  // Sanity: the visual content still arrives alongside the audio.
  assert(
    answer.includes("red") && answer.includes("blue"),
    "the model must still see the clip's colours",
  );
});

await test("a frame-only provider gets pictures but no sound (live)", async () => {
  if (!process.env.OPENAI_API_KEY) {
    throw new Skip("no OpenAI credentials");
  }
  const nl = new NeuroLink();
  const result = await nl.generate({
    input: {
      text:
        "A short video is attached. List the colours shown. " +
        "Then, if and only if you can hear its audio, say the secret word " +
        "spoken aloud in it; if you received no audio, write NO_AUDIO_RECEIVED.",
      files: [CLIP],
    },
    provider: FRAME_PROVIDER,
  });

  const answer = result.content.toLowerCase();
  // Precondition: this provider must have received the keyframes, or the
  // absence of the spoken word below proves nothing about audio.
  assert(
    answer.includes("red") || answer.includes("blue"),
    "precondition: the frame-path provider must have received the keyframes",
  );
  assert(
    !answer.includes("flamingo"),
    "a frame-path provider must not learn the spoken word",
  );
});

await runSuite();
