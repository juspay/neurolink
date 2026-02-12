/**
 * LLM-powered Metadata Extractor
 *
 * Extracts structured metadata from document chunks using language models.
 * Supports title, summary, keywords, Q&A pairs, and custom schema extraction.
 */

import type {
  Chunk,
  ExtractParams,
  ExtractionResult,
  TitleExtractorConfig,
  SummaryExtractorConfig,
  KeywordExtractorConfig,
  QuestionExtractorConfig,
  CustomSchemaExtractorConfig,
} from "../types.js";
import { ProviderFactory } from "../../factories/providerFactory.js";
import { logger } from "../../utils/logger.js";

/**
 * Default prompts for metadata extraction
 */
const DEFAULT_PROMPTS = {
  title: `Extract a concise, descriptive title for the following content.
Return only the title, nothing else.

Content:
{context}

Title:`,

  summary: `Summarize the following content in {maxWords} words or less.
Focus on the key points and main ideas.

Content:
{context}

Summary:`,

  keywords: `Extract the {maxKeywords} most important keywords or key phrases from the following content.
Return them as a comma-separated list.

Content:
{context}

Keywords:`,

  questions: `Generate {numQuestions} questions that can be answered using the following content.
{answerInstruction}

Content:
{context}

Questions:`,
};

/**
 * LLM-powered metadata extractor
 * Extracts title, summary, keywords, Q&A pairs, and custom schema data
 */
export class LLMMetadataExtractor {
  private provider: string;
  private modelName: string;

  constructor(options?: { provider?: string; modelName?: string }) {
    this.provider = options?.provider || "openai";
    this.modelName = options?.modelName || "gpt-4o-mini";
  }

  /**
   * Extract metadata from chunks based on configuration
   * @param chunks - Array of chunks to extract metadata from
   * @param params - Extraction parameters
   * @returns Array of extraction results, one per chunk
   */
  async extract(
    chunks: Chunk[],
    params: ExtractParams,
  ): Promise<ExtractionResult[]> {
    const results: ExtractionResult[] = [];

    // Group chunks by documentId for title extraction
    const chunksByDocument = this.groupByDocument(chunks);

    // Cache titles by document to avoid re-extraction
    const titleCache = new Map<string, string>();

    for (const chunk of chunks) {
      const result: ExtractionResult = {};

      try {
        // Extract title (shared across chunks with same documentId)
        if (params.title) {
          const docId = chunk.metadata.documentId;

          if (!titleCache.has(docId)) {
            const titleConfig =
              typeof params.title === "boolean" ? {} : params.title;
            const title = await this.extractTitle(
              chunksByDocument.get(docId) || [chunk],
              titleConfig,
            );
            titleCache.set(docId, title);
          }

          result.title = titleCache.get(docId);
        }

        // Extract summary
        if (params.summary) {
          const summaryConfig =
            typeof params.summary === "boolean" ? {} : params.summary;
          result.summary = await this.extractSummary(chunk, summaryConfig);
        }

        // Extract keywords
        if (params.keywords) {
          const keywordConfig =
            typeof params.keywords === "boolean" ? {} : params.keywords;
          result.keywords = await this.extractKeywords(chunk, keywordConfig);
        }

        // Generate Q&A pairs
        if (params.questions) {
          const questionConfig =
            typeof params.questions === "boolean" ? {} : params.questions;
          result.questions = await this.extractQuestions(chunk, questionConfig);
        }

        // Custom schema extraction
        if (params.custom) {
          result.custom = await this.extractCustom(chunk, params.custom);
        }

        results.push(result);
      } catch (error) {
        logger.error("[MetadataExtractor] Extraction failed for chunk", {
          chunkId: chunk.id,
          error: error instanceof Error ? error.message : String(error),
        });
        results.push(result);
      }
    }

    return results;
  }

  /**
   * Group chunks by document ID
   */
  private groupByDocument(chunks: Chunk[]): Map<string, Chunk[]> {
    const groups = new Map<string, Chunk[]>();

    for (const chunk of chunks) {
      const docId = chunk.metadata.documentId;
      const group = groups.get(docId);
      if (group) {
        group.push(chunk);
      } else {
        groups.set(docId, [chunk]);
      }
    }

    return groups;
  }

  /**
   * Extract title from document chunks
   */
  private async extractTitle(
    chunks: Chunk[],
    config: TitleExtractorConfig,
  ): Promise<string> {
    const { nodes = 3, promptTemplate = DEFAULT_PROMPTS.title } = config;

    // Use first N chunks for title extraction
    const relevantChunks = chunks.slice(0, nodes);
    const context = relevantChunks.map((c) => c.text).join("\n\n");

    const prompt = promptTemplate.replace("{context}", context);
    const response = await this.callLLM(prompt, config);

    return response.trim();
  }

  /**
   * Extract summary from a chunk
   */
  private async extractSummary(
    chunk: Chunk,
    config: SummaryExtractorConfig,
  ): Promise<string> {
    const { maxWords = 100, promptTemplate = DEFAULT_PROMPTS.summary } = config;

    const prompt = promptTemplate
      .replace("{context}", chunk.text)
      .replace("{maxWords}", String(maxWords));

    const response = await this.callLLM(prompt, config);

    return response.trim();
  }

  /**
   * Extract keywords from a chunk
   */
  private async extractKeywords(
    chunk: Chunk,
    config: KeywordExtractorConfig,
  ): Promise<string[]> {
    const { maxKeywords = 10, promptTemplate = DEFAULT_PROMPTS.keywords } =
      config;

    const prompt = promptTemplate
      .replace("{context}", chunk.text)
      .replace("{maxKeywords}", String(maxKeywords));

    const response = await this.callLLM(prompt, config);

    // Parse comma-separated keywords
    return response
      .split(",")
      .map((k) => k.trim())
      .filter((k) => k.length > 0)
      .slice(0, maxKeywords);
  }

  /**
   * Extract Q&A pairs from a chunk
   */
  private async extractQuestions(
    chunk: Chunk,
    config: QuestionExtractorConfig,
  ): Promise<Array<{ question: string; answer?: string }>> {
    const {
      numQuestions = 3,
      includeAnswers = true,
      promptTemplate = DEFAULT_PROMPTS.questions,
    } = config;

    const answerInstruction = includeAnswers
      ? "For each question, also provide a brief answer based on the content."
      : "Return only the questions.";

    const prompt = promptTemplate
      .replace("{context}", chunk.text)
      .replace("{numQuestions}", String(numQuestions))
      .replace("{answerInstruction}", answerInstruction);

    const response = await this.callLLM(prompt, config);

    // Parse Q&A pairs from response
    return this.parseQAPairs(response, includeAnswers);
  }

  /**
   * Extract custom schema data from a chunk
   */
  private async extractCustom(
    chunk: Chunk,
    config: CustomSchemaExtractorConfig,
  ): Promise<Record<string, unknown>> {
    const { description, promptTemplate } = config;

    // Build extraction prompt
    const prompt =
      promptTemplate ||
      `Extract the following information from the content:
${description || "Extract structured data according to the schema."}

Content:
${chunk.text}

Return the extracted data as JSON.`;

    const response = await this.callLLM(prompt, config);

    try {
      // Try to parse as JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return JSON.parse(response);
    } catch {
      logger.warn(
        "[MetadataExtractor] Failed to parse custom extraction as JSON",
      );
      return { raw: response };
    }
  }

  /**
   * Parse Q&A pairs from LLM response
   */
  private parseQAPairs(
    response: string,
    includeAnswers: boolean,
  ): Array<{ question: string; answer?: string }> {
    const pairs: Array<{ question: string; answer?: string }> = [];

    // Try to parse numbered questions
    const lines = response.split("\n").filter((l) => l.trim());

    let currentQuestion: string | null = null;
    let currentAnswer: string | null = null;

    for (const line of lines) {
      const trimmed = line.trim();

      // Check if line is a question (starts with number or Q:)
      if (/^\d+[.):]\s*/.test(trimmed) || /^Q[.:]?\s*/i.test(trimmed)) {
        // Save previous Q&A pair
        if (currentQuestion) {
          pairs.push({
            question: currentQuestion,
            ...(includeAnswers && currentAnswer
              ? { answer: currentAnswer }
              : {}),
          });
        }

        currentQuestion = trimmed
          .replace(/^\d+[.):]\s*/, "")
          .replace(/^Q[.:]?\s*/i, "");
        currentAnswer = null;
      } else if (/^A[.:]?\s*/i.test(trimmed) && currentQuestion) {
        currentAnswer = trimmed.replace(/^A[.:]?\s*/i, "");
      } else if (currentQuestion && !currentAnswer) {
        // Continuation of question
        currentQuestion += " " + trimmed;
      } else if (currentAnswer) {
        // Continuation of answer
        currentAnswer += " " + trimmed;
      }
    }

    // Don't forget the last pair
    if (currentQuestion) {
      pairs.push({
        question: currentQuestion,
        ...(includeAnswers && currentAnswer ? { answer: currentAnswer } : {}),
      });
    }

    return pairs;
  }

  /**
   * Call the LLM with a prompt
   */
  private async callLLM(
    prompt: string,
    config: {
      modelName?: string;
      provider?: string;
      maxTokens?: number;
      temperature?: number;
    },
  ): Promise<string> {
    const provider = await ProviderFactory.createProvider(
      config.provider || this.provider,
      config.modelName || this.modelName,
    );

    const result = await provider.generate({
      prompt,
      maxTokens: config.maxTokens || 500,
      temperature: config.temperature || 0.3,
    });

    return result?.content || "";
  }
}

/**
 * Convenience function to extract metadata from chunks
 * @param chunks - Chunks to process
 * @param params - Extraction parameters
 * @param options - Extractor options
 * @returns Extraction results
 */
export async function extractMetadata(
  chunks: Chunk[],
  params: ExtractParams,
  options?: { provider?: string; modelName?: string },
): Promise<ExtractionResult[]> {
  const extractor = new LLMMetadataExtractor(options);
  return extractor.extract(chunks, params);
}
