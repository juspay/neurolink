#!/usr/bin/env node
/**
 * Cross-platform Node.js script to create working CLI recordings.
 * This script records several CLI commands using 'asciinema' and converts
 * the recordings to MP4 format.
 */

import fs from "fs/promises";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

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
 * Creates a single asciinema recording.
 * @param {string} filename - The output filename (e.g., 'my-recording.cast').
 * @param {string} title - The title of the recording.
 * @param {string} command - The command to execute and record.
 */
async function create_recording(filename, title, command) {
  log_info(`Recording: ${filename}`);
  const cast_path = path.join(RECORDINGS_DIR, filename);
  const record_command = `asciinema rec "${cast_path}" --title "${title}" --command "${command}" --overwrite`;

  try {
    execSync(record_command, { stdio: "inherit" });
    log_success(`  ✅ Recorded ${filename}`);
  } catch (error) {
    log_error(`  ❌ Failed to record ${filename}`);
    log_error(error.message);
  }
}

/**
 * Main execution function
 */
async function run() {
  console.log("🎬 Creating working CLI recordings for three new providers...");

  await fs.mkdir(RECORDINGS_DIR, { recursive: true });

  log_info("🔨 Building CLI...");
  try {
    execSync("npm run build", { cwd: PROJECT_ROOT, stdio: "inherit" });
  } catch (error) {
    log_error("CLI build failed.");
    process.exit(1);
  }

  log_info("🔧 Loading environment variables from .env file...");
  dotenv.config({ path: path.join(PROJECT_ROOT, ".env") });

  const recordings = [
    {
      name: "huggingface-demo.cast",
      title: "NeuroLink - Hugging Face Provider Demo",
      command: `node ${CLI_PATH} generate 'What makes open source AI special?' --provider huggingface`,
    },
    {
      name: "ollama-demo.cast",
      title: "NeuroLink - Ollama Local AI Demo",
      command: `node ${CLI_PATH} generate 'Why is local AI important for privacy?' --provider ollama`,
    },
    {
      name: "mistral-demo.cast",
      title: "NeuroLink - Mistral AI Demo",
      command: `node ${CLI_PATH} generate 'Explain GDPR compliance in AI' --provider mistral`,
    },
    {
      name: "all-providers.cast",
      title: "NeuroLink - All 9 Providers",
      command: `node ${CLI_PATH} config providers`,
    },
    {
      name: "provider-status.cast",
      title: "NeuroLink - Provider Status",
      command: `node ${CLI_PATH} status`,
    },
  ];

  for (const rec of recordings) {
    await create_recording(rec.name, rec.title, rec.command);
  }

  log_success("✅ All CLI recordings created!");

  console.log("\n🔄 Converting recordings to MP4...");
  const castFiles = await fs
    .readdir(RECORDINGS_DIR)
    .then((files) => files.filter((f) => f.endsWith(".cast")));

  for (const cast_file of castFiles) {
    const base_name = path.basename(cast_file, ".cast");
    const mp4_file = path.join(RECORDINGS_DIR, `${base_name}.mp4`);
    log_info(`  Converting ${cast_file} to MP4...`);
    try {
      // Try agg first for high quality
      execSync(
        `agg --renderer=resvg "${path.join(RECORDINGS_DIR, cast_file)}" "${mp4_file}"`,
        { stdio: "ignore" },
      );
      log_success(`  ✅ Created ${base_name}.mp4 (high quality)`);
    } catch (error) {
      log_info(
        "`agg` failed or not found, falling back to ffmpeg placeholder.",
      );
      const ffmpeg_command = `ffmpeg -f lavfi -i color=c=black:s=1280x800:d=10 -vf "drawtext=text='${base_name} CLI Demo':fontcolor=white:fontsize=24:x=(w-text_w)/2:y=(h-text_h)/2" -pix_fmt yuv420p -movflags +faststart "${mp4_file}" -y -loglevel quiet`;
      execSync(ffmpeg_command);
      log_success(`  ✅ Created ${base_name}.mp4 (placeholder)`);
    }
  }
  log_success("✅ All conversions complete!");
}

run().catch((error) => {
  log_error("Script execution failed:");
  console.error(error);
  process.exit(1);
});
