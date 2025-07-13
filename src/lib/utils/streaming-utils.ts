/**
 * Phase 2: Enhanced Streaming Infrastructure
 * Streaming utilities for progress tracking and metadata enhancement
 */

import type {
  StreamingProgressData,
  StreamingMetadata,
  ProgressCallback,
} from "../core/types.js";

export interface UIProgressHandler {
  onProgress: (progress: StreamingProgressData) => void;
  onComplete: (metadata: StreamingMetadata) => void;
  onError: (error: Error) => void;
}

export interface StreamingStats {
  totalChunks: number;
  totalBytes: number;
  duration: number;
  averageChunkSize: number;
  provider: string;
  model: string;
}

/**
 * Enhanced streaming utilities for progress tracking and metadata
 */

export interface StreamingConfigOptions {
  enableProgressTracking?: boolean;
  progressCallback?: ProgressCallback;
  includeStreamingMetadata?: boolean;
  streamingBufferSize?: number;
  enableStreamingHeaders?: boolean;
}

/**
 * Legacy interface for backward compatibility
 */
export interface EnhancedStreamTextOptions extends StreamingConfigOptions {}

export class StreamingEnhancer {
  /**
   * Add progress tracking to a readable stream
   */
  static addProgressTracking(
    stream: ReadableStream,
    callback?: ProgressCallback,
    options?: { streamId?: string; bufferSize?: number },
  ): ReadableStream {
    const streamId = options?.streamId || `stream_${Date.now()}`;
    const startTime = Date.now();
    let chunkCount = 0;
    let totalBytes = 0;
    let lastProgressTime = startTime;

    return new ReadableStream({
      start(controller) {
        if (callback) {
          callback({
            chunkCount: 0,
            totalBytes: 0,
            chunkSize: 0,
            elapsedTime: 0,
            streamId,
            phase: "initializing",
          });
        }
      },

      async pull(controller) {
        const reader = stream.getReader();

        try {
          const { done, value } = await reader.read();

          if (done) {
            controller.close();

            if (callback) {
              const elapsedTime = Date.now() - startTime;
              callback({
                chunkCount,
                totalBytes,
                chunkSize:
                  totalBytes > 0 ? Math.round(totalBytes / chunkCount) : 0,
                elapsedTime,
                streamId,
                phase: "complete",
              });
            }
            return;
          }

          // Track progress
          chunkCount++;
          const chunkSize = value
            ? new TextEncoder().encode(value.toString()).length
            : 0;
          totalBytes += chunkSize;

          const currentTime = Date.now();
          const elapsedTime = currentTime - startTime;
          const timeSinceLastProgress = currentTime - lastProgressTime;

          // Call progress callback
          if (callback && (timeSinceLastProgress > 100 || chunkCount === 1)) {
            // Throttle to max 10 calls/second
            const estimatedRemaining = StreamingEnhancer.estimateRemainingTime(
              totalBytes,
              elapsedTime,
              chunkCount,
            );

            callback({
              chunkCount,
              totalBytes,
              chunkSize,
              elapsedTime,
              estimatedRemaining,
              streamId,
              phase: "streaming",
            });

            lastProgressTime = currentTime;
          }

          controller.enqueue(value);
        } catch (error) {
          controller.error(error);

          if (callback) {
            callback({
              chunkCount,
              totalBytes,
              chunkSize: 0,
              elapsedTime: Date.now() - startTime,
              streamId,
              phase: "error",
            });
          }
        } finally {
          reader.releaseLock();
        }
      },
    });
  }

  /**
   * Add metadata headers to streaming response
   */
  static addMetadataHeaders(
    response: Response,
    stats: StreamingStats,
  ): Response {
    const headers = new Headers(response.headers);

    headers.set("X-Streaming-Chunks", stats.totalChunks.toString());
    headers.set("X-Streaming-Bytes", stats.totalBytes.toString());
    headers.set("X-Streaming-Duration", stats.duration.toString());
    headers.set(
      "X-Streaming-Avg-Chunk-Size",
      stats.averageChunkSize.toString(),
    );
    headers.set("X-Streaming-Provider", stats.provider);
    headers.set("X-Streaming-Model", stats.model);
    headers.set(
      "X-Streaming-Throughput",
      Math.round(stats.totalBytes / (stats.duration / 1000)).toString(),
    );

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }

  /**
   * Create progress callback for UI integration
   */
  static createProgressCallback(ui: UIProgressHandler): ProgressCallback {
    return (progress: StreamingProgressData) => {
      try {
        ui.onProgress(progress);

        if (progress.phase === "complete") {
          ui.onComplete({
            startTime: Date.now() - progress.elapsedTime,
            endTime: Date.now(),
            totalDuration: progress.elapsedTime,
            averageChunkSize: Math.round(
              progress.totalBytes / progress.chunkCount,
            ),
            maxChunkSize: progress.chunkSize, // This would need to be tracked better in real implementation
            minChunkSize: progress.chunkSize, // This would need to be tracked better in real implementation
            throughputBytesPerSecond: Math.round(
              progress.totalBytes / (progress.elapsedTime / 1000),
            ),
            streamingProvider: "unknown", // Would be passed from provider
            modelUsed: "unknown", // Would be passed from provider
          });
        }
      } catch (error) {
        ui.onError(error as Error);
      }
    };
  }

  /**
   * Estimate remaining time based on current progress
   */
  static estimateRemainingTime(
    totalBytes: number,
    elapsedTime: number,
    chunkCount: number,
  ): number | undefined {
    if (elapsedTime < 1000 || chunkCount < 3) {
      return undefined; // Not enough data for estimation
    }

    const bytesPerMs = totalBytes / elapsedTime;
    const avgChunkSize = totalBytes / chunkCount;

    // Rough estimation assuming similar chunk sizes going forward
    // This is a simple heuristic - real implementation might be more sophisticated
    const estimatedTotalBytes = avgChunkSize * (chunkCount + 10); // Assume 10 more chunks
    const remainingBytes = estimatedTotalBytes - totalBytes;

    return Math.max(0, remainingBytes / bytesPerMs);
  }

  /**
   * Create enhanced streaming configuration
   */
  static createStreamingConfig(
    options: StreamingConfigOptions | EnhancedStreamTextOptions,
  ): {
    progressTracking: boolean;
    callback?: ProgressCallback;
    metadata: boolean;
    bufferSize: number;
    headers: boolean;
  } {
    return {
      progressTracking: options.enableProgressTracking ?? false,
      callback: options.progressCallback,
      metadata: options.includeStreamingMetadata ?? false,
      bufferSize: options.streamingBufferSize ?? 8192,
      headers: options.enableStreamingHeaders ?? false,
    };
  }
}

/**
 * Streaming performance monitor for debugging and optimization
 */
export class StreamingMonitor {
  private static activeStreams = new Map<string, StreamingProgressData>();

  static registerStream(streamId: string): void {
    this.activeStreams.set(streamId, {
      chunkCount: 0,
      totalBytes: 0,
      chunkSize: 0,
      elapsedTime: 0,
      streamId,
      phase: "initializing",
    });
  }

  static updateStream(streamId: string, progress: StreamingProgressData): void {
    this.activeStreams.set(streamId, progress);
  }

  static completeStream(streamId: string): void {
    this.activeStreams.delete(streamId);
  }

  static getActiveStreams(): StreamingProgressData[] {
    return Array.from(this.activeStreams.values());
  }

  static getStreamStats(): {
    activeCount: number;
    totalBytesActive: number;
    averageProgress: number;
  } {
    const streams = this.getActiveStreams();

    return {
      activeCount: streams.length,
      totalBytesActive: streams.reduce((sum, s) => sum + s.totalBytes, 0),
      averageProgress:
        streams.length > 0
          ? streams.reduce((sum, s) => sum + s.elapsedTime, 0) / streams.length
          : 0,
    };
  }
}
