/**
 * PPT Generation - Type Re-exports
 *
 * All PPT types are now centralized in types/pptTypes.ts
 * This file re-exports for backwards compatibility within the presentation module.
 *
 * Only types that are actually used within src/lib/features/ppt/ are exported here.
 */

export {
  // External API types
  type PPTOutputOptions,
  type PPTGenerationResult,
  type AspectRatioOption,

  // Error types
  PPTError,
  PPT_ERROR_CODES,

  // Slide types & layouts
  type SlideType,
  type SlideLayout,

  // Content plan types
  type BulletPoint,
  type BulletStyle,
  type SlideFormattingConfig,
  type SlideContent,
  type SlideSchema,
  type ContentPlan,

  // Data types for slides (used in slideRenderers.ts)
  type TableRow,
  type ChartSeries,
  type Statistic,
  type TimelineItem,
  type ProcessStep,
  type FeatureItem,
  type ComparisonColumn,

  // Theme types
  type PresentationTheme,

  // Context types
  type PPTGenerationContext,

  // Completed slide type
  type CompleteSlide,

  // Validation constants
  SLIDE_DIMENSIONS,

  // PptxGenJS slide and presentation interfaces (used in slideRenderers/slideGenerator)
  type PptxSlide,
  type PptxPresentation,
  type PptxRichTextProps,
  type PptxTableRow,
  type PptxChartName,

  // Slide renderer types
  type BackgroundStyle,
  type RenderContentSlideOptions,
  type ColumnData,
  type GridPosition,
  type BackgroundColors,

  // Generator config types
  type LogoConfig,
  type SlideGeneratorConfig,
  type SlideGenerationBatchResult,

  // Orchestrator types
  type PresentationGenerationOptions,
  type OrchestrationState,

  // Provider utilities
  type EffectivePPTProviderResult,

  // Prompt tier types
  type PromptTier,
  type PPTModelInfo,
  type BuildContentPlanningPromptOptions,

  // Helper types (used in utils.ts)
  type ImageValidationResult,
  type TextSegment,
} from "../../types/pptTypes.js";
