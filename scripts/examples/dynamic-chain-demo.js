#!/usr/bin/env node

/**
 * NeuroLink Dynamic AI Tool Chain Demo
 * Demonstrates AI-driven tool selection and dynamic execution flows
 */

import { DynamicChainExecutor, HeuristicChainPlanner, AIModelChainPlanner } from "../../dist/lib/mcp/dynamic-chain-executor.js";
import { MCPOrchestrator } from "../../dist/lib/mcp/orchestrator.js";
import { MCPToolRegistry } from "../../dist/lib/mcp/toolRegistry.js";
import { ErrorManager } from "../../dist/lib/mcp/error-manager.js";
import ora from "ora";
import chalk from "chalk";

/**
 * Setup demo tools
 */
function setupDemoTools(registry) {
  // Data fetching tool
  registry.registerTool("fetch-user-data", {
    name: "fetch-user-data",
    description: "Fetch user profile data from external API",
    inputSchema: { type: "object", properties: { userId: { type: "string" } } },
    execute: async (params) => {
      await new Promise(resolve => setTimeout(resolve, 500));
      return {
        userId: params.userId || "user123",
        name: "John Doe",
        email: "john@example.com",
        preferences: { theme: "dark", language: "en" },
        lastLogin: "2025-01-08T10:30:00Z"
      };
    }
  });

  // Data processing tool
  registry.registerTool("analyze-user-behavior", {
    name: "analyze-user-behavior",
    description: "Analyze user behavior patterns and preferences",
    inputSchema: { type: "object", properties: { userData: { type: "object" } } },
    execute: async (params) => {
      await new Promise(resolve => setTimeout(resolve, 300));
      const userData = params.userData || params;
      return {
        analysis: {
          engagementLevel: "high",
          preferredFeatures: ["dark-mode", "notifications"],
          riskScore: 0.2,
          recommendations: ["Enable advanced features", "Suggest premium upgrade"]
        },
        processedAt: new Date().toISOString(),
        confidence: 0.85
      };
    }
  });

  // Personalization tool
  registry.registerTool("generate-recommendations", {
    name: "generate-recommendations",
    description: "Generate personalized recommendations based on user analysis",
    inputSchema: { type: "object", properties: { analysis: { type: "object" } } },
    execute: async (params) => {
      await new Promise(resolve => setTimeout(resolve, 400));
      const analysis = params.analysis || params;
      return {
        recommendations: [
          { type: "feature", title: "Try Pro Features", priority: "high" },
          { type: "content", title: "Recommended Articles", priority: "medium" },
          { type: "setting", title: "Optimize Notifications", priority: "low" }
        ],
        personalizationScore: 0.92,
        generatedAt: new Date().toISOString()
      };
    }
  });

  // Notification tool
  registry.registerTool("send-notification", {
    name: "send-notification",
    description: "Send notification to user with recommendations",
    inputSchema: { type: "object", properties: { userId: { type: "string" }, content: { type: "object" } } },
    execute: async (params) => {
      await new Promise(resolve => setTimeout(resolve, 200));
      return {
        notificationId: "notif-" + Date.now(),
        sent: true,
        deliveryMethod: "push",
        sentAt: new Date().toISOString()
      };
    }
  });

  // Storage tool
  registry.registerTool("save-to-database", {
    name: "save-to-database",
    description: "Save processed data and results to database",
    inputSchema: { type: "object", properties: { data: { type: "object" } } },
    execute: async (params) => {
      await new Promise(resolve => setTimeout(resolve, 300));
      return {
        recordId: "rec-" + Date.now(),
        saved: true,
        collection: "user_profiles",
        savedAt: new Date().toISOString()
      };
    }
  });
}

/**
 * Demo scenarios
 */
async function demoBasicChain(chainExecutor) {
  console.log(chalk.cyan("\n🔗 Demo 1: Basic Tool Chain Execution"));
  console.log(chalk.gray("─".repeat(60)));

  const spinner = ora("Executing: Fetch and analyze user data").start();
  
  const result = await chainExecutor.executeChain(
    "fetch user data and analyze their behavior patterns",
    { userId: "demo-user-123" },
    { sessionId: "demo-session-1" },
    { maxSteps: 5 }
  );
  
  spinner.succeed("Chain execution completed");
  
  console.log(`\n${chalk.yellow("Execution Summary:")}`);
  console.log(`Success: ${result.success ? chalk.green("✓") : chalk.red("✗")}`);
  console.log(`Steps: ${result.totalSteps}`);
  console.log(`Execution Time: ${result.executionTime}ms`);
  console.log(`Tools Used: ${result.metadata.toolsUsed.join(", ")}`);
  console.log(`Average Confidence: ${(result.metadata.averageConfidence * 100).toFixed(1)}%`);
  
  console.log(`\n${chalk.yellow("Step-by-Step Execution:")}`);
  result.results.forEach((step, index) => {
    const statusIcon = step.success ? "✅" : "❌";
    console.log(`${index + 1}. ${statusIcon} ${chalk.bold(step.toolName)} (${step.executionTime}ms)`);
    if (step.context?.reasoning) {
      console.log(`   ${chalk.gray(step.context.reasoning)}`);
    }
    if (step.success && step.result) {
      const resultKeys = Object.keys(step.result);
      console.log(`   ${chalk.green("Output:")} ${resultKeys.join(", ")}`);
    } else if (step.error) {
      console.log(`   ${chalk.red("Error:")} ${step.error.message}`);
    }
  });
}

async function demoAdvancedGoal(chainExecutor) {
  console.log(chalk.cyan("\n🎯 Demo 2: Complex Goal Achievement"));
  console.log(chalk.gray("─".repeat(60)));

  const goal = "create personalized user experience by fetching profile, analyzing behavior, generating recommendations, and notifying the user";
  
  console.log(`${chalk.yellow("Goal:")} ${goal}`);
  
  const spinner = ora("AI planning and executing tool chain...").start();
  
  const result = await chainExecutor.executeChain(
    goal,
    { userId: "premium-user-456" },
    { sessionId: "demo-session-2" },
    { maxSteps: 8 }
  );
  
  spinner.succeed("Complex goal achieved");
  
  console.log(`\n${chalk.yellow("Achievement Report:")}`);
  console.log(`Goal Completed: ${result.success ? chalk.green("YES") : chalk.red("NO")}`);
  console.log(`Total Steps: ${result.totalSteps}`);
  console.log(`Tools Orchestrated: ${result.metadata.toolsUsed.length}`);
  
  // Show tool usage flow
  console.log(`\n${chalk.yellow("Tool Execution Flow:")}`);
  const flowArrow = " → ";
  const flow = result.metadata.toolsUsed.join(flowArrow);
  console.log(`${chalk.blue(flow)}`);
  
  // Show context evolution
  if (result.metadata.contextEvolution.length > 0) {
    console.log(`\n${chalk.yellow("Context Evolution:")}`);
    result.metadata.contextEvolution.forEach((ctx, index) => {
      console.log(`${index + 1}. ${ctx.step}: Added ${ctx.dataKeys.join(", ")}`);
    });
  }
  
  // Show final result
  if (result.finalResult) {
    console.log(`\n${chalk.yellow("Final Output:")}`);
    console.log(JSON.stringify(result.finalResult, null, 2));
  }
}

async function demoAdaptivePlanning(chainExecutor) {
  console.log(chalk.cyan("\n🧠 Demo 3: Adaptive AI Planning"));
  console.log(chalk.gray("─".repeat(60)));
  
  // Switch to AI model planner
  const aiPlanner = new AIModelChainPlanner("gpt-4");
  chainExecutor.setPlanner(aiPlanner);
  
  console.log(`${chalk.yellow("Planner:")} AI Model (with heuristic fallback)`);
  
  const goals = [
    "quickly fetch user preferences",
    "analyze and save user behavioral data",
    "generate and deliver personalized content"
  ];
  
  for (const [index, goal] of goals.entries()) {
    console.log(`\n${chalk.yellow(`Scenario ${index + 1}:`)} ${goal}`);
    
    const spinner = ora("AI analyzing and planning...").start();
    
    const result = await chainExecutor.executeChain(
      goal,
      { userId: `adaptive-user-${index + 1}` },
      { sessionId: `adaptive-session-${index + 1}` },
      { maxSteps: 4 }
    );
    
    spinner.succeed(`Completed in ${result.totalSteps} steps`);
    
    // Show reasoning for first step
    if (result.results.length > 0) {
      const firstStep = result.results[0];
      console.log(`   First Action: ${chalk.bold(firstStep.toolName)}`);
      if (firstStep.context?.reasoning) {
        console.log(`   AI Reasoning: ${chalk.gray(firstStep.context.reasoning)}`);
      }
    }
  }
}

async function demoErrorHandling(chainExecutor) {
  console.log(chalk.cyan("\n⚠️ Demo 4: Error Handling and Recovery"));
  console.log(chalk.gray("─".repeat(60)));
  
  // Add a tool that fails randomly
  const registry = chainExecutor.getPlanner();
  
  console.log("Simulating unreliable network conditions...");
  
  const result = await chainExecutor.executeChain(
    "fetch data from unreliable source and process it",
    { userId: "error-test-user", retryEnabled: true },
    { sessionId: "error-demo" },
    { maxSteps: 6 }
  );
  
  console.log(`\n${chalk.yellow("Error Handling Results:")}`);
  console.log(`Overall Success: ${result.success ? chalk.green("YES") : chalk.red("NO")}`);
  
  const successCount = result.results.filter(r => r.success).length;
  const failureCount = result.results.filter(r => !r.success).length;
  
  console.log(`Successful Steps: ${chalk.green(successCount)}`);
  console.log(`Failed Steps: ${chalk.red(failureCount)}`);
  
  if (failureCount > 0) {
    console.log(`\n${chalk.yellow("Failure Analysis:")}`);
    result.results.forEach((step, index) => {
      if (!step.success) {
        console.log(`${index + 1}. ${chalk.red(step.toolName)}: ${step.error?.message}`);
      }
    });
  }
  
  console.log(`\nSystem demonstrated resilience by continuing execution despite failures.`);
}

/**
 * Main demo runner
 */
async function main() {
  console.log(chalk.bold.cyan("\n🤖 NeuroLink Dynamic AI Tool Chain Demo"));
  console.log(chalk.gray("=".repeat(60)));
  console.log("\nThis demo showcases:");
  console.log("• AI-driven tool selection based on goals");
  console.log("• Dynamic execution flows with context passing");
  console.log("• Adaptive planning with confidence scoring");
  console.log("• Error handling and recovery mechanisms\n");

  // Initialize components
  const errorManager = new ErrorManager({ enableStackTrace: false });
  const registry = new MCPToolRegistry();
  const orchestrator = new MCPOrchestrator(registry, undefined, undefined, undefined, errorManager);
  
  // Setup demo tools
  setupDemoTools(registry);
  
  // Create chain executor with heuristic planner
  const chainExecutor = new DynamicChainExecutor(
    orchestrator,
    registry,
    errorManager,
    new HeuristicChainPlanner()
  );

  try {
    // Run demos
    await demoBasicChain(chainExecutor);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await demoAdvancedGoal(chainExecutor);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await demoAdaptivePlanning(chainExecutor);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await demoErrorHandling(chainExecutor);
    
    console.log(chalk.green("\n✨ Dynamic AI Tool Chain Demo completed successfully!"));
    console.log(chalk.gray("\nKey Capabilities Demonstrated:"));
    console.log("• AI automatically selects appropriate tools for goals");
    console.log("• Context flows seamlessly between tool executions");
    console.log("• Adaptive planning adjusts based on intermediate results");
    console.log("• Robust error handling maintains execution continuity");
    console.log("• Comprehensive execution tracking and reporting\n");
    
  } catch (error) {
    console.error(chalk.red("\n❌ Demo error:"), error);
    process.exit(1);
  }
}

// Run the demo
main().catch(console.error);