[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / EvaluationSpanAttributes

# Type Alias: EvaluationSpanAttributes

> **EvaluationSpanAttributes** = `Record`\<`string`, `string` \| `number` \| `boolean`\>

Defined in: [types/evaluation.ts:713](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L713)

Flat span attribute map used by the evaluation observability layer.
Named EvaluationSpanAttributes to disambiguate from the richer telemetry
SpanAttributes in span.ts (§Rule 9 domain prefix).
