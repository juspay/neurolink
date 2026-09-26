[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SpeechGrammarList

# Type Alias: SpeechGrammarList

> **SpeechGrammarList** = `object`

Speech grammar list interface

## Indexable

> \[`index`: `number`\]: [`SpeechGrammar`](SpeechGrammar.md)

## Properties

### length

> `readonly` **length**: `number`

## Methods

### addFromString()

> **addFromString**(`string`, `weight?`): `void`

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

#### Parameters

##### index

`number`

#### Returns

[`SpeechGrammar`](SpeechGrammar.md)
