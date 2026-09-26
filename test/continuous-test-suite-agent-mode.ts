/**
 * Opt-in terminal agent mode, `--max-steps`, and readFile's binary-document
 * error — end to end through the built CLI and the public `dist` SDK.
 *
 * Every case runs offline against a local scripted chat endpoint through the
 * `openai-compatible` provider, so the assertions are about what Neurolink
 * sends and returns, never about what a live model chooses to do.
 *
 * Run: pnpm run test:agent-mode
 */

import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  NeuroLink,
  TERMINAL_AGENT_PROMPT_V1,
  TERMINAL_AGENT_PROMPT_V2,
  TERMINAL_AGENT_PROMPT_VERSION,
} from "../dist/index.js";
import { assertDistFresh } from "./helpers/distFreshness.js";
import {
  defineSuite,
  runCLI,
  runCommand,
  tempDir,
  type ProcessResult,
} from "./helpers/harness.js";
import {
  chatCompletion,
  startScriptedChatServer,
  startScriptedStreamingChatServer,
  type ScriptedChatServer,
  type ScriptedReply,
} from "./helpers/mockChatServer.js";
import { makeDocx } from "./helpers/officeFixtures.js";

assertDistFresh();

const { test, runSuite } = defineSuite("Terminal agent mode", {
  offline: true,
});

/** First sentence of every prompt version; the suite checks placement, not wording. */
const AGENT_PROMPT_MARKER = "You are operating autonomously in a terminal.";
const CALLER_SYSTEM = "CALLER-SYSTEM-PROMPT-7f3a";
const CLI_ENTRY = resolve("dist/cli/index.js");

type ChatMessage = { role?: string; content?: unknown };

const toolCall = (id: string, name: string, args: Record<string, unknown>) => ({
  id,
  type: "function",
  function: { name, arguments: JSON.stringify(args) },
});

const callTools = (calls: Array<Record<string, unknown>>): ScriptedReply =>
  chatCompletion({
    content: null,
    finishReason: "tool_calls",
    toolCalls: calls,
  });

const providerEnv = (
  server: ScriptedChatServer,
  builtinTools: boolean,
): Record<string, string> => ({
  OPENAI_COMPATIBLE_BASE_URL: server.baseURL.replace(/\/v1$/, ""),
  OPENAI_COMPATIBLE_API_KEY: "test-key",
  NEUROLINK_SKIP_MCP: "true",
  NEUROLINK_DISABLE_BUILTIN_TOOLS: builtinTools ? "false" : "true",
});

const PROVIDER_ARGS = [
  "--provider",
  "openai-compatible",
  "--model",
  "test-model",
];

const requestMessages = (body: string | null): ChatMessage[] => {
  assert.ok(body, "no request body was recorded");
  const parsed = JSON.parse(body) as { messages?: ChatMessage[] };
  return parsed.messages ?? [];
};

const systemText = (messages: ChatMessage[]): string =>
  messages
    .filter((message) => message.role === "system")
    .map((message) =>
      typeof message.content === "string" ? message.content : "",
    )
    .join("\n");

const parseJsonStdout = (result: ProcessResult): Record<string, unknown> => {
  const start = result.stdout.indexOf("{");
  const end = result.stdout.lastIndexOf("}");
  assert.ok(start >= 0 && end > start, "CLI printed no JSON object");
  return JSON.parse(result.stdout.slice(start, end + 1)) as Record<
    string,
    unknown
  >;
};

await test("generate and stream --help list --agent-mode and --max-steps", async () => {
  for (const command of ["generate", "stream"]) {
    const result = await runCLI([command, "--help"]);
    assert.equal(result.exitCode, 0, `${command} --help exited non-zero`);
    assert.match(
      result.stdout,
      /--agent-?[mM]ode/,
      `${command} --help lacks --agent-mode`,
    );
    assert.match(
      result.stdout,
      /--max-?[sS]teps/,
      `${command} --help lacks --max-steps`,
    );
  }
});

await test("without --agent-mode the caller's system prompt reaches the model on its own", async () => {
  const server = await startScriptedChatServer([
    chatCompletion({ content: "ok" }),
  ]);
  try {
    const result = await runCLI(
      [
        "generate",
        "hello",
        ...PROVIDER_ARGS,
        "--system",
        CALLER_SYSTEM,
        "--format",
        "json",
        "--quiet",
      ],
      { env: providerEnv(server, false) },
    );
    assert.equal(
      server.requestCount(),
      1,
      "the model endpoint was not called exactly once",
    );
    assert.equal(result.exitCode, 0, "generate exited non-zero");
    const system = systemText(requestMessages(server.getLastRequestBody()));
    assert.ok(
      system.includes(CALLER_SYSTEM),
      "caller system prompt missing from the request",
    );
    assert.ok(
      !system.includes(AGENT_PROMPT_MARKER),
      "agent prompt sent without --agent-mode",
    );
    assert.equal(
      parseJsonStdout(result).agentModeVersion,
      undefined,
      "agentModeVersion reported without --agent-mode",
    );
  } finally {
    await server.close();
  }
});

await test("--agent-mode sends the agent prompt first and keeps the caller's system prompt", async () => {
  const server = await startScriptedChatServer([
    chatCompletion({ content: "ok" }),
  ]);
  try {
    const result = await runCLI(
      [
        "generate",
        "hello",
        ...PROVIDER_ARGS,
        "--agent-mode",
        "--system",
        CALLER_SYSTEM,
        "--format",
        "json",
        "--quiet",
      ],
      { env: providerEnv(server, false) },
    );
    assert.equal(
      server.requestCount(),
      1,
      "the model endpoint was not called exactly once",
    );
    assert.equal(result.exitCode, 0, "generate --agent-mode exited non-zero");
    const system = systemText(requestMessages(server.getLastRequestBody()));
    const markerAt = system.indexOf(AGENT_PROMPT_MARKER);
    assert.equal(
      markerAt,
      0,
      "system prompt does not start with the agent prompt",
    );
    assert.ok(
      system.indexOf(CALLER_SYSTEM) > markerAt,
      "caller system prompt missing after the agent prompt",
    );
    assert.equal(
      parseJsonStdout(result).agentModeVersion,
      TERMINAL_AGENT_PROMPT_VERSION,
      "agentModeVersion is not the current version in the JSON output",
    );
  } finally {
    await server.close();
  }
});

await test("SDK generate() and stream() accept agentMode and report agentModeVersion", async () => {
  const saved = { ...process.env };
  const generateServer = await startScriptedChatServer([
    chatCompletion({ content: "ok" }),
  ]);
  const streamServer = await startScriptedStreamingChatServer([
    chatCompletion({ content: "ok" }),
  ]);
  try {
    Object.assign(process.env, providerEnv(generateServer, false));
    const sdk = new NeuroLink();
    const generated = await sdk.generate({
      input: { text: "hello" },
      provider: "openai-compatible",
      model: "test-model",
      systemPrompt: CALLER_SYSTEM,
      agentMode: true,
      disableInternalFallback: true,
    } as Parameters<InstanceType<typeof NeuroLink>["generate"]>[0]);
    const generateSystem = systemText(
      requestMessages(generateServer.getLastRequestBody()),
    );
    assert.equal(
      generateSystem.indexOf(AGENT_PROMPT_MARKER),
      0,
      "generate(): agent prompt not first",
    );
    assert.ok(
      generateSystem.includes(CALLER_SYSTEM),
      "generate(): caller system prompt dropped",
    );
    assert.equal(
      (generated as { agentModeVersion?: string }).agentModeVersion,
      TERMINAL_AGENT_PROMPT_VERSION,
      "generate(): agentModeVersion missing",
    );

    Object.assign(process.env, providerEnv(streamServer, false));
    const streamed = await new NeuroLink().stream({
      input: { text: "hello" },
      provider: "openai-compatible",
      model: "test-model",
      agentMode: { version: "1" },
      disableInternalFallback: true,
    } as Parameters<InstanceType<typeof NeuroLink>["stream"]>[0]);
    for await (const _chunk of streamed.stream) {
      // Drain so the request completes.
    }
    assert.equal(
      streamServer.requestCount(),
      1,
      "stream(): the model endpoint was not called once",
    );
    const streamSystem = systemText(
      requestMessages(streamServer.getLastRequestBody()),
    );
    assert.equal(
      streamSystem.indexOf(AGENT_PROMPT_MARKER),
      0,
      "stream(): agent prompt not first",
    );
    assert.equal(
      (streamed as { agentModeVersion?: string }).agentModeVersion,
      "1",
      "stream(): agentModeVersion missing",
    );
  } finally {
    process.env = saved;
    await generateServer.close();
    await streamServer.close();
  }
});

await test("agentMode: true sends the current prompt, and a pinned version sends its own", async () => {
  assert.equal(
    TERMINAL_AGENT_PROMPT_VERSION,
    "2",
    "the current version is not the newest prompt",
  );
  assert.notEqual(
    TERMINAL_AGENT_PROMPT_V1,
    TERMINAL_AGENT_PROMPT_V2,
    "V1 and V2 are the same text",
  );
  const saved = { ...process.env };
  const cases: Array<{
    agentMode: boolean | { version: "1" | "2" };
    prompt: string;
    version: string;
  }> = [
    { agentMode: true, prompt: TERMINAL_AGENT_PROMPT_V2, version: "2" },
    {
      agentMode: { version: "2" },
      prompt: TERMINAL_AGENT_PROMPT_V2,
      version: "2",
    },
    {
      agentMode: { version: "1" },
      prompt: TERMINAL_AGENT_PROMPT_V1,
      version: "1",
    },
  ];
  try {
    for (const { agentMode, prompt, version } of cases) {
      const server = await startScriptedChatServer([
        chatCompletion({ content: "ok" }),
      ]);
      try {
        Object.assign(process.env, providerEnv(server, false));
        const generated = await new NeuroLink().generate({
          input: { text: "hello" },
          provider: "openai-compatible",
          model: "test-model",
          systemPrompt: CALLER_SYSTEM,
          agentMode,
          disableInternalFallback: true,
        } as Parameters<InstanceType<typeof NeuroLink>["generate"]>[0]);
        const system = systemText(requestMessages(server.getLastRequestBody()));
        assert.ok(
          system.startsWith(`${prompt}\n\n`),
          `version ${version}: the request does not start with that version's prompt`,
        );
        assert.ok(
          system.includes(CALLER_SYSTEM),
          `version ${version}: caller system prompt dropped`,
        );
        assert.equal(
          (generated as { agentModeVersion?: string }).agentModeVersion,
          version,
          `version ${version}: wrong agentModeVersion reported`,
        );
      } finally {
        await server.close();
      }
    }
  } finally {
    process.env = saved;
  }
});

await test("an unknown agentMode version is rejected before any model call", async () => {
  const saved = { ...process.env };
  const server = await startScriptedChatServer([
    chatCompletion({ content: "ok" }),
  ]);
  try {
    Object.assign(process.env, providerEnv(server, false));
    await assert.rejects(
      new NeuroLink().generate({
        input: { text: "hello" },
        provider: "openai-compatible",
        model: "test-model",
        agentMode: { version: "9" },
        disableInternalFallback: true,
      } as unknown as Parameters<
        InstanceType<typeof NeuroLink>["generate"]
      >[0]),
      /agentMode\.version/,
      "an unknown version was not rejected with an agentMode.version error",
    );
    assert.equal(
      server.requestCount(),
      0,
      "the model endpoint was called for an unknown version",
    );
  } finally {
    process.env = saved;
    await server.close();
  }
});

await test("--max-steps 2 stops an endless tool loop and reports the step cap", async () => {
  const server = await startScriptedChatServer([
    callTools([toolCall("call_1", "getCurrentTime", {})]),
  ]);
  try {
    const result = await runCLI(
      [
        "generate",
        "loop",
        ...PROVIDER_ARGS,
        "--max-steps",
        "2",
        "--format",
        "json",
        "--quiet",
      ],
      { env: providerEnv(server, true), timeoutMs: 60_000 },
    );
    assert.ok(
      server.requestCount() >= 1,
      "the model endpoint was never called",
    );
    assert.ok(
      server.requestCount() <= 3,
      `tool loop ran ${server.requestCount()} model requests despite --max-steps 2`,
    );
    assert.equal(result.exitCode, 0, "generate --max-steps exited non-zero");
    const output = parseJsonStdout(result);
    assert.equal(output.stopReason, "step-cap", "stopReason is not step-cap");
  } finally {
    await server.close();
  }
});

await test("--max-steps accepts 1-500 and rejects 0, 501 and non-integers", async () => {
  const accepted = await startScriptedChatServer([
    chatCompletion({ content: "ok" }),
  ]);
  try {
    const result = await runCLI(
      [
        "generate",
        "hello",
        ...PROVIDER_ARGS,
        "--max-steps",
        "3",
        "--format",
        "json",
        "--quiet",
      ],
      { env: providerEnv(accepted, false) },
    );
    assert.equal(result.exitCode, 0, "--max-steps 3 was rejected");
    assert.equal(
      accepted.requestCount(),
      1,
      "--max-steps 3 did not reach the model",
    );
  } finally {
    await accepted.close();
  }

  const server = await startScriptedChatServer([
    chatCompletion({ content: "ok" }),
  ]);
  try {
    for (const value of ["0", "-1", "501", "2.5", "abc"]) {
      const result = await runCLI(
        ["generate", "hello", ...PROVIDER_ARGS, "--max-steps", value],
        { env: providerEnv(server, false) },
      );
      assert.notEqual(result.exitCode, 0, `--max-steps ${value} was accepted`);
      assert.match(
        `${result.stdout}\n${result.stderr}`,
        /max-?steps/i,
        `--max-steps ${value} error does not name the flag`,
      );
    }
    assert.equal(
      server.requestCount(),
      0,
      "a rejected --max-steps still reached the model",
    );
  } finally {
    await server.close();
  }
});

await test("readFile reports a binary document instead of returning its bytes as text", async () => {
  const dir = tempDir("neurolink-agent-mode-");
  writeFileSync(join(dir, "report.docx"), makeDocx(["Quarterly report body"]));
  writeFileSync(join(dir, "notes.txt"), "plain notes\n");
  const server = await startScriptedChatServer([
    callTools([
      toolCall("call_doc", "readFile", { path: "report.docx" }),
      toolCall("call_txt", "readFile", { path: "notes.txt" }),
    ]),
    chatCompletion({ content: "done" }),
  ]);
  try {
    const result = await runCommand(
      "node",
      [
        CLI_ENTRY,
        "generate",
        "read them",
        ...PROVIDER_ARGS,
        "--format",
        "json",
        "--quiet",
      ],
      {
        cwd: dir,
        env: {
          ...process.env,
          ...providerEnv(server, true),
        } as NodeJS.ProcessEnv,
        timeoutMs: 60_000,
      },
    );
    assert.ok(
      server.requestCount() >= 2,
      "the tool results never went back to the model",
    );
    assert.equal(result.exitCode, 0, "generate exited non-zero");
    const toolResults = new Map(
      requestMessages(server.getAllRequestBodies()[1])
        .filter((message) => message.role === "tool")
        .map((message) => {
          const withId = message as ChatMessage & { tool_call_id?: string };
          return [
            withId.tool_call_id,
            JSON.parse(String(message.content)) as Record<string, unknown>,
          ];
        }),
    );
    const docx = toolResults.get("call_doc");
    const text = toolResults.get("call_txt");
    assert.ok(
      docx && text,
      "a readFile result is missing from the follow-up request",
    );
    assert.equal(
      docx.success,
      false,
      "readFile reported success on a binary .docx",
    );
    assert.equal(
      docx.content,
      undefined,
      "readFile returned the .docx bytes as content",
    );
    assert.match(
      String(docx.error),
      /binary/i,
      "readFile's .docx error does not say it is binary",
    );
    assert.equal(
      text.success,
      true,
      "readFile no longer reads plain text files",
    );
    assert.equal(text.content, "plain notes\n", "plain text content changed");
  } finally {
    await server.close();
  }
});

await runSuite();
