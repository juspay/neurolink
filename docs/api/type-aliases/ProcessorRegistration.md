[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProcessorRegistration

# Type Alias: ProcessorRegistration\<T\>

> **ProcessorRegistration**\<`T`\> = `object`

Defined in: [types/processor.ts:800](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L800)

Registration entry for a file processor.

## Type Parameters

### T

`T` _extends_ [`ProcessedFileBase`](ProcessedFileBase.md) = [`ProcessedFileBase`](ProcessedFileBase.md)

## Properties

### name

> **name**: `string`

Defined in: [types/processor.ts:803](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L803)

---

### priority

> **priority**: `number`

Defined in: [types/processor.ts:804](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L804)

---

### processor

> **processor**: `BaseFileProcessor`

Defined in: [types/processor.ts:805](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L805)

---

### isSupported

> **isSupported**: (`mimetype`, `filename`) => `boolean`

Defined in: [types/processor.ts:806](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L806)

#### Parameters

##### mimetype

`string`

##### filename

`string`

#### Returns

`boolean`

---

### description?

> `optional` **description?**: `string`

Defined in: [types/processor.ts:807](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L807)

---

### aliases?

> `optional` **aliases?**: `string`[]

Defined in: [types/processor.ts:808](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L808)
