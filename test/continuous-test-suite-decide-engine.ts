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
import type {
  DecideBodyShape,
  DecideCatalogJson,
  DecideErrors,
  DecisionError,
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

const GOOD = { apiKey: "k-1", baseURL: "https://laya.test/base" };

const CLEARED_ENV = [
  "LAYA_API_KEY",
  "LAYA_BASE_URL",
  "LAYA_MODEL",
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

await runSuite(async () => {
  await readPathSection();
  await baseUrlSection();
  await templateSection();
  await formatterSection();
  await errorClassificationSection();
  await errorMessageSection();
  await configuredCoreSection();
  await configuredWireSection();
  await configuredBehaviourSection();
});
