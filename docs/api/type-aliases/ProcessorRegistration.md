[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProcessorRegistration

# Type Alias: ProcessorRegistration\<T\>

> **ProcessorRegistration**\<`T`\> = `object`

Defined in: [types/processor.ts:789](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/processor.ts#L789)

Registration entry for a file processor.

## Type Parameters

### T

`T` _extends_ [`ProcessedFileBase`](ProcessedFileBase.md) = [`ProcessedFileBase`](ProcessedFileBase.md)

## Properties

### name

> **name**: `string`

Defined in: [types/processor.ts:792](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/processor.ts#L792)

---

### priority

> **priority**: `number`

Defined in: [types/processor.ts:793](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/processor.ts#L793)

---

### processor

> **processor**: `BaseFileProcessor`

Defined in: [types/processor.ts:794](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/processor.ts#L794)

---

### isSupported

> **isSupported**: (`mimetype`, `filename`) => `boolean`

Defined in: [types/processor.ts:795](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/processor.ts#L795)

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

Defined in: [types/processor.ts:796](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/processor.ts#L796)

---

### aliases?

> `optional` **aliases?**: `string`[]

Defined in: [types/processor.ts:797](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/processor.ts#L797)
