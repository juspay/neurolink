/**
 * HIERARCHICAL PROMPT SYSTEM - USAGE EXAMPLES
 * ============================================
 *
 * Demonstrates the 3-level prompt resolution with fallback mechanism
 */

// ============================================================================
// EXAMPLE 1: Simple - Use workflow-level defaults for all models
// ============================================================================

const simpleWorkflow = {
  id: "simple-ensemble",
  name: "Simple Ensemble with Workflow Defaults",
  type: "ensemble",

  // Workflow-level defaults (used by all models/judges)
  defaultSystemPrompt:
    "You are a helpful assistant specialized in technical documentation.",
  defaultJudgePrompt: "Evaluate responses for technical accuracy and clarity.",

  models: [
    { provider: "openai", model: "gpt-4o" }, // Uses workflow default
    { provider: "anthropic", model: "claude-3-5-sonnet-20241022" }, // Uses workflow default
    { provider: "google", model: "gemini-2.0-flash" }, // Uses workflow default
  ],

  judge: {
    provider: "openai",
    model: "gpt-4o",
    criteria: ["accuracy", "clarity", "completeness"],
    outputFormat: "detailed",
    includeReasoning: true,
    scoreScale: { min: 0, max: 100 },
    // Uses workflow defaultJudgePrompt
  },
};

// ============================================================================
// EXAMPLE 2: Mixed - Some models override workflow defaults
// ============================================================================

const mixedWorkflow = {
  id: "mixed-ensemble",
  name: "Mixed Ensemble with Overrides",
  type: "ensemble",

  // Workflow-level defaults
  defaultSystemPrompt: "You are a helpful assistant.",
  defaultJudgePrompt: "Evaluate responses objectively.",

  models: [
    // Model 1: Uses workflow default
    {
      provider: "openai",
      model: "gpt-4o",
    },

    // Model 2: Overrides with model-specific prompt
    {
      provider: "anthropic",
      model: "claude-3-5-sonnet-20241022",
      systemPrompt:
        "You are Claude, an AI assistant by Anthropic. Be thoughtful and nuanced.",
    },

    // Model 3: Uses workflow default
    {
      provider: "google",
      model: "gemini-2.0-flash",
    },
  ],

  judge: {
    provider: "openai",
    model: "gpt-4o",
    criteria: ["helpfulness", "harmlessness", "honesty"],
    outputFormat: "detailed",
    includeReasoning: true,
    scoreScale: { min: 0, max: 100 },
    // Uses workflow defaultJudgePrompt
  },
};

// ============================================================================
// EXAMPLE 3: Advanced - Full customization per model and judge
// ============================================================================

const advancedWorkflow = {
  id: "advanced-ensemble",
  name: "Advanced Ensemble with Full Customization",
  type: "ensemble",

  // Workflow-level defaults (fallbacks)
  defaultSystemPrompt: "You are a helpful assistant.",
  defaultJudgePrompt: "Evaluate responses based on quality.",

  models: [
    // GPT-4: Optimized prompt for OpenAI
    {
      provider: "openai",
      model: "gpt-4o",
      systemPrompt: `You are GPT-4, a large language model by OpenAI.
- Provide clear, structured responses
- Use markdown formatting when helpful
- Be concise yet comprehensive`,
    },

    // Claude: Optimized prompt for Anthropic
    {
      provider: "anthropic",
      model: "claude-3-5-sonnet-20241022",
      systemPrompt: `You are Claude, created by Anthropic.
- Think step-by-step through complex problems
- Acknowledge uncertainty when appropriate
- Provide balanced, thoughtful responses`,
    },

    // Gemini: Optimized prompt for Google
    {
      provider: "google",
      model: "gemini-2.0-flash",
      systemPrompt: `You are Gemini, Google's advanced AI model.
- Leverage multimodal understanding
- Provide factual, grounded responses
- Use clear explanations with examples`,
    },
  ],

  judge: {
    provider: "openai",
    model: "gpt-4o",
    criteria: [
      "Factual accuracy",
      "Reasoning quality",
      "Clarity of explanation",
      "Practical usefulness",
    ],
    outputFormat: "detailed",

    // Custom judge evaluation prompt
    customPrompt: `You are an expert AI evaluator specializing in technical content.

Your task: Compare multiple AI responses and score them on a 0-100 scale.

Evaluation Framework:
- Factual Accuracy (30%): Correctness of information
- Reasoning Quality (30%): Logic and depth of analysis
- Clarity (20%): Easy to understand and well-structured
- Practical Usefulness (20%): Actionable and helpful

For each response:
1. Assign a score 0-100
2. Provide brief reasoning (max 200 chars)
3. Rank responses from best to worst
4. Identify the single best response

Output JSON format:
{
  "scores": { "response-0": 85, "response-1": 92 },
  "ranking": ["response-1", "response-0"],
  "bestResponse": "response-1",
  "reasoning": "Response 1 excels in depth and practical examples",
  "confidenceInJudgment": 0.9
}`,

    // System instructions for judge personality
    systemPrompt:
      "You are an impartial, expert evaluator. Be objective and thorough.",

    includeReasoning: true,
    scoreScale: { min: 0, max: 100 },
  },
};

// ============================================================================
// EXAMPLE 4: Multi-judge with different evaluation prompts
// ============================================================================

const multiJudgeWorkflow = {
  id: "multi-judge-ensemble",
  name: "Multi-Judge Ensemble",
  type: "ensemble",

  defaultSystemPrompt: "You are a helpful assistant.",
  defaultJudgePrompt: "Evaluate responses for quality and accuracy.",

  models: [
    { provider: "openai", model: "gpt-4o" },
    { provider: "anthropic", model: "claude-3-5-sonnet-20241022" },
    { provider: "google", model: "gemini-2.0-flash" },
  ],

  judges: [
    // Judge 1: Technical accuracy focus
    {
      provider: "openai",
      model: "gpt-4o",
      criteria: ["technical_accuracy", "completeness"],
      outputFormat: "detailed",
      customPrompt:
        "Evaluate responses focusing on technical accuracy and completeness. Score 0-100.",
      systemPrompt:
        "You are a technical expert. Be rigorous in your evaluation.",
      includeReasoning: true,
      scoreScale: { min: 0, max: 100 },
    },

    // Judge 2: User experience focus
    {
      provider: "anthropic",
      model: "claude-3-5-sonnet-20241022",
      criteria: ["clarity", "helpfulness", "user_friendliness"],
      outputFormat: "detailed",
      customPrompt:
        "Evaluate responses focusing on clarity, helpfulness, and user-friendliness. Score 0-100.",
      systemPrompt: "You are a UX expert. Focus on user experience quality.",
      includeReasoning: true,
      scoreScale: { min: 0, max: 100 },
    },

    // Judge 3: Overall quality (uses workflow default)
    {
      provider: "google",
      model: "gemini-2.0-flash",
      criteria: ["overall_quality"],
      outputFormat: "detailed",
      // Uses workflow defaultJudgePrompt
      includeReasoning: true,
      scoreScale: { min: 0, max: 100 },
    },
  ],
};

// ============================================================================
// PROMPT RESOLUTION LOGIC
// ============================================================================

/*
 * For Models (ensemble execution):
 * --------------------------------
 * 1. Direct parameter in executeEnsemble({ systemPrompt: "..." })  [Highest priority]
 * 2. ModelConfig.systemPrompt
 * 3. WorkflowConfig.defaultSystemPrompt
 * 4. undefined (provider uses its default)
 *
 * For Judges (scoring):
 * ---------------------
 * 1. JudgeConfig.customPrompt  [Evaluation prompt body - Highest priority]
 * 2. WorkflowConfig.defaultJudgePrompt
 * 3. Built-in template (createJudgePrompt function)
 *
 * Judge System Prompt:
 * -------------------
 * 1. Direct parameter in scoreEnsemble({ systemPrompt: "..." })  [Highest priority]
 * 2. JudgeConfig.systemPrompt
 * 3. undefined (judge personality uses provider default)
 */

// ============================================================================
// USAGE IN CODE
// ============================================================================

/*
// Execute with workflow defaults
await executeEnsemble({
  prompt: "Explain quantum computing",
  models: workflow.models,
  workflowDefaults: {
    systemPrompt: workflow.defaultSystemPrompt,
  },
});

// Score with workflow defaults
await scoreEnsemble({
  judges: workflow.judges,
  responses: ensembleResponses,
  originalPrompt: "Explain quantum computing",
  workflowDefaults: {
    judgePrompt: workflow.defaultJudgePrompt,
  },
});
*/

export { simpleWorkflow, mixedWorkflow, advancedWorkflow, multiJudgeWorkflow };
