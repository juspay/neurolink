/**
 * PPT Generation - Type Re-exports
 *
 * All PPT types are now centralized in types/pptTypes.ts
 * This file re-exports for backwards compatibility within the presentation module.
 */

export {
  // External API types
  type PPTOutputOptions,
  type PPTGenerationResult,
  type ThemeOption,
  type AudienceOption,
  type ToneOption,
  type OutputFormatOption,
  type AspectRatioOption,

  // Error types
  PPTError,
  PPT_ERROR_CODES,

  // Slide types & layouts
  type SlideType,
  type SlideLayout,

  // Content plan types
  type BulletPoint,
  type SlideContent,
  type SlideSchema,
  type ContentPlan,

  // Data types for slides
  type TableCell,
  type TableRow,
  type ChartDataPoint,
  type ChartSeries,
  type Statistic,
  type TimelineItem,
  type ProcessStep,
  type TeamMember,
  type FeatureItem,
  type ComparisonColumn,

  // Theme types
  type ThemeColors,
  type ThemeFonts,
  type PresentationTheme,

  // Context types
  type PPTGenerationContext,
  extractPPTContext,

  // Completed slide type
  type CompleteSlide,

  // pptxgenjs-compatible types
  type PositionValue,
  type PositionProps,
  type ShadowProps,
  type HyperlinkProps,
  type ShapeFillProps,
  type ShapeLineProps,
  type TextUnderlineProps,
  type TextFormatOptions,
  type BulletOptions,
  type ImageSizingOptions,
  type ImageProps,
  type PptxChartType,
  type ChartOptions,
  type TableBorderOptions,
  type TableOptions,
  type ShapeProps,
  type SlideNumberProps,

  // Validation constants and helpers
  MIN_SLIDES,
  MAX_SLIDES,
  VALID_THEMES,
  VALID_AUDIENCES,
  VALID_TONES,
  VALID_ASPECT_RATIOS,
  SLIDE_DIMENSIONS,
  isValidHexColor,
  normalizeHexColor,
} from "../../types/pptTypes.js";
