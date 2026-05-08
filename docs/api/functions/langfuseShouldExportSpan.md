[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / langfuseShouldExportSpan

# Function: langfuseShouldExportSpan()

> **langfuseShouldExportSpan**(`__namedParameters`): `boolean`

Defined in: [services/server/ai/observability/instrumentation.ts:782](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/services/server/ai/observability/instrumentation.ts#L782)

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
