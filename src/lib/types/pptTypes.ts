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

import { ErrorCategory, ErrorSeverity } from "../constants/enums.js";
import type { NeuroLink } from "../neurolink.js";
import { NeuroLinkError } from "../utils/errorHandling.js";
import type { ImageWithAltText } from "./content.js";
import type { AIProvider } from "./providers.js";

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
 *   generateAIImages: true
 * };
 * ```
 */
export type PPTOutputOptions = {
  /** Number of slides to generate (required, range: 5-50) */
  pages: number;
  /** Output format - only PPTX supported currently (default: "pptx") */
  format?: OutputFormatOption;
  /** Presentation theme/style (default: "AI will decide" - AI chooses based on topic) */
  theme?: ThemeOption;
  /** Target audience for content customization (default: "AI will decide" - AI chooses based on topic) */
  audience?: AudienceOption;
  /** Presentation tone/style (default: "AI will decide" - AI chooses based on topic) */
  tone?: ToneOption;
  /** Whether to generate AI images for slides (user-provided images via input.images are always used) */
  generateAIImages?: boolean;
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
  /** Provider used for PPT generation */
  provider: string;
  /** Model used for PPT generation */
  model: string;
  /** Presentation metadata */
  metadata?: {
    /** Theme/style used (may be AI-selected if "AI will decide" was used) */
    theme?: string;
    /** Target audience (may be AI-selected if "AI will decide" was used) */
    audience?: string;
    /** Presentation tone (may be AI-selected if "AI will decide" was used) */
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
 * Slide types (35 total)
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
  | "blank" // Empty slide for custom content

  // Composite/Dashboard (4) - Multiple content types on one slide
  | "dashboard" // Flexible grid with multiple zones
  | "mixed-content" // Left bullets + right chart/stats
  | "stats-grid" // Multiple stat boxes in grid
  | "icon-grid"; // Multiple icon boxes in grid

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
 * Bullet style options for formatting
 * - "disc": Standard bullet point (•)
 * - "number": Numbered list (1. 2. 3.)
 * - "checkmark": Checkmark symbol (✓)
 * - "arrow": Arrow symbol (→)
 * - "dash": Dash symbol (–)
 * - "none": No bullet marker
 */
export type BulletStyle =
  | "disc"
  | "number"
  | "checkmark"
  | "arrow"
  | "dash"
  | "none";

/**
 * Bullet point with optional sub-bullets and styling
 * Maps to: addText with bullet: true option
 *
 * HYBRID APPROACH: AI can optionally specify formatting, otherwise hardcoded defaults apply.
 * Priority: bullet-level > slide-level > type-defaults > theme-defaults
 */
export type BulletPoint = {
  text: string;
  subBullets?: string[];
  /** Icon code for custom bullet (Unicode). Ex: "2713" for checkmark */
  icon?: string;
  /** Highlight/emphasis for this bullet */
  emphasis?: boolean;

  // === Optional AI-specified formatting (hybrid approach) ===
  /** Font size override (default calculated based on bullet count) */
  fontSize?: number;
  /** Bullet style override (default based on slide type) */
  bulletStyle?: BulletStyle;
  /** Text color override (hex, e.g., "#FF0000") */
  color?: string;
  /** Bold text override */
  bold?: boolean;
};

/**
 * Slide-level formatting config (can be specified by AI or use defaults)
 * Applied to all bullets in the slide unless overridden at bullet level
 */
export type SlideFormattingConfig = {
  /** Base font size for bullets (default calculated based on bullet count) */
  baseFontSize?: number;
  /** Default bullet style for this slide */
  bulletStyle?: BulletStyle;
  /** Line spacing multiplier (default 1.2) */
  lineSpacing?: number;
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

  // ---- Layout/Sizing Options (AI can customize) ----
  /** Custom layout overrides - AI can specify positions/sizes */
  layoutOptions?: {
    /** Title positioning */
    title?: {
      x?: number; // inches from left
      y?: number; // inches from top
      w?: number; // width in inches
      h?: number; // height in inches
      fontSize?: number; // font size in points
      align?: "left" | "center" | "right";
      color?: string; // hex color override
    };
    /** Subtitle/description positioning */
    subtitle?: {
      x?: number;
      y?: number;
      w?: number;
      h?: number;
      fontSize?: number;
      align?: "left" | "center" | "right";
      color?: string;
    };
    /** Content area positioning (for bullets, body text) */
    content?: {
      x?: number;
      y?: number;
      w?: number;
      h?: number;
      fontSize?: number;
    };
    /** Background style */
    background?: {
      color?: string; // hex color
      useThemePrimary?: boolean; // use theme.colors.primary
      useThemeSecondary?: boolean; // use theme.colors.secondary
    };
    /** Section number styling (for section-header) */
    sectionNumber?: {
      x?: number;
      y?: number;
      fontSize?: number;
      style?: "large" | "small" | "watermark"; // watermark = 200pt, 70% transparent
      color?: string;
    };
    /** Quote styling */
    quote?: {
      x?: number;
      y?: number;
      w?: number;
      fontSize?: number;
      align?: "left" | "center" | "right";
    };
    /** Statistics layout */
    statistics?: {
      columns?: number; // 2, 3, or 4 columns
      startY?: number;
      valueSize?: number; // font size for values
      labelSize?: number; // font size for labels
    };
    /** Chart positioning */
    chart?: {
      x?: number;
      y?: number;
      w?: number;
      h?: number;
      showLegend?: boolean;
      showLabels?: boolean;
    };
    /** Table styling */
    table?: {
      x?: number;
      y?: number;
      w?: number;
      headerBgColor?: string;
      altRowColor?: string;
    };
    /** Column layouts (two-column, three-column) */
    columns?: {
      gap?: number; // gap between columns in inches
      leftWidth?: number; // percentage (0.4 = 40%)
      rightWidth?: number;
    };
    /** Image positioning */
    image?: {
      x?: number;
      y?: number;
      w?: number;
      h?: number;
      position?: "left" | "right" | "center" | "full";
    };
    /** Timeline/Process flow */
    timeline?: {
      orientation?: "horizontal" | "vertical";
      connectorColor?: string;
      nodeSize?: number;
    };
  };

  // ---- Dashboard/Composite Content ----
  /** Dashboard configuration for composite slides with multiple content zones */
  dashboard?: {
    /** Layout preset: left-right, top-bottom, three-cols, quadrants, five-boxes, six-boxes, main-sidebar, top-three */
    layout:
      | "left-right"
      | "top-bottom"
      | "three-cols"
      | "quadrants"
      | "five-boxes"
      | "six-boxes"
      | "main-sidebar"
      | "top-three";
    /** Content zones - each zone can have different content type */
    zones: Array<{
      /** Type of content in this zone */
      type: "bullets" | "chart" | "stats" | "icon-box" | "text-box";
      /** Optional zone title */
      title?: string;
      /** Zone data - varies by type */
      data?: unknown;
      /** Highlight this zone with primary color */
      isPrimary?: boolean;
    }>;
  };
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
  /** Number of slides requested (required) */
  pages: number;
  /** Selected theme name ("AI will decide" means AI chooses) */
  theme: string;
  /** Target audience ("AI will decide" means AI chooses) */
  audience: string;
  /** Presentation tone ("AI will decide" means AI chooses) */
  tone: string;
  /** Whether to generate AI images (user-provided images via input.images are always used) */
  generateAIImages: boolean;
  /** Aspect ratio */
  aspectRatio: AspectRatioOption;
  /** Custom output path */
  outputPath?: string;
  /** Logo data or path if provided */
  logo?: Buffer | string;
  /** User-provided images for slides (from input.images) */
  images?: (Buffer | string)[];
  /** Provider name (for logging) */
  provider?: string;
  /** Model name (for logging) */
  model?: string;
};

// ============================================================================
// PPTXGENJS COMPATIBLE TYPES - USED BY RUNTIME TYPES
// ============================================================================

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

/** Slide dimensions in inches by aspect ratio */
export const SLIDE_DIMENSIONS: Record<
  AspectRatioOption,
  { width: number; height: number }
> = {
  "16:9": { width: 10, height: 5.625 },
  "4:3": { width: 10, height: 7.5 },
};

/**
 * Validate a hex color string (6 hex characters, no # prefix).
 */
export function isValidHexColor(color: string): boolean {
  return /^[0-9A-Fa-f]{6}$/.test(color);
}

/**
 * Normalize a hex color by stripping leading # if present.
 */
export function normalizeHexColor(color: string): string {
  return color.startsWith("#") ? color.slice(1) : color;
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
    bullet?:
      | boolean
      | {
          type?: "bullet" | "number";
          characterCode?: string;
          indent?: number;
          numberType?:
            | "alphaLcParenBoth"
            | "alphaLcParenR"
            | "alphaLcPeriod"
            | "alphaUcParenBoth"
            | "alphaUcParenR"
            | "alphaUcPeriod"
            | "arabicParenBoth"
            | "arabicParenR"
            | "arabicPeriod"
            | "romanLcParenBoth"
            | "romanLcParenR"
            | "romanLcPeriod"
            | "romanUcParenBoth"
            | "romanUcParenR"
            | "romanUcPeriod";
          numberStartAt?: number;
          color?: string;
          rtlMode?: boolean;
          style?: string;
        };
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
 * Rich text run for pptxgenjs
 * Represents a single formatted text segment within a text block
 */
export type PptxTextRun = {
  text: string;
  options?: {
    bold?: boolean;
    italic?: boolean;
    fontSize?: number;
    fontFace?: string;
    color?: string;
  };
};

/**
 * Text props that supports both plain string and rich text runs
 * pptxgenjs accepts both formats for the text property
 */
export type PptxRichTextProps = {
  text: string | PptxTextRun[];
  options?: PptxTextProps["options"];
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
  /** Text fit options: 'none' = Do not Autofit, 'shrink' = Shrink text to fit, 'resize' = Resize shape to fit text */
  fit?: "none" | "shrink" | "resize";
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
  /** Add text to the slide - supports plain text, text props array, or rich text props array */
  addText: (
    text: string | PptxTextProps[] | PptxRichTextProps[],
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
  /** Presentation title metadata */
  title?: string;
  /** Presentation subject metadata */
  subject?: string;
  /** Presentation author metadata */
  author?: string;
  /** Presentation company metadata */
  company?: string;
  /** Write presentation to file */
  writeFile: (options: { fileName: string }) => Promise<string>;
  /** Write presentation to buffer/stream */
  write: (options: { outputType: string }) => Promise<unknown>;
};

/**
 * Prompt tier levels
 */
export type PromptTier = "basic" | "advanced";

/**
 * Model info for prompt tier detection.
 * Both name and provider are required.
 */
export type PPTModelInfo = {
  name: string;
  provider: string;
};

/** Options for buildContentPlanningPrompt */
export type BuildContentPlanningPromptOptions = {
  topic: string;
  pages: number;
  audience: string;
  tone: string;
  theme: string;
  generateAIImages: boolean;
  modelInfo: PPTModelInfo;
};

/**
 * Result from getEffectivePPTProvider
 */
export type EffectivePPTProviderResult = {
  /** The provider to use for PPT generation */
  provider: unknown;
  /** Provider name */
  providerName: string;
  /** Model name */
  modelName: string;
  /** Whether auto-selection was performed */
  wasAutoSelected: boolean;
};

/**
 * Result of image buffer validation
 */
export type ImageValidationResult = {
  isValid: boolean;
  mimeType: string;
  format: string;
  error?: string;
};

/**
 * Text segment with optional formatting
 */
export type TextSegment = {
  text: string;
  bold?: boolean;
  italic?: boolean;
};

/**
 * Background style options
 */
export type BackgroundStyle =
  | "gradient-blue" // Blue to purple gradient
  | "gradient-corporate" // Dark blue to teal gradient
  | "gradient-warm" // Orange to pink gradient
  | "gradient-dark" // Dark with accent glow
  | "gradient-subtle" // Very subtle gradient
  | "geometric" // Geometric shapes pattern
  | "corner-accent" // Large corner accent shapes
  | "wave" // Curved wave pattern
  | "split" // Split diagonal background
  | "solid"; // Simple solid color

/** Theme colors extracted for background rendering */
export type BackgroundColors = {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
};

/** Options for renderContentSlide */
export type RenderContentSlideOptions = {
  slide: PptxSlide;
  title: string;
  content: SlideContent;
  layout: SlideLayout;
  theme: PresentationTheme;
  imageBuffer?: Buffer;
  slideType?: SlideType;
};

/**
 * Column data structure for generic column rendering
 */
export type ColumnData = {
  title?: string;
  bullets?: BulletPoint[];
  image?: string;
};

/**
 * Grid position for zones
 */
export type GridPosition = {
  x: number;
  y: number;
  w: number;
  h: number;
};

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
  /** Whether to generate AI images (user-provided images are always used) */
  generateAIImages: boolean;
  /** Aspect ratio for slides */
  aspectRatio: AspectRatioOption;
  /** Provider for image generation */
  provider?: string;
  /** Model for image generation */
  imageModel?: string;
  /** Logo configuration */
  logo?: Buffer | string | LogoConfig;
  /** User-provided images for slides (takes priority over AI generation) */
  userImages?: (Buffer | string)[];
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

/**
 * Options for presentation generation
 */
export type PresentationGenerationOptions = {
  /** PPT generation context (validated) */
  context: PPTGenerationContext;
  /** AI provider for content planning */
  provider: AIProvider;
  /** Provider name (for result reporting) */
  providerName: string;
  /** Model name (for result reporting) */
  modelName: string;
  /** NeuroLink instance for image generation */
  neurolink?: NeuroLink;
  /** Provider name for image generation */
  imageProvider?: string;
  /** Model for image generation */
  imageModel?: string;
};

/**
 * Internal orchestration state
 */
export type OrchestrationState = {
  startTime: number;
  contentPlan: ContentPlan | null;
  slides: CompleteSlide[] | null;
  outputPath: string | null;
};
