[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / STTOnnxRuntime

# Type Alias: STTOnnxRuntime

> **STTOnnxRuntime** = `object`

## Properties

### InferenceSession

> **InferenceSession**: `object`

#### create()

> **create**(`path`, `options?`): `Promise`\<[`STTOnnxSession`](STTOnnxSession.md)\>

##### Parameters

###### path

`string`

###### options?

`Record`\<`string`, `unknown`\>

##### Returns

`Promise`\<[`STTOnnxSession`](STTOnnxSession.md)\>

---

### Tensor

> **Tensor**: (`type`, `data`, `dims`) => [`STTOnnxTensor`](STTOnnxTensor.md)

#### Parameters

##### type

`"float32"` \| `"int64"`

##### data

`Float32Array` \| `BigInt64Array`

##### dims

readonly `number`[]

#### Returns

[`STTOnnxTensor`](STTOnnxTensor.md)
