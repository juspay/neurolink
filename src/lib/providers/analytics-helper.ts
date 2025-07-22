/**
 * Enhanced Analytics Helper for All Providers
 * Ensures consistent analytics data format across providers
 * Integrates with Universal Evaluation System
 */

export interface AnalyticsData {
  provider: string;
  model: string;
  tokens: {
    input: number;
    output: number;
    total: number;
  };
  cost?: number;
  responseTime: number;
  timestamp: string;
  context?: Record<string, any>;
  // Enhanced evaluation integration
  evaluation?: {
    relevanceScore: number;
    accuracyScore: number;
    completenessScore: number;
    overall: number;
    evaluationProvider?: string;
    evaluationTime?: number;
    evaluationAttempt?: number;
  };
  // Enhanced cost tracking
  costDetails?: {
    inputCost: number;
    outputCost: number;
    evaluationCost?: number;
    totalCost: number;
    currency: string;
  };
}

/**
 * Create standardized analytics data from provider response
 */
export function createAnalytics(
  provider: string,
  model: string,
  result: any,
  responseTime: number,
  context?: Record<string, any>,
): AnalyticsData {
  // Handle different token usage formats across providers
  const tokenUsage = result.usage || {};

  // Standardize token field names across providers
  const inputTokens =
    tokenUsage.promptTokens ||
    tokenUsage.input_tokens ||
    tokenUsage.inputTokens ||
    0;
  const outputTokens =
    tokenUsage.completionTokens ||
    tokenUsage.output_tokens ||
    tokenUsage.outputTokens ||
    0;
  const totalTokens =
    tokenUsage.totalTokens ||
    tokenUsage.total_tokens ||
    inputTokens + outputTokens ||
    0;

  // Simple cost estimation for synchronous use
  const estimatedCost = totalTokens > 0 ? totalTokens * 0.00001 : 0;

  return {
    provider,
    model,
    tokens: {
      input: inputTokens,
      output: outputTokens,
      total: totalTokens,
    },
    cost: estimatedCost,
    responseTime,
    timestamp: new Date().toISOString(),
    context,
  };
}

/**
 * Create enhanced analytics data with accurate cost calculations (async version)
 */
export async function createEnhancedAnalytics(
  provider: string,
  model: string,
  result: any,
  responseTime: number,
  context?: Record<string, any>,
): Promise<AnalyticsData> {
  // Handle different token usage formats across providers
  const tokenUsage = result.usage || {};

  // Standardize token field names across providers
  const inputTokens =
    tokenUsage.promptTokens ||
    tokenUsage.input_tokens ||
    tokenUsage.inputTokens ||
    0;
  const outputTokens =
    tokenUsage.completionTokens ||
    tokenUsage.output_tokens ||
    tokenUsage.outputTokens ||
    0;
  const totalTokens =
    tokenUsage.totalTokens ||
    tokenUsage.total_tokens ||
    inputTokens + outputTokens ||
    0;

  // Enhanced cost calculation using provider configuration
  const { costDetails, estimatedCost } = await calculateEnhancedCost(
    provider,
    inputTokens,
    outputTokens,
  );

  return {
    provider,
    model,
    tokens: {
      input: inputTokens,
      output: outputTokens,
      total: totalTokens,
    },
    cost: estimatedCost,
    responseTime,
    timestamp: new Date().toISOString(),
    context,
    costDetails,
  };
}

/**
 * Calculate enhanced cost details using provider configurations
 */
export async function calculateEnhancedCost(
  provider: string,
  inputTokens: number,
  outputTokens: number,
): Promise<{ costDetails: any; estimatedCost: number }> {
  try {
    // Import provider configuration dynamically
    const { getProviderConfig } = await import(
      "../core/evaluation-providers.js"
    );
    const providerConfig = getProviderConfig(provider);

    if (!providerConfig?.costPerToken) {
      // Fallback to rough estimation
      const estimatedCost = (inputTokens + outputTokens) * 0.00001;
      return {
        costDetails: {
          inputCost: inputTokens * 0.00001,
          outputCost: outputTokens * 0.00001,
          totalCost: estimatedCost,
          currency: "USD",
        },
        estimatedCost,
      };
    }

    // Use accurate provider costs
    const inputCost = inputTokens * providerConfig.costPerToken.input;
    const outputCost = outputTokens * providerConfig.costPerToken.output;
    const totalCost = inputCost + outputCost;

    return {
      costDetails: {
        inputCost,
        outputCost,
        totalCost,
        currency: "USD",
      },
      estimatedCost: totalCost,
    };
  } catch (error) {
    // Fallback on error
    const estimatedCost = (inputTokens + outputTokens) * 0.00001;
    return {
      costDetails: {
        inputCost: inputTokens * 0.00001,
        outputCost: outputTokens * 0.00001,
        totalCost: estimatedCost,
        currency: "USD",
      },
      estimatedCost,
    };
  }
}

/**
 * Enhance analytics with evaluation data
 */
export function enhanceAnalyticsWithEvaluation(
  analytics: AnalyticsData,
  evaluationResult: any,
): AnalyticsData {
  return {
    ...analytics,
    evaluation: {
      // FIX: Use correct field names and ensure minimum score of 1
      relevanceScore:
        evaluationResult.relevance || evaluationResult.relevanceScore || 1,
      accuracyScore:
        evaluationResult.accuracy || evaluationResult.accuracyScore || 1,
      completenessScore:
        evaluationResult.completeness ||
        evaluationResult.completenessScore ||
        1,
      overall: evaluationResult.overall || 1,
      evaluationProvider: evaluationResult.evaluationProvider,
      evaluationTime: evaluationResult.evaluationTime,
      evaluationAttempt: evaluationResult.evaluationAttempt,
    },
    // Add evaluation cost if available
    costDetails: analytics.costDetails
      ? {
          ...analytics.costDetails,
          evaluationCost: evaluationResult.evaluationConfig?.costEstimate || 0,
          totalCost:
            (analytics.costDetails.totalCost || 0) +
            (evaluationResult.evaluationConfig?.costEstimate || 0),
        }
      : undefined,
  };
}
