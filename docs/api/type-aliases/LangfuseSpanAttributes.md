[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / LangfuseSpanAttributes

# Type Alias: LangfuseSpanAttributes

> **LangfuseSpanAttributes** = `object`

Defined in: [types/observability.ts:40](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/observability.ts#L40)

Standard GenAI semantic convention attributes from OpenTelemetry
These are the attributes that Vercel AI SDK's experimental_telemetry creates

## See

https://opentelemetry.io/docs/specs/semconv/gen-ai/

## Indexable

> \[`key`: `string`\]: `AttributeValue` \| `undefined`

## Properties

### gen_ai.system?

> `optional` **gen_ai.system?**: `string`

Defined in: [types/observability.ts:42](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/observability.ts#L42)

---

### gen_ai.request.model?

> `optional` **gen_ai.request.model?**: `string`

Defined in: [types/observability.ts:43](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/observability.ts#L43)

---

### gen_ai.response.model?

> `optional` **gen_ai.response.model?**: `string`

Defined in: [types/observability.ts:44](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/observability.ts#L44)

---

### gen_ai.request.max_tokens?

> `optional` **gen_ai.request.max_tokens?**: `number`

Defined in: [types/observability.ts:45](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/observability.ts#L45)

---

### gen_ai.request.temperature?

> `optional` **gen_ai.request.temperature?**: `number`

Defined in: [types/observability.ts:46](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/observability.ts#L46)

---

### gen_ai.request.top_p?

> `optional` **gen_ai.request.top_p?**: `number`

Defined in: [types/observability.ts:47](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/observability.ts#L47)

---

### gen_ai.usage.input_tokens?

> `optional` **gen_ai.usage.input_tokens?**: `number`

Defined in: [types/observability.ts:48](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/observability.ts#L48)

---

### gen_ai.usage.output_tokens?

> `optional` **gen_ai.usage.output_tokens?**: `number`

Defined in: [types/observability.ts:49](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/observability.ts#L49)

---

### gen_ai.usage.total_tokens?

> `optional` **gen_ai.usage.total_tokens?**: `number`

Defined in: [types/observability.ts:50](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/observability.ts#L50)

---

### gen_ai.response.finish_reasons?

> `optional` **gen_ai.response.finish_reasons?**: `string`[]

Defined in: [types/observability.ts:51](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/observability.ts#L51)

---

### gen_ai.prompt?

> `optional` **gen_ai.prompt?**: `string`

Defined in: [types/observability.ts:52](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/observability.ts#L52)

---

### gen_ai.completion?

> `optional` **gen_ai.completion?**: `string`

Defined in: [types/observability.ts:53](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/observability.ts#L53)

---

### ai.model.id?

> `optional` **ai.model.id?**: `string`

Defined in: [types/observability.ts:56](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/observability.ts#L56)

---

### ai.model.provider?

> `optional` **ai.model.provider?**: `string`

Defined in: [types/observability.ts:57](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/observability.ts#L57)

---

### ai.operationId?

> `optional` **ai.operationId?**: `string`

Defined in: [types/observability.ts:58](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/observability.ts#L58)

---

### ai.telemetry.functionId?

> `optional` **ai.telemetry.functionId?**: `string`

Defined in: [types/observability.ts:59](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/observability.ts#L59)

---

### ai.finishReason?

> `optional` **ai.finishReason?**: `string`

Defined in: [types/observability.ts:60](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/observability.ts#L60)

---

### ai.usage.promptTokens?

> `optional` **ai.usage.promptTokens?**: `number`

Defined in: [types/observability.ts:61](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/observability.ts#L61)

---

### ai.usage.completionTokens?

> `optional` **ai.usage.completionTokens?**: `number`

Defined in: [types/observability.ts:62](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/observability.ts#L62)
