#!/usr/bin/env tsx
/**
 * Decide provider contract helper suite: the fixture reader, the generic
 * loop's cases and its controls. Offline: every request goes to a fetch mock.
 *
 * The provider under test is built from dist by
 * test/helpers/decideProviderContract.ts, which carries the determinism
 * exception to CLAUDE.md rule 15 (listed in the `allow` array of
 * neurolink/e2e-tests-only in eslint.config.js); this suite imports nothing
 * from src/ or dist/ at run time itself. No request leaves the process: each
 * case clears every proxy variable and the entry's own variables, sets fake
 * credentials and .test hosts, and checks the mock saw the request before
 * anything else. The cases at the end prove the loop refuses a case that
 * measures nothing, so a green run cannot mean a harness that intercepts
 * nothing.
 *
 * The last cases run tools/scaffold-provider.ts --kind=decide into temporary
 * directories (child processes, no network): they fill the emitted catalog entry
 * in, validate it with the codegen tool and run the emitted fixture through the
 * loop, so the starting point every later decide provider copies is known to work.
 *
 * Run: pnpm run test:decide-contract
 */
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { inspect, isDeepStrictEqual } from "node:util";
import {
  assert,
  defineSuite,
  runCommand,
  tempDir,
  type ProcessResult,
} from "./helpers/harness.js";
import {
  DECIDE_FIXTURE_ROOT,
  parseDecideContractFixture,
  readDecideContractFixture,
  type DecideContractFixture,
} from "./helpers/decideContractFixture.js";
import { assertDistFresh } from "./helpers/distFreshness.js";
import { LAYA_ENTRY } from "./helpers/decideFixtures.js";
import { LAYA_INLINE_CONTRACT } from "./helpers/layaInlineContract.js";
import {
  buildContractCases,
  causeCarries,
  decideEnvNames,
  descriptorEnvVars,
  firstOverWindow,
  loadContractFixture,
  loadEstimator,
  loopCoverageProblem,
  ODD_BODIES,
  oddBodyProblem,
  parseDecideEntry,
  runContractCases,
  runDecideProviderContract,
  strayPlaceholder,
  type CaseContext,
  type ContractCase,
  type DecideContractRun,
  type Failure,
} from "./helpers/decideProviderContract.js";
import type { DecideCatalogJson } from "../src/lib/types/index.js";
import type { TestRecord } from "./utils/mockFetch.js";

assertDistFresh();

const { test, runSuite } = defineSuite("Decide Provider Contract", {
  offline: true,
});

// scaffold --kind=decide: every run of the tool is started here. Each is a child
// process with a second or more of start-up under load, so starting them first
// lets that cost overlap the sleep-bound loops below; the tests at the end of the
// file only read the results.
const section = (value: unknown): Record<string, unknown> =>
  typeof value === "object" && value !== null
    ? Object.fromEntries(Object.entries(value))
    : {};
const readJson = (file: string): Record<string, unknown> =>
  section(JSON.parse(readFileSync(file, "utf8")));

type ScaffoldRun = {
  readonly out: string;
  readonly done: Promise<ProcessResult>;
};

// The local tsx binary, not `pnpm exec tsx`: pnpm may have to fetch the version
// the repo pins, which an isolated run (empty home, no network) cannot do.
const runTool = (
  tool: string,
  args: readonly string[],
  timeoutMs: number,
): Promise<ProcessResult> =>
  runCommand(
    join(process.cwd(), "node_modules", ".bin", "tsx"),
    [`tools/${tool}.ts`, ...args],
    { cwd: process.cwd(), timeoutMs },
  );

function scaffold(
  args: readonly string[],
  out: string = tempDir("scaffold-decide-"),
): ScaffoldRun {
  const done = runTool("scaffold-provider", [...args, `--out=${out}`], 120_000);
  // A test reads the result later; a rejection must not count as unhandled before.
  done.catch(() => undefined);
  return { out, done };
}

const HOSTILE_MODEL = 'm"x\\y';
const SELF_HOSTED_MODEL = "acme-1";
// The hand-written and built-in decide providers hold 1 to 8; a filled-in scaffold needs a free number.
const FREE_ORDER = { selfHosted: 91, builtIn: 92 } as const;

const selfHosted = scaffold([
  "--kind=decide",
  "--name=acme-decide",
  `--defaultModel=${SELF_HOSTED_MODEL}`,
]);
const builtIn = scaffold([
  "--kind=decide",
  "--name=acme",
  `--defaultModel=${HOSTILE_MODEL}`,
  "--baseURL=https://api.acme.test/v1",
  "--envVar=ACME_TOKEN",
  "--aliases=a1,a2",
]);
const tier2 = scaffold(
  [
    "--name=zeta",
    "--tier=2",
    "--defaultModel=m1",
    "--baseURL=https://api.zeta.test/v1",
  ],
  tempDir("scaffold-tier2-"),
);
const refusalOut = tempDir("scaffold-decide-");
const refusals = (
  [
    {
      args: ["--kind=decide", "--name=acme", "--defaultModel=m", "--tier=2"],
      mention: "--tier does not apply",
      sayNothingOfTiers: false,
    },
    {
      args: ["--kind=bogus", "--name=acme", "--defaultModel=m"],
      mention: "--kind must be",
      sayNothingOfTiers: true,
    },
    {
      args: ["--kind=decide", "--name=../escape", "--defaultModel=m"],
      mention: "kebab-case",
      sayNothingOfTiers: true,
    },
    {
      args: ["--kind=decide", "--name=acme"],
      mention: "Usage",
      sayNothingOfTiers: true,
    },
  ] as const
).map((refusal) => ({ ...refusal, run: scaffold(refusal.args, refusalOut) }));

// The scaffold carries markers by design: a catalog file that validates only
// after the author replaces them. This replaces every one, so the filled file
// is what a finished author's file looks like.
function fillScaffolded(
  raw: Record<string, unknown>,
  order: number,
): Record<string, unknown> {
  const models = section(raw.models);
  const catalog = Object.fromEntries(
    Object.entries(section(models.catalog)).map(([id, spec]) => [
      id,
      {
        ...section(spec),
        ...(id === models.default
          ? { contextWindow: 4096, maxOutputTokens: 512 }
          : {}),
        description: "Acme checkpoint",
      },
    ]),
  );
  const decide = section(raw.decide);
  return {
    ...raw,
    displayName: "Acme",
    models: { ...models, catalog },
    decisionLimits: { ...section(raw.decisionLimits), maxStateTokens: 320 },
    decide: {
      ...decide,
      order,
      endpoint: String(decide.endpoint).replace("TODO-path", "v1/decide"),
    },
    setup: {
      ...section(raw.setup),
      url: "https://console.acme.test/keys",
      billingPolicy: "free-tier",
      instructions: [
        "1. Visit: https://console.acme.test/keys",
        "2. Create an API key",
        "3. Set {apiKeyEnvVar} in your .env file",
      ],
    },
    evidence: {
      ...section(raw.evidence),
      rosterVerified: {
        date: "2026-10-10",
        method: "authenticated GET /v1/models",
      },
      addedInPR: "https://github.com/juspay/neurolink/pull/1",
    },
  };
}

const validated = Promise.all([selfHosted.done, builtIn.done]).then(
  async () => {
    const catalogDir = (files: Readonly<Record<string, string>>): string => {
      const dir = tempDir("scaffold-validate-");
      for (const [name, text] of Object.entries(files)) {
        writeFileSync(join(dir, name), text);
      }
      return dir;
    };
    const validate = (dir: string): Promise<ProcessResult> =>
      runTool("codegen-catalog", ["--validate-only", "--dir", dir], 180_000);
    const written = {
      selfHosted: readFileSync(
        join(selfHosted.out, "acme-decide.json"),
        "utf8",
      ),
      builtIn: readFileSync(join(builtIn.out, "acme.json"), "utf8"),
    };
    const filled = {
      selfHosted: fillScaffolded(
        section(JSON.parse(written.selfHosted)),
        FREE_ORDER.selfHosted,
      ),
      builtIn: fillScaffolded(
        section(JSON.parse(written.builtIn)),
        FREE_ORDER.builtIn,
      ),
    };
    const [unfilledSelfHosted, unfilledBuiltIn, bothFilled] = await Promise.all(
      [
        validate(catalogDir({ "acme-decide.json": written.selfHosted })),
        validate(catalogDir({ "acme.json": written.builtIn })),
        validate(
          catalogDir({
            "acme-decide.json": JSON.stringify(filled.selfHosted, null, 2),
            "acme.json": JSON.stringify(filled.builtIn, null, 2),
          }),
        ),
      ],
    );
    return {
      written,
      filled,
      unfilledSelfHosted,
      unfilledBuiltIn,
      bothFilled,
    };
  },
);
validated.catch(() => undefined);

const VALID = {
  version: 1,
  id: "acme",
  success: {
    headers: { "x-request-id": "r1" },
    body: { answers: {} },
    expected: {
      model: "m1",
      answers: { urgent: { type: "boolean", probability: 0.9 } },
    },
  },
  errors: [
    {
      label: "bad key",
      provenance: "seen-live",
      status: 401,
      body: { error: "no" },
      expect: { kind: "authentication", retryable: false },
    },
  ],
};
const withError = (patch: Record<string, unknown>) => ({
  ...VALID,
  errors: [{ ...VALID.errors[0], ...patch }],
});
const withSuccess = (patch: Record<string, unknown>) => ({
  ...VALID,
  success: { ...VALID.success, ...patch },
});
const withExpected = (patch: Record<string, unknown>) =>
  withSuccess({ expected: { ...VALID.success.expected, ...patch } });
const withExpect = (patch: Record<string, unknown>) =>
  withError({ expect: { ...VALID.errors[0].expect, ...patch } });

function messageOf(run: () => unknown): string {
  try {
    run();
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
  return "";
}
function errorOf(run: () => unknown): unknown {
  try {
    run();
  } catch (error) {
    return error;
  }
  return undefined;
}
function throwsWith(run: () => unknown, mention: string): void {
  const message = messageOf(run);
  assert(message.includes(mention), `expected "${mention}" in "${message}"`);
}
const parse = (raw: unknown) => () => parseDecideContractFixture(raw, "inline");

// Built at run time so no key-shaped literal sits in this file.
const FAKE = "Zq9xKm2L".repeat(3);
const HASH = "9f2c0e41".repeat(8);
const ID32 = "0123456789abcdef".repeat(2);
const SPAN16 = "0f067aa0".repeat(2);
const HEX_RUN_SHAPE = "a long hex run";
const RECEIVED_SHAPE = 'a key echoed after "Received API Key ="';

await test("a well-formed fixture parses and keeps provenance and expectations", () => {
  const parsed = parseDecideContractFixture(VALID, "inline");
  assert(parsed.errors[0].provenance === "seen-live", "provenance kept");
  assert(parsed.errors[0].expect.retryable === false, "retryable kept");
  assert(parsed.success.expected.model === "m1", "expected model kept");
});

await test("every optional field is kept when it is present", () => {
  const full = {
    ...VALID,
    success: {
      headers: { "x-request-id": "r1" },
      body: { answers: {} },
      expected: {
        model: "m1",
        answers: { urgent: { type: "boolean", probability: 0.9 } },
        requestId: "r1",
        inputTokens: 12,
      },
    },
    errors: [
      {
        ...VALID.errors[0],
        headers: { "retry-after": "2" },
        expect: {
          kind: "rate_limit",
          retryable: true,
          messageIncludes: ["limit"],
          messageExcludes: ["secret"],
        },
      },
    ],
  };
  const parsed = parseDecideContractFixture(full, "inline");
  const failure = parsed.errors[0];
  assert(parsed.success.headers?.["x-request-id"] === "r1", "success headers");
  assert(parsed.success.expected.requestId === "r1", "expected request id");
  assert(parsed.success.expected.inputTokens === 12, "expected input tokens");
  assert(failure.headers?.["retry-after"] === "2", "error headers");
  assert(failure.expect.kind === "rate_limit", "kind kept");
  assert(failure.expect.messageIncludes?.[0] === "limit", "includes kept");
  assert(failure.expect.messageExcludes?.[0] === "secret", "excludes kept");
  const bare = parseDecideContractFixture(VALID, "inline");
  assert(bare.success.expected.requestId === undefined, "no request id");
  assert(bare.success.expected.inputTokens === undefined, "no input tokens");
  assert(bare.errors[0].headers === undefined, "no error headers");
  assert(bare.errors[0].expect.messageIncludes === undefined, "no includes");
});

await test("a malformed fixture is rejected with the path of the bad field", () => {
  const { expected, headers } = VALID.success;
  throwsWith(parse("text"), "root");
  throwsWith(parse({ ...VALID, version: 2 }), "version");
  throwsWith(parse({ ...VALID, id: "Bad Id" }), "id");
  throwsWith(parse({ ...VALID, errors: [] }), "errors");
  throwsWith(parse({ ...VALID, success: { expected } }), "success.body");
  throwsWith(
    parse({
      ...VALID,
      success: { headers, body: {}, expected: { model: "m" } },
    }),
    "success.expected.answers",
  );
  throwsWith(
    parse({ ...VALID, success: { ...VALID.success, headers: { a: 1 } } }),
    "success.headers",
  );
  throwsWith(
    parse({ ...VALID, errors: [VALID.errors[0], VALID.errors[0]] }),
    "repeats the label",
  );
  throwsWith(parse(withError({ label: "  " })), "errors[0].label");
  throwsWith(parse(withError({ provenance: "guess" })), "errors[0].provenance");
  throwsWith(parse(withError({ status: 200 })), "errors[0].status");
  throwsWith(parse(withError({ status: 401.5 })), "errors[0].status");
  throwsWith(
    parse(withError({ body: undefined })),
    "errors[0].body is required",
  );
  const noBody = Object.fromEntries(
    Object.entries(VALID.errors[0]).filter(([key]) => key !== "body"),
  );
  throwsWith(
    parse({ ...VALID, errors: [noBody] }),
    "errors[0].body is required",
  );
  throwsWith(
    parse(withError({ expect: { kind: "auth", retryable: false } })),
    "errors[0].expect.kind",
  );
  throwsWith(
    parse(withError({ expect: { kind: "authentication", retryable: "no" } })),
    "errors[0].expect.retryable",
  );
});

await test("reading by id finds the file, checks the id and refuses hostile ids", () => {
  const root = tempDir("decide-fixture-");
  const put = (dir: string, text: string): void => {
    mkdirSync(join(root, dir));
    writeFileSync(join(root, dir, "contract.json"), text);
  };
  put("acme", JSON.stringify(VALID));
  put("other", JSON.stringify(VALID));
  put("broken", "{ nope");
  assert(readDecideContractFixture("acme", root).id === "acme", "reads acme");
  throwsWith(
    () => readDecideContractFixture("other", root),
    "does not match its directory",
  );
  throwsWith(() => readDecideContractFixture("broken", root), "not valid JSON");
  throwsWith(
    () => readDecideContractFixture("missing", root),
    "contract fixture missing",
  );
  throwsWith(
    () => readDecideContractFixture("../etc", root),
    "not a provider id",
  );
});

await test("a field the shape does not name is refused with its path", () => {
  const expectedFields = (field: string): string => `${field} is not a known`;
  throwsWith(parse({ ...VALID, extra: 1 }), expectedFields("extra"));
  throwsWith(parse(withSuccess({ extra: 1 })), expectedFields("success.extra"));
  throwsWith(
    parse(withExpected({ extra: 1 })),
    expectedFields("success.expected.extra"),
  );
  throwsWith(parse(withError({ extra: 1 })), expectedFields("errors[0].extra"));
  // The typo that would silently drop a "the key is not in the message" check.
  throwsWith(
    parse(withExpect({ messageExclude: ["x"] })),
    expectedFields("errors[0].expect.messageExclude"),
  );
  throwsWith(
    parse(withExpect({ extra: 1 })),
    "messageIncludes, messageExcludes",
  );
  const keyedLikeACredential = { ...VALID, [`sk-${FAKE}`]: 1 };
  const message = messageOf(parse(keyedLikeACredential));
  assert(message.includes("<key withheld>"), `key withheld in "${message}"`);
  assert(
    !message.includes(FAKE),
    "an unknown key shaped like a key is not echoed",
  );
});

await test("values of the wrong type or the wrong container are refused with their path", () => {
  const cases: readonly (readonly [unknown, string])[] = [
    [null, "root"],
    [[], "root"],
    [Object.create({ inherited: 1 }), "root"],
    [{ ...VALID, success: null }, "success"],
    [{ ...VALID, success: [] }, "success"],
    [withSuccess({ expected: null }), "success.expected"],
    [withSuccess({ expected: [] }), "success.expected"],
    [withSuccess({ headers: [] }), "success.headers"],
    [withSuccess({ headers: null }), "success.headers"],
    [withExpected({ answers: [] }), "success.expected.answers"],
    [withExpected({ answers: null }), "success.expected.answers"],
    [withExpected({ answers: {} }), "success.expected.answers"],
    [withExpected({ model: "" }), "success.expected.model"],
    [withExpected({ model: 3 }), "success.expected.model"],
    [withExpected({ requestId: 3 }), "success.expected.requestId"],
    [{ ...VALID, errors: null }, "errors"],
    [{ ...VALID, errors: {} }, "errors"],
    [{ ...VALID, errors: [null] }, "errors[0]"],
    [{ ...VALID, errors: [[]] }, "errors[0]"],
    [withError({ headers: [] }), "errors[0].headers"],
    [withError({ headers: null }), "errors[0].headers"],
    [withError({ headers: { a: 1 } }), "errors[0].headers"],
    [withError({ expect: null }), "errors[0].expect"],
    [withError({ expect: [] }), "errors[0].expect"],
    [withError({ label: 7 }), "errors[0].label"],
    [withError({ status: "401" }), "errors[0].status"],
    [withError({ status: 399 }), "errors[0].status"],
    [withError({ status: 600 }), "errors[0].status"],
    [withExpect({ kind: "constructor" }), "errors[0].expect.kind"],
    [withExpect({ kind: 7 }), "errors[0].expect.kind"],
    [withExpect({ retryable: 1 }), "errors[0].expect.retryable"],
    [withExpect({ messageIncludes: "x" }), "errors[0].expect.messageIncludes"],
    [withExpect({ messageIncludes: {} }), "errors[0].expect.messageIncludes"],
    [withExpect({ messageIncludes: [1] }), "errors[0].expect.messageIncludes"],
    [withExpect({ messageIncludes: [""] }), "errors[0].expect.messageIncludes"],
    [
      withExpect({ messageIncludes: ["ok", 1] }),
      "errors[0].expect.messageIncludes",
    ],
    [
      withExpect({ messageIncludes: ["ok", ""] }),
      "errors[0].expect.messageIncludes",
    ],
    [
      withExpect({ messageExcludes: ["ok", null] }),
      "errors[0].expect.messageExcludes",
    ],
    [withError({ headers: { a: "x", b: 1 } }), "errors[0].headers"],
    [withSuccess({ headers: { a: "x", b: 1 } }), "success.headers"],
    [
      withExpect({ messageExcludes: [null] }),
      "errors[0].expect.messageExcludes",
    ],
    [withExpect({ messageExcludes: [""] }), "errors[0].expect.messageExcludes"],
  ];
  for (const [raw, path] of cases) {
    const message = messageOf(parse(raw));
    assert(
      message.includes(` ${path} `) || message.endsWith(` ${path}`),
      `expected the path "${path}" in "${message}"`,
    );
  }
});

await test("a number that is not a whole count, or not finite, is refused at any depth", () => {
  for (const bad of [
    Number.NaN,
    Number.POSITIVE_INFINITY,
    -1,
    1.5,
    "3",
    2 ** 53,
  ]) {
    throwsWith(
      parse(withExpected({ inputTokens: bad })),
      "success.expected.inputTokens",
    );
  }
  assert(
    parseDecideContractFixture(withExpected({ inputTokens: 0 }), "inline")
      .success.expected.inputTokens === 0,
    "0 tokens is a count",
  );
  for (const bad of [Number.NaN, Number.POSITIVE_INFINITY]) {
    throwsWith(parse(withError({ status: bad })), "errors[0].status");
    throwsWith(
      parse(withError({ body: { retry: { after: bad } } })),
      "errors[0].body.retry.after must be a finite number",
    );
    throwsWith(
      parse(withSuccess({ body: { usage: [1, bad] } })),
      "success.body.usage[1] must be a finite number",
    );
    throwsWith(
      parse(withExpected({ answers: { urgent: { probability: bad } } })),
      "success.expected.answers.urgent.probability must be a finite number",
    );
  }
});

await test("a prototype-named key is refused at any depth and pollutes nothing", () => {
  const withKey = (key: string): string => `{"${key}": {"polluted": true}}`;
  for (const key of ["__proto__", "constructor"]) {
    const body = JSON.parse(withKey(key));
    throwsWith(parse(withError({ body })), `errors[0].body has a "${key}" key`);
    throwsWith(
      parse(withSuccess({ body: { nested: [body] } })),
      `success.body.nested[0] has a "${key}" key`,
    );
    throwsWith(
      parse(withExpected({ answers: body })),
      `success.expected.answers has a "${key}" key`,
    );
    throwsWith(
      parse(withSuccess({ headers: JSON.parse(`{"${key}": "x"}`) })),
      `"${key}"`,
    );
  }
  const text = JSON.stringify(VALID);
  throwsWith(
    parse(JSON.parse(`{"__proto__": {"polluted": true}, ${text.slice(1)}`)),
    "__proto__ is not a known field",
  );
  assert(
    ({} as Record<string, unknown>).polluted === undefined,
    "Object.prototype is untouched",
  );
});

await test("a body that is not plain JSON data is refused", () => {
  const sparse = new Array<unknown>(3);
  sparse[0] = 1;
  sparse[2] = 3;
  const loop: Record<string, unknown> = {};
  loop.again = loop;
  let deep: unknown = "x";
  for (let i = 0; i < 150; i += 1) {
    deep = [deep];
  }
  const cases: readonly (readonly [unknown, string])[] = [
    [loop, "errors[0].body.again contains itself"],
    [deep, "is nested deeper than 100 levels"],
    [new Map([["a", 1]]), "errors[0].body is not plain JSON data"],
    [new Date(0), "errors[0].body is not plain JSON data"],
    [{ a: () => 1 }, "errors[0].body.a is not JSON data"],
    [{ a: undefined }, "errors[0].body.a is not JSON data"],
    [sparse, "errors[0].body[1] is not JSON data"],
    [{ a: BigInt(1) }, "errors[0].body.a is not JSON data"],
  ];
  for (const [body, mention] of cases) {
    throwsWith(parse(withError({ body })), mention);
  }
  // The depth counts from the fixture root: an error body starts three levels
  // down (root, errors, the row), success.body two.
  const nest = (levels: number): unknown =>
    Array.from({ length: levels }).reduce<unknown>((inner) => [inner], "x");
  parseDecideContractFixture(withError({ body: nest(98) }), "inline");
  parseDecideContractFixture(withSuccess({ body: nest(99) }), "inline");
  throwsWith(
    parse(withError({ body: nest(99) })),
    "is nested deeper than 100 levels counting from the fixture root",
  );
  throwsWith(
    parse(withSuccess({ body: nest(100) })),
    "is nested deeper than 100 levels counting from the fixture root",
  );
  const shared = { a: 1 };
  for (const body of [null, 0, false, "", [], {}, [[], {}], [shared, shared]]) {
    parseDecideContractFixture(withError({ body }), "inline");
  }
});

const CREDENTIALS: readonly (readonly [string, string])[] = [
  ["an sk- key", `sk-${FAKE}`],
  ["an sk- key", `Authentication failed for sk-${FAKE}, check it.`],
  ["an sk- key", `sk-${"x".repeat(16)}`],
  ["an sk- key", `sk-${"ab.cd".repeat(5)}`],
  ["a bearer token", `Bearer ${FAKE}`],
  ["a bearer token", `bearer ${"x".repeat(20)}`],
  ["a long hex run", "0123456789abcdef".repeat(2)],
  ["a long hex run", `key ${HASH.toUpperCase()} rejected`],
  ["a long hex run", `Key Hash (Token) =${HASH} and ${HASH.slice(0, 32)}`],
  ["a long hex run", `Hashed API key: ${HASH}; the key is ${HASH.slice(8)}`],
  [
    "a long hex run",
    `a hash is not named near this ${"x".repeat(40)}: ${HASH}`,
  ],
  ["a long hex run", `hash\n${HASH}`],
  ["a long hex run", `the hash ${HASH}`],
  ["a long hex run", `Hashes are listed below\nkey: ${HASH}`],
  ["a long hex run", `Please include the request ID ${ID32} in your report`],
  [
    "a JSON web token",
    ["eyJhbGciOiJIUzI1", "eyJzdWIiOiIxMjM0", "SflKxwRJSMeKKF2Q"].join("."),
  ],
  ["a vendor-prefixed key", `pplx-${FAKE}`],
  ["a vendor-prefixed key", `gsk_${FAKE}`],
  ["a vendor-prefixed key", `xai-${FAKE}`],
  ["a vendor-prefixed key", `pplx-${"a1b2c3d4e5".repeat(2)}`],
  [
    "a JSON web token",
    ["eyJ", "abcdefgh"].join("") + `.${"abcdefgh"}.${"abcdefgh"}`,
  ],
  ["a cloud access key", `AKIA${"ABCDEFGH".repeat(2)}`],
  ["a cloud access key", `AIza${FAKE}${"x".repeat(11)}`],
  [RECEIVED_SHAPE, `Received API Key = ${FAKE}`],
  [
    RECEIVED_SHAPE,
    `Authentication Error. Received API Key = ${FAKE}, try again`,
  ],
  [RECEIVED_SHAPE, `received api key=${FAKE}`],
  [RECEIVED_SHAPE, `Received API Key =\n${FAKE}`],
  [RECEIVED_SHAPE, `Received API Key = ${FAKE.slice(0, 8)}`],
];
const HARMLESS: readonly string[] = [
  "{apiKey}",
  "Bearer {apiKey}",
  "LiteLLM Virtual Key expected. Received={apiKey}, expected to start with 'sk-'.",
  "sk-...cred",
  `Received API Key = sk-...cred, Key Hash (Token) =${HASH}. Unable to find token`,
  `Key Hash (Token) = ${HASH}`,
  `Max parallel request limit reached. Hashed API key: ${HASH}. Try again later.`,
  `token hash=${HASH}`,
  `sk-${"x".repeat(15)}`,
  "f".repeat(31),
  `Bearer ${"x".repeat(19)}`,
  `Bearer${"x".repeat(20)}`,
  `req_${ID32}`,
  `${ID32}_v2`,
  `pplx${FAKE}`,
  `pplx-${"a1b2c3d4e5".repeat(2).slice(0, 19)}`,
  ["eyJ" + "abcdefg", "abcdefgh", "abcdefgh"].join("."),
  ["eyJ" + "abcdefgh", "abcdefg", "abcdefgh"].join("."),
  ["eyJ" + "abcdefgh", "abcdefgh", "abcdefg"].join("."),
  "Received API Key = {apiKey}, try again",
  `Received API Key = ${FAKE.slice(0, 7)}`,
  "Received API Key =",
  "123e4567-e89b-12d3-a456-426614174000",
  "typed-decisions",
  "risk-assessment-of-the-long-term-outcome",
  "multilingual",
];

await test("a string shaped like a credential is refused with its path and never echoed", () => {
  // The last flag marks a place named like an id: a bare hex run is allowed
  // there (pinned in its own test), so only the other shapes are checked.
  const places: readonly (readonly [
    string,
    (value: string) => unknown,
    boolean,
  ])[] = [
    [
      "errors[0].body.error.message",
      (v) => withError({ body: { error: { message: v } } }),
      false,
    ],
    ["errors[0].body[2]", (v) => withError({ body: [1, 2, v] }), false],
    [
      "errors[0].headers.x-echo",
      (v) => withError({ headers: { "x-echo": v } }),
      false,
    ],
    ["success.body.note", (v) => withSuccess({ body: { note: v } }), false],
    [
      "success.headers.x-echo",
      (v) => withSuccess({ headers: { "x-echo": v } }),
      false,
    ],
    ["success.expected.requestId", (v) => withExpected({ requestId: v }), true],
    [
      "errors[0].body.request_id",
      (v) => withError({ body: { request_id: v } }),
      true,
    ],
    [
      "errors[0].headers.x-request-id",
      (v) => withError({ headers: { "x-request-id": v } }),
      true,
    ],
    ["errors[0].label", (v) => withError({ label: v }), false],
    [
      "errors[0].expect.messageIncludes[0]",
      (v) => withExpect({ messageIncludes: [v] }),
      false,
    ],
  ];
  for (const [shape, value] of CREDENTIALS) {
    for (const [path, build, idLike] of places) {
      if (idLike && shape === HEX_RUN_SHAPE) {
        continue;
      }
      const message = messageOf(parse(build(value)));
      assert(
        message.includes(` ${path} holds ${shape};`),
        `expected "${path} holds ${shape}" in "${message}"`,
      );
      assert(!message.includes(value), `${shape}: the value was echoed`);
    }
  }
  const keyed = messageOf(
    parse(withError({ body: { [`sk-${FAKE}`]: 1, other: 2 } })),
  );
  assert(
    keyed.includes(
      "errors[0].body.<key withheld> is a key shaped like a credential",
    ),
    `a key shaped like a credential is refused: "${keyed}"`,
  );
  assert(!keyed.includes(FAKE), "the key was echoed");
});

await test("an id or digest is accepted under a property or header named like one", () => {
  const UUID = "123e4567e89b12d3a456426614174000";
  const TRACEPARENT = `00-${ID32}-${SPAN16}-01`;
  const ok: readonly (readonly [string, unknown])[] = [
    ["x-request-id header", withError({ headers: { "x-request-id": ID32 } })],
    [
      "x-request-id header on 200",
      withSuccess({ headers: { "x-request-id": ID32 } }),
    ],
    [
      "bare 32-hex header",
      withError({ headers: { "x-correlation-id": ID32 } }),
    ],
    ["dashless UUID", withError({ headers: { "x-amzn-requestid": UUID } })],
    ["W3C traceparent", withError({ headers: { traceparent: TRACEPARENT } })],
    [
      "x-cloud-trace-context",
      withError({ headers: { "x-cloud-trace-context": `${ID32}/1234;o=1` } }),
    ],
    ["trace_id field", withError({ body: { error: { trace_id: ID32 } } })],
    ["token_hash field", withError({ body: { token_hash: HASH } })],
    [
      "camelCase field",
      withError({ body: { requestId: ID32, traceId: ID32 } }),
    ],
    ["etag header", withError({ headers: { ETag: `"${ID32}"` } })],
    ["sha256 header", withError({ headers: { "x-amz-content-sha256": HASH } })],
    ["digest field", withError({ body: { digest: HASH } })],
    ["checksum field", withError({ body: { checksum: HASH } })],
    ["idempotency header", withError({ headers: { "idempotency-key": ID32 } })],
    ["camelCase id word", withError({ body: { correlationId: ID32 } })],
    ["upper-case camelCase id word", withError({ body: { sessionID: ID32 } })],
    ["ids word", withError({ body: { correlation_ids: ID32 } })],
    ["uuid word", withError({ headers: { "x-uuid": ID32 } })],
    ["guid word", withError({ body: { guid: ID32 } })],
    ["identifier word", withError({ body: { identifier: ID32 } })],
    ["sha word", withError({ headers: { "x-sha": HASH } })],
    ["list under an id name", withError({ body: { trace_ids: [ID32, UUID] } })],
    ["success.expected.requestId", withExpected({ requestId: ID32 })],
    ["success.expected.requestId, 64 hex", withExpected({ requestId: HASH })],
    [
      "a hash label in prose",
      withError({ body: { message: `hash: ${HASH}` } }),
    ],
  ];
  for (const [what, raw] of ok) {
    const message = messageOf(parse(raw));
    assert(message === "", `${what} refused: ${message}`);
  }
});

await test("a hex run under a name that is not an id, or in prose, is still refused", () => {
  const named = (name: string) => withError({ body: { [name]: ID32 } });
  const keyNames = [
    "apiKey",
    "api_key",
    "x-api-key",
    "authorization",
    "secret",
    "client_secret",
    "token",
    "access_token",
    "password",
    "value",
    "provider_api_key",
    "valid_key",
    "width",
    "identity",
    "paid",
    "shared",
    "",
  ];
  for (const name of keyNames) {
    throwsWith(
      parse(named(name)),
      `errors[0].body.${name} holds ${HEX_RUN_SHAPE}`,
    );
  }
  throwsWith(
    parse(withError({ headers: { authorization: ID32 } })),
    `errors[0].headers.authorization holds ${HEX_RUN_SHAPE}`,
  );
  // Only the nearest name counts, so an id-named parent does not cover a child.
  throwsWith(
    parse(withError({ body: { trace: { value: ID32 } } })),
    `errors[0].body.trace.value holds ${HEX_RUN_SHAPE}`,
  );
  throwsWith(
    parse(
      withError({ body: { message: `Please include the request ID ${ID32}` } }),
    ),
    `errors[0].body.message holds ${HEX_RUN_SHAPE}`,
  );
  throwsWith(
    parse(withError({ body: [ID32] })),
    `errors[0].body[0] holds ${HEX_RUN_SHAPE}`,
  );
  const advice = messageOf(parse(named("value")));
  assert(advice.includes("put the word hash before it"), `advice: ${advice}`);
  assert(
    advice.includes("contains id, trace, request, hash or digest"),
    advice,
  );
  assert(advice.includes("shorten it"), advice);
  assert(advice.includes('write "{apiKey}"'), advice);
  assert(!advice.includes(ID32), "the value was echoed");
  const keyAdvice = messageOf(
    parse(withError({ body: { value: `sk-${FAKE}` } })),
  );
  assert(keyAdvice.includes('write "{apiKey}"'), keyAdvice);
  assert(
    !keyAdvice.includes("put the word hash"),
    "an sk- key is not told it may be an id",
  );
});

await test("a credential that is not a bare hex run is refused even under an id name", () => {
  for (const name of [
    "request_id",
    "x-request-id",
    "traceparent",
    "token_hash",
  ]) {
    for (const value of [
      `sk-${FAKE}`,
      `Bearer ${FAKE}`,
      `Received API Key = ${FAKE}`,
      `pplx-${FAKE}`,
      `AKIA${"ABCDEFGH".repeat(2)}`,
    ]) {
      const message = messageOf(
        parse(withError({ headers: { [name]: value } })),
      );
      assert(
        message.includes(`errors[0].headers.${name} holds`),
        `${name} let a credential through: ${message}`,
      );
      assert(!message.includes(value), "the value was echoed");
    }
  }
});

await test("the placeholder, the masked echo, the key hash and near misses pass", () => {
  for (const value of HARMLESS) {
    for (const build of [
      (v: string) => withError({ body: { error: { message: v } } }),
      (v: string) => withSuccess({ headers: { "x-note": v } }),
    ]) {
      const message = messageOf(parse(build(value)));
      assert(message === "", `"${value.slice(0, 30)}..." refused: ${message}`);
    }
  }
});

await test("reading by id refuses every id that is not a plain provider id", () => {
  const root = tempDir("decide-fixture-");
  const hostile = [
    "",
    ".",
    "..",
    "../etc",
    "../../etc/passwd",
    "a/b",
    "a\\b",
    "/etc",
    "acme/../other",
    "acme\0",
    "\0",
    "acme\n",
    "ACME",
    "Acme",
    "-acme",
    "acme-",
    "acme--two",
    "1acme",
    "acme.json",
    "%2e%2e",
    "acme ",
    "z".repeat(65),
  ];
  for (const id of hostile) {
    const message = messageOf(() => readDecideContractFixture(id, root));
    assert(
      message.includes("is not a provider id"),
      `id ${JSON.stringify(id.slice(0, 20))} gave "${message}"`,
    );
  }
  const echoed = messageOf(() => readDecideContractFixture("x".repeat(10_000)));
  assert(echoed.length < 200, `a long id is echoed in full: ${echoed.length}`);
  for (const id of [undefined, null, 7, {}, ["acme"]]) {
    throwsWith(
      () => readDecideContractFixture(id as unknown as string, root),
      "is not a provider id",
    );
  }
  mkdirSync(join(root, "z".repeat(64)));
  writeFileSync(
    join(root, "z".repeat(64), "contract.json"),
    JSON.stringify({ ...VALID, id: "z".repeat(64) }),
  );
  assert(
    readDecideContractFixture("z".repeat(64), root).id === "z".repeat(64),
    "a 64-character id is the longest",
  );
});

await test("reading by id does not follow a symlink out of the root or read a non-file", () => {
  const outside = tempDir("decide-outside-");
  const root = tempDir("decide-fixture-");
  mkdirSync(join(outside, "linked"));
  writeFileSync(
    join(outside, "linked", "contract.json"),
    JSON.stringify({ ...VALID, id: "linked" }),
  );
  writeFileSync(
    join(outside, "pointer.json"),
    JSON.stringify({ ...VALID, id: "pointer" }),
  );
  assert(
    readDecideContractFixture("linked", outside).id === "linked",
    "control: the outside fixture is valid on its own",
  );
  symlinkSync(join(outside, "linked"), join(root, "linked"), "dir");
  mkdirSync(join(root, "pointer"));
  symlinkSync(
    join(outside, "pointer.json"),
    join(root, "pointer", "contract.json"),
  );
  for (const id of ["linked", "pointer"]) {
    throwsWith(
      () => readDecideContractFixture(id, root),
      "resolves outside the fixture root",
    );
  }
  mkdirSync(join(root, "dangling"));
  symlinkSync(
    join(outside, "gone.json"),
    join(root, "dangling", "contract.json"),
  );
  throwsWith(
    () => readDecideContractFixture("dangling", root),
    "contract fixture missing",
  );
  writeFileSync(join(root, "afile"), "not a directory");
  throwsWith(
    () => readDecideContractFixture("afile", root),
    "contract fixture missing",
  );
  mkdirSync(join(root, "adir", "contract.json"), { recursive: true });
  throwsWith(
    () => readDecideContractFixture("adir", root),
    "is not a regular file",
  );
  throwsWith(
    () => readDecideContractFixture("acme", join(root, "no-such-root")),
    "contract fixture missing",
  );
});

await test("a fixture on disk holding a key is refused without echoing it, and a broken one without quoting it", () => {
  const root = tempDir("decide-fixture-");
  const put = (dir: string, text: string): void => {
    mkdirSync(join(root, dir));
    writeFileSync(join(root, dir, "contract.json"), text);
  };
  put(
    "leaky",
    JSON.stringify(
      withError({ body: { error: { message: `bad key sk-${FAKE}` } } }),
    ).replace('"acme"', '"leaky"'),
  );
  put("quoted", `QUOTEMARK sk-${FAKE}`);
  const slip = '{"a": 1 "b": 2}';
  put("slip", slip);
  put(
    "placeholder",
    JSON.stringify(
      withError({ body: { error: { message: "bad key {apiKey}" } } }),
    ).replace('"acme"', '"placeholder"'),
  );
  const leaky = messageOf(() => readDecideContractFixture("leaky", root));
  assert(
    leaky.includes("errors[0].body.error.message holds an sk- key"),
    `the leak is named: "${leaky}"`,
  );
  assert(leaky.includes(join(root, "leaky")), "the file is named");
  assert(!leaky.includes(FAKE), "the key was echoed");
  const thrown = errorOf(() => readDecideContractFixture("quoted", root));
  assert(thrown instanceof Error, "reading a broken file throws an Error");
  assert(
    (thrown as Error).cause === undefined,
    "the JSON error carries no cause: a thrown error prints its cause",
  );
  const printed = inspect(thrown, { depth: 10 });
  assert(!printed.includes("QUOTEMARK"), "inspect() shows the file text");
  assert(!printed.includes(FAKE), "inspect() shows the key");
  const quoted = messageOf(() => readDecideContractFixture("quoted", root));
  assert(quoted.includes("is not valid JSON"), `bad JSON named: "${quoted}"`);
  assert(!quoted.includes("QUOTEMARK"), "the JSON error quoted the file text");
  assert(!quoted.includes(FAKE), "the JSON error quoted the key");
  let native = "";
  try {
    JSON.parse(slip);
  } catch (error) {
    native = error instanceof Error ? error.message : "";
  }
  const position = /at position \d+/.exec(native);
  assert(position !== null, `control: this Node names a position: "${native}"`);
  throwsWith(
    () => readDecideContractFixture("slip", root),
    String(position?.[0]),
  );
  assert(
    readDecideContractFixture("placeholder", root).id === "placeholder",
    "a fixture that writes {apiKey} reads",
  );
});

await test("the default root is test/fixtures/decide", () => {
  assert(
    DECIDE_FIXTURE_ROOT.endsWith(join("test", "fixtures", "decide")),
    `root is ${DECIDE_FIXTURE_ROOT}`,
  );
  assert(existsSync(DECIDE_FIXTURE_ROOT), "the root directory exists");
  throwsWith(
    () => readDecideContractFixture("no-such-provider"),
    join(DECIDE_FIXTURE_ROOT, "no-such-provider", "contract.json"),
  );
});

const STAND_IN = parseDecideContractFixture(
  { ...VALID, id: "laya" },
  "stand-in",
);
// The Laya run reads test/fixtures/decide/laya/contract.json by itself, the way
// the mocked suite's loop does, so the default-root disk path is exercised by
// the real entry. Everything below that is compared with this run (the planned
// names, the exact planned count, the retry pair) derives from LAYA_DISK, read
// through the loop's own loader. LAYA_INLINE_CONTRACT feeds the controls,
// scenarios and reader tests, which must not depend on the data on disk.
const layaDisk = loadContractFixture(LAYA_ENTRY, undefined);
if (!("fixture" in layaDisk)) {
  throw new Error(`the Laya contract fixture is unusable: ${layaDisk.problem}`);
}
const LAYA_DISK: DecideContractFixture = layaDisk.fixture;
const layaRun = await runDecideProviderContract(LAYA_ENTRY);

// The shipped xor.json, not an in-memory copy: it is the entry whose rule list
// holds a messagePattern, so it is the one the pattern cases are judged on. The
// run is quiet because its rows are reported one by one by the tests below.
const xorSource: unknown = JSON.parse(
  readFileSync(
    join(process.cwd(), "src", "lib", "providers", "catalog", "xor.json"),
    "utf8",
  ),
);
const XOR_ENTRY: DecideCatalogJson = await parseDecideEntry(
  xorSource,
  "xor.json",
);
const xorDisk = loadContractFixture(XOR_ENTRY, undefined);
if (!("fixture" in xorDisk)) {
  throw new Error(`the XOR contract fixture is unusable: ${xorDisk.problem}`);
}
const XOR_DISK: DecideContractFixture = xorDisk.fixture;
const xorRun = await runDecideProviderContract(XOR_ENTRY, { quiet: true });

// The shipped openai-decisions.json: the one entry on a second dialect, so it
// is the entry the loop's per-dialect wire view is judged on. Quiet for the
// same reason as XOR's.
const openaiSource: unknown = JSON.parse(
  readFileSync(
    join(
      process.cwd(),
      "src",
      "lib",
      "providers",
      "catalog",
      "openai-decisions.json",
    ),
    "utf8",
  ),
);
const OPENAI_ENTRY: DecideCatalogJson = await parseDecideEntry(
  openaiSource,
  "openai-decisions.json",
);
const openaiDisk = loadContractFixture(OPENAI_ENTRY, undefined);
if (!("fixture" in openaiDisk)) {
  throw new Error(
    `the OpenAI Decisions contract fixture is unusable: ${openaiDisk.problem}`,
  );
}
const OPENAI_DISK: DecideContractFixture = openaiDisk.fixture;
const openaiRun = await runDecideProviderContract(OPENAI_ENTRY, {
  quiet: true,
});

// The shipped scaledown.json: the one entry that asks the engine for an
// x-api-key header (decide.authHeader) and a text state (decide.stateEncoding),
// so it is the entry the loop's credential and state checks are judged on.
// Quiet for the same reason as XOR's.
const scaledownSource: unknown = JSON.parse(
  readFileSync(
    join(process.cwd(), "src", "lib", "providers", "catalog", "scaledown.json"),
    "utf8",
  ),
);
const SCALEDOWN_ENTRY: DecideCatalogJson = await parseDecideEntry(
  scaledownSource,
  "scaledown.json",
);
const scaledownDisk = loadContractFixture(SCALEDOWN_ENTRY, undefined);
if (!("fixture" in scaledownDisk)) {
  throw new Error(
    `the ScaleDown contract fixture is unusable: ${scaledownDisk.problem}`,
  );
}
const SCALEDOWN_DISK: DecideContractFixture = scaledownDisk.fixture;
const scaledownRun = await runDecideProviderContract(SCALEDOWN_ENTRY, {
  quiet: true,
});

// Hyphenated id and renamed variables: a loop that guessed the names would
// blank the wrong variable and fail on this entry.
const OVERRIDDEN: DecideCatalogJson = {
  ...LAYA_ENTRY,
  id: "acme-co",
  displayName: "Acme",
  wire: {
    envOverrides: {
      apiKey: "ACME_TOKEN",
      baseURL: "ACME_ROOT_URL",
      model: "ACME_CHECKPOINT",
    },
  },
};
// Built from the inline copy, not from the fixture the Laya run reads from
// disk, so this entry's run does not depend on the Laya file; the agreement
// test below keeps the two copies in step.
const overriddenFixture: DecideContractFixture = {
  ...LAYA_INLINE_CONTRACT,
  id: "acme-co",
};

function passed(name: string): void {
  const found = layaRun.recorded.find((r) => r.name === name);
  if (found === undefined) {
    throw new Error(`no result named "${name}"`);
  }
  assert(found.ok, `${name} failed: ${found.reason ?? ""}`);
}

await test("a missing or blank key is refused as authentication and nothing is sent", () => {
  passed(`DECIDE ${LAYA_ENTRY.id}: no key, no request`);
});

await test("a missing or blank base URL is refused before any request", () => {
  passed(`DECIDE ${LAYA_ENTRY.id}: no base URL, no request`);
});

await test("every planned case is recorded once, under its own name, and passed", () => {
  const names = layaRun.recorded.map((r) => r.name);
  assert(layaRun.planned >= 2, `planned ${layaRun.planned} cases`);
  assert(
    layaRun.recorded.length === layaRun.planned,
    `planned ${layaRun.planned}, recorded ${layaRun.recorded.length}`,
  );
  assert(new Set(names).size === names.length, "two results share a name");
  const failed = layaRun.recorded.filter((r) => !r.ok);
  assert(
    failed.length === 0,
    `failed: ${failed.map((r) => r.name).join("; ")}`,
  );
});

// The inline copy feeds the controls; the file on disk is what the real loop runs.
// A change to one belongs in the other, so the disk file may hold more than the
// inline copy (rows only the loop needs) and never less.
function agreementProblems(
  disk: DecideContractFixture,
  inline: DecideContractFixture,
): string[] {
  const problems: string[] = [];
  if (disk.version !== inline.version || disk.id !== inline.id) {
    problems.push("version or id differs");
  }
  if (!isDeepStrictEqual(disk.success, inline.success)) {
    problems.push("the success reply differs");
  }
  for (const row of inline.errors) {
    const onDisk = disk.errors.find((f) => f.label === row.label);
    if (onDisk === undefined) {
      problems.push(`row "${row.label}" is missing on disk`);
    } else if (!isDeepStrictEqual(onDisk, row)) {
      problems.push(`row "${row.label}" differs`);
    }
  }
  return problems;
}

await test("the Laya fixture on disk holds every row of the inline copy, and the success reply, unchanged", () => {
  const problems = agreementProblems(LAYA_DISK, LAYA_INLINE_CONTRACT);
  assert(problems.length === 0, problems.join("; "));
  assert(
    LAYA_DISK.errors.length >= LAYA_INLINE_CONTRACT.errors.length,
    "the disk fixture has fewer rows than the inline copy",
  );
  const labels = LAYA_DISK.errors.map((f) => f.label);
  assert(new Set(labels).size === labels.length, "two rows share a label");
});

await test("the agreement check names a changed row, a changed success reply and a row missing on disk", () => {
  // Built from the inline copy, so this judges the check and not the file.
  const base = LAYA_INLINE_CONTRACT;
  const [first, ...rest] = base.errors;
  const changedRow = agreementProblems(
    { ...base, errors: [{ ...first, status: first.status + 1 }, ...rest] },
    base,
  );
  assert(
    changedRow.length === 1 && changedRow[0] === `row "${first.label}" differs`,
    `a changed row: ${changedRow.join("; ")}`,
  );
  const changedSuccess = agreementProblems(
    {
      ...base,
      success: {
        ...base.success,
        expected: { ...base.success.expected, inputTokens: 97 },
      },
    },
    base,
  );
  assert(
    changedSuccess.length === 1 &&
      changedSuccess[0] === "the success reply differs",
    `a changed success reply: ${changedSuccess.join("; ")}`,
  );
  const missing = agreementProblems({ ...base, errors: rest }, base);
  assert(
    missing.length === 1 &&
      missing[0] === `row "${first.label}" is missing on disk`,
    `a missing row: ${missing.join("; ")}`,
  );
  const extra = agreementProblems(
    {
      ...base,
      errors: [...base.errors, { ...first, label: "a row only the disk has" }],
    },
    base,
  );
  assert(extra.length === 0, `an extra disk row is allowed: ${extra}`);
  assert(
    agreementProblems(base, base).length === 0,
    "identical copies disagree",
  );
});

// The expected names are written out here, not taken from the helper.
await test("the variable names come from the entry: stem, hyphens and overrides", () => {
  const laya = decideEnvNames(LAYA_ENTRY);
  assert(laya.apiKey === "LAYA_API_KEY", `key: ${laya.apiKey}`);
  assert(laya.baseURL === "LAYA_BASE_URL", `base URL: ${laya.baseURL}`);
  assert(laya.model === "LAYA_MODEL", `model: ${laya.model}`);
  const hyphen = decideEnvNames({ ...LAYA_ENTRY, id: "acme-co" });
  assert(hyphen.apiKey === "ACME_CO_API_KEY", `hyphen key: ${hyphen.apiKey}`);
  assert(
    hyphen.baseURL === "ACME_CO_BASE_URL",
    `hyphen URL: ${hyphen.baseURL}`,
  );
  assert(hyphen.model === "ACME_CO_MODEL", `hyphen model: ${hyphen.model}`);
  const over = decideEnvNames(OVERRIDDEN);
  assert(over.apiKey === "ACME_TOKEN", `override key: ${over.apiKey}`);
  assert(over.baseURL === "ACME_ROOT_URL", `override URL: ${over.baseURL}`);
  assert(over.model === "ACME_CHECKPOINT", `override model: ${over.model}`);
  const partial = decideEnvNames({
    ...LAYA_ENTRY,
    id: "acme-co",
    wire: { envOverrides: { apiKey: "ACME_TOKEN" } },
  });
  assert(partial.baseURL === "ACME_CO_BASE_URL", `partial: ${partial.baseURL}`);
});

// The cases that depend only on the entry's data and its three variable names:
// the credential and wire cases. A wire case that names LAYA_MODEL or
// LAYA_BASE_URL instead of the entry's own variable fails on this entry. The
// error cases are not listed: they depend on the rules and the bodies in the
// fixture, not on the variable names.
const ENTRY_DATA_CASES = [
  "no key, no request",
  "no base URL, no request",
  "wire request (route, POST, bearer, model, boolean as noul)",
  "answers, model and request id are read back",
  "default model is sent",
  "model env var overrides the default",
  "state text is sent verbatim",
  "base URL spellings reach one endpoint",
  "the alias model is left out of the body",
].map((name) => `DECIDE acme-co: ${name}`);

await test("an entry with hyphens and overridden variables passes every credential and wire case", async () => {
  const cases = buildContractCases(OVERRIDDEN, overriddenFixture).filter((c) =>
    ENTRY_DATA_CASES.includes(c.name),
  );
  assert(
    cases.length === ENTRY_DATA_CASES.length,
    `built ${cases.map((c) => c.name).join("; ")}`,
  );
  const results: TestRecord[] = [];
  await runContractCases(OVERRIDDEN, overriddenFixture, cases, results, {
    quiet: true,
  });
  const names = results.map((r) => r.name);
  assert(
    results.length === ENTRY_DATA_CASES.length &&
      ENTRY_DATA_CASES.every((name) => names.includes(name)),
    `${results.length} results: ${names.join("; ")}`,
  );
  const failed = results.filter((r) => !r.ok);
  assert(
    failed.length === 0,
    `failed: ${failed.map((r) => `${r.name}: ${r.reason}`).join("; ")}`,
  );
});

await test("an entry that needs no base URL gets no base URL case", () => {
  const optional: DecideCatalogJson = {
    ...OVERRIDDEN,
    wire: { baseURL: "https://acme.contract.test/v1" },
    decide: { ...OVERRIDDEN.decide, baseURLRequired: false },
  };
  const names = buildContractCases(optional, overriddenFixture).map(
    (c) => c.name,
  );
  assert(
    names.includes("DECIDE acme-co: no key, no request") &&
      !names.some((n) => n.includes("no base URL")),
    `got ${names.join("; ")}`,
  );
});

const PROXY_NAMES = [
  "HTTPS_PROXY",
  "https_proxy",
  "HTTP_PROXY",
  "http_proxy",
  "ALL_PROXY",
  "all_proxy",
  "SOCKS_PROXY",
  "socks_proxy",
];
const AMBIENT_KEY = "ambient-key-must-not-leak";
const SCOPED = [...PROXY_NAMES, "LAYA_API_KEY", "LAYA_BASE_URL", "LAYA_MODEL"];

async function withEnv<T>(
  values: Readonly<Record<string, string | undefined>>,
  run: () => Promise<T>,
): Promise<T> {
  const saved = Object.keys(values).map(
    (name) => [name, process.env[name]] as const,
  );
  const write = (name: string, value: string | undefined): void => {
    if (value === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = value;
    }
  };
  for (const [name, value] of Object.entries(values)) {
    write(name, value);
  }
  try {
    return await run();
  } finally {
    for (const [name, value] of saved) {
      write(name, value);
    }
  }
}

const snapshot = (): Record<string, string | undefined> =>
  Object.fromEntries(SCOPED.map((name) => [name, process.env[name]]));

// A reply the provider accepts whatever the fixture holds, so the synthetic
// cases below do not depend on it.
const ACCEPTED = { status: 200, json: { answers: {} } };

await test("a case runs with every proxy variable cleared and fake credentials, and the environment comes back", async () => {
  const ambient: Record<string, string | undefined> = {
    ...Object.fromEntries(
      PROXY_NAMES.map((n) => [n, "http://proxy.contract.test:3128"]),
    ),
    LAYA_API_KEY: AMBIENT_KEY,
    LAYA_BASE_URL: undefined,
    LAYA_MODEL: "ambient-model",
  };
  const inside: Record<string, string | undefined> = {};
  const sent: string[] = [];
  const probe: ContractCase = {
    name: "env probe",
    run: async (ctx) => {
      await ctx.mock([ctx.route(ACCEPTED)], async (calls) => {
        await ctx.control(calls);
        sent.push(JSON.stringify(calls[0].headers));
      });
      Object.assign(inside, snapshot());
    },
  };
  const results: TestRecord[] = [];
  const fetchBefore = globalThis.fetch;
  const after = await withEnv(ambient, async () => {
    await runContractCases(LAYA_ENTRY, STAND_IN, [probe], results, {
      quiet: true,
    });
    return snapshot();
  });
  assert(results.length === 1 && results[0].ok, `probe: ${results[0]?.reason}`);
  const stillSet = PROXY_NAMES.filter((n) => inside[n] !== undefined);
  assert(
    stillSet.length === 0,
    `proxy variables left set: ${stillSet.join(", ")}`,
  );
  assert(inside.LAYA_MODEL === undefined, "the model variable was not cleared");
  const key = inside.LAYA_API_KEY ?? "";
  assert(
    key.startsWith("test-fake-") && key !== AMBIENT_KEY,
    "the key is not a fake one",
  );
  const host = new URL(inside.LAYA_BASE_URL ?? "https://missing.invalid")
    .hostname;
  assert(host.endsWith(".test"), "the case's base URL is not a .test host");
  assert(
    sent.length === 1 && !sent[0].includes(AMBIENT_KEY),
    "the ambient key was sent",
  );
  assert(sent[0].includes(key), "the request did not carry the case's key");
  for (const name of SCOPED) {
    assert(after[name] === ambient[name], `${name} was not put back`);
  }
  assert(globalThis.fetch === fetchBefore, "fetch was not put back");
});

const sendsOnce = (ctx: CaseContext) =>
  ctx.mock([ctx.route(ACCEPTED)], (calls) => ctx.control(calls));

type Row = {
  readonly label: string;
  readonly run: ContractCase["run"];
  readonly static?: true;
  /** A fragment of the failure reason; omitted means the case must pass. */
  readonly fails?: string;
  /** Text the failure reason must not contain. */
  readonly hides?: readonly string[];
};

async function judge(rows: readonly Row[]): Promise<void> {
  const fetchBefore = globalThis.fetch;
  for (const row of rows) {
    const results: TestRecord[] = [];
    const contractCase: ContractCase =
      row.static === true
        ? { name: row.label, run: row.run, static: true }
        : { name: row.label, run: row.run };
    await runContractCases(LAYA_ENTRY, STAND_IN, [contractCase], results, {
      quiet: true,
    });
    assert(results.length === 1, `${row.label}: ${results.length} results`);
    const reason = results[0].reason ?? "";
    if (row.fails === undefined) {
      assert(results[0].ok, `${row.label}: failed, but must pass: ${reason}`);
    } else {
      assert(!results[0].ok, `${row.label}: passed, but must fail`);
      assert(
        reason.includes(row.fails),
        `${row.label}: reason "${reason}" lacks "${row.fails}"`,
      );
    }
    for (const hidden of row.hides ?? []) {
      assert(
        !reason.includes(hidden),
        `${row.label}: the reason shows a secret`,
      );
    }
    assert(
      globalThis.fetch === fetchBefore,
      `${row.label}: fetch was not put back`,
    );
  }
}

await test("a case that measures nothing, or whose mock sees nothing, or whose provider sends when it should refuse, is a failure", async () => {
  await judge([
    {
      label: "no assertion",
      run: async () => undefined,
      fails: "no assertion",
    },
    {
      label: "asserts but never sends",
      run: async (ctx) => ctx.ok(true, "x"),
      fails: "no request reached",
    },
    {
      label: "installs a mock that nothing reaches",
      run: async (ctx) => {
        await ctx.mock([ctx.route(ACCEPTED)], async () => undefined);
        ctx.ok(true, "x");
      },
      fails: "no request reached",
    },
    {
      label: "control against a mock that records nothing",
      run: (ctx) =>
        ctx.mock([ctx.route(ACCEPTED)], (_calls) => ctx.control([])),
      fails: "must reach the mock",
    },
    {
      label: "expects a refusal from a provider that sends",
      run: (ctx) =>
        ctx.mock([ctx.route(ACCEPTED)], async (calls) => {
          await ctx.control(calls);
          await ctx.refused();
        }),
      fails: "must be refused",
    },
    {
      label: "an assertion that is false",
      run: async (ctx) => {
        await sendsOnce(ctx);
        ctx.eq(1, 2, "one is two");
      },
      fails: "one is two",
    },
    {
      label: "throws",
      run: async (ctx) => {
        await sendsOnce(ctx);
        throw new Error("boom");
      },
      fails: "boom",
    },
    {
      label: "leaves a mock installed",
      run: async (ctx) => {
        await sendsOnce(ctx);
        globalThis.fetch = async () => new Response("");
      },
      fails: "left its fetch mock installed",
    },
    { label: "a sound case", run: async (ctx) => sendsOnce(ctx) },
  ]);
});

await test("a static case must send nothing, and a case that expects no request proves its mock is live", async () => {
  const refuseWithoutKey = (ctx: CaseContext) =>
    ctx.mock([ctx.route(ACCEPTED)], (calls) =>
      ctx
        .refusedWithoutRequest(calls, undefined, undefined, () =>
          ctx.env.set(ctx.names.apiKey, undefined),
        )
        .then(() => undefined),
    );
  await judge([
    {
      label: "a static case that sends",
      static: true,
      run: sendsOnce,
      fails: "declared static",
    },
    {
      label: "a static case that only asserts",
      static: true,
      run: async (ctx) => ctx.ok(ctx.names.apiKey.length > 0, "a name"),
    },
    {
      label: "a static case that asserts nothing",
      static: true,
      run: async () => undefined,
      fails: "no assertion",
    },
    {
      label: "a static case that asks with no mock installed",
      static: true,
      run: async (ctx) => {
        ctx.ok(true, "a placeholder assertion");
        await ctx.failureOf(() => ctx.ask());
      },
      fails: "declared static",
    },
    {
      label: "a static case that installs a mock and sends nothing",
      static: true,
      run: (ctx) =>
        ctx.mock([ctx.route(ACCEPTED)], async () =>
          ctx.ok(ctx.names.apiKey.length > 0, "a name"),
        ),
    },
    {
      label: "a static case that leaves a mock installed",
      static: true,
      run: async (ctx) => {
        ctx.ok(true, "a placeholder assertion");
        globalThis.fetch = async () => new Response("");
      },
      fails: "left its fetch mock installed",
    },
    {
      label: "a refusal without a request",
      run: refuseWithoutKey,
    },
    {
      label: "refusedWithoutRequest with a mock that records nothing",
      run: (ctx) =>
        ctx.mock([ctx.route(ACCEPTED)], async () =>
          ctx
            .refusedWithoutRequest([], undefined, undefined, () =>
              ctx.env.set(ctx.names.apiKey, undefined),
            )
            .then(() => undefined),
        ),
      fails: "must reach the mock",
    },
    {
      label: "refusedWithoutRequest where the provider sends after the control",
      run: (ctx) =>
        ctx.mock([ctx.route({ status: 401, json: { error: "no" } })], (calls) =>
          ctx.refusedWithoutRequest(calls).then(() => undefined),
        ),
      fails: "sent no request",
    },
    {
      label: "refusedWithoutRequest where nothing is refused",
      run: (ctx) =>
        ctx.mock([ctx.route(ACCEPTED)], (calls) =>
          ctx.refusedWithoutRequest(calls).then(() => undefined),
        ),
      fails: "must be refused",
    },
  ]);
});

await test("a failure never prints a URL's user:pass or token, nor the fake key", async () => {
  const USERINFO = "uSeR9:pW9zz@";
  const TOKEN = "SECRETTOKEN9";
  await judge([
    {
      label: "a request to the wrong URL",
      run: async (ctx) => {
        ctx.env.set(
          ctx.names.baseURL,
          `https://${USERINFO}wrong.contract.test/base?token=${TOKEN}`,
        );
        await sendsOnce(ctx);
      },
      fails: "endpoint built from the fake base URL",
      hides: ["uSeR9", "pW9zz", TOKEN, "test-fake-"],
    },
    {
      label: "eq on two URLs",
      run: async (ctx) => {
        await sendsOnce(ctx);
        ctx.eq(
          `https://${USERINFO}a.contract.test/p?token=${TOKEN}`,
          "https://b.contract.test/p",
          "url",
        );
      },
      fails: "url: expected",
      hides: ["uSeR9", "pW9zz", TOKEN],
    },
    {
      label: "eq on the fake key",
      run: async (ctx) => {
        await sendsOnce(ctx);
        ctx.eq(ctx.apiKey, "other", "key");
      },
      fails: "key: expected",
      hides: ["test-fake-"],
    },
    {
      label: "eq with the secrets on the expected side",
      run: async (ctx) => {
        await sendsOnce(ctx);
        ctx.eq(
          "https://b.contract.test/p",
          `https://${USERINFO}a.contract.test/p?token=${TOKEN} ${ctx.apiKey}`,
          "url",
        );
      },
      fails: "url: expected",
      hides: ["uSeR9", "pW9zz", TOKEN, "test-fake-"],
    },
    {
      label: "eq with the fake key twice in one value",
      run: async (ctx) => {
        await sendsOnce(ctx);
        ctx.eq(`${ctx.apiKey}/${ctx.apiKey}`, "other", "key twice");
      },
      fails: "key twice: expected",
      hides: ["test-fake-"],
    },
  ]);
});

await test("a case name that repeats is recorded as a failure, not run", async () => {
  const results: TestRecord[] = [];
  await runContractCases(
    LAYA_ENTRY,
    STAND_IN,
    [
      { name: "twin", run: sendsOnce },
      { name: "twin", run: sendsOnce },
      { name: "other", run: sendsOnce },
    ],
    results,
    { quiet: true },
  );
  assert(results.length === 3, `${results.length} results`);
  assert(results[0].ok && results[2].ok, "the distinct cases pass");
  assert(
    !results[1].ok && (results[1].reason ?? "").includes("already run"),
    `the repeat: ${JSON.stringify(results[1])}`,
  );
});

const WIRE_CASES = [
  [
    "the wire request carries route, POST, bearer, model and noul",
    "wire request (route, POST, bearer, model, boolean as noul)",
  ],
  [
    "answers, model and request id are read back",
    "answers, model and request id are read back",
  ],
  [
    "the default model is sent and an empty model variable does not hide it",
    "default model is sent",
  ],
  [
    "the model variable overrides the default",
    "model env var overrides the default",
  ],
  [
    "template-looking state text is sent verbatim",
    "state text is sent verbatim",
  ],
  [
    "base URL spellings reach one endpoint",
    "base URL spellings reach one endpoint",
  ],
  [
    "the alias model is left out and a near-name is sent as given",
    "the alias model is left out of the body",
  ],
] as const;
for (const [title, name] of WIRE_CASES) {
  await test(title, () => passed(`DECIDE ${LAYA_ENTRY.id}: ${name}`));
}

// The constant is typed, not read, so nothing else stops a key-shaped string
// or a misspelt field from reaching the loop.
await test("the Laya inline fixture passes the fixture reader unchanged", () => {
  const parsed = parseDecideContractFixture(
    LAYA_INLINE_CONTRACT,
    "laya-inline",
  );
  assert(
    isDeepStrictEqual(parsed, LAYA_INLINE_CONTRACT),
    "the reader changed the inline fixture",
  );
});

// The error cases (and the harness cases built from the fixture's errors) are
// judged by their own tests below; the wire tests count only the others.
// What the entry's data calls for: the two optional wire cases exist only with
// their keys, and the base URL case only when a base URL is required.
const hasSpellingCase = (entry: DecideCatalogJson): boolean =>
  entry.decide.baseURLNormalize?.includes("strip-trailing-slash") === true;
const hasAliasCase = (entry: DecideCatalogJson): boolean =>
  entry.decide.model.placement === "body-unless-alias" &&
  entry.decide.model.alias !== undefined;
const wireCaseCount = (entry: DecideCatalogJson): number =>
  WIRE_CASES.filter(([, name]) =>
    name.includes("base URL spellings")
      ? hasSpellingCase(entry)
      : name.includes("the alias model")
        ? hasAliasCase(entry)
        : true,
  ).length;
const credentialCaseCount = (entry: DecideCatalogJson): number =>
  entry.decide.baseURLRequired === true ? 2 : 1;

const isErrorCase = (name: string): boolean =>
  /^DECIDE [^:]+: (error |status \d+ outside every rule is |a rejected key latches|a key echoed)/.test(
    name,
  );
// The retry, malformed-reply, limit, media and timeout cases: judged by their
// own tests at the end, so the wire tests leave them out of their counts.
const isLaterCase = (name: string): boolean =>
  /^DECIDE [^:]+: (retryable error |non-retryable error |a retry that recovers|odd error bodies|a 200 without an answers container|a network failure is retried once|an empty question map|default timeout is|state window of |model "[^"]+" window of |question cap, |media is refused)/.test(
    name,
  );

// Run through the loop, not just built: the branches below are the ones the
// Laya entry does not take (every request names its model; the default model
// is the alias), and they must hold for a provider that is not Laya.
await test("the wire cases follow the entry: no spelling or alias case without their keys, and the other branches pass", async () => {
  const wireCases = (entry: DecideCatalogJson): ContractCase[] =>
    buildContractCases(entry, LAYA_INLINE_CONTRACT).filter(
      (c) => !isErrorCase(c.name) && !isLaterCase(c.name),
    );
  const wireNames = (entry: DecideCatalogJson): string[] =>
    wireCases(entry)
      .map((c) => c.name)
      .filter((n) => !n.endsWith(", no request"));
  const layaNames = wireNames(LAYA_ENTRY);
  assert(
    layaNames.length === wireCaseCount(LAYA_ENTRY) &&
      layaNames.some((n) => n.includes("base URL spellings")) &&
      layaNames.some((n) => n.includes("alias model")),
    `laya: ${layaNames.join("; ")}`,
  );
  const alwaysSent: DecideCatalogJson = {
    ...LAYA_ENTRY,
    decide: {
      ...LAYA_ENTRY.decide,
      baseURLNormalize: [],
      model: { placement: "body", alias: "auto" },
    },
  };
  const defaultIsAlias: DecideCatalogJson = {
    ...LAYA_ENTRY,
    models: { ...LAYA_ENTRY.models, default: "auto" },
  };
  // The default equals the alias name, but the placement sends the model
  // anyway: only a case that reads the placement expects "auto" in the body.
  const aliasNamedDefaultAlwaysSent: DecideCatalogJson = {
    ...alwaysSent,
    models: { ...alwaysSent.models, default: "auto" },
  };
  const bareNames = wireNames(alwaysSent);
  assert(
    bareNames.length === wireCaseCount(alwaysSent) &&
      !bareNames.some(
        (n) => n.includes("base URL spellings") || n.includes("alias model"),
      ),
    `no normalizer, model always sent: ${bareNames.join("; ")}`,
  );
  for (const entry of [
    alwaysSent,
    defaultIsAlias,
    aliasNamedDefaultAlwaysSent,
  ]) {
    const count = credentialCaseCount(entry) + wireCaseCount(entry);
    const results: TestRecord[] = [];
    await runContractCases(
      entry,
      LAYA_INLINE_CONTRACT,
      wireCases(entry),
      results,
      {
        quiet: true,
      },
    );
    const failed = results.filter((r) => !r.ok);
    assert(
      results.length === count && failed.length === 0,
      `${results.length} results, failed: ${failed.map((r) => `${r.name}: ${r.reason}`).join("; ")}`,
    );
  }
});

await test("a dialect with no known boolean wire type fails the wire case with a fixed message", async () => {
  const unknown: DecideCatalogJson = {
    ...LAYA_ENTRY,
    decide: {
      ...LAYA_ENTRY.decide,
      dialect:
        "other-dialect" as unknown as DecideCatalogJson["decide"]["dialect"],
    },
  };
  const wire = buildContractCases(unknown, LAYA_INLINE_CONTRACT).filter((c) =>
    c.name.startsWith("DECIDE laya: wire request"),
  );
  assert(wire.length === 1, `${wire.length} wire cases`);
  const results: TestRecord[] = [];
  await runContractCases(unknown, LAYA_INLINE_CONTRACT, wire, results, {
    quiet: true,
  });
  const reason = results[0]?.reason ?? "";
  assert(
    results.length === 1 &&
      !results[0].ok &&
      reason.includes("no boolean wire type is known") &&
      reason.includes("other-dialect"),
    `got ${JSON.stringify(results)}`,
  );
});

await test("a static case never reaches the real fetch, even when it asks and swallows the failure", async () => {
  let realCalls = 0;
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    realCalls += 1;
    return new Response("");
  };
  try {
    const results: TestRecord[] = [];
    await runContractCases(
      LAYA_ENTRY,
      STAND_IN,
      [
        {
          name: "static that asks",
          static: true,
          run: async (ctx) => {
            ctx.ok(true, "a placeholder assertion");
            await ctx.failureOf(() => ctx.ask());
          },
        },
      ],
      results,
      { quiet: true },
    );
    assert(realCalls === 0, `the real fetch was called ${realCalls} times`);
    assert(
      results.length === 1 && !results[0].ok,
      `the static case must fail: ${JSON.stringify(results)}`,
    );
  } finally {
    globalThis.fetch = realFetch;
  }
});

await test("a case may set only a proxy variable or the entry's own variables", async () => {
  await judge([
    {
      label: "sets the entry's three variables and clears a proxy variable",
      run: async (ctx) => {
        ctx.env.set(ctx.names.model, "contract-model");
        ctx.env.set("https_proxy", undefined);
        ctx.env.set("SOCKS_PROXY", undefined);
        await sendsOnce(ctx);
      },
    },
    {
      label: "sets a variable the entry does not own",
      run: async (ctx) => {
        ctx.env.set("UNRELATED_CONTRACT_VARIABLE", "x");
        await sendsOnce(ctx);
      },
      fails: "may set only",
      hides: ["UNRELATED_CONTRACT_VARIABLE"],
    },
    {
      label: "sets another provider's key",
      run: async (ctx) => {
        ctx.env.set("TYPESAFE_API_KEY", undefined);
        await sendsOnce(ctx);
      },
      fails: "may set only",
      hides: ["TYPESAFE_API_KEY"],
    },
    {
      label: "sets a variable and asserts nothing else",
      static: true,
      run: async (ctx) => ctx.env.set(ctx.names.model, "contract-model"),
      fails: "no assertion",
    },
  ]);
  // Laya's names are not this entry's: a case that hard-codes them fails here.
  const results: TestRecord[] = [];
  await runContractCases(
    OVERRIDDEN,
    overriddenFixture,
    [
      {
        name: "hard-coded Laya model variable",
        run: async (ctx) => {
          ctx.env.set("LAYA_MODEL", "contract-model");
          await ctx.mock([ctx.route(ACCEPTED)], (calls) => ctx.control(calls));
        },
      },
    ],
    results,
    { quiet: true },
  );
  assert(
    results.length === 1 &&
      !results[0].ok &&
      (results[0].reason ?? "").includes("may set only") &&
      !(results[0].reason ?? "").includes("LAYA_MODEL"),
    `got ${JSON.stringify(results)}`,
  );
});

await test("a read-back mismatch is reported under a fixed label, without the value the provider read", async () => {
  const SECRET = "AmbientRealSecret9xyz";
  const base = LAYA_INLINE_CONTRACT.success;
  const bodyOf = (patch: Record<string, unknown>): unknown => ({
    ...(base.body as Record<string, unknown>),
    ...patch,
  });
  const routed = bodyOf({ routing: { model: SECRET } });
  const legend = bodyOf({
    answers: {
      ...(base.body as { answers: Record<string, unknown> }).answers,
      mood: {
        ...((base.body as { answers: { mood: object } }).answers
          .mood as object),
        legend: { "0": SECRET, "1": "annoyed", "2": "angry" },
      },
    },
  });
  const scenarios: ReadonlyArray<
    readonly [string, DecideContractFixture, string]
  > = [
    [
      "the model that answered",
      { ...LAYA_INLINE_CONTRACT, success: { ...base, body: routed } },
      "the model that answered",
    ],
    [
      "the request id",
      {
        ...LAYA_INLINE_CONTRACT,
        success: { ...base, headers: { "x-litellm-call-id": SECRET } },
      },
      "request id from the reply headers",
    ],
    [
      "the answers",
      { ...LAYA_INLINE_CONTRACT, success: { ...base, body: legend } },
      "answers",
    ],
  ];
  for (const [what, fixture, label] of scenarios) {
    const cases = buildContractCases(LAYA_ENTRY, fixture).filter((c) =>
      c.name.endsWith("answers, model and request id are read back"),
    );
    assert(cases.length === 1, `${what}: ${cases.length} read-back cases`);
    const results: TestRecord[] = [];
    // The case compares against the fixture's own `expected`, which still
    // names the real values, so the reply above is a mismatch.
    await runContractCases(LAYA_ENTRY, fixture, cases, results, {
      quiet: true,
    });
    const reason = results[0]?.reason ?? "";
    assert(
      results.length === 1 && !results[0].ok && reason.includes(label),
      `${what}: expected a failure naming "${label}", got ${JSON.stringify(results)}`,
    );
    assert(!reason.includes(SECRET), `${what}: the reason shows the value`);
  }
});

for (const f of LAYA_DISK.errors) {
  await test(`error body "${f.label}" gives ${f.expect.kind}, retryable ${f.expect.retryable}`, () =>
    passed(
      `DECIDE ${LAYA_ENTRY.id}: error "${f.label}" (${f.provenance}) -> ${f.expect.kind}`,
    ));
}

await test("every decide.errors rule is exercised by a fixture that agrees with it", () => {
  const ruleResults = layaRun.recorded.filter((r) =>
    r.name.startsWith(`DECIDE ${LAYA_ENTRY.id}: error rule #`),
  );
  assert(
    ruleResults.length === LAYA_ENTRY.decide.errors.rules.length,
    `one result per rule, got ${ruleResults.length}`,
  );
  const failed = ruleResults.filter((r) => !r.ok);
  assert(
    failed.length === 0,
    failed.map((r) => `${r.name}: ${r.reason}`).join("; "),
  );
});

await test("a status outside every rule falls to the default kind", () => {
  const found = layaRun.recorded.filter((r) =>
    r.name.includes("outside every rule is"),
  );
  assert(
    found.length === 1 && found[0].ok,
    `expected one passing default-kind result, got ${JSON.stringify(found)}`,
  );
});

await test("a rejected key latches the provider and a new provider tries again", () =>
  passed(
    `DECIDE ${LAYA_ENTRY.id}: a rejected key latches the provider, a new one tries again`,
  ));

await test("a key echoed by the server or the network is scrubbed", () =>
  passed(
    `DECIDE ${LAYA_ENTRY.id}: a key echoed by the server or the network is scrubbed`,
  ));

await test("a fixture body outside every rule pins the default kind", () =>
  passed(
    `DECIDE ${LAYA_ENTRY.id}: error default kind ${LAYA_ENTRY.decide.errors.default} is pinned by a fixture`,
  ));

// One case each, besides one per body and one per rule.
const ERROR_SINGLES = [
  "error default kind",
  "outside every rule is",
  "a rejected key latches",
  "a key echoed",
];
const plannedErrorCases = (): number =>
  LAYA_DISK.errors.length +
  LAYA_ENTRY.decide.errors.rules.length +
  ERROR_SINGLES.length;

await test("the error cases are exactly the planned ones for Laya", () => {
  const names = layaRun.recorded.map((r) => r.name).filter(isErrorCase);
  const bodies = LAYA_DISK.errors;
  const rules = LAYA_ENTRY.decide.errors.rules;
  const single = ERROR_SINGLES;
  assert(
    names.length === plannedErrorCases(),
    `${names.length} error results: ${names.join("; ")}`,
  );
  const once = (fragment: string): boolean =>
    names.filter((n) => n.includes(fragment)).length === 1;
  for (const f of bodies) {
    assert(once(`: error "${f.label}" (`), `no single case for "${f.label}"`);
  }
  rules.forEach((_rule, index) => {
    assert(
      once(`: error rule #${index} (`),
      `no single case for rule ${index}`,
    );
  });
  for (const fragment of single) {
    assert(once(fragment), `no single case for "${fragment}"`);
  }
  const seenLive = bodies
    .filter((f) => f.provenance === "seen-live")
    .map((f) => f.label)
    .sort();
  assert(
    isDeepStrictEqual(seenLive, [
      "detail string",
      "masked key echo",
      "rate limit with a key hash",
      "unmasked key echo",
      "validation array",
    ]),
    `seen-live bodies: ${seenLive.join("; ")}`,
  );
});

// The loop is judged against entries and fixtures that are wrong in one way
// each: a case that does not turn red for its fault measures nothing. A
// scenario runs only the cases it names; the unmodified Laya run (layaRun) is
// the control for the same cases.
type Rules = DecideCatalogJson["decide"]["errors"]["rules"];
const LAYA_RULES: Rules = LAYA_ENTRY.decide.errors.rules;
const entryWith = (
  patch: Partial<DecideCatalogJson["decide"]["errors"]>,
): DecideCatalogJson => ({
  ...LAYA_ENTRY,
  decide: {
    ...LAYA_ENTRY.decide,
    errors: { ...LAYA_ENTRY.decide.errors, ...patch },
  },
});
const fixtureWithout = (...labels: string[]): DecideContractFixture => ({
  ...LAYA_INLINE_CONTRACT,
  errors: LAYA_INLINE_CONTRACT.errors.filter((f) => !labels.includes(f.label)),
});
const bodyAt = (label: string, status: number): DecideContractFixture => ({
  ...LAYA_INLINE_CONTRACT,
  errors: LAYA_INLINE_CONTRACT.errors.map((f) =>
    f.label === label ? { ...f, status } : f,
  ),
});
const ruleStatuses = (rule: Rules[number]): readonly number[] =>
  typeof rule.status === "number" ? [rule.status] : (rule.status ?? []);
const ruleIndex = (kind: string): number =>
  LAYA_RULES.findIndex((r) => r.kind === kind);
const ruleAt = (index: number): string => `error rule #${index} (`;
const bodyCase = (label: string): string => `error "${label}" (`;

type Scenario = {
  readonly what: string;
  readonly entry: DecideCatalogJson;
  readonly fixture?: DecideContractFixture;
  /** Name fragments of the cases that must turn red. */
  readonly red: readonly string[];
  /** Name fragments of cases that must stay green. */
  readonly green?: readonly string[];
  /** Text the failure reason of the named case must contain. */
  readonly says?: ReadonlyArray<readonly [string, string]>;
  /**
   * Fragments the unmodified run (Laya's, or the subject's) must hold: each matches at least one case
   * and every match passes. Default: the red and green fragments; name it when
   * a case exists only in the broken entry or fixture.
   */
  readonly control?: readonly string[];
};

// What a scenario is judged against: the fixture its cases default to, and the
// unmodified run that is its control.
type Subject = {
  readonly fixture: DecideContractFixture;
  readonly run: DecideContractRun;
};
const LAYA_SUBJECT: Subject = { fixture: LAYA_INLINE_CONTRACT, run: layaRun };

async function judgeScenarios(
  list: readonly Scenario[],
  subject: Subject = LAYA_SUBJECT,
): Promise<void> {
  for (const scenario of list) {
    const { what, entry } = scenario;
    assert(
      scenario.red.length > 0,
      `${what}: the scenario names no red case, so it judges nothing`,
    );
    const fixture = scenario.fixture ?? subject.fixture;
    const green = scenario.green ?? [];
    const wanted = [...scenario.red, ...green];
    const results: TestRecord[] = [];
    await runContractCases(
      entry,
      fixture,
      buildContractCases(entry, fixture).filter(
        (c) =>
          (isErrorCase(c.name) || isLaterCase(c.name)) &&
          wanted.some((w) => c.name.includes(w)),
      ),
      results,
      { quiet: true },
    );
    for (const fragment of scenario.red) {
      const hit = results.filter((r) => r.name.includes(fragment));
      assert(
        hit.length >= 1 && hit.every((r) => !r.ok),
        `${what}: "${fragment}" must be red, got ${JSON.stringify(hit)}`,
      );
    }
    for (const fragment of green) {
      const hit = results.filter((r) => r.name.includes(fragment));
      assert(
        hit.length >= 1 && hit.every((r) => r.ok),
        `${what}: "${fragment}" must stay green, got ${JSON.stringify(hit)}`,
      );
    }
    for (const [fragment, text] of scenario.says ?? []) {
      const reasons = results
        .filter((r) => r.name.includes(fragment))
        .map((r) => r.reason ?? "");
      assert(
        reasons.length >= 1 && reasons.every((r) => r.includes(text)),
        `${what}: the reason for "${fragment}" lacks "${text}": ${reasons.join(" | ")}`,
      );
    }
    // The control: the same cases on the unmodified entry and fixture pass.
    for (const fragment of scenario.control ?? wanted) {
      const control = subject.run.recorded.filter((r) =>
        r.name.includes(fragment),
      );
      assert(
        control.length > 0,
        `${what}: the control "${fragment}" matches no case of the unmodified run, so it controls nothing`,
      );
      assert(
        control.every((r) => r.ok),
        `${what}: the control for "${fragment}" is red`,
      );
    }
  }
}

await test("a rule whose kind, status, flag or edges are wrong, or that no body reaches, fails by name", async () => {
  const server = ruleIndex("server");
  const authentication = ruleIndex("authentication");
  const rateLimit = ruleIndex("rate_limit");
  const maxTokens = ruleIndex("max_tokens_exceeded");
  const overloaded = ruleIndex("overloaded");
  const withRule = (index: number, rule: Rules[number]): Rules =>
    LAYA_RULES.map((r, i) => (i === index ? rule : r));
  const control = bodyCase("masked key echo");
  const statusMin = LAYA_RULES[server].statusMin;
  if (statusMin === undefined) {
    throw new Error("Laya's catch-all rule has no statusMin");
  }
  const edge: number = statusMin;
  await judgeScenarios([
    {
      what: "kind changed on the 429 rule",
      entry: entryWith({
        rules: withRule(rateLimit, { status: 429, kind: "overloaded" }),
      }),
      red: [bodyCase("rate limit with a key hash"), ruleAt(rateLimit)],
      green: [control],
    },
    {
      what: "status changed on the 413 rule",
      entry: entryWith({
        rules: withRule(maxTokens, {
          status: 414,
          kind: "max_tokens_exceeded",
        }),
      }),
      red: [bodyCase("state too large"), ruleAt(maxTokens)],
      green: [control],
      says: [[ruleAt(maxTokens), "no fixture status reaches this rule"]],
    },
    {
      what: "retry flag changed on the 429 rule",
      entry: entryWith({
        rules: withRule(rateLimit, {
          status: 429,
          kind: "rate_limit",
          retryable: false,
        }),
      }),
      red: [bodyCase("rate limit with a key hash"), ruleAt(rateLimit)],
    },
    {
      what: "the 503 rule deleted",
      entry: entryWith({
        rules: LAYA_RULES.filter((_r, i) => i !== overloaded),
      }),
      red: [bodyCase("upstream unavailable")],
      green: [bodyCase("state too large")],
    },
    {
      what: "the catch-all server rule moved first",
      entry: entryWith({
        rules: [
          LAYA_RULES[server],
          ...LAYA_RULES.filter((_r, i) => i !== server),
        ],
      }),
      red: [ruleAt(0), bodyCase("upstream unavailable")],
    },
    {
      what: "a rule nothing reaches",
      entry: entryWith({
        rules: [...LAYA_RULES, { status: 418, kind: "invalid_request" }],
      }),
      red: [ruleAt(LAYA_RULES.length)],
      green: [ruleAt(server)],
      control: [ruleAt(server)],
      says: [
        [ruleAt(LAYA_RULES.length), "no fixture status reaches this rule"],
      ],
    },
    {
      what: "403 dropped from the authentication rule",
      entry: entryWith({
        rules: withRule(authentication, {
          status: 401,
          kind: "authentication",
        }),
      }),
      red: [bodyCase("forbidden")],
      green: [control],
    },
    {
      what: "a listed status that no body carries",
      entry: entryWith({
        rules: withRule(authentication, {
          status: [401, 403, 404],
          kind: "authentication",
        }),
      }),
      red: [ruleAt(authentication)],
      says: [[ruleAt(authentication), "the listed status 404"]],
    },
    {
      what: "the range edge moved down",
      entry: entryWith({
        rules: withRule(server, { statusMin: edge - 1, kind: "server" }),
      }),
      red: [ruleAt(server)],
      says: [[ruleAt(server), `status ${edge - 2}, just below it`]],
    },
    {
      what: "the range edge moved up",
      entry: entryWith({
        rules: withRule(server, { statusMin: edge + 1, kind: "server" }),
      }),
      red: [ruleAt(server), bodyCase("internal error")],
      says: [[ruleAt(server), `the lowest status ${edge + 1}`]],
    },
    {
      what: "no body at the lowest edge",
      entry: LAYA_ENTRY,
      fixture: fixtureWithout("internal error"),
      red: [ruleAt(server)],
      says: [[ruleAt(server), `the lowest status ${edge}`]],
    },
    {
      what: "no body above the lowest edge",
      entry: LAYA_ENTRY,
      fixture: bodyAt("bad gateway", edge),
      red: [ruleAt(server)],
      says: [[ruleAt(server), `a status above ${edge}`]],
    },
    {
      what: "no body just below the range",
      entry: LAYA_ENTRY,
      fixture: fixtureWithout("client closed request"),
      red: [ruleAt(server)],
      says: [[ruleAt(server), `status ${edge - 1}, just below it`]],
    },
  ]);
});

await test("a default kind no body pins, and a body that disagrees with the provider, fail by name", async () => {
  const fallThrough = LAYA_INLINE_CONTRACT.errors
    .filter((f) => !LAYA_RULES.some((r) => ruleStatuses(r).includes(f.status)))
    .filter(
      (f) => f.status < (LAYA_RULES[ruleIndex("server")].statusMin ?? 600),
    )
    .map((f) => f.label);
  assert(fallThrough.length >= 2, `bodies outside every rule: ${fallThrough}`);
  // The one fall-through body whose kind a body shape sets (FastAPI's
  // validation array), and the one whose kind the default decides.
  const shaped = "validation array";
  const plain = "detail string";
  assert(
    fallThrough.includes(shaped) && fallThrough.includes(plain),
    `bodies outside every rule: ${fallThrough}`,
  );
  const pinned = (kind: string): string =>
    `error default kind ${kind} is pinned`;
  await judgeScenarios([
    {
      what: "the default changed and no body falls through",
      entry: entryWith({ default: "server" }),
      fixture: fixtureWithout(...fallThrough),
      red: [pinned("server")],
      control: ["error default kind"],
    },
    {
      what: "the default changed with the bodies left in",
      entry: entryWith({ default: "server" }),
      red: [pinned("server"), bodyCase(plain)],
      control: ["error default kind", bodyCase(plain)],
    },
    {
      // max_tokens_exceeded is not retried by default, like the bodies'
      // invalid_request, so only the kind comparison can tell the two apart.
      what: "the default is max_tokens_exceeded and every body outside the rules says invalid_request",
      entry: entryWith({ default: "max_tokens_exceeded" }),
      red: [pinned("max_tokens_exceeded")],
      control: ["error default kind"],
    },
    {
      what: "the default is server and the only body outside the rules says it is not retried",
      entry: entryWith({ default: "server" }),
      fixture: {
        ...LAYA_INLINE_CONTRACT,
        errors: LAYA_INLINE_CONTRACT.errors
          .filter((f) => f.label === plain || !fallThrough.includes(f.label))
          .map((f) =>
            f.label === plain
              ? {
                  ...f,
                  expect: { kind: "server" as const, retryable: false },
                }
              : f,
          ),
      },
      red: [pinned("server")],
      control: ["error default kind"],
    },
    {
      // The only body left outside every rule gets its kind from a body shape,
      // which happens to equal the default: it pins the shape, not the default.
      what: "the only body outside the rules gets its kind from a body shape",
      entry: LAYA_ENTRY,
      fixture: fixtureWithout(...fallThrough.filter((l) => l !== shaped)),
      red: [pinned(LAYA_ENTRY.decide.errors.default)],
      control: ["error default kind"],
    },
    {
      // A shape that sets only a retry flag still decides it for the bodies it
      // reads: here every body outside the rules has a `detail` string.
      what: "every body outside the rules is read by a shape that sets a retry flag",
      entry: entryWith({
        bodyShapes: [
          { path: "detail", retryable: false },
          ...LAYA_ENTRY.decide.errors.bodyShapes,
        ],
      }),
      red: [pinned(LAYA_ENTRY.decide.errors.default)],
      control: ["error default kind"],
    },
    {
      what: "a body that disagrees with the provider",
      entry: LAYA_ENTRY,
      fixture: {
        ...LAYA_INLINE_CONTRACT,
        errors: LAYA_INLINE_CONTRACT.errors.map((f) =>
          f.label === "internal error"
            ? { ...f, expect: { ...f.expect, kind: "overloaded" } }
            : f,
        ),
      },
      red: [bodyCase("internal error"), ruleAt(ruleIndex("server"))],
    },
  ]);
});

await test("the latch, default and redaction cases are built only when the entry and the fixture call for them", () => {
  const names = (entry: DecideCatalogJson, fixture: DecideContractFixture) =>
    buildContractCases(entry, fixture)
      .map((c) => c.name)
      .filter(isErrorCase);
  const has = (list: readonly string[], fragment: string): boolean =>
    list.some((n) => n.includes(fragment));
  const normal = names(LAYA_ENTRY, LAYA_INLINE_CONTRACT);
  assert(has(normal, "a rejected key latches"), "no latch case");
  assert(has(normal, "a key echoed"), "no redaction case");
  assert(has(normal, "outside every rule"), "no default case");
  assert(has(normal, "error default kind"), "no default pin case");
  assert(
    !has(
      names(
        LAYA_ENTRY,
        fixtureWithout(
          ...LAYA_INLINE_CONTRACT.errors
            .filter((f) => f.expect.kind === "authentication")
            .map((f) => f.label),
        ),
      ),
      "a rejected key latches",
    ),
    "a latch case was built with no authentication body",
  );
  const coversEverything = names(
    entryWith({ rules: [{ statusMin: 400, kind: "invalid_request" }] }),
    LAYA_INLINE_CONTRACT,
  );
  assert(
    !has(coversEverything, "outside every rule") &&
      !has(coversEverything, "error default kind"),
    "a default case was built for rules that match every probe",
  );
  // Every status from 400 to 599 but 402 is named, so the default is reachable
  // at 402 only; the case must find it.
  const allButOne = names(
    entryWith({
      rules: [
        {
          status: Array.from({ length: 200 }, (_, i) => 400 + i).filter(
            (status) => status !== 402,
          ),
          kind: "invalid_request",
        },
      ],
    }),
    LAYA_INLINE_CONTRACT,
  );
  assert(
    has(allButOne, "status 402 outside every rule is") &&
      has(allButOne, "error default kind"),
    `no default case for the one unmatched status: ${allButOne.join("; ")}`,
  );
});

// ---- XOR: the shipped entry through the same loop, and the message pattern ----

function xorPassed(name: string): void {
  const found = xorRun.recorded.find((r) => r.name === name);
  if (found === undefined) {
    throw new Error(`no result named "${name}"`);
  }
  assert(found.ok, `${name} failed: ${found.reason ?? ""}`);
}

await test("the shipped xor.json passes every case of the loop, each planned once", () => {
  const names = xorRun.recorded.map((r) => r.name);
  assert(xorRun.planned >= 2, `planned ${xorRun.planned} cases`);
  assert(
    xorRun.recorded.length === xorRun.planned,
    `planned ${xorRun.planned}, recorded ${xorRun.recorded.length}`,
  );
  assert(new Set(names).size === names.length, "two results share a name");
  const failed = xorRun.recorded.filter((r) => !r.ok);
  assert(
    failed.length === 0,
    `failed: ${failed.map((r) => r.name).join("; ")}`,
  );
});

for (const f of XOR_DISK.errors) {
  await test(`xor error body "${f.label}" gives ${f.expect.kind}, retryable ${f.expect.retryable}`, () =>
    xorPassed(
      `DECIDE ${XOR_ENTRY.id}: error "${f.label}" (${f.provenance}) -> ${f.expect.kind}`,
    ));
}

const XOR_RULES: Rules = XOR_ENTRY.decide.errors.rules;
const patternedIndex = XOR_RULES.findIndex(
  (r) => r.messagePattern !== undefined,
);
// The rule after it with the same range and no pattern: what a 5xx falls to
// when its message does not match.
const plainServerIndex = XOR_RULES.findIndex(
  (r, i) =>
    i > patternedIndex &&
    r.messagePattern === undefined &&
    r.statusMin === XOR_RULES[patternedIndex]?.statusMin,
);
const overloadedIndex = XOR_RULES.findIndex((r) => r.kind === "overloaded");

await test("every xor rule, the message-pattern rule included, is exercised by a fixture that agrees with it", () => {
  assert(patternedIndex >= 0, "xor.json holds no rule with a messagePattern");
  assert(
    plainServerIndex > patternedIndex,
    "no plain rule with the same range follows the pattern rule",
  );
  const ruleResults = xorRun.recorded.filter((r) =>
    r.name.startsWith(`DECIDE ${XOR_ENTRY.id}: error rule #`),
  );
  assert(
    ruleResults.length === XOR_RULES.length,
    `one result per rule, got ${ruleResults.length}`,
  );
  const failed = ruleResults.filter((r) => !r.ok);
  assert(
    failed.length === 0,
    failed.map((r) => `${r.name}: ${r.reason}`).join("; "),
  );
  const patterned = ruleResults.find((r) =>
    r.name.includes(`error rule #${patternedIndex} (`),
  );
  assert(
    patterned?.name.includes("message matches /") === true &&
      patterned.name.includes(
        "one that matches the pattern and one that does not",
      ),
    "the pattern rule's case does not name the pattern and the two bodies it needs",
  );
});

await test("the xor error cases are exactly the planned ones, and no row claims to have been seen live", () => {
  const names = xorRun.recorded.map((r) => r.name).filter(isErrorCase);
  assert(
    names.length ===
      XOR_DISK.errors.length + XOR_RULES.length + ERROR_SINGLES.length,
    `${names.length} error results`,
  );
  const once = (fragment: string): boolean =>
    names.filter((n) => n.includes(fragment)).length === 1;
  for (const f of XOR_DISK.errors) {
    assert(once(`: error "${f.label}" (`), `no single case for "${f.label}"`);
  }
  XOR_RULES.forEach((_rule, index) => {
    assert(
      once(`: error rule #${index} (`),
      `no single case for rule ${index}`,
    );
  });
  for (const fragment of ERROR_SINGLES) {
    assert(once(fragment), `no single case for "${fragment}"`);
  }
  // No mocked case or comment says a body was captured from a real server or
  // proxy, so none is labelled as seen.
  assert(
    XOR_DISK.errors.every((f) => f.provenance === "stand-in"),
    "a row is labelled seen-live",
  );
});

await test("a status outside every xor rule falls to the default, and a body outside them pins it", () => {
  const found = xorRun.recorded.filter((r) =>
    r.name.includes("outside every rule is"),
  );
  assert(
    found.length === 1 && found[0].ok,
    `expected one passing default-kind result, got ${found.length}`,
  );
  xorPassed(
    `DECIDE ${XOR_ENTRY.id}: error default kind ${XOR_ENTRY.decide.errors.default} is pinned by a fixture`,
  );
});

await test("a message-pattern rule is judged on the message as well as the status", async () => {
  const xorEntryWith = (rules: Rules): DecideCatalogJson => ({
    ...XOR_ENTRY,
    decide: {
      ...XOR_ENTRY.decide,
      errors: { ...XOR_ENTRY.decide.errors, rules },
    },
  });
  const named = (labels: readonly string[]): readonly string[] => {
    const known = new Set(XOR_DISK.errors.map((f) => f.label));
    const unknown = labels.filter((label) => !known.has(label));
    if (unknown.length > 0) {
      throw new Error(`the XOR fixture holds no row ${unknown.join(", ")}`);
    }
    return labels;
  };
  // Rows that decide on the message: a 5xx with a context-length text.
  const matching = named([
    "context length on a 500",
    "context length behind a gateway",
    "validation array with a context-length message",
    "context length from the backend behind the gateway",
  ]);
  // Rows that are a 5xx whose message the pattern rejects: they reach the plain
  // rule, or the backend-refusal rule after it.
  const declining = named([
    "engine failure",
    "bad gateway",
    "gateway text",
    "upstream connect timeout",
    "context length after the match window",
    "backend refusal behind the gateway",
    "backend refusal on a 500",
  ]);
  const withBodies = (
    bodies: Readonly<Record<string, unknown>>,
  ): DecideContractFixture => {
    named(Object.keys(bodies));
    return {
      ...XOR_DISK,
      errors: XOR_DISK.errors.map((f) =>
        f.label in bodies ? { ...f, body: bodies[f.label] } : f,
      ),
    };
  };
  const without = (labels: readonly string[]): DecideContractFixture => ({
    ...XOR_DISK,
    errors: XOR_DISK.errors.filter((f) => !labels.includes(f.label)),
  });
  const swapped = (a: number, b: number): Rules =>
    XOR_RULES.map((r, i) =>
      i === a ? XOR_RULES[b] : i === b ? XOR_RULES[a] : r,
    );
  const patternRule = XOR_RULES[patternedIndex];
  const withoutPattern: Rules[number] = {
    statusMin: patternRule.statusMin,
    kind: patternRule.kind,
  };
  const subject: Subject = { fixture: XOR_DISK, run: xorRun };
  const patternCase = ruleAt(patternedIndex);
  await judgeScenarios(
    [
      {
        // The four bodies still declare max_tokens_exceeded, so a harness that
        // reads the status alone sees the pattern rule reached by them.
        what: "bodies that reach the pattern rule by status but whose message does not match it",
        entry: XOR_ENTRY,
        fixture: withBodies({
          "context length on a 500": { error: "engine failure" },
          "context length behind a gateway": {
            error: { message: "bad gateway" },
          },
          "validation array with a context-length message": {
            detail: [{ loc: ["body", "state"], msg: "invalid" }],
          },
          "context length from the backend behind the gateway": {
            error: { message: "bad gateway" },
          },
        }),
        red: [patternCase, bodyCase("context length on a 500")],
        says: [[patternCase, "no fixture status reaches this rule"]],
      },
      {
        what: "no body that the pattern rejects",
        entry: XOR_ENTRY,
        fixture: without(declining),
        red: [patternCase],
        says: [[patternCase, "message the pattern does not match"]],
      },
      {
        what: "no body that matches the pattern",
        entry: XOR_ENTRY,
        fixture: without(matching),
        red: [patternCase],
        green: [bodyCase("engine failure")],
      },
      {
        what: "the pattern removed from its rule",
        entry: xorEntryWith(
          XOR_RULES.map((r, i) => (i === patternedIndex ? withoutPattern : r)),
        ),
        red: [bodyCase("engine failure"), patternCase],
      },
      {
        what: "the pattern rule placed after the plain one",
        entry: xorEntryWith(swapped(patternedIndex, plainServerIndex)),
        red: [bodyCase("context length on a 500")],
      },
      {
        what: "the pattern rule placed before the 503 rule",
        entry: xorEntryWith(swapped(patternedIndex, overloadedIndex)),
        red: [bodyCase("context length text on a 503")],
        green: [bodyCase("overloaded")],
      },
      {
        what: "the pattern rule widened below the range",
        entry: xorEntryWith(
          XOR_RULES.map((r, i) =>
            i === patternedIndex ? { ...r, statusMin: 400 } : r,
          ),
        ),
        red: [bodyCase("context length text below the range")],
      },
    ],
    subject,
  );
});

// ---- OpenAI Decisions: the second dialect through the same loop ----

function openaiPassed(name: string): void {
  const found = openaiRun.recorded.find((r) => r.name === name);
  if (found === undefined) {
    throw new Error(`no result named "${name}"`);
  }
  assert(found.ok, `${name} failed: ${found.reason ?? ""}`);
}

await test("the shipped openai-decisions.json passes every case of the loop, each planned once", () => {
  const names = openaiRun.recorded.map((r) => r.name);
  assert(openaiRun.planned >= 2, `planned ${openaiRun.planned} cases`);
  assert(
    openaiRun.recorded.length === openaiRun.planned,
    `planned ${openaiRun.planned}, recorded ${openaiRun.recorded.length}`,
  );
  assert(new Set(names).size === names.length, "two results share a name");
  const failed = openaiRun.recorded.filter((r) => !r.ok);
  assert(
    failed.length === 0,
    `failed: ${failed.map((r) => r.name).join("; ")}`,
  );
});

for (const f of OPENAI_DISK.errors) {
  await test(`openai-decisions error body "${f.label}" gives ${f.expect.kind}, retryable ${f.expect.retryable}`, () =>
    openaiPassed(
      `DECIDE ${OPENAI_ENTRY.id}: error "${f.label}" (${f.provenance}) -> ${f.expect.kind}`,
    ));
}

const OPENAI_RULES: Rules = OPENAI_ENTRY.decide.errors.rules;

await test("every openai-decisions rule is exercised by a fixture that agrees with it", () => {
  const ruleResults = openaiRun.recorded.filter((r) =>
    r.name.startsWith(`DECIDE ${OPENAI_ENTRY.id}: error rule #`),
  );
  assert(
    ruleResults.length === OPENAI_RULES.length,
    `one result per rule, got ${ruleResults.length}`,
  );
  const failed = ruleResults.filter((r) => !r.ok);
  assert(
    failed.length === 0,
    failed.map((r) => `${r.name}: ${r.reason}`).join("; "),
  );
});

await test("the openai-decisions error cases are exactly the planned ones, and no row claims to have been seen live", () => {
  const names = openaiRun.recorded.map((r) => r.name).filter(isErrorCase);
  assert(
    names.length ===
      OPENAI_DISK.errors.length + OPENAI_RULES.length + ERROR_SINGLES.length,
    `${names.length} error results`,
  );
  const once = (fragment: string): boolean =>
    names.filter((n) => n.includes(fragment)).length === 1;
  for (const f of OPENAI_DISK.errors) {
    assert(once(`: error "${f.label}" (`), `no single case for "${f.label}"`);
  }
  OPENAI_RULES.forEach((_rule, index) => {
    assert(
      once(`: error rule #${index} (`),
      `no single case for rule ${index}`,
    );
  });
  for (const fragment of ERROR_SINGLES) {
    assert(once(fragment), `no single case for "${fragment}"`);
  }
  // No OpenAI reply to this endpoint has been captured, so no row says one was.
  assert(
    OPENAI_DISK.errors.every((f) => f.provenance === "stand-in"),
    "a row is labelled seen-live",
  );
});

await test("a status outside every openai-decisions rule falls to the default, and a body outside them pins it", () => {
  const found = openaiRun.recorded.filter((r) =>
    r.name.includes("outside every rule is"),
  );
  assert(
    found.length === 1 && found[0].ok,
    `expected one passing default-kind result, got ${found.length}`,
  );
  openaiPassed(
    `DECIDE ${OPENAI_ENTRY.id}: error default kind ${OPENAI_ENTRY.decide.errors.default} is pinned by a fixture`,
  );
});

await test("the openai-decisions wire is read through the OpenAI view: predicate, names, input, no answer map", () => {
  const wire = openaiRun.recorded.filter((r) =>
    r.name.includes(": wire request ("),
  );
  assert(
    wire.length === 1 && wire[0].name.endsWith("boolean as predicate)"),
    `wire case: ${wire.map((r) => r.name).join("; ")}`,
  );
  openaiPassed(
    `DECIDE ${OPENAI_ENTRY.id}: wire request (route, POST, bearer, model, boolean as predicate)`,
  );
  openaiPassed(`DECIDE ${OPENAI_ENTRY.id}: state text is sent verbatim`);
  openaiPassed(
    `DECIDE ${OPENAI_ENTRY.id}: answers, model and request id are read back`,
  );
  openaiPassed(
    `DECIDE ${OPENAI_ENTRY.id}: a 200 without an answers container is a server error, not retried`,
  );
  openaiPassed(
    `DECIDE ${OPENAI_ENTRY.id}: images ride in the input as one user message`,
  );
});

await test("with no base URL set the request goes to OpenAI's public endpoint, and a /v1 on an override is not doubled", async () => {
  // The literals are the oracle: the loop derives its endpoint from the entry,
  // so an entry whose template or default host drifted would agree with itself.
  const PUBLIC_ENDPOINT = "https://api.openai.com/v1/decisions";
  const reaching = (
    name: string,
    arrange: (ctx: CaseContext) => void,
    expected: (ctx: CaseContext) => string,
  ): ContractCase => ({
    name,
    run: async (ctx) => {
      arrange(ctx);
      await ctx.mock([{ url: /./, respond: ctx.success() }], async (calls) => {
        await ctx.ask();
        ctx.eq(calls.length, 1, "requests that reached the mock");
        ctx.ok(
          calls[0].url === expected(ctx),
          "the request goes to the expected endpoint",
        );
      });
    },
  });
  const results: TestRecord[] = [];
  await runContractCases(
    OPENAI_ENTRY,
    OPENAI_DISK,
    [
      reaching(
        "default host",
        (ctx) => ctx.env.set(ctx.names.baseURL, undefined),
        () => PUBLIC_ENDPOINT,
      ),
      reaching(
        "blank base URL",
        (ctx) => ctx.env.set(ctx.names.baseURL, "  "),
        () => PUBLIC_ENDPOINT,
      ),
      reaching(
        "override with /v1",
        (ctx) => ctx.env.set(ctx.names.baseURL, `${ctx.baseURL}/v1`),
        (ctx) => `${ctx.baseURL}/v1/decisions`,
      ),
      reaching(
        "override with /v1/",
        (ctx) => ctx.env.set(ctx.names.baseURL, `${ctx.baseURL}/v1/`),
        (ctx) => `${ctx.baseURL}/v1/decisions`,
      ),
    ],
    results,
    { quiet: true },
  );
  const failed = results.filter((r) => !r.ok);
  assert(
    results.length === 4 && failed.length === 0,
    `${results.length} results, failed: ${failed.map((r) => `${r.name}: ${r.reason}`).join("; ")}`,
  );
});

await test("the first invalid_request row is the 403, so the latch case judges that it never trips the breaker", () => {
  const first = OPENAI_DISK.errors.find(
    (f) => f.expect.kind === "invalid_request",
  );
  assert(
    first?.status === 403,
    `the first invalid_request row has status ${first?.status}`,
  );
  openaiPassed(
    `DECIDE ${OPENAI_ENTRY.id}: a rejected key latches the provider, a new one tries again`,
  );
});

await test("an openai-decisions rule list that is wrong in one way fails by name", async () => {
  const entryWith = (
    patch: Partial<DecideCatalogJson["decide"]["errors"]>,
  ): DecideCatalogJson => ({
    ...OPENAI_ENTRY,
    decide: {
      ...OPENAI_ENTRY.decide,
      errors: { ...OPENAI_ENTRY.decide.errors, ...patch },
    },
  });
  const indexOfKind = (kind: string): number =>
    OPENAI_RULES.findIndex((r) => r.kind === kind);
  const authentication = indexOfKind("authentication");
  const rateLimit = indexOfKind("rate_limit");
  const server = OPENAI_RULES.findIndex(
    (r) => r.kind === "server" && r.statusMin !== undefined,
  );
  assert(
    authentication >= 0 && rateLimit >= 0 && server >= 0,
    "openai-decisions.json lost a rule the scenarios below need",
  );
  const edge = OPENAI_RULES[server].statusMin;
  if (edge === undefined) {
    throw new Error("the server rule has no statusMin");
  }
  const withRule = (index: number, rule: Rules[number]): Rules =>
    OPENAI_RULES.map((r, i) => (i === index ? rule : r));
  await judgeScenarios(
    [
      {
        what: "401 and 403 swapped: the unsupported-country error rejects the key",
        entry: entryWith({
          rules: withRule(authentication, {
            status: 403,
            kind: "authentication",
          }),
        }),
        red: [
          ruleAt(authentication),
          bodyCase("invalid key"),
          bodyCase("unsupported country"),
          "a rejected key latches",
        ],
      },
      {
        what: "429 left retryable",
        entry: entryWith({
          rules: withRule(rateLimit, { status: 429, kind: "rate_limit" }),
        }),
        red: [
          ruleAt(rateLimit),
          bodyCase("rate limit"),
          bodyCase("quota exhausted"),
        ],
        green: [bodyCase("invalid key"), bodyCase("overloaded")],
      },
      {
        what: "the server range starts one status late",
        entry: entryWith({
          rules: withRule(server, {
            ...OPENAI_RULES[server],
            statusMin: edge + 1,
          }),
        }),
        red: [ruleAt(server), bodyCase("server error")],
        green: [bodyCase("upstream timeout")],
      },
      {
        what: "the default kind is not the one the fixture pins",
        entry: entryWith({ default: "server" }),
        red: [bodyCase("missing parameter"), "error default kind"],
      },
    ],
    { fixture: OPENAI_DISK, run: openaiRun },
  );
});

await test("negative control: a wrong expected answer fails exactly the read-back case on the OpenAI wire", async () => {
  const { success } = OPENAI_DISK;
  const wrong: DecideContractFixture = {
    ...OPENAI_DISK,
    success: {
      ...success,
      expected: {
        ...success.expected,
        answers: {
          ...success.expected.answers,
          urgent: { type: "boolean", probability: 0.12 },
        },
      },
    },
  };
  assert(
    !isDeepStrictEqual(wrong.success.expected, success.expected),
    "the change left the expected answers as they were",
  );
  const run = await runDecideProviderContract(OPENAI_ENTRY, {
    fixture: wrong,
    quiet: true,
  });
  assert(
    run.recorded.length === run.planned && run.planned === openaiRun.planned,
    `${run.recorded.length} results for ${run.planned} planned cases, the unmodified fixture plans ${openaiRun.planned}`,
  );
  const failed = run.recorded.filter((r) => !r.ok).map((r) => r.name);
  assert(
    failed.length === 2 &&
      failed.some((n) => n.includes("are read back")) &&
      failed.some((n) => n.includes("a retry that recovers")),
    `only the two cases that compare answers fail: ${failed.join("; ")}`,
  );
});

await test("a reply in System One's spelling is not read on the OpenAI wire", async () => {
  const original = JSON.stringify(OPENAI_DISK.success.body);
  const spelt = original.replace('"type":"predicate"', '"type":"noul"');
  assert(spelt !== original, "the reply holds no predicate answer to respell");
  const run = await runDecideProviderContract(OPENAI_ENTRY, {
    fixture: {
      ...OPENAI_DISK,
      success: {
        ...OPENAI_DISK.success,
        body: JSON.parse(spelt) as unknown,
      },
    },
    quiet: true,
  });
  const failed = run.recorded.filter((r) => !r.ok).map((r) => r.name);
  assert(
    failed.some((n) => n.includes("are read back")),
    `the read-back case stays green: ${failed.join("; ")}`,
  );
  assert(
    failed.every(
      (n) => n.includes("are read back") || n.includes("a retry that recovers"),
    ),
    `a case other than the two that compare answers fails: ${failed.join("; ")}`,
  );
});

// ---- ScaleDown: an x-api-key header and a text state through the same loop ----

function scaledownPassed(name: string): void {
  const found = scaledownRun.recorded.find((r) => r.name === name);
  if (found === undefined) {
    throw new Error(`no result named "${name}"`);
  }
  assert(found.ok, `${name} failed: ${found.reason ?? ""}`);
}

await test("the shipped scaledown.json passes every case of the loop, each planned once, and no row claims to have been seen live", () => {
  const names = scaledownRun.recorded.map((r) => r.name);
  assert(scaledownRun.planned >= 2, `planned ${scaledownRun.planned} cases`);
  assert(
    scaledownRun.recorded.length === scaledownRun.planned,
    `planned ${scaledownRun.planned}, recorded ${scaledownRun.recorded.length}`,
  );
  assert(new Set(names).size === names.length, "two results share a name");
  const failed = scaledownRun.recorded.filter((r) => !r.ok);
  assert(
    failed.length === 0,
    `failed: ${failed.map((r) => r.name).join("; ")}`,
  );
  // No reply from ScaleDown's endpoint was captured in this project.
  assert(
    SCALEDOWN_DISK.errors.every((f) => f.provenance === "stand-in"),
    "a row is labelled seen-live",
  );
});

await test("every scaledown rule is exercised by a fixture that agrees with it, and each error body gives the kind the fixture declares", () => {
  const rules: Rules = SCALEDOWN_ENTRY.decide.errors.rules;
  const ruleResults = scaledownRun.recorded.filter((r) =>
    r.name.startsWith(`DECIDE ${SCALEDOWN_ENTRY.id}: error rule #`),
  );
  assert(
    ruleResults.length === rules.length,
    `one result per rule, got ${ruleResults.length}`,
  );
  for (const f of SCALEDOWN_DISK.errors) {
    scaledownPassed(
      `DECIDE ${SCALEDOWN_ENTRY.id}: error "${f.label}" (${f.provenance}) -> ${f.expect.kind}`,
    );
  }
  // The 504 rule's kind has no retry by default: a fixture row pins it.
  assert(
    SCALEDOWN_DISK.errors.some(
      (f) =>
        f.status === 504 &&
        f.expect.kind === "timeout" &&
        f.expect.retryable === false,
    ),
    "no fixture row pins the 504 as a timeout that is not retried",
  );
});

await test("the scaledown wire case judges the key in x-api-key with no Authorization, and the verbatim case judges the state as one text", () => {
  // The literals are the oracle: the loop reads these two fields of the entry.
  assert(
    SCALEDOWN_ENTRY.decide.authHeader === "x-api-key" &&
      SCALEDOWN_ENTRY.decide.stateEncoding === "text",
    "the shipped entry must ask for both",
  );
  scaledownPassed(
    `DECIDE ${SCALEDOWN_ENTRY.id}: wire request (route, POST, bearer, model, boolean as noul)`,
  );
  scaledownPassed(`DECIDE ${SCALEDOWN_ENTRY.id}: state text is sent verbatim`);
  scaledownPassed(
    `DECIDE ${SCALEDOWN_ENTRY.id}: answers, model and request id are read back`,
  );
});

// The cases a run fails that the unchanged entry's own run does not, so a
// fault elsewhere in the entry does not blur what a control is looking for.
function newlyFailed(run: {
  recorded: readonly { name: string; ok: boolean }[];
}) {
  const alreadyFailing = new Set(
    scaledownRun.recorded.filter((r) => !r.ok).map((r) => r.name),
  );
  return run.recorded
    .filter((r) => !r.ok && !alreadyFailing.has(r.name))
    .map((r) => r.name);
}

/**
 * The entry the loop plans from says `first` for `field`; every later read, by
 * the provider on a request, says `later`. The loop reads the two fields once
 * while it plans its cases, so the loop expects what the entry first declared
 * and the provider acts on what it declares afterwards.
 */
function entryThatChangesItsMind(
  field: "authHeader" | "stateEncoding",
  first: "x-api-key" | "text",
  later: "bearer" | undefined,
): { entry: DecideCatalogJson; reads: () => number } {
  let reads = 0;
  const decide = new Proxy(SCALEDOWN_ENTRY.decide, {
    get(target, prop, receiver): unknown {
      if (prop === field) {
        reads += 1;
        return reads === 1 ? first : later;
      }
      return Reflect.get(target, prop, receiver);
    },
  });
  return { entry: { ...SCALEDOWN_ENTRY, decide }, reads: () => reads };
}

await test("a provider that sends a Bearer token where the entry declared x-api-key fails the wire case, and only that case", async () => {
  const flipped = entryThatChangesItsMind("authHeader", "x-api-key", "bearer");
  const run = await runDecideProviderContract(flipped.entry, {
    fixture: SCALEDOWN_DISK,
    quiet: true,
  });
  assert(
    flipped.reads() >= 2,
    "precondition: the provider read the field after the loop planned from it",
  );
  const failed = newlyFailed(run);
  assert(
    failed.length === 1 && failed[0].includes(": wire request ("),
    `expected the wire case alone to start failing, got: ${failed.join("; ")}`,
  );
});

await test("a provider that sends an object state raw where the entry declared a text state fails the verbatim case, and only that case", async () => {
  const flipped = entryThatChangesItsMind("stateEncoding", "text", undefined);
  const run = await runDecideProviderContract(flipped.entry, {
    fixture: SCALEDOWN_DISK,
    quiet: true,
  });
  assert(
    flipped.reads() >= 2,
    "precondition: the provider read the field after the loop planned from it",
  );
  const failed = newlyFailed(run);
  assert(
    failed.length === 1 && failed[0].includes(": state text is sent verbatim"),
    `expected the verbatim case alone to start failing, got: ${failed.join("; ")}`,
  );
});

// ---- retries, malformed replies, limits, media and the timeout ----

function passedLike(fragment: string): void {
  const found = layaRun.recorded.filter((r) => r.name.includes(fragment));
  assert(
    found.length === 1,
    `expected one result containing "${fragment}", got ${found.length}`,
  );
  assert(found[0].ok, `${found[0].name} failed: ${found[0].reason ?? ""}`);
}
const retryable = LAYA_DISK.errors.find((f) => f.expect.retryable);
const permanent = LAYA_DISK.errors.find((f) => !f.expect.retryable);

await test("a retryable error is retried once and a permanent one is not", () => {
  if (retryable === undefined || permanent === undefined) {
    throw new Error("the Laya fixture needs a retryable and a permanent body");
  }
  passed(
    `DECIDE ${LAYA_ENTRY.id}: retryable error "${retryable.label}" is retried once`,
  );
  passed(
    `DECIDE ${LAYA_ENTRY.id}: non-retryable error "${permanent.label}" is not retried`,
  );
});

await test("a retry that recovers returns the answers of the second reply", () =>
  passedLike("a retry that recovers returns the answers"));

await test("a network failure is retried once", () =>
  passed(`DECIDE ${LAYA_ENTRY.id}: a network failure is retried once`));

for (const [model, own] of Object.entries(
  LAYA_ENTRY.decisionLimits?.models ?? {},
)) {
  if (model !== LAYA_ENTRY.models.default) {
    await test(`the ${model} model's window of ${own.maxStateTokens} tokens is enforced at its edge`, () =>
      passed(
        `DECIDE ${LAYA_ENTRY.id}: model "${model}" window of ${own.maxStateTokens} tokens is enforced before any request`,
      ));
  }
}

await test("odd error bodies still classify by status and never surface markup", () =>
  passedLike("odd error bodies keep the status classification"));

await test("a 200 without an answers container is a non-retried server error", () =>
  passedLike(
    "a 200 without an answers container is a server error, not retried",
  ));

await test("an empty question map is refused with no request", () =>
  passedLike("an empty question map is refused with no request"));

await test("the default timeout is decideMs and a caller's timeoutMs wins", () =>
  passedLike("default timeout is decideMs and a caller's timeoutMs wins"));

await test("the state window is enforced at its edge with zero requests over it", () =>
  passedLike("state window of"));

await test("the question cap sends N and refuses N+1", () =>
  passedLike("question cap, "));

await test("media is refused when the entry declares none", () =>
  passedLike("media is refused when the entry declares none"));

// The models other than the default that Laya declares limits for.
const OTHER_MODELS = Object.entries(
  LAYA_ENTRY.decisionLimits?.models ?? {},
).filter(([model]) => model !== LAYA_ENTRY.models.default);

// What the entry and the fixture call for besides the error cases, as name
// fragments: one case each.
const plannedLaterFragments = (): string[] => {
  const id = LAYA_ENTRY.id;
  const limits = LAYA_ENTRY.decisionLimits;
  const window =
    limits?.models?.[LAYA_ENTRY.models.default]?.maxStateTokens ??
    limits?.maxStateTokens;
  const cap = limits?.maxQuestions;
  return [
    ...(retryable === undefined
      ? []
      : [
          `${id}: retryable error "${retryable.label}" is retried once`,
          `${id}: a retry that recovers`,
        ]),
    ...(permanent === undefined
      ? []
      : [`${id}: non-retryable error "${permanent.label}" is not retried`]),
    `${id}: a network failure is retried once`,
    `${id}: odd error bodies`,
    `${id}: a 200 without an answers container`,
    `${id}: an empty question map`,
    `${id}: default timeout is`,
    ...(window === undefined
      ? []
      : [
          `${id}: state window of ${window} tokens is enforced before any request`,
        ]),
    ...OTHER_MODELS.map(
      ([model, own]) =>
        `${id}: model "${model}" window of ${own.maxStateTokens} tokens is enforced before any request`,
    ),
    ...(cap === undefined
      ? []
      : [`${id}: question cap, ${cap} sent and ${cap + 1} refused`]),
    ...(limits?.media === undefined
      ? [`${id}: media is refused when the entry declares none`]
      : []),
  ];
};

await test("the later cases are exactly the planned ones for Laya", () => {
  assert(OTHER_MODELS.length > 0, "Laya declares no window for another model");
  const planned = plannedLaterFragments();
  const names = layaRun.recorded.map((r) => r.name).filter(isLaterCase);
  assert(
    names.length === planned.length,
    `${names.length} later results: ${names.join("; ")}`,
  );
  for (const fragment of planned) {
    assert(
      names.filter((n) => n.includes(fragment)).length === 1,
      `no single case for "${fragment}"`,
    );
  }
});

// The limit and timeout cases read the entry and the provider reads its
// descriptor, so an entry that disagrees with the provider must turn them red.
await test("a limit, cap, timeout or retry flag the entry gets wrong turns its case red", async () => {
  const limits = LAYA_ENTRY.decisionLimits;
  if (limits === undefined || limits.maxQuestions === undefined) {
    throw new Error("the Laya entry declares no limits");
  }
  const withLimits = (patch: Partial<typeof limits>): DecideCatalogJson => ({
    ...LAYA_ENTRY,
    decisionLimits: { ...limits, ...patch },
  });
  const [otherModel, otherOwn] = OTHER_MODELS[0] ?? [];
  if (otherModel === undefined || otherOwn?.maxStateTokens === undefined) {
    throw new Error("Laya declares no window for another model");
  }
  const widerWindow = otherOwn.maxStateTokens + 80;
  const rule = (kind: string): number =>
    LAYA_RULES.findIndex((r) => r.kind === kind);
  const withFlag = (kind: string, retryable: boolean): DecideCatalogJson =>
    entryWith({
      rules: LAYA_RULES.map((r, i) =>
        i === rule(kind) ? { ...r, retryable } : r,
      ),
    });
  await judgeScenarios([
    {
      what: "a window wider than the provider's",
      entry: withLimits({
        models: {
          ...limits.models,
          [LAYA_ENTRY.models.default]: { maxStateTokens: 800 },
        },
      }),
      red: ["state window of 800 tokens"],
      control: ["state window of"],
    },
    {
      what: "a window for another model wider than the provider's",
      entry: withLimits({
        models: {
          ...limits.models,
          [otherModel]: { ...otherOwn, maxStateTokens: widerWindow },
        },
      }),
      red: [`model "${otherModel}" window of ${widerWindow} tokens`],
      control: [`model "${otherModel}" window of`],
    },
    {
      what: "an advisory window the provider enforces",
      entry: withLimits({ advisory: true }),
      red: ["state window of 768 tokens is left to the server"],
      control: ["state window of"],
    },
    {
      what: "a question cap above the provider's",
      entry: withLimits({ maxQuestions: limits.maxQuestions + 6 }),
      red: ["question cap, "],
      control: ["question cap, "],
    },
    {
      what: "a decideMs the provider does not use",
      entry: { ...LAYA_ENTRY, timeouts: { decideMs: 4321 } },
      red: ["default timeout is decideMs"],
      control: ["default timeout is decideMs"],
    },
    {
      what: "the rate limit rule marked not retryable",
      entry: withFlag("rate_limit", false),
      red: [
        `retryable error "${retryable?.label}" is retried once`,
        "a retry that recovers",
      ],
      control: ["is retried once", "a retry that recovers"],
    },
    {
      what: "the authentication rule marked retryable",
      entry: withFlag("authentication", true),
      red: [`non-retryable error "${permanent?.label}" is not retried`],
      control: ["is not retried"],
    },
    {
      what: "the authentication rule given another kind",
      entry: entryWith({
        rules: LAYA_RULES.map((r) =>
          r.kind === "authentication" ? { ...r, kind: "invalid_request" } : r,
        ),
      }),
      red: ["odd error bodies keep the status classification"],
      control: ["odd error bodies"],
    },
  ]);
});

// The advisory half of the limit cases cannot run on Laya, whose limits are
// enforced. TypeSafe's descriptor is advisory, and the provider looks its
// limits up by the entry's id, so an entry named for it takes that branch.
await test("an advisory limit is left to the server: the over-limit request is sent", async () => {
  const advisory: DecideCatalogJson = {
    ...LAYA_ENTRY,
    id: "typesafe",
    decisionLimits: { maxStateTokens: 33_000, advisory: true },
  };
  const fixture: DecideContractFixture = {
    ...LAYA_INLINE_CONTRACT,
    id: "typesafe",
  };
  const cases = buildContractCases(advisory, fixture).filter((c) =>
    c.name.includes(": state window of "),
  );
  assert(
    cases.length === 1 && cases[0].name.endsWith("is left to the server"),
    `got ${cases.map((c) => c.name).join("; ")}`,
  );
  const results: TestRecord[] = [];
  await runContractCases(advisory, fixture, cases, results, { quiet: true });
  assert(
    results.length === 1 && results[0].ok,
    `got ${JSON.stringify(results)}`,
  );
  const enforced = layaRun.recorded.filter((r) =>
    r.name.includes(": state window of "),
  );
  assert(
    enforced.length === 1 && enforced[0].name.endsWith("before any request"),
    `got ${enforced.map((r) => r.name).join("; ")}`,
  );
});

await test("a scenario that names no red case, or whose control matches nothing, fails loudly", async () => {
  const rejection = async (scenario: Scenario): Promise<string> => {
    try {
      await judgeScenarios([scenario]);
    } catch (error) {
      return error instanceof Error ? error.message : String(error);
    }
    return "";
  };
  const sound: Scenario = {
    what: "kind changed on the 429 rule",
    entry: entryWith({
      rules: LAYA_RULES.map((r) =>
        r.kind === "rate_limit" ? { ...r, kind: "overloaded" } : r,
      ),
    }),
    red: [bodyCase("rate limit with a key hash")],
  };
  assert(
    (await rejection(sound)) === "",
    `the sound scenario failed: ${await rejection(sound)}`,
  );
  const empty = await rejection({ ...sound, red: [] });
  assert(
    empty.includes("judges nothing"),
    `a scenario with no red case: ${empty}`,
  );
  const blind = await rejection({ ...sound, control: ["no such case"] });
  assert(
    blind.includes("controls nothing"),
    `a control that matches nothing: ${blind}`,
  );
});

// ---- controls: the loop can fail, and it reads its own fixture ----

await test("positive control: the Laya run recorded every case it planned, and they all pass", () => {
  const problem = loopCoverageProblem({
    entries: 1,
    minEntries: 1,
    planned: layaRun.planned,
    ran: layaRun.recorded.length,
  });
  assert(problem === undefined, problem ?? "");
  assert(
    layaRun.planned >= 25,
    `expected at least 25 cases, planned ${layaRun.planned}`,
  );
  const failed = layaRun.recorded.filter((r) => !r.ok);
  assert(
    failed.length === 0,
    failed.map((r) => `${r.name}: ${r.reason}`).join("; "),
  );
});

// The floor above would not notice a loop that lost a third of its cases; this
// sums the counts the suite's own tests derive from the entry and the fixture.
await test("positive control: the Laya loop plans exactly the cases the entry and the fixture call for", () => {
  const parts = [
    credentialCaseCount(LAYA_ENTRY),
    wireCaseCount(LAYA_ENTRY),
    plannedErrorCases(),
    plannedLaterFragments().length,
  ];
  const expected = parts.reduce((sum, n) => sum + n, 0);
  assert(
    layaRun.planned === expected,
    `the loop planned ${layaRun.planned} cases; the entry and the fixture call for ${expected} (${parts.join(" + ")})`,
  );
});

await test("the coverage check reports an empty loop, a dropped or extra result and an entry with no cases, each in its own words", () => {
  const empty = loopCoverageProblem({
    entries: 0,
    minEntries: 1,
    planned: 0,
    ran: 0,
  });
  assert(empty?.includes("at least 1") === true, `zero entries: ${empty}`);
  assert(
    loopCoverageProblem({ entries: 0, minEntries: 0, planned: 0, ran: 0 }) ===
      undefined,
    "zero entries pass while none are required",
  );
  const short = loopCoverageProblem({
    entries: 1,
    minEntries: 2,
    planned: 40,
    ran: 40,
  });
  assert(short?.includes("at least 2") === true, `too few entries: ${short}`);
  const dropped = loopCoverageProblem({
    entries: 2,
    minEntries: 1,
    planned: 40,
    ran: 39,
  });
  assert(
    dropped?.includes("39 results for 40") === true,
    `a dropped result: ${dropped}`,
  );
  const extra = loopCoverageProblem({
    entries: 2,
    minEntries: 1,
    planned: 40,
    ran: 41,
  });
  assert(
    extra?.includes("41 results for 40") === true,
    `an extra result: ${extra}`,
  );
  const caseless = loopCoverageProblem({
    entries: 1,
    minEntries: 0,
    planned: 0,
    ran: 0,
  });
  assert(
    caseless?.includes("planned no cases") === true,
    `an entry with no cases: ${caseless}`,
  );
  assert(
    loopCoverageProblem({ entries: 3, minEntries: 1, planned: 40, ran: 40 }) ===
      undefined,
    "a loop that ran what it planned passes",
  );
  assert(
    loopCoverageProblem({ entries: 2, minEntries: 2, planned: 1, ran: 1 }) ===
      undefined,
    "the minimum is met exactly",
  );
});

// The two negative controls change one thing and name what must turn red. A
// control whose change did nothing would find nothing red and fail, so each
// first checks that its change is a change.
await test("negative control: changing one rule fails the named cases and leaves the rest passing", async () => {
  assert(
    LAYA_RULES.some((r) => r.kind === "rate_limit"),
    "Laya has a rate_limit rule to break",
  );
  const broken = entryWith({
    rules: LAYA_RULES.map((r) =>
      r.kind === "rate_limit" ? { ...r, kind: "server" as const } : r,
    ),
  });
  assert(
    !isDeepStrictEqual(broken.decide.errors.rules, LAYA_RULES),
    "the change left the rules as they were",
  );
  // The error bodies, the rule cases and one case the rule cannot touch: the
  // full list would spend seconds of real retry backoff on cases that say
  // nothing about this rule.
  const cases = buildContractCases(broken, LAYA_INLINE_CONTRACT).filter(
    (c) =>
      c.name.includes(': error "') ||
      c.name.includes(": error rule #") ||
      c.name.endsWith("no key, no request"),
  );
  const results: TestRecord[] = [];
  await runContractCases(broken, LAYA_INLINE_CONTRACT, cases, results, {
    quiet: true,
  });
  assert(
    results.length === cases.length,
    `${results.length} results for ${cases.length} cases`,
  );
  const failed = results.filter((r) => !r.ok).map((r) => r.name);
  assert(
    failed.some((n) => n.includes(': error "') && n.endsWith("-> rate_limit")),
    `a fixture case fails: ${failed.join("; ")}`,
  );
  assert(
    failed.some((n) => n.includes(": error rule #")),
    `the rule case fails: ${failed.join("; ")}`,
  );
  assert(
    results.some((r) => r.ok && r.name.endsWith("no key, no request")),
    "an unrelated case still passes",
  );
  assert(
    results.some(
      (r) =>
        r.ok &&
        r.name.includes(': error "') &&
        !r.name.endsWith("-> rate_limit"),
    ),
    "a fixture case for another rule still passes",
  );
  assert(
    failed.every(
      (n) => n.endsWith("-> rate_limit") || n.includes(": error rule #"),
    ),
    `only cases about the broken rule fail: ${failed.join("; ")}`,
  );
});

await test("negative control: a wrong expected model fails exactly the read-back case", async () => {
  const { success } = LAYA_INLINE_CONTRACT;
  const wrong: DecideContractFixture = {
    ...LAYA_INLINE_CONTRACT,
    success: {
      ...success,
      expected: { ...success.expected, model: "not-the-model" },
    },
  };
  assert(
    wrong.success.expected.model !== success.expected.model,
    "the change left the expected model as it was",
  );
  const run = await runDecideProviderContract(LAYA_ENTRY, {
    fixture: wrong,
    quiet: true,
  });
  const unmodified = buildContractCases(LAYA_ENTRY, LAYA_INLINE_CONTRACT);
  assert(
    run.recorded.length === run.planned && run.planned === unmodified.length,
    `${run.recorded.length} results for ${run.planned} planned cases, the unmodified fixture plans ${unmodified.length}`,
  );
  const failed = run.recorded.filter((r) => !r.ok).map((r) => r.name);
  assert(
    failed.length === 1 && failed[0].includes("are read back"),
    `only the read-back case fails: ${failed.join("; ")}`,
  );
});

await test("a case that asserts nothing is reported as a failure", async () => {
  const results: TestRecord[] = [];
  const empty = { name: "empty case", run: async () => undefined };
  await runContractCases(LAYA_ENTRY, LAYA_INLINE_CONTRACT, [empty], results, {
    quiet: true,
  });
  assert(results.length === 1 && !results[0].ok, "recorded as a failure");
  assert(
    (results[0].reason ?? "").includes("no assertion"),
    `reason: ${results[0].reason}`,
  );
});

// A fixture that cannot be used makes ONE failed case that counts as one
// planned case, so an entry is never skipped for want of one.
await test("a missing or unusable fixture, a mismatched id and a stray placeholder are one failed case each", async () => {
  const lone = (
    run: { planned: number; recorded: readonly TestRecord[] },
    mention: string,
  ): void => {
    assert(
      run.planned === 1 && run.recorded.length === 1,
      `${run.planned} planned, ${run.recorded.length} recorded`,
    );
    const [only] = run.recorded;
    assert(
      /^DECIDE .+: contract can run$/.test(only.name),
      `the case is ${only.name}`,
    );
    assert(
      !only.ok && (only.reason ?? "").includes(mention),
      `reason: ${only.reason}`,
    );
    assert(
      loopCoverageProblem({
        entries: 1,
        minEntries: 1,
        planned: run.planned,
        ran: run.recorded.length,
      }) === undefined,
      "the lone case keeps the coverage check satisfied",
    );
  };
  lone(
    await runDecideProviderContract(
      { ...LAYA_ENTRY, id: "no-such-provider" },
      { quiet: true },
    ),
    "contract fixture missing",
  );
  lone(
    await runDecideProviderContract(
      { ...LAYA_ENTRY, id: "Not A Provider" },
      { quiet: true },
    ),
    "is not a provider id",
  );
  lone(
    await runDecideProviderContract(LAYA_ENTRY, {
      fixture: { ...LAYA_INLINE_CONTRACT, id: "other" },
      quiet: true,
    }),
    "is not the entry id",
  );
  lone(
    await runDecideProviderContract(LAYA_ENTRY, {
      fixture: { ...LAYA_INLINE_CONTRACT, errors: [] },
      quiet: true,
    }),
    "errors",
  );
  const stray = {
    ...LAYA_ENTRY,
    decide: { ...LAYA_ENTRY.decide, endpoint: "{baseURL}/{model}/predict" },
  };
  lone(
    await runDecideProviderContract(stray, {
      fixture: LAYA_INLINE_CONTRACT,
      quiet: true,
    }),
    "{model}",
  );
});

// Only {baseURL} is filled by the helper; any other brace pair would be sent as
// written. The function the loop uses is judged on its own, because a run that
// goes through it hides which placeholder it flagged.
await test("an endpoint placeholder other than {baseURL} is stray, in any spelling, and {baseURL} alone is not", () => {
  const stray: ReadonlyArray<readonly [string, string]> = [
    ["{baseURL}/{model}/predict", "{model}"],
    ["{baseURL}/{apiKey}", "{apiKey}"],
    ["{baseURL}/{}", "{}"],
    ["{baseURL}/{ model }", "{ model }"],
    ["{baseURL}/predict?x={model}", "{model}"],
    ["{BASEURL}/predict", "{BASEURL}"],
    ["{baseURLx}/predict", "{baseURLx}"],
    ["{model}/{baseURL}", "{model}"],
  ];
  for (const [endpoint, placeholder] of stray) {
    const got = strayPlaceholder(endpoint);
    assert(
      got === placeholder,
      `${endpoint}: expected ${placeholder}, got ${got}`,
    );
  }
  const clean = [
    "{baseURL}/predict",
    "{baseURL}/{baseURL}",
    "{baseURL}/v1/{baseURL}?x=1",
    "https://host.test/predict",
    "",
  ];
  for (const endpoint of clean) {
    const got = strayPlaceholder(endpoint);
    assert(got === undefined, `${endpoint}: expected none, got ${got}`);
  }
});

await test("a fixture on disk is read for the entry's id, and every way it can fail is one problem", () => {
  const root = tempDir("decide-contract-root-");
  const put = (dir: string, text: string): void => {
    mkdirSync(join(root, dir));
    writeFileSync(join(root, dir, "contract.json"), text);
  };
  put("laya", JSON.stringify(LAYA_INLINE_CONTRACT));
  put("broken", "{ not json");
  put("renamed", JSON.stringify({ ...LAYA_INLINE_CONTRACT, id: "other" }));
  put(
    "leaky",
    JSON.stringify({
      ...LAYA_INLINE_CONTRACT,
      id: "leaky",
      errors: [
        {
          ...LAYA_INLINE_CONTRACT.errors[0],
          body: { error: { message: `bad key sk-${FAKE}` } },
        },
      ],
    }),
  );
  mkdirSync(join(root, "adir", "contract.json"), { recursive: true });
  const problemOf = (id: string): string => {
    const loaded = loadContractFixture({ ...LAYA_ENTRY, id }, undefined, root);
    return "problem" in loaded ? loaded.problem : "";
  };
  const read = loadContractFixture(LAYA_ENTRY, undefined, root);
  assert(
    "fixture" in read && isDeepStrictEqual(read.fixture, LAYA_INLINE_CONTRACT),
    "the fixture on disk for the entry's id is read as it was written",
  );
  const other: DecideContractFixture = {
    ...LAYA_INLINE_CONTRACT,
    success: {
      ...LAYA_INLINE_CONTRACT.success,
      expected: {
        ...LAYA_INLINE_CONTRACT.success.expected,
        model: "given-model",
      },
    },
  };
  const given = loadContractFixture(LAYA_ENTRY, other, root);
  assert(
    "fixture" in given &&
      given.fixture.success.expected.model === "given-model",
    "a fixture given inline wins over the one on disk",
  );
  assert(
    problemOf("absent").includes("contract fixture missing"),
    `missing: ${problemOf("absent")}`,
  );
  assert(
    problemOf("broken").includes("is not valid JSON"),
    `malformed: ${problemOf("broken")}`,
  );
  assert(
    problemOf("renamed").includes("does not match its directory"),
    `another id inside the file: ${problemOf("renamed")}`,
  );
  assert(
    problemOf("adir").includes("is not a regular file"),
    `unreadable: ${problemOf("adir")}`,
  );
  assert(
    problemOf("leaky").includes("holds an sk- key") &&
      !problemOf("leaky").includes(FAKE),
    `a key in the file is named, never echoed: ${problemOf("leaky")}`,
  );
  const mismatch = loadContractFixture(
    LAYA_ENTRY,
    { ...LAYA_INLINE_CONTRACT, id: "other" },
    root,
  );
  assert(
    "problem" in mismatch && mismatch.problem.includes("is not the entry id"),
    "a fixture given for another id",
  );
  const malformed = loadContractFixture(
    LAYA_ENTRY,
    { ...LAYA_INLINE_CONTRACT, errors: [] },
    root,
  );
  assert(
    "problem" in malformed && malformed.problem.includes("errors"),
    "a fixture given inline that does not parse",
  );
});

await test("the window search finds Laya's known edge: 768 tokens is first exceeded at 2,925 characters", async () => {
  const estimate = await loadEstimator();
  assert(firstOverWindow(768, (state) => estimate(state)) === 2925, "boundary");
});

// What a provider may say about a body it cannot read: anything with words in
// it. An angle bracket alone is not markup ("expected <number>" is a real
// provider text), but the tags of the page the harness sent are, in any case
// or encoding. The text of the bodies it sent counts as surfaced only as whole
// words or, for a word that is plain English too, in the body's own syntax:
// "retry loops are not supported" and "answers must not be nested" are
// legitimate, "oops" and {"nested":true} are the body.
await test("the odd-body message rule rejects empty, placeholder, markup and echoed text, and accepts plain angle brackets", () => {
  const zeroWidth = String.fromCharCode(0x200b);
  // The status the oddBodies case anchors on is the first permanent error of
  // the fixture; a reason phrase is the provider's own text only for the
  // status the harness sent.
  const anchorStatus = permanent?.status;
  assert(
    anchorStatus !== undefined && anchorStatus !== 502,
    "the Laya anchor body is a permanent error that is not a 502",
  );
  const expectations: ReadonlyArray<
    readonly [string, string | undefined, string | undefined, number?]
  > = [
    ["a whitespace-only message", "  \t ", "empty"],
    ["an empty message", "", "empty"],
    ["an invisible-only message", zeroWidth, "empty"],
    ["no message", undefined, "empty"],
    ["undefined", "undefined", "placeholder"],
    ["UNDEFINED, padded", "  UNDEFINED ", "placeholder"],
    ["null", "null", "placeholder"],
    ["[object Object]", "[object Object]", "placeholder"],
    ["entity-encoded markup", "&lt;html&gt;", "markup"],
    ["numeric-entity markup", "&#60;body&#62;", "markup"],
    ["hex-entity markup", "&#x3c;html&#x3e;", "markup"],
    ["percent-encoded markup", "%3Chtml%3E", "markup"],
    ["lower-case percent-encoded markup", "%3chtml%3e", "markup"],
    ["double-encoded markup", "%253Chtml%253E", "markup"],
    ["upper-cased markup", "<HTML><BODY>", "markup"],
    ["markup with the html tag stripped", "<body>x</body>", "markup"],
    ["a closing body tag alone", "x</body>", "markup"],
    ["a closing html tag alone", "x</html>", "markup"],
    ["raw HTML", "<html><body>Bad Gateway</body></html>", "markup"],
    ["the page text with its tags stripped", "Bad Gateway", "echo"],
    ["the page text in another case", "BAD GATEWAY", "echo"],
    ["the page text over two lines", "Bad\nGateway", "echo"],
    ["the page text with extra spaces", "Bad   Gateway", "echo"],
    ["the page text, percent-encoded", "Bad%20Gateway", "echo"],
    ["the text of the string body", "the server said oops", "echo"],
    ["the string body alone", "oops", "echo"],
    ["the string body with punctuation", "Oops!", "echo"],
    ["the nested body's key alone", "nested", "echo"],
    ["the nested body's key with a colon", "nested: true", "echo"],
    [
      "the nested body as JSON",
      '{"error":{"message":12},"detail":{"nested":true}}',
      "echo",
    ],
    ["the nested body as inspected", "{ detail: { nested: true } }", "echo"],
    [
      "a reason phrase of a status the harness did not send",
      "upstream returned 502 Bad Gateway",
      "echo",
    ],
    ["a plain message", "Laya request failed with HTTP 401", undefined],
    ["oops inside another word", "retry loops are not supported", undefined],
    ["oops inside another word, again", "troops arrived", undefined],
    ["oops at the start of a longer word", "oopsie", undefined],
    ["the page text at the start of a longer word", "bad gateways", undefined],
    ["nested as an ordinary word", "answers must not be nested", undefined],
    ["nested inside another word", "an unnested map", undefined],
    [
      "the reason phrase of the status the harness sent",
      "upstream returned 502 Bad Gateway",
      undefined,
      502,
    ],
    ["a type named in angle brackets", "expected <number>", undefined],
    ["a comparison", "value > 3 and < 5", undefined],
  ];
  const wrong = expectations.flatMap(([what, cause, expected, status]) => {
    const got = oddBodyProblem(
      { causeMessage: cause, message: `[laya] ${cause ?? ""}` },
      status ?? anchorStatus,
    );
    return got === expected
      ? []
      : [`${what}: expected ${expected}, got ${got}`];
  });
  assert(wrong.length === 0, wrong.join("; "));
  const inThrown = oddBodyProblem(
    { causeMessage: "a readable cause", message: "[laya] <html>" },
    anchorStatus,
  );
  assert(inThrown === "markup", `markup in the thrown message: ${inThrown}`);
  assert(
    ODD_BODIES.length === 7 && ODD_BODIES.some((b) => b.echoes.length > 0),
    "the harness sends seven bodies, some with text to echo",
  );
});

await test("a cause that cannot be serialized is read as unreadable and counts as carrying a secret, instead of throwing", async () => {
  const circular = async (): Promise<never> => {
    const cause: Record<string, unknown> = {
      kind: "server",
      retryable: false,
      message: "boom",
    };
    cause.self = cause;
    throw new Error("thrown", { cause });
  };
  const seen: Failure[] = [];
  const probe: ContractCase = {
    name: "DECIDE laya: probe",
    static: true,
    run: async (ctx) => {
      const failure = await ctx.failureOf(circular);
      seen.push(failure);
      ctx.ok(failure.threw, "the probe is read as a failure");
    },
  };
  const results: TestRecord[] = [];
  await runContractCases(LAYA_ENTRY, LAYA_INLINE_CONTRACT, [probe], results, {
    quiet: true,
  });
  assert(
    results.length === 1 && results[0].ok,
    `the probe: ${JSON.stringify(results)}`,
  );
  const [failure] = seen;
  assert(
    failure.causeReadable === false && failure.kind === "server",
    "the cause is unreadable but its fields are still read",
  );
  assert(
    !JSON.stringify(failure).includes("circular"),
    "no engine text about the cycle is kept",
  );
  assert(
    causeCarries(failure, "anything") === true,
    "an unreadable cause cannot be shown free of a secret",
  );
  const readable: Failure = { ...failure, causeReadable: true, cause: "{}" };
  assert(!causeCarries(readable, "key"), "a readable cause without the secret");
  assert(
    causeCarries({ ...readable, cause: '{"m":"has key"}' }, "key"),
    "a readable cause with the secret",
  );
});

// ---- scaffold --kind=decide: the tests read the runs started at the top ----

const SCAFFOLD_FILES =
  '["MANUAL-CHECKLIST.md","acme-decide.json","contract.json"]';

// A decide provider has no tier, so nothing the scaffold prints or writes says one.
function assertNoTier(label: string, out: string, run: ProcessResult): void {
  const texts: ReadonlyArray<readonly [string, string]> = [
    ...readdirSync(out).map(
      (file) => [file, readFileSync(join(out, file), "utf8")] as const,
    ),
    ["stdout", run.stdout.split(out).join("<out>")],
    ["stderr", run.stderr],
  ];
  for (const [what, text] of texts) {
    assert(!/tier/i.test(text), `${label}: ${what} says tier`);
  }
}

await test("--kind=decide emits the catalog JSON, a fixture the reader accepts and a checklist", async () => {
  const run = await selfHosted.done;
  assert(run.exitCode === 0, `scaffold failed: ${run.stderr}`);
  const out = selfHosted.out;
  const catalogText = readFileSync(join(out, "acme-decide.json"), "utf8");
  const catalog = section(JSON.parse(catalogText));
  assert(catalog.id === "acme-decide", "id");
  assert(
    JSON.stringify(catalog.inferenceKinds) === '["decide"]',
    "decide inference kind",
  );
  assert(
    section(catalog.decide).baseURLRequired === true,
    "no built-in endpoint, so the base URL is required",
  );
  assert(!("baseURL" in section(catalog.wire)), "no baseURL on the wire");
  const fixtureText = readFileSync(join(out, "contract.json"), "utf8");
  const fixture = parseDecideContractFixture(
    section(JSON.parse(fixtureText)),
    "scaffold",
  );
  assert(
    fixture.id === "acme-decide" &&
      fixture.errors.every((e) => e.provenance === "stand-in"),
    "a stand-in fixture for the same id",
  );
  const checklist = readFileSync(join(out, "MANUAL-CHECKLIST.md"), "utf8");
  for (const mention of [
    "ACME_DECIDE_API_KEY",
    "ACME_DECIDE_BASE_URL (required",
    "test/fixtures/decide/acme-decide/contract.json",
    "contextWindow",
    "maxOutputTokens",
  ]) {
    assert(checklist.includes(mention), `the checklist mentions ${mention}`);
  }
  assert(
    JSON.stringify(readdirSync(out).sort()) === SCAFFOLD_FILES,
    `exactly the three files, got ${readdirSync(out).join(", ")}`,
  );
  assertNoTier("self-hosted", out, run);
});

await test("--kind=decide keeps a hostile flag value valid JSON and honours --baseURL, --envVar and --aliases", async () => {
  const run = await builtIn.done;
  assert(run.exitCode === 0, `scaffold failed: ${run.stderr}`);
  const catalog = readJson(join(builtIn.out, "acme.json"));
  assert(
    section(catalog.models).default === HOSTILE_MODEL,
    "the model name survives escaping",
  );
  const wire = section(catalog.wire);
  assert(wire.baseURL === "https://api.acme.test/v1", "built-in base URL");
  assert(
    section(wire.envOverrides).apiKey === "ACME_TOKEN",
    "key variable override",
  );
  assert(
    section(catalog.decide).baseURLRequired === undefined,
    "a built-in endpoint does not require a base URL",
  );
  assert(JSON.stringify(catalog.aliases) === '["a1","a2"]', "aliases");
  const checklist = readFileSync(
    join(builtIn.out, "MANUAL-CHECKLIST.md"),
    "utf8",
  );
  assert(
    checklist.includes("ACME_TOKEN") &&
      !checklist.includes("ACME_API_KEY") &&
      checklist.includes("ACME_BASE_URL (optional"),
    "the checklist names the overridden key and an optional base URL",
  );
  assertNoTier("built-in endpoint", builtIn.out, run);
});

await test("--kind=decide refuses --tier, an unknown --kind, a hostile name and a missing model", async () => {
  for (const { args, mention, sayNothingOfTiers, run } of refusals) {
    const result = await run.done;
    assert(
      result.exitCode === 1,
      `exit 1 for ${args.join(" ")}, got ${result.exitCode}`,
    );
    assert(
      result.stderr.includes(mention),
      `stderr mentions "${mention}": ${result.stderr}`,
    );
    assert(
      !sayNothingOfTiers || !/tier/i.test(result.stderr),
      `a decide refusal for ${args.join(" ")} says tier: ${result.stderr}`,
    );
  }
  assert(readdirSync(refusalOut).length === 0, "a refused run writes nothing");
});

await test("the Tier 2 scaffold is unchanged by the new --kind flag", async () => {
  const run = await tier2.done;
  assert(run.exitCode === 0, `scaffold failed: ${run.stderr}`);
  const catalog = readJson(join(tier2.out, "zeta.json"));
  assert(
    catalog.tier === 2 && catalog.decide === undefined,
    "a chat catalog entry, tier 2",
  );
  assert(
    !existsSync(join(tier2.out, "contract.json")),
    "no decide fixture for a chat provider",
  );
});

await test("the scaffolded catalog files fail the loader until their markers are replaced, and pass after", async () => {
  const found = await validated;
  for (const [label, unfilled, text, model] of [
    [
      "self-hosted",
      found.unfilledSelfHosted,
      found.written.selfHosted,
      SELF_HOSTED_MODEL,
    ],
    [
      "built-in endpoint",
      found.unfilledBuiltIn,
      found.written.builtIn,
      HOSTILE_MODEL,
    ],
  ] as const) {
    assert(unfilled.exitCode !== 0, `${label}: the unfilled file validated`);
    for (const marker of [
      "decide.order",
      "decisionLimits.maxStateTokens",
      "setup.billingPolicy",
      "evidence.rosterVerified.date",
      `models.catalog.${model}.contextWindow`,
      `models.catalog.${model}.maxOutputTokens`,
    ]) {
      assert(
        unfilled.stderr.includes(marker),
        `${label}: the loader names ${marker}: ${unfilled.stderr.slice(0, 600)}`,
      );
    }
    // Text, not a number: the loader refuses it as a type error and the text
    // says what goes there.
    const spec = section(section(section(JSON.parse(text)).models).catalog)[
      model
    ];
    for (const field of ["contextWindow", "maxOutputTokens"]) {
      const marker = section(spec)[field];
      assert(
        typeof marker === "string" && marker.startsWith("TODO"),
        `${label}: ${field} is not a TODO marker in the scaffold: ${JSON.stringify(marker)}`,
      );
    }
  }
  assert(
    found.bothFilled.exitCode === 0,
    `the filled files do not validate: ${found.bothFilled.stderr.slice(0, 800)}`,
  );
  assert(
    found.bothFilled.stdout.includes("validate-only passed — 2 providers"),
    found.bothFilled.stdout,
  );
  for (const [label, filled] of Object.entries(found.filled)) {
    assert(
      !JSON.stringify(filled).includes("TODO"),
      `${label}: the fill left a TODO, so it replaced fewer markers than the scaffold wrote`,
    );
  }
});

// Cases a filled-in scaffold does not run. The window and timeout cases read
// the registered descriptor, which an entry that is not in the catalog yet does
// not have. The retry and malformed-reply cases cost about 3 s of real backoff
// and read nothing the scaffold writes beyond the retry flags the error cases
// already check; the Laya loop above runs them. Each pattern must match a
// planned case, so a rename cannot quietly widen what is skipped.
const SET_ASIDE: readonly RegExp[] = [
  /window of \d+ tokens/,
  /default timeout is decideMs/,
  /: (?:non-)?retryable error "/,
  /a retry that recovers/,
  /a network failure is retried once/,
  /odd error bodies/,
  /a 200 without an answers container/,
];
const isSetAside = (c: ContractCase): boolean =>
  SET_ASIDE.some((pattern) => pattern.test(c.name));

const PROMISED_STATUSES = [400, 401, 403, 409, 413, 429, 499, 500, 502, 503];
// What the scaffold promises its fixture carries, written out here so it is
// not derived from the thing it checks. The loop already pins most of it; it
// cannot tell that the 400 body or the two-envelope 409 body is missing.
function promiseProblems(fixture: DecideContractFixture): string[] {
  const missing = PROMISED_STATUSES.filter(
    (status) => !fixture.errors.some((e) => e.status === status),
  ).map((status) => `no body at status ${status}`);
  const beside = fixture.errors.find((e) => e.status === 409);
  const envelopes = section(beside?.body);
  return [
    ...missing,
    ...(beside !== undefined &&
    (typeof section(envelopes.error).message !== "string" ||
      typeof envelopes.detail !== "string")
      ? ["the 409 body must hold both error.message and detail"]
      : []),
    ...(fixture.errors.some((e) => JSON.stringify(e.body).includes("{apiKey}"))
      ? []
      : [
          "no body echoes {apiKey}, so the redaction case checks only the network half",
        ]),
  ];
}

await test("a filled-in scaffold passes the credential, wire and error cases, so the fixture is a working starting point", async () => {
  const found = await validated;
  const fixtureOf = (run: ScaffoldRun) =>
    parseDecideContractFixture(
      readJson(join(run.out, "contract.json")),
      "scaffold",
    );
  const selfHostedEntry = await parseDecideEntry(
    found.filled.selfHosted,
    "acme-decide.json",
  );
  const selfHostedFixture = fixtureOf(selfHosted);
  const planned = buildContractCases(selfHostedEntry, selfHostedFixture);
  const cases = planned.filter((c) => !isSetAside(c));
  const unmatched = SET_ASIDE.filter(
    (pattern) => !planned.some((c) => pattern.test(c.name)),
  );
  assert(
    unmatched.length === 0,
    `a set-aside pattern matches no planned case: ${unmatched.join(" ")}`,
  );
  const results: TestRecord[] = [];
  await runContractCases(selfHostedEntry, selfHostedFixture, cases, results, {
    quiet: true,
  });
  const failed = results.filter((r) => !r.ok);
  assert(
    results.length === cases.length && failed.length === 0,
    `${results.length} of ${cases.length} recorded; failed: ${failed
      .map((r) => `${r.name}: ${r.reason}`)
      .join("; ")}`,
  );
  const named = (fragment: string): number =>
    results.filter((r) => r.name.includes(fragment)).length;
  assert(
    named("error rule #") === 5 &&
      named("error default kind invalid_request is pinned") === 1 &&
      named("(stand-in) ->") === selfHostedFixture.errors.length,
    "the five rule cases, the default pin and one case per body all ran",
  );
  assert(
    promiseProblems(selfHostedFixture).length === 0,
    promiseProblems(selfHostedFixture).join("; "),
  );
  // The built-in endpoint entry, with its renamed key and a hostile model name,
  // through the credential and wire cases (the error bodies are the same).
  const builtInEntry = await parseDecideEntry(
    found.filled.builtIn,
    "acme.json",
  );
  const wanted = [
    "no key, no request",
    "wire request (route, POST, bearer, model, boolean as noul)",
    "answers, model and request id are read back",
    "default model is sent",
    "model env var overrides the default",
    "state text is sent verbatim",
    "base URL spellings reach one endpoint",
  ].map((name) => `DECIDE acme: ${name}`);
  const builtInFixture = fixtureOf(builtIn);
  const builtInCases = buildContractCases(builtInEntry, builtInFixture).filter(
    (c) => wanted.includes(c.name),
  );
  const builtInResults: TestRecord[] = [];
  await runContractCases(
    builtInEntry,
    builtInFixture,
    builtInCases,
    builtInResults,
    { quiet: true },
  );
  const builtInFailed = builtInResults.filter((r) => !r.ok);
  assert(
    builtInResults.length === wanted.length && builtInFailed.length === 0,
    `${builtInResults.length} of ${wanted.length} recorded; failed: ${builtInFailed
      .map((r) => `${r.name}: ${r.reason}`)
      .join("; ")}`,
  );
});

await test("the checklist names the variables the descriptor builder derives", async () => {
  const found = await validated;
  for (const [label, raw, run] of [
    ["self-hosted", found.filled.selfHosted, selfHosted],
    ["built-in endpoint", found.filled.builtIn, builtIn],
  ] as const) {
    const env = await descriptorEnvVars(await parseDecideEntry(raw, label));
    const checklist = readFileSync(
      join(run.out, "MANUAL-CHECKLIST.md"),
      "utf8",
    );
    const required = env.extraRequired?.includes(env.baseURL ?? "") === true;
    assert(
      checklist.includes(`${env.apiKey} (required)`),
      `${label}: the key variable ${env.apiKey}`,
    );
    assert(
      checklist.includes(
        `${env.baseURL} (${required ? "required" : "optional"}`,
      ),
      `${label}: the base URL variable ${env.baseURL}, ${required ? "required" : "optional"}`,
    );
    assert(
      checklist.includes(`${env.model} (optional`),
      `${label}: the model variable ${env.model}`,
    );
  }
});

await test("a scaffold edited to drop a stand-in body fails the suite", async () => {
  const found = await validated;
  const entry = await parseDecideEntry(
    found.filled.selfHosted,
    "acme-decide.json",
  );
  const fixture = parseDecideContractFixture(
    readJson(join(selfHosted.out, "contract.json")),
    "scaffold",
  );
  const without = (...statuses: number[]): DecideContractFixture => ({
    ...fixture,
    errors: fixture.errors.filter((e) => !statuses.includes(e.status)),
  });
  // Only the cases that send nothing: the rule-coverage and default-kind pins.
  const problemsOf = async (mutant: DecideContractFixture): Promise<string> => {
    const cases = buildContractCases(entry, mutant).filter(
      (c) => c.static === true,
    );
    const results: TestRecord[] = [];
    await runContractCases(entry, mutant, cases, results, { quiet: true });
    return [
      ...promiseProblems(mutant),
      ...results.filter((r) => !r.ok).map((r) => `${r.name}: ${r.reason}`),
    ].join(" | ");
  };
  assert((await problemsOf(fixture)) === "", "the unedited fixture is clean");
  for (const status of PROMISED_STATUSES) {
    assert(
      (await problemsOf(without(status))) !== "",
      `dropping the ${status} body went unnoticed`,
    );
  }
  for (const [what, mutant, expected] of [
    ["403 (listed beside 401)", without(403), "the listed status 403"],
    [
      "499 (just below the range edge)",
      without(499),
      "status 499, just below it",
    ],
    ["502 (above the range edge)", without(502), "a status above 500"],
    [
      "every body no rule matches",
      without(400, 409, 499),
      "default kind invalid_request",
    ],
  ] as const) {
    const problems = await problemsOf(mutant);
    assert(
      problems.includes(expected),
      `${what}: expected "${expected}" in ${problems}`,
    );
  }
  const unechoed: DecideContractFixture = {
    ...fixture,
    errors: fixture.errors.map((e) => ({
      ...e,
      body: JSON.parse(
        JSON.stringify(e.body).split("{apiKey}").join("the key"),
      ),
    })),
  };
  assert(
    (await problemsOf(unechoed)).includes("no body echoes {apiKey}"),
    "a fixture without an echo body went unnoticed",
  );
});

await runSuite();
