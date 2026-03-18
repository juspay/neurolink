#!/usr/bin/env node

/**
 * NeuroLink Observability with Langfuse Example
 *
 * This example demonstrates:
 * - Creating a NeuroLink instance with Langfuse observability configured
 * - Using `setLangfuseContext()` to set trace metadata (userId, sessionId, etc.)
 * - Making generate calls that are automatically traced
 * - How traces appear in the Langfuse dashboard with proper correlation
 *
 * Langfuse (https://langfuse.com) provides LLM observability including:
 * - Trace visualization for every AI call
 * - Token usage tracking and cost analytics
 * - Latency monitoring across providers
 * - Custom metadata and session grouping
 *
 * Usage:
 *   npx tsx examples/observability-langfuse.ts
 *
 * Prerequisites:
 *   - Langfuse account and project (cloud.langfuse.com or self-hosted)
 *   - export LANGFUSE_PUBLIC_KEY="pk-..."
 *   - export LANGFUSE_SECRET_KEY="sk-..."
 *   - At least one AI provider API key set
 */

import { NeuroLink, setLangfuseContext } from "@juspay/neurolink";

async function observabilityLangfuseExample() {
  console.log("NeuroLink Observability with Langfuse Example\n");

  // Validate Langfuse credentials are available
  const publicKey = process.env.LANGFUSE_PUBLIC_KEY;
  const secretKey = process.env.LANGFUSE_SECRET_KEY;

  if (!publicKey || !secretKey) {
    console.log(
      "Langfuse credentials not found. Set these environment variables:",
    );
    console.log('  export LANGFUSE_PUBLIC_KEY="pk-..."');
    console.log('  export LANGFUSE_SECRET_KEY="sk-..."');
    console.log(
      "\nRunning in demo mode (observability will not be sent to Langfuse).\n",
    );
  }

  // 1. Create NeuroLink with Langfuse observability
  console.log("1. Creating NeuroLink with Langfuse observability...\n");

  const neurolink = new NeuroLink({
    observability: {
      langfuse: {
        enabled: !!publicKey && !!secretKey,
        publicKey: publicKey || "demo-public-key",
        secretKey: secretKey || "demo-secret-key",
        // Optional: custom base URL for self-hosted Langfuse
        // baseUrl: "https://langfuse.your-company.com",
      },
    },
  });

  try {
    // 2. Generate with Langfuse context — traces are tagged automatically
    console.log("2. Generating with Langfuse context...\n");

    const result = await setLangfuseContext(
      {
        userId: "user-alice-123",
        sessionId: "session-demo-456",
        conversationId: "conv-789",
        traceName: "observability-example",
        metadata: {
          environment: "development",
          feature: "observability-demo",
          version: "1.0.0",
        },
      },
      async () => {
        return await neurolink.generate({
          input: { text: "What are the benefits of LLM observability?" },
          maxTokens: 300,
        });
      },
    );

    if (result) {
      console.log(`AI: ${result.content}\n`);
      console.log(`Provider: ${result.provider ?? "default"}`);
      console.log(`Tokens: ${result.usage?.totalTokens ?? "unknown"}`);
    }

    // 3. Multiple calls within the same session context
    console.log("\n3. Multiple traced calls in the same session...\n");

    await setLangfuseContext(
      {
        userId: "user-alice-123",
        sessionId: "session-demo-456",
        traceName: "follow-up-question",
      },
      async () => {
        const followUp = await neurolink.generate({
          input: {
            text: "How do you set up distributed tracing for AI applications?",
          },
          maxTokens: 200,
        });
        console.log(`AI: ${followUp.content}\n`);
        console.log(`Tokens: ${followUp.usage?.totalTokens ?? "unknown"}`);
      },
    );

    // 4. Explain what traces look like in Langfuse
    console.log("\n4. What you will see in Langfuse:\n");
    console.log(
      "   - Each generate() call creates a trace in the Langfuse dashboard",
    );
    console.log("   - Traces are grouped by sessionId ('session-demo-456')");
    console.log(
      "   - Each trace shows: userId, input, output, token usage, latency",
    );
    console.log(
      "   - Custom metadata (environment, feature) appears on span attributes",
    );
    console.log(
      "   - The traceName ('observability-example') is the trace display name",
    );
    console.log(
      "   - Cost tracking is automatic based on model and token counts",
    );

    if (publicKey && secretKey) {
      console.log("\n   View your traces at: https://cloud.langfuse.com");
    }
  } catch (error) {
    const err = error as Error;
    console.error("Error:", err.message);

    if (err.message.includes("API key")) {
      console.log("\nSetup help:");
      console.log('export GOOGLE_AI_API_KEY="AIza-your-key"');
      console.log("Or:");
      console.log('export OPENAI_API_KEY="sk-your-key"');
    }
  }

  await neurolink.shutdown();
  console.log("\nDone!");
}

// Run the example
import { fileURLToPath } from "url";
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  observabilityLangfuseExample().catch(console.error);
}

export { observabilityLangfuseExample };
