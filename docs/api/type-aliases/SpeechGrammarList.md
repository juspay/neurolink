[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / SpeechGrammarList

# Type Alias: SpeechGrammarList

> **SpeechGrammarList** = `object`

Defined in: [types/client.ts:1211](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L1211)

Speech grammar list interface

## Indexable

> \[`index`: `number`\]: [`SpeechGrammar`](SpeechGrammar.md)

## Properties

### length

> `readonly` **length**: `number`

Defined in: [types/client.ts:1212](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L1212)

## Methods

### addFromString()

> **addFromString**(`string`, `weight?`): `void`

Defined in: [types/client.ts:1213](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L1213)

#### Parameters

##### string

`string`

##### weight?

`number`

#### Returns

`void`

---

### addFromURI()

> **addFromURI**(`src`, `weight?`): `void`

Defined in: [types/client.ts:1214](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L1214)

#### Parameters

##### src

`string`

##### weight?

`number`

#### Returns

`void`

---

### item()

> **item**(`index`): [`SpeechGrammar`](SpeechGrammar.md)

Defined in: [types/client.ts:1215](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L1215)

#### Parameters

##### index

`number`

#### Returns

[`SpeechGrammar`](SpeechGrammar.md)
