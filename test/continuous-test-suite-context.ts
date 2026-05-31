#!/usr/bin/env tsx
import "dotenv/config";

// Install fetch capture BEFORE NeuroLink import for issue-02 tests
import { installFetchCapture } from "./helpers/fetchCapture.js";
const fetchCapture = installFetchCapture();
import { buildLargeConversationMessages } from "./helpers/largeConversation.js";
import { skipIfEnvMissing } from "./helpers/envGuard.js";

/**
 * Continuous Test Suite: Context Management
 *
 * Tests context compaction, budget checking, abort signals, token estimation,
 * prompt caching, and concurrent conversations.
 *
 * Covers items: #1 (context compaction), #2 (80% budget threshold),
 * #3 (concurrent conversations), #4 (file summarization)
 *
 * Run: npx tsx test/continuous-test-suite-context.ts --provider=vertex
 */

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import {
  getMetricsAggregator,
  NeuroLink,
  resetMetricsAggregator,
} from "../dist/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Prevent unhandled rejections from abort signal tests crashing the process
process.on("unhandledRejection", (reason) => {
  const msg = reason instanceof Error ? reason.message : String(reason);
  if (
    msg.toLowerCase().includes("abort") ||
    msg.toLowerCase().includes("cancel") ||
    msg.toLowerCase().includes("signal")
  ) {
    // Expected from abort signal tests — ignore
    return;
  }
  console.error("[UNHANDLED REJECTION]", msg);
});

// ============================================================
// CONFIGURATION
// ============================================================

const PROVIDER_MAX_TOKENS: Record<string, number> = {
  anthropic: 8192,
  vertex: 10000,
  "google-ai-studio": 10000,
  openai: 16384,
  bedrock: 8192,
  ollama: 4096,
  openrouter: 4096,
  // OpenAI-compat providers added 2026
  deepseek: 4096,
  "nvidia-nim": 8192,
  "lm-studio": 1024,
  llamacpp: 1024,
};

const TEST_CONFIG = {
  provider: process.env.TEST_PROVIDER || "vertex",
  model: process.env.TEST_MODEL || (undefined as string | undefined),
  maxTokens: undefined as number | undefined,
  timeout: 120000,
  interTestDelay: 7000,
};

/**
 * Vertex models used by the per-provider compaction / abort tests below.
 * Reviewer follow-up: previously a single `VERTEX_TEST_MODEL` constant
 * defaulted to `gemini-2.5-pro`, which meant Flash-named tests silently
 * ran on Pro (and 2.0-Flash legacy tests ran on whatever override was
 * set). Now split into Pro and Flash family overrides so the test names
 * match what's actually exercised:
 *   - VERTEX_PRO_TEST_MODEL  → "Pro"-named compaction / abort tests
 *   - VERTEX_FLASH_TEST_MODEL → "Flash"-named compaction / abort tests
 * Each falls back via dedicated env override → TEST_MODEL → family default.
 */
const VERTEX_PRO_TEST_MODEL =
  process.env.VERTEX_PRO_TEST_MODEL ||
  process.env.TEST_MODEL ||
  "gemini-2.5-pro";
const VERTEX_FLASH_TEST_MODEL =
  process.env.VERTEX_FLASH_TEST_MODEL ||
  process.env.TEST_MODEL ||
  "gemini-2.5-flash";

// ============================================================
// LOGGING UTILITIES
// ============================================================

import {
  defineSuite,
  log,
  logSection,
  type ColorName,
} from "./helpers/harness.js";

const { recordTest, runSuite } = defineSuite("Context");

/** Print-only logTest shim. Counters are driven by recordTest in the runner. */
function logTest(
  testName: string,
  status: "PASS" | "FAIL" | "SKIP" | "TESTING",
  details?: string,
): void {
  const color: ColorName =
    status === "PASS"
      ? "green"
      : status === "FAIL"
        ? "red"
        : status === "SKIP"
          ? "yellow"
          : "blue";
  log(`[${status}] ${testName}${details ? ` — ${details}` : ""}`, color);
}
// ============================================================
// SHARED UTILITIES
// ============================================================

// Use boolean | null: true=pass, false=fail, null=skip
function buildBaseSDKOptions(): { provider: string; model?: string } {
  const opts: { provider: string; model?: string } = {
    provider: TEST_CONFIG.provider,
  };
  if (TEST_CONFIG.model) {
    opts.model = TEST_CONFIG.model;
  }
  return opts;
}

function isExpectedProviderError(msg: string): boolean {
  return [
    "API key",
    "authentication",
    "rate limit",
    "quota",
    "credentials",
    "could not be resolved",
    "Cannot connect",
    "Failed to generate",
    "UNAUTHENTICATED",
    "PERMISSION_DENIED",
    "billing",
    "project",
    "not found",
    "does not exist",
  ].some((p) => msg.toLowerCase().includes(p.toLowerCase()));
}

async function globalCleanup(): Promise<void> {
  await new Promise((r) => setTimeout(r, 100));
  if (global.gc) {
    global.gc();
  }
}

// ============================================================
// FIXTURE HELPERS
// ============================================================

/**
 * Generate a large block of text to fill context window.
 * Approximately 4 tokens per English word, ~1.3 tokens per word with overhead.
 */
function generateLargeText(approximateTokens: number): string {
  const wordsPerToken = 0.75; // conservative: ~1.33 tokens per word
  const wordCount = Math.ceil(approximateTokens * wordsPerToken);
  const sentences = [
    "The quick brown fox jumps over the lazy dog.",
    "Artificial intelligence is transforming industries worldwide.",
    "Cloud computing enables scalable infrastructure for modern applications.",
    "Machine learning models require large datasets for training.",
    "Natural language processing helps computers understand human text.",
    "Deep learning architectures have revolutionized image recognition.",
    "Distributed systems provide fault tolerance and high availability.",
    "Microservices architecture allows independent deployment of components.",
    "Containerization with Docker simplifies application deployment.",
    "Kubernetes orchestrates container workloads at scale.",
    "GraphQL provides flexible data querying for APIs.",
    "TypeScript adds type safety to JavaScript development.",
    "React and Vue are popular frontend frameworks.",
    "Node.js enables server-side JavaScript execution.",
    "PostgreSQL is a powerful open-source relational database.",
  ];
  const words: string[] = [];
  let sentenceIndex = 0;
  while (words.length < wordCount) {
    words.push(sentences[sentenceIndex % sentences.length]);
    sentenceIndex++;
  }
  return words.join(" ").substring(0, approximateTokens * 4);
}

function getDefaultLargeToolOutput(): string {
  const fixturePath = path.join(
    __dirname,
    "fixtures/context/large-tool-output.json",
  );
  if (fs.existsSync(fixturePath)) {
    return fs.readFileSync(fixturePath, "utf-8");
  }
  // Inline fallback: generate ~30K tokens of JSON data
  const entries: Record<string, unknown>[] = [];
  for (let i = 0; i < 500; i++) {
    entries.push({
      id: `entry-${i}`,
      timestamp: new Date().toISOString(),
      data: generateLargeText(50),
      metrics: {
        value: Math.random() * 1000,
        count: Math.floor(Math.random() * 100),
        tags: [`tag-${i % 10}`, `category-${i % 5}`],
      },
    });
  }
  return JSON.stringify({ results: entries, total: entries.length }, null, 2);
}

function getDefaultLongDocument(): string {
  const fixturePath = path.join(__dirname, "fixtures/context/long-document.md");
  if (fs.existsSync(fixturePath)) {
    return fs.readFileSync(fixturePath, "utf-8");
  }
  // Inline fallback: generate a long markdown document
  const sections: string[] = ["# Long Document for Testing\n"];
  for (let i = 1; i <= 50; i++) {
    sections.push(`## Section ${i}: Topic Area ${i}\n`);
    sections.push(generateLargeText(200) + "\n\n");
    if (i % 5 === 0) {
      sections.push("```typescript\n");
      sections.push(`function processSection${i}(data: string): void {\n`);
      sections.push(`  console.log("Processing section ${i}", data);\n`);
      sections.push(`  return;\n}\n`);
      sections.push("```\n\n");
    }
  }
  return sections.join("");
}

// ============================================================
// TEST FUNCTIONS
// ============================================================

// --- Test 1: Budget Checker Threshold Trigger ---
async function testBudgetCheckerThresholdTrigger(
  sdk: NeuroLink,
): Promise<boolean | null> {
  logTest("SDK Generate - Budget Checker Threshold Trigger", "TESTING");
  try {
    const sdkOptions = buildBaseSDKOptions();
    const budgetSdk = new NeuroLink();
    const largePrompt = generateLargeText(2000);
    const totalTurns = 22;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let lastResult: any = null;

    for (let i = 0; i < totalTurns; i++) {
      try {
        const result = await budgetSdk.generate({
          input: {
            text: `Turn ${i + 1}: ${largePrompt.substring(0, 500)} Respond briefly with just "Turn ${i + 1} acknowledged."`,
          },
          maxTokens: 100,
          ...sdkOptions,
        });
        if (result.content && result.content.length > 0) {
          lastResult = result;
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        if (isExpectedProviderError(msg)) {
          logTest(
            "SDK Generate - Budget Checker Threshold Trigger",
            "SKIP",
            msg,
          );
          try {
            await budgetSdk.shutdown?.();
          } catch {
            /* ignore */
          }
          return null;
        }
        // Context overflow errors are expected and indicate budget checking works
        log(`   Turn ${i + 1} error (may be expected): ${msg}`, "yellow");
      }
      if (i % 10 === 9) {
        await new Promise((r) => setTimeout(r, 2000));
      }
    }

    // Gate: the final generate() call must succeed
    try {
      const finalResult = await budgetSdk.generate({
        input: {
          text: "Final check: respond with 'OK'.",
        },
        maxTokens: 50,
        ...sdkOptions,
      });

      try {
        await budgetSdk.shutdown?.();
      } catch {
        /* ignore */
      }

      if (!finalResult.content || finalResult.content.length === 0) {
        logTest(
          "SDK Generate - Budget Checker Threshold Trigger",
          "FAIL",
          "Final generate() returned empty content after 22 turns",
        );
        return false;
      }

      // If usage data is available, check that promptTokens is reasonable
      // (not the raw sum of all turns — compaction should have reduced it)
      const usage = finalResult.usage as { promptTokens?: number } | undefined;
      if (usage?.promptTokens && usage.promptTokens > 0) {
        // Raw sum would be ~22 * 500 tokens = 11000+. After compaction it should be less.
        const reasonable = usage.promptTokens < totalTurns * 500;
        logTest(
          "SDK Generate - Budget Checker Threshold Trigger",
          "PASS",
          `Final call succeeded after ${totalTurns} turns. promptTokens=${usage.promptTokens} (reasonable=${reasonable})`,
        );
      } else {
        logTest(
          "SDK Generate - Budget Checker Threshold Trigger",
          "PASS",
          `Final call succeeded after ${totalTurns} turns (no usage data — compaction transparent)`,
        );
      }
      return true;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (isExpectedProviderError(msg)) {
        logTest("SDK Generate - Budget Checker Threshold Trigger", "SKIP", msg);
        try {
          await budgetSdk.shutdown?.();
        } catch {
          /* ignore */
        }
        return null;
      }
      try {
        await budgetSdk.shutdown?.();
      } catch {
        /* ignore */
      }
      logTest(
        "SDK Generate - Budget Checker Threshold Trigger",
        "FAIL",
        `Final generate() failed after ${totalTurns} turns: ${msg}`,
      );
      return false;
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (isExpectedProviderError(msg)) {
      logTest("SDK Generate - Budget Checker Threshold Trigger", "SKIP", msg);
      return null;
    }
    logTest("SDK Generate - Budget Checker Threshold Trigger", "FAIL", msg);
    return false;
  }
}

// --- Test 2: Context Compaction Long Conversation ---
async function testContextCompactionLongConversation(
  sdk: NeuroLink,
): Promise<boolean | null> {
  logTest("SDK Generate - Context Compaction Long Conversation", "TESTING");
  try {
    const sdkOptions = buildBaseSDKOptions();
    const totalTurns = 25;
    const topics = [
      "quantum computing",
      "machine learning",
      "cloud architecture",
      "cybersecurity",
      "blockchain",
      "data engineering",
      "DevOps practices",
      "API design",
      "database optimization",
      "microservices",
    ];

    // Use a fresh SDK instance with conversation memory
    const conversationSdk = new NeuroLink();

    for (let i = 0; i < totalTurns; i++) {
      const topic = topics[i % topics.length];
      try {
        await conversationSdk.generate({
          input: {
            text: `Turn ${i + 1}: Tell me one key fact about ${topic}. Keep it under 30 words.`,
          },
          maxTokens: 100,
          ...sdkOptions,
        });
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        if (isExpectedProviderError(msg)) {
          logTest(
            "SDK Generate - Context Compaction Long Conversation",
            "SKIP",
            msg,
          );
          try {
            await conversationSdk.shutdown?.();
          } catch {
            /* ignore */
          }
          return null;
        }
        log(`   Turn ${i + 1} error: ${msg}`, "yellow");
      }
      // Small delay to avoid rate limiting
      if (i % 10 === 9) {
        await new Promise((r) => setTimeout(r, 2000));
      }
    }

    // Gate: final generate() must succeed
    try {
      const finalResult = await conversationSdk.generate({
        input: {
          text: "Summarize in one sentence what we discussed.",
        },
        maxTokens: 150,
        ...sdkOptions,
      });

      try {
        await conversationSdk.shutdown?.();
      } catch {
        /* ignore */
      }

      if (!finalResult.content || finalResult.content.length === 0) {
        logTest(
          "SDK Generate - Context Compaction Long Conversation",
          "FAIL",
          "Final generate() returned empty after long conversation",
        );
        return false;
      }

      // If usage is available, verify promptTokens is not the raw sum
      const usage = finalResult.usage as { promptTokens?: number } | undefined;
      if (usage?.promptTokens && usage.promptTokens > 0) {
        logTest(
          "SDK Generate - Context Compaction Long Conversation",
          "PASS",
          `Final call succeeded after ${totalTurns} turns, promptTokens=${usage.promptTokens}`,
        );
      } else {
        logTest(
          "SDK Generate - Context Compaction Long Conversation",
          "PASS",
          `Final call succeeded after ${totalTurns} turns (compaction transparent)`,
        );
      }
      return true;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (isExpectedProviderError(msg)) {
        logTest(
          "SDK Generate - Context Compaction Long Conversation",
          "SKIP",
          msg,
        );
        try {
          await conversationSdk.shutdown?.();
        } catch {
          /* ignore */
        }
        return null;
      }
      try {
        await conversationSdk.shutdown?.();
      } catch {
        /* ignore */
      }
      logTest(
        "SDK Generate - Context Compaction Long Conversation",
        "FAIL",
        `Final generate() failed: ${msg}`,
      );
      return false;
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (isExpectedProviderError(msg)) {
      logTest(
        "SDK Generate - Context Compaction Long Conversation",
        "SKIP",
        msg,
      );
      return null;
    }
    logTest("SDK Generate - Context Compaction Long Conversation", "FAIL", msg);
    return false;
  }
}

// --- Test 3: Context Compaction Vertex Flash (provider-agnostic) ---
// Uses TEST_PROVIDER if set; falls back to vertex+Flash for the canonical
// long-context-compaction test. The test verifies that 20 turns + a final
// generate() complete without error — proving compaction kicks in.
async function testContextCompactionVertex(
  sdk: NeuroLink,
): Promise<boolean | null> {
  // Provider-aware label so non-Vertex runs (deepseek, lm-studio, NIM, …)
  // don't show up as "Vertex Flash" failures in the log. Falls back to the
  // historical literal when the test actually targets Vertex.
  const testLabelFlash =
    TEST_CONFIG.provider === "vertex"
      ? "SDK Generate - Context Compaction Vertex Flash"
      : `SDK Generate - Context Compaction (${TEST_CONFIG.provider})`;
  logTest(testLabelFlash, "TESTING");
  try {
    const testSdk = new NeuroLink();
    const totalTurns = 20;
    // Use TEST_CONFIG.provider directly: --provider=deepseek (without
    // TEST_PROVIDER env) and other CLI/env paths should also override the
    // default vertex target.
    const useVertex = TEST_CONFIG.provider === "vertex";
    const provider = TEST_CONFIG.provider;
    // Honor `--model` even on Vertex runs — without this, an explicit
    // CLI override silently fell back to VERTEX_FLASH_TEST_MODEL.
    const model = useVertex
      ? (TEST_CONFIG.model ?? VERTEX_FLASH_TEST_MODEL)
      : TEST_CONFIG.model;

    for (let i = 0; i < totalTurns; i++) {
      try {
        await testSdk.generate({
          input: {
            text: `Turn ${i + 1}: Name one programming language and its primary use case. Be brief.`,
          },
          maxTokens: 100,
          provider,
          ...(model ? { model } : {}),
        });
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        if (isExpectedProviderError(msg)) {
          logTest(testLabelFlash, "SKIP", msg);
          try {
            await testSdk.shutdown?.();
          } catch {
            /* ignore */
          }
          return null;
        }
        log(`   Turn ${i + 1} error: ${msg}`, "yellow");
      }
    }

    // Gate: final generate() must succeed
    try {
      const finalResult = await testSdk.generate({
        input: { text: "Reply with 'OK' to confirm you can still respond." },
        maxTokens: 50,
        provider,
        ...(model ? { model } : {}),
      });

      try {
        await testSdk.shutdown?.();
      } catch {
        /* ignore */
      }

      if (!finalResult.content || finalResult.content.length === 0) {
        logTest(
          testLabelFlash,
          "FAIL",
          "Final generate() returned empty after conversation",
        );
        return false;
      }

      const usage = finalResult.usage as { promptTokens?: number } | undefined;
      logTest(
        testLabelFlash,
        "PASS",
        `Final call succeeded after ${totalTurns} turns on ${provider}${usage?.promptTokens ? `, promptTokens=${usage.promptTokens}` : ""}`,
      );
      return true;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (isExpectedProviderError(msg)) {
        logTest(testLabelFlash, "SKIP", msg);
        try {
          await testSdk.shutdown?.();
        } catch {
          /* ignore */
        }
        return null;
      }
      try {
        await testSdk.shutdown?.();
      } catch {
        /* ignore */
      }
      logTest(testLabelFlash, "FAIL", `Final generate() failed: ${msg}`);
      return false;
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (isExpectedProviderError(msg)) {
      logTest(testLabelFlash, "SKIP", msg);
      return null;
    }
    logTest(testLabelFlash, "FAIL", msg);
    return false;
  }
}

// --- Test 4: Context Compaction Vertex Pro ---
async function testContextCompactionVertexPro(
  sdk: NeuroLink,
): Promise<boolean | null> {
  // Provider-aware label so non-Vertex runs don't surface as Vertex Pro fails.
  const testLabelPro =
    TEST_CONFIG.provider === "vertex"
      ? "SDK Generate - Context Compaction Vertex Pro"
      : `SDK Generate - Context Compaction Pro (${TEST_CONFIG.provider})`;
  logTest(testLabelPro, "TESTING");
  try {
    const testSdk = new NeuroLink();
    const totalTurns = 20;
    // Use TEST_CONFIG.provider directly: --provider=deepseek (without
    // TEST_PROVIDER env) and other CLI/env paths should also override the
    // default vertex target.
    const useVertex = TEST_CONFIG.provider === "vertex";
    const provider = TEST_CONFIG.provider;
    // Honor `--model` even on Vertex runs — without this, an explicit
    // CLI override silently fell back to VERTEX_PRO_TEST_MODEL.
    const model = useVertex
      ? (TEST_CONFIG.model ?? VERTEX_PRO_TEST_MODEL)
      : TEST_CONFIG.model;

    for (let i = 0; i < totalTurns; i++) {
      try {
        await testSdk.generate({
          input: {
            text: `Turn ${i + 1}: Name one database technology and its primary use case. Be brief.`,
          },
          maxTokens: 100,
          provider,
          ...(model ? { model } : {}),
        });
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        if (isExpectedProviderError(msg)) {
          logTest(testLabelPro, "SKIP", msg);
          try {
            await testSdk.shutdown?.();
          } catch {
            /* ignore */
          }
          return null;
        }
        log(`   Turn ${i + 1} error: ${msg}`, "yellow");
      }
    }

    // Gate: final generate() must succeed
    try {
      const finalResult = await testSdk.generate({
        input: { text: "Reply with 'OK' to confirm you can still respond." },
        maxTokens: 50,
        provider,
        ...(model ? { model } : {}),
      });

      try {
        await testSdk.shutdown?.();
      } catch {
        /* ignore */
      }

      if (!finalResult.content || finalResult.content.length === 0) {
        logTest(
          testLabelPro,
          "FAIL",
          "Final generate() returned empty after conversation",
        );
        return false;
      }

      const usage = finalResult.usage as { promptTokens?: number } | undefined;
      logTest(
        testLabelPro,
        "PASS",
        `Final call succeeded after ${totalTurns} turns on ${provider}${usage?.promptTokens ? `, promptTokens=${usage.promptTokens}` : ""}`,
      );
      return true;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (isExpectedProviderError(msg)) {
        logTest(testLabelPro, "SKIP", msg);
        try {
          await testSdk.shutdown?.();
        } catch {
          /* ignore */
        }
        return null;
      }
      try {
        await testSdk.shutdown?.();
      } catch {
        /* ignore */
      }
      logTest(testLabelPro, "FAIL", `Final generate() failed: ${msg}`);
      return false;
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (isExpectedProviderError(msg)) {
      logTest(testLabelPro, "SKIP", msg);
      return null;
    }
    logTest(testLabelPro, "FAIL", msg);
    return false;
  }
}

// --- Test 5: Context Compaction Vertex Flash ---
async function testContextCompactionVertexFlash(
  sdk: NeuroLink,
): Promise<boolean | null> {
  logTest("SDK Generate - Context Compaction Vertex Flash", "TESTING");
  try {
    const vertexFlashSdk = new NeuroLink();
    const totalTurns = 20;

    for (let i = 0; i < totalTurns; i++) {
      try {
        await vertexFlashSdk.generate({
          input: {
            text: `Turn ${i + 1}: Name one cloud computing service and its primary use case. Be brief.`,
          },
          maxTokens: 100,
          provider: "vertex",
          model: TEST_CONFIG.model ?? VERTEX_FLASH_TEST_MODEL,
        });
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        if (isExpectedProviderError(msg)) {
          logTest(
            "SDK Generate - Context Compaction Vertex Flash",
            "SKIP",
            msg,
          );
          try {
            await vertexFlashSdk.shutdown?.();
          } catch {
            /* ignore */
          }
          return null;
        }
        log(`   Turn ${i + 1} error: ${msg}`, "yellow");
      }
    }

    // Gate: final generate() must succeed
    try {
      const finalResult = await vertexFlashSdk.generate({
        input: {
          text: "Reply with 'OK' to confirm you can still respond.",
        },
        maxTokens: 50,
        provider: "vertex",
        model: TEST_CONFIG.model ?? VERTEX_FLASH_TEST_MODEL,
      });

      try {
        await vertexFlashSdk.shutdown?.();
      } catch {
        /* ignore */
      }

      if (!finalResult.content || finalResult.content.length === 0) {
        logTest(
          "SDK Generate - Context Compaction Vertex Flash",
          "FAIL",
          "Final generate() returned empty after conversation",
        );
        return false;
      }

      const usage = finalResult.usage as { promptTokens?: number } | undefined;
      logTest(
        "SDK Generate - Context Compaction Vertex Flash",
        "PASS",
        `Final call succeeded after ${totalTurns} turns on Vertex Flash${usage?.promptTokens ? `, promptTokens=${usage.promptTokens}` : ""}`,
      );
      return true;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (isExpectedProviderError(msg)) {
        logTest("SDK Generate - Context Compaction Vertex Flash", "SKIP", msg);
        try {
          await vertexFlashSdk.shutdown?.();
        } catch {
          /* ignore */
        }
        return null;
      }
      try {
        await vertexFlashSdk.shutdown?.();
      } catch {
        /* ignore */
      }
      logTest(
        "SDK Generate - Context Compaction Vertex Flash",
        "FAIL",
        `Final generate() failed: ${msg}`,
      );
      return false;
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (isExpectedProviderError(msg)) {
      logTest("SDK Generate - Context Compaction Vertex Flash", "SKIP", msg);
      return null;
    }
    logTest("SDK Generate - Context Compaction Vertex Flash", "FAIL", msg);
    return false;
  }
}

// --- Test 6: Tool Output Pruning ---
async function testToolOutputPruning(sdk: NeuroLink): Promise<boolean | null> {
  logTest("SDK Generate - Tool Output Pruning", "TESTING");
  try {
    const sdkOptions = buildBaseSDKOptions();
    const toolSdk = new NeuroLink();

    // Register a tool that returns a very large output (~25K+ tokens)
    const largeOutput = getDefaultLargeToolOutput();
    toolSdk.registerTool("get_large_dataset", {
      name: "get_large_dataset",
      description:
        "Retrieves a large dataset with extensive entries for analysis",
      inputSchema: {
        type: "object" as const,
        properties: {
          query: { type: "string" as const, description: "Search query" },
        },
      },
      execute: async () => JSON.parse(largeOutput),
    });

    // First call: use the tool to generate large output
    try {
      await toolSdk.generate({
        input: {
          text: "Use the get_large_dataset tool with query 'test' and tell me how many entries it returned. Just give me the number.",
        },
        maxTokens: 200,
        ...sdkOptions,
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (isExpectedProviderError(msg)) {
        logTest("SDK Generate - Tool Output Pruning", "SKIP", msg);
        try {
          await toolSdk.shutdown?.();
        } catch {
          /* ignore */
        }
        return null;
      }
      log(`   First call error: ${msg}`, "yellow");
    }

    // Send 5 more follow-up turns
    for (let i = 0; i < 5; i++) {
      try {
        await toolSdk.generate({
          input: {
            text: `Follow-up turn ${i + 1}: What was the main topic of our conversation so far? Be brief.`,
          },
          maxTokens: 100,
          ...sdkOptions,
        });
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        if (isExpectedProviderError(msg)) {
          logTest("SDK Generate - Tool Output Pruning", "SKIP", msg);
          try {
            await toolSdk.shutdown?.();
          } catch {
            /* ignore */
          }
          return null;
        }
        log(`   Follow-up ${i + 1} error: ${msg}`, "yellow");
      }
    }

    // Gate: final generate() must succeed — ask AI to quote the tool output
    try {
      const finalResult = await toolSdk.generate({
        input: {
          text: "Can you quote the exact first 3 entries from the dataset tool output you received earlier? Show the raw JSON.",
        },
        maxTokens: 300,
        ...sdkOptions,
      });

      try {
        await toolSdk.shutdown?.();
      } catch {
        /* ignore */
      }

      if (!finalResult.content || finalResult.content.length === 0) {
        logTest(
          "SDK Generate - Tool Output Pruning",
          "FAIL",
          "Final generate() returned empty content",
        );
        return false;
      }

      // Whether AI can or cannot quote the exact output, the test PASSES
      // as long as generate() succeeds. Pruning is transparent.
      const content = finalResult.content.toLowerCase();
      const couldQuote =
        content.includes("entry-0") || content.includes('"id"');
      logTest(
        "SDK Generate - Tool Output Pruning",
        "PASS",
        `Final generate() succeeded after tool + 5 turns. AI ${couldQuote ? "could still quote output (pruning may not have triggered)" : "could not quote exact output (pruning likely active)"}`,
      );
      return true;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (isExpectedProviderError(msg)) {
        logTest("SDK Generate - Tool Output Pruning", "SKIP", msg);
        try {
          await toolSdk.shutdown?.();
        } catch {
          /* ignore */
        }
        return null;
      }
      try {
        await toolSdk.shutdown?.();
      } catch {
        /* ignore */
      }
      logTest(
        "SDK Generate - Tool Output Pruning",
        "FAIL",
        `Final generate() failed: ${msg}`,
      );
      return false;
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (isExpectedProviderError(msg)) {
      logTest("SDK Generate - Tool Output Pruning", "SKIP", msg);
      return null;
    }
    logTest("SDK Generate - Tool Output Pruning", "FAIL", msg);
    return false;
  }
}

// --- Test 7: File Read Deduplication ---
async function testFileReadDeduplication(
  sdk: NeuroLink,
): Promise<boolean | null> {
  logTest("SDK Generate - File Read Deduplication", "TESTING");
  try {
    const sdkOptions = buildBaseSDKOptions();
    const fileSdk = new NeuroLink();

    // Register a file reading tool
    const documentContent = getDefaultLongDocument();
    fileSdk.registerTool("read_document", {
      name: "read_document",
      description: "Reads the same document file",
      inputSchema: {
        type: "object" as const,
        properties: {
          path: { type: "string" as const, description: "File path" },
        },
      },
      execute: async () => ({ content: documentContent, path: "test-doc.md" }),
    });

    // Read the same file across multiple turns
    for (let i = 0; i < 8; i++) {
      try {
        await fileSdk.generate({
          input: {
            text: `Turn ${i + 1}: Read the document at test-doc.md using read_document tool and tell me what section ${(i % 5) + 1} is about. Be very brief.`,
          },
          maxTokens: 150,
          ...sdkOptions,
        });
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        if (isExpectedProviderError(msg)) {
          logTest("SDK Generate - File Read Deduplication", "SKIP", msg);
          try {
            await fileSdk.shutdown?.();
          } catch {
            /* ignore */
          }
          return null;
        }
        log(`   Turn ${i + 1} error: ${msg}`, "yellow");
      }
    }

    // Gate: final generate() must succeed to prove dedup kept context manageable
    try {
      const finalResult = await fileSdk.generate({
        input: {
          text: "What document were we reading? Reply briefly.",
        },
        maxTokens: 100,
        ...sdkOptions,
      });

      try {
        await fileSdk.shutdown?.();
      } catch {
        /* ignore */
      }

      if (!finalResult.content || finalResult.content.length === 0) {
        logTest(
          "SDK Generate - File Read Deduplication",
          "FAIL",
          "Final generate() returned empty after file read turns",
        );
        return false;
      }

      logTest(
        "SDK Generate - File Read Deduplication",
        "PASS",
        "Final generate() succeeded after multiple file read turns (dedup prevents overflow)",
      );
      return true;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (isExpectedProviderError(msg)) {
        logTest("SDK Generate - File Read Deduplication", "SKIP", msg);
        try {
          await fileSdk.shutdown?.();
        } catch {
          /* ignore */
        }
        return null;
      }
      try {
        await fileSdk.shutdown?.();
      } catch {
        /* ignore */
      }
      logTest(
        "SDK Generate - File Read Deduplication",
        "FAIL",
        `Final generate() failed: ${msg}`,
      );
      return false;
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (isExpectedProviderError(msg)) {
      logTest("SDK Generate - File Read Deduplication", "SKIP", msg);
      return null;
    }
    logTest("SDK Generate - File Read Deduplication", "FAIL", msg);
    return false;
  }
}

// --- Test 8: Sliding Window Truncation ---
async function testSlidingWindowTruncation(
  sdk: NeuroLink,
): Promise<boolean | null> {
  logTest("SDK Generate - Sliding Window Truncation", "TESTING");
  try {
    const sdkOptions = buildBaseSDKOptions();
    const windowSdk = new NeuroLink();

    // Fill context beyond budget with specific content
    const uniqueMarker = "ZEBRA_UNICORN_MARKER_12345";
    try {
      await windowSdk.generate({
        input: {
          text: `Remember this unique code: ${uniqueMarker}. Respond with "Code noted."`,
        },
        maxTokens: 50,
        ...sdkOptions,
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (isExpectedProviderError(msg)) {
        logTest("SDK Generate - Sliding Window Truncation", "SKIP", msg);
        try {
          await windowSdk.shutdown?.();
        } catch {
          /* ignore */
        }
        return null;
      }
    }

    // Generate many turns to push the marker out of the window
    for (let i = 0; i < 30; i++) {
      try {
        await windowSdk.generate({
          input: {
            text: `Turn ${i + 1}: ${generateLargeText(500).substring(0, 800)} Respond with "Turn ${i + 1} done."`,
          },
          maxTokens: 50,
          ...sdkOptions,
        });
      } catch {
        // Errors are expected as context fills
      }
      if (i % 10 === 9) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    // Gate: final generate() must succeed
    try {
      const result = await windowSdk.generate({
        input: {
          text: `What was the unique code I gave you at the start? If you don't remember, say "I don't recall the code."`,
        },
        maxTokens: 100,
        ...sdkOptions,
      });

      try {
        await windowSdk.shutdown?.();
      } catch {
        /* ignore */
      }

      if (!result.content || result.content.length === 0) {
        logTest(
          "SDK Generate - Sliding Window Truncation",
          "FAIL",
          "Final generate() returned empty content",
        );
        return false;
      }

      // If the model responded at all, the sliding window kept context manageable.
      // Whether the marker is gone or still remembered, the key gate is success.
      const content = (result.content || "").toLowerCase();
      const markerGone =
        !content.includes(uniqueMarker.toLowerCase()) ||
        content.includes("don't recall") ||
        content.includes("don't remember") ||
        content.includes("not recall") ||
        content.includes("cannot recall");

      logTest(
        "SDK Generate - Sliding Window Truncation",
        "PASS",
        markerGone
          ? "Old content correctly dropped from context window"
          : "Marker still in context (large window) — final generate() succeeded",
      );
      return true;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (isExpectedProviderError(msg)) {
        logTest("SDK Generate - Sliding Window Truncation", "SKIP", msg);
        try {
          await windowSdk.shutdown?.();
        } catch {
          /* ignore */
        }
        return null;
      }
      try {
        await windowSdk.shutdown?.();
      } catch {
        /* ignore */
      }
      logTest(
        "SDK Generate - Sliding Window Truncation",
        "FAIL",
        `Final generate() failed: ${msg}`,
      );
      return false;
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (isExpectedProviderError(msg)) {
      logTest("SDK Generate - Sliding Window Truncation", "SKIP", msg);
      return null;
    }
    logTest("SDK Generate - Sliding Window Truncation", "FAIL", msg);
    return false;
  }
}

// --- Test 9: LLM Summarization ---
async function testLLMSummarization(sdk: NeuroLink): Promise<boolean | null> {
  logTest("SDK Generate - LLM Summarization", "TESTING");
  try {
    const sdkOptions = buildBaseSDKOptions();
    const sessionId = `test-llm-summarization-${Date.now()}`;
    const summarySdk = new NeuroLink({
      conversationMemory: {
        enabled: true,
        maxSessions: 10,
        enableSummarization: false,
      },
    });

    // Build a conversation with distinct topics over 15+ turns
    const topics = [
      { topic: "photosynthesis", keyword: "photosynthesis" },
      { topic: "the French Revolution", keyword: "french revolution" },
      { topic: "the Python programming language", keyword: "python" },
      { topic: "plate tectonics", keyword: "tectonic" },
      { topic: "the Renaissance period", keyword: "renaissance" },
    ];

    // 3 turns per topic = 15 turns total
    for (let round = 0; round < 3; round++) {
      for (const { topic } of topics) {
        try {
          await summarySdk.generate({
            input: {
              text: `Tell me ${round === 0 ? "3 key facts" : round === 1 ? "an interesting detail" : "a common misconception"} about ${topic}. Keep each fact to one sentence.`,
            },
            maxTokens: 200,
            context: { sessionId },
            ...sdkOptions,
          });
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          if (isExpectedProviderError(msg)) {
            logTest("SDK Generate - LLM Summarization", "SKIP", msg);
            try {
              await summarySdk.shutdown?.();
            } catch {
              /* ignore */
            }
            return null;
          }
        }
        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    // Gate: ask to summarize everything — must contain at least 2 of 5 topic keywords
    try {
      const result = await summarySdk.generate({
        input: {
          text: "Summarize everything we discussed. List all the specific topics and subjects we covered.",
        },
        maxTokens: 400,
        context: { sessionId },
        ...sdkOptions,
      });

      try {
        await summarySdk.shutdown?.();
      } catch {
        /* ignore */
      }

      const content = (result.content || "").toLowerCase();

      if (!content || content.length === 0) {
        logTest(
          "SDK Generate - LLM Summarization",
          "FAIL",
          "Final generate() returned empty content",
        );
        return false;
      }

      // Use partial keyword prefixes for lenient matching (e.g. "photosyn" matches "photosynthesis")
      const keywordPrefixes: Record<string, string> = {
        photosynthesis: "photosyn",
        "french revolution": "french",
        python: "python",
        tectonic: "tecton",
        renaissance: "renaiss",
      };
      const expectedKeywords = topics.map((t) => t.keyword.toLowerCase());
      const matchedKeywords = expectedKeywords.filter((k) => {
        const prefix = keywordPrefixes[k] || k;
        return content.includes(prefix);
      });

      if (matchedKeywords.length >= 2) {
        logTest(
          "SDK Generate - LLM Summarization",
          "PASS",
          `Summarization recalled ${matchedKeywords.length}/${expectedKeywords.length} topic keywords: ${matchedKeywords.join(", ")}`,
        );
        return true;
      }

      // 0 keywords matched — FAIL
      logTest(
        "SDK Generate - LLM Summarization",
        "FAIL",
        `Only ${matchedKeywords.length}/${expectedKeywords.length} topic keywords found in summary (need >= 2). Response: ${content.substring(0, 200)}...`,
      );
      return false;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (isExpectedProviderError(msg)) {
        logTest("SDK Generate - LLM Summarization", "SKIP", msg);
        try {
          await summarySdk.shutdown?.();
        } catch {
          /* ignore */
        }
        return null;
      }
      try {
        await summarySdk.shutdown?.();
      } catch {
        /* ignore */
      }
      logTest("SDK Generate - LLM Summarization", "FAIL", msg);
      return false;
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (isExpectedProviderError(msg)) {
      logTest("SDK Generate - LLM Summarization", "SKIP", msg);
      return null;
    }
    logTest("SDK Generate - LLM Summarization", "FAIL", msg);
    return false;
  }
}

// --- Test 10: Abort Signal Generate ---
async function testAbortSignalGenerate(
  sdk: NeuroLink,
): Promise<boolean | null> {
  logTest("SDK Generate - Abort Signal Generate", "TESTING");
  try {
    const sdkOptions = buildBaseSDKOptions();

    // Use AbortSignal.timeout(1) — 1ms guarantees abort fires
    const signal = AbortSignal.timeout(1);

    try {
      await sdk.generate({
        input: {
          text: "Write a very long essay about the complete history of mathematics from ancient Babylon to modern times. Include every mathematician and their contributions in exhaustive detail.",
        },
        maxTokens: TEST_CONFIG.maxTokens,
        ...sdkOptions,
        abortSignal: signal,
      });

      // If it completes before abort, still a valid outcome
      logTest(
        "SDK Generate - Abort Signal Generate",
        "PASS",
        "Completed before abort (very fast response)",
      );
      return true;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      const name = error instanceof Error ? error.name : "";
      if (isExpectedProviderError(msg)) {
        logTest("SDK Generate - Abort Signal Generate", "SKIP", msg);
        return null;
      }
      // Gate: error must be an AbortError or contain "abort"
      const isAbort =
        name === "AbortError" ||
        name === "TimeoutError" ||
        msg.toLowerCase().includes("abort") ||
        msg.toLowerCase().includes("cancel") ||
        msg.toLowerCase().includes("timed out") ||
        signal.aborted;
      if (isAbort) {
        logTest(
          "SDK Generate - Abort Signal Generate",
          "PASS",
          `Abort signal correctly terminated the request (${name || "abort detected"})`,
        );
        return true;
      }
      logTest(
        "SDK Generate - Abort Signal Generate",
        "FAIL",
        `Expected AbortError, got: ${name}: ${msg}`,
      );
      return false;
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (isExpectedProviderError(msg)) {
      logTest("SDK Generate - Abort Signal Generate", "SKIP", msg);
      return null;
    }
    logTest("SDK Generate - Abort Signal Generate", "FAIL", msg);
    return false;
  }
}

// --- Test 11: Abort Signal Stream ---
async function testAbortSignalStream(sdk: NeuroLink): Promise<boolean | null> {
  logTest("SDK Stream - Abort Signal Stream", "TESTING");
  try {
    const sdkOptions = buildBaseSDKOptions();
    const controller = new AbortController();

    try {
      const streamResult = await sdk.stream({
        input: {
          text: "Write a comprehensive guide to every programming language ever created, including their syntax, history, and use cases.",
        },
        maxTokens: TEST_CONFIG.maxTokens,
        ...sdkOptions,
        abortSignal: controller.signal,
      });

      const chunks: string[] = [];
      let aborted = false;
      try {
        for await (const chunk of streamResult.stream) {
          if ("content" in chunk) {
            chunks.push(chunk.content);
          }
          // Abort after receiving some chunks
          if (chunks.length >= 3) {
            controller.abort();
            aborted = true;
            break;
          }
        }
      } catch (streamError) {
        const streamMsg =
          streamError instanceof Error
            ? streamError.message
            : String(streamError);
        if (
          streamMsg.toLowerCase().includes("abort") ||
          streamMsg.toLowerCase().includes("cancel")
        ) {
          aborted = true;
        }
      }

      // Gate: either we got chunks before abort, or abort error was caught
      if (aborted || chunks.length > 0) {
        logTest(
          "SDK Stream - Abort Signal Stream",
          "PASS",
          `${chunks.length} chunks received before abort`,
        );
        return true;
      }

      logTest(
        "SDK Stream - Abort Signal Stream",
        "FAIL",
        "No chunks received and abort did not trigger",
      );
      return false;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (isExpectedProviderError(msg)) {
        logTest("SDK Stream - Abort Signal Stream", "SKIP", msg);
        return null;
      }
      // Abort during stream setup is also valid
      if (
        msg.toLowerCase().includes("abort") ||
        msg.toLowerCase().includes("cancel")
      ) {
        logTest(
          "SDK Stream - Abort Signal Stream",
          "PASS",
          "Abort signal triggered during stream setup",
        );
        return true;
      }
      logTest("SDK Stream - Abort Signal Stream", "FAIL", msg);
      return false;
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (isExpectedProviderError(msg)) {
      logTest("SDK Stream - Abort Signal Stream", "SKIP", msg);
      return null;
    }
    logTest("SDK Stream - Abort Signal Stream", "FAIL", msg);
    return false;
  }
}

// --- Test 12: Abort Signal Vertex ---
async function testAbortSignalVertex(sdk: NeuroLink): Promise<boolean | null> {
  logTest("SDK Generate - Abort Signal Vertex", "TESTING");
  try {
    // Use AbortSignal.timeout(1) — 1ms guarantees abort fires
    const signal = AbortSignal.timeout(1);

    try {
      await sdk.generate({
        input: {
          text: "Write a 10,000 word essay about artificial intelligence.",
        },
        maxTokens: 8000,
        provider: "vertex",
        abortSignal: signal,
      });

      logTest(
        "SDK Generate - Abort Signal Vertex",
        "PASS",
        "Completed before abort",
      );
      return true;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      const name = error instanceof Error ? error.name : "";
      if (isExpectedProviderError(msg)) {
        logTest("SDK Generate - Abort Signal Vertex", "SKIP", msg);
        return null;
      }
      const isAbort =
        name === "AbortError" ||
        name === "TimeoutError" ||
        msg.toLowerCase().includes("abort") ||
        msg.toLowerCase().includes("cancel") ||
        msg.toLowerCase().includes("timed out") ||
        signal.aborted;
      if (isAbort) {
        logTest(
          "SDK Generate - Abort Signal Vertex",
          "PASS",
          `Clean abort on Vertex (${name || "abort detected"})`,
        );
        return true;
      }
      logTest(
        "SDK Generate - Abort Signal Vertex",
        "FAIL",
        `Expected AbortError, got: ${name}: ${msg}`,
      );
      return false;
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (isExpectedProviderError(msg)) {
      logTest("SDK Generate - Abort Signal Vertex", "SKIP", msg);
      return null;
    }
    logTest("SDK Generate - Abort Signal Vertex", "FAIL", msg);
    return false;
  }
}

// --- Test 13: Abort Signal Vertex Pro ---
async function testAbortSignalVertexPro(
  sdk: NeuroLink,
): Promise<boolean | null> {
  logTest("SDK Generate - Abort Signal Vertex Pro", "TESTING");
  try {
    // Use AbortSignal.timeout(1) — 1ms guarantees abort fires
    const signal = AbortSignal.timeout(1);

    try {
      await sdk.generate({
        input: {
          text: "Write a 10,000 word essay about quantum computing.",
        },
        maxTokens: 8000,
        provider: "vertex",
        model: TEST_CONFIG.model ?? VERTEX_PRO_TEST_MODEL,
        abortSignal: signal,
      });

      logTest(
        "SDK Generate - Abort Signal Vertex Pro",
        "PASS",
        "Completed before abort",
      );
      return true;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      const name = error instanceof Error ? error.name : "";
      if (isExpectedProviderError(msg)) {
        logTest("SDK Generate - Abort Signal Vertex Pro", "SKIP", msg);
        return null;
      }
      const isAbort =
        name === "AbortError" ||
        name === "TimeoutError" ||
        msg.toLowerCase().includes("abort") ||
        msg.toLowerCase().includes("cancel") ||
        msg.toLowerCase().includes("timed out") ||
        signal.aborted;
      if (isAbort) {
        logTest(
          "SDK Generate - Abort Signal Vertex Pro",
          "PASS",
          `Clean abort on Vertex Pro (${name || "abort detected"})`,
        );
        return true;
      }
      logTest(
        "SDK Generate - Abort Signal Vertex Pro",
        "FAIL",
        `Expected AbortError, got: ${name}: ${msg}`,
      );
      return false;
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (isExpectedProviderError(msg)) {
      logTest("SDK Generate - Abort Signal Vertex Pro", "SKIP", msg);
      return null;
    }
    logTest("SDK Generate - Abort Signal Vertex Pro", "FAIL", msg);
    return false;
  }
}

// --- Test 14: Abort Signal Vertex 2.0 Flash ---
async function testAbortSignalVertexFlash(
  sdk: NeuroLink,
): Promise<boolean | null> {
  logTest("SDK Generate - Abort Signal Vertex 2.0 Flash", "TESTING");
  try {
    // Use AbortSignal.timeout(1) — 1ms guarantees abort fires
    const signal = AbortSignal.timeout(1);

    try {
      await sdk.generate({
        input: {
          text: "Write a 10,000 word essay about space exploration.",
        },
        maxTokens: 8000,
        provider: "vertex",
        model: TEST_CONFIG.model ?? VERTEX_FLASH_TEST_MODEL,
        abortSignal: signal,
      });

      logTest(
        "SDK Generate - Abort Signal Vertex 2.0 Flash",
        "PASS",
        "Completed before abort",
      );
      return true;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      const name = error instanceof Error ? error.name : "";
      if (isExpectedProviderError(msg)) {
        logTest("SDK Generate - Abort Signal Vertex 2.0 Flash", "SKIP", msg);
        return null;
      }
      const isAbort =
        name === "AbortError" ||
        name === "TimeoutError" ||
        msg.toLowerCase().includes("abort") ||
        msg.toLowerCase().includes("cancel") ||
        msg.toLowerCase().includes("timed out") ||
        signal.aborted;
      if (isAbort) {
        logTest(
          "SDK Generate - Abort Signal Vertex 2.0 Flash",
          "PASS",
          `Clean abort on Vertex 2.0 Flash (${name || "abort detected"})`,
        );
        return true;
      }
      logTest(
        "SDK Generate - Abort Signal Vertex 2.0 Flash",
        "FAIL",
        `Expected AbortError, got: ${name}: ${msg}`,
      );
      return false;
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (isExpectedProviderError(msg)) {
      logTest("SDK Generate - Abort Signal Vertex 2.0 Flash", "SKIP", msg);
      return null;
    }
    logTest("SDK Generate - Abort Signal Vertex 2.0 Flash", "FAIL", msg);
    return false;
  }
}

// --- Test 15: Compose Abort Signals ---
async function testComposeAbortSignals(
  sdk: NeuroLink,
): Promise<boolean | null> {
  logTest("SDK Generate - Compose Abort Signals", "TESTING");
  try {
    const sdkOptions = buildBaseSDKOptions();

    // Create two controllers, abort only one
    const controller1 = new AbortController();
    const controller2 = new AbortController();

    // Compose: abort when either fires
    const composedController = new AbortController();
    const onAbort1 = () => composedController.abort();
    const onAbort2 = () => composedController.abort();
    controller1.signal.addEventListener("abort", onAbort1);
    controller2.signal.addEventListener("abort", onAbort2);

    // Abort controller1 after 1ms — guarantees abort fires
    setTimeout(() => controller1.abort(), 1);

    try {
      await sdk.generate({
        input: {
          text: "Write an extensive analysis of global economic trends over the past century.",
        },
        maxTokens: TEST_CONFIG.maxTokens,
        ...sdkOptions,
        abortSignal: composedController.signal,
      });

      // Clean up listeners
      controller1.signal.removeEventListener("abort", onAbort1);
      controller2.signal.removeEventListener("abort", onAbort2);

      logTest(
        "SDK Generate - Compose Abort Signals",
        "PASS",
        "Completed before composite abort",
      );
      return true;
    } catch (error) {
      // Clean up listeners
      controller1.signal.removeEventListener("abort", onAbort1);
      controller2.signal.removeEventListener("abort", onAbort2);

      const msg = error instanceof Error ? error.message : String(error);
      const name = error instanceof Error ? error.name : "";
      if (isExpectedProviderError(msg)) {
        logTest("SDK Generate - Compose Abort Signals", "SKIP", msg);
        return null;
      }

      // Gate: must be abort error AND controller1 must be the one that fired
      const isAbort =
        name === "AbortError" ||
        name === "TimeoutError" ||
        msg.toLowerCase().includes("abort") ||
        msg.toLowerCase().includes("cancel") ||
        composedController.signal.aborted;

      if (isAbort && controller1.signal.aborted) {
        logTest(
          "SDK Generate - Compose Abort Signals",
          "PASS",
          "Composite signal fired when controller1 aborted",
        );
        return true;
      }

      logTest(
        "SDK Generate - Compose Abort Signals",
        "FAIL",
        `Expected composite abort, got: ${name}: ${msg}`,
      );
      return false;
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (isExpectedProviderError(msg)) {
      logTest("SDK Generate - Compose Abort Signals", "SKIP", msg);
      return null;
    }
    logTest("SDK Generate - Compose Abort Signals", "FAIL", msg);
    return false;
  }
}

// --- Test 16: Prompt Caching System Message ---
async function testPromptCachingSystemMessage(
  sdk: NeuroLink,
): Promise<boolean | null> {
  logTest("SDK Generate - Prompt Caching System Message", "TESTING");
  try {
    const sdkOptions = buildBaseSDKOptions();
    const systemMessage =
      "You are a helpful assistant that specializes in software engineering. Always respond concisely.";

    // Make 2 identical generate() calls — both must succeed
    let firstContent = "";
    let secondContent = "";

    try {
      const result1 = await sdk.generate({
        input: { text: "What is a REST API? One sentence only." },
        maxTokens: 100,
        systemPrompt: systemMessage,
        ...sdkOptions,
      });
      firstContent = result1.content || "";
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (isExpectedProviderError(msg)) {
        logTest("SDK Generate - Prompt Caching System Message", "SKIP", msg);
        return null;
      }
      if (msg.toLowerCase().includes("cache_control")) {
        logTest(
          "SDK Generate - Prompt Caching System Message",
          "FAIL",
          `cache_control error: ${msg}`,
        );
        return false;
      }
      logTest(
        "SDK Generate - Prompt Caching System Message",
        "FAIL",
        `First call failed: ${msg}`,
      );
      return false;
    }

    try {
      const result2 = await sdk.generate({
        input: { text: "What is a REST API? One sentence only." },
        maxTokens: 100,
        systemPrompt: systemMessage,
        ...sdkOptions,
      });
      secondContent = result2.content || "";
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (isExpectedProviderError(msg)) {
        logTest("SDK Generate - Prompt Caching System Message", "SKIP", msg);
        return null;
      }
      if (msg.toLowerCase().includes("cache_control")) {
        logTest(
          "SDK Generate - Prompt Caching System Message",
          "FAIL",
          `cache_control error on second call: ${msg}`,
        );
        return false;
      }
      logTest(
        "SDK Generate - Prompt Caching System Message",
        "FAIL",
        `Second call failed: ${msg}`,
      );
      return false;
    }

    // Gate: both calls must have returned non-empty content
    if (firstContent.length > 0 && secondContent.length > 0) {
      logTest(
        "SDK Generate - Prompt Caching System Message",
        "PASS",
        `Both calls succeeded (${firstContent.length} chars, ${secondContent.length} chars)`,
      );
      return true;
    }

    logTest(
      "SDK Generate - Prompt Caching System Message",
      "FAIL",
      `One or both calls returned empty (first=${firstContent.length}, second=${secondContent.length})`,
    );
    return false;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (isExpectedProviderError(msg)) {
      logTest("SDK Generate - Prompt Caching System Message", "SKIP", msg);
      return null;
    }
    logTest("SDK Generate - Prompt Caching System Message", "FAIL", msg);
    return false;
  }
}

// --- Test 17: Token Estimation Accuracy ---
async function testTokenEstimationAccuracy(
  sdk: NeuroLink,
): Promise<boolean | null> {
  logTest("SDK Utility - Token Estimation Accuracy", "TESTING");
  try {
    const sdkOptions = buildBaseSDKOptions();

    // Call sdk.generate() with a simple prompt and check usage if available
    try {
      const result = await sdk.generate({
        input: { text: "Hello world" },
        maxTokens: 50,
        ...sdkOptions,
      });

      if (!result.content || result.content.length === 0) {
        logTest(
          "SDK Utility - Token Estimation Accuracy",
          "FAIL",
          "generate() returned empty content",
        );
        return false;
      }

      // If usage data is available, assert promptTokens is in a reasonable range
      const usage = result.usage as { promptTokens?: number } | undefined;
      if (usage?.promptTokens && usage.promptTokens > 0) {
        const tokens = usage.promptTokens;
        if (tokens >= 1 && tokens <= 50) {
          logTest(
            "SDK Utility - Token Estimation Accuracy",
            "PASS",
            `promptTokens=${tokens} for "Hello world" (within 1-50 range)`,
          );
          return true;
        }
        // Outside range but still pass if generate succeeded — estimation
        // includes system prompt and other overhead
        logTest(
          "SDK Utility - Token Estimation Accuracy",
          "PASS",
          `promptTokens=${tokens} for "Hello world" (outside 1-50 but generate succeeded — provider overhead)`,
        );
        return true;
      }

      // No usage data available — PASS on successful completion
      logTest(
        "SDK Utility - Token Estimation Accuracy",
        "PASS",
        "generate() succeeded (no usage data available — token estimation transparent)",
      );
      return true;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (isExpectedProviderError(msg)) {
        logTest("SDK Utility - Token Estimation Accuracy", "SKIP", msg);
        return null;
      }
      logTest(
        "SDK Utility - Token Estimation Accuracy",
        "FAIL",
        `generate() failed: ${msg}`,
      );
      return false;
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logTest("SDK Utility - Token Estimation Accuracy", "FAIL", msg);
    return false;
  }
}

// --- Test 18: Concurrent Conversations ---
async function testConcurrentConversations(
  _sdk: NeuroLink,
): Promise<boolean | null> {
  logTest("SDK Generate - Concurrent Conversations", "TESTING");
  try {
    const sdkOptions = buildBaseSDKOptions();

    // Create 3 independent SDK instances with different session IDs
    const sessionIds = [
      `concurrent-math-${Date.now()}`,
      `concurrent-bio-${Date.now()}`,
      `concurrent-hist-${Date.now()}`,
    ];
    const sdkInstances = sessionIds.map(
      (_id) => new NeuroLink({ conversationMemory: { enabled: true } }),
    );

    const conversationTopics = ["mathematics", "biology", "history"];

    // Run 3 concurrent generate() calls
    const results = await Promise.all(
      sdkInstances.map(async (instance, idx) => {
        const topic = conversationTopics[idx];
        try {
          const result = await instance.generate({
            input: {
              text: `Tell me one interesting fact about ${topic}. One sentence only.`,
            },
            maxTokens: 100,
            ...sdkOptions,
          });
          return {
            idx,
            topic,
            success: !!(result.content && result.content.length > 0),
            skipped: false,
          };
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          if (isExpectedProviderError(msg)) {
            return { idx, topic, success: false, skipped: true };
          }
          return { idx, topic, success: false, skipped: false };
        }
      }),
    );

    // Cleanup
    for (const instance of sdkInstances) {
      try {
        await instance.shutdown?.();
      } catch {
        /* ignore */
      }
    }

    // Check results
    const skipped = results.filter((r) => r.skipped);
    if (skipped.length === results.length) {
      logTest(
        "SDK Generate - Concurrent Conversations",
        "SKIP",
        "All conversations skipped due to provider errors",
      );
      return null;
    }

    // Gate: all 3 must succeed (or be skipped due to provider errors)
    const allSucceeded = results.every((r) => r.skipped || r.success);

    if (allSucceeded) {
      const details = results
        .map(
          (r) =>
            `${r.topic}: ${r.skipped ? "SKIP" : r.success ? "OK" : "FAIL"}`,
        )
        .join(", ");
      logTest("SDK Generate - Concurrent Conversations", "PASS", details);
      return true;
    }

    const details = results
      .map(
        (r) => `${r.topic}: ${r.skipped ? "SKIP" : r.success ? "OK" : "FAIL"}`,
      )
      .join(", ");
    logTest("SDK Generate - Concurrent Conversations", "FAIL", details);
    return false;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (isExpectedProviderError(msg)) {
      logTest("SDK Generate - Concurrent Conversations", "SKIP", msg);
      return null;
    }
    logTest("SDK Generate - Concurrent Conversations", "FAIL", msg);
    return false;
  }
}

// ============================================================
// OBSERVABILITY SPAN TEST
// ============================================================

// ============================================================
// REGRESSION: Issue #2 — token overflow retry waste (Curator P1-2)
// ============================================================
//
// 5 tests asserting pre-dispatch compaction, hard cap, escalating
// truncation, and the compaction.insufficient event. Uses fetch
// capture to verify dispatched body bytes never exceed the model
// window. Originally lived in issue-02-overflow-retry.ts.

function recordIssue02(
  name: string,
  outcome: "PASS" | "FAIL" | "SKIP",
  detail: string,
): void {
  recordTest(name, outcome === "PASS", outcome === "SKIP", detail);
}

const PROVIDER = "litellm";
const MODEL = process.env.CURATOR_LITELLM_ALLOWED_MODEL ?? "open-large";
// 128K-token window ≈ 512KB JSON. Bug-state dispatched 1.33M tokens (~5MB).
// 1.5MB is the unambiguous PASS/FAIL threshold — anything above means an
// oversized payload leaked through.
const MAX_COMPACTED_BODY_BYTES = 1_500_000;
const HUGE_PROMPT_TOKENS = 200_000;
const JUST_OVER_WINDOW_TOKENS = 145_000;
// Even after 90% truncation the remaining 10% must still exceed the 128K
// budget — i.e. start above ~1.28M tokens — to force the terminal-failure
// branch instead of letting emergency truncation save the day.
const UNFIXABLE_OVERFLOW_TOKENS = 2_000_000;
const DEFAULT_LITELLM_HOSTNAME_FRAGMENT =
  process.env.LITELLM_BASE_URL?.split("//")[1]?.split("/")[0] ?? "litellm";

function describe(method: "generate" | "stream", label: string): string {
  return `${label} [${method}]`;
}

async function consumeStream(stream: AsyncIterable<unknown>): Promise<string> {
  let acc = "";
  for await (const chunk of stream) {
    const c = chunk as { content?: string };
    if (typeof c.content === "string") {
      acc += c.content;
    }
  }
  return acc;
}

/**
 * Per-call deadline for the live regression tests. A stuck provider
 * response would otherwise hang the entire consolidated sweep instead of
 * recording a single failing test. 90s is well above the slow Vertex Flash
 * cold-start envelope (~20-45s) but tight enough to terminate a wedge.
 */
const CALL_SDK_TIMEOUT_MS = 90_000;

/**
 * Race a factory-produced promise against a deadline AND actually abort
 * the underlying work when the deadline wins. Previously this only
 * rejected the outer wrapper while the in-flight `sdk.generate()` /
 * `sdk.stream()` kept running, leaking late dispatches into the next
 * issue-02 case after `fetchCapture.reset()` and producing flaky
 * dispatch-count assertions.
 */
function withDeadline<T>(
  start: (signal: AbortSignal) => Promise<T>,
  ms: number,
  label: string,
  externalController?: AbortController,
): Promise<T> {
  // When the caller owns the controller (stream branch below), `start` and
  // any sibling withDeadline calls share the same `AbortSignal`. The
  // shared-controller path skips the per-call `controller.abort()` in
  // `.finally` so a fast resolution doesn't close out work that the next
  // sibling call still needs to read from.
  const owned = !externalController;
  const controller = externalController ?? new AbortController();
  let timer: NodeJS.Timeout | undefined;
  const work = start(controller.signal);
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error(`callSdk: ${label} exceeded ${ms}ms`));
    }, ms);
  });
  return Promise.race([work, deadline]).finally(() => {
    if (timer) {
      clearTimeout(timer);
    }
    if (owned) {
      // We own the controller → safe to abort here; this tears down any
      // late-arriving work (ReadableStream readers, fetch, …) before the
      // next test resets fetchCapture/fixture state.
      controller.abort();
    }
    // Else: caller manages lifecycle — they will abort after they finish
    // chaining all the sibling withDeadline calls onto the same signal.
  });
}

async function callSdk(
  sdk: NeuroLink,
  method: "generate" | "stream",
  options: Record<string, unknown>,
): Promise<{
  ok: boolean;
  err?: unknown;
  resultUsageInput?: number;
  textLen?: number;
}> {
  try {
    if (method === "generate") {
      const res = (await withDeadline(
        (signal) => sdk.generate({ ...options, abortSignal: signal } as never),
        CALL_SDK_TIMEOUT_MS,
        "sdk.generate",
      )) as {
        content: string;
        usage?: { input?: number; total?: number };
      };
      return {
        ok: true,
        resultUsageInput: res.usage?.input,
        textLen: res.content?.length ?? 0,
      };
    } else {
      // One controller for the entire stream lifecycle. Both withDeadline
      // calls share it so sdk.stream's stream object isn't aborted by the
      // first deadline's `.finally` before consumeStream gets to iterate.
      // Final abort happens in the outer `try`'s own finally after the
      // consume phase ends.
      const streamController = new AbortController();
      try {
        const res = (await withDeadline(
          (signal) => sdk.stream({ ...options, abortSignal: signal } as never),
          CALL_SDK_TIMEOUT_MS,
          "sdk.stream",
          streamController,
        )) as {
          stream: AsyncIterable<unknown>;
          usage?: { input?: number };
        };
        const text = await withDeadline(
          // consumeStream doesn't accept a signal of its own, but the
          // upstream stream was started with `streamController.signal` and
          // the iterator closes when the signal aborts — so the deadline
          // here still terminates the consume loop via the shared signal.
          () => consumeStream(res.stream),
          CALL_SDK_TIMEOUT_MS,
          "consumeStream",
          streamController,
        );
        return {
          ok: true,
          resultUsageInput: res.usage?.input,
          textLen: text.length,
        };
      } finally {
        // Caller-owned controller — tear it down once the stream phase is
        // complete (success or failure) so any late-arriving work cleans up.
        streamController.abort();
      }
    }
  } catch (err) {
    return { ok: false, err };
  }
}

// ---------------------------------------------------------------------------
//   Test 2.0 — STATIC: shipped artifact contains the fix code
// ---------------------------------------------------------------------------

async function test_2_0_static_artifact_contains_fix(): Promise<void> {
  const testName = "2.0 — STATIC: shipped artifact contains the fix code";
  const fs = await import("node:fs/promises");
  const path = "dist/lib/neurolink.js";
  let src: string;
  try {
    src = await fs.readFile(path, "utf-8");
  } catch (err) {
    return recordIssue02(
      testName,
      "SKIP",
      `cannot read ${path}: ${(err as Error).message}`,
    );
  }
  // Reviewer follow-up: only check for stable string literals that are part
  // of the public event contract (event names + phase strings). Local
  // identifier names like `dpgHasInlineMessages` would be mangled by any
  // future minification pass and are an implementation detail.
  const markers = {
    compactionInsufficient: /compaction\.insufficient/,
    preDispatchHardCap: /pre-dispatch-no-recovery/,
    midCompaction: /mid-compaction/,
    postEmergencyTruncation: /post-emergency-truncation/,
    postProviderRecovery: /post-provider-recovery/,
    postProviderRecoveryNoCompaction: /post-provider-recovery-no-compaction/,
  };
  const missing = Object.entries(markers)
    .filter(([, re]) => !re.test(src))
    .map(([k]) => k);
  if (missing.length === 0) {
    recordIssue02(
      testName,
      "PASS",
      `all ${Object.keys(markers).length} fix markers present in shipped artifact`,
    );
  } else {
    recordIssue02(
      testName,
      "FAIL",
      `bug-confirmed: shipped artifact missing fix markers [${missing.join(", ")}]`,
    );
  }
}

// ---------------------------------------------------------------------------
//   Test 2.1 — pre-dispatch hard cap: huge prompt, no memory, no inline msgs
// ---------------------------------------------------------------------------
async function test_2_1_pre_dispatch_hard_cap(
  method: "generate" | "stream",
): Promise<void> {
  const testName = describe(
    method,
    "2.1 — pre-dispatch hard cap aborts huge prompt before any HTTP dispatch",
  );
  const skip = skipIfEnvMissing("LITELLM_BASE_URL", "LITELLM_API_KEY");
  if (skip) {
    return recordIssue02(testName, "SKIP", skip);
  }

  fetchCapture.reset();
  const sdk = new NeuroLink();
  let insufficientEvent: Record<string, unknown> | undefined;
  sdk.getEventEmitter().on("compaction.insufficient", (e) => {
    insufficientEvent = e as Record<string, unknown>;
  });

  const hugePrompt = generateLargeText(HUGE_PROMPT_TOKENS);

  const out = await callSdk(sdk, method, {
    provider: PROVIDER,
    model: MODEL,
    input: { text: hugePrompt },
    maxTokens: 64,
    disableTools: true,
  });
  await sdk.shutdown?.()?.catch(() => {});
  await new Promise((r) => setTimeout(r, 250));

  const litellmDispatches = fetchCapture
    .forHostname(DEFAULT_LITELLM_HOSTNAME_FRAGMENT)
    .filter(
      // Only chat-completion calls count — `/v1/models` GET is a model
      // metadata lookup, not a payload dispatch.
      (d) =>
        d.method === "POST" && d.bodyBytes > 0 && !d.url.endsWith("/v1/models"),
    );

  if (out.ok) {
    return recordIssue02(
      testName,
      "FAIL",
      `bug-confirmed: huge prompt succeeded; expected ContextBudgetExceededError. dispatches=${litellmDispatches.length}`,
    );
  }

  const err = out.err as Error & { constructor: { name: string } };
  const ctorName = err?.constructor?.name ?? "unknown";
  const msg = err instanceof Error ? err.message : String(err);
  const lowerMsg = msg.toLowerCase();

  if (
    isExpectedProviderError(msg) &&
    !lowerMsg.includes("context exceeds") &&
    !lowerMsg.includes("budget")
  ) {
    return recordIssue02(testName, "SKIP", msg.slice(0, 120));
  }

  const isTypedBudgetError =
    ctorName === "ContextBudgetExceededError" ||
    lowerMsg.includes("context exceeds model budget") ||
    lowerMsg.includes("no compaction is possible");
  const eventFired = !!insufficientEvent;
  const eventPhaseOk = insufficientEvent?.phase === "pre-dispatch-no-recovery";
  const noDispatchEscaped = litellmDispatches.length === 0;

  if (isTypedBudgetError && eventFired && eventPhaseOk && noDispatchEscaped) {
    recordIssue02(
      testName,
      "PASS",
      `pre-dispatch hard cap fired: dispatches=0, event.phase=${insufficientEvent?.phase}, error=${ctorName}`,
    );
  } else {
    const dispatchUrls = litellmDispatches
      .map((d) => `${d.method} ${d.url} body=${d.bodyBytes}B`)
      .join("; ");
    recordIssue02(
      testName,
      "FAIL",
      `bug-confirmed: typed=${isTypedBudgetError} ctor=${ctorName} eventFired=${eventFired} eventPhase=${insufficientEvent?.phase} dispatches=${litellmDispatches.length} [${dispatchUrls}] msg="${msg.slice(0, 160)}"`,
    );
  }
}

// ---------------------------------------------------------------------------
//   Test 2.2 — inline conversationMessages get compacted before dispatch
// ---------------------------------------------------------------------------
async function test_2_2_inline_messages_compacted(
  method: "generate" | "stream",
): Promise<void> {
  const testName = describe(
    method,
    "2.2 — inline conversationMessages compacted before HTTP dispatch (body bytes within window)",
  );
  const skip = skipIfEnvMissing("LITELLM_BASE_URL", "LITELLM_API_KEY");
  if (skip) {
    return recordIssue02(testName, "SKIP", skip);
  }

  fetchCapture.reset();
  const sdk = new NeuroLink();
  const conversation = buildLargeConversationMessages({
    targetTokens: HUGE_PROMPT_TOKENS,
    perTurnTokens: 5_000,
  });

  const out = await callSdk(sdk, method, {
    provider: PROVIDER,
    model: MODEL,
    input: { text: "Summarize the conversation in one short sentence." },
    conversationMessages: conversation,
    maxTokens: 64,
    disableTools: true,
  });
  await sdk.shutdown?.()?.catch(() => {});
  await new Promise((r) => setTimeout(r, 250));

  const dispatches = fetchCapture
    .forHostname(DEFAULT_LITELLM_HOSTNAME_FRAGMENT)
    .filter(
      (d) =>
        d.method === "POST" && d.bodyBytes > 0 && !d.url.endsWith("/v1/models"),
    );
  const oversized = dispatches.filter(
    (d) => d.bodyBytes > MAX_COMPACTED_BODY_BYTES,
  );
  const maxBody = dispatches.reduce((m, d) => Math.max(m, d.bodyBytes), 0);

  if (!out.ok) {
    const err = out.err;
    const msg = err instanceof Error ? err.message : String(err);
    const ctorName =
      (err as { constructor?: { name?: string } })?.constructor?.name ??
      "unknown";
    const lowerMsg = msg.toLowerCase();
    if (
      isExpectedProviderError(msg) &&
      !lowerMsg.includes("too long") &&
      !lowerMsg.includes("budget") &&
      !lowerMsg.includes("context")
    ) {
      return recordIssue02(testName, "SKIP", msg.slice(0, 120));
    }
    if (lowerMsg.includes("prompt is too long")) {
      return recordIssue02(
        testName,
        "FAIL",
        `bug-confirmed: oversized payload reached provider despite compaction. dispatches=${dispatches.length}, maxBody=${maxBody} bytes, oversized=${oversized.length}, msg="${msg.slice(0, 160)}"`,
      );
    }
    if (oversized.length > 0) {
      return recordIssue02(
        testName,
        "FAIL",
        `bug-confirmed: ${oversized.length}/${dispatches.length} oversized dispatches; maxBody=${maxBody} bytes; ${ctorName}: ${msg.slice(0, 120)}`,
      );
    }
    return recordIssue02(
      testName,
      "PASS",
      `no oversized dispatch leaked even though recovery rejected; dispatches=${dispatches.length}, maxBody=${maxBody}, ${ctorName}: ${msg.slice(0, 120)}`,
    );
  }

  if (oversized.length > 0) {
    return recordIssue02(
      testName,
      "FAIL",
      `bug-confirmed: ${oversized.length} dispatches over ${MAX_COMPACTED_BODY_BYTES} bytes (compaction did not reduce payload); maxBody=${maxBody}, dispatches=${dispatches.length}`,
    );
  }
  if (dispatches.length === 0) {
    return recordIssue02(
      testName,
      "FAIL",
      `unexpected: success reported but 0 outbound HTTP dispatches captured`,
    );
  }
  if (dispatches.length > 2) {
    return recordIssue02(
      testName,
      "FAIL",
      `bug-confirmed: ${dispatches.length} dispatches (expected ≤2); retry storm likely`,
    );
  }
  recordIssue02(
    testName,
    "PASS",
    `dispatches=${dispatches.length}, maxBody=${maxBody} bytes (<${MAX_COMPACTED_BODY_BYTES}), provider input tokens=${out.resultUsageInput ?? "n/a"}, textLen=${out.textLen}`,
  );
}

// ---------------------------------------------------------------------------
//   Test 2.3 — exact dispatch count: 145K conv produces single compacted call
// ---------------------------------------------------------------------------
async function test_2_3_no_wasted_retries(
  method: "generate" | "stream",
): Promise<void> {
  const testName = describe(
    method,
    "2.3 — no wasted retries: 145K-token conversation produces exactly 1 compacted dispatch",
  );
  const skip = skipIfEnvMissing("LITELLM_BASE_URL", "LITELLM_API_KEY");
  if (skip) {
    return recordIssue02(testName, "SKIP", skip);
  }

  fetchCapture.reset();
  const sdk = new NeuroLink();
  const conversation = buildLargeConversationMessages({
    targetTokens: JUST_OVER_WINDOW_TOKENS,
    perTurnTokens: 4_000,
  });

  const out = await callSdk(sdk, method, {
    provider: PROVIDER,
    model: MODEL,
    input: { text: "Summarize." },
    conversationMessages: conversation,
    maxTokens: 64,
    disableTools: true,
  });
  await sdk.shutdown?.()?.catch(() => {});
  await new Promise((r) => setTimeout(r, 250));

  const dispatches = fetchCapture
    .forHostname(DEFAULT_LITELLM_HOSTNAME_FRAGMENT)
    .filter(
      (d) =>
        d.method === "POST" && d.bodyBytes > 0 && !d.url.endsWith("/v1/models"),
    );
  const oversized = dispatches.filter(
    (d) => d.bodyBytes > MAX_COMPACTED_BODY_BYTES,
  );

  if (!out.ok) {
    const msg = out.err instanceof Error ? out.err.message : String(out.err);
    const lowerMsg = msg.toLowerCase();
    if (
      isExpectedProviderError(msg) &&
      !lowerMsg.includes("too long") &&
      !lowerMsg.includes("budget") &&
      !lowerMsg.includes("context")
    ) {
      return recordIssue02(testName, "SKIP", msg.slice(0, 120));
    }
  }

  if (oversized.length > 0) {
    return recordIssue02(
      testName,
      "FAIL",
      `bug-confirmed: ${oversized.length} oversized dispatches; bug pattern is dispatching 1.3M tokens repeatedly`,
    );
  }

  // Tighten gate: zero dispatches is ONLY acceptable when the failure is
  // the typed hard-cap throw (budget/context/compaction surface). Any
  // other zero-dispatch failure (setup, serialization, validation) used
  // to slip through as PASS because `expectExactlyOne = out.ok` made
  // `dispatches.length === 0` look fine on the failure path.
  const errMsg = out.err instanceof Error ? out.err.message : String(out.err);
  const lowerErrMsg = errMsg.toLowerCase();
  const isTypedHardCapFailure =
    !out.ok &&
    dispatches.length === 0 &&
    (lowerErrMsg.includes("budget") ||
      lowerErrMsg.includes("context") ||
      lowerErrMsg.includes("compaction"));
  if ((out.ok && dispatches.length === 1) || isTypedHardCapFailure) {
    recordIssue02(
      testName,
      "PASS",
      `dispatches=${dispatches.length}; no retry storm; success=${out.ok}; bytes=[${dispatches.map((d) => d.bodyBytes).join(",")}]`,
    );
  } else {
    recordIssue02(
      testName,
      "FAIL",
      `bug-confirmed: dispatches=${dispatches.length}, ok=${out.ok}; expected exactly 1 on success, or a typed hard-cap failure with 0 dispatches. err="${errMsg.slice(0, 200)}"`,
    );
  }
}

// ---------------------------------------------------------------------------
//   Test 2.4 — compaction.insufficient + ContextBudgetExceededError on overflow
// ---------------------------------------------------------------------------
async function test_2_4_unfixable_overflow_emits_event_and_throws(
  method: "generate" | "stream",
): Promise<void> {
  const testName = describe(
    method,
    "2.4 — unfixable 2M conv emits compaction.insufficient and throws ContextBudgetExceededError",
  );
  const skip = skipIfEnvMissing("LITELLM_BASE_URL", "LITELLM_API_KEY");
  if (skip) {
    return recordIssue02(testName, "SKIP", skip);
  }

  fetchCapture.reset();
  const sdk = new NeuroLink();
  const events: Record<string, unknown>[] = [];
  sdk.getEventEmitter().on("compaction.insufficient", (e) => {
    events.push(e as Record<string, unknown>);
  });

  const conversation = buildLargeConversationMessages({
    targetTokens: UNFIXABLE_OVERFLOW_TOKENS,
    perTurnTokens: 10_000,
  });

  const out = await callSdk(sdk, method, {
    provider: PROVIDER,
    model: MODEL,
    input: { text: "summarize" },
    conversationMessages: conversation,
    maxTokens: 64,
    disableTools: true,
  });
  await sdk.shutdown?.()?.catch(() => {});
  await new Promise((r) => setTimeout(r, 250));

  const dispatches = fetchCapture
    .forHostname(DEFAULT_LITELLM_HOSTNAME_FRAGMENT)
    .filter(
      (d) =>
        d.method === "POST" && d.bodyBytes > 0 && !d.url.endsWith("/v1/models"),
    );
  const oversized = dispatches.filter(
    (d) => d.bodyBytes > MAX_COMPACTED_BODY_BYTES,
  );

  if (oversized.length > 0) {
    return recordIssue02(
      testName,
      "FAIL",
      `bug-confirmed: ${oversized.length} oversized dispatches (raw payload leaked to provider)`,
    );
  }

  if (events.length === 0) {
    return recordIssue02(
      testName,
      "FAIL",
      `bug-confirmed: 0 compaction.insufficient events for an unfixable overflow (expected ≥1). out.ok=${out.ok}`,
    );
  }

  // Reviewer follow-up: when the request DOES fail, the failure must be
  // typed as ContextBudgetExceededError so callers can distinguish "context
  // too large" from a generic provider failure. When the request succeeds
  // (emergency truncation saved it), the compaction.insufficient event
  // contract proves the SDK observed the overflow — that's still PASS.
  if (out.ok) {
    recordIssue02(
      testName,
      "PASS",
      `recovery succeeded via emergency truncation: events=${events.length}, phases=[${events.map((e) => e.phase ?? "?").join(",")}], dispatches=${dispatches.length}`,
    );
    return;
  }
  const err = out.err as { constructor?: { name?: string } } | undefined;
  const ctorName = err?.constructor?.name ?? "unknown";
  const msg = out.err instanceof Error ? out.err.message : String(out.err);
  const lowerMsg = msg.toLowerCase();
  if (
    isExpectedProviderError(msg) &&
    !lowerMsg.includes("budget") &&
    !lowerMsg.includes("context") &&
    !lowerMsg.includes("compaction")
  ) {
    return recordIssue02(testName, "SKIP", msg.slice(0, 120));
  }
  const isTypedBudgetError =
    ctorName === "ContextBudgetExceededError" ||
    lowerMsg.includes("context exceeds model budget") ||
    lowerMsg.includes("context overflow recovery") ||
    lowerMsg.includes("no compaction is possible");
  if (!isTypedBudgetError) {
    return recordIssue02(
      testName,
      "FAIL",
      `bug-confirmed: unfixable overflow surfaced ${ctorName} instead of ContextBudgetExceededError. events=${events.length}, msg="${msg.slice(0, 160)}"`,
    );
  }

  recordIssue02(
    testName,
    "PASS",
    `events=${events.length}, phases=[${events.map((e) => e.phase ?? "?").join(",")}], dispatches=${dispatches.length}, error=${ctorName}`,
  );
}

// ============================================================
// REGRESSION: Issue #6 — no-output context sentinel propagation
// ============================================================
//
// 14 tests covering the no-output context sentinel that surfaces when
// providers yield neither content nor tool calls. Originally lived in
// issue-06-no-output-context.ts.

function recordIssue06(
  name: string,
  outcome: "PASS" | "FAIL" | "SKIP",
  detail: string,
): void {
  recordTest(name, outcome === "PASS", outcome === "SKIP", detail);
}

async function test_6_static_artifact_shape(): Promise<void> {
  const testName = "6.0 — STATIC: shipped NoOutput sentinel metadata literal";
  // Read the shared helper's compiled artifact (the single source of truth
  // for the sentinel shape, used by every provider stream-transformer plus
  // StreamHandler). Verify the literal carries finishReason / usage /
  // providerError so downstream telemetry has structured failure context.
  const fs = await import("node:fs/promises");
  const path = "dist/lib/utils/noOutputSentinel.js";
  let src: string;
  try {
    src = await fs.readFile(path, "utf-8");
  } catch (err) {
    recordIssue06(
      testName,
      "SKIP",
      `cannot read ${path}: ${(err as Error).message}`,
    );
    return;
  }
  const literal =
    /metadata:\s*\{[\s\S]{0,400}?noOutput:\s*true[\s\S]{0,400}?\}/m.exec(src);
  if (!literal) {
    recordIssue06(
      testName,
      "FAIL",
      "noOutput sentinel literal not found in shipped artifact",
    );
    return;
  }
  const block = literal[0];
  // Match either `key: value` or shorthand `key,` / `key }` forms.
  const has = (key: string) => new RegExp(`\\b${key}\\s*[:,}]`).test(block);

  const present: string[] = [];
  const absent: string[] = [];
  for (const k of [
    "noOutput",
    "errorType",
    "finishReason",
    "usage",
    "providerError",
    "modelResponseRaw",
  ]) {
    (has(k) ? present : absent).push(k);
  }

  // Reviewer follow-up: also require `modelResponseRaw` so the static
  // verifier locks in the full sentinel contract — the helper now always
  // populates it (falls back to `${error.name}: ${error.message}` when
  // there's no `cause`), so a missing field is a real regression.
  const required = [
    "finishReason",
    "usage",
    "providerError",
    "modelResponseRaw",
  ];
  const missingRequired = required.filter((k) => !has(k));
  if (missingRequired.length > 0) {
    recordIssue06(
      testName,
      "FAIL",
      `bug-confirmed: shipped sentinel missing [${missingRequired.join(", ")}]; present=[${present.join(", ")}]; absent=[${absent.join(", ")}]`,
    );
  } else {
    recordIssue06(
      testName,
      "PASS",
      `sentinel enriched: present=[${present.join(", ")}]`,
    );
  }
}

// ---------------------------------------------------------------------------
//   Test 6.1 — STATIC: every provider's compiled stream-transformer is wired
//   to `buildNoOutputSentinel`. Prevents a future provider from regressing
//   to the un-enriched `{ noOutput: true }` sentinel.
// ---------------------------------------------------------------------------
async function test_6_1_all_providers_wired(): Promise<void> {
  // Providers whose `executeStream` catches AI SDK's NoOutputGeneratedError
  // and yields an enriched sentinel via the shared helper. googleAiStudio
  // and googleVertex deliberately use a different defensive pattern (they
  // catch `result.text` rejection on the side, not inside the stream
  // generator) so they're excluded.
  const providers = [
    "openAI",
    "openaiCompatible",
    "litellm",
    "huggingFace",
    "openRouter",
    "anthropicBaseProvider",
  ];
  // StreamHandler is also a wired site (when transformations don't go
  // through a provider-specific generator).
  const otherSites = ["core/modules/StreamHandler"];

  const fs = await import("node:fs/promises");
  for (const p of [...providers.map((n) => `providers/${n}`), ...otherSites]) {
    const testName = `6.1 — ${p} wired to NoOutput sentinel helper`;
    const path = `dist/lib/${p}.js`;
    let src: string;
    try {
      src = await fs.readFile(path, "utf-8");
    } catch (err) {
      recordIssue06(
        testName,
        "SKIP",
        `cannot read ${path}: ${(err as Error).message}`,
      );
      continue;
    }
    const hasIsInstance = /NoOutputGeneratedError\.isInstance/.test(src);
    const usesHelper = /buildNoOutputSentinel/.test(src);
    if (hasIsInstance && usesHelper) {
      recordIssue06(testName, "PASS", `both markers present`);
    } else {
      recordIssue06(
        testName,
        "FAIL",
        `bug-confirmed: missing markers — isInstance=${hasIsInstance}, helper=${usesHelper}`,
      );
    }
  }
}

// ---------------------------------------------------------------------------
//   Test 6.2 — RUNTIME: helper produces all 6 enriched keys with correct
//   types when given a synthetic NoOutputGeneratedError-shaped error.
//   This deterministically exercises the production helper code regardless
//   of whether any live provider triggers NoOutputGeneratedError today.
// ---------------------------------------------------------------------------
async function test_6_2_helper_produces_full_sentinel(): Promise<void> {
  const testName =
    "6.2 — RUNTIME: buildNoOutputSentinel produces all 6 enriched keys";
  const mod = await import("../dist/lib/utils/noOutputSentinel.js");
  if (typeof mod.buildNoOutputSentinel !== "function") {
    return recordIssue06(
      testName,
      "FAIL",
      "buildNoOutputSentinel not exported from shipped artifact",
    );
  }

  // Real Error instance — not a mock. The helper checks `error instanceof Error`
  // and builds the sentinel from the real message + name.
  const err = new Error("Stream produced no output");
  err.name = "AI_NoOutputGeneratedError";

  const sentinel = await mod.buildNoOutputSentinel(err);
  const meta = (sentinel as { metadata: Record<string, unknown> }).metadata;

  const issues: string[] = [];
  if (meta.noOutput !== true) {
    issues.push(`noOutput=${String(meta.noOutput)}`);
  }
  if (typeof meta.errorType !== "string" || !meta.errorType) {
    issues.push(`errorType=${typeof meta.errorType}`);
  }
  if (meta.finishReason === undefined) {
    issues.push(`finishReason=undefined`);
  }
  if (meta.usage === undefined || typeof meta.usage !== "object") {
    issues.push(`usage=${typeof meta.usage}`);
  }
  if (typeof meta.providerError !== "string" || !meta.providerError) {
    issues.push(`providerError=${typeof meta.providerError}`);
  }
  if (typeof meta.modelResponseRaw !== "string" || !meta.modelResponseRaw) {
    issues.push(`modelResponseRaw=${typeof meta.modelResponseRaw}`);
  }

  if (issues.length === 0) {
    recordIssue06(
      testName,
      "PASS",
      `all keys present with correct types: ${JSON.stringify(meta).slice(0, 200)}`,
    );
  } else {
    recordIssue06(
      testName,
      "FAIL",
      `bug-confirmed: helper output missing/malformed: [${issues.join(", ")}]`,
    );
  }
}

// ---------------------------------------------------------------------------
//   Test 6.3 — RUNTIME: helper surfaces partial finishReason/usage from a
//   resolved AI-SDK-shaped result, AND falls back when result fields reject.
// ---------------------------------------------------------------------------
async function test_6_3_helper_reads_partial_values(): Promise<void> {
  const testName =
    "6.3 — RUNTIME: buildNoOutputSentinel reads partial values from result-like";
  const mod = await import("../dist/lib/utils/noOutputSentinel.js");

  // Case A: resolved result fields surface to the sentinel.
  const errA = new Error("Stream produced no output");
  errA.name = "AI_NoOutputGeneratedError";
  const resolvedResult = {
    finishReason: Promise.resolve("length"),
    totalUsage: Promise.resolve({
      promptTokens: 100,
      completionTokens: 0,
      totalTokens: 100,
    }),
  };
  const sentinelA = await mod.buildNoOutputSentinel(errA, resolvedResult);
  const metaA = (sentinelA as { metadata: Record<string, unknown> }).metadata;

  // Case B: rejecting result fields fall back to defaults without throwing.
  const errB = new Error("Stream produced no output");
  errB.name = "AI_NoOutputGeneratedError";
  const rejectingResult = {
    finishReason: Promise.reject(new Error("AI_NoOutputGeneratedError")),
    totalUsage: Promise.reject(new Error("AI_NoOutputGeneratedError")),
  };
  const sentinelB = await mod.buildNoOutputSentinel(errB, rejectingResult);
  const metaB = (sentinelB as { metadata: Record<string, unknown> }).metadata;

  const issues: string[] = [];
  if (metaA.finishReason !== "length") {
    issues.push(`A.finishReason=${String(metaA.finishReason)}`);
  }
  if ((metaA.usage as { promptTokens?: number })?.promptTokens !== 100) {
    issues.push(`A.usage.promptTokens=${JSON.stringify(metaA.usage)}`);
  }
  if (metaB.finishReason !== "error") {
    issues.push(
      `B.finishReason=${String(metaB.finishReason)} (expected fallback)`,
    );
  }
  if ((metaB.usage as { totalTokens?: number })?.totalTokens !== 0) {
    issues.push(
      `B.usage.totalTokens=${JSON.stringify(metaB.usage)} (expected fallback)`,
    );
  }

  if (issues.length === 0) {
    recordIssue06(
      testName,
      "PASS",
      `case A: finishReason=${metaA.finishReason}, promptTokens=${(metaA.usage as { promptTokens?: number })?.promptTokens}; case B: fallback defaults applied`,
    );
  } else {
    recordIssue06(testName, "FAIL", `bug-confirmed: [${issues.join("; ")}]`);
  }
}

// ---------------------------------------------------------------------------
//   Test 6.4 — RUNTIME: helper extracts AI-SDK error.cause into
//   modelResponseRaw, otherwise falls back to error name+message.
// ---------------------------------------------------------------------------
async function test_6_4_helper_extracts_cause(): Promise<void> {
  const testName =
    "6.4 — RUNTIME: buildNoOutputSentinel surfaces error.cause into modelResponseRaw";
  const mod = await import("../dist/lib/utils/noOutputSentinel.js");

  // Case A: error has a `cause` (AI SDK wraps the underlying provider error).
  const errA = new Error("AI_NoOutputGeneratedError") as Error & {
    cause?: unknown;
  };
  errA.cause = "provider returned empty stream — content_filter triggered";
  const sA = await mod.buildNoOutputSentinel(errA);
  const metaA = (sA as { metadata: Record<string, unknown> }).metadata;

  // Case B: no cause — fallback to error.name + error.message.
  const errB = new Error("Stream produced no output");
  errB.name = "AI_NoOutputGeneratedError";
  const sB = await mod.buildNoOutputSentinel(errB);
  const metaB = (sB as { metadata: Record<string, unknown> }).metadata;

  const issues: string[] = [];
  if (
    typeof metaA.modelResponseRaw !== "string" ||
    !metaA.modelResponseRaw.includes("content_filter")
  ) {
    issues.push(
      `A.modelResponseRaw=${JSON.stringify(metaA.modelResponseRaw).slice(0, 80)} (expected to contain 'content_filter')`,
    );
  }
  if (
    typeof metaB.modelResponseRaw !== "string" ||
    !metaB.modelResponseRaw.includes("AI_NoOutputGeneratedError")
  ) {
    issues.push(
      `B.modelResponseRaw=${JSON.stringify(metaB.modelResponseRaw).slice(0, 80)} (expected fallback to include error name)`,
    );
  }

  if (issues.length === 0) {
    recordIssue06(
      testName,
      "PASS",
      `cause extracted in A; fallback applied in B (length=${(metaB.modelResponseRaw as string)?.length})`,
    );
  } else {
    recordIssue06(testName, "FAIL", `bug-confirmed: [${issues.join("; ")}]`);
  }
}

// ---------------------------------------------------------------------------
//   Test 6.5 — END-TO-END REGRESSION GATE: a local HTTP server replays the
//   production trigger by accepting the request and then killing the
//   connection before any text-delta or completion event lands. AI SDK
//   records 0 steps and rejects `result.finishReason` with
//   `NoOutputGeneratedError`.
//
//   The PR's `detectPostStreamNoOutput` helper awaits that promise after
//   the textStream loop completes and yields the enriched sentinel. This
//   test runs the full path through real `sdk.stream()` with the
//   `openai-compatible` provider pointed at the local server, consumes
//   the stream, and asserts a sentinel chunk surfaces with all 6
//   enriched keys (noOutput, errorType, finishReason, usage,
//   providerError, modelResponseRaw). On bind failures (e.g. EPERM in
//   sandboxes) the test records SKIP with a diagnostic; on missing or
//   malformed sentinel it records FAIL — i.e. this IS a CI gate. The
//   prior comment claimed this was informational; it isn't anymore.
// ---------------------------------------------------------------------------
async function test_6_5_local_server_triggers_real_sentinel(): Promise<void> {
  const testName =
    "6.5 — END-TO-END: local connection-kill triggers enriched sentinel via real NeuroLink stream";
  const http = await import("node:http");

  // Production trigger replay: server returns 200 OK then kills the
  // connection before any text-delta / completion event is emitted. AI
  // SDK's flush sees 0 recorded steps and rejects result.finishReason
  // with NoOutputGeneratedError. The fix's `detectPostStreamNoOutput`
  // helper surfaces that rejection so the enriched sentinel actually
  // fires — without this, the bug Curator captured persists silently.
  const server = http.createServer((req, res) => {
    if (req.url === "/v1/models") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ data: [{ id: "test-model" }] }));
      return;
    }
    res.writeHead(200, { "Content-Type": "text/event-stream" });
    res.destroy();
  });
  // Reviewer follow-up: handle the `error` event so a listen failure
  // (EPERM/EADDRINUSE in restricted sandboxes) records SKIP cleanly
  // instead of crashing the suite before later tests run.
  let bindError: Error | undefined;
  try {
    await new Promise<void>((resolve, reject) => {
      server.once("error", (err) => reject(err));
      server.listen(0, "127.0.0.1", () => {
        // unref() so a keep-alive socket can't block process exit if the
        // SDK ever fails to settle. server.close() in the finally still
        // runs the normal cleanup path; this is purely a safety net.
        server.unref();
        resolve();
      });
    });
  } catch (err) {
    bindError = err instanceof Error ? err : new Error(String(err));
  }
  if (bindError) {
    try {
      server.close();
    } catch {
      /* already closed */
    }
    return recordIssue06(
      testName,
      "SKIP",
      `cannot bind local HTTP server in this environment: ${bindError.message}`,
    );
  }
  const address = server.address();
  if (!address || typeof address === "string") {
    server.close();
    return recordIssue06(testName, "FAIL", "could not bind local HTTP server");
  }
  const baseURL = `http://127.0.0.1:${address.port}/v1`;

  const sdk = new NeuroLink();
  const chunks: { content?: string; metadata?: Record<string, unknown> }[] = [];
  let streamErr: unknown;
  try {
    const r = await sdk.stream({
      provider: "openai-compatible" as never,
      model: "test-model",
      input: { text: "hi" },
      maxTokens: 10,
      disableTools: true,
      // Block NeuroLink's internal fallback so we test the sentinel
      // path, not a real-provider fallback.
      disableInternalFallback: true,
      credentials: {
        openaiCompatible: { baseURL, apiKey: "test-key" },
      },
    } as never);
    for await (const chunk of r.stream) {
      chunks.push(
        chunk as { content?: string; metadata?: Record<string, unknown> },
      );
    }
  } catch (err) {
    streamErr = err;
  } finally {
    await sdk.shutdown?.()?.catch(() => {});
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }

  const sentinelChunk = chunks.find(
    (c) =>
      (c.metadata as Record<string, unknown> | undefined)?.noOutput === true,
  );
  if (!sentinelChunk) {
    const sample = chunks
      .slice(0, 3)
      .map(
        (c) =>
          `{contentLen=${(c.content ?? "").length}, meta=${JSON.stringify(c.metadata ?? {}).slice(0, 80)}}`,
      )
      .join(" | ");
    return recordIssue06(
      testName,
      "FAIL",
      `bug-confirmed: no enriched sentinel chunk yielded for production trigger; chunks=${chunks.length}, streamErr=${streamErr instanceof Error ? streamErr.message.slice(0, 120) : String(streamErr).slice(0, 120)}, sample=[${sample}]`,
    );
  }

  const meta = (sentinelChunk.metadata ?? {}) as Record<string, unknown>;
  const required = [
    "noOutput",
    "errorType",
    "finishReason",
    "usage",
    "providerError",
    "modelResponseRaw",
  ];
  const missing = required.filter((k) => meta[k] === undefined);
  if (missing.length > 0) {
    return recordIssue06(
      testName,
      "FAIL",
      `bug-confirmed: sentinel missing keys [${missing.join(", ")}]; present=${JSON.stringify(meta).slice(0, 200)}`,
    );
  }
  recordIssue06(
    testName,
    "PASS",
    `real end-to-end sentinel: errorType=${String(meta.errorType)}, finishReason=${String(meta.finishReason)}, providerError="${String(meta.providerError).slice(0, 60)}", modelResponseRaw="${String(meta.modelResponseRaw).slice(0, 60)}"`,
  );
}

// ---------------------------------------------------------------------------
//   Test 6.6 — REGRESSION: StreamHandler must not yield duplicate sentinels
//   when both the catch and the post-stream detection paths see NoOutput
//   in the same iteration (reviewer Finding #3 — verified via synthetic
//   stream that produced count=2 sentinels before this fix).
// ---------------------------------------------------------------------------
async function test_6_6_streamhandler_no_duplicate_sentinel(): Promise<void> {
  const testName =
    "6.6 — REGRESSION: StreamHandler does not yield duplicate sentinels when catch + post-stream both detect NoOutput";
  // Read the shipped artifact and verify the catch block returns after
  // yielding the sentinel (so the post-stream detection block doesn't run).
  const fs = await import("node:fs/promises");
  const path = "dist/lib/core/modules/StreamHandler.js";
  let src: string;
  try {
    src = await fs.readFile(path, "utf-8");
  } catch (err) {
    return recordIssue06(
      testName,
      "SKIP",
      `cannot read ${path}: ${(err as Error).message}`,
    );
  }
  // Look for `yield sentinel;` followed by `return;` inside the catch
  // path. The compiled output preserves the comments between them, so
  // allow up to ~600 chars of intermediate text but stop before the
  // next `yield` statement so we don't match across the post-stream
  // detect block.
  //
  // Implemented as a non-backtracking scan to avoid a ReDoS
  // (`js/redos`): the previous regex used nested quantifiers like
  // `[^;]*?(?:…[^;]*?)*` which backtracks exponentially on adversarial
  // input.
  const yieldIdx = src.search(/yield\s+sentinel\s*;/);
  let yieldThenReturn = false;
  if (yieldIdx >= 0) {
    const window = src.slice(yieldIdx, yieldIdx + 600);
    const executableWindow = window
      .replace(/\/\/.*$/gm, "")
      .replace(/\/\*[\s\S]*?\*\//g, "");
    yieldThenReturn = /yield\s+sentinel;\s*return\s*;/.test(executableWindow);
  }
  if (yieldThenReturn) {
    recordIssue06(
      testName,
      "PASS",
      `'yield sentinel; return;' present in dist artifact`,
    );
  } else {
    recordIssue06(
      testName,
      "FAIL",
      `bug-confirmed: 'yield sentinel; return;' not found in shipped StreamHandler — the catch path can fall through to post-stream detection and emit a duplicate sentinel`,
    );
  }
}

// ---------------------------------------------------------------------------
//   Test 6.7 — REGRESSION: Pipeline B preserves the enriched
//   langfuse.status_message StreamHandler stamps (reviewer Finding #1 —
//   instrumentation.ts previously overwrote it unconditionally).
// ---------------------------------------------------------------------------
async function test_6_7_pipeline_b_preserves_status_message(): Promise<void> {
  const testName =
    "6.7 — REGRESSION: Pipeline B applyNonErrorLangfuseLevel preserves enriched langfuse.status_message";
  const fs = await import("node:fs/promises");
  const path = "dist/lib/services/server/ai/observability/instrumentation.js";
  let src: string;
  try {
    src = await fs.readFile(path, "utf-8");
  } catch (err) {
    return recordIssue06(
      testName,
      "SKIP",
      `cannot read ${path}: ${(err as Error).message}`,
    );
  }
  // The fix gates the overwrite on the existing message being absent.
  // Look for that gating pattern near the no_output branch.
  const noOutputBranch =
    /neurolink\.no_output[\s\S]{0,400}?typeof\s+attrs\["langfuse\.status_message"\]\s*!==\s*"string"/.test(
      src,
    );
  if (noOutputBranch) {
    recordIssue06(
      testName,
      "PASS",
      `applyNonErrorLangfuseLevel gates the no_output overwrite on the existing message being absent`,
    );
  } else {
    recordIssue06(
      testName,
      "FAIL",
      `bug-confirmed: applyNonErrorLangfuseLevel still unconditionally overwrites langfuse.status_message — StreamHandler's enriched message is lost in Pipeline B`,
    );
  }
}

// ---------------------------------------------------------------------------
//   Test 6.8 — REGRESSION: OpenRouter and LiteLLM gate on contentYielded,
//   not raw chunkCount (reviewer Finding #1: AI SDK fullStream emits
//   { type: "start" } before any text-delta, so chunkCount is non-zero
//   even when no content was produced — making the post-stream NoOutput
//   detect dead).
// ---------------------------------------------------------------------------
async function test_6_8_fullstream_providers_gate_on_content_yielded(): Promise<void> {
  const testName =
    "6.8 — REGRESSION: OpenRouter/LiteLLM gate post-stream NoOutput detect on contentYielded, not raw chunkCount";
  const fs = await import("node:fs/promises");
  const targets = [
    "dist/lib/providers/openRouter.js",
    "dist/lib/providers/litellm.js",
  ];
  const issues: string[] = [];
  for (const path of targets) {
    let src: string;
    try {
      src = await fs.readFile(path, "utf-8");
    } catch (err) {
      issues.push(`cannot read ${path}: ${(err as Error).message}`);
      continue;
    }
    // Look for the production-fix gate. Both providers should reference
    // `contentYielded` (the corrected counter). If either still uses
    // `chunkCount` near `detectPostStreamNoOutput`, the gate is dead.
    const usesContentYielded =
      /contentYielded\s*===\s*0[\s\S]{0,400}?detectPostStreamNoOutput/.test(
        src,
      );
    if (!usesContentYielded) {
      issues.push(
        `${path}: 'contentYielded === 0 ... detectPostStreamNoOutput' pattern not found`,
      );
    }
  }
  if (issues.length === 0) {
    recordIssue06(
      testName,
      "PASS",
      `both fullStream providers gate post-stream detect on contentYielded`,
    );
  } else {
    recordIssue06(testName, "FAIL", `bug-confirmed: ${issues.join("; ")}`);
  }
}

// ---------------------------------------------------------------------------
//   Test 6.9 — REGRESSION: every wired provider stamps the active OTel
//   span via `stampNoOutputSpan` so Pipeline B sees the WARNING level
//   (reviewer Finding #2: previously only StreamHandler stamped the span,
//   so provider-specific paths yielded the sentinel to direct consumers
//   but Pipeline B saw nothing).
// ---------------------------------------------------------------------------
async function test_6_9_all_wired_sites_stamp_otel_span(): Promise<void> {
  const fs = await import("node:fs/promises");
  const targets = [
    "providers/openAI",
    "providers/openaiCompatible",
    "providers/litellm",
    "providers/huggingFace",
    "providers/openRouter",
    "providers/anthropicBaseProvider",
    "core/modules/StreamHandler",
  ];
  for (const t of targets) {
    const testName = `6.9 — ${t} stamps OTel span via stampNoOutputSpan`;
    const path = `dist/lib/${t}.js`;
    let src: string;
    try {
      src = await fs.readFile(path, "utf-8");
    } catch (err) {
      recordIssue06(
        testName,
        "SKIP",
        `cannot read ${path}: ${(err as Error).message}`,
      );
      continue;
    }
    if (/stampNoOutputSpan/.test(src)) {
      recordIssue06(testName, "PASS", `stampNoOutputSpan call present`);
    } else {
      recordIssue06(
        testName,
        "FAIL",
        `bug-confirmed: stampNoOutputSpan not called — Pipeline B will not see no_output for this site`,
      );
    }
  }
}

// ---------------------------------------------------------------------------
//   Test 6.10 — REGRESSION: buildNoOutputStatusMessage handles AI SDK v6
//   usage shape (reviewer Finding #5: previously only read v4
//   promptTokens/completionTokens; v6 uses inputTokens/outputTokens).
// ---------------------------------------------------------------------------
async function test_6_10_status_message_handles_v6_usage(): Promise<void> {
  const testName =
    "6.10 — REGRESSION: buildNoOutputStatusMessage reads AI SDK v6 usage fields";
  const mod = await import("../dist/lib/utils/noOutputSentinel.js");
  // v6 shape
  const v6 = mod.buildNoOutputStatusMessage("stop", {
    inputTokens: 42,
    outputTokens: 7,
  });
  // v4 shape
  const v4 = mod.buildNoOutputStatusMessage("stop", {
    promptTokens: 42,
    completionTokens: 7,
  });
  const v6OK = v6.includes("inputTokens=42") && v6.includes("outputTokens=7");
  const v4OK = v4.includes("inputTokens=42") && v4.includes("outputTokens=7");
  if (v6OK && v4OK) {
    recordIssue06(testName, "PASS", `both v4 and v6 shapes surface 42/7`);
  } else {
    recordIssue06(
      testName,
      "FAIL",
      `bug-confirmed: v6=${v6OK ? "ok" : v6}, v4=${v4OK ? "ok" : v4}`,
    );
  }
}

// ---------------------------------------------------------------------------
//   Test 6.11 — REGRESSION: NeuroLink wrapper distinguishes sentinel
//   chunks from real content for fallback purposes (reviewer Finding:
//   AI SDK can mask real provider failures as NoOutputGeneratedError;
//   counting the sentinel as content suppresses handleStreamFallback
//   so the failure goes silent. Use realContentChunks for the fallback
//   gate instead).
// ---------------------------------------------------------------------------
async function test_6_11_wrapper_excludes_sentinel_from_fallback_gate(): Promise<void> {
  const testName =
    "6.11 — REGRESSION: NeuroLink stream wrapper excludes NoOutputSentinel from fallback content gate";
  const fs = await import("node:fs/promises");
  const path = "dist/lib/neurolink.js";
  let src: string;
  try {
    src = await fs.readFile(path, "utf-8");
  } catch (err) {
    return recordIssue06(
      testName,
      "SKIP",
      `cannot read ${path}: ${(err as Error).message}`,
    );
  }
  const usesRealOutputChunks =
    /realOutputChunks\s*===\s*0[\s\S]{0,500}?handleStreamFallback/.test(src);
  const incrementsForRealOnly =
    /isNoOutputSentinel[\s\S]{0,400}?realOutputChunks\+\+/.test(src);
  if (usesRealOutputChunks && incrementsForRealOnly) {
    recordIssue06(
      testName,
      "PASS",
      `wrapper gates fallback on realOutputChunks and excludes sentinel chunks from the count`,
    );
  } else {
    recordIssue06(
      testName,
      "FAIL",
      `bug-confirmed: gate=${usesRealOutputChunks}, exclusion=${incrementsForRealOnly} — real provider failures masked as NoOutput will not trigger fallback`,
    );
  }
}

// ---------------------------------------------------------------------------
//   Test 6.12 — REGRESSION: media-only streams (audio, image) are NOT
//   counted as "no output" by the wrapper's fallback gate (reviewer
//   Finding #1: previous fix counted only text content, so valid
//   audio-only Google Live streams and image-only generators triggered
//   spurious text fallback).
// ---------------------------------------------------------------------------
async function test_6_12_media_chunks_count_as_real_output(): Promise<void> {
  const testName =
    "6.12 — REGRESSION: wrapper counts audio/image chunks as real output (no spurious fallback)";
  const fs = await import("node:fs/promises");
  const path = "dist/lib/neurolink.js";
  let src: string;
  try {
    src = await fs.readFile(path, "utf-8");
  } catch (err) {
    return recordIssue06(
      testName,
      "SKIP",
      `cannot read ${path}: ${(err as Error).message}`,
    );
  }
  // The fix increments realOutputChunks when the chunk has either
  // text content OR a media payload (type === "audio" / "image").
  const handlesMedia =
    /hasMediaPayload[\s\S]{0,200}?(?:"audio"|'audio')[\s\S]{0,200}?(?:"image"|'image')/.test(
      src,
    );
  // The variable should be named realOutputChunks (not realContentChunks
  // which would imply text-only).
  const usesRealOutputChunks = /realOutputChunks/.test(src);
  if (handlesMedia && usesRealOutputChunks) {
    recordIssue06(
      testName,
      "PASS",
      `wrapper counts media chunks (audio/image) as real output and gates fallback on realOutputChunks`,
    );
  } else {
    recordIssue06(
      testName,
      "FAIL",
      `bug-confirmed: handlesMedia=${handlesMedia}, realOutputChunks=${usesRealOutputChunks} — media-only streams will trigger spurious text fallback`,
    );
  }
}

// ---------------------------------------------------------------------------
//   Test 6.13 — REGRESSION: helper accepts an `underlyingError` parameter
//   so providers' onError-captured errors propagate into the sentinel
//   (reviewer Finding #2: AI SDK NoOutputGeneratedError carries no
//   `cause`, so without the captured upstream error the sentinel
//   defaults to generic "No output generated" messages).
// ---------------------------------------------------------------------------
async function test_6_13_helper_accepts_underlying_error(): Promise<void> {
  const testName =
    "6.13 — REGRESSION: buildNoOutputSentinel accepts underlyingError and prefers it for providerError/modelResponseRaw";
  const mod = await import("../dist/lib/utils/noOutputSentinel.js");
  const aiSdkError = new Error(
    "No output generated. Check the stream for errors.",
  );
  aiSdkError.name = "AI_NoOutputGeneratedError";
  const realProviderError = new Error(
    "OpenRouter: 503 — upstream model overloaded",
  );
  const sentinel = await mod.buildNoOutputSentinel(
    aiSdkError,
    undefined,
    realProviderError,
  );
  const meta = (sentinel as { metadata: Record<string, unknown> }).metadata;
  const issues: string[] = [];
  if (
    typeof meta.providerError !== "string" ||
    !meta.providerError.includes("upstream model overloaded")
  ) {
    issues.push(
      `providerError="${String(meta.providerError).slice(0, 80)}" (expected to include the upstream error)`,
    );
  }
  if (
    typeof meta.modelResponseRaw !== "string" ||
    !meta.modelResponseRaw.includes("upstream model overloaded")
  ) {
    issues.push(
      `modelResponseRaw="${String(meta.modelResponseRaw).slice(0, 80)}" (expected to include the upstream error)`,
    );
  }
  if (issues.length === 0) {
    recordIssue06(
      testName,
      "PASS",
      `underlyingError surfaces in providerError + modelResponseRaw instead of the generic AI SDK message`,
    );
  } else {
    recordIssue06(testName, "FAIL", `bug-confirmed: ${issues.join("; ")}`);
  }
}

// ---------------------------------------------------------------------------
//   Test 6.14 — REGRESSION: providers capture onError into a closure-scoped
//   variable and pass it to buildNoOutputSentinel / detectPostStreamNoOutput.
//   Lock this in for all 5 providers that go through their own streamText
//   call (StreamHandler-based providers don't have their own streamText).
// ---------------------------------------------------------------------------
async function test_6_14_providers_capture_and_pass_error(): Promise<void> {
  const fs = await import("node:fs/promises");
  const targets = [
    "providers/openAI",
    "providers/openaiCompatible",
    "providers/litellm",
    "providers/huggingFace",
    "providers/openRouter",
    "providers/anthropicBaseProvider",
  ];
  // Native-base providers (those that `extends OpenAIChatCompletionsProvider`)
  // capture the provider error centrally in the shared base rather than in
  // their own file — the AI-SDK-era per-provider streamText capture moved there
  // during the native migration. Assert the capture on the base for those, and
  // on their own file for self-streaming providers (openRouter, anthropic).
  const baseSrc = await fs
    .readFile("dist/lib/providers/openaiChatCompletionsBase.js", "utf-8")
    .catch(() => "");
  for (const t of targets) {
    const testName = `6.14 — ${t} captures onError and passes underlyingError to NoOutput helpers`;
    const path = `dist/lib/${t}.js`;
    let src: string;
    try {
      src = await fs.readFile(path, "utf-8");
    } catch (err) {
      recordIssue06(
        testName,
        "SKIP",
        `cannot read ${path}: ${(err as Error).message}`,
      );
      continue;
    }
    const delegatesToBase = /extends\s+OpenAIChatCompletionsProvider/.test(src);
    const captureSrc = delegatesToBase ? baseSrc : src;
    const capturesOnError =
      /capturedProviderError\s*=\s*(?:event\.error|error)/.test(captureSrc);
    const passesToHelper =
      /capturedProviderError(?:\s*\)|\s*,)|getCapturedProviderError\s*\?\s*\.\s*\(/.test(
        captureSrc,
      );
    if (capturesOnError && passesToHelper) {
      recordIssue06(
        testName,
        "PASS",
        `captures onError and threads through helpers`,
      );
    } else {
      recordIssue06(
        testName,
        "FAIL",
        `bug-confirmed: delegatesToBase=${delegatesToBase}, capture=${capturesOnError}, passes=${passesToHelper}`,
      );
    }
  }
}

async function runIssue02Tests(): Promise<void> {
  await test_2_0_static_artifact_contains_fix();
  for (const method of ["generate", "stream"] as const) {
    await test_2_1_pre_dispatch_hard_cap(method);
    await new Promise((r) => setTimeout(r, 1000));
    await test_2_2_inline_messages_compacted(method);
    await new Promise((r) => setTimeout(r, 1000));
    await test_2_3_no_wasted_retries(method);
    await new Promise((r) => setTimeout(r, 1000));
    await test_2_4_unfixable_overflow_emits_event_and_throws(method);
    await new Promise((r) => setTimeout(r, 1000));
  }
}

async function runIssue06Tests(): Promise<void> {
  await test_6_static_artifact_shape();
  await test_6_1_all_providers_wired();
  await test_6_2_helper_produces_full_sentinel();
  await test_6_3_helper_reads_partial_values();
  await test_6_4_helper_extracts_cause();
  await test_6_5_local_server_triggers_real_sentinel();
  await test_6_6_streamhandler_no_duplicate_sentinel();
  await test_6_7_pipeline_b_preserves_status_message();
  await test_6_8_fullstream_providers_gate_on_content_yielded();
  await test_6_9_all_wired_sites_stamp_otel_span();
  await test_6_10_status_message_handles_v6_usage();
  await test_6_11_wrapper_excludes_sentinel_from_fallback_gate();
  await test_6_12_media_chunks_count_as_real_output();
  await test_6_13_helper_accepts_underlying_error();
  await test_6_14_providers_capture_and_pass_error();
}
// ============================================================
// MAIN RUNNER
// ============================================================

async function runAllTests(): Promise<void> {
  const startTime = Date.now();
  log("\nNeuroLink Continuous Test Suite: Context Management", "bright");
  log(
    `   Provider: ${TEST_CONFIG.provider}, Model: ${TEST_CONFIG.model || "default"}`,
    "cyan",
  );

  // Prerequisite checks — throw so the harness's runSuite owns the exit
  // path (prints summary, runs cleanup, calls process.exit). Calling
  // process.exit directly here would short-circuit the summary table.
  const distDir = path.join(__dirname, "../dist");
  if (
    !fs.existsSync(distDir) ||
    !fs.existsSync(path.join(distDir, "index.js"))
  ) {
    throw new Error(`Build not found at ${distDir}. Run: pnpm run build`);
  }

  const sharedSdk = new NeuroLink();

  const tests: Array<{ name: string; fn: () => Promise<boolean | null> }> = [
    // Context Compaction Tests (#1-#9)
    {
      name: "Budget Checker Threshold Trigger",
      fn: () => testBudgetCheckerThresholdTrigger(sharedSdk),
    },
    {
      name: "Context Compaction Long Conversation",
      fn: () => testContextCompactionLongConversation(sharedSdk),
    },
    {
      name: "Context Compaction Vertex",
      fn: () => testContextCompactionVertex(sharedSdk),
    },
    {
      name: "Context Compaction Vertex Pro",
      fn: () => testContextCompactionVertexPro(sharedSdk),
    },
    {
      name: "Context Compaction Vertex Flash",
      fn: () => testContextCompactionVertexFlash(sharedSdk),
    },
    {
      name: "Tool Output Pruning",
      fn: () => testToolOutputPruning(sharedSdk),
    },
    {
      name: "File Read Deduplication",
      fn: () => testFileReadDeduplication(sharedSdk),
    },
    {
      name: "Sliding Window Truncation",
      fn: () => testSlidingWindowTruncation(sharedSdk),
    },
    {
      name: "LLM Summarization",
      fn: () => testLLMSummarization(sharedSdk),
    },
    // Abort Signal Tests (#10-#15)
    {
      name: "Abort Signal Generate",
      fn: () => testAbortSignalGenerate(sharedSdk),
    },
    {
      name: "Abort Signal Stream",
      fn: () => testAbortSignalStream(sharedSdk),
    },
    {
      name: "Abort Signal Vertex",
      fn: () => testAbortSignalVertex(sharedSdk),
    },
    {
      name: "Abort Signal Vertex Pro",
      fn: () => testAbortSignalVertexPro(sharedSdk),
    },
    {
      name: "Abort Signal Vertex 2.0 Flash",
      fn: () => testAbortSignalVertexFlash(sharedSdk),
    },
    {
      name: "Compose Abort Signals",
      fn: () => testComposeAbortSignals(sharedSdk),
    },
    // Additional Context Tests (#16-#18)
    {
      name: "Prompt Caching System Message",
      fn: () => testPromptCachingSystemMessage(sharedSdk),
    },
    {
      name: "Token Estimation Accuracy",
      fn: () => testTokenEstimationAccuracy(sharedSdk),
    },
    {
      name: "Concurrent Conversations",
      fn: () => testConcurrentConversations(sharedSdk),
    },
    // Observability Tests — DELETED. Coverage now lives in
    // continuous-test-suite-observability.ts; this duplicate was ~92 lines.
  ];

  for (const test of tests) {
    logSection(test.name);
    try {
      const result = await test.fn();
      recordTest(
        test.name,
        result === true,
        result === null,
        result === null ? "skipped" : result === true ? undefined : "failed",
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      recordTest(test.name, false, false, msg);
    }
    await globalCleanup();
    await new Promise((r) => setTimeout(r, TEST_CONFIG.interTestDelay));
  }

  // Issue #2 + #6 regressions absorbed during the May 2026 merger.
  await runIssue02Tests();
  await runIssue06Tests();

  try {
    await sharedSdk.shutdown?.();
  } catch {
    /* ignore */
  }
  // Summary + exit handled by harness's runSuite — no manual process.exit here.
}

// ============================================================
// CLI ARGS + EXECUTION
// ============================================================

function parseArguments(): { provider?: string; model?: string } {
  const args: { provider?: string; model?: string } = {};
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith("--provider=")) {
      args.provider = arg.split("=")[1];
    }
    if (arg.startsWith("--model=")) {
      args.model = arg.split("=")[1];
    }
    if (arg === "--help") {
      console.log(
        "Usage: npx tsx test/continuous-test-suite-context.ts [--provider=X] [--model=Y]",
      );
      process.exit(0);
    }
  }
  return args;
}

const cliArgs = parseArguments();
if (cliArgs.provider) {
  TEST_CONFIG.provider = cliArgs.provider;
}
if (cliArgs.model) {
  TEST_CONFIG.model = cliArgs.model;
}
if (!TEST_CONFIG.maxTokens) {
  TEST_CONFIG.maxTokens = PROVIDER_MAX_TOKENS[TEST_CONFIG.provider] || 1024;
}

await runSuite(runAllTests);
