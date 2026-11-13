#!/usr/bin/env tsx
/**
 * Continuous Test Suite: provider tool sites
 *
 * Every place in `src/lib` that builds a provider or a NeuroLink instance, and
 * every `generate()` / `stream()` called on one built there, decides what
 * tools that model call is offered and whether NeuroLink's HITL confirmation
 * applies to them.
 * A provider built with the NeuroLink instance has its tools confirmed by the
 * instance's rule; one built without it, or for a text-only role, must be
 * given no tools.
 *
 * This suite reads the TypeScript source (no build, no network, no `.env`)
 * and fails unless each such site is listed in
 * `test/fixtures/provider-tool-sites.json` with one reason from a closed set:
 *
 *   passes-instance      built with the NeuroLink instance (`this` or a
 *                        NeuroLink value), or a call on a NeuroLink instance
 *                        the caller supplied, so its tools are confirmed
 *   disableTools         the call passes `disableTools: true` (for a build:
 *                        every model call on it does)
 *   tools-off-by-config  the call's tools follow the caller's own options
 *                        (`...options`, or the fields forwarded from them),
 *                        on a provider or instance whose tools are confirmed
 *                        by the instance's rule
 *   embedding-only       the provider is used for `embed()` only
 *   no-tool-loop         the provider's model handle is used without a tool set
 *   unreachable          nothing in the package reaches the site
 *   caller-built         a public factory that hands the caller a raw
 *                        provider; the caller owns its tools
 *
 * An entry is anchored by file, the enclosing function and a fragment of the
 * call's text, not a line number. When several calls in one function share
 * that text, `occurrence` (1-based, in source order) picks one. Two reasons
 * are re-checked against the source: a `disableTools` call must still pass
 * `disableTools: true`, and a `passes-instance` provider build must still
 * pass `this` or a NeuroLink value. An entry that no longer matches any site
 * fails too, so the list cannot rot. The other reasons, a `disableTools`
 * build, and a `passes-instance` NeuroLink instance (a worker shares the
 * host's registry through its config) are stated, not re-checked.
 *
 * A NeuroLink instance built inside the library (`new NeuroLink(...)`,
 * including a class bound from a dynamic import such as
 * `const { NeuroLink: Y } = await import("../neurolink.js")`) is a build too,
 * and a `generate()` / `stream()` on the name it is assigned to, on a
 * variable or field declared with the NeuroLink class as its type, or on a
 * local copied from either, is a call.
 *
 * What the scan does not follow, so a manual entry or a behavioural test
 * covers it instead:
 *   - a provider or NeuroLink instance passed into a function as a parameter
 *     and used there (the reranker's and the PPT planner's model);
 *   - one returned from another module and used by the caller;
 *   - a builder bound under another name (`const make = X.createProvider`).
 *
 * Run: pnpm run test:provider-tool-sites
 */
// First: points DOTENV_CONFIG_PATH at /dev/null before the harness loads
// dotenv, so no `.env` file is read.
import "./helpers/credentialFreeEnv.js";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { assert, defineSuite } from "./helpers/harness.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "src", "lib");
const ALLOWLIST = path.join(
  ROOT,
  "test",
  "fixtures",
  "provider-tool-sites.json",
);

const { test, runSuite } = defineSuite("Provider tool sites", {
  offline: true,
});

const REASONS = new Set([
  "passes-instance",
  "disableTools",
  "tools-off-by-config",
  "embedding-only",
  "no-tool-loop",
  "unreachable",
  "caller-built",
]);

const BUILDERS = new Set([
  "createProvider",
  "createAIProvider",
  "createBestProvider",
  "createProviderWithFallback",
]);

type Kind = "build" | "generate" | "stream";

type Site = {
  file: string;
  line: number;
  kind: Kind;
  /** Enclosing function, method or variable name ("<module>" at top level). */
  symbol: string;
  /** The call's text with whitespace collapsed. */
  text: string;
  /** The call's arguments, for the re-checked reasons. */
  call: ts.CallExpression | ts.NewExpression;
  sourceFile: ts.SourceFile;
};

type Entry = {
  file: string;
  symbol: string;
  kind: Kind;
  /** A fragment of the call's whitespace-collapsed text that picks it out. */
  match: string;
  /** Which of several calls with the same anchor (1-based, source order). */
  occurrence?: number;
  reason: string;
  note: string;
};

const collapse = (text: string): string => text.replace(/\s+/g, " ").trim();

/**
 * The form anchors are compared in: whitespace collapsed, none next to
 * brackets or commas, and no trailing comma, so a call reformatted across
 * lines or onto one line matches the same entry.
 */
const normalize = (text: string): string =>
  collapse(text)
    .replace(/\s*([(){}[\],])\s*/g, "$1")
    .replace(/,([)}\]])/g, "$1");

const listSources = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return listSources(full);
    }
    return entry.name.endsWith(".ts") && !entry.name.endsWith(".d.ts")
      ? [full]
      : [];
  });

/** The name of the nearest enclosing function, method or variable. */
const enclosingSymbol = (node: ts.Node): string => {
  for (let current = node.parent; current; current = current.parent) {
    if (
      (ts.isFunctionDeclaration(current) ||
        ts.isMethodDeclaration(current) ||
        ts.isGetAccessorDeclaration(current) ||
        ts.isSetAccessorDeclaration(current)) &&
      current.name
    ) {
      return current.name.getText();
    }
    if (ts.isConstructorDeclaration(current)) {
      return "constructor";
    }
    if (
      (ts.isArrowFunction(current) || ts.isFunctionExpression(current)) &&
      current.parent &&
      ts.isVariableDeclaration(current.parent) &&
      ts.isIdentifier(current.parent.name)
    ) {
      return current.parent.name.text;
    }
    if (
      ts.isPropertyAssignment(current) &&
      (ts.isArrowFunction(current.initializer) ||
        ts.isFunctionExpression(current.initializer))
    ) {
      return current.name.getText();
    }
  }
  return "<module>";
};

/**
 * Names that refer to the NeuroLink class in `sourceFile`: an import of
 * `NeuroLink` (renamed or not), a binding destructured from a dynamic
 * import of the neurolink module, and the class itself where it is
 * declared.
 */
const neuroLinkClassNames = (sourceFile: ts.SourceFile): Set<string> => {
  const names = new Set<string>();
  const fromNeuroLinkModule = (specifier: string): boolean =>
    /(^|\/)neurolink(\.js)?$/.test(specifier);
  const visit = (node: ts.Node): void => {
    if (ts.isClassDeclaration(node) && node.name?.text === "NeuroLink") {
      names.add("NeuroLink");
    }
    if (
      ts.isImportDeclaration(node) &&
      ts.isStringLiteral(node.moduleSpecifier) &&
      fromNeuroLinkModule(node.moduleSpecifier.text) &&
      node.importClause?.namedBindings &&
      ts.isNamedImports(node.importClause.namedBindings)
    ) {
      for (const element of node.importClause.namedBindings.elements) {
        if ((element.propertyName ?? element.name).text === "NeuroLink") {
          names.add(element.name.text);
        }
      }
    }
    if (
      ts.isVariableDeclaration(node) &&
      ts.isObjectBindingPattern(node.name) &&
      node.initializer
    ) {
      const value = unwrap(node.initializer);
      if (
        ts.isCallExpression(value) &&
        value.expression.kind === ts.SyntaxKind.ImportKeyword &&
        value.arguments[0] &&
        ts.isStringLiteral(value.arguments[0]) &&
        fromNeuroLinkModule(value.arguments[0].text)
      ) {
        for (const element of node.name.elements) {
          const imported = element.propertyName ?? element.name;
          if (
            ts.isIdentifier(imported) &&
            imported.text === "NeuroLink" &&
            ts.isIdentifier(element.name)
          ) {
            names.add(element.name.text);
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return names;
};

/**
 * Receivers whose `createProvider` builds something other than a model
 * provider (an auth provider), so no model call can follow.
 */
const NON_MODEL_FACTORIES = new Set(["AuthProviderFactory"]);

/** The builder name when `call` builds a provider, else undefined. */
const builderOf = (call: ts.CallExpression): string | undefined => {
  const callee = call.expression;
  if (
    ts.isPropertyAccessExpression(callee) &&
    ts.isIdentifier(callee.expression) &&
    NON_MODEL_FACTORIES.has(callee.expression.text)
  ) {
    return undefined;
  }
  const name = ts.isPropertyAccessExpression(callee)
    ? callee.name.text
    : ts.isIdentifier(callee)
      ? callee.text
      : undefined;
  return name && BUILDERS.has(name) ? name : undefined;
};

/** Strips `await`, parentheses, `as` casts and a `withTimeout(…)` wrapper. */
const unwrap = (expression: ts.Expression): ts.Expression => {
  let current = expression;
  for (;;) {
    if (
      ts.isAwaitExpression(current) ||
      ts.isParenthesizedExpression(current) ||
      ts.isAsExpression(current) ||
      ts.isNonNullExpression(current)
    ) {
      current = current.expression;
      continue;
    }
    if (
      ts.isCallExpression(current) &&
      ts.isIdentifier(current.expression) &&
      current.expression.text === "withTimeout" &&
      current.arguments[0]
    ) {
      current = current.arguments[0];
      continue;
    }
    return current;
  }
};

/**
 * The variable or `this.` field a build is assigned to, if any: by a variable
 * declaration, an assignment or a class field initializer.
 */
const assignedName = (
  build: ts.CallExpression | ts.NewExpression,
): string | undefined => {
  let node: ts.Node = build;
  while (
    node.parent &&
    (ts.isAwaitExpression(node.parent) ||
      ts.isParenthesizedExpression(node.parent) ||
      ts.isAsExpression(node.parent) ||
      (ts.isCallExpression(node.parent) &&
        ts.isIdentifier(node.parent.expression) &&
        node.parent.expression.text === "withTimeout"))
  ) {
    node = node.parent;
  }
  const parent = node.parent;
  if (
    parent &&
    ts.isVariableDeclaration(parent) &&
    ts.isIdentifier(parent.name) &&
    parent.initializer &&
    unwrap(parent.initializer) === build
  ) {
    return parent.name.text;
  }
  if (
    parent &&
    ts.isBinaryExpression(parent) &&
    parent.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
    unwrap(parent.right) === build
  ) {
    return collapse(parent.left.getText());
  }
  if (
    parent &&
    ts.isPropertyDeclaration(parent) &&
    ts.isIdentifier(parent.name) &&
    parent.initializer &&
    unwrap(parent.initializer) === build
  ) {
    return `this.${parent.name.text}`;
  }
  return undefined;
};

/** `src/lib`'s sources, each with its path from the repo root. */
const readSources = (): Array<{ relative: string; text: string }> =>
  listSources(SRC).map((file) => ({
    relative: path.relative(ROOT, file).split(path.sep).join("/"),
    text: fs.readFileSync(file, "utf8"),
  }));

/**
 * Every provider build in `sources` (by default `src/lib`), and every
 * generate()/stream() on a built provider.
 */
const scan = (sources = readSources()): Site[] => {
  const sites: Site[] = [];
  for (const { relative, text } of sources) {
    const sourceFile = ts.createSourceFile(
      relative,
      text,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );
    const built = new Set<string>();
    const calls: ts.CallExpression[] = [];
    const instances: ts.NewExpression[] = [];
    const classNames = neuroLinkClassNames(sourceFile);
    const visit = (node: ts.Node): void => {
      if (ts.isCallExpression(node)) {
        calls.push(node);
        if (builderOf(node)) {
          const name = assignedName(node);
          if (name) {
            built.add(name);
          }
        }
      }
      if (
        ts.isNewExpression(node) &&
        ts.isIdentifier(node.expression) &&
        classNames.has(node.expression.text)
      ) {
        instances.push(node);
        const name = assignedName(node);
        if (name) {
          built.add(name);
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);
    // A variable or field declared with the NeuroLink class as its type
    // (`let cached: NeuroLink | null`) holds an instance however it is filled.
    // Before the aliases below, so a local copied from such a field counts.
    const typed = (node: ts.Node): void => {
      if (
        (ts.isVariableDeclaration(node) || ts.isPropertyDeclaration(node)) &&
        node.type &&
        ts.isIdentifier(node.name)
      ) {
        const referencesClass = (type: ts.Node): boolean =>
          (ts.isTypeReferenceNode(type) &&
            ts.isIdentifier(type.typeName) &&
            classNames.has(type.typeName.text)) ||
          (ts.isUnionTypeNode(type) && type.types.some(referencesClass));
        if (referencesClass(node.type)) {
          built.add(
            ts.isPropertyDeclaration(node)
              ? `this.${node.name.text}`
              : node.name.text,
          );
        }
      }
      ts.forEachChild(node, typed);
    };
    typed(sourceFile);
    // A local copied from a built field (`const provider = this.provider`,
    // `this.a ?? this.b`) is a built provider too.
    const aliases = (node: ts.Node): void => {
      if (
        ts.isVariableDeclaration(node) &&
        ts.isIdentifier(node.name) &&
        node.initializer
      ) {
        const sources: ts.Expression[] = [];
        const collect = (expression: ts.Expression): void => {
          const value = unwrap(expression);
          if (
            ts.isBinaryExpression(value) &&
            (value.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken ||
              value.operatorToken.kind === ts.SyntaxKind.BarBarToken)
          ) {
            collect(value.left);
            collect(value.right);
            return;
          }
          sources.push(value);
        };
        collect(node.initializer);
        if (sources.some((source) => built.has(collapse(source.getText())))) {
          built.add(node.name.text);
        }
      }
      ts.forEachChild(node, aliases);
    };
    aliases(sourceFile);
    for (const instance of instances) {
      sites.push({
        file: relative,
        line:
          sourceFile.getLineAndCharacterOfPosition(instance.getStart()).line +
          1,
        kind: "build",
        symbol: enclosingSymbol(instance),
        text: collapse(instance.getText()),
        call: instance,
        sourceFile,
      });
    }
    for (const call of calls) {
      const line =
        sourceFile.getLineAndCharacterOfPosition(call.getStart()).line + 1;
      const record = (kind: Kind): void => {
        sites.push({
          file: relative,
          line,
          kind,
          symbol: enclosingSymbol(call),
          text: collapse(call.getText()),
          call,
          sourceFile,
        });
      };
      if (builderOf(call)) {
        record("build");
        continue;
      }
      const callee = call.expression;
      if (
        ts.isPropertyAccessExpression(callee) &&
        (callee.name.text === "generate" || callee.name.text === "stream") &&
        built.has(collapse(callee.expression.getText()))
      ) {
        record(callee.name.text);
      }
    }
  }
  return sites;
};

const loadAllowlist = (): Entry[] => {
  const parsed = JSON.parse(fs.readFileSync(ALLOWLIST, "utf8")) as {
    sites?: unknown;
  };
  assert(Array.isArray(parsed.sites), "the allowlist has no `sites` array");
  return parsed.sites as Entry[];
};

const sameAnchor = (entry: Entry, site: Site): boolean =>
  entry.file === site.file &&
  entry.kind === site.kind &&
  entry.symbol === site.symbol &&
  normalize(site.text).includes(normalize(entry.match));

/** The site an entry names: its anchor, then its occurrence among those. */
const matches = (entry: Entry, site: Site): boolean => {
  if (!sameAnchor(entry, site)) {
    return false;
  }
  const candidates = sites.filter((other) => sameAnchor(entry, other));
  return candidates.indexOf(site) === (entry.occurrence ?? 1) - 1;
};

const propertyName = (property: ts.ObjectLiteralElementLike): string | null =>
  property.name === undefined || ts.isComputedPropertyName(property.name)
    ? null
    : property.name.getText().replace(/^["']|["']$/g, "");

/**
 * Whether an object-literal argument of the call ends with `disableTools: true`:
 * the last `disableTools` property is that, and nothing after it (a spread, a
 * computed key, which could name `disableTools`, or a duplicate) can set it back.
 */
const passesDisableTools = (site: Site): boolean =>
  (site.call.arguments ?? []).some((argument) => {
    if (!ts.isObjectLiteralExpression(argument)) {
      return false;
    }
    const properties = argument.properties;
    const index = properties.reduce(
      (last, property, i) =>
        propertyName(property) === "disableTools" ? i : last,
      -1,
    );
    const last = index >= 0 ? properties[index] : undefined;
    return (
      last !== undefined &&
      ts.isPropertyAssignment(last) &&
      last.initializer.kind === ts.SyntaxKind.TrueKeyword &&
      !properties
        .slice(index + 1)
        .some(
          (property) =>
            ts.isSpreadAssignment(property) ||
            (property.name !== undefined &&
              ts.isComputedPropertyName(property.name)),
        )
    );
  });

/** The argument position of the owning NeuroLink instance, per builder. */
const OWNER_ARGUMENT: Readonly<Record<string, number>> = {
  createProvider: 3,
  createBestProvider: 3,
};

/** Whether a build passes `this`, `sdk` or `neurolink` as its owner argument. */
const passesInstance = (site: Site): boolean => {
  if (!ts.isCallExpression(site.call)) {
    return false;
  }
  const builder = builderOf(site.call);
  const position = builder === undefined ? undefined : OWNER_ARGUMENT[builder];
  const argument =
    position === undefined ? undefined : site.call.arguments[position];
  if (argument === undefined) {
    return false;
  }
  const value = unwrap(argument);
  return (
    value.kind === ts.SyntaxKind.ThisKeyword ||
    (ts.isIdentifier(value) &&
      (value.text === "sdk" || value.text === "neurolink"))
  );
};

const describe = (site: Site): string =>
  `${site.file}:${site.line} ${site.kind} in ${site.symbol}: ${site.text.slice(0, 120)}`;

const ADD_HINT = [
  "",
  "Add an entry to test/fixtures/provider-tool-sites.json:",
  '  { "file": "<path>", "symbol": "<enclosing function>", "kind": "build" | "generate" | "stream",',
  '    "match": "<a fragment of the call text>", "reason": "<one reason>", "note": "<why>" }',
  `Reasons: ${[...REASONS].join(", ")}.`,
  "A model call that needs no tools should pass `disableTools: true`; a",
  "provider NeuroLink builds for its own calls should be built with the",
  "instance (`this`), so the instance's HITL rule confirms its tools.",
].join("\n");

/**
 * Fails with `message`, printing it in full first: the summary keeps only a
 * failure's first line, and the sites to fix are on the lines after it.
 */
const failWith = (ok: boolean, message: string): void => {
  if (!ok) {
    console.error(message);
  }
  assert(ok, message);
};

const sites = scan();
const allowlist = loadAllowlist();

await test("the scan finds provider builds and the calls made on them", () => {
  assert(
    sites.filter((s) => s.kind === "build").length >= 40,
    `the scan found only ${sites.filter((s) => s.kind === "build").length} provider builds; the scanner is likely broken`,
  );
  assert(
    sites.some((s) => s.kind === "generate") &&
      sites.some((s) => s.kind === "stream"),
    "the scan found no generate() or stream() on a built provider",
  );
});

await test("a call on a local copied from a field typed as NeuroLink is a call on an instance", () => {
  const planted = scan([
    {
      relative: "src/lib/planted/aliasOfTypedField.ts",
      text: [
        'import type { NeuroLink } from "../neurolink.js";',
        "export class Planted {",
        "  private cached: NeuroLink | null = null;",
        "  async run(): Promise<void> {",
        "    const client = this.cached;",
        "    if (client) {",
        '      await client.generate({ input: { text: "planted" } });',
        "    }",
        "  }",
        "}",
      ].join("\n"),
    },
  ]);
  assert(
    planted.some((site) => site.kind === "generate" && site.symbol === "run"),
    "the scan missed generate() on a local copied from a NeuroLink-typed field",
  );
});

await test("a call on a class field initialised with a NeuroLink build, and given no type, is a call on an instance", () => {
  const planted = scan([
    {
      relative: "src/lib/planted/inferredField.ts",
      text: [
        'import { NeuroLink } from "../neurolink.js";',
        "export class Planted {",
        "  private client = new NeuroLink();",
        "  async run(): Promise<void> {",
        '    await this.client.generate({ input: { text: "planted" } });',
        "  }",
        "}",
      ].join("\n"),
    },
  ]);
  assert(
    planted.some((site) => site.kind === "generate" && site.symbol === "run"),
    "the scan missed generate() on a field whose type is inferred from new NeuroLink()",
  );
});

await test("every allowlist entry states one reason from the closed set", () => {
  const bad = allowlist.filter(
    (entry) =>
      !REASONS.has(entry.reason) ||
      typeof entry.note !== "string" ||
      entry.note.trim() === "" ||
      typeof entry.match !== "string" ||
      entry.match.trim() === "",
  );
  failWith(
    bad.length === 0,
    `entries with an unknown reason, or no match or note:\n${bad
      .map(
        (e) => `  ${e.file} ${e.symbol} ${e.kind} "${e.match}" (${e.reason})`,
      )
      .join("\n")}`,
  );
});

await test("every provider build and every call on a built provider is allowlisted", () => {
  const unlisted = sites.filter(
    (site) => !allowlist.some((entry) => matches(entry, site)),
  );
  failWith(
    unlisted.length === 0,
    `${unlisted.length} provider site(s) are not in the allowlist:\n${unlisted
      .map((s) => `  ${describe(s)}`)
      .join("\n")}${ADD_HINT}`,
  );
});

await test("a site allowlisted for disableTools still passes disableTools: true", () => {
  // A build listed for disableTools names the call that passes it, which is
  // checked as its own generate/stream entry; only calls are re-checked here.
  const regressed = sites.filter((site) =>
    allowlist.some(
      (entry) =>
        entry.reason === "disableTools" &&
        site.kind !== "build" &&
        matches(entry, site) &&
        !passesDisableTools(site),
    ),
  );
  failWith(
    regressed.length === 0,
    `sites listed as "disableTools" no longer pass disableTools: true:\n${regressed
      .map((s) => `  ${describe(s)}`)
      .join("\n")}\nRestore disableTools: true, or change the entry's reason.`,
  );
});

await test("a build allowlisted for passes-instance still passes the instance", () => {
  const regressed = sites.filter((site) =>
    allowlist.some(
      (entry) =>
        entry.reason === "passes-instance" &&
        entry.kind === "build" &&
        ts.isCallExpression(site.call) &&
        matches(entry, site) &&
        !passesInstance(site),
    ),
  );
  failWith(
    regressed.length === 0,
    `builds listed as "passes-instance" no longer pass this, sdk or neurolink:\n${regressed
      .map((s) => `  ${describe(s)}`)
      .join("\n")}\nPass the instance again, or change the entry's reason.`,
  );
});

await test("passesDisableTools rejects a later computed key, a duplicate or a spread", () => {
  const check = (options: string): boolean => {
    const planted = scan([
      {
        relative: "src/lib/planted/disableTools.ts",
        text: [
          'import { AIProviderFactory } from "../core/factory.js";',
          "export async function run(key: string, o: object): Promise<void> {",
          '  const provider = await AIProviderFactory.createProvider("x");',
          `  await provider.generate({ input: { text: "t" }, ${options} });`,
          "}",
        ].join("\n"),
      },
    ]);
    const site = planted.find((s) => s.kind === "generate");
    if (site === undefined) {
      throw new Error("the planted generate() was not scanned");
    }
    return passesDisableTools(site);
  };
  assert(check("disableTools: true"), "a plain disableTools: true must pass");
  assert(
    !check("disableTools: true, [key]: false"),
    "a later computed key passes",
  );
  assert(
    !check("disableTools: true, disableTools: false"),
    "a later duplicate passes",
  );
  assert(!check("disableTools: true, ...o"), "a later spread passes");
  assert(
    check("disableTools: false, disableTools: true"),
    "last-wins true must pass",
  );
});

await test("passesInstance checks the owner argument position, not any argument named sdk", () => {
  const check = (args: string): boolean => {
    const planted = scan([
      {
        relative: "src/lib/planted/owner.ts",
        text: [
          'import { AIProviderFactory } from "../core/factory.js";',
          "export async function run(sdk: unknown, neurolink: unknown): Promise<void> {",
          `  await AIProviderFactory.createProvider(${args});`,
          "}",
        ].join("\n"),
      },
    ]);
    const site = planted.find((s) => s.kind === "build");
    if (site === undefined) {
      throw new Error("the planted build was not scanned");
    }
    return passesInstance(site);
  };
  assert(
    check('"x", undefined, true, sdk'),
    "sdk at the owner position must pass",
  );
  assert(
    check('"x", undefined, true, this as never'),
    "this at the owner position must pass",
  );
  assert(!check('"x", sdk'), "sdk as the model argument passes");
  assert(
    !check('"x", undefined, true, undefined, undefined, neurolink as never'),
    "neurolink as the credentials argument passes",
  );
});

await test("every allowlist entry still matches exactly one site", () => {
  const problems = allowlist
    .map((entry) => ({
      entry,
      count: sites.filter((site) => matches(entry, site)).length,
      anchored: sites.filter((site) => sameAnchor(entry, site)).length,
    }))
    .filter(
      ({ entry, count, anchored }) =>
        count !== 1 || (entry.occurrence === undefined && anchored > 1),
    );
  failWith(
    problems.length === 0,
    `allowlist entries that match no site (stale) or more than one (ambiguous):\n${problems
      .map(
        ({ entry, anchored }) =>
          `  ${entry.file} ${entry.symbol} ${entry.kind} "${entry.match}": ${anchored} site(s) share this anchor`,
      )
      .join(
        "\n",
      )}\nRemove a stale entry, or lengthen "match" (or set "occurrence") until it picks out one call.`,
  );
});

await runSuite();
