/**
 * Client SDK Type Definitions
 *
 * Comprehensive type definitions for the NeuroLink client SDK system.
 * These types enable type-safe API access from JavaScript/TypeScript applications
 * and React applications with hooks for agents, workflows, and real-time streaming.
 *
 * @module @neurolink/client/types
 */

import type { JsonValue, JsonObject, UnknownRecord } from "./common.js";
import type { StreamToolCall, StreamToolResult } from "./stream.js";
import type { StreamResult } from "./stream.js";

// =============================================================================
// Core Client Configuration Types
// =============================================================================

/**
 * Client configuration options for initializing the NeuroLink client
 */
export type ClientConfig = {
  /** Base URL for the NeuroLink API */
  baseUrl: string;
  /** API key for authentication (header-based) */
  apiKey?: string;
  /** Bearer token for authentication */
  token?: string;
  /** Default timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Default headers to include in all requests */
  headers?: Record<string, string>;
  /** Retry configuration for failed requests */
  retry?: ClientRetryConfig;
  /** Enable debug logging */
  debug?: boolean;
  /** Custom fetch implementation (for environments without native fetch) */
  fetch?: typeof fetch;
  /** WebSocket URL override (defaults to ws(s) version of baseUrl) */
  wsUrl?: string;
};

/**
 * Retry configuration for failed requests
 */
export type ClientRetryConfig = {
  /** Maximum number of retry attempts (default: 3) */
  maxAttempts: number;
  /** Initial delay in milliseconds before first retry (default: 1000) */
  initialDelayMs: number;
  /** Maximum delay in milliseconds between retries (default: 10000) */
  maxDelayMs: number;
  /** Backoff multiplier for exponential backoff (default: 2) */
  backoffMultiplier: number;
  /** HTTP status codes to retry on (default: [408, 429, 500, 502, 503, 504]) */
  retryableStatusCodes?: number[];
  /** Whether to retry on network errors (default: true) */
  retryOnNetworkError?: boolean;
};

/**
 * Request options that can be passed to individual API calls
 */
export type ClientRequestOptions = {
  /** Request timeout override in milliseconds */
  timeout?: number;
  /** Signal for request cancellation */
  signal?: AbortSignal;
  /** Additional headers for this request */
  headers?: Record<string, string>;
  /** Skip retry for this request */
  skipRetry?: boolean;
};

// =============================================================================
// API Response Types
// =============================================================================

/**
 * Response wrapper with metadata for all API responses
 */
export type ClientApiResponse<T> = {
  /** Response data */
  data: T;
  /** HTTP status code */
  status: number;
  /** Response headers */
  headers: Record<string, string>;
  /** Request duration in milliseconds */
  duration: number;
  /** Request ID for tracing */
  requestId?: string;
};

/**
 * Error response from API
 */
export type ClientApiError = {
  /** Error code (e.g., "RATE_LIMIT_EXCEEDED", "INVALID_REQUEST") */
  code: string;
  /** Human-readable error message */
  message: string;
  /** HTTP status code */
  status: number;
  /** Additional error details */
  details?: JsonObject;
  /** Whether the error is retryable */
  retryable?: boolean;
  /** Request ID for tracing */
  requestId?: string;
};

/**
 * Provider status information
 */
export type ClientProviderStatus = {
  /** Provider name */
  name: string;
  /** Provider availability status */
  status: "available" | "degraded" | "unavailable";
  /** Available models for this provider */
  models: string[];
  /** Provider capabilities */
  capabilities?: {
    streaming: boolean;
    tools: boolean;
    vision: boolean;
    audio: boolean;
  };
  /** Last health check timestamp */
  lastChecked?: number;
};

// =============================================================================
// Streaming Types
// =============================================================================

/**
 * Stream event types for real-time communication
 */
export type ClientStreamEventType =
  | "text"
  | "tool-call"
  | "tool-result"
  | "error"
  | "done"
  | "metadata"
  | "audio"
  | "thinking";

/**
 * Stream event from SSE/WebSocket
 */
export type ClientStreamEvent = {
  /** Event type */
  type: ClientStreamEventType;
  /** Text content (for text events) */
  content?: string;
  /** Tool call data (for tool-call events) */
  toolCall?: StreamToolCall;
  /** Tool result data (for tool-result events) */
  toolResult?: StreamToolResult;
  /** Error data (for error events) */
  error?: ClientApiError;
  /** Metadata (for metadata events) */
  metadata?: JsonObject;
  /** Audio data (for audio events) */
  audio?: {
    data: string; // Base64 encoded audio
    format: string;
    sampleRate?: number;
  };
  /** Thinking/reasoning content (for thinking events) */
  thinking?: string;
  /** Event timestamp */
  timestamp: number;
};

/**
 * Streaming callback handlers
 */
export type ClientStreamCallbacks = {
  /** Called for each text chunk */
  onText?: (text: string) => void;
  /** Called for each tool call */
  onToolCall?: (toolCall: StreamToolCall) => void;
  /** Called for each tool result */
  onToolResult?: (toolResult: StreamToolResult) => void;
  /** Called on stream error */
  onError?: (error: ClientApiError) => void;
  /** Called when stream completes */
  onDone?: (result: ClientStreamResult) => void;
  /** Called for metadata updates */
  onMetadata?: (metadata: JsonObject) => void;
  /** Called for audio chunks */
  onAudio?: (audio: { data: string; format: string }) => void;
  /** Called for thinking/reasoning output */
  onThinking?: (thinking: string) => void;
};

/**
 * Stream result with full response data
 */
export type ClientStreamResult = {
  /** Full accumulated text content */
  content: string;
  /** All tool calls made */
  toolCalls?: StreamToolCall[];
  /** All tool results */
  toolResults?: StreamToolResult[];
  /** Token usage information */
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  /** Finish reason */
  finishReason?: string;
  /** Response metadata */
  metadata?: JsonObject;
};

// =============================================================================
// Generation Types
// =============================================================================

/**
 * Generate request options (client-side version)
 */
export type ClientGenerateRequestOptions = {
  /** Input for generation */
  input: {
    text: string;
    images?: string[]; // URLs or base64
    files?: string[]; // URLs or base64
  };
  /** Provider to use */
  provider?: string;
  /** Model to use */
  model?: string;
  /** Temperature for generation */
  temperature?: number;
  /** Maximum tokens to generate */
  maxTokens?: number;
  /** System prompt */
  systemPrompt?: string;
  /** Enable tool usage */
  enableTools?: boolean;
  /** Specific tools to enable */
  tools?: string[];
  /** Context data */
  context?: UnknownRecord;
};

/**
 * Generate response (client-side version)
 */
export type ClientGenerateResponse = {
  /** Generated content */
  content: string;
  /** Provider used */
  provider?: string;
  /** Model used */
  model?: string;
  /** Token usage */
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  /** Tool calls made */
  toolCalls?: StreamToolCall[];
  /** Tool results */
  toolResults?: StreamToolResult[];
  /** Finish reason */
  finishReason?: string;
  /** Response metadata */
  metadata?: JsonObject;
};

/**
 * Stream request options (client-side version)
 */
export type ClientStreamRequestOptions = ClientGenerateRequestOptions & {
  /** Enable streaming */
  stream: true;
};

// =============================================================================
// Agent Types
// =============================================================================

/**
 * Agent execution options
 */
export type ClientAgentExecuteOptions = {
  /** Agent ID */
  agentId: string;
  /** Input message */
  input: string;
  /** Session ID for conversation continuity */
  sessionId?: string;
  /** User context */
  context?: UnknownRecord;
  /** Stream the response */
  stream?: boolean;
  /** Tool execution options */
  tools?: {
    /** Enabled tools */
    enabled?: string[];
    /** Disabled tools */
    disabled?: string[];
    /** Tool execution mode */
    mode?: "auto" | "manual" | "confirm";
  };
};

/**
 * Agent execution result
 */
export type ClientAgentExecuteResult = {
  /** Response content */
  content: string;
  /** Agent ID */
  agentId: string;
  /** Session ID */
  sessionId: string;
  /** Tools used */
  toolsUsed?: string[];
  /** Tool executions */
  toolExecutions?: Array<{
    name: string;
    input: UnknownRecord;
    output: unknown;
    duration: number;
  }>;
  /** Token usage */
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  /** Response metadata */
  metadata?: JsonObject;
};

/**
 * Agent information
 */
export type ClientAgentInfo = {
  /** Agent ID */
  id: string;
  /** Agent name */
  name: string;
  /** Agent description */
  description: string;
  /** Available tools for this agent */
  tools?: string[];
  /** Agent capabilities */
  capabilities?: {
    streaming: boolean;
    multimodal: boolean;
    memory: boolean;
  };
};

// =============================================================================
// Workflow Types
// =============================================================================

/**
 * Workflow execution options
 */
export type ClientWorkflowExecuteOptions = {
  /** Workflow ID */
  workflowId: string;
  /** Workflow input data */
  input: UnknownRecord;
  /** Session ID for state persistence */
  sessionId?: string;
  /** Resume from a suspended state */
  resumeToken?: string;
  /** Callback URL for async completion */
  callbackUrl?: string;
};

/**
 * Workflow execution result
 */
export type ClientWorkflowExecuteResult = {
  /** Workflow run ID */
  runId: string;
  /** Workflow ID */
  workflowId: string;
  /** Execution status */
  status: "running" | "completed" | "failed" | "suspended";
  /** Output data (if completed) */
  output?: UnknownRecord;
  /** Error information (if failed) */
  error?: ClientApiError;
  /** Suspend token (if suspended) */
  suspendToken?: string;
  /** Step results */
  steps?: Array<{
    stepId: string;
    status: "completed" | "failed" | "skipped";
    output?: unknown;
    duration: number;
  }>;
  /** Total execution duration */
  duration?: number;
};

/**
 * Workflow information
 */
export type ClientWorkflowInfo = {
  /** Workflow ID */
  id: string;
  /** Workflow name */
  name: string;
  /** Workflow description */
  description: string;
  /** Workflow version */
  version: string;
  /** Steps in the workflow */
  steps?: Array<{
    id: string;
    name: string;
    type: string;
  }>;
};

// =============================================================================
// Tool Types
// =============================================================================

/**
 * Tool information for client use
 */
export type ClientToolInfo = {
  /** Tool name */
  name: string;
  /** Tool description */
  description: string;
  /** Tool category */
  category?: string;
  /** Server ID */
  serverId: string;
  /** Input schema */
  inputSchema: JsonObject;
  /** Whether tool requires confirmation */
  requiresConfirmation?: boolean;
};

// =============================================================================
// ClientMiddleware Types
// =============================================================================

/**
 * ClientMiddleware function type
 */
export type ClientMiddleware = (
  request: ClientMiddlewareRequest,
  next: () => Promise<ClientMiddlewareResponse>,
) => Promise<ClientMiddlewareResponse>;

/**
 * ClientMiddleware request object
 */
export type ClientMiddlewareRequest = {
  /** Request URL */
  url: string;
  /** HTTP method */
  method: string;
  /** Request headers */
  headers: Record<string, string>;
  /** Request body */
  body?: unknown;
  /** ClientMiddleware context */
  context: ClientMiddlewareContext;
};

/**
 * ClientMiddleware response object
 */
export type ClientMiddlewareResponse = {
  /** HTTP status code */
  status: number;
  /** Response headers */
  headers: Record<string, string>;
  /** Response body */
  body: unknown;
  /** ClientMiddleware context */
  context: ClientMiddlewareContext;
};

/**
 * ClientMiddleware context for passing data between middleware
 */
export type ClientMiddlewareContext = {
  /** Request start time */
  startTime: number;
  /** Request ID */
  requestId: string;
  /** Retry count */
  retryCount: number;
  /** Additional context data */
  [key: string]: unknown;
};

// =============================================================================
// React Provider Types
// =============================================================================

/**
 * Props for the NeuroLinkProvider React component.
 *
 * `children` is typed as `unknown` so this module stays React-agnostic;
 * the provider component in reactHooks.tsx narrows it to `ReactNode`.
 */
export type NeuroLinkProviderProps = {
  /** Client configuration */
  config: ClientConfig;
  /** Child components (ReactNode at runtime) */
  children: unknown;
};

// =============================================================================
// React Hook Types
// =============================================================================

/**
 * Chat message for useChat hook
 */
export type ClientChatMessage = {
  /** Unique message ID */
  id: string;
  /** Message role */
  role: "user" | "assistant" | "system" | "tool";
  /** Message content */
  content: string;
  /** Tool calls in this message */
  toolCalls?: StreamToolCall[];
  /** Tool results in this message */
  toolResults?: StreamToolResult[];
  /** Message timestamp */
  createdAt: Date;
  /** Additional metadata */
  metadata?: JsonObject;
};

/**
 * useChat hook options
 */
export type UseChatOptions = {
  /** API endpoint for chat */
  api?: string;
  /** Agent ID to use */
  agentId?: string;
  /** Initial messages */
  initialMessages?: ClientChatMessage[];
  /** Session ID for conversation continuity */
  sessionId?: string;
  /** System prompt */
  systemPrompt?: string;
  /** Called when response starts */
  onResponse?: (response: Response) => void | Promise<void>;
  /** Called when response finishes */
  onFinish?: (message: ClientChatMessage) => void;
  /** Called on error */
  onError?: (error: ClientApiError) => void;
  /** Called for each tool call */
  onToolCall?: (toolCall: StreamToolCall) => void;
  /** Request body customization */
  body?: UnknownRecord;
  /** Request headers */
  headers?: Record<string, string>;
  /** Credentials mode */
  credentials?: RequestCredentials;
  /** Generate message ID */
  generateId?: () => string;
};

/**
 * useChat hook return type
 */
export type UseChatReturn = {
  /** Chat messages */
  messages: ClientChatMessage[];
  /** Current input value */
  input: string;
  /** Set input value */
  setInput: (input: string) => void;
  /** Handle input change */
  handleInputChange: (e: { target: { value: string } }) => void;
  /** Submit message */
  handleSubmit: (
    e?: { preventDefault?: () => void },
    options?: { data?: UnknownRecord },
  ) => void;
  /** Append a message */
  append: (
    message: Omit<ClientChatMessage, "id" | "createdAt">,
  ) => Promise<string | null | undefined>;
  /** Reload the last message */
  reload: () => Promise<string | null | undefined>;
  /** Stop generation */
  stop: () => void;
  /** Set messages directly */
  setMessages: (messages: ClientChatMessage[]) => void;
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: ClientApiError | null;
  /** Clear error */
  clearError: () => void;
  /** Current tool calls being executed */
  toolCalls: StreamToolCall[];
};

/**
 * useAgent hook options
 */
export type UseAgentOptions = {
  /** Agent ID */
  agentId: string;
  /** Initial session ID */
  sessionId?: string;
  /** Called on agent response */
  onResponse?: (result: ClientAgentExecuteResult) => void;
  /** Called on error */
  onError?: (error: ClientApiError) => void;
  /** Called when tool is called */
  onToolCall?: (toolCall: StreamToolCall) => void;
  /** Auto-execute on mount with initial input */
  initialInput?: string;
};

/**
 * useAgent hook return type
 */
export type UseAgentReturn = {
  /** Execute the agent */
  execute: (
    input: string,
    options?: Partial<ClientAgentExecuteOptions>,
  ) => Promise<ClientAgentExecuteResult>;
  /** Stream execution */
  stream: (input: string, callbacks?: ClientStreamCallbacks) => Promise<void>;
  /** Current session ID */
  sessionId: string | null;
  /** Set session ID */
  setSessionId: (sessionId: string | null) => void;
  /** Loading state */
  isLoading: boolean;
  /** Streaming state */
  isStreaming: boolean;
  /** Last result */
  result: ClientAgentExecuteResult | null;
  /** Error state */
  error: ClientApiError | null;
  /** Clear error */
  clearError: () => void;
  /** Abort current execution */
  abort: () => void;
};

/**
 * useWorkflow hook options
 */
export type UseWorkflowOptions = {
  /** Workflow ID */
  workflowId: string;
  /** Called on workflow completion */
  onComplete?: (result: ClientWorkflowExecuteResult) => void;
  /** Called on workflow error */
  onError?: (error: ClientApiError) => void;
  /** Called on step completion */
  onStepComplete?: (step: {
    stepId: string;
    status: string;
    output?: unknown;
  }) => void;
  /** Poll interval for status updates (ms) */
  pollInterval?: number;
};

/**
 * useWorkflow hook return type
 */
export type UseWorkflowReturn = {
  /** Execute the workflow */
  execute: (
    input: UnknownRecord,
    options?: Partial<ClientWorkflowExecuteOptions>,
  ) => Promise<ClientWorkflowExecuteResult>;
  /** Resume a suspended workflow */
  resume: (
    resumeToken: string,
    resumeData?: UnknownRecord,
  ) => Promise<ClientWorkflowExecuteResult>;
  /** Get workflow status */
  getStatus: (runId: string) => Promise<ClientWorkflowExecuteResult>;
  /** Cancel workflow execution */
  cancel: (runId: string) => Promise<void>;
  /** Current run ID */
  runId: string | null;
  /** Execution status */
  status: ClientWorkflowExecuteResult["status"] | null;
  /** Loading state */
  isLoading: boolean;
  /** Last result */
  result: ClientWorkflowExecuteResult | null;
  /** Error state */
  error: ClientApiError | null;
  /** Clear error */
  clearError: () => void;
};

/**
 * useVoice hook options
 */
export type UseVoiceOptions = {
  /** Voice for TTS */
  voice?: string;
  /** Language */
  language?: string;
  /** Auto-play responses */
  autoPlay?: boolean;
  /** Called when speech starts */
  onSpeechStart?: () => void;
  /** Called when speech ends */
  onSpeechEnd?: () => void;
  /** Called on error */
  onError?: (error: ClientApiError) => void;
  /** API endpoint for voice */
  api?: string;
  /** Enable speech recognition */
  enableSpeechRecognition?: boolean;
};

/**
 * useVoice hook return type
 */
export type UseVoiceReturn = {
  /** Start listening for voice input */
  startListening: () => void;
  /** Stop listening */
  stopListening: () => void;
  /** Speak text */
  speak: (text: string) => Promise<void>;
  /** Stop speaking */
  stopSpeaking: () => void;
  /** Submit voice input */
  submit: (text: string) => Promise<string>;
  /** Whether currently listening */
  isListening: boolean;
  /** Whether currently speaking */
  isSpeaking: boolean;
  /** Whether processing */
  isProcessing: boolean;
  /** Current transcript */
  transcript: string;
  /** Last response */
  response: string | null;
  /** Error state */
  error: ClientApiError | null;
  /** Supported by browser */
  isSupported: boolean;
};

/**
 * useStream hook options
 */
export type UseStreamOptions = {
  /** API endpoint */
  api?: string;
  /** Stream callbacks */
  callbacks?: ClientStreamCallbacks;
};

/**
 * useStream hook return type
 */
export type UseStreamReturn = {
  /** Start streaming */
  start: (options: { prompt: string } & UnknownRecord) => void;
  /** Stop streaming */
  stop: () => void;
  /** Current text content */
  text: string;
  /** All events received */
  events: ClientStreamEvent[];
  /** Streaming state */
  isStreaming: boolean;
  /** Error state */
  error: ClientApiError | null;
};

/**
 * useTools hook options
 */
export type UseToolsOptions = {
  /** Filter tools by category */
  category?: string;
  /** Filter tools by server */
  serverId?: string;
  /** Auto-refresh interval (ms) */
  refreshInterval?: number;
};

/**
 * useTools hook return type
 */
export type UseToolsReturn = {
  /** Available tools */
  tools: ClientToolInfo[];
  /** Execute a tool */
  execute: (toolName: string, params: UnknownRecord) => Promise<unknown>;
  /** Refresh tool list */
  refresh: () => Promise<void>;
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: ClientApiError | null;
};

// =============================================================================
// AI SDK Adapter Types
// =============================================================================

/**
 * AI SDK Language Model interface (Vercel AI SDK compatible)
 */
export type ClientLanguageModel = {
  /** Model specification string */
  modelId: string;
  /** Provider name */
  provider: string;
  /** Generate non-streaming response */
  doGenerate: (
    options: ClientLanguageModelCallOptions,
  ) => Promise<ClientLanguageModelResponse>;
  /** Generate streaming response */
  doStream: (
    options: ClientLanguageModelCallOptions,
  ) => Promise<ClientLanguageModelStreamResponse>;
};

/**
 * Language model call options
 */
export type ClientLanguageModelCallOptions = {
  /** Input prompt */
  prompt: string;
  /** System prompt */
  system?: string;
  /** Messages for conversation */
  messages?: Array<{
    role: "user" | "assistant" | "system";
    content: string;
  }>;
  /** Temperature */
  temperature?: number;
  /** Maximum tokens */
  maxTokens?: number;
  /** Stop sequences */
  stopSequences?: string[];
  /** Abort signal */
  abortSignal?: AbortSignal;
};

/**
 * Language model response
 */
export type ClientLanguageModelResponse = {
  /** Generated text */
  text: string;
  /** Finish reason */
  finishReason:
    | "stop"
    | "length"
    | "tool-calls"
    | "content-filter"
    | "error"
    | "other";
  /** Usage information */
  usage: {
    promptTokens: number;
    completionTokens: number;
  };
  /** Raw response */
  rawResponse?: unknown;
};

/**
 * Language model stream response
 */
export type ClientLanguageModelStreamResponse = {
  /** Stream of text deltas */
  stream: AsyncIterable<{
    type: "text-delta" | "finish";
    textDelta?: string;
    finishReason?: string;
    usage?: {
      promptTokens: number;
      completionTokens: number;
    };
  }>;
  /** Raw response */
  rawResponse?: unknown;
};

/**
 * NeuroLink provider options for AI SDK adapter
 */
export type NeuroLinkProviderOptions = {
  /** Base URL for the NeuroLink API */
  baseUrl: string;
  /** API key for authentication */
  apiKey?: string;
  /** Bearer token for authentication */
  token?: string;
  /** Default model to use */
  defaultModel?: string;
  /** Default provider */
  defaultProvider?: string;
  /** Custom headers */
  headers?: Record<string, string>;
};

/**
 * Model creation options for AI SDK adapter
 */
export type ClientModelOptions = {
  /** Model ID */
  modelId?: string;
  /** Provider name */
  provider?: string;
  /** Temperature */
  temperature?: number;
  /** Maximum tokens */
  maxTokens?: number;
};

// =============================================================================
// WebSocket Types
// =============================================================================

/**
 * WebSocket connection options
 */
export type ClientWebSocketOptions = {
  /** WebSocket URL */
  url: string;
  /** Protocols */
  protocols?: string | string[];
  /** Auto-reconnect on disconnect */
  autoReconnect?: boolean;
  /** Reconnect interval in ms */
  reconnectInterval?: number;
  /** Maximum reconnect attempts */
  maxReconnectAttempts?: number;
  /** Heartbeat interval in ms */
  heartbeatInterval?: number;
};

/**
 * WebSocket connection state
 */
export type ClientWebSocketState =
  | "connecting"
  | "connected"
  | "disconnecting"
  | "disconnected"
  | "reconnecting";

/**
 * WebSocket message handler
 */
export type ClientWebSocketMessageHandler = (data: unknown) => void;

// =============================================================================
// Dedicated WebSocket Client Types (wsClient.ts)
// =============================================================================

/**
 * Connection state for the dedicated NeuroLinkWebSocket client
 */
export type WSClientState =
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";

/**
 * Configuration for the dedicated NeuroLinkWebSocket client
 */
export type WSClientConfig = ClientConfig & {
  /** Auto-reconnect on disconnect (default: true) */
  autoReconnect?: boolean;
  /** Maximum reconnection attempts (default: 10) */
  maxReconnectAttempts?: number;
  /** Initial reconnection delay in ms (default: 1000) */
  reconnectDelay?: number;
  /** Maximum reconnection delay in ms (default: 30000) */
  maxReconnectDelay?: number;
  /** Heartbeat interval in ms (default: 30000) */
  heartbeatInterval?: number;
  /** Message queue size when disconnected (default: 100) */
  queueSize?: number;
};

/**
 * WebSocket message for the dedicated NeuroLinkWebSocket client
 */
export type WSClientMessage = {
  type: "subscribe" | "unsubscribe" | "message" | "ping" | "pong";
  channel?: string;
  payload?: unknown;
  id?: string;
};

/**
 * Event handlers for the dedicated NeuroLinkWebSocket client
 */
export type WSClientEventHandlers = {
  onOpen?: () => void;
  onClose?: (code: number, reason: string) => void;
  onError?: (error: Error) => void;
  onMessage?: (event: ClientStreamEvent) => void;
  onReconnect?: (attempt: number) => void;
  onStateChange?: (state: WSClientState) => void;
};

// =============================================================================
// Voice Types (Browser APIs)
// =============================================================================

/**
 * Speech recognition result
 */
export type ClientSpeechRecognitionResult = {
  /** Transcript text */
  transcript: string;
  /** Confidence score (0-1) */
  confidence: number;
  /** Whether this is the final result */
  isFinal: boolean;
};

/**
 * Speech synthesis options
 */
export type ClientSpeechSynthesisOptions = {
  /** Voice to use */
  voice?: string;
  /** Speaking rate (0.1-10) */
  rate?: number;
  /** Pitch (0-2) */
  pitch?: number;
  /** Volume (0-1) */
  volume?: number;
  /** Language code */
  lang?: string;
};

// =============================================================================
// Authentication Types
// =============================================================================

/**
 * Authentication configuration options
 */
export type ClientAuthConfig = {
  /** API key for header-based authentication */
  apiKey?: string;
  /** Bearer token for JWT/OAuth authentication */
  token?: string;
  /** Token refresh function for automatic token renewal */
  refreshToken?: () => Promise<string>;
  /** Token expiry time in milliseconds */
  tokenExpiresAt?: number;
  /** Buffer time before expiry to refresh token (default: 60000ms) */
  refreshBufferMs?: number;
  /** Custom authorization header name (default: "Authorization") */
  headerName?: string;
  /** Custom API key header name (default: "X-API-Key") */
  apiKeyHeaderName?: string;
};

/**
 * OAuth2 client credentials configuration
 */
export type ClientOAuth2Config = {
  /** Token endpoint URL */
  tokenUrl: string;
  /** OAuth2 client ID */
  clientId: string;
  /** OAuth2 client secret */
  clientSecret: string;
  /** OAuth2 scope (optional) */
  scope?: string;
  /** Audience for the token (optional) */
  audience?: string;
};

/**
 * Token refresh result
 */
export type ClientTokenRefreshResult = {
  /** Access token */
  accessToken: string;
  /** Token expiry time in seconds */
  expiresIn: number;
  /** Token type (usually "Bearer") */
  tokenType: string;
  /** Refresh token (if provided) */
  refreshToken?: string;
  /** OAuth2 scope (if provided) */
  scope?: string;
};

// =============================================================================
// Browser Web Speech API Types
// =============================================================================

/**
 * Web Speech API event map for SpeechRecognition
 */
export type SpeechRecognitionEventMap = {
  audioend: Event;
  audiostart: Event;
  end: Event;
  error: SpeechRecognitionErrorEventInternal;
  nomatch: SpeechRecognitionEventInternal;
  result: SpeechRecognitionEventInternal;
  soundend: Event;
  soundstart: Event;
  speechend: Event;
  speechstart: Event;
  start: Event;
};

/**
 * Internal speech recognition event with results
 */
export type SpeechRecognitionEventInternal = Event & {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
};

/**
 * Internal speech recognition error event
 */
export type SpeechRecognitionErrorEventInternal = Event & {
  readonly error: string;
  readonly message: string;
};

/**
 * Internal speech recognition interface for browser Web Speech API
 */
export type SpeechRecognitionInternal = EventTarget & {
  continuous: boolean;
  grammars: SpeechGrammarList;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onaudioend: ((this: SpeechRecognitionInternal, ev: Event) => unknown) | null;
  onaudiostart:
    | ((this: SpeechRecognitionInternal, ev: Event) => unknown)
    | null;
  onend: ((this: SpeechRecognitionInternal, ev: Event) => unknown) | null;
  onerror:
    | ((
        this: SpeechRecognitionInternal,
        ev: SpeechRecognitionErrorEventInternal,
      ) => unknown)
    | null;
  onnomatch:
    | ((
        this: SpeechRecognitionInternal,
        ev: SpeechRecognitionEventInternal,
      ) => unknown)
    | null;
  onresult:
    | ((
        this: SpeechRecognitionInternal,
        ev: SpeechRecognitionEventInternal,
      ) => unknown)
    | null;
  onsoundend: ((this: SpeechRecognitionInternal, ev: Event) => unknown) | null;
  onsoundstart:
    | ((this: SpeechRecognitionInternal, ev: Event) => unknown)
    | null;
  onspeechend: ((this: SpeechRecognitionInternal, ev: Event) => unknown) | null;
  onspeechstart:
    | ((this: SpeechRecognitionInternal, ev: Event) => unknown)
    | null;
  onstart: ((this: SpeechRecognitionInternal, ev: Event) => unknown) | null;
  abort(): void;
  start(): void;
  stop(): void;
};

/**
 * Speech grammar list interface
 */
export type SpeechGrammarList = {
  readonly length: number;
  addFromString(string: string, weight?: number): void;
  addFromURI(src: string, weight?: number): void;
  item(index: number): SpeechGrammar;
  [index: number]: SpeechGrammar;
};

/**
 * Speech grammar interface
 */
export type SpeechGrammar = {
  src: string;
  weight: number;
};

// =============================================================================
// Utility Types
// =============================================================================

/**
 * Re-export common types for convenience
 */
export type { JsonValue, JsonObject, UnknownRecord };
export type { StreamToolCall, StreamToolResult };

// =============================================================================
// ERROR CODE TYPE (mirrors ErrorCode const from client/errors.ts)
// =============================================================================

/**
 * Standard error codes for NeuroLink API errors.
 * Mirrors the `ErrorCode` const object in client/errors.ts — keep in sync.
 */
export type ErrorCodeType =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "METHOD_NOT_ALLOWED"
  | "CONFLICT"
  | "PAYLOAD_TOO_LARGE"
  | "RATE_LIMITED"
  | "INVALID_REQUEST"
  | "VALIDATION_ERROR"
  | "INTERNAL_ERROR"
  | "SERVICE_UNAVAILABLE"
  | "GATEWAY_TIMEOUT"
  | "BAD_GATEWAY"
  | "NETWORK_ERROR"
  | "TIMEOUT"
  | "CONNECTION_REFUSED"
  | "DNS_ERROR"
  | "CONFIGURATION_ERROR"
  | "SERIALIZATION_ERROR"
  | "STREAM_ERROR"
  | "ABORT_ERROR"
  | "PROVIDER_ERROR"
  | "MODEL_NOT_FOUND"
  | "CONTEXT_LENGTH_EXCEEDED"
  | "CONTENT_FILTERED"
  | "UNKNOWN";

// =============================================================================
// Logging Interceptors
// =============================================================================

/**
 * Logging interceptor options
 */

export type LoggingInterceptorOptions = {
  /** Log request details */
  logRequest?: boolean;
  /** Log response details */
  logResponse?: boolean;
  /** Log request body */
  logBody?: boolean;
  /** Log response body */
  logResponseBody?: boolean;
  /** Custom logger function */
  logger?: (message: string, data?: unknown) => void;
  /** Redact sensitive fields */
  redactFields?: string[];
};

// =============================================================================
// Retry Interceptors
// =============================================================================

/**
 * Retry interceptor options
 */
export type RetryInterceptorOptions = ClientRetryConfig & {
  /** Callback when a retry is attempted */
  onRetry?: (
    attempt: number,
    error: Error | ClientApiError,
    request: ClientMiddlewareRequest,
  ) => void;
  /** Custom retry condition */
  shouldRetry?: (
    response: ClientMiddlewareResponse,
    attempt: number,
  ) => boolean;
};

// =============================================================================
// Rate Limiting Interceptors
// =============================================================================

/**
 * Rate limiter options
 */

export type RateLimiterOptions = {
  /** Maximum requests per window */
  maxRequests: number;
  /** Window size in milliseconds */
  windowMs: number;
  /** Strategy when limit is reached: 'queue' or 'throw' */
  strategy?: "queue" | "throw";
  /** Callback when rate limited */
  onRateLimited?: (waitTime: number) => void;
};

// =============================================================================
// Caching Interceptors
// =============================================================================

/**
 * Cache options
 */

export type CacheInterceptorOptions = {
  /** Cache TTL in milliseconds */
  ttl: number;
  /** Maximum cache size */
  maxSize?: number;
  /** Cache key generator */
  keyGenerator?: (request: ClientMiddlewareRequest) => string;
  /** Methods to cache (default: ['GET']) */
  methods?: string[];
  /** Paths to cache (regex patterns) */
  includePaths?: RegExp[];
  /** Paths to exclude from cache */
  excludePaths?: RegExp[];
};

// =============================================================================
// Timeout Interceptors
// =============================================================================

/**
 * Timeout interceptor options
 */

export type TimeoutInterceptorOptions = {
  /** Timeout in milliseconds */
  timeout: number;
  /** Callback when timeout occurs */
  onTimeout?: (request: ClientMiddlewareRequest) => void;
};

// =============================================================================
// Error Handling Interceptors
// =============================================================================

/**
 * Error handling interceptor options
 */

export type ErrorHandlerOptions = {
  /** Custom error handler */
  onError?: (error: Error, request: ClientMiddlewareRequest) => Error | void;
  /** Transform error response */
  transformError?: (error: unknown) => ClientApiError;
  /** Report errors to external service */
  reportError?: (
    error: Error,
    context: ClientMiddlewareContext,
  ) => void | Promise<void>;
};

// =============================================================================
// Types
// =============================================================================

/**
 * SSE connection state
 */

export type SSEState = "connecting" | "connected" | "disconnected" | "error";

// =============================================================================
// Types
// =============================================================================
/**
 * SSE client configuration
 */

export type SSEConfig = ClientConfig & {
  /** Auto-reconnect on disconnect (default: true) */
  autoReconnect?: boolean;
  /** Maximum reconnection attempts (default: 5) */
  maxReconnectAttempts?: number;
  /** Initial reconnection delay in ms (default: 1000) */
  reconnectDelay?: number;
  /** Maximum reconnection delay in ms (default: 30000) */
  maxReconnectDelay?: number;
  /** Use native EventSource when available (default: false for more control) */
  useNativeEventSource?: boolean;
};

// =============================================================================
// Types
// =============================================================================
/**
 * SSE request options
 */

export type SSERequestOptions = {
  /** Request body */
  body?: unknown;
  /** Additional headers */
  headers?: Record<string, string>;
  /** Abort signal */
  signal?: AbortSignal;
};

// =============================================================================
// Types
// =============================================================================
/**
 * SSE event handlers
 */

export type SSEEventHandlers = {
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Error) => void;
  onEvent?: (event: ClientStreamEvent) => void;
  onReconnect?: (attempt: number) => void;
  onStateChange?: (state: SSEState) => void;
};

// =============================================================================
// Types
// =============================================================================

/**
 * SSE connection options
 */

export type SSEConnectionOptions = {
  /** Request headers */
  headers?: Record<string, string>;
  /** Request credentials */
  credentials?: RequestCredentials;
  /** Reconnect on disconnect */
  autoReconnect?: boolean;
  /** Reconnect delay in milliseconds */
  reconnectDelay?: number;
  /** Maximum reconnect attempts */
  maxReconnectAttempts?: number;
  /** Signal for request cancellation */
  signal?: AbortSignal;
};

// =============================================================================
// Types
// =============================================================================
/**
 * SSE connection state
 */

export type SSEConnectionState =
  | "connecting"
  | "connected"
  | "disconnected"
  | "reconnecting"
  | "error";

// =============================================================================
// Types
// =============================================================================
/**
 * Streaming request options
 */

export type StreamingRequestOptions = {
  /** Input text or data */
  input: { text: string } & UnknownRecord;
  /** Provider to use */
  provider?: string;
  /** Model to use */
  model?: string;
  /** Temperature */
  temperature?: number;
  /** Maximum tokens */
  maxTokens?: number;
  /** System prompt */
  systemPrompt?: string;
  /** Enable tools */
  enableTools?: boolean;
  /** Context data */
  context?: UnknownRecord;
};

// =============================================================================
// Types
// =============================================================================
/**
 * Streaming event emitter interface
 */

export type StreamingEventEmitter = {
  on(event: "text", callback: (text: string) => void): void;
  on(event: "tool-call", callback: (toolCall: StreamToolCall) => void): void;
  on(
    event: "tool-result",
    callback: (toolResult: StreamToolResult) => void,
  ): void;
  on(event: "error", callback: (error: ClientApiError) => void): void;
  on(event: "done", callback: (result: StreamResult) => void): void;
  on(event: "metadata", callback: (metadata: JsonObject) => void): void;
  off(event: string, callback: (...args: unknown[]) => void): void;
  emit(event: string, ...args: unknown[]): void;
};

// =============================================================================
// Streaming Client Factory
// =============================================================================

/**
 * Streaming client configuration
 */

export type StreamingClientConfig = {
  /** Base URL for the API */
  baseUrl: string;
  /** API key */
  apiKey?: string;
  /** Bearer token */
  token?: string;
  /** Default headers */
  headers?: Record<string, string>;
  /** Preferred transport: 'sse' or 'websocket' */
  transport?: "sse" | "websocket";
};

// =============================================================================
// Type Aliases (re-export canonical types under the original public names)
// =============================================================================

/** @see WSClientState */

export type ClientClientWebSocketState = WSClientState;

// =============================================================================
// Type Aliases (re-export canonical types under the original public names)
// =============================================================================
/** @see WSClientConfig */

export type ClientWebSocketConfig = WSClientConfig;

// =============================================================================
// Type Aliases (re-export canonical types under the original public names)
// =============================================================================
/** @see WSClientMessage */

export type ClientWebSocketMessage = WSClientMessage;

// =============================================================================
// Type Aliases (re-export canonical types under the original public names)
// =============================================================================
/** @see WSClientEventHandlers */

export type WebSocketEventHandlers = WSClientEventHandlers;

/**
 * Superset internal config for SSE and WebSocket client wrappers.
 * The 9 shared fields are required. Protocol-specific fields
 * (useNativeEventSource for SSE; heartbeatInterval/queueSize for WS)
 * are optional — each client populates only its own fields.
 */
export type ClientInternalConfig = {
  baseUrl: string;
  apiKey: string;
  token: string;
  timeout: number;
  headers: Record<string, string>;
  autoReconnect: boolean;
  maxReconnectAttempts: number;
  reconnectDelay: number;
  maxReconnectDelay: number;
  useNativeEventSource?: boolean;
  heartbeatInterval?: number;
  queueSize?: number;
};

/**
 * Internal stream chunk format used by the AI-SDK adapter's push/pull queue.
 * Distinct from the public NeuroLink `StreamChunk` (stream.ts) — this one
 * mirrors the underlying `ai` package event shape (text-delta / finish).
 */
export type AiSdkStreamChunk = {
  type: "text-delta" | "finish";
  textDelta?: string;
  finishReason?: string;
  usage?: { promptTokens: number; completionTokens: number };
};
