#!/usr/bin/env tsx
/**
 * Continuous Test Suite: archives reach the model.
 *
 * Attaches an ordinary archive and requires its contents to come back through
 * `generate()` and `stream()`. The archive paths apply a size limit while
 * inflating; this suite is what fails if that limit is ever tightened into
 * refusing legitimate input.
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
 * Not covered here: the declared-size-lie bypass (`writeZeroDeclaredZip` —
 * entry claims size 0, real inflate is huge). It is defended in depth by
 * `readZipEntryWithinLimit`'s own `maxOutputLength` bound
 * (`src/lib/processors/archive/zipEntryReader.ts`), but proving that bound
 * requires measuring peak RSS while importing the processor directly, which
 * rule 15 (end-to-end only) excludes from this suite.
 *
 * ## What used to be here
 *
 * This suite also asserted the *bounds* themselves — that a zip entry declaring
 * size 0, a gzip bomb, and a gzip-encoded HTTP response could not force an
 * unbounded inflate. Those probes ran in child processes and read
 * `process.resourceUsage().maxRSS`, because a limit checked against the
 * finished buffer is arithmetically correct and useless: the allocation it
 * exists to prevent has already happened, and the verdict looks identical
 * either way.
 *
 * They were removed with the unit suites (CLAUDE.md rule 15) — measuring the
 * peak memory of a processor requires importing that processor, and routing the
 * same fixture through `generate()` would measure the whole SDK and need
 * credentials. Nothing replaces them, so a regression that reintroduces an
 * unbounded inflate will not be caught here.
 *
 * Run: npx tsx test/continuous-test-suite-archive-security.ts
 */

import "dotenv/config";
import * as fs from "node:fs";
import * as path from "node:path";
import { defineSuite, assert, tempDir, Skip } from "./helpers/harness.js";
import {
  writeNormalGz,
  writeZipSlipZip,
  writeRatioBombZip,
} from "./helpers/archiveBombFixtures.js";
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

try {
  fs.rmSync(dir, { recursive: true, force: true });
} catch {
  /* ignore */
}

await runSuite();
