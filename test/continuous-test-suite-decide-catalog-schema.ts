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
import {
  assert,
  assertIncludes,
  assertNotNull,
  defineSuite,
} from "./helpers/harness.js";
import {
  isDecideCatalogEntry,
  parseCatalogEntry,
  parseProviderCatalogJson,
} from "../src/lib/providers/catalog/schema.js";
import { getDecisionDialect } from "../src/lib/providers/decide/dialects/index.js";
import type { DecideDialectName } from "../src/lib/types/index.js";
import {
  LAYA_ENTRY,
  OPENAI_DECISIONS_ENTRY,
} from "./helpers/decideFixtures.js";

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
  [["decisionLimits", "media"], {}, "decisionLimits.media.maxImages"],
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
  [
    ["decide", "baseURLNormalize"],
    ["strip-trailing-slash", "strip-v1"],
    "baseURLNormalize",
  ],
  [
    ["decide", "baseURLNormalize"],
    ["strip-v1-suffix", "lowercase"],
    "baseURLNormalize",
  ],
  [["decide", "baseURLNormalize"], "strip-v1-suffix", "baseURLNormalize"],
  [["decide", "baseURLShape"], "path", "baseURLShape"],
  [["decide", "baseURLShape"], "Origin", "baseURLShape"],
  [["decide", "baseURLShape"], ["origin"], "baseURLShape"],
  [["decide", "baseURLShape"], null, "baseURLShape"],
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

  await test("decide.baseURLNormalize accepts strip-v1-suffix and decide.baseURLShape accepts origin, and both survive parsing", () => {
    for (const transforms of [
      [],
      ["strip-v1-suffix"],
      ["strip-trailing-slash", "strip-v1-suffix"],
      ["strip-v1-suffix", "strip-trailing-slash"],
    ]) {
      const entry = entryWith(["decide", "baseURLNormalize"], transforms);
      deepStrictEqual(parseCatalogEntry(entry, "laya.json"), entry);
    }
    const shaped = entryWith(["decide", "baseURLShape"], "origin");
    deepStrictEqual(parseCatalogEntry(shaped, "laya.json"), shaped);
    // Omitted still means no check: Laya's own entry carries neither key.
    const parsed = parseCatalogEntry(structuredClone(LAYA_ENTRY), "laya.json");
    assert(
      isDecideCatalogEntry(parsed) &&
        !("baseURLShape" in parsed.decide) &&
        parsed.decide.baseURLNormalize?.length === 1,
      "Laya's entry gained a base URL key or lost its transform",
    );
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

const AUTH_HEADER_VALUES = ["bearer", "x-api-key"] as const;
const AUTH_HEADER_REFUSED: readonly unknown[] = [
  "basic",
  "Bearer",
  "BEARER",
  "X-Api-Key",
  "x_api_key",
  "x-api-key ",
  " bearer",
  "authorization",
  "none",
  "",
  0,
  1,
  true,
  false,
  null,
  ["bearer"],
  { style: "x-api-key" },
];
const STATE_ENCODING_REFUSED: readonly unknown[] = [
  "json",
  "string",
  "Text",
  "TEXT",
  "text ",
  " text",
  "raw",
  "none",
  "",
  0,
  1,
  true,
  false,
  null,
  ["text"],
  { encoding: "text" },
];

// A refusal of the value, not of the key: "Unrecognized key" would also name
// the field, so a schema that lacked the key would pass a bare needle check.
function expectValueRefused(
  key: "authHeader" | "stateEncoding",
  value: unknown,
): void {
  const label = `${key} = ${JSON.stringify(value)}`;
  const message = failureOf(() =>
    parseCatalogEntry(entryWith(["decide", key], value)),
  );
  if (message === undefined) {
    throw new Error(`${label}: was accepted`);
  }
  assertIncludes(
    message,
    key,
    `${label}: rejected, but not on the field it sets`,
  );
  assert(
    !message.includes("Unrecognized key"),
    `${label}: rejected because the schema does not know ${key}, not because of the value`,
  );
}

async function decideAuthAndStateSection(): Promise<void> {
  section("decide entries: authHeader and stateEncoding");

  await test("decide.authHeader accepts bearer and x-api-key, keeps the value through parsing, and is never invented when omitted", () => {
    for (const value of AUTH_HEADER_VALUES) {
      const entry = entryWith(["decide", "authHeader"], value);
      deepStrictEqual(parseCatalogEntry(entry, "laya.json"), entry);
      // The same value on the other dialect: the key does not belong to one wire.
      const other: Record<string, unknown> = structuredClone(
        OPENAI_DECISIONS_ENTRY,
      );
      setAt(other, ["decide", "authHeader"], value);
      deepStrictEqual(parseCatalogEntry(other, "openai-decisions.json"), other);
    }
    for (const sample of [LAYA_ENTRY, OPENAI_DECISIONS_ENTRY]) {
      const parsed = parseCatalogEntry(structuredClone(sample), "x.json");
      assert(
        isDecideCatalogEntry(parsed) && !("authHeader" in parsed.decide),
        "parsing gave an entry that omits authHeader a value of its own",
      );
    }
  });

  await test("decide.authHeader refuses every other spelling and type", () => {
    for (const value of AUTH_HEADER_REFUSED) {
      expectValueRefused("authHeader", value);
    }
  });

  await test("decide.stateEncoding accepts text only, keeps it through parsing, and is never invented when omitted", () => {
    const entry = entryWith(["decide", "stateEncoding"], "text");
    deepStrictEqual(parseCatalogEntry(entry, "laya.json"), entry);
    const other: Record<string, unknown> = structuredClone(
      OPENAI_DECISIONS_ENTRY,
    );
    setAt(other, ["decide", "stateEncoding"], "text");
    deepStrictEqual(parseCatalogEntry(other, "openai-decisions.json"), other);
    for (const value of STATE_ENCODING_REFUSED) {
      expectValueRefused("stateEncoding", value);
    }
    for (const sample of [LAYA_ENTRY, OPENAI_DECISIONS_ENTRY]) {
      const parsed = parseCatalogEntry(structuredClone(sample), "x.json");
      assert(
        isDecideCatalogEntry(parsed) && !("stateEncoding" in parsed.decide),
        "parsing gave an entry that omits stateEncoding a value of its own",
      );
    }
  });

  await test("the two keys are independent: each is accepted alone and together", () => {
    const both = entryWith(["decide", "authHeader"], "x-api-key");
    setAt(both, ["decide", "stateEncoding"], "text");
    deepStrictEqual(parseCatalogEntry(both, "laya.json"), both);
    const encodingOnly = entryWith(["decide", "stateEncoding"], "text");
    const parsed = parseCatalogEntry(encodingOnly, "laya.json");
    assert(
      isDecideCatalogEntry(parsed) && !("authHeader" in parsed.decide),
      "setting stateEncoding gave the entry an authHeader",
    );
    const headerOnly = entryWith(["decide", "authHeader"], "x-api-key");
    const parsedHeader = parseCatalogEntry(headerOnly, "laya.json");
    assert(
      isDecideCatalogEntry(parsedHeader) &&
        !("stateEncoding" in parsedHeader.decide),
      "setting authHeader gave the entry a stateEncoding",
    );
  });
}

const MEDIA_KEYS = { imagesKey: "images", videoKey: "video" };
const MEDIA_ALLOWANCE = { maxImages: 8, video: true, maxRequestBytes: 8388608 };
const RESERVED_BODY_KEYS = [
  "model",
  "state",
  "questions",
  "__proto__",
  "constructor",
  "prototype",
];
const MEDIA_IMAGES_KEY = ["decide", "media", "imagesKey"] as const;
const MEDIA_VIDEO_KEY = ["decide", "media", "videoKey"] as const;
const MEDIA_VIDEO_FLAG = ["decisionLimits", "media", "video"] as const;

// Laya's entry with the two media blocks XOR will carry.
function mediaBase(): Record<string, unknown> {
  const entry = entryWith(["decide", "media"], structuredClone(MEDIA_KEYS));
  setAt(entry, ["decisionLimits", "media"], structuredClone(MEDIA_ALLOWANCE));
  return entry;
}

function mediaEntryWith(
  path: readonly (string | number)[],
  value: unknown,
): Record<string, unknown> {
  const entry = mediaBase();
  setAt(entry, path, value);
  return entry;
}

const keyShape = (path: readonly string[]): string =>
  `${path.join(".")}: a media key must start with a letter`;
const keyReserved = (path: readonly string[]): string =>
  `${path.join(".")}: a media key must not be model, state, questions, __proto__, constructor or prototype`;

const NOT_IDENTIFIERS = [
  "",
  "1images",
  "_images",
  "my-images",
  "images key",
  " images",
  "a.b",
  "images\n",
  "na\u00efve",
];

const mediaKeyRejections: readonly Rejection[] = [
  ...[MEDIA_IMAGES_KEY, MEDIA_VIDEO_KEY].flatMap((path) => [
    ...NOT_IDENTIFIERS.map((name): Rejection => [path, name, keyShape(path)]),
    ...RESERVED_BODY_KEYS.map(
      (name): Rejection => [path, name, keyReserved(path)],
    ),
    ...[5, null, true, ["images"], {}].map(
      (value): Rejection => [path, value, path.join(".")],
    ),
  ]),
  [MEDIA_IMAGES_KEY, undefined, "decide.media.imagesKey"],
  [
    MEDIA_VIDEO_KEY,
    "images",
    "decide.media.videoKey must differ from imagesKey",
  ],
  [["decide", "media", "surprise"], true, "surprise"],
  [["decide", "media"], "images", "decide.media"],
  [["decide", "media"], null, "decide.media"],
  [["decide", "media"], [], "decide.media"],
  [["decide", "media"], {}, "decide.media.imagesKey"],
];

const mediaLimitRejections: readonly Rejection[] = [
  ...[0, -1, 1.5, "8", null, undefined].map(
    (value): Rejection => [
      ["decisionLimits", "media", "maxImages"],
      value,
      "decisionLimits.media.maxImages",
    ],
  ),
  ...[0, -5, 1.5, "8388608", null, undefined].map(
    (value): Rejection => [
      ["decisionLimits", "media", "maxRequestBytes"],
      value,
      "decisionLimits.media.maxRequestBytes",
    ],
  ),
  ...["true", 1, 0, null, undefined].map(
    (value): Rejection => [
      MEDIA_VIDEO_FLAG,
      value,
      "decisionLimits.media.video: ",
    ],
  ),
  [["decisionLimits", "media", "surprise"], true, "surprise"],
  [["decisionLimits", "media"], null, "decisionLimits.media"],
  [["decisionLimits", "media"], [], "decisionLimits.media"],
  [["decisionLimits", "media"], "images", "decisionLimits.media"],
  [["decisionLimits", "media"], {}, "decisionLimits.media.maxImages"],
];

const mediaCrossRejections: readonly Rejection[] = [
  [
    ["decisionLimits", "media"],
    undefined,
    "decide.media needs decisionLimits.media",
  ],
  [["decisionLimits"], undefined, "decide.media needs decisionLimits.media"],
  [["decide", "media"], undefined, "decisionLimits.media needs decide.media"],
  [
    MEDIA_VIDEO_KEY,
    undefined,
    "decide.media.videoKey is required when decisionLimits.media.video is true",
  ],
  [
    MEDIA_VIDEO_FLAG,
    false,
    "decide.media.videoKey must be omitted when decisionLimits.media.video is false",
  ],
];

function expectAllMediaRejected(rows: readonly Rejection[]): void {
  for (const [path, value, needle] of rows) {
    expectRejected(
      () => parseCatalogEntry(mediaEntryWith(path, value), "xor.json"),
      needle,
      `${path.join(".")} = ${JSON.stringify(value)}`,
    );
  }
}

async function mediaSection(): Promise<void> {
  section("decide entries: media (decide.media with decisionLimits.media)");

  await test("the pair XOR carries parses to itself, and so do images-only and custom key names", () => {
    const xor = mediaBase();
    deepStrictEqual(parseCatalogEntry(xor, "xor.json"), xor);
    const imagesOnly = mediaEntryWith(MEDIA_VIDEO_FLAG, false);
    setAt(imagesOnly, MEDIA_VIDEO_KEY, undefined);
    deepStrictEqual(parseCatalogEntry(imagesOnly, "xor.json"), imagesOnly);
    const renamed = mediaEntryWith(["decide", "media"], {
      imagesKey: "Image_list2",
      videoKey: "clip",
    });
    deepStrictEqual(parseCatalogEntry(renamed, "xor.json"), renamed);
  });

  await test("a key that only resembles a reserved body key is accepted, and the smallest allowance parses", () => {
    for (const name of [
      "model2",
      "Model",
      "states",
      "questions_",
      "constructors",
      "prototype1",
      "x".repeat(200),
    ]) {
      const entry = mediaEntryWith(MEDIA_IMAGES_KEY, name);
      deepStrictEqual(parseCatalogEntry(entry, "xor.json"), entry);
    }
    const smallest = mediaEntryWith(["decisionLimits", "media"], {
      maxImages: 1,
      video: true,
      maxRequestBytes: 1,
    });
    deepStrictEqual(parseCatalogEntry(smallest, "xor.json"), smallest);
  });

  await test("a media key must be an identifier that the body does not already use, and the two must differ", () => {
    expectAllMediaRejected(mediaKeyRejections);
  });

  await test("the allowance needs a positive maxImages and maxRequestBytes and a boolean video", () => {
    expectAllMediaRejected(mediaLimitRejections);
  });

  await test("decide.media and decisionLimits.media go together, and videoKey follows the allowance's video flag", () => {
    expectAllMediaRejected(mediaCrossRejections);
  });

  await test("every media rejection comes from the media rules: the same entry without media parses", () => {
    // Positive control for the rows above: the helper's base entry is valid, so
    // a rejection can only come from the one change the row makes.
    const base = mediaBase();
    parseCatalogEntry(base, "xor.json");
    parseCatalogEntry(structuredClone(LAYA_ENTRY), "laya.json");
    for (const [path, value] of [
      [["decide", "media"], undefined],
      [["decisionLimits", "media"], undefined],
    ] as const) {
      const entry = structuredClone(base);
      setAt(entry, path, value);
      assert(
        failureOf(() => parseCatalogEntry(entry, "xor.json")) !== undefined,
        "dropping one half of the pair was accepted",
      );
    }
    const neither = structuredClone(base);
    setAt(neither, ["decide", "media"], undefined);
    setAt(neither, ["decisionLimits", "media"], undefined);
    parseCatalogEntry(neither, "laya.json");
  });

  await test("an audio allowance and decide.media.audioKey go together, the key differs from the others, and maxSeconds is a positive integer", () => {
    const withAudio = mediaEntryWith(["decisionLimits", "media", "audio"], {
      maxSeconds: 30,
    });
    setAt(withAudio, ["decide", "media", "audioKey"], "audio");
    deepStrictEqual(parseCatalogEntry(withAudio, "xor.json"), withAudio);
    const rows: ReadonlyArray<
      readonly [readonly (string | number)[], unknown, string]
    > = [
      [
        ["decide", "media", "audioKey"],
        undefined,
        "decide.media.audioKey is required when decisionLimits.media.audio is set",
      ],
      [
        ["decisionLimits", "media", "audio"],
        undefined,
        "decide.media.audioKey must be omitted when decisionLimits.media.audio is not set",
      ],
      [
        ["decide", "media", "audioKey"],
        "images",
        "decide.media.audioKey must differ from imagesKey and videoKey",
      ],
      [
        ["decide", "media", "audioKey"],
        "video",
        "decide.media.audioKey must differ from imagesKey and videoKey",
      ],
      [["decide", "media", "audioKey"], "state", "audioKey"],
      [["decisionLimits", "media", "audio"], { maxSeconds: 0 }, "maxSeconds"],
      [["decisionLimits", "media", "audio"], { maxSeconds: 1.5 }, "maxSeconds"],
      [["decisionLimits", "media", "audio"], {}, "maxSeconds"],
      [
        ["decisionLimits", "media", "audio"],
        { maxSeconds: 30, surprise: 1 },
        "surprise",
      ],
    ];
    for (const [path, value, needle] of rows) {
      const entry = structuredClone(withAudio);
      setAt(entry, path, value);
      expectRejected(
        () => parseCatalogEntry(entry, "xor.json"),
        needle,
        `${path.join(".")} = ${JSON.stringify(value)}`,
      );
    }
  });
}

async function questionTypesSection(): Promise<void> {
  section(
    "decide entries: questionTypes, per-question caps and the scaled timeout",
  );

  await test("questionTypes, maxScoreLevels, maxChoiceOptions and decideMsPerKStateTokens parse as XOR declares them", () => {
    const entry = entryWith(
      ["decisionLimits", "questionTypes"],
      ["boolean", "choice", "score", "value", "choice-unknown"],
    );
    setAt(entry, ["decisionLimits", "maxScoreLevels"], 10);
    setAt(entry, ["decisionLimits", "maxChoiceOptions"], 64);
    setAt(entry, ["timeouts"], {
      decideMs: 5000,
      decideMsPerKStateTokens: 150,
    });
    deepStrictEqual(parseCatalogEntry(entry, "laya.json"), entry);
  });

  await test("an unknown or repeated question type, an empty list and a cap below 1 are refused, naming the path", () => {
    const rows: readonly Rejection[] = [
      [
        ["decisionLimits", "questionTypes"],
        ["boolean", "box"],
        "questionTypes",
      ],
      [
        ["decisionLimits", "questionTypes"],
        ["boolean", "boolean"],
        "decisionLimits.questionTypes lists the same type twice",
      ],
      [["decisionLimits", "questionTypes"], [], "questionTypes"],
      [["decisionLimits", "questionTypes"], "value", "questionTypes"],
      [["decisionLimits", "maxScoreLevels"], 0, "maxScoreLevels"],
      [["decisionLimits", "maxChoiceOptions"], 2.5, "maxChoiceOptions"],
      [["timeouts", "decideMsPerKStateTokens"], 0, "decideMsPerKStateTokens"],
      [
        ["timeouts", "decideMsPerKStateTokens"],
        "150",
        "decideMsPerKStateTokens",
      ],
    ];
    for (const [path, value, needle] of rows) {
      expectRejected(
        () => parseCatalogEntry(entryWith(path, value), "laya.json"),
        needle,
        `${path.join(".")} = ${JSON.stringify(value)}`,
      );
    }
  });

  await test("decide.capableModel names another catalog model and only types the entry reads", () => {
    // Laya's default is typed-decisions; english is another key of its catalog.
    const capable = entryWith(["decide", "capableModel"], {
      model: "english",
      questionTypes: ["choice"],
    });
    deepStrictEqual(parseCatalogEntry(capable, "laya.json"), capable);
    const rows: readonly Rejection[] = [
      [
        ["decide", "capableModel"],
        { model: "no-such-model", questionTypes: [] },
        "decide.capableModel.model must be a key of models.catalog",
      ],
      [
        ["decide", "capableModel"],
        { model: "typed-decisions", questionTypes: [] },
        "decide.capableModel.model must differ from models.default",
      ],
      [
        ["decide", "capableModel"],
        { model: "english", questionTypes: ["value"] },
        "decide.capableModel.questionTypes lists value, which decisionLimits.questionTypes does not",
      ],
      [["decide", "capableModel"], { model: "english" }, "questionTypes"],
      [
        ["decide", "capableModel"],
        { model: "english", questionTypes: [], extra: 1 },
        "extra",
      ],
    ];
    for (const [path, value, needle] of rows) {
      expectRejected(
        () => parseCatalogEntry(entryWith(path, value), "laya.json"),
        needle,
        `${path.join(".")} = ${JSON.stringify(value)}`,
      );
    }
  });

  await test("the mirror declares the new keys, so the editor accepts what the schema does", () => {
    const entry = entryWith(["decisionLimits", "questionTypes"], ["value"]);
    setAt(entry, ["decisionLimits", "maxScoreLevels"], 10);
    setAt(entry, ["decisionLimits", "maxChoiceOptions"], 64);
    setAt(entry, ["timeouts"], {
      decideMs: 5000,
      decideMsPerKStateTokens: 150,
    });
    deepStrictEqual(undeclaredKeys(entry, mirror, ""), []);
    const audio = mediaEntryWith(["decisionLimits", "media", "audio"], {
      maxSeconds: 30,
    });
    setAt(audio, ["decide", "media", "audioKey"], "audio");
    deepStrictEqual(undeclaredKeys(audio, mirror, ""), []);
    const capable = entryWith(["decide", "capableModel"], {
      model: "english",
      questionTypes: ["choice"],
    });
    deepStrictEqual(undeclaredKeys(capable, mirror, ""), []);
  });
}

const OPENAI_DIALECT = "dialect openai-decisions";

function openaiEntryWith(
  path: readonly (string | number)[],
  value: unknown,
): Record<string, unknown> {
  const entry: Record<string, unknown> = structuredClone(
    OPENAI_DECISIONS_ENTRY,
  );
  setAt(entry, path, value);
  return entry;
}

// Each row changes one thing on the OpenAI Decisions entry and names the path
// and the dialect in the message.
const openaiRejections: readonly Rejection[] = [
  [
    ["decide", "media"],
    structuredClone(MEDIA_KEYS),
    `decide.media: decide.media is not valid with ${OPENAI_DIALECT}`,
  ],
  [
    ["decide", "media"],
    { imagesKey: "images" },
    `decide.media: decide.media is not valid with ${OPENAI_DIALECT}`,
  ],
  [
    MEDIA_VIDEO_FLAG,
    true,
    `decisionLimits.media.video: decisionLimits.media.video must be false with ${OPENAI_DIALECT}`,
  ],
  [
    ["decide", "model"],
    { placement: "body-unless-alias", alias: "gpt-6-luna" },
    `decide.model.placement: decide.model.placement must be body with ${OPENAI_DIALECT}`,
  ],
  [
    ["decisionLimits", "media", "audio"],
    { maxSeconds: 30 },
    `decisionLimits.media.audio: decisionLimits.media.audio is not valid with ${OPENAI_DIALECT}`,
  ],
  [
    ["decisionLimits", "questionTypes"],
    ["boolean", "value"],
    `decisionLimits.questionTypes.1: decisionLimits.questionTypes cannot list value with ${OPENAI_DIALECT}`,
  ],
  [
    ["decisionLimits", "questionTypes"],
    ["choice-unknown"],
    `decisionLimits.questionTypes.0: decisionLimits.questionTypes cannot list choice-unknown with ${OPENAI_DIALECT}`,
  ],
];

async function openaiDecisionsSection(): Promise<void> {
  section("decide entries: the openai-decisions dialect");

  await test("the OpenAI Decisions entry parses to itself, and so does one with no allowance at all", () => {
    deepStrictEqual(
      parseCatalogEntry(
        structuredClone(OPENAI_DECISIONS_ENTRY),
        "openai-decisions.json",
      ),
      OPENAI_DECISIONS_ENTRY,
    );
    const textOnly = openaiEntryWith(["decisionLimits", "media"], undefined);
    deepStrictEqual(
      parseCatalogEntry(textOnly, "openai-decisions.json"),
      textOnly,
    );
  });

  await test("an allowance without decide.media is how this dialect declares its images, and it needs no body keys", () => {
    // The pairing rule belongs to system-one: here the allowance stands alone.
    const raw = structuredClone(OPENAI_DECISIONS_ENTRY);
    assert(
      raw.decisionLimits?.media !== undefined && raw.decide.media === undefined,
      "positive control: the entry carries an allowance and no body keys",
    );
    deepStrictEqual(parseCatalogEntry(raw, "openai-decisions.json"), raw);
    // Any allowance that is valid for system-one stays valid here, except video.
    for (const media of [
      { maxImages: 1, video: false, maxRequestBytes: 1 },
      { maxImages: 8, video: false, maxRequestBytes: 33554432 },
    ]) {
      const withAllowance = openaiEntryWith(["decisionLimits", "media"], media);
      deepStrictEqual(
        parseCatalogEntry(withAllowance, "openai-decisions.json"),
        withAllowance,
      );
    }
  });

  await test("decide.media, a video allowance and a placement other than body are each refused, naming the path", () => {
    for (const [path, value, needle] of openaiRejections) {
      expectRejected(
        () =>
          parseCatalogEntry(
            openaiEntryWith(path, value),
            "openai-decisions.json",
          ),
        needle,
        `${path.join(".")} = ${JSON.stringify(value)}`,
      );
    }
  });

  await test("decide.media is refused with or without an allowance beside it", () => {
    for (const allowance of [
      undefined,
      { maxImages: 8, video: false, maxRequestBytes: 33554432 },
    ]) {
      const entry = openaiEntryWith(
        ["decide", "media"],
        structuredClone(MEDIA_KEYS),
      );
      setAt(entry, ["decisionLimits", "media"], allowance);
      const message = failureOf(() =>
        parseCatalogEntry(entry, "openai-decisions.json"),
      );
      assertNotNull(message, "decide.media was accepted");
      assertIncludes(
        message,
        "decide.media is not valid",
        "refused for another reason",
      );
      // Neither half of system-one's pairing rule fires on this dialect.
      assert(
        !message.includes("needs decide.media") &&
          !message.includes("needs decisionLimits.media"),
        "system-one's pairing rule ran on this dialect",
      );
    }
  });

  await test("system-one keeps every rule it had: the same changes are valid there, and its pairing still refuses what it refused", () => {
    // The rules above are scoped to the dialect: the identical values on a
    // system-one entry parse, which is what XOR and Laya rely on.
    parseCatalogEntry(mediaBase(), "xor.json");
    parseCatalogEntry(
      entryWith(["decide", "model"], {
        placement: "body-unless-alias",
        alias: "auto",
      }),
      "laya.json",
    );
    expectAllMediaRejected(mediaCrossRejections);
    // And an allowance with no body keys, which is valid on openai-decisions, is not on system-one.
    expectRejected(
      () =>
        parseCatalogEntry(
          entryWith(["decisionLimits", "media"], {
            maxImages: 8,
            video: false,
            maxRequestBytes: 33554432,
          }),
          "laya.json",
        ),
      "decisionLimits.media needs decide.media",
      "system-one allowance without body keys",
    );
    // Same entry, other dialect: that one row is the whole difference.
    const swapped = openaiEntryWith(["decide", "dialect"], "system-one");
    expectRejected(
      () => parseCatalogEntry(swapped, "openai-decisions.json"),
      "decisionLimits.media needs decide.media",
      "the OpenAI entry on the system-one dialect",
    );
  });

  await test("every other rule still applies to this dialect: order, endpoint, errors and the wire", () => {
    for (const [path, value, needle] of [
      [["decide", "order"], 0, "decide.order"],
      [["decide", "errors"], undefined, "decide.errors"],
      [["wire", "baseURL"], undefined, WIRE_RULE],
      [["decide", "dialect"], "openai", "decide.dialect"],
    ] as const) {
      expectRejected(
        () =>
          parseCatalogEntry(
            openaiEntryWith(path, value),
            "openai-decisions.json",
          ),
        needle,
        `${path.join(".")} on the OpenAI entry`,
      );
    }
  });
}

const GUARD_AT = ["decide", "ambientKeyGuard"] as const;
const GUARD_ENVS = [...GUARD_AT, "baseURLEnvVars"] as const;
const GUARD_ORIGINS = [...GUARD_AT, "trustedOrigins"] as const;
const GUARD_ENV_SHAPE = "an environment variable name must be";
const GUARD_ORIGIN_SHAPE = "a trusted origin must be an http(s) origin";
const GUARD_ENV_PATH = "decide.ambientKeyGuard.baseURLEnvVars";
const GUARD_ORIGIN_PATH = "decide.ambientKeyGuard.trustedOrigins";
const GUARD_CREDS = [...GUARD_AT, "credentialBaseURLs"] as const;
const GUARD_CREDS_PATH = "decide.ambientKeyGuard.credentialBaseURLs";
const GUARD_KEY_SHAPE = "a credentials key must be";
const notCredentialKeys = [
  "",
  "1openai",
  "_openai",
  "open-ai",
  "open ai",
  "openai ",
  "openai\n",
  "openai.baseURL",
  "\u00c9nv",
  "a".repeat(65),
];

const notEnvNames = [
  "",
  "openai_base_url",
  "1BASE",
  "_BASE",
  "OPENAI-BASE",
  "OPENAI BASE",
  "OPENAI_BASE_URL ",
  "OPENAI_BASE_URL\n",
  "ÉNV",
  "A".repeat(65),
];
const notOrigins = [
  "",
  "https://api.openai.com/",
  "https://api.openai.com/v1",
  "https://api.openai.com?x=1",
  "https://api.openai.com#f",
  "https://user@api.openai.com",
  "https://user:pw@api.openai.com",
  "ftp://api.openai.com",
  "api.openai.com",
  "//api.openai.com",
  "http:/api.openai.com",
  "https://",
  "https://API.openai.com",
  "https://Api.openai.com",
  "https://api.Openai.com",
  "HTTPS://api.openai.com",
  "https://api.openai.com ",
  " https://api.openai.com",
  "https://api.openai.com\n",
  "https://exa mple.test",
  "https://-x.test",
  "https://x-.test",
  "https://[::1]",
  "https://api.openai.com:",
  "https://api.openai.com:123456",
];

const guardRejections: readonly Rejection[] = [
  ...[null, "x", [], true, 5].map(
    (value): Rejection => [GUARD_AT, value, "decide.ambientKeyGuard"],
  ),
  [GUARD_AT, {}, GUARD_ENV_PATH],
  [GUARD_AT, {}, GUARD_ORIGIN_PATH],
  [["decide", "ambientKeyGuard", "surprise"], true, "surprise"],
  [GUARD_ENVS, undefined, GUARD_ENV_PATH],
  [GUARD_ORIGINS, undefined, GUARD_ORIGIN_PATH],
  ...["OPENAI_BASE_URL", null, 5, {}].map(
    (value): Rejection => [GUARD_ENVS, value, GUARD_ENV_PATH],
  ),
  ...["https://api.openai.com", null, 5, {}].map(
    (value): Rejection => [GUARD_ORIGINS, value, GUARD_ORIGIN_PATH],
  ),
  [GUARD_ENVS, [], GUARD_ENV_PATH],
  [GUARD_ORIGINS, [], GUARD_ORIGIN_PATH],
  [
    GUARD_ENVS,
    Array.from({ length: 9 }, (_, i) => `BASE_${i}`),
    GUARD_ENV_PATH,
  ],
  [
    GUARD_ORIGINS,
    Array.from({ length: 9 }, (_, i) => `https://gw${i}.example.test`),
    GUARD_ORIGIN_PATH,
  ],
  // The 65-character name is refused by the length bound, with its own message.
  ...notEnvNames.map(
    (name): Rejection => [
      GUARD_ENVS,
      [name],
      name.length > 64
        ? `${GUARD_ENV_PATH}.0`
        : `${GUARD_ENV_PATH}.0: ${GUARD_ENV_SHAPE}`,
    ],
  ),
  ...[5, null, true, ["A"]].map(
    (value): Rejection => [GUARD_ENVS, [value], `${GUARD_ENV_PATH}.0`],
  ),
  ...notOrigins.map(
    (origin): Rejection => [GUARD_ORIGINS, [origin], `${GUARD_ORIGIN_PATH}.0`],
  ),
  ...[5, null, true, ["https://a.test"]].map(
    (value): Rejection => [GUARD_ORIGINS, [value], `${GUARD_ORIGIN_PATH}.0`],
  ),
  [
    GUARD_ENVS,
    ["OPENAI_BASE_URL", "OPENAI_BASE_URL"],
    `${GUARD_ENV_PATH}: lists the same variable twice`,
  ],
  [
    GUARD_ORIGINS,
    ["https://api.openai.com", "https://api.openai.com"],
    `${GUARD_ORIGIN_PATH}: lists the same origin twice`,
  ],
  [
    GUARD_ENVS,
    ["OPENAI_BASE_URL", "OPENAI_DECISIONS_BASE_URL"],
    `${GUARD_ENV_PATH}: must not list the provider's own base-URL variable OPENAI_DECISIONS_BASE_URL`,
  ],
  // credentialBaseURLs: optional, but when present a bounded list of
  // { key, field } objects, field restricted to "baseURL".
  ...["x", 5, null, true, {}].map(
    (value): Rejection => [GUARD_CREDS, value, GUARD_CREDS_PATH],
  ),
  [GUARD_CREDS, [], GUARD_CREDS_PATH],
  [
    GUARD_CREDS,
    Array.from({ length: 9 }, (_, i) => ({
      key: `slice${i}`,
      field: "baseURL",
    })),
    GUARD_CREDS_PATH,
  ],
  ...["openai", 5, null, true, ["openai"]].map(
    (value): Rejection => [GUARD_CREDS, [value], `${GUARD_CREDS_PATH}.0`],
  ),
  [GUARD_CREDS, [{}], `${GUARD_CREDS_PATH}.0.key`],
  [GUARD_CREDS, [{}], `${GUARD_CREDS_PATH}.0.field`],
  [GUARD_CREDS, [{ key: "openai" }], `${GUARD_CREDS_PATH}.0.field`],
  [GUARD_CREDS, [{ field: "baseURL" }], `${GUARD_CREDS_PATH}.0.key`],
  [
    GUARD_CREDS,
    [{ key: "openai", field: "baseURL", surprise: true }],
    "surprise",
  ],
  ...["apiKey", "baseurl", "BaseURL", "", 5, null].map(
    (field): Rejection => [
      GUARD_CREDS,
      [{ key: "openai", field }],
      `${GUARD_CREDS_PATH}.0.field`,
    ],
  ),
  ...notCredentialKeys.map(
    (key): Rejection => [
      GUARD_CREDS,
      [{ key, field: "baseURL" }],
      key.length > 64
        ? `${GUARD_CREDS_PATH}.0.key`
        : `${GUARD_CREDS_PATH}.0.key: ${GUARD_KEY_SHAPE}`,
    ],
  ),
  ...[5, null, true, ["openai"]].map(
    (key): Rejection => [
      GUARD_CREDS,
      [{ key, field: "baseURL" }],
      `${GUARD_CREDS_PATH}.0.key`,
    ],
  ),
  [
    GUARD_CREDS,
    [
      { key: "openai", field: "baseURL" },
      { key: "openai", field: "baseURL" },
    ],
    `${GUARD_CREDS_PATH}: lists the same credentials field twice`,
  ],
];

async function ambientKeyGuardSection(): Promise<void> {
  section(
    "decide entries: ambientKeyGuard (an ambient key that belongs to something else)",
  );

  await test("the OpenAI Decisions entry carries a guard and parses to itself; so does an entry with none", () => {
    const guarded = structuredClone(OPENAI_DECISIONS_ENTRY);
    assert(
      guarded.decide.ambientKeyGuard !== undefined,
      "positive control: the fixture declares a guard",
    );
    deepStrictEqual(
      parseCatalogEntry(guarded, "openai-decisions.json"),
      guarded,
    );
    const plain = structuredClone(LAYA_ENTRY);
    assert(
      plain.decide.ambientKeyGuard === undefined,
      "positive control: Laya declares none",
    );
    deepStrictEqual(parseCatalogEntry(plain, "laya.json"), plain);
  });

  await test("the guard is not tied to a dialect, and the bounds, ports and hosts it allows parse", () => {
    const onSystemOne = entryWith(GUARD_AT, {
      baseURLEnvVars: ["ACME_BASE_URL"],
      trustedOrigins: ["https://api.acme.example"],
    });
    deepStrictEqual(parseCatalogEntry(onSystemOne, "laya.json"), onSystemOne);
    const full = openaiEntryWith(GUARD_AT, {
      baseURLEnvVars: Array.from({ length: 8 }, (_, i) => `GW_${i}_URL`),
      trustedOrigins: [
        "https://api.openai.com",
        "https://eu.api.openai.com",
        "https://api.openai.com:8443",
        "http://localhost:4000",
        "http://127.0.0.1",
        "http://127.0.0.1:65535",
        "https://a-b.example.test",
        "https://x.y.z.example.test:1",
      ],
    });
    deepStrictEqual(parseCatalogEntry(full, "openai-decisions.json"), full);
    const longest = openaiEntryWith(GUARD_ENVS, ["A".repeat(64)]);
    deepStrictEqual(
      parseCatalogEntry(longest, "openai-decisions.json"),
      longest,
    );
    // credentialBaseURLs is optional, and bounded when present.
    const fullCredentials = openaiEntryWith(
      GUARD_CREDS,
      Array.from({ length: 8 }, (_, i) => ({
        key: i === 0 ? "a".repeat(64) : `slice${i}`,
        field: "baseURL",
      })),
    );
    deepStrictEqual(
      parseCatalogEntry(fullCredentials, "openai-decisions.json"),
      fullCredentials,
    );
    const noCredentials = openaiEntryWith(GUARD_CREDS, undefined);
    deepStrictEqual(
      parseCatalogEntry(noCredentials, "openai-decisions.json"),
      noCredentials,
    );
  });

  await test("a guard of the wrong shape is refused, naming its path", () => {
    for (const [path, value, needle] of guardRejections) {
      expectRejected(
        () =>
          parseCatalogEntry(
            openaiEntryWith(path, value),
            "openai-decisions.json",
          ),
        needle,
        `${path.join(".")} = ${JSON.stringify(value)}`,
      );
    }
  });

  await test("an origin the pattern reads but a URL parse refuses is refused, with a message that names the host and the port", () => {
    for (const origin of [
      "https://api.openai.com:99999",
      "http://999.999.999.999",
      "http://256.1.1.1",
      "http://1.2.3.4.5.6",
    ]) {
      expectRejected(
        () =>
          parseCatalogEntry(
            openaiEntryWith(GUARD_ORIGINS, [origin]),
            "openai-decisions.json",
          ),
        `${GUARD_ORIGIN_PATH}.0: a trusted origin must parse as a URL (a valid host, port 0 to 65535)`,
        origin,
      );
    }
    // Positive control: a well-formed dotted quad parses.
    const quad = openaiEntryWith(GUARD_ORIGINS, ["http://10.0.0.1:8080"]);
    deepStrictEqual(parseCatalogEntry(quad, "openai-decisions.json"), quad);
  });

  await test("every guard rejection comes from the guard: the same entry without it parses", () => {
    // Positive control for the rows above.
    const entry = openaiEntryWith(GUARD_AT, undefined);
    deepStrictEqual(parseCatalogEntry(entry, "openai-decisions.json"), entry);
  });
}

const XOR_PATTERN =
  "(context|prefill|prompt).{0,40}(length|limit|too long|exceed)|(too long|exceeds?).{0,40}(context|tokens)";
const PATTERN_AT = ["decide", "errors", "rules", 4, "messagePattern"] as const;
const BOUNDED = "must be bounded";
const COMPILES = "not a valid regular expression";

// Laya's fifth rule is `statusMin: 500`; a pattern on it is a new rule, not a
// duplicate, so each row below fails on its pattern alone.
const patternRejections: readonly Rejection[] = [
  [PATTERN_AT, "(a+)+", BOUNDED],
  [PATTERN_AT, ".*x", BOUNDED],
  [PATTERN_AT, "a*", BOUNDED],
  [PATTERN_AT, "a+", BOUNDED],
  [PATTERN_AT, "a*?", BOUNDED],
  [PATTERN_AT, "(?:ab)+", BOUNDED],
  [PATTERN_AT, "a{2,}", BOUNDED],
  [PATTERN_AT, "a{0,}", BOUNDED],
  [PATTERN_AT, "x\\d{10,}y", BOUNDED],
  [PATTERN_AT, "(a|b){1,}", BOUNDED],
  // An escaped backslash does not escape the quantifier after it, and an empty
  // class closes at once.
  [PATTERN_AT, "\\\\*", BOUNDED],
  [PATTERN_AT, "[]+", BOUNDED],
  [PATTERN_AT, "[a]*", BOUNDED],
  // A "[" inside a class is plain and the first "]" closes it, however the
  // class starts, so the quantifier after it is outside.
  [PATTERN_AT, "[[]+", BOUNDED],
  [PATTERN_AT, "[^]+", BOUNDED],
  // A quantified group repeats whatever its alternatives match, so
  // `(a|a){0,30}` backtracks 2^30 ways on a miss and `((a|a){0,9}){0,9}` far
  // more: no quantifier may follow an unescaped ")", bounded or not.
  [PATTERN_AT, "(a|a){0,30}", BOUNDED],
  [PATTERN_AT, "((a|a){0,9}){0,9}", BOUNDED],
  [PATTERN_AT, "(ab)?", BOUNDED],
  [PATTERN_AT, "(ab){2}", BOUNDED],
  [PATTERN_AT, "(?:ab){1,3}", BOUNDED],
  [PATTERN_AT, "(?=a)?", BOUNDED],
  // A count is a number of steps: 255 is the most one may take.
  [PATTERN_AT, "a{0,4294967295}", BOUNDED],
  [PATTERN_AT, "a{0,256}", BOUNDED],
  [PATTERN_AT, "a{256}", BOUNDED],
  [PATTERN_AT, "a{256,300}", BOUNDED],
  // Bounded counts still multiply when they sit side by side: each `?` is 2
  // ways, each `{n,m}` is m-n+1, and a pattern whose ways multiply past 4,096
  // can spend seconds on one miss (three adjacent `.{0,255}` took 38 s).
  [PATTERN_AT, ".{0,255}.{0,255}.{0,255}!", BOUNDED],
  [PATTERN_AT, ".{0,64}.{0,64}", BOUNDED],
  [PATTERN_AT, "a?".repeat(13), BOUNDED],
  [PATTERN_AT, "[", COMPILES],
  [PATTERN_AT, "(", COMPILES],
  [PATTERN_AT, "a)", COMPILES],
  [PATTERN_AT, "\\", COMPILES],
  [PATTERN_AT, "a{2,1}", COMPILES],
  [PATTERN_AT, "", "messagePattern"],
  [PATTERN_AT, "x".repeat(201), "messagePattern"],
  [PATTERN_AT, 5, "messagePattern"],
  [PATTERN_AT, null, "messagePattern"],
  [PATTERN_AT, true, "messagePattern"],
  [PATTERN_AT, ["a"], "messagePattern"],
  [PATTERN_AT, {}, "messagePattern"],
];

const patternAcceptances: readonly string[] = [
  XOR_PATTERN,
  "x",
  ".{0,40}",
  "s?",
  // 41 * 41 = 1,681 ways, and exactly 4,096 (twelve `?`) is the last accepted.
  ".{0,40}.{0,40}",
  "a?".repeat(12),
  // A fixed count and a non-capturing group's own `?` add no ways.
  "(?:a{255})",
  "a{2}",
  "a{2,5}",
  "(?:ab)",
  "a|b",
  "a{0,255}",
  "a{255}",
  ".{255,255}",
  "^start$",
  // Escaped, and inside a class, the three are plain characters.
  "\\*",
  "\\+",
  "a\\{2,}",
  "[*+]",
  "[a+*]{2}",
  "[\\]+]",
  "[^*]",
  "a[+]b",
  // An escaped or bracketed ")" closes no group, so a quantifier may follow.
  "a\\)?",
  "\\(a\\){0,3}",
  "[)]?",
  "[()]{2}",
  "\\\\\\*",
  "x".repeat(200),
];

async function messagePatternSection(): Promise<void> {
  section("decide entries: error rule messagePattern");

  await test("an unbounded, uncompilable, empty, over-long or non-string pattern is rejected, with the key in the message", () => {
    for (const [path, value, needle] of patternRejections) {
      const entry = entryWith(path, value);
      expectRejected(
        () => parseCatalogEntry(entry, "laya.json"),
        needle,
        `${path.join(".")} = ${JSON.stringify(value)}`,
      );
      expectRejected(
        () => parseCatalogEntry(entry, "laya.json"),
        "messagePattern",
        `${path.join(".")} = ${JSON.stringify(value)}`,
      );
    }
  });

  await test("a rejected pattern says why in the message", () => {
    const unbounded = failureOf(() =>
      parseCatalogEntry(entryWith(PATTERN_AT, "(a+)+"), "laya.json"),
    );
    assertIncludes(unbounded ?? "", "backtrack", "no reason was given");
    assertIncludes(unbounded ?? "", "{n,}", "the open quantifier is not named");
    assertIncludes(
      unbounded ?? "",
      "group",
      "the quantified group is not named",
    );
    assertIncludes(unbounded ?? "", "255", "the count limit is not named");
  });

  await test("a bounded pattern is accepted, XOR's among them, and survives parsing unchanged", () => {
    for (const pattern of patternAcceptances) {
      const entry = entryWith(PATTERN_AT, pattern);
      deepStrictEqual(parseCatalogEntry(entry, "laya.json"), entry);
      // Each accepted pattern must also compile with the engine's flags.
      new RegExp(pattern, "i");
    }
  });

  await test("a 200-character pattern is the longest accepted", () => {
    parseCatalogEntry(entryWith(PATTERN_AT, "x".repeat(200)), "laya.json");
    expectRejected(
      () =>
        parseCatalogEntry(entryWith(PATTERN_AT, "x".repeat(201)), "laya.json"),
      "messagePattern",
      "a 201-character pattern",
    );
  });

  const xorRules = [
    { status: 401, kind: "authentication" },
    { status: 413, kind: "max_tokens_exceeded" },
    { status: 429, kind: "rate_limit" },
    { status: 503, kind: "overloaded" },
    {
      statusMin: 500,
      messagePattern: XOR_PATTERN,
      kind: "max_tokens_exceeded",
    },
    { statusMin: 500, kind: "server" },
  ];

  await test("a pattern rule and a plain rule may share a statusMin or a status, as XOR's list does", () => {
    const entry = entryWith(["decide", "errors", "rules"], xorRules);
    deepStrictEqual(parseCatalogEntry(entry, "laya.json"), entry);
    const byStatus = entryWith(
      ["decide", "errors", "rules"],
      [
        { status: [500, 502], messagePattern: "a", kind: "overloaded" },
        { status: 500, kind: "server" },
        { statusMin: 400, kind: "invalid_request" },
      ],
    );
    deepStrictEqual(parseCatalogEntry(byStatus, "laya.json"), byStatus);
  });

  await test("two rules with the same statusMin or status and different patterns are accepted", () => {
    const entry = entryWith(
      ["decide", "errors", "rules"],
      [
        { statusMin: 500, messagePattern: "a", kind: "overloaded" },
        { statusMin: 500, messagePattern: "b", kind: "timeout" },
        { statusMin: 500, messagePattern: "A", kind: "network" },
        { status: 429, messagePattern: "a", kind: "rate_limit" },
        { status: [429, 430], messagePattern: "b", kind: "rate_limit" },
      ],
    );
    deepStrictEqual(parseCatalogEntry(entry, "laya.json"), entry);
  });

  await test("two rules with the same statusMin or status and equal patterns are rejected, and two plain ones still are", () => {
    const rejected: ReadonlyArray<readonly [unknown[], string]> = [
      [
        [
          { statusMin: 500, messagePattern: "a", kind: "overloaded" },
          { statusMin: 500, messagePattern: "a", kind: "server" },
        ],
        "statusMin 500",
      ],
      [
        [
          { status: 429, messagePattern: "a", kind: "rate_limit" },
          { status: [429, 430], messagePattern: "a", kind: "overloaded" },
        ],
        "status 429",
      ],
      [
        [
          { statusMin: 500, kind: "overloaded" },
          { statusMin: 500, kind: "server" },
        ],
        "statusMin 500",
      ],
      [
        [
          { status: 500, kind: "overloaded" },
          { status: [500], kind: "server" },
        ],
        "status 500",
      ],
      [
        [
          { statusMin: 500, messagePattern: "a", kind: "overloaded" },
          { statusMin: 500, kind: "server" },
          { statusMin: 500, messagePattern: "a", kind: "timeout" },
        ],
        "statusMin 500",
      ],
    ];
    for (const [rules, needle] of rejected) {
      expectRejected(
        () =>
          parseCatalogEntry(
            entryWith(["decide", "errors", "rules"], rules),
            "laya.json",
          ),
        `errors.rules lists ${needle} more than once`,
        JSON.stringify(rules),
      );
    }
  });

  await test("a rule still needs exactly one of status and statusMin, with or without a pattern", () => {
    for (const rule of [
      { messagePattern: "a", kind: "server" },
      { status: 500, statusMin: 500, messagePattern: "a", kind: "server" },
    ]) {
      expectRejected(
        () =>
          parseCatalogEntry(
            entryWith(["decide", "errors", "rules"], [rule]),
            "laya.json",
          ),
        ONE_OF,
        JSON.stringify(rule),
      );
    }
  });

  await test("Laya's entry carries no pattern, and parsing does not add one", () => {
    const parsed = parseCatalogEntry(structuredClone(LAYA_ENTRY), "laya.json");
    assert(
      isDecideCatalogEntry(parsed) &&
        parsed.decide.errors.rules.every((rule) => !("messagePattern" in rule)),
      "a Laya rule gained a messagePattern",
    );
  });
}

const HINT_AT = ["decide", "errors", "rules", 0, "hint"] as const;
const HINT_MAX = 300;

const hintRejections: readonly Rejection[] = [
  [HINT_AT, "", "hint"],
  [HINT_AT, "x".repeat(HINT_MAX + 1), "hint"],
  [HINT_AT, 5, "hint"],
  [HINT_AT, null, "hint"],
  [HINT_AT, true, "hint"],
  [HINT_AT, ["a"], "hint"],
  [HINT_AT, {}, "hint"],
  [HINT_AT, "Check {apiKey} first.", "{apiKeyEnvVar} placeholder"],
  [HINT_AT, "Check {apiKeyEnvVar first.", "{apiKeyEnvVar} placeholder"],
  [HINT_AT, "Check apiKeyEnvVar} first.", "{apiKeyEnvVar} placeholder"],
  [HINT_AT, "Check {{apiKeyEnvVar}} first.", "{apiKeyEnvVar} placeholder"],
  [HINT_AT, "Check {} first.", "{apiKeyEnvVar} placeholder"],
];

const hintAcceptances: readonly string[] = [
  "Check {apiKeyEnvVar} first.",
  "{apiKeyEnvVar} and {apiKeyEnvVar} again",
  "A hint with no placeholder.",
  "x".repeat(HINT_MAX),
];

async function errorHintSection(): Promise<void> {
  section("decide entries: error rule hint");

  await test("an empty, over-long, non-string or unknown-placeholder hint is rejected, with the key in the message", () => {
    for (const [path, value, needle] of hintRejections) {
      const entry = entryWith(path, value);
      expectRejected(
        () => parseCatalogEntry(entry, "laya.json"),
        needle,
        `${path.join(".")} = ${JSON.stringify(value)}`,
      );
    }
  });

  await test("a hint, with or without {apiKeyEnvVar}, is accepted and survives parsing unchanged", () => {
    for (const hint of hintAcceptances) {
      const entry = entryWith(HINT_AT, hint);
      deepStrictEqual(parseCatalogEntry(entry, "laya.json"), entry);
    }
  });

  await test("a hint sits on one rule and does not make two rules on the same status collide", () => {
    const entry = entryWith(
      ["decide", "errors", "rules"],
      [
        { status: 402, kind: "invalid_request", hint: "Check {apiKeyEnvVar}." },
        { status: 422, kind: "invalid_request" },
      ],
    );
    deepStrictEqual(parseCatalogEntry(entry, "laya.json"), entry);
  });

  await test("Laya's entry carries no hint, and parsing does not add one", () => {
    const parsed = parseCatalogEntry(structuredClone(LAYA_ENTRY), "laya.json");
    assert(
      isDecideCatalogEntry(parsed) &&
        parsed.decide.errors.rules.every((rule) => !("hint" in rule)),
      "a Laya rule gained a hint",
    );
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

  await test("declares decide.baseURLShape, and lists the same transforms and shapes the schema accepts", () => {
    deepStrictEqual(
      undeclaredKeys(
        entryWith(["decide", "baseURLShape"], "origin"),
        mirror,
        "",
      ),
      [],
    );
    const { baseURLNormalize, baseURLShape } = (
      mirror as {
        properties: {
          decide: {
            properties: {
              baseURLNormalize: { items: { enum: string[] } };
              baseURLShape: { enum: string[] };
            };
          };
        };
      }
    ).properties.decide.properties;
    // Mirror to schema: every value the editor offers parses.
    for (const transform of baseURLNormalize.items.enum) {
      parseCatalogEntry(entryWith(["decide", "baseURLNormalize"], [transform]));
    }
    for (const shape of baseURLShape.enum) {
      parseCatalogEntry(entryWith(["decide", "baseURLShape"], shape));
    }
    // Schema to mirror: the values the schema accepts (the two tests above
    // parse exactly these) are all offered.
    deepStrictEqual([...baseURLNormalize.items.enum].sort(), [
      "strip-trailing-slash",
      "strip-v1-suffix",
    ]);
    deepStrictEqual(baseURLShape.enum, ["origin"]);
  });

  await test("declares decide.authHeader and decide.stateEncoding as optional, and the mirror and the schema agree on their values", () => {
    for (const [key, value] of [
      ["authHeader", "bearer"],
      ["authHeader", "x-api-key"],
      ["stateEncoding", "text"],
    ]) {
      deepStrictEqual(
        undeclaredKeys(entryWith(["decide", key], value), mirror, ""),
        [],
        `the mirror does not declare decide.${key}`,
      );
    }
    const decide = (
      mirror as {
        properties: {
          decide: {
            required: string[];
            properties: {
              authHeader?: { enum: string[] };
              stateEncoding?: { enum: string[] };
            };
          };
        };
      }
    ).properties.decide;
    const { authHeader, stateEncoding } = decide.properties;
    assertNotNull(authHeader, "the mirror lacks decide.authHeader");
    assertNotNull(stateEncoding, "the mirror lacks decide.stateEncoding");
    // Mirror to schema: every value the editor offers parses.
    for (const value of authHeader.enum) {
      parseCatalogEntry(entryWith(["decide", "authHeader"], value));
    }
    for (const value of stateEncoding.enum) {
      parseCatalogEntry(entryWith(["decide", "stateEncoding"], value));
    }
    // Schema to mirror: the values the schema accepts are all offered, and nothing else is.
    deepStrictEqual([...authHeader.enum].sort(), ["bearer", "x-api-key"]);
    deepStrictEqual(stateEncoding.enum, ["text"]);
    for (const key of ["authHeader", "stateEncoding"]) {
      assert(
        !decide.required.includes(key),
        `the mirror requires decide.${key}, which the schema leaves optional`,
      );
    }
    // A value the editor does not offer is a value the schema refuses.
    for (const value of AUTH_HEADER_REFUSED) {
      assert(
        !authHeader.enum.includes(value as string),
        "the mirror offers an authHeader the schema refuses",
      );
    }
    for (const value of STATE_ENCODING_REFUSED) {
      assert(
        !stateEncoding.enum.includes(value as string),
        "the mirror offers a stateEncoding the schema refuses",
      );
    }
  });

  await test("offers exactly the dialects the schema accepts and the registry serves, and each one parses in the right entry", () => {
    const { dialect } = (
      mirror as {
        properties: { decide: { properties: { dialect: { enum: string[] } } } };
      }
    ).properties.decide.properties;
    // Mirror to schema: every dialect the editor offers parses on an entry that suits it.
    const entries: Record<string, Record<string, unknown>> = {
      "system-one": structuredClone(LAYA_ENTRY),
      "openai-decisions": structuredClone(OPENAI_DECISIONS_ENTRY),
    };
    for (const name of dialect.enum) {
      const entry = entries[name];
      assert(
        entry !== undefined,
        "the mirror offers a dialect with no sample entry",
      );
      setAt(entry, ["decide", "dialect"], name);
      parseCatalogEntry(entry, "x.json");
      assertNotNull(
        getDecisionDialect(name as DecideDialectName),
        "the registry does not serve a dialect the mirror offers",
      );
    }
    // Schema to mirror: the two the schema accepts are both offered, and nothing else is.
    deepStrictEqual([...dialect.enum].sort(), [
      "openai-decisions",
      "system-one",
    ]);
    expectRejected(
      () =>
        parseCatalogEntry(
          entryWith(["decide", "dialect"], "openai"),
          "laya.json",
        ),
      "decide.dialect",
      "a dialect neither the mirror nor the schema offers",
    );
    // The sample list above is the registry's: a name that has no sample is a name the mirror cannot omit.
    deepStrictEqual(Object.keys(entries).sort(), [...dialect.enum].sort());
  });

  await test("declares decide.ambientKeyGuard, and the mirror and the schema agree on a variable name's shape, an origin's shape and the array bounds", () => {
    deepStrictEqual(
      undeclaredKeys(structuredClone(OPENAI_DECISIONS_ENTRY), mirror, ""),
      [],
    );
    type GuardNode = {
      type?: string;
      required?: string[];
      additionalProperties?: boolean;
      minItems?: number;
      maxItems?: number;
      uniqueItems?: boolean;
      maxLength?: number;
      pattern?: string;
      items?: {
        type?: string;
        pattern?: string;
        maxLength?: number;
        required?: string[];
        additionalProperties?: boolean;
        properties?: Record<
          string,
          {
            type?: string;
            pattern?: string;
            maxLength?: number;
            enum?: string[];
          }
        >;
      };
      description?: string;
      properties?: Record<string, GuardNode>;
    };
    const guard = (
      mirror as {
        properties: { decide: { properties: Record<string, GuardNode> } };
      }
    ).properties.decide.properties.ambientKeyGuard;
    assertNotNull(guard, "the mirror lacks decide.ambientKeyGuard");
    deepStrictEqual([...(guard.required ?? [])].sort(), [
      "baseURLEnvVars",
      "trustedOrigins",
    ]);
    assert(
      guard.additionalProperties === false,
      "decide.ambientKeyGuard is open",
    );
    const envs = guard.properties?.baseURLEnvVars;
    const origins = guard.properties?.trustedOrigins;
    assertNotNull(envs, "the mirror lacks baseURLEnvVars");
    assertNotNull(origins, "the mirror lacks trustedOrigins");
    for (const node of [envs, origins]) {
      assert(
        node.type === "array" &&
          node.minItems === 1 &&
          node.maxItems === 8 &&
          node.uniqueItems === true,
        "an array of one to eight unique entries",
      );
    }
    const envPattern = new RegExp(envs.items?.pattern ?? "(?!)");
    const originPattern = new RegExp(origins.items?.pattern ?? "(?!)");
    const envMax = envs.items?.maxLength ?? 0;
    const originMax = origins.items?.maxLength ?? 0;

    // Mirror to schema and back, sample by sample: a name or an origin the
    // editor offers parses, one it refuses is refused by the schema too.
    const envSamples = [
      "A",
      "OPENAI_BASE_URL",
      "OPENAI_API_BASE",
      "A1_B2",
      "A".repeat(64),
      ...notEnvNames,
    ];
    for (const sample of envSamples) {
      const mirrorAccepts = envPattern.test(sample) && sample.length <= envMax;
      const schemaAccepts =
        failureOf(() =>
          parseCatalogEntry(
            openaiEntryWith(GUARD_ENVS, [sample]),
            "openai-decisions.json",
          ),
        ) === undefined;
      assert(
        mirrorAccepts === schemaAccepts,
        "the mirror and the schema disagree about a variable name",
      );
    }
    const originSamples = [
      "https://api.openai.com",
      "https://eu.api.openai.com",
      "http://localhost:4000",
      "http://127.0.0.1",
      "https://api.openai.com:8443",
      "https://a-b.example.test",
      ...notOrigins.filter((origin) => !origin.endsWith(":123456")),
    ];
    for (const sample of originSamples) {
      const mirrorAccepts =
        originPattern.test(sample) && sample.length <= originMax;
      const schemaAccepts =
        failureOf(() =>
          parseCatalogEntry(
            openaiEntryWith(GUARD_ORIGINS, [sample]),
            "openai-decisions.json",
          ),
        ) === undefined;
      assert(
        mirrorAccepts === schemaAccepts,
        "the mirror and the schema disagree about a trusted origin",
      );
    }
    // credentialBaseURLs: optional (not in `required`, checked above), the same
    // bounds, objects of a key and the one field the engine reads.
    const creds = guard.properties?.credentialBaseURLs;
    assertNotNull(creds, "the mirror lacks credentialBaseURLs");
    assert(
      creds.type === "array" &&
        creds.minItems === 1 &&
        creds.maxItems === 8 &&
        creds.uniqueItems === true &&
        creds.items?.type === "object" &&
        creds.items.additionalProperties === false,
      "credentialBaseURLs is not a bounded, unique array of closed objects",
    );
    deepStrictEqual([...(creds.items?.required ?? [])].sort(), [
      "field",
      "key",
    ]);
    const keyNode = creds.items?.properties?.key;
    const fieldNode = creds.items?.properties?.field;
    assertNotNull(keyNode, "the mirror lacks credentialBaseURLs[].key");
    assertNotNull(fieldNode, "the mirror lacks credentialBaseURLs[].field");
    deepStrictEqual(fieldNode.enum, ["baseURL"]);
    const keyPattern = new RegExp(keyNode.pattern ?? "(?!)");
    const keyMax = keyNode.maxLength ?? 0;
    const keySamples = [
      "openai",
      "a",
      "perplexityDecider",
      "a".repeat(64),
      "OpenAI9",
      ...notCredentialKeys,
    ];
    for (const sample of keySamples) {
      const mirrorAccepts = keyPattern.test(sample) && sample.length <= keyMax;
      const schemaAccepts =
        failureOf(() =>
          parseCatalogEntry(
            openaiEntryWith(GUARD_CREDS, [{ key: sample, field: "baseURL" }]),
            "openai-decisions.json",
          ),
        ) === undefined;
      assert(
        mirrorAccepts === schemaAccepts,
        "the mirror and the schema disagree about a credentials key",
      );
    }
    assert(
      keySamples.some((sample) => keyPattern.test(sample)) &&
        keySamples.some((sample) => !keyPattern.test(sample)),
      "the samples never separate accepted credentials keys from refused ones",
    );
    // The rules JSON Schema cannot say are named in the description, so the
    // editor's author is told: the origin's host and port must parse, a list
    // may not repeat an entry, and the provider's own variable is not listed.
    const description = guard.description ?? "";
    for (const named of [
      "valid host",
      "port above 65535",
      "twice",
      "own base-URL variable",
    ]) {
      assert(
        description.includes(named),
        "the mirror's description leaves a schema-only rule unnamed",
      );
    }
    assert(
      envSamples.some((sample) => envPattern.test(sample)) &&
        envSamples.some((sample) => !envPattern.test(sample)) &&
        originSamples.some((sample) => originPattern.test(sample)) &&
        originSamples.some((sample) => !originPattern.test(sample)),
      "the samples never separate accepted values from refused ones",
    );
  });

  await test("declares the rule messagePattern as a string of 1 to 200 characters, and the schema agrees at both edges", () => {
    deepStrictEqual(undeclaredKeys(entryWith(PATTERN_AT, "x"), mirror, ""), []);
    const { properties } = (
      mirror as {
        properties: {
          decide: {
            properties: {
              errors: {
                properties: {
                  rules: {
                    items: {
                      properties: Record<
                        string,
                        {
                          type?: string;
                          minLength?: number;
                          maxLength?: number;
                        }
                      >;
                    };
                  };
                };
              };
            };
          };
        };
      }
    ).properties.decide.properties.errors.properties.rules.items;
    const { type, minLength, maxLength } = properties.messagePattern ?? {};
    deepStrictEqual([type, minLength, maxLength], ["string", 1, 200]);
    // Mirror to schema: the edges it offers parse, and one step beyond each is
    // refused by the schema as well.
    for (const length of [minLength, maxLength]) {
      parseCatalogEntry(entryWith(PATTERN_AT, "x".repeat(length ?? 0)));
    }
    for (const length of [(minLength ?? 1) - 1, (maxLength ?? 0) + 1]) {
      expectRejected(
        () => parseCatalogEntry(entryWith(PATTERN_AT, "x".repeat(length))),
        "messagePattern",
        "a length outside the mirror's bounds",
      );
    }
  });

  await test("declares decide.media and decisionLimits.media, and the mirror and the schema agree on a body key's shape and the allowance's bounds", () => {
    deepStrictEqual(undeclaredKeys(mediaBase(), mirror, ""), []);
    type MirrorNode = {
      type?: string;
      $ref?: string;
      pattern?: string;
      minimum?: number;
      required?: string[];
      additionalProperties?: boolean;
      not?: { enum?: string[] };
      properties?: Record<string, MirrorNode>;
    };
    const root = mirror as {
      properties: {
        decide: MirrorNode;
        decisionLimits: MirrorNode;
      };
      definitions: Record<string, MirrorNode>;
    };
    const keys = root.properties.decide.properties?.media;
    const allowance = root.properties.decisionLimits.properties?.media;
    assertNotNull(keys, "the mirror lacks decide.media");
    assertNotNull(allowance, "the mirror lacks decisionLimits.media");
    deepStrictEqual(keys.required, ["imagesKey"]);
    assert(keys.additionalProperties === false, "decide.media is open");
    deepStrictEqual(Object.keys(keys.properties ?? {}).sort(), [
      "audioKey",
      "imagesKey",
      "videoKey",
    ]);
    deepStrictEqual([...(allowance.required ?? [])].sort(), [
      "maxImages",
      "maxRequestBytes",
      "video",
    ]);
    assert(
      allowance.additionalProperties === false,
      "decisionLimits.media is open",
    );
    const bounds = allowance.properties ?? {};
    for (const name of ["maxImages", "maxRequestBytes"]) {
      assert(
        bounds[name]?.type === "integer" && bounds[name]?.minimum === 1,
        `${name} is not an integer of at least 1 in the mirror`,
      );
    }
    assert(bounds.video?.type === "boolean", "video is not a boolean");
    // Mirror to schema: the minimum the editor offers parses, one below is refused.
    parseCatalogEntry(
      mediaEntryWith(["decisionLimits", "media"], {
        maxImages: 1,
        video: true,
        maxRequestBytes: 1,
      }),
    );

    // Both key properties share one definition; the schema must agree with it
    // on every sample, in both directions.
    const refs = ["imagesKey", "videoKey", "audioKey"].map(
      (name) => keys.properties?.[name]?.$ref,
    );
    assert(
      refs[0] !== undefined && refs[0] === refs[1] && refs[0] === refs[2],
      "the three keys do not share one definition",
    );
    const definition = root.definitions[(refs[0] ?? "").split("/").pop() ?? ""];
    const pattern = new RegExp(definition?.pattern ?? "(?!)");
    const barred = definition?.not?.enum ?? [];
    deepStrictEqual([...barred].sort(), [...RESERVED_BODY_KEYS].sort());
    const samples = [
      "images",
      "video",
      "Image_list2",
      "a",
      "x".repeat(200),
      "",
      "1a",
      "_a",
      "a-b",
      "a b",
      "images\n",
      "na\u00efve",
      "model2",
      ...RESERVED_BODY_KEYS,
    ];
    for (const sample of samples) {
      const mirrorAccepts = pattern.test(sample) && !barred.includes(sample);
      // The video key is moved off the sample, which may be "video" itself.
      const entry = mediaEntryWith(MEDIA_IMAGES_KEY, sample);
      setAt(entry, MEDIA_VIDEO_KEY, "clip");
      const schemaAccepts =
        failureOf(() => parseCatalogEntry(entry, "xor.json")) === undefined;
      assert(
        mirrorAccepts === schemaAccepts,
        "the mirror and the schema disagree about a media key",
      );
    }
    assert(
      samples.some((sample) => pattern.test(sample)) &&
        samples.some((sample) => !pattern.test(sample)),
      "the samples never separate accepted keys from refused ones",
    );
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
  await decideAuthAndStateSection();
  await mediaSection();
  await questionTypesSection();
  await openaiDecisionsSection();
  await ambientKeyGuardSection();
  await messagePatternSection();
  await errorHintSection();
  await decideCrossRulesSection();
  await defaultModelWindowSection();
  await unsupportedWireSection();
  await mirrorSection();
  await codegenMirrorSection();
});
