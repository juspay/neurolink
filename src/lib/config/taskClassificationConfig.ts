/**
 * Task Classification Configuration
 * Contains patterns, keywords, and scoring weights for task classification
 */

/**
 * Regular expression patterns that indicate fast response tasks
 */
export const FAST_PATTERNS = [
  // Greetings and social
  /^(hi|hello|hey|good morning|good afternoon|good evening)/i,
  /^(thanks?|thank you|thx)/i,
  /^(yes|no|ok|okay|sure|fine)/i,

  // Simple questions
  /^what is\s+\w+\??$/i,
  /^how are you/i,
  /^tell me about\s+\w+$/i,

  // Simple requests
  /^(list|show|display)\s+/i,
  /^give me\s+/i,
  /^can you\s+(help|assist)/i,

  // Simple definitions
  /^define\s+/i,
  /^meaning of\s+/i,
  /^what does\s+\w+\s+mean/i,

  // Quick facts
  /^when (is|was|did)/i,
  /^where (is|was)/i,
  /^who (is|was)/i,

  // Simple translations
  /^translate\s+["'].*["']\s+to\s+\w+/i,
  /^how do you say\s+/i,
];

/**
 * Regular expression patterns that indicate reasoning tasks
 */
export const REASONING_PATTERNS = [
  // Analysis and comparison
  /\b(analyz|compar|evaluat|assess|examin)\w*/i,
  /\b(pros and cons|advantages and disadvantages)/i,
  /\b(better|worse|best|worst)\b.*\b(than|versus|vs)\b/i,

  // Problem solving
  /\b(solve|solution|problem|issue|challenge)\b/i,
  /\b(how to|step by step|strategy|approach)\b/i,
  /\b(optimize|improve|enhance|maximize|minimize)\b/i,

  // Planning and design
  /\b(plan|design|architect|structure|framework)\b/i,
  /\b(implement|develop|build|create|construct)\b/i,
  /\b(roadmap|timeline|schedule|phases)\b/i,

  // Complex questions
  /\b(why|explain|reason|cause|effect|impact)\b/i,
  /\b(implications|consequences|considerations)\b/i,
  /\b(should I|would you recommend|what if)\b/i,

  // Research and investigation
  /\b(research|investigate|explore|discover)\b/i,
  /\b(evidence|proof|validate|verify)\b/i,
  /\b(trends|patterns|insights|conclusions)\b/i,

  // Business and strategy
  /\b(business|strategy|market|competitive|financial)\b/i,
  /\b(ROI|revenue|profit|investment|budget)\b/i,
  /\b(stakeholder|customer|user experience|UX)\b/i,

  // Technical complexity
  /\b(algorithm|architecture|system|infrastructure)\b/i,
  /\b(performance|scalability|security|reliability)\b/i,
  /\b(integration|API|database|server)\b/i,
];

/**
 * Keywords that indicate fast tasks regardless of context
 */
export const FAST_KEYWORDS = [
  "quick",
  "simple",
  "brief",
  "short",
  "summary",
  "overview",
  "definition",
  "meaning",
  "list",
  "show",
  "display",
  "name",
  "tell",
  "what",
  "when",
  "where",
  "who",
  "how many",
  "count",
];

/**
 * Keywords that indicate reasoning tasks regardless of context
 */
export const REASONING_KEYWORDS = [
  "complex",
  "detailed",
  "comprehensive",
  "thorough",
  "in-depth",
  "analyze",
  "compare",
  "evaluate",
  "assess",
  "research",
  "investigate",
  "strategy",
  "plan",
  "design",
  "solve",
  "optimize",
  "recommend",
  "explain",
  "why",
  "justify",
  "pros",
  "cons",
  "trade-offs",
];

/**
 * Scoring weights for different classification factors
 */
export const SCORING_WEIGHTS = {
  SHORT_PROMPT_BONUS: 2,
  LONG_PROMPT_BONUS: 1,
  PATTERN_MATCH_SCORE: 3,
  KEYWORD_MATCH_SCORE: 1,
  MULTIPLE_QUESTIONS_BONUS: 1,
  MULTI_SENTENCE_BONUS: 1,
  TECHNICAL_DOMAIN_BONUS: 1,
  SIMPLE_DEFINITION_BONUS: 2,
} as const;

/**
 * Classification thresholds and constraints
 */
export const CLASSIFICATION_THRESHOLDS = {
  SHORT_PROMPT_LENGTH: 50,
  LONG_PROMPT_LENGTH: 200,
  SIMPLE_DEFINITION_LENGTH: 100,
  MIN_CONFIDENCE: 0.6,
  MAX_CONFIDENCE: 0.95,
  DEFAULT_CONFIDENCE: 0.5,
} as const;

/**
 * Domain-specific patterns for enhanced classification
 */
export const DOMAIN_PATTERNS = {
  TECHNICAL: /\b(code|programming|development|software)\b/i,
  SIMPLE_DEFINITION: /\b(definition|meaning|what is)\b/i,
} as const;
