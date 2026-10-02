#!/usr/bin/env tsx
/** Determinism exception: isolated package managers and files reproduce upgrade diffs without a live service. */
import "./helpers/proxyTestIsolation.js";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  mkdtemp,
  mkdir,
  readFile,
  writeFile,
  rm,
  symlink,
  readdir,
  stat,
} from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import {
  inspectProxyPackage,
  installStagedProxyPackage,
  prepareProxyPackageUpgrade,
  readProxyPackageSelection,
  selectProxyPackage,
  writeProxyPackageLauncher,
} from "../src/lib/proxy/globalInstaller.js";
import {
  captureProxyPackageBaseline,
  changedProxyRuntimeFiles,
  proxyPackageRoot,
  readProxyPackageBaseline,
  reconcileProxyPackagePolyfills,
  snapshotProxyPackage,
} from "../src/lib/proxy/proxyPackagePolyfills.js";
import type {
  ProxyPackageBaseline,
  ProxyPackagePolyfillReport,
} from "../src/lib/types/index.js";
import { applyClientsOnProxyStart } from "../src/cli/proxy-clients/registry.js";

const root = await mkdtemp(join(tmpdir(), "neurolink-polyfill-"));
let passed = 0;
async function test(name: string, run: () => Promise<void>) {
  await run();
  passed++;
  console.log(`PASS ${name}`);
}
const baseLines = Array.from(
  { length: 30 },
  (_, index) => `// original line ${index}`,
);
baseLines[4] = "export const display = 'updates';";
baseLines[22] = "export const thinking = 'enabled';";
const original = baseLines.join("\n") + "\n";
const local = original
  .replace("display = 'updates'", "display = 'summarized'")
  .replace("thinking = 'enabled'", "thinking = 'adaptive'");
const upstream =
  "// new release feature\n" +
  original.replace("original line 15", "upstream line 15");
const payload = "dist/proxy/payload.js";
function snapshot(content: string): ProxyPackageBaseline {
  return {
    schemaVersion: 1,
    version: "1.0.0",
    manifest: "{}",
    entryRelative: "dist/cli/index.js",
    files: { [payload]: content },
  };
}
async function manager(contents: Record<string, string>) {
  const bin = join(root, `manager-${(await readdir(root)).length}.cjs`);
  await writeFile(
    bin,
    `#!${process.execPath}
const fs=require('node:fs'),path=require('node:path');
const args=process.argv.slice(2),prefix=args[args.indexOf('--prefix')+1],version=args.at(-1).split('@').at(-1);
if(!prefix||args.includes('--global'))process.exit(33);
const contents=${JSON.stringify(contents)},base=path.join(prefix,'node_modules/@juspay/neurolink');
fs.mkdirSync(path.join(base,'dist/cli'),{recursive:true});fs.mkdirSync(path.join(base,'dist/proxy'),{recursive:true});
fs.writeFileSync(path.join(base,'package.json'),JSON.stringify({name:'@juspay/neurolink',type:'module',version,bin:{neurolink:'dist/cli/index.js'}}));
fs.writeFileSync(path.join(base,'dist/cli/index.js'),"export const executable=true;\\n");
fs.writeFileSync(path.join(base,'dist/proxy/payload.js'),contents[version]||contents.default);
`,
    { mode: 0o755 },
  );
  return { kind: "npm" as const, bin };
}

try {
  await test("local hunks preserve independent upstream edits", async () => {
    const result = reconcileProxyPackagePolyfills(
      snapshot(original),
      snapshot(local),
      snapshot(upstream),
    );
    assert.equal(
      result.files[payload],
      upstream
        .replace("display = 'updates'", "display = 'summarized'")
        .replace("thinking = 'enabled'", "thinking = 'adaptive'"),
    );
    assert.deepEqual(result.report, {
      applied: [payload],
      alreadyIncluded: [],
    });
  });
  await test("partial and complete upstream adoption do not duplicate polyfills", async () => {
    const partial = upstream.replace(
      "display = 'updates'",
      "display = 'summarized'",
    );
    const result = reconcileProxyPackagePolyfills(
      snapshot(original),
      snapshot(local),
      snapshot(partial),
    );
    assert.equal(
      result.files[payload],
      partial.replace("thinking = 'enabled'", "thinking = 'adaptive'"),
    );
    const complete = reconcileProxyPackagePolyfills(
      snapshot(original),
      snapshot(local),
      snapshot(result.files[payload]!),
    );
    assert.deepEqual(complete.files, {});
    assert.deepEqual(complete.report.alreadyIncluded, [payload]);
  });
  await test("polyfill diffs preserve CRLF, UTF-8 and missing final newlines", async () => {
    const before = original.replaceAll("\n", "\r\n").trimEnd();
    const after = before.replace(
      "display = 'updates'",
      "display = 'summarized'",
    );
    const candidate = "// release café\r\n" + before;
    const result = reconcileProxyPackagePolyfills(
      snapshot(before),
      snapshot(after),
      snapshot(candidate),
    );
    assert.equal(result.files[payload], "// release café\r\n" + after);
  });
  await test("managed startup preserves user client routing and settings byte-for-byte", async () => {
    const claude = join(homedir(), ".claude", "settings.json");
    const codex = join(homedir(), ".codex", "config.toml");
    await mkdir(join(homedir(), ".claude"), { recursive: true });
    await mkdir(join(homedir(), ".codex"), { recursive: true });
    const claudeBytes =
      '{"env":{"ANTHROPIC_BASE_URL":"https://user.example","ENABLE_TOOL_SEARCH":"false"},"hooks":{"owned":"user"}}\n';
    const codexBytes = 'model_provider = "openai"\n# user routing\n';
    await writeFile(claude, claudeBytes, { mode: 0o600 });
    await writeFile(codex, codexBytes, { mode: 0o600 });
    assert.deepEqual(
      await applyClientsOnProxyStart("http://localhost:61111", {}, true),
      [],
    );
    assert.equal(await readFile(claude, "utf8"), claudeBytes);
    assert.equal(await readFile(codex, "utf8"), codexBytes);
    assert.equal((await stat(claude)).mode & 0o777, 0o600);
    assert.equal((await stat(codex)).mode & 0o777, 0o600);
  });
  await test("overlapping upstream changes and ambiguous anchors fail safely", async () => {
    for (const content of [
      original.replace("display = 'updates'", "display = 'different'"),
      original + original,
    ]) {
      assert.throws(
        () =>
          reconcileProxyPackagePolyfills(
            snapshot(original),
            snapshot(local),
            snapshot(content),
          ),
        /conflicts/,
      );
    }
  });
  await test("bulk package edits cannot bypass the compatibility diff budget", async () => {
    const base = snapshot(original);
    const modified = {
      ...base,
      files: {
        ...base.files,
        ...Object.fromEntries(
          Array.from({ length: 65 }, (_, index) => [
            `dist/proxy/edit-${index}.js`,
            "export const local=true;\n",
          ]),
        ),
      },
    };
    assert.throws(
      () => reconcileProxyPackagePolyfills(base, modified, base),
      /64-file/,
    );
  });
  await test("new and removed local runtime files reconcile only against the expected release", async () => {
    const base = snapshot(original);
    const added = {
      ...base,
      files: {
        ...base.files,
        "dist/proxy/extra.js": "export const extra=true;\n",
      },
    };
    assert.equal(
      reconcileProxyPackagePolyfills(base, added, base).files[
        "dist/proxy/extra.js"
      ],
      "export const extra=true;\n",
    );
    assert.throws(
      () =>
        reconcileProxyPackagePolyfills(base, added, {
          ...base,
          files: {
            ...base.files,
            "dist/proxy/extra.js": "export const upstream=true;\n",
          },
        }),
      /conflicts/,
    );
    const removed = { ...base, files: {} };
    assert.equal(
      reconcileProxyPackagePolyfills(base, removed, base).files[payload],
      null,
    );
    assert.throws(
      () => reconcileProxyPackagePolyfills(base, removed, snapshot(upstream)),
      /conflicts/,
    );
  });
  await test("staging carries the actual lost Vertex-style edits through successive upgrades", async () => {
    const packagesDir = join(root, "rolling");
    const operatorConfig = join(root, "rolling-config.yaml");
    const configBytes =
      '{"routing":{"fallback-chain":[],"userSetting":"keep"}}\n';
    await writeFile(operatorConfig, configBytes, { mode: 0o600 });
    const installer = await manager({
      "1.0.0": original,
      "1.0.1": upstream,
      "1.0.2": upstream
        .replace("display = 'updates'", "display = 'summarized'")
        .replace("thinking = 'enabled'", "thinking = 'adaptive'"),
      "1.0.3": "// later feature\n" + local,
    });
    const active = await installStagedProxyPackage({
      version: "1.0.0",
      packagesDir,
      installer,
    });
    await writeFile(join(proxyPackageRoot(active.entryScript), payload), local);
    selectProxyPackage(packagesDir, active);
    let report: ProxyPackagePolyfillReport | undefined;
    const candidate = await prepareProxyPackageUpgrade({
      version: "1.0.1",
      packagesDir,
      installer,
      activePackage: active,
      onPolyfills: (value) => {
        report = value;
      },
    });
    assert.match(candidate.entryScript, /1\.0\.1-polyfills-/);
    assert.deepEqual(report?.applied, [payload]);
    assert.equal(
      await readFile(
        join(proxyPackageRoot(active.entryScript), payload),
        "utf8",
      ),
      local,
    );
    assert.equal(
      readProxyPackageSelection(packagesDir)?.entryScript,
      active.entryScript,
    );
    assert.equal(
      (
        await readFile(
          join(proxyPackageRoot(candidate.entryScript), payload),
          "utf8",
        )
      ).includes("upstream line 15"),
      true,
    );
    assert.equal(
      (
        await readFile(
          join(proxyPackageRoot(candidate.entryScript), payload),
          "utf8",
        )
      ).includes("thinking = 'adaptive'"),
      true,
    );
    selectProxyPackage(packagesDir, candidate);
    assert.equal(
      readProxyPackageSelection(packagesDir, true)?.entryScript,
      active.entryScript,
    );
    const included = await prepareProxyPackageUpgrade({
      version: "1.0.2",
      packagesDir,
      installer,
      activePackage: candidate,
      onPolyfills: (value) => {
        report = value;
      },
    });
    assert.deepEqual(report?.alreadyIncluded, [payload]);
    assert.deepEqual(
      changedProxyRuntimeFiles(
        readProxyPackageBaseline(included)!,
        snapshotProxyPackage(included),
      ),
      [],
    );
    const next = await prepareProxyPackageUpgrade({
      version: "1.0.3",
      packagesDir,
      installer,
      activePackage: included,
      onPolyfills: (value) => {
        report = value;
      },
    });
    assert.deepEqual(report, { applied: [], alreadyIncluded: [] });
    assert.equal(next.version, "1.0.3");
    assert.equal(await readFile(operatorConfig, "utf8"), configBytes);
    assert.equal((await stat(operatorConfig)).mode & 0o777, 0o600);
  });
  await test("conflicting upgrade preserves the selected package, launcher and operator settings", async () => {
    const packagesDir = join(root, "conflict");
    const installer = await manager({
      "2.0.0": original,
      "2.0.1": original.replace(
        "display = 'updates'",
        "display = 'upstream-choice'",
      ),
    });
    const active = await installStagedProxyPackage({
      version: "2.0.0",
      packagesDir,
      installer,
    });
    await writeFile(join(proxyPackageRoot(active.entryScript), payload), local);
    selectProxyPackage(packagesDir, active);
    const launcher = join(root, "conflict-launcher");
    writeProxyPackageLauncher(launcher, active);
    const settings = [
      join(root, "proxy-config.yaml"),
      join(root, ".env"),
      join(root, "service.plist"),
    ];
    for (const path of settings) {
      await writeFile(path, `operator settings at ${path}`, { mode: 0o600 });
    }
    const before = await Promise.all(
      [launcher, ...settings].map((path) => readFile(path)),
    );
    await assert.rejects(
      prepareProxyPackageUpgrade({
        version: "2.0.1",
        packagesDir,
        installer,
        activePackage: active,
      }),
      /conflicts/,
    );
    assert.equal(
      readProxyPackageSelection(packagesDir)?.entryScript,
      active.entryScript,
    );
    assert.deepEqual(
      await Promise.all([launcher, ...settings].map((path) => readFile(path))),
      before,
    );
    for (const path of settings) {
      assert.equal((await stat(path)).mode & 0o777, 0o600);
    }
  });
  await test("same-version official adoption retains the exact local rollback path", async () => {
    const packagesDir = join(root, "same-version");
    const installer = await manager({ default: original });
    const localPackage = await installStagedProxyPackage({
      version: "3.0.0",
      packagesDir,
      installer,
    });
    const official = await installStagedProxyPackage({
      version: "3.0.0",
      packagesDir: join(packagesDir, "official"),
      installer,
    });
    selectProxyPackage(packagesDir, localPackage);
    selectProxyPackage(packagesDir, official);
    assert.equal(
      readProxyPackageSelection(packagesDir, true)?.entryScript,
      localPackage.entryScript,
    );
    selectProxyPackage(packagesDir, official);
    assert.equal(
      readProxyPackageSelection(packagesDir, true)?.entryScript,
      localPackage.entryScript,
    );
  });
  await test("clean legacy packages bootstrap safely but unknown edits require their original base", async () => {
    const packagesDir = join(root, "legacy");
    const installer = await manager({ default: original });
    const active = await installStagedProxyPackage({
      version: "4.0.0",
      packagesDir,
      installer,
    });
    await rm(
      join(
        proxyPackageRoot(active.entryScript),
        ".neurolink-proxy-baseline.json",
      ),
    );
    const clean = await prepareProxyPackageUpgrade({
      version: "4.0.1",
      packagesDir,
      installer,
      activePackage: active,
    });
    assert.ok(readProxyPackageBaseline(active));
    await rm(
      join(
        proxyPackageRoot(clean.entryScript),
        ".neurolink-proxy-baseline.json",
      ),
    );
    await writeFile(join(proxyPackageRoot(clean.entryScript), payload), local);
    selectProxyPackage(packagesDir, clean);
    await assert.rejects(
      prepareProxyPackageUpgrade({
        version: "4.0.2",
        packagesDir,
        installer,
        activePackage: clean,
      }),
      /without a recorded base/,
    );
    assert.equal(
      readProxyPackageSelection(packagesDir)?.entryScript,
      clean.entryScript,
    );
    const referenceDirectory = (await readdir(packagesDir)).find((name) =>
      name.startsWith(".registry-4.0.1-"),
    );
    assert.ok(referenceDirectory);
    const pristine = inspectProxyPackage(
      join(
        packagesDir,
        referenceDirectory,
        "4.0.1",
        "node_modules",
        "@juspay",
        "neurolink",
        "dist/cli/index.js",
      ),
    );
    assert.deepEqual(captureProxyPackageBaseline(pristine, clean), [payload]);
    const repaired = await prepareProxyPackageUpgrade({
      version: "4.0.2",
      packagesDir,
      installer,
      activePackage: clean,
    });
    assert.equal(
      await readFile(
        join(proxyPackageRoot(repaired.entryScript), payload),
        "utf8",
      ),
      local,
    );
  });
  await test("built capture CLI records a local base without selecting a package or rewriting clients", async () => {
    const packagesDir = join(root, "capture-cli");
    const installer = await manager({ default: original });
    const base = await installStagedProxyPackage({
      version: "8.0.0",
      packagesDir,
      installer,
    });
    const patched = await installStagedProxyPackage({
      version: "8.0.1",
      packagesDir,
      installer,
    });
    await writeFile(
      join(proxyPackageRoot(patched.entryScript), payload),
      local,
    );
    const clientPaths = [
      join(homedir(), ".claude", "settings.json"),
      join(homedir(), ".codex", "config.toml"),
    ];
    const clientBytes = await Promise.all(
      clientPaths.map((path) => readFile(path)),
    );
    const result = JSON.parse(
      execFileSync(
        process.execPath,
        [
          join(process.cwd(), "dist/cli/index.js"),
          "proxy",
          "polyfill",
          "capture",
          "--base",
          base.entryScript,
          "--patched",
          patched.entryScript,
          "--format",
          "json",
        ],
        { encoding: "utf8", timeout: 60_000, env: process.env },
      ),
    );
    assert.equal(result.captured, true);
    assert.deepEqual(result.files, [payload]);
    assert.equal(readProxyPackageSelection(packagesDir), null);
    assert.equal(
      readProxyPackageSelection(
        join(homedir(), ".neurolink", "proxy-packages"),
      ),
      null,
    );
    assert.deepEqual(
      await Promise.all(clientPaths.map((path) => readFile(path))),
      clientBytes,
    );
    assert.equal(
      await readFile(
        join(proxyPackageRoot(patched.entryScript), payload),
        "utf8",
      ),
      local,
    );
  });
  await test("invalid polyfill syntax never publishes or changes selection", async () => {
    const packagesDir = join(root, "syntax");
    const installer = await manager({ default: original });
    const active = await installStagedProxyPackage({
      version: "5.0.0",
      packagesDir,
      installer,
    });
    await writeFile(
      join(proxyPackageRoot(active.entryScript), payload),
      original.replace("export const display = 'updates';", "const = ;"),
    );
    selectProxyPackage(packagesDir, active);
    await assert.rejects(
      prepareProxyPackageUpgrade({
        version: "5.0.1",
        packagesDir,
        installer,
        activePackage: active,
      }),
    );
    assert.equal(
      readProxyPackageSelection(packagesDir)?.entryScript,
      active.entryScript,
    );
    assert.equal(
      (await readdir(packagesDir)).some((name) => name.includes("polyfills-")),
      false,
    );
  });
  await test("fresh candidates never inherit edits from reused release or polyfill dependencies", async () => {
    const packagesDir = join(root, "fresh-dependencies");
    const installer = await manager({ default: original });
    const active = await installStagedProxyPackage({
      version: "9.0.0",
      packagesDir,
      installer,
    });
    await writeFile(join(proxyPackageRoot(active.entryScript), payload), local);
    selectProxyPackage(packagesDir, active);
    const cached = await installStagedProxyPackage({
      version: "9.0.1",
      packagesDir,
      installer,
    });
    const poison = (entry: string) =>
      join(proxyPackageRoot(entry), "node_modules", "local-edit.txt");
    await mkdir(join(proxyPackageRoot(cached.entryScript), "node_modules"), {
      recursive: true,
    });
    await writeFile(poison(cached.entryScript), "untracked dependency edit");
    const options = {
      version: "9.0.1",
      packagesDir,
      installer,
      activePackage: active,
    };
    const first = await prepareProxyPackageUpgrade(options);
    await assert.rejects(readFile(poison(first.entryScript)), {
      code: "ENOENT",
    });
    await mkdir(join(proxyPackageRoot(first.entryScript), "node_modules"), {
      recursive: true,
    });
    await writeFile(poison(first.entryScript), "another untracked edit");
    const second = await prepareProxyPackageUpgrade(options);
    assert.notEqual(second.entryScript, first.entryScript);
    await assert.rejects(readFile(poison(second.entryScript)), {
      code: "ENOENT",
    });
    assert.equal(
      await readFile(poison(cached.entryScript), "utf8"),
      "untracked dependency edit",
    );
    assert.equal(
      await readFile(poison(first.entryScript), "utf8"),
      "another untracked edit",
    );
    assert.equal(
      readProxyPackageSelection(packagesDir)?.entryScript,
      active.entryScript,
    );
  });
  await test("dependency edits and symlink escapes cannot become silent polyfills", async () => {
    const packagesDir = join(root, "paths");
    const installer = await manager({ default: original });
    const active = await installStagedProxyPackage({
      version: "6.0.0",
      packagesDir,
      installer,
    });
    const packageRoot = proxyPackageRoot(active.entryScript);
    const manifest = JSON.parse(
      await readFile(join(packageRoot, "package.json"), "utf8"),
    );
    await writeFile(
      join(packageRoot, "package.json"),
      JSON.stringify({ ...manifest, dependencies: { unexpected: "1.0.0" } }),
    );
    await assert.rejects(
      prepareProxyPackageUpgrade({
        version: "6.0.1",
        packagesDir,
        installer,
        activePackage: active,
      }),
      /metadata changed/,
    );
    await writeFile(
      join(packageRoot, "package.json"),
      JSON.stringify(manifest),
    );
    const outside = join(root, "outside.js");
    await writeFile(outside, "export const outside=true;\n");
    await rm(join(packageRoot, payload));
    await symlink(outside, join(packageRoot, payload));
    assert.throws(
      () => snapshotProxyPackage(active),
      /regular file|symbolic link/,
    );
    assert.equal(
      await readFile(outside, "utf8"),
      "export const outside=true;\n",
    );
  });
  await test("owner replacement refuses publication while keeping the serving selection", async () => {
    const packagesDir = join(root, "owner");
    const installer = await manager({ default: original });
    const active = await installStagedProxyPackage({
      version: "7.0.0",
      packagesDir,
      installer,
    });
    await writeFile(join(proxyPackageRoot(active.entryScript), payload), local);
    selectProxyPackage(packagesDir, active);
    let checks = 0;
    await assert.rejects(
      prepareProxyPackageUpgrade({
        version: "7.0.1",
        packagesDir,
        installer,
        activePackage: active,
        isCurrentOwner: () => ++checks < 3,
      }),
      /owner changed/,
    );
    assert.equal(
      readProxyPackageSelection(packagesDir)?.entryScript,
      active.entryScript,
    );
    assert.equal(
      execFileSync(process.execPath, ["--check", active.entryScript], {
        encoding: "utf8",
      }),
      "",
    );
  });
  console.log(`Passed: ${passed}; Failed: 0; RESULT: PASS`);
} finally {
  await rm(root, { recursive: true, force: true });
}
