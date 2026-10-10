/** Real demo HTTP routes, started as a child process with owned fixtures.
 *
 * Covers the file-operations route (directory confinement, per-client rate
 * limit) and the summarize route (body shape). Nothing here imports a handler:
 * every claim is made over HTTP against `server.ts` as it ships. The demo runs
 * with an owned directory as its working directory, which is the confinement
 * root, and the only upstream is a local stand-in inference server.
 *
 * Canaries are finite and owned: one file inside the root, a sibling directory
 * whose name starts with the root's name, and symlinks inside the root that
 * point outside it. No path outside the temp directory created below is read
 * or written.
 */
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const demo = path.dirname(fileURLToPath(import.meta.url));
const repo = path.dirname(demo);
for (const dir of [demo, repo]) {
  if (fs.existsSync(path.join(dir, ".env"))) {
    throw new Error("Refuse a demo proof that can reload an environment file");
  }
}
await import(
  pathToFileURL(path.join(repo, "test/helpers/credentialFreeEnv.ts"))
);

const attempt = fs.realpathSync(
  fs.mkdtempSync(path.join(os.tmpdir(), "neurolink-server-boundaries-")),
);
const rootDir = path.join(attempt, "root");
const siblingDir = path.join(attempt, "root-sibling");
const outsideDir = path.join(attempt, "outside");
const marker = (name) => `${name}_${crypto.randomUUID()}`;
const INSIDE = marker("INSIDE");
const SIBLING = marker("SIBLING");
const OUTSIDE = marker("OUTSIDE");
const NESTED = marker("NESTED");
const SUMMARY = marker("SUMMARY");

fs.mkdirSync(path.join(rootDir, "sub"), { recursive: true });
fs.mkdirSync(siblingDir);
fs.mkdirSync(outsideDir);
fs.writeFileSync(path.join(rootDir, "inside.txt"), INSIDE);
fs.writeFileSync(path.join(rootDir, "sub", "nested.txt"), NESTED);
fs.writeFileSync(path.join(siblingDir, "secret.txt"), SIBLING);
fs.writeFileSync(path.join(outsideDir, "secret.txt"), OUTSIDE);
fs.symlinkSync("inside.txt", path.join(rootDir, "inner-link"));
fs.symlinkSync("../outside", path.join(rootDir, "escape-dir"));
fs.symlinkSync("../outside/secret.txt", path.join(rootDir, "escape-file"));
fs.symlinkSync("../outside/not-yet.txt", path.join(rootDir, "dangling-escape"));

const cases = [];
const requests = [];
const sockets = new Set();
const report = {
  repo,
  attempt,
  started: new Date().toISOString(),
  state: "running",
  cases,
  realDemoHTTP: true,
  sourceHandlerImported: false,
  vendorCalls: false,
};
const save = () =>
  fs.writeFileSync(
    path.join(attempt, "report.json"),
    JSON.stringify(report, null, 2),
  );
save();

const provider = http.createServer(async (req, res) => {
  if (req.method === "HEAD" && req.url === "/health") {
    res.writeHead(200);
    res.end();
    return;
  }
  if (req.method === "GET" && req.url === "/api/v1/models") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(
      JSON.stringify({
        version: "demo-boundaries-owned-empty-registry-v1",
        lastUpdated: "2026-10-09T00:00:00.000Z",
        models: {},
        defaults: {},
        aliases: {},
      }),
    );
    return;
  }
  let data = "";
  for await (const chunk of req) data += chunk;
  if (req.method !== "POST" || req.url !== "/v1/chat/completions") {
    res.writeHead(404);
    res.end();
    return;
  }
  const body = JSON.parse(data);
  requests.push({ maxTokens: body.max_tokens, messages: body.messages });
  res.writeHead(200, { "content-type": "application/json" });
  res.end(
    JSON.stringify({
      id: "owned-summary",
      object: "chat.completion",
      model: "fixture-model",
      choices: [
        {
          index: 0,
          message: { role: "assistant", content: SUMMARY },
          finish_reason: "stop",
        },
      ],
      usage: { prompt_tokens: 5, completion_tokens: 5, total_tokens: 10 },
    }),
  );
});
provider.on("connection", (socket) => {
  sockets.add(socket);
  socket.on("close", () => sockets.delete(socket));
});
await new Promise((resolve) => provider.listen(0, "127.0.0.1", resolve));
const providerPort = provider.address().port;

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function freePort() {
  const reservation = http.createServer();
  await new Promise((resolve) => reservation.listen(0, "127.0.0.1", resolve));
  const { port } = reservation.address();
  await new Promise((resolve) => reservation.close(resolve));
  return port;
}

const children = [];

async function startDemo(name, extraEnv = {}) {
  const port = await freePort();
  const log = fs.openSync(path.join(attempt, `${name}.log`), "wx", 0o600);
  const env = {
    ...process.env,
    PORT: String(port),
    OPENAI_API_KEY: "owned-demo-key",
    OPENAI_BASE_URL: `http://127.0.0.1:${providerPort}/v1`,
    OPENAI_MODEL: "fixture-model",
    MODEL_CONFIG_URL: `http://127.0.0.1:${providerPort}/api/v1/models`,
    NEUROLINK_SKIP_MCP: "true",
    NEUROLINK_DISABLE_BUILTIN_TOOLS: "true",
    AWS_EC2_METADATA_DISABLED: "true",
    RECOVERY_PROOF_ALLOWED_PORTS: [providerPort, port].join(","),
    ...extraEnv,
  };
  // Permit only this test's listeners when the coordinator's network guard is on.
  process.env.RECOVERY_PROOF_ALLOWED_PORTS = env.RECOVERY_PROOF_ALLOWED_PORTS;
  const child = spawn(
    process.execPath,
    [
      path.join(repo, "node_modules/tsx/dist/cli.mjs"),
      path.join(demo, "server.ts"),
    ],
    { cwd: rootDir, env, detached: true, stdio: ["ignore", log, log] },
  );
  const handle = { name, port, child, log, exited: false };
  child.on("exit", () => {
    handle.exited = true;
  });
  children.push(handle);
  async function call(route, body, method = "POST") {
    const response = await fetch(`http://127.0.0.1:${port}${route}`, {
      method,
      ...(method === "POST"
        ? {
            headers: { "content-type": "application/json" },
            body: JSON.stringify(body),
          }
        : {}),
      signal: AbortSignal.timeout(20000),
    });
    const text = await response.text();
    let parsed = null;
    try {
      parsed = JSON.parse(text);
    } catch {}
    return {
      status: response.status,
      headers: response.headers,
      body: parsed,
      text,
    };
  }
  let ready = false;
  for (let i = 0; i < 480; i++) {
    if (handle.exited) {
      throw new Error(`Demo ${name} exited before startup; inspect its log`);
    }
    try {
      if ((await call("/api/analytics", null, "GET")).status === 200) {
        ready = true;
        break;
      }
    } catch {}
    await pause(250);
  }
  assert.equal(ready, true, `Demo ${name} startup deadline exceeded`);
  return { ...handle, call };
}

async function stopDemo(handle) {
  try {
    process.kill(-handle.child.pid, "SIGTERM");
  } catch (error) {
    if (error.code !== "ESRCH") throw error;
  }
  for (let i = 0; i < 20 && !handle.exited; i++) await pause(100);
  if (!handle.exited) {
    try {
      process.kill(-handle.child.pid, "SIGKILL");
    } catch (error) {
      if (error.code !== "ESRCH") throw error;
    }
  }
  fs.closeSync(handle.log);
}

async function test(name, fn) {
  try {
    await fn();
    cases.push({ name, state: "passed" });
    console.log("PASS", name);
  } catch (error) {
    cases.push({ name, state: "failed", error: error.message });
    console.log("FAIL", name, error.message);
  }
  save();
}

const fileOpStatuses = [];
let fileOpLimitHeader = null;
let lastRemaining = null;

try {
  const demoA = await startDemo("default-limits");
  const fileOp = async (body) => {
    const result = await demoA.call("/api/developer/file-operations", body);
    fileOpStatuses.push(result.status);
    fileOpLimitHeader ??= result.headers.get("ratelimit-limit");
    lastRemaining = result.headers.get("ratelimit-remaining");
    return result;
  };
  const denied = (result, where) => {
    assert.equal(result.status, 403, `${where}: expected 403`);
    assert.equal(result.body?.success, false, `${where}: expected failure`);
    for (const secret of [SIBLING, OUTSIDE]) {
      assert.equal(
        result.text.includes(secret),
        false,
        `${where}: a canary from outside the root was returned`,
      );
    }
  };

  await test("a file inside the root is read", async () => {
    const result = await fileOp({ operation: "read", path: "inside.txt" });
    assert.equal(result.status, 200);
    assert.equal(result.body.content, INSIDE);
    assert.equal(result.body.path, path.join(rootDir, "inside.txt"));
  });
  await test("a nested file and an in-root symlink are read", async () => {
    const nested = await fileOp({ operation: "read", path: "sub/nested.txt" });
    assert.equal(nested.status, 200);
    assert.equal(nested.body.content, NESTED);
    const link = await fileOp({ operation: "read", path: "inner-link" });
    assert.equal(link.status, 200);
    assert.equal(link.body.content, INSIDE);
  });
  await test("the root lists, and links that leave it are not followed", async () => {
    const result = await fileOp({ operation: "list" });
    assert.equal(result.status, 200);
    const byName = Object.fromEntries(
      result.body.items.map((item) => [item.name, item]),
    );
    assert.equal(byName["inside.txt"].type, "file");
    assert.equal(byName["inside.txt"].size, INSIDE.length);
    assert.equal(byName["sub"].type, "directory");
    assert.equal(byName["inner-link"].type, "file");
    for (const name of ["escape-dir", "escape-file", "dangling-escape"]) {
      assert.equal(byName[name]?.type, "symlink", `${name} listed as a link`);
      assert.equal(byName[name].size, 0, `${name} reports no target size`);
    }
  });
  await test("a sibling directory sharing the root's name prefix is refused", async () => {
    const relative = "../root-sibling/secret.txt";
    denied(await fileOp({ operation: "read", path: relative }), "read sibling");
    denied(
      await fileOp({ operation: "list", path: "../root-sibling" }),
      "list sibling",
    );
    const planted = path.join(siblingDir, "planted.txt");
    denied(
      await fileOp({
        operation: "write",
        path: "../root-sibling/planted.txt",
        content: "planted",
      }),
      "write sibling",
    );
    assert.equal(fs.existsSync(planted), false, "nothing was written");
    assert.equal(
      fs.readFileSync(path.join(siblingDir, "secret.txt"), "utf-8"),
      SIBLING,
    );
  });
  await test("a symlink to a directory outside the root is refused for read, list and write", async () => {
    denied(
      await fileOp({ operation: "read", path: "escape-dir/secret.txt" }),
      "read through directory link",
    );
    denied(
      await fileOp({ operation: "list", path: "escape-dir" }),
      "list through directory link",
    );
    denied(
      await fileOp({
        operation: "write",
        path: "escape-dir/planted.txt",
        content: "planted",
      }),
      "write through directory link",
    );
    assert.equal(fs.existsSync(path.join(outsideDir, "planted.txt")), false);
  });
  await test("a symlink to a file outside the root is refused for read and write", async () => {
    denied(
      await fileOp({ operation: "read", path: "escape-file" }),
      "read file link",
    );
    denied(
      await fileOp({
        operation: "write",
        path: "escape-file",
        content: "overwritten",
      }),
      "write file link",
    );
    assert.equal(
      fs.readFileSync(path.join(outsideDir, "secret.txt"), "utf-8"),
      OUTSIDE,
    );
  });
  await test("a dangling symlink that would create a file outside the root is refused", async () => {
    denied(
      await fileOp({
        operation: "write",
        path: "dangling-escape",
        content: "planted",
      }),
      "write dangling link",
    );
    assert.equal(fs.existsSync(path.join(outsideDir, "not-yet.txt")), false);
  });
  await test("parent traversal and an absolute path outside the root stay refused", async () => {
    denied(
      await fileOp({ operation: "read", path: "../outside/secret.txt" }),
      "parent traversal",
    );
    denied(
      await fileOp({
        operation: "read",
        path: path.join(outsideDir, "secret.txt"),
      }),
      "absolute path",
    );
  });
  await test("a new file inside the root is written and read back", async () => {
    const written = await fileOp({
      operation: "write",
      path: "sub/created.txt",
      content: "created",
    });
    assert.equal(written.status, 200);
    assert.equal(written.body.written, true);
    assert.equal(
      fs.readFileSync(path.join(rootDir, "sub", "created.txt"), "utf-8"),
      "created",
    );
    const again = await fileOp({ operation: "read", path: "sub/created.txt" });
    assert.equal(again.body.content, "created");
  });
  await test("malformed bodies are rejected with 400", async () => {
    for (const body of [
      { operation: ["read"], path: "inside.txt" },
      { operation: "read", path: ["inside.txt"] },
      { operation: "write", path: "sub/bad.txt", content: 5 },
      { operation: "no-such-operation" },
      {},
    ]) {
      const result = await fileOp(body);
      assert.equal(result.status, 400);
      assert.equal(result.body.success, false);
    }
    assert.equal(fs.existsSync(path.join(rootDir, "sub", "bad.txt")), false);
  });
  await test("a normal client stays inside the default budget", async () => {
    for (let i = 0; i < 12; i++) {
      const result = await fileOp({ operation: "read", path: "inside.txt" });
      assert.equal(result.status, 200);
    }
    assert.equal(fileOpStatuses.includes(429), false);
    assert.equal(fileOpLimitHeader, "60", "default budget is 60 per window");
    assert.equal(
      Number(lastRemaining),
      60 - fileOpStatuses.length,
      "every call spent exactly one unit of budget",
    );
    const other = await demoA.call("/api/analytics", null, "GET");
    assert.equal(other.status, 200, "routes outside the file route are free");
  });

  const summarize = (body) => demoA.call("/api/business/summarize", body);
  const providerCalls = () => requests.length;
  await test("summarize accepts a valid body for every length", async () => {
    for (const [length, maxTokens, lead] of [
      ["brief", 100, "Summarize this text in 1-2 concise sentences"],
      [undefined, 200, "Provide a comprehensive paragraph summary"],
      ["detailed", 400, "Create a detailed summary"],
    ]) {
      const before = providerCalls();
      const result = await summarize({
        text: "Some text to condense.",
        length,
      });
      assert.equal(result.status, 200, `length ${length}: ${result.text}`);
      assert.equal(result.body.content, SUMMARY);
      assert.equal(providerCalls(), before + 1);
      const reached = requests.at(-1);
      assert.equal(reached.maxTokens, maxTokens);
      assert.ok(reached.messages.some((m) => m.content.startsWith(lead)));
    }
    // Preservation control, not a proof: the provider name is now an argument
    // of the log call instead of part of its format string, and the line must
    // still read the same. It passes with or without that change.
    assert.ok(
      fs
        .readFileSync(path.join(attempt, "default-limits.log"), "utf-8")
        .includes("[DEBUG openai] Result structure:"),
      "the formatted debug line names the provider",
    );
  });
  await test("summarize rejects a body that is not a JSON object, before any inference", async () => {
    const before = providerCalls();
    for (const body of [
      [{ text: "Some text to condense.", length: "brief" }],
      [],
      [1, 2, 3],
    ]) {
      const result = await summarize(body);
      assert.equal(result.status, 400);
      assert.equal(result.body.error, "Request body must be a JSON object");
    }
    assert.equal(providerCalls(), before);
  });
  await test("summarize rejects a length that is not one of the three names", async () => {
    const before = providerCalls();
    for (const length of [["brief"], 0, null, { brief: true }, "huge"]) {
      const result = await summarize({
        text: "Some text to condense.",
        length,
      });
      assert.equal(result.status, 400, `length ${JSON.stringify(length)}`);
    }
    for (const text of [["Some text"], 7, "   "]) {
      const result = await summarize({ text, length: "brief" });
      assert.equal(result.status, 400);
    }
    assert.equal(providerCalls(), before);
  });

  await test("a provider name made of format specifiers is refused before any formatted log line", async () => {
    // Why the two format-string alerts have no behavioural proof: the only
    // lines that took the provider name as a format string run after a
    // provider was created, and creating one rejects every name that is not a
    // shipped provider. This pins that premise over the real route. It passes
    // with or without the change to those two log calls.
    const hostile = "%s-%d-%j-CANARY";
    const before = providerCalls();
    const result = await demoA.call("/api/stream", {
      provider: hostile,
      prompt: "Some text to condense.",
    });
    assert.equal(result.text.includes(SUMMARY), false, "nothing was generated");
    assert.equal(providerCalls(), before, "no inference was attempted");
    const demoLog = fs.readFileSync(
      path.join(attempt, "default-limits.log"),
      "utf-8",
    );
    assert.ok(demoLog.includes(hostile), "the name reached the generator");
    assert.equal(
      demoLog
        .split("\n")
        .some(
          (line) =>
            line.includes(hostile) &&
            (line.startsWith("[DEBUG ") || line.includes("Invalid response")),
        ),
      false,
      "no formatted log line carries the name",
    );
  });

  const demoB = await startDemo("tight-limits", {
    DEMO_FILE_OPS_RATE_LIMIT_MAX: "5",
    DEMO_FILE_OPS_RATE_LIMIT_WINDOW_MS: "60000",
  });
  await test("the file route's budget engages, refuses before touching disk, and spares other routes", async () => {
    const read = () =>
      demoB.call("/api/developer/file-operations", {
        operation: "read",
        path: "inside.txt",
      });
    for (let used = 1; used <= 5; used++) {
      const result = await read();
      assert.equal(result.status, 200, `request ${used} is within budget`);
      assert.equal(result.headers.get("ratelimit-limit"), "5");
      assert.equal(result.headers.get("ratelimit-remaining"), String(5 - used));
    }
    const refused = await read();
    assert.equal(refused.status, 429);
    assert.equal(refused.body.success, false);
    assert.ok(Number(refused.headers.get("retry-after")) > 0);
    const blockedWrite = await demoB.call("/api/developer/file-operations", {
      operation: "write",
      path: "blocked.txt",
      content: "never written",
    });
    assert.equal(blockedWrite.status, 429);
    assert.equal(fs.existsSync(path.join(rootDir, "blocked.txt")), false);
    const other = await demoB.call("/api/analytics", null, "GET");
    assert.equal(other.status, 200);
  });
  await test("an unusable budget setting falls back to the default", async () => {
    const demoC = await startDemo("bad-setting", {
      DEMO_FILE_OPS_RATE_LIMIT_MAX: "0",
      DEMO_FILE_OPS_RATE_LIMIT_WINDOW_MS: "soon",
    });
    const result = await demoC.call("/api/developer/file-operations", {
      operation: "read",
      path: "inside.txt",
    });
    assert.equal(result.status, 200);
    assert.equal(result.headers.get("ratelimit-limit"), "60");
  });

  report.state = cases.some((row) => row.state === "failed")
    ? "failed"
    : "passed";
} catch (error) {
  report.state = "failed_setup";
  report.setupError = error.message;
} finally {
  for (const handle of children) await stopDemo(handle);
  for (const socket of sockets) socket.destroy();
  await new Promise((resolve) => provider.close(resolve));
  report.completed = new Date().toISOString();
  report.totals = {
    passed: cases.filter((row) => row.state === "passed").length,
    failed: cases.filter((row) => row.state === "failed").length,
  };
  report.ownedProcessesStopped = true;
  save();
}
// A failing run keeps its logs and report for inspection; a passing run leaves
// nothing behind. Symlinks inside the directory are removed, never followed.
const keep = report.state !== "passed";
if (!keep) fs.rmSync(attempt, { recursive: true, force: true });
console.log(
  JSON.stringify({
    ...(keep ? { report: path.join(attempt, "report.json") } : {}),
    state: report.state,
    totals: report.totals,
  }),
);
if (keep) process.exitCode = 1;
