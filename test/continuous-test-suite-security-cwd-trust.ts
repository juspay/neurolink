#!/usr/bin/env tsx
/**
 * Continuous Test Suite — the working directory is not a trust boundary
 *
 * Covers the 2026-10 working-directory hardening: a hostile `.mcp-config.json` or `.env` in the current directory
 * must not run commands, forward secrets or redirect credentials.
 *
 * Determinism exception (CLAUDE.md rule 15). This suite imports from `src/`
 * rather than `dist/`, and spawns `tsx` children that do the same, because
 * what it proves is a set of import-time and working-directory side effects:
 * whether importing the SDK reads `<cwd>/.env`, whether constructing
 * `NeuroLink` in a directory with a hostile config spawns anything, whether
 * the CLI entry refuses before any server starts. Each of those is visible
 * only in a fresh process whose module graph starts in a directory this suite
 * controls, with a fake `HOME` so the real trust store is never touched, and
 * `dist/` may not have been rebuilt when the suite runs. Everything is still
 * driven through the public surface — `new NeuroLink()`, `getMCPStatus()`,
 * `MCPClientFactory.createClient`, `ExternalServerManager.loadMCPConfiguration`,
 * `FileTokenStorage`, the CLI entry — against loopback fakes. No network, no
 * API key. Everything comes from `src`; `dist` is never imported, so there is
 * one module graph per process.
 *
 * Run: pnpm exec tsx test/continuous-test-suite-security-cwd-trust.ts
 */

import { createServer, type Server } from "node:http";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { join, resolve } from "node:path";
import type { AddressInfo } from "node:net";

import {
  defineSuite,
  assert,
  runCommand,
  tempDir,
  type ProcessResult,
} from "./helpers/harness.js";
import {
  ExternalServerManager,
  FileTokenStorage,
  MCPClientFactory,
} from "../src/lib/index.js";
import { assertMcpTransportUrlAllowed } from "../src/lib/mcp/index.js";
import type { MCPServerInfo } from "../src/lib/types/index.js";

const { test, runSuite, section } = defineSuite("Security: cwd trust", {
  offline: true,
  perTestTimeoutMs: 120_000,
});

const REPO_ROOT = resolve(import.meta.dirname, "..");
const TSX = join(REPO_ROOT, "node_modules/tsx/dist/cli.mjs");
const SDK_ENTRY = join(REPO_ROOT, "src/lib/index.ts");
const CLI_ENTRY = join(REPO_ROOT, "src/cli/index.ts");
const CHILD_TIMEOUT_MS = 90_000;

/** A fake home so `~/.neurolink/trusted-mcp-configs.json` is never the real one. */
function fakeHome(): string {
  return tempDir("neurolink-cwd-trust-home-");
}

/**
 * The environment a child gets: PATH so `node` resolves, the fake HOME, and
 * nothing else that could leak a decision in from this process (no
 * NEUROLINK_SKIP_MCP, no NEUROLINK_TRUST_MCP_CONFIG, no provider keys).
 */
function childEnv(
  home: string,
  extra: Record<string, string> = {},
): Record<string, string> {
  return {
    PATH: process.env.PATH ?? "",
    HOME: home,
    CI: "true",
    ...extra,
  };
}

function runTsx(
  script: string,
  cwd: string,
  env: Record<string, string>,
): Promise<ProcessResult> {
  return runCommand(process.execPath, [TSX, script], {
    cwd,
    env,
    timeoutMs: CHILD_TIMEOUT_MS,
  });
}

function runCli(
  args: string[],
  cwd: string,
  env: Record<string, string>,
): Promise<ProcessResult> {
  return runCommand(process.execPath, [TSX, CLI_ENTRY, ...args], {
    cwd,
    env,
    timeoutMs: CHILD_TIMEOUT_MS,
  });
}

/** A stdio "server" that leaves a marker file and exits: proof it was spawned. */
function hostileMcpConfig(markerFile: string): string {
  return JSON.stringify(
    {
      mcpServers: {
        "hostile-marker": {
          transport: "stdio",
          command: process.execPath,
          args: [
            "-e",
            "require('fs').writeFileSync(process.env.MARKER_FILE, 'ran')",
          ],
          env: { MARKER_FILE: markerFile },
          autoRestart: false,
          retries: 0,
          timeout: 10_000,
        },
      },
    },
    null,
    2,
  );
}

/** Probe: construct NeuroLink in the current directory and initialise MCP. */
function writeStatusProbe(dir: string, constructorArg: string): string {
  const probe = join(dir, "probe-status.mts");
  writeFileSync(
    probe,
    [
      `import { NeuroLink } from ${JSON.stringify(SDK_ENTRY)};`,
      `const sdk = new NeuroLink(${constructorArg});`,
      "const status = await sdk.getMCPStatus();",
      "process.stdout.write(JSON.stringify({ external: status.externalMCPServersCount ?? 0 }) + '\\n');",
      "process.exit(0);",
    ].join("\n"),
  );
  return probe;
}

function parseJsonLine<T>(stdout: string): T {
  const line = stdout
    .split("\n")
    .map((entry) => entry.trim())
    .filter((entry) => entry.startsWith("{"))
    .pop();
  if (!line) {
    throw new Error("probe printed no JSON line");
  }
  return JSON.parse(line) as T;
}

function sha256(file: string): string {
  return createHash("sha256").update(readFileSync(file)).digest("hex");
}

function listenOnLoopback(server: Server): Promise<number> {
  return new Promise((resolveListen, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      resolveListen((server.address() as AddressInfo).port);
    });
  });
}

function closeServer(server: Server): Promise<void> {
  return new Promise((resolveClose) => {
    server.closeAllConnections();
    server.close(() => resolveClose());
  });
}

async function shutdownQuietly(manager: ExternalServerManager): Promise<void> {
  try {
    await manager.shutdown();
  } catch {
    // the assertion that matters has already been made
  }
}

// ---------------------------------------------------------------------------
// A — SDK: the working directory's .mcp-config.json is never implicit
// ---------------------------------------------------------------------------

async function sdkSection(): Promise<void> {
  section("A — SDK project-config trust");

  await test("default NeuroLink in a directory with a hostile .mcp-config.json spawns nothing", async () => {
    const cwd = tempDir("neurolink-cwd-trust-a1-");
    const marker = join(cwd, "marker");
    writeFileSync(join(cwd, ".mcp-config.json"), hostileMcpConfig(marker));
    const probe = writeStatusProbe(cwd, "");
    const result = await runTsx(probe, cwd, childEnv(fakeHome()));
    assert(result.exitCode === 0, `probe exit code was ${result.exitCode}`);
    assert(!existsSync(marker), "the hostile stdio server was spawned");
    const status = parseJsonLine<{ external: number }>(result.stdout);
    assert(status.external === 0, "an external server was registered");
  });

  await test("mcp.trustProjectConfig: true loads the same file and runs its server", async () => {
    const cwd = tempDir("neurolink-cwd-trust-a2-");
    const marker = join(cwd, "marker");
    writeFileSync(join(cwd, ".mcp-config.json"), hostileMcpConfig(marker));
    const probe = writeStatusProbe(
      cwd,
      "{ mcp: { trustProjectConfig: true } }",
    );
    const result = await runTsx(probe, cwd, childEnv(fakeHome()));
    assert(result.exitCode === 0, `probe exit code was ${result.exitCode}`);
    assert(existsSync(marker), "the trusted stdio server did not run");
  });

  await test("mcp.configPath loads an explicitly named file from elsewhere", async () => {
    const cwd = tempDir("neurolink-cwd-trust-a3-cwd-");
    const elsewhere = tempDir("neurolink-cwd-trust-a3-cfg-");
    const marker = join(elsewhere, "marker");
    const configPath = join(elsewhere, "servers.json");
    writeFileSync(configPath, hostileMcpConfig(marker));
    const probe = writeStatusProbe(
      cwd,
      `{ mcp: { configPath: ${JSON.stringify(configPath)} } }`,
    );
    const result = await runTsx(probe, cwd, childEnv(fakeHome()));
    assert(result.exitCode === 0, `probe exit code was ${result.exitCode}`);
    assert(existsSync(marker), "the named config's server did not run");
  });
}

// ---------------------------------------------------------------------------
// B — CLI: hash-pinned trust for the working directory's config
// ---------------------------------------------------------------------------

async function cliSection(): Promise<void> {
  section("B — CLI trust gate");

  await test("non-interactive CLI without --trust-mcp-config refuses and exits 1 before spawning", async () => {
    const cwd = tempDir("neurolink-cwd-trust-b1-");
    const marker = join(cwd, "marker");
    writeFileSync(join(cwd, ".mcp-config.json"), hostileMcpConfig(marker));
    const result = await runCli(["mcp", "list"], cwd, childEnv(fakeHome()));
    assert(result.exitCode === 1, `exit code was ${result.exitCode}`);
    assert(
      result.stderr.includes(
        "refusing to load an untrusted project MCP configuration",
      ),
      "stderr did not carry the refusal",
    );
    assert(
      result.stderr.includes("hostile-marker"),
      "stderr did not name the server",
    );
    assert(!existsSync(marker), "the hostile stdio server was spawned");
  });

  await test("--trust-mcp-config runs the servers and records the hash at 0600 under a 0700 directory", async () => {
    const cwd = tempDir("neurolink-cwd-trust-b2-");
    const home = fakeHome();
    const marker = join(cwd, "marker");
    const configPath = join(cwd, ".mcp-config.json");
    writeFileSync(configPath, hostileMcpConfig(marker));
    const result = await runCli(
      ["mcp", "list", "--trust-mcp-config"],
      cwd,
      childEnv(home),
    );
    assert(
      !result.stderr.includes("refusing to load"),
      "trusted run was refused",
    );
    assert(existsSync(marker), "the trusted server did not run");
    const store = join(home, ".neurolink", "trusted-mcp-configs.json");
    assert(existsSync(store), "trust store was not written");
    assert(
      (statSync(store).mode & 0o777) === 0o600,
      `trust store mode was ${(statSync(store).mode & 0o777).toString(8)}`,
    );
    assert(
      (statSync(join(home, ".neurolink")).mode & 0o777) === 0o700,
      "trust store directory is not 0700",
    );
    const parsed = JSON.parse(readFileSync(store, "utf8")) as {
      entries: Record<string, { sha256: string }>;
    };
    assert(
      parsed.entries[configPath]?.sha256 === sha256(configPath),
      "recorded hash does not match the file",
    );

    // A second run with no flag is trusted; a changed file is not.
    const second = await runCli(["mcp", "list"], cwd, childEnv(home));
    assert(
      !second.stderr.includes("refusing to load"),
      "recorded config was refused on the second run",
    );
    writeFileSync(
      configPath,
      hostileMcpConfig(marker).replace("'ran'", "'changed'"),
    );
    const third = await runCli(["mcp", "list"], cwd, childEnv(home));
    assert(
      third.exitCode === 1,
      `changed-file exit code was ${third.exitCode}`,
    );
    assert(
      third.stderr.includes("has changed since you last trusted it"),
      "changed file was not reported as changed",
    );
  });

  await test("NEUROLINK_TRUST_MCP_CONFIG=0 runs without the project config", async () => {
    const cwd = tempDir("neurolink-cwd-trust-b3-");
    const marker = join(cwd, "marker");
    writeFileSync(join(cwd, ".mcp-config.json"), hostileMcpConfig(marker));
    const result = await runCli(
      ["mcp", "list"],
      cwd,
      childEnv(fakeHome(), { NEUROLINK_TRUST_MCP_CONFIG: "0" }),
    );
    assert(result.exitCode === 0, `exit code was ${result.exitCode}`);
    assert(!existsSync(marker), "the ignored config's server ran");
    assert(result.stderr.includes("Ignoring"), "no ignore notice printed");
  });
}

// ---------------------------------------------------------------------------
// C — ${VAR}: never into headers; stdio children get a minimal environment
// ---------------------------------------------------------------------------

async function substitutionSection(): Promise<void> {
  section("C — ${VAR} substitution and stdio environment");

  await test("${SECRET} inside headers is sent literally, not expanded", async () => {
    const seen: string[] = [];
    const server = createServer((req, res) => {
      seen.push(String(req.headers.authorization ?? ""));
      res.statusCode = 404;
      res.end("no");
    });
    const port = await listenOnLoopback(server);
    const cwd = tempDir("neurolink-cwd-trust-c1-");
    const configPath = join(cwd, "servers.json");
    writeFileSync(
      configPath,
      JSON.stringify({
        mcpServers: {
          "header-probe": {
            transport: "http",
            url: `http://127.0.0.1:${port}/mcp`,
            headers: { Authorization: "Bearer ${CWD_TRUST_SECRET}" },
            retries: 0,
            timeout: 5_000,
            autoRestart: false,
          },
        },
      }),
    );
    process.env.CWD_TRUST_SECRET = "cwd-trust-secret-value";
    const manager = new ExternalServerManager(
      { defaultTimeout: 5_000, enableAutoRestart: false },
      { enableMainRegistryIntegration: false },
    );
    try {
      await manager.loadMCPConfiguration(configPath);
    } finally {
      delete process.env.CWD_TRUST_SECRET;
      await shutdownQuietly(manager);
      await closeServer(server);
    }
    assert(seen.length > 0, "the loopback server saw no request");
    assert(
      seen.every((value) => !value.includes("cwd-trust-secret-value")),
      "the secret reached the wire",
    );
    assert(
      seen.some((value) => value === "Bearer ${CWD_TRUST_SECRET}"),
      "header was not sent as written",
    );
  });

  await test("stdio child lacks the parent's TEST_PROVIDER_KEY; ${VAR} expands in env with strict names", async () => {
    const cwd = tempDir("neurolink-cwd-trust-c2-");
    const dump = join(cwd, "dump-env.cjs");
    writeFileSync(
      dump,
      "require('fs').writeFileSync(process.env.OUT_FILE, JSON.stringify(process.env));",
    );
    const out = join(cwd, "env.json");
    const configPath = join(cwd, "servers.json");
    writeFileSync(
      configPath,
      JSON.stringify({
        mcpServers: {
          "env-probe": {
            transport: "stdio",
            command: process.execPath,
            args: [dump],
            env: {
              OUT_FILE: out,
              PASSED: "${TEST_PROVIDER_KEY}",
              LOWER: "${test_provider_key}",
            },
            retries: 0,
            timeout: 10_000,
            autoRestart: false,
          },
        },
      }),
    );
    process.env.TEST_PROVIDER_KEY = "parent-secret";
    process.env.test_provider_key = "lower-secret";
    const manager = new ExternalServerManager(
      { defaultTimeout: 10_000, enableAutoRestart: false },
      { enableMainRegistryIntegration: false },
    );
    try {
      await manager.loadMCPConfiguration(configPath);
    } finally {
      delete process.env.TEST_PROVIDER_KEY;
      delete process.env.test_provider_key;
      await shutdownQuietly(manager);
    }
    assert(existsSync(out), "the stdio child never ran");
    const env = JSON.parse(readFileSync(out, "utf8")) as Record<string, string>;
    assert(!("TEST_PROVIDER_KEY" in env), "parent key was inherited");
    assert(env.PASSED === "parent-secret", "explicit ${VAR} was not expanded");
    assert(
      env.LOWER === "${test_provider_key}",
      "a lower-case name was expanded",
    );
    assert(typeof env.PATH === "string", "PATH was not passed to the child");
  });

  await test("inheritParentEnv: true restores the whole parent environment", async () => {
    const cwd = tempDir("neurolink-cwd-trust-c3-");
    const dump = join(cwd, "dump-env.cjs");
    writeFileSync(
      dump,
      "require('fs').writeFileSync(process.env.OUT_FILE, JSON.stringify(process.env));",
    );
    const out = join(cwd, "env.json");
    const configPath = join(cwd, "servers.json");
    writeFileSync(
      configPath,
      JSON.stringify({
        mcpServers: {
          "env-probe": {
            transport: "stdio",
            command: process.execPath,
            args: [dump],
            env: { OUT_FILE: out },
            inheritParentEnv: true,
            retries: 0,
            timeout: 10_000,
            autoRestart: false,
          },
        },
      }),
    );
    process.env.TEST_PROVIDER_KEY = "parent-secret";
    const manager = new ExternalServerManager(
      { defaultTimeout: 10_000, enableAutoRestart: false },
      { enableMainRegistryIntegration: false },
    );
    try {
      await manager.loadMCPConfiguration(configPath);
    } finally {
      delete process.env.TEST_PROVIDER_KEY;
      await shutdownQuietly(manager);
    }
    assert(existsSync(out), "the stdio child never ran");
    const env = JSON.parse(readFileSync(out, "utf8")) as Record<string, string>;
    assert(
      env.TEST_PROVIDER_KEY === "parent-secret",
      "inheritParentEnv did not pass the parent key",
    );
  });
}

// ---------------------------------------------------------------------------
// D — transport URL policy and the WebSocket transport
// ---------------------------------------------------------------------------

function networkConfig(
  id: string,
  transport: MCPServerInfo["transport"],
  url: string,
  extra: Partial<MCPServerInfo> = {},
): MCPServerInfo {
  return {
    id,
    name: id,
    description: id,
    transport,
    status: "initializing",
    tools: [],
    url,
    ...extra,
  };
}

async function urlPolicySection(): Promise<void> {
  section("D — transport URL policy");

  await test("ws://remote.example/ is rejected by createClient; loopback and TLS pass the policy", async () => {
    const rejected = await MCPClientFactory.createClient(
      networkConfig("remote-ws", "websocket", "ws://remote.example/"),
      3_000,
    );
    assert(!rejected.success, "plaintext ws to a remote host connected");
    assert(
      (rejected.error ?? "").includes("plaintext"),
      "rejection did not cite the plaintext rule",
    );

    await assertMcpTransportUrlAllowed("ws://127.0.0.1:9/", {
      transport: "websocket",
    });
    await assertMcpTransportUrlAllowed("http://localhost:9/mcp", {
      transport: "http",
    });
    await assertMcpTransportUrlAllowed("http://[::1]:9/mcp", {
      transport: "http",
    });
    await assertMcpTransportUrlAllowed("https://93.184.216.34/mcp", {
      transport: "http",
    });
  });

  await test("private, link-local and metadata destinations are rejected unless allowPrivateNetwork", async () => {
    const blocked = [
      "http://10.0.0.5/mcp",
      "https://192.168.1.1/mcp",
      "http://169.254.169.254/latest/meta-data/",
      "https://[fd00::1]/mcp",
      "https://100.64.0.1/mcp",
      "https://[::ffff:10.1.2.3]/mcp",
      "ftp://127.0.0.1/",
    ];
    for (const url of blocked) {
      let threw = false;
      try {
        await assertMcpTransportUrlAllowed(url, { transport: "http" });
      } catch {
        threw = true;
      }
      assert(threw, `URL ${url} was allowed`);
    }
    await assertMcpTransportUrlAllowed("http://10.0.0.5/mcp", {
      transport: "http",
      allowPrivateNetwork: true,
    });
    let publicPlaintextThrew = false;
    try {
      await assertMcpTransportUrlAllowed("http://93.184.216.34/mcp", {
        transport: "http",
        allowPrivateNetwork: true,
      });
    } catch {
      publicPlaintextThrew = true;
    }
    assert(
      publicPlaintextThrew,
      "allowPrivateNetwork permitted plaintext to a public address",
    );
  });

  await test("a WebSocket server with headers or auth fails closed instead of dropping them", async () => {
    const withHeaders = await MCPClientFactory.createClient(
      networkConfig("ws-headers", "websocket", "ws://127.0.0.1:9/", {
        headers: { Authorization: "Bearer x" },
      }),
      3_000,
    );
    assert(!withHeaders.success, "headers were silently dropped");
    assert(
      (withHeaders.error ?? "").includes("cannot send the configured headers"),
      "error did not explain the dropped headers",
    );
    const withAuth = await MCPClientFactory.createClient(
      networkConfig("ws-auth", "websocket", "ws://127.0.0.1:9/", {
        auth: { type: "bearer", token: "x" },
      }),
      3_000,
    );
    assert(!withAuth.success, "auth was silently dropped");
    assert(
      (withAuth.error ?? "").includes("cannot send the configured auth"),
      "error did not explain the dropped auth",
    );
  });

  await test("the client no longer advertises a sampling capability", () => {
    const capabilities = MCPClientFactory.getDefaultCapabilities();
    assert(!("sampling" in capabilities), "sampling is still advertised");
    assert("roots" in capabilities, "roots capability went missing");
  });
}

// ---------------------------------------------------------------------------
// E — .env: not at SDK import; endpoint overrides only from a trustworthy file
// ---------------------------------------------------------------------------

function writeDotenv(dir: string, port: number, mode: number): string {
  const file = join(dir, ".env");
  writeFileSync(
    file,
    [
      `ANTHROPIC_BASE_URL=http://127.0.0.1:${port}/`,
      "CWD_TRUST_PLAIN=hello",
      "",
    ].join("\n"),
  );
  chmodSync(file, mode);
  return file;
}

function writeImportProbe(dir: string): string {
  const probe = join(dir, "probe-import.mts");
  writeFileSync(
    probe,
    [
      `await import(${JSON.stringify(SDK_ENTRY)});`,
      "process.stdout.write(JSON.stringify({ base: process.env.ANTHROPIC_BASE_URL ?? null, plain: process.env.CWD_TRUST_PLAIN ?? null }) + '\\n');",
    ].join("\n"),
  );
  return probe;
}

async function dotenvSection(): Promise<void> {
  section("E — .env loading");

  await test("the CLI refuses ANTHROPIC_BASE_URL from a world-writable .env and says so", async () => {
    const cwd = tempDir("neurolink-cwd-trust-e1-");
    writeDotenv(cwd, 4_321, 0o666);
    const probe = join(cwd, "probe-cli-dotenv.mts");
    writeFileSync(
      probe,
      [
        `const { loadProcessDotenv } = await import(${JSON.stringify(join(REPO_ROOT, "src/lib/utils/dotenvBootstrap.ts"))});`,
        "const result = await loadProcessDotenv({ caller: 'cli' });",
        "process.stdout.write(JSON.stringify({ result, base: process.env.ANTHROPIC_BASE_URL ?? null, plain: process.env.CWD_TRUST_PLAIN ?? null }) + '\\n');",
      ].join("\n"),
    );
    const result = await runTsx(probe, cwd, childEnv(fakeHome()));
    assert(result.exitCode === 0, `probe exit code was ${result.exitCode}`);
    const parsed = parseJsonLine<{
      result: { refused: string[]; loaded: boolean };
      base: string | null;
      plain: string | null;
    }>(result.stdout);
    assert(parsed.base === null, "ANTHROPIC_BASE_URL survived the refusal");
    assert(parsed.plain === "hello", "a harmless variable was dropped too");
    assert(
      parsed.result.refused.includes("ANTHROPIC_BASE_URL"),
      "the refusal did not list the variable",
    );
    assert(
      result.stderr.includes("Refused") &&
        result.stderr.includes("ANTHROPIC_BASE_URL"),
      "no stderr notice named the refused variable",
    );

    // The CLI entry itself prints the same notice.
    const cli = await runCli(["--version"], cwd, childEnv(fakeHome()));
    assert(cli.exitCode === 0, `--version exit code was ${cli.exitCode}`);
    assert(
      cli.stderr.includes("Refused") &&
        cli.stderr.includes("ANTHROPIC_BASE_URL"),
      "the CLI did not report the refused override",
    );
  });

  await test("a user-owned 0600 .env is accepted with a notice naming the override", async () => {
    const cwd = tempDir("neurolink-cwd-trust-e2-");
    writeDotenv(cwd, 4_321, 0o600);
    const probe = join(cwd, "probe-cli-dotenv.mts");
    writeFileSync(
      probe,
      [
        `const { loadProcessDotenv } = await import(${JSON.stringify(join(REPO_ROOT, "src/lib/utils/dotenvBootstrap.ts"))});`,
        "const result = await loadProcessDotenv({ caller: 'cli' });",
        "process.stdout.write(JSON.stringify({ result, base: process.env.ANTHROPIC_BASE_URL ?? null }) + '\\n');",
      ].join("\n"),
    );
    const result = await runTsx(probe, cwd, childEnv(fakeHome()));
    assert(result.exitCode === 0, `probe exit code was ${result.exitCode}`);
    const parsed = parseJsonLine<{
      result: { endpointOverrides: string[]; refused: string[] };
      base: string | null;
    }>(result.stdout);
    assert(
      parsed.base === "http://127.0.0.1:4321/",
      "trustworthy override was not applied",
    );
    assert(
      parsed.result.endpointOverrides.includes("ANTHROPIC_BASE_URL"),
      "override was not reported",
    );
    assert(parsed.result.refused.length === 0, "trustworthy file was refused");
    assert(
      result.stderr.includes("set endpoint override(s)") &&
        result.stderr.includes("ANTHROPIC_BASE_URL"),
      "no notice listed the override",
    );
  });

  await test("importing the SDK does not read .env; NEUROLINK_DOTENV=1 opts in", async () => {
    const cwd = tempDir("neurolink-cwd-trust-e3-");
    writeDotenv(cwd, 4_321, 0o600);
    const probe = writeImportProbe(cwd);

    const silent = await runTsx(probe, cwd, childEnv(fakeHome()));
    assert(silent.exitCode === 0, `probe exit code was ${silent.exitCode}`);
    const untouched = parseJsonLine<{
      base: string | null;
      plain: string | null;
    }>(silent.stdout);
    assert(untouched.base === null, "SDK import set ANTHROPIC_BASE_URL");
    assert(untouched.plain === null, "SDK import loaded .env");

    const optedIn = await runTsx(
      probe,
      cwd,
      childEnv(fakeHome(), { NEUROLINK_DOTENV: "1" }),
    );
    assert(optedIn.exitCode === 0, `opt-in exit code was ${optedIn.exitCode}`);
    const loaded = parseJsonLine<{ base: string | null; plain: string | null }>(
      optedIn.stdout,
    );
    assert(loaded.plain === "hello", "NEUROLINK_DOTENV=1 did not load .env");
    assert(
      loaded.base === "http://127.0.0.1:4321/",
      "opted-in trustworthy override was not applied",
    );
  });

  await test("NEUROLINK_DOTENV=0 disables the CLI loader entirely", async () => {
    const cwd = tempDir("neurolink-cwd-trust-e4-");
    writeDotenv(cwd, 4_321, 0o600);
    const probe = join(cwd, "probe-cli-dotenv.mts");
    writeFileSync(
      probe,
      [
        `const { loadProcessDotenv } = await import(${JSON.stringify(join(REPO_ROOT, "src/lib/utils/dotenvBootstrap.ts"))});`,
        "const result = await loadProcessDotenv({ caller: 'cli' });",
        "process.stdout.write(JSON.stringify({ loaded: result.loaded, plain: process.env.CWD_TRUST_PLAIN ?? null }) + '\\n');",
      ].join("\n"),
    );
    const result = await runTsx(
      probe,
      cwd,
      childEnv(fakeHome(), { NEUROLINK_DOTENV: "0" }),
    );
    assert(result.exitCode === 0, `probe exit code was ${result.exitCode}`);
    const parsed = parseJsonLine<{ loaded: boolean; plain: string | null }>(
      result.stdout,
    );
    assert(parsed.loaded === false, "loader reported a load");
    assert(parsed.plain === null, ".env was loaded despite NEUROLINK_DOTENV=0");
  });
}

// ---------------------------------------------------------------------------
// F — OAuth token file permissions
// ---------------------------------------------------------------------------

async function tokenStorageSection(): Promise<void> {
  section("F — token storage");

  await test("FileTokenStorage writes 0600 inside a 0700 directory it creates", async () => {
    const base = tempDir("neurolink-cwd-trust-f1-");
    const dir = join(base, "tokens");
    const file = join(dir, "tokens.json");
    const storage = new FileTokenStorage(file);
    await storage.saveTokens("server-a", {
      accessToken: "access-token-fixture",
      tokenType: "Bearer",
    });
    assert(existsSync(file), "token file was not written");
    assert(
      (statSync(file).mode & 0o777) === 0o600,
      `token file mode was ${(statSync(file).mode & 0o777).toString(8)}`,
    );
    assert(
      (statSync(dir).mode & 0o777) === 0o700,
      `token directory mode was ${(statSync(dir).mode & 0o777).toString(8)}`,
    );
    const reloaded = new FileTokenStorage(file);
    const tokens = await reloaded.getTokens("server-a");
    assert(
      tokens?.accessToken === "access-token-fixture",
      "token did not round-trip",
    );
    mkdirSync(join(base, "unused"), { recursive: true });
  });
}

await runSuite(async () => {
  await sdkSection();
  await cliSection();
  await substitutionSection();
  await urlPolicySection();
  await dotenvSection();
  await tokenStorageSection();
});
