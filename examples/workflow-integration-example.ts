/**
 * Workflow Engine Integration Example
 *
 * Demonstrates how to use the Workflow Engine with the Neuro Link SDK
 * to execute multi-model ensembles with judge-based evaluation.
 *
 * Workflows are accessed via the generate() and stream() methods with
 * workflowConfig option.
 *
 * Run with:
 * ```
 * npx tsx examples/workflow-integration-example.ts
 * ```
 */

import { neurolink } from "../src/lib/neurolink.js";
import {
  CONSENSUS_3_WORKFLOW,
  MULTI_JUDGE_5_WORKFLOW,
  QUALITY_MAX_WORKFLOW,
  registerWorkflow,
  listWorkflows,
  getWorkflow,
} from "../src/lib/workflow/index.js";

async function main() {
  console.log("=".repeat(80));
  console.log("Workflow Engine Integration Example");
  console.log("=".repeat(80));
  console.log("");

  // Example 1: Run a predefined consensus workflow via generate()
  console.log("📊 Example 1: Consensus-3 Workflow via generate()");
  console.log("-".repeat(80));
  console.log("Running 3 models in parallel with judge evaluation...\n");

  try {
    const result1 = await neurolink.generate({
      input: { text: "Explain quantum computing in simple terms" },
      workflowConfig: CONSENSUS_3_WORKFLOW,
    });

    console.log("✅ Workflow completed successfully!");
    console.log(`   Best Response: ${result1.content.substring(0, 100)}...`);
    if (result1.workflow) {
      console.log(`   Selected Model: ${result1.workflow.selectedModel}`);
      console.log(`   Total Time: ${result1.workflow.metrics?.totalTime}ms`);
    }
    console.log("");
  } catch (error) {
    console.error(
      "❌ Workflow failed:",
      error instanceof Error ? error.message : String(error),
    );
  }

  // Example 2: Run multi-judge voting workflow via generate()
  console.log("📊 Example 2: Multi-Judge Voting via generate()");
  console.log("-".repeat(80));
  console.log("Running 5 models with 3-judge consensus voting...\n");

  try {
    const result2 = await neurolink.generate({
      input: { text: "What are the main benefits of renewable energy?" },
      workflowConfig: MULTI_JUDGE_5_WORKFLOW,
    });

    console.log("✅ Multi-judge workflow completed!");
    console.log(`   Best Response: ${result2.content.substring(0, 100)}...`);
    if (result2.workflow) {
      console.log(`   Selected Model: ${result2.workflow.selectedModel}`);
      console.log(
        `   Ensemble Responses: ${result2.workflow.ensembleResponses?.length}`,
      );
      console.log(`   Total Time: ${result2.workflow.metrics?.totalTime}ms`);
    }
    console.log("");
  } catch (error) {
    console.error(
      "❌ Multi-judge workflow failed:",
      error instanceof Error ? error.message : String(error),
    );
  }

  // Example 3: Adaptive tier-based workflow via generate()
  console.log("📊 Example 3: Adaptive Quality-Max Workflow via generate()");
  console.log("-".repeat(80));
  console.log("Using 3-tier adaptive system for quality optimization...\n");

  try {
    const result3 = await neurolink.generate({
      input: {
        text: "Compare and contrast machine learning and deep learning",
      },
      workflowConfig: QUALITY_MAX_WORKFLOW,
    });

    console.log("✅ Adaptive workflow completed!");
    console.log(`   Best Response: ${result3.content.substring(0, 100)}...`);
    if (result3.workflow) {
      console.log(
        `   Responses Generated: ${result3.workflow.ensembleResponses?.length}`,
      );
      console.log(`   Total Time: ${result3.workflow.metrics?.totalTime}ms`);
    }
    console.log("");
  } catch (error) {
    console.error(
      "❌ Adaptive workflow failed:",
      error instanceof Error ? error.message : String(error),
    );
  }

  // Example 4: Using workflow registry (standalone functions)
  console.log("📋 Example 4: Workflow Registry (Standalone Functions)");
  console.log("-".repeat(80));

  // Register predefined workflows using standalone registry functions
  registerWorkflow(CONSENSUS_3_WORKFLOW);
  registerWorkflow(MULTI_JUDGE_5_WORKFLOW);
  registerWorkflow(QUALITY_MAX_WORKFLOW);

  const workflows = listWorkflows();
  console.log(`Registered workflows: ${workflows.length}`);
  workflows.forEach((workflow) => {
    console.log(`   - ${workflow.id}: ${workflow.name} (${workflow.type})`);
  });
  console.log("");

  // Example 5: Run workflow by ID via generate()
  console.log("📊 Example 5: Run by Workflow ID via generate()");
  console.log("-".repeat(80));

  try {
    // Get workflow from registry and pass to generate
    const workflowConfig = getWorkflow("consensus-3");
    if (!workflowConfig) {
      throw new Error("Workflow 'consensus-3' not found in registry");
    }

    const result5 = await neurolink.generate({
      input: { text: "What is the future of artificial intelligence?" },
      workflowConfig,
    });

    console.log("✅ Workflow execution by ID successful!");
    if (result5.workflow) {
      console.log(`   Workflow Used: ${result5.workflow.workflowName}`);
      console.log(`   Selected Model: ${result5.workflow.selectedModel}`);
    }
    console.log("");
  } catch (error) {
    console.error(
      "❌ Workflow by ID failed:",
      error instanceof Error ? error.message : String(error),
    );
  }

  console.log("=".repeat(80));
  console.log("All examples completed!");
  console.log("=".repeat(80));
}

// Run examples
main().catch(console.error);
