#!/usr/bin/env tsx
/**
 * Dedicated agent session identity and stream completion through the shipped
 * SDK, in-memory conversation storage and a real loopback vendor API. The
 * fixture captures model messages, executes an actual registered tool and
 * supplies deterministic failures; no provider or shared Redis is contacted.
 */
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { NeuroLink, Agent } from "../dist/index.js";
import type {
  AgentExecutionOptions,
  AgentStreamChunk,
  HippocampusLike,
  ToolExecutionRecord,
} from "../src/lib/types/index.js";
import { assert, defineSuite } from "./helpers/harness.js";
import { assertDistFresh } from "./helpers/distFreshness.js";

assertDistFresh();
const { test, runSuite } = defineSuite("Agent session and stream", {
  offline: true,
  perTestTimeoutMs: 30_000,
});

const createFixture = async (
  settings: {
    toolOutput?: unknown;
    fail?: boolean;
    hostEvent?: Record<string, unknown>;
    concurrentEvents?: boolean;
    approvalEvents?: boolean;
    memoryClient?: HippocampusLike;
  } = {},
) => {
  const modelMessages: unknown[] = [];
  const forwardedFlags: Array<boolean | undefined> = [];
  const forwardedOptions: Array<{
    disableTools?: unknown;
    region?: unknown;
    maxTokens?: unknown;
  }> = [];
  let executions = 0;
  let arrivals = 0;
  let signalAllWaiting: () => void = () => {};
  let releaseTurns: () => void = () => {};
  const allTurnsWaiting = new Promise<void>((resolve) => {
    signalAllWaiting = resolve;
  });
  const releasedTurns = new Promise<void>((resolve) => {
    releaseTurns = resolve;
  });
  const server = createServer((request, response) => {
    const chunks: Buffer[] = [];
    request.on("data", (chunk: Buffer) => chunks.push(chunk));
    request.on("end", () => {
      const body: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      if (!body || typeof body !== "object") {
        response.writeHead(422).end();
        return;
      }
      const messages =
        "messages" in body && Array.isArray(body.messages) ? body.messages : [];
      modelMessages.push(messages);
      if (settings.fail) {
        response.writeHead(400, { "Content-Type": "application/json" });
        response.end(
          JSON.stringify({
            error: {
              message: "The requested model was not found",
              type: "invalid_request_error",
              code: "model_not_found",
            },
          }),
        );
        return;
      }
      const model =
        "model" in body && typeof body.model === "string"
          ? body.model
          : "gpt-4o-mini";
      const common = { id: "session-fixture", created: 1, model };
      const marker = JSON.stringify(messages).includes("concurrent-A")
        ? "A"
        : "B";
      const hasToolReply = messages.some(
        (message) =>
          message &&
          typeof message === "object" &&
          "role" in message &&
          message.role === "tool",
      );
      const needsTool =
        settings.toolOutput !== undefined &&
        (settings.concurrentEvents ? !hasToolReply : executions === 0);
      const toolCall = {
        id: settings.concurrentEvents
          ? `fixture-${marker}`
          : "fixture-tool-call",
        type: "function",
        function: {
          name: "fixture_read",
          arguments: settings.concurrentEvents
            ? JSON.stringify({ marker })
            : '{"marker":"fixture"}',
        },
      };
      const usage = { prompt_tokens: 4, completion_tokens: 4, total_tokens: 8 };
      if ("stream" in body && body.stream === true) {
        response.writeHead(200, {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
        });
        const delta = needsTool
          ? { role: "assistant", tool_calls: [{ ...toolCall, index: 0 }] }
          : { role: "assistant", content: "fixture answer" };
        const frames = [
          {
            ...common,
            object: "chat.completion.chunk",
            choices: [{ index: 0, delta, finish_reason: null }],
          },
          {
            ...common,
            object: "chat.completion.chunk",
            choices: [
              {
                index: 0,
                delta: {},
                finish_reason: needsTool ? "tool_calls" : "stop",
              },
            ],
          },
          { ...common, object: "chat.completion.chunk", choices: [], usage },
        ];
        frames.forEach((frame) =>
          response.write(`data: ${JSON.stringify(frame)}\n\n`),
        );
        response.end("data: [DONE]\n\n");
      } else {
        response.writeHead(200, { "Content-Type": "application/json" });
        response.end(
          JSON.stringify({
            ...common,
            object: "chat.completion",
            choices: [
              {
                index: 0,
                message: needsTool
                  ? { role: "assistant", content: null, tool_calls: [toolCall] }
                  : { role: "assistant", content: "fixture answer" },
                finish_reason: needsTool ? "tool_calls" : "stop",
              },
            ],
            usage,
          }),
        );
      }
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Session fixture did not bind a private port");
  }
  const credentials = {
    openai: {
      apiKey: "non-secret-session-fixture",
      baseURL: `http://127.0.0.1:${address.port}/v1`,
    },
  };
  const withTools = settings.toolOutput !== undefined;
  const sdk = new NeuroLink({
    credentials,
    enableOrchestration: false,
    conversationMemory: {
      enabled: true,
      enableSummarization: false,
      ...(settings.memoryClient && {
        memory: { enabled: true, client: settings.memoryClient },
      }),
    },
    hitl: {
      enabled: settings.approvalEvents ?? false,
      dangerousActions: settings.approvalEvents ? ["fixture_read"] : [],
      timeout: 2_000,
    },
    tools: {
      disableBuiltinTools: true,
      include: withTools ? ["fixture_read"] : [],
      discovery: false,
    },
  });
  let notifyConfirmation: (id: string) => void = () => {};
  const confirmationRequested = new Promise<string>((resolve) => {
    notifyConfirmation = resolve;
  });
  sdk.getEventEmitter().on("hitl:confirmation-request", (event) => {
    if (
      event &&
      typeof event === "object" &&
      "payload" in event &&
      event.payload &&
      typeof event.payload === "object" &&
      "confirmationId" in event.payload &&
      typeof event.payload.confirmationId === "string"
    ) {
      notifyConfirmation(event.payload.confirmationId);
    }
  });
  const generate = sdk.generate.bind(sdk);
  sdk.generate = (options) => {
    const normalized =
      typeof options === "string" ? { input: { text: options } } : options;
    const noFallback =
      "disableInternalFallback" in normalized &&
      typeof normalized.disableInternalFallback === "boolean"
        ? normalized.disableInternalFallback
        : undefined;
    forwardedFlags.push(noFallback);
    forwardedOptions.push({
      disableTools:
        "disableTools" in normalized ? normalized.disableTools : undefined,
      region: "region" in normalized ? normalized.region : undefined,
      maxTokens: "maxTokens" in normalized ? normalized.maxTokens : undefined,
    });
    if (settings.fail && noFallback !== true) {
      throw new Error("Fixture refuses a fallback-enabled invocation");
    }
    return generate({ ...normalized, credentials, disableTools: !withTools });
  };
  const stream = sdk.stream.bind(sdk);
  sdk.stream = (options) => {
    const noFallback =
      "disableInternalFallback" in options &&
      typeof options.disableInternalFallback === "boolean"
        ? options.disableInternalFallback
        : undefined;
    forwardedFlags.push(noFallback);
    if (settings.fail && noFallback !== true) {
      throw new Error("Fixture refuses a fallback-enabled invocation");
    }
    return stream({ ...options, credentials, disableTools: !withTools });
  };
  if (withTools) {
    sdk.registerTool(
      "fixture_read",
      {
        name: "fixture_read",
        description: "Read a fixed fixture",
        inputSchema: z.object({ marker: z.string() }),
        execute: async (params) => {
          executions++;
          if (settings.concurrentEvents) {
            arrivals++;
            if (arrivals === 2) {
              signalAllWaiting();
            }
            await releasedTurns;
            const marker =
              params &&
              typeof params === "object" &&
              "marker" in params &&
              typeof params.marker === "string"
                ? params.marker
                : "invalid";
            sdk.getEventEmitter().emit("host:conversation-event", {
              type: "turn-marker",
              data: { marker },
            });
          }
          if (settings.hostEvent) {
            sdk.getEventEmitter().emit("host:conversation-event", {
              type: "agent-ui-blocks",
              data: settings.hostEvent,
            });
          }
          return settings.toolOutput;
        },
      },
      { cacheable: false },
    );
  }
  const agent = new Agent(
    {
      id: "session-fixture-agent",
      name: "Session fixture",
      description: "Checks SDK conversation identity",
      instructions: "Use the fixture response.",
      provider: "openai",
      model: "gpt-4o-mini",
      ...(withTools ? { tools: ["fixture_read"] } : {}),
    },
    sdk,
  );
  const close = async () => {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  };
  return {
    sdk,
    agent,
    forwardedOptions,
    allTurnsWaiting,
    releaseTurns,
    confirmationRequested,
    modelMessages,
    forwardedFlags,
    executions: () => executions,
    close,
  };
};

await test("execute reuses only the dedicated session and never prompts its identity", async () => {
  const fixture = await createFixture();
  const sessionId = `fixture-${randomUUID()}`;
  try {
    const first = await fixture.agent.execute("remember execute marker", {
      sessionId,
      context: {
        sessionId: "legacy-private-marker",
        note: "public-context-marker",
      },
      disableInternalFallback: true,
    });
    assert(first.status === "success", "First execute did not complete");
    await fixture.agent.execute("continue execute", {
      sessionId,
      disableInternalFallback: true,
    });
    await fixture.agent.execute("fresh execute", {
      sessionId: `fixture-${randomUUID()}`,
      disableInternalFallback: true,
    });
    assert(
      fixture.modelMessages.length === 3,
      "Execute fixture did not measure three turns",
    );
    assert(
      JSON.stringify(fixture.modelMessages[1]).includes(
        "remember execute marker",
      ),
      "Execute lost prior-turn memory",
    );
    assert(
      !JSON.stringify(fixture.modelMessages[2]).includes(
        "remember execute marker",
      ),
      "A new session inherited another session's memory",
    );
    assert(
      fixture.modelMessages.every(
        (messages) =>
          !JSON.stringify(messages).includes(sessionId) &&
          !JSON.stringify(messages).includes("legacy-private-marker"),
      ),
      "Session identity reached a model prompt",
    );
    assert(
      JSON.stringify(fixture.modelMessages[0]).includes(
        "public-context-marker",
      ),
      "Business context was accidentally discarded",
    );
  } finally {
    await fixture.close();
  }
});

await test("stream reuses session memory before any staff caller switches paths", async () => {
  const fixture = await createFixture();
  const sessionId = `fixture-${randomUUID()}`;
  try {
    for await (const _chunk of fixture.agent.stream("remember stream marker", {
      sessionId,
      disableInternalFallback: true,
    })) {
      /* drain */
    }
    for await (const _chunk of fixture.agent.stream("continue stream", {
      sessionId,
      disableInternalFallback: true,
    })) {
      /* drain */
    }
    for await (const _chunk of fixture.agent.stream("fresh stream", {
      sessionId: `fixture-${randomUUID()}`,
      disableInternalFallback: true,
    })) {
      /* drain */
    }
    assert(
      fixture.modelMessages.length === 3,
      "Stream fixture did not measure three turns",
    );
    assert(
      JSON.stringify(fixture.modelMessages[1]).includes(
        "remember stream marker",
      ),
      "Stream lost prior-turn memory",
    );
    assert(
      !JSON.stringify(fixture.modelMessages[2]).includes(
        "remember stream marker",
      ),
      "New stream session inherited prior memory",
    );
    assert(
      fixture.modelMessages.every(
        (messages) => !JSON.stringify(messages).includes(sessionId),
      ),
      "Stream session identity reached a model prompt",
    );
  } finally {
    await fixture.close();
  }
});

for (const failedTool of [false, true]) {
  await test(`stream terminal records preserve ${failedTool ? "refusals" : "capture bounds"}`, async () => {
    const output = failedTool
      ? { isError: true, message: "fixture refused" }
      : "fixture-result ".repeat(2_000);
    const fixture = await createFixture({ toolOutput: output });
    const captured: ToolExecutionRecord[] = [];
    let terminal: AgentStreamChunk | undefined;
    try {
      for await (const chunk of fixture.agent.stream("read the fixture tool", {
        sessionId: `fixture-${randomUUID()}`,
        disableInternalFallback: true,
        toolExecutionCapture: {
          maxResultChars: 50_000,
          onRecord: (record) => {
            captured.push(record);
          },
        },
      })) {
        if (chunk.type === "agent-complete") {
          terminal = chunk;
        }
      }
      assert(
        fixture.executions() === 1,
        "Registered fixture tool did not execute once",
      );
      assert(
        terminal?.status === "success",
        "Successful model turn lost terminal status",
      );
      assert(
        terminal?.toolExecutions?.length === 1,
        "Terminal stream dropped its tool record",
      );
      const record = terminal?.toolExecutions?.[0];
      assert(
        record?.toolName === "fixture_read",
        "Terminal tool identity changed",
      );
      assert(
        record?.isError === failedTool,
        "Terminal tool refusal flag changed",
      );
      assert(captured.length === 1, "Agent dropped the SDK capture callback");
      if (!failedTool) {
        assert(
          (record?.resultText.length ?? 0) > 8_192,
          "Agent silently re-capped an explicitly larger capture",
        );
      }
    } finally {
      await fixture.close();
    }
  });
}

await test("execute and stream forward the no-internal-fallback switch on failures", async () => {
  for (const mode of ["execute", "stream"] as const) {
    const fixture = await createFixture({ fail: true });
    try {
      let failed = false;
      if (mode === "execute") {
        failed =
          (
            await fixture.agent.execute("fail the fixture", {
              disableInternalFallback: true,
            })
          ).status === "error";
      } else {
        for await (const chunk of fixture.agent.stream("fail the fixture", {
          disableInternalFallback: true,
        })) {
          if (chunk.status === "error") {
            failed = true;
          }
        }
      }
      assert(failed, "Vendor failure was reported as a successful agent turn");
      assert(
        fixture.forwardedFlags.length === 1 &&
          fixture.forwardedFlags[0] === true,
        "Agent dropped the no-fallback switch",
      );
      assert(
        fixture.modelMessages.length === 1,
        "Failure tried a different model after the switch",
      );
    } finally {
      await fixture.close();
    }
  }
});

await test("per-turn memory opt-out preserves the other turns and version options", async () => {
  const fixture = await createFixture();
  const sessionId = `fixture-${randomUUID()}`;
  try {
    await fixture.agent.execute("remember preserved marker", {
      sessionId,
      disableInternalFallback: true,
    });
    await fixture.agent.execute("private one-turn marker", {
      sessionId,
      useMemory: false,
      disableTools: true,
      region: "us-east-1",
      maxTokens: 42,
      disableInternalFallback: true,
    });
    await fixture.agent.execute("resume preserved memory", {
      sessionId,
      disableInternalFallback: true,
    });
    assert(
      !JSON.stringify(fixture.modelMessages[1]).includes(
        "remember preserved marker",
      ),
      "Memory opt-out still loaded old turns",
    );
    assert(
      JSON.stringify(fixture.modelMessages[2]).includes(
        "remember preserved marker",
      ),
      "Memory opt-out erased the session",
    );
    assert(
      !JSON.stringify(fixture.modelMessages[2]).includes(
        "private one-turn marker",
      ),
      "Memory-disabled turn polluted the retained history",
    );
    assert(
      fixture.forwardedOptions[1].disableTools === true &&
        fixture.forwardedOptions[1].region === "us-east-1" &&
        fixture.forwardedOptions[1].maxTokens === 42,
      "Agent dropped version/per-turn options before the real provider call",
    );
  } finally {
    await fixture.close();
  }
});

const ownedUserMemory = (userId: string) => {
  const reads: string[] = [];
  const writes: Array<{ ownerId: string; content: string }> = [];
  const stored = new Map([[userId, "retained user memory marker"]]);
  const client: HippocampusLike = {
    get: async (ownerId) => {
      reads.push(ownerId);
      return stored.get(ownerId) ?? null;
    },
    add: async (ownerId, content) => {
      writes.push({ ownerId, content });
      stored.set(ownerId, `${stored.get(ownerId) ?? ""}\n${content}`);
      return stored.get(ownerId) ?? "";
    },
    delete: async (ownerId) => {
      stored.delete(ownerId);
    },
    close: async () => {},
  };
  return { client, reads, writes };
};

const runOwnedMemoryTurn = async (
  fixture: Awaited<ReturnType<typeof createFixture>>,
  mode: "execute" | "stream",
  prompt: string,
  options: AgentExecutionOptions,
): Promise<void> => {
  if (mode === "execute") {
    const result = await fixture.agent.execute(prompt, options);
    assert(result.status === "success", "Owned memory execution failed");
    return;
  }
  let completed = false;
  for await (const chunk of fixture.agent.stream(prompt, options)) {
    if (chunk.type === "agent-complete") {
      completed = chunk.status === "success";
    }
  }
  assert(completed, "Owned memory stream did not complete successfully");
};

for (const mode of ["execute", "stream"] as const) {
  await test(`${mode} default and explicit memory enablement read and write user memory`, async () => {
    const userId = `owned-user-${randomUUID()}`;
    const memory = ownedUserMemory(userId);
    const fixture = await createFixture({ memoryClient: memory.client });
    let drained = false;
    try {
      for (const useMemory of [undefined, true]) {
        await runOwnedMemoryTurn(fixture, mode, "enabled user memory turn", {
          sessionId: `fixture-${randomUUID()}`,
          ...(useMemory !== undefined && { useMemory }),
          context: { userId },
          disableInternalFallback: true,
        });
      }
      await fixture.sdk.shutdown();
      drained = true;
      assert(
        memory.reads.length === 2 && memory.writes.length === 2,
        "Default or explicit enablement suppressed user-memory reads/writes",
      );
      assert(
        memory.reads.every((ownerId) => ownerId === userId) &&
          memory.writes.every((write) => write.ownerId === userId),
        "User memory reached an owner other than context.userId",
      );
      assert(
        fixture.modelMessages.every((messages) =>
          JSON.stringify(messages).includes("retained user memory marker"),
        ),
        "Enabled user memory was not supplied to the model",
      );
    } finally {
      if (!drained) {
        await fixture.sdk.shutdown();
      }
      await fixture.close();
    }
  });

  await test(`${mode} memory opt-out skips user-memory reads/writes and resumes retained state`, async () => {
    const userId = `owned-user-${randomUUID()}`;
    const sessionId = `fixture-${randomUUID()}`;
    const memory = ownedUserMemory(userId);
    const fixture = await createFixture({ memoryClient: memory.client });
    let drained = false;
    try {
      await fixture.sdk.setSessionMessages(
        sessionId,
        [
          {
            id: "retained-session-message",
            role: "user",
            content: "retained session memory marker",
            timestamp: "2026-06-01T00:00:00Z",
          },
        ],
        userId,
      );
      const before = await fixture.sdk.getSessionMessages(sessionId, userId);
      const context = { userId, note: "retained business context marker" };
      await runOwnedMemoryTurn(fixture, mode, "private user memory turn", {
        sessionId,
        useMemory: false,
        context,
        disableInternalFallback: true,
      });
      const afterPrivate = await fixture.sdk.getSessionMessages(
        sessionId,
        userId,
      );
      await runOwnedMemoryTurn(fixture, mode, "resumed user memory turn", {
        sessionId,
        useMemory: true,
        context,
        disableInternalFallback: true,
      });
      await fixture.sdk.shutdown();
      drained = true;
      const privateMessages = JSON.stringify(fixture.modelMessages[0]);
      const resumedMessages = JSON.stringify(fixture.modelMessages[1]);
      const privateRead = privateMessages.includes(
        "retained user memory marker",
      );
      const privateWritten = memory.writes.some((write) =>
        write.content.includes("private user memory turn"),
      );
      console.log(
        JSON.stringify({
          mode,
          userReads: memory.reads.length,
          userWrites: memory.writes.length,
          privateRead,
          privateWritten,
        }),
      );
      assert(
        JSON.stringify(before) === JSON.stringify(afterPrivate),
        "Memory opt-out changed the stored session",
      );
      assert(
        !privateMessages.includes("retained session memory marker") &&
          privateMessages.includes("retained business context marker"),
        "Memory opt-out read session history or discarded business context",
      );
      assert(
        resumedMessages.includes("retained session memory marker") &&
          resumedMessages.includes("retained user memory marker"),
        "Explicit memory enablement did not resume retained session/user memory",
      );
      assert(
        !privateRead &&
          !privateWritten &&
          memory.reads.length === 1 &&
          memory.writes.length === 1,
        `Memory opt-out accessed the user store: ${JSON.stringify({
          privateRead,
          privateWritten,
          reads: memory.reads.length,
          writes: memory.writes.length,
        })}`,
      );
    } finally {
      if (!drained) {
        await fixture.sdk.shutdown();
      }
      await fixture.close();
    }
  });
}
for (const mode of ["execute", "stream"]) {
  await test(`${mode} persists actual host blocks in native conversation history`, async () => {
    const payload = {
      eventId: `owned-${mode}`,
      blocks: [
        {
          type: "products",
          text: "Verified store products",
          products: [
            {
              id: "owned-product",
              title: "Owned product",
              price: "USD 10.99",
              url: "https://fixture.myshopify.com/products/owned",
            },
          ],
        },
      ],
    };
    const fixture = await createFixture({
      toolOutput: { products: [{ id: "owned-product" }] },
      hostEvent: payload,
    });
    const sessionId = `fixture-${randomUUID()}`;
    try {
      if (mode === "execute") {
        const completed = await fixture.agent.execute("read fixture", {
          sessionId,
          disableInternalFallback: true,
        });
        assert(
          completed.status === "success",
          "Host history fixture did not complete",
        );
      } else {
        for await (const _chunk of fixture.agent.stream("read fixture", {
          sessionId,
          disableInternalFallback: true,
        })) {
          if (_chunk.type === "agent-error") {
            throw new Error(
              _chunk.error ?? "Host history stream fixture failed",
            );
          }
        }
      }
      const messages = await fixture.sdk.getSessionMessages(sessionId);
      const events = messages
        .flatMap((message) => message.events ?? [])
        .filter((event) => event.type === "agent-ui-blocks");
      assert(
        events.length === 1,
        `${mode} native history lost or duplicated host blocks`,
      );
      assert(
        JSON.stringify(events[0].data) === JSON.stringify(payload),
        `${mode} native history altered host payload`,
      );
      assert(
        fixture.sdk
          .getEventEmitter()
          .listenerCount("host:conversation-event") === 0,
        `${mode} leaked its native history capture listener`,
      );
    } finally {
      await fixture.close();
    }
  });
}

for (const modes of [
  ["execute", "execute"],
  ["stream", "stream"],
  ["execute", "stream"],
] as const) {
  await test(`concurrent ${modes.join("/")} turns keep host events in their own sessions`, async () => {
    const fixture = await createFixture({
      toolOutput: { ok: true },
      concurrentEvents: true,
    });
    const sessions = [`owned-A-${randomUUID()}`, `owned-B-${randomUUID()}`];
    const run = async (
      mode: "execute" | "stream",
      marker: string,
      sessionId: string,
    ) => {
      if (mode === "execute") {
        const result = await fixture.agent.execute(`concurrent-${marker}`, {
          sessionId,
          disableInternalFallback: true,
        });
        assert(
          result.status === "success",
          "Concurrent generate did not complete",
        );
      } else {
        let completed = false;
        for await (const chunk of fixture.agent.stream(`concurrent-${marker}`, {
          sessionId,
          disableInternalFallback: true,
        })) {
          if (chunk.type === "agent-error") {
            throw new Error(chunk.error ?? "Concurrent stream failed");
          }
          if (chunk.type === "agent-complete") {
            completed = chunk.status === "success";
          }
        }
        assert(completed, "Concurrent stream did not complete successfully");
      }
    };
    try {
      const first = run(modes[0], "A", sessions[0]);
      const second = run(modes[1], "B", sessions[1]);
      await fixture.allTurnsWaiting;
      fixture.sdk.getEventEmitter().emit("host:conversation-event", {
        type: "turn-marker",
        data: { marker: "OUTSIDE" },
      });
      fixture.releaseTurns();
      await Promise.all([first, second]);
      for (const [index, marker] of ["A", "B"].entries()) {
        const messages = await fixture.sdk.getSessionMessages(sessions[index]);
        const events = messages
          .flatMap((message) => message.events ?? [])
          .filter((event) => event.type === "turn-marker");
        assert(
          events.length === 1,
          "Concurrent history captured another turn or an unattributed emitter event",
        );
        assert(
          !!events[0].data &&
            typeof events[0].data === "object" &&
            "marker" in events[0].data &&
            events[0].data.marker === marker,
          "Concurrent history stored another session's host event",
        );
      }
      assert(
        fixture.sdk
          .getEventEmitter()
          .listenerCount("host:conversation-event") === 0,
        "Concurrent capture leaked listeners",
      );
    } finally {
      fixture.releaseTurns();
      await fixture.close();
    }
  });
}

await test("a matched approval response from the host is retained without ambient turn context", async () => {
  const fixture = await createFixture({
    toolOutput: { ok: true },
    approvalEvents: true,
  });
  const sessionId = `owned-approval-${randomUUID()}`;
  try {
    const running = fixture.agent.execute("read fixture", {
      sessionId,
      disableInternalFallback: true,
    });
    const confirmationId = await fixture.confirmationRequested;
    assert(
      fixture.sdk.hasPendingHITLConfirmation(confirmationId),
      "Approval did not suspend the actual SDK turn",
    );
    fixture.sdk.getEventEmitter().emit("hitl:confirmation-response", {
      type: "hitl:confirmation-response",
      payload: { confirmationId: "not-owned-by-this-turn", approved: true },
    });
    fixture.sdk.getEventEmitter().emit("hitl:confirmation-response", {
      type: "hitl:confirmation-response",
      payload: { confirmationId, approved: true },
    });
    assert(
      (await running).status === "success",
      "Approved SDK turn did not complete",
    );
    const messages = await fixture.sdk.getSessionMessages(sessionId);
    const responses = messages
      .flatMap((message) => message.events ?? [])
      .filter((event) => event.type === "hitl:confirmation-response");
    assert(
      responses.length === 1,
      "Owned out-of-context approval response disappeared from history",
    );
  } finally {
    await fixture.close();
  }
});

await runSuite();
