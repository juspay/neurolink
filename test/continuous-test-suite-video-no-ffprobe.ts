#!/usr/bin/env tsx
/**
 * Continuous Test Suite: video frames on a host that has ffmpeg but no ffprobe.
 *
 * ## What these assertions are really guarding
 *
 * `ffmpeg-static` ships ffmpeg and nothing else, so an image built on it has no
 * ffprobe. mediabunny reads MP4, MOV, WebM and MKV without either binary, but
 * it cannot read AVI, FLV or WMV, and ffprobe was the only other reader. Their
 * metadata then came back empty, and an empty duration means no frame
 * timestamps: `extractKeyframes` returns nothing, the request still succeeds,
 * and the model answers "I can't see the video" — the failure is invisible from
 * a passing generation. So this suite counts the frames that reach the model
 * rather than checking that the request worked.
 *
 * ## The environment
 *
 * The CLI runs with a PATH holding a single `ffmpeg` link and nothing else, and
 * `FFMPEG_PATH` naming that link, so neither PATH nor the neighbouring
 * directory offers an ffprobe. The MP4 case runs in the same environment: it
 * needs no ffprobe, so it separates "the environment is broken" from "the
 * AVI cannot be read".
 *
 * Frames go to a local OpenAI-wire stand-in, so no credentials are involved.
 * Frame extraction needs ffmpeg, so this suite skips without it.
 *
 * Run: npx tsx test/continuous-test-suite-video-no-ffprobe.ts
 */

process.env.NEUROLINK_SKIP_MCP = "true";

import "dotenv/config";
import { execFileSync } from "node:child_process";
import {
  accessSync,
  constants,
  existsSync,
  mkdirSync,
  symlinkSync,
} from "node:fs";
import * as path from "node:path";
import {
  assert,
  defineSuite,
  runCLI,
  Skip,
  tempDir,
} from "./helpers/harness.js";
import { startChatStandIn } from "./helpers/chatStandIn.js";
import {
  findFfmpeg,
  hasFfmpeg,
  makeVideoFile,
} from "./helpers/mediaFixtures.js";

const { test, runSuite } = defineSuite("Video frames without ffprobe", {
  perTestTimeoutMs: 300_000,
});

/** `Video processed: <name> → <n> bytes text + <n> keyframes` */
const PROCESSED = /Video processed:[^\n]*?\+\s*(\d+)\s*keyframes/;

const extractedFrameCount = (output: string): number | null => {
  const match = PROCESSED.exec(output);
  return match ? Number(match[1]) : null;
};

/**
 * A directory whose only executable is a link to the real ffmpeg, and the PATH
 * built around it. Skips when an ffprobe still resolves through that PATH,
 * since the fallback would then never run.
 *
 * The PATH is that directory plus the directory of the running node, and
 * nothing else: a child spawned with an explicit `env` is looked up through
 * that env's PATH, so without node's directory `node` itself would not resolve
 * on a machine that installs it outside /usr/bin. /usr/bin and /bin are left
 * out on purpose, because that is where a distro puts ffprobe, so including
 * them would skip both cases before either asserted anything.
 */
async function ffmpegOnlyPath(): Promise<{ toolPath: string; ffmpeg: string }> {
  if (process.platform === "win32") {
    throw new Skip("the PATH construction is POSIX-only");
  }
  if (!(await hasFfmpeg())) {
    throw new Skip("ffmpeg is unavailable, so no frames can be extracted");
  }
  const realFfmpeg = findFfmpeg();
  if (!realFfmpeg) {
    throw new Skip("ffmpeg is unavailable, so no frames can be extracted");
  }
  const binDir = path.join(tempDir("neurolink-ffmpeg-only-"), "bin");
  mkdirSync(binDir);
  const ffmpeg = path.join(binDir, "ffmpeg");
  symlinkSync(
    existsSync(realFfmpeg)
      ? realFfmpeg
      : execFileSync("which", [realFfmpeg], { encoding: "utf8" }).trim(),
    ffmpeg,
  );
  const toolDirs = [binDir, path.dirname(process.execPath)];
  // Checked directly rather than through `which`, which would itself have to
  // resolve through the restricted PATH.
  for (const dir of toolDirs) {
    try {
      accessSync(path.join(dir, "ffprobe"), constants.X_OK);
    } catch {
      continue;
    }
    throw new Skip("an ffprobe is on the tool PATH, so it cannot be absent");
  }
  return { toolPath: toolDirs.join(path.delimiter), ffmpeg };
}

async function framesReachingTheModel(
  clip: string,
  toolPath: string,
  ffmpeg: string,
): Promise<{ extracted: number | null; imageParts: number }> {
  const standIn = await startChatStandIn();
  try {
    const res = await runCLI(
      [
        "generate",
        "Reply OK.",
        "--file",
        clip,
        "--provider",
        "litellm",
        "--model",
        "openai/gpt-4o-mini",
        "--video-frames",
        "2",
        "--debug",
      ],
      {
        env: {
          NEUROLINK_LOG_LEVEL: "debug",
          LITELLM_API_KEY: "test-key",
          LITELLM_BASE_URL: `${standIn.baseURL}/v1`,
          NEUROLINK_LITELLM_SSE_GENERATE: "false",
          // ffmpeg-static's own override wins over FFMPEG_PATH whenever its
          // binary is installed, so both must name the link.
          FFMPEG_BIN: ffmpeg,
          FFMPEG_PATH: ffmpeg,
          // An inherited FFPROBE_PATH would hand fluent-ffmpeg the binary
          // this suite exists to do without.
          FFPROBE_PATH: "",
          PATH: toolPath,
        },
        timeoutMs: 240_000,
      },
    );
    assert(
      res.exitCode === 0,
      `the request must succeed for the frame count to mean anything (exit ${res.exitCode}): ${res.stderr.slice(-400)}`,
    );
    return {
      extracted: extractedFrameCount(`${res.stdout}${res.stderr}`),
      imageParts: standIn.imagePartCount(),
    };
  } finally {
    await standIn.close();
  }
}

await test("an AVI still yields keyframes when only ffmpeg is installed", async () => {
  const { toolPath, ffmpeg } = await ffmpegOnlyPath();
  const clip = await makeVideoFile(tempDir("neurolink-avi-"), "clip.avi", 4, [
    "-c:v",
    "mpeg4",
    "-c:a",
    "pcm_s16le",
  ]);

  const { extracted, imageParts } = await framesReachingTheModel(
    clip,
    toolPath,
    ffmpeg,
  );

  assert(
    extracted === 2,
    `both requested frames must be extracted (log said ${extracted})`,
  );
  assert(
    imageParts === 2,
    `both frames must reach the model, not just the file's metadata (got ${imageParts})`,
  );
});

await test("an MP4 yields keyframes in the same ffmpeg-only environment", async () => {
  const { toolPath, ffmpeg } = await ffmpegOnlyPath();
  const clip = await makeVideoFile(tempDir("neurolink-mp4-"), "clip.mp4", 4);

  const { extracted, imageParts } = await framesReachingTheModel(
    clip,
    toolPath,
    ffmpeg,
  );

  assert(
    extracted === 2,
    `the control must extract both frames, or the environment is what is broken (log said ${extracted})`,
  );
  assert(
    imageParts === 2,
    `both frames must reach the model (got ${imageParts})`,
  );
});

await runSuite();
