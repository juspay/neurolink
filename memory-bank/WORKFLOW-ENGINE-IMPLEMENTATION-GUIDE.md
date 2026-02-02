# Workflow Engine - Implementation Reference

## Design Documents (READ FIRST)

- **HLD**: `docs/WORKFLOW-ENGINE-HLD.md` (794 lines) - Architecture, components, workflows
- **LLD**: `docs/WORKFLOW-ENGINE-LLD.md` (1,984 lines) - Complete implementation specs

## Testing Phase Scope

### Build

✅ Multi-model ensemble (parallel execution)  
✅ Judge scoring (0-100 scale + reasoning)  
✅ Comprehensive logging (AB testing metrics)  
✅ Original output (NO content modification)  
✅ 4 built-in workflows

### Defer

❌ Response conditioning  
❌ Streaming  
❌ Caching

## Output Format

```typescript
WorkflowResult {
  content: string;        // ORIGINAL (unchanged)
  score: number;          // 0-100
  reasoning: string;      // Short summary
  ensembleResponses: EnsembleResponse[];
  judgeScores: JudgeScores;
  confidence: number;
  // + comprehensive metrics
}
```

## File Structure (~3,000 lines)

```text
src/lib/workflow/
├── index.ts                    (60 lines)
├── types.ts                    (250 lines)
├── config.ts                   (150 lines)
├── core/
│   ├── workflowRunner.ts      (400 lines) - Main orchestrator
│   ├── ensembleExecutor.ts    (300 lines) - Parallel execution
│   ├── judgeScorer.ts         (350 lines) - Scoring logic
│   ├── workflowRegistry.ts    (200 lines)
│   └── responseConditioner.ts (50 lines) - STUB only
├── workflows/
│   ├── consensusWorkflow.ts   (200 lines) - consensus-3
│   ├── fallbackWorkflow.ts    (150 lines) - fast-fallback
│   ├── multiJudgeWorkflow.ts  (250 lines) - multi-judge-5
│   └── adaptiveWorkflow.ts    (200 lines) - quality-max
└── utils/
    ├── workflowValidation.ts  (250 lines)
    └── workflowMetrics.ts     (150 lines)
```

## Integration Points

### Use Existing

- `AIProviderFactory.createProvider()` - Create provider instances
- `BaseProvider.generate()` - Execute model
- `logger` from `src/lib/utils/logger.ts` - Logging
- `p-limit` - Concurrency control (already in package.json)

### Modify

- `src/lib/neurolink.ts` - Add workflow methods:
  ```typescript
  async generateWorkflow(options: WorkflowGenerateOptions): Promise<WorkflowResult>
  registerWorkflow(config: WorkflowConfig): void
  listWorkflows(): WorkflowConfig[]
  getWorkflow(id: string): WorkflowConfig | undefined
  ```
- `src/lib/index.ts` - Export workflow types

## Key Algorithms

### Judge Prompt (judgeScorer.ts)

```typescript
// Judge must return structured JSON:
{
  "scores": { "response-0": 85, "response-1": 92 },
  "ranking": ["response-1", "response-0"],
  "bestResponse": "response-1",
  "reasoning": "Clear explanation with good examples"
}
```

### Comprehensive Logging (workflowRunner.ts)

```typescript
logger.info("Workflow execution complete", {
  workflowId,
  score,
  reasoning,
  selectedModel,
  allScores,
  modelsSuccessful,
  totalTime,
  ensembleTime,
  judgeTime,
  confidence,
  consensus,
  // ALL metrics for AB testing
});
```

### Error Handling

- Model failures → `status: 'failure'` (don't fail workflow)
- Continue if `minResponses` threshold met
- Retry per `ExecutionConfig.retries`

## Built-in Workflows

### 1. consensus-3

- Models: GPT-4o, Claude 3.5 Sonnet, Gemini 2.5 Flash
- Judge: GPT-4o (criteria: accuracy, clarity, completeness, depth)
- Temp: 0.3 (models), 0.1 (judge)

### 2. fast-fallback

- Models: GPT-4o-mini → Claude 3.5 Haiku (chain)
- No judge, early termination

### 3. quality-max

- Models: GPT-4o, Claude 3.5 Sonnet
- Judge: Claude 3.5 Sonnet (5 criteria, strict)

### 4. multi-judge-5

- Models: GPT-4o, Claude 3.5, Gemini 2.5
- Judges: GPT-4o + Claude 3.5 (voting consensus)

## Implementation Phases

### Phase 1: Foundation

1. `types.ts` - All interfaces from LLD
2. `config.ts` - Zod schemas, defaults
3. `workflowRegistry.ts` - Registry
4. `workflowValidation.ts` - Validation

### Phase 2: Execution

5. `ensembleExecutor.ts` - Parallel model execution
6. `judgeScorer.ts` - Judge scoring + parsing
7. `responseConditioner.ts` - Stub (returns unchanged)
8. `workflowRunner.ts` - Orchestrator

### Phase 3: Workflows

9-12. Create all 4 built-in workflows

### Phase 4: Integration

13. `index.ts` - Exports
14. Modify `neurolink.ts` - Add methods
15. Modify `lib/index.ts` - Export types

### Phase 5: Metrics & Tests

16. `workflowMetrics.ts`
17. Unit tests (>80% coverage)
18. Integration test (end-to-end)

## Critical Rules

1. **Never modify response content** - original only
2. **Fixed 0-100 scale** - not configurable
3. **Always include reasoning** - required
4. **Comprehensive logs** - every metric
5. **Follow existing patterns** - check `baseProvider.ts`, `factory.ts`

## Testing

- Test model failures, timeouts, retries
- Test judge JSON parsing
- Test workflow validation
- Integration test with real providers

## Success Criteria

- [ ] 13 files created
- [ ] 4 workflows registered
- [ ] `generateWorkflow()` works end-to-end
- [ ] Returns score/reasoning
- [ ] Comprehensive logging
- [ ] Tests pass (>80% coverage)
