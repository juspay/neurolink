/**
 * STREAMING DEBUG UTILITIES
 * Provides tools for debugging and analyzing streaming behavior
 */

import { ReadableStream } from "stream/web";

export interface StreamChunk {
  content: string;
  timestamp: number;
  index: number;
  size: number;
}

export interface StreamAnalysis {
  totalChunks: number;
  totalDuration: number;
  averageChunkInterval: number;
  chunksPerSecond: number;
  isProgressive: boolean;
  isSynthetic: boolean;
  chunks: StreamChunk[];
}

/**
 * Analyzes a stream and provides detailed metrics
 */
export async function analyzeStream<T extends { content?: string }>(
  stream: ReadableStream<T>,
): Promise<StreamAnalysis> {
  const chunks: StreamChunk[] = [];
  const startTime = Date.now();
  let index = 0;

  const reader = stream.getReader();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      if (value?.content) {
        chunks.push({
          content: value.content,
          timestamp: Date.now() - startTime,
          index: index++,
          size: value.content.length,
        });
      }
    }
  } finally {
    reader.releaseLock();
  }

  const totalDuration =
    chunks.length > 0 ? chunks[chunks.length - 1].timestamp : 0;

  const intervals = chunks
    .slice(1)
    .map((chunk, i) => chunk.timestamp - chunks[i].timestamp);

  const averageChunkInterval =
    intervals.length > 0
      ? intervals.reduce((a, b) => a + b, 0) / intervals.length
      : 0;

  // Detect if streaming is progressive (chunks arrive over time)
  const isProgressive = chunks.length > 1 && Math.max(...intervals) > 10; // At least 10ms between some chunks

  // Detect synthetic streaming (all chunks arrive at once)
  const isSynthetic = chunks.length > 1 && Math.max(...intervals) < 5; // All chunks within 5ms

  return {
    totalChunks: chunks.length,
    totalDuration,
    averageChunkInterval,
    chunksPerSecond:
      totalDuration > 0 ? (chunks.length / totalDuration) * 1000 : 0,
    isProgressive,
    isSynthetic,
    chunks,
  };
}

/**
 * Creates a debug wrapper for streams that logs chunk details
 */
export function createDebugStream<T extends { content?: string }>(
  stream: ReadableStream<T>,
  options: {
    logChunks?: boolean;
    logTiming?: boolean;
    logContent?: boolean;
    maxContentLength?: number;
  } = {},
): ReadableStream<T> {
  const {
    logChunks = true,
    logTiming = true,
    logContent = false,
    maxContentLength = 50,
  } = options;

  let chunkIndex = 0;
  const startTime = Date.now();
  let lastChunkTime = startTime;

  return new ReadableStream({
    async start(controller) {
      const reader = stream.getReader();

      try {
        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            console.log("\n🏁 Stream completed");
            controller.close();
            break;
          }

          if (value) {
            const currentTime = Date.now();
            const timeSinceStart = currentTime - startTime;
            const timeSinceLastChunk = currentTime - lastChunkTime;

            if (logChunks) {
              console.log(`\n📦 Chunk #${chunkIndex}`);

              if (logTiming) {
                console.log(
                  `   ⏱️  Time: ${timeSinceStart}ms (Δ${timeSinceLastChunk}ms)`,
                );
              }

              if (value.content) {
                console.log(`   📏 Size: ${value.content.length} chars`);

                if (logContent) {
                  const preview =
                    value.content.length > maxContentLength
                      ? value.content.substring(0, maxContentLength) + "..."
                      : value.content;
                  console.log(`   📝 Content: "${preview}"`);
                }
              }
            }

            controller.enqueue(value);
            chunkIndex++;
            lastChunkTime = currentTime;
          }
        }
      } catch (error) {
        controller.error(error);
      } finally {
        reader.releaseLock();
      }
    },
  });
}

/**
 * Validates stream structure and chunk properties
 */
export function validateStreamStructure<T extends { content?: string }>(
  chunks: T[],
): {
  isValid: boolean;
  issues: string[];
  properties: {
    hasContent: boolean;
    hasDelta: boolean;
    hasChunk: boolean;
    hasText: boolean;
    customProperties: string[];
  };
} {
  const issues: string[] = [];
  const properties = {
    hasContent: false,
    hasDelta: false,
    hasChunk: false,
    hasText: false,
    customProperties: [] as string[],
  };

  if (chunks.length === 0) {
    issues.push("No chunks received");
    return { isValid: false, issues, properties };
  }

  // Check first chunk for property structure
  const firstChunk = chunks[0] as any;
  const allKeys = new Set<string>();

  chunks.forEach((chunk) => {
    Object.keys(chunk as any).forEach((key) => allKeys.add(key));
  });

  // Check for standard properties
  if (allKeys.has("content")) {
    properties.hasContent = true;
  }
  if (allKeys.has("delta")) {
    properties.hasDelta = true;
  }
  if (allKeys.has("chunk")) {
    properties.hasChunk = true;
  }
  if (allKeys.has("text")) {
    properties.hasText = true;
  }

  // Find custom properties
  const standardProps = ["content", "delta", "chunk", "text"];
  properties.customProperties = Array.from(allKeys).filter(
    (key) => !standardProps.includes(key),
  );

  // Validate consistency
  chunks.forEach((chunk, index) => {
    if (chunk.content !== undefined) {
      if (typeof chunk.content !== "string") {
        issues.push(`Chunk ${index}: content is not a string`);
      }

      // Check for empty chunks (except last one)
      if (chunk.content === "" && index < chunks.length - 1) {
        issues.push(`Chunk ${index}: empty content in middle of stream`);
      }
    }
  });

  return {
    isValid: issues.length === 0,
    issues,
    properties,
  };
}

/**
 * Compares streaming behavior between providers
 */
export function compareStreamingBehavior(
  analyses: Record<string, StreamAnalysis>,
): {
  fastest: string;
  mostProgressive: string;
  mostChunks: string;
  comparison: Array<{
    provider: string;
    metrics: {
      ttft: number;
      totalTime: number;
      chunks: number;
      progressive: boolean;
    };
  }>;
} {
  const comparisons = Object.entries(analyses).map(([provider, analysis]) => ({
    provider,
    metrics: {
      ttft: analysis.chunks[0]?.timestamp || 0,
      totalTime: analysis.totalDuration,
      chunks: analysis.totalChunks,
      progressive: analysis.isProgressive,
    },
  }));

  const fastest = comparisons.reduce((a, b) =>
    a.metrics.ttft < b.metrics.ttft ? a : b,
  ).provider;

  const mostProgressive =
    comparisons
      .filter((c) => c.metrics.progressive)
      .sort((a, b) => b.metrics.totalTime - a.metrics.totalTime)[0]?.provider ||
    "none";

  const mostChunks = comparisons.reduce((a, b) =>
    a.metrics.chunks > b.metrics.chunks ? a : b,
  ).provider;

  return {
    fastest,
    mostProgressive,
    mostChunks,
    comparison: comparisons,
  };
}

/**
 * Detects streaming implementation type
 */
export function detectStreamingType(analysis: StreamAnalysis): {
  type: "native" | "synthetic" | "hybrid" | "unknown";
  confidence: number;
  reasoning: string[];
} {
  const reasoning: string[] = [];
  let type: "native" | "synthetic" | "hybrid" | "unknown" = "unknown";
  let confidence = 0;

  // Native streaming indicators
  if (analysis.isProgressive) {
    reasoning.push("Progressive chunk delivery detected");
    confidence += 30;
  }

  if (analysis.averageChunkInterval > 50) {
    reasoning.push(
      `High average chunk interval: ${Math.round(analysis.averageChunkInterval)}ms`,
    );
    confidence += 20;
  }

  if (analysis.chunks.length > 10 && analysis.totalDuration > 1000) {
    reasoning.push("Many chunks over extended duration");
    confidence += 20;
  }

  // Synthetic streaming indicators
  if (analysis.isSynthetic) {
    reasoning.push("All chunks arrived within 5ms");
    type = "synthetic";
    confidence = 80;
  } else if (analysis.totalDuration < 100 && analysis.chunks.length > 5) {
    reasoning.push("Many chunks in very short duration");
    type = "synthetic";
    confidence = 70;
  } else if (confidence >= 50) {
    type = "native";
  } else if (confidence >= 20) {
    type = "hybrid";
  }

  return { type, confidence, reasoning };
}
