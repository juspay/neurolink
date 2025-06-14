#!/usr/bin/env node

/**
 * NeuroLink Comprehensive Demo Video Creator
 * Creates videos showing different use cases for the NeuroLink SDK
 */

import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const BASE_URL = "http://localhost:9876";
const VIDEOS_DIR = "./videos";
const DELAY_BETWEEN_ACTIONS = 3000; // 3 seconds for better visibility

// Ensure videos directory exists
if (!fs.existsSync(VIDEOS_DIR)) {
  fs.mkdirSync(VIDEOS_DIR, { recursive: true });
}

async function createVideo(name, actions) {
  console.log(`🎬 Creating video: ${name}`);

  const browser = await chromium.launch({
    headless: false,
    slowMo: 800,
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: {
      dir: VIDEOS_DIR,
      size: { width: 1920, height: 1080 },
    },
  });

  const page = await context.newPage();

  try {
    // Navigate to demo
    await page.goto(BASE_URL);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(DELAY_BETWEEN_ACTIONS);

    // Execute the provided actions
    for (const action of actions) {
      console.log(`  ▶️ ${action.description}`);
      await action.execute(page);
      await page.waitForTimeout(DELAY_BETWEEN_ACTIONS);
    }

    // Wait a bit before ending
    await page.waitForTimeout(4000);
  } catch (error) {
    console.error(`❌ Error in video ${name}:`, error);
  } finally {
    await context.close();
    await browser.close();

    // Rename the video file to proper name
    const videoFiles = fs
      .readdirSync(VIDEOS_DIR)
      .filter((f) => f.endsWith(".webm"));
    if (videoFiles.length > 0) {
      const latestVideo = videoFiles[videoFiles.length - 1];
      const newName = `${name}.webm`;
      fs.renameSync(
        path.join(VIDEOS_DIR, latestVideo),
        path.join(VIDEOS_DIR, newName),
      );
      console.log(`✅ Video saved as: ${newName}`);
    }
  }
}

// 1. Basic Examples - Core SDK functionality (including Google AI Studio)
const basicExamplesActions = [
  {
    description:
      "Show main interface and provider selection including Google AI Studio",
    execute: async (page) => {
      await page.waitForSelector("#basic-provider", { timeout: 5000 });
      await page.hover("h1");
      await page.waitForTimeout(1000);

      // Show provider options including Google AI Studio
      await page.click("#basic-provider");
      await page.waitForTimeout(1000);

      // First show Google AI Studio option
      const hasGoogleAI =
        (await page.locator('option[value="google-ai"]').count()) > 0;
      if (hasGoogleAI) {
        await page.selectOption("#basic-provider", "google-ai");
        await page.waitForTimeout(1500);
      }

      // Then show auto-selection
      await page.selectOption("#basic-provider", "auto");
    },
  },
  {
    description: "Demo simple text generation",
    execute: async (page) => {
      await page.fill(
        "#basic-prompt",
        "Write a creative short story about an AI helping humans solve climate change.",
      );
      await page.click('button:text("Generate Text")');
      await page.waitForSelector("#basic-output:not(:empty)", {
        timeout: 15000,
      });
    },
  },
];

// 2. Business Use Cases - Professional applications
const businessUseCasesActions = [
  {
    description: "Generate marketing email",
    execute: async (page) => {
      await page.click('.tab:text("Business Use Cases")');
      await page.fill(
        "#email-context",
        `New product launch announcement for our AI-powered analytics tool.`,
      );
      await page.selectOption("#email-type", "marketing");
      await page.click('button:text("Generate Email")');
      await page.waitForSelector("#email-output:not(:empty)", {
        timeout: 15000,
      });
    },
  },
  {
    description: "Analyze business data",
    execute: async (page) => {
      await page.click('.tab:text("Business Use Cases")');
      await page.fill(
        "#data-input",
        `Product,Sales,Month
Widget A,1500,January
Widget B,2300,January
Widget C,1200,January`,
      );
      await page.click('button:text("Analyze Data")');
      await page.waitForSelector("#data-output:not(:empty)", {
        timeout: 15000,
      });
    },
  },
  {
    description: "Create executive summary",
    execute: async (page) => {
      await page.click('.tab:text("Business Use Cases")');
      await page.fill(
        "#doc-text",
        `Artificial Intelligence (AI) has revolutionized numerous industries by automating complex tasks and providing insights that were previously impossible to obtain. Machine learning algorithms can analyze vast datasets to identify patterns, make predictions, and drive decision-making processes. From healthcare diagnostics to financial fraud detection, AI applications continue to expand rapidly across sectors.`,
      );
      await page.selectOption("#summary-length", "brief");
      await page.click('button:text("Summarize")');
      await page.waitForSelector("#doc-output:not(:empty)", { timeout: 15000 });
    },
  },
];

// 3. Creative Tools - Content creation and writing
const creativeToolsActions = [
  {
    description: "Generate creative story",
    execute: async (page) => {
      await page.click('.tab:text("Creative Tools")');
      await page.fill(
        "#writing-prompt",
        `A time traveler discovers they can only travel to moments of great historical significance.`,
      );
      await page.selectOption("#writing-type", "story");
      await page.click('button:text("Create Content")');
      await page.waitForSelector("#writing-output:not(:empty)", {
        timeout: 30000,
      });
    },
  },
  {
    description: "Translate content",
    execute: async (page) => {
      await page.click('.tab:text("Creative Tools")');
      await page.fill(
        "#translate-text",
        `Hello, how are you today? I hope you're having a wonderful day!`,
      );
      await page.selectOption("#target-language", "spanish");
      await page.click('button:text("Translate")');
      await page.waitForSelector("#translate-output:not(:empty)", {
        timeout: 30000,
      });
    },
  },
  {
    description: "Generate content ideas",
    execute: async (page) => {
      await page.click('.tab:text("Creative Tools")');
      await page.fill("#content-topic", `artificial intelligence`);
      await page.selectOption("#content-type", "blog");
      await page.click('button:text("Generate Ideas")');
      await page.waitForSelector("#content-output:not(:empty)", {
        timeout: 30000,
      });
    },
  },
];

// 4. Developer Tools - Code and technical content
const developerToolsActions = [
  {
    description: "Generate React component code",
    execute: async (page) => {
      await page.click('.tab:text("Developer Tools")');
      await page.fill(
        "#code-description",
        `Create a function that validates email addresses using regex and returns true/false.`,
      );
      await page.selectOption("#code-language", "javascript");
      await page.click('button:text("Generate Code")');
      await page.waitForSelector("#code-output:not(:empty)", {
        timeout: 30000,
      });
    },
  },
  {
    description: "Generate API documentation",
    execute: async (page) => {
      await page.click('.tab:text("Developer Tools")');
      await page.fill(
        "#api-description",
        `A REST API for managing user accounts with endpoints for creating, reading, updating, and deleting users.`,
      );
      await page.click('button:text("Generate Documentation")');
      await page.waitForSelector("#api-output:not(:empty)", { timeout: 30000 });
    },
  },
  {
    description: "Debug error analysis",
    execute: async (page) => {
      await page.click('.tab:text("Developer Tools")');
      await page.fill(
        "#debug-input",
        `TypeError: Cannot read property 'map' of undefined
  at UserList.render (UserList.js:15:23)`,
      );
      await page.click('button:text("Analyze Error")');
      await page.waitForSelector("#debug-output:not(:empty)", {
        timeout: 30000,
      });
    },
  },
];

// 5. Performance & Monitoring - SDK capabilities demonstration
const monitoringActions = [
  {
    description: "Run performance benchmark",
    execute: async (page) => {
      await page.click('.tab:text("Basic Examples")');
      await page.click('button:text("Run Benchmark")');
      await page.waitForSelector("#benchmark-output:not(:empty)", {
        timeout: 30000,
      });
    },
  },
  {
    description: "Check provider status and configuration",
    execute: async (page) => {
      await page.click('.tab:text("Monitoring")');
      await page.click('button:text("Check All Providers")');
      await page.waitForSelector("#provider-status:not(:empty)", {
        timeout: 30000,
      });
    },
  },
];

// Main execution
async function createAllVideos() {
  console.log("🎬 Starting NeuroLink Comprehensive Demo Video Creation...\n");

  const videos = [
    { name: "basic-examples", actions: basicExamplesActions },
    { name: "business-use-cases", actions: businessUseCasesActions },
    { name: "creative-tools", actions: creativeToolsActions },
    { name: "developer-tools", actions: developerToolsActions },
    { name: "monitoring-analytics", actions: monitoringActions },
  ];

  for (const video of videos) {
    await createVideo(video.name, video.actions);
    // Wait between videos
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }

  console.log("\n🎉 All comprehensive demo videos created successfully!");
  console.log(`📂 Videos saved in: ${VIDEOS_DIR}`);
  console.log("\n📋 Created videos:");
  console.log("- basic-examples.webm - Core SDK functionality");
  console.log("- business-use-cases.webm - Professional applications");
  console.log("- creative-tools.webm - Content creation and writing");
  console.log("- developer-tools.webm - Code generation and debugging");
  console.log(
    "- monitoring-analytics.webm - Performance and provider management",
  );
}

// Check if server is running
async function checkServer() {
  try {
    const response = await fetch(BASE_URL);
    if (response.ok) {
      console.log("✅ Demo server is running");
      return true;
    }
  } catch (error) {
    console.error("❌ Demo server is not running. Please start it first:");
    console.error("   cd neurolink-demo && node server.js");
    return false;
  }
}

// Run the video creation
if (await checkServer()) {
  await createAllVideos();
} else {
  process.exit(1);
}
