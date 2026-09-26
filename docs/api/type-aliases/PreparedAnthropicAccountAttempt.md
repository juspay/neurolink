[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / PreparedAnthropicAccountAttempt

# Type Alias: PreparedAnthropicAccountAttempt

> **PreparedAnthropicAccountAttempt** = `object`

## Properties

### continueLoop

> **continueLoop**: `boolean`

---

### lastError

> **lastError**: `unknown`

---

### authFailureMessage

> **authFailureMessage**: `string` \| `null`

---

### headers?

> `optional` **headers?**: `Record`\<`string`, `string`\>

---

### buildUpstreamBody?

> `optional` **buildUpstreamBody?**: [`AnthropicUpstreamBodyBuilder`](AnthropicUpstreamBodyBuilder.md)

---

### finalBodyStr?

> `optional` **finalBodyStr?**: `string`

---

### preparedContext?

> `optional` **preparedContext?**: [`ProxyPreparedContext`](ProxyPreparedContext.md)\<[`ClaudeRequest`](ClaudeRequest.md)\>

---

### fetchStartMs?

> `optional` **fetchStartMs?**: `number`

---

### upstreamSpan?

> `optional` **upstreamSpan?**: `Span`
