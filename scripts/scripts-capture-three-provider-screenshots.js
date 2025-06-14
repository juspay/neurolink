import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SCREENSHOTS_DIR = path.join(
  __dirname,
  "../neurolink-demo/screenshots/three-providers",
);

// Ensure directory exists
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function captureScreenshots() {
  console.log("🎬 Starting screenshot capture for three new providers...");

  const browser = await chromium.launch({
    headless: false,
    viewport: { width: 1920, height: 1080 },
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
  });

  const page = await context.newPage();

  try {
    // Navigate to demo
    console.log("📸 Navigating to demo...");
    await page.goto("http://localhost:9876");
    await page.waitForTimeout(2000);

    // 1. Main page with all 9 providers showing
    console.log("📸 Capturing main page with 9 providers...");
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, "01-nine-providers-overview.png"),
      fullPage: false,
    });

    // 2. Provider dropdown showing all 9 providers
    console.log("📸 Capturing provider dropdown...");
    await page.click("select#provider");
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, "02-provider-dropdown-all-nine.png"),
      fullPage: false,
    });

    // 3. Provider status with all green checkmarks
    console.log("📸 Capturing provider status...");
    await page.click('button:has-text("Check All Providers")');
    await page.waitForTimeout(3000);
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, "03-all-providers-available.png"),
      fullPage: false,
    });

    // 4. Hugging Face generation
    console.log("📸 Testing Hugging Face provider...");
    await page.selectOption("select#provider", "huggingface");
    await page.fill(
      "textarea#prompt",
      "What are the benefits of open source AI models?",
    );
    await page.click('button:has-text("Generate Text")');
    await page.waitForTimeout(5000);
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, "04-huggingface-generation.png"),
      fullPage: false,
    });

    // 5. Ollama generation
    console.log("📸 Testing Ollama provider...");
    await page.selectOption("select#provider", "ollama");
    await page.fill(
      "textarea#prompt",
      "Explain the importance of local AI for privacy.",
    );
    await page.click('button:has-text("Generate Text")');
    await page.waitForTimeout(5000);
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, "05-ollama-generation.png"),
      fullPage: false,
    });

    // 6. Mistral generation
    console.log("📸 Testing Mistral AI provider...");
    await page.selectOption("select#provider", "mistral");
    await page.fill(
      "textarea#prompt",
      "Traduire en français: AI is transforming the world.",
    );
    await page.click('button:has-text("Generate Text")');
    await page.waitForTimeout(5000);
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, "06-mistral-generation.png"),
      fullPage: false,
    });

    console.log("✅ All screenshots captured successfully!");
    console.log(`📁 Screenshots saved to: ${SCREENSHOTS_DIR}`);
  } catch (error) {
    console.error("❌ Error capturing screenshots:", error);
  } finally {
    await browser.close();
  }
}

// Run the capture
captureScreenshots().catch(console.error);
