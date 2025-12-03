#!/usr/bin/env node
/**
 * Cross-platform Node.js script to convert all .cast files to GIF format.
 * This script uses the 'agg' tool to perform the conversion.
 */

import fs from "fs/promises";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

// Logging functions
const log_info = (message) => console.log(`\x1b[0;34mℹ️  ${message}\x1b[0m`);
const log_success = (message) => console.log(`\x1b[0;32m✅ ${message}\x1b[0m`);
const log_warning = (message) => console.log(`\x1b[1;33m⚠️  ${message}\x1b[0m`);
const log_error = (message) => console.error(`\x1b[0;31m❌ ${message}\x1b[0m`);

/**
 * Checks if the 'agg' command-line tool is installed.
 */
function check_agg_dependency() {
  try {
    execSync("command -v agg", { stdio: "ignore" });
  } catch (error) {
    log_error("'agg' tool not found. Please install it to continue.");
    log_info("Installation instructions: https://github.com/asciinema/agg");
    log_info(
      "You can often install it with: cargo install --git https://github.com/asciinema/agg",
    );
    process.exit(1);
  }
}

/**
 * Recursively finds all files with a specific extension.
 * @param {string} dir - The directory to start searching from.
 * @param {string} ext - The file extension to look for (e.g., '.cast').
 * @returns {Promise<string[]>} - A list of found file paths.
 */
async function find_files_by_extension(dir, ext) {
  const allFiles = [];
  async function* getFiles(currentDir) {
    const dirents = await fs.readdir(currentDir, { withFileTypes: true });
    for (const dirent of dirents) {
      const res = path.resolve(currentDir, dirent.name);
      if (dirent.isDirectory()) {
        yield* getFiles(res);
      } else {
        yield res;
      }
    }
  }
  for await (const f of getFiles(dir)) {
    if (f.endsWith(ext)) {
      allFiles.push(f);
    }
  }
  return allFiles;
}

/**
 * Main execution function
 */
async function run() {
  console.log("🎬 Converting All .cast Files to GIF Format");
  console.log("==========================================");

  check_agg_dependency();

  log_info("Finding all .cast files in project...");
  const cast_files = await find_files_by_extension(PROJECT_ROOT, ".cast");

  if (cast_files.length === 0) {
    log_warning("No .cast files found in the project.");
    return;
  }

  log_info(`Found ${cast_files.length} .cast files to convert.`);

  let convert_count = 0;
  let skip_count = 0;

  for (const cast_file of cast_files) {
    const gif_file = cast_file.replace(/\.cast$/, ".gif");
    const filename = path.basename(cast_file);
    const gif_filename = path.basename(gif_file);

    try {
      await fs.access(gif_file);
      log_warning(`GIF already exists: ${gif_filename} - Skipping`);
      skip_count++;
      continue;
    } catch (error) {
      // File doesn't exist, proceed with conversion
    }

    log_info(`Converting: ${filename} → ${gif_filename}`);
    try {
      execSync(
        `agg "${cast_file}" "${gif_file}" --speed 1.5 --font-size 14 --line-height 1.2`,
        { stdio: "inherit" },
      );
      log_success(`Converted: ${gif_filename}`);
      convert_count++;
    } catch (error) {
      log_error(`Failed to convert: ${filename}`);
      log_error(error.message);
    }
  }

  console.log("");
  log_success("🎉 Conversion Complete!");
  log_info(`Converted: ${convert_count} files`);
  log_info(`Skipped: ${skip_count} files (already existed)`);
  log_info(`Total: ${cast_files.length} files processed`);
  console.log("");
  log_info("All GIF files are now available for use!");
}

run().catch((error) => {
  log_error("Script execution failed:");
  console.error(error);
  process.exit(1);
});
