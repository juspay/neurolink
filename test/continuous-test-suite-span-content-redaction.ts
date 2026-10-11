#!/usr/bin/env tsx

/**
 * Continuous Test Suite — credentials never reach a span, and content that has
 * none serializes exactly as before
 *
 * Span inputs and outputs now carry tool arguments, tool results and the whole
 * conversation. `spanContentAttribute` and `spanModelRequestAttribute` mask
 * credentials in them before anything is written, and must do so without
 * changing a byte of content that has nothing to mask, without ever throwing
 * into the turn, and without ever writing a value they could not inspect.
 *
 * DETERMINISM EXCEPTION (Critical Rule 15). This suite imports from `src/lib/`
 * and is on the `neurolink/e2e-tests-only` allow list. The helpers are not
 * exported from any package entry point, and what is under test cannot be
 * produced by a live call:
 *   - byte-identical output for a thousand generated values with nothing
 *     sensitive in them, compared against the previous serializer;
 *   - a value that throws when it is read, a circular value, a `__proto__`
 *     key and a Date, none of which can pass through a tool result or a
 *     provider response intact;
 *   - the exact marker text and the exact cut points at the size cap.
 * The end-to-end half (a real stream turn whose question, tool arguments and
 * tool result carry credentials) lives in
 * continuous-test-suite-vertex-claude-characterization.ts.
 *
 * Offline: no provider is constructed and nothing touches the network.
 *
 * Run: npx tsx test/continuous-test-suite-span-content-redaction.ts
 */

import { defineSuite, assert } from "./helpers/harness.js";
import {
  redactSpanContent,
  spanContentAttribute,
  spanJsonAttribute,
  spanModelRequestAttribute,
} from "../src/lib/telemetry/attributes.js";

const { test, runSuite } = defineSuite("Span content redaction", {
  offline: true,
});

void runSuite(async () => {
  await test("credentials are masked; counts, flags and prose are not", async () => {
    const masked = JSON.stringify(
      redactSpanContent({
        authorization: "Basic abc",
        "set-cookie": "session=1",
        cookies: { a: 1 },
        password: "p-value",
        apiKey: "k-value",
        privateKey: "pk-value",
        clientSecret: "cs-value",
        credentials: { user: "cred-user-value" },
        signature: "sig-value",
        sessionId: "session-correlation-id",
        accessTokens: ["t1-value", "t2-value"],
        nested: { token: "n-value", cookieConsent: true, max_tokens: 4096 },
        text: "see https://x.example/cb?access_token=abc123&state=ok",
        presigned:
          "https://b.example/o?X-Amz-Credential=AKIAEXAMPLE%2Fscope&X-Amz-Signature=deadbeef99&X-Amz-Date=1",
      }),
    );
    for (const leaked of [
      "Basic abc",
      "session=1",
      "abc123",
      "p-value",
      "k-value",
      "pk-value",
      "cs-value",
      "t1-value",
      "n-value",
      "cred-user-value",
      "sig-value",
      "AKIAEXAMPLE",
      "deadbeef99",
    ]) {
      assert(!masked.includes(leaked), `redaction left ${leaked}`);
    }
    assert(
      masked.includes('"cookieConsent":true'),
      "a consent flag was masked",
    );
    assert(masked.includes('"max_tokens":4096'), "a count was masked");
    assert(masked.includes("state=ok"), "a harmless parameter was masked");
    assert(
      masked.includes("X-Amz-Date=1"),
      "a harmless signed-URL parameter was masked",
    );
    assert(
      masked.includes("session-correlation-id"),
      "a session correlation id was masked; it identifies a conversation, not a credential",
    );

    const prose =
      "Bearer authentication is supported and a secret santa was held";
    assert(
      spanContentAttribute(prose) === prose,
      "ordinary prose that mentions the words was altered",
    );
  });

  await test("credentials inside JSON text are masked at every level of nesting", async () => {
    const levelZero = '{"client_secret":"ZERO-secret-0000","kept":"visible"}';
    const levelOne = JSON.stringify({ note: levelZero });
    const levelTwo = JSON.stringify({ note: levelOne });
    const levelThree = JSON.stringify({ note: levelTwo });
    for (const [depth, text] of [
      [0, levelZero],
      [1, levelOne],
      [2, levelTwo],
      [3, levelThree],
    ] as const) {
      const written = spanContentAttribute({ content: text });
      assert(
        !written.includes("ZERO-secret-0000"),
        `a secret survived ${depth} levels of escaping`,
      );
      assert(written.includes("visible"), `depth ${depth} lost harmless text`);
    }
  });

  await test("odd values never throw and never leak", async () => {
    const circular: Record<string, unknown> = { name: "loop" };
    circular.self = circular;
    assert(
      spanContentAttribute(circular).includes("[circular]"),
      "a circular value was not handled",
    );

    const dated = spanContentAttribute({ at: new Date(0) });
    assert(
      dated === JSON.stringify({ at: new Date(0) }),
      "a Date changed shape",
    );

    const protoKey = JSON.parse('{"__proto__":{"password":"x"},"ok":1}');
    assert(
      spanContentAttribute(protoKey).includes("[REDACTED]"),
      "a __proto__ key was not inspected",
    );
    assert(
      !Object.prototype.hasOwnProperty.call({}, "password"),
      "a __proto__ key polluted the prototype",
    );

    const unreadable = {
      get secretValue(): string {
        throw new Error("unreadable");
      },
    };
    assert(
      spanContentAttribute(unreadable) ===
        "[content omitted: redaction failed]",
      "a value that cannot be read must be omitted, not written or thrown",
    );

    const request = spanModelRequestAttribute({
      messages: [{ role: "user", content: "kept" }, unreadable],
    });
    assert(
      request.includes("kept") && request.includes("redaction failed"),
      "one unreadable message must not cost the rest of the conversation",
    );
  });

  await test("content with nothing sensitive serializes exactly as before", async () => {
    let seed = 12345;
    // mulberry32: the low bits of a plain linear generator repeat too evenly
    // to exercise every shape.
    const next = (): number => {
      seed = (seed + 0x6d2b79f5) | 0;
      let mixed = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
      return (mixed ^ (mixed >>> 14)) >>> 0;
    };
    const words = ["alpha", "beta", "gamma", "order", "total", "city", "N/A"];
    const coverage = { arrays: 0, objects: 0, scalars: 0 };
    const build = (depth: number): unknown => {
      const kind = next() % (depth > 3 ? 3 : 6);
      if (kind === 0) {
        coverage.scalars++;
        return words[next() % words.length];
      }
      if (kind === 1) {
        coverage.scalars++;
        return next() % 100000;
      }
      if (kind === 2) {
        coverage.scalars++;
        return next() % 2 === 0;
      }
      if (kind === 3) {
        const items = Array.from({ length: next() % 4 }, () =>
          build(depth + 1),
        );
        if (items.length >= 2) {
          coverage.arrays++;
        }
        return items;
      }
      const entries = Array.from({ length: next() % 4 }, () => [
        words[next() % words.length] + String(next() % 10),
        build(depth + 1),
      ]);
      if (entries.length >= 2) {
        coverage.objects++;
      }
      return Object.fromEntries(entries);
    };
    for (let index = 0; index < 1000; index++) {
      const value = build(0);
      assert(
        spanContentAttribute(value) === spanJsonAttribute(value),
        `output changed for ${JSON.stringify(value)}`,
      );
    }
    assert(
      coverage.arrays >= 100 &&
        coverage.objects >= 100 &&
        coverage.scalars >= 500,
      `the generated values were too narrow: ${JSON.stringify(coverage)}`,
    );
  });

  await test("structured content over the cap stays valid JSON and keeps its structure", async () => {
    const oversized = spanContentAttribute({
      text: "x".repeat(120_000),
      toolCalls: [{ id: "toolu_keep", name: "lookup", args: { q: "kept" } }],
    });
    let parsed:
      | { text?: string; toolCalls?: Array<{ id?: string }> }
      | undefined;
    try {
      parsed = JSON.parse(oversized);
    } catch {
      parsed = undefined;
    }
    assert(oversized.length <= 40_000, "the attribute exceeds the cap");
    assert(parsed !== undefined, "the over-cap attribute is not valid JSON");
    assert(
      parsed?.toolCalls?.[0]?.id === "toolu_keep",
      "trimming the text lost the tool call",
    );
    assert(
      String(parsed?.text ?? "").includes("[truncated"),
      "the text does not say it was shortened",
    );
  });

  await test("a request over the cap keeps the full system opening beside the note", async () => {
    const body = spanModelRequestAttribute({
      system: "S".repeat(60_000),
      messages: [{ role: "user", content: "M".repeat(60_000) }],
    });
    const parsed: { system?: string } = JSON.parse(body);
    const opening = (parsed.system ?? "").match(/^S*/)?.[0].length ?? 0;
    assert(body.length <= 40_000, "the attribute exceeds the cap");
    assert(opening >= 2_000, `the system opening is ${opening} characters`);
    assert(
      (parsed.system ?? "").includes("[truncated"),
      "the system prompt does not say it was shortened",
    );
  });
});
