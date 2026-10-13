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
  spanAttributeMaxChars,
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

  const toolRoundTrips = (count: number, resultChars: number): unknown[] =>
    Array.from({ length: count }, (_, step) => [
      {
        role: "assistant",
        content: [
          {
            type: "tool_use",
            id: `call_${step}`,
            name: "lookup",
            input: { step },
          },
        ],
      },
      {
        role: "user",
        content: [
          {
            type: "tool_result",
            tool_use_id: `call_${step}`,
            content: `R${step}:${"r".repeat(resultChars)}`,
          },
        ],
      },
    ]).flat();
  type TrimmedRequest = {
    messages?: Array<{ role?: string; content?: unknown }>;
    omittedMessages?: number;
  };
  const blocksOf = (message: {
    content?: unknown;
  }): Array<Record<string, unknown>> =>
    Array.isArray(message.content) ? message.content : [];

  await test("a turn over the cap keeps the question and never orphans a tool result", async () => {
    const body = spanModelRequestAttribute({
      system: "S".repeat(11_000),
      messages: [
        { role: "user", content: "EARLIER-QUESTION" },
        { role: "assistant", content: "EARLIER-ANSWER" },
        {
          role: "user",
          content: [
            { type: "text", text: "CURRENT-QUESTION how many orders?" },
          ],
        },
        ...toolRoundTrips(30, 2_000),
      ],
    });
    const parsed: TrimmedRequest = JSON.parse(body);
    const kept = parsed.messages ?? [];
    assert(body.length <= 40_000, `the attribute is ${body.length} characters`);
    assert(
      (parsed.omittedMessages ?? 0) > 0,
      "the request should have been over the cap",
    );
    assert(
      body.includes("CURRENT-QUESTION"),
      "the current question was dropped from an over-cap request",
    );
    assert(body.includes("R29:"), "the newest tool result was dropped");
    const keptCalls = new Set(
      kept.flatMap((message) =>
        blocksOf(message)
          .filter((block) => block.type === "tool_use")
          .map((block) => block.id),
      ),
    );
    const orphans = kept.flatMap((message) =>
      blocksOf(message)
        .filter(
          (block) =>
            block.type === "tool_result" && !keptCalls.has(block.tool_use_id),
        )
        .map((block) => block.tool_use_id),
    );
    assert(
      orphans.length === 0,
      `tool results kept without their calls: ${orphans.join(", ")}`,
    );
    assert(
      !body.includes("EARLIER-QUESTION"),
      "earlier turns must give way before this turn's tool calls",
    );
  });

  await test("a call too large to keep takes its result with it", async () => {
    const body = spanModelRequestAttribute({
      messages: [
        { role: "user", content: "QUESTION" },
        {
          role: "assistant",
          content: [
            {
              type: "tool_use",
              id: "call_big",
              name: "lookup",
              input: { payload: "p".repeat(50_000) },
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "tool_result",
              tool_use_id: "call_big",
              content: "BIG-RESULT",
            },
          ],
        },
        ...toolRoundTrips(3, 100),
      ],
    });
    assert(body.length <= 40_000, `the attribute is ${body.length} characters`);
    assert(
      !body.includes("BIG-RESULT"),
      "a tool result was kept after the call it answers was dropped",
    );
    assert(
      body.includes("QUESTION") && body.includes("R2:"),
      "the question and the newest round trip must survive",
    );
  });

  await test("a question sharing a message with a tool result keeps only the question", async () => {
    const body = spanModelRequestAttribute({
      messages: [
        { role: "user", content: "EARLIER" },
        {
          role: "assistant",
          content: [
            {
              type: "tool_use",
              id: "call_big",
              name: "lookup",
              input: { payload: "p".repeat(50_000) },
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "tool_result",
              tool_use_id: "call_big",
              content: "MIXED-RESULT",
            },
            { type: "text", text: "FOLLOW-UP-QUESTION" },
          ],
        },
        ...toolRoundTrips(3, 100),
      ],
    });
    assert(body.length <= 40_000, `the attribute is ${body.length} characters`);
    assert(
      body.includes("FOLLOW-UP-QUESTION") && body.includes("R2:"),
      "the question and the newest round trip must survive",
    );
    assert(
      !body.includes("MIXED-RESULT"),
      "a tool result inside the question was kept after its call was dropped",
    );
  });

  await test("a question larger than its floor is shortened, not dropped", async () => {
    const body = spanModelRequestAttribute({
      messages: [
        { role: "user", content: `QUESTION-HEAD ${"q".repeat(60_000)}` },
        ...toolRoundTrips(10, 4_000),
      ],
    });
    const parsed: TrimmedRequest = JSON.parse(body);
    const first = (parsed.messages ?? [])[0];
    assert(body.length <= 40_000, `the attribute is ${body.length} characters`);
    assert(
      first?.role === "user" &&
        typeof first.content === "string" &&
        first.content.startsWith("QUESTION-HEAD") &&
        first.content.includes("[truncated"),
      "the question must keep its role, its opening and a truncation note",
    );
  });

  await test("a request under the cap is written exactly as given", async () => {
    const request = {
      system: "You are helpful.",
      messages: [
        { role: "user", content: "first" },
        { role: "assistant", content: "reply" },
        { role: "user", content: [{ type: "text", text: "second" }] },
        ...toolRoundTrips(3, 50),
      ],
    };
    assert(
      spanModelRequestAttribute(request) === JSON.stringify(request),
      "a request that fits must serialize unchanged",
    );
  });

  const withCapSetting = <T>(value: string | undefined, run: () => T): T => {
    const previous = process.env.NEUROLINK_SPAN_ATTRIBUTE_MAX_CHARS;
    if (value === undefined) {
      delete process.env.NEUROLINK_SPAN_ATTRIBUTE_MAX_CHARS;
    } else {
      process.env.NEUROLINK_SPAN_ATTRIBUTE_MAX_CHARS = value;
    }
    try {
      return run();
    } finally {
      if (previous === undefined) {
        delete process.env.NEUROLINK_SPAN_ATTRIBUTE_MAX_CHARS;
      } else {
        process.env.NEUROLINK_SPAN_ATTRIBUTE_MAX_CHARS = previous;
      }
    }
  };

  await test("NEUROLINK_SPAN_ATTRIBUTE_MAX_CHARS raises the cap for every span payload", async () => {
    const toolResult = { rows: "v".repeat(100_000) };
    const conversation = {
      messages: [
        { role: "user", content: "QUESTION" },
        ...toolRoundTrips(20, 5_000),
      ],
    };
    const capped = withCapSetting(undefined, () => ({
      result: spanContentAttribute(toolResult),
      request: spanModelRequestAttribute(conversation),
    }));
    assert(
      capped.result.length <= 40_000 && capped.request.length <= 40_000,
      "without the setting the default cap must still apply",
    );
    const raised = withCapSetting(" 500000 ", () => ({
      result: spanContentAttribute(toolResult),
      request: spanModelRequestAttribute(conversation),
    }));
    assert(
      raised.result === JSON.stringify(toolResult),
      "a raised cap must keep a 100,000-character tool result whole",
    );
    assert(
      raised.request === JSON.stringify(conversation),
      "a raised cap must keep the whole conversation",
    );
  });

  await test("an unusable cap setting falls back to the default or the minimum", async () => {
    for (const unusable of ["", "abc", "-5", "0", "1.5", "Infinity"]) {
      const cap = withCapSetting(unusable, spanAttributeMaxChars);
      assert(cap === 40_000, `"${unusable}" gave a cap of ${cap}`);
    }
    const tooSmall = withCapSetting("500", spanAttributeMaxChars);
    assert(tooSmall === 10_000, `a cap of 500 became ${tooSmall}`);
    const body = withCapSetting("500", () =>
      spanModelRequestAttribute({
        system: "S".repeat(20_000),
        messages: [
          { role: "user", content: "QUESTION" },
          ...toolRoundTrips(10, 2_000),
        ],
      }),
    );
    assert(
      body.length <= 10_000 && body.includes("QUESTION"),
      "at the minimum cap the request must fit and keep the question",
    );
  });
});
