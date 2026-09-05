[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / InternalResult

# Type Alias: InternalResult

> **InternalResult** = `object`

Defined in: [types/proxy.ts:249](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L249)

Minimal subset of NeuroLink's GenerateResult that the proxy layer consumes.
Kept intentionally narrow so the proxy layer does not depend on every
field of the full type.

## Properties

### content

> **content**: `string`

Defined in: [types/proxy.ts:250](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L250)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/proxy.ts:251](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L251)

---

### finishReason?

> `optional` **finishReason?**: `string`

Defined in: [types/proxy.ts:252](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L252)

---

### reasoning?

> `optional` **reasoning?**: `string`

Defined in: [types/proxy.ts:254](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L254)

Thinking/reasoning text from provider (Anthropic thinking blocks, Gemini thought parts)

---

### usage?

> `optional` **usage?**: `object`

Defined in: [types/proxy.ts:255](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L255)

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

Defined in: [types/proxy.ts:262](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L262)

#### toolCallId

> **toolCallId**: `string`

#### toolName

> **toolName**: `string`

#### args

> **args**: `Record`\<`string`, `unknown`\>
