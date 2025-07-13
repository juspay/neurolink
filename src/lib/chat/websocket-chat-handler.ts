import { SSEChatHandler } from "./sse-handler.js";
import { NeuroLinkWebSocketServer } from "../services/websocket/websocket-server.js";
import { StreamingManager } from "../services/streaming/streaming-manager.js";
import type { AIProvider } from "../core/types.js";
import type {
  WebSocketOptions,
  ChatRequest,
  GroupChatRequest,
  StreamingChatRequest,
  MultiModalContent,
  WebSocketMessage,
} from "../services/types.js";
import type { SSEOptions } from "./types.js";
import { randomUUID } from "crypto";

export interface WebSocketChatOptions {
  sseOptions?: any;
  wsOptions?: WebSocketOptions;
  enableTypingIndicators?: boolean;
  enablePresenceTracking?: boolean;
  enableMessageSync?: boolean;
}

export class WebSocketChatHandler extends SSEChatHandler {
  private wsServer: NeuroLinkWebSocketServer;
  private streamingManager: StreamingManager;
  protected options: WebSocketChatOptions & Required<SSEOptions>;
  private typingIndicators = new Map<string, NodeJS.Timeout>();
  private presenceTracking = new Map<
    string,
    { lastSeen: number; status: string }
  >();

  constructor(provider: AIProvider, options: WebSocketChatOptions = {}) {
    super(provider, options.sseOptions);

    this.options = {
      enableTypingIndicators: true,
      enablePresenceTracking: true,
      enableMessageSync: true,
      maxConnections: 100,
      heartbeatInterval: 30000,
      connectionTimeout: 300000,
      enableCors: true,
      corsOrigins: ["*"],
      ...options,
    };

    this.wsServer = new NeuroLinkWebSocketServer(options.wsOptions);
    this.streamingManager = new StreamingManager();

    this.setupWebSocketHandlers();
  }

  private setupWebSocketHandlers(): void {
    this.wsServer.on("connection", ({ connectionId }) => {
      console.log(`[WebSocket Chat] New connection: ${connectionId}`);

      if (this.options.enablePresenceTracking) {
        this.updatePresence(connectionId, "online");
      }
    });

    this.wsServer.on("disconnection", ({ connectionId }) => {
      console.log(`[WebSocket Chat] Disconnection: ${connectionId}`);

      if (this.options.enablePresenceTracking) {
        this.updatePresence(connectionId, "offline");
      }

      this.clearTypingIndicator(connectionId);
    });

    this.wsServer.on("chat-message", ({ connectionId, message }) => {
      this.handleWebSocketChatMessage(connectionId, message);
    });
  }

  // Enhanced Chat Capabilities
  async handleWebSocketChatRequest(
    connectionId: string,
    request: ChatRequest,
  ): Promise<void> {
    try {
      if (this.options.enableTypingIndicators) {
        this.showTypingIndicator(connectionId, "assistant");
      }

      // Create streaming session for this chat
      const streamingSession =
        await this.streamingManager.createStreamingSession({
          provider: this.provider.constructor.name,
          model: "default", // Should get from provider
          streamingMode: "real-time",
          compressionEnabled: true,
          maxChunkSize: 1024,
          bufferSize: 4096,
          latencyTarget: 200,
        });

      // Generate AI response
      const result = await this.provider.generate({
        prompt: request.prompt,
        temperature: request.options?.temperature,
        maxTokens: request.options?.maxTokens,
      });

      if (!result || !result.content) {
        throw new Error("Invalid AI response");
      }

      // Send response via WebSocket
      const responseMessage: WebSocketMessage = {
        id: randomUUID(),
        type: "ai-response",
        connectionId,
        timestamp: Date.now(),
        data: {
          text: result.content,
          sessionId: request.sessionId,
          metadata: {
            provider: this.provider.constructor.name,
            tokens: result.usage?.totalTokens,
            latency: Date.now() - Date.now(), // Should track actual timing
          },
        },
      };

      this.sendToConnection(connectionId, responseMessage);

      if (this.options.enableTypingIndicators) {
        this.clearTypingIndicator(connectionId);
      }

      await this.streamingManager.terminateStreamingSession(
        streamingSession.id,
      );
    } catch (error) {
      console.error("[WebSocket Chat] Error handling chat request:", error);
      this.sendError(connectionId, "Failed to process chat request");
    }
  }

  async handleGroupChat(
    roomId: string,
    request: GroupChatRequest,
  ): Promise<void> {
    try {
      // Process AI request
      const result = await this.provider.generate({
        prompt: request.prompt,
        temperature: request.options?.temperature,
        maxTokens: request.options?.maxTokens,
      });

      if (!result || !result.content) {
        throw new Error("Invalid AI response");
      }

      // Broadcast to room
      const broadcastMessage: WebSocketMessage = {
        id: randomUUID(),
        type: "ai-response",
        connectionId: "system",
        timestamp: Date.now(),
        data: {
          text: result.content,
          sessionId: request.sessionId,
          userId: request.userId,
          isGroupMessage: true,
          metadata: {
            provider: this.provider.constructor.name,
            tokens: result.usage?.totalTokens,
          },
        },
      };

      this.wsServer.broadcastToRoom(roomId, broadcastMessage);
    } catch (error) {
      console.error("[WebSocket Chat] Error handling group chat:", error);
    }
  }

  async handleStreamingChat(
    connectionId: string,
    request: StreamingChatRequest,
  ): Promise<void> {
    try {
      const streamingOptions = request.streamingOptions || {};

      // Create streaming channel
      const channelId = randomUUID();
      const channel = this.wsServer.createStreamingChannel(
        connectionId,
        channelId,
      );

      // Generate response
      const result = await this.provider.generate({
        prompt: request.prompt,
        ...request.options,
      });

      if (!result || !result.content) {
        throw new Error("Invalid AI response");
      }

      // Send complete response
      const responseMessage: WebSocketMessage = {
        id: randomUUID(),
        type: "ai-response",
        connectionId,
        timestamp: Date.now(),
        data: {
          text: result.content,
          isStreamingComplete: true,
          channelId,
        },
      };

      this.sendToConnection(connectionId, responseMessage);
    } catch (error) {
      console.error("[WebSocket Chat] Error handling streaming chat:", error);
      this.sendError(connectionId, "Failed to process streaming chat");
    }
  }

  // Real-time Features
  async enableTypingIndicators(roomId: string): Promise<void> {
    this.options.enableTypingIndicators = true;
    console.log(
      `[WebSocket Chat] Enabled typing indicators for room ${roomId}`,
    );
  }

  async enablePresenceTracking(roomId: string): Promise<void> {
    this.options.enablePresenceTracking = true;
    console.log(
      `[WebSocket Chat] Enabled presence tracking for room ${roomId}`,
    );
  }

  async enableMessageSynchronization(roomId: string): Promise<void> {
    this.options.enableMessageSync = true;
    console.log(`[WebSocket Chat] Enabled message sync for room ${roomId}`);
  }

  // Helper methods
  private sendToConnection(
    connectionId: string,
    message: WebSocketMessage,
  ): void {
    // Use the WebSocket server's send method
    const ws = (this.wsServer as any).connections?.get(connectionId);
    if (ws && ws.readyState === 1) {
      // WebSocket.OPEN
      ws.send(JSON.stringify(message));
    }
  }

  private sendError(connectionId: string, errorMessage: string): void {
    const errorMsg: WebSocketMessage = {
      id: randomUUID(),
      type: "error",
      connectionId,
      timestamp: Date.now(),
      data: { error: errorMessage },
    };

    this.sendToConnection(connectionId, errorMsg);
  }

  private showTypingIndicator(connectionId: string, sender: string): void {
    if (!this.options.enableTypingIndicators) {
      return;
    }

    const message: WebSocketMessage = {
      id: randomUUID(),
      type: "system",
      connectionId,
      timestamp: Date.now(),
      data: {
        event: "typing_start",
        sender,
      },
    };

    this.sendToConnection(connectionId, message);
  }

  private clearTypingIndicator(connectionId: string): void {
    const timeout = this.typingIndicators.get(connectionId);
    if (timeout) {
      clearTimeout(timeout);
      this.typingIndicators.delete(connectionId);
    }
  }

  private updatePresence(connectionId: string, status: string): void {
    if (!this.options.enablePresenceTracking) {
      return;
    }

    this.presenceTracking.set(connectionId, {
      lastSeen: Date.now(),
      status,
    });
  }

  private handleWebSocketChatMessage(
    connectionId: string,
    message: WebSocketMessage,
  ): void {
    switch (message.data?.event) {
      case "chat_request":
        this.handleWebSocketChatRequest(connectionId, message.data.request);
        break;
      case "join_room":
        this.wsServer.joinRoom(connectionId, message.data.roomId);
        break;
      case "leave_room":
        this.wsServer.leaveRoom(connectionId, message.data.roomId);
        break;
      case "typing_start":
        this.showTypingIndicator(connectionId, message.data.sender || "user");
        break;
      case "typing_stop":
        this.clearTypingIndicator(connectionId);
        break;
    }
  }

  // Public API
  getConnectionCount(): number {
    return this.wsServer.getConnectionCount();
  }

  getRoomCount(): number {
    return this.wsServer.getRoomCount();
  }

  getStreamingMetrics() {
    return this.streamingManager.getStreamingMetrics();
  }

  close(): void {
    this.wsServer.close();
    this.streamingManager.destroy();
  }
}
