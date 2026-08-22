[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnalyticsData

# Type Alias: AnalyticsData

> **AnalyticsData** = `object`

Defined in: [types/analytics.ts:35](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/analytics.ts#L35)

Analytics data structure (consolidated from core analytics)

## Properties

### provider

> **provider**: `string`

Defined in: [types/analytics.ts:36](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/analytics.ts#L36)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/analytics.ts:37](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/analytics.ts#L37)

---

### tokenUsage

> **tokenUsage**: [`TokenUsage`](TokenUsage.md)

Defined in: [types/analytics.ts:38](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/analytics.ts#L38)

---

### requestDuration

> **requestDuration**: `number`

Defined in: [types/analytics.ts:39](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/analytics.ts#L39)

---

### timestamp

> **timestamp**: `string`

Defined in: [types/analytics.ts:40](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/analytics.ts#L40)

---

### cost?

> `optional` **cost?**: `number`

Defined in: [types/analytics.ts:41](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/analytics.ts#L41)

---

### context?

> `optional` **context?**: [`JsonValue`](JsonValue.md)

Defined in: [types/analytics.ts:42](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/analytics.ts#L42)

---

### stepsUsed?

> `optional` **stepsUsed?**: `number`

Defined in: [types/analytics.ts:46](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/analytics.ts#L46)

Number of agentic steps (model calls) the turn used.

---

### toolCallCount?

> `optional` **toolCallCount?**: `number`

Defined in: [types/analytics.ts:48](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/analytics.ts#L48)

Number of external tool calls the turn made (final_result excluded).

---

### stopReason?

> `optional` **stopReason?**: `string`

Defined in: [types/analytics.ts:50](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/analytics.ts#L50)

Why the turn ended — see GenerateStopReason.

---

### elapsedMs?

> `optional` **elapsedMs?**: `number`

Defined in: [types/analytics.ts:52](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/analytics.ts#L52)

Wall-clock duration of the turn in milliseconds.

---

### rawFinishReason?

> `optional` **rawFinishReason?**: `string`

Defined in: [types/analytics.ts:54](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/analytics.ts#L54)

Verbatim provider finish/stop reason for the terminal model call.

---

### limits?

> `optional` **limits?**: [`ClaudeLimitSnapshot`](ClaudeLimitSnapshot.md)

Defined in: [types/analytics.ts:61](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/analytics.ts#L61)

Account limit state observed on this request — subscription window
headroom, reset times, and (via the NeuroLink Claude proxy) which account
served it and how much the pool has left. Present for Anthropic traffic
whose response carried rate-limit headers.
