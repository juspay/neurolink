[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ScorerRule

# Type Alias: ScorerRule

> **ScorerRule** = `object`

Defined in: [types/scorer.ts:191](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/scorer.ts#L191)

Individual rule for rule-based scorers

## Properties

### id

> **id**: `string`

Defined in: [types/scorer.ts:193](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/scorer.ts#L193)

Rule identifier

---

### description

> **description**: `string`

Defined in: [types/scorer.ts:195](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/scorer.ts#L195)

Rule description

---

### type

> **type**: `"regex"` \| `"keyword"` \| `"length"` \| `"custom"`

Defined in: [types/scorer.ts:197](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/scorer.ts#L197)

Rule type

---

### params

> **params**: [`JsonObject`](JsonObject.md)

Defined in: [types/scorer.ts:199](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/scorer.ts#L199)

Rule parameters

---

### weight?

> `optional` **weight?**: `number`

Defined in: [types/scorer.ts:201](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/scorer.ts#L201)

Weight for this rule
