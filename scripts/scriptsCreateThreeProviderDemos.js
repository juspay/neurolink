import { chromium } from "playwright";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ROOT = path.join(__dirname, "..");
const DEMO_SERVER_URL = "http://localhost:9876";
const VIDEOS_DIR = path.join(
  PROJECT_ROOT,
  "neurolink-demo",
  "videos",
  "three-providers",
);
const SCREENSHOTS_DIR = path.join(
  PROJECT_ROOT,
  "neurolink-demo",
  "screenshots",
  "three-providers",
);

// Ensure directories exist
await fs.mkdir(VIDEOS_DIR, { recursive: true });
await fs.mkdir(SCREENSHOTS_DIR, { recursive: true });

// Demo prompts for each provider
const PROVIDER_DEMOS = {
  huggingface: {
    name: "Hugging Face",
    prompt: "Generate a creative story about open source AI",
    description: "Access to 100,000+ community models",
    color: "#FFD21E", // Hugging Face yellow
  },
  ollama: {
    name: "Ollama",
    prompt: "Explain the benefits of local AI execution",
    description: "Complete privacy with local models",
    color: "#000000", // Ollama black
  },
  mistral: {
    name: "Mistral AI",
    prompt: "Write a poem in French and English",
    description: "European GDPR-compliant AI service",
    color: "#FF5252", // Mistral red
  },
};

async function createProviderDemo(browser, provider, config) {
  console.log(`\n📹 Creating demo for ${config.name}...`);

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: {
      dir: path.join(VIDEOS_DIR),
      size: { width: 1920, height: 1080 },
    },
  });

  const page = await context.newPage();

  try {
    // Navigate to demo page
    await page.goto(DEMO_SERVER_URL);
    await page.waitForTimeout(2000);

    // Take initial screenshot showing all 9 providers
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, `01-${provider}-all-providers.png`),
      fullPage: false,
    });

    // Select the provider
    const providerButton = page
      .locator(`button:has-text("${config.name}")`)
      .first();
    if ((await providerButton.count()) === 0) {
      // Try dropdown selection
      await page.selectOption("select#provider", provider);
    } else {
      await providerButton.click();
    }
    await page.waitForTimeout(1000);

    // Take screenshot after provider selection
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, `02-${provider}-selected.png`),
      fullPage: false,
    });

    // Enter the prompt
    await page.fill('textarea[name="prompt"], textarea#prompt', config.prompt);
    await page.waitForTimeout(500);

    // Take screenshot with prompt entered
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, `03-${provider}-prompt-entered.png`),
      fullPage: false,
    });

    // Click generate button
    await page.click('button:has-text("Generate")');

    // Wait for response (with longer timeout for potentially slow providers)
    await page.waitForSelector('.result, #result, [data-testid="result"]', {
      timeout: 30000,
      state: "visible",
    });
    await page.waitForTimeout(2000);

    // Take final screenshot with results
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, `04-${provider}-results.png`),
      fullPage: false,
    });

    // Keep recording for a bit longer to show the results
    await page.waitForTimeout(3000);
  } catch (error) {
    console.error(`Error creating demo for ${config.name}:`, error);
    // Take error screenshot
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, `${provider}-error.png`),
      fullPage: false,
    });
  } finally {
    await context.close();
  }
}

async function create9ProviderScreenshot(browser) {
  console.log("\n📸 Creating 9-provider overview screenshot...");

  const page = await browser.newPage({
    viewport: { width: 1920, height: 1080 },
  });

  try {
    await page.goto(DEMO_SERVER_URL);
    await page.waitForTimeout(3000);

    // Take full overview screenshot
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, "00-all-9-providers-overview.png"),
      fullPage: false,
    });

    // Try to highlight provider count if visible
    const providerCount = await page.locator("text=/9 providers/i").first();
    if ((await providerCount.count()) > 0) {
      await providerCount.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);

      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, "00-all-9-providers-highlighted.png"),
        fullPage: false,
      });
    }
  } finally {
    await page.close();
  }
}

async function main() {
  console.log("🎬 NeuroLink Three-Provider Demo Creation");
  console.log("==========================================");

  // Check if demo server is running
  try {
    const response = await fetch(DEMO_SERVER_URL);
    if (!response.ok) {
      throw new Error("Demo server not responding");
    }
  } catch (error) {
    console.error("❌ Demo server is not running!");
    console.log("Please start the demo server first:");
    console.log("  cd neurolink-demo && npm install && npm start");
    process.exit(1);
  }

  const browser = await chromium.launch({
    headless: false, // Show browser for visual feedback
    slowMo: 500, // Slow down for better video quality
  });

  try {
    // Create 9-provider overview screenshot first
    await create9ProviderScreenshot(browser);

    // Create demos for each new provider
    for (const [provider, config] of Object.entries(PROVIDER_DEMOS)) {
      await createProviderDemo(browser, provider, config);
    }

    console.log("\n✅ Demo creation complete!");
    console.log(`📁 Videos saved to: ${VIDEOS_DIR}`);
    console.log(`📁 Screenshots saved to: ${SCREENSHOTS_DIR}`);
  } finally {
    await browser.close();
  }
}

// Run the demo creation
main().catch(console.error);
