/**
 * Amazon SageMaker Provider - Main Export Module (Simplified)
 *
 * This module provides the main exports for SageMaker integration (Phase 1).
 * Full implementation will be completed in subsequent phases.
 */

// Import for internal use
import { AmazonSageMakerProvider } from "../amazonSagemaker.js";
import { checkSageMakerConfiguration } from "./config.js";

// Core provider exports
export { AmazonSageMakerProvider } from "../amazonSagemaker.js";
export {
  SageMakerRuntimeClient,
  createSageMakerRuntimeClient,
  testSageMakerConnectivity,
} from "./client.js";

// Configuration exports
export {
  getSageMakerConfig,
  getSageMakerModelConfig,
  getDefaultSageMakerEndpoint,
  getSageMakerModel,
  validateAWSCredentials,
  getConfigurationSummary,
  clearConfigurationCache,
  loadConfigurationFromFile,
  checkSageMakerConfiguration,
} from "./config.js";

// Error handling exports
export {
  SageMakerError,
  handleSageMakerError,
  createValidationError,
  createCredentialsError,
  createNetworkError,
  isRetryableError,
  getRetryDelay,
} from "./errors.js";

// Type exports
export type {
  SageMakerConfig,
  SageMakerModelConfig,
  SageMakerEndpointInfo,
  SageMakerUsage,
  InvokeEndpointParams,
  InvokeEndpointResponse,
  SageMakerStreamChunk,
  SageMakerToolCall,
  SageMakerToolResult,
  SageMakerGenerationOptions,
  SageMakerGenerationResponse,
  SageMakerErrorCode,
  SageMakerErrorInfo,
  BatchInferenceConfig,
  ModelDeploymentConfig,
  EndpointMetrics,
  CostEstimate,
} from "../../types/providers.js";

/**
 * Factory function to create a SageMaker Provider
 *
 * @param modelName - Optional model name
 * @param endpointName - Optional endpoint name
 * @returns AmazonSageMakerProvider instance
 */
export function createSageMakerProvider(
  modelName?: string,
  endpointName?: string,
): AmazonSageMakerProvider {
  return new AmazonSageMakerProvider(modelName, endpointName);
}

/**
 * Utility function to validate SageMaker setup (Simplified)
 *
 * @returns Setup validation result
 */
export async function validateSageMakerSetup(): Promise<{
  valid: boolean;
  issues: string[];
  recommendations: string[];
  configSummary: Record<string, unknown>;
}> {
  const issues: string[] = [];
  const recommendations: string[] = [];

  try {
    // Check configuration
    const configCheck = checkSageMakerConfiguration();

    if (!configCheck.configured) {
      issues.push(...configCheck.issues);
    }

    // Add general recommendations
    if (issues.length === 0) {
      recommendations.push("SageMaker basic configuration appears valid");
      recommendations.push("Full functionality will be available in Phase 2");
    }

    return {
      valid: issues.length === 0,
      issues,
      recommendations,
      configSummary: configCheck.summary,
    };
  } catch (error) {
    return {
      valid: false,
      issues: [
        `Setup validation failed: ${error instanceof Error ? error.message : String(error)}`,
      ],
      recommendations: ["Check your SageMaker configuration and try again"],
      configSummary: {},
    };
  }
}

/**
 * Default export for convenience
 */
export { AmazonSageMakerProvider as default };
