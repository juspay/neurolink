[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / FileFormatEntry

# Type Alias: FileFormatEntry

> **FileFormatEntry** = `object`

Defined in: [types/file.ts:186](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L186)

One format in the canonical file-type registry.

`extensions[0]` and `mimeTypes[0]` are canonical; the remaining entries are
aliases accepted on input. See `processors/config/fileTypeRegistry.ts`.

## Properties

### label

> `readonly` **label**: `string`

Defined in: [types/file.ts:188](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L188)

Human-readable format name, used in registry-conflict errors.

---

### extensions

> `readonly` **extensions**: readonly `string`[]

Defined in: [types/file.ts:190](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L190)

Extensions with leading dots, lowercase; first is canonical.

---

### mimeTypes

> `readonly` **mimeTypes**: readonly `string`[]

Defined in: [types/file.ts:192](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L192)

MIME types, lowercase; first is canonical.

---

### fileType

> `readonly` **fileType**: [`FileType`](FileType.md)

Defined in: [types/file.ts:194](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L194)

Routing type the detector emits for this format.

---

### modality

> `readonly` **modality**: [`FileModality`](FileModality.md)

Defined in: [types/file.ts:196](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L196)

Category a human would put this format in.
