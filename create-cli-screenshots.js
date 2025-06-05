#!/usr/bin/env node

/**
 * CLI Screenshot Capture Script
 * Creates professional screenshots of NeuroLink CLI in action
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
  setupTerminalScenario,
  addCommandToTerminal
} from './cli-automation-utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration from shared module
const SCREENSHOTS_DIR = path.join(__dirname, AUTOMATION_CONFIG.directories.screenshots);
const DELAY_BETWEEN_ACTIONS = getDelayForContext(AUTOMATION_CONFIG.contexts.SCREENSHOT);

// Ensure screenshots directory exists
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

// CLI screenshot scenarios
const CLI_SCREENSHOT_SCENARIOS = [
  {
    name: '01-cli-help',
    title: 'CLI Help Overview',
    command: './dist/cli/index.js --help',
    description: 'Show all available CLI commands and options'
  },
  {
    name: '02-provider-status',
    title: 'Provider Status Check',
    command: './dist/cli/index.js status',
    description: 'Display connectivity status for all AI providers'
  },
  {
    name: '03-text-generation',
    title: 'Basic Text Generation',
    command: './dist/cli/index.js generate-text "Write a haiku about programming" --format json',
    description: 'Generate text with JSON output format'
  },
  {
    name: '04-best-provider',
    title: 'Auto Provider Selection',
    command: './dist/cli/index.js get-best-provider',
    description: 'Automatically select the best available provider'
  },
  {
    name: '05-batch-results',
    title: 'Batch Processing Results',
    command: 'cat batch-results.json | jq .',
    description: 'Display formatted batch processing results',
    setup: ['echo "Displaying previous batch results..."']
  }
];


async function captureScreenshot(scenario) {
  console.log(`📸 Capturing: ${scenario.title}`);

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });

  const page = await context.newPage();
  await createTerminalSession(page);

  try {
    // Set up the scenario
    await page.evaluate(({ title, desc }) => {
      window.setScenario(title, desc);
      window.addDescription(desc);
    }, { title: scenario.title, desc: scenario.description });

    await page.waitForTimeout(DELAY_BETWEEN_ACTIONS);

    // Run setup commands if any
    if (scenario.setup) {
      for (const setupCmd of scenario.setup) {
        await page.evaluate((cmd) => {
          window.addCommand(cmd, '');
        }, setupCmd);
      }
    }

    // Execute the main command
    console.log(`  🔧 Executing: ${scenario.command}`);
    const result = await executeCommand(scenario.command);

    // Clean up output for display using centralized function
    const cleanOutput = processCommandOutput(result.output, 2000);

    // Add command and output to terminal
    await page.evaluate(({ cmd, output, success }) => {
      window.addCommand(cmd, output, success);
    }, { cmd: scenario.command, output: cleanOutput, success: result.success });

    await page.waitForTimeout(DELAY_BETWEEN_ACTIONS);

    // Take screenshot
    const screenshotPath = path.join(SCREENSHOTS_DIR, `${scenario.name}-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.png`);
    await page.screenshot({
      path: screenshotPath,
      fullPage: false,
      type: 'png'
    });

    console.log(`  ✅ Screenshot saved: ${screenshotPath}`);

  } catch (error) {
    console.error(`❌ Error capturing ${scenario.name}:`, error);
  }

  await context.close();
  await browser.close();
}

async function captureAllCLIScreenshots() {
  console.log('📸 Starting CLI screenshot capture...\n');

  for (const scenario of CLI_SCREENSHOT_SCENARIOS) {
    await captureScreenshot(scenario);
    console.log(''); // Add spacing between scenarios
  }

  console.log('🎉 All CLI screenshots captured successfully!');
  console.log(`📁 Screenshots saved to: ${SCREENSHOTS_DIR}`);

  // List all created screenshots
  try {
    const screenshots = fs.readdirSync(SCREENSHOTS_DIR);
    console.log('\n📷 Created screenshots:');
    for (const screenshot of screenshots.filter(f => f.endsWith('.png'))) {
      console.log(`  - ${screenshot}`);
    }
  } catch (error) {
    console.log('Could not list screenshot files:', error.message);
  }
}

// Execute if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  captureAllCLIScreenshots().catch(console.error);
}

export { captureAllCLIScreenshots, CLI_SCREENSHOT_SCENARIOS };
