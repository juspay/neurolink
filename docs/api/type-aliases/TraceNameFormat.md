[**NeuroLink API Reference v8.42.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / TraceNameFormat

# Type Alias: TraceNameFormat

> **TraceNameFormat** = `"userId:operationName"` \| `"operationName:userId"` \| `"operationName"` \| `"userId"` \| `(context: { userId?: string; operationName?: string }) => string`

Defined in: [types/observability.ts:25](https://github.com/juspay/neurolink/blob/main/src/lib/types/observability.ts#L25)

Trace name format for Langfuse traces.

Controls how `userId` and `operationName` are combined to form the trace name.
Can be a predefined format string or a custom function for full control.

## Predefined Format Options

| Format                   | Example Output                   | Description                                                         |
| ------------------------ | -------------------------------- | ------------------------------------------------------------------- |
| `"userId:operationName"` | `"user@email.com:ai.streamText"` | Default format. User first, then operation.                         |
| `"operationName:userId"` | `"ai.streamText:user@email.com"` | Operation first, then user. Useful for operation-centric filtering. |
| `"operationName"`        | `"ai.streamText"`                | Operation name only. User ID not included in trace name.            |
| `"userId"`               | `"user@email.com"`               | User ID only. Legacy behavior, operation name not included.         |

## Custom Function Format

For full control over trace naming, provide a function that receives the context:

```typescript
type CustomFormat = (context: {
  userId?: string;
  operationName?: string;
}) => string;
```

## Examples

### Using predefined formats

```typescript
import { NeuroLink } from "@juspay/neurolink";

// Default: userId:operationName
const neurolink1 = new NeuroLink({
  observability: {
    langfuse: {
      enabled: true,
      publicKey: "pk-...",
      secretKey: "sk-...",
      traceNameFormat: "userId:operationName",
    },
  },
});
// Trace name: "user@email.com:ai.streamText"

// Operation-centric naming
const neurolink2 = new NeuroLink({
  observability: {
    langfuse: {
      enabled: true,
      publicKey: "pk-...",
      secretKey: "sk-...",
      traceNameFormat: "operationName:userId",
    },
  },
});
// Trace name: "ai.streamText:user@email.com"

// Operation only (no user in trace name)
const neurolink3 = new NeuroLink({
  observability: {
    langfuse: {
      enabled: true,
      publicKey: "pk-...",
      secretKey: "sk-...",
      traceNameFormat: "operationName",
    },
  },
});
// Trace name: "ai.streamText"

// Legacy behavior (user only)
const neurolink4 = new NeuroLink({
  observability: {
    langfuse: {
      enabled: true,
      publicKey: "pk-...",
      secretKey: "sk-...",
      traceNameFormat: "userId",
    },
  },
});
// Trace name: "user@email.com"
```

### Using a custom function

```typescript
import { NeuroLink } from "@juspay/neurolink";

// Custom format with brackets
const neurolink = new NeuroLink({
  observability: {
    langfuse: {
      enabled: true,
      publicKey: "pk-...",
      secretKey: "sk-...",
      traceNameFormat: (ctx) =>
        `[${ctx.operationName || "unknown"}] ${ctx.userId || "anonymous"}`,
    },
  },
});
// Trace name: "[ai.streamText] user@email.com"
```

### Custom function with environment prefix

```typescript
import { NeuroLink } from "@juspay/neurolink";

const env = process.env.NODE_ENV || "dev";

const neurolink = new NeuroLink({
  observability: {
    langfuse: {
      enabled: true,
      publicKey: "pk-...",
      secretKey: "sk-...",
      environment: env,
      traceNameFormat: (ctx) => {
        const parts = [env];
        if (ctx.operationName) parts.push(ctx.operationName);
        if (ctx.userId) parts.push(ctx.userId);
        return parts.join(":");
      },
    },
  },
});
// Trace name: "prod:ai.streamText:user@email.com"
```

### Handling missing values

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink({
  observability: {
    langfuse: {
      enabled: true,
      publicKey: "pk-...",
      secretKey: "sk-...",
      traceNameFormat: (ctx) => {
        // Handle cases where operationName or userId might be undefined
        if (ctx.operationName && ctx.userId) {
          return `${ctx.userId}/${ctx.operationName}`;
        }
        if (ctx.operationName) {
          return ctx.operationName;
        }
        return ctx.userId || "trace";
      },
    },
  },
});
```

## Fallback Behavior

When `operationName` is not available (e.g., auto-detection is disabled and no explicit name is set),
predefined formats that include `operationName` will fall back gracefully:

- `"userId:operationName"` falls back to `"userId"`
- `"operationName:userId"` falls back to `"userId"`
- `"operationName"` falls back to `"userId"`

## See Also

- [LangfuseConfig](./LangfuseConfig.md) - Configuration options including `traceNameFormat`
- [setLangfuseContext](../functions/setLangfuseContext.md) - Set operation name per-context
