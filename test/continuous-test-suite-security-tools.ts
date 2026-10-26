#!/usr/bin/env tsx
/**
 * Continuous Test Suite: Tool-layer security hardening (2026-10)
 *
 * Proves the tool-layer fixes of the 2026-10 security hardening:
 *
 * - HITL confirmation runs for the built-in `writeFile` and
 *        `executeBashCommand` tools when a model calls them; a denial leaves
 *        no side effect; an approval runs once with the confirmation's
 *        arguments; the bash tool's description matches that behaviour.
 * - A host-registered JSON Schema tool whose description, default,
 *        const, enum, property names and pattern are hostile is converted
 *        without evaluating any of it: nothing executes, nothing throws, the
 *        tool reaches the wire with its properties.
 * - A `pattern` that can backtrack catastrophically is dropped from a
 *        converted schema and from a remote MCP tool's schema before the
 *        validator is built, so a 28-character argument validates in
 *        milliseconds instead of seconds.
 * - Two external servers offering the same tool name both stay callable;
 *        the later one is qualified as `<serverId>__<tool>` and a warning
 *        names both servers.
 * - `calculateMath` evaluates arithmetic with a parser, not `Function`.
 * - A `__proto__` key in model JSON leaves `structuredData` with
 *        `Object.prototype` and no inherited fields.
 * - A `$regex` RAG filter with a ReDoS pattern is refused quickly while
 *        a benign pattern still matches.
 *
 * Determinism exception (CLAUDE.md rule 15). This suite imports from `src/`,
 * never from `dist/`, and is listed in the `neurolink/e2e-tests-only` allow
 * list. What determinism buys: the HITL cases need a model that calls
 * `writeFile` and `executeBashCommand` with chosen arguments on demand, which
 * a scripted loopback chat server provides and no live model guarantees; the
 * schema cases need hostile JSON Schemas fed to the converter, the external
 * MCP tool builder (`ToolsManager`, exported from no package entry point) and
 * a fake server list, since no real MCP server is wired here; the collision
 * case needs two servers that offer one name; `coerceJsonToSchema` and
 * `InMemoryVectorStore` are exercised on fixed payloads. Everything comes from
 * `src`; loopback stand-ins only, no keys and no network beyond 127.0.0.1.
 *
 * Every case fails on the pre-fix code: the HITL cases see zero confirmations
 * and a written file, the pattern cases take seconds, the collision case
 * finds one tool, the `__proto__` case reads `isAdmin === true`, and
 * `calculateMath` evaluates `globalThis` to an object.
 *
 * Run: pnpm exec tsx test/continuous-test-suite-security-tools.ts
 */
import "./helpers/credentialFreeEnv.js";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { z } from "zod";
import {
  assert,
  assertEqual,
  defineSuite,
  Skip,
  tempDir,
} from "./helpers/harness.js";
import {
  chatCompletion,
  mockOpenAICredentials,
  startMockChatServer,
  startScriptedChatServer,
  type ScriptedReply,
} from "./helpers/mockChatServer.js";
import type {
  ConfirmationRequestEvent,
  ConfirmationResponseEvent,
  HITLConfig,
  Tool,
} from "../src/lib/types/index.js";
import type { NeuroLink as NeuroLinkType } from "../src/lib/neurolink.js";

// The bash tool is opt-in and `directAgentTools` is built when its module is
// first evaluated, so these must be set before any `src` module loads; that
// is why the SDK imports below are dynamic.
process.env.NEUROLINK_ENABLE_BASH_TOOL = "true";
process.env.NEUROLINK_SKIP_MCP = "true";
delete process.env.NEUROLINK_DISABLE_BUILTIN_TOOLS;

const { NeuroLink } = await import("../src/lib/neurolink.js");
const { AIProviderFactory } = await import("../src/lib/core/factory.js");
const { ToolsManager } =
  await import("../src/lib/core/modules/ToolsManager.js");
const { AIProviderName } = await import("../src/lib/constants/enums.js");
const { convertJsonSchemaToZod } =
  await import("../src/lib/utils/schemaConversion.js");
const { coerceJsonToSchema } = await import("../src/lib/utils/json/coerce.js");
const { InMemoryVectorStore } =
  await import("../src/lib/rag/retrieval/vectorQueryTool.js");
const { directAgentTools, createBashTool } =
  await import("../src/lib/agent/directTools.js");

const { test, section, runSuite } = defineSuite("Tool-layer security", {
  offline: true,
});

/** A pattern whose match cost doubles with every extra character of input. */
const REDOS_PATTERN = "^(a+)+$";
/** 28 `a`s and a character that defeats `$`: seconds on the old code. */
const REDOS_SUBJECT = `${"a".repeat(28)}!`;
/** Generous for a linear check; the unfixed code takes thousands of ms. */
const FAST_MS = 100;

const toolCall = (
  id: string,
  name: string,
  args: Record<string, unknown>,
): Record<string, unknown> => ({
  id,
  type: "function",
  function: { name, arguments: JSON.stringify(args) },
});

const callThenAnswer = (
  name: string,
  args: Record<string, unknown>,
): ScriptedReply[] => [
  chatCompletion({
    content: null,
    finishReason: "tool_calls",
    toolCalls: [toolCall("call_1", name, args)],
  }),
  chatCompletion({ content: "done", finishReason: "stop" }),
];

type HitlAnswer = {
  approved: boolean;
  reason?: string;
  modifiedArguments?: unknown;
};

/**
 * Wire a HITL responder onto an instance's emitter. Every confirmation request
 * is recorded and answered with `answer`, so a case can count requests and
 * check what the model asked for.
 */
const answerConfirmations = (
  nl: NeuroLinkType,
  answer: (request: ConfirmationRequestEvent["payload"]) => HitlAnswer,
): ConfirmationRequestEvent["payload"][] => {
  const requests: ConfirmationRequestEvent["payload"][] = [];
  const emitter = nl.getEventEmitter();
  emitter.on("hitl:confirmation-request", (...args: unknown[]) => {
    const { payload } = args[0] as ConfirmationRequestEvent;
    requests.push(payload);
    const receivedAt = Date.now();
    const decision = answer(payload);
    emitter.emit("hitl:confirmation-response", {
      type: "hitl:confirmation-response",
      payload: {
        confirmationId: payload.confirmationId,
        approved: decision.approved,
        reason: decision.reason,
        modifiedArguments: decision.modifiedArguments,
        metadata: {
          timestamp: new Date().toISOString(),
          responseTime: Date.now() - receivedAt,
        },
      },
    } satisfies ConfirmationResponseEvent);
  });
  return requests;
};

/** `dangerousActions` that match neither built-in, so only the default gates them. */
const HITL_WITHOUT_BUILTIN_KEYWORDS: HITLConfig = {
  enabled: true,
  dangerousActions: ["delete"],
  timeout: 5_000,
};

/**
 * Run one scripted turn: the stand-in asks for `toolName(args)`, then
 * answers "done". Returns the HITL requests seen and the instance's emitter
 * tool events, for the assertions.
 */
const runGatedTurn = async (options: {
  hitl: HITLConfig;
  roots: string;
  toolName: string;
  args: Record<string, unknown>;
  answer: (request: ConfirmationRequestEvent["payload"]) => HitlAnswer;
}): Promise<{
  requests: ConfirmationRequestEvent["payload"][];
  toolEnds: Array<{ toolName: string; success: boolean }>;
  requestCount: number;
}> => {
  const server = await startScriptedChatServer(
    callThenAnswer(options.toolName, options.args),
  );
  const nl = new NeuroLink({
    hitl: options.hitl,
    tools: { fileRoots: [options.roots] },
  });
  const toolEnds: Array<{ toolName: string; success: boolean }> = [];
  nl.getEventEmitter().on("tool:end", (...args: unknown[]) => {
    const event = args[0] as { toolName?: string; success?: boolean };
    toolEnds.push({
      toolName: String(event.toolName),
      success: event.success === true,
    });
  });
  const requests = answerConfirmations(nl, options.answer);
  try {
    await nl.generate({
      input: { text: "use the tool, then say done" },
      provider: "openai",
      model: "scripted-model",
      credentials: mockOpenAICredentials(server),
      maxSteps: 3,
      maxTokens: 64,
    });
    return { requests, toolEnds, requestCount: server.requestCount() };
  } finally {
    await nl.shutdown();
    await server.close();
  }
};

/**
 * Capture `console.warn` while `run` executes, with the logger's debug gate
 * open: without `NEUROLINK_DEBUG` the logger prints nothing below error, so
 * a warning is only observable with the gate open. Debug and info output is
 * swallowed for the duration so the capture stays readable.
 */
const captureWarnings = async <T>(
  run: () => Promise<T>,
): Promise<{ result: T; warnings: string[] }> => {
  const previousDebug = process.env.NEUROLINK_DEBUG;
  const original = {
    warn: console.warn,
    debug: console.debug,
    info: console.info,
  };
  const warnings: string[] = [];
  process.env.NEUROLINK_DEBUG = "true";
  console.warn = (...args: unknown[]) => {
    warnings.push(args.map((arg) => String(arg)).join(" "));
  };
  console.debug = () => {};
  console.info = () => {};
  try {
    const result = await run();
    return { result, warnings };
  } finally {
    console.warn = original.warn;
    console.debug = original.debug;
    console.info = original.info;
    if (previousDebug === undefined) {
      delete process.env.NEUROLINK_DEBUG;
    } else {
      process.env.NEUROLINK_DEBUG = previousDebug;
    }
  }
};

type ExternalToolFixture = {
  name: string;
  description: string;
  serverId: string;
  inputSchema: Record<string, unknown>;
};

/** A ToolsManager over a fake instance that offers `fixtures` as external MCP tools. */
const toolsManagerFor = (fixtures: ExternalToolFixture[]) => {
  const executed: Array<{ serverId: string; name: string }> = [];
  const fakeInstance = {
    getExternalMCPTools: () => fixtures,
    executeExternalMCPTool: async (serverId: string, name: string) => {
      executed.push({ serverId, name });
      return { content: [{ type: "text", text: `${serverId}:${name}` }] };
    },
  } as unknown as NeuroLinkType;
  const manager = new ToolsManager(AIProviderName.OPENAI, {}, fakeInstance);
  return { manager, executed };
};

const schemaOf = (
  tool: Tool,
): {
  validate?: (value: unknown) => { success: boolean } | Promise<unknown>;
  jsonSchema: Record<string, unknown>;
} =>
  tool.inputSchema as unknown as {
    validate?: (value: unknown) => { success: boolean } | Promise<unknown>;
    jsonSchema: Record<string, unknown>;
  };

const executeTool = async (
  tool: Tool,
  args: Record<string, unknown>,
): Promise<unknown> => {
  const execute = (
    tool as { execute?: (a: unknown, o: unknown) => Promise<unknown> }
  ).execute;
  if (typeof execute !== "function") {
    throw new Error("tool has no execute function");
  }
  return execute(args, { toolCallId: "call_test", messages: [] });
};

const pwnedMarker = (): unknown =>
  (globalThis as { __pwned?: unknown }).__pwned;

/**
 * A JSON Schema whose every string position would, if ever evaluated as
 * JavaScript, set `globalThis.__pwned`. Property names carry quotes, a
 * backtick template and a `__proto__` key; `description`, `default`, `const`
 * and `enum` carry U+2028 / U+2029 line terminators, which split a JS string
 * literal in older engines.
 */
const hostileSchema = (): Record<string, unknown> => ({
  type: "object",
  properties: {
    'a"]); globalThis.__pwned = 1; //': {
      type: "string",
      description: 'x"; globalThis.__pwned = 2; //',
    },
    "b`${globalThis.__pwned = 3}`": {
      type: "string",
      default: "`${globalThis.__pwned = 4}`",
    },
    c: { type: "string", enum: ["x globalThis.__pwned = 5", "y"] },
    d: { const: " globalThis.__pwned = 6" },
    __proto__: {
      type: "object",
      properties: { isAdmin: { type: "boolean", default: true } },
    },
    e: { type: "string", pattern: REDOS_PATTERN },
    f: { type: "string", pattern: "^[a-z]+$" },
    city: { type: "string" },
  },
  required: ["city", "f"],
});

// ---------------------------------------------------------------------------
// C3 — HITL for built-in tools
// ---------------------------------------------------------------------------
section("C3 — HITL covers the built-in tools");

await test("a model-driven writeFile call is confirmed once and a denial writes nothing", async () => {
  const roots = tempDir("nl-sec-hitl-write-");
  const { requests, toolEnds, requestCount } = await runGatedTurn({
    hitl: HITL_WITHOUT_BUILTIN_KEYWORDS,
    roots,
    toolName: "writeFile",
    args: { path: "pwned.txt", content: "owned", mode: "create" },
    answer: () => ({ approved: false, reason: "not today" }),
  });
  assert(
    requestCount === 2,
    `precondition: the stand-in must see the tool-call turn and the follow-up (saw ${requestCount})`,
  );
  assertEqual(requests.length, 1, "exactly one confirmation request");
  assertEqual(
    requests[0]?.toolName,
    "writeFile",
    "confirmation names the tool",
  );
  assertEqual(requests[0]?.serverId, "direct", "confirmation marks a built-in");
  assert(
    !existsSync(join(roots, "pwned.txt")),
    "a denied writeFile must not create the file",
  );
  const writeEnds = toolEnds.filter((e) => e.toolName === "writeFile");
  assertEqual(writeEnds.length, 1, "one tool:end for the denied call");
  assertEqual(writeEnds[0]?.success, false, "the denied call reports failure");
});

await test("a model-driven executeBashCommand call is confirmed once and a denial runs nothing", async () => {
  const roots = tempDir("nl-sec-hitl-bash-");
  const { requests, requestCount } = await runGatedTurn({
    hitl: HITL_WITHOUT_BUILTIN_KEYWORDS,
    roots,
    toolName: "executeBashCommand",
    args: { command: "touch bash-marker.txt" },
    answer: () => ({ approved: false, reason: "no shell" }),
  });
  assert(
    requestCount === 2,
    `precondition: the stand-in must see the tool-call turn and the follow-up (saw ${requestCount})`,
  );
  assertEqual(requests.length, 1, "exactly one confirmation request");
  assertEqual(
    requests[0]?.toolName,
    "executeBashCommand",
    "confirmation names the bash tool",
  );
  assert(
    !existsSync(join(roots, "bash-marker.txt")),
    "a denied command must not run",
  );
});

await test("an approved writeFile call runs once, with the arguments the confirmation returned", async () => {
  const roots = tempDir("nl-sec-hitl-approve-");
  const { requests, toolEnds } = await runGatedTurn({
    hitl: HITL_WITHOUT_BUILTIN_KEYWORDS,
    roots,
    toolName: "writeFile",
    args: { path: "model.txt", content: "from the model", mode: "create" },
    answer: () => ({
      approved: true,
      modifiedArguments: {
        path: "approved.txt",
        content: "from the human",
        mode: "create",
      },
    }),
  });
  assertEqual(requests.length, 1, "exactly one confirmation request");
  assert(
    !existsSync(join(roots, "model.txt")),
    "the model's path must not be written once the human changed it",
  );
  assert(
    existsSync(join(roots, "approved.txt")),
    "the approved path must be written",
  );
  assertEqual(
    readFileSync(join(roots, "approved.txt"), "utf8"),
    "from the human",
    "the approved content is what was written",
  );
  const writeEnds = toolEnds.filter((e) => e.toolName === "writeFile");
  assertEqual(writeEnds.length, 1, "one tool:end for the approved call");
  assertEqual(writeEnds[0]?.success, true, "the approved call succeeds");
});

await test("dangerousActions keywords gate built-in tools too", async () => {
  // `read` matches `readFile`, which is not in the always-confirm set, so a
  // confirmation here can only come from keyword matching.
  const roots = tempDir("nl-sec-hitl-keyword-");
  const { requests } = await runGatedTurn({
    hitl: { enabled: true, dangerousActions: ["read"], timeout: 5_000 },
    roots,
    toolName: "readFile",
    args: { path: "missing.txt" },
    answer: () => ({ approved: false, reason: "no reads" }),
  });
  assertEqual(
    requests.length,
    1,
    "readFile is confirmed when a keyword matches",
  );
  assertEqual(requests[0]?.toolName, "readFile", "confirmation names readFile");
});

await test("hitl.confirmBuiltinTools:false leaves writeFile to keyword gating", async () => {
  const probe = new NeuroLink({
    hitl: { ...HITL_WITHOUT_BUILTIN_KEYWORDS, confirmBuiltinTools: false },
  });
  try {
    const manager = probe.getToolRegistry().getHITLManager();
    if (manager?.getConfig().confirmBuiltinTools === undefined) {
      throw new Skip(
        "HITLManager.validateConfig does not carry confirmBuiltinTools yet",
      );
    }
  } finally {
    await probe.shutdown();
  }
  const roots = tempDir("nl-sec-hitl-optout-");
  const { requests } = await runGatedTurn({
    hitl: { ...HITL_WITHOUT_BUILTIN_KEYWORDS, confirmBuiltinTools: false },
    roots,
    toolName: "writeFile",
    args: { path: "unconfirmed.txt", content: "ok", mode: "create" },
    answer: () => ({ approved: false }),
  });
  assertEqual(requests.length, 0, "no confirmation once the default is off");
  assert(
    existsSync(join(roots, "unconfirmed.txt")),
    "with the default off, writeFile runs unconfirmed",
  );
});

await test("the bash tool's description promises confirmation only under HITL", async () => {
  const description = String(createBashTool({ roots: null }).description);
  assert(
    /when hitl is enabled/i.test(description),
    "description ties confirmation to HITL being enabled",
  );
  assert(
    !/requires hitl confirmation when enabled\./i.test(description),
    "the old unconditional wording is gone",
  );
});

// ---------------------------------------------------------------------------
// C4 / C9 — no eval over tool schemas, no ReDoS through `pattern`
// ---------------------------------------------------------------------------
section("C4 / C9 — JSON Schema conversion without eval or ReDoS");

await test("a hostile JSON Schema tool is converted without executing anything and reaches the wire", async () => {
  delete (globalThis as { __pwned?: unknown }).__pwned;
  const server = await startMockChatServer();
  try {
    const provider = await AIProviderFactory.createProvider(
      "openai",
      "gpt-4o-mini",
      false,
      undefined,
      undefined,
      mockOpenAICredentials(server),
    );
    provider.setupToolExecutor(
      {
        customTools: new Map([
          [
            "hostile_schema_tool",
            {
              description: "probe tool with hostile JSON Schema parameters",
              parameters: hostileSchema(),
              execute: async () => ({ ok: true }),
            },
          ],
        ]),
        executeTool: async () => ({ ok: true }),
      },
      "security-tools-suite",
    );
    await provider.generate({
      input: { text: "HOSTILE_SCHEMA_TOOL_GENERATE" },
      disableTools: false,
      maxTokens: 16,
    });
    assertEqual(pwnedMarker(), undefined, "no schema string was executed");
    const body = server.getLastRequestBody();
    if (body === null) {
      throw new Error("precondition: the stand-in received no request");
    }
    const parsed = JSON.parse(body) as {
      tools?: Array<{ function?: { name?: string; parameters?: unknown } }>;
    };
    const declared = (parsed.tools ?? []).find(
      (entry) => entry.function?.name === "hostile_schema_tool",
    );
    assert(declared !== undefined, "the tool reached the wire");
    const parameters = declared?.function?.parameters as
      | { properties?: Record<string, unknown> }
      | undefined;
    const keys = Object.keys(parameters?.properties ?? {});
    assert(keys.includes("city"), "declared parameters keep their properties");
    assert(
      !keys.includes("__proto__"),
      "a __proto__ property name is dropped from the declaration",
    );
  } finally {
    await server.close();
  }
});

await test("a ReDoS pattern is dropped from a converted schema and a 28-character argument validates quickly", async () => {
  delete (globalThis as { __pwned?: unknown }).__pwned;
  const { result: schema, warnings } = await captureWarnings(async () =>
    convertJsonSchemaToZod(hostileSchema()),
  );
  assertEqual(pwnedMarker(), undefined, "conversion executed nothing");
  assert(
    warnings.some((line) => /regular expression pattern/i.test(line)),
    "dropping a pattern is logged as a warning",
  );
  const started = performance.now();
  const outcome = schema.safeParse({ city: "x", f: "abc", e: REDOS_SUBJECT });
  const elapsed = performance.now() - started;
  assert(
    elapsed < FAST_MS,
    `validation against the dropped pattern took ${Math.round(elapsed)} ms`,
  );
  assertEqual(outcome.success, true, "the field validates without its pattern");
  assertEqual(
    schema.safeParse({ city: "x", f: "ABC" }).success,
    false,
    "a safe pattern still validates",
  );
  const declared = z.toJSONSchema(schema) as {
    properties?: Record<string, { pattern?: string }>;
  };
  assertEqual(
    declared.properties?.e?.pattern,
    undefined,
    "the dropped pattern is absent from the declared schema",
  );
  assertEqual(
    declared.properties?.f?.pattern,
    "^[a-z]+$",
    "the safe pattern is still declared",
  );
});

await test("a remote MCP schema's ReDoS pattern is removed before its validator is built", async () => {
  const { manager } = toolsManagerFor([
    {
      name: "lookup",
      description: "remote tool with a hostile pattern",
      serverId: "evil-server",
      inputSchema: {
        type: "object",
        properties: {
          s: { type: "string", pattern: REDOS_PATTERN },
          t: { type: "string", pattern: "^[a-z]+$" },
        },
        required: ["s", "t"],
      },
    },
  ]);
  const { result: tools, warnings } = await captureWarnings(() =>
    manager.getAllTools(),
  );
  const tool = tools.lookup;
  assert(tool !== undefined, "the tool is registered");
  assert(
    warnings.some((line) => /evil-server/.test(line) && /pattern/i.test(line)),
    "the removal is logged with the server name",
  );
  const schema = schemaOf(tool);
  const declaredS = (
    schema.jsonSchema.properties as Record<string, { pattern?: string }>
  ).s;
  assertEqual(
    declaredS?.pattern,
    undefined,
    "the pattern is gone from the declaration",
  );
  assert(typeof schema.validate === "function", "a validator is attached");
  const started = performance.now();
  const outcome = (await schema.validate?.({ s: REDOS_SUBJECT, t: "abc" })) as {
    success: boolean;
  };
  const elapsed = performance.now() - started;
  assert(elapsed < FAST_MS, `validation took ${Math.round(elapsed)} ms`);
  assertEqual(
    outcome.success,
    true,
    "the argument validates without the pattern",
  );
  const rejected = (await schema.validate?.({ s: "x", t: "ABC" })) as {
    success: boolean;
  };
  assertEqual(rejected.success, false, "the safe pattern still rejects");
});

// ---------------------------------------------------------------------------
// C8 — tool name collisions
// ---------------------------------------------------------------------------
section("C8 — external tool name collisions");

await test("two servers offering one tool name both stay callable, and a warning names both", async () => {
  const shared = {
    type: "object",
    properties: { q: { type: "string" } },
    required: ["q"],
  };
  const { manager, executed } = toolsManagerFor([
    {
      name: "search",
      description: "alpha search",
      serverId: "alpha",
      inputSchema: shared,
    },
    {
      name: "search",
      description: "beta search",
      serverId: "beta",
      inputSchema: shared,
    },
  ]);
  const { result: tools, warnings } = await captureWarnings(() =>
    manager.getAllTools(),
  );
  assert(tools.search !== undefined, "the first server keeps the plain name");
  assert(tools.beta__search !== undefined, "the second server is qualified");
  assert(
    warnings.some((line) => /alpha/.test(line) && /beta/.test(line)),
    "the collision warning names both servers",
  );
  await executeTool(tools.search, { q: "one" });
  await executeTool(tools.beta__search, { q: "two" });
  assertEqual(
    executed.map((e) => e.serverId).join(","),
    "alpha,beta",
    "each name executes on its own server",
  );
  assert(
    executed.every((e) => e.name === "search"),
    "the qualified tool is executed under its real name on its server",
  );
});

// ---------------------------------------------------------------------------
// C6 — calculateMath
// ---------------------------------------------------------------------------
section("C6 — calculateMath without dynamic code");

await test("calculateMath evaluates arithmetic and refuses everything else", async () => {
  delete (globalThis as { __pwned?: unknown }).__pwned;
  const run = (expression: string) =>
    executeTool(directAgentTools.calculateMath, {
      expression,
      precision: 2,
    }) as Promise<{ success: boolean; result?: unknown; error?: string }>;

  assertEqual((await run("2+2")).result, 4, "2+2");
  assertEqual((await run("Math.sqrt(16)")).result, 4, "Math.sqrt(16)");
  assertEqual(
    (await run("sqrt(16) + pow(2, 3)")).result,
    12,
    "prefix-less names",
  );
  assertEqual(
    (await run("2 * (3 + 4) % 5")).result,
    4,
    "precedence and modulo",
  );
  assertEqual(
    (await run("-2 ** 2")).result,
    -4,
    "unary minus binds looser than **",
  );
  assertEqual((await run("PI")).success, true, "constants");

  const huge = await run("9**9**9");
  assertEqual(huge.success, false, "a non-finite result is a clean error");
  assert(
    typeof huge.error === "string" && huge.error.length > 0,
    "the error explains itself",
  );

  for (const expression of [
    "process.exit(1)",
    "globalThis",
    "globalThis.__pwned = 1",
    "this.constructor.constructor('return process')()",
    "[].constructor",
    "1; globalThis.__pwned = 1",
  ]) {
    const outcome = await run(expression);
    assertEqual(outcome.success, false, "non-arithmetic input is refused");
    assertEqual(outcome.result, undefined, "refused input yields no result");
  }
  assertEqual(pwnedMarker(), undefined, "no expression was executed as code");
});

// ---------------------------------------------------------------------------
// F3 — prototype of structuredData
// ---------------------------------------------------------------------------
section("F3 — model JSON cannot replace the prototype of structuredData");

await test("a __proto__ key beside a stringified field leaves structuredData with a clean prototype", async () => {
  const text =
    '{"__proto__":{"isAdmin":true,"approved":"yes"},"payload":"{\\"a\\":1}"}';
  const schema = z.object({
    payload: z.object({ a: z.number() }),
    approved: z.string().optional(),
  });
  const result = coerceJsonToSchema(text, schema);
  assert(result !== null, "the payload is recovered");
  const data = result?.structuredData as Record<string, unknown>;
  assert(
    Object.getPrototypeOf(data) === Object.prototype,
    "structuredData keeps Object.prototype",
  );
  assertEqual("isAdmin" in data, false, "no inherited isAdmin field");
  assertEqual(data.approved, undefined, "no inherited approved field");
  assertEqual(
    (data.payload as { a?: unknown } | undefined)?.a,
    1,
    "the stringified field is still unwrapped",
  );
  assertEqual(
    ({} as { isAdmin?: unknown }).isAdmin,
    undefined,
    "Object.prototype itself is untouched",
  );
});

// ---------------------------------------------------------------------------
// F4 — $regex metadata filter
// ---------------------------------------------------------------------------
section("F4 — $regex filters are vetted before they compile");

await test("a $regex filter with a ReDoS pattern is refused quickly and a benign one still matches", async () => {
  const store = new InMemoryVectorStore();
  await store.upsert("docs", [
    { id: "1", vector: [1, 0], metadata: { name: REDOS_SUBJECT } },
    { id: "2", vector: [0, 1], metadata: { name: "bbb" } },
  ]);
  const started = performance.now();
  const refused = await store.query({
    indexName: "docs",
    queryVector: [1, 0],
    topK: 5,
    filter: { name: { $regex: REDOS_PATTERN } },
  });
  const elapsed = performance.now() - started;
  assert(
    elapsed < FAST_MS,
    `the refused pattern took ${Math.round(elapsed)} ms`,
  );
  assertEqual(refused.length, 0, "a refused pattern matches nothing");
  const matched = await store.query({
    indexName: "docs",
    queryVector: [1, 0],
    topK: 5,
    filter: { name: { $regex: "^a+!$" } },
  });
  assertEqual(matched.length, 1, "a benign pattern still filters");
  assertEqual(matched[0]?.id, "1", "the benign pattern matches the right row");
});

await runSuite();
