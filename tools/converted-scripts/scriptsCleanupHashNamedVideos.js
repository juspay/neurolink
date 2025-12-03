#!/usr/bin/env node
/**
 * Cross-platform Node.js script to clean up cryptic hash-named video files.
 * This script identifies video files named with a 32-character hex hash
 * and removes them, preserving properly named video assets.
 */

import fs from "fs/promises";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";
import readline from "readline";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const PROJECT_ROOT = path.resolve(__dirname, "..", "..");
const DEMO_VIDEO_DIR = path.join(PROJECT_ROOT, "neurolink-demo", "videos");
const HASH_PATTERN = /^[0-9a-f]{32}\.(mp4|webm)$/;

// Logging functions
const log_info = (message) => console.log(`\x1b[0;34mℹ️  ${message}\x1b[0m`);
const log_success = (message) => console.log(`\x1b[0;32m✅ ${message}\x1b[0m`);
const log_warning = (message) => console.log(`\x1b[1;33m⚠️  ${message}\x1b[0m`);
const log_error = (message) => console.error(`\x1b[0;31m❌ ${message}\x1b[0m`);

/**
 * Identifies hash-named and properly named files in the video directory.
 * @returns {Promise<{hash_files: string[], proper_files: string[]}>}
 */
async function identify_files() {
  log_info("Scanning for hash-named video files...");
  try {
    await fs.access(DEMO_VIDEO_DIR);
  } catch (error) {
    log_error(`Video directory not found: ${DEMO_VIDEO_DIR}`);
    process.exit(1);
  }

  const allFiles = await fs.readdir(DEMO_VIDEO_DIR);
  const hash_files = [];
  const proper_files = [];

  for (const file of allFiles) {
    if (HASH_PATTERN.test(file)) {
      hash_files.push(file);
    } else if (file.endsWith(".mp4") || file.endsWith(".webm")) {
      proper_files.push(file);
    }
  }
  return { hash_files, proper_files };
}

/**
 * Removes the identified hash-named files.
 * @param {string[]} files_to_delete - Array of filenames to remove.
 * @param {boolean} dry_run - If true, only log what would be deleted.
 */
async function cleanup_hash_files(files_to_delete, dry_run = false) {
  if (dry_run) {
    log_warning("DRY RUN - No files will be deleted");
  }
  log_info("Removing hash-named video files...");

  let removed_count = 0;
  for (const file of files_to_delete) {
    const file_path = path.join(DEMO_VIDEO_DIR, file);
    try {
      const stats = await fs.stat(file_path);
      const size = (stats.size / 1024 / 1024).toFixed(2) + "MB";
      if (dry_run) {
        console.log(`  [DRY RUN] Would remove: ${file} (${size})`);
      } else {
        await fs.unlink(file_path);
        log_success(`Removed: ${file} (${size})`);
      }
      removed_count++;
    } catch (error) {
      log_error(`Failed to process file ${file}: ${error.message}`);
    }
  }
  log_success(`Cleanup complete. ${removed_count} files processed.`);
}

/**
 * Main execution function
 */
async function run() {
  const args = process.argv.slice(2);
  const is_dry_run = args.includes("--dry-run");
  const is_force = args.includes("--force");

  if (args.includes("--help") || args.includes("-h")) {
    console.log(
      "Usage: node tools/converted-scripts/scripts-cleanupHashNamedVideos.js [--dry-run] [--force] [--help]",
    );
    console.log(
      "\nThis script removes cryptic hash-named video files while preserving properly named ones.",
    );
    return;
  }

  log_info("Starting hash-named video cleanup...");
  const { hash_files, proper_files } = await identify_files();

  if (hash_files.length === 0) {
    log_success("No hash-named files found - directory is already clean!");
    return;
  }

  console.log("");
  log_warning(`Found ${hash_files.length} hash-named files to remove:`);
  for (const file of hash_files) {
    console.log(`  ❌ ${file}`);
  }

  console.log("");
  log_success(`Found ${proper_files.length} properly named files to preserve:`);
  for (const file of proper_files) {
    console.log(`  ✅ ${file}`);
  }
  console.log("");

  if (!is_dry_run && !is_force) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    const answer = await new Promise((resolve) =>
      rl.question(
        "This will permanently delete the files listed above. Continue? (y/N): ",
        resolve,
      ),
    );
    rl.close();
    if (answer.toLowerCase() !== "y") {
      log_info("Cleanup cancelled by user.");
      return;
    }
  }

  await cleanup_hash_files(hash_files, is_dry_run);
  log_success("🎉 Hash-named video cleanup completed successfully!");
}

run().catch((error) => {
  log_error("Script execution failed:");
  console.error(error);
  process.exit(1);
});
