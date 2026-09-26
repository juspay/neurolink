[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProcessorRegistration

# Type Alias: ProcessorRegistration\<T\>

> **ProcessorRegistration**\<`T`\> = `object`

Registration entry for a file processor.

## Type Parameters

### T

`T` _extends_ [`ProcessedFileBase`](ProcessedFileBase.md) = [`ProcessedFileBase`](ProcessedFileBase.md)

## Properties

### name

> **name**: `string`

---

### priority

> **priority**: `number`

---

### processor

> **processor**: `BaseFileProcessor`

---

### isSupported

> **isSupported**: (`mimetype`, `filename`) => `boolean`

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

---

### aliases?

> `optional` **aliases?**: `string`[]
