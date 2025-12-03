import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const VIDEOS_DIR = path.join(
  __dirname,
  "../neurolink-demo/videos/three-providers",
);

// Ensure directory exists
if (!fs.existsSync(VIDEOS_DIR)) {
  fs.mkdirSync(VIDEOS_DIR, { recursive: true });
}

async function createProviderVideos() {
  console.log("🎬 Creating demo videos for three new providers...");

  // Create videos for each provider
  const providers = [
    {
      name: "huggingface",
      title: "Hugging Face - Open Source AI",
      prompts: [
        "What are the benefits of open source AI models?",
        "Explain transformer architecture in simple terms.",
        "How does community-driven AI development work?",
      ],
    },
    {
      name: "ollama",
      title: "Ollama - Local AI Privacy",
      prompts: [
        "Explain the importance of local AI for privacy.",
        "What are the advantages of running AI models locally?",
        "How does offline AI processing protect user data?",
      ],
    },
    {
      name: "mistral",
      title: "Mistral AI - European GDPR Compliance",
      prompts: [
        "Traduire en français: AI is transforming the world.",
        "Explain GDPR compliance in AI services.",
        "What makes European AI providers unique?",
      ],
    },
  ];

  for (const provider of providers) {
    console.log(`\n📹 Creating video for ${provider.title}...`);

    const browser = await chromium.launch({
      headless: false,
      viewport: { width: 1920, height: 1080 },
    });

    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      recordVideo: {
        dir: path.join(VIDEOS_DIR, provider.name),
        size: { width: 1920, height: 1080 },
      },
    });

    const page = await context.newPage();

    try {
      // Navigate to demo
      await page.goto("http://localhost:9876");
      await page.waitForTimeout(2000);

      // Select provider
      await page.selectOption("select#provider", provider.name);
      await page.waitForTimeout(1000);

      // Show provider status
      await page.click('button:has-text("Check All Providers")');
      await page.waitForTimeout(3000);

      // Generate content with each prompt
      for (const prompt of provider.prompts) {
        console.log(`  📝 Generating: ${prompt.substring(0, 50)}...`);

        // Clear and enter prompt
        await page.fill("textarea#prompt", "");
        await page.fill("textarea#prompt", prompt);
        await page.waitForTimeout(500);

        // Generate
        await page.click('button:has-text("Generate Text")');

        // Wait for response (longer for some providers)
        const waitTime =
          provider.name === "huggingface"
            ? 8000
            : provider.name === "ollama"
              ? 6000
              : 10000; // Mistral
        await page.waitForTimeout(waitTime);

        // Scroll to show result
        await page.evaluate(() => {
          const resultDiv = document.querySelector(".bg-green-50, .bg-red-50");
          if (resultDiv) {
            resultDiv.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        });
        await page.waitForTimeout(2000);
      }

      // Final showcase
      await page.waitForTimeout(2000);
    } catch (error) {
      console.error(`❌ Error creating video for ${provider.name}:`, error);
    } finally {
      await context.close();
      await browser.close();

      // Move and rename video
      const videoDir = path.join(VIDEOS_DIR, provider.name);
      const videos = fs
        .readdirSync(videoDir)
        .filter((f) => f.endsWith(".webm"));
      if (videos.length > 0) {
        const oldPath = path.join(videoDir, videos[0]);
        const newPath = path.join(VIDEOS_DIR, `${provider.name}-demo.webm`);
        fs.renameSync(oldPath, newPath);
        fs.rmdirSync(videoDir, { recursive: true });
        console.log(`  ✅ Video saved: ${provider.name}-demo.webm`);
      }
    }
  }

  console.log("\n✅ All demo videos created successfully!");
  console.log(`📁 Videos saved to: ${VIDEOS_DIR}`);
}

// Run the video creation
createProviderVideos().catch(console.error);
