/**
 * Image Generation Examples for NeuroLink
 * Demonstrates various image generation capabilities using Gemini models
 *
 * Run with: npx tsx examples/image-generation.ts
 *
 * Prerequisites:
 * - Set up Google Vertex AI credentials (GOOGLE_APPLICATION_CREDENTIALS or .vertex-credentials.json)
 *   OR Google AI Studio API key (GOOGLE_AI_STUDIO_API_KEY)
 * - Ensure output directory exists or will be created automatically
 *
 * Supported Providers:
 * - vertex (Google Vertex AI) - requires GCP credentials
 * - google-ai (Google AI Studio) - requires API key
 *
 * Supported Models:
 * - gemini-2.5-flash-image (GA - fast image generation)
 * - gemini-3-pro-image-preview (Preview - 4K, thinking mode, PDF input support)
 */

import { NeuroLink } from "@juspay/neurolink";
import * as fs from "fs";
import * as path from "path";

const neurolink = new NeuroLink();

// Provider configuration (change as needed)
const PROVIDER = "vertex"; // or "google-ai"
const MODEL = "gemini-2.5-flash-image"; // or "gemini-3-pro-image-preview"

// Output directory for generated images
const OUTPUT_DIR = "./examples/data/generated-images";

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * Example 1: Basic Image Generation
 * Generates a simple image from a text prompt
 */
async function basicImageGeneration() {
  console.log("=== Example 1: Basic Image Generation ===\n");

  try {
    const result = await neurolink.generate({
      input: {
        text: "A serene mountain landscape at sunset with snow-capped peaks reflecting in a calm lake",
      },
      provider: PROVIDER,
      model: MODEL,
    });

    if (result?.imageOutput?.base64) {
      const outputPath = path.join(OUTPUT_DIR, "basic-landscape.png");
      const imageBuffer = Buffer.from(result.imageOutput.base64, "base64");
      fs.writeFileSync(outputPath, imageBuffer);

      console.log("✅ Image generated successfully!");
      console.log(`   Saved to: ${outputPath}`);
      console.log(`   Size: ${(imageBuffer.length / 1024).toFixed(2)} KB`);
      if (result.content) {
        console.log(
          `   Model response: ${result.content.substring(0, 100)}...`,
        );
      }
    } else {
      console.log("❌ No image data in response");
      console.log("Response content:", result?.content);
    }

    console.log("\n" + "=".repeat(60) + "\n");
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error in Example 1:", errorMessage);
    console.log("\n" + "=".repeat(60) + "\n");
  }
}

/**
 * Example 2: Streaming Image Generation
 * Uses streaming mode (fake streaming for image models)
 */
async function streamingImageGeneration() {
  console.log("=== Example 2: Streaming Image Generation ===\n");

  try {
    const result = await neurolink.stream({
      input: {
        text: "A futuristic cityscape with flying cars and neon lights at night",
      },
      provider: PROVIDER,
      model: MODEL,
    });

    let imageReceived = false;
    let textContent = "";

    for await (const chunk of result.stream) {
      if ("content" in chunk && chunk.content) {
        textContent += chunk.content;
        process.stdout.write(chunk.content);
      }
      if ("type" in chunk && chunk.type === "image" && "imageOutput" in chunk) {
        imageReceived = true;
        const imageChunk = chunk as {
          type: "image";
          imageOutput: { base64: string };
        };
        const outputPath = path.join(OUTPUT_DIR, "streaming-city.png");
        const imageBuffer = Buffer.from(
          imageChunk.imageOutput.base64,
          "base64",
        );
        fs.writeFileSync(outputPath, imageBuffer);
        console.log(`\n\n✅ Image received via stream!`);
        console.log(`   Saved to: ${outputPath}`);
        console.log(`   Size: ${(imageBuffer.length / 1024).toFixed(2)} KB`);
      }
    }

    if (!imageReceived && textContent) {
      console.log("\n📝 Text response received (no image in stream)");
    }

    console.log("\n" + "=".repeat(60) + "\n");
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error in Example 2:", errorMessage);
    console.log("\n" + "=".repeat(60) + "\n");
  }
}

/**
 * Example 3: Image Generation with Custom Output Path
 * Demonstrates CLI-style output path handling
 */
async function customOutputPath() {
  console.log("=== Example 3: Custom Output Path ===\n");

  try {
    const customPath = path.join(OUTPUT_DIR, "custom-artwork.png");

    const result = await neurolink.generate({
      input: {
        text: "An abstract digital artwork with geometric shapes and vibrant colors",
      },
      provider: PROVIDER,
      model: MODEL,
    });

    if (result?.imageOutput?.base64) {
      const imageBuffer = Buffer.from(result.imageOutput.base64, "base64");
      fs.writeFileSync(customPath, imageBuffer);

      console.log("✅ Image saved to custom path!");
      console.log(`   Path: ${customPath}`);
      console.log(`   Size: ${(imageBuffer.length / 1024).toFixed(2)} KB`);
    }

    console.log("\n" + "=".repeat(60) + "\n");
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error in Example 3:", errorMessage);
    console.log("\n" + "=".repeat(60) + "\n");
  }
}

/**
 * Example 4: Multiple Image Styles
 * Generates images with different artistic styles
 */
async function multipleStyles() {
  console.log("=== Example 4: Multiple Image Styles ===\n");

  const styles = [
    {
      name: "photorealistic",
      prompt:
        "A photorealistic image of a golden retriever puppy playing in autumn leaves",
    },
    {
      name: "watercolor",
      prompt: "A watercolor painting of a Japanese garden with cherry blossoms",
    },
    {
      name: "pixel-art",
      prompt: "A pixel art scene of a retro video game character in a dungeon",
    },
  ];

  for (const style of styles) {
    try {
      console.log(`Generating ${style.name} style...`);

      const result = await neurolink.generate({
        input: { text: style.prompt },
        provider: PROVIDER,
        model: MODEL,
      });

      if (result?.imageOutput?.base64) {
        const outputPath = path.join(OUTPUT_DIR, `style-${style.name}.png`);
        const imageBuffer = Buffer.from(result.imageOutput.base64, "base64");
        fs.writeFileSync(outputPath, imageBuffer);

        console.log(`   ✅ ${style.name}: ${outputPath}`);
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(`   ❌ ${style.name}: ${errorMessage}`);
    }
  }

  console.log("\n" + "=".repeat(60) + "\n");
}

/**
 * Example 5: Image Generation with Analytics
 * Includes analytics data for monitoring
 */
async function imageWithAnalytics() {
  console.log("=== Example 5: Image Generation with Analytics ===\n");

  try {
    const result = await neurolink.generate({
      input: {
        text: "A cozy reading nook with warm lighting, bookshelves, and a comfortable armchair",
      },
      provider: PROVIDER,
      model: MODEL,
      enableAnalytics: true,
    });

    if (result?.imageOutput?.base64) {
      const outputPath = path.join(OUTPUT_DIR, "cozy-nook.png");
      const imageBuffer = Buffer.from(result.imageOutput.base64, "base64");
      fs.writeFileSync(outputPath, imageBuffer);

      console.log("✅ Image generated with analytics!");
      console.log(`   Saved to: ${outputPath}`);
    }

    if (result?.analytics) {
      console.log("\n📊 Analytics Data:");
      console.log(`   Provider: ${result.analytics.provider}`);
      console.log(`   Model: ${result.analytics.model}`);
      // Use requestDuration (the correct AnalyticsData field)
      console.log(`   Request Duration: ${result.analytics.requestDuration}ms`);
      if (result.analytics.tokenUsage) {
        console.log(
          `   Tokens Used: ${JSON.stringify(result.analytics.tokenUsage)}`,
        );
      }
    }

    console.log("\n" + "=".repeat(60) + "\n");
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error in Example 5:", errorMessage);
    console.log("\n" + "=".repeat(60) + "\n");
  }
}

/**
 * Example 6: Error Handling
 * Demonstrates proper error handling for unsupported providers/models
 */
async function errorHandling() {
  console.log("=== Example 6: Error Handling ===\n");

  // Test 1: Unsupported provider for image generation
  try {
    console.log(
      "Test 1: Attempting image generation with OpenAI (unsupported)...",
    );
    await neurolink.generate({
      input: { text: "A test image" },
      provider: "openai",
      model: "gemini-2.5-flash-image", // Invalid combination
    });
    console.log("❌ Should have thrown an error");
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.log("✅ Caught expected error:");
    console.log(`   ${errorMessage.substring(0, 100)}...`);
  }

  console.log("");

  // Test 2: Invalid model name
  try {
    console.log("Test 2: Attempting with invalid model name...");
    await neurolink.generate({
      input: { text: "A test image" },
      provider: PROVIDER,
      model: "invalid-model-name",
    });
    console.log("Result received (model may have been auto-corrected)");
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.log("✅ Caught expected error:");
    console.log(`   ${errorMessage.substring(0, 100)}...`);
  }

  console.log("\n" + "=".repeat(60) + "\n");
}

/**
 * Example 7: PDF to Image (gemini-3-pro-image-preview only)
 * Generates an image based on PDF content
 */
async function pdfToImage() {
  console.log("=== Example 7: PDF to Image Generation ===\n");

  const pdfPath = "./examples/data/sample.pdf";

  if (!fs.existsSync(pdfPath)) {
    console.log("⚠️ Skipping: PDF file not found at", pdfPath);
    console.log("   Create a sample PDF to test this feature");
    console.log("\n" + "=".repeat(60) + "\n");
    return;
  }

  try {
    // gemini-3-pro-image-preview supports PDF input
    const result = await neurolink.generate({
      input: {
        text: "Create a visual infographic based on the key information in this PDF",
        pdfFiles: [pdfPath],
      },
      provider: PROVIDER,
      model: "gemini-3-pro-image-preview", // Required for PDF input
    });

    if (result?.imageOutput?.base64) {
      const outputPath = path.join(OUTPUT_DIR, "pdf-infographic.png");
      const imageBuffer = Buffer.from(result.imageOutput.base64, "base64");
      fs.writeFileSync(outputPath, imageBuffer);

      console.log("✅ PDF-based image generated!");
      console.log(`   Saved to: ${outputPath}`);
    }

    console.log("\n" + "=".repeat(60) + "\n");
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error in Example 7:", errorMessage);
    console.log("\n" + "=".repeat(60) + "\n");
  }
}

/**
 * CLI Examples
 * Shows equivalent CLI commands for each example
 */
function showCLIExamples() {
  console.log("=== CLI Equivalents ===\n");

  console.log("# Basic image generation");
  console.log(
    `npx neurolink generate "A mountain landscape" --provider ${PROVIDER} --model ${MODEL} --imageOutput ./output.png`,
  );
  console.log("");

  console.log("# Streaming image generation");
  console.log(
    `npx neurolink stream "A futuristic city" --provider ${PROVIDER} --model ${MODEL} --imageOutput ./city.png`,
  );
  console.log("");

  console.log("# With analytics enabled");
  console.log(
    `npx neurolink generate "A cozy room" --provider ${PROVIDER} --model ${MODEL} --imageOutput ./room.png --enable-analytics`,
  );
  console.log("");

  console.log("# Using Google AI Studio instead of Vertex");
  console.log(
    `npx neurolink generate "Abstract art" --provider google-ai --model gemini-2.5-flash-image --imageOutput ./art.png`,
  );
  console.log("");

  console.log("# PDF to image (gemini-3-pro-image-preview)");
  console.log(
    `npx neurolink generate "Create infographic from this PDF" --provider vertex --model gemini-3-pro-image-preview --pdf ./document.pdf --imageOutput ./infographic.png`,
  );

  console.log("\n" + "=".repeat(60) + "\n");
}

/**
 * Main execution function
 * Runs all examples in sequence
 */
async function main() {
  console.log("\n" + "=".repeat(60));
  console.log(" NeuroLink Image Generation Examples");
  console.log(` Provider: ${PROVIDER}`);
  console.log(` Model: ${MODEL}`);
  console.log(` Output Directory: ${OUTPUT_DIR}`);
  console.log("=".repeat(60) + "\n");

  console.log("Note: Make sure you have set up provider credentials:");
  console.log(
    "- Vertex AI: GOOGLE_APPLICATION_CREDENTIALS or .vertex-credentials.json",
  );
  console.log("- Google AI Studio: GOOGLE_AI_STUDIO_API_KEY\n");

  console.log("Running examples...\n");

  // Run examples
  await basicImageGeneration();
  await streamingImageGeneration();
  await customOutputPath();
  await multipleStyles();
  await imageWithAnalytics();
  await errorHandling();
  await pdfToImage();

  // Show CLI equivalents
  showCLIExamples();

  console.log("✅ All examples completed!");
  console.log(`   Generated images are in: ${OUTPUT_DIR}`);
}

// Run examples
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
