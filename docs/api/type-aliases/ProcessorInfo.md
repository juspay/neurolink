[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProcessorInfo

# Type Alias: ProcessorInfo

> **ProcessorInfo** = `object`

Defined in: [types/processor.ts:467](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/processor.ts#L467)

Information about a registered processor.
Used for discovery and documentation.

## Properties

### name

> **name**: `string`

Defined in: [types/processor.ts:469](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/processor.ts#L469)

Unique name for the processor

---

### description

> **description**: `string`

Defined in: [types/processor.ts:471](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/processor.ts#L471)

Human-readable description

---

### supportedMimeTypes

> **supportedMimeTypes**: `string`[]

Defined in: [types/processor.ts:473](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/processor.ts#L473)

List of supported MIME types

---

### supportedExtensions

> **supportedExtensions**: `string`[]

Defined in: [types/processor.ts:475](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/processor.ts#L475)

List of supported file extensions

---

### priority?

> `optional` **priority?**: `number`

Defined in: [types/processor.ts:477](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/processor.ts#L477)

Priority level (lower = higher priority)
