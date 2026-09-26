[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / langfuseShouldExportSpan

# Function: langfuseShouldExportSpan()

> **langfuseShouldExportSpan**(`__namedParameters`): `boolean`

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
