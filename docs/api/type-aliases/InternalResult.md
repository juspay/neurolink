[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / InternalResult

# Type Alias: InternalResult

> **InternalResult** = `object`

Defined in: [types/proxy.ts:243](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L243)

Minimal subset of NeuroLink's GenerateResult that the proxy layer consumes.
Kept intentionally narrow so the proxy layer does not depend on every
field of the full type.

## Properties

### content

> **content**: `string`

Defined in: [types/proxy.ts:244](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L244)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/proxy.ts:245](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L245)

---

### finishReason?

> `optional` **finishReason?**: `string`

Defined in: [types/proxy.ts:246](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L246)

---

### reasoning?

> `optional` **reasoning?**: `string`

Defined in: [types/proxy.ts:248](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L248)

Thinking/reasoning text from provider (Anthropic thinking blocks, Gemini thought parts)

---

### usage?

> `optional` **usage?**: `object`

Defined in: [types/proxy.ts:249](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L249)

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

---

### toolCalls?

> `optional` **toolCalls?**: `object`[]

Defined in: [types/proxy.ts:256](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L256)

#### toolCallId

> **toolCallId**: `string`

#### toolName

> **toolName**: `string`

#### args

> **args**: `Record`\<`string`, `unknown`\>
