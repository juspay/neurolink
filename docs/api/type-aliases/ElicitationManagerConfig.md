[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ElicitationManagerConfig

# Type Alias: ElicitationManagerConfig

> **ElicitationManagerConfig** = `object`

Defined in: [types/elicitation.ts:266](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/elicitation.ts#L266)

Elicitation manager configuration

## Properties

### defaultTimeout?

> `optional` **defaultTimeout?**: `number`

Defined in: [types/elicitation.ts:270](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/elicitation.ts#L270)

Default timeout for elicitation requests

---

### enabled?

> `optional` **enabled?**: `boolean`

Defined in: [types/elicitation.ts:275](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/elicitation.ts#L275)

Whether to allow elicitation (can be disabled for automated environments)

---

### handler?

> `optional` **handler?**: [`ElicitationHandler`](ElicitationHandler.md)

Defined in: [types/elicitation.ts:280](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/elicitation.ts#L280)

Handler for processing elicitation requests

---

### fallbackBehavior?

> `optional` **fallbackBehavior?**: `"timeout"` \| `"default"` \| `"error"`

Defined in: [types/elicitation.ts:285](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/elicitation.ts#L285)

Fallback behavior when no handler is available
