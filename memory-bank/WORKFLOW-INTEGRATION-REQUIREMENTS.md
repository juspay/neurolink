# Workflow Engine Integration Requirements

## Current State

The workflow engine is fully implemented and tested with:

- ✅ 9 predefined workflows (consensus, fallback, multi-judge, adaptive)
- ✅ Ensemble execution with parallel model coordination
- ✅ Judge-based response evaluation and scoring
- ✅ Score extraction bug fixed (handles failed responses correctly)
- ✅ End-to-end testing with Azure OpenAI

**Current Implementation:**

- Workflows are accessed via separate functions: `registerWorkflow()`, `runWorkflow()`, `listWorkflows()`, `getWorkflow()`
- Standalone workflow execution outside of standard `generate()` and `generateStream()` methods
- Single response output (best response selected by judge)

## Required Changes

### 1. Integrate Workflows into Generate/Stream Methods

**Current:** Workflows are separate functions  
**Required:** Workflows should be triggerable from within `generate()` and `generateStream()` methods

```typescript
// Example desired API:
await neurolink.generate({
  prompt: "Design a rate limiting system",
  workflow: "consensus-3",  // ← New parameter
  // OR
  workflowConfig: { ... }   // ← Inline workflow config
});
```

### 2. Dual Response Output

**Current:** Returns only the best response selected by judge  
**Required:** Return BOTH responses:

1. **Original Response:** The raw best response from the ensemble (unprocessed)
2. **Processed Response:** The response after workflow processing/conditioning

```typescript
// Desired return structure:
{
  // Original best response (unchanged)
  content: "...",

  // Workflow-specific data
  workflow: {
    originalResponse: "...",      // Raw best response
    processedResponse: "...",     // After conditioning/processing
    ensembleResponses: [...],     // All model responses
    judgeScores: {...},           // Evaluation scores
    selectedModel: "...",         // Which model won
    metrics: {...}                // Performance metrics
  }
}
```

## Technical Context

### Key Files

1. **Core Implementation:**
   - `src/lib/workflow/core/workflowRunner.ts` - Main execution orchestration
   - `src/lib/workflow/core/ensembleExecutor.ts` - Parallel model execution
   - `src/lib/workflow/core/judgeScorer.ts` - Response evaluation
   - `src/lib/workflow/core/responseConditioner.ts` - Response processing (stub)

2. **Main Entry Points:**
   - `src/lib/neurolink.ts` - Main SDK class (needs workflow integration)
   - `src/lib/workflow/index.ts` - Workflow exports

3. **Type Definitions:**
   - `src/lib/workflow/types.ts` - WorkflowConfig, WorkflowResult types
   - `src/lib/workflow/core/types/` - All workflow-related types

### Current Workflow Flow

```
1. User calls runWorkflow(workflowId, options)
2. WorkflowRunner.runWorkflow() executes:
   a. executeModels() → parallel model execution
   b. scoreResponses() → judge evaluation
   c. selectBestResponse() → pick winner
   d. conditionFinalResponse() → process (currently stub)
3. Returns WorkflowResult with best response
```

### Score Extraction Fix (CRITICAL)

**Bug was:** Judge scores only successful responses as `response-0`, `response-1`, etc., but lookup was using original array indices (including failed responses).

**Fix in `getResponseScore()`:**

```typescript
// Filter to successful responses first, then find index
const successfulResponses = responses.filter((r) => r.status === "success");
const successfulIndex = successfulResponses.indexOf(response);
const indexKey = `response-${successfulIndex}`;
return scores.scores[indexKey];
```

This ensures correct score mapping when some models fail/timeout.

## Implementation Strategy

### Phase 1: Add Workflow Parameters to Generate/Stream

1. Add optional `workflow` and `workflowConfig` parameters to `GenerateOptions`
2. Detect workflow usage in `generate()` and `generateStream()`
3. Route to workflow execution if workflow parameter present

### Phase 2: Modify Return Structure

1. Update return types to include `workflow` object
2. Preserve original `content` field for backward compatibility
3. Add `workflow.originalResponse` and `workflow.processedResponse`

### Phase 3: Implement Response Conditioning

1. Currently `conditionFinalResponse()` is a stub
2. Implement actual conditioning logic if needed
3. Ensure `originalResponse` is preserved before conditioning

### Phase 4: Streaming Support

1. Design how workflows work with streaming
2. Options:
   - Buffer all responses, then evaluate (simple but delays)
   - Stream best model first, evaluate in background (complex)
   - Hybrid: stream primary, switch if judge picks different model

## Test Coverage

- ✅ `test-workflow-azure.mjs` - Full end-to-end test with Azure OpenAI
- ✅ `test-score-mapping.mjs` - Unit test for score extraction logic
- ✅ `src/lib/workflow/__tests__/workflow.test.ts` - Unit tests for workflows

## Edge Cases to Handle

1. **Partial Failures:** Some models timeout → judge evaluates only successful responses
2. **All Failures:** All models fail → fallback behavior needed
3. **Streaming Interruption:** User cancels mid-stream
4. **Score Tie:** Multiple responses with same score → tiebreaker logic
5. **No Judge Configured:** Workflow without judge → how to select best?

## Backward Compatibility

- Existing `generate()` calls without workflow parameter must continue working
- Current standalone workflow functions should remain available
- No breaking changes to existing types/interfaces

## Performance Considerations

- Workflows add latency (multiple models + judge evaluation)
- Consider caching workflow configurations
- Parallel execution already implemented for models
- Judge evaluation is sequential (necessary for comparison)

## Success Criteria

1. ✅ Can trigger workflows from `generate()` and `generateStream()`
2. ✅ Returns both original and processed responses
3. ✅ Backward compatible with existing code
4. ✅ All tests passing
5. ✅ Proper error handling for edge cases
6. ✅ Documentation updated
