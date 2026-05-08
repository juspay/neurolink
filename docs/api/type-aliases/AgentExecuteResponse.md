[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / AgentExecuteResponse

# Type Alias: AgentExecuteResponse

> **AgentExecuteResponse** = `object`

Defined in: [types/server.ts:586](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L586)

Agent execution response

## Properties

### content

> **content**: `string`

Defined in: [types/server.ts:588](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L588)

Generated content

---

### provider

> **provider**: `string`

Defined in: [types/server.ts:591](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L591)

Provider used

---

### model

> **model**: `string`

Defined in: [types/server.ts:594](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L594)

Model used

---

### usage?

> `optional` **usage?**: `object`

Defined in: [types/server.ts:597](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L597)

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

Defined in: [types/server.ts:615](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L615)

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

Defined in: [types/server.ts:622](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L622)

Finish reason

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, [`JsonValue`](JsonValue.md)\>

Defined in: [types/server.ts:625](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L625)

Response metadata
