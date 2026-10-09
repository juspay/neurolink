/** Real demo HTTP indexing/query routes and the built SDK with owned inference.
 * Ordinary punctuation is literal search text; no internal handler extraction.
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
const attempt = fs.mkdtempSync(
  path.join(os.tmpdir(), "neurolink-rag-keywords-"),
);
const requests = [];
const cases = [];
const sockets = new Set();
const report = {
  repo,
  attempt,
  started: new Date().toISOString(),
  state: "running",
  cases,
  requests,
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
const marker = "RAG_LITERAL_" + crypto.randomUUID();
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
        version: "demo-rag-owned-empty-registry-v1",
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
  requests.push({
    method: req.method,
    path: req.url,
    model: body.model,
    maxTokens: body.max_tokens,
    messages: body.messages,
    fakeAuthMatched: req.headers.authorization === "Bearer owned-demo-key",
  });
  res.writeHead(200, { "content-type": "application/json" });
  res.end(
    JSON.stringify({
      id: "owned-rag",
      object: "chat.completion",
      model: "fixture-model",
      choices: [
        {
          index: 0,
          message: { role: "assistant", content: marker },
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
const reservation = http.createServer();
await new Promise((resolve) => reservation.listen(0, "127.0.0.1", resolve));
const appPort = reservation.address().port;
await new Promise((resolve) => reservation.close(resolve));
const log = fs.openSync(path.join(attempt, "demo.log"), "wx", 0o600);
const env = {
  ...process.env,
  PORT: String(appPort),
  OPENAI_API_KEY: "owned-demo-key",
  OPENAI_BASE_URL: `http://127.0.0.1:${providerPort}/v1`,
  OPENAI_MODEL: "fixture-model",
  MODEL_CONFIG_URL: `http://127.0.0.1:${providerPort}/api/v1/models`,
  NEUROLINK_SKIP_MCP: "true",
  NEUROLINK_DISABLE_BUILTIN_TOOLS: "true",
  AWS_EC2_METADATA_DISABLED: "true",
  RECOVERY_PROOF_ALLOWED_PORTS: [providerPort, appPort].join(","),
};
// Permit only this test's listeners when the coordinator's network guard is on.
process.env.RECOVERY_PROOF_ALLOWED_PORTS = env.RECOVERY_PROOF_ALLOWED_PORTS;
const child = spawn(
  process.execPath,
  [
    path.join(repo, "node_modules/tsx/dist/cli.mjs"),
    path.join(demo, "server.ts"),
  ],
  { cwd: repo, env, detached: true, stdio: ["ignore", log, log] },
);
let exited = false;
child.on("exit", () => {
  exited = true;
});
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function call(route, body, method = "POST") {
  const response = await fetch(`http://127.0.0.1:${appPort}${route}`, {
    method,
    ...(method === "POST"
      ? {
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        }
      : {}),
    signal: AbortSignal.timeout(20000),
  });
  return { status: response.status, body: await response.json() };
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
async function query(text, documentIds, expected) {
  const start = requests.length;
  const result = await call("/api/rag/query", {
    query: text,
    documentIds,
    provider: "openai",
  });
  assert.equal(result.status, 200, JSON.stringify(result));
  assert.equal(result.body.answer, marker);
  assert.deepEqual(
    result.body.sources.map(({ documentId, score }) => [documentId, score]),
    expected,
  );
  assert.equal(result.body.contextUsed, expected.length > 0);
  const reached = requests.slice(start);
  assert.equal(reached.length, 1);
  assert.equal(reached[0].model, "fixture-model");
  assert.equal(reached[0].fakeAuthMatched, true);
  assert.equal(reached[0].maxTokens, expected.length ? 1000 : 500);
  if (expected.length) {
    assert.ok(reached[0].messages.some((m) => m.content.includes("CONTEXT:")));
  }
}
try {
  let ready = false;
  for (let i = 0; i < 100; i++) {
    if (exited) throw new Error("Demo exited before startup; inspect demo.log");
    try {
      const result = await call("/api/analytics", null, "GET");
      if (result.status === 200) {
        ready = true;
        break;
      }
    } catch {}
    await pause(100);
  }
  assert.equal(ready, true, "Actual demo startup deadline exceeded");
  await test("empty corpus preserves no-source response without inference", async () => {
    const start = requests.length;
    const result = await call("/api/rag/query", { query: "ordinary" });
    assert.equal(result.status, 200);
    assert.deepEqual(result.body.sources, []);
    assert.equal(requests.length, start);
  });
  const documents = {
    cpp: "C++ systems. C++ templates.",
    cppDecoy: "Caa systems and templates.",
    version: "Version v1.2 is documented.",
    versionDecoy: "Version v1x2 is separate.",
    bracket: "The label abc[1] is documented.",
    bracketDecoy: "The label abc1 is separate.",
    parentheses: "The (guide) is documented.",
    parenthesesDecoy: "The guide is separate.",
    repeats: "banana banana bananana",
    ordinary: "VECTOR vector Vector std::vector",
  };
  await test("index ordinary text through the real HTTP route", async () => {
    const start = requests.length;
    for (const [documentId, content] of Object.entries(documents)) {
      const result = await call("/api/rag/index", { documentId, content });
      assert.equal(result.status, 200);
      assert.equal(result.body.documentId, documentId);
      assert.equal(result.body.chunksCreated, 1);
    }
    assert.equal(requests.length, start);
  });
  await test("C++ is literal and excludes the Caa document", () =>
    query("C++", ["cpp", "cppDecoy"], [["cpp", 2]]));
  await test("v1.2 preserves its literal dot", () =>
    query("v1.2", ["version", "versionDecoy"], [["version", 1]]));
  await test("abc[1] preserves its literal brackets", () =>
    query("abc[1]", ["bracket", "bracketDecoy"], [["bracket", 1]]));
  await test("(guide) preserves its literal parentheses", () =>
    query(
      "(guide)",
      ["parentheses", "parenthesesDecoy"],
      [["parentheses", 1]],
    ));
  await test("ordinary word matches remain case insensitive", () =>
    query("VeCtOr", ["ordinary"], [["ordinary", 4]]));
  await test("ordinary repeated substrings remain non-overlapping", () =>
    query("banana", ["repeats"], [["repeats", 3]]));
  await test("repeated query terms preserve existing weighting", () =>
    query("banana banana", ["repeats"], [["repeats", 6]]));
  await test("unmatched ordinary text uses owned inference without context", () =>
    query("needle", ["ordinary"], []));
  await test("existing two-character term exclusion remains", () =>
    query("C#", ["cpp"], []));
  report.state = cases.some((row) => row.state === "failed")
    ? "failed"
    : "passed";
} catch (error) {
  report.state = "failed_setup";
  report.setupError = error.message;
} finally {
  try {
    process.kill(-child.pid, "SIGTERM");
  } catch (error) {
    if (error.code !== "ESRCH") throw error;
  }
  for (let i = 0; i < 20 && !exited; i++) await pause(100);
  if (!exited) {
    try {
      process.kill(-child.pid, "SIGKILL");
    } catch (error) {
      if (error.code !== "ESRCH") throw error;
    }
  }
  fs.closeSync(log);
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
console.log(
  JSON.stringify({
    report: path.join(attempt, "report.json"),
    state: report.state,
    totals: report.totals,
  }),
);
if (report.state !== "passed") process.exitCode = 1;
