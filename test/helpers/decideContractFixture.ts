import { readFileSync, realpathSync, statSync } from "node:fs";
import { dirname, isAbsolute, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import type { DecisionErrorKind } from "../../dist/types/index.js";

/**
 * Shape of test/fixtures/decide/<id>/contract.json: the data the generic decide
 * loop cannot invent. The catalog file describes the provider; this file holds
 * what the vendor sent, so nothing about tests lives in the catalog.
 *
 *   success.body      the vendor's 200 reply to the canonical three-question request
 *   success.headers   reply headers the entry reads (the request id)
 *   success.expected  what decide() must return for it: the normalised answers,
 *                     the model that answered, the request id, the input tokens
 *   errors[]          one reply per failure the entry classifies. `provenance` is
 *                     "seen-live" for a body captured from the vendor and
 *                     "stand-in" for one written from its docs. Every
 *                     decide.errors.rules entry needs at least one body whose
 *                     status that rule is the first to match. A body that
 *                     triggers a bodyShapes kind override must use a status no
 *                     rule matches.
 *
 * Inside any string, "{apiKey}" is replaced with the test key at run time, so a
 * reply that echoes the key can be written down without a real secret.
 *
 * The reader is strict because a fixture is where a captured vendor reply
 * lands: a field it does not know is refused (a misspelt messageExcludes would
 * otherwise silently drop the check), a prototype-named key or a non-finite
 * number is refused at any depth, and a string shaped like a credential is
 * refused so a live key echoed in a captured body cannot be committed.
 */
export type DecideErrorProvenance = "seen-live" | "stand-in";

export type DecideErrorFixture = {
  readonly label: string;
  readonly provenance: DecideErrorProvenance;
  readonly status: number;
  readonly headers?: Readonly<Record<string, string>>;
  readonly body: unknown;
  readonly expect: {
    readonly kind: DecisionErrorKind;
    readonly retryable: boolean;
    readonly messageIncludes?: readonly string[];
    readonly messageExcludes?: readonly string[];
  };
};

export type DecideContractFixture = {
  readonly version: 1;
  readonly id: string;
  readonly success: {
    readonly headers?: Readonly<Record<string, string>>;
    readonly body: unknown;
    readonly expected: {
      readonly model: string;
      readonly answers: Readonly<Record<string, unknown>>;
      readonly requestId?: string;
      readonly inputTokens?: number;
    };
  };
  readonly errors: readonly DecideErrorFixture[];
};

export const DECIDE_FIXTURE_ROOT = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "fixtures",
  "decide",
);

const MAX_ID_LENGTH = 64;
const MAX_DEPTH = 100;
const PROVIDER_ID = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

// A Record keyed by the type, so a kind added to DecisionErrorKind fails to
// compile here until the reader knows it.
const ERROR_KINDS: Readonly<Record<DecisionErrorKind, true>> = {
  authentication: true,
  invalid_request: true,
  max_tokens_exceeded: true,
  rate_limit: true,
  overloaded: true,
  server: true,
  timeout: true,
  network: true,
};

const ROOT_KEYS = ["version", "id", "success", "errors"];
const SUCCESS_KEYS = ["headers", "body", "expected"];
const EXPECTED_KEYS = ["model", "answers", "requestId", "inputTokens"];
const ERROR_KEYS = [
  "label",
  "provenance",
  "status",
  "headers",
  "body",
  "expect",
];
const EXPECT_KEYS = ["kind", "retryable", "messageIncludes", "messageExcludes"];
const FORBIDDEN_KEYS = ["__proto__", "constructor"];

/**
 * What a credential in a captured body looks like. Not imported from
 * redactCredentials (src/lib/providers/systemOneDecision.ts): that function
 * scrubs a message and must redact the masked key echo and the key hash, while
 * a fixture is allowed to hold those on purpose to prove the redaction: the
 * masked "sk-...abcd" tail, and the hash of the key LiteLLM prints after
 * "Key Hash (Token) =" or "Hashed API key:". A hash is not a key, so the sk-
 * shape here needs a key-length body. Importing it would also make the reader
 * depend on a build. The tests pin each shape.
 *
 * A run of 32 or more hex digits is the one shape that is also what an id looks
 * like (a request id, a trace id, a dashless UUID, a digest). It is refused
 * unless a label naming a hash sits right before it in the same string, or the
 * property or header that holds it is named like an id (isIdLikeName). Every
 * other shape still fires inside such a property.
 */
const HEX_RUN = /(hash[^\n]{0,30}?[:=]\s*)?\b[0-9a-f]{32,}\b/gi;
const KEY_ADVICE = 'write "{apiKey}" where the key would be';
const CREDENTIAL_SHAPES: readonly {
  readonly name: string;
  readonly advice: string;
  readonly exemptUnderIdName: boolean;
  readonly matches: (text: string) => boolean;
}[] = [
  {
    name: "an sk- key",
    advice: KEY_ADVICE,
    exemptUnderIdName: false,
    matches: (text) => /\bsk-[A-Za-z0-9._-]{16,}/.test(text),
  },
  {
    name: "a bearer token",
    advice: KEY_ADVICE,
    exemptUnderIdName: false,
    matches: (text) => /\bBearer\s+[A-Za-z0-9._~+/=-]{20,}/i.test(text),
  },
  {
    name: "a long hex run",
    advice:
      "if this is an id or digest, put the word hash before it, name the " +
      "property so it contains id, trace, request, hash or digest, or " +
      'shorten it; if it is a key, write "{apiKey}"',
    exemptUnderIdName: true,
    matches: (text) =>
      [...text.matchAll(HEX_RUN)].some((m) => m[1] === undefined),
  },
  {
    name: "a JSON web token",
    advice: KEY_ADVICE,
    exemptUnderIdName: false,
    matches: (text) =>
      /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/.test(text),
  },
  {
    name: "a vendor-prefixed key",
    advice: KEY_ADVICE,
    exemptUnderIdName: false,
    matches: (text) =>
      /\b(?:pplx|xai|gsk|hf|ghp|r8)[-_][A-Za-z0-9]{20,}/.test(text),
  },
  {
    name: "a cloud access key",
    advice: KEY_ADVICE,
    exemptUnderIdName: false,
    matches: (text) =>
      /\b(?:AKIA[0-9A-Z]{16}|AIza[0-9A-Za-z_-]{35})/.test(text),
  },
  {
    // The wording production's redactCredentials cuts at: a vendor that echoes
    // the whole key back. The masked tail and the placeholder are fine.
    name: 'a key echoed after "Received API Key ="',
    advice: KEY_ADVICE,
    exemptUnderIdName: false,
    matches: (text) =>
      /Received API Key\s*=\s*(?!sk-\.\.\.|\{apiKey\})\S{8,}/i.test(text),
  },
];

const ID_STEMS = /trace|request|hash|digest|etag|checksum|idempotency|sha\d/;
const ID_WORDS = ["id", "ids", "uuid", "guid", "identifier", "sha"];

/**
 * Is this property or header named like an id or a digest? A stem anywhere in
 * the name counts (x-request-id, traceparent, trace_id, token_hash, requestId,
 * x-amz-content-sha256); "id" counts only as a whole word, split on
 * punctuation and camelCase, because the letters sit inside provider,
 * validation and width, and "provider_api_key" must stay a key.
 */
function isIdLikeName(name: string): boolean {
  const spaced = name.replace(/([a-z0-9])([A-Z])/g, "$1 $2").toLowerCase();
  return (
    ID_STEMS.test(spaced) ||
    spaced.split(/[^a-z0-9]+/).some((word) => ID_WORDS.includes(word))
  );
}

// A plain object: an array, a Map or a class instance fails the prototype test.
const isRecord = (v: unknown): v is Record<string, unknown> => {
  if (typeof v !== "object" || v === null) {
    return false;
  }
  const proto: unknown = Object.getPrototypeOf(v);
  return proto === Object.prototype || proto === null;
};
const isProviderId = (v: unknown): v is string =>
  typeof v === "string" && v.length <= MAX_ID_LENGTH && PROVIDER_ID.test(v);
const isKind = (v: unknown): v is DecisionErrorKind =>
  typeof v === "string" && Object.prototype.hasOwnProperty.call(ERROR_KINDS, v);
const isProvenance = (v: unknown): v is DecideErrorProvenance =>
  v === "seen-live" || v === "stand-in";
const isStringList = (v: unknown): v is readonly string[] =>
  Array.isArray(v) && v.every((s) => typeof s === "string" && s !== "");
const isStringMap = (v: unknown): v is Readonly<Record<string, string>> =>
  isRecord(v) && Object.values(v).every((s) => typeof s === "string");

const credentialShape = (text: string, underIdName = false) =>
  CREDENTIAL_SHAPES.find(
    (shape) => !(underIdName && shape.exemptUnderIdName) && shape.matches(text),
  );

// A key can be the credential, so a path never prints one that looks like it.
const shownKey = (key: string): string =>
  credentialShape(key) ? "<key withheld>" : key.slice(0, 40);
const child = (path: string, key: string): string =>
  path === "" ? shownKey(key) : `${path}.${shownKey(key)}`;

function reject(source: string, path: string, problem: string): never {
  throw new Error(`contract fixture ${source}: ${path} ${problem}`);
}

function refuseUnknownKeys(
  source: string,
  path: string,
  record: Readonly<Record<string, unknown>>,
  known: readonly string[],
): void {
  const stray = Object.keys(record).find((key) => !known.includes(key));
  if (stray !== undefined) {
    reject(
      source,
      child(path, stray),
      `is not a known field (known: ${known.join(", ")})`,
    );
  }
}

function parseError(
  source: string,
  raw: unknown,
  index: number,
): DecideErrorFixture {
  const at = `errors[${index}]`;
  if (!isRecord(raw)) {
    return reject(source, at, "must be an object");
  }
  refuseUnknownKeys(source, at, raw, ERROR_KEYS);
  const { label, provenance, status, expect: expected } = raw;
  if (typeof label !== "string" || label.trim() === "") {
    return reject(source, `${at}.label`, "must be a non-empty string");
  }
  if (!isProvenance(provenance)) {
    return reject(
      source,
      `${at}.provenance`,
      'must be "seen-live" or "stand-in"',
    );
  }
  if (
    typeof status !== "number" ||
    !Number.isInteger(status) ||
    status < 400 ||
    status > 599
  ) {
    return reject(
      source,
      `${at}.status`,
      "must be an HTTP error status from 400 to 599",
    );
  }
  if (raw.body === undefined) {
    return reject(
      source,
      `${at}.body`,
      "is required (use null for an empty body)",
    );
  }
  if (!isRecord(expected)) {
    return reject(source, `${at}.expect`, "must be an object");
  }
  refuseUnknownKeys(source, `${at}.expect`, expected, EXPECT_KEYS);
  if (!isKind(expected.kind)) {
    return reject(source, `${at}.expect.kind`, "must be a decision error kind");
  }
  if (typeof expected.retryable !== "boolean") {
    return reject(source, `${at}.expect.retryable`, "must be true or false");
  }
  const { headers, body } = raw;
  if (headers !== undefined && !isStringMap(headers)) {
    return reject(source, `${at}.headers`, "must be an object of strings");
  }
  const { messageIncludes: includes, messageExcludes: excludes } = expected;
  if (includes !== undefined && !isStringList(includes)) {
    return reject(
      source,
      `${at}.expect.messageIncludes`,
      "must be a list of non-empty strings",
    );
  }
  if (excludes !== undefined && !isStringList(excludes)) {
    return reject(
      source,
      `${at}.expect.messageExcludes`,
      "must be a list of non-empty strings",
    );
  }
  return {
    label,
    provenance,
    status,
    body,
    ...(headers ? { headers } : {}),
    expect: {
      kind: expected.kind,
      retryable: expected.retryable,
      ...(includes ? { messageIncludes: includes } : {}),
      ...(excludes ? { messageExcludes: excludes } : {}),
    },
  };
}

/**
 * Walks every value of the fixture, bodies included, and refuses what JSON
 * cannot hold or what must never be committed. Messages name the path and the
 * kind of problem and never the value. `name` is the property or header that
 * holds the value (an array's elements inherit it); the depth counts from the
 * fixture root, so an error body gets 97 levels of its own.
 */
function refuseHazards(source: string, root: unknown): void {
  const open = new Set<object>();
  const visit = (
    value: unknown,
    path: string,
    depth: number,
    name: string,
  ): void => {
    if (typeof value === "string") {
      const shape = credentialShape(value, isIdLikeName(name));
      if (shape) {
        reject(source, path, `holds ${shape.name}; ${shape.advice}`);
      }
      return;
    }
    if (typeof value === "number") {
      if (!Number.isFinite(value)) {
        reject(source, path, "must be a finite number");
      }
      return;
    }
    if (typeof value === "boolean" || value === null) {
      return;
    }
    if (typeof value !== "object") {
      return reject(source, path, "is not JSON data");
    }
    if (depth > MAX_DEPTH) {
      return reject(
        source,
        path,
        `is nested deeper than ${MAX_DEPTH} levels counting from the fixture root`,
      );
    }
    if (open.has(value)) {
      return reject(source, path, "contains itself");
    }
    open.add(value);
    if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i += 1) {
        visit(value[i], `${path}[${i}]`, depth + 1, name);
      }
    } else if (isRecord(value)) {
      for (const key of Object.keys(value)) {
        if (FORBIDDEN_KEYS.includes(key)) {
          reject(source, path || "root", `has a "${key}" key`);
        }
        const at = child(path, key);
        if (credentialShape(key)) {
          reject(source, at, "is a key shaped like a credential");
        }
        visit(value[key], at, depth + 1, key);
      }
    } else {
      reject(source, path, "is not plain JSON data");
    }
    open.delete(value);
  };
  visit(root, "", 0, "");
}

export function parseDecideContractFixture(
  raw: unknown,
  source: string,
): DecideContractFixture {
  if (!isRecord(raw)) {
    return reject(source, "root", "must be an object");
  }
  refuseUnknownKeys(source, "", raw, ROOT_KEYS);
  if (raw.version !== 1) {
    return reject(source, "version", "must be 1");
  }
  if (!isProviderId(raw.id)) {
    return reject(source, "id", "must be a lowercase kebab-case provider id");
  }
  const { success } = raw;
  if (!isRecord(success)) {
    return reject(source, "success", "must be an object");
  }
  refuseUnknownKeys(source, "success", success, SUCCESS_KEYS);
  if (success.body === undefined) {
    return reject(source, "success.body", "is required");
  }
  const expected = success.expected;
  if (!isRecord(expected)) {
    return reject(source, "success.expected", "must be an object");
  }
  refuseUnknownKeys(source, "success.expected", expected, EXPECTED_KEYS);
  if (typeof expected.model !== "string" || expected.model === "") {
    return reject(
      source,
      "success.expected.model",
      "must be a non-empty string",
    );
  }
  if (
    !isRecord(expected.answers) ||
    Object.keys(expected.answers).length === 0
  ) {
    return reject(
      source,
      "success.expected.answers",
      "must be an object naming at least one answer",
    );
  }
  const { requestId, inputTokens } = expected;
  if (requestId !== undefined && typeof requestId !== "string") {
    return reject(source, "success.expected.requestId", "must be a string");
  }
  if (
    inputTokens !== undefined &&
    (typeof inputTokens !== "number" ||
      !Number.isSafeInteger(inputTokens) ||
      inputTokens < 0)
  ) {
    return reject(
      source,
      "success.expected.inputTokens",
      "must be a whole number of tokens, 0 or more",
    );
  }
  const { headers } = success;
  if (headers !== undefined && !isStringMap(headers)) {
    return reject(source, "success.headers", "must be an object of strings");
  }
  if (!Array.isArray(raw.errors) || raw.errors.length === 0) {
    return reject(
      source,
      "errors",
      "must be a list of at least one error body",
    );
  }
  const errors = raw.errors.map((e: unknown, i: number) =>
    parseError(source, e, i),
  );
  const firstWith = new Map<string, number>();
  errors.forEach(({ label }, i) => {
    const first = firstWith.get(label);
    if (first !== undefined) {
      reject(
        source,
        `errors[${i}].label`,
        `repeats the label of errors[${first}]`,
      );
    }
    firstWith.set(label, i);
  });
  refuseHazards(source, raw);
  return {
    version: 1,
    id: raw.id,
    success: {
      ...(headers ? { headers } : {}),
      body: success.body,
      expected: {
        model: expected.model,
        answers: expected.answers,
        ...(typeof requestId === "string" ? { requestId } : {}),
        ...(typeof inputTokens === "number" ? { inputTokens } : {}),
      },
    },
    errors,
  };
}

const errorCode = (error: unknown): string =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  typeof error.code === "string"
    ? error.code
    : "unknown";

// V8 quotes the start of the text in some JSON errors, and the text is where a
// captured key would sit, so only the position survives into the message.
function jsonProblem(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  const where = /at position \d+(?: \(line \d+ column \d+\))?/.exec(message);
  return where ? where[0] : "";
}

const describeId = (id: unknown): string =>
  typeof id === "string" ? JSON.stringify(id.slice(0, 40)) : typeof id;

function resolveFixtureFile(root: string, file: string): string {
  let real: string;
  try {
    real = realpathSync(file);
  } catch (error) {
    const code = errorCode(error);
    if (code === "ENOENT" || code === "ENOTDIR") {
      throw new Error(`contract fixture missing: ${file}`, { cause: error });
    }
    throw new Error(`contract fixture ${file} cannot be resolved: ${code}`, {
      cause: error,
    });
  }
  const fromRoot = relative(realpathSync(root), real);
  if (fromRoot.startsWith(`..${sep}`) || isAbsolute(fromRoot)) {
    throw new Error(
      `contract fixture ${file} resolves outside the fixture root`,
    );
  }
  if (!statSync(real).isFile()) {
    throw new Error(`contract fixture ${file} is not a regular file`);
  }
  return real;
}

export function readDecideContractFixture(
  id: string,
  root: string = DECIDE_FIXTURE_ROOT,
): DecideContractFixture {
  if (!isProviderId(id)) {
    throw new Error(`contract fixture: ${describeId(id)} is not a provider id`);
  }
  const file = join(root, id, "contract.json");
  const real = resolveFixtureFile(root, file);
  let text: string;
  try {
    text = readFileSync(real, "utf8");
  } catch (error) {
    throw new Error(
      `contract fixture ${file} cannot be read: ${errorCode(error)}`,
      { cause: error },
    );
  }
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (error) {
    // No cause on purpose: V8's JSON error quotes the start of the text, where
    // a captured key would be, and a thrown error prints its cause.
    // eslint-disable-next-line preserve-caught-error
    throw new Error(
      `contract fixture ${file} is not valid JSON ${jsonProblem(error)}`.trimEnd(),
    );
  }
  const fixture = parseDecideContractFixture(raw, file);
  if (fixture.id !== id) {
    throw new Error(
      `contract fixture ${file}: id "${fixture.id}" does not match its directory "${id}"`,
    );
  }
  return fixture;
}
