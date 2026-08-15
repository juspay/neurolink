[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / SpeechGrammarList

# Type Alias: SpeechGrammarList

> **SpeechGrammarList** = `object`

Defined in: [types/client.ts:1211](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/client.ts#L1211)

Speech grammar list interface

## Indexable

> \[`index`: `number`\]: [`SpeechGrammar`](SpeechGrammar.md)

## Properties

### length

> `readonly` **length**: `number`

Defined in: [types/client.ts:1212](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/client.ts#L1212)

## Methods

### addFromString()

> **addFromString**(`string`, `weight?`): `void`

Defined in: [types/client.ts:1213](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/client.ts#L1213)

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

Defined in: [types/client.ts:1214](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/client.ts#L1214)

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

Defined in: [types/client.ts:1215](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/client.ts#L1215)

#### Parameters

##### index

`number`

#### Returns

[`SpeechGrammar`](SpeechGrammar.md)
