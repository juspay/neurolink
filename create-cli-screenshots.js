#!/usr/bin/env node

/**
 * CLI Screenshot Capture Script
 * Creates professional screenshots of NeuroLink CLI in action
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { spawn, exec } from 'child_process';
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

async function createTerminalSession(page, width = 1920, height = 1080) {
  await page.setViewportSize({ width, height });

  // Set up a professional dark terminal interface
  await page.setContent(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>NeuroLink CLI Screenshots</title>
      <style>
        body {
          margin: 0;
          padding: 20px;
          background: #0d1117;
          color: #c9d1d9;
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
          font-size: 15px;
          line-height: 1.4;
        }
        .terminal {
          background: #161b22;
          border: 1px solid #30363d;
          border-radius: 8px;
          padding: 25px;
          margin: 15px 0;
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.6);
          min-height: 600px;
        }
        .header {
          color: #58a6ff;
          font-size: 28px;
          font-weight: bold;
          margin-bottom: 25px;
          text-align: center;
          border-bottom: 1px solid #30363d;
          padding-bottom: 15px;
        }
        .subheader {
          color: #8b949e;
          font-size: 16px;
          text-align: center;
          margin-bottom: 30px;
          font-style: italic;
        }
        .command-section {
          margin: 25px 0;
        }
        .command-line {
          margin: 12px 0;
          display: flex;
          align-items: flex-start;
        }
        .prompt {
          color: #7c3aed;
          font-weight: bold;
          margin-right: 8px;
        }
        .command {
          color: #79c0ff;
          font-weight: 500;
        }
        .output {
          color: #e6edf3;
          margin-left: 24px;
          white-space: pre-wrap;
          background: #0d1117;
          padding: 15px;
          border-radius: 6px;
          border: 1px solid #21262d;
          margin-top: 10px;
          font-size: 14px;
        }
        .success {
          color: #3fb950;
        }
        .error {
          color: #f85149;
        }
        .info {
          color: #58a6ff;
        }
        .description {
          color: #8b949e;
          font-style: italic;
          margin-bottom: 10px;
          font-size: 14px;
        }
        .timestamp {
          color: #6e7681;
          font-size: 12px;
          text-align: right;
          margin-top: 20px;
        }
        .json {
          color: #ffa657;
          background: #0d1117;
          border: 1px solid #30363d;
        }
        .highlight {
          color: #ffa657;
          font-weight: bold;
        }
      </style>
    </head>
    <body>
      <div class="terminal">
        <div class="header">🧠 NeuroLink CLI</div>
        <div class="subheader" id="subtitle"></div>
        <div id="content"></div>
        <div class="timestamp" id="timestamp"></div>
      </div>
      <script>
        window.setScenario = function(title, description) {
          document.getElementById('subtitle').textContent = title;
          document.getElementById('timestamp').textContent = new Date().toLocaleString();
        };

        window.addCommand = function(command, output, isSuccess = true) {
          const content = document.getElementById('content');
          const commandHtml = '<div class="command-line"><span class="prompt">$</span><span class="command">' + command + '</span></div>';

          let outputHtml = '';
          if (output) {
            const outputClass = isSuccess ? 'success' : 'error';
            outputHtml = '<div class="output ' + outputClass + '">' + output + '</div>';
          }

          content.innerHTML += '<div class="command-section">' + commandHtml + outputHtml + '</div>';
        };

        window.addDescription = function(description) {
          const content = document.getElementById('content');
          content.innerHTML += '<div class="description"># ' + description + '</div>';
        };
      </script>
    </body>
    </html>
  `);
}

async function executeCommand(command) {
  return new Promise((resolve) => {
    exec(command, { shell: true }, (error, stdout, stderr) => {
      if (error) {
        resolve({
          success: false,
          output: stderr || error.message,
          code: error.code || -1
        });
      } else {
        resolve({
          success: true,
          output: stdout,
          code: 0
        });
      }
    });
  });
}

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

    // Clean up output for display
    let cleanOutput = result.output
      .replace(/\x1b\[[0-9;]*m/g, '') // Remove ANSI color codes
      .replace(/⠋|⠙|⠹|⠸|⠼|⠴|⠦|⠧|⠇|⠏/g, '') // Remove spinner characters
      .replace(/;[^;]*;[^;]*;[^;]*$/, '') // Remove terminal artifacts
      .trim();

    // Limit output length for screenshot
    if (cleanOutput.length > 2000) {
      cleanOutput = cleanOutput.substring(0, 2000) + '\n...[output truncated for display]';
    }

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
