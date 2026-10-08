/**
 * Continuous Test Suite - decide catalog schema.
 *
 * Determinism exception to CLAUDE.md rule 15 (listed in the `allow` array of
 * neurolink/e2e-tests-only in eslint.config.js): parseProviderCatalogJson and
 * parseCatalogEntry are build-tool validators that no generate(), stream() or
 * CLI call reaches. Every case needs a fixed input, a real catalog file or one
 * hand-mutated copy of an entry, so a rejection can be pinned to one rule.
 * Everything is imported from src/ and run through tsx; nothing touches dist/.
 *
 * Run: pnpm run test:decide-catalog-schema
 */
import { deepStrictEqual } from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { assert, assertIncludes, defineSuite } from "./helpers/harness.js";
import {
  isDecideCatalogEntry,
  parseCatalogEntry,
  parseProviderCatalogJson,
} from "../src/lib/providers/catalog/schema.js";
import { LAYA_ENTRY } from "./helpers/decideFixtures.js";

const { test, runSuite, section } = defineSuite("decide catalog schema", {
  offline: true,
});

const CATALOG_DIR = fileURLToPath(
  new URL("../src/lib/providers/catalog/", import.meta.url),
);

const catalogFiles = readdirSync(CATALOG_DIR)
  .filter((file) => file.endsWith(".json") && !file.endsWith(".schema.json"))
  .sort()
  .map((file) => ({
    file,
    raw: JSON.parse(readFileSync(join(CATALOG_DIR, file), "utf8")) as Record<
      string,
      unknown
    >,
  }));
const chatFiles = catalogFiles.filter(
  ({ raw }) => raw.inferenceKinds === undefined,
);

function chatRaw(file: string): Record<string, unknown> {
  const found = chatFiles.find((candidate) => candidate.file === file);
  if (!found) {
    throw new Error(`catalog file ${file} is missing`);
  }
  return structuredClone(found.raw);
}

function failureOf(run: () => unknown): string | undefined {
  try {
    run();
    return undefined;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

function expectRejected(
  run: () => unknown,
  needle: string,
  label: string,
): void {
  const message = failureOf(run);
  if (message === undefined) {
    throw new Error(`${label}: was accepted`);
  }
  assertIncludes(
    message,
    needle,
    `${label}: rejected, but not by the expected rule`,
  );
}

async function chatGroundworkSection(): Promise<void> {
  section("chat entries keep parsing exactly as before");

  await test("every shipped chat catalog file parses to itself", () => {
    assert(
      chatFiles.length >= 81,
      "fewer chat catalog files than the 81 shipped at 38ca0557c",
    );
    for (const { file, raw } of chatFiles) {
      deepStrictEqual(
        parseProviderCatalogJson(structuredClone(raw), file),
        raw,
      );
    }
  });

  await test("a chat entry may omit tier, and tier is still the literal 2 when present", () => {
    const withoutTier = chatRaw("a2agent.json");
    delete withoutTier.tier;
    const parsed = parseProviderCatalogJson(withoutTier, "a2agent.json");
    assert(!("tier" in parsed), "parsing invented a tier");
    for (const tier of [3, "2", null]) {
      expectRejected(
        () =>
          parseProviderCatalogJson(
            { ...chatRaw("a2agent.json"), tier },
            "a2agent.json",
          ),
        "tier",
        `tier ${String(tier)}`,
      );
    }
  });

  await test("a chat wire still needs exactly one of baseURL and baseURLTemplate", () => {
    const both = {
      baseURL: "https://api.example.test/v1",
      baseURLTemplate: "https://{region}.example.test/v1",
    };
    for (const wire of [{}, both]) {
      expectRejected(
        () =>
          parseProviderCatalogJson(
            { ...chatRaw("a2agent.json"), wire },
            "a2agent.json",
          ),
        "exactly one of baseURL or baseURLTemplate",
        "chat wire",
      );
    }
  });
}

async function layaFixtureSection(): Promise<void> {
  section("LAYA_ENTRY, the Laya-shaped entry later suites reuse");

  await test("LAYA_ENTRY carries the shipped Laya facts", () => {
    const { decide, decisionLimits, models, wire } = LAYA_ENTRY;
    deepStrictEqual(wire, {});
    deepStrictEqual(Object.keys(models.catalog), [
      "typed-decisions",
      "multilingual",
      "english",
      "auto",
    ]);
    assert(
      decide.order === 2 && decide.baseURLRequired === true,
      "Laya keeps decision order 2 and has no built-in endpoint",
    );
    deepStrictEqual(
      decide.errors.rules.map((rule) => rule.kind),
      [
        "authentication",
        "max_tokens_exceeded",
        "rate_limit",
        "overloaded",
        "server",
      ],
    );
    deepStrictEqual(decisionLimits?.models?.multilingual, {
      maxStateTokens: 768,
      nonAsciiTokensPerChar: 0.6,
    });
  });
}

type Rejection = readonly [readonly (string | number)[], unknown, string];

const WIRE_RULE = "exactly one of baseURL or baseURLTemplate";

// A value of undefined deletes the key, so a row can say "this field is missing".
function setAt(
  root: Record<string, unknown>,
  path: readonly (string | number)[],
  value: unknown,
): void {
  const parent = path
    .slice(0, -1)
    .reduce<unknown>(
      (node, key) => (node as Record<string | number, unknown>)[key],
      root,
    ) as Record<string | number, unknown>;
  const last = path[path.length - 1];
  if (value === undefined) {
    delete parent[last];
  } else {
    parent[last] = value;
  }
}

function entryWith(
  path: readonly (string | number)[],
  value: unknown,
): Record<string, unknown> {
  const entry: Record<string, unknown> = structuredClone(LAYA_ENTRY);
  setAt(entry, path, value);
  return entry;
}

const structureRejections: readonly Rejection[] = [
  [["surprise"], true, "surprise"],
  [["decide", "surprise"], true, "surprise"],
  [["decide", "model", "surprise"], true, "surprise"],
  [["decide", "errors", "surprise"], true, "surprise"],
  [["decide", "errors", "rules", 0, "surprise"], true, "surprise"],
  [["decisionLimits", "surprise"], true, "surprise"],
  [["decisionLimits", "media"], {}, "media"],
  [["capabilities"], {}, "capabilities"],
  [["quirks"], {}, "quirks"],
  [["errorRules"], [], "errorRules"],
  [["autoSelectPriority"], 1, "autoSelectPriority"],
  [["models", "fallbacks"], ["auto"], "fallbacks"],
  [["models", "defaultContextWindow"], 1, "defaultContextWindow"],
  [["models", "defaultMaxOutputTokens"], 1, "defaultMaxOutputTokens"],
  [["models", "visionModel"], "auto", "visionModel"],
  [["timeouts", "generateMs"], 1, "generateMs"],
  [["timeouts", "streamMs"], 1, "streamMs"],
  [["decide"], undefined, "decide"],
  [["tier"], 1, "tier"],
  [["decide", "baseURLRequired"], undefined, WIRE_RULE],
  [["decide", "baseURLRequired"], false, WIRE_RULE],
  [["wire", "baseURL"], "https://laya.example.test", "baseURLRequired"],
  [["wire", "baseURLTemplate"], "https://{r}.example.test", "baseURLRequired"],
  [["decide", "order"], 0, "order"],
  [["decide", "order"], -3, "order"],
  [["decide", "order"], 1.5, "order"],
  [["decide", "order"], "2", "order"],
  [["decide", "order"], null, "order"],
  [["decide", "dialect"], "other", "dialect"],
  [["decide", "model", "placement"], "sideways", "placement"],
  [["decide", "baseURLNormalize"], ["lowercase"], "baseURLNormalize"],
  // The decide wire drops only the "exactly one URL" rule; the rest still run.
  [
    ["wire", "missingCredentialMessage"],
    "Set the region first",
    "wire.missingCredentialMessage is only valid with baseURLTemplate",
  ],
  [
    ["wire", "extraCredentials"],
    ["not an identifier"],
    "wire.extraCredentials entry must be a valid identifier",
  ],
];

async function decideEntrySection(): Promise<void> {
  section("decide entries: structure and the parse boundary");

  await test("LAYA_ENTRY parses to itself and is recognised as a decide entry", () => {
    const parsed = parseCatalogEntry(structuredClone(LAYA_ENTRY), "laya.json");
    deepStrictEqual(parsed, LAYA_ENTRY);
    assert(isDecideCatalogEntry(parsed), "a decide entry was not recognised");
  });

  await test("chat files route to the chat schema and parse unchanged", () => {
    for (const { file, raw } of chatFiles) {
      const parsed = parseCatalogEntry(structuredClone(raw), file);
      deepStrictEqual(parsed, raw);
      assert(
        !isDecideCatalogEntry(parsed),
        `${file} was routed to the decide schema`,
      );
    }
  });

  await test("parseProviderCatalogJson refuses a decide file and points at parseCatalogEntry", () => {
    expectRejected(
      () => parseProviderCatalogJson(structuredClone(LAYA_ENTRY), "laya.json"),
      "parseCatalogEntry",
      "decide file through the chat parser",
    );
  });

  await test("a chat file carrying a decide-only block is rejected", () => {
    const withDecide = {
      ...chatRaw("a2agent.json"),
      decide: structuredClone(LAYA_ENTRY.decide),
    };
    expectRejected(
      () => parseCatalogEntry(withDecide, "a2agent.json"),
      "decide",
      "decide block on a chat file",
    );
    const withLimits = {
      ...chatRaw("a2agent.json"),
      decisionLimits: { maxStateTokens: 320 },
    };
    expectRejected(
      () => parseCatalogEntry(withLimits, "a2agent.json"),
      "decisionLimits",
      "decisionLimits on a chat file",
    );
  });

  await test('inferenceKinds must be exactly ["decide"] when present', () => {
    for (const value of [["chat"], [], ["decide", "chat"], "decide", null]) {
      expectRejected(
        () => parseCatalogEntry(entryWith(["inferenceKinds"], value)),
        "inferenceKinds",
        `inferenceKinds ${JSON.stringify(value)}`,
      );
    }
  });

  await test("tier may be absent or the literal 2 on a decide entry", () => {
    parseCatalogEntry(entryWith(["tier"], 2));
    parseCatalogEntry(entryWith(["tier"], undefined));
  });

  await test("a decide entry may use a fixed baseURL when it does not require one", () => {
    const entry = entryWith(["decide", "baseURLRequired"], false);
    setAt(entry, ["wire", "baseURL"], "https://laya.example.test");
    deepStrictEqual(parseCatalogEntry(entry, "laya.json"), entry);
  });

  await test("unknown keys, chat-only blocks, wire and order mistakes are each rejected by their own rule", () => {
    for (const [path, value, needle] of structureRejections) {
      expectRejected(
        () => parseCatalogEntry(entryWith(path, value), "laya.json"),
        needle,
        `${path.join(".")} = ${JSON.stringify(value)}`,
      );
    }
  });
}

const ONE_OF = "exactly one of status or statusMin";

const valueRejections: readonly Rejection[] = [
  [["decide", "errors", "rules", 0, "kind"], undefined, "kind"],
  [["decide", "errors", "rules", 0, "kind"], "teapot", "kind"],
  [["decide", "errors", "rules", 0, "status"], "401", "status"],
  [["decide", "errors", "rules", 0, "status"], 99, "status"],
  [["decide", "errors", "rules", 0, "status"], 600, "status"],
  [["decide", "errors", "rules", 0, "status"], 401.5, "status"],
  [["decide", "errors", "rules", 0, "status"], [], "status"],
  [["decide", "errors", "rules", 0, "retryable"], "no", "retryable"],
  [["decide", "errors", "default"], undefined, "default"],
  [["decide", "errors", "rules"], undefined, "rules"],
  [["decide", "errors", "bodyShapes"], undefined, "bodyShapes"],
  [["decide", "errors", "bodyShapes", 1, "formatter"], "nope", "formatter"],
  [["decide", "errors", "bodyShapes", 1, "isArray"], "yes", "isArray"],
  [["decide", "errors", "bodyShapes", 0, "path"], undefined, "path"],
  [["timeouts", "decideMs"], 0, "decideMs"],
  [["timeouts", "decideMs"], "5000", "decideMs"],
  [["decisionLimits", "maxStateTokens"], 0, "maxStateTokens"],
  [["decisionLimits", "nonAsciiTokensPerChar"], 0, "nonAsciiTokensPerChar"],
  [
    ["decisionLimits", "models", "auto", "maxStateTokens"],
    -1,
    "maxStateTokens",
  ],
];

const hostilePaths = [
  "",
  "a..b",
  ".a",
  "a.",
  "a b",
  "__proto__.x",
  "a.constructor",
  "prototype",
];
const hostileHeaders = ["", "x id", "x-id\r\nSet-Cookie: a=b", "x:id"];
const hostileEndpoints = [
  "",
  "   ",
  "{baseURL}/{route}",
  "{baseURL/predict",
  "{baseURL}}/x",
];

const hostileRejections: readonly Rejection[] = [
  ...hostilePaths.flatMap((path): Rejection[] => [
    [["decide", "response", "modelPaths", 0], path, "dot-separated"],
    [["decide", "errors", "bodyShapes", 0, "path"], path, "dot-separated"],
  ]),
  ...hostileHeaders.map(
    (header): Rejection => [
      ["decide", "requestIdHeaders", 0],
      header,
      "HTTP token",
    ],
  ),
  ...hostileEndpoints.map(
    (endpoint): Rejection => [
      ["decide", "endpoint"],
      endpoint,
      "endpoint must not be blank",
    ],
  ),
];

const ruleRejections: readonly Rejection[] = [
  [["decide", "errors", "rules", 0, "status"], undefined, ONE_OF],
  [["decide", "errors", "rules", 0, "statusMin"], 400, ONE_OF],
  [["decide", "errors", "rules", 0, "status"], [401, 401], "more than once"],
  [["decide", "errors", "rules", 0, "status"], [401, 429], "more than once"],
  [
    ["decide", "errors", "rules", 5],
    { statusMin: 500, kind: "server" },
    "more than once",
  ],
  [
    ["decide", "errors", "bodyShapes", 2],
    { path: "detail", isArray: true },
    "same path and isArray twice",
  ],
  [
    ["decide", "requestIdHeaders"],
    ["X-Request-Id", "x-request-id"],
    "same header twice",
  ],
  // An array shape without a formatter never matches, and a formatter on a
  // body that is not an array reads the text as an empty list: both are inert.
  [
    ["decide", "errors", "bodyShapes", 2],
    { path: "errors", isArray: true },
    "isArray: true together with a formatter",
  ],
  [
    ["decide", "errors", "bodyShapes", 2],
    { path: "message", formatter: "fastapi-validation" },
    "isArray: true together with a formatter",
  ],
];

function expectAllRejected(rows: readonly Rejection[]): void {
  for (const [path, value, needle] of rows) {
    expectRejected(
      () => parseCatalogEntry(entryWith(path, value), "laya.json"),
      needle,
      `${path.join(".")} = ${JSON.stringify(value)}`,
    );
  }
}

async function decideFieldRulesSection(): Promise<void> {
  section("decide entries: field-level rules");

  await test("wrong types and out-of-range values in errors, limits and timeouts are rejected", () => {
    expectAllRejected(valueRejections);
  });

  await test("hostile paths, header names and endpoints are rejected", () => {
    expectAllRejected(hostileRejections);
  });

  await test("ambiguous or repeated error rules, body shapes and headers are rejected", () => {
    expectAllRejected(ruleRejections);
  });

  await test("ordinary dotted paths, header names and endpoints are still accepted", () => {
    const accepted: ReadonlyArray<
      readonly [readonly (string | number)[], string]
    > = [
      [["decide", "response", "modelPaths", 0], "choices.0.message.model"],
      [["decide", "requestIdHeaders", 0], "X-Request-Id"],
      [["decide", "endpoint"], "{baseURL}/v2/predict"],
    ];
    for (const [path, value] of accepted) {
      parseCatalogEntry(entryWith(path, value), "laya.json");
    }
  });
}

const crossRejections: readonly Rejection[] = [
  [["decide", "model", "alias"], undefined, "is required when placement"],
  [
    ["decide", "model", "alias"],
    "gone",
    "alias must be a key of models.catalog",
  ],
  [
    ["decide", "model", "alias"],
    "AUTO",
    "alias must be a key of models.catalog",
  ],
  [["decide", "model", "placement"], "body", "only valid with placement"],
  [["models", "default"], "typed-decision", "models.default must be a key"],
  [["models", "catalog"], {}, "models.default must be a key"],
  [["models", "topModels"], ["nope"], "topModels entry must be a key"],
  [["models", "topModels"], ["english", "english"], "duplicate entries"],
  [
    ["decisionLimits", "models", "typed-decision"],
    { maxStateTokens: 768 },
    "decisionLimits.models key must be a key",
  ],
  [
    ["decide", "endpoint"],
    "https://laya.example.test/predict",
    "must contain {baseURL}",
  ],
];

async function decideCrossRulesSection(): Promise<void> {
  section("decide entries: cross-reference rules");

  await test("aliases, default and top models, limit keys and the endpoint must agree with the catalog", () => {
    expectAllRejected(crossRejections);
  });

  await test("the same fields are accepted when they do agree", () => {
    const noAlias = entryWith(["decide", "model", "placement"], "body");
    setAt(noAlias, ["decide", "model", "alias"], undefined);
    deepStrictEqual(parseCatalogEntry(noAlias, "laya.json"), noAlias);

    const fixedUrl = entryWith(["decide", "baseURLRequired"], undefined);
    setAt(fixedUrl, ["wire", "baseURL"], "https://laya.example.test");
    setAt(
      fixedUrl,
      ["decide", "endpoint"],
      "https://laya.example.test/predict",
    );
    deepStrictEqual(parseCatalogEntry(fixedUrl, "laya.json"), fixedUrl);

    const topModels = entryWith(["models", "topModels"], ["english", "auto"]);
    deepStrictEqual(parseCatalogEntry(topModels, "laya.json"), topModels);
  });
}

// Keys the chat provider reads and ConfiguredDecisionProvider does not. Each
// one parses today only if the schema forgets to refuse it.
const unsupportedWireKeys: readonly (readonly [string, unknown])[] = [
  ["baseURLTemplate", "https://api.example.test/v1"],
  ["extraCredentials", ["accountId"]],
  ["missingCredentialMessage", "Set the account first"],
  ["apiKeyFallbackEnvVars", ["AI_GATEWAY_API_KEY"]],
];

const unsupportedIssue = (key: string): string =>
  `wire.${key}: wire.${key} is not supported on decide entries yet`;

function messageOfRejection(run: () => unknown, label: string): string {
  const message = failureOf(run);
  if (message === undefined) {
    throw new Error(`${label}: was accepted`);
  }
  return message;
}

function occurrences(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}

const DEFAULT_MODEL = LAYA_ENTRY.models.default;
const MANIFEST_NOTE = "the derived model manifest reads it";

function windowIssue(field: string): string {
  return `models.catalog.${DEFAULT_MODEL}.${field}: ${field} is required on the default model; ${MANIFEST_NOTE}`;
}

async function defaultModelWindowSection(): Promise<void> {
  section("decide entries: the default model declares its window");

  for (const field of ["contextWindow", "maxOutputTokens"] as const) {
    await test(`a default model without ${field} is rejected, naming the field and the manifest`, () => {
      const message = messageOfRejection(
        () =>
          parseCatalogEntry(
            entryWith(["models", "catalog", DEFAULT_MODEL, field], undefined),
            "laya.json",
          ),
        `default model without ${field}`,
      );
      deepStrictEqual(
        message,
        `Invalid decide catalog file laya.json: ${windowIssue(field)}`,
        `${field}: rejected, but not by the default-model rule`,
      );
      assert(
        occurrences(message, MANIFEST_NOTE) === 1,
        `${field}: not exactly one issue for the missing field`,
      );
    });
  }

  await test("a default model with neither field gets one issue for each", () => {
    const entry = entryWith(
      ["models", "catalog", DEFAULT_MODEL, "contextWindow"],
      undefined,
    );
    setAt(
      entry,
      ["models", "catalog", DEFAULT_MODEL, "maxOutputTokens"],
      undefined,
    );
    const message = messageOfRejection(
      () => parseCatalogEntry(entry, "laya.json"),
      "default model without either field",
    );
    deepStrictEqual(
      message,
      `Invalid decide catalog file laya.json: ${windowIssue("contextWindow")}; ${windowIssue("maxOutputTokens")}`,
    );
    assert(
      occurrences(message, MANIFEST_NOTE) === 2,
      "not exactly two issues for two missing fields",
    );
  });

  await test("a default model with positive whole-number windows is accepted and parses to itself", () => {
    const entry = entryWith(
      ["models", "catalog", DEFAULT_MODEL, "contextWindow"],
      8192,
    );
    setAt(entry, ["models", "catalog", DEFAULT_MODEL, "maxOutputTokens"], 512);
    deepStrictEqual(parseCatalogEntry(entry, "laya.json"), entry);
    const largest = entryWith(
      ["models", "catalog", DEFAULT_MODEL, "contextWindow"],
      Number.MAX_SAFE_INTEGER,
    );
    deepStrictEqual(parseCatalogEntry(largest, "laya.json"), largest);
  });

  const otherModel = Object.keys(LAYA_ENTRY.models.catalog).find(
    (id) => id !== DEFAULT_MODEL,
  );
  if (otherModel === undefined) {
    throw new Error("the fixture has no model besides the default");
  }
  const nonDefault: string = otherModel;

  // A window of 0 or less becomes a 0 or negative context window for every
  // reader of the manifest, and a model that omits a window inherits the
  // default's through `??`, which keeps a 0. So every model's window is a
  // positive whole number, the default's and the others'.
  for (const model of [DEFAULT_MODEL, nonDefault]) {
    for (const field of ["contextWindow", "maxOutputTokens"] as const) {
      await test(`${model === DEFAULT_MODEL ? "the default" : "a non-default"} model's ${field} must be a positive whole number`, () => {
        for (const value of [0, -5, 1.5, 1e308]) {
          const message = messageOfRejection(
            () =>
              parseCatalogEntry(
                entryWith(["models", "catalog", model, field], value),
                "laya.json",
              ),
            `${model}.${field} = ${value}`,
          );
          assertIncludes(
            message,
            `models.catalog.${model}.${field}:`,
            `${field} = ${value}: the issue does not name the field`,
          );
          assert(
            !message.includes(MANIFEST_NOTE),
            `${field} = ${value}: a present field was reported as missing`,
          );
        }
      });
    }
  }

  await test("a non-default model with positive whole-number windows is accepted", () => {
    const entry = entryWith(
      ["models", "catalog", nonDefault, "contextWindow"],
      65_536,
    );
    setAt(entry, ["models", "catalog", nonDefault, "maxOutputTokens"], 1);
    deepStrictEqual(parseCatalogEntry(entry, "laya.json"), entry);
  });

  await test("a decide model is still a strict object, and chat models keep their looser windows", () => {
    expectRejected(
      () =>
        parseCatalogEntry(
          entryWith(["models", "catalog", DEFAULT_MODEL, "surprise"], true),
          "laya.json",
        ),
      "surprise",
      "unknown key on a decide model",
    );
    const chat = chatRaw("a2agent.json");
    const [chatModel] = Object.keys(
      (chat.models as { catalog: Record<string, unknown> }).catalog,
    );
    assert(chatModel !== undefined, "a2agent.json has no model");
    setAt(chat, ["models", "catalog", chatModel, "contextWindow"], 0);
    deepStrictEqual(parseProviderCatalogJson(chat, "a2agent.json"), chat);
  });

  await test("models other than the default may omit both fields", () => {
    const entry = structuredClone(LAYA_ENTRY) as Record<string, unknown>;
    const others = Object.keys(LAYA_ENTRY.models.catalog).filter(
      (id) => id !== DEFAULT_MODEL,
    );
    assert(others.length >= 1, "the fixture has no model besides the default");
    for (const id of others) {
      setAt(entry, ["models", "catalog", id, "contextWindow"], undefined);
      setAt(entry, ["models", "catalog", id, "maxOutputTokens"], undefined);
    }
    deepStrictEqual(parseCatalogEntry(entry, "laya.json"), entry);
  });

  await test("a default that is not a catalog key gets the key rule and no window issue, and nothing is read from the missing entry", () => {
    const KEY_RULE = "models.default must be a key of models.catalog";
    // Names that exist on every object but are not catalog keys: a lookup
    // that reaches the prototype (`in`, plain indexing) finds an entry here.
    for (const missing of [
      "typed-decision",
      "constructor",
      "toString",
      "__proto__",
    ]) {
      deepStrictEqual(
        failureOf(() =>
          parseCatalogEntry(
            entryWith(["models", "default"], missing),
            "laya.json",
          ),
        ),
        `Invalid decide catalog file laya.json: models.default: ${KEY_RULE}`,
        `default ${missing}`,
      );
    }
    const emptyCatalog = entryWith(["models", "catalog"], {});
    const message = messageOfRejection(
      () => parseCatalogEntry(emptyCatalog, "laya.json"),
      "empty catalog",
    );
    assert(
      message.startsWith("Invalid decide catalog file laya.json:"),
      `empty catalog: not a validation error: ${message}`,
    );
    assert(
      occurrences(message, KEY_RULE) === 1,
      "empty catalog: the key rule did not fire exactly once",
    );
    assert(
      !message.includes(MANIFEST_NOTE),
      "empty catalog: the window rule fired on an entry that does not exist",
    );
  });

  await test("a missing window is reported in the same pass as the other field errors", () => {
    const entry = entryWith(
      ["models", "catalog", DEFAULT_MODEL, "contextWindow"],
      undefined,
    );
    setAt(
      entry,
      ["models", "catalog", DEFAULT_MODEL, "maxOutputTokens"],
      undefined,
    );
    // The markers a scaffold leaves behind. An invalid enum value (the billing
    // policy) is the kind of error that stops a rule written at the entry level.
    setAt(entry, ["decide", "order"], 0);
    setAt(entry, ["decisionLimits", "maxStateTokens"], 0);
    setAt(entry, ["setup", "billingPolicy"], "TODO: a billing policy");
    setAt(entry, ["evidence", "rosterVerified", "date"], "TODO");
    const message = messageOfRejection(
      () => parseCatalogEntry(entry, "laya.json"),
      "missing windows beside other errors",
    );
    // The other issues carry the validator's own wording, so only the window
    // issues are pinned whole: split on the "; <path>: " boundaries (the window
    // issue's own "; the derived model manifest..." is not one) and compare
    // the issues that mention the manifest, in the order they were reported.
    const prefix = "Invalid decide catalog file laya.json: ";
    assert(message.startsWith(prefix), `not a validation error: ${message}`);
    deepStrictEqual(
      message
        .slice(prefix.length)
        .split(/; (?=[\w.-]+: )/)
        .filter((issue) => issue.includes(MANIFEST_NOTE)),
      [windowIssue("contextWindow"), windowIssue("maxOutputTokens")],
    );
    for (const expected of [
      "decide.order:",
      "decisionLimits.maxStateTokens:",
      "setup.billingPolicy:",
      "evidence.rosterVerified.date:",
    ]) {
      assertIncludes(message, expected, "not reported in the same pass");
    }
  });

  await test("a window of the wrong type is a type error, not a missing field", () => {
    for (const field of ["contextWindow", "maxOutputTokens"]) {
      const message = messageOfRejection(
        () =>
          parseCatalogEntry(
            entryWith(
              ["models", "catalog", DEFAULT_MODEL, field],
              "TODO: a number",
            ),
            "laya.json",
          ),
        `${field} as a string`,
      );
      assertIncludes(
        message,
        `models.catalog.${DEFAULT_MODEL}.${field}:`,
        `${field}: the issue does not name the field`,
      );
      assert(
        !message.includes(MANIFEST_NOTE),
        `${field}: a present field was reported as missing`,
      );
    }
  });

  await test("every shipped decide catalog file declares its default model's window", () => {
    const decideFiles = catalogFiles.filter(
      ({ raw }) => raw.inferenceKinds !== undefined,
    );
    assert(
      decideFiles.some(({ file }) => file === "laya.json"),
      "laya.json is not among the shipped decide files",
    );
    for (const { file, raw } of decideFiles) {
      const parsed = parseCatalogEntry(structuredClone(raw), file);
      assert(isDecideCatalogEntry(parsed), `${file} is not a decide entry`);
      const base = parsed.models.catalog[parsed.models.default];
      assert(
        base?.contextWindow !== undefined && base.maxOutputTokens !== undefined,
        `${file}: the default model has no window`,
      );
    }
  });
}

async function unsupportedWireSection(): Promise<void> {
  section("decide entries: wire keys the engine does not read");

  for (const [key, value] of unsupportedWireKeys) {
    await test(`wire.${key} is refused on a decide entry, once, naming the key`, () => {
      const message = messageOfRejection(
        () => parseCatalogEntry(entryWith(["wire", key], value), "laya.json"),
        `wire.${key}`,
      );
      assertIncludes(
        message,
        unsupportedIssue(key),
        `wire.${key}: rejected, but not by the unsupported-key rule`,
      );
      assert(
        occurrences(message, unsupportedIssue(key)) === 1,
        `wire.${key}: not exactly one issue for the key`,
      );
    });
  }

  await test("a template-only wire is refused for the unsupported key, not accepted by the exactly-one rule", () => {
    const entry = entryWith(["decide", "baseURLRequired"], false);
    setAt(entry, ["wire"], { baseURLTemplate: "https://api.example.test/v1" });
    const message = messageOfRejection(
      () => parseCatalogEntry(entry, "laya.json"),
      "a template-only decide wire",
    );
    assertIncludes(message, unsupportedIssue("baseURLTemplate"));
    assert(
      !message.includes(WIRE_RULE),
      "the exactly-one rule fired where only the unsupported key is wrong",
    );
  });

  await test("each unsupported key present adds its own issue and the existing rules keep their messages", () => {
    const entry = entryWith(["wire"], {
      baseURLTemplate: "https://api.example.test/{accountId}",
      extraCredentials: ["accountId"],
      missingCredentialMessage: "Set the account first",
      apiKeyFallbackEnvVars: ["AI_GATEWAY_API_KEY"],
    });
    const message = messageOfRejection(
      () => parseCatalogEntry(entry, "laya.json"),
      "an entry with every unsupported key",
    );
    for (const [key] of unsupportedWireKeys) {
      assert(
        occurrences(message, unsupportedIssue(key)) === 1,
        `wire.${key}: not exactly one issue for the key`,
      );
    }
    assertIncludes(message, "baseURLRequired");
  });

  await test("a plain Laya-shaped wire still parses, and envOverrides stay legal", () => {
    deepStrictEqual(
      parseCatalogEntry(structuredClone(LAYA_ENTRY), "laya.json"),
      LAYA_ENTRY,
    );
    const overridden = entryWith(["wire", "envOverrides"], {
      apiKey: "ACME_KEY",
      baseURL: "ACME_URL",
      model: "ACME_MODEL",
    });
    deepStrictEqual(parseCatalogEntry(overridden, "laya.json"), overridden);
  });
}

const mirror: unknown = JSON.parse(
  readFileSync(join(CATALOG_DIR, "provider-catalog.schema.json"), "utf8"),
);

function undeclaredKeys(value: unknown, node: unknown, path: string): string[] {
  if (Array.isArray(value)) {
    const items = (node as { items?: unknown } | undefined)?.items;
    return value.flatMap((item, index) =>
      undeclaredKeys(item, items, `${path}[${index}]`),
    );
  }
  if (typeof value !== "object" || value === null) {
    return [];
  }
  const declared = (
    node as { properties?: Record<string, unknown> } | undefined
  )?.properties;
  if (!declared) {
    return [];
  }
  return Object.entries(value).flatMap(([key, child]) => {
    if (key === "$schema") {
      return [];
    }
    const here = path === "" ? key : `${path}.${key}`;
    return key in declared
      ? undeclaredKeys(child, declared[key], here)
      : [here];
  });
}

async function mirrorSection(): Promise<void> {
  section("editor mirror: provider-catalog.schema.json");

  await test("declares every key LAYA_ENTRY uses, array items included", () => {
    deepStrictEqual(undeclaredKeys(LAYA_ENTRY, mirror, ""), []);
  });

  await test("declares every key the real chat files use, errorRules patternStatuses among them", () => {
    for (const { file, raw } of chatFiles) {
      deepStrictEqual(undeclaredKeys(raw, mirror, ""), [], file);
    }
  });

  await test("the walker reports an unknown key at every depth", () => {
    const probe = (path: readonly (string | number)[]): string[] =>
      undeclaredKeys(entryWith(path, true), mirror, "");
    deepStrictEqual(probe(["decide", "errors", "rules", 0, "surprise"]), [
      "decide.errors.rules[0].surprise",
    ]);
    deepStrictEqual(probe(["decide", "surprise"]), ["decide.surprise"]);
    deepStrictEqual(probe(["decisionLimits", "surprise"]), [
      "decisionLimits.surprise",
    ]);
  });

  await test("requires decide for decide entries and the chat blocks for chat entries", () => {
    const shape = mirror as {
      required: string[];
      then: { required: string[] };
      else: { required: string[] };
    };
    for (const key of ["tier", "capabilities", "errorRules"]) {
      assert(!shape.required.includes(key), `root still requires ${key}`);
    }
    assert(shape.then.required.includes("decide"), "decide entry lacks decide");
    for (const key of ["capabilities", "errorRules"]) {
      assert(shape.else.required.includes(key), `chat entry lacks ${key}`);
    }
  });

  await test("forbids the wire keys the decide engine does not read, and only for decide entries", () => {
    const shape = mirror as {
      then: { properties: { wire?: { properties: Record<string, unknown> } } };
      else: { properties: { wire?: unknown } };
    };
    const forbidden = shape.then.properties.wire?.properties ?? {};
    for (const [key] of unsupportedWireKeys) {
      assert(forbidden[key] === false, `the decide branch allows wire.${key}`);
    }
    assert(
      shape.else.properties.wire === undefined,
      "the chat branch restricts wire",
    );
  });
}

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CATALOG_SRC = "src/lib/providers/catalog";

function makeCatalogTree(): string {
  const root = mkdtempSync(join(tmpdir(), "neurolink-decide-catalog-"));
  mkdirSync(join(root, CATALOG_SRC), { recursive: true });
  cpSync(join(REPO_ROOT, CATALOG_SRC), join(root, CATALOG_SRC), {
    recursive: true,
  });
  return root;
}

function runCodegenCheck(cwd: string): { code: number; output: string } {
  try {
    const stdout = execFileSync(
      join(REPO_ROOT, "node_modules/.bin/tsx"),
      [join(REPO_ROOT, "tools/codegen-catalog.ts"), "--check"],
      {
        cwd,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        env: process.env,
      },
    );
    return { code: 0, output: stdout };
  } catch (error) {
    const failure = error as {
      status?: number;
      stdout?: string;
      stderr?: string;
    };
    return {
      code: failure.status ?? 1,
      output: `${failure.stdout ?? ""}${failure.stderr ?? ""}`,
    };
  }
}

async function codegenMirrorSection(): Promise<void> {
  section("codegen:catalog --check: mirror coverage inside arrays");

  await test("the unmodified catalog passes the mirror check, patternStatuses included", () => {
    const root = makeCatalogTree();
    try {
      const run = runCodegenCheck(root);
      assert(
        !run.output.includes("does not declare it"),
        "the mirror check rejected a shipped catalog file",
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  await test("an unknown key inside an errorRules item is reported with its array path", () => {
    const root = makeCatalogTree();
    try {
      const entry = chatRaw("a2agent.json");
      entry.errorRules = [
        {
          status: 401,
          class: "authentication",
          message: "bad key",
          surprise: true,
        },
      ];
      writeFileSync(
        join(root, CATALOG_SRC, "a2agent.json"),
        `${JSON.stringify(entry, null, 2)}\n`,
      );
      const run = runCodegenCheck(root);
      assert(
        run.code !== 0,
        "an undeclared key inside an array item was accepted",
      );
      assertIncludes(
        run.output,
        'a2agent.json uses "errorRules[0].surprise"',
        "rejected, but without naming the array path",
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
}

await runSuite(async () => {
  await chatGroundworkSection();
  await layaFixtureSection();
  await decideEntrySection();
  await decideFieldRulesSection();
  await decideCrossRulesSection();
  await defaultModelWindowSection();
  await unsupportedWireSection();
  await mirrorSection();
  await codegenMirrorSection();
});
