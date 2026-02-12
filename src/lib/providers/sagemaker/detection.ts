/**
 * SageMaker Model Detection and Streaming Capability Discovery
 *
 * This module provides intelligent detection of SageMaker endpoint capabilities
 * including model type identification and streaming protocol support.
 */

import type {
  SageMakerConfig,
  SageMakerModelConfig,
  InvokeEndpointResponse,
} from "../../types/providers.js";
import { SageMakerRuntimeClient } from "./client.js";
import { logger } from "../../utils/logger.js";

/**
 * Configurable constants for detection timing and performance
 */
const DETECTION_STAGGER_DELAY_MS = 25; // Delay between staggered test starts (ms)
const DETECTION_RATE_LIMIT_BACKOFF_MS = 200; // Initial backoff on rate limit detection (ms)

/**
 * Streaming capability information for an endpoint
 */
export type StreamingCapability = {
  /** Whether streaming is supported */
  supported: boolean;
  /** Detected streaming protocol */
  protocol: "sse" | "jsonl" | "chunked" | "none";
  /** Detected model framework */
  modelType: "huggingface" | "llama" | "pytorch" | "tensorflow" | "custom";
  /** Test endpoint for streaming validation */
  testEndpoint?: string;
  /** Required parameters for streaming */
  parameters?: Record<string, unknown>;
  /** Confidence level of detection (0-1) */
  confidence: number;
  /** Additional metadata about the model */
  metadata?: {
    modelName?: string;
    framework?: string;
    version?: string;
    tags?: string[];
  };
};

/**
 * Model type detection result
 */
export type ModelDetectionResult = {
  /** Primary model type */
  type: StreamingCapability["modelType"];
  /** Detection confidence (0-1) */
  confidence: number;
  /** Evidence used for detection */
  evidence: string[];
  /** Suggested configuration */
  suggestedConfig?: Partial<SageMakerModelConfig>;
};

/**
 * Endpoint health and metadata information
 */
export type EndpointHealth = {
  /** Health status */
  status: "healthy" | "unhealthy" | "unknown";
  /** Response time in milliseconds */
  responseTime: number;
  /** Endpoint metadata if available */
  metadata?: Record<string, unknown>;
  /** Model information if discoverable */
  modelInfo?: {
    name?: string;
    version?: string;
    framework?: string;
    architecture?: string;
  };
};

/**
 * Configuration object for detection test wrapper
 * Replaces multiple callback parameters for better maintainability
 */
type DetectionTestConfig = {
  test: () => Promise<void>;
  index: number;
  testName: string;
  endpointName: string;
  semaphore: {
    acquire(): Promise<void>;
    release(): void;
  };
  incrementRateLimit: () => void;
  maxRateLimitRetries: number;
  rateLimitState: { count: number }; // Use mutable object to prevent closure issues
};

/**
 * Configuration object for parallel detection test execution
 * Centralizes rate limiting and execution parameters
 */
type ParallelDetectionConfig = {
  maxConcurrentTests: number;
  maxRateLimitRetries: number;
  initialRateLimitCount: number;
};

/**
 * SageMaker Model Detection and Capability Discovery Service
 */
export class SageMakerDetector {
  private client: SageMakerRuntimeClient;
  private config: SageMakerConfig;

  constructor(config: SageMakerConfig) {
    this.client = new SageMakerRuntimeClient(config);
    this.config = config;
  }

  /**
   * Detect streaming capabilities for a given endpoint
   */
  async detectStreamingCapability(
    endpointName: string,
  ): Promise<StreamingCapability> {
    logger.debug("Starting streaming capability detection", { endpointName });

    try {
      // Step 1: Check endpoint health and gather metadata
      const health = await this.checkEndpointHealth(endpointName);
      if (health.status !== "healthy") {
        return this.createNoStreamingCapability(
          "custom",
          "Endpoint not healthy",
        );
      }

      // Step 2: Detect model type
      const modelDetection = await this.detectModelType(endpointName);
      logger.debug("Model type detection result", {
        endpointName,
        type: modelDetection.type,
        confidence: modelDetection.confidence,
      });

      // Step 3: Test streaming support based on model type
      const streamingSupport = await this.testStreamingSupport(
        endpointName,
        modelDetection.type,
      );

      // Step 4: Determine streaming protocol
      const protocol = await this.detectStreamingProtocol(modelDetection.type);

      return {
        supported: streamingSupport.supported,
        protocol,
        modelType: modelDetection.type,
        confidence: Math.min(
          modelDetection.confidence,
          streamingSupport.confidence,
        ),
        parameters: streamingSupport.parameters,
        metadata: {
          modelName: health.modelInfo?.name,
          framework: health.modelInfo?.framework,
          version: health.modelInfo?.version,
        },
      };
    } catch (error) {
      logger.warn("Streaming capability detection failed", {
        endpointName,
        error: error instanceof Error ? error.message : String(error),
      });

      return this.createNoStreamingCapability(
        "custom",
        "Detection failed, assuming custom model",
      );
    }
  }

  /**
   * Detect the model type/framework for an endpoint
   */
  async detectModelType(endpointName: string): Promise<ModelDetectionResult> {
    const evidence: string[] = [];
    const detectionTests = [
      () => this.testHuggingFaceSignature(endpointName, evidence),
      () => this.testLlamaSignature(endpointName, evidence),
      () => this.testPyTorchSignature(endpointName, evidence),
      () => this.testTensorFlowSignature(endpointName, evidence),
    ];

    // Run detection tests in parallel with intelligent rate limiting
    const testNames = ["HuggingFace", "LLaMA", "PyTorch", "TensorFlow"];
    const _results = await this.runDetectionTestsInParallel(
      detectionTests,
      testNames,
      endpointName,
    );

    // Analyze results and determine most likely model type
    const scores = {
      huggingface: 0,
      llama: 0,
      pytorch: 0,
      tensorflow: 0,
      custom: 0.1, // Base score for custom models
    };

    // Process evidence and calculate scores
    evidence.forEach((item) => {
      if (item.includes("huggingface") || item.includes("transformers")) {
        scores.huggingface += 0.3;
      }
      if (item.includes("llama") || item.includes("openai-compatible")) {
        scores.llama += 0.3;
      }
      if (item.includes("pytorch") || item.includes("torch")) {
        scores.pytorch += 0.2;
      }
      if (item.includes("tensorflow") || item.includes("serving")) {
        scores.tensorflow += 0.2;
      }
    });

    // Find highest scoring model type
    const maxScore = Math.max(...Object.values(scores));
    const detectedType =
      (Object.entries(scores).find(
        ([, score]) => score === maxScore,
      )?.[0] as ModelDetectionResult["type"]) || "custom";

    return {
      type: detectedType,
      confidence: maxScore,
      evidence,
      suggestedConfig: this.getSuggestedConfig(detectedType),
    };
  }

  /**
   * Check endpoint health and gather metadata
   */
  async checkEndpointHealth(endpointName: string): Promise<EndpointHealth> {
    const startTime = Date.now();

    try {
      // Simple health check with minimal payload
      const testPayload = JSON.stringify({ inputs: "test" });

      const response = await this.client.invokeEndpoint({
        EndpointName: endpointName,
        Body: testPayload,
        ContentType: "application/json",
      });

      const responseTime = Date.now() - startTime;

      return {
        status: "healthy",
        responseTime,
        metadata: response.CustomAttributes
          ? JSON.parse(response.CustomAttributes)
          : undefined,
        modelInfo: this.extractModelInfo(response),
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;

      logger.warn("Endpoint health check failed", {
        endpointName,
        responseTime,
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        status: "unhealthy",
        responseTime,
      };
    }
  }

  /**
   * Test if endpoint supports streaming for given model type
   */
  private async testStreamingSupport(
    endpointName: string,
    modelType: StreamingCapability["modelType"],
  ): Promise<{
    supported: boolean;
    confidence: number;
    parameters?: Record<string, unknown>;
  }> {
    const testCases = this.getStreamingTestCases(modelType);

    for (const testCase of testCases) {
      try {
        const response = await this.client.invokeEndpoint({
          EndpointName: endpointName,
          Body: JSON.stringify(testCase.payload),
          ContentType: "application/json",
          Accept: testCase.acceptHeader,
        });

        // Check response headers for streaming indicators
        if (this.indicatesStreamingSupport(response)) {
          return {
            supported: true,
            confidence: testCase.confidence,
            parameters: testCase.parameters,
          };
        }
      } catch (error) {
        // Streaming test failed, continue to next test case
        logger.debug("Streaming test failed", {
          endpointName,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return { supported: false, confidence: 0.9 };
  }

  /**
   * Detect streaming protocol used by endpoint
   */
  private async detectStreamingProtocol(
    modelType: StreamingCapability["modelType"],
  ): Promise<StreamingCapability["protocol"]> {
    // Protocol mapping based on model type
    const protocolMap: Record<
      StreamingCapability["modelType"],
      StreamingCapability["protocol"]
    > = {
      huggingface: "sse", // Server-Sent Events
      llama: "jsonl", // JSON Lines
      pytorch: "none", // Usually no streaming
      tensorflow: "none", // Usually no streaming
      custom: "chunked", // Generic chunked transfer
    };

    return protocolMap[modelType] || "none";
  }

  /**
   * Test for HuggingFace Transformers signature
   */
  private async testHuggingFaceSignature(
    endpointName: string,
    evidence: string[],
  ): Promise<void> {
    try {
      const testPayload = {
        inputs: "test",
        parameters: { return_full_text: false, max_new_tokens: 1 },
      };

      const response = await this.client.invokeEndpoint({
        EndpointName: endpointName,
        Body: JSON.stringify(testPayload),
        ContentType: "application/json",
      });

      const responseText = new TextDecoder().decode(response.Body);
      const parsedResponse = JSON.parse(responseText);

      if (parsedResponse[0]?.generated_text !== undefined) {
        evidence.push("huggingface: generated_text field found");
      }
      if (parsedResponse.error?.includes("transformers")) {
        evidence.push("huggingface: transformers error message");
      }
    } catch (error) {
      logger.debug("HuggingFace signature test failed", { error });
    }
  }

  /**
   * Test for LLaMA model signature
   */
  private async testLlamaSignature(
    endpointName: string,
    evidence: string[],
  ): Promise<void> {
    try {
      const testPayload = {
        prompt: "test",
        max_tokens: 1,
        temperature: 0,
      };

      const response = await this.client.invokeEndpoint({
        EndpointName: endpointName,
        Body: JSON.stringify(testPayload),
        ContentType: "application/json",
      });

      const responseText = new TextDecoder().decode(response.Body);
      const parsedResponse = JSON.parse(responseText);

      if (parsedResponse.choices) {
        evidence.push("llama: openai-compatible choices field");
      }
      if (parsedResponse.object === "text_completion") {
        evidence.push("llama: openai text_completion object");
      }
    } catch {
      // Test failed, no evidence
    }
  }

  /**
   * Test for PyTorch model signature
   */
  private async testPyTorchSignature(
    endpointName: string,
    evidence: string[],
  ): Promise<void> {
    try {
      const testPayload = { input: "test" };

      const response = await this.client.invokeEndpoint({
        EndpointName: endpointName,
        Body: JSON.stringify(testPayload),
        ContentType: "application/json",
      });

      const responseText = new TextDecoder().decode(response.Body);

      if (
        responseText.includes("prediction") ||
        responseText.includes("output")
      ) {
        evidence.push("pytorch: prediction/output field pattern");
      }
    } catch {
      // Test failed, no evidence
    }
  }

  /**
   * Test for TensorFlow Serving signature
   */
  private async testTensorFlowSignature(
    endpointName: string,
    evidence: string[],
  ): Promise<void> {
    try {
      const testPayload = {
        instances: [{ input: "test" }],
        signature_name: "serving_default",
      };

      const response = await this.client.invokeEndpoint({
        EndpointName: endpointName,
        Body: JSON.stringify(testPayload),
        ContentType: "application/json",
      });

      const responseText = new TextDecoder().decode(response.Body);
      const parsedResponse = JSON.parse(responseText);

      if (parsedResponse.predictions) {
        evidence.push("tensorflow: serving predictions field");
      }
    } catch {
      // Test failed, no evidence
    }
  }

  /**
   * Get streaming test cases for a model type
   */
  private getStreamingTestCases(modelType: StreamingCapability["modelType"]) {
    const testCases = {
      huggingface: [
        {
          name: "HF streaming test",
          payload: {
            inputs: "test",
            parameters: { stream: true, max_new_tokens: 5 },
          },
          acceptHeader: "text/event-stream",
          confidence: 0.8,
          parameters: { stream: true },
        },
      ],
      llama: [
        {
          name: "LLaMA streaming test",
          payload: { prompt: "test", stream: true, max_tokens: 5 },
          acceptHeader: "application/x-ndjson",
          confidence: 0.8,
          parameters: { stream: true },
        },
      ],
      pytorch: [],
      tensorflow: [],
      custom: [
        {
          name: "Generic streaming test",
          payload: { input: "test", stream: true },
          acceptHeader: "application/json",
          confidence: 0.3,
          parameters: { stream: true },
        },
      ],
    };

    return testCases[modelType] || [];
  }

  /**
   * Check if response indicates streaming support
   */
  private indicatesStreamingSupport(response: InvokeEndpointResponse): boolean {
    // Check content type for streaming indicators
    const contentType = response.ContentType || "";

    if (
      contentType.includes("event-stream") ||
      contentType.includes("x-ndjson") ||
      contentType.includes("chunked")
    ) {
      return true;
    }

    // Note: InvokeEndpointResponse doesn't include headers
    // Streaming detection is based on ContentType only

    logger.debug("Testing streaming support", {
      contentType,
    });

    return false;
  }

  /**
   * Extract model information from response
   */
  private extractModelInfo(
    response: InvokeEndpointResponse,
  ): EndpointHealth["modelInfo"] {
    try {
      const customAttributes = response.CustomAttributes
        ? JSON.parse(response.CustomAttributes)
        : {};

      return {
        name: customAttributes.model_name,
        version: customAttributes.model_version,
        framework: customAttributes.framework,
        architecture: customAttributes.architecture,
      };
    } catch {
      return undefined;
    }
  }

  /**
   * Get suggested configuration for detected model type
   */
  private getSuggestedConfig(
    modelType: StreamingCapability["modelType"],
  ): Partial<SageMakerModelConfig> {
    const configs = {
      huggingface: {
        modelType: "huggingface" as const,
        inputFormat: "huggingface" as const,
        outputFormat: "huggingface" as const,
        contentType: "application/json",
        accept: "text/event-stream",
      },
      llama: {
        modelType: "llama" as const,
        contentType: "application/json",
        accept: "application/x-ndjson",
      },
      pytorch: {
        modelType: "custom" as const,
        contentType: "application/json",
        accept: "application/json",
      },
      tensorflow: {
        modelType: "custom" as const,
        contentType: "application/json",
        accept: "application/json",
      },
      custom: {
        modelType: "custom" as const,
        contentType: "application/json",
        accept: "application/json",
      },
    };

    return configs[modelType] || configs.custom;
  }

  /**
   * Run detection tests in parallel with intelligent rate limiting and circuit breaker
   * Now uses configuration object for better parameter management
   */
  private async runDetectionTestsInParallel(
    detectionTests: Array<() => Promise<void>>,
    testNames: string[],
    endpointName: string,
    config: ParallelDetectionConfig = {
      maxConcurrentTests: 2,
      maxRateLimitRetries: 2,
      initialRateLimitCount: 0,
    },
  ): Promise<Array<PromiseSettledResult<void>>> {
    // Use configurable concurrency limit from config
    const semaphore = this.createDetectionSemaphore(config.maxConcurrentTests);

    // Use mutable object to prevent closure stale state issues
    const rateLimitState = { count: config.initialRateLimitCount };

    const wrappedTests = detectionTests.map((test, index) =>
      this.wrapDetectionTest({
        test,
        index,
        testName: testNames[index],
        endpointName,
        semaphore,
        incrementRateLimit: () => rateLimitState.count++,
        maxRateLimitRetries: config.maxRateLimitRetries,
        rateLimitState,
      }),
    );

    const results = await this.executeTestsWithConcurrencyControl(wrappedTests);

    this.logDetectionResults(
      endpointName,
      testNames,
      results,
      rateLimitState.count > 0,
    );

    return results;
  }

  /**
   * Create a semaphore for detection test concurrency control
   */
  private createDetectionSemaphore(maxConcurrent: number) {
    return {
      count: maxConcurrent,
      waiters: [] as Array<() => void>,

      async acquire(): Promise<void> {
        return new Promise((resolve) => {
          if (this.count > 0) {
            this.count--;
            resolve();
          } else {
            this.waiters.push(() => {
              this.count--;
              resolve();
            });
          }
        });
      },

      release(): void {
        if (this.waiters.length > 0) {
          const waiter = this.waiters.shift();
          if (waiter) {
            this.count++; // Increment count before calling waiter so waiter can decrement it
            waiter();
          }
        } else {
          this.count++;
        }
      },
    };
  }

  /**
   * Wrap a detection test with error handling, rate limiting, and retry logic
   * Now uses configuration object instead of multiple parameters
   */
  private wrapDetectionTest(config: DetectionTestConfig) {
    return async (): Promise<PromiseSettledResult<void>> => {
      await config.semaphore.acquire();

      try {
        await this.executeWithStaggeredStart(config.test, config.index);
        return { status: "fulfilled", value: undefined };
      } catch (error) {
        const result = await this.handleDetectionTestError(error, {
          test: config.test,
          testName: config.testName,
          endpointName: config.endpointName,
          incrementRateLimit: config.incrementRateLimit,
          maxRateLimitRetries: config.maxRateLimitRetries,
          rateLimitCount: config.rateLimitState.count,
        });
        return result;
      } finally {
        config.semaphore.release();
      }
    };
  }

  /**
   * Execute a test with staggered start to spread load
   */
  private async executeWithStaggeredStart(
    test: () => Promise<void>,
    index: number,
  ): Promise<void> {
    const staggerDelay = index * DETECTION_STAGGER_DELAY_MS;
    if (staggerDelay > 0) {
      await new Promise((resolve) => setTimeout(resolve, staggerDelay));
    }
    await test();
  }

  /**
   * Handle detection test errors with rate limiting and retry logic
   */
  private async handleDetectionTestError(
    error: unknown,
    options: {
      test: () => Promise<void>;
      testName: string;
      endpointName: string;
      incrementRateLimit: () => void;
      maxRateLimitRetries: number;
      rateLimitCount: number;
    },
  ): Promise<PromiseSettledResult<void>> {
    const isRateLimit = this.isRateLimitError(error);
    const {
      test,
      testName,
      endpointName,
      incrementRateLimit,
      maxRateLimitRetries,
      rateLimitCount,
    } = options;

    if (isRateLimit && rateLimitCount < maxRateLimitRetries) {
      return await this.retryWithBackoff(
        test,
        testName,
        endpointName,
        incrementRateLimit,
        rateLimitCount,
      );
    }

    this.logDetectionTestFailure(testName, endpointName, error);
    return { status: "rejected", reason: error };
  }

  /**
   * Check if an error indicates rate limiting
   */
  private isRateLimitError(error: unknown): boolean {
    return (
      error instanceof Error &&
      (error.message.toLowerCase().includes("throttl") ||
        error.message.toLowerCase().includes("rate limit") ||
        error.message.toLowerCase().includes("too many requests"))
    );
  }

  /**
   * Retry a test with exponential backoff
   */
  private async retryWithBackoff(
    test: () => Promise<void>,
    testName: string,
    endpointName: string,
    incrementRateLimit: () => void,
    rateLimitCount: number,
  ): Promise<PromiseSettledResult<void>> {
    incrementRateLimit();

    logger.debug(`Rate limit detected for ${testName}, applying backoff`, {
      endpointName,
      attempt: rateLimitCount + 1,
    });

    await new Promise((resolve) =>
      setTimeout(
        resolve,
        DETECTION_RATE_LIMIT_BACKOFF_MS * Math.pow(2, rateLimitCount),
      ),
    );

    try {
      await test();
      return { status: "fulfilled", value: undefined };
    } catch (retryError) {
      this.logDetectionTestRetryFailure(testName, endpointName, retryError);
      return { status: "rejected", reason: retryError };
    }
  }

  /**
   * Execute wrapped tests with concurrency control
   */
  private async executeTestsWithConcurrencyControl(
    wrappedTests: Array<() => Promise<PromiseSettledResult<void>>>,
  ): Promise<Array<PromiseSettledResult<void>>> {
    const testPromises = wrappedTests.map((wrappedTest) => wrappedTest());
    return await Promise.all(testPromises);
  }

  /**
   * Log detection test failure
   */
  private logDetectionTestFailure(
    testName: string,
    endpointName: string,
    error: unknown,
  ): void {
    logger.debug(`${testName} detection test failed`, {
      endpointName,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  /**
   * Log detection test retry failure
   */
  private logDetectionTestRetryFailure(
    testName: string,
    endpointName: string,
    error: unknown,
  ): void {
    logger.debug(`${testName} detection test retry failed`, {
      endpointName,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  /**
   * Log final detection results
   */
  private logDetectionResults(
    endpointName: string,
    testNames: string[],
    results: Array<PromiseSettledResult<void>>,
    rateLimitEncountered: boolean,
  ): void {
    logger.debug("Parallel detection tests completed", {
      endpointName,
      totalTests: testNames.length,
      successCount: results.filter((r) => r.status === "fulfilled").length,
      rateLimitEncountered,
    });
  }

  /**
   * Create a no-streaming capability result
   */
  private createNoStreamingCapability(
    modelType: StreamingCapability["modelType"],
    reason: string,
  ): StreamingCapability {
    logger.debug("No streaming capability detected", { modelType, reason });

    return {
      supported: false,
      protocol: "none",
      modelType,
      confidence: 0.9,
      metadata: {
        // reason property not supported in interface
        // Store reason in framework field for debugging
        framework: reason,
      },
    };
  }
}

/**
 * Create a detector instance with configuration
 */
export function createSageMakerDetector(
  config: SageMakerConfig,
): SageMakerDetector {
  return new SageMakerDetector(config);
}
