# Batch Processing

## Problem

Processing many requests sequentially is slow and inefficient:

- High latency (wait for each request)
- Underutilized rate limits
- Poor resource usage
- Slow time-to-completion

Applications often need to process:

- Multiple documents
- Large datasets
- User-generated content
- Batch analytics

## Solution

Implement efficient batch processing with:

1. Concurrent request handling
2. Rate limit awareness
3. Progress tracking
4. Error recovery
5. Result aggregation

## Code

```typescript
import { NeuroLink } from "@juspay/neurolink";

type BatchConfig = {
  concurrency?: number; // Max parallel requests
  rateLimit?: number; // Max requests per second
  onProgress?: (completed: number, total: number) => void;
  onError?: (error: Error, item: any, index: number) => void;
  retryFailures?: boolean;
};

type BatchResult<T, R> = {
  results: R[];
  errors: Array<{ item: T; error: Error; index: number }>;
  duration: number;
  successRate: number;
};

class BatchProcessor {
  private neurolink: NeuroLink;

  constructor() {
    this.neurolink = new NeuroLink();
  }

  /**
   * Process items in batches with concurrency control
   */
  async processBatch<T, R>(
    items: T[],
    processFn: (item: T, index: number) => Promise<R>,
    config: BatchConfig = {},
  ): Promise<BatchResult<T, R>> {
    const {
      concurrency = 5,
      rateLimit = 10, // requests per second
      onProgress,
      onError,
      retryFailures = true,
    } = config;

    const startTime = Date.now();
    const results: R[] = new Array(items.length);
    const errors: Array<{ item: T; error: Error; index: number }> = [];

    let completed = 0;
    let inFlight = 0;
    let currentIndex = 0;

    const minDelay = 1000 / rateLimit; // ms between requests

    return new Promise((resolve) => {
      const processNext = async () => {
        if (currentIndex >= items.length && inFlight === 0) {
          // All done
          const duration = Date.now() - startTime;
          const successRate =
            (results.filter((r) => r !== undefined).length / items.length) *
            100;

          resolve({
            results,
            errors,
            duration,
            successRate,
          });
          return;
        }

        if (inFlight >= concurrency || currentIndex >= items.length) {
          return;
        }

        const index = currentIndex++;
        const item = items[index];
        inFlight++;

        try {
          const result = await processFn(item, index);
          results[index] = result;

          completed++;
          onProgress?.(completed, items.length);
        } catch (error: any) {
          errors.push({ item, error, index });
          onError?.(error, item, index);

          if (retryFailures) {
            // Add to end of queue for retry
            items.push(item);
          }
        } finally {
          inFlight--;

          // Rate limiting
          await new Promise((r) => setTimeout(r, minDelay));

          processNext();
        }

        processNext();
      };

      // Start concurrent workers
      for (let i = 0; i < concurrency; i++) {
        processNext();
      }
    });
  }

  /**
   * Process text items with AI
   */
  async processTexts(
    texts: string[],
    prompt: string,
    config: BatchConfig & { provider?: string } = {},
  ): Promise<BatchResult<string, string>> {
    return this.processBatch(
      texts,
      async (text, index) => {
        const result = await this.neurolink.generate({
          input: { text: `${prompt}\n\n${text}` },
          provider: config.provider || "anthropic",
          model: "claude-3-haiku-20240307", // Fast, cheap model
        });

        return result.content;
      },
      config,
    );
  }

  /**
   * Process with structured output
   */
  async processStructured<T>(
    items: string[],
    prompt: string,
    schema: any,
    config: BatchConfig = {},
  ): Promise<BatchResult<string, T>> {
    return this.processBatch(
      items,
      async (item) => {
        const result = await this.neurolink.generate({
          input: { text: `${prompt}\n\n${item}` },
          provider: "openai",
          structuredOutput: { type: "json", schema },
        });

        return JSON.parse(result.content) as T;
      },
      config,
    );
  }

  /**
   * Process files in parallel
   */
  async processFiles(
    filePaths: string[],
    processFn: (content: string, path: string) => Promise<any>,
    config: BatchConfig = {},
  ) {
    const fs = await import("fs/promises");

    return this.processBatch(
      filePaths,
      async (path, index) => {
        const content = await fs.readFile(path, "utf-8");
        return processFn(content, path);
      },
      config,
    );
  }
}

// Usage Example 1: Sentiment Analysis
async function example1_SentimentAnalysis() {
  const processor = new BatchProcessor();

  const reviews = [
    "This product is amazing! Highly recommend.",
    "Terrible quality, waste of money.",
    "It's okay, nothing special.",
    "Best purchase I've made this year!",
    "Disappointed, expected much better.",
  ];

  console.log("=== Sentiment Analysis ===");

  const result = await processor.processTexts(
    reviews,
    "Classify the sentiment of this review as positive, negative, or neutral. Return only the sentiment.",
    {
      concurrency: 3,
      rateLimit: 5,
      onProgress: (completed, total) => {
        console.log(
          `Progress: ${completed}/${total} (${((completed / total) * 100).toFixed(0)}%)`,
        );
      },
    },
  );

  console.log("\n✅ Results:");
  result.results.forEach((sentiment, i) => {
    console.log(`  ${i + 1}. ${reviews[i].slice(0, 30)}... → ${sentiment}`);
  });

  console.log(`\n📊 Stats:`);
  console.log(`  Duration: ${result.duration}ms`);
  console.log(`  Success rate: ${result.successRate.toFixed(1)}%`);
  console.log(`  Errors: ${result.errors.length}`);
}

// Example 2: Data Extraction
type ProductInfo = {
  name: string;
  price: number;
  category: string;
};

const productSchema = {
  type: "object",
  properties: {
    name: { type: "string" },
    price: { type: "number" },
    category: { type: "string" },
  },
  required: ["name", "price", "category"],
};

async function example2_DataExtraction() {
  const processor = new BatchProcessor();

  const descriptions = [
    "The UltraBook Pro laptop costs $1299 and is perfect for professionals.",
    "Get the SmartWatch X for only $299 - the best fitness tracker available.",
    "Premium wireless headphones, $199, audiophile quality sound.",
  ];

  console.log("\n=== Data Extraction ===");

  const result = await processor.processStructured<ProductInfo>(
    descriptions,
    "Extract product information:",
    productSchema,
    {
      concurrency: 2,
      rateLimit: 3,
    },
  );

  console.log("\n✅ Extracted Products:");
  result.results.forEach((product, i) => {
    console.log(
      `  ${i + 1}. ${product.name} - $${product.price} (${product.category})`,
    );
  });
}

// Example 3: Document Summarization
async function example3_DocumentSummarization() {
  const processor = new BatchProcessor();

  const documents = [
    "Long document about artificial intelligence and machine learning...",
    "Article discussing climate change impacts on global economy...",
    "Research paper on quantum computing applications in cryptography...",
  ];

  console.log("\n=== Document Summarization ===");

  let startTime = Date.now();

  const result = await processor.processTexts(
    documents,
    "Summarize this in 1-2 sentences:",
    {
      concurrency: 3,
      rateLimit: 10,
      onProgress: (completed, total) => {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`Progress: ${completed}/${total} (${elapsed}s)`);
      },
      onError: (error, item, index) => {
        console.error(`❌ Error processing item ${index}:`, error.message);
      },
    },
  );

  console.log("\n✅ Summaries:");
  result.results.forEach((summary, i) => {
    console.log(`  ${i + 1}. ${summary}`);
  });
}

// Main
async function main() {
  await example1_SentimentAnalysis();
  await example2_DataExtraction();
  await example3_DocumentSummarization();
}

main();
```

## Explanation

### 1. Concurrency Control

Process multiple requests simultaneously:

```typescript
concurrency: 5; // 5 requests in parallel
```

Benefits:

- 5x faster than sequential
- Efficient resource usage
- Respects provider limits

### 2. Rate Limiting

Prevent exceeding provider rate limits:

```typescript
rateLimit: 10  // 10 requests per second
minDelay = 1000 / 10 = 100ms between requests
```

### 3. Progress Tracking

Monitor batch processing in real-time:

```typescript
onProgress: (completed, total) => {
  console.log(`${completed}/${total} (${percentage}%)`);
};
```

### 4. Error Handling

Individual failures don't stop the batch:

```typescript
onError: (error, item, index) => {
  // Log, retry, or skip
};
```

### 5. Retry Logic

Automatically retry failed items:

```typescript
retryFailures: true; // Add to queue end
```

## Variations

### Chunked Batch Processing

Process very large datasets in chunks:

```typescript
async function processInChunks<T, R>(
  items: T[],
  chunkSize: number,
  processFn: (items: T[]) => Promise<R[]>,
): Promise<R[]> {
  const results: R[] = [];

  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    console.log(`Processing chunk ${i / chunkSize + 1}...`);

    const chunkResults = await processFn(chunk);
    results.push(...chunkResults);

    // Break between chunks
    await new Promise((r) => setTimeout(r, 1000));
  }

  return results;
}

// Usage
const results = await processInChunks(allItems, 100, async (chunk) =>
  processor.processBatch(chunk, processFn).then((r) => r.results),
);
```

### Priority Queue

Process high-priority items first:

```typescript
type PriorityItem<T> = {
  item: T;
  priority: number;
};

async function processPriorityBatch<T, R>(
  items: PriorityItem<T>[],
  processFn: (item: T) => Promise<R>,
) {
  // Sort by priority (higher first)
  const sorted = items.sort((a, b) => b.priority - a.priority);

  return processor.processBatch(
    sorted.map((p) => p.item),
    processFn,
  );
}
```

### Result Streaming

Stream results as they complete:

```typescript
async function* processBatchStreaming<T, R>(
  items: T[],
  processFn: (item: T) => Promise<R>,
): AsyncIterable<{ index: number; result: R }> {
  const promises = items.map((item, index) =>
    processFn(item).then((result) => ({ index, result })),
  );

  for (const promise of promises) {
    yield await promise;
  }
}

// Usage
for await (const { index, result } of processBatchStreaming(items, processFn)) {
  console.log(`Completed item ${index}:`, result);
}
```

### Cost Tracking

Track costs per batch:

```typescript
class CostTrackingProcessor extends BatchProcessor {
  private totalCost = 0;

  async processBatch<T, R>(
    items: T[],
    processFn: Function,
    config: BatchConfig,
  ) {
    const startCost = this.totalCost;

    const result = await super.processBatch(
      items,
      async (item, index) => {
        const result = await processFn(item, index);

        // Estimate cost (rough)
        const cost = 0.001; // $0.001 per request
        this.totalCost += cost;

        return result;
      },
      config,
    );

    const batchCost = this.totalCost - startCost;
    console.log(`💰 Batch cost: $${batchCost.toFixed(4)}`);

    return result;
  }
}
```

## Performance Comparison

| Approach            | 100 Items | 1000 Items | Notes               |
| ------------------- | --------- | ---------- | ------------------- |
| **Sequential**      | 200s      | 2000s      | Baseline            |
| **Concurrency: 5**  | 40s       | 400s       | 5x faster           |
| **Concurrency: 10** | 20s       | 200s       | 10x faster          |
| **Concurrency: 20** | 15s       | 150s       | May hit rate limits |

## Best Practices

1. **Start conservative**: Begin with low concurrency (3-5)
2. **Monitor rate limits**: Track 429 errors
3. **Implement retries**: Handle transient failures
4. **Track progress**: Show completion status
5. **Use cheap models**: Batch processing doesn't need GPT-4
6. **Cache results**: Save completed work
7. **Handle partial failures**: Don't block on errors

## See Also

- [Rate Limit Handling](rate-limit-handling.md)
- [Cost Optimization](cost-optimization.md)
- [Error Recovery](error-recovery.md)
- [Structured Output](structured-output.md)
