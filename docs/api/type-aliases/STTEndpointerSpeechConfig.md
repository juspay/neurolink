[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / STTEndpointerSpeechConfig

# Type Alias: STTEndpointerSpeechConfig

> **STTEndpointerSpeechConfig** = `object`

A speech detector's verdicts as the endpointer reads them: the thresholds
and a lookup of the probability at a point on the stream clock. Attached,
it replaces the RMS rules; the energy gate stays as the fallback.

## Properties

### onset

> **onset**: `number`

---

### sustain

> **sustain**: `number`

---

### startMs

> **startMs**: `number`

## Methods

### probabilityAt()

> **probabilityAt**(`seconds`): `number` \| `undefined`

Speech probability of the frame covering `seconds`; `undefined` before the first scored frame.

#### Parameters

##### seconds

`number`

#### Returns

`number` \| `undefined`
