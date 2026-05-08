[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / SpeechRecognitionInternal

# Type Alias: SpeechRecognitionInternal

> **SpeechRecognitionInternal** = `EventTarget` & `object`

Defined in: [types/client.ts:1165](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L1165)

Internal speech recognition interface for browser Web Speech API

## Type Declaration

### continuous

> **continuous**: `boolean`

### grammars

> **grammars**: [`SpeechGrammarList`](SpeechGrammarList.md)

### interimResults

> **interimResults**: `boolean`

### lang

> **lang**: `string`

### maxAlternatives

> **maxAlternatives**: `number`

### onaudioend

> **onaudioend**: ((`this`, `ev`) => `unknown`) \| `null`

### onaudiostart

> **onaudiostart**: ((`this`, `ev`) => `unknown`) \| `null`

### onend

> **onend**: ((`this`, `ev`) => `unknown`) \| `null`

### onerror

> **onerror**: ((`this`, `ev`) => `unknown`) \| `null`

### onnomatch

> **onnomatch**: ((`this`, `ev`) => `unknown`) \| `null`

### onresult

> **onresult**: ((`this`, `ev`) => `unknown`) \| `null`

### onsoundend

> **onsoundend**: ((`this`, `ev`) => `unknown`) \| `null`

### onsoundstart

> **onsoundstart**: ((`this`, `ev`) => `unknown`) \| `null`

### onspeechend

> **onspeechend**: ((`this`, `ev`) => `unknown`) \| `null`

### onspeechstart

> **onspeechstart**: ((`this`, `ev`) => `unknown`) \| `null`

### onstart

> **onstart**: ((`this`, `ev`) => `unknown`) \| `null`

### abort()

> **abort**(): `void`

#### Returns

`void`

### start()

> **start**(): `void`

#### Returns

`void`

### stop()

> **stop**(): `void`

#### Returns

`void`
