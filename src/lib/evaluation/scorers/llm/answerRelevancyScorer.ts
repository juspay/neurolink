/**
 * @file Answer relevancy scorer
 * Evaluates how relevant the AI response is to the user query
 */

import type {
  LLMScorerConfig,
  ScoreResult,
  ScorerInput,
} from "../../../types/scorerTypes.js";
import { BaseLLMScorer } from "./baseLLMScorer.js";

const ANSWER_RELEVANCY_PROMPT = `You are evaluating if an AI response directly addresses the user's question.

**Question:**
{{query}}

**Response:**
{{response}}

{{#if hasContext}}
**Available Context:**
{{context}}
{{/if}}

## Evaluation Criteria

1. Does the response address the main intent of the question?
2. Is the response complete and sufficient?
3. Does it avoid unnecessary tangents?
4. Is the information directly relevant to what was asked?

## Output Format (JSON)

{
  "addressesIntent": true/false,
  "isComplete": true/false,
  "isOnTopic": true/false,
  "hasTangents": true/false,
  "score": 0.0-10.0,
  "reasoning": "explanation of the score",
  "confidence": 0.0-1.0
}`;

export class AnswerRelevancyScorer extends BaseLLMScorer {
  constructor(config?: Partial<LLMScorerConfig>) {
    super(
      {
        id: "answer-relevancy",
        name: "Answer Relevancy",
        description:
          "Evaluates how relevant the AI response is to the user query",
        type: "llm",
        category: "relevancy",
        version: "1.0.0",
        defaultConfig: {
          enabled: true,
          threshold: 0.7,
          weight: 1.0,
          timeout: 25000,
          retries: 2,
        },
        requiredInputs: ["query", "response"],
        optionalInputs: ["context"],
      },
      config,
    );
  }

  generatePrompt(input: ScorerInput): string {
    let prompt = ANSWER_RELEVANCY_PROMPT;

    prompt = this.substituteTemplate(prompt, {
      query: input.query,
      response: input.response,
    });

    const hasContext = !!(input.context && input.context.length > 0);
    prompt = this.processConditionals(prompt, { hasContext });
    if (hasContext && input.context) {
      prompt = prompt.replace(
        "{{context}}",
        input.context.map((c, i) => `[${i + 1}] ${c}`).join("\n"),
      );
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
        addressesIntent: json.addressesIntent ?? null,
        isComplete: json.isComplete ?? null,
        isOnTopic: json.isOnTopic ?? null,
        hasTangents: json.hasTangents ?? null,
      },
    };
  }
}

export async function createAnswerRelevancyScorer(
  config?: Partial<LLMScorerConfig>,
): Promise<AnswerRelevancyScorer> {
  return new AnswerRelevancyScorer(config);
}
