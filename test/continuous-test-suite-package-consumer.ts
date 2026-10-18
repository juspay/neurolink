#!/usr/bin/env tsx
/**
 * Strict consumer gate: does the PACKED package type-check for the people who
 * install it?
 *
 * In scope for rule 15 because the only thing under test is the tarball that
 * `npm pack` produces from this checkout, installed with `npm install` into a
 * fresh directory exactly as a consumer would. Nothing is imported from
 * `src/lib` or `dist`; the suite reads the installed `package.json` and the
 * installed declarations, and asks `tsc` what it thinks.
 *
 * Why it exists: the published 13.0.3 shipped
 * `dist/auth/providers/BaseAuthProvider.d.ts` declaring `EventEmitter<[never]>`.
 * @types/node 22 and 24 accept that; 25 and 26 reject it with TS2344, so a
 * consumer on a current @types/node could not compile with `skipLibCheck: false`.
 * Nothing else here could see it: the repository's own @types/node is a ^22
 * devDependency, which accepts the declaration. The strict install-and-typecheck
 * proof that found it was a scratch script and was lost, so this suite keeps it.
 *
 * What one case does, each in a NEW temp directory:
 *
 *   1. `npm install <tarball> typescript @types/node@<spec> [react...]`, with
 *      `--ignore-scripts` (types need no native binary) and optionally
 *      `--omit=optional`.
 *   2. Writes `import type * as` for every `types` entry of the INSTALLED
 *      package's `exports` map, one concrete file per wildcard export, and runs
 *      `tsc` with `strict` on and `skipLibCheck` off.
 *   3. A control: the same program plus one wrong assignment must be rejected
 *      with TS2322. A gate that cannot fail proves nothing; this shows tsc ran.
 *   4. With React: a `usage.tsx` that renders `<NeuroLinkProvider>` must compile,
 *      and four wrong copies must each be rejected for the reason stated in
 *      WRONG_USAGES. The last one only fails while the provider's return type is
 *      a real element type, so it also notices that type decaying to `any`.
 *
 * Who owns an error decides what happens to it:
 *
 *   - In a file of this package, or in the consumer's own files: the suite fails,
 *     unless the error is in KNOWN_FAILURES.
 *   - Under some other package in node_modules (a dependency's own declarations
 *     that a newer @types/node rejects): printed as THIRD-PARTY, never a failure.
 *     The package cannot fix those, and a gate that failed on them would be red
 *     for reasons outside this repository.
 *
 * KNOWN_FAILURES is a ratchet, like KNOWN_OPTIONAL_IMPORTS in
 * test/continuous-test-suite-package-declarations.ts. A new error fails the suite,
 * and a listed failure that no longer occurs fails it too, so the entry has to be
 * deleted in the change that fixes the defect. The harness has no expected-failure
 * status, and a skip would hide the defect, so each listed failure that does occur
 * is printed as EXPECTED FAILURE with its reason and issue, and the last line
 * before the summary counts them. A run's test passing therefore means "no error
 * beyond the expected ones", which its name says.
 *
 * Declared `offline` in the harness's sense: no model provider is involved, so a
 * timeout or a provider-shaped message can only be a defect or an unreachable
 * registry, never a slow upstream to excuse. The npm registry IS contacted for
 * the dependencies, which is why this is not part of `test:unit` or any required
 * check: one case installs a 25 MB tarball with its thousands of modules. It runs
 * from .github/workflows/package-consumer.yml.
 *
 * Needs `dist/`: run `pnpm run build` first.
 *
 * Environment (all optional):
 *   NEUROLINK_CONSUMER_TARBALL  check this tarball instead of packing the checkout
 *                               (a published release, for instance)
 *   NEUROLINK_CONSUMER_CASES    comma-separated case ids to run; an unknown id fails
 *
 * Run: pnpm run test:package-consumer
 */
import "./helpers/credentialFreeEnv.js";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  assert,
  defineSuite,
  log,
  logSection,
  scaleTimeoutMs,
  Skip,
  tempDir,
} from "./helpers/harness.js";
import { assertDistFresh } from "./helpers/distFreshness.js";

const TARBALL_OVERRIDE = process.env.NEUROLINK_CONSUMER_TARBALL;
if (TARBALL_OVERRIDE === undefined) {
  assertDistFresh();
}

// Every step is a spawnSync call with its own bound, so the per-test budget only
// has to be larger than the longest case. The harness timer cannot fire while a
// synchronous spawn is running anyway.
const { test, runSuite } = defineSuite("Package consumer", {
  offline: true,
  perTestTimeoutMs: 3_600_000,
});

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PACKAGE_NAME = "@juspay/neurolink";
const PACKAGE_DIR = `node_modules/${PACKAGE_NAME}/`;

// Pinned so a TypeScript release cannot change results between two runs of the
// same tree; bump it deliberately. @types/node and React are the axes under test.
const CONSUMER_TYPESCRIPT = "5.9.3";

const PACK_TIMEOUT_MS = 300_000;
const INSTALL_TIMEOUT_MS = 1_500_000;
const TSC_TIMEOUT_MS = 900_000;

type ConsumerCase = {
  readonly id: string;
  /** npm spec for @types/node: a major such as "22", or "latest". */
  readonly typesNode: string;
  /** React major installed with its @types/react; the case then compiles JSX too. */
  readonly react?: "18" | "19";
  readonly omitOptional: boolean;
};

// The React cases pin @types/node 22 so a React type difference cannot be
// confused with the @types/node 25/26 defect, which node-latest owns.
const CASES: readonly ConsumerCase[] = [
  { id: "node22", typesNode: "22", omitOptional: false },
  { id: "node-latest", typesNode: "latest", omitOptional: false },
  { id: "react18-node22", typesNode: "22", react: "18", omitOptional: false },
  { id: "react19-node22", typesNode: "22", react: "19", omitOptional: false },
  { id: "node22-omit-optional", typesNode: "22", omitOptional: true },
];

type KnownFailure = {
  readonly case: string;
  /** The TypeScript error code, such as "TS2344". */
  readonly code: string;
  /** Path inside the package, from its root, that the error's file starts with. */
  readonly pathPrefix: string;
  readonly reason: string;
  readonly issue: 1999;
};

// Defects that existed when this gate was added and have no fix yet. A fix
// deletes its entry in the same change (a fixed defect fails the ratchet).
// Never add to this list to make a red run green.
const KNOWN_FAILURES: readonly KnownFailure[] = [
  {
    case: "node22-omit-optional",
    code: "TS2307",
    pathPrefix: "dist/voice/livekit/realtimeMcpTools.d.ts",
    reason: "the declaration imports @livekit/agents, an optional dependency",
    issue: 1999,
  },
  {
    case: "node22-omit-optional",
    code: "TS2307",
    pathPrefix: "dist/voice/livekit/realtimeVoiceAgent.d.ts",
    reason: "the declaration imports @livekit/agents, an optional dependency",
    issue: 1999,
  },
  {
    case: "node22-omit-optional",
    code: "TS2307",
    pathPrefix: "dist/voice/livekit/voiceAgent.d.ts",
    reason: "the declaration imports @livekit/agents, an optional dependency",
    issue: 1999,
  },
];

type WrongUsage = {
  readonly name: string;
  /** The code the wrong copy must be rejected with. */
  readonly code: string;
  readonly source: string;
};

const GOOD_USAGE = [
  'import { NeuroLinkProvider } from "@juspay/neurolink/client";',
  "export const App = () => (",
  '  <NeuroLinkProvider config={{ baseUrl: "https://api.example.invalid" }}>',
  "    <div>hello</div>",
  "  </NeuroLinkProvider>",
  ");",
  "",
].join("\n");

// Every occurrence of `from`, with `to` taken literally (String.prototype.replace
// with a string pattern stops at the first, and `$` in a replacement is special).
const replaceEvery = (source: string, from: string, to: string): string =>
  source.split(from).join(to);

const WRONG_USAGES: readonly WrongUsage[] = [
  {
    name: "config field of the wrong type",
    code: "TS2322",
    source: replaceEvery(
      GOOD_USAGE,
      'baseUrl: "https://api.example.invalid"',
      "baseUrl: 42",
    ),
  },
  {
    name: "required config omitted",
    code: "TS2741",
    source: replaceEvery(
      GOOD_USAGE,
      ' config={{ baseUrl: "https://api.example.invalid" }}',
      "",
    ),
  },
  {
    name: "prop the provider does not declare",
    code: "TS2322",
    source: replaceEvery(
      GOOD_USAGE,
      "<NeuroLinkProvider config",
      "<NeuroLinkProvider nope={1} config",
    ),
  },
  {
    name: "string method on an element type that is not a string",
    code: "TS2339",
    source: `${GOOD_USAGE}\nexport const t = NeuroLinkProvider({ config: { baseUrl: "x" }, children: null }).type.toUpperCase();\n`,
  },
];

type Diagnostic = {
  /** Path as tsc printed it, relative to the consumer directory; undefined for a global error. */
  readonly file: string | undefined;
  readonly line: number;
  readonly code: string;
  readonly message: string;
};

type Origin = "package" | "third-party" | "consumer";

const DIAGNOSTIC_WITH_FILE = /^(.+?)\((\d+),\d+\): error (TS\d+): (.*)$/gm;
const DIAGNOSTIC_GLOBAL = /^error (TS\d+): (.*)$/gm;

const parseDiagnostics = (output: string): readonly Diagnostic[] => [
  ...[...output.matchAll(DIAGNOSTIC_WITH_FILE)].map(
    (match): Diagnostic => ({
      file: match[1].replaceAll("\\", "/"),
      line: Number(match[2]),
      code: match[3],
      message: match[4],
    }),
  ),
  ...[...output.matchAll(DIAGNOSTIC_GLOBAL)].map(
    (match): Diagnostic => ({
      file: undefined,
      line: 0,
      code: match[1],
      message: match[2],
    }),
  ),
];

const originOf = (diagnostic: Diagnostic): Origin => {
  const file = diagnostic.file;
  if (file === undefined) {
    return "consumer";
  }
  if (file.startsWith(PACKAGE_DIR)) {
    return file.slice(PACKAGE_DIR.length).includes("node_modules/")
      ? "third-party"
      : "package";
  }
  return file.startsWith("node_modules/") ? "third-party" : "consumer";
};

const packagePath = (diagnostic: Diagnostic): string =>
  (diagnostic.file ?? "").slice(PACKAGE_DIR.length);

const summarize = (diagnostic: Diagnostic): string =>
  `${diagnostic.code} ${diagnostic.file ?? "(no file)"}(${diagnostic.line}) ${diagnostic.message.slice(0, 140)}`;

const matchesKnown = (known: KnownFailure, diagnostic: Diagnostic): boolean =>
  originOf(diagnostic) === "package" &&
  diagnostic.code === known.code &&
  packagePath(diagnostic).startsWith(known.pathPrefix);

type SpawnOutcome = {
  readonly status: number | null;
  readonly stdout: string;
  readonly stderr: string;
  readonly timedOut: boolean;
};

// The environment pnpm exports for its own settings (store-dir, a release-age
// floor, a dependency-verification flag) is not the consumer's: npm warns about
// each key it does not know, and any it does know would change what this install
// resolves. A consumer starts from npm's defaults.
const consumerEnv = (): NodeJS.ProcessEnv =>
  Object.fromEntries(
    Object.entries(process.env).filter(
      ([name]) => !name.toLowerCase().startsWith("npm_config_"),
    ),
  );

// Always an argument vector: `command`, its arguments and `cwd` reach the child as
// data, so a path holding spaces, quotes or `;` is never re-parsed by a shell.
const spawnBounded = (
  command: string,
  args: readonly string[],
  cwd: string,
  timeoutMs: number,
): SpawnOutcome => {
  const result = spawnSync(command, [...args], {
    cwd,
    encoding: "utf8",
    timeout: scaleTimeoutMs(timeoutMs),
    maxBuffer: 1 << 26,
    shell: false,
    env: { ...consumerEnv(), npm_config_update_notifier: "false" },
  });
  const timedOut =
    result.error !== undefined &&
    "code" in result.error &&
    result.error.code === "ETIMEDOUT";
  return {
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    timedOut,
  };
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readJson = (path: string): unknown =>
  JSON.parse(readFileSync(path, "utf8"));

/**
 * The part of a wildcard export that `*` stands for, for the first file that
 * matches. A `types` target with other than exactly one `*` is not read: it
 * yields undefined, which the caller turns into a failure rather than a guess.
 */
const firstWildcardMatch = (
  packageRoot: string,
  pattern: string,
): string | undefined => {
  const parts = pattern.replace(/^\.\//, "").split("*");
  if (parts.length !== 2) {
    return undefined;
  }
  const [before, after] = parts;
  const directory = before.split("/").slice(0, -1).join("/");
  const stem = before.split("/").pop() ?? "";
  const full = join(packageRoot, directory);
  if (!existsSync(full)) {
    return undefined;
  }
  const hit = readdirSync(full)
    .filter((name) => name.startsWith(stem) && name.endsWith(after))
    .sort()[0];
  return hit === undefined
    ? undefined
    : hit.slice(stem.length, hit.length - after.length);
};

/** One import specifier per `types` entry of the exports map; a wildcard becomes one concrete file. */
const exportSpecifiers = (
  packageRoot: string,
  manifest: unknown,
): { readonly specifiers: readonly string[]; readonly typed: number } => {
  const exportsMap = isRecord(manifest) ? manifest.exports : undefined;
  const typedEntries = Object.entries(isRecord(exportsMap) ? exportsMap : {})
    .flatMap(([key, value]) =>
      isRecord(value) && typeof value.types === "string"
        ? [{ key, types: value.types }]
        : [],
    )
    .filter(({ key }) => key !== "./package.json");
  const specifiers = typedEntries.flatMap(({ key, types }) => {
    if (!key.includes("*")) {
      return [key === "." ? PACKAGE_NAME : `${PACKAGE_NAME}${key.slice(1)}`];
    }
    const name = firstWildcardMatch(packageRoot, types);
    return name === undefined
      ? []
      : [`${PACKAGE_NAME}${replaceEvery(key.slice(1), "*", name)}`];
  });
  return { specifiers, typed: typedEntries.length };
};

const importProgram = (specifiers: readonly string[]): string =>
  specifiers
    .map(
      (specifier, index) =>
        `import type * as E${index} from ${JSON.stringify(specifier)};\nexport type T${index} = typeof E${index};`,
    )
    .join("\n");

type Consumer = {
  readonly dir: string;
  readonly specifiers: readonly string[];
  readonly program: string;
};

type TscRun = {
  readonly diagnostics: readonly Diagnostic[];
};

// Counted across cases and printed once, just before the harness summary.
const tally = { expected: 0, thirdParty: 0 };

type CaseState = {
  consumer: Consumer | undefined;
  readonly runs: Map<string, TscRun>;
};

const installArgs = (testCase: ConsumerCase, tarball: string): string[] => [
  "install",
  tarball,
  `typescript@${CONSUMER_TYPESCRIPT}`,
  `@types/node@${testCase.typesNode}`,
  ...(testCase.react === undefined
    ? []
    : [
        `react@${testCase.react}`,
        `react-dom@${testCase.react}`,
        `@types/react@${testCase.react}`,
      ]),
  "--no-audit",
  "--no-fund",
  "--ignore-scripts",
  ...(testCase.omitOptional ? ["--omit=optional"] : []),
];

const installConsumer = (testCase: ConsumerCase, tarball: string): Consumer => {
  assert(tarball !== "", "there is no tarball to install");
  const dir = tempDir(`neurolink-consumer-${testCase.id}-`);
  writeFileSync(
    join(dir, "package.json"),
    JSON.stringify({ name: "consumer", private: true, type: "module" }),
  );
  const install = spawnBounded(
    "npm",
    installArgs(testCase, tarball),
    dir,
    INSTALL_TIMEOUT_MS,
  );
  const packageRoot = join(dir, "node_modules", PACKAGE_NAME);
  if (install.status !== 0 || !existsSync(packageRoot)) {
    console.error(
      `    [${testCase.id}] npm install exit=${install.status} timedOut=${install.timedOut}`,
    );
    console.error(`    | ${install.stderr.trim().slice(-600)}`);
    throw new Error("npm install of the tarball did not complete");
  }
  const { specifiers, typed } = exportSpecifiers(
    packageRoot,
    readJson(join(packageRoot, "package.json")),
  );
  assert(
    specifiers.length > 0 && specifiers.length === typed,
    "an exports entry with a types condition produced no import to check",
  );
  const nodeTypes = readJson(
    join(dir, "node_modules", "@types", "node", "package.json"),
  );
  log(
    `  [${testCase.id}] installed @types/node ${isRecord(nodeTypes) ? String(nodeTypes.version) : "?"}, ${specifiers.length} export entries`,
    "blue",
  );
  const program = importProgram(specifiers);
  writeFileSync(join(dir, "check.ts"), `${program}\n`);
  return { dir, specifiers, program };
};

const runTsc = (
  consumer: Consumer,
  file: string,
  source: string,
  jsx: boolean,
): TscRun => {
  writeFileSync(join(consumer.dir, file), source);
  writeFileSync(
    join(consumer.dir, "tsconfig.json"),
    JSON.stringify({
      compilerOptions: {
        strict: true,
        skipLibCheck: false,
        noEmit: true,
        target: "es2022",
        module: "nodenext",
        moduleResolution: "nodenext",
        types: ["node"],
        ...(jsx ? { jsx: "react-jsx" } : {}),
      },
      files: [file],
    }),
  );
  const outcome = spawnBounded(
    join(consumer.dir, "node_modules", ".bin", "tsc"),
    ["-p", "tsconfig.json", "--pretty", "false"],
    consumer.dir,
    TSC_TIMEOUT_MS,
  );
  const diagnostics = parseDiagnostics(`${outcome.stdout}\n${outcome.stderr}`);
  // tsc exits 0 only when it found nothing. A non-zero exit with no diagnostic we
  // could read means the output was not in the shape this suite parses (or tsc
  // never started), and reading that as "no errors" would be a gate that passes
  // on a broken compiler.
  assert(
    !outcome.timedOut,
    "tsc did not finish within its time limit for a consumer program",
  );
  assert(
    diagnostics.length > 0 || outcome.status === 0,
    "tsc failed without an error this suite can read",
  );
  assert(
    diagnostics.length === 0 || outcome.status !== 0,
    "tsc reported errors but exited 0",
  );
  return { diagnostics };
};

const knownFor = (testCase: ConsumerCase): readonly KnownFailure[] =>
  KNOWN_FAILURES.filter((known) => known.case === testCase.id);

/** Fails when this run holds an error that is neither known nor expected to be there. */
const assertNoUnexpectedPackageErrors = (
  testCase: ConsumerCase,
  label: string,
  run: TscRun,
): void => {
  const known = knownFor(testCase);
  const unexpected = run.diagnostics.filter(
    (diagnostic) =>
      originOf(diagnostic) === "package" &&
      !known.some((entry) => matchesKnown(entry, diagnostic)),
  );
  for (const diagnostic of unexpected) {
    console.error(
      `    [${testCase.id}] ${label}: unexpected ${summarize(diagnostic)}`,
    );
  }
  assert(
    unexpected.length === 0,
    "the packed package has a type error that is not in KNOWN_FAILURES",
  );
};

const assertNoConsumerErrors = (
  testCase: ConsumerCase,
  label: string,
  run: TscRun,
): void => {
  const own = run.diagnostics.filter(
    (diagnostic) => originOf(diagnostic) === "consumer",
  );
  for (const diagnostic of own) {
    console.error(
      `    [${testCase.id}] ${label}: consumer file ${summarize(diagnostic)}`,
    );
  }
  assert(own.length === 0, "a consumer program that should compile did not");
};

const assertRejectedFor = (
  testCase: ConsumerCase,
  label: string,
  run: TscRun,
  code: string,
): void => {
  const own = run.diagnostics.filter(
    (diagnostic) => originOf(diagnostic) === "consumer",
  );
  for (const diagnostic of own) {
    console.error(
      `    [${testCase.id}] ${label}: rejected with ${summarize(diagnostic)}`,
    );
  }
  assert(
    own.some((diagnostic) => diagnostic.code === code),
    "a deliberately wrong program was not rejected for the expected reason",
  );
};

const selectedCases = (): readonly ConsumerCase[] => {
  const requested = process.env.NEUROLINK_CONSUMER_CASES?.split(",")
    .map((id) => id.trim())
    .filter((id) => id !== "");
  if (requested === undefined || requested.length === 0) {
    return CASES;
  }
  const unknown = requested.filter(
    (id) => !CASES.some((testCase) => testCase.id === id),
  );
  if (unknown.length > 0) {
    throw new Error(
      "NEUROLINK_CONSUMER_CASES names a case that does not exist",
    );
  }
  return CASES.filter((testCase) => requested.includes(testCase.id));
};

const packRepository = (): string => {
  const out = tempDir("neurolink-consumer-pack-");
  const packed = spawnBounded(
    "npm",
    ["pack", "--ignore-scripts", "--json", "--pack-destination", out],
    REPO_ROOT,
    PACK_TIMEOUT_MS,
  );
  assert(packed.status === 0, "npm pack of the repository did not exit 0");
  const report: unknown = JSON.parse(packed.stdout);
  const first: unknown = Array.isArray(report) ? report[0] : undefined;
  const filename =
    isRecord(first) && typeof first.filename === "string"
      ? first.filename
      : undefined;
  if (filename === undefined) {
    throw new Error("npm pack --json named no tarball");
  }
  const tarball = join(out, filename);
  assert(existsSync(tarball), "npm pack did not write the tarball it named");
  return tarball;
};

const resolveTarball = (): string => {
  if (TARBALL_OVERRIDE === undefined) {
    return packRepository();
  }
  const tarball = isAbsolute(TARBALL_OVERRIDE)
    ? TARBALL_OVERRIDE
    : resolve(process.cwd(), TARBALL_OVERRIDE);
  assert(existsSync(tarball), "NEUROLINK_CONSUMER_TARBALL does not exist");
  return tarball;
};

const SAMPLE_TSC_OUTPUT = [
  "check.ts(3,1): error TS2322: Type 'string' is not assignable to type 'number'.",
  "node_modules/@juspay/neurolink/dist/auth/providers/BaseAuthProvider.d.ts(90,45): error TS2344: Type '[never]' does not satisfy the constraint 'EventMap<[never]>'.",
  "  Type '[never]' is not assignable to type 'DefaultEventMap'.",
  "node_modules/@livekit/agents/dist/worker.d.ts(127,30): error TS2344: Type '[never]' does not satisfy the constraint 'EventMap<[never]>'.",
  "node_modules/@juspay/neurolink/node_modules/ws/index.d.ts(4,1): error TS2307: Cannot find module 'x'.",
  "error TS5083: Cannot read file 'tsconfig.json'.",
  "",
].join("\n");

await runSuite(async () => {
  logSection("The suite's own bookkeeping");

  await test("control: tsc output is split into package, third-party and consumer errors", () => {
    const parsed = parseDiagnostics(SAMPLE_TSC_OUTPUT);
    assert(
      parsed.length === 5,
      "the sample output was not read as five errors",
    );
    assert(
      parsed.map(originOf).join() ===
        "consumer,package,third-party,third-party,consumer",
      "an error was attributed to the wrong owner",
    );
    assert(
      packagePath(parsed[1]) === "dist/auth/providers/BaseAuthProvider.d.ts" &&
        parsed[1].line === 90,
      "the package-relative path or line of an error was misread",
    );
  });

  await test("control: a known failure matches by case, code and path prefix only", () => {
    const [, packageError, , nested] = parseDiagnostics(SAMPLE_TSC_OUTPUT);
    const known: KnownFailure = {
      case: "x",
      code: "TS2344",
      pathPrefix: "dist/auth/",
      reason: "sample",
      issue: 1999,
    };
    assert(matchesKnown(known, packageError), "a matching error was missed");
    assert(
      !matchesKnown({ ...known, code: "TS2345" }, packageError),
      "a different code matched",
    );
    assert(
      !matchesKnown({ ...known, pathPrefix: "dist/voice/" }, packageError),
      "a different path matched",
    );
    assert(
      !matchesKnown({ ...known, pathPrefix: "" }, nested),
      "an error under a nested node_modules matched as the package's own",
    );
  });

  await test("KNOWN_FAILURES names only cases in the matrix, once each", () => {
    const ids = new Set(CASES.map((testCase) => testCase.id));
    assert(ids.size === CASES.length, "two cases share an id");
    assert(
      KNOWN_FAILURES.every((known) => ids.has(known.case)),
      "a KNOWN_FAILURES entry names a case that is not in the matrix",
    );
    const keys = KNOWN_FAILURES.map(
      (known) => `${known.case}|${known.code}|${known.pathPrefix}`,
    );
    assert(
      new Set(keys).size === keys.length,
      "KNOWN_FAILURES lists the same failure twice",
    );
  });

  await test("each wrong usage differs from the good one", () => {
    assert(
      WRONG_USAGES.every((wrong) => wrong.source !== GOOD_USAGE),
      "a wrong usage is identical to the good one, so it proves nothing",
    );
  });

  logSection("The tarball");
  let tarball = "";
  await test("a tarball to install exists", () => {
    tarball = resolveTarball();
    log(`  tarball: ${tarball}`, "blue");
  });

  for (const testCase of selectedCases()) {
    logSection(`Case ${testCase.id}`);
    const state: CaseState = { consumer: undefined, runs: new Map() };
    const need = (): Consumer => {
      if (state.consumer === undefined) {
        throw new Error("the consumer for this case was not installed");
      }
      return state.consumer;
    };
    const record = (label: string, run: TscRun): TscRun => {
      state.runs.set(label, run);
      return run;
    };

    await test(`${testCase.id}: the tarball installs and its exports are listed`, () => {
      state.consumer = installConsumer(testCase, tarball);
    });

    await test(`${testCase.id}: export entries type-check (strict, skipLibCheck off), apart from expected failures`, () => {
      const consumer = need();
      const run = record(
        "imports",
        runTsc(consumer, "check.ts", `${consumer.program}\n`, false),
      );
      assertNoConsumerErrors(testCase, "imports", run);
      assertNoUnexpectedPackageErrors(testCase, "imports", run);
    });

    await test(`${testCase.id}: control: a wrong assignment is rejected as TS2322`, () => {
      const consumer = need();
      const run = record(
        "control",
        runTsc(
          consumer,
          "control.ts",
          `${consumer.program}\nexport const wrong: number = "not a number";\n`,
          false,
        ),
      );
      assertRejectedFor(testCase, "control", run, "TS2322");
      assertNoUnexpectedPackageErrors(testCase, "control", run);
    });

    if (testCase.react !== undefined) {
      await test(`${testCase.id}: usage.tsx renders NeuroLinkProvider, apart from expected failures`, () => {
        const run = record(
          "usage",
          runTsc(need(), "usage.tsx", GOOD_USAGE, true),
        );
        assertNoConsumerErrors(testCase, "usage", run);
        assertNoUnexpectedPackageErrors(testCase, "usage", run);
      });

      for (const wrong of WRONG_USAGES) {
        await test(`${testCase.id}: control: ${wrong.name} is rejected as ${wrong.code}`, () => {
          const label = `wrong usage: ${wrong.name}`;
          const run = record(
            label,
            runTsc(need(), "usage-wrong.tsx", wrong.source, true),
          );
          assertRejectedFor(testCase, label, run, wrong.code);
          assertNoUnexpectedPackageErrors(testCase, label, run);
        });
      }
    }

    const expectedRuns =
      2 + (testCase.react === undefined ? 0 : 1 + WRONG_USAGES.length);
    await test(`${testCase.id}: expected failures still occur, third-party errors are listed`, () => {
      try {
        if (state.runs.size < expectedRuns) {
          throw new Skip(
            "a run of this case did not finish, and its own test reports why",
          );
        }
        const seen = [...state.runs.values()].flatMap((run) => run.diagnostics);
        const known = knownFor(testCase);
        const found = known.map((entry) => ({
          entry,
          hit: seen.find((diagnostic) => matchesKnown(entry, diagnostic)),
        }));
        for (const { entry, hit } of found) {
          if (hit !== undefined) {
            tally.expected += 1;
            log(
              `  EXPECTED FAILURE [${testCase.id}] ${summarize(hit)} -- ${entry.reason} (#${entry.issue})`,
              "yellow",
            );
          } else {
            console.error(
              `    [${testCase.id}] no longer occurs: ${entry.code} ${entry.pathPrefix}`,
            );
          }
        }
        const thirdParty = new Map(
          seen
            .filter((diagnostic) => originOf(diagnostic) === "third-party")
            .map((diagnostic) => [
              `${diagnostic.code}|${diagnostic.file}|${diagnostic.line}`,
              diagnostic,
            ]),
        );
        tally.thirdParty += thirdParty.size;
        for (const diagnostic of thirdParty.values()) {
          log(
            `  THIRD-PARTY [${testCase.id}] ${summarize(diagnostic)}`,
            "yellow",
          );
        }
        const occurred = found.filter(({ hit }) => hit !== undefined).length;
        log(
          `  [${testCase.id}] ${occurred} of ${known.length} listed failures occurred, ${thirdParty.size} third-party`,
          "blue",
        );
        assert(
          occurred === known.length,
          "a KNOWN_FAILURES entry no longer occurs; delete it",
        );
      } finally {
        if (state.consumer !== undefined) {
          rmSync(state.consumer.dir, { recursive: true, force: true });
        }
      }
    });
  }

  logSection("Expected failures and third-party errors");
  log(
    `  ${tally.expected} EXPECTED FAILURE(S) from KNOWN_FAILURES, ${tally.thirdParty} third-party error(s) listed`,
    "yellow",
  );
});
