[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ScorerEvent

# Type Alias: ScorerEvent

> **ScorerEvent** = `object`

Defined in: [types/scorer.ts:221](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/scorer.ts#L221)

Scorer execution events for observability

## Properties

### type

> **type**: `"scorer:start"` \| `"scorer:end"` \| `"scorer:error"`

Defined in: [types/scorer.ts:223](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/scorer.ts#L223)

Event type

---

### scorerId

> **scorerId**: `string`

Defined in: [types/scorer.ts:225](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/scorer.ts#L225)

Scorer identifier

---

### timestamp

> **timestamp**: `number`

Defined in: [types/scorer.ts:227](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/scorer.ts#L227)

Event timestamp

---

### duration?

> `optional` **duration?**: `number`

Defined in: [types/scorer.ts:229](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/scorer.ts#L229)

Duration (for end events)

---

### score?

> `optional` **score?**: `number`

Defined in: [types/scorer.ts:231](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/scorer.ts#L231)

Score result (for end events)

---

### error?

> `optional` **error?**: `string`

Defined in: [types/scorer.ts:233](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/scorer.ts#L233)

Error message (for error events)

---

### metadata?

> `optional` **metadata?**: [`JsonObject`](JsonObject.md)

Defined in: [types/scorer.ts:235](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/scorer.ts#L235)

Additional metadata
