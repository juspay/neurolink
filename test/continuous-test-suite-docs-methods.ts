#!/usr/bin/env tsx
/**
 * Continuous Test Suite: NeuroLink methods the docs call and the package does
 * not have.
 *
 * Pages show `neurolink.on("generation:end", ...)`, `neurolink.embed(...)` and
 * similar calls that the shipped class does not have. `NeuroLink` does not
 * extend EventEmitter and has no `embed`; a reader who pastes the snippet gets
 * a TypeError at run time (or TS2339 under type checking), on an API the page
 * presented as supported.
 *
 * This reads README.md and docs/ (not docs/api, which is generated, and not
 * docs/plans, which is design notes), parses every fenced typescript / ts /
 * tsx / javascript / js / jsx block with the TypeScript compiler (parse only,
 * no type check), and checks each `<receiver>.<method>(...)` call against the
 * methods the SHIPPED class has. A receiver is one of:
 *   - the conventional name `neurolink`, or any `<expression>.neurolink`
 *     (`this.neurolink`, `app.neurolink`);
 *   - a name or a `this.<field>` that a block initialises with
 *     `new NeuroLink(...)`, assigns that to, or types as `NeuroLink`
 *     (a variable, a parameter, a class field or a constructor parameter
 *     property; `NeuroLink | null` counts).
 * A page builds its client once and later blocks use it, so a name bound to
 * NeuroLink in one block is a receiver in every other block of the page that
 * does not declare that name itself. A block that declares the name as
 * something else (`const nl = makeOther()`, a parameter, a destructured
 * binding, a function or an import) keeps its own meaning for it, and is not
 * checked. That is also the fix for a block that wrongly gets flagged:
 * declare the name in that block.
 * Every other receiver is ignored, so a variable that merely looks like a
 * client, or an instance of another class with an `on` method, is never
 * flagged.
 *
 * Blind spots, by design: element access (`neurolink["x"]()`), a destructured
 * method (`const { generate } = neurolink`), a call through an alias of a
 * method, a receiver returned by a function, and any name or field that is
 * never bound to NeuroLink in a fenced block of the same page. Those calls are
 * not read, so a pass means no bare, assigned, typed or `.neurolink` receiver
 * calls a missing method, not that every documented call is real.
 *
 * The shipped methods are the callable public members the built d.ts declares
 * for the exported class, which must also exist on the prototype chain of the
 * class loaded from dist/index.js. A private method is on the prototype too
 * (TypeScript `private` is erased at run time) but is not part of the API, so
 * the d.ts is what separates the two. Nothing here reads src/lib, which is not
 * what callers load.
 *
 * A snippet for an API that does not exist yet can say so on its opening fence
 * line, the way a title would:
 *
 *   ```typescript planned
 *
 * Calls in that block are not flagged. The marker is for code the page
 * announces as coming, not for code that is simply wrong; a block marked
 * planned in which no call is missing fails as a stale marker, so the debt
 * can only shrink.
 *
 * Failure messages are fixed strings. The harness classifies a thrown message
 * as a skip when its text looks like a provider error, so file names and
 * method names taken from the docs are printed on stderr lines above the
 * failure instead.
 *
 * CI runs this suite after the build in the `types` shard of `test-shards` in
 * .github/workflows/ci.yml, next to `check:dts`, which reads the same shipped
 * declarations.
 *
 * Overrides, used to show each check can fail (do not set them to bless a
 * change):
 *   NEUROLINK_DOCS_METHODS_ROOT   directory holding README.md and docs/
 *   NEUROLINK_DOCS_METHODS_TYPES  d.ts entry to read the declared methods from
 *
 * Run: pnpm run build && pnpm run test:docs-methods
 */

process.env.NEUROLINK_SKIP_MCP = "true";

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
import {
  compareCodepoints,
  extractFences,
  listDocFiles,
} from "./helpers/docsMarkdown.js";

assertDistFresh();

const { test, runSuite } = defineSuite("Documented NeuroLink methods", {
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

const ROOT_OVERRIDE = envPath("NEUROLINK_DOCS_METHODS_ROOT");
const TYPES_OVERRIDE = envPath("NEUROLINK_DOCS_METHODS_TYPES");
const DOCS_ROOT = ROOT_OVERRIDE ?? REPO_ROOT;

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
  ["jsx", ts.ScriptKind.JSX],
]);

const PLANNED_MARKER = "planned";
const CONVENTIONAL_RECEIVER = "neurolink";
// Key for `<expression>.neurolink`, which is a receiver wherever it appears.
const MEMBER_RECEIVER = "*.neurolink";

// A declared callable that is an arrow-function property or a getter returning
// a function lives on the instance, not the prototype, so a few declared
// methods may be missing from the prototype. A d.ts from another build misses
// far more of them.
const MIN_RUNTIME_SHARE = 0.9;

// Real values are 532 files, 4109 blocks, 1936 checked calls and 161 public
// methods at the time of writing. The floors sit well under them so honest
// edits never trip them, and well over zero so a scanner that read nothing
// cannot pass.
const FLOORS = {
  files: 300,
  fences: 2000,
  calls: 1000,
  shipped: 100,
} as const;

// Methods the shipped class has always had. Their absence means the
// declaration source is wrong, not that the SDK dropped them.
const KNOWN_SHIPPED = ["generate", "stream", "getEventEmitter"] as const;

const PROBE_METHOD = "docsGuardUndeclaredMethodProbe";

const FAIL = {
  typesEntryMissing:
    "the shipped types entry could not be read - run pnpm run build, or check the types field in package.json",
  classNotResolved:
    "no NeuroLink export with an instance type was resolved from the shipped declarations",
  distNoClass:
    "dist/index.js does not export a NeuroLink class, so there is nothing to measure the docs against",
  declaredNotAtRuntime:
    "most public methods the built declarations list are not on the built class - the d.ts and the JavaScript come from different builds",
  shippedFew:
    "far fewer public methods were found than expected - the declaration source is not the real class",
  shippedLacksKnown:
    "the shipped methods lack generate, stream or getEventEmitter, so the declaration source is not the real class",
  noInternalMembers:
    "the class has no member that is on the prototype and not public, so the private-method control has nothing to check",
  docsFewFiles:
    "far fewer markdown files were read than expected - wrong docs root, or the docs moved",
  docsNoReadme: "README.md was not among the files read",
  docsFewFences:
    "far fewer ts/js fenced blocks were read than expected - the fence scanner is broken",
  docsFewCalls:
    "far fewer method calls on a NeuroLink receiver were found than expected - the scanner is broken",
  stateMissing:
    "an earlier check failed, so this one cannot run - fix the earlier failure first",
  controlProbeShipped:
    "the control probe method is now a shipped method - choose another probe name",
  controlFlag:
    "control failed: a call to a method the class does not have was not flagged exactly once",
  controlClean:
    "control failed: calls to shipped methods were flagged or misread",
  controlPrivate:
    "control failed: a call to a method that is on the prototype but not public was not flagged",
  controlSemantics:
    "control failed: the scanner no longer reads the synthetic document as expected",
  controlReceivers:
    "control failed: receivers bound by fields, types and assignments, or scoped to their blocks, are no longer read as expected",
  controlPlanned:
    "control failed: the planned marker no longer suppresses, or no longer reports, as expected",
  missingMethods:
    "documented calls name methods the shipped NeuroLink class does not have - the MISSING lines above name each file, line and method",
  staleMarkers:
    "blocks marked planned contain no call to a missing method - the STALE lines above name each; remove the marker",
} as const;

type Shipped = {
  /** Callable public members the built d.ts declares for the exported class. */
  readonly methods: ReadonlySet<string>;
  /** On the prototype chain at run time, not part of the public API. */
  readonly internal: ReadonlySet<string>;
};

type DocCall = {
  readonly file: string;
  readonly line: number;
  readonly receiver: string;
  readonly method: string;
  readonly planned: boolean;
};

type PlannedBlock = {
  readonly file: string;
  readonly line: number;
  readonly calls: number;
  readonly missing: number;
};

type DocScan = {
  readonly files: readonly string[];
  readonly fences: number;
  readonly calls: readonly DocCall[];
  readonly planned: readonly PlannedBlock[];
};

type SuiteState = {
  shipped?: Shipped;
  scan?: DocScan;
  shippedReady: boolean;
  docsReady: boolean;
  controlsReady: boolean;
};

const state: SuiteState = {
  shippedReady: false,
  docsReady: false,
  controlsReady: false,
};

function fail(message: string): never {
  throw new Error(message);
}

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

const isHidden = (symbol: ts.Symbol): boolean => {
  if (symbol.name.startsWith("#") || symbol.name.startsWith("__#")) {
    return true;
  }
  const declaration = symbol.declarations?.[0];
  return (
    declaration !== undefined &&
    (ts.getCombinedModifierFlags(declaration) &
      (ts.ModifierFlags.Private | ts.ModifierFlags.Protected)) !==
      0
  );
};

function readDeclaredMethods(entry: string): ReadonlySet<string> {
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
    return new Set();
  }
  const classSymbol =
    (exported.flags & ts.SymbolFlags.Alias) !== 0
      ? checker.getAliasedSymbol(exported)
      : exported;
  const instance = checker.getDeclaredTypeOfSymbol(classSymbol);
  return new Set(
    checker
      .getPropertiesOfType(instance)
      .filter(
        (property) =>
          !isHidden(property) &&
          checker.getTypeOfSymbol(property).getCallSignatures().length > 0,
      )
      .map((property) => property.name),
  );
}

function prototypeMethods(constructorFunction: unknown): ReadonlySet<string> {
  const names = new Set<string>();
  if (typeof constructorFunction !== "function") {
    return names;
  }
  let prototype: unknown = constructorFunction.prototype;
  while (isRecord(prototype) && prototype !== Object.prototype) {
    for (const name of Object.getOwnPropertyNames(prototype)) {
      if (
        name !== "constructor" &&
        typeof Object.getOwnPropertyDescriptor(prototype, name)?.value ===
          "function"
      ) {
        names.add(name);
      }
    }
    prototype = Object.getPrototypeOf(prototype);
  }
  return names;
}

async function readShipped(entry: string): Promise<Shipped> {
  const declared = readDeclaredMethods(entry);
  const dist: unknown = await import("../dist/index.js");
  const runtime = prototypeMethods(isRecord(dist) ? dist.NeuroLink : undefined);
  if (runtime.size === 0) {
    fail(FAIL.distNoClass);
  }
  const atRuntime = [...declared].filter((name) => runtime.has(name));
  assert(
    atRuntime.length >= declared.size * MIN_RUNTIME_SHARE,
    FAIL.declaredNotAtRuntime,
  );
  return {
    methods: declared,
    internal: new Set([...runtime].filter((name) => !declared.has(name))),
  };
}

const isNeuroLinkReference = (expression: ts.Expression): boolean =>
  (ts.isIdentifier(expression) && expression.text === "NeuroLink") ||
  (ts.isPropertyAccessExpression(expression) &&
    expression.name.text === "NeuroLink");

function unwrapped(expression: ts.Expression): ts.Expression {
  let current = expression;
  while (
    ts.isParenthesizedExpression(current) ||
    ts.isAwaitExpression(current) ||
    ts.isAsExpression(current) ||
    ts.isSatisfiesExpression(current) ||
    ts.isTypeAssertionExpression(current) ||
    ts.isNonNullExpression(current)
  ) {
    current = current.expression;
  }
  return current;
}

const isNeuroLinkValue = (expression: ts.Expression): boolean => {
  const value = unwrapped(expression);
  return ts.isNewExpression(value) && isNeuroLinkReference(value.expression);
};

function isNeuroLinkType(type: ts.TypeNode | undefined): boolean {
  if (type === undefined) {
    return false;
  }
  if (ts.isParenthesizedTypeNode(type)) {
    return isNeuroLinkType(type.type);
  }
  if (ts.isUnionTypeNode(type) || ts.isIntersectionTypeNode(type)) {
    return type.types.some(isNeuroLinkType);
  }
  if (ts.isTypeReferenceNode(type)) {
    const name = type.typeName;
    return (ts.isIdentifier(name) ? name : name.right).text === "NeuroLink";
  }
  return false;
}

// The name a binding or assignment gives a value: `client`, or `this.client`.
const nameKey = (expression: ts.Expression): string | undefined => {
  if (ts.isIdentifier(expression)) {
    return expression.text;
  }
  return ts.isPropertyAccessExpression(expression) &&
    expression.expression.kind === ts.SyntaxKind.ThisKeyword
    ? `this.${expression.name.text}`
    : undefined;
};

function receiverKey(expression: ts.Expression): string | undefined {
  const target = unwrapped(expression);
  if (
    ts.isPropertyAccessExpression(target) &&
    target.name.text === CONVENTIONAL_RECEIVER
  ) {
    return MEMBER_RECEIVER;
  }
  return nameKey(target);
}

type Bindings = {
  /** Names the block binds to a NeuroLink instance. */
  readonly neurolink: ReadonlySet<string>;
  /** Names the block declares as anything else. */
  readonly other: ReadonlySet<string>;
};

function collectBindings(source: ts.SourceFile): Bindings {
  const neurolink = new Set<string>();
  const other = new Set<string>();
  const bind = (key: string, isNeuroLink: boolean): void => {
    (isNeuroLink ? neurolink : other).add(key);
  };
  const bindName = (name: ts.BindingName, isNeuroLink: boolean): void => {
    if (ts.isIdentifier(name)) {
      bind(name.text, isNeuroLink);
      return;
    }
    for (const element of name.elements) {
      if (ts.isBindingElement(element)) {
        bindName(element.name, false);
      }
    }
  };
  const visit = (node: ts.Node): void => {
    if (ts.isVariableDeclaration(node)) {
      bindName(
        node.name,
        isNeuroLinkType(node.type) ||
          (node.initializer !== undefined &&
            isNeuroLinkValue(node.initializer)),
      );
    } else if (ts.isParameter(node)) {
      const isNeuroLink = isNeuroLinkType(node.type);
      bindName(node.name, isNeuroLink);
      if (
        ts.isIdentifier(node.name) &&
        (ts.getCombinedModifierFlags(node) &
          ts.ModifierFlags.ParameterPropertyModifier) !==
          0
      ) {
        bind(`this.${node.name.text}`, isNeuroLink);
      }
    } else if (ts.isPropertyDeclaration(node) && ts.isIdentifier(node.name)) {
      bind(
        `this.${node.name.text}`,
        isNeuroLinkType(node.type) ||
          (node.initializer !== undefined &&
            isNeuroLinkValue(node.initializer)),
      );
    } else if (
      (ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node)) &&
      node.name !== undefined
    ) {
      bind(node.name.text, false);
    } else if (
      ts.isImportSpecifier(node) ||
      ts.isNamespaceImport(node) ||
      (ts.isImportClause(node) && node.name !== undefined)
    ) {
      if (node.name !== undefined) {
        bind(node.name.text, false);
      }
    } else if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
      isNeuroLinkValue(node.right)
    ) {
      const key = nameKey(node.left);
      if (key !== undefined) {
        neurolink.add(key);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return { neurolink, other };
}

function scanMarkdown(
  file: string,
  markdown: string,
  methods: ReadonlySet<string>,
): { fences: number; calls: DocCall[]; planned: PlannedBlock[] } {
  const blocks = extractFences(markdown).flatMap((fence) => {
    const kind = SCANNED_FENCES.get(fence.language);
    if (kind === undefined) {
      return [];
    }
    const source = ts.createSourceFile(
      "snippet",
      fence.code,
      ts.ScriptTarget.Latest,
      false,
      kind,
    );
    return [{ fence, source, bindings: collectBindings(source) }];
  });
  // A page usually builds its client once and the later blocks use it, so a
  // name bound to NeuroLink in any block is a receiver in every block that
  // does not declare that name as something else.
  const promoted = new Set<string>(
    blocks.flatMap(({ bindings }) => [...bindings.neurolink]),
  );
  const calls: DocCall[] = [];
  const planned: PlannedBlock[] = [];
  for (const { fence, source, bindings } of blocks) {
    const isPlanned = fence.meta.includes(PLANNED_MARKER);
    const isReceiver = (key: string): boolean =>
      key === CONVENTIONAL_RECEIVER ||
      key === MEMBER_RECEIVER ||
      bindings.neurolink.has(key) ||
      (promoted.has(key) && !bindings.other.has(key));
    const found: DocCall[] = [];
    const visit = (node: ts.Node): void => {
      if (
        ts.isCallExpression(node) &&
        ts.isPropertyAccessExpression(node.expression)
      ) {
        const key = receiverKey(node.expression.expression);
        if (key !== undefined && isReceiver(key)) {
          found.push({
            file,
            line:
              fence.firstLine +
              source.getLineAndCharacterOfPosition(
                node.expression.name.getStart(source),
              ).line,
            receiver: unwrapped(node.expression.expression).getText(source),
            method: node.expression.name.text,
            planned: isPlanned,
          });
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
    calls.push(...found);
    if (isPlanned) {
      planned.push({
        file,
        line: fence.firstLine,
        calls: found.length,
        missing: found.filter((call) => !methods.has(call.method)).length,
      });
    }
  }
  return { fences: blocks.length, calls, planned };
}

function scanDocs(root: string, methods: ReadonlySet<string>): DocScan {
  const files = listDocFiles(root);
  const calls: DocCall[] = [];
  const planned: PlannedBlock[] = [];
  let fences = 0;
  for (const file of files) {
    const result = scanMarkdown(
      file,
      fs.readFileSync(path.join(root, file), "utf8"),
      methods,
    );
    fences += result.fences;
    calls.push(...result.calls);
    planned.push(...result.planned);
  }
  return { files, fences, calls, planned };
}

const missingCalls = (
  calls: readonly DocCall[],
  methods: ReadonlySet<string>,
): DocCall[] =>
  calls.filter((call) => !call.planned && !methods.has(call.method));

const staleMarkers = (planned: readonly PlannedBlock[]): PlannedBlock[] =>
  planned.filter((block) => block.missing === 0);

const describeCalls = (calls: readonly DocCall[]): string =>
  calls.map((call) => `${call.file}:${call.line}:${call.method}`).join(",");

function reportMissing(missing: readonly DocCall[]): void {
  for (const call of missing) {
    console.error(
      `  MISSING ${call.file}:${call.line}: ${call.receiver}.${call.method}() - NeuroLink has no public method "${call.method}"`,
    );
  }
  console.error(
    `  Replace each call with the method the class really has (events come from neurolink.getEventEmitter()). A snippet for an API that is not released yet can carry the word "${PLANNED_MARKER}" after the language on its opening fence.`,
  );
}

function reportStale(stale: readonly PlannedBlock[]): void {
  for (const block of stale) {
    console.error(
      `  STALE   ${block.file}:${block.line}: the block is marked "${PLANNED_MARKER}" and calls ${block.calls} method(s) on a NeuroLink receiver, none of them missing`,
    );
  }
}

const fenceOf = (language: string, code: string): string =>
  `\`\`\`${language}\n${code}\n\`\`\`\n`;

const requireShipped = (): Shipped =>
  state.shippedReady && state.shipped !== undefined
    ? state.shipped
    : fail(FAIL.stateMissing);

const requireScan = (): DocScan =>
  state.docsReady && state.scan !== undefined
    ? state.scan
    : fail(FAIL.stateMissing);

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

  await test("precondition: the shipped class has public methods", async () => {
    const entry = TYPES_OVERRIDE ?? shippedTypesEntry();
    if (entry === undefined || !fs.existsSync(entry)) {
      fail(FAIL.typesEntryMissing);
    }
    const shipped = await readShipped(entry);
    state.shipped = shipped;
    console.log(
      `    ${shipped.methods.size} public methods and ${shipped.internal.size} non-public prototype members, read from ${displayPath(entry)} and dist/index.js`,
    );
    assert(shipped.methods.size > 0, FAIL.classNotResolved);
    assert(shipped.methods.size >= FLOORS.shipped, FAIL.shippedFew);
    assert(
      KNOWN_SHIPPED.every((name) => shipped.methods.has(name)),
      FAIL.shippedLacksKnown,
    );
    assert(shipped.internal.size > 0, FAIL.noInternalMembers);
    state.shippedReady = true;
  });

  await test("precondition: the docs were read and method calls were found", () => {
    const { methods } = requireShipped();
    const result = scanDocs(DOCS_ROOT, methods);
    state.scan = result;
    console.log(
      `    read ${result.files.length} files, ${result.fences} ts/js fenced blocks, ${result.calls.length} method calls on a NeuroLink receiver, ${result.planned.length} blocks marked ${PLANNED_MARKER}`,
    );
    assert(result.files.length >= FLOORS.files, FAIL.docsFewFiles);
    assert(result.files.includes("README.md"), FAIL.docsNoReadme);
    assert(result.fences >= FLOORS.fences, FAIL.docsFewFences);
    assert(result.calls.length >= FLOORS.calls, FAIL.docsFewCalls);
    state.docsReady = true;
  });

  await test("control: a call to a method the class does not have is flagged", () => {
    const { methods } = requireShipped();
    if (methods.has(PROBE_METHOD)) {
      fail(FAIL.controlProbeShipped);
    }
    const { calls } = scanMarkdown(
      "control.md",
      fenceOf(
        "typescript",
        `const neurolink = new NeuroLink();\nawait neurolink.generate({ input: { text: "hi" } });\nneurolink.${PROBE_METHOD}();`,
      ),
      methods,
    );
    const missing = missingCalls(calls, methods);
    assert(
      calls.length === 2 &&
        missing.length === 1 &&
        missing[0].file === "control.md" &&
        missing[0].method === PROBE_METHOD &&
        missing[0].line === 4,
      FAIL.controlFlag,
    );
  });

  await test("control: calls to shipped methods are not flagged", () => {
    const { methods } = requireShipped();
    const every = [...methods]
      .sort(compareCodepoints)
      .map((name) => `neurolink.${name}();`)
      .join("\n");
    const { calls } = scanMarkdown("control.md", fenceOf("ts", every), methods);
    assert(
      calls.length === methods.size &&
        missingCalls(calls, methods).length === 0,
      FAIL.controlClean,
    );
  });

  await test("control: a call to a non-public prototype member is flagged", () => {
    const { methods, internal } = requireShipped();
    const [probe] = [...internal].sort(compareCodepoints);
    const { calls } = scanMarkdown(
      "control.md",
      fenceOf("ts", `neurolink.${probe}();`),
      methods,
    );
    const missing = missingCalls(calls, methods);
    assert(
      missing.length === 1 && missing[0].method === probe,
      FAIL.controlPrivate,
    );
  });

  await test("control: the scanner reads only calls on a NeuroLink receiver in ts/js blocks", () => {
    const { methods } = requireShipped();
    const document = [
      "Prose before the first block. neurolink.proseProbe() is not code.",
      fenceOf(
        "ts",
        [
          "const nl = new NeuroLink();",
          "const awaited = await new sdk.NeuroLink({ credentials: {} });",
          "const other = makeClient();",
          "nl.aliasProbe();",
          "awaited.awaitedProbe();",
          "other.otherProbe();",
          "neurolink.tools.nestedProbe();",
          "neurolink.chainProbe().then(() => 1);",
          "neurolink?.optionalProbe?.();",
          "const reference = neurolink.referenceProbe;",
          "// neurolink.commentProbe();",
          'const text = "neurolink.stringProbe()";',
        ].join("\n"),
      ),
      fenceOf("bash", "neurolink.bashProbe()"),
      fenceOf("", "neurolink.untaggedProbe()"),
      fenceOf("json", '{ "jsonProbe": 1 }'),
      fenceOf(
        "tsx",
        "const el = <Widget onDone={() => neurolink.tsxProbe()} />;",
      ),
      fenceOf("jsx", "neurolink.jsxProbe();"),
      fenceOf("js", "neurolink.jsProbe();"),
    ].join("\n");
    const { fences, calls } = scanMarkdown("control.md", document, methods);
    const observed = {
      fences,
      calls: calls.map(
        (call) => `${call.receiver}.${call.method}@${call.line}`,
      ),
    };
    const expected = {
      fences: 4,
      calls: [
        "nl.aliasProbe@6",
        "awaited.awaitedProbe@7",
        "neurolink.chainProbe@10",
        "neurolink.optionalProbe@11",
        "neurolink.tsxProbe@30",
        "neurolink.jsxProbe@34",
        "neurolink.jsProbe@38",
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

  await test("control: the scanner follows fields, typed names and assignments, and scopes a name to the blocks that do not redeclare it", () => {
    const { methods } = requireShipped();
    const document = [
      fenceOf("ts", "const nl = new NeuroLink();\nnl.declaredProbe();"),
      fenceOf("ts", "nl.laterBlockProbe();"),
      fenceOf("ts", "const nl = makeOther();\nnl.redeclaredProbe();"),
      fenceOf("ts", "function run(nl) {\n  nl.parameterProbe();\n}"),
      fenceOf(
        "ts",
        [
          "class Service {",
          "  private ai: NeuroLink;",
          "  private maybe: NeuroLink | null = null;",
          "  private plain: Plain;",
          "  constructor(private readonly client: NeuroLink, private held: Plain) {",
          "    this.ai = new NeuroLink();",
          "  }",
          "  run(sdk: NeuroLink) {",
          "    this.ai.fieldProbe();",
          "    this.client.parameterPropertyProbe();",
          "    this.maybe?.unionProbe();",
          "    this.plain.plainFieldProbe();",
          "    this.held.heldFieldProbe();",
          "    this.neurolink.memberProbe();",
          "    this.unbound.unboundFieldProbe();",
          "    sdk.typedParameterProbe();",
          "    (this.ai as NeuroLink).castProbe();",
          "  }",
          "}",
        ].join("\n"),
      ),
      fenceOf(
        "ts",
        [
          "let handle;",
          "handle = new NeuroLink();",
          "handle.assignedProbe();",
          "const typed: NeuroLink = makeClient();",
          "typed.typedVariableProbe();",
          "app.neurolink.appMemberProbe();",
          "const { generate } = neurolink;",
          "generate();",
          'neurolink["elementProbe"]();',
        ].join("\n"),
      ),
    ].join("\n");
    const { calls } = scanMarkdown("control.md", document, methods);
    const observed = calls.map((call) => `${call.receiver}.${call.method}`);
    const expected = [
      "nl.declaredProbe",
      "nl.laterBlockProbe",
      "this.ai.fieldProbe",
      "this.client.parameterPropertyProbe",
      "this.maybe.unionProbe",
      "this.neurolink.memberProbe",
      "sdk.typedParameterProbe",
      "this.ai.castProbe",
      "handle.assignedProbe",
      "typed.typedVariableProbe",
      "app.neurolink.appMemberProbe",
    ];
    if (JSON.stringify(observed) !== JSON.stringify(expected)) {
      console.error(`  expected ${JSON.stringify(expected)}`);
      console.error(`  observed ${JSON.stringify(observed)}`);
    }
    assert(
      JSON.stringify(observed) === JSON.stringify(expected),
      FAIL.controlReceivers,
    );
  });

  await test("control: the planned marker suppresses missing calls and is reported when stale", () => {
    const { methods } = requireShipped();
    const document = [
      fenceOf("ts planned", `neurolink.${PROBE_METHOD}();`),
      fenceOf("typescript title=x planned", "neurolink.generate();"),
      fenceOf("ts", `neurolink.${PROBE_METHOD}();`),
      fenceOf("ts", "neurolink.generate(); // planned"),
    ].join("\n");
    const { calls, planned } = scanMarkdown("control.md", document, methods);
    const observed = {
      missing: describeCalls(missingCalls(calls, methods)),
      stale: staleMarkers(planned).map(
        (block) => `${block.file}:${block.line}`,
      ),
      planned: planned.length,
    };
    const expected = {
      missing: `control.md:10:${PROBE_METHOD}`,
      stale: ["control.md:6"],
      planned: 2,
    };
    if (JSON.stringify(observed) !== JSON.stringify(expected)) {
      console.error(`  expected ${JSON.stringify(expected)}`);
      console.error(`  observed ${JSON.stringify(observed)}`);
    }
    assert(
      JSON.stringify(observed) === JSON.stringify(expected),
      FAIL.controlPlanned,
    );
    state.controlsReady = true;
  });

  await test("every documented call names a method the shipped class has", () => {
    const { methods } = requireShipped();
    const result = requireScan();
    if (!state.controlsReady) {
      fail(FAIL.stateMissing);
    }
    const missing = missingCalls(result.calls, methods);
    const plannedCalls = result.calls.filter((call) => call.planned).length;
    console.log(
      `    ${result.calls.length} calls checked: ${missing.length} name a missing method, ${plannedCalls} sit in blocks marked ${PLANNED_MARKER}`,
    );
    if (missing.length > 0) {
      reportMissing(missing);
      fail(FAIL.missingMethods);
    }
  });

  await test("no block is marked planned without a missing call", () => {
    const result = requireScan();
    if (!state.controlsReady) {
      fail(FAIL.stateMissing);
    }
    const stale = staleMarkers(result.planned);
    if (stale.length > 0) {
      reportStale(stale);
      fail(FAIL.staleMarkers);
    }
  });
});
