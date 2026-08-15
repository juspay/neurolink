[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / langfuseShouldExportSpan

# Function: langfuseShouldExportSpan()

> **langfuseShouldExportSpan**(`__namedParameters`): `boolean`

Defined in: [services/server/ai/observability/instrumentation.ts:773](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/services/server/ai/observability/instrumentation.ts#L773)

Drop-in `shouldExportSpan` predicate for a `LangfuseSpanProcessor` that
filters out NeuroLink internal wrapper spans.

Usage in host apps:

```ts
import { langfuseShouldExportSpan } from "@juspay/neurolink";
new LangfuseSpanProcessor({ ..., shouldExportSpan: langfuseShouldExportSpan });
```

## Parameters

### \_\_namedParameters

#### otelSpan

\{ `attributes?`: `Record`\<`string`, `unknown`\>; \}

#### otelSpan.attributes?

`Record`\<`string`, `unknown`\>

## Returns

`boolean`
