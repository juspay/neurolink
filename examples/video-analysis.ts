/**
 * Video Logic Audit with Gemini
 *
 * This example attaches a screen recording and asks Gemini for a logical audit
 * of it: the "Action-Reaction Chain" and any silent failures or logical
 * inconsistencies. The audit framing comes from the prompts below; the SDK
 * does not add one of its own.
 *
 * What the SDK does with the video:
 * 1. Reads its metadata (duration, resolution, codecs) and any embedded
 *    subtitle track, and puts them in the prompt.
 * 2. Extracts timestamped keyframes with ffmpeg and attaches them as images.
 *    ffmpeg is optional; without it there are no frames.
 * 3. Sends the clip itself, audio track included, to Gemini as inline data.
 *    That needs no ffmpeg, but the clip must be in a container Gemini reads
 *    inline (MP4 and MOV are), run 3600 s or less, and fit the 14 MB budget
 *    that the whole request shares with its other inline images, PDFs and
 *    audio. Otherwise the model gets the keyframes alone, and --debug (or
 *    NEUROLINK_DEBUG=true) shows why.
 * 4. Returns the model's answer as text in result.content.
 *
 * Tuning the keyframes and adding a speech transcript, for providers that
 * cannot take a clip, is done with videoOptions { frames, quality, format,
 * transcribeAudio } (CLI: --video-frames, --video-quality, --video-format,
 * --transcribe-audio). None of the calls below set it. See
 * docs/features/video-analysis.md.
 *
 * Setup:
 *   export GOOGLE_VERTEX_PROJECT="your-project-id"   # provider: "vertex"
 *   export GOOGLE_AI_API_KEY="your-api-key"          # provider: "google-ai"
 *
 * Usage:
 *   npx tsx examples/video-analysis.ts
 */

import "dotenv/config";
import { NeuroLink } from "../src/lib/neurolink.js";
import * as fs from "node:fs";
import * as path from "node:path";

async function main() {
  console.log("🎥 NeuroLink: Video Logic Audit with Gemini\n");

  // Check for video file
  const VIDEO_PATH = path.resolve(
    process.env.VIDEO_PATH || "./test-data/sample-video.mp4",
  );

  if (!fs.existsSync(VIDEO_PATH)) {
    console.error(`❌ Video file not found at: ${VIDEO_PATH}`);
    process.exit(1);
  }

  console.log(`✅ Analyzing: ${path.basename(VIDEO_PATH)}\n`);

  // Initialize NeuroLink
  const neurolink = new NeuroLink();

  try {
    // ============================================================
    // Example 1:
    // ============================================================
    console.log("Example 1: Standard Logic Audit");
    console.log("─".repeat(60));

    const result1 = await neurolink.generate({
      input: {
        text: "Give a detailed description of the issues in this video. This will be shared with our developer team, so it needs to be very detailed and analytical to make it easy for them to fix the issues.",
        files: [VIDEO_PATH],
      },
      provider: "vertex",
      model: "gemini-2.5-flash",
      maxTokens: 4000,
      disableTools: true,
    });

    console.log("\n📋 AUDIT SUMMARY:");
    console.log(result1.content);

    // ============================================================
    // Example 2: Focus on Silent Failures
    // ============================================================
    console.log("\n\nExample 2: Identifying Silent Failures");
    console.log("─".repeat(60));

    const result2 = await neurolink.generate({
      input: {
        text: "Identify any 'Silent Failures' where an action is taken but the UI/System provides no feedback loop.",
        files: [fs.readFileSync(VIDEO_PATH)], // Passing as Buffer
      },
      provider: "google-ai", // Demonstration of Google AI Studio provider
      model: "gemini-2.5-flash",
      disableTools: true,
    });

    console.log("\n🕵️ FAILURE ANALYSIS:");
    console.log(result2.content);

    // ============================================================
    // Example 3: UI/UX Bug Detection
    // ============================================================
    console.log("\n\nExample 3: UI/UX Bug Detection");
    console.log("─".repeat(60));

    const result3 = await neurolink.generate({
      input: {
        text: "Find where the user gets stuck. Look for validation errors, hidden elements, or misleading UI patterns.",
        files: [VIDEO_PATH],
      },
      provider: "vertex",
      model: "gemini-2.5-flash",
      temperature: 0.2, // Lower temperature for consistent analysis
      disableTools: true,
    });

    console.log("\n🐛 BUG REPORT:");
    console.log(result3.content);

    // ============================================================
    // Example 4: Workflow Validation
    // ============================================================
    console.log("\n\nExample 4: Workflow Validation");
    console.log("─".repeat(60));

    const result4 = await neurolink.generate({
      input: {
        text: "Trace the logical progression of this workflow. Does every state change correspond to a user action? Are there any unexpected transitions?",
        files: [VIDEO_PATH],
      },
      provider: "google-ai",
      model: "gemini-2.5-flash",
      maxTokens: 3500,
      disableTools: true,
    });

    console.log("\n🔄 WORKFLOW AUDIT:");
    console.log(result4.content);

    // ============================================================
    // Example 5: Performance & Responsiveness Audit
    // ============================================================
    console.log("\n\nExample 5: Performance & Responsiveness Audit");
    console.log("─".repeat(60));

    const result5 = await neurolink.generate({
      input: {
        text: "Analyze the responsiveness. Are there any noticeable delays between user actions and system responses? Does the UI feel sluggish?",
        files: [VIDEO_PATH],
      },
      provider: "google-ai",
      model: "gemini-2.5-flash",
      disableTools: true,
    });

    console.log("\n⚡ PERFORMANCE ANALYSIS:");
    console.log(result5.content);

    // ============================================================
    // Example 6: Error Handling Assessment
    // ============================================================
    console.log("\n\nExample 6: Error Handling Assessment");
    console.log("─".repeat(60));

    const result6 = await neurolink.generate({
      input: {
        text: "How does the system handle errors? Are error messages clear and actionable? Is there proper recovery guidance?",
        files: [VIDEO_PATH],
      },
      provider: "vertex",
      model: "gemini-2.5-flash",
      disableTools: true,
    });

    console.log("\n🚨 ERROR HANDLING REVIEW:");
    console.log(result6.content);

    console.log("\n\n✅ All video analysis examples completed.");
  } catch (error) {
    console.error("\n❌ Analysis failed:");
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main().catch(console.error);
