/**
 * @file Tone consistency scorer
 * Checks for consistent tone throughout the response
 */

import type {
  LLMScorerConfig,
  ScoreResult,
  ScorerInput,
} from "../../../types/scorerTypes.js";
import { BaseLLMScorer } from "./baseLLMScorer.js";

const TONE_CONSISTENCY_PROMPT = `You are an expert at analyzing writing tone and style consistency.

{{#if hasQuery}}
**User Query:**
{{query}}
{{/if}}

**AI Response:**
{{response}}

## Instructions

Analyze the response for tone consistency. Check for:
1. Consistent formality level throughout
2. Consistent emotional tone
3. Consistent voice (e.g., professional, casual, friendly)
4. No jarring shifts in style
5. Appropriate tone for the context

## Output Format (JSON)

{
  "score": <0-10>,
  "dominantTone": "<identified main tone>",
  "formalityLevel": "<formal|semi-formal|casual|mixed>",
  "toneShifts": [
    {
      "location": "<beginning|middle|end>",
      "from": "<original tone>",
      "to": "<shifted tone>",
      "severity": "<minor|moderate|major>"
    }
  ],
  "reasoning": "<detailed assessment>",
  "confidence": <0.0-1.0>
}`;

export class ToneConsistencyScorer extends BaseLLMScorer {
  constructor(config?: Partial<LLMScorerConfig>) {
    super(
      {
        id: "tone-consistency",
        name: "Tone Consistency",
        description: "Checks for consistent tone throughout the response",
        type: "llm",
        category: "quality",
        version: "1.0.0",
        defaultConfig: {
          enabled: true,
          threshold: 0.7,
          weight: 0.8,
          timeout: 20000,
          retries: 1,
        },
        requiredInputs: ["response"],
        optionalInputs: ["query"],
      },
      config,
    );
  }

  generatePrompt(input: ScorerInput): string {
    let prompt = TONE_CONSISTENCY_PROMPT;

    const hasQuery = !!input.query;
    prompt = this.processConditionals(prompt, { hasQuery });
    if (hasQuery) {
      prompt = this.substituteTemplate(prompt, { query: input.query });
    }

    prompt = this.substituteTemplate(prompt, { response: input.response });

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

    type ToneShift = {
      location?: string;
      from?: string;
      to?: string;
      severity?: string;
    };
    const toneShifts: ToneShift[] = Array.isArray(json.toneShifts)
      ? (json.toneShifts as ToneShift[])
      : [];

    const score =
      typeof json.score === "number"
        ? json.score
        : this.extractScoreFromText(response);
    const confidence =
      typeof json.confidence === "number" ? json.confidence : 0.3;

    return {
      score,
      reasoning:
        typeof json.reasoning === "string"
          ? json.reasoning
          : "Could not parse structured response",
      confidence,
      metadata: {
        dominantTone: json.dominantTone ?? "unknown",
        formalityLevel: json.formalityLevel ?? "unknown",
        toneShifts,
        shiftCount: toneShifts.length,
      },
    };
  }
}

export async function createToneConsistencyScorer(
  config?: Partial<LLMScorerConfig>,
): Promise<ToneConsistencyScorer> {
  return new ToneConsistencyScorer(config);
}
