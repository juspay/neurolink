// HOME is supplied by the parent before startup, including static imports.
// Exercise both shipped status paths against disposable legacy state.
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createProxyStartApp } from "../../dist/cli/commands/proxy.js";

assert.ok(process.env.NEUROLINK_TEST_LEGACY_STATUS_HOME);
assert.equal(homedir(), process.env.NEUROLINK_TEST_LEGACY_STATUS_HOME);
const stateDir = join(homedir(), ".neurolink");
await mkdir(stateDir, { recursive: true });
const legacyState = {
  pid: process.pid,
  port: 0,
  host: "127.0.0.1",
  version: "9.0.0",
  startTime: new Date().toISOString(),
};
await writeFile(
  join(stateDir, "proxy-supervisor-state.json"),
  JSON.stringify(legacyState),
);
await writeFile(
  join(stateDir, "proxy-state.json"),
  JSON.stringify({
    ...legacyState,
    supervisorPid: process.pid,
    strategy: "fill-first",
    passthrough: false,
  }),
);
const { app } = await createProxyStartApp({
  neurolink: { getToolRegistry: () => ({}) },
  modelRouter: undefined,
  strategy: "fill-first",
  passthrough: false,
  port: 0,
  host: "127.0.0.1",
  proxyConfig: null,
  primaryAccountKey: undefined,
  accountAllowlist: undefined,
  updateControlToken: "isolated-legacy-status-fixture",
});
const response = await app.request("/status");
assert.equal(response.status, 200);
const body = await response.json();
assert.equal(body.autoUpdate.candidateVersion, null);
assert.equal(body.autoUpdate.rolling, null);
assert.equal(body.autoUpdate.activationMode, "restart");
const { stdout } = await promisify(execFile)(
  process.execPath,
  [
    fileURLToPath(new URL("../../dist/cli/index.js", import.meta.url)),
    "proxy",
    "status",
    "--format",
    "json",
  ],
  { env: { ...process.env }, timeout: 15_000, killSignal: "SIGKILL" },
);
const status = JSON.parse(stdout);
assert.equal(status.candidateVersion, null);
assert.equal(status.activatedVersion, null);
assert.equal(status.rolling, null);
assert.equal(status.pid, process.pid);
console.log("legacy-status-pass");
