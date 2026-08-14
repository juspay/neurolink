#!/usr/bin/env tsx
/**
 * Continuous Test Suite: decompression bounds.
 *
 * ## What this suite is for
 *
 * Every archive path here applies a size limit. The question is *when*. A limit
 * checked against the finished buffer is arithmetically correct and useless:
 * the allocation it exists to prevent has already happened, so the ceiling on
 * memory is whatever the attacker chose rather than the configured limit. The
 * verdict looks identical either way, which is exactly why this needs its own
 * assertions — a functional test cannot tell the two apart.
 *
 * ## Why memory is measured in a child process
 *
 * `process.resourceUsage().maxRSS` is a monotonic high-water mark. Measured
 * in-process across several tests, everything after the first big allocation
 * reads zero growth and passes regardless of what it did — an assertion that
 * can only succeed. Each probe therefore runs in its own process.
 *
 * It also has to be `maxRSS` rather than a sampled `memoryUsage()`:
 * `inflateRawSync` blocks the event loop for the whole allocation, so a
 * timer-based sampler never fires while the memory is live. That mistake made
 * a real 409MB spike read as 0MB during development.
 *
 * ## The other half
 *
 * A bound that refuses everything would pass every assertion above, so the
 * live tests attach an ordinary archive and require its content to come back
 * through `generate()` and `stream()`. They SKIP without credentials.
 *
 * Run: npx tsx test/continuous-test-suite-archive-security.ts
 */

import "dotenv/config";
import * as fs from "node:fs";
import * as path from "node:path";
import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { defineSuite, assert, tempDir, Skip } from "./helpers/harness.js";
import {
  BOMB_MB,
  writeGzBomb,
  writeNormalGz,
  writeStoredZip,
  writeZeroDeclaredZip,
} from "./helpers/archiveBombFixtures.js";
import { ArchiveProcessor } from "../src/lib/processors/archive/ArchiveProcessor.js";
import { NeuroLink } from "../src/lib/neurolink.js";

const execFileAsync = promisify(execFile);
const { test, runSuite } = defineSuite("Decompression bounds");

const dir = tempDir("neurolink-archive-security-");

/** Hidden in the ordinary fixture; no prior, so it can only be read. */
const TOKEN = "84317";

/**
 * Ceiling for a bounded run, in MB.
 *
 * Half the bomb, which separates the two outcomes with wide margin in both
 * directions — measured during development at 816MB unbounded against 7MB
 * bounded, with the archive limit itself at 100MB.
 */
const BOUNDED_CEILING_MB = BOMB_MB / 2;

const PROVIDER = process.env.MM_TEST_PROVIDER ?? "vertex";

function hasCredentials(): boolean {
  switch (PROVIDER) {
    case "vertex":
    case "google-vertex":
      return Boolean(
        process.env.GOOGLE_VERTEX_PROJECT ||
        process.env.GOOGLE_APPLICATION_CREDENTIALS,
      );
    case "openai":
      return Boolean(process.env.OPENAI_API_KEY);
    case "anthropic":
      return Boolean(process.env.ANTHROPIC_API_KEY);
    case "google-ai":
    case "googleaistudio":
      return Boolean(process.env.GOOGLE_AI_API_KEY);
    default:
      return false;
  }
}

function requireLive(): void {
  if (!hasCredentials()) {
    throw new Skip(
      `no credentials for provider "${PROVIDER}" — skipping live archive assertions`,
    );
  }
}

type ProbeResult = {
  rssGrowthMb: number;
  outcome: string;
  detail: string;
};

/** Run one scenario in a fresh process and read back its peak memory. */
async function probe(scenario: string, fixture: string): Promise<ProbeResult> {
  const child = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    "helpers",
    "boundedProbeChild.ts",
  );
  const { stdout } = await execFileAsync(
    process.execPath,
    ["--import", "tsx", child, scenario, fixture],
    { maxBuffer: 8 * 1024 * 1024 },
  );
  const line = stdout.trim().split("\n").filter(Boolean).pop() ?? "{}";
  return JSON.parse(line) as ProbeResult;
}

await test("a ZIP entry declaring size 0 cannot force an unbounded inflate", async () => {
  // The declared size is attacker-chosen, and one value disables two guards
  // at once: `0 > maxSize` is false, and adm-zip arms its own
  // `maxOutputLength` only when the declared size is positive. Extraction
  // therefore has to bound the inflate itself rather than trust the header.
  const fixture = await writeZeroDeclaredZip(
    path.join(dir, "declared-zero.zip"),
    BOMB_MB,
  );
  const result = await probe("extract-tool", fixture);
  assert(
    result.outcome === "completed",
    "extraction returned a verdict instead of failing outright",
  );
  assert(
    result.rssGrowthMb < BOUNDED_CEILING_MB,
    "the inflate stopped at the limit rather than expanding the whole entry",
  );
  assert(
    /too large/i.test(result.detail),
    "the refusal names the size limit rather than reporting empty content",
  );
});

await test("a gzip archive cannot inflate past the archive limit", async () => {
  const fixture = await writeGzBomb(path.join(dir, "bomb.gz"), BOMB_MB);
  const result = await probe("process-file", fixture);
  assert(
    result.rssGrowthMb < BOUNDED_CEILING_MB,
    "decompression stopped at the limit rather than materialising the payload",
  );
  assert(
    result.detail.includes("success=false"),
    "the oversized archive was refused",
  );
});

await test("a gzip-encoded HTTP response cannot inflate past the limit", async () => {
  // Content-Encoding is applied by the transport, so the size check on the
  // downloaded file only ever sees what already fit in memory.
  // A looser ceiling than the local-archive cases. The transport keeps its
  // own buffers, so a bounded run does not settle anywhere near the archive
  // limit — measured at 248MB bounded against 841MB unbounded, and this sits
  // between them with room on both sides.
  const result = await probe("download", path.join(dir, "unused"));
  assert(
    result.rssGrowthMb < BOMB_MB,
    "the response body stopped at the limit rather than being buffered whole",
  );
  assert(
    result.detail.includes("FILE_TOO_LARGE"),
    "the refusal keeps the size-limit error code rather than a generic download failure",
  );
});

await test("bypassing getData() keeps its corruption check on stored entries", async () => {
  // Reading entries directly means adm-zip's own CRC verification no longer
  // runs, so the reader has to do it. A STORED entry is copied out rather than
  // decoded, which is the path most easily left unchecked — and every bomb
  // fixture is DEFLATE, so nothing else here would notice.
  const extract = (buffer: Buffer): Promise<string> =>
    (
      new ArchiveProcessor() as unknown as {
        extractEntry: (b: Buffer, p: string) => Promise<string>;
      }
    ).extractEntry(buffer, "stored.txt");

  const intact = writeStoredZip(
    path.join(dir, "stored-ok.zip"),
    "hello from a stored entry\n",
  );
  const damaged = writeStoredZip(
    path.join(dir, "stored-bad.zip"),
    "hello from a stored entry\n",
    { corruptCrc: true },
  );

  assert(
    (await extract(fs.readFileSync(intact))).includes("stored entry"),
    "an uncompressed entry still extracts",
  );
  assert(
    /corrupt/i.test(await extract(fs.readFileSync(damaged))),
    "an uncompressed entry whose declared CRC does not match is refused",
  );
});

await test("an ordinary archive still reaches the model through generate()", async () => {
  // The counterweight: every assertion above is satisfied by a bound that
  // refuses everything. This one fails if the fix broke the feature.
  requireLive();
  const fixture = writeNormalGz(path.join(dir, "normal.gz"), TOKEN);
  const nl = new NeuroLink();
  const result = await nl.generate({
    input: {
      text: "What is the access code in the attached file? Reply with only the digits.",
      files: [fixture],
    },
    provider: PROVIDER,
    maxTokens: 128,
    timeout: 120_000,
  });
  assert(
    (result.content ?? "").includes(TOKEN),
    "the archive's contents reached the model and came back",
  );
});

await test("an ordinary archive still reaches the model through stream()", async () => {
  requireLive();
  const fixture = writeNormalGz(path.join(dir, "normal.gz"), TOKEN);
  const nl = new NeuroLink();
  const streamed = await nl.stream({
    input: {
      text: "What is the access code in the attached file? Reply with only the digits.",
      files: [fixture],
    },
    provider: PROVIDER,
    maxTokens: 128,
    timeout: 120_000,
  });
  let acc = "";
  for await (const chunk of streamed.stream as AsyncIterable<{
    content?: string;
  }>) {
    acc += chunk.content ?? "";
  }
  assert(
    acc.includes(TOKEN),
    "the archive's contents reached the model over the streaming path",
  );
});

try {
  fs.rmSync(dir, { recursive: true, force: true });
} catch {
  /* ignore */
}

await runSuite();
