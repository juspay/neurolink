/**
 * The built-in file tools and bash's `cwd` argument must stay inside their
 * configured roots, with symlinks resolved on both sides.
 *
 * End-to-end through the public `generate()` and the built CLI against a local,
 * stateless endpoint that replays the tool calls named in the prompt. Every
 * assertion reads the tool result the endpoint received back, so nothing here
 * depends on model behaviour. The endpoint is stateless on purpose: concurrent
 * `generate()` calls with different roots can interleave freely and each still
 * gets exactly the tool calls it asked for.
 *
 * Run: pnpm run test:file-tool-roots
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import { createServer } from "node:http";
import os from "node:os";
import path from "node:path";
import { defineSuite, runCLI } from "./helpers/harness.js";
import { assertDistFresh } from "./helpers/distFreshness.js";

process.env.NEUROLINK_ENABLE_BASH_TOOL = "true";
process.env.NEUROLINK_SKIP_MCP = "true";
process.env.OPENAI_COMPATIBLE_API_KEY = "test-key";

assertDistFresh();
const { NeuroLink } = await import("../dist/index.js");

const { test, runSuite } = defineSuite("File tool roots", { offline: true });

type PlannedCall = { name: string; args: Record<string, unknown> };
type ToolOutcome = { success: boolean; text: string };

const PLAN_OPEN = "PLAN<<";
const PLAN_CLOSE = ">>PLAN";

let nonceCounter = 0;

const planPrompt = (nonce: string, calls: PlannedCall[]) =>
  `Run these tools. ${PLAN_OPEN}${JSON.stringify({ nonce, calls })}${PLAN_CLOSE}`;

const completion = (
  message: Record<string, unknown>,
  finishReason: string,
) => ({
  id: "replay",
  object: "chat.completion",
  created: 1,
  model: "test-model",
  choices: [
    {
      index: 0,
      message: { role: "assistant", ...message },
      finish_reason: finishReason,
    },
  ],
  usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
});

const textOf = (content: unknown): string =>
  typeof content === "string"
    ? content
    : Array.isArray(content)
      ? content.map((part) => (part as { text?: string }).text ?? "").join("")
      : "";

async function startReplayServer() {
  const bodies: Array<Record<string, unknown>> = [];
  const server = createServer((req, res) => {
    let raw = "";
    req.on("data", (chunk) => (raw += chunk));
    req.on("end", () => {
      if (req.method !== "POST" || !raw) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            object: "list",
            data: [{ id: "test-model", object: "model" }],
          }),
        );
        return;
      }
      const body = JSON.parse(raw) as Record<string, unknown>;
      bodies.push(body);
      // stream() asks for server-sent events; everything else gets one JSON body.
      const reply = (
        message: Record<string, unknown>,
        finishReason: string,
      ) => {
        if (body.stream !== true) {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify(completion(message, finishReason)));
          return;
        }
        const chunk = (delta: Record<string, unknown>, finish: string | null) =>
          `data: ${JSON.stringify({
            id: "replay",
            object: "chat.completion.chunk",
            created: 1,
            model: "test-model",
            choices: [{ index: 0, delta, finish_reason: finish }],
          })}\n\n`;
        const toolCalls = (message.tool_calls ?? []) as Array<
          Record<string, unknown>
        >;
        const delta = toolCalls.length
          ? {
              role: "assistant",
              tool_calls: toolCalls.map((call, index) => ({ index, ...call })),
            }
          : { role: "assistant", content: String(message.content ?? "") };
        res.writeHead(200, { "Content-Type": "text/event-stream" });
        res.write(chunk(delta, null));
        res.write(chunk({}, finishReason));
        res.end("data: [DONE]\n\n");
      };
      const messages = (body.messages ?? []) as Array<{
        role: string;
        content: unknown;
      }>;
      if (messages.some((message) => message.role === "tool")) {
        reply({ content: "done" }, "stop");
        return;
      }
      const userText = messages
        .filter((message) => message.role === "user")
        .map((message) => textOf(message.content))
        .join("\n");
      const start = userText.indexOf(PLAN_OPEN);
      const end = userText.indexOf(PLAN_CLOSE);
      if (start === -1 || end === -1) {
        reply({ content: "no plan" }, "stop");
        return;
      }
      const plan = JSON.parse(
        userText.slice(start + PLAN_OPEN.length, end),
      ) as {
        nonce: string;
        calls: PlannedCall[];
      };
      const toolCalls = plan.calls.map((call, index) => ({
        id: `${plan.nonce}_${index}`,
        type: "function",
        function: { name: call.name, arguments: JSON.stringify(call.args) },
      }));
      reply({ content: null, tool_calls: toolCalls }, "tool_calls");
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  return {
    baseURL: `http://127.0.0.1:${port}`,
    requestCount: () => bodies.length,
    outcomes: (nonce: string): ToolOutcome[] => {
      const found: Array<[number, ToolOutcome]> = [];
      for (const body of bodies) {
        for (const message of (body.messages ?? []) as Array<
          Record<string, unknown>
        >) {
          const id = String(message.tool_call_id ?? "");
          if (message.role !== "tool" || !id.startsWith(`${nonce}_`)) {
            continue;
          }
          const index = Number(id.slice(nonce.length + 1));
          if (found.some(([seen]) => seen === index)) {
            continue;
          }
          const text = textOf(message.content);
          found.push([
            index,
            { success: /"success"\s*:\s*true/.test(text), text },
          ]);
        }
      }
      return found.sort(([a], [b]) => a - b).map(([, outcome]) => outcome);
    },
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}

const server = await startReplayServer();
process.env.OPENAI_COMPATIBLE_BASE_URL = server.baseURL;

// Fixture tree, resolved through realpath so macOS /var → /private/var does
// not make a correctly-contained path look like an escape.
const P = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "nl-roots-")));
const A = path.join(P, "A");
const B = path.join(P, "B");
const EVIL = path.join(P, "A-evil");
const ALIAS = path.join(P, "alias");
fs.mkdirSync(A);
fs.mkdirSync(B);
fs.mkdirSync(EVIL);
fs.writeFileSync(path.join(A, "a.txt"), "alpha");
fs.writeFileSync(path.join(B, "b.txt"), "bravo");
fs.writeFileSync(path.join(EVIL, "evil.txt"), "evil");
fs.symlinkSync(B, path.join(A, "escape"));
fs.symlinkSync(B, path.join(A, "linkdir"));
fs.symlinkSync(B, ALIAS);
fs.writeFileSync(path.join(B, "secret.txt"), "TOP-SECRET-OUTSIDE");

type SdkOptions = Record<string, unknown>;
type Sdk = {
  generate: (options: SdkOptions) => Promise<unknown>;
  generateText: (options: SdkOptions) => Promise<unknown>;
  stream: (options: SdkOptions) => Promise<{ stream: AsyncIterable<unknown> }>;
  executeTool: (name: string, params: unknown) => Promise<unknown>;
  getToolRegistry: () => {
    executeTool: (name: string, params: unknown) => Promise<unknown>;
  };
  createWorkerInstance: (options?: Record<string, unknown>) => Sdk;
};

const newSdk = (config?: Record<string, unknown>): Sdk =>
  new NeuroLink(config) as unknown as Sdk;

async function runTools(
  calls: PlannedCall[],
  options: { sdk?: Sdk; toolRoots?: string[] } = {},
): Promise<ToolOutcome[]> {
  const nonce = `n${++nonceCounter}`;
  const sdk = options.sdk ?? newSdk();
  await sdk.generate({
    input: { text: planPrompt(nonce, calls) },
    provider: "openai-compatible",
    model: "test-model",
    maxSteps: 3,
    disableInternalFallback: true,
    ...(options.toolRoots !== undefined
      ? { toolRoots: options.toolRoots }
      : {}),
  });
  const outcomes = server.outcomes(nonce);
  assert.equal(
    outcomes.length,
    calls.length,
    "not every planned tool call reached a result",
  );
  return outcomes;
}

async function inDirectory<T>(dir: string, run: () => Promise<T>): Promise<T> {
  const previous = process.cwd();
  process.chdir(dir);
  try {
    return await run();
  } finally {
    process.chdir(previous);
  }
}

const read = (filePath: string): PlannedCall => ({
  name: "readFile",
  args: { path: filePath },
});
const bash = (command: string, cwd?: string): PlannedCall => ({
  name: "executeBashCommand",
  args: cwd === undefined ? { command } : { command, cwd },
});

await test("default roots: a file inside the working directory is readable", async () => {
  const [outcome] = await inDirectory(A, () => runTools([read("a.txt")]));
  assert.ok(
    outcome.success,
    "reading a file inside the working directory was refused",
  );
  assert.ok(
    outcome.text.includes("alpha"),
    "the file content did not come back",
  );
});

await test("default roots: an absolute path outside the working directory is denied", async () => {
  const [outcome] = await inDirectory(A, () =>
    runTools([read(path.join(B, "b.txt"))]),
  );
  assert.ok(!outcome.success, "an absolute path outside the root was read");
});

await test("a symlink inside the root that points outside it is denied", async () => {
  const [outcome] = await inDirectory(A, () =>
    runTools([read("escape/b.txt")]),
  );
  assert.ok(!outcome.success, "a symlink escape out of the root was followed");
  assert.ok(
    !outcome.text.includes("bravo"),
    "content from outside the root leaked through a symlink",
  );
});

await test("`..` traversal out of the root is denied", async () => {
  const [outcome] = await inDirectory(A, () => runTools([read("../B/b.txt")]));
  assert.ok(!outcome.success, "a `..` traversal out of the root was read");
});

await test("a sibling directory sharing the root's prefix is denied (file tools and bash cwd)", async () => {
  const [file, shell] = await inDirectory(A, () =>
    runTools([read(path.join(EVIL, "evil.txt")), bash("pwd", EVIL)]),
  );
  assert.ok(!file.success, "readFile accepted a sibling-prefix directory");
  assert.ok(!shell.success, "bash accepted a sibling-prefix cwd");
});

await test("writing through a symlinked parent directory is denied", async () => {
  const target = path.join(B, "via-link.txt");
  const [outcome] = await inDirectory(A, () =>
    runTools([
      {
        name: "writeFile",
        args: { path: "linkdir/via-link.txt", content: "x", mode: "create" },
      },
    ]),
  );
  assert.ok(
    !outcome.success,
    "a write through a symlinked parent was accepted",
  );
  assert.ok(!fs.existsSync(target), "a file was created outside the root");
});

await test("instance roots allow a directory outside the working directory", async () => {
  const sdk = newSdk({ tools: { fileRoots: [B] } });
  const [inside, formerCwd] = await inDirectory(A, () =>
    runTools([read(path.join(B, "b.txt")), read(path.join(A, "a.txt"))], {
      sdk,
    }),
  );
  assert.ok(inside.success, "a file inside the configured root was refused");
  assert.ok(
    !formerCwd.success,
    "configured roots did not replace the working-directory default",
  );
});

await test("roots given through a symlink are resolved, so their own files stay usable", async () => {
  const sdk = newSdk({ tools: { fileRoots: [ALIAS] } });
  const [readBack, written] = await inDirectory(A, () =>
    runTools(
      [
        read(path.join(ALIAS, "b.txt")),
        {
          name: "writeFile",
          args: {
            path: path.join(ALIAS, "alias-new.txt"),
            content: "y",
            mode: "create",
          },
        },
      ],
      { sdk },
    ),
  );
  assert.ok(readBack.success, "a read through a symlinked root was refused");
  assert.ok(written.success, "a write through a symlinked root was refused");
  assert.ok(
    fs.existsSync(path.join(B, "alias-new.txt")),
    "the write did not land in the root",
  );
});

await test("per-call roots narrow the instance ceiling", async () => {
  const sdk = newSdk({ tools: { fileRoots: [P] } });
  const [inside, outside] = await runTools(
    [read(path.join(A, "a.txt")), read(path.join(B, "b.txt"))],
    { sdk, toolRoots: [A] },
  );
  assert.ok(inside.success, "a file inside the per-call root was refused");
  assert.ok(
    !outside.success,
    "a per-call root did not narrow the instance ceiling",
  );
});

await test("per-call roots cannot widen the instance ceiling", async () => {
  const sdk = newSdk({ tools: { fileRoots: [A] } });
  const before = server.requestCount();
  await assert.rejects(
    () =>
      sdk.generate({
        input: { text: "unused" },
        provider: "openai-compatible",
        model: "test-model",
        disableInternalFallback: true,
        toolRoots: [B],
      }),
    /outside the permitted roots/,
    "a per-call root outside the instance ceiling was not rejected as widening",
  );
  assert.equal(
    server.requestCount(),
    before,
    "the model was called before the widening root was rejected",
  );
});

await test("concurrent calls with different roots do not leak into each other", async () => {
  const sdk = newSdk({ tools: { fileRoots: [P] } });
  const both = [read(path.join(A, "a.txt")), read(path.join(B, "b.txt"))];
  const [first, second] = await Promise.all([
    runTools(both, { sdk, toolRoots: [A] }),
    runTools(both, { sdk, toolRoots: [B] }),
  ]);
  assert.ok(
    first[0].success && !first[1].success,
    "the [A] call saw the wrong roots",
  );
  assert.ok(
    !second[0].success && second[1].success,
    "the [B] call saw the wrong roots",
  );
});

await test("an empty root list denies every file tool", async () => {
  const [file, listing] = await inDirectory(A, () =>
    runTools([read("a.txt"), { name: "listDirectory", args: { path: "." } }], {
      toolRoots: [],
    }),
  );
  assert.ok(!file.success, "readFile ran with no roots");
  assert.ok(!listing.success, "listDirectory ran with no roots");
});

await test("a missing root rejects before any model call", async () => {
  const before = server.requestCount();
  await assert.rejects(
    () =>
      newSdk({ tools: { fileRoots: [path.join(P, "missing")] } }).generate({
        input: { text: "unused" },
        provider: "openai-compatible",
        model: "test-model",
        disableInternalFallback: true,
      }),
    /does not exist/,
    "a missing root was not rejected as missing",
  );
  assert.equal(
    server.requestCount(),
    before,
    "the model was called before the missing root was rejected",
  );
});

await test("bash: the cwd argument must be inside a root", async () => {
  const sdk = newSdk({ tools: { fileRoots: [A] } });
  const [outcome] = await runTools([bash("pwd", B)], { sdk });
  assert.ok(!outcome.success, "bash ran with a cwd outside the roots");
});

await test("bash: `cd` inside a command still escapes the roots (documented limitation)", async () => {
  const sdk = newSdk({ tools: { fileRoots: [A] } });
  const [outcome] = await runTools(
    [bash(`cd ${JSON.stringify(B)} && cat b.txt`)],
    { sdk },
  );
  assert.ok(
    outcome.success,
    "the pinned limitation changed: bash no longer reaches outside the roots",
  );
  assert.ok(
    outcome.text.includes("bravo"),
    "bash did not read the file outside the roots",
  );
});

await test("CLI: --tool-root passes roots to the file tools", async () => {
  const nonce = `n${++nonceCounter}`;
  const result = await runCLI(
    [
      "generate",
      planPrompt(nonce, [read(path.join(B, "b.txt"))]),
      "--provider",
      "openai-compatible",
      "--model",
      "test-model",
      "--tool-root",
      B,
      "--format",
      "json",
    ],
    { env: { OPENAI_COMPATIBLE_BASE_URL: server.baseURL }, timeoutMs: 60_000 },
  );
  assert.equal(result.exitCode, 0, "the CLI run failed");
  const [outcome] = server.outcomes(nonce);
  assert.ok(outcome?.success, "--tool-root did not admit a file inside it");
});

await test("CLI: --tool-root with a missing directory exits non-zero", async () => {
  const result = await runCLI(
    [
      "generate",
      "unused",
      "--provider",
      "openai-compatible",
      "--model",
      "test-model",
      "--tool-root",
      path.join(P, "missing"),
    ],
    { env: { OPENAI_COMPATIBLE_BASE_URL: server.baseURL }, timeoutMs: 60_000 },
  );
  assert.notEqual(result.exitCode, 0, "a missing --tool-root was accepted");
  assert.ok(
    /does not exist/.test(result.stderr + result.stdout),
    "the CLI failed for a reason other than the missing root",
  );
});

const SECRET = path.join(B, "secret.txt");
const leaked = (text: string) => text.includes("TOP-SECRET-OUTSIDE");

async function planned(
  api: "generate" | "generateText" | "stream",
  sdk: Sdk,
  calls: PlannedCall[],
  extra: Record<string, unknown> = {},
): Promise<ToolOutcome[]> {
  const nonce = `n${++nonceCounter}`;
  const common = {
    provider: "openai-compatible",
    model: "test-model",
    maxSteps: 3,
    disableInternalFallback: true,
    ...extra,
  };
  const prompt = planPrompt(nonce, calls);
  if (api === "generateText") {
    await sdk.generateText({ prompt, ...common });
  } else if (api === "stream") {
    const result = await sdk.stream({ input: { text: prompt }, ...common });
    for await (const _event of result.stream) {
      // Drain so the tool loop runs to completion.
    }
  } else {
    await sdk.generate({ input: { text: prompt }, ...common });
  }
  const outcomes = server.outcomes(nonce);
  assert.equal(
    outcomes.length,
    calls.length,
    "not every planned tool call reached a result",
  );
  return outcomes;
}

const toText = (value: unknown): string => {
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
};

async function directCall(run: () => Promise<unknown>): Promise<string> {
  try {
    return toText(await run());
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

await test("a dangling symlink inside the root cannot be written through to a file outside it", async () => {
  const planted = path.join(B, "planted.txt");
  fs.symlinkSync(planted, path.join(A, "dangling"));
  try {
    const sdk = newSdk({ tools: { fileRoots: [A] } });
    const [created, overwritten] = await runTools(
      [
        {
          name: "writeFile",
          args: {
            path: path.join(A, "dangling"),
            content: "PWNED",
            mode: "create",
          },
        },
        {
          name: "writeFile",
          args: {
            path: path.join(A, "dangling"),
            content: "PWNED",
            mode: "overwrite",
          },
        },
      ],
      { sdk },
    );
    assert.ok(
      !created.success,
      "a create through a dangling symlink was accepted",
    );
    assert.ok(
      !overwritten.success,
      "an overwrite through a dangling symlink was accepted",
    );
    assert.ok(
      !fs.existsSync(planted),
      "a file was created outside the root through a dangling symlink",
    );
  } finally {
    fs.rmSync(path.join(A, "dangling"), { force: true });
    fs.rmSync(planted, { force: true });
  }
});

await test("a dangling symlink inside the root is refused for reads", async () => {
  fs.symlinkSync(path.join(B, "later.txt"), path.join(A, "dangling-read"));
  try {
    const sdk = newSdk({ tools: { fileRoots: [A] } });
    const [outcome] = await runTools([read(path.join(A, "dangling-read"))], {
      sdk,
    });
    assert.ok(
      !outcome.success,
      "a read through a dangling symlink was accepted",
    );
    assert.ok(
      /Access denied/.test(outcome.text),
      "the dangling symlink was not refused by the root check",
    );
  } finally {
    fs.rmSync(path.join(A, "dangling-read"), { force: true });
  }
});

await test("generateText(): a caller-supplied fileToolRoots cannot widen the instance roots", async () => {
  const sdk = newSdk({ tools: { fileRoots: [A] } });
  const [outcome] = await planned("generateText", sdk, [read(SECRET)], {
    fileToolRoots: { roots: [B] },
  });
  assert.ok(
    !outcome.success && !leaked(outcome.text),
    "generateText trusted a caller-supplied resolved policy",
  );
});

await test("generate(): a caller-supplied fileToolRoots cannot widen the instance roots", async () => {
  const sdk = newSdk({ tools: { fileRoots: [A] } });
  const [outcome] = await planned("generate", sdk, [read(SECRET)], {
    fileToolRoots: { roots: [B] },
  });
  assert.ok(
    !outcome.success && !leaked(outcome.text),
    "generate trusted a caller-supplied resolved policy",
  );
});

await test("generateText(): instance roots apply", async () => {
  const sdk = newSdk({ tools: { fileRoots: [A] } });
  const [outside, inside] = await inDirectory(P, () =>
    planned("generateText", sdk, [read(SECRET), read(path.join(A, "a.txt"))]),
  );
  assert.ok(
    !outside.success && !leaked(outside.text),
    "generateText ignored the instance roots",
  );
  assert.ok(
    inside.success,
    "generateText refused a file inside the instance roots",
  );
});

await test("generateText(): per-call toolRoots outside the instance roots reject before any model call", async () => {
  const sdk = newSdk({ tools: { fileRoots: [A] } });
  const before = server.requestCount();
  await assert.rejects(
    () =>
      sdk.generateText({
        prompt: "unused",
        provider: "openai-compatible",
        model: "test-model",
        toolRoots: [B],
      }),
    /outside the permitted roots/,
    "generateText accepted a widening per-call root",
  );
  assert.equal(
    server.requestCount(),
    before,
    "generateText called the model before rejecting a widening root",
  );
});

await test("generateText(): a missing instance root rejects before any model call", async () => {
  const sdk = newSdk({ tools: { fileRoots: [path.join(P, "missing")] } });
  const before = server.requestCount();
  await assert.rejects(
    () =>
      sdk.generateText({
        prompt: "unused",
        provider: "openai-compatible",
        model: "test-model",
      }),
    /does not exist/,
    "generateText accepted a missing root",
  );
  assert.equal(
    server.requestCount(),
    before,
    "generateText called the model before rejecting a missing root",
  );
});

await test("stream(): instance roots apply and a caller-supplied fileToolRoots is ignored", async () => {
  const sdk = newSdk({ tools: { fileRoots: [A] } });
  const [outside, inside] = await inDirectory(P, () =>
    planned("stream", sdk, [read(SECRET), read(path.join(A, "a.txt"))], {
      fileToolRoots: { roots: [B] },
    }),
  );
  assert.ok(
    !outside.success && !leaked(outside.text),
    "stream escaped the instance roots",
  );
  assert.ok(inside.success, "stream refused a file inside the instance roots");
});

await test("executeTool(): instance roots apply to built-in file tools", async () => {
  const sdk = newSdk({ tools: { fileRoots: [A] } });
  const text = await inDirectory(P, () =>
    directCall(() => sdk.executeTool("readFile", { path: SECRET })),
  );
  assert.ok(
    !leaked(text),
    "executeTool read a file outside the instance roots",
  );
});

await test("the instance tool registry (HTTP tool routes) applies instance roots", async () => {
  const sdk = newSdk({ tools: { fileRoots: [A] } });
  const text = await inDirectory(P, () =>
    directCall(() =>
      sdk.getToolRegistry().executeTool("readFile", { path: SECRET }),
    ),
  );
  assert.ok(
    !leaked(text),
    "the instance registry read a file outside the instance roots",
  );
});

await test("worker instances inherit the host's roots", async () => {
  const worker = newSdk({ tools: { fileRoots: [A] } }).createWorkerInstance();
  const [outcome] = await inDirectory(P, () =>
    planned("generate", worker, [read(SECRET)]),
  );
  assert.ok(
    !outcome.success && !leaked(outcome.text),
    "a worker instance escaped the host's roots",
  );
});

await test("worker config cannot widen the host's roots", async () => {
  const host = newSdk({ tools: { fileRoots: [A] } });
  assert.throws(
    () => host.createWorkerInstance({ config: { tools: { fileRoots: [B] } } }),
    /outside the permitted roots/,
    "a worker was created with roots wider than the host's",
  );
});

await test("a root of `/` contains every absolute path", async () => {
  const sdk = newSdk({ tools: { fileRoots: ["/"] } });
  const [outcome] = await planned("generate", sdk, [read(SECRET)]);
  assert.ok(
    outcome.success && leaked(outcome.text),
    "a root of / denied a file under it",
  );
});

await test("per-call roots can narrow a root of `/`", async () => {
  const sdk = newSdk({ tools: { fileRoots: ["/"] } });
  const [inside, outside] = await planned(
    "generate",
    sdk,
    [read(path.join(A, "a.txt")), read(SECRET)],
    { toolRoots: [A] },
  );
  assert.ok(inside.success, "a per-call root under / was refused");
  assert.ok(
    !outside.success && !leaked(outside.text),
    "a per-call root under / did not narrow",
  );
});

await server.close();
fs.rmSync(P, { recursive: true, force: true });
await runSuite();
