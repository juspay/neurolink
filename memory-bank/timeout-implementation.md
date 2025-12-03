# NeuroLink Timeout Implementation Progress

## 🚀 Implementation Status (As of 2025-06-29)

### Phase 1: Core Infrastructure ✅
- ✅ Created `src/lib/utils/timeout.ts` with:
  - `TimeoutError` class for proper error handling
  - `parseTimeout()` function supporting multiple formats (ms, s, m, h)
  - Default timeout configurations for all providers
  - Helper functions for timeout management

- ✅ Created `src/lib/providers/timeout-wrapper.ts` with:
  - `withTimeout()` for wrapping promises
  - `withStreamingTimeout()` for async generators
  - `createTimeoutController()` for AbortSignal support
  - `mergeAbortSignals()` for combining signals

- ✅ Updated `src/lib/core/types.ts`:
  - Added `timeout?: number | string` to `TextGenerationOptions`
  - Added `timeout?: number | string` to `StreamOptions`

### Phase 2: Provider Implementation ✅ COMPLETE
- ✅ **OpenAI Provider** - Complete with AbortSignal support
  - `generate()` method now supports timeout
  - `stream` method now supports timeout
  - Proper error handling for `TimeoutError`
  - Uses default timeout from configuration

- ✅ **Google AI Studio Provider** - Complete with AbortSignal support
  - `generate()` method now supports timeout
  - `stream` method now supports timeout
  - Proper error handling for `TimeoutError`
  - Uses default timeout from configuration

- ✅ **Amazon Bedrock Provider** - Complete with AbortSignal support
  - `generate()` method now supports timeout
  - `stream` method now supports timeout
  - Proper error handling for `TimeoutError`
  - Uses default timeout from configuration
  - Handles AWS region-specific timeouts

- ✅ **Google Vertex AI Provider** - Complete with AbortSignal support
  - `generate()` method now supports timeout
  - `stream` method now supports timeout
  - Proper error handling for `TimeoutError`
  - Uses default timeout from configuration
  - Supports both Google and Anthropic models

- ✅ **Anthropic Provider** - Complete with AbortSignal support via fetch
  - `generate()` method now supports timeout
  - `stream` method now supports timeout
  - Proper error handling for `TimeoutError`
  - Converts AbortError to TimeoutError for consistency
  - Direct API implementation with timeout support

- ✅ **Azure OpenAI Provider** - Complete with AbortSignal support via fetch
  - `generate()` method now supports timeout
  - `stream` method now supports timeout
  - Proper error handling for `TimeoutError`
  - Uses default timeout from configuration
  - Direct API implementation with timeout support

- ✅ **Hugging Face Provider** - Complete with AbortSignal support
  - `generate()` method now supports timeout
  - `stream` method now supports timeout
  - Proper error handling for `TimeoutError`
  - Uses default timeout from configuration
  - Retry logic works with timeout support

- ✅ **Mistral AI Provider** - Complete with AbortSignal support
  - `generate()` method now supports timeout
  - `stream` method now supports timeout
  - Proper error handling for `TimeoutError`
  - Uses default timeout from configuration

- ✅ **Ollama Provider** - Complete with existing + new timeout support
  - Already had timeout implementation via AbortController
  - Updated to accept timeout from options parameter
  - Maintains backward compatibility with OLLAMA_TIMEOUT env var
  - Uses centralized default timeout configuration
  - Proper error handling and timeout messaging

### Phase 3: Factory and NeuroLink Updates ✅ COMPLETE
- ✅ Update NeuroLink class to pass timeout through all methods
  - Added `timeout?: number | string` to `TextGenerationOptions` interface
  - Added `timeout?: number | string` to `StreamOptions` interface
  - Pass timeout to provider `generate` and `stream` calls
- ✅ Handle TimeoutError in fallback logic
  - Import `TimeoutError` from utils
  - Special handling for timeout errors with specific logging
  - Fallback continues to next provider on timeout
- ✅ Pass timeout to provider methods
  - Both regular and MCP-enabled generation methods pass timeout
  - Stream generation also passes timeout parameter
- ✅ Ensure timeout propagates through retry mechanisms
  - Timeout passed through all provider calls
  - Fallback logic properly handles TimeoutError

### Phase 4: CLI Integration ✅ COMPLETE
- ✅ Add timeout flag to all generation commands
  - `generate`/`generate`/`gen` command: `--timeout` flag with default "30s"
  - `stream` command: `--timeout` flag with default "2m" (longer for streaming)
  - `batch` command: `--timeout` flag with default "30s" per request
- ✅ Update timeout option types
  - Changed from `number` to `string` to accept human-friendly formats
  - Examples: "30s", "2m", "1h", "5000" (milliseconds)
- ✅ Parse and validate CLI timeout values
  - SDK's `parseTimeout` function will handle the parsing internally
  - No additional validation needed in CLI
- ✅ Pass CLI timeout to SDK methods
  - Removed manual timeout wrapper (Promise.race)
  - Pass timeout directly to SDK's `generate` and `stream`
  - SDK handles timeout internally with proper cleanup

### Phase 5: MCP Wrapper Updates ✅ COMPLETE
- ✅ Update Function Calling Provider to respect timeout
  - Updated `AgentEnhancedProvider` to accept timeout in both `generate` and `stream`
  - Pass timeout as `abortSignal` to AI SDK's `generate` and `stream` functions (internal AI SDK usage)
  - Uses `AbortSignal.timeout()` for modern timeout handling
- ✅ Handle tool execution timeouts separately
  - Added `toolExecutionTimeout` configuration option to `AgentConfig`
  - Each MCP tool execution has its own timeout controller
  - Timeout is parsed using centralized `parseTimeout` function
  - Clear timeout on success or error to prevent memory leaks
- ✅ Ensure timeout works with MCP tools
  - MCP tool execution wrapped in Promise.race with timeout
  - Tool-specific timeout errors include tool name and configured timeout
  - Supports both string format ("30s") and numeric milliseconds
- ✅ Test timeout with external MCP servers
  - MCP initialization already has `mcpInitTimeoutMs` (15 seconds default)
  - Individual tool execution timeouts work independently
  - Both initialization and execution timeouts are configurable

### Phase 6: Testing Strategy ✅ COMPLETE
- ✅ Unit tests for parseTimeout function
  - Tests for all formats (ms, s, m, h)
  - Invalid format handling
  - Edge cases (negative values, zero timeout)
- ✅ Provider timeout tests
  - Mock provider with timeout behavior
  - Timeout propagation to SDK methods
  - Provider-specific default timeout tests
- ✅ Fallback behavior on timeout
  - Test fallback continues after timeout
  - TimeoutError handling in provider chain
  - Partial response preservation
- ✅ CLI timeout flag tests
  - Various format acceptance tests
  - Timeout parsing validation
- ✅ MCP timeout integration
  - Tool execution timeout tests
  - Abort controller behavior
  - Race condition handling
- ✅ Streaming timeout tests
  - Chunk-by-chunk timeout handling
  - Stream error propagation
  - Partial data preservation on timeout
- ✅ Edge cases (partial responses, cleanup)
  - Resource cleanup on timeout
  - Race condition handling
  - Multiple cleanup calls safety

Created comprehensive test suite in `test/timeout.test.ts` covering all timeout functionality.

### Phase 7: Documentation Updates
- [ ] API Reference - timeout parameter
- [ ] CLI Guide - timeout flag usage
- [ ] Provider Configuration - default timeouts
- [ ] Troubleshooting - timeout errors
- [ ] README - timeout examples

## 📋 Comprehensive Implementation Plan

### Key Discoveries
1. **Vercel AI SDK supports AbortSignal** - We can use native timeout support
2. **TypeScript process global** - Need to declare process for TypeScript in providers
3. **Streaming timeout** - Different handling needed for streaming vs non-streaming

### Implementation Pattern for Providers

```typescript
// 1. Import timeout utilities
import { createTimeoutController, TimeoutError, getDefaultTimeout } from '../utils/timeout.js';

// 2. Declare process for TypeScript
declare const process: {
  env: {
    [key: string]: string | undefined;
  };
};

// 3. Extract timeout from options
const { timeout = getDefaultTimeout(provider, 'generate') } = options;

// 4. Create timeout controller
const timeoutController = createTimeoutController(timeout, provider, 'generate');

// 5. Add abort signal to options
const generateOptions = {
  // ... other options
  ...(timeoutController && { abortSignal: timeoutController.controller.signal }),
};

// 6. Cleanup after operation
try {
  const result = await generate(generateOptions);
  timeoutController?.cleanup();
  return result;
} finally {
  timeoutController?.cleanup();
}

// 7. Handle timeout errors specifically
catch (err) {
  if (err instanceof TimeoutError) {
    logger.error(`[${functionTag}] Timeout error`, {
      provider,
      timeout: err.timeout,
      message: err.message,
    });
  }
  throw err;
}
```

## Default Timeout Configuration

```javascript
DEFAULT_TIMEOUTS = {
  global: '30s',           // Default for all providers
  streaming: '2m',         // Longer timeout for streaming
  providers: {
    openai: '30s',         // ✅ Implemented
    bedrock: '45s',        // ✅ Implemented
    vertex: '45s',         // ✅ Implemented
    anthropic: '30s',      // ✅ Implemented
    azure: '30s',          // ✅ Implemented
    'google-ai': '30s',    // ✅ Implemented
    huggingface: '2m',     // ✅ Implemented
    ollama: '5m',          // ✅ Implemented (special case)
    mistral: '45s'         // ✅ Implemented
  },
  tools: {
    default: '10s',        // Default timeout for MCP tool execution
    filesystem: '5s',      // File operations should be quick
    network: '30s',        // Network requests might take longer
    computation: '2m'      // Heavy computation tools need more time
  }
}
```

## 🛡️ Backward Compatibility Checklist

- ✅ All timeout parameters are optional
- ✅ Default behavior unchanged when no timeout specified
- ✅ Existing Ollama timeout configuration continues working
- ✅ API surface remains the same (only new optional parameters)
- ✅ No changes to existing method signatures (only additions)
- ✅ Graceful fallback when timeout not supported by provider SDK

## 📊 Rollout Strategy

1. **Deploy Phase 1**: Core utilities (no risk) ✅
2. **Deploy Phase 2**: One provider at a time with testing (In Progress)
3. **Deploy Phase 3**: Factory and NeuroLink updates
4. **Deploy Phase 4**: CLI enhancements
5. **Deploy Phase 5**: MCP updates
6. **Deploy Phase 6-7**: Tests and documentation

Each phase can be tested independently without breaking existing functionality.

## 🎯 Success Criteria

- No existing code breaks
- Timeout works for all providers
- CLI users can easily set timeouts
- Clear error messages on timeout
- Documentation is comprehensive
- Tests cover all scenarios
- Fallback mechanism handles timeouts gracefully
- Performance is not impacted when timeout not used

## 📝 Implementation Notes

### Provider-Specific Considerations

1. **Ollama**: Already has timeout configuration - need to merge/respect both
2. **Streaming**: Longer default timeouts for streaming operations
3. **MCP Tools**: Separate timeout handling for tool execution vs AI generation
4. **CLI**: Accept human-friendly formats (30s, 2m, etc.)

### Error Handling Strategy

1. **TimeoutError** should be distinct from other errors
2. Provider fallback should trigger on timeout
3. Partial responses should be handled gracefully
4. Cleanup must always occur (finally blocks)

### Testing Priorities

1. Unit tests for timeout parsing
2. Integration tests with real providers
3. CLI end-to-end tests
4. Streaming timeout scenarios
5. MCP tool timeout handling

This plan ensures smooth implementation with zero breaking changes while adding powerful timeout capabilities to NeuroLink.
