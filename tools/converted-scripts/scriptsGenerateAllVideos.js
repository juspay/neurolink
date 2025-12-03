#!/usr/bin/env node
/**
 * Cross-platform Node.js script to generate all videos for the NeuroLink project.
 * This script handles SDK demo videos, CLI demonstration videos, and converts
 * all WebM videos to a universally compatible MP4 format.
 */

import fs from "fs/promises";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const PROJECT_ROOT = path.resolve(__dirname, "..", "..");
const DEMO_DIR = path.join(PROJECT_ROOT, "neurolink-demo");
const CLI_OUTPUT_DIR = path.join(
  PROJECT_ROOT,
  "docs",
  "visual-content",
  "cli-videos",
);

// Logging functions
const log_info = (message) => console.log(`\x1b[0;34mℹ️  ${message}\x1b[0m`);
const log_success = (message) => console.log(`\x1b[0;32m✅ ${message}\x1b[0m`);
const log_warning = (message) => console.log(`\x1b[1;33m⚠️  ${message}\x1b[0m`);
const log_error = (message) => console.error(`\x1b[0;31m❌ ${message}\x1b[0m`);

/**
 * Checks for required command-line dependencies.
 */
async function check_dependencies() {
  log_info("Checking dependencies...");
  const missing_deps = [];
  for (const cmd of ["node", "ffmpeg", "ffprobe"]) {
    try {
      execSync(
        process.platform === "win32" ? `where ${cmd}` : `command -v ${cmd}`,
        { stdio: "ignore" },
      );
    } catch (e) {
      missing_deps.push(cmd);
    }
  }

  if (missing_deps.length > 0) {
    log_error(`Missing dependencies: ${missing_deps.join(", ")}`);
    console.log(
      "Please install them to continue. On macOS, you can use Homebrew:",
    );
    console.log("  brew install node ffmpeg");
    process.exit(1);
  }
  log_success("All dependencies verified");
}

/**
 * Checks if the demo server is running on localhost:9876.
 * @returns {Promise<boolean>}
 */
async function check_demo_server() {
  log_info("Checking if demo server is running...");
  try {
    // Using a simple fetch-like utility via execSync with curl
    execSync("curl -s --fail http://localhost:9876 > /dev/null 2>&1");
    log_success("Demo server is running");
    return true;
  } catch (error) {
    // The command fails if the server is not running
  }
  log_warning("Demo server is not running");
  console.log("To generate web demo videos, start the server with:");
  console.log("  cd neurolink-demo && node server.js");
  console.log("\nContinuing with CLI video generation only...");
  return false;
}

/**
 * Generates SDK demo videos by running the creation script.
 */
async function generate_sdk_videos() {
  log_info("Generating SDK demo videos...");
  if (!(await check_demo_server())) {
    log_warning("Skipping SDK videos - demo server not running");
    return;
  }

  const scriptPath = path.join(DEMO_DIR, "create-comprehensive-demo-videos.js");
  try {
    await fs.access(scriptPath);
    execSync(`node "${scriptPath}"`, { cwd: DEMO_DIR, stdio: "inherit" });
    log_success("SDK demo videos generated");
  } catch (error) {
    log_warning(
      `SDK video generator script not found at ${scriptPath} - skipping`,
    );
  }
}

/**
 * Generates placeholder MP4 videos for CLI commands.
 */
async function generate_cli_videos() {
  log_info("Generating CLI demonstration videos...");

  // Create output directories
  await fs.mkdir(path.join(CLI_OUTPUT_DIR, "cli-overview"), {
    recursive: true,
  });
  await fs.mkdir(path.join(CLI_OUTPUT_DIR, "cli-basic-generation"), {
    recursive: true,
  });
  await fs.mkdir(path.join(CLI_OUTPUT_DIR, "cli-advanced-features"), {
    recursive: true,
  });

  log_info("Building CLI...");
  execSync("npm run build", { cwd: PROJECT_ROOT, stdio: "inherit" });

  log_info("Creating CLI command videos...");

  const ffmpegCommand = (outputPath, text) =>
    `ffmpeg -f lavfi -i color=c=black:s=1280x800:d=8 -vf "drawtext=${text}" -pix_fmt yuv420p -movflags +faststart "${outputPath}" -y`;

  // CLI Help Video
  execSync(
    ffmpegCommand(
      path.join(CLI_OUTPUT_DIR, "cli-overview", "cli-help.mp4"),
      `text='NeuroLink CLI Help':fontcolor=white:fontsize=32:x=(w-text_w)/2:y=100, drawtext=text='Command reference and usage examples':fontcolor=gray:fontsize=18:x=(w-text_w)/2:y=200, drawtext=text='neurolink --help':fontcolor=cyan:fontsize=24:x=(w-text_w)/2:y=400`,
    ),
    { stdio: "inherit" },
  );

  // Provider Status Video
  execSync(
    ffmpegCommand(
      path.join(CLI_OUTPUT_DIR, "cli-overview", "cli-provider-status.mp4"),
      `text='Provider Status Check':fontcolor=white:fontsize=32:x=(w-text_w)/2:y=100, drawtext=text='✅ openai: Working':fontcolor=green:fontsize=20:x=(w-text_w)/2:y=380, drawtext=text='✅ google-ai: Working':fontcolor=green:fontsize=20:x=(w-text_w)/2:y=420`,
    ),
    { stdio: "inherit" },
  );

  log_success("CLI videos generated with H.264 format");
}

/**
 * Converts all .webm files in the project to .mp4.
 */
async function convert_webm_to_mp4() {
  log_info("Converting WebM files to MP4...");
  let converted = 0;

  const allFiles = [];
  async function* getFiles(dir) {
    const dirents = await fs.readdir(dir, { withFileTypes: true });
    for (const dirent of dirents) {
      const res = path.resolve(dir, dirent.name);
      if (dirent.isDirectory()) {
        yield* getFiles(res);
      } else {
        yield res;
      }
    }
  }

  for await (const f of getFiles(PROJECT_ROOT)) {
    allFiles.push(f);
  }

  const webmFiles = allFiles.filter((f) => f.endsWith(".webm"));

  for (const webm_file of webmFiles) {
    const mp4_file = webm_file.replace(/\.webm$/, ".mp4");
    log_info(
      `Converting: ${path.basename(webm_file)} → ${path.basename(mp4_file)}`,
    );
    try {
      execSync(
        `ffmpeg -i "${webm_file}" -c:v libx264 -preset medium -crf 23 -c:a aac -b:a 128k -movflags +faststart -pix_fmt yuv420p "${mp4_file}" -y`,
        { stdio: "inherit" },
      );
      const webm_size = (await fs.stat(webm_file)).size;
      const mp4_size = (await fs.stat(mp4_file)).size;
      log_success(
        `Created: ${path.basename(mp4_file)} (${(webm_size / 1024 / 1024).toFixed(2)}MB → ${(mp4_size / 1024 / 1024).toFixed(2)}MB)`,
      );
      converted++;
    } catch (error) {
      log_error(`Failed to convert: ${path.basename(webm_file)}`);
      log_error(error.message);
    }
  }
  log_info(`WebM conversion complete: ${converted} converted.`);
}

/**
 * Main execution function
 */
async function run() {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) {
    console.log(
      "Usage: node tools/converted-scripts/scripts-generateAllVideos.js [--clean]",
    );
    console.log(
      "\nThis script generates all videos for the NeuroLink project, including SDK and CLI demos, and converts them to MP4 format.",
    );
    return;
  }

  log_info("Starting master video generation...");
  await check_dependencies();
  await generate_cli_videos();
  await generate_sdk_videos();
  await convert_webm_to_mp4();
  log_success("🎬 Master video generation completed!");
}

run().catch((error) => {
  log_error("Script execution failed:");
  console.error(error);
  process.exit(1);
});
