# Lighthouse MCP Deep Analysis

## Executive Summary

After thorough analysis of Lighthouse's MCP implementation, we've identified their complete architecture pattern. Lighthouse uses an automatic tool execution model where the MCP client (`BedrockMCPClient`) decides when to use tools based on the prompt content, without requiring manual tool invocation.

## Core Architecture Components

### 1. MCP Client Layer (`mcpClient.ts`)
- **BedrockMCPClient**: External dependency from `@juspay/bedrock-mcp-connector`
- **MCPClientInstance**: Wrapper class that manages:
  - Client initialization with model configuration
  - Event emitter setup for tool tracking
  - Session management
  - Logging and telemetry

### 2. MCP Manager Layer (`mcpManager.ts`)
- **BedrockMCPManager**: Singleton pattern for session management
  - Creates/retrieves MCP client instances per session
  - Implements instance pooling with max limit
  - Handles cleanup of old sessions
  - Thread-safe instance management

### 3. Tool Initialization (`initializeTools`)
- Tools are registered once per session
- Tools are discovered from various sources
- Each tool has metadata and execution logic
- Tools are made available to the MCP client

### 4. Route Integration
- **`/ai/tool/+server.ts`**: Dedicated MCP endpoint with SSE streaming
- **`/ai/sdk/+server.ts`**: SDK endpoint with optional MCP support
- Both use session-based MCP managers
- Event-driven responses with real-time feedback

## Key Patterns Discovered

### 1. Automatic Tool Execution
```typescript
// Lighthouse doesn't manually invoke tools!
const response = await mcpManager.sendPrompt(query);
// The MCP client automatically:
// 1. Analyzes the prompt
// 2. Decides which tools to use
// 3. Executes tools
// 4. Incorporates results
// 5. Returns final response
```

### 2. Event-Driven Feedback
```typescript
eventEmitter.on('tool:start', (toolName, input) => {
  // Real-time notification when tool starts
});

eventEmitter.on('tool:end', (toolName, result) => {
  // Tool completion with results
});
```

### 3. Session-Based Architecture
- Each request gets a unique session ID
- MCP managers are cached per session
- Tools maintain context within sessions
- Sessions can be reused for follow-up requests

### 4. Server-Sent Events (SSE) for Streaming
- Real-time progress updates
- Tool usage notifications
- Error handling with graceful degradation
- Proper stream cleanup

## Implementation Differences

### What Lighthouse Does
1. Uses proprietary `BedrockMCPClient`
2. Single provider (AWS Bedrock)
3. Automatic tool detection and execution
4. Server-side only (SvelteKit routes)
5. SSE for real-time updates

### What NeuroLink Needs
1. Create our own MCP client implementation
2. Support for 9+ AI providers
3. Both automatic and manual tool modes
4. CLI and SDK integration
5. Multiple response formats (streaming, SSE, JSON)

## NeuroLink Adaptation Strategy

### 1. Create NeuroLinkMCPClient
- Implement automatic tool detection
- Support multiple AI providers
- Event emitter for tool tracking
- Session management

### 2. Provider-Agnostic Design
- MCP wrapper works with any AI provider
- Tools are provider-independent
- Consistent interface across providers

### 3. Dual Integration
- **CLI**: Direct tool invocation + automatic mode
- **SDK**: Session-based with automatic tools
- **API**: SSE streaming for web applications

### 4. Enhanced Features
- Tool usage analytics
- Manual tool override
- Tool chain composition
- Debug mode with detailed logs

## Code Flow Analysis

### Lighthouse Request Flow
1. Client sends request with session ID
2. Route handler gets/creates MCP manager
3. Tools are initialized for session
4. Event listeners attached
5. Prompt sent to MCP client
6. Client automatically uses tools
7. Events emitted for each tool use
8. Final response returned
9. Session kept for reuse

### NeuroLink Target Flow
1. Request with optional MCP enablement
2. Factory creates MCP-aware provider
3. MCP client initialized with tools
4. Prompt analyzed for tool needs
5. Tools executed (auto or manual)
6. Results incorporated
7. Response with tool metadata
8. Session optionally preserved

## Critical Implementation Details

### 1. Tool Registration
```typescript
// Lighthouse pattern
initializeTools(sessionId, ...params);

// NeuroLink adaptation
initializeMCPTools(sessionId, mcpClient, context);
```

### 2. Event Handling
```typescript
// Must support these events
'tool:start' - Tool execution beginning
'tool:end' - Tool execution complete
'response:start' - Response generation start
'response:chunk' - Streaming chunk
'response:end' - Response complete
'error' - Error occurred
```

### 3. Session Management
```typescript
// Key operations
getMCPManager(sessionId) - Get or create
removeMCPManager(sessionId) - Cleanup
isSessionActive(sessionId) - Check status
```

## Next Steps

1. Implement NeuroLinkMCPClient with automatic tool execution
2. Update MCP manager for proper session handling
3. Integrate event emitters throughout
4. Add SSE support for web applications
5. Create comprehensive test suite

## Conclusion

Lighthouse's MCP implementation is sophisticated but focused on a single provider (Bedrock). NeuroLink needs to adapt these patterns while maintaining flexibility for multiple providers and usage modes (CLI/SDK). The key insight is that MCP tools should be automatically invoked based on prompt analysis, not manually triggered.
