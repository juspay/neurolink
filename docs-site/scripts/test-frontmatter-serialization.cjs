/**
 * Real docs-sync entry integration over twelve ordinary synthetic documents.
 * Copies the complete producer and support file into an owned temporary tree;
 * never imports or substitutes a private serialization/transform function.
 */
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const matter = require("gray-matter");

const repo = path.resolve(__dirname, "../..");
const fixturesPath = path.join(
  repo,
  "test/fixtures/serialization/ordinary-strings.json",
);
const fixtures = JSON.parse(fs.readFileSync(fixturesPath, "utf8")).fixtures;
assert.equal(fixtures.length, 12, "All twelve ordinary controls are required");
const sourceEntry = path.join(repo, "docs-site/scripts/sync-docs.ts");
const sourceSupport = path.join(repo, "docs-site/scripts/gitChangeDetector.ts");
const docsPackage = path.join(repo, "docs-site/package.json");
const rootPackage = path.join(repo, "package.json");
const rootTsconfig = path.join(repo, "tsconfig.json");
const docsTsconfig = path.join(repo, "docs-site/tsconfig.json");
const docsModules = path.join(repo, "docs-site/node_modules");
assert.ok(
  fs.existsSync(docsModules),
  "Owned docs dependencies must be installed before real-entry proof",
);
const tsxEntry = require.resolve("tsx/cli");
const hash = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const before = {
  entry: hash(fs.readFileSync(sourceEntry)),
  support: hash(fs.readFileSync(sourceSupport)),
  docsPackage: hash(fs.readFileSync(docsPackage)),
  rootPackage: hash(fs.readFileSync(rootPackage)),
  rootTsconfig: hash(fs.readFileSync(rootTsconfig)),
  docsTsconfig: hash(fs.readFileSync(docsTsconfig)),
  fixtures: hash(fs.readFileSync(fixturesPath)),
};
const scratch = fs.mkdtempSync(
  path.join(os.tmpdir(), "neurolink-serialization-real-docs-"),
);
const sourceDocs = path.join(scratch, "docs");
const mirrorDocsSite = path.join(scratch, "docs-site");
const targetDocs = path.join(mirrorDocsSite, "docs");
const mirrorScripts = path.join(mirrorDocsSite, "scripts");
const results = [];
let command = null;
let outcomeError = null;

function errorRecord(error) {
  return {
    name: error.name,
    message: error.message,
    stack: error.stack,
  };
}

function run() {
  fs.mkdirSync(sourceDocs, { recursive: true });
  fs.mkdirSync(mirrorScripts, { recursive: true });
  fs.copyFileSync(sourceEntry, path.join(mirrorScripts, "sync-docs.ts"));
  fs.copyFileSync(
    sourceSupport,
    path.join(mirrorScripts, "gitChangeDetector.ts"),
  );
  fs.copyFileSync(docsPackage, path.join(mirrorDocsSite, "package.json"));
  fs.copyFileSync(rootPackage, path.join(scratch, "package.json"));
  fs.copyFileSync(rootTsconfig, path.join(scratch, "tsconfig.json"));
  fs.copyFileSync(docsTsconfig, path.join(mirrorDocsSite, "tsconfig.json"));
  fs.symlinkSync(
    fs.realpathSync(docsModules),
    path.join(mirrorDocsSite, "node_modules"),
    "dir",
  );
  assert.equal(
    hash(fs.readFileSync(path.join(mirrorScripts, "sync-docs.ts"))),
    before.entry,
  );
  assert.equal(
    hash(fs.readFileSync(path.join(mirrorScripts, "gitChangeDetector.ts"))),
    before.support,
  );

  for (const fixture of fixtures) {
    assert.match(fixture.id, /^[a-z_]+$/);
    assert.equal(typeof fixture.value, "string");
    assert.equal(
      Buffer.from(fixture.value, "utf8").toString("hex"),
      fixture.utf8Hex,
    );
    const filename = `serialization-${fixture.id.replace(/_/g, "-")}.md`;
    const input = `---\n${JSON.stringify(fixture.docsData, null, 2)}\n---\n${fixture.docsBody}`;
    assert.deepStrictEqual(matter(input).data, fixture.docsData);
    assert.equal(matter(input).content, fixture.docsBody);
    fs.writeFileSync(path.join(sourceDocs, filename), input, "utf8");
  }

  const argv = [tsxEntry, path.join(mirrorScripts, "sync-docs.ts")];
  const spawned = spawnSync(process.execPath, argv, {
    cwd: mirrorDocsSite,
    env: { ...process.env, AUTO_BADGE_DETECTION: "false" },
    encoding: "utf8",
    timeout: 60000,
    maxBuffer: 4 * 1024 * 1024,
  });
  command = {
    executable: process.execPath,
    argv,
    status: spawned.status,
    signal: spawned.signal,
    error: spawned.error ? errorRecord(spawned.error) : null,
    stdout: spawned.stdout,
    stderr: spawned.stderr,
    timeoutMs: 60000,
    copiedCompleteEntry: true,
    sourceDocs,
    targetDocs,
  };
  assert.equal(spawned.error, undefined, "Real docs entry did not complete");
  assert.equal(spawned.signal, null, "Real docs entry was terminated");
  assert.equal(spawned.status, 0, "Real docs entry exited unsuccessfully");
  assert.match(spawned.stdout, /Successfully processed: 12 files/);
  assert.doesNotMatch(
    spawned.stdout + spawned.stderr,
    /Error processing|Errors: [1-9]/,
  );
  assert.deepStrictEqual(
    fs.readdirSync(targetDocs).sort(),
    fixtures
      .map((fixture) => `serialization-${fixture.id.replace(/_/g, "-")}.md`)
      .sort(),
    "The real entry did not write exactly the twelve owned documents",
  );

  for (const fixture of fixtures) {
    const filename = `serialization-${fixture.id.replace(/_/g, "-")}.md`;
    const output = fs.readFileSync(path.join(targetDocs, filename), "utf8");
    const result = {
      id: fixture.id,
      filename,
      expectedData: fixture.docsData,
      expectedBodyUtf8Hex: Buffer.from(
        `\n${fixture.docsBody}`,
        "utf8",
      ).toString("hex"),
      output,
      passed: false,
      originalError: null,
    };
    try {
      const parsed = matter(output);
      result.actualData = parsed.data;
      result.actualBodyUtf8Hex = Buffer.from(parsed.content, "utf8").toString(
        "hex",
      );
      assert.deepStrictEqual(parsed.data, fixture.docsData);
      assert.equal(
        result.actualBodyUtf8Hex,
        result.expectedBodyUtf8Hex,
        "The existing one-blank-line frontmatter framing changed body bytes",
      );
      assert.equal(typeof parsed.data.sidebar_position, "number");
      assert.equal(typeof parsed.data.draft, "boolean");
      assert.equal(typeof parsed.data.hide_title, "boolean");
      assert.ok(
        parsed.data.keywords.every((value) => typeof value === "string"),
      );
      assert.ok(parsed.data.tags.every((value) => typeof value === "string"));
      assert.equal(typeof parsed.data.pagination_label, "string");
      result.passed = true;
    } catch (error) {
      result.originalError = errorRecord(error);
    }
    results.push(result);
  }
  assert.equal(results.length, 12);
  assert.equal(
    results.filter((result) => result.passed).length,
    12,
    "One or more real generated documents lost metadata or body fidelity",
  );
}

try {
  run();
} catch (error) {
  outcomeError = errorRecord(error);
  process.exitCode = 1;
} finally {
  const after = {
    entry: hash(fs.readFileSync(sourceEntry)),
    support: hash(fs.readFileSync(sourceSupport)),
    docsPackage: hash(fs.readFileSync(docsPackage)),
    rootPackage: hash(fs.readFileSync(rootPackage)),
    rootTsconfig: hash(fs.readFileSync(rootTsconfig)),
    docsTsconfig: hash(fs.readFileSync(docsTsconfig)),
    fixtures: hash(fs.readFileSync(fixturesPath)),
  };
  if (JSON.stringify(before) !== JSON.stringify(after)) {
    process.exitCode = 1;
    outcomeError = {
      name: "SourceDriftError",
      message: "Real-entry proof changed the owning source/package/fixture",
    };
  }
  fs.rmSync(scratch, { recursive: true, force: true });
  const report = {
    kind: "real docs-sync serialization fixture outcomes",
    producerBefore: before,
    producerAfter: after,
    command,
    results,
    summary: {
      required: 12,
      observed: results.length,
      passed: results.filter((result) => result.passed).length,
      failed: results.filter((result) => !result.passed).length,
      unavailable: 12 - results.length,
      skipped: 0,
    },
    originalError: outcomeError,
    ownedScratchRemoved: !fs.existsSync(scratch),
    dependencyVersions: {
      grayMatter: require("gray-matter/package.json").version,
      tsx: require("tsx/package.json").version,
    },
  };
  const reportArg = process.argv.find((arg) => arg.startsWith("--report="));
  if (reportArg) {
    fs.writeFileSync(
      reportArg.slice("--report=".length),
      JSON.stringify(report, null, 2) + "\n",
      { flag: "wx" },
    );
  }
  console.log(JSON.stringify(report));
}
