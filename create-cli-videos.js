#!/usr/bin/env node

/**
 * CLI Video Recording Script
 * Creates professional demonstration videos of NeuroLink CLI in action
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { AUTOMATION_CONFIG, getDelayForContext } from './cli-automation-config.js';
import {
  createTerminalSession,
  executeCommand,
  processCommandOutput,
  typeCommand
} from './cli-automation-utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration from shared module
const VIDEOS_DIR = path.join(__dirname, AUTOMATION_CONFIG.directories.videos);
const DELAY_BETWEEN_ACTIONS = getDelayForContext(AUTOMATION_CONFIG.contexts.VIDEO);
const TYPING_DELAY = getDelayForContext(AUTOMATION_CONFIG.contexts.TYPING);

// Ensure videos directory exists
if (!fs.existsSync(VIDEOS_DIR)) {
  fs.mkdirSync(VIDEOS_DIR, { recursive: true });
}

// CLI demonstration scenarios
const CLI_SCENARIOS = [
  {
    name: 'cli-overview',
    title: 'NeuroLink CLI Overview',
    commands: [
      { cmd: './dist/cli/index.js --help', description: 'Show CLI help and all available commands' },
      { cmd: './dist/cli/index.js status', description: 'Check all provider connectivity' },
      { cmd: './dist/cli/index.js get-best-provider', description: 'Auto-select best provider' }
    ]
  },
  {
    name: 'cli-basic-generation',
    title: 'Basic Text Generation',
    commands: [
      { cmd: './dist/cli/index.js generate-text "Write a haiku about artificial intelligence"', description: 'Generate a haiku with default settings' },
      { cmd: './dist/cli/index.js generate-text "Explain quantum computing" --provider bedrock --format json', description: 'Use specific provider with JSON output' },
      { cmd: './dist/cli/index.js generate-text "Creative story about robots" --temperature 0.9 --max-tokens 200', description: 'Creative generation with custom parameters' }
    ]
  },
  {
    name: 'cli-batch-processing',
    title: 'Batch Processing Demo',
    commands: [
      { cmd: 'echo -e "Write a haiku\\nExplain TypeScript\\nGenerate a product name" > demo-prompts.txt', description: 'Create prompts file' },
      { cmd: 'cat demo-prompts.txt', description: 'Show prompts file content' },
      { cmd: './dist/cli/index.js batch demo-prompts.txt --output demo-results.json', description: 'Process batch with JSON output' },
      { cmd: 'cat demo-results.json | jq .', description: 'Display formatted results' }
    ]
  },
  {
    name: 'cli-streaming',
    title: 'Real-time Streaming',
    commands: [
      { cmd: './dist/cli/index.js stream "Tell me a short story about a friendly robot"', description: 'Stream text generation in real-time' }
    ]
  },
  {
    name: 'cli-advanced-features',
    title: 'Advanced CLI Features',
    commands: [
      { cmd: './dist/cli/index.js status --verbose', description: 'Detailed provider diagnostics' },
      { cmd: './dist/cli/index.js generate-text "Compare programming languages" --provider openai --format json', description: 'OpenAI with structured output' },
      { cmd: './dist/cli/index.js generate-text "Write documentation" --provider bedrock --temperature 0.3', description: 'Bedrock with low temperature for focused output' }
    ]
  }
];


async function recordScenario(scenario) {
  console.log(`🎬 Recording: ${scenario.title}`);

  const browser = await chromium.launch({
    headless: false,
    slowMo: AUTOMATION_CONFIG.browser.slowMo,
    args: AUTOMATION_CONFIG.browser.args
  });

  const context = await browser.newContext({
    viewport: AUTOMATION_CONFIG.browser.viewport,
    recordVideo: {
      dir: path.join(VIDEOS_DIR, scenario.name),
      size: { width: 1920, height: 1080 }
    }
  });

  const page = await context.newPage();
  await createTerminalSession(page);

  try {
    for (const [index, commandInfo] of scenario.commands.entries()) {
      console.log(`  📝 Command ${index + 1}/${scenario.commands.length}: ${commandInfo.cmd}`);

      // Add command to terminal display
      await page.evaluate(({ desc, cmd }) => {
        window.addCommand(desc, cmd, '');
      }, { desc: commandInfo.description, cmd: commandInfo.cmd });

      await page.waitForTimeout(DELAY_BETWEEN_ACTIONS);

      // Execute the actual command
      const result = await executeCommand(commandInfo.cmd);

      // Clean up ANSI codes and format output
      let cleanOutput = result.output
        .replace(/\x1b\[[0-9;]*m/g, '') // Remove ANSI color codes
        .replace(/⠋|⠙|⠹|⠸|⠼|⠴|⠦|⠧|⠇|⠏/g, '') // Remove spinner characters
        .replace(/🤖|✅|✔|❌|📊|🔍|🎯/g, '') // Remove status emojis for clean terminal output
        .trim();

      // Add output to terminal
      await page.evaluate(({ output, success }) => {
        const outputClass = success ? 'success' : 'error';
        const lastCommandLine = document.querySelector('.command-line:last-child');
        if (lastCommandLine && output) {
          lastCommandLine.innerHTML += '<div class="output ' + outputClass + '">' + output + '</div>';
        }
      }, { output: cleanOutput, success: result.success });

      await page.waitForTimeout(DELAY_BETWEEN_ACTIONS);
    }

    // Keep recording for a moment to show final result
    await page.waitForTimeout(3000);

  } catch (error) {
    console.error(`❌ Error recording ${scenario.name}:`, error);
  }

  await context.close();
  await browser.close();

  console.log(`✅ Completed: ${scenario.title}`);
}

async function recordAllCLIVideos() {
  console.log('🎬 Starting CLI video recordings...\n');

  for (const scenario of CLI_SCENARIOS) {
    await recordScenario(scenario);
    console.log(''); // Add spacing between scenarios
  }

  console.log('🎉 All CLI videos recorded successfully!');
  console.log(`📁 Videos saved to: ${VIDEOS_DIR}`);

  // List all created videos
  try {
    const videoFolders = fs.readdirSync(VIDEOS_DIR);
    console.log('\n📹 Created videos:');
    for (const folder of videoFolders) {
      const folderPath = path.join(VIDEOS_DIR, folder);
      if (fs.statSync(folderPath).isDirectory()) {
        const files = fs.readdirSync(folderPath);
        const videoFile = files.find(f => f.endsWith('.webm'));
        if (videoFile) {
          console.log(`  - ${folder}/${videoFile}`);
        }
      }
    }
  } catch (error) {
    console.log('Could not list video files:', error.message);
  }
}

// Execute if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  recordAllCLIVideos().catch(console.error);
}

export { recordAllCLIVideos, CLI_SCENARIOS };
