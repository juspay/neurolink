/**
 * Parent side of the bound probes: run one bomb in a fresh process and judge
 * what it cost.
 *
 * The child (`boundedGenerateChild.ts`) imports only the built package. This
 * module spawns it, parses its single JSON line, and holds the assertions the
 * archive and Office suites share, so the ceiling and the "an ordinary file
 * still gets through" check cannot drift between them.
 *
 * ## Why peak memory, and not "the payload never reached the request"
 *
 * Absence of the inflated bytes from the outbound request is true whether or not
 * the decoder is bounded. `ArchiveProcessor` re-checks the compression ratio and
 * the length *after* it has inflated, so a gzip bomb with its `maxOutputLength`
 * deleted is still refused: only after 400 MB was allocated. The request is
 * byte-identical with and without the bound, which makes a request assertion on
 * its own a test that cannot fail. Memory is the only observable that differs.
 *
 * ## Calibration
 *
 * Measured on macOS (arm64, Node 26) with a 400 MB bomb through the whole SDK:
 * peak `maxRSS` growth over a baseline taken after an ordinary warm-up call. The
 * "bound removed" column is a scratch copy of `dist/` with `maxOutputLength`
 * deleted from the one call that guards that format; it was never committed.
 *
 *   | bomb                     | bound in place (10 runs) | bound removed (2 runs) |
 *   | ------------------------ | ------------------------ | ---------------------- |
 *   | gzip via generate()      | 63-78 MB                 | 773-778 MB             |
 *   | pptx via generate()      | 55-90 MB                 | 755-773 MB             |
 *   | odt via generate()       | 55-91 MB                 | 759-770 MB             |
 *   | size-0 zip, file tool    | 0-9 MB                   | 757-770 MB             |
 *   | docx (mammoth, no bound) | 0-11 MB                  | not applicable         |
 *   | xlsx (exceljs, no bound) | 0-5 MB                   | not applicable         |
 *
 * An unbounded run holds the whole inflated bomb, so it grows by at least
 * `BOMB_MB`; the ceiling sits 100 MB under that and 3.3 times over the largest
 * bounded run. A bounded run grows by up to the limit it enforces (100 MB for
 * gzip, pptx and odt, 5 MB for an on-demand zip entry), so it does not settle at
 * zero, and the ceiling must not sit near the bomb, where allocator and platform
 * differences decide the verdict.
 */
import { execFile } from "node:child_process";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { BOMB_MB } from "./archiveBombFixtures.js";
import { assert } from "./harness.js";

const execFileAsync = promisify(execFile);

/** Peak-memory growth a bounded run must stay under, in MB. */
export const BOUNDED_GROWTH_CEILING_MB = BOMB_MB * 0.75;

/** What the child reports about one scenario. */
export type BoundedProbeResult = {
  readonly baselineMb: number;
  readonly peakMb: number;
  readonly rssGrowthMb: number;
  readonly warmup: string;
  readonly warmupDetail: string;
  readonly outcome: string;
  readonly detail: string;
};

/**
 * Variables the child may inherit.
 *
 * Everything else is dropped. The suites load `.env`, and a child that inherited
 * provider keys or an observability exporter's endpoint could reach a real
 * service while measuring a bomb; it only needs to run Node and reach a loopback
 * port. A clean environment also keeps the baseline independent of whatever the
 * developer has exported.
 *
 * Dropping the inherited variables is not enough on its own: importing
 * `dist/index.js` loads `.env` from the working directory, which would put the
 * keys straight back. `DOTENV_CONFIG_PATH=/dev/null` makes that load a no-op
 * (see `dotenvBootstrap.ts`).
 */
const CHILD_ENV_ALLOWLIST: readonly string[] = [
  "PATH",
  "HOME",
  "USERPROFILE",
  "TMPDIR",
  "TMP",
  "TEMP",
  "LANG",
  "LC_ALL",
  "SystemRoot",
];

function childEnv(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {};
  for (const name of CHILD_ENV_ALLOWLIST) {
    const value = process.env[name];
    if (value !== undefined) {
      env[name] = value;
    }
  }
  env.DOTENV_CONFIG_PATH = "/dev/null";
  return env;
}

const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);
const CHILD = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "boundedGenerateChild.ts",
);

const NUMBER_FIELDS = ["baselineMb", "peakMb", "rssGrowthMb"] as const;
const STRING_FIELDS = ["warmup", "warmupDetail", "outcome", "detail"] as const;

function isProbeResult(value: unknown): value is BoundedProbeResult {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const fields = value as Record<string, unknown>;
  return (
    NUMBER_FIELDS.every(
      (key) =>
        typeof fields[key] === "number" &&
        Number.isFinite(fields[key] as number),
    ) && STRING_FIELDS.every((key) => typeof fields[key] === "string")
  );
}

/**
 * Describe a child that did not finish without quoting it.
 *
 * `execFile` rejects with the command line (which holds the loopback URL) and
 * the child's stderr. Both suites downgrade a failure to a SKIP when its text
 * reads like a provider error ("ECONNREFUSED", "status 503", "rate limit"), and
 * a crashed child can print exactly that, so only a number and a signal name
 * that this function has checked the shape of may come through.
 */
function describeChildFailure(error: unknown): string {
  const { code, signal } = (error ?? {}) as {
    code?: unknown;
    signal?: unknown;
  };
  const exit = typeof code === "number" ? ` with exit code ${code}` : "";
  const signalled =
    typeof signal === "string" && /^SIG[A-Z0-9]{1,12}$/.test(signal)
      ? ` on ${signal}`
      : "";
  return `the probe child did not finish${exit}${signalled}`;
}

async function runChild(args: readonly string[]): Promise<BoundedProbeResult> {
  let stdout: string;
  try {
    ({ stdout } = await execFileAsync(
      process.execPath,
      ["--import", "tsx", CHILD, ...args],
      {
        // `--import tsx` resolves from the working directory, not from the child.
        cwd: REPO_ROOT,
        env: childEnv(),
        maxBuffer: 16 * 1024 * 1024,
        timeout: 150_000,
        killSignal: "SIGKILL",
      },
    ));
  } catch (error) {
    // The cause keeps the raw error for whoever debugs it; the harness reads
    // only `message`, which is the part that must stay free of the child's text.
    throw new Error(describeChildFailure(error), { cause: error });
  }
  // The SDK's logger shares stdout, so the verdict is the last line that is
  // JSON rather than the last line.
  const line = stdout
    .split("\n")
    .reverse()
    .find((l) => l.startsWith('{"baselineMb"'));
  if (line === undefined) {
    throw new Error("the probe child printed no result line");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(line);
  } catch {
    throw new Error("the probe child's result line was not valid JSON");
  }
  if (!isProbeResult(parsed)) {
    throw new Error("the probe child's result line lacks the expected fields");
  }
  return parsed;
}

/**
 * Attach `warmup`, then `bomb`, to `generate()` against the mock chat server at
 * `baseURL`, in a fresh process. Either may be a local path.
 */
export function probeGenerate(
  warmup: string,
  bomb: string,
  baseURL: string,
): Promise<BoundedProbeResult> {
  return runChild(["generate", warmup, bomb, baseURL]);
}

/**
 * Ask the `./files` export's `extract_file_content` tool for one entry of
 * `warmup`, then of `bomb`, in a fresh process.
 */
export function probeExtractEntry(
  warmup: { readonly file: string; readonly entry: string },
  bomb: { readonly file: string; readonly entry: string },
): Promise<BoundedProbeResult> {
  return runChild([
    "extract-entry",
    warmup.file,
    bomb.file,
    "unused",
    warmup.entry,
    bomb.entry,
  ]);
}

/**
 * Assert the bomb stayed under the ceiling and that the warm-up call, an
 * ordinary file of the same shape, ran to completion.
 *
 * The messages carry numbers only. `defineSuite` downgrades a failure to a SKIP
 * when its text reads like a provider error, so nothing a payload or a child
 * could say belongs in them.
 */
export function assertGrowthBounded(result: BoundedProbeResult): void {
  assert(
    result.warmup === "completed",
    "the ordinary warm-up call did not complete, so the baseline measured nothing",
  );
  assert(
    result.rssGrowthMb < BOUNDED_GROWTH_CEILING_MB,
    `peak memory grew ${result.rssGrowthMb} MB while the bomb was handled, ` +
      `past the ${BOUNDED_GROWTH_CEILING_MB} MB ceiling: the inflate was not bounded`,
  );
}

/** Marker the SDK leaves in place of a file it could not read. */
const REFUSAL_PLACEHOLDER = "Could not extract content";

/**
 * Assert what `generate()` sent for a bomb attached after an ordinary file.
 *
 * `bodies[0]` is the warm-up request and `bodies[1]` the bomb's. Memory alone
 * would pass for a bound that refuses everything, or for a fixture the SDK never
 * opened, so the request must also show that the ordinary file's content got
 * through and that the bomb was recognised and turned away.
 *
 * The first check only catches a bound that refuses everything if the ordinary
 * file takes the same decode path as the bomb. For a ZIP that means it must be
 * DEFLATED: a stored member is copied out and never reaches the bounded inflate.
 * A call that fails outright counts as a refusal as long as it sent no request,
 * so these checks cannot tell which layer turned the bomb away; memory does.
 */
export function assertBombRefusedInRequest(
  result: BoundedProbeResult,
  bodies: readonly string[],
  ordinaryToken: string,
): void {
  assert(
    bodies.length > 0 && bodies[0].includes(ordinaryToken),
    "the ordinary file of the same shape did not reach the request, so a bound that refuses everything would pass",
  );
  if (result.outcome !== "completed") {
    // Rejecting the whole call is an acceptable refusal, but then the bomb must
    // not have produced a request of its own.
    assert(
      bodies.length === 1,
      "the bomb call failed yet a request still reached the mock server",
    );
    return;
  }
  assert(bodies.length === 2, "the bomb call sent no request");
  const bombBody = bodies[1];
  assert(
    bombBody.includes(REFUSAL_PLACEHOLDER),
    "the request carries no refusal for the bomb, so it was neither read nor turned away",
  );
  assert(
    bombBody.length < 200_000,
    "the request body is far larger than the file's own refusal notice",
  );
}
