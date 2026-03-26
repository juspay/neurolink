/**
 * @file Pipeline Presets
 * Pre-configured evaluation pipelines for common use cases
 */

import type { PipelineConfig } from "../../types/scorerTypes.js";

/**
 * Safety evaluation preset
 * Focuses on content safety: toxicity, bias, harmful content
 */
export const SAFETY_PIPELINE: PipelineConfig = {
  name: "safety",
  description: "Safety evaluation pipeline for detecting harmful content",
  scorers: [
    { id: "toxicity", config: { threshold: 0.9, weight: 2.0 } },
    { id: "bias-detection", config: { threshold: 0.8, weight: 1.5 } },
  ],
  aggregation: {
    method: "minimum",
  },
  passThreshold: 0.8,
  executionMode: "parallel",
  requiredScorers: ["toxicity"],
};

/**
 * RAG evaluation preset
 * Evaluates Retrieval Augmented Generation quality
 */
export const RAG_PIPELINE: PipelineConfig = {
  name: "rag",
  description: "RAG evaluation pipeline for retrieval-augmented generation",
  scorers: [
    { id: "faithfulness", config: { weight: 1.5 } },
    { id: "context-relevancy", config: { weight: 1.0 } },
    { id: "context-precision", config: { weight: 1.0 } },
    { id: "answer-relevancy", config: { weight: 1.2 } },
    { id: "hallucination", config: { weight: 1.5 } },
  ],
  aggregation: {
    method: "weighted",
    weights: {
      faithfulness: 1.5,
      "context-relevancy": 1.0,
      "context-precision": 1.0,
      "answer-relevancy": 1.2,
      hallucination: 1.5,
    },
  },
  passThreshold: 0.7,
  executionMode: "parallel",
  requiredScorers: ["faithfulness", "hallucination"],
};

/**
 * Quality evaluation preset
 * Focuses on response quality: format, length, tone
 */
export const QUALITY_PIPELINE: PipelineConfig = {
  name: "quality",
  description: "Quality evaluation pipeline for response assessment",
  scorers: [
    { id: "tone-consistency", config: { weight: 1.0 } },
    { id: "prompt-alignment", config: { weight: 1.2 } },
    { id: "length", config: { weight: 0.8 } },
    { id: "format", config: { weight: 0.8 } },
  ],
  aggregation: {
    method: "average",
  },
  passThreshold: 0.7,
  executionMode: "parallel",
};

/**
 * Comprehensive evaluation preset
 * Full evaluation across all dimensions
 */
export const COMPREHENSIVE_PIPELINE: PipelineConfig = {
  name: "comprehensive",
  description: "Comprehensive evaluation pipeline covering all aspects",
  scorers: [
    // Safety scorers
    { id: "toxicity", config: { threshold: 0.9, weight: 2.0 } },
    { id: "bias-detection", config: { threshold: 0.8, weight: 1.5 } },
    // Accuracy scorers
    { id: "hallucination", config: { weight: 1.5 } },
    { id: "faithfulness", config: { weight: 1.2 } },
    // Relevancy scorers
    { id: "context-relevancy", config: { weight: 1.0 } },
    { id: "answer-relevancy", config: { weight: 1.0 } },
    // Quality scorers
    { id: "tone-consistency", config: { weight: 0.8 } },
    { id: "prompt-alignment", config: { weight: 1.0 } },
  ],
  aggregation: {
    method: "weighted",
    weights: {
      toxicity: 2.0,
      "bias-detection": 1.5,
      hallucination: 1.5,
      faithfulness: 1.2,
      "context-relevancy": 1.0,
      "answer-relevancy": 1.0,
      "tone-consistency": 0.8,
      "prompt-alignment": 1.0,
    },
  },
  passThreshold: 0.75,
  executionMode: "parallel",
  requiredScorers: ["toxicity"],
};

/**
 * Minimal/fast evaluation preset
 * Quick checks for high-throughput scenarios
 */
export const MINIMAL_PIPELINE: PipelineConfig = {
  name: "minimal",
  description: "Minimal fast evaluation for high-throughput scenarios",
  scorers: [
    { id: "toxicity", config: { threshold: 0.9 } },
    { id: "hallucination", config: { threshold: 0.8 } },
  ],
  aggregation: {
    method: "minimum",
  },
  passThreshold: 0.8,
  executionMode: "parallel",
  timeout: 10000,
};

/**
 * Summarization evaluation preset
 * Evaluates summarization quality
 */
export const SUMMARIZATION_PIPELINE: PipelineConfig = {
  name: "summarization",
  description: "Summarization quality evaluation pipeline",
  scorers: [
    { id: "summarization", config: { weight: 1.5 } },
    { id: "faithfulness", config: { weight: 1.2 } },
    { id: "content-similarity", config: { weight: 1.0 } },
    { id: "length", config: { weight: 0.8 } },
  ],
  aggregation: {
    method: "weighted",
    weights: {
      summarization: 1.5,
      faithfulness: 1.2,
      "content-similarity": 1.0,
      length: 0.8,
    },
  },
  passThreshold: 0.7,
  executionMode: "parallel",
};

/**
 * Customer support evaluation preset
 * Tailored for customer service responses
 */
export const CUSTOMER_SUPPORT_PIPELINE: PipelineConfig = {
  name: "customerSupport",
  description: "Customer support response evaluation pipeline",
  scorers: [
    { id: "toxicity", config: { threshold: 0.95, weight: 2.0 } },
    { id: "tone-consistency", config: { weight: 1.5 } },
    { id: "prompt-alignment", config: { weight: 1.2 } },
    { id: "answer-relevancy", config: { weight: 1.0 } },
  ],
  aggregation: {
    method: "weighted",
    weights: {
      toxicity: 2.0,
      "tone-consistency": 1.5,
      "prompt-alignment": 1.2,
      "answer-relevancy": 1.0,
    },
  },
  passThreshold: 0.8,
  executionMode: "parallel",
  requiredScorers: ["toxicity"],
};

/**
 * Code generation evaluation preset
 * Evaluates generated code quality
 */
export const CODE_GENERATION_PIPELINE: PipelineConfig = {
  name: "codeGeneration",
  description: "Code generation quality evaluation pipeline",
  scorers: [
    { id: "format", config: { weight: 1.0 } },
    { id: "prompt-alignment", config: { weight: 1.5 } },
    { id: "hallucination", config: { weight: 1.2 } },
  ],
  aggregation: {
    method: "weighted",
    weights: {
      format: 1.0,
      "prompt-alignment": 1.5,
      hallucination: 1.2,
    },
  },
  passThreshold: 0.75,
  executionMode: "sequential",
};

/**
 * All available presets
 */
export const PipelinePresets = {
  safety: SAFETY_PIPELINE,
  rag: RAG_PIPELINE,
  quality: QUALITY_PIPELINE,
  comprehensive: COMPREHENSIVE_PIPELINE,
  minimal: MINIMAL_PIPELINE,
  summarization: SUMMARIZATION_PIPELINE,
  customerSupport: CUSTOMER_SUPPORT_PIPELINE,
  codeGeneration: CODE_GENERATION_PIPELINE,
} as const;

/**
 * Get a preset pipeline configuration by name
 */
export function getPreset(name: keyof typeof PipelinePresets): PipelineConfig {
  return PipelinePresets[name];
}

/**
 * Get all available preset names
 */
export function getPresetNames(): string[] {
  return Object.keys(PipelinePresets);
}
