#!/usr/bin/env tsx
import "dotenv/config";

/**
 * Guardrails refuse caller-supplied regex patterns that can stall the process.
 *
 * `badWords.regexPatterns` and `precallEvaluation.sanitizationPatterns` are
 * compiled and run synchronously on the event loop against the whole model
 * response (or the whole user prompt). Before the fix a pattern over 1000
 * characters only logged a warning, and the "too complex" probe ran the
 * pattern against the 4-character string "test", which no catastrophic
 * pattern is slow on, so `(a+)+$` against a long run of `a` froze generate()
 * and stream() for minutes. These cases drive the public surface against a
 * local OpenAI-compatible stand-in and prove three things:
 *
 *  - a refused pattern is skipped, never thrown, and its siblings still apply;
 *  - the shapes are refused on text they would otherwise match, so the check
 *    does not depend on how fast the machine is;
 *  - a genuinely adversarial reply returns within a bounded wall time, for
 *    the nested-quantifier shape and for the shapes a first version of the
 *    check let through (optional parts in a loop, a chain of optional parts,
 *    bounded repeats nested in bounded repeats);
 *  - a refusal is logged as an error, so a skipped pattern is not silent.
 *
 * Legitimate patterns, including every pattern the docs show, must keep
 * redacting. Runtime imports use only the built entry; type-only imports are
 * erased.
 *
 * Run: pnpm run build && pnpm run test:guardrails-regex-safety
 */

import assert from "node:assert/strict";
import { createServer } from "node:http";
import type { StreamResult } from "../src/lib/types/index.js";
import { defineSuite } from "./helpers/harness.js";
import { assertDistFresh } from "./helpers/distFreshness.js";
import {
  chatCompletion,
  mockOpenAICredentials,
  startScriptedChatServer,
  type MockChatServer,
} from "./helpers/mockChatServer.js";
import { NeuroLink } from "../dist/index.js";

assertDistFresh();

process.env.NEUROLINK_SKIP_MCP = "true";

const { test, section, runSuite } = defineSuite("Guardrails regex safety", {
  offline: true,
});

const MODES = ["generate", "stream"] as const;
type Mode = (typeof MODES)[number];

const REDACTED = "[REDACTED]";

// `(a+)+$` takes roughly 2^n steps on n `a`s followed by a character that
// defeats `$`. 32 is tens of seconds to minutes on the engines this runs on,
// far past the bound below, yet small enough that a regression fails a test
// instead of hanging the job for days.
const ADVERSARIAL_RUN_LENGTH = 32;
const ADVERSARIAL_REPLY = `${"a".repeat(ADVERSARIAL_RUN_LENGTH)}!`;

// Refusing a pattern is microseconds of work; the rest is the SDK and the
// loopback round trip. The bound only has to separate that from a stall, and
// it is generous because the shards share their CPU.
const STALL_BOUND_MS = 10_000;

const jsonOf = (text: string): string => JSON.stringify(text);

// Chain of `a?` followed by the same number of `a`, matched against that many
// `a`: roughly 1.5x slower for every two extra characters (about 4 s at 36),
// so 44 is far past the stall bound while 8 is instant.
const OPTIONAL_CHAIN_LENGTH = 44;

type StallCase = { name: string; pattern: string; reply: string };

/**
 * Each pattern is exponential (or worse) on its reply when it runs. The first
 * is the classic nested quantifier; the rest are shapes an earlier version of
 * the check accepted.
 */
const STALL_CASES: readonly StallCase[] = [
  { name: "nested plus", pattern: "(a+)+$", reply: ADVERSARIAL_REPLY },
  {
    name: "optional parts in a loop",
    pattern: "(a?a?)+$",
    reply: ADVERSARIAL_REPLY,
  },
  {
    name: "bounded repeat in a bounded repeat",
    pattern: "(a{1,30}){1,30}$",
    reply: ADVERSARIAL_REPLY,
  },
  {
    name: "chain of optional parts",
    pattern: `${"a?".repeat(OPTIONAL_CHAIN_LENGTH)}${"a".repeat(OPTIONAL_CHAIN_LENGTH)}`,
    reply: "a".repeat(OPTIONAL_CHAIN_LENGTH),
  },
];

/**
 * Capture what is written through `console.error` while `run` executes. The
 * logger resolves `console.error` on every call, so replacing it here sees
 * the guardrails' error-level output without touching the logger's internals.
 */
const captureErrors = async <T>(
  run: () => Promise<T>,
): Promise<{ result: T; errors: string }> => {
  const original = console.error;
  const lines: string[] = [];
  console.error = (...args: unknown[]) => {
    lines.push(args.map((arg) => String(arg)).join(" "));
  };
  try {
    const result = await run();
    return { result, errors: lines.join("\n") };
  } finally {
    console.error = original;
  }
};

/**
 * A loopback chat-completions server that answers every request with `reply`,
 * as JSON or as SSE depending on the request. The shared mock server's reply
 * is fixed at "mock reply", which is too short to expose a slow pattern.
 */
const startReplyServer = (reply: string): Promise<MockChatServer> => {
  const bodies: string[] = [];
  const server = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      const body = Buffer.concat(chunks).toString("utf8");
      bodies.push(body);
      const streaming = /"stream"\s*:\s*true/.test(body);
      if (!streaming) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(chatCompletion({ content: reply })));
        return;
      }
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
      });
      const base = {
        id: "reply-stream",
        object: "chat.completion.chunk",
        created: 1,
        model: "gpt-4o-mini",
      };
      for (const choice of [
        {
          index: 0,
          delta: { role: "assistant", content: reply },
          finish_reason: null,
        },
        { index: 0, delta: {}, finish_reason: "stop" },
      ]) {
        res.write(
          `data: ${JSON.stringify({ ...base, choices: [choice] })}\n\n`,
        );
      }
      res.write("data: [DONE]\n\n");
      res.end();
    });
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      resolve({
        baseURL: `http://127.0.0.1:${port}/v1`,
        getLastRequestBody: () => bodies[bodies.length - 1] ?? null,
        getAllRequestBodies: () => [...bodies],
        wasCalled: () => bodies.length > 0,
        close: () => new Promise((done) => server.close(() => done())),
      });
    });
  });
};

const readText = async (result: StreamResult): Promise<string> => {
  let text = "";
  for await (const chunk of result.stream) {
    if ("content" in chunk && typeof chunk.content === "string") {
      text += chunk.content;
    }
  }
  return text;
};

type Outcome = { text: string; elapsedMs: number; server: MockChatServer };

const callModel = async (
  sdk: NeuroLink,
  mode: Mode,
  server: MockChatServer,
  prompt: string,
  guardrails: Record<string, unknown>,
): Promise<Outcome> => {
  const options = {
    input: { text: prompt },
    provider: "openai",
    model: "gpt-4o-mini",
    disableTools: true,
    disableInternalFallback: true,
    credentials: mockOpenAICredentials(server),
    middleware: {
      middlewareConfig: { guardrails: { enabled: true, config: guardrails } },
    },
  };
  const startedAt = performance.now();
  const text =
    mode === "generate"
      ? (await sdk.generate(options)).content
      : await readText(await sdk.stream(options));
  const elapsedMs = performance.now() - startedAt;
  assert.ok(server.wasCalled(), "the stand-in was never called");
  return { text, elapsedMs, server };
};

/** Run one reply through badWords.regexPatterns on the chosen path. */
const filterReply = async (
  sdk: NeuroLink,
  mode: Mode,
  reply: string,
  regexPatterns: string[],
): Promise<Outcome> => {
  const server = await startReplyServer(reply);
  try {
    return await callModel(sdk, mode, server, "hello", {
      badWords: { enabled: true, regexPatterns, replacementText: REDACTED },
    });
  } finally {
    await server.close();
  }
};

// ---------------------------------------------------------------------------
// Legitimate patterns keep redacting.
// ---------------------------------------------------------------------------

section("Legitimate patterns still redact");

for (const mode of MODES) {
  await test(`a plain pattern redacts on ${mode} (precondition)`, async () => {
    const sdk = new NeuroLink();
    try {
      const { text } = await filterReply(sdk, mode, "the secret is out", [
        "\\bsecret\\b",
      ]);
      assert.equal(
        text,
        `the ${REDACTED} is out`,
        "redaction did not reach the caller, so the refusal cases below prove nothing",
      );
    } finally {
      await sdk.shutdown();
    }
  });
}

// Every pattern the guardrails docs and the type comments show, plus shapes
// that sit next to the refused ones and must stay allowed.
const LEGITIMATE: ReadonlyArray<{
  pattern: string;
  reply: string;
  expected: string;
}> = [
  {
    pattern: "\\b(spam|scam)\\b",
    reply: "no spam or scam here",
    expected: `no ${REDACTED} or ${REDACTED} here`,
  },
  {
    pattern: "\\d{3}-\\d{2}-\\d{4}",
    reply: "ssn 123-45-6789 ok",
    expected: `ssn ${REDACTED} ok`,
  },
  {
    pattern: "\\b\\d{3}-\\d{2}-\\d{4}\\b",
    reply: "ssn 123-45-6789 ok",
    expected: `ssn ${REDACTED} ok`,
  },
  {
    pattern: "\\b(password|secret)\\b",
    reply: "my password is a secret",
    expected: `my ${REDACTED} is a ${REDACTED}`,
  },
  {
    pattern: "\\d{16}",
    reply: "card 4111111111111111 end",
    expected: `card ${REDACTED} end`,
  },
  {
    pattern: "\\b(word1|word2|word3)\\b",
    reply: "word2 and word9",
    expected: `${REDACTED} and word9`,
  },
  {
    pattern: "\\b[\\w.-]+@[\\w.-]+\\.\\w+\\b",
    reply: "mail a.b@example.com now",
    expected: `mail ${REDACTED} now`,
  },
  {
    pattern: "\\b\\d{3}[-.]?\\d{3}[-.]?\\d{4}\\b",
    reply: "call 555-123-4567 now",
    expected: `call ${REDACTED} now`,
  },
  {
    pattern: "(\\d{1,3}\\.){3}\\d{1,3}",
    reply: "host 192.168.0.1 up",
    expected: `host ${REDACTED} up`,
  },
  {
    pattern: "(foo|bar)+",
    reply: "xfoobarfooy",
    expected: `x${REDACTED}y`,
  },
  {
    pattern: "a{1,500}",
    reply: "baab",
    expected: `b${REDACTED}b`,
  },
  // Shapes users write for PII that nest a repetition but cannot be split
  // more than one way, because each variable part is followed by a character
  // it cannot match.
  {
    pattern: "\\b(?:\\d[ -]*?){13,16}\\b",
    reply: "card 4111 1111 1111 1111 end",
    expected: `card ${REDACTED} end`,
  },
  {
    pattern: "([a-z0-9-]+\\.)+[a-z]{2,}",
    reply: "visit www.example.co.uk now",
    expected: `visit ${REDACTED} now`,
  },
  {
    pattern: "(?:\\.[a-z]{2,})+",
    reply: "a.com.au b",
    expected: `a${REDACTED} b`,
  },
  {
    pattern: "(\\d{1,3}\\.)+",
    reply: "ip 10.20.30. x",
    expected: `ip ${REDACTED} x`,
  },
  {
    pattern: "(?:\\d{4}[- ]?)+",
    reply: "card 4111-1111-1111-1111 end",
    expected: `card ${REDACTED}end`,
  },
  {
    pattern: "(\\w+\\s){2}",
    reply: "one two three",
    expected: `${REDACTED}three`,
  },
  {
    pattern: "(?:[a-z]|[0-9])+",
    reply: "--ab12--",
    expected: `--${REDACTED}--`,
  },
];

await test("documented and neighbouring patterns are not refused", async () => {
  const sdk = new NeuroLink();
  try {
    for (const { pattern, reply, expected } of LEGITIMATE) {
      const { text } = await filterReply(sdk, "generate", reply, [pattern]);
      assert.equal(
        text,
        expected,
        `pattern ${jsonOf(pattern)} was refused or mis-applied`,
      );
    }
  } finally {
    await sdk.shutdown();
  }
});

// ---------------------------------------------------------------------------
// Refused patterns are skipped, whatever the machine's speed.
// ---------------------------------------------------------------------------

section("Refused patterns are skipped");

// Each pattern would redact `text` if it ran. The reply carries a second
// word that a sibling pattern redacts, so the expected output also proves a
// refusal drops one pattern and not the whole list.
const REFUSED: ReadonlyArray<{ name: string; pattern: string; text: string }> =
  [
    { name: "nested plus", pattern: "(a+)+", text: "banana" },
    { name: "nested star", pattern: "(a*)*b", text: "aab" },
    { name: "class under star", pattern: "([a-z]+)*", text: "hello" },
    { name: "overlapping alternatives", pattern: "(a|aa)+", text: "baa" },
    { name: "overlapping classes", pattern: "(\\w|\\d)+", text: "ab12" },
    { name: "counted nested star", pattern: "(.*a){12}", text: "a".repeat(12) },
    { name: "repeated digit run", pattern: "(\\d+\\s*)+", text: "12 34" },
    { name: "two runs in a loop", pattern: "(x+x+)+y", text: "xxxy" },
    { name: "repetition bound", pattern: "a{1,1000}", text: "aaa" },
    { name: "optional parts in a loop", pattern: "(a?a?)+b", text: "aab" },
    {
      name: "optional part and word run in a loop",
      pattern: "(\\w+\\s?)+z",
      text: "ab cdz",
    },
    {
      name: "chain of optional parts",
      pattern: `${"a?".repeat(10)}${"a".repeat(10)}`,
      text: "a".repeat(10),
    },
    {
      name: "bounded repeat in a bounded repeat",
      pattern: "(a{1,30}){1,30}b",
      text: "aaab",
    },
    {
      name: "bounded repeat in a wide bounded repeat",
      pattern: "(a{1,3}){1,300}b",
      text: "aaab",
    },
    {
      name: "chain of open-ended repeats",
      pattern: ".*a.*b.*c.*d.*e.*f",
      text: "abcdef",
    },
    {
      name: "hex-escaped letter in a loop",
      pattern: "(\\x61+)+",
      text: "banana",
    },
    {
      name: "unicode-escaped letter in a loop",
      pattern: "(\\u0061+)+",
      text: "banana",
    },
  ];

for (const { name, pattern, text } of REFUSED) {
  await test(`${name} ${jsonOf(pattern)} is skipped and a sibling still applies`, async () => {
    const sdk = new NeuroLink();
    try {
      const { text: result } = await filterReply(
        sdk,
        "generate",
        `${text} secret`,
        [pattern, "\\bsecret\\b"],
      );
      assert.equal(
        result,
        `${text} ${REDACTED}`,
        "the pattern ran, or the refusal also dropped its sibling",
      );
    } finally {
      await sdk.shutdown();
    }
  });
}

// A plain alternation of exactly `length` characters. Nothing in it repeats, so
// only the length limit can refuse it.
const LENGTH_LIMIT = 1000;
const padded = (length: number): string =>
  `keepme${"|q".repeat(Math.floor((length - 6) / 2))}${"q".repeat((length - 6) % 2)}`;

await test("a pattern of exactly 1000 characters runs and one of 1001 is skipped", async () => {
  const sdk = new NeuroLink();
  try {
    assert.equal(padded(LENGTH_LIMIT).length, LENGTH_LIMIT);
    assert.equal(padded(LENGTH_LIMIT + 1).length, LENGTH_LIMIT + 1);
    const atLimit = await filterReply(sdk, "generate", "keepme and secret", [
      padded(LENGTH_LIMIT),
      "\\bsecret\\b",
    ]);
    assert.equal(
      atLimit.text,
      `${REDACTED} and ${REDACTED}`,
      "a pattern at the limit was refused",
    );
    const overLimit = await filterReply(sdk, "generate", "keepme and secret", [
      padded(LENGTH_LIMIT + 1),
      "\\bsecret\\b",
    ]);
    assert.equal(
      overLimit.text,
      `keepme and ${REDACTED}`,
      "a pattern over the limit still ran",
    );
  } finally {
    await sdk.shutdown();
  }
});

await test("an invalid pattern is still skipped next to a refused one", async () => {
  const sdk = new NeuroLink();
  try {
    const { text } = await filterReply(sdk, "generate", "banana secret", [
      "(a+)+",
      "(unclosed",
      "\\bsecret\\b",
    ]);
    assert.equal(text, `banana ${REDACTED}`);
  } finally {
    await sdk.shutdown();
  }
});

// ---------------------------------------------------------------------------
// The stall itself: an adversarial reply returns in bounded time.
// ---------------------------------------------------------------------------

section("A hostile pattern no longer stalls generate() or stream()");

for (const mode of MODES) {
  for (const { name, pattern, reply } of STALL_CASES) {
    await test(`badWords.regexPatterns: ${mode} returns in bounded time on ${name}`, async () => {
      const sdk = new NeuroLink();
      try {
        const { text, elapsedMs } = await filterReply(
          sdk,
          mode,
          `${reply} secret`,
          [pattern, "\\bsecret\\b"],
        );
        assert.ok(
          elapsedMs < STALL_BOUND_MS,
          `${mode} took ${Math.round(elapsedMs)}ms; the pattern was run instead of refused`,
        );
        assert.equal(
          text,
          `${reply} ${REDACTED}`,
          "the hostile pattern changed the reply, or the sibling pattern was lost",
        );
      } finally {
        await sdk.shutdown();
      }
    });
  }
}

section("A refusal is logged as an error");

await test("badWords.regexPatterns: a refused pattern is logged with its reason", async () => {
  const sdk = new NeuroLink();
  try {
    const { errors } = await captureErrors(() =>
      filterReply(sdk, "generate", "banana secret", ["(a+)+", "\\bsecret\\b"]),
    );
    assert.ok(
      errors.includes("Refusing regex pattern"),
      `no refusal was logged; error output was: ${errors || "(empty)"}`,
    );
    assert.ok(
      errors.includes("(a+)+") && errors.includes("The pattern is skipped"),
      "the log does not name the pattern or say it is skipped",
    );
  } finally {
    await sdk.shutdown();
  }
});

await test("badWords.regexPatterns: an over-long pattern is logged with its length", async () => {
  const sdk = new NeuroLink();
  try {
    const { errors } = await captureErrors(() =>
      filterReply(sdk, "generate", "keepme secret", [
        padded(LENGTH_LIMIT + 1),
        "\\bsecret\\b",
      ]),
    );
    assert.ok(
      errors.includes("Refusing regex pattern") &&
        errors.includes(`${LENGTH_LIMIT + 1} characters long`),
      `the length refusal was not logged; error output was: ${errors || "(empty)"}`,
    );
    assert.ok(
      !errors.includes(padded(LENGTH_LIMIT + 1)),
      "the whole over-long pattern was written to the log",
    );
  } finally {
    await sdk.shutdown();
  }
});

await test("a legitimate pattern logs no refusal", async () => {
  const sdk = new NeuroLink();
  try {
    const { errors } = await captureErrors(() =>
      filterReply(sdk, "generate", "the secret is out", ["\\bsecret\\b"]),
    );
    assert.ok(
      !errors.includes("Refusing"),
      `a plain pattern was reported as refused: ${errors}`,
    );
  } finally {
    await sdk.shutdown();
  }
});

// ---------------------------------------------------------------------------
// precallEvaluation.sanitizationPatterns, reached through generate()/stream().
// ---------------------------------------------------------------------------

section("sanitizationPatterns");

/**
 * Run a prompt through the precall evaluator, which a scripted stand-in says
 * is "inappropriate", with the sanitize action configured. The sanitized
 * prompt is what reaches the model, so the model-side request body is the
 * evidence.
 */
const sanitizePrompt = async (
  mode: Mode,
  prompt: string,
  sanitizationPatterns: string[],
): Promise<{ wireBody: string; elapsedMs: number }> => {
  const evaluator = await startScriptedChatServer([
    chatCompletion({
      content: JSON.stringify({
        overall: "inappropriate",
        safetyScore: 10,
        appropriatenessScore: 2,
        confidenceLevel: 10,
        suggestedAction: "sanitize",
        reasoning: "Deterministic sanitize fixture",
      }),
    }),
  ]);
  const target = await startReplyServer("ok");
  const saved = {
    key: process.env.OPENAI_COMPATIBLE_API_KEY,
    url: process.env.OPENAI_COMPATIBLE_BASE_URL,
  };
  process.env.OPENAI_COMPATIBLE_API_KEY = "test-evaluator-key";
  process.env.OPENAI_COMPATIBLE_BASE_URL = evaluator.baseURL;
  const sdk = new NeuroLink();
  try {
    const { elapsedMs } = await callModel(sdk, mode, target, prompt, {
      precallEvaluation: {
        enabled: true,
        provider: "openai-compatible",
        evaluationModel: "fixture-evaluator",
        actions: { onInappropriate: "sanitize" },
        sanitizationPatterns,
        replacementText: REDACTED,
      },
    });
    assert.ok(evaluator.wasCalled(), "the evaluator was not exercised");
    return { wireBody: target.getLastRequestBody() ?? "", elapsedMs };
  } finally {
    if (saved.key === undefined) {
      delete process.env.OPENAI_COMPATIBLE_API_KEY;
    } else {
      process.env.OPENAI_COMPATIBLE_API_KEY = saved.key;
    }
    if (saved.url === undefined) {
      delete process.env.OPENAI_COMPATIBLE_BASE_URL;
    } else {
      process.env.OPENAI_COMPATIBLE_BASE_URL = saved.url;
    }
    await sdk.shutdown();
    await target.close();
    await evaluator.close();
  }
};

for (const mode of MODES) {
  await test(`a legitimate sanitization pattern redacts the prompt on ${mode} (precondition)`, async () => {
    const { wireBody } = await sanitizePrompt(mode, "my token is hunter2", [
      "hunter2",
    ]);
    assert.ok(
      wireBody.includes(`my token is ${REDACTED}`),
      "sanitization did not reach the model, so the refusal cases below prove nothing",
    );
    assert.ok(!wireBody.includes("hunter2"), "the secret reached the model");
  });

  await test(`a nested-quantifier sanitization pattern is skipped on ${mode} and a sibling still applies`, async () => {
    const { wireBody } = await sanitizePrompt(mode, "attention hunter2", [
      "(t+)+",
      "hunter2",
    ]);
    assert.ok(
      wireBody.includes(`attention ${REDACTED}`),
      "the refused pattern ran, or the refusal dropped its sibling",
    );
  });

  for (const { name, pattern, reply } of STALL_CASES) {
    await test(`sanitizationPatterns: ${mode} returns in bounded time on ${name}`, async () => {
      const { wireBody, elapsedMs } = await sanitizePrompt(
        mode,
        `hunter2 ${reply}`,
        [pattern, "hunter2"],
      );
      assert.ok(
        elapsedMs < STALL_BOUND_MS,
        `${mode} took ${Math.round(elapsedMs)}ms; the pattern was run instead of refused`,
      );
      assert.ok(
        wireBody.includes(`${REDACTED} ${reply}`),
        "the hostile pattern changed the prompt, or the sibling pattern was lost",
      );
    });
  }
}

for (const { name, pattern, text } of REFUSED.filter(({ name: refused }) =>
  [
    "optional parts in a loop",
    "chain of optional parts",
    "bounded repeat in a bounded repeat",
    "repetition bound",
  ].includes(refused),
)) {
  await test(`sanitizationPatterns: ${name} ${jsonOf(pattern).slice(0, 40)} is skipped and a sibling still applies`, async () => {
    const { wireBody } = await sanitizePrompt("generate", `${text} hunter2`, [
      pattern,
      "hunter2",
    ]);
    assert.ok(
      wireBody.includes(`${text} ${REDACTED}`),
      "the refused pattern ran, or the refusal dropped its sibling",
    );
  });
}

await test("sanitizationPatterns: a pattern of exactly 1000 characters runs and one of 1001 is skipped", async () => {
  const atLimit = await sanitizePrompt("generate", "keepme and hunter2", [
    padded(LENGTH_LIMIT),
    "hunter2",
  ]);
  assert.ok(
    atLimit.wireBody.includes(`${REDACTED} and ${REDACTED}`),
    "a sanitization pattern at the limit was refused",
  );
  const overLimit = await sanitizePrompt("generate", "keepme and hunter2", [
    padded(LENGTH_LIMIT + 1),
    "hunter2",
  ]);
  assert.ok(
    overLimit.wireBody.includes(`keepme and ${REDACTED}`),
    "a sanitization pattern over the limit still ran",
  );
});

await test("sanitizationPatterns: a refused pattern is logged as an error", async () => {
  const { errors } = await captureErrors(() =>
    sanitizePrompt("generate", "attention hunter2", ["(t+)+", "hunter2"]),
  );
  assert.ok(
    errors.includes("Refusing sanitization pattern"),
    `no refusal was logged; error output was: ${errors || "(empty)"}`,
  );
});

await runSuite();
