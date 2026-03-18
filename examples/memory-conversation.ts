#!/usr/bin/env node

/**
 * NeuroLink Conversation Memory Example
 *
 * This example demonstrates:
 * - Creating a NeuroLink instance with conversation memory enabled
 * - Making multiple generate calls that share context via sessionId/userId
 * - Showing how the AI remembers previous turns within the same session
 * - Retrieving conversation history with `getConversationHistory()`
 *
 * Conversation memory stores messages per session so the AI can reference
 * earlier turns without the caller manually managing chat history.
 *
 * Usage:
 *   npx tsx examples/memory-conversation.ts
 *
 * Prerequisites:
 *   - At least one provider API key set (e.g., GOOGLE_AI_API_KEY, OPENAI_API_KEY)
 */

import { NeuroLink } from "@juspay/neurolink";

async function memoryConversationExample() {
  console.log("NeuroLink Conversation Memory Example\n");

  // 1. Create NeuroLink with conversation memory enabled
  console.log("1. Creating NeuroLink with conversation memory enabled...\n");

  const neurolink = new NeuroLink({
    conversationMemory: {
      enabled: true,
      enableSummarization: true,
    },
  });

  const sessionId = `demo-session-${Date.now()}`;
  const userId = "example-user";

  try {
    // 2. First turn: introduce a topic
    console.log("2. First turn: introducing a topic...\n");

    const result1 = await neurolink.generate({
      input: {
        text: "My name is Alice and I work as a data scientist at Acme Corp.",
      },
      context: {
        conversationId: sessionId,
        userId: userId,
      },
    });

    console.log(`AI: ${result1.content}\n`);

    // 3. Second turn: reference the first turn without re-stating context
    console.log(
      "3. Second turn: asking a follow-up (AI should remember the context)...\n",
    );

    const result2 = await neurolink.generate({
      input: { text: "What is my name and where do I work?" },
      context: {
        conversationId: sessionId,
        userId: userId,
      },
    });

    console.log(`AI: ${result2.content}\n`);

    // 4. Third turn: build on the conversation further
    console.log("4. Third turn: continuing the conversation...\n");

    const result3 = await neurolink.generate({
      input: {
        text: "What programming languages would you recommend for my role?",
      },
      context: {
        conversationId: sessionId,
        userId: userId,
      },
    });

    console.log(`AI: ${result3.content}\n`);

    // 5. Retrieve full conversation history
    console.log("5. Retrieving conversation history...\n");

    const history = await neurolink.getConversationHistory(sessionId);

    console.log(`Total messages in history: ${history.length}`);
    for (const msg of history) {
      const preview =
        msg.content.length > 80
          ? msg.content.substring(0, 80) + "..."
          : msg.content;
      console.log(`  [${msg.role}] ${preview}`);
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
  memoryConversationExample().catch(console.error);
}

export { memoryConversationExample };
