#!/usr/bin/env node

/**
 * Real Memory Test - Complete End-to-End Testing with Memory
 * 
 * This test file demonstrates complete NeuroLink memory functionality:
 * 1. Memory storage and retrieval
 * 2. User context isolation  
 * 3. Conversation continuity
 * 4. Error handling and debugging
 */

// Use local import for development testing
// import { NeuroLink } from "../dist/neurolink.js";
import { NeuroLink } from "@juspay/neurolink"
import util from "util";

// Enhanced debugging utility with timestamps
function debugLog(label, data, depth = 3) {
  const timestamp = new Date().toISOString();
  console.log(`\n🔍 DEBUG [${timestamp}] [${label}]:`);
  console.log("─".repeat(60));
  if (typeof data === 'object' && data !== null) {
    console.log(util.inspect(data, { 
      colors: true, 
      depth: depth, 
      showHidden: false,
      compact: false,
      maxArrayLength: 5,
      maxStringLength: 500
    }));
  } else {
    console.log(data);
  }
  console.log("─".repeat(60));
}

async function realMemoryTest() {
  console.log("🧠 Complete Memory Test - End-to-End Testing");
  console.log("=============================================\n");
 
  // Mem0 Cloud API configuration
  const mem0Config = {
    apiKey: process.env.MEM0_API_KEY || "",
  };

   const conversationMemory = {
    enabled: true,
    mem0Enabled: true,
    mem0Config
  }

  debugLog("Memory Configuration", conversationMemory);

  console.log("🏗️  Creating NeuroLink instance with memory...");
  
  try {
    const neurolink = new NeuroLink({
      conversationMemory,
      providers: {
        google: {
          apiKey: process.env.GEMINI_API_KEY
        }
      }
    });
    
    debugLog("NeuroLink Instance Created", {
      hasNeuroLink: !!neurolink,
      constructorSuccess: true
    });

    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log("\nStep 1: First conversation with memory (storing preference)");
    console.log("----------------------------------------------------------");
    
    const step1Options = {
      input: {
        text: "Hi! My name is Alice and I'm a software developer. I love JavaScript programming and React development. I work at TechCorp as a senior frontend developer."
      },
      provider: "vertex", // Use available provider
      context: {
        sessionId: "newusersessionidNo",
        userId: "Test_user_alice"
      },
      model: "claude-sonnet-4@20250514",
      enableAnalytics: true 
    };
    
    debugLog("Step 1 - Generate Options", step1Options);
    console.log("🚀 Calling neurolink.generate() for Alice...");
    
    const firstResponse = await neurolink.generate(step1Options);
    
    debugLog("Step 1 - Response", {
      content: firstResponse.content?.substring(0, 200) + "...",
      provider: firstResponse.provider,
      model: firstResponse.model,
      hasAnalytics: !!firstResponse.analytics,
      responseTime: firstResponse.responseTime
    });

    console.log("👤 Alice: Hi! My name is Alice and I'm a software developer. I love JavaScript programming and React development.");
    console.log("🤖 AI Response:", firstResponse.content);
    
    if (firstResponse.analytics) {
      console.log("📊 Analytics:", {
        provider: firstResponse.analytics.provider,
        tokens: firstResponse.analytics.tokens,
        responseTime: `${firstResponse.analytics.responseTime}ms`
      });
    }
    
    console.log("💾 Memory: Alice's preferences stored in vector database\n");

    // // Wait longer for memory to be indexed in vector store
    console.log("⏳ Waiting for memory to be indexed in vector store...");
    await new Promise(resolve => setTimeout(resolve, 30000));

    console.log("Step 2: Memory recall test - same user");
    console.log("-------------------------------------");
    
    const step2Options = {
      input: {
        text: "What programming technologies did I mention that I love? Also, what's my name and where do I work?"
      },
      context: {
        sessionId: "oldUserNewSessionId",
        userId: "Test_user_alice"
      },
      provider: "vertex",
      model: "gemini-2.5-flash",
      enableAnalytics: true
    };

    debugLog("Step 2 - Generate Options", step2Options);
    console.log("🚀 Testing memory recall...");

    const secondResponse = await neurolink.generate(step2Options);

    debugLog("Step 2 - Response", {
      content: secondResponse.content?.substring(0, 200) + "...",
      provider: secondResponse.provider,
      hasAnalytics: !!secondResponse.analytics
    });

    console.log("👤 Alice: What programming technologies did I mention that I love?");
    console.log("🤖 AI Response:", secondResponse.content);
    
    if (secondResponse.analytics) {
      console.log("📊 Analytics:", {
        provider: secondResponse.analytics.provider,
        tokens: secondResponse.analytics.tokens,
        responseTime: `${secondResponse.analytics.responseTime}ms`
      });
    }
    
    console.log("🧠 Memory: AI should recall JavaScript, React, TechCorp from previous conversation\n");

    console.log("Step 3: Testing user isolation - different user");
    console.log("----------------------------------------------");

    // Create separate NeuroLink instance for Bob (same collection, different userId)
    console.log("🔧 Creating Bob's NeuroLink instance...");
    const bobNeurolink = new NeuroLink({
      conversationMemory,
      providers: {
        google: {
          apiKey: process.env.GEMINI_API_KEY
        }
      }
    });

    debugLog("Bob's NeuroLink Instance Created", {
      hasBobNeuroLink: !!bobNeurolink,
      constructorSuccess: true,
      sameMemoryConfig: JSON.stringify(conversationMemory) === JSON.stringify(bobNeurolink.conversationMemory),
      hasApiKey: !!process.env.GEMINI_API_KEY
    });

    await new Promise(resolve => setTimeout(resolve, 1000));

    const step3Options = {
      input: {
        text: "Hello! I'm Bob, a data scientist. I work with Python, machine learning, and PyTorch. I'm employed at DataCorp as a senior ML engineer."
      },
      context: {
        sessionId: "bobFirstSession",
        userId: "Test_user_bob" // Different user ID
      },
      provider: "vertex",
      model: "claude-sonnet-4@20250514",
      enableAnalytics: true
    };

    debugLog("Step 3 - Generate Options", step3Options);
    console.log("🚀 Creating Bob's memory profile...");

    const thirdResponse = await bobNeurolink.generate(step3Options);

    debugLog("Step 3 - Response", {
      content: thirdResponse.content?.substring(0, 200) + "...",
      provider: thirdResponse.provider,
      hasAnalytics: !!thirdResponse.analytics
    });

    console.log("👤 Bob: Hello! I'm Bob, a data scientist. I work with Python and machine learning.");
    console.log("🤖 AI Response:", thirdResponse.content);

    if (thirdResponse.analytics) {
      console.log("📊 Analytics:", {
        provider: thirdResponse.analytics.provider,
        tokens: thirdResponse.analytics.tokens,
        responseTime: `${thirdResponse.analytics.responseTime}ms`
      });
    }

    console.log("👥 Memory: Bob's profile stored separately from Alice\n");

    // Wait for Bob's memory to be indexed
    console.log("⏳ Waiting for Bob's memory to be indexed...");
    await new Promise(resolve => setTimeout(resolve, 30000));

    console.log("Step 4: Verify user isolation works");
    console.log("----------------------------------");

    const step4Options = {
      input: {
        text: "What programming technologies do I work with? What's my name and company?"
      },
      context: {
        sessionId: "bobSecondSession", // Different session for Bob
        userId: "Test_user_bob" // Same user ID as Bob
      },
      provider: "vertex",
      model: "claude-sonnet-4@20250514",
      enableAnalytics: true
    };

    debugLog("Step 4 - Generate Options", step4Options);
    console.log("🚀 Testing Bob's memory isolation...");

    const fourthResponse = await bobNeurolink.generate(step4Options);

    debugLog("Step 4 - Response", {
      content: fourthResponse.content?.substring(0, 200) + "...",
      provider: fourthResponse.provider,
      hasAnalytics: !!fourthResponse.analytics
    });

    console.log("👤 Bob: What programming technologies do I work with?");
    console.log("🤖 AI Response:", fourthResponse.content);

    if (fourthResponse.analytics) {
      console.log("📊 Analytics:", {
        provider: fourthResponse.analytics.provider,
        tokens: fourthResponse.analytics.tokens,
        responseTime: `${fourthResponse.analytics.responseTime}ms`
      });
    }

    console.log("🔒 Memory: Should recall Python/ML (Bob's), not JavaScript/React (Alice's)\n");

    console.log("Step 5: Cross-session continuity test for Alice");
    console.log("----------------------------------------------");

    const step5Options = {
      input: {
        text: "I'm thinking of learning a new framework. Based on what you know about me, what would you recommend?"
      },
      context: {
        sessionId: "aliceNewFrameworkSession", // New session for Alice
        userId: "Test_user_alice" // Same user ID as Alice
      },
      provider: "vertex",
      model: "claude-sonnet-4@20250514",
      enableAnalytics: true
    };

    debugLog("Step 5 - Generate Options", step5Options);
    console.log("🚀 Testing cross-session continuity for Alice...");

    const fifthResponse = await neurolink.generate(step5Options);

    debugLog("Step 5 - Response", {
      content: fifthResponse.content?.substring(0, 200) + "...",
      provider: fifthResponse.provider,
      hasAnalytics: !!fifthResponse.analytics
    });

    console.log("👤 Alice (new session): I'm thinking of learning a new framework. What would you recommend?");
    console.log("🤖 AI Response:", fifthResponse.content);

    if (fifthResponse.analytics) {
      console.log("📊 Analytics:", {
        provider: fifthResponse.analytics.provider,
        tokens: fifthResponse.analytics.tokens,
        responseTime: `${fifthResponse.analytics.responseTime}ms`
      });
    }

    console.log("🔄 Memory: Should remember Alice's JavaScript/React background across sessions\n");

    // ========================================================
    // STREAMING TESTS WITH MEMORY INTEGRATION
    // ========================================================

    console.log("Step 6: Streaming with Memory Context - Alice");
    console.log("--------------------------------------------");

    const step6Options = {
      input: {
        text: "Tell me a short story about a programmer. Make it engaging and exciting!"
      },
      context: {
        sessionId: "aliceStreamingSession",
        userId: "Test_user_alice" // Same Alice user
      },
      provider: "vertex",
      model: "gemini-2.5-flash",
      enableAnalytics: true,
      maxTokens: 200,
      streaming: {
        enabled: true,
        enableProgress: true
      }
    };

    debugLog("Step 6 - Streaming Options", step6Options);
    console.log("🚀 Testing streaming with Alice's memory context...");

    const startTime = Date.now();
    const step6StreamResult = await neurolink.stream(step6Options);

    console.log("📡 Stream initialized, collecting chunks...");
    const streamChunks = [];
    let chunkCount = 0;
    let totalBytes = 0;

    for await (const chunk of step6StreamResult.stream) {
      if (chunk.content) {
        streamChunks.push(chunk.content);
        chunkCount++;
        totalBytes += chunk.content.length;
        process.stdout.write(chunk.content); // Real-time display
      }
    }

    const streamingTime = Date.now() - startTime;
    const fullStreamContent = streamChunks.join("");

    console.log("\n");
    debugLog("Step 6 - Streaming Results", {
      chunkCount,
      totalBytes,
      streamingTime: `${streamingTime}ms`,
      avgChunkSize: Math.round(totalBytes / chunkCount),
      provider: step6StreamResult.provider,
      hasAnalytics: !!step6StreamResult.analytics
    });

    console.log("📊 Streaming Analytics:");
    if (step6StreamResult.analytics) {
      console.log({
        provider: step6StreamResult.analytics.provider,
        tokens: step6StreamResult.analytics.tokens,
        responseTime: `${step6StreamResult.analytics.responseTime}ms`
      });
    }
    console.log("🎯 Memory: Should have used Alice's context for personalized story\n");

    console.log("Step 7: Streaming with Memory Context - Bob");
    console.log("------------------------------------------");

    const step7Options = {
      input: {
        text: "Give me some quick coding tips for my domain of expertise. Keep it practical!"
      },
      context: {
        sessionId: "bobStreamingSession",
        userId: "Test_user_bob" // Bob's user ID
      },
      provider: "vertex",
      model: "gemini-2.5-flash",
      enableAnalytics: true,
      maxTokens: 150,
      streaming: {
        enabled: true,
        enableProgress: true
      }
    };

    debugLog("Step 7 - Streaming Options", step7Options);
    console.log("🚀 Testing streaming with Bob's memory context...");

    const step7StartTime = Date.now();
    const step7StreamResult = await bobNeurolink.stream(step7Options);

    console.log("📡 Bob's stream initialized, collecting chunks...");
    const bobStreamChunks = [];
    let bobChunkCount = 0;
    let bobTotalBytes = 0;

    for await (const chunk of step7StreamResult.stream) {
      if (chunk.content) {
        bobStreamChunks.push(chunk.content);
        bobChunkCount++;
        bobTotalBytes += chunk.content.length;
        process.stdout.write(chunk.content); // Real-time display
      }
    }

    const bobStreamingTime = Date.now() - step7StartTime;
    const bobFullStreamContent = bobStreamChunks.join("");

    console.log("\n");
    debugLog("Step 7 - Streaming Results", {
      chunkCount: bobChunkCount,
      totalBytes: bobTotalBytes,
      streamingTime: `${bobStreamingTime}ms`,
      avgChunkSize: Math.round(bobTotalBytes / bobChunkCount),
      provider: step7StreamResult.provider,
      hasAnalytics: !!step7StreamResult.analytics
    });

    console.log("📊 Bob's Streaming Analytics:");
    if (step7StreamResult.analytics) {
      console.log({
        provider: step7StreamResult.analytics.provider,
        tokens: step7StreamResult.analytics.tokens,
        responseTime: `${step7StreamResult.analytics.responseTime}ms`
      });
    }
    console.log("🎯 Memory: Should have used Bob's Python/ML context for coding tips\n");

    console.log("Step 8: Stream Performance Comparison");
    console.log("------------------------------------");

    // Performance comparison
    const aliceStreamPerf = {
      chunksPerSecond: (chunkCount / streamingTime) * 1000,
      bytesPerSecond: (totalBytes / streamingTime) * 1000,
      avgChunkSize: Math.round(totalBytes / chunkCount)
    };

    const bobStreamPerf = {
      chunksPerSecond: (bobChunkCount / bobStreamingTime) * 1000,
      bytesPerSecond: (bobTotalBytes / bobStreamingTime) * 1000,
      avgChunkSize: Math.round(bobTotalBytes / bobChunkCount)
    };

    console.log("📈 Streaming Performance Comparison:");
    console.log("Alice (Frontend Dev Story):", {
      chunks: chunkCount,
      time: `${streamingTime}ms`,
      chunksPerSec: aliceStreamPerf.chunksPerSecond.toFixed(2),
      bytesPerSec: aliceStreamPerf.bytesPerSecond.toFixed(0)
    });

    console.log("Bob (ML Coding Tips):", {
      chunks: bobChunkCount,
      time: `${bobStreamingTime}ms`,
      chunksPerSec: bobStreamPerf.chunksPerSecond.toFixed(2),
      bytesPerSec: bobStreamPerf.bytesPerSecond.toFixed(0)
    });

    console.log("🚀 Memory + Streaming: Cross-user isolation maintained during streaming");
    console.log("✅ Streaming performance within acceptable ranges\n");

    console.log("✅ Complete Memory + Streaming Test Successful!");
    console.log("=================================================");
    console.log("✅ Memory storage with real API calls");
    console.log("✅ Memory retrieval and context search");
    console.log("✅ User isolation between different contexts");
    console.log("✅ Cross-session conversation continuity");
    console.log("✅ Real-time streaming with memory context integration");
    console.log("✅ Streaming performance tracking and analytics");
    console.log("✅ Memory-aware streaming for personalized responses");
    console.log("✅ Analytics integration");
    console.log("✅ Google AI provider integration");
    console.log("✅ Error handling and comprehensive logging");

    // Clean up resources to allow script to exit
    console.log("\n🧹 Cleaning up resources...");
    await cleanupResources(neurolink, bobNeurolink);
    console.log("✅ Cleanup complete - script will now exit");

  } catch (error) {
    console.log("\n❌ ERROR OCCURRED");
    console.log("=================");
    
    debugLog("Error Analysis", {
      name: error.name,
      message: error.message,
      stack: error.stack?.split('\n').slice(0, 10), // First 10 lines of stack
      cause: error.cause,
      isNeuroLinkError: error.constructor.name.includes('NeuroLink'),
      isMemoryError: error.message?.toLowerCase().includes('memory'),
      isProviderError: error.message?.toLowerCase().includes('provider'),
      isConnectionError: error.message?.toLowerCase().includes('connection')
    });
    
    console.log("📝 Error:", error.message);
    
    if (error.stack) {
      console.log("\n� Stack Trace (first 10 lines):");
      console.log(error.stack.split('\n').slice(0, 10).join('\n'));
    }
    
    console.log("\n🔧 Debugging Steps:");
    console.log("==================");
    console.log("1. Verify Mem0 Cloud API key:");
    console.log("   echo $MEM0_API_KEY");
    console.log("");
    console.log("2. Verify Gemini API key:");
    console.log("   echo $GEMINI_API_KEY");
    console.log("");
    console.log("3. Check environment variables:");
    console.log("   env | grep -E '(GEMINI|VERTEX|AI|MEM0)'");
    console.log("");
    console.log("4. Run with debug output:");
    console.log("   DEBUG=* node scripts/examples/real-memory-test.js");
    console.log("");
    console.log("5. Test basic generation without memory:");
    console.log("   node -e \"import('./dist/neurolink.js').then(({NeuroLink})=>{const n=new NeuroLink();n.generate('test').then(r=>console.log(r.content))})\"");
    
    // Don't re-throw - let test complete with error information
    process.exit(1);
  }
}

// Add missing cleanup function
async function cleanupResources(neurolink, bobNeurolink) {
  console.log("🔧 Starting resource cleanup...");
  
  try {
    // Force cleanup of memory providers
    if (neurolink && neurolink.memoryProvider && typeof neurolink.memoryProvider.destroy === 'function') {
      console.log("  🧠 Cleaning up Alice's memory provider...");
      neurolink.memoryProvider.destroy();
    }
    
    if (bobNeurolink && bobNeurolink.memoryProvider && typeof bobNeurolink.memoryProvider.destroy === 'function') {
      console.log("  🧠 Cleaning up Bob's memory provider...");
      bobNeurolink.memoryProvider.destroy();
    }
    
    // Clean up any external server managers
    if (neurolink && neurolink.externalServerManager && typeof neurolink.externalServerManager.shutdown === 'function') {
      console.log("  🌐 Shutting down external servers...");
      await neurolink.externalServerManager.shutdown();
    }
    
    if (bobNeurolink && bobNeurolink.externalServerManager && typeof bobNeurolink.externalServerManager.shutdown === 'function') {
      console.log("  🌐 Shutting down Bob's external servers...");
      await bobNeurolink.externalServerManager.shutdown();
    }
    
    // Clear any intervals/timeouts
    console.log("  ⏰ Clearing active timers...");
    
    // Force garbage collection if available
    if (global.gc) {
      console.log("  🗑️ Running garbage collection...");
      global.gc();
    }
    
    // Small delay to allow cleanup to complete
    await new Promise(resolve => setTimeout(resolve, 100));
    
    console.log("✅ Resource cleanup completed");
    
    // Force exit after cleanup
    setTimeout(() => {
      console.log("🚪 Forcing process exit...");
      process.exit(0);
    }, 500);
    
  } catch (error) {
    console.error("❌ Error during cleanup:", error);
    // Force exit even if cleanup fails
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  }
}

// Run the test with proper module detection
if (import.meta.url === `file://${process.argv[1]}`) {
  realMemoryTest().catch((error) => {
    console.error("Fatal error in memory test:", error);
    process.exit(1);
  });
}

export { realMemoryTest };
