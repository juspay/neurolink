/**
 * Presentation Orchestrator
 *
 * Main orchestration module for PPT generation.
 * Coordinates the full pipeline: validation → content planning → slide generation → assembly → file output.
 *
 * Follows the video handler pattern (vertexVideoHandler.ts):
 * - Standalone module with clear responsibility
 * - Uses AI provider for generation
 * - Returns structured result
 *
 * @module presentation/presentationOrchestrator
 */

import { loadPptxGenJS } from "./slideGenerator.js";
import * as fs from "fs/promises";
import type {
  PPTGenerationResult,
  PresentationGenerationOptions,
  OrchestrationState,
  SlideGeneratorConfig,
} from "../../types/index.js";
import { PPTError, PPT_ERROR_CODES } from "./pptError.js";
import { generateContentPlan, postProcessPlan } from "./contentPlanner.js";
import { SlideGenerator } from "./slideGenerator.js";
import { PPT_GENERATION_TIMEOUT_MS } from "./constants.js";
import { logger } from "../../utils/logger.js";
import { withTimeout, ErrorFactory } from "../../utils/errorHandling.js";
import {
  SpanSerializer,
  SpanType,
  SpanStatus,
  getMetricsAggregator,
} from "../../observability/index.js";
import {
  generateOutputPath,
  ensureOutputDirectory,
  normalizeLogoConfig,
  getLayoutName,
  getFailureStage,
  toError,
} from "./utils.js";

// ============================================================================
// MAIN ORCHESTRATION FUNCTION
// ============================================================================

/**
 * Generate a complete PowerPoint presentation
 *
 * This is the main entry point for PPT generation. It orchestrates:
 * 1. Content planning via AI
 * 2. Individual slide generation (with images)
 * 3. PPTX assembly and file output
 *
 * @param options - Presentation generation options
 * @returns Promise<PPTGenerationResult> - Result with file path and metadata
 *
 * @example
 * ```typescript
 * const result = await generatePresentation({
 *   context: extractPPTContext(options),
 *   provider: aiProvider,
 *   neurolink: neurolinkInstance,
 * });
 *
 * console.log(`Presentation saved: ${result.filePath}`);
 * ```
 */
export async function generatePresentation(
  options: PresentationGenerationOptions,
): Promise<PPTGenerationResult> {
  const span = SpanSerializer.createSpan(
    SpanType.PPT_GENERATION,
    "ppt.orchestrate",
    {
      "ppt.operation": "orchestrate",
      "ppt.slideCount": options.context.pages,
      "ppt.theme":
        typeof options.context.theme === "string"
          ? options.context.theme
          : "custom",
    },
  );

  const state: OrchestrationState = {
    startTime: Date.now(),
    contentPlan: null,
    slides: null,
    outputPath: null,
  };

  const {
    context,
    provider,
    providerName,
    modelName,
    neurolink,
    imageProvider,
    imageModel,
  } = options;

  logger.info("[PresentationOrchestrator] Starting presentation generation", {
    topic: context.topic.substring(0, 100),
    pages: context.pages,
    theme: context.theme,
    audience: context.audience,
    tone: context.tone,
    generateAIImages: context.generateAIImages,
    provider: context.provider,
  });

  try {
    // =========================================================================
    // STEP 1: Content Planning
    // =========================================================================
    logger.info("[PresentationOrchestrator] Step 1: Content planning...");

    const planResult = await withTimeout(
      generateContentPlan(context, provider),
      PPT_GENERATION_TIMEOUT_MS / 2, // Half the total timeout for planning
      ErrorFactory.toolTimeout(
        "contentPlanning",
        PPT_GENERATION_TIMEOUT_MS / 2,
      ),
    );

    // Post-process: ensure title and thank-you slides
    state.contentPlan = postProcessPlan(planResult);

    // Update span attributes with post-processed plan values (AI may have changed slide count/theme)
    span.attributes["ppt.slideCount"] = state.contentPlan.totalSlides;
    span.attributes["ppt.theme"] =
      typeof state.contentPlan.theme === "string"
        ? state.contentPlan.theme
        : "custom";

    logger.info("[PresentationOrchestrator] Content plan ready", {
      title: state.contentPlan.title,
      totalSlides: state.contentPlan.totalSlides,
      theme: state.contentPlan.theme,
      audience: state.contentPlan.audience,
      tone: state.contentPlan.tone,
    });

    // =========================================================================
    // STEP 2: Slide Generation (with images)
    // =========================================================================
    logger.info("[PresentationOrchestrator] Step 2: Generating slides...");

    // Normalize logo - context.logo can be Buffer | string or undefined
    // Convert undefined to null for normalizeLogoConfig
    const logoInput: Buffer | string | null = context.logo ?? null;
    const normalizedLogo = normalizeLogoConfig(logoInput);

    // Use theme from content plan (AI may have chosen it)
    const themeForSlideGen = state.contentPlan.theme || context.theme;

    const slideGeneratorConfig: SlideGeneratorConfig = {
      theme: themeForSlideGen,
      generateAIImages: context.generateAIImages,
      aspectRatio: context.aspectRatio,
      provider: imageProvider ?? context.provider ?? "vertex",
      imageModel: imageModel ?? "gemini-2.5-flash-image",
      logo: normalizedLogo ?? undefined,
      // Pass user-provided images for slides (takes priority over AI generation)
      userImages: context.images,
      neurolink,
    };

    const slideGenerator = new SlideGenerator(slideGeneratorConfig);
    const batchResult = await withTimeout(
      slideGenerator.generateSlides(state.contentPlan.slides),
      PPT_GENERATION_TIMEOUT_MS / 2,
      ErrorFactory.toolTimeout(
        "slideGeneration",
        PPT_GENERATION_TIMEOUT_MS / 2,
      ),
    );
    state.slides = batchResult.slides;

    logger.info("[PresentationOrchestrator] Slides generated", {
      totalSlides: state.slides.length,
      totalImages: batchResult.totalImages,
      failedImages: batchResult.failedImages,
      generationTime: batchResult.generationTime,
    });

    // =========================================================================
    // STEP 3: PPTX Assembly
    // =========================================================================
    logger.info("[PresentationOrchestrator] Step 3: Assembling PPTX...");

    // Create presentation instance
    // Use pptxgenjs directly - the SlideGenerator.renderSlide handles type conversion internally
    const PptxGenJS = await loadPptxGenJS();
    const pptxInstance = new PptxGenJS();

    // Set presentation metadata using pptxgenjs API directly
    pptxInstance.title = state.contentPlan.title;
    pptxInstance.subject = `Generated presentation about: ${context.topic.substring(0, 100)}`;
    pptxInstance.author = "NeuroLink PPT Generator";
    pptxInstance.company = "NeuroLink";
    pptxInstance.layout = getLayoutName(context.aspectRatio);

    // Sort slides by number (should already be sorted, but ensure)
    const sortedSlides = [...state.slides].sort(
      (a, b) => a.slideNumber - b.slideNumber,
    );

    // Render each slide to the presentation
    // Note: pptxInstance is structurally compatible with PptxPresentation
    for (let i = 0; i < sortedSlides.length; i++) {
      const completeSlide = sortedSlides[i];
      slideGenerator.renderSlide(
        pptxInstance,
        completeSlide,
        i + 1,
        sortedSlides.length,
      );
    }

    logger.info("[PresentationOrchestrator] PPTX assembled", {
      totalSlides: sortedSlides.length,
      layout: pptxInstance.layout,
      title: pptxInstance.title,
    });

    // =========================================================================
    // STEP 4: File Output
    // =========================================================================
    logger.info("[PresentationOrchestrator] Step 4: Writing file...");

    state.outputPath = generateOutputPath(context);
    await withTimeout(
      ensureOutputDirectory(state.outputPath),
      PPT_GENERATION_TIMEOUT_MS / 4,
      ErrorFactory.toolTimeout(
        "outputDirectory",
        PPT_GENERATION_TIMEOUT_MS / 4,
      ),
    );

    // Write the file with timeout
    await withTimeout(
      pptxInstance.writeFile({ fileName: state.outputPath }),
      PPT_GENERATION_TIMEOUT_MS / 4,
      ErrorFactory.toolTimeout("pptxWrite", PPT_GENERATION_TIMEOUT_MS / 4),
    );

    // Get file size (optional, don't fail if can't get it)
    let fileSize = 0;
    try {
      const stats = await withTimeout(
        fs.stat(state.outputPath),
        PPT_GENERATION_TIMEOUT_MS / 8,
        ErrorFactory.toolTimeout("pptxStat", PPT_GENERATION_TIMEOUT_MS / 8),
      );
      fileSize = stats.size;
    } catch {
      logger.warn("[PresentationOrchestrator] Could not get file size");
    }

    const totalTime = Date.now() - state.startTime;

    logger.info("[PresentationOrchestrator] Presentation generation complete", {
      filePath: state.outputPath,
      fileSize,
      totalSlides: sortedSlides.length,
      totalTime,
    });

    // =========================================================================
    // STEP 5: Return Result
    // =========================================================================
    const endedSpan = SpanSerializer.endSpan(span, SpanStatus.OK);
    getMetricsAggregator().recordSpan(endedSpan);
    neurolink?.recordMetricsSpan(endedSpan);

    // Use values from content plan (AI may have chosen them if "AI will decide" was passed)
    const finalTheme = state.contentPlan?.theme || context.theme;
    const finalAudience = state.contentPlan?.audience || context.audience;
    const finalTone = state.contentPlan?.tone || context.tone;

    return {
      filePath: state.outputPath,
      totalSlides: sortedSlides.length,
      format: "pptx",
      provider: providerName,
      model: modelName,
      metadata: {
        theme: finalTheme,
        audience: finalAudience,
        tone: finalTone,
        imageModel: context.generateAIImages
          ? (imageModel ?? "gemini-2.5-flash-image")
          : "",
        fileSize: fileSize > 0 ? fileSize : 0,
      },
    };
  } catch (error) {
    const endedSpan = SpanSerializer.endSpan(span, SpanStatus.ERROR);
    endedSpan.statusMessage =
      error instanceof Error ? error.message : String(error);
    getMetricsAggregator().recordSpan(endedSpan);
    neurolink?.recordMetricsSpan(endedSpan);

    // Re-throw PPTError as-is
    if (error instanceof PPTError) {
      logger.error("[PresentationOrchestrator] Generation failed", {
        error: error.message,
        code: error.code,
        context: error.context,
      });
      throw error;
    }

    // Wrap other errors
    const errorObj = toError(error);
    logger.error("[PresentationOrchestrator] Unexpected error", {
      error: errorObj.message,
      stage: getFailureStage(state),
    });

    throw new PPTError(
      `Presentation generation failed: ${errorObj.message}`,
      PPT_ERROR_CODES.ASSEMBLY_FAILED,
      {
        topic: context.topic.substring(0, 100),
        stage: getFailureStage(state),
        elapsedTime: Date.now() - state.startTime,
      },
      errorObj,
    );
  }
}
