/**
 * Conversation Memory Demo for NeuroLink
 * Shows how organizations can enable automatic conversation history
 */

import { NeuroLink } from "../dist/index.js";

// Example: Organization sets up NeuroLink with conversation memory
const neurolink = new NeuroLink({
  conversationMemory: {
    enabled: true,
    maxSessions: 50, // Keep last 50 chat sessions
    maxTurnsPerSession: 20, // Keep last 20 messages per session
    storageLocation: "./demo-conversations/",
    autoCleanup: true,
    contextInjection: {
      maxContextTurns: 10, // Include last 10 turns in context
      maxContextTokens: 2000, // Limit context to 2000 tokens
      strategy: "recent",
    },
  },
});

async function demonstrateConversationMemory() {
  console.log("🚀 NeuroLink Conversation Memory Demo\n");

  try {
    // Simulate a conversation in session "chat-123"
    console.log('💬 Starting conversation in session "chat-123"...\n');

    // First message - establish context
    console.log('👤 User: "My name is John and I work at Acme Corp"');
    const response1 = await neurolink.generate({
      input: { text: "My name is John and I work at Acme Corp" },
      context: {
        sessionId: "chat-123",
        userId: "john-doe",
        organizationId: "acme-corp",
      },
    });
    console.log(`🤖 AI: ${response1.content}\n`);

    // Second message - add more context
    console.log('👤 User: "I am working on a new project called NeuroBot"');
    const response2 = await neurolink.generate({
      input: { text: "I am working on a new project called NeuroBot" },
      context: {
        sessionId: "chat-123",
        userId: "john-doe",
        organizationId: "acme-corp",
      },
    });
    console.log(`🤖 AI: ${response2.content}\n`);

    // Third message - test memory recall
    console.log('👤 User: "What is my name and what project am I working on?"');
    const response3 = await neurolink.generate({
      input: { text: "What is my name and what project am I working on?" },
      context: {
        sessionId: "chat-123",
        userId: "john-doe",
        organizationId: "acme-corp",
      },
    });
    console.log(`🤖 AI: ${response3.content}\n`);

    // Test different session - should not remember
    console.log('🔄 Starting new conversation in session "chat-456"...\n');
    console.log('👤 User: "What is my name?"');
    const response4 = await neurolink.generate({
      input: { text: "What is my name?" },
      context: {
        sessionId: "chat-456",
        userId: "jane-smith",
        organizationId: "acme-corp",
      },
    });
    console.log(`🤖 AI: ${response4.content}\n`);

    // Get conversation statistics
    const stats = await neurolink.getConversationStats();
    console.log("📊 Conversation Memory Statistics:");
    console.log(`   Total Sessions: ${stats.totalSessions}`);
    console.log(`   Total Turns: ${stats.totalTurns}`);
    console.log(
      `   Average Turns per Session: ${stats.averageTurnsPerSession.toFixed(1)}`,
    );
    console.log(
      `   Storage Size: ${(stats.memoryUsage.storageSize / 1024).toFixed(2)} KB`,
    );
    console.log(`   Files: ${stats.memoryUsage.fileCount}\n`);

    console.log("✅ Demo completed successfully!");
    console.log(
      '🗂️  Check the "./demo-conversations/" directory to see stored session files.',
    );
  } catch (error) {
    console.error("❌ Demo failed:", error.message);

    // If this is a provider error, show how to configure environment
    if (error.message.includes("Failed to generate text with all providers")) {
      console.log("\n💡 Tip: Configure an AI provider first:");
      console.log('   export OPENAI_API_KEY="your-key-here"');
      console.log("   # or any other supported provider");
    }
  }
}

// Run the demo
demonstrateConversationMemory();
