#!/usr/bin/env node
/**
 * Determinism exception: this drives the real Docusaurus search-index plugin
 * against a fixed temporary corpus while varying the filesystem enumeration
 * order. A production docs build cannot reliably force both valid readdir
 * orders, so the controlled backend is what makes the regression repeatable.
 *
 * Breaks caught:
 * - removing the traversal sort makes two valid directory orders emit
 *   different bytes;
 * - restoring positional object IDs makes an earlier new document renumber
 *   every unchanged document after it;
 * - two files that compute the same URL (e.g. `tutorials.md` and
 *   `tutorials/index.md` both landing on `/docs/tutorials` because the
 *   plugin derives URLs from path, not from a `slug:` frontmatter override)
 *   must still get distinct objectIDs rather than colliding — a real
 *   instance of this crashed the docs MCP server's MiniSearch index with
 *   "duplicate ID" on the full corpus.
 */
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const createSearchIndexPlugin = require("../plugins/docusaurus-plugin-search-index/index.js");

function writeDoc(docsDir, relativePath, title, heading) {
  const filePath = path.join(docsDir, relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(
    filePath,
    `---\ntitle: ${title}\n---\n\n# ${heading}\n\n${title} body.\n`,
  );
}

async function generate(docsDir, outDir, reverseTraversal = false) {
  const originalReaddirSync = fs.readdirSync;
  if (reverseTraversal) {
    fs.readdirSync = function reversedReaddirSync(dir, options) {
      const entries = originalReaddirSync.call(fs, dir, options);
      const resolved = path.resolve(String(dir));
      if (
        (resolved === docsDir || resolved.startsWith(`${docsDir}${path.sep}`)) &&
        Array.isArray(entries)
      ) {
        return [...entries].reverse();
      }
      return entries;
    };
  }

  try {
    const plugin = createSearchIndexPlugin(
      { siteDir: path.dirname(docsDir) },
      { docsDir, exclude: [] },
    );
    await plugin.postBuild({ outDir });
    return fs.readFileSync(path.join(outDir, "search-index.json"), "utf8");
  } finally {
    fs.readdirSync = originalReaddirSync;
  }
}

async function main() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "neurolink-search-index-"));
  const docsDir = path.join(root, "docs");
  try {
    writeDoc(docsDir, "zeta/second.md", "Second", "Second section");
    writeDoc(docsDir, "alpha/first.md", "First", "First section");

    const normal = await generate(docsDir, path.join(root, "normal"));
    const reversed = await generate(docsDir, path.join(root, "reversed"), true);
    const before = JSON.parse(normal);
    const secondIdsBefore = before
      .filter((entry) => entry.url.startsWith("/docs/zeta/second"))
      .map((entry) => entry.objectID);
    assert.equal(secondIdsBefore.length, 2, "fixture must index the document and section");

    writeDoc(docsDir, "aardvark/new.md", "New", "New section");
    const after = JSON.parse(
      await generate(docsDir, path.join(root, "after-insert")),
    );
    const secondIdsAfter = after
      .filter((entry) => entry.url.startsWith("/docs/zeta/second"))
      .map((entry) => entry.objectID);
    assert.deepEqual(
      secondIdsAfter,
      secondIdsBefore,
      "adding an earlier document must not renumber an unchanged document",
    );
    assert.equal(
      reversed,
      normal,
      "two valid filesystem enumeration orders must emit byte-identical indexes",
    );

    const repeatedHeadingPath = path.join(docsDir, "duplicates.md");
    fs.writeFileSync(
      repeatedHeadingPath,
      "---\ntitle: Duplicates\n---\n\n# Repeated\n\nFirst.\n\n# Repeated\n\nSecond.\n",
    );
    const withRepeatedHeadings = JSON.parse(
      await generate(docsDir, path.join(root, "repeated-headings")),
    );
    const ids = withRepeatedHeadings.map((entry) => entry.objectID);
    assert.equal(
      new Set(ids).size,
      ids.length,
      "repeated headings must still produce unique objectIDs",
    );

    // A slug override (or any other path-vs-URL mismatch) can make two
    // different files compute the identical URL. writeDoc doesn't emit
    // frontmatter slugs, so fake the collision directly: a file and a
    // same-named directory's index file both resolve to /docs/collide.
    writeDoc(docsDir, "collide.md", "Collide File", "Collide file heading");
    writeDoc(docsDir, "collide/index.md", "Collide Index", "Collide index heading");
    const withUrlCollision = JSON.parse(
      await generate(docsDir, path.join(root, "url-collision")),
    );
    const collideEntries = withUrlCollision.filter(
      (entry) => entry.url === "/docs/collide",
    );
    assert.equal(
      collideEntries.length,
      2,
      "both files sharing a computed URL must still be indexed",
    );
    assert.notEqual(
      collideEntries[0].objectID,
      collideEntries[1].objectID,
      "two entries sharing a URL must not collide on objectID",
    );
    const collisionIds = withUrlCollision.map((entry) => entry.objectID);
    assert.equal(
      new Set(collisionIds).size,
      collisionIds.length,
      "a URL collision must not produce any duplicate objectID in the full index",
    );

    // A heading immediately followed by another heading (no body text
    // between them) must still count toward anchor disambiguation, the same
    // way Docusaurus's own slugger counts every heading regardless of body.
    // The first "Same" has no body and is never indexed as a section, but it
    // must still claim the bare "#same" anchor, pushing the second — indexed
    // — "Same" to "#same-1".
    const emptyHeadingPath = path.join(docsDir, "anchor-heading.md");
    fs.writeFileSync(
      emptyHeadingPath,
      "---\ntitle: AnchorHeading\n---\n\n# Same\n# Same\n\nBody text.\n",
    );
    const withEmptyHeading = JSON.parse(
      await generate(docsDir, path.join(root, "anchor-heading")),
    );
    const sameSection = withEmptyHeading.find(
      (entry) => entry.url.startsWith("/docs/anchor-heading#"),
    );
    assert.equal(
      sameSection?.url,
      "/docs/anchor-heading#same-1",
      "a heading with no body must still occupy its anchor slot, pushing the next same-text heading to '-1'",
    );

    // File traversal order must follow true Unicode code point order, not
    // UTF-16 code unit order. U+E000 (BMP, Private Use Area) and U+10000
    // (astral, encoded as a surrogate pair starting at U+D800) diverge under
    // plain `<`/`>`: comparing the surrogate pair's leading unit (0xD800)
    // against 0xE000 sorts the astral character first, even though its real
    // code point (0x10000 = 65536) is numerically larger than 0xE000 (57344).
    const astral = "\u{10000}";
    const pua = "\u{E000}";
    writeDoc(docsDir, `${astral}-astral.md`, "Astral", "Astral heading");
    writeDoc(docsDir, `${pua}-pua.md`, "Pua", "Pua heading");
    const withAstralAndPua = JSON.parse(
      await generate(docsDir, path.join(root, "codepoint-order")),
    );
    const topLevelTitles = withAstralAndPua
      .filter((entry) => !entry.url.includes("#"))
      .map((entry) => entry.title);
    const astralIndex = topLevelTitles.indexOf("Astral");
    const puaIndex = topLevelTitles.indexOf("Pua");
    assert.ok(
      puaIndex >= 0 && astralIndex >= 0 && puaIndex < astralIndex,
      "true code point order must place U+E000 before U+10000",
    );

    // The index is committed and regenerated by every docs change, so two
    // PRs that edit different pages must merge it without a conflict. Take
    // git's three-way merge of the two regenerated files: it must apply
    // cleanly and equal a fresh build that carries both edits.
    const mergeBase = await generate(docsDir, path.join(root, "merge-base"));
    writeDoc(docsDir, "alpha/first.md", "First", "First section, edited");
    const onlyFirst = await generate(docsDir, path.join(root, "merge-first"));
    writeDoc(docsDir, "alpha/first.md", "First", "First section");
    writeDoc(docsDir, "zeta/second.md", "Second", "Second section, edited");
    const onlySecond = await generate(docsDir, path.join(root, "merge-second"));
    writeDoc(docsDir, "alpha/first.md", "First", "First section, edited");
    const both = await generate(docsDir, path.join(root, "merge-both"));
    const mergeDir = path.join(root, "merge");
    fs.mkdirSync(mergeDir);
    const sides = { first: onlyFirst, base: mergeBase, second: onlySecond };
    for (const [name, text] of Object.entries(sides)) {
      fs.writeFileSync(path.join(mergeDir, name), text);
    }
    const merge = spawnSync(
      "git",
      ["merge-file", "-p", "first", "base", "second"],
      { cwd: mergeDir, encoding: "utf8" },
    );
    assert.equal(
      merge.status,
      0,
      "edits to two different pages must merge the index without a conflict",
    );
    assert.equal(
      merge.stdout,
      both,
      "the merged index must equal a fresh build that carries both edits",
    );

    console.log("search-index reproducibility: PASS");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
