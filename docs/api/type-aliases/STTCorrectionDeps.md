[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / STTCorrectionDeps

# Type Alias: STTCorrectionDeps

> **STTCorrectionDeps** = `object`

What the correction layer needs from the SDK, injected by `NeuroLink` so the
layer itself stays free of provider plumbing and can be exercised with
stand-ins. `decide` is `tryDecide` (returns `null` on any failure);
`rewrite` streams the text so far (cumulative, not deltas) through `onPartial`
when the caller wants it.

## Properties

### decide

> **decide**: (`opts`) => `Promise`\<\{ `answers`: `Record`\<`string`, `unknown`\>; \} \| `null`\>

#### Parameters

##### opts

###### state

`Record`\<`string`, `unknown`\>

###### questions

`Record`\<`string`, `unknown`\>

###### timeoutMs?

`number`

#### Returns

`Promise`\<\{ `answers`: `Record`\<`string`, `unknown`\>; \} \| `null`\>

---

### rewrite

> **rewrite**: (`opts`) => `Promise`\<`string`\>

#### Parameters

##### opts

###### system

`string`

###### user

`string`

###### provider?

`string`

###### model?

`string`

###### maxTokens

`number`

###### timeoutMs

`number`

###### onPartial?

(`text`) => `void`

#### Returns

`Promise`\<`string`\>
