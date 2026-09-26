[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnalyticsData

# Type Alias: AnalyticsData

> **AnalyticsData** = `object`

Analytics data structure (consolidated from core analytics)

## Properties

### provider

> **provider**: `string`

---

### model?

> `optional` **model?**: `string`

---

### tokenUsage

> **tokenUsage**: [`TokenUsage`](TokenUsage.md)

---

### requestDuration

> **requestDuration**: `number`

---

### timestamp

> **timestamp**: `string`

---

### cost?

> `optional` **cost?**: `number`

---

### context?

> `optional` **context?**: [`JsonValue`](JsonValue.md)

---

### stepsUsed?

> `optional` **stepsUsed?**: `number`

Number of agentic steps (model calls) the turn used.

---

### toolCallCount?

> `optional` **toolCallCount?**: `number`

Number of external tool calls the turn made (final_result excluded).

---

### stopReason?

> `optional` **stopReason?**: `string`

Why the turn ended — see GenerateStopReason.

---

### elapsedMs?

> `optional` **elapsedMs?**: `number`

Wall-clock duration of the turn in milliseconds.

---

### rawFinishReason?

> `optional` **rawFinishReason?**: `string`

Verbatim provider finish/stop reason for the terminal model call.

---

### limits?

> `optional` **limits?**: [`ClaudeLimitSnapshot`](ClaudeLimitSnapshot.md)

Account limit state observed on this request — subscription window
headroom, reset times, and (via the NeuroLink Claude proxy) which account
served it and how much the pool has left. Present for Anthropic traffic
whose response carried rate-limit headers.
