#!/usr/bin/env tsx
/**
 * Continuous Test Suite: archives reach the model.
 *
 * Attaches an ordinary archive and requires its contents to come back through
 * `generate()` and `stream()`. The archive paths apply a size limit while
 * inflating; this suite is what fails if that limit is ever tightened into
 * refusing legitimate input, and, for a gzip and a declared-size-0 bomb, if the
 * limit stops being applied while the data is inflated.
 *
 * ## Attack coverage
 *
 * Two real attacks are covered end-to-end, both without live provider
 * credentials — a local loopback HTTP stand-in (`mockChatServer.ts`) plays
 * the model, so these run unconditionally instead of behind `requireLive()`:
 *
 *   - **zip-slip / path traversal**: `ArchiveProcessor.hasPathTraversal()`
 *     skips an entry named e.g. `../../../../tmp/evil.txt` rather than
 *     failing the whole archive. The test proves the sibling entry still
 *     reaches the outbound request while the traversal entry's content never
 *     does — by inspecting the request body the mock server actually
 *     received, not by trusting a model to report back correctly.
 *   - **decompression-ratio bomb**: a single entry with honest headers whose
 *     declared ratio exceeds `ARCHIVE_SECURITY.MAX_COMPRESSION_RATIO`.
 *     Empirically (see the test body) `ArchiveProcessor` does **not** throw
 *     here — `FileDetector.formatInformativePlaceholder` turns the failed
 *     processor result into an inert "Could not extract content" placeholder
 *     that still reaches the model, the same degrade-gracefully path used for
 *     every other processor failure. The invariant that actually matters —
 *     the bomb's inflated bytes are never serialized into the outbound
 *     request — is what the test asserts, via a distinguishing marker that
 *     must not appear in the captured request body.
 *
 * ## Bound coverage: peak memory, measured in a child process
 *
 * A size limit checked against the finished buffer is arithmetically correct
 * and useless: the allocation it exists to prevent has already happened, and
 * the verdict looks identical either way. Two cases therefore read
 * `process.resourceUsage().maxRSS` in a fresh process
 * (`helpers/boundedGenerateChild.ts`, which imports only `dist/`), after a
 * warm-up call so one-off module loading is not charged to the bomb:
 *
 *   - **gzip bomb through `generate()`**: 400 MB of zeros in ~400 KB of gzip.
 *   - **zip entry declaring size 0, through the `./files` export**: the
 *     `extract_file_content` tool asked for an entry whose header says 0 bytes
 *     and whose DEFLATE stream inflates to 400 MB. One attacker-chosen number
 *     defeats both the caller's `size > limit` check and adm-zip's own
 *     `maxOutputLength`, so the bound has to be the reader's. This one cannot
 *     go through `generate()`: `ArchiveProcessor` drops size-0 entries when it
 *     reads eagerly, so such an entry is only ever opened on demand.
 *
 * Why memory and not "the inflated bytes never reach the request": for the gzip
 * case that assertion is true with the bound deleted. `ArchiveProcessor`
 * re-checks the ratio and the length after inflating, so an unbounded 400 MB
 * gzip is still refused, after it was allocated, and the request is
 * byte-identical. Peak memory is the one observable that differs. Calibration
 * (bounded against the bound removed from a scratch copy of `dist/`) is in
 * `helpers/boundedGenerateProbe.ts`.
 *
 * Each case is paired with an ordinary file of the same shape that goes through
 * the same child first, whose content must reach the request (or come back from
 * the tool). A bound that refuses everything would pass the memory assertion
 * alone. "The same shape" includes the compression method: the ordinary zip is
 * DEFLATED, because a STORED entry is copied out without being decoded and so
 * never reaches the bounded inflate.
 *
 * Not covered: a gzip-encoded HTTP response. `generate()` fetches a URL
 * attachment with `undici.request`, which does not decode `Content-Encoding`,
 * so the response arrives still compressed and meets the same gunzip bound as
 * the local `.gz` above; `BaseFileProcessor`'s own decode bound is not reachable
 * from it. Through the public `./processors` export it can be reached, but the
 * transport buffers about as much as the bomb itself (measured once at 435 MB
 * and 212 MB bounded for single and double encoding, against 1265 MB and 1213 MB
 * with the bounds removed), which is too heavy and too platform-dependent to
 * hold a default ceiling.
 *
 * Run: npx tsx test/continuous-test-suite-archive-security.ts
 */

import "dotenv/config";
import * as fs from "node:fs";
import * as path from "node:path";
import { defineSuite, assert, tempDir, Skip } from "./helpers/harness.js";
import {
  BOMB_MB,
  writeGzBomb,
  writeDeflatedZip,
  writeNormalGz,
  writeZeroDeclaredZip,
  writeZipSlipZip,
  writeRatioBombZip,
} from "./helpers/archiveBombFixtures.js";
import {
  assertBombRefusedInRequest,
  assertGrowthBounded,
  probeExtractEntry,
  probeGenerate,
} from "./helpers/boundedGenerateProbe.js";
import {
  startMockChatServer,
  mockOpenAICredentials,
} from "./helpers/mockChatServer.js";
import { NeuroLink } from "../dist/index.js";

const { test, runSuite } = defineSuite("Archive delivery");

const dir = tempDir("neurolink-archive-security-");

/** Hidden in the ordinary fixture; no prior, so it can only be read. */
const TOKEN = "84317";

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

await test("an ordinary archive still reaches the model through generate()", async () => {
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

const SAFE_MARKER = "SAFE_SIBLING_ENTRY_CONTENT";
const SLIP_MARKER = "SECRET_SLIPPED_ENTRY_CONTENT";

/**
 * A zip-slip entry name paired with the absolute path a naive extractor would
 * resolve it to.
 *
 * The two have to be derived from each other. This suite used to hard-code the
 * canary at `path.join(dir, "..", <name>)` while the entry itself traversed six
 * levels up into /tmp, so `!fs.existsSync(outside)` watched a location the
 * entry never pointed at. It could not have failed even against an extractor
 * that did write the file.
 *
 * The basename is unique per run because /tmp is shared: a canary left behind
 * by another run would fail this suite for a reason unrelated to the code under
 * test.
 */
function zipSlipCanary(label: string): { entry: string; resolved: string } {
  const entry = `../../../../../../tmp/juspay-zip-slip-${label}-${process.pid}.txt`;
  return { entry, resolved: path.resolve(dir, entry) };
}

/**
 * Assert the traversal entry was *detected and rejected*, not merely absent.
 *
 * Checking that SLIP_MARKER never appears is necessary but not sufficient: it
 * passes just as happily if the processor stopped reading archive entries at
 * all, or failed to open that entry by accident. The summary the processor
 * emits names the traversal as skipped and counts the surviving entries, so
 * assert on both — that is what distinguishes a deliberate strip from a
 * coincidence.
 *
 * Keep the payload out of these messages: defineSuite downgrades a throw to
 * SKIP when the text matches isExpectedProviderError().
 */
function assertTraversalRejected(body: string): void {
  assert(
    /Path traversal detected/.test(body) && /entry skipped/.test(body),
    "the processor did not report the path-traversal entry as detected and skipped",
  );
  assert(
    /Total entries:\**\s*1\b/.test(body),
    "the archive summary counted more than the one safe entry",
  );
}

await test("a zip-slip entry is stripped before the request leaves — generate()", async () => {
  const canary = zipSlipCanary("generate");
  const fixture = writeZipSlipZip(path.join(dir, "zip-slip-generate.zip"), [
    { name: "readme.txt", content: SAFE_MARKER },
    { name: canary.entry, content: SLIP_MARKER },
  ]);
  const server = await startMockChatServer();
  try {
    const nl = new NeuroLink();
    await nl.generate({
      input: {
        text: "Summarize the attached file.",
        files: [fixture],
      },
      provider: "openai",
      credentials: mockOpenAICredentials(server),
      maxTokens: 64,
      timeout: 30_000,
    });
    const body = server.getLastRequestBody() ?? "";
    assert(
      body.includes(SAFE_MARKER),
      "the sibling entry's content should have reached the outbound request body",
    );
    assert(
      !body.includes(SLIP_MARKER),
      "the path-traversal entry's content must never reach the outbound request body",
    );
    assertTraversalRejected(body);
    // Forward guard, not live coverage. ArchiveProcessor parses entries in
    // memory and makes no fs writes at all today, so this cannot fail against
    // the current implementation; it is here for the day an on-disk extraction
    // path is added. Watching the path the entry actually resolves to is what
    // makes it worth keeping.
    assert(
      !fs.existsSync(canary.resolved),
      "the path-traversal entry must never be written outside the archive's own directory",
    );
  } finally {
    await server.close();
    try {
      fs.rmSync(canary.resolved, { force: true });
    } catch {
      /* ignore */
    }
  }
});

await test("a zip-slip entry is stripped before the request leaves — stream()", async () => {
  const canary = zipSlipCanary("stream");
  const fixture = writeZipSlipZip(path.join(dir, "zip-slip-stream.zip"), [
    { name: "readme.txt", content: SAFE_MARKER },
    { name: canary.entry, content: SLIP_MARKER },
  ]);
  const server = await startMockChatServer();
  try {
    const nl = new NeuroLink();
    const streamed = await nl.stream({
      input: {
        text: "Summarize the attached file.",
        files: [fixture],
      },
      provider: "openai",
      credentials: mockOpenAICredentials(server),
      maxTokens: 64,
      timeout: 30_000,
    });
    for await (const _chunk of streamed.stream as AsyncIterable<unknown>) {
      // Draining is enough — the assertion is about the request already sent.
    }
    const body = server.getLastRequestBody() ?? "";
    assert(
      body.includes(SAFE_MARKER),
      "the sibling entry's content should have reached the outbound request body",
    );
    assert(
      !body.includes(SLIP_MARKER),
      "the path-traversal entry's content must never reach the outbound request body",
    );
    assertTraversalRejected(body);
    // Forward guard, not live coverage. ArchiveProcessor parses entries in
    // memory and makes no fs writes at all today, so this cannot fail against
    // the current implementation; it is here for the day an on-disk extraction
    // path is added. Watching the path the entry actually resolves to is what
    // makes it worth keeping.
    assert(
      !fs.existsSync(canary.resolved),
      "the path-traversal entry must never be written outside the archive's own directory",
    );
  } finally {
    await server.close();
    try {
      fs.rmSync(canary.resolved, { force: true });
    } catch {
      /* ignore */
    }
  }
});

const BOMB_MARKER = "ZIPBOMBMARKER_";

await test("a decompression-ratio bomb never reaches the request as inflated content — generate()", async () => {
  const fixture = writeRatioBombZip(
    path.join(dir, "ratio-bomb-generate.zip"),
    2,
    BOMB_MARKER,
  );
  const server = await startMockChatServer();
  try {
    const nl = new NeuroLink();
    let threw = false;
    try {
      await nl.generate({
        input: {
          text: "Summarize the attached file.",
          files: [fixture],
        },
        provider: "openai",
        credentials: mockOpenAICredentials(server),
        maxTokens: 64,
        timeout: 30_000,
      });
    } catch {
      threw = true;
    }
    if (threw) {
      assert(
        !server.wasCalled(),
        "if the bomb is rejected outright, no request should have reached the mock server",
      );
    } else {
      const body = server.getLastRequestBody() ?? "";
      assert(
        !body.includes(BOMB_MARKER),
        "the bomb's inflated marker must never be serialized into the outbound request body",
      );
      assert(
        body.length < 200_000,
        "the outbound request body must stay far below the bomb's declared inflated size",
      );
    }
  } finally {
    await server.close();
  }
});

await test("a decompression-ratio bomb never reaches the request as inflated content — stream()", async () => {
  const fixture = writeRatioBombZip(
    path.join(dir, "ratio-bomb-stream.zip"),
    2,
    BOMB_MARKER,
  );
  const server = await startMockChatServer();
  try {
    const nl = new NeuroLink();
    let threw = false;
    try {
      const streamed = await nl.stream({
        input: {
          text: "Summarize the attached file.",
          files: [fixture],
        },
        provider: "openai",
        credentials: mockOpenAICredentials(server),
        maxTokens: 64,
        timeout: 30_000,
      });
      for await (const _chunk of streamed.stream as AsyncIterable<unknown>) {
        // Draining is enough — the assertion is about the request already sent.
      }
    } catch {
      threw = true;
    }
    if (threw) {
      assert(
        !server.wasCalled(),
        "if the bomb is rejected outright, no request should have reached the mock server",
      );
    } else {
      const body = server.getLastRequestBody() ?? "";
      assert(
        !body.includes(BOMB_MARKER),
        "the bomb's inflated marker must never be serialized into the outbound request body",
      );
      assert(
        body.length < 200_000,
        "the outbound request body must stay far below the bomb's declared inflated size",
      );
    }
  } finally {
    await server.close();
  }
});

await test("a gzip bomb is inflated under the decoder bound, not in full — generate()", async () => {
  // Built before the child starts so its own cost is never charged to the
  // code under test; streamed through the compressor so building it does not
  // allocate the payload either.
  const warmup = writeNormalGz(path.join(dir, "normal.gz"), TOKEN);
  const bomb = await writeGzBomb(path.join(dir, "bomb.gz"), BOMB_MB);
  const server = await startMockChatServer();
  try {
    const result = await probeGenerate(warmup, bomb, server.baseURL);
    assertGrowthBounded(result);
    assertBombRefusedInRequest(result, server.getAllRequestBodies(), TOKEN);
  } finally {
    await server.close();
  }
});

await test("a ZIP entry declaring size 0 is inflated under the reader's bound — extract_file_content", async () => {
  // The names are fixed by the fixture builders: writeDeflatedZip stores
  // "deflated.txt" and writeZeroDeclaredZip stores "payload.txt". The warm-up is
  // DEFLATED because a stored entry is copied out and never reaches the bounded
  // inflate, which would let a bound that refuses every inflate pass the pairing.
  const warmup = writeDeflatedZip(
    path.join(dir, "deflated.zip"),
    `The access code is ${TOKEN}.\n`,
  );
  const bomb = await writeZeroDeclaredZip(
    path.join(dir, "declared-zero.zip"),
    BOMB_MB,
  );
  const result = await probeExtractEntry(
    { file: warmup, entry: "deflated.txt" },
    { file: bomb, entry: "payload.txt" },
  );
  assertGrowthBounded(result);
  assert(
    result.warmupDetail.includes(TOKEN),
    "the ordinary entry's text did not come back from the tool, so a bound that refuses everything would pass",
  );
  assert(
    result.outcome === "completed",
    "the tool call for the bomb entry failed instead of returning a verdict",
  );
  // With the bound removed the same entry is reported as corrupt, because the
  // CRC it declares (0) does not match what was inflated. Naming the size limit
  // is what shows the inflate was stopped rather than finished.
  assert(
    /too large/i.test(result.detail),
    "the refusal does not name the size limit",
  );
});

try {
  fs.rmSync(dir, { recursive: true, force: true });
} catch {
  /* ignore */
}

await runSuite();
