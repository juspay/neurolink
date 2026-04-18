export { PPTError, PPT_ERROR_CODES } from "./pptError.js";
export {
  // Validation helpers from pptTypes
  SLIDE_DIMENSIONS,
} from "../../types/index.js";

export { extractPPTContext } from "./utils.js";

// Slide Renderers
export {
  renderColumnSlide,
  renderTwoColumnSlide,
  renderThreeColumnSlide,
  renderComparisonSlide,
  renderContentSlide,
  renderTitleSlide,
  addTitle,
  addBullets,
  addIndividualBullets,
  addImage,
  addEnhancedBackground,
  addColoredBackground,
  LAYOUT_POSITIONS,
  // Composite/Dashboard slide renderers
  renderDashboardSlide,
  renderMixedContentSlide,
  renderStatsGridSlide,
  renderIconGridSlide,
  COMPOSITE_LAYOUTS,
} from "./slideRenderers.js";

// Re-export types from the types module (not from implementation files)

// Slide Type Inference
export {
  inferFromTitle,
  inferBulletStyleFromContent,
  getBulletStyleForSlideType,
  normalizeSlideWithInference,
  applyBulletStyleToContent,
  SLIDE_TYPE_GUIDANCE,
  getSlideTypeGuidanceForAI,
} from "./slideTypeInference.js";

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
  loadPptxGenJS,
} from "./slideGenerator.js";
// Presentation Orchestrator (Stage 4)
export { generatePresentation } from "./presentationOrchestrator.js";

// Validation (re-export from parameterValidation for convenience)
export {
  validatePPTGenerationInput,
  validatePPTOutputOptions,
  validatePPTProvider,
} from "../../utils/parameterValidation.js";

// Re-export EnhancedValidationResult for PPT validation results

// PPT Provider Utilities and Helper Functions
export {
  PPT_VALID_PROVIDERS,
  getEffectivePPTProvider,
  generateOutputPath,
  ensureOutputDirectory,
  normalizeLogoConfig,
  getLayoutName,
  getFailureStage,
  toError,
  isObject,
  isLogoConfig,
  validateImageBuffer,
} from "./utils.js";

// Re-export EffectivePPTProviderResult type from types
