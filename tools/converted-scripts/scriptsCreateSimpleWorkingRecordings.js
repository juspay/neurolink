#!/usr/bin/env node
/**
 * Cross-platform Node.js script to create simple, working CLI recordings.
 * This script uses a temporary shell script to run commands with a timeout,
 * records them with 'asciinema', and creates placeholder MP4 videos.
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
 * Creates a recording using a temporary shell script to handle timeouts.
 * @param {string} filename - The base name for the recording file.
 * @param {string} title - The title for the asciinema recording.
 * @param {string} command - The command to record.
 * @param {number} max_wait - The maximum time to wait for the command to complete.
 */
async function create_simple_recording(
  filename,
  title,
  command,
  max_wait = 30,
) {
  log_info(`Recording: ${filename}`);
  log_info(`  Command: ${command}`);
  log_info(`  Max wait: ${max_wait}s`);

  const temp_script_path = path.join(__dirname, "temp_record.sh");
  const script_content = `#!/bin/bash
echo "$ ${command}"
timeout ${max_wait}s ${command} || echo "Command timed out after ${max_wait}s"
echo ""
echo "Recording complete. Press Ctrl+C to stop recording."
sleep 3
`;
  await fs.writeFile(temp_script_path, script_content, { mode: 0o755 });

  const cast_path = path.join(RECORDINGS_DIR, filename);
  const record_command = `asciinema rec "${cast_path}" --title "${title}" --command "${temp_script_path}" --overwrite`;

  try {
    execSync(record_command, { stdio: "inherit" });
    log_success(`  ✅ Recorded ${filename}`);
  } catch (error) {
    log_error(`  ❌ Failed to record ${filename}`);
    log_error(error.message);
  } finally {
    await fs.unlink(temp_script_path);
  }
}

/**
 * Main execution function
 */
async function run() {
  console.log("🎬 Creating working CLI recordings (simple approach)...");

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
      name: "provider-status.cast",
      title: "NeuroLink - Provider Status",
      command: `node ${CLI_PATH} status`,
      wait: 15,
    },
    {
      name: "all-providers.cast",
      title: "NeuroLink - All 9 Providers",
      command: `node ${CLI_PATH} config providers`,
      wait: 10,
    },
    {
      name: "mistral-demo.cast",
      title: "NeuroLink - Mistral AI Demo",
      command: `node ${CLI_PATH} generate 'Explain GDPR compliance in AI systems in one paragraph' --provider mistral`,
      wait: 45,
    },
    {
      name: "google-ai-demo.cast",
      title: "NeuroLink - Google AI Demo",
      command: `node ${CLI_PATH} generate 'Write a haiku about artificial intelligence' --provider google-ai`,
      wait: 30,
    },
    {
      name: "auto-provider-demo.cast",
      title: "NeuroLink - Auto Provider Selection",
      command: `node ${CLI_PATH} generate 'What makes AI development exciting?' --provider auto`,
      wait: 30,
    },
  ];

  for (const rec of recordings) {
    await create_simple_recording(rec.name, rec.title, rec.command, rec.wait);
  }

  log_success("✅ All CLI recordings created!");
}

run().catch((error) => {
  log_error("Script execution failed:");
  console.error(error);
  process.exit(1);
});
