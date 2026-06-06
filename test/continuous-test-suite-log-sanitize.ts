#!/usr/bin/env tsx
import "dotenv/config";

/**
 * Log Sanitization Verification Suite
 *
 * Locks in the H03 + H04 fixes from the PR #1019 review.
 *
 * Coverage:
 *   H03 — sanitizeForLog redacts all 11 token prefixes (sk, pk, r8, gsk, xai,
 *         tgp, fw, pplx, pa, jina, fish) plus 3 auth schemes (Bearer, Token,
 *         Basic) plus generic key=value patterns (api_key=, access_token=,
 *         secret_key=, refresh_token=).
 *   H03 — sanitizeRecord redacts sensitive object keys recursively;
 *         handles cycles via [Circular]; preserves non-sensitive shape.
 *   H03 — sanitizeHeaders redacts authorization/cookie/x-api-key headers
 *         regardless of value shape.
 *   H04 — no inline secret-redaction regex remains outside logSanitize.ts
 *         (sweep + audit).
 *
 * Run with: pnpm run test:log-sanitize
 */

import {
  redactUrlCredentials,
  sanitizeForLog,
  sanitizeHeaders,
  sanitizeRecord,
} from "../src/lib/utils/logSanitize.js";
import { defineSuite } from "./helpers/harness.js";
import { execSync } from "node:child_process";

const { recordTest, runSuite } = defineSuite("Log Sanitization");

// ───────────────────────────────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────────────────────────────

function expectRedacted(input: string, forbidden: string, label: string): void {
  const out = sanitizeForLog(input);
  if (out.includes(forbidden)) {
    recordTest(
      label,
      false,
      false,
      `forbidden "${forbidden}" still present in: "${out}"`,
    );
  } else if (!out.includes("***")) {
    recordTest(
      label,
      false,
      false,
      `did not redact (no *** in output): "${out}"`,
    );
  } else {
    recordTest(label, true);
  }
}

function expectUnchanged(input: string, label: string): void {
  const out = sanitizeForLog(input);
  if (out === input) {
    recordTest(label, true);
  } else {
    recordTest(
      label,
      false,
      false,
      `unexpected redaction: "${input}" → "${out}"`,
    );
  }
}

// ───────────────────────────────────────────────────────────────────────
// Section A — Token prefix redaction (H03)
// ───────────────────────────────────────────────────────────────────────

console.log("\n=== Section A: bare token prefixes (H03) ===\n");

const prefixCases: Array<[string, string, string]> = [
  // [raw, secret-substring, label]
  [
    "error: invalid sk-abcdef1234567890 token",
    "sk-abcdef1234567890",
    "sk- prefix",
  ],
  [
    "error: invalid pk-abcdef1234567890 token",
    "pk-abcdef1234567890",
    "pk- prefix",
  ],
  ["bad: r8_abcdef1234567890", "r8_abcdef1234567890", "r8_ prefix (Replicate)"],
  ["bad: gsk_abcdef1234567890", "gsk_abcdef1234567890", "gsk_ prefix (Groq)"],
  ["bad: xai-abcdef1234567890", "xai-abcdef1234567890", "xai- prefix"],
  [
    "bad: tgp_abcdef1234567890",
    "tgp_abcdef1234567890",
    "tgp_ prefix (Together)",
  ],
  ["bad: fw_abcdef1234567890", "fw_abcdef1234567890", "fw_ prefix (Fireworks)"],
  [
    "bad: pplx-abcdef1234567890",
    "pplx-abcdef1234567890",
    "pplx- prefix (Perplexity)",
  ],
  ["bad: pa-abcdef1234567890", "pa-abcdef1234567890", "pa- prefix (Voyage)"],
  ["bad: jina_abcdef1234567890", "jina_abcdef1234567890", "jina_ prefix"],
  [
    "bad: fish-abcdef1234567890",
    "fish-abcdef1234567890",
    "fish- prefix (Fish Audio)",
  ],
];

for (const [raw, secret, label] of prefixCases) {
  expectRedacted(raw, secret, `redacts ${label}`);
}

// ───────────────────────────────────────────────────────────────────────
// Section B — Authorization scheme redaction (H03)
// ───────────────────────────────────────────────────────────────────────

console.log("\n=== Section B: auth schemes (H03) ===\n");

const authCases: Array<[string, string, string]> = [
  [
    "Authorization: Bearer abcdef1234567890",
    "abcdef1234567890",
    "Bearer + whitespace + token (canonical)",
  ],
  [
    "Authorization: Token r8_abc123def456ghi789",
    "r8_abc123def456ghi789",
    "Token + whitespace (Replicate auth header)",
  ],
  [
    "Authorization: Basic dXNlcjpwYXNzd29yZA==",
    "dXNlcjpwYXNzd29yZA==",
    "Basic + base64 (D-ID auth header)",
  ],
];

for (const [raw, secret, label] of authCases) {
  expectRedacted(raw, secret, `redacts ${label}`);
}

// ───────────────────────────────────────────────────────────────────────
// Section C — Generic key=value redaction (H03)
// ───────────────────────────────────────────────────────────────────────

console.log("\n=== Section C: generic key=value (H03) ===\n");

const kvCases: Array<[string, string, string]> = [
  [
    "url=https://x?api_key=tgp_secret123abc",
    "tgp_secret123abc",
    "api_key=… in URL",
  ],
  ["api-key=hex0123456789abcdef", "hex0123456789abcdef", "api-key= variant"],
  [
    'access_token: "abc123def456ghi789"',
    "abc123def456ghi789",
    "access_token: quoted",
  ],
  ["secret_key=topsecret123456", "topsecret123456", "secret_key= variant"],
  [
    "refresh_token=rt_abc123def456",
    "rt_abc123def456",
    "refresh_token= variant",
  ],
];

for (const [raw, secret, label] of kvCases) {
  expectRedacted(raw, secret, `redacts ${label}`);
}

// ───────────────────────────────────────────────────────────────────────
// Section D — Negative cases (should NOT trigger redaction)
// ───────────────────────────────────────────────────────────────────────

console.log("\n=== Section D: negative cases (no false redaction) ===\n");

const negativeCases: Array<[string, string]> = [
  ["safe text without any secrets", "plain text"],
  ["the word skip should not match", "word 'skip' is not sk- prefix"],
  ["This is a sentence about packets.", "word 'packets' is not pk- prefix"],
  ["", "empty string"],
];

for (const [input, label] of negativeCases) {
  expectUnchanged(input, `does not redact ${label}: "${input}"`);
}

// ───────────────────────────────────────────────────────────────────────
// Section E — Truncation behaviour
// ───────────────────────────────────────────────────────────────────────

console.log("\n=== Section E: truncation ===\n");

const longInput = "x".repeat(2000);
const truncatedDefault = sanitizeForLog(longInput);
recordTest(
  "truncates to default max (500 chars)",
  truncatedDefault.length === 500,
  false,
  `length=${truncatedDefault.length}`,
);

const truncated100 = sanitizeForLog(longInput, 100);
recordTest(
  "respects custom maxLen",
  truncated100.length === 100,
  false,
  `length=${truncated100.length}`,
);

// ───────────────────────────────────────────────────────────────────────
// Section F — sanitizeRecord recursive + cycle handling
// ───────────────────────────────────────────────────────────────────────

console.log("\n=== Section F: sanitizeRecord ===\n");

const flatRecord = {
  apiKey: "should-be-redacted",
  apikey: "case-insensitive-redacted",
  api_key: "snake-case-redacted",
  refresh_token: "secret-token",
  username: "alice",
  port: 8080,
};
const flatOut = sanitizeRecord(flatRecord);
recordTest("sanitizeRecord redacts apiKey", flatOut.apiKey === "***");
recordTest("sanitizeRecord redacts apikey (lower)", flatOut.apikey === "***");
recordTest("sanitizeRecord redacts api_key (snake)", flatOut.api_key === "***");
recordTest(
  "sanitizeRecord redacts refresh_token",
  flatOut.refresh_token === "***",
);
recordTest(
  "sanitizeRecord preserves non-sensitive string",
  flatOut.username === "alice",
);
recordTest("sanitizeRecord preserves non-string scalar", flatOut.port === 8080);

// Nested + array
const nested = {
  user: { name: "alice", apiKey: "nested-secret" },
  history: [
    { id: 1, accessToken: "token-1" },
    { id: 2, accessToken: "token-2" },
  ],
};
const nestedOut = sanitizeRecord(nested);
recordTest(
  "sanitizeRecord recurses into nested object",
  nestedOut.user.apiKey === "***" && nestedOut.user.name === "alice",
);
recordTest(
  "sanitizeRecord recurses into arrays",
  nestedOut.history[0].accessToken === "***" &&
    nestedOut.history[1].accessToken === "***",
);

// Cycles
const cyclic: { name: string; self?: unknown } = { name: "node" };
cyclic.self = cyclic;
const cyclicOut = sanitizeRecord(cyclic);
recordTest(
  "sanitizeRecord handles circular references",
  cyclicOut.self === "[Circular]",
);

// String sanitisation inside object
const mixedSecrets = {
  log: "Authorization: Bearer abc123def456ghi789",
  comment: "safe",
};
const mixedOut = sanitizeRecord(mixedSecrets);
recordTest(
  "sanitizeRecord runs sanitizeForLog on string values",
  !mixedOut.log.includes("abc123def456ghi789"),
);

// ───────────────────────────────────────────────────────────────────────
// Section G — sanitizeHeaders
// ───────────────────────────────────────────────────────────────────────

console.log("\n=== Section G: sanitizeHeaders ===\n");

const plainHeaders = {
  Authorization: "Bearer abc123def456",
  "X-API-Key": "0123456789abcdef",
  Cookie: "session=xyz; auth=token",
  "Content-Type": "application/json",
};
const plainOut = sanitizeHeaders(plainHeaders);
recordTest(
  "sanitizeHeaders redacts Authorization entirely",
  plainOut.Authorization === "***",
);
recordTest(
  "sanitizeHeaders redacts X-API-Key (case-insensitive)",
  plainOut["X-API-Key"] === "***",
);
recordTest("sanitizeHeaders redacts Cookie", plainOut.Cookie === "***");
recordTest(
  "sanitizeHeaders preserves Content-Type",
  plainOut["Content-Type"] === "application/json",
);

// Headers instance shape
const headersInstance = new Headers({
  Authorization: "Bearer secret-abc-123",
  Accept: "*/*",
});
const headersOut = sanitizeHeaders(headersInstance);
recordTest(
  "sanitizeHeaders accepts Headers instance",
  headersOut.authorization === "***" || headersOut.Authorization === "***",
);

// ───────────────────────────────────────────────────────────────────────
// Section H — H04 regression sweep
// ───────────────────────────────────────────────────────────────────────

console.log("\n=== Section H: H04 inline-regex sweep ===\n");

// Repo-wide grep — must return no matches outside logSanitize.ts itself
// (the canonical SECRET_PATTERN is the single allowed location).
try {
  const output = execSync(
    `grep -rnE 'replace\\(.*\\\\b\\(sk\\|pk\\|Bearer\\)' src/ 2>&1 || true`,
    { cwd: process.cwd(), encoding: "utf8" },
  );
  const matches = output
    .split("\n")
    .filter((line) => line.trim().length > 0 && !line.includes("logSanitize"));
  recordTest(
    "no inline secret-redaction regex in src/ (H04 regression)",
    matches.length === 0,
    false,
    matches.length > 0
      ? `found ${matches.length} occurrence(s):\n  ${matches.join("\n  ")}`
      : undefined,
  );
} catch (err) {
  recordTest(
    "H04 regression grep",
    false,
    false,
    err instanceof Error ? err.message : String(err),
  );
}

// ───────────────────────────────────────────────────────────────────────
// Section I — redactUrlCredentials (baseURL credential stripping)
// ───────────────────────────────────────────────────────────────────────

console.log("\n=== Section I: redactUrlCredentials ===\n");

// Positive: embedded user:pass@ must be stripped, host/path preserved.
const redactCases: Array<[string, string, string]> = [
  // [raw, expected, label]
  [
    "https://user:secret@api.example.com/v1",
    "https://***@api.example.com/v1",
    "user:pass@ in https baseURL",
  ],
  [
    "http://admin:p%40ss@localhost:8080/v1",
    "http://***@localhost:8080/v1",
    "credentials with encoded chars + port",
  ],
  [
    "redis://default:token123@redis.internal:6379",
    "redis://***@redis.internal:6379",
    "non-http scheme (redis)",
  ],
];

for (const [raw, expected, label] of redactCases) {
  const out = redactUrlCredentials(raw);
  recordTest(
    `redactUrlCredentials strips ${label}`,
    out === expected,
    false,
    out === expected ? undefined : `expected "${expected}", got "${out}"`,
  );
}

// Global flag: EVERY //…@ authority is redacted, not just the first.
const multi = redactUrlCredentials(
  "https://u1:p1@host-a/path?next=https://u2:p2@host-b/cb",
);
recordTest(
  "redactUrlCredentials redacts all embedded credentials (global)",
  !multi.includes("u1:p1") && !multi.includes("u2:p2"),
  false,
  `got "${multi}"`,
);

// Negative: credential-free URLs are returned unchanged.
const noCredCases: Array<[string, string]> = [
  ["https://api.mistral.ai/v1", "plain https baseURL"],
  ["http://localhost:8080/v1", "localhost baseURL"],
  ["https://api.openai.com/v1/chat/completions", "path with no userinfo"],
  ["", "empty string"],
];

for (const [input, label] of noCredCases) {
  const out = redactUrlCredentials(input);
  recordTest(
    `redactUrlCredentials leaves ${label} unchanged`,
    out === input,
    false,
    out === input ? undefined : `unexpected change: "${input}" → "${out}"`,
  );
}

await runSuite();
