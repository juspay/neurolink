#!/usr/bin/env tsx
/**
 * Continuous test suite — live SDK + CLI + Agent system.
 * Exercises generate/stream and Agent/AgentNetwork against a real provider.
 *
 * Usage:
 *   TEST_PROVIDER=vertex npx tsx test/continuous-test-agents-live.ts
 */

import { execFileSync } from "child_process";
import { NeuroLink } from "../src/lib/neurolink.js";
import { withTimeout } from "../src/lib/utils/async/withTimeout.js";

type TestResult = {
  name: string;
  result: boolean | null; // true = PASS, false = FAIL, null = SKIP
  error: string | null;
  duration: number;
};

const TEST_CONFIG = {
  provider: process.env.TEST_PROVIDER || "vertex",
  model: process.env.TEST_MODEL || undefined,
  maxTokens: 100,
  timeout: 60000,
};

const results: TestResult[] = [];

function runCli(args: string[]): string {
  return execFileSync("node", ["dist/cli/index.js", ...args], {
    encoding: "utf-8",
    timeout: TEST_CONFIG.timeout,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

async function run(
  name: string,
  fn: () => Promise<boolean | null>,
): Promise<void> {
  const start = Date.now();
  let result: boolean | null = false;
  let error: string | null = null;
  try {
    result = await withTimeout(
      fn(),
      TEST_CONFIG.timeout,
      `${name} timed out after ${TEST_CONFIG.timeout}ms`,
    );
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }
  const duration = Date.now() - start;
  results.push({ name, result, error, duration });
  const icon = result === true ? "✅" : result === null ? "⏭️ " : "❌";
  const status = result === true ? "PASS" : result === null ? "SKIP" : "FAIL";
  console.log(`${icon} ${status} [${duration}ms] ${name}`);
  if (error) {
    console.log(`   ↳ ${error.split("\n")[0].slice(0, 200)}`);
  }
}

// ============================================================================
// SDK tests
// ============================================================================

let sdk: NeuroLink;

async function testSdkGenerate(): Promise<boolean | null> {
  const result = await sdk.generate({
    input: { text: "Say exactly: PONG" },
    provider: TEST_CONFIG.provider as never,
    ...(TEST_CONFIG.model && { model: TEST_CONFIG.model }),
    maxTokens: TEST_CONFIG.maxTokens,
  });
  if (!result?.content || typeof result.content !== "string") {
    throw new Error(`Invalid generate result: ${JSON.stringify(result)}`);
  }
  return result.content.length > 0;
}

async function testSdkStream(): Promise<boolean | null> {
  const result = await sdk.stream({
    input: { text: "Count from 1 to 3" },
    provider: TEST_CONFIG.provider as never,
    ...(TEST_CONFIG.model && { model: TEST_CONFIG.model }),
    maxTokens: TEST_CONFIG.maxTokens,
  });
  let content = "";
  let chunkCount = 0;
  for await (const chunk of result.stream) {
    chunkCount++;
    if ("content" in chunk && typeof chunk.content === "string") {
      content += chunk.content;
    }
  }
  if (chunkCount === 0) {
    throw new Error("Stream yielded zero chunks");
  }
  if (content.length === 0) {
    throw new Error("Stream yielded chunks but no content");
  }
  return true;
}

// ============================================================================
// CLI tests
// ============================================================================

async function testCliGen(): Promise<boolean | null> {
  try {
    const out = runCli([
      "gen",
      "Say PONG",
      "--provider",
      TEST_CONFIG.provider,
      "--max-tokens",
      String(TEST_CONFIG.maxTokens),
      ...(TEST_CONFIG.model ? ["--model", TEST_CONFIG.model] : []),
    ]);
    if (!out || out.trim().length === 0) {
      throw new Error("CLI produced empty output");
    }
    return true;
  } catch (e) {
    const err = e as { stderr?: Buffer; message?: string };
    const stderr = err.stderr?.toString() ?? "";
    throw new Error(
      `CLI gen failed: ${err.message} stderr=${stderr.slice(0, 200)}`,
      { cause: e },
    );
  }
}

async function testCliStream(): Promise<boolean | null> {
  try {
    const out = runCli([
      "stream",
      "Count to 3",
      "--provider",
      TEST_CONFIG.provider,
      "--max-tokens",
      String(TEST_CONFIG.maxTokens),
      ...(TEST_CONFIG.model ? ["--model", TEST_CONFIG.model] : []),
    ]);
    if (!out || out.trim().length === 0) {
      throw new Error("CLI stream produced empty output");
    }
    return true;
  } catch (e) {
    const err = e as { stderr?: Buffer; message?: string };
    const stderr = err.stderr?.toString() ?? "";
    throw new Error(
      `CLI stream failed: ${err.message} stderr=${stderr.slice(0, 200)}`,
      { cause: e },
    );
  }
}

// ============================================================================
// Agent tests (wrap SDK generate/stream)
// ============================================================================

async function testAgentExecute(): Promise<boolean | null> {
  const agent = await sdk.createAgent({
    id: "echo-agent",
    name: "Echo Agent",
    description: "Repeats back what it is told.",
    instructions: "Answer concisely in under 20 words.",
    provider: TEST_CONFIG.provider,
    ...(TEST_CONFIG.model && { model: TEST_CONFIG.model }),
  });
  const result = await agent.execute("Say PONG");
  if (!result?.content || typeof result.content !== "string") {
    throw new Error(`Invalid agent result: ${JSON.stringify(result)}`);
  }
  return result.content.length > 0;
}

async function testAgentStream(): Promise<boolean | null> {
  const agent = await sdk.createAgent({
    id: "stream-agent",
    name: "Stream Agent",
    description: "Streams responses.",
    instructions: "Answer concisely in under 20 words.",
    provider: TEST_CONFIG.provider,
    ...(TEST_CONFIG.model && { model: TEST_CONFIG.model }),
  });
  const chunks: Array<{ type: string }> = [];
  let textContent = "";
  for await (const chunk of agent.stream("Count from 1 to 3")) {
    chunks.push({ type: chunk.type });
    if (chunk.type === "agent-text" && "content" in chunk) {
      textContent += (chunk as { content: string }).content;
    }
  }
  const hasStart = chunks.some((c) => c.type === "agent-start");
  const hasComplete = chunks.some((c) => c.type === "agent-complete");
  if (!hasStart || !hasComplete) {
    throw new Error(
      `Missing required chunks. Got: ${chunks.map((c) => c.type).join(", ")}`,
    );
  }
  if (textContent.length === 0) {
    throw new Error("No agent-text chunks with content");
  }
  return true;
}

// ============================================================================
// AgentNetwork tests (routes + executes multiple agents)
// ============================================================================

async function testNetworkExecute(): Promise<boolean | null> {
  const network = await sdk.createNetwork({
    name: "Simple Network",
    description: "Test network with one agent",
    agents: [
      {
        id: "responder",
        name: "Responder",
        description: "Responds to simple questions.",
        instructions: "Answer concisely in under 20 words.",
        provider: TEST_CONFIG.provider,
        ...(TEST_CONFIG.model && { model: TEST_CONFIG.model }),
      },
    ],
    router: {
      provider: TEST_CONFIG.provider,
      ...(TEST_CONFIG.model && { model: TEST_CONFIG.model }),
    },
    maxSteps: 2,
  });
  const result = await network.execute({ message: "Say PONG" });
  if (!result?.content || typeof result.content !== "string") {
    throw new Error(
      `Invalid network result: ${JSON.stringify(result).slice(0, 200)}`,
    );
  }
  if (!result.trace || !Array.isArray(result.trace.steps)) {
    throw new Error(`Missing trace.steps: ${JSON.stringify(result.trace)}`);
  }
  return result.trace.steps.length > 0;
}

async function testNetworkStream(): Promise<boolean | null> {
  const network = await sdk.createNetwork({
    name: "Stream Network",
    description: "Test streaming network",
    agents: [
      {
        id: "responder",
        name: "Responder",
        description: "Responds to simple questions.",
        instructions: "Answer concisely in under 20 words.",
        provider: TEST_CONFIG.provider,
        ...(TEST_CONFIG.model && { model: TEST_CONFIG.model }),
      },
    ],
    router: {
      provider: TEST_CONFIG.provider,
      ...(TEST_CONFIG.model && { model: TEST_CONFIG.model }),
    },
    maxSteps: 2,
  });
  const chunkTypes: string[] = [];
  for await (const chunk of network.stream({ message: "Say PONG" })) {
    chunkTypes.push(chunk.type);
  }
  const hasStart = chunkTypes.includes("network-start");
  const hasComplete =
    chunkTypes.includes("network-complete") ||
    chunkTypes.includes("network-end");
  if (!hasStart) {
    throw new Error(
      `Missing network-start chunk. Got: ${chunkTypes.slice(0, 10).join(", ")}...`,
    );
  }
  if (!hasComplete) {
    throw new Error(
      `Missing network-complete/end chunk. Got: ${chunkTypes.slice(-5).join(", ")}`,
    );
  }
  return true;
}

// ============================================================================
// Runner
// ============================================================================

async function main(): Promise<void> {
  console.log(`\n🧪 Continuous Test Suite — Agents Live\n`);
  console.log(`Provider: ${TEST_CONFIG.provider}`);
  console.log(`Model:    ${TEST_CONFIG.model ?? "(provider default)"}\n`);

  sdk = new NeuroLink();

  console.log("─── SDK ──────────────────────────────────────────");
  await run("SDK generate", testSdkGenerate);
  await run("SDK stream", testSdkStream);

  console.log("\n─── CLI ──────────────────────────────────────────");
  await run("CLI gen", testCliGen);
  await run("CLI stream", testCliStream);

  console.log("\n─── Agent ────────────────────────────────────────");
  await run("Agent.execute() → generate", testAgentExecute);
  await run("Agent.stream() → stream", testAgentStream);

  console.log("\n─── Network ──────────────────────────────────────");
  await run("AgentNetwork.execute() → routes + generate", testNetworkExecute);
  await run("AgentNetwork.stream() → routes + stream", testNetworkStream);

  // Summary
  console.log("\n════════════════════════════════════════════════════");
  const pass = results.filter((r) => r.result === true).length;
  const fail = results.filter((r) => r.result === false).length;
  const skip = results.filter((r) => r.result === null).length;
  console.log(
    `Results: ${pass} PASS · ${fail} FAIL · ${skip} SKIP (of ${results.length})`,
  );
  if (fail > 0) {
    console.log("\nFailures:");
    results
      .filter((r) => r.result === false)
      .forEach((r) => {
        console.log(`  ❌ ${r.name}`);
        if (r.error) {
          console.log(`     ${r.error.split("\n")[0].slice(0, 300)}`);
        }
      });
  }
  console.log("");

  try {
    await sdk.dispose();
  } catch {
    // ignore
  }

  process.exit(fail > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("💥 Unhandled error:", err);
  process.exit(1);
});
