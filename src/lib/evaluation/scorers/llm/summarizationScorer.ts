/**
 * @file Summarization quality scorer
 * Evaluates the quality of AI-generated summaries
 */

import type {
  LLMScorerConfig,
  ScoreResult,
  ScorerInput,
} from "../../../types/scorerTypes.js";
import { BaseLLMScorer } from "./baseLLMScorer.js";

const SUMMARIZATION_PROMPT = `You are an expert at evaluating summary quality.

**Summary to Evaluate:**
{{response}}

**Original Content:**
{{context}}

{{#if hasQuery}}
**Summarization Request:**
{{query}}
{{/if}}

## Evaluation Criteria

1. **Accuracy**: Is the summary factually correct?
2. **Coverage**: Does it capture the key points?
3. **Conciseness**: Is it appropriately brief?
4. **Coherence**: Is it well-organized and readable?
5. **No Hallucinations**: Does it avoid adding new information?

## Output Format (JSON)

{
  "score": <0-10>,
  "accuracy": {
    "score": <0-10>,
    "errors": ["<list of factual errors>"]
  },
  "coverage": {
    "score": <0-10>,
    "keyPointsCovered": ["<covered points>"],
    "keyPointsMissed": ["<missed points>"]
  },
  "conciseness": {
    "score": <0-10>,
    "assessment": "<too long|appropriate|too short>"
  },
  "coherence": {
    "score": <0-10>,
    "issues": ["<any coherence issues>"]
  },
  "hallucinations": ["<any fabricated information>"],
  "reasoning": "<overall assessment>",
  "confidence": <0.0-1.0>
}`;

export class SummarizationScorer extends BaseLLMScorer {
  constructor(config?: Partial<LLMScorerConfig>) {
    super(
      {
        id: "summarization",
        name: "Summarization Quality",
        description: "Evaluates the quality of AI-generated summaries",
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
        requiredInputs: ["response", "context"],
        optionalInputs: ["query"],
      },
      config,
    );
  }

  generatePrompt(input: ScorerInput): string {
    let prompt = SUMMARIZATION_PROMPT;

    const hasQuery = !!input.query;
    prompt = this.processConditionals(prompt, { hasQuery });

    return this.substituteTemplate(prompt, {
      response: input.response,
      context: input.context?.join("\n\n") ?? "",
      query: hasQuery ? input.query : "",
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
      Math.max(
        0,
        typeof json.score === "number"
          ? json.score
          : this.extractScoreFromText(response),
      ),
    );
    const confidence = Math.min(
      1,
      Math.max(0, typeof json.confidence === "number" ? json.confidence : 0.3),
    );

    return {
      score,
      reasoning:
        typeof json.reasoning === "string"
          ? json.reasoning
          : "No reasoning provided",
      confidence,
      metadata: {
        accuracy: json.accuracy ?? null,
        coverage: json.coverage ?? null,
        conciseness: json.conciseness ?? null,
        coherence: json.coherence ?? null,
        hallucinations: json.hallucinations ?? [],
      },
    };
  }
}

export async function createSummarizationScorer(
  config?: Partial<LLMScorerConfig>,
): Promise<SummarizationScorer> {
  return new SummarizationScorer(config);
}
