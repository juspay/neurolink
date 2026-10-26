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

### clientSuppliedBetaForwarded?

> `optional` **clientSuppliedBetaForwarded?**: `boolean`

The upstream `anthropic-beta` carries a value the client asked for that
the proxy would not have sent itself. A rejection of it is then the
client's doing, and must not re-rank the pool for everyone.

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
