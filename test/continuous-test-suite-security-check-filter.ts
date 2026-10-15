/**
 * Placeholder classification in the fallback secret scanner
 * (scripts/lib/secretPlaceholder.ts, used by scripts/security-check.ts when
 * gitleaks is not installed).
 *
 * Determinism exception to the e2e-only rule: this is a pure classifier over
 * scanner output lines, and the surface under test is the repository's own
 * pre-commit / CI gate rather than the published SDK — there is no
 * `generate()` that could exercise it. The scanner's fallback path has been
 * wrong twice (inspecting only the text before the first colon, then the
 * whole line); this suite pins the scope the gate is meant to judge from: the
 * matched secret and a trailing comment, nothing else on the line.
 *
 * The same exception covers the gitleaks half of the gate
 * (scripts/lib/gitleaksRun.ts): the argv builder and the reader of gitleaks'
 * result are pure, and what is deterministic about the rest is its input. The
 * live controls run the real binary over temp directories holding secrets
 * built in code from a fixed alphabet (never a literal in this file, which the
 * gate scans too) with the shipped .gitleaks.toml; the gate cases run
 * scripts/security-check.ts against a stub `gitleaks` on a PATH that holds
 * nothing else. No network is touched, and the live controls skip, naming why,
 * when gitleaks is not installed (CI runners do not install it).
 *
 * Run: npx tsx test/continuous-test-suite-security-check-filter.ts
 */

import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineSuite, assert, Skip, tempDir } from "./helpers/harness.js";
import {
  GITLEAKS_CONFIG_FILE,
  buildGitleaksArgs,
  interpretGitleaksRun,
} from "../scripts/lib/gitleaksRun.js";
import {
  isPlaceholderSecret,
  splitRgMatch,
} from "../scripts/lib/secretPlaceholder.js";

const AWS = "AKIA[0-9A-Z]{16}";
const OPENAI = "sk-[A-Za-z0-9\\-]{20,}";

// Real-shaped fixtures are assembled at runtime so the literal never sits in
// this file: the scanner under test walks test/ too, and would (correctly)
// flag them.
const REAL_AWS = "AKIA" + "ABCDEFGHIJKLMNOP";
const REAL_OPENAI = "sk-" + "ABCDEFGHIJKLMNOPQRSTUVWXYZ012345";

const { test, runSuite } = defineSuite("security-check placeholder filter", {
  offline: true,
});

await test("a labelled placeholder on a key: value line is skipped (trailing comment)", async () => {
  const line =
    '  AWS_ACCESS_KEY_ID: "AKIALOCALENDPOINTONLY", // placeholder, not a real key';
  assert(
    isPlaceholderSecret(line, AWS),
    "a trailing comment naming the value a placeholder must skip the match",
  );
});

await test("a marker inside the secret itself is skipped", async () => {
  // A positive control: confirm the fixture actually matches OPENAI (30
  // characters after `sk-`, all letters/hyphens) before trusting its
  // classification — a token that happened not to match would read as a
  // placeholder too, since isPlaceholderSecret returns true when it finds
  // no match at all, and that would pass this assertion for the wrong
  // reason.
  assert(
    new RegExp(OPENAI).test("sk-your-key-here-abcdefghijklmnop"),
    "the fixture must itself match the OPENAI pattern",
  );
  assert(
    isPlaceholderSecret('apiKey: "sk-your-key-here-abcdefghijklmnop"', OPENAI),
    "a secret whose own text carries a marker is a placeholder",
  );
  assert(
    isPlaceholderSecret('apiKey: "sk-testABCDEFGHIJKLMNOPQRSTUVWXYZ"', OPENAI),
    "a test-prefixed secret is a placeholder",
  );
});

await test("a real-shaped key on a line that merely contains a marker word in code is flagged", async () => {
  assert(
    !isPlaceholderSecret(`const k = { test: 1, key: "${REAL_AWS}" };`, AWS),
    "a marker word elsewhere on the line must not hide the key",
  );
  assert(
    !isPlaceholderSecret(
      `apiKey: "${REAL_OPENAI}", there: 1, x: y.replace()`,
      OPENAI,
    ),
    "code on the same line must not hide the key",
  );
});

await test("a real-shaped key with no marker anywhere is flagged", async () => {
  assert(
    !isPlaceholderSecret(`  AWS_ACCESS_KEY_ID: "${REAL_AWS}",`, AWS),
    "an unlabelled key must be a finding",
  );
});

await test("a URL earlier on the line is not a comment: the key after it is still flagged", async () => {
  // The `//` of `https://` used to be taken as the comment opener, so
  // `example` in the host hid a real key that followed it.
  assert(
    !isPlaceholderSecret(
      `fetch("https://api.example.com/v1", { headers: { Authorization: "Bearer ${REAL_OPENAI}" } })`,
      OPENAI,
    ),
    "a marker word inside a URL host must not hide the key that follows it",
  );
  assert(
    !isPlaceholderSecret(
      `const url = "https://x.test/a"; const k = "${REAL_AWS}"`,
      AWS,
    ),
    "a URL statement before the key must not hide it",
  );
  assert(
    !isPlaceholderSecret(
      `const url = "https://x.test/a#example"; const k = "${REAL_AWS}"`,
      AWS,
    ),
    "a # inside a URL fragment is not a comment opener",
  );
  assert(
    !isPlaceholderSecret(`const glob = "src/*"; const k = "${REAL_AWS}"`, AWS),
    "a /* glued to a path is not a block-comment opener",
  );
  assert(
    !isPlaceholderSecret(
      `const note = " // example"; const key = "${REAL_AWS}";`,
      AWS,
    ),
    "a // inside a quoted string is not a comment opener, even after whitespace",
  );
});

await test("a trailing comment applies only to the match closest to it", async () => {
  const decoy = "AKIA" + "NOTREALNOTREALXX";
  assert(
    !isPlaceholderSecret(
      `const real = "${REAL_AWS}"; const decoy = "${decoy}"; // placeholder`,
      AWS,
    ),
    "an earlier real key must not inherit a trailing comment meant for the decoy next to it",
  );
  assert(
    isPlaceholderSecret(`const decoy = "${decoy}"; // placeholder`, AWS),
    "the match actually closest to the trailing comment still gets it",
  );
});

await test("a comment starts only at line start or after whitespace, and its marker still counts", async () => {
  assert(
    isPlaceholderSecret(
      `fetch("https://api.acme.test/v1", { key: "${REAL_OPENAI}" }) // example only`,
      OPENAI,
    ),
    "a real trailing // comment with a marker still skips the match",
  );
  assert(
    isPlaceholderSecret(`key = "${REAL_AWS}" # placeholder`, AWS),
    "a # comment after whitespace still skips the match",
  );
  assert(
    isPlaceholderSecret(`key = "${REAL_AWS}" /* sample */`, AWS),
    "a /* comment after whitespace still skips the match",
  );
  assert(
    isPlaceholderSecret(`// example config: key = "${REAL_AWS}"`, AWS),
    "a key inside a comment that carries a marker is a placeholder",
  );
  assert(
    !isPlaceholderSecret(`// TODO rotate: key = "${REAL_AWS}"`, AWS),
    "a key inside a comment with no marker is still a finding — commented out is not fake",
  );
  assert(
    !isPlaceholderSecret(`key = "${REAL_AWS}" <!-- example -->`, AWS),
    "an HTML comment is not recognised as a comment",
  );
});

await test("a filler run in the secret's position is skipped", async () => {
  assert(
    isPlaceholderSecret('token: "sk-xxxxxxxxxxxxxxxxxxxxxxxx"', OPENAI),
    "a run of x characters is filler, not a key",
  );
});

await test("splitRgMatch keeps colons inside the content", async () => {
  const parsed = splitRgMatch('src/a.ts:12:  KEY: "value:with:colons"');
  assert(parsed !== null, "a well-formed rg line must parse");
  assert(parsed!.path === "src/a.ts", "path is the first segment");
  assert(parsed!.line === "12", "line is the second segment");
  assert(
    parsed!.content === '  KEY: "value:with:colons"',
    "content is everything after the second colon",
  );
  assert(splitRgMatch("no-colons-here") === null, "a bare line does not parse");
});

// ---------------------------------------------------------------------------
// gitleaks: invocation and reading of the result
// ---------------------------------------------------------------------------

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SHIPPED_CONFIG = join(REPO_ROOT, GITLEAKS_CONFIG_FILE);
const GATE_SCRIPT = join(REPO_ROOT, "scripts", "security-check.ts");
const TSX_CLI = createRequire(import.meta.url).resolve("tsx/cli");

const ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

/**
 * Text with no repeats up to 62 characters, so it clears every entropy floor,
 * and none of the global stopwords, so the allowlist cannot be what hides it.
 */
function synthetic(length: number, offset = 3): string {
  return Array.from({ length }, (_, i) =>
    ALPHABET.charAt((i * 7 + offset) % ALPHABET.length),
  ).join("");
}

const probe = spawnSync("gitleaks", ["version"], { encoding: "utf8" });
const GITLEAKS_ON_PATH = probe.error === undefined && probe.status === 0;

function requireGitleaks(): void {
  if (!GITLEAKS_ON_PATH) {
    throw new Skip(
      "gitleaks is not on PATH, so the live scan control cannot run (CI uses the ripgrep fallback)",
    );
  }
}

/** Real gitleaks, the argv the gate builds, the shipped config, a temp dir. */
function scan(files: Record<string, string>) {
  const dir = tempDir("neurolink-gitleaks-");
  for (const [name, text] of Object.entries(files)) {
    writeFileSync(join(dir, name), text);
  }
  const result = spawnSync("gitleaks", buildGitleaksArgs(SHIPPED_CONFIG), {
    cwd: dir,
    encoding: "utf8",
    timeout: 60_000,
    killSignal: "SIGKILL",
    maxBuffer: 10 * 1024 * 1024,
  });
  const stdout = result.stdout ?? "";
  return {
    stdout,
    outcome: interpretGitleaksRun({
      status: result.status,
      stdout,
      stderr: result.stderr ?? "",
    }),
  };
}

function flagValue(args: string[], flag: string): string | undefined {
  const at = args.indexOf(flag);
  return at === -1 ? undefined : args[at + 1];
}

await test("gitleaks argv uses the 8.x report flags and never --format", async () => {
  const args = buildGitleaksArgs("/repo/.gitleaks.toml");
  assert(
    flagValue(args, "--report-format") === "json",
    "the report format flag must be --report-format json",
  );
  assert(!args.includes("--format"), "--format is not a gitleaks 8.x flag");
  assert(
    flagValue(args, "--report-path") === "-",
    "the report must go to stdout, not into the scanned tree",
  );
  assert(args.includes("--redact"), "the report must not carry matched text");
  assert(
    flagValue(args, "--exit-code") === "0",
    "findings must not change the exit status, so a non-zero one means failure",
  );
  assert(args.includes("--no-git"), "the working tree is scanned, not history");
  assert(
    flagValue(args, "--config") === "/repo/.gitleaks.toml",
    "a config that exists is passed",
  );
  assert(
    !buildGitleaksArgs(undefined).includes("--config"),
    "no config flag when there is no config file",
  );
});

await test("a gitleaks run that exits non-zero is failed, never clean", async () => {
  const usage = interpretGitleaksRun({
    status: 126,
    stdout: "",
    stderr:
      "Error: unknown flag: --format\nUsage:\n  gitleaks detect [flags]\n",
  });
  assert(usage.kind === "failed", "exit 126 with no report must be failed");
  assert(
    usage.kind === "failed" && usage.reason.includes("unknown flag"),
    "the reason must carry the first stderr line",
  );
  assert(
    usage.kind === "failed" && !usage.reason.includes("Usage:"),
    "the reason must carry the first stderr line only",
  );

  const withEmptyReport = interpretGitleaksRun({
    status: 1,
    stdout: "[]",
    stderr: "unable to load gitleaks config",
  });
  assert(
    withEmptyReport.kind === "failed",
    "a non-zero exit is failed even when stdout looks like an empty report",
  );

  const killed = interpretGitleaksRun({ status: null, stdout: "", stderr: "" });
  assert(killed.kind === "failed", "a run with no exit status is failed");
});

await test("a status-0 run with an empty report is clean", async () => {
  for (const stdout of ["[]", "  []\n", ""]) {
    assert(
      interpretGitleaksRun({ status: 0, stdout, stderr: "" }).kind === "clean",
      "an empty report after a completed run is clean",
    );
  }
});

await test("a status-0 run with findings returns them without the matched text", async () => {
  const outcome = interpretGitleaksRun({
    status: 0,
    stdout: JSON.stringify([
      {
        RuleID: "private-key",
        File: "a.pem",
        StartLine: 2,
        Description: "Identified a Private Key",
        Secret: "REDACTED",
        Match: "REDACTED",
      },
    ]),
    stderr: "",
  });
  assert(outcome.kind === "findings", "a one-element report is findings");
  if (outcome.kind !== "findings") {
    return;
  }
  assert(outcome.findings.length === 1, "one finding in, one finding out");
  assert(
    Object.keys(outcome.findings[0] ?? {})
      .sort()
      .join(",") === "Description,File,RuleID,StartLine",
    "only the fields the gate reports are kept",
  );
});

await test("a report that is not a JSON list of findings is failed", async () => {
  for (const stdout of ["not json at all", '{"RuleID":"x"}', "[1, 2]"]) {
    assert(
      interpretGitleaksRun({ status: 0, stdout, stderr: "" }).kind === "failed",
      "an unreadable report must not be taken for a clean tree",
    );
  }
});

await test("live: gitleaks with the shipped config finds a planted token and redacts it", async () => {
  requireGitleaks();
  const token = "ghp_" + synthetic(36);
  const planted = scan({ "settings.txt": `${token}\n` });
  assert(
    planted.outcome.kind === "findings",
    "the planted token must be found",
  );
  if (planted.outcome.kind === "findings") {
    assert(
      planted.outcome.findings.length === 1,
      "exactly one finding for the one planted token",
    );
    assert(
      planted.outcome.findings[0]?.File === "settings.txt",
      "the finding names the file that holds the token",
    );
  }
  assert(
    !planted.stdout.includes(token),
    "the report must not contain the token itself",
  );

  const benign = scan({ "settings.txt": "retries = 3\nmode = fast\n" });
  assert(benign.outcome.kind === "clean", "a tree with no secret is clean");
});

await test("live: a git-ignored .env is not scanned but the tracked .env.example is", async () => {
  requireGitleaks();
  const token = "ghp_" + synthetic(36);
  const ignored = scan({ ".env": `${token}\n` });
  assert(
    ignored.outcome.kind === "clean",
    "a developer's own .env never reaches the repository and must not fail the gate",
  );
  const tracked = scan({ ".env.example": `${token}\n` });
  assert(
    tracked.outcome.kind === "findings",
    "a key pasted into the tracked template must still be found",
  );
});

await test("live: the shipped config catches a PKCS#8 key and a long bearer token", async () => {
  requireGitleaks();
  const pem = [
    "-----BEGIN " + "PRIVATE KEY-----",
    ...[3, 11, 19, 27, 35, 43, 51, 59].map((offset) => synthetic(64, offset)),
    "-----END " + "PRIVATE KEY-----",
  ].join("\n");
  const key = scan({ "service.pem": `${pem}\n` });
  assert(
    key.outcome.kind === "findings" &&
      key.outcome.findings.some(
        (f) => f.RuleID === "private-key" && f.File === "service.pem",
      ),
    "a BEGIN PRIVATE KEY block must be reported as private-key",
  );

  const bearer = scan({
    "call.txt": `Authorization: Bearer ${synthetic(40)}\n`,
  });
  assert(
    bearer.outcome.kind === "findings" &&
      bearer.outcome.findings.some((f) => f.RuleID === "custom-bearer-token"),
    "a 40-character bearer token must be reported",
  );

  const prose = scan({
    "notes.txt":
      "Send a Bearer token in the Authorization header.\nconst h = `Bearer ${accessToken}`;\n",
  });
  assert(
    prose.outcome.kind === "clean",
    "the word Bearer in prose or a template is not a credential",
  );
});

await test("live: the shipped config is TOML that gitleaks loads", async () => {
  requireGitleaks();
  assert(existsSync(SHIPPED_CONFIG), "the config the gate names must exist");
  assert(
    SHIPPED_CONFIG.endsWith(".toml"),
    "gitleaks reads TOML, not the JSON the repo used to ship",
  );
  assert(
    !existsSync(join(REPO_ROOT, ".gitleaksrc.json")),
    "the unreadable JSON config must be gone",
  );
  const empty = scan({});
  assert(
    empty.outcome.kind === "clean",
    "gitleaks must load the shipped config and exit 0 on an empty directory",
  );
});

// ---------------------------------------------------------------------------
// The gate itself (scripts/security-check.ts) against a stub gitleaks
// ---------------------------------------------------------------------------

const ANSI = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, "g");

/**
 * Runs the real gate in a temp project root with PATH holding only the stub,
 * so no installed gitleaks, pnpm or rg can influence the result. `pnpm audit`
 * cannot run there, which fails the dependencies half and makes the exit
 * status uninformative: the cases read the secrets line instead.
 *
 * The scanner bound is wide on purpose: on a busy machine one run in twelve
 * stalled past 20s (stub gitleaks and `pnpm audit` both reported killed) and a
 * stall reads as a failed scan, which is the right verdict for the gate and the
 * wrong one for this test.
 */
function runGate(
  stubBody: string | null,
  projectFiles: Record<string, string>,
) {
  if (process.platform === "win32") {
    throw new Skip("the stub gitleaks is a POSIX shell script");
  }
  const project = tempDir("neurolink-gate-project-");
  const bin = tempDir("neurolink-gate-bin-");
  const argvFile = join(bin, "argv.txt");
  if (stubBody !== null) {
    const stub = join(bin, "gitleaks");
    writeFileSync(
      stub,
      `#!/bin/sh\nprintf '%s\\n' "$@" > "$STUB_ARGV_FILE"\n${stubBody}\n`,
    );
    chmodSync(stub, 0o755);
  }
  for (const [name, text] of Object.entries(projectFiles)) {
    writeFileSync(join(project, name), text);
  }
  const result = spawnSync(process.execPath, [TSX_CLI, GATE_SCRIPT], {
    cwd: project,
    encoding: "utf8",
    timeout: 200_000,
    killSignal: "SIGKILL",
    env: {
      PATH: bin,
      HOME: process.env.HOME ?? project,
      STUB_ARGV_FILE: argvFile,
      NEUROLINK_SCANNER_TIMEOUT_MS: "90000",
    },
  });
  return {
    output: `${result.stdout ?? ""}${result.stderr ?? ""}`.replace(ANSI, ""),
    argv: existsSync(argvFile)
      ? readFileSync(argvFile, "utf8").split("\n").filter(Boolean)
      : undefined,
  };
}

await test("gate: a gitleaks that exits non-zero fails the secrets check with its first stderr line", async () => {
  const gate = runGate(
    "printf 'Error: unknown flag: --format\\nUsage:\\n' >&2\nexit 126",
    {},
  );
  assert(
    gate.output.includes("FAIL secrets: failed"),
    "a scan that did not run must not read as passed",
  );
  assert(
    !gate.output.includes("No secrets detected"),
    "a scan that did not run must not claim a clean tree",
  );
  assert(
    gate.output.includes("unknown flag"),
    "the error issue carries the first stderr line",
  );
  assert(
    !gate.output.includes("Usage:"),
    "the error issue carries the first stderr line only",
  );
});

await test("gate: a clean gitleaks run passes and receives the report flags and the config", async () => {
  const withConfig = runGate("echo '[]'", { [GITLEAKS_CONFIG_FILE]: "\n" });
  assert(
    withConfig.output.includes("PASS secrets: passed"),
    "an empty report from a completed run is a pass",
  );
  assert(
    withConfig.argv !== undefined &&
      flagValue(withConfig.argv, "--report-format") === "json" &&
      !withConfig.argv.includes("--format"),
    "the gate must hand gitleaks the 8.x report flags",
  );
  assert(
    (flagValue(withConfig.argv ?? [], "--config") ?? "").endsWith(
      GITLEAKS_CONFIG_FILE,
    ),
    "the gate must hand gitleaks the TOML config when the project has one",
  );

  const withoutConfig = runGate("echo '[]'", {});
  assert(
    withoutConfig.argv !== undefined &&
      !withoutConfig.argv.includes("--config"),
    "no config flag when the project has no config file",
  );
});

await test("gate: a critical finding fails the secrets check at its file and line", async () => {
  const gate = runGate(
    `printf '%s' '[{"RuleID":"private-key","File":"a.pem","StartLine":2}]'`,
    {},
  );
  assert(
    gate.output.includes("FAIL secrets: failed") &&
      gate.output.includes("Critical secret in a.pem:2"),
    "a private-key finding is critical and names its location",
  );
});

await test("gate: gitleaks being absent falls back to basic detection rather than failing", async () => {
  const gate = runGate(null, {});
  assert(
    gate.output.includes(
      "Gitleaks not installed - using basic pattern detection only",
    ),
    "an absent gitleaks is tolerated and said so",
  );
  assert(
    !gate.output.includes("did not run to completion"),
    "an absent gitleaks is not a started-and-failed scan",
  );
});

await runSuite();
