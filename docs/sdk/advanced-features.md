# Advanced SDK Features

Advanced features and capabilities of the NeuroLink SDK.

## Advanced Configuration

### Custom Providers

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink({
  providers: {
    custom: {
      endpoint: "https://api.custom.com",
      apiKey: process.env.CUSTOM_API_KEY,
    },
  },
});
```

### Advanced Streaming

```typescript
const stream = neurolink.generateStream({
  prompt: "Write a story",
  onChunk: (chunk) => console.log(chunk),
  onComplete: (result) => console.log("Done:", result),
  onError: (error) => console.error("Error:", error),
});
```

## Performance Optimization

### Caching

```typescript
const result = await neurolink.generate({
  prompt: "Hello world",
  cache: true,
  cacheTTL: 300000, // 5 minutes
});
```

### Batching

```typescript
const results = await neurolink.generateBatch([
  { prompt: "First prompt" },
  { prompt: "Second prompt" },
  { prompt: "Third prompt" },
]);
```

For more examples, see [Advanced Examples](../examples/advanced.md).
