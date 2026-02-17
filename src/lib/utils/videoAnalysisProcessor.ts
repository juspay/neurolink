/**
 * Video Analysis Processor
 *
 * Formats video analysis results into human-readable text
 *
 * @module utils/videoAnalysisProcessor
 */

import type { CoreMessage } from "ai";
import { AIProviderName } from "../constants/enums.js";
import { logger } from "./logger.js";

/**
 * Check if messages contain video frames (images)
 *
 * @param messages - Array of CoreMessage objects
 * @returns true if video frames are present
 */
export function hasVideoFrames(messages: CoreMessage[]): boolean {
  return messages.some((msg) => {
    if (Array.isArray(msg.content)) {
      return msg.content.some(
        (part) =>
          typeof part === "object" &&
          part !== null &&
          "type" in part &&
          part.type === "image",
      );
    }
    return false;
  });
}

/**
 * Execute video analysis on messages containing video frames
 *
 * @param messages - Array of CoreMessage objects with video frames
 * @param options - Video analysis options
 * @returns Video analysis text result
 * @throws Error if analysis fails
 */
export async function executeVideoAnalysis(
  messages: CoreMessage[],
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

  const videoAnalysisText = await analyzeVideo(messages[0], {
    provider: provider as AIProviderName,
    project: options.region
      ? undefined
      : process.env.GOOGLE_VERTEX_PROJECT || process.env.GOOGLE_CLOUD_PROJECT,
    location: options.region || process.env.GOOGLE_VERTEX_LOCATION,
    model: options.model || "gemini-2.0-flash",
  });

  logger.debug("[VideoAnalysisProcessor] Video analysis completed", {
    hasResult: !!videoAnalysisText,
    resultLength: videoAnalysisText?.length,
  });

  return videoAnalysisText;
}
