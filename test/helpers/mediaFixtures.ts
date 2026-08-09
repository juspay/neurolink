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

/**
 * Render a number into an image of a chosen byte size.
 *
 * Two properties matter and neither is incidental.
 *
 * The *content* is a number the model cannot guess. Asking "describe this
 * image" is worthless — a model that received nothing still produces plausible
 * prose — and asking about a property with a strong prior (dimensions, a
 * common colour) is answerable without looking. A four-digit token has no
 * prior, so a correct answer can only have come from the pixels.
 *
 * The *size* is chosen relative to `SIZE_TIER_THRESHOLDS.TINY_MAX` (10 KB).
 * Files under it are processed eagerly; files over it take the lazy
 * reference path. An image on the wrong side of that line silently became a
 * ~98-character text preview and never reached the model at all — and the
 * reason that shipped is that every image fixture in the suites happened to be
 * a few kilobytes. `bigPixels` pushes the encode over the threshold so the
 * lazy path is actually exercised.
 *
 * @param label - Digits rendered into the image; keep it un-guessable.
 * @param bigPixels - When true, render large enough to exceed TINY_MAX.
 */
export async function makeNumberImage(
  dir: string,
  name: string,
  label: string,
  bigPixels = false,
): Promise<string> {
  const magick = findImageMagick();
  if (!magick) {
    throw new Error("ImageMagick unavailable");
  }
  const out = path.join(dir, name);
  const size = bigPixels ? "1600x900" : "200x100";
  const pointsize = bigPixels ? "220" : "48";
  await execFileAsync(magick, [
    "-size",
    size,
    "xc:white",
    "-fill",
    "black",
    "-pointsize",
    pointsize,
    "-gravity",
    "center",
    "-annotate",
    "0",
    label,
    out,
  ]);
  return out;
}

/**
 * Locate ImageMagick: `IMAGEMAGICK_PATH` first, then the usual install roots.
 *
 * Mirrors `findFfmpeg`'s env-override-then-fixed-paths order, so an unusual
 * install can be pointed at rather than making the caller skip. It stops short
 * of `findFfmpeg`'s bare-name PATH fallback on purpose: that one is safe
 * because `hasFfmpeg()` proves the binary runs before anything relies on it,
 * and there is no equivalent probe here — returning "magick" on a machine
 * without it would turn a clean skip into a spawn failure mid-fixture.
 */
export function findImageMagick(): string | null {
  const explicit = process.env.IMAGEMAGICK_PATH;
  if (explicit && fs.existsSync(explicit)) {
    return explicit;
  }

  for (const candidate of [
    "/opt/homebrew/bin/magick",
    "/usr/local/bin/magick",
    "/usr/bin/magick",
    "/opt/homebrew/bin/convert",
    "/usr/bin/convert",
  ]) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}
