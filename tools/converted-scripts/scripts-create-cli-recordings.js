#!/usr/bin/env node
/**
 * Cross-platform Node.js script to create CLI recordings for various providers.
 * This script uses 'asciinema' to record terminal sessions and 'ffmpeg' to
 * create placeholder MP4 videos.
 */

import fs from "fs/promises";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const PROJECT_ROOT = path.resolve(__dirname, "..", "..");
const RECORDINGS_DIR = path.join(
  PROJECT_ROOT,
  "docs",
  "cli-recordings",
  "three-providers",
);
const CLI_PATH = path.join(PROJECT_ROOT, "dist", "cli", "index.js");

// Logging functions
const log_info = (message) => console.log(`\x1b[0;34mℹ️  ${message}\x1b[0m`);
const log_success = (message) => console.log(`\x1b[0;32m✅ ${message}\x1b[0m`);
const log_error = (message) => console.error(`\x1b[0;31m❌ ${message}\x1b[0m`);

/**
 * Main execution function
 */
async function run() {
  console.log("🎬 Creating CLI recordings for three new providers...");

  await fs.mkdir(RECORDINGS_DIR, { recursive: true });

  log_info("🔨 Building CLI...");
  try {
    execSync("pnpm run build:cli", { cwd: PROJECT_ROOT, stdio: "inherit" });
  } catch (error) {
    log_error("CLI build failed. Please check the build process.");
    process.exit(1);
  }

  const recordings = [
    {
      name: "huggingface-demo",
      provider: "huggingface",
      question: "What makes open source AI special?",
    },
    {
      name: "ollama-demo",
      provider: "ollama",
      question: "Why is local AI important for privacy?",
    },
    {
      name: "mistral-demo",
      provider: "mistral",
      question: "Explain GDPR compliance in AI",
    },
    {
      name: "ollama-commands",
      command: `node ${CLI_PATH} ollama --help`,
      title: "NeuroLink - Ollama Commands",
    },
    {
      name: "all-providers",
      command: `node ${CLI_PATH} config providers`,
      title: "NeuroLink - All 9 Providers",
    },
    {
      name: "auto-provider",
      command: `node ${CLI_PATH} generate 'Hello from NeuroLink!'`,
      title: "NeuroLink - Auto Provider Selection",
    },
  ];

  for (const rec of recordings) {
    log_info(`📹 Recording ${rec.name}...`);
    const cast_path = path.join(RECORDINGS_DIR, `${rec.name}.cast`);
    const command =
      rec.command ||
      `node ${CLI_PATH} generate '${rec.question}' --provider ${rec.provider}`;
    const title =
      rec.title ||
      `NeuroLink - ${rec.provider.charAt(0).toUpperCase() + rec.provider.slice(1)} Provider Demo`;

    try {
      execSync(
        `asciinema rec --quiet --title "${title}" --command "${command}" --overwrite "${cast_path}"`,
        { stdio: "inherit" },
      );
      log_success(`Created ${rec.name}.cast`);
    } catch (error) {
      log_error(`Failed to record ${rec.name}.cast`);
      log_error(error.message);
    }
  }

  log_success("✅ All CLI recordings created!");
  log_info(`📁 Recordings saved to: ${RECORDINGS_DIR}`);

  console.log("\n🔄 Converting recordings to MP4...");
  const castFiles = await fs
    .readdir(RECORDINGS_DIR)
    .then((files) => files.filter((f) => f.endsWith(".cast")));

  for (const cast_file of castFiles) {
    const base_name = path.basename(cast_file, ".cast");
    const mp4_file = path.join(RECORDINGS_DIR, `${base_name}.mp4`);
    log_info(`  Converting ${cast_file} to MP4...`);
    try {
      const ffmpeg_command = `ffmpeg -f lavfi -i color=c=black:s=1280x800:d=10 -vf "drawtext=text='${base_name}':fontcolor=white:fontsize=24:x=(w-text_w)/2:y=(h-text_h)/2" -pix_fmt yuv420p -movflags +faststart "${mp4_file}" -y -loglevel quiet`;
      execSync(ffmpeg_command);
      log_success(`  ✅ Created ${base_name}.mp4`);
    } catch (error) {
      log_error(`  ❌ Failed to convert ${cast_file}`);
      log_error(error.message);
    }
  }
  log_success("✅ All conversions complete!");
}

run().catch((error) => {
  log_error("Script execution failed:");
  console.error(error);
  process.exit(1);
});
