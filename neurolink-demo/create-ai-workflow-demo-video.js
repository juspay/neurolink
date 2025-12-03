import { chromium } from "playwright";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const VIDEOS_DIR = path.join(__dirname, "videos");
const DELAY_BETWEEN_ACTIONS = 2000;

async function createAIWorkflowDemoVideo() {
  console.log("🎬 Creating AI Development Workflow Tools Demo Video...");

  const browser = await chromium.launch({
    headless: false,
    slowMo: 1000,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: {
      dir: path.join(VIDEOS_DIR, "ai-workflow-tools-demo"),
      size: { width: 1920, height: 1080 },
    },
  });

  const page = await context.newPage();

  try {
    // Navigate to demo application
    console.log("📍 Navigating to NeuroLink Demo...");
    await page.goto("http://localhost:9876");
    await page.waitForTimeout(DELAY_BETWEEN_ACTIONS);

    // Take screenshot of overview
    await page.screenshot({
      path: path.join(__dirname, "screenshots", "08-ai-workflow-overview.png"),
      fullPage: false,
    });

    // Scroll to AI Workflow Tools section
    console.log("📜 Scrolling to AI Development Workflow Tools...");
    await page.evaluate(() => {
      const workflowSection = Array.from(document.querySelectorAll("*")).find(
        (el) =>
          el.textContent &&
          el.textContent.includes("AI Development Workflow Tools"),
      );
      if (workflowSection) {
        workflowSection.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        window.scrollTo({ top: window.innerHeight * 2, behavior: "smooth" });
      }
    });
    await page.waitForTimeout(DELAY_BETWEEN_ACTIONS);

    // Screenshot of AI workflow tools
    await page.screenshot({
      path: path.join(__dirname, "screenshots", "09-ai-workflow-tools.png"),
      fullPage: false,
    });

    // Test Generate Test Cases tool
    console.log("🧪 Testing Generate Test Cases tool...");
    const testCasesButton = page
      .locator('button:has-text("Generate Test Cases")')
      .first();
    if (await testCasesButton.isVisible()) {
      await testCasesButton.click();
      await page.waitForTimeout(DELAY_BETWEEN_ACTIONS);

      await page.screenshot({
        path: path.join(__dirname, "screenshots", "10-test-cases-result.png"),
        fullPage: false,
      });
    }

    // Scroll to Code Refactoring
    console.log("🔧 Testing Code Refactoring tool...");
    await page.evaluate(() => window.scrollBy(0, 300));
    await page.waitForTimeout(1000);

    const refactorButton = page
      .locator('button:has-text("Refactor Code")')
      .first();
    if (await refactorButton.isVisible()) {
      await refactorButton.click();
      await page.waitForTimeout(DELAY_BETWEEN_ACTIONS);

      await page.screenshot({
        path: path.join(
          __dirname,
          "screenshots",
          "11-refactor-code-result.png",
        ),
        fullPage: false,
      });
    }

    // Scroll to Documentation Generation
    console.log("📚 Testing Documentation Generation tool...");
    await page.evaluate(() => window.scrollBy(0, 400));
    await page.waitForTimeout(1000);

    const docsButton = page
      .locator('button:has-text("Generate Documentation")')
      .first();
    if (await docsButton.isVisible()) {
      await docsButton.click();
      await page.waitForTimeout(DELAY_BETWEEN_ACTIONS);

      await page.screenshot({
        path: path.join(
          __dirname,
          "screenshots",
          "12-documentation-result.png",
        ),
        fullPage: false,
      });
    }

    // Test AI Output Debugging
    console.log("🐛 Testing AI Output Debugging tool...");
    const debugButton = page
      .locator('button:has-text("Debug AI Output")')
      .first();
    if (await debugButton.isVisible()) {
      await debugButton.click();
      await page.waitForTimeout(DELAY_BETWEEN_ACTIONS);

      await page.screenshot({
        path: path.join(__dirname, "screenshots", "13-debug-output-result.png"),
        fullPage: false,
      });
    }

    console.log(
      "✅ AI Workflow Tools Demo Video recording completed successfully!",
    );
  } catch (error) {
    console.error("❌ Error during demo recording:", error);
  } finally {
    await context.close();
    await browser.close();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  createAIWorkflowDemoVideo().catch(console.error);
}

export { createAIWorkflowDemoVideo };
