/**
 * @file Context precision scorer
 * Measures the precision of retrieved context
 */

import type {
  LLMScorerConfig,
  ScoreResult,
  ScorerInput,
} from "../../../types/scorerTypes.js";
import { BaseLLMScorer } from "./baseLLMScorer.js";

const CONTEXT_PRECISION_PROMPT = `Given a question and retrieved context chunks, evaluate if the relevant information appears earlier in the context.

**Question:** {{query}}

**Context Chunks:**
{{context}}

{{#if hasGroundTruth}}
**Expected Answer:** {{groundTruth}}
{{/if}}

For each chunk, rate its relevance (0-1) to answering the question.
Calculate precision@k where relevant chunks should appear first.

**Output Format (JSON):**
{
  "chunkRelevance": [0.9, 0.3, 0.8, 0.1],
  "precisionAtK": { "1": 0.9, "3": 0.67, "5": 0.52 },
  "score": 0.0-10.0,
  "reasoning": "explanation"
}`;

export class ContextPrecisionScorer extends BaseLLMScorer {
  constructor(config?: Partial<LLMScorerConfig>) {
    super(
      {
        id: "context-precision",
        name: "Context Precision",
        description:
          "Measures the precision of retrieved context - whether relevant chunks are ranked higher",
        type: "llm",
        category: "relevancy",
        version: "1.0.0",
        defaultConfig: {
          enabled: true,
          threshold: 0.6,
          weight: 0.8,
          timeout: 25000,
          retries: 2,
        },
        requiredInputs: ["query", "context"],
        optionalInputs: ["groundTruth"],
      },
      config,
    );
  }

  generatePrompt(input: ScorerInput): string {
    let prompt = CONTEXT_PRECISION_PROMPT;

    prompt = this.substituteTemplate(prompt, { query: input.query });

    if (input.context && input.context.length > 0) {
      const contextSection = input.context
        .map((c, i) => `[Chunk ${i + 1}]: ${c}`)
        .join("\n\n");
      prompt = prompt.replace("{{context}}", contextSection);
    } else {
      prompt = prompt.replace("{{context}}", "[No context provided]");
    }

    const hasGroundTruth = !!input.groundTruth;
    prompt = this.processConditionals(prompt, { hasGroundTruth });
    if (hasGroundTruth && input.groundTruth) {
      prompt = prompt.replace("{{groundTruth}}", input.groundTruth);
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

    const score = Math.min(
      10,
      Math.max(0, typeof json.score === "number" ? json.score : 5),
    );

    return {
      score,
      reasoning:
        typeof json.reasoning === "string"
          ? json.reasoning
          : "No reasoning provided",
      confidence: 0.8,
      metadata: {
        chunkRelevance: json.chunkRelevance ?? [],
        precisionAtK: json.precisionAtK ?? {},
      },
    };
  }
}

export async function createContextPrecisionScorer(
  config?: Partial<LLMScorerConfig>,
): Promise<ContextPrecisionScorer> {
  return new ContextPrecisionScorer(config);
}
