/**
 * PPT Generation Module
 *
 * Exports all presentation generation components.
 *
 * Architecture:
 * - types.ts: Internal types (SlideSchema, ContentPlan, etc.)
 * - constants.ts: Themes, prompts, validation constants
 * - contentPlanner.ts: AI-powered content planning
 * - slideGenerator.ts: Individual slide generation (Step 3)
 * - orchestrator.ts: Main orchestration logic (Step 4)
 */

// Types
export type {
  SlideType,
  SlideLayout,
  BulletPoint,
  SlideContent,
  SlideSchema,
  ContentPlan,
  // Data types for slides
  TableCell,
  TableRow,
  ChartDataPoint,
  ChartSeries,
  Statistic,
  TimelineItem,
  ProcessStep,
  TeamMember,
  FeatureItem,
  ComparisonColumn,
  // Theme types
  ThemeColors,
  ThemeFonts,
  PresentationTheme,
  PPTGenerationContext,
  CompleteSlide,
  // pptxgenjs-compatible types
  PositionValue,
  PositionProps,
  ShadowProps,
  HyperlinkProps,
  ShapeFillProps,
  ShapeLineProps,
  TextUnderlineProps,
  TextFormatOptions,
  BulletOptions,
  ImageSizingOptions,
  ImageProps,
  PptxChartType,
  ChartOptions,
  TableBorderOptions,
  TableOptions,
  ShapeProps,
  SlideNumberProps,
} from "./types.js";

export {
  PPTError,
  PPT_ERROR_CODES,
  extractPPTContext,
  // Validation helpers from pptTypes
  MIN_SLIDES,
  MAX_SLIDES,
  SLIDE_DIMENSIONS,
  isValidHexColor,
  normalizeHexColor,
} from "./types.js";

// Constants
export {
  THEMES,
  getTheme,
  SLIDE_TYPE_TO_LAYOUT,
  SLIDE_TYPE_CATEGORIES,
  getLayoutForType,
  // Diagram vs Image slide type helpers
  DIAGRAM_SLIDE_TYPES,
  IMAGE_SLIDE_TYPES,
  isDiagramSlideType,
  isImageSlideType,
  AUDIENCE_GUIDELINES,
  TONE_GUIDELINES,
  CONTENT_PLANNING_SYSTEM_PROMPT,
  buildContentPlanningPrompt,
  enhanceImagePrompt,
  // Validation constants
  MIN_PAGES,
  MAX_PAGES,
  MIN_TOPIC_LENGTH,
  MAX_TOPIC_LENGTH,
  VALID_THEMES,
  VALID_AUDIENCES,
  VALID_TONES,
  VALID_ASPECT_RATIOS,
  // Timeouts
  CONTENT_PLANNING_TIMEOUT_MS,
  IMAGE_GENERATION_TIMEOUT_MS,
  MAX_CONCURRENT_IMAGE_GENERATIONS,
  PPT_GENERATION_TIMEOUT_MS,
} from "./constants.js";

// Content Planner
export {
  generateContentPlan,
  ensureTitleSlide,
  ensureThankYouSlide,
  postProcessPlan,
} from "./contentPlanner.js";

// Slide Generator
export {
  SlideGenerator,
  createSlideGenerator,
  generateSlidesFromPlan,
  PptxGenJS,
  type SlideGeneratorConfig,
  type SlideGenerationBatchResult,
  type LogoConfig,
  type LogoPosition,
} from "./slideGenerator.js";
