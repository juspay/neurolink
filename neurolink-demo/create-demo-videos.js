#!/usr/bin/env node

/**
 * NeuroLink Demo Video Creator
 * Automated script to record demonstration videos of all features
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:3000';
const VIDEOS_DIR = './videos';
const DELAY_BETWEEN_ACTIONS = 2000; // 2 seconds

// Ensure videos directory exists
if (!fs.existsSync(VIDEOS_DIR)) {
  fs.mkdirSync(VIDEOS_DIR, { recursive: true });
}

async function createVideo(name, actions) {
  console.log(`🎬 Creating video: ${name}`);

  const browser = await chromium.launch({
    headless: false, // Show browser for recording
    slowMo: 1000 // Slow down for better recording
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: {
      dir: path.join(VIDEOS_DIR, name),
      size: { width: 1920, height: 1080 }
    }
  });

  const page = await context.newPage();

  try {
    // Navigate to demo
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(DELAY_BETWEEN_ACTIONS);

    // Execute the provided actions
    for (const action of actions) {
      console.log(`  ▶️ ${action.description}`);
      await action.execute(page);
      await page.waitForTimeout(DELAY_BETWEEN_ACTIONS);
    }

    // Wait a bit before ending
    await page.waitForTimeout(3000);

  } catch (error) {
    console.error(`❌ Error in video ${name}:`, error);
  } finally {
    await context.close();
    await browser.close();
    console.log(`✅ Video ${name} completed`);
  }
}

// Video 1: Basic Examples Overview
const basicExamplesActions = [
  {
    description: "Show main interface and metrics",
    execute: async (page) => {
      // Already on main page, just highlight metrics
      await page.hover('#total-requests');
      await page.waitForTimeout(1000);
      await page.hover('#active-providers');
      await page.waitForTimeout(1000);
      await page.hover('#total-tokens');
    }
  },
  {
    description: "Test AI Provider generation",
    execute: async (page) => {
      await page.fill('#basic-prompt', 'Write a creative story about a robot learning to paint.');
      await page.selectOption('#basic-provider', 'auto');
      await page.click('button:text("Generate Text")');
      await page.waitForSelector('#basic-output:not(:empty)', { timeout: 30000 });
    }
  },
  {
    description: "Show schema validation",
    execute: async (page) => {
      await page.selectOption('#schema-type', 'user-profile');
      await page.click('button:text("Generate Data")');
      await page.waitForSelector('#schema-output:not(:empty)', { timeout: 30000 });
    }
  },
  {
    description: "Run performance benchmark",
    execute: async (page) => {
      await page.click('button:text("Run Benchmark")');
      await page.waitForSelector('#benchmark-output:not(:empty)', { timeout: 45000 });
    }
  }
];

// Video 2: Business Use Cases
const businessUseCasesActions = [
  {
    description: "Navigate to Business Use Cases tab",
    execute: async (page) => {
      await page.click('div.tab:has-text("Business Use Cases")');
    }
  },
  {
    description: "Generate marketing email",
    execute: async (page) => {
      await page.selectOption('#email-type', 'marketing');
      await page.fill('#email-context', 'Launch of our new AI-powered project management tool that helps teams collaborate better.');
      await page.click('button:text("Generate Email")');
      await page.waitForSelector('#email-output:not(:empty)', { timeout: 30000 });
    }
  },
  {
    description: "Analyze sample data",
    execute: async (page) => {
      const csvData = `Product,Sales,Month,Region
AI Dashboard,15000,January,North America
ML Analytics,23000,January,Europe
Data Insights,12000,January,Asia
AI Dashboard,18000,February,North America
ML Analytics,25000,February,Europe`;
      await page.fill('#data-input', csvData);
      await page.click('button:text("Analyze Data")');
      await page.waitForSelector('#data-output:not(:empty)', { timeout: 30000 });
    }
  },
  {
    description: "Create document summary",
    execute: async (page) => {
      const longText = `Artificial Intelligence has revolutionized modern business operations by automating complex decision-making processes and providing unprecedented insights from data analysis. Companies across industries are leveraging AI to improve customer experience, optimize supply chains, and drive innovation. Machine learning algorithms can process vast amounts of information in real-time, identifying patterns and trends that would be impossible for humans to detect manually. This technological advancement has created new opportunities for competitive advantage while also presenting challenges in terms of implementation, ethics, and workforce adaptation.`;
      await page.fill('#doc-text', longText);
      await page.selectOption('#summary-length', 'detailed');
      await page.click('button:text("Summarize")');
      await page.waitForSelector('#doc-output:not(:empty)', { timeout: 30000 });
    }
  }
];

// Video 3: Creative Tools Showcase
const creativeToolsActions = [
  {
    description: "Navigate to Creative Tools tab",
    execute: async (page) => {
      await page.click('div.tab:has-text("Creative Tools")');
    }
  },
  {
    description: "Generate creative story",
    execute: async (page) => {
      await page.selectOption('#writing-type', 'story');
      await page.fill('#writing-prompt', 'A time traveler discovers they can only visit moments when someone is making a life-changing decision.');
      await page.click('button:text("Create Content")');
      await page.waitForSelector('#writing-output:not(:empty)', { timeout: 30000 });
    }
  },
  {
    description: "Translate text to Spanish",
    execute: async (page) => {
      await page.fill('#translate-text', 'Welcome to the future of artificial intelligence! Our platform makes AI accessible to everyone.');
      await page.selectOption('#target-language', 'spanish');
      await page.click('button:text("Translate")');
      await page.waitForSelector('#translate-output:not(:empty)', { timeout: 30000 });
    }
  },
  {
    description: "Generate content ideas",
    execute: async (page) => {
      await page.selectOption('#content-type', 'blog');
      await page.fill('#content-topic', 'sustainable technology');
      await page.click('button:text("Generate Ideas")');
      await page.waitForSelector('#content-output:not(:empty)', { timeout: 30000 });
    }
  }
];

// Video 4: Developer Tools Demo
const developerToolsActions = [
  {
    description: "Navigate to Developer Tools tab",
    execute: async (page) => {
      await page.click('div.tab:has-text("Developer Tools")');
    }
  },
  {
    description: "Generate JavaScript code",
    execute: async (page) => {
      await page.selectOption('#code-language', 'javascript');
      await page.fill('#code-description', 'Create a React component that displays a user profile card with avatar, name, email, and status indicator.');
      await page.click('button:text("Generate Code")');
      await page.waitForSelector('#code-output:not(:empty)', { timeout: 30000 });
    }
  },
  {
    description: "Generate API documentation",
    execute: async (page) => {
      await page.fill('#api-description', 'A RESTful API for managing blog posts with CRUD operations, authentication, and search functionality.');
      await page.click('button:text("Generate Documentation")');
      await page.waitForSelector('#api-output:not(:empty)', { timeout: 30000 });
    }
  },
  {
    description: "Debug error analysis",
    execute: async (page) => {
      const errorCode = `TypeError: Cannot read property 'map' of undefined
  at UserList.render (UserList.jsx:25:12)
  at processChild (/node_modules/react-dom/cjs/react-dom-server.node.development.js:3353:14)
  at resolve (/node_modules/react-dom/cjs/react-dom-server.node.development.js:3270:5)`;
      await page.fill('#debug-input', errorCode);
      await page.click('button:text("Analyze Error")');
      await page.waitForSelector('#debug-output:not(:empty)', { timeout: 30000 });
    }
  }
];

// Video 5: Monitoring and Analytics
const monitoringActions = [
  {
    description: "Navigate to Monitoring tab",
    execute: async (page) => {
      await page.click('div.tab:has-text("Monitoring")');
    }
  },
  {
    description: "Load usage analytics",
    execute: async (page) => {
      await page.click('button:text("Refresh Analytics")');
      await page.waitForSelector('#analytics-output:not(:empty)', { timeout: 10000 });
    }
  },
  {
    description: "Check provider status",
    execute: async (page) => {
      await page.click('button:text("Check All Providers")');
      await page.waitForSelector('#provider-status:not(:empty)', { timeout: 10000 });
    }
  }
];

// Main execution
async function createAllVideos() {
  console.log('🎬 Starting NeuroLink Demo Video Creation...\n');

  const videos = [
    { name: 'basic-examples', actions: basicExamplesActions },
    { name: 'business-use-cases', actions: businessUseCasesActions },
    { name: 'creative-tools', actions: creativeToolsActions },
    { name: 'developer-tools', actions: developerToolsActions },
    { name: 'monitoring', actions: monitoringActions }
  ];

  for (const video of videos) {
    await createVideo(video.name, video.actions);
    // Wait between videos
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  console.log('\n🎉 All demo videos created successfully!');
  console.log(`📂 Videos saved in: ${VIDEOS_DIR}`);
}

// Check if server is running
async function checkServer() {
  try {
    const response = await fetch(BASE_URL);
    if (response.ok) {
      console.log('✅ Demo server is running');
      return true;
    }
  } catch (error) {
    console.error('❌ Demo server is not running. Please start it first:');
    console.error('   cd neurolink-demo && node working-demo-server.js');
    return false;
  }
}

// Run the video creation
if (await checkServer()) {
  await createAllVideos();
} else {
  process.exit(1);
}
