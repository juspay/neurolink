#!/usr/bin/env tsx
/**
 * Continuous Test Suite: archives reach the model.
 *
 * Attaches an ordinary archive and requires its contents to come back through
 * `generate()` and `stream()`. The archive paths apply a size limit while
 * inflating; this suite is what fails if that limit is ever tightened into
 * refusing legitimate input.
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
import { writeNormalGz } from "./helpers/archiveBombFixtures.js";
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

try {
  fs.rmSync(dir, { recursive: true, force: true });
} catch {
  /* ignore */
}

await runSuite();
