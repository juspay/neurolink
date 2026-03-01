/**
 * Context-specific error classes for budget and overflow scenarios.
 */

/**
 * Thrown when context exceeds model budget after all compaction stages,
 * preventing wasteful API calls to providers that will reject the request.
 */
export class ContextBudgetExceededError extends Error {
  public readonly estimatedTokens: number;
  public readonly availableTokens: number;
  public readonly stagesUsed: string[];
  public readonly breakdown: Record<string, number>;

  constructor(
    message: string,
    details: {
      estimatedTokens: number;
      availableTokens: number;
      stagesUsed: string[];
      breakdown: Record<string, number>;
    },
  ) {
    super(message);
    this.name = "ContextBudgetExceededError";
    this.estimatedTokens = details.estimatedTokens;
    this.availableTokens = details.availableTokens;
    this.stagesUsed = details.stagesUsed;
    this.breakdown = details.breakdown;
  }
}
