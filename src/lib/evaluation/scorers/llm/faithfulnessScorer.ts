/**
 * @file Faithfulness scorer
 * Evaluates if the response is grounded in the provided context
 */

import type {
  LLMScorerConfig,
  ScoreResult,
  ScorerInput,
} from "../../../types/scorerTypes.js";
import { BaseLLMScorer } from "./baseLLMScorer.js";

const FAITHFULNESS_PROMPT = `You are an expert at evaluating faithfulness in AI responses.

Faithfulness measures whether the response is grounded in and supported by the provided context.
A faithful response:
- Only makes claims that are supported by the context
- Does not add information not present in the context
- Accurately represents the information from the context

## Response to Evaluate
{{response}}

## Source Context
{{context}}

{{#if hasQuery}}
## Original Query
{{query}}
{{/if}}

## Instructions

1. Extract all claims/statements from the response
2. For each claim, determine if it's supported by the context
3. Calculate the faithfulness score based on the proportion of supported claims

## Output Format (JSON)

{
  "score": <0-10>,
  "claims": [
    {
      "claim": "<extracted claim>",
      "supported": <true|false>,
      "evidence": "<supporting context or 'Not found in context'>"
    }
  ],
  "supportedCount": <number>,
  "totalClaims": <number>,
  "reasoning": "<overall assessment>",
  "confidence": <0.0-1.0>
}`;

export class FaithfulnessScorer extends BaseLLMScorer {
  constructor(config?: Partial<LLMScorerConfig>) {
    super(
      {
        id: "faithfulness",
        name: "Faithfulness",
        description:
          "Evaluates if the response is faithfully grounded in provided context",
        type: "llm",
        category: "faithfulness",
        version: "1.0.0",
        defaultConfig: {
          enabled: true,
          threshold: 0.7,
          weight: 1.2,
          timeout: 30000,
          retries: 2,
        },
        requiredInputs: ["response", "context"],
        optionalInputs: ["query"],
      },
      config,
    );
  }

  generatePrompt(input: ScorerInput): string {
    let prompt = FAITHFULNESS_PROMPT;

    prompt = this.substituteTemplate(prompt, { response: input.response });

    if (input.context && input.context.length > 0) {
      const contextSection = input.context
        .map((c, i) => `[Source ${i + 1}]: ${c}`)
        .join("\n");
      prompt = prompt.replace("{{context}}", contextSection);
    } else {
      prompt = prompt.replace("{{context}}", "No context provided");
    }

    const hasQuery = !!input.query;
    prompt = this.processConditionals(prompt, { hasQuery });
    if (hasQuery) {
      prompt = this.substituteTemplate(prompt, { query: input.query });
    }

    return prompt;
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

    type ClaimItem = { claim?: string; supported?: boolean; evidence?: string };
    const claims: ClaimItem[] = Array.isArray(json.claims)
      ? (json.claims as ClaimItem[])
      : [];

    const totalClaims =
      typeof json.totalClaims === "number" ? json.totalClaims : claims.length;
    const supportedCount =
      typeof json.supportedCount === "number"
        ? json.supportedCount
        : claims.filter((c) => c.supported === true).length;

    const faithfulnessRatio =
      totalClaims > 0 ? supportedCount / totalClaims : 1;

    return {
      score:
        typeof json.score === "number" ? json.score : faithfulnessRatio * 10,
      reasoning:
        typeof json.reasoning === "string"
          ? json.reasoning
          : "No reasoning provided",
      confidence: typeof json.confidence === "number" ? json.confidence : 0.8,
      metadata: {
        claims,
        supportedCount,
        totalClaims,
        faithfulnessRatio,
      },
    };
  }
}

export async function createFaithfulnessScorer(
  config?: Partial<LLMScorerConfig>,
): Promise<FaithfulnessScorer> {
  return new FaithfulnessScorer(config);
}
