import { AIProviderName } from "../constants/enums.js";
import { logger } from "./logger.js";
import type { ModelMessage } from "../types/index.js";

/**
 * Check if messages contain video frames (images)
 * Only checks user messages to match buildContentParts behavior
 *
 * @param messages - Array of ModelMessage objects
 * @returns true if video frames are present in user messages
 */
export function hasVideoFrames(messages: ModelMessage[]): boolean {
  return messages.some((msg) => {
    // Only check user messages to match buildContentParts behavior
    if (msg.role !== "user") {
      return false;
    }
    if (Array.isArray(msg.content)) {
      // Count image parts — only route to video analysis pipeline when there are
      // multiple frames (3+), indicating actual video frame extraction.
      // Single images or pairs should use the model's native vision capability.
      const imageCount = msg.content.filter(
        (part) =>
          typeof part === "object" &&
          part !== null &&
          "type" in part &&
          part.type === "image",
      ).length;
      return imageCount >= 3;
    }
    return false;
  });
}

/**
 * Execute video analysis on messages containing video frames
 *
 * @param messages - Array of ModelMessage objects with video frames
 * @param options - Video analysis options
 * @returns Video analysis text result
 * @throws Error if analysis fails
 */
export async function executeVideoAnalysis(
  messages: ModelMessage[],
  options: {
    provider?: AIProviderName | string;
    providerName?: AIProviderName;
    region?: string;
    model?: string;
  },
): Promise<string> {
  logger.debug(
    "[VideoAnalysisProcessor] Video frames detected, triggering analysis",
  );

  const { analyzeVideo } = await import("../adapters/video/videoAnalyzer.js");

  const provider =
    options.provider === AIProviderName.GOOGLE_AI ||
    (options.provider === AIProviderName.AUTO && process.env.GOOGLE_AI_API_KEY)
      ? AIProviderName.GOOGLE_AI
      : options.provider === AIProviderName.VERTEX ||
          options.providerName === AIProviderName.VERTEX
        ? AIProviderName.VERTEX
        : AIProviderName.AUTO;

  const videoAnalysisText = await analyzeVideo(messages, {
    provider: provider as AIProviderName,
    project: options.region
      ? undefined
      : process.env.GOOGLE_VERTEX_PROJECT || process.env.GOOGLE_CLOUD_PROJECT,
    location: options.region || process.env.GOOGLE_VERTEX_LOCATION,
    model: options.model || "gemini-2.5-flash",
  });

  logger.debug("[VideoAnalysisProcessor] Video analysis completed", {
    hasResult: !!videoAnalysisText,
    resultLength: videoAnalysisText?.length,
  });

  return videoAnalysisText;
}
