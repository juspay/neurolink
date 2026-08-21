/**
 * Docs MCP server — regression suite.
 *
 * The `neurolink docs` MCP server has now been broken THREE separate times by
 * commits that had nothing to do with documentation, each time silently:
 *
 *   1. 66c45592 (observability work)  — dropped the DocsCommandFactory
 *                                       registration from src/cli/parser.ts.
 *   2. bd51c31c (dependency cleanup)  — removed `minisearch`, judging it unused
 *                                       because it is only imported by the
 *                                       shipped docs-site/mcp-server/search.js,
 *                                       which no tsconfig or lint scope covers.
 *   3. 150ac851 + 3a8086b8            — repeated both of the above, undoing the
 *      (dependency cleanup again)       fix that 27773c6a had just landed.
 *
 * Every one of those shipped to npm. The feature has no other coverage: the
 * mcp-server directory is excluded from every project tsconfig, ESLint does not
 * lint it, and no other suite drives the command. This file is that coverage.
 *
 * Deliberately requires NO provider credentials. The docs server indexes a
 * static JSON file and speaks MCP over stdio — it never calls a model. Gating
 * this behind credentials is what made the archive/office security suites
 * useless in CI, and the same trap must not be repeated here.
 */
import "dotenv/config";
import { defineSuite, assert, runCLI } from "./helpers/harness.js";

const { test, runSuite, section } = defineSuite("Docs MCP server", {
  perTestTimeoutMs: 120_000,
});

section("Command registration");

await test("the docs command is registered on the CLI", async () => {
  const res = await runCLI(["--help"], { timeoutMs: 60_000 });
  const combined = `${res.stdout}${res.stderr}`;
  const registered = /\bdocs\b/.test(combined);
  if (!registered) {
    // Log the payload for a human, but keep it OUT of the assertion message:
    // defineSuite downgrades a throw to SKIP when the message matches
    // isExpectedProviderError(), which would turn this failure green.
    console.log("[debug] neurolink --help output:\n" + combined);
  }
  assert(
    registered,
    "docs command missing from CLI help — DocsCommandFactory is likely unregistered in src/cli/parser.ts",
  );
});

await test("the docs command resolves rather than suggesting another", async () => {
  const res = await runCLI(["docs", "--help"], { timeoutMs: 60_000 });
  const combined = `${res.stdout}${res.stderr}`;
  const unknown = /did you mean/i.test(combined);
  if (unknown) {
    console.log("[debug] neurolink docs --help output:\n" + combined);
  }
  assert(
    !unknown,
    "neurolink docs resolved to an unknown-command suggestion instead of the docs command",
  );
});

section("Runtime dependency and index");

await test("the server starts and indexes a non-zero number of documents", async () => {
  // The server prints its startup banner before it blocks reading MCP frames
  // from stdin, and never exits on its own. `stopWhen` terminates it as soon
  // as the outcome is known — either the banner or a module-resolution
  // failure — so the suite does not sit out the timeout on every run. The
  // timeout remains only as the upper bound for a server that prints neither.
  const res = await runCLI(["docs"], {
    timeoutMs: 30_000,
    stopWhen: /\d+\s+docs indexed|ERR_MODULE_NOT_FOUND|Cannot find package/,
  });
  const combined = `${res.stdout}${res.stderr}`;

  // A missing runtime dependency surfaces here as a module-resolution failure.
  const moduleMissing = /ERR_MODULE_NOT_FOUND|Cannot find package/.test(
    combined,
  );
  if (moduleMissing) {
    console.log("[debug] docs server startup output:\n" + combined);
  }
  assert(
    !moduleMissing,
    "docs server failed to resolve a runtime dependency — minisearch is likely missing from package.json dependencies",
  );

  const banner = combined.match(/(\d+)\s+docs indexed/);
  if (!banner) {
    console.log("[debug] docs server startup output:\n" + combined);
  }
  assert(
    banner !== null,
    "docs server did not report an indexed-document count on startup",
  );

  const count = Number(banner?.[1] ?? 0);
  assert(
    count > 0,
    "docs server reported zero indexed documents — the search index shape likely no longer matches the loader",
  );
});

await runSuite();
