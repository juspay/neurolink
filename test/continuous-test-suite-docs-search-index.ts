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
 * Two groups of cases load a plugin helper (`headingId.js`, `truncate.js`)
 * directly instead of reading the artifact. That is the determinism exception
 * to CLAUDE.md rule 15: both are pure functions of a string, and the cases need
 * inputs no docs page can be made to contain on demand (a sentence end exactly
 * at the limit, an abbreviation's dot as the last sentence end that fits, a
 * 100-character unbroken token, a surrogate pair astride the cut). They are
 * dependency-free so the suite can load them without the docs site's packages.
 *
 * Run: pnpm run test:docs-search-index
 */

import { readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
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

// A heading written `## Title {#custom-id}` is anchored at `#custom-id` by
// Docusaurus and its text is `Title`. The plugin used to slug the whole line,
// so the record's title kept the literal `{#custom-id}` and its link pointed at
// a fragment the page does not have.
await test("a heading's explicit {#id} is its anchor and not part of its title", () => {
  const docPath = "docs/getting-started/providers/above-dev.md";
  const source = readFileSync(path.join(ROOT, docPath), "utf8");
  const heading = "## Tools & structured output — a documented caveat";
  assert(
    source.includes(`${heading} {#tools-and-structured-output}`),
    `precondition: ${docPath} no longer has that heading with that explicit id; pick another`,
  );
  const page = records.filter((r) =>
    r.url.startsWith("/docs/getting-started/providers/above-dev#"),
  ) as Array<SearchRecord & { title: string }>;
  const record = page.find(
    (r) => r.title === "Tools & structured output — a documented caveat",
  );
  if (record === undefined) {
    throw new Error(
      "the heading's record is missing, or its title still carries the {#id}",
    );
  }
  assert(
    record.url ===
      "/docs/getting-started/providers/above-dev#tools-and-structured-output",
    `the record links to ${record.url} instead of the heading's explicit id`,
  );
  const leaked = (records as Array<SearchRecord & { title: string }>).filter(
    (r) => /\{#[A-Za-z0-9_-]+\}\s*$/.test(r.title),
  );
  assert(
    leaked.length === 0,
    `${leaked.length} record title(s) still end in a literal {#id}, for example "${leaked[0]?.title}"`,
  );
});

// The site loads every record with MiniSearch.addAll, which throws on a repeated
// id, and the hook then treats the whole index as failed to load. An explicit
// {#id} is used as written, so it can equal another heading's auto-slug on the
// same page; the records must still get distinct ids.
await test("every record has a distinct objectID", () => {
  const seen = new Map<string, string>();
  const repeats: string[] = [];
  for (const r of records as Array<SearchRecord & { objectID: string }>) {
    const earlier = seen.get(r.objectID);
    if (earlier !== undefined) {
      repeats.push(`${r.url} (also ${earlier})`);
    } else {
      seen.set(r.objectID, r.url);
    }
  }
  assert(
    repeats.length === 0,
    `${repeats.length} record(s) repeat an objectID, for example ${repeats[0]}`,
  );
});

// The plugin reads an explicit id the way Docusaurus does: any characters
// except `{#` and `}`, ending the heading at the brace. A narrower pattern left
// `## API {#api.v2}` with the literal id in its title and a slugged anchor.
type HeadingIdParser = (heading: string) => {
  text: string;
  id: string | undefined;
};
const requireFromHere = createRequire(import.meta.url);
const { parseHeadingId } = requireFromHere(
  path.join(
    ROOT,
    "docs-site",
    "plugins",
    "docusaurus-plugin-search-index",
    "headingId.js",
  ),
) as { parseHeadingId: HeadingIdParser };

await test("an explicit heading id may contain dots, non-ASCII and spaces", () => {
  const cases: Array<[string, string | undefined, string]> = [
    ["API {#api.v2}", "api.v2", "API"],
    ["Café {#café}", "café", "Café"],
    ["Title {#a b}", "a b", "Title"],
    [
      "Tools & structured output {#tools-and-structured-output}",
      "tools-and-structured-output",
      "Tools & structured output",
    ],
    ["Plain heading", undefined, "Plain heading"],
    ["Title {#id}  ", undefined, "Title {#id}  "],
    ["Title {#}", undefined, "Title {#}"],
    ["Title {#a}b}", undefined, "Title {#a}b}"],
  ];
  for (const [heading, id, text] of cases) {
    const got = parseHeadingId(heading);
    assert(
      got.id === id && got.text === text,
      `"${heading}" parsed to id ${JSON.stringify(got.id)} / text ${JSON.stringify(got.text)}, expected ${JSON.stringify(id)} / ${JSON.stringify(text)}`,
    );
  }
});

// Docusaurus is the source of truth for what counts as an explicit id. When the
// docs site's packages are installed, check the plugin's parser against
// Docusaurus's own on the same lines; without them the fixed cases above still
// run.
await test("the plugin's heading-id parser agrees with Docusaurus's", () => {
  const pnpmStore = path.join(ROOT, "docs-site", "node_modules", ".pnpm");
  let entries: string[];
  try {
    entries = readdirSync(pnpmStore);
  } catch {
    return;
  }
  const dir = entries.find((e) => e.startsWith("@docusaurus+utils@"));
  if (dir === undefined) {
    return;
  }
  const { parseMarkdownHeadingId } = requireFromHere(
    path.join(
      pnpmStore,
      dir,
      "node_modules",
      "@docusaurus",
      "utils",
      "lib",
      "markdownUtils.js",
    ),
  ) as { parseMarkdownHeadingId: HeadingIdParser };
  const lines = [
    "API {#api.v2}",
    "Café {#café}",
    "Title {#a b}",
    "Title {#id}  ",
    "Title {#id}\t",
    "Title {#}",
    "Title {#a}b}",
    "Title {#a{#b}",
    "Plain heading",
    "batch <file> {#batch}",
  ];
  for (const line of lines) {
    const ours = parseHeadingId(line);
    const theirs = parseMarkdownHeadingId(line);
    assert(
      ours.id === theirs.id && ours.text === theirs.text,
      `"${line}": the plugin read id ${JSON.stringify(ours.id)}, Docusaurus read ${JSON.stringify(theirs.id)}`,
    );
  }
});

// The plugin caps each section's text at 2000 characters. A bare slice ended
// the XOR guide's "Limits" record on "On t", half a word, so the index served
// text that stopped mid-air. This reads the artifact the site serves.
await test("a section the cap had to cut ends on a sentence, not mid-word", () => {
  const docPath = "docs/getting-started/providers/xor.md";
  const source = readFileSync(path.join(ROOT, docPath), "utf8");
  assert(
    source.includes("**A proxy may cap parallel requests.**"),
    `precondition: ${docPath} no longer has the sentence the cut lands after; pick another section`,
  );
  const record = records.find(
    (r) => r.url === "/docs/getting-started/providers/xor#limits",
  );
  if (record === undefined) {
    throw new Error("the XOR Limits section has no record in the index");
  }
  assert(
    record.content.length >= 1900,
    "precondition: the XOR Limits record is no longer near the cap, so this case proves nothing; pick a longer section",
  );
  assert(
    record.content.length <= 2000,
    "a section record is longer than the 2000-character cap",
  );
  assert(
    /[.!?]["')\]]*$/.test(record.content),
    "the XOR Limits record still stops before the end of a sentence",
  );
});

type SectionTruncator = (text: string, max?: number) => string;
const loadTruncator = (): SectionTruncator => {
  try {
    return (
      requireFromHere(
        path.join(
          ROOT,
          "docs-site",
          "plugins",
          "docusaurus-plugin-search-index",
          "truncate.js",
        ),
      ) as { truncateAtBoundary: SectionTruncator }
    ).truncateAtBoundary;
  } catch {
    throw new Error("the plugin's truncation helper could not be loaded");
  }
};

await test("the truncation helper cuts at a sentence, then a word, and bounds an unbroken run", () => {
  const truncate = loadTruncator();
  const cases: Array<[string, string, number, string]> = [
    ["text within the limit is returned whole", "short text", 40, "short text"],
    [
      "a sentence end in the kept half is preferred",
      "First sentence ends here. Second sentence is long.",
      40,
      "First sentence ends here.",
    ],
    [
      "with no sentence end in the kept half the cut falls on a word",
      "Ok. alpha beta gamma delta epsilon zeta eta theta iota",
      40,
      "Ok. alpha beta gamma delta epsilon zeta",
    ],
    [
      "an unbroken run is cut at the limit",
      "x".repeat(100),
      40,
      "x".repeat(40),
    ],
    [
      "a surrogate pair is never split",
      "x".repeat(39) + "\u{1F600}" + "tail",
      40,
      "x".repeat(39),
    ],
    [
      "a sentence end exactly at the limit is kept",
      "a".repeat(39) + ". more words follow here",
      40,
      "a".repeat(39) + ".",
    ],
  ];
  for (const [label, input, max, expected] of cases) {
    assert(
      truncate(input, max) === expected,
      `${label}: the helper returned a different cut than expected`,
    );
  }
  const long = truncate("word ".repeat(1000));
  assert(
    long.length <= 2000 && long.length > 1900 && !/\s$/.test(long),
    "the default limit should cap at 2000 and not end on whitespace",
  );
});

// The cut prefers the last sentence end that fits. The dot that closes "e.g."
// or "vs." is followed by a space like a real one, so it used to win and leave a
// section ending on "... for example, e.g." with the example cut off.
await test("the truncation helper does not end a section on an abbreviation", () => {
  const truncate = loadTruncator();
  const lead = "Alpha beta gamma delta epsilon.";
  // Each input ends its kept part on the abbreviation, with the limit set to
  // that exact length, so the abbreviation's dot is the last candidate that fits.
  const endingOn = (
    label: string,
    clause: string,
    expected: string,
    tail = " the fast one here",
  ): [string, string, number, string] => {
    const kept = `${lead} ${clause}`;
    return [label, kept + tail, kept.length, expected];
  };
  const cases: Array<[string, string, number, string]> = [
    endingOn("e.g. is not a sentence end", "Use it, e.g.", lead),
    endingOn("i.e. is not a sentence end", "Use it, i.e.", lead),
    endingOn("a capitalised E.g. is not a sentence end", "Use it, E.g.", lead),
    endingOn(
      "e.g. inside brackets is not a sentence end",
      "Use it (e.g.)",
      lead,
    ),
    endingOn("cf. is not a sentence end", "Compare it, cf.", lead),
    endingOn("vs. is not a sentence end", "Slow vs.", lead),
    endingOn("approx. is not a sentence end", "It takes approx.", lead),
    endingOn("incl. is not a sentence end", "All of them incl.", lead),
    endingOn("resp. is not a sentence end", "Slow and fast, resp.", lead),
    [
      "with no earlier sentence end the cut falls on a word, not after e.g.",
      "Alpha beta gamma delta epsilon zeta eta, e.g. theta iota kappa lambda mu nu",
      56,
      "Alpha beta gamma delta epsilon zeta eta, e.g. theta iota",
    ],
    endingOn(
      "etc. before a capitalised word still ends a sentence",
      "Use a, b, etc.",
      `${lead} Use a, b, etc.`,
      " Then more words follow",
    ),
    endingOn(
      "etc. before a lowercase word does not end a sentence",
      "Use a, b, etc.",
      lead,
      " and more words follow",
    ),
    endingOn(
      "etc. at the end of the text still ends a sentence",
      "Use a, b, etc.",
      `${lead} Use a, b, etc.`,
      " ".repeat(20),
    ),
    endingOn(
      "etc inside a longer word is not the abbreviation",
      "Use a, fetc.",
      `${lead} Use a, fetc.`,
      " and more words follow",
    ),
    endingOn(
      "vs at the end of a longer word is not the abbreviation",
      "Read the CSVs.",
      `${lead} Read the CSVs.`,
    ),
    endingOn(
      "a dot inside 5.6 or v1.2 is never a sentence end",
      "Use v5.6 or v1.",
      lead,
      "2 here today",
    ),
  ];
  for (const [label, input, max, expected] of cases) {
    assert(
      truncate(input, max) === expected,
      `${label}: the helper returned a different cut than expected`,
    );
  }
});

await runSuite();
