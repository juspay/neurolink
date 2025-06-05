#!/usr/bin/env node

/**
 * CLI Video Recording Script
 * Creates professional demonstration videos of NeuroLink CLI in action
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const VIDEOS_DIR = path.join(__dirname, 'cli-videos');
const DELAY_BETWEEN_ACTIONS = 2000;
const TYPING_DELAY = 100;

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

async function createTerminalSession(page, width = 1920, height = 1080) {
  await page.setViewportSize({ width, height });

  // Set up a dark terminal-like interface
  await page.setContent(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>NeuroLink CLI Demo</title>
      <style>
        body {
          margin: 0;
          padding: 20px;
          background: #0d1117;
          color: #c9d1d9;
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
          font-size: 16px;
          line-height: 1.5;
        }
        .terminal {
          background: #161b22;
          border: 1px solid #30363d;
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
        }
        .header {
          color: #58a6ff;
          font-size: 24px;
          font-weight: bold;
          margin-bottom: 20px;
          text-align: center;
        }
        .command-line {
          margin: 10px 0;
        }
        .prompt {
          color: #7c3aed;
          font-weight: bold;
        }
        .command {
          color: #79c0ff;
        }
        .output {
          color: #e6edf3;
          margin-left: 20px;
          white-space: pre-wrap;
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
        .spinner {
          color: #f0883e;
        }
        .description {
          color: #8b949e;
          font-style: italic;
          margin-bottom: 10px;
        }
      </style>
    </head>
    <body>
      <div class="terminal">
        <div class="header">🧠 NeuroLink CLI Demonstration</div>
        <div id="content"></div>
      </div>
      <script>
        window.addCommand = function(description, command, output) {
          const content = document.getElementById('content');

          if (description) {
            content.innerHTML += '<div class="description"># ' + description + '</div>';
          }

          content.innerHTML += '<div class="command-line"><span class="prompt">$ </span><span class="command">' + command + '</span></div>';

          if (output) {
            content.innerHTML += '<div class="output">' + output + '</div>';
          }

          content.scrollTop = content.scrollHeight;
        };

        window.clearTerminal = function() {
          document.getElementById('content').innerHTML = '';
        };
      </script>
    </body>
    </html>
  `);
}

async function typeCommand(page, command, description = null) {
  if (description) {
    await page.evaluate((desc) => {
      window.addCommand(desc, '', '');
    }, description);
    await page.waitForTimeout(1000);
  }

  // Type command character by character
  for (let char of command) {
    await page.evaluate((c) => {
      const commandSpan = document.querySelector('.command-line:last-child .command');
      if (commandSpan) {
        commandSpan.textContent += c;
      }
    }, char);
    await page.waitForTimeout(TYPING_DELAY);
  }

  await page.waitForTimeout(500);
}

async function executeCommand(command) {
  return new Promise((resolve) => {
    const parts = command.split(' ');
    const cmd = parts[0];
    const args = parts.slice(1);

    let output = '';
    let errorOutput = '';

    const child = spawn(cmd, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true
    });

    child.stdout.on('data', (data) => {
      output += data.toString();
    });

    child.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    child.on('close', (code) => {
      resolve({
        success: code === 0,
        output: output || errorOutput,
        code
      });
    });

    // Timeout after 30 seconds
    setTimeout(() => {
      child.kill();
      resolve({
        success: false,
        output: 'Command timed out',
        code: -1
      });
    }, 30000);
  });
}

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
