/**
 * PPT Content Planner
 *
 * Generates structured slide content plan using AI.
 * Takes a topic and configuration, returns a detailed ContentPlan JSON.
 *
 * Follows the video handler pattern (vertexVideoHandler.ts):
 * - Standalone module with clear responsibility
 * - Uses AI provider for generation
 * - Returns structured result
 *
 * @module presentation/contentPlanner
 */

import type {
  AIProvider,
  ContentPlan,
  SlideSchema,
  SlideType,
  SlideLayout,
  PPTGenerationContext,
  BulletPoint,
  SlideContent,
  BulletStyle,
} from "../../types/index.js";
import { PPTError, PPT_ERROR_CODES } from "./pptError.js";
import {
  CONTENT_PLANNING_SYSTEM_PROMPT,
  buildContentPlanningPrompt,
  CONTENT_PLANNING_TIMEOUT_MS,
  SLIDE_TYPE_TO_LAYOUT,
} from "./constants.js";
import {
  normalizeSlideWithInference,
  applyBulletStyleToContent,
} from "./slideTypeInference.js";
import { logger } from "../../utils/logger.js";

// ============================================================================
// VALID TYPE/LAYOUT CONSTANTS
// ============================================================================

/**
 * All valid slide types (must match SlideType in pptTypes.ts)
 */
const VALID_SLIDE_TYPES: Set<SlideType> = new Set([
  // Opening/Closing
  "title",
  "section-header",
  "thank-you",
  "closing",
  // Content
  "content",
  "agenda",
  "bullets",
  "numbered-list",
  // Visual
  "image-focus",
  "image-left",
  "image-right",
  "full-bleed-image",
  "gallery",
  // Layout
  "two-column",
  "three-column",
  "split-content",
  // Data
  "table",
  "chart-bar",
  "chart-line",
  "chart-pie",
  "chart-area",
  "statistics",
  // Special
  "quote",
  "timeline",
  "process-flow",
  "comparison",
  "features",
  "team",
  "icons",
  "conclusion",
  "blank",
  // Composite/Dashboard (multiple content types)
  "dashboard",
  "mixed-content",
  "stats-grid",
  "icon-grid",
]);

/**
 * All valid slide layouts (must match SlideLayout in pptTypes.ts)
 */
const VALID_SLIDE_LAYOUTS: Set<SlideLayout> = new Set([
  // Title
  "title-centered",
  "title-bottom",
  "title-left-aligned",
  // Content
  "title-content",
  "title-content-footer",
  "content-only",
  // Image
  "image-left-content-right",
  "image-right-content-left",
  "image-top-content-bottom",
  "image-bottom-content-top",
  "image-full-overlay",
  "image-centered",
  "image-grid-2x2",
  // Column
  "two-column-equal",
  "two-column-wide-left",
  "two-column-wide-right",
  "three-column-equal",
  // Data
  "chart-full",
  "chart-with-bullets",
  "table-full",
  "table-with-notes",
  // Special
  "quote-centered",
  "quote-with-image",
  "statistics-row",
  "statistics-grid",
  "timeline-horizontal",
  "timeline-vertical",
  "process-horizontal",
  "process-vertical",
  "comparison-side-by-side",
  "comparison-table",
  "team-grid",
  "icon-grid",
  "summary-bullets",
  "contact-info",
  "blank-full",
]);

/**
 * Validate and normalize slide type
 */
function validateSlideType(
  type: unknown,
  fallback: SlideType = "content",
): SlideType {
  if (typeof type === "string" && VALID_SLIDE_TYPES.has(type as SlideType)) {
    return type as SlideType;
  }
  logger.warn(
    `[ContentPlanner] Invalid slide type "${type}", using "${fallback}"`,
  );
  return fallback;
}

/**
 * Validate and normalize slide layout
 */
function validateSlideLayout(
  layout: unknown,
  slideType: SlideType,
): SlideLayout {
  // If valid layout, use it
  if (
    typeof layout === "string" &&
    VALID_SLIDE_LAYOUTS.has(layout as SlideLayout)
  ) {
    return layout as SlideLayout;
  }

  // Get default layout for this slide type
  const defaultLayouts = SLIDE_TYPE_TO_LAYOUT[slideType];
  const fallback = defaultLayouts?.[0] || "title-content";

  logger.warn(
    `[ContentPlanner] Invalid layout "${layout}" for type "${slideType}", using "${fallback}"`,
  );
  return fallback;
}

// ============================================================================
// CONTENT NORMALIZATION (Hybrid Bullet Formatting)
// Handles various AI output formats and converts to expected structure
// ============================================================================

/** Valid bullet styles for validation */
const VALID_BULLET_STYLES: Set<BulletStyle> = new Set([
  "disc",
  "number",
  "checkmark",
  "arrow",
  "dash",
  "none",
]);

/**
 * Normalize a single bullet item from AI output
 * Handles: string, {text: string}, or malformed objects
 */
function normalizeBulletItem(item: unknown): BulletPoint | null {
  // Case 1: Already a valid BulletPoint object
  if (item && typeof item === "object" && "text" in item) {
    const obj = item as Record<string, unknown>;
    const normalized: BulletPoint = {
      text: String(obj.text || ""),
    };

    // Preserve optional fields if valid
    if (Array.isArray(obj.subBullets)) {
      normalized.subBullets = obj.subBullets.map((s) => String(s));
    }
    if (typeof obj.icon === "string") {
      normalized.icon = obj.icon;
    }
    if (typeof obj.emphasis === "boolean") {
      normalized.emphasis = obj.emphasis;
    }

    // Preserve AI-specified formatting if valid
    if (
      typeof obj.fontSize === "number" &&
      obj.fontSize >= 8 &&
      obj.fontSize <= 48
    ) {
      normalized.fontSize = obj.fontSize;
    }
    if (
      typeof obj.bulletStyle === "string" &&
      VALID_BULLET_STYLES.has(obj.bulletStyle as BulletStyle)
    ) {
      normalized.bulletStyle = obj.bulletStyle as BulletStyle;
    }
    if (
      typeof obj.color === "string" &&
      obj.color.match(/^#?[0-9A-Fa-f]{6}$/)
    ) {
      normalized.color = obj.color.startsWith("#")
        ? obj.color
        : `#${obj.color}`;
    }
    if (typeof obj.bold === "boolean") {
      normalized.bold = obj.bold;
    }

    return normalized.text ? normalized : null;
  }

  // Case 2: Plain string - convert to BulletPoint
  if (typeof item === "string" && item.trim()) {
    return { text: item.trim() };
  }

  // Case 3: Invalid - skip
  return null;
}

/**
 * Normalize an array of bullets from AI output
 * Handles: string[], {text: string}[], or mixed arrays
 */
function normalizeBullets(bullets: unknown): BulletPoint[] {
  if (!Array.isArray(bullets)) {
    return [];
  }

  const normalized: BulletPoint[] = [];
  for (const item of bullets) {
    const bullet = normalizeBulletItem(item);
    if (bullet) {
      normalized.push(bullet);
    }
  }

  return normalized;
}

/**
 * Normalize slide content from AI output
 * Ensures bullets are in correct format, preserves other content fields
 */
function normalizeSlideContent(content: unknown): SlideContent {
  if (!content || typeof content !== "object") {
    return {};
  }

  const raw = content as Record<string, unknown>;
  const normalized: SlideContent = {};

  // Normalize main bullets array
  if (raw.bullets) {
    normalized.bullets = normalizeBullets(raw.bullets);
  }

  // Normalize column bullets (for two-column, three-column layouts)
  if (raw.leftColumn && typeof raw.leftColumn === "object") {
    const col = raw.leftColumn as Record<string, unknown>;
    normalized.leftColumn = {
      title: typeof col.title === "string" ? col.title : undefined,
      bullets: col.bullets ? normalizeBullets(col.bullets) : undefined,
      image: typeof col.image === "string" ? col.image : undefined,
    };
  }
  if (raw.rightColumn && typeof raw.rightColumn === "object") {
    const col = raw.rightColumn as Record<string, unknown>;
    normalized.rightColumn = {
      title: typeof col.title === "string" ? col.title : undefined,
      bullets: col.bullets ? normalizeBullets(col.bullets) : undefined,
      image: typeof col.image === "string" ? col.image : undefined,
    };
  }
  if (raw.centerColumn && typeof raw.centerColumn === "object") {
    const col = raw.centerColumn as Record<string, unknown>;
    normalized.centerColumn = {
      title: typeof col.title === "string" ? col.title : undefined,
      bullets: col.bullets ? normalizeBullets(col.bullets) : undefined,
      image: typeof col.image === "string" ? col.image : undefined,
    };
  }

  // Pass through other content fields as-is (quote, statistics, chartData, etc.)
  // Using keyof SlideContent for type safety
  const passThrough: (keyof SlideContent)[] = [
    "subtitle",
    "body",
    "sectionNumber",
    "quote",
    "quoteAuthor",
    "quoteAuthorTitle",
    "caption",
    "galleryImages",
    "statistics",
    "chartData",
    "tableData",
    "timeline",
    "processSteps",
    "features",
    "icons",
    "teamMembers",
    "comparison",
    "nextSteps",
    "cta",
    "ctaButton",
    "contactInfo",
    "layoutOptions",
    "dashboard",
  ];

  for (const key of passThrough) {
    if (raw[key] !== undefined) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (normalized as any)[key] = raw[key];
    }
  }

  return normalized;
}

// ============================================================================
// CONTENT PLAN VALIDATION
// ============================================================================

/**
 * Validate the structure of AI-generated content plan
 */
function validateContentPlan(
  plan: unknown,
  expectedSlides: number,
): ContentPlan {
  if (!plan || typeof plan !== "object") {
    throw new PPTError(
      "AI returned invalid response: expected object",
      PPT_ERROR_CODES.INVALID_AI_RESPONSE,
      { received: typeof plan },
    );
  }

  const p: Record<string, unknown> = plan as Record<string, unknown>;

  // Validate required fields
  if (typeof p.title !== "string" || !p.title.trim()) {
    throw new PPTError(
      "AI response missing valid 'title' field",
      PPT_ERROR_CODES.INVALID_AI_RESPONSE,
      { field: "title", received: p.title },
    );
  }

  if (!Array.isArray(p.slides)) {
    throw new PPTError(
      "AI response missing 'slides' array",
      PPT_ERROR_CODES.INVALID_AI_RESPONSE,
      { field: "slides", received: typeof p.slides },
    );
  }

  if (p.slides.length !== expectedSlides) {
    logger.warn(
      `[ContentPlanner] AI returned ${p.slides.length} slides, expected ${expectedSlides}. Adjusting...`,
    );
    // Don't throw - we'll work with what we got
  }

  // Validate each slide
  const validatedSlides: SlideSchema[] = [];
  for (let i = 0; i < p.slides.length; i++) {
    const slide = p.slides[i] as Record<string, unknown>;

    if (!slide || typeof slide !== "object") {
      throw new PPTError(
        `Invalid slide at index ${i}`,
        PPT_ERROR_CODES.INVALID_AI_RESPONSE,
        { index: i, received: typeof slide },
      );
    }

    // Validate required slide fields
    if (typeof slide.title !== "string") {
      slide.title = `Slide ${i + 1}`;
      logger.warn(
        `[ContentPlanner] Slide ${i + 1} missing title, using default`,
      );
    }

    // Validate and normalize type with proper type checking
    const validatedType = validateSlideType(slide.type, "content");

    // Normalize content - handles string bullets, mixed formats, etc.
    const normalizedContent = normalizeSlideContent(slide.content);

    // Smart inference: Infer slide type and bullet style from title keywords
    // This helps when AI doesn't explicitly specify the right type
    const {
      type: inferredType,
      bulletStyle,
      wasInferred,
    } = normalizeSlideWithInference(
      slide.title as string,
      validatedType,
      normalizedContent,
    );

    // Use inferred type if different from what AI provided
    const finalType =
      wasInferred && inferredType !== validatedType
        ? inferredType
        : validatedType;

    if (wasInferred && inferredType !== validatedType) {
      logger.debug(
        `[ContentPlanner] Slide ${i + 1} type inferred from title: "${slide.title}" → ${finalType}`,
      );
    }

    // Apply bullet style to content based on slide type
    const contentWithBulletStyle = applyBulletStyleToContent(
      normalizedContent,
      bulletStyle,
    );

    // Validate and normalize layout based on final type
    const validatedLayout = validateSlideLayout(slide.layout, finalType);

    // Ensure speakerNotes is a string
    if (typeof slide.speakerNotes !== "string") {
      slide.speakerNotes = "";
    }

    // Validate imagePrompt (can be string or null)
    if (slide.imagePrompt !== null && typeof slide.imagePrompt !== "string") {
      slide.imagePrompt = null;
    }

    validatedSlides.push({
      slideNumber: i + 1,
      type: finalType,
      layout: validatedLayout,
      title: slide.title as string,
      content: contentWithBulletStyle,
      imagePrompt: slide.imagePrompt as string | null,
      speakerNotes: slide.speakerNotes as string,
    });
  }

  return {
    title: p.title as string,
    totalSlides: validatedSlides.length,
    audience: (p.audience as string) || "general",
    tone: (p.tone as string) || "professional",
    theme: (p.theme as string) || "modern",
    slides: validatedSlides,
    keyMessages: Array.isArray(p.keyMessages)
      ? (p.keyMessages as string[])
      : undefined,
  };
}

/**
 * Parse AI response to extract JSON
 * Handles markdown code blocks (anywhere in the response), preambles like
 * "Here is the JSON:", and raw JSON.
 */
function parseAIResponse(content: string): unknown {
  const trimmed = content.trim();

  const candidates: string[] = [];

  // 1) Extract first ```json ... ``` block from anywhere in the response.
  const fenceBlock = trimmed.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (fenceBlock && fenceBlock[1]) {
    candidates.push(fenceBlock[1].trim());
  }

  // 2) Strict leading-fence strip (legacy behaviour).
  if (trimmed.startsWith("```")) {
    candidates.push(
      trimmed.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, ""),
    );
  }

  // 3) Slice from first '{' or '[' to its matching close — handles preambles
  //    like "Here is the presentation plan:\n{ ... }".
  const firstObj = trimmed.indexOf("{");
  const firstArr = trimmed.indexOf("[");
  const firstStruct =
    firstObj === -1
      ? firstArr
      : firstArr === -1
        ? firstObj
        : Math.min(firstObj, firstArr);
  if (firstStruct > 0) {
    const openChar = trimmed[firstStruct];
    const closeChar = openChar === "{" ? "}" : "]";
    const lastClose = trimmed.lastIndexOf(closeChar);
    if (lastClose > firstStruct) {
      candidates.push(trimmed.slice(firstStruct, lastClose + 1));
    }
  }

  // 4) Raw input as last resort.
  candidates.push(trimmed);

  const errors: string[] = [];
  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
    }
  }

  throw new PPTError(
    `Failed to parse AI response as JSON: ${errors[errors.length - 1]}`,
    PPT_ERROR_CODES.INVALID_AI_RESPONSE,
    {
      contentPreview: content.substring(0, 500),
      parseError: errors.join(" | "),
    },
  );
}

// ============================================================================
// MAIN CONTENT PLANNING FUNCTION
// ============================================================================

/**
 * Generate a content plan for the presentation
 *
 * This is the main entry point for content planning. It:
 * 1. Builds the AI prompt with all configuration
 * 2. Calls the AI provider to generate the plan
 * 3. Parses and validates the response
 * 4. Returns a structured ContentPlan
 *
 * @param context - PPT generation context (extracted from GenerateOptions)
 * @param provider - AI provider instance (already validated)
 * @returns Promise<ContentPlan> - Structured slide plan
 *
 * @example
 * ```typescript
 * const context = extractPPTContext(options);
 * const plan = await generateContentPlan(context, provider);
 * console.log(`Generated ${plan.totalSlides} slides`);
 * ```
 */
export async function generateContentPlan(
  context: PPTGenerationContext,
  provider: AIProvider,
): Promise<ContentPlan> {
  const startTime = Date.now();
  const sessionId = `session-${Date.now()}`;

  logger.info("[ContentPlanner] Starting content planning", {
    topic: context.topic.substring(0, 100),
    pages: context.pages,
    audience: context.audience,
    tone: context.tone,
    theme: context.theme,
    generateAIImages: context.generateAIImages,
    provider: context.provider,
    model: context.model,
    sessionId,
  });

  // Build the prompt with model info for tier detection (basic vs advanced)
  const userPrompt = buildContentPlanningPrompt({
    topic: context.topic,
    pages: context.pages,
    audience: context.audience,
    tone: context.tone,
    theme: context.theme,
    generateAIImages: context.generateAIImages,
    modelInfo: {
      name: context.model || "unknown",
      provider: context.provider || "auto-selected",
    },
  });

  try {
    // Call AI provider
    // Provider is already validated and has model set internally
    const result = await provider.generate({
      prompt: userPrompt,
      systemPrompt: CONTENT_PLANNING_SYSTEM_PROMPT,
      temperature: 0.7, // Some creativity for content
      maxTokens: 8192, // Need space for full plan
      disableTools: true, // Pure text generation, no tools
      timeout: CONTENT_PLANNING_TIMEOUT_MS,
    });

    if (!result || !result.content) {
      throw new PPTError(
        "AI provider returned empty response",
        PPT_ERROR_CODES.PLANNING_FAILED,
        { provider: context.provider },
      );
    }

    const planningTime = Date.now() - startTime;
    logger.debug("[ContentPlanner] AI response received", {
      contentLength: result.content.length,
      planningTime,
    });

    // Parse the JSON response
    const parsed = parseAIResponse(result.content);

    // Validate and structure the plan
    const plan = validateContentPlan(parsed, context.pages);

    logger.info("[ContentPlanner] Content plan generated successfully", {
      title: plan.title,
      totalSlides: plan.totalSlides,
      planningTime,
      keyMessages: plan.keyMessages?.length || 0,
    });

    return plan;
  } catch (error) {
    // Re-throw PPTError as-is
    if (error instanceof PPTError) {
      throw error;
    }

    // Wrap other errors
    const message = error instanceof Error ? error.message : String(error);
    throw new PPTError(
      `Content planning failed: ${message}`,
      PPT_ERROR_CODES.PLANNING_FAILED,
      {
        topic: context.topic.substring(0, 100),
        provider: context.provider,
      },
      error instanceof Error ? error : undefined,
    );
  }
}

// ============================================================================
// PLAN ADJUSTMENT UTILITIES
// ============================================================================

/**
 * Ensure first slide is title type
 */
export function ensureTitleSlide(plan: ContentPlan): ContentPlan {
  if (plan.slides.length > 0 && plan.slides[0].type !== "title") {
    plan.slides[0] = {
      ...plan.slides[0],
      type: "title",
      layout: "title-centered",
    };
  }
  return plan;
}

/**
 * Ensure last slide is thank-you type
 */
export function ensureThankYouSlide(plan: ContentPlan): ContentPlan {
  const lastIndex = plan.slides.length - 1;
  if (lastIndex >= 0 && plan.slides[lastIndex].type !== "thank-you") {
    plan.slides[lastIndex] = {
      ...plan.slides[lastIndex],
      type: "thank-you",
      layout: "contact-info",
    };
  }
  return plan;
}

/**
 * Apply post-processing to ensure plan follows best practices
 */
export function postProcessPlan(plan: ContentPlan): ContentPlan {
  let processed = { ...plan, slides: [...plan.slides] };
  processed = ensureTitleSlide(processed);
  processed = ensureThankYouSlide(processed);
  return processed;
}
