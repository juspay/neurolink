#!/usr/bin/env tsx
/**
 * Continuous Test Suite: the docs-site search index keeps inline code.
 *
 * The site's local search reads `docs-site/static/search-index.json`, which
 * the search-index plugin builds from the Markdown under `docs/`. Inline code
 * is where the searchable terms live — environment variables, commands, API
 * names — and the plugin used to delete every inline span outright, so a page
 * listing `OPENAI_API_KEY` could not be found by searching for it. Keeping the
 * text is not enough on its own: the plugin's later passes strip `<...>` as
 * HTML and `_..._` as emphasis, which would turn `--input-audio <file>` into
 * "--input-audio" and `OPENAI_API_KEY` into "OPENAIAPIKEY".
 *
 * This asserts on the generated artifact the site actually serves, not on the
 * plugin's internals. The Docs-site Artifacts check keeps that artifact equal
 * to a fresh build, so a regression in the plugin surfaces here once the index
 * is regenerated. Each anchor first checks that its source page still carries
 * the span, so an edited page fails as a stale anchor rather than passing.
 *
 * Run: pnpm run test:docs-search-index
 */

import { readFileSync } from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { assert, defineSuite } from "./helpers/harness.js";

const { test, runSuite } = defineSuite("Docs search index keeps inline code");

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

type SearchRecord = { url: string; content: string };

const records: SearchRecord[] = JSON.parse(
  readFileSync(
    path.join(ROOT, "docs-site", "static", "search-index.json"),
    "utf8",
  ),
);

function pageRecords(docPath: string): SearchRecord[] {
  const url = "/" + docPath.replace(/\.md$/, "");
  return records.filter((r) => r.url === url || r.url.startsWith(url + "#"));
}

function assertAnchor(docPath: string, span: string): SearchRecord[] {
  const source = readFileSync(path.join(ROOT, docPath), "utf8");
  assert(
    source.includes("`" + span + "`"),
    `precondition: ${docPath} no longer contains the anchor span; pick another`,
  );
  const page = pageRecords(docPath);
  assert(
    page.length > 0,
    `precondition: the index has no records for ${docPath}`,
  );
  return page;
}

await test("an environment variable in inline code is searchable, spelled exactly", () => {
  const page = assertAnchor("docs/features/rag.md", "OPENAI_API_KEY");
  assert(
    page.some((r) => r.content.includes("OPENAI_API_KEY")),
    "inline-code text was dropped from the page's index records",
  );
  assert(
    !page.some((r) => r.content.includes("OPENAIAPIKEY")),
    "inline-code text reached the index with its underscores stripped as emphasis",
  );
});

// A span in body text, not a heading: headings become the record's title,
// which already kept code text, so only body content exercises the fix.
await test("a placeholder in angle brackets survives inside inline code", () => {
  const page = assertAnchor(
    "docs/features/audio-input.md",
    "--input-audio <file>",
  );
  assert(
    page.some((r) => r.content.includes("--input-audio <file>")),
    "an inline-code span lost its angle-bracket placeholder to the HTML pass",
  );
});

await test("no parking placeholder leaks into the index", () => {
  // The plugin parks inline code behind NUL-delimited indexes; a NUL left in
  // any record means a placeholder was never restored.
  const nul = String.fromCharCode(0);
  assert(
    !records.some((r) => r.content.includes(nul)),
    "a code-span placeholder was left in the generated index",
  );
});

await runSuite();
