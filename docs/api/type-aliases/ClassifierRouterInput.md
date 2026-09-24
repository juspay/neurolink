[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClassifierRouterInput

# Type Alias: ClassifierRouterInput

> **ClassifierRouterInput** = `object`

Defined in: [types/classifierRouter.ts:320](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L320)

Lightweight request snapshot handed to the router.

## Properties

### prompt

> **prompt**: `string`

Defined in: [types/classifierRouter.ts:321](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L321)

---

### estimatedInputTokens?

> `optional` **estimatedInputTokens?**: `number`

Defined in: [types/classifierRouter.ts:322](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L322)

---

### hasTools?

> `optional` **hasTools?**: `boolean`

Defined in: [types/classifierRouter.ts:323](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L323)

---

### requiresVision?

> `optional` **requiresVision?**: `boolean`

Defined in: [types/classifierRouter.ts:324](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L324)

---

### thinkingLevel?

> `optional` **thinkingLevel?**: `string`

Defined in: [types/classifierRouter.ts:325](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L325)

---

### sessionId?

> `optional` **sessionId?**: `string`

Defined in: [types/classifierRouter.ts:326](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L326)

---

### sessionBound?

> `optional` **sessionBound?**: `boolean`

Defined in: [types/classifierRouter.ts:328](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L328)

Whether this request is tied to a session, independent of the (withheld) session id itself.

---

### priorMessageCount?

> `optional` **priorMessageCount?**: `number`

Defined in: [types/classifierRouter.ts:330](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L330)

Number of prior conversation messages the caller supplied, when known.
