#!/usr/bin/env tsx
import "dotenv/config";

/**
 * Continuous Test Suite — `videoOptions` reaches the provider (allowlist fix).
 *
 * `videoOptions` is a documented public `generate()` option (`frames`,
 * `quality`, `format`, `transcribeAudio` — see `GenerateOptions.videoOptions`
 * in `src/lib/types/generate.ts`), but `buildGenerateTextOptions` in
 * `src/lib/neurolink.ts` converts the caller's public `GenerateOptions` into
 * the internal `TextGenerationOptions` through an explicit field-by-field
 * allowlist, and `videoOptions` was never named in it — the same bug class
 * `c011b0405` fixed for `thinkingConfig` (that commit's message records how
 * `disableInternalFallback` was lost the same way once before). It fails
 * quietly: no error, no warning, the option is simply dropped before any
 * provider sees it.
 *
 * Google AI Studio is the target here because it is the ONE path unaffected
 * by anything else: it overrides `generate()`/`executeStream()` and calls
 * `preprocessNativeFileInput` -> `processUnifiedFilesArray` directly on the
 * internal `TextGenerationOptions` object, with no second, independent
 * allowlist in between (unlike the generic AI-SDK pipeline's
 * `MessageBuilder.buildMessages`, which builds its own separate
 * `multimodalOptions` literal — a sibling gap, out of scope for this fix).
 * Proving the option survives on this path isolates exactly the bug named
 * above.
 *
 * ALL-DIST module graph (rule 15): `NeuroLink` comes from `../dist/index.js`,
 * the same shipped surface every caller uses. No rule-15 exception needed.
 *
 * The instrument is a local, loopback-only stand-in for the
 * `@google/genai` REST wire (SSE `generateContentStream` framing), pointed at
 * via the public `credentials.googleAiStudio.baseURL` override — no live
 * credentials, no network egress. It records the request body `generate()`
 * actually sent, so the test can count `inlineData` image parts on the wire
 * rather than trust an in-process return value.
 *
 * A real 6-second video fixture (synthesised with ffmpeg at test time, see
 * `helpers/mediaFixtures.ts`) is attached with two different
 * `videoOptions.frames` values. `VideoProcessor.extractKeyframes` spreads a
 * caller-supplied frame budget evenly across the clip, so `frames: 2` and
 * `frames: 4` must produce a DIFFERENT number of image parts on the wire, if
 * and only if `videoOptions` actually reached the processor. The clip's
 * duration (6s, <=10s tier) is deliberately chosen so that if `videoOptions`
 * is dropped, both calls fall back to the SAME uncontrolled tier default (one
 * frame per second = 6 frames) — the exact failure this suite exists to
 * catch, not two counts that merely happen to differ for an unrelated reason.
 *
 * Run: npx tsx test/continuous-test-suite-video-options-allowlist.ts
 *      pnpm run test:video-options-allowlist
 */

import { createServer, type Server } from "node:http";
import { defineSuite, assert, tempDir, Skip } from "./helpers/harness.js";
import { assertDistFresh } from "./helpers/distFreshness.js";
import { hasFfmpeg, makeVideoFile } from "./helpers/mediaFixtures.js";

assertDistFresh();

const { test, runSuite } = defineSuite("Video options allowlist", {
  offline: true,
});

const { NeuroLink } = await import("../dist/index.js");

const MODEL = "gemini-2.0-flash";
const CLIP_SECONDS = 6;
const FRAMES_FIRST_CALL = 2;
const FRAMES_SECOND_CALL = 4;

type CapturedCall = { body: Record<string, unknown> };

type StandIn = {
  calls: CapturedCall[];
  port: number;
  close: () => Promise<void>;
};

/** One streamed candidate chunk in the SSE framing `generateContentStream` expects. */
function sseTextReply(text: string): string {
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

/** Local stand-in for the Google AI Studio `generateContentStream` endpoint. */
async function startStandIn(): Promise<StandIn> {
  const calls: CapturedCall[] = [];
  const server: Server = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => chunks.push(c));
    req.on("end", () => {
      let body: Record<string, unknown> = {};
      try {
        body = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
      } catch {
        // Malformed JSON is still a captured call; fall through so the
        // caller's assertion sees the (empty) body rather than a hang.
      }
      calls.push({ body });
      res.writeHead(200, { "content-type": "text/event-stream" });
      res.write(sseTextReply("ok"));
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

/** Count of image `inlineData` parts in the LAST user turn a call sent. */
function imagePartCount(call: CapturedCall | undefined): number {
  const contents = (call?.body?.contents ?? []) as Array<{
    role?: string;
    parts?: Array<{ inlineData?: { mimeType?: string } }>;
  }>;
  const userTurns = contents.filter((c) => c.role === "user");
  const lastUserTurn = userTurns[userTurns.length - 1];
  return (lastUserTurn?.parts ?? []).filter((p) =>
    Boolean(p.inlineData?.mimeType?.startsWith("image/")),
  ).length;
}

function credentialsFor(port: number) {
  return {
    googleAiStudio: {
      apiKey: "test-key",
      baseURL: `http://127.0.0.1:${port}`,
    },
  };
}

await test("videoOptions.frames changes the number of keyframes actually sent to the provider", async () => {
  if (!(await hasFfmpeg())) {
    throw new Skip("ffmpeg not available — cannot synthesise a video fixture");
  }
  const dir = tempDir("video-options-allowlist-");
  const clip = await makeVideoFile(dir, "clip.mp4", CLIP_SECONDS);

  const server = await startStandIn();
  try {
    const nl = new NeuroLink();
    await nl.generate({
      input: { text: "describe this clip", files: [clip] },
      videoOptions: { frames: FRAMES_FIRST_CALL },
      provider: "google-ai",
      model: MODEL,
      disableTools: true,
      disableInternalFallback: true,
      credentials: credentialsFor(server.port),
    });
    await nl.generate({
      input: { text: "describe this clip", files: [clip] },
      videoOptions: { frames: FRAMES_SECOND_CALL },
      provider: "google-ai",
      model: MODEL,
      disableTools: true,
      disableInternalFallback: true,
      credentials: credentialsFor(server.port),
    });

    assert(
      server.calls.length === 2,
      "expected exactly two requests to reach the provider stand-in",
    );
    const firstCount = imagePartCount(server.calls[0]);
    const secondCount = imagePartCount(server.calls[1]);

    assert(
      firstCount !== secondCount,
      `videoOptions.frames had no observable effect on the wire — both requests carried the same image-part count (${firstCount})`,
    );
    assert(
      firstCount === FRAMES_FIRST_CALL,
      `expected the frames:${FRAMES_FIRST_CALL} request to carry ${FRAMES_FIRST_CALL} keyframes, carried ${firstCount}`,
    );
    assert(
      secondCount === FRAMES_SECOND_CALL,
      `expected the frames:${FRAMES_SECOND_CALL} request to carry ${FRAMES_SECOND_CALL} keyframes, carried ${secondCount}`,
    );
  } finally {
    await server.close();
  }
});

await runSuite();
