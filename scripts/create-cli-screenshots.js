#!/usr/bin/env node

/**
 * Generate CLI Screenshots for Documentation
 *
 * This script creates professional screenshots of CLI commands
 * for documentation purposes.
 */

import { chromium } from "playwright";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SCREENSHOTS_DIR = path.join(
  __dirname,
  "../docs/visual-content/screenshots/cli-screenshots",
);
const TERMINAL_WIDTH = 1200;
const TERMINAL_HEIGHT = 800;

/**
 * Terminal styling for professional screenshots
 */
const TERMINAL_STYLES = `
  body {
    margin: 0;
    padding: 20px;
    font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', 'Consolas', monospace;
    font-size: 14px;
    line-height: 1.6;
    background: #1e1e1e;
    color: #d4d4d4;
    overflow: hidden;
  }
  .terminal {
    background: #1e1e1e;
    border-radius: 8px;
    padding: 20px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    border: 1px solid #333;
    max-width: ${TERMINAL_WIDTH - 40}px;
    max-height: ${TERMINAL_HEIGHT - 40}px;
    overflow: auto;
  }
  .command {
    color: #569cd6;
    margin-bottom: 8px;
  }
  .output {
    color: #d4d4d4;
    margin-bottom: 16px;
    white-space: pre-wrap;
  }
  .success {
    color: #4ec9b0;
  }
  .error {
    color: #f44747;
  }
  .warning {
    color: #dcdcaa;
  }
  .info {
    color: #9cdcfe;
  }
  .prompt {
    color: #569cd6;
  }
`;

/**
 * CLI command demonstrations for screenshots
 */
const CLI_COMMANDS = [
  {
    name: "01-cli-help",
    title: "CLI Help Overview",
    command: "npx @juspay/neurolink --help",
    output: `🧠 NeuroLink - Universal AI Development Platform

Usage: neurolink [options] [command]

Options:
  -V, --version                    display version number
  -h, --help                       display help for command

Commands:
  generate [options] <prompt> Generate AI text content
  stream [options] <prompt>        Stream AI text generation
  batch [options] <file>           Process multiple prompts from file
  status [options]                 Check AI provider connectivity
  get-best-provider               Show auto-selected best provider
  mcp                             Manage MCP (Model Context Protocol) servers
  help [command]                  display help for command

Examples:
  npx @juspay/neurolink generate "Hello, AI!"
  npx @juspay/neurolink stream "Tell me a story"
  npx @juspay/neurolink status --verbose
  npx @juspay/neurolink mcp list

🚀 Universal AI platform with multi-provider support and MCP integration`,
  },
  {
    name: "06-google-ai-provider-list",
    title: "Google AI Studio Provider Support",
    command: "npx @juspay/neurolink generate --help",
    output: `Usage: neurolink generate [options] <prompt>

Generate AI text content using specified provider

Arguments:
  prompt                          Text prompt for AI generation

Options:
  -p, --provider <provider>       AI provider (choices: "openai", "bedrock", "vertex",
                                  "google-ai", "anthropic", "azure")
  -m, --model <model>            Specific model to use
  -t, --temperature <number>     Temperature for generation (0.0-1.0)
  --max-tokens <number>          Maximum tokens to generate
  --system <prompt>              System prompt for context
  --format <format>              Output format (choices: "text", "json")
  --stream                       Enable streaming output
  -h, --help                     display help for command

Examples:
  neurolink generate "Hello, AI!" --provider google-ai
  neurolink generate "Write a story" --provider google-ai --model gemini-2.5-pro-latest
  neurolink generate "Explain quantum computing" --provider google-ai --temperature 0.7

🤖 Google AI Studio: Simple API key setup, generous free tier, latest Gemini models`,
  },
  {
    name: "02-provider-status",
    title: "Provider Status Check",
    command: "npx @juspay/neurolink status --verbose",
    output: `🔍 Checking AI provider status...

🤖 OpenAI
   Model: gpt-4o
   Status: ✅ Working
   Response time: 234ms

🚀 Amazon Bedrock
   Model: claude-3-7-sonnet
   Status: ✅ Working
   Response time: 456ms

🧠 Google Vertex AI
   Model: gemini-2.5-flash
   Status: ✅ Working
   Response time: 321ms

📊 Summary: 3/3 providers available
🎯 Auto-selection: openai (fastest response)`,
  },
  {
    name: "03-text-generation",
    title: "AI Text Generation",
    command:
      'npx @juspay/neurolink generate "Write a haiku about programming" --format json',
    output: `🤖 Generating text with auto-selected provider...

{
  "text": "Code flows like water,\\nBugs hide in shadows waiting,\\nDebug brings the light.",
  "provider": "openai",
  "model": "gpt-4o",
  "tokens": {
    "prompt": 8,
    "completion": 17,
    "total": 25
  },
  "responseTime": 1234,
  "timestamp": "2025-01-10T12:33:19.456Z"
}

✅ Generated successfully in 1.2s using OpenAI GPT-4o`,
  },
  {
    name: "04-best-provider",
    title: "Auto Provider Selection",
    command: "npx @juspay/neurolink get-best-provider --verbose",
    output: `🎯 Finding best available provider...

🔍 Testing providers...
   • openai: ✅ Available (234ms)
   • bedrock: ✅ Available (456ms)
   • vertex: ✅ Available (321ms)

📊 Provider Rankings:
   1. openai (fastest: 234ms)
   2. vertex (stable: 321ms)
   3. bedrock (reliable: 456ms)

✅ Best provider: openai
   Reason: Fastest response time and highest reliability score
   Model: gpt-4o
   Estimated cost: $0.03 per 1K tokens`,
  },
  {
    name: "05-batch-results",
    title: "Batch Processing Results",
    command:
      "npx @juspay/neurolink batch prompts.txt --format json --output results.json",
    output: `📝 Processing batch file: prompts.txt
🔍 Found 3 prompts to process...

🤖 Processing prompt 1/3: "Explain quantum computing"
✅ Completed in 2.1s (156 tokens)

🤖 Processing prompt 2/3: "Write a Python function for sorting"
✅ Completed in 1.8s (89 tokens)

🤖 Processing prompt 3/3: "Describe machine learning basics"
✅ Completed in 2.4s (203 tokens)

📊 Batch Summary:
   Total prompts: 3
   Successful: 3
   Failed: 0
   Total tokens: 448
   Total time: 6.3s
   Average: 2.1s per prompt
   Provider used: openai (gpt-4o)

✅ Results saved to: results.json`,
  },
];

/**
 * Generate HTML content for terminal screenshot
 */
function generateTerminalHTML(command) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${command.title}</title>
  <style>${TERMINAL_STYLES}</style>
</head>
<body>
  <div class="terminal">
    <div class="command prompt">$ ${command.command}</div>
    <div class="output">${command.output}</div>
  </div>
</body>
</html>
  `;
}

/**
 * Create screenshot for a single command
 */
async function createCommandScreenshot(browser, command) {
  const page = await browser.newPage();

  // Set viewport for consistent screenshots
  await page.setViewportSize({
    width: TERMINAL_WIDTH,
    height: TERMINAL_HEIGHT,
  });

  // Load terminal HTML
  const html = generateTerminalHTML(command);
  await page.setContent(html);

  // Wait for content to render
  await page.waitForTimeout(500);

  // Take screenshot
  const timestamp = new Date().toISOString().split("T")[0];
  const screenshotPath = path.join(
    SCREENSHOTS_DIR,
    `${command.name}-${timestamp}T12-00-00.png`,
  );

  await page.screenshot({
    path: screenshotPath,
    fullPage: false,
    clip: {
      x: 0,
      y: 0,
      width: TERMINAL_WIDTH,
      height: TERMINAL_HEIGHT,
    },
  });

  console.log(`✅ Created screenshot: ${command.name}`);

  await page.close();
  return screenshotPath;
}

/**
 * Generate all CLI screenshots
 */
async function generateCLIScreenshots() {
  console.log("🎬 Generating CLI Screenshots");
  console.log("=".repeat(50));

  // Ensure screenshots directory exists
  await fs.mkdir(SCREENSHOTS_DIR, { recursive: true });

  // Launch browser
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });

  const createdScreenshots = [];

  try {
    // Generate screenshot for each command
    for (const command of CLI_COMMANDS) {
      console.log(`📸 Creating: ${command.title}...`);
      const screenshotPath = await createCommandScreenshot(browser, command);
      createdScreenshots.push({
        name: command.name,
        title: command.title,
        path: screenshotPath,
        command: command.command,
      });
    }

    console.log("\n🎉 CLI Screenshots Generated Successfully!");
    console.log(`📁 Location: ${SCREENSHOTS_DIR}`);
    console.log(`📊 Created: ${createdScreenshots.length} screenshots`);

    // Show paths for README update
    console.log("\n📋 README Update Paths:");
    createdScreenshots.forEach((screenshot) => {
      const relativePath = path.relative(process.cwd(), screenshot.path);
      console.log(`${screenshot.title}: ./${relativePath}`);
    });
  } finally {
    await browser.close();
  }

  return createdScreenshots;
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  generateCLIScreenshots().catch((error) => {
    console.error("❌ Screenshot generation failed:", error);
    process.exit(1);
  });
}

export { generateCLIScreenshots };
