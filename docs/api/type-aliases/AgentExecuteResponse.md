[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AgentExecuteResponse

# Type Alias: AgentExecuteResponse

> **AgentExecuteResponse** = `object`

Agent execution response

## Properties

### content

> **content**: `string`

Generated content

---

### provider

> **provider**: `string`

Provider used

---

### model

> **model**: `string`

Model used

---

### usage?

> `optional` **usage?**: `object`

Token usage

#### input

> **input**: `number`

Input tokens (also known as prompt tokens)

#### output

> **output**: `number`

Output tokens (also known as completion tokens)

#### total

> **total**: `number`

Total tokens used

#### cacheCreationTokens?

> `optional` **cacheCreationTokens?**: `number`

Cache creation tokens (if applicable)

#### cacheReadTokens?

> `optional` **cacheReadTokens?**: `number`

Cache read tokens (if applicable)

#### reasoning?

> `optional` **reasoning?**: `number`

Reasoning tokens (if applicable)

#### cacheSavingsPercent?

> `optional` **cacheSavingsPercent?**: `number`

Cache savings percentage

---

### toolCalls?

> `optional` **toolCalls?**: `object`[]

Tool calls made

#### name

> **name**: `string`

#### arguments

> **arguments**: `Record`\<`string`, `unknown`\>

#### result?

> `optional` **result?**: `unknown`

---

### finishReason?

> `optional` **finishReason?**: `string`

Finish reason

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, [`JsonValue`](JsonValue.md)\>

Response metadata
