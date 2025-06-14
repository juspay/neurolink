import puppeteer from "puppeteer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create screenshots directory
const screenshotsDir = path.join(
  __dirname,
  "../docs/visual-content/screenshots/phase-1-2-workflow",
);
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

async function captureScreenshots() {
  console.log("🎬 Starting Phase 1.2 AI Workflow Demo screenshot capture...");

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1920, height: 1080 },
  });

  const page = await browser.newPage();

  try {
    // Navigate to the demo page
    await page.goto("http://localhost:3002/ai-workflow-demo.html", {
      waitUntil: "networkidle0",
    });

    // Wait for page to fully load
    await page.waitForTimeout(2000);

    // 1. Capture overview with all 4 tools visible
    console.log("📸 Capturing Phase 1.2 Overview...");
    await page.screenshot({
      path: path.join(screenshotsDir, "01-phase-1-2-overview.png"),
      fullPage: false,
    });

    // 2. Test Generate Test Cases tool
    console.log("📸 Capturing Generate Test Cases tool...");
    await page.click('button:has-text("Generate Test Cases")');
    await page.waitForTimeout(100);
    await page.screenshot({
      path: path.join(screenshotsDir, "02-generate-test-cases-in-progress.png"),
      fullPage: false,
    });

    // Wait for completion
    await page.waitForSelector("text=Test cases generated successfully", {
      timeout: 30000,
    });
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(screenshotsDir, "03-generate-test-cases-success.png"),
      fullPage: false,
    });

    // Scroll down to see Refactor Code tool
    await page.evaluate(() => window.scrollBy(0, 600));
    await page.waitForTimeout(500);

    // 3. Test Refactor Code tool
    console.log("📸 Capturing Refactor Code tool...");
    await page.click('button:has-text("Refactor Code")');
    await page.waitForTimeout(100);
    await page.screenshot({
      path: path.join(screenshotsDir, "04-refactor-code-in-progress.png"),
      fullPage: false,
    });

    // Wait for completion
    await page.waitForSelector("text=Code refactored successfully", {
      timeout: 30000,
    });
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(screenshotsDir, "05-refactor-code-success.png"),
      fullPage: false,
    });

    // Scroll down to see Generate Documentation tool
    await page.evaluate(() => window.scrollBy(0, 600));
    await page.waitForTimeout(500);

    // 4. Test Generate Documentation tool
    console.log("📸 Capturing Generate Documentation tool...");
    await page.click('button:has-text("Generate Documentation")');
    await page.waitForTimeout(100);
    await page.screenshot({
      path: path.join(
        screenshotsDir,
        "06-generate-documentation-in-progress.png",
      ),
      fullPage: false,
    });

    // Wait for completion
    await page.waitForSelector("text=Documentation generated successfully", {
      timeout: 30000,
    });
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(screenshotsDir, "07-generate-documentation-success.png"),
      fullPage: false,
    });

    // Scroll down to see Debug AI Output tool
    await page.evaluate(() => window.scrollBy(0, 600));
    await page.waitForTimeout(500);

    // 5. Test Debug AI Output tool
    console.log("📸 Capturing Debug AI Output tool...");
    await page.click('button:has-text("Debug AI Output")');
    await page.waitForTimeout(100);
    await page.screenshot({
      path: path.join(screenshotsDir, "08-debug-ai-output-in-progress.png"),
      fullPage: false,
    });

    // Wait for completion
    await page.waitForSelector("text=Analysis completed", { timeout: 30000 });
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(screenshotsDir, "09-debug-ai-output-success.png"),
      fullPage: false,
    });

    // 6. Scroll to see Complete Workflow Integration Demo
    await page.evaluate(() => window.scrollBy(0, 600));
    await page.waitForTimeout(500);
    console.log("📸 Capturing Complete Workflow Integration Demo...");
    await page.screenshot({
      path: path.join(screenshotsDir, "10-complete-workflow-demo.png"),
      fullPage: false,
    });

    console.log("✅ All Phase 1.2 screenshots captured successfully!");
    console.log(`📁 Screenshots saved to: ${screenshotsDir}`);
  } catch (error) {
    console.error("❌ Error capturing screenshots:", error);
  } finally {
    await browser.close();
  }
}

// Run the screenshot capture
captureScreenshots().catch(console.error);
