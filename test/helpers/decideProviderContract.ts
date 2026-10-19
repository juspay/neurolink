import { readFileSync } from "node:fs";
import { join } from "node:path";
import { isDeepStrictEqual } from "node:util";
import type { ConfiguredDecisionProvider } from "../../dist/providers/configuredDecision.js";
import type {
  DecideCatalogJson,
  DecideFormatterName,
  DecisionQuestionMap,
  DecisionRequest,
  DecisionResult,
} from "../../dist/types/index.js";
import {
  installMockFetch,
  record,
  type TestRecord,
} from "../utils/mockFetch.js";
import {
  DECIDE_FIXTURE_ROOT,
  parseDecideContractFixture,
  readDecideContractFixture,
  type DecideContractFixture,
} from "./decideContractFixture.js";

/**
 * The generic decide provider contract: one loop of cases that every
 * catalog-described decide provider must pass.
 *
 * Determinism exception to CLAUDE.md rule 15 (listed in the `allow` array of
 * neurolink/e2e-tests-only in eslint.config.js): ConfiguredDecisionProvider is
 * not exported from dist/index.js, and the cases need replies and
 * environments a live endpoint cannot produce on demand. Nothing here touches
 * the network: the provider sends through the repo's proxyFetch, which calls
 * the global fetch when no proxy variable is set and also after a proxy
 * attempt fails (so a variable left set is no protection), which is why every
 * case clears all eight, sets fake credentials and .test hosts, and installs a
 * mock.
 *
 * A harness that intercepts nothing must not pass, so a case fails unless it
 * made an assertion AND at least one request reached its mock. A case that
 * makes no request by design is declared `static` and must reach no mock: it
 * runs under a fetch that only counts the attempt and refuses it, so a static
 * case that asks with no mock installed fails and never reaches the host. The
 * cases that expect no request use `ctx.refusedWithoutRequest`, which proves
 * the mock is live with a positive control first.
 */

type Route = Parameters<typeof installMockFetch>[0][number];
type RespondSpec = Exclude<Route["respond"], (call: never) => unknown>;
type Calls = ReturnType<typeof installMockFetch>["calls"];
type ErrorFixture = DecideContractFixture["errors"][number];

export const QUESTIONS = {
  urgent: { type: "boolean", instructions: "Is this urgent?" },
  team: {
    type: "choice",
    instructions: "Which team?",
    criteria: { billing: "money", technical: "bugs", sales: "pricing" },
  },
  mood: {
    type: "score",
    instructions: "How angry?",
    criteria: ["calm", "annoyed", "angry"],
  },
} satisfies DecisionQuestionMap;

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
export const asRecord = (v: unknown): Record<string, unknown> =>
  isRecord(v) ? v : {};

// createProxyFetch picks its proxied path for any of these, in either case.
const PROXY_ENV = [
  "HTTPS_PROXY",
  "https_proxy",
  "HTTP_PROXY",
  "http_proxy",
  "ALL_PROXY",
  "all_proxy",
  "SOCKS_PROXY",
  "socks_proxy",
] as const;

type EnvScope = {
  set: (name: string, value: string | undefined) => void;
  restore: () => void;
};

function createEnvScope(): EnvScope {
  const original = new Map<string, string | undefined>();
  const write = (name: string, value: string | undefined): void => {
    if (value === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = value;
    }
  };
  return {
    set: (name, value) => {
      if (!original.has(name)) {
        original.set(name, process.env[name]);
      }
      write(name, value);
    },
    restore: () => {
      for (const [name, value] of original) {
        write(name, value);
      }
      original.clear();
    },
  };
}

export type EnvNames = {
  readonly apiKey: string;
  readonly baseURL: string;
  readonly model: string;
};

// Derived here, not imported from the loader: a bug in the loader's convention
// would otherwise produce the same wrong name on both sides and still pass.
export function decideEnvNames(entry: DecideCatalogJson): EnvNames {
  const stem = entry.id.toUpperCase().replace(/-/g, "_");
  const override = entry.wire.envOverrides;
  return {
    apiKey: override?.apiKey ?? `${stem}_API_KEY`,
    baseURL: override?.baseURL ?? `${stem}_BASE_URL`,
    model: override?.model ?? `${stem}_MODEL`,
  };
}

/**
 * An entry as the loader holds it, and the variables the descriptor builder
 * derives for it. Both come from dist, like the provider class, so a suite can
 * check text written for an author (a scaffolded checklist) against what the
 * registry will read, without importing dist itself.
 */
export async function parseDecideEntry(
  raw: unknown,
  source: string,
): Promise<DecideCatalogJson> {
  const { isDecideCatalogEntry, parseCatalogEntry } =
    await import("../../dist/providers/catalog/schema.js");
  const entry = parseCatalogEntry(raw, source);
  if (!isDecideCatalogEntry(entry)) {
    throw new Error(`${source} parsed as a chat entry, not a decide entry`);
  }
  return entry;
}

export async function descriptorEnvVars(entry: DecideCatalogJson) {
  const { buildDecideDescriptor } =
    await import("../../dist/factories/providerDescriptors.js");
  return buildDecideDescriptor(entry).envVars;
}

function contractValues(entry: DecideCatalogJson) {
  const baseURL = `https://${entry.id}.contract.test/base`;
  return {
    names: decideEnvNames(entry),
    apiKey: `test-fake-${entry.id}-credential`,
    baseURL,
    endpoint: entry.decide.endpoint.split("{baseURL}").join(baseURL),
  };
}

export type Failure = {
  readonly threw: boolean;
  readonly kind?: string;
  readonly retryable?: boolean;
  readonly status?: number;
  readonly message: string;
  // The provider's own message in the cause, without the "[provider] " prefix
  // the thrown error adds, so a check on it cannot pass on the prefix alone.
  readonly causeMessage?: string;
  readonly cause: string;
  // False when the cause could not be turned into JSON (a cycle, a BigInt).
  // `cause` then holds a fixed word instead, and nothing can be said about
  // what the cause carries.
  readonly causeReadable: boolean;
};

const UNREADABLE_CAUSE = "unreadable cause";

// A fixed fallback, never the engine's own text: V8's message for a cycle
// names the properties it closes on.
function serialized(value: unknown): string | undefined {
  try {
    return JSON.stringify(value) ?? "";
  } catch {
    return undefined;
  }
}

// Whether a failure's cause may hold the secret. A cause that cannot be read
// cannot be shown free of it, so it counts as holding it.
export function causeCarries(
  failure: Pick<Failure, "cause" | "causeReadable">,
  secret: string,
): boolean {
  return !failure.causeReadable || failure.cause.includes(secret);
}

async function failureOf(run: () => Promise<unknown>): Promise<Failure> {
  try {
    await run();
  } catch (error) {
    const raw = isRecord(error) ? error.cause : undefined;
    const cause: Record<string, unknown> = isRecord(raw) ? raw : {};
    const text = serialized(raw);
    return {
      threw: true,
      kind: typeof cause.kind === "string" ? cause.kind : undefined,
      retryable:
        typeof cause.retryable === "boolean" ? cause.retryable : undefined,
      status: typeof cause.status === "number" ? cause.status : undefined,
      message: error instanceof Error ? error.message : String(error),
      causeMessage:
        typeof cause.message === "string" ? cause.message : undefined,
      cause: text ?? UNREADABLE_CAUSE,
      causeReadable: text !== undefined,
    };
  }
  return { threw: false, message: "", cause: "", causeReadable: true };
}

// A failure message must not carry a credential: a URL can hold user:pass@ or
// ?token=, and even the fake key is not printed.
function shown(value: unknown, apiKey: string): string {
  return (JSON.stringify(value) ?? "undefined")
    .split(apiKey)
    .join("<fake key>")
    .replace(/(\w:\/\/)[^/@\s"\\]*@/g, "$1<userinfo>@")
    .replace(/(\w:\/\/[^\s"\\?]*)\?[^\s"\\]*/g, "$1?<query>");
}

const fillApiKey = (text: string, apiKey: string): string =>
  text.split("{apiKey}").join(apiKey);

function substitute(value: unknown, apiKey: string): unknown {
  if (typeof value === "string") {
    return fillApiKey(value, apiKey);
  }
  if (Array.isArray(value)) {
    return value.map((v: unknown) => substitute(v, apiKey));
  }
  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, substitute(v, apiKey)]),
    );
  }
  return value;
}

export type CaseContext = {
  readonly entry: DecideCatalogJson;
  readonly fixture: DecideContractFixture;
  readonly names: EnvNames;
  readonly apiKey: string;
  readonly baseURL: string;
  readonly endpoint: string;
  readonly env: EnvScope;
  ok: (condition: boolean, label: string) => void;
  eq: <T>(actual: T, expected: T, label: string) => void;
  fill: (text: string) => string;
  route: (respond: Route["respond"]) => Route;
  success: () => RespondSpec;
  failing: (f: ErrorFixture) => RespondSpec;
  mock: <T>(
    routes: readonly Route[],
    run: (calls: Calls) => Promise<T>,
  ) => Promise<T>;
  /**
   * Positive control for a "no request" case: a fully configured provider
   * sends one request into this mock, and the mock must record it. Call it
   * first, before the case changes the environment, inside the same `mock`.
   * That request counts in `calls`, so a case that then asserts the count
   * should use `refusedWithoutRequest`, which accounts for it.
   */
  control: (calls: Calls) => Promise<void>;
  provider: (model?: string) => Promise<ConfiguredDecisionProvider>;
  send: (
    target: ConfiguredDecisionProvider,
    over?: Partial<DecisionRequest>,
  ) => Promise<DecisionResult>;
  ask: (
    over?: Partial<DecisionRequest>,
    model?: string,
  ) => Promise<DecisionResult>;
  failureOf: (run: () => Promise<unknown>) => Promise<Failure>;
  refused: (
    over?: Partial<DecisionRequest>,
    model?: string,
  ) => Promise<Failure>;
  /**
   * The pattern for every "refused, nothing sent" case: run the positive
   * control, remember how many requests the mock holds, run `arrange` (a case
   * that must change the environment first does it here, after the control),
   * assert the call is refused, and assert the count did not move.
   */
  refusedWithoutRequest: (
    calls: Calls,
    over?: Partial<DecisionRequest>,
    model?: string,
    arrange?: () => void,
  ) => Promise<Failure>;
};

export type ContractCase = {
  readonly name: string;
  readonly run: (ctx: CaseContext) => Promise<void>;
  /**
   * The case makes no request by design (it reads the entry, not the wire).
   * A static case must reach no mock; any other case must reach one.
   */
  readonly static?: true;
};

type Tally = { assertions: number; reached: number };

// Loaded once, before the first case clears anything: a module that reads a
// .env while it loads would otherwise write back into the cleared scope.
let providerClass: Promise<
  typeof import("../../dist/providers/configuredDecision.js").ConfiguredDecisionProvider
> | null = null;
function loadProviderClass() {
  providerClass ??= import("../../dist/providers/configuredDecision.js").then(
    (loaded) => loaded.ConfiguredDecisionProvider,
  );
  return providerClass;
}

// Loaded with the provider class for the same reason: before the first case
// clears anything. It is the documented pre-flight estimator, the one the
// provider's own refusal uses.
let estimatorClass: Promise<
  typeof import("../../dist/index.js").estimateDecisionStateTokens
> | null = null;
export function loadEstimator() {
  estimatorClass ??= import("../../dist/index.js").then(
    (loaded) => loaded.estimateDecisionStateTokens,
  );
  return estimatorClass;
}

function createContext(
  entry: DecideCatalogJson,
  fixture: DecideContractFixture,
  env: EnvScope,
  tally: Tally,
): CaseContext {
  const { names, apiKey, baseURL, endpoint } = contractValues(entry);
  const provider = async (
    model?: string,
  ): Promise<ConfiguredDecisionProvider> => {
    const Built = await loadProviderClass();
    return new Built(entry, model);
  };
  const send = (
    target: ConfiguredDecisionProvider,
    over: Partial<DecisionRequest> = {},
  ) =>
    target.decide({
      state: "short",
      questions: { urgent: QUESTIONS.urgent },
      ...over,
    });
  const ask = async (over: Partial<DecisionRequest> = {}, model?: string) =>
    send(await provider(model), over);
  const ok = (condition: boolean, label: string): void => {
    tally.assertions += 1;
    if (!condition) {
      throw new Error(`expect failed: ${label}`);
    }
  };
  const eq = <T>(actual: T, expected: T, label: string): void =>
    ok(
      actual === expected,
      `${label}: expected ${shown(expected, apiKey)}, got ${shown(actual, apiKey)}`,
    );
  // A case that hard-codes one entry's variable name would pass on that entry
  // and quietly leave the real variable alone on another. The name is not
  // printed, and the check is not an assertion: setting a variable measures
  // nothing.
  const ownNames: ReadonlySet<string> = new Set([
    ...PROXY_ENV,
    names.apiKey,
    names.baseURL,
    names.model,
  ]);
  const scope: EnvScope = {
    set: (name, value) => {
      if (!ownNames.has(name)) {
        throw new Error(
          "expect failed: a case may set only a proxy variable or the entry's own variables",
        );
      }
      env.set(name, value);
    },
    restore: env.restore,
  };
  const control = async (calls: Calls): Promise<void> => {
    ok(
      PROXY_ENV.every((name) => process.env[name] === undefined),
      "control: no proxy variable is set",
    );
    const before = calls.length;
    // What the reply says is not the point; that the mock saw it is.
    await failureOf(() => ask());
    const sent = calls.slice(before);
    ok(
      sent.length > 0,
      "control: a configured provider must reach the mock, or nothing here is intercepted",
    );
    eq(sent[0].method, "POST", "control: the request method");
    // Not eq(): a self-hosted base URL can carry user:pass@ or ?token=.
    ok(
      sent[0].url === endpoint,
      "control: the request goes to the endpoint built from the fake base URL",
    );
    ok(
      Object.values(sent[0].headers).some((value) => value.includes(apiKey)),
      "control: the request carries the fake key, not an ambient one",
    );
  };
  const refused = async (
    over?: Partial<DecisionRequest>,
    model?: string,
  ): Promise<Failure> => {
    const failure = await failureOf(() => ask(over, model));
    ok(failure.threw, "the call must be refused, but it succeeded");
    return failure;
  };
  return {
    entry,
    fixture,
    names,
    apiKey,
    baseURL,
    endpoint,
    env: scope,
    ok,
    eq,
    fill: (text) => fillApiKey(text, apiKey),
    route: (respond) => ({ method: "POST", url: endpoint, respond }),
    success: () => ({
      status: 200,
      json: fixture.success.body,
      headers: fixture.success.headers,
    }),
    failing: (f) => ({
      status: f.status,
      json: substitute(f.body, apiKey),
      headers: f.headers,
    }),
    mock: async (routes, run) => {
      const handle = installMockFetch([...routes]);
      try {
        return await run(handle.calls);
      } finally {
        tally.reached += handle.calls.length;
        handle.unset();
      }
    },
    control,
    provider,
    send,
    ask,
    failureOf,
    refused,
    refusedWithoutRequest: async (calls, over, model, arrange) => {
      await control(calls);
      const reached = calls.length;
      arrange?.();
      const failure = await refused(over, model);
      eq(calls.length, reached, "the refused call sent no request");
      return failure;
    },
  };
}

export async function runContractCases(
  entry: DecideCatalogJson,
  fixture: DecideContractFixture,
  cases: readonly ContractCase[],
  results: TestRecord[],
  options: { quiet?: boolean } = {},
): Promise<void> {
  const { names, apiKey, baseURL } = contractValues(entry);
  const report = (name: string, ok: boolean, reason?: string): void => {
    if (options.quiet === true) {
      results.push({ name, ok, reason });
    } else {
      record(results, name, ok, reason);
    }
  };
  await loadProviderClass();
  await loadEstimator();
  const seen = new Set<string>();
  for (const contractCase of cases) {
    // Results are found by name, so a repeat would hide one of the two.
    if (seen.has(contractCase.name)) {
      report(
        contractCase.name,
        false,
        "a case with this name was already run, so its result would hide this one",
      );
      continue;
    }
    seen.add(contractCase.name);
    const env = createEnvScope();
    const tally: Tally = { assertions: 0, reached: 0 };
    const fetchBefore = globalThis.fetch;
    // A static case has no mock of its own to be counted by, so a provider it
    // calls would reach the real host. The tripwire counts the attempt and
    // refuses it; a mock the case installs saves and restores this fetch.
    const tripwire: typeof fetch | undefined =
      contractCase.static === true
        ? async () => {
            tally.reached += 1;
            throw new Error("a static case made a request");
          }
        : undefined;
    const fetchDuring = tripwire ?? fetchBefore;
    try {
      for (const name of PROXY_ENV) {
        env.set(name, undefined);
      }
      env.set(names.apiKey, apiKey);
      env.set(names.baseURL, baseURL);
      env.set(names.model, undefined);
      globalThis.fetch = fetchDuring;
      await contractCase.run(createContext(entry, fixture, env, tally));
      if (tally.assertions === 0) {
        throw new Error("the case made no assertion, so it measured nothing");
      }
      if (contractCase.static === true) {
        if (tally.reached !== 0) {
          throw new Error(
            "the case is declared static, so it must send nothing, but a request was attempted",
          );
        }
      } else if (tally.reached === 0) {
        throw new Error(
          "no request reached the mock, so the case cannot tell an intercepting harness from one that intercepts nothing",
        );
      }
      if (globalThis.fetch !== fetchDuring) {
        throw new Error("the case left its fetch mock installed");
      }
      report(contractCase.name, true);
    } catch (error) {
      report(
        contractCase.name,
        false,
        error instanceof Error ? error.message : String(error),
      );
    } finally {
      globalThis.fetch = fetchBefore;
      env.restore();
    }
  }
}

function credentialCases(entry: DecideCatalogJson): ContractCase[] {
  // Derived here, like decideEnvNames, so a slip in the loader shows.
  const credentialsKey =
    entry.credentialsKey ??
    entry.id.replace(/-([a-z0-9])/g, (_m, c: string) => c.toUpperCase());
  const refusedUntilSet = (
    which: "apiKey" | "baseURL",
    kind: string,
    what: string,
    alsoBaseURL: boolean,
  ): ContractCase => ({
    name: `DECIDE ${entry.id}: no ${what}, no request`,
    run: async (ctx) => {
      const configured = (): void => {
        ctx.env.set(ctx.names.apiKey, ctx.apiKey);
        ctx.env.set(ctx.names.baseURL, ctx.baseURL);
      };
      // With both missing the key is named, not the base URL: a provider that
      // checked the base URL first would say invalid_request here.
      const permutations: ReadonlyArray<{
        readonly arrange: () => void;
        readonly both: boolean;
      }> = [
        {
          arrange: () => ctx.env.set(ctx.names[which], undefined),
          both: false,
        },
        { arrange: () => ctx.env.set(ctx.names[which], "   "), both: false },
        ...(alsoBaseURL
          ? [
              {
                arrange: () => {
                  ctx.env.set(ctx.names.apiKey, undefined);
                  ctx.env.set(ctx.names.baseURL, undefined);
                },
                both: true,
              },
            ]
          : []),
      ];
      await ctx.mock([ctx.route(ctx.success())], async (calls) => {
        for (const { arrange, both } of permutations) {
          configured();
          const failure = await ctx.refusedWithoutRequest(
            calls,
            undefined,
            undefined,
            arrange,
          );
          ctx.eq(failure.kind, kind, `a blank or missing ${what} is ${kind}`);
          ctx.ok(
            failure.message.includes(ctx.names[which]),
            `the message names ${ctx.names[which]}`,
          );
          ctx.ok(
            failure.message.includes(`credentials.${credentialsKey}.${which}`),
            `the message names credentials.${credentialsKey}.${which}`,
          );
          if (both) {
            ctx.ok(
              !failure.message.includes(ctx.names.baseURL),
              `with both missing the message names the key only, not ${ctx.names.baseURL}`,
            );
          }
          for (const secret of [ctx.apiKey, ctx.baseURL]) {
            ctx.ok(
              !failure.message.includes(secret) &&
                !causeCarries(failure, secret),
              "the refusal repeats no credential and no base URL",
            );
          }
        }
      });
    },
  });
  return [
    refusedUntilSet(
      "apiKey",
      "authentication",
      "key",
      entry.decide.baseURLRequired === true,
    ),
    ...(entry.decide.baseURLRequired === true
      ? [refusedUntilSet("baseURL", "invalid_request", "base URL", false)]
      : []),
  ];
}

// Leading and trailing whitespace, so a provider that trims the state shows.
const HOSTILE_TEXT =
  "  \n{baseURL} {model} {accountId} {apiKey} </script> 'quoted' \"double\" \t\n";
const HOSTILE_OBJECT = { note: "{baseURL}", list: [1, "{model}"] };

// How a dialect lays a request out on the wire, and what a reply with no
// answer container looks like. The cases below read the body through this, so
// they do not assume System One's `state` and question map. Written here, not
// imported, like ruleMatches: a layout read from the code under test would
// agree with its mistakes. A new dialect adds its row to WIRE_VIEWS.
type WireView = {
  // What a boolean question is called on this wire.
  readonly booleanType: string;
  // The body's field names, sorted and joined, for a request that does or does
  // not name a model.
  readonly fields: (modelSent: boolean) => string;
  // The questions the body carries, keyed by the id the caller gave them.
  readonly questionsOf: (
    body: Record<string, unknown>,
  ) => Record<string, unknown>;
  // Where the body carries the state, and what it carries for a given state.
  readonly stateOf: (body: Record<string, unknown>) => unknown;
  readonly stateSent: (state: DecisionRequest["state"]) => unknown;
  // 200 replies that hold no answer container on this wire.
  readonly noContainerReplies: readonly RespondSpec[];
  // The text and the images of a body that carries images, when the dialect
  // has them in the state; undefined when the body is not in that form.
  readonly mediaOf?: (
    body: Record<string, unknown>,
  ) =>
    | { readonly text: string; readonly images: readonly string[] }
    | undefined;
};

const SYSTEM_ONE_VIEW: WireView = {
  booleanType: "noul",
  fields: (modelSent) =>
    modelSent ? "model,questions,state" : "questions,state",
  questionsOf: (body) => asRecord(body.questions),
  stateOf: (body) => body.state,
  stateSent: (state) => state,
  noContainerReplies: [
    { status: 200, json: {} },
    { status: 200, json: { answers: [] } },
    { status: 200, json: { answers: "none" } },
    { status: 200, json: null },
    { status: 200, text: "OK" },
  ],
};

// OpenAI's wire: the questions are a list that names each one, the state is
// `input` (text, or one user message when images ride along), and the answers
// are a list. An empty list is a valid reply (every question unanswered), so
// it is not among the replies without a container.
const OPENAI_DECISIONS_VIEW: WireView = {
  booleanType: "predicate",
  fields: (modelSent) =>
    modelSent ? "input,model,questions" : "input,questions",
  questionsOf: (body) =>
    Object.fromEntries(
      (Array.isArray(body.questions) ? body.questions : [])
        .filter(isRecord)
        .flatMap(
          (question): Array<[string, unknown]> =>
            typeof question.name === "string"
              ? [[question.name, question]]
              : [],
        ),
    ),
  stateOf: (body) => body.input,
  stateSent: (state) =>
    typeof state === "string" ? state : JSON.stringify(state),
  noContainerReplies: [
    { status: 200, json: {} },
    { status: 200, json: { answers: {} } },
    { status: 200, json: { answers: "none" } },
    { status: 200, json: null },
    { status: 200, text: "OK" },
  ],
  mediaOf: (body) => {
    const message: unknown = Array.isArray(body.input)
      ? body.input.length === 1
        ? body.input[0]
        : undefined
      : undefined;
    const parts =
      isRecord(message) && message.role === "user"
        ? message.content
        : undefined;
    if (!Array.isArray(parts) || !parts.every(isRecord)) {
      return undefined;
    }
    return {
      text: parts
        .flatMap((part) =>
          part.type === "input_text" && typeof part.text === "string"
            ? [part.text]
            : [],
        )
        .join(""),
      images: parts.flatMap((part): string[] =>
        part.type === "input_image" && typeof part.image_url === "string"
          ? [part.image_url]
          : [],
      ),
    };
  },
};

const WIRE_VIEWS: ReadonlyMap<string, WireView> = new Map([
  ["system-one", SYSTEM_ONE_VIEW],
  ["openai-decisions", OPENAI_DECISIONS_VIEW],
]);

// A dialect with no row still runs the cases under System One's layout, as
// before; its wire case is what fails, by name.
const wireViewOf = (entry: DecideCatalogJson): WireView =>
  WIRE_VIEWS.get(entry.decide.dialect) ?? SYSTEM_ONE_VIEW;

// Labels name the spelling in words: the spelled value itself is not printed.
const SPELLINGS: ReadonlyArray<readonly [string, (base: string) => string]> = [
  ["one trailing slash", (base) => `${base}/`],
  ["several trailing slashes", (base) => `${base}///`],
  ["spaces around one trailing slash", (base) => `  ${base}/  `],
  ["trailing whitespace and no slash", (base) => `${base} \t`],
];

// A header value, a URL or a body value in a request can come from somewhere
// other than the fake credentials (a provider that read an ambient variable),
// and `ctx.eq` masks only the fake key. Those are judged with `ctx.ok` and a
// fixed label, which prints nothing taken from the request.
function wireCases(
  entry: DecideCatalogJson,
  fixture: DecideContractFixture,
): ContractCase[] {
  const id = entry.id;
  const { placement, alias } = entry.decide.model;
  const defaultIsAlias =
    placement === "body-unless-alias" && entry.models.default === alias;
  const knownView = WIRE_VIEWS.get(entry.decide.dialect);
  const view = knownView ?? SYSTEM_ONE_VIEW;
  const booleanWire = knownView?.booleanType;
  const bodyOf = (calls: Calls) => asRecord(calls[0]?.bodyJson);
  // Written here, not imported, like the views: the credential header and the
  // state text an entry's `authHeader` and `stateEncoding` ask for, judged
  // without reading the provider's own code. The case keeps its old name, which
  // other suites pin, although an `x-api-key` entry carries no Bearer token.
  const keyInHeader = entry.decide.authHeader === "x-api-key";
  const textState = entry.decide.stateEncoding === "text";
  const stateSent = (state: DecisionRequest["state"]): unknown =>
    textState
      ? typeof state === "string"
        ? state
        : JSON.stringify(state)
      : view.stateSent(state);
  // Any request is answered, so a misrouted one is recorded and judged under
  // a fixed label instead of failing inside the mock, whose error repeats it.
  const served = (ctx: CaseContext): Route[] => [
    { url: /./, respond: ctx.success() },
  ];
  // Field names are the provider's own, not ambient data.
  const expectFields = (
    ctx: CaseContext,
    body: Record<string, unknown>,
    modelSent: boolean,
  ): void =>
    ctx.eq(
      Object.keys(body).sort().join(","),
      view.fields(modelSent),
      "the body carries exactly these fields",
    );
  const expectDefaultModel = (
    ctx: CaseContext,
    body: Record<string, unknown>,
  ): void => {
    expectFields(ctx, body, !defaultIsAlias);
    if (defaultIsAlias) {
      ctx.ok(
        !("model" in body),
        "the default is the alias, so no model is sent",
      );
    } else {
      ctx.ok(body.model === entry.models.default, "the default model is sent");
    }
  };
  const wire: ContractCase = {
    name: `DECIDE ${id}: wire request (route, POST, bearer, model, boolean as ${booleanWire ?? "the dialect's type"})`,
    run: async (ctx) => {
      ctx.ok(
        booleanWire !== undefined,
        `no boolean wire type is known for dialect "${entry.decide.dialect}": add a row for it to WIRE_VIEWS`,
      );
      await ctx.mock(served(ctx), async (calls) => {
        await ctx.ask({ questions: QUESTIONS });
        ctx.eq(calls.length, 1, "requests that reached the mock");
        ctx.eq(calls[0].method, "POST", "method");
        ctx.ok(
          calls[0].url === ctx.endpoint,
          "endpoint from the template and the base URL",
        );
        if (keyInHeader) {
          ctx.ok(
            calls[0].headers["x-api-key"] === ctx.apiKey,
            "credential in the x-api-key header",
          );
          ctx.ok(
            calls[0].headers.authorization === undefined,
            "no Authorization header beside x-api-key",
          );
        } else {
          ctx.ok(
            calls[0].headers.authorization === `Bearer ${ctx.apiKey}`,
            "bearer credential",
          );
          ctx.ok(
            calls[0].headers["x-api-key"] === undefined,
            "no x-api-key header beside the Bearer token",
          );
        }
        ctx.ok(
          calls[0].headers["content-type"] === "application/json",
          "content type",
        );
        expectDefaultModel(ctx, bodyOf(calls));
        const questions = view.questionsOf(bodyOf(calls));
        ctx.ok(
          asRecord(questions.urgent).type === booleanWire,
          `boolean sent as ${booleanWire}`,
        );
        ctx.ok(asRecord(questions.team).type === "choice", "choice unchanged");
        ctx.ok(asRecord(questions.mood).type === "score", "score unchanged");
      });
    },
  };
  const readBack: ContractCase = {
    name: `DECIDE ${id}: answers, model and request id are read back`,
    run: async (ctx) => {
      const expected = fixture.success.expected;
      await ctx.mock(served(ctx), async (calls) => {
        const result = await ctx.ask({ questions: QUESTIONS });
        ctx.eq(calls.length, 1, "requests that reached the mock");
        ctx.ok(isDeepStrictEqual(result.answers, expected.answers), "answers");
        ctx.ok(result.model === expected.model, "the model that answered");
        ctx.ok(result.provider === id, "provider name");
        ctx.ok(
          expected.requestId !== undefined ||
            !entry.decide.requestIdHeaders?.length,
          "the fixture pins a request id because the entry reads request-id headers",
        );
        if (expected.requestId !== undefined) {
          ctx.ok(
            result.requestId === expected.requestId,
            "request id from the reply headers",
          );
        }
        if (expected.inputTokens !== undefined) {
          ctx.eq(
            result.usage.inputTokens,
            expected.inputTokens,
            "input tokens",
          );
        }
        // The default model is usually what the reply names, so asking for it
        // proves nothing: a provider that echoes the model it asked for reads
        // nothing from the reply. Ask for names the reply does not give.
        const asked = await ctx.ask({
          questions: QUESTIONS,
          model: "contract-asked-model",
        });
        ctx.ok(
          asked.model === expected.model,
          "the model the reply names, not the one asked",
        );
        if (placement === "body-unless-alias" && alias !== undefined) {
          ctx.ok(
            expected.model !== alias,
            "the fixture names a model other than the alias, or asking for the alias proves nothing",
          );
          const viaAlias = await ctx.ask({ questions: QUESTIONS }, alias);
          ctx.ok(
            viaAlias.model === expected.model,
            "the model the reply names, not the alias asked",
          );
        }
      });
    },
  };
  const defaultModel: ContractCase = {
    name: `DECIDE ${id}: default model is sent`,
    run: async (ctx) => {
      // A stale value first, then empty: the empty variable must not hide the
      // default, and a case that blanks some other variable shows.
      ctx.env.set(ctx.names.model, "contract-stale-model");
      ctx.env.set(ctx.names.model, "");
      await ctx.mock(served(ctx), async (calls) => {
        await ctx.ask();
        ctx.eq(calls.length, 1, "requests that reached the mock");
        expectDefaultModel(ctx, bodyOf(calls));
      });
    },
  };
  const override: ContractCase = {
    name: `DECIDE ${id}: model env var overrides the default`,
    run: async (ctx) => {
      ctx.env.set(ctx.names.model, "contract-override-model");
      await ctx.mock(served(ctx), async (calls) => {
        await ctx.ask();
        // An explicit model beats the variable, at construction and per request.
        await ctx.ask({}, "contract-ctor-model");
        await ctx.ask({ model: "contract-request-model" });
        ctx.eq(calls.length, 3, "requests that reached the mock");
        const sent = [
          [
            "the variable names the model",
            "contract-override-model",
            asRecord(calls[0].bodyJson),
          ],
          [
            "a model given to the constructor beats the variable",
            "contract-ctor-model",
            asRecord(calls[1].bodyJson),
          ],
          [
            "a model given per request beats the variable",
            "contract-request-model",
            asRecord(calls[2].bodyJson),
          ],
        ] as const;
        for (const [label, model, body] of sent) {
          ctx.ok(body.model === model, label);
          expectFields(ctx, body, true);
        }
      });
    },
  };
  const verbatim: ContractCase = {
    name: `DECIDE ${id}: state text is sent verbatim`,
    run: async (ctx) => {
      await ctx.mock(served(ctx), async (calls) => {
        await ctx.ask({ state: HOSTILE_TEXT });
        await ctx.ask({ state: HOSTILE_OBJECT });
        ctx.eq(calls.length, 2, "requests that reached the mock");
        ctx.ok(
          calls[0].url === ctx.endpoint,
          "template-looking state does not change the route",
        );
        ctx.ok(
          isDeepStrictEqual(
            view.stateOf(bodyOf(calls)),
            stateSent(HOSTILE_TEXT),
          ),
          "text state",
        );
        ctx.ok(
          isDeepStrictEqual(
            view.stateOf(asRecord(calls[1].bodyJson)),
            stateSent(HOSTILE_OBJECT),
          ),
          "object state",
        );
      });
    },
  };
  const spelling: ContractCase = {
    name: `DECIDE ${id}: base URL spellings reach one endpoint`,
    run: async (ctx) => {
      // A stale base URL first, then each spelling over it: a case that sets
      // some other variable keeps the stale one, and the endpoint shows it.
      ctx.env.set(ctx.names.baseURL, "https://stale.contract.test/stale");
      for (const [label, spell] of SPELLINGS) {
        ctx.env.set(ctx.names.baseURL, spell(ctx.baseURL));
        await ctx.mock(served(ctx), async (calls) => {
          await ctx.ask();
          ctx.eq(calls.length, 1, `${label}: requests that reached the mock`);
          ctx.ok(calls[0].url === ctx.endpoint, `${label}: the endpoint`);
        });
      }
    },
  };
  const aliasCase = (named: string): ContractCase => {
    // The match is exact: a near name goes to the wire as the caller wrote it.
    const near = [
      ...new Set([
        `${named}-other`,
        `other-${named}`,
        named.toUpperCase(),
        named.toLowerCase(),
        ` ${named}`,
        `${named} `,
      ]),
    ].filter((name) => name !== named);
    return {
      name: `DECIDE ${id}: the alias model is left out of the body`,
      run: async (ctx) => {
        await ctx.mock(served(ctx), async (calls) => {
          await ctx.ask({}, named);
          await ctx.ask({ model: named });
          for (const other of near) {
            await ctx.ask({ model: other });
          }
          ctx.eq(
            calls.length,
            2 + near.length,
            "requests that reached the mock",
          );
          ctx.ok(
            !("model" in asRecord(calls[0].bodyJson)),
            "a model given to the constructor",
          );
          ctx.ok(
            !("model" in asRecord(calls[1].bodyJson)),
            "a model given per request",
          );
          expectFields(ctx, asRecord(calls[0].bodyJson), false);
          expectFields(ctx, asRecord(calls[1].bodyJson), false);
          near.forEach((other, index) => {
            const body = asRecord(calls[2 + index].bodyJson);
            ctx.ok(
              body.model === other,
              `a near name is sent as given: ${JSON.stringify(other)}`,
            );
            expectFields(ctx, body, true);
          });
        });
      },
    };
  };
  // For a dialect whose view can read images out of the state: how they leave
  // the provider, from the caller's bytes to the body. The expected data URL is
  // built here from the file's bytes, not taken from the provider.
  const imageCase = (
    mediaOf: NonNullable<WireView["mediaOf"]>,
    refusesVideo: boolean,
  ): ContractCase => ({
    name: `DECIDE ${id}: images ride in the input as one user message`,
    run: async (ctx) => {
      const png = readFileSync(join(DECIDE_FIXTURE_ROOT, "xor", "blue.png"));
      const dataUrl = `data:image/png;base64,${png.toString("base64")}`;
      await ctx.mock(served(ctx), async (calls) => {
        await ctx.ask({ state: "short note", images: [png] });
        await ctx.ask({ state: "short note", images: [png, png] });
        ctx.eq(calls.length, 2, "requests that reached the mock");
        const one = mediaOf(asRecord(calls[0].bodyJson));
        ctx.ok(one !== undefined, "the input is one user message");
        ctx.ok(one?.text === "short note", "the state text rides with them");
        ctx.ok(
          isDeepStrictEqual(one?.images, [dataUrl]),
          "one image, as a base64 data URL",
        );
        ctx.ok(
          isDeepStrictEqual(mediaOf(asRecord(calls[1].bodyJson))?.images, [
            dataUrl,
            dataUrl,
          ]),
          "two images, in order",
        );
        expectFields(ctx, asRecord(calls[0].bodyJson), true);
        if (refusesVideo) {
          const failure = await ctx.refusedWithoutRequest(calls, {
            video: png,
          });
          ctx.ok(
            failure.kind === "invalid_request" && failure.retryable === false,
            "a video is refused as an invalid request",
          );
        }
      });
    },
  });
  const media = entry.decisionLimits?.media;
  return [
    wire,
    readBack,
    defaultModel,
    override,
    verbatim,
    ...(entry.decide.baseURLNormalize?.includes("strip-trailing-slash")
      ? [spelling]
      : []),
    ...(placement === "body-unless-alias" && alias !== undefined
      ? [aliasCase(alias)]
      : []),
    ...(view.mediaOf !== undefined && media !== undefined
      ? [imageCase(view.mediaOf, media.video !== true)]
      : []),
  ];
}

type ErrorRule = DecideCatalogJson["decide"]["errors"]["rules"][number];

// Statuses a vendor could answer with that a rule list rarely names; the first
// one no rule matches is sent to prove the default kind.
const STATUS_PROBES = [400, 404, 409, 418, 422, 451];

const listedStatuses = (rule: ErrorRule): readonly number[] =>
  typeof rule.status === "number" ? [rule.status] : (rule.status ?? []);

const statusMatches = (rule: ErrorRule, status: number): boolean =>
  listedStatuses(rule).includes(status) ||
  (rule.statusMin !== undefined && status >= rule.statusMin);

// A pattern is searched in the start of the message only, so an error body of
// any length costs the same.
const MESSAGE_WINDOW = 2000;

const patternMatches = (rule: ErrorRule, message: string): boolean =>
  rule.messagePattern === undefined ||
  new RegExp(rule.messagePattern, "i").test(message.slice(0, MESSAGE_WINDOW));

// Written here, not imported: the same matcher on both sides would agree on a
// mistake. A rule matches on its status and, when it has a pattern, on the
// message the engine classified by.
function ruleMatches(
  rule: ErrorRule,
  status: number,
  message: string,
): boolean {
  return statusMatches(rule, status) && patternMatches(rule, message);
}

const retriesByDefault = (kind: string): boolean =>
  kind === "rate_limit" || kind === "overloaded" || kind === "server";

type BodyShape = DecideCatalogJson["decide"]["errors"]["bodyShapes"][number];

// Own properties of plain objects only, as the engine reads a path: a segment
// through an array, or an empty one, reads nothing.
function readAt(value: unknown, path: string): unknown {
  const segments = path.split(".");
  if (segments.some((segment) => segment === "")) {
    return undefined;
  }
  return segments.reduce<unknown>(
    (current, segment) =>
      isRecord(current) && Object.hasOwn(current, segment)
        ? current[segment]
        : undefined,
    value,
  );
}

// A shape that sets a kind or a retry flag decides them for every body it
// reads, so such a body shows what that shape does, not what the rule list or
// the default does. Written here, not imported, like ruleMatches.
function shapeDecides(shapes: readonly BodyShape[], body: unknown): boolean {
  return shapes.some((shape) => {
    if (shape.kind === undefined && shape.retryable === undefined) {
      return false;
    }
    const value = readAt(body, shape.path);
    return shape.isArray === true
      ? Array.isArray(value) && shape.formatter !== undefined
      : typeof value === "string" && value.length > 0;
  });
}

// What a body shape with a formatter turns its value into. Written here, not
// imported, like ruleMatches: the text a pattern is judged against must not
// come from the code under test. A Record keyed by the type, so a formatter
// added to DecideFormatterName fails to compile here until it is copied.
const FORMATTERS: Readonly<
  Record<DecideFormatterName, (value: unknown) => string>
> = {
  "fastapi-validation": (value) => {
    const items: readonly unknown[] = Array.isArray(value) ? value : [];
    const fields = items
      .filter(isRecord)
      .map((item) => {
        const loc = Array.isArray(item.loc)
          ? item.loc
              .filter((p) => typeof p === "string" || typeof p === "number")
              .join(".")
          : "";
        const msg = typeof item.msg === "string" ? item.msg : "invalid";
        return loc ? `${loc}: ${msg}` : msg;
      })
      .slice(0, 5);
    return `Request failed validation — ${fields.join("; ") || "unspecified field"}`;
  },
};

function shapeText(shape: BodyShape, value: unknown): string | undefined {
  if (shape.isArray === true) {
    return Array.isArray(value) && shape.formatter !== undefined
      ? FORMATTERS[shape.formatter](value)
      : undefined;
  }
  if (typeof value !== "string" || value.length === 0) {
    return undefined;
  }
  return shape.formatter === undefined
    ? value
    : FORMATTERS[shape.formatter](value);
}

// The text the provider classifies a reply by: the first body shape that reads
// something, with the key hidden, else the fallback sentence naming the
// provider and the status. The key is the only redaction mirrored (the
// placeholder stands for the test key). The engine's other scrubs, such as
// the cut after a "Received API Key =" echo, are not, so a row whose pattern
// match depends on one fails here rather than passing silently.
function classifiedMessage(
  entry: DecideCatalogJson,
  f: Pick<ErrorFixture, "status" | "body">,
): string {
  const fallback = `${entry.displayName} request failed with HTTP ${f.status}`;
  for (const shape of entry.decide.errors.bodyShapes) {
    const text = shapeText(shape, readAt(f.body, shape.path));
    if (text !== undefined) {
      return text.split("{apiKey}").join("[redacted]").trim() || fallback;
    }
  }
  return fallback;
}

const describeRule = (rule: ErrorRule): string => {
  const statusParts = [
    ...(rule.status === undefined
      ? []
      : [`status ${JSON.stringify(rule.status)}`]),
    ...(rule.statusMin === undefined ? [] : [`status >= ${rule.statusMin}`]),
  ];
  const parts = [
    ...(statusParts.length === 0 ? [] : [statusParts.join(" or ")]),
    ...(rule.messagePattern === undefined
      ? []
      : [`message matches /${rule.messagePattern}/i`]),
  ];
  return `${parts.join(" and ")} -> ${rule.kind}`;
};

// A reply that echoes the key more than once: a redaction that stops at the
// first occurrence leaves the second.
const KEY_TWICE = "{apiKey} and again {apiKey}";

// Two directions are checked on purpose. Each body is fed to the provider and
// must produce the kind, retry flag and status the fixture declares (the
// fixture is the independent oracle, copied from what the vendor returned).
// Each rule must then be the first match for at least one body whose declared
// outcome agrees with the rule, so a rule whose kind or status was changed, or
// that no body reaches, fails by name. A rule that leaves its retry flag to the
// default is compared against that default. A body reaches a rule by its status
// and, when the rule has a messagePattern, by the message the provider
// classifies it by (see classifiedMessage).
//
// Provider-derived values are judged with `ctx.ok` and a fixed label: a label
// that printed them would print what a provider read from somewhere else, and
// the redaction case echoes the fake key on purpose.
function errorCases(
  entry: DecideCatalogJson,
  fixture: DecideContractFixture,
): ContractCase[] {
  const id = entry.id;
  const { rules, default: fallbackKind } = entry.decide.errors;
  // The rule that decides a fixture body: its status and the message the
  // provider classifies that body by.
  const firstRule = (f: Pick<ErrorFixture, "status" | "body">): number => {
    const message = classifiedMessage(entry, f);
    return rules.findIndex((rule) => ruleMatches(rule, f.status, message));
  };
  // A status probed with the empty body {}, which the provider classifies by
  // its fallback sentence.
  const firstRuleOfProbe = (status: number): number =>
    firstRule({ status, body: {} });
  const perFixture = fixture.errors.map(
    (f): ContractCase => ({
      name: `DECIDE ${id}: error "${f.label}" (${f.provenance}) -> ${f.expect.kind}`,
      run: async (ctx) => {
        await ctx.mock([ctx.route(ctx.failing(f))], async () => {
          const failure = await ctx.refused();
          ctx.ok(
            failure.kind === f.expect.kind,
            `the kind is ${f.expect.kind}`,
          );
          ctx.ok(
            failure.retryable === f.expect.retryable,
            `the retry flag is ${f.expect.retryable}`,
          );
          ctx.ok(
            failure.status === f.status,
            `the status ${f.status} is kept on the error`,
          );
          for (const text of f.expect.messageIncludes ?? []) {
            ctx.ok(
              failure.message.includes(ctx.fill(text)),
              `the message keeps ${JSON.stringify(text)}`,
            );
          }
          for (const text of f.expect.messageExcludes ?? []) {
            ctx.ok(
              !failure.message.includes(ctx.fill(text)),
              `the message drops ${JSON.stringify(text)}`,
            );
          }
        });
      },
    }),
  );
  // Reads the entry and the fixture only, so it sends nothing. The schema has
  // no upper edge (no statusMax), and the fixture reader takes only 400-599, so
  // the edges below are the ones a body can carry. A rule with a messagePattern
  // also needs a body its pattern rejects, which falls to a later rule or the
  // default: without it, a harness that read the status alone would pass.
  const perRule = rules.map((rule, index): ContractCase => {
    const patterned = rule.messagePattern !== undefined;
    return {
      name: `DECIDE ${id}: error rule #${index} (${describeRule(rule)}) is exercised by a fixture${patterned ? ", one that matches the pattern and one that does not" : ""}`,
      static: true,
      run: async (ctx) => {
        const reaching = fixture.errors.filter((f) => firstRule(f) === index);
        const carries = (status: number): boolean =>
          reaching.some((f) => f.status === status);
        const missing: string[] = [];
        if (reaching.length === 0) {
          missing.push(
            patterned
              ? "any body whose status and message this rule decides first"
              : "any status this rule decides first",
          );
        }
        for (const status of listedStatuses(rule)) {
          if (status >= 400 && !carries(status)) {
            missing.push(`the listed status ${status}`);
          }
        }
        if (rule.statusMin !== undefined) {
          const edge = rule.statusMin;
          // An earlier rule that decides the edge on its status alone leaves
          // nothing to pin; one with a pattern decides only some messages.
          const decidedEarlier = rules
            .slice(0, index)
            .some(
              (r) => r.messagePattern === undefined && statusMatches(r, edge),
            );
          if (edge >= 400 && !decidedEarlier && !carries(edge)) {
            missing.push(`the lowest status ${edge}`);
          }
          if (edge < 599 && !reaching.some((f) => f.status > edge)) {
            missing.push(`a status above ${edge}`);
          }
          if (
            edge - 1 >= 400 &&
            !fixture.errors.some(
              (f) => f.status === edge - 1 && firstRule(f) !== index,
            )
          ) {
            missing.push(
              `status ${edge - 1}, just below it (decided by another rule or the default)`,
            );
          }
        }
        if (
          patterned &&
          !fixture.errors.some(
            (f) =>
              statusMatches(rule, f.status) &&
              !patternMatches(rule, classifiedMessage(entry, f)) &&
              (firstRule(f) === -1 || firstRule(f) > index),
          )
        ) {
          missing.push(
            "a body with a status this rule covers and a message the pattern does not match, decided by a later rule or the default",
          );
        }
        ctx.ok(
          missing.length === 0,
          `no fixture status reaches this rule first, missing: ${missing.join("; ")}. Add error bodies with those statuses`,
        );
        for (const f of reaching) {
          ctx.eq(
            f.expect.kind,
            rule.kind,
            `fixture "${f.label}" kind agrees with the rule`,
          );
          ctx.eq(
            f.expect.retryable,
            rule.retryable ?? retriesByDefault(rule.kind),
            `fixture "${f.label}" retry flag agrees with the rule`,
          );
        }
      },
    };
  });
  // The default case below asks the provider about the entry's own default, so
  // it cannot disagree with it. This one is the independent side: a fixture
  // body outside every rule must declare that kind. A body that a body shape
  // with a kind or a retry flag reads does not count: it gets them from the
  // shape, so it would agree with the default by chance.
  const defaultPinned: ContractCase = {
    name: `DECIDE ${id}: error default kind ${fallbackKind} is pinned by a fixture`,
    static: true,
    run: async (ctx) => {
      const outside = fixture.errors.filter((f) => firstRule(f) === -1);
      const counted = outside.filter(
        (f) => !shapeDecides(entry.decide.errors.bodyShapes, f.body),
      );
      const statuses = (list: readonly ErrorFixture[]): string =>
        list.map((f) => f.status).join(", ") || "none";
      ctx.ok(
        counted.some(
          (f) =>
            f.expect.kind === fallbackKind &&
            f.expect.retryable === retriesByDefault(fallbackKind),
        ),
        `no fixture body with a status outside every rule, and no body shape deciding its kind, declares the default kind ${fallbackKind}, retryable ${retriesByDefault(fallbackKind)} (statuses outside every rule: ${statuses(outside)}; counted: ${statuses(counted)})`,
      );
    },
  };
  const defaultCase = (status: number): ContractCase => ({
    name: `DECIDE ${id}: status ${status} outside every rule is ${fallbackKind}`,
    run: async (ctx) => {
      await ctx.mock([ctx.route({ status, json: {} })], async () => {
        const failure = await ctx.refused();
        ctx.ok(
          failure.kind === fallbackKind,
          `the default kind is ${fallbackKind}`,
        );
        ctx.ok(
          failure.retryable === retriesByDefault(fallbackKind),
          "the default kind keeps its retry flag",
        );
      });
    },
  });
  // The latched call is a refusal that sends nothing, but it must come from
  // the provider that was rejected, which `refusedWithoutRequest` cannot do (it
  // builds a new provider through `ask`), so the request count is asserted here.
  // A call that fails for a retrying kind sends more than one request, so the
  // count of one call is measured from the first and the later counts are
  // multiples of it.
  const latch = (
    rejected: readonly ErrorFixture[],
    benign: readonly ErrorFixture[],
  ): ContractCase => ({
    name: `DECIDE ${id}: a rejected key latches the provider, a new one tries again`,
    run: async (ctx) => {
      const sentRight = (f: ErrorFixture, sent: number): boolean =>
        f.expect.retryable ? sent > 1 : sent === 1;
      for (const f of rejected) {
        await ctx.mock([ctx.route(ctx.failing(f))], async (calls) => {
          const provider = await ctx.provider();
          const first = await ctx.failureOf(() => ctx.send(provider));
          const perCall = calls.length;
          ctx.ok(
            first.kind === "authentication",
            `status ${f.status}: the first call is refused as authentication`,
          );
          ctx.ok(
            sentRight(f, perCall),
            `status ${f.status}: the first call is sent once unless the body is retryable`,
          );
          const second = await ctx.failureOf(() => ctx.send(provider));
          ctx.ok(
            second.kind === "authentication",
            `status ${f.status}: the latched call is refused as authentication`,
          );
          ctx.eq(
            calls.length,
            perCall,
            `status ${f.status}: requests after the latched call`,
          );
          await ctx.refused();
          ctx.eq(
            calls.length,
            2 * perCall,
            `status ${f.status}: requests after a new provider asked`,
          );
        });
      }
      for (const f of benign) {
        await ctx.mock([ctx.route(ctx.failing(f))], async (calls) => {
          const provider = await ctx.provider();
          await ctx.failureOf(() => ctx.send(provider));
          const perCall = calls.length;
          ctx.ok(
            sentRight(f, perCall),
            `${f.expect.kind}: a call is sent once unless the body is retryable`,
          );
          await ctx.failureOf(() => ctx.send(provider));
          ctx.eq(
            calls.length,
            2 * perCall,
            `${f.expect.kind}: requests after two calls that failed for another reason`,
          );
        });
      }
    },
  });
  const echoing = fixture.errors.filter((e) =>
    JSON.stringify(e.body).includes("{apiKey}"),
  );
  const redaction: ContractCase = {
    name: `DECIDE ${id}: a key echoed by the server or the network is scrubbed`,
    run: async (ctx) => {
      for (const f of echoing) {
        const twice = {
          ...f,
          body: JSON.parse(
            JSON.stringify(f.body).split("{apiKey}").join(KEY_TWICE),
          ) as unknown,
        };
        await ctx.mock([ctx.route(ctx.failing(twice))], async () => {
          const failure = await ctx.refused();
          ctx.ok(
            !failure.message.includes(ctx.apiKey) &&
              !causeCarries(failure, ctx.apiKey),
            `a key echoed by the server (${f.label}) is gone from the message and the cause`,
          );
        });
      }
      const echo = ctx.route(() => {
        throw new Error(
          `connect refused for ${ctx.endpoint} with key ${ctx.apiKey}, then again with ${ctx.apiKey}`,
        );
      });
      await ctx.mock([echo], async () => {
        const failure = await ctx.refused();
        ctx.ok(
          failure.kind === "network",
          "a transport failure is a network error",
        );
        ctx.ok(
          !failure.message.includes(ctx.apiKey) &&
            !causeCarries(failure, ctx.apiKey),
          "a key echoed by the network is gone from the message and the cause",
        );
      });
    },
  };
  // The probes first, so an entry that leaves one of them out is judged as
  // before; the rest of 400-599 in order, so a rule list that names all six
  // still has its default pinned.
  const unmatched = [
    ...STATUS_PROBES,
    ...Array.from({ length: 200 }, (_, i) => 400 + i),
  ].find((status) => firstRuleOfProbe(status) === -1);
  const firstOfEach = <K>(
    bodies: readonly ErrorFixture[],
    keyOf: (f: ErrorFixture) => K,
  ): ErrorFixture[] =>
    bodies.filter(
      (f, at) => bodies.findIndex((g) => keyOf(g) === keyOf(f)) === at,
    );
  // Every status that is rejected as a key latches; one body per kind that is
  // not must not.
  const rejecting = firstOfEach(
    fixture.errors.filter((f) => f.expect.kind === "authentication"),
    (f) => f.status,
  );
  const benign = firstOfEach(
    fixture.errors.filter((f) => f.expect.kind !== "authentication"),
    (f) => f.expect.kind,
  );
  return [
    ...perFixture,
    ...perRule,
    ...(unmatched === undefined ? [] : [defaultPinned, defaultCase(unmatched)]),
    ...(rejecting.length === 0 ? [] : [latch(rejecting, benign)]),
    redaction,
  ];
}

// The smallest length of an ASCII state that the estimator puts over `limit`.
// The window is found with the estimator rather than computed from a
// characters-per-token ratio, because the ratio is the estimator's business.
// The search starts at the limit and doubles until the estimator crosses it, so
// an estimator that charges little per character cannot leave the bisection
// below the window and make it report a length that is not over.
export function firstOverWindow(
  limit: number,
  estimate: (state: string) => number,
): number {
  const ceiling = 1 << 24;
  let high = Math.max(limit, 1);
  while (estimate("a".repeat(high)) <= limit) {
    if (high >= ceiling) {
      throw new Error(
        `the estimator puts no state of ${high} characters or fewer over ${limit} tokens`,
      );
    }
    high *= 2;
  }
  let low = 1;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (estimate("a".repeat(mid)) > limit) {
      high = mid;
    } else {
      low = mid + 1;
    }
  }
  return low;
}

// The answer, or undefined when the call was refused. A case that expects an
// answer judges "no answer" under a fixed label instead of printing what the
// provider said.
const answerOf = (
  ctx: CaseContext,
  over?: Partial<DecisionRequest>,
  model?: string,
): Promise<DecisionResult | undefined> =>
  ctx.ask(over, model).then(
    (result) => result,
    () => undefined,
  );

// How many times a call is sent is the provider's own contract (one retry),
// shared by every catalog decide provider; what is retried is the entry's.
function retryCases(
  entry: DecideCatalogJson,
  fixture: DecideContractFixture,
): ContractCase[] {
  const id = entry.id;
  const retried = (f: ErrorFixture): ContractCase => {
    const retries = f.expect.retryable ? 1 : 0;
    return {
      name: `DECIDE ${id}: ${retries === 1 ? "retryable" : "non-retryable"} error "${f.label}" is ${retries === 1 ? "retried once" : "not retried"}`,
      run: async (ctx) => {
        await ctx.mock([ctx.route(ctx.failing(f))], async (calls) => {
          const failure = await ctx.refused();
          ctx.ok(
            failure.kind === f.expect.kind,
            `the kind after the retry is ${f.expect.kind}`,
          );
          ctx.ok(
            failure.retryable === f.expect.retryable,
            `the retry flag is ${f.expect.retryable}`,
          );
          ctx.eq(
            calls.length,
            1 + retries,
            retries === 1 ? "one retry, then stop" : "sent once",
          );
        });
      },
    };
  };
  const recovers = (f: ErrorFixture): ContractCase => ({
    name: `DECIDE ${id}: a retry that recovers returns the answers`,
    run: async (ctx) => {
      let attempts = 0;
      const flaky = ctx.route(() => {
        attempts += 1;
        return attempts === 1 ? ctx.failing(f) : ctx.success();
      });
      await ctx.mock([flaky], async (calls) => {
        const result = await answerOf(ctx, { questions: QUESTIONS });
        ctx.eq(calls.length, 2, "one retry");
        ctx.ok(result !== undefined, "the second reply is answered");
        ctx.ok(
          isDeepStrictEqual(
            result?.answers,
            ctx.fixture.success.expected.answers,
          ),
          "the answers of the second reply",
        );
        ctx.ok(
          calls[1]?.bodyText === calls[0]?.bodyText,
          "the retry resends the same request",
        );
      });
    },
  });
  // The loop is in the shared base class, whatever the entry says: a request
  // that never gets an answer is retried once and reported as a network error.
  const network: ContractCase = {
    name: `DECIDE ${id}: a network failure is retried once`,
    run: async (ctx) => {
      const down = ctx.route(() => {
        throw new Error("connect refused");
      });
      await ctx.mock([down], async (calls) => {
        const failure = await ctx.refused();
        ctx.ok(failure.kind === "network", "a transport failure is network");
        ctx.ok(failure.retryable === true, "a transport failure is retryable");
        ctx.eq(calls.length, 2, "one retry, then stop");
      });
    },
  };
  const transient = fixture.errors.find((f) => f.expect.retryable);
  const permanent = fixture.errors.find((f) => !f.expect.retryable);
  return [
    ...(transient ? [retried(transient), recovers(transient)] : []),
    ...(permanent ? [retried(permanent)] : []),
    network,
  ];
}

const HTML_PAGE = "<html><body>Bad Gateway</body></html>";

// Text the harness put in a body, and when a message repeating it has surfaced
// the body (whatever markup it dropped on the way) rather than said something
// of its own.
export type OddEcho = {
  readonly text: string;
  // "words": the text as whole words, so "troops" does not repeat "oops".
  // "key": for a word that is also ordinary English ("answers must not be
  // nested"); only the body's own syntax counts: the whole message, the name
  // in quotes, or the name before a colon or an equals sign.
  readonly as: "words" | "key";
  // The status this text is the reason phrase of. A provider may say it when
  // that is the status the harness sent.
  readonly reasonFor?: number;
};

export type OddBody = {
  readonly shape: RespondSpec;
  readonly echoes: readonly OddEcho[];
};

// Error bodies a provider has no answer for. The harness owns these inputs, so
// what a message may not repeat is known.
export const ODD_BODIES: readonly OddBody[] = [
  {
    shape: { text: HTML_PAGE, contentType: "text/html" },
    echoes: [{ text: "bad gateway", as: "words", reasonFor: 502 }],
  },
  { shape: { text: "" }, echoes: [] },
  { shape: { json: null }, echoes: [] },
  { shape: { json: [] }, echoes: [] },
  { shape: { json: "oops" }, echoes: [{ text: "oops", as: "words" }] },
  { shape: { json: 42 }, echoes: [] },
  {
    shape: { json: { error: { message: 12 }, detail: { nested: true } } },
    echoes: [{ text: "nested", as: "key" }],
  },
];

// Markup is a tag of the page the harness sent, in any case. Other angle
// brackets are text: "expected <number>" is a legitimate provider message.
const PAGE_TAGS = [
  ...new Set(
    Array.from(HTML_PAGE.matchAll(/<\/?([a-z][a-z0-9]*)/gi), (m) =>
      m[1].toLowerCase(),
    ),
  ),
];
const PAGE_MARKUP = new RegExp(`</?(?:${PAGE_TAGS.join("|")})\\b`, "i");
const phrasePattern = (text: string): string =>
  text
    .trim()
    .split(/\s+/)
    .map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("\\s+");
const ODD_ECHOES = ODD_BODIES.flatMap((body) => body.echoes).map((echo) => {
  const name = phrasePattern(echo.text);
  return {
    reasonFor: echo.reasonFor,
    pattern: new RegExp(
      echo.as === "words"
        ? `\\b${name}\\b`
        : `^\\W*${name}\\W*$|["'\`]${name}["'\`]|\\b${name}\\s*[:=]`,
      "i",
    ),
  };
});

const entitiesDecoded = (text: string): string =>
  text
    .replace(/&(?:lt|#0*60|#x0*3c);/gi, "<")
    .replace(/&(?:gt|#0*62|#x0*3e);/gi, ">")
    .replace(/&(?:amp|#0*38|#x0*26);/gi, "&");
const percentDecoded = (text: string): string => {
  try {
    return decodeURIComponent(text);
  } catch {
    return text.replace(/%3c/gi, "<").replace(/%3e/gi, ">");
  }
};
// Entities and percent escapes, a few rounds deep, until nothing changes.
function decoded(text: string): string {
  let current = text;
  for (let round = 0; round < 3; round += 1) {
    const next = percentDecoded(entitiesDecoded(current));
    if (next === current) {
      break;
    }
    current = next;
  }
  return current;
}

export type OddBodyProblem = "empty" | "placeholder" | "markup" | "echo";

// What is wrong with the message a provider gave for a body it could not
// read, or undefined when it is plain readable text. The words are fixed
// labels, so a case can name the problem without printing the message.
// `status` is the one the harness sent: its reason phrase is the provider's
// own text there.
export function oddBodyProblem(
  failure: Pick<Failure, "causeMessage" | "message">,
  status?: number,
): OddBodyProblem | undefined {
  const own = failure.causeMessage;
  if (own === undefined || own.replace(/[\s\p{Cf}]/gu, "") === "") {
    return "empty";
  }
  if (/^(?:undefined|null|\[object Object\])$/i.test(own.trim())) {
    return "placeholder";
  }
  const said = [own, failure.message].map(decoded);
  if (said.some((text) => PAGE_MARKUP.test(text))) {
    return "markup";
  }
  return ODD_ECHOES.some(
    ({ reasonFor, pattern }) =>
      (reasonFor === undefined || reasonFor !== status) &&
      said.some((text) => pattern.test(text)),
  )
    ? "echo"
    : undefined;
}

function malformedCases(
  entry: DecideCatalogJson,
  fixture: DecideContractFixture,
): ContractCase[] {
  const id = entry.id;
  const anchor =
    fixture.errors.find((f) => !f.expect.retryable) ?? fixture.errors[0];
  const oddBodies: ContractCase = {
    name: `DECIDE ${id}: odd error bodies keep the status classification`,
    run: async (ctx) => {
      for (const { shape } of ODD_BODIES) {
        const label = JSON.stringify(shape);
        await ctx.mock(
          [ctx.route({ ...shape, status: anchor.status })],
          async () => {
            const failure = await ctx.refused();
            ctx.ok(
              failure.kind === anchor.expect.kind,
              `the kind is ${anchor.expect.kind} for ${label}`,
            );
            ctx.ok(
              failure.retryable === anchor.expect.retryable,
              `the retry flag is ${anchor.expect.retryable} for ${label}`,
            );
            ctx.ok(
              failure.status === anchor.status,
              `the status ${anchor.status} is kept for ${label}`,
            );
            // The thrown message always carries the "[provider] " prefix, so the
            // provider's own message in the cause is what must have words in
            // it. Neither may hold the page's markup, however it is spelt or
            // encoded, nor repeat the body's own text.
            const problem = oddBodyProblem(failure, anchor.status);
            ctx.ok(
              problem === undefined,
              `a readable message, with no markup, for ${label}${problem === undefined ? "" : ` (${problem})`}`,
            );
          },
        );
      }
    },
  };
  const noAnswers: ContractCase = {
    name: `DECIDE ${id}: a 200 without an answers container is a server error, not retried`,
    run: async (ctx) => {
      for (const reply of wireViewOf(entry).noContainerReplies) {
        const label = JSON.stringify(reply);
        await ctx.mock([ctx.route(reply)], async (calls) => {
          const failure = await ctx.refused();
          ctx.ok(failure.kind === "server", `the kind is server for ${label}`);
          ctx.ok(failure.retryable === false, `not retryable for ${label}`);
          ctx.eq(calls.length, 1, `sent once for ${label}`);
        });
      }
    },
  };
  return [oddBodies, noAnswers];
}

// A state of N ASCII characters is an estimator input; the same N characters
// inside an object are serialized first, so each shape has its own edge.
const STATE_SHAPES: ReadonlyArray<
  readonly [string, (text: string) => DecisionRequest["state"]]
> = [
  ["a text state", (text) => text],
  ["an object state", (text) => ({ notes: text })],
  ["a nested object state", (text) => ({ outer: { notes: text } })],
  ["an array state", (text) => [text]],
];

const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

// The provider reads limits and the timeout from its descriptor and these
// cases read them from the entry, so an entry and a descriptor that disagree
// turn a case red; that is what keeps the two in step.
function limitCases(entry: DecideCatalogJson): ContractCase[] {
  const id = entry.id;
  const limits = entry.decisionLimits;
  const advisory = limits?.advisory === true;
  const windowTokens =
    limits?.models?.[entry.models.default]?.maxStateTokens ??
    limits?.maxStateTokens;
  // The default model's case keeps the name the suite looks up; the others
  // are named for their model and say "window of", never "state window of".
  // Every other model that declares a window of its own gets a case.
  const otherWindows = Object.entries(limits?.models ?? {})
    .filter(([model]) => model !== entry.models.default)
    .flatMap(
      ([model, own]): Array<readonly [string, number]> =>
        typeof own.maxStateTokens === "number"
          ? [[model, own.maxStateTokens]]
          : [],
    );
  const windowCase = (tokens: number, model?: string): ContractCase => ({
    name: `DECIDE ${id}: ${model === undefined ? "state" : `model "${model}"`} window of ${tokens} tokens ${advisory ? "is left to the server" : "is enforced before any request"}`,
    run: async (ctx) => {
      const estimate = await loadEstimator();
      // A model other than the default reaches the provider two ways, and the
      // window must follow it both ways: the constructor's model, and the
      // request's own override, which wins for that call.
      const deliveries: ReadonlyArray<{
        readonly how: string;
        readonly request: Partial<DecisionRequest>;
        readonly built: string | undefined;
      }> =
        model === undefined
          ? [{ how: "", request: {}, built: undefined }]
          : [
              { how: "", request: {}, built: model },
              {
                how: " as a request override",
                request: { model },
                built: undefined,
              },
            ];
      await ctx.mock([ctx.route(ctx.success())], async (calls) => {
        for (const { how, request, built } of deliveries) {
          for (const [shape, wrap] of STATE_SHAPES) {
            const over = firstOverWindow(tokens, (text) =>
              estimate(wrap(text), limits),
            );
            const before = calls.length;
            const atWindow = await answerOf(
              ctx,
              { state: wrap("a".repeat(over - 1)), ...request },
              built,
            );
            ctx.ok(
              atWindow !== undefined,
              `${shape} at the window${how} is sent`,
            );
            ctx.eq(
              calls.length,
              before + 1,
              `${shape} at the window${how} reaches the mock`,
            );
            const state = wrap("a".repeat(over));
            if (advisory) {
              const answered = await answerOf(
                ctx,
                { state, ...request },
                built,
              );
              ctx.ok(
                answered !== undefined,
                `${shape} over an advisory window${how} is left to the server`,
              );
              ctx.eq(
                calls.length,
                before + 2,
                `${shape} over an advisory window${how} reaches the mock`,
              );
              continue;
            }
            const failure = await ctx.refusedWithoutRequest(
              calls,
              { state, ...request },
              built,
            );
            ctx.ok(
              failure.kind === "max_tokens_exceeded",
              `${shape} over the window${how} is refused as too large`,
            );
            ctx.ok(
              failure.retryable === false,
              `${shape} over the window${how} is not retryable`,
            );
            ctx.ok(
              failure.message.includes(String(tokens)),
              `the message names the window of ${tokens}${how}`,
            );
          }
        }
      });
    },
  });
  const capCase = (cap: number): ContractCase => ({
    name: `DECIDE ${id}: question cap, ${cap} sent and ${cap + 1} ${advisory ? "left to the server" : "refused"}`,
    run: async (ctx) => {
      const questions = (count: number) =>
        Object.fromEntries(
          Array.from({ length: count }, (_, i) => [`q${i}`, QUESTIONS.urgent]),
        );
      await ctx.mock([ctx.route(ctx.success())], async (calls) => {
        const atCap = await answerOf(ctx, { questions: questions(cap) });
        ctx.ok(atCap !== undefined, "a batch at the cap is sent");
        ctx.eq(calls.length, 1, "a batch at the cap reaches the mock");
        ctx.eq(
          Object.keys(
            wireViewOf(entry).questionsOf(asRecord(calls[0]?.bodyJson)),
          ).length,
          cap,
          "every question is sent",
        );
        if (advisory) {
          const answered = await answerOf(ctx, {
            questions: questions(cap + 1),
          });
          ctx.ok(
            answered !== undefined,
            "an advisory cap is left to the server",
          );
          ctx.eq(calls.length, 2, "an advisory cap reaches the mock");
          return;
        }
        const failure = await ctx.refusedWithoutRequest(calls, {
          questions: questions(cap + 1),
        });
        ctx.ok(
          failure.kind === "max_tokens_exceeded",
          "a batch over the cap is refused as too many questions",
        );
        ctx.ok(
          failure.retryable === false,
          "a batch over the cap is not retryable",
        );
        ctx.ok(
          failure.message.includes(String(cap)),
          `the message names the cap of ${cap}`,
        );
      });
    },
  });
  const noMedia: ContractCase = {
    name: `DECIDE ${id}: media is refused when the entry declares none`,
    run: async (ctx) => {
      await ctx.mock([ctx.route(ctx.success())], async (calls) => {
        for (const [what, media] of [
          ["an image", { images: [PNG_SIGNATURE] }],
          ["a video", { video: PNG_SIGNATURE }],
        ] as const) {
          const failure = await ctx.refusedWithoutRequest(calls, media);
          ctx.ok(
            failure.kind === "invalid_request",
            `${what} is refused as an invalid request`,
          );
          ctx.ok(failure.retryable === false, `${what} is not retryable`);
        }
      });
    },
  };
  const emptyQuestions: ContractCase = {
    name: `DECIDE ${id}: an empty question map is refused with no request`,
    run: async (ctx) => {
      await ctx.mock([ctx.route(ctx.success())], async (calls) => {
        const failure = await ctx.refusedWithoutRequest(calls, {
          questions: {},
        });
        ctx.ok(
          failure.kind === "invalid_request",
          "an empty question map is refused as an invalid request",
        );
        ctx.ok(
          failure.retryable === false,
          "an empty question map is not retryable",
        );
      });
    },
  };
  // The provider falls back to its descriptor's decideMs. An entry that
  // declares none has no value to pin: the base class then supplies a longer
  // default of its own, which is not this contract's to fix. The state here is
  // far under 1,000 tokens, so decideMsPerKStateTokens adds nothing to it.
  const timeoutCase: ContractCase = {
    name: `DECIDE ${id}: default timeout is decideMs and a caller's timeoutMs wins`,
    run: async (ctx) => {
      const declared = entry.timeouts?.decideMs;
      const callerMs = declared === 1234 ? 4321 : 1234;
      const created: number[] = [];
      const original = AbortSignal.timeout;
      AbortSignal.timeout = (ms: number) => {
        created.push(ms);
        return original.call(AbortSignal, ms);
      };
      try {
        await ctx.mock([ctx.route(ctx.success())], async () => {
          // The first timeout made during a call is the provider's own.
          const timeoutOf = async (
            over?: Partial<DecisionRequest>,
          ): Promise<number | undefined> => {
            const before = created.length;
            const answered = await answerOf(ctx, over);
            ctx.ok(answered !== undefined, "the call is answered");
            return created[before];
          };
          const byDefault = await timeoutOf();
          const byCaller = await timeoutOf({ timeoutMs: callerMs });
          ctx.ok(
            byDefault !== undefined,
            "a call with no timeout set gets one",
          );
          if (declared !== undefined) {
            ctx.ok(
              byDefault === declared,
              `the default timeout is the entry's decideMs, ${declared}`,
            );
          }
          ctx.ok(
            byCaller === callerMs,
            `a caller's timeoutMs, ${callerMs}, is the timeout used`,
          );
        });
      } finally {
        AbortSignal.timeout = original;
      }
    },
  };
  return [
    emptyQuestions,
    timeoutCase,
    ...(windowTokens === undefined ? [] : [windowCase(windowTokens)]),
    ...otherWindows.map(([model, tokens]) => windowCase(tokens, model)),
    ...(limits?.maxQuestions === undefined
      ? []
      : [capCase(limits.maxQuestions)]),
    ...(limits?.media === undefined ? [noMedia] : []),
  ];
}

export function buildContractCases(
  entry: DecideCatalogJson,
  fixture: DecideContractFixture,
): readonly ContractCase[] {
  return [
    ...credentialCases(entry),
    ...wireCases(entry, fixture),
    ...errorCases(entry, fixture),
    ...retryCases(entry, fixture),
    ...malformedCases(entry, fixture),
    ...limitCases(entry),
  ];
}

// The first brace pair in the endpoint that this helper does not fill, or
// undefined. Only {baseURL} is filled; another placeholder would be sent as
// written to a host that does not exist.
export function strayPlaceholder(endpoint: string): string | undefined {
  return /\{(?!baseURL\})[^}]*\}/.exec(endpoint)?.[0];
}

// Reads the fixture the loop needs: the one given, or the one on disk for the
// entry's id. Every way it can fail is a problem to report, never a throw.
export function loadContractFixture(
  entry: DecideCatalogJson,
  given: DecideContractFixture | undefined,
  root: string = DECIDE_FIXTURE_ROOT,
): { fixture: DecideContractFixture } | { problem: string } {
  try {
    const fixture =
      given === undefined
        ? readDecideContractFixture(entry.id, root)
        : parseDecideContractFixture(given, `${entry.id} (inline)`);
    return fixture.id === entry.id
      ? { fixture }
      : {
          problem: `fixture id "${fixture.id}" is not the entry id "${entry.id}"`,
        };
  } catch (error) {
    return { problem: error instanceof Error ? error.message : String(error) };
  }
}

// What the loop must have covered, whatever it was given. A loop that was
// handed nothing, planned nothing, or lost a result must not read as green.
export function loopCoverageProblem(c: {
  entries: number;
  minEntries: number;
  planned: number;
  ran: number;
}): string | undefined {
  if (c.entries < c.minEntries) {
    return `the loop covered ${c.entries} decide entries, expected at least ${c.minEntries}`;
  }
  if (c.entries > 0 && c.planned === 0) {
    return "the loop planned no cases for the entries it was given";
  }
  return c.ran === c.planned
    ? undefined
    : `the loop recorded ${c.ran} results for ${c.planned} planned cases`;
}

export type DecideContractRun = {
  readonly planned: number;
  readonly recorded: readonly TestRecord[];
};

export async function runDecideProviderContract(
  entry: DecideCatalogJson,
  options: {
    results?: TestRecord[];
    fixture?: DecideContractFixture;
    quiet?: boolean;
  } = {},
): Promise<DecideContractRun> {
  const results = options.results ?? [];
  const start = results.length;
  const loaded = loadContractFixture(entry, options.fixture);
  const stray = strayPlaceholder(entry.decide.endpoint);
  if (!("fixture" in loaded) || stray !== undefined) {
    const problem =
      "fixture" in loaded
        ? `endpoint placeholder ${stray} is not filled by this helper`
        : loaded.problem;
    const name = `DECIDE ${entry.id}: contract can run`;
    if (options.quiet === true) {
      results.push({ name, ok: false, reason: problem });
    } else {
      record(results, name, false, problem);
    }
    return { planned: 1, recorded: results.slice(start) };
  }
  const cases = buildContractCases(entry, loaded.fixture);
  await runContractCases(entry, loaded.fixture, cases, results, {
    quiet: options.quiet,
  });
  return { planned: cases.length, recorded: results.slice(start) };
}
