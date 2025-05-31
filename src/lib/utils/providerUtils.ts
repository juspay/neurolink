/**
 * Utility functions for AI provider management
 */

/**
 * Get the best available provider based on preferences and availability
 * @param requestedProvider - Optional preferred provider name
 * @returns The best provider name to use
 */
export function getBestProvider(requestedProvider?: string): string {
  // If a specific provider is requested, return it
  if (requestedProvider) {
    return requestedProvider;
  }

  // Default fallback order based on environment variables
  const providers = ['bedrock', 'vertex', 'openai'];

  // Check which providers have their required environment variables
  for (const provider of providers) {
    if (isProviderConfigured(provider)) {
      console.log(`[getBestProvider] Selected provider: ${provider}`);
      return provider;
    }
  }

  // Default to bedrock if nothing is configured
  console.warn('[getBestProvider] No providers configured, defaulting to bedrock');
  return 'bedrock';
}

/**
 * Check if a provider has the minimum required configuration
 * @param provider - Provider name to check
 * @returns True if the provider appears to be configured
 */
function isProviderConfigured(provider: string): boolean {
  switch (provider.toLowerCase()) {
    case 'bedrock':
    case 'amazon':
    case 'aws':
      return !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);

    case 'vertex':
    case 'google':
    case 'gemini':
      return !!(process.env.GOOGLE_VERTEX_PROJECT || process.env.GOOGLE_APPLICATION_CREDENTIALS);

    case 'openai':
    case 'gpt':
      return !!process.env.OPENAI_API_KEY;

    default:
      return false;
  }
}

/**
 * Get available provider names
 * @returns Array of available provider names
 */
export function getAvailableProviders(): string[] {
  return ['bedrock', 'vertex', 'openai'];
}

/**
 * Validate provider name
 * @param provider - Provider name to validate
 * @returns True if provider name is valid
 */
export function isValidProvider(provider: string): boolean {
  return getAvailableProviders().includes(provider.toLowerCase());
}
