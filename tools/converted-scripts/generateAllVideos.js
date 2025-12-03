#!/usr/bin/env node
/**
 * Video Generation Orchestrator - JavaScript Version
 * Coordinates execution of all video generation scripts
 */

import { execSync } from "child_process";
import fs from "fs/promises";

async function generateAllVideos() {
  console.log("🎬 Starting comprehensive video generation pipeline...");

  try {
    const videoScripts = [
      "createCliOverviewVideo.js",
      "createMcpVideos.js",
      "createAiWorkflowCliDemo.js",
      "createCliScreenshots.js",
      "createMcpScreenshots.js",
    ];

    const results = {
      success: [],
      failed: [],
      total: videoScripts.length,
    };

    console.log(
      `📋 Executing ${videoScripts.length} video generation scripts...`,
    );

    for (const script of videoScripts) {
      const scriptPath = `./scripts/${script}`;

      try {
        // Check if script exists
        await fs.access(scriptPath);

        console.log(`🎥 Running: ${script}`);
        execSync(`node ${scriptPath}`, {
          stdio: "inherit",
          timeout: 300000, // 5 minute timeout per script
        });

        results.success.push(script);
        console.log(`✅ Completed: ${script}`);
      } catch (error) {
        results.failed.push({ script, error: error.message });
        console.error(`❌ Failed: ${script} - ${error.message}`);
      }
    }

    // Report results
    console.log("\n📊 VIDEO GENERATION RESULTS");
    console.log("═".repeat(40));
    console.log(`✅ Successful: ${results.success.length}/${results.total}`);
    console.log(`❌ Failed: ${results.failed.length}/${results.total}`);

    if (results.success.length > 0) {
      console.log("\n🎉 Successfully generated:");
      results.success.forEach((script) => console.log(`  ✅ ${script}`));
    }

    if (results.failed.length > 0) {
      console.log("\n⚠️ Failed scripts:");
      results.failed.forEach(({ script, error }) =>
        console.log(`  ❌ ${script}: ${error}`),
      );
    }

    console.log(`\n🎬 Video generation pipeline complete!`);
    return results;
  } catch (error) {
    console.error("❌ Video generation pipeline failed:", error.message);
    throw error;
  }
}

// Export for module use
export { generateAllVideos };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  generateAllVideos().catch((error) => {
    console.error("Unhandled error:", error);
    process.exit(1);
  });
}
