/**
 * PPT Slide Generator
 *
 * Generates individual complete slides with content, images, and layout.
 * Uses existing NeuroLink image generation capabilities and pptxgenjs for slide creation.
 *
 * Architecture:
 * - Receives SlideSchema from ContentPlanner
 * - Generates AI images for applicable slide types
 * - Creates pptxgenjs slides with proper layouts
 * - Returns CompleteSlide objects ready for assembly
 *
 * @module presentation/slideGenerator
 */

import PptxGenJS from "pptxgenjs";
import pLimit from "p-limit";
import * as fs from "fs";
import type {
  SlideSchema,
  CompleteSlide,
  PresentationTheme,
  SlideType,
  AspectRatioOption,
  PptxSlide,
  PptxPresentation,
} from "./types.js";
import { SLIDE_DIMENSIONS } from "./types.js";
import {
  getTheme,
  isImageSlideType,
  enhanceImagePrompt,
  IMAGE_GENERATION_TIMEOUT_MS,
  MAX_CONCURRENT_IMAGE_GENERATIONS,
} from "./constants.js";
import { logger } from "../../utils/logger.js";
import {
  withTimeout,
  ErrorFactory,
  NeuroLinkError,
} from "../../utils/errorHandling.js";
import { NeuroLink } from "../../neurolink.js";
import {
  LAYOUT_POSITIONS,
  renderTitleSlide,
  renderSectionHeaderSlide,
  renderThankYouSlide,
  renderContentSlide,
  renderImageSlide,
  renderTwoColumnSlide,
  renderThreeColumnSlide,
  renderQuoteSlide,
  renderStatisticsSlide,
  renderChartSlide,
  renderTableSlide,
  renderTimelineSlide,
  renderProcessFlowSlide,
  renderComparisonSlide,
  renderFeaturesSlide,
  renderTeamSlide,
  renderConclusionSlide,
} from "./slideRenderers.js";

/**
 * Logo position options for slides
 */
export type LogoPosition =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right"
  | "title-only";

/**
 * Logo configuration options
 */
export type LogoConfig = {
  /** Logo data - Buffer, base64 string, data URI, or file path */
  data: Buffer | string;
  /** Position on slides (default: "bottom-right") */
  position?: LogoPosition;
  /** Width in inches (default: 1) */
  width?: number;
  /** Height in inches (default: 0.4) */
  height?: number;
  /** Show on all slides or specific types (default: "all-slides") */
  showOn?: "all-slides" | "title-only" | "title-and-closing";
};

/**
 * Configuration for slide generation
 */
export type SlideGeneratorConfig = {
  /** Theme name or custom theme */
  theme: string | PresentationTheme;
  /** Whether to generate AI images */
  includeImages: boolean;
  /** Aspect ratio for slides */
  aspectRatio: AspectRatioOption;
  /** Provider for image generation */
  provider?: string;
  /** Model for image generation */
  imageModel?: string;
  /** Logo configuration */
  logo?: Buffer | string | LogoConfig;
  /** NeuroLink instance for image generation */
  neurolink?: NeuroLink;
};

/**
 * Result from generating a batch of slides
 */
export type SlideGenerationBatchResult = {
  slides: CompleteSlide[];
  totalImages: number;
  failedImages: number;
  generationTime: number;
};

// ============================================================================
// SLIDE GENERATOR CLASS
// ============================================================================

/**
 * Generates individual slides with content, images, and proper layouts
 */
export class SlideGenerator {
  private theme: PresentationTheme;
  private config: SlideGeneratorConfig;
  private neurolink: NeuroLink | null;
  private imageLimit: ReturnType<typeof pLimit>;

  constructor(config: SlideGeneratorConfig) {
    this.config = config;
    this.theme =
      typeof config.theme === "string" ? getTheme(config.theme) : config.theme;
    this.neurolink = config.neurolink || null;
    this.imageLimit = pLimit(MAX_CONCURRENT_IMAGE_GENERATIONS);
  }

  /**
   * Generate a single complete slide
   */
  async generateSlide(slideSchema: SlideSchema): Promise<CompleteSlide> {
    const startTime = Date.now();

    try {
      let imageBuffer: Buffer | undefined;
      let imageMetadata: CompleteSlide["imageMetadata"];

      if (
        this.config.includeImages &&
        slideSchema.imagePrompt &&
        isImageSlideType(slideSchema.type)
      ) {
        const imageResult = await this.generateImage(
          slideSchema.imagePrompt,
          slideSchema.type,
        );
        if (imageResult) {
          imageBuffer = imageResult.buffer;
          imageMetadata = {
            prompt: slideSchema.imagePrompt,
            model: imageResult.model,
            generatedAt: new Date(),
          };
        }
      }

      const generationTime = Date.now() - startTime;

      logger.debug(
        `[SlideGenerator] Generated slide ${slideSchema.slideNumber} (${slideSchema.type})`,
        {
          hasImage: !!imageBuffer,
          generationTime,
        },
      );

      return {
        slideNumber: slideSchema.slideNumber,
        schema: slideSchema,
        imageBuffer,
        imageMetadata,
        generationTime,
      };
    } catch (error) {
      const err =
        error instanceof NeuroLinkError
          ? error
          : ErrorFactory.toolExecutionFailed(
              "slideGenerator",
              error instanceof Error ? error : new Error(String(error)),
            );
      logger.error(
        `[SlideGenerator] Failed to generate slide ${slideSchema.slideNumber}`,
        {
          error: err.message,
          type: slideSchema.type,
        },
      );

      return {
        slideNumber: slideSchema.slideNumber,
        schema: slideSchema,
        generationTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Generate multiple slides in parallel (with concurrency limit)
   */
  async generateSlides(
    schemas: SlideSchema[],
  ): Promise<SlideGenerationBatchResult> {
    const startTime = Date.now();

    logger.info(`[SlideGenerator] Generating ${schemas.length} slides...`, {
      theme: this.theme.name,
      includeImages: this.config.includeImages,
    });

    const slidePromises = schemas.map((schema) =>
      this.imageLimit(() => this.generateSlide(schema)),
    );
    const slides = await Promise.all(slidePromises);

    const totalImages = slides.filter((s) => s.imageBuffer).length;
    const failedImages = this.config.includeImages
      ? schemas.filter(
          (s) =>
            s.imagePrompt &&
            isImageSlideType(s.type) &&
            !slides.find((sl) => sl.slideNumber === s.slideNumber)?.imageBuffer,
        ).length
      : 0;

    const generationTime = Date.now() - startTime;

    logger.info(`[SlideGenerator] Slide generation complete`, {
      totalSlides: slides.length,
      totalImages,
      failedImages,
      generationTime,
    });

    return { slides, totalImages, failedImages, generationTime };
  }

  /**
   * Render a CompleteSlide to a pptxgenjs slide
   */
  renderSlide(
    ppt: PptxPresentation,
    completeSlide: CompleteSlide,
    slideNumber: number,
    totalSlides: number,
  ): PptxSlide {
    const { schema, imageBuffer } = completeSlide;
    const slide = ppt.addSlide();

    this.applyBackground(slide, schema.type);
    this.applyLayout(slide, schema, imageBuffer);

    if (schema.type !== "title" && schema.type !== "thank-you") {
      this.addSlideNumber(slide, slideNumber, totalSlides);
    }

    this.addLogo(slide, schema.type);

    if (schema.speakerNotes) {
      slide.addNotes(schema.speakerNotes);
    }

    return slide;
  }

  // ============================================================================
  // IMAGE GENERATION
  // ============================================================================

  private async generateImage(
    prompt: string,
    slideType: SlideType,
  ): Promise<{ buffer: Buffer; model?: string } | null> {
    if (!this.neurolink) {
      logger.warn(
        "[SlideGenerator] No NeuroLink instance provided, skipping image generation",
      );
      return null;
    }

    try {
      const enhancedPrompt = enhanceImagePrompt(prompt, this.theme.name);

      logger.debug(`[SlideGenerator] Generating image for ${slideType}`, {
        promptPreview: enhancedPrompt.substring(0, 100),
      });

      const result = await withTimeout(
        this.neurolink.generate({
          input: { text: enhancedPrompt },
          provider:
            (this.config.provider as "vertex" | "google-ai") || "vertex",
          model: this.config.imageModel || "gemini-2.5-flash-image",
        }),
        IMAGE_GENERATION_TIMEOUT_MS,
        ErrorFactory.toolTimeout(
          "imageGeneration",
          IMAGE_GENERATION_TIMEOUT_MS,
        ),
      );

      if (!result || !result.imageOutput?.base64) {
        logger.warn(`[SlideGenerator] No image data returned for ${slideType}`);
        return null;
      }

      return {
        buffer: Buffer.from(result.imageOutput.base64, "base64"),
        model: result.model || this.config.imageModel,
      };
    } catch (error) {
      const err =
        error instanceof NeuroLinkError
          ? error
          : ErrorFactory.toolExecutionFailed(
              "imageGeneration",
              error instanceof Error ? error : new Error(String(error)),
            );
      logger.error(`[SlideGenerator] Image generation failed`, {
        error: err.message,
        slideType,
      });
      return null;
    }
  }

  // ============================================================================
  // LAYOUT APPLICATION
  // ============================================================================

  private applyBackground(slide: PptxSlide, _slideType: SlideType): void {
    slide.background = { color: this.theme.colors.background.replace("#", "") };
  }

  private applyLayout(
    slide: PptxSlide,
    schema: SlideSchema,
    imageBuffer?: Buffer,
  ): void {
    const { type, layout, title, content } = schema;

    switch (type) {
      case "title":
        renderTitleSlide(slide, title, content, this.theme, imageBuffer);
        break;
      case "section-header":
        renderSectionHeaderSlide(slide, title, content, this.theme);
        break;
      case "content":
      case "bullets":
      case "agenda":
      case "numbered-list":
        renderContentSlide(
          slide,
          title,
          content,
          layout,
          this.theme,
          imageBuffer,
        );
        break;
      case "image-focus":
      case "image-left":
      case "image-right":
      case "full-bleed-image":
        renderImageSlide(
          slide,
          title,
          content,
          layout,
          this.theme,
          imageBuffer,
        );
        break;
      case "two-column":
      case "split-content":
        renderTwoColumnSlide(
          slide,
          title,
          content,
          layout,
          this.theme,
          imageBuffer,
        );
        break;
      case "three-column":
        renderThreeColumnSlide(slide, title, content, this.theme);
        break;
      case "quote":
        renderQuoteSlide(slide, title, content, this.theme);
        break;
      case "statistics":
        renderStatisticsSlide(slide, title, content, this.theme);
        break;
      case "chart-bar":
      case "chart-line":
      case "chart-pie":
      case "chart-area":
        renderChartSlide(slide, title, content, type, this.theme);
        break;
      case "table":
        renderTableSlide(slide, title, content, this.theme);
        break;
      case "timeline":
        renderTimelineSlide(slide, title, content, this.theme);
        break;
      case "process-flow":
        renderProcessFlowSlide(slide, title, content, this.theme);
        break;
      case "comparison":
        renderComparisonSlide(slide, title, content, this.theme);
        break;
      case "features":
      case "icons":
        renderFeaturesSlide(slide, title, content, this.theme);
        break;
      case "team":
        renderTeamSlide(slide, title, content, this.theme);
        break;
      case "conclusion":
        renderConclusionSlide(slide, title, content, this.theme);
        break;
      case "thank-you":
      case "closing":
        renderThankYouSlide(slide, title, content, this.theme, imageBuffer);
        break;
      case "blank":
        break;
      default:
        renderContentSlide(
          slide,
          title,
          content,
          layout,
          this.theme,
          imageBuffer,
        );
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private getLogoConfig(): LogoConfig | null {
    if (!this.config.logo) {
      return null;
    }

    if (
      Buffer.isBuffer(this.config.logo) ||
      typeof this.config.logo === "string"
    ) {
      return {
        data: this.config.logo,
        position: "bottom-right",
        width: 1,
        height: 0.4,
        showOn: "all-slides",
      };
    }

    return {
      data: this.config.logo.data,
      position: this.config.logo.position || "bottom-right",
      width: this.config.logo.width || 1,
      height: this.config.logo.height || 0.4,
      showOn: this.config.logo.showOn || "all-slides",
    };
  }

  private getLogoDataUri(logoData: Buffer | string): string {
    if (Buffer.isBuffer(logoData)) {
      return `data:image/png;base64,${logoData.toString("base64")}`;
    }

    if (logoData.startsWith("data:")) {
      return logoData;
    }

    if (
      logoData.includes("/") ||
      logoData.includes("\\") ||
      logoData.endsWith(".png") ||
      logoData.endsWith(".jpg") ||
      logoData.endsWith(".jpeg") ||
      logoData.endsWith(".svg")
    ) {
      try {
        if (fs.existsSync(logoData)) {
          const buffer = fs.readFileSync(logoData);
          const ext = logoData.split(".").pop()?.toLowerCase();
          const mimeType =
            ext === "svg"
              ? "image/svg+xml"
              : ext === "jpg" || ext === "jpeg"
                ? "image/jpeg"
                : "image/png";
          return `data:${mimeType};base64,${buffer.toString("base64")}`;
        }
      } catch {
        logger.warn(
          "[SlideGenerator] Could not read logo file, treating as base64",
        );
      }
    }

    return `data:image/png;base64,${logoData}`;
  }

  private addLogo(slide: PptxSlide, slideType?: SlideType): void {
    const logoConfig = this.getLogoConfig();
    if (!logoConfig) {
      return;
    }

    const showOn = logoConfig.showOn || "all-slides";
    if (showOn === "title-only" && slideType !== "title") {
      return;
    }
    if (
      showOn === "title-and-closing" &&
      slideType !== "title" &&
      slideType !== "thank-you" &&
      slideType !== "closing"
    ) {
      return;
    }

    const logoDataUri = this.getLogoDataUri(logoConfig.data);
    const position = logoConfig.position || "bottom-right";
    const width = logoConfig.width || 1;
    const height = logoConfig.height || 0.4;

    let x: number;
    let y: number;

    const positionMap = LAYOUT_POSITIONS.logo;
    if (position === "title-only") {
      x = positionMap["bottom-right"].x;
      y = positionMap["bottom-right"].y;
    } else {
      x = positionMap[position].x;
      y = positionMap[position].y;
    }

    if (position === "top-right" || position === "bottom-right") {
      const { width: slideW } = SLIDE_DIMENSIONS[this.config.aspectRatio];
      x = slideW - width - 0.3;
    }
    if (position === "bottom-left" || position === "bottom-right") {
      const { height: slideH } = SLIDE_DIMENSIONS[this.config.aspectRatio];
      y = slideH - height - 0.2;
    }

    slide.addImage({
      data: logoDataUri,
      x,
      y,
      w: width,
      h: height,
      sizing: { type: "contain", w: width, h: height },
    });
  }

  private addSlideNumber(
    slide: PptxSlide,
    current: number,
    total: number,
  ): void {
    slide.addText(`${current} / ${total}`, {
      x: LAYOUT_POSITIONS.footer.x,
      y: LAYOUT_POSITIONS.footer.y,
      w: LAYOUT_POSITIONS.footer.w,
      h: LAYOUT_POSITIONS.footer.h,
      fontSize: this.theme.fonts.sizes.caption,
      fontFace: this.theme.fonts.body,
      color: this.theme.colors.muted.replace("#", ""),
      align: "right",
    });
  }
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

export { PptxGenJS };

export function createSlideGenerator(
  config: SlideGeneratorConfig,
): SlideGenerator {
  return new SlideGenerator(config);
}

export async function generateSlidesFromPlan(
  schemas: SlideSchema[],
  config: SlideGeneratorConfig,
): Promise<SlideGenerationBatchResult> {
  const generator = createSlideGenerator(config);
  return generator.generateSlides(schemas);
}
