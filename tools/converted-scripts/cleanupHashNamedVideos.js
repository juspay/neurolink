#!/usr/bin/env node
/**
 * Video Cleanup Script - JavaScript Version
 * Removes hash-named video files from the visual content directory
 */

import fs from "fs/promises";
import path from "path";

async function cleanupHashNamedVideos() {
  console.log("🧹 Starting hash-named video cleanup...");

  try {
    const videoDir = "./docs/visual-content/videos";

    // Check if directory exists
    try {
      await fs.access(videoDir);
    } catch {
      console.log("📁 Video directory not found, creating...");
      await fs.mkdir(videoDir, { recursive: true });
      return;
    }

    // Read directory contents
    const files = await fs.readdir(videoDir);

    // Pattern for hash-named files (8+ hex characters)
    const hashPattern = /^[a-f0-9]{8,}\.(mp4|webm|gif|mov)$/i;
    const cleanupTargets = files.filter((file) => hashPattern.test(file));

    console.log(`🔍 Found ${files.length} total files`);
    console.log(`🎯 Found ${cleanupTargets.length} hash-named videos to clean`);

    if (cleanupTargets.length === 0) {
      console.log("✅ No hash-named videos found - cleanup not needed");
      return;
    }

    // Remove hash-named videos
    for (const file of cleanupTargets) {
      const filePath = path.join(videoDir, file);
      const stats = await fs.stat(filePath);

      try {
        await fs.unlink(filePath);
        console.log(
          `🗑️ Removed: ${file} (${(stats.size / 1024 / 1024).toFixed(1)} MB)`,
        );
      } catch (error) {
        console.warn(`⚠️ Failed to remove ${file}: ${error.message}`);
      }
    }

    console.log(`🎉 Cleanup complete! Removed ${cleanupTargets.length} files`);
  } catch (error) {
    console.error("❌ Video cleanup failed:", error.message);
    throw error;
  }
}

// Export for module use
export { cleanupHashNamedVideos };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  cleanupHashNamedVideos().catch((error) => {
    console.error("Unhandled error:", error);
    process.exit(1);
  });
}
