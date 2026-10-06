[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / WhistleNeedleModule

# Type Alias: WhistleNeedleModule

> **WhistleNeedleModule** = `object`

The subset of the Emscripten "needle" module the Whistle worker calls.

## Properties

### HEAPU8

> **HEAPU8**: `Uint8Array`

## Methods

### \_malloc()

> **\_malloc**(`size`): `number`

#### Parameters

##### size

`number`

#### Returns

`number`

---

### \_free()

> **\_free**(`ptr`): `void`

#### Parameters

##### ptr

`number`

#### Returns

`void`

---

### \_needle_load()

> **\_needle_load**(`ptr`, `length`): `number`

#### Parameters

##### ptr

`number`

##### length

`bigint`

#### Returns

`number`

---

### \_needle_last_error()

> **\_needle_last_error**(): `number`

#### Returns

`number`

---

### \_needle_transcribe()

> **\_needle_transcribe**(`pcm`, `samples`, `language`, `keywords`, `timestamps`, `out`, `outCapacity`): `number`

#### Parameters

##### pcm

`number`

##### samples

`number`

##### language

`number`

##### keywords

`number`

##### timestamps

`number`

##### out

`number`

##### outCapacity

`number`

#### Returns

`number`

---

### \_needle_stream_transcribe_process()

> **\_needle_stream_transcribe_process**(`pcm`, `samples`, `language`, `keywords`, `out`, `outCapacity`): `number`

#### Parameters

##### pcm

`number`

##### samples

`number`

##### language

`number`

##### keywords

`number`

##### out

`number`

##### outCapacity

`number`

#### Returns

`number`

---

### \_needle_stream_transcribe_stop()

> **\_needle_stream_transcribe_stop**(`out`, `outCapacity`): `number`

#### Parameters

##### out

`number`

##### outCapacity

`number`

#### Returns

`number`

---

### UTF8ToString()

> **UTF8ToString**(`ptr`): `string`

#### Parameters

##### ptr

`number`

#### Returns

`string`
