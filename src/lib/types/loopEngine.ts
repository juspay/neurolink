export type AgenticLoopToolCall = {
  id: string;
  name: string;
  args: Record<string, unknown>;
};

export type AgenticLoopUsage = {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
  reasoningTokens?: number;
};

export type AgenticLoopStepResult<TRaw = unknown> = {
  text: string;
  reasoning?: string;
  toolCalls: AgenticLoopToolCall[];
  usage: AgenticLoopUsage;
  /** Provider's own raw stop/finish-reason string, e.g. "tool_use", "MAX_TOKENS" */
  rawStopReason: string | undefined;
  /** Adapter-private accumulated response data needed by buildToolResultMessages
   *  (e.g. Anthropic's ordered content blocks, Gemini's rawResponseParts). */
  raw: TRaw;
};

export type AgenticLoopToolCallResult = AgenticLoopToolCall & {
  output: unknown;
  error?: string;
  permanentlyFailed?: boolean;
};

export type AgenticLoopStepRequest = { raw: unknown };

export type AgenticLoopReclaimResult<TConversation> = {
  conversation: TConversation;
};

export type AgenticLoopToolFailureBreaker = {
  maxRetries: number;
};

export type AgenticLoopAdapter<TConversation = unknown, TRaw = unknown> = {
  readonly providerLabel: string;
  readonly maxSteps: number;
  /** Pre-existing per-family flat timeout, used as createTurnClock's deadline default. */
  readonly defaultTurnTimeoutMs?: number;
  readonly stallTimeoutMs?: number;
  /** Set only for adapter instances whose client has the TOOL_NOT_FOUND strike breaker today: both Gemini adapters (AI Studio, Vertex+Gemini) AND the Vertex+Claude call to createAnthropicLoopAdapter — NOT the native-Anthropic call to that same factory, and not Bedrock. See Verified Fact 4. */
  readonly toolFailureBreaker?: AgenticLoopToolFailureBreaker;

  buildStepRequest(
    conversation: TConversation,
    step: number,
  ): AgenticLoopStepRequest;
  executeStep(
    request: AgenticLoopStepRequest,
    channel: { push(chunk: { content: string }): void },
    signal: AbortSignal,
  ): Promise<AgenticLoopStepResult<TRaw>>;
  buildToolResultMessages(
    conversation: TConversation,
    stepResult: AgenticLoopStepResult<TRaw>,
    toolResults: AgenticLoopToolCallResult[],
  ): TConversation;
  mapFinishReason(
    rawStopReason: string | undefined,
    hadToolCalls: boolean,
  ): string;

  /** Optional: in-turn context-budget reclaim, called once per step before buildStepRequest. */
  planReclaim?(
    conversation: TConversation,
    step: number,
  ): AgenticLoopReclaimResult<TConversation> | undefined;
  /** Optional: Vertex+Gemini-only single-retry-on-malformed-call. */
  isMalformedStep?(stepResult: AgenticLoopStepResult<TRaw>): boolean;
  buildMalformedRetryNote?(conversation: TConversation): TConversation;
};

export type AgenticLoopOptions = {
  tools?: Record<
    string,
    {
      execute?: (
        args: Record<string, unknown>,
        opts: unknown,
      ) => Promise<unknown>;
    }
  >;
  abortSignal?: AbortSignal;
};

export type AgenticLoopResult<TConversation> = {
  text: string;
  toolCalls: AgenticLoopToolCall[];
  toolExecutions: Array<{
    name: string;
    input: Record<string, unknown>;
    output: unknown;
  }>;
  usage: AgenticLoopUsage;
  finishReason: string;
  rawStopReason: string | undefined;
  conversation: TConversation;
};
