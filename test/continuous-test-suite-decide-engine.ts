#!/usr/bin/env tsx
import "dotenv/config";

/**
 * Continuous Test Suite - Decide engine.
 *
 * The small modules a catalog-described decision provider is built from
 * (src/lib/providers/decide/*) and ConfiguredDecisionProvider. The code under
 * test is imported from ../dist, so run `pnpm run build` after editing src/.
 *
 * Determinism exception to CLAUDE.md rule 15 (listed in the `allow` array of
 * neurolink/e2e-tests-only in eslint.config.js): these modules are not
 * exported from dist/index.js and are reached through a provider's generate()
 * call only. Their cases need inputs no live endpoint can be made to send on
 * demand (a body with a getter or a prototype-named key, an error body that
 * holds the API key, a base URL that fails validation), so each module is
 * imported from dist and fed fixed values. Nothing here touches the network.
 *
 * Run: pnpm run test:decide-engine
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type {
  DecideBodyShape,
  DecideCatalogJson,
  DecideErrors,
  DecisionError,
  DecisionErrorKind,
  DecisionPreparedMedia,
  DecisionRequest,
} from "../src/lib/types/index.js";
import { assertDistFresh } from "./helpers/distFreshness.js";
import { LAYA_ENTRY } from "./helpers/decideFixtures.js";
import {
  assert,
  assertEqual,
  assertIncludes,
  defineSuite,
  logSection,
} from "./helpers/harness.js";

assertDistFresh();

const { test, runSuite } = defineSuite("Decide engine", { offline: true });

async function readPathSection(): Promise<void> {
  logSection("readPath");
  const { readPath } = await import("../dist/providers/decide/paths.js");

  await test("reads nested keys", async () => {
    assertEqual(
      readPath({ routing: { model: "english" } }, "routing.model"),
      "english",
    );
    assertEqual(readPath({ model: "m" }, "model"), "m");
    assertEqual(readPath({ a: { b: { c: 3 } } }, "a.b.c"), 3);
  });

  await test("a missing key or branch resolves to undefined", async () => {
    assertEqual(readPath({ a: 1 }, "b"), undefined);
    assertEqual(readPath({ a: {} }, "a.b.c"), undefined);
  });

  await test("a null intermediate resolves to undefined, a null leaf is returned", async () => {
    assertEqual(readPath({ a: null }, "a.b"), undefined);
    assertEqual(readPath({ a: null }, "a"), null);
  });

  await test("never steps into arrays, strings or numbers", async () => {
    assertEqual(readPath({ items: [{ a: 1 }] }, "items.0.a"), undefined);
    assertEqual(readPath({ items: ["x"] }, "items.length"), undefined);
    assertEqual(readPath({ a: "text" }, "a.length"), undefined);
    assertEqual(readPath({ a: 5 }, "a.toFixed"), undefined);
  });

  await test("never reads inherited properties", async () => {
    for (const path of [
      "constructor",
      "__proto__",
      "toString",
      "constructor.name",
      "__proto__.hasOwnProperty",
      "a.__proto__.toString",
    ]) {
      assertEqual(
        readPath({ a: {} }, path),
        undefined,
        `${path} must not resolve`,
      );
    }
  });

  await test("never runs a getter", async () => {
    const trap = {};
    Object.defineProperty(trap, "boom", {
      enumerable: true,
      get() {
        throw new Error("getter ran");
      },
    });
    assertEqual(readPath(trap, "boom"), undefined);
  });

  await test("never runs a getter on a segment it passes through", async () => {
    const state = { ran: false };
    const holder = {
      get a() {
        state.ran = true;
        return { b: 1 };
      },
    };
    assertEqual(readPath(holder, "a.b"), undefined);
    assertEqual(state.ran, false, "the getter on a must not run");
  });

  await test("a path with an empty segment resolves to nothing", async () => {
    // An empty key at every level, each holding something readable, so a guard
    // that checks only one position would let the path through.
    const fixture = {
      a: { b: 1, "": { b: 3 } },
      "": { a: 5, "": 7 },
    };
    for (const path of ["", ".", "a..b", ".a", "a."]) {
      assertEqual(readPath(fixture, path), undefined, `"${path}"`);
    }
  });

  await test("a root that is not an object resolves to nothing", async () => {
    for (const root of [null, undefined, "text", 7, true]) {
      assertEqual(readPath(root, "a"), undefined);
    }
  });
}

function messageOfThrow(run: () => unknown): string {
  try {
    run();
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
  throw new Error("expected the call to throw");
}

async function baseUrlSection(): Promise<void> {
  logSection("normalizeBaseURL");
  const { normalizeBaseURL } =
    await import("../dist/providers/decide/baseUrl.js");
  const strip = (value: string): string =>
    normalizeBaseURL(value, ["strip-trailing-slash"]);

  await test("leaves a value with no trailing slash alone", async () => {
    assertEqual(strip("https://laya.test/base"), "https://laya.test/base");
  });

  await test("removes one or several trailing slashes", async () => {
    assertEqual(strip("https://laya.test/base/"), "https://laya.test/base");
    assertEqual(strip("https://laya.test/base///"), "https://laya.test/base");
  });

  await test("keeps interior slashes; an empty or slash-only value becomes empty", async () => {
    assertEqual(strip("https://laya.test//base//"), "https://laya.test//base");
    assertEqual(strip("///"), "");
    assertEqual(strip(""), "");
  });

  await test("applies nothing when no transform is named", async () => {
    assertEqual(
      normalizeBaseURL("https://laya.test/", []),
      "https://laya.test/",
    );
  });

  await test("copes with a long run of slashes followed by another character", async () => {
    const hostile = `${"/".repeat(100_000)}x`;
    const started = performance.now();
    assertEqual(strip(hostile), hostile);
    assertEqual(strip(`x${"/".repeat(100_000)}`), "x");
    // The loop takes a few milliseconds; a quadratic pattern takes many seconds.
    const elapsedMs = performance.now() - started;
    assert(elapsedMs < 2_000, `stripping slashes took ${elapsedMs} ms`);
  });

  const stripBoth = (value: string): string =>
    normalizeBaseURL(value, ["strip-trailing-slash", "strip-v1-suffix"]);
  const stripV1 = (value: string): string =>
    normalizeBaseURL(value, ["strip-v1-suffix"]);

  await test("strip-v1-suffix removes exactly one trailing /v1, in either case, and nothing else", async () => {
    assertEqual(stripV1("https://h/v1"), "https://h");
    assertEqual(stripV1("https://h/V1"), "https://h");
    assertEqual(stripV1("https://h/api/v1"), "https://h/api");
    assertEqual(stripV1("/v1"), "");
    assertEqual(stripV1("https://h/v1/v1"), "https://h/v1");
    for (const untouched of [
      "https://h/v10",
      "https://h/xv1",
      "https://h/v1/",
      "https://h/v1/x",
      "https://h/v",
      "https://h",
      "v1",
      "",
    ]) {
      assertEqual(
        stripV1(untouched),
        untouched,
        "a value without a trailing /v1 was changed",
      );
    }
  });

  await test("strip-v1-suffix after strip-trailing-slash reproduces XOR's old regex pair on every input", async () => {
    const oldBoth = (raw: string): string =>
      raw.replace(/\/+$/, "").replace(/\/v1$/i, "");
    const oldV1 = (raw: string): string => raw.replace(/\/v1$/i, "");
    const inputs = [
      "https://h/v1",
      "https://h/V1/",
      "https://h//",
      "https://h/v1/v1",
      "https://h/api/v1",
      "https://h/v10",
      "",
      "/v1",
      "/V1/",
      "///",
      "v1",
      "https://h/v1///",
      "https://h/v1//v1",
      "https://h/api/V1///",
      "https://h/v1\n",
    ];
    inputs.forEach((input, index) => {
      assertEqual(
        stripBoth(input),
        oldBoth(input),
        `input ${index} diverged from the old regex pair`,
      );
      assertEqual(
        stripV1(input),
        oldV1(input),
        `input ${index} diverged from the old /v1 regex alone`,
      );
    });
  });

  await test("the transforms run in list order", async () => {
    assertEqual(stripBoth("https://h/v1/"), "https://h");
    assertEqual(
      normalizeBaseURL("https://h/v1/", [
        "strip-v1-suffix",
        "strip-trailing-slash",
      ]),
      "https://h/v1",
    );
  });

  await test("strip-v1-suffix finishes on long runs of slashes and repeated /v1", async () => {
    const hostile = [
      `${"/".repeat(100_000)}x`,
      `${"/".repeat(100_000)}v1x`,
      `${"/v1".repeat(50_000)}x`,
    ];
    const started = performance.now();
    for (const value of hostile) {
      assertEqual(
        stripBoth(value),
        value,
        "a value that does not end in /v1 was changed",
      );
    }
    assertEqual(stripBoth(`x${"/v1".repeat(50_000)}`).length, 3 * 49_999 + 1);
    const elapsedMs = performance.now() - started;
    assert(
      elapsedMs < 2_000,
      "normalising a long run of slashes or /v1 segments was too slow",
    );
  });
}

const XOR_FIX =
  "Set XOR_BASE_URL or pass credentials.xor.baseURL to the origin, and give the key through XOR_API_KEY or credentials.xor.apiKey.";
const SCHEME_PROBLEM = `The XOR base URL must start with https:// or http://. ${XOR_FIX}`;
const PARTS_PROBLEM = `The XOR base URL must not carry credentials, a query string or a fragment. ${XOR_FIX}`;
const INVALID_PROBLEM = `The XOR base URL is not a valid absolute URL. ${XOR_FIX}`;

async function baseUrlShapeSection(): Promise<void> {
  logSection("baseURLShapeProblem: origin");
  const { baseURLShapeProblem } =
    await import("../dist/providers/decide/baseUrl.js");
  const problem = (baseURL: string): string | undefined =>
    baseURLShapeProblem("origin", baseURL, "XOR", XOR_FIX);

  await test("accepts an origin, with or without a port or a path", async () => {
    for (const ok of [
      "https://xor.internal",
      "http://h:8080",
      "https://h/proxy/route",
      "HTTPS://XOR.INTERNAL",
      // Only a literal "?" or "#" starts a query or fragment.
      "https://h/a%3Fb",
      "https://h/a%23b",
    ]) {
      assertEqual(problem(ok), undefined, "a valid origin was refused");
    }
  });

  await test("a scheme other than https: or http: gets the scheme message, a host:port with no scheme included", async () => {
    // `xor.internal:8080` parses, with the scheme `xor.internal:`.
    // The scheme check comes first, so a scheme that is not http(s) gets this
    // message whatever else the value carries, and a scheme that only starts
    // like one does not pass.
    for (const bad of [
      "xor.internal:8080",
      "ftp://h",
      "file:///etc/hosts",
      "javascript:alert(1)",
      "ftp://u:p@h",
      "xor.internal:8080?x=1",
      "file:///a#f",
      "httpx://h",
      "https-x://h",
    ]) {
      assertEqual(
        problem(bad),
        SCHEME_PROBLEM,
        "the scheme message was not given",
      );
    }
  });

  await test("userinfo, a password, a query string or a fragment gets the credentials message", async () => {
    for (const bad of [
      "https://u:p@h",
      "https://u@h",
      "https://:p@h",
      "https://h?x=1",
      "https://h/base?x=1",
      "https://h#f",
      "https://h/base#f",
      // URL.search and URL.hash are empty for a lone "?" or "#", but the route
      // is still appended after it and lands inside the query or fragment.
      "https://h?",
      "https://h#",
      "https://h/base?",
      "https://h/base#",
      "https://h?/",
      "https://h/?",
      "https://h/v1?",
      "https://h?#",
    ]) {
      assertEqual(
        problem(bad),
        PARTS_PROBLEM,
        "the credentials message was not given",
      );
    }
  });

  await test("a value that does not parse gets the absolute URL message", async () => {
    for (const bad of ["not a url", "", "/just/a/path", "//h", "https://"]) {
      assertEqual(
        problem(bad),
        INVALID_PROBLEM,
        "the absolute URL message was not given",
      );
    }
  });

  await test("no message repeats any part of the base URL", async () => {
    const hostile = [
      "https://user:SECRETPW@h/?token=SECRETTOKEN#SECRETFRAG",
      "SECRETHOST.internal:8080",
      "ftp://SECRETUSER:SECRETPW@SECRETHOST/",
      "SECRETHOST not a url",
    ];
    for (const baseURL of hostile) {
      const message = problem(baseURL);
      if (message === undefined) {
        throw new Error("a bad base URL was accepted");
      }
      assert(
        !message.includes("SECRET"),
        "a message repeats part of the base URL",
      );
    }
  });

  await test("the label and the fix text come from the caller, in all three messages", async () => {
    const cases = [
      [
        "xor.internal:8080",
        "The Acme base URL must start with https:// or http://. Do the thing.",
      ],
      [
        "https://u:p@h",
        "The Acme base URL must not carry credentials, a query string or a fragment. Do the thing.",
      ],
      [
        "not a url",
        "The Acme base URL is not a valid absolute URL. Do the thing.",
      ],
    ] as const;
    for (const [baseURL, expected] of cases) {
      assert(
        baseURLShapeProblem("origin", baseURL, "Acme", "Do the thing.") ===
          expected,
        "a message did not take its label and fix text from the caller",
      );
    }
  });
}

async function templateSection(): Promise<void> {
  logSection("fillEndpointTemplate");
  const { fillEndpointTemplate } =
    await import("../dist/providers/decide/template.js");
  const fill = (template: string, baseURL = "https://laya.test/base"): string =>
    fillEndpointTemplate(template, { baseURL });

  await test("fills {baseURL}", async () => {
    assertEqual(fill("{baseURL}/predict"), "https://laya.test/base/predict");
  });

  await test("fills every occurrence and leaves a template without placeholders alone", async () => {
    assertEqual(
      fill("{baseURL}/a?next={baseURL}"),
      "https://laya.test/base/a?next=https://laya.test/base",
    );
    assertEqual(
      fill("https://fixed.test/predict"),
      "https://fixed.test/predict",
    );
  });

  await test("inserts the base URL literally and never re-expands it", async () => {
    assertEqual(
      fill("{baseURL}/predict", "https://h.test/a$&b$1$$c"),
      "https://h.test/a$&b$1$$c/predict",
    );
    assertEqual(
      fill("{baseURL}/predict", "https://h.test/{model}/{baseURL}"),
      "https://h.test/{model}/{baseURL}/predict",
    );
  });

  await test("an empty base URL gives a path-only endpoint", async () => {
    assertEqual(fill("{baseURL}/predict", ""), "/predict");
  });

  await test("an unknown placeholder throws an Error that names it and the supported one", async () => {
    for (const [template, name] of [
      ["{baseUrl}/predict", "{baseUrl}"],
      ["{baseURL}/{model}", "{model}"],
      ["{}/predict", "{}"],
    ] as const) {
      const message = messageOfThrow(() => fill(template));
      assertIncludes(message, `unknown placeholder ${name}`);
      assertIncludes(message, "{baseURL}");
      assert(!message.includes("laya.test"), "the base URL must not be echoed");
    }
  });

  await test("an unmatched brace throws", async () => {
    for (const template of [
      "{baseURL/predict",
      "{baseURL}/predict}",
      "}{",
      "{{baseURL}}",
      "{{baseURL}",
    ]) {
      const message = messageOfThrow(() => fill(template));
      assertIncludes(message, "unmatched brace", template);
      assert(!message.includes("laya.test"), "the base URL must not be echoed");
    }
  });
}

async function formatterSection(): Promise<void> {
  logSection("DECIDE_FORMATTERS");
  const { DECIDE_FORMATTERS } =
    await import("../dist/providers/decide/formatters.js");
  const { describeValidationErrors } =
    await import("../dist/providers/systemOneDecision.js");
  const format = DECIDE_FORMATTERS["fastapi-validation"];
  const prefix = "Request failed validation — ";

  await test("fastapi-validation reads exactly like laya.ts", async () => {
    const detail = [
      {
        loc: ["body", "questions", "q", "type"],
        msg: "Input should be 'noul'",
      },
      { loc: ["body", 2], msg: "bad" },
    ];
    assertEqual(format(detail), `${prefix}${describeValidationErrors(detail)}`);
    assertEqual(
      format(detail),
      `${prefix}body.questions.q.type: Input should be 'noul'; body.2: bad`,
    );
  });

  await test("never surfaces the input the server echoed back", async () => {
    const text = format([
      {
        loc: ["body", "state"],
        msg: "Field required",
        input: "CUSTOMER-STATE-TEXT",
      },
    ]);
    assertEqual(text, `${prefix}body.state: Field required`);
  });

  await test("names at most five problems", async () => {
    const detail = ["m1", "m2", "m3", "m4", "m5", "m6", "m7"].map((msg) => ({
      msg,
    }));
    assertEqual(format(detail), `${prefix}m1; m2; m3; m4; m5`);
  });

  await test("tolerates malformed entries", async () => {
    assertEqual(
      format([null, "x", 5, { loc: ["a", {}, null, true], msg: 9 }]),
      `${prefix}a: invalid`,
    );
    assertEqual(format([{}]), `${prefix}invalid`);
    assertEqual(format([1, null]), `${prefix}unspecified field`);
    assertEqual(format([]), `${prefix}unspecified field`);
  });

  await test("a detail that is not an array reads as empty instead of throwing", async () => {
    for (const detail of ["oops", undefined, null, {}, 3]) {
      assertEqual(format(detail), `${prefix}unspecified field`);
    }
  });
}

const LAYA_LIKE: DecideErrors = {
  rules: [
    { status: [401, 403], kind: "authentication" },
    { status: 413, kind: "max_tokens_exceeded" },
    { status: 429, kind: "rate_limit" },
    { status: 503, kind: "overloaded" },
    { statusMin: 500, kind: "server" },
  ],
  default: "invalid_request",
  bodyShapes: [
    { path: "error.message" },
    {
      path: "detail",
      isArray: true,
      formatter: "fastapi-validation",
      kind: "invalid_request",
      retryable: false,
    },
    { path: "detail" },
  ],
};

async function errorClassificationSection(): Promise<void> {
  logSection("classifyDecisionError: status rules");
  const { classifyDecisionError } =
    await import("../dist/providers/decide/errors.js");
  const classify = (
    status: number,
    spec: DecideErrors = LAYA_LIKE,
  ): DecisionError =>
    classifyDecisionError(spec, {
      status,
      payload: null,
      requestId: undefined,
      label: "Laya",
      apiKey: "k-secret",
    });

  await test("matches laya.ts's status table and retry flag for every status from 100 to 599", async () => {
    for (let status = 100; status <= 599; status += 1) {
      const kind =
        status === 401 || status === 403
          ? "authentication"
          : status === 413
            ? "max_tokens_exceeded"
            : status === 429
              ? "rate_limit"
              : status === 503
                ? "overloaded"
                : status >= 500
                  ? "server"
                  : "invalid_request";
      const got = classify(status);
      assertEqual(got.kind, kind, `kind for ${status}`);
      assertEqual(
        got.retryable,
        status === 429 || status >= 500,
        `retryable for ${status}`,
      );
    }
  });

  await test("the first matching rule wins", async () => {
    const serverFirst: DecideErrors = {
      ...LAYA_LIKE,
      rules: [
        { statusMin: 500, kind: "server" },
        { status: 503, kind: "overloaded" },
      ],
    };
    assertEqual(classify(503, serverFirst).kind, "server");
    assertEqual(classify(503).kind, "overloaded");
  });

  await test("an explicit retryable on a rule overrides the kind's default, both ways", async () => {
    const spec: DecideErrors = {
      ...LAYA_LIKE,
      rules: [
        { status: 429, kind: "rate_limit", retryable: false },
        { status: 400, kind: "invalid_request", retryable: true },
      ],
    };
    assertEqual(classify(429, spec).retryable, false);
    assertEqual(classify(400, spec).retryable, true);
  });

  await test("statusMin is inclusive; a rule with no status, or an empty list, matches nothing", async () => {
    const spec: DecideErrors = {
      rules: [
        { kind: "authentication" },
        { status: [], kind: "rate_limit" },
        { statusMin: 500, kind: "server" },
      ],
      default: "invalid_request",
      bodyShapes: [],
    };
    assertEqual(classify(499, spec).kind, "invalid_request");
    assertEqual(classify(500, spec).kind, "server");
    assertEqual(classify(599, spec).kind, "server");
  });

  await test("retry defaults by kind: rate_limit, overloaded and server retry, the rest do not", async () => {
    const cases = [
      ["authentication", false],
      ["invalid_request", false],
      ["max_tokens_exceeded", false],
      ["rate_limit", true],
      ["overloaded", true],
      ["server", true],
      ["timeout", false],
      ["network", false],
    ] as const;
    for (const [kind, retryable] of cases) {
      const got = classify(418, { rules: [], default: kind, bodyShapes: [] });
      assertEqual(got.kind, kind);
      assertEqual(got.retryable, retryable, kind);
    }
  });

  await test("echoes the status and request id, with a message built from the label", async () => {
    const got = classifyDecisionError(LAYA_LIKE, {
      status: 502,
      payload: { anything: true },
      requestId: "req-7",
      label: "Acme",
      apiKey: "k",
    });
    assertEqual(got.message, "Acme request failed with HTTP 502");
    assertEqual(got.status, 502);
    assertEqual(got.requestId, "req-7");
    assertEqual(got.kind, "server");
    assertEqual(got.retryable, true);
    assertEqual(classify(500).requestId, undefined);
    assertEqual(
      Object.keys(classify(502)).sort().join(),
      "kind,message,requestId,retryable,status",
    );
  });
}

async function errorMessageSection(): Promise<void> {
  logSection("classifyDecisionError: messages and redaction");
  const { classifyDecisionError } =
    await import("../dist/providers/decide/errors.js");
  const read = (
    status: number,
    payload: unknown,
    apiKey = "k-secret",
    spec: DecideErrors = LAYA_LIKE,
  ): DecisionError =>
    classifyDecisionError(spec, {
      status,
      payload,
      requestId: "req-1",
      label: "Laya",
      apiKey,
    });
  const fallback = (status: number): string =>
    `Laya request failed with HTTP ${status}`;
  const only = (...bodyShapes: DecideBodyShape[]): DecideErrors => ({
    ...LAYA_LIKE,
    bodyShapes,
  });

  await test("reads the proxy envelope's message and keeps the status kind", async () => {
    const got = read(403, { error: { message: "Invalid proxy key" } });
    assertEqual(got.message, "Invalid proxy key");
    assertEqual(got.kind, "authentication");
    assertEqual(got.retryable, false);
    assertEqual(got.requestId, "req-1");
  });

  await test("reads FastAPI's detail string and keeps the status kind and retry flag", async () => {
    const got = read(503, { detail: "queue is full" });
    assertEqual(got.message, "queue is full");
    assertEqual(got.kind, "overloaded");
    assertEqual(got.retryable, true);
  });

  await test("a validation array is invalid_request and never retried, even on a 503", async () => {
    const detail = [
      { loc: ["body", "state"], msg: "Field required", input: "SECRET-STATE" },
    ];
    const got = read(503, { detail });
    assertEqual(got.kind, "invalid_request");
    assertEqual(got.retryable, false);
    assertEqual(
      got.message,
      "Request failed validation — body.state: Field required",
    );
    assertEqual(
      read(422, { detail: [] }).message,
      "Request failed validation — unspecified field",
    );
  });

  await test("the proxy message outranks a validation array in the same body", async () => {
    const got = read(429, {
      error: { message: "rate limited" },
      detail: [{ msg: "bad" }],
    });
    assertEqual(got.message, "rate limited");
    assertEqual(got.kind, "rate_limit");
    assertEqual(got.retryable, true);
  });

  await test("a body with no recognised shape yields the status-table message", async () => {
    const bodies = [
      null,
      undefined,
      "<html>bad gateway</html>",
      [],
      42,
      {},
      { error: "text" },
      { error: { message: 5 } },
      { error: { message: "" } },
      { detail: "" },
      { detail: 7 },
      { detail: { a: 1 } },
    ];
    for (const body of bodies) {
      assertEqual(read(400, body).message, fallback(400), JSON.stringify(body));
    }
  });

  await test("shapes are tried in the order given, each at its own path", async () => {
    const body = { detail: "from detail", error: { message: "from error" } };
    assertEqual(
      read(400, body, "k", only({ path: "detail" }, { path: "error.message" }))
        .message,
      "from detail",
    );
    assertEqual(read(400, body).message, "from error");
    // An empty string yields no text, so the next shape gets its turn.
    assertEqual(
      read(400, { error: { message: "" }, detail: "from detail" }).message,
      "from detail",
    );
  });

  await test("a shape can override kind and retryable; a kind alone re-derives retryable", async () => {
    const a = read(
      400,
      { detail: "x" },
      "k",
      only({ path: "detail", kind: "rate_limit" }),
    );
    assertEqual(a.kind, "rate_limit");
    assertEqual(a.retryable, true);
    const b = read(
      503,
      { detail: "x" },
      "k",
      only({ path: "detail", kind: "invalid_request" }),
    );
    assertEqual(b.kind, "invalid_request");
    assertEqual(b.retryable, false);
    const c = read(
      400,
      { detail: "x" },
      "k",
      only({ path: "detail", retryable: true }),
    );
    assertEqual(c.kind, "invalid_request");
    assertEqual(c.retryable, true);
  });

  await test("shape types are enforced and no path reads an inherited property", async () => {
    const list = { detail: [{ msg: "x" }] };
    assertEqual(
      read(400, list, "k", only({ path: "detail", isArray: true })).message,
      fallback(400),
    );
    assertEqual(
      read(400, list, "k", only({ path: "detail" })).message,
      fallback(400),
    );
    assertEqual(read(400, { detail: "just text" }).message, "just text");
    // A formatter on a plain shape is applied to the string, not skipped.
    assertEqual(
      read(
        400,
        { detail: "just text" },
        "k",
        only({ path: "detail", formatter: "fastapi-validation" }),
      ).message,
      "Request failed validation — unspecified field",
    );
    const inherited = only({ path: "constructor.name" }, { path: "__proto__" });
    assertEqual(read(400, {}, "k", inherited).message, fallback(400));
  });

  await test("removes the key from every message, and leaves a message alone when there is no key", async () => {
    const key = "k.e*y(1)";
    assertEqual(
      read(403, { error: { message: `bad ${key} and ${key}` } }, key).message,
      "bad [redacted] and [redacted]",
    );
    assertEqual(
      read(400, { detail: [{ loc: ["body"], msg: `echoed ${key}` }] }, key)
        .message,
      "Request failed validation — body: echoed [redacted]",
    );
    assertEqual(read(403, { detail: key }, key).message, "[redacted]");
    assertEqual(
      read(400, { detail: "nothing to hide" }, "").message,
      "nothing to hide",
    );
    // The label is catalog data, but a message built from it is still a message.
    const labelled = (payload: unknown): string =>
      classifyDecisionError(LAYA_LIKE, {
        status: 403,
        payload,
        requestId: undefined,
        label: `Laya ${key}`,
        apiKey: key,
      }).message;
    assertEqual(
      labelled(undefined),
      "Laya [redacted] request failed with HTTP 403",
    );
    assertEqual(
      labelled({ error: { message: "Received API Key = sk-x" } }),
      "Laya [redacted] request failed with HTTP 403",
    );
    // Redaction matches inside "[redacted]" for a key such as "e", so it must
    // run once over the fallback, not twice.
    assertEqual(
      read(400, undefined, "e").message,
      "Laya r[redacted]qu[redacted]st fail[redacted]d with HTTP 400",
    );
  });

  await test("removes LiteLLM's key echo, sk- keys, long hex runs and data URLs", async () => {
    const echo =
      "Authentication Error. Received API Key = sk-live-123, Key Hash (Token) =abc";
    assertEqual(
      read(403, { error: { message: echo } }).message,
      "Authentication Error",
    );
    assertEqual(
      read(400, { detail: "token sk-abc.DEF_123 rejected" }).message,
      "token [redacted] rejected",
    );
    assertEqual(
      read(429, { detail: `hash ${"ab12".repeat(8)} limited` }).message,
      "hash [redacted] limited",
    );
    assertEqual(
      read(400, { detail: "got data:image/png;base64,iVBORw0KGgo= inline" })
        .message,
      "got [media] inline",
    );
  });

  await test("falls back, keeping the kind, when redaction leaves nothing", async () => {
    const blank = read(400, { detail: "   " });
    assertEqual(blank.message, fallback(400));
    assertEqual(blank.kind, "invalid_request");
    const tail = read(403, { error: { message: "Received API Key = sk-x" } });
    assertEqual(tail.message, fallback(403));
    assertEqual(tail.kind, "authentication");
    // The first text decides even when redaction empties it: no second try.
    assertEqual(
      read(400, { error: { message: "  " }, detail: "later" }).message,
      fallback(400),
    );
  });
}

// XOR's regex source, as the catalog entry will carry it.
const CONTEXT_LENGTH_SOURCE =
  "(context|prefill|prompt).{0,40}(length|limit|too long|exceed)|(too long|exceeds?).{0,40}(context|tokens)";

// Copied from xor.ts before its classifier moved to the catalog: the parity
// guard compares the catalog's rule list against this, so it must not import
// the class that is going away.
const OLD_CONTEXT_LENGTH_MESSAGE =
  /(context|prefill|prompt).{0,40}(length|limit|too long|exceed)|(too long|exceeds?).{0,40}(context|tokens)/i;

function oldXorErrorKind(status: number, message: string): DecisionErrorKind {
  if (status === 401) {
    return "authentication";
  }
  if (status === 413) {
    return "max_tokens_exceeded";
  }
  if (status === 429) {
    return "rate_limit";
  }
  if (status === 503) {
    return "overloaded";
  }
  if (status >= 500) {
    return OLD_CONTEXT_LENGTH_MESSAGE.test(message)
      ? "max_tokens_exceeded"
      : "server";
  }
  return "invalid_request";
}

// Copied from xor.ts's readXorErrorMessage and parseDecisionError for the same
// reason: the shipped xor.json is compared against what the class said.
function oldXorMessage(
  payload: unknown,
  status: number,
  describeValidationErrors: (detail: readonly unknown[]) => string,
  redactCredentials: (message: string, apiKey: string) => string,
  apiKey: string,
): string {
  const isRec = (v: unknown): v is Record<string, unknown> =>
    typeof v === "object" && v !== null && !Array.isArray(v);
  const read = (): string | undefined => {
    if (!isRec(payload)) {
      return undefined;
    }
    const { error, detail } = payload;
    if (
      isRec(error) &&
      typeof error.message === "string" &&
      error.message.length > 0
    ) {
      return error.message;
    }
    if (typeof error === "string" && error.length > 0) {
      return error;
    }
    if (Array.isArray(detail)) {
      return `Request failed validation — ${describeValidationErrors(detail)}`;
    }
    return typeof detail === "string" && detail.length > 0 ? detail : undefined;
  };
  const fallback = `XOR request failed with HTTP ${status}`;
  return redactCredentials(read() ?? fallback, apiKey) || fallback;
}

// The errors block of the file the package ships. It is read from src as data,
// the way a build copies it, so a change to the file is seen without a build.
function shippedXorErrors(): DecideErrors {
  const entry = JSON.parse(
    readFileSync(
      fileURLToPath(
        new URL("../src/lib/providers/catalog/xor.json", import.meta.url),
      ),
      "utf8",
    ),
  ) as DecideCatalogJson;
  return entry.decide.errors;
}

const XOR_LIKE: DecideErrors = {
  rules: [
    { status: 401, kind: "authentication" },
    { status: 413, kind: "max_tokens_exceeded" },
    { status: 429, kind: "rate_limit" },
    { status: 503, kind: "overloaded" },
    {
      statusMin: 500,
      messagePattern: CONTEXT_LENGTH_SOURCE,
      kind: "max_tokens_exceeded",
    },
    { statusMin: 500, kind: "server" },
  ],
  default: "invalid_request",
  bodyShapes: [
    { path: "error.message" },
    { path: "error" },
    { path: "detail", isArray: true, formatter: "fastapi-validation" },
    { path: "detail" },
  ],
};

async function errorMessagePatternSection(): Promise<void> {
  logSection("classifyDecisionError: messagePattern");
  const { classifyDecisionError } =
    await import("../dist/providers/decide/errors.js");
  const classify = (
    status: number,
    payload: unknown,
    options: { apiKey?: string; spec?: DecideErrors; label?: string } = {},
  ): DecisionError =>
    classifyDecisionError(options.spec ?? XOR_LIKE, {
      status,
      payload,
      requestId: undefined,
      label: options.label ?? "XOR",
      apiKey: options.apiKey ?? "k-secret",
    });
  const saying = (message: string): unknown => ({ error: { message } });
  const kindOf = (status: number, message: string): DecisionErrorKind =>
    classify(status, saying(message)).kind;

  await test("a 500 whose message says the context or prefill is too long is max_tokens_exceeded and is not retried", async () => {
    for (const message of [
      "Prompt length exceeds the model context",
      "context length exceeded",
      "The prefill is too long",
      "input is too long for the context window",
      "request exceeds the maximum number of tokens",
    ]) {
      const got = classify(500, saying(message));
      assertEqual(got.kind, "max_tokens_exceeded", "kind for a long prefill");
      assertEqual(got.retryable, false, "a long prefill must not be retried");
      assertEqual(got.message, message);
      assertEqual(got.status, 500);
    }
  });

  await test("a 500 with an unrelated message is a server error and is retried", async () => {
    for (const message of [
      "Internal error",
      "token limit",
      "The context window is fine",
      "upstream connect error",
    ]) {
      const got = classify(500, saying(message));
      assertEqual(got.kind, "server", "kind for an unrelated 500");
      assertEqual(got.retryable, true, "an unrelated 500 is retried");
      assertEqual(got.message, message);
    }
  });

  await test("a 500 with no readable body falls to the plain rule", async () => {
    for (const payload of [null, undefined, {}, "<html>oops</html>", []]) {
      const got = classify(500, payload);
      assertEqual(got.kind, "server", "kind for a 500 with no body");
      assertEqual(got.retryable, true);
      assertEqual(got.message, "XOR request failed with HTTP 500");
    }
  });

  await test("the status still gates the rule: the same message on another status keeps that status's kind", async () => {
    const message = "context length exceeded";
    assertEqual(kindOf(400, message), "invalid_request");
    assertEqual(kindOf(404, message), "invalid_request");
    assertEqual(kindOf(422, message), "invalid_request");
    assertEqual(kindOf(499, message), "invalid_request");
    assertEqual(kindOf(401, message), "authentication");
    assertEqual(kindOf(429, message), "rate_limit");
    assertEqual(kindOf(413, "plain"), "max_tokens_exceeded");
    assertEqual(kindOf(500, message), "max_tokens_exceeded");
    assertEqual(kindOf(502, message), "max_tokens_exceeded");
    assertEqual(kindOf(599, message), "max_tokens_exceeded");
  });

  await test("a 503 stays overloaded and retried, because its rule is listed first", async () => {
    const got = classify(503, saying("prefill is too long"));
    assertEqual(got.kind, "overloaded");
    assertEqual(got.retryable, true);
  });

  await test("the pattern is matched without regard to case", async () => {
    for (const message of [
      "CONTEXT LENGTH EXCEEDED",
      "Prompt Is Too Long For The Context",
      "PreFill LIMIT reached",
      "TOO LONG for CONTEXT",
    ]) {
      assertEqual(kindOf(500, message), "max_tokens_exceeded");
    }
  });

  await test("a match survives repeated calls: the compiled pattern keeps no position between them", async () => {
    // The same matching message several times in a row: a global or sticky
    // pattern remembers where the last match ended and misses the next one, and
    // a failed search in between would reset it.
    for (let call = 0; call < 4; call += 1) {
      assertEqual(
        kindOf(500, "context length exceeded"),
        "max_tokens_exceeded",
        "a repeated message stopped matching",
      );
    }
    assertEqual(kindOf(500, "nothing of the kind"), "server");
  });

  await test("the pattern runs with the case flag only: anchors hold the whole message and a dot stops at a line break", async () => {
    const withPattern = (messagePattern: string): DecideErrors => ({
      ...XOR_LIKE,
      rules: [
        { statusMin: 500, messagePattern, kind: "overloaded" },
        { statusMin: 500, kind: "server" },
      ],
    });
    const anchored = withPattern("^alpha$");
    assertEqual(
      classify(500, saying("alpha"), { spec: anchored }).kind,
      "overloaded",
    );
    assertEqual(
      classify(500, saying("x\nalpha\ny"), { spec: anchored }).kind,
      "server",
    );
    assertEqual(
      classify(500, saying("x\nalpha"), { spec: anchored }).kind,
      "server",
    );
    assertEqual(
      classify(500, saying("alpha\ny"), { spec: anchored }).kind,
      "server",
    );
    const dotted = withPattern("a.b");
    assertEqual(
      classify(500, saying("a-b"), { spec: dotted }).kind,
      "overloaded",
    );
    assertEqual(classify(500, saying("a\nb"), { spec: dotted }).kind, "server");
  });

  await test("only the first 2,000 characters of the message are matched", async () => {
    const phrase = "context length";
    const padded = (width: number): string =>
      `${"x".repeat(width - phrase.length - 1)} ${phrase}`;
    assertEqual(padded(2000).length, 2000);
    assertEqual(kindOf(500, padded(2000)), "max_tokens_exceeded");
    assertEqual(kindOf(500, padded(2001)), "server");
    assertEqual(
      kindOf(500, `${"x".repeat(2000)} context length exceeded`),
      "server",
    );
    assertEqual(
      kindOf(500, `context length exceeded ${"x".repeat(5000)}`),
      "max_tokens_exceeded",
    );
    // The message itself is kept whole; only the match window is cut.
    assertEqual(
      classify(500, saying(padded(2001))).message.length,
      2001,
      "the message was cut",
    );
  });

  await test("the key is removed before the pattern is matched", async () => {
    const message = "prompt length exceeded";
    assertEqual(kindOf(500, message), "max_tokens_exceeded");
    const got = classify(500, saying(message), { apiKey: "prompt" });
    assertEqual(got.kind, "server", "the pattern saw the key");
    assertEqual(got.retryable, true);
    assertEqual(got.message, "[redacted] length exceeded");
    // A key that is not in the message leaves the match alone.
    assertEqual(
      classify(500, saying(message), { apiKey: "unrelated" }).kind,
      "max_tokens_exceeded",
    );
    // The key may cut the other alternative too.
    assertEqual(
      classify(500, saying("exceeds the tokens"), { apiKey: "tokens" }).kind,
      "server",
    );
  });

  await test("a pattern is matched against the fallback text when the body gives none, redaction included", async () => {
    const spec: DecideErrors = {
      ...XOR_LIKE,
      rules: [
        {
          statusMin: 500,
          messagePattern: "request failed with HTTP 50[23]",
          kind: "overloaded",
        },
        { statusMin: 500, kind: "server" },
      ],
    };
    assertEqual(classify(502, null, { spec }).kind, "overloaded");
    assertEqual(classify(500, null, { spec }).kind, "server");
    // A body that redaction empties leaves the fallback text to be matched.
    assertEqual(
      classify(502, { error: { message: "Received API Key = sk-x" } }, { spec })
        .kind,
      "overloaded",
    );
    // A readable body replaces the fallback, so its words are not in play.
    assertEqual(classify(502, saying("plain"), { spec }).kind, "server");
    // The fallback is redacted before it is matched too.
    assertEqual(
      classify(502, null, { spec, apiKey: "request" }).kind,
      "server",
    );
  });

  await test("the first rule that matches both the status and the pattern wins; one that fails the pattern is skipped", async () => {
    const spec: DecideErrors = {
      ...XOR_LIKE,
      rules: [
        { statusMin: 500, messagePattern: "alpha", kind: "overloaded" },
        { status: [500, 502], messagePattern: "beta", kind: "rate_limit" },
        { statusMin: 500, messagePattern: "alpha|beta", kind: "timeout" },
        { statusMin: 500, kind: "server" },
      ],
    };
    assertEqual(
      classify(500, saying("alpha beta"), { spec }).kind,
      "overloaded",
    );
    assertEqual(classify(500, saying("beta"), { spec }).kind, "rate_limit");
    assertEqual(classify(504, saying("beta"), { spec }).kind, "timeout");
    assertEqual(classify(502, saying("beta"), { spec }).kind, "rate_limit");
    assertEqual(classify(500, saying("gamma"), { spec }).kind, "server");
    assertEqual(
      classify(499, saying("alpha"), { spec }).kind,
      "invalid_request",
    );
  });

  await test("specs with different patterns do not share a compiled one", async () => {
    const withPattern = (messagePattern: string): DecideErrors => ({
      ...XOR_LIKE,
      rules: [
        { statusMin: 500, messagePattern, kind: "overloaded" },
        { statusMin: 500, kind: "server" },
      ],
    });
    const alpha = withPattern("alpha");
    const beta = withPattern("beta");
    for (let round = 0; round < 2; round += 1) {
      assertEqual(
        classify(500, saying("alpha"), { spec: alpha }).kind,
        "overloaded",
      );
      assertEqual(
        classify(500, saying("alpha"), { spec: beta }).kind,
        "server",
      );
      assertEqual(
        classify(500, saying("beta"), { spec: beta }).kind,
        "overloaded",
      );
      assertEqual(
        classify(500, saying("beta"), { spec: alpha }).kind,
        "server",
      );
    }
  });

  await test("a rule's own retryable and a body shape's own kind still apply on a pattern match", async () => {
    const retried: DecideErrors = {
      ...XOR_LIKE,
      rules: [
        {
          statusMin: 500,
          messagePattern: "too long",
          kind: "max_tokens_exceeded",
          retryable: true,
        },
        { statusMin: 500, kind: "server", retryable: false },
      ],
    };
    assertEqual(
      classify(500, saying("too long"), { spec: retried }).retryable,
      true,
    );
    assertEqual(
      classify(500, saying("other"), { spec: retried }).retryable,
      false,
    );

    const shaped: DecideErrors = {
      ...XOR_LIKE,
      bodyShapes: [
        {
          path: "detail",
          isArray: true,
          formatter: "fastapi-validation",
          kind: "invalid_request",
          retryable: false,
        },
        { path: "error.message" },
      ],
    };
    const validation = classify(
      500,
      { detail: [{ loc: ["body"], msg: "prompt is too long" }] },
      { spec: shaped },
    );
    assertEqual(validation.kind, "invalid_request", "the shape's kind lost");
    assertEqual(validation.retryable, false);
    // The same words in a shape with no kind of its own take the rule's.
    assertEqual(
      classify(500, saying("prompt is too long"), { spec: shaped }).kind,
      "max_tokens_exceeded",
    );
  });

  await test("rules without a pattern ignore the message, as every Laya case above already shows", async () => {
    // errorClassificationSection and errorMessageSection run LAYA_LIKE, which
    // carries no pattern, over every status and many messages; this is the
    // one place the same words are fed to a patternless 500 on purpose.
    for (const message of ["context length exceeded", "plain"]) {
      const got = classify(500, saying(message), { spec: LAYA_LIKE });
      assertEqual(got.kind, "server");
      assertEqual(got.retryable, true);
    }
  });

  const { describeValidationErrors, redactCredentials } =
    await import("../dist/providers/systemOneDecision.js");
  const shipped = shippedXorErrors();
  const specs: ReadonlyArray<[string, DecideErrors]> = [
    ["the hand copy", XOR_LIKE],
    ["the shipped xor.json", shipped],
  ];
  for (const [which, spec] of specs) {
    await test(`parity with xor.ts's classifier: ${which} gives the old kind and retry flag`, async () => {
      const messages = [
        "Prompt length exceeds the model context",
        "context length exceeded",
        "The prefill is too long",
        "input is too long for the context window",
        "request exceeds the maximum number of tokens",
        "CONTEXT LIMIT",
        "prompt exceed",
        `prompt ${"x".repeat(40)} limit`,
        `prompt ${"x".repeat(41)} limit`,
        `too long ${"x".repeat(40)} tokens`,
        `too long ${"x".repeat(41)} tokens`,
        "context",
        "contextual limits apply",
        "tokens exceed the allowance",
        "Token limit",
        "Internal error",
        "upstream connect error",
        "prompt\nlength",
        "prefill:\tlimit",
        "The context window is fine",
        "exceeded context",
        "exceedscontext",
        "overlong prompt",
      ];
      // 402 and 403 are on the grid on purpose: xor.ts keeps them out of
      // `authentication` so a budget or a team without the model does not trip
      // the auth breaker.
      const statuses = [
        400, 401, 402, 403, 404, 413, 422, 429, 499, 500, 502, 503, 504, 599,
      ];
      let compared = 0;
      for (const message of messages) {
        for (const status of statuses) {
          const old = oldXorErrorKind(status, message);
          const got = classify(status, saying(message), { spec });
          assertEqual(
            got.kind,
            old,
            `kind for status ${status}, message ${messages.indexOf(message)}`,
          );
          assertEqual(
            got.retryable,
            old === "rate_limit" || old === "overloaded" || old === "server",
            `retry flag for status ${status}, message ${messages.indexOf(message)}`,
          );
          compared += 1;
        }
      }
      assertEqual(compared, messages.length * statuses.length);
      // Positive control: the inputs reach both outcomes at a 500, so equal
      // answers do not just mean "everything is server".
      const at500 = messages.map((message) => oldXorErrorKind(500, message));
      assert(
        at500.includes("max_tokens_exceeded") && at500.includes("server"),
        "the guard inputs reach one outcome only",
      );
      const at403 = oldXorErrorKind(403, "forbidden");
      assertEqual(
        at403,
        "invalid_request",
        "403 must stay out of authentication",
      );
    });
  }

  await test("the shipped xor.json reads the same message, kind and retry flag as xor.ts for every body shape it meets", async () => {
    const payloads: unknown[] = [
      { error: { message: "proxy says no", type: "t", code: "401" } },
      { error: "plain string error" },
      { error: "" },
      { error: { message: "" }, detail: "falls to detail" },
      { error: { message: "" }, error2: 1 },
      { error: 7, detail: "number error falls to detail" },
      { detail: "fastapi string" },
      { detail: "" },
      {
        detail: [
          { loc: ["body", "state"], msg: "field required", input: "SECRET" },
          { loc: ["body", "questions", "q", "type"], msg: "bad type" },
        ],
      },
      { detail: [] },
      { detail: [{ msg: "no loc" }] },
      { error: { message: "key k-secret was rejected by the proxy" } },
      { error: "bad key k-secret, try again" },
      { detail: "k-secret is not allowed here" },
      { error: { message: "wins" }, detail: [{ msg: "loses" }] },
      { error: "string wins", detail: [{ msg: "loses" }] },
      { error: "prefill length exceeds the model context limit" },
      { detail: [{ msg: "prompt is too long for the context" }] },
      {},
      [],
      "just a string",
      null,
      undefined,
    ];
    const statuses = [400, 401, 402, 403, 404, 422, 429, 500, 502, 503];
    let compared = 0;
    for (const status of statuses) {
      for (const payload of payloads) {
        const got = classify(status, payload, { spec: shipped });
        const message = oldXorMessage(
          payload,
          status,
          describeValidationErrors,
          redactCredentials,
          "k-secret",
        );
        const kind = oldXorErrorKind(status, message);
        const where = `status ${status}, payload ${payloads.indexOf(payload)}`;
        assertEqual(got.message, message, `message for ${where}`);
        assertEqual(got.kind, kind, `kind for ${where}`);
        assertEqual(
          got.retryable,
          kind === "rate_limit" || kind === "overloaded" || kind === "server",
          `retry flag for ${where}`,
        );
        compared += 1;
      }
    }
    assertEqual(compared, statuses.length * payloads.length);
    // A parity check on payloads that never hold the key would not exercise
    // redaction at all: the three that do must come out without it.
    const holding = payloads.filter((payload) =>
      JSON.stringify(payload)?.includes("k-secret"),
    );
    assertEqual(holding.length, 3, "payloads that hold the key");
    for (const payload of holding) {
      for (const status of statuses) {
        assert(
          !classify(status, payload, { spec: shipped }).message.includes(
            "k-secret",
          ),
          `the key is gone from the message for status ${status}`,
        );
      }
    }
  });
}

const GOOD = { apiKey: "k-1", baseURL: "https://laya.test/base" };

const CLEARED_ENV = [
  "LAYA_API_KEY",
  "LAYA_BASE_URL",
  "LAYA_MODEL",
  "XOR_API_KEY",
  "XOR_BASE_URL",
  "XOR_MODEL",
  "NEUROLINK_DEBUG",
  "HTTPS_PROXY",
  "https_proxy",
  "HTTP_PROXY",
  "http_proxy",
  "ALL_PROXY",
  "all_proxy",
  "SOCKS_PROXY",
  "socks_proxy",
] as const;

async function withEnv<T>(
  values: Readonly<Record<string, string>>,
  run: () => T | Promise<T>,
): Promise<T> {
  // A name the case sets is saved and restored too, so a variable outside
  // CLEARED_ENV is not left behind or lost.
  const names = [...new Set([...CLEARED_ENV, ...Object.keys(values)])];
  const saved = names.map((name) => [name, process.env[name]] as const);
  for (const name of names) {
    delete process.env[name];
  }
  Object.assign(process.env, values);
  try {
    return await run();
  } finally {
    for (const name of names) {
      delete process.env[name];
    }
    for (const [name, value] of saved) {
      if (value !== undefined) {
        process.env[name] = value;
      }
    }
  }
}

async function loadProbe() {
  const { ConfiguredDecisionProvider } =
    await import("../dist/providers/configuredDecision.js");
  return class Probe extends ConfiguredDecisionProvider {
    // The hooks are protected; reaching one by name keeps the tests on behaviour.
    call(hook: string, ...args: unknown[]): unknown {
      const method: unknown = Reflect.get(this, hook);
      if (typeof method !== "function") {
        throw new Error(`The provider has no hook named ${hook}`);
      }
      return Reflect.apply(method, this, args);
    }
  };
}

type MakeOptions = {
  env?: Record<string, string>;
  entry?: DecideCatalogJson;
  modelName?: string;
};

async function make(
  credentials?: Record<string, unknown>,
  options: MakeOptions = {},
) {
  const Probe = await loadProbe();
  return withEnv(
    options.env ?? {},
    () =>
      new Probe(
        options.entry ?? LAYA_ENTRY,
        options.modelName,
        undefined,
        credentials,
      ),
  );
}

async function configuredCoreSection(): Promise<void> {
  logSection("ConfiguredDecisionProvider: credentials, base URL, endpoint");

  await test("builds <baseURL>/predict with a bearer key and a JSON content type", async () => {
    const provider = await make(GOOD);
    assertEqual(
      provider.call("decisionEndpoint"),
      "https://laya.test/base/predict",
    );
    assertEqual(
      JSON.stringify(provider.call("decisionHeaders")),
      JSON.stringify({
        Authorization: "Bearer k-1",
        "Content-Type": "application/json",
      }),
    );
  });

  await test("strips every trailing slash from the base URL and keeps interior ones", async () => {
    const cases = [
      ["https://laya.test/base/", "https://laya.test/base/predict"],
      ["https://laya.test/base///", "https://laya.test/base/predict"],
      ["https://laya.test//base//", "https://laya.test//base/predict"],
    ];
    for (const [baseURL, expected] of cases) {
      const provider = await make({ ...GOOD, baseURL });
      assertEqual(provider.call("decisionEndpoint"), expected, baseURL);
    }
  });

  await test("trims credentials, lets blank ones fall through to the environment, prefers set ones", async () => {
    const env = {
      LAYA_API_KEY: " env-key ",
      LAYA_BASE_URL: "https://env.test/",
    };
    const own = await make(
      { apiKey: "  own-key  ", baseURL: " https://own.test " },
      { env },
    );
    assertEqual(own.call("decisionApiKey"), "own-key");
    assertEqual(own.call("decisionEndpoint"), "https://own.test/predict");
    const blank = await make({ apiKey: "   ", baseURL: "\t" }, { env });
    assertEqual(blank.call("decisionApiKey"), "env-key");
    assertEqual(blank.call("decisionEndpoint"), "https://env.test/predict");

    // Settled at construction: a later change to the environment moves nothing.
    const none = await make();
    const later = await withEnv(
      { LAYA_API_KEY: "later-key", LAYA_BASE_URL: "https://later.test" },
      () => ({
        ownKey: own.call("decisionApiKey"),
        ownHeaders: JSON.stringify(own.call("decisionHeaders")),
        ownEndpoint: own.call("decisionEndpoint"),
        blankKey: blank.call("decisionApiKey"),
        blankHeaders: JSON.stringify(blank.call("decisionHeaders")),
        blankEndpoint: blank.call("decisionEndpoint"),
        noneKey: none.call("decisionApiKey"),
        noneEndpoint: none.call("decisionEndpoint"),
      }),
    );
    const headersOf = (key: string): string =>
      JSON.stringify({
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      });
    assert(
      later.ownKey === "own-key",
      "decisionApiKey followed the environment after construction",
    );
    assert(
      later.ownHeaders === headersOf("own-key"),
      "decisionHeaders followed the environment after construction",
    );
    assert(
      later.ownEndpoint === "https://own.test/predict",
      "decisionEndpoint followed the environment after construction",
    );
    assert(
      later.blankKey === "env-key" &&
        later.blankHeaders === headersOf("env-key") &&
        later.blankEndpoint === "https://env.test/predict",
      "an environment-sourced provider followed the environment after construction",
    );
    assert(
      later.noneKey === "" &&
        !String(later.noneEndpoint).includes("later.test"),
      "a provider built without a key or base URL picked them up from the environment later",
    );
  });

  await test("a missing or blank key is empty, and the message names the variable and the credentials path", async () => {
    const message =
      "Laya requires an API key. Set LAYA_API_KEY or pass credentials.laya.apiKey.";
    for (const provider of [
      await make(),
      await make({ apiKey: "   " }, { env: { LAYA_API_KEY: "\n" } }),
    ]) {
      assertEqual(provider.call("decisionApiKey"), "");
      assertEqual(provider.call("missingKeyMessage"), message);
    }
  });

  await test("a missing, blank or slash-only base URL is reported; a set one is not", async () => {
    const message =
      "Laya requires a base URL. Set LAYA_BASE_URL or pass credentials.laya.baseURL.";
    for (const baseURL of [undefined, "   ", "///"]) {
      const provider = await make({ apiKey: "k-1", baseURL });
      assertEqual(
        provider.call("missingConfigMessage"),
        message,
        String(baseURL),
      );
    }
    assertEqual((await make(GOOD)).call("missingConfigMessage"), undefined);

    // A base URL can carry credentials; no message may repeat any part of it.
    const secretURL = "https://user:pw@laya.test/?token=t";
    const keyless = await make({ baseURL: secretURL });
    assert(
      keyless.call("missingConfigMessage") === undefined,
      "a base URL that is set was reported as missing",
    );
    const keyMessage = keyless.call("missingKeyMessage");
    if (typeof keyMessage !== "string") {
      throw new Error("the key message is not a string");
    }
    assert(
      keyMessage ===
        "Laya requires an API key. Set LAYA_API_KEY or pass credentials.laya.apiKey.",
      "the key message changed when a base URL was set",
    );
    for (const secret of [secretURL, "user:pw", "token=t", "laya.test"]) {
      assert(
        !keyMessage.includes(secret),
        "the key message repeats part of the base URL",
      );
    }
  });

  await test("a credential of the wrong type is ignored instead of throwing", async () => {
    const provider = await make(
      { apiKey: 42, baseURL: ["https://laya.test"] },
      { env: { LAYA_API_KEY: "env-key", LAYA_BASE_URL: "https://env.test" } },
    );
    assertEqual(provider.call("decisionApiKey"), "env-key");
    assertEqual(provider.call("decisionEndpoint"), "https://env.test/predict");
  });

  await test("an unknown endpoint placeholder fails when the provider is constructed", async () => {
    const entry: DecideCatalogJson = {
      ...LAYA_ENTRY,
      decide: { ...LAYA_ENTRY.decide, endpoint: "{baseUrl}/predict" },
    };
    let message = "";
    try {
      await make(GOOD, { entry });
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }
    assertIncludes(message, "{baseUrl}");
  });

  await test("settles the model before the base class asks for it: argument, then environment, then the catalog default", async () => {
    const cases: Array<[string | undefined, Record<string, string>, string]> = [
      [undefined, {}, "typed-decisions"],
      [undefined, { LAYA_MODEL: "english" }, "english"],
      ["multilingual", { LAYA_MODEL: "english" }, "multilingual"],
      ["", { LAYA_MODEL: "english" }, "english"],
    ];
    for (const [modelName, env, expected] of cases) {
      const provider = await make(GOOD, { env, modelName });
      assertEqual(
        Reflect.get(provider, "modelName"),
        expected,
        `${modelName ?? "(no model)"} with ${Object.keys(env).join() || "no environment"}`,
      );
    }
    const provider = await make(GOOD);
    assertEqual(
      await withEnv({ LAYA_MODEL: "english" }, () =>
        provider.call("getDefaultModel"),
      ),
      "english",
    );
    assertEqual(
      await withEnv({}, () => provider.call("getDefaultModel")),
      "typed-decisions",
    );
  });

  await test("takes the base URL from credentials, then the environment, then the entry's own, and transforms it as the entry says", async () => {
    const entry: DecideCatalogJson = {
      ...LAYA_ENTRY,
      wire: { baseURL: "  https://wire.test/  " },
    };
    const endpointOf = async (
      credentials: Record<string, unknown>,
      env: Record<string, string>,
    ) => (await make(credentials, { entry, env })).call("decisionEndpoint");
    const env = { LAYA_BASE_URL: "https://env.test" };
    assertEqual(
      await endpointOf({ ...GOOD, baseURL: "https://own.test" }, env),
      "https://own.test/predict",
    );
    assertEqual(
      await endpointOf({ apiKey: "k-1" }, env),
      "https://env.test/predict",
    );
    assertEqual(
      await endpointOf(
        { apiKey: "k-1", baseURL: " " },
        { LAYA_BASE_URL: "  " },
      ),
      "https://wire.test/predict",
    );
    assertEqual(
      await endpointOf({ apiKey: "k-1" }, {}),
      "https://wire.test/predict",
    );

    const plain = structuredClone(LAYA_ENTRY);
    delete plain.decide.baseURLNormalize;
    delete plain.decide.baseURLRequired;
    const unchanged = await make(
      { ...GOOD, baseURL: "https://laya.test/base/" },
      { entry: plain },
    );
    assertEqual(
      unchanged.call("decisionEndpoint"),
      "https://laya.test/base//predict",
    );
    const unset = await make({ apiKey: "k-1" }, { entry: plain });
    assertEqual(unset.call("missingConfigMessage"), undefined);
  });

  await test("reads the variables, credentials key and name its own entry gives", async () => {
    const entry: DecideCatalogJson = {
      ...LAYA_ENTRY,
      id: "acme-ai",
      displayName: "Acme",
      wire: { envOverrides: { baseURL: "ACME_ENDPOINT" } },
      models: { ...LAYA_ENTRY.models, default: "english" },
      decide: { ...LAYA_ENTRY.decide, endpoint: "{baseURL}/v2/decide" },
    };
    const env = {
      ACME_AI_API_KEY: "acme-key",
      ACME_ENDPOINT: "https://acme.test/",
      ACME_AI_MODEL: "acme-model",
      LAYA_API_KEY: "laya-key",
      LAYA_BASE_URL: "https://laya.test",
      LAYA_MODEL: "laya-model",
    };
    const provider = await make(undefined, { entry, env });
    assertEqual(provider.call("decisionApiKey"), "acme-key");
    assertEqual(
      provider.call("decisionEndpoint"),
      "https://acme.test/v2/decide",
      "the endpoint did not follow the entry's own template",
    );
    assertEqual(Reflect.get(provider, "modelName"), "acme-model");
    assertEqual(Reflect.get(provider, "providerName"), "acme-ai");
    assertEqual(provider.call("vendorLabel"), "Acme");
    assertEqual(provider.call("vendorDisplayName"), "Acme");
    assertEqual(
      await withEnv(
        { ACME_AI_MODEL: "acme-next", LAYA_MODEL: "laya-next" },
        () => provider.call("getDefaultModel"),
      ),
      "acme-next",
    );

    const bare = await make(undefined, { entry });
    assertEqual(Reflect.get(bare, "modelName"), "english");
    assertEqual(
      await withEnv({}, () => bare.call("getDefaultModel")),
      "english",
    );
    assertEqual(
      bare.call("missingKeyMessage"),
      "Acme requires an API key. Set ACME_AI_API_KEY or pass credentials.acmeAi.apiKey.",
    );
    assertEqual(
      bare.call("missingConfigMessage"),
      "Acme requires a base URL. Set ACME_ENDPOINT or pass credentials.acmeAi.baseURL.",
    );
  });

  await test("classifies a failed response by its entry's rules and keeps the key out of the message", async () => {
    const provider = await make({
      apiKey: "k-secret-9",
      baseURL: "https://laya.test",
    });
    const rejected = provider.call(
      "parseDecisionError",
      401,
      { error: { message: "Invalid key k-secret-9 rejected" } },
      "req-1",
    ) as DecisionError;
    assertEqual(rejected.kind, "authentication");
    assertEqual(rejected.status, 401);
    assertEqual(rejected.requestId, "req-1");
    assertEqual(rejected.message, "Invalid key [redacted] rejected");
    const bare = provider.call(
      "parseDecisionError",
      500,
      null,
      undefined,
    ) as DecisionError;
    assertEqual(bare.kind, "server");
    assertEqual(bare.retryable, true);
    assertEqual(bare.message, "Laya request failed with HTTP 500");
  });
}

async function configuredWireSection(): Promise<void> {
  logSection("ConfiguredDecisionProvider: body, request id, response model");
  const withDecide = (
    patch: Partial<DecideCatalogJson["decide"]>,
  ): DecideCatalogJson => ({
    ...LAYA_ENTRY,
    decide: { ...LAYA_ENTRY.decide, ...patch },
  });
  const aliased = withDecide({
    model: { placement: "body-unless-alias", alias: "auto" },
  });
  const state = `"state":"the state","questions":{"q":{"type":"noul","instructions":"Urgent?"}}`;
  const body = async (
    entry: DecideCatalogJson,
    model: string,
  ): Promise<string> => {
    const provider = await make(GOOD, { entry });
    const questions = { q: { type: "noul", instructions: "Urgent?" } };
    return JSON.stringify(
      provider.call("buildDecisionBody", "the state", questions, model),
    );
  };

  await test("omits the model when it equals the alias and sends any other, model first", async () => {
    assertEqual(await body(aliased, "auto"), `{${state}}`);
    assertEqual(await body(aliased, "english"), `{"model":"english",${state}}`);
  });

  await test("the alias match is exact", async () => {
    for (const model of ["Auto", "AUTO", " auto", "auto ", ""]) {
      assertEqual(
        await body(aliased, model),
        `{"model":${JSON.stringify(model)},${state}}`,
        model,
      );
    }
  });

  await test("placement body always sends the model, and so does body-unless-alias without an alias", async () => {
    const plain = withDecide({ model: { placement: "body", alias: "auto" } });
    const noAlias = withDecide({ model: { placement: "body-unless-alias" } });
    assertEqual(await body(plain, "auto"), `{"model":"auto",${state}}`);
    assertEqual(await body(noAlias, "auto"), `{"model":"auto",${state}}`);
    assertEqual(await body(noAlias, ""), `{"model":"",${state}}`);
  });

  await test("reads the request id from the first configured header that is present", async () => {
    const entry = withDecide({
      requestIdHeaders: ["x-primary", "x-secondary"],
    });
    const provider = await make(GOOD, { entry });
    const id = (headers: Record<string, string>): unknown =>
      provider.call("readRequestId", new Headers(headers));
    assertEqual(id({ "X-Secondary": "b", "x-primary": "a" }), "a");
    assertEqual(id({ "X-Secondary": "b" }), "b");
    assertEqual(id({ "x-other": "c" }), undefined);
    const bare = await make(GOOD, {
      entry: withDecide({ requestIdHeaders: undefined }),
    });
    // Both Laya spellings are sent, so a fallback to a built-in header when
    // requestIdHeaders is absent would find one.
    assertEqual(
      bare.call(
        "readRequestId",
        new Headers({
          "x-primary": "a",
          "x-litellm-call-id": "call-1",
          "x-request-id": "req-1",
        }),
      ),
      undefined,
    );

    // Lookup is fetch's own, so the configured spelling does not matter.
    const mixed = await make(GOOD, {
      entry: withDecide({ requestIdHeaders: ["X-Request-Id", "x-second"] }),
    });
    const mixedId = (headers: Record<string, string>): unknown =>
      mixed.call("readRequestId", new Headers(headers));
    assertEqual(mixedId({ "x-request-id": "r-1" }), "r-1", "lower-case header");
    assertEqual(mixedId({ "X-REQUEST-ID": "r-2" }), "r-2", "upper-case header");
    // Present is what counts: an empty value is returned as it is, as Laya's
    // single header is, and the next header is not consulted.
    assertEqual(mixedId({ "x-request-id": "", "x-second": "b" }), "", "empty");
    assertEqual(
      mixedId({ "x-request-id": "undefined" }),
      "undefined",
      "the word undefined",
    );
    assertEqual(mixedId({}), undefined, "no headers");
  });

  await test("reads the answering model from the first string at a configured path", async () => {
    const entry = withDecide({
      response: { modelPaths: ["routing.model", "meta.model"] },
    });
    const provider = await make(GOOD, { entry });
    const model = (payload: unknown): unknown =>
      provider.call("resolveResponseModel", payload, "asked");
    assertEqual(
      model({ model: "top", routing: { model: "english" } }),
      "english",
    );
    assertEqual(
      model({ model: "top", routing: { model: 5 }, meta: { model: "meta" } }),
      "meta",
    );
    assertEqual(model({ model: "top", routing: null }), "top");
    assertEqual(model({ model: "top", routing: [{ model: "x" }] }), "top");
    assertEqual(model({ model: 7 }), "asked");
    const none = await make(GOOD, {
      entry: withDecide({ response: undefined }),
    });
    const payload = { model: "top", routing: { model: "english" } };
    assertEqual(none.call("resolveResponseModel", payload, "asked"), "top");

    // The first path holding a string wins, and an empty string is a string:
    // Laya returns it too.
    assertEqual(
      model({ routing: { model: "first" }, meta: { model: "second" } }),
      "first",
      "first path wins",
    );
    assertEqual(
      model({ model: "top", routing: { model: "" }, meta: { model: "m" } }),
      "",
      "empty string",
    );

    // Own data properties only, and no JSON payload makes the hook throw.
    const hostile = await make(GOOD, {
      entry: withDecide({
        response: { modelPaths: ["custom", "routing.model", "a..b", "x.0.m"] },
      }),
    });
    const hostileModel = (value: unknown): unknown =>
      hostile.call("resolveResponseModel", value, "asked");
    assertEqual(
      hostileModel(Object.create({ custom: "inherited" })),
      "asked",
      "inherited property",
    );
    const getter = Object.defineProperty({ model: "top" }, "custom", {
      enumerable: true,
      get: () => {
        throw new Error("a getter ran");
      },
    });
    assertEqual(hostileModel(getter), "top", "getter");
    assertEqual(
      hostileModel({ x: [{ m: "index" }], model: "top" }),
      "top",
      "array index",
    );
    for (const value of [null, undefined, [], ["x"], "text", 5]) {
      assertEqual(hostileModel(value), "asked", `payload ${String(value)}`);
    }
    const blank = await make(GOOD, {
      entry: withDecide({ response: { modelPaths: [""] } }),
    });
    assertEqual(
      blank.call("resolveResponseModel", { model: "top", "": "x" }, "asked"),
      "top",
      "empty path",
    );
  });
}

type Sent = { url: string; headers: Record<string, string>; body: string };

// The base class sends through createProxyFetch(): with no proxy variable set
// (make clears them) that is a direct handler calling the global fetch, so
// replacing globalThis.fetch intercepts the call. Every case asserts that the
// stub saw what it expects before it looks at anything else.
async function withFetchStub<T>(
  reply: () => Response,
  run: (sent: Sent[]) => Promise<T>,
): Promise<T> {
  const original = globalThis.fetch;
  const sent: Sent[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    sent.push({
      url:
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url,
      headers: Object.fromEntries(new Headers(init?.headers).entries()),
      body: typeof init?.body === "string" ? init.body : "",
    });
    return reply();
  }) as typeof fetch;
  try {
    return await run(sent);
  } finally {
    globalThis.fetch = original;
  }
}

function causeKind(error: unknown): string | undefined {
  const cause =
    error instanceof Error
      ? (error.cause as { kind?: string } | undefined)
      : undefined;
  return cause?.kind;
}

async function configuredBehaviourSection(): Promise<void> {
  logSection(
    "ConfiguredDecisionProvider: errors, model, base URL default, log, decide()",
  );
  const request: DecisionRequest = {
    state: "payouts have failed",
    questions: { q: { type: "boolean", instructions: "Is this urgent?" } },
    model: "auto",
  };

  await test("turns failed responses into the class's own errors: label, array on a 503, no key echo", async () => {
    const provider = await make({
      apiKey: "laya-secret-1",
      baseURL: "https://laya.test",
    });
    const parse = (status: number, payload: unknown): DecisionError =>
      provider.call(
        "parseDecisionError",
        status,
        payload,
        "req-1",
      ) as DecisionError;

    const plain = parse(400, null);
    assertEqual(plain.message, "Laya request failed with HTTP 400");
    assertEqual(plain.kind, "invalid_request");
    assertEqual(plain.status, 400);
    assertEqual(plain.requestId, "req-1");

    const array = parse(503, {
      detail: [{ loc: ["body", "state"], msg: "Field required" }],
    });
    assertEqual(array.kind, "invalid_request");
    assertEqual(array.retryable, false);

    const echo = parse(403, {
      error: {
        message: "key laya-secret-1 rejected. Received API Key = sk-abc123",
      },
    });
    assertEqual(echo.message, "key [redacted] rejected");
    assertEqual(echo.kind, "authentication");
  });

  await test("the default model is the model variable, else the entry's; a given name wins", async () => {
    const modelOf = (provider: unknown): unknown =>
      Reflect.get(Object(provider), "modelName");
    const env = { LAYA_MODEL: "multilingual" };
    assertEqual(modelOf(await make(GOOD, { env })), "multilingual");
    assertEqual(modelOf(await make(GOOD)), LAYA_ENTRY.models.default);
    assertEqual(
      modelOf(await make(GOOD, { env, modelName: "english" })),
      "english",
    );
  });

  await test("a built-in wire.baseURL serves an entry whose base URL is optional", async () => {
    const entry: DecideCatalogJson = {
      ...LAYA_ENTRY,
      wire: { ...LAYA_ENTRY.wire, baseURL: "https://default.test/api/" },
      decide: {
        ...LAYA_ENTRY.decide,
        baseURLRequired: false,
        baseURLNormalize: ["strip-trailing-slash"],
      },
    };
    const bare = await make({ apiKey: "k-1" }, { entry });
    assertEqual(
      bare.call("decisionEndpoint"),
      "https://default.test/api/predict",
    );
    assertEqual(bare.call("missingConfigMessage"), undefined);
    const own = await make(
      { apiKey: "k-1", baseURL: "https://own.test" },
      { entry },
    );
    assertEqual(own.call("decisionEndpoint"), "https://own.test/predict");
  });

  await test("the constructor's debug line names the entry and carries no URL credentials, query tokens or key", async () => {
    const { logger } = await import("../dist/utils/logger.js");
    const key = "laya-secret-key-7";
    const initialized = (name: string): string =>
      `${name} Provider initialized (decide only)`;
    // The debug lines the constructor emitted, each as message plus data.
    const emitted = async (
      credentials: Record<string, unknown>,
      options: MakeOptions,
    ): Promise<string[]> => {
      logger.clearLogs();
      await make(credentials, options);
      return logger
        .getLogs("debug")
        .map((line) =>
          JSON.stringify({ message: line.message, data: line.data }),
        );
    };
    const only = (lines: string[], name: string): string => {
      const own = lines.filter((line) =>
        line.startsWith(`{"message":${JSON.stringify(initialized(name))},`),
      );
      assertEqual(own.length, 1, `exactly one "${initialized(name)}" line`);
      return own[0] ?? "";
    };
    const debug = { NEUROLINK_DEBUG: "true" };
    logger.setLogLevel("debug");
    try {
      const withUrl = await emitted(
        { apiKey: key, baseURL: "https://user:pw@laya.test/base?token=SECRET" },
        { env: debug },
      );
      const without = await emitted({ apiKey: key }, { env: debug });
      const named = await emitted(
        { apiKey: key, baseURL: "https://laya.test/base" },
        { env: debug, entry: { ...LAYA_ENTRY, displayName: "Acme" } },
      );
      const silent = await emitted(GOOD, {});

      assertEqual(
        only(withUrl, "Laya"),
        `{"message":"Laya Provider initialized (decide only)","data":{"modelName":"${LAYA_ENTRY.models.default}","baseURL":"https://laya.test/base"}}`,
      );
      for (const leak of ["pw", "SECRET", "user"]) {
        assert(
          !only(withUrl, "Laya").includes(leak),
          `the debug line must not contain ${leak}`,
        );
      }
      for (const line of [...withUrl, ...without]) {
        assert(!line.includes(key), "no debug line may carry the API key");
      }
      assertEqual(
        only(without, "Laya"),
        `{"message":"Laya Provider initialized (decide only)","data":{"modelName":"${LAYA_ENTRY.models.default}","baseURL":"(not set)"}}`,
      );
      assertIncludes(only(named, "Acme"), `"baseURL":"https://laya.test/base"`);
      // The logger drops debug lines unless NEUROLINK_DEBUG is "true".
      assertEqual(silent.length, 0, "no debug line without NEUROLINK_DEBUG");
    } finally {
      logger.setLogLevel("info");
      logger.clearLogs();
    }
  });

  await test("decide() posts the configured request and reads the configured response", async () => {
    const answer = {
      model: "laya-rl-agent",
      answers: { q: { type: "noul", noul: 0.9 } },
      usage: { input_tokens: 4, output_tokens: 0 },
      routing: { model: "english" },
    };
    const reply = (): Response =>
      new Response(JSON.stringify(answer), {
        status: 200,
        headers: {
          "content-type": "application/json",
          "x-litellm-call-id": "call-9",
        },
      });
    await withFetchStub(reply, async (sent) => {
      const settled = await (await make(GOOD)).decide(request).then(
        (value) => ({ ok: true as const, value }),
        (error: unknown) => ({ ok: false as const, error }),
      );
      // First, that the stub was the thing that answered: a request that went
      // anywhere else would leave this empty.
      assertEqual(sent.length, 1, "the stubbed fetch must receive the request");
      if (!settled.ok) {
        throw settled.error;
      }
      const result = settled.value;
      assertEqual(sent[0]?.url, "https://laya.test/base/predict");
      assertEqual(sent[0]?.headers.authorization, "Bearer k-1");
      assertEqual(
        sent[0]?.body,
        `{"state":"payouts have failed","questions":{"q":{"type":"noul","instructions":"Is this urgent?"}}}`,
      );
      assertEqual(result.model, "english");
      assertEqual(result.requestId, "call-9");
      assertEqual(result.answers.q?.type, "boolean");
    });
  });

  await test("decide() refuses a blank key or base URL before sending anything", async () => {
    const cases = [
      [{ apiKey: "   ", baseURL: "https://laya.test" }, "authentication"],
      [{ apiKey: "k-1", baseURL: "///" }, "invalid_request"],
      [{ apiKey: "", baseURL: "" }, "authentication"],
    ] as const;
    await withFetchStub(
      () => new Response("{}"),
      async (sent) => {
        for (const [credentials, kind] of cases) {
          const provider = await make(credentials);
          const error = await provider.decide(request).then(
            () => undefined,
            (rejection: unknown) => rejection,
          );
          assertEqual(causeKind(error), kind);
        }
        assertEqual(
          sent.length,
          0,
          "nothing may be sent without a key and base URL",
        );

        // Positive control: the same stub is reachable, so the empty list
        // above means "not sent", not "could not have been seen". The stub's
        // empty body is then refused, after it was sent.
        await (await make(GOOD)).decide(request).catch(() => undefined);
        assertEqual(
          sent.length,
          1,
          "a configured provider must reach the stub",
        );
      },
    );
  });
}

const ORIGIN_ENTRY: DecideCatalogJson = {
  ...LAYA_ENTRY,
  id: "xor",
  displayName: "XOR",
  decide: {
    ...LAYA_ENTRY.decide,
    baseURLNormalize: ["strip-trailing-slash", "strip-v1-suffix"],
    baseURLShape: "origin",
  },
};

function causeMessage(error: unknown): string | undefined {
  const cause =
    error instanceof Error
      ? (error.cause as { message?: string } | undefined)
      : undefined;
  return cause?.message;
}

async function configuredBaseUrlShapeSection(): Promise<void> {
  logSection("ConfiguredDecisionProvider: baseURLShape");

  await test("an origin entry reports a bad base URL through missingConfigMessage, in its own names", async () => {
    const cases = [
      ["xor.internal:8080", SCHEME_PROBLEM],
      ["https://u:p@h", PARTS_PROBLEM],
      ["https://h?x=1", PARTS_PROBLEM],
      ["https://h?", PARTS_PROBLEM],
      ["https://h#", PARTS_PROBLEM],
      ["https://h?/", PARTS_PROBLEM],
      ["not a url", INVALID_PROBLEM],
    ] as const;
    for (const [baseURL, expected] of cases) {
      const provider = await make(
        { apiKey: "k-1", baseURL },
        { entry: ORIGIN_ENTRY },
      );
      assert(
        provider.call("missingConfigMessage") === expected,
        "the problem text is not the one XOR's own class gives",
      );
    }
  });

  await test("an origin entry checks the normalised base URL, so a /v1 or a trailing slash is not a problem", async () => {
    for (const baseURL of [
      "https://h",
      "https://h/",
      "https://h/v1",
      "https://h/V1/",
    ]) {
      const provider = await make(
        { apiKey: "k-1", baseURL },
        { entry: ORIGIN_ENTRY },
      );
      assertEqual(
        provider.call("missingConfigMessage"),
        undefined,
        "a valid origin was reported",
      );
      assertEqual(provider.call("decisionEndpoint"), "https://h/predict");
    }
  });

  await test("an origin entry keeps the missing base URL message when none is set", async () => {
    for (const baseURL of [undefined, "   ", "///", "/v1"]) {
      const provider = await make(
        { apiKey: "k-1", baseURL },
        { entry: ORIGIN_ENTRY },
      );
      assert(
        provider.call("missingConfigMessage") ===
          "XOR requires a base URL. Set XOR_BASE_URL or pass credentials.xor.baseURL.",
        "an unset base URL did not get the missing message",
      );
    }
  });

  await test("the label, variable names and credentials key in the fix text come from the entry", async () => {
    const shaped: DecideCatalogJson = {
      ...LAYA_ENTRY,
      decide: { ...LAYA_ENTRY.decide, baseURLShape: "origin" },
    };
    const laya = await make(
      { apiKey: "k-1", baseURL: "https://u:p@h" },
      { entry: shaped },
    );
    assert(
      laya.call("missingConfigMessage") ===
        "The Laya base URL must not carry credentials, a query string or a fragment. Set LAYA_BASE_URL or pass credentials.laya.baseURL to the origin, and give the key through LAYA_API_KEY or credentials.laya.apiKey.",
      "the fix text did not follow a copy of Laya's entry",
    );
    // An id that is not its credentials key, and a renamed base URL variable.
    const acme = await make(
      { apiKey: "k-1", baseURL: "not a url" },
      {
        entry: {
          ...shaped,
          id: "acme-ai",
          displayName: "Acme",
          credentialsKey: "acmeCustom",
          wire: { envOverrides: { baseURL: "ACME_ENDPOINT" } },
        },
      },
    );
    assert(
      acme.call("missingConfigMessage") ===
        "The Acme base URL is not a valid absolute URL. Set ACME_ENDPOINT or pass credentials.acmeCustom.baseURL to the origin, and give the key through ACME_AI_API_KEY or credentials.acmeCustom.apiKey.",
      "the fix text did not follow an entry with its own names",
    );
  });

  await test("an origin entry that does not require a base URL says nothing when none is set", async () => {
    const optional: DecideCatalogJson = {
      ...ORIGIN_ENTRY,
      decide: { ...ORIGIN_ENTRY.decide, baseURLRequired: false },
    };
    const provider = await make({ apiKey: "k-1" }, { entry: optional });
    assertEqual(
      provider.call("missingConfigMessage"),
      undefined,
      "an unset, optional base URL was reported",
    );
  });

  await test("an entry without baseURLShape refuses nothing a base URL can carry", async () => {
    for (const baseURL of [
      "https://u:p@h",
      "https://h?x=1",
      "https://h#f",
      "xor.internal:8080",
      "not a url",
    ]) {
      const provider = await make({ apiKey: "k-1", baseURL });
      assertEqual(
        provider.call("missingConfigMessage"),
        undefined,
        "Laya's entry refused a base URL it never refused",
      );
    }
  });

  await test("decide() refuses a bad origin before sending anything, and the error holds no part of the base URL", async () => {
    const request: DecisionRequest = {
      state: "payouts have failed",
      questions: { q: { type: "boolean", instructions: "Is this urgent?" } },
      model: "auto",
    };
    const cases = [
      ["xor.internal:8080", SCHEME_PROBLEM],
      ["https://SECRETUSER:SECRETPW@h/?token=SECRETTOKEN", PARTS_PROBLEM],
      ["https://h?", PARTS_PROBLEM],
      ["https://h/base#", PARTS_PROBLEM],
      ["SECRET not a url", INVALID_PROBLEM],
    ] as const;
    await withFetchStub(
      () => new Response("{}"),
      async (sent) => {
        for (const [baseURL, expected] of cases) {
          const provider = await make(
            { apiKey: "k-1", baseURL },
            { entry: ORIGIN_ENTRY },
          );
          const error = await provider.decide(request).then(
            () => undefined,
            (rejection: unknown) => rejection,
          );
          assertEqual(causeKind(error), "invalid_request");
          const message = causeMessage(error);
          assert(message === expected, "decide() gave another problem text");
          assert(
            !String(error instanceof Error ? error.message : "").includes(
              "SECRET",
            ),
            "the thrown error repeats part of the base URL",
          );
        }
        assertEqual(sent.length, 0, "nothing may be sent to a refused origin");

        // Positive control: the stub is reachable, so the empty list above
        // means "not sent". Its empty body is refused after it was sent.
        await (
          await make(
            { apiKey: "k-1", baseURL: "https://h/v1/" },
            { entry: ORIGIN_ENTRY },
          )
        )
          .decide(request)
          .catch(() => undefined);
        assertEqual(sent.length, 1, "a valid origin must reach the stub");
        assertEqual(sent[0]?.url, "https://h/predict");
      },
    );
  });
}

const MEDIA_FIXTURES = fileURLToPath(
  new URL("./fixtures/decide/xor/", import.meta.url),
);
const fixtureBytes = (name: string): Buffer =>
  readFileSync(join(MEDIA_FIXTURES, name));
const asDataUrl = (mime: string, bytes: Buffer): string =>
  `data:${mime};base64,${bytes.toString("base64")}`;

// The base class reads what a request may carry from the descriptor registered
// under the entry's id, so this entry takes XOR's id and with it XOR's
// allowance: 8 images, one video, 8 MiB.
const MEDIA_ENTRY: DecideCatalogJson = {
  ...LAYA_ENTRY,
  id: "xor",
  displayName: "XOR",
  decisionLimits: {
    maxStateTokens: 200_000,
    nonAsciiTokensPerChar: 1,
    media: { maxImages: 8, video: true, maxRequestBytes: 8 * 1024 * 1024 },
  },
  decide: {
    ...LAYA_ENTRY.decide,
    media: { imagesKey: "images", videoKey: "video" },
  },
};

const withMediaKeys = (
  media: NonNullable<DecideCatalogJson["decide"]["media"]>,
): DecideCatalogJson => ({
  ...MEDIA_ENTRY,
  decide: { ...MEDIA_ENTRY.decide, media },
});

const MEDIA_REQUEST: DecisionRequest = {
  state: "payouts have failed",
  questions: { q: { type: "boolean", instructions: "Is this urgent?" } },
  model: "typed-decisions",
};

const MEDIA_ANSWER = JSON.stringify({
  model: "typed-decisions",
  answers: { q: { type: "noul", noul: 0.9 } },
  usage: { input_tokens: 10, output_tokens: 1 },
});

// The JSON the stub received, or why nothing was received.
async function bodySentFor(
  entry: DecideCatalogJson,
  extra: Partial<DecisionRequest>,
): Promise<Record<string, unknown>> {
  return withFetchStub(
    () =>
      new Response(MEDIA_ANSWER, {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    async (sent) => {
      const provider = await make(
        { apiKey: "k-1", baseURL: "https://xor.test" },
        { entry },
      );
      await provider.decide({ ...MEDIA_REQUEST, ...extra });
      assertEqual(sent.length, 1, "the request did not reach the stub");
      const body: Record<string, unknown> = JSON.parse(sent[0]?.body ?? "");
      return body;
    },
  );
}

const sameJson = (a: unknown, b: unknown): boolean =>
  JSON.stringify(a) === JSON.stringify(b);

async function configuredMediaSection(): Promise<void> {
  logSection("ConfiguredDecisionProvider: decide.media");

  const png = fixtureBytes("red.png");
  const mp4 = fixtureBytes("red.mp4");
  const pngUrl = asDataUrl("image/png", png);
  const mp4Url = asDataUrl("video/mp4", mp4);
  const state = "payouts have failed";
  const questions = { q: { type: "boolean", instructions: "Is this urgent?" } };
  const prepared = (
    over: Partial<DecisionPreparedMedia> = {},
  ): DecisionPreparedMedia => ({ images: [], bytes: 0, ...over });

  await test("an entry without decide.media builds the body it always did, and ignores prepared media", async () => {
    const laya = await make(GOOD);
    const keysOf = (media?: DecisionPreparedMedia): string[] =>
      Object.keys(
        laya.call(
          "buildDecisionBody",
          state,
          questions,
          "typed-decisions",
          media,
        ) as object,
      );
    assert(
      sameJson(keysOf(), ["model", "state", "questions"]),
      "the Laya body changed",
    );
    assert(
      sameJson(
        keysOf(prepared({ images: [pngUrl], video: mp4Url, bytes: 1 })),
        ["model", "state", "questions"],
      ),
      "an entry with no media keys wrote media into the body",
    );
    assert(
      sameJson(
        Object.keys(
          laya.call("buildDecisionBody", state, questions, "auto") as object,
        ),
        ["state", "questions"],
      ),
      "the alias body changed",
    );
  });

  await test("Laya refuses media before any request, so no media key can reach its wire", async () => {
    await withFetchStub(
      () => new Response(MEDIA_ANSWER),
      async (sent) => {
        const provider = await make(GOOD);
        const refusal = await provider
          .decide({ ...MEDIA_REQUEST, images: [png] })
          .then(
            () => undefined,
            (rejection: unknown) => rejection,
          );
        assertEqual(causeKind(refusal), "invalid_request");
        assertEqual(sent.length, 0, "an image reached Laya's wire");
      },
    );
  });

  await test("a request without media sends no images or video key", async () => {
    const body = await bodySentFor(MEDIA_ENTRY, {});
    assert(
      sameJson(Object.keys(body), ["model", "state", "questions"]),
      "the body is not model, state and questions only",
    );
    // Positive control: the same entry does carry media when the request does.
    const control = await bodySentFor(MEDIA_ENTRY, { images: [png] });
    assert("images" in control, "the entry cannot carry an image at all");
  });

  await test("an empty images array sends no images key", async () => {
    const body = await bodySentFor(MEDIA_ENTRY, { images: [] });
    assert(
      sameJson(Object.keys(body), ["model", "state", "questions"]),
      "an empty images array reached the wire",
    );
  });

  await test("prepared media with no image never writes the images key", async () => {
    const provider = await make(
      { apiKey: "k-1", baseURL: "https://xor.test" },
      {
        entry: MEDIA_ENTRY,
      },
    );
    const keys = Object.keys(
      provider.call(
        "buildDecisionBody",
        state,
        questions,
        "typed-decisions",
        prepared({ video: mp4Url, bytes: mp4Url.length }),
      ) as object,
    );
    assert(
      sameJson(keys, ["model", "state", "questions", "video"]),
      "a video-only body is not model, state, questions, video",
    );
    const none = Object.keys(
      provider.call(
        "buildDecisionBody",
        state,
        questions,
        "typed-decisions",
        prepared(),
      ) as object,
    );
    assert(
      sameJson(none, ["model", "state", "questions"]),
      "an empty prepared media added a key",
    );
  });

  await test("one image goes out as an images array of data URLs, with no video key", async () => {
    const body = await bodySentFor(MEDIA_ENTRY, { images: [png] });
    assert(
      sameJson(body.images, [pngUrl]),
      "images is not the one prepared data URL",
    );
    assert(!("video" in body), "a video key was written for an image request");
  });

  await test("a video alone goes out under the video key, with no images key", async () => {
    const body = await bodySentFor(MEDIA_ENTRY, { video: mp4 });
    assertEqual(body.video, mp4Url, "the video is not the prepared data URL");
    assert(
      !("images" in body),
      "an images key was written for a video-only request",
    );
  });

  await test("images and a video go out together, in the order model, state, questions, images, video", async () => {
    const body = await bodySentFor(MEDIA_ENTRY, {
      images: [png, fixtureBytes("blue.png")],
      video: mp4,
    });
    assert(
      sameJson(Object.keys(body), [
        "model",
        "state",
        "questions",
        "images",
        "video",
      ]),
      "the body keys are not in XOR's order",
    );
    assert(
      sameJson(body.images, [
        pngUrl,
        asDataUrl("image/png", fixtureBytes("blue.png")),
      ]),
      "the images are not both prepared data URLs, in order",
    );
    assertEqual(body.video, mp4Url, "the video is not the prepared data URL");
    // The alias drops `model` and leaves the rest of the order alone.
    const aliased = await bodySentFor(MEDIA_ENTRY, {
      model: "auto",
      images: [png],
      video: mp4,
    });
    assert(
      sameJson(Object.keys(aliased), ["state", "questions", "images", "video"]),
      "the aliased body is not state, questions, images, video",
    );
  });

  await test("the body keys are the ones the entry names", async () => {
    const entry = withMediaKeys({ imagesKey: "pictures", videoKey: "clip" });
    const body = await bodySentFor(entry, { images: [png], video: mp4 });
    assert(
      sameJson(Object.keys(body), [
        "model",
        "state",
        "questions",
        "pictures",
        "clip",
      ]),
      "the body does not use the entry's own key names",
    );
    assert(sameJson(body.pictures, [pngUrl]), "pictures lost the image");
    assertEqual(body.clip, mp4Url, "clip lost the video");
  });

  await test("an entry that names no video key never writes the video", async () => {
    // Unreachable through the schema (the allowance says video: true), so the
    // hook is called as the base class would call it.
    const provider = await make(
      { apiKey: "k-1", baseURL: "https://xor.test" },
      {
        entry: withMediaKeys({ imagesKey: "images" }),
      },
    );
    const keys = Object.keys(
      provider.call(
        "buildDecisionBody",
        state,
        questions,
        "typed-decisions",
        prepared({ images: [pngUrl], video: mp4Url, bytes: 1 }),
      ) as object,
    );
    assert(
      sameJson(keys, ["model", "state", "questions", "images"]),
      "a video was written with no key configured for it",
    );
  });

  await test("the descriptor's own caps still run: eight images pass, a ninth and an oversized body are refused before any request", async () => {
    const eight = await bodySentFor(MEDIA_ENTRY, {
      images: Array.from({ length: 8 }, () => png),
    });
    assert(
      Array.isArray(eight.images) && eight.images.length === 8,
      "eight images did not all go out",
    );
    const refused: ReadonlyArray<readonly [Partial<DecisionRequest>, string]> =
      [
        [{ images: Array.from({ length: 9 }, () => png) }, "at most 8"],
        [
          {
            images: [`data:image/png;base64,${"A".repeat(9 * 1024 * 1024)}`],
          },
          "The request is",
        ],
      ];
    await withFetchStub(
      () => new Response(MEDIA_ANSWER),
      async (sent) => {
        for (const [extra, needle] of refused) {
          const provider = await make(
            { apiKey: "k-1", baseURL: "https://xor.test" },
            { entry: MEDIA_ENTRY },
          );
          const refusal = await provider
            .decide({ ...MEDIA_REQUEST, ...extra })
            .then(
              () => undefined,
              (rejection: unknown) => rejection,
            );
          assertEqual(causeKind(refusal), "invalid_request");
          assert(
            (causeMessage(refusal) ?? "").includes(needle),
            "the request was refused for another reason",
          );
        }
        assertEqual(sent.length, 0, "a refused request reached the wire");
      },
    );
  });
}

await runSuite(async () => {
  await readPathSection();
  await baseUrlSection();
  await baseUrlShapeSection();
  await templateSection();
  await formatterSection();
  await errorClassificationSection();
  await errorMessageSection();
  await errorMessagePatternSection();
  await configuredCoreSection();
  await configuredWireSection();
  await configuredBehaviourSection();
  await configuredBaseUrlShapeSection();
  await configuredMediaSection();
});
