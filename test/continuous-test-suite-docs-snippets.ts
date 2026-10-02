#!/usr/bin/env tsx
/**
 * Continuous Test Suite: constructor options the docs show and the package
 * does not declare.
 *
 * The docs carry hundreds of `new NeuroLink({ ... })` snippets, and many use a
 * top-level key `NeurolinkConstructorConfig` does not declare (`middleware`,
 * `providers`, ...). TypeScript rejects those with TS2353, and a JavaScript
 * caller has the key silently ignored, so someone who copies the page gets a
 * client that is not configured the way the page says.
 *
 * This reads README.md and docs/ (not docs/api, which is generated, and not
 * docs/plans, which is design notes), parses every fenced typescript / ts /
 * tsx / javascript / js block with the TypeScript compiler (parse only, no
 * type check), and compares the top-level keys of each `new NeuroLink({ ... })`
 * literal with the keys the SHIPPED constructor declares, read from the built
 * d.ts through the compiler API. Spreads and computed keys are ignored.
 *
 * Mistakes that already exist are recorded in
 * test/fixtures/docs-constructor-keys.json as (file, option) pairs with an
 * occurrence count. The suite fails on a documented option the ledger does not
 * allow (a new mistake, or a second use of a ledgered one) and on a ledger
 * entry the docs no longer need (stale). Debt stays visible and can only
 * shrink.
 *
 * After fixing pages, regenerate the ledger:
 *   pnpm run test:docs-snippets:update
 * The output is sorted by codepoint and written only when it differs, so a
 * second run, or a run on an unchanged tree, changes nothing.
 *
 * Failure messages are fixed strings. The harness classifies a thrown message
 * as a skip when its text looks like a provider error, so file names and keys
 * taken from the docs are printed on stderr lines above the failure instead.
 *
 * CI does NOT run this suite. A gate would be one step after the build in the
 * `types` shard of `test-shards` in .github/workflows/ci.yml, next to
 * `check:dts`, which reads the same shipped declarations. That would make it
 * part of the required `test` check, which is the owner's call; this file does
 * not edit the workflow. The `security-suites` job, which already runs
 * `test:docs-mcp` after its own build, is the other fit.
 *
 * Overrides, used to show each check can fail (do not set them to bless a
 * change; update mode refuses an overridden root or types entry unless the
 * ledger path is overridden too):
 *   NEUROLINK_DOCS_SNIPPETS_ROOT    directory holding README.md and docs/
 *   NEUROLINK_DOCS_SNIPPETS_LEDGER  ledger file to compare against
 *   NEUROLINK_DOCS_SNIPPETS_TYPES   d.ts entry to read the constructor from
 *
 * Run: pnpm run build && pnpm run test:docs-snippets
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import {
  assert,
  defineSuite,
  isExpectedProviderError,
} from "./helpers/harness.js";
import { assertDistFresh } from "./helpers/distFreshness.js";

assertDistFresh();

const { test, runSuite } = defineSuite("Documented constructor options", {
  offline: true,
});

const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

const envPath = (name: string): string | undefined => {
  const value = process.env[name];
  return value ? path.resolve(value) : undefined;
};

const ROOT_OVERRIDE = envPath("NEUROLINK_DOCS_SNIPPETS_ROOT");
const LEDGER_OVERRIDE = envPath("NEUROLINK_DOCS_SNIPPETS_LEDGER");
const TYPES_OVERRIDE = envPath("NEUROLINK_DOCS_SNIPPETS_TYPES");
const DOCS_ROOT = ROOT_OVERRIDE ?? REPO_ROOT;
const LEDGER_PATH =
  LEDGER_OVERRIDE ??
  path.join(REPO_ROOT, "test", "fixtures", "docs-constructor-keys.json");
const UPDATE_LEDGER = process.argv.includes("--update-ledger");
const UPDATE_COMMAND = "pnpm run test:docs-snippets:update";

const displayPath = (target: string): string => {
  const relative = path.relative(REPO_ROOT, target);
  return relative.startsWith("..") ? target : relative;
};

const SCANNED_FENCES: ReadonlyMap<string, ts.ScriptKind> = new Map<
  string,
  ts.ScriptKind
>([
  ["typescript", ts.ScriptKind.TS],
  ["ts", ts.ScriptKind.TS],
  ["tsx", ts.ScriptKind.TSX],
  ["javascript", ts.ScriptKind.JS],
  ["js", ts.ScriptKind.JS],
]);

const EXCLUDED_DIRECTORIES: ReadonlySet<string> = new Set([
  "docs/api",
  "docs/plans",
]);

// Real values are 518 files, 4090 blocks and 460 literals at the time of
// writing. The floors sit well under them so honest edits never trip them,
// and well over zero so a scanner that read nothing cannot pass.
const FLOORS = { files: 300, fences: 2000, literals: 300 } as const;

// Options the shipped constructor has always declared. Their absence means
// the declaration source is wrong, not that the SDK dropped them.
const KNOWN_DECLARED_KEYS = ["credentials", "mcp"] as const;

const PROBE_KEY = "docsGuardUndeclaredProbe";

const FAIL = {
  typesEntryMissing:
    "the shipped types entry could not be read - run pnpm run build, or check the types field in package.json",
  constructorNotResolved:
    "no NeuroLink export with a constructor signature was resolved from the shipped declarations",
  declaredEmpty:
    "the shipped constructor declares no options, so there is nothing to compare the docs with",
  declaredOpenEnded:
    "the shipped constructor accepts any key through an index signature, so no documented key can be undeclared",
  declaredLacksKnown:
    "the declared options lack credentials or mcp, so the declaration source is not the real constructor",
  docsFewFiles:
    "far fewer markdown files were read than expected - wrong docs root, or the docs moved",
  docsNoReadme: "README.md was not among the files read",
  docsFewFences:
    "far fewer ts/js fenced blocks were read than expected - the fence scanner is broken",
  docsFewLiterals:
    "far fewer constructor object literals were found than expected - the scanner is broken",
  stateMissing:
    "an earlier check failed, so this one cannot run - fix the earlier failure first",
  controlProbeDeclared:
    "the control probe key is now a declared option - choose another probe name",
  controlFlag:
    "control failed: a literal using an undeclared option was not flagged exactly once",
  controlClean:
    "control failed: a literal using every declared option was flagged or misread",
  controlSemantics:
    "control failed: the scanner no longer reads the synthetic document as expected",
  controlLedger:
    "control failed: the ledger comparison no longer classifies synthetic cases as expected",
  controlSerialization:
    "control failed: ledger serialization is not canonical, sorted and round-trippable",
  updateOverrideGuard:
    "refusing to rewrite the repository ledger from an overridden docs root or types entry - also set the ledger override",
  ledgerMissing: `the ledger file does not exist - run ${UPDATE_COMMAND}`,
  ledgerMalformed: `the ledger is not a map of file to option counts - regenerate it with ${UPDATE_COMMAND}`,
  ledgerNotCanonical: `the ledger is not in canonical form (sorted, two-space JSON) - regenerate it with ${UPDATE_COMMAND}`,
  newOffenders:
    "documented constructor options are neither declared by the package nor allowed by the ledger - the NEW lines above name each file and option",
  staleEntries: `ledger entries no longer occur in the docs - the STALE lines above name each; run ${UPDATE_COMMAND}`,
} as const;

type DeclaredOptions = {
  readonly keys: ReadonlySet<string>;
  readonly constructors: number;
  readonly openEnded: boolean;
};

type DocLiteral = {
  readonly file: string;
  readonly line: number;
  readonly keys: readonly string[];
};

type DocScan = {
  readonly files: readonly string[];
  readonly fences: number;
  readonly literals: readonly DocLiteral[];
};

type Fence = {
  readonly language: string;
  readonly firstLine: number;
  readonly code: string;
};

type OpenFence = {
  readonly marker: string;
  readonly length: number;
  readonly language: string;
  readonly firstLine: number;
  readonly quoted: boolean;
  readonly body: string[];
};

type LedgerCounts = ReadonlyMap<string, ReadonlyMap<string, number>>;

type LedgerDelta = {
  readonly file: string;
  readonly key: string;
  readonly documented: number;
  readonly ledgered: number;
};

type SuiteState = {
  declared?: DeclaredOptions;
  scan?: DocScan;
  ledger?: LedgerCounts;
  declaredReady: boolean;
  docsReady: boolean;
  controlsReady: boolean;
};

const state: SuiteState = {
  declaredReady: false,
  docsReady: false,
  controlsReady: false,
};

function fail(message: string): never {
  throw new Error(message);
}

const compareCodepoints = (a: string, b: string): number =>
  a < b ? -1 : a > b ? 1 : 0;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function shippedTypesEntry(): string | undefined {
  const manifest: unknown = JSON.parse(
    fs.readFileSync(path.join(REPO_ROOT, "package.json"), "utf8"),
  );
  if (!isRecord(manifest)) {
    return undefined;
  }
  const root = isRecord(manifest.exports) ? manifest.exports["."] : undefined;
  const declared = (isRecord(root) ? root.types : undefined) ?? manifest.types;
  return typeof declared === "string"
    ? path.resolve(REPO_ROOT, declared)
    : undefined;
}

function readDeclaredOptions(entry: string): DeclaredOptions {
  const program = ts.createProgram({
    rootNames: [entry],
    options: {
      noEmit: true,
      skipLibCheck: true,
      types: [],
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
    },
  });
  const checker = program.getTypeChecker();
  const source = program.getSourceFile(entry);
  const moduleSymbol =
    source === undefined ? undefined : checker.getSymbolAtLocation(source);
  const exported =
    moduleSymbol === undefined
      ? undefined
      : checker
          .getExportsOfModule(moduleSymbol)
          .find((symbol) => symbol.name === "NeuroLink");
  if (exported === undefined) {
    return { keys: new Set(), constructors: 0, openEnded: false };
  }
  const classSymbol =
    (exported.flags & ts.SymbolFlags.Alias) !== 0
      ? checker.getAliasedSymbol(exported)
      : exported;
  const signatures = checker
    .getTypeOfSymbol(classSymbol)
    .getConstructSignatures();
  const keys = new Set<string>();
  let openEnded = false;
  for (const signature of signatures) {
    const [parameter] = signature.getParameters();
    if (parameter === undefined) {
      continue;
    }
    const config = checker.getNonNullableType(
      checker.getTypeOfSymbol(parameter),
    );
    for (const property of checker.getPropertiesOfType(config)) {
      keys.add(property.name);
    }
    openEnded = openEnded || checker.getIndexInfosOfType(config).length > 0;
  }
  return { keys, constructors: signatures.length, openEnded };
}

function listDocFiles(root: string): string[] {
  const found: string[] = [];
  if (fs.existsSync(path.join(root, "README.md"))) {
    found.push("README.md");
  }
  const walk = (directory: string): void => {
    for (const entry of fs.readdirSync(path.join(root, directory), {
      withFileTypes: true,
    })) {
      const relative = `${directory}/${entry.name}`;
      if (entry.isDirectory()) {
        if (!EXCLUDED_DIRECTORIES.has(relative)) {
          walk(relative);
        }
      } else if (entry.isFile() && entry.name.endsWith(".md")) {
        found.push(relative);
      }
    }
  };
  if (fs.existsSync(path.join(root, "docs"))) {
    walk("docs");
  }
  return found.sort(compareCodepoints);
}

const FENCE_LINE = /^(\s*(?:>\s?)*)(`{3,}|~{3,})(.*)$/;
const QUOTE_PREFIX = /^\s*(?:>\s?)+/;

function extractFences(markdown: string): Fence[] {
  const fences: Fence[] = [];
  const close = (open: OpenFence): void => {
    fences.push({
      language: open.language,
      firstLine: open.firstLine,
      code: open.body.join("\n"),
    });
  };
  let open: OpenFence | undefined;
  for (const [index, line] of markdown.split(/\r?\n/).entries()) {
    const match = FENCE_LINE.exec(line);
    if (open !== undefined) {
      const closes =
        match !== null &&
        match[2][0] === open.marker &&
        match[2].length >= open.length &&
        match[3].trim() === "";
      if (closes) {
        close(open);
        open = undefined;
      } else {
        open.body.push(open.quoted ? line.replace(QUOTE_PREFIX, "") : line);
      }
      continue;
    }
    if (match === null || (match[2][0] === "`" && match[3].includes("`"))) {
      continue;
    }
    open = {
      marker: match[2][0],
      length: match[2].length,
      language: match[3]
        .trim()
        .split(/[\s{:,]/)[0]
        .toLowerCase(),
      firstLine: index + 2,
      quoted: match[1].includes(">"),
      body: [],
    };
  }
  if (open !== undefined) {
    close(open);
  }
  return fences;
}

const isNeuroLinkReference = (expression: ts.Expression): boolean =>
  (ts.isIdentifier(expression) && expression.text === "NeuroLink") ||
  (ts.isPropertyAccessExpression(expression) &&
    expression.name.text === "NeuroLink");

function firstArgumentLiteral(
  call: ts.NewExpression,
): ts.ObjectLiteralExpression | undefined {
  let argument: ts.Expression | undefined = call.arguments?.[0];
  while (
    argument !== undefined &&
    (ts.isParenthesizedExpression(argument) ||
      ts.isAsExpression(argument) ||
      ts.isSatisfiesExpression(argument) ||
      ts.isTypeAssertionExpression(argument) ||
      ts.isNonNullExpression(argument))
  ) {
    argument = argument.expression;
  }
  return argument !== undefined && ts.isObjectLiteralExpression(argument)
    ? argument
    : undefined;
}

function topLevelKeys(literal: ts.ObjectLiteralExpression): string[] {
  const keys = new Set<string>();
  for (const property of literal.properties) {
    if (ts.isSpreadAssignment(property)) {
      continue;
    }
    const name = property.name;
    if (
      ts.isIdentifier(name) ||
      ts.isStringLiteralLike(name) ||
      ts.isNumericLiteral(name)
    ) {
      keys.add(name.text);
    }
  }
  return [...keys];
}

function scanMarkdown(
  file: string,
  markdown: string,
): { fences: number; literals: DocLiteral[] } {
  const literals: DocLiteral[] = [];
  let fences = 0;
  for (const fence of extractFences(markdown)) {
    const kind = SCANNED_FENCES.get(fence.language);
    if (kind === undefined) {
      continue;
    }
    fences += 1;
    const source = ts.createSourceFile(
      "snippet",
      fence.code,
      ts.ScriptTarget.Latest,
      false,
      kind,
    );
    const visit = (node: ts.Node): void => {
      if (ts.isNewExpression(node) && isNeuroLinkReference(node.expression)) {
        const literal = firstArgumentLiteral(node);
        if (literal !== undefined) {
          literals.push({
            file,
            line:
              fence.firstLine +
              source.getLineAndCharacterOfPosition(node.getStart(source)).line,
            keys: topLevelKeys(literal),
          });
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  return { fences, literals };
}

function scanDocs(root: string): DocScan {
  const files = listDocFiles(root);
  const literals: DocLiteral[] = [];
  let fences = 0;
  for (const file of files) {
    const result = scanMarkdown(
      file,
      fs.readFileSync(path.join(root, file), "utf8"),
    );
    fences += result.fences;
    literals.push(...result.literals);
  }
  return { files, fences, literals };
}

function countUndeclared(
  literals: readonly DocLiteral[],
  declared: ReadonlySet<string>,
): LedgerCounts {
  const counts = new Map<string, Map<string, number>>();
  for (const literal of literals) {
    for (const key of literal.keys) {
      if (declared.has(key)) {
        continue;
      }
      const perFile = counts.get(literal.file) ?? new Map<string, number>();
      perFile.set(key, (perFile.get(key) ?? 0) + 1);
      counts.set(literal.file, perFile);
    }
  }
  return counts;
}

function serializeLedger(counts: LedgerCounts): string {
  const files = [...counts.keys()].sort(compareCodepoints);
  if (files.length === 0) {
    return "{}\n";
  }
  const blocks = files.map((file) => {
    const perFile = counts.get(file) ?? new Map<string, number>();
    const lines = [...perFile.keys()]
      .sort(compareCodepoints)
      .map((key) => `    ${JSON.stringify(key)}: ${perFile.get(key)}`);
    return `  ${JSON.stringify(file)}: {\n${lines.join(",\n")}\n  }`;
  });
  return `{\n${blocks.join(",\n")}\n}\n`;
}

function parseLedger(text: string): LedgerCounts | undefined {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return undefined;
  }
  if (!isRecord(parsed)) {
    return undefined;
  }
  const counts = new Map<string, Map<string, number>>();
  for (const [file, perFile] of Object.entries(parsed)) {
    if (!isRecord(perFile) || Object.keys(perFile).length === 0) {
      return undefined;
    }
    const keyed = new Map<string, number>();
    for (const [key, count] of Object.entries(perFile)) {
      if (typeof count !== "number" || !Number.isInteger(count) || count < 1) {
        return undefined;
      }
      keyed.set(key, count);
    }
    counts.set(file, keyed);
  }
  return counts;
}

function diffLedger(
  documented: LedgerCounts,
  ledgered: LedgerCounts,
): { added: LedgerDelta[]; stale: LedgerDelta[] } {
  const added: LedgerDelta[] = [];
  const stale: LedgerDelta[] = [];
  const files = [...new Set([...documented.keys(), ...ledgered.keys()])];
  for (const file of files.sort(compareCodepoints)) {
    const seen = documented.get(file) ?? new Map<string, number>();
    const known = ledgered.get(file) ?? new Map<string, number>();
    const keys = [...new Set([...seen.keys(), ...known.keys()])];
    for (const key of keys.sort(compareCodepoints)) {
      const documentedCount = seen.get(key) ?? 0;
      const ledgeredCount = known.get(key) ?? 0;
      const delta = {
        file,
        key,
        documented: documentedCount,
        ledgered: ledgeredCount,
      };
      if (documentedCount > ledgeredCount) {
        added.push(delta);
      } else if (ledgeredCount > documentedCount) {
        stale.push(delta);
      }
    }
  }
  return { added, stale };
}

const pairCount = (counts: LedgerCounts): number =>
  [...counts.values()].reduce((sum, perFile) => sum + perFile.size, 0);

function reportNewOffenders(
  added: readonly LedgerDelta[],
  literals: readonly DocLiteral[],
): void {
  for (const delta of added) {
    const lines = literals
      .filter(
        (literal) =>
          literal.file === delta.file && literal.keys.includes(delta.key),
      )
      .map((literal) => literal.line);
    console.error(
      `  NEW    ${delta.file}: option "${delta.key}" is documented ${delta.documented}x (lines ${lines.join(", ")}) and the ledger allows ${delta.ledgered}x`,
    );
  }
  console.error(
    `  Fix each snippet to use an option NeurolinkConstructorConfig declares (the set comes from the built d.ts). Only if the page is accepted as known debt, run ${UPDATE_COMMAND} and review the ledger diff.`,
  );
}

function reportStaleEntries(stale: readonly LedgerDelta[]): void {
  for (const delta of stale) {
    console.error(
      `  STALE  ${delta.file}: option "${delta.key}" is documented ${delta.documented}x but the ledger lists ${delta.ledgered}x`,
    );
  }
  console.error(
    `  The ledger may only shrink: run ${UPDATE_COMMAND}, or delete the entry (or lower its count) by hand.`,
  );
}

const fenceOf = (language: string, code: string): string =>
  `\`\`\`${language}\n${code}\n\`\`\`\n`;

const requireDeclared = (): DeclaredOptions =>
  state.declaredReady && state.declared !== undefined
    ? state.declared
    : fail(FAIL.stateMissing);

const requireScan = (): DocScan =>
  state.docsReady && state.scan !== undefined
    ? state.scan
    : fail(FAIL.stateMissing);

const requireLedger = (): LedgerCounts =>
  state.ledger !== undefined ? state.ledger : fail(FAIL.stateMissing);

const flatten = (counts: LedgerCounts): string[] =>
  [...counts.entries()].flatMap(([file, perFile]) =>
    [...perFile.entries()].map(([key, count]) => `${file}:${key}:${count}`),
  );

const ledgerOf = (
  entries: Readonly<Record<string, Readonly<Record<string, number>>>>,
): LedgerCounts =>
  new Map(
    Object.entries(entries).map(([file, perFile]) => [
      file,
      new Map(Object.entries(perFile)),
    ]),
  );

const summarizeDiff = (
  documented: LedgerCounts,
  ledgered: LedgerCounts,
): string => {
  const { added, stale } = diffLedger(documented, ledgered);
  const render = (deltas: readonly LedgerDelta[]): string =>
    deltas
      .map((d) => `${d.file}:${d.key}:${d.documented}>${d.ledgered}`)
      .join(",");
  return `added=[${render(added)}] stale=[${render(stale)}]`;
};

await runSuite(async () => {
  await test("failure messages are never classified as skips", () => {
    const misclassified = Object.values(FAIL).filter(
      (message) =>
        message.startsWith("SKIP:") || isExpectedProviderError(message),
    );
    assert(
      misclassified.length === 0,
      "a failure message of this suite would be reported as a skip instead of a failure",
    );
  });

  await test("precondition: the shipped constructor declares its options", () => {
    const entry = TYPES_OVERRIDE ?? shippedTypesEntry();
    if (entry === undefined || !fs.existsSync(entry)) {
      fail(FAIL.typesEntryMissing);
    }
    const options = readDeclaredOptions(entry);
    state.declared = options;
    console.log(
      `    ${options.keys.size} declared constructor options, read from ${displayPath(entry)}`,
    );
    assert(options.constructors > 0, FAIL.constructorNotResolved);
    assert(options.keys.size > 0, FAIL.declaredEmpty);
    assert(!options.openEnded, FAIL.declaredOpenEnded);
    assert(
      KNOWN_DECLARED_KEYS.every((key) => options.keys.has(key)),
      FAIL.declaredLacksKnown,
    );
    state.declaredReady = true;
  });

  await test("precondition: the docs were read and constructor literals were found", () => {
    const result = scanDocs(DOCS_ROOT);
    state.scan = result;
    console.log(
      `    read ${result.files.length} files, ${result.fences} ts/js fenced blocks, ${result.literals.length} constructor object literals`,
    );
    assert(result.files.length >= FLOORS.files, FAIL.docsFewFiles);
    assert(result.files.includes("README.md"), FAIL.docsNoReadme);
    assert(result.fences >= FLOORS.fences, FAIL.docsFewFences);
    assert(result.literals.length >= FLOORS.literals, FAIL.docsFewLiterals);
    state.docsReady = true;
  });

  await test("control: a literal using an undeclared option is flagged", () => {
    const options = requireDeclared();
    if (options.keys.has(PROBE_KEY)) {
      fail(FAIL.controlProbeDeclared);
    }
    const { literals } = scanMarkdown(
      "control.md",
      fenceOf(
        "typescript",
        `const nl = new NeuroLink({\n  credentials: {},\n  ${PROBE_KEY}: true,\n});`,
      ),
    );
    const { added } = diffLedger(
      countUndeclared(literals, options.keys),
      new Map(),
    );
    assert(
      literals.length === 1 &&
        added.length === 1 &&
        added[0].file === "control.md" &&
        added[0].key === PROBE_KEY &&
        added[0].documented === 1,
      FAIL.controlFlag,
    );
  });

  await test("control: a literal using every declared option is not flagged", () => {
    const options = requireDeclared();
    const everyOption = [...options.keys]
      .sort(compareCodepoints)
      .map((key) => `${JSON.stringify(key)}: 1`)
      .join(", ");
    const { literals } = scanMarkdown(
      "control.md",
      fenceOf("ts", `new NeuroLink({ ${everyOption} });`),
    );
    assert(
      literals.length === 1 &&
        literals[0].keys.length === options.keys.size &&
        countUndeclared(literals, options.keys).size === 0,
      FAIL.controlClean,
    );
  });

  await test("control: the scanner reads only top-level keys of constructor literals in ts/js blocks", () => {
    const options = requireDeclared();
    const document = [
      "Prose before the first block.",
      fenceOf(
        "ts",
        [
          "new NeuroLink({ ...base, [dynamicKey]: 1, shorthandProbe, credentials: { nestedProbe: 1 }, 'quotedProbe': 1 });",
          "new sdk.NeuroLink({ qualifiedProbe: 1 });",
          "new NeuroLink({ wrappedProbe: 1 } as NeurolinkConstructorConfig);",
          "new NeuroLink(configVariable);",
          "new NeuroLink();",
        ].join("\n"),
      ),
      fenceOf("bash", "new NeuroLink({ bashProbe: 1 });"),
      fenceOf("", "new NeuroLink({ untaggedProbe: 1 });"),
      fenceOf("json", '{ "jsonProbe": 1 }'),
      fenceOf(
        "tsx",
        "const element = <Widget client={new NeuroLink({ tsxProbe: 1 })} />;",
      ),
      fenceOf("js", "const nl = new NeuroLink({ jsProbe: 1 });"),
    ].join("\n");
    const { fences, literals } = scanMarkdown("control.md", document);
    const observed = {
      fences,
      literals: literals.length,
      firstKeys: literals[0]?.keys,
      firstLine: literals[0]?.line,
      secondLine: literals[1]?.line,
      flagged: flatten(countUndeclared(literals, options.keys)).sort(
        compareCodepoints,
      ),
    };
    const expected = {
      fences: 3,
      literals: 5,
      firstKeys: ["shorthandProbe", "credentials", "quotedProbe"],
      firstLine: 3,
      secondLine: 4,
      flagged: [
        "control.md:jsProbe:1",
        "control.md:qualifiedProbe:1",
        "control.md:quotedProbe:1",
        "control.md:shorthandProbe:1",
        "control.md:tsxProbe:1",
        "control.md:wrappedProbe:1",
      ],
    };
    if (JSON.stringify(observed) !== JSON.stringify(expected)) {
      console.error(`  expected ${JSON.stringify(expected)}`);
      console.error(`  observed ${JSON.stringify(observed)}`);
    }
    assert(
      JSON.stringify(observed) === JSON.stringify(expected),
      FAIL.controlSemantics,
    );
  });

  await test("control: the ledger comparison separates new entries from stale ones", () => {
    const ledgered = ledgerOf({ "a.md": { k1: 2, k2: 1 } });
    const cases: ReadonlyArray<readonly [string, LedgerCounts, string]> = [
      ["equal", ledgerOf({ "a.md": { k1: 2, k2: 1 } }), "added=[] stale=[]"],
      [
        "new key in a ledgered file",
        ledgerOf({ "a.md": { k1: 2, k2: 1, k3: 1 } }),
        "added=[a.md:k3:1>0] stale=[]",
      ],
      [
        "ledgered key used once more",
        ledgerOf({ "a.md": { k1: 3, k2: 1 } }),
        "added=[a.md:k1:3>2] stale=[]",
      ],
      [
        "new file",
        ledgerOf({ "a.md": { k1: 2, k2: 1 }, "b.md": { k1: 1 } }),
        "added=[b.md:k1:1>0] stale=[]",
      ],
      [
        "entry no longer occurring",
        ledgerOf({ "a.md": { k1: 2 } }),
        "added=[] stale=[a.md:k2:0>1]",
      ],
      [
        "count lowered",
        ledgerOf({ "a.md": { k1: 1, k2: 1 } }),
        "added=[] stale=[a.md:k1:1>2]",
      ],
      ["file gone", ledgerOf({}), "added=[] stale=[a.md:k1:0>2,a.md:k2:0>1]"],
    ];
    const wrong = cases.filter(
      ([, documented, expected]) =>
        summarizeDiff(documented, ledgered) !== expected,
    );
    for (const [name, documented, expected] of wrong) {
      console.error(
        `  case "${name}": expected ${expected}, got ${summarizeDiff(documented, ledgered)}`,
      );
    }
    assert(wrong.length === 0, FAIL.controlLedger);
  });

  await test("control: the ledger serializes sorted, canonical and round-trippable", () => {
    const sample = ledgerOf({
      "b.md": { zeta: 1, alpha: 3 },
      "a.md": { k1: 2 },
    });
    const text = serializeLedger(sample);
    const reparsed = parseLedger(text);
    const malformed = [
      "not json",
      "[]",
      '{"a.md": {}}',
      '{"a.md": {"k": 0}}',
      '{"a.md": {"k": 1.5}}',
      '{"a.md": 1}',
    ].filter((candidate) => parseLedger(candidate) !== undefined);
    assert(
      text ===
        '{\n  "a.md": {\n    "k1": 2\n  },\n  "b.md": {\n    "alpha": 3,\n    "zeta": 1\n  }\n}\n' &&
        serializeLedger(new Map()) === "{}\n" &&
        reparsed !== undefined &&
        serializeLedger(reparsed) === text &&
        malformed.length === 0,
      FAIL.controlSerialization,
    );
    state.controlsReady = true;
  });

  if (UPDATE_LEDGER) {
    await test("the ledger is regenerated from the docs", () => {
      if (
        (ROOT_OVERRIDE !== undefined || TYPES_OVERRIDE !== undefined) &&
        LEDGER_OVERRIDE === undefined
      ) {
        fail(FAIL.updateOverrideGuard);
      }
      const options = requireDeclared();
      const result = requireScan();
      if (!state.controlsReady) {
        fail(FAIL.stateMissing);
      }
      const next = serializeLedger(
        countUndeclared(result.literals, options.keys),
      );
      const current = fs.existsSync(LEDGER_PATH)
        ? fs.readFileSync(LEDGER_PATH, "utf8")
        : undefined;
      if (current === next) {
        console.log("    ledger already current, nothing written");
        return;
      }
      fs.mkdirSync(path.dirname(LEDGER_PATH), { recursive: true });
      fs.writeFileSync(LEDGER_PATH, next);
      console.log(`    ledger written to ${displayPath(LEDGER_PATH)}`);
    });
  }

  await test("the ledger is readable and canonical", () => {
    if (!fs.existsSync(LEDGER_PATH)) {
      fail(FAIL.ledgerMissing);
    }
    const text = fs.readFileSync(LEDGER_PATH, "utf8");
    const parsed = parseLedger(text);
    if (parsed === undefined) {
      fail(FAIL.ledgerMalformed);
    }
    state.ledger = parsed;
    console.log(
      `    ledger lists ${pairCount(parsed)} (file, option) pairs in ${parsed.size} files`,
    );
    assert(serializeLedger(parsed) === text, FAIL.ledgerNotCanonical);
  });

  await test("every documented constructor option is declared or allowed by the ledger", () => {
    const options = requireDeclared();
    const result = requireScan();
    const known = requireLedger();
    if (!state.controlsReady) {
      fail(FAIL.stateMissing);
    }
    const documented = countUndeclared(result.literals, options.keys);
    const offending = result.literals.filter((literal) =>
      literal.keys.some((key) => !options.keys.has(key)),
    ).length;
    const distinct = new Set(
      [...documented.values()].flatMap((perFile) => [...perFile.keys()]),
    ).size;
    console.log(
      `    ${offending} of ${result.literals.length} literals use an undeclared option: ${pairCount(documented)} (file, option) pairs in ${documented.size} files, ${distinct} distinct options`,
    );
    const { added } = diffLedger(documented, known);
    if (added.length > 0) {
      reportNewOffenders(added, result.literals);
      fail(FAIL.newOffenders);
    }
  });

  await test("the ledger holds no entry the docs no longer need", () => {
    const options = requireDeclared();
    const result = requireScan();
    const known = requireLedger();
    if (!state.controlsReady) {
      fail(FAIL.stateMissing);
    }
    const { stale } = diffLedger(
      countUndeclared(result.literals, options.keys),
      known,
    );
    if (stale.length > 0) {
      reportStaleEntries(stale);
      fail(FAIL.staleEntries);
    }
  });
});
