#!/usr/bin/env tsx
/**
 * Determinism exception: real subprocesses act as controllable package managers
 * to reproduce idle deadlines, endless progress and failed installs without
 * touching a global installation, launchd or the live proxy. All imports share
 * the source graph; temporary HOME and local files are the only targets.
 */
import "./helpers/proxyTestIsolation.js";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  mkdtemp,
  writeFile,
  readFile,
  readdir,
  rm,
  chmod,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  installStagedProxyPackage,
  assertProxyServiceInstallIdle,
  probeProxyLaunchdPresence,
  parseProxyServiceInstallSettings,
  isTransientInstallFailure,
  readProxyPackageSelection,
  resolveProxyWorkerPackage,
  selectProxyPackage,
  writeProxyPackageLauncher,
} from "../src/lib/proxy/globalInstaller.js";
import {
  parseProxyRuntimeActivity,
  isProxyUpdateOwnerCurrent,
  waitForProxyUpdateWindow,
} from "../src/lib/proxy/updateCoordinator.js";

const root = await mkdtemp(join(tmpdir(), "neurolink-staged-update-"));
let passed = 0;
async function test(name: string, fn: () => Promise<void>) {
  await fn();
  passed++;
  console.log(`PASS ${name}`);
}
async function manager(mode = "ok") {
  const path = join(root, `npm-${mode}`);
  await writeFile(
    path,
    `#!${process.execPath}
const fs=require('node:fs'),path=require('node:path');
const args=process.argv.slice(2),root=args[args.indexOf('--prefix')+1];
if(args.includes('--global')||!root)process.exit(33);
const version=args.at(-1).split('@').at(-1);
const finish=()=>{const p=path.join(root,'node_modules/@juspay/neurolink');fs.mkdirSync(p,{recursive:true});fs.writeFileSync(path.join(p,'package.json'),JSON.stringify({name:'@juspay/neurolink',version,bin:{neurolink:'index.js'}}));fs.writeFileSync(path.join(p,'index.js'),"require('node:fs').writeFileSync("+JSON.stringify(path.join(root,'IMPORTED'))+",'side effect')");};
const mode=${JSON.stringify(mode)};
if(mode==='idle')setInterval(()=>{},1000);
else if(mode==='forever')setInterval(()=>process.stderr.write('progress\\n'),20);
else if(mode==='network'){process.stderr.write('npm ERR! EAI_AGAIN https://secret.example');process.exitCode=1;}
else if(mode==='progress'){const t=setInterval(()=>process.stdout.write('progress\\n'),20);setTimeout(()=>{clearInterval(t);finish()},1100);}
else finish();
`,
    { mode: 0o755 },
  );
  await chmod(path, 0o755);
  return { kind: "npm" as const, bin: path };
}
try {
  await test("installs immutable candidate without touching the selected or global package", async () => {
    const packagesDir = join(root, "packages");
    const selected = await installStagedProxyPackage({
      version: "1.2.3",
      packagesDir,
      installer: await manager(),
    });
    selectProxyPackage(packagesDir, selected);
    const next = await installStagedProxyPackage({
      version: "1.2.4",
      packagesDir,
      installer: await manager(),
    });
    assert.equal(next.version, "1.2.4");
    assert.equal(readProxyPackageSelection(packagesDir)?.version, "1.2.3");
    assert.equal(
      (await readFile(selected.entryScript, "utf8")).includes("side effect"),
      true,
    );
    await assert.rejects(readFile(join(packagesDir, "1.2.4", "IMPORTED")), {
      code: "ENOENT",
    });
  });
  await test("launcher version validation never imports the CLI or its telemetry graph", async () => {
    const packagesDir = join(root, "packages");
    const selected = readProxyPackageSelection(packagesDir)!;
    const launcher = join(root, "bin", "proxy launcher with space");
    writeProxyPackageLauncher(launcher, selected);
    assert.equal(
      execFileSync(launcher, ["--version"], { encoding: "utf8" }).trim(),
      "1.2.3",
    );
    await assert.rejects(readFile(join(packagesDir, "1.2.3", "IMPORTED")), {
      code: "ENOENT",
    });
  });
  await test("launcher shell quoting preserves quotes and substitution characters literally", async () => {
    const packagesDir = join(root, "packages ' $(touch INJECTED)");
    const selected = await installStagedProxyPackage({
      version: "4.0.0",
      packagesDir,
      installer: await manager(),
    });
    const launcher = join(root, "bin", "quoted ' launcher");
    writeProxyPackageLauncher(launcher, selected);
    assert.equal(
      execFileSync(launcher, ["--version"], {
        encoding: "utf8",
        cwd: root,
      }).trim(),
      "4.0.0",
    );
    await assert.rejects(readFile(join(root, "INJECTED")), { code: "ENOENT" });
  });
  await test("progress keeps a slow installation alive past the inactivity deadline", async () => {
    const candidate = await installStagedProxyPackage({
      version: "1.3.0",
      packagesDir: join(root, "progress"),
      installer: await manager("progress"),
      idleTimeoutMs: 800,
      maxDurationMs: 3_000,
    });
    assert.equal(candidate.version, "1.3.0");
  });
  for (const mode of ["idle", "forever", "network"]) {
    await test(`${mode} failure remains bounded and retryable, preserving active selection`, async () => {
      const packagesDir = join(root, "packages");
      await assert.rejects(
        installStagedProxyPackage({
          version: "2.0.0",
          packagesDir,
          installer: await manager(mode),
          idleTimeoutMs: 800,
          maxDurationMs: 1_800,
          killGraceMs: 20,
        }),
        (error) => isTransientInstallFailure(error),
      );
      assert.equal(readProxyPackageSelection(packagesDir)?.version, "1.2.3");
      await assert.rejects(
        readFile(
          join(
            packagesDir,
            "2.0.0",
            "node_modules",
            "@juspay",
            "neurolink",
            "package.json",
          ),
        ),
        { code: "ENOENT" },
      );
    });
  }
  await test("unvalidated manifest never gets published", async () => {
    const installer = await manager();
    const packagesDir = join(root, "invalid");
    await assert.rejects(
      installStagedProxyPackage({
        version: "3.0.0",
        packagesDir,
        installer,
        execFileSync: () => {
          throw new Error("SyntaxError");
        },
      }),
      /SyntaxError/,
    );
    await assert.rejects(
      readFile(
        join(
          packagesDir,
          "3.0.0",
          "node_modules",
          "@juspay",
          "neurolink",
          "package.json",
        ),
      ),
      { code: "ENOENT" },
    );
  });
  for (const busy of [
    "draining",
    "queuedSockets",
    "pendingTransfers",
    "candidate",
  ]) {
    await test(`safe window waits for ${busy} even when active worker is idle`, async () => {
      const rolling = {
        draining: [],
        queuedSockets: 0,
        pendingTransfers: 0,
        candidate: null,
        [busy]:
          busy === "draining"
            ? [{ pid: 2 }]
            : busy === "candidate"
              ? { pid: 3 }
              : 1,
      };
      const activity = parseProxyRuntimeActivity({
        activity: { activeRequests: 0 },
        autoUpdate: { supervisorPid: 1, rolling },
      });
      assert.ok(activity);
      let clock = 0;
      const result = await waitForProxyUpdateWindow({
        quietWaitMs: 0,
        quietThresholdMs: 0,
        drainWaitMs: 10,
        pollIntervalMs: 1,
        getActivity: async () => activity,
        setDraining: async () => true,
        isStopping: () => false,
        isParentAlive: () => true,
        now: () => clock,
        sleep: async (ms) => {
          clock += ms;
        },
      });
      assert.equal(result.ready, false);
      assert.equal(result.reason, "drain_timeout");
    });
  }
  await test("incomplete rolling evidence cannot authorize a supervisor restart", async () => {
    assert.equal(
      parseProxyRuntimeActivity({
        activity: { activeRequests: 0 },
        autoUpdate: {
          supervisorPid: 1,
          rolling: { draining: [], queuedSockets: 0, candidate: null },
        },
      }),
      null,
    );
    assert.equal(
      parseProxyRuntimeActivity({
        activity: { activeRequests: 0 },
        autoUpdate: { supervisorPid: 1 },
      }),
      null,
    );
    assert.deepEqual(
      parseProxyRuntimeActivity({ activity: { activeRequests: 0 } }),
      { activeRequests: 0, lastActivityAt: null },
    );
  });
  await test("reinstall retains OTel, body stream, custom config and address without persisting worker identity", async () => {
    const saved = parseProxyServiceInstallSettings({
      ProgramArguments: [
        "proxy",
        "start",
        "--env-file",
        "/private/runtime.env",
        "--config",
        "/private/routing.yaml",
        "--port",
        "61234",
        "--host",
        "::1",
      ],
      EnvironmentVariables: {
        OTEL_EXPORTER_OTLP_HEADERS: "authorization=private",
        NEUROLINK_PROXY_OTLP_BODIES_ENDPOINT: "http://collector/v1/logs",
        NEUROLINK_PROXY_BODY_STREAM_HEADER: "bodies",
        NEUROLINK_PROXY_AUTO_UPDATE: "false",
        NEUROLINK_PROXY_TOKEN_BUDGET: "{}",
        NEUROLINK_PROXY_SOCKET_WORKER: "1",
        NEUROLINK_PROXY_UPDATE_CONTROL_TOKEN: "ephemeral",
        HOME: "/wrong",
      },
    });
    assert.equal(saved.envFile, "/private/runtime.env");
    assert.equal(saved.configFile, "/private/routing.yaml");
    assert.equal(saved.port, 61234);
    assert.equal(saved.host, "::1");
    assert.equal(
      saved.environment.OTEL_EXPORTER_OTLP_HEADERS,
      "authorization=private",
    );
    assert.equal(
      saved.environment.NEUROLINK_PROXY_BODY_STREAM_HEADER,
      "bodies",
    );
    assert.equal(saved.environment.NEUROLINK_PROXY_AUTO_UPDATE, "false");
    assert.equal(saved.environment.NEUROLINK_PROXY_SOCKET_WORKER, undefined);
    assert.equal(
      saved.environment.NEUROLINK_PROXY_UPDATE_CONTROL_TOKEN,
      undefined,
    );
    assert.equal(saved.environment.HOME, undefined);
  });
  await test("reinstall refuses active, draining and permission-unknown services before any action", async () => {
    let mutations = 0;
    const install = (
      pids: number[],
      state: "running" | "not_running" | "unknown",
      launchdPresence: "loaded" | "not_loaded" | "unknown",
    ) => {
      assertProxyServiceInstallIdle({
        pids,
        getProcessStatus: () => state,
        launchdPresence,
      });
      mutations++;
    };
    assert.throws(
      () => install([11], "running", "not_loaded"),
      /Reinstall was refused/,
    );
    assert.throws(
      () => install([22], "unknown", "not_loaded"),
      /Reinstall was refused/,
    );
    assert.throws(
      () => install([], "not_running", "loaded"),
      /Reinstall was refused/,
    );
    assert.throws(
      () => install([], "not_running", "unknown"),
      /Reinstall was refused/,
    );
    assert.equal(mutations, 0);
    install([], "not_running", "not_loaded");
    install([33], "not_running", "not_loaded");
    assert.equal(mutations, 2);
  });
  await test("launchd absence requires explicit not-found proof; permission denial is unknown", async () => {
    assert.equal(
      probeProxyLaunchdPresence({
        label: "fixture",
        uid: 501,
        execFileSync: () => {
          throw Object.assign(new Error("absent"), {
            status: 113,
            stderr:
              "Could not find service fixture in domain for user gui: 501",
          });
        },
      }),
      "not_loaded",
    );
    assert.equal(
      probeProxyLaunchdPresence({
        label: "fixture",
        uid: 501,
        execFileSync: () => {
          throw Object.assign(new Error("denied"), {
            status: 1,
            stderr: "Operation not permitted",
          });
        },
      }),
      "unknown",
    );
    assert.equal(
      probeProxyLaunchdPresence({
        label: "fixture",
        uid: 501,
        // The probe observes successful exit, never this fixture's stdout type.
        execFileSync: (() =>
          "state = waiting") as unknown as typeof execFileSync,
      }),
      "loaded",
    );
  });
  await test("staging that outlives its owner cannot publish or roll back a replacement service", async () => {
    const packagesDir = join(root, "owner-race");
    const installer = await manager();
    const previous = await installStagedProxyPackage({
      version: "7.0.0",
      packagesDir,
      installer,
    });
    const replacement = await installStagedProxyPackage({
      version: "7.0.1",
      packagesDir,
      installer,
    });
    const launcher = join(root, "owner-race-launcher");
    let currentParent = 101;
    let currentUpdater = 102;
    const ownsSelection = () =>
      isProxyUpdateOwnerCurrent({
        stopping: false,
        parentPid: 101,
        updaterPid: 102,
        parentStatus: "running",
        runtimePid: currentParent,
        runtimeUpdaterPid: currentUpdater,
      });
    writeProxyPackageLauncher(launcher, previous, ownsSelection);
    selectProxyPackage(packagesDir, previous, ownsSelection);
    let replacementWritten = false;
    const staged = await installStagedProxyPackage({
      version: "7.0.2",
      packagesDir,
      installer: await manager("progress"),
      idleTimeoutMs: 800,
      maxDurationMs: 3000,
      onProgress: () => {
        if (!replacementWritten) {
          currentParent = 201;
          currentUpdater = 202;
          writeProxyPackageLauncher(launcher, replacement);
          selectProxyPackage(packagesDir, replacement);
          replacementWritten = true;
        }
      },
    });
    assert(
      replacementWritten,
      "fixture must replace owner while staging is in flight",
    );
    const contents = await readFile(launcher, "utf8");
    const selections = await readFile(
      join(packagesDir, "selections.json"),
      "utf8",
    );
    for (const packageToPublish of [staged, previous]) {
      assert.throws(
        () =>
          writeProxyPackageLauncher(launcher, packageToPublish, ownsSelection),
        /owner changed/,
      );
      assert.throws(
        () => selectProxyPackage(packagesDir, packageToPublish, ownsSelection),
        /owner changed/,
      );
    }
    assert.equal(await readFile(launcher, "utf8"), contents);
    assert.equal(
      await readFile(join(packagesDir, "selections.json"), "utf8"),
      selections,
    );
    assert.equal(
      execFileSync(launcher, ["--version"], { encoding: "utf8" }).trim(),
      "7.0.1",
    );
    for (const change of [
      { stopping: true },
      { parentStatus: "unknown" as const },
      { parentStatus: "not_running" as const },
      { runtimeUpdaterPid: 103 },
      { runtimePid: undefined },
    ]) {
      assert.equal(
        isProxyUpdateOwnerCurrent({
          stopping: false,
          parentPid: 101,
          updaterPid: 102,
          parentStatus: "running",
          runtimePid: 101,
          runtimeUpdaterPid: 102,
          ...change,
        }),
        false,
      );
    }
  });
  await test("worker recovery resolves active and rollback packages after the original global tree disappears", async () => {
    const packagesDir = join(root, "missing-global");
    const installer = await manager();
    const previous = await installStagedProxyPackage({
      version: "8.0.0",
      packagesDir,
      installer,
    });
    const active = await installStagedProxyPackage({
      version: "8.0.1",
      packagesDir,
      installer,
    });
    selectProxyPackage(packagesDir, previous);
    selectProxyPackage(packagesDir, active);
    const entryScript = join(root, "removed-global", "dist", "index.js");
    for (const selection of [previous, active]) {
      assert.deepEqual(
        resolveProxyWorkerPackage({
          packagesDir,
          entryScript,
          expectedVersion: selection.version,
        }),
        selection,
      );
    }
    assert.throws(
      () =>
        resolveProxyWorkerPackage({
          packagesDir,
          entryScript,
          expectedVersion: "8.0.2",
        }),
      /No validated package selection/,
    );
    // A valid mutable global path must not take precedence over the same
    // version's private selection either.
    const global = await installStagedProxyPackage({
      version: "8.0.1",
      packagesDir: join(root, "mutable-global"),
      installer,
    });
    assert.equal(
      resolveProxyWorkerPackage({
        packagesDir,
        entryScript: global.entryScript,
        expectedVersion: active.version,
      }).entryScript,
      active.entryScript,
    );
  });
  await test("ownership loss immediately before publication preserves active and previous selections", async () => {
    const packagesDir = join(root, "atomic-owner-loss");
    const installer = await manager();
    const previous = await installStagedProxyPackage({
      version: "9.0.0",
      packagesDir,
      installer,
    });
    const active = await installStagedProxyPackage({
      version: "9.0.1",
      packagesDir,
      installer,
    });
    const candidate = await installStagedProxyPackage({
      version: "9.0.2",
      packagesDir,
      installer,
    });
    selectProxyPackage(packagesDir, previous);
    selectProxyPackage(packagesDir, active);
    let ownershipChecks = 0;
    assert.throws(
      () =>
        selectProxyPackage(packagesDir, candidate, () => {
          // The owner remains current during preparation and is replaced before
          // publication. A stale publisher must not alter either retained version.
          ownershipChecks++;
          return ownershipChecks < 3;
        }),
      /owner changed/,
    );
    assert.equal(
      readProxyPackageSelection(packagesDir)?.version,
      active.version,
    );
    assert.equal(
      readProxyPackageSelection(packagesDir, true)?.version,
      previous.version,
    );
    assert.equal(
      (await readdir(packagesDir)).some((file) => file.endsWith(".tmp")),
      false,
    );
  });
  await test("legacy selections migrate together and preserve rollback across repeated selection", async () => {
    const packagesDir = join(root, "atomic-migration");
    const installer = await manager();
    const previous = await installStagedProxyPackage({
      version: "9.1.0",
      packagesDir,
      installer,
    });
    const active = await installStagedProxyPackage({
      version: "9.1.1",
      packagesDir,
      installer,
    });
    const candidate = await installStagedProxyPackage({
      version: "9.1.2",
      packagesDir,
      installer,
    });
    const legacyActive = JSON.stringify(active);
    const legacyPrevious = JSON.stringify(previous);
    await writeFile(join(packagesDir, "active.json"), legacyActive, {
      mode: 0o600,
    });
    await writeFile(join(packagesDir, "previous.json"), legacyPrevious, {
      mode: 0o600,
    });
    assert.deepEqual(readProxyPackageSelection(packagesDir), active);
    assert.deepEqual(readProxyPackageSelection(packagesDir, true), previous);
    selectProxyPackage(packagesDir, active);
    assert.deepEqual(
      JSON.parse(await readFile(join(packagesDir, "selections.json"), "utf8")),
      {
        schemaVersion: 1,
        active,
        previous,
      },
    );
    selectProxyPackage(packagesDir, candidate);
    selectProxyPackage(packagesDir, candidate);
    assert.deepEqual(readProxyPackageSelection(packagesDir), candidate);
    assert.deepEqual(readProxyPackageSelection(packagesDir, true), active);
    // The new record takes precedence over retained legacy files. Publication
    // neither rewrites the old files nor accidentally revives their selections.
    assert.equal(
      await readFile(join(packagesDir, "active.json"), "utf8"),
      legacyActive,
    );
    assert.equal(
      await readFile(join(packagesDir, "previous.json"), "utf8"),
      legacyPrevious,
    );
    selectProxyPackage(packagesDir, active);
    assert.deepEqual(readProxyPackageSelection(packagesDir), active);
    assert.deepEqual(readProxyPackageSelection(packagesDir, true), candidate);
    assert.deepEqual(
      resolveProxyWorkerPackage({
        packagesDir,
        entryScript: join(root, "missing-global.js"),
        expectedVersion: candidate.version,
      }),
      candidate,
    );
    assert.equal(
      (await readdir(packagesDir)).some((file) => file.endsWith(".tmp")),
      false,
    );
  });
  await test("corrupt atomic selection refuses stale legacy fallback and publication", async () => {
    const packagesDir = join(root, "atomic-migration");
    const active = readProxyPackageSelection(packagesDir)!;
    const path = join(packagesDir, "selections.json");
    const before = await readFile(path, "utf8");
    for (const invalid of [
      "{",
      JSON.stringify({ schemaVersion: 2, active, previous: null }),
      JSON.stringify({ schemaVersion: 1, active }),
    ]) {
      await writeFile(path, invalid);
      assert.equal(readProxyPackageSelection(packagesDir), null);
      assert.equal(readProxyPackageSelection(packagesDir, true), null);
      assert.throws(
        () => selectProxyPackage(packagesDir, active),
        /unreadable or invalid/,
      );
      assert.equal(await readFile(path, "utf8"), invalid);
    }
    await writeFile(path, before);
  });
  console.log(`${passed} tests passed`);
} finally {
  await rm(root, { recursive: true, force: true });
}
