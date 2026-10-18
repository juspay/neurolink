#!/usr/bin/env tsx
/**
 * What a consumer installs: the packed file list and the published declarations.
 *
 * In scope for rule 15 because it inspects the surface a consumer receives and
 * nothing inside `src/lib`: the file list `npm pack` would put in the tarball,
 * and the `.d.ts` files in it. It imports nothing from `src/lib` or `dist`.
 *
 * Two defects shipped in a published release and were invisible to every other
 * suite, because both only exist from the consumer's side of `node_modules`:
 *
 *   - `dist/client/reactHooks.tsx` rode along next to `reactHooks.d.ts`.
 *     TypeScript resolves `./reactHooks.js` to the `.tsx` first, and a consumer
 *     without `--jsx` fails strict checking of `@juspay/neurolink/client` with
 *     TS6142.
 *   - `assertFluentFfmpegShape` was declared as `asserts mod is typeof
 *     import("fluent-ffmpeg")`. fluent-ffmpeg is an optionalDependency and its
 *     types are a devDependency, so a consumer of `@juspay/neurolink/processors`
 *     failed with TS7016.
 *
 * Needs `dist/` to exist: run `pnpm run build` first. `npm pack --dry-run
 * --ignore-scripts` is what lists the files without running `prepack`, so the
 * list reflects the build output on disk, not a fresh build.
 *
 * Declarations that already named an optional package when this guard was added
 * are recorded in KNOWN_OPTIONAL_IMPORTS. Those packages ship their own types,
 * so a consumer who installed the optional dependencies (npm's default) type-checks.
 * The list is a ratchet: a new name fails, and so does an entry that no longer leaks.
 *
 * "Optional" covers `optionalDependencies` and the optional peers, the names under
 * `peerDependenciesMeta` marked `optional: true` (react, react-dom, @juspay/hippocampus).
 * An optional peer is the stricter case: npm does not install it, so a declaration
 * that names `react` fails every consumer without React with TS2307. `NeuroLinkProvider`
 * did exactly that through `ReactNode`; its public signature now uses the structural
 * `ClientReactElement`, and no optional peer is baselined.
 *
 * What this does NOT do: it does not type-check a consumer. It scans module
 * specifiers in the published `.d.ts` files (comments are ignored) and checks
 * the packed file list. The consumer-level check is a clean `npm install` of the
 * tarball plus `tsc` with `strict` and `skipLibCheck: false`.
 *
 * The one consumer-side property that is committed is the React one: that
 * `NeuroLinkProvider` is a valid JSX component and its return is a `ReactElement`
 * and a `ReactNode`. `test/fixtures/react-consumer-provider.ts` states it as
 * assignments against `@types/react`, and `pnpm run check:tools-tests` (CI's
 * `types` shard) type-checks it. This suite only proves react is not imported.
 */
import "./helpers/credentialFreeEnv.js";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  assert,
  defineSuite,
  runCommand,
  scaleTimeoutMs,
} from "./helpers/harness.js";
import { assertDistFresh } from "./helpers/distFreshness.js";

assertDistFresh();
const { test, runSuite } = defineSuite("Package declarations", {
  offline: true,
});

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// Strings are matched first so a `//` inside one is not read as a comment, and
// a quote inside a comment is consumed by the comment, which starts earlier.
const STRING_OR_COMMENT =
  /("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`)|\/\*[\s\S]*?\*\/|\/\/[^\n]*/g;

const SPECIFIER_PATTERNS: readonly RegExp[] = [
  /\bfrom\s*(["'])([^"'\n]+)\1/g,
  /\b(?:import|require)\s*\(\s*(["'])([^"'\n]+)\1/g,
  /\bimport\s*(["'])([^"'\n]+)\1/g,
];

// `/// <reference types="x" />` is a comment to the eye and an import to the
// compiler, so it is read from the raw text before comments are dropped.
const REFERENCE_TYPES =
  /^[ \t]*\/\/\/\s*<reference\s+types\s*=\s*(["'])([^"'\n]+)\1/gm;

const stripComments = (source: string): string =>
  source.replace(STRING_OR_COMMENT, (match, text: string | undefined) =>
    text === undefined ? " " : match,
  );

const packageNameOf = (specifier: string): string | null => {
  if (
    specifier.startsWith(".") ||
    specifier.startsWith("/") ||
    specifier.startsWith("node:")
  ) {
    return null;
  }
  const parts = specifier.split("/");
  return specifier.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0];
};

const specifiersOf = (source: string): readonly string[] => {
  const code = stripComments(source);
  const fromCode = SPECIFIER_PATTERNS.flatMap((pattern) =>
    [...code.matchAll(pattern)].map((match) => match[2]),
  );
  const fromReferences = [...source.matchAll(REFERENCE_TYPES)].map(
    (match) => match[2],
  );
  return [...fromCode, ...fromReferences];
};

/** Names from `packages` that this declaration source imports, sorted. */
const packagesImportedFrom = (
  source: string,
  packages: ReadonlySet<string>,
): readonly string[] => {
  if (![...packages].some((name) => source.includes(name))) {
    return [];
  }
  const named = specifiersOf(source)
    .map(packageNameOf)
    .filter((name): name is string => name !== null && packages.has(name));
  return [...new Set(named)].sort();
};

const isDeclarationFile = (path: string): boolean => /\.d\.[cm]?ts$/.test(path);
const isJsxSource = (path: string): boolean => path.endsWith(".tsx");

type PackedFiles = {
  all: readonly string[];
  dist: readonly string[];
};

const packedPaths = (stdout: string): readonly string[] => {
  const report: unknown = JSON.parse(stdout);
  const first: unknown = Array.isArray(report) ? report[0] : undefined;
  if (typeof first !== "object" || first === null || !("files" in first)) {
    throw new Error("npm pack --json carried no files array");
  }
  const files: unknown = first.files;
  if (!Array.isArray(files)) {
    throw new Error("npm pack --json carried no files array");
  }
  return files.flatMap((file: unknown) =>
    typeof file === "object" &&
    file !== null &&
    "path" in file &&
    typeof file.path === "string"
      ? [file.path]
      : [],
  );
};

let packed: PackedFiles | undefined;
const packedFiles = async (): Promise<PackedFiles> => {
  if (packed) {
    return packed;
  }
  const result = await runCommand(
    "npm",
    ["pack", "--dry-run", "--json", "--ignore-scripts"],
    { cwd: REPO_ROOT, timeoutMs: scaleTimeoutMs(180_000) },
  );
  assert(result.exitCode === 0, "npm pack --dry-run did not exit 0");
  const all = packedPaths(result.stdout);
  packed = { all, dist: all.filter((path) => path.startsWith("dist/")) };
  return packed;
};

const entriesOf = (value: unknown): readonly (readonly [string, unknown])[] =>
  typeof value === "object" && value !== null ? Object.entries(value) : [];

const sectionOf = (
  manifest: unknown,
  key: string,
): readonly (readonly [string, unknown])[] =>
  entriesOf(entriesOf(manifest).find(([name]) => name === key)?.[1]);

/** Names a consumer may not have installed: optionalDependencies plus the optional peers. */
const optionalPackagesOf = (manifest: unknown): ReadonlySet<string> =>
  new Set([
    ...sectionOf(manifest, "optionalDependencies").map(([name]) => name),
    ...sectionOf(manifest, "peerDependenciesMeta")
      .filter(([, meta]) =>
        entriesOf(meta).some(
          ([key, flag]) => key === "optional" && flag === true,
        ),
      )
      .map(([name]) => name),
  ]);

const readManifest = (): unknown =>
  JSON.parse(readFileSync(join(REPO_ROOT, "package.json"), "utf8"));

// Every package here bundles its own declarations; the fix for a name is a
// structural type in src/lib/types (as for fluent-ffmpeg and react), after which
// its entry must be removed. Never add to this list. No optional peer
// (react, react-dom, @juspay/hippocampus) is recorded: none ships types a
// consumer is guaranteed to have, so a declaration naming one fails TS2307.
const KNOWN_OPTIONAL_IMPORTS: ReadonlySet<string> = new Set([
  "dist/providers/amazonBedrock/client.d.ts -> @aws-sdk/client-bedrock-runtime",
  "dist/providers/amazonBedrock/loopAdapter.d.ts -> @aws-sdk/client-bedrock-runtime",
  "dist/providers/amazonBedrock/modelBridge.d.ts -> @aws-sdk/client-bedrock-runtime",
  "dist/providers/amazonBedrock/utils.d.ts -> @aws-sdk/client-bedrock",
  "dist/voice/livekit/realtimeMcpTools.d.ts -> @livekit/agents",
  "dist/voice/livekit/realtimeMemory.d.ts -> @livekit/agents",
  "dist/voice/livekit/realtimeVoiceAgent.d.ts -> @livekit/agents",
  "dist/voice/livekit/voiceAgent.d.ts -> @livekit/agents",
]);

const SAMPLE_OPTIONAL = new Set([
  "fluent-ffmpeg",
  "exceljs",
  "@aws-sdk/client-bedrock",
]);

await test("control: the scanner flags a declaration that names an optional package", () => {
  const flagged = packagesImportedFrom(
    'export declare function f(mod: unknown): asserts mod is typeof import("fluent-ffmpeg");',
    SAMPLE_OPTIONAL,
  );
  assert(
    flagged.length === 1 && flagged[0] === "fluent-ffmpeg",
    "the scanner missed typeof import(...) of an optional package",
  );
});

await test("control: the scanner ignores a comment that only mentions an optional package", () => {
  const source = [
    '/** Wraps fluent-ffmpeg when present; see import("fluent-ffmpeg"). */',
    "// from 'fluent-ffmpeg' is the usual spelling",
    "/* require('exceljs') */",
    "export type Plain = string;",
  ].join("\n");
  assert(
    packagesImportedFrom(source, SAMPLE_OPTIONAL).length === 0,
    "the scanner counted a comment as a module specifier",
  );
});

await test("control: the scanner handles subpaths, require, scoped names, references and strings holding //", () => {
  const subpath = packagesImportedFrom(
    "import type { A } from 'fluent-ffmpeg/lib/x';",
    SAMPLE_OPTIONAL,
  );
  assert(subpath.join() === "fluent-ffmpeg", "a subpath import was missed");
  const required = packagesImportedFrom(
    'import ex = require("exceljs");',
    SAMPLE_OPTIONAL,
  );
  assert(required.join() === "exceljs", "a require() import was missed");
  const scoped = packagesImportedFrom(
    'export type C = import("@aws-sdk/client-bedrock/dist-types").X;',
    SAMPLE_OPTIONAL,
  );
  assert(
    scoped.join() === "@aws-sdk/client-bedrock",
    "a scoped package subpath was missed",
  );
  const reference = packagesImportedFrom(
    '/// <reference types="fluent-ffmpeg" />\nexport {};',
    SAMPLE_OPTIONAL,
  );
  assert(reference.join() === "fluent-ffmpeg", "a types reference was missed");
  const afterUrl = packagesImportedFrom(
    'export type Url = "http://example.test";\nexport type T = typeof import("exceljs");',
    SAMPLE_OPTIONAL,
  );
  assert(
    afterUrl.join() === "exceljs",
    "a // inside a string hid a later specifier",
  );
  const relative = packagesImportedFrom(
    'import type { B } from "./fluent-ffmpeg.js";',
    SAMPLE_OPTIONAL,
  );
  assert(relative.length === 0, "a relative path was read as a package");
});

await test("control: optional peers count as optional packages, required peers do not", () => {
  const manifest = {
    optionalDependencies: { exceljs: "^4.0.0" },
    peerDependencies: {
      react: ">=18.0.0",
      "react-dom": ">=18.0.0",
      "@opentelemetry/api": "^1.9.0",
      "@juspay/hippocampus": ">=0.2.1",
    },
    peerDependenciesMeta: {
      react: { optional: true },
      "react-dom": { optional: true },
      "@juspay/hippocampus": { optional: true },
      "@opentelemetry/api": { optional: false },
    },
  };
  const names = [...optionalPackagesOf(manifest)].sort().join();
  assert(
    names === "@juspay/hippocampus,exceljs,react,react-dom",
    "optional peers were not merged with optionalDependencies, or a required peer was counted",
  );
  assert(
    optionalPackagesOf({}).size === 0 &&
      optionalPackagesOf({ peerDependenciesMeta: null }).size === 0,
    "a manifest without those sections did not yield an empty set",
  );
  const flagged = packagesImportedFrom(
    [
      'import type { ReactNode } from "react";',
      'export type T = import("react-dom/client").Root;',
      'export type U = import("@opentelemetry/api").Span;',
    ].join("\n"),
    optionalPackagesOf(manifest),
  );
  assert(
    flagged.join() === "react,react-dom",
    "the scanner missed a react import or flagged a required peer",
  );
});

await test("control: only .tsx is treated as JSX source", () => {
  assert(isJsxSource("dist/client/reactHooks.tsx"), ".tsx was not detected");
  assert(!isJsxSource("dist/client/reactHooks.d.ts"), ".d.ts was flagged");
  assert(!isJsxSource("dist/client/reactHooks.js"), ".js was flagged");
});

await test("npm pack --dry-run lists the build output it is meant to inspect", async () => {
  const { all, dist } = await packedFiles();
  assert(all.includes("package.json"), "the pack list has no package.json");
  assert(
    dist.includes("dist/index.js") && dist.includes("dist/index.d.ts"),
    "the pack list has no dist entry point; build first",
  );
  assert(
    dist.filter(isDeclarationFile).length > 100,
    "the pack list carries too few declaration files to mean anything",
  );
});

await test("no .tsx file ships under dist/ (a consumer without --jsx fails TS6142)", async () => {
  const { dist } = await packedFiles();
  const jsx = dist.filter(isJsxSource);
  if (jsx.length > 0) {
    console.error(`Packed .tsx files: ${jsx.join(", ")}`);
  }
  assert(jsx.length === 0, `${jsx.length} .tsx file(s) are packed under dist/`);
});

await test("the react hooks runtime and declarations still ship", async () => {
  const { dist } = await packedFiles();
  assert(
    dist.includes("dist/client/reactHooks.js"),
    "dist/client/reactHooks.js is not packed",
  );
  assert(
    dist.includes("dist/client/reactHooks.d.ts"),
    "dist/client/reactHooks.d.ts is not packed",
  );
});

await test("no published declaration imports an optional dependency or optional peer beyond the recorded baseline (a consumer without it fails TS7016 or TS2307)", async () => {
  const optional = optionalPackagesOf(readManifest());
  assert(optional.size > 0, "package.json lists no optional packages");
  assert(
    optional.has("react"),
    "react is no longer an optional peer in package.json; this guard was written for it",
  );
  const { dist } = await packedFiles();
  const declarations = dist.filter(isDeclarationFile);
  const offenders = declarations.flatMap((path) => {
    const hits = packagesImportedFrom(
      readFileSync(join(REPO_ROOT, path), "utf8"),
      optional,
    );
    return hits.length > 0 ? [`${path} -> ${hits.join(", ")}`] : [];
  });
  const added = offenders.filter((line) => !KNOWN_OPTIONAL_IMPORTS.has(line));
  const gone = [...KNOWN_OPTIONAL_IMPORTS].filter(
    (line) => !offenders.includes(line),
  );
  if (added.length > 0) {
    console.error(`New optional-package imports:\n${added.join("\n")}`);
  }
  if (gone.length > 0) {
    console.error(`Baseline entries that no longer leak:\n${gone.join("\n")}`);
  }
  assert(
    added.length === 0,
    `${added.length} declaration file(s) newly import an optional dependency, of ${declarations.length} scanned`,
  );
  assert(
    gone.length === 0,
    `${gone.length} baseline entr(ies) no longer leak; remove them from KNOWN_OPTIONAL_IMPORTS`,
  );
});

await runSuite();
