[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / EvaluationSpanAttributes

# Type Alias: EvaluationSpanAttributes

> **EvaluationSpanAttributes** = `Record`\<`string`, `string` \| `number` \| `boolean`\>

Defined in: [types/evaluation.ts:708](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/evaluation.ts#L708)

Flat span attribute map used by the evaluation observability layer.
Named EvaluationSpanAttributes to disambiguate from the richer telemetry
SpanAttributes in span.ts (§Rule 9 domain prefix).
