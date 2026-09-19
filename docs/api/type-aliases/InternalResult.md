[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / InternalResult

# Type Alias: InternalResult

> **InternalResult** = `object`

Defined in: [types/proxy.ts:254](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L254)

Minimal subset of NeuroLink's GenerateResult that the proxy layer consumes.
Kept intentionally narrow so the proxy layer does not depend on every
field of the full type.

## Properties

### content

> **content**: `string`

Defined in: [types/proxy.ts:255](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L255)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/proxy.ts:256](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L256)

---

### finishReason?

> `optional` **finishReason?**: `string`

Defined in: [types/proxy.ts:257](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L257)

---

### reasoning?

> `optional` **reasoning?**: `string`

Defined in: [types/proxy.ts:259](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L259)

Thinking/reasoning text from provider (Anthropic thinking blocks, Gemini thought parts)

---

### usage?

> `optional` **usage?**: `object`

Defined in: [types/proxy.ts:260](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L260)

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

Defined in: [types/proxy.ts:268](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L268)

#### toolCallId

> **toolCallId**: `string`

#### toolName

> **toolName**: `string`

#### args

> **args**: `Record`\<`string`, `unknown`\>
