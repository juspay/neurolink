#!/usr/bin/env tsx
/**
 * Regression guard for #1751.
 *
 * applyFileMapping()'s basename fallback lets any source file whose
 * basename matches a FILE_MAPPINGS key collapse onto that key's target,
 * regardless of the file's actual directory. When more than one real
 * source shares a target this way, getMarkdownFiles() used to write them
 * all to the same path with no error — whichever glob() enumerated last
 * silently won, and the rest vanished from the published site with no
 * record.
 *
 * This drives getMarkdownFiles() against the real docs/ corpus (not a
 * synthetic fixture), so it tracks the actual FILE_MAPPINGS table and the
 * actual doc tree exactly as the issue found them. A second case drives
 * findDuplicateMappingTargets() directly against a hand-built collision to
 * prove the build-time guard itself fires and names both sources, since a
 * live corpus can't be relied on to reintroduce a duplicate on demand.
 */
import assert from "node:assert/strict";
import * as path from "path";
import {
  findDuplicateMappingTargets,
  getMarkdownFiles,
  SOURCE_DIR,
  type FileInfo,
} from "./sync-docs.js";

async function testRealCorpusHasNoCollisions(): Promise<void> {
  const files = await getMarkdownFiles(SOURCE_DIR);
  assert.ok(files.length > 1000, `expected the real docs/ corpus to be loaded, got ${files.length} files`);
  console.log(`  ${files.length} source files under docs/, 0 target-path collisions`);
}

function testGuardFiresOnDuplicateTarget(): void {
  const targetDir = path.resolve(__dirname, "../docs");
  const duplicateFiles: FileInfo[] = [
    {
      sourcePath: "/fake/troubleshooting.md",
      relativePath: "troubleshooting.md",
      targetPath: path.join(targetDir, "reference/troubleshooting.md"),
    },
    {
      sourcePath: "/fake/skills/neurolink-guide/troubleshooting.md",
      relativePath: "skills/neurolink-guide/troubleshooting.md",
      targetPath: path.join(targetDir, "reference/troubleshooting.md"),
    },
    {
      sourcePath: "/fake/guides/dynamic-models.md",
      relativePath: "guides/dynamic-models.md",
      targetPath: path.join(targetDir, "guides/dynamic-models.md"),
    },
  ];

  const duplicates = findDuplicateMappingTargets(duplicateFiles);
  assert.equal(duplicates.size, 1, "expected exactly one colliding target");
  assert.deepEqual(
    duplicates.get("reference/troubleshooting.md"),
    ["troubleshooting.md", "skills/neurolink-guide/troubleshooting.md"],
    "the guard must name both colliding sources",
  );
  assert.equal(
    duplicates.has("guides/dynamic-models.md"),
    false,
    "a target with a single source must not be reported as a collision",
  );
}

async function main(): Promise<void> {
  await testRealCorpusHasNoCollisions();
  testGuardFiresOnDuplicateTarget();
  console.log("sync-docs mapping collisions: PASS");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
