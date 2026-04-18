/**
 * @file Context relevancy scorer
 * Evaluates how relevant retrieved context is to the query
 */

import type {
  ContextScoreItem,
  LLMScorerConfig,
  ScoreResult,
  ScorerInput,
} from "../../../types/index.js";
import { BaseLLMScorer } from "./baseLLMScorer.js";

const CONTEXT_RELEVANCY_PROMPT = `You are an expert at evaluating retrieval quality in RAG systems.

## Task
Evaluate how relevant each piece of retrieved context is to the user's query.

## User Query
{{query}}

## Retrieved Context
{{context}}

## Instructions

For each context piece:
1. Assess its relevance to the query (0-10)
2. Explain why it is or isn't relevant
3. Identify key information it provides

Then calculate an overall relevancy score.

## Output Format (JSON)

{
  "overallScore": <0-10>,
  "contextScores": [
    {
      "index": <number>,
      "score": <0-10>,
      "reasoning": "<why relevant or not>",
      "keyInfo": ["<key information extracted>"]
    }
  ],
  "reasoning": "<overall assessment>",
  "confidence": <0.0-1.0>
}`;

export class ContextRelevancyScorer extends BaseLLMScorer {
  constructor(config?: Partial<LLMScorerConfig>) {
    super(
      {
        id: "context-relevancy",
        name: "Context Relevancy",
        description:
          "Evaluates how relevant the retrieved context is to the user query",
        type: "llm",
        category: "relevancy",
        version: "1.0.0",
        defaultConfig: {
          enabled: true,
          threshold: 0.6,
          weight: 1.0,
          timeout: 25000,
          retries: 2,
        },
        requiredInputs: ["query", "context"],
        optionalInputs: ["response"],
      },
      config,
    );
  }

  generatePrompt(input: ScorerInput): string {
    let prompt = CONTEXT_RELEVANCY_PROMPT;

    prompt = this.substituteTemplate(prompt, { query: input.query });

    if (input.context && input.context.length > 0) {
      const contextSection = input.context
        .map((c, i) => `[Context ${i}]: ${c}`)
        .join("\n");
      prompt = prompt.replace("{{context}}", contextSection);
    } else {
      prompt = prompt.replace("{{context}}", "[No context provided]");
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

    const contextScores: ContextScoreItem[] = Array.isArray(json.contextScores)
      ? (json.contextScores as ContextScoreItem[])
      : [];

    const avgScore =
      contextScores.length > 0
        ? contextScores.reduce((sum, c) => sum + (c.score ?? 0), 0) /
          contextScores.length
        : 0;

    return {
      score:
        typeof json.overallScore === "number" ? json.overallScore : avgScore,
      reasoning:
        typeof json.reasoning === "string"
          ? json.reasoning
          : "No reasoning provided",
      confidence: typeof json.confidence === "number" ? json.confidence : 0.8,
      metadata: {
        contextScores,
        averageContextScore: avgScore,
      },
    };
  }
}

export async function createContextRelevancyScorer(
  config?: Partial<LLMScorerConfig>,
): Promise<ContextRelevancyScorer> {
  return new ContextRelevancyScorer(config);
}
