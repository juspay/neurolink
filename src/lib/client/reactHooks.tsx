/**
 * React Hooks for NeuroLink Client SDK
 *
 * Provides React hooks for interacting with NeuroLink agents, chat, workflows,
 * and voice features. Compatible with React 18+ and follows React hooks best practices.
 *
 * @remarks
 * This module requires React 18+ as a peer dependency. Install it with:
 * ```bash
 * npm install react react-dom
 * # or
 * pnpm add react react-dom
 * ```
 *
 * @module @neurolink/react
 */

import {
  useState,
  useCallback,
  useRef,
  useEffect,
  useContext,
  createContext,
  useMemo,
} from "react";
import type { ReactNode } from "react";

import type {
  ClientApiError,
  NeuroLinkProviderProps,
  UseChatOptions,
  UseChatReturn,
  UseAgentOptions,
  UseAgentReturn,
  UseWorkflowOptions,
  UseWorkflowReturn,
  UseVoiceOptions,
  UseVoiceReturn,
  UseStreamOptions,
  UseStreamReturn,
  UseToolsOptions,
  UseToolsReturn,
  ClientChatMessage as ChatMessage,
  ClientAgentExecuteOptions,
  ClientAgentExecuteResult,
  ClientWorkflowExecuteOptions,
  ClientWorkflowExecuteResult,
  ClientStreamCallbacks,
  ClientStreamEvent as StreamEvent,
  ClientToolInfo,
  SpeechRecognitionInternal,
  SpeechRecognitionEventInternal,
  SpeechRecognitionErrorEventInternal,
  UnknownRecord,
  StreamToolCall,
} from "../types/index.js";
import { NeuroLinkClient, createClient } from "./httpClient.js";
// =============================================================================
// Context and Provider
// =============================================================================

/**
 * Context for NeuroLink client
 */
const NeuroLinkContext = createContext<NeuroLinkClient | null>(null);

/**
 * Provider component for NeuroLink client
 *
 * Wraps your application to provide the NeuroLink client to all hooks.
 *
 * @example
 * ```tsx
 * import { NeuroLinkProvider } from '@neurolink/react';
 *
 * function App() {
 *   return (
 *     <NeuroLinkProvider
 *       config={{
 *         baseUrl: 'https://api.neurolink.example.com',
 *         apiKey: process.env.NEUROLINK_API_KEY,
 *       }}
 *     >
 *       <YourApp />
 *     </NeuroLinkProvider>
 *   );
 * }
 * ```
 */
export function NeuroLinkProvider({
  config,
  children,
}: NeuroLinkProviderProps & { children: ReactNode }): ReactNode {
  const client = useMemo(() => createClient(config), [config]);

  return (
    <NeuroLinkContext.Provider value={client}>
      {children}
    </NeuroLinkContext.Provider>
  );
}

/**
 * Hook to access the NeuroLink client
 *
 * Must be used within a NeuroLinkProvider.
 *
 * @throws Error if used outside of NeuroLinkProvider
 */
export function useNeuroLinkClient(): NeuroLinkClient {
  const client = useContext(NeuroLinkContext);

  if (!client) {
    throw new Error(
      "useNeuroLinkClient must be used within a NeuroLinkProvider. " +
        "Wrap your component tree with <NeuroLinkProvider config={...}>.",
    );
  }

  return client;
}

// =============================================================================
// Utility Hooks
// =============================================================================

/**
 * Generate a unique message ID
 */
function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// =============================================================================
// useChat Hook
// =============================================================================

/**
 * React hook for chat interactions with NeuroLink agents
 *
 * Provides a chat interface with support for streaming responses,
 * tool calls, and conversation history management.
 *
 * @example Basic usage
 * ```tsx
 * function ChatComponent() {
 *   const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
 *     api: '/api/chat',
 *     agentId: 'my-agent',
 *   });
 *
 *   return (
 *     <div>
 *       {messages.map(m => (
 *         <div key={m.id} className={m.role}>
 *           {m.content}
 *         </div>
 *       ))}
 *       <form onSubmit={handleSubmit}>
 *         <input value={input} onChange={handleInputChange} />
 *         <button type="submit" disabled={isLoading}>Send</button>
 *       </form>
 *     </div>
 *   );
 * }
 * ```
 */
export function useChat(options: UseChatOptions = {}): UseChatReturn {
  const {
    agentId,
    initialMessages = [],
    sessionId: initialSessionId,
    systemPrompt,
    onFinish,
    onError,
    onToolCall,
    body,
    generateId = generateMessageId,
  } = options;

  const client = useNeuroLinkClient();
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ClientApiError | null>(null);
  const [toolCalls, setToolCalls] = useState<StreamToolCall[]>([]);

  const abortControllerRef = useRef<AbortController | null>(null);
  const sessionIdRef = useRef<string | undefined>(initialSessionId);

  // Keep a ref to the latest messages so callbacks never see stale state
  const messagesRef = useRef<ChatMessage[]>(initialMessages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  /**
   * Handle input change
   */
  const handleInputChange = useCallback((e: { target: { value: string } }) => {
    setInput(e.target.value);
  }, []);

  /**
   * Append a message and get response
   */
  const append = useCallback(
    async (
      message: Omit<ChatMessage, "id" | "createdAt">,
    ): Promise<string | null | undefined> => {
      const userMessage: ChatMessage = {
        id: generateId(),
        createdAt: new Date(),
        ...message,
      };

      setMessages((prev: ChatMessage[]) => [...prev, userMessage]);
      setIsLoading(true);
      setError(null);
      setToolCalls([]);

      // Create abort controller
      abortControllerRef.current = new AbortController();

      const assistantId = generateId();
      const currentToolCalls: StreamToolCall[] = [];
      let assistantContent = "";

      // Add placeholder for assistant message
      const assistantMessage: ChatMessage = {
        id: assistantId,
        role: "assistant",
        content: "",
        createdAt: new Date(),
      };
      setMessages((prev: ChatMessage[]) => [...prev, assistantMessage]);

      try {
        // Read from the ref so we always have the latest messages
        const currentMessages = messagesRef.current;
        await client.stream(
          {
            input: {
              text: userMessage.content,
            },
            ...(agentId ? { context: { agentId } } : {}),
            ...(systemPrompt ? { systemPrompt } : {}),
            ...(body
              ? {
                  context: {
                    ...(agentId ? { agentId } : {}),
                    messages: [...currentMessages, userMessage].map((m) => ({
                      role: m.role,
                      content: m.content,
                    })),
                    sessionId: sessionIdRef.current,
                    ...body,
                  },
                }
              : {
                  context: {
                    ...(agentId ? { agentId } : {}),
                    messages: [...currentMessages, userMessage].map((m) => ({
                      role: m.role,
                      content: m.content,
                    })),
                    sessionId: sessionIdRef.current,
                  },
                }),
          },
          {
            onText: (text) => {
              assistantContent += text;
              setMessages((prev: ChatMessage[]) =>
                prev.map((m: ChatMessage) =>
                  m.id === assistantId
                    ? { ...m, content: assistantContent }
                    : m,
                ),
              );
            },
            onToolCall: (toolCall) => {
              currentToolCalls.push(toolCall);
              setToolCalls([...currentToolCalls]);
              onToolCall?.(toolCall);
            },
            onToolResult: (toolResult) => {
              setMessages((prev: ChatMessage[]) =>
                prev.map((m: ChatMessage) =>
                  m.id === assistantId
                    ? {
                        ...m,
                        toolCalls: currentToolCalls,
                        toolResults: [...(m.toolResults ?? []), toolResult],
                      }
                    : m,
                ),
              );
            },
            onMetadata: (metadata) => {
              if (metadata?.sessionId) {
                sessionIdRef.current = metadata.sessionId as string;
              }
            },
          },
          { signal: abortControllerRef.current.signal },
        );

        // Final message update
        const finalMessage: ChatMessage = {
          id: assistantId,
          role: "assistant",
          content: assistantContent,
          toolCalls: currentToolCalls.length > 0 ? currentToolCalls : undefined,
          createdAt: new Date(),
        };

        setMessages((prev: ChatMessage[]) =>
          prev.map((m: ChatMessage) =>
            m.id === assistantId ? finalMessage : m,
          ),
        );

        onFinish?.(finalMessage);
        return assistantId;
      } catch (err) {
        if ((err as Error).name === "AbortError") {
          return null;
        }
        const apiError = err as ClientApiError;
        setError(apiError);
        onError?.(apiError);
        return null;
      } finally {
        setIsLoading(false);
        setToolCalls([]);
        abortControllerRef.current = null;
      }
    },
    [
      client,
      agentId,
      systemPrompt,
      body,
      generateId,
      onFinish,
      onError,
      onToolCall,
    ],
  );

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(
    (
      e?: { preventDefault?: () => void },
      submitOptions?: { data?: UnknownRecord },
    ) => {
      e?.preventDefault?.();

      if (!input.trim()) {
        return;
      }

      const message: Omit<ChatMessage, "id" | "createdAt"> = {
        role: "user",
        content: input,
        metadata: submitOptions?.data as ChatMessage["metadata"],
      };

      setInput("");
      append(message);
    },
    [input, append],
  );

  /**
   * Reload the last assistant message
   */
  const reload = useCallback(async (): Promise<string | null | undefined> => {
    // Read from the ref so we always have the latest messages
    const currentMessages = messagesRef.current;
    const lastUserMessageIndex = currentMessages.findLastIndex(
      (m: ChatMessage) => m.role === "user",
    );
    if (lastUserMessageIndex === -1) {
      return null;
    }

    const lastUserMessage = currentMessages[lastUserMessageIndex];

    // Remove messages after the last user message
    setMessages((prev: ChatMessage[]) => prev.slice(0, lastUserMessageIndex));

    return append({
      role: "user",
      content: lastUserMessage.content,
    });
  }, [append]);

  /**
   * Stop streaming
   */
  const stop = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  /**
   * Clear error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  return {
    messages,
    input,
    setInput,
    handleInputChange,
    handleSubmit,
    append,
    reload,
    stop,
    setMessages,
    isLoading,
    error,
    clearError,
    toolCalls,
  };
}

// =============================================================================
// useAgent Hook
// =============================================================================

/**
 * React hook for interacting with NeuroLink agents
 *
 * Provides methods for executing agents with both streaming
 * and non-streaming responses, with session management.
 *
 * @example Basic usage
 * ```tsx
 * function AgentComponent() {
 *   const { execute, isLoading, result, error } = useAgent({
 *     agentId: 'my-agent',
 *     onResponse: (result) => console.log('Agent responded:', result),
 *   });
 *
 *   return (
 *     <div>
 *       <button onClick={() => execute('Hello!')}>
 *         {isLoading ? 'Thinking...' : 'Ask Agent'}
 *       </button>
 *       {result && <p>{result.content}</p>}
 *       {error && <p className="error">{error.message}</p>}
 *     </div>
 *   );
 * }
 * ```
 */
export function useAgent(options: UseAgentOptions): UseAgentReturn {
  const {
    agentId,
    sessionId: initialSessionId,
    onResponse,
    onError,
    onToolCall,
    initialInput,
  } = options;

  const client = useNeuroLinkClient();
  const [sessionId, setSessionId] = useState<string | null>(
    initialSessionId ?? null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [result, setResult] = useState<ClientAgentExecuteResult | null>(null);
  const [error, setError] = useState<ClientApiError | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const hasAutoExecuted = useRef(false);

  // Keep a ref to the latest sessionId so callbacks never see stale state
  const sessionIdRef = useRef<string | null>(initialSessionId ?? null);
  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  /**
   * Execute agent (non-streaming)
   */
  const execute = useCallback(
    async (
      input: string,
      executeOptions?: Partial<ClientAgentExecuteOptions>,
    ): Promise<ClientAgentExecuteResult> => {
      setIsLoading(true);
      setError(null);

      abortControllerRef.current = new AbortController();

      try {
        const response = await client.executeAgent(
          {
            agentId,
            input,
            sessionId: sessionIdRef.current ?? undefined,
            ...executeOptions,
          },
          { signal: abortControllerRef.current.signal },
        );

        const agentResult = response.data;
        setResult(agentResult);
        setSessionId(agentResult.sessionId);
        onResponse?.(agentResult);

        return agentResult;
      } catch (err) {
        const apiError = err as ClientApiError;
        setError(apiError);
        onError?.(apiError);
        throw err;
      } finally {
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    },
    [client, agentId, onResponse, onError],
  );

  /**
   * Stream agent execution
   */
  const stream = useCallback(
    async (input: string, callbacks?: ClientStreamCallbacks): Promise<void> => {
      setIsStreaming(true);
      setIsLoading(true);
      setError(null);

      abortControllerRef.current = new AbortController();

      try {
        await client.streamAgent(
          {
            agentId,
            input,
            sessionId: sessionIdRef.current ?? undefined,
            stream: true,
          },
          {
            ...callbacks,
            onToolCall: (toolCall) => {
              callbacks?.onToolCall?.(toolCall);
              onToolCall?.(toolCall);
            },
            onDone: (streamResult) => {
              callbacks?.onDone?.(streamResult);
              setIsStreaming(false);
            },
            onError: (apiError) => {
              callbacks?.onError?.(apiError);
              setError(apiError);
              onError?.(apiError);
            },
          },
          { signal: abortControllerRef.current.signal },
        );
      } catch (err) {
        const apiError = err as ClientApiError;
        setError(apiError);
        onError?.(apiError);
      } finally {
        setIsLoading(false);
        setIsStreaming(false);
        abortControllerRef.current = null;
      }
    },
    [client, agentId, onToolCall, onError],
  );

  /**
   * Abort current execution
   */
  const abort = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsLoading(false);
    setIsStreaming(false);
  }, []);

  /**
   * Clear error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Auto-execute on mount if initialInput is provided
  useEffect(() => {
    if (initialInput && !hasAutoExecuted.current) {
      hasAutoExecuted.current = true;
      execute(initialInput);
    }
  }, [initialInput, execute]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  return {
    execute,
    stream,
    sessionId,
    setSessionId,
    isLoading,
    isStreaming,
    result,
    error,
    clearError,
    abort,
  };
}

// =============================================================================
// useWorkflow Hook
// =============================================================================

/**
 * React hook for executing NeuroLink workflows
 *
 * Provides methods for executing, resuming, and monitoring workflows
 * with automatic status polling and suspension handling.
 *
 * @example Basic usage
 * ```tsx
 * function WorkflowComponent() {
 *   const { execute, status, result, isLoading, error } = useWorkflow({
 *     workflowId: 'data-processing-workflow',
 *     onComplete: (result) => console.log('Workflow completed:', result),
 *     onStepComplete: (step) => console.log('Step completed:', step.stepId),
 *   });
 *
 *   return (
 *     <div>
 *       <button onClick={() => execute({ data: inputData })}>
 *         Run Workflow
 *       </button>
 *       {status && <p>Status: {status}</p>}
 *       {result?.output && <pre>{JSON.stringify(result.output, null, 2)}</pre>}
 *     </div>
 *   );
 * }
 * ```
 */
export function useWorkflow(options: UseWorkflowOptions): UseWorkflowReturn {
  const {
    workflowId,
    onComplete,
    onError,
    onStepComplete,
    pollInterval = 2000,
  } = options;

  const client = useNeuroLinkClient();
  const [runId, setRunId] = useState<string | null>(null);
  const [status, setStatus] = useState<
    ClientWorkflowExecuteResult["status"] | null
  >(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ClientWorkflowExecuteResult | null>(
    null,
  );
  const [error, setError] = useState<ClientApiError | null>(null);

  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const previousStepsRef = useRef<Set<string>>(new Set());

  /**
   * Stop polling
   */
  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  /**
   * Poll for workflow status
   */
  const pollStatus = useCallback(
    async (currentRunId: string) => {
      try {
        const response = await client.getWorkflowStatus(
          workflowId,
          currentRunId,
        );
        const workflowResult = response.data;

        setStatus(workflowResult.status);
        setResult(workflowResult);

        // Check for newly completed steps
        if (workflowResult.steps && onStepComplete) {
          for (const step of workflowResult.steps) {
            if (
              step.status === "completed" &&
              !previousStepsRef.current.has(step.stepId)
            ) {
              previousStepsRef.current.add(step.stepId);
              onStepComplete(step);
            }
          }
        }

        // Handle completion
        if (workflowResult.status === "completed") {
          stopPolling();
          setIsLoading(false);
          onComplete?.(workflowResult);
        } else if (workflowResult.status === "failed") {
          stopPolling();
          setIsLoading(false);
          if (workflowResult.error) {
            setError(workflowResult.error);
            onError?.(workflowResult.error);
          }
        } else if (workflowResult.status === "suspended") {
          stopPolling();
          setIsLoading(false);
        }
      } catch (err) {
        stopPolling();
        setIsLoading(false);
        const apiError = err as ClientApiError;
        setError(apiError);
        onError?.(apiError);
      }
    },
    [client, workflowId, onComplete, onError, onStepComplete, stopPolling],
  );

  /**
   * Start polling for workflow status
   */
  const startPolling = useCallback(
    (currentRunId: string) => {
      stopPolling();
      pollIntervalRef.current = setInterval(
        () => pollStatus(currentRunId),
        pollInterval,
      );
    },
    [pollInterval, pollStatus, stopPolling],
  );

  /**
   * Execute workflow
   */
  const execute = useCallback(
    async (
      input: UnknownRecord,
      executeOptions?: Partial<ClientWorkflowExecuteOptions>,
    ): Promise<ClientWorkflowExecuteResult> => {
      setIsLoading(true);
      setError(null);
      setStatus(null);
      setResult(null);
      previousStepsRef.current.clear();

      try {
        const response = await client.executeWorkflow({
          workflowId,
          input,
          ...executeOptions,
        });

        const workflowResult = response.data;
        setRunId(workflowResult.runId);
        setStatus(workflowResult.status);
        setResult(workflowResult);

        // Start polling if workflow is running
        if (workflowResult.status === "running") {
          startPolling(workflowResult.runId);
        } else if (workflowResult.status === "completed") {
          setIsLoading(false);
          onComplete?.(workflowResult);
        } else if (workflowResult.status === "failed") {
          setIsLoading(false);
          if (workflowResult.error) {
            setError(workflowResult.error);
            onError?.(workflowResult.error);
          }
        }

        return workflowResult;
      } catch (err) {
        setIsLoading(false);
        const apiError = err as ClientApiError;
        setError(apiError);
        onError?.(apiError);
        throw err;
      }
    },
    [client, workflowId, onComplete, onError, startPolling],
  );

  /**
   * Resume suspended workflow
   */
  const resume = useCallback(
    async (
      resumeToken: string,
      resumeData?: UnknownRecord,
    ): Promise<ClientWorkflowExecuteResult> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await client.resumeWorkflow(
          workflowId,
          resumeToken,
          resumeData,
        );

        const workflowResult = response.data;
        setRunId(workflowResult.runId);
        setStatus(workflowResult.status);
        setResult(workflowResult);

        // Start polling if workflow is running
        if (workflowResult.status === "running") {
          startPolling(workflowResult.runId);
        } else if (workflowResult.status === "completed") {
          setIsLoading(false);
          onComplete?.(workflowResult);
        }

        return workflowResult;
      } catch (err) {
        setIsLoading(false);
        const apiError = err as ClientApiError;
        setError(apiError);
        onError?.(apiError);
        throw err;
      }
    },
    [client, workflowId, onComplete, onError, startPolling],
  );

  /**
   * Get workflow status
   */
  const getStatus = useCallback(
    async (statusRunId: string): Promise<ClientWorkflowExecuteResult> => {
      const response = await client.getWorkflowStatus(workflowId, statusRunId);
      return response.data;
    },
    [client, workflowId],
  );

  /**
   * Cancel workflow execution
   */
  const cancel = useCallback(
    async (cancelRunId: string): Promise<void> => {
      stopPolling();
      await client.cancelWorkflow(workflowId, cancelRunId);
      setStatus("failed");
      setIsLoading(false);
    },
    [client, workflowId, stopPolling],
  );

  /**
   * Clear error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  return {
    execute,
    resume,
    getStatus,
    cancel,
    runId,
    status,
    isLoading,
    result,
    error,
    clearError,
  };
}

// =============================================================================
// useVoice Hook
// =============================================================================

/**
 * React hook for voice interactions with NeuroLink
 *
 * Provides voice input (speech recognition) and output (text-to-speech)
 * capabilities with support for real-time conversation.
 *
 * @example Basic usage
 * ```tsx
 * function VoiceComponent() {
 *   const {
 *     startListening,
 *     stopListening,
 *     speak,
 *     isListening,
 *     isSpeaking,
 *     transcript,
 *     isSupported,
 *   } = useVoice({
 *     voice: 'en-US-Neural2-C',
 *     autoPlay: true,
 *   });
 *
 *   if (!isSupported) {
 *     return <p>Voice not supported in this browser</p>;
 *   }
 *
 *   return (
 *     <div>
 *       <button onClick={isListening ? stopListening : startListening}>
 *         {isListening ? 'Stop' : 'Start'} Listening
 *       </button>
 *       <p>Transcript: {transcript}</p>
 *       <button onClick={() => speak('Hello!')}>Speak</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useVoice(options: UseVoiceOptions = {}): UseVoiceReturn {
  const {
    voice,
    language = "en-US",
    autoPlay = true,
    onSpeechStart,
    onSpeechEnd,
    onError,
    api = "/api/tts",
    enableSpeechRecognition = true,
  } = options;

  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState<string | null>(null);
  const [error, setError] = useState<ClientApiError | null>(null);

  const recognitionRef = useRef<SpeechRecognitionInternal | null>(null);
  const synthesisRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Check browser support
  const isSupported = useMemo(() => {
    if (typeof window === "undefined") {
      return false;
    }
    const hasSpeechRecognition =
      "SpeechRecognition" in window || "webkitSpeechRecognition" in window;
    const hasSpeechSynthesis = "speechSynthesis" in window;
    return hasSpeechRecognition || hasSpeechSynthesis;
  }, []);

  /**
   * Initialize speech recognition
   */
  const initRecognition = useCallback(() => {
    if (typeof window === "undefined") {
      return null;
    }

    const SpeechRecognitionCtor =
      (
        window as unknown as {
          SpeechRecognition?: { new (): SpeechRecognitionInternal };
        }
      ).SpeechRecognition ||
      (
        window as unknown as {
          webkitSpeechRecognition?: { new (): SpeechRecognitionInternal };
        }
      ).webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      return null;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language;

    recognition.onresult = (event: SpeechRecognitionEventInternal) => {
      let finalTranscript = "";
      let interimTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      setTranscript(finalTranscript || interimTranscript);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEventInternal) => {
      const apiError: ClientApiError = {
        code: "SPEECH_RECOGNITION_ERROR",
        message: event.error,
        status: 500,
      };
      setError(apiError);
      onError?.(apiError);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    return recognition;
  }, [language, onError]);

  /**
   * Start listening for voice input
   */
  const startListening = useCallback(() => {
    if (!enableSpeechRecognition) {
      return;
    }

    if (!recognitionRef.current) {
      recognitionRef.current = initRecognition();
    }

    if (recognitionRef.current) {
      setTranscript("");
      setError(null);
      recognitionRef.current.start();
      setIsListening(true);
    }
  }, [enableSpeechRecognition, initRecognition]);

  /**
   * Stop listening
   */
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, []);

  /**
   * Speak text using TTS
   */
  const speak = useCallback(
    async (text: string): Promise<void> => {
      if (typeof window === "undefined") {
        return;
      }

      setIsSpeaking(true);
      onSpeechStart?.();

      try {
        // Use Web Speech API for basic TTS
        if ("speechSynthesis" in window) {
          return new Promise((resolve, reject) => {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = language;

            if (voice) {
              const voices = window.speechSynthesis.getVoices();
              const selectedVoice = voices.find((v) => v.name.includes(voice));
              if (selectedVoice) {
                utterance.voice = selectedVoice;
              }
            }

            utterance.onend = () => {
              setIsSpeaking(false);
              onSpeechEnd?.();
              resolve();
            };

            utterance.onerror = (event) => {
              setIsSpeaking(false);
              const apiError: ClientApiError = {
                code: "SPEECH_SYNTHESIS_ERROR",
                message: event.error,
                status: 500,
              };
              setError(apiError);
              onError?.(apiError);
              reject(event);
            };

            synthesisRef.current = utterance;
            window.speechSynthesis.speak(utterance);
          });
        }
      } catch (err) {
        setIsSpeaking(false);
        const apiError: ClientApiError = {
          code: "TTS_ERROR",
          message: (err as Error).message,
          status: 500,
        };
        setError(apiError);
        onError?.(apiError);
      }
    },
    [voice, language, onSpeechStart, onSpeechEnd, onError],
  );

  /**
   * Stop speaking
   */
  const stopSpeaking = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, []);

  /**
   * Submit voice input and get response
   */
  const submit = useCallback(
    async (text: string): Promise<string> => {
      setIsProcessing(true);
      setError(null);

      try {
        const res = await fetch(api, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ text, voice }),
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw errorData;
        }

        const data = await res.json();
        const responseText = data.response || data.content || text;
        setResponse(responseText);

        if (autoPlay) {
          await speak(responseText);
        }

        return responseText;
      } catch (err) {
        const apiError = err as ClientApiError;
        setError(apiError);
        onError?.(apiError);
        throw err;
      } finally {
        setIsProcessing(false);
      }
    },
    [api, voice, autoPlay, speak, onError],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return {
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    submit,
    isListening,
    isSpeaking,
    isProcessing,
    transcript,
    response,
    error,
    isSupported,
  };
}

// =============================================================================
// useStream Hook
// =============================================================================

/**
 * React hook for streaming responses from NeuroLink
 *
 * @example
 * ```tsx
 * function StreamComponent() {
 *   const { start, stop, text, isStreaming } = useStream({
 *     api: '/api/stream',
 *   });
 *
 *   return (
 *     <div>
 *       <button onClick={() => start({ prompt: 'Tell me a story' })}>
 *         Start
 *       </button>
 *       <button onClick={stop} disabled={!isStreaming}>Stop</button>
 *       <p>{text}</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function useStream(options: UseStreamOptions = {}): UseStreamReturn {
  const { api = "/api/stream", callbacks } = options;

  const [text, setText] = useState("");
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<ClientApiError | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Start streaming
   */
  const start = useCallback(
    async (streamOptions: { prompt: string } & UnknownRecord) => {
      setText("");
      setEvents([]);
      setError(null);
      setIsStreaming(true);

      abortControllerRef.current = new AbortController();

      try {
        const response = await fetch(api, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "text/event-stream",
          },
          body: JSON.stringify(streamOptions),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw errorData;
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("Response body is not readable");
        }

        const decoder = new TextDecoder();
        let buffer = "";
        let fullText = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") {
                break;
              }

              try {
                const event = JSON.parse(data) as StreamEvent;
                setEvents((prev: StreamEvent[]) => [...prev, event]);

                if (event.type === "text" && event.content) {
                  fullText += event.content;
                  setText(fullText);
                  callbacks?.onText?.(event.content);
                } else if (event.type === "tool-call" && event.toolCall) {
                  callbacks?.onToolCall?.(event.toolCall);
                } else if (event.type === "tool-result" && event.toolResult) {
                  callbacks?.onToolResult?.(event.toolResult);
                } else if (event.type === "error" && event.error) {
                  callbacks?.onError?.(event.error);
                } else if (event.type === "metadata" && event.metadata) {
                  callbacks?.onMetadata?.(event.metadata);
                }
              } catch {
                // Ignore parse errors
              }
            }
          }
        }

        reader.releaseLock();
      } catch (err) {
        if ((err as Error).name === "AbortError") {
          return;
        }
        const apiError = err as ClientApiError;
        setError(apiError);
        callbacks?.onError?.(apiError);
      } finally {
        setIsStreaming(false);
        abortControllerRef.current = null;
      }
    },
    [api, callbacks],
  );

  /**
   * Stop streaming
   */
  const stop = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsStreaming(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  return {
    start,
    stop,
    text,
    events,
    isStreaming,
    error,
  };
}

// =============================================================================
// useTools Hook
// =============================================================================

/**
 * React hook for accessing and executing NeuroLink tools
 *
 * @example
 * ```tsx
 * function ToolsComponent() {
 *   const { tools, execute, isLoading, error } = useTools({
 *     category: 'data',
 *   });
 *
 *   return (
 *     <div>
 *       {tools.map(tool => (
 *         <div key={tool.name}>
 *           <h3>{tool.name}</h3>
 *           <p>{tool.description}</p>
 *           <button onClick={() => execute(tool.name, { input: 'test' })}>
 *             Execute
 *           </button>
 *         </div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useTools(options: UseToolsOptions = {}): UseToolsReturn {
  const { category, serverId, refreshInterval } = options;

  const client = useNeuroLinkClient();
  const [tools, setTools] = useState<ClientToolInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ClientApiError | null>(null);

  /**
   * Refresh tool list
   */
  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await client.listTools({ category, serverId });
      setTools(response.data);
    } catch (err) {
      const apiError = err as ClientApiError;
      setError(apiError);
    } finally {
      setIsLoading(false);
    }
  }, [client, category, serverId]);

  /**
   * Execute a tool
   */
  const execute = useCallback(
    async (toolName: string, params: UnknownRecord): Promise<unknown> => {
      const response = await client.executeTool(toolName, params);
      return response.data;
    },
    [client],
  );

  // Initial load
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Auto-refresh interval
  useEffect(() => {
    if (refreshInterval && refreshInterval > 0) {
      const interval = setInterval(refresh, refreshInterval);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [refreshInterval, refresh]);

  return {
    tools,
    execute,
    refresh,
    isLoading,
    error,
  };
}

// Type augmentation for SpeechRecognition (browser APIs)
declare global {
  interface Window {
    SpeechRecognition: { new (): SpeechRecognitionInternal };
    webkitSpeechRecognition: { new (): SpeechRecognitionInternal };
  }
}
