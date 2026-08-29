/**
 * AWS SageMaker Runtime Client Wrapper
 *
 * This module provides a wrapper around the AWS SDK SageMaker Runtime client
 * with enhanced error handling, retry logic, and NeuroLink-specific features.
 */

import type {
  SageMakerRuntimeClient as AWSClient,
  InvokeEndpointCommandInput,
  InvokeEndpointWithResponseStreamCommandInput,
  InvokeEndpointCommandOutput,
  InvokeEndpointWithResponseStreamCommandOutput,
} from "@aws-sdk/client-sagemaker-runtime";

import type {
  SageMakerConfig,
  InvokeEndpointParams,
  InvokeEndpointResponse,
  ConnectionResult,
} from "../../types/index.js";
import {
  handleSageMakerError,
  SageMakerError,
  isRetryableError,
  getRetryDelay,
} from "./errors.js";
import { logger } from "../../utils/logger.js";
import { isAbortError } from "../../utils/errorHandling.js";
import { tryImport } from "../../utils/tryImport.js";

/**
 * Lazily load `@aws-sdk/client-sagemaker-runtime`.
 *
 * The package is an optional dependency: importing it only happens here, on
 * first actual endpoint invocation, so constructing a SageMakerRuntimeClient
 * (e.g. while the CLI builds its command tree at startup) never requires the
 * SDK to be installed. If it's missing, surface a comprehensible, actionable
 * error instead of a raw resolution failure.
 */
async function loadSageMakerRuntime(): Promise<
  typeof import("@aws-sdk/client-sagemaker-runtime")
> {
  return tryImport<typeof import("@aws-sdk/client-sagemaker-runtime")>(
    "@aws-sdk/client-sagemaker-runtime",
    "SageMaker inference",
  );
}

/**
 * Enhanced SageMaker Runtime client with retry logic and error handling
 */
export class SageMakerRuntimeClient {
  private client: AWSClient | null = null;
  private sdkModule: typeof import("@aws-sdk/client-sagemaker-runtime") | null =
    null;
  private config: SageMakerConfig;
  private isDisposed: boolean = false;

  constructor(config: SageMakerConfig) {
    this.config = config;

    logger.debug("SageMaker Runtime client configured", {
      region: config.region,
      timeout: config.timeout,
      maxRetries: config.maxRetries,
      hasSessionToken: !!config.sessionToken,
      customEndpoint: !!config.endpoint,
    });
  }

  /**
   * Lazily load (and cache) the `@aws-sdk/client-sagemaker-runtime` module.
   */
  private async getSdk(): Promise<
    typeof import("@aws-sdk/client-sagemaker-runtime")
  > {
    if (!this.sdkModule) {
      this.sdkModule = await loadSageMakerRuntime();
    }
    return this.sdkModule;
  }

  /**
   * Lazily construct (and cache) the underlying AWS SDK client.
   */
  private async getClient(): Promise<AWSClient> {
    if (this.isDisposed) {
      throw new SageMakerError(
        "Cannot perform operation on disposed SageMaker client",
        {
          code: "VALIDATION_ERROR",
          statusCode: 400,
        },
      );
    }

    if (!this.client) {
      const { SageMakerRuntimeClient: AWSClientCtor } = await this.getSdk();
      this.client = new AWSClientCtor({
        region: this.config.region,
        credentials: {
          accessKeyId: this.config.accessKeyId,
          secretAccessKey: this.config.secretAccessKey,
          sessionToken: this.config.sessionToken,
        },
        maxAttempts: this.config.maxRetries || 3,
        requestHandler: {
          requestTimeout: this.config.timeout || 30000,
          httpsAgent: {
            // Keep connections alive for better performance
            keepAlive: true,
            maxSockets: 50,
          },
        },
        ...(this.config.endpoint && { endpoint: this.config.endpoint }),
      });

      logger.debug("SageMaker Runtime AWS SDK client initialized", {
        region: this.config.region,
      });
    }

    return this.client;
  }

  /**
   * Invoke a SageMaker endpoint for synchronous inference
   *
   * @param params - Endpoint invocation parameters
   * @returns Promise resolving to the inference response
   * @throws {SageMakerError} When the request fails
   */
  async invokeEndpoint(
    params: InvokeEndpointParams,
  ): Promise<InvokeEndpointResponse> {
    this.ensureNotDisposed();
    const startTime = Date.now();

    try {
      logger.debug("Invoking SageMaker endpoint", {
        endpointName: params.EndpointName,
        contentType: params.ContentType,
        bodySize:
          typeof params.Body === "string"
            ? params.Body.length
            : params.Body?.length || 0,
      });

      const { InvokeEndpointCommand } = await this.getSdk();

      // Prepare the command input
      const input: InvokeEndpointCommandInput = {
        EndpointName: params.EndpointName,
        Body: params.Body,
        ContentType: params.ContentType || "application/json",
        Accept: params.Accept || "application/json",
        CustomAttributes: params.CustomAttributes,
        TargetModel: params.TargetModel,
        TargetVariant: params.TargetVariant,
        InferenceId: params.InferenceId,
      };

      const command = new InvokeEndpointCommand(input);
      const client = await this.getClient();
      const response = (await this.executeWithRetry(
        // The signal goes to the transport, not just to whatever loop is
        // above us: without it an aborted call keeps its HTTP request in
        // flight until the endpoint answers. An AbortError matches none of
        // RETRYABLE_ERROR_CONDITIONS, so executeWithRetry surfaces it rather
        // than re-issuing a request the caller has already abandoned.
        () => client.send(command, { abortSignal: params.abortSignal }),
        params.EndpointName,
      )) as InvokeEndpointCommandOutput;

      const duration = Date.now() - startTime;
      logger.debug("SageMaker endpoint invocation successful", {
        endpointName: params.EndpointName,
        duration,
        responseSize: response.Body?.length || 0,
        invokedVariant: response.InvokedProductionVariant,
      });

      return {
        Body: response.Body,
        ContentType: response.ContentType,
        InvokedProductionVariant: response.InvokedProductionVariant,
        CustomAttributes: response.CustomAttributes,
      };
    } catch (error) {
      // The signal now reaches the transport, so this catch sees real
      // AbortErrors for the first time — and must not wrap them.
      // SageMakerError's constructor overwrites `.name`, and its generic
      // fallback stamps `statusCode: 500`, which the retry classifier reads as
      // "transient, try again". That fabricated status is what turned a
      // cancellation into three attempts and 22 seconds.
      if (isAbortError(error)) {
        throw error;
      }

      const duration = Date.now() - startTime;
      logger.error("SageMaker endpoint invocation failed", {
        endpointName: params.EndpointName,
        duration,
        error: error instanceof Error ? error.message : String(error),
      });

      throw handleSageMakerError(error, params.EndpointName);
    }
  }

  /**
   * Invoke a SageMaker endpoint with streaming response
   *
   * @param params - Endpoint invocation parameters for streaming
   * @returns Promise resolving to async iterable of response chunks
   * @throws {SageMakerError} When the request fails
   */
  async invokeEndpointWithStreaming(params: InvokeEndpointParams): Promise<{
    Body: AsyncIterable<Uint8Array>;
    ContentType?: string;
    InvokedProductionVariant?: string;
  }> {
    this.ensureNotDisposed();
    const startTime = Date.now();

    try {
      logger.debug("Starting SageMaker streaming invocation", {
        endpointName: params.EndpointName,
        contentType: params.ContentType,
        bodySize:
          typeof params.Body === "string"
            ? params.Body.length
            : params.Body?.length || 0,
      });

      const { InvokeEndpointWithResponseStreamCommand } = await this.getSdk();

      // Prepare the command input for streaming
      const input: InvokeEndpointWithResponseStreamCommandInput = {
        EndpointName: params.EndpointName,
        Body: params.Body,
        ContentType: params.ContentType || "application/json",
        Accept: params.Accept || "application/json",
        CustomAttributes: params.CustomAttributes,
        // Note: TargetModel, TargetVariant, InferenceId not available in streaming interface
      };

      const command = new InvokeEndpointWithResponseStreamCommand(input);
      const client = await this.getClient();
      const response = (await this.executeWithRetry(
        // As above — an abort must tear down the response stream's connection,
        // not merely stop the consumer reading from it.
        () => client.send(command, { abortSignal: params.abortSignal }),
        params.EndpointName,
      )) as InvokeEndpointWithResponseStreamCommandOutput;

      logger.debug("SageMaker streaming invocation started", {
        endpointName: params.EndpointName,
        setupDuration: Date.now() - startTime,
        invokedVariant: response.InvokedProductionVariant,
      });

      // Return the response with streaming body
      if (!response.Body) {
        throw new SageMakerError(
          "No response body received from streaming endpoint",
          {
            code: "MODEL_ERROR",
            statusCode: 500,
            endpoint: params.EndpointName,
          },
        );
      }

      // Convert AWS response stream to async iterable of Uint8Array
      const streamIterable = this.convertAWSStreamToIterable(response.Body);

      return {
        Body: streamIterable,
        ContentType: response.ContentType,
        InvokedProductionVariant: response.InvokedProductionVariant,
      };
    } catch (error) {
      // The signal now reaches the transport, so the streaming catch sees real
      // AbortErrors for the first time — and must not wrap them.
      // SageMakerError's constructor overwrites `.name`, and its generic
      // fallback stamps `statusCode: 500`, which the retry classifier reads as
      // "transient, try again". That fabricated status is what turned a
      // cancellation into three attempts and 22 seconds.
      if (isAbortError(error)) {
        throw error;
      }

      const duration = Date.now() - startTime;
      logger.error("SageMaker streaming invocation failed", {
        endpointName: params.EndpointName,
        duration,
        error: error instanceof Error ? error.message : String(error),
      });

      throw handleSageMakerError(error, params.EndpointName);
    }
  }

  /**
   * Execute a request with automatic retry logic
   *
   * @param operation - Function that executes the AWS SDK command
   * @param endpointName - Endpoint name for error context
   * @param attempt - Current attempt number (for recursive retries)
   * @returns Promise resolving to the operation result
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    endpointName: string,
    attempt: number = 1,
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      const maxRetries = this.config.maxRetries || 3;

      // Check if we should retry
      if (attempt < maxRetries && isRetryableError(error)) {
        const delay = getRetryDelay(error, attempt);

        logger.warn(`SageMaker request failed, retrying in ${delay}ms`, {
          endpointName,
          attempt,
          maxRetries,
          error: error instanceof Error ? error.message : String(error),
        });

        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, delay));

        // Recursive retry
        return this.executeWithRetry(operation, endpointName, attempt + 1);
      }

      // No more retries or not retryable
      throw error;
    }
  }

  /**
   * Validate endpoint connectivity and permissions
   *
   * @param endpointName - Name of the endpoint to validate
   * @returns Promise resolving to validation result
   */
  async validateEndpoint(endpointName: string): Promise<{
    isValid: boolean;
    status?: string;
    error?: string;
  }> {
    this.ensureNotDisposed();
    try {
      // Try a minimal test request to validate endpoint
      const testPayload = JSON.stringify({ test: true });

      await this.invokeEndpoint({
        EndpointName: endpointName,
        Body: testPayload,
        ContentType: "application/json",
        Accept: "application/json",
      });

      return { isValid: true };
    } catch (error) {
      if (error instanceof SageMakerError) {
        return {
          isValid: false,
          error: error.message,
        };
      }

      return {
        isValid: false,
        error:
          error instanceof Error ? error.message : "Unknown validation error",
      };
    }
  }

  /**
   * Get client configuration summary for debugging
   *
   * @returns Configuration summary (with sensitive data masked)
   */
  getConfigSummary(): Record<string, unknown> {
    this.ensureNotDisposed();
    return {
      region: this.config.region,
      timeout: this.config.timeout,
      maxRetries: this.config.maxRetries,
      hasCustomEndpoint: !!this.config.endpoint,
      credentialsConfigured: !!(
        this.config.accessKeyId && this.config.secretAccessKey
      ),
      hasSessionToken: !!this.config.sessionToken,
    };
  }

  /**
   * Check if the client is properly configured
   *
   * @returns True if client appears to be properly configured
   */
  isConfigured(): boolean {
    this.ensureNotDisposed();
    return !!(
      this.config.region &&
      this.config.accessKeyId &&
      this.config.secretAccessKey
    );
  }

  /**
   * Convert AWS SDK async iterable stream with payload structure
   */
  private async *convertAsyncIterableStream(
    awsStream: AsyncIterable<unknown>,
  ): AsyncIterable<Uint8Array> {
    for await (const chunk of awsStream) {
      // Handle AWS SDK payload structure
      if (chunk && typeof chunk === "object" && "PayloadPart" in chunk) {
        const payloadChunk = chunk as {
          PayloadPart?: { Data?: Uint8Array };
        };
        if (payloadChunk.PayloadPart?.Data) {
          yield payloadChunk.PayloadPart.Data;
        }
      } else if (chunk instanceof Uint8Array) {
        yield chunk;
      }
    }
  }

  /**
   * Convert Node.js readable stream with reader interface
   */
  private async *convertReadableStream(
    streamObj: Record<string, unknown>,
  ): AsyncIterable<Uint8Array> {
    const reader =
      typeof streamObj.getReader === "function"
        ? streamObj.getReader()
        : undefined;

    if (!reader) {
      return; // No valid reader available
    }

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        if (value instanceof Uint8Array) {
          yield value;
        } else if (typeof value === "string") {
          yield new TextEncoder().encode(value);
        }
      }
    } finally {
      reader.releaseLock?.();
    }
  }

  /**
   * Convert non-stream data to single Uint8Array chunk as fallback
   */
  private *convertFallbackData(awsStream: unknown): Iterable<Uint8Array> {
    logger.warn("Unsupported stream type, treating as single chunk", {
      type: typeof awsStream,
      isUint8Array: awsStream instanceof Uint8Array,
    });

    if (awsStream instanceof Uint8Array) {
      yield awsStream;
    } else if (typeof awsStream === "string") {
      yield new TextEncoder().encode(awsStream);
    } else {
      yield new TextEncoder().encode(JSON.stringify(awsStream));
    }
  }

  /**
   * Convert AWS response stream to async iterable of Uint8Array chunks
   * Refactored into smaller focused methods for different stream types
   */
  private async *convertAWSStreamToIterable(
    awsStream: unknown,
  ): AsyncIterable<Uint8Array> {
    try {
      // AWS SDK streaming response handling
      if (
        awsStream &&
        typeof awsStream === "object" &&
        Symbol.asyncIterator in awsStream
      ) {
        // Direct async iterable (AWS SDK event stream)
        yield* this.convertAsyncIterableStream(
          awsStream as AsyncIterable<unknown>,
        );
      } else if (
        awsStream &&
        typeof awsStream === "object" &&
        "pipe" in awsStream
      ) {
        // Node.js stream conversion (readable stream with reader)
        yield* this.convertReadableStream(awsStream as Record<string, unknown>);
      } else {
        // Fallback: treat as single response (non-streaming data)
        yield* this.convertFallbackData(awsStream);
      }
    } catch (error) {
      logger.error("Error converting AWS stream", {
        error: error instanceof Error ? error.message : String(error),
        streamType: typeof awsStream,
      });

      throw new SageMakerError(
        `Stream conversion failed: ${error instanceof Error ? error.message : String(error)}`,
        {
          code: "NETWORK_ERROR",
          statusCode: 500,
        },
      );
    }
  }

  /**
   * Check if the client has been disposed
   */
  public get disposed(): boolean {
    return this.isDisposed;
  }

  /**
   * Dispose of the client and clean up resources using explicit disposed state pattern
   *
   * AWS SDK v3 Automatic Resource Management:
   * ========================================
   *
   * The AWS SDK v3 uses automatic resource cleanup and doesn't require explicit disposal
   * of client instances in most cases. Here's how it works:
   *
   * 1. **HTTP Connection Pools**: AWS SDK v3 uses Node.js's built-in HTTP agent with
   *    connection pooling. These connections are automatically managed and will be
   *    closed when the Node.js process exits or becomes idle.
   *
   * 2. **Memory Management**: SDK clients don't hold significant resources that require
   *    manual cleanup. The JavaScript garbage collector handles memory deallocation
   *    when client references are removed.
   *
   * 3. **Background Timers**: Any internal timers (for retries, timeouts) are automatically
   *    cleared when operations complete or the client goes out of scope.
   *
   * 4. **Keep-Alive Connections**: HTTP keep-alive connections are managed by the
   *    underlying HTTP agent and will timeout automatically based on the configured
   *    keep-alive timeout (typically 15 seconds).
   *
   * Why We Still Implement dispose():
   * =================================
   *
   * 1. **Explicit State Management**: Provides clear lifecycle control and prevents
   *    accidental usage of disposed clients.
   *
   * 2. **Resource Tracking**: Allows our application to track when clients are no
   *    longer needed, which is useful for debugging and monitoring.
   *
   * 3. **Defensive Programming**: Ensures we don't rely on automatic cleanup in
   *    environments where it might not work as expected.
   *
   * 4. **Future Compatibility**: If future SDK versions require explicit cleanup,
   *    we already have the infrastructure in place.
   *
   * For more information, see:
   * - https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/
   * - https://aws.amazon.com/blogs/developer/node-js-configuring-maxsockets-in-sdk-for-javascript/
   */
  dispose(): void {
    // Check for race condition - already disposed using explicit state
    if (this.isDisposed) {
      logger.debug("SageMaker Runtime client already disposed");
      return;
    }

    // Mark as disposed first to prevent race conditions
    this.isDisposed = true;

    // Clear our client reference to enable garbage collection
    // Note: AWS SDK v3 handles all internal resource cleanup automatically
    this.client = null;
    this.sdkModule = null;

    logger.debug("SageMaker Runtime client disposed", {
      note: "AWS SDK v3 handles internal resource cleanup automatically",
    });
  }

  /**
   * Ensure client is not disposed before operations
   */
  private ensureNotDisposed(): void {
    if (this.isDisposed) {
      throw new SageMakerError(
        "Cannot perform operation on disposed SageMaker client",
        {
          code: "VALIDATION_ERROR",
          statusCode: 400,
        },
      );
    }
  }
}

/**
 * Factory function to create a SageMaker Runtime client
 *
 * @param config - SageMaker configuration
 * @returns Configured SageMakerRuntimeClient instance
 */
export function createSageMakerRuntimeClient(
  config: SageMakerConfig,
): SageMakerRuntimeClient {
  return new SageMakerRuntimeClient(config);
}

/**
 * Utility function to test SageMaker connectivity
 *
 * @param config - SageMaker configuration
 * @param endpointName - Endpoint to test
 * @returns Promise resolving to connectivity test result
 */
export async function testSageMakerConnectivity(
  config: SageMakerConfig,
  endpointName: string,
): Promise<ConnectionResult> {
  const client = new SageMakerRuntimeClient(config);
  const startTime = Date.now();

  try {
    const result = await client.validateEndpoint(endpointName);
    const latency = Date.now() - startTime;

    if (result.isValid) {
      return { connected: true, latency };
    } else {
      return { connected: false, error: result.error };
    }
  } catch (error) {
    return {
      connected: false,
      error:
        error instanceof Error ? error.message : "Unknown connectivity error",
    };
  } finally {
    client.dispose();
  }
}
