/**
 * PPT Generation Types
 *
 * All types for presentation generation - both external API types and internal pipeline types.
 * Used by the content planner, slide generator, and orchestrator.
 *
 * Architecture:
 * - PPTOutputOptions / PPTGenerationResult: External API types (GenerateOptions.output.ppt)
 * - SlideSchema / ContentPlan: Content planning pipeline types
 * - CompleteSlide / PPTGenerationContext: Generation context types
 * - PPTError: Error handling (follows VideoError pattern)
 */

import type { ImageWithAltText } from "./content.js";
import type { GenerateOptions } from "./generateTypes.js";
import { ErrorCategory, ErrorSeverity } from "../constants/enums.js";
import { NeuroLinkError } from "../utils/errorHandling.js";

// ============================================================================
// EXTERNAL API TYPES (Used in GenerateOptions)
// ============================================================================

export type ThemeOption =
  | "modern"
  | "corporate"
  | "creative"
  | "minimal"
  | "dark";

export type AudienceOption = "business" | "students" | "technical" | "general";

export type ToneOption =
  | "professional"
  | "casual"
  | "educational"
  | "persuasive";

export type OutputFormatOption = "pptx";

export type AspectRatioOption = "16:9" | "4:3";

/**
 * PPT output configuration options
 *
 * @example
 * ```typescript
 * const options: PPTOutputOptions = {
 *   pages: 10,
 *   theme: "modern",
 *   audience: "business",
 *   tone: "professional",
 *   includeImages: true
 * };
 * ```
 */
export type PPTOutputOptions = {
  /** Number of slides to generate (required, range: 5-50) */
  pages: number;
  /** Output format - only PPTX supported currently (default: "pptx") */
  format?: OutputFormatOption;
  /** Presentation theme/style (default: "modern") */
  theme?: ThemeOption;
  /** Target audience for content customization */
  audience?: AudienceOption;
  /** Presentation tone/style */
  tone?: ToneOption;
  /** Whether to generate AI images for slides (default: true) */
  includeImages?: boolean;
  /** Custom output file path (default: auto-generated in ./output/) */
  outputPath?: string;
  /** Aspect ratio for slides (default: "16:9") */
  aspectRatio?: AspectRatioOption;
  /** Path to logo image to include in slides */
  logoPath?: Buffer | string | ImageWithAltText;
};

/**
 * Result type for generated presentation content
 *
 * Returned in `GenerateResult.ppt` when presentation generation is successful.
 * Contains the file path and metadata about the generated presentation.
 *
 * @example
 * ```typescript
 * const result = await neurolink.generate({
 *   input: { text: "Introducing Our New Product" },
 *   provider: "vertex",
 *   output: { mode: "ppt", ppt: { pages: 10, theme: "modern" } }
 * });
 *
 * if (result.ppt) {
 *   console.log(`Presentation saved: ${result.ppt.filePath}`);
 *   console.log(`Total slides: ${result.ppt.totalSlides}`);
 *   console.log(`Theme: ${result.ppt.metadata?.theme}`);
 * }
 * ```
 */
export type PPTGenerationResult = {
  /** Path to the generated PPTX file */
  filePath: string;
  /** Total number of slides in the presentation */
  totalSlides: number;
  /** Output format (always "pptx" currently) */
  format: OutputFormatOption;
  /** Presentation metadata */
  metadata?: {
    /** Theme/style used */
    theme?: string;
    /** Target audience */
    audience?: string;
    /** Presentation tone */
    tone?: string;
    /** Model used for image generation */
    imageModel?: string;
    /** File size in bytes */
    fileSize?: number;
  };
};

// ============================================================================
// ERROR TYPES (Following VideoError pattern from vertexVideoHandler.ts)
// ============================================================================

/**
 * PPT generation error codes
 * Following the VIDEO_ERROR_CODES pattern
 */
export const PPT_ERROR_CODES = {
  /** Content planning AI call failed */
  PLANNING_FAILED: "PPT_PLANNING_FAILED",
  /** AI returned invalid/unparseable response */
  INVALID_AI_RESPONSE: "PPT_INVALID_AI_RESPONSE",
  /** Image generation for slide failed */
  IMAGE_GENERATION_FAILED: "PPT_IMAGE_GENERATION_FAILED",
  /** PPTX file assembly failed */
  ASSEMBLY_FAILED: "PPT_ASSEMBLY_FAILED",
  /** File system write failed */
  FILE_WRITE_FAILED: "PPT_FILE_WRITE_FAILED",
  /** Invalid input options */
  INVALID_INPUT: "PPT_INVALID_INPUT",
  /** Generation timeout */
  TIMEOUT: "PPT_TIMEOUT",
} as const;

/**
 * PPT generation error class
 * Extends NeuroLinkError for consistent error handling (follows VideoError pattern)
 */
export class PPTError extends NeuroLinkError {
  constructor(
    message: string,
    code: string,
    context?: Record<string, unknown>,
    originalError?: Error,
  ) {
    super({
      code,
      message,
      category: ErrorCategory.EXECUTION,
      severity: ErrorSeverity.HIGH,
      retriable: false,
      context: {
        ...context,
        originalMessage: originalError?.message,
      },
      originalError,
    });
    this.name = "PPTError";
  }
}

// ============================================================================
// SLIDE TYPES & LAYOUTS (Maps to pptxgenjs slide structures)
// ============================================================================

/**
 * Slide types (31 total)
 * Defines the purpose/content type of a slide
 */
export type SlideType =
  // Opening/Closing (4)
  | "title" // Opening slide with main title + subtitle
  | "section-header" // Section divider with large title
  | "thank-you" // Closing slide with thanks + contact
  | "closing" // Alternative closing with summary

  // Content (4)
  | "content" // Standard title + bullet points
  | "agenda" // Table of contents / overview
  | "bullets" // Enhanced bullet points with icons
  | "numbered-list" // Step-by-step or ranked content

  // Visual (5)
  | "image-focus" // Large centered image with caption
  | "image-left" // Image on left, content on right
  | "image-right" // Content on left, image on right
  | "full-bleed-image" // Full background image with text overlay
  | "gallery" // Multiple images in grid

  // Layout (3)
  | "two-column" // Two equal columns of content
  | "three-column" // Three columns for comparisons
  | "split-content" // Asymmetric 60/40 split layout

  // Data (6)
  | "table" // Data table with headers and rows
  | "chart-bar" // Bar chart for comparisons
  | "chart-line" // Line chart for trends over time
  | "chart-pie" // Pie chart for proportions
  | "chart-area" // Area chart for cumulative data
  | "statistics" // Big numbers/metrics display

  // Special (9)
  | "quote" // Impactful quote with attribution
  | "timeline" // Chronological events/milestones
  | "process-flow" // Step-by-step process diagram
  | "comparison" // Side-by-side comparison
  | "features" // Feature list with icons
  | "team" // Team member profiles
  | "icons" // Icon grid with labels
  | "conclusion" // Summary with key takeaways
  | "blank"; // Empty slide for custom content

/**
 * Slide layouts (32 total)
 * Defines the visual layout/template for a slide
 */
export type SlideLayout =
  // Title layouts (3)
  | "title-centered" // Title + subtitle centered
  | "title-bottom" // Title at top, subtitle at bottom
  | "title-left-aligned" // Title + subtitle left-aligned

  // Content layouts (3)
  | "title-content" // Title at top, content below
  | "title-content-footer" // Title + content + footer
  | "content-only" // Full slide of content (no title)

  // Image layouts (7)
  | "image-left-content-right" // Image 40%, content 60%
  | "image-right-content-left" // Content 60%, image 40%
  | "image-top-content-bottom" // Image top half, content bottom
  | "image-bottom-content-top" // Content top, image bottom
  | "image-full-overlay" // Full background image with text overlay
  | "image-centered" // Centered image with title
  | "image-grid-2x2" // 2x2 grid of images

  // Column layouts (4)
  | "two-column-equal" // 50/50 split
  | "two-column-wide-left" // 60/40 split (left wider)
  | "two-column-wide-right" // 40/60 split (right wider)
  | "three-column-equal" // 33/33/33 split

  // Data layouts (4)
  | "chart-full" // Chart fills most of slide
  | "chart-with-bullets" // Chart + bullet points
  | "table-full" // Table fills most of slide
  | "table-with-notes" // Table + notes section

  // Special layouts (11)
  | "quote-centered" // Quote centered on slide
  | "quote-with-image" // Quote + background image
  | "statistics-row" // Statistics in horizontal row
  | "statistics-grid" // 2x2 grid of statistics
  | "timeline-horizontal" // Horizontal timeline with points
  | "timeline-vertical" // Vertical timeline
  | "process-horizontal" // Horizontal process flow (arrows)
  | "process-vertical" // Vertical process flow
  | "comparison-side-by-side" // Two columns for comparison
  | "comparison-table" // Comparison in table format
  | "team-grid" // Team members in grid
  | "icon-grid" // Icons with labels in grid
  | "summary-bullets" // Conclusion with checkmark bullets
  | "contact-info" // Contact details layout
  | "blank-full"; // Completely blank slide

// ============================================================================
// CONTENT PLAN TYPES (Output from Content Planner)
// Maps to pptxgenjs element methods
// ============================================================================

/**
 * Bullet point with optional sub-bullets and styling
 * Maps to: addText with bullet: true option
 */
export type BulletPoint = {
  text: string;
  subBullets?: string[];
  /** Icon code for custom bullet (Unicode). Ex: "2713" for checkmark */
  icon?: string;
  /** Highlight/emphasis for this bullet */
  emphasis?: boolean;
};

/**
 * Table cell for data tables
 * Maps to: addTable cell format
 */
export type TableCell = {
  text: string;
  /** Is this a header cell? */
  isHeader?: boolean;
  /** Column span */
  colspan?: number;
  /** Row span */
  rowspan?: number;
  /** Cell alignment */
  align?: "left" | "center" | "right";
  /** Cell background color (hex) */
  fill?: string;
};

/**
 * Table row (array of cells)
 */
export type TableRow = TableCell[];

/**
 * Chart data point
 * Maps to: addChart data format
 */
export type ChartDataPoint = {
  label: string;
  value: number;
  /** Optional color for this data point (hex) */
  color?: string;
};

/**
 * Chart data series
 * Maps to: addChart series format
 */
export type ChartSeries = {
  name: string;
  labels: string[];
  values: number[];
  /** Series color (hex) */
  color?: string;
};

/**
 * Statistic/metric for statistics slides
 * Maps to: addText with large fontSize
 */
export type Statistic = {
  /** The big number/value */
  value: string;
  /** Label describing the metric */
  label: string;
  /** Optional trend indicator: up, down, neutral */
  trend?: "up" | "down" | "neutral";
  /** Change text (e.g., "+15%") */
  change?: string;
  /** Icon code (Unicode) */
  icon?: string;
};

/**
 * Timeline item for timeline slides
 * Maps to: addShape + addText
 */
export type TimelineItem = {
  /** Date or period label */
  date: string;
  /** Title of the event */
  title: string;
  /** Description */
  description?: string;
  /** Icon code (Unicode) */
  icon?: string;
};

/**
 * Process step for process-flow slides
 * Maps to: addShape (boxes/arrows) + addText
 */
export type ProcessStep = {
  /** Step number */
  step: number;
  /** Step title */
  title: string;
  /** Step description */
  description?: string;
  /** Icon code (Unicode) */
  icon?: string;
};

/**
 * Team member for team slides
 * Maps to: addImage (photo) + addText (details)
 */
export type TeamMember = {
  name: string;
  role: string;
  /** Photo prompt for AI generation */
  photoPrompt?: string;
  /** Pre-existing photo URL or base64 */
  photoData?: string;
  /** Optional social/contact link */
  link?: string;
};

/**
 * Feature item for features slides
 * Maps to: addImage/addShape (icon) + addText
 */
export type FeatureItem = {
  title: string;
  description: string;
  /** Icon code (Unicode) or image prompt */
  icon?: string;
  /** Image prompt if using AI-generated icon */
  iconPrompt?: string;
};

/**
 * Comparison column for comparison slides
 */
export type ComparisonColumn = {
  title: string;
  items: string[];
  /** Highlight color for this column (e.g., for the "better" option) */
  highlight?: boolean;
};

/**
 * Content structure for a slide - varies by slide type
 * This is the main content payload that the slide generator uses
 */
export type SlideContent = {
  // ---- Basic Content ----
  /** Main bullet points (for content/bullets/agenda slides) */
  bullets?: BulletPoint[];
  /** Subtitle (for title/section-header slides) */
  subtitle?: string;
  /** Body text (for simple text content) */
  body?: string;
  /** Section number (for section-header slides) */
  sectionNumber?: number;

  // ---- Quote Content ----
  /** Quote text (for quote slides) */
  quote?: string;
  /** Quote author/attribution */
  quoteAuthor?: string;
  /** Author title/role */
  quoteAuthorTitle?: string;

  // ---- Column Content ----
  /** Left column content (for two-column/comparison) */
  leftColumn?: {
    title?: string;
    bullets?: BulletPoint[];
    image?: string; // Image prompt or URL
  };
  /** Right column content (for two-column/comparison) */
  rightColumn?: {
    title?: string;
    bullets?: BulletPoint[];
    image?: string;
  };
  /** Center column (for three-column layouts) */
  centerColumn?: {
    title?: string;
    bullets?: BulletPoint[];
    image?: string;
  };

  // ---- Image Content ----
  /** Caption for image-focused slides */
  caption?: string;
  /** Multiple images for gallery slides */
  galleryImages?: Array<{
    prompt: string;
    caption?: string;
  }>;

  // ---- Table Content ----
  /** Table data for table slides */
  tableData?: {
    headers?: string[];
    rows: TableRow[];
    /** Show header row with different styling */
    hasHeader?: boolean;
    /** Caption below table */
    caption?: string;
  };

  // ---- Chart Content ----
  /** Chart configuration for chart slides */
  chartData?: {
    /** Chart type matches SlideType: chart-bar, chart-line, chart-pie, chart-area */
    type: "bar" | "line" | "pie" | "doughnut" | "area" | "radar" | "scatter";
    /** Chart title */
    title?: string;
    /** Single series for simple charts */
    series?: ChartSeries[];
    /** Legend position */
    legendPosition?: "top" | "bottom" | "left" | "right" | "none";
    /** Show data labels on chart */
    showLabels?: boolean;
    /** Show value axis */
    showValueAxis?: boolean;
    /** Show category axis */
    showCategoryAxis?: boolean;
  };

  // ---- Statistics Content ----
  /** Statistics/metrics for statistics slides */
  statistics?: Statistic[];

  // ---- Timeline Content ----
  /** Timeline items for timeline slides */
  timeline?: {
    items: TimelineItem[];
    /** Horizontal or vertical layout */
    orientation?: "horizontal" | "vertical";
  };

  // ---- Process Flow Content ----
  /** Process steps for process-flow slides */
  processSteps?: ProcessStep[];

  // ---- Team Content ----
  /** Team members for team slides */
  teamMembers?: TeamMember[];

  // ---- Features Content ----
  /** Feature items for features slides */
  features?: FeatureItem[];

  // ---- Comparison Content ----
  /** Comparison data for comparison slides */
  comparison?: {
    columns: ComparisonColumn[];
    /** Comparison title (e.g., "Basic vs Pro") */
    comparisonTitle?: string;
  };

  // ---- Closing/CTA Content ----
  /** Call-to-action text */
  cta?: string;
  /** CTA button text */
  ctaButton?: string;
  /** Contact information (for thank-you/closing slides) */
  contactInfo?: {
    email?: string;
    website?: string;
    phone?: string;
    social?: {
      platform: string;
      handle: string;
    }[];
    address?: string;
  };
  /** Next steps list (for closing slides) */
  nextSteps?: string[];

  // ---- Icons Content ----
  /** Icon items for icon-grid slides */
  icons?: Array<{
    icon: string; // Unicode or icon name
    label: string;
    description?: string;
  }>;
};

/**
 * Schema for a single slide in the content plan
 */
export type SlideSchema = {
  /** Slide number (1-based) */
  slideNumber: number;
  /** Type of slide (determines purpose) */
  type: SlideType;
  /** Layout template to use */
  layout: SlideLayout;
  /** Slide title */
  title: string;
  /** Slide content based on type */
  content: SlideContent;
  /**
   * AI image generation prompt (null = no image for this slide)
   * Should describe a professional, relevant image WITHOUT text in the image
   */
  imagePrompt: string | null;
  /** Speaker notes for the presenter */
  speakerNotes: string;
};

/**
 * Complete content plan generated by AI
 */
export type ContentPlan = {
  /** Presentation title */
  title: string;
  /** Total number of slides */
  totalSlides: number;
  /** Target audience used for content */
  audience: string;
  /** Tone used for content */
  tone: string;
  /** Theme to apply */
  theme: string;
  /** Array of slide schemas */
  slides: SlideSchema[];
  /** Key messages/themes identified */
  keyMessages?: string[];
};

// ============================================================================
// THEME TYPES
// ============================================================================

/**
 * Color palette for a theme
 */
export type ThemeColors = {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
  textOnPrimary: string;
  muted: string;
};

/**
 * Font configuration for a theme
 */
export type ThemeFonts = {
  heading: string;
  body: string;
  sizes: {
    title: number;
    subtitle: number;
    heading: number;
    body: number;
    caption: number;
  };
};

/**
 * Complete theme definition
 */
export type PresentationTheme = {
  name: string;
  displayName: string;
  description: string;
  colors: ThemeColors;
  fonts: ThemeFonts;
};

// ============================================================================
// GENERATION CONTEXT (Passed through pipeline)
// ============================================================================

/**
 * Context extracted from GenerateOptions for PPT generation
 */
export type PPTGenerationContext = {
  /** Original topic/prompt from user */
  topic: string;
  /** Number of slides requested */
  pages: number;
  /** Selected theme name */
  theme: string;
  /** Target audience */
  audience: string;
  /** Presentation tone */
  tone: string;
  /** Whether to generate images */
  includeImages: boolean;
  /** Aspect ratio */
  aspectRatio: AspectRatioOption;
  /** Custom output path */
  outputPath?: string;
  /** Logo data or path if provided */
  logo?: Buffer | string;
  /** Provider name (for logging) */
  provider?: string;
  /** Model name (for logging) */
  model?: string;
};

/**
 * Extract PPT generation context from GenerateOptions
 */
export function extractPPTContext(
  options: GenerateOptions,
): PPTGenerationContext {
  const pptOptions = options.output?.ppt;

  if (!pptOptions) {
    throw new PPTError(
      "PPT options are required when mode is 'ppt'",
      PPT_ERROR_CODES.INVALID_INPUT,
      { field: "output.ppt" },
    );
  }

  // Handle logo from input.images[0] if not in logoPath
  let logo: Buffer | string | undefined;
  if (pptOptions.logoPath) {
    if (
      Buffer.isBuffer(pptOptions.logoPath) ||
      typeof pptOptions.logoPath === "string"
    ) {
      logo = pptOptions.logoPath;
    } else if (
      typeof pptOptions.logoPath === "object" &&
      "data" in pptOptions.logoPath
    ) {
      const data = pptOptions.logoPath.data;
      logo =
        Buffer.isBuffer(data) || typeof data === "string" ? data : undefined;
    }
  }

  return {
    topic: options.input.text,
    pages: pptOptions.pages,
    theme: pptOptions.theme || "modern",
    audience: pptOptions.audience || "general",
    tone: pptOptions.tone || "professional",
    includeImages: pptOptions.includeImages ?? true,
    aspectRatio: pptOptions.aspectRatio || "16:9",
    outputPath: pptOptions.outputPath,
    logo,
    provider: options.provider,
    model: options.model,
  };
}

// ============================================================================
// PPTXGENJS COMPATIBLE TYPES - COMPREHENSIVE DOCUMENTATION
// These types document the full pptxgenjs API surface for reference and testing.
// For actual slide rendering, use the simplified Pptx* types at the end of this file.
// ============================================================================

/**
 * Position value - can be number (inches) or percentage string
 * Maps to: pptxgenjs PositionProps
 */
export type PositionValue = number | `${number}%`;

/**
 * Position and size properties for slide elements
 * Maps to: pptxgenjs PositionProps
 */
export type PositionProps = {
  /** Horizontal position (inches or percentage) */
  x?: PositionValue;
  /** Vertical position (inches or percentage) */
  y?: PositionValue;
  /** Width (inches or percentage) */
  w?: PositionValue;
  /** Height (inches or percentage) */
  h?: PositionValue;
};

/**
 * Shadow properties for elements
 * Maps to: pptxgenjs ShadowProps
 */
export type ShadowProps = {
  /** Shadow type */
  type: "outer" | "inner" | "none";
  /** Shadow angle in degrees (0-359) */
  angle?: number;
  /** Blur amount in points (0-100) */
  blur?: number;
  /** Shadow color (hex without #) */
  color?: string;
  /** Shadow offset in points (0-200) */
  offset?: number;
  /** Shadow opacity (0.0-1.0) */
  opacity?: number;
};

/**
 * Hyperlink properties
 * Maps to: pptxgenjs HyperlinkProps
 */
export type HyperlinkProps = {
  /** Link to external URL */
  url?: string;
  /** Link to slide number */
  slide?: number;
  /** Tooltip text */
  tooltip?: string;
};

/**
 * Shape fill properties
 * Maps to: pptxgenjs ShapeFillProps
 */
export type ShapeFillProps = {
  /** Fill color (hex without #) */
  color?: string;
  /** Transparency percentage (0-100) */
  transparency?: number;
  /** Fill type */
  type?: "solid" | "none";
};

/**
 * Shape line/border properties
 * Maps to: pptxgenjs ShapeLineProps
 */
export type ShapeLineProps = {
  /** Line color (hex without #) */
  color?: string;
  /** Line width in points (1-256) */
  width?: number;
  /** Line dash style */
  dashType?:
    | "solid"
    | "dash"
    | "dashDot"
    | "lgDash"
    | "lgDashDot"
    | "lgDashDotDot"
    | "sysDash"
    | "sysDot";
  /** Line transparency (0-100) */
  transparency?: number;
  /** Beginning arrow type */
  beginArrowType?:
    | "arrow"
    | "diamond"
    | "oval"
    | "stealth"
    | "triangle"
    | "none";
  /** Ending arrow type */
  endArrowType?: "arrow" | "diamond" | "oval" | "stealth" | "triangle" | "none";
};

/**
 * Text underline properties
 * Maps to: pptxgenjs TextUnderlineProps
 */
export type TextUnderlineProps = {
  /** Underline color (hex without #) */
  color?: string;
  /** Underline style */
  style?:
    | "sng"
    | "dbl"
    | "heavy"
    | "dotted"
    | "dottedHeavy"
    | "dash"
    | "dashHeavy"
    | "dashLong"
    | "dashLongHeavy"
    | "dotDash"
    | "dotDashHeavy"
    | "dotDotDash"
    | "dotDotDashHeavy"
    | "wavy"
    | "wavyHeavy"
    | "wavyDbl"
    | "none";
};

/**
 * Text formatting options
 * Maps to: pptxgenjs TextPropsOptions
 */
export type TextFormatOptions = {
  /** Text alignment */
  align?: "left" | "center" | "right";
  /** Bold text */
  bold?: boolean;
  /** Italic text */
  italic?: boolean;
  /** Text color (hex without #) */
  color?: string;
  /** Font face name */
  fontFace?: string;
  /** Font size in points (1-256) */
  fontSize?: number;
  /** Character spacing in points */
  charSpacing?: number;
  /** Line spacing in points */
  lineSpacing?: number;
  /** Strike-through style */
  strike?: "sngStrike" | "dblStrike";
  /** Subscript */
  subscript?: boolean;
  /** Superscript */
  superscript?: boolean;
  /** Underline options */
  underline?: TextUnderlineProps | boolean;
  /** Vertical alignment */
  valign?: "top" | "middle" | "bottom";
  /** Text direction */
  vert?:
    | "horz"
    | "vert"
    | "vert270"
    | "eaVert"
    | "mongolianVert"
    | "wordArtVert";
  /** Text wrapping */
  wrap?: boolean;
  /** Rotation in degrees (0-360) */
  rotate?: number;
  /** Transparency percentage (0-100) */
  transparency?: number;
  /** Shadow properties */
  shadow?: ShadowProps;
  /** Text glow effect */
  glow?: {
    size: number;
    opacity: number;
    color?: string;
  };
  /** Text outline */
  outline?: {
    size: number;
    color: string;
  };
  /** Hyperlink */
  hyperlink?: HyperlinkProps;
  /** Highlight color (hex without #) */
  highlight?: string;
};

/**
 * Bullet options for text
 * Maps to: pptxgenjs bullet options
 */
export type BulletOptions = {
  /** Bullet type */
  type?: "bullet" | "number";
  /** Bullet character code (Unicode hex) */
  code?: string;
  /** Numbered list style */
  style?:
    | "arabicPeriod"
    | "arabicParenBoth"
    | "arabicParenR"
    | "alphaLcPeriod"
    | "alphaLcParenBoth"
    | "alphaLcParenR"
    | "alphaUcPeriod"
    | "alphaUcParenBoth"
    | "alphaUcParenR"
    | "romanLcPeriod"
    | "romanLcParenBoth"
    | "romanLcParenR"
    | "romanUcPeriod"
    | "romanUcParenBoth"
    | "romanUcParenR";
  /** Indent level (0-8) */
  indentLevel?: number;
  /** Start number for numbered lists */
  startAt?: number;
};

/**
 * Image sizing options
 * Maps to: pptxgenjs sizing options
 */
export type ImageSizingOptions = {
  /** Sizing algorithm type */
  type: "contain" | "cover" | "crop";
  /** Width for sizing area */
  w?: number;
  /** Height for sizing area */
  h?: number;
  /** X position for crop (crop only) */
  x?: number;
  /** Y position for crop (crop only) */
  y?: number;
};

/**
 * Image properties for addImage
 * Maps to: pptxgenjs ImageProps
 */
export type ImageProps = PositionProps & {
  /** Image data as base64 string (prefixed with data:image/...) */
  data?: string;
  /** Image path (URL or local path) */
  path?: string;
  /** Alt text for accessibility */
  altText?: string;
  /** Flip horizontally */
  flipH?: boolean;
  /** Flip vertically */
  flipV?: boolean;
  /** Rotation in degrees (0-359) */
  rotate?: number;
  /** Round image to circle */
  rounding?: boolean;
  /** Image sizing options */
  sizing?: ImageSizingOptions;
  /** Transparency (0-100) */
  transparency?: number;
  /** Hyperlink */
  hyperlink?: HyperlinkProps;
  /** Shadow */
  shadow?: ShadowProps;
};

/**
 * Chart types supported by pptxgenjs
 * @deprecated Use PptxChartName instead (defined below in runtime types section)
 */
export type PptxChartType =
  | "area"
  | "bar"
  | "bar3d"
  | "bubble"
  | "bubble3d"
  | "doughnut"
  | "line"
  | "pie"
  | "radar"
  | "scatter";

/**
 * Chart options for addChart
 * Maps to: pptxgenjs IChartOpts (subset)
 */
export type ChartOptions = PositionProps & {
  /** Chart title */
  title?: string;
  /** Show chart title */
  showTitle?: boolean;
  /** Title color (hex) */
  titleColor?: string;
  /** Title font face */
  titleFontFace?: string;
  /** Title font size */
  titleFontSize?: number;
  /** Chart colors array (hex values) */
  chartColors?: string[];
  /** Show legend */
  showLegend?: boolean;
  /** Legend position */
  legendPos?: "b" | "l" | "r" | "t" | "tr";
  /** Show data labels */
  showLabel?: boolean;
  /** Show value on data points */
  showValue?: boolean;
  /** Show percentage (pie/doughnut) */
  showPercent?: boolean;
  /** Bar direction */
  barDir?: "bar" | "col";
  /** Bar grouping */
  barGrouping?: "clustered" | "stacked" | "percentStacked";
  /** Doughnut hole size (1-100) */
  holeSize?: number;
  /** Line smoothing */
  lineSmooth?: boolean;
  /** Line size in points */
  lineSize?: number;
  /** Category axis hidden */
  catAxisHidden?: boolean;
  /** Value axis hidden */
  valAxisHidden?: boolean;
  /** Category axis title */
  catAxisTitle?: string;
  /** Value axis title */
  valAxisTitle?: string;
  /** Alt text */
  altText?: string;
};

/**
 * Table border options
 * Maps to: pptxgenjs IBorderOptions
 */
export type TableBorderOptions = {
  /** Border type */
  type?: "solid" | "dash" | "none";
  /** Border thickness in points */
  pt?: number;
  /** Border color (hex) */
  color?: string;
};

/**
 * Table options for addTable
 * Maps to: pptxgenjs ITableOptions (subset)
 */
export type TableOptions = PositionProps & {
  /** Text alignment */
  align?: "left" | "center" | "right";
  /** Bold text */
  bold?: boolean;
  /** Italic text */
  italic?: boolean;
  /** Text color (hex) */
  color?: string;
  /** Font face */
  fontFace?: string;
  /** Font size */
  fontSize?: number;
  /** Cell fill color (hex) */
  fill?: string;
  /** Cell border */
  border?: TableBorderOptions | TableBorderOptions[];
  /** Cell margin in points or [T, R, B, L] */
  margin?: number | [number, number, number, number];
  /** Vertical alignment */
  valign?: "top" | "middle" | "bottom";
  /** Column widths (uniform or per-column) */
  colW?: number | number[];
  /** Row heights (uniform or per-row) */
  rowH?: number | number[];
  /** Auto-page long tables */
  autoPage?: boolean;
  /** Repeat header on auto-page */
  autoPageRepeatHeader?: boolean;
  /** Number of header rows to repeat */
  autoPageHeaderRows?: number;
  /** New slide starting Y position */
  newSlideStartY?: number | `${number}%`;
};

/**
 * Shape properties
 * Maps to: pptxgenjs ShapeProps
 */
export type ShapeProps = PositionProps & {
  /** Shape name/type */
  shapeName?: string;
  /** Fill properties */
  fill?: ShapeFillProps;
  /** Line/border properties */
  line?: ShapeLineProps;
  /** Flip horizontally */
  flipH?: boolean;
  /** Flip vertically */
  flipV?: boolean;
  /** Rotation in degrees */
  rotate?: number;
  /** Shadow */
  shadow?: ShadowProps;
  /** Hyperlink */
  hyperlink?: HyperlinkProps;
  /** Rounding radius for rounded rectangles */
  rectRadius?: number;
};

/**
 * Slide number display options
 * Maps to: pptxgenjs SlideNumberProps
 */
export type SlideNumberProps = {
  /** Text color (hex) */
  color?: string;
  /** Font face */
  fontFace?: string;
  /** Font size (8-256) */
  fontSize?: number;
  /** X position */
  x?: PositionValue;
  /** Y position */
  y?: PositionValue;
};

// ============================================================================
// COMPLETED SLIDE TYPE (After slide generation)
// ============================================================================

/**
 * A fully generated slide ready for assembly
 */
export type CompleteSlide = {
  slideNumber: number;
  schema: SlideSchema;
  imageBuffer?: Buffer;
  imageMetadata?: {
    prompt: string;
    model?: string;
    generatedAt: Date;
  };
  generationTime: number;
};

// ============================================================================
// VALIDATION CONSTANTS
// ============================================================================

/** Minimum number of slides allowed */
export const MIN_SLIDES = 5;

/** Maximum number of slides allowed */
export const MAX_SLIDES = 50;

/** Valid theme names */
export const VALID_THEMES: ThemeOption[] = [
  "modern",
  "corporate",
  "creative",
  "minimal",
  "dark",
];

/** Valid audience options */
export const VALID_AUDIENCES: AudienceOption[] = [
  "business",
  "students",
  "technical",
  "general",
];

/** Valid tone options */
export const VALID_TONES: ToneOption[] = [
  "professional",
  "casual",
  "educational",
  "persuasive",
];

/** Valid aspect ratios */
export const VALID_ASPECT_RATIOS: AspectRatioOption[] = ["16:9", "4:3"];

/** Slide dimensions in inches by aspect ratio */
export const SLIDE_DIMENSIONS: Record<
  AspectRatioOption,
  { width: number; height: number }
> = {
  "16:9": { width: 10, height: 5.625 },
  "4:3": { width: 10, height: 7.5 },
};

/**
 * Check if a color string is valid hex format
 */
export function isValidHexColor(color: string): boolean {
  return /^[0-9A-Fa-f]{6}$/.test(color);
}

/**
 * Normalize hex color (remove # if present)
 */
export function normalizeHexColor(color: string): string {
  return color.replace(/^#/, "");
}

// ============================================================================
// PPTXGENJS SLIDE & PRESENTATION INTERFACES - RUNTIME TYPES
// These are the actual types used by SlideGenerator and slideRenderers.
// They define only the methods/properties we actually use, avoiding 'any'.
// For comprehensive documentation of all available options, see the types above.
// ============================================================================

/**
 * Text properties for addText method
 * Represents individual text items with formatting options
 */
export type PptxTextProps = {
  text: string;
  options?: {
    bullet?: boolean | { type?: string; code?: string };
    fontSize?: number;
    fontFace?: string;
    color?: string;
    bold?: boolean;
    italic?: boolean;
    indentLevel?: number;
    breakLine?: boolean;
    paraSpaceBefore?: number;
    paraSpaceAfter?: number;
  };
};

/**
 * Table row for addTable method
 */
export type PptxTableRow = Array<{
  text: string;
  options?: {
    bold?: boolean;
    fill?: { color: string };
    color?: string;
    fontSize?: number;
    fontFace?: string;
    align?: "left" | "center" | "right";
    valign?: "top" | "middle" | "bottom";
  };
}>;

/**
 * Chart type names supported by pptxgenjs
 */
export type PptxChartName =
  | "area"
  | "bar"
  | "bar3D"
  | "bubble"
  | "doughnut"
  | "line"
  | "pie"
  | "radar"
  | "scatter";

/**
 * Chart data structure for addChart method
 */
export type PptxChartData = {
  name: string;
  labels: string[];
  values: number[];
};

/**
 * Background options for a slide
 */
export type PptxBackgroundOptions = {
  color?: string;
  data?: string;
};

/**
 * Text options for addText method
 */
export type PptxTextOptions = {
  x?: number | string;
  y?: number | string;
  w?: number | string;
  h?: number | string;
  fontSize?: number;
  fontFace?: string;
  color?: string;
  bold?: boolean;
  italic?: boolean;
  align?: "left" | "center" | "right";
  valign?: "top" | "middle" | "bottom";
  rotate?: number;
  shadow?: ShadowProps;
  transparency?: number;
  charSpacing?: number;
  lineSpacing?: number;
  margin?: number;
  autoFit?: boolean;
};

/**
 * Image options for addImage method
 */
export type PptxImageOptions = {
  data?: string;
  path?: string;
  x?: number | string;
  y?: number | string;
  w?: number | string;
  h?: number | string;
  sizing?: {
    type: "contain" | "cover" | "crop";
    w?: number;
    h?: number;
    x?: number;
    y?: number;
  };
  altText?: string;
  rotate?: number;
  transparency?: number;
  hyperlink?: HyperlinkProps;
  shadow?: ShadowProps;
};

/**
 * Shape options for addShape method
 */
export type PptxShapeOptions = {
  x?: number | string;
  y?: number | string;
  w?: number | string;
  h?: number | string;
  fill?: { color: string; transparency?: number };
  line?: { color?: string; width?: number; dashType?: string };
  rectRadius?: number;
  rotate?: number;
  shadow?: ShadowProps;
};

/**
 * Chart options for addChart method
 */
export type PptxChartOptions = {
  x?: number | string;
  y?: number | string;
  w?: number | string;
  h?: number | string;
  chartColors?: string[];
  showLegend?: boolean;
  legendPos?: "b" | "l" | "r" | "t" | "tr";
  showTitle?: boolean;
  title?: string;
  titleColor?: string;
  titleFontFace?: string;
  titleFontSize?: number;
  showLabel?: boolean;
  showValue?: boolean;
  showPercent?: boolean;
  barGapWidthPct?: number;
  lineDataSymbol?:
    | "circle"
    | "dash"
    | "diamond"
    | "dot"
    | "none"
    | "square"
    | "triangle";
  lineDataSymbolSize?: number;
  lineSmooth?: boolean;
};

/**
 * Table options for addTable method
 */
export type PptxTableOptions = {
  x?: number | string;
  y?: number | string;
  w?: number | string;
  h?: number;
  colW?: number | number[];
  rowH?: number | number[];
  fontSize?: number;
  fontFace?: string;
  color?: string;
  fill?: { color: string };
  border?: TableBorderOptions | TableBorderOptions[];
  margin?: number | [number, number, number, number];
  align?: "left" | "center" | "right";
  valign?: "top" | "middle" | "bottom";
  autoPage?: boolean;
  autoPageRepeatHeader?: boolean;
};

/**
 * PptxGenJS Slide interface
 * Defines the methods we use from a pptxgenjs slide
 */
export type PptxSlide = {
  /** Slide background */
  background?: PptxBackgroundOptions;

  /** Add text to the slide */
  addText: (
    text: string | PptxTextProps[],
    options?: PptxTextOptions,
  ) => PptxSlide;

  /** Add an image to the slide */
  addImage: (options: PptxImageOptions) => PptxSlide;

  /** Add a shape to the slide */
  addShape: (shapeName: string, options?: PptxShapeOptions) => PptxSlide;

  /** Add a chart to the slide */
  addChart: (
    chartType: PptxChartName,
    data: PptxChartData[],
    options?: PptxChartOptions,
  ) => PptxSlide;

  /** Add a table to the slide */
  addTable: (rows: PptxTableRow[], options?: PptxTableOptions) => PptxSlide;

  /** Add speaker notes to the slide */
  addNotes: (notes: string) => PptxSlide;
};

/**
 * PptxGenJS Presentation interface
 * Defines the methods we use from a pptxgenjs presentation instance
 */
export type PptxPresentation = {
  /** Add a new slide to the presentation */
  addSlide: () => PptxSlide;

  /** Define a custom layout */
  defineLayout: (layout: {
    name: string;
    width: number;
    height: number;
  }) => void;

  /** Current layout name */
  layout: string;

  /** Write presentation to file */
  writeFile: (options: { fileName: string }) => Promise<string>;

  /** Write presentation to buffer/stream */
  write: (options: { outputType: string }) => Promise<unknown>;
};
