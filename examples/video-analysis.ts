/**
 * Video Analysis Examples for NeuroLink
 * Demonstrates various video processing capabilities
 *
 * Run with: npx tsx examples/video-analysis.ts
 *
 * Prerequisites:
 * - Set up provider credentials (OpenAI, Gemini, or other vision-capable providers)
 * - Ensure video files exist in examples/data/ or docs/visual-content/cli-videos/ directory
 *
 * Video Processing Approaches:
 * 1. Frame-based (OpenAI, Anthropic): Extracts frames and analyzes them
 * 2. Native video (Gemini): Uploads full video for native processing
 *
 * Note: If you encounter tool schema errors, you can disable tools:
 *   export NEUROLINK_DISABLE_TOOLS=true
 *   npx tsx examples/video-analysis.ts
 */

import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

// Provider configuration (change as needed)
// OpenAI/Anthropic: Frame-based processing
// Gemini: Native video upload
const FRAME_PROVIDER = "openai"; // or "anthropic", "azure-openai"
const NATIVE_PROVIDER = "gemini"; // or "google-ai-studio", "vertex"

// Use existing demo video from the repository
const DEMO_VIDEO = "./docs/visual-content/cli-videos/cli-03-text-generation.mp4";
const DEMO_VIDEO_ALT = "./docs/visual-content/cli-videos/cli-01-cli-help.mp4";

/**
 * Example 1: Basic Video Analysis
 * Analyzes a video file with default settings (8 frames, 85% quality)
 */
async function basicVideoAnalysis() {
  console.log("=== Example 1: Basic Video Analysis ===\n");

  try {
    const result = await neurolink.generate({
      input: {
        text: "Describe what is happening in this video. What actions are being performed and what can you see on screen?",
        videoFiles: [DEMO_VIDEO],
      },
      provider: FRAME_PROVIDER,
      maxTokens: 800,
    });

    console.log("Analysis Result:");
    console.log(result.content);
    console.log("\n" + "=".repeat(60) + "\n");
  } catch (error) {
    console.error("Error in Example 1:", error.message);
    console.log("\n" + "=".repeat(60) + "\n");
  }
}

/**
 * Example 2: Custom Frame Extraction
 * Extracts 16 frames with high quality (90%) for detailed analysis
 */
async function customFrameExtraction() {
  console.log("=== Example 2: Custom Frame Extraction (16 frames) ===\n");

  try {
    const result = await neurolink.generate({
      input: {
        text: "What happens at each timestamp in this video? Provide a timeline of key events.",
        videoFiles: [DEMO_VIDEO],
      },
      provider: FRAME_PROVIDER,
      videoOptions: {
        frames: 16, // Extract 16 frames for more detailed analysis
        quality: 90, // High quality frames
        format: "jpeg", // JPEG format
      },
      maxTokens: 1200,
    });

    console.log("Timeline Analysis:");
    console.log(result.content);
    console.log("\n" + "=".repeat(60) + "\n");
  } catch (error) {
    console.error("Error in Example 2:", error.message);
    console.log("\n" + "=".repeat(60) + "\n");
  }
}

/**
 * Example 3: Native Video Upload (Gemini)
 * Uses Gemini's native video processing (no frame extraction needed)
 */
async function nativeVideoProcessing() {
  console.log("=== Example 3: Native Video Upload (Gemini) ===\n");

  try {
    const result = await neurolink.generate({
      input: {
        text: "Analyze this video comprehensively. What are the key elements, actions, and any text visible in the video?",
        videoFiles: [DEMO_VIDEO],
      },
      provider: NATIVE_PROVIDER,
      maxTokens: 1000,
    });

    console.log("Native Video Analysis:");
    console.log(result.content);
    console.log("\n" + "=".repeat(60) + "\n");
  } catch (error) {
    console.error("Error in Example 3:", error.message);
    console.log(
      "💡 Tip: Make sure you have Google AI API key configured for native video processing",
    );
    console.log("\n" + "=".repeat(60) + "\n");
  }
}

/**
 * Example 4: Video with Audio Transcription
 * Extracts and transcribes audio track along with visual analysis
 */
async function videoWithAudioTranscription() {
  console.log("=== Example 4: Video + Audio Transcription ===\n");

  try {
    const result = await neurolink.generate({
      input: {
        text: "Summarize both the visual content and any spoken words or audio in this video. Provide a complete overview.",
        videoFiles: [DEMO_VIDEO],
      },
      provider: FRAME_PROVIDER,
      videoOptions: {
        frames: 8,
        quality: 85,
        transcribeAudio: true, // Enable audio transcription
      },
      maxTokens: 1500,
    });

    console.log("Video + Audio Summary:");
    console.log(result.content);
    console.log("\n" + "=".repeat(60) + "\n");
  } catch (error) {
    console.error("Error in Example 4:", error.message);
    console.log(
      "💡 Note: Audio transcription requires additional configuration",
    );
    console.log("\n" + "=".repeat(60) + "\n");
  }
}

/**
 * Example 5: Multiple Video Comparison
 * Compares and contrasts content from two different videos
 */
async function compareVideos() {
  console.log("=== Example 5: Compare Multiple Videos ===\n");

  try {
    const result = await neurolink.generate({
      input: {
        text: "Compare these two videos. What are the similarities and differences in what they show? Describe the key points from each.",
        videoFiles: [DEMO_VIDEO, DEMO_VIDEO_ALT],
      },
      provider: FRAME_PROVIDER,
      videoOptions: {
        frames: 8,
        quality: 85,
      },
      maxTokens: 1500,
    });

    console.log("Comparison Result:");
    console.log(result.content);
    console.log("\n" + "=".repeat(60) + "\n");
  } catch (error) {
    console.error("Error in Example 5:", error.message);
    console.log("\n" + "=".repeat(60) + "\n");
  }
}

/**
 * Example 6: Streaming Video Analysis
 * Uses streaming for faster initial results with video content
 */
async function streamingVideoAnalysis() {
  console.log("=== Example 6: Streaming Video Analysis ===\n");

  try {
    const stream = await neurolink.stream({
      input: {
        text: "Provide a detailed description of this video, including all visible elements, actions, and any text on screen.",
        videoFiles: [DEMO_VIDEO],
      },
      provider: FRAME_PROVIDER,
      videoOptions: {
        frames: 10,
        quality: 85,
      },
      maxTokens: 1500,
    });

    console.log("Streaming Analysis:");
    for await (const chunk of stream) {
      process.stdout.write(chunk.content);
    }
    console.log("\n\n" + "=".repeat(60) + "\n");
  } catch (error) {
    console.error("Error in Example 6:", error.message);
    console.log("\n" + "=".repeat(60) + "\n");
  }
}

/**
 * Example 7: Auto-Detection with Mixed File Types
 * Uses the `files` array for automatic file type detection
 * Combines video with images or other file types
 */
async function autoDetectMixedFiles() {
  console.log("=== Example 7: Auto-Detection (Video + Mixed) ===\n");

  try {
    const result = await neurolink.generate({
      input: {
        text: "Analyze all the media files provided. Describe what you see in the video and any other files.",
        files: [
          DEMO_VIDEO, // Auto-detects as video
        ],
      },
      provider: FRAME_PROVIDER,
      videoOptions: {
        frames: 8,
        quality: 85,
      },
      maxTokens: 1000,
    });

    console.log("Auto-Detection Result:");
    console.log(result.content);
    console.log("\n" + "=".repeat(60) + "\n");
  } catch (error) {
    console.error("Error in Example 7:", error.message);
    console.log("\n" + "=".repeat(60) + "\n");
  }
}

/**
 * Example 8: Error Handling
 * Demonstrates proper error handling for unsupported providers or missing files
 */
async function errorHandlingExample() {
  console.log("=== Example 8: Error Handling ===\n");

  try {
    // This will show how the system handles errors gracefully
    const result = await neurolink.generate({
      input: {
        text: "Analyze this video",
        videoFiles: ["./examples/data/nonexistent-video.mp4"],
      },
      provider: FRAME_PROVIDER,
      maxTokens: 500,
    });

    console.log("Result:", result.content);
  } catch (error) {
    console.log("✓ Caught expected error for missing video file");
    console.log("\nError message:");
    console.log(error.message);
    console.log(
      "\n💡 Tip: Ensure video files exist before processing. Supported formats: MP4, WebM, MOV, AVI, MKV",
    );
    console.log("\n" + "=".repeat(60) + "\n");
  }
}

/**
 * Example 9: Video Processing Best Practices
 * Tips and recommendations for optimal video analysis
 */
async function bestPracticesDemo() {
  console.log("=== Example 9: Video Processing Best Practices ===\n");

  console.log("📋 Best Practices for Video Analysis:\n");
  console.log("1. Frame Count:");
  console.log("   - Short videos (< 30s): 8-10 frames");
  console.log("   - Medium videos (30s-2min): 12-16 frames");
  console.log("   - Long videos (> 2min): 16-24 frames\n");

  console.log("2. Quality Settings:");
  console.log("   - Quick analysis: 70-80% quality");
  console.log("   - Detailed analysis: 85-90% quality");
  console.log("   - OCR/text extraction: 90-95% quality\n");

  console.log("3. Provider Selection:");
  console.log("   - OpenAI GPT-4o: Best for frame-based analysis");
  console.log("   - Gemini: Native video support, longer videos");
  console.log("   - Anthropic Claude: Good for detailed frame analysis\n");

  console.log("4. Audio Transcription:");
  console.log("   - Enable when audio context is important");
  console.log("   - Adds processing time and token usage");
  console.log("   - Best for presentations, lectures, demos\n");

  console.log("5. Optimization Tips:");
  console.log("   - Use specific prompts to reduce token usage");
  console.log("   - Consider streaming for large videos");
  console.log("   - Process shorter clips for faster results");
  console.log("   - Cache results for repeated analysis\n");

  try {
    // Demonstrate optimized video analysis
    const result = await neurolink.generate({
      input: {
        text: "Extract only the main action and any visible text from this video. Be concise.",
        videoFiles: [DEMO_VIDEO],
      },
      provider: FRAME_PROVIDER,
      videoOptions: {
        frames: 6, // Fewer frames for quick analysis
        quality: 80, // Balanced quality
        format: "jpeg",
      },
      maxTokens: 500, // Limit tokens for concise response
    });

    console.log("Optimized Analysis Result:");
    console.log(result.content);
    console.log("\n" + "=".repeat(60) + "\n");
  } catch (error) {
    console.error("Error in Example 9:", error.message);
    console.log("\n" + "=".repeat(60) + "\n");
  }
}

/**
 * Main execution function
 * Runs all examples in sequence
 */
async function main() {
  console.log("\n" + "=".repeat(60));
  console.log(" NeuroLink Video Analysis Examples");
  console.log(" Frame-based Provider:", FRAME_PROVIDER);
  console.log(" Native Video Provider:", NATIVE_PROVIDER);
  console.log("=".repeat(60) + "\n");

  console.log("Note: Make sure you have set up provider credentials");
  console.log("and that video files exist in the specified paths\n");

  console.log("Running examples...\n");

  await basicVideoAnalysis();
  await customFrameExtraction();
  await nativeVideoProcessing();
  await videoWithAudioTranscription();
  await compareVideos();
  await streamingVideoAnalysis();
  await autoDetectMixedFiles();
  await errorHandlingExample();
  await bestPracticesDemo();

  console.log("All examples completed!");
  console.log("\n📚 Key Takeaways:");
  console.log("   - Video analysis supports multiple processing approaches");
  console.log("   - Frame extraction works with OpenAI, Anthropic, Azure");
  console.log("   - Native video upload available with Gemini");
  console.log("   - Audio transcription enhances video understanding");
  console.log("   - Customize frames, quality, and format for optimal results");
  console.log(
    "   - Use streaming for faster feedback with long videos\n",
  );
}

// Run examples
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
