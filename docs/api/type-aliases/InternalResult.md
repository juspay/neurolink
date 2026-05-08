[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / InternalResult

# Type Alias: InternalResult

> **InternalResult** = `object`

Defined in: [types/proxy.ts:231](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/proxy.ts#L231)

Minimal subset of NeuroLink's GenerateResult that the proxy layer consumes.
Kept intentionally narrow so the proxy layer does not depend on every
field of the full type.

## Properties

### content

> **content**: `string`

Defined in: [types/proxy.ts:232](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/proxy.ts#L232)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/proxy.ts:233](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/proxy.ts#L233)

---

### finishReason?

> `optional` **finishReason?**: `string`

Defined in: [types/proxy.ts:234](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/proxy.ts#L234)

---

### reasoning?

> `optional` **reasoning?**: `string`

Defined in: [types/proxy.ts:236](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/proxy.ts#L236)

Thinking/reasoning text from provider (Anthropic thinking blocks, Gemini thought parts)

---

### usage?

> `optional` **usage?**: `object`

Defined in: [types/proxy.ts:237](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/proxy.ts#L237)

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

Defined in: [types/proxy.ts:244](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/proxy.ts#L244)

#### toolCallId

> **toolCallId**: `string`

#### toolName

> **toolName**: `string`

#### args

> **args**: `Record`\<`string`, `unknown`\>
