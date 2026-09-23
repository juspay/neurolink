[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / InternalResult

# Type Alias: InternalResult

> **InternalResult** = `object`

Defined in: [types/proxy.ts:260](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L260)

Minimal subset of NeuroLink's GenerateResult that the proxy layer consumes.
Kept intentionally narrow so the proxy layer does not depend on every
field of the full type.

## Properties

### content

> **content**: `string`

Defined in: [types/proxy.ts:261](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L261)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/proxy.ts:262](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L262)

---

### finishReason?

> `optional` **finishReason?**: `string`

Defined in: [types/proxy.ts:263](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L263)

---

### reasoning?

> `optional` **reasoning?**: `string`

Defined in: [types/proxy.ts:265](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L265)

Thinking/reasoning text from provider (Anthropic thinking blocks, Gemini thought parts)

---

### usage?

> `optional` **usage?**: `object`

Defined in: [types/proxy.ts:266](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L266)

#### input

> **input**: `number`

#### output

> **output**: `number`

#### total

> **total**: `number`

#### cacheCreationTokens?

> `optional` **cacheCreationTokens?**: `number`

#### cacheReadTokens?

> `optional` **cacheReadTokens?**: `number`

#### reasoning?

> `optional` **reasoning?**: `number`

---

### toolCalls?

> `optional` **toolCalls?**: `object`[]

Defined in: [types/proxy.ts:274](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L274)

#### toolCallId

> **toolCallId**: `string`

#### toolName

> **toolName**: `string`

#### args

> **args**: `Record`\<`string`, `unknown`\>
