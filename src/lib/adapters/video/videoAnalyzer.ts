/**
 * Video Analysis Handler
 *
 * Provides video analysis using Google's Gemini 2.5 Flash model.
 * Supports both Vertex AI and Gemini API providers.
 *
 * @module adapters/video/geminiVideoAnalyzer
 */

import {
  AIProviderName,
  ErrorSeverity,
  ErrorCategory,
} from "../../constants/enums.js";
import { logger } from "../../utils/logger.js";
import { readFile } from "node:fs/promises";
import { NeuroLinkError, ErrorFactory } from "../../utils/errorHandling.js";
import type { ModelMessage } from "../../types/index.js";

// ---------------------------------------------------------------------------
// Shared config
// ---------------------------------------------------------------------------

const DEFAULT_MODEL = "gemini-2.5-flash";
const DEFAULT_LOCATION = "us-central1";

/**
 * Extract content items from user messages
 *
 * @param messages - Array of ModelMessage objects
 * @returns Flattened array of content items from user messages
 */
function extractUserContent(messages: ModelMessage[]) {
  const userMessages = messages.filter((msg) => msg.role === "user");
  return userMessages.flatMap((msg) =>
    Array.isArray(msg.content) ? msg.content : [],
  );
}

/**
 * Convert ModelMessage content array to Gemini parts format
 *
 * @param messages - Array of ModelMessage objects
 * @returns Array of parts in Gemini API format
 */
function buildContentParts(
  messages: ModelMessage[],
): Array<
  { text: string } | { inlineData: { mimeType: string; data: string } }
> {
  const allContent = extractUserContent(messages);

  return allContent
    .map((item) => {
      if (item.type === "text") {
        // Accept text parts regardless of whether text is empty
        return { text: item.text || "" };
      } else if (item.type === "image" && item.image) {
        let base64Data: string;
        // Handle Buffer or Uint8Array
        if (Buffer.isBuffer(item.image) || item.image instanceof Uint8Array) {
          base64Data = Buffer.from(item.image).toString("base64");
        } else if (typeof item.image === "string") {
          // Strip data URI prefix if present (e.g., "data:image/jpeg;base64,")
          base64Data = item.image.replace(/^data:image\/[a-z]+;base64,/, "");
        } else {
          throw ErrorFactory.invalidConfiguration(
            "image data type",
            `expected string, Buffer, or Uint8Array, got ${typeof item.image}`,
            { itemType: item.type, dataType: typeof item.image },
          );
        }

        return {
          inlineData: {
            mimeType: "image/jpeg",
            data: base64Data,
          },
        };
      } else if (item.type === "file") {
        // Skip file parts - not supported in Gemini parts format
        return null;
      }
      // Return null for unsupported types
      return null;
    })
    .filter(
      (
        part,
      ): part is
        | { text: string }
        | { inlineData: { mimeType: string; data: string } } => part !== null,
    );
}

/**
 * Configuration for video frame analysis.
 * Generic prompt that handles both general content and technical bug reporting.
 */
function buildConfig() {
  return {
    systemInstruction: `You are a Visual Analysis Assistant.
Your task is to analyze images or video frames provided by the user and extract structured visual features. The user may or may not provide an issue description. Your role is to understand the visual content, optionally correlate it with the provided issue, and produce a structured output that can be directly consumed by another LLM for analysis, debugging, or decision-making.

Follow these rules strictly:
- The analysis must be generic and applicable to any domain (UI, dashboards, video frames, animations, charts, documents, etc.).
- Support both images and videos (single frame or multiple frames).
- Extract only what is visually observable; do not assume backend behavior unless supported by visuals.
- The JSON must be structured, consistent, and machine-readable.
- Logs are optional and should only be included if explicitly provided.
- The final output must be clear, concise, and actionable for an LLM.

Always produce the output in the following format:

Issue:
<Refined issue description if provided, otherwise a clear description of the observed visual situation>

Image/Video Patterns:
<Structured JSON describing extracted visual features and anomalies>

Steps to Reproduce:
<Ordered steps that reliably reproduce the issue based on the visual context>

[Logs: Include ONLY if provided by the user]

Proof:
<Visual evidence explaining how the image/video confirms the issue>
Ensure the final response is fully self-sufficient and does not reference external context.`,
  };
}

// ---------------------------------------------------------------------------
// Vertex AI
// ---------------------------------------------------------------------------

export async function analyzeVideoWithVertexAI(
  messages: ModelMessage[],
  options: {
    project?: string;
    location?: string;
    model?: string;
  } = {},
): Promise<string> {
  const startTime = Date.now();
  const { GoogleGenAI } = await import("@google/genai");

  // Get default config and merge with provided options
  const config = await getVertexConfig();
  const project = options.project ?? config.project;
  const location = options.location ?? config.location;
  const model = options.model || DEFAULT_MODEL;

  // Convert frames content to parts array for Gemini
  const parts = buildContentParts(messages);
  const frameCount = parts.filter(
    (part) => "inlineData" in part && part.inlineData,
  ).length;

  logger.debug("[GeminiVideoAnalyzer] Analyzing video with Vertex AI", {
    project,
    location,
    model,
    frameCount,
  });
  const ai = new GoogleGenAI({ vertexai: true, project, location });
  const response = await ai.models.generateContent({
    model,
    config: buildConfig(),
    contents: [
      {
        role: "user",
        parts,
      },
    ],
  });

  const responseText = response.text || "";
  const processingTime = Date.now() - startTime;

  logger.debug("[GeminiVideoAnalyzer] Vertex response received", {
    responseLength: responseText.length,
    processingTime,
  });

  return responseText;
}

// ---------------------------------------------------------------------------
// Gemini API (Google AI)
// ---------------------------------------------------------------------------

export async function analyzeVideoWithGeminiAPI(
  messages: ModelMessage[],
  options: {
    apiKey?: string;
    model?: string;
  } = {},
): Promise<string> {
  const startTime = Date.now();
  const { GoogleGenAI } = await import("@google/genai");

  const apiKey = options.apiKey || process.env.GOOGLE_AI_API_KEY;
  const model = options.model || DEFAULT_MODEL;

  if (!apiKey) {
    throw new Error(
      "GOOGLE_AI_API_KEY environment variable is required for Gemini API video analysis",
    );
  }

  // Convert frames content to parts array for Gemini
  const parts = buildContentParts(messages);
  const frameCount = parts.filter(
    (part) => "inlineData" in part && part.inlineData,
  ).length;

  logger.debug("[GeminiVideoAnalyzer] Analyzing video with Gemini API", {
    model,
    frameCount,
  });

  const ai = new GoogleGenAI({ apiKey });

  logger.debug("[GeminiVideoAnalyzer] Generating analysis with frames");

  const response = await ai.models.generateContent({
    model,
    config: buildConfig(),
    contents: [
      {
        role: "user",
        parts,
      },
    ],
  });

  const responseText = response.text || "";
  const processingTime = Date.now() - startTime;

  logger.debug("[GeminiVideoAnalyzer] Gemini API response received", {
    responseLength: responseText.length,
    processingTime,
  });

  return responseText;
}

async function getVertexConfig(): Promise<{
  project: string;
  location: string;
}> {
  const location = process.env.GOOGLE_VERTEX_LOCATION || DEFAULT_LOCATION;

  // Try environment variables first
  let project =
    process.env.GOOGLE_VERTEX_PROJECT ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    process.env.GOOGLE_CLOUD_PROJECT_ID ||
    process.env.VERTEX_PROJECT_ID;

  // Fallback: read from ADC credentials file
  if (!project && process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    try {
      const credData = JSON.parse(
        await readFile(process.env.GOOGLE_APPLICATION_CREDENTIALS, "utf-8"),
      );
      project = credData.quota_project_id || credData.project_id;
    } catch (e) {
      // Ignore read errors, will throw below if project still not found
      logger.debug("Failed to read project from credentials file", {
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  if (!project) {
    throw new NeuroLinkError({
      code: "PROVIDER_NOT_CONFIGURED",
      message:
        "Google Cloud project not found. Set GOOGLE_VERTEX_PROJECT or GOOGLE_CLOUD_PROJECT environment variable, or ensure ADC credentials contain project_id",
      category: ErrorCategory.CONFIGURATION,
      severity: ErrorSeverity.HIGH,
      retriable: false,
      context: {
        missingVar: "GOOGLE_VERTEX_PROJECT",
        feature: "video-generation",
        checkedEnvVars: [
          "GOOGLE_VERTEX_PROJECT",
          "GOOGLE_CLOUD_PROJECT",
          "GOOGLE_CLOUD_PROJECT_ID",
          "VERTEX_PROJECT_ID",
        ],
      },
    });
  }

  return { project, location };
}

export async function analyzeVideo(
  messages: ModelMessage[],
  options: {
    provider?: AIProviderName;
    project?: string;
    location?: string;
    apiKey?: string;
    model?: string;
  } = {},
): Promise<string> {
  const provider = options.provider || AIProviderName.AUTO;
  // Vertex — only when Vertex credentials are configured
  if (
    provider === AIProviderName.VERTEX ||
    (provider === AIProviderName.AUTO &&
      (process.env.GOOGLE_VERTEX_PROJECT || process.env.GOOGLE_CLOUD_PROJECT))
  ) {
    return analyzeVideoWithVertexAI(messages, options);
  }

  // Gemini API — when Google AI API key is available
  if (
    provider === AIProviderName.GOOGLE_AI ||
    (provider === AIProviderName.AUTO && process.env.GOOGLE_AI_API_KEY)
  ) {
    return analyzeVideoWithGeminiAPI(messages, options);
  }

  throw ErrorFactory.invalidConfiguration(
    "video analysis provider",
    "No valid provider configuration found. Set GOOGLE_VERTEX_PROJECT for Vertex AI or GOOGLE_AI_API_KEY for Gemini API.",
  );
}
