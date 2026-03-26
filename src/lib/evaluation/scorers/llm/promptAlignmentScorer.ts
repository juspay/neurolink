/**
 * @file Prompt alignment scorer
 * Measures how well the response aligns with prompt instructions
 */

import type {
  LLMScorerConfig,
  ScoreResult,
  ScorerInput,
} from "../../../types/scorerTypes.js";
import { BaseLLMScorer } from "./baseLLMScorer.js";

const PROMPT_ALIGNMENT_PROMPT = `You are an expert at evaluating how well AI responses follow instructions.

**User Instructions/Query:**
{{query}}

**AI Response:**
{{response}}

## Instructions

Analyze how well the response follows the instructions in the query. Check for:

1. **Instruction Following**: Does it do what was asked?
2. **Format Compliance**: Does it follow requested format?
3. **Constraint Adherence**: Does it respect any constraints given?
4. **Completeness**: Does it address all parts of the request?
5. **No Hallucinated Instructions**: Does it avoid adding unrequested content?

## Output Format (JSON)

{
  "score": <0-10>,
  "instructionFollowing": {
    "score": <0-10>,
    "details": "<explanation>"
  },
  "formatCompliance": {
    "score": <0-10>,
    "details": "<explanation>"
  },
  "constraintAdherence": {
    "score": <0-10>,
    "details": "<explanation>"
  },
  "completeness": {
    "score": <0-10>,
    "details": "<explanation>"
  },
  "missedInstructions": ["<list of missed requirements>"],
  "extraContent": ["<list of unrequested content>"],
  "reasoning": "<overall assessment>",
  "confidence": <0.0-1.0>
}`;

export class PromptAlignmentScorer extends BaseLLMScorer {
  constructor(config?: Partial<LLMScorerConfig>) {
    super(
      {
        id: "prompt-alignment",
        name: "Prompt Alignment",
        description:
          "Measures how well the response aligns with prompt instructions",
        type: "llm",
        category: "quality",
        version: "1.0.0",
        defaultConfig: {
          enabled: true,
          threshold: 0.7,
          weight: 1.0,
          timeout: 25000,
          retries: 2,
        },
        requiredInputs: ["query", "response"],
        optionalInputs: [],
      },
      config,
    );
  }

  generatePrompt(input: ScorerInput): string {
    return this.substituteTemplate(PROMPT_ALIGNMENT_PROMPT, {
      query: input.query,
      response: input.response,
    });
  }

  parseResponse(response: string, _input: ScorerInput): Partial<ScoreResult> {
    const json = this.extractJSON(response);

    if (!json) {
      const score = this.extractScoreFromText(response);
      return {
        score,
        reasoning: "Could not parse structured response",
        confidence: 0.3,
      };
    }

    const score = Math.min(
      10,
      Math.max(0, typeof json.score === "number" ? json.score : 5),
    );
    const confidence = Math.min(
      1,
      Math.max(0, typeof json.confidence === "number" ? json.confidence : 0.8),
    );

    return {
      score,
      reasoning:
        typeof json.reasoning === "string"
          ? json.reasoning
          : "No reasoning provided",
      confidence,
      metadata: {
        instructionFollowing: json.instructionFollowing ?? null,
        formatCompliance: json.formatCompliance ?? null,
        constraintAdherence: json.constraintAdherence ?? null,
        completeness: json.completeness ?? null,
        missedInstructions: json.missedInstructions ?? [],
        extraContent: json.extraContent ?? [],
      },
    };
  }
}

export async function createPromptAlignmentScorer(
  config?: Partial<LLMScorerConfig>,
): Promise<PromptAlignmentScorer> {
  return new PromptAlignmentScorer(config);
}
