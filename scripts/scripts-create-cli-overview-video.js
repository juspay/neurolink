#!/usr/bin/env node

/**
 * CLI Overview Video Generator
 * Creates comprehensive CLI demonstration video showing help, status, and core commands
 */

const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const OUTPUT_DIR = path.join(
  __dirname,
  "../docs/visual-content/videos/cli-videos/cli-overview",
);
const SCRIPT_DELAY = 2000; // 2 seconds between commands
const VIDEO_DURATION = 30; // Target ~30 seconds

const CLI_COMMANDS = [
  {
    command: "npx @juspay/neurolink --help",
    description: "Show complete CLI help and commands",
    duration: 8000,
  },
  {
    command: "npx @juspay/neurolink status",
    description: "Check all provider connectivity",
    duration: 6000,
  },
  {
    command: "npx @juspay/neurolink get-best-provider",
    description: "Show auto provider selection",
    duration: 4000,
  },
  {
    command: "npx @juspay/neurolink mcp list",
    description: "List MCP servers",
    duration: 4000,
  },
];

async function createCLIOverviewVideo() {
  console.log("🎬 Creating CLI Overview Video...");

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const browser = await chromium.launch({
    headless: false,
    slowMo: 500,
    args: ["--disable-web-security"],
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: {
      dir: OUTPUT_DIR,
      size: { width: 1920, height: 1080 },
    },
  });

  const page = await context.newPage();

  // Create terminal-like interface
  await page.setContent(`
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          background: #1e1e1e;
          color: #d4d4d4;
          font-family: 'Monaco', 'Consolas', monospace;
          font-size: 18px;
          margin: 0;
          padding: 40px;
          overflow: hidden;
        }
        .terminal {
          background: #1e1e1e;
          border: 2px solid #333;
          border-radius: 8px;
          padding: 30px;
          height: calc(100vh - 160px);
          overflow-y: auto;
        }
        .command {
          color: #569cd6;
          margin: 15px 0;
          font-weight: bold;
        }
        .output {
          color: #d4d4d4;
          margin: 10px 0;
          white-space: pre-wrap;
          line-height: 1.4;
        }
        .success { color: #4fc3f7; }
        .title {
          color: #f0f0f0;
          font-size: 24px;
          font-weight: bold;
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 2px solid #333;
          padding-bottom: 15px;
        }
        .cursor {
          animation: blink 1s infinite;
        }
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
      </style>
    </head>
    <body>
      <div class="terminal">
        <div class="title">NeuroLink CLI - Overview Demonstration</div>
        <div id="output"></div>
        <span class="cursor">█</span>
      </div>
      <script>
        window.addCommand = function(cmd, description) {
          const output = document.getElementById('output');
          output.innerHTML += \`<div class="command">$ \${cmd}</div>\`;
          output.innerHTML += \`<div class="success"># \${description}</div>\`;
          window.scrollTo(0, document.body.scrollHeight);
        };

        window.addOutput = function(text) {
          const output = document.getElementById('output');
          output.innerHTML += \`<div class="output">\${text}</div>\`;
          window.scrollTo(0, document.body.scrollHeight);
        };
      </script>
    </body>
    </html>
  `);

  await page.waitForTimeout(2000);

  // Execute commands with realistic output
  for (const { command, description, duration } of CLI_COMMANDS) {
    await page.evaluate(
      (cmd, desc) => {
        window.addCommand(cmd, desc);
      },
      command,
      description,
    );

    await page.waitForTimeout(1000);

    // Add realistic command output based on command type
    if (command.includes("--help")) {
      await page.evaluate(() => {
        window.addOutput(`Usage: neurolink [options] [command]

Options:
  -h, --help       display help for command
  -v, --version    display version number

Commands:
  generate-text <prompt>    Generate AI text content
  stream <prompt>           Stream AI text generation
  batch <file>              Process multiple prompts
  status                    Check provider connectivity
  get-best-provider         Show auto-selected provider
  mcp                       Manage MCP servers
  help [command]            display help for command`);
      });
    } else if (command.includes("status")) {
      await page.evaluate(() => {
        window.addOutput(`🔍 Checking AI provider status...

✅ openai: ✅ Working (234ms)
✅ bedrock: ✅ Working (456ms)
✅ vertex: ✅ Working (321ms)

📊 Summary: 3/3 providers working`);
      });
    } else if (command.includes("get-best-provider")) {
      await page.evaluate(() => {
        window.addOutput(`🎯 Finding best provider...
✅ Best provider: openai`);
      });
    } else if (command.includes("mcp list")) {
      await page.evaluate(() => {
        window.addOutput(`📋 Configured MCP servers (2):

🔧 filesystem
   Command: npx -y @modelcontextprotocol/server-filesystem
   Transport: stdio

🔧 github
   Command: npx @modelcontextprotocol/server-github
   Transport: stdio`);
      });
    }

    await page.waitForTimeout(duration - 1000);
  }

  // Final summary
  await page.evaluate(() => {
    window.addOutput(
      "\n✅ CLI Overview Complete - All core commands demonstrated!",
    );
  });

  await page.waitForTimeout(3000);

  await browser.close();

  console.log("✅ CLI Overview video recorded!");

  // Find the generated video file and rename it
  const files = fs.readdirSync(OUTPUT_DIR);
  const videoFile = files.find((f) => f.endsWith(".webm"));

  if (videoFile) {
    const oldPath = path.join(OUTPUT_DIR, videoFile);
    const newPath = path.join(OUTPUT_DIR, "cli-overview-demo.webm");
    fs.renameSync(oldPath, newPath);
    console.log(`📹 Video saved as: ${newPath}`);

    // Convert to MP4 for universal compatibility
    const { execSync } = require("child_process");
    const mp4Path = newPath.replace(".webm", ".mp4");

    try {
      console.log("🔄 Converting to MP4...");
      execSync(
        `ffmpeg -i "${newPath}" -c:v libx264 -preset medium -crf 23 -c:a aac -b:a 128k "${mp4Path}" -y`,
        { stdio: "inherit" },
      );
      console.log(`✅ MP4 version saved: ${mp4Path}`);
    } catch (error) {
      console.log("⚠️ MP4 conversion failed, WebM version available");
    }
  }
}

if (require.main === module) {
  createCLIOverviewVideo().catch(console.error);
}

module.exports = { createCLIOverviewVideo };
