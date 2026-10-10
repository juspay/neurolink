#!/usr/bin/env tsx
import "dotenv/config";

/**
 * Continuous Test Suite — Tooling Shell Safety
 *
 * Repo tooling and test helpers that start other programs, driven the only way
 * anyone reaches them (as child processes) from a checkout whose directory name
 * is hostile: spaces, single and double quotes, `;`, `$(...)`, a backquote and
 * `&`. Each case proves the path travels as ONE argument and is never re-parsed
 * as shell syntax.
 *
 *   tools/content/documentationSync.ts                       typedoc --out <dir>
 *   tools/converted-scripts/scriptsCreateFinalWorkingRecordings.ts
 *                                                            node <cli> ..., asciinema rec ...
 *   tools/automation/shellConverter.ts                       the JavaScript it generates
 *   test/helpers/harness.ts          runCommand              never a shell
 *   test/helpers/execFileResult.ts   execFileResult          the RAG suite's CLI runner
 *
 * ## Why this does not go through NeuroLink (CLAUDE.md rule 15)
 *
 * None of these is part of the published package: `package.json` `files` ships
 * `dist/` and a few named assets, and `tools/` and `test/` are not among them.
 * No `generate()`, `stream()` or `dist/cli` call reaches them, so the rule's own
 * surface is not available. Nothing is imported from `src/lib/`; each tool runs
 * as the real program with real arguments and the suite reads only what it
 * started and what it wrote.
 *
 * Determinism is what the fixture trees buy. A live run happens in one
 * checkout, whose path never contains `; touch PWNED;`. Here the tree is
 * created inside such a directory, programs the tools launch are stubs that log
 * their argument vector, and a shell that parsed the path would leave a `PWNED`
 * file behind.
 *
 * Nothing here touches the network or a credential.
 *
 * Run: npx tsx test/continuous-test-suite-tooling-shell-safety.ts
 *      pnpm run test:tooling-shell-safety
 */

import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import { delimiter, dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { execFileResult, splitCommandLine } from "./helpers/execFileResult.js";
import {
  assert,
  assertEqual,
  defineSuite,
  logSection,
  runCommand,
  tempDir,
  type ProcessResult,
} from "./helpers/harness.js";

const { test, runSuite } = defineSuite("Tooling Shell Safety", {
  offline: true,
  perTestTimeoutMs: 120_000,
});

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TSX_CLI = join(REPO_ROOT, "node_modules", "tsx", "dist", "cli.mjs");

// Every shell metacharacter that could turn a path into syntax. `touch PWNED`
// runs in the program's working directory, which every case sets to the
// hostile directory itself, so a parse leaves PWNED / PWNED2 / PWNED3 there.
const HOSTILE_NAME =
  "a b; touch PWNED; 'q' \"d\" $(touch PWNED2) `touch PWNED3` &";
const MARKERS = ["PWNED", "PWNED2", "PWNED3"];

type StubCall = { tool: string; entry: string; argv: string[] };

// A program that does nothing but record how it was started. Written as a Node
// script with a shebang so the same file serves as `npx`, `asciinema` and a CLI
// entry; the log sits next to it, so it needs no environment. It uses
// getBuiltinModule rather than require/import so it runs the same whether the
// directory it sits in is CommonJS or (as the copied tools' roots are) ESM.
const STUB_SOURCE = (tool: string): string =>
  [
    "#!/usr/bin/env node",
    'const fs = process.getBuiltinModule("node:fs");',
    'const path = process.getBuiltinModule("node:path");',
    'fs.appendFileSync(path.join(path.dirname(process.argv[1]), "calls.jsonl"),',
    `  JSON.stringify({ tool: ${JSON.stringify(tool)}, entry: process.argv[1], argv: process.argv.slice(2) }) + "\\n");`,
    "",
  ].join("\n");

const writeStub = (file: string, tool: string): void => {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, STUB_SOURCE(tool));
  chmodSync(file, 0o755);
};

const readCalls = (stubFile: string): StubCall[] => {
  const log = join(dirname(stubFile), "calls.jsonl");
  if (!existsSync(log)) {
    return [];
  }
  return readFileSync(log, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as StubCall);
};

// Resolved through symlinks: the tools derive their root from import.meta.url,
// which Node reports as the real path (/private/var/... where tmpdir() says
// /var/...), and the assertions compare paths byte for byte.
const hostileRoot = (prefix: string): string => {
  const root = join(tempDir(prefix), HOSTILE_NAME);
  mkdirSync(root, { recursive: true });
  return realpathSync(root);
};

const injected = (root: string): string[] =>
  MARKERS.filter((marker) => existsSync(join(root, marker)));

const showOutput = (label: string, result: ProcessResult): void => {
  console.error(`    [${label}] exit=${result.exitCode}`);
  for (const line of `${result.stdout}\n${result.stderr}`
    .trim()
    .split("\n")
    .slice(-25)) {
    console.error(`    | ${line}`);
  }
};

const copyTool = (root: string, relative: string): string => {
  const target = join(root, relative);
  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(join(REPO_ROOT, relative), target);
  // The copied tool is ESM; without this tsx would treat a lone .ts as CJS.
  writeFileSync(join(root, "package.json"), '{"type":"module"}\n');
  return target;
};

const runTsx = (
  args: string[],
  cwd: string,
  extraPath?: string,
): Promise<ProcessResult> =>
  runCommand(process.execPath, [TSX_CLI, ...args], {
    cwd,
    env: {
      ...process.env,
      DOTENV_CONFIG_PATH: "/dev/null",
      PATH: extraPath
        ? `${extraPath}${delimiter}${process.env.PATH ?? ""}`
        : (process.env.PATH ?? ""),
    },
    timeoutMs: 90_000,
  });

await runSuite(async () => {
  // -------------------------------------------------------------------------
  logSection("documentationSync: typedoc output directory");
  // -------------------------------------------------------------------------

  await test("the typedoc output directory is one argument, whatever the checkout path holds", async () => {
    const root = hostileRoot("shell-safety-docsync-");
    const tool = copyTool(root, "tools/content/documentationSync.ts");
    const binDir = join(tempDir("shell-safety-docsync-bin-"), "bin");
    writeStub(join(binDir, "npx"), "npx");

    const driver = join(tempDir("shell-safety-docsync-driver-"), "drive.mjs");
    writeFileSync(
      driver,
      [
        'import { pathToFileURL } from "node:url";',
        "const { default: DocumentationSync } = await import(",
        "  pathToFileURL(process.argv[2]).href,",
        ");",
        "const sync = new DocumentationSync();",
        "await sync.generateApiReference();",
        "console.log(JSON.stringify(sync.results.apiGeneration));",
        "",
      ].join("\n"),
    );

    const result = await runTsx([driver, tool], root, binDir);
    const calls = readCalls(join(binDir, "npx"));
    const apiDir = join(root, "docs", "api");
    const ok =
      result.exitCode === 0 &&
      injected(root).length === 0 &&
      calls.length === 2 &&
      JSON.stringify(calls[0].argv) ===
        JSON.stringify(["typedoc", "--version"]) &&
      JSON.stringify(calls[1].argv) ===
        JSON.stringify(["typedoc", "--out", apiDir, "src/"]) &&
      result.stdout.includes('"status":"success"');
    if (!ok) {
      showOutput("documentationSync", result);
      console.error(
        `    calls=${calls.length} injected=${injected(root).join(",")}`,
      );
    }
    assert(
      ok,
      "typedoc was not started with the exact output directory as one argument",
    );
  });

  // -------------------------------------------------------------------------
  logSection(
    "scriptsCreateFinalWorkingRecordings: tested and recorded commands",
  );
  // -------------------------------------------------------------------------

  await test("the CLI path reaches both the test run and the asciinema command as data", async () => {
    const root = hostileRoot("shell-safety-recordings-");
    const tool = copyTool(
      root,
      "tools/converted-scripts/scriptsCreateFinalWorkingRecordings.ts",
    );
    const cli = join(root, "dist", "cli", "index.js");
    writeStub(cli, "cli");
    const binDir = join(tempDir("shell-safety-recordings-bin-"), "bin");
    const asciinema = join(binDir, "asciinema");
    writeStub(asciinema, "asciinema");

    const result = await runTsx([tool], root, binDir);
    const cliCalls = readCalls(cli);
    const recCalls = readCalls(asciinema);

    const expected: Array<{
      name: string;
      description: string;
      argv: string[];
    }> = [
      {
        name: "01-provider-status-all-9",
        description: "NeuroLink - All 9 Providers Status",
        argv: ["status"],
      },
      {
        name: "02-openai-working",
        description: "OpenAI Text Generation Success",
        argv: ["generate", "Hello from OpenAI", "--provider", "openai"],
      },
      {
        name: "03-ollama-working",
        description: "Ollama Local AI Success",
        argv: [
          "generate",
          "Hello from Ollama local AI",
          "--provider",
          "ollama",
        ],
      },
      {
        name: "04-google-ai-working",
        description: "Google AI Studio Success",
        argv: ["generate", "Hello from Google AI", "--provider", "google-ai"],
      },
      {
        name: "05-anthropic-working",
        description: "Anthropic Claude Success",
        argv: [
          "generate",
          "Hello from Anthropic Claude",
          "--provider",
          "anthropic",
        ],
      },
      {
        name: "06-auto-selection-working",
        description: "Auto Provider Selection Success",
        argv: ["generate", "Auto select best provider", "--provider", "auto"],
      },
      {
        name: "07-configuration-help",
        description: "Provider Configuration Help",
        argv: ["config", "--help"],
      },
      {
        name: "08-cli-help-overview",
        description: "NeuroLink CLI Help Overview",
        argv: ["--help"],
      },
    ];

    // Each command is first tested (one CLI call), then recorded: asciinema is
    // handed a `--command` string, which is the one place a shell runs. Run
    // that string through a real shell to prove it reproduces the same argv.
    // The shell is reached through env, as in the CLI JSON suite: the shared
    // runCommand never takes a shell interpreter as its command.
    const replayed: StubCall[] = [];
    for (const rec of recCalls) {
      const commandIndex = rec.argv.indexOf("--command");
      const commandLine = commandIndex >= 0 ? rec.argv[commandIndex + 1] : "";
      const before = readCalls(cli).length;
      const shell = await runCommand(
        "/usr/bin/env",
        ["sh", "-c", commandLine],
        {
          cwd: root,
        },
      );
      assertEqual(shell.exitCode, 0, "the recorded command line did not run");
      replayed.push(...readCalls(cli).slice(before));
    }

    const castDir = join(root, "docs", "cli-recordings", "final-working");
    const ok =
      result.exitCode === 0 &&
      injected(root).length === 0 &&
      cliCalls.length === expected.length &&
      recCalls.length === expected.length &&
      expected.every((rec, i) => {
        const tested = cliCalls[i];
        const recorded = recCalls[i];
        return (
          tested.entry === cli &&
          JSON.stringify(tested.argv) === JSON.stringify(rec.argv) &&
          JSON.stringify(recorded.argv.slice(0, 5)) ===
            JSON.stringify([
              "rec",
              join(castDir, `${rec.name}.cast`),
              "--title",
              rec.description,
              "--command",
            ]) &&
          recorded.argv[recorded.argv.length - 1] === "--overwrite" &&
          replayed[i]?.entry === cli &&
          JSON.stringify(replayed[i].argv) === JSON.stringify(rec.argv)
        );
      });
    if (!ok) {
      showOutput("recordings", result);
      console.error(
        `    cliCalls=${cliCalls.length} recCalls=${recCalls.length} replayed=${replayed.length} injected=${injected(root).join(",")}`,
      );
    }
    assert(
      ok,
      "a command or its recording did not receive the CLI path and arguments intact",
    );
  });

  // -------------------------------------------------------------------------
  logSection("shellConverter: generated fallback for lines it cannot convert");
  // -------------------------------------------------------------------------

  await test("a backslash and a quote in a shell line survive into the generated script", async () => {
    const root = hostileRoot("shell-safety-converter-");
    mkdirSync(join(root, "scripts"), { recursive: true });
    // The generated script is ESM; say so rather than rely on syntax detection.
    writeFileSync(join(root, "package.json"), '{"type":"module"}\n');
    writeFileSync(
      join(root, "scripts", "probe.sh"),
      [
        "#!/bin/sh",
        // Backslash inside single quotes: the generated script must hand the
        // shell exactly this text, not a JavaScript-unescaped copy of it.
        "printf '%s' 'a\\b' > backslash.out",
        // A quote preceded by a backslash used to close the generated string
        // literal and let the rest of the line run as JavaScript.
        'true \\\', 0); await fs.writeFile("injected-marker", ""); //',
        "",
      ].join("\n"),
    );

    const convert = await runTsx(
      [join(REPO_ROOT, "tools", "automation", "shellConverter.ts")],
      root,
    );
    const generated = join(root, "tools", "converted-scripts", "probe.js");
    assert(
      convert.exitCode === 0 && existsSync(generated),
      "the converter did not produce probe.js",
    );

    const run = await runCommand(
      process.execPath,
      [
        "--input-type=module",
        "-e",
        "const m = await import(process.argv[1]); await m.main();",
        pathToFileURL(generated).href,
      ],
      { cwd: root, timeoutMs: 60_000 },
    );
    const backslashOut = existsSync(join(root, "backslash.out"))
      ? readFileSync(join(root, "backslash.out"), "utf8")
      : null;
    const ok =
      run.exitCode === 0 &&
      backslashOut === "a\\b" &&
      !existsSync(join(root, "injected-marker")) &&
      injected(root).length === 0;
    if (!ok) {
      showOutput("generated script", run);
      console.error(
        `    backslash.out=${backslashOut === null ? "missing" : "present"} injected-marker=${existsSync(join(root, "injected-marker"))}`,
      );
    }
    assert(
      ok,
      "the generated script altered the shell line or ran text taken from it",
    );
  });

  // -------------------------------------------------------------------------
  logSection("test helpers: runCommand and execFileResult");
  // -------------------------------------------------------------------------

  await test("runCommand passes a hostile path and argument as data and refuses a shell", async () => {
    const root = hostileRoot("shell-safety-harness-");
    const stub = join(root, "bin dir", "stub tool; 'x'");
    writeStub(stub, "stub");

    const hostileArg = `--rag-files=${root}/x; touch PWNED`;
    const plain = await runCommand(stub, [hostileArg, "two words"], {
      cwd: root,
      timeoutMs: 30_000,
    });
    // An untyped caller (JSON.parse returns any) cannot switch a shell on.
    const untyped = await runCommand(
      stub,
      [hostileArg],
      JSON.parse(`{"shell": true, "cwd": ${JSON.stringify(root)}}`),
    );

    const calls = readCalls(stub);
    const ok =
      plain.exitCode === 0 &&
      untyped.exitCode === 0 &&
      calls.length === 2 &&
      calls[0].entry === stub &&
      JSON.stringify(calls[0].argv) ===
        JSON.stringify([hostileArg, "two words"]) &&
      JSON.stringify(calls[1].argv) === JSON.stringify([hostileArg]) &&
      injected(root).length === 0;
    if (!ok) {
      showOutput("plain", plain);
      showOutput("untyped", untyped);
      console.error(
        `    calls=${calls.length} injected=${injected(root).join(",")}`,
      );
    }
    assert(
      ok,
      "runCommand did not pass its command and arguments through intact",
    );
  });

  // The type refuses `shell: true`; a regression to the loose SpawnOptions type
  // turns this directive into an unused one and `check:tools-tests` fails.
  const refusesShellAtCompileTime = (): void => {
    // @ts-expect-error runCommand does not accept a shell option
    void runCommand("true", [], { shell: true });
  };
  void refusesShellAtCompileTime;

  await test("execFileResult runs a program at a hostile path with hostile arguments as data", async () => {
    const root = hostileRoot("shell-safety-execfile-");
    const cli = join(root, "dist", "cli", "index.js");
    writeStub(cli, "cli");

    const sample = join(root, "fixtures", "sample document; touch PWNED2.md");
    const prompt = `What's "in" $(touch PWNED3) this; document?`;
    const ok = execFileResult(
      "node",
      [cli, "generate", prompt, "--rag-files", sample],
      { cwd: root, timeoutMs: 30_000 },
    );
    const calls = readCalls(cli);
    assert(
      ok.success &&
        calls.length === 1 &&
        calls[0].entry === cli &&
        JSON.stringify(calls[0].argv) ===
          JSON.stringify(["generate", prompt, "--rag-files", sample]) &&
        injected(root).length === 0,
      "execFileResult did not deliver the path and arguments as separate words",
    );

    const failing = execFileResult("node", ["-e", "process.exit(3)"], {
      cwd: root,
      timeoutMs: 30_000,
    });
    assert(
      !failing.success && failing.output === "",
      "a failing program should report success=false",
    );

    const timedOut = execFileResult(
      "node",
      ["-e", "setTimeout(() => {}, 30000)"],
      { cwd: root, timeoutMs: 500 },
    );
    assert(
      !timedOut.success &&
        timedOut.error.startsWith("CLI subprocess timed out"),
      "a program past its timeout should be reported as timed out",
    );
  });

  // -------------------------------------------------------------------------
  logSection("splitCommandLine: words without a shell");
  // -------------------------------------------------------------------------

  await test("splitCommandLine keeps quoted text together and expands nothing", () => {
    const cases: Array<[string, string[]]> = [
      [
        "rag chunk a.md --strategy markdown",
        ["rag", "chunk", "a.md", "--strategy", "markdown"],
      ],
      [
        `generate "What is this?" --x 'it''s'`,
        ["generate", "What is this?", "--x", "its"],
      ],
      [`say "a \\"b\\" \\$HOME" c\\ d`, ["say", 'a "b" $HOME', "c d"]],
      [
        `echo $(touch PWNED) \`id\` *`,
        ["echo", "$(touch", "PWNED)", "`id`", "*"],
      ],
      [`x "" y`, ["x", "", "y"]],
      ["   ", []],
    ];
    for (const [input, words] of cases) {
      assertEqual(
        JSON.stringify(splitCommandLine(input)),
        JSON.stringify(words),
        "a command line was split into the wrong words",
      );
    }
    let threw = false;
    try {
      splitCommandLine(`generate "unterminated`);
    } catch {
      threw = true;
    }
    assert(threw, "an unterminated quote should be refused");
  });
});
