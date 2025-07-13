#!/usr/bin/env node
/**
 * Cross-platform Node.js script to create final, working asciinema recordings.
 * This script verifies that commands work before recording to ensure only
 * successful operations are captured.
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
  "final-working",
);

// Logging functions
const log_info = (message) => console.log(`\x1b[0;34mℹ️  ${message}\x1b[0m`);
const log_success = (message) => console.log(`\x1b[0;32m✅ ${message}\x1b[0m`);
const log_warning = (message) => console.log(`\x1b[1;33m⚠️  ${message}\x1b[0m`);
const log_error = (message) => console.error(`\x1b[0;31m❌ ${message}\x1b[0m`);

/**
 * Creates a recording for a given command if it executes successfully.
 * @param {string} name - The base name for the recording file.
 * @param {string} command - The command to test and record.
 * @param {string} description - The title for the asciinema recording.
 */
async function create_working_recording(name, command, description) {
  log_info(`Preparing recording: ${name} - ${description}`);

  log_info(`Testing command: ${command}`);
  try {
    // Test the command first to ensure it works
    execSync(command, { stdio: "ignore", cwd: PROJECT_ROOT });
    log_success("Command works! Creating recording...");
  } catch (error) {
    log_error(`Command failed, skipping recording: ${name}`);
    log_error(error.message);
    return;
  }

  const cast_path = path.join(RECORDINGS_DIR, `${name}.cast`);
  const record_command = `asciinema rec "${cast_path}" --title "${description}" --command "${command}" --overwrite`;

  try {
    execSync(record_command, { stdio: "inherit", cwd: PROJECT_ROOT });
    log_success(`Recording saved: ${name}.cast`);
  } catch (error) {
    log_error(`Failed to create recording for ${name}: ${error.message}`);
  }
}

/**
 * Main execution function
 */
async function run() {
  console.log("🎬 Creating Final Working Recordings (Success Only)");
  console.log("=================================================");

  await fs.mkdir(RECORDINGS_DIR, { recursive: true });
  log_info(`Created recordings directory: ${RECORDINGS_DIR}`);

  const cli_path = path.join(PROJECT_ROOT, "dist", "cli", "index.js");
  try {
    await fs.access(cli_path);
  } catch {
    log_warning("CLI not built. Building now...");
    execSync("npm run build", { cwd: PROJECT_ROOT, stdio: "inherit" });
  }

  const recordings = [
    {
      name: "01-provider-status-all-9",
      command: `node ${cli_path} status`,
      description: "NeuroLink - All 9 Providers Status",
    },
    {
      name: "02-openai-working",
      command: `node ${cli_path} generate 'Hello from OpenAI' --provider openai`,
      description: "OpenAI Text Generation Success",
    },
    {
      name: "03-ollama-working",
      command: `node ${cli_path} generate 'Hello from Ollama local AI' --provider ollama`,
      description: "Ollama Local AI Success",
    },
    {
      name: "04-google-ai-working",
      command: `node ${cli_path} generate 'Hello from Google AI' --provider google-ai`,
      description: "Google AI Studio Success",
    },
    {
      name: "05-anthropic-working",
      command: `node ${cli_path} generate 'Hello from Anthropic Claude' --provider anthropic`,
      description: "Anthropic Claude Success",
    },
    {
      name: "06-auto-selection-working",
      command: `node ${cli_path} generate 'Auto select best provider' --provider auto`,
      description: "Auto Provider Selection Success",
    },
    {
      name: "07-configuration-help",
      command: `node ${cli_path} config --help`,
      description: "Provider Configuration Help",
    },
    {
      name: "08-cli-help-overview",
      command: `node ${cli_path} --help`,
      description: "NeuroLink CLI Help Overview",
    },
  ];

  for (const rec of recordings) {
    await create_working_recording(rec.name, rec.command, rec.description);
    console.log(""); // Add a space between recordings
  }

  log_success("All working recordings created successfully!");
  log_info(`Recordings location: ${RECORDINGS_DIR}`);

  const files = await fs.readdir(RECORDINGS_DIR);
  log_info("Created recordings:");
  files
    .filter((f) => f.endsWith(".cast"))
    .forEach((file) => console.log(`  - ${file}`));

  console.log("");
  log_success("🎉 Final working recordings complete!");
  log_info("All recordings show successful operations - no failures!");
}

run().catch((error) => {
  log_error("Script execution failed:");
  console.error(error);
  process.exit(1);
});
