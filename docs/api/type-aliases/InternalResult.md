[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / InternalResult

# Type Alias: InternalResult

> **InternalResult** = `object`

Defined in: [types/proxy.ts:280](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L280)

Minimal subset of NeuroLink's GenerateResult that the proxy layer consumes.
Kept intentionally narrow so the proxy layer does not depend on every
field of the full type.

## Properties

### content

> **content**: `string`

Defined in: [types/proxy.ts:281](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L281)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/proxy.ts:282](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L282)

---

### finishReason?

> `optional` **finishReason?**: `string`

Defined in: [types/proxy.ts:283](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L283)

---

### reasoning?

> `optional` **reasoning?**: `string`

Defined in: [types/proxy.ts:285](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L285)

Thinking/reasoning text from provider (Anthropic thinking blocks, Gemini thought parts)

---

### usage?

> `optional` **usage?**: `object`

Defined in: [types/proxy.ts:286](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L286)

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

Defined in: [types/proxy.ts:294](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L294)

#### toolCallId

> **toolCallId**: `string`

#### toolName

> **toolName**: `string`

#### args

> **args**: `Record`\<`string`, `unknown`\>
