# RAG Processing - Testing Guide

## Prerequisites

### Environment Setup

1. **Node.js**: Version 18+ required
2. **pnpm**: Package manager (install with `npm install -g pnpm`)
3. **TypeScript**: Included in devDependencies

### Build Requirements

Before running tests, ensure the project is built:

```bash
# Full build
pnpm run build

# Or build only what's needed for tests
pnpm run build:cli
```

### Environment Variables

No specific environment variables are required for RAG processing unit tests.

For integration tests with external services (e.g., Cohere reranking), you may need:

```bash
# Optional - for Cohere reranker tests
export COHERE_API_KEY=your_api_key

# Optional - for LLM-based reranking tests
export OPENAI_API_KEY=your_api_key
```

## Running Tests

### Run RAG Test Suite

```bash
# Run the continuous RAG test suite
pnpm exec tsx test/continuous-test-suite-rag.ts

# With verbose output
VERBOSE=true pnpm exec tsx test/continuous-test-suite-rag.ts
```

### Run Unit Tests (Vitest)

```bash
# Run all RAG-related unit tests
pnpm test test/rag/

# Run specific test files
pnpm test test/rag/ChunkerFactory.test.ts
pnpm test test/rag/ChunkerRegistry.test.ts

# Run with coverage
pnpm run test:coverage -- --include=src/lib/rag/
```

### Run Integration Tests

```bash
# Run RAG integration tests
pnpm test test/rag/integration/

# Run all integration tests
pnpm run test:integration
```

## Test Structure

### Test Suite Organization

```
test/
├── continuous-test-suite-rag.ts    # Main RAG continuous test suite
├── rag/
│   ├── ChunkerFactory.test.ts      # ChunkerFactory unit tests
│   ├── ChunkerRegistry.test.ts     # ChunkerRegistry unit tests
│   ├── integration/
│   │   └── ...                     # Integration tests
│   └── resilience/
│       └── ...                     # Resilience pattern tests
└── fixtures/
    └── rag/
        ├── sample-documents.txt    # Sample text for chunking
        ├── chunker-config.json     # Chunker configurations
        ├── search-queries.json     # Search test queries
        └── reranker-config.json    # Reranker configurations
```

### Test Categories

1. **Chunker Tests**
   - Factory pattern tests
   - Registry pattern tests
   - All 10 chunking strategies
   - Alias resolution
   - Metadata retrieval

2. **Reranker Tests**
   - Factory pattern tests
   - Registry pattern tests
   - Simple reranking
   - Alias resolution
   - Model-free rerankers

3. **Hybrid Search Tests**
   - BM25 indexing and search
   - Reciprocal Rank Fusion (RRF)
   - Linear combination
   - Score normalization

4. **Integration Tests**
   - End-to-end chunking pipeline
   - Multiple chunker comparison
   - Error handling

## Expected Results

### Chunker Strategies Tested

| Strategy          | Description                 | Test Coverage |
| ----------------- | --------------------------- | ------------- |
| character         | Fixed-size character chunks | Full          |
| recursive         | Paragraph/sentence-based    | Full          |
| sentence          | Sentence boundary splitting | Full          |
| token             | Token-based (GPT tokenizer) | Full          |
| markdown          | Header-aware markdown       | Full          |
| html              | HTML tag-aware              | Full          |
| json              | JSON structure-aware        | Full          |
| latex             | LaTeX section-aware         | Full          |
| semantic          | Semantic similarity-based   | Full          |
| semantic-markdown | Semantic markdown           | Full          |

### Reranker Types Tested

| Type          | Description             | Requires Model |
| ------------- | ----------------------- | -------------- |
| simple        | Position + vector score | No             |
| llm           | LLM semantic scoring    | Yes            |
| cross-encoder | Cross-encoder model     | Yes            |
| cohere        | Cohere Rerank API       | Yes (API)      |
| batch         | Batch LLM reranking     | Yes            |

## Troubleshooting

### Common Issues

1. **Module not found errors**

   ```bash
   # Ensure build is up to date
   pnpm run build
   ```

2. **Timeout errors**
   - Increase timeout in TEST_CONFIG
   - Check for slow file I/O

3. **Memory issues with large documents**
   - Reduce chunk size in config
   - Process documents in batches

### Debug Mode

Enable verbose logging:

```bash
VERBOSE=true DEBUG=neurolink:rag:* pnpm exec tsx test/continuous-test-suite-rag.ts
```

## Adding New Tests

### Adding a Chunker Test

```typescript
// In continuous-test-suite-rag.ts
const newChunkerTest = async (): Promise<boolean> => {
  const chunker = await createChunker("new-strategy", { maxSize: 500 });
  const chunks = await chunker.chunk(testText, { maxSize: 500 });
  // Validate chunks...
  return true;
};
```

### Adding a Reranker Test

```typescript
// In continuous-test-suite-rag.ts
const newRerankerTest = async (): Promise<boolean> => {
  const reranker = await createReranker("new-type", { topK: 3 });
  const results = await reranker.rerank(mockResults, query);
  // Validate results...
  return true;
};
```

## See Also

- [RAG Feature Guide](../features/rag.md) - Main RAG documentation
- [RAG Configuration](./configuration) - Detailed configuration options
