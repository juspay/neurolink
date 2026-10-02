#!/usr/bin/env tsx
import "dotenv/config";

/**
 * Continuous Test Suite — Tooling Scripts
 *
 * Behaviour of the repo's own gate and review scripts, driven the only way
 * anyone reaches them: as child processes, against a fixture tree built for
 * each case.
 *
 *   scripts/check-banned-deps.ts      source scan the `check:deps` gate runs
 *   scripts/check-shipped-types.ts    the `check:dts` gate over `dist/*.d.ts`
 *   scripts/build-validations.ts      the `validate` gate (typedoc.json check)
 *   scripts/commit-validation.ts      commit-msg hook / Single Commit Policy
 *   scripts/migration-symbol-diff.mjs review helper for refactors that move code
 *   scripts/codex-replay-listener.ts  local Codex Responses replay server
 *
 * ## Why this does not go through NeuroLink (CLAUDE.md rule 15)
 *
 * None of these is part of the published package: `package.json` `files` ships
 * `dist/` and a few named assets, and `scripts/` is not among them. There is no
 * `generate()`, `stream()` or `dist/cli` call that reaches them, so the rule's
 * own surface is not available. They are not imported either — each runs as the
 * real command with real arguments, and the suite reads only its exit status
 * and output, which is exactly what a hook or a workflow step reads.
 *
 * Determinism is what the fixture trees buy. Every gate here answers a
 * question about a whole repository (is every `.d.ts` present, does any source
 * file import a banned package), and the real repository is only ever in one
 * state. A fixture tree can be put into the bad state on purpose — a
 * declaration missing from a build that clears the file-count floor, an import
 * split across three lines — which the real tree must never be in.
 *
 * Nothing here touches the network or a credential. `pnpm` is stubbed with a
 * script that exits non-zero for the banned-deps cases, so the `pnpm why`
 * probes (which need a registry and the real lockfile) are out of the picture;
 * only the source scan is under test there.
 *
 * Run: npx tsx test/continuous-test-suite-tooling-scripts.ts
 *      pnpm run test:tooling-scripts
 */

import { spawn, type ChildProcess } from "node:child_process";
import {
  chmodSync,
  copyFileSync,
  mkdirSync,
  readFileSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { request } from "node:http";
import { createServer } from "node:net";
import { delimiter, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  assert,
  assertEqual,
  assertNotNull,
  defineSuite,
  logSection,
  runCommand,
  tempDir,
  type ProcessResult,
} from "./helpers/harness.js";

const { test, runSuite } = defineSuite("Tooling Scripts", {
  offline: true,
  perTestTimeoutMs: 180_000,
});

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TSX = join(REPO_ROOT, "node_modules", ".bin", "tsx");

// Held in a variable and interpolated into fixtures so this file never spells
// a banned import itself: check-banned-deps scans `test/` too, and a literal
// import of the package inside a template string would fail the very gate
// under test.
const BANNED = "ai";

const writeTree = (root: string, files: Record<string, string>): void => {
  for (const [relativePath, contents] of Object.entries(files)) {
    const full = join(root, relativePath);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, contents);
  }
};

const runScript = (
  script: string,
  cwd: string,
  options: {
    args?: string[];
    env?: Record<string, string>;
    timeoutMs?: number;
  } = {},
): Promise<ProcessResult> =>
  runCommand(TSX, [join(REPO_ROOT, script), ...(options.args ?? [])], {
    cwd,
    env: {
      ...process.env,
      DOTENV_CONFIG_PATH: "/dev/null",
      ...(options.env ?? {}),
    },
    timeoutMs: options.timeoutMs ?? 90_000,
  });

const combined = (result: ProcessResult): string =>
  `${result.stdout}\n${result.stderr}`;

// A failing assertion prints the child's output here instead of quoting it in
// the message: defineSuite downgrades any failure whose message looks like a
// provider error to SKIP, and a child's output is exactly where such words turn
// up.
const showOutput = (label: string, result: ProcessResult): void => {
  console.error(`    [${label}] exit=${result.exitCode}`);
  for (const line of combined(result).trim().split("\n").slice(-25)) {
    console.error(`    | ${line}`);
  }
};

const expectOutput = (
  label: string,
  result: ProcessResult,
  predicate: boolean,
  message: string,
): void => {
  if (!predicate) {
    showOutput(label, result);
  }
  assert(predicate, message);
};

const git = (cwd: string, ...args: string[]): Promise<ProcessResult> =>
  runCommand(
    "git",
    [
      "-c",
      "user.name=tooling-suite",
      "-c",
      "user.email=tooling-suite@example.invalid",
      "-c",
      "commit.gpgsign=false",
      ...args,
    ],
    { cwd, timeoutMs: 30_000 },
  );

await runSuite(async () => {
  // -------------------------------------------------------------------------
  logSection("check-banned-deps: source scan");
  // -------------------------------------------------------------------------

  const bannedDepsRun = (
    files: Record<string, string>,
  ): Promise<ProcessResult> => {
    const root = tempDir("tooling-banned-deps-");
    writeTree(root, files);
    const binDir = join(root, ".stub-bin");
    mkdirSync(binDir, { recursive: true });
    const stub = join(binDir, "pnpm");
    writeFileSync(stub, "#!/bin/sh\nexit 1\n");
    chmodSync(stub, 0o755);
    return runScript("scripts/check-banned-deps.ts", root, {
      env: { PATH: `${binDir}${delimiter}${process.env.PATH ?? ""}` },
    });
  };

  await test("an import split across lines is reported at the line it starts on", async () => {
    const result = await bannedDepsRun({
      "src/multi.ts": [
        "export const a = await import(",
        `  "${BANNED}"`,
        ");",
        "export const b = require(",
        `  "${BANNED}",`,
        ");",
        "import { x } from",
        `  "${BANNED}";`,
        "",
      ].join("\n"),
    });
    const out = combined(result);
    expectOutput(
      "multi-line imports",
      result,
      result.exitCode === 1 &&
        out.includes("[src/multi.ts:1]") &&
        out.includes("[src/multi.ts:4]") &&
        out.includes("[src/multi.ts:7]"),
      "each of the three multi-line banned imports should be reported at its first line",
    );
  });

  await test("a commented-out import is ignored, but a // inside a string does not hide the import after it", async () => {
    const result = await bannedDepsRun({
      "src/comments.ts": [
        "/*",
        `import x from "${BANNED}";`,
        "*/",
        "// import(",
        `//   "${BANNED}"`,
        "// )",
        "export const ok = 1;",
        "",
      ].join("\n"),
      "src/after-string.ts": `const u = "https://example.com"; import x from "${BANNED}";\n`,
    });
    const out = combined(result);
    expectOutput(
      "comments and strings",
      result,
      result.exitCode === 1 &&
        out.includes("[src/after-string.ts:1]") &&
        !out.includes("src/comments.ts"),
      "only the real import after a URL string should be reported, never the commented-out ones",
    );
  });

  await test("a banned import in a root-level config file is reported", async () => {
    const clean = await bannedDepsRun({
      "src/ok.ts": "export const ok = 1;\n",
      "vite.config.ts": "export default {};\n",
    });
    expectOutput(
      "clean root",
      clean,
      clean.exitCode === 0,
      "control tree with no banned import should pass",
    );

    const result = await bannedDepsRun({
      "src/ok.ts": "export const ok = 1;\n",
      "eslint.config.js": `import x from "${BANNED}";\nexport default [];\n`,
    });
    expectOutput(
      "root config",
      result,
      result.exitCode === 1 &&
        combined(result).includes("[eslint.config.js:1]"),
      "the banned import in eslint.config.js should fail the scan",
    );
  });

  // -------------------------------------------------------------------------
  logSection("check-shipped-types: completeness of dist/");
  // -------------------------------------------------------------------------

  const MODULE_COUNT = 105; // clears the script's 100-declaration floor

  type ShippedTypesFixture = {
    exports?: Record<string, { types: string }>;
    omitDeclaration?: string;
    extraSources?: string[];
    extraDeclarations?: string[];
  };

  const declaration = (name: string): string =>
    `export declare const ${name.replace(/\W/g, "_")}: number;\n`;

  const shippedTypesRun = (
    fixture: ShippedTypesFixture = {},
  ): Promise<ProcessResult> => {
    const root = tempDir("tooling-shipped-types-");
    const sources = [
      "index",
      ...Array.from({ length: MODULE_COUNT }, (_, i) => `m${i}`),
      ...(fixture.extraSources ?? []),
    ];
    const files: Record<string, string> = {
      "package.json": JSON.stringify({
        name: "fixture",
        types: "./dist/index.d.ts",
        exports: fixture.exports ?? {},
      }),
      "src/cli/commands/run.ts": "export const run = 1;\n",
      "dist/cli/commands/run.d.ts": declaration("run"),
    };
    for (const name of sources) {
      files[`src/lib/${name}.ts`] = `export const v = 1;\n`;
      if (name !== fixture.omitDeclaration) {
        files[`dist/${name}.d.ts`] = declaration(name);
      }
    }
    for (const name of fixture.extraDeclarations ?? []) {
      files[`dist/${name}.d.ts`] = declaration(name);
    }
    writeTree(root, files);
    return runScript("scripts/check-shipped-types.ts", root);
  };

  await test("a complete build passes", async () => {
    const result = await shippedTypesRun();
    expectOutput(
      "complete build",
      result,
      result.exitCode === 0 &&
        result.stdout.includes("every shipped declaration resolves"),
      "a dist/ that matches the source tree should pass",
    );
  });

  await test("a build that clears the file floor but lacks one declaration fails", async () => {
    const result = await shippedTypesRun({ omitDeclaration: "m7" });
    expectOutput(
      "missing declaration",
      result,
      result.exitCode === 1 &&
        combined(result).includes("missing from the build") &&
        combined(result).includes("dist/m7.d.ts"),
      "the declaration the build did not emit should be named",
    );
  });

  await test("a declaration left behind by a deleted source module fails", async () => {
    const result = await shippedTypesRun({ extraDeclarations: ["gone"] });
    expectOutput(
      "stale declaration",
      result,
      result.exitCode === 1 &&
        combined(result).includes("left over with no source module") &&
        combined(result).includes("dist/gone.d.ts"),
      "a dist/ declaration with no source module should be named",
    );
  });

  await test("a wildcard export needs a declaration matching the whole pattern", async () => {
    const wildcard = { "./foo/*": { types: "./dist/foo-*.d.ts" } };

    const unmatched = await shippedTypesRun({
      exports: wildcard,
      extraSources: ["bar"],
    });
    expectOutput(
      "unmatched wildcard",
      unmatched,
      unmatched.exitCode === 1 &&
        combined(unmatched).includes("published type entry point"),
      "foo-*.d.ts must not be satisfied by an unrelated declaration",
    );

    const matched = await shippedTypesRun({
      exports: wildcard,
      extraSources: ["bar", "foo-x"],
    });
    expectOutput(
      "matched wildcard",
      matched,
      matched.exitCode === 0,
      "foo-*.d.ts should be satisfied once a foo-* declaration exists",
    );
  });

  await test("a * in a directory component of an export is matched, not joined literally", async () => {
    const result = await shippedTypesRun({
      exports: { "./sub": { types: "./dist/*/index.d.ts" } },
      extraSources: ["sub/index"],
    });
    expectOutput(
      "directory wildcard",
      result,
      result.exitCode === 0,
      "dist/*/index.d.ts should be satisfied by dist/sub/index.d.ts",
    );
  });

  // -------------------------------------------------------------------------
  logSection("build-validations: typedoc.json excludes");
  // -------------------------------------------------------------------------

  const validatorRun = (typedocExclude: string[]): Promise<ProcessResult> => {
    const root = tempDir("tooling-validator-");
    writeTree(root, {
      "scripts/security-check.ts": "process.exit(0);\n",
      "tsconfig.json": "{}\n",
      "tsconfig.cli.json": "{}\n",
      "eslint.config.js": "export default [];\n",
      ".env.example": "",
      "src/lib/a.ts": "export {};\n",
      "src/cli/.keep": "",
      "typedoc.json": JSON.stringify({ exclude: typedocExclude }),
    });
    copyFileSync(
      join(REPO_ROOT, "scripts", "build-validations.ts"),
      join(root, "scripts", "build-validations.ts"),
    );
    copyFileSync(join(REPO_ROOT, "package.json"), join(root, "package.json"));
    symlinkSync(join(REPO_ROOT, "node_modules"), join(root, "node_modules"));
    // The validator resolves its root from its own location, so the copy
    // inside the fixture is the one that looks at the fixture's typedoc.json.
    return runCommand(TSX, [join(root, "scripts", "build-validations.ts")], {
      cwd: root,
      env: { ...process.env, DOTENV_CONFIG_PATH: "/dev/null" },
      timeoutMs: 150_000,
    });
  };

  await test("an unanchored directory exclude fails the validator, an anchored one passes", async () => {
    const anchored = await validatorRun([
      "**/node_modules/**",
      "./test/**",
      "**/*.test.ts",
    ]);
    expectOutput(
      "anchored excludes",
      anchored,
      anchored.exitCode === 0,
      "control fixture with anchored excludes should pass every validation",
    );

    const unanchored = await validatorRun(["**/node_modules/**", "**/test/**"]);
    expectOutput(
      "unanchored exclude",
      unanchored,
      unanchored.exitCode === 1 &&
        combined(unanchored).includes("typedoc.json exclude"),
      "an exclude that matches a directory name anywhere in the path should fail",
    );
  });

  // -------------------------------------------------------------------------
  logSection("commit-validation: reads the commit through git");
  // -------------------------------------------------------------------------

  const commitValidation = (
    cwd: string,
    args: string[] = [],
  ): Promise<ProcessResult> =>
    runScript("scripts/commit-validation.ts", cwd, { args });

  await test("an explicit message is validated", async () => {
    const dir = tempDir("tooling-commit-arg-");
    const ok = await commitValidation(dir, ["fix(scope): handle the case"]);
    const bad = await commitValidation(dir, ["fix: no scope"]);
    expectOutput(
      "scoped",
      ok,
      ok.exitCode === 0,
      "a scoped subject should pass",
    );
    expectOutput(
      "unscoped",
      bad,
      bad.exitCode === 1,
      "a bare type should fail",
    );
  });

  await test("with no argument the last commit's subject is read from git", async () => {
    const repo = tempDir("tooling-commit-git-");
    assertEqual((await git(repo, "init", "-q")).exitCode, 0, "git init failed");

    assertEqual(
      (await git(repo, "commit", "-q", "--allow-empty", "-m", "fix(a): ok"))
        .exitCode,
      0,
      "git commit failed",
    );
    // Without COMMIT_EDITMSG the script falls through to `git log -1`; with it
    // the script takes the `git rev-parse --git-dir` branch. Cover both.
    const viaEditMsg = await commitValidation(repo);
    unlinkSync(join(repo, ".git", "COMMIT_EDITMSG"));
    const viaLog = await commitValidation(repo);
    expectOutput(
      "COMMIT_EDITMSG",
      viaEditMsg,
      viaEditMsg.exitCode === 0,
      "a valid subject should pass via COMMIT_EDITMSG",
    );
    expectOutput(
      "git log",
      viaLog,
      viaLog.exitCode === 0,
      "a valid subject should pass via git log",
    );

    assertEqual(
      (
        await git(
          repo,
          "commit",
          "-q",
          "--allow-empty",
          "-m",
          "not a semantic subject",
        )
      ).exitCode,
      0,
      "second git commit failed",
    );
    unlinkSync(join(repo, ".git", "COMMIT_EDITMSG"));
    const rejected = await commitValidation(repo);
    expectOutput(
      "bad subject",
      rejected,
      rejected.exitCode === 1,
      "an invalid subject read from git should fail",
    );
  });

  // -------------------------------------------------------------------------
  logSection("migration-symbol-diff: which calls a commit dropped");
  // -------------------------------------------------------------------------

  await test("this-rooted, tagged, bracketed, super and import calls are tracked", async () => {
    const repo = tempDir("tooling-symbol-diff-");
    assertEqual((await git(repo, "init", "-q")).exitCode, 0, "git init failed");
    const before = [
      "class A extends B {",
      "  constructor() { super(); }",
      "  run() {",
      "    this.client.send();",
      "    this.logger.send();",
      "    tag`x`;",
      '    obj["foo"]();',
      '    import("x");',
      "    arr.forEach(handler);",
      "  }",
      "}",
      "",
    ].join("\n");
    const after = [
      "class A {",
      "  run() {",
      "    this.logger.send();",
      "    arr.forEach(handler);",
      "  }",
      "}",
      "",
    ].join("\n");
    writeFileSync(join(repo, "a.ts"), before);
    await git(repo, "add", "a.ts");
    await git(repo, "commit", "-q", "-m", "one");
    writeFileSync(join(repo, "a.ts"), after);
    await git(repo, "commit", "-q", "-am", "two");

    const result = await runCommand(
      process.execPath,
      [join(REPO_ROOT, "scripts", "migration-symbol-diff.mjs"), "HEAD", "a.ts"],
      { cwd: repo, timeoutMs: 30_000 },
    );
    const gone = result.stdout
      .split("\n")
      .filter((line) => line.startsWith("   GONE: "))
      .map((line) => line.slice("   GONE: ".length))
      .sort();
    // `send` is NOT among them: this.logger.send() survives, and only the
    // this-rooted paths can tell the two calls apart.
    const expected = [
      "foo",
      "import",
      "obj.foo",
      "super",
      "tag",
      "this.client.send",
    ];
    if (gone.join("|") !== expected.join("|")) {
      showOutput("symbol diff", result);
    }
    assertEqual(
      gone.join("|"),
      expected.join("|"),
      "the set of vanished calls differs from the expected one",
    );
  });

  // -------------------------------------------------------------------------
  logSection("codex-replay-listener: serving and shutdown");
  // -------------------------------------------------------------------------

  const freePort = (): Promise<number> =>
    new Promise((resolvePort, reject) => {
      const probe = createServer();
      probe.once("error", reject);
      probe.listen(0, "127.0.0.1", () => {
        const address = probe.address();
        const port = typeof address === "object" && address ? address.port : 0;
        probe.close(() => resolvePort(port));
      });
    });

  type Listener = {
    port: number;
    child: ChildProcess;
    exited: Promise<number | null>;
  };

  const startListener = async (args: string[]): Promise<Listener> => {
    const port = await freePort();
    const child = spawn(
      TSX,
      [
        join(REPO_ROOT, "scripts", "codex-replay-listener.ts"),
        "--port",
        String(port),
        "--delay-ms",
        "0",
        ...args,
      ],
      { cwd: REPO_ROOT, stdio: ["ignore", "pipe", "pipe"] },
    );
    const exited = new Promise<number | null>((resolveExit) => {
      child.once("exit", (code) => resolveExit(code));
    });
    await new Promise<void>((resolveReady, reject) => {
      const timer = setTimeout(
        () => reject(new Error("listener did not start in time")),
        30_000,
      );
      child.stdout?.on("data", (chunk: Buffer) => {
        if (chunk.toString().includes("Listening on")) {
          clearTimeout(timer);
          resolveReady();
        }
      });
      child.once("exit", () => {
        clearTimeout(timer);
        reject(new Error("listener exited before it was listening"));
      });
    });
    return { port, child, exited };
  };

  // `agent: false` opens a fresh connection per call, so a request made after
  // the listener has shut down fails to connect instead of riding a kept-alive
  // socket that predates the shutdown. That failure comes back as status 0
  // rather than a rejection: the socket error's own text names the refused
  // connection, which defineSuite would classify as a skip and hide.
  const send = (
    port: number,
    method: string,
    path: string,
    body?: unknown,
  ): Promise<{ status: number; text: string }> =>
    new Promise((resolveResponse) => {
      const payload = body === undefined ? undefined : JSON.stringify(body);
      const req = request(
        {
          host: "127.0.0.1",
          port,
          method,
          path,
          agent: false,
          headers: payload
            ? {
                "content-type": "application/json",
                "content-length": Buffer.byteLength(payload),
              }
            : {},
        },
        (res) => {
          let text = "";
          res.setEncoding("utf8");
          res.on("data", (chunk: string) => {
            text += chunk;
          });
          res.on("end", () =>
            resolveResponse({ status: res.statusCode ?? 0, text }),
          );
        },
      );
      req.once("error", () => resolveResponse({ status: 0, text: "" }));
      req.end(payload);
    });

  const withTimeout = <T>(
    promise: Promise<T>,
    ms: number,
  ): Promise<T | "timeout"> =>
    Promise.race([
      promise,
      new Promise<"timeout">((resolveTimeout) =>
        setTimeout(() => resolveTimeout("timeout"), ms),
      ),
    ]);

  // Tool declarations nest (a namespace holds its own `tools`), so walk the
  // whole body and take the name of every custom or function entry found
  // under a `tools` array.
  const declaredToolNames = (node: unknown, inTools = false): string[] => {
    if (Array.isArray(node)) {
      return node.flatMap((child) => declaredToolNames(child, inTools));
    }
    if (typeof node !== "object" || node === null) {
      return [];
    }
    const entry = node as Record<string, unknown>;
    const own =
      inTools &&
      (entry.type === "custom" || entry.type === "function") &&
      typeof entry.name === "string"
        ? [entry.name]
        : [];
    return [
      ...own,
      ...Object.entries(entry).flatMap(([key, value]) =>
        declaredToolNames(value, inTools || key === "tools"),
      ),
    ];
  };

  const eventsOf = (sse: string): Array<Record<string, unknown>> =>
    [...sse.matchAll(/^data: (.*)$/gm)].map(
      (match) => JSON.parse(match[1]) as Record<string, unknown>,
    );

  await test("a 404 probe does not use up --requests before a turn is served", async () => {
    const listener = await startListener([
      "--script",
      "full",
      "--requests",
      "1",
    ]);
    try {
      const probe = await send(listener.port, "GET", "/models");
      assertEqual(probe.status, 404, "a non-/responses path should 404");

      const turn = await send(
        listener.port,
        "POST",
        "/backend-api/codex/responses",
        { input: [] },
      );
      assertEqual(
        turn.status,
        200,
        "the POST after the probe should be served",
      );
      assert(
        turn.text.includes("response.completed"),
        "the served turn should be complete",
      );

      const exit = await withTimeout(listener.exited, 10_000);
      assert(
        exit === 0,
        "the listener should exit cleanly once --requests turns were served",
      );
    } finally {
      listener.child.kill("SIGKILL");
    }
  });

  await test("the tool-call script names a tool the request did not declare", async () => {
    const listener = await startListener([
      "--script",
      "tool-call",
      "--requests",
      "1",
    ]);
    try {
      // The request a real Codex CLI sends, not a hand-built stand-in: the
      // names it declares are what a function_call must not collide with.
      const fixture = JSON.parse(
        readFileSync(
          join(REPO_ROOT, "test", "fixtures", "codex-request-exec-mode.json"),
          "utf8",
        ),
      ) as { body: unknown };
      const declared = declaredToolNames(fixture.body);
      assert(
        declared.includes("exec"),
        "the fixture should declare the exec tool, or this test proves nothing",
      );
      const turn = await send(
        listener.port,
        "POST",
        "/backend-api/codex/responses",
        fixture.body,
      );
      assertEqual(turn.status, 200, "the tool-call turn should be served");

      const call = eventsOf(turn.text)
        .map((event) => event.item as Record<string, unknown> | undefined)
        .find((item) => item?.type === "function_call");
      assertNotNull(call, "the turn should carry a function_call item");
      assert(
        typeof call.call_id === "string" && call.call_id.startsWith("toolu_"),
        "the call keeps the toolu_ id this script exists to round-trip",
      );
      assert(
        typeof call.name === "string" && !declared.includes(call.name),
        "the call must not name a tool the CLI would route to its own handler",
      );
    } finally {
      listener.child.kill("SIGKILL");
    }
  });
});
