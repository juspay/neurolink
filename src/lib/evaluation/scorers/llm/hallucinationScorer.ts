/**
 * @file Hallucination detection scorer using LLM-as-judge
 * Detects factual errors and unsupported claims in AI responses
 */

import type {
  LLMScorerConfig,
  ScoreResult,
  ScorerInput,
} from "../../../types/scorerTypes.js";
import { BaseLLMScorer } from "./baseLLMScorer.js";

const HALLUCINATION_PROMPT = `You are an expert fact-checker evaluating an AI response for hallucinations.

A hallucination is when the AI:
1. States false facts that contradict known information
2. Fabricates specific details (names, dates, statistics) without basis
3. Makes claims that cannot be verified or are contradicted by provided context
4. Presents opinions or speculation as established facts

## Evaluation Context

**User Query:**
{{query}}

**AI Response:**
{{response}}

{{#if hasContext}}
**Provided Context:**
{{context}}
{{/if}}

{{#if hasGroundTruth}}
**Ground Truth:**
{{groundTruth}}
{{/if}}

## Instructions

Analyze the response for hallucinations. For each potential hallucination found:
1. Quote the problematic text
2. Explain why it's a hallucination
3. Rate severity (minor, moderate, severe)

Then provide an overall score from 0-10:
- 10: No hallucinations detected
- 7-9: Minor issues (imprecise but not false)
- 4-6: Moderate hallucinations present
- 1-3: Severe hallucinations
- 0: Response is mostly fabricated

## Output Format (JSON)

{
  "score": <0-10>,
  "hallucinations": [
    {
      "text": "<quoted problematic text>",
      "reason": "<explanation>",
      "severity": "<minor|moderate|severe>"
    }
  ],
  "reasoning": "<overall assessment>",
  "confidence": <0.0-1.0>
}`;

export class HallucinationScorer extends BaseLLMScorer {
  constructor(config?: Partial<LLMScorerConfig>) {
    super(
      {
        id: "hallucination",
        name: "Hallucination Detection",
        description:
          "Detects factual errors, fabrications, and unsupported claims in responses",
        type: "llm",
        category: "accuracy",
        version: "1.0.0",
        defaultConfig: {
          enabled: true,
          threshold: 0.8,
          weight: 1.5,
          timeout: 30000,
          retries: 2,
        },
        requiredInputs: ["query", "response"],
        optionalInputs: ["context", "groundTruth"],
      },
      config,
    );
  }

  generatePrompt(input: ScorerInput): string {
    let prompt = HALLUCINATION_PROMPT;

    // Substitute variables
    prompt = this.substituteTemplate(prompt, {
      query: input.query,
      response: input.response,
    });

    // Handle context
    const contextExists = !!(input.context && input.context.length > 0);
    prompt = this.processConditionals(prompt, { hasContext: contextExists });
    if (contextExists && input.context) {
      prompt = prompt.replace(
        "{{context}}",
        input.context.map((c, i) => `[${i + 1}] ${c}`).join("\n"),
      );
    }

    // Handle ground truth
    const groundTruthExists = !!input.groundTruth;
    prompt = this.processConditionals(prompt, {
      hasGroundTruth: groundTruthExists,
    });
    if (groundTruthExists && input.groundTruth) {
      prompt = prompt.replace("{{groundTruth}}", input.groundTruth);
    }

    return prompt;
  }

  parseResponse(response: string, _input: ScorerInput): Partial<ScoreResult> {
    const json = this.extractJSON(response);

    if (!json) {
      // Try to extract score from text
      const score = this.extractScoreFromText(response);
      return {
        score,
        reasoning: "Could not parse structured response",
        confidence: 0.3,
      };
    }

    type HallucinationItem = {
      text?: string;
      reason?: string;
      severity?: string;
    };
    const hallucinations: HallucinationItem[] = Array.isArray(
      json.hallucinations,
    )
      ? (json.hallucinations as HallucinationItem[])
      : [];
    const severities = hallucinations.map((h) => h.severity ?? "unknown");

    const rawScore = typeof json.score === "number" ? json.score : 5;
    const score = Math.max(0, Math.min(10, rawScore)); // Clamp to 0-10

    return {
      score,
      reasoning:
        typeof json.reasoning === "string"
          ? json.reasoning
          : "No reasoning provided",
      confidence: typeof json.confidence === "number" ? json.confidence : 0.8,
      metadata: {
        hallucinationCount: hallucinations.length,
        hallucinations,
        severityBreakdown: {
          minor: severities.filter((s) => s === "minor").length,
          moderate: severities.filter((s) => s === "moderate").length,
          severe: severities.filter((s) => s === "severe").length,
        },
      },
    };
  }
}

export async function createHallucinationScorer(
  config?: Partial<LLMScorerConfig>,
): Promise<HallucinationScorer> {
  return new HallucinationScorer(config);
}
