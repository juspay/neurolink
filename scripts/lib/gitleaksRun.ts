/**
 * The gitleaks invocation and the reading of its result for
 * `scripts/security-check.ts`, kept free of I/O so a test can pin both.
 *
 * Both used to be wrong at once and the scan still reported "No secrets
 * detected": `--format` is not a flag in gitleaks 8.x (it is `--report-format`),
 * so gitleaks printed a usage error and exited 126; `spawnSync` does not throw
 * on a non-zero exit; and an empty stdout was turned into `[]`, a clean tree.
 * Because the script passes `--exit-code 0`, gitleaks exits non-zero ONLY when
 * it failed to run, which is why any non-zero status is a failed scan here and
 * never a finding.
 */

/** The fields of a gitleaks report entry the gate reads. */
export type GitleaksFinding = {
  RuleID?: string;
  File?: string;
  StartLine?: number;
  Description?: string;
};

export type GitleaksRunInput = {
  status: number | null;
  stdout: string;
  stderr: string;
};

export type GitleaksRunOutcome =
  | { kind: "findings"; findings: GitleaksFinding[] }
  | { kind: "clean" }
  | { kind: "failed"; reason: string };

/** Gitleaks loads TOML only; the retired .gitleaksrc.json was never readable. */
export const GITLEAKS_CONFIG_FILE = ".gitleaks.toml";

/**
 * `--redact` keeps the matched value out of the report; the report goes to
 * stdout (`-`) so nothing is written into the tree being scanned. `--no-color`
 * and `--log-level error` keep stderr to the line that explains a failure
 * (otherwise the first line is a banner or an ANSI-coloured warning).
 */
export function buildGitleaksArgs(configPath: string | undefined): string[] {
  const args = [
    "detect",
    "--no-git",
    "--exit-code",
    "0",
    "--report-format",
    "json",
    "--report-path",
    "-",
    "--redact",
    "--no-banner",
    "--no-color",
    "--log-level",
    "error",
  ];
  if (configPath !== undefined) {
    args.push("--config", configPath);
  }
  return args;
}

const MAX_REASON_CHARS = 200;

function firstLine(text: string): string {
  const line = text
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.length > 0);
  return (line ?? "no output on stderr").slice(0, MAX_REASON_CHARS);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toFinding(entry: Record<string, unknown>): GitleaksFinding {
  const { RuleID, File, StartLine, Description } = entry;
  // Only the fields the gate reports are kept, so the matched text a report
  // carries when `--redact` is dropped never reaches the results object.
  return {
    ...(typeof RuleID === "string" && { RuleID }),
    ...(typeof File === "string" && { File }),
    ...(typeof StartLine === "number" && { StartLine }),
    ...(typeof Description === "string" && { Description }),
  };
}

/**
 * A run is clean only when gitleaks exited 0 AND printed a report that parses
 * as a JSON array. Anything else is `failed`, with the first stderr line as the
 * reason, so a scan that did not run can never be mistaken for one that found
 * nothing.
 */
export function interpretGitleaksRun(
  run: GitleaksRunInput,
): GitleaksRunOutcome {
  if (run.status !== 0) {
    const how =
      run.status === null ? "was terminated" : `exited ${run.status}`;
    return {
      kind: "failed",
      reason: `gitleaks ${how}: ${firstLine(run.stderr)}`,
    };
  }

  const text = run.stdout.trim();
  if (text === "") {
    return { kind: "clean" };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return {
      kind: "failed",
      reason: "gitleaks printed a report that is not JSON",
    };
  }
  if (!Array.isArray(parsed) || !parsed.every(isRecord)) {
    return {
      kind: "failed",
      reason: "gitleaks printed a report that is not a list of findings",
    };
  }
  return parsed.length === 0
    ? { kind: "clean" }
    : { kind: "findings", findings: parsed.map(toFinding) };
}
