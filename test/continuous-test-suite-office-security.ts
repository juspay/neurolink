#!/usr/bin/env tsx
/**
 * Continuous Test Suite: Office documents reach the model.
 *
 * Attaches an ordinary .docx and requires its text to come back through
 * `generate()`. The Office paths bound how far a zip member may inflate; this
 * suite is what fails if that bound is ever tightened into refusing legitimate
 * documents.
 *
 * ## What used to be here
 *
 * This suite also asserted the *bounds* themselves across Word, Excel,
 * PowerPoint and OpenDocument — that a zip member declaring a vast
 * uncompressed size could not force an unbounded inflate. Each format's bomb
 * ran in a fresh process and the test read `process.resourceUsage().maxRSS`,
 * because a limit checked after the buffer exists is arithmetically correct
 * and useless, and the two cases are indistinguishable from the outcome alone.
 *
 * They were removed with the unit suites (CLAUDE.md rule 15) — measuring one
 * processor's peak memory requires importing that processor, and the same
 * fixture through `generate()` would measure the whole SDK and need
 * credentials. Nothing replaces them, so a regression that reintroduces an
 * unbounded inflate will not be caught here.
 *
 * Run: npx tsx test/continuous-test-suite-office-security.ts
 */

import "dotenv/config";
import * as fs from "node:fs";
import * as path from "node:path";
import { defineSuite, assert, tempDir, Skip } from "./helpers/harness.js";
import { docxMembers, writeOfficeZip } from "./helpers/officeBombFixtures.js";
import { NeuroLink } from "../dist/index.js";

const { test, runSuite } = defineSuite("Office document delivery");

const dir = tempDir("neurolink-office-security-");

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
    default:
      return false;
  }
}

await test("an ordinary Word document still reaches the model through generate()", async () => {
  if (!hasCredentials()) {
    throw new Skip(
      `no credentials for provider "${PROVIDER}" — skipping live assertion`,
    );
  }
  const fixture = await writeOfficeZip(
    path.join(dir, "ok.docx"),
    docxMembers(TOKEN),
  );
  const result = await new NeuroLink().generate({
    input: {
      text: "What is the access code in the attached document? Reply with only the digits.",
      files: [fixture],
    },
    provider: PROVIDER,
    maxTokens: 128,
    timeout: 120_000,
  });
  assert(
    (result.content ?? "").includes(TOKEN),
    "the document's contents reached the model and came back",
  );
});

try {
  fs.rmSync(dir, { recursive: true, force: true });
} catch {
  /* ignore */
}

await runSuite();
