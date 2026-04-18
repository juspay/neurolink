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

import pLimit from "p-limit";
import * as fs from "fs";
import type {
  SlideSchema,
  CompleteSlide,
  PresentationTheme,
  SlideType,
  PptxPresentation,
  PptxSlide,
  LogoConfig,
  SlideGeneratorConfig,
  SlideGenerationBatchResult,
} from "../../types/index.js";
import { SLIDE_DIMENSIONS } from "../../types/index.js";
import {
  getTheme,
  isImageSlideType,
  enhanceImagePrompt,
  IMAGE_GENERATION_TIMEOUT_MS,
  MAX_CONCURRENT_IMAGE_GENERATIONS,
} from "./constants.js";

let _pptxGenJS: (new () => PptxPresentation) | null = null;
export async function loadPptxGenJS(): Promise<new () => PptxPresentation> {
  if (_pptxGenJS) {
    return _pptxGenJS;
  }
  try {
    const mod = await import(/* @vite-ignore */ "pptxgenjs");
    // ESM/CJS interop: pptxgenjs v4 may double-wrap the default export
    const Ctor =
      typeof mod.default === "function"
        ? mod.default
        : (mod.default as unknown as { default: new () => PptxPresentation })
            .default;
    _pptxGenJS = Ctor as unknown as new () => PptxPresentation;
    return _pptxGenJS;
  } catch (err) {
    const e = err instanceof Error ? (err as NodeJS.ErrnoException) : null;
    if (e?.code === "ERR_MODULE_NOT_FOUND" && e.message.includes("pptxgenjs")) {
      throw new Error(
        'PPT generation requires the "pptxgenjs" package. Install it with:\n  pnpm add pptxgenjs',
        { cause: err },
      );
    }
    throw err;
  }
}
import { logger } from "../../utils/logger.js";
import {
  withTimeout,
  ErrorFactory,
  NeuroLinkError,
} from "../../utils/errorHandling.js";
import {
  SpanSerializer,
  SpanType,
  SpanStatus,
  getMetricsAggregator,
} from "../../observability/index.js";
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
  renderDashboardSlide,
  renderMixedContentSlide,
  renderStatsGridSlide,
  renderIconGridSlide,
} from "./slideRenderers.js";

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
  private userImageIndex: number = 0;

  constructor(config: SlideGeneratorConfig) {
    this.config = config;
    this.theme =
      typeof config.theme === "string" ? getTheme(config.theme) : config.theme;
    this.neurolink = config.neurolink || null;
    this.imageLimit = pLimit(MAX_CONCURRENT_IMAGE_GENERATIONS);
  }

  /**
   * Get next user-provided image (cycles through available images)
   */
  private getNextUserImage(): Buffer | string | undefined {
    const userImages = this.config.userImages;
    if (!userImages || userImages.length === 0) {
      return undefined;
    }
    // Cycle through user images
    const image = userImages[this.userImageIndex % userImages.length];
    this.userImageIndex++;
    return image;
  }

  /**
   * Load user image to Buffer
   */
  private async loadUserImage(
    image: Buffer | string,
  ): Promise<Buffer | undefined> {
    const USER_IMAGE_IO_TIMEOUT_MS = 15000;
    try {
      if (Buffer.isBuffer(image)) {
        return image;
      }
      // String could be path or URL
      if (image.startsWith("http://") || image.startsWith("https://")) {
        const response = await withTimeout(
          fetch(image),
          USER_IMAGE_IO_TIMEOUT_MS,
          ErrorFactory.toolTimeout("userImageFetch", USER_IMAGE_IO_TIMEOUT_MS),
        );
        if (!response.ok) {
          logger.warn(`[SlideGenerator] Failed to fetch user image: ${image}`);
          return undefined;
        }
        return Buffer.from(await response.arrayBuffer());
      }
      // File path - use async read
      const fsPromises = await import("fs/promises");
      return await fsPromises.readFile(image);
    } catch (error) {
      logger.warn(`[SlideGenerator] Failed to load user image`, {
        error: error instanceof Error ? error.message : String(error),
      });
      return undefined;
    }
  }

  /**
   * Generate a single complete slide
   */
  async generateSlide(slideSchema: SlideSchema): Promise<CompleteSlide> {
    const span = SpanSerializer.createSpan(
      SpanType.PPT_GENERATION,
      "ppt.generateSlide",
      {
        "ppt.operation": "generateSlide",
        "ppt.slideIndex": slideSchema.slideNumber,
        "ppt.theme": this.theme.name,
      },
    );
    const startTime = Date.now();

    try {
      let imageBuffer: Buffer | undefined;
      let imageMetadata: CompleteSlide["imageMetadata"];

      // Check if this slide type supports images
      if (isImageSlideType(slideSchema.type)) {
        // Priority 1: Use user-provided images if available (always used regardless of generateAIImages)
        const userImage = this.getNextUserImage();
        if (userImage) {
          logger.info(
            `[SlideGenerator] 📷 Using user-provided image for slide ${slideSchema.slideNumber}: "${slideSchema.title}"`,
          );
          imageBuffer = await this.loadUserImage(userImage);
          if (imageBuffer) {
            imageMetadata = {
              prompt: "User-provided image",
              model: "user-upload",
              generatedAt: new Date(),
            };
          }
        }

        // Priority 2: Generate AI image only if generateAIImages is true, no user image, and imagePrompt exists
        if (
          !imageBuffer &&
          this.config.generateAIImages &&
          slideSchema.imagePrompt
        ) {
          logger.info(
            `[SlideGenerator] ⏳ Generating AI image for slide ${slideSchema.slideNumber}: "${slideSchema.title}"...`,
          );

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
      }

      const generationTime = Date.now() - startTime;

      logger.debug(
        `[SlideGenerator] Generated slide ${slideSchema.slideNumber} (${slideSchema.type})`,
        {
          hasImage: !!imageBuffer,
          generationTime,
        },
      );

      const endedSpan = SpanSerializer.endSpan(span, SpanStatus.OK);
      getMetricsAggregator().recordSpan(endedSpan);

      return {
        slideNumber: slideSchema.slideNumber,
        schema: slideSchema,
        imageBuffer,
        imageMetadata,
        generationTime,
      };
    } catch (error) {
      const endedSpan = SpanSerializer.endSpan(span, SpanStatus.ERROR);
      endedSpan.statusMessage =
        error instanceof Error ? error.message : String(error);
      getMetricsAggregator().recordSpan(endedSpan);

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

    // Count how many slides will need AI images
    const slidesNeedingAIImages = this.config.generateAIImages
      ? schemas.filter((s) => s.imagePrompt && isImageSlideType(s.type)).length
      : 0;

    // Count user-provided images
    const userImagesCount = this.config.userImages?.length ?? 0;

    logger.info(`[SlideGenerator] Generating ${schemas.length} slides...`, {
      theme: this.theme.name,
      generateAIImages: this.config.generateAIImages,
      slidesNeedingAIImages,
      userImagesProvided: userImagesCount,
    });

    // Reset image index for fresh generation
    this.userImageIndex = 0;

    const slidePromises = schemas.map((schema) =>
      this.imageLimit(() => this.generateSlide(schema)),
    );
    const slides = await Promise.all(slidePromises);

    const totalImages = slides.filter((s) => s.imageBuffer).length;
    const failedImages = this.config.generateAIImages
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

      // Decode and validate the image buffer
      const buffer = Buffer.from(result.imageOutput.base64, "base64");

      // Validate minimum size (corrupted or empty images)
      if (buffer.length < 100) {
        logger.warn(
          `[SlideGenerator] Image buffer too small (${buffer.length} bytes) for ${slideType}`,
        );
        return null;
      }

      // Validate image format by checking magic bytes
      const isValidFormat =
        // JPEG
        (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) ||
        // PNG
        (buffer[0] === 0x89 &&
          buffer[1] === 0x50 &&
          buffer[2] === 0x4e &&
          buffer[3] === 0x47) ||
        // GIF
        (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) ||
        // WebP
        (buffer[0] === 0x52 &&
          buffer[1] === 0x49 &&
          buffer[2] === 0x46 &&
          buffer[3] === 0x46);

      if (!isValidFormat) {
        logger.warn(
          `[SlideGenerator] Unknown image format for ${slideType}, magic bytes: ${buffer.slice(0, 4).toString("hex")}`,
        );
        // Still try to use it - might work
      }

      logger.debug(
        `[SlideGenerator] Image generated successfully for ${slideType}`,
        {
          size: buffer.length,
          format:
            buffer[0] === 0xff
              ? "JPEG"
              : buffer[0] === 0x89
                ? "PNG"
                : buffer[0] === 0x47
                  ? "GIF"
                  : "unknown",
        },
      );

      return {
        buffer,
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
        renderContentSlide({
          slide,
          title,
          content,
          layout,
          theme: this.theme,
          imageBuffer,
          slideType: type,
        });
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
      // Composite/Dashboard slides - multiple content types on one slide
      case "dashboard":
        if (content.dashboard) {
          renderDashboardSlide(
            slide,
            title,
            content.dashboard as {
              layout:
                | "left-right"
                | "top-bottom"
                | "three-cols"
                | "quadrants"
                | "five-boxes"
                | "six-boxes"
                | "main-sidebar"
                | "top-three";
              zones: Array<{
                type: "bullets" | "chart" | "stats" | "icon-box" | "text-box";
                title?: string;
                data?: unknown;
                isPrimary?: boolean;
              }>;
            },
            this.theme,
          );
        }
        break;
      case "mixed-content":
        renderMixedContentSlide(slide, title, content, this.theme);
        break;
      case "stats-grid":
        renderStatsGridSlide(slide, title, content, this.theme);
        break;
      case "icon-grid":
        renderIconGridSlide(slide, title, content, this.theme);
        break;
      case "blank":
        break;
      default:
        renderContentSlide({
          slide,
          title,
          content,
          layout,
          theme: this.theme,
          imageBuffer,
          slideType: type,
        });
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
