[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / FileFormatEntry

# Type Alias: FileFormatEntry

> **FileFormatEntry** = `object`

Defined in: [types/file.ts:134](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L134)

One format in the canonical file-type registry.

`extensions[0]` and `mimeTypes[0]` are canonical; the remaining entries are
aliases accepted on input. See `processors/config/fileTypeRegistry.ts`.

## Properties

### label

> `readonly` **label**: `string`

Defined in: [types/file.ts:136](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L136)

Human-readable format name, used in registry-conflict errors.

---

### extensions

> `readonly` **extensions**: readonly `string`[]

Defined in: [types/file.ts:138](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L138)

Extensions with leading dots, lowercase; first is canonical.

---

### mimeTypes

> `readonly` **mimeTypes**: readonly `string`[]

Defined in: [types/file.ts:140](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L140)

MIME types, lowercase; first is canonical.

---

### fileType

> `readonly` **fileType**: [`FileType`](FileType.md)

Defined in: [types/file.ts:142](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L142)

Routing type the detector emits for this format.

---

### modality

> `readonly` **modality**: [`FileModality`](FileModality.md)

Defined in: [types/file.ts:144](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L144)

Category a human would put this format in.
