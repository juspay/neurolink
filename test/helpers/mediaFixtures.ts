/**
 * Synthesised audio/video fixtures for the multimodal suites.
 *
 * The fixtures are generated with ffmpeg at test time rather than committed.
 * Real media is the only thing that exercises these processors — `music-metadata`
 * and `ffprobe` both read container headers, so a hand-rolled byte string proves
 * nothing — but committing binaries to grow the repo for every codec and edge
 * case is a poor trade when ffmpeg can mint them deterministically.
 *
 * CI already installs ffmpeg (`AnimMouse/setup-ffmpeg` in ci.yml). Where it is
 * absent, callers should skip rather than fail: a missing local tool is not a
 * product defect.
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import * as fs from "node:fs";
import * as path from "node:path";

const execFileAsync = promisify(execFile);

/**
 * Resolve an ffmpeg binary.
 *
 * Absolute candidates are checked BEFORE the bare name. Returning "ffmpeg"
 * first would end the search there, so a machine whose PATH lacks ffmpeg but
 * which has it at /usr/bin/ffmpeg would report "not available" and silently
 * skip every media suite.
 */
export function findFfmpeg(): string | null {
  const explicit = process.env.FFMPEG_PATH;
  if (explicit && fs.existsSync(explicit)) {
    return explicit;
  }

  for (const absolute of [
    "/opt/homebrew/bin/ffmpeg",
    "/usr/local/bin/ffmpeg",
    "/usr/bin/ffmpeg",
  ]) {
    if (fs.existsSync(absolute)) {
      return absolute;
    }
  }

  // Last resort: let execFile resolve it through PATH. hasFfmpeg() proves it
  // actually runs, so a bare name that does not resolve fails there, not here.
  return "ffmpeg";
}

/** True when ffmpeg can actually be invoked, not merely located. */
export async function hasFfmpeg(): Promise<boolean> {
  const bin = findFfmpeg();
  if (!bin) {
    return false;
  }
  try {
    await execFileAsync(bin, ["-version"]);
    return true;
  } catch {
    return false;
  }
}

/**
 * Generate a tone as a real audio file.
 *
 * A sine source rather than silence: some encoders emit a degenerate stream for
 * pure silence, and the point is to exercise a normal decode path.
 */
export async function makeAudioFile(
  dir: string,
  name: string,
  seconds = 2,
  extraArgs: string[] = [],
): Promise<string> {
  const bin = findFfmpeg();
  if (!bin) {
    throw new Error("ffmpeg unavailable");
  }
  const out = path.join(dir, name);
  await execFileAsync(bin, [
    "-y",
    "-f",
    "lavfi",
    "-i",
    `sine=frequency=440:duration=${seconds}`,
    ...extraArgs,
    out,
  ]);
  return out;
}

/** Generate a short colour-bar video with an audio track. */
export async function makeVideoFile(
  dir: string,
  name: string,
  seconds = 2,
  extraArgs: string[] = [],
): Promise<string> {
  const bin = findFfmpeg();
  if (!bin) {
    throw new Error("ffmpeg unavailable");
  }
  const out = path.join(dir, name);
  // The audio encoder is pinned rather than left to the muxer default: ffmpeg
  // does not guarantee a particular default encoder for MP4, so a test that
  // asserts on the resulting audio codec would be asserting on the local build
  // configuration. `extraArgs` still wins, since it is appended after.
  await execFileAsync(bin, [
    "-y",
    "-f",
    "lavfi",
    "-i",
    `testsrc=size=320x240:rate=10:duration=${seconds}`,
    "-f",
    "lavfi",
    "-i",
    `sine=frequency=440:duration=${seconds}`,
    "-shortest",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    ...extraArgs,
    out,
  ]);
  return out;
}

/**
 * A file with a valid extension whose bytes are not that format.
 *
 * The interesting failure is not "no file" but "file that lies about itself" —
 * a truncated upload or a mislabelled download, which is what reaches these
 * processors in practice.
 */
export function makeCorruptFile(dir: string, name: string): string {
  const out = path.join(dir, name);
  fs.writeFileSync(out, Buffer.from("not really media, just ascii", "utf8"));
  return out;
}
