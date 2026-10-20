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
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type {
  DecideBodyShape,
  DecideCatalogJson,
  DecideErrors,
  DecisionDialect,
  DecisionDialectBody,
  DecisionError,
  DecisionErrorKind,
  DecisionPreparedMedia,
  DecisionQuestion,
  DecisionQuestionMap,
  DecisionRequest,
  DecisionState,
  ProviderDescriptor,
} from "../src/lib/types/index.js";
import { assertDistFresh } from "./helpers/distFreshness.js";
import { LAYA_ENTRY } from "./helpers/decideFixtures.js";
import {
  assert,
  assertEqual,
  assertIncludes,
  assertNotNull,
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
const CLEARTEXT_PROBLEM = `The XOR base URL must use https:// unless it points at this machine (localhost, 127.0.0.1 or [::1]). ${XOR_FIX}`;
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
      "https://h:8080",
      "https://h/proxy/route",
      "HTTPS://XOR.INTERNAL",
      // Only a literal "?" or "#" starts a query or fragment.
      "https://h/a%3Fb",
      "https://h/a%23b",
    ]) {
      assertEqual(problem(ok), undefined, "a valid origin was refused");
    }
  });

  await test("accepts http only for this machine: localhost, 127.0.0.1 and [::1]", async () => {
    for (const ok of [
      "http://127.0.0.1:8080",
      "http://127.0.0.1",
      "http://localhost:11434",
      "http://[::1]:8080",
      "http://[::1]",
      "http://localhost/proxy/route",
      // The host is lowercased, and the dotted-quad spellings of 127.0.0.1 are
      // folded into it, before the check sees it.
      "HTTP://LOCALHOST",
      "http://LocalHost:9",
      "http://0x7f.1:8080",
      "http://2130706433:8080",
      "http://127.1:8080",
      // https is accepted whatever the host is.
      "https://10.0.0.5",
      "https://0.0.0.0",
    ]) {
      assertEqual(problem(ok), undefined, "a loopback http origin was refused");
    }
  });

  await test("refuses http to any other host with the cleartext message", async () => {
    for (const bad of [
      "http://h:8080",
      "http://xor.internal:8080",
      "http://10.0.0.5",
      "http://192.168.1.10:8080",
      "http://0.0.0.0",
      "http://[::2]",
      "http://[::ffff:127.0.0.1]",
      // The rest of 127/8 is not loopback here, as elsewhere in the SDK.
      "http://127.0.0.2",
      "http://127.255.255.254",
      // A host that only starts or ends like a loopback name.
      "http://127.0.0.1.evil.test",
      "http://localhost.evil.test",
      "http://evil.test.localhost",
      "http://notlocalhost",
      // userinfo cannot make a remote host look local.
      "http://localhost@evil.test",
      "http://127.0.0.1:80@evil.test",
      "http://localhost:80@10.0.0.5",
      "HTTP://EVIL.TEST",
    ]) {
      assertEqual(
        problem(bad),
        CLEARTEXT_PROBLEM,
        "the cleartext message was not given",
      );
    }
  });

  await test("a cleartext origin is refused before the credentials message, and a loopback one still gets that message", async () => {
    assertEqual(
      problem("http://h:8080/base?x=1"),
      CLEARTEXT_PROBLEM,
      "the cleartext message did not come first",
    );
    assertEqual(
      problem("http://127.0.0.1:8080/base?x=1"),
      PARTS_PROBLEM,
      "a loopback origin skipped the credentials check",
    );
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
      "http://SECRETHOST.internal:8080",
      "http://SECRETUSER:SECRETPW@SECRETHOST/",
      "http://SECRETHOST/base?token=SECRETTOKEN#SECRETFRAG",
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

  await test("the label and the fix text come from the caller, in all four messages", async () => {
    const cases = [
      [
        "xor.internal:8080",
        "The Acme base URL must start with https:// or http://. Do the thing.",
      ],
      [
        "http://h:8080",
        "The Acme base URL must use https:// unless it points at this machine (localhost, 127.0.0.1 or [::1]). Do the thing.",
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

  await test("a rule's hint follows the message after a dash, names the key variable, and belongs to that rule alone", async () => {
    const spec: DecideErrors = {
      rules: [
        {
          status: 402,
          kind: "invalid_request",
          hint: "Check {apiKeyEnvVar} first.",
        },
        { status: 422, kind: "invalid_request" },
      ],
      default: "invalid_request",
      bodyShapes: [{ path: "detail" }],
    };
    const hinted = (status: number, payload: unknown): DecisionError =>
      classifyDecisionError(spec, {
        status,
        payload,
        requestId: undefined,
        label: "Acme",
        apiKey: "k-secret",
        apiKeyEnvVar: "ACME_API_KEY",
      });
    const withHint = (text: string): string =>
      `${text} — Check ACME_API_KEY first.`;
    assertEqual(
      hinted(402, { detail: "Insufficient credits" }).message,
      withHint("Insufficient credits"),
    );
    assertEqual(hinted(422, { detail: "bad" }).message, "bad");
    assertEqual(hinted(429, { detail: "slow" }).message, "slow");
    // The fallback text takes the hint too, and the kind and retry flag stay
    // the rule's.
    const bare = hinted(402, null);
    assertEqual(bare.message, withHint("Acme request failed with HTTP 402"));
    assertEqual(bare.kind, "invalid_request");
    assertEqual(bare.retryable, false);
    assertEqual(bare.status, 402);
    assertEqual(
      classifyDecisionError(spec, {
        status: 402,
        payload: { detail: "x" },
        requestId: undefined,
        label: "Acme",
        apiKey: "k-secret",
      }).message,
      "x — Check the API key variable first.",
    );
  });

  await test("the key is removed from the hint as well, each part once", async () => {
    const spec: DecideErrors = {
      rules: [
        {
          status: 402,
          kind: "invalid_request",
          hint: "Check {apiKeyEnvVar} first.",
        },
      ],
      default: "invalid_request",
      bodyShapes: [{ path: "detail" }],
    };
    // Redaction matches inside "[redacted]" for a key such as "e", so neither
    // part may go through it twice.
    const got = classifyDecisionError(spec, {
      status: 402,
      payload: { detail: "Insufficient credits" },
      requestId: undefined,
      label: "Acme",
      apiKey: "e",
      apiKeyEnvVar: "ACME_API_KEY",
    });
    assertEqual(
      got.message,
      "Insuffici[redacted]nt cr[redacted]dits — Ch[redacted]ck ACME_API_KEY first.",
    );
    const named = classifyDecisionError(spec, {
      status: 402,
      payload: { detail: "Insufficient credits" },
      requestId: undefined,
      label: "Acme",
      apiKey: "first",
      apiKeyEnvVar: "ACME_API_KEY",
    });
    assertEqual(
      named.message,
      "Insufficient credits — Check ACME_API_KEY [redacted].",
    );
  });

  await test("a rule's messagePattern is judged on the body's message, not on the hint", async () => {
    const spec: DecideErrors = {
      rules: [
        {
          status: 402,
          messagePattern: "first",
          kind: "authentication",
          hint: "Check {apiKeyEnvVar} first.",
        },
        { status: 402, kind: "invalid_request" },
      ],
      default: "invalid_request",
      bodyShapes: [{ path: "detail" }],
    };
    const got = classifyDecisionError(spec, {
      status: 402,
      payload: { detail: "Insufficient credits" },
      requestId: undefined,
      label: "Acme",
      apiKey: "k",
      apiKeyEnvVar: "ACME_API_KEY",
    });
    assertEqual(got.kind, "invalid_request");
    assertEqual(got.message, "Insufficient credits");
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
// under the entry's id, so this entry takes XOR's id. XOR's shipped allowance is
// one image and no video, so the generic media cases run inside
// withXorAllowance(), which registers this entry's allowance (8 images, one
// video, 8 MiB) for their duration.
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

async function withXorAllowance<T>(run: () => Promise<T>): Promise<T> {
  const { PROVIDER_DESCRIPTORS_BY_NAME } =
    await import("../dist/factories/providerDescriptors.js");
  const registry = PROVIDER_DESCRIPTORS_BY_NAME as Map<
    string,
    ProviderDescriptor
  >;
  const shipped = registry.get("xor");
  assertNotNull(shipped, "XOR is not registered");
  registry.set("xor", {
    ...shipped,
    decisionLimits: MEDIA_ENTRY.decisionLimits,
  });
  try {
    return await run();
  } finally {
    registry.set("xor", shipped);
  }
}

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
  return withXorAllowance(() => sentBodyOf(entry, extra));
}

async function sentBodyOf(
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
    await withXorAllowance(() =>
      withFetchStub(
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
      ),
    );
  });
}

// Compares serialized JSON, key order included, and names only the case in a
// failure: the bodies hold data URLs and the model's wording.
function assertBytes(actual: unknown, expected: unknown, what: string): void {
  assert(
    JSON.stringify(actual) === JSON.stringify(expected),
    `${what}: the JSON differs from the expected bytes`,
  );
}

const IMAGE_URL = "data:image/png;base64,AAAA";
const VIDEO_URL = "data:video/mp4;base64,BBBB";

const SHIPPED_XOR: DecideCatalogJson = JSON.parse(
  readFileSync(
    fileURLToPath(
      new URL("../src/lib/providers/catalog/xor.json", import.meta.url),
    ),
    "utf8",
  ),
);

// 8-bit mono PCM: one byte a sample, so the length is exact.
function wavBytes(seconds: number, sampleRate = 8000): Buffer {
  const dataBytes = Math.round(seconds * sampleRate);
  const wav = Buffer.alloc(44 + dataBytes, 0x80);
  wav.write("RIFF", 0, "latin1");
  wav.writeUInt32LE(36 + dataBytes, 4);
  wav.write("WAVE", 8, "latin1");
  wav.write("fmt ", 12, "latin1");
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(sampleRate, 24);
  wav.writeUInt32LE(sampleRate, 28);
  wav.writeUInt16LE(1, 32);
  wav.writeUInt16LE(8, 34);
  wav.write("data", 36, "latin1");
  wav.writeUInt32LE(dataBytes, 40);
  return wav;
}

// "fLaC" and a STREAMINFO block carrying only the rate and the sample count.
function flacBytes(seconds: number, sampleRate = 16000): Buffer {
  const flac = Buffer.alloc(42);
  flac.write("fLaC", 0, "latin1");
  flac[4] = 0x80;
  flac[7] = 34;
  const total = Math.round(seconds * sampleRate);
  flac[18] = (sampleRate >> 12) & 0xff;
  flac[19] = (sampleRate >> 4) & 0xff;
  flac[20] = (sampleRate & 0x0f) << 4;
  flac[21] = Math.floor(total / 2 ** 32) & 0x0f;
  flac.writeUInt32BE(total % 2 ** 32, 22);
  return flac;
}

const M4A_BYTES = Buffer.concat([
  Buffer.from([0, 0, 0, 0x20]),
  Buffer.from("ftypM4A ", "latin1"),
  Buffer.alloc(24),
]);
const OGG_BYTES = Buffer.concat([
  Buffer.from("OggS", "latin1"),
  Buffer.alloc(60),
]);
const MP3_BYTES = Buffer.concat([
  Buffer.from("ID3", "latin1"),
  Buffer.alloc(60),
]);

// An Ogg stream: a first page holding the codec's identification packet, then a
// last page whose granule position is the stream's length in samples.
function oggBytes(
  codec: "opus" | "vorbis",
  seconds: number,
  rate = 48000,
): Buffer {
  const page = (granule: bigint, packet: Buffer): Buffer => {
    const header = Buffer.alloc(28);
    header.write("OggS", 0, "latin1");
    header.writeBigInt64LE(granule, 6);
    header[26] = 1;
    header[27] = packet.length;
    return Buffer.concat([header, packet]);
  };
  const id =
    codec === "opus"
      ? Buffer.concat([
          Buffer.from("OpusHead", "latin1"),
          Buffer.from([1, 1]),
          Buffer.from([0x38, 0x01]), // pre-skip 312
          Buffer.alloc(7),
        ])
      : (() => {
          const packet = Buffer.alloc(30);
          packet.write("\x01vorbis", 0, "latin1");
          packet[11] = 1;
          packet.writeUInt32LE(rate, 12);
          return packet;
        })();
  const samples = BigInt(
    Math.round(seconds * (codec === "opus" ? 48000 : rate)) +
      (codec === "opus" ? 312 : 0),
  );
  return Buffer.concat([page(0n, id), page(samples, Buffer.alloc(16))]);
}

const VALUE_ANSWER = JSON.stringify({
  model: "xor-omni-e4b",
  answers: { q: { type: "noul", noul: 0.9 } },
  usage: { input_tokens: 10, output_tokens: 1 },
});

// The body XOR's shipped entry sends for `extra`, or the refusal it gave
// without sending anything.
async function xorOutcome(
  extra: Partial<DecisionRequest>,
): Promise<
  | { sent: Record<string, unknown> }
  | { refused: { kind?: string; message: string } }
> {
  return withFetchStub(
    () =>
      new Response(VALUE_ANSWER, {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    async (sent) => {
      const provider = await make(
        { apiKey: "k-1", baseURL: "https://xor.test" },
        { entry: SHIPPED_XOR },
      );
      try {
        await provider.decide({
          state: "payouts have failed",
          questions: {
            q: { type: "boolean", instructions: "Is this urgent?" },
          },
          ...extra,
        });
      } catch (error) {
        assertEqual(sent.length, 0, "a refused request reached the wire");
        return {
          refused: {
            kind: causeKind(error),
            message: causeMessage(error) ?? "",
          },
        };
      }
      assertEqual(sent.length, 1, "the request did not reach the stub");
      return { sent: JSON.parse(sent[0]?.body ?? "") };
    },
  );
}

function sentBody(
  outcome: Awaited<ReturnType<typeof xorOutcome>>,
): Record<string, unknown> {
  if (!("sent" in outcome)) {
    throw new Error("the request was refused before it was sent");
  }
  return outcome.sent;
}

function refusedOf(outcome: Awaited<ReturnType<typeof xorOutcome>>): {
  kind?: string;
  message: string;
} {
  if (!("refused" in outcome)) {
    throw new Error("the request was sent, not refused");
  }
  return outcome.refused;
}

function refusal(
  outcome: Awaited<ReturnType<typeof xorOutcome>>,
  needle: string,
): void {
  const refused = refusedOf(outcome);
  assertEqual(refused.kind, "invalid_request");
  assertIncludes(refused.message, needle);
}

async function xorDecisionsSection(): Promise<void> {
  logSection("XOR: value, choice unknown, audio, per-question caps, errors");
  const { resolveDecisionLimitsReading, unsupportedDecisionQuestion } =
    await import("../dist/utils/decisionLimits.js");
  const { PROVIDER_DESCRIPTORS_BY_NAME } =
    await import("../dist/factories/providerDescriptors.js");
  const { getDecisionDialect } =
    await import("../dist/providers/decide/dialects/index.js");
  const { redactCredentials } =
    await import("../dist/providers/systemOneDecision.js");
  const { classifyDecisionError } =
    await import("../dist/providers/decide/errors.js");

  const xorRow = PROVIDER_DESCRIPTORS_BY_NAME.get("xor" as never);
  assertNotNull(xorRow, "XOR is not registered");
  const xorLimits = resolveDecisionLimitsReading(xorRow, "xor-latest");
  const choice = (n: number, unknown?: boolean): DecisionQuestion => ({
    type: "choice",
    instructions: "Which option?",
    criteria: Object.fromEntries(
      Array.from({ length: n }, (_, i) => [`o${i}`, `option ${i}`]),
    ),
    ...(unknown === undefined ? {} : { unknown }),
  });

  await test("the default question types are boolean, choice and score; XOR also reads value and choice-unknown", async () => {
    const value: DecisionQuestion = {
      type: "value",
      instructions: "Invoice amount?",
      dtype: "int",
    };
    assertIncludes(
      unsupportedDecisionQuestion(value, null) ?? "",
      'the question type "value" is not accepted',
    );
    assertIncludes(
      unsupportedDecisionQuestion(choice(2, true), null) ?? "",
      "unknown: true is not accepted",
    );
    assertEqual(unsupportedDecisionQuestion(choice(2), null), undefined);
    assertEqual(unsupportedDecisionQuestion(value, xorLimits), undefined);
    assertEqual(
      unsupportedDecisionQuestion(choice(2, true), xorLimits),
      undefined,
    );
    // An unknown: false choice is a plain choice.
    assertEqual(unsupportedDecisionQuestion(choice(2, false), null), undefined);
  });

  await test("XOR's per-question caps: 64 options counting unknown, 10 score levels, no option named unknown beside the flag", async () => {
    assertEqual(unsupportedDecisionQuestion(choice(64), xorLimits), undefined);
    assertEqual(
      unsupportedDecisionQuestion(choice(63, true), xorLimits),
      undefined,
    );
    assertIncludes(
      unsupportedDecisionQuestion(choice(64, true), xorLimits) ?? "",
      "at most 64 options, counting unknown",
    );
    assertIncludes(
      unsupportedDecisionQuestion(choice(65), xorLimits) ?? "",
      "at most 64 options",
    );
    const named: DecisionQuestion = {
      type: "choice",
      instructions: "x",
      criteria: { unknown: "no idea", yes: "yes" },
      unknown: true,
    };
    assertIncludes(
      unsupportedDecisionQuestion(named, xorLimits) ?? "",
      'cannot also name an option "unknown"',
    );
    const levels = (n: number): DecisionQuestion => ({
      type: "score",
      instructions: "Rate",
      criteria: Array.from({ length: n }, (_, i) => String(i)),
    });
    assertEqual(unsupportedDecisionQuestion(levels(10), xorLimits), undefined);
    assertIncludes(
      unsupportedDecisionQuestion(levels(11), xorLimits) ?? "",
      "at most 10 levels",
    );
  });

  await test("a provider that lists no value refuses a value question and a choice with unknown before any request", async () => {
    await withFetchStub(
      () => new Response(VALUE_ANSWER),
      async (sent) => {
        const laya = await make(GOOD);
        for (const question of [
          { type: "value", instructions: "Amount?" } as const,
          choice(2, true),
        ]) {
          const rejection = await laya
            .decide({ state: "x", questions: { v: question } })
            .then(
              () => undefined,
              (error: unknown) => error,
            );
          assertEqual(causeKind(rejection), "invalid_request");
          assertIncludes(causeMessage(rejection) ?? "", 'question "v"');
        }
        assertEqual(sent.length, 0, "a refused question reached Laya's wire");
      },
    );
  });

  await test("XOR sends a value question as given and a choice's unknown only when it is true", async () => {
    const body = sentBody(
      await xorOutcome({
        questions: {
          amount: {
            type: "value",
            instructions: "Invoice amount?",
            dtype: "float",
            pattern: "[0-9.]{1,10}",
          },
          on: choice(2, true),
          off: choice(2, false),
        },
      }),
    );
    assert(
      sameJson(body.questions, {
        amount: {
          type: "value",
          instructions: "Invoice amount?",
          dtype: "float",
          pattern: "[0-9.]{1,10}",
        },
        on: { ...choice(2), unknown: true },
        off: choice(2),
      }),
      "the questions on the wire are not the ones asked",
    );
  });

  await test("a value question whose pattern does not compile is not a question", async () => {
    const { isDecisionQuestion } =
      await import("../dist/utils/decisionAnswers.js");
    const value = (pattern: string): unknown => ({
      type: "value",
      instructions: "Invoice amount?",
      pattern,
    });
    assert(isDecisionQuestion(value("[0-9.]{1,10}")), "a valid pattern");
    assert(!isDecisionQuestion(value("[0-9")), "an unclosed class");
    assert(!isDecisionQuestion(value("(a")), "an unclosed group");
    assert(!isDecisionQuestion(value("")), "an empty pattern");
  });

  await test("XOR refuses what it cannot read before any request: a second image, a video, 129 questions, an 11-level score", async () => {
    const png = fixtureBytes("red.png");
    refusal(await xorOutcome({ images: [png, png] }), "at most 1 images");
    refusal(
      await xorOutcome({ model: "xor-omni", video: fixtureBytes("red.mp4") }),
      "does not accept video",
    );
    const many = await xorOutcome({
      questions: Object.fromEntries(
        Array.from({ length: 129 }, (_, i) => [
          `q${i}`,
          { type: "boolean", instructions: `Statement ${i}?` } as const,
        ]),
      ),
    });
    assertEqual(refusedOf(many).kind, "max_tokens_exceeded");
    refusal(
      await xorOutcome({
        questions: {
          s: {
            type: "score",
            instructions: "Rate",
            criteria: Array.from({ length: 11 }, (_, i) => String(i)),
          },
        },
      }),
      "at most 10 levels",
    );
    const one = sentBody(await xorOutcome({ images: [png] }));
    assert(Array.isArray(one.images) && one.images.length === 1, "one image");
  });

  await test("audio goes out as { data, format } under the audio key, state and all, and counts toward mediaBytes", async () => {
    const wav = wavBytes(1);
    const body = sentBody(await xorOutcome({ state: "", audio: wav }));
    assert(
      sameJson(Object.keys(body), ["model", "state", "questions", "audio"]),
      "the body keys are not model, state, questions, audio",
    );
    assert(
      sameJson(body.audio, { data: wav.toString("base64"), format: "wav" }),
      "the audio is not the clip's base64 and its format",
    );
    assertEqual(body.state, "", "an empty state was not kept");
    for (const [bytes, format] of [
      [flacBytes(2), "flac"],
      [OGG_BYTES, "ogg"],
      [MP3_BYTES, "mp3"],
    ] as const) {
      const sent = sentBody(await xorOutcome({ audio: bytes }));
      assertEqual(
        (sent.audio as { format?: string } | undefined)?.format,
        format,
        `${format} was not sniffed`,
      );
    }
    const asUrl = sentBody(
      await xorOutcome({
        audio: `data:audio/wav;base64,${wav.toString("base64")}`,
      }),
    );
    assert(
      sameJson(asUrl.audio, { data: wav.toString("base64"), format: "wav" }),
      "a data: URL clip did not go out as the same bytes",
    );
    await withFetchStub(
      () =>
        new Response(VALUE_ANSWER, {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      async () => {
        const provider = await make(
          { apiKey: "k-1", baseURL: "https://xor.test" },
          { entry: SHIPPED_XOR },
        );
        const result = await provider.decide({
          state: "",
          questions: { q: { type: "boolean", instructions: "Speaking?" } },
          audio: wav,
        });
        assertEqual(result.mediaBytes, wav.toString("base64").length);
      },
    );
  });

  await test("audio the model would not hear in full, or cannot decode, is refused before any request", async () => {
    refusal(await xorOutcome({ audio: M4A_BYTES }), "AAC or M4A");
    refusal(
      await xorOutcome({ audio: Buffer.from([0xff, 0xf1, 0x50, 0x80]) }),
      "AAC or M4A",
    );
    refusal(await xorOutcome({ audio: wavBytes(31) }), "runs 31.0 seconds");
    refusal(await xorOutcome({ audio: flacBytes(45) }), "runs 45.0 seconds");
    refusal(
      await xorOutcome({ audio: oggBytes("opus", 31) }),
      "runs 31.0 seconds",
    );
    refusal(
      await xorOutcome({ audio: oggBytes("vorbis", 40, 44100) }),
      "runs 40.0 seconds",
    );
    for (const ogg of [oggBytes("opus", 29), oggBytes("vorbis", 29, 16000)]) {
      assertEqual(
        (
          sentBody(await xorOutcome({ audio: ogg })).audio as {
            format?: string;
          }
        )?.format,
        "ogg",
        "an Ogg clip inside 30 seconds must go out",
      );
    }
    refusal(
      await xorOutcome({ audio: Buffer.from("not audio at all") }),
      "not a recognised audio format",
    );
    refusal(
      await xorOutcome({ audio: wavBytes(1).subarray(0, 36) }),
      "without a complete fmt and data chunk",
    );
    refusal(
      await xorOutcome({ audio: "data:image/png;base64,AAAA" }),
      "not base64 audio content",
    );
    refusal(
      await xorOutcome({ audio: "https://example.test/a.wav" }),
      "remote URL",
    );
    // 30 seconds exactly is heard in full.
    sentBody(await xorOutcome({ audio: wavBytes(30) }));
    await withFetchStub(
      () => new Response(VALUE_ANSWER),
      async (sent) => {
        const laya = await make(GOOD);
        const rejection = await laya
          .decide({
            state: "",
            questions: { q: { type: "boolean", instructions: "x" } },
            audio: wavBytes(1),
          })
          .then(
            () => undefined,
            (error: unknown) => error,
          );
        assertEqual(causeKind(rejection), "invalid_request");
        assertIncludes(causeMessage(rejection) ?? "", "does not accept audio");
        assertEqual(sent.length, 0, "audio reached Laya's wire");
      },
    );
  });

  await test("value answers parse with their null and unknown; a legend of numbers or objects is kept as text; a choice keeps unknown", async () => {
    const dialect = getDecisionDialect("system-one");
    const reading = dialect.readAnswers(
      {
        answers: {
          amount: { type: "value", value: 18275.5, confidence: 0.99 },
          ref: { type: "value", value: "INV-2024-0892", confidence: 1 },
          phone: {
            type: "value",
            value: null,
            confidence: 0.82,
            unknown: true,
          },
          broken: { type: "value", value: { a: 1 }, confidence: 0.5 },
          numbers: {
            type: "score",
            score: 2.02,
            legend: { "0": 1, "1": 2, "2": 3 },
            probabilities: { "0": 0.01, "1": 0.02, "2": 0.97 },
            confidence: 0.9,
          },
          objects: {
            type: "score",
            score: 0.97,
            legend: { "0": { label: "bad" }, "1": ["good"] },
            probabilities: { "0": 0.03, "1": 0.97 },
            confidence: 0.82,
          },
          intent: {
            type: "choice",
            choice: "unknown",
            probabilities: { upgrade: 0.003, unknown: 0.997 },
            confidence: 0.96,
            unknown: true,
          },
        },
      },
      {},
      {},
    );
    assertNotNull(reading, "no reading");
    assert(
      sameJson(reading.answers.amount, {
        type: "value",
        value: 18275.5,
        confidence: 0.99,
      }),
      "a number value was not read",
    );
    assertEqual(
      reading.answers.ref?.type === "value" && reading.answers.ref.value,
      "INV-2024-0892",
    );
    assert(
      sameJson(reading.answers.phone, {
        type: "value",
        value: null,
        confidence: 0.82,
        unknown: true,
      }),
      "an abstained value lost its null or its unknown",
    );
    assert(
      sameJson(reading.dropped, ["broken"]),
      "only the object-valued answer should be dropped",
    );
    assert(
      reading.answers.numbers?.type === "score" &&
        sameJson(reading.answers.numbers.legend, {
          "0": "1",
          "1": "2",
          "2": "3",
        }),
      "a number legend was not kept as text",
    );
    assert(
      reading.answers.objects?.type === "score" &&
        sameJson(reading.answers.objects.legend, {
          "0": '{"label":"bad"}',
          "1": '["good"]',
        }),
      "an object legend was not kept as JSON text",
    );
    assert(
      reading.answers.intent?.type === "choice" &&
        reading.answers.intent.unknown === true,
      "a choice lost its unknown flag",
    );
  });

  await test("a LiteLLM gateway's error text loses the quoted request and its fallback table", async () => {
    const pydantic =
      "litellm.BadRequestError: Invalid Decisions request: 1 validation error\nquestions.s.score.criteria.0.str\n  Input should be a valid string [type=string_type, input_value={'state': 'SECRET STATE', 'q': 1}, input_type=dict]\n  more [type=x, input_value='cut off";
    const cleaned = redactCredentials(pydantic, "");
    assert(!cleaned.includes("SECRET"), "the quoted state survived");
    assertIncludes(cleaned, "input_value=[redacted], input_type=dict]");
    assert(
      !cleaned.includes("cut off"),
      "a quoted value without input_type survived",
    );
    const bracketed = redactCredentials(
      "1 validation error\n  bad [type=x, input_value={'state': 'acct [A] secret-ssn 123-45-6789",
      "",
    );
    assert(
      !bracketed.includes("secret-ssn"),
      "a cut-short value lost only its text before a bracket",
    );
    const delimited = redactCredentials(
      "1 validation error\n  bad [type=x, input_value={'state': 'a, input_type=str] secret-pan 4111', 'q': 1}, input_type=dict]",
      "",
    );
    assert(
      !delimited.includes("secret-pan"),
      "a value holding its own input_type text survived past it",
    );
    assertIncludes(delimited, "input_value=[redacted], input_type=dict]");
    const multiline = redactCredentials(
      "1 validation error\n  bad [type=x, input_value='line one\nsecret-dob 1990-01-01",
      "",
    );
    assert(
      !multiline.includes("secret-dob"),
      "a cut-short value lost only its first line",
    );
    const routed =
      'Decisions upstream returned HTTP 422: {"error": "c: 2..64 options, got 65"}. Received Model Group=xor-latest\nAvailable Model Group Fallbacks=[\'xor-omni\']';
    assertEqual(
      redactCredentials(routed, ""),
      'Decisions upstream returned HTTP 422: {"error": "c: 2..64 options, got 65"}',
    );
    const unrouted =
      "upstream returned HTTP 422: {\"error\": \"images supports at most 1 items\"}No fallback model group found for original model_group=xor-omni. Fallbacks=[{'a': ['b']}]";
    assertEqual(
      redactCredentials(unrouted, ""),
      'upstream returned HTTP 422: {"error": "images supports at most 1 items"}',
    );
  });

  await test("the shipped xor.json: a 502 wrapping a backend 4xx is a final invalid_request, an over-long state is max_tokens_exceeded, a bare 502 is retried", async () => {
    const classify = (message: string): DecisionError =>
      classifyDecisionError(SHIPPED_XOR.decide.errors, {
        status: 502,
        payload: { error: { message } },
        requestId: undefined,
        label: "XOR",
        apiKey: "k-1",
      });
    const media = classify(
      'litellm.APIError: Decisions upstream returned HTTP 502: {"error": "backend 400: {\\"error\\":{\\"message\\":\\"Invalid or unsupported audio file.\\"}}"}',
    );
    assertEqual(media.kind, "invalid_request");
    assertEqual(media.retryable, false);
    const long = classify(
      "litellm.APIError: Decisions upstream returned HTTP 502: backend 400: This model's maximum context length is 32768 tokens.",
    );
    assertEqual(long.kind, "max_tokens_exceeded");
    const bare = classify("Bad Gateway");
    assertEqual(bare.kind, "server");
    assertEqual(bare.retryable, true);
  });

  await test("decideMsPerKStateTokens adds to decideMs for every full 1,000 estimated state tokens; an entry without it keeps decideMs", async () => {
    const xor = await make(
      { apiKey: "k-1", baseURL: "https://xor.test" },
      { entry: SHIPPED_XOR },
    );
    assertEqual(xor.call("defaultTimeoutMs", 1, 0), 5000);
    assertEqual(xor.call("defaultTimeoutMs", 1, 100_000), 20_000);
    assertEqual(xor.call("defaultTimeoutMs", 1, 999), 5000);
    assertEqual(xor.call("defaultTimeoutMs", 1, 1999), 5150);
    const laya = await make(GOOD);
    assertEqual(laya.call("defaultTimeoutMs", 1, 100_000), 5000);
  });

  await test("the base class reads decideMsPerKStateTokens from the registered descriptor, for any provider", async () => {
    const registry = PROVIDER_DESCRIPTORS_BY_NAME as Map<
      string,
      ProviderDescriptor
    >;
    const shipped = registry.get("laya");
    assertNotNull(shipped, "Laya is not registered");
    registry.set("laya", {
      ...shipped,
      timeouts: { decideMs: 4000, decideMsPerKStateTokens: 100 },
    });
    try {
      const laya = await make(GOOD);
      assertEqual(laya.call("defaultTimeoutMs", 1, 2500), 4200);
    } finally {
      registry.set("laya", shipped);
    }
  });

  await test("capableModel: with no model chosen, media or a value question goes to xor-omni and is checked against its window", async () => {
    // resolveRequestModel reads XOR_MODEL at decide time, after make()'s
    // withEnv has put the developer's .env back.
    const ambient = process.env.XOR_MODEL;
    delete process.env.XOR_MODEL;
    try {
      const value = {
        v: { type: "value", instructions: "Invoice amount?" } as const,
      };
      const modelOf = async (
        extra: Partial<DecisionRequest>,
      ): Promise<unknown> => sentBody(await xorOutcome(extra)).model;
      assertEqual(await modelOf({}), "xor-latest", "a plain request");
      assertEqual(await modelOf({ questions: value }), "xor-omni", "value");
      assertEqual(
        await modelOf({ images: [fixtureBytes("red.png")] }),
        "xor-omni",
        "an image",
      );
      assertEqual(
        await modelOf({ state: "", audio: wavBytes(1) }),
        "xor-omni",
        "audio",
      );
      assertEqual(
        await modelOf({ questions: { c: choice(2, true) } }),
        "xor-latest",
        "choice-unknown is read by xor-latest itself",
      );
      // A model somebody chose is the one sent.
      assertEqual(
        await modelOf({ model: "xor-latest", questions: value }),
        "xor-latest",
        "a model named in the call",
      );
      const previous = process.env.XOR_MODEL;
      process.env.XOR_MODEL = "xor-latest";
      try {
        assertEqual(
          await modelOf({ questions: value }),
          "xor-latest",
          "a model set by XOR_MODEL",
        );
      } finally {
        if (previous === undefined) {
          delete process.env.XOR_MODEL;
        } else {
          process.env.XOR_MODEL = previous;
        }
      }
      // ~40,000 estimated tokens: inside xor-latest's window, past xor-omni's.
      const long = "word ".repeat(32_000);
      const refused = refusedOf(
        await xorOutcome({ state: long, questions: value }),
      );
      assertEqual(refused.kind, "max_tokens_exceeded");
      assertIncludes(refused.message, "xor-omni");
      sentBody(await xorOutcome({ state: long }));
    } finally {
      if (ambient !== undefined) {
        process.env.XOR_MODEL = ambient;
      }
    }
  });
}

async function systemOneBodySection(): Promise<void> {
  logSection("system-one dialect: buildBody");
  const { getDecisionDialect } =
    await import("../dist/providers/decide/dialects/index.js");
  const { systemOneDialect } =
    await import("../dist/providers/decide/dialects/systemOne.js");
  const questions = { q: { type: "noul", instructions: "Is this urgent?" } };
  const core = `"state":"payouts have failed","questions":{"q":{"type":"noul","instructions":"Is this urgent?"}}`;
  const build = (input: Partial<DecisionDialectBody>): string =>
    JSON.stringify(
      systemOneDialect.buildBody({
        state: "payouts have failed",
        questions,
        ...input,
      }),
    );
  const keys = { imagesKey: "images", videoKey: "video" };
  const media = (
    over: Partial<DecisionPreparedMedia> = {},
  ): DecisionPreparedMedia => ({ images: [], bytes: 0, ...over });

  await test("the registry hands out the one system-one dialect, and it builds bodies", async () => {
    assert(
      getDecisionDialect("system-one") === systemOneDialect,
      "the registry returned another object",
    );
    assertEqual(typeof systemOneDialect.buildBody, "function");
  });

  await test("a model is written first, an empty one included, and none is written when none is given", async () => {
    assertEqual(
      build({ model: "typed-decisions" }),
      `{"model":"typed-decisions",${core}}`,
    );
    assertEqual(build({ model: "" }), `{"model":"",${core}}`);
    assertEqual(build({}), `{${core}}`);
  });

  await test("state and questions are carried by reference, and key order is model, state, questions", async () => {
    const state = { nested: { a: 1 } };
    const body = systemOneDialect.buildBody({
      model: "m",
      state,
      questions,
    });
    assert(body.state === state, "the state was copied");
    assert(body.questions === questions, "the questions were copied");
    assert(
      sameJson(Object.keys(body), ["model", "state", "questions"]),
      "the key order changed",
    );
  });

  await test("media keys write nothing for a request with no media", async () => {
    const bare = `{"model":"m",${core}}`;
    assertEqual(build({ model: "m", mediaKeys: keys }), bare);
    assertEqual(build({ model: "m", mediaKeys: keys, media: media() }), bare);
    // Media without keys is what Laya has: it can never reach the wire.
    assertEqual(
      build({
        model: "m",
        media: media({ images: [IMAGE_URL], video: VIDEO_URL, bytes: 1 }),
      }),
      bare,
    );
  });

  await test("images are written under the images key, video under the video key, images first", async () => {
    const head = `{"model":"m",${core}`;
    const prepared = (over: Partial<DecisionPreparedMedia>) =>
      media({ bytes: 1, ...over });
    assertEqual(
      build({
        model: "m",
        mediaKeys: keys,
        media: prepared({ images: [IMAGE_URL] }),
      }),
      `${head},"images":["${IMAGE_URL}"]}`,
    );
    assertEqual(
      build({
        model: "m",
        mediaKeys: keys,
        media: prepared({ images: [IMAGE_URL, IMAGE_URL] }),
      }),
      `${head},"images":["${IMAGE_URL}","${IMAGE_URL}"]}`,
    );
    assertEqual(
      build({
        model: "m",
        mediaKeys: keys,
        media: prepared({ video: VIDEO_URL }),
      }),
      `${head},"video":"${VIDEO_URL}"}`,
    );
    assertEqual(
      build({
        model: "m",
        mediaKeys: keys,
        media: prepared({ images: [IMAGE_URL], video: VIDEO_URL }),
      }),
      `${head},"images":["${IMAGE_URL}"],"video":"${VIDEO_URL}"}`,
    );
  });

  await test("a video is dropped when the entry names no video key, and the key names are the entry's own", async () => {
    const prepared = media({
      images: [IMAGE_URL],
      video: VIDEO_URL,
      bytes: 1,
    });
    assertEqual(
      build({
        model: "m",
        mediaKeys: { imagesKey: "images" },
        media: prepared,
      }),
      `{"model":"m",${core},"images":["${IMAGE_URL}"]}`,
    );
    assertEqual(
      build({
        model: "m",
        mediaKeys: { imagesKey: "pictures", videoKey: "clip" },
        media: prepared,
      }),
      `{"model":"m",${core},"pictures":["${IMAGE_URL}"],"clip":"${VIDEO_URL}"}`,
    );
  });
}

// The raw string the stub received, for a byte-for-byte comparison.
async function wireBodyFor(
  entry: DecideCatalogJson,
  extra: Partial<DecisionRequest>,
): Promise<string> {
  return withXorAllowance(() => wireStringOf(entry, extra));
}

async function wireStringOf(
  entry: DecideCatalogJson,
  extra: Partial<DecisionRequest>,
): Promise<string> {
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
      return sent[0]?.body ?? "";
    },
  );
}

async function systemOneWireSection(): Promise<void> {
  logSection("ConfiguredDecisionProvider: System One bytes on the wire");
  const core = `"state":"payouts have failed","questions":{"q":{"type":"noul","instructions":"Is this urgent?"}}`;
  const withModel = (
    model: DecideCatalogJson["decide"]["model"],
  ): DecideCatalogJson => ({
    ...LAYA_ENTRY,
    decide: { ...LAYA_ENTRY.decide, model },
  });

  await test("placement body sends the model first, whatever it is", async () => {
    const entry = withModel({ placement: "body", alias: "auto" });
    assertEqual(
      await wireBodyFor(entry, { model: "typed-decisions" }),
      `{"model":"typed-decisions",${core}}`,
    );
    assertEqual(
      await wireBodyFor(entry, { model: "auto" }),
      `{"model":"auto",${core}}`,
    );
  });

  await test("body-unless-alias leaves the model out for the alias only", async () => {
    const entry = withModel({ placement: "body-unless-alias", alias: "auto" });
    assertEqual(await wireBodyFor(entry, { model: "auto" }), `{${core}}`);
    assertEqual(
      await wireBodyFor(entry, { model: "english" }),
      `{"model":"english",${core}}`,
    );
  });

  await test("body-unless-alias with no alias configured always sends the model", async () => {
    const entry = withModel({ placement: "body-unless-alias" });
    assertEqual(
      await wireBodyFor(entry, { model: "auto" }),
      `{"model":"auto",${core}}`,
    );
  });

  await test("an entry with media keys writes images and video exactly as XOR's wire does", async () => {
    const png = fixtureBytes("red.png");
    const mp4 = fixtureBytes("red.mp4");
    const pngUrl = asDataUrl("image/png", png);
    const mp4Url = asDataUrl("video/mp4", mp4);
    const head = `{"model":"typed-decisions",${core}`;
    assertEqual(await wireBodyFor(MEDIA_ENTRY, {}), `${head}}`, "none");
    assertEqual(
      await wireBodyFor(MEDIA_ENTRY, { images: [png] }),
      `${head},"images":[${JSON.stringify(pngUrl)}]}`,
      "images",
    );
    assertEqual(
      await wireBodyFor(MEDIA_ENTRY, { video: mp4 }),
      `${head},"video":${JSON.stringify(mp4Url)}}`,
      "video",
    );
    assertEqual(
      await wireBodyFor(MEDIA_ENTRY, { images: [png, png], video: mp4 }),
      `${head},"images":[${JSON.stringify(pngUrl)},${JSON.stringify(pngUrl)}],"video":${JSON.stringify(mp4Url)}}`,
      "both",
    );
  });
}

// The class under test with its dialect replaced, to watch what the base
// class hands the dialect and what it does with the reading.
async function spiedProvider(dialect: DecisionDialect) {
  const Probe = await loadProbe();
  class Spied extends Probe {
    protected override dialect(): DecisionDialect {
      return dialect;
    }
  }
  return withEnv({}, () => new Spied(LAYA_ENTRY, undefined, undefined, GOOD));
}

async function dialectPlumbingSection(): Promise<void> {
  logSection(
    "SystemOneDecisionProvider: what the dialect is given and returns",
  );
  const { systemOneDialect } =
    await import("../dist/providers/decide/dialects/systemOne.js");
  const { logger } = await import("../dist/utils/logger.js");
  const questions: DecisionQuestionMap = {
    q: { type: "boolean", instructions: "Is this urgent?" },
    r: { type: "boolean", instructions: "Is this a refund?" },
  };
  const request: DecisionRequest = {
    state: "payouts have failed",
    questions,
    model: "typed-decisions",
  };
  const reply = (): Response =>
    new Response(
      JSON.stringify({
        model: "typed-decisions",
        answers: {
          q: { type: "noul", noul: 0.9 },
          r: { type: "noul", noul: 0.1 },
        },
        usage: { input_tokens: 4, output_tokens: 0 },
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  const warnings = (): string[] =>
    logger.getLogs("warn").map((line) => line.message);

  await test("readAnswers is given the request's own question map as its third argument", async () => {
    const seen: unknown[] = [];
    const provider = await spiedProvider({
      ...systemOneDialect,
      readAnswers: (decoded, reported, asked) => {
        seen.push(asked);
        return systemOneDialect.readAnswers(decoded, reported, asked);
      },
    });
    await withFetchStub(reply, async (sent) => {
      const result = await provider.decide(request);
      assertEqual(sent.length, 1, "the request did not reach the stub");
      assertEqual(seen.length, 1, "readAnswers ran once");
      assert(seen[0] === questions, "the dialect was given another object");
      assertEqual(Object.keys(result.answers).length, 2);
    });
  });

  await test("a refused id is logged as declined, the answer stays absent, and it is not called unparseable", async () => {
    const provider = await spiedProvider({
      ...systemOneDialect,
      readAnswers: () => ({
        answers: {
          r: { type: "boolean", probability: 0.1 },
        },
        dropped: [],
        refused: ["q"],
      }),
    });
    logger.clearLogs();
    try {
      // The logger drops warnings unless NEUROLINK_DEBUG is "true".
      await withEnv({ NEUROLINK_DEBUG: "true" }, () =>
        withFetchStub(reply, async () => {
          const result = await provider.decide(request);
          assertEqual(
            Object.keys(result.answers).join(","),
            "r",
            "only the answered question is present",
          );
        }),
      );
      assert(
        warnings().includes('Laya: the model declined to answer "q"'),
        "the refusal was not logged by name",
      );
      assert(
        !warnings().some((line) => line.includes("dropped unparseable")),
        "a refusal was logged as unparseable",
      );
    } finally {
      logger.clearLogs();
    }
  });

  await test("a dropped id keeps its own log line, and an ordinary reading logs no refusal", async () => {
    const provider = await spiedProvider({
      ...systemOneDialect,
      readAnswers: () => ({ answers: {}, dropped: ["q"] }),
    });
    logger.clearLogs();
    try {
      await withEnv({ NEUROLINK_DEBUG: "true" }, () =>
        withFetchStub(reply, async () => {
          await provider.decide(request);
        }),
      );
      assert(
        warnings().includes('Laya: dropped unparseable answer "q"'),
        "the dropped line changed",
      );
      assert(
        !warnings().some((line) => line.includes("declined")),
        "a refusal was logged without one",
      );
    } finally {
      logger.clearLogs();
    }
  });
}

// Questions and answers are OpenAI's own guide examples, so the cases below
// can be read against that page.
const DEPARTMENT_RUBRIC = {
  billing: "Payments, invoices, and refunds.",
  technical: "Problems using the product.",
  shipping: "Delivery and tracking.",
  other: "Requests outside these categories.",
} as const;
const SEVERITY_RUBRIC = [
  "Appearance only; no lost functionality.",
  "A task fails, but another way works.",
  "A task fails with no workaround.",
] as const;
const GUIDE_QUESTIONS: DecisionQuestionMap = {
  visible_damage: {
    type: "boolean",
    instructions: "Does the product have visible damage?",
  },
  department: {
    type: "choice",
    instructions: "Which department should handle this complaint?",
    criteria: DEPARTMENT_RUBRIC,
  },
  severity: {
    type: "score",
    instructions: "How severe is this issue?",
    criteria: SEVERITY_RUBRIC,
  },
};
const GUIDE_PREDICATE = {
  type: "predicate",
  name: "visible_damage",
  probability: 0.92,
};
const GUIDE_CHOICE = {
  type: "choice",
  name: "department",
  choice: "billing",
  probabilities: [
    { value: "billing", probability: 0.95 },
    { value: "technical", probability: 0.02 },
    { value: "shipping", probability: 0.01 },
    { value: "other", probability: 0.02 },
  ],
  confidence: 0.93,
};
const GUIDE_SCORE = {
  type: "score",
  name: "severity",
  score: 1.1,
  probabilities: [
    { value: 0, label: "Cosmetic", probability: 0.1 },
    { value: 1, label: "Workaround available", probability: 0.7 },
    { value: 2, label: "Fully blocked", probability: 0.2 },
  ],
  confidence: 0.55,
};

async function openaiDecisionsEncodeSection(): Promise<void> {
  logSection("openai-decisions dialect: questions and body");
  const { getDecisionDialect } =
    await import("../dist/providers/decide/dialects/index.js");
  const { openaiDecisionsDialect } =
    await import("../dist/providers/decide/dialects/openaiDecisions.js");
  const dialect = getDecisionDialect("openai-decisions");
  const encode = (question: DecisionQuestion): unknown =>
    dialect.encodeQuestion(question);
  const wire = (
    questions: DecisionQuestionMap,
  ): Record<string, Record<string, unknown>> =>
    Object.fromEntries(
      Object.entries(questions).map(([id, question]) => [
        id,
        dialect.encodeQuestion(question),
      ]),
    );
  const bodyFor = (
    state: DecisionDialectBody["state"],
    questions: DecisionQuestionMap,
    over: Partial<DecisionDialectBody> = {},
  ): string =>
    JSON.stringify(
      dialect.buildBody({
        state,
        questions: wire(questions),
        model: "gpt-6-luna",
        ...over,
      }),
    );
  const damage: DecisionQuestion = {
    type: "boolean",
    instructions: "Does the product have visible damage?",
  };

  await test("the registry returns the module's dialect under its own name", async () => {
    assert(dialect === openaiDecisionsDialect, "another object came back");
    assertEqual(dialect.name, "openai-decisions");
  });

  await test("a boolean question is a predicate, and each side joins the instructions in fixed words", async () => {
    const q = "Does the product have visible damage?";
    assertBytes(
      encode(damage),
      { type: "predicate", instructions: q },
      "no criteria",
    );
    assertBytes(
      encode({ ...damage, criteria: {} }),
      { type: "predicate", instructions: q },
      "empty criteria",
    );
    assertBytes(
      encode({ ...damage, criteria: { true: "a crack or a dent" } }),
      {
        type: "predicate",
        instructions: `${q}\n\nAnswer true when: a crack or a dent`,
      },
      "true side",
    );
    assertBytes(
      encode({ ...damage, criteria: { false: "only a shadow" } }),
      {
        type: "predicate",
        instructions: `${q}\nAnswer false when: only a shadow`,
      },
      "false side",
    );
    assertBytes(
      encode({
        ...damage,
        criteria: { true: "a crack or a dent", false: "only a shadow" },
      }),
      {
        type: "predicate",
        instructions: `${q}\n\nAnswer true when: a crack or a dent\nAnswer false when: only a shadow`,
      },
      "both sides",
    );
    assertBytes(
      encode({ ...damage, criteria: { true: null, false: "only a shadow" } }),
      {
        type: "predicate",
        instructions: `${q}\nAnswer false when: only a shadow`,
      },
      "a null side is absent",
    );
  });

  await test("anything that is not a string is sent as its JSON text, in instructions and rubrics", async () => {
    assertBytes(
      encode({ type: "boolean", instructions: { check: ["crack", "dent"] } }),
      { type: "predicate", instructions: '{"check":["crack","dent"]}' },
      "object instructions",
    );
    assertBytes(
      encode({ type: "boolean", instructions: 5 }),
      { type: "predicate", instructions: "5" },
      "number instructions",
    );
    assertBytes(
      encode({ ...damage, criteria: { true: { kind: "crack" }, false: 0 } }),
      {
        type: "predicate",
        instructions:
          'Does the product have visible damage?\n\nAnswer true when: {"kind":"crack"}\nAnswer false when: 0',
      },
      "criteria",
    );
    // A string is sent as it is, not as a JSON string literal.
    assertBytes(
      encode({ type: "boolean", instructions: 'say "hi"\n' }),
      { type: "predicate", instructions: 'say "hi"\n' },
      "string instructions",
    );
  });

  await test("a choice question lists its options in the order given, with a description unless it is null", async () => {
    assertBytes(
      encode(GUIDE_QUESTIONS.department as DecisionQuestion),
      {
        type: "choice",
        instructions: "Which department should handle this complaint?",
        choices: [
          { value: "billing", description: DEPARTMENT_RUBRIC.billing },
          { value: "technical", description: DEPARTMENT_RUBRIC.technical },
          { value: "shipping", description: DEPARTMENT_RUBRIC.shipping },
          { value: "other", description: DEPARTMENT_RUBRIC.other },
        ],
      },
      "guide choice",
    );
    assertBytes(
      encode({
        type: "choice",
        instructions: "Which?",
        criteria: { zeta: "z", alpha: null, mid: { note: "m" } },
      }),
      {
        type: "choice",
        instructions: "Which?",
        choices: [
          { value: "zeta", description: "z" },
          { value: "alpha" },
          { value: "mid", description: '{"note":"m"}' },
        ],
      },
      "order, null and object",
    );
  });

  await test("a score question numbers its levels from 0 as labels and carries the rubric as the description", async () => {
    assertBytes(
      encode(GUIDE_QUESTIONS.severity as DecisionQuestion),
      {
        type: "score",
        instructions: "How severe is this issue?",
        levels: [
          { label: "0", description: SEVERITY_RUBRIC[0] },
          { label: "1", description: SEVERITY_RUBRIC[1] },
          { label: "2", description: SEVERITY_RUBRIC[2] },
        ],
      },
      "guide score",
    );
    assertBytes(
      encode({
        type: "score",
        instructions: "Rate",
        criteria: ["low", null, { tier: 3 }],
      }),
      {
        type: "score",
        instructions: "Rate",
        levels: [
          { label: "0", description: "low" },
          { label: "1" },
          { label: "2", description: '{"tier":3}' },
        ],
      },
      "null and object levels",
    );
  });

  await test("text-only evidence goes out as the input string, with the model and named questions", async () => {
    assertEqual(
      bodyFor("I was charged twice for my order.", {
        department: GUIDE_QUESTIONS.department as DecisionQuestion,
      }),
      `{"model":"gpt-6-luna","input":"I was charged twice for my order.","questions":[{"type":"choice","instructions":"Which department should handle this complaint?","choices":[{"value":"billing","description":"Payments, invoices, and refunds."},{"value":"technical","description":"Problems using the product."},{"value":"shipping","description":"Delivery and tracking."},{"value":"other","description":"Requests outside these categories."}],"name":"department"}]}`,
      "the choice request differs from the guide's, by key order aside",
    );
  });

  await test("questions go out in the order given, each named by its id, and the encoded questions are not changed", async () => {
    const encoded = wire(GUIDE_QUESTIONS);
    const body = dialect.buildBody({
      state: "s",
      questions: encoded,
      model: "m",
    });
    const sent: unknown = body.questions;
    if (!Array.isArray(sent)) {
      throw new Error("questions is not an array");
    }
    assertBytes(
      sent.map((question: { name?: string; type?: string }) => [
        question.name,
        question.type,
      ]),
      [
        ["visible_damage", "predicate"],
        ["department", "choice"],
        ["severity", "score"],
      ],
      "names and types",
    );
    for (const question of Object.values(encoded)) {
      assert(!("name" in question), "an encoded question gained a name");
    }
  });

  await test("two images follow the text in one user message, as data URLs and with no detail key", async () => {
    const second = "data:image/png;base64,CCCC";
    assertEqual(
      bodyFor(
        "Inspect the product in this photo.",
        { visible_damage: damage },
        { media: { images: [IMAGE_URL, second], bytes: 40 } },
      ),
      `{"model":"gpt-6-luna","input":[{"role":"user","content":[{"type":"input_text","text":"Inspect the product in this photo."},{"type":"input_image","image_url":"${IMAGE_URL}"},{"type":"input_image","image_url":"${second}"}]}],"questions":[{"type":"predicate","instructions":"Does the product have visible damage?","name":"visible_damage"}]}`,
      "two images",
    );
  });

  await test("an empty state with an image sends no text part", async () => {
    assertEqual(
      bodyFor(
        "",
        { visible_damage: damage },
        { media: { images: [IMAGE_URL], bytes: 20 } },
      ),
      `{"model":"gpt-6-luna","input":[{"role":"user","content":[{"type":"input_image","image_url":"${IMAGE_URL}"}]}],"questions":[{"type":"predicate","instructions":"Does the product have visible damage?","name":"visible_damage"}]}`,
      "empty state",
    );
    // Whitespace is text, not nothing.
    assert(
      bodyFor(
        " ",
        { visible_damage: damage },
        { media: { images: [IMAGE_URL], bytes: 20 } },
      ).includes('{"type":"input_text","text":" "}'),
      "a whitespace state lost its text part",
    );
  });

  await test("a state that is not a string goes out as its JSON text, a string as it is", async () => {
    const input = (state: DecisionDialectBody["state"]): unknown =>
      dialect.buildBody({
        state,
        questions: wire({ visible_damage: damage }),
        model: "m",
      }).input;
    assertEqual(
      input({ ticket: 7, tags: ["a", "b"] }),
      '{"ticket":7,"tags":["a","b"]}',
    );
    assertEqual(input(["a", { b: 1 }]), '["a",{"b":1}]');
    assertEqual(input(42), "42");
    assertEqual(input(false), "false");
    assertEqual(input('say "hi"\n'), 'say "hi"\n');
    assertEqual(input(""), "");
  });

  await test("no images means the input string, whatever the media holds, and a video is never sent", async () => {
    const quiet = { visible_damage: damage };
    const plain = bodyFor("evidence", quiet);
    assertEqual(
      bodyFor("evidence", quiet, { media: { images: [], bytes: 0 } }),
      plain,
      "empty images",
    );
    assertEqual(
      bodyFor("evidence", quiet, {
        media: { images: [], video: VIDEO_URL, bytes: 9 },
      }),
      plain,
      "video only",
    );
    const both = bodyFor("evidence", quiet, {
      media: { images: [IMAGE_URL], video: VIDEO_URL, bytes: 9 },
    });
    assert(!both.includes(VIDEO_URL), "a video reached the body");
    assert(both.includes(IMAGE_URL), "the image is missing: not a test");
  });

  await test("media keys are the System One layout's, and play no part here", async () => {
    const body = dialect.buildBody({
      state: "evidence",
      questions: wire({ visible_damage: damage }),
      model: "m",
      media: { images: [IMAGE_URL], bytes: 1 },
      mediaKeys: { imagesKey: "images", videoKey: "video" },
    });
    assert(
      sameJson(Object.keys(body), ["model", "input", "questions"]),
      "the body carries a key other than model, input and questions",
    );
  });

  await test("the model key is written when there is one, an empty string included", async () => {
    const quiet = { visible_damage: damage };
    assertEqual(
      bodyFor("e", quiet, { model: undefined }),
      '{"input":"e","questions":[{"type":"predicate","instructions":"Does the product have visible damage?","name":"visible_damage"}]}',
      "no model",
    );
    assert(
      bodyFor("e", quiet, { model: "" }).startsWith('{"model":"","input"'),
      "an empty model was dropped",
    );
  });

  await test("77 and 151 generated options are sent complete and in the order given", async () => {
    for (const count of [77, 151]) {
      const keys = Array.from(
        { length: count },
        (_, i) => `option-${String(i + 1).padStart(3, "0")}`,
      );
      const question: DecisionQuestion = {
        type: "choice",
        instructions: "Which?",
        criteria: Object.fromEntries(
          keys.map((key) => [key, `when ${key} applies`]),
        ),
      };
      const choices: unknown = dialect.encodeQuestion(question).choices;
      if (!Array.isArray(choices)) {
        throw new Error("choices is not an array");
      }
      assertEqual(choices.length, count, `${count} options: the count`);
      assertBytes(
        choices,
        keys.map((key) => ({ value: key, description: `when ${key} applies` })),
        `${count} options: the order and text`,
      );
      const sent = JSON.parse(bodyFor("s", { q: question }));
      assertBytes(
        sent.questions[0].choices,
        choices,
        `${count} options: through the body`,
      );
    }
  });
}

type Reading = ReturnType<DecisionDialect["readAnswers"]>;

async function openaiDecisionsReadSection(): Promise<void> {
  logSection("openai-decisions dialect: reading answers");
  const { getDecisionDialect } =
    await import("../dist/providers/decide/dialects/index.js");
  const dialect = getDecisionDialect("openai-decisions");
  const read = (
    answers: unknown,
    asked: DecisionQuestionMap = GUIDE_QUESTIONS,
  ): Reading => dialect.readAnswers({ answers }, {}, asked);
  const keysOf = (reading: Reading): string[] =>
    Object.keys(reading?.answers ?? {});
  const blank = (over: Record<string, unknown>): Record<string, unknown> => ({
    ...over,
  });

  const expectedGuide = {
    answers: {
      visible_damage: { type: "boolean", probability: 0.92 },
      department: {
        type: "choice",
        choice: "billing",
        confidence: 0.93,
        probabilities: {
          billing: 0.95,
          technical: 0.02,
          shipping: 0.01,
          other: 0.02,
        },
      },
      severity: {
        type: "score",
        score: 1.1,
        confidence: 0.55,
        legend: {
          "0": SEVERITY_RUBRIC[0],
          "1": SEVERITY_RUBRIC[1],
          "2": SEVERITY_RUBRIC[2],
        },
        probabilities: { "0": 0.1, "1": 0.7, "2": 0.2 },
      },
    },
    dropped: [],
    refused: [],
  };

  await test("the guide's predicate, choice and score examples read exactly", async () => {
    assertBytes(
      read([GUIDE_PREDICATE, GUIDE_CHOICE, GUIDE_SCORE]),
      expectedGuide,
      "all three",
    );
    // Each alone, in any order: the others stay absent, not dropped.
    assertBytes(
      read([GUIDE_SCORE]),
      {
        answers: { severity: expectedGuide.answers.severity },
        dropped: [],
        refused: [],
      },
      "score alone",
    );
    assertBytes(
      read([GUIDE_CHOICE, GUIDE_PREDICATE, GUIDE_SCORE])?.answers,
      {
        department: expectedGuide.answers.department,
        visible_damage: expectedGuide.answers.visible_damage,
        severity: expectedGuide.answers.severity,
      },
      "order of arrival",
    );
  });

  await test("a question the server did not answer stays absent, and an empty array reads as no answers", async () => {
    const reading = read([GUIDE_PREDICATE]);
    assertBytes(keysOf(reading), ["visible_damage"], "only the answered one");
    assertBytes(reading?.dropped, [], "nothing dropped");
    assertBytes(
      read([]),
      { answers: {}, dropped: [], refused: [] },
      "empty array",
    );
  });

  await test("an answers value that is not an array is no reading at all", async () => {
    assertEqual(dialect.readAnswers({}, {}, GUIDE_QUESTIONS), undefined);
    for (const value of [null, "no", 7, { visible_damage: GUIDE_PREDICATE }]) {
      assertEqual(read(value), undefined, "a non-array answers value");
    }
  });

  await test("an item without a string name, or with a name that was not asked, is dropped by position", async () => {
    const cases: Array<[string, unknown]> = [
      ["null", null],
      ["number", 5],
      ["string", "text"],
      ["array", [GUIDE_PREDICATE]],
      ["no name", blank({ type: "predicate", probability: 0.5 })],
      ["null name", { ...GUIDE_PREDICATE, name: null }],
      ["number name", { ...GUIDE_PREDICATE, name: 3 }],
      ["unasked name", { ...GUIDE_PREDICATE, name: "weather" }],
      ["inherited name", { ...GUIDE_PREDICATE, name: "constructor" }],
      ["prototype name", { ...GUIDE_PREDICATE, name: "__proto__" }],
      ["case differs", { ...GUIDE_PREDICATE, name: "Visible_damage" }],
    ];
    for (const [label, bad] of cases) {
      const reading = read([GUIDE_CHOICE, bad]);
      assertBytes(keysOf(reading), ["department"], `${label}: the rest kept`);
      assertBytes(reading?.dropped, ["#1"], `${label}: dropped by position`);
      assertBytes(reading?.refused, [], `${label}: not a refusal`);
    }
  });

  await test("a name that arrives twice loses every answer under it, once in the dropped list, and the others survive", async () => {
    const again = { ...GUIDE_PREDICATE, probability: 0.1 };
    const twice = read([GUIDE_PREDICATE, GUIDE_CHOICE, again]);
    assertBytes(keysOf(twice), ["department"], "twice");
    assertBytes(twice?.dropped, ["visible_damage"], "twice: listed once");
    const thrice = read([GUIDE_PREDICATE, again, GUIDE_PREDICATE]);
    assertBytes(keysOf(thrice), [], "three times");
    assertBytes(thrice?.dropped, ["visible_damage"], "three times: once");
    const mixed = read([
      GUIDE_PREDICATE,
      { type: "refusal", name: "visible_damage" },
    ]);
    assertBytes(keysOf(mixed), [], "an answer and a refusal");
    assertBytes(mixed?.dropped, ["visible_damage"], "the name is dropped");
    assertBytes(mixed?.refused, [], "and is not also refused");
  });

  await test("a refusal is reported by name and leaves the other answers, for every question type", async () => {
    for (const name of ["visible_damage", "department", "severity"]) {
      const others = [GUIDE_PREDICATE, GUIDE_CHOICE, GUIDE_SCORE].filter(
        (answer) => answer.name !== name,
      );
      const reading = read([{ type: "refusal", name }, ...others]);
      assertBytes(reading?.refused, [name], `${name}: refused`);
      assertBytes(reading?.dropped, [], `${name}: not dropped`);
      assertEqual(keysOf(reading).length, 2, `${name}: the others arrive`);
      assert(!keysOf(reading).includes(name), `${name}: an answer appeared`);
    }
    const unasked = read([{ type: "refusal", name: "weather" }]);
    assertBytes(unasked?.refused, [], "a refusal for an unasked name");
    assertBytes(unasked?.dropped, ["#0"], "is dropped by position");
  });

  await test("an answer of another type than its question is dropped even when it carries the fields asked for, and so is an unknown type", async () => {
    // Each wrong-typed answer holds everything the right type would need, so
    // only the type check can refuse it.
    const wrong: Array<[string, unknown, string]> = [
      [
        "choice typed answer for a predicate",
        { ...GUIDE_PREDICATE, type: "choice" },
        "visible_damage",
      ],
      [
        "predicate typed answer for a choice",
        { ...GUIDE_CHOICE, type: "predicate" },
        "department",
      ],
      [
        "choice typed answer for a score",
        { ...GUIDE_SCORE, type: "choice" },
        "severity",
      ],
      [
        "score typed answer for a choice",
        { ...GUIDE_CHOICE, type: "score" },
        "department",
      ],
      [
        "predicate for a choice",
        { ...GUIDE_PREDICATE, name: "department" },
        "department",
      ],
      [
        "choice for a predicate",
        { ...GUIDE_CHOICE, name: "visible_damage" },
        "visible_damage",
      ],
      [
        "score for a choice",
        { ...GUIDE_SCORE, name: "department" },
        "department",
      ],
      ["choice for a score", { ...GUIDE_CHOICE, name: "severity" }, "severity"],
      ["unknown type", { type: "mystery", name: "severity" }, "severity"],
      ["no type", { name: "severity", score: 1 }, "severity"],
      [
        "System One spelling",
        { type: "noul", name: "visible_damage", noul: 0.9 },
        "visible_damage",
      ],
    ];
    for (const [label, bad, id] of wrong) {
      const reading = read([bad]);
      assertBytes(keysOf(reading), [], `${label}: no answer`);
      assertBytes(reading?.dropped, [id], `${label}: dropped under its id`);
    }
  });

  await test("a predicate probability must be a finite number from 0 to 1", async () => {
    const withProbability = (probability: unknown): unknown => ({
      ...GUIDE_PREDICATE,
      probability,
    });
    for (const good of [0, 1, 0.5]) {
      assertEqual(
        keysOf(read([withProbability(good)])).length,
        1,
        "a probability in range",
      );
    }
    for (const bad of [
      -0.1,
      1.1,
      "0.5",
      null,
      undefined,
      NaN,
      Infinity,
      [0.5],
    ]) {
      const reading = read([GUIDE_CHOICE, withProbability(bad)]);
      assertBytes(keysOf(reading), ["department"], "a bad probability");
      assertBytes(reading?.dropped, ["visible_damage"], "is dropped by id");
    }
  });

  await test("a choice must name an asked option and list each asked option exactly once", async () => {
    const list = (entries: unknown): unknown => ({
      ...GUIDE_CHOICE,
      probabilities: entries,
    });
    const option = (value: unknown, probability: unknown): unknown => ({
      value,
      probability,
    });
    const full = [
      option("billing", 0.95),
      option("technical", 0.02),
      option("shipping", 0.01),
      option("other", 0.02),
    ];
    const bad: Array<[string, unknown]> = [
      ["choice not asked", { ...GUIDE_CHOICE, choice: "legal" }],
      ["choice with another case", { ...GUIDE_CHOICE, choice: "Billing" }],
      ["boolean choice", { ...GUIDE_CHOICE, choice: true }],
      ["number choice", { ...GUIDE_CHOICE, choice: 1 }],
      ["no choice", blank({ ...GUIDE_CHOICE, choice: undefined })],
      ["probabilities absent", list(undefined)],
      ["probabilities as a map", list({ billing: 0.95, technical: 0.05 })],
      ["an option missing", list(full.slice(0, 3))],
      [
        "an option missing and the sum kept at one",
        list([
          option("billing", 0.97),
          option("technical", 0.02),
          option("other", 0.01),
        ]),
      ],
      ["an unasked option added", list([...full, option("legal", 0)])],
      [
        "an unasked option in place of an asked one",
        list([...full.slice(0, 3), option("legal", 0.02)]),
      ],
      [
        "an option twice and another missing",
        list([...full.slice(0, 3), option("billing", 0.02)]),
      ],
      [
        "an option twice, a sum of one if the later one were taken, and another missing",
        list([
          option("billing", 0.3),
          option("billing", 0.5),
          option("technical", 0.2),
          option("shipping", 0.3),
        ]),
      ],
      ["a boolean value", list([...full.slice(0, 3), option(true, 0.02)])],
      ["a number value", list([...full.slice(0, 3), option(1, 0.02)])],
      ["a non-object entry", list([...full.slice(0, 3), "other"])],
      [
        "a probability above one",
        list([
          option("billing", 1.5),
          option("technical", -0.5),
          option("shipping", 0),
          option("other", 0),
        ]),
      ],
      [
        "a negative probability",
        list([
          option("billing", 1.02),
          option("technical", -0.02),
          option("shipping", 0),
          option("other", 0),
        ]),
      ],
      [
        "a string probability",
        list([...full.slice(0, 3), option("other", "0.02")]),
      ],
      [
        "a null probability",
        list([...full.slice(0, 3), option("other", null)]),
      ],
      [
        "a probability that is not finite",
        list([...full.slice(0, 3), option("other", NaN)]),
      ],
    ];
    for (const [label, answer] of bad) {
      const reading = read([GUIDE_PREDICATE, answer]);
      assertBytes(
        keysOf(reading),
        ["visible_damage"],
        `${label}: the rest kept`,
      );
      assertBytes(reading?.dropped, ["department"], `${label}: dropped`);
    }
  });

  await test("choice values are typed: a boolean is not the string with the same text", async () => {
    const asked: DecisionQuestionMap = {
      flag: {
        type: "choice",
        instructions: "Which?",
        criteria: { true: "yes", false: "no" },
      },
    };
    const answer = (choice: unknown, first: unknown, second: unknown) => ({
      type: "choice",
      name: "flag",
      choice,
      probabilities: [
        { value: first, probability: 0.7 },
        { value: second, probability: 0.3 },
      ],
      confidence: 0.7,
    });
    assertBytes(
      keysOf(read([answer("true", "true", "false")], asked)),
      ["flag"],
      "strings",
    );
    const typed = [
      answer(true, "true", "false"),
      answer("true", true, false),
      answer("true", true, "false"),
    ];
    for (const bad of typed) {
      const reading = read([bad], asked);
      assertBytes(keysOf(reading), [], "a boolean value: no answer");
      assertBytes(reading?.dropped, ["flag"], "a boolean value: dropped");
    }
  });

  await test("a score must list each level index exactly once, as an integer, with a finite score", async () => {
    const level = (value: unknown, probability: unknown): unknown => ({
      value,
      label: String(value),
      probability,
    });
    const withLevels = (entries: unknown): unknown => ({
      ...GUIDE_SCORE,
      probabilities: entries,
    });
    const bad: Array<[string, unknown]> = [
      ["no probabilities", withLevels(undefined)],
      ["a level missing", withLevels([level(0, 0.5), level(1, 0.5)])],
      [
        "a level twice",
        withLevels([level(0, 0.1), level(1, 0.7), level(1, 0.2)]),
      ],
      [
        "a level beyond the rubric",
        withLevels([level(0, 0.1), level(1, 0.7), level(3, 0.2)]),
      ],
      [
        "a negative level",
        withLevels([level(0, 0.1), level(1, 0.7), level(-1, 0.2)]),
      ],
      [
        "a fractional level",
        withLevels([level(0, 0.1), level(1, 0.7), level(1.5, 0.2)]),
      ],
      [
        "a string level",
        withLevels([level(0, 0.1), level(1, 0.7), level("2", 0.2)]),
      ],
      [
        "an extra level",
        withLevels([
          level(0, 0.1),
          level(1, 0.7),
          level(2, 0.1),
          level(3, 0.1),
        ]),
      ],
      [
        "a probability above one",
        withLevels([level(0, 0.1), level(1, 1.2), level(2, -0.3)]),
      ],
      ["no score", { ...GUIDE_SCORE, score: undefined }],
      ["a string score", { ...GUIDE_SCORE, score: "1.1" }],
      ["a score that is not finite", { ...GUIDE_SCORE, score: Infinity }],
    ];
    for (const [label, answer] of bad) {
      const reading = read([GUIDE_PREDICATE, answer]);
      assertBytes(
        keysOf(reading),
        ["visible_damage"],
        `${label}: the rest kept`,
      );
      assertBytes(reading?.dropped, ["severity"], `${label}: dropped`);
    }
  });

  await test("a score must lie between level 0 and the highest level index: the edges are kept and anything beyond is dropped, never clamped", async () => {
    const kept: Array<[string, number]> = [
      ["the lowest level", 0],
      ["the highest level", 2],
      ["between levels", 1.1],
    ];
    for (const [label, score] of kept) {
      assertEqual(
        keysOf(read([{ ...GUIDE_SCORE, score }])).includes("severity"),
        true,
        `${label}: kept`,
      );
    }
    const beyond: Array<[string, number]> = [
      ["just below the lowest level", -0.01],
      ["well below the lowest level", -5],
      ["just above the highest level", 2.01],
      ["the level count itself", 3],
      ["far above", 1e9],
    ];
    for (const [label, score] of beyond) {
      const reading = read([GUIDE_PREDICATE, { ...GUIDE_SCORE, score }]);
      assertBytes(
        keysOf(reading),
        ["visible_damage"],
        `${label}: the rest kept`,
      );
      assertBytes(reading?.dropped, ["severity"], `${label}: dropped`);
    }
    // The bound follows the rubric asked: two levels allow 0 to 1 only.
    const twoLevels: DecisionQuestionMap = {
      severity: {
        type: "score",
        instructions: "How severe is this issue?",
        criteria: SEVERITY_RUBRIC.slice(0, 2),
      },
    };
    const twoLevel = (score: number): Reading =>
      read(
        [
          {
            ...GUIDE_SCORE,
            score,
            probabilities: GUIDE_SCORE.probabilities
              .slice(0, 2)
              .map((entry) => ({
                ...entry,
                probability: 0.5,
              })),
          },
        ],
        twoLevels,
      );
    assertEqual(keysOf(twoLevel(1)).length, 1, "two levels: 1 is kept");
    assertEqual(keysOf(twoLevel(1.5)).length, 0, "two levels: 1.5 is dropped");
  });

  await test("a confidence outside 0 to 1 drops the answer, never clamped; 0 and 1 are kept", async () => {
    const confidenceOf = (reading: Reading, id: string): unknown =>
      (reading?.answers[id] as { confidence?: unknown } | undefined)
        ?.confidence;
    for (const answer of [GUIDE_CHOICE, GUIDE_SCORE]) {
      for (const confidence of [0, 1, 0.5]) {
        assertEqual(
          confidenceOf(read([{ ...answer, confidence }]), answer.name),
          confidence,
          `${answer.type}: ${confidence} is kept as given`,
        );
      }
      for (const [label, confidence] of [
        ["just below zero", -0.01],
        ["just above one", 1.01],
        ["a percentage", 93],
        ["far below", -1e9],
      ] as const) {
        const reading = read([GUIDE_PREDICATE, { ...answer, confidence }]);
        assertBytes(
          keysOf(reading),
          ["visible_damage"],
          `${answer.type}, ${label}: the rest kept`,
        );
        assertBytes(
          reading?.dropped,
          [answer.name],
          `${answer.type}, ${label}: dropped`,
        );
      }
    }
  });

  await test("probabilities must sum to one within 0.01: 0.995 is kept and 0.98 dropped, at the edges and in both directions", async () => {
    const sums: Array<[number, boolean]> = [
      [0.995, true],
      [1.005, true],
      [0.99, true],
      [1.01, true],
      [0.98, false],
      [1.02, false],
      [0.989, false],
      [1.011, false],
      [1, true],
      [0, false],
    ];
    for (const [sum, kept] of sums) {
      const rest = Number((sum - 0.9).toFixed(3));
      const choice = {
        ...GUIDE_CHOICE,
        probabilities: [
          { value: "billing", probability: 0.5 },
          { value: "technical", probability: 0.2 },
          { value: "shipping", probability: 0.2 },
          { value: "other", probability: rest },
        ],
      };
      const score = {
        ...GUIDE_SCORE,
        probabilities: [
          { value: 0, label: "0", probability: 0.5 },
          { value: 1, label: "1", probability: 0.2 },
          { value: 2, label: "2", probability: rest + 0.2 },
        ],
      };
      for (const answer of [choice, score]) {
        const reading = read([answer]);
        const arrived = keysOf(reading).includes(answer.name);
        assertEqual(arrived, kept, `sum ${sum} for ${answer.type}`);
      }
    }
  });

  await test("confidence is the answer's own, else the largest probability", async () => {
    const confidenceOf = (reading: Reading, id: string): unknown =>
      (reading?.answers[id] as { confidence?: unknown } | undefined)
        ?.confidence;
    assertEqual(confidenceOf(read([GUIDE_CHOICE]), "department"), 0.93);
    assertEqual(confidenceOf(read([GUIDE_SCORE]), "severity"), 0.55);
    for (const absent of [undefined, null, "0.9", NaN]) {
      assertEqual(
        confidenceOf(
          read([{ ...GUIDE_CHOICE, confidence: absent }]),
          "department",
        ),
        0.95,
        "a choice without a usable confidence",
      );
      assertEqual(
        confidenceOf(
          read([{ ...GUIDE_SCORE, confidence: absent }]),
          "severity",
        ),
        0.7,
        "a score without a usable confidence",
      );
    }
  });

  await test("a choice reads back with its probabilities in the order asked, and a score with the rubric as its legend", async () => {
    const reversed = {
      ...GUIDE_CHOICE,
      probabilities: [...GUIDE_CHOICE.probabilities].reverse(),
    };
    const reading = read([reversed, GUIDE_SCORE]);
    assertBytes(
      Object.keys(
        (reading?.answers.department as { probabilities: object })
          .probabilities,
      ),
      ["billing", "technical", "shipping", "other"],
      "asked order",
    );
    // A null rubric level has an empty legend entry, as nothing was supplied.
    const sparse: DecisionQuestionMap = {
      severity: {
        type: "score",
        instructions: "Rate",
        criteria: ["low", null, { tier: 3 }],
      },
    };
    const legend = (
      read([GUIDE_SCORE], sparse)?.answers.severity as { legend: object }
    ).legend;
    assertBytes(
      legend,
      { "0": "low", "1": "", "2": '{"tier":3}' },
      "legend from the request",
    );
  });

  await test("77 and 151 options read back complete, whatever order the server lists them in", async () => {
    for (const count of [77, 151]) {
      const keys = Array.from(
        { length: count },
        (_, i) => `option-${String(i + 1).padStart(3, "0")}`,
      );
      const asked: DecisionQuestionMap = {
        pick: {
          type: "choice",
          instructions: "Which?",
          criteria: Object.fromEntries(keys.map((key) => [key, `${key}`])),
        },
      };
      const entries = keys
        .map((value) => ({ value, probability: 1 / count }))
        .reverse();
      const reading = read(
        [
          {
            type: "choice",
            name: "pick",
            choice: keys[count - 1],
            probabilities: entries,
            confidence: 0.4,
          },
        ],
        asked,
      );
      const answer = reading?.answers.pick as
        | { choice: string; probabilities: Record<string, number> }
        | undefined;
      assertEqual(
        Object.keys(answer?.probabilities ?? {}).length,
        count,
        `${count}: complete`,
      );
      assertBytes(
        Object.keys(answer?.probabilities ?? {}),
        keys,
        `${count}: asked order`,
      );
      assertEqual(answer?.choice, keys[count - 1], `${count}: the choice`);
      assertBytes(reading?.dropped, [], `${count}: nothing dropped`);
      // One option fewer is not a complete answer.
      const short = read(
        [
          {
            type: "choice",
            name: "pick",
            choice: keys[0],
            probabilities: entries.slice(1),
            confidence: 0.4,
          },
        ],
        asked,
      );
      assertBytes(short?.dropped, ["pick"], `${count}: one option short`);
    }
  });

  await test("a question id named like a prototype key reads into an own property, not the prototype", async () => {
    const asked: DecisionQuestionMap = JSON.parse(
      '{"__proto__":{"type":"boolean","instructions":"Is it?"}}',
    );
    const reading = read(
      [{ type: "predicate", name: "__proto__", probability: 0.3 }],
      asked,
    );
    if (reading === undefined) {
      throw new Error("no reading");
    }
    assert(
      Object.hasOwn(reading.answers, "__proto__"),
      "the answer is not an own property",
    );
    assert(
      Object.getPrototypeOf(reading.answers) === Object.prototype,
      "the answers object's prototype changed",
    );
    assertBytes(reading.dropped, [], "nothing dropped");
  });
}

// The class under test with the OpenAI dialect, to see the whole request path.
const OPENAI_LIKE: DecideCatalogJson = {
  ...LAYA_ENTRY,
  displayName: "OpenAI Decisions",
  decide: {
    ...LAYA_ENTRY.decide,
    dialect: "openai-decisions",
    endpoint: "{baseURL}/v1/decisions",
    model: { placement: "body" },
    requestIdHeaders: ["x-request-id"],
    response: undefined,
  },
};

async function openaiDecisionsProviderSection(): Promise<void> {
  logSection("ConfiguredDecisionProvider: openai-decisions dialect");
  const { logger } = await import("../dist/utils/logger.js");
  const questions: DecisionQuestionMap = {
    visible_damage: GUIDE_QUESTIONS.visible_damage as DecisionQuestion,
    department: GUIDE_QUESTIONS.department as DecisionQuestion,
    severity: GUIDE_QUESTIONS.severity as DecisionQuestion,
  };
  const request: DecisionRequest = {
    state: "I was charged twice for my order.",
    questions,
    model: "gpt-6-luna",
  };
  const replyWith = (
    answers: unknown,
    headers: Record<string, string> = {},
  ): (() => Response) => {
    return () =>
      new Response(
        JSON.stringify({
          model: "gpt-6-luna",
          answers,
          usage: { input_tokens: 31, output_tokens: 0, total_tokens: 31 },
        }),
        {
          status: 200,
          headers: { "content-type": "application/json", ...headers },
        },
      );
  };
  const warnings = (): string[] =>
    logger.getLogs("warn").map((line) => line.message);

  await test("decide() posts the OpenAI body to the configured endpoint and reads the guide's answers", async () => {
    await withFetchStub(
      replyWith([GUIDE_PREDICATE, GUIDE_CHOICE, GUIDE_SCORE], {
        "x-request-id": "req-9",
      }),
      async (sent) => {
        const provider = await make(GOOD, { entry: OPENAI_LIKE });
        const result = await provider.decide(request);
        assertEqual(sent.length, 1, "the request did not reach the stub");
        assertEqual(sent[0]?.url, "https://laya.test/base/v1/decisions");
        assertEqual(sent[0]?.headers.authorization, "Bearer k-1");
        const body = JSON.parse(sent[0]?.body ?? "");
        assertBytes(
          Object.keys(body),
          ["model", "input", "questions"],
          "the body keys",
        );
        assertEqual(body.model, "gpt-6-luna");
        assertEqual(body.input, "I was charged twice for my order.");
        assertBytes(
          body.questions.map((q: { name: string }) => q.name),
          ["visible_damage", "department", "severity"],
          "question names",
        );
        assertBytes(
          result.answers,
          {
            visible_damage: { type: "boolean", probability: 0.92 },
            department: {
              type: "choice",
              choice: "billing",
              confidence: 0.93,
              probabilities: {
                billing: 0.95,
                technical: 0.02,
                shipping: 0.01,
                other: 0.02,
              },
            },
            severity: {
              type: "score",
              score: 1.1,
              confidence: 0.55,
              legend: {
                "0": SEVERITY_RUBRIC[0],
                "1": SEVERITY_RUBRIC[1],
                "2": SEVERITY_RUBRIC[2],
              },
              probabilities: { "0": 0.1, "1": 0.7, "2": 0.2 },
            },
          },
          "the decision's answers",
        );
        assertEqual(result.model, "gpt-6-luna");
        assertEqual(result.requestId, "req-9");
        assertEqual(result.usage.inputTokens, 31);
        assertEqual(result.usage.outputTokens, 0);
      },
    );
  });

  await test("a refusal leaves that question without an answer, the others arrive, and the log names the refusal", async () => {
    logger.clearLogs();
    try {
      await withEnv({ NEUROLINK_DEBUG: "true" }, () =>
        withFetchStub(
          replyWith([
            GUIDE_PREDICATE,
            { type: "refusal", name: "department" },
            GUIDE_SCORE,
          ]),
          async (sent) => {
            const result = await (
              await make(GOOD, { entry: OPENAI_LIKE })
            ).decide(request);
            assertEqual(sent.length, 1, "the request did not reach the stub");
            assertBytes(
              Object.keys(result.answers),
              ["visible_damage", "severity"],
              "answered questions",
            );
          },
        ),
      );
      assert(
        warnings().includes(
          'OpenAI Decisions: the model declined to answer "department"',
        ),
        "the refusal was not logged by name",
      );
      assert(
        !warnings().some((line) => line.includes("dropped unparseable")),
        "a refusal was logged as unparseable",
      );
    } finally {
      logger.clearLogs();
    }
  });

  await test("an answer that fails a check is dropped with a warning and the rest of the batch arrives", async () => {
    logger.clearLogs();
    try {
      await withEnv({ NEUROLINK_DEBUG: "true" }, () =>
        withFetchStub(
          replyWith([
            GUIDE_PREDICATE,
            { ...GUIDE_CHOICE, choice: "legal" },
            { ...GUIDE_SCORE, name: "not-asked" },
          ]),
          async () => {
            const result = await (
              await make(GOOD, { entry: OPENAI_LIKE })
            ).decide(request);
            assertBytes(
              Object.keys(result.answers),
              ["visible_damage"],
              "answered questions",
            );
          },
        ),
      );
      const logged = warnings();
      assert(
        logged.includes(
          'OpenAI Decisions: dropped unparseable answer "department"',
        ),
        "the bad choice was not named",
      );
      assert(
        logged.includes('OpenAI Decisions: dropped unparseable answer "#2"'),
        "the unasked name was not reported by position",
      );
    } finally {
      logger.clearLogs();
    }
  });

  await test("a System One shaped answers map is a server error, not an empty decision", async () => {
    await withFetchStub(
      replyWith({ visible_damage: { type: "noul", noul: 0.9 } }),
      async (sent) => {
        const error = await (await make(GOOD, { entry: OPENAI_LIKE }))
          .decide(request)
          .then(
            () => undefined,
            (rejection: unknown) => rejection,
          );
        assertEqual(sent.length, 1, "the request did not reach the stub");
        assertEqual(causeKind(error), "server");
      },
    );
  });

  await test("an image rides in the user message form of the input", async () => {
    const png = fixtureBytes("red.png");
    const pngUrl = asDataUrl("image/png", png);
    const entry: DecideCatalogJson = {
      ...MEDIA_ENTRY,
      displayName: "OpenAI Decisions",
      decide: {
        ...OPENAI_LIKE.decide,
        media: undefined,
      },
    };
    await withFetchStub(replyWith([GUIDE_PREDICATE]), async (sent) => {
      const provider = await make(GOOD, { entry });
      await provider.decide({
        state: "Inspect the product in this photo.",
        questions: {
          visible_damage: questions.visible_damage as DecisionQuestion,
        },
        model: "gpt-6-luna",
        images: [png],
      });
      assertEqual(sent.length, 1, "the request did not reach the stub");
      assertEqual(
        sent[0]?.body,
        `{"model":"gpt-6-luna","input":[{"role":"user","content":[{"type":"input_text","text":"Inspect the product in this photo."},{"type":"input_image","image_url":${JSON.stringify(pngUrl)}}]}],"questions":[{"type":"predicate","instructions":"Does the product have visible damage?","name":"visible_damage"}]}`,
        "the image request body",
      );
    });
  });
}

// ===== decide.authHeader and decide.stateEncoding =====

const BEARER_HEADERS = JSON.stringify({
  Authorization: "Bearer k-1",
  "Content-Type": "application/json",
});
const API_KEY_HEADERS = JSON.stringify({
  "x-api-key": "k-1",
  "Content-Type": "application/json",
});
// What the stub sees: fetch's Headers lower-cases and sorts the names.
const BEARER_ON_THE_WIRE = `{"authorization":"Bearer k-1","content-type":"application/json"}`;
const API_KEY_ON_THE_WIRE = `{"content-type":"application/json","x-api-key":"k-1"}`;
const KEYED = { apiKey: "k-1", baseURL: "https://xor.test" };

const CATALOG_DIR = fileURLToPath(
  new URL("../src/lib/providers/catalog/", import.meta.url),
);

// Every decide entry the package ships, read as data the way a build copies it.
function shippedDecideEntries(): DecideCatalogJson[] {
  return readdirSync(CATALOG_DIR)
    .filter((file) => file.endsWith(".json") && !file.endsWith(".schema.json"))
    .sort()
    .map(
      (file) =>
        JSON.parse(
          readFileSync(join(CATALOG_DIR, file), "utf8"),
        ) as DecideCatalogJson,
    )
    .filter(
      (entry) =>
        Array.isArray(entry.inferenceKinds) &&
        entry.inferenceKinds.length === 1 &&
        entry.inferenceKinds[0] === "decide",
    );
}

const withDecideBlock = (
  base: DecideCatalogJson,
  patch: Partial<DecideCatalogJson["decide"]>,
): DecideCatalogJson => ({ ...base, decide: { ...base.decide, ...patch } });

function causeOf(
  error: unknown,
): { kind?: string; message?: string; retryable?: boolean } | undefined {
  return error instanceof Error
    ? (error.cause as
        | { kind?: string; message?: string; retryable?: boolean }
        | undefined)
    : undefined;
}

const answered = (): Response =>
  new Response(MEDIA_ANSWER, {
    status: 200,
    headers: { "content-type": "application/json" },
  });

// The headers the stub received for one decide() call, as one JSON string.
async function headersSentFor(entry: DecideCatalogJson): Promise<string> {
  return withFetchStub(answered, async (sent) => {
    const provider = await make(KEYED, { entry });
    await provider.decide(MEDIA_REQUEST).catch(() => undefined);
    assertEqual(sent.length, 1, "the request did not reach the stub");
    return JSON.stringify(sent[0]?.headers ?? {});
  });
}

async function configuredAuthHeaderSection(): Promise<void> {
  logSection("ConfiguredDecisionProvider: decide.authHeader");
  await test("every shipped decide entry sends the header set its authHeader names, and Bearer when it names none", async () => {
    const entries = shippedDecideEntries();
    const ids = entries.map((entry) => entry.id);
    for (const id of ["laya", "xor", "subq", "openai-decisions"]) {
      assert(ids.includes(id), "the catalog scan lost a shipped decide entry");
    }
    for (const entry of entries) {
      const keyed = entry.decide.authHeader === "x-api-key";
      const provider = await make(KEYED, { entry });
      assertEqual(
        JSON.stringify(provider.call("decisionHeaders")),
        keyed ? API_KEY_HEADERS : BEARER_HEADERS,
        `${entry.id}: the headers the class builds`,
      );
      assertEqual(
        await headersSentFor(entry),
        keyed ? API_KEY_ON_THE_WIRE : BEARER_ON_THE_WIRE,
        `${entry.id}: the headers on the wire`,
      );
    }
  });

  await test("Laya, XOR, SubQ and OpenAI Decisions declare no authHeader and send Bearer, byte for byte", async () => {
    const byId = new Map(
      shippedDecideEntries().map((entry) => [entry.id, entry]),
    );
    for (const id of ["laya", "xor", "subq", "openai-decisions"]) {
      const entry = byId.get(id);
      assertNotNull(entry, `${id} is not a shipped decide entry`);
      assertEqual(
        entry.decide.authHeader,
        undefined,
        `${id} must not declare an authHeader`,
      );
      const provider = await make(KEYED, { entry });
      assertEqual(
        JSON.stringify(provider.call("decisionHeaders")),
        BEARER_HEADERS,
        `${id}: the headers the class builds`,
      );
      assertEqual(
        await headersSentFor(entry),
        BEARER_ON_THE_WIRE,
        `${id}: the headers on the wire`,
      );
    }
  });

  await test("bearer named outright is the same as bearer omitted, on both dialects", async () => {
    for (const base of [LAYA_ENTRY, OPENAI_LIKE]) {
      const named = withDecideBlock(base, { authHeader: "bearer" });
      const omitted = await make(KEYED, { entry: base });
      const explicit = await make(KEYED, { entry: named });
      assertEqual(
        JSON.stringify(explicit.call("decisionHeaders")),
        JSON.stringify(omitted.call("decisionHeaders")),
      );
      assertEqual(
        JSON.stringify(explicit.call("decisionHeaders")),
        BEARER_HEADERS,
      );
      assertEqual(await headersSentFor(named), BEARER_ON_THE_WIRE);
    }
  });

  await test("x-api-key sends the key and the content type, and no Authorization header at all, on both dialects", async () => {
    for (const base of [LAYA_ENTRY, OPENAI_LIKE]) {
      const entry = withDecideBlock(base, { authHeader: "x-api-key" });
      const provider = await make(KEYED, { entry });
      const built = provider.call("decisionHeaders") as Record<string, string>;
      assertEqual(JSON.stringify(built), API_KEY_HEADERS);
      assert(
        Object.keys(built).every(
          (name) => name.toLowerCase() !== "authorization",
        ),
        "the class built an Authorization header in x-api-key mode",
      );
      const wire = await headersSentFor(entry);
      assertEqual(wire, API_KEY_ON_THE_WIRE);
      const received: Record<string, string> = JSON.parse(wire);
      assert(
        !("authorization" in received) &&
          Object.values(received).every((value) => !value.includes("Bearer")),
        "a bearer credential reached the wire in x-api-key mode",
      );
    }
  });

  await test("x-api-key mode keeps the key out of rejection texts, network error texts and the rejection log line", async () => {
    const { logger } = await import("../dist/utils/logger.js");
    const key = "xk-plain-4821";
    const entry = withDecideBlock(LAYA_ENTRY, { authHeader: "x-api-key" });
    const credentials = { apiKey: key, baseURL: "https://laya.test" };
    const request: DecisionRequest = {
      state: "payouts have failed",
      questions: { q: { type: "boolean", instructions: "Is this urgent?" } },
      model: "auto",
    };
    logger.clearLogs();
    logger.setLogLevel("debug");
    try {
      // The logger keeps nothing below error unless NEUROLINK_DEBUG is "true".
      await withEnv({ NEUROLINK_DEBUG: "true" }, async () => {
        await withFetchStub(
          () =>
            new Response(
              JSON.stringify({ detail: `x-api-key ${key} is not valid` }),
              { status: 401, headers: { "content-type": "application/json" } },
            ),
          async (sent) => {
            const error = await (await make(credentials, { entry }))
              .decide(request)
              .then(
                () => undefined,
                (rejection: unknown) => rejection,
              );
            assertEqual(
              sent.length,
              1,
              "the rejection did not come from the stub",
            );
            assertEqual(sent[0]?.headers["x-api-key"], key);
            assertEqual(causeKind(error), "authentication");
            const texts = JSON.stringify([
              error instanceof Error ? error.message : "",
              causeOf(error)?.message ?? "",
            ]);
            assert(!texts.includes(key), "a rejection text carries the key");
            assert(
              texts.includes("[redacted]"),
              "the key was not marked as removed",
            );
          },
        );
        // The provider's own log lines. (The transport's debug lines repeat a
        // transport error's text as it is; a real one never holds the key.)
        const lines = JSON.stringify(
          logger.getLogs().map((line) => [line.message, line.data]),
        );
        assert(
          lines.includes("credential not accepted"),
          "the rejection was not logged",
        );
        assert(!lines.includes(key), "a log line carries the key");
        await withFetchStub(
          () => {
            throw new Error(`socket hang up while sending ${key}`);
          },
          async (sent) => {
            const error = await (await make(credentials, { entry }))
              .decide(request)
              .then(
                () => undefined,
                (rejection: unknown) => rejection,
              );
            assert(
              sent.length >= 1,
              "the network error did not come from the stub",
            );
            assertEqual(causeKind(error), "network");
            const texts = JSON.stringify([
              error instanceof Error ? error.message : "",
              causeOf(error)?.message ?? "",
            ]);
            assert(
              !texts.includes(key),
              "a network error text carries the key",
            );
            assert(
              texts.includes("[redacted]"),
              "the key was not marked as removed",
            );
          },
        );
      });
    } finally {
      logger.setLogLevel("info");
      logger.clearLogs();
    }
  });
}

const QUESTION_Q = `"questions":{"q":{"type":"noul","instructions":"Is this urgent?"}}`;
const textBody = (stateText: string): string =>
  `{"model":"typed-decisions","state":${JSON.stringify(stateText)},${QUESTION_Q}}`;
const jsonBody = (state: unknown): string =>
  `{"model":"typed-decisions","state":${JSON.stringify(state)},${QUESTION_Q}}`;

const ENCODED_STATES: ReadonlyArray<readonly [string, DecisionState, string]> =
  [
    [
      "a string with whitespace at both ends",
      "  \tkeep  these\n ",
      "  \tkeep  these\n ",
    ],
    ["a string that reads as JSON", `{"a":1}`, `{"a":1}`],
    ["a string in quotes", `"quoted"`, `"quoted"`],
    ["a string of one character", "x", "x"],
    [
      "an object",
      { a: 1, b: ["x", true], c: { d: "é" } },
      `{"a":1,"b":["x",true],"c":{"d":"é"}}`,
    ],
    ["an object with a text key", { text: "hello" }, `{"text":"hello"}`],
    ["an array", [1, "two", [3]], `[1,"two",[3]]`],
    ["a number", 42, "42"],
    ["zero", 0, "0"],
    ["a negative fraction", -1.5, "-1.5"],
    ["true", true, "true"],
    ["false", false, "false"],
    ["an empty object", {}, "{}"],
    ["an empty array", [], "[]"],
  ];

// Every one of these is nothing but whitespace after trim(), and none holds a
// character the message could repeat without being noticed.
const NBSP = String.fromCharCode(0x00a0);
const BOM = String.fromCharCode(0xfeff);
const EM_SPACE = String.fromCharCode(0x2003);
const BLANK_STATES = [
  "",
  " ",
  "\t\n",
  NBSP,
  BOM,
  EM_SPACE.repeat(7),
  ` \t \r\n ${EM_SPACE} `,
];
// Whitespace other than a plain space: a refusal that repeated the state would carry some of it.
const UNUSUAL_WHITESPACE = new RegExp(`[\\t\\n\\r${NBSP}${BOM}${EM_SPACE}]`);

const TEXT_ENTRY = withDecideBlock(LAYA_ENTRY, { stateEncoding: "text" });
const PROBE_ORIGIN = "https://probe.test";

async function configuredStateEncodingSection(): Promise<void> {
  logSection("ConfiguredDecisionProvider: decide.stateEncoding");
  const questions: DecisionQuestionMap = {
    q: { type: "boolean", instructions: "Is this urgent?" },
  };
  const png = fixtureBytes("red.png");
  const mp4 = fixtureBytes("red.mp4");

  await test("a string state goes out unchanged, and every other value goes out as its JSON text", async () => {
    for (const [what, state, text] of ENCODED_STATES) {
      assertEqual(
        await wireBodyFor(TEXT_ENTRY, { state }),
        textBody(text),
        what,
      );
    }
  });

  await test("an entry without stateEncoding sends the state as given, byte for byte", async () => {
    const states: DecisionState[] = [
      ...ENCODED_STATES.map(([, state]) => state),
      "",
      "   ",
    ];
    for (const state of states) {
      assertEqual(
        await wireBodyFor(LAYA_ENTRY, { state }),
        jsonBody(state),
        "the state changed on an entry that does not ask for encoding",
      );
    }
  });

  await test("a state that is blank after trim() is refused before any request, as invalid_request, and the message never repeats it", async () => {
    await withFetchStub(answered, async (sent) => {
      for (const state of BLANK_STATES) {
        const provider = await make(KEYED, { entry: TEXT_ENTRY });
        const error = await provider.decide({ ...MEDIA_REQUEST, state }).then(
          () => undefined,
          (rejection: unknown) => rejection,
        );
        if (!(error instanceof Error)) {
          throw new Error("a blank state was not refused");
        }
        const cause = causeOf(error);
        assertEqual(cause?.kind, "invalid_request", "the kind of the refusal");
        assertEqual(cause?.retryable, false, "the refusal must not be retried");
        for (const text of [error.message, cause?.message ?? ""]) {
          assertIncludes(
            text,
            "Laya",
            "the refusal does not name the provider",
          );
          assertIncludes(
            text,
            "needs non-blank state text",
            "the refusal does not name the rule",
          );
          assert(
            !UNUSUAL_WHITESPACE.test(text),
            "the refusal repeats the state it refused",
          );
        }
      }
      assertEqual(sent.length, 0, "a blank state reached the network");

      // Positive control: the same provider and stub send a real state.
      await (await make(KEYED, { entry: TEXT_ENTRY }))
        .decide({ ...MEDIA_REQUEST, state: "x" })
        .catch(() => undefined);
      assertEqual(sent.length, 1, "a real state did not reach the stub");
    });
  });

  await test("a state a JavaScript caller left out is refused like a blank one, not thrown as a TypeError", async () => {
    await withFetchStub(answered, async (sent) => {
      const error = await (await make(KEYED, { entry: TEXT_ENTRY }))
        .decide({ ...MEDIA_REQUEST, state: undefined as never })
        .then(
          () => undefined,
          (rejection: unknown) => rejection,
        );
      assertEqual(causeKind(error), "invalid_request");
      assertEqual(sent.length, 0, "a missing state reached the network");
    });
  });

  await test("the same refusal holds on the openai-decisions dialect, and the string rule too", async () => {
    const entry = withDecideBlock(OPENAI_LIKE, { stateEncoding: "text" });
    const openaiQuestions = `"questions":[{"type":"predicate","instructions":"Is this urgent?","name":"q"}]`;
    const bodyFor = async (state: DecisionState): Promise<string> =>
      withFetchStub(answered, async (sent) => {
        await (await make(KEYED, { entry }))
          .decide({ ...MEDIA_REQUEST, state })
          .catch(() => undefined);
        assertEqual(sent.length, 1, "the request did not reach the stub");
        return sent[0]?.body ?? "";
      });
    assertEqual(
      await bodyFor("  keep  "),
      `{"model":"typed-decisions","input":"  keep  ",${openaiQuestions}}`,
    );
    assertEqual(
      await bodyFor({ a: 1 }),
      `{"model":"typed-decisions","input":"{\\"a\\":1}",${openaiQuestions}}`,
    );
    await withFetchStub(answered, async (sent) => {
      for (const state of BLANK_STATES) {
        const error = await (await make(KEYED, { entry }))
          .decide({ ...MEDIA_REQUEST, state })
          .then(
            () => undefined,
            (rejection: unknown) => rejection,
          );
        assertEqual(causeKind(error), "invalid_request");
      }
      assertEqual(sent.length, 0, "a blank state reached the network");
    });
    // The dialect on its own still sends a blank input: the refusal is the entry's.
    assertEqual(
      await withFetchStub(answered, async (sent) => {
        await (await make(KEYED, { entry: OPENAI_LIKE }))
          .decide({ ...MEDIA_REQUEST, state: "" })
          .catch(() => undefined);
        return sent[0]?.body ?? "";
      }),
      `{"model":"typed-decisions","input":"",${openaiQuestions}}`,
    );
  });

  await test("an image or a video on an entry that sets stateEncoding is still refused locally, with the media refusal, even beside a blank state", async () => {
    await withFetchStub(answered, async (sent) => {
      // The blank states are the ones a wrong order of checks would answer with
      // the blank-state refusal, so only they can tell the two refusals apart.
      for (const state of ["payouts have failed", "", "   "]) {
        for (const extra of [{ images: [png] }, { video: mp4 }]) {
          const provider = await make(KEYED, { entry: TEXT_ENTRY });
          const error = await provider
            .decide({ ...MEDIA_REQUEST, state, ...extra })
            .then(
              () => undefined,
              (rejection: unknown) => rejection,
            );
          assertEqual(causeKind(error), "invalid_request");
          const text = causeOf(error)?.message ?? "";
          assertIncludes(
            text,
            "does not accept images or video",
            "the refusal is not the media refusal",
          );
          assert(
            !text.includes("needs non-blank state text"),
            "the media refusal was reported as a blank-state refusal",
          );
        }
      }
      assertEqual(sent.length, 0, "media reached the network");
    });
  });

  await test("an entry that allows media writes the encoded state and the images side by side", async () => {
    const entry = withDecideBlock(MEDIA_ENTRY, { stateEncoding: "text" });
    const pngUrl = asDataUrl("image/png", png);
    assertEqual(
      await wireBodyFor(entry, { state: { a: 1 }, images: [png] }),
      `${textBody(`{"a":1}`).slice(0, -1)},"images":[${JSON.stringify(pngUrl)}]}`,
    );
  });

  await test("tryDecide() returns null for a blank state and sends nothing, decide() rejects, and a real state still goes out", async () => {
    const { NeuroLink } = await import("../dist/index.js");
    const { registerDecideCatalogProviders } =
      await import("../dist/factories/providerRegistry.js");
    const probe: DecideCatalogJson = {
      ...TEXT_ENTRY,
      id: "text-state-probe",
      displayName: "TextStateProbe",
      wire: { baseURL: PROBE_ORIGIN },
      decide: { ...TEXT_ENTRY.decide, baseURLRequired: false },
    };
    registerDecideCatalogProviders([probe]);
    const ask = (state: DecisionState) => ({
      provider: probe.id,
      state,
      questions,
    });
    // A NeuroLink instance fetches its own model list too, through the same
    // global fetch, so what counts is the traffic to the provider's origin.
    const toProbe = (sent: Sent[]): Sent[] =>
      sent.filter((request) => {
        try {
          return new URL(request.url).origin === PROBE_ORIGIN;
        } catch {
          return false;
        }
      });
    await withEnv({ TEXT_STATE_PROBE_API_KEY: "k-1" }, async () => {
      await withFetchStub(answered, async (sent) => {
        const nl = new NeuroLink();
        for (const state of BLANK_STATES) {
          const result = await nl.tryDecide(ask(state));
          assert(
            result === null,
            "tryDecide() did not fail open on a blank state",
          );
          const error = await nl.decide(ask(state)).then(
            () => undefined,
            (rejection: unknown) => rejection,
          );
          assertEqual(causeKind(error), "invalid_request");
        }
        assertEqual(
          toProbe(sent).length,
          0,
          "a blank state reached the provider",
        );

        // Positive control: the same instance, provider and stub send a real
        // state, so the zero above means "refused", not "unreachable".
        const live = await nl.tryDecide(ask({ a: 1 }));
        const reached = toProbe(sent);
        assertEqual(reached.length, 1, "a real state did not reach the stub");
        assert(live !== null, "the real state was not decided");
        assertEqual(reached[0]?.url, `${PROBE_ORIGIN}/predict`);
        assertEqual(reached[0]?.body, textBody(`{"a":1}`));
      });
    });
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
  await systemOneBodySection();
  await systemOneWireSection();
  await dialectPlumbingSection();
  await openaiDecisionsEncodeSection();
  await openaiDecisionsReadSection();
  await openaiDecisionsProviderSection();
  await configuredAuthHeaderSection();
  await configuredStateEncodingSection();
  await xorDecisionsSection();
});
